'use client';

import { useRef, useState } from 'react';
import type { ShowcaseTour } from '../app/lib/showcaseTours';

/**
 * Kadar u vrhu početne strane: prava tura sa izgledom aplikacije preko nje -
 * naziv, jezici, čipovi soba i info-kartica, isti oblici kao u samoj turi.
 * Čipovi menjaju sliku u sličicu te sobe; ceo pregled vodi na pravu turu.
 */
export default function HeroDevice({ tour }: { tour: ShowcaseTour | null }) {
  const [activeId, setActiveId] = useState<string | null>(tour?.coverRoomId ?? tour?.rooms[0]?.id ?? null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const latestRequest = useRef<string | null>(null);

  if (!tour || tour.rooms.length === 0) {
    return (
      <div className="device device-empty">
        <p>Primer ture stiže uskoro.</p>
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

  const tourHref = `/tour/${tour.slug}`;

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
        <div className="d-langs" aria-label="Jezici ture">
          {tour.languages.map((l, i) => (
            <span key={l} className={i === 0 ? 'on' : undefined}>
              {l.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      <div className="d-rooms" role="group" aria-label="Prostorije u turi">
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
        <a className="d-open" href={tourHref}>
          ▶ Otvori turu
        </a>
      </div>
    </div>
  );
}
