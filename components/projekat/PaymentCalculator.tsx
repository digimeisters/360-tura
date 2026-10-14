'use client';

import { useState } from 'react';
import { formatArea, formatPrice, PROJECT_TEXT, type ProjectLang } from '../../app/lib/projectI18n';
import {
  computePlan,
  DEFAULT_PLAN,
  DEPOSITS,
  EUR_RSD,
  MONTHS,
  planToQuery,
  VAT_MAX_MEMBERS,
  YEARS,
  type PlanMode
} from '../../app/lib/paymentPlan';

/**
 * Kalkulator plana plaćanja u kartici stana (strana projekta, ceo ekran,
 * strana stana, engleska i ugradnja). Kupac novogradnje se prvo pita „koliko
 * mi treba odmah i koliko mesečno":
 *   - učešće 10-50 %
 *   - ostatak u ratama investitoru (bez kamate) ili stambenim kreditom
 *     (anuitet, kamata koju kupac sam upiše)
 *   - troškovi kupovine (notar, katastar, uz kredit i banka) - okvirno
 *   - povrat PDV-a za prvi stan (40 m² + 15 m² po članu domaćinstva)
 *   - PDF: letak stana sa istim obračunom (parametri u adresi).
 * Obračun je u app/lib/paymentPlan.ts. Ništa se ne šalje i ne čuva.
 */

export default function PaymentCalculator({
  price,
  areaSqm = null,
  sheetHref = null,
  lang = 'sr'
}: {
  price: number;
  areaSqm?: number | null;
  /** Letak stana („…/stan/<oznaka>/letak") - null = bez dugmeta za PDF. */
  sheetHref?: string | null;
  lang?: ProjectLang;
}) {
  const t = PROJECT_TEXT[lang];
  const [open, setOpen] = useState(false);
  const [deposit, setDeposit] = useState<number>(DEFAULT_PLAN.deposit);
  const [mode, setMode] = useState<PlanMode>(DEFAULT_PLAN.mode);
  const [months, setMonths] = useState<number>(DEFAULT_PLAN.months);
  const [years, setYears] = useState<number>(DEFAULT_PLAN.years);
  const [rate, setRate] = useState(String(DEFAULT_PLAN.rate));
  const [firstHome, setFirstHome] = useState<boolean | null>(null);
  const [members, setMembers] = useState(0);

  if (!open) {
    return (
      <button type="button" className="inv-pay-open" onClick={() => setOpen(true)} aria-expanded={false}>
        <span aria-hidden="true">€</span> {t.payOpen}
      </button>
    );
  }

  const ratePct = Math.min(20, Math.max(0, Number(rate.replace(',', '.')) || 0));
  const plan = { deposit, mode, months, years, rate: ratePct, firstHome: firstHome === true, members };
  const r = computePlan({ price, areaSqm, ...plan });
  const rateText = ratePct.toLocaleString(lang === 'en' ? 'en-GB' : 'sr-RS');

  return (
    <div className="inv-pay" role="group" aria-label={t.payTitle}>
      <div className="inv-pay-head">
        <b>{t.payTitle}</b>
        <button type="button" onClick={() => setOpen(false)} aria-label="×">
          ×
        </button>
      </div>

      <span className="inv-pay-label">{t.payDeposit}</span>
      <div className="inv-pay-chips">
        {DEPOSITS.map((d) => (
          <button key={d} type="button" aria-pressed={deposit === d} onClick={() => setDeposit(d)}>
            {d}%
          </button>
        ))}
      </div>

      <div className="inv-pay-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'installments'} onClick={() => setMode('installments')}>
          {t.payInstallments}
        </button>
        <button type="button" role="tab" aria-selected={mode === 'loan'} onClick={() => setMode('loan')}>
          {t.payLoan}
        </button>
      </div>

      {mode === 'installments' ? (
        <>
          <span className="inv-pay-label">{t.payMonths}</span>
          <div className="inv-pay-chips">
            {MONTHS.map((m) => (
              <button key={m} type="button" aria-pressed={months === m} onClick={() => setMonths(m)}>
                {m}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <span className="inv-pay-label">{t.payTerm}</span>
          <div className="inv-pay-chips">
            {YEARS.map((y) => (
              <button key={y} type="button" aria-pressed={years === y} onClick={() => setYears(y)}>
                {t.payYears(y)}
              </button>
            ))}
          </div>
          <label className="inv-pay-rate">
            {t.payInterest}
            <span>
              <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} aria-label={t.payInterest} />%
            </span>
          </label>
        </>
      )}

      <div className="inv-pay-vat">
        <div className="inv-pay-vat-row">
          <span>{t.payFirstHome}</span>
          <span className="inv-pay-yn">
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
            <div className="inv-pay-vat-row is-sub">
              <span>{t.payMembers}</span>
              <span className="inv-pay-step">
                <button type="button" onClick={() => setMembers((m) => Math.max(0, m - 1))} disabled={members === 0} aria-label="−">
                  −
                </button>
                <b aria-live="polite">{members}</b>
                <button type="button" onClick={() => setMembers((m) => Math.min(VAT_MAX_MEMBERS, m + 1))} disabled={members === VAT_MAX_MEMBERS} aria-label="+">
                  +
                </button>
              </span>
            </div>
            {r.vatSqm !== null ? (
              <>
                <p className="inv-pay-vat-sub">{t.payVatFor(formatArea(r.vatSqm, lang), formatArea(areaSqm, lang), members)}</p>
                <div className="inv-pay-vat-sum">
                  <span>{t.payVat}</span>
                  <b>− {formatPrice(r.vatRefund, lang)}</b>
                </div>
              </>
            ) : (
              <p className="inv-pay-vat-sub">{t.payVatNoArea}</p>
            )}
          </>
        )}
      </div>

      <details className="inv-pay-costs">
        <summary>
          <span>
            {t.payCosts} <span className="inv-pay-chev" aria-hidden="true">▾</span>
          </span>
          <b>{formatPrice(r.costsTotal, lang)}</b>
        </summary>
        <ul>
          {r.costs.map((c) => (
            <li key={c.key}>
              <span>
                {t.payCost[c.key][0]}
                <small>{t.payCost[c.key][1]}</small>
              </span>
              <b>{formatPrice(c.eur, lang)}</b>
            </li>
          ))}
        </ul>
      </details>

      <div className="inv-pay-sum">
        <div>
          <small>{t.payUpfront}</small>
          <b>{formatPrice(r.upfront, lang)}</b>
        </div>
        <div>
          <small>{mode === 'installments' ? t.payRestDeveloper : t.payLoanAmount}</small>
          <b>{formatPrice(r.rest, lang)}</b>
        </div>
        <div className="is-main">
          <small>{mode === 'installments' ? t.payInstallmentsN(months) : `${t.payYears(years)} · ${rateText}%`}</small>
          <b>
            {formatPrice(r.monthly, lang)} <em>{t.payMonthly}</em>
          </b>
        </div>
        {r.vatRefund > 0 && (
          <div className="is-back">
            <small>{t.payVatBack}</small>
            <b>{formatPrice(r.vatRefund, lang)}</b>
          </div>
        )}
      </div>

      {sheetHref && (
        <a className="inv-pay-pdf" href={`${sheetHref}?${planToQuery(plan)}`} target="_blank" rel="noopener" data-track="cta:project_unit_calc_pdf">
          <span aria-hidden="true">PDF</span> {t.payPdf}
        </a>
      )}
      <p className="inv-pay-note">
        {t.payNote} {t.payCostsNote(EUR_RSD.toLocaleString(lang === 'en' ? 'en-GB' : 'sr-RS'))}
      </p>
    </div>
  );
}
