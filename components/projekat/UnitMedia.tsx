'use client';

import { useState } from 'react';
import { formatArea, PROJECT_TEXT, type ProjectLang } from '../../app/lib/projectI18n';

/**
 * Kartice u kartici stana (migracija 024, po uzoru na 3d.sokolis.rs):
 * Osnova / 360° tura / 3D osnova / Slike - prikazuju se samo one koje stan
 * ima. 360° tura se otvara u okviru kartice (iframe), uz link preko celog
 * ekrana. Osnova i 3D osnova se klikom otvaraju u punoj veličini.
 */

type Tab = 'plan' | 'tour' | 'plan3d' | 'photos';

export default function UnitMedia({
  planUrl,
  plan3dUrl,
  photos,
  tourHref,
  code,
  lang = 'sr'
}: {
  planUrl: string | null;
  plan3dUrl: string | null;
  photos: string[];
  tourHref: string | null;
  code: string;
  lang?: ProjectLang;
}) {
  const t = PROJECT_TEXT[lang];
  const tabs: { id: Tab; label: string }[] = [];
  if (planUrl) tabs.push({ id: 'plan', label: t.tabPlan });
  if (tourHref) tabs.push({ id: 'tour', label: t.tab360 });
  if (plan3dUrl) tabs.push({ id: 'plan3d', label: t.tab3d });
  if (photos.length) tabs.push({ id: 'photos', label: t.tabPhotos });
  const [tab, setTab] = useState<Tab | null>(tabs[0]?.id ?? null);
  const [photo, setPhoto] = useState(0);
  if (!tabs.length || !tab) return null;

  const tourUrl = tourHref ? (lang === 'en' ? `${tourHref}?lang=en` : tourHref) : null;
  const image = (src: string, alt: string) => (
    <a href={src} target="_blank" rel="noopener noreferrer" className="inv-um-img">
      {/* eslint-disable-next-line @next/next/no-img-element -- slika sa R2 CDN-a */}
      <img src={src} alt={alt} loading="lazy" />
    </a>
  );

  return (
    <div className="inv-um">
      {tabs.length > 1 && (
        <div className="inv-um-tabs" role="tablist">
          {tabs.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)}>
              {x.label}
            </button>
          ))}
        </div>
      )}
      <div className="inv-um-stage">
        {tab === 'plan' && planUrl && image(planUrl, `${t.tabPlan} · ${code}`)}
        {tab === 'plan3d' && plan3dUrl && image(plan3dUrl, `${t.tab3d} · ${code}`)}
        {tab === 'tour' && tourUrl && (
          <>
            <iframe src={tourUrl} title={`${t.tab360} · ${code}`} loading="lazy" allow="fullscreen; gyroscope; accelerometer" />
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
