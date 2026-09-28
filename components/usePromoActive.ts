'use client';

import { useSyncExternalStore } from 'react';
import { PROMO, isPromoActive } from '../app/lib/pricing';

/**
 * Da li promocija traje - provereno na KLIJENTU, pri svakom otvaranju strane.
 *
 * Zašto ovako, a ne običan poziv isPromoActive() u renderu: strana se sa
 * servera može poslužiti iz keša napravljenog ranije, pa bi datum u njoj bio
 * zamrznut - promo cena bi ostala na sajtu i posle isteka kampanje, do
 * sledećeg deploy-a.
 *
 * useSyncExternalStore je za tačno ovo: server (i prvi, hidracioni render)
 * dobija `false`, dakle REDOVNU cenu, a odmah po hidraciji React uzima pravu
 * vrednost sa klijenta. Bez upozorenja o neslaganju i bez setState u efektu.
 */

// Vrednost se ne menja tokom jedne posete, pa nema na šta da se pretplati.
const subscribe = () => () => {};

export function usePromoActive(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isPromoActive(),
    () => false
  );
}

// Odbrojavanje u promo traci se osvežava jednom u minuti.
const subscribeMinute = (cb: () => void) => {
  const id = window.setInterval(cb, 60_000);
  return () => window.clearInterval(id);
};

/**
 * Koliko je MINUTA ostalo do kraja promocije (za odbrojavanje "dana · sati"
 * u promo traci). Broj, ne objekat - isti razlog kao kod usePromoDaysLeft.
 */
export function usePromoMinutesLeft(): number {
  return useSyncExternalStore(
    subscribeMinute,
    () => {
      const end = new Date(`${PROMO.endDate}T23:59:59`).getTime();
      return Math.max(0, Math.floor((end - Date.now()) / 60_000));
    },
    () => 0
  );
}

/**
 * Koliko je dana ostalo do kraja promocije. Odvojena kuka, a ne polje u
 * objektu uz `active`: useSyncExternalStore poredi vrednosti identitetom, pa
 * bi nov objekat pri svakom pozivu vrteo render u krug. Broj je bezbedan.
 */
export function usePromoDaysLeft(): number {
  return useSyncExternalStore(
    subscribe,
    () => {
      const end = new Date(`${PROMO.endDate}T23:59:59`).getTime();
      return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
    },
    () => 0
  );
}
