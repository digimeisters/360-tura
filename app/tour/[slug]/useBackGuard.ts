import { useEffect, useRef, useState } from 'react';

/**
 * Dugme "nazad" (Android) i povlačenje od ivice (iPhone) usred ture:
 * 1. ako je nešto otvoreno (modul, kartica sa tekstom, forma) - zatvara samo to;
 * 2. ako ništa nije otvoreno - pita "Da li želite da napustite turu?";
 * 3. još jedno "nazad" dok je pitanje na ekranu - izlazi iz ture.
 *
 * Radi preko jednog "čuvara" u istoriji pregledača: kad tura krene, doda se
 * jedan korak istorije; "nazad" troši njega umesto da napusti stranu, a mi
 * ga vraćamo. Zatvaranje modula preko × istoriju ne dira.
 *
 * Pregledači dozvoljavaju ovo tek posle dodira posetioca - tura se uvek
 * pokreće dodirom ("Istražite sami" / "Automatsko vođenje"), pa je to ispunjeno.
 */
export function useBackGuard(enabled: boolean, closeTopLayer: () => boolean) {
  const [askLeave, setAskLeave] = useState(false);
  const askLeaveRef = useRef(false);
  const leavingRef = useRef(false);
  const closeRef = useRef(closeTopLayer);

  useEffect(() => {
    closeRef.current = closeTopLayer;
  });

  const showAsk = (value: boolean) => {
    askLeaveRef.current = value;
    setAskLeave(value);
  };

  /**
   * Izlazak: nazad preko čuvara (i same ture). Ako strane pre ture nema -
   * tura je otvorena direktno iz poruke - ide se na početnu stranu sajta.
   */
  const leave = (steps: number) => {
    leavingRef.current = true;
    showAsk(false);
    const tourPath = window.location.pathname;
    window.history.go(-steps);
    // Povratak na našu stranu (npr. /ture) ide bez učitavanja, pa se proverava
    // adresa: ako je i dalje tura, nazad nije imao kuda.
    window.setTimeout(() => {
      if (window.location.pathname === tourPath) window.location.replace(window.location.origin + '/');
    }, 700);
  };

  useEffect(() => {
    if (!enabled) return;
    const guard = () => {
      if (!(window.history.state as { k360Guard?: boolean } | null)?.k360Guard) {
        window.history.pushState({ k360Guard: true }, '');
      }
    };
    guard();

    const onPopState = () => {
      if (leavingRef.current) return;
      if (askLeaveRef.current) {
        // Drugo "nazad" dok pitanje stoji: čuvar je već potrošen, sledeći
        // korak unazad je strana pre ture.
        leave(1);
        return;
      }
      if (!closeRef.current()) showAsk(true);
      guard();
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);


  return {
    askLeave,
    stay: () => showAsk(false),
    // Sa pitanja na ekranu: čuvar je vraćen, pa se ide dva koraka nazad.
    leave: () => leave(2)
  };
}
