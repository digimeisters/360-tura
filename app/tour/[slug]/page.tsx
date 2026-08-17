'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'; // Ažurirano na standardnu putanju (@/lib/supabaseClient)

declare global {
  interface Window {
    pannellum: unknown;
  }
}

const BASE_SCALE = 2.8;
const MAX_ZOOM = 2.5;
const MIN_ZOOM = 1;

type Waypoint = { yaw: number; tilt: number; text: string };
type Establish = { fromYaw: number; toYaw: number; duration: number; text: string };
type Room = {
  id: number;
  title: string;
  eyebrow: string;
  order_index: number;
  panorama_url: string;
  establish: Establish;
  waypoints: Waypoint[];
};

export default function TourPage() {
  const params = useParams();
  const slug = (params?.slug as string) || '';

  const [tourTitle, setTourTitle] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [roomIdx, setRoomIdx] = useState(0);
  const [, setWpIdx] = useState(-1);
  const [mode, setMode] = useState<'idle' | 'establishing' | 'narrating' | 'choosing' | 'finished'>('idle');
  const [caption, setCaption] = useState('');
  const [started, setStarted] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const compassRef = useRef<SVGSVGElement>(null);

  const currentYaw = useRef(0);
  const currentTilt = useRef(0);
  const zoomLevel = useRef(1);
  const cameraRaf = useRef<number | null>(null);
  const freeLook = useRef(false);
  const roomsRef = useRef<Room[]>([]);
  const roomIdxRef = useRef(0);
  const wpIdxRef = useRef(-1);

  useEffect(() => { roomsRef.current = rooms; }, [rooms]);
  useEffect(() => { roomIdxRef.current = roomIdx; }, [roomIdx]);

  // ---------- Učitavanje iz baze ----------
  useEffect(() => {
    if (!slug) return;

    async function load() {
      const { data: tour, error: tourErr } = await supabase
        .from('tours')
        .select('*')
        .eq('slug', slug)
        .single();

      if (tourErr || !tour) {
        setError('Tura nije pronađena.');
        setLoading(false);
        return;
      }
      setTourTitle(tour.title);

      const { data: roomRows, error: roomErr } = await supabase
        .from('rooms')
        .select('*')
        .eq('tour_id', tour.id)
        .order('order_index');

      if (roomErr || !roomRows || roomRows.length === 0) {
        setError('Ova tura još nema nijednu sobu.');
        setLoading(false);
        return;
      }
      setRooms(roomRows as unknown as Room[]);
      setLoading(false);
    }
    load();
  }, [slug]);

  // ---------- Viewer layout & rendering ----------
  function layoutImage() {
    const vp = viewportRef.current;
    const img = imgRef.current;
    const frame = frameRef.current;
    if (!vp || !img || !frame) return;
    const vpH = vp.clientHeight;
    const targetH = vpH * BASE_SCALE * zoomLevel.current;
    img.style.height = targetH + 'px';
    frame.style.top = -(targetH - vpH) / 2 + 'px';
  }

  function drawCompass(yaw: number) {
    const svg = compassRef.current;
    const room = roomsRef.current[roomIdxRef.current];
    if (!svg || !room) return;
    svg.innerHTML = '';
    const ns = 'http://www.w3.org/2000/svg';
    const cx = 42, cy = 42, r = 31;
    const ring = document.createElementNS(ns, 'circle');
    ring.setAttribute('cx', String(cx)); ring.setAttribute('cy', String(cy)); ring.setAttribute('r', String(r));
    ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', '#5c5c5c'); ring.setAttribute('stroke-width', '1');
    svg.appendChild(ring);

    room.waypoints.forEach((wp, i) => {
      const ang = (wp.yaw - 90) * Math.PI / 180;
      const dx = cx + r * Math.cos(ang), dy = cy + r * Math.sin(ang);
      const hit = document.createElementNS(ns, 'circle');
      hit.setAttribute('cx', String(dx)); hit.setAttribute('cy', String(dy)); hit.setAttribute('r', '10');
      hit.setAttribute('fill', 'rgba(0,0,0,0.001)');
      hit.setAttribute('data-wp-idx', String(i));
      svg.appendChild(hit);
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('cx', String(dx)); dot.setAttribute('cy', String(dy));
      dot.setAttribute('r', i === wpIdxRef.current ? '4' : '2.1');
      dot.setAttribute('fill', i === wpIdxRef.current ? '#fff' : '#5c5c5c');
      dot.setAttribute('pointer-events', 'none');
      svg.appendChild(dot);
    });

    const nAng = (yaw - 90) * Math.PI / 180;
    const needle = document.createElementNS(ns, 'line');
    needle.setAttribute('x1', String(cx)); needle.setAttribute('y1', String(cy));
    needle.setAttribute('x2', String(cx + (r - 😎 * Math.cos(nAng)));
    needle.setAttribute('y2', String(cy + (r - 😎 * Math.sin(nAng)));
    needle.setAttribute('stroke', '#fff'); needle.setAttribute('stroke-width', '2.5'); needle.setAttribute('stroke-linecap', 'round');
    svg.appendChild(needle);
    const hub = document.createElementNS(ns, 'circle');
    hub.setAttribute('cx', String(cx)); hub.setAttribute('cy', String(cy)); hub.setAttribute('r', '2.8'); hub.setAttribute('fill', '#fff');
    svg.appendChild(hub);
  }

  function setFramePose(yaw: number, tilt: number) {
    const vp = viewportRef.current, img = imgRef.current, frame = frameRef.current;
    if (!vp || !img || !frame) return;
    const vpW = vp.clientWidth, vpH = vp.clientHeight;
    const imgW = img.offsetWidth || vpW;
    const x = (yaw + 180) / 360 * imgW;
    const targetX = Math.max(0, Math.min(imgW - vpW, x - vpW / 2));
    const targetH = vpH * BASE_SCALE * zoomLevel.current;
    const margin = (targetH - vpH) / 2;
    const tiltPx = tilt * margin * 0.7;
    frame.style.transform = translate(${-targetX}px, ${tiltPx}px);
    drawCompass(yaw);
  }

  function cancelCameraAnim() {
    if (cameraRaf.current) { cancelAnimationFrame(cameraRaf.current); cameraRaf.current = null; }
  }

  function setCameraInstant(yaw: number, tilt: number) {
    cancelCameraAnim();
    currentYaw.current = yaw; currentTilt.current = tilt;
    setFramePose(yaw, tilt);
  }

  function easeInOutSine(t: number) { return -(Math.cos(Math.PI * t) - 1) / 2; }

  function animateCamera(toYaw: number, toTilt: number, duration: number, onDone?: () => void) {
    cancelCameraAnim();
    const fromYaw = currentYaw.current, fromTilt = currentTilt.current;
    const start = performance.now();
    function step(now: number) {
      const p = Math.min(1, (now - start) / duration);
      const e = easeInOutSine(p);
      setFramePose(fromYaw + (toYaw - fromYaw) * e, fromTilt + (toTilt - fromTilt) * e);
      if (p < 1) { cameraRaf.current = requestAnimationFrame(step); }
      else { cameraRaf.current = null; currentYaw.current = toYaw; currentTilt.current = toTilt; onDone?.(); }
    }
    cameraRaf.current = requestAnimationFrame(step);
  }

  // ---------- TTS Naracija ----------
  function speak(text: string, onDone?: () => void) {
    setCaption(text);
    if (!('speechSynthesis' in window)) { setTimeout(() => onDone?.(), Math.max(1500, text.length * 45)); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.lang?.toLowerCase().startsWith('sr')) || voices[0];
    if (v) u.voice = v;
    u.lang = v?.lang || 'sr-RS'; u.rate = 0.98;
    u.onend = () => onDone?.();
    u.onerror = () => onDone?.();
    window.speechSynthesis.speak(u);
  }

  // ---------- Tok ture ----------
  function playEstablishing(room: Room, onDone: () => void) {
    setMode('establishing');
    let speechDone = false, sweepDone = false;
    function tryDone() { if (speechDone && sweepDone) onDone(); }
    setCameraInstant(room.establish.fromYaw, 0);
    animateCamera(room.establish.toYaw, 0, room.establish.duration, () => { sweepDone = true; tryDone(); });
    speak(room.establish.text, () => { speechDone = true; tryDone(); });
  }

  function playWaypoint(room: Room, i: number) {
    if (i >= room.waypoints.length) { askChoice(); return; }
    setWpIdx(i); wpIdxRef.current = i;
    setMode('narrating');
    const wp = room.waypoints[i];
    animateCamera(wp.yaw, wp.tilt, 1600);
    setTimeout(() => {
      speak(wp.text, () => playWaypoint(room, i + 1));
    }, 400);
  }

  function enterRoom(idx: number) {
    setRoomIdx(idx); roomIdxRef.current = idx;
    setWpIdx(-1); wpIdxRef.current = -1;
    freeLook.current = false;
    zoomLevel.current = 1;
    setTimeout(() => {
      layoutImage();
      const room = roomsRef.current[idx];
      if (!room) return;
      playEstablishing(room, () => playWaypoint(room, 0));
    }, 50);
  }

  function askChoice() {
    setMode('choosing');
    freeLook.current = true;
    const isLast = roomIdxRef.current === roomsRef.current.length - 1;
    setCaption(isLast ? 'To je bio pregled cele ture. Slobodno razgledaj naokolo.' : 'Slobodno razgledaj naokolo, pa klikni dugme kad budeš spreman/na.');
  }

  function goNext() {
    freeLook.current = false;
    const isLast = roomIdxRef.current === roomsRef.current.length - 1;
    if (isLast) { setMode('finished'); speak('Ovo je kraj naše ture. Hvala što ste razgledali stan sa mnom.'); return; }
    enterRoom(roomIdxRef.current + 1);
  }

  function startTour() {
    setStarted(true);
    enterRoom(0);
  }

  // ---------- Event Listeners za interakciju ----------
  useEffect(() => {
    const vp = viewportRef.current;
    const img = imgRef.current;
    const frame = frameRef.current;
    const compass = compassRef.current;
    if (!vp || !img || !frame) return;

    let dragging = false;
    let startX = 0, startY = 0, startTargetX = 0, startTiltPx = 0;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchStartDist: number | null = null, pinchStartZoom = 1;

    function targetXFromYaw() {
      const vpW = vp!.clientWidth, imgW = img!.offsetWidth || vpW;
      const x = (currentYaw.current + 180) / 360 * imgW;
      return Math.max(0, Math.min(imgW - vpW, x - vpW / 2));
    }

    function tiltAmp() {
      const vpH = vp!.clientHeight, targetH = vpH * BASE_SCALE * zoomLevel.current;
      return ((targetH - vpH) / 2) * 0.7;
    }

    function onDown(e: PointerEvent) {
      if (!freeLook.current) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { vp!.setPointerCapture(e.pointerId); } catch {}
      if (pointers.size >= 2) {
        dragging = false;
        const pts = Array.from(pointers.values());
        pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        pinchStartZoom = zoomLevel.current;
        return;
      }
      dragging = true;
      cancelCameraAnim();
      startX = e.clientX; startY = e.clientY;
      startTargetX = targetXFromYaw();
      startTiltPx = currentTilt.current * tiltAmp();
    }

    function onMove(e: PointerEvent) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size >= 2) {
        const pts = Array.from(pointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (pinchStartDist) {
          zoomLevel.current = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchStartZoom * (dist / pinchStartDist)));
          layoutImage();
          setFramePose(currentYaw.current, currentTilt.current);
        }
        return;
      }
      if (!dragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      const vpW = vp!.clientWidth, imgW = img!.offsetWidth || vpW;
      const maxTilt = tiltAmp();
      const newX = Math.max(0, Math.min(imgW - vpW, startTargetX - dx));
      const newTiltPx = Math.max(-maxTilt, Math.min(maxTilt, startTiltPx + dy));
      frame!.style.transform = translate(${-newX}px, ${newTiltPx}px);
      const yawApprox = ((newX + vpW / 2) / imgW) * 360 - 180;
      currentYaw.current = yawApprox;
      currentTilt.current = maxTilt ? newTiltPx / maxTilt : 0;
      drawCompass(yawApprox);
    }

    function onUp(e: PointerEvent) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStartDist = null;
      if (pointers.size === 0) dragging = false;
    }

    function onWheel(e: WheelEvent) {
      if (!freeLook.current) return;
      e.preventDefault();
      zoomLevel.current = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel.current - e.deltaY * 0.0015));
      layoutImage();
      setFramePose(currentYaw.current, currentTilt.current);
    }

    function onCompassClick(e: MouseEvent) {
      if (!freeLook.current) return;
      const target = e.target as SVGElement;
      const idxAttr = target.getAttribute?.('data-wp-idx');
      if (idxAttr === null || idxAttr === undefined) return;
      const room = roomsRef.current[roomIdxRef.current];
      const wp = room.waypoints[parseInt(idxAttr, 10)];
      if (!wp) return;
      setWpIdx(parseInt(idxAttr, 10));
      cancelCameraAnim();
      animateCamera(wp.yaw, wp.tilt, 900, () => speak(wp.text));
    }

    vp.addEventListener('pointerdown', onDown);
    vp.addEventListener('pointermove', onMove);
    vp.addEventListener('pointerup', onUp);
    vp.addEventListener('pointercancel', onUp);
    vp.addEventListener('pointerleave', onUp);
    vp.addEventListener('wheel', onWheel, { passive: false });
    compass?.addEventListener('click', onCompassClick as unknown as EventListener);
    window.addEventListener('resize', layoutImage);

    return () => {
      vp.removeEventListener('pointerdown', onDown);
      vp.removeEventListener('pointermove', onMove);
      vp.removeEventListener('pointerup', onUp);
      vp.removeEventListener('pointercancel', onUp);
      vp.removeEventListener('pointerleave', onUp);
      vp.removeEventListener('wheel', onWheel);
      compass?.removeEventListener('click', onCompassClick as unknown as EventListener);
      window.removeEventListener('resize', layoutImage);
    };
  }, [rooms]);

  useEffect(() => {
    if (rooms.length > 0) {
      setTimeout(() => {
        layoutImage();
        setCameraInstant(rooms[0].establish.fromYaw, 0);
      }, 50);
    }
  }, [rooms]);

  if (loading) return <Centered>Učitavanje...</Centered>;
  if (error) return <Centered>{error}</Centered>;

  const room = rooms[roomIdx];

  return (
    <main style={{ width: '100vw', height: '100vh', margin: 0, background: '#0a0a0a', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', color: '#fafafa' }}>
      <div style={{ padding: '16px 20px' }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '.1em', color: '#8c8c8c', textTransform: 'uppercase' }}>{tourTitle} · {room?.eyebrow}</p>
        <h1 style={{ margin: 0, fontSize: 24 }}>{room?.title}</h1>
      </div>

      <div ref={viewportRef} style={{ position: 'relative', flex: 1, overflow: 'hidden', background: '#0c0e12', touchAction: freeLook.current ? 'none' : 'auto' }}>
        <div ref={frameRef} style={{ position: 'absolute', left: 0, willChange: 'transform' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={imgRef} src={room?.panorama_url || ''} alt="360" style={{ display: 'block', width: 'auto', userSelect: 'none' }} />
        </div>
        <svg ref={compassRef} width={70} height={70} viewBox="0 0 84 84"
          style={{ position: 'absolute', top: 12, right: 12, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.6))' }} />
      </div>

      <div style={{ padding: '16px 20px', borderTop: '1px solid #282828' }}>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>{caption || 'Dobrodošli. Kliknite dugme da počnemo obilazak.'}</p>
      </div>

      <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10 }}>
        {!started && (
          <button onClick={startTour} style={btnPrimary}>▶ Pokreni vodiča</button>
        )}
        {mode === 'choosing' && (
          <button onClick={goNext} style={btnPrimary}>
            {roomIdx === rooms.length - 1 ? 'Završi turu ✓' : 'Sledeća soba →'}
          </button>
        )}
        {mode === 'finished' && (
          <button onClick={() => enterRoom(0)} style={btnGhost}>↺ Ponovi turu</button>
        )}
      </div>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: 'white', background: 'black', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      {children}
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  background: '#fff', color: '#0a0a0a', border: 'none', borderRadius: '999px',
  padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
};
const btnGhost: React.CSSProperties = {
  background: 'transparent', color: '#fafafa', border: '1px solid #282828', borderRadius: '999px',
  padding: '10px 18px', fontSize: 14, cursor: 'pointer',
};
Sent
Compose
Write to
