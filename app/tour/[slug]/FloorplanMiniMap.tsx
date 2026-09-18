'use client';

import type { Language, Room } from './types';
import { THEME, GLASS } from './theme';
import { getLocalizedText } from './utils';
import { IconExpand } from './icons';

type FloorplanMiniMapProps = {
  floorplanUrl: string;
  rooms: Room[];
  currentRoomId: Room['id'] | undefined;
  seenRoomIds: Set<string>;
  lang: Language;
  onSelectRoom: (roomId: Room['id']) => void;
  onExpand: () => void;
  labels: { title: string; expand: string };
};

// Ista plava kao tačka na vratima i u traci sa sobama.
const DOT_BLUE = '#5B92D6';

/**
 * Mali tlocrt u donjem levom uglu: gde je posetilac, koje je sobe video,
 * klik na sobu vodi u nju. Na uskom ekranu nema mesta za njega - tamo se
 * skica otvara iz donjeg menija ("Skica").
 */
export function FloorplanMiniMap({
  floorplanUrl,
  rooms,
  currentRoomId,
  seenRoomIds,
  lang,
  onSelectRoom,
  onExpand,
  labels
}: FloorplanMiniMapProps) {
  const marked = rooms.filter((r) => typeof r.floorplan_x === 'number' && typeof r.floorplan_y === 'number');
  if (!marked.length) return null;

  return (
    <div className="k360-minimap" style={{ ...GLASS }}>
      <style>{`
        /* Ova skica se već prikazuje samo od 1024px (pravilo ispod), pa joj
           uvećanje ne treba u posebnom media upitu - uvek je "na računaru". */
        .k360-minimap { position: absolute; left: 12px; bottom: 12px; z-index: 34; width: 232px; padding: 8px 8px 9px;
          border-radius: 16px; color: #fff; font-family: ${THEME.fontBody}; zoom: 1.122; }
        .k360-minimap__head { display: flex; align-items: center; justify-content: space-between; padding: 0 2px 6px 4px; }
        .k360-minimap__label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: rgba(255, 255, 255, 0.72); }
        .k360-minimap__expand { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; padding: 0;
          border: none; border-radius: 50%; background: rgba(255, 255, 255, 0.1); color: #fff; cursor: pointer; }
        .k360-minimap__expand:hover { background: rgba(255, 255, 255, 0.22); }
        .k360-minimap__planwrap { display: flex; justify-content: center; }
        .k360-minimap__plan { position: relative; line-height: 0; }
        .k360-minimap__plan img { display: block; max-width: 100%; max-height: 180px; border-radius: 10px; background: #fff; }
        .k360-minimap__dot { position: absolute; transform: translate(-50%, -50%); padding: 0; cursor: pointer; border-radius: 50%;
          width: 10px; height: 10px; border: 2px solid #fff; background: rgba(15, 23, 42, 0.55);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35); transition: transform 0.15s ease; }
        .k360-minimap__dot:hover { transform: translate(-50%, -50%) scale(1.35); }
        .k360-minimap__dot[data-state="seen"] { background: #fff; border-color: #334155; }
        .k360-minimap__dot[data-state="current"] { width: 14px; height: 14px; background: ${DOT_BLUE}; border-color: #fff; z-index: 1; }
        .k360-minimap__dot[data-state="current"]::after { content: ''; position: absolute; inset: -6px; border-radius: 50%;
          border: 2px solid ${DOT_BLUE}; animation: k360MinimapPulse 1.8s ease-out infinite; }
        .k360-minimap :focus-visible { outline: 2px solid ${DOT_BLUE}; outline-offset: 2px; }
        @keyframes k360MinimapPulse { from { transform: scale(0.6); opacity: 1; } to { transform: scale(1.6); opacity: 0; } }
        @media (max-width: 1023px) { .k360-minimap { display: none; } }
        @media (prefers-reduced-motion: reduce) { .k360-minimap__dot[data-state="current"]::after { animation: none; } }
      `}</style>

      <div className="k360-minimap__head">
        <span className="k360-minimap__label">{labels.title}</span>
        <button type="button" className="k360-minimap__expand" onClick={onExpand} title={labels.expand} aria-label={labels.expand}>
          <IconExpand size={14} />
        </button>
      </div>

      {/* Omotač je tačno veličine slike (i kad je skica visoka pa je slika
          uža od kartice), pa procenti oznaka pogađaju iste tačke kao u
          prozoru "Skica" gde ih admin postavlja. */}
      <div className="k360-minimap__planwrap">
      <div className="k360-minimap__plan">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={floorplanUrl} alt="" />
        {marked.map((room) => {
          const isCurrent = String(room.id) === String(currentRoomId);
          const state = isCurrent ? 'current' : seenRoomIds.has(String(room.id)) ? 'seen' : 'unseen';
          const name = getLocalizedText(room.title_i18n, lang);
          return (
            <button
              key={room.id}
              type="button"
              className="k360-minimap__dot"
              data-state={state}
              style={{ left: `${room.floorplan_x}%`, top: `${room.floorplan_y}%` }}
              onClick={() => { if (!isCurrent) onSelectRoom(room.id); }}
              title={name}
              aria-label={name}
              aria-current={isCurrent ? 'location' : undefined}
            />
          );
        })}
      </div>
      </div>
    </div>
  );
}
