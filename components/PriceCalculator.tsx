'use client';

import { useState } from 'react';
import type { HomeLang } from '../app/lib/homeCopy';
import {
  CALC_MAX_COUNT,
  CUSTOM_OFFER_FROM,
  MAX_AREA_SQM,
  PRICE_TIERS,
  PROMO,
  contactPackageFor,
  isPromoActive,
  perProperty,
  quote,
  tierMax,
  type PackageType
} from '../app/lib/pricing';
import { ESTIMATE_EVENT, type EstimateDetail } from '../app/lib/estimateEvent';

// Srpska množina: 1 nekretnina, 2–4 nekretnine, 5+ nekretnina (11–14 kao 5).
function srProperties(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'nekretnina';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'nekretnine';
  return 'nekretnina';
}

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
  packageBasic: string;
  packagePremium: string;
  resultLabel: string;
  forOne: string;
  totalFor: (per: string) => string;
  saving: (amount: string, percent: number) => string;
  lineTour: (n: number, price: string) => string;
  audio: string;
  audioBasic: string;
  audioPremium: string;
  included: string;
  delivery: string;
  deliveryValue: string;
  next: (needed: number, price: string) => string;
  custom: string;
  areaNote: string;
  promo: (price: string, until: string) => string;
  send: string;
  fine: string;
  messagePrefix: string;
  message: (n: number, pkg: PackageType, total: string, per: string) => string;
};

const TEXT: Record<HomeLang, Text> = {
  sr: {
    title: 'Izračunajte okvirnu cenu',
    sub: 'Što više nekretnina, niža cena po nekretnini. Agencije računaju mesečno.',
    countLabel: 'Koliko nekretnina snimamo',
    countHint: 'agencije: mesečno',
    less: 'Manje nekretnina',
    more: 'Više nekretnina',
    properties: srProperties,
    tiersLabel: 'Cena po nekretnini, sa HDR fotografijama',
    packageTitle: 'Paket',
    packageBasic: 'Osnovni (SR + jezik po izboru)',
    packagePremium: 'Premium (SR/EN/DE/RU)',
    resultLabel: 'Okvirna cena',
    forOne: 'za jednu nekretninu',
    totalFor: (per) => `ukupno · ${per} po nekretnini`,
    saving: (amount, percent) => `Ušteda ${amount} (−${percent}%)`,
    lineTour: (n, price) => `${n} × 360° tura + HDR (${price})`,
    audio: 'Audio vodič',
    audioBasic: 'SR + jezik po izboru',
    audioPremium: 'SR, EN, DE, RU',
    included: 'uključeno',
    delivery: 'Isporuka',
    deliveryValue: 'za 48h',
    next: (needed, price) => `Još ${needed} ${srProperties(needed)} i cena pada na ${price} po nekretnini.`,
    custom: 'Za 10 i više nekretnina mesečno pravimo i poseban predlog.',
    areaNote: `Cena važi za nekretnine do ${MAX_AREA_SQM}m². Za veću kvadraturu javite nam se za poseban dogovor.`,
    promo: (price, until) => `🎉 Promo za Osnovni paket: ${price} do ${until} (nekretnine do ${MAX_AREA_SQM}m²).`,
    send: 'Pošalji upit sa ovim →',
    fine: 'Cena je orijentaciona; tačnu potvrđujemo posle kratkog razgovora.',
    messagePrefix: 'Kalkulator:',
    message: (n, pkg, total, per) =>
      `Kalkulator: ${n} ${srProperties(n)}, paket ${pkg === 'premium' ? 'Premium' : 'Osnovni'} — okvirno ${total} (${per} po nekretnini).`
  },
  en: {
    title: 'Work out an indicative price',
    sub: 'The more properties, the lower the price per property. Agencies count per month.',
    countLabel: 'How many properties',
    countHint: 'agencies: per month',
    less: 'Fewer properties',
    more: 'More properties',
    properties: (n) => (n === 1 ? 'property' : 'properties'),
    tiersLabel: 'Price per property, with HDR photos',
    packageTitle: 'Package',
    packageBasic: 'Basic (SR + language of choice)',
    packagePremium: 'Premium (SR/EN/DE/RU)',
    resultLabel: 'Indicative price',
    forOne: 'for one property',
    totalFor: (per) => `total · ${per} per property`,
    saving: (amount, percent) => `You save ${amount} (−${percent}%)`,
    lineTour: (n, price) => `${n} × 360° tour + HDR (${price})`,
    audio: 'Audio guide',
    audioBasic: 'SR + language of choice',
    audioPremium: 'SR, EN, DE, RU',
    included: 'included',
    delivery: 'Delivery',
    deliveryValue: 'within 48h',
    next: (needed, price) =>
      `${needed} more ${needed === 1 ? 'property' : 'properties'} and the price drops to ${price} per property.`,
    custom: 'For 10 or more properties a month we also put together a custom proposal.',
    areaNote: `Price applies to properties up to ${MAX_AREA_SQM}m². For larger properties, contact us for a custom quote.`,
    promo: (price, until) => `🎉 Launch promo for the Basic package: ${price} until ${until} (properties up to ${MAX_AREA_SQM}m²).`,
    send: 'Send a request with this →',
    fine: 'The price is indicative; we confirm the exact amount after a short call.',
    messagePrefix: 'Calculator:',
    message: (n, pkg, total, per) =>
      `Calculator: ${n} ${n === 1 ? 'property' : 'properties'}, ${pkg === 'premium' ? 'Premium' : 'Basic'} package — approx. ${total} (${per} per property).`
  }
};

const PROMO_LOCALE: Record<HomeLang, string> = { sr: 'sr-RS', en: 'en-GB' };

// Genitiv ("do 1. novembra") - Intl.DateTimeFormat za sr-RS vraća nominativ
// ("1. novembar"), pogrešno posle predloga "do".
const SR_MONTHS_GENITIVE = [
  'januara', 'februara', 'marta', 'aprila', 'maja', 'juna',
  'jula', 'avgusta', 'septembra', 'oktobra', 'novembra', 'decembra'
];

/**
 * Kalkulator okvirne cene ispod paketa na početnoj. Cene i stepeni su u
 * app/lib/pricing.ts; ovde je samo prikaz i prenos izbora u formu za kontakt.
 */
export default function PriceCalculator({ lang = 'sr' }: { lang?: HomeLang }) {
  const t = TEXT[lang];
  const [count, setCount] = useState(1);
  const [packageType, setPackageType] = useState<PackageType>('basic');

  const q = quote(count, packageType);
  // Ručno, a ne Intl: server i pregledač umeju da stave različit razmak uz €,
  // pa se prvi render ne bi poklopio.
  const eur = (n: number) => (lang === 'sr' ? `${n} €` : `€${n}`);

  // Client-only poziv - traje samo dok kampanja traje, ne sme da se
  // "zamrzne" na vrednost iz trenutka build-a/deploy-a (vidi PROMO u pricing.ts).
  const promoActive = isPromoActive();
  const promoEndDate = new Date(`${PROMO.endDate}T00:00:00`);
  // Intl daje nominativ ("1. novembar") - posle "do" treba genitiv
  // ("do 1. novembra"), pa se za sr meseci ispisuju ručno.
  const promoUntil =
    lang === 'sr'
      ? `${promoEndDate.getDate()}. ${SR_MONTHS_GENITIVE[promoEndDate.getMonth()]} ${promoEndDate.getFullYear()}.`
      : promoEndDate.toLocaleDateString(PROMO_LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric' });

  const sendToForm = () => {
    const detail: EstimateDetail = {
      packageValue: contactPackageFor(q.count, packageType),
      message: t.message(q.count, packageType, eur(q.total), eur(q.perProperty)),
      prefix: t.messagePrefix
    };
    window.dispatchEvent(new CustomEvent<EstimateDetail>(ESTIMATE_EVENT, { detail }));
    document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
            {t.promo(eur(PROMO.price), promoUntil)}
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
            <output aria-live="polite">{q.count}</output>
            <button type="button" aria-label={t.more} disabled={count >= CALC_MAX_COUNT} onClick={() => setCount(count + 1)}>
              +
            </button>
            <span className="unit">{t.properties(q.count)}</span>
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
                  aria-pressed={q.tierIndex === i}
                  onClick={() => setCount(tier.min)}
                >
                  <small>{max === null ? `${tier.min}+` : tier.min === max ? tier.min : `${tier.min}–${max}`}</small>
                  <b>{eur(perProperty(tier, packageType))}</b>
                </button>
              );
            })}
          </div>
        </div>

        <label className="switch-row">
          <span>
            <strong>{t.packageTitle}</strong>
            <span>{packageType === 'premium' ? t.packagePremium : t.packageBasic}</span>
          </span>
          <input
            type="checkbox"
            className="switch"
            checked={packageType === 'premium'}
            onChange={(e) => setPackageType(e.target.checked ? 'premium' : 'basic')}
          />
        </label>
      </div>

      <div className="calc-result" aria-live="polite">
        <span className="result-label">{t.resultLabel}</span>
        <div className="result-price">
          <b>{eur(q.total)}</b>
          <span>{q.count === 1 ? t.forOne : t.totalFor(eur(q.perProperty))}</span>
        </div>
        {q.saving > 0 && <span className="saving">{t.saving(eur(q.saving), q.savingPercent)}</span>}

        <ul className="breakdown">
          <li>
            <span>{t.lineTour(q.count, eur(q.perProperty))}</span>
            <span>{eur(q.total)}</span>
          </li>
          <li>
            <span>{t.audio}</span>
            <span>
              {packageType === 'premium' ? t.audioPremium : t.audioBasic} · {t.included}
            </span>
          </li>
          <li>
            <span>{t.delivery}</span>
            <span>{t.deliveryValue}</span>
          </li>
        </ul>

        {q.next && <p className="calc-note">{t.next(q.next.needed, eur(q.next.perProperty))}</p>}
        {q.count >= CUSTOM_OFFER_FROM && <p className="calc-note">{t.custom}</p>}

        <button type="button" className="btn btn-primary" onClick={sendToForm} data-track="cta:calculator_send">
          {t.send}
        </button>
        <p className="calc-fine">{t.fine}</p>
        <p className="calc-fine">{t.areaNote}</p>
      </div>
    </div>
  );
}
