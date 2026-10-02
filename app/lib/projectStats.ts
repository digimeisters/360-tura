import type { SupabaseClient } from '@supabase/supabase-js';
import { trackKey } from './projectI18n';

/**
 * Izveštaj po stanu za projekat novogradnje (poslednjih N dana):
 *   - posete strane projekta (site_events cta_click `pv:<slug>`)
 *   - otvaranja kartice svakog stana (`pu:<slug>:<oznaka>`)
 *   - upiti po stanu (project_inquiries)
 * Merenje šalje ProjectSelector (javna strana, engleska i ugradnja).
 * Admin i vlasnikov uređaj se ne broje (lib/track.ts).
 */

export type UnitStat = { code: string; views: number; inquiries: number };

export type ProjectStats = {
  days: number;
  pageViews: number;
  visitors: number;
  unitViews: number;
  inquiries: number;
  units: UnitStat[];
};

const MAX_EVENTS = 20_000;

export async function loadProjectStats(
  db: SupabaseClient,
  projectId: string,
  slug: string,
  unitCodes: string[],
  days = 30
): Promise<ProjectStats> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const pv = trackKey('pv', slug);
  const puPrefix = `${trackKey('pu', slug)}:`;

  const [{ data: events }, { data: inquiries }] = await Promise.all([
    db
      .from('site_events')
      .select('target, session_id')
      .eq('event_type', 'cta_click')
      .gte('created_at', since)
      .or(`target.eq.${pv},target.like.${puPrefix}%`)
      .limit(MAX_EVENTS),
    db.from('project_inquiries').select('unit_code').eq('project_id', projectId).gte('created_at', since)
  ]);

  const rows = (events ?? []) as { target: string; session_id: string }[];
  const pageRows = rows.filter((r) => r.target === pv);

  // Oznaka u merenju je očišćena (mala slova, bez razmaka) - uparuje se istim pravilom.
  const keyToCode = new Map(unitCodes.map((c) => [trackKey('pu', slug, c), c]));
  const views = new Map<string, number>();
  for (const r of rows) {
    if (!r.target.startsWith(puPrefix)) continue;
    const code = keyToCode.get(r.target);
    if (code) views.set(code, (views.get(code) ?? 0) + 1);
  }
  const asks = new Map<string, number>();
  for (const i of (inquiries ?? []) as { unit_code: string }[]) asks.set(i.unit_code, (asks.get(i.unit_code) ?? 0) + 1);

  const units = unitCodes
    .map((code) => ({ code, views: views.get(code) ?? 0, inquiries: asks.get(code) ?? 0 }))
    .filter((u) => u.views || u.inquiries)
    .sort((a, b) => b.views - a.views || b.inquiries - a.inquiries || a.code.localeCompare(b.code, 'sr', { numeric: true }));

  return {
    days,
    pageViews: pageRows.length,
    visitors: new Set(pageRows.map((r) => r.session_id)).size,
    unitViews: [...views.values()].reduce((a, b) => a + b, 0),
    inquiries: (inquiries ?? []).length,
    units
  };
}
