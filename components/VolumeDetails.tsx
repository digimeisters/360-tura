'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Tabela "Više nekretnina mesečno, niža cena" na telefonu je sklopljena
 * (vlasnik, 1. 10. 2026): cenovnik je bio dug 3,5 ekrana, a tabela treba
 * samo agencijama - pojedinačnog vlasnika samo udaljava od forme. Na
 * širem ekranu se odmah otvori, pa izgleda kao i ranije (cenovnik je daleko
 * ispod prvog ekrana, pa se to otvaranje ne vidi).
 *
 * `toggle` (početna i /za-agencije, vlasnik 3. 11. 2026): sklopljeno na
 * SVAKOJ širini, sa dugmetom "Prikaži više / Prikaži manje" - kartice sa
 * glavnom cenom treba da budu jedino što se odmah vidi.
 */
export default function VolumeDetails({
  title,
  toggle,
  children
}: {
  title: string;
  toggle?: { more: string; less: string };
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (toggle) return;
    if (ref.current && window.matchMedia('(min-width: 721px)').matches) ref.current.open = true;
  }, [toggle]);

  return (
    <details ref={ref} className={`vol-details${toggle ? ' is-toggle' : ''}`}>
      <summary>
        <h3>{title}</h3>
        {toggle ? (
          <span className="vol-details-toggle">
            <span className="vol-more">{toggle.more}</span>
            <span className="vol-less">{toggle.less}</span>
            <span className="vol-details-chevron" aria-hidden="true">▾</span>
          </span>
        ) : (
          <span className="vol-details-chevron" aria-hidden="true">▾</span>
        )}
      </summary>
      {children}
    </details>
  );
}
