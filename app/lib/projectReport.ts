import { createHmac, timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { fetchAllRows } from './fetchAllRows';
import { monthRange, shiftMonth, type MonthKey } from './agencyReport';
import { floorLabel as floorName, trackKey } from './projectI18n';
import { countSources, type VisitSource } from './visitSources';
import type { UnitStatus } from './projects';

/**
 * Mesečni izveštaj za investitora (2026-11-01, maketa
 * public/mockup/IzvestajInvestitor.html): posete projekta, otvaranja
 * kartica stanova, upiti, "gledaju a ne pitaju", interesovanje po strukturi,
 * odakle dolaze i prodaja/promene cena iz prodajne table. Sve se već beleži
 * (site_events pv:/pu:, project_inquiries, project_unit_changes).
 *
 * Link je potpisan (HMAC od id projekta), bez prijave - kao izveštaj agencije.
 */

const TOKEN_SIG_LENGTH = 24;
const MAX_EVENTS = 50_000;
/** "Gledaju, a ne pitaju": stan sa bar ovoliko otvaranja i bez upita. */
const WATCH_MIN_VIEWS = 10;
/** Cena po m² ovoliko iznad proseka sličnih (ista struktura) je verovatan razlog. */
const PRICE_ABOVE_PCT = 5;

function signingKey(): string {
  const key = process.env.REPORT_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Nema ključa za potpis linka izveštaja.');
  return key;
}

function sign(projectId: string): string {
  return createHmac('sha256', signingKey()).update(`project-report:${projectId}`).digest('base64url').slice(0, TOKEN_SIG_LENGTH);
}

export function projectReportToken(projectId: string): string {
  return `${projectId}.${sign(projectId)}`;
}

export function projectIdFromToken(token: string): string | null {
  const [id, signature] = token.split('.');
  if (!id || !signature || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const expected = Buffer.from(sign(id));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}

export type ReportUnit = {
  code: string;
  structure: string | null;
  areaSqm: number | null;
  price: number | null;
  status: UnitStatus;
  floor: string | null;
  views: number;
  inquiries: number;
};

export type WatchUnit = ReportUnit & { reason: string | null };

export type SaleLine = {
  code: string;
  structure: string | null;
  floor: string | null;
  kind: 'status' | 'price';
  from: string | null;
  to: string | null;
  actor: string | null;
  at: string;
  price: number | null;
};

export type ProjectReport = {
  projectId: string;
  slug: string;
  title: string;
  developer: string | null;
  logoUrl: string | null;
  logoDark: boolean;
  month: MonthKey;
  totals: { units: number; available: number; visitors: number; unitViews: number; inquiries: number; sold: number; reserved: number };
  previous: { visitors: number; inquiries: number } | null;
  units: ReportUnit[];
  watch: WatchUnit[];
  structures: { structure: string; views: number; inquiries: number }[];
  sources: (VisitSource & { visitors: number })[];
  sales: SaleLine[];
  firstMonth: MonthKey;
};

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Nedostaju Supabase promenljive.');
  return createClient(url, key);
}

type EventRow = { target: string; session_id: string };

async function readEvents(db: ReturnType<typeof admin>, slug: string, key: MonthKey): Promise<EventRow[]> {
  const { from, to } = monthRange(key);
  const pv = trackKey('pv', slug);
  const pu = `${trackKey('pu', slug)}:`;
  const { data, error } = await fetchAllRows(
    (a, b) =>
      db
        .from('site_events')
        .select('target, session_id')
        .eq('event_type', 'cta_click')
        .gte('created_at', from)
        .lt('created_at', to)
        .or(`target.eq.${pv},target.like.${pu}%`)
        .order('created_at', { ascending: true })
        .range(a, b),
    MAX_EVENTS
  );
  if (error) throw new Error(`site_events: ${error.message}`);
  return data as EventRow[];
}

/**
 * Izvor se beleži samo uz page_view (prvi prikaz u dokumentu), pa se "Odakle
 * dolaze" čita iz prikaza strane projekta. Ugrađeni izbor stana
 * (/novogradnja/<slug>/ugradnja, iframe na sajtu investitora) je "Vaš sajt".
 */
async function readSources(db: ReturnType<typeof admin>, slug: string, key: MonthKey): Promise<(VisitSource & { visitors: number })[]> {
  const { from, to } = monthRange(key);
  const { data, error } = await fetchAllRows(
    (a, b) =>
      db
        .from('site_events')
        .select('target, session_id, source')
        .eq('event_type', 'page_view')
        .gte('created_at', from)
        .lt('created_at', to)
        .or(`target.like./novogradnja/${slug}%,target.like./en/novogradnja/${slug}%`)
        .order('created_at', { ascending: true })
        .range(a, b),
    MAX_EVENTS
  );
  if (error) throw new Error(`site_events: ${error.message}`);
  const rows = (data as { target: string; session_id: string; source: string | null }[]).filter((r) => {
    const rest = r.target.replace(/^(\/en)?\/novogradnja\//, '');
    return rest === slug || rest.startsWith(`${slug}/`);
  });
  const embedded = new Set(rows.filter((r) => r.target.endsWith('/ugradnja')).map((r) => r.session_id));
  const counted = countSources(rows.filter((r) => !embedded.has(r.session_id)));
  return embedded.size ? [{ key: 'vas-sajt', label: 'Vaš sajt', visitors: embedded.size }, ...counted].sort((a, b) => b.visitors - a.visitors) : counted;
}

const pricePerSqm =(u: { price: number | null; areaSqm: number | null }) => (u.price && u.areaSqm ? u.price / u.areaSqm : null);
const eur = (n: number) => `${Math.round(n).toLocaleString('sr-RS')} €`;

/** Null kad projekat ne postoji. */
export async function buildProjectReport(projectId: string, month: MonthKey): Promise<ProjectReport | null> {
  const db = admin();
  const { data: project } = await db
    .from('projects')
    .select('id, slug, title, developer_name, logo_url, logo_dark, created_at')
    .eq('id', projectId)
    .maybeSingle();
  if (!project) return null;

  const { from, to } = monthRange(month);
  const prevKey = shiftMonth(month, -1);
  const prevRange = monthRange(prevKey);

  const [{ data: unitRows }, { data: floors }, events, prevEvents, sources, { data: inquiries }, { data: prevInquiries }, { data: changes }] = await Promise.all([
    db.from('project_units').select('id, code, structure, area_sqm, price, status, floor_id, plan_url, plan3d_url').eq('project_id', projectId),
    db.from('project_floors').select('id, level, label').eq('project_id', projectId),
    readEvents(db, project.slug, month),
    readEvents(db, project.slug, prevKey),
    readSources(db, project.slug, month),
    db.from('project_inquiries').select('unit_code, created_at').eq('project_id', projectId).gte('created_at', from).lt('created_at', to),
    db.from('project_inquiries').select('unit_code').eq('project_id', projectId).gte('created_at', prevRange.from).lt('created_at', prevRange.to),
    db
      .from('project_unit_changes')
      .select('unit_code, field, old_value, new_value, actor, created_at')
      .eq('project_id', projectId)
      .gte('created_at', from)
      .lt('created_at', to)
      .order('created_at', { ascending: true })
  ]);

  const floorLabel = new Map((floors ?? []).map((f) => [f.id as string, floorName(Number(f.level ?? 0), f.label as string | null, 'sr')]));
  const keyToCode = new Map((unitRows ?? []).map((u) => [trackKey('pu', project.slug, u.code as string), u.code as string]));
  const views = new Map<string, number>();
  for (const e of events) {
    const code = keyToCode.get(e.target);
    if (code) views.set(code, (views.get(code) ?? 0) + 1);
  }
  const asks = new Map<string, number>();
  for (const i of inquiries ?? []) asks.set(i.unit_code as string, (asks.get(i.unit_code as string) ?? 0) + 1);

  const units: ReportUnit[] = (unitRows ?? []).map((u) => ({
    code: u.code as string,
    structure: (u.structure as string | null) || null,
    areaSqm: u.area_sqm != null ? Number(u.area_sqm) : null,
    price: u.price != null ? Number(u.price) : null,
    status: (u.status as UnitStatus) ?? 'available',
    floor: floorLabel.get(u.floor_id as string) ?? null,
    views: views.get(u.code as string) ?? 0,
    inquiries: asks.get(u.code as string) ?? 0
  }));
  const plans = new Map((unitRows ?? []).map((u) => [u.code as string, { plan: Boolean(u.plan_url), plan3d: Boolean(u.plan3d_url) }]));

  // Prosečna cena po m² po strukturi (slobodni stanovi sa cenom i kvadraturom).
  const avgBy = new Map<string, number>();
  const groups = new Map<string, number[]>();
  for (const u of units) {
    const p = pricePerSqm(u);
    if (p && u.status === 'available' && u.structure) groups.set(u.structure, [...(groups.get(u.structure) ?? []), p]);
  }
  for (const [s, list] of groups) if (list.length >= 2) avgBy.set(s, list.reduce((a, b) => a + b, 0) / list.length);

  const watch: WatchUnit[] = units
    .filter((u) => u.status === 'available' && u.inquiries === 0 && u.views >= WATCH_MIN_VIEWS)
    .sort((a, b) => b.views - a.views)
    .slice(0, 3)
    .map((u) => {
      const p = pricePerSqm(u);
      const avg = u.structure ? avgBy.get(u.structure) : undefined;
      const has = plans.get(u.code);
      let reason: string | null = null;
      if (p && avg && p > avg * (1 + PRICE_ABOVE_PCT / 100)) reason = `${eur(p)}/m² (prosek sličnih: ${eur(avg)}/m²)`;
      else if (!has?.plan && !has?.plan3d) reason = 'nema tlocrta stana';
      else if (!has?.plan3d) reason = 'nema 3D tlocrta';
      return { ...u, reason };
    });

  const structMap = new Map<string, { views: number; inquiries: number }>();
  for (const u of units) {
    const key = u.structure || 'Ostalo';
    const s = structMap.get(key) ?? { views: 0, inquiries: 0 };
    s.views += u.views;
    s.inquiries += u.inquiries;
    structMap.set(key, s);
  }

  const byCode = new Map(units.map((u) => [u.code, u]));
  const sales: SaleLine[] = (changes ?? []).map((c) => {
    const u = byCode.get(c.unit_code as string);
    return {
      code: c.unit_code as string,
      structure: u?.structure ?? null,
      floor: u?.floor ?? null,
      kind: c.field === 'price' ? 'price' : 'status',
      from: (c.old_value as string | null) ?? null,
      to: (c.new_value as string | null) ?? null,
      actor: (c.actor as string | null) ?? null,
      at: c.created_at as string,
      price: u?.price ?? null
    };
  });

  const sessions = (rows: EventRow[]) => new Set(rows.map((e) => e.session_id)).size;
  const firstMonth = (new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade', year: 'numeric', month: '2-digit' })
    .format(new Date(project.created_at as string))
    .slice(0, 7)) as MonthKey;

  return {
    projectId: project.id as string,
    slug: project.slug as string,
    title: project.title as string,
    developer: (project.developer_name as string | null) || null,
    logoUrl: (project.logo_url as string | null) || null,
    logoDark: Boolean(project.logo_dark),
    month,
    totals: {
      units: units.length,
      available: units.filter((u) => u.status === 'available').length,
      visitors: sessions(events),
      unitViews: events.filter((e) => keyToCode.has(e.target)).length,
      inquiries: (inquiries ?? []).length,
      sold: sales.filter((s) => s.kind === 'status' && s.to === 'sold').length,
      reserved: sales.filter((s) => s.kind === 'status' && s.to === 'reserved').length
    },
    previous: prevKey >= firstMonth ? { visitors: sessions(prevEvents), inquiries: (prevInquiries ?? []).length } : null,
    units: units
      .filter((u) => u.views || u.inquiries)
      .sort((a, b) => b.views - a.views || b.inquiries - a.inquiries || a.code.localeCompare(b.code, 'sr', { numeric: true })),
    watch,
    structures: [...structMap.entries()]
      .map(([structure, s]) => ({ structure, ...s }))
      .filter((s) => s.views || s.inquiries)
      .sort((a, b) => b.views - a.views),
    sources,
    sales,
    firstMonth
  };
}
