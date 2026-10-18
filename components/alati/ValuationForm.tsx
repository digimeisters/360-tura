'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { OTHER_NEIGHBOURHOOD, neighbourhoodsFor } from '../../app/lib/propertyTaxonomy';
import type {
  EstimateRequestBody,
  EstimateResponse,
  EstimateResult,
  ValuationCondition,
  ValuationFurnishing,
  ValuationListingType,
  ValuationPropertyType,
  ValuationSource
} from '../../app/lib/valuation/types';

/**
 * Procena vrednosti (/alati/procena-vrednosti): forma levo, rezultat desno -
 * isti raspored i elementi kao kalkulator kredita (toolsStyles). Za razliku
 * od njega, raspon se računa na serveru (/api/valuation/estimate) i prikazuje
 * tek posle kontakta - to je lead za vlasnika, pa je tok u dva koraka:
 *   1. nekretnina (prodaja/izdavanje, naselje, tip, kvadratura)
 *   2. stanje i dodaci + kontakt
 *
 * ?tip=izdavanje u adresi bira izdavanje unapred (čita ga strana na serveru).
 */

const DEFAULT_CITY = 'Kragujevac';
const MIN_SQM = 10;
const MAX_SQM = 5000;
// Od ovog sprata lift menja procenu (vidi floorMultiplier), pa se tek tada pita.
const ELEVATOR_FROM_FLOOR = 7;

const TYPE_OPTIONS: { value: ValuationPropertyType; label: string }[] = [
  { value: 'apartment', label: 'Stan' },
  { value: 'house', label: 'Kuća' },
  { value: 'commercial', label: 'Poslovni prostor' }
];

const CONDITION_OPTIONS: { value: ValuationCondition; label: string }[] = [
  { value: 'needs_renovation', label: 'Za renoviranje' },
  { value: 'maintained', label: 'Održavano' },
  { value: 'renovated', label: 'Renovirano' },
  { value: 'new_build', label: 'Novogradnja' }
];

const FURNISHING_OPTIONS: { value: ValuationFurnishing; label: string }[] = [
  { value: 'furnished', label: 'Namešteno' },
  { value: 'semi_furnished', label: 'Polunamešteno' },
  { value: 'unfurnished', label: 'Prazno' }
];

/** Tekstovi rezultata koji zavise od toga da li se prodaje ili izdaje. */
const RESULT_COPY: Record<
  ValuationListingType,
  { label: string; suffix: string; pending: string; ctaTitle: string; ctaText: string; upsell: string }
> = {
  sale: {
    label: 'Procenjena prodajna cena',
    suffix: '',
    pending: 'Procenu šaljemo u roku od 24h',
    ctaTitle: 'Tačna procena i plan prodaje — besplatno',
    ctaText: 'Za tačnu procenu i analizu kako da nekretninu prodate po vrhu raspona, javljamo vam se u roku od 24h.',
    upsell: 'Nekretnine sa 360° turom privlače ozbiljnije kupce i prodaju se brže.'
  },
  rent: {
    label: 'Procenjena kirija',
    suffix: 'mesečno',
    pending: 'Procenu kirije šaljemo u roku od 24h',
    ctaTitle: 'Tačna kirija i plan izdavanja — besplatno',
    ctaText: 'Za tačniju procenu i savet kako da nekretninu izdate brže i po vrhu raspona, javljamo vam se u roku od 24h.',
    upsell: 'Sa 360° turom zakupci pregledaju stan pre poziva — na razgledanje dolaze samo zainteresovani.'
  }
};

type FormState = {
  listingType: ValuationListingType;
  furnishing: ValuationFurnishing | '';
  city: string;
  neighborhoodChoice: string;
  neighborhoodOther: string;
  propertyType: ValuationPropertyType | '';
  sqm: string;
  rooms: string;
  floorNumber: string;
  hasElevator: boolean | null;
  buildYear: string;
  condition: ValuationCondition | '';
  hasParking: boolean | null;
  hasTerrace: boolean | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
};

const INITIAL: FormState = {
  listingType: 'sale',
  furnishing: '',
  city: DEFAULT_CITY,
  neighborhoodChoice: '',
  neighborhoodOther: '',
  propertyType: '',
  sqm: '',
  rooms: '',
  floorNumber: '',
  hasElevator: null,
  buildYear: '',
  condition: '',
  hasParking: null,
  hasTerrace: null,
  contactName: '',
  contactPhone: '',
  contactEmail: ''
};

/** utm_source -> kanal koji API prihvata; sve nepoznato je "referral", prazno "organic". */
function sourceFromUtm(utmSource: string | null): ValuationSource {
  const s = (utmSource || '').toLowerCase();
  if (!s) return 'organic';
  if (s.includes('google')) return 'google_ads';
  if (s.includes('facebook') || s === 'fb' || s.includes('instagram') || s === 'ig' || s === 'meta') return 'facebook';
  return 'referral';
}

function formatEur(value: number): string {
  return `${value.toLocaleString('sr-RS')} €`;
}

function toNumber(value: string): number | undefined {
  const n = Number(value.replace(',', '.'));
  return value.trim() !== '' && Number.isFinite(n) ? n : undefined;
}

/** Da/Ne kao u kalkulatoru kredita; null = još nije odgovoreno (računa se kao "ne"). */
function YesNo({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="tl-q">
      <span>{label}</span>
      <span className="tl-yn">
        <button type="button" aria-pressed={value === true} onClick={() => onChange(true)}>
          Da
        </button>
        <button type="button" aria-pressed={value === false} onClick={() => onChange(false)}>
          Ne
        </button>
      </span>
    </div>
  );
}

export default function ValuationForm({
  demoTourHref,
  initialListingType,
  initialNeighborhood = '',
  initialPropertyType = '',
  initialCondition = ''
}: {
  demoTourHref: string;
  initialListingType: ValuationListingType;
  /** Naselje izabrano unapred (?naselje= - dolazi sa strane cena po naseljima); mora biti sa liste. */
  initialNeighborhood?: string;
  initialPropertyType?: ValuationPropertyType | '';
  /** ?stanje=novogradnja sa strane cena (prekidač Novogradnja). */
  initialCondition?: ValuationCondition | '';
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<FormState>({
    ...INITIAL,
    listingType: initialListingType,
    neighborhoodChoice: neighbourhoodsFor(INITIAL.city).includes(initialNeighborhood) ? initialNeighborhood : '',
    propertyType: initialPropertyType,
    condition: initialCondition
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ estimate: EstimateResult | null; listingType: ValuationListingType } | null>(null);

  const isRent = form.listingType === 'rent';
  const neighbourhoods = neighbourhoodsFor(form.city);
  const hasList = neighbourhoods.length > 0;
  const neighborhood =
    hasList && form.neighborhoodChoice !== OTHER_NEIGHBOURHOOD ? form.neighborhoodChoice : form.neighborhoodOther.trim();
  const isApartment = form.propertyType === 'apartment';
  const floor = toNumber(form.floorNumber);
  const askElevator = isApartment && floor !== undefined && floor >= ELEVATOR_FROM_FLOOR;
  const typeLabel = TYPE_OPTIONS.find((o) => o.value === form.propertyType)?.label ?? '';

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep1(): string {
    if (!form.city.trim()) return 'Upišite grad ili opštinu.';
    if (!neighborhood) return 'Izaberite ili upišite naselje.';
    if (!form.propertyType) return 'Izaberite tip nekretnine.';
    const sqm = toNumber(form.sqm);
    if (sqm === undefined || sqm < MIN_SQM || sqm > MAX_SQM) return `Kvadratura mora biti između ${MIN_SQM} i ${MAX_SQM} m².`;
    return '';
  }

  function validateStep2(): string {
    if (!form.condition) return 'Izaberite stanje nekretnine.';
    if (isRent && !form.furnishing) return 'Izaberite da li je nekretnina nameštena.';
    if (!form.contactName.trim()) return 'Upišite ime i prezime.';
    const digits = form.contactPhone.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return 'Upišite ispravan broj telefona.';
    return '';
  }

  function goNext(e: FormEvent) {
    e.preventDefault();
    const message = validateStep1();
    setError(message);
    if (!message) setStep(2);
  }

  function startOver() {
    setResult(null);
    setError('');
    setStep(1);
    // Kontakt ostaje upisan - druga procena istog vlasnika ne traži ponovno kucanje.
    setForm((prev) => ({ ...INITIAL, listingType: prev.listingType, contactName: prev.contactName, contactPhone: prev.contactPhone, contactEmail: prev.contactEmail }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const message = validateStep2();
    setError(message);
    if (message || !form.propertyType || !form.condition) return;

    const params = new URLSearchParams(window.location.search);
    const body: EstimateRequestBody = {
      listingType: form.listingType,
      furnishing: isRent && form.furnishing ? form.furnishing : undefined,
      city: form.city.trim(),
      neighborhood,
      propertyType: form.propertyType,
      sqm: toNumber(form.sqm) ?? 0,
      rooms: toNumber(form.rooms),
      floorNumber: isApartment ? floor : undefined,
      hasElevator: askElevator ? form.hasElevator === true : undefined,
      buildYear: toNumber(form.buildYear),
      condition: form.condition,
      hasParking: form.hasParking === true,
      hasTerrace: form.hasTerrace === true,
      contactName: form.contactName.trim(),
      contactPhone: form.contactPhone.trim(),
      contactEmail: form.contactEmail.trim() || undefined,
      source: sourceFromUtm(params.get('utm_source')),
      utmCampaign: params.get('utm_campaign') || undefined
    };

    setSubmitting(true);
    try {
      const res = await fetch('/api/valuation/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = (await res.json().catch(() => null)) as EstimateResponse | null;
      if (!data) {
        setError(`Server trenutno ne odgovara (${res.status}). Pokušajte ponovo za minut.`);
        return;
      }
      if (!data.success) {
        setError(data.error);
        return;
      }
      setResult({ estimate: data.estimate, listingType: form.listingType });
      // Na telefonu je rezultat ispod forme - skrol do njega.
      document.getElementById('procena-rezultat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      setError('Veza nije uspela. Proverite internet i pokušajte ponovo.');
    } finally {
      setSubmitting(false);
    }
  }

  const copy = RESULT_COPY[result?.listingType ?? form.listingType];
  const locked = result === null;

  return (
    <section className="tl-calc" aria-label="Procena vrednosti nekretnine">
      <div className="tl-card">
        {result ? (
          <div className="tl-sec">
            <h2>
              <i>✓</i>Zahtev je poslat
            </h2>
            <p className="vl-sent">
              {typeLabel}, {neighborhood}, {form.sqm} m² — {isRent ? 'izdavanje' : 'prodaja'}. Rezultat je desno
              {' '}(na telefonu ispod). Javljamo vam se na {form.contactPhone}.
            </p>
            <button type="button" className="tl-btn is-line vl-again" onClick={startOver} data-track="cta:valuation_again">
              Procenite drugu nekretninu
            </button>
          </div>
        ) : step === 1 ? (
          <form onSubmit={goNext} noValidate>
            <div className="tl-sec">
              <h2>
                <i aria-hidden="true">1</i> Nekretnina
              </h2>
              <div className="tl-tabs" role="tablist" aria-label="Šta procenjujete">
                <button type="button" role="tab" aria-selected={!isRent} onClick={() => set('listingType', 'sale')}>
                  Prodajem
                </button>
                <button type="button" role="tab" aria-selected={isRent} onClick={() => set('listingType', 'rent')}>
                  Izdajem
                </button>
              </div>

              <div className="tl-row2">
                <label className="tl-field">
                  <span>Grad / opština</span>
                  <span className="tl-num">
                    <input
                      value={form.city}
                      onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value, neighborhoodChoice: '' }))}
                      autoComplete="address-level2"
                      maxLength={80}
                    />
                  </span>
                </label>
                {hasList ? (
                  <label className="tl-field">
                    <span>Naselje</span>
                    <span className="tl-num">
                      <select value={form.neighborhoodChoice} onChange={(e) => set('neighborhoodChoice', e.target.value)}>
                        <option value="">Izaberite…</option>
                        {neighbourhoods.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                        <option value={OTHER_NEIGHBOURHOOD}>Drugo / okolina</option>
                      </select>
                    </span>
                  </label>
                ) : (
                  <label className="tl-field">
                    <span>Naselje</span>
                    <span className="tl-num">
                      <input value={form.neighborhoodOther} onChange={(e) => set('neighborhoodOther', e.target.value)} maxLength={120} />
                    </span>
                  </label>
                )}
              </div>
              {hasList && form.neighborhoodChoice === OTHER_NEIGHBOURHOOD && (
                <label className="tl-field">
                  <span>
                    Upišite naselje <small>računa se prosek grada</small>
                  </span>
                  <span className="tl-num">
                    <input value={form.neighborhoodOther} onChange={(e) => set('neighborhoodOther', e.target.value)} maxLength={120} />
                  </span>
                </label>
              )}

              <div className="tl-field">
                <span>Tip nekretnine</span>
                <div className="tl-chips">
                  {TYPE_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" aria-pressed={form.propertyType === opt.value} onClick={() => set('propertyType', opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="tl-row2">
                <label className="tl-field">
                  <span>Kvadratura</span>
                  <span className="tl-num">
                    <input inputMode="decimal" value={form.sqm} onChange={(e) => set('sqm', e.target.value)} placeholder="npr. 62" />
                    <span>m²</span>
                  </span>
                </label>
                <label className="tl-field">
                  <span>
                    Broj soba <small>opciono</small>
                  </span>
                  <span className="tl-num">
                    <input inputMode="decimal" value={form.rooms} onChange={(e) => set('rooms', e.target.value)} placeholder="npr. 2,5" />
                  </span>
                </label>
              </div>
            </div>

            {error && (
              <p className="vl-error" role="alert">
                {error}
              </p>
            )}
            <div className="tl-btns">
              <button type="submit" className="tl-btn is-dark">
                Dalje: stanje i kontakt →
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={submit} noValidate>
            <p className="vl-summary">
              <span>
                <b>{isRent ? 'Izdajem' : 'Prodajem'}:</b> {typeLabel}, {neighborhood}, {form.sqm} m²
              </span>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setStep(1);
                }}
              >
                Izmeni
              </button>
            </p>

            <div className="tl-sec">
              <h2>
                <i aria-hidden="true">2</i> Stanje i dodaci
              </h2>
              <div className="tl-field">
                <span>Stanje nekretnine</span>
                <div className="tl-chips">
                  {CONDITION_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" aria-pressed={form.condition === opt.value} onClick={() => set('condition', opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {isRent && (
                <div className="tl-field">
                  <span>Nameštenost</span>
                  <div className="tl-chips">
                    {FURNISHING_OPTIONS.map((opt) => (
                      <button key={opt.value} type="button" aria-pressed={form.furnishing === opt.value} onClick={() => set('furnishing', opt.value)}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="tl-row2">
                {isApartment && (
                  <label className="tl-field">
                    <span>
                      Sprat <small>0 = prizemlje</small>
                    </span>
                    <span className="tl-num">
                      <input inputMode="numeric" value={form.floorNumber} onChange={(e) => set('floorNumber', e.target.value)} placeholder="npr. 3" />
                    </span>
                  </label>
                )}
                <label className="tl-field">
                  <span>
                    Godina izgradnje <small>opciono</small>
                  </span>
                  <span className="tl-num">
                    <input inputMode="numeric" value={form.buildYear} onChange={(e) => set('buildYear', e.target.value)} placeholder="npr. 1985" />
                  </span>
                </label>
              </div>
              {askElevator && <YesNo label="Zgrada ima lift" value={form.hasElevator} onChange={(v) => set('hasElevator', v)} />}
              <YesNo label="Parking ili garaža" value={form.hasParking} onChange={(v) => set('hasParking', v)} />
              <YesNo label="Terasa ili balkon" value={form.hasTerrace} onChange={(v) => set('hasTerrace', v)} />
            </div>

            <div className="tl-sec">
              <h2>
                <i aria-hidden="true">3</i> Kontakt
              </h2>
              <div className="tl-row2">
                <label className="tl-field">
                  <span>Ime i prezime</span>
                  <span className="tl-num">
                    <input value={form.contactName} onChange={(e) => set('contactName', e.target.value)} autoComplete="name" maxLength={120} />
                  </span>
                </label>
                <label className="tl-field">
                  <span>Telefon</span>
                  <span className="tl-num">
                    <input
                      type="tel"
                      value={form.contactPhone}
                      onChange={(e) => set('contactPhone', e.target.value)}
                      autoComplete="tel"
                      placeholder="06x xxx xxxx"
                      maxLength={40}
                    />
                  </span>
                </label>
              </div>
              <label className="tl-field">
                <span>
                  Email <small>opciono</small>
                </span>
                <span className="tl-num">
                  <input type="email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} autoComplete="email" maxLength={160} />
                </span>
              </label>
              <p className="tl-fine">Podatke koristimo samo da vas kontaktiramo povodom ove procene. Bez reklama i bez obaveze.</p>
            </div>

            {error && (
              <p className="vl-error" role="alert">
                {error}
              </p>
            )}
            <div className="tl-btns">
              <button type="submit" className="tl-btn is-dark" disabled={submitting} data-track="cta:valuation_submit">
                {submitting ? 'Računam…' : 'Izračunaj procenu'}
              </button>
            </div>
          </form>
        )}
      </div>

      <aside className="tl-res" id="procena-rezultat" aria-live="polite">
        <div className="tl-card">
          <h2>Vaša procena</h2>
          {locked ? (
            <>
              <div className="tl-big vl-locked">
                <small>{copy.label}</small>
                <b>
                  — € <em>{copy.suffix}</em>
                </b>
              </div>
              <p className="tl-fine">
                Raspon se prikazuje posle drugog koraka, na osnovu cena po m² za vaše naselje{isRent ? ' (kirije mesečno)' : ''}.
              </p>
            </>
          ) : result.estimate ? (
            <>
              <div className="tl-big">
                <small>{copy.label}</small>
                <b>
                  {formatEur(result.estimate.low)} – {formatEur(result.estimate.high)} <em>{copy.suffix}</em>
                </b>
              </div>
              <p className="tl-fine">Automatska, gruba procena na osnovu podataka za vašu lokaciju. Nije zvanična procena vrednosti.</p>
            </>
          ) : (
            <>
              <div className="tl-big">
                <small>Zahtev je primljen</small>
                <b className="vl-pending">{copy.pending}</b>
              </div>
              <p className="tl-fine">Za vašu lokaciju još nemamo dovoljno podataka za automatski raspon, pa ga ne izmišljamo — izračunaćemo ga ručno.</p>
            </>
          )}

          {!locked && (
            <div className="tl-back vl-cta">
              <b>{copy.ctaTitle}</b>
              <small>{copy.ctaText}</small>
            </div>
          )}

          <div className="tl-btns">
            <p className="vl-upsell">{copy.upsell}</p>
            <Link className="tl-btn is-line" href={demoTourHref} data-track="cta:valuation_demo_tour">
              Pogledajte primer 360° ture →
            </Link>
          </div>
        </div>
      </aside>
    </section>
  );
}
