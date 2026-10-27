'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCompare } from '../../lib/useCompare';
import { compareHref, removeSlug } from '../../lib/compare';

/**
 * Klijentski delovi strane poređenja: link otvoren na drugom uređaju postaje
 * i tamošnji izbor (kupac može dalje da dodaje), "Pošalji link" i ✕ po koloni.
 */

/** Izbor u pregledaču prati ono što je na ekranu (i prazno - skinute ture se brišu). */
export function CompareSync({ slugs }: { slugs: string[] }) {
  const { set } = useCompare();
  const key = slugs.join(',');
  useEffect(() => {
    // Spoljni sistem (localStorage), ne React stanje.
    set(key ? key.split(',') : []);
  }, [key, set]);
  return null;
}

export function CompareActions({ slugs }: { slugs: string[] }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.origin + compareHref(slugs);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Poređenje nekretnina', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      // Odustajanje od deljenja nije greška; bez clipboard-a ostaje ručno kopiranje.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      window.prompt('Link poređenja (Ctrl+C, pa Enter):', url);
    }
  };

  return (
    <>
      <CompareSync slugs={slugs} />
      <button type="button" className="cmp-share" onClick={share}>
        {copied ? '✓ Kopirano' : 'Pošalji link'}
      </button>
    </>
  );
}

export function RemoveFromCompare({ slug, slugs }: { slug: string; slugs: string[] }) {
  const router = useRouter();
  const { remove } = useCompare();
  return (
    <button
      type="button"
      className="cmp-remove"
      aria-label="Ukloni iz poređenja"
      onClick={() => {
        remove(slug);
        router.replace(compareHref(removeSlug(slugs, slug)), { scroll: false });
      }}
    >
      ✕
    </button>
  );
}
