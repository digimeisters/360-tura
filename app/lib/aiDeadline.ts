/**
 * Rok za AI pozive unutar jedne rute (Vercel prekida funkciju posle
 * maxDuration). Pokušaj koji ne može da završi pre roka se ne počinje -
 * bolje vratiti ono što već imamo nego 504 bez ičega.
 */

// Rezerva za odgovor i upis posle poslednjeg poziva.
const SAFETY_MS = 2000;
// Kraći pokušaj od ovoga ionako ne stigne da pročita sliku.
const MIN_ATTEMPT_MS = 8000;

/** Timeout za sledeći pokušaj, ili null kad do roka nema dovoljno vremena. */
export function attemptTimeoutMs(nowMs: number, deadlineAt: number | undefined, maxMs: number): number | null {
  if (deadlineAt === undefined) return maxMs;
  const left = deadlineAt - nowMs - SAFETY_MS;
  return left >= MIN_ATTEMPT_MS ? Math.min(maxMs, left) : null;
}
