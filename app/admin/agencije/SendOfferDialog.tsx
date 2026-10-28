'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminAuthHeader } from '../../lib/authFetch';
import { FORM } from '../../lib/formTheme';
import { previewInNewTab } from '../ture/SendToClientDialog';

/**
 * "Pošalji ponudu": mejl "Ponuda agenciji" (app/lib/emails/agencyOffer.ts,
 * /api/admin/agency-offer), jednoj agenciji po slanju.
 *
 * Isti raspored kao ostali mejlovi iz admina: levo kome, ime, primer ture
 * i lična rečenica; desno pregled tačno onog mejla koji će otići. Šalje se
 * tek na "Pošalji", nikad sam od sebe.
 */

type TourOption = { slug: string; title: string };

export default function SendOfferDialog({ onClose }: { onClose: () => void }) {
  const [to, setTo] = useState('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [slug, setSlug] = useState('');
  const [tours, setTours] = useState<TourOption[]>([]);
  const [previewHtml, setPreviewHtml] = useState('');
  const [subject, setSubject] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState('');

  const post = useCallback(
    async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/admin/agency-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
        body: JSON.stringify({ to, name, note, slug, ...payload })
      });
      const json = await res.json().catch(() => ({ success: false, error: 'Server nije odgovorio.' }));
      if (!res.ok || !json.success) throw new Error(json.error || 'Greška.');
      return json;
    },
    [to, name, note, slug]
  );

  // Pregled se osvežava pola sekunde posle poslednje izmene polja.
  useEffect(() => {
    const timer = setTimeout(() => {
      post({ preview: true })
        .then((r) => {
          setPreviewHtml(r.html ?? '');
          setSubject(r.subject ?? '');
          setTours(r.tours ?? []);
          if (!slug && r.slug) setSlug(r.slug);
          setError('');
        })
        .catch((err: Error) => setError(err.message));
    }, 500);
    return () => clearTimeout(timer);
  }, [post, slug]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !sending && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, sending]);

  const send = async () => {
    if (!confirm(`Poslati ponudu na ${to}?`)) return;
    setSending(true);
    setError('');
    try {
      await post({});
      setSentTo(to);
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
      aria-label="Pošalji ponudu agenciji"
      onClick={() => !sending && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: FORM.surface, color: FORM.textPrimary, borderRadius: '18px', width: '100%', maxWidth: '1040px', maxHeight: 'calc(100vh - 32px)', display: 'flex', flexWrap: 'wrap', overflow: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,.3)' }}
      >
        <div style={{ flex: '1 1 300px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontFamily: FORM.fontDisplay }}>Pošalji ponudu agenciji</h2>
            <button type="button" onClick={onClose} disabled={sending} aria-label="Zatvori" style={{ ...btn, padding: '4px 10px', fontSize: '18px', lineHeight: 1 }}>
              ×
            </button>
          </div>

          <label style={label}>
            Mejl agencije
            <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="info@agencija.rs" style={input} />
          </label>
          <label style={label}>
            Ime za pozdrav („Dobar dan, …,“), opciono
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jelena" style={input} />
          </label>
          <label style={label}>
            Primer ture
            <select value={slug} onChange={(e) => setSlug(e.target.value)} style={input}>
              {tours.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          <label style={label}>
            Lična rečenica ispod uvoda, opciono
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={400}
              placeholder="Videli smo vaš oglas za stan u Ulici kralja Petra…"
              style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </label>
          {subject && <p style={{ margin: 0, fontSize: '12.5px', color: FORM.textSecondary }}>Naslov: <b style={{ color: FORM.textPrimary }}>{subject}</b></p>}
          {error && (
            <p role="alert" style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: '#991b1b', background: '#fee2e2', borderRadius: '8px', padding: '10px 12px' }}>
              {error}
            </p>
          )}
          {sentTo && !error && (
            <p role="status" style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: '#166534', background: '#dcfce7', borderRadius: '8px', padding: '10px 12px' }}>
              Poslato na {sentTo} ✓ Kopija je na Telegramu.
            </p>
          )}
          <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
            <button type="button" onClick={() => void send()} disabled={sending || !to || !previewHtml} style={{ ...btn, flex: 1, background: FORM.accent, color: FORM.onAccent, borderColor: FORM.accent }}>
              {sending ? 'Šaljem…' : sentTo ? 'Pošalji ponovo' : 'Pošalji'}
            </button>
            <button type="button" onClick={onClose} disabled={sending} style={btn}>
              {sentTo ? 'Zatvori' : 'Otkaži'}
            </button>
          </div>
          <p style={{ margin: 0, fontSize: '11.5px', color: FORM.textSecondary }}>
            Odgovor agencije stiže na info@kvadrat360.com. Desno je tačno ono što će agencija videti.
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
