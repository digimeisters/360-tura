'use client';

import { useEffect } from 'react';

/**
 * Animacije pri skrolu (početna, za-agencije; vidi
 * docs/superpowers/specs/2026-10-21-animacije-sajta-design.md). Kao
 * CardSpotlight: jedan efekat na nivou dokumenta, pa sadržaj strane ostaje
 * serverski i samo nosi oznake.
 *
 *   data-reveal="up|blur|scale|list"  element izroni kad uđe u ekran
 *   data-reveal-steps                 red koraka "Kako radimo": linija kroz krugove
 *   data-reveal-group                 dobija .is-in kad uđe u ekran, bez skrivanja -
 *                                     unutrašnji filmovi su u CSS-u strane
 *   data-count                        brojevi u tekstu (31%, +79%, 3:40) narastu od nule
 *   .btn-primary                      jedan odsjaj kad se prvi put pojavi
 *
 * Skrivanje važi samo dok je na <html> klasa rv-armed, koju postavlja ova
 * komponenta. Bez JS-a i uz smanjene pokrete sve ostaje vidljivo. Pri odlasku
 * sa strane (Link) klasa se skida, da druga strana ne ostane skrivena.
 */
const VIEW: IntersectionObserverInit = { threshold: 0.15, rootMargin: '0px 0px -8% 0px' };

export default function SiteReveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const root = document.documentElement;
    const items = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal-steps]'));
    const buttons = Array.from(document.querySelectorAll<HTMLElement>('.btn-primary'));
    const groups = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal-group]'));
    const counters = Array.from(document.querySelectorAll<HTMLElement>('[data-count]'));
    const texts = new Map(counters.map((el) => [el, el.textContent ?? '']));
    const frames = new Set<number>();
    // Sve cifre u tekstu rastu zajedno (1200 ms, ease-out); na kraju tačan tekst.
    // Broj sa tačkom za hiljade (19.817) broji kao jedan broj i zadržava tačke.
    const NUMBER = /\d{1,3}(?:\.\d{3})+|\d+/g;
    const scaled = (d: string, e: number) => {
      const n = Math.round(Number(d.replace(/\./g, '')) * e);
      return d.includes('.') ? n.toLocaleString('sr-RS') : String(n);
    };
    const count = (el: HTMLElement) => {
      const text = texts.get(el) ?? '';
      if (!/\d/.test(text)) return;
      const start = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - start) / 1200);
        const e = 1 - Math.pow(1 - k, 3);
        el.textContent = k < 1 ? text.replace(NUMBER, (d) => scaled(d, e)) : text;
        if (k < 1) frames.add(requestAnimationFrame(step));
      };
      el.textContent = text.replace(NUMBER, '0');
      frames.add(requestAnimationFrame(step));
    };

    // Redosled u grupi: indeks među braćom koja takođe izranjaju.
    const counts = new Map<Element | null, number>();
    for (const el of items) {
      const n = counts.get(el.parentElement) ?? 0;
      counts.set(el.parentElement, n + 1);
      el.style.setProperty('--i', String(n));
    }

    // Linija kroz krugove: od centra prvog do centra poslednjeg.
    const added: HTMLElement[] = [];
    const resizers: ResizeObserver[] = [];
    for (const row of rows) {
      const track = document.createElement('div');
      const line = document.createElement('div');
      track.className = 'rv-steps-track';
      line.className = 'rv-steps-line';
      track.setAttribute('aria-hidden', 'true');
      line.setAttribute('aria-hidden', 'true');
      row.prepend(line);
      row.prepend(track);
      added.push(track, line);
      // Mera preko offsetTop/offsetLeft, ne getBoundingClientRect: koraci su
      // dok ne izrone pomereni (translateY), a linija mora da pogodi krugove
      // na njihovom konačnom mestu.
      const centerIn = (el: HTMLElement) => {
        let x = el.offsetWidth / 2;
        let y = el.offsetHeight / 2;
        for (let e: HTMLElement | null = el; e && e !== row; e = e.offsetParent as HTMLElement | null) {
          x += e.offsetLeft;
          y += e.offsetTop;
        }
        return { x, y };
      };
      const place = () => {
        const nums = row.querySelectorAll<HTMLElement>('.num');
        if (nums.length < 2) return;
        const a = centerIn(nums[0]);
        const b = centerIn(nums[nums.length - 1]);
        for (const el of [track, line]) {
          el.style.left = `${a.x - 1}px`;
          el.style.top = `${a.y}px`;
          el.style.height = `${b.y - a.y}px`;
        }
      };
      place();
      const ro = new ResizeObserver(place);
      ro.observe(row);
      resizers.push(ro);
    }

    root.classList.add('rv-armed');

    const pending = new Set<HTMLElement>();
    const reveal = (el: HTMLElement) => {
      pending.delete(el);
      io.unobserve(el);
      if (el.hasAttribute('data-reveal-steps')) {
        el.classList.add('is-in');
        el.querySelectorAll('[data-reveal]').forEach((step) => step.classList.add('is-in'));
        return;
      }
      if (el.hasAttribute('data-reveal') || el.hasAttribute('data-reveal-group')) el.classList.add('is-in');
      if (el.classList.contains('btn-primary')) el.classList.add('is-shone');
      if (el.hasAttribute('data-count')) count(el);
    };

    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) reveal(entry.target as HTMLElement);
      }
    }, VIEW);

    for (const el of items) if (!el.closest('[data-reveal-steps]')) pending.add(el);
    for (const el of [...rows, ...buttons, ...groups, ...counters]) pending.add(el);
    pending.forEach((el) => io.observe(el));

    // Ono što je ostalo iznad ekrana (skok na #kontakt, osvežavanje usred
    // strane) observer ne javlja, jer element nikad nije prešao preko ekrana.
    // Otkriva se odmah, da posetilac pri skrolu nagore ne nađe prazne sekcije.
    let frame = 0;
    const sweep = () => {
      frame = 0;
      pending.forEach((el) => {
        if (el.getBoundingClientRect().bottom < 0) reveal(el);
      });
      if (!pending.size) window.removeEventListener('scroll', onScroll);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(sweep);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
      resizers.forEach((ro) => ro.disconnect());
      added.forEach((el) => el.remove());
      root.classList.remove('rv-armed');
      frames.forEach((id) => cancelAnimationFrame(id));
      texts.forEach((text, el) => (el.textContent = text));
      for (const el of groups) el.classList.remove('is-in');
      for (const el of [...items, ...rows]) el.classList.remove('is-in');
      for (const el of buttons) el.classList.remove('is-shone');
    };
  }, []);

  return null;
}
