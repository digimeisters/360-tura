import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/adminAuth';

export const dynamic = 'force-dynamic';

// Zaštita od preteškog upita: i pri velikom saobraćaju se čita najviše
// ovoliko događaja po zahtevu.
const MAX_EVENTS = 50000;

type EventRow = {
  tour_slug: string;
  room_id: string | null;
  event_type: string;
  session_id: string;
  duration_ms: number | null;
};

type RoomStat = { roomId: string; views: number; totalMs: number };

type SiteRow = {
  event_type: string;
  target: string | null;
  session_id: string;
  device: string | null;
  source: string | null;
};

// Tabela site_events nastaje migracijom 008. Dok migracija nije pokrenuta,
// izveštaj o turama radi normalno, a admin vidi šta treba uraditi.
const MISSING_TABLE_CODES = new Set(['42P01', 'PGRST205']);

const TOP_SOURCES = 6;

function summarizeSite(rows: SiteRow[]) {
  const visitors = new Set<string>();
  const formSessions = new Set<string>();
  const deviceBySession = new Map<string, string>();
  const sourceVisitors = new Map<string, Set<string>>();
  const clicks = new Map<string, number>();
  let pageViews = 0;
  let formSubmits = 0;

  for (const row of rows) {
    if (row.event_type === 'page_view') {
      pageViews++;
      visitors.add(row.session_id);
      if (row.device) deviceBySession.set(row.session_id, row.device);
      const source = row.source || 'direktno';
      const set = sourceVisitors.get(source) ?? new Set<string>();
      set.add(row.session_id);
      sourceVisitors.set(source, set);
    } else if (row.event_type === 'form_submit') {
      formSubmits++;
      formSessions.add(row.session_id);
    } else if (row.target) {
      clicks.set(row.target, (clicks.get(row.target) ?? 0) + 1);
    }
  }

  const devices = [...deviceBySession.values()];
  const mobile = devices.filter((d) => d === 'mobile').length;

  return {
    visitors: visitors.size,
    pageViews,
    formSubmits,
    // Udeo posetilaca koji su poslali upit - ne broj upita, jer isti čovek
    // može da pošalje dva.
    conversionRate: visitors.size ? Math.round((formSessions.size / visitors.size) * 1000) / 10 : 0,
    mobileShare: devices.length ? Math.round((mobile / devices.length) * 100) : 0,
    sources: [...sourceVisitors.entries()]
      .map(([source, set]) => ({ source, visitors: set.size }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, TOP_SOURCES),
    clicks: [...clicks.entries()]
      .map(([target, count]) => ({ target, count }))
      .sort((a, b) => b.count - a.count)
  };
}

export async function GET(req: Request) {
  const ctx = await requireAdmin(req);
  if (!ctx.ok) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });

  const url = new URL(req.url);
  const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 30, 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const supabase = ctx.supabase;

  const [
    { data: events, error: evErr },
    { data: tours },
    { data: rooms },
    { data: siteEvents, error: siteErr }
  ] = await Promise.all([
    // Redosled je obavezan uz limit: bez njega Postgres pri odsecanju vraća
    // proizvoljnih MAX_EVENTS redova, pa bi izveštaj tiho pokazivao pogrešne
    // brojeve. Ovako odsečeno znači "poslednjih MAX_EVENTS", što je i
    // prijavljeno kroz `truncated`.
    supabase
      .from('tour_events')
      .select('tour_slug, room_id, event_type, session_id, duration_ms')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(MAX_EVENTS),
    supabase.from('tours').select('slug, title, title_i18n, agency_name'),
    supabase.from('rooms').select('id, tour_slug, title, title_i18n'),
    supabase
      .from('site_events')
      .select('event_type, target, session_id, device, source')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(MAX_EVENTS)
  ]);

  let site: (ReturnType<typeof summarizeSite> & { truncated: boolean }) | null = null;
  let siteStatus: 'ok' | 'missing' | 'error' = 'ok';
  if (siteErr) {
    siteStatus = MISSING_TABLE_CODES.has(siteErr.code) ? 'missing' : 'error';
    if (siteStatus === 'error') console.error('[api/analytics] site read failed:', siteErr.message);
  } else {
    const siteRows = (siteEvents ?? []) as SiteRow[];
    site = { ...summarizeSite(siteRows), truncated: siteRows.length >= MAX_EVENTS };
  }

  if (evErr) {
    console.error('[api/analytics] read failed:', evErr.message);
    return NextResponse.json({ success: false, error: 'Greška pri čitanju analitike.' }, { status: 500 });
  }

  const rows = (events ?? []) as EventRow[];

  const byTour = new Map<
    string,
    {
      opens: number;
      starts: number;
      shares: number;
      contacts: number;
      sessions: Set<string>;
      startSessions: Set<string>;
      rooms: Map<string, RoomStat>;
    }
  >();

  for (const row of rows) {
    let stat = byTour.get(row.tour_slug);
    if (!stat) {
      stat = {
        opens: 0,
        starts: 0,
        shares: 0,
        contacts: 0,
        sessions: new Set(),
        startSessions: new Set(),
        rooms: new Map()
      };
      byTour.set(row.tour_slug, stat);
    }

    stat.sessions.add(row.session_id);

    if (row.event_type === 'open') stat.opens++;
    else if (row.event_type === 'start') {
      stat.starts++;
      stat.startSessions.add(row.session_id);
    } else if (row.event_type === 'share') stat.shares++;
    else if (row.event_type === 'contact') stat.contacts++;
    else if (row.event_type === 'room_view' && row.room_id) {
      const room = stat.rooms.get(row.room_id) ?? { roomId: row.room_id, views: 0, totalMs: 0 };
      room.views++;
      room.totalMs += row.duration_ms ?? 0;
      stat.rooms.set(row.room_id, room);
    }
  }

  const pickTitle = (value: unknown, fallback: string | null): string => {
    if (!value) return fallback || '';
    let parsed = value;
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
      } catch {
        return value;
      }
    }
    if (parsed && typeof parsed === 'object') {
      const rec = parsed as Record<string, string>;
      return rec.sr || Object.values(rec)[0] || fallback || '';
    }
    return String(parsed);
  };

  const roomTitles = new Map<string, string>();
  for (const room of rooms ?? []) {
    roomTitles.set(String(room.id), pickTitle(room.title_i18n, room.title));
  }

  const result = (tours ?? [])
    .map((tour) => {
      const stat = byTour.get(tour.slug);
      const uniqueVisitors = stat?.sessions.size ?? 0;
      const startedVisitors = stat?.startSessions.size ?? 0;

      return {
        slug: tour.slug,
        title: pickTitle(tour.title_i18n, tour.title),
        agency: tour.agency_name,
        opens: stat?.opens ?? 0,
        uniqueVisitors,
        starts: stat?.starts ?? 0,
        // Udeo posetilaca koji su zaista ušli u turu, a ne broj klikova -
        // isti čovek može da pokrene turu više puta.
        startRate: uniqueVisitors ? Math.round((startedVisitors / uniqueVisitors) * 100) : 0,
        shares: stat?.shares ?? 0,
        contacts: stat?.contacts ?? 0,
        rooms: [...(stat?.rooms.values() ?? [])]
          .map((room) => ({
            roomId: room.roomId,
            title: roomTitles.get(room.roomId) || 'Nepoznata prostorija',
            views: room.views,
            totalMs: room.totalMs,
            avgMs: room.views ? Math.round(room.totalMs / room.views) : 0
          }))
          .sort((a, b) => b.totalMs - a.totalMs)
      };
    })
    .sort((a, b) => b.opens - a.opens || a.title.localeCompare(b.title));

  return NextResponse.json({
    success: true,
    days,
    totalEvents: rows.length,
    truncated: rows.length >= MAX_EVENTS,
    tours: result,
    site,
    siteStatus
  });
}
