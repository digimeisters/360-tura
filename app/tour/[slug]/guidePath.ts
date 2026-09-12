import type { Room } from './types';
import { parseWaypoints } from './utils';

/**
 * Putanja automatskog vodiča: niz rednih brojeva soba (rooms.order_index),
 * npr. [1,2,3,2,4,2,5] - hodnik (2) se ponavlja jer je prolaz između grana.
 * Autor ture je piše ručno u adminu (TourAdminTools -> "Putanja vodiča"),
 * jer algoritam koji sam smišlja put kroz granata pogađa lošije nego čovek
 * koji zna kako se kroz stan stvarno hoda.
 */

// Koliko dugo (ms) vodič ćuti pri PONOVNOM prolasku kroz već predstavljenu
// sobu (npr. hodnik drugi put) - bez naracije, samo kratak predah pre nego
// što nastavi dalje.
export const GUIDE_REVISIT_PAUSE_MS = 4000;

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
