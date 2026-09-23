'use client';

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { preload } from 'react-dom';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { Language, Waypoint, ActiveModal } from './types';
import { translations } from './translations';
import { THEME, GLASS, applyGlassHotspotStyle } from './theme';
import { SITE_URL } from '../../lib/site';
import { trackEvent } from '../../lib/track';
import { pickCoverRoom } from '../../lib/coverRoom';
import { Logo } from './Logo';
import { RoomNavBar, type RoomDot } from './RoomNavBar';
import { WelcomeScreen } from './WelcomeScreen';
import { CallAgentButton, InfoCard, LanguageChips, OverlayButtons, StatusNotice, TourTitleCard } from './TourControls';
import { TourMenuBar } from './TourMenuBar';
import { ViewingRequestModal } from './ViewingRequestModal';
import { FaqAnswerModal, TourModals } from './TourModals';
import { AdminLoginModal, HotspotForm } from './TourAdminPanels';
import { useTourData } from './useTourData';
import { useAdminSession } from './useAdminSession';
import { useHotspotEditor, type RefreshHotspots } from './useHotspotEditor';
import { useRoomNavigation } from './useRoomNavigation';
import { runRoomSequence } from './roomSequence';
import { AdminCrosshair, DragHint, RoomLoadingScreen, TourGlobalStyles, useFirstTimeDragHint } from './TourOverlays';
import { useNeighbourPreload, useTourAnalytics } from './useTourAnalytics';
import { useViewerControls } from './useViewerControls';
import { useTourNarration } from './useTourNarration';
import { LockedTourScreen } from './LockedTourScreen';
import { FloorplanMiniMap } from './FloorplanMiniMap';
import { withoutEmoji } from './icons';
import { formatListingPrice } from '../../lib/listingPrice';
import { ALL_LANGUAGES, isLanguageAvailable as isLanguageAvailableFor } from './tourLanguages';
import { PANNELLUM_CSS, PANNELLUM_JS } from './pannellum';
import {
  ARRIVE_HFOV,
  DEFAULT_HFOV,
  ENTRY_START_HFOV,
  FADE_MS,
  INFO_HFOV,
  SLOW_LOAD_HINT_MS,
  VIEW_MAX_HFOV,
  VIEW_MIN_HFOV,
  pickHfov,
  scaledHfov,
  wait,
  type PendingTransition
} from './transition';
import {
  normalizeYaw,
  getLocalizedText,
  parseWaypoints,
  parseEstablish,
  buildFactList,
  buildFaqList,
  Centered
} from './utils';

// Admin alati (AI popuna, jezici, glas, otpremanje panorame) su poseban chunk
// koji se skida tek kad postoji admin sesija - posetilac ga nikad ne dobija.
const TourAdminTools = dynamic(() => import('./TourAdminTools'), { ssr: false });

// Uklanja sloj jedne scene: Pannellum viewer i njegov div.
function disposeLayer(layer: { viewer: any; el: HTMLDivElement } | null) {
  if (!layer) return;
  try { layer.viewer?.destroy(); } catch {}
  layer.el.remove();
}


export default function TourPage() {
  // Pri renderovanju na serveru ovo postaje <link rel="preload"> u <head>, pa
  // pregledač skida Pannellum paralelno sa ostatkom strane.
  preload(PANNELLUM_JS, { as: 'script' });
  preload(PANNELLUM_CSS, { as: 'style' });

  const [hasMounted, setHasMounted] = useState(false);
  const isMountedRef = useRef(true);
  const roomSessionRef = useRef(0);

  const [tourStarted, setTourStarted] = useState(false);
  const [lang, setLang] = useState<Language>('sr');

  // Mesto u gornjoj traci u koje TourAdminTools crta svoja dugmad. State, a
  // ne ref, da bi se admin alati ponovo iscrtali kad se mesto pojavi.
  const [adminToolbarSlot, setAdminToolbarSlot] = useState<HTMLSpanElement | null>(null);

  const langRef = useRef<Language>('sr');

  // ---- Prelaz između soba (vidi transition.ts) --------------------------
  // Šta sledeća scena treba da uradi; postavlja changeRoomById, a troši
  // efekat koji pravi scenu. Dok je postavljeno, stara scena se NE uništava
  // nego ostaje na ekranu da bi se pretopila u novu.
  const pendingTransitionRef = useRef<PendingTransition | null>(null);
  // Sloj (div) sa Pannellum-om trenutne scene, i sloj stare scene koja se
  // upravo pretapa. Svaka scena ima svoj sloj unutar #panorama.
  const currentLayerRef = useRef<HTMLDivElement | null>(null);
  const fadingLayerRef = useRef<{ viewer: any; el: HTMLDivElement } | null>(null);
  // Svaki novi prelaz ili klik na sobu poništava prelaz koji se još
  // približava vratima - da se ne desi dupla promena sobe.
  const walkTokenRef = useRef(0);
  const walkingRef = useRef(false);
  // Mali natpis "Ulazimo u prostoriju" samo kad nova soba kasni.
  const [slowRoomLoad, setSlowRoomLoad] = useState(false);


  const t = translations[lang];

  const params = useParams();
  const slug = params?.slug as string;

  // Tura i sobe iz baze - vidi useTourData.ts.
  const { tour, setTour, rooms, setRooms, loading, error, setError } = useTourData(
    slug,
    hasMounted,
    isMountedRef,
    langRef
  );
  const [roomIdx, setRoomIdx] = useState(0);
  const [roomLoading, setRoomLoading] = useState(false);


  const [pannellumReady, setPannellumReady] = useState(false);
  // Admin režim i prijava - vidi useAdminSession.ts.
  const {
    adminMode,
    adminModeRef,
    adminRequested,
    showAdminLogin,
    setShowAdminLogin,
    loginForm,
    handleAdminLogin
  } = useAdminSession();


  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);


  // Deljenje linka ture (Web Share API na mobilnom, kopiranje u clipboard
  // kao fallback na desktopu). shareCopied prikazuje kratku potvrdu.
  const [shareCopied, setShareCopied] = useState(false);


  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [showViewing, setShowViewing] = useState(false);
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null);
  const [isRoomTourFullyCompleted, setIsRoomTourFullyCompleted] = useState(false);
  const [isInfoboxManuallyClosed, setIsInfoboxManuallyClosed] = useState(false);


  const [infoBoxData, setInfoBoxData] = useState<{ titleRaw?: unknown; textRaw: unknown; index?: number; audio_url?: unknown } | null>(null);

  const viewerRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const sequenceActiveRef = useRef<boolean>(false);
  const isInterruptedRef = useRef<boolean>(false);

  // Ceo ekran i žiroskop - vidi useViewerControls.ts
  const {
    isFullscreen,
    isGyroActive,
    isGyroActiveRef,
    toggleGyroscope,
    toggleFullscreen
  } = useViewerControls(viewerRef);

  // Admin uređivanje tačaka i oznaka na tlocrtu - vidi useHotspotEditor.ts.
  // refreshViewerHotspots (niže) se upisuje u ref jer zavisi od ovog hook-a.
  const refreshHotspotsRef = useRef<RefreshHotspots | null>(null);
  const {
    pendingCoords,
    handleStartEditWaypoint,
    handleViewerClick,
    handleSetFloorplanMarker,
    formProps: hotspotFormProps
  } = useHotspotEditor({ rooms, setRooms, roomIdx, viewerRef, langRef, refreshHotspotsRef });

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

  // Naracija (audio + tekst) - vidi useTourNarration.ts
  const {
    stopAudio,
    playNarration,
    pauseForMute,
    resumeAfterMute,
    restartInCurrentLanguage,
    resetPosition,
    scheduleAfterNarration
  } = useTourNarration({ isMountedRef, langRef, isMutedRef, onNarrationChange: setInfoBoxData });

  // Kretanje između soba (klik, tačka, strelice, tlocrt) i automatski
  // vodič - vidi useRoomNavigation.ts.
  const {
    guideMode,
    guideModeRef,
    guideStepIdx,
    guideSteps,
    hasGuide,
    guideProgress,
    prevGuideStepIdx,
    guideRequested,
    setGuideRequested,
    guideFinished,
    isGuidePaused,
    isGuidePausedRef,
    seenRoomIds,
    sceneReadyRef,
    visitedGuideRoomsRef,
    roomSequenceFinishedRef,
    takeManualControl,
    changeRoomById,
    walkToRoom,
    nextGuideDoor,
    advanceGuide,
    toggleGuideMode,
    goPrev,
    goNext,
    startTour,
    startTourGuided,
    togglePauseGuide,
    waitWhilePaused
  } = useRoomNavigation({
    tour,
    rooms,
    roomIdx,
    setRoomIdx,
    tourStarted,
    setTourStarted,
    setRoomLoading,
    isMountedRef,
    roomSessionRef,
    sequenceActiveRef,
    isInterruptedRef,
    viewerRef,
    pendingTransitionRef,
    fadingLayerRef,
    walkTokenRef,
    walkingRef,
    resetPosition,
    stopCurrentAnimation,
    stopAudio,
    setInfoBoxData,
    setIsRoomTourFullyCompleted,
    setIsInfoboxManuallyClosed,
    pauseForMute,
    resumeAfterMute
  });

  // Gradi konfiguraciju JEDNE hotspot tačke (tooltip stil + šta se dešava na
  // klik) - deli je refreshViewerHotspots (dodaje na već postojeći viewer)
  // i efekat koji pravi novu scenu (formattedHotspots pri kreiranju
  // viewer-a), da se ova logika ne duplira i ne razmine na dva mesta.
  const buildHotspotConfig = useCallback((wp: Waypoint, index: number, lang: Language) => {
    const isNav = wp.type === 'navigation' || Boolean(wp.targetRoomId);

    let tooltipText = getLocalizedText(wp.title_i18n, lang);
    if (!tooltipText && !isNav) {
      tooltipText = getLocalizedText(wp.text_i18n, lang);
      if (tooltipText.length > 40) tooltipText = tooltipText.substring(0, 40) + '...';
    }
    if (isNav && !tooltipText && wp.targetRoomId) {
      const targetRoomObj = rooms.find(r => r.id == wp.targetRoomId);
      if (targetRoomObj) tooltipText = getLocalizedText(targetRoomObj.title_i18n, lang);
    }

    return {
      id: `hotspot-${index}`,
      pitch: wp.pitch || 0,
      yaw: wp.yaw || 0,
      createTooltipFunc: (hotSpotDiv: HTMLDivElement) => {
        hotSpotDiv.classList.add(isNav ? 'custom-nav-hotspot' : 'custom-info-hotspot');
        applyGlassHotspotStyle(hotSpotDiv, isNav, tooltipText);
      },
      text: tooltipText,
      clickHandlerFunc: () => {
        if (adminModeRef.current) {
          handleStartEditWaypoint(index);
        } else if (isNav && wp.targetRoomId) {
          walkToRoom(wp);
        } else if (!isNav) {
          // Ručni klik na info-tačku tokom automatskog vođenja: vodič je
          // sve tačke već sam obilazio, pa ovo znači da je posetilac
          // preuzeo kontrolu - vidi komentar uz takeManualControl.
          takeManualControl();
          isInterruptedRef.current = true;
          stopCurrentAnimation();
          resetPosition();
          if (viewerRef.current) viewerRef.current.setHfov(pickHfov(INFO_HFOV));
          playNarration(wp.audio_url_i18n ?? wp.audio_url, wp.text_i18n, wp.title_i18n, index, 0);
        }
      }
    };
  }, [rooms, handleStartEditWaypoint, resetPosition, walkToRoom, playNarration, stopCurrentAnimation, takeManualControl]);

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
      viewerRef.current.addHotSpot(buildHotspotConfig(wp, index, l));
    });
  }, [buildHotspotConfig]);
  // Čita ga useHotspotEditor (pregled pomeranja, čuvanje, brisanje tačke).
  // useLayoutEffect: izvršava se pre običnih efekata, pa je ref svež i za
  // efekat pregleda u hook-u iz istog prolaza.
  useLayoutEffect(() => {
    refreshHotspotsRef.current = refreshViewerHotspots;
  }, [refreshViewerHotspots]);

  const changeLanguage = useCallback((l: Language) => {
    setLang(l);
    langRef.current = l;

    const currentRoom = rooms[roomIdx];
    if (currentRoom) {
      const waypointsList = parseWaypoints(currentRoom.waypoints_i18n);
      refreshViewerHotspots(waypointsList, l);
    }

    // Naracija koja je u toku odmah prelazi na NOVI jezik, od početka (dužine
    // prevoda se razlikuju, pa nastavljanje od iste sekunde nema smisla), a
    // sekvenca ture i dalje čeka isto obećanje - vidi useTourNarration.
    restartInCurrentLanguage();
  }, [rooms, roomIdx, refreshViewerHotspots, restartInCurrentLanguage]);

  // TourAdminTools javlja kad je napravio sobu: tura bez soba je do tada
  // stajala na ekranu sa greškom "nema soba", a sad treba da krene.
  const handleAdminRoomCreated = () => {
    setError('');
    setTourStarted(true);
  };

  // Koji jezici se nude - vidi tourLanguages.ts.
  const isLanguageAvailable = (l: Language): boolean => isLanguageAvailableFor(l, tour, rooms);
  // Jezik iz linka (?lang=en) - sa engleske početne strane, ili kad agencija
  // deli turu na nemačkom. Primenjuje se jednom, čim su tura i sobe učitane,
  // i samo ako tura stvarno ima taj jezik; inače ostaje srpski.
  const urlLangAppliedRef = useRef(false);
  useEffect(() => {
    if (loading || urlLangAppliedRef.current) return;
    urlLangAppliedRef.current = true;
    const requested = new URLSearchParams(window.location.search).get('lang') as Language | null;
    if (requested && requested !== 'sr' && ['en', 'de', 'ru'].includes(requested) && isLanguageAvailable(requested)) {
      setLang(requested);
      langRef.current = requested;
    }
    // isLanguageAvailable čita tour/rooms iz istog rendera u kom je loading
    // postao false - to je baš trenutak koji nam treba.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    isMountedRef.current = true;
    setHasMounted(true);
    setGuideRequested(new URLSearchParams(window.location.search).get('vodic') === '1');

    return () => {
      isMountedRef.current = false;
      stopAudio();
      stopCurrentAnimation();
      if (viewerRef.current) {
        try { viewerRef.current.destroy(); } catch {}
        viewerRef.current = null;
      }
      // Scena koja se upravo pretapala, ako se iz ture izađe usred prelaza.
      disposeLayer(fadingLayerRef.current);
      fadingLayerRef.current = null;
    };
  }, [stopAudio, stopCurrentAnimation]);

  // Merenje poseta i unapred skidanje susednih soba - vidi useTourAnalytics.ts.
  useTourAnalytics({ slug, tour, adminMode, tourStarted, rooms, roomIdx, lang, langRef, activeModal });
  useNeighbourPreload(tourStarted, rooms, roomIdx);
  // "Prevucite prstom da razgledate" pri prvom ulasku - vidi TourOverlays.tsx.
  const showDragHint = useFirstTimeDragHint(tourStarted);

  // Deljenje linka trenutne ture: na mobilnom otvara native share meni
  // (WhatsApp, Viber, SMS, mejl...) preko Web Share API-ja; na desktopu (ili
  // ako share API nije dostupan) kopira link u clipboard i prikazuje kratku
  // potvrdu na dugmetu.
  const handleShareTour = async () => {
    // Namerno se ne koristi window.location.href: tura se otvara i preko
    // 360-tura.vercel.app ili app.kvadrat360.com, pa bi se delio taj domen
    // umesto brendiranog. Query se odbacuje da ?admin=1 ne ode klijentu.
    const url = `${SITE_URL}${window.location.pathname}`;
    const shareTitle = getLocalizedText(tour?.title_i18n, lang) || 'Kvadrat360';

    if (slug && !adminMode) trackEvent({ eventType: 'share', tourSlug: slug, lang });

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: 'Pogledaj 360° virtuelnu turu:', url });
      } catch {
        // Korisnik je otkazao share meni - nema potrebe za greškom.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      window.prompt('Kopiraj link ture:', url);
    }
  };

  const toggleMute = () => {
    const nextMuteState = !isMutedRef.current;
    isMutedRef.current = nextMuteState;
    setIsMuted(nextMuteState);

    // Pauza čuva mesto i obećanje, pa se ista naracija nastavlja kad se zvuk
    // vrati - sekvenca ture se zbog isključenog zvuka ne prekida.
    if (nextMuteState) {
      pauseForMute();
    } else {
      resumeAfterMute();
    }
  };


  useEffect(() => {
    if (!hasMounted) return;
    if ((window as any).pannellum) { setPannellumReady(true); return; }

    // Pri prelasku sa ture na turu stil je već tu - ne dodajemo ga ponovo.
    if (!document.querySelector(`link[rel="stylesheet"][href="${PANNELLUM_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = PANNELLUM_CSS;
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = PANNELLUM_JS;
    script.onload = () => setPannellumReady(true);
    document.body.appendChild(script);

    return () => {
      stopAudio();
      stopCurrentAnimation();
    };
  }, [hasMounted, stopAudio, stopCurrentAnimation]);

  useEffect(() => {
    if (!tourStarted || rooms.length === 0 || !pannellumReady || !hasMounted) return;

    const currentSession = ++roomSessionRef.current;
    // Nova soba, nova sekvenca - dosadašnje "mirujemo" više ne važi.
    roomSequenceFinishedRef.current = false;
    sceneReadyRef.current = false;
    const currentRoom = rooms[roomIdx];
    const resolvedPanoramaUrl = currentRoom?.panorama_url_cf || currentRoom?.panorama_url;

    // Prelaz iz druge sobe (vidi transition.ts): stara scena je već sklonjena
    // u fadingLayerRef i ostaje na ekranu dok se ova ne učita.
    const transition = pendingTransitionRef.current;
    pendingTransitionRef.current = null;
    const crossfade = Boolean(transition && fadingLayerRef.current);
    // Ovaj korak je pokrenuo automatski vodič (guidePath.ts), ne ručan klik -
    // odlučuje da li se već predstavljena soba samo tiho prođe (v.on('load')).
    const isGuidedStep = Boolean(transition?.guided);

    const panoramaContainer = document.getElementById('panorama');
    if (!resolvedPanoramaUrl || !panoramaContainer) {
      disposeLayer(fadingLayerRef.current);
      fadingLayerRef.current = null;
      return;
    }

    // Veliki ekran "Ulazimo u prostoriju" samo za prvu sobu; pri prelazu
    // stara scena ostaje vidljiva, a mali natpis se pojavi tek ako kasni.
    let slowHintTimer: ReturnType<typeof setTimeout> | null = null;
    // Nova scena ove šetnje čeka ispod stare dok kamera ne stigne do vrata
    // (vidi walkToRoom) - "kasni" se računa tek od tog trenutka.
    const holdUntil = crossfade && transition?.revealAt ? transition.revealAt : 0;
    if (crossfade) {
      slowHintTimer = setTimeout(() => {
        if (isMountedRef.current && currentSession === roomSessionRef.current) setSlowRoomLoad(true);
      }, SLOW_LOAD_HINT_MS + Math.max(0, holdUntil - Date.now()));
    } else {
      setRoomLoading(true);
    }
    sequenceActiveRef.current = true;
    isInterruptedRef.current = false;
    setIsInfoboxManuallyClosed(false);
    setInfoBoxData(null);

    if (viewerRef.current) {
      try { viewerRef.current.destroy(); } catch {}
      viewerRef.current = null;
    }
    if (!crossfade) {
      disposeLayer(fadingLayerRef.current);
      fadingLayerRef.current = null;
      panoramaContainer.innerHTML = '';
    }

    // Svaka scena dobija svoj sloj; nova ide ISPOD stare koja se pretapa.
    const layer = document.createElement('div');
    layer.style.cssText = 'position:absolute;inset:0;z-index:1;';
    // Skrivena scena ne sme da hvata prevlačenje - pomerila bi pogled
    // koji posetilac još ne vidi.
    if (holdUntil) layer.style.pointerEvents = 'none';
    panoramaContainer.appendChild(layer);
    currentLayerRef.current = layer;

    const waypointsList = parseWaypoints(currentRoom.waypoints_i18n);
    const establishData = parseEstablish(currentRoom.establish_i18n);

    const formattedHotspots = waypointsList.map((wp, index) =>
      buildHotspotConfig(wp, index, langRef.current)
    );

    const targetEstablishYaw = normalizeYaw(establishData.fromYaw ?? 0);
    const targetEstablishPitch = establishData.pitch ?? 0;

    // Posle prolaska kroz vrata posetilac gleda u smeru kretanja; inače soba
    // kreće od svog početnog pogleda (establish).
    const entry = transition?.entry ?? null;
    const zoomedIn = Boolean(transition?.zoomedIn);
    const startYaw = entry ? entry.yaw : targetEstablishYaw;
    const startPitch = entry ? entry.pitch : targetEstablishPitch;

    const v = (window as any).pannellum.viewer(layer, {
      type: 'equirectangular',
      panorama: resolvedPanoramaUrl,
      autoLoad: true,
      showControls: false,
      hfov: zoomedIn ? scaledHfov(ARRIVE_HFOV) : pickHfov(DEFAULT_HFOV),
      minHfov: VIEW_MIN_HFOV,
      maxHfov: VIEW_MAX_HFOV,
      yaw: startYaw,
      pitch: startPitch,
      autoRotate: 0,
      hotSpots: formattedHotspots,
      loadingHtml: ''
    });
    viewerRef.current = v;

    // ADMIN: klik u panoramu dodaje novu tačku ili pomera onu koja se menja.
    v.on('mouseup', (e: MouseEvent) => {
      if (!adminModeRef.current || e.button !== 0) return;
      // VAŽNO: Pannellum vraća [pitch, yaw] (ne [yaw, pitch])!
      const coords = v.mouseEventToCoords(e);
      if (coords) handleViewerClick(coords[0], coords[1]);
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

    // Stara scena (iznad nove) nestaje; nova je već učitana ispod nje.
    const fadeOutPreviousScene = () => {
      const fading = fadingLayerRef.current;
      if (!fading) return;
      fadingLayerRef.current = null;
      fading.el.style.transition = `opacity ${FADE_MS}ms ease`;
      requestAnimationFrame(() => { fading.el.style.opacity = '0'; });
      setTimeout(() => disposeLayer(fading), FADE_MS + 60);
    };

    // Ako nova panorama ne može da se učita, Pannellum ispisuje grešku u
    // svom sloju - stara scena ne sme da ostane preko nje.
    v.on('error', () => {
      if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
      walkingRef.current = false;
      layer.style.pointerEvents = '';
      if (slowHintTimer) clearTimeout(slowHintTimer);
      setSlowRoomLoad(false);
      setRoomLoading(false);
      disposeLayer(fadingLayerRef.current);
      fadingLayerRef.current = null;
    });

    v.on('load', async () => {
      if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
      if (slowHintTimer) clearTimeout(slowHintTimer);
      setSlowRoomLoad(false);
      setRoomLoading(false);

      // Scena je napravljena sa ARRIVE_HFOV (ka njemu je okretanje vodi), a
      // pojavljuje se malo šira - vidi ENTRY_START_HFOV u transition.ts.
      if (zoomedIn) {
        try { v.setHfov(scaledHfov(ENTRY_START_HFOV), 0); } catch {}
      }

      const holdMs = holdUntil - Date.now();
      if (holdMs > 0) {
        await wait(holdMs);
        if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
      }
      walkingRef.current = false;
      sceneReadyRef.current = true;
      layer.style.pointerEvents = '';
      fadeOutPreviousScene();

      if (!sequenceActiveRef.current || isInterruptedRef.current) return;

      // Uvod, info-tačke i kraj sobe (ili vodič dalje) - vidi roomSequence.ts.
      await runRoomSequence({
        currentSession,
        roomSessionRef,
        isMountedRef,
        sequenceActiveRef,
        isInterruptedRef,
        viewerRef,
        animFrameRef,
        isGyroActiveRef,
        isGuidePausedRef,
        guideModeRef,
        roomSequenceFinishedRef,
        visitedGuideRoomsRef,
        langRef,
        currentRoom,
        waypointsList,
        establishData,
        entry,
        zoomedIn,
        startPitch,
        targetEstablishYaw,
        targetEstablishPitch,
        isGuidedStep,
        stopCurrentAnimation,
        setInfoBoxData,
        setIsRoomTourFullyCompleted,
        scheduleAfterNarration,
        playNarration,
        waitWhilePaused,
        nextGuideDoor,
        advanceGuide
      });
    });

    return () => {
      if (slowHintTimer) clearTimeout(slowHintTimer);
      sequenceActiveRef.current = false;
      isInterruptedRef.current = true;
      panoramaContainer.removeEventListener('mouseup', handlePanEnd);
      panoramaContainer.removeEventListener('touchend', handlePanEnd);
      stopCurrentAnimation();
      stopAudio();
      if (viewerRef.current) {
        if (pendingTransitionRef.current && currentLayerRef.current && isMountedRef.current) {
          // Sledeća soba stiže sa pretapanjem: ova scena ostaje na ekranu,
          // iznad nove, dok se nova ne učita (fadeOutPreviousScene).
          disposeLayer(fadingLayerRef.current);
          const el = currentLayerRef.current;
          el.style.zIndex = '2';
          el.style.pointerEvents = 'none';
          fadingLayerRef.current = { viewer: viewerRef.current, el };
        } else {
          try { viewerRef.current.destroy(); } catch {}
          currentLayerRef.current?.remove();
        }
        viewerRef.current = null;
        currentLayerRef.current = null;
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
    walkToRoom,
    advanceGuide,
    nextGuideDoor,
    stopCurrentAnimation,
    stopAudio,
    handleStartEditWaypoint,
    handleViewerClick,
    playNarration,
    takeManualControl,
    buildHotspotConfig
  ]);

  // Isto za oba mesta gde se admin alati crtaju (prazna tura i puna tura).
  const adminToolsProps = {
    slug,
    tour,
    setTour,
    rooms,
    setRooms,
    roomIdx,
    setRoomIdx,
    lang,
    langRef,
    refreshViewerHotspots,
    onRoomCreated: handleAdminRoomCreated,
    toolbarSlot: adminToolbarSlot
  };

  if (!hasMounted || loading) return <Centered>{t.loading}</Centered>;

  // Tura postoji ali nema nijednu sobu: admin dobija dugme da kreira prvu
  // sobu (sve ostale admin akcije - panorama upload, AI popuna, jezici -
  // rade NAD postojećom sobom, pa moraju da imaju sa čim da rade).
  if (tour && rooms.length === 0 && !error.includes('Greška')) {
    return (
      <div style={{ color: THEME.textPrimary, background: THEME.bg, height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', gap: '16px', padding: '20px', textAlign: 'center' }}>
        <Logo />
        <p style={{ color: THEME.textSecondary, fontSize: '16px' }}>{t.noRooms}</p>
        {adminMode && <TourAdminTools variant="empty" {...adminToolsProps} />}
      </div>
    );
  }

  if (error) return <Centered>{error}</Centered>;

  const fullTourTitle = getLocalizedText(tour?.title_i18n, lang);
  const availableLanguages = ALL_LANGUAGES;
  // Ista soba kao na share kartici (dnevna soba ako postoji) - koristi se i
  // na welcome ekranu i na ekranu zaključane ture.
  const welcomeCoverUrl = pickCoverRoom(rooms)?.preview_url ?? null;

  // Nekretnina izdata/prodata/pauzirana (migracija 010, nezavisno od
  // published): posetilac vidi poruku i kontakt umesto ture. Admin i dalje
  // uređuje turu preko ?admin=1 - adminRequested skloni bljesak ove poruke
  // dok se prijava ne prepozna (async).
  if (tour?.status && tour.status !== 'active' && !adminMode && !adminRequested) {
    return (
      <LockedTourScreen
        tour={tour}
        t={t}
        title={fullTourTitle}
        coverUrl={welcomeCoverUrl}
        lang={lang}
        languages={availableLanguages.filter((l) => isLanguageAvailable(l))}
        onChangeLanguage={changeLanguage}
      />
    );
  }

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

  const faqList = buildFaqList(tour, lang);
  const aboutText = getLocalizedText(tour?.about_text_i18n, lang);
  const factList = buildFactList(tour, lang);

  const currentRoomTitle = getLocalizedText(currentRoom?.title_i18n, lang) || `Soba ${roomIdx + 1}`;

  // Traka sa sobama: u automatskom modu broji i crta sobe putanje vodiča
  // (redom kojim ih vodič prvi put obilazi), inače sve sobe ture.
  const isGuideAuto = guideMode === 'auto';
  const currentRoomKey = String(currentRoom?.id);
  const navDots: RoomDot[] = isGuideAuto
    ? [...new Set(guideSteps.map((s) => String(s.room.id)))].map((id, i) =>
        id === currentRoomKey ? 'current' : i < guideProgress.current ? 'seen' : 'unseen'
      )
    : rooms.map((r, i) => (i === roomIdx ? 'current' : seenRoomIds.has(String(r.id)) ? 'seen' : 'unseen'));
  const navPosition = isGuideAuto ? guideProgress : { current: roomIdx + 1, total: rooms.length };
  const navLabel = (isGuideAuto ? t.guidePosition : t.roomPosition)
    .replace('{current}', String(navPosition.current))
    .replace('{total}', String(navPosition.total));

  const isModalToolbarVisible = !infoBoxData && (!tourStarted || isRoomTourFullyCompleted || isInfoboxManuallyClosed);

  // Dugme "Pozovi" stoji dok donji meni (sa Kontaktom) nije vidljiv - vidi
  // CallAgentButton. U admin režimu se prikazuje (da vlasnik vidi turu kao
  // posetilac), ali se klik ne broji.
  const agentPhone = tour?.agent_phone?.trim() || '';
  const showCallButton =
    tourStarted && Boolean(agentPhone) && !pendingCoords && !activeModal && !isModalToolbarVisible;
  const callButton = showCallButton ? (
    <CallAgentButton
      phone={agentPhone}
      label={t.callNow}
      floating={!infoBoxData}
      onPhoneCall={() => {
        if (slug && !adminMode) trackEvent({ eventType: 'contact', tourSlug: slug, lang });
      }}
      onDesktop={() => setActiveModal('contact')}
    />
  ) : null;

  return (
    <main style={{ position: 'relative', width: '100vw', height: '100dvh', backgroundColor: THEME.bg, overflow: 'hidden', fontFamily: THEME.fontBody }}>
      <TourGlobalStyles />

      {!tourStarted && (
        <WelcomeScreen
          coverUrl={welcomeCoverUrl}
          agencyName={tour?.agency_name ?? null}
          title={fullTourTitle}
          price={formatListingPrice(tour?.price, tour?.category, lang)}
          startHint={guideRequested && hasGuide ? t.startGuidedTourHint : t.exploreSelfHint}
          help={{ link: t.howItWorks, steps: [t.howStep1, t.howStep2, t.howStep3], gotIt: t.howGotIt }}
          startLabel={guideRequested && hasGuide ? t.startGuidedTour : t.startTour}
          onStart={startTour}
          // ?vodic=1 (agent-link) već je odlučen - zadržava stari jednodelan
          // CTA. Organski posetilac sa turom koja ima putanju vodiča ("hoću
          // li sam da hodam ili da me neko vodi") dobija pravi izbor.
          guideChoice={
            hasGuide && !guideRequested
              ? {
                  guidedLabel: t.startGuidedTour,
                  guidedHint: t.startGuidedTourHint,
                  exploreLabel: t.exploreSelf,
                  exploreHint: t.exploreSelfHint,
                  onStartGuided: startTourGuided
                }
              : null
          }
          onShare={handleShareTour}
          shareCopied={shareCopied}
          shareLabel={t.shareShort}
          shareCopiedLabel={t.linkCopied}
          lang={lang}
          languages={availableLanguages.filter((l) => adminMode || isLanguageAvailable(l))}
          onChangeLanguage={changeLanguage}
        />
      )}

      {tourStarted && (
        <>
          <div className="tour-ui-scale" style={{
            position: 'absolute',
            // Maksimalno uz vrh, ali ispod notch-a/zaobljene ivice
            // (env(safe-area-inset-*), uključeno preko viewportFit:'cover').
            top: 'calc(env(safe-area-inset-top, 0px) + 2px)',
            left: 'calc(env(safe-area-inset-left, 0px) + 2px)',
            right: 'calc(env(safe-area-inset-right, 0px) + 2px)',
            zIndex: 35,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            pointerEvents: 'none'
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', rowGap: '4px', width: '100%' }}>
              <TourTitleCard agencyName={tour?.agency_name ?? null} title={fullTourTitle} />

              <div style={{
                ...GLASS,
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
                rowGap: '4px',
                gap: '4px',
                maxWidth: '55%',
                borderRadius: '12px',
                padding: '4px 6px',
                pointerEvents: 'auto'
              }}>
                {/* Admin dugmad crta TourAdminTools kroz portal. display:
                    contents ih pušta da budu članovi ove flex trake kao da
                    su ovde napisana, sa istim razmakom kao ranije. */}
                {adminMode && <span ref={setAdminToolbarSlot} style={{ display: 'contents' }} />}

                <LanguageChips
                  lang={lang}
                  languages={availableLanguages.filter((l) => adminMode || isLanguageAvailable(l))}
                  onChange={changeLanguage}
                  size="sm"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <RoomNavBar
                rooms={rooms}
                roomIdx={roomIdx}
                lang={lang}
                label={navLabel}
                dots={navDots}
                seenRoomIds={seenRoomIds}
                canPrev={isGuideAuto ? prevGuideStepIdx >= 0 : roomIdx > 0}
                canNext={isGuideAuto ? guideStepIdx < guideSteps.length - 1 : roomIdx < rooms.length - 1}
                onPrev={goPrev}
                onNext={goNext}
                onSelectRoom={(id) => changeRoomById(id)}
                labels={{ prev: t.navPrev, next: t.navNext, chooseRoom: t.chooseRoom }}
              />
            </div>

          <OverlayButtons
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            isGyroActive={isGyroActive}
            onToggleGyroscope={toggleGyroscope}
            isMuted={isMuted}
            onToggleMute={toggleMute}
            hasGuide={hasGuide}
            guideMode={guideMode}
            onToggleGuideMode={toggleGuideMode}
            isGuidePaused={isGuidePaused}
            onTogglePauseGuide={togglePauseGuide}
          />
          </div>

          {tour?.floorplan_url && !pendingCoords && (
            <FloorplanMiniMap
              floorplanUrl={tour.floorplan_url}
              rooms={rooms}
              currentRoomId={currentRoom?.id}
              seenRoomIds={seenRoomIds}
              lang={lang}
              onSelectRoom={(id) => changeRoomById(id)}
              onExpand={() => setActiveModal('plan')}
              labels={{ title: withoutEmoji(t.btnPlan), expand: withoutEmoji(t.btnPlan) }}
            />
          )}
        </>
      )}

      {/* Okvir za slojeve scena: pri prelazu su tu dve scene jedna preko
          druge dok se stara ne pretopi (vidi transition.ts). */}
      <div id="panorama" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }} />

      {slowRoomLoad && <style>{'@keyframes pulseDot{0%,80%,100%{transform:scale(0);opacity:.3}40%{transform:scale(1);opacity:1}}'}</style>}
      {slowRoomLoad && (
        <StatusNotice variant="loading">
          <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#5B92D6', animation: 'pulseDot 1.4s infinite ease-in-out both' }} />
          {t.roomLoadingPrefix}<b>{currentRoomTitle}</b>
        </StatusNotice>
      )}

      {guideFinished && <StatusNotice variant="done">{t.guideAllSeen}</StatusNotice>}

      {showDragHint && (
        <DragHint
          text={typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches ? t.dragHintTouch : t.dragHintMouse}
        />
      )}


      {!pendingCoords && isModalToolbarVisible && (
        <TourMenuBar
          activeModal={activeModal}
          onOpenModal={setActiveModal}
          onShare={handleShareTour}
          shareCopied={shareCopied}
          shareLabel={t.shareTour}
          copiedLabel={t.linkCopied}
          // Pre polaska deljenje već stoji gore desno na WelcomeScreen-u.
          showShare={tourStarted}
          labels={{
            faq: t.btnFaq,
            location: t.btnLocation,
            about: t.btnAbout,
            plan: t.btnPlan,
            contact: t.btnContact
          }}
        />
      )}

      {tourStarted && adminMode && <AdminCrosshair />}

      {/* ADMIN EDIT / ADD HOTSPOT FORMA */}
      {pendingCoords && adminMode && (
        <HotspotForm
          {...hotspotFormProps}
          coords={pendingCoords}
          t={t}
          lang={lang}
          rooms={rooms}
        />
      )}

      {roomLoading && (
        <RoomLoadingScreen
          agencyName={tour?.agency_name ?? null}
          tourTitle={fullTourTitle}
          loadingPrefix={t.roomLoadingPrefix}
          roomTitle={currentRoomTitle}
        />
      )}

      {infoBoxData && !pendingCoords && !activeModal && (
        <InfoCard
          title={displayedInfoTitle}
          text={displayedInfoText}
          closeLabel={t.close}
          onClose={() => {
            stopAudio();
            setInfoBoxData(null);
            setIsInfoboxManuallyClosed(true);
          }}
          above={callButton}
        />
      )}

      {/* Bez kartice dugme ide samo u dno ekrana, desno. */}
      {!infoBoxData && callButton}

      {/* MODAL: ADMIN LOGIN (Supabase Auth - zamena za staru ?admin=... lozinku) */}
      {showAdminLogin && !adminMode && (
        <AdminLoginModal
          {...loginForm}
          onSubmit={handleAdminLogin}
          onCancel={() => setShowAdminLogin(false)}
          cancelLabel={t.cancel}
        />
      )}

      {/* ADMIN ALATI: AI draft, glas, jezici, napredak otpremanja. Modali su
          fixed/absolute, pa im mesto u stablu ne menja izgled - stoje ovde da
          zadrže isti redosled slojeva kao pre izdvajanja u poseban fajl. */}
      {adminMode && <TourAdminTools variant="full" {...adminToolsProps} />}

      {hasMounted && activeModal && (
        <TourModals
          activeModal={activeModal}
          onClose={() => { setActiveModal(null); setSelectedFaq(null); }}
          t={t}
          tour={tour}
          rooms={rooms}
          currentRoom={currentRoom}
          currentRoomTitle={currentRoomTitle}
          lang={lang}
          adminMode={adminMode}
          aboutText={aboutText}
          factList={factList}
          faqList={faqList}
          onSelectFaq={setSelectedFaq}
          onChangeRoom={(id) => changeRoomById(id)}
          onFloorplanClick={handleSetFloorplanMarker}
          onShare={handleShareTour}
          shareCopied={shareCopied}
          onRequestViewing={slug ? () => { setActiveModal(null); setShowViewing(true); } : null}
        />
      )}

      {/* "Zakaži razgledanje" - otvara se iz prozora Kontakt (TourModals). */}
      {hasMounted && showViewing && slug && (
        <ViewingRequestModal
          slug={slug}
          tourTitle={fullTourTitle}
          lang={lang}
          onClose={() => setShowViewing(false)}
        />
      )}

      {hasMounted && selectedFaq !== null && faqList[selectedFaq] && (
        <FaqAnswerModal
          item={faqList[selectedFaq]}
          onClose={() => setSelectedFaq(null)}
          closeLabel={t.close}
          comingSoon={t.comingSoon}
        />
      )}
    </main>
  );
}