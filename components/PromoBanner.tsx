'use client';

import type { HomeLang } from '../app/lib/homeCopy';
import { REFERENCE_AREA_SQM, PRICE_TIERS, PROMO, displayPerProperty, formatAmount } from '../app/lib/pricing';
import { usePromoActive, usePromoMinutesLeft } from './usePromoActive';

/**
 * Traka uvodne promocije iznad kartica paketa. Datum se proverava na
 * klijentu pri svakom otvaranju strane, pa traka sama nestane kad kampanja
 * istekne - bez ponovnog deploy-a. Uslovi su u PROMO (lib/pricing.ts).
 *
 * Izgled (vlasnik, 28. 9. 2026 - stara traka sa konfetama delovala je
 * staromodno): u potpisu sajta (mreža i svetlo), veliki procenat levo, jedna
 * rečenica sa cenom, odbrojavanje u kockicama (dani · sati, osvežava se u
 * minuti) i dugme ka formi - traka je poziv na akciju, ne samo obaveštenje.
 */

const SR_MONTHS_GENITIVE = [
  'januara', 'februara', 'marta', 'aprila', 'maja', 'juna',
  'jula', 'avgusta', 'septembra', 'oktobra', 'novembra', 'decembra'
];

// 1 dan, 2 dana, 5 dana, 21 dan - isto pravilo kao za "nekretnina".
function srDays(n: number): string {
  return n % 10 === 1 && n % 100 !== 11 ? 'dan' : 'dana';
}

export const PROMO_TEXT = {
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
    terms: `Cene za prostor od oko ${REFERENCE_AREA_SQM} m².`,
    daysLeft: (n: number) => (n <= 0 ? 'Poslednji dan' : `Još ${n} ${srDays(n)}`),
    lead: (promoPrice: string) => `Paket već od ${promoPrice} po nekretnini`,
    sub: (regularPrice: string, date: string) => `umesto ${regularPrice} · važi do ${date} · prostor do oko ${REFERENCE_AREA_SQM} m²`,
    days: (n: number) => srDays(n),
    // 1 sat, 2-4 sata, 5+ sati (ali 11-14 sati).
    hours: (n: number) =>
      n % 10 === 1 && n % 100 !== 11 ? 'sat' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'sata' : 'sati',
    cta: 'Iskoristite popust →',
    countdown: 'Do kraja promocije'
  },
  en: {
    eyebrow: 'Launch promo',
    headline: (percent: number) => `Packages are ${percent}% cheaper`,
    until: (date: string) => `Through ${date}.`,
    example: (promoPrice: string, regularPrice: string) =>
      `Package (tour + HDR photos) already from ${promoPrice} instead of ${regularPrice} per property.`,
    terms: `Prices for a property of about ${REFERENCE_AREA_SQM} m².`,
    daysLeft: (n: number) => (n <= 0 ? 'Last day' : `${n} ${n === 1 ? 'day' : 'days'} left`),
    lead: (promoPrice: string) => `Package from ${promoPrice} per property`,
    sub: (regularPrice: string, date: string) => `instead of ${regularPrice} · through ${date} · properties up to about ${REFERENCE_AREA_SQM} m²`,
    days: (n: number) => (n === 1 ? 'day' : 'days'),
    hours: (n: number) => (n === 1 ? 'hour' : 'hours'),
    cta: 'Claim the discount →',
    countdown: 'Time left'
  }
} as const;

export default function PromoBanner({ lang = 'sr' }: { lang?: HomeLang }) {
  const active = usePromoActive();
  const minutesLeft = usePromoMinutesLeft();
  if (!active) return null;

  const t = PROMO_TEXT[lang];
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

  const days = Math.floor(minutesLeft / 1440);
  const hours = Math.floor((minutesLeft % 1440) / 60);

  return (
    <div className="promo-card">
      <div className="promo-big">
        −{percent}%<small>{t.eyebrow}</small>
      </div>
      <div className="promo-mid">
        <b>{t.lead(promoPrice)}</b>
        <span>{t.sub(regularPrice, endLabel)}</span>
      </div>
      <div
        className="promo-cd"
        role="timer"
        aria-label={`${t.countdown}: ${days} ${t.days(days)}, ${hours} ${t.hours(hours)}`}
      >
        <div>
          <b>{days}</b>
          <small>{t.days(days)}</small>
        </div>
        <div>
          <b>{hours}</b>
          <small>{t.hours(hours)}</small>
        </div>
      </div>
      <a className="promo-cta" href="#kontakt" data-track="cta:promo_banner">
        {t.cta}
      </a>
    </div>
  );
}
