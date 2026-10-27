import type { LiveAngles } from './protocol.ts';

/**
 * Razgledanje uživo: računanje pogleda. Bez uvoza koji ostaju posle
 * prevođenja (samo `import type`), da ga `node` testovi pokreću direktno.
 * Zato ovde postoji i svoj wrapYaw umesto normalizeYaw iz ../utils.
 */

/** Koliko brzo kupčev pogled stiže agentov: posle ~3×TAU je praktično tu. */
export const FOLLOW_TAU_MS = 120;
// Najduži korak koji se računa kao jedan frejm (~3 frejma na 60 Hz).
const MAX_STEP_DT_MS = 50;
// Ispod ovoga razlika se ne vidi, pa se pogled postavlja tačno na cilj.
const SNAP_EPSILON = 0.05;
// Promena manja od ovoga se ne šalje (podrhtavanje miša, zaokruživanje).
const CHANGE_THRESHOLD_DEG = 0.3;

/** Yaw u opsegu [-180, 180). */
export function wrapYaw(yaw: number): number {
  let r = (yaw + 180) % 360;
  if (r < 0) r += 360;
  return r - 180;
}

/** Razlika target - current najkraćim putem, u opsegu [-180, 180). */
function yawDelta(current: number, target: number): number {
  return wrapYaw(target - current);
}

/**
 * Jedan korak glatkog praćenja: pogled se svakog frejma približi cilju za
 * deo preostale razlike (eksponencijalno), pa brze uzastopne poruke izgledaju
 * kao jedno glatko kretanje, a ne kao skokovi.
 */
export function stepToward(cur: LiveAngles, target: LiveAngles, dtMs: number): LiveAngles {
  const dYaw = yawDelta(cur.yaw, target.yaw);
  const dPitch = target.pitch - cur.pitch;
  const dHfov = target.hfov - cur.hfov;
  if (Math.abs(dYaw) < SNAP_EPSILON && Math.abs(dPitch) < SNAP_EPSILON && Math.abs(dHfov) < SNAP_EPSILON) {
    return { yaw: wrapYaw(target.yaw), pitch: target.pitch, hfov: target.hfov };
  }
  // Posle duge pauze (telefon u pozadini, pa nazad) korak je kao jedan frejm,
  // da kamera dođe glatko, a ne da skoči u agentov pogled.
  const k = 1 - Math.exp(-Math.min(Math.max(0, dtMs), MAX_STEP_DT_MS) / FOLLOW_TAU_MS);
  return {
    yaw: wrapYaw(cur.yaw + dYaw * k),
    pitch: cur.pitch + dPitch * k,
    hfov: cur.hfov + dHfov * k
  };
}

export function viewChanged(a: LiveAngles, b: LiveAngles): boolean {
  return (
    Math.abs(yawDelta(a.yaw, b.yaw)) > CHANGE_THRESHOLD_DEG ||
    Math.abs(a.pitch - b.pitch) > CHANGE_THRESHOLD_DEG ||
    Math.abs(a.hfov - b.hfov) > CHANGE_THRESHOLD_DEG
  );
}

/**
 * Kupac je ušao u sobu: ako to nije soba u koju ga je praćenje upravo vodilo
 * (strelice, spisak, tačka na vratima), sam je izabrao, pa se odvaja.
 */
export function roomChangeDetaches(newRoomId: string, expectedRoomId: string | null): boolean {
  return newRoomId !== expectedRoomId;
}

/**
 * Na kojoj ivici agentovog ekrana stoji strelica ka kupčevom pravcu, ili
 * null kad kupac gleda u nešto što agent i sam vidi (unutar vidnog polja).
 */
export function edgeSide(selfYaw: number, peerYaw: number, hfov: number): 'left' | 'right' | null {
  const d = yawDelta(selfYaw, peerYaw);
  if (Math.abs(d) <= hfov / 2) return null;
  return d > 0 ? 'right' : 'left';
}
