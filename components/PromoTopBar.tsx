'use client';

import type { HomeLang } from '../app/lib/homeCopy';
import { PROMO } from '../app/lib/pricing';
import { PROMO_TEXT } from './PromoBanner';
import { usePromoActive, usePromoDaysLeft } from './usePromoActive';

/**
 * Tanka traka iznad menija dok traje promocija: isti tekst kao velika traka
 * u cenovniku (PromoBanner), skraćen na naslov i broj preostalih dana.
 * Klik vodi do cenovnika. Datum se proverava na klijentu (usePromoActive),
 * pa traka sama nestane kad kampanja istekne.
 *
 * Na telefonu ide kraći tekst u jednom redu ("Uvodna promocija −30% · Još 32
 * dana") - pun se lomio tako da "32 dana" ostane samo u drugom redu.
 * Broj dana je uvek vezan za reč "dana" (nowrap).
 */
export default function PromoTopBar({ lang = 'sr', href }: { lang?: HomeLang; href: string }) {
  const active = usePromoActive();
  const daysLeft = usePromoDaysLeft();
  if (!active) return null;

  const t = PROMO_TEXT[lang];
  const percent = Math.round(PROMO.discount * 100);

  return (
    <a className="promo-top" href={href} data-track="cta:promo_top">
      <span className="promo-top-long"><b>{t.eyebrow}:</b> {t.headline(percent)}</span>
      <span className="promo-top-short"><b>{t.eyebrow}</b> −{percent}%</span>
      {' '}<span aria-hidden="true">·</span>{' '}
      <span className="promo-top-days">{t.daysLeft(daysLeft)}</span>
    </a>
  );
}
