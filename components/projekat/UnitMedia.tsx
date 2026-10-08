'use client';

import { useEffect, useState } from 'react';
import { formatArea, PROJECT_TEXT, type ProjectLang } from '../../app/lib/projectI18n';
import type { Polygon } from '../../app/lib/projects';
import type { DemoMedia } from '../../app/lib/projectData';
import UnitPlanCrop from './UnitPlanCrop';

/**
 * Kartice u kartici stana (migracija 024, po uzoru na 3d.sokolis.rs):
 * Osnova / 360° tura / 3D osnova / Slike - prikazuju se samo one koje stan
 * ima. 360° tura se otvara u okviru kartice (iframe), uz link preko celog
 * ekrana. Osnova i 3D osnova se klikom otvaraju u punoj veličini.
 *
 * Stan bez svoje osnove, a iscrtan na osnovi sprata: kartica „Osnova"
 * prikazuje isečak osnove sprata (UnitPlanCrop). `large` = strana stana
 * (veći prikaz, kartice kao dugmad preko cele širine).
 *
 * `demo` (projects.show_all_tabs, migracija 026 - prezentacija): sve četiri
 * kartice uvek. Stan bez ture dobija demo turu (sa oznakom „Primer ture"),
 * bez slika rendere zgrade, a ostalo oznaku „uskoro".
 */

type Tab = 'plan' | 'tour' | 'plan3d' | 'photos';

const svgProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  plan: (
    <svg {...svgProps}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
      <path d="M3.5 11h7M10.5 3.5v11M14 20.5V14h6.5" />
    </svg>
  ),
  tour: (
    <svg {...svgProps}>
      <ellipse cx="12" cy="12" rx="8.5" ry="3.5" />
      <path d="M12 3.5a8.5 8.5 0 1 1 0 17" />
      <path d="M16.5 17.8l-1.6 1.9 2.3.9" />
    </svg>
  ),
  plan3d: (
    <svg {...svgProps}>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
    </svg>
  ),
  photos: (
    <svg {...svgProps}>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M20.5 16l-5-5-8.5 8" />
    </svg>
  )
};

const ZOOM_ICON = (
  <svg {...svgProps}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="M15 15l5 5M10.5 8v5M8 10.5h5" />
  </svg>
);

export default function UnitMedia({
  planUrl,
  plan3dUrl,
  photos: ownPhotos,
  tourHref: ownTour,
  code,
  lang = 'sr',
  fallbackPlan = null,
  large = false,
  demo = null
}: {
  planUrl: string | null;
  plan3dUrl: string | null;
  photos: string[];
  tourHref: string | null;
  code: string;
  lang?: ProjectLang;
  fallbackPlan?: { src: string; polygon: Polygon } | null;
  large?: boolean;
  demo?: DemoMedia | null;
}) {
  const t = PROJECT_TEXT[lang];
  const all = Boolean(demo);
  const tourHref = ownTour ?? demo?.tourHref ?? null;
  const tourIsDemo = !ownTour && Boolean(tourHref);
  const photos = ownPhotos.length ? ownPhotos : (demo?.photos ?? []);
  const tabs: { id: Tab; label: string }[] = [];
  if (planUrl || fallbackPlan || all) tabs.push({ id: 'plan', label: t.tabPlan });
  if (tourHref || all) tabs.push({ id: 'tour', label: t.tab360 });
  if (plan3dUrl || all) tabs.push({ id: 'plan3d', label: t.tab3d });
  if (photos.length || all) tabs.push({ id: 'photos', label: t.tabPhotos });
  const [tab, setTab] = useState<Tab | null>(tabs[0]?.id ?? null);
  const [photo, setPhoto] = useState(0);
  const [cropOpen, setCropOpen] = useState(false);

  useEffect(() => {
    if (!cropOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setCropOpen(false);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [cropOpen]);

  if (!tabs.length || !tab) return null;

  const tourUrl = tourHref ? (lang === 'en' ? `${tourHref}?lang=en` : tourHref) : null;
  // Prazna kartica u prezentaciji: oznaka umesto sadržaja.
  const soon = (label: string) => (
    <div className="inv-um-soon">
      <b>{label}</b>
      <small>{t.soonTab}</small>
    </div>
  );
  const image = (src: string, alt: string) => (
    <a href={src} target="_blank" rel="noopener noreferrer" className="inv-um-img">
      {/* eslint-disable-next-line @next/next/no-img-element -- slika sa R2 CDN-a */}
      <img src={src} alt={alt} loading="lazy" />
      {large && (
        <span className="inv-um-zoom">
          {ZOOM_ICON}
          {t.zoom}
        </span>
      )}
    </a>
  );
  const dark = tab === 'plan3d' && Boolean(plan3dUrl);

  return (
    <div className={large ? 'inv-um is-large' : 'inv-um'}>
      {(tabs.length > 1 || large) && (
        <div className="inv-um-tabs" role="tablist">
          {tabs.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)}>
              {large && TAB_ICONS[x.id]}
              {x.label}
            </button>
          ))}
        </div>
      )}
      <div className={dark ? 'inv-um-stage is-dark' : 'inv-um-stage'}>
        {tab === 'plan' && planUrl && image(planUrl, `${t.tabPlan} · ${code}`)}
        {tab === 'plan' && !planUrl && fallbackPlan && !large && (
          <UnitPlanCrop src={fallbackPlan.src} polygon={fallbackPlan.polygon} alt={`${t.tabPlan} · ${code}`} />
        )}
        {tab === 'plan' && !planUrl && fallbackPlan && large && (
          <button type="button" className="inv-um-cropbtn" onClick={() => setCropOpen(true)} aria-label={`${t.zoom}: ${t.tabPlan} · ${code}`}>
            <UnitPlanCrop src={fallbackPlan.src} polygon={fallbackPlan.polygon} alt={`${t.tabPlan} · ${code}`} tall />
            <span className="inv-um-zoom">
              {ZOOM_ICON}
              {t.zoom}
            </span>
          </button>
        )}
        {tab === 'plan' && !planUrl && !fallbackPlan && soon(t.tabPlan)}
        {tab === 'plan3d' && plan3dUrl && image(plan3dUrl, `${t.tab3d} · ${code}`)}
        {tab === 'plan3d' && !plan3dUrl && soon(t.tab3d)}
        {tab === 'tour' && !tourUrl && soon(t.tab360)}
        {tab === 'photos' && !photos.length && soon(t.tabPhotos)}
        {tab === 'tour' && tourUrl && (
          <>
            <iframe src={tourUrl} title={`${t.tab360} · ${code}`} loading="lazy" allow="fullscreen; gyroscope; accelerometer" />
            {tourIsDemo && <span className="inv-um-demo">{t.demoTour}</span>}
            <a className="inv-um-full" href={tourUrl} target="_blank" rel="noopener noreferrer" data-track="cta:project_unit_tour">
              {t.fullscreen}
            </a>
          </>
        )}
        {tab === 'photos' && photos.length > 0 && (
          <>
            {image(photos[Math.min(photo, photos.length - 1)], `${t.tabPhotos} · ${code}`)}
            {photos.length > 1 && (
              <div className="inv-um-nav">
                <button type="button" aria-label="←" onClick={() => setPhoto((p) => (p - 1 + photos.length) % photos.length)}>
                  ‹
                </button>
                <span>{t.photoOf(Math.min(photo, photos.length - 1) + 1, photos.length)}</span>
                <button type="button" aria-label="→" onClick={() => setPhoto((p) => (p + 1) % photos.length)}>
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {cropOpen && fallbackPlan && (
        <div className="inv-um-lightbox" role="dialog" aria-modal="true" aria-label={`${t.tabPlan} · ${code}`} onClick={() => setCropOpen(false)}>
          <button type="button" className="inv-um-lightbox-x" aria-label="×" onClick={() => setCropOpen(false)}>
            ×
          </button>
          <div className="inv-um-lightbox-body" onClick={(e) => e.stopPropagation()}>
            <UnitPlanCrop src={fallbackPlan.src} polygon={fallbackPlan.polygon} alt={`${t.tabPlan} · ${code}`} full />
          </div>
        </div>
      )}
    </div>
  );
}

/** Tabela kvadrature po prostorijama, sa zbirom. */
export function UnitRooms({ rooms, lang = 'sr' }: { rooms: { name: string; m2: number }[]; lang?: ProjectLang }) {
  if (!rooms.length) return null;
  const t = PROJECT_TEXT[lang];
  const total = Math.round(rooms.reduce((s, r) => s + r.m2, 0) * 100) / 100;
  return (
    <div className="inv-rooms">
      <span className="inv-rooms-title">{t.roomsTitle}</span>
      <table>
        <tbody>
          {rooms.map((r, i) => (
            <tr key={i}>
              <td>{r.name}</td>
              <td>{formatArea(r.m2, lang)}</td>
            </tr>
          ))}
          <tr className="is-total">
            <td>{t.roomsTotal}</td>
            <td>{formatArea(total, lang)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
