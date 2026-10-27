/**
 * Razgledanje uživo: dogovor o porukama između agenta i kupca.
 *
 * Poruke idu preko javnog Supabase Realtime kanala (broadcast), pa ih svako
 * ko zna ime kanala može poslati - zato se svaka proverava ovde pre nego što
 * dotakne turu, a nepoznat ili loš oblik se tiho odbacuje. Modul je namerno
 * bez uvoza, da ga `node` testovi pokreću direktno (live.test.ts).
 */

export const LIVE_V = 1;

/** Isti alfabet kao LIVE_CODE_ALPHABET u lib/liveGuide.ts (server). */
export const LIVE_CODE_RE = /^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6}$/;

export const LIVE_TIMING = {
  /** Agent šalje pogled najviše ovoliko često. */
  viewMinMs: 100,
  /** Kupac šalje svoj pogled najviše ovoliko često. */
  viewerMinMs: 250,
  /** Otkucaj: pogled se šalje i bez promene, da se zakasneli poravna. */
  heartbeatMs: 2000,
  /** Agent nestao sa kanala ovoliko dugo → kupcu "veza prekinuta". */
  guideLostMs: 30000,
  /** Agent se nijednom nije pojavio ovoliko dugo → "završeno ili nije počelo". */
  noGuideMs: 20000,
  /** Koliko dugo stoji krug pokazivača. */
  pointTtlMs: 3000,
  /** Dugi dodir za pokazivač, i koliko prst sme da se pomeri. */
  longPressMs: 500,
  longPressSlopPx: 8
} as const;

export type LiveRole = 'guide' | 'viewer';

export type LiveAngles = { yaw: number; pitch: number; hfov: number };

export type LiveEvent =
  | ({ type: 'view'; roomId: string } & LiveAngles)
  | { type: 'room'; roomId: string; waypointIndex: number | null }
  | { type: 'point'; roomId: string; yaw: number; pitch: number }
  | { type: 'end' }
  | { type: 'viewer'; roomId: string; yaw: number; pitch: number; following: boolean };

export type LiveEventType = LiveEvent['type'];

/** Deo Pannellum viewera koji razgledanje uživo koristi. */
export type LiveViewer = {
  getYaw(): number;
  getPitch(): number;
  getHfov(): number;
  setYaw(yaw: number, animated?: number): unknown;
  setPitch(pitch: number, animated?: number): unknown;
  setHfov(hfov: number, animated?: number): unknown;
  lookAt(pitch: number, yaw: number, hfov?: number, animated?: number): unknown;
  mouseEventToCoords(e: Event): [number, number];
  addHotSpot(hs: Record<string, unknown>): unknown;
  removeHotSpot(id: string): unknown;
};

const MAX_ROOM_ID_LENGTH = 64;

export function liveChannelName(slug: string, code: string): string {
  return `live:${slug}:${code}`;
}

/** Telo broadcast poruke: sve osim `type` (to je ime događaja), plus verzija. */
export function toPayload(e: LiveEvent): Record<string, unknown> {
  const rest: Record<string, unknown> = { ...e };
  delete rest.type;
  return { ...rest, v: LIVE_V };
}

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isRoomId = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length <= MAX_ROOM_ID_LENGTH;

/** Proverena poruka sa kanala, ili null. Vraća nov objekat samo sa poljima tog tipa. */
export function parseLiveEvent(type: string, payload: unknown): LiveEvent | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  if (p.v !== LIVE_V) return null;

  switch (type) {
    case 'view':
      if (!isRoomId(p.roomId) || !isNum(p.yaw) || !isNum(p.pitch) || !isNum(p.hfov)) return null;
      return { type, roomId: p.roomId, yaw: p.yaw, pitch: p.pitch, hfov: p.hfov };
    case 'room': {
      const wi = p.waypointIndex;
      const validIndex = wi === null || (Number.isInteger(wi) && (wi as number) >= 0);
      if (!isRoomId(p.roomId) || !validIndex) return null;
      return { type, roomId: p.roomId, waypointIndex: wi as number | null };
    }
    case 'point':
      if (!isRoomId(p.roomId) || !isNum(p.yaw) || !isNum(p.pitch)) return null;
      return { type, roomId: p.roomId, yaw: p.yaw, pitch: p.pitch };
    case 'end':
      return { type };
    case 'viewer':
      if (!isRoomId(p.roomId) || !isNum(p.yaw) || !isNum(p.pitch) || typeof p.following !== 'boolean') return null;
      return { type, roomId: p.roomId, yaw: p.yaw, pitch: p.pitch, following: p.following };
    default:
      return null;
  }
}
