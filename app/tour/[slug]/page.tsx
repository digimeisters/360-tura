'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

type Waypoint = {
  yaw: number;
  pitch: number;
  text: string;
  type?: 'navigation' | 'info';
  targetRoomId?: string;
};

type EstablishData = {
  text?: string;
  fromYaw?: number;
  toYaw?: number;
  pitch?: number;
  duration?: number;
};

type Room = {
  id: string;
  tour_slug: string;
  title: string;
  panorama_url: string;
  order_index?: number;
  waypoints?: Waypoint[];
  establish?: EstablishData;
};

type Tour = {
  id: string;
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

export default function TourPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [tour, setTour] = useState<Tour | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomIdx, setRoomIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [pannellumReady, setPannellumReady] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Admin states
  const [pendingCoords, setPendingCoords] = useState<{ yaw: number; pitch: number } | null>(null);
  const [hotspotType, setHotspotType] = useState<'navigation' | 'info' | 'establish'>('navigation');
  const [targetRoomId, setTargetRoomId] = useState<string>('');
  const [hotspotText, setHotspotText] = useState<string>('');

  // Establish specific states
  const [fromYawVal, setFromYawVal] = useState<number | null>(null);
  const [toYawVal, setToYawVal] = useState<number | null>(null);
  const [durationVal, setDurationVal] = useState<number>(10000); // podrazumevano 10 sekundi

  const [caption, setCaption] = useState('');
  const [activeModal, setActiveModal] = useState<'none' | 'faq' | 'plan' | 'location' | 'about'>('none');

  const viewerRef = useRef<any>(null);

  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    if (!text) {
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    const voices = window.speechSynthesis.getVoices();
    const srVoice = voices.find(v => v.lang.includes('sr') || v.lang.includes('hr') || v.lang.includes('bs'));
    
    if (srVoice) utterance.voice = srVoice;
    utterance.lang = srVoice ? srVoice.lang : 'sr-RS';
    utterance.rate = 0.95;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    const styleId = 'pannellum-custom-styles';
    let style = document.getElementById(styleId) as HTMLStyleElement;
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }

    style.innerHTML = `
      .pnm-hotspot {
        width: 52px !important;
        height: 52px !important;
        margin-left: -26px !important;
        margin-top: -26px !important;
      }
      .pnm-hotspot.pnm-scene, 
      .pnm-hotspot.pnm-info {
        background-color: #0284c7 !important;
        border: 3px solid #ffffff !important;
        border-radius: 50% !important;
        background-size: 30px 30px !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
        box-shadow: 0 0 15px rgba(2, 132, 199, 0.9) !important;
      }
      .pnm-hotspot:hover {
        background-color: #38bdf8 !important;
        width: 58px !important;
        height: 58px !important;
        margin-left: -29px !important;
        margin-top: -29px !important;
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
    };
  }, []);

  useEffect(() => {
    if (!slug) return;
    async function load() {
      setLoading(true);
      const { data: tourData, error: tourErr } = await supabase
        .from('tours')
        .select('*')
        .eq('slug', slug)
        .single();
      const { data: roomRows, error: roomErr } = await supabase
        .from('rooms')
        .select('*')
        .eq('tour_slug', slug)
        .order('order_index', { ascending: true });

      if (tourErr || !tourData) setError('Tura nije pronađena.');
      else setTour(tourData as Tour);

      if (roomErr || !roomRows || roomRows.length === 0) setError('Ova tura nema soba.');
      else setRooms(roomRows as Room[]);

      setLoading(false);
    }
    load();
  }, [slug]);

  const changeRoomById = (id: string) => {
    const foundIndex = rooms.findIndex(r => r.id === id);
    if (foundIndex !== -1) {
      setRoomIdx(foundIndex);
      setCaption('');
    }
  };

  useEffect(() => {
    if (rooms.length === 0 || !pannellumReady) return;
    const currentRoom = rooms[roomIdx];
    if (!currentRoom?.panorama_url) return;

    if (viewerRef.current) {
      try { viewerRef.current.destroy(); } catch (e) {}
    }

    const formattedHotspots = (currentRoom.waypoints || []).map((wp) => {
      const isNav = wp.type === 'navigation' || Boolean(wp.targetRoomId);

      if (isNav) {
        return {
          pitch: wp.pitch || 0,
          yaw: wp.yaw || 0,
          type: 'scene',
          text: wp.text || 'Pređi u drugu sobu',
          clickHandlerArgs: wp.targetRoomId,
          clickHandlerFunc: (evt: any, targetId: string) => {
            if (targetId) changeRoomById(targetId);
          }
        };
      }

      return {
        pitch: wp.pitch || 0,
        yaw: wp.yaw || 0,
        type: 'info',
        text: wp.text || 'Informacija',
        clickHandlerArgs: wp.text,
        clickHandlerFunc: (evt: any, infoText: string) => {
          if (infoText) setCaption(infoText);
        }
      };
    });

    const initialYaw = currentRoom.establish?.fromYaw ?? 0;
    const initialPitch = currentRoom.establish?.pitch ?? 0;

    const v = (window as any).pannellum.viewer('panorama', {
      type: 'equirectangular',
      panorama: currentRoom.panorama_url,
      autoLoad: true,
      showControls: true,
      hfov: 100,
      yaw: initialYaw,
      pitch: initialPitch,
      hotSpots: formattedHotspots
    });
    viewerRef.current = v;

    if (currentRoom.establish?.toYaw !== undefined && currentRoom.establish?.duration) {
      const targetYaw = currentRoom.establish.toYaw;
      const animDuration = currentRoom.establish.duration;
      
      v.on('load', () => {
        // Glatko pokreće kameru od initialYaw do targetYaw u trajanju animDuration (ms)
        v.lookAt(initialPitch, targetYaw, 100, animDuration);
      });
    }

    const textToSpeak = currentRoom.establish?.text || `Dobrodošli u prostoriju: ${currentRoom.title}`;
    speakText(textToSpeak);

    const panoramaEl = document.getElementById('panorama');
    const handlePanoramaClick = (e: MouseEvent) => {
      if (!adminMode || !viewerRef.current) return;
      const coords = viewerRef.current.mouseEventToCoords(e);
      if (coords && coords.length >= 2) {
        const clickedYaw = Math.round(coords[1] * 10) / 10;
        const clickedPitch = Math.round(coords[0] * 10) / 10;
        
        setPendingCoords({ pitch: clickedPitch, yaw: clickedYaw });
        setFromYawVal(clickedYaw); // Inicijalno postavlja kliknutu tačku kao POČETAK
      }
    };

    panoramaEl?.addEventListener('click', handlePanoramaClick);
    return () => panoramaEl?.removeEventListener('click', handlePanoramaClick);
  }, [rooms, roomIdx, pannellumReady, adminMode]);

  // Pomagalo za hvatanje trenutnog ugla iz pregledača
  const setCurrentViewAsPoint = (pointType: 'from' | 'to') => {
    if (viewerRef.current) {
      const currentYaw = Math.round(viewerRef.current.getYaw() * 10) / 10;
      if (pointType === 'from') setFromYawVal(currentYaw);
      if (pointType === 'to') setToYawVal(currentYaw);
    }
  };

  async function handleSave() {
    if (!pendingCoords) return;

    const currentRoom = rooms[roomIdx];

    if (hotspotType === 'establish') {
      const newEstablishData: EstablishData = {
        text: hotspotText,
        fromYaw: fromYawVal ?? pendingCoords.yaw,
        toYaw: toYawVal ?? (pendingCoords.yaw + 40),
        pitch: pendingCoords.pitch,
        duration: durationVal
      };

      const { error: updateErr } = await supabase
        .from('rooms')
        .update({ establish: newEstablishData })
        .eq('id', currentRoom.id);

      if (updateErr) {
        alert('Greška pri snimanju naracije: ' + updateErr.message);
      } else {
        const updatedRooms = [...rooms];
        updatedRooms[roomIdx].establish = newEstablishData;
        setRooms(updatedRooms);
        alert('Početak, kraj i uvodna naracija uspešno sačuvani!');
        speakText(hotspotText);
      }
    } else {
      const newWaypoint: Waypoint = {
        pitch: pendingCoords.pitch,
        yaw: pendingCoords.yaw,
        text: hotspotText || (hotspotType === 'navigation' ? 'Pređi ovde' : 'Opis tačke'),
        type: hotspotType,
        targetRoomId: hotspotType === 'navigation' ? targetRoomId : undefined
      };

      const updatedWaypoints = [...(currentRoom.waypoints || []), newWaypoint];

      const { error: updateErr } = await supabase
        .from('rooms')
        .update({ waypoints: updatedWaypoints })
        .eq('id', currentRoom.id);

      if (updateErr) {
        alert('Greška pri snimanju hotspota: ' + updateErr.message);
      } else {
        const updatedRooms = [...rooms];
        updatedRooms[roomIdx].waypoints = updatedWaypoints;
        setRooms(updatedRooms);
        alert('Hotspot uspešno sačuvan!');
      }
    }

    setPendingCoords(null);
    setHotspotText('');
    setTargetRoomId('');
    setFromYawVal(null);
    setToYawVal(null);
    setHotspotType('navigation');
  }

  if (loading || !pannellumReady) return <Centered>Učitavanje ture...</Centered>;
  if (error) return <Centered>{error}</Centered>;

  const cat = tour?.category && categoryQuestions[tour.category] ? tour.category : 'rent';
  const qList = categoryQuestions[cat];

  const faqList = [
    { q: qList[0], a: tour?.faq_1 || 'Podatak nije unet u bazu.' },
    { q: qList[1], a: tour?.faq_2 || 'Podatak nije unet u bazu.' },
    { q: qList[2], a: tour?.faq_3 || 'Podatak nije unet u bazu.' },
    { q: qList[3], a: tour?.faq_4 || 'Podatak nije unet u bazu.' }
  ];

  return (
    <main style={{ width: '100vw', height: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', flexDirection: 'column' }}>

      {/* Top Header Bar */}
      <div style={{ padding: '12px 20px', background: '#121212', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px' }}>{tour?.title || '360 Tura'}</h1>
          <span style={{ fontSize: '12px', color: '#38bdf8' }}>Trenutno: {rooms[roomIdx]?.title}</span>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={() => isSpeaking ? stopSpeaking() : speakText(rooms[roomIdx]?.establish?.text || `Dobrodošli u ${rooms[roomIdx]?.title}`)}
            style={{ padding: '8px 14px', borderRadius: '20px', border: 'none', background: isSpeaking ? '#eab308' : '#22c55e', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
          >
            {isSpeaking ? '🔊 Utišaj naratora' : '🔊 Pusti naraciju'}
          </button>

          <button onClick={() => setAdminMode(!adminMode)} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: adminMode ? '#ef4444' : '#3b82f6', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
            {adminMode ? '✖ Zatvori Admin' : '➕ Dodaj Tačku / Naraciju'}
          </button>
        </div>
      </div>

      {/* 360 Panorama Container */}
      <div id="panorama" style={{ flex: 1, width: '100%' }}></div>

      {/* Room Selector Strip */}
      <div style={{ padding: '8px 16px', background: '#18181b', display: 'flex', gap: '10px', overflowX: 'auto', borderTop: '1px solid #27272a', zIndex: 10 }}>
        {rooms.map((r, i) => (
          <button key={r.id} onClick={() => setRoomIdx(i)} style={{ padding: '6px 12px', borderRadius: '12px', border: i === roomIdx ? '1px solid #38bdf8' : '1px solid #3f3f46', background: i === roomIdx ? '#0284c7' : '#27272a', color: '#fff', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            🚪 {r.title}
          </button>
        ))}
      </div>

      {/* Bottom Modals Bar */}
      <div style={{ padding: '12px 20px', background: '#121212', borderTop: '1px solid #282828', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 10 }}>
        {caption && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#38bdf8', textAlign: 'center' }}>💬 {caption}</p>
            <button onClick={() => setCaption('')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px' }}>✖</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => setActiveModal('faq')} style={btnStyle}>❓ Postavi pitanje</button>
          <button onClick={() => setActiveModal('plan')} style={btnStyle}>📐 Plan stana</button>
          <button onClick={() => setActiveModal('location')} style={btnStyle}>📍 Lokacija</button>
          <button onClick={() => setActiveModal('about')} style={btnStyle}>🏠 Više o stanu</button>
        </div>
      </div>

      {/* ADMIN: Hotspot & Establish Creator Modal */}
      {pendingCoords && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: '#18181b', padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '440px', border: '1px solid #3b82f6', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ margin: 0, color: '#fff' }}>Dodaj tačku ili naraciju</h3>

            <label style={{ fontSize: '12px', color: '#aaa' }}>Tip akcije:</label>
            <select value={hotspotType} onChange={(e) => setHotspotType(e.target.value as 'navigation' | 'info' | 'establish')} style={{ padding: '10px', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }}>
              <option value="navigation">🚪 Strelica za prelaz u sobu</option>
              <option value="info">ℹ️ Info tačka (opis detalja)</option>
              <option value="establish">🎬 Postavi uvodnu naraciju (Početak & Kraj)</option>
            </select>

            {hotspotType === 'navigation' && (
              <>
                <label style={{ fontSize: '12px', color: '#aaa' }}>Poveži sa prostorijom:</label>
                <select value={targetRoomId} onChange={(e) => setTargetRoomId(e.target.value)} style={{ padding: '10px', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }}>
                  <option value="">-- Izaberi sobu --</option>
                  {rooms.map(r => r.id !== rooms[roomIdx].id && <option key={r.id} value={r.id}>{r.title}</option>)}
                </select>
              </>
            )}

            {/* UPRAVLJANJE POČETNOM I KRAJNJOM TAČKOM AKO JE ZABRANA ESTABLISH */}
            {hotspotType === 'establish' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#09090b', padding: '12px', borderRadius: '8px', border: '1px solid #27272a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#38bdf8' }}>Početni ugao: {fromYawVal ?? pendingCoords.yaw}°</span>
                  <button onClick={() => setCurrentViewAsPoint('from')} style={{ padding: '4px 8px', fontSize: '11px', background: '#0284c7', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}>
                    📍 Postavi trenutni pogled
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#eab308' }}>Krajnji ugao: {toYawVal !== null ? `${toYawVal}°` : 'Nije izabran'}</span>
                  <button onClick={() => setCurrentViewAsPoint('to')} style={{ padding: '4px 8px', fontSize: '11px', background: '#ca8a04', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}>
                    🎯 Postavi trenutni pogled
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <label style={{ fontSize: '11px', color: '#aaa' }}>Trajanje (sekundi):</label>
                  <input 
                    type="number" 
                    value={durationVal / 1000} 
                    onChange={(e) => setDurationVal(Number(e.target.value) * 1000)} 
                    style={{ width: '60px', padding: '4px', background: '#18181b', border: '1px solid #3f3f46', borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                  />
                </div>
              </div>
            )}

            <label style={{ fontSize: '12px', color: '#aaa' }}>
              {hotspotType === 'navigation' && "Tekst na strelici (npr. 'Idi u kuhinju'):"}
              {hotspotType === 'info' && "Opis/tekst informacije za tačku:"}
              {hotspotType === 'establish' && "Tekst uvodne naracije za sobu:"}
            </label>

            <textarea 
              rows={hotspotType === 'establish' ? 3 : 2}
              value={hotspotText} 
              onChange={(e) => setHotspotText(e.target.value)} 
              placeholder={
                hotspotType === 'navigation' ? 'Idi u kuhinju' : 
                hotspotType === 'info' ? 'Ovo je kamin iz 1920. godine' : 
                'Ulazimo u prostrani dnevni boravak sa kaminom i prirodnim svetlom...'
              } 
              style={{ padding: '10px', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff', resize: 'vertical' }} 
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button onClick={() => setPendingCoords(null)} style={{ padding: '8px 16px', background: '#3f3f46', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Otkaži</button>
              <button 
                onClick={handleSave} 
                disabled={hotspotType === 'navigation' && !targetRoomId} 
                style={{ 
                  padding: '8px 16px', 
                  background: (hotspotType !== 'navigation' || targetRoomId) ? '#3b82f6' : '#1e3a8a', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontWeight: 'bold', 
                  cursor: (hotspotType !== 'navigation' || targetRoomId) ? 'pointer' : 'not-allowed' 
                }}
              >
                Sačuvaj u bazu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Modals */}
      {activeModal !== 'none' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: '#1c1c1c', padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '500px', border: '1px solid #333', maxHeight: '80vh', overflowY: 'auto' }}>

            {activeModal === 'faq' && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', color: '#fff' }}>Često postavljana pitanja</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {faqList.map((item, idx) => (
                    <button key={idx} onClick={() => { setCaption(item.a); setActiveModal('none'); }} style={{ textAlign: 'left', padding: '12px', background: '#2a2a2a', border: '1px solid #3d3d3d', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>
                      <strong>❓ {item.q}</strong>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeModal === 'plan' && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', color: '#fff' }}>Plan stana</h3>
                {tour?.floorplan_url ? <img src={tour.floorplan_url} alt="Plan stana" style={{ width: '100%', borderRadius: '8px' }} /> : <p style={{ color: '#aaa' }}>Tlocrt stana još uvek nije dodijeljen.</p>}
              </div>
            )}

            {activeModal === 'location' && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', color: '#fff' }}>Lokacija</h3>
                <p style={{ color: '#ddd', lineHeight: '1.5' }}>{tour?.location_text || 'Podaci o lokaciji nisu uneti.'}</p>
              </div>
            )}

            {activeModal === 'about' && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', color: '#fff' }}>Više o stanu</h3>
                <p style={{ color: '#ddd', lineHeight: '1.5' }}>{tour?.about_text || 'Opis nije unet.'}</p>
              </div>
            )}

            <button onClick={() => setActiveModal('none')} style={{ marginTop: '20px', width: '100%', padding: '10px', background: '#374151', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
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
  borderRadius: '20px',
  padding: '6px 14px',
  fontSize: '12px',
  cursor: 'pointer'
};
