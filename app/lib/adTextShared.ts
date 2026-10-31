/**
 * Deljeno između servera (app/lib/adText.ts - AI) i admin prozora
 * (TourAdTextModal): sajtovi, jezici i smernice za dužinu. Bez AI uvoza, da
 * pregledač ne dobije serverske biblioteke.
 */

export type AdPlatform = '4zida' | 'halooglasi' | 'instagram' | 'facebook';
export const AD_PLATFORMS: AdPlatform[] = ['4zida', 'halooglasi', 'instagram', 'facebook'];
export type AdLang = 'sr' | 'en';

export type AdOptions = { price: boolean; nearby: boolean; contact: boolean };

/**
 * Smernice za dužinu (brojač u prozoru). Zvanična ograničenja 4zida i Halo
 * oglasa nisu javno navedena (provereno 2026-10-31); Halo seče naslov u
 * adresi na ~45 znakova, pa je za njega smernica kraća.
 */
export const AD_LIMITS: Record<AdPlatform, { title: number | null; body: [number, number] }> = {
  '4zida': { title: 60, body: [600, 1300] },
  halooglasi: { title: 50, body: [400, 900] },
  instagram: { title: null, body: [200, 600] },
  facebook: { title: null, body: [250, 700] }
};
