'use client';

import { useEffect } from 'react';
import { STORY_LANGS, type StoryData } from '../app/lib/tourStory';

/**
 * Pretvara statičnu sekciju "Od tlocrta do ture" (components/TourStory) u
 * priču vođenu skrolom. Vrednosti (granice kadrova, trajanja, uvećanje,
 * okreti pogleda) su iz odobrene makete public/mockup/TlocrtTura.html.
 *
 * Napredak p (0-1) = koliko je visoke sekcije proskrolovano; scena je za to
 * vreme "zalepljena" (CSS .story.is-armed). Panorame su ravne slike koje se
 * pomeraju, kao hero na početnoj, pa tačka (yaw, pitch) ima položaj na ekranu.
 * Petlja radi samo dok je sekcija blizu ekrana. Uz smanjene pokrete ništa se
 * ne naoružava i ostaje statičan prikaz.
 */
type PlayerData = Omit<StoryData, 'planSvg'>;

// Granice kadrova (koraka u listi) - vidi tabelu u specu.
const STAGES = [0, 0.16, 0.23, 0.3, 0.44, 0.58, 0.72, 0.9];
const PHONE = 760;
// Ravna panorama: visina slike = 165% visine prozora, horizont na 52%.
const PANO_ZOOM = 1.65;
const PANO_Y = 0.52;

const seg = (p: number, a: number, b: number) => Math.max(0, Math.min(1, (p - a) / (b - a)));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Najkraći put okreta od `from` do `to` (stepeni). */
const toward = (from: number, to: number) => from + ((((to - from + 540) % 360) + 360) % 360) - 180;

export default function TourStoryPlayer({ data }: { data: PlayerData }) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const section = document.getElementById('od-tlocrta');
    const q = <T extends Element>(sel: string) => section?.querySelector<T>(sel) ?? null;
    const view = q<HTMLElement>('.story-view');
    const planBox = q<HTMLElement>('.story-plan');
    const svg = q<SVGSVGElement>('.story-plan svg');
    const panoA = q<HTMLElement>('.story-pano-a');
    const panoB = q<HTMLElement>('.story-pano-b');
    const tag = q<HTMLElement>('.story-tag');
    const hs = q<HTMLElement>('.story-hs');
    const card = q<HTMLElement>('.story-card');
    const door = q<HTMLElement>('.story-door');
    const mini = q<HTMLElement>('.story-mini');
    const sub = q<HTMLElement>('.story-sub');
    const subtxt = q<HTMLElement>('.story-subtxt');
    if (!section || !view || !planBox || !svg || !panoA || !panoB || !tag || !hs || !card || !door || !mini || !sub || !subtxt) return;

    const steps = Array.from(section.querySelectorAll<HTMLElement>('.story-step'));
    const bars = Array.from(section.querySelectorAll<HTMLElement>('.story-progress b'));
    const langs = Array.from(section.querySelectorAll<HTMLElement>('.story-langs i'));
    const walls = Array.from(svg.querySelectorAll<SVGRectElement>('rect.room'));
    const doors = Array.from(svg.querySelectorAll<SVGElement>('line.door, line.seam'));
    const labels = Array.from(svg.querySelectorAll<SVGTextElement>('text'));
    const cams = Array.from(svg.querySelectorAll<SVGGElement>('.story-cams > g'));
    const [vx, vy, vw, vh] = data.planBox;
    const camA = data.cams.find((c) => c.roomId === data.a.roomId);
    const camB = data.cams.find((c) => c.roomId === data.b.roomId);
    if (!camA || !camB) return;
    const camAIndex = cams.findIndex((g) => g.dataset.room === data.a.roomId);
    // Prostorija u kojoj stoji tačka A - ona zasvetli pre ulaska.
    const roomA = walls.find((r) => {
      const x = Number(r.getAttribute('x'));
      const y = Number(r.getAttribute('y'));
      return camA.x >= x && camA.x <= x + Number(r.getAttribute('width')) && camA.y >= y && camA.y <= y + Number(r.getAttribute('height'));
    });


    // Mali tlocrt: kopija plana bez naziva i tačaka, sa konusom i tačkom.
    const NS = 'http://www.w3.org/2000/svg';
    const miniSvg = svg.cloneNode(true) as SVGSVGElement;
    miniSvg.removeAttribute('role');
    miniSvg.removeAttribute('aria-label');
    miniSvg.querySelectorAll('text, .story-cams').forEach((el) => el.remove());
    const cone = document.createElementNS(NS, 'path');
    cone.setAttribute('d', 'M0 0 L-90 -190 A210 210 0 0 1 90 -190 Z');
    cone.setAttribute('fill', 'rgba(30,90,168,.28)');
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('r', '22');
    dot.setAttribute('fill', '#1e5aa8');
    dot.setAttribute('stroke', '#fff');
    dot.setAttribute('stroke-width', '7');
    miniSvg.append(cone, dot);
    mini.append(miniSvg);

    // Sekcija naraste za nekoliko ekrana. Ako je posetilac već ispod nje (skok
    // na #kontakt, osvežavanje usred strane), pogled se vraća na isti sadržaj.
    // Chrome to radi sam (scroll anchoring), Safari ne - zato se meri sledeći
    // element pre i posle, pa se pomera samo za razliku koja je ostala.
    const after = section.nextElementSibling;
    const below = section.getBoundingClientRect().top < 0;
    const refBefore = after?.getBoundingClientRect().top ?? 0;
    section.classList.add('is-armed');
    if (below && after) {
      const shift = after.getBoundingClientRect().top - refBefore;
      if (Math.abs(shift) > 1) window.scrollBy(0, shift);
    }

    const phone = () => window.innerWidth <= PHONE;
    let loaded = false;
    const loadPanoramas = () => {
      if (loaded) return;
      loaded = true;
      const pick = (r: PlayerData['a']) => (phone() ? r.panorama.phone : r.panorama.desktop);
      panoA.style.backgroundImage = `url(${pick(data.a)})`;
      panoB.style.backgroundImage = `url(${pick(data.b)})`;
    };

    const geo = () => {
      const h = view.clientHeight;
      const Hb = h * PANO_ZOOM;
      return { w: view.clientWidth, h, Hb, Wb: Hb * 2, oy: (h - Hb) * PANO_Y };
    };
    type Geo = ReturnType<typeof geo>;
    const look = (el: HTMLElement, yaw: number, g: Geo) => {
      el.style.backgroundPositionX = `${g.w / 2 - (g.Wb * (yaw + 180)) / 360}px`;
    };
    /** Postavlja element na tačku (yaw, pitch); vraća da li je na ekranu. */
    const place = (el: HTMLElement, pt: { yaw: number; pitch: number }, yawNow: number, g: Geo) => {
      const d = ((((pt.yaw - yawNow + 540) % 360) + 360) % 360) - 180;
      const x = g.w / 2 + (g.Wb * d) / 360;
      const y = (g.Hb * (90 - pt.pitch)) / 180 + g.oy;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      return x > -40 && x < g.w + 40;
    };

    const hsYaw = toward(data.a.startYaw, data.hotspot.yaw);
    const doorYaw = toward(hsYaw, data.door.yaw);
    let lastLang = -1;

    const render = () => {
      const box = section.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, -box.top / (section.offsetHeight - window.innerHeight)));
      const g = geo();

      // 1-3: tlocrt nastaje (zidovi, popuna, vrata, nazivi, tačke)
      walls.forEach((w, i) => {
        const t = ease(seg(p, 0.01 + i * 0.011, 0.06 + i * 0.011));
        // Dok se crta, zid je jedna linija; kad je gotov, vraća se svoj izgled (terasa je isprekidana).
        // pathLength samo dok se crta: posle bi pretvorio crtice terase (14 8) u punu liniju.
        if (t < 1) w.setAttribute('pathLength', '1');
        else w.removeAttribute('pathLength');
        w.style.strokeDasharray = t < 1 ? '1 1' : '';
        w.style.strokeDashoffset = t < 1 ? String(1 - t) : '';
        w.style.fillOpacity = String(seg(p, 0.1 + i * 0.006, 0.15 + i * 0.006));
      });
      doors.forEach((d) => (d.style.opacity = String(seg(p, 0.14, 0.16))));
      const hl = seg(p, 0.3, 0.34);
      const gone = 1 - seg(p, 0.34, 0.37);
      labels.forEach((l, i) => {
        l.style.opacity = String(seg(p, 0.16 + i * 0.006, 0.19 + i * 0.006) * (1 - 0.6 * hl) * gone);
      });
      cams.forEach((c, i) => {
        const t = seg(p, 0.23 + i * 0.005, 0.26 + i * 0.005);
        c.style.opacity = String(t * (i === camAIndex ? 1 : 1 - 0.7 * hl));
        c.style.transform = `scale(${t < 1 ? 0.4 + 0.6 * t : 1})`;
      });
      walls.forEach((w) => {
        if (w !== roomA) w.style.opacity = String(1 - 0.5 * hl);
      });
      if (roomA) roomA.style.fill = hl ? `rgb(${Math.round(lerp(247, 219, hl))},${Math.round(lerp(247, 232, hl))},${Math.round(lerp(244, 250, hl))})` : '';

      // 4: kamera uleti u sobu A, tlocrt se pretopi u panoramu
      const z = ease(seg(p, 0.33, 0.43));
      const S = 1 + 5 * z;
      const fx = ((camA.x - vx) / vw) * g.w;
      const fy = ((camA.y - vy) / vh) * g.h;
      planBox.style.transform = z ? `translate(${(g.w / 2 - fx * S) * z}px,${(g.h / 2 - fy * S) * z}px) scale(${S})` : '';
      planBox.style.opacity = String(1 - seg(p, 0.38, 0.43));
      const ia = seg(p, 0.37, 0.43);
      panoA.style.opacity = String(ia);

      // 5: okret ka hotspotu, 6: okret ka strelici i prolaz u sobu B
      let yawA = lerp(data.a.startYaw, hsYaw, ease(seg(p, 0.42, 0.5)));
      yawA = lerp(yawA, doorYaw, ease(seg(p, 0.58, 0.63)));
      look(panoA, yawA, g);
      hs.classList.toggle('on', p > 0.47 && p < 0.585 && place(hs, data.hotspot, yawA, g));
      card.classList.toggle('on', p > 0.5 && p < 0.58);
      card.style.left = `${Math.min(parseFloat(hs.style.left) + 22, g.w - card.offsetWidth - 10)}px`;
      card.style.top = `${Math.max(10, parseFloat(hs.style.top) - card.offsetHeight - 14)}px`;
      door.classList.toggle('on', p > 0.61 && p < 0.665 && place(door, data.door, yawA, g));
      const walk = ease(seg(p, 0.645, 0.7));
      panoA.style.transform = `scale(${(1.12 - 0.12 * ease(ia)) * (1 + 0.35 * walk)})`;
      panoA.style.filter = walk ? `blur(${walk * 6}px)` : '';
      const ib = seg(p, 0.665, 0.7);
      panoB.style.opacity = String(ib);
      panoB.style.transform = `scale(${1.15 - 0.15 * ease(ib)})`;
      const yawB = lerp(data.b.startYaw - 80, data.b.startYaw, seg(p, 0.68, 0.95));
      look(panoB, yawB, g);

      const inB = p > 0.68;
      tag.textContent = `${(inB ? data.b : data.a).title} · 360°`;
      tag.style.opacity = String(inB ? seg(p, 0.7, 0.72) : seg(p, 0.42, 0.44));

      // Mali tlocrt: tačka putuje A -> B, konus prati pogled
      mini.classList.toggle('on', p > 0.585 && !(phone() && p > 0.72));
      const m = ease(seg(p, 0.655, 0.7));
      const mx = lerp(camA.x, camB.x, m);
      const my = lerp(camA.y, camB.y, m);
      const heading = inB ? data.b.heading : data.a.heading;
      dot.setAttribute('cx', String(mx));
      dot.setAttribute('cy', String(my));
      cone.style.display = heading === null ? 'none' : '';
      cone.setAttribute('transform', `translate(${mx} ${my}) rotate(${(inB ? yawB : yawA) + (heading ?? 0)})`);

      // 7: titl vodiča kroz 4 jezika
      sub.classList.toggle('on', p > 0.72 && p < 0.93);
      const li = Math.min(STORY_LANGS.length - 1, Math.floor(seg(p, 0.73, 0.9) * STORY_LANGS.length));
      langs.forEach((el, i) => el.classList.toggle('on', i === li));
      if (li !== lastLang) {
        lastLang = li;
        subtxt.textContent = data.b.subtitles[STORY_LANGS[li]];
      }

      let stage = 0;
      STAGES.forEach((s, i) => {
        if (p >= s) stage = i;
      });
      steps.forEach((s, i) => s.classList.toggle('on', i === stage));
      bars.forEach((b, i) => (b.style.transform = `scaleX(${seg(p, STAGES[i], STAGES[i + 1] ?? 1)})`));
    };

    let frame = 0;
    const onScroll = () => {
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          render();
        });
    };
    // Skrol se sluša samo dok je sekcija blizu; panorame se tada i skidaju.
    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadPanoramas();
          window.addEventListener('scroll', onScroll, { passive: true });
          window.addEventListener('resize', onScroll);
          onScroll();
        } else {
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onScroll);
        }
      },
      { rootMargin: '800px 0px' }
    );
    near.observe(section);
    render();

    return () => {
      near.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
      section.classList.remove('is-armed');
      miniSvg.remove();
      for (const el of [...walls, ...doors, ...labels, ...cams, planBox, panoA, panoB, tag, hs, card, door, sub, ...bars]) el.removeAttribute('style');
      for (const w of walls) w.removeAttribute('pathLength');
      for (const el of [hs, card, door, mini, sub, ...steps, ...langs]) el.classList.remove('on');
      tag.textContent = '';
      subtxt.textContent = '';
    };
  }, [data]);

  return null;
}
