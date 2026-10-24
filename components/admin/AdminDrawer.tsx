'use client';

import { useEffect, useRef } from 'react';
import { FORM, formBtnStyle } from '../../app/lib/formTheme';

/**
 * Panel sa desne strane za kratke forme u adminu (npr. "+ Novi projekat").
 * Isto ponašanje kao forma ture (TourFormDrawer): tamna podloga iza, × u
 * uglu, zatvaranje klikom na podlogu i na Esc - osim kad je iznad otvoren
 * neki drugi vidljiv prozor.
 */
export default function AdminDrawer({
  open,
  title,
  onClose,
  children,
  footer
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Dugmad u dnu panela (vidljiva i kad se sadržaj pomera). */
  footer?: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const others = [...document.querySelectorAll('[role="dialog"], [aria-modal="true"]')].filter(
        (el) => !panelRef.current?.contains(el) && el !== panelRef.current && (el as HTMLElement).getClientRects().length > 0
      );
      if (others.length) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(17,19,24,.28)' }} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="k-admin-drawer"
        style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 160, background: FORM.surface, borderLeft: '1px solid ' + FORM.border, boxShadow: '-16px 0 40px rgba(0,0,0,.12)', display: 'flex', flexDirection: 'column', color: FORM.textPrimary, fontFamily: FORM.fontBody }}
      >
        <style>{'.k-admin-drawer{width:min(460px,100vw)} @media (max-width:899px){.k-admin-drawer{width:100vw}}'}</style>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '18px 20px 12px', borderBottom: '1px solid ' + FORM.border }}>
          <h2 style={{ fontSize: '16px', margin: 0, fontFamily: FORM.fontDisplay }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Zatvori" style={{ ...formBtnStyle, padding: '4px 11px', fontSize: '18px', lineHeight: 1 }}>
            ×
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>{children}</div>
        {footer && (
          <div style={{ borderTop: '1px solid ' + FORM.border, padding: '12px 20px calc(12px + env(safe-area-inset-bottom))', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
