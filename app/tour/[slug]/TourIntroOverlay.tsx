'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Map as MlMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { createMap, loadMapLibre } from '../../../components/maps/protomaps';
import { GLASS, THEME } from './theme';
import { chipsFor } from './introChips';
import { prefersReducedMotion } from './transition';
import type { Language, Tour } from './types';

/**
 * Uvod ture (vlasnik, 17. 10. 2026): pre prve sobe automatskog vodiča glas
 * ukratko predstavi nekretninu, a slika ga prati - let preko naše mape do
 * naselja, oznaka nekretnine, pa pločice sa podacima koje iskaču dok glas
 * priča. Tekst uvoda se NE prikazuje (namerno - čuje se, ne čita).
 *
 * Audio pravi strana u samom kliku na "Vodi me" (Safari pušta zvuk samo iz
 * dodira), ovde se samo prati. Kad glas završi ili posetilac klikne
 * "Preskoči", zove se onDone; strana tada pokreće turu i ovaj sloj pretapa.
 * Tura bez koordinata: umesto mape lagano se približava naslovna slika.
 */

const PIN_HTML = `<div class="k360-intro-pin"><svg width="46" height="46" viewBox="0 0 30 30" fill="none" style="display:block">
  <path d="M15 29C15 29 4 19.2 4 12A11 11 0 0 1 26 12C26 19.2 15 29 15 29Z" fill="#1E5AA8" stroke="#fff" stroke-width="1.6"/>
  <circle cx="15" cy="12" r="4.2" fill="#fff"/></svg></div>`;

export default function TourIntroOverlay({
  tour,
  lang,
  audio,
  coverUrl,
  leaving,
  skipLabel,
  onDone
}: {
  tour: Tour;
  lang: Language;
  audio: HTMLAudioElement;
  coverUrl: string | null;
  /** Tura je već pokrenuta ispod - sloj se pretapa (strana ga zatim skloni). */
  leaving: boolean;
  skipLabel: string;
  onDone: () => void;
}) {
  const mapBoxRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const chips = useMemo(() => chipsFor(tour, lang), [tour, lang]);
  const located = typeof tour.lat === 'number' && typeof tour.lng === 'number';
  const place = [tour.district?.trim(), tour.city?.trim()].filter(Boolean).join(', ');

  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDoneRef.current();
  }, []);

  // Glas: napredak za pločice, kraj = ulazak u turu.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setProgress(audio.currentTime / audio.duration);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const end = () => finish();
    audio.addEventListener('ended', end);
    audio.addEventListener('error', end);
    return () => {
      cancelAnimationFrame(raf);
      audio.removeEventListener('ended', end);
      audio.removeEventListener('error', end);
      // Izlazak sa strane usred uvoda (nazad, drugi link) - glas ne sme da nastavi.
      audio.pause();
    };
  }, [audio, finish]);

  // Mapa: od pogleda na grad, let do zgrade, pa oznaka.
  useEffect(() => {
    if (!located || !mapBoxRef.current) return;
    let map: MlMap | null = null;
    let cancelled = false;
    const center: [number, number] = [tour.lng as number, tour.lat as number];
    void loadMapLibre().then(({ maplibregl, style }) => {
      if (cancelled || !mapBoxRef.current) return;
      map = createMap(maplibregl, mapBoxRef.current, style, center, 12.2, lang);
      if (!map) return;
      const m = map;
      m.dragPan.disable();
      m.scrollZoom.disable();
      m.touchZoomRotate.disable();
      m.doubleClickZoom.disable();
      m.keyboard.disable();
      m.once('load', () => {
        if (cancelled) return;
        const addPin = () => {
          const el = document.createElement('div');
          el.innerHTML = PIN_HTML;
          new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(center).addTo(m);
        };
        const target = { center, zoom: 16.4, pitch: 50, bearing: -18 };
        if (prefersReducedMotion()) {
          m.jumpTo(target);
          addPin();
          return;
        }
        // Let traje oko trećine glasa (3-6 s) - ostatak priče ide uz pločice.
        const seconds = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 14;
        m.flyTo({ ...target, duration: Math.min(6000, Math.max(3000, seconds * 330)), essential: true });
        m.once('moveend', addPin);
      });
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
    // Mapa se pravi jednom po prikazu uvoda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pločice iskaču ravnomerno od ~trećine glasa do pred kraj.
  const shown = chips.filter((_, i) => progress >= 0.32 + (0.58 * i) / Math.max(1, chips.length));

  return (
    <div
      aria-live="polite"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 60,
        overflow: 'hidden',
        background: '#e9ecef',
        opacity: leaving ? 0 : 1,
        transition: 'opacity 1s ease',
        pointerEvents: leaving ? 'none' : 'auto',
        fontFamily: THEME.fontBody
      }}
    >
      <style>{`
        @keyframes k360IntroZoom{from{transform:scale(1.02)}to{transform:scale(1.18)}}
        @keyframes k360IntroPin{0%{transform:translateY(-40px);opacity:0}70%{transform:translateY(4px);opacity:1}100%{transform:none;opacity:1}}
        @keyframes k360IntroChip{from{transform:translateY(12px) scale(.9);opacity:0}to{transform:none;opacity:1}}
        @keyframes k360IntroWave{0%,100%{height:3px}50%{height:11px}}
        .k360-intro-pin{animation:k360IntroPin .7s cubic-bezier(.3,1.4,.5,1) both;filter:drop-shadow(0 6px 10px rgba(0,0,0,.35))}
        .k360-intro-map .maplibregl-ctrl-bottom-right,.k360-intro-map .maplibregl-ctrl-bottom-left{opacity:.6}
        @media (prefers-reduced-motion: reduce){.k360-intro-cover,.k360-intro-pin,.k360-intro-chip{animation:none!important}}
      `}</style>

      {located ? (
        <div ref={mapBoxRef} className="k360-intro-map" style={{ position: 'absolute', inset: 0 }} />
      ) : (
        coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="k360-intro-cover"
            src={coverUrl}
            alt=""
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', animation: 'k360IntroZoom 30s ease-out both' }}
          />
        )
      )}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: located
            ? 'linear-gradient(180deg, rgba(15,23,42,.35) 0%, rgba(15,23,42,0) 22%, rgba(15,23,42,0) 55%, rgba(15,23,42,.55) 100%)'
            : 'linear-gradient(180deg, rgba(15,23,42,.45) 0%, rgba(15,23,42,.2) 45%, rgba(15,23,42,.75) 100%)'
        }}
      />

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,.25)' }}>
        <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, background: THEME.accent, transition: 'width .2s linear' }} />
      </div>

      <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <span style={{ ...GLASS, borderRadius: 999, padding: '7px 13px', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
          <span aria-hidden="true" style={{ display: 'inline-flex', gap: 2, alignItems: 'flex-end', height: 11 }}>
            {[0, 0.15, 0.3, 0.45].map((d) => (
              <i key={d} style={{ width: 2.5, height: 3, background: '#9cc2f0', borderRadius: 1, animation: `k360IntroWave 1s ${d}s infinite ease-in-out` }} />
            ))}
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place || tour.agency_name || 'Kvadrat360'}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            audio.pause();
            finish();
          }}
          style={{ ...GLASS, borderRadius: 999, padding: '8px 14px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: THEME.fontBody }}
        >
          {skipLabel}
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 'max(28px, env(safe-area-inset-bottom))',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'center',
          maxWidth: 560,
          margin: '0 auto'
        }}
      >
        {shown.map((c) => (
          <span
            key={c.key}
            className="k360-intro-chip"
            style={{
              borderRadius: 12,
              padding: '9px 13px',
              fontSize: 15,
              fontWeight: 800,
              color: '#fff',
              background: 'rgba(15,23,42,.8)',
              border: '1px solid rgba(255,255,255,.18)',
              display: 'flex',
              gap: 7,
              alignItems: 'center',
              animation: 'k360IntroChip .45s cubic-bezier(.3,1.5,.5,1) both',
              fontFamily: THEME.fontDisplay
            }}
          >
            <span aria-hidden="true">{c.icon}</span>
            {c.text}
          </span>
        ))}
      </div>
    </div>
  );
}
