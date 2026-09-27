'use client';

import { useEffect } from 'react';

/**
 * Reflektor na karticama tura: dok je miš iznad kartice, svetlo ga prati
 * (CSS .tour-card::after čita --mx/--my). Jedan slušalac na celom dokumentu,
 * kao SiteTracker, pa TourCard ostaje serverska komponenta. Na telefonu
 * nema miša - slušalac se ni ne kači.
 */
export default function CardSpotlight() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover)').matches) return;

    let frame = 0;
    let last: { card: HTMLElement; x: number; y: number } | null = null;

    const onMove = (e: PointerEvent) => {
      const card = (e.target as Element | null)?.closest<HTMLElement>('.tour-card');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      last = { card, x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!last) return;
        last.card.style.setProperty('--mx', `${Math.round(last.x)}px`);
        last.card.style.setProperty('--my', `${Math.round(last.y)}px`);
      });
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
