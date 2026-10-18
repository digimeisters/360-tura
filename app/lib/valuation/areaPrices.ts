import { createClient } from '@supabase/supabase-js';
import type { BuildType, ValuationListingType, ValuationPropertyType } from './types';
import { CITY_ROW } from './calculateEstimate';
import { getProjectAreaPrices } from './projectPrices';

export { CITY_ROW };

/**
 * Cene po naseljima za stranu /alati/cene-nekretnina-kragujevac - isti
 * redovi (zone_price_baselines) iz kojih računa i procena vrednosti.
 * Tabela je zatvorena za anon (migracija 029), pa se čita service role
 * ključem, samo na serveru. Strana se osvežava jednom dnevno (revalidate).
 */

export type AreaPrice = {
  neighborhood: string;
  type: ValuationPropertyType;
  kind: ValuationListingType;
  /** Novogradnja / starogradnja / zajedno (migracija 032). */
  build: BuildType;
  /** €/m² (izdavanje: €/m² mesečno). */
  low: number;
  high: number;
  /** Odakle je raspon: javni oglasi ili cenovnici naših projekata (novogradnja, projectPrices). */
  source: 'ads' | 'projects';
  /** Svi oglasi i nezavisni (ista ulica = jedan) - migracija 031; null za ručno unete redove.
   *  Za cenovnike: broj stanova i broj projekata. */
  listings: number | null;
  independent: number | null;
  updatedAt: string;
};

/** Ispod ovoliko nezavisnih oglasa raspon je okvirniji - strana ga tako i označava. */
export const FEW_LISTINGS = 10;

type Row = {
  neighborhood: string;
  property_type: ValuationPropertyType;
  listing_type: ValuationListingType | null;
  build_type?: BuildType | null;
  price_per_sqm_low: number | string;
  price_per_sqm_high: number | string;
  listing_count: number | null;
  independent_count: number | null;
  updated_at: string;
};

export async function getAreaPrices(city = 'Kragujevac'): Promise<AreaPrice[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('[areaPrices] nema SUPABASE_SERVICE_ROLE_KEY - strana cena je prazna');
    return [];
  }
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db
    .from('zone_price_baselines')
    .select('neighborhood, property_type, listing_type, build_type, price_per_sqm_low, price_per_sqm_high, listing_count, independent_count, updated_at')
    .ilike('city', city)
    .returns<Row[]>();
  // Bacanje (ne prazna lista): ISR zadržava poslednju dobru stranu cena.
  if (error) throw new Error(`[areaPrices] ${error.message}`);
  const fromAds: AreaPrice[] = (data ?? []).map((r) => ({
    source: 'ads' as const,
    neighborhood: r.neighborhood,
    type: r.property_type,
    kind: r.listing_type ?? 'sale',
    build: r.build_type ?? 'any',
    low: Number(r.price_per_sqm_low),
    high: Number(r.price_per_sqm_high),
    listings: r.listing_count,
    independent: r.independent_count,
    updatedAt: r.updated_at
  }));

  // Cenovnici naših projekata (bar 2 u naselju) zamenjuju oglase za novogradnju stanova.
  const fromProjects = await getProjectAreaPrices(db, city);
  if (!fromProjects.length) return fromAds;
  const own = new Set(fromProjects.map((p) => p.neighborhood));
  return [
    ...fromAds.filter((r) => !(r.type === 'apartment' && r.kind === 'sale' && r.build === 'new' && own.has(r.neighborhood))),
    ...fromProjects.map((p) => ({
      source: 'projects' as const,
      neighborhood: p.neighborhood,
      type: 'apartment' as const,
      kind: 'sale' as const,
      build: 'new' as const,
      low: p.low,
      high: p.high,
      listings: p.units,
      independent: p.projects,
      updatedAt: p.updatedAt
    }))
  ];
}

/** Prosek grada: raspon ponderisan brojem oglasa (redovi bez broja se računaju kao jedan). */
export function cityAverage(rows: AreaPrice[]): { low: number; high: number; listings: number } | null {
  if (!rows.length) return null;
  const w = (r: AreaPrice) => r.listings ?? 1;
  const total = rows.reduce((s, r) => s + w(r), 0);
  return {
    low: rows.reduce((s, r) => s + r.low * w(r), 0) / total,
    high: rows.reduce((s, r) => s + r.high * w(r), 0) / total,
    listings: rows.reduce((s, r) => s + (r.listings ?? 0), 0)
  };
}
