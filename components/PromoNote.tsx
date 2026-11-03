'use client';

import { PROMO } from '../app/lib/pricing';
import { usePromoActive } from './usePromoActive';

/**
 * Jedan red o promociji ispod naslova na /cenovnik (vlasnik, 3. 11. 2026:
 * strana je popust pokazivala četiri puta - traka, baner sa odbrojavanjem,
 * nalepnice i precrtane cene). Ovaj red umesto banera; posle kraja promocije
 * nestaje sam (usePromoActive proverava datum na klijentu).
 */
export default function PromoNote() {
  const active = usePromoActive();
  if (!active) return null;
  const [, month, day] = PROMO.endDate.split('-').map(Number);
  return (
    <p className="promo-note">
      Uvodna cena: −{Math.round(PROMO.discount * 100)}% do {day}. {month}.
    </p>
  );
}
