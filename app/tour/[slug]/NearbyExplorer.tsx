'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { NEARBY_CATEGORIES, NEARBY_ICONS, NEARBY_LABELS, RADIUS_M, walkMinutes, type NearbyCategory, type NearbyPlace } from '../../lib/nearby';
import { THEME } from './theme';
import type { Language } from './types';

/**
 * "Istraži okolinu" (prozor Lokacija): ceo ekran preko ture - mapa sa krugom
 * od ~15 min hoda, filteri po vrsti i spisak sa minutima. Tura ispod se ne
 * dira, pa ✕ vraća kupca na isti pogled. Dugme "nazad" na telefonu hvata
 * useBackGuard ture (zatvara prozor Lokacija zajedno sa ovim).
 *
 * Mapa je ista kao na strani projekta (MapLibre), učitava se tek ovde.
 */

const NearbyMap = dynamic(() => import('../../../components/projekat/ProjectNearbyMap'), {
  ssr: false,
  loading: () => <div style={{ width: '100%', height: '100%', background: '#EEF1EA' }} />
});

type Filter = NearbyCategory | 'all';

const fill = (text: string, vars: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));

export default function NearbyExplorer({
  lat,
  lng,
  address,
  places,
  lang,
  t,
  onClose
}: {
  lat: number;
  lng: number;
  address: string;
  places: NearbyPlace[];
  lang: Language;
  t: Record<string, string>;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [active, setActive] = useState<number | null>(null);
  const labels = NEARBY_LABELS[lang];

  const cats = NEARBY_CATEGORIES.filter((c) => places.some((p) => p.cat === c));
  // Spisak je sortiran po vrsti pa po udaljenosti; indeks u njemu je i indeks za mapu.
  const shown = useMemo(
    () =>
      places
        .filter((p) => filter === 'all' || p.cat === filter)
        .sort((a, b) => NEARBY_CATEGORIES.indexOf(a.cat) - NEARBY_CATEGORIES.indexOf(b.cat) || a.m - b.m),
    [places, filter]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pickFilter = (f: Filter) => {
    setFilter(f);
    setActive(null);
  };

  // Portal u <body>: prozori ture su u .tour-ui-scale (CSS zoom na velikim
  // ekranima), a MapLibre pod zoom-om pogrešno računa gde je klik i prevlačenje.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.nearbyAreaTitle}
      className="k360-nearby"
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: THEME.bg, fontFamily: THEME.fontBody, color: THEME.textPrimary }}
    >
      <style>{`
.k360-nearby{display:flex;flex-direction:column}
.k360-nearby__map{position:relative;flex:0 0 42%}
.k360-nearby__side{flex:1;min-height:0;display:flex;flex-direction:column}
.k360-nearby__filters{display:flex;gap:6px;padding:10px 12px 8px;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid ${THEME.border}}
.k360-nearby__filters::-webkit-scrollbar{display:none}
.k360-nearby__list{flex:1;overflow-y:auto;padding:4px 12px 8px}
@media (min-width:821px){.k360-nearby{flex-direction:row}.k360-nearby__map{flex:1.3 1 0}.k360-nearby__side{flex:1 1 0;border-left:1px solid ${THEME.border}}}
`}</style>

      <div className="k360-nearby__map">
        <NearbyMap
          lat={lat}
          lng={lng}
          title={address || t.nearbyAreaTitle}
          places={shown}
          lang={lang === 'sr' ? 'sr' : 'en'}
          active={active}
          radiusM={RADIUS_M}
          fill
        />
        <div
          style={{
            // Dole levo: gore levo su dugmad za zum mape, dole desno izvor (ⓘ).
            position: 'absolute',
            bottom: 12,
            left: 12,
            zIndex: 3,
            maxWidth: '70%',
            pointerEvents: 'none',
            background: 'rgba(255,255,255,.95)',
            borderRadius: 14,
            padding: '7px 11px',
            boxShadow: '0 2px 8px rgba(0,0,0,.15)',
            fontSize: 11.5,
            color: THEME.textSecondary
          }}
        >
          <b style={{ display: 'block', fontFamily: THEME.fontDisplay, color: THEME.textPrimary, fontSize: 15 }}>{t.nearbyAreaTitle}</b>
          {address}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 3,
            width: 44,
            height: 44,
            border: 'none',
            borderRadius: '50%',
            background: 'rgba(255,255,255,.95)',
            boxShadow: '0 2px 8px rgba(0,0,0,.2)',
            fontSize: 16,
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>

      <div className="k360-nearby__side">
        <div className="k360-nearby__filters" role="group" aria-label={t.nearbyAreaTitle}>
          {(['all', ...cats] as Filter[]).map((f) => {
            const on = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => pickFilter(f)}
                aria-pressed={on}
                style={{
                  flex: 'none',
                  minHeight: 36,
                  padding: '0 12px',
                  borderRadius: 999,
                  border: `1.5px solid ${on ? THEME.accent : '#DCE3EE'}`,
                  background: on ? THEME.accent : '#fff',
                  color: on ? '#fff' : THEME.textPrimary,
                  fontSize: 12.5,
                  fontWeight: 600,
                  fontFamily: THEME.fontBody,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                {f === 'all' ? t.nearbyAll : `${NEARBY_ICONS[f]} ${labels[f]}`}
              </button>
            );
          })}
        </div>

        <div className="k360-nearby__list">
          {shown.map((p, i) => {
            const first = i === 0 || shown[i - 1].cat !== p.cat;
            return (
              <div key={`${p.cat}-${p.lat}-${p.lng}`}>
                {first && (
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: THEME.textMuted, margin: '12px 0 4px' }}>
                    {NEARBY_ICONS[p.cat]} {labels[p.cat]}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-pressed={active === i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    minHeight: 44,
                    padding: '8px 10px',
                    border: 'none',
                    borderRadius: 12,
                    background: active === i ? THEME.accentSoft : 'transparent',
                    textAlign: 'left',
                    fontFamily: THEME.fontBody,
                    fontSize: 14,
                    color: THEME.textPrimary,
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name || labels[p.cat]}</span>
                  <span style={{ fontSize: 12, color: THEME.textSecondary, whiteSpace: 'nowrap' }}>
                    {fill(t.nearbyM, { m: Math.round(p.m / 10) * 10 })} ·{' '}
                    <b style={{ color: THEME.textPrimary, fontFamily: THEME.fontDisplay, fontSize: 14 }}>{fill(t.nearbyMin, { n: walkMinutes(p.m) })}</b>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
        <p style={{ margin: 0, padding: '6px 12px 12px', fontSize: 11, color: THEME.textMuted }}>{t.nearbySource}</p>
      </div>
    </div>,
    document.body
  );
}
