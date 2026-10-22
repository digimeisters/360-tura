'use client';

import { useEffect, useRef } from 'react';

/**
 * Tanka plava traka na vrhu ekrana koja se puni dok se čita tekst bloga
 * (vlasnik, 22. 10. 2026). Meri se samo telo teksta (`targetId`), ne cela
 * strana: puna je kad se pročita poslednji pasus, a ne kad se stigne do
 * podnožja. Pokazuje napredak, ne pomera sadržaj, pa ostaje i uz smanjene
 * pokrete. Bez JS-a se ne vidi.
 */
export default function ReadingProgress({ targetId }: { targetId: string }) {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = document.getElementById(targetId);
    const el = bar.current;
    if (!target || !el) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const box = target.getBoundingClientRect();
      const total = box.height - window.innerHeight;
      const done = total > 0 ? Math.min(1, Math.max(0, -box.top / total)) : box.top < 0 ? 1 : 0;
      el.style.transform = `scaleX(${done})`;
      el.style.opacity = box.top < window.innerHeight * 0.5 ? '1' : '0';
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [targetId]);

  return <div ref={bar} className="reading-progress" aria-hidden="true" />;
}
