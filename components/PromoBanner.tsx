'use client';

import type { HomeLang } from '../app/lib/homeCopy';
import { REFERENCE_AREA_SQM, PRICE_TIERS, PROMO, perProperty } from '../app/lib/pricing';
import { usePromoActive, usePromoDaysLeft } from './usePromoActive';

/**
 * Traka uvodne promocije iznad kartica paketa. Datum se proverava na
 * klijentu pri svakom otvaranju strane, pa traka sama nestane kad kampanja
 * istekne - bez ponovnog deploy-a. Uslovi su u PROMO (lib/pricing.ts).
 */

const SR_MONTHS_GENITIVE = [
  'januara', 'februara', 'marta', 'aprila', 'maja', 'juna',
  'jula', 'avgusta', 'septembra', 'oktobra', 'novembra', 'decembra'
];

// 1 dan, 2 dana, 5 dana, 21 dan - isto pravilo kao za "nekretnina".
function srDays(n: number): string {
  return n % 10 === 1 && n % 100 !== 11 ? 'dan' : 'dana';
}

const TEXT = {
  sr: {
    headline: (percent: number, promoPrice: string, regularPrice: string) =>
      `Uvodna promocija: −${percent}% na sve pakete — tura od ${promoPrice} umesto ${regularPrice}`,
    terms: `Cene za stan od oko ${REFERENCE_AREA_SQM}m².`,
    until: (date: string) => `do ${date}`,
    daysLeft: (n: number) => (n <= 0 ? 'poslednji dan' : `još ${n} ${srDays(n)}`)
  },
  en: {
    headline: (percent: number, promoPrice: string, regularPrice: string) =>
      `Launch promo: −${percent}% on every package — tours from ${promoPrice} instead of ${regularPrice}`,
    terms: `Prices for a flat of about ${REFERENCE_AREA_SQM}m².`,
    until: (date: string) => `until ${date}`,
    daysLeft: (n: number) => (n <= 0 ? 'last day' : `${n} ${n === 1 ? 'day' : 'days'} left`)
  }
} as const;

export default function PromoBanner({ lang = 'sr' }: { lang?: HomeLang }) {
  const active = usePromoActive();
  const daysLeft = usePromoDaysLeft();
  if (!active) return null;

  const t = TEXT[lang];
  const entryTier = PRICE_TIERS[0];
  // Nelomivi razmak: "50 €" ne sme da se prelomi na kraju reda.
  const eur = (n: number) => (lang === 'sr' ? `${n} €` : `€${n}`);

  // Ulazna cena Osnovnog paketa (1-2 nekretnine) - najniža koju posetilac
  // može da vidi, pa stoji uz "od".
  const promoPrice = eur(perProperty(entryTier, 'basic', true));
  const regularPrice = eur(perProperty(entryTier, 'basic'));
  const percent = Math.round(PROMO.discount * 100);

  const end = new Date(`${PROMO.endDate}T23:59:59`);
  const endLabel =
    lang === 'sr'
      ? `${end.getDate()}. ${SR_MONTHS_GENITIVE[end.getMonth()]}`
      : end.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

  return (
    <div className="promo-strip">
      <b>{t.headline(percent, promoPrice, regularPrice)}</b>
      <span>
        {t.until(endLabel)} · {t.terms}
      </span>
      <span className="promo-days">{t.daysLeft(daysLeft)}</span>
    </div>
  );
}
