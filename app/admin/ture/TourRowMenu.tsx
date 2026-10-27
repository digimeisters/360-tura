'use client';

import { useEffect, useRef, useState } from 'react';
import { FORM, formBtnStyle } from '../../lib/formTheme';

/**
 * Dugme "⋯" u redu tabele tura: sve radnje osim Objavi/Izmeni/Otvori
 * (spec 2026-10-24-admin-okvir). Meni se crta preko position: fixed na
 * mestu dugmeta - kartica tabele ima overflowX: auto i odsekla bi ga - i
 * otvara se nagore kad ispod dugmeta nema mesta.
 */

type PropertyStatus = 'active' | 'rented' | 'sold' | 'paused';
export type TourRowAction = 'content' | 'plan' | 'intro' | 'nearby' | 'send' | 'live' | 'qr' | 'video' | 'snapshot' | 'embed' | 'delete';

const MENU_WIDTH = 230;
// Visina menija je stalna (isti spisak stavki); dovoljno tačno za odluku dole/gore.
const MENU_HEIGHT = 450;
const GAP = 6;

export default function TourRowMenu({
  slug,
  status,
  statusLabels,
  embedCopied,
  noPanorama = false,
  busy = false,
  onAction,
  onStatus
}: {
  slug: string;
  status: PropertyStatus;
  statusLabels: Record<PropertyStatus, string>;
  embedCopied: boolean;
  /** Nijedna soba nema panoramu - Video i Snimak nemaju od čega da se prave. */
  noPanorama?: boolean;
  busy?: boolean;
  onAction: (action: TourRowAction) => void;
  onStatus: (status: PropertyStatus) => void;
}) {
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; maxHeight: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = pos !== null;

  const toggle = () => {
    if (open) {
      setPos(null);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
    // Ispod dugmeta; ako tamo ne staje, na stranu sa više mesta. Kad ne staje
    // ni na jednu, meni dobija sopstveno pomeranje (niski prozori, telefon).
    const below = window.innerHeight - rect.bottom - GAP - 8;
    const above = rect.top - GAP - 8;
    const up = below < MENU_HEIGHT && above > below;
    const maxHeight = Math.min(MENU_HEIGHT, up ? above : below);
    setPos(up ? { left, bottom: window.innerHeight - rect.top + GAP, maxHeight } : { left, top: rect.bottom + GAP, maxHeight });
  };

  // Zatvaranje: klik van menija, Esc, pomeranje strane (meni je fixed).
  useEffect(() => {
    if (!open) return;
    const close = () => setPos(null);
    // Pomeranje unutar samog menija ga ne zatvara.
    const onScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      close();
    };
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const act = (action: TourRowAction) => {
    setPos(null);
    onAction(action);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Još radnji"
        title="Još radnji"
        style={{ ...formBtnStyle, padding: '5px 11px', fontSize: '17px', lineHeight: 1, letterSpacing: '1px' }}
      >
        ⋯
      </button>
      {pos && (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'fixed',
            left: pos.left,
            top: pos.top,
            bottom: pos.bottom,
            maxHeight: pos.maxHeight,
            overflowY: 'auto',
            width: MENU_WIDTH,
            zIndex: 300,
            background: FORM.surface,
            border: '1px solid ' + FORM.border,
            borderRadius: '12px',
            boxShadow: '0 14px 34px rgba(0,0,0,.14)',
            padding: '6px',
            textAlign: 'left',
            whiteSpace: 'normal'
          }}
        >
          <Group label="Sadržaj ture" />
          <a role="menuitem" href={`/tour/${slug}?admin=1`} target="_blank" rel="noreferrer" style={itemStyle} onClick={() => setPos(null)}>
            ✎ Uredi sadržaj (sobe, tačke)
          </a>
          <a role="menuitem" href={`/admin/plan/${slug}`} style={itemStyle} onClick={() => setPos(null)}>
            🗺 Plan (tlocrt)
          </a>
          <Item onClick={() => act('intro')}>🎙 Uvod (glas)</Item>
          <Item onClick={() => act('nearby')}>📍 Osveži okolinu</Item>

          <Group label="Deljenje" />
          <Item onClick={() => act('send')}>✉ Pošalji klijentu</Item>
          <Item onClick={() => act('live')}>📡 Link za vođenje uživo</Item>
          <Item onClick={() => act('qr')}>▦ QR kod</Item>
          <Item onClick={() => act('video')} disabled={noPanorama}>🎬 Video</Item>
          <Item onClick={() => act('snapshot')} disabled={noPanorama}>📷 Snimak (slike)</Item>
          <Item onClick={() => act('embed')}>{embedCopied ? '✓ Kod kopiran' : '</> Kod za sajt (iframe)'}</Item>

          <Group label="Nekretnina" />
          <label style={{ ...itemStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'default' }}>
            Stanje
            <select
              value={status}
              disabled={busy}
              onChange={(e) => {
                setPos(null);
                onStatus(e.target.value as PropertyStatus);
              }}
              style={{ flex: 1, padding: '4px 6px', borderRadius: '8px', border: '1px solid ' + FORM.border, fontSize: '13px', background: FORM.surface, color: FORM.textPrimary }}
            >
              {(Object.keys(statusLabels) as PropertyStatus[]).map((s) => (
                <option key={s} value={s}>{statusLabels[s]}</option>
              ))}
            </select>
          </label>

          <div style={{ borderTop: '1px solid ' + FORM.border, margin: '4px 0' }} />
          <Item onClick={() => act('delete')} danger disabled={busy}>
            🗑 Obriši turu
          </Item>
        </div>
      )}
    </>
  );
}

function Group({ label }: { label: string }) {
  return (
    <div style={{ padding: '8px 10px 3px', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase', color: FORM.textMuted }}>
      {label}
    </div>
  );
}

function Item({ children, onClick, danger = false, disabled = false }: { children: React.ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} disabled={disabled} style={{ ...itemStyle, color: danger ? FORM.danger : FORM.textPrimary, opacity: disabled ? 0.45 : 1, cursor: disabled ? 'default' : 'pointer' }}>
      {children}
    </button>
  );
}

const itemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '7px 10px',
  borderRadius: '8px',
  border: 'none',
  background: 'none',
  fontSize: '13px',
  fontFamily: 'inherit',
  color: FORM.textPrimary,
  textAlign: 'left',
  textDecoration: 'none',
  cursor: 'pointer'
};
