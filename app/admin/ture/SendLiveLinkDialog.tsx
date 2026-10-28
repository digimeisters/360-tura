'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminAuthHeader } from '../../lib/authFetch';
import { FORM } from '../../lib/formTheme';
import { previewInNewTab } from './SendToClientDialog';

/**
 * "Link za vođenje uživo": mejl agentu (app/lib/emails/liveGuideLink.ts)
 * ili samo kopiranje linka, za slanje Viberom.
 *
 * Isti raspored kao "Pošalji klijentu" (SendToClientDialog): levo kome i
 * ime za pozdrav, desno pregled tačno onog mejla koji će otići - šalje se
 * tek na "Pošalji", nikad sam od sebe.
 */

type Props = {
  slug: string;
  title: string;
  published: boolean;
  /** /tour/<slug>?agent=<token>, pravi ga server (api/admin/tours). */
  guidePath: string;
  defaultTo: string;
  defaultName: string;
  onClose: () => void;
  onSent: (to: string) => void;
};

export default function SendLiveLinkDialog({ slug, title, published, guidePath, defaultTo, defaultName, onClose, onSent }: Props) {
  const [to, setTo] = useState(defaultTo);
  const [name, setName] = useState(defaultName);
  const [previewHtml, setPreviewHtml] = useState('');
  const [subject, setSubject] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [copied, setCopied] = useState(false);

  const post = useCallback(
    async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/admin/tours/send-live-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
        body: JSON.stringify({ slug, to, name, ...payload })
      });
      const json = await res.json().catch(() => ({ success: false, error: 'Server nije odgovorio.' }));
      if (!res.ok || !json.success) throw new Error(json.error || 'Greška.');
      return json as { success: true; html?: string; subject?: string };
    },
    [slug, to, name]
  );

  // Pregled se osvežava pola sekunde posle poslednje izmene polja.
  useEffect(() => {
    if (!published) return;
    const timer = setTimeout(() => {
      post({ preview: true })
        .then((r) => {
          setPreviewHtml(r.html ?? '');
          setSubject(r.subject ?? '');
          setError('');
        })
        .catch((err: Error) => setError(err.message));
    }, 500);
    return () => clearTimeout(timer);
  }, [post, published]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !sending && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, sending]);

  const send = async () => {
    if (!confirm(`Poslati link za vođenje uživo na ${to}?`)) return;
    setSending(true);
    setError('');
    try {
      await post({});
      setSentTo(to);
      onSent(to);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const copy = async () => {
    const url = window.location.origin + guidePath;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt('Link za vođenje uživo (Ctrl+C, pa Enter):', url);
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
      aria-label={`Link za vođenje uživo: ${title}`}
      onClick={() => !sending && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: FORM.surface, color: FORM.textPrimary, borderRadius: '18px', width: '100%', maxWidth: '1040px', maxHeight: 'calc(100vh - 32px)', display: 'flex', flexWrap: 'wrap', overflow: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,.3)' }}
      >
        <div style={{ flex: '1 1 300px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontFamily: FORM.fontDisplay }}>Link za vođenje uživo</h2>
            <button type="button" onClick={onClose} disabled={sending} aria-label="Zatvori" style={{ ...btn, padding: '4px 10px', fontSize: '18px', lineHeight: 1 }}>
              ×
            </button>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: FORM.textSecondary }}>{title}</p>

          {!published ? (
            <p style={{ margin: 0, fontSize: '13px', color: '#92400e', background: '#fef3c7', borderRadius: '8px', padding: '10px 12px' }}>
              Tura još nije objavljena. Prvo je objavite, jer link drugima ne radi dok je „u pripremi“.
            </p>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: FORM.textSecondary }}>
                Link je samo za agenta: njime upravlja turom. Kupac dobija svoj link tek kad agent u turi pritisne „Uživo“.
              </p>
              <label style={label}>
                Mejl agenta
                <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="agent@agencija.rs" style={input} />
              </label>
              <label style={label}>
                Ime za pozdrav („Zdravo, …!“)
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jelena" style={input} />
              </label>
              {subject && <p style={{ margin: 0, fontSize: '12.5px', color: FORM.textSecondary }}>Naslov: <b style={{ color: FORM.textPrimary }}>{subject}</b></p>}
              {error && (
                <p role="alert" style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: '#991b1b', background: '#fee2e2', borderRadius: '8px', padding: '10px 12px' }}>
                  {error}
                </p>
              )}
              {sentTo && !error && (
                <p role="status" style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: '#166534', background: '#dcfce7', borderRadius: '8px', padding: '10px 12px' }}>
                  Poslato na {sentTo} ✓ Ako ne stigne za par minuta, pogledajte folder Spam, pa u Resendu stranu „Emails“.
                </p>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => void send()} disabled={sending || !to} style={{ ...btn, flex: '1 1 140px', background: FORM.accent, color: FORM.onAccent, borderColor: FORM.accent }}>
                  {sending ? 'Šaljem…' : sentTo ? 'Pošalji ponovo' : 'Pošalji agentu'}
                </button>
                <button type="button" onClick={() => void copy()} disabled={sending} style={btn}>
                  {copied ? '✓ Kopirano' : 'Samo kopiraj link'}
                </button>
                <button type="button" onClick={onClose} disabled={sending} style={btn}>
                  {sentTo ? 'Zatvori' : 'Otkaži'}
                </button>
              </div>
              <p style={{ margin: 0, fontSize: '11.5px', color: FORM.textSecondary }}>
                Odgovor agenta stiže na info@kvadrat360.com. Desno je tačno ono što će agent videti.
              </p>
            </>
          )}
        </div>
        {published && (
          <div style={{ flex: '1 1 420px', background: '#F1F1EC', minHeight: '520px', borderLeft: '1px solid ' + FORM.border }}>
            {previewHtml ? (
              // Pregled je bez skripti (sandbox), pa se tura u njemu ne bi
              // učitala - veze iz mejla zato otvaraju novu karticu.
              <iframe title="Pregled mejla" sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={previewInNewTab(previewHtml)} style={{ width: '100%', height: '100%', minHeight: '520px', border: 0, display: 'block' }} />
            ) : (
              <p style={{ padding: '20px', fontSize: '13px', color: FORM.textSecondary }}>{error ? '' : 'Pravim pregled…'}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
