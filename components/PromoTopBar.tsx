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
 */
export default function PromoTopBar({ lang = 'sr', href }: { lang?: HomeLang; href: string }) {
  const active = usePromoActive();
  const daysLeft = usePromoDaysLeft();
  if (!active) return null;

  const t = PROMO_TEXT[lang];
  const percent = Math.round(PROMO.discount * 100);

  return (
    <a className="promo-top" href={href} data-track="cta:promo_top">
      <b>{t.eyebrow}:</b> {t.headline(percent)} <span aria-hidden="true">·</span> {t.daysLeft(daysLeft)}
    </a>
  );
}
