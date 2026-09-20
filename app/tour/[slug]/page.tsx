'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { preload } from 'react-dom';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { Language, Waypoint, Room, Tour, ActiveModal } from './types';
import { translations, categoryQuestions } from './translations';
import { THEME, GLASS, applyGlassHotspotStyle } from './theme';
import { SITE_URL } from '../../lib/site';
import { trackEvent } from '../../lib/track';
import { pickCoverRoom } from '../../lib/coverRoom';
import { Logo } from './Logo';
import { RoomNavBar, type RoomDot } from './RoomNavBar';
import { WelcomeScreen } from './WelcomeScreen';
import { InfoCard, LanguageChips, OverlayButtons, StatusNotice, TourTitleCard } from './TourControls';
import { TourMenuBar } from './TourMenuBar';
import { FaqAnswerModal, TourModals } from './TourModals';
import { AdminLoginModal, HotspotForm } from './TourAdminPanels';
import { useViewerControls } from './useViewerControls';
import { useTourNarration } from './useTourNarration';
import { LockedTourScreen } from './LockedTourScreen';
import { FloorplanMiniMap } from './FloorplanMiniMap';
import { withoutEmoji } from './icons';
import { PANNELLUM_CSS, PANNELLUM_JS } from './pannellum';
import {
  ARRIVE_HFOV,
  CREEP_HFOV,
  CREEP_MS,
  DEFAULT_HFOV,
  ENTRY_START_HFOV,
  FADE_MS,
  IMAGE_WAIT_MS,
  INFO_HFOV,
  SETTLE_MS,
  SLOW_LOAD_HINT_MS,
  WALK_HFOV,
  WALK_MIN_HFOV_BOUND,
  WALK_MS,
  WALK_REVEAL_AT,
  VIEW_MAX_HFOV,
  VIEW_MIN_HFOV,
  clampPitch,
  entryViewFor,
  pickHfov,
  preloadPanorama,
  prefersReducedMotion,
  scaledHfov,
  wait,
  type PendingTransition
} from './transition';
import {
  normalizeYaw,
  getShortestTargetYaw,
  getLocalizedText,
  parseWaypoints,
  parseEstablish,
  composeEstablishText,
  buildI18nObject,
  mergeAudioI18n,
  buildFactList,
  Centered
} from './utils';
import {
  GUIDE_REVISIT_OVERLAP_MS,
  GUIDE_REVISIT_TURN_MIN_MS,
  revisitTurnMs,
  parseGuidePath,
  resolveGuidePath,
  type GuideStep
} from './guidePath';

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

  // ---- Automatski vodič (vidi guidePath.ts) ------------------------------
  // 'auto' = vodič sam hoda kroz putanju i priča; 'manual' = kao i do sada,
  // posetilac sam bira sobe. Ref postoji jer se čita iz async koda unutar
  // efekta koji pravi scenu (v.on('load'), tajmeri) - state bi tamo bio
  // "zaleđen" na vrednost iz trenutka kad je efekat pokrenut.
  const [guideMode, setGuideMode] = useState<'auto' | 'manual'>('manual');
  const guideModeRef = useRef<'auto' | 'manual'>('manual');
  // Koliko je vodič odmakao u putanji - indeks POSLEDNJE sobe do koje je
  // stigao (ne resetuje se pri prelasku auto/ručno, da bi "nastavak" znao
  // odakle je vodič stao).
  const guidePathIndexRef = useRef(0);
  // Isti indeks kao state, samo za prikaz "Prostorija X od Y".
  const [guideStepIdx, setGuideStepIdx] = useState(0);
  // Link sa ?vodic=1 pokreće turu odmah u automatskom modu (npr. agent ga
  // šalje kupcu u poruci). Pokreće se samo jednom po poseti.
  const [guideRequested, setGuideRequested] = useState(false);
  const guideAutoStartedRef = useRef(false);
  // Scena trenutne sobe je učitana - "Sledeća" dok se soba tek učitava bi
  // krenula da hoda iz scene koja još nema sliku.
  const sceneReadyRef = useRef(false);
  // Sobe koje je posetilac video u ovoj poseti - za tačkice napretka u traci.
  const [seenRoomIds, setSeenRoomIds] = useState<Set<string>>(() => new Set());
  // Sobe koje su već dobile PUNU naraciju u ovoj poseti (ručno ili od
  // vodiča) - drugi automatski prolazak kroz njih je samo okret ka sledećim
  // vratima, bez priče (vidi GUIDE_REVISIT_* u guidePath.ts).
  const visitedGuideRoomsRef = useRef<Set<string>>(new Set());
  // Da li je naracija TRENUTNE sobe već završena (vodič sad samo mirno
  // stoji) - treba activateGuide-u da zna da li da odmah krene dalje ili da
  // pusti postojeću naraciju da se sama završi.
  const roomSequenceFinishedRef = useRef(false);
  const [guideFinished, setGuideFinished] = useState(false);
  const guideFinishedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const t = translations[lang];

  const params = useParams();
  const slug = params?.slug as string;

  const [tour, setTour] = useState<Tour | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomIdx, setRoomIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [roomLoading, setRoomLoading] = useState(false);
  const [error, setError] = useState('');

  // Putanja vodiča razrešena na stvarne sobe (vidi guidePath.ts). Prazno ili
  // sa manje od 2 koraka = tura nema automatskog vodiča, dugme se ne krca.
  const guideSteps: GuideStep[] = useMemo(
    () => resolveGuidePath(parseGuidePath(tour?.guide_path), rooms),
    [tour?.guide_path, rooms]
  );
  const hasGuide = guideSteps.length >= 2;
  // Broje se različite prostorije, ne koraci - hodnik kroz koji se prolazi
  // tri puta je i dalje jedna prostorija.
  const guideProgress = useMemo(() => {
    const ids = guideSteps.map((s) => String(s.room.id));
    return { current: new Set(ids.slice(0, guideStepIdx + 1)).size, total: new Set(ids).size };
  }, [guideSteps, guideStepIdx]);

  const [pannellumReady, setPannellumReady] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  // Otvoreno sa ?admin=1: ne pokazuj poruku o zaključanoj turi dok se ne zna
  // da li je prijava uspela - inače bi admin video kratak bljesak poruke
  // pre nego što se sesija prepozna.
  const [adminRequested, setAdminRequested] = useState(false);
  const adminModeRef = useRef(false);

  // Otvaranje se beleži samo jednom po učitavanju, i kad se tour objekat
  // kasnije osveži (npr. posle admin izmene).
  const openTrackedRef = useRef(false);

  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);

  // Deljenje linka ture (Web Share API na mobilnom, kopiranje u clipboard
  // kao fallback na desktopu). shareCopied prikazuje kratku potvrdu.
  const [shareCopied, setShareCopied] = useState(false);


  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null);
  const [isRoomTourFullyCompleted, setIsRoomTourFullyCompleted] = useState(false);
  const [isInfoboxManuallyClosed, setIsInfoboxManuallyClosed] = useState(false);


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

  // Ceo ekran i žiroskop - vidi useViewerControls.ts
  const {
    isFullscreen,
    isGyroActive,
    isGyroActiveRef,
    toggleGyroscope,
    toggleFullscreen
  } = useViewerControls(viewerRef);

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

  // Ručni klik (soba, tačka, tlocrt) uvek preuzima kontrolu od vodiča - kao
  // audio-vodič u muzeju: čim nešto sam pipneš, vodič ćuti. `transition.guided`
  // označava korak koji je pokrenuo SAM vodič, pa ovo za njega preskačemo.
  const takeManualControl = useCallback(() => {
    if (guideFinishedTimerRef.current) {
      clearTimeout(guideFinishedTimerRef.current);
      guideFinishedTimerRef.current = null;
    }
    setGuideFinished(false);
    if (guideModeRef.current === 'manual') return;
    guideModeRef.current = 'manual';
    setGuideMode('manual');
  }, []);

  useEffect(() => {
    if (!tourStarted) return;
    const id = rooms[roomIdx]?.id;
    if (id == null) return;
    setSeenRoomIds((prev) => (prev.has(String(id)) ? prev : new Set(prev).add(String(id))));
  }, [tourStarted, rooms, roomIdx]);

  // Poruka "obišli ste sve" sama nestane posle nekoliko sekundi.
  useEffect(() => {
    if (!guideFinished) return;
    guideFinishedTimerRef.current = setTimeout(() => setGuideFinished(false), 6000);
    return () => {
      if (guideFinishedTimerRef.current) clearTimeout(guideFinishedTimerRef.current);
    };
  }, [guideFinished]);

  // `transition` dolazi iz walkToRoom (prelaz kroz tačku, sa smerom ulaska).
  // Bez njega (spisak soba, tlocrt) prelaz je samo pretapanje.
  const changeRoomById = useCallback((id: string | number, transition?: PendingTransition) => {
    const foundIndex = rooms.findIndex(r => r.id == id);
    if (foundIndex === -1) return;

    // Soba u koju se upravo ulazi se već priprema ispod stare scene - klik na
    // nju (spisak, tlocrt) ne sme da prekine taj prelaz.
    if (foundIndex === roomIdx && walkingRef.current && fadingLayerRef.current) return;

    if (!transition?.guided) takeManualControl();

    // Prelaz koji se još približava vratima više ne važi - posetilac je
    // izabrao sobu. Prelaz sa revealAt je sam taj prelaz: on traje dok nova
    // scena ne izađe ispod stare (v.on('load') dole).
    const walkCancelled = walkingRef.current && !transition;
    walkTokenRef.current += 1;
    walkingRef.current = Boolean(transition?.revealAt);

    roomSessionRef.current += 1;
    sequenceActiveRef.current = false;
    isInterruptedRef.current = true;
    resetPosition();
    setIsRoomTourFullyCompleted(false);
    setIsInfoboxManuallyClosed(false);
    stopCurrentAnimation();
    stopAudio();
    setInfoBoxData(null);

    // Klik na sobu u kojoj se već nalazimo (isti indeks): setRoomIdx sa istom
    // vrednošću NE pokreće efekat koji učitava scenu, pa "roomLoading" ne bi
    // nikad bio vraćen na false - "Ulazimo u prostoriju" bi ostalo zauvek na
    // ekranu. Iznad smo već prekinuli naraciju/animaciju; ponovno učitavanje
    // panorame ovde nije ni potrebno.
    if (foundIndex === roomIdx) {
      // Prekinut prilaz vratima u istoj sobi: kamera je ostala duboko
      // uvećana, sa spuštenom granicom zuma - vrati normalan pogled.
      if (walkCancelled && viewerRef.current) {
        try {
          viewerRef.current.setHfovBounds([VIEW_MIN_HFOV, VIEW_MAX_HFOV]);
          viewerRef.current.setHfov(pickHfov(DEFAULT_HFOV), SETTLE_MS);
        } catch {}
      }
      return;
    }

    if (viewerRef.current) {
      // Postoji scena na ekranu: ona ostaje dok se nova ne učita, pa se
      // pretapaju. Veliki ekran za učitavanje se tada ne prikazuje.
      pendingTransitionRef.current = transition ?? { entry: null, zoomedIn: false };
    } else {
      pendingTransitionRef.current = null;
      setRoomLoading(true);
    }
    setRoomIdx(foundIndex);
  }, [rooms, roomIdx, resetPosition, stopAudio, stopCurrentAnimation, takeManualControl]);

  // Klik na navigacionu tačku: kamera se okrene ka tački i približi joj se,
  // za to vreme se skida sledeća soba, pa prelaz (vidi transition.ts).
  // `options.guided` = ovaj korak pokreće automatski vodič, ne ručan klik.
  const walkToRoom = useCallback((wp: Waypoint, options?: { guided?: boolean }) => {
    if (wp.targetRoomId == null || walkingRef.current) return;

    if (!options?.guided) takeManualControl();

    const fromRoom = rooms[roomIdx];
    const target = rooms.find(r => String(r.id) === String(wp.targetRoomId));
    const v = viewerRef.current;
    if (!fromRoom || !target || target.id == fromRoom.id || !v) {
      changeRoomById(wp.targetRoomId, options?.guided ? { entry: null, zoomedIn: false, guided: true } : undefined);
      return;
    }

    const token = ++walkTokenRef.current;
    walkingRef.current = true;

    // Kamera sad pripada prelazu: prekini naraciju i okretanje.
    sequenceActiveRef.current = false;
    isInterruptedRef.current = true;
    stopCurrentAnimation();
    stopAudio();
    setInfoBoxData(null);

    const url = target.panorama_url_cf || target.panorama_url;
    const imageReady = url ? preloadPanorama(url) : Promise.resolve();

    const reduceMotion = prefersReducedMotion();
    const approach = new Promise<void>((resolve) => {
      if (reduceMotion) return resolve();
      const yaw = getShortestTargetYaw(normalizeYaw(v.getYaw()), wp.yaw ?? 0);
      try {
        v.setHfovBounds([WALK_MIN_HFOV_BOUND, VIEW_MAX_HFOV]);
        v.lookAt(clampPitch(wp.pitch ?? 0), yaw, scaledHfov(WALK_HFOV), WALK_MS, () => resolve());
      } catch {
        resolve();
      }
      // Ako posetilac povuče pogled usred animacije, Pannellum ne pozove
      // callback - zato i rezervni tajmer.
      setTimeout(resolve, WALK_MS + 150);
    });

    const entry = entryViewFor(wp);
    // Nova soba se pravi dok kamera još prilazi, skrivena ispod stare, i
    // pokazuje se tek pred kraj prilaza - raspakivanje velike panorame traje
    // ~1,5 s i ranije je na kraju prilaza izgledalo kao da kamera stoji.
    const revealAt = reduceMotion ? undefined : Date.now() + WALK_MS * WALK_REVEAL_AT;

    Promise.race([imageReady, wait(WALK_MS + IMAGE_WAIT_MS)]).then(() => {
      if (!isMountedRef.current || token !== walkTokenRef.current) return;
      changeRoomById(target.id, { entry, zoomedIn: !reduceMotion, guided: options?.guided, revealAt });
    });

    approach.then(() => {
      // Nova soba još nije spremna, a kamera je stigla do vrata: stara scena
      // i dalje polako ide napred (vidi CREEP_* u transition.ts).
      if (reduceMotion || !walkingRef.current || v === viewerRef.current) return;
      try { v.setHfov(scaledHfov(CREEP_HFOV), CREEP_MS); } catch {}
    });
  }, [rooms, roomIdx, changeRoomById, stopAudio, stopCurrentAnimation, takeManualControl]);

  const setGuideIndex = useCallback((i: number) => {
    guidePathIndexRef.current = i;
    setGuideStepIdx(i);
  }, []);

  // Vrata u trenutnoj sobi putanje koja vode u sledeći korak (null na kraju
  // putanje ili ako tačka za prelaz ne postoji).
  const nextGuideDoor = useCallback(() => {
    const idx = guidePathIndexRef.current;
    if (idx >= guideSteps.length - 1) return null;
    const from = guideSteps[idx].room;
    const to = guideSteps[idx + 1].room;
    return (
      parseWaypoints(from.waypoints_i18n).find(
        (w) => w.targetRoomId != null && String(w.targetRoomId) === String(to.id)
      ) ?? null
    );
  }, [guideSteps]);

  // Sledeći korak u putanji vodiča (guidePath.ts): nađe tačku iz TRENUTNOG
  // koraka ka SLEDEĆEM i "prošeta" kroz nju. Ako je tačka u međuvremenu
  // nestala (obrisana posle čuvanja putanje), pretopi se bez hodanja umesto
  // da ostane zaglavljeno.
  const advanceGuide = useCallback(() => {
    // Već hoda ka sledećoj sobi - drugi poziv bi pomerio indeks bez pokreta.
    if (walkingRef.current) return;
    const idx = guidePathIndexRef.current;
    if (idx >= guideSteps.length - 1) {
      setGuideFinished(true);
      return;
    }
    const wp = nextGuideDoor();
    const to = guideSteps[idx + 1];
    setGuideIndex(idx + 1);

    if (wp) {
      walkToRoom(wp, { guided: true });
    } else {
      changeRoomById(to.room.id, { entry: null, zoomedIn: false, guided: true });
    }
  }, [guideSteps, nextGuideDoor, setGuideIndex, walkToRoom, changeRoomById]);

  // Uključivanje vodiča: nastavlja od tamo gde je stao, preskačući sobe koje
  // su već predstavljene (ručno ili od ranijeg vođenja - "pokaži samo ono
  // što još nisam video"). Ako je posetilac u međuvremenu ručno odlutao
  // negde drugde, "sustigne" ga pretapanjem (nema garancije da baš iz TE
  // sobe postoji tačka do sledećeg koraka), pa dalje hoda normalno.
  const activateGuide = useCallback(() => {
    if (!hasGuide) return;

    guideModeRef.current = 'auto';
    setGuideMode('auto');
    if (guideFinishedTimerRef.current) clearTimeout(guideFinishedTimerRef.current);
    setGuideFinished(false);

    let idx = guidePathIndexRef.current;
    while (idx < guideSteps.length && visitedGuideRoomsRef.current.has(String(guideSteps[idx].room.id))) {
      idx++;
    }

    if (idx >= guideSteps.length) {
      setGuideFinished(true);
      return;
    }
    setGuideIndex(idx);

    const targetRoom = guideSteps[idx].room;
    if (rooms[roomIdx]?.id === targetRoom.id) {
      // Već smo u ciljnoj sobi. Ako je naracija već završena (mirno stojimo),
      // nastavi odmah; ako još traje, nastaviće se sama - v.on('load') dole
      // uživo proverava guideModeRef pri kraju sekvence.
      if (roomSequenceFinishedRef.current) advanceGuide();
      return;
    }

    changeRoomById(targetRoom.id, { entry: null, zoomedIn: false, guided: true });
  }, [hasGuide, guideSteps, rooms, roomIdx, setGuideIndex, changeRoomById, advanceGuide]);

  const toggleGuideMode = useCallback(() => {
    if (guideModeRef.current === 'auto') takeManualControl();
    else activateGuide();
  }, [takeManualControl, activateGuide]);

  // "Sledeća" u automatskom modu: prekida priču trenutne sobe i vodič odmah
  // kreće dalje - i dalje vodi on, pa se ne računa kao ručno preuzimanje.
  const skipGuideStep = useCallback(() => {
    if (guideModeRef.current !== 'auto' || !sceneReadyRef.current) return;
    advanceGuide();
  }, [advanceGuide]);

  // "Prethodna" u automatskom modu vraća na poslednju RANIJU sobu koju je
  // vodič predstavio - korak kroz koji se samo prolazi (hodnik drugi put) se
  // preskače, jer bi se vodič odatle odmah okrenuo i krenuo nazad napred.
  const prevGuideStepIdx = useMemo(() => {
    const currentId = String(guideSteps[guideStepIdx]?.room.id);
    for (let j = guideStepIdx - 1; j >= 0; j--) {
      const id = String(guideSteps[j].room.id);
      const firstIdx = guideSteps.findIndex((s) => String(s.room.id) === id);
      if (firstIdx === j && id !== currentId) return j;
    }
    return -1;
  }, [guideSteps, guideStepIdx]);

  const backGuideStep = useCallback(() => {
    if (guideModeRef.current !== 'auto' || !sceneReadyRef.current || walkingRef.current) return;
    if (prevGuideStepIdx < 0) return;
    const room = guideSteps[prevGuideStepIdx].room;
    // Posetilac se vratio da je ponovo čuje - soba se predstavlja iz početka.
    visitedGuideRoomsRef.current.delete(String(room.id));
    setGuideIndex(prevGuideStepIdx);
    changeRoomById(room.id, { entry: null, zoomedIn: false, guided: true });
  }, [guideSteps, prevGuideStepIdx, setGuideIndex, changeRoomById]);

  const goPrev = () => {
    if (guideModeRef.current === 'auto') return backGuideStep();
    if (roomIdx > 0) changeRoomById(rooms[roomIdx - 1].id);
  };

  const goNext = () => {
    if (guideModeRef.current === 'auto') return skipGuideStep();
    if (roomIdx < rooms.length - 1) changeRoomById(rooms[roomIdx + 1].id);
  };

  // Sa ?vodic=1 prva scena je odmah prva soba putanje - postavlja se u istom
  // renderu kao tourStarted, pa se soba 1 ture ne učitava uzalud.
  const startTour = () => {
    if (guideRequested && hasGuide) {
      const firstIdx = rooms.findIndex((r) => r.id === guideSteps[0].room.id);
      if (firstIdx !== -1) setRoomIdx(firstIdx);
    }
    setTourStarted(true);
  };

  // Posetilac je na uvodnom ekranu sam izabrao "Automatsko vođenje" (za
  // razliku od ?vodic=1, koji dolazi već odlučen iz linka). Isti efekat kao
  // gore - guideRequested=true pokreće activateGuide() čim se tura pokrene.
  const startTourGuided = () => {
    const firstIdx = rooms.findIndex((r) => r.id === guideSteps[0].room.id);
    if (firstIdx !== -1) setRoomIdx(firstIdx);
    setGuideRequested(true);
    setTourStarted(true);
  };

  useEffect(() => {
    if (!guideRequested || !tourStarted || !hasGuide || guideAutoStartedRef.current) return;
    guideAutoStartedRef.current = true;
    activateGuide();
  }, [guideRequested, tourStarted, hasGuide, activateGuide]);

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

  const updatedWaypoints = parseWaypoints(currentRoom.waypoints_i18n);
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

    const updatedWaypoints = parseWaypoints(currentRoom.waypoints_i18n);
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

  // TourAdminTools javlja kad je napravio sobu: tura bez soba je do tada
  // stajala na ekranu sa greškom "nema soba", a sad treba da krene.
  const handleAdminRoomCreated = () => {
    setError('');
    setTourStarted(true);
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

  useEffect(() => {
    isMountedRef.current = true;
    setHasMounted(true);
    const urlParams = new URLSearchParams(window.location.search);
    const adminRequested = urlParams.get('admin') === '1';
    setAdminRequested(adminRequested);
    setGuideRequested(urlParams.get('vodic') === '1');

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
      // Scena koja se upravo pretapala, ako se iz ture izađe usred prelaza.
      disposeLayer(fadingLayerRef.current);
      fadingLayerRef.current = null;
    };
  }, [stopAudio, stopCurrentAnimation]);

  // ---- Analitika ---------------------------------------------------------
  // Događaji se šalju iz efekata, a ne iz pojedinačnih onClick-ova, jer se
  // isto stanje menja sa više mesta (npr. tura se pokreće i dugmetom i
  // automatski) - ovako nijedan put ne ostane nezabeležen.

  useEffect(() => {
    if (!slug || !tour || adminMode) return;
    if (openTrackedRef.current) return;
    openTrackedRef.current = true;
    // langRef, a ne lang: jezik iz linka (?lang=) je u ref-u upisan u istom
    // prolazu, dok lang state stiže tek u sledećem renderu.
    trackEvent({ eventType: 'open', tourSlug: slug, lang: langRef.current });
    // lang namerno nije zavisnost: otvaranje se beleži jednom, sa jezikom
    // koji je tada bio aktivan.
     
  }, [slug, tour, adminMode]);

  useEffect(() => {
    if (!tourStarted || !slug || adminMode) return;
    trackEvent({ eventType: 'start', tourSlug: slug, lang });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourStarted, slug, adminMode]);

  useEffect(() => {
    if (!tourStarted || !slug || adminMode) return;
    const rawRoomId = rooms[roomIdx]?.id;
    if (!rawRoomId) return;
    const roomId = String(rawRoomId);

    const enteredAt = Date.now();
    let flushed = false;

    const flush = () => {
      if (flushed) return;
      flushed = true;
      trackEvent({
        eventType: 'room_view',
        tourSlug: slug,
        roomId,
        durationMs: Date.now() - enteredAt,
        lang
      });
    };

    // pagehide hvata zatvaranje taba i prelazak na drugu stranicu, gde se
    // cleanup efekta ne izvrši pouzdano.
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourStarted, slug, roomIdx, rooms, adminMode]);

  // Panorame do kojih posetilac može da ode iz trenutne sobe skidaju se u
  // pozadini, dok on još gleda ovu. Bez toga se svaki prelazak plaća čekanjem
  // na ~1MB slike, što je na telefonu jasno vidljivo. R2 nema naplatu
  // izlaznog saobraćaja, pa je jedina cena tuđi mobilni internet - zato ide
  // samo prvi krug susednih soba, a ne cela tura.
  useEffect(() => {
    if (!tourStarted || rooms.length < 2) return;

    const current = rooms[roomIdx];
    if (!current) return;

    const neighbours = new Set<string>();

    for (const wp of parseWaypoints(current.waypoints_i18n)) {
      if (!wp.targetRoomId) continue;
      const target = rooms.find((r) => String(r.id) === String(wp.targetRoomId));
      const url = target?.panorama_url_cf || target?.panorama_url;
      if (url) neighbours.add(url);
    }

    // Strelice za napred/nazad postoje i kad soba nema nijedan hotspot za
    // prelaz, pa su susedi po redosledu uvek kandidati.
    for (const idx of [roomIdx + 1, roomIdx - 1]) {
      const url = rooms[idx]?.panorama_url_cf || rooms[idx]?.panorama_url;
      if (url) neighbours.add(url);
    }

    const currentUrl = current.panorama_url_cf || current.panorama_url;
    if (currentUrl) neighbours.delete(currentUrl);

    // Kratko odlaganje: prvo neka se učita panorama koju čovek gleda.
    // preloadPanorama traži sliku u CORS režimu (kao Pannellum) i pamti je,
    // pa je ne traži dvaput - vidi transition.ts.
    const timer = setTimeout(() => {
      for (const url of neighbours) void preloadPanorama(url);
    }, 1500);

    return () => clearTimeout(timer);
  }, [tourStarted, rooms, roomIdx]);

  useEffect(() => {
    if (activeModal !== 'contact' || !slug || adminMode) return;
    trackEvent({ eventType: 'contact', tourSlug: slug, lang });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModal, slug, adminMode]);

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
    if (!slug || !hasMounted) return;
    async function load() {
      setLoading(true);
      // Sobe ne zavise od ture, pa se oba upita šalju odjednom - redom bi
      // svako otvaranje ture plaćalo jedan odlazak do baze više.
      const [
        { data: tourData, error: tourErr },
        { data: roomRows, error: roomsErr }
      ] = await Promise.all([
        supabase.from('tours').select('*').eq('slug', slug).single(),
        supabase.from('rooms').select('*').eq('tour_slug', slug).order('order_index', { ascending: true })
      ]);

      if (tourErr) console.error('[TOUR LOAD ERROR]', tourErr);
      if (roomsErr) console.error('[ROOMS LOAD ERROR]', roomsErr);

      if (!isMountedRef.current) return;

      let loadedTour = tourData as Tour | null;
      let loadedRooms = roomRows as Room[] | null;

      // SAMO lokalno, za pregled malog tlocrta pre nego što ijedna tura ima
      // skicu - vidi demoFloorplan.ts. Na pravom sajtu ova grana ne postoji.
      if (
        process.env.NODE_ENV === 'development' &&
        loadedTour && loadedRooms?.length &&
        new URLSearchParams(window.location.search).get('testskica') === '1'
      ) {
        const { withDemoFloorplan } = await import('./demoFloorplan');
        ({ tour: loadedTour, rooms: loadedRooms } = withDemoFloorplan(loadedTour, loadedRooms));
      }

      if (!loadedTour) {
        // VAŽNO: ako tura nije nađena, ne dozvoljavamo da rooms-provera dole prepiše ovu poruku
        setError(tourErr ? `Greška (tours): ${tourErr.message}` : translations[langRef.current].tourNotFound);
      } else {
        setTour(loadedTour);
        if (roomsErr) setError(`Greška (rooms): ${roomsErr.message}`);
        else if (!loadedRooms || loadedRooms.length === 0) setError(translations[langRef.current].noRooms);
        else setRooms(loadedRooms);
      }

      setLoading(false);
    }
    load();
  }, [slug, hasMounted]);

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

      scheduleAfterNarration(() => {
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
        viewerRef.current.setHfov(pickHfov(DEFAULT_HFOV));
        // Dok je žiroskop aktivan, posetilac već sam gleda pomeranjem
        // telefona - naše okretanje bi se sudaralo sa tim (vidi startGyroscope).
        if (!isGyroActiveRef.current) {
          const idleRotateDegPerSec = 360 / 30; // 360° za 30 sekundi
          viewerRef.current.startAutoRotate(idleRotateDegPerSec, targetEstablishPitch);
        }
      }
    };

    // Kraj naracije sobe: u ručnom modu se kao i do sada samo mirno stoji
    // (startInfiniteGlide); u automatskom vodič odmah nastavlja dalje.
    const finishRoomSequence = () => {
      if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
      if (!sequenceActiveRef.current || isInterruptedRef.current) return;
      roomSequenceFinishedRef.current = true;
      if (guideModeRef.current === 'auto') advanceGuide();
      else startInfiniteGlide();
    };

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

      const roomKey = String(currentRoom.id);
      if (isGuidedStep && visitedGuideRoomsRef.current.has(roomKey)) {
        // Vodič drugi put prolazi kroz VEĆ predstavljenu sobu (npr. hodnik
        // kao prolaz između grana) - bez priče i bez stajanja: kadar se
        // otvara i istovremeno okreće ka sledećim vratima, pa prilaz kreće
        // pre nego što se okret sasvim završi.
        const door = nextGuideDoor();
        let turnMs = GUIDE_REVISIT_TURN_MIN_MS;
        if (door && viewerRef.current && !prefersReducedMotion()) {
          const fromYaw = normalizeYaw(viewerRef.current.getYaw());
          const toYaw = getShortestTargetYaw(fromYaw, door.yaw ?? 0);
          turnMs = revisitTurnMs(toYaw - fromYaw);
          try {
            viewerRef.current.lookAt(
              clampPitch(door.pitch ?? 0),
              toYaw,
              zoomedIn ? scaledHfov(ARRIVE_HFOV) : pickHfov(DEFAULT_HFOV),
              turnMs
            );
          } catch {}
        }
        window.setTimeout(() => {
          if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
          if (!sequenceActiveRef.current || isInterruptedRef.current) return;
          if (guideModeRef.current === 'auto') advanceGuide();
        }, Math.max(0, turnMs - GUIDE_REVISIT_OVERLAP_MS));
        return;
      }
      visitedGuideRoomsRef.current.add(roomKey);

      const introTextRaw = composeEstablishText(establishData) ||
`${translations[langRef.current].welcomePrefix}${getLocalizedText(currentRoom.title_i18n, langRef.current)}`;
      const introAudioUrl = establishData.audio_url_i18n ?? establishData.audio_url;

      const rotatePromise = new Promise<void>((resolve) => {
        const durationPhase1 = 15000;
        const totalDegrees = 240;
        const speed = totalDegrees / (durationPhase1 / 1000);

        const stillValid = () =>
          currentSession === roomSessionRef.current && isMountedRef.current &&
          sequenceActiveRef.current && !isInterruptedRef.current;

        const beginRotation = () => {
          if (!stillValid()) return resolve();

          // Dok je žiroskop aktivan, ne pokrećemo i naše okretanje preko
          // njega - posetilac sam okreće telefonom (vidi startGyroscope).
          // Naracija i dalje traje puni durationPhase1 ispod, samo bez
          // dodatnog kamerinog pomeranja koje bi se sudaralo sa senzorom.
          if (viewerRef.current) {
            if (entry) {
              // Ušli smo kroz vrata: okretanje kreće odatle gde posetilac
              // gleda, bez skoka na početni pogled sobe.
              if (!isGyroActiveRef.current) viewerRef.current.startAutoRotate(speed, startPitch);
            } else {
              if (!zoomedIn) viewerRef.current.setHfov(pickHfov(DEFAULT_HFOV));
              viewerRef.current.setYaw(targetEstablishYaw);
              viewerRef.current.setPitch(targetEstablishPitch);
              if (!isGyroActiveRef.current) viewerRef.current.startAutoRotate(speed, targetEstablishPitch);
            }
          }

          const startTime = performance.now();
          const checkCompletion = (now: number) => {
            if (!stillValid()) {
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
        };

        beginRotation();
      });

      await Promise.all([
        rotatePromise,
        playNarration(introAudioUrl, introTextRaw, currentRoom.title_i18n, undefined, 0)
      ]);

      if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
      if (!sequenceActiveRef.current || isInterruptedRef.current) return;

      const runInfoSequencePhase2 = async (index: number) => {
        if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
        if (!sequenceActiveRef.current || isInterruptedRef.current || !viewerRef.current) return;
        if (index >= infoPoints.length) {
          finishRoomSequence();
          return;
        }

        const item = infoPoints[index];
        const currentYaw = normalizeYaw(viewerRef.current.getYaw());
        const targetYaw = getShortestTargetYaw(currentYaw, item.wp.yaw);
        const targetPitch = item.wp.pitch ?? 0;

        viewerRef.current.lookAt(targetPitch, targetYaw, pickHfov(INFO_HFOV), 2200);

        await new Promise(r => setTimeout(r, 2300));
        if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
        if (!sequenceActiveRef.current || isInterruptedRef.current) return;

        await playNarration(item.wp.audio_url_i18n ?? item.wp.audio_url, item.wp.text_i18n, item.wp.title_i18n, item.i, 0);
        if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
        if (!sequenceActiveRef.current || isInterruptedRef.current) return;

        await new Promise(r => setTimeout(r, 1000));
        runInfoSequencePhase2(index + 1);
      };

      if (infoPoints.length > 0) {
        runInfoSequencePhase2(0);
      } else {
        finishRoomSequence();
      }
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
  const availableLanguages: Language[] = ['sr', 'en', 'de', 'ru'];
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

  return (
    <main style={{ position: 'relative', width: '100vw', height: '100dvh', backgroundColor: THEME.bg, overflow: 'hidden', fontFamily: THEME.fontBody }}>
      <style>{`
        .pnlm-load-box {
          display: none !important;
        }
        @media (min-width: 1024px) {
          .tour-ui-scale { zoom: 1.122; }
          /* Zoom ide na unutrašnji omotač (.k360-hotspot-scale), NE na
             .custom-nav-hotspot/.custom-info-hotspot - to je isti div koji
             Pannellum svaki kadar pozicionira preko transform:translate(),
             pa bi zoom na njemu skalirao i tu vrednost i tačka bi "plutala"
             dok se gleda okolo (vidi komentar u theme.ts). */
          .k360-hotspot-scale { zoom: 1.122; }
        }
        /* Blago pulsiranje tačaka u panorami, da posetilac odmah primeti šta
           je klikabilno - plavo za navigaciju, žuto za info tačke. Ide preko
           box-shadow (animacija ima prednost nad inline stilom iz JS-a). */
        @keyframes k360HotspotPulse {
          0% { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2), 0 0 0 0 rgba(91, 146, 214, 0.55); }
          70% { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2), 0 0 0 10px rgba(91, 146, 214, 0); }
          100% { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2), 0 0 0 0 rgba(91, 146, 214, 0); }
        }
        @keyframes k360HotspotPulseInfo {
          0% { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2), 0 0 0 0 rgba(253, 230, 138, 0.55); }
          70% { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2), 0 0 0 10px rgba(253, 230, 138, 0); }
          100% { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2), 0 0 0 0 rgba(253, 230, 138, 0); }
        }
        .custom-nav-hotspot { animation: k360HotspotPulse 2.6s ease-out infinite; }
        .custom-info-hotspot { animation: k360HotspotPulseInfo 2.6s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .custom-nav-hotspot, .custom-info-hotspot { animation: none; }
        }
      `}</style>

      {!tourStarted && (
        <WelcomeScreen
          coverUrl={welcomeCoverUrl}
          agencyName={tour?.agency_name ?? null}
          title={fullTourTitle}
          lede={t.welcome}
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
        <HotspotForm
          coords={pendingCoords}
          editing={editingIndex !== null}
          t={t}
          lang={lang}
          rooms={rooms}
          type={hotspotType}
          onType={setHotspotType}
          targetRoomId={targetRoomId}
          onTargetRoom={setTargetRoomId}
          title={hotspotTitle}
          onTitle={setHotspotTitle}
          text={hotspotText}
          onText={setHotspotText}
          audioUrl={hotspotAudioUrl}
          onAudioUrl={setHotspotAudioUrl}
          onSave={handleSaveHotspot}
          onDelete={handleDeleteHotspot}
          onCancel={handleCancelEdit}
        />
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
        <InfoCard
          title={displayedInfoTitle}
          text={displayedInfoText}
          closeLabel={t.close}
          onClose={() => {
            stopAudio();
            setInfoBoxData(null);
            setIsInfoboxManuallyClosed(true);
          }}
        />
      )}

      {/* MODAL: ADMIN LOGIN (Supabase Auth - zamena za staru ?admin=... lozinku) */}
      {showAdminLogin && !adminMode && (
        <AdminLoginModal
          email={loginEmail}
          password={loginPassword}
          onEmail={setLoginEmail}
          onPassword={setLoginPassword}
          onSubmit={handleAdminLogin}
          onCancel={() => setShowAdminLogin(false)}
          error={loginError}
          loading={loginLoading}
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