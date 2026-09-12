import type { Waypoint } from './types';
import { normalizeYaw } from './utils';

/**
 * Prelaz iz sobe u sobu, "kao da posetilac hoda ka vratima":
 *   1. kamera se okrene ka navigacionoj tački i približi joj se (WALK_*),
 *      a za to vreme se skida panorama sledeće sobe;
 *   2. nova soba se napravi ISPOD stare, i kad se učita, stara se pretopi
 *      (FADE_MS) - nema praznog ekrana između soba;
 *   3. nova soba kreće malo uvećana i "otvori se" na normalan pogled
 *      (ARRIVE_HFOV -> DEFAULT_HFOV), u svom početnom kadru - vidi entryViewFor.
 * Klik na sobu u spisku ili na tlocrtu radi samo korak 2 (bez približavanja).
 */

export const DEFAULT_HFOV = 65;

/** Okret i približavanje ka tački. */
export const WALK_MS = 850;
/** Koliko se "priđe" vratima - manje je bliže, ali slika postaje mutnija. */
export const WALK_HFOV = 42;
/** Dok "hoda", kamera ne gleda strmo u pod ni u plafon. */
export const WALK_PITCH_MIN = -25;
export const WALK_PITCH_MAX = 20;
/** Najduže čekanje na sliku sledeće sobe posle približavanja. */
export const IMAGE_WAIT_MS = 1500;
/**
 * Dok se nova soba obrađuje (skidanje + dekodiranje velike panorame), stari
 * kadar se i dalje sasvim polako približava - da "hod" ne stane u mestu.
 */
export const CREEP_HFOV = 34;
export const CREEP_MS = 2500;

/** Nova soba kreće malo uvećana... */
export const ARRIVE_HFOV = 52;
/** ...i za ovoliko se otvori na normalan pogled. */
export const SETTLE_MS = 900;

/** Pretapanje stare scene u novu. */
export const FADE_MS = 450;
/** Ako nova soba stiže sporije od ovoga, prikaže se "Ulazimo u prostoriju". */
export const SLOW_LOAD_HINT_MS = 700;

export type EntryView = { yaw: number; pitch: number };

/** Šta sledeća scena treba da uradi pri učitavanju (postavlja changeRoomById). */
export type PendingTransition = {
  /** Smer pogleda pri ulasku; null = početni pogled sobe (establish). */
  entry: EntryView | null;
  /** Da li je bilo približavanja - tada nova soba kreće uvećana. */
  zoomedIn: boolean;
  /**
   * Ovaj korak je pokrenuo AUTOMATSKI vodič (guidePath.ts), ne ručan klik.
   * Menja dve stvari u page.tsx: (1) ne gasi automatski mod - ručni klik bez
   * ovoga gasi vodiča; (2) ako je ciljna soba već predstavljena, umesto pune
   * naracije ide kratak tih prolaz (GUIDE_REVISIT_PAUSE_MS).
   */
  guided?: boolean;
};

/**
 * Smer pogleda posle prelaza kroz tačku `wp`.
 *
 * Ako je u tački ručno upisan smer (targetYaw), koristi se on. Inače null:
 * soba se otvara u svom početnom pogledu (establish), koji je izabran kao
 * najlepši kadar sobe i uz koji ide uvodna naracija.
 *
 * Namerno se NE računa "gledaj od vrata ka unutra" iz povratne tačke ciljne
 * sobe: iz sredine sobe taj pravac često gleda u prazan zid, a tačke koje je
 * postavio AI nisu dovoljno precizne da bi pravac bio pouzdan. Probano na
 * stan-gasse-1 (dnevna soba -> Soba 1): ulaz je gledao u sivi zid.
 */
export function entryViewFor(wp: Waypoint): EntryView | null {
  if (typeof wp.targetYaw === 'number' && Number.isFinite(wp.targetYaw)) {
    return { yaw: normalizeYaw(wp.targetYaw), pitch: wp.targetPitch ?? 0 };
  }
  return null;
}

export function clampPitch(pitch: number): number {
  return Math.min(Math.max(pitch, WALK_PITCH_MIN), WALK_PITCH_MAX);
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Panorame koje su već tražene, sa obećanjem koje se ispuni kad slika stigne.
// Deli ga preload susednih soba i prelaz kroz tačku, pa se slika ne traži dvaput.
const panoramaLoads = new Map<string, Promise<void>>();

/**
 * Skida panoramu unapred. KLJUČNO: crossOrigin mora biti 'anonymous', isto
 * kao kad je Pannellum posle traži - inače pregledač upamti odgovor bez CORS
 * zaglavlja i Pannellum-ovo učitavanje te sobe pukne. Obećanje se uvek
 * ispuni (i kad slika ne stigne), da prelaz nikad ne zastane zbog preload-a.
 */
export function preloadPanorama(url: string): Promise<void> {
  const existing = panoramaLoads.get(url);
  if (existing) return existing;

  const promise = new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve();
    img.onerror = () => {
      panoramaLoads.delete(url);
      resolve();
    };
    img.src = url;
  });
  panoramaLoads.set(url, promise);
  return promise;
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
