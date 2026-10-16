import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Cene novogradnje iz cenovnika NAŠIH projekata (vlasnik, 16. 10. 2026):
 * investitori unose cene stanova u admin, a te cene - zbirno, bez imena
 * projekta i pojedinačnih stanova - postaju cena novogradnje za naselje u
 * proceni vrednosti i na strani „Cene po naseljima“. Računa se uživo, pa
 * nov cenovnik odmah menja procenu (bez skripte i čekanja dva meseca).
 *
 * Pravila:
 *   - samo objavljen projekat, sa naseljem i uključenom kvačicom
 *     include_in_price_stats (migracija 033)
 *   - samo slobodni i rezervisani stanovi sa cenom i kvadraturom - to je
 *     današnja ponuda; prodati stanovi imaju staru cenu
 *   - JEDAN PROJEKAT = JEDAN GLAS (kao "ista ulica" u oglasima): projekat
 *     od 80 stanova inače bi sam odredio cenu naselja
 *   - naselje dobija raspon tek uz MIN_PROJECTS projekata; tada ima
 *     prednost nad oglasima (cenovnik je stvarna cena, oglas tražena)
 *   - raspon: medijana 25. percentila projekata do medijane 75. percentila
 *     (tipičan raspon unutar projekta - sprat, veličina, orijentacija)
 */

export const MIN_PROJECTS = 2;

export type ProjectAreaPrice = {
  neighborhood: string;
  low: number;
  high: number;
  /** Stanova sa cenom i projekata (glasova) iz kojih je raspon. */
  units: number;
  projects: number;
  updatedAt: string;
};

type ProjectRow = { id: string; neighborhood: string | null };
type UnitRow = { project_id: string; price: number | string | null; area_sqm: number | string | null; updated_at: string };

const quantile = (values: number[], p: number) => {
  const s = [...values].sort((a, b) => a - b);
  const i = (s.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
};
const round10 = (n: number) => Math.round(n / 10) * 10;

export async function getProjectAreaPrices(db: SupabaseClient, city: string): Promise<ProjectAreaPrice[]> {
  const { data: projects, error } = await db
    .from('projects')
    .select('id, neighborhood')
    .eq('published', true)
    .eq('include_in_price_stats', true)
    .not('neighborhood', 'is', null)
    .ilike('city', city);
  if (error) {
    console.error('[projectPrices] projects:', error.message);
    return [];
  }
  const list = (projects ?? []) as ProjectRow[];
  if (list.length < MIN_PROJECTS) return [];

  const { data: units, error: unitsError } = await db
    .from('project_units')
    .select('project_id, price, area_sqm, updated_at')
    .in('project_id', list.map((p) => p.id))
    .in('status', ['available', 'reserved'])
    .not('price', 'is', null)
    .gt('area_sqm', 0);
  if (unitsError) {
    console.error('[projectPrices] units:', unitsError.message);
    return [];
  }

  // Cena po m² svakog stana, po projektu.
  const byProject = new Map<string, { ppm: number[]; updatedAt: string }>();
  for (const u of (units ?? []) as UnitRow[]) {
    const price = Number(u.price);
    const area = Number(u.area_sqm);
    if (!(price > 0) || !(area > 0)) continue;
    const ppm = price / area;
    // Isto kao u oglasima: ovo je greška u unosu (npr. cena u dinarima).
    if (ppm < 250 || ppm > 6000) continue;
    const entry = byProject.get(u.project_id) ?? { ppm: [], updatedAt: '' };
    entry.ppm.push(ppm);
    if (u.updated_at > entry.updatedAt) entry.updatedAt = u.updated_at;
    byProject.set(u.project_id, entry);
  }

  const byHood = new Map<string, { lows: number[]; highs: number[]; units: number; updatedAt: string }>();
  for (const p of list) {
    const entry = byProject.get(p.id);
    if (!entry || !p.neighborhood) continue;
    const hood = byHood.get(p.neighborhood) ?? { lows: [], highs: [], units: 0, updatedAt: '' };
    hood.lows.push(quantile(entry.ppm, 0.25));
    hood.highs.push(quantile(entry.ppm, 0.75));
    hood.units += entry.ppm.length;
    if (entry.updatedAt > hood.updatedAt) hood.updatedAt = entry.updatedAt;
    byHood.set(p.neighborhood, hood);
  }

  const out: ProjectAreaPrice[] = [];
  for (const [neighborhood, h] of byHood) {
    if (h.lows.length < MIN_PROJECTS) continue;
    const low = round10(quantile(h.lows, 0.5));
    // Raspon bar 10% širi od donje granice, kao kod oglasa.
    const high = Math.max(round10(low * 1.1), round10(quantile(h.highs, 0.5)));
    out.push({ neighborhood, low, high, units: h.units, projects: h.lows.length, updatedAt: h.updatedAt });
  }
  return out;
}
