'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { FORM, formBtnStyle } from '../../lib/formTheme';
import { AD_LIMITS, type AdLang, type AdPlatform } from '../../lib/adTextShared';

/**
 * Admin "📝 Tekst oglasa" (2026-10-31): AI naslov i opis oglasa iz podataka
 * ture, posebna struktura za svaki sajt (vidi app/lib/adText.ts). Agent
 * ispravi tekst i kopira ga u 4zida, Halo oglase ili objavu. Link nosi
 * ?utm_source=<sajt>, pa izveštaj agencije pokazuje odakle dolaze posetioci.
 */

const PLATFORMS: { key: AdPlatform; label: string; hint: string }[] = [
  { key: '4zida', label: '4zida', hint: 'Pun opis u pasusima; podaci su već u poljima oglasa, pa se ne nabrajaju.' },
  { key: 'halooglasi', label: 'Halo oglasi', hint: 'Kratak naslov, link odmah na početku, pa natuknice - čita se na telefonu.' },
  { key: 'instagram', label: 'Instagram', hint: 'Kratko, prva rečenica zaustavlja skrolovanje; link nije klikabilan, pa ide u opis profila ili priču.' },
  { key: 'facebook', label: 'Facebook', hint: 'Kratka objava sa klikabilnim linkom na turu.' }
];

async function call(body: Record<string, unknown>) {
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Niste prijavljeni.');
  const res = await fetch('/api/ai/ad-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({ success: false, error: `Greška servera (${res.status}).` }));
  if (!res.ok || !json.success) throw new Error(json.error || 'Greška.');
  return json as { title: string; body: string; link: string };
}

export default function TourAdTextModal({ slug, title: tourTitle, onClose }: { slug: string; title: string; onClose: () => void }) {
  const [platform, setPlatform] = useState<AdPlatform>('4zida');
  const [lang, setLang] = useState<AdLang>('sr');
  const [opts, setOpts] = useState({ price: true, nearby: true, contact: false });
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<'title' | 'body' | 'link' | null>(null);

  const limits = AD_LIMITS[platform];
  const social = platform === 'instagram' || platform === 'facebook';

  const write = async (again: boolean) => {
    setBusy(true);
    setError('');
    try {
      const ad = await call({ slug, platform, lang, ...opts, previous: again ? `${title}\n${text}` : '' });
      setTitle(ad.title);
      setText(ad.body);
      setLink(ad.link);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Greška.');
    } finally {
      setBusy(false);
    }
  };

  // Promena sajta ili jezika = drugačija struktura teksta; stari tekst se ne meša sa novim.
  const switchTo = (next: { platform?: AdPlatform; lang?: AdLang }) => {
    if (next.platform) setPlatform(next.platform);
    if (next.lang) setLang(next.lang);
    setTitle('');
    setText('');
    setLink('');
  };

  const copy = async (what: 'title' | 'body' | 'link', value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      window.setTimeout(() => setCopied((c) => (c === what ? null : c)), 1800);
    } catch {
      setError('Kopiranje nije uspelo - označite tekst i kopirajte ručno.');
    }
  };

  const chip = (on: boolean): React.CSSProperties => ({
    ...formBtnStyle,
    padding: '6px 12px',
    fontSize: '13px',
    borderRadius: '999px',
    ...(on ? { background: FORM.accentSoft, color: FORM.accent, borderColor: FORM.accent } : {})
  });
  const label: React.CSSProperties = { margin: '0 0 8px', fontSize: 11.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: FORM.textMuted };
  const counter = (n: number, ok: boolean) => (
    <span style={{ color: ok ? FORM.success : '#b45309', fontWeight: 700 }}>{n} znakova</span>
  );
  const copyBtn = (what: 'title' | 'body' | 'link', value: string, text: string) => (
    <button
      type="button"
      onClick={() => void copy(what, value)}
      disabled={!value}
      style={{ ...formBtnStyle, padding: '4px 10px', fontSize: 12, fontWeight: 700, color: copied === what ? FORM.success : FORM.accent, borderColor: copied === what ? FORM.success : FORM.accent }}
    >
      {copied === what ? '✓ Kopirano' : text}
    </button>
  );
  const area: React.CSSProperties = {
    width: '100%',
    border: 0,
    padding: '12px 14px',
    font: 'inherit',
    fontSize: 14.5,
    lineHeight: 1.6,
    resize: 'vertical',
    background: FORM.surface,
    color: FORM.textPrimary,
    outline: 'none'
  };
  const box: React.CSSProperties = { border: `1.5px solid ${FORM.border}`, borderRadius: 12, overflow: 'hidden' };
  const boxHead: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: FORM.surfaceAlt,
    fontSize: 12.5,
    color: FORM.textMuted,
    fontWeight: 700
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(17,17,19,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      role="dialog"
      aria-modal="true"
      aria-label="Tekst oglasa"
    >
      <div style={{ background: FORM.surface, borderRadius: 18, width: 'min(1040px, 100%)', maxHeight: '100%', overflow: 'auto', boxShadow: '0 30px 70px -30px rgba(0,0,0,.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${FORM.border}` }}>
          <div>
            <b style={{ fontSize: 17 }}>📝 Tekst oglasa</b>
            <span style={{ color: FORM.textMuted, marginLeft: 8, fontSize: 14 }}>{tourTitle}</span>
          </div>
          <button onClick={onClose} aria-label="Zatvori" style={{ ...formBtnStyle, width: 34, height: 34, padding: 0, borderRadius: '50%' }}>
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 1 300px', padding: 18, display: 'grid', gap: 18, alignContent: 'start', borderRight: `1px solid ${FORM.border}` }}>
            <div>
              <p style={label}>Za koji sajt</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PLATFORMS.map((p) => (
                  <button key={p.key} type="button" aria-pressed={platform === p.key} onClick={() => switchTo({ platform: p.key })} style={chip(platform === p.key)}>
                    {p.label}
                  </button>
                ))}
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 12.5, color: FORM.textMuted, lineHeight: 1.5 }}>{PLATFORMS.find((p) => p.key === platform)?.hint}</p>
            </div>
            <div>
              <p style={label}>Jezik</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['sr', 'en'] as AdLang[]).map((l) => (
                  <button key={l} type="button" aria-pressed={lang === l} onClick={() => switchTo({ lang: l })} style={chip(lang === l)}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p style={label}>Uključi</p>
              {(
                [
                  ['price', 'Cenu'],
                  ['nearby', 'Šta je u blizini'],
                  ['contact', 'Ime i telefon agenta']
                ] as const
              ).map(([key, text]) => (
                <label key={key} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5, margin: '6px 0' }}>
                  <input type="checkbox" checked={opts[key]} onChange={(e) => setOpts((o) => ({ ...o, [key]: e.target.checked }))} />
                  {text}
                </label>
              ))}
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <button
                type="button"
                onClick={() => void write(false)}
                disabled={busy}
                style={{ ...formBtnStyle, padding: 10, fontWeight: 700, background: FORM.accentSoft, color: FORM.accent, borderColor: FORM.accent }}
              >
                {busy ? 'Pišem…' : '✨ Napiši tekst'}
              </button>
              <button type="button" onClick={() => void write(true)} disabled={busy || !text} style={{ ...formBtnStyle, padding: 10, fontWeight: 700 }}>
                ↻ Druga verzija
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: FORM.textMuted, lineHeight: 1.5 }}>
              AI piše samo iz podataka ture i opisa - bez kućnog broja i izmišljenih pohvala. Tekst proverite pre objave.
            </p>
          </div>

          <div style={{ flex: '1 1 460px', padding: 18, display: 'grid', gap: 14, alignContent: 'start' }}>
            {error && <p style={{ margin: 0, color: FORM.danger, fontSize: 13.5 }}>{error}</p>}
            {!text && !busy && (
              <p style={{ margin: 0, color: FORM.textMuted, fontSize: 14, lineHeight: 1.55 }}>
                Izaberite sajt i kliknite „✨ Napiši tekst“. Za svaki sajt tekst ima drugačiju strukturu.
              </p>
            )}
            {!social && text && (
              <div style={box}>
                <div style={boxHead}>
                  <span>Naslov oglasa</span>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {counter(title.length, limits.title === null || title.length <= limits.title)}
                    {limits.title !== null && <span>/ ~{limits.title}</span>}
                    {copyBtn('title', title, 'Kopiraj naslov')}
                  </span>
                </div>
                <textarea value={title} onChange={(e) => setTitle(e.target.value)} rows={2} style={{ ...area, fontWeight: 700, fontSize: 16 }} />
              </div>
            )}
            {text && (
              <div style={box}>
                <div style={boxHead}>
                  <span>{social ? 'Tekst objave' : 'Opis'}</span>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {counter(text.length, text.length >= limits.body[0] * 0.7 && text.length <= limits.body[1] * 1.15)}
                    {copyBtn('body', text, social ? 'Kopiraj tekst' : 'Kopiraj opis')}
                  </span>
                </div>
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={14} style={area} />
              </div>
            )}
            {link && (
              <div style={{ ...box, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, color: FORM.textMuted, fontWeight: 700 }}>Link na turu za ovaj sajt</span>
                <code style={{ fontSize: 13, color: FORM.accent, wordBreak: 'break-all', flex: 1 }}>{link}</code>
                {copyBtn('link', link, 'Kopiraj link')}
              </div>
            )}
            {link && (
              <p style={{ margin: 0, fontSize: 12.5, color: FORM.textMuted, lineHeight: 1.5 }}>
                {platform === 'instagram'
                  ? 'Na Instagramu link stavite u opis profila ili u priču (nalepnica „Link“). '
                  : ''}
                Link nosi oznaku sajta, pa mesečni izveštaj agencije pokazuje koliko je kupaca došlo iz ovog oglasa. Dužina je smernica - sajtovi
                ne objavljuju tačna ograničenja.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
