'use client';

import { useEffect } from 'react';

/**
 * Ugradnja na sajt investitora: javlja visinu sadržaja stranici koja nas
 * ugrađuje, da iframe raste i skuplja se zajedno sa izborom stana (bez
 * sopstvenog skrola u skrolu). Kod za ugradnju (SalesAccessPanel / admin)
 * sadrži mali skript koji ovu poruku sluša, samo sa našeg domena i samo za
 * ovaj projekat (slug).
 */
export default function EmbedAutoHeight({ slug }: { slug: string }) {
  useEffect(() => {
    if (window.parent === window) return;
    let last = 0;
    // Meri se sam sadržaj (<main>), ne dokument: visina dokumenta nikad nije
    // manja od iframe-a, pa se okvir ne bi skupio kad sadržaj postane kraći.
    const content = document.querySelector('main') ?? document.body;
    const send = () => {
      const height = Math.ceil(content.getBoundingClientRect().bottom + window.scrollY + 8);
      if (Math.abs(height - last) < 2) return;
      last = height;
      window.parent.postMessage({ type: 'k360-height', slug, height }, '*');
    };
    const observer = new ResizeObserver(send);
    observer.observe(content);
    send();
    return () => observer.disconnect();
  }, [slug]);
  return null;
}
