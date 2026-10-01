'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Tabela "Više nekretnina mesečno, niža cena" na telefonu je sklopljena
 * (vlasnik, 1. 10. 2026): cenovnik je bio dug 3,5 ekrana, a tabela treba
 * samo agencijama - pojedinačnog vlasnika samo udaljava od forme. Na
 * širem ekranu se odmah otvori, pa izgleda kao i ranije (cenovnik je daleko
 * ispod prvog ekrana, pa se to otvaranje ne vidi).
 */
export default function VolumeDetails({ title, children }: { title: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (ref.current && window.matchMedia('(min-width: 721px)').matches) ref.current.open = true;
  }, []);

  return (
    <details ref={ref} className="vol-details">
      <summary>
        <h3>{title}</h3>
        <span className="vol-details-chevron" aria-hidden="true">▾</span>
      </summary>
      {children}
    </details>
  );
}
