import { createHmac, timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * Mesečni izveštaj za agenciju (strana /izvestaj/[token]). SAMO SERVER.
 *
 * Agencija nema nalog - dobija tajni link. Token nosi naziv agencije i
 * potpis (HMAC), pa se ne može pogoditi niti prepraviti na tuđu agenciju.
 * Ključ za potpis je REPORT_LINK_SECRET, a dok ga nema, izvodi se iz
 * service-role ključa (jednosmerno - iz tokena se ključ ne može saznati).
 * Promena ključa poništava sve stare linkove.
 *
 * Brojevi se računaju isto kao u admin analitici (api/analytics): posetilac
 * = jedna sesija pregledača, "ušao u turu" = pritisnuo Pokreni turu.
 * Posete admina se ne beleže uopšte (lib/track.ts).
 */

const TOKEN_SIG_LENGTH = 24;
const MAX_EVENTS = 50_000;
const TOP_ROOMS = 3;
// Jedno gledanje prostorije se računa najviše ovoliko: ostavljen otvoren tab
// (tura u pozadini dok čovek radi nešto drugo) bi inače pokazao "120 min u
// kupatilu" i razvukao prosek. Pet minuta je daleko iznad stvarnog gledanja.
const ROOM_VIEW_CAP_MS = 5 * 60 * 1000;

function signingKey(): string {
  const key = process.env.REPORT_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Nema ključa za potpis linka izveštaja.');
  return key;
}

function sign(agency: string): string {
  return createHmac('sha256', signingKey())
    .update(`agency-report:${agency}`)
    .digest('base64url')
    .slice(0, TOKEN_SIG_LENGTH);
}

export function agencyReportToken(agency: string): string {
  return `${Buffer.from(agency, 'utf8').toString('base64url')}.${sign(agency)}`;
}

/** Naziv agencije iz tokena, ili null ako potpis ne valja. */
export function agencyFromToken(token: string): string | null {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  let agency: string;
  try {
    agency = Buffer.from(encoded, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  if (!agency.trim()) return null;
  const expected = Buffer.from(sign(agency));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given) ? agency : null;
}

// ---------------------------------------------------------------------------
// Meseci (po beogradskom vremenu)

export type MonthKey = `${number}-${string}`;

const MONTHS_SR = ['januar', 'februar', 'mart', 'april', 'maj', 'jun', 'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar'];

function belgradeOffsetMinutes(at: Date): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Belgrade', timeZoneName: 'shortOffset' })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName')?.value;
  const match = name?.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 60;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === '-' ? -minutes : minutes;
}

/** Ponoć prvog dana meseca u Beogradu, kao UTC trenutak. */
function monthStartUtc(year: number, month: number): Date {
  const guess = new Date(Date.UTC(year, month - 1, 1));
  return new Date(guess.getTime() - belgradeOffsetMinutes(guess) * 60_000);
}

export function currentMonthKey(now = new Date()): MonthKey {
  const iso = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade', year: 'numeric', month: '2-digit' }).format(now);
  return iso.slice(0, 7) as MonthKey;
}

export function parseMonthKey(value: string | undefined | null): MonthKey | null {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? (value as MonthKey) : null;
}

export function shiftMonth(key: MonthKey, delta: number): MonthKey {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` as MonthKey;
}

export function monthLabel(key: MonthKey): string {
  const [y, m] = key.split('-').map(Number);
  const name = MONTHS_SR[m - 1];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}.`;
}

function monthRange(key: MonthKey): { from: string; to: string } {
  const [y, m] = key.split('-').map(Number);
  return {
    from: monthStartUtc(y, m).toISOString(),
    to: monthStartUtc(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1).toISOString()
  };
}

// ---------------------------------------------------------------------------
// Izveštaj

export type TourReport = {
  slug: string;
  title: string;
  status: string;
  published: boolean;
  /** Različiti posetioci (sesije) koji su otvorili link. */
  visitors: number;
  /** Koliko njih je pokrenulo turu. */
  entered: number;
  /** Udeo posetilaca koji su ušli u turu, u %. */
  enterRate: number;
  /** Prosečno vreme u turi po posetiocu koji je ušao, u sekundama. */
  avgSeconds: number;
  /** Najgledanije prostorije, po ukupnom vremenu. */
  topRooms: { title: string; avgSeconds: number }[];
  /** Posetioci koji su turu gledali na stranom jeziku. */
  foreignVisitors: number;
  contactClicks: number;
  shares: number;
  viewingRequests: number;
};

export type AgencyReport = {
  agency: string;
  month: MonthKey;
  tours: TourReport[];
  totals: {
    visitors: number;
    entered: number;
    avgSeconds: number;
    foreignVisitors: number;
    contactClicks: number;
    viewingRequests: number;
  };
  /** Isto za prethodni mesec, za poređenje (null ako tada nije bilo tura). */
  previous: { visitors: number; contactClicks: number; viewingRequests: number } | null;
  /** Najraniji mesec za koji ima smisla izveštaj (kad je nastala prva tura). */
  firstMonth: MonthKey;
  truncated: boolean;
};

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Nedostaju Supabase promenljive.');
  return createClient<Database>(url, key);
}

function pickSr(value: unknown, fallback: string | null): string {
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return value || fallback || '';
    }
  }
  if (parsed && typeof parsed === 'object') {
    const rec = parsed as Record<string, string>;
    return rec.sr || Object.values(rec)[0] || fallback || '';
  }
  return fallback || '';
}

type EventRow = {
  tour_slug: string;
  event_type: string;
  session_id: string;
  room_id: string | null;
  duration_ms: number | null;
  lang: string | null;
};

async function readMonth(
  supabase: ReturnType<typeof supabaseAdmin>,
  slugs: string[],
  key: MonthKey
): Promise<{ events: EventRow[]; requests: { source: string | null }[]; truncated: boolean }> {
  const { from, to } = monthRange(key);
  const [{ data: events, error }, { data: requests }] = await Promise.all([
    supabase
      .from('tour_events')
      .select('tour_slug, event_type, session_id, room_id, duration_ms, lang')
      .in('tour_slug', slugs)
      .gte('created_at', from)
      .lt('created_at', to)
      .order('created_at', { ascending: false })
      .limit(MAX_EVENTS),
    supabase
      .from('contact_requests')
      .select('source')
      .in(
        'source',
        slugs.map((s) => `tour:${s}`)
      )
      .gte('created_at', from)
      .lt('created_at', to)
  ]);
  if (error) throw new Error(`tour_events: ${error.message}`);
  const rows = (events ?? []) as EventRow[];
  return { events: rows, requests: requests ?? [], truncated: rows.length >= MAX_EVENTS };
}

/** Null kad agencija nema nijednu turu (npr. preimenovana). */
export async function buildAgencyReport(agency: string, month: MonthKey): Promise<AgencyReport | null> {
  const supabase = supabaseAdmin();

  const { data: tours } = await supabase
    .from('tours')
    .select('slug, title, title_i18n, status, published, created_at')
    .eq('agency_name', agency)
    .order('created_at', { ascending: true });

  if (!tours?.length) return null;
  const slugs = tours.map((t) => t.slug);

  const [{ data: rooms }, current, previous] = await Promise.all([
    supabase.from('rooms').select('id, title, title_i18n').in('tour_slug', slugs),
    readMonth(supabase, slugs, month),
    readMonth(supabase, slugs, shiftMonth(month, -1))
  ]);

  const roomTitles = new Map((rooms ?? []).map((r) => [String(r.id), pickSr(r.title_i18n, r.title)]));

  const tourReports: TourReport[] = tours.map((tour) => {
    const rows = current.events.filter((e) => e.tour_slug === tour.slug);
    const sessions = new Set<string>();
    const entered = new Set<string>();
    const foreign = new Set<string>();
    const roomTime = new Map<string, { ms: number; views: number }>();
    let totalMs = 0;
    let contactClicks = 0;
    let shares = 0;

    for (const e of rows) {
      sessions.add(e.session_id);
      if (e.lang && e.lang !== 'sr') foreign.add(e.session_id);
      if (e.event_type === 'start') entered.add(e.session_id);
      else if (e.event_type === 'contact') contactClicks++;
      else if (e.event_type === 'share') shares++;
      else if (e.event_type === 'room_view' && e.room_id) {
        const ms = Math.min(Math.max(e.duration_ms ?? 0, 0), ROOM_VIEW_CAP_MS);
        totalMs += ms;
        const r = roomTime.get(e.room_id) ?? { ms: 0, views: 0 };
        r.ms += ms;
        r.views++;
        roomTime.set(e.room_id, r);
      }
    }

    return {
      slug: tour.slug,
      title: pickSr(tour.title_i18n, tour.title),
      status: tour.status,
      published: tour.published,
      visitors: sessions.size,
      entered: entered.size,
      enterRate: sessions.size ? Math.round((entered.size / sessions.size) * 100) : 0,
      avgSeconds: entered.size ? Math.round(totalMs / entered.size / 1000) : 0,
      topRooms: [...roomTime.entries()]
        .sort((a, b) => b[1].ms - a[1].ms)
        .slice(0, TOP_ROOMS)
        .map(([id, r]) => ({ title: roomTitles.get(id) || 'Prostorija', avgSeconds: Math.round(r.ms / r.views / 1000) })),
      foreignVisitors: foreign.size,
      contactClicks,
      shares,
      viewingRequests: current.requests.filter((r) => r.source === `tour:${tour.slug}`).length
    };
  });

  const sum = (pick: (t: TourReport) => number) => tourReports.reduce((acc, t) => acc + pick(t), 0);
  const enteredTotal = sum((t) => t.entered);
  const weightedSeconds = sum((t) => t.avgSeconds * t.entered);

  const prevVisitors = new Set(previous.events.map((e) => `${e.tour_slug}|${e.session_id}`)).size;
  const firstCreated = tours[0].created_at ? currentMonthKey(new Date(tours[0].created_at)) : month;
  const previousKey = shiftMonth(month, -1);

  return {
    agency,
    month,
    tours: tourReports.sort((a, b) => b.visitors - a.visitors || a.title.localeCompare(b.title, 'sr')),
    totals: {
      visitors: sum((t) => t.visitors),
      entered: enteredTotal,
      avgSeconds: enteredTotal ? Math.round(weightedSeconds / enteredTotal) : 0,
      foreignVisitors: sum((t) => t.foreignVisitors),
      contactClicks: sum((t) => t.contactClicks),
      viewingRequests: sum((t) => t.viewingRequests)
    },
    previous:
      previousKey >= firstCreated
        ? {
            visitors: prevVisitors,
            contactClicks: previous.events.filter((e) => e.event_type === 'contact').length,
            viewingRequests: previous.requests.length
          }
        : null,
    firstMonth: firstCreated,
    truncated: current.truncated
  };
}

/** Sve agencije koje imaju bar jednu turu, sa linkom izveštaja - za admin. */
export async function agencyReportLinks(): Promise<{ agency: string; token: string; tours: number }[]> {
  const supabase = supabaseAdmin();
  const { data } = await supabase.from('tours').select('agency_name');
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    // Tačno kako piše u bazi - izveštaj traži ture istim tekstom (eq).
    const name = row.agency_name;
    if (name?.trim()) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'sr'))
    .map(([agency, tours]) => ({ agency, token: agencyReportToken(agency), tours }));
}
