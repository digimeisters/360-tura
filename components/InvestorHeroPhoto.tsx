'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Polygon, UnitStatus } from '../app/lib/projects';

/**
 * Vrh strane /za-investitore: prava fotografija zgrade primera (projekat
 * „Lepenički cvet") u okviru .device, stanovi obojeni po statusu kao u
 * izboru stana preko celog ekrana. Slobodni stanovi se sami smenjuju, a
 * staklena kartica pokazuje sprat, strukturu, m² i cenu - kupčev pogled u
 * malom. Kadar je isečen oko zgrade (iz oblika stanova), da zgrada ispuni
 * okvir i na uskom ekranu.
 *
 * Staje dok je miš na okviru; sa „smanji pokrete" u sistemu stoji na prvom
 * stanu. Bez podataka strana prikazuje stari crtež (InvestorHeroDevice).
 * FacadeMini je ista slika bez kartica (telefon „Zgrada" u delu Kupac).
 */

export type HeroUnit = {
  id: string;
  code: string;
  floor: string;
  structure: string | null;
  area: string | null;
  price: string | null;
  status: UnitStatus;
  polygon: Polygon;
};

const STEP_MS = 2600;
// Iste boje kao u prikazu preko celog ekrana (FacadeFullscreen).
const COLORS: Record<UnitStatus, string> = { available: '#16A34A', reserved: '#F59E0B', sold: '#DC2626' };
// Okvir .device: 1 : 0.95 na računaru, 4 : 3.4 na telefonu - meri se, ovo je samo početna vrednost.
const FRAME = 4 / 3.4;

/** Prirodna veličina slike (oblici su u udelu slike, a SVG radi u pikselima slike). */
function useImageSize(url: string): [number, number] {
  const [size, setSize] = useState<[number, number] | null>(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setSize([img.naturalWidth, img.naturalHeight]);
    img.src = url;
  }, [url]);
  return size ?? [1600, 900];
}

/** viewBox isečen oko svih stanova, odnosa frame (širina / visina). */
function cropAround(polys: Polygon[], W: number, H: number, frame: number, fill = 0.62): string {
  const xs = polys.flatMap((p) => p.map((q) => q[0] * W));
  const ys = polys.flatMap((p) => p.map((q) => q[1] * H));
  if (!xs.length) return `0 0 ${W} ${H}`;
  const bw = Math.max(...xs) - Math.min(...xs);
  const bh = Math.max(...ys) - Math.min(...ys);
  // Zgrada zauzima ~80 % širine ili ~fill visine kadra (šta prvo stigne).
  let vh = Math.max(bh / fill, bw / 0.8 / frame);
  vh = Math.min(vh, H, W / frame);
  const vw = vh * frame;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const top = Math.min(...ys);
  const x0 = Math.min(Math.max(cx - vw / 2, 0), W - vw);
  // Vrh zgrade na ~18 % visine kadra (iznad je naslov), ostatak ispod.
  const y0 = Math.min(Math.max(top - vh * 0.18, 0), H - vh);
  return `${x0} ${y0} ${vw} ${vh}`;
}

const pointsOf = (poly: Polygon, W: number, H: number) => poly.map(([x, y]) => `${x * W},${y * H}`).join(' ');

/** Mala fotografija zgrade sa obojenim stanovima, bez kartica. */
export function FacadeMini({ imageUrl, units, frame }: { imageUrl: string; units: Pick<HeroUnit, 'id' | 'status' | 'polygon'>[]; frame: number }) {
  const [W, H] = useImageSize(imageUrl);
  const view = useMemo(() => cropAround(units.map((u) => u.polygon), W, H, frame, 0.72), [units, W, H, frame]);
  return (
    <svg className="inv-hp-svg" viewBox={view} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <image href={imageUrl} width={W} height={H} />
      {units.map((u) => (
        <polygon
          key={u.id}
          points={pointsOf(u.polygon, W, H)}
          fill={COLORS[u.status]}
          fillOpacity={0.5}
          stroke="#FFFFFF"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

export default function InvestorHeroPhoto({
  imageUrl,
  units,
  project,
  kicker,
  unitLabel,
  statusLabels
}: {
  imageUrl: string;
  units: HeroUnit[];
  project: string;
  kicker: string;
  unitLabel: string;
  statusLabels: Record<UnitStatus, string>;
}) {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [W, H] = useImageSize(imageUrl);
  const boxRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState(FRAME);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (el.clientHeight) setFrame(el.clientWidth / el.clientHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Slobodni stanovi odozgo nadole: njih kartica pokazuje.
  const showcase = useMemo(
    () =>
      units
        .filter((u) => u.status === 'available')
        .sort((a, b) => Math.min(...a.polygon.map((p) => p[1])) - Math.min(...b.polygon.map((p) => p[1])) || a.polygon[0][0] - b.polygon[0][0]),
    [units]
  );

  useEffect(() => {
    if (paused || showcase.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setStep((s) => (s + 1) % showcase.length), STEP_MS);
    return () => window.clearInterval(id);
  }, [paused, showcase.length]);

  // Kadar oko zgrade u odnosu stvarnog okvira, dole ostaje mesta za karticu.
  const view = useMemo(() => cropAround(units.map((u) => u.polygon), W, H, frame), [units, W, H, frame]);
  const current = showcase.length ? showcase[step % showcase.length] : null;

  return (
    <div
      ref={boxRef}
      className="device inv-hero-photo"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label={`${project}: ${kicker.toLowerCase()}`}
    >
      <svg className="inv-hp-svg" viewBox={view} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <image href={imageUrl} width={W} height={H} />
        {units.map((u) => {
          const on = current?.id === u.id;
          return (
            <polygon
              key={u.id}
              points={pointsOf(u.polygon, W, H)}
              fill={on ? '#1E5AA8' : COLORS[u.status]}
              fillOpacity={on ? 0.78 : 0.42}
              stroke="#FFFFFF"
              strokeOpacity={0.9}
              strokeWidth={on ? 3 : 1.2}
              vectorEffect="non-scaling-stroke"
              className="inv-hp-poly"
            />
          );
        })}
      </svg>
      <div className="d-top">
        <div className="d-title d-glass">
          <small>{kicker}</small>
          <strong>{project}</strong>
        </div>
        <div className="inv-hp-legend d-glass" aria-hidden="true">
          {(['available', 'reserved', 'sold'] as UnitStatus[]).map((s) => (
            <span key={s}>
              <i style={{ background: COLORS[s] }} />
              {statusLabels[s]}
            </span>
          ))}
        </div>
      </div>
      {current && (
        <div className="d-info d-glass inv-hero-info" aria-live="polite">
          <div>
            <h4>
              {unitLabel} {current.code} · {current.floor}
            </h4>
            <p className="inv-hp-meta">{[current.structure, current.area].filter(Boolean).join(' · ')}</p>
          </div>
          {current.price && (
            <div className="inv-hero-price">
              <small>{statusLabels.available}</small>
              <b>{current.price}</b>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
