'use client';

import { useEffect, useRef, useState } from 'react';
import type { CardStrip } from '../app/lib/cardStrips';

/**
 * Živa slika kartice ture (vlasnik, 31. 10. 2026; maketa
 * public/mockup/KarticeDisu.html): preko fotografije stoji traka panorame
 * (migracija 044) koja se polako okreće i na svakih nekoliko sekundi pređe
 * u sledeću prostoriju. Prevlačenje levo-desno okreće pogled; prst gore-dole
 * i dalje skroluje stranu, a klik bez prevlačenja otvara turu.
 *
 * Štedi stranu: traka se učitava tek kad je kartica blizu ekrana, sledeće
 * prostorije tek kad dođe vreme za njih, a kreće se samo vidljiva kartica.
 * "Manje pokreta" = mirna prva traka; ušteda podataka = ostaje fotografija.
 */

const REVOLUTION_S = 90; // jedan pun krug sam od sebe
const ROOM_MS = 7000;
const DRAG_PX = 6;

type Card = { tick: (dt: number, now: number) => void };
const running = new Set<Card>();
let last = 0;
let raf = 0;

function loop(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  for (const c of running) c.tick(dt, now);
  raf = running.size ? requestAnimationFrame(loop) : 0;
}
function start(c: Card) {
  running.add(c);
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
}

function loadSize(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
    img.onerror = reject;
    img.src = url;
  });
}

export default function CardPanorama({ strips, lang }: { strips: CardStrip[]; lang: string }) {
  const root = useRef<HTMLDivElement>(null);
  const trackA = useRef<HTMLDivElement>(null);
  const trackB = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const [front, setFront] = useState(0);
  const [urls, setUrls] = useState<[string | null, string | null]>([null, null]);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el || strips.length === 0) return;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (nav.connection?.saveData) return;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const s = {
      x: Math.random() * 1000,
      aspect: 0,
      height: el.clientHeight,
      visible: false,
      started: false,
      dragging: false,
      busy: false,
      room: 0,
      front: 0,
      nextAt: 0
    };
    const width = () => s.height * s.aspect;
    const paint = () => {
      const w = width();
      if (!w) return;
      const offset = -(((s.x % w) + w) % w);
      for (const t of [trackA.current, trackB.current]) {
        if (!t) continue;
        t.style.width = `${w * 2}px`;
        t.style.transform = `translate3d(${offset}px,0,0)`;
      }
    };

    const show = async (idx: number) => {
      if (s.busy) return;
      s.busy = true;
      try {
        const aspect = await loadSize(strips[idx].url);
        if (!s.aspect) s.aspect = aspect;
        const back = 1 - s.front;
        setUrls((u) => {
          const next: [string | null, string | null] = [...u];
          next[back] = strips[idx].url;
          return next;
        });
        s.front = back;
        s.room = idx;
        setFront(back);
        setLive(true);
        paint();
      } catch {
        // Traka nije stigla - kartica ostaje na fotografiji ili prethodnoj sobi.
      } finally {
        s.busy = false;
        s.nextAt = performance.now() + ROOM_MS;
      }
    };

    const card: Card = {
      tick(dt, now) {
        if (!s.visible || !s.aspect) return;
        if (!still && !s.dragging) s.x += (width() / REVOLUTION_S) * dt;
        paint();
        if (!still && !s.dragging && strips.length > 1 && now > s.nextAt) {
          s.nextAt = now + ROOM_MS;
          show((s.room + 1) % strips.length);
        }
      }
    };

    const io = new IntersectionObserver(
      ([e]) => {
        s.visible = e.isIntersecting;
        if (s.visible && !s.started) {
          s.started = true;
          show(0);
        }
        if (s.visible) start(card);
        else running.delete(card);
      },
      { rootMargin: '200px' }
    );
    io.observe(el);
    const ro = new ResizeObserver(() => {
      s.height = el.clientHeight;
      paint();
    });
    ro.observe(el);

    // Prevlačenje: levo-desno okreće pogled. Pregledač preuzima vertikalni
    // pokret za skrol (touch-action: pan-y) i šalje pointercancel.
    let startX = 0;
    let startPos = 0;
    let moved = false;
    const down = (e: PointerEvent) => {
      if (!s.aspect || (e.pointerType === 'mouse' && e.button !== 0)) return;
      startX = e.clientX;
      startPos = s.x;
      moved = false;
      s.dragging = true;
    };
    const move = (e: PointerEvent) => {
      if (!s.dragging) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > DRAG_PX) {
        moved = true;
        setDragging(true);
        el.setPointerCapture(e.pointerId);
      }
      if (moved) {
        s.x = startPos - dx;
        paint();
      }
    };
    const up = () => {
      if (!s.dragging) return;
      s.dragging = false;
      setDragging(false);
      s.nextAt = performance.now() + ROOM_MS;
    };
    // Kartica je link: posle prevlačenja klik ne sme da otvori turu.
    const click = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    };
    // Pregledač inače počinje da "vuče" ceo link kao prevlačenje fajla.
    const noNativeDrag = (e: DragEvent) => e.preventDefault();
    el.addEventListener('dragstart', noNativeDrag);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('click', click);

    return () => {
      io.disconnect();
      ro.disconnect();
      running.delete(card);
      el.removeEventListener('dragstart', noNativeDrag);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('click', click);
    };
  }, [strips]);

  if (strips.length === 0) return null;
  const hint = lang === 'en' ? 'Drag to look around' : 'Prevucite da pogledate okolo';

  return (
    <div ref={root} className={`cp${live ? ' is-live' : ''}${dragging ? ' is-dragging' : ''}`} aria-hidden="true">
      <div className={`cp-layer${live && front === 0 ? ' is-on' : ''}`}>
        <div ref={trackA} className="cp-track" style={urls[0] ? { backgroundImage: `url("${urls[0]}")` } : undefined} />
      </div>
      <div className={`cp-layer${live && front === 1 ? ' is-on' : ''}`}>
        <div ref={trackB} className="cp-track" style={urls[1] ? { backgroundImage: `url("${urls[1]}")` } : undefined} />
      </div>
      <span className="glass cp-chip">360°</span>
      <span className="glass cp-hint">{hint}</span>
    </div>
  );
}
