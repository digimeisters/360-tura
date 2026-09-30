import { useEffect } from 'react';

/**
 * Drži ekran telefona upaljenim dok automatski vodič radi (vlasnik,
 * 30. 9. 2026 - posetiocima se ekran gasio usred obilaska, jer ga niko ne
 * dodiruje dok vodič priča). Screen Wake Lock API: Chrome/Android i Safari
 * od iOS 16.4. Gde ga nema, ne radi ništa - ekran se gasi kao i do sada.
 *
 * Pregledač sam skida zaključavanje kad se stranica sakrije (druga
 * aplikacija, zaključan telefon), pa se ono traži ponovo kad se posetilac
 * vrati. Čim `active` postane false (ručni režim, pauza, kraj obilaska),
 * zaključavanje se pušta i telefon se gasi po svom podešavanju.
 */
export function useScreenWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
      } catch {
        // Odbijeno (štednja baterije, stranica nije vidljiva) - ekran se gasi po starom.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (sentinel && !sentinel.released) void sentinel.release();
      sentinel = null;
    };
  }, [active]);
}
