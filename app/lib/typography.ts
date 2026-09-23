/**
 * Broj i jedinica u istom redu: "54 m²" ne sme da se prelomi tako da "54"
 * ostane na kraju jednog reda, a "m²" ode u sledeći. Radi samo pri prikazu -
 * naslov u bazi se ne dira (naslove menja vlasnik, u /admin/ture).
 */
export function keepUnitsTogether(text: string): string {
  return text.replace(/(\d)\s+(m²|m2|€|EUR|eur)(?=$|[\s,.;:)\-–—])/g, '$1\u00a0$2');
}
