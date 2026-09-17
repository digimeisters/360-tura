'use client';

import { useState } from 'react';
import type { HomeLang } from '../app/lib/homeCopy';
import {
  CALC_MAX_COUNT,
  PREMIUM_EXTRA,
  PRICE_TIERS,
  PROMO,
  perProperty,
  tierIndexFor,
  tierMax,
  type PackageType
} from '../app/lib/pricing';
import { usePromoActive } from './usePromoActive';

// Srpska množina: 1 nekretnina, 2–4 nekretnine, 5+ nekretnina (11–14 kao 5).
function srProperties(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'nekretnina';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'nekretnine';
  return 'nekretnina';
}

const SR_MONTHS_GENITIVE = [
  'januara', 'februara', 'marta', 'aprila', 'maja', 'juna',
  'jula', 'avgusta', 'septembra', 'oktobra', 'novembra', 'decembra'
];

type Text = {
  title: string;
  sub: string;
  countLabel: string;
  countHint: string;
  less: string;
  more: string;
  properties: (n: number) => string;
  tiersLabel: string;
  packageTitle: string;
  basicName: string;
  basicDesc: string;
  premiumName: string;
  premiumDesc: (extra: string) => string;
  promo: (percent: number, until: string) => string;
};

const TEXT: Record<HomeLang, Text> = {
  sr: {
    title: 'Cena po broju nekretnina',
    sub: 'Što više nekretnina snimamo mesečno, niža je cena po jednoj.',
    countLabel: 'Koliko nekretnina snimamo',
    countHint: 'agencije: mesečno',
    less: 'Manje nekretnina',
    more: 'Više nekretnina',
    properties: srProperties,
    tiersLabel: 'Cena po nekretnini (tura + HDR fotografije)',
    packageTitle: 'Paket',
    basicName: 'Osnovni',
    basicDesc: 'SR + jedan jezik po izboru (EN, DE ili RU)',
    premiumName: 'Premium',
    premiumDesc: (extra) => `Sva 4 jezika + izrada plana stana · +${extra} po turi`,
    // HDR fotografije ne idu u popust (vidi hdrPrice u lib/pricing.ts) -
    // "cena ture" mora ostati precizno, ne "sve cene".
    promo: (percent, until) => `🎉 Uvodna promocija: cena ture je niža za ${percent}%, u oba paketa — do ${until}`
  },
  en: {
    title: 'Price by number of properties',
    sub: 'The more properties, the lower the price per property. Agencies count per month.',
    countLabel: 'How many properties',
    countHint: 'agencies: per month',
    less: 'Fewer properties',
    more: 'More properties',
    properties: (n) => (n === 1 ? 'property' : 'properties'),
    tiersLabel: 'Price per property (tour + HDR photos)',
    packageTitle: 'Package',
    basicName: 'Basic',
    basicDesc: 'SR + one language of your choice (EN, DE or RU)',
    premiumName: 'Premium',
    premiumDesc: (extra) => `All 4 languages + floor plan drawing · +${extra} per tour`,
    promo: (percent, until) => `🎉 Launch promo until ${until}: the tour price is ${percent}% lower, in both packages.`
  }
};

/**
 * Cenovnik ispod kartica paketa: posetilac bira obim i paket, a stepeni
 * odmah pokazuju cenu po nekretnini. Cene, stepeni i uslovi promocije su u
 * app/lib/pricing.ts; ovde je samo prikaz.
 */
export default function PriceCalculator({ lang = 'sr' }: { lang?: HomeLang }) {
  const t = TEXT[lang];
  const [count, setCount] = useState(1);
  const [packageType, setPackageType] = useState<PackageType>('basic');

  const promoActive = usePromoActive();
  const activeTier = tierIndexFor(count);

  // Ručno, a ne Intl: server i pregledač umeju da stave različit razmak uz €,
  // pa se prvi render ne bi poklopio. Razmak je nelomivi ( ), da se iznos
  // nikad ne prelomi na kraju reda.
  const eur = (n: number) => (lang === 'sr' ? `${n} €` : `€${n}`);

  const promoEnd = new Date(`${PROMO.endDate}T00:00:00`);
  // Intl daje nominativ ("1. novembar") - posle "do" treba genitiv.
  const promoUntil =
    lang === 'sr'
      ? `${promoEnd.getDate()}. ${SR_MONTHS_GENITIVE[promoEnd.getMonth()]} ${promoEnd.getFullYear()}.`
      : promoEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="card calc" id="kalkulator">
      <div className="calc-inputs">
        <div>
          <h3>{t.title}</h3>
          <p className="calc-sub">{t.sub}</p>
        </div>

        {promoActive && (
          <p
            className="calc-note"
            style={{ borderStyle: 'solid', borderColor: 'var(--accent)', color: 'var(--accent)', fontWeight: 700 }}
          >
            {t.promo(Math.round(PROMO.discount * 100), promoUntil)}
          </p>
        )}

        <div>
          <div className="ctl-label">
            <span>{t.countLabel}</span>
            <span className="ctl-hint">{t.countHint}</span>
          </div>
          <div className="stepper">
            <button type="button" aria-label={t.less} disabled={count <= 1} onClick={() => setCount(count - 1)}>
              −
            </button>
            <output aria-live="polite">{count}</output>
            <button type="button" aria-label={t.more} disabled={count >= CALC_MAX_COUNT} onClick={() => setCount(count + 1)}>
              +
            </button>
            <span className="unit">{t.properties(count)}</span>
          </div>
        </div>

        <div>
          <div className="ctl-label">
            <span>{t.tiersLabel}</span>
          </div>
          <div className="tiers" role="group" aria-label={t.tiersLabel}>
            {PRICE_TIERS.map((tier, i) => {
              const max = tierMax(i);
              return (
                <button
                  key={tier.min}
                  type="button"
                  className="tier"
                  aria-pressed={activeTier === i}
                  onClick={() => setCount(tier.min)}
                >
                  <small>{max === null ? `${tier.min}+` : tier.min === max ? tier.min : `${tier.min}–${max}`}</small>
                  <b>{eur(perProperty(tier, packageType, promoActive))}</b>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="ctl-label">
            <span>{t.packageTitle}</span>
          </div>
          <div className="pkg-choice" role="group" aria-label={t.packageTitle}>
            <button
              type="button"
              aria-pressed={packageType === 'basic'}
              onClick={() => setPackageType('basic')}
            >
              <b>{t.basicName}</b>
              <small>{t.basicDesc}</small>
            </button>
            <button
              type="button"
              aria-pressed={packageType === 'premium'}
              onClick={() => setPackageType('premium')}
            >
              <b>{t.premiumName}</b>
              <small>{t.premiumDesc(eur(PREMIUM_EXTRA))}</small>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
