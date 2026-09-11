'use client';

import { useEffect } from 'react';
import { trackSiteEvent } from '../app/lib/track';

/**
 * Merenje početne strane: jedna poseta pri učitavanju i klik na svaki
 * element sa data-track="vrsta:cilj", npr. data-track="cta:hero_tour" ili
 * data-track="contact:viber". Jedan slušalac na celom dokumentu, pa strana
 * ostaje serverska komponenta - dugmad samo nose atribut.
 */
const KIND_TO_EVENT = {
  cta: 'cta_click',
  contact: 'contact_click'
} as const;

export default function SiteTracker() {
  useEffect(() => {
    trackSiteEvent('page_view');

    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>('[data-track]');
      const value = el?.dataset.track;
      if (!value) return;

      const sep = value.indexOf(':');
      const kind = value.slice(0, sep) as keyof typeof KIND_TO_EVENT;
      const target = value.slice(sep + 1);
      if (sep < 1 || !target || !(kind in KIND_TO_EVENT)) return;

      trackSiteEvent(KIND_TO_EVENT[kind], target);
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}
