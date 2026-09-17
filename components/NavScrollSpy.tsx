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
 * Aktivna je POSLEDNJA sekcija čiji je vrh prošao zamišljenu liniju na
 * trećini visine ekrana. Ne "sekcija koja preseca liniju", jer strana ima i
 * sekcije bez pilule (npr. Tipovi oglasa) - kroz njih bi sve pilule bile
 * ugašene; ovako ostaje označena poslednja kroz koju se prošlo. I ne
 * "najveći vidljivi deo", jer kratke sekcije (FAQ) nikad ne zauzmu najveći
 * deo ekrana, pa se nikad ne bi označile.
 *
 * Uz to, ista komponenta preuzima klik na SVAKO sidro na strani (ne samo
 * pilule u meniju - i dugmad kao "Pogledajte pakete") i sama klizi do njega
 * preko scrollIntoView. Ovo NIJE ukras: meko klizanje nekad je stajalo kao
 * scroll-behavior:smooth na <html>, pa je važilo i za prelaz na DRUGU
 * stranu - Next pozove skok na vrh nove strane, taj skok krene da se
 * animira sa dna duge polazne strane, a kraća nova strana je u
 * međuvremenu već iscrtana, pa se animacija prekine na pola i posetilac
 * otvori /ture ili /za-agencije usred spiska umesto na vrhu. Klizanje sad
 * ide samo za sidra NA OVOJ strani, pa ne može da procuri na navigaciju.
 */

// Na kojoj visini ekrana stoji linija koja bira sekciju (0 = vrh, 1 = dno).
const LINE_RATIO = 0.3;

export default function NavScrollSpy() {
  // Meko klizanje ka sidrima, na klik - vidi napomenu iznad. Odvojen efekat
  // od scrollspy-ja ispod: ovaj hvata SVAKU vezu na sidro (i dugmad izvan
  // .navlinks), ne samo pilule u meniju.
  useEffect(() => {
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const anchors = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')
    ).filter((a) => document.getElementById(a.getAttribute('href')!.slice(1)));

    const onClick = (link: HTMLAnchorElement) => (e: MouseEvent) => {
      // Klik sa modifikatorom (nov tab, novi prozor...) ide default putem.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const id = link.getAttribute('href')!.slice(1);
      const target = document.getElementById(id);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
      history.pushState(null, '', `#${id}`);
    };

    const offs = anchors.map((a) => {
      const handler = onClick(a);
      a.addEventListener('click', handler);
      return () => a.removeEventListener('click', handler);
    });

    return () => offs.forEach((off) => off());
  }, []);

  useEffect(() => {
    // Uz veze na deo iste strane (#nesto) i one koje vode na DRUGU stranu,
    // a odgovaraju sekciji ovde - "Za agencije" vodi na /za-agencije, ali
    // na početnoj postoji i sekcija koja na tu stranu upućuje. Takva veza
    // sama kaže kojoj sekciji pripada, preko data-section.
    const links = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('.navlinks a[href^="#"], .navlinks a[data-section]')
    );

    const pairs = links
      .map((link) => {
        const id = link.dataset.section || link.getAttribute('href')?.slice(1) || '';
        const section = id ? document.getElementById(id) : null;
        return section ? { link, section } : null;
      })
      .filter((pair): pair is { link: HTMLAnchorElement; section: HTMLElement } => pair !== null)
      // Redom kako sekcije stoje na strani, a ne kako su pilule poređane u
      // meniju - da pogrešan redosled u meniju ne pokvari biranje sekcije.
      .sort((a, b) => a.section.offsetTop - b.section.offsetTop);

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
        if (section.getBoundingClientRect().top > line) break;
        currentId = section.id;
      }

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
