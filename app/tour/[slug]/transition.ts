import type { Waypoint } from './types';
import { normalizeYaw } from './utils';

/**
 * Prelaz iz sobe u sobu, "kao da posetilac hoda ka vratima":
 *   1. kamera se okrene ka navigacionoj tački i približi joj se (WALK_*);
 *   2. za to vreme se nova soba skida i pravi, skrivena ISPOD stare, pa je
 *      spremna kad kamera stigne do vrata (WALK_REVEAL_AT) i stara se odmah
 *      pretopi (FADE_MS) - bez stajanja na kraju prilaza i bez praznog ekrana;
 *   3. nova soba se pojavi okrenuta u smeru kretanja (vidi entryViewFor),
 *      glatko se okrene ka svom najlepšem kadru i, dok kreće okretanje,
 *      lagano se primiče (ENTRY_START_HFOV -> ARRIVE_HFOV).
 * WALK/CREEP/ARRIVE_HFOV su za telefon; u pregledaču idu kroz scaledHfov().
 * Klik na sobu u spisku ili na tlocrtu radi samo korak 2 (bez približavanja).
 */

/**
 * Pannellum zoom zadaje kao HORIZONTALNI ugao. Na uspravnom telefonu 65°
 * izgleda prirodno, ali na širokom ekranu isti ugao odseca visinu sobe na
 * ~39° i sve deluje previše približeno - zato širok ekran dobija širi kadar.
 */
const WIDE_SCREEN_ASPECT = 1.2;

export type HfovPair = { mobile: number; desktop: number };

export const isWideScreen = () =>
  typeof window !== 'undefined' && window.innerWidth / window.innerHeight > WIDE_SCREEN_ASPECT;

export const pickHfov = (v: HfovPair) => (isWideScreen() ? v.desktop : v.mobile);

/** Normalan pogled na sobu. */
export const DEFAULT_HFOV: HfovPair = { mobile: 65, desktop: 100 };
/** Približavanje info-tački (vodič i ručni klik). */
export const INFO_HFOV: HfovPair = { mobile: 50, desktop: 70 };

/** Vrednosti prelaza su zadate za telefon; na širokom ekranu se srazmerno šire. */
export const scaledHfov = (mobile: number) =>
  isWideScreen() ? Math.round((mobile * DEFAULT_HFOV.desktop) / DEFAULT_HFOV.mobile) : mobile;

/** Okret i približavanje ka tački. */
export const WALK_MS = 2500;
/** Koliko se "priđe" vratima - manje je bliže, ali slika postaje mutnija. */
export const WALK_HFOV = 32;
/**
 * Deo prilaza (0-1) posle kog nova soba sme da se pokaže. Pre samog kraja,
 * dok se kamera još kreće, da pretapanje ne sačeka da ona stane.
 */
export const WALK_REVEAL_AT = 0.9;
/**
 * Scena ne dozvoljava zoom ispod 30° (posetilac ne sme da zumira u mutno),
 * a prilaz vratima ide dublje - pa se granica spusti samo sceni iz koje se
 * izlazi. Ona se posle prelaza ionako briše.
 */
export const WALK_MIN_HFOV_BOUND = 15;
/** Najjači zoom koji posetilac sam može da napravi. */
export const VIEW_MIN_HFOV = 30;
export const VIEW_MAX_HFOV = 110;
/** Dok "hoda", kamera ne gleda strmo u pod ni u plafon. */
export const WALK_PITCH_MIN = -25;
export const WALK_PITCH_MAX = 20;
/** Najduže čekanje na sliku sledeće sobe posle približavanja. */
export const IMAGE_WAIT_MS = 1500;
/**
 * Samo kad nova soba nije spremna do kraja prilaza (spora mreža ili slab
 * telefon): stari kadar se i dalje sasvim polako približava - da "hod" ne
 * stane u mestu.
 */
export const CREEP_HFOV = 26;
export const CREEP_MS = 3200;

/**
 * Ulazak u sobu nastavlja kretanje napred, bez odzumiranja: soba se pojavi
 * na ENTRY_START_HFOV, a okretanje sobe (startAutoRotate) je samo lagano
 * primakne na ARRIVE_HFOV - Pannellum pri okretanju uvek ide ka početnom
 * zoomu scene, a scena se pravi baš sa ARRIVE_HFOV.
 */
export const ENTRY_START_HFOV = 60;
export const ARRIVE_HFOV = 52;
/** Vraćanje na normalan pogled kad se prilaz vratima prekine u istoj sobi. */
export const SETTLE_MS = 1200;

/** Pretapanje stare scene u novu. */
export const FADE_MS = 550;
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
   * naracije ide odmah prilaz sledećim vratima (GUIDE_REVISIT_SETTLE_MS).
   */
  guided?: boolean;
  /**
   * Trenutak (Date.now()) pre kog nova scena ostaje skrivena ispod stare -
   * kamera stare scene tada još prilazi vratima. Bez ovoga se pokazuje čim
   * se učita.
   */
  revealAt?: number;
};

/**
 * Smer pogleda posle prelaza kroz tačku `wp` iz sobe `fromRoomId` u `target`.
 *
 * Ako je u tački ručno upisan smer (targetYaw), koristi se on. Inače se soba
 * otvara okrenuta U SMERU KRETANJA: suprotno od povratnih vrata ciljne sobe
 * (tačke koja iz nje vodi nazad u sobu iz koje se došlo). Tako pretapanje
 * izgleda kao da posetilac nastavlja da hoda, a ne kao da se slika okrenula
 * u stranu (vlasnik, 30. 9. 2026). Bez povratnih vrata: null = početni
 * pogled sobe (establish).
 *
 * Taj pravac iz sredine sobe ume da gleda u prazan zid (probano ranije na
 * stan-gasse-1, dnevna soba -> Soba 1), pa se na njemu NE ostaje: odmah
 * posle ulaska kamera se glatko okrene ka najlepšem kadru sobe (establish) -
 * vidi glideToEstablish u roomSequence.ts. Smer ulaska služi samo da spoj
 * dve slike bude neprimetan.
 */
export function entryViewFor(
  wp: Waypoint,
  target: { waypoints_i18n?: unknown },
  fromRoomId: string | number
): EntryView | null {
  if (typeof wp.targetYaw === 'number' && Number.isFinite(wp.targetYaw)) {
    return { yaw: normalizeYaw(wp.targetYaw), pitch: wp.targetPitch ?? 0 };
  }
  let list: unknown = target.waypoints_i18n;
  if (typeof list === 'string') {
    try { list = JSON.parse(list); } catch { list = []; }
  }
  if (!Array.isArray(list)) return null;
  const back = (list as Waypoint[]).find(
    (w) => w && w.targetRoomId != null && String(w.targetRoomId) === String(fromRoomId) && Number.isFinite(Number(w.yaw))
  );
  if (!back) return null;
  return { yaw: normalizeYaw(Number(back.yaw) + 180), pitch: 0 };
}

/**
 * Trajanje okreta kamere srazmerno uglu, da brzina bude ujednačena i mirna
 * umesto da isto trajanje za 20° i za 180° daje trzaj kod velikih okreta
 * (izmereno 30. 9. 2026: fiksnih 2,2 s je kod dalekih tačaka davalo vrhove
 * od ~130°/s). Pannellum okret ubrzava i usporava, pa je vrh oko 1,5x
 * prosečne brzine - 45°/s u proseku ostaje prijatno i na telefonu.
 */
export const TURN_DEG_PER_S = 45;
/** Okret ka info-tački. */
export const INFO_TURN_MIN_MS = 1500;
export const INFO_TURN_MAX_MS = 4000;
/** Posle ulaska: okret od smera kretanja ka najlepšem kadru sobe. */
export const ARRIVE_GLIDE_MIN_MS = 1200;
export const ARRIVE_GLIDE_MAX_MS = 3500;
/** Prilaz vratima kad je potreban veliki okret (manji koristi WALK_MS). */
export const WALK_MAX_MS = 4000;

export function turnMsFor(angleDeg: number, minMs: number, maxMs: number): number {
  const ms = (Math.abs(angleDeg) / TURN_DEG_PER_S) * 1000;
  return Math.round(Math.min(maxMs, Math.max(minMs, ms)));
}

/**
 * Nagib kamere dok vodič kruži po sobi: ravno, u visini očiju. Ranije se
 * kruženje naginjalo ka vratima ili ka početnom kadru sobe, pa su vertikale
 * (zidovi, vrata) delovale nakrivljeno (vlasnik, 30. 9. 2026). Pogled ka
 * info-tački i prilaz vratima i dalje smeju da se spuste ili podignu.
 */
export const LEVEL_PITCH = 0;

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

/**
 * Koju panoramu sobe učitati: telefon i tablet dobijaju kopiju od 6000px
 * (ista oštrina na njihovom ekranu, skoro upola manje memorije - vidi
 * migraciju 018), računar punu. Soba bez kopije svuda daje punu.
 */
export function panoramaUrlFor(
  room: { panorama_url_cf?: string; panorama_url?: string; panorama_url_mobile?: string | null } | undefined
): string | undefined {
  if (!room) return undefined;
  const full = room.panorama_url_cf || room.panorama_url;
  if (room.panorama_url_mobile && typeof window !== 'undefined') {
    const phone = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 1024;
    if (phone) return room.panorama_url_mobile;
  }
  return full;
}
