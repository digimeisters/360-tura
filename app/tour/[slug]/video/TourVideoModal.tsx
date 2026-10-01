'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Language, Room, Tour } from '../types';
import { THEME, FILL_ACCENT } from '../theme';
import { buildVideoPlan, MAX_ROOMS, VIDEO_HEIGHT, VIDEO_WIDTH } from './videoPlan';
import type { VideoProgress } from './videoEncode';

/**
 * Admin prozor "🎬 Video": pravi kratak uspravan video iz ture (Premium -
 * "Kratak video iz ture za Instagram i Facebook"). Sve se radi u ovom
 * pregledaču; gotov MP4 se pregleda i preuzme, nigde se ne otprema.
 */

const LANGS: Language[] = ['sr', 'en', 'de', 'ru'];

type Phase =
  | { kind: 'idle' }
  | { kind: 'working'; progress: VideoProgress }
  | { kind: 'done'; url: string; sizeMb: number }
  | { kind: 'error'; message: string };

export default function TourVideoModal({
  tour,
  rooms,
  initialLang,
  onClose
}: {
  tour: Tour;
  rooms: Room[];
  initialLang: Language;
  onClose: () => void;
}) {
  const [lang, setLang] = useState<Language>(initialLang);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const previewRef = useRef<HTMLCanvasElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const plan = useMemo(() => buildVideoPlan(tour, rooms, lang), [tour, rooms, lang]);
  const skipped = rooms.length - plan.rooms.length;

  // Oslobodi gotov video iz memorije kad se prozor zatvori ili napravi novi.
  const doneUrl = phase.kind === 'done' ? phase.url : null;
  useEffect(() => () => { if (doneUrl) URL.revokeObjectURL(doneUrl); }, [doneUrl]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const start = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase({ kind: 'working', progress: { stage: 'loading', done: 0, total: plan.rooms.length } });
    try {
      // Biblioteka za MP4 je velika - učitava se tek kad zatreba.
      const { renderTourVideo } = await import('./videoEncode');
      const blob = await renderTourVideo(plan, {
        onProgress: (progress) => setPhase({ kind: 'working', progress }),
        getPreview: () => previewRef.current,
        signal: controller.signal
      });
      setPhase({ kind: 'done', url: URL.createObjectURL(blob), sizeMb: blob.size / 1024 / 1024 });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setPhase({ kind: 'idle' });
        return;
      }
      setPhase({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
    } finally {
      abortRef.current = null;
    }
  };

  const working = phase.kind === 'working';
  const progressText = (() => {
    if (phase.kind !== 'working') return '';
    const p = phase.progress;
    if (p.stage === 'loading') return `Skidam panorame ${p.done}/${p.total}…`;
    if (p.stage === 'encoding') return `Pravim video ${Math.round((p.done / p.total) * 100)}%`;
    return 'Završavam fajl…';
  })();
  const progressPct = (() => {
    if (phase.kind !== 'working') return 0;
    const p = phase.progress;
    if (p.stage === 'loading') return p.total ? (p.done / p.total) * 15 : 0;
    if (p.stage === 'encoding') return 15 + (p.done / p.total) * 83;
    return 99;
  })();

  const btn: React.CSSProperties = {
    padding: '11px 18px',
    borderRadius: '999px',
    border: 'none',
    color: '#fff',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: THEME.fontBody
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: THEME.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ backgroundColor: THEME.surface, border: '1px solid ' + THEME.border, borderRadius: '20px', width: '100%', maxWidth: '640px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: THEME.shadowLg, fontFamily: THEME.fontBody }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid ' + THEME.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: THEME.textPrimary, fontSize: '18px', margin: 0, fontWeight: 700 }}>🎬 Video za Instagram i Facebook</h2>
          <button
            onClick={() => { abortRef.current?.abort(); onClose(); }}
            title="Zatvori"
            aria-label="Zatvori"
            style={{ background: 'transparent', border: 'none', color: THEME.textMuted, fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '18px 20px', overflowY: 'auto', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '14px', color: THEME.textSecondary, fontSize: '13.5px', lineHeight: 1.5 }}>
            <div>
              <div style={{ fontWeight: 700, color: THEME.textPrimary, marginBottom: '6px' }}>Jezik videa</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {LANGS.map((l) => (
                  <button
                    key={l}
                    disabled={working}
                    onClick={() => setLang(l)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '999px',
                      border: '1px solid ' + (lang === l ? THEME.accent : THEME.border),
                      background: lang === l ? THEME.accentSoft : '#fff',
                      color: lang === l ? THEME.accent : THEME.textSecondary,
                      fontWeight: 700,
                      cursor: working ? 'default' : 'pointer'
                    }}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '12px', marginTop: '6px' }}>
                Bira tekst kartica i titlova. Ako soba nema prevod, ide srpski. Linija za kontakt: {lang === 'sr' ? 'Viber' : 'WhatsApp'}.
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 700, color: THEME.textPrimary, marginBottom: '6px' }}>
                Sadržaj · {Math.round(plan.duration)} s, uspravno 1080×1920
              </div>
              <ol style={{ margin: 0, paddingLeft: '18px' }}>
                <li>Uvodna kartica: {plan.intro.title || 'naziv ture'}{plan.intro.price ? `, ${plan.intro.price}` : ''}</li>
                {plan.rooms.map((shot) => (
                  <li key={shot.roomId}>{shot.title || 'Soba bez naziva'}</li>
                ))}
                <li>Završna kartica sa QR kodom ka turi</li>
              </ol>
              {skipped > 0 && (
                <div style={{ fontSize: '12px', marginTop: '6px' }}>
                  Bez {skipped} {skipped % 10 >= 1 && skipped % 10 <= 4 && (skipped % 100 < 12 || skipped % 100 > 14) ? 'sobe' : 'soba'} (najviše {MAX_ROOMS}, redom putanje vodiča; sobe bez panorame se preskaču).
                </div>
              )}
            </div>

            {phase.kind === 'error' && (
              <div style={{ background: THEME.dangerSoft, color: THEME.danger, borderRadius: '12px', padding: '10px 12px' }}>{phase.message}</div>
            )}

            {working && (
              <div>
                <div style={{ fontWeight: 700, color: THEME.textPrimary, marginBottom: '6px' }}>{progressText}</div>
                <div style={{ height: '8px', borderRadius: '4px', background: THEME.surfaceAlt, overflow: 'hidden' }}>
                  <div style={{ width: `${progressPct}%`, height: '100%', background: THEME.accent, transition: 'width 0.2s' }} />
                </div>
                <div style={{ fontSize: '12px', marginTop: '6px' }}>Ostavite ovaj prozor otvoren dok se video pravi.</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto' }}>
              {working ? (
                <button onClick={() => abortRef.current?.abort()} style={{ ...btn, background: THEME.textMuted }}>Prekini</button>
              ) : (
                <button onClick={() => void start()} disabled={plan.rooms.length === 0} style={{ ...btn, ...FILL_ACCENT }}>
                  {phase.kind === 'done' ? 'Napravi ponovo' : 'Napravi video'}
                </button>
              )}
              {phase.kind === 'done' && (
                <a
                  href={phase.url}
                  download={`${tour.slug}-${lang}.mp4`}
                  style={{ ...btn, background: THEME.success, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  Preuzmi MP4 ({phase.sizeMb.toFixed(1)} MB)
                </a>
              )}
            </div>
          </div>

          <div style={{ flex: '0 0 auto', width: '216px', margin: '0 auto' }}>
            {phase.kind === 'done' ? (
              <video src={phase.url} controls playsInline style={{ width: '216px', height: '384px', borderRadius: '16px', background: '#000', display: 'block' }} />
            ) : (
              <canvas
                ref={previewRef}
                width={VIDEO_WIDTH / 5}
                height={VIDEO_HEIGHT / 5}
                style={{ width: '216px', height: '384px', borderRadius: '16px', background: '#0E2040', display: 'block' }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
