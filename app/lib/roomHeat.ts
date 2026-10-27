/**
 * Toplotna mapa ture za mesečni izveštaj agencije: koliko kupaca otvori koju
 * prostoriju, koliko se u njoj zadrže i gde zatvore turu. Računa se iz
 * room_view događaja koje tura već beleži (useTourAnalytics) - jedan događaj
 * po napuštanju prostorije, pa je poslednji događaj posetioca soba u kojoj je
 * izašao.
 *
 * Procenti su od posetilaca za koje postoji bar jedan room_view; stariji
 * ulasci u turu (pre beleženja soba) se ne računaju ni u brojilac ni u imenilac.
 */

/** Ispod ovoliko posetilaca procenti ništa ne govore (1 od 3 = 33%). */
export const MIN_HEAT_VIEWERS = 10;
/** Soba je "skrivena" ako je vidi najviše ovoliko % kupaca... */
const GEM_MAX_SEEN_PCT = 30;
/** ...a tipično (medijana, ne prosek - ostavljen tab ne sme da ga naduva) se
 * zadrže bar ovoliko i bar 1,5x duže od tipične sobe... */
const GEM_MIN_SECONDS = 60;
const GEM_VS_MEDIAN = 1.5;
/** ...i to je videlo bar ovoliko kupaca (manje je slučajnost). */
const GEM_MIN_VIEWERS = 5;
/** Od ovoliko % izlazaka u prvoj prostoriji vredi upozoriti agenciju. */
const EARLY_EXIT_PCT = 25;

export type HeatRoom = { id: string; title: string; x: number | null; y: number | null; order: number | null };
export type HeatEvent = { session_id: string; room_id: string | null; duration_ms: number | null; created_at: string };

export type RoomHeatRow = {
  id: string;
  title: string;
  x: number | null;
  y: number | null;
  seenPct: number;
  avgSeconds: number;
  exitPct: number;
};

export type HeatInsight =
  | { kind: 'hidden-gem'; room: string; seenPct: number; typicalSeconds: number }
  | { kind: 'early-exit'; room: string; exitPct: number };

export type RoomHeat = {
  /** Posetioci sa podacima o sobama (osnova za procente). */
  viewers: number;
  rows: RoomHeatRow[];
  /** Soba u kojoj najviše kupaca zatvori turu. */
  exitRoomId: string | null;
  insights: HeatInsight[];
};

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Null kad je premalo posetilaca za smislene procente. */
export function buildRoomHeat(events: HeatEvent[], rooms: HeatRoom[], capMs: number): RoomHeat | null {
  const known = new Map(rooms.map((r) => [r.id, r]));
  const seen = new Map<string, Set<string>>();
  const time = new Map<string, { ms: number; views: number; each: number[] }>();
  const last = new Map<string, { room: string; at: string }>();

  for (const e of events) {
    if (!e.room_id || !known.has(e.room_id)) continue;
    const sessions = seen.get(e.room_id) ?? new Set<string>();
    sessions.add(e.session_id);
    seen.set(e.room_id, sessions);
    const t = time.get(e.room_id) ?? { ms: 0, views: 0, each: [] };
    const ms = Math.min(Math.max(e.duration_ms ?? 0, 0), capMs);
    t.ms += ms;
    t.views++;
    t.each.push(ms);
    time.set(e.room_id, t);
    const prev = last.get(e.session_id);
    if (!prev || e.created_at > prev.at) last.set(e.session_id, { room: e.room_id, at: e.created_at });
  }

  const viewers = last.size;
  if (viewers < MIN_HEAT_VIEWERS) return null;

  const exits = new Map<string, number>();
  for (const { room } of last.values()) exits.set(room, (exits.get(room) ?? 0) + 1);

  const orderOf = (r: HeatRoom) => r.order ?? Number.MAX_SAFE_INTEGER;
  const rows: RoomHeatRow[] = rooms
    .map((r) => {
      const t = time.get(r.id);
      return {
        id: r.id,
        title: r.title,
        x: r.x,
        y: r.y,
        seenPct: pct(seen.get(r.id)?.size ?? 0, viewers),
        avgSeconds: t?.views ? Math.round(t.ms / t.views / 1000) : 0,
        exitPct: pct(exits.get(r.id) ?? 0, viewers)
      };
    })
    .sort((a, b) => b.seenPct - a.seenPct || orderOf(known.get(a.id)!) - orderOf(known.get(b.id)!));

  let exitRoomId: string | null = null;
  let maxExits = 0;
  for (const [room, n] of exits) {
    if (n > maxExits) {
      maxExits = n;
      exitRoomId = room;
    }
  }

  const insights: HeatInsight[] = [];
  const typicalOf = new Map([...time].map(([id, t]) => [id, Math.round(median(t.each) / 1000)]));
  const viewed = rows.filter((r) => typicalOf.has(r.id));
  const usual = median(viewed.map((r) => typicalOf.get(r.id)!));
  const gem = viewed
    .map((r) => ({ r, s: typicalOf.get(r.id)! }))
    .filter(
      ({ r, s }) =>
        r.seenPct <= GEM_MAX_SEEN_PCT &&
        (seen.get(r.id)?.size ?? 0) >= GEM_MIN_VIEWERS &&
        s >= GEM_MIN_SECONDS &&
        s >= usual * GEM_VS_MEDIAN
    )
    .sort((a, b) => b.s - a.s)[0];
  if (gem) insights.push({ kind: 'hidden-gem', room: gem.r.title, seenPct: gem.r.seenPct, typicalSeconds: gem.s });

  const first = [...rooms].sort((a, b) => orderOf(a) - orderOf(b))[0];
  const firstRow = first && rows.find((r) => r.id === first.id);
  if (firstRow && firstRow.exitPct >= EARLY_EXIT_PCT) {
    insights.push({ kind: 'early-exit', room: firstRow.title, exitPct: firstRow.exitPct });
  }

  return { viewers, rows, exitRoomId, insights };
}
