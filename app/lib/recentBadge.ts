/**
 * Da li stavka menija nosi oznaku "Novo" (vlasnik, 30. 10. 2026: "Novo" se
 * do sada ručno upisivalo i nikad nije samo nestajalo - "Za investitore" je
 * nosilo oznaku 2+ nedelje). Umesto `isNew: true`, stavka nosi datum kad je
 * ušla u meni (`since`), a ovo računa da li je još u prozoru.
 */

/** Koliko dana stavka ostaje označena kao "Novo". */
export const RECENT_BADGE_DAYS = 21;

const DAY_MS = 24 * 60 * 60 * 1000;

export function isRecentlyAdded(since: string, now: Date = new Date()): boolean {
  // Po kalendarskom danu (ne po satima) - oznaka se ne gasi usred dana zavisno od doba dana.
  const today = now.toISOString().slice(0, 10);
  const start = new Date(`${since}T00:00:00Z`).getTime();
  const diffDays = (new Date(`${today}T00:00:00Z`).getTime() - start) / DAY_MS;
  return diffDays <= RECENT_BADGE_DAYS;
}
