'use client';

import { useSearchParams } from 'next/navigation';
import { formatArea, formatPrice, PROJECT_TEXT, type ProjectLang } from '../../app/lib/projectI18n';
import { computePlan, planFromQuery } from '../../app/lib/paymentPlan';

/**
 * Obračun iz kalkulatora na PDF letku stana: kalkulator u kartici stana
 * otvara letak sa izborom kupca u adresi (planToQuery). Letak ostaje
 * statičan (keš), a ovaj deo se iscrta u pregledaču. Bez parametara - ništa.
 */
export default function UnitSheetPlan({ price, areaSqm, lang }: { price: number; areaSqm: number | null; lang: ProjectLang }) {
  const params = useSearchParams();
  const plan = planFromQuery(new URLSearchParams(params.toString()));
  if (!plan) return null;

  const t = PROJECT_TEXT[lang];
  const r = computePlan({ price, areaSqm, ...plan });
  const rateText = plan.rate.toLocaleString(lang === 'en' ? 'en-GB' : 'sr-RS');

  return (
    <section className="us-calc">
      <h2>{t.payCalcTitle}</h2>
      <div className="us-calc-grid">
        <table>
          <tbody>
            <tr>
              <td>
                {t.payDeposit} {plan.deposit}%
              </td>
              <td>{formatPrice(r.now, lang)}</td>
            </tr>
            <tr>
              <td>
                {plan.mode === 'installments' ? t.payInstallmentsN(plan.months) : `${t.payLoan}, ${t.payYears(plan.years)}, ${rateText}%`}
              </td>
              <td>{formatPrice(r.rest, lang)}</td>
            </tr>
            <tr className="is-total">
              <td>{t.payMonthly[0].toUpperCase() + t.payMonthly.slice(1)}</td>
              <td>{formatPrice(r.monthly, lang)}</td>
            </tr>
          </tbody>
        </table>
        <table>
          <tbody>
            {r.costs.map((c) => (
              <tr key={c.key}>
                <td>{t.payCost[c.key][0]}</td>
                <td>{formatPrice(c.eur, lang)}</td>
              </tr>
            ))}
            <tr className="is-total">
              <td>{t.payUpfrontTotal}</td>
              <td>{formatPrice(r.upfront, lang)}</td>
            </tr>
            {r.vatSqm !== null && r.vatRefund > 0 && (
              <>
                <tr>
                  <td>{t.payVatSqm(formatArea(r.vatSqm, lang))}</td>
                  <td />
                </tr>
                <tr className="is-total is-green">
                  <td>{t.payVatReturned}</td>
                  <td>− {formatPrice(r.vatRefund, lang)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
      <p>{t.paySheetNote}</p>
    </section>
  );
}
