'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { FORM, formBtnStyle } from '../../lib/formTheme';

/**
 * Admin "Uvod ture" (vlasnik, 17. 10. 2026): AI napiše kratak uvod iz
 * OSNOVNIH podataka ture, prema nameni; agent ga ispravi, pa se prevodi na
 * jezike ture i snima glas. Uvod se izgovara na početku automatskog vodiča
 * dok posetilac "dolazi sa mape" (TourIntroOverlay) - ne prikazuje se kao
 * tekst. Naracije soba se ovde ne diraju. Server: /api/ai/tour-intro.
 */

type Purpose = 'sale' | 'rent' | 'booking';
type Fact = { key: string; label: string; value: string };
type Loaded = {
  title: string;
  purpose: Purpose;
  facts: Fact[];
  hasLocation: boolean;
  languages: string[];
  intro: Record<string, string> | null;
  audio: Record<string, string> | null;
};

const PURPOSES: { key: Purpose; label: string }[] = [
  { key: 'sale', label: 'Prodaja' },
  { key: 'rent', label: 'Izdavanje' },
  { key: 'booking', label: 'Stan na dan' }
];
const MAX_WORDS = 65;
/** Prosečan tempo glasa (~2,6 reči u sekundi) - samo za procenu u prozoru. */
const WORDS_PER_SECOND = 2.6;

async function call(body: Record<string, unknown>) {
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Niste prijavljeni.');
  const res = await fetch('/api/ai/tour-intro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({ success: false, error: `Greška servera (${res.status}).` }));
  if (!res.ok || !json.success) throw new Error(json.error || 'Greška.');
  return json;
}

export default function TourIntroModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [purpose, setPurpose] = useState<Purpose>('sale');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<'draft' | 'voice' | 'clear' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    call({ action: 'load', slug })
      .then((json: Loaded) => {
        if (cancelled) return;
        setData(json);
        setPurpose(json.purpose);
        setText(json.intro?.sr ?? '');
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Greška pri učitavanju.'));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const seconds = Math.round(words / WORDS_PER_SECOND);
  const saved = data?.intro?.sr?.trim() ?? '';
  const unsaved = text.trim() !== saved;

  const run = async (kind: 'draft' | 'voice' | 'clear', fn: () => Promise<void>) => {
    setBusy(kind);
    setError('');
    setNotice('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Greška.');
    } finally {
      setBusy(null);
    }
  };

  const draft = (again: boolean) =>
    run('draft', async () => {
      const json = await call({ action: 'draft', slug, purpose, previous: again ? text : '' });
      setText(json.text);
    });

  const voice = () =>
    run('voice', async () => {
      const json = await call({ action: 'voice', slug, text });
      const failed = Object.keys(json.errors ?? {});
      setData((d) => (d ? { ...d, intro: json.intro, audio: json.audio } : d));
      setNotice(failed.length ? `Snimljeno, osim: ${failed.map((l) => l.toUpperCase()).join(', ')}.` : 'Uvod je snimljen i već se čuje u turi.');
    });

  const clear = () => {
    if (!window.confirm('Obrisati uvod? Vodič će krenuti pravo od prve sobe, kao ranije.')) return;
    void run('clear', async () => {
      await call({ action: 'clear', slug });
      setData((d) => (d ? { ...d, intro: null, audio: null } : d));
      setText('');
      setNotice('Uvod je obrisan.');
    });
  };

  const chip = (on: boolean): React.CSSProperties => ({
    ...formBtnStyle,
    padding: '6px 12px',
    fontSize: '13px',
    borderRadius: '999px',
    ...(on ? { background: FORM.accentSoft, color: FORM.accent, borderColor: FORM.accent } : {})
  });
  const label: React.CSSProperties = { margin: '0 0 8px', fontSize: 11.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: FORM.textMuted };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(17,17,19,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      role="dialog"
      aria-modal="true"
      aria-label="Uvod ture"
    >
      <div style={{ background: FORM.surface, borderRadius: 18, width: 'min(620px, 100%)', maxHeight: '100%', overflow: 'auto', boxShadow: '0 30px 70px -30px rgba(0,0,0,.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${FORM.border}` }}>
          <div>
            <b style={{ fontSize: 17 }}>🎬 Uvod ture</b>
            {data && <span style={{ color: FORM.textMuted, marginLeft: 8, fontSize: 14 }}>{data.title}</span>}
          </div>
          <button onClick={onClose} aria-label="Zatvori" style={{ ...formBtnStyle, width: 34, height: 34, padding: 0, borderRadius: '50%' }}>
            ×
          </button>
        </div>

        {!data ? (
          <p style={{ margin: 0, padding: 24, color: error ? FORM.danger : FORM.textMuted }}>{error || 'Učitavam turu…'}</p>
        ) : (
          <div style={{ padding: 18, display: 'grid', gap: 18 }}>
            <p style={{ margin: 0, fontSize: 13.5, color: FORM.textSecondary, lineHeight: 1.5 }}>
              Glas na početku vodiča, dok posetilac „dolazi sa mape“ do nekretnine. Ne prikazuje se kao tekst. Naracije soba se ne menjaju.
              {!data.hasLocation && ' Tura nema lokaciju na mapi, pa uvod ide preko prve sobe.'}
            </p>

            <div>
              <p style={label}>Namena</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PURPOSES.map((p) => (
                  <button key={p.key} onClick={() => setPurpose(p.key)} aria-pressed={purpose === p.key} style={chip(purpose === p.key)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p style={label}>Podaci koje AI koristi</p>
              {data.facts.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {data.facts.map((f) => (
                    <span key={f.key} title={f.label} style={{ background: FORM.surfaceAlt, borderRadius: 7, padding: '4px 8px', fontSize: 12, color: FORM.textSecondary }}>
                      {f.value}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: FORM.danger }}>Tura nema upisane osnovne podatke - popunite ih u formi ture pre uvoda.</p>
              )}
              <p style={{ margin: '6px 0 0', fontSize: 11.5, color: FORM.textMuted }}>Šta nije upisano, AI ne pominje. Posebnosti uzima samo iz opisa ture.</p>
            </div>

            <div>
              <p style={label}>Tekst uvoda (srpski)</p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Kliknite „✨ Napravi uvod“ ili napišite sami."
                rows={5}
                style={{ width: '100%', border: `1.5px solid ${FORM.border}`, borderRadius: 12, padding: '10px 12px', font: 'inherit', fontSize: 14, lineHeight: 1.5, resize: 'vertical', background: FORM.surface, color: FORM.textPrimary }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: words > MAX_WORDS ? FORM.danger : FORM.textMuted, marginTop: 4 }}>
                <span>
                  {words} reči · oko {seconds} s glasa{words > MAX_WORDS ? ` - skratite na ${MAX_WORDS}` : ''}
                </span>
                {saved && <span style={{ color: unsaved ? FORM.textMuted : FORM.success, fontWeight: 700 }}>{unsaved ? 'izmenjeno, nije snimljeno' : '✓ snimljeno'}</span>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                onClick={() => void draft(false)}
                disabled={!!busy || !data.facts.length}
                style={{ ...formBtnStyle, padding: 10, fontWeight: 700, background: FORM.accentSoft, color: FORM.accent, borderColor: FORM.accent }}
              >
                {busy === 'draft' ? 'Pišem…' : '✨ Napravi uvod'}
              </button>
              <button onClick={() => void draft(true)} disabled={!!busy || !text.trim()} style={{ ...formBtnStyle, padding: 10, fontWeight: 700 }}>
                ↻ Druga verzija
              </button>
              <button
                onClick={() => void voice()}
                disabled={!!busy || !text.trim() || words > MAX_WORDS}
                style={{ ...formBtnStyle, gridColumn: '1 / -1', padding: 11, fontWeight: 800, background: FORM.accent, color: FORM.onAccent, borderColor: FORM.accent }}
              >
                {busy === 'voice'
                  ? 'Prevodim i snimam glas…'
                  : `🎙️ Prevedi i snimi glas uvoda (${data.languages.map((l) => l.toUpperCase()).join(', ')})`}
              </button>
            </div>

            {error && <p style={{ margin: 0, color: FORM.danger, fontSize: 13.5 }}>{error}</p>}
            {notice && <p style={{ margin: 0, color: FORM.success, fontSize: 13.5, fontWeight: 600 }}>{notice}</p>}

            {data.audio && Object.keys(data.audio).length > 0 && (
              <div>
                <p style={label}>Snimljen glas</p>
                <div style={{ display: 'grid', gap: 8 }}>
                  {Object.entries(data.audio).map(([l, url]) => (
                    <div key={l} style={{ display: 'grid', gridTemplateColumns: '34px 1fr', gap: 8, alignItems: 'center' }}>
                      <b style={{ fontSize: 12.5 }}>{l.toUpperCase()}</b>
                      <audio controls preload="none" src={url} style={{ width: '100%', height: 34 }} />
                    </div>
                  ))}
                </div>
                <button onClick={clear} disabled={!!busy} style={{ ...formBtnStyle, marginTop: 12, padding: '7px 12px', fontSize: 12.5, color: FORM.danger }}>
                  Obriši uvod
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
