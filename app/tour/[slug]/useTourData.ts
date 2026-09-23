import { useEffect, useState, type MutableRefObject } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { translations } from './translations';
import type { Language, Room, Tour } from './types';

/**
 * Učitava turu i njene sobe iz baze. Setteri se vraćaju jer ih menjaju i
 * admin alati (nova soba, izmena tačke, upload panorame).
 *
 * `enabled` = strana je montirana u pregledaču (tura je klijentska).
 */
export function useTourData(
  slug: string | undefined,
  enabled: boolean,
  isMountedRef: MutableRefObject<boolean>,
  langRef: MutableRefObject<Language>
) {
  const [tour, setTour] = useState<Tour | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug || !enabled) return;
    async function load() {
      setLoading(true);
      // Sobe ne zavise od ture, pa se oba upita šalju odjednom - redom bi
      // svako otvaranje ture plaćalo jedan odlazak do baze više.
      const [
        { data: tourData, error: tourErr },
        { data: roomRows, error: roomsErr }
      ] = await Promise.all([
        supabase.from('tours').select('*').eq('slug', slug!).single(),
        supabase.from('rooms').select('*').eq('tour_slug', slug!).order('order_index', { ascending: true })
      ]);

      if (tourErr) console.error('[TOUR LOAD ERROR]', tourErr);
      if (roomsErr) console.error('[ROOMS LOAD ERROR]', roomsErr);

      if (!isMountedRef.current) return;

      let loadedTour = tourData as Tour | null;
      let loadedRooms = roomRows as Room[] | null;

      // SAMO lokalno, za pregled malog tlocrta pre nego što ijedna tura ima
      // skicu - vidi demoFloorplan.ts. Na pravom sajtu ova grana ne postoji.
      if (
        process.env.NODE_ENV === 'development' &&
        loadedTour && loadedRooms?.length &&
        new URLSearchParams(window.location.search).get('testskica') === '1'
      ) {
        const { withDemoFloorplan } = await import('./demoFloorplan');
        ({ tour: loadedTour, rooms: loadedRooms } = withDemoFloorplan(loadedTour, loadedRooms));
      }

      if (!loadedTour) {
        // VAŽNO: ako tura nije nađena, ne dozvoljavamo da rooms-provera dole prepiše ovu poruku
        setError(tourErr ? `Greška (tours): ${tourErr.message}` : translations[langRef.current].tourNotFound);
      } else {
        setTour(loadedTour);
        if (roomsErr) setError(`Greška (rooms): ${roomsErr.message}`);
        else if (!loadedRooms || loadedRooms.length === 0) setError(translations[langRef.current].noRooms);
        else setRooms(loadedRooms);
      }

      setLoading(false);
    }
    load();
  }, [slug, enabled, isMountedRef, langRef]);

  return { tour, setTour, rooms, setRooms, loading, error, setError };
}
