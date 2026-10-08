'use client';

import { useEffect, useRef, useState } from 'react';
import type { Polygon } from '../../app/lib/projects';

/**
 * Osnova stana kad stan nema svoju sliku (plan_url): isečak osnove sprata
 * uvećan na stan, sa obeleženim oblikom stana. Ništa se ne seče na
 * serveru - slika sprata se samo pomeri i uveća u okviru (CSS), pa
 * važi čim je stan iscrtan na osnovi sprata.
 *
 * Okvir dobija razmeru isečka tek kad se zna prirodna veličina slike
 * (onLoad, ili odmah ako je slika već u kešu pre hidratacije); do tada je 4:3.
 */

const PAD = 0.035;

export default function UnitPlanCrop({
  src,
  polygon,
  alt,
  tall = false,
  full = false,
  maxHeight
}: {
  src: string;
  polygon: Polygon;
  alt: string;
  tall?: boolean;
  /** Najveća visina isečka (npr. „140mm" na PDF letku); inače 230px, odnosno 62vh za `tall`. */
  maxHeight?: string;
  /** Uvećan prikaz (lightbox): do 86vh, ali ne više od ~2,2× prirodne veličine isečka da linije ne postanu mutne. */
  full?: boolean;
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth) setSize({ w: el.naturalWidth, h: el.naturalHeight });
  }, [src]);
  const xs = polygon.map((p) => p[0]);
  const ys = polygon.map((p) => p[1]);
  const x0 = Math.max(0, Math.min(...xs) - PAD);
  const y0 = Math.max(0, Math.min(...ys) - PAD);
  const x1 = Math.min(1, Math.max(...xs) + PAD);
  const y1 = Math.min(1, Math.max(...ys) + PAD);
  const bw = x1 - x0;
  const bh = y1 - y0;
  const ratio = size ? (bw * size.w) / (bh * size.h) : 4 / 3;
  // Oblik u koordinatama isečka (0..1).
  const local = polygon.map(([x, y]) => `${(x - x0) / bw},${(y - y0) / bh}`).join(' ');
  const width = full
    ? `min(calc(100vw - 80px), calc(80vh * ${ratio.toFixed(4)})${size ? `, ${Math.round(bw * size.w * 2.2)}px` : ''})`
    : `min(100%, calc(${maxHeight ?? (tall ? '62vh' : '230px')} * ${ratio.toFixed(4)}))`;

  return (
    <div className={full ? 'inv-crop is-full' : tall ? 'inv-crop is-tall' : 'inv-crop'}>
      <div className="inv-crop-box" style={{ aspectRatio: String(ratio), width }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- osnova sprata sa R2 CDN-a */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          style={{ width: `${100 / bw}%`, left: `${(-x0 / bw) * 100}%`, top: `${(-y0 / bh) * 100}%` }}
        />
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
          <polygon points={local} fill="rgba(30,90,168,.08)" stroke="#1E5AA8" strokeWidth={3} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  );
}
