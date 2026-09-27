'use client';

import { useEffect, useRef } from 'react';
import type { Room } from './types';
import { planHeadingFor } from './planHeading';

/** Trenutni pogled u turi: yaw i horizontalno vidno polje (stepeni), iz Pannellum-a. */
export type ViewReader = () => { yaw: number; hfov: number } | null;

// Ista plava kao tačka "ovde ste" na planu.
const CONE_BLUE = '#5B92D6';

/**
 * Konus pogleda na tlocrtu (field of view): iz tačke sobe u kojoj je
 * posetilac, u pravcu u kom gleda, širok koliko je vidno polje (zum ga
 * sužava). Stoji preko slike plana u istom omotaču kao tačke soba.
 *
 * Crta se u requestAnimationFrame petlji direktno u SVG (bez React stanja),
 * jer se pogled menja u svakom kadru dok posetilac vuče panoramu - kroz
 * React bi to bio render po kadru za ceo plan. Poravnanje panorame sa planom
 * vidi planHeading.ts; soba bez poravnanja nema konus.
 */
export function ViewCone({
  rooms,
  currentRoomId,
  getView
}: {
  rooms: Room[];
  currentRoomId: Room['id'] | undefined;
  getView: ViewReader;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  // Najnovije vrednosti za petlju, bez ponovnog pokretanja efekta.
  const input = useRef({ rooms, currentRoomId, getView });
  useEffect(() => {
    input.current = { rooms, currentRoomId, getView };
  });

  useEffect(() => {
    let frame = 0;
    let cache = { key: '', heading: null as number | null };
    let last = '';

    const tick = () => {
      frame = requestAnimationFrame(tick);
      const svg = svgRef.current;
      const path = pathRef.current;
      const box = svg?.parentElement;
      if (!svg || !path || !box) return;
      const w = box.clientWidth;
      const h = box.clientHeight;
      const { rooms: rs, currentRoomId: id, getView: read } = input.current;
      const room = rs.find((r) => String(r.id) === String(id));
      const view = read();
      if (!room || !view || !w || !h || typeof room.floorplan_x !== 'number' || typeof room.floorplan_y !== 'number') {
        if (last !== '') path.setAttribute('d', (last = ''));
        return;
      }

      // Poravnanje zavisi samo od sobe, spiska soba i odnosa stranica plana.
      const key = `${id}|${rs.length}|${(w / h).toFixed(3)}`;
      if (cache.key !== key) cache = { key, heading: planHeadingFor(id!, rs, w / h) };
      if (cache.heading === null) {
        if (last !== '') path.setAttribute('d', (last = ''));
        return;
      }

      const cx = (room.floorplan_x / 100) * w;
      const cy = (room.floorplan_y / 100) * h;
      const r = Math.max(22, Math.min(90, Math.max(w, h) * 0.15));
      const dir = view.yaw + cache.heading;
      const half = Math.min(Math.max(view.hfov, 20), 170) / 2;
      const pt = (deg: number) => {
        const a = (deg * Math.PI) / 180;
        return `${(cx + Math.sin(a) * r).toFixed(1)},${(cy - Math.cos(a) * r).toFixed(1)}`;
      };
      const d = `M${cx.toFixed(1)},${cy.toFixed(1)} L${pt(dir - half)} A${r.toFixed(1)},${r.toFixed(1)} 0 0 1 ${pt(dir + half)} Z`;
      if (d !== last) path.setAttribute('d', (last = d));
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}
    >
      <path ref={pathRef} fill={CONE_BLUE} fillOpacity="0.3" stroke={CONE_BLUE} strokeOpacity="0.75" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
