import { preload } from 'react-dom';
import type { ShowcaseTour } from './showcaseTours';

/**
 * Slika ture u vrhu strane (HeroDevice) je najveći element na ekranu, pa po
 * njoj Google meri „glavni sadržaj" (LCP). Bez ovoga je pregledač otkrije tek
 * u HTML-u i skida je najnižim prioritetom, posle fontova i skripti
 * (PageSpeed 5. 10. 2026: glavni sadržaj 5,3 s, a prvi prikaz 1,5 s).
 * Ovo je stavlja u <head> sa visokim prioritetom. Ista soba kao u HeroDevice.
 */
export function preloadHeroImage(tour: ShowcaseTour | null | undefined) {
  if (!tour) return;
  const room = tour.rooms.find((r) => r.id === tour.coverRoomId) ?? tour.rooms[0];
  if (room?.previewUrl) preload(room.previewUrl, { as: 'image', fetchPriority: 'high' });
}
