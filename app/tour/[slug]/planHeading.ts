import type { Room } from './types';

/**
 * Ugao poravnanja panorame sa tlocrtom - za konus pogleda na planu.
 *
 * Svaka panorama je snimljena okrenuta "na svoju stranu": yaw 0 u jednoj sobi
 * nije isti pravac na planu kao yaw 0 u drugoj. Poravnanje se računa iz onoga
 * što već postoji, bez ručnog unosa:
 *   - na planu: tačke soba (floorplan_x / _y, u procentima slike);
 *   - u panorami: vrata (tačke tipa 'navigation' sa targetRoomId i yaw).
 * Vrata iz sobe A ka sobi B pod uglom `yaw` moraju na planu pokazivati od
 * tačke A ka tački B, pa je poravnanje = (pravac A→B na planu) − yaw. Ima li
 * soba više vrata, uzima se kružni prosek, bez vrata koja od njega odstupaju
 * više od OUTLIER_DEG (tipično: dva snimka istog hodnika, čije su tačke na
 * planu skoro jedna na drugoj, pa im je pravac nasumičan).
 *
 * Uglovi su kao yaw u Pannellum-u: stepeni, 0 = gore na planu, raste u smeru
 * kazaljke. Pravac na planu se računa u PIKSELIMA slike, ne u procentima -
 * zato treba odnos širine i visine plana (`aspect` = širina / visina).
 *
 * Provereno 27. 9. 2026 na četiri ture: medijana odstupanja pojedinačnih
 * vrata od proseka 2-16°, što je za konus širok 60-110° neprimetno.
 */

const OUTLIER_DEG = 60;
// Tačke bliže od ovoga (u delu širine plana) daju nepouzdan pravac.
const MIN_MARKER_GAP = 0.02;

function norm(deg: number): number {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}

function circularMean(degs: number[]): number {
  let x = 0;
  let y = 0;
  for (const d of degs) {
    const r = (d * Math.PI) / 180;
    x += Math.cos(r);
    y += Math.sin(r);
  }
  return (Math.atan2(y, x) * 180) / Math.PI;
}

type Waypointish = { type?: string; targetRoomId?: unknown; yaw?: unknown };

function waypointsOf(room: Room): Waypointish[] {
  let value: unknown = room.waypoints_i18n;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? (value as Waypointish[]) : [];
}

function hasMarker(room: Room | undefined): room is Room & { floorplan_x: number; floorplan_y: number } {
  return typeof room?.floorplan_x === 'number' && typeof room?.floorplan_y === 'number';
}

/**
 * Poravnanje sobe sa planom (stepeni), ili null ako soba nema tačku na planu
 * ili nijedna njena vrata ne vode u sobu koja je označena na planu - tada se
 * konus ne crta, jer bi pokazivao nasumično.
 */
export function planHeadingFor(roomId: Room['id'], rooms: Room[], aspect: number): number | null {
  if (!(aspect > 0)) return null;
  const byId = new Map(rooms.map((r) => [String(r.id), r]));
  const from = byId.get(String(roomId));
  if (!hasMarker(from)) return null;

  const samples: number[] = [];
  for (const wp of waypointsOf(from)) {
    if (wp?.type !== 'navigation' || wp.targetRoomId == null) continue;
    const to = byId.get(String(wp.targetRoomId));
    if (!hasMarker(to) || to === from) continue;
    // Procenti -> pikseli: x u delovima širine, y u delovima širine (y / aspect).
    const dx = (to.floorplan_x - from.floorplan_x) / 100;
    const dy = (to.floorplan_y - from.floorplan_y) / 100 / aspect;
    if (Math.hypot(dx, dy) < MIN_MARKER_GAP) continue;
    const onPlan = (Math.atan2(dx, -dy) * 180) / Math.PI;
    const yaw = Number(wp.yaw);
    if (!Number.isFinite(yaw)) continue;
    samples.push(norm(onPlan - yaw));
  }
  if (!samples.length) return null;

  const first = circularMean(samples);
  const kept = samples.filter((s) => Math.abs(norm(s - first)) <= OUTLIER_DEG);
  return norm(circularMean(kept.length ? kept : samples));
}
