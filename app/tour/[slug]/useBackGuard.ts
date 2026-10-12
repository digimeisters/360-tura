import { useEffect, useRef, useState } from 'react';

/**
 * Dugme "nazad" (Android) i povlačenje od ivice (iPhone) usred ture:
 * 1. ako je nešto otvoreno (modul, kartica sa tekstom, forma) - zatvara samo to;
 * 2. ako ništa nije otvoreno - pita "Da li želite da napustite turu?";
 * 3. još jedno "nazad" dok je pitanje na ekranu - izlazi iz ture.
 *
 * Radi preko jednog "čuvara" u istoriji pregledača: dodat korak istorije koji
 * "nazad" troši umesto da napusti stranu. Zatvaranje modula preko × istoriju
 * ne dira.
 *
 * Čuvar se dodaje SAMO uz dodir posetioca. Chrome na Androidu dugmetom "nazad"
 * preskače korake koje je strana dodala bez dodira (zaštita od strana koje
 * "zarobe" posetioca) - kad smo čuvar vraćali odmah posle "nazad", prvo sledeće
 * "nazad" je izbacivalo iz ture bez pitanja (prijava vlasnika 12. 10. 2026).
 * Zato: posle "nazad" čuvar se ne vraća odmah, nego na prvi sledeći dodir
 * (prevlačenje panorame, "Ostani", bilo koje dugme).
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

  const isArmed = () => Boolean((window.history.state as { k360Guard?: boolean } | null)?.k360Guard);

  /**
   * Izlazak dugmetom "Napusti": nazad preko čuvara (ako je postavljen) i same
   * ture. Ako strane pre ture nema - tura je otvorena direktno iz poruke - ide
   * se na početnu stranu sajta.
   */
  const leave = () => {
    leavingRef.current = true;
    showAsk(false);
    const tourPath = window.location.pathname;
    window.history.go(isArmed() ? -2 : -1);
    // Povratak na našu stranu (npr. /ture) ide bez učitavanja, pa se proverava
    // adresa: ako je i dalje tura, nazad nije imao kuda.
    window.setTimeout(() => {
      if (window.location.pathname === tourPath) window.location.replace(window.location.origin + '/');
    }, 700);
  };

  useEffect(() => {
    if (!enabled) return;
    leavingRef.current = false;

    // Da li je ovo "nazad" potrošilo naš čuvar (tura je i dalje otvorena) ili je
    // pregledač već krenuo na stranu pre ture.
    let guardSet = isArmed();
    const arm = () => {
      if (leavingRef.current || isArmed()) return;
      window.history.pushState({ k360Guard: true }, '');
      guardSet = true;
    };
    // Tura se uvek pokreće dodirom ("Istražite sami" / "Automatsko vođenje"),
    // pa je prvi čuvar odmah ispravan.
    arm();

    const onPopState = () => {
      if (leavingRef.current) return;
      const consumedGuard = guardSet;
      guardSet = false;
      if (askLeaveRef.current) {
        // Drugo "nazad" dok pitanje stoji. Ako je posetilac u međuvremenu
        // dodirnuo ekran, ovo "nazad" je pojelo čuvar - izlazimo korak dalje;
        // inače je pregledač već krenuo na stranu pre ture - samo ga pustimo.
        if (consumedGuard) {
          leave();
        } else {
          leavingRef.current = true;
          showAsk(false);
        }
        return;
      }
      // Bez čuvara pregledač je već napustio turu - nema šta da se zatvara.
      if (!consumedGuard) return;
      if (!closeRef.current()) showAsk(true);
      // Čuvar se NE vraća ovde (vidi gore) - vraća ga sledeći dodir.
    };

    // Događaji koje pregledač računa kao dodir posetioca.
    const gestureEvents = ['pointerup', 'touchend', 'keydown'] as const;
    for (const type of gestureEvents) window.addEventListener(type, arm, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      for (const type of gestureEvents) window.removeEventListener(type, arm, true);
      window.removeEventListener('popstate', onPopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    askLeave,
    stay: () => showAsk(false),
    leave
  };
}
