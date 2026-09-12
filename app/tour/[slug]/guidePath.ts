import type { Room } from './types';
import { parseWaypoints } from './utils';

/**
 * Putanja automatskog vodiča: niz rednih brojeva soba (rooms.order_index),
 * npr. [1,2,3,2,4,2,5] - hodnik (2) se ponavlja jer je prolaz između grana.
 * Autor ture je piše ručno u adminu (TourAdminTools -> "Putanja vodiča"),
 * jer algoritam koji sam smišlja put kroz granata pogađa lošije nego čovek
 * koji zna kako se kroz stan stvarno hoda.
 */

// Pri PONOVNOM prolasku kroz već predstavljenu sobu (npr. hodnik drugi put)
// vodič ne priča i ne staje: odmah okreće pogled ka sledećim vratima i
// nastavlja. Okret traje srazmerno uglu, u granicama MIN/MAX.
export const GUIDE_REVISIT_TURN_DEG_PER_S = 60;
export const GUIDE_REVISIT_TURN_MIN_MS = 1200;
export const GUIDE_REVISIT_TURN_MAX_MS = 3000;
// Prilaz vratima kreće malo pre kraja okreta, da se pokret ne zaustavi na spoju.
export const GUIDE_REVISIT_OVERLAP_MS = 250;

export function revisitTurnMs(angleDeg: number): number {
  const ms = (Math.abs(angleDeg) / GUIDE_REVISIT_TURN_DEG_PER_S) * 1000;
  return Math.min(GUIDE_REVISIT_TURN_MAX_MS, Math.max(GUIDE_REVISIT_TURN_MIN_MS, ms));
}

export function parseGuidePath(raw: string | null | undefined): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

export function serializeGuidePath(steps: number[]): string {
  return steps.join(',');
}

export type GuideStep = { room: Room; orderIndex: number };

/** Sobe iz sekvence brojeva, tim redom (nepoznat broj se preskače). */
export function resolveGuidePath(path: number[], rooms: Room[]): GuideStep[] {
  const byOrder = new Map(rooms.map((r) => [r.order_index, r]));
  const steps: GuideStep[] = [];
  for (const n of path) {
    const room = byOrder.get(n);
    if (room) steps.push({ room, orderIndex: n });
  }
  return steps;
}

export type GuidePathError =
  | { code: 'too_short' }
  | { code: 'unknown_order_index'; value: number }
  | { code: 'no_hotspot'; fromOrderIndex: number; toOrderIndex: number };

/**
 * Provera PRE čuvanja putanje: da svaki broj postoji među sobama i da između
 * svaka dva uzastopna koraka postoji navigaciona tačka u tom pravcu - bez nje
 * vodič ne bi znao kroz koja "vrata" da prošeta (vidi walkToRoom u page.tsx).
 */
export function validateGuidePath(path: number[], rooms: Room[]): GuidePathError | null {
  if (path.length < 2) return { code: 'too_short' };

  const byOrder = new Map(rooms.map((r) => [r.order_index, r]));
  for (const n of path) {
    if (!byOrder.has(n)) return { code: 'unknown_order_index', value: n };
  }

  for (let i = 0; i < path.length - 1; i++) {
    const from = byOrder.get(path[i])!;
    const to = byOrder.get(path[i + 1])!;
    const hasHotspot = parseWaypoints(from.waypoints_i18n).some(
      (w) => w.targetRoomId != null && String(w.targetRoomId) === String(to.id)
    );
    if (!hasHotspot) return { code: 'no_hotspot', fromOrderIndex: path[i], toOrderIndex: path[i + 1] };
  }

  return null;
}

export function describeGuidePathError(error: GuidePathError): string {
  switch (error.code) {
    case 'too_short':
      return 'Putanja mora imati bar dva broja (npr. "1,2").';
    case 'unknown_order_index':
      return `Soba pod brojem ${error.value} ne postoji.`;
    case 'no_hotspot':
      return `Nema tačke za prelaz iz sobe ${error.fromOrderIndex} u sobu ${error.toOrderIndex} - dodaj je u panorami pre nego što je upišeš ovde.`;
  }
}
