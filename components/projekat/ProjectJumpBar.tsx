'use client';

import { useEffect, useState } from 'react';

/**
 * Traka za skok na delove ispod izbora stana (O projektu, Lokacija...).
 * Ostaje pri vrhu dok se skroluje i označava deo koji je trenutno na
 * ekranu. Strana prosleđuje samo delove koji postoje.
 */
export default function ProjectJumpBar({ items, label }: { items: { id: string; label: string }[]; label: string }) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    const targets = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => Boolean(el));
    if (!targets.length) return;
    // Deo u gornjoj trećini ekrana je "trenutni".
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -65% 0px' }
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  return (
    <nav className="pj" aria-label={label}>
      <div className="wrap pj-inner">
        {items.map((i) => (
          <a key={i.id} href={`#${i.id}`} className={active === i.id ? 'is-on' : undefined} aria-current={active === i.id ? 'true' : undefined}>
            {i.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
