'use client';

import { useEffect, useRef, useState } from 'react';
import { formatAmount, type PriceLang } from '../app/lib/pricing';

/**
 * Broj koji naraste od nule kad uđe u ekran (cene u cenovniku, broj otvaranja
 * tura u heroju). Server i prvi prikaz pišu KONAČAN broj, pa je iznos tačan za
 * Google, čitače ekrana i kad JS ne radi. Broji samo na strani koja ima
 * components/SiteReveal (klasa rv-armed na <html>); na ostalim stranama i uz
 * smanjene pokrete broj samo stoji.
 */
const DURATION = 1200;

function format(n: number, lang: PriceLang, kind: 'amount' | 'count'): string {
  return kind === 'amount' ? formatAmount(n, lang) : n.toLocaleString(lang === 'sr' ? 'sr-RS' : 'en-US');
}

export default function CountUp({ value, lang, kind }: { value: number; lang: PriceLang; kind: 'amount' | 'count' }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  // Da li je brojanje već odrađeno: posle toga promena iznosa (promo) samo zameni broj.
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || done.current || value < 50 || !document.documentElement.classList.contains('rv-armed')) {
      setShown(value);
      return;
    }
    let frame = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const step = (now: number) => {
          const k = Math.min(1, (now - start) / DURATION);
          setShown(Math.round(value * (1 - Math.pow(1 - k, 3))));
          if (k < 1) frame = requestAnimationFrame(step);
          else done.current = true;
        };
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    setShown(0);
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      setShown(value);
    };
  }, [value]);

  return <span ref={ref}>{format(shown, lang, kind)}</span>;
}
