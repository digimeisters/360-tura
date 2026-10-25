'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { NEARBY_CATEGORIES, NEARBY_LABELS, walkMinutes, type NearbyCategory, type NearbyPlace } from '../../app/lib/nearby';

// Linijske ikonice po vrsti mesta (dizajn v2 strane projekta - bez emodžija).
const CAT_ICON: Record<NearbyCategory, string> = {
  school: 'M3 9l9-5 9 5-9 5-9-5ZM7 11v5c0 1.5 2.2 3 5 3s5-1.5 5-3v-5',
  kindergarten: 'M12 7a2 2 0 1 0 0-.01M8 21l1-7-2-3 5-2 5 2-2 3 1 7',
  shop: 'M3 4h2l2 12h11l2-8H6M9 20h.01M17 20h.01',
  pharmacy: 'M10 14l4-4M7 17a4 4 0 0 1 0-6l4-4a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0Z',
  health: 'M12 5v14M5 12h14',
  bus: 'M5 17V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v11M5 11h14M7 17v2M17 17v2M8 14h.01M16 14h.01',
  park: 'M12 22v-6M7 16h10l-5-12-5 12Z'
};
import { PROJECT_TEXT, type ProjectLang } from '../../app/lib/projectI18n';

/**
 * „Šta je u blizini" na strani projekta: mapa (Leaflet, samo u pregledaču)
 * i spisak po kategorijama sa minutima hoda. Podaci su u projects.nearby
 * (migracija 022), puni ih admin dugmetom „Pronađi okolinu".
 */

const ProjectNearbyMap = dynamic(() => import('./ProjectNearbyMap'), {
  ssr: false,
  loading: () => <div className="inv-nearby-map is-loading" />
});

export default function ProjectNearby({
  lat,
  lng,
  title,
  places,
  lang = 'sr'
}: {
  lat: number;
  lng: number;
  title: string;
  places: NearbyPlace[];
  lang?: ProjectLang;
}) {
  const t = PROJECT_TEXT[lang];
  const [active, setActive] = useState<number | null>(null);
  const cats = NEARBY_CATEGORIES.filter((c) => places.some((p) => p.cat === c));

  return (
    <section className="inv-nearby" id="okolina">
      <h2>{t.nearbyTitle}</h2>
      <p className="inv-nearby-note">{t.nearbyNote}</p>
      <div className="inv-nearby-grid">
        <ProjectNearbyMap lat={lat} lng={lng} title={title} places={places} lang={lang} active={active} />
        {cats.length > 0 && (
          <div className="inv-nearby-list">
            {cats.map((c) => (
              <div key={c} className="inv-nearby-cat">
                <b>
                  <span className="inv-nearby-ico" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d={CAT_ICON[c]} />
                    </svg>
                  </span>{' '}
                  {NEARBY_LABELS[lang][c]}
                </b>
                {places.map((p, i) =>
                  p.cat === c ? (
                    <button key={i} type="button" onClick={() => setActive(i)} aria-pressed={active === i}>
                      <span>{p.name || NEARBY_LABELS[lang][c]}</span>
                      <small>
                        {walkMinutes(p.m)} {t.walkMin}
                      </small>
                    </button>
                  ) : null
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="inv-nearby-src">{t.nearbySource}</p>
    </section>
  );
}
