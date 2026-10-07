'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';

const RAD = Math.PI / 180;
/** Ugaoni poluprečnik kruga - koliko poda pokriva oko mesta stativa. */
const DISC_DEG = 12;
/**
 * Krug se pojavljuje od 40° pogleda nadole, ceo je od 50°. Vodič spušta
 * kameru do ~34° (početni kadrovi soba), pa ga u kadrovima vodiča nema -
 * vlasnik (6. 10. 2026): "ne treba da mi upada u kadar".
 */
const SHOW_FROM = 40;
const SHOW_FULL = 50;
const DISC_PX = 200;

type Vec = [number, number, number];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const dir = (yaw: number, pitch: number): Vec => [
  Math.cos(pitch) * Math.sin(yaw),
  Math.sin(pitch),
  Math.cos(pitch) * Math.cos(yaw)
];

/**
 * Logo agencije u krugu na mestu stativa (dno panorame, "nadir"). Sloj
 * preko panorame, ne deo slike: logo se menja u adminu bez ponovne obrade
 * panorama. Uvek je okrugao i uspravan (vlasnik nije želeo da se izdužuje
 * kao pod) - samo prati mesto stativa i zum. Bez loga agencije: Kvadrat360 znak.
 */
/** Deo Pannellum viewer-a koji krug čita. */
type ViewLike = { getPitch(): number; getYaw(): number; getHfov(): number; isLoaded?(): boolean };

export function NadirLogo({ viewerRef, logoUrl }: { viewerRef: MutableRefObject<ViewLike | null>; logoUrl: string | null }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const discRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const down: Vec = [0, -1, 0];
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const box = boxRef.current;
      const disc = discRef.current;
      const v = viewerRef.current;
      if (!box || !disc) return;
      if (!v || typeof v.getPitch !== 'function' || (typeof v.isLoaded === 'function' && !v.isLoaded())) {
        disc.style.opacity = '0';
        return;
      }
      const pitchDeg = v.getPitch();
      const show = Math.min(1, Math.max(0, (-pitchDeg - SHOW_FROM) / (SHOW_FULL - SHOW_FROM)));
      const W = box.clientWidth;
      const H = box.clientHeight;
      const yaw = v.getYaw() * RAD;
      const pitch = pitchDeg * RAD;
      const f = (W / 2) / Math.tan((v.getHfov() * RAD) / 2);
      const forward = dir(yaw, pitch);
      const z = dot(down, forward);
      if (show === 0 || z <= 0.02 || !W) {
        disc.style.opacity = '0';
        return;
      }
      const up = dir(yaw, pitch + Math.PI / 2);
      const right: Vec = [Math.cos(yaw), 0, -Math.sin(yaw)];
      const x = W / 2 + (f * dot(down, right)) / z;
      const y = H / 2 - (f * dot(down, up)) / z;
      const scale = (f * Math.tan(DISC_DEG * RAD)) / (DISC_PX / 2);
      disc.style.opacity = String(show);
      disc.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [viewerRef]);

  return (
    <div ref={boxRef} aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', overflow: 'hidden' }}>
      <div
        ref={discRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: `${DISC_PX}px`,
          height: `${DISC_PX}px`,
          margin: `-${DISC_PX / 2}px 0 0 -${DISC_PX / 2}px`,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 0 0 6px rgba(255,255,255,0.35)',
          display: 'grid',
          placeItems: 'center',
          opacity: 0,
          transition: 'opacity 0.25s',
          willChange: 'transform, opacity'
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl || '/brand/kvadrat360-icon.svg'}
          alt=""
          draggable={false}
          style={{ width: logoUrl ? '64%' : '78%', height: logoUrl ? '64%' : '78%', objectFit: 'contain' }}
        />
      </div>
    </div>
  );
}
