'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adminAuthHeader } from '../../lib/authFetch';
import { FORM } from '../../lib/formTheme';
import { previewInNewTab } from '../ture/SendToClientDialog';

/**
 * "Pošalji izveštaj": mesečni izveštaj agenciji mejlom
 * (app/lib/emails/monthlyReport.ts, /api/admin/agency-report-email).
 *
 * Isti raspored kao "Pošalji klijentu": levo mesec i primaoci (predlog =
 * mejlovi agenata iz tura agencije), desno pregled tačno onog mejla koji
 * će otići. Šalje se tek na "Pošalji", nikad sam od sebe.
 */

const MONTHS = ['januar', 'februar', 'mart', 'april', 'maj', 'jun', 'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar'];

/** Poslednjih 6 završenih meseci, najnoviji prvi ("2026-10"). */
function recentMonths(now = new Date()): { key: string; label: string }[] {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1 - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { key, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}.` };
  });
}

function splitAddresses(value: string): string[] {
  return value
    .split(/[\s,;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function SendReportDialog({ agency, onClose }: { agency: string; onClose: () => void }) {
  const months = useMemo(() => recentMonths(), []);
  const [month, setMonth] = useState(months[0].key);
  const [to, setTo] = useState('');
  const toTouched = useRef(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [subject, setSubject] = useState('');
  const [visitors, setVisitors] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ sent: string[]; failed: string[] } | null>(null);

  const post = useCallback(
    async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/admin/agency-report-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
        body: JSON.stringify({ agency, month, ...payload })
      });
      const json = await res.json().catch(() => ({ success: false, error: 'Server nije odgovorio.' }));
      if (!res.ok || !json.success) throw new Error(json.error || 'Greška.');
      return json;
    },
    [agency, month]
  );

  // Pregled za izabrani mesec; primaoci se predlože samo dok ih niko nije menjao.
  useEffect(() => {
    let cancelled = false;
    post({ preview: true })
      .then((r) => {
        if (cancelled) return;
        setPreviewHtml(r.html ?? '');
        setSubject(r.subject ?? '');
        setVisitors(typeof r.visitors === 'number' ? r.visitors : null);
        if (!toTouched.current) setTo((r.recipients ?? []).join(', '));
        setError('');
      })
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [post]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !sending && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, sending]);

  const addresses = splitAddresses(to);
  const monthText = months.find((m) => m.key === month)?.label ?? month;

  const send = async () => {
    if (!confirm(`Poslati izveštaj za ${monthText} na ${addresses.join(', ')}?`)) return;
    setSending(true);
    setError('');
    try {
      const r = await post({ to: addresses });
      setSent({ sent: r.sent ?? [], failed: r.failed ?? [] });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const input: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '9px 11px',
    borderRadius: '10px',
    border: '1px solid ' + FORM.border,
    background: FORM.surface,
    color: FORM.textPrimary,
    fontSize: '14px'
  };
  const label: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12.5px', fontWeight: 700, color: FORM.textSecondary };
  const btn: React.CSSProperties = {
    padding: '10px 16px',
    borderRadius: '10px',
    border: '1px solid ' + FORM.border,
    background: FORM.surface,
    color: FORM.textPrimary,
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer'
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Pošalji izveštaj: ${agency}`}
      onClick={() => !sending && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: FORM.surface, color: FORM.textPrimary, borderRadius: '18px', width: '100%', maxWidth: '1040px', maxHeight: 'calc(100vh - 32px)', display: 'flex', flexWrap: 'wrap', overflow: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,.3)' }}
      >
        <div style={{ flex: '1 1 300px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontFamily: FORM.fontDisplay }}>Pošalji izveštaj</h2>
            <button type="button" onClick={onClose} disabled={sending} aria-label="Zatvori" style={{ ...btn, padding: '4px 10px', fontSize: '18px', lineHeight: 1 }}>
              ×
            </button>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: FORM.textSecondary }}>{agency}</p>

          <label style={label}>
            Mesec
            <select value={month} onChange={(e) => {
                // Stari pregled se skida dok stiže novi mesec, da se ne pošalje pogrešan.
                setPreviewHtml('');
                setSent(null);
                setMonth(e.target.value);
              }} disabled={sending} style={input}>
              {months.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label style={label}>
            Primaoci (mejlovi agenata iz tura, odvojeni zarezom)
            <textarea
              value={to}
              onChange={(e) => {
                toTouched.current = true;
                setTo(e.target.value);
              }}
              rows={3}
              placeholder="agent@agencija.rs"
              style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </label>
          {visitors === 0 && (
            <p style={{ margin: 0, fontSize: '13px', color: '#92400e', background: '#fef3c7', borderRadius: '8px', padding: '10px 12px' }}>
              Ove ture u tom mesecu nije otvorio niko. Prazan izveštaj obično ne vredi slati.
            </p>
          )}
          {subject && <p style={{ margin: 0, fontSize: '12.5px', color: FORM.textSecondary }}>Naslov: <b style={{ color: FORM.textPrimary }}>{subject}</b></p>}
          {error && (
            <p role="alert" style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: '#991b1b', background: '#fee2e2', borderRadius: '8px', padding: '10px 12px' }}>
              {error}
            </p>
          )}
          {sent && !error && (
            <p role="status" style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: '#166534', background: '#dcfce7', borderRadius: '8px', padding: '10px 12px' }}>
              Poslato na {sent.sent.join(', ')} ✓{sent.failed.length ? ` Nije prošlo: ${sent.failed.join(', ')}.` : ''}
            </p>
          )}
          <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
            <button
              type="button"
              onClick={() => void send()}
              disabled={sending || !addresses.length || !previewHtml}
              style={{ ...btn, flex: 1, background: FORM.accent, color: FORM.onAccent, borderColor: FORM.accent }}
            >
              {sending ? 'Šaljem…' : sent ? 'Pošalji ponovo' : 'Pošalji'}
            </button>
            <button type="button" onClick={onClose} disabled={sending} style={btn}>
              {sent ? 'Zatvori' : 'Otkaži'}
            </button>
          </div>
          <p style={{ margin: 0, fontSize: '11.5px', color: FORM.textSecondary }}>
            Svaki primalac dobija svoj mejl. Odgovor stiže na info@kvadrat360.com. Desno je tačno ono što će agencija videti.
          </p>
        </div>
        <div style={{ flex: '1 1 420px', background: '#F1F1EC', minHeight: '520px', borderLeft: '1px solid ' + FORM.border }}>
          {previewHtml ? (
            // Pregled je bez skripti (sandbox) - veze iz mejla otvaraju novu karticu.
            <iframe title="Pregled mejla" sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={previewInNewTab(previewHtml)} style={{ width: '100%', height: '100%', minHeight: '520px', border: 0, display: 'block' }} />
          ) : (
            <p style={{ padding: '20px', fontSize: '13px', color: FORM.textSecondary }}>{error ? '' : 'Pravim pregled…'}</p>
          )}
        </div>
      </div>
    </div>
  );
}
