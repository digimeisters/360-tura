'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

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
  const slug = params.slug as string;

  const [tourTitle, setTourTitle] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [roomIdx, setRoomIdx] = useState(0);
  const [mode, setMode] = useState<'idle' | 'establishing' | 'narrating' | 'choosing' | 'finished'>('idle');
  const [caption, setCaption] = useState('');
  const [started, setStarted] = useState(false);

  const viewerRef = useRef<any>(null);
  const roomsRef = useRef<Room[]>([]);
  const roomIdxRef = useRef(0);

  useEffect(() => { roomsRef.current = rooms; }, [rooms]);
  useEffect(() => { roomIdxRef.current = roomIdx; }, [roomIdx]);

  // Učitavanje ture i soba iz Supabase baze (povezivanje preko tour_slug)
  useEffect(() => {
    async function load() {
      const { data: tour, error: tourErr } = await supabase
        .from('tours').select('*').eq('slug', slug).single();
      
      if (tourErr || !tour) { 
        setError('Tura nije pronađena.'); 
        setLoading(false); 
        return; 
      }
      setTourTitle(tour.title);

      const { data: roomRows, error: roomErr } = await supabase
        .from('rooms').select('*').eq('tour_slug', slug).order('order_index');

      if (roomErr || !roomRows || roomRows.length === 0) {
        setError('Ova tura još nema nijednu sobu.'); 
        setLoading(false); 
        return;
      }

      setRooms(roomRows as Room[]);
      setLoading(false);
    }
    load();
  }, [slug]);

  // Inicijalizacija i ažuriranje Pannellum 3D Viewer-a
  useEffect(() => {
    if (rooms.length === 0) return;
    const currentRoom = rooms[roomIdx];
    if (!currentRoom?.panorama_url || typeof window === 'undefined' || !(window as any).pannellum) return;

    if (viewerRef.current) {
      try { viewerRef.current.destroy(); } catch (e) {}
    }

    viewerRef.current = (window as any).pannellum.viewer('panorama', {
      type: 'equirectangular',
      panorama: currentRoom.panorama_url,
      autoLoad: true,
      showControls: true,
      compass: true,
      hfov: 110,
      yaw: currentRoom.establish?.fromYaw || 0,
      pitch: 0,
    });

    return () => {
      if (viewerRef.current) {
        try { viewerRef.current.destroy(); } catch (e) {}
      }
    };
  }, [rooms, roomIdx]);

  // Web Speech TTS Naracija
  function speak(text: string, onDone?: () => void) {
    setCaption(text);
    if (!('speechSynthesis' in window)) { 
      setTimeout(() => onDone?.(), Math.max(1500, text.length * 45)); 
      return; 
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.lang?.toLowerCase().startsWith('sr')) || voices[0];
    if (v) u.voice = v;
    u.lang = v?.lang || 'sr-RS'; 
    u.rate = 0.98;
    u.onend = () => onDone?.();
    u.onerror = () => onDone?.();
    window.speechSynthesis.speak(u);
  }

  // Tok ture i 3D kretanje kamere
  function playEstablishing(room: Room, onDone: () => void) {
    setMode('establishing');
    if (viewerRef.current) {
      viewerRef.current.setYaw(room.establish.fromYaw);
      viewerRef.current.setPitch(0);
      viewerRef.current.lookAt(0, room.establish.toYaw, 110, room.establish.duration);
    }
    speak(room.establish.text, onDone);
  }

  function playWaypoint(room: Room, i: number) {
    if (i >= room.waypoints.length) { 
      askChoice(); 
      return; 
    }
    setMode('narrating');
    const wp = room.waypoints[i];

    if (viewerRef.current) {
      viewerRef.current.lookAt(wp.tilt, wp.yaw, 100, 1500);
    }

    setTimeout(() => {
      speak(wp.text, () => playWaypoint(room, i + 1));
    }, 400);
  }

  function enterRoom(idx: number) {
    setRoomIdx(idx); 
    roomIdxRef.current = idx;
    const room = roomsRef.current[idx];
    if (!room) return;

    setTimeout(() => {
      playEstablishing(room, () => playWaypoint(room, 0));
    }, 300);
  }

  function askChoice() {
    setMode('choosing');
    const isLast = roomIdxRef.current === roomsRef.current.length - 1;
    setCaption(isLast ? 'To je bio pregled cele ture. Slobodno razgledaj naokolo.' : 'Slobodno razgledaj naokolo, pa klikni dugme kad budeš spreman/na.');
  }

  function goNext() {
    const isLast = roomIdxRef.current === roomsRef.current.length - 1;
    if (isLast) { 
      setMode('finished'); 
      speak('Ovo je kraj naše ture. Hvala što ste razgledali stan sa mnom.'); 
      return; 
    }
    enterRoom(roomIdxRef.current + 1);
  }

  function startTour() {
    setStarted(true);
    enterRoom(0);
  }

  if (loading) return <Centered>Učitavanje ture...</Centered>;
  if (error) return <Centered>{error}</Centered>;

  const room = rooms[roomIdx];

  return (
    <main style={{ width: '100vw', height: '100vh', margin: 0, background: '#0a0a0a', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', color: '#fafafa' }}>
      
      {/* Zaglavlje */}
      <div style={{ padding: '16px 20px', background: '#0a0a0a' }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '.1em', color: '#8c8c8c', textTransform: 'uppercase' }}>
          {tourTitle} · {room?.eyebrow}
        </p>
        <h1 style={{ margin: 0, fontSize: 24 }}>{room?.title}</h1>
      </div>

      {/* 3D Panorama Kontejner */}
      <div id="panorama" style={{ position: 'relative', flex: 1, width: '100%', minHeight: 0 }}></div>

      {/* Donja komandna tabla */}
      <div style={{ padding: '20px', background: '#121212', borderTop: '1px solid #282828', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Opis sa ikonice zvuka */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>🔊</span>
          <p style={{ margin: 0, fontSize: '15px', color: '#ffffff', fontWeight: 500 }}>
            {caption || 'Dobrodošli. Kliknite „Pokreni vodiča“ da počnemo obilazak.'}
          </p>
        </div>

        {/* Red sa dugmićima */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {!started && (
            <button onClick={startTour} style={btnPrimaryStyle}>
              ► Pokreni vodiča
            </button>
          )}

          {mode === 'choosing' && (
            <button onClick={goNext} style={btnPrimaryStyle}>
              {roomIdx === rooms.length - 1 ? 'Završi turu ✓' : 'Sledeća soba →'}
            </button>
          )}

          {mode === 'finished' && (
            <button onClick={() => enterRoom(0)} style={btnPrimaryStyle}>
              ↺ Ponovi turu
            </button>
          )}

          <button style={btnGhostStyle}>❓ Postavi pitanje</button>
          <button style={btnGhostStyle}>📐 Plan stana</button>
          <button style={btnGhostStyle}>📍 Lokacija</button>
          <button style={btnGhostStyle}>🏠 Više o stanu</button>
        </div>

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

const btnPrimaryStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  color: '#000000',
  border: 'none',
  borderRadius: '30px',
  padding: '12px 24px',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
};

const btnGhostStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  color: '#ffffff',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '30px',
  padding: '10px 20px',
  fontSize: '14px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px'
};