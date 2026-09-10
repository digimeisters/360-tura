'use client';

import { useState } from 'react';

const ROOMS = [
  { key: 'dnevna', label: 'Dnevna soba', yaw: 40 },
  { key: 'kuhinja', label: 'Kuhinja', yaw: 150 },
  { key: 'spavaca', label: 'Spavaća soba', yaw: 250 },
  { key: 'terasa', label: 'Terasa', yaw: 320 },
];

const LANGS = ['sr', 'en', 'de', 'ru'];

export default function HeroDevice() {
  const [roomIndex, setRoomIndex] = useState(0);
  const [lang, setLang] = useState('sr');
  const room = ROOMS[roomIndex];

  return (
    <div className="device">
      <div className="viewport">
        <span className="vp-label left">Panorama · Uživo</span>
        <span className="vp-label right">Yaw {String(room.yaw).padStart(3, '0')}°</span>
        <div className="compass">
          <svg viewBox="0 0 150 150">
            <circle className="ring" cx="75" cy="75" r="70" />
            <circle className="ring" cx="75" cy="75" r="46" />
            <line
              className="needle"
              x1="75"
              y1="75"
              x2="75"
              y2="20"
              style={{ transform: `rotate(${room.yaw}deg)` }}
            />
            <circle className="dot" cx="75" cy="75" r="5" />
          </svg>
        </div>
      </div>
      <div className="device-controls">
        <div className="ticker" role="tablist" aria-label="Prostorije">
          {ROOMS.map((r, i) => (
            <button
              key={r.key}
              type="button"
              aria-pressed={i === roomIndex}
              onClick={() => setRoomIndex(i)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="lang-tabs" role="tablist" aria-label="Jezik ture">
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={l === lang}
              onClick={() => setLang(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
