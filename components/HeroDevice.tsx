'use client';

import { useRef, useState } from 'react';
import type { ShowcaseTour } from '../app/lib/showcaseTours';
import type { HomeLang } from '../app/lib/homeCopy';
import { tourHref as buildTourHref } from '../app/lib/tourHref';

const LABELS: Record<
  HomeLang,
  { empty: string; open: string; langs: string; rooms: string; prev: string; next: string; position: string }
> = {
  sr: {
    empty: 'Primer ture stiže uskoro.',
    open: '▶ Otvori turu',
    langs: 'Jezici ture',
    rooms: 'Prostorije u turi',
    prev: 'Prethodna',
    next: 'Sledeća',
    position: 'Prostorija {current} od {total}'
  },
  en: {
    empty: 'A sample tour is coming soon.',
    open: '▶ Open the tour',
    langs: 'Tour languages',
    rooms: 'Rooms in the tour',
    prev: 'Previous',
    next: 'Next',
    position: 'Room {current} of {total}'
  }
};

/**
 * Kadar u vrhu početne strane: prava tura sa izgledom aplikacije preko nje.
 * Namerno ponavlja ONO ŠTO TURA DANAS ZAISTA IMA (app/tour/[slug]): tamno
 * staklo, traka "Prostorija X od Y" sa strelicama i kartica sa tekstom -
 * inače bi sajt reklamirao izgled koji posetilac posle ne vidi u turi.
 * Strelice menjaju sliku u sličicu te sobe; dugme vodi na pravu turu.
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
  const index = Math.max(0, tour.rooms.findIndex((r) => r.id === room.id));

  // Nova slika se prvo dekodira pa tek onda menja, da kadar ne ostane prazan
  // dok se sličica skida. Ako se u međuvremenu klikne druga soba, važi
  // poslednji klik.
  const selectRoom = (id: string | undefined) => {
    const target = id ? tour.rooms.find((r) => r.id === id) : undefined;
    if (!target || target.id === room.id) return;
    latestRequest.current = target.id;
    setPendingId(target.id);

    const img = new Image();
    img.src = target.previewUrl;
    img
      .decode()
      .catch(() => {})
      .finally(() => {
        if (latestRequest.current !== target.id) return;
        setActiveId(target.id);
        setPendingId(null);
      });
  };

  // Zagreje keš čim miš pređe preko strelice - do klika je slika obično već tu.
  const warm = (url: string | undefined) => {
    if (!url) return;
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
        <div className="d-title d-glass">
          {tour.agency && <small>{tour.agency}</small>}
          <strong>{tour.title}</strong>
        </div>
        <div className="d-langs d-glass" aria-label={t.langs}>
          {tour.languages.map((l) => (
            <span key={l} className={l === activeLang ? 'on' : undefined}>
              {l.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      <div className="d-nav" role="group" aria-label={t.rooms}>
        <button
          type="button"
          className="d-step d-glass"
          onClick={() => selectRoom(tour.rooms[index - 1]?.id)}
          onPointerEnter={() => warm(tour.rooms[index - 1]?.previewUrl)}
          disabled={index === 0}
          aria-label={t.prev}
          title={t.prev}
        >
          ‹
        </button>

        <div className="d-current d-glass" aria-busy={pendingId !== null}>
          <b>{t.position.replace('{current}', String(index + 1)).replace('{total}', String(tour.rooms.length))}</b>
          <span>{room.title}</span>
          <div className="d-dots" aria-hidden="true">
            {tour.rooms.map((r, i) => (
              <i key={r.id} className={i === index ? 'now' : i < index ? 'seen' : undefined} />
            ))}
          </div>
        </div>

        <button
          type="button"
          className="d-step d-glass"
          onClick={() => selectRoom(tour.rooms[index + 1]?.id)}
          onPointerEnter={() => warm(tour.rooms[index + 1]?.previewUrl)}
          disabled={index === tour.rooms.length - 1}
          aria-label={t.next}
          title={t.next}
        >
          ›
        </button>
      </div>

      <div className="d-info d-glass">
        <h4>{room.title}</h4>
        {room.narration && <p>{room.narration}</p>}
        <a className="d-open" href={tourHref} data-track="cta:hero_device_tour">
          {t.open}
        </a>
      </div>
    </div>
  );
}
