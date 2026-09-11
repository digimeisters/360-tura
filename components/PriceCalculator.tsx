'use client';

import { useState } from 'react';
import type { HomeLang } from '../app/lib/homeCopy';
import {
  CALC_MAX_COUNT,
  CUSTOM_OFFER_FROM,
  PRICE_TIERS,
  contactPackageFor,
  perProperty,
  quote,
  tierMax
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
  hdrTitle: string;
  hdrHint: (price: string) => string;
  resultLabel: string;
  forOne: string;
  totalFor: (per: string) => string;
  saving: (amount: string, percent: number) => string;
  lineTour: (n: number, price: string) => string;
  lineHdr: (n: number, price: string) => string;
  audio: string;
  included: string;
  delivery: string;
  deliveryValue: string;
  next: (needed: number, price: string) => string;
  custom: string;
  send: string;
  fine: string;
  messagePrefix: string;
  message: (n: number, withHdr: boolean, total: string, per: string) => string;
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
    hdrTitle: 'HDR fotografije za oglas',
    hdrHint: (price) => `+${price} po nekretnini`,
    resultLabel: 'Okvirna cena',
    forOne: 'za jednu nekretninu',
    totalFor: (per) => `ukupno · ${per} po nekretnini`,
    saving: (amount, percent) => `Ušteda ${amount} (−${percent}%)`,
    lineTour: (n, price) => `${n} × 360° tura (${price})`,
    lineHdr: (n, price) => `${n} × HDR fotografije (${price})`,
    audio: 'Audio vodič',
    included: 'uključeno',
    delivery: 'Isporuka',
    deliveryValue: 'za 48h',
    next: (needed, price) => `Još ${needed} ${srProperties(needed)} i cena pada na ${price} po nekretnini.`,
    custom: 'Za 10 i više nekretnina mesečno pravimo i poseban predlog.',
    send: 'Pošalji upit sa ovim →',
    fine: 'Cena je orijentaciona; tačnu potvrđujemo posle kratkog razgovora.',
    messagePrefix: 'Kalkulator:',
    message: (n, withHdr, total, per) =>
      `Kalkulator: ${n} ${srProperties(n)}, ${withHdr ? 'sa HDR fotografijama' : 'bez HDR fotografija'} — okvirno ${total} (${per} po nekretnini).`
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
    hdrTitle: 'HDR photos for the listing',
    hdrHint: (price) => `+${price} per property`,
    resultLabel: 'Indicative price',
    forOne: 'for one property',
    totalFor: (per) => `total · ${per} per property`,
    saving: (amount, percent) => `You save ${amount} (−${percent}%)`,
    lineTour: (n, price) => `${n} × 360° tour (${price})`,
    lineHdr: (n, price) => `${n} × HDR photos (${price})`,
    audio: 'Audio guide',
    included: 'included',
    delivery: 'Delivery',
    deliveryValue: 'within 48h',
    next: (needed, price) =>
      `${needed} more ${needed === 1 ? 'property' : 'properties'} and the price drops to ${price} per property.`,
    custom: 'For 10 or more properties a month we also put together a custom proposal.',
    send: 'Send a request with this →',
    fine: 'The price is indicative; we confirm the exact amount after a short call.',
    messagePrefix: 'Calculator:',
    message: (n, withHdr, total, per) =>
      `Calculator: ${n} ${n === 1 ? 'property' : 'properties'}, ${withHdr ? 'with HDR photos' : 'without HDR photos'} — approx. ${total} (${per} per property).`
  }
};

/**
 * Kalkulator okvirne cene ispod paketa na početnoj. Cene i stepeni su u
 * app/lib/pricing.ts; ovde je samo prikaz i prenos izbora u formu za kontakt.
 */
export default function PriceCalculator({ lang = 'sr' }: { lang?: HomeLang }) {
  const t = TEXT[lang];
  const [count, setCount] = useState(1);
  const [withHdr, setWithHdr] = useState(true);

  const q = quote(count, withHdr);
  // Ručno, a ne Intl: server i pregledač umeju da stave različit razmak uz €,
  // pa se prvi render ne bi poklopio.
  const eur = (n: number) => (lang === 'sr' ? `${n} €` : `€${n}`);

  const sendToForm = () => {
    const detail: EstimateDetail = {
      packageValue: contactPackageFor(q.count),
      message: t.message(q.count, withHdr, eur(q.total), eur(q.perProperty)),
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
                  <b>{eur(perProperty(tier, true))}</b>
                </button>
              );
            })}
          </div>
        </div>

        <label className="switch-row">
          <span>
            <strong>{t.hdrTitle}</strong>
            <span>{t.hdrHint(eur(q.tier.hdr))}</span>
          </span>
          <input type="checkbox" className="switch" checked={withHdr} onChange={(e) => setWithHdr(e.target.checked)} />
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
            <span>{t.lineTour(q.count, eur(q.tier.tour))}</span>
            <span>{eur(q.count * q.tier.tour)}</span>
          </li>
          {withHdr && (
            <li>
              <span>{t.lineHdr(q.count, eur(q.tier.hdr))}</span>
              <span>{eur(q.count * q.tier.hdr)}</span>
            </li>
          )}
          <li>
            <span>{t.audio}</span>
            <span>
              {q.tier.languages.join(' · ')} · {t.included}
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
      </div>
    </div>
  );
}
