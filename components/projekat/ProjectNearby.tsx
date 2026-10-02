'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { NEARBY_CATEGORIES, NEARBY_ICONS, NEARBY_LABELS, walkMinutes, type NearbyPlace } from '../../app/lib/nearby';
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
                  <span aria-hidden="true">{NEARBY_ICONS[c]}</span> {NEARBY_LABELS[lang][c]}
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
