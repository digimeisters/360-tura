'use client';

import { useEffect } from 'react';
import type { InvestorStoryData } from '../app/lib/investorStory';

/**
 * Pretvara statičnu sekciju "Od zgrade do upita" (components/InvestorStory)
 * u priču vođenu skrolom. Granice kadrova i trajanja su iz odobrene makete
 * public/mockup/InvestitorPrica.html. Isti obrazac kao TourStoryPlayer:
 * napredak p (0-1) iz skrola, scena "zalepljena" dok traje, petlja samo dok
 * je sekcija blizu ekrana, uz smanjene pokrete ništa se ne naoružava.
 */
const STAGES = [0, 0.16, 0.3, 0.42, 0.54, 0.64, 0.77, 0.86, 0.95];
const PHONE = 760;

const seg = (p: number, a: number, b: number) => Math.max(0, Math.min(1, (p - a) / (b - a)));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const mix = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
const center = (poly: [number, number][]) => [
  poly.reduce((s, p) => s + p[0], 0) / poly.length,
  poly.reduce((s, p) => s + p[1], 0) / poly.length
];

export default function InvestorStoryPlayer({ data }: { data: InvestorStoryData }) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const section = document.getElementById('kupac');
    const q = <T extends Element>(sel: string) => section?.querySelector<T>(sel) ?? null;
    const view = q<HTMLElement>('.inv-view');
    const facade = q<HTMLElement>('.inv-facade');
    const facadeImg = q<HTMLImageElement>('.inv-facade-img');
    const plan = q<HTMLElement>('.inv-plan');
    const planImg = q<HTMLImageElement>('.inv-plan-img');
    const d3 = q<HTMLElement>('.inv-3d');
    const d3Img = q<HTMLImageElement>('.inv-3d-img');
    const legend = q<HTMLElement>('.inv-legend');
    const floorTag = q<HTMLElement>('.inv-floor-tag');
    const card = q<HTMLElement>('.inv-card');
    const badge = q<HTMLElement>('.inv-badge');
    const cbtn = q<HTMLElement>('.inv-cbtn');
    const toast = q<HTMLElement>('.inv-toast');
    if (!section || !view || !facade || !facadeImg || !plan || !planImg || !legend || !floorTag || !card || !badge || !cbtn || !toast) return;

    const floors = Array.from(section.querySelectorAll<SVGPolygonElement>('.inv-fl'));
    const units = Array.from(section.querySelectorAll<SVGPolygonElement>('.inv-un'));
    const codes = Array.from(section.querySelectorAll<HTMLElement>('.inv-code'));
    const steps = Array.from(section.querySelectorAll<HTMLElement>('.inv-step'));
    const bars = Array.from(section.querySelectorAll<HTMLElement>('.inv-progress b'));
    const tabs = Array.from(section.querySelectorAll<HTMLElement>('.inv-tabs i'));
    const typed = Array.from(section.querySelectorAll<HTMLElement>('.inv-field b'));
    const statusText = badge.textContent ?? '';
    const reservedText = toast.querySelector('b')?.textContent ?? '';
    for (const el of [...floors, ...units]) el.setAttribute('pathLength', '1');

    // Prozor priče ima razmeru fasade (mera iz same slike, bez upita).
    const fitView = () => {
      if (facadeImg.naturalWidth) view.style.aspectRatio = `${facadeImg.naturalWidth} / ${facadeImg.naturalHeight}`;
    };
    facadeImg.addEventListener('load', fitView);
    fitView();

    section.classList.add('is-armed');

    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      if (window.innerWidth <= PHONE) facadeImg.src = data.facade.phone;
      planImg.src = data.plan;
      if (d3Img && data.unit.plan3d) d3Img.src = data.unit.plan3d;
    };

    const fc = center(data.floors[data.pick]);
    const render = () => {
      const box = section.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, -box.top / (section.offsetHeight - window.innerHeight)));
      const w = view.clientWidth;
      const h = view.clientHeight;

      // 1 Zgrada (spratovi se iscrtaju odozdo), 2 Statusi (oboje se po statusu stanova)
      const fz = 1.06 - 0.06 * ease(seg(p, 0, 0.12));
      const hl = seg(p, 0.3, 0.34);
      floors.forEach((f, i) => {
        const t = ease(seg(p, 0.05 + i * 0.022, 0.12 + i * 0.022));
        f.style.strokeDasharray = t < 1 ? '1 1' : '';
        f.style.strokeDashoffset = t < 1 ? String(1 - t) : '';
        const g = seg(p, 0.17 + i * 0.013, 0.23 + i * 0.013);
        f.style.fill =
          i === data.pick
            ? `rgba(${mix(46, 30, hl)},${mix(158, 90, hl)},${mix(91, 168, hl)},${0.32 * g + 0.2 * hl})`
            : `rgba(46,158,91,${0.32 * g * (1 - 0.6 * hl)})`;
      });
      legend.style.opacity = String(seg(p, 0.17, 0.21) * (1 - seg(p, 0.36, 0.4)));

      // 3 Sprat: kamera uleti u izabrani sprat, fasada se pretopi u osnovu
      const z = ease(seg(p, 0.33, 0.42));
      const S = 1 + 1.6 * z;
      facade.style.transform = `translate(${(w / 2 - fc[0] * w * S) * z}px,${(h / 2 - fc[1] * h * S) * z}px) scale(${S * fz})`;
      facade.style.opacity = String(1 - seg(p, 0.38, 0.43));
      const pl = seg(p, 0.38, 0.44);
      plan.style.opacity = String(pl);
      plan.style.transform = `scale(${1.08 - 0.08 * ease(pl)})`;
      floorTag.style.opacity = String(seg(p, 0.42, 0.44) * (1 - seg(p, 0.64, 0.66)) + seg(p, 0.76, 0.78));

      // 4 Osnova: stanovi se ocrtaju, izabrani se istakne; 8 Prodaja: postane rezervisan
      const pick = seg(p, 0.51, 0.54);
      const res = seg(p, 0.86, 0.88);
      units.forEach((un, i) => {
        const t = ease(seg(p, 0.43 + i * 0.007, 0.47 + i * 0.007));
        un.style.strokeDasharray = t < 1 ? '1 1' : '';
        un.style.strokeDashoffset = t < 1 ? String(1 - t) : '';
        const g = seg(p, 0.46, 0.5);
        const mine = i === data.unitPick && pick > 0;
        un.style.fill = mine
          ? `rgba(${mix(mix(46, 30, pick), 217, res)},${mix(mix(158, 90, pick), 154, res)},${mix(mix(91, 168, pick), 30, res)},${0.3 + 0.15 * pick})`
          : `rgba(46,158,91,${0.3 * g * (1 - 0.5 * pick)})`;
        un.style.stroke = mine ? (res ? '#D99A1E' : '#1e5aa8') : '';
        un.style.strokeWidth = mine ? '4px' : '';
      });
      codes.forEach((c) => (c.style.opacity = String(seg(p, 0.47, 0.5))));

      // 5 Stan: kartica; 6 3D: pravi 3D prikaz preko osnove
      card.classList.toggle('on', p > 0.55);
      const in3d = !!d3 && p > 0.64 && p < 0.76;
      if (d3 && d3Img) {
        d3.style.opacity = String(seg(p, 0.64, 0.68) * (1 - seg(p, 0.74, 0.77)));
        const k = ease(seg(p, 0.64, 0.76));
        d3Img.style.transform = `scale(${1.12 - 0.12 * k}) rotate(${-3 + 3 * k}deg)`;
      }
      card.classList.toggle('in3d', in3d);
      tabs.forEach((t, i) => t.classList.toggle('on', in3d ? i === 2 : i === 0));

      // 7 Upit: polja se otkucaju, pa potvrda
      card.classList.toggle('asking', p > 0.77);
      typed.forEach((el, i) => {
        const text = el.dataset.type ?? '';
        el.textContent = text.slice(0, Math.round(text.length * seg(p, 0.78 + i * 0.02, 0.8 + i * 0.02)));
      });
      const sent = p > 0.83;
      cbtn.textContent = (sent ? cbtn.dataset.sent : cbtn.dataset.send) ?? '';
      cbtn.classList.toggle('ok', sent);
      const reserved = p > 0.87;
      badge.textContent = reserved ? reservedText : statusText;
      badge.classList.toggle('res', reserved);
      toast.classList.toggle('on', p > 0.86 && p < 0.97);

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
    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          load();
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
      facadeImg.removeEventListener('load', fitView);
      if (frame) cancelAnimationFrame(frame);
      section.classList.remove('is-armed');
      for (const el of [view, facade, plan, legend, floorTag, ...floors, ...units, ...bars]) el.removeAttribute('style');
      // Oznake stanova nose položaj od Reacta (style left/top) - briše se samo ono što je dodao player.
      codes.forEach((c) => (c.style.opacity = ''));
      if (d3) d3.removeAttribute('style');
      if (d3Img) d3Img.removeAttribute('style');
      for (const el of [...floors, ...units]) el.removeAttribute('pathLength');
      for (const el of [card, toast, cbtn, badge, ...steps, ...tabs]) el.classList.remove('on', 'ok', 'res', 'in3d', 'asking');
      tabs[0]?.classList.add('on');
      typed.forEach((el) => (el.textContent = ''));
      badge.textContent = statusText;
      cbtn.textContent = cbtn.dataset.send ?? '';
    };
  }, [data]);

  return null;
}
