import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { Room, Tour, Waypoint } from './types';
import { getShortestTargetYaw, normalizeYaw, parseWaypoints } from './utils';
import {
  CREEP_HFOV,
  CREEP_MS,
  DEFAULT_HFOV,
  IMAGE_WAIT_MS,
  SETTLE_MS,
  VIEW_MAX_HFOV,
  VIEW_MIN_HFOV,
  WALK_HFOV,
  WALK_MIN_HFOV_BOUND,
  WALK_MS,
  WALK_REVEAL_AT,
  clampPitch,
  entryViewFor,
  pickHfov,
  preloadPanorama,
  prefersReducedMotion,
  scaledHfov,
  wait,
  type PendingTransition
} from './transition';
import { parseGuidePath, resolveGuidePath, type GuideStep } from './guidePath';

/**
 * Kretanje kroz turu i automatski vodič.
 *
 * - Ručno: klik na sobu (traka, tlocrt), strelice, ili navigaciona tačka u
 *   panorami (walkToRoom - kamera "prošeta" do vrata, pa prelaz).
 * - Vodič: hoda kroz putanju ture (guidePath.ts) sam; svaki ručni klik mu
 *   preuzima kontrolu (takeManualControl), a može da se pauzira.
 *
 * Samu scenu (Pannellum, pretapanje, koreografiju sobe) pravi efekat u
 * page.tsx; ovaj hook samo odlučuje KUDA i postavlja pendingTransitionRef
 * koji taj efekat troši. Refovi prelaza su zajednički, pa stižu spolja.
 */

type InfoBoxData = { titleRaw?: unknown; textRaw: unknown; index?: number; audio_url?: unknown } | null;

export function useRoomNavigation({
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
}: {
  tour: Tour | null;
  rooms: Room[];
  roomIdx: number;
  setRoomIdx: Dispatch<SetStateAction<number>>;
  tourStarted: boolean;
  setTourStarted: (value: boolean) => void;
  setRoomLoading: (value: boolean) => void;
  isMountedRef: MutableRefObject<boolean>;
  roomSessionRef: MutableRefObject<number>;
  sequenceActiveRef: MutableRefObject<boolean>;
  isInterruptedRef: MutableRefObject<boolean>;
  // Pannellum viewer nema tipove.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  viewerRef: MutableRefObject<any>;
  pendingTransitionRef: MutableRefObject<PendingTransition | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fadingLayerRef: MutableRefObject<{ viewer: any; el: HTMLDivElement } | null>;
  walkTokenRef: MutableRefObject<number>;
  walkingRef: MutableRefObject<boolean>;
  resetPosition: () => void;
  stopCurrentAnimation: () => void;
  stopAudio: () => void;
  setInfoBoxData: (data: InfoBoxData) => void;
  setIsRoomTourFullyCompleted: (value: boolean) => void;
  setIsInfoboxManuallyClosed: (value: boolean) => void;
  pauseForMute: () => void;
  resumeAfterMute: () => void;
}) {
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

  // Pauza automatskog vodiča: zamrzava naraciju (isti mehanizam kao zvuk -
  // pauseForMute/resumeAfterMute) i kameru (kruženje faze 1, info-tačaka i
  // završnog kruženja ka vratima), dok se ponovo ne klikne. Kratki, već
  // pokrenuti pomeraji kamere (2.2s pogled ka tački, 2.5s hod ka vratima)
  // se namerno ne prekidaju na pola - suviše kratki da bi to bilo primetno,
  // a naredni korak čeka na pauzu pre nego što krene.
  const [isGuidePaused, setIsGuidePaused] = useState(false);
  const isGuidePausedRef = useRef(false);

  // Ručni klik (soba, tačka, tlocrt) uvek preuzima kontrolu od vodiča - kao
  // audio-vodič u muzeju: čim nešto sam pipneš, vodič ćuti. `transition.guided`
  // označava korak koji je pokrenuo SAM vodič, pa ovo za njega preskačemo.
  const takeManualControl = useCallback(() => {
    if (guideFinishedTimerRef.current) {
      clearTimeout(guideFinishedTimerRef.current);
      guideFinishedTimerRef.current = null;
    }
    setGuideFinished(false);
    // Pauza ima smisla samo dok vodič vodi - ručno preuzimanje je već
    // "pauza" na svoj način (posetilac sam gleda), pa se ne nosi dalje.
    if (isGuidePausedRef.current) {
      isGuidePausedRef.current = false;
      setIsGuidePaused(false);
    }
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


  // Isti mehanizam kao isključivanje zvuka (pauseForMute čuva mesto u
  // naraciji), plus zamrzavanje kamere - vidi checkCompletion/lingerTick
  // (faza 1 i završno kruženje) i waitWhilePaused (tačke i uvod) niže,
  // koji proveravaju isGuidePausedRef pre svakog sledećeg koraka.
  const togglePauseGuide = () => {
    const next = !isGuidePausedRef.current;
    isGuidePausedRef.current = next;
    setIsGuidePaused(next);
    if (next) {
      pauseForMute();
    } else {
      resumeAfterMute();
    }
  };

  // Čeka dok je tura pauzirana - koristi se PRE svakog vidljivog koraka
  // (pomeranje kamere ka tački, početak naracije) da pauza deluje i kad je
  // kliknuta usred kratke pauze IZMEĐU koraka, ne samo usred naracije.
  const waitWhilePaused = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const check = () => {
        if (!isMountedRef.current || !isGuidePausedRef.current) {
          resolve();
          return;
        }
        setTimeout(check, 200);
      };
      check();
    });
  }, []);
  return {
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
  };
}
