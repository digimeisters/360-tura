'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Skače na vrh strane pri svakoj promeni putanje (klik na Link ka drugoj
 * strani), bez animacije.
 *
 * Next App Router ne garantuje pouzdano da to uradi sam: dok je nova strana
 * (kraća od one sa koje se dolazi) u toku iscrtavanja, dokument se skraćuje,
 * pa pregledač sam spusti scrollY na novi maksimum - dno - bez ijedne
 * animacije koja bi se mogla presresti. Ko klikne "Pogledajte sve ture" pri
 * dnu duge početne strane, otvori /ture na dnu spiska umesto na vrhu.
 *
 * Ne prvi put: pri prvom učitavanju strane pregledač sam ispravno skoči na
 * vrh, ili na sidro iz adrese (npr. otvoren link .../za-agencije#paketi) -
 * ovo bi ga poništilo. Zato se prvo okidanje efekta preskače, i uopšte se
 * ne diže ako adresa nosi sidro.
 */
export default function ScrollToTop() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (window.location.hash) return;

    // Ne samo jedan poziv: ako je sa PRETHODNE strane ostala u toku neka
    // animacija skrola (npr. klik na pilulu sidra netom pre klika na vezu
    // ka ovoj strani), jedan scrollTo zna da izgubi tu trku - animacija
    // nastavi da je pomera posle. Par kadrova unazad je nevidljivo, a
    // garantuje da vrh strane pobedi bez obzira šta se dešavalo pre.
    let framesLeft = 6;
    let frame = requestAnimationFrame(function tick() {
      window.scrollTo(0, 0);
      framesLeft -= 1;
      if (framesLeft > 0) frame = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
