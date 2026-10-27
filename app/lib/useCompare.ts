'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { COMPARE_EVENT, COMPARE_KEY, cleanSlugs, readCompare, removeSlug, toggleSlug, writeCompare } from './compare';

/**
 * Izbor za poređenje (compare.ts) kao React stanje: ista vrednost na /ture,
 * u turi i na /ture/uporedi, i u drugim karticama (događaj "storage").
 *
 * Kad pregledač ne da localStorage (privatni režim, zabrana), izbor živi u
 * memoriji strane - dugme i dalje radi, samo se ne pamti posle osvežavanja.
 */

let memory: string[] = [];

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function current(): string[] {
  const s = storage();
  if (!s) return memory;
  try {
    // Provera da čitanje uopšte radi - readCompare guta grešku i vraća [].
    s.getItem(COMPARE_KEY);
    return readCompare(s);
  } catch {
    return memory;
  }
}

function save(slugs: string[]) {
  const clean = cleanSlugs(slugs);
  memory = clean;
  writeCompare(storage(), clean);
  window.dispatchEvent(new Event(COMPARE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(COMPARE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(COMPARE_EVENT, onChange);
  };
}

// Snapshot je string (ne niz), da useSyncExternalStore ne vidi "novu" vrednost
// pri svakom čitanju.
const snapshot = () => current().join(',');
const serverSnapshot = () => '';

export function useCompare() {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const slugs = useMemo(() => (raw ? raw.split(',') : []), [raw]);

  const toggle = useCallback((slug: string) => {
    const r = toggleSlug(current(), slug);
    if (!r.full) save(r.slugs);
    return { full: r.full };
  }, []);
  const remove = useCallback((slug: string) => save(removeSlug(current(), slug)), []);
  const set = useCallback((next: string[]) => save(next), []);

  return { slugs, toggle, remove, set };
}
