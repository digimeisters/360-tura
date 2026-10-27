'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';
import { LIVE_TIMING, type LiveViewer } from './protocol';

/**
 * Razgledanje uživo: pokazivač. Agent dugo pritisne tačku na panorami, a kod
 * oboje se na tom mestu u prostoru pojavi krug. Krug je Pannellum hotspot, pa
 * ostaje na zidu i kad se kamera okreće; posle LIVE_TIMING.pointTtlMs nestaje.
 */

const POINT_ID = 'k360-live-point';
// Samo providnost na samom krugu: Pannellum ga postavlja (i sam centrira, po
// offsetWidth) preko inline `transform`, pa ni animacija transform-a ni
// margina ne smeju da ga pomere sa mesta.
let removeTimer: ReturnType<typeof setTimeout> | null = null;

export const LIVE_POINT_CSS = `
.k360-live-point{width:56px;height:56px;border-radius:50%;border:3px solid #fff;
  box-shadow:0 0 0 6px rgba(91,146,214,.55),0 0 24px rgba(91,146,214,.9);pointer-events:none;
  animation:k360-live-point-in .25s ease-out}
.k360-live-point::before{content:"";position:absolute;inset:-18px;border-radius:50%;border:2px solid rgba(255,255,255,.45);
  animation:k360-live-point-wave 1.2s ease-out infinite}
.k360-live-point::after{content:"";position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:#fff}
.k360-live-point__tag{position:absolute;left:50%;top:64px;transform:translateX(-50%);white-space:nowrap;font:700 11.5px/1 var(--font-body),system-ui,sans-serif;
  color:#fff;background:rgba(15,23,42,.75);padding:6px 10px;border-radius:999px}
@keyframes k360-live-point-in{from{opacity:0}to{opacity:1}}
@keyframes k360-live-point-wave{from{transform:scale(.8);opacity:1}to{transform:scale(1.5);opacity:0}}
@media (prefers-reduced-motion:reduce){.k360-live-point,.k360-live-point::before{animation:none}}
`;

/** Krug na {yaw, pitch}; novi zamenjuje stari. `label` = "Marko pokazuje" (samo kod kupca). */
export function showLivePoint(viewer: LiveViewer | null, p: { yaw: number; pitch: number }, label?: string): void {
  if (!viewer) return;
  try {
    viewer.removeHotSpot(POINT_ID);
  } catch {}
  try {
    viewer.addHotSpot({
      id: POINT_ID,
      pitch: p.pitch,
      yaw: p.yaw,
      cssClass: 'k360-live-point',
      createTooltipFunc: (div: HTMLDivElement) => {
        if (!label) return;
        const tag = document.createElement('span');
        tag.className = 'k360-live-point__tag';
        tag.textContent = label;
        div.appendChild(tag);
      }
    });
  } catch {
    return;
  }
  if (removeTimer) clearTimeout(removeTimer);
  removeTimer = setTimeout(() => {
    // Viewer je možda već zamenjen novom sobom - tada je krug otišao sa njim.
    try {
      viewer.removeHotSpot(POINT_ID);
    } catch {}
  }, LIVE_TIMING.pointTtlMs);
}

/** Dugi pritisak na panoramu (prst ili miš) bez pomeranja → tačka u prostoru. */
export function useLongPress({
  enabled,
  viewerRef,
  onPoint
}: {
  enabled: boolean;
  viewerRef: MutableRefObject<LiveViewer | null>;
  onPoint: (p: { yaw: number; pitch: number }) => void;
}): void {
  const onPointRef = useRef(onPoint);
  useEffect(() => {
    onPointRef.current = onPoint;
  }, [onPoint]);

  useEffect(() => {
    if (!enabled) return;
    const el = document.getElementById('panorama');
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let start: { x: number; y: number } | null = null;
    const cancel = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      start = null;
    };
    const down = (e: PointerEvent) => {
      if (!e.isPrimary) return;
      cancel();
      start = { x: e.clientX, y: e.clientY };
      timer = setTimeout(() => {
        timer = null;
        const v = viewerRef.current;
        if (!v) return;
        try {
          const [pitch, yaw] = v.mouseEventToCoords(e);          if (Number.isFinite(pitch) && Number.isFinite(yaw)) onPointRef.current({ yaw, pitch });
        } catch {}
      }, LIVE_TIMING.longPressMs);
    };
    const move = (e: PointerEvent) => {
      if (!start) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > LIVE_TIMING.longPressSlopPx) cancel();
    };
    // Dugi pritisak na telefonu inače otvara meni (sačuvaj sliku) - ovde ne treba.
    const noMenu = (e: Event) => e.preventDefault();
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', cancel);
    el.addEventListener('pointercancel', cancel);
    el.addEventListener('contextmenu', noMenu);
    return () => {
      cancel();
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', cancel);
      el.removeEventListener('pointercancel', cancel);
      el.removeEventListener('contextmenu', noMenu);
    };
  }, [enabled, viewerRef]);
}
