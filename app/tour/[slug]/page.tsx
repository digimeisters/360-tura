'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

type Waypoint = {
  yaw: number;
  pitch: number;
  text: string | Record<string, string>;
  title?: string | Record<string, string>;
  type?: 'navigation' | 'info';
  targetRoomId?: string | number;
  audio_url?: string;
};

type EstablishData = {
  text?: string | Record<string, string>;
  fromYaw?: number;
  pitch?: number;
  audio_url?: string;
};

type Room = {
  id: string | number;
  tour_slug: string;
  title: string | Record<string, string>;
  panorama_url: string;
  order_index?: number;
  waypoints?: Waypoint[];
  establish?: EstablishData;
};

type Tour = {
  id: string | number;
  slug: string;
  title: string | Record<string, string>;
  category?: 'rent' | 'sale' | 'booking';
  location_text?: string | Record<string, string>;
  location_map_url?: string;
  about_text?: string | Record<string, string>;
  floorplan_url?: string;
  faq_1?: string | Record<string, string>;
  faq_2?: string | Record<string, string>;
  faq_3?: string | Record<string, string>;
  faq_4?: string | Record<string, string>;
};

type Language = 'sr' | 'en' | 'de';

const getLocalizedText = (textData: any, lang: string = 'sr'): string => {
  if (!textData) return '';
  if (typeof textData === 'object') {
    return textData[lang] || textData['sr'] || Object.values(textData)[0] || '';
  }
  if (typeof textData === 'string') {
    try {
      const parsed = JSON.parse(textData);
      if (parsed && typeof parsed === 'object') {
        return parsed[lang] || parsed['sr'] || Object.values(parsed)[0] || '';
      }
    } catch (e) {}
    return textData;
  }
  return String(textData);
};

const translations = {
  sr: {
    startTour: '▶ Pokreni turu',
    welcome: 'Dobrodošli! Kliknite na dugme ispod da pokrenete interaktivnu turu sa glasovnim vodičem.',
    loading: 'Učitavanje ture...',
    roomLoadingPrefix: 'Pripremite se... ulazimo u: ',
    tourNotFound: 'Tura nije pronađena.',
    noRooms: 'Ova tura nema soba.',
    audioOn: 'Uključi zvuk (Unmute)',
    audioOff: 'Isključi zvuk (Mute)',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Izlaz',
    intro: '🎬 Uvod',
    points: 'Tačke:',
    guideCompleted: 'Vodič završen',
    freeExplore: 'Slobodno razgledajte prostoriju ili pređite u drugu prostoriju preko strelica.',
    faqBtn: '❓ Pitanja',
    planBtn: '📐 Plan',
    locationBtn: '📍 Lokacija',
    aboutBtn: '🏠 O stanu',
    close: 'Zatvori',
    backToFaq: '← Nazad na sva pitanja',
    faqTitle: 'Često postavljana pitanja',
    faqSub: 'Izaberite pitanje da vidite odgovor u prozoru:',
    floorplanTitle: 'Plan stana',
    noFloorplan: 'Nema slike plana.',
    locationTitle: 'Lokacija na mapi',
    noMap: 'Google mapa nije uneta za ovu turu.',
    aboutTitle: 'Više o stanu',
    notEntered: 'Podatak nije unet u bazu.',
    targetRoom: '-- Izaberi sobu --',
    save: 'Sačuvaj Poziciju & Podatke',
    cancel: 'Otkaži',
    delete: '🗑️ Obriši tačku',
    editPoint: '✏️ Izmeni / Pomeri tačku',
    addPoint: 'Dodaj novu tačku',
    aimInstruction: '💡 Pomerite sliku mišem da naciljate NOVu poziciju krstićem, pa kliknite Sačuvaj.',
    actionType: 'Tip akcije:',
    navArrow: '🚪 Strelica za prelaz u sobu',
    infoPoint: 'ℹ️ Info tačka (prikazuje beli box)',
    introNarration: '🎬 Uvodna naracija (Početna rotacija)',
    titlePlaceholder: 'Naslov (npr. REZERVACIJA SADA):',
    descPlaceholder: 'Opis / Tekst naracije...',
    audioUrlPlaceholder: 'Link do MP3 fajla (npr. https://.../glas.mp3):',
    welcomePrefix: 'Dobrodošli u '
  },
  en: {
    startTour: '▶ Start Tour',
    welcome: 'Welcome! Click the button below to start the interactive tour with a voice guide.',
    loading: 'Loading tour...',
    roomLoadingPrefix: 'Get ready... entering: ',
    tourNotFound: 'Tour not found.',
    noRooms: 'This tour has no rooms.',
    audioOn: 'Unmute',
    audioOff: 'Mute',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit',
    intro: '🎬 Intro',
    points: 'Points:',
    guideCompleted: 'Guide Completed',
    freeExplore: 'Feel free to look around or switch rooms using the arrows.',
    faqBtn: '❓ FAQ',
    planBtn: '📐 Plan',
    locationBtn: '📍 Location',
    aboutBtn: '🏠 About',
    close: 'Close',
    backToFaq: '← Back to all questions',
    faqTitle: 'Frequently Asked Questions',
    faqSub: 'Select a question to view the answer:',
    floorplanTitle: 'Floor Plan',
    noFloorplan: 'No floor plan image available.',
    locationTitle: 'Location Map',
    noMap: 'Google map link not provided for this tour.',
    aboutTitle: 'About the Property',
    notEntered: 'Data not entered in database.',
    targetRoom: '-- Select room --',
    save: 'Save Position & Data',
    cancel: 'Cancel',
    delete: '🗑️ Delete Point',
    editPoint: '✏️ Edit / Move Point',
    addPoint: 'Add New Point',
    aimInstruction: '💡 Move the view to aim the crosshair at the NEW position, then click Save.',
    actionType: 'Action Type:',
    navArrow: '🚪 Room Navigation Arrow',
    infoPoint: 'ℹ️ Info Point (shows white box)',
    introNarration: '🎬 Intro Narration (Initial Rotation)',
    titlePlaceholder: 'Title (e.g. BOOK NOW):',
    descPlaceholder: 'Description / Narration text...',
    audioUrlPlaceholder: 'MP3 file URL (e.g. https://.../voice.mp3):',
    welcomePrefix: 'Welcome to '
  },
  de: {
    startTour: '🇷🇸 Tour Starten',
    welcome: 'Willkommen! Klicken Sie unten, um die interaktive Tour mit Sprachführer zu starten.',
    loading: 'Tour wird geladen...',
    roomLoadingPrefix: 'Machen Sie sich bereit... wir betreten: ',
    tourNotFound: 'Tour nicht gefunden.',
    noRooms: 'Diese Tour hat keine Räume.',
    audioOn: 'Ton an',
    audioOff: 'Stumm',
    fullscreen: 'Vollbild',
    exitFullscreen: 'Beenden',
    intro: '🎬 Intro',
    points: 'Punkte:',
    guideCompleted: 'Führung beendet',
    freeExplore: 'Schauen Sie sich frei um oder wechseln Sie den Raum über die Pfeile.',
    faqBtn: '❓ Fragen',
    planBtn: '📐 Grundriss',
    locationBtn: '📍 Standort',
    aboutBtn: '🏠 Über',
    close: 'Schließen',
    backToFaq: '← Zurück zu allen Fragen',
    faqTitle: 'Häufig gestellte Fragen',
    faqSub: 'Wählen Sie eine Frage aus:',
    floorplanTitle: 'Grundriss',
    noFloorplan: 'Kein Grundriss verfügbar.',
    locationTitle: 'Standortkarte',
    noMap: 'Keine Google-Karte für diese Tour verfügbar.',
    aboutTitle: 'Über die Immobilie',
    notEntered: 'Daten nicht in der Datenbank.',
    targetRoom: '-- Raum wählen --',
    save: 'Position & Daten speichern',
    cancel: 'Abbrechen',
    delete: '🗑️ Punkt löschen',
    editPoint: '✏️ Punkt bearbeiten',
    addPoint: 'Neuen Punkt hinzufügen',
    aimInstruction: '💡 Bewegen Sie das Bild, um das Fadenkreuz auf die NEUE Position zu richten, und klicken Sie auf Speichern.',
    actionType: 'Aktionstyp:',
    navArrow: '🚪 Raumnavigation',
    infoPoint: 'ℹ️ Infopunkt (zeigt weißen Kasten)',
    introNarration: '🎬 Intro-Erzählung (Startdrehung)',
    titlePlaceholder: 'Titel (z.B. JETZT BUCHEN):',
    descPlaceholder: 'Beschreibung / Erzähltext...',
    audioUrlPlaceholder: 'MP3-Datei-URL (z.B. https://.../audio.mp3):',
    welcomePrefix: 'Willkommen in '
  }
};

const categoryQuestions = {
  rent: {
    sr: [
      'Kolika je mesečna zakupnina i kakvi su uslovi za depozit?',
      'Koji je minimalni period zakupa i od kog datuma je stan useljiv?',
      'Koliki su prosečni mesečni troškovi (režije i informatika) i kakvo je grejanje?',
      'Da li su dozvoljeni kućni ljubimci (pet friendly)?',
      'Kakvi su dodatni uslovi ugovora i obaveze zakupca?'
    ],
    en: [
      'What is the monthly rent and what are the deposit conditions?',
      'What is the minimum lease period and from what date is the apartment available?',
      'What are the average monthly utilities and heating costs?',
      'Are pets allowed (pet friendly)?',
      'What are the additional contract terms and tenant obligations?'
    ],
    de: [
      'Wie hoch ist die monatliche Miete und wie sind die Kaubedingungen?',
      'Wie lange ist die Mindestmietdauer und ab welchem Datum ist die Wohnung verfügbar?',
      'Wie hoch sind die durchschnittlichen Nebenkosten und die Heizungsart?',
      'Sind Haustiere erlaubt (haustierfreundlich)?',
      'Wie lauten die zusätzlichen Vertragsbedingungen und Pflichten des Mieters?'
    ]
  },
  sale: {
    sr: [
      'Kolika je prodajna cena i da li postoji mogućnost kupovine na kredit?',
      'Kolika je kvadratura i kakvo je stanje objekta (novogradnja, starogradnja, renoviran)?',
      'Da li je nekretnina uknjižena i kakvo je vlasništvo (1/1, suvlasništvo)?',
      'Da li su porezi i agencijska provizija uključeni u cenu ili su dodatni?',
      'Da li nekretnina ima pripadajući podrum, terasu ili garažno mesto?'
    ],
    en: [
      'What is the selling price and is mortgage purchase possible?',
      'What is the square footage and property condition (new build, old build, renovated)?',
      'Is the property registered and what is the ownership type (1/1, co-ownership)?',
      'Are taxes and agency commission included in the price or additional?',
      'Does the property include a basement, terrace, or garage space?'
    ],
    de: [
      'Wie hoch ist der Verkaufspreis und ist ein Kreditkauf möglich?',
      'Wie groß ist die Fläche und wie ist der Zustand des Objekts (Neubau, Altbau, renoviert)?',
      'Ist die Immobilie im Grundbuch eingetragen und wie ist die Eigentumsverhältnisse (1/1)?',
      'Sind Steuern und Maklerprovision im Preis inbegriffen oder zusätzlich?',
      'Verfügt die Immobilie über einen Keller, eine Terrasse oder einen Garagenplatz?'
    ]
  },
  booking: {
    sr: [
      'Kolika je cena po noćenju i koliki je minimalni boravak?',
      'Koliki je maksimalan broj gostiju (kapacitet) i kakva su pravila kuće?',
      'Koje je tačno vreme za check-in i check-out?',
      'Koliki je iznos takse za čišćenje po boravku?',
      'Da li je obezbeđen parking, Wi-Fi i kakva su pravila otkazivanja?'
    ],
    en: [
      'What is the price per night and what is the minimum stay?',
      'What is the maximum number of guests (capacity) and what are the house rules?',
      'What are the exact check-in and check-out times?',
      'What is the cleaning fee amount per stay?',
      'Is parking and Wi-Fi provided, and what are the cancellation policies?'
    ],
    de: [
      'Wie hoch ist der Preis pro Nacht und wie lang ist der Mindestaufenthalt?',
      'Was ist die maximale Gästeanzahl (Kapazität) und wie lauten die Hausregeln?',
      'Um wie viel Uhr ist Check-in und Check-out?',
      'Wie hoch ist die Reinigungsgebühr pro Aufenthalt?',
      'Sind Parkplätze und WLAN vorhanden und wie lauten die Stornierungsbedingungen?'
    ]
  }
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
  const [lang, setLang] = useState<Language>('sr');

  const t = translations[lang];

  const params = useParams();
  const slug = params?.slug as string;

  const [tour, setTour] = useState<Tour | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomIdx, setRoomIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [roomLoading, setRoomLoading] = useState(false);
  const [error, setError] = useState('');

  const [pannellumReady, setPannellumReady] = useState(false);
  const [adminMode, setAdminMode] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastAudioUrlRef = useRef<string | undefined>(undefined);
  const lastAudioTextRef = useRef<string | undefined>(undefined);
  const lastAudioTitleRef = useRef<string | undefined>(undefined);
  const lastAudioIndexRef = useRef<number | undefined>(undefined);
  const audioCurrentTimeRef = useRef<number>(0);

  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [infoBoxData, setInfoBoxData] = useState<{ title?: string; text: string; index?: number; audio_url?: string } | null>(null);

  const [pendingCoords, setPendingCoords] = useState<{ yaw: number; pitch: number } | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [hotspotType, setHotspotType] = useState<'navigation' | 'info' | 'establish'>('navigation');
  const [targetRoomId, setTargetRoomId] = useState<string | number>('');
  const [hotspotText, setHotspotText] = useState<string>('');
  const [hotspotTitle, setHotspotTitle] = useState<string>('');
  const [hotspotAudioUrl, setHotspotAudioUrl] = useState<string>('');
  const [fromYawVal, setFromYawVal] = useState<number | null>(null);

  const [activeModal, setActiveModal] = useState<'none' | 'faq' | 'plan' | 'location' | 'about'>('none');
  const [selectedFaqIdx, setSelectedFaqIdx] = useState<number | null>(null);

  const tickerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const hasDraggedRef = useRef(false);

  const autoScrollRafRef = useRef<number | null>(null);
  const isAutoScrollPausedRef = useRef(false);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    if (!tourStarted) return;
    const scrollSpeed = 0.8;
    const step = () => {
      if (tickerRef.current && !isAutoScrollPausedRef.current && !isDragging) {
        tickerRef.current.scrollLeft += scrollSpeed;
        if (tickerRef.current.scrollLeft >= tickerRef.current.scrollWidth - tickerRef.current.clientWidth - 1) {
          tickerRef.current.scrollLeft = 0;
        }
      }
      autoScrollRafRef.current = requestAnimationFrame(step);
    };
    autoScrollRafRef.current = requestAnimationFrame(step);
    return () => {
      if (autoScrollRafRef.current) cancelAnimationFrame(autoScrollRafRef.current);
    };
  }, [tourStarted, isDragging]);

  const pauseAutoScrollTemporarily = () => {
    isAutoScrollPausedRef.current = true;
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => {
      isAutoScrollPausedRef.current = false;
    }, 2000);
  };

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

  const stopAudio = () => {
    if (activeAudioRef.current) {
      audioCurrentTimeRef.current = activeAudioRef.current.currentTime;
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const toggleMute = () => {
    const nextMuteState = !isMutedRef.current;
    isMutedRef.current = nextMuteState;
    setIsMuted(nextMuteState);

    if (nextMuteState) {
      if (activeAudioRef.current) {
        audioCurrentTimeRef.current = activeAudioRef.current.currentTime;
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
    } else {
      if (lastAudioUrlRef.current) {
        playAudioFileWithCompletion(
          lastAudioUrlRef.current,
          lastAudioTextRef.current,
          lastAudioTitleRef.current,
          lastAudioIndexRef.current,
          audioCurrentTimeRef.current
        );
      }
    }
  };

  const playAudioFileWithCompletion = (
    audioUrl?: string,
    textFallback?: string | Record<string, string>,
    title?: string | Record<string, string>,
    index?: number,
    startAt: number = 0
  ): Promise<void> => {
    return new Promise((resolve) => {
      stopAudio();
      const resolvedText = getLocalizedText(textFallback, lang);
      const resolvedTitle = getLocalizedText(title || rooms[roomIdx]?.title, lang);

      lastAudioUrlRef.current = audioUrl;
      lastAudioTextRef.current = textFallback;
      lastAudioTitleRef.current = title;
      lastAudioIndexRef.current = index;

      setInfoBoxData({ title: resolvedTitle, text: resolvedText, index, audio_url: audioUrl });

      if (isMutedRef.current) {
        const readTime = Math.max(3000, resolvedText.length * 50);
        setTimeout(resolve, readTime);
        return;
      }

      if (!audioUrl) {
        const readTime = Math.max(3000, resolvedText.length * 50);
        setTimeout(resolve, readTime);
        return;
      }

      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;

      audio.onloadedmetadata = () => {
        if (startAt > 0 && startAt < audio.duration) {
          audio.currentTime = startAt;
        }
      };

      audio.onended = () => {
        activeAudioRef.current = null;
        audioCurrentTimeRef.current = 0;
        resolve();
      };

      audio.onerror = () => {
        activeAudioRef.current = null;
        resolve();
      };

      audio.play().then(() => {
        if (startAt > 0) {
          try { audio.currentTime = startAt; } catch (e) {}
        }
      }).catch(err => {
        activeAudioRef.current = null;
        resolve();
      });
    });
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
        transition: transform 0.2s ease;
      }
      .pnm-hotspot:hover { transform: scale(1.2); }
      .pnm-hotspot.pnm-scene, .pnm-hotspot.pnm-info {
        background-color: rgba(2, 132, 199, 0.8) !important;
        border: 2px solid #ffffff !important;
        border-radius: 50% !important;
        box-shadow: 0 0 0 0 rgba(2, 132, 199, 0.7);
        animation: pulse-hotspot 2s infinite;
      }
      @keyframes pulse-hotspot {
        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(2, 132, 199, 0.7); }
        70% { transform: scale(1); box-shadow: 0 0 0 12px rgba(2, 132, 199, 0); }
        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(2, 132, 199, 0); }
      }
      .pnm-tooltip span { display: none !important; }
      .pnm-tooltip { display: none !important; }
      .ticker-wrapper {
        overflow-x: auto; white-space: nowrap; position: relative; cursor: grab; user-select: none; -webkit-user-select: none; scrollbar-width: none;
      }
      .ticker-wrapper::-webkit-scrollbar { display: none; }
      .ticker-wrapper:active { cursor: grabbing; }
      .ticker-content { display: inline-flex; gap: 8px; }
      .dots-loader { display: flex; gap: 12px; align-items: center; justify-content: center; }
      .dots-loader span {
        width: 16px; height: 16px; border-radius: 50%; background-color: rgba(255, 255, 255, 0.2); border: 2px solid #38bdf8; display: inline-block; animation: dot-pulse 1.4s infinite ease-in-out both;
      }
      .dots-loader span:nth-child(1) { animation-delay: -0.32s; }
      .dots-loader span:nth-child(2) { animation-delay: -0.16s; }
      @keyframes dot-pulse {
        0%, 80%, 100% { transform: scale(0.6); background-color: rgba(56, 189, 248, 0.2); }
        40% { transform: scale(1.2); background-color: #38bdf8; box-shadow: 0 0 12px #38bdf8; }
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
      stopAudio();
      stopCurrentAnimation();
    };
  }, [mounted]);

  useEffect(() => {
    if (!slug || !mounted) return;
    async function load() {
      setLoading(true);
      const { data: tourData, error: tourErr } = await supabase.from('tours').select('*').eq('slug', slug).single();
      const { data: roomRows, error: roomErr } = await supabase.from('rooms').select('*').eq('tour_slug', slug).order('order_index', { ascending: true });

      if (tourErr || !tourData) setError(t.tourNotFound);
      else setTour(tourData as Tour);

      if (roomErr || !roomRows || roomRows.length === 0) setError(t.noRooms);
      else setRooms(roomRows as Room[]);

      setLoading(false);
    }
    load();
  }, [slug, mounted, lang]);

  const changeRoomById = (id: string | number) => {
    sequenceActiveRef.current = false;
    isInterruptedRef.current = true;
    audioCurrentTimeRef.current = 0;
    stopCurrentAnimation();
    stopAudio();

    const foundIndex = rooms.findIndex(r => r.id == id);
    if (foundIndex !== -1) {
      setRoomLoading(true);
      setRoomIdx(foundIndex);
      setInfoBoxData(null);
    }
  };

  useEffect(() => {
    if (!tourStarted || rooms.length === 0 || !pannellumReady || !mounted) return;
    const currentRoom = rooms[roomIdx];
    if (!currentRoom?.panorama_url) return;

    setRoomLoading(true);
    sequenceActiveRef.current = false;
    audioCurrentTimeRef.current = 0;
    stopCurrentAnimation();
    stopAudio();

    sequenceActiveRef.current = true;
    isInterruptedRef.current = false;
    setInfoBoxData(null);

    if (viewerRef.current) {
      try { viewerRef.current.destroy(); } catch (e) {}
      viewerRef.current = null;
    }
    const panoramaContainer = document.getElementById('panorama');
    if (panoramaContainer) panoramaContainer.innerHTML = '';

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
            audioCurrentTimeRef.current = 0;
            if (viewerRef.current) viewerRef.current.setHfov(50);
            playAudioFileWithCompletion(wp.audio_url, wp.text, wp.title, index, 0);
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

    const startInfiniteGlide = () => {
      if (!sequenceActiveRef.current || isInterruptedRef.current) return;
      stopCurrentAnimation();
      setInfoBoxData({ title: t.guideCompleted, text: t.freeExplore });

      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => { setInfoBoxData(null); }, 8000);

      if (viewerRef.current) viewerRef.current.setHfov(70);

      let lastTime = performance.now();
      const degreesPerMs = 360 / 25000;

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

    v.on('load', async () => {
      setRoomLoading(false);
      if (!sequenceActiveRef.current || isInterruptedRef.current) return;

      const introTextRaw = currentRoom.establish?.text || `${t.welcomePrefix}${getLocalizedText(currentRoom.title, lang)}`;
      const introAudioUrl = currentRoom.establish?.audio_url;

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
            if (viewerRef.current) viewerRef.current.stopAutoRotate();
            resolve();
          }
        };
        animFrameRef.current = requestAnimationFrame(checkCompletion);
      });

      await Promise.all([
        rotatePromise,
        playAudioFileWithCompletion(introAudioUrl, introTextRaw, currentRoom.title, undefined, 0)
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

        await playAudioFileWithCompletion(item.wp.audio_url, item.wp.text, item.wp.title, item.i, 0);
        if (!sequenceActiveRef.current || isInterruptedRef.current) return;

        await new Promise(r => setTimeout(r, 1000));
        runInfoSequencePhase2(index + 1);
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
        setHotspotAudioUrl('');
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
        try { viewerRef.current.destroy(); } catch (e) {}
        viewerRef.current = null;
      }
      if (panoramaContainer) panoramaContainer.innerHTML = '';
    };
  }, [rooms, roomIdx, pannellumReady, adminMode, mounted, tourStarted, lang]);

  const handleStartEditWaypoint = (index: number) => {
    const currentRoom = rooms[roomIdx];
    const wp = currentRoom.waypoints?.[index];
    if (!wp) return;

    sequenceActiveRef.current = false;
    isInterruptedRef.current = true;
    audioCurrentTimeRef.current = 0;
    stopCurrentAnimation();
    stopAudio();

    if (viewerRef.current) {
      const currentYaw = viewerRef.current.getYaw();
      const targetYaw = getShortestTargetYaw(currentYaw, wp.yaw);
      viewerRef.current.lookAt(wp.pitch ?? 0, targetYaw, 50, 1000);
    }

    setPendingCoords({ pitch: wp.pitch, yaw: wp.yaw });
    setEditingIndex(index);
    setHotspotType(wp.type || 'info');
    setHotspotTitle(typeof wp.title === 'string' ? wp.title : JSON.stringify(wp.title || ''));
    setHotspotText(typeof wp.text === 'string' ? wp.text : JSON.stringify(wp.text || ''));
    setHotspotAudioUrl(wp.audio_url || '');
    setTargetRoomId(wp.targetRoomId || '');
  };

  const handleStartEditEstablish = () => {
    const currentRoom = rooms[roomIdx];
    const establish = currentRoom.establish;

    sequenceActiveRef.current = false;
    isInterruptedRef.current = true;
    audioCurrentTimeRef.current = 0;
    stopCurrentAnimation();
    stopAudio();

    if (viewerRef.current) {
      const currentYaw = viewerRef.current.getYaw();
      const targetYaw = getShortestTargetYaw(currentYaw, establish?.fromYaw ?? 0);
      viewerRef.current.lookAt(establish?.pitch ?? 0, targetYaw, 70, 1000);
    }

    setPendingCoords({ pitch: establish?.pitch ?? 0, yaw: establish?.fromYaw ?? 0 });
    setEditingIndex(null);
    setHotspotType('establish');
    setHotspotText(typeof establish?.text === 'string' ? establish.text : JSON.stringify(establish?.text || ''));
    setHotspotAudioUrl(establish?.audio_url || '');
    setFromYawVal(establish?.fromYaw ?? 0);
  };

  const handleDeleteWaypoint = async (index: number) => {
    if (!confirm('Da li ste sigurni da želite da obrišete ovu tačku?')) return;
    const currentRoom = rooms[roomIdx];
    const updatedWaypoints = [...(currentRoom.waypoints || [])];
    updatedWaypoints.splice(index, 1);

    const { error: updateErr } = await supabase.from('rooms').update({ waypoints: updatedWaypoints }).eq('id', currentRoom.id);
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
        audio_url: hotspotAudioUrl,
        fromYaw: finalYaw,
        pitch: finalPitch
      };

      const { error: updateErr } = await supabase.from('rooms').update({ establish: newEstablishData }).eq('id', currentRoom.id);
      if (!updateErr) {
        const updatedRooms = [...rooms];
        updatedRooms[roomIdx].establish = newEstablishData;
        setRooms(updatedRooms);
        alert('Uspešno sačuvano!');
      }
    } else {
      const newWaypoint: Waypoint = {
        pitch: finalPitch,
        yaw: finalYaw,
        title: hotspotTitle,
        text: hotspotText,
        audio_url: hotspotAudioUrl,
        type: hotspotType,
        targetRoomId: hotspotType === 'navigation' ? targetRoomId : undefined
      };

      let updatedWaypoints = [...(currentRoom.waypoints || [])];
      if (editingIndex !== null) {
        updatedWaypoints[editingIndex] = newWaypoint;
      } else {
        updatedWaypoints.push(newWaypoint);
      }

      const { error: updateErr } = await supabase.from('rooms').update({ waypoints: updatedWaypoints }).eq('id', currentRoom.id);
      if (!updateErr) {
        const updatedRooms = [...rooms];
        updatedRooms[roomIdx].waypoints = updatedWaypoints;
        setRooms(updatedRooms);
        alert('Tačka uspešno sačuvana!');
      }
    }

    setPendingCoords(null);
    setEditingIndex(null);
    setHotspotText('');
    setHotspotTitle('');
    setHotspotAudioUrl('');
    setTargetRoomId('');
    setFromYawVal(null);
    setHotspotType('navigation');
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tickerRef.current) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    isAutoScrollPausedRef.current = true;
    setStartX(e.pageX - tickerRef.current.offsetLeft);
    setScrollLeft(tickerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !tickerRef.current) return;
    e.preventDefault();
    const x = e.pageX - tickerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 5) hasDraggedRef.current = true;
    tickerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      pauseAutoScrollTemporarily();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!tickerRef.current) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    isAutoScrollPausedRef.current = true;
    setStartX(e.touches[0].pageX - tickerRef.current.offsetLeft);
    setScrollLeft(tickerRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !tickerRef.current) return;
    const x = e.touches[0].pageX - tickerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 5) hasDraggedRef.current = true;
    tickerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      pauseAutoScrollTemporarily();
    }
  };

  if (!mounted || loading || !pannellumReady) return <Centered>{t.loading}</Centered>;
  if (error) return <Centered>{error}</Centered>;

  if (!tourStarted) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', fontFamily: 'sans-serif', textAlign: 'center', padding: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          {(['sr', 'en', 'de'] as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: lang === l ? '2px solid #38bdf8' : '1px solid #3f3f46',
                background: lang === l ? '#0284c7' : '#27272a',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px'
              }}
            >
              {l === 'sr' ? '🇷🇸 SR' : l === 'en' ? '🇬🇧 EN' : '🇩🇪 DE'}
            </button>
          ))}
        </div>
        <h1 style={{ fontSize: '28px', margin: 0 }}>{getLocalizedText(tour?.title, lang) || '360 Virtuelna Tura'}</h1>
        <p style={{ color: '#aaa', maxWidth: '400px', fontSize: '14px', lineHeight: '1.5' }}>{t.welcome}</p>
        <button
          onClick={() => setTourStarted(true)}
          style={{ padding: '14px 28px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '30px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 20px rgba(2, 132, 199, 0.4)', transition: 'transform 0.2s' }}
        >
          {t.startTour}
        </button>
      </div>
    );
  }

  const cat = tour?.category && categoryQuestions[tour.category] ? tour.category : 'rent';
  const qList = categoryQuestions[cat][lang] || categoryQuestions[cat]['sr'];
  
  const faqList = [
    { q: qList[0], a: getLocalizedText(tour?.faq_1, lang) || t.notEntered },
    { q: qList[1], a: getLocalizedText(tour?.faq_2, lang) || t.notEntered },
    { q: qList[2], a: getLocalizedText(tour?.faq_3, lang) || t.notEntered },
    { q: qList[3], a: getLocalizedText(tour?.faq_4, lang) || t.notEntered },
    { q: qList[4], a: getLocalizedText(tour?.about_text, lang) || t.notEntered }
  ];

  return (
    <main
      ref={mainContainerRef}
      suppressHydrationWarning
      style={{ width: '100vw', height: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}
    >
      {roomLoading && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10, 10, 10, 0.92)', zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', backdropFilter: 'blur(6px)' }}>
          <div className="dots-loader"><span></span><span></span><span></span></div>
          <div style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: '500', letterSpacing: '0.5px', textAlign: 'center', padding: '0 20px', fontFamily: 'sans-serif' }}>
            {t.roomLoadingPrefix} <strong style={{ color: '#38bdf8' }}>{getLocalizedText(rooms[roomIdx]?.title, lang)}</strong> ✨
          </div>
        </div>
      )}

      <div suppressHydrationWarning style={{ padding: '6px 14px', background: '#121212', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, minHeight: '44px' }}>
        <h1 style={{ margin: 0, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{getLocalizedText(tour?.title, lang) || '360 Tura'}</h1>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '3px' }}>
            {(['sr', 'en', 'de'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  padding: '3px 6px',
                  borderRadius: '6px',
                  border: lang === l ? '1px solid #38bdf8' : '1px solid #3f3f46',
                  background: lang === l ? '#0284c7' : '#27272a',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '10px'
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {adminMode && (
            <button
              onClick={handleStartEditEstablish}
              style={{ padding: '4px 8px', borderRadius: '14px', border: '1px solid #eab308', background: '#854d0e', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '10px' }}
            >
              {t.intro}
            </button>
          )}

          <button
            onClick={toggleMute}
            style={{ padding: '4px', borderRadius: '50%', border: 'none', background: !isMuted ? '#22c55e' : '#ef4444', color: '#fff', cursor: 'pointer', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}
            title={!isMuted ? t.audioOff : t.audioOn}
          >
            {!isMuted ? '🔊' : '🔇'}
          </button>

          <button
            onClick={toggleFullscreen}
            style={{ padding: '4px 8px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.2)', background: '#27272a', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '10px' }}
            title={isFullscreen ? t.exitFullscreen : t.fullscreen}
          >
            {isFullscreen ? `⤫` : `⛶`}
          </button>
        </div>
      </div>

      <div
        ref={tickerRef}
        className="ticker-wrapper"
        onMouseEnter={() => (isAutoScrollPausedRef.current = true)}
        onMouseLeave={() => { if (!isDragging) isAutoScrollPausedRef.current = false; }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ padding: '8px 0', background: '#18181b', borderBottom: '1px solid #27272a', zIndex: 10 }}
      >
        <div className="ticker-content" style={{ paddingLeft: '8px', paddingRight: '8px' }}>
          {rooms.map((r, i) => {
            const isSelected = r.id === rooms[roomIdx]?.id;
            return (
              <button
                key={`${r.id}-${i}`}
                onClick={(e) => {
                  if (hasDraggedRef.current) return;
                  changeRoomById(r.id);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '14px',
                  border: isSelected ? '2px solid #38bdf8' : '1px solid #3f3f46',
                  background: isSelected ? 'linear-gradient(135deg, #0284c7, #0369a1)' : '#27272a',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: isSelected ? 'bold' : 'normal',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected ? '0 0 10px rgba(56, 189, 248, 0.6)' : 'none',
                  transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
              >
                🚪 {getLocalizedText(r.title, lang)} {isSelected && ' ✨'}
              </button>
            );
          })}
        </div>
      </div>

      {adminMode && (
        <div style={{ padding: '6px 14px', background: '#1e1e24', borderBottom: '1px solid #333', display: 'flex', gap: '8px', overflowX: 'auto', zIndex: 10 }}>
          <span style={{ fontSize: '11px', color: '#aaa', alignSelf: 'center', fontWeight: 'bold' }}>{t.points}</span>
          {(rooms[roomIdx]?.waypoints || []).map((wp, idx) => (
            <button
              key={idx}
              onClick={() => handleStartEditWaypoint(idx)}
              style={{ padding: '3px 8px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '4px', color: '#fff', fontSize: '10px', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              ✏️ #{idx + 1} ({getLocalizedText(wp.title, lang) || (wp.type === 'navigation' ? 'Prelaz' : 'Info')})
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, width: '100%', position: 'relative', overflow: 'hidden' }}>
        <div id="panorama" style={{ width: '100%', height: '100%' }} />

        {adminMode && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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

        {infoBoxData && (
          <div style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', backgroundColor: 'rgba(255, 255, 255, 0.98)', color: '#111111', padding: '14px 16px', borderRadius: '12px', boxShadow: '0 5px 25px rgba(0, 0, 0, 0.6)', zIndex: 50, border: '2px solid #0284c7', boxSizing: 'border-box' }}>
            <button onClick={() => { stopAudio(); setInfoBoxData(null); }} style={{ position: 'absolute', top: '10px', right: '12px', background: 'none', border: 'none', fontSize: '16px', color: '#666', cursor: 'pointer' }}>✕</button>
            {infoBoxData.title && (
              <h4 style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#000', fontFamily: 'sans-serif' }}>
                {infoBoxData.title}
              </h4>
            )}
            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.4', color: '#222', fontFamily: 'sans-serif', paddingRight: '20px' }}>
              {infoBoxData.text}
            </p>
            {adminMode && infoBoxData.index !== undefined && (
              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                <button onClick={() => { stopAudio(); handleStartEditWaypoint(infoBoxData.index!); }} style={{ padding: '4px 10px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>✏️ Izmeni</button>
                <button onClick={() => { stopAudio(); handleDeleteWaypoint(infoBoxData.index!); }} style={{ padding: '4px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>🗑️ Obriši</button>
              </div>
            )}
          </div>
        )}
      </div>

      {!infoBoxData && (
        <div style={{ padding: '8px 14px', background: '#121212', borderTop: '1px solid #282828', display: 'flex', justifyContent: 'center', gap: '6px', zIndex: 10 }}>
          <button onClick={() => { setActiveModal('faq'); setSelectedFaqIdx(null); }} style={btnStyle}>{t.faqBtn}</button>
          <button onClick={() => setActiveModal('plan')} style={btnStyle}>{t.planBtn}</button>
          <button onClick={() => setActiveModal('location')} style={btnStyle}>{t.locationBtn}</button>
          <button onClick={() => setActiveModal('about')} style={btnStyle}>{t.aboutBtn}</button>
        </div>
      )}

      {pendingCoords && adminMode && (
        <div style={{ position: 'fixed', bottom: '80px', right: '20px', background: 'rgba(24, 24, 27, 0.95)', padding: '20px', borderRadius: '16px', width: '360px', maxWidth: '90vw', border: '1px solid #3b82f6', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 10000, boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>{editingIndex !== null ? t.editPoint : t.addPoint}</h3>
          <p style={{ margin: 0, fontSize: '11px', color: '#eab308' }}>{t.aimInstruction}</p>
          <label style={{ fontSize: '11px', color: '#aaa' }}>{t.actionType}</label>
          <select value={hotspotType} onChange={(e) => setHotspotType(e.target.value as any)} style={{ padding: '8px', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '12px' }}>
            <option value="navigation">{t.navArrow}</option>
            <option value="info">{t.infoPoint}</option>
            <option value="establish">{t.introNarration}</option>
          </select>
          {hotspotType === 'info' && (
            <input type="text" value={hotspotTitle} onChange={(e) => setHotspotTitle(e.target.value)} placeholder={t.titlePlaceholder} style={{ padding: '8px', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '12px' }} />
          )}
          {hotspotType === 'navigation' && (
            <select value={targetRoomId} onChange={(e) => setTargetRoomId(e.target.value)} style={{ padding: '8px', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '12px' }}>
              <option value="">{t.targetRoom}</option>
              {rooms.map(r => r.id != rooms[roomIdx].id && <option key={r.id} value={r.id}>{getLocalizedText(r.title, lang)}</option>)}
            </select>
          )}
          <textarea rows={2} value={hotspotText} onChange={(e) => setHotspotText(e.target.value)} placeholder={t.descPlaceholder} style={{ padding: '8px', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '12px' }} />
          <input type="text" value={hotspotAudioUrl} onChange={(e) => setHotspotAudioUrl(e.target.value)} placeholder={t.audioUrlPlaceholder} style={{ padding: '8px', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '6px', color: '#38bdf8', fontSize: '12px' }} />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px', alignItems: 'center' }}>
            {editingIndex !== null && (
              <button type="button" onClick={() => { const idxToDelete = editingIndex; setPendingCoords(null); setEditingIndex(null); handleDeleteWaypoint(idxToDelete); }} style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', marginRight: 'auto', fontWeight: 'bold' }}>{t.delete}</button>
            )}
            <button onClick={() => { setPendingCoords(null); setEditingIndex(null); }} style={{ padding: '6px 12px', background: '#3f3f46', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>{t.cancel}</button>
            <button onClick={handleSave} style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>{t.save}</button>
          </div>
        </div>
      )}

      {activeModal !== 'none' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: '#1c1c1c', padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '500px', border: '1px solid #333' }}>
            {activeModal === 'faq' && (
              <div>
                {selectedFaqIdx === null ? (
                  <div>
                    <h3 style={{ margin: '0 0 12px 0', color: '#fff' }}>{t.faqTitle}</h3>
                    <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '16px' }}>{t.faqSub}</p>
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
                    <h3 style={{ margin: '0 0 12px 0', color: '#38bdf8', fontSize: '15px' }}>❓ {faqList[selectedFaqIdx].q}</h3>
                    <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #3f3f46' }}>
                      <p style={{ margin: 0, color: '#e5e5e5', fontSize: '14px', lineHeight: '1.6' }}>{faqList[selectedFaqIdx].a}</p>
                    </div>
                    <button onClick={() => setSelectedFaqIdx(null)} style={{ padding: '8px 14px', background: '#3f3f46', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', width: '100%', marginBottom: '6px' }}>{t.backToFaq}</button>
                  </div>
                )}
              </div>
            )}

            {activeModal === 'plan' && (
              <div>
                <h3 style={{ color: '#fff', margin: '0 0 12px 0' }}>{t.floorplanTitle}</h3>
                {tour?.floorplan_url ? <img src={tour.floorplan_url} style={{ width: '100%', borderRadius: '8px' }} /> : <p style={{ color: '#aaa' }}>{t.noFloorplan}</p>}
              </div>
            )}

            {activeModal === 'location' && (
              <div>
                <h3 style={{ color: '#fff', margin: '0 0 12px 0' }}>{t.locationTitle}</h3>
                {tour?.location_map_url ? (
                  <div style={{ width: '100%', height: '300px', borderRadius: '8px', overflow: 'hidden' }}>
                    <iframe
                      src={tour.location_map_url}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen={false}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                ) : (
                  <p style={{ color: '#aaa' }}>{t.noMap}</p>
                )}
              </div>
            )}

            {activeModal === 'about' && (
              <div>
                <h3 style={{ color: '#fff', margin: '0 0 12px 0' }}>{t.aboutTitle}</h3>
                <p style={{ color: '#ccc', lineHeight: '1.5' }}>{getLocalizedText(tour?.about_text, lang) || t.notEntered}</p>
              </div>
            )}

            <button
              onClick={() => { setActiveModal('none'); setSelectedFaqIdx(null); }}
              style={{ marginTop: '16px', width: '100%', padding: '10px', background: '#374151', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: 'white', background: '#0a0a0a', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', gap: '20px' }}>
      <div className="dots-loader"><span></span><span></span><span></span></div>
      <div style={{ color: '#aaa', fontSize: '14px', letterSpacing: '1px' }}>{children}</div>
    </div>
  );
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
