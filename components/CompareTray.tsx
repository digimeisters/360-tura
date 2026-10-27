'use client';

import type { ShowcaseTour } from '../app/lib/showcaseTours';
import { COMPARE_MAX, compareHref } from '../app/lib/compare';

/**
 * Traka na dnu /ture dok je bar jedna nekretnina izabrana za poređenje:
 * sličice, broj i "Uporedi →". `notice` = upravo je odbijena peta.
 */
export default function CompareTray({
  tours,
  slugs,
  notice
}: {
  tours: ShowcaseTour[];
  slugs: string[];
  notice: boolean;
}) {
  if (slugs.length === 0) return null;
  const picked = slugs.map((s) => tours.find((t) => t.slug === s)).filter((t): t is ShowcaseTour => Boolean(t));
  const left = COMPARE_MAX - slugs.length;

  return (
    <>
      {/* Prostor ispod poslednjeg reda kartica, da ga traka ne pokrije. */}
      <div className="compare-tray-space" aria-hidden="true" />
      <div className="compare-tray" role="region" aria-label="Poređenje">
        <div className="compare-tray__thumbs" aria-hidden="true">
          {picked.map((t) => (
            <span key={t.slug} style={t.coverUrl ? { backgroundImage: `url("${t.coverUrl}")` } : undefined} />
          ))}
        </div>
        <div className="compare-tray__text" aria-live="polite">
          <b>Poređenje ({slugs.length})</b>
          {notice ? `Najviše ${COMPARE_MAX} – uklonite jednu` : left > 0 ? `Dodajte još do ${left}` : `Najviše ${COMPARE_MAX}`}
        </div>
        <a className="compare-tray__go" href={compareHref(slugs)}>
          Uporedi →
        </a>
      </div>
    </>
  );
}
