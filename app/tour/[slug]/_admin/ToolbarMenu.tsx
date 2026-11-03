'use client';

import { useEffect, useRef, useState } from 'react';
import { THEME } from '../theme';
import { toolbarButtonStyle } from './shared';

/**
 * Dugme sa padajućim menijem u admin traci ture ("Sobe ▾", "Panorama ▾",
 * "AI ▾"). Radnje deluju na sobu koja je trenutno u panorami, pa meni u
 * vrhu piše njen naziv. Opasne stavke (brisanje) idu na dno, crvene i
 * odvojene linijom, da se ne kliknu usput.
 */
export type ToolbarMenuItem = {
  label: string;
  title?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
};

const MENU_MIN_WIDTH = 200;

export default function ToolbarMenu({
  label,
  color,
  textColor = '#fff',
  heading,
  items
}: {
  /** Natpis dugmeta; dok radnja traje, npr. "🤖 Generisanje…". */
  label: string;
  color: string;
  textColor?: string;
  /** Na koju sobu se radnje odnose (null = bez naslova). */
  heading?: string | null;
  items: ToolbarMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  // Meni se otvara ulevo od dugmeta; na uskom telefonu, kad dugme stoji
  // blizu leve ivice, otvara se udesno da ne izađe iz ekrana.
  const [alignLeft, setAlignLeft] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const toggle = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    setAlignLeft(Boolean(rect && rect.right < MENU_MIN_WIDTH + 16));
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const safe = items.filter((i) => !i.danger);
  const danger = items.filter((i) => i.danger);
  const item = (i: ToolbarMenuItem) => (
    <button
      key={i.label}
      type="button"
      role="menuitem"
      title={i.title}
      disabled={i.disabled}
      onClick={() => {
        setOpen(false);
        i.onClick();
      }}
      style={{
        display: 'block',
        width: '100%',
        padding: '9px 10px',
        borderRadius: '8px',
        border: 'none',
        background: 'none',
        fontSize: '13px',
        fontFamily: 'inherit',
        textAlign: 'left',
        whiteSpace: 'nowrap',
        cursor: i.disabled ? 'default' : 'pointer',
        opacity: i.disabled ? 0.45 : 1,
        color: i.danger ? THEME.danger : THEME.textPrimary
      }}
    >
      {i.label}
    </button>
  );

  return (
    <span ref={rootRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        style={{ ...toolbarButtonStyle, background: color, color: textColor }}
      >
        {label} ▾
      </button>
      {open && (
        <span
          role="menu"
          style={{
            position: 'absolute',
            ...(alignLeft ? { left: 0 } : { right: 0 }),
            top: 'calc(100% + 8px)',
            zIndex: 1000,
            minWidth: MENU_MIN_WIDTH + 'px',
            background: THEME.surface,
            border: '1px solid ' + THEME.border,
            borderRadius: '12px',
            boxShadow: '0 14px 34px rgba(0,0,0,.28)',
            padding: '6px'
          }}
        >
          {heading && (
            <span
              style={{
                display: 'block',
                padding: '6px 10px 8px',
                fontSize: '11px',
                color: THEME.textMuted,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '260px'
              }}
            >
              {heading}
            </span>
          )}
          {safe.map(item)}
          {danger.length > 0 && safe.length > 0 && <span style={{ display: 'block', height: '1px', background: THEME.border, margin: '6px 4px' }} />}
          {danger.map(item)}
        </span>
      )}
    </span>
  );
}
