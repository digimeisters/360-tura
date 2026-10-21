'use client';

import type { HomeLang } from '../app/lib/homeCopy';
import { PROMO } from '../app/lib/pricing';
import { PROMO_TEXT } from './PromoBanner';
import { usePromoActive, usePromoDaysLeft } from './usePromoActive';

/**
 * Klijentski deo PromoTopBar-a. Kreće od onoga što je server video
 * (serverActive / serverDaysLeft), pa traka stoji već u HTML-u i ne gura
 * sadržaj ispod sebe posle hidracije. Datum se zatim proverava na klijentu
 * (usePromoActive), pa traka sama nestane kad kampanja istekne i na strani
 * poslužen iz keša.
 */
export default function PromoTopBarClient({
  lang,
  href,
  serverActive,
  serverDaysLeft
}: {
  lang: HomeLang;
  href: string;
  serverActive: boolean;
  serverDaysLeft: number;
}) {
  const active = usePromoActive(serverActive);
  const daysLeft = usePromoDaysLeft(serverDaysLeft);
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
