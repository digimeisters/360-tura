'use client';

import { useState } from 'react';
import { formatPrice, PROJECT_TEXT, type ProjectLang } from '../../app/lib/projectI18n';

/**
 * Kalkulator plana plaćanja u kartici stana (strana projekta, engleska i
 * ugradnja). Kupac novogradnje se prvo pita „koliko mi treba odmah i
 * koliko mesečno":
 *   - učešće 10-50 %
 *   - ostatak u ratama investitoru (bez kamate) ili stambenim kreditom
 *     (anuitet, kamata koju kupac sam upiše).
 * Samo informativno - ništa se ne šalje i ne čuva; uslove daje prodaja/banka.
 */

const DEPOSITS = [10, 20, 30, 50];
const MONTHS = [6, 12, 18, 24, 36];
const YEARS = [15, 20, 25, 30];
const DEFAULT_RATE = 4.5;

/** Mesečna rata kredita (anuitet). */
function annuity(principal: number, yearlyRatePct: number, years: number): number {
  const n = years * 12;
  const r = yearlyRatePct / 100 / 12;
  if (r <= 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export default function PaymentCalculator({ price, lang = 'sr' }: { price: number; lang?: ProjectLang }) {
  const t = PROJECT_TEXT[lang];
  const [open, setOpen] = useState(false);
  const [deposit, setDeposit] = useState(20);
  const [mode, setMode] = useState<'installments' | 'loan'>('installments');
  const [months, setMonths] = useState(18);
  const [years, setYears] = useState(25);
  const [rate, setRate] = useState(String(DEFAULT_RATE));

  if (!open) {
    return (
      <button type="button" className="inv-pay-open" onClick={() => setOpen(true)} aria-expanded={false}>
        <span aria-hidden="true">€</span> {t.payOpen}
      </button>
    );
  }

  const now = Math.round((price * deposit) / 100);
  const rest = price - now;
  const ratePct = Math.min(20, Math.max(0, Number(rate.replace(',', '.')) || 0));
  const monthly = mode === 'installments' ? rest / months : annuity(rest, ratePct, years);

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

      <div className="inv-pay-sum">
        <div>
          <small>{t.payNow}</small>
          <b>{formatPrice(now, lang)}</b>
        </div>
        <div>
          <small>{t.payRest}</small>
          <b>{formatPrice(rest, lang)}</b>
        </div>
        <div className="is-main">
          <small>{mode === 'installments' ? `${months} × ` : `${t.payYears(years)} · ${ratePct}%`}</small>
          <b>
            {formatPrice(monthly, lang)} <em>{t.payMonthly}</em>
          </b>
        </div>
      </div>
      <p className="inv-pay-note">{t.payNote}</p>
    </div>
  );
}
