'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatArea, formatPrice, PROJECT_TEXT } from '../../app/lib/projectI18n';
import {
  computePlan,
  DEFAULT_RATE,
  DEPOSITS,
  EUR_RSD,
  MONTHS,
  VAT_BUYER_SQM,
  VAT_MAX_MEMBERS,
  VAT_MEMBER_SQM,
  YEARS,
  type PlanMode,
  type Seller
} from '../../app/lib/paymentPlan';

/**
 * Samostalni kalkulator (/alati/kalkulator-kredita): kupac sam upisuje cenu i
 * kvadraturu i bira da li kupuje od investitora ili od vlasnika. Obračun je
 * isti kao u kartici stana (app/lib/paymentPlan.ts). „Sačuvajte kalkulaciju"
 * je pregledačeva štampa (stil za štampu u toolsStyles). Ništa se ne šalje.
 */

const t = PROJECT_TEXT.sr;
const PRICE_MIN = 20_000;
const PRICE_MAX = 400_000;
const DEFAULT_PRICE = 90_000;
const DEFAULT_AREA = 55;

const digits = (s: string) => Number(s.replace(/\D/g, '')) || 0;
const decimal = (s: string) => Number(s.replace(',', '.')) || 0;
const nbsp = (s: string) => s.replace(/ /g, ' ');

export default function LoanCalculator({ newBuildHref }: { newBuildHref: string }) {
  const [priceText, setPriceText] = useState(DEFAULT_PRICE.toLocaleString('sr-RS'));
  const [areaText, setAreaText] = useState(String(DEFAULT_AREA));
  const [seller, setSeller] = useState<Seller>('developer');
  const [deposit, setDeposit] = useState<number>(20);
  const [mode, setMode] = useState<PlanMode>('loan');
  const [months, setMonths] = useState<number>(18);
  const [years, setYears] = useState<number>(25);
  const [rate, setRate] = useState(String(DEFAULT_RATE).replace('.', ','));
  const [firstHome, setFirstHome] = useState<boolean | null>(null);
  const [members, setMembers] = useState(0);

  const price = digits(priceText);
  const area = decimal(areaText);
  const ratePct = Math.min(20, Math.max(0, decimal(rate)));
  const valid = price > 0;
  const r = computePlan({
    price: valid ? price : DEFAULT_PRICE,
    areaSqm: area > 0 ? area : null,
    deposit,
    mode,
    months,
    years,
    rate: ratePct,
    firstHome: firstHome === true,
    members,
    seller
  });
  const newBuild = seller === 'developer';
  const rateText = ratePct.toLocaleString('sr-RS');

  const setPrice = (n: number) => setPriceText(n.toLocaleString('sr-RS'));

  return (
    <section className="tl-calc" aria-label="Kalkulator kredita i troškova kupovine">
      <div className="tl-card">
        <div className="tl-sec">
          <h2>
            <i>1</i>Stan
          </h2>
          <div className="tl-row2">
            <label className="tl-field">
              <span>
                Cena stana <small>{newBuild ? 'sa PDV-om' : 'ugovorena'}</small>
              </span>
              <span className="tl-num">
                <input
                  inputMode="numeric"
                  value={priceText}
                  onChange={(e) => setPriceText(e.target.value)}
                  onBlur={() => price > 0 && setPrice(price)}
                  aria-invalid={!valid}
                />
                <span>€</span>
              </span>
            </label>
            <label className="tl-field">
              <span>Kvadratura</span>
              <span className="tl-num">
                <input inputMode="decimal" value={areaText} onChange={(e) => setAreaText(e.target.value)} />
                <span>m²</span>
              </span>
            </label>
          </div>
          <input
            className="tl-range"
            type="range"
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={1000}
            value={Math.min(PRICE_MAX, Math.max(PRICE_MIN, price || DEFAULT_PRICE))}
            onChange={(e) => setPrice(Number(e.target.value))}
            aria-label="Cena stana"
          />
          <p className="tl-hint">{valid && area > 0 ? `${formatPrice(price / area, 'sr')} po m²` : 'Upišite cenu i kvadraturu stana.'}</p>
          <div className="tl-field" style={{ marginTop: 12 }}>
            <span>Kupujete od</span>
            <div className="tl-chips">
              <button type="button" aria-pressed={newBuild} onClick={() => setSeller('developer')}>
                Investitora (novogradnja)
              </button>
              <button type="button" aria-pressed={!newBuild} onClick={() => setSeller('owner')}>
                Vlasnika (starogradnja)
              </button>
            </div>
          </div>
        </div>

        <div className="tl-sec">
          <h2>
            <i>2</i>Plaćanje
          </h2>
          <div className="tl-field">
            <span>{t.payDeposit}</span>
            <div className="tl-chips">
              {DEPOSITS.map((d) => (
                <button key={d} type="button" aria-pressed={deposit === d} onClick={() => setDeposit(d)}>
                  {d}%
                </button>
              ))}
            </div>
          </div>
          <div className="tl-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'installments'} onClick={() => setMode('installments')}>
              {newBuild ? t.payInstallments : 'Rate prodavcu'}
            </button>
            <button type="button" role="tab" aria-selected={mode === 'loan'} onClick={() => setMode('loan')}>
              {t.payLoan}
            </button>
          </div>
          {mode === 'installments' ? (
            <div className="tl-field">
              <span>{t.payMonths}</span>
              <div className="tl-chips">
                {MONTHS.map((m) => (
                  <button key={m} type="button" aria-pressed={months === m} onClick={() => setMonths(m)}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="tl-field">
                <span>{t.payTerm}</span>
                <div className="tl-chips">
                  {YEARS.map((y) => (
                    <button key={y} type="button" aria-pressed={years === y} onClick={() => setYears(y)}>
                      {t.payYears(y)}
                    </button>
                  ))}
                </div>
              </div>
              <label className="tl-field">
                <span>
                  {t.payInterest} <small>iz ponude banke</small>
                </span>
                <span className="tl-num" style={{ maxWidth: 150 }}>
                  <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
                  <span>%</span>
                </span>
              </label>
            </>
          )}
        </div>

        <div className="tl-sec">
          <h2>
            <i>3</i>
            {newBuild ? 'Povrat PDV-a' : 'Prvi stan'}
          </h2>
          <div className="tl-q">
            <span>{t.payFirstHome}</span>
            <span className="tl-yn">
              <button type="button" aria-pressed={firstHome === true} onClick={() => setFirstHome(true)}>
                {t.payYes}
              </button>
              <button type="button" aria-pressed={firstHome === false} onClick={() => setFirstHome(false)}>
                {t.payNo}
              </button>
            </span>
          </div>
          {firstHome && (
            <>
              <div className="tl-q">
                <span>{t.payMembers}</span>
                <span className="tl-step">
                  <button type="button" onClick={() => setMembers((m) => Math.max(0, m - 1))} disabled={members === 0} aria-label="Jedan član manje">
                    −
                  </button>
                  <b aria-live="polite">{members}</b>
                  <button type="button" onClick={() => setMembers((m) => Math.min(VAT_MAX_MEMBERS, m + 1))} disabled={members === VAT_MAX_MEMBERS} aria-label="Jedan član više">
                    +
                  </button>
                </span>
              </div>
              <p className="tl-relief" aria-live="polite">
                {r.vatSqm === null ? (
                  'Olakšica se računa po kvadraturi stana - upišite je gore.'
                ) : newBuild ? (
                  <>
                    Država vraća PDV za <b>{nbsp(formatArea(r.vatSqm, 'sr'))}</b> od {nbsp(formatArea(area, 'sr'))} ({VAT_BUYER_SQM}
                    {' '}m² za vas{members ? ` + ${members * VAT_MEMBER_SQM} m² za domaćinstvo` : ''}): <b>{formatPrice(r.vatRefund, 'sr')}</b>.
                  </>
                ) : (
                  <>
                    Kod starogradnje nema povrata PDV-a, ali porez na prenos se ne plaća za <b>{nbsp(formatArea(r.vatSqm, 'sr'))}</b> ({VAT_BUYER_SQM}
                    {' '}m² za vas{members ? ` + ${members * VAT_MEMBER_SQM} m²` : ''}).
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </div>

      <aside className="tl-res">
        <div className="tl-card">
          <h2>Vaša računica</h2>
          <div className="tl-big">
            <small>{mode === 'installments' ? `${months} rata` : `${t.payYears(years)} · ${rateText}%`}</small>
            <b>
              {formatPrice(r.monthly, 'sr')} <em>{t.payMonthly}</em>
            </b>
          </div>
          <div className="tl-kv">
            <div>
              <small>{t.payUpfront}</small>
              <b>{formatPrice(r.upfront, 'sr')}</b>
            </div>
            <div>
              <small>{mode === 'installments' ? 'Ostatak u ratama' : t.payLoanAmount}</small>
              <b>{formatPrice(r.rest, 'sr')}</b>
            </div>
          </div>
          {r.vatRefund > 0 && (
            <div className="tl-back">
              <small>{t.payVatBack}</small>
              <b>{formatPrice(r.vatRefund, 'sr')}</b>
            </div>
          )}
          <div className="tl-costs">
            <div className="tl-costs-t">
              <span>{t.payCosts} (okvirno)</span>
              <span>{formatPrice(r.costsTotal, 'sr')}</span>
            </div>
            <ul>
              {r.costs.map((c) => (
                <li key={c.key}>
                  <span>
                    {t.payCost[c.key][0]}
                    <small>{t.payCost[c.key][1]}</small>
                  </span>
                  <b>{formatPrice(c.eur, 'sr')}</b>
                </li>
              ))}
            </ul>
          </div>
          <div className="tl-btns">
            <button type="button" className="tl-btn is-dark" onClick={() => window.print()} data-track="cta:tools_calc_print">
              <span aria-hidden="true">PDF</span> Sačuvajte kalkulaciju
            </button>
            <Link className="tl-btn is-line" href={newBuildHref} data-track="cta:tools_calc_newbuild">
              Pogledajte stanove u novogradnji →
            </Link>
          </div>
          <p className="tl-fine">
            Informativni obračun. Takse po važećoj tarifi notara i katastra, okvirno (kurs {EUR_RSD.toLocaleString('sr-RS')} din/€).
            {newBuild ? ' Povrat PDV-a odobrava Poreska uprava posle isplate cele cene.' : ''} Kredit dogovarate sa bankom.
          </p>
        </div>
      </aside>
    </section>
  );
}
