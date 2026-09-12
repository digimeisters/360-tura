'use client';

import { useEffect, useRef, useState } from 'react';
import type { Language, Room } from './types';
import { THEME } from './theme';
import { getLocalizedText } from './utils';
import { IconChevronDown } from './icons';

export type RoomDot = 'seen' | 'current' | 'unseen';

type RoomNavBarProps = {
  rooms: Room[];
  roomIdx: number;
  lang: Language;
  /** "Prostorija 3 od 10" ili, u automatskom modu, napredak vodiča. */
  label: string;
  /** Po jedna tačkica za svaku sobu (u automatskom modu: za svaku sobu putanje). */
  dots: RoomDot[];
  seenRoomIds: Set<string>;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSelectRoom: (roomId: Room['id']) => void;
  labels: { prev: string; next: string; chooseRoom: string };
};

// Preko ovoliko soba tačkice postaju sitne i gube smisao - tada linija.
const MAX_DOTS = 15;
// Ista plava kao tačka na navigacionim hotspotovima (theme.ts).
const DOT_BLUE = '#5B92D6';

const roomTitle = (room: Room, idx: number, lang: Language) =>
  getLocalizedText(room.title_i18n, lang) || `Soba ${idx + 1}`;

export function RoomNavBar({
  rooms,
  roomIdx,
  lang,
  label,
  dots,
  seenRoomIds,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onSelectRoom,
  labels
}: RoomNavBarProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    activeItemRef.current?.scrollIntoView({ block: 'nearest' });
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = rooms[roomIdx];
  if (!current) return null;

  const reached = dots.filter((d) => d !== 'unseen').length;

  return (
    <div ref={wrapRef} className="k360-roomnav">
      <style>{`
        .k360-roomnav { position: relative; display: flex; align-items: center; gap: 8px; max-width: 100%;
          pointer-events: auto; font-family: ${THEME.fontBody}; color: #fff; }
        .k360-roomnav button { font-family: inherit; color: inherit; }
        .k360-roomnav__glass { background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.28);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25); }
        .k360-roomnav__step { flex: none; width: 40px; height: 40px; border-radius: 50%; display: flex;
          align-items: center; justify-content: center; font-size: 22px; line-height: 1; padding: 0 0 2px;
          cursor: pointer; transition: background 0.15s ease, transform 0.15s ease; }
        .k360-roomnav__step:not(:disabled):hover { background: rgba(15, 23, 42, 0.75); transform: scale(1.06); }
        .k360-roomnav__step:disabled { opacity: 0.35; cursor: default; }
        .k360-roomnav__current { display: flex; flex-direction: column; align-items: flex-start; gap: 5px;
          min-width: 0; padding: 8px 16px 9px; border-radius: 16px; cursor: pointer; text-align: left;
          transition: background 0.15s ease; }
        .k360-roomnav__current:hover { background: rgba(15, 23, 42, 0.7); }
        .k360-roomnav__label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase;
          color: rgba(255, 255, 255, 0.72); white-space: nowrap; font-variant-numeric: tabular-nums; }
        .k360-roomnav__title { display: flex; align-items: center; gap: 8px; max-width: 100%; }
        .k360-roomnav__name { font-family: ${THEME.fontDisplay}; font-size: 17px; font-weight: 700; line-height: 1.15;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px; }
        .k360-roomnav__caret { flex: none; display: flex; color: ${DOT_BLUE}; transition: transform 0.15s ease; }
        .k360-roomnav__caret[data-open="true"] { transform: rotate(180deg); }
        .k360-roomnav__current:hover .k360-roomnav__caret { color: #fff; }
        .k360-roomnav__dots { display: flex; align-items: center; gap: 5px; }
        .k360-roomnav__dot { width: 6px; height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.28);
          transition: width 0.25s ease, background 0.25s ease; }
        .k360-roomnav__dot[data-state="seen"] { background: rgba(255, 255, 255, 0.9); }
        .k360-roomnav__dot[data-state="current"] { width: 16px; background: ${DOT_BLUE};
          box-shadow: 0 0 0 2px rgba(91, 146, 214, 0.3); }
        .k360-roomnav__line { width: 100%; min-width: 120px; height: 4px; border-radius: 2px; background: rgba(255, 255, 255, 0.25); overflow: hidden; }
        .k360-roomnav__line > span { display: block; height: 100%; background: ${DOT_BLUE}; border-radius: 2px; transition: width 0.3s ease; }
        .k360-roomnav :focus-visible { outline: 2px solid ${DOT_BLUE}; outline-offset: 2px; }
        .k360-roomnav__menu { position: absolute; top: calc(100% + 8px); left: 50%; transform: translateX(-50%);
          width: max-content; min-width: 240px; max-width: min(320px, calc(100vw - 24px)); max-height: min(60vh, 420px);
          overflow-y: auto; margin: 0; padding: 6px; list-style: none; border-radius: 16px; z-index: 40;
          background: rgba(15, 23, 42, 0.86); }
        .k360-roomnav__item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 10px;
          border: none; border-radius: 10px; background: transparent; font-size: 14px; text-align: left; cursor: pointer; }
        .k360-roomnav__item:hover { background: rgba(255, 255, 255, 0.1); }
        .k360-roomnav__item[aria-current="true"] { background: rgba(91, 146, 214, 0.28); font-weight: 600; }
        .k360-roomnav__num { min-width: 1.6em; color: rgba(255, 255, 255, 0.5); font-variant-numeric: tabular-nums; text-align: right; font-size: 12.5px; }
        .k360-roomnav__seen { margin-left: auto; padding-left: 12px; font-size: 11px; color: rgba(255, 255, 255, 0.45); }
        @media (max-width: 560px) {
          .k360-roomnav { gap: 6px; }
          .k360-roomnav__step { width: 36px; height: 36px; font-size: 20px; }
          .k360-roomnav__current { padding: 7px 13px 8px; }
          .k360-roomnav__name { font-size: 15px; max-width: 160px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .k360-roomnav *, .k360-roomnav__dot { transition: none !important; }
        }
      `}</style>

      <button
        type="button"
        className="k360-roomnav__step k360-roomnav__step--prev k360-roomnav__glass"
        onClick={onPrev}
        disabled={!canPrev}
        aria-label={labels.prev}
        title={labels.prev}
      >
        ‹
      </button>

      <button
        type="button"
        className="k360-roomnav__current k360-roomnav__glass"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={labels.chooseRoom}
      >
        <span className="k360-roomnav__label">{label}</span>
        <span className="k360-roomnav__title">
          <span className="k360-roomnav__name">{roomTitle(current, roomIdx, lang)}</span>
          <span className="k360-roomnav__caret" data-open={open} aria-hidden="true">
            <IconChevronDown size={16} />
          </span>
        </span>
        {dots.length > MAX_DOTS ? (
          <span className="k360-roomnav__line" aria-hidden="true">
            <span style={{ width: `${(reached / dots.length) * 100}%` }} />
          </span>
        ) : (
          <span className="k360-roomnav__dots" aria-hidden="true">
            {dots.map((state, i) => (
              <span key={i} className="k360-roomnav__dot" data-state={state} />
            ))}
          </span>
        )}
      </button>

      <button
        type="button"
        className="k360-roomnav__step k360-roomnav__step--next k360-roomnav__glass"
        onClick={onNext}
        disabled={!canNext}
        aria-label={labels.next}
        title={labels.next}
      >
        ›
      </button>

      {open && (
        <ul className="k360-roomnav__menu k360-roomnav__glass" role="listbox" aria-label={labels.chooseRoom}>
          {rooms.map((room, idx) => (
            <li key={room.id}>
              <button
                type="button"
                ref={idx === roomIdx ? activeItemRef : undefined}
                className="k360-roomnav__item"
                role="option"
                aria-selected={idx === roomIdx}
                aria-current={idx === roomIdx}
                onClick={() => {
                  setOpen(false);
                  onSelectRoom(room.id);
                }}
              >
                <span className="k360-roomnav__num">{idx + 1}</span>
                <span className="k360-roomnav__room">{roomTitle(room, idx, lang)}</span>
                {idx !== roomIdx && seenRoomIds.has(String(room.id)) && (
                  <span className="k360-roomnav__seen" aria-hidden="true">✓</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
