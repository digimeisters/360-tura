'use client';

import { useEffect, useRef, useState } from 'react';
import { FORM, formBtnStyle } from '../../app/lib/formTheme';

/**
 * Dugme "⋯" sa kratkim spiskom radnji, za zaglavlja admin strana (npr.
 * "Obriši projekat" u editoru projekta). Za red tabele tura postoji
 * TourRowMenu, koji se crta preko position: fixed zbog odsecanja u tabeli.
 */
export type MoreMenuItem = { label: string; onClick: () => void; danger?: boolean; disabled?: boolean };

export default function MoreMenu({ items, label = 'Još radnji' }: { items: MoreMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={() => setOpen((v) => !v)}
        style={{ ...formBtnStyle, padding: '5px 11px', fontSize: '17px', lineHeight: 1, letterSpacing: '1px' }}
      >
        ⋯
      </button>
      {open && (
        <div
          role="menu"
          style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 120, minWidth: '210px', background: FORM.surface, border: '1px solid ' + FORM.border, borderRadius: '12px', boxShadow: '0 14px 34px rgba(0,0,0,.14)', padding: '6px' }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              style={{ display: 'block', width: '100%', padding: '8px 10px', borderRadius: '8px', border: 'none', background: 'none', fontSize: '13px', fontFamily: 'inherit', textAlign: 'left', cursor: item.disabled ? 'default' : 'pointer', opacity: item.disabled ? 0.45 : 1, color: item.danger ? FORM.danger : FORM.textPrimary }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
