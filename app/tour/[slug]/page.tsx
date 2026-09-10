'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { Language, Waypoint, EstablishData, Room, Tour, ActiveModal } from './types';
import { translations, categoryQuestions } from './translations';
import { THEME, btnStyle } from './theme';
import { Logo } from './Logo';
import {
  normalizeYaw,
  getShortestTargetYaw,
  getLocalizedText,
  parseWaypoints,
  parseEstablish,
  buildI18nObject,
  translateRoomToLanguages,
  mergeAudioI18n,
  hasExactLangText,
  Centered
} from './utils';

export default function TourPage() {
  const [hasMounted, setHasMounted] = useState(false);
  const isMountedRef = useRef(true);
  const roomSessionRef = useRef(0);

  const [tourStarted, setTourStarted] = useState(false);
  const [lang, setLang] = useState<Language>('sr');
  // Podrazumevano SAMO srpski - inicijalni AI draft se pravi na srpskom,
  // a ostali jezici (en/de/ru) se mogu dodati kasnije u bilo kom trenutku
  // preko admin režima ("🌐 Jezici" dugme), ili odmah ovde u draft modalu
  // ako admin ipak želi sve odjednom.
  const [targetLanguages, setTargetLanguages] = useState<Language[]>(['sr']);
  // Podrazumevano PRAZAN niz = "ne generiši AI glas ni za jedan jezik" dok
  // korisnik eksplicitno ne izabere jezike u draft modalu.
  const [voiceLanguages, setVoiceLanguages] = useState<Language[]>([]);

  // AI Generation States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDraft, setAiDraft] = useState<{ title: string; narration: string; waypoints: Waypoint[] } | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [translationProgress, setTranslationProgress] = useState<string | null>(null);
  const [voiceProgress, setVoiceProgress] = useState<string | null>(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // Dodavanje NOVOG jezika u već postojeću (ranije kreiranu) sobu - odvojeno
  // od inicijalnog AI drafta, dostupno u admin režimu u bilo kom trenutku.
  const [showAddLanguageModal, setShowAddLanguageModal] = useState(false);
  const [addLanguageTargets, setAddLanguageTargets] = useState<Language[]>([]);

  // Upload panorame (admin) - fajl sa računara ide na Cloudflare R2, a CDN
  // link se upisuje u rooms.panorama_url_cf preko /api/upload-panorama.
  const [panoramaUploadProgress, setPanoramaUploadProgress] = useState<string | null>(null);
  const panoramaFileInputRef = useRef<HTMLInputElement>(null);

  // Kreiranje nove sobe (pre bilo kakvog sadržaja/panorame).
  const [creatingRoom, setCreatingRoom] = useState(false);

  const langRef = useRef<Language>('sr');

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
  const adminModeRef = useRef(false);

  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGyroActive, setIsGyroActive] = useState(false);
  const isGyroActiveRef = useRef(false);

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null);
  const [isRoomTourFullyCompleted, setIsRoomTourFullyCompleted] = useState(false);
  const [isInfoboxManuallyClosed, setIsInfoboxManuallyClosed] = useState(false);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  // VAŽNO: lastAudioUrlRef sada čuva SIROV audio_url_i18n podatak (objekat ili
  // string), NE već-razrešeni URL za jedan jezik - da bismo mogli ponovo da
  // ga lokalizujemo kad se jezik promeni usred narracije.
  const lastAudioUrlRef = useRef<unknown>(undefined);
  const lastAudioTextRef = useRef<unknown | undefined>(undefined);
  const lastAudioTitleRef = useRef<unknown | undefined>(undefined);
  const lastAudioIndexRef = useRef<number | undefined>(undefined);
  const audioCurrentTimeRef = useRef<number>(0);

  // Čuva "resolve" funkciju TRENUTNO aktivnog Promise-a iz
  // playAudioFileWithCompletion, da bismo mogli da završimo TAJ ISTI Promise
  // čak i kad usred narracije ponovo učitamo audio (npr. zbog promene jezika
  // ili unmute-a), umesto da pravimo potpuno nov, paralelan Promise koji bi
  // ostavio prvobitni "obešen" (nikad rešen), čime bi cela sekvenca ture
  // trajno zastala.
  const activeResolveRef = useRef<(() => void) | null>(null);
  const activePlaybackRawRef = useRef<{
    audioUrlI18n: unknown;
    textFallback: unknown;
    title: unknown;
    index?: number;
  } | null>(null);

  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const guideCompleteTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [infoBoxData, setInfoBoxData] = useState<{ titleRaw?: unknown; textRaw: unknown; index?: number; audio_url?: unknown } | null>(null);

  const [pendingCoords, setPendingCoords] = useState<{ yaw: number; pitch: number } | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const editingIndexRef = useRef<number | null>(null);
  const [hotspotType, setHotspotType] = useState<'navigation' | 'info' | 'establish'>('navigation');
  const [targetRoomId, setTargetRoomId] = useState<string | number>('');

  const [hotspotText, setHotspotText] = useState<string>('');
  const [hotspotTitle, setHotspotTitle] = useState<string>('');
  const [hotspotAudioUrl, setHotspotAudioUrl] = useState<string>('');

  const viewerRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const sequenceActiveRef = useRef<boolean>(false);
  const isInterruptedRef = useRef<boolean>(false);

  const tickerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const autoScrollPausedRef = useRef(false);

  const stopGyroscope = useCallback(() => {
    if (viewerRef.current && typeof viewerRef.current.stopOrientation === 'function') {
      viewerRef.current.stopOrientation();
    }
    setIsGyroActive(false);
    isGyroActiveRef.current = false;
  }, []);

  const startGyroscope = useCallback(async () => {
    if (!viewerRef.current) return;

    const enableOrientation = () => {
      if (typeof viewerRef.current.startOrientation === 'function') {
        viewerRef.current.startOrientation();
        setIsGyroActive(true);
        isGyroActiveRef.current = true;
      }
    };

    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          enableOrientation();
        } else {
          console.warn('Dozvola za giroskop nije odobrena.');
        }
      } catch (err) {
        console.error('Greška pri traženju dozvole za giroskop:', err);
      }
    } else {
      enableOrientation();
    }
  }, []);

  const toggleGyroscope = useCallback(() => {
    if (isGyroActive) {
      stopGyroscope();
    } else {
      startGyroscope();
    }
  }, [isGyroActive, startGyroscope, stopGyroscope]);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        await startGyroscope();
      } catch (err) {
        console.error('Greška pri ulasku u Fullscreen:', err);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    }
  }, [startGyroscope]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFS = Boolean(document.fullscreenElement);
      setIsFullscreen(isFS);

      if (!isFS) {
        stopGyroscope();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [stopGyroscope]);

  const toggleTargetLanguage = (l: Language) => {
    setTargetLanguages((prev) => {
      const next = prev.includes(l) ? prev.filter((langItem) => langItem !== l) : [...prev, l];
      // Ako se jezik isključi iz prevoda, ukloni ga i iz izabranih jezika za glas
      // (nema smisla generisati glas za jezik koji se ne prevodi)
      if (!next.includes(l)) {
        setVoiceLanguages((prevVoice) => prevVoice.filter((v) => v !== l));
      }
      return next;
    });
  };

  const toggleVoiceLanguage = (l: Language) => {
    setVoiceLanguages((prev) =>
      prev.includes(l) ? prev.filter((langItem) => langItem !== l) : [...prev, l]
    );
  };

  const toggleAddLanguageTarget = (l: Language) => {
    setAddLanguageTargets((prev) =>
      prev.includes(l) ? prev.filter((langItem) => langItem !== l) : [...prev, l]
    );
  };

  const handleStartEditWaypoint = useCallback((index: number) => {
    const currentRoom = rooms[roomIdx];
    if (!currentRoom) return;
    const waypointsList = parseWaypoints(currentRoom.waypoints_i18n);
    const targetWp = waypointsList[index];
    if (!targetWp) return;

    setEditingIndex(index);
    editingIndexRef.current = index;
    setPendingCoords({ pitch: targetWp.pitch || 0, yaw: targetWp.yaw || 0 });

    if (viewerRef.current) {
      viewerRef.current.lookAt(targetWp.pitch || 0, targetWp.yaw || 0, 70, 1000);
    }

    const isNav = targetWp.type === 'navigation' || Boolean(targetWp.targetRoomId);
    setHotspotType(isNav ? 'navigation' : 'info');

    setHotspotText(getLocalizedText(targetWp.text_i18n, langRef.current));
    setHotspotTitle(getLocalizedText(targetWp.title_i18n, langRef.current));
    setHotspotAudioUrl(getLocalizedText(targetWp.audio_url_i18n ?? targetWp.audio_url, langRef.current));
    setTargetRoomId(targetWp.targetRoomId || '');
  }, [rooms, roomIdx]);

  const stopCurrentAnimation = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    // Zaustavi i Pannellum-ovo ugrađeno "idle" auto-okretanje (pokrenuto
    // nakon što se sve tačke sobe predstave), da ne bi nastavilo da se
    // vrti preko npr. novog audio narativa ili nove sobe.
    if (viewerRef.current && typeof viewerRef.current.stopAutoRotate === 'function') {
      try { viewerRef.current.stopAutoRotate(); } catch {}
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (activeAudioRef.current) {
      audioCurrentTimeRef.current = activeAudioRef.current.currentTime;
      activeAudioRef.current.pause();
      activeAudioRef.current.onended = null;
      activeAudioRef.current.onerror = null;
      activeAudioRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (guideCompleteTimerRef.current) {
      clearTimeout(guideCompleteTimerRef.current);
      guideCompleteTimerRef.current = null;
    }
  }, []);

  // Učitava i pušta audio za TRENUTNI jezik (langRef.current), koristeći
  // sirove i18n podatke sačuvane u activePlaybackRawRef. NE pravi nov
  // Promise - završava (resolve) ISTI onaj Promise koji je napravljen kad je
  // narracija prvi put pokrenuta (activeResolveRef). Ovo omogućava da se
  // audio "presvuče" na drugi jezik usred narracije, ili da se nastavi posle
  // unmute-a, a da sekvenca ture (koja čeka/await-uje taj Promise) nikad ne
  // ostane zaglavljena.
  const loadAndPlayLocalizedAudio = useCallback((startAt: number = 0) => {
    const raw = activePlaybackRawRef.current;
    if (!raw || !isMountedRef.current) return;

    // Zaustavi trenutni <audio> element/tajmer, ali NE rešavaj Promise ovde
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.onended = null;
      activeAudioRef.current.onerror = null;
      activeAudioRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    const resolvedAudioUrl = getLocalizedText(raw.audioUrlI18n, langRef.current);
    const resolvedText = getLocalizedText(raw.textFallback, langRef.current);

    const finish = () => {
      activeAudioRef.current = null;
      audioCurrentTimeRef.current = 0;
      const resolveFn = activeResolveRef.current;
      activeResolveRef.current = null;
      activePlaybackRawRef.current = null;
      if (isMountedRef.current && resolveFn) resolveFn();
    };

    if (isMutedRef.current || !resolvedAudioUrl) {
      const readTime = Math.max(3000, resolvedText.length * 50);
      hideTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) finish();
      }, readTime);
      return;
    }

    const audio = new Audio(resolvedAudioUrl);
    activeAudioRef.current = audio;

    audio.onloadedmetadata = () => {
      if (!isMountedRef.current) return;
      if (startAt > 0 && startAt < audio.duration) {
        audio.currentTime = startAt;
      }
    };

    audio.onended = finish;
    audio.onerror = finish;

    audio.play().catch(finish);
  }, []);

  const playAudioFileWithCompletion = useCallback((
    audioUrlI18n?: unknown,
    textFallback?: unknown,
    title?: unknown,
    index?: number,
    startAt: number = 0
  ): Promise<void> => {
    return new Promise((resolve) => {
      stopAudio();

      if (!isMountedRef.current) return resolve();

      activeResolveRef.current = resolve;
      activePlaybackRawRef.current = { audioUrlI18n, textFallback, title, index };

      lastAudioUrlRef.current = audioUrlI18n;
      lastAudioTextRef.current = textFallback;
      lastAudioTitleRef.current = title;
      lastAudioIndexRef.current = index;

      setInfoBoxData({ titleRaw: title, textRaw: textFallback, index, audio_url: audioUrlI18n });

      loadAndPlayLocalizedAudio(startAt);
    });
  }, [stopAudio, loadAndPlayLocalizedAudio]);

  const changeRoomById = useCallback((id: string | number) => {
    roomSessionRef.current += 1;
    sequenceActiveRef.current = false;
    isInterruptedRef.current = true;
    audioCurrentTimeRef.current = 0;
    setIsRoomTourFullyCompleted(false);
    setIsInfoboxManuallyClosed(false);
    stopCurrentAnimation();
    stopAudio();

    const foundIndex = rooms.findIndex(r => r.id == id);
    if (foundIndex !== -1) {
      setRoomLoading(true);
      setRoomIdx(foundIndex);
      setInfoBoxData(null);
    }
  }, [rooms, stopAudio, stopCurrentAnimation]);

  // Iscrtava hotspot-ove na vieweru koristeći TAČNO prosleđen niz tačaka.
  // Namerno NE čita rooms[roomIdx] iz state-a, jer bi to moglo biti zastarelo
  // (stale) odmah posle setRooms(...), pošto React state update nije sinhron.
  const refreshViewerHotspots = useCallback((waypointsList: Waypoint[], l: Language) => {
    if (!viewerRef.current) return;

    // Ukloni postojeće hotspot-ove sa viewer-a
    const existingHotspots = viewerRef.current.getConfig()?.hotSpots || [];
    existingHotspots.forEach((hs: any) => {
      try { viewerRef.current.removeHotSpot(hs.id); } catch {}
    });

    // Ponovo ih dodaj sa prosleđenim (svežim) podacima
    waypointsList.forEach((wp, index) => {
      const isNav = wp.type === 'navigation' || Boolean(wp.targetRoomId);

      let tooltipText = getLocalizedText(wp.title_i18n, l);
      if (!tooltipText && !isNav) {
        tooltipText = getLocalizedText(wp.text_i18n, l);
        if (tooltipText.length > 40) tooltipText = tooltipText.substring(0, 40) + '...';
      }
      if (isNav && !tooltipText && wp.targetRoomId) {
        const targetRoomObj = rooms.find(r => r.id == wp.targetRoomId);
        if (targetRoomObj) tooltipText = getLocalizedText(targetRoomObj.title_i18n, l);
      }

      viewerRef.current.addHotSpot({
        id: `hotspot-${index}`,
        pitch: wp.pitch || 0,
        yaw: wp.yaw || 0,
        createTooltipFunc: (hotSpotDiv: HTMLDivElement) => {
          hotSpotDiv.classList.add(isNav ? 'custom-nav-hotspot' : 'custom-info-hotspot');
          // Pannellum dodaje svoj default sprite (background-image, npr. crni
          // "+") na ovaj div preko svojih pnlm-* klasa - backgroundColor ga
          // NE prekriva jer je background-image odvojen sloj iznad boje, pa
          // ga eksplicitno gasimo da se ne vidi ispod/oko našeg pill dizajna.
          hotSpotDiv.style.backgroundImage = 'none';
          hotSpotDiv.style.backgroundColor = THEME.surface;
          hotSpotDiv.style.border = '1.5px solid ' + THEME.border;
          hotSpotDiv.style.borderRadius = isNav ? '50px' : '50%';
          hotSpotDiv.style.color = THEME.textPrimary;
          hotSpotDiv.style.display = 'flex';
          hotSpotDiv.style.alignItems = 'center';
          hotSpotDiv.style.justifyContent = 'center';
          hotSpotDiv.style.cursor = 'pointer';
          hotSpotDiv.style.padding = isNav ? '3px 6px' : '0.5px';
          hotSpotDiv.style.width = isNav ? 'auto' : '22px';
          hotSpotDiv.style.height = isNav ? 'auto' : '22px';
          hotSpotDiv.style.fontWeight = 'bold';
          hotSpotDiv.style.fontSize = isNav ? '10px' : '15px';
          hotSpotDiv.style.boxShadow = THEME.shadowLg;
          hotSpotDiv.innerHTML = isNav ? `${tooltipText}` : 'ℹ';
        },
        text: tooltipText,
        clickHandlerFunc: () => {
          if (adminModeRef.current) {
            handleStartEditWaypoint(index);
          } else if (isNav && wp.targetRoomId) {
            changeRoomById(wp.targetRoomId);
          } else if (!isNav) {
            isInterruptedRef.current = true;
            stopCurrentAnimation();
            audioCurrentTimeRef.current = 0;
            if (viewerRef.current) viewerRef.current.setHfov(48);
            playAudioFileWithCompletion(wp.audio_url_i18n ?? wp.audio_url, wp.text_i18n, wp.title_i18n, index, 0);
          }
        }
      });
    });
  }, [rooms, handleStartEditWaypoint, changeRoomById, playAudioFileWithCompletion, stopCurrentAnimation]);

  const changeLanguage = useCallback((l: Language) => {
    setLang(l);
    langRef.current = l;

    const currentRoom = rooms[roomIdx];
    if (currentRoom) {
      const waypointsList = parseWaypoints(currentRoom.waypoints_i18n);
      refreshViewerHotspots(waypointsList, l);
    }

    // Ako je trenutno u toku neka narracija (audio ili "reading" fallback),
    // odmah je prebaci na NOVI jezik - od početka (dužine prevoda se
    // razlikuju, pa nastavljanje od iste sekunde ne bi imalo smisla).
    // Koristi loadAndPlayLocalizedAudio da NE napravi nov Promise, već
    // završi isti onaj koji sekvenca ture već čeka.
    if (activePlaybackRawRef.current) {
      loadAndPlayLocalizedAudio(0);
    }
  }, [rooms, roomIdx, refreshViewerHotspots, loadAndPlayLocalizedAudio]);

  // ŽIVI PREVIEW POMERANJA: čim se pendingCoords promeni dok se edituje POSTOJEĆA
  // tačka (editingIndex !== null), odmah vizuelno pomeri marker na novu poziciju
  // na vieweru, bez čekanja da se klikne "Sačuvaj". Ovo NE upisuje ništa u bazu -
  // samo daje trenutni vizuelni fidbek dok pozicioniraš tačku.
  useEffect(() => {
    if (!pendingCoords || editingIndex === null) return;
    const currentRoom = rooms[roomIdx];
    if (!currentRoom) return;

    const waypointsList = parseWaypoints(currentRoom.waypoints_i18n);
    if (!waypointsList[editingIndex]) return;

    const previewList = waypointsList.map((wp, idx) =>
      idx === editingIndex ? { ...wp, yaw: pendingCoords.yaw, pitch: pendingCoords.pitch } : wp
    );

    refreshViewerHotspots(previewList, langRef.current);
  }, [pendingCoords, editingIndex, rooms, roomIdx, refreshViewerHotspots]);

  // CANCEL & DELETE & SAVE HOTSPOTS (ADMIN REŽIM)
  const handleCancelEdit = () => {
    setPendingCoords(null);
    setEditingIndex(null);
    editingIndexRef.current = null;
    setHotspotText('');
    setHotspotTitle('');
    setHotspotAudioUrl('');
    setTargetRoomId('');
  };

  const handleSaveHotspot = async () => {
  const currentRoom = rooms[roomIdx];
  if (!currentRoom || !pendingCoords) return;

  let updatedWaypoints = parseWaypoints(currentRoom.waypoints_i18n);
  let updatedEstablish = parseEstablish(currentRoom.establish_i18n);

  if (hotspotType === 'establish') {
    updatedEstablish = {
      ...updatedEstablish,
      fromYaw: pendingCoords.yaw,
      pitch: pendingCoords.pitch,
      audio_url_i18n: mergeAudioI18n(
        hotspotAudioUrl,
        updatedEstablish.audio_url_i18n ?? updatedEstablish.audio_url,
        langRef.current
      ),
      text_i18n: buildI18nObject(hotspotText, updatedEstablish.text_i18n, langRef.current)
    };
  } else {
    const existingWp = editingIndex !== null ? updatedWaypoints[editingIndex] : undefined;
    
    // VAŽNO: Dodat ...existingWp da se ne izgube prevođeni jezici!
    const newWaypoint: Waypoint = {
      ...existingWp, 
      yaw: pendingCoords.yaw,
      pitch: pendingCoords.pitch,
      type: hotspotType,
      targetRoomId: hotspotType === 'navigation' ? targetRoomId : undefined,
      audio_url_i18n: mergeAudioI18n(
        hotspotAudioUrl,
        existingWp?.audio_url_i18n ?? existingWp?.audio_url,
        langRef.current
      ),
      title_i18n: buildI18nObject(hotspotTitle, existingWp?.title_i18n, langRef.current),
      text_i18n: buildI18nObject(hotspotText, existingWp?.text_i18n, langRef.current)
    };

    if (editingIndex !== null) {
      updatedWaypoints[editingIndex] = newWaypoint;
    } else {
      updatedWaypoints.push(newWaypoint);
    }
  }

  try {
    const { error: dbErr } = await supabase
      .from('rooms')
      .update({
        waypoints_i18n: updatedWaypoints,
        establish_i18n: updatedEstablish
      })
      .eq('id', currentRoom.id as any);

    if (dbErr) throw dbErr;

    // Ažuriramo React state
    const newRooms = rooms.map((r, i) => i === roomIdx ? {
      ...r,
      waypoints_i18n: updatedWaypoints,
      establish_i18n: updatedEstablish
    } : r);
    
    setRooms(newRooms);

    handleCancelEdit();

    // Ključno: Odmah osvežavamo prikaz tačaka u Pannellum-u koristeći SVEŽ niz
    // (updatedWaypoints), a ne rooms state koji React još nije stigao da ažurira.
    refreshViewerHotspots(updatedWaypoints, langRef.current);

  } catch (err: any) {
    alert('Greška pri čuvanju tačke: ' + err.message);
  }
};

  const handleDeleteHotspot = async () => {
    if (editingIndex === null) return;
    const currentRoom = rooms[roomIdx];
    if (!currentRoom) return;

    let updatedWaypoints = parseWaypoints(currentRoom.waypoints_i18n);
    updatedWaypoints.splice(editingIndex, 1);

    try {
      const { error: dbErr } = await supabase
        .from('rooms')
        .update({ waypoints_i18n: updatedWaypoints })
        .eq('id', currentRoom.id as any);

      if (dbErr) throw dbErr;

      setRooms(prev => prev.map((r, i) => i === roomIdx ? {
        ...r,
        waypoints_i18n: updatedWaypoints
      } : r));

      handleCancelEdit();
      refreshViewerHotspots(updatedWaypoints, langRef.current);
    } catch (err: any) {
      alert('Greška pri brisanju tačke: ' + err.message);
    }
  };

  // Kreira novu (praznu) sobu za trenutnu turu - obavezan PRVI korak pre
  // nego što admin može da uploaduje panoramu, pokrene AI popunu ili doda
  // jezike, jer sve to radi NAD postojećom sobom (rooms[roomIdx]).
  const handleAddRoom = async () => {
    if (!slug) return;

    setCreatingRoom(true);
    try {
      const nextOrderIndex = rooms.length > 0 ? Math.max(...rooms.map((r) => r.order_index ?? 0)) + 1 : 1;

      const { data, error: insertErr } = await supabase
        .from('rooms')
        .insert({ tour_slug: slug, title: `Soba ${nextOrderIndex}`, order_index: nextOrderIndex })
        .select()
        .single();

      if (insertErr || !data) {
        throw new Error(insertErr?.message || 'Nepoznata greška pri kreiranju sobe.');
      }

      const newRoom = data as unknown as Room;
      setRooms((prev) => [...prev, newRoom]);
      setRoomIdx(rooms.length);
      setError('');
      setTourStarted(true);
    } catch (err: any) {
      console.error('[Kreiranje sobe] Greška:', err);
      alert('Greška pri kreiranju sobe: ' + (err.message || 'Nepoznata greška'));
    } finally {
      setCreatingRoom(false);
    }
  };

  // Admin klikne na tlocrt (Skica modal) da postavi/pomeri oznaku TRENUTNE
  // sobe (rooms[roomIdx]) na tu poziciju - procenat širine/visine slike, ne
  // pikseli, da oznaka ostane tačna bez obzira na veličinu ekrana.
  const handleSetFloorplanMarker = async (e: React.MouseEvent<HTMLImageElement>) => {
    const currentRoom = rooms[roomIdx];
    if (!currentRoom) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    const { error: updateErr } = await supabase
      .from('rooms')
      // floorplan_x/floorplan_y nisu (još) u generisanim Supabase tipovima
      // (types/supabase.ts) - as any dok se ne pokrene migracija i types ne
      // regenerišu.
      .update({ floorplan_x: xPct, floorplan_y: yPct } as any)
      .eq('id', currentRoom.id as any);

    if (updateErr) {
      alert('Greška pri čuvanju pozicije na tlocrtu: ' + updateErr.message);
      return;
    }

    setRooms((prev) =>
      prev.map((r, idx) => (idx === roomIdx ? { ...r, floorplan_x: xPct, floorplan_y: yPct } : r))
    );
  };

  // KORAK 1: Generisanje SR drafta
  const handleAutoPopulateRoom = async () => {
    const currentRoom = rooms[roomIdx];
    const currentPanoramaUrl = currentRoom?.panorama_url_cf || currentRoom?.panorama_url;
    if (!currentRoom || !currentPanoramaUrl) {
      alert('Nema dostupne panorame za ovu sobu.');
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/auto-populate-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: currentRoom.id,
          panoramaUrl: currentPanoramaUrl,
          action: 'generate_draft'
        })
      });

      const result = await res.json();
      if (result.success && result.draft) {
        setAiDraft(result.draft);
        setShowDraftModal(true);
      } else {
        alert('Greška pri obradi: ' + (result.error || 'Nepoznata greška'));
      }
    } catch (err) {
      console.error('AI Draft Error:', err);
      alert('Došlo je do greške prilikom generisanja SR drafta.');
    } finally {
      setAiLoading(false);
    }
  };

  // Upload panorame sa računara za trenutnu sobu: šalje fajl na
  // /api/upload-panorama, koji ga smešta na Cloudflare R2 i upisuje novi
  // CDN link u rooms.panorama_url_cf. Zamenjuje postojeću panoramu sobe.
  const handlePanoramaFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const currentRoom = rooms[roomIdx];
    if (!currentRoom) return;

    if (!file.type.startsWith('image/')) {
      alert('Molimo izaberite fajl slike (JPG, PNG ili WEBP).');
      return;
    }

    if (currentRoom.panorama_url_cf && !confirm('Ova soba već ima panoramu. Zameniti je novom slikom?')) {
      return;
    }

    setPanoramaUploadProgress('Otpremanje panorame na Cloudflare...');

    try {
      const formData = new FormData();
      formData.append('roomId', String(currentRoom.id));
      formData.append('file', file);

      const res = await fetch('/api/upload-panorama', { method: 'POST', body: formData });
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Nepoznata greška pri upload-u.');
      }

      setRooms((prevRooms) =>
        prevRooms.map((r, idx) => (idx === roomIdx ? { ...r, panorama_url_cf: result.r2Url } : r))
      );
    } catch (err: any) {
      console.error('[Upload panorame] Greška:', err);
      alert('Greška pri upload-u panorame: ' + (err.message || 'Nepoznata greška'));
    } finally {
      setPanoramaUploadProgress(null);
    }
  };

  // Naknadno/dodatno generisanje AI glasa za VEĆ POSTOJEĆI sadržaj sobe
  // (bez pokretanja celog AI draft/prevod toka). Koristi trenutno sačuvan
  // tekst (establish_i18n.text_i18n i waypoints_i18n[].text_i18n) kakav god
  // da je - ručno unet ili prethodno AI generisan/preveden.
  const handleGenerateVoiceForRoom = async () => {
    const currentRoom = rooms[roomIdx];
    if (!currentRoom) return;

    if (voiceLanguages.length === 0) {
      alert('Izaberite bar jedan jezik za generisanje glasa.');
      return;
    }

    const establishData = parseEstablish(currentRoom.establish_i18n);
    const waypointsList = parseWaypoints(currentRoom.waypoints_i18n);

    // Provera PRE poziva ka TTS-u: da li BAR JEDAN izabrani jezik ima
    // stvaran tekst za izgovaranje (bez SR fallback-a, jer backend ne radi
    // fallback - prazan 'en' ostaje prazan, ne uzima se SR tekst).
    const hasAnyText = voiceLanguages.some(
      (l) =>
        hasExactLangText(establishData.text_i18n, l) ||
        waypointsList.some((wp) => hasExactLangText(wp.text_i18n, l))
    );

    if (!hasAnyText) {
      alert(
        'Nijedan izabrani jezik (' +
          voiceLanguages.map((l) => l.toUpperCase()).join(', ') +
          ') nema uneti/preveden tekst - ni uvodnu naraciju ni info-tačke. ' +
          'Prvo unesi tekst ili prevedi sobu na taj jezik, pa tek onda generiši glas.'
      );
      return;
    }

    setShowVoiceModal(false);
    setVoiceProgress('Generisanje AI glasovne naracije...');

    try {
      const res = await fetch('/api/ai/auto-populate-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: currentRoom.id,
          action: 'generate_voice',
          voiceLanguages,
          content: {
            establishText: establishData.text_i18n,
            waypoints: waypointsList.map((wp, idx) => ({ index: idx, text: wp.text_i18n }))
          }
        })
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Nepoznata greška pri generisanju glasa.');
      }

      const establishCount = Object.keys(result.audio?.establish || {}).length;
      const waypointCount = (result.audio?.waypoints || []).reduce(
        (acc: number, w: any) => acc + Object.keys(w.audio_url_i18n || {}).length,
        0
      );
      const totalGenerated = establishCount + waypointCount;

      const errorLines = [
        ...Object.entries(result.errors?.establish || {}).map(([l, e]) => `Uvod (${String(l).toUpperCase()}): ${e}`),
        ...Object.entries(result.errors?.waypoints || {}).map(([k, e]) => `Tačka ${k}: ${e}`)
      ];
      const skippedCount =
        (result.skipped?.establish?.length || 0) + (result.skipped?.waypoints?.length || 0);

      if (totalGenerated === 0) {
        // Ništa nije generisano - NE piši u bazu, jasno obavesti šta se desilo
        alert(
          'Glas NIJE generisan ni za jedan segment.\n' +
            (errorLines.length > 0
              ? 'Greške:\n' + errorLines.join('\n')
              : 'Razlog: tekst za izabrane jezike je prazan (' + skippedCount + ' segmenata preskočeno).')
        );
        return;
      }

      const existingEstablishAudio =
        typeof establishData.audio_url_i18n === 'object' ? establishData.audio_url_i18n : {};
      const updatedEstablish: EstablishData = {
        ...establishData,
        audio_url_i18n: { ...existingEstablishAudio, ...result.audio?.establish }
      };

      let updatedWaypoints = waypointsList;
      if (Array.isArray(result.audio?.waypoints)) {
        updatedWaypoints = waypointsList.map((wp, idx) => {
          const wpAudio = result.audio.waypoints.find((a: any) => a.index === idx);
          if (!wpAudio) return wp;
          const existingWpAudio = typeof wp.audio_url_i18n === 'object' ? wp.audio_url_i18n : {};
          return { ...wp, audio_url_i18n: { ...existingWpAudio, ...wpAudio.audio_url_i18n } };
        });
      }

      const { error: dbErr } = await supabase
        .from('rooms')
        .update({
          establish_i18n: updatedEstablish,
          waypoints_i18n: updatedWaypoints
        })
        .eq('id', currentRoom.id as any);

      if (dbErr) throw dbErr;

      setRooms((prev) =>
        prev.map((r, idx) =>
          idx === roomIdx ? { ...r, establish_i18n: updatedEstablish, waypoints_i18n: updatedWaypoints } : r
        )
      );

      refreshViewerHotspots(updatedWaypoints, langRef.current);

      alert(
        `Generisano ${totalGenerated} audio segmenata i sačuvano.` +
          (errorLines.length > 0 ? '\n\nDeo segmenata NIJE uspeo:\n' + errorLines.join('\n') : '')
      );
    } catch (err: any) {
      console.error('[TTS] Greška pri generisanju glasa za sobu:', err);
      alert('Greška pri generisanju glasa: ' + (err.message || 'Nepoznata greška'));
    } finally {
      setVoiceProgress(null);
    }
  };

  

  // KORAK 2 & 3: Potvrda SR drafta, sekvencijalno prevođenje i upis u bazu
  const handleConfirmDraftAndProcess = async () => {
    if (!aiDraft || !rooms[roomIdx]) return;
    
    if (targetLanguages.length === 0) {
      alert('Molimo izaberite bar jedan jezik za prevođenje i prikaz.');
      return;
    }

    setShowDraftModal(false);

    const currentRoom = rooms[roomIdx];
    const otherLangs = targetLanguages.filter((l) => l !== 'sr');

    let currentTitleI18n: Record<string, string> = buildI18nObject(aiDraft.title, currentRoom.title_i18n, 'sr');
    let currentEstablishI18n: EstablishData = {
      ...parseEstablish(currentRoom.establish_i18n),
      text_i18n: buildI18nObject(aiDraft.narration, parseEstablish(currentRoom.establish_i18n).text_i18n, 'sr')
    };

    let currentWaypoints: Waypoint[] = aiDraft.waypoints.map((wp) => ({
      ...wp,
      title_i18n: buildI18nObject(getLocalizedText(wp.title_i18n, 'sr'), wp.title_i18n, 'sr'),
      text_i18n: buildI18nObject(getLocalizedText(wp.text_i18n, 'sr'), wp.text_i18n, 'sr')
    }));

    try {
      if (otherLangs.length > 0) {
        setTranslationProgress(`Prevođenje na jezike: ${otherLangs.map((l) => l.toUpperCase()).join(', ')}...`);

        const translated = await translateRoomToLanguages(
          currentRoom.id,
          aiDraft.title,
          aiDraft.narration,
          currentTitleI18n,
          typeof currentEstablishI18n.text_i18n === 'object' ? (currentEstablishI18n.text_i18n as Record<string, string>) : {},
          currentWaypoints,
          otherLangs
        );

        currentTitleI18n = translated.titleI18n;
        currentEstablishI18n.text_i18n = translated.establishTextI18n;
        currentWaypoints = translated.waypoints;
      }

      // Generisanje AI glasovne naracije (opciono - samo ako je korisnik
      // izabrao bar jedan jezik u draft modalu). Poziva se POSLE prevoda
      // teksta, jer nam trebaju finalni, prevedeni tekstovi za sve jezike.
      let voiceSummaryMessage = '';

      if (voiceLanguages.length > 0) {
        setVoiceProgress('Generisanje AI glasovne naracije...');

        try {
          const voiceRes = await fetch('/api/ai/auto-populate-room', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomId: currentRoom.id,
              action: 'generate_voice',
              voiceLanguages,
              content: {
                establishText: currentEstablishI18n.text_i18n,
                waypoints: currentWaypoints.map((wp, idx) => ({ index: idx, text: wp.text_i18n }))
              }
            })
          });

          const voiceResult = await voiceRes.json();

          if (voiceResult.success && voiceResult.audio) {
            const existingEstablishAudio =
              typeof currentEstablishI18n.audio_url_i18n === 'object' ? currentEstablishI18n.audio_url_i18n : {};
            currentEstablishI18n.audio_url_i18n = {
              ...existingEstablishAudio,
              ...voiceResult.audio.establish
            };

            if (Array.isArray(voiceResult.audio.waypoints)) {
              currentWaypoints = currentWaypoints.map((wp, idx) => {
                const wpAudio = voiceResult.audio.waypoints.find((a: any) => a.index === idx);
                if (!wpAudio) return wp;
                const existingWpAudio = typeof wp.audio_url_i18n === 'object' ? wp.audio_url_i18n : {};
                return {
                  ...wp,
                  audio_url_i18n: { ...existingWpAudio, ...wpAudio.audio_url_i18n }
                };
              });
            }

            const establishCount = Object.keys(voiceResult.audio.establish || {}).length;
            const waypointCount = (voiceResult.audio.waypoints || []).reduce(
              (acc: number, w: any) => acc + Object.keys(w.audio_url_i18n || {}).length,
              0
            );
            const totalGenerated = establishCount + waypointCount;

            const errorLines = [
              ...Object.entries(voiceResult.errors?.establish || {}).map(
                ([l, e]) => `Uvod (${String(l).toUpperCase()}): ${e}`
              ),
              ...Object.entries(voiceResult.errors?.waypoints || {}).map(([k, e]) => `Tačka ${k}: ${e}`)
            ];

            if (totalGenerated === 0) {
              voiceSummaryMessage =
                '\n\n⚠️ AI glas NIJE generisan ni za jedan segment' +
                (errorLines.length > 0 ? ' - greške:\n' + errorLines.join('\n') : ' (tekst je prazan?).');
            } else {
              voiceSummaryMessage =
                `\n\n🎙️ Generisano ${totalGenerated} audio segmenata.` +
                (errorLines.length > 0 ? ' Deo NIJE uspeo:\n' + errorLines.join('\n') : '');
            }

            if (errorLines.length > 0) {
              console.warn('[TTS] Delimične greške pri generisanju glasa:', voiceResult.errors);
            }
          } else {
            console.error('[TTS] Generisanje glasa nije uspelo:', voiceResult.error);
            voiceSummaryMessage =
              '\n\n⚠️ Generisanje AI glasa nije uspelo (' + (voiceResult.error || 'nepoznata greška') + ').';
          }
        } catch (voiceErr: any) {
          console.error('[TTS] Greška pri pozivu generate_voice:', voiceErr);
          voiceSummaryMessage = '\n\n⚠️ Generisanje AI glasa nije uspelo (mrežna greška).';
        }
      }

      setTranslationProgress('Upisivanje u bazu podataka...');

      const { error: dbErr } = await supabase
        .from('rooms')
        .update({
          title_i18n: currentTitleI18n,
          establish_i18n: currentEstablishI18n,
          waypoints_i18n: currentWaypoints
        })
        .eq('id', currentRoom.id as any);

      if (dbErr) {
        throw dbErr;
      }

      setRooms((prevRooms: any[]) =>
        prevRooms.map((r, idx) =>
          idx === roomIdx
            ? {
                ...r,
                title_i18n: currentTitleI18n,
                establish_i18n: currentEstablishI18n,
                waypoints_i18n: currentWaypoints
              }
            : r
        )
      );

      refreshViewerHotspots(currentWaypoints, langRef.current);

      alert('Soba je uspešno popunjena i prevedena!' + voiceSummaryMessage);
    } catch (err: any) {
      console.error('Translation & Saving Error:', err);
      alert('Greška tokom prevođenja i upisa: ' + (err.message || 'Nepoznata greška'));
    } finally {
      setTranslationProgress(null);
      setVoiceProgress(null);
    }
  };

  // Prevodi VEĆ SAČUVAN srpski sadržaj trenutne sobe (naslov, uvodna
  // naracija, tačke) na jedan ili više DODATNIH jezika - za razliku od
  // handleConfirmDraftAndProcess, ovo se može pokrenuti u bilo kom trenutku
  // nakon što je soba već kreirana, ne samo odmah posle AI generisanja.
  const handleTranslateRoomLanguages = async () => {
    const currentRoom = rooms[roomIdx];
    if (!currentRoom) return;

    const targets = [...addLanguageTargets];
    if (targets.length === 0) {
      alert('Izaberite bar jedan jezik za prevod.');
      return;
    }

    const sourceTitle = getLocalizedText(currentRoom.title_i18n, 'sr');
    const establishData = parseEstablish(currentRoom.establish_i18n);
    const sourceNarration = getLocalizedText(establishData.text_i18n, 'sr');
    const waypointsList = parseWaypoints(currentRoom.waypoints_i18n);

    if (!sourceTitle && !sourceNarration && waypointsList.length === 0) {
      alert('Ova soba još nema sadržaj na srpskom. Prvo pokreni "🤖 AI Popuni Sobu" da napraviš SR draft.');
      return;
    }

    setShowAddLanguageModal(false);

    let currentTitleI18n: Record<string, string> = buildI18nObject(sourceTitle, currentRoom.title_i18n, 'sr');
    let currentEstablishI18n: EstablishData = {
      ...establishData,
      text_i18n: buildI18nObject(sourceNarration, establishData.text_i18n, 'sr')
    };
    let currentWaypoints: Waypoint[] = waypointsList.map((wp) => ({
      ...wp,
      title_i18n: buildI18nObject(getLocalizedText(wp.title_i18n, 'sr'), wp.title_i18n, 'sr'),
      text_i18n: buildI18nObject(getLocalizedText(wp.text_i18n, 'sr'), wp.text_i18n, 'sr')
    }));

    try {
      setTranslationProgress(`Prevođenje na jezike: ${targets.map((l) => l.toUpperCase()).join(', ')}...`);

      const translated = await translateRoomToLanguages(
        currentRoom.id,
        sourceTitle,
        sourceNarration,
        currentTitleI18n,
        typeof currentEstablishI18n.text_i18n === 'object' ? (currentEstablishI18n.text_i18n as Record<string, string>) : {},
        currentWaypoints,
        targets
      );

      currentTitleI18n = translated.titleI18n;
      currentEstablishI18n.text_i18n = translated.establishTextI18n;
      currentWaypoints = translated.waypoints;

      setTranslationProgress('Upisivanje u bazu podataka...');

      const { error: dbErr } = await supabase
        .from('rooms')
        .update({
          title_i18n: currentTitleI18n,
          establish_i18n: currentEstablishI18n,
          waypoints_i18n: currentWaypoints
        })
        .eq('id', currentRoom.id as any);

      if (dbErr) throw dbErr;

      setRooms((prevRooms: any[]) =>
        prevRooms.map((r, idx) =>
          idx === roomIdx
            ? { ...r, title_i18n: currentTitleI18n, establish_i18n: currentEstablishI18n, waypoints_i18n: currentWaypoints }
            : r
        )
      );

      refreshViewerHotspots(currentWaypoints, langRef.current);
      setAddLanguageTargets([]);

      alert(`Soba je prevedena na: ${targets.map((l) => l.toUpperCase()).join(', ')}.`);
    } catch (err: any) {
      console.error('Greška pri dodavanju jezika:', err);
      alert('Greška pri prevođenju: ' + (err.message || 'Nepoznata greška'));
    } finally {
      setTranslationProgress(null);
    }
  };

  const isLanguageAvailable = (l: Language): boolean => {
    if (l === 'sr') return true;

    const checkI18n = (data: any): boolean => {
      if (!data) return false;
      if (typeof data === 'object') return Boolean(data[l]);
      if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          return Boolean(parsed && parsed[l]);
        } catch {
          return false;
        }
      }
      return false;
    };

    if (tour) {
      if (
        checkI18n(tour.title_i18n) || 
        checkI18n(tour.about_text_i18n) ||
        checkI18n(tour.faq_1_i18n) ||
        checkI18n(tour.faq_2_i18n) ||
        checkI18n(tour.faq_3_i18n) ||
        checkI18n(tour.faq_4_i18n) ||
        checkI18n(tour.faq_5_i18n)
      ) return true;
    }

    if (rooms && rooms.length > 0) {
      for (const room of rooms) {
        if (checkI18n(room.title_i18n)) return true;
        const waypoints = parseWaypoints(room.waypoints_i18n);
        for (const wp of waypoints) {
          if (checkI18n(wp.text_i18n) || checkI18n(wp.title_i18n)) return true;
        }
      }
    }

    return false;
  };

  // Da li TRENUTNA soba (ne cela tura) već ima sadržaj za dati jezik -
  // koristi se u admin modalu za dodavanje jezika, da admin vidi šta je
  // već prevedeno, a šta nedostaje.
  const roomHasLanguageContent = (room: Room | undefined, l: Language): boolean => {
    if (!room) return false;

    const checkI18n = (data: any): boolean => {
      if (!data) return false;
      if (typeof data === 'object') return Boolean(data[l]);
      if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          return Boolean(parsed && parsed[l]);
        } catch {
          return false;
        }
      }
      return false;
    };

    if (checkI18n(room.title_i18n)) return true;

    const establishData = parseEstablish(room.establish_i18n);
    if (checkI18n(establishData.text_i18n)) return true;

    const waypoints = parseWaypoints(room.waypoints_i18n);
    for (const wp of waypoints) {
      if (checkI18n(wp.text_i18n) || checkI18n(wp.title_i18n)) return true;
    }

    return false;
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });

    setLoginLoading(false);

    if (authError) {
      setLoginError('Pogrešan email ili lozinka.');
      return;
    }

    // adminMode i showAdminLogin se ažuriraju automatski preko
    // supabase.auth.onAuthStateChange listener-a gore.
    setLoginPassword('');
  };

  const handleAdminLogout = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    isMountedRef.current = true;
    setHasMounted(true);
    const urlParams = new URLSearchParams(window.location.search);
    const adminRequested = urlParams.get('admin') === '1';

    // Admin pristup ide isključivo preko Supabase Auth sesije - nema više
    // hardkodirane lozinke u URL-u. Ako je admin već ulogovan (na BILO
    // kojoj turi, ranije), sesija se automatski prepoznaje i ovde.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMountedRef.current) return;
      const loggedIn = Boolean(session);
      setAdminMode(loggedIn);
      adminModeRef.current = loggedIn;
      if (!loggedIn && adminRequested) {
        setShowAdminLogin(true);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMountedRef.current) return;
      const loggedIn = Boolean(session);
      setAdminMode(loggedIn);
      adminModeRef.current = loggedIn;
      if (loggedIn) setShowAdminLogin(false);
    });

    return () => {
      isMountedRef.current = false;
      authListener.subscription.unsubscribe();
      stopAudio();
      stopCurrentAnimation();
      if (viewerRef.current) {
        try { viewerRef.current.destroy(); } catch {}
        viewerRef.current = null;
      }
    };
  }, [stopAudio, stopCurrentAnimation]);

  useEffect(() => {
    if (!tourStarted) return;
    const ticker = tickerRef.current;
    if (!ticker) return;

    let tickerAnimationId: number;
    const step = () => {
      if (ticker && !autoScrollPausedRef.current && !isDraggingRef.current && isMountedRef.current && !document.hidden) {
        ticker.scrollLeft += 0.5;
        if (ticker.scrollLeft >= ticker.scrollWidth - ticker.clientWidth) {
          ticker.scrollLeft = 0;
        }
      }
      tickerAnimationId = requestAnimationFrame(step);
    };
    tickerAnimationId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(tickerAnimationId);
  }, [tourStarted]);

  const toggleMute = () => {
    const nextMuteState = !isMutedRef.current;
    isMutedRef.current = nextMuteState;
    setIsMuted(nextMuteState);

    if (nextMuteState) {
      // Samo pauziraj - NE diramo activeResolveRef/activePlaybackRawRef,
      // da bi se sekvenca mogla nastaviti kad se zvuk vrati.
      if (activeAudioRef.current) {
        audioCurrentTimeRef.current = activeAudioRef.current.currentTime;
        activeAudioRef.current.pause();
        activeAudioRef.current.onended = null;
        activeAudioRef.current.onerror = null;
        activeAudioRef.current = null;
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    } else if (activePlaybackRawRef.current) {
      // Nastavi ISTU narraciju (isti Promise) od tamo gde je stala
      loadAndPlayLocalizedAudio(audioCurrentTimeRef.current);
    }
  };

  useEffect(() => {
    if (!hasMounted) return;
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
  }, [hasMounted, stopAudio, stopCurrentAnimation]);

  useEffect(() => {
    if (!slug || !hasMounted) return;
    async function load() {
      setLoading(true);
      const { data: tourData, error: tourErr } = await supabase.from('tours').select('*').eq('slug', slug).single();
      const { data: roomRows, error: roomsErr } = await supabase.from('rooms').select('*').eq('tour_slug', slug).order('order_index', { ascending: true });

      if (tourErr) console.error('[TOUR LOAD ERROR]', tourErr);
      if (roomsErr) console.error('[ROOMS LOAD ERROR]', roomsErr);

      if (!isMountedRef.current) return;

      if (!tourData) {
        // VAŽNO: ako tura nije nađena, ne dozvoljavamo da rooms-provera dole prepiše ovu poruku
        setError(tourErr ? `Greška (tours): ${tourErr.message}` : translations[langRef.current].tourNotFound);
      } else {
        setTour(tourData as Tour);
        if (roomsErr) setError(`Greška (rooms): ${roomsErr.message}`);
        else if (!roomRows || roomRows.length === 0) setError(translations[langRef.current].noRooms);
        else setRooms(roomRows as Room[]);
      }

      setLoading(false);
    }
    load();
  }, [slug, hasMounted]);

  useEffect(() => {
    if (!tourStarted || rooms.length === 0 || !pannellumReady || !hasMounted) return;

    const currentSession = ++roomSessionRef.current;
    const currentRoom = rooms[roomIdx];
    const resolvedPanoramaUrl = currentRoom?.panorama_url_cf || currentRoom?.panorama_url;
    if (!resolvedPanoramaUrl) return;

    setRoomLoading(true);
    sequenceActiveRef.current = true;
    isInterruptedRef.current = false;
    setIsInfoboxManuallyClosed(false);
    setInfoBoxData(null);

    if (viewerRef.current) {
      try { viewerRef.current.destroy(); } catch {}
      viewerRef.current = null;
    }
    const panoramaContainer = document.getElementById('panorama');
    if (panoramaContainer) panoramaContainer.innerHTML = '';

    const waypointsList = parseWaypoints(currentRoom.waypoints_i18n);
    const establishData = parseEstablish(currentRoom.establish_i18n);

    const formattedHotspots = waypointsList.map((wp, index) => {
      const isNav = wp.type === 'navigation' || Boolean(wp.targetRoomId);

      let tooltipText = getLocalizedText(wp.title_i18n, langRef.current);
      if (!tooltipText && !isNav) {
         tooltipText = getLocalizedText(wp.text_i18n, langRef.current);
         if (tooltipText.length > 40) tooltipText = tooltipText.substring(0, 40) + '...';
      }
      if (isNav && !tooltipText && wp.targetRoomId) {
        const targetRoomObj = rooms.find(r => r.id == wp.targetRoomId);
        if (targetRoomObj) tooltipText = getLocalizedText(targetRoomObj.title_i18n, langRef.current);
      }

      return {
        id: `hotspot-${index}`,
        pitch: wp.pitch || 0,
        yaw: wp.yaw || 0,
        createTooltipFunc: (hotSpotDiv: HTMLDivElement) => {
          hotSpotDiv.classList.add(isNav ? 'custom-nav-hotspot' : 'custom-info-hotspot');
          // Pannellum dodaje svoj default sprite (background-image, npr. crni
          // "+") na ovaj div preko svojih pnlm-* klasa - backgroundColor ga
          // NE prekriva jer je background-image odvojen sloj iznad boje, pa
          // ga eksplicitno gasimo da se ne vidi ispod/oko našeg pill dizajna.
          hotSpotDiv.style.backgroundImage = 'none';
          hotSpotDiv.style.backgroundColor = THEME.surface;
          hotSpotDiv.style.border = '1.5px solid ' + THEME.border;
          hotSpotDiv.style.borderRadius = isNav ? '50px' : '50%';
          hotSpotDiv.style.color = THEME.textPrimary;
          hotSpotDiv.style.display = 'flex';
          hotSpotDiv.style.alignItems = 'center';
          hotSpotDiv.style.justifyContent = 'center';
          hotSpotDiv.style.cursor = 'pointer';
          hotSpotDiv.style.padding = isNav ? '3px 6px' : '0.5px';
          hotSpotDiv.style.width = isNav ? 'auto' : '22px';
          hotSpotDiv.style.height = isNav ? 'auto' : '22px';
          hotSpotDiv.style.fontWeight = 'bold';
          hotSpotDiv.style.fontSize = isNav ? '10px' : '15px';
          hotSpotDiv.style.boxShadow = THEME.shadowLg;
          hotSpotDiv.innerHTML = isNav ? `${tooltipText}` : 'ℹ';
        },
        text: tooltipText,
        clickHandlerFunc: () => {
          if (adminModeRef.current) {
            handleStartEditWaypoint(index);
          } else if (isNav && wp.targetRoomId) {
            changeRoomById(wp.targetRoomId);
          } else if (!isNav) {
            isInterruptedRef.current = true;
            stopCurrentAnimation();
            audioCurrentTimeRef.current = 0;
            if (viewerRef.current) viewerRef.current.setHfov(48);
            playAudioFileWithCompletion(wp.audio_url_i18n ?? wp.audio_url, wp.text_i18n, wp.title_i18n, index, 0);
          }
        }
      };
    });

    const targetEstablishYaw = normalizeYaw(establishData.fromYaw ?? 0);
    const targetEstablishPitch = establishData.pitch ?? 0;

    const v = (window as any).pannellum.viewer('panorama', {
      type: 'equirectangular',
      panorama: resolvedPanoramaUrl,
      autoLoad: true,
      showControls: false,
      hfov: 65,
      minHfov: 30,
      maxHfov: 110,
      yaw: targetEstablishYaw,
      pitch: targetEstablishPitch,
      autoRotate: 0,
      hotSpots: formattedHotspots,
      loadingHtml: ''
    });
    viewerRef.current = v;

    // ADMIN MODE: KLIK ZA DODAVANJE NOVE TAČKE ILI POMERANJE POSTOJEĆE
    v.on('mouseup', (e: MouseEvent) => {
      if (adminModeRef.current && e.button === 0) {
        // VAŽNO: Pannellum vraća [pitch, yaw] (ne [yaw, pitch])!
        const coords = v.mouseEventToCoords(e);
        if (coords) {
          const clickedPitch = coords[0];
          const clickedYaw = coords[1];

          if (editingIndexRef.current !== null) {
            // Već postoji tačka u režimu izmene -> ovaj klik je SAMO pomeranje
            // na novu poziciju. Ne diramo editingIndex ni već unet naslov/tekst/audio,
            // da se ne izgube podaci koje je korisnik već uneo.
            setPendingCoords({ yaw: clickedYaw, pitch: clickedPitch });
          } else {
            // Nije aktivno editovanje - ovo je klik za kreiranje potpuno nove tačke
            setPendingCoords({ yaw: clickedYaw, pitch: clickedPitch });
            setHotspotText('');
            setHotspotTitle('');
            setHotspotAudioUrl('');
            setTargetRoomId('');
          }
        }
      }
    });

    const handlePanEnd = () => {
      if (isGyroActiveRef.current && viewerRef.current && typeof viewerRef.current.startOrientation === 'function') {
        viewerRef.current.startOrientation();
      }
    };

    if (panoramaContainer) {
      panoramaContainer.addEventListener('mouseup', handlePanEnd);
      panoramaContainer.addEventListener('touchend', handlePanEnd);
    }

    const infoPoints = waypointsList
      .map((wp, i) => ({ wp, i }))
      .filter(item => item.wp.type === 'info' || (!item.wp.type && !item.wp.targetRoomId));

    const startInfiniteGlide = () => {
      if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
      if (!sequenceActiveRef.current || isInterruptedRef.current) return;
      stopCurrentAnimation();
      setInfoBoxData({
        titleRaw: translations[langRef.current].guideCompleted,
        textRaw: translations[langRef.current].freeExplore
      });

      if (guideCompleteTimerRef.current) clearTimeout(guideCompleteTimerRef.current);
      guideCompleteTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current || currentSession !== roomSessionRef.current) return;
        setInfoBoxData(null);
        setIsRoomTourFullyCompleted(true);
      }, 7000);

      // NAPOMENA: koristimo Pannellum-ov UGRAĐENI startAutoRotate (isti onaj
      // koji već radi u "Fazi 1" gore - rotatePromise), a NE ručno pozivanje
      // setYaw() u requestAnimationFrame petlji. Ručno zvanje setYaw() svakih
      // ~16ms je sa Pannellum-om davalo "statičnu" kameru, jer setYaw() po
      // difoltu radi SOPSTVENU animaciju ka novoj vrednosti - pozivanje na
      // svaki frejm je non-stop restartovalo tu internu animaciju umesto da
      // glatko rotira. startAutoRotate() je pravljen tačno za ovaj slučaj
      // (neprekidno, glatko okretanje) i ne pati od tog problema.
      if (viewerRef.current) {
        viewerRef.current.setHfov(65);
        const idleRotateDegPerSec = 360 / 30; // 360° za 30 sekundi
        viewerRef.current.startAutoRotate(idleRotateDegPerSec, targetEstablishPitch);
      }
    };

    v.on('load', async () => {
      if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
      setRoomLoading(false);

      if (!sequenceActiveRef.current || isInterruptedRef.current) return;

      const introTextRaw = establishData.text_i18n ||
`${translations[langRef.current].welcomePrefix}${getLocalizedText(currentRoom.title_i18n, langRef.current)}`;
      const introAudioUrl = establishData.audio_url_i18n ?? establishData.audio_url;

      const rotatePromise = new Promise<void>((resolve) => {
        const durationPhase1 = 15000;
        const totalDegrees = 240;
        const speed = totalDegrees / (durationPhase1 / 1000);

        if (currentSession !== roomSessionRef.current || !isMountedRef.current) return resolve();
        if (!sequenceActiveRef.current || isInterruptedRef.current) return resolve();

        if (viewerRef.current) {
          viewerRef.current.setHfov(65);
          viewerRef.current.setYaw(targetEstablishYaw);
          viewerRef.current.setPitch(targetEstablishPitch);
          viewerRef.current.startAutoRotate(speed, targetEstablishPitch);
        }

        const startTime = performance.now();
        const checkCompletion = (now: number) => {
          if (currentSession !== roomSessionRef.current || !isMountedRef.current) {
            if (viewerRef.current) viewerRef.current.stopAutoRotate();
            return resolve();
          }
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
        playAudioFileWithCompletion(introAudioUrl, introTextRaw, currentRoom.title_i18n, undefined, 0)
      ]);

      if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
      if (!sequenceActiveRef.current || isInterruptedRef.current) return;

      const runInfoSequencePhase2 = async (index: number) => {
        if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
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
        if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
        if (!sequenceActiveRef.current || isInterruptedRef.current) return;

        await playAudioFileWithCompletion(item.wp.audio_url_i18n ?? item.wp.audio_url, item.wp.text_i18n, item.wp.title_i18n, item.i, 0);
        if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
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

    return () => {
      sequenceActiveRef.current = false;
      isInterruptedRef.current = true;
      panoramaContainer?.removeEventListener('mouseup', handlePanEnd);
      panoramaContainer?.removeEventListener('touchend', handlePanEnd);
      stopCurrentAnimation();
      stopAudio();
      if (viewerRef.current) {
        try { viewerRef.current.destroy(); } catch {}
        viewerRef.current = null;
      }
    };
  }, [
    tourStarted,
    roomIdx,
    pannellumReady,
    hasMounted,
    // Panorama trenutne sobe - kad se zameni (npr. admin upload na
    // Cloudflare), scena se mora ponovo učitati sa novim URL-om.
    rooms[roomIdx]?.panorama_url_cf,
    rooms[roomIdx]?.panorama_url,
    changeRoomById,
    stopCurrentAnimation,
    stopAudio,
    handleStartEditWaypoint,
    playAudioFileWithCompletion
  ]);

  if (!hasMounted || loading) return <Centered>{t.loading}</Centered>;

  // Tura postoji ali nema nijednu sobu: admin dobija dugme da kreira prvu
  // sobu (sve ostale admin akcije - panorama upload, AI popuna, jezici -
  // rade NAD postojećom sobom, pa moraju da imaju sa čim da rade).
  if (tour && rooms.length === 0 && !error.includes('Greška')) {
    return (
      <div style={{ color: THEME.textPrimary, background: THEME.bg, height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', gap: '16px', padding: '20px', textAlign: 'center' }}>
        <Logo />
        <p style={{ color: THEME.textSecondary, fontSize: '16px' }}>{t.noRooms}</p>
        {adminMode && (
          <button
            onClick={handleAddRoom}
            disabled={creatingRoom}
            style={{ padding: '12px 28px', fontSize: '15px', fontWeight: 'bold', backgroundColor: THEME.accent, color: '#fff', border: 'none', borderRadius: '30px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)' }}
          >
            {creatingRoom ? 'Kreiranje...' : '➕ Kreiraj prvu sobu'}
          </button>
        )}
      </div>
    );
  }

  if (error) return <Centered>{error}</Centered>;

  const currentRoom = rooms[roomIdx];

  let displayedInfoTitle = '';
  let displayedInfoText = '';
  if (infoBoxData) {
    displayedInfoTitle = getLocalizedText(infoBoxData.titleRaw, lang);
    if (!displayedInfoTitle && infoBoxData.index === undefined) {
      displayedInfoTitle = getLocalizedText(currentRoom?.title_i18n, lang);
    }
    displayedInfoText = getLocalizedText(infoBoxData.textRaw, lang);
  }

  const currentCategory = tour?.category || 'rent';
  const questionsList = categoryQuestions[currentCategory]?.[lang] || categoryQuestions['rent']['sr'];

  const faqAnswersList = [
    getLocalizedText(tour?.faq_1_i18n, lang),
    getLocalizedText(tour?.faq_2_i18n, lang),
    getLocalizedText(tour?.faq_3_i18n, lang),
    getLocalizedText(tour?.faq_4_i18n, lang),
    getLocalizedText(tour?.faq_5_i18n, lang)
  ];

  const faqList = questionsList.map((q, idx) => ({
    question: q,
    answer: faqAnswersList[idx] || ''
  }));

  const aboutText = getLocalizedText(tour?.about_text_i18n, lang);

  const fullTourTitle = getLocalizedText(tour?.title_i18n, lang);
  const currentRoomTitle = getLocalizedText(currentRoom?.title_i18n, lang) || `Soba ${roomIdx + 1}`;

  const availableLanguages: Language[] = ['sr', 'en', 'de', 'ru'];

  const isModalToolbarVisible = !infoBoxData && (!tourStarted || isRoomTourFullyCompleted || isInfoboxManuallyClosed);

  return (
    <main style={{ position: 'relative', width: '100vw', height: '100dvh', backgroundColor: THEME.bg, overflow: 'hidden' }}>
      <style>{`
        .pnlm-load-box {
          display: none !important;
        }
      `}</style>

      {!tourStarted && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50, backgroundColor: THEME.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
          <div style={{ position: 'absolute', top: '16px', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
            <Logo />
          </div>

          {tour?.agency_name && (
            <div style={{ color: THEME.textMuted, fontSize: '13px', marginBottom: '18px', fontStyle: 'italic' }}>( {tour.agency_name} )</div>
          )}

          <div style={{
            display: 'flex',
            gap: '4px',
            backgroundColor: THEME.surfaceAlt,
            border: '1px solid ' + THEME.border,
            borderRadius: '999px',
            padding: '4px',
            marginBottom: '20px',
            boxShadow: THEME.shadow
          }}>
            {availableLanguages
              .filter((l) => adminMode || isLanguageAvailable(l))
              .map((l) => (
                <button
                  key={l}
                  onClick={() => changeLanguage(l)}
                  style={{
                    background: lang === l ? THEME.accent : 'transparent',
                    color: lang === l ? '#fff' : THEME.textSecondary,
                    border: 'none',
                    borderRadius: '999px',
                    padding: '6px 14px',
                    fontSize: '13px',
                    fontWeight: lang === l ? 'bold' : 'normal',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  {l.toUpperCase()}
                </button>
              ))}
          </div>

          <h1 style={{ color: THEME.textPrimary, fontSize: '26px', marginBottom: '12px', fontWeight: 700 }}>{fullTourTitle}</h1>
          <p style={{ color: THEME.textSecondary, fontSize: '16px', maxWidth: '440px', marginBottom: '32px', lineHeight: '1.5' }}>{t.welcome}</p>
          <button onClick={() => setTourStarted(true)} style={{ padding: '14px 32px', fontSize: '17px', fontWeight: 'bold', backgroundColor: THEME.accent, color: '#fff', border: 'none', borderRadius: '30px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)' }}>
            {t.startTour}
          </button>
        </div>
      )}

      {tourStarted && (
        <>
          <div style={{
            position: 'absolute',
            top: '4px',
            left: '4px',
            right: '4px',
            zIndex: 35,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            pointerEvents: 'none'
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', rowGap: '4px', width: '100%' }}>
              <div style={{
                backgroundColor: THEME.surface,
                border: '1px solid ' + THEME.border,
                borderRadius: '12px',
                padding: '5px 12px',
                pointerEvents: 'auto',
                maxWidth: '55%',
                boxShadow: THEME.shadow
              }}>
                {tour?.agency_name && (
                  <div style={{ color: THEME.accent, fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tour.agency_name}
                  </div>
                )}
                <div style={{ color: THEME.textPrimary, fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {fullTourTitle}
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
                rowGap: '4px',
                gap: '4px',
                maxWidth: '55%',
                backgroundColor: THEME.surface,
                border: '1px solid ' + THEME.border,
                borderRadius: '12px',
                padding: '3px 6px',
                pointerEvents: 'auto',
                boxShadow: THEME.shadow
              }}>
                {adminMode && (
                  <button
                    onClick={handleAddRoom}
                    disabled={creatingRoom}
                    title="Dodaj novu (praznu) sobu u ovu turu"
                    style={{
                      background: THEME.success,
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      marginRight: '6px'
                    }}
                  >
                    {creatingRoom ? '➕ Kreiranje...' : '➕ Soba'}
                  </button>
                )}

                {adminMode && (
                  <>
                    <input
                      ref={panoramaFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePanoramaFileSelected}
                      style={{ display: 'none' }}
                    />
                    <button
                      onClick={() => panoramaFileInputRef.current?.click()}
                      disabled={!!panoramaUploadProgress}
                      title="Otpremi/zameni panoramu ove sobe (šalje se na Cloudflare)"
                      style={{
                        background: '#0891b2',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        marginRight: '6px'
                      }}
                    >
                      📤 Panorama
                    </button>
                  </>
                )}

                {adminMode && (
                  <button
                    onClick={handleAutoPopulateRoom}
                    disabled={aiLoading}
                    style={{
                      background: '#7c3aed',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      marginRight: '6px'
                    }}
                  >
                    {aiLoading ? '🤖 Generisanje...' : '🤖 AI Popuni Sobu'}
                  </button>
                )}

                {adminMode && (
                  <button
                    onClick={() => setShowVoiceModal(true)}
                    disabled={!!voiceProgress}
                    title="Generiši ili osveži AI glasovnu naraciju za postojeći tekst ove sobe"
                    style={{
                      background: '#c084fc',
                      color: '#1e1b2e',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      marginRight: '6px'
                    }}
                  >
                    🎙️ Glas
                  </button>
                )}

                {adminMode && (
                  <button
                    onClick={() => setShowAddLanguageModal(true)}
                    disabled={!!translationProgress}
                    title="Dodaj (prevedi) ovu sobu na još neki jezik, u bilo kom trenutku"
                    style={{
                      background: '#0ea5e9',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      marginRight: '6px'
                    }}
                  >
                    🌐 Jezici
                  </button>
                )}

                {adminMode && (
                  <button
                    onClick={handleAdminLogout}
                    title="Odjavi se iz admin režima"
                    style={{
                      background: THEME.dangerSoft,
                      border: '1px solid ' + THEME.border,
                      color: THEME.danger,
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      marginRight: '6px'
                    }}
                  >
                    🔒 Odjava
                  </button>
                )}

                <button
                  onClick={toggleMute}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: THEME.textPrimary,
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '3px 4px'
                  }}
                  title={isMuted ? 'Uključi zvuk' : 'Isključi zvuk'}
                >
                  {isMuted ? '🔇' : '🔊'}
                </button>

                <div style={{ width: '1px', height: '14px', backgroundColor: THEME.border, margin: '0 2px' }} />

                {availableLanguages
                  .filter((l) => adminMode || isLanguageAvailable(l))
                  .map((l) => (
                    <button
                      key={l}
                      onClick={() => changeLanguage(l)}
                      style={{
                        background: lang === l ? THEME.accent : 'transparent',
                        color: lang === l ? '#fff' : THEME.textSecondary,
                        border: 'none',
                        borderRadius: '8px',
                        padding: '3px 6px',
                        fontSize: '11px',
                        fontWeight: lang === l ? 'bold' : 'normal',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
              </div>
            </div>

            <div style={{ position: 'relative' }}>
            <div
              ref={tickerRef}
              onMouseEnter={() => { autoScrollPausedRef.current = true; }}
              onMouseLeave={() => { autoScrollPausedRef.current = false; isDraggingRef.current = false; }}
              onMouseDown={(e) => {
                isDraggingRef.current = true;
                autoScrollPausedRef.current = true;
                startXRef.current = e.pageX - tickerRef.current!.offsetLeft;
                scrollLeftRef.current = tickerRef.current!.scrollLeft;
              }}
              onMouseMove={(e) => {
                if (!isDraggingRef.current) return;
                e.preventDefault();
                const x = e.pageX - tickerRef.current!.offsetLeft;
                const walk = (x - startXRef.current) * 2;
                tickerRef.current!.scrollLeft = scrollLeftRef.current - walk;
              }}
              onMouseUp={() => { isDraggingRef.current = false; }}
              onTouchStart={(e) => {
                isDraggingRef.current = true;
                autoScrollPausedRef.current = true;
                startXRef.current = e.touches[0].pageX - tickerRef.current!.offsetLeft;
                scrollLeftRef.current = tickerRef.current!.scrollLeft;
              }}
              onTouchMove={(e) => {
                if (!isDraggingRef.current) return;
                const x = e.touches[0].pageX - tickerRef.current!.offsetLeft;
                const walk = (x - startXRef.current) * 2;
                tickerRef.current!.scrollLeft = scrollLeftRef.current - walk;
              }}
              onTouchEnd={() => { isDraggingRef.current = false; autoScrollPausedRef.current = false; }}
              style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                maxWidth: '100%',
                padding: '2px 0',
                pointerEvents: 'auto',
                scrollbarWidth: 'none',
                cursor: 'grab',
                whiteSpace: 'nowrap'
              }}
            >
              {rooms.map((room, idx) => (
                <button
                  key={room.id}
                  onClick={() => changeRoomById(room.id)}
                  style={{
                    backgroundColor: idx === roomIdx ? THEME.accent : THEME.surface,
                    color: idx === roomIdx ? '#ffffff' : THEME.textPrimary,
                    border: idx === roomIdx ? '1px solid ' + THEME.accent : '1px solid ' + THEME.border,
                    borderRadius: '16px',
                    padding: '5px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: idx === roomIdx ? 600 : 400,
                    boxShadow: THEME.shadow,
                    flexShrink: 0,
                    userSelect: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  🚪 {getLocalizedText(room.title_i18n, lang) || `Soba ${idx + 1}`}
                </button>
              ))}
            </div>

            {/* Fade efekat na ivicama trake sa sobama - signalizira da se može skrolovati */}
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: '24px',
              background: 'linear-gradient(to right, ' + THEME.bg + ', rgba(241, 245, 249, 0))',
              pointerEvents: 'none'
            }} />
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              width: '24px',
              background: 'linear-gradient(to left, ' + THEME.bg + ', rgba(241, 245, 249, 0))',
              pointerEvents: 'none'
            }} />
            </div>
          </div>

          <div style={{
            position: 'absolute',
            top: '82px',
            right: '8px',
            zIndex: 36,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <button
              onClick={toggleFullscreen}
              style={{
                backgroundColor: THEME.surface,
                border: '1px solid ' + THEME.border,
                color: THEME.textPrimary,
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '16px',
                boxShadow: THEME.shadow,
                transition: 'transform 0.2s ease'
              }}
              title={isFullscreen ? 'Napusti ceo ekran' : 'Ceo ekran'}
            >
              {isFullscreen ? '🗗' : '⛶'}
            </button>

            {isFullscreen && (
              <button
                onClick={toggleGyroscope}
                style={{
                  backgroundColor: isGyroActive ? THEME.accent : THEME.surface,
                  border: '1px solid ' + THEME.border,
                  color: isGyroActive ? '#fff' : THEME.textPrimary,
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '16px',
                  boxShadow: THEME.shadow,
                  transition: 'background 0.2s'
                }}
                title={isGyroActive ? 'Ugasi giroskop' : 'Upali giroskop'}
              >
                🧭
              </button>
            )}
          </div>
        </>
      )}

      <div id="panorama" style={{ width: '100%', height: '100%' }} />

      {!pendingCoords && isModalToolbarVisible && (
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 55,
          display: 'flex',
          gap: '6px',
          width: '96%',
          maxWidth: '560px',
          justifyContent: 'center'
        }}>
          <button onClick={() => setActiveModal('faq')} style={{ ...btnStyle, flex: 1, textAlign: 'center', backgroundColor: activeModal === 'faq' ? THEME.accent : THEME.surface, color: activeModal === 'faq' ? '#fff' : THEME.textPrimary, padding: '12px 4px', fontSize: '15px' }}>
            ❓ {t.btnFaq.replace(/^[^\s]+\s*/, '')}
          </button>
          <button onClick={() => setActiveModal('location')} style={{ ...btnStyle, flex: 1, textAlign: 'center', backgroundColor: activeModal === 'location' ? THEME.accent : THEME.surface, color: activeModal === 'location' ? '#fff' : THEME.textPrimary, padding: '12px 4px', fontSize: '15px' }}>
            📍 {t.btnLocation.replace(/^[^\s]+\s*/, '')}
          </button>
          <button onClick={() => setActiveModal('about')} style={{ ...btnStyle, flex: 1, textAlign: 'center', backgroundColor: activeModal === 'about' ? THEME.accent : THEME.surface, color: activeModal === 'about' ? '#fff' : THEME.textPrimary, padding: '12px 4px', fontSize: '15px' }}>
            ℹ️ {t.btnAbout.replace(/^[^\s]+\s*/, '')}
          </button>
          <button onClick={() => setActiveModal('plan')} style={{ ...btnStyle, flex: 1, textAlign: 'center', backgroundColor: activeModal === 'plan' ? THEME.accent : THEME.surface, color: activeModal === 'plan' ? '#fff' : THEME.textPrimary, padding: '12px 4px', fontSize: '15px' }}>
            🗺️ {t.btnPlan.replace(/^[^\s]+\s*/, '')}
          </button>
          <button onClick={() => setActiveModal('contact')} style={{ ...btnStyle, flex: 1, textAlign: 'center', backgroundColor: activeModal === 'contact' ? THEME.accent : THEME.surface, color: activeModal === 'contact' ? '#fff' : THEME.textPrimary, padding: '12px 4px', fontSize: '15px' }}>
            📞 {t.btnContact.replace(/^[^\s]+\s*/, '')}
          </button>
        </div>
      )}

      {tourStarted && adminMode && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ position: 'absolute', width: '28px', height: '2px', backgroundColor: THEME.accent, boxShadow: '0 0 4px rgba(0,0,0,0.8)' }} />
          <div style={{ position: 'absolute', width: '2px', height: '28px', backgroundColor: THEME.accent, boxShadow: '0 0 4px rgba(0,0,0,0.8)' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffffff', border: '2px solid ' + THEME.accent }} />
        </div>
      )}

      {/* ADMIN EDIT / ADD HOTSPOT FORMA */}
      {pendingCoords && adminMode && (
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 60,
          width: '92%',
          maxWidth: '480px',
          backgroundColor: THEME.surface,
          border: '1px solid ' + THEME.border,
          borderRadius: '16px',
          padding: '16px',
          color: THEME.textPrimary,
          boxShadow: THEME.shadowLg,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <h4 style={{ margin: 0, color: THEME.accent, fontSize: '15px' }}>
            {editingIndex !== null ? t.editPoint : t.addPoint} (Yaw: {pendingCoords.yaw.toFixed(1)}, Pitch: {pendingCoords.pitch.toFixed(1)})
          </h4>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setHotspotType('navigation')}
              style={{
                flex: 1,
                padding: '6px',
                borderRadius: '8px',
                border: 'none',
                background: hotspotType === 'navigation' ? THEME.accent : THEME.surfaceAlt,
                color: hotspotType === 'navigation' ? '#fff' : THEME.textPrimary,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {t.navArrow}
            </button>
            <button
              onClick={() => setHotspotType('info')}
              style={{
                flex: 1,
                padding: '6px',
                borderRadius: '8px',
                border: 'none',
                background: hotspotType === 'info' ? THEME.accent : THEME.surfaceAlt,
                color: hotspotType === 'info' ? '#fff' : THEME.textPrimary,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {t.infoPoint}
            </button>
            <button
              onClick={() => setHotspotType('establish')}
              style={{
                flex: 1,
                padding: '6px',
                borderRadius: '8px',
                border: 'none',
                background: hotspotType === 'establish' ? THEME.accent : THEME.surfaceAlt,
                color: hotspotType === 'establish' ? '#fff' : THEME.textPrimary,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {t.introNarration}
            </button>
          </div>

          {hotspotType === 'navigation' && (
            <select
              value={targetRoomId}
              onChange={(e) => setTargetRoomId(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', background: THEME.surfaceAlt, color: THEME.textPrimary, border: '1px solid ' + THEME.borderStrong, fontSize: '13px' }}
            >
              <option value="">{t.targetRoom}</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{getLocalizedText(r.title_i18n, langRef.current) || `Soba ${r.id}`}</option>
              ))}
            </select>
          )}

          <input
            type="text"
            placeholder={t.titlePlaceholder}
            value={hotspotTitle}
            onChange={(e) => setHotspotTitle(e.target.value)}
            style={{ padding: '8px', borderRadius: '6px', background: THEME.surfaceAlt, color: THEME.textPrimary, border: '1px solid ' + THEME.borderStrong, fontSize: '13px' }}
          />

          <textarea
            placeholder={t.descPlaceholder}
            value={hotspotText}
            onChange={(e) => setHotspotText(e.target.value)}
            rows={2}
            style={{ padding: '8px', borderRadius: '6px', background: THEME.surfaceAlt, color: THEME.textPrimary, border: '1px solid ' + THEME.borderStrong, fontSize: '13px', resize: 'none' }}
          />

          <input
            type="text"
            placeholder={t.audioUrlPlaceholder}
            value={hotspotAudioUrl}
            onChange={(e) => setHotspotAudioUrl(e.target.value)}
            style={{ padding: '8px', borderRadius: '6px', background: THEME.surfaceAlt, color: THEME.textPrimary, border: '1px solid ' + THEME.borderStrong, fontSize: '13px' }}
          />
          <span style={{ fontSize: '11px', color: THEME.textSecondary, marginTop: '-6px' }}>
            🌐 Ovaj link važi samo za jezik: <b style={{ color: THEME.textPrimary }}>{lang.toUpperCase()}</b> (ostali jezici ostaju netaknuti ako ostaviš prazno)
          </span>

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button onClick={handleSaveHotspot} style={{ ...btnStyle, flex: 1, backgroundColor: THEME.accent, color: '#fff', borderColor: THEME.accent }}>
              {t.save}
            </button>
            {editingIndex !== null && (
              <button onClick={handleDeleteHotspot} style={{ ...btnStyle, backgroundColor: THEME.danger, color: '#fff', borderColor: THEME.danger }}>
                {t.delete}
              </button>
            )}
            <button onClick={handleCancelEdit} style={{ ...btnStyle, backgroundColor: THEME.surfaceAlt, color: THEME.textPrimary, borderColor: THEME.border }}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {roomLoading && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, backgroundColor: THEME.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px', padding: '20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: THEME.accent, borderRadius: '50%', animation: 'pulseDot 1.4s infinite ease-in-out both', animationDelay: '-0.32s' }} />
            <div style={{ width: '12px', height: '12px', backgroundColor: THEME.accent, borderRadius: '50%', animation: 'pulseDot 1.4s infinite ease-in-out both', animationDelay: '-0.16s' }} />
            <div style={{ width: '12px', height: '12px', backgroundColor: THEME.accent, borderRadius: '50%', animation: 'pulseDot 1.4s infinite ease-in-out both' }} />
          </div>
          <style>{`
            @keyframes pulseDot {
              0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
              40% { transform: scale(1.0); opacity: 1; }
            }
          `}</style>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '450px' }}>
            {tour?.agency_name && (
              <div style={{ color: THEME.accent, fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                {tour.agency_name}
              </div>
            )}
            <div style={{ color: THEME.textPrimary, fontSize: '16px', fontWeight: 600, letterSpacing: '0.5px' }}>
              {fullTourTitle}
            </div>
            <div style={{ color: THEME.accent, fontSize: '14px', letterSpacing: '0.5px' }}>
              {t.roomLoadingPrefix}<b style={{ color: THEME.textPrimary }}>{currentRoomTitle}</b>
            </div>
          </div>
        </div>
      )}

      {infoBoxData && !pendingCoords && !activeModal && (
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30,
          width: '94%',
          maxWidth: '520px',
          backgroundColor: THEME.surface,
          border: '1px solid ' + THEME.border,
          borderRadius: '18px',
          padding: '16px 18px',
          color: THEME.textPrimary,
          boxShadow: THEME.shadowLg
        }}>
          <button
            onClick={() => {
              stopAudio();
              setInfoBoxData(null);
              setIsInfoboxManuallyClosed(true);
            }}
            style={{
              position: 'absolute',
              top: '10px',
              right: '12px',
              background: 'transparent',
              border: 'none',
              color: THEME.textMuted,
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              padding: '2px 6px',
              lineHeight: '1',
              borderRadius: '4px',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = THEME.textPrimary)}
            onMouseLeave={(e) => (e.currentTarget.style.color = THEME.textMuted)}
            title={t.close}
          >
            ×
          </button>

          {displayedInfoTitle && (
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: THEME.accent, paddingRight: '22px', fontWeight: 600 }}>
              {displayedInfoTitle}
            </h3>
          )}
          <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: THEME.textPrimary, paddingRight: '12px' }}>
            {displayedInfoText}
          </p>
        </div>
      )}

      {/* MODAL: ADMIN LOGIN (Supabase Auth - zamena za staru ?admin=... lozinku) */}
      {showAdminLogin && !adminMode && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: THEME.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <form
            onSubmit={handleAdminLogin}
            style={{ backgroundColor: THEME.surface, border: '1px solid ' + THEME.border, borderRadius: '20px', width: '100%', maxWidth: '380px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: THEME.shadowLg }}
          >
            <h2 style={{ color: THEME.textPrimary, fontSize: '18px', margin: 0, fontWeight: 700 }}>🔒 Admin prijava</h2>

            <input
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              autoComplete="username"
              required
              style={{ padding: '10px', borderRadius: '8px', background: THEME.surfaceAlt, color: THEME.textPrimary, border: '1px solid ' + THEME.borderStrong, fontSize: '14px', boxSizing: 'border-box' }}
            />

            <input
              type="password"
              placeholder="Lozinka"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={{ padding: '10px', borderRadius: '8px', background: THEME.surfaceAlt, color: THEME.textPrimary, border: '1px solid ' + THEME.borderStrong, fontSize: '14px', boxSizing: 'border-box' }}
            />

            {loginError && (
              <p style={{ color: THEME.danger, fontSize: '13px', margin: 0 }}>{loginError}</p>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="submit"
                disabled={loginLoading}
                style={{ ...btnStyle, flex: 1, backgroundColor: THEME.accent, color: '#fff', borderColor: THEME.accent, padding: '10px' }}
              >
                {loginLoading ? 'Prijava...' : 'Prijavi se'}
              </button>
              <button
                type="button"
                onClick={() => setShowAdminLogin(false)}
                style={{ ...btnStyle, backgroundColor: THEME.surfaceAlt, color: THEME.textPrimary, borderColor: THEME.border }}
              >
                {t.cancel}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: PREGLED I IZMENA SRPSKO DRAFTA + ODABIR JEZIKA */}
      {showDraftModal && aiDraft && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: THEME.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: THEME.surface, border: '1px solid ' + THEME.border, borderRadius: '20px', width: '100%', maxWidth: '650px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: THEME.shadowLg }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid ' + THEME.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: THEME.textPrimary, fontSize: '18px', margin: 0, fontWeight: 700 }}>✏️ Pregled i Izmena AI Drafta (SR)</h2>
              <button onClick={() => setShowDraftModal(false)} style={{ ...btnStyle, backgroundColor: THEME.danger, color: '#fff', borderColor: THEME.danger, padding: '6px 12px' }}>Zatvori</button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              <div>
                <label style={{ fontSize: '12px', color: THEME.textSecondary, display: 'block', marginBottom: '4px', fontWeight: 600 }}>Naziv sobe (SR):</label>
                <input
                  type="text"
                  value={aiDraft.title}
                  onChange={(e) => setAiDraft({ ...aiDraft, title: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: THEME.surfaceAlt, color: THEME.textPrimary, border: '1px solid ' + THEME.borderStrong, fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: THEME.textSecondary, display: 'block', marginBottom: '4px', fontWeight: 600 }}>Uvodna naracija (SR):</label>
                <textarea
                  value={aiDraft.narration}
                  onChange={(e) => setAiDraft({ ...aiDraft, narration: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: THEME.surfaceAlt, color: THEME.textPrimary, border: '1px solid ' + THEME.borderStrong, fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: THEME.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 600 }}>Generisane tačke ({aiDraft.waypoints.length}):</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
                  {aiDraft.waypoints.map((wp, i) => (
                    <div key={i} style={{ backgroundColor: THEME.surfaceAlt, padding: '12px', borderRadius: '10px', fontSize: '13px', border: '1px solid ' + THEME.border, color: THEME.textPrimary, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ color: THEME.accent, fontWeight: 'bold' }}>Tačka {i + 1}:</span>
                      <input
                        type="text"
                        placeholder="Naslov tačke (SR)..."
                        value={getLocalizedText(wp.title_i18n, 'sr')}
                        onChange={(e) => {
                          const updatedWps = [...aiDraft.waypoints];
                          updatedWps[i] = {
                            ...updatedWps[i],
                            title_i18n: buildI18nObject(e.target.value, updatedWps[i].title_i18n, 'sr')
                          };
                          setAiDraft({ ...aiDraft, waypoints: updatedWps });
                        }}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: THEME.surface, color: THEME.textPrimary, border: '1px solid ' + THEME.borderStrong, fontSize: '12px', boxSizing: 'border-box' }}
                      />
                      <textarea
                        placeholder="Opis / Tekst tačke (SR)..."
                        value={getLocalizedText(wp.text_i18n, 'sr')}
                        onChange={(e) => {
                          const updatedWps = [...aiDraft.waypoints];
                          updatedWps[i] = {
                            ...updatedWps[i],
                            text_i18n: buildI18nObject(e.target.value, updatedWps[i].text_i18n, 'sr')
                          };
                          setAiDraft({ ...aiDraft, waypoints: updatedWps });
                        }}
                        rows={2}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: THEME.surface, color: THEME.textPrimary, border: '1px solid ' + THEME.borderStrong, fontSize: '12px', resize: 'vertical', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* SELEKCIJA CILJNIH JEZIKA DIREKTNO U MODALU */}
              <div style={{ backgroundColor: THEME.surfaceAlt, padding: '12px 14px', borderRadius: '10px', border: '1px solid ' + THEME.border }}>
                <label style={{ fontSize: '12px', color: THEME.accent, display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                  Prevedi i ubaci u scenu na sledeće jezike:
                </label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  {availableLanguages.map((l) => (
                    <label key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: THEME.textPrimary }}>
                      <input
                        type="checkbox"
                        checked={targetLanguages.includes(l)}
                        onChange={() => toggleTargetLanguage(l)}
                        style={{ accentColor: THEME.accent, width: '16px', height: '16px' }}
                      />
                      {l.toUpperCase()} {l === 'sr' && '(Maternji)'}
                    </label>
                  ))}
                </div>
              </div>

              {/* SELEKCIJA JEZIKA ZA AI GLASOVNU NARACIJU (OPCIONO) */}
              <div style={{ backgroundColor: THEME.surfaceAlt, padding: '12px 14px', borderRadius: '10px', border: '1px solid ' + THEME.border }}>
                <label style={{ fontSize: '12px', color: '#7c3aed', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                  🎙️ Generiši AI glasovnu naraciju (MP3) za sledeće jezike (opciono):
                </label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {availableLanguages
                    .filter((l) => targetLanguages.includes(l))
                    .map((l) => (
                      <label key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: THEME.textPrimary }}>
                        <input
                          type="checkbox"
                          checked={voiceLanguages.includes(l)}
                          onChange={() => toggleVoiceLanguage(l)}
                          style={{ accentColor: '#7c3aed', width: '16px', height: '16px' }}
                        />
                        {l.toUpperCase()}
                      </label>
                    ))}
                </div>
                <p style={{ fontSize: '11px', color: THEME.textSecondary, margin: '8px 0 0 0' }}>
                  {voiceLanguages.length === 0
                    ? 'Nijedan jezik nije izabran - glas se neće generisati (biće samo tekst).'
                    : `Glas će biti generisan za: ${voiceLanguages.map((l) => l.toUpperCase()).join(', ')}. Ovo može potrajati.`}
                </p>
              </div>
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid ' + THEME.border, display: 'flex', gap: '10px' }}>
              <button
                onClick={handleConfirmDraftAndProcess}
                style={{ ...btnStyle, flex: 1, backgroundColor: THEME.accent, color: '#fff', borderColor: THEME.accent, padding: '12px', fontSize: '14px', fontWeight: 'bold' }}
              >
                🚀 Potvrdi Draft & Pokreni Prevođenje
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SAMOSTALNO GENERISANJE/OSVEŽAVANJE AI GLASA ZA POSTOJEĆI SADRŽAJ */}
      {showVoiceModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: THEME.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: THEME.surface, border: '1px solid ' + THEME.border, borderRadius: '20px', width: '100%', maxWidth: '420px', overflow: 'hidden', boxShadow: THEME.shadowLg }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid ' + THEME.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: '#7c3aed', fontSize: '17px', margin: 0, fontWeight: 700 }}>🎙️ AI Glasovna Naracija</h2>
              <button onClick={() => setShowVoiceModal(false)} style={{ ...btnStyle, backgroundColor: THEME.surfaceAlt, color: THEME.textPrimary, borderColor: THEME.border, padding: '6px 12px' }}>
                {t.cancel}
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: THEME.textSecondary, lineHeight: '1.5' }}>
                Generiše (ili osvežava) AI glas na osnovu <b>trenutno sačuvanog</b> teksta u ovoj sobi
                (uvodna naracija + info-tačke), za jezike koje izabereš. Postojeći MP3 za taj jezik biće
                zamenjen novim.
              </p>

              <div>
                <label style={{ fontSize: '12px', color: '#7c3aed', display: 'block', marginBottom: '8px', fontWeight: 700 }}>
                  Za koje jezike da generišem glas:
                </label>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {availableLanguages.map((l) => (
                    <label key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: THEME.textPrimary }}>
                      <input
                        type="checkbox"
                        checked={voiceLanguages.includes(l)}
                        onChange={() => toggleVoiceLanguage(l)}
                        style={{ accentColor: '#7c3aed', width: '16px', height: '16px' }}
                      />
                      {l.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid ' + THEME.border }}>
              <button
                onClick={handleGenerateVoiceForRoom}
                disabled={voiceLanguages.length === 0}
                style={{
                  ...btnStyle,
                  width: '100%',
                  backgroundColor: voiceLanguages.length === 0 ? THEME.surfaceAlt : '#7c3aed',
                  color: voiceLanguages.length === 0 ? THEME.textMuted : '#fff',
                  borderColor: '#7c3aed',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: voiceLanguages.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                🎙️ Generiši Glas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DODAVANJE (PREVOĐENJE) SOBE NA DODATNI JEZIK U BILO KOM TRENUTKU */}
      {showAddLanguageModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: THEME.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: THEME.surface, border: '1px solid ' + THEME.border, borderRadius: '20px', width: '100%', maxWidth: '420px', overflow: 'hidden', boxShadow: THEME.shadowLg }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid ' + THEME.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: THEME.accent, fontSize: '17px', margin: 0, fontWeight: 700 }}>🌐 Dodaj Jezik</h2>
              <button onClick={() => { setShowAddLanguageModal(false); setAddLanguageTargets([]); }} style={{ ...btnStyle, backgroundColor: THEME.surfaceAlt, color: THEME.textPrimary, borderColor: THEME.border, padding: '6px 12px' }}>
                {t.cancel}
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: THEME.textSecondary, lineHeight: '1.5' }}>
                Prevodi <b>trenutno sačuvan srpski sadržaj</b> ove sobe (naslov, uvodna naracija, tačke) na
                izabrane jezike i dodaje ih uz postojeće - ništa se ne briše. Ako jezik već ima prevod, biće
                zamenjen novim.
              </p>

              <div>
                <label style={{ fontSize: '12px', color: THEME.accent, display: 'block', marginBottom: '8px', fontWeight: 700 }}>
                  Za koje jezike da prevedem ovu sobu:
                </label>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {availableLanguages
                    .filter((l) => l !== 'sr')
                    .map((l) => (
                      <label key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: THEME.textPrimary }}>
                        <input
                          type="checkbox"
                          checked={addLanguageTargets.includes(l)}
                          onChange={() => toggleAddLanguageTarget(l)}
                          style={{ accentColor: THEME.accent, width: '16px', height: '16px' }}
                        />
                        {l.toUpperCase()} {roomHasLanguageContent(currentRoom, l) ? '✅' : '○'}
                      </label>
                    ))}
                </div>
                <p style={{ fontSize: '11px', color: THEME.textSecondary, margin: '10px 0 0 0' }}>
                  ✅ = već postoji prevod za taj jezik u ovoj sobi (biće osvežen). ○ = jezik još ne postoji u
                  ovoj sobi.
                </p>
              </div>
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid ' + THEME.border }}>
              <button
                onClick={handleTranslateRoomLanguages}
                disabled={addLanguageTargets.length === 0}
                style={{
                  ...btnStyle,
                  width: '100%',
                  backgroundColor: addLanguageTargets.length === 0 ? THEME.surfaceAlt : THEME.accent,
                  color: addLanguageTargets.length === 0 ? THEME.textMuted : '#fff',
                  borderColor: THEME.accent,
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: addLanguageTargets.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                🌐 Prevedi i Sačuvaj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROGRESS PREVOĐENJA / GENERISANJA GLASA / UPLOAD-A PANORAME */}
      {(translationProgress || voiceProgress || panoramaUploadProgress) && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 110, backgroundColor: THEME.overlay, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: THEME.surface, border: '1px solid ' + THEME.border, borderRadius: '20px', padding: '28px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', boxShadow: THEME.shadowLg, maxWidth: '360px', textAlign: 'center' }}>
            <div style={{ width: '16px', height: '16px', backgroundColor: THEME.accent, borderRadius: '50%', animation: 'pulseDot 1.4s infinite ease-in-out both' }} />
            <div style={{ color: THEME.textPrimary, fontSize: '18px', fontWeight: 'bold' }}>{voiceProgress || panoramaUploadProgress || translationProgress}</div>
            <p style={{ color: THEME.textSecondary, fontSize: '13px' }}>
              {voiceProgress
                ? 'Molimo vas sačekajte, generisanje AI glasa je u toku...'
                : panoramaUploadProgress
                ? 'Molimo vas sačekajte, upload na Cloudflare je u toku...'
                : 'Molimo vas sačekajte, prevođenje i upis u bazu su u toku...'}
            </p>
          </div>
        </div>
      )}

      {hasMounted && activeModal && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 80, backgroundColor: THEME.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: THEME.surface, border: '1px solid ' + THEME.border, borderRadius: '20px', width: '100%', maxWidth: '680px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: THEME.shadowLg }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid ' + THEME.border }}>
              <h2 style={{ color: THEME.textPrimary, fontSize: '20px', margin: 0, fontWeight: 700 }}>
                {activeModal === 'plan' && t.btnPlan}
                {activeModal === 'location' && t.btnLocation}
                {activeModal === 'about' && t.btnAbout}
                {activeModal === 'faq' && t.btnFaq}
                {activeModal === 'contact' && t.btnContact}
              </h2>
              <button onClick={() => { setActiveModal(null); setSelectedFaq(null); }} style={{ ...btnStyle, backgroundColor: THEME.danger, color: '#fff', borderColor: THEME.danger, padding: '8px 16px', fontSize: '14px' }}>
                {t.close}
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, color: THEME.textPrimary, fontSize: '16px' }}>
              {activeModal === 'plan' && (
                tour?.floorplan_url ? (
                  <div>
                    {adminMode && (
                      <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: THEME.accent, fontWeight: 600, textAlign: 'center' }}>
                        🖊️ Klikni na skicu da postaviš oznaku za trenutnu sobu: <b>{currentRoomTitle}</b>
                      </p>
                    )}
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <img
                        src={tour.floorplan_url}
                        alt="Floorplan"
                        onClick={adminMode ? handleSetFloorplanMarker : undefined}
                        style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '12px', cursor: adminMode ? 'crosshair' : 'default', display: 'block' }}
                      />
                      {rooms
                        .filter((r) => typeof r.floorplan_x === 'number' && typeof r.floorplan_y === 'number')
                        .map((r) => {
                          const isCurrent = r.id === currentRoom?.id;
                          return (
                            <button
                              key={r.id}
                              title={getLocalizedText(r.title_i18n, lang)}
                              onClick={(e) => {
                                e.stopPropagation();
                                changeRoomById(r.id);
                                setActiveModal(null);
                              }}
                              style={{
                                position: 'absolute',
                                left: `${r.floorplan_x}%`,
                                top: `${r.floorplan_y}%`,
                                transform: 'translate(-50%, -50%)',
                                width: isCurrent ? '18px' : '14px',
                                height: isCurrent ? '18px' : '14px',
                                borderRadius: '50%',
                                backgroundColor: isCurrent ? THEME.accent : THEME.surface,
                                border: '2px solid ' + (isCurrent ? '#fff' : THEME.accent),
                                boxShadow: THEME.shadowLg,
                                cursor: 'pointer',
                                padding: 0
                              }}
                            />
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: THEME.textMuted, fontSize: '16px' }}>{t.noPlan}</p>
                )
              )}

              {activeModal === 'location' && (
                tour?.location_map_url ? (
                  <div style={{ width: '100%', height: '380px', borderRadius: '12px', overflow: 'hidden' }}>
                    <iframe src={tour.location_map_url} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: THEME.textMuted, fontSize: '16px' }}>{t.noLocation}</p>
                )
              )}

              {activeModal === 'about' && (
                aboutText ? (
                  <p style={{ margin: 0, lineHeight: '1.6', color: THEME.textPrimary, whiteSpace: 'pre-wrap', fontSize: '16px' }}>{aboutText}</p>
                ) : (
                  <p style={{ textAlign: 'center', color: THEME.textMuted, fontSize: '16px' }}>{t.noAbout}</p>
                )
              )}

              {activeModal === 'faq' && (
                faqList.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {faqList.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedFaq(index)}
                        style={{
                          textAlign: 'left',
                          backgroundColor: THEME.surfaceAlt,
                          border: '1px solid ' + THEME.border,
                          borderRadius: '12px',
                          padding: '14px 16px',
                          color: THEME.textPrimary,
                          fontSize: '16px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          width: '100%',
                          lineHeight: '1.4'
                        }}
                      >
                        {item.question}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: THEME.textMuted, fontSize: '16px' }}>{t.noFaq}</p>
                )
              )}

              {activeModal === 'contact' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px' }}>
                  {tour?.agent_name && (
                    <div style={{ backgroundColor: THEME.surfaceAlt, padding: '16px', borderRadius: '12px', border: '1px solid ' + THEME.border }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: THEME.textSecondary }}>{t.agentLabel}</p>
                      <p style={{ margin: 0, fontSize: '17px', fontWeight: 'bold', color: THEME.textPrimary }}>{tour.agent_name}</p>
                    </div>
                  )}

                  {tour?.agent_phone && (
                    <div style={{ backgroundColor: THEME.surfaceAlt, padding: '16px', borderRadius: '12px', border: '1px solid ' + THEME.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: THEME.textSecondary }}>{t.phoneLabel}</p>
                        <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: THEME.textPrimary }}>{tour.agent_phone}</p>
                      </div>
                      <a href={`tel:${tour.agent_phone}`} style={{ ...btnStyle, backgroundColor: THEME.accent, color: '#fff', borderColor: THEME.accent, textDecoration: 'none', padding: '10px 18px', fontSize: '14px' }}>
                        {t.callBtn}
                      </a>
                    </div>
                  )}

                  {tour?.agent_email && (
                    <div style={{ backgroundColor: THEME.surfaceAlt, padding: '16px', borderRadius: '12px', border: '1px solid ' + THEME.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ overflow: 'hidden', paddingRight: '8px' }}>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: THEME.textSecondary }}>{t.emailLabel}</p>
                        <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: THEME.textPrimary, textOverflow: 'ellipsis', overflow: 'hidden' }}>{tour.agent_email}</p>
                      </div>
                      <a href={`mailto:${tour.agent_email}`} style={{ ...btnStyle, backgroundColor: THEME.accent, color: '#fff', borderColor: THEME.accent, textDecoration: 'none', padding: '10px 18px', fontSize: '14px', flexShrink: 0 }}>
                        {t.emailBtn}
                      </a>
                    </div>
                  )}

                  {tour?.agency_name && (
                    <div style={{ backgroundColor: THEME.surfaceAlt, padding: '16px', borderRadius: '12px', border: '1px solid ' + THEME.border }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: THEME.textSecondary }}>{t.agencyLabel}</p>
                      <p style={{ margin: 0, fontSize: '17px', fontWeight: 'bold', color: THEME.textPrimary }}>{tour.agency_name}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {hasMounted && selectedFaq !== null && faqList[selectedFaq] && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 90, backgroundColor: THEME.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: THEME.surface, border: '1px solid ' + THEME.border, borderRadius: '20px', width: '100%', maxWidth: '520px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: THEME.shadowLg }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid ' + THEME.border }}>
              <h3 style={{ color: THEME.textPrimary, fontSize: '17px', margin: 0, paddingRight: '12px', fontWeight: 600 }}>
                {faqList[selectedFaq].question}
              </h3>
              <button onClick={() => setSelectedFaq(null)} style={{ ...btnStyle, backgroundColor: THEME.danger, color: '#fff', borderColor: THEME.danger, flexShrink: 0, padding: '8px 14px', fontSize: '13px' }}>
                {t.close}
              </button>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, color: THEME.textPrimary, fontSize: '16px' }}>
              <p style={{ margin: 0, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {faqList[selectedFaq].answer || t.comingSoon}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}