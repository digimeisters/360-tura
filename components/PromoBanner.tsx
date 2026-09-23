'use client';

import type { HomeLang } from '../app/lib/homeCopy';
import { REFERENCE_AREA_SQM, PRICE_TIERS, PROMO, displayPerProperty, formatAmount } from '../app/lib/pricing';
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
    eyebrow: 'Uvodna promocija',
    headline: (percent: number) => `Paketi su jeftiniji za ${percent}%`,
    until: (date: string) => `Važi do ${date}.`,
    // "Paket", ne "tura" - iznos je tura + HDR fotografije zajedno.
    // Samostalne fotografije (bez ture) u popust ne idu - vidi
    // standaloneHdrPrice u lib/pricing.ts. Cena ne sme da stoji na kraju
    // rečenice: "din." već nosi tačku, pa bi ispalo "din..".
    example: (promoPrice: string, regularPrice: string) =>
      `Paket (tura + HDR fotografije) već od ${promoPrice} umesto ${regularPrice} po nekretnini.`,
    terms: `Cene za stan od oko ${REFERENCE_AREA_SQM}m².`,
    daysLeft: (n: number) => (n <= 0 ? 'Poslednji dan' : `Još ${n} ${srDays(n)}`)
  },
  en: {
    eyebrow: 'Launch promo',
    headline: (percent: number) => `Packages are ${percent}% cheaper`,
    until: (date: string) => `Through ${date}.`,
    example: (promoPrice: string, regularPrice: string) =>
      `Package (tour + HDR photos) already from ${promoPrice} instead of ${regularPrice} per property.`,
    terms: `Prices for a flat of about ${REFERENCE_AREA_SQM}m².`,
    daysLeft: (n: number) => (n <= 0 ? 'Last day' : `${n} ${n === 1 ? 'day' : 'days'} left`)
  }
} as const;

export default function PromoBanner({ lang = 'sr' }: { lang?: HomeLang }) {
  const active = usePromoActive();
  const daysLeft = usePromoDaysLeft();
  if (!active) return null;

  const t = TEXT[lang];
  const entryTier = PRICE_TIERS[0];
  // Ulazna cena Osnovnog paketa (1-2 nekretnine) - najniža koju posetilac
  // može da vidi, pa stoji uz "od".
  const promoPrice = formatAmount(displayPerProperty(entryTier, 'basic', lang, true), lang);
  const regularPrice = formatAmount(displayPerProperty(entryTier, 'basic', lang), lang);
  const percent = Math.round(PROMO.discount * 100);

  const end = new Date(`${PROMO.endDate}T23:59:59`);
  const endLabel =
    lang === 'sr'
      ? `${end.getDate()}. ${SR_MONTHS_GENITIVE[end.getMonth()]}`
      : end.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

  return (
    <div className="promo-strip">
      <span className="promo-icon" aria-hidden="true">🎉</span>
      <div className="promo-body">
        <span className="promo-eyebrow">{t.eyebrow}</span>
        <b className="promo-headline">{t.headline(percent)}</b>
        <span className="promo-note">
          {t.until(endLabel)} {t.example(promoPrice, regularPrice)} {t.terms}
        </span>
      </div>
      <span className="promo-days">{t.daysLeft(daysLeft)}</span>
    </div>
  );
}
