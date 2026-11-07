'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * „Izabrani" stanovi (vlasnik, 7. 11. 2026, maketa IzborStanaV2): kupac
 * zvezdicom pamti stanove koji ga zanimaju i vidi ih zajedno u listi.
 * Čuva se samo u njegovom pregledaču (localStorage, po projektu) - ništa
 * ne ide na server. Privatan prozor ili blokiran storage: zvezdica radi
 * dok je strana otvorena.
 */

const EVENT = 'k360-fav';
const memory = new Map<string, string>();

const keyOf = (slug: string) => `k360-fav:${slug}`;

function read(slug: string): string {
  try {
    return window.localStorage.getItem(keyOf(slug)) ?? memory.get(slug) ?? '[]';
  } catch {
    return memory.get(slug) ?? '[]';
  }
}

function write(slug: string, codes: string[]) {
  const value = JSON.stringify(codes);
  memory.set(slug, value);
  try {
    window.localStorage.setItem(keyOf(slug), value);
  } catch {
    // Storage nedostupan - ostaje u memoriji do zatvaranja strane.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

function parse(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Oznake izabranih stanova projekta i prekidač za jedan stan. */
export function useFavorites(slug: string): { codes: string[]; has: (code: string) => boolean; toggle: (code: string) => void } {
  // Snapshot je sirov tekst (stabilan za poređenje); na serveru uvek prazno.
  const raw = useSyncExternalStore(subscribe, () => read(slug), () => '[]');
  const codes = parse(raw);
  const toggle = useCallback(
    (code: string) => {
      const now = parse(read(slug));
      write(slug, now.includes(code) ? now.filter((c) => c !== code) : [...now, code]);
    },
    [slug]
  );
  return { codes, has: (code: string) => codes.includes(code), toggle };
}
