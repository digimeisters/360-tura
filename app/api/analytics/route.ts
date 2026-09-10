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

export async function GET(req: Request) {
  const ctx = await requireAdmin(req);
  if (!ctx.ok) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });

  const url = new URL(req.url);
  const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 30, 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const supabase = ctx.supabase;

  const [{ data: events, error: evErr }, { data: tours }, { data: rooms }] = await Promise.all([
    supabase
      .from('tour_events')
      .select('tour_slug, room_id, event_type, session_id, duration_ms')
      .gte('created_at', since)
      .limit(MAX_EVENTS),
    supabase.from('tours').select('slug, title, title_i18n, agency_name'),
    supabase.from('rooms').select('id, tour_slug, title, title_i18n')
  ]);

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
    tours: result
  });
}
