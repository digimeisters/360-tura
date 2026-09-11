'use client';

import { useRef, useState } from 'react';
import type { ShowcaseTour } from '../app/lib/showcaseTours';
import type { HomeLang } from '../app/lib/homeCopy';
import { tourHref as buildTourHref } from '../app/lib/tourHref';

const LABELS: Record<HomeLang, { empty: string; open: string; langs: string; rooms: string }> = {
  sr: { empty: 'Primer ture stiže uskoro.', open: '▶ Otvori turu', langs: 'Jezici ture', rooms: 'Prostorije u turi' },
  en: { empty: 'A sample tour is coming soon.', open: '▶ Open the tour', langs: 'Tour languages', rooms: 'Rooms in the tour' }
};

/**
 * Kadar u vrhu početne strane: prava tura sa izgledom aplikacije preko nje -
 * naziv, jezici, čipovi soba i info-kartica, isti oblici kao u samoj turi.
 * Čipovi menjaju sliku u sličicu te sobe; ceo pregled vodi na pravu turu.
 */
export default function HeroDevice({ tour, lang = 'sr' }: { tour: ShowcaseTour | null; lang?: HomeLang }) {
  const [activeId, setActiveId] = useState<string | null>(tour?.coverRoomId ?? tour?.rooms[0]?.id ?? null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const latestRequest = useRef<string | null>(null);
  const t = LABELS[lang];

  if (!tour || tour.rooms.length === 0) {
    return (
      <div className="device device-empty">
        <p>{t.empty}</p>
      </div>
    );
  }

  const room = tour.rooms.find((r) => r.id === activeId) ?? tour.rooms[0];

  // Nova slika se prvo dekodira pa tek onda menja, da kadar ne ostane prazan
  // dok se sličica skida. Ako se u međuvremenu klikne druga soba, važi
  // poslednji klik.
  const selectRoom = (id: string) => {
    const target = tour.rooms.find((r) => r.id === id);
    if (!target || id === room.id) return;
    latestRequest.current = id;
    setPendingId(id);

    const img = new Image();
    img.src = target.previewUrl;
    img
      .decode()
      .catch(() => {})
      .finally(() => {
        if (latestRequest.current !== id) return;
        setActiveId(id);
        setPendingId(null);
      });
  };

  // Zagreje keš čim miš pređe preko čipa - do klika je slika obično već tu.
  const warm = (url: string) => {
    const img = new Image();
    img.src = url;
  };

  const tourHref = buildTourHref(tour.slug, tour.languages, lang);
  // Istaknut je jezik strane ako ga tura ima, inače prvi (srpski).
  const activeLang = tour.languages.includes(lang) ? lang : tour.languages[0];

  return (
    <div className="device">
      {/* eslint-disable-next-line @next/next/no-img-element -- sličice su već
          1200x630 JPG sa CDN-a, next/image ne bi imao šta da optimizuje */}
      <img className="device-img" src={room.previewUrl} alt={`${tour.title}, ${room.title}`} decoding="async" />

      <div className="d-top">
        <div className="d-title">
          {tour.agency && <small>{tour.agency}</small>}
          <strong>{tour.title}</strong>
        </div>
        <div className="d-langs" aria-label={t.langs}>
          {tour.languages.map((l) => (
            <span key={l} className={l === activeLang ? 'on' : undefined}>
              {l.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      <div className="d-rooms" role="group" aria-label={t.rooms}>
        {tour.rooms.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={r.id === room.id}
            aria-busy={r.id === pendingId}
            onClick={() => selectRoom(r.id)}
            onPointerEnter={() => warm(r.previewUrl)}
            onFocus={() => warm(r.previewUrl)}
          >
            🚪 {r.title}
          </button>
        ))}
      </div>

      <div className="d-info">
        <h4>{room.title}</h4>
        {room.narration && <p>{room.narration}</p>}
        <a className="d-open" href={tourHref} data-track="cta:hero_device_tour">
          {t.open}
        </a>
      </div>
    </div>
  );
}
