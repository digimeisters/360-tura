'use client';

import { useEffect } from 'react';

/**
 * Označava pilulu u zaglavlju koja odgovara sekciji kroz koju posetilac
 * upravo prolazi (scrollspy). Ne dira raspored strane niti markup navigacije
 * - sam pronađe veze iz `.navlinks` koje vode na deo iste strane (#nesto) i
 * postavlja `aria-current` na onu čija je sekcija trenutno na ekranu.
 *
 * `aria-current` namerno, a ne samo klasa: čitač ekrana tako kaže "trenutna
 * stavka", a CSS se kači na isti atribut (vidi .navlinks a[aria-current] u
 * lib/siteStyles.ts).
 *
 * Aktivna je ona sekcija koja preseca zamišljenu liniju na trećini visine
 * ekrana. Linija, a ne "najveći vidljivi deo": kratke sekcije (npr. FAQ)
 * nikad ne zauzmu najveći deo ekrana, pa se sa procentima nikad ne bi
 * označile.
 */

// Na kojoj visini ekrana stoji linija koja bira sekciju (0 = vrh, 1 = dno).
const LINE_RATIO = 0.3;

export default function NavScrollSpy() {
  useEffect(() => {
    const links = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('.navlinks a[href^="#"]')
    );

    const pairs = links
      .map((link) => {
        const id = link.getAttribute('href')?.slice(1) ?? '';
        const section = id ? document.getElementById(id) : null;
        return section ? { link, section } : null;
      })
      .filter((pair): pair is { link: HTMLAnchorElement; section: HTMLElement } => pair !== null);

    if (pairs.length === 0) return;

    const list = pairs[0].link.closest<HTMLElement>('.navlinks');
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let activeId: string | null = null;
    let frame = 0;

    // Na telefonu su pilule u traci koja se pomera prstom - označena pilula
    // ne sme da ostane van vidokruga. Pomera se SAMO ta traka (scrollLeft),
    // nikako cela strana, jer bi to otelo skrolovanje posetiocu.
    const revealInStrip = (link: HTMLAnchorElement) => {
      if (!list || list.scrollWidth <= list.clientWidth) return;
      const left = link.offsetLeft - (list.clientWidth - link.offsetWidth) / 2;
      list.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
    };

    const update = () => {
      frame = 0;
      const line = window.innerHeight * LINE_RATIO;

      let currentId: string | null = null;
      for (const { section } of pairs) {
        const { top, bottom } = section.getBoundingClientRect();
        if (top <= line && bottom > line) {
          currentId = section.id;
          break;
        }
      }

      // Dno strane: poslednja sekcija često nije dovoljno visoka da dohvati
      // liniju, pa bi na kraju strane sve pilule ostale ugašene.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (!currentId && atBottom) currentId = pairs[pairs.length - 1].section.id;

      if (currentId === activeId) return;
      activeId = currentId;

      for (const { link, section } of pairs) {
        if (section.id === currentId) {
          link.setAttribute('aria-current', 'true');
          revealInStrip(link);
        } else {
          link.removeAttribute('aria-current');
        }
      }
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      for (const { link } of pairs) link.removeAttribute('aria-current');
    };
  }, []);

  return null;
}
