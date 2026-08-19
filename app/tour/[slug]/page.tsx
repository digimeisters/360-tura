'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

type Waypoint = {
  yaw: number;
  pitch: number;
  text: string;
  title?: string;
  type?: 'navigation' | 'info';
  targetRoomId?: string;
};

type EstablishData = {
  text?: string;
  fromYaw?: number;
  pitch?: number;
};

type Room = {
  id: string | number;
  tour_slug: string;
  title: string;
  panorama_url: string;
  order_index?: number;
  waypoints?: Waypoint[];
  establish?: EstablishData;
};

type Tour = {
  id: string | number;
  slug: string;
  title: string;
  category?: 'rent' | 'sale' | 'booking';
  location_text?: string;
  about_text?: string;
  floorplan_url?: string;
  faq_1?: string;
  faq_2?: string;
  faq_3?: string;
  faq_4?: string;
};

const categoryQuestions = {
  rent: [
    'Kolika je cena i depozit?',
    'Da li su dozvoljeni kućni ljubimci?',
    'Koliki su mesečni troškovi (režije)?',
    'Trajanje i uslovi ugovora zakupa?'
  ],
  sale: [
    'Kolika je cena i da li je moguća kupovina na kredit?',
    'Da li je nekretnina uknjižena i čista dokumentacija?',
    'Koliki su troškovi prenosa vlasništva i porez?',
    'Da li stan ima pripadajući podrum ili garažno mesto?'
  ],
  booking: [
    'Kolika je cena po noćenju i minimalan boravak?',
    'Koje je vreme ulaska i izlaska (Check-in / Check-out)?',
    'Da li je obezbeđen parking i Wi-Fi internet?',
    'Kakva su pravila otkazivanja rezervacije?'
  ]
};

function normalizeYaw(yaw: number): number {
  let res = (yaw + 180) % 360;
  if (res < 0) res += 360;
  return res - 180;
}

function getShortestTargetYaw(currentYaw: number, targetYaw: number): number {
  const normCurrent = normalizeYaw(currentYaw);
  const normTarget = normalizeYaw(targetYaw);
  let diff = normTarget - normCurrent;

  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  return currentYaw + diff;
}

export default function TourPage() {
  const [mounted, setMounted] = useState(false);
  const [tourStarted, setTourStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const params = useParams();
  const slug = params?.slug as string;

  const [tour, setTour] = useState<Tour | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomIdx, setRoomIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [pannellumReady, setPannellumReady] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [infoBoxData, setInfoBoxData] = useState<{ title?: string; text: string; index?: number } | null>(null);

  const [pendingCoords, setPendingCoords] = useState<{ yaw: number; pitch: number } | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [hotspotType, setHotspotType] = useState<'navigation' | 'info' | 'establish'>('navigation');
  const [targetRoomId, setTargetRoomId] = useState<string | number>('');
  const [hotspotText, setHotspotText] = useState<string>('');
  const [hotspotTitle, setHotspotTitle] = useState<string>('');
  const [fromYawVal, setFromYawVal] = useState<number | null>(null);

  const [activeModal, setActiveModal] = useState<'none' | 'faq' | 'plan' | 'location' | 'about'>('none');
  const [selectedFaqIdx, setSelectedFaqIdx] = useState<number | null>(null);

  const viewerRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const sequenceActiveRef = useRef<boolean>(false);
  const isInterruptedRef = useRef<boolean>(false);
  const mainContainerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'mojtajnikljuc') {
      localStorage.setItem('tour_admin', 'true');
      setAdminMode(true);
    } else if (localStorage.getItem('tour_admin') === 'true') {
      setAdminMode(true);
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mainContainerRef.current?.requestFullscreen().catch(err => {
        console.error("Greška pri pokretanju full screen-a:", err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.error("Greška pri izlasku iz full screen-a:", err);
      });
    }
  };

  const stopCurrentAnimation = () => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  const toggleMute = () => {
    const nextMuteState = !isMutedRef.current;
    isMutedRef.current = nextMuteState;
    setIsMuted(nextMuteState);

    if (nextMuteState) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    }
  };

  const speakTextWithCompletion = (text: string, title?: string, index?: number): Promise<void> => {
    return new Promise((resolve) => {
      if (!text) {
        resolve();
        return;
      }

      setInfoBoxData({ title: title || rooms[roomIdx]?.title, text, index });

      if (isMutedRef.current || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setIsSpeaking(false);
        const readTime = Math.max(3000, text.length * 50);
        const timer = setTimeout(() => {
          resolve();
        }, readTime);
        return;
      }

      window.speechSynthesis.cancel();
      setIsSpeaking(true);

      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const srVoice = voices.find(v => v.lang.includes('sr') || v.lang.includes('hr') || v.lang.includes('bs'));

      if (srVoice) utterance.voice = srVoice;
      utterance.lang = srVoice ? srVoice.lang : 'sr-RS';
      utterance.rate = 0.92;

      const finish = () => {
        setIsSpeaking(false);
        resolve();
      };

      utterance.onend = finish;
      utterance.onerror = finish;

      window.speechSynthesis.speak(utterance);
    });
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setInfoBoxData(null);
    }
  };

  useEffect(() => {
    if (!mounted) return;

    const styleId = 'pannellum-custom-styles';
    let style = document.getElementById(styleId) as HTMLStyleElement;
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }

    style.innerHTML = `
      .pnm-hotspot {
        width: 44px !important;
        height: 44px !important;
        margin-left: -22px !important;
        margin-top: -22px !important;
        cursor: pointer !important;
        transition: transform 0.1s ease;
      }
      .pnm-hotspot:hover {
        transform: scale(1.15);
      }
      .pnm-hotspot.pnm-scene, 
      .pnm-hotspot.pnm-info {
        background-color: rgba(2, 132, 199, 0.9) !important;
        border: 2px solid #ffffff !important;
        border-radius: 50% !important;
        box-shadow: 0 0 12px rgba(0, 0, 0, 0.6) !important;
      }
      .pnm-tooltip span { display: none !important; }
      .pnm-tooltip { display: none !important; }

      /* Sakrivanje skrol bara za lepši izgled horizontalnog menija soba */
      .room-scroll-container::-webkit-scrollbar {
        display: none;
      }
      .room-scroll-container {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `;

    if ((window as any).pannellum) { setPannellumReady(true); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
    script.onload = () => setPannellumReady(true);
    document.body.appendChild(script);

    return () => {
      stopSpeaking();
      stopCurrentAnimation();
    };
  }, [mounted]);

  useEffect(() => {
    if (!slug || !mounted) return;
    async function load() {
      setLoading(true);
      const { data: tourData, error: tourErr } = await supabase.from('tours').select('*').eq('slug', slug).single();
      const { data: roomRows, error: roomErr } = await supabase.from('rooms').select('*').eq('tour_slug', slug).order('order_index', { ascending: true });

      if (tourErr || !tourData) setError('Tura nije pronađena.');
      else setTour(tourData as Tour);

      if (roomErr || !roomRows || roomRows.length === 0) setError('Ova tura nema soba.');
      else setRooms(roomRows as Room[]);

      setLoading(false);
    }
    load();
  }, [slug, mounted]);

  const changeRoomById = (id: string | number) => {
    sequenceActiveRef.current = false;
    isInterruptedRef.current = true;
    stopCurrentAnimation();
    stopSpeaking();

    const foundIndex = rooms.findIndex(r => r.id == id);
    if (foundIndex !== -1) {
      setRoomIdx(foundIndex);
      setInfoBoxData(null);
    }
  };

  useEffect(() => {
    if (!tourStarted || rooms.length === 0 || !pannellumReady || !mounted) return;
    
    const currentRoom = rooms[roomIdx];
    if (!currentRoom?.panorama_url) return;

    sequenceActiveRef.current = false;
    stopCurrentAnimation();
    stopSpeaking();

    sequenceActiveRef.current = true;
    isInterruptedRef.current = false;
    setInfoBoxData(null);

    if (viewerRef.current) {
      try { viewerRef.current.destroy(); } catch (e) {}
      viewerRef.current = null;
    }
    const panoramaContainer = document.getElementById('panorama');
    if (panoramaContainer) {
      panoramaContainer.innerHTML = '';
    }

    const formattedHotspots = (currentRoom.waypoints || []).map((wp, index) => {
      const isNav = wp.type === 'navigation' || Boolean(wp.targetRoomId);

      return {
        pitch: wp.pitch || 0,
        yaw: wp.yaw || 0,
        type: isNav ? 'scene' : 'info',
        clickHandlerFunc: () => {
          if (adminMode) {
            handleStartEditWaypoint(index);
          } else if (isNav && wp.targetRoomId) {
            changeRoomById(wp.targetRoomId);
          } else if (!isNav) {
            isInterruptedRef.current = true;
            stopCurrentAnimation();
            if (viewerRef.current) {
              viewerRef.current.setHfov(50);
            }
            speakTextWithCompletion(wp.text, wp.title, index);
          }
        }
      };
    });

    const targetEstablishYaw = normalizeYaw(currentRoom.establish?.fromYaw ?? 0);
    const targetEstablishPitch = currentRoom.establish?.pitch ?? 0;

    const v = (window as any).pannellum.viewer('panorama', {
      type: 'equirectangular',
      panorama: currentRoom.panorama_url,
      autoLoad: true,
      showControls: false,
      hfov: 70,
      yaw: targetEstablishYaw,
      pitch: targetEstablishPitch,
      autoRotate: 0,
      hotSpots: formattedHotspots
    });
    viewerRef.current = v;

    const infoPoints = (currentRoom.waypoints || [])
      .map((wp, i) => ({ wp, i }))
      .filter(item => item.wp.type === 'info' || (!item.wp.type && !item.wp.targetRoomId));

    v.on('load', async () => {
      if (!sequenceActiveRef.current || isInterruptedRef.current) return;

      const introText = currentRoom.establish?.text || `Dobrodošli u ${currentRoom.title}`;

      const rotatePromise = new Promise<void>((resolve) => {
        const durationPhase1 = 15000;
        const totalDegrees = 240;
        const speed = totalDegrees / (durationPhase1 / 1000);

        if (!sequenceActiveRef.current || isInterruptedRef.current) return resolve();

        if (viewerRef.current) {
          viewerRef.current.setHfov(70);
          viewerRef.current.setYaw(targetEstablishYaw);
          viewerRef.current.setPitch(targetEstablishPitch);
          viewerRef.current.startAutoRotate(speed, targetEstablishPitch);
        }

        const startTime = performance.now();

        const checkCompletion = (now: number) => {
          if (!sequenceActiveRef.current || isInterruptedRef.current) {
            if (viewerRef.current) viewerRef.current.stopAutoRotate();
            return resolve();
          }

          const elapsed = now - startTime;
          if (elapsed < durationPhase1) {
            animFrameRef.current = requestAnimationFrame(checkCompletion);
          } else {
            if (viewerRef.current) {
              viewerRef.current.stopAutoRotate();
            }
            resolve();
          }
        };

        animFrameRef.current = requestAnimationFrame(checkCompletion);
      });

      await Promise.all([
        rotatePromise,
        speakTextWithCompletion(introText, currentRoom.title)
      ]);

      if (!sequenceActiveRef.current || isInterruptedRef.current) return;

      const runInfoSequencePhase2 = async (index: number) => {
        if (!sequenceActiveRef.current || isInterruptedRef.current || !viewerRef.current) return;

        if (index >= infoPoints.length) {
          startInfiniteGlide();
          return;
        }

        const item = infoPoints[index];
        const currentYaw = normalizeYaw(viewerRef.current.getYaw());
        const targetYaw = getShortestTargetYaw(currentYaw, item.wp.yaw);
        const targetPitch = item.wp.pitch ?? 0;

        viewerRef.current.lookAt(targetPitch, targetYaw, 50, 2200);

        await new Promise(r => setTimeout(r, 2300));
        if (!sequenceActiveRef.current || isInterruptedRef.current) return;

        await speakTextWithCompletion(item.wp.text, item.wp.title, item.i);
        if (!sequenceActiveRef.current || isInterruptedRef.current) return;

        await new Promise(r => setTimeout(r, 1000));
        runInfoSequencePhase2(index + 1);
      };

      const startInfiniteGlide = () => {
        if (!sequenceActiveRef.current || isInterruptedRef.current) return;

        stopCurrentAnimation();
        
        setInfoBoxData({
          title: 'Vodič završen',
          text: 'Slobodno razgledajte prostoriju ili pređite u drugu prostoriju preko strelica.'
        });
        
        if (viewerRef.current) {
          viewerRef.current.setHfov(70);
        }

        let lastTime = performance.now();
        const degreesPerMs = 230 / 18000;

        const animateGlide = (now: number) => {
          if (!sequenceActiveRef.current || isInterruptedRef.current) return;
          const delta = now - lastTime;
          lastTime = now;

          if (viewerRef.current) {
            const currentYaw = viewerRef.current.getYaw();
            viewerRef.current.setYaw(currentYaw + degreesPerMs * delta);
            viewerRef.current.setPitch(targetEstablishPitch);
          }
          animFrameRef.current = requestAnimationFrame(animateGlide);
        };

        animFrameRef.current = requestAnimationFrame(animateGlide);
      };

      if (infoPoints.length > 0) {
        runInfoSequencePhase2(0);
      } else {
        startInfiniteGlide();
      }
    });

    const handleDblClick = () => {
      if (adminMode && viewerRef.current) {
        const currentPitch = Math.round(viewerRef.current.getPitch() * 10) / 10;
        const currentYaw = Math.round(normalizeYaw(viewerRef.current.getYaw()) * 10) / 10;

        setPendingCoords({ pitch: currentPitch, yaw: currentYaw });
        setEditingIndex(null);
        setFromYawVal(currentYaw);
        setHotspotText('');
        setHotspotTitle('');
        setTargetRoomId('');
        setHotspotType('navigation');
      }
    };

    panoramaContainer?.addEventListener('dblclick', handleDblClick);

    return () => {
      sequenceActiveRef.current = false;
      panoramaContainer?.removeEventListener('dblclick', handleDblClick);
      stopCurrentAnimation();

      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch (e) {}
        viewerRef.current = null;
      }

      if (panoramaContainer) {
        panoramaContainer.innerHTML = '';
      }
    };
  }, [rooms, roomIdx, pannellumReady, adminMode, mounted, tourStarted]);

  const handleStartEditWaypoint = (index: number) => {
    const currentRoom = rooms[roomIdx];
    const wp = currentRoom.waypoints?.[index];
    if (!wp) return;

    sequenceActiveRef.current = false;
    isInterruptedRef.current = true;
    stopCurrentAnimation();
    stopSpeaking();

    if (viewerRef.current) {
      const currentYaw = viewerRef.current.getYaw();
      const targetYaw = getShortestTargetYaw(currentYaw, wp.yaw);
      viewerRef.current.lookAt(wp.pitch ?? 0, targetYaw, 50, 1000);
    }

    setPendingCoords({ pitch: wp.pitch, yaw: wp.yaw });
    setEditingIndex(index);
    setHotspotType(wp.type || 'info');
    setHotspotTitle(wp.title || '');
    setHotspotText(wp.text || '');
    setTargetRoomId(wp.targetRoomId || '');
  };

  const handleStartEditEstablish = () => {
    const currentRoom = rooms[roomIdx];
    const establish = currentRoom.establish;

    sequenceActiveRef.current = false;
    isInterruptedRef.current = true;
    stopCurrentAnimation();
    stopSpeaking();

    if (viewerRef.current) {
      const currentYaw = viewerRef.current.getYaw();
      const targetYaw = getShortestTargetYaw(currentYaw, establish?.fromYaw ?? 0);
      viewerRef.current.lookAt(establish?.pitch ?? 0, targetYaw, 70, 1000);
    }

    setPendingCoords({
      pitch: establish?.pitch ?? 0,
      yaw: establish?.fromYaw ?? 0
    });
    setEditingIndex(null);
    setHotspotType('establish');
    setHotspotText(establish?.text || '');
    setFromYawVal(establish?.fromYaw ?? 0);
  };

  const handleDeleteWaypoint = async (index: number) => {
    if (!confirm('Da li ste sigurni da želite da obrišete ovu tačku?')) return;

    const currentRoom = rooms[roomIdx];
    const updatedWaypoints = [...(currentRoom.waypoints || [])];
    updatedWaypoints.splice(index, 1);

    const { error: updateErr } = await supabase
      .from('rooms')
      .update({ waypoints: updatedWaypoints })
      .eq('id', currentRoom.id);

    if (!updateErr) {
      const updatedRooms = [...rooms];
      updatedRooms[roomIdx].waypoints = updatedWaypoints;
      setRooms(updatedRooms);
      setInfoBoxData(null);
    }
  };

  async function handleSave() {
    if (!pendingCoords || !viewerRef.current) return;
    const currentRoom = rooms[roomIdx];

    const finalPitch = Math.round(viewerRef.current.getPitch() * 10) / 10;
    const finalYaw = Math.round(normalizeYaw(viewerRef.current.getYaw()) * 10) / 10;

    if (hotspotType === 'establish') {
      const newEstablishData: EstablishData = {
        text: hotspotText,
        fromYaw: finalYaw,
        pitch: finalPitch
      };

      const { error: updateErr } = await supabase
        .from('rooms')
        .update({ establish: newEstablishData })
        .eq('id', currentRoom.id);

      if (!updateErr) {
        const updatedRooms = [...rooms];
        updatedRooms[roomIdx].establish = newEstablishData;
        setRooms(updatedRooms);
        alert('Uvodna naracija uspešno izmenjena!');
      }
    } else {
      const newWaypoint: Waypoint = {
        pitch: finalPitch,
        yaw: finalYaw,
        title: hotspotTitle,
        text: hotspotText,
        type: hotspotType,
        targetRoomId: hotspotType === 'navigation' ? targetRoomId : undefined
      };

      let updatedWaypoints = [...(currentRoom.waypoints || [])];

      if (editingIndex !== null) {
        updatedWaypoints[editingIndex] = newWaypoint;
      } else {
        updatedWaypoints.push(newWaypoint);
      }

      const { error: updateErr } = await supabase
        .from('rooms')
        .update({ waypoints: updatedWaypoints })
        .eq('id', currentRoom.id);

      if (!updateErr) {
        const updatedRooms = [...rooms];
        updatedRooms[roomIdx].waypoints = updatedWaypoints;
        setRooms(updatedRooms);
        alert(editingIndex !== null ? 'Pozicija i podaci tačke sačuvani!' : 'Tačka uspešno sačuvana!');
      }
    }

    setPendingCoords(null);
    setEditingIndex(null);
    setHotspotText('');
    setHotspotTitle('');
    setTargetRoomId('');
    setFromYawVal(null);
    setHotspotType('navigation');
  }

  if (!mounted || loading || !pannellumReady) return <Centered>Učitavanje ture...</Centered>;
  if (error) return <Centered>{error}</Centered>;

  if (!tourStarted) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', fontFamily: 'sans-serif', textAlign: 'center', padding: '20px' }}>
        <h1 style={{ fontSize: '28px', margin: 0 }}>{tour?.title || '360 Virtuelna Tura'}</h1>
        <p style={{ color: '#aaa', maxWidth: '400px', fontSize: '14px', lineHeight: '1.5' }}>
          Dobrodošli! Kliknite na dugme ispod da pokrenete interaktivnu turu sa glasovnim vodičem.
        </p>
        <button 
          onClick={() => setTourStarted(true)}
          style={{ padding: '14px 28px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '30px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 20px rgba(2, 132, 199, 0.4)', transition: 'transform 0.2s' }}
        >
          ▶ Pokreni turu
        </button>
      </div>
    );
  }

  const cat = tour?.category && categoryQuestions[tour.category] ? tour.category : 'rent';
  const qList = categoryQuestions[cat];

  const faqList = [
    { q: qList[0], a: tour?.faq_1 || 'Podatak nije unet u bazu.' },
    { q: qList[1], a: tour?.faq_2 || 'Podatak nije unet u bazu.' },
    { q: qList[2], a: tour?.faq_3 || 'Podatak nije unet u bazu.' },
    { q: qList[3], a: tour?.faq_4 || 'Podatak nije unet u bazu.' }
  ];

  return (
    <main 
      ref={mainContainerRef}
      suppressHydrationWarning 
      style={{ width: '100vw', height: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}
    >

      {/* Zaglavlje (Header) */}
      <div suppressHydrationWarning style={{ padding: '6px 14px', background: '#121212', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, minHeight: '44px' }}>
        <h1 style={{ margin: 0, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{tour?.title || '360 Tura'}</h1>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
          {adminMode && (
            <button 
              onClick={handleStartEditEstablish}
              style={{ padding: '4px 8px', borderRadius: '14px', border: '1px solid #eab308', background: '#854d0e', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '10px' }}
            >
              🎬 Uvod
            </button>
          )}

          <button 
            onClick={toggleMute}
            style={{ 
              padding: '4px', 
              borderRadius: '50%', 
              border: 'none', 
              background: !isMuted ? '#22c55e' : '#ef4444', 
              color: '#fff', 
              cursor: 'pointer',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}
            title={!isMuted ? "Isključi zvuk (Mute)" : "Uključi zvuk (Unmute)"}
          >
            {!isMuted ? '🔊' : '🔇'}
          </button>

          <button 
            onClick={toggleFullscreen}
            style={{ padding: '4px 8px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.2)', background: '#27272a', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '10px' }}
            title="Preko celog ekrana"
          >
            {isFullscreen ? '⤫ Izlaz' : '⛶ Fullscreen'}
          </button>

          {adminMode && (
            <span style={{ fontSize: '10px', background: '#0284c7', color: '#fff', padding: '3px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
              Admin
            </span>
          )}
        </div>
      </div>

      {/* Kontrolisani horizontalni meni (ticker) za sobe - pomeren gore, može da se skroluje napred-nazad prstom */}
      <div 
        className="room-scroll-container" 
        style={{ 
          padding: '8px 10px', 
          background: '#18181b', 
          overflowX: 'auto', 
          overflowY: 'hidden',
          borderBottom: '1px solid #27272a', 
          zIndex: 10,
          whiteSpace: 'nowrap',
          display: 'flex',
          gap: '8px',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {rooms.map((r) => {
          const isSelected = r.id === rooms[roomIdx]?.id;
          return (
            <button 
              key={r.id} 
              onClick={() => changeRoomById(r.id)} 
              style={{ 
                padding: '6px 14px', 
                borderRadius: '14px', 
                border: isSelected ? '2px solid #38bdf8' : '1px solid #3f3f46', 
                background: isSelected ? 'linear-gradient(135deg, #0284c7, #0369a1)' : '#27272a', 
                color: '#fff', 
                fontSize: '12px', 
                fontWeight: isSelected ? 'bold' : 'normal',
                cursor: 'pointer', 
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: isSelected ? '0 0 10px rgba(56, 189, 248, 0.6)' : 'none',
                transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                transition: 'all 0.2s ease'
              }}
            >
              🚪 {r.title} {isSelected && ' ✨'}
            </button>
          );
        })}
      </div>

      {/* Lista postavljenih tačaka u Admin režimu */}
      {adminMode && (
        <div style={{ padding: '6px 14px', background: '#1e1e24', borderBottom: '1px solid #333', display: 'flex', gap: '8px', overflowX: 'auto', zIndex: 10 }}>
          <span style={{ fontSize: '11px', color: '#aaa', alignSelf: 'center', fontWeight: 'bold' }}>Tačke:</span>
          {(rooms[roomIdx]?.waypoints || []).map((wp, idx) => (
            <button 
              key={idx} 
              onClick={() => handleStartEditWaypoint(idx)}
              style={{ padding: '3px 8px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '4px', color: '#fff', fontSize: '10px', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              ✏️ #{idx + 1} ({wp.title || (wp.type === 'navigation' ? 'Prelaz' : 'Info')})
            </button>
          ))}
        </div>
      )}

      {/* Panorama Wrapper Container */}
      <div style={{ flex: 1, width: '100%', position: 'relative', overflow: 'hidden' }}>
        <div id="panorama" style={{ width: '100%', height: '100%' }} />

        {adminMode && (
          <div 
            style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)', 
              pointerEvents: 'none', 
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" style={{ filter: 'drop-shadow(0px 0px 4px rgba(0,0,0,0.8))' }}>
              <circle cx="24" cy="24" r="18" stroke="#ef4444" strokeWidth="2" fill="none" opacity="0.8" />
              <line x1="24" y1="2" x2="24" y2="46" stroke="#ef4444" strokeWidth="2" />
              <line x1="2" y1="24" x2="46" y2="24" stroke="#ef4444" strokeWidth="2" />
              <circle cx="24" cy="24" r="3" fill="#ef4444" />
            </svg>
            <span style={{ background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', marginTop: '6px', fontWeight: 'bold' }}>
              Naciljaj krstićem i napravi DUPLI KLIK
            </span>
          </div>
        )}
      </div>

      {/* Bottom Modals Bar (Dugmići na samom dnu ekrana) */}
      <div style={{ padding: '8px 14px', background: '#121212', borderTop: '1px solid #282828', display: 'flex', justifyContent: 'center', gap: '6px', zIndex: 10 }}>
        <button onClick={() => { setActiveModal('faq'); setSelectedFaqIdx(null); }} style={btnStyle}>❓ Pitanja</button>
        <button onClick={() => setActiveModal('plan')} style={btnStyle}>📐 Plan</button>
        <button onClick={() => setActiveModal('location')} style={btnStyle}>📍 Lokacija</button>
        <button onClick={() => setActiveModal('about')} style={btnStyle}>🏠 O stanu</button>
      </div>

      {/* Info Card / Obaveštavajući oblačić - Izvučen iznad donjih dugmića da se tekst nikad ne zaklanja */}
      {infoBoxData && (
        <div 
          style={{ 
            position: 'absolute', 
            bottom: '50px', 
            left: '10px',
            right: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.98)', 
            color: '#111111', 
            padding: '14px 16px', 
            borderRadius: '12px', 
            boxShadow: '0 5px 25px rgba(0, 0, 0, 0.6)', 
            zIndex: 50, 
            border: '2px solid #0284c7',
            boxSizing: 'border-box'
          }}
        >
          <button 
            onClick={() => setInfoBoxData(null)} 
            style={{ position: 'absolute', top: '10px', right: '12px', background: 'none', border: 'none', fontSize: '16px', color: '#666', cursor: 'pointer' }}
          >
            ✕
          </button>
          
          {infoBoxData.title && (
            <h4 style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#000', fontFamily: 'sans-serif' }}>
              {infoBoxData.title}
            </h4>
          )}
          
          <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.4', color: '#222', fontFamily: 'sans-serif', paddingRight: '20px' }}>
            {infoBoxData.text}
          </p>

          {adminMode && infoBoxData.index !== undefined && (
            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #ddd', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => handleStartEditWaypoint(infoBoxData.index!)}
                style={{ padding: '4px 10px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
              >
                ✏️ Izmeni / Pomeri
              </button>
              <button 
                onClick={() => handleDeleteWaypoint(infoBoxData.index!)}
                style={{ padding: '4px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
              >
                🗑️ Obriši
              </button>
            </div>
          )}
        </div>
      )}

      {/* Admin Modal Panel */}
      {pendingCoords && adminMode && (
        <div 
          style={{ 
            position: 'fixed', 
            bottom: '80px', 
            right: '20px', 
            left: 'auto',
            transform: 'none', 
            background: 'rgba(24, 24, 27, 0.95)', 
            padding: '20px', 
            borderRadius: '16px', 
            width: '360px', 
            maxWidth: '90vw', 
            border: '1px solid #3b82f6', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px', 
            zIndex: 10000, 
            boxShadow: '0 10px 30px rgba(0,0,0,0.8)' 
          }}
        >
          <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>
            {editingIndex !== null ? '✏️ Izmeni / Pomeri tačku' : 'Dodaj novu tačku'}
          </h3>
          <p style={{ margin: 0, fontSize: '11px', color: '#eab308' }}>
            💡 Pomerite sliku mišem da naciljate NOVu poziciju krstićem, pa kliknite Sačuvaj.
          </p>

          <label style={{ fontSize: '11px', color: '#aaa' }}>Tip akcije:</label>
          <select value={hotspotType} onChange={(e) => setHotspotType(e.target.value as any)} style={{ padding: '8px', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '12px' }}>
            <option value="navigation">🚪 Strelica za prelaz u sobu</option>
            <option value="info">ℹ️ Info tačka (prikazuje beli box)</option>
            <option value="establish">🎬 Uvodna naracija (Početna rotacija)</option>
          </select>

          {hotspotType === 'info' && (
            <input 
              type="text" 
              value={hotspotTitle} 
              onChange={(e) => setHotspotTitle(e.target.value)} 
              placeholder="Naslov (npr. REZERVACIJA SADA):" 
              style={{ padding: '8px', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
            />
          )}

          {hotspotType === 'navigation' && (
            <select value={targetRoomId} onChange={(e) => setTargetRoomId(e.target.value)} style={{ padding: '8px', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '12px' }}>
              <option value="">-- Izaberi sobu --</option>
              {rooms.map(r => r.id != rooms[roomIdx].id && <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
          )}

          <textarea 
            rows={2} 
            value={hotspotText} 
            onChange={(e) => setHotspotText(e.target.value)} 
            placeholder="Opis / Tekst naracije..." 
            style={{ padding: '8px', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '12px' }} 
          />

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px', alignItems: 'center' }}>
            {editingIndex !== null && (
              <button 
                type="button"
                onClick={() => {
                  const idxToDelete = editingIndex;
                  setPendingCoords(null);
                  setEditingIndex(null);
                  handleDeleteWaypoint(idxToDelete);
                }} 
                style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', marginRight: 'auto', fontWeight: 'bold' }}
              >
                🗑️ Obriši tačku
              </button>
            )}

            <button 
              onClick={() => {
                setPendingCoords(null);
                setEditingIndex(null);
              }} 
              style={{ padding: '6px 12px', background: '#3f3f46', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
            >
              Otkaži
            </button>
            <button onClick={handleSave} style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
              Sačuvaj Poziciju & Podatke
            </button>
          </div>
        </div>
      )}

      {/* Info Modals */}
      {activeModal !== 'none' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: '#1c1c1c', padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '500px', border: '1px solid #333' }}>
            
            {activeModal === 'faq' && (
              <div>
                {selectedFaqIdx === null ? (
                  <div>
                    <h3 style={{ margin: '0 0 12px 0', color: '#fff' }}>Često postavljana pitanja</h3>
                    <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '16px' }}>Izaberite pitanje da vidite odgovor u prozoru:</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {faqList.map((item, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => setSelectedFaqIdx(idx)}
                          style={{ padding: '12px 16px', background: '#2a2a2a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff', fontSize: '14px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <span>❓ {item.q}</span>
                          <span style={{ color: '#38bdf8', fontSize: '16px' }}>›</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 style={{ margin: '0 0 12px 0', color: '#38bdf8', fontSize: '15px' }}>
                      ❓ {faqList[selectedFaqIdx].q}
                    </h3>
                    <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #3f3f46' }}>
                      <p style={{ margin: 0, color: '#e5e5e5', fontSize: '14px', lineHeight: '1.6' }}>
                        {faqList[selectedFaqIdx].a}
                      </p>
                    </div>
                    <button 
                      onClick={() => setSelectedFaqIdx(null)}
                      style={{ padding: '8px 14px', background: '#3f3f46', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', width: '100%', marginBottom: '6px' }}
                    >
                      ← Nazad na sva pitanja
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeModal === 'plan' && <div><h3 style={{ color: '#fff', margin: '0 0 12px 0' }}>Plan stana</h3>{tour?.floorplan_url ? <img src={tour.floorplan_url} style={{ width: '100%', borderRadius: '8px' }} /> : <p style={{ color: '#aaa' }}>Nema slike plana.</p>}</div>}
            
            {activeModal === 'location' && <div><h3 style={{ color: '#fff', margin: '0 0 12px 0' }}>Lokacija</h3><p style={{ color: '#ccc', lineHeight: '1.5' }}>{tour?.location_text || 'Nije uneto.'}</p></div>}
            
            {activeModal === 'about' && <div><h3 style={{ color: '#fff', margin: '0 0 12px 0' }}>Više o stanu</h3><p style={{ color: '#ccc', lineHeight: '1.5' }}>{tour?.about_text || 'Nije uneto.'}</p></div>}

            <button 
              onClick={() => { setActiveModal('none'); setSelectedFaqIdx(null); }} 
              style={{ marginTop: '16px', width: '100%', padding: '10px', background: '#374151', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Zatvori
            </button>
          </div>
        </div>
      )}

    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div style={{ color: 'white', background: 'black', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>;
}

const btnStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  color: '#ffffff',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '16px',
  padding: '4px 10px',
  fontSize: '11px',
  cursor: 'pointer'
};