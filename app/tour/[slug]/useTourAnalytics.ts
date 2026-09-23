import { useEffect, useRef, type MutableRefObject } from 'react';
import { trackEvent } from '../../lib/track';
import { parseWaypoints } from './utils';
import { preloadPanorama } from './transition';
import type { ActiveModal, Language, Room, Tour } from './types';

/**
 * Merenje poseta ture (tabela tour_events; admin analitika i izveštaj za
 * agencije). Događaji se šalju iz efekata, a ne iz pojedinačnih onClick-ova,
 * jer se isto stanje menja sa više mesta (npr. tura se pokreće i dugmetom i
 * automatski) - ovako nijedan put ne ostane nezabeležen. Posete admina se
 * ne beleže.
 */
export function useTourAnalytics({
  slug,
  tour,
  adminMode,
  tourStarted,
  rooms,
  roomIdx,
  lang,
  langRef,
  activeModal
}: {
  slug: string | undefined;
  tour: Tour | null;
  adminMode: boolean;
  tourStarted: boolean;
  rooms: Room[];
  roomIdx: number;
  lang: Language;
  langRef: MutableRefObject<Language>;
  activeModal: ActiveModal;
}) {
  // Otvaranje se beleži samo jednom po učitavanju, i kad se tour objekat
  // kasnije osveži (npr. posle admin izmene).
  const openTrackedRef = useRef(false);

  useEffect(() => {
    if (!slug || !tour || adminMode) return;
    if (openTrackedRef.current) return;
    openTrackedRef.current = true;
    // langRef, a ne lang: jezik iz linka (?lang=) je u ref-u upisan u istom
    // prolazu, dok lang state stiže tek u sledećem renderu.
    trackEvent({ eventType: 'open', tourSlug: slug, lang: langRef.current });
    // lang namerno nije zavisnost: otvaranje se beleži jednom, sa jezikom
    // koji je tada bio aktivan.
  }, [slug, tour, adminMode, langRef]);

  useEffect(() => {
    if (!tourStarted || !slug || adminMode) return;
    trackEvent({ eventType: 'start', tourSlug: slug, lang });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourStarted, slug, adminMode]);

  useEffect(() => {
    if (!tourStarted || !slug || adminMode) return;
    const rawRoomId = rooms[roomIdx]?.id;
    if (!rawRoomId) return;
    const roomId = String(rawRoomId);

    const enteredAt = Date.now();
    let flushed = false;

    const flush = () => {
      if (flushed) return;
      flushed = true;
      trackEvent({
        eventType: 'room_view',
        tourSlug: slug,
        roomId,
        durationMs: Date.now() - enteredAt,
        lang
      });
    };

    // pagehide hvata zatvaranje taba i prelazak na drugu stranicu, gde se
    // cleanup efekta ne izvrši pouzdano.
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourStarted, slug, roomIdx, rooms, adminMode]);

  useEffect(() => {
    if (activeModal !== 'contact' || !slug || adminMode) return;
    trackEvent({ eventType: 'contact', tourSlug: slug, lang });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModal, slug, adminMode]);
}

/**
 * Panorame do kojih posetilac može da ode iz trenutne sobe skidaju se u
 * pozadini, dok on još gleda ovu. Bez toga se svaki prelazak plaća čekanjem
 * na ~1MB slike, što je na telefonu jasno vidljivo. R2 nema naplatu
 * izlaznog saobraćaja, pa je jedina cena tuđi mobilni internet - zato ide
 * samo prvi krug susednih soba, a ne cela tura.
 */
export function useNeighbourPreload(tourStarted: boolean, rooms: Room[], roomIdx: number) {
  useEffect(() => {
    if (!tourStarted || rooms.length < 2) return;

    const current = rooms[roomIdx];
    if (!current) return;

    const neighbours = new Set<string>();

    for (const wp of parseWaypoints(current.waypoints_i18n)) {
      if (!wp.targetRoomId) continue;
      const target = rooms.find((r) => String(r.id) === String(wp.targetRoomId));
      const url = target?.panorama_url_cf || target?.panorama_url;
      if (url) neighbours.add(url);
    }

    // Strelice za napred/nazad postoje i kad soba nema nijedan hotspot za
    // prelaz, pa su susedi po redosledu uvek kandidati.
    for (const idx of [roomIdx + 1, roomIdx - 1]) {
      const url = rooms[idx]?.panorama_url_cf || rooms[idx]?.panorama_url;
      if (url) neighbours.add(url);
    }

    const currentUrl = current.panorama_url_cf || current.panorama_url;
    if (currentUrl) neighbours.delete(currentUrl);

    // Kratko odlaganje: prvo neka se učita panorama koju čovek gleda.
    // preloadPanorama traži sliku u CORS režimu (kao Pannellum) i pamti je,
    // pa je ne traži dvaput - vidi transition.ts.
    const timer = setTimeout(() => {
      for (const url of neighbours) void preloadPanorama(url);
    }, 1500);

    return () => clearTimeout(timer);
  }, [tourStarted, rooms, roomIdx]);
}
