'use client';

import { useState } from 'react';
import { FORM, formBtnStyle } from '../../lib/formTheme';
import { SITE_URL } from '../../lib/site';
import AgencyLogoButton from '../ture/AgencyLogoButton';

/**
 * Tabela agencija na strani "Agencije" (spec 2026-10-24-admin-okvir): logo u
 * turama i tajni link mesečnog izveštaja (lib/agencyReport.ts), jedan red po
 * agenciji. Agencija se pojavi čim joj se dodeli prva tura.
 */

export type AgencyReport = { agency: string; tours: number; path: string; logoUrl: string | null };

function initials(name: string): string {
  // Samo reči koje počinju slovom ili brojem ("Kvadrat360 · primer" -> "KP").
  const words = name.trim().split(/\s+/).filter((w) => /^[\p{L}\p{N}]/u.test(w));
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function toursLabel(n: number): string {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return `${n} tura`;
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return `${n} ture`;
  return `${n} tura`;
}

export default function AgencyTable({ reports, onLogoChanged }: { reports: AgencyReport[]; onLogoChanged: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyLink = async (r: AgencyReport) => {
    const link = `${SITE_URL}${r.path}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt('Link izveštaja (Ctrl+C, pa Enter):', link);
    }
    setCopied(r.agency);
    setTimeout(() => setCopied((cur) => (cur === r.agency ? null : cur)), 1800);
  };

  if (reports.length === 0) {
    return (
      <p style={{ margin: 0, padding: '22px', background: FORM.surface, border: '1px solid ' + FORM.border, borderRadius: '16px', color: FORM.textSecondary, fontSize: '14px' }}>
        Još nema agencija — dodelite agenciju turi u formi ture.
      </p>
    );
  }

  return (
    <>
      <div style={{ background: FORM.surface, border: '1px solid ' + FORM.border, borderRadius: '16px', boxShadow: FORM.shadow, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr>
              {['Agencija', 'Logo u turama', 'Izveštaj za agenciju'].map((h, i) => (
                <th
                  key={h}
                  style={{ padding: '12px 14px', textAlign: i === 2 ? 'right' : 'left', fontSize: '12px', fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase', color: FORM.textSecondary, borderBottom: '1px solid ' + FORM.border, whiteSpace: 'nowrap' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.agency} style={{ borderBottom: '1px solid ' + FORM.border }}>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      aria-hidden="true"
                      style={{ width: '40px', height: '40px', flex: 'none', borderRadius: '50%', border: '1px solid ' + FORM.border, background: FORM.surfaceAlt, display: 'grid', placeItems: 'center', overflow: 'hidden', fontWeight: 800, fontSize: '13px', color: FORM.textSecondary }}
                    >
                      {r.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- logo agencije sa R2, mali i bez optimizacije
                        <img src={r.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        initials(r.agency)
                      )}
                    </span>
                    <span>
                      <b style={{ display: 'block' }}>{r.agency}</b>
                      <span style={{ fontSize: '12.5px', color: FORM.textSecondary }}>{toursLabel(r.tours)}</span>
                    </span>
                  </div>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <AgencyLogoButton agency={r.agency} logoUrl={r.logoUrl} onChanged={onLogoChanged} />
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    onClick={() => void copyLink(r)}
                    style={{ ...formBtnStyle, padding: '6px 12px', fontSize: '12.5px', marginRight: '6px', ...(copied === r.agency ? { background: FORM.success, color: '#fff', borderColor: FORM.success } : {}) }}
                  >
                    {copied === r.agency ? 'Kopirano ✓' : 'Kopiraj link'}
                  </button>
                  <a href={r.path} target="_blank" rel="noreferrer" style={{ ...formBtnStyle, padding: '6px 12px', fontSize: '12.5px', textDecoration: 'none' }}>
                    Otvori izveštaj ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ margin: '14px 0 0', padding: '12px 14px', background: FORM.accentSoft, borderRadius: '12px', fontSize: '13px', lineHeight: 1.55, color: FORM.textPrimary }}>
        <b>Kako radi:</b> link izveštaja pošaljite agenciji porukom ili mejlom. Agencija vidi samo svoje ture, posete po mesecima, bez prijave, i link ne ističe.
        Agencija se ovde pojavi čim joj dodelite prvu turu (polje „Agencija“ u formi ture).
      </p>
    </>
  );
}
