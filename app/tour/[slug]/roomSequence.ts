import type { MutableRefObject } from 'react';
import { translations } from './translations';
import type { EstablishData, Language, Room, Waypoint } from './types';
import { composeEstablishText, getLocalizedText, getShortestTargetYaw, normalizeYaw } from './utils';
import {
  ARRIVE_HFOV,
  DEFAULT_HFOV,
  INFO_HFOV,
  clampPitch,
  pickHfov,
  prefersReducedMotion,
  scaledHfov
} from './transition';
import { GUIDE_REVISIT_OVERLAP_MS, GUIDE_REVISIT_TURN_MIN_MS, revisitTurnMs } from './guidePath';

/**
 * "Koreografija" jedne sobe, od trenutka kad se njena panorama učita:
 *
 *   1. uvod - kamera kruži (faza 1) dok traje uvodna naracija sobe;
 *   2. info-tačke - kamera se okrene ka svakoj i pusti njen opis;
 *   3. kraj - u ručnom režimu mirno kruženje ("slobodno razgledanje"), a
 *      u automatskom vodiču kruženje tačno do sledećih vrata, pa dalje;
 *   *  soba koju je vodič već predstavio samo se prođe (okret ka vratima).
 *
 * Poziva se iz efekta koji pravi scenu (page.tsx, v.on('load')). Sve što
 * joj treba stiže kroz `ctx` - refovi (stanje koje se menja dok sekvenca
 * traje: pauza, prekid, režim vodiča) i funkcije iz strane. Svaki korak
 * posle čekanja proverava da je soba i dalje ista (currentSession) i da
 * sekvenca nije prekinuta - klik posetioca je prekida u bilo kom trenutku.
 */

type InfoBoxData = { titleRaw?: unknown; textRaw: unknown; index?: number; audio_url?: unknown } | null;

export type RoomSequenceContext = {
  /** Broj scene za koju je sekvenca pokrenuta - poredi se sa roomSessionRef. */
  currentSession: number;
  roomSessionRef: MutableRefObject<number>;
  isMountedRef: MutableRefObject<boolean>;
  sequenceActiveRef: MutableRefObject<boolean>;
  isInterruptedRef: MutableRefObject<boolean>;
  // Pannellum viewer nema tipove.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  viewerRef: MutableRefObject<any>;
  animFrameRef: MutableRefObject<number | null>;
  isGyroActiveRef: MutableRefObject<boolean>;
  isGuidePausedRef: MutableRefObject<boolean>;
  guideModeRef: MutableRefObject<'auto' | 'manual'>;
  roomSequenceFinishedRef: MutableRefObject<boolean>;
  visitedGuideRoomsRef: MutableRefObject<Set<string>>;
  langRef: MutableRefObject<Language>;

  currentRoom: Room;
  waypointsList: Waypoint[];
  establishData: EstablishData;
  /** Ulazak kroz vrata (smer kretanja) - null kad soba kreće od uvodnog pogleda. */
  entry: { yaw: number; pitch: number } | null;
  zoomedIn: boolean;
  startPitch: number;
  targetEstablishYaw: number;
  targetEstablishPitch: number;
  /** Korak je pokrenuo automatski vodič, ne ručan klik. */
  isGuidedStep: boolean;

  stopCurrentAnimation: () => void;
  setInfoBoxData: (data: InfoBoxData) => void;
  setIsRoomTourFullyCompleted: (value: boolean) => void;
  scheduleAfterNarration: (fn: () => void, fallbackMs: number) => void;
  playNarration: (
    audio: unknown,
    text: unknown,
    title: unknown,
    index: number | undefined,
    startAt: number
  ) => Promise<unknown>;
  waitWhilePaused: () => Promise<void>;
  nextGuideDoor: () => Waypoint | null;
  advanceGuide: () => void;
};

export async function runRoomSequence(ctx: RoomSequenceContext): Promise<void> {
  const {
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
  } = ctx;

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

  // Vodič ne prelazi u sledeću sobu ODMAH posle poslednje info-tačke -
  // kamera još kruži ovoliko da posetilac stigne da pogleda okolo.
  const GUIDE_ROOM_LINGER_MS = 7000;

  // Kraj naracije sobe: u ručnom modu se kao i do sada samo mirno stoji
  // (startInfiniteGlide); u automatskom vodič kruži GUIDE_ROOM_LINGER_MS,
  // pa tek onda ide dalje. Kruženje namerno NIJE nasumično: brzina se
  // računa tako da kamera stigne TAČNO do sledećih vrata (ili tačke ka
  // sledećoj sobi) kad vreme istekne - isti obrazac kao "beginRotation"
  // gore (ugao / trajanje = brzina), samo je ovde ugao razdaljina do
  // vrata, ne fiksnih 240°. Ako nema sledećeg koraka (poslednja soba),
  // kruži bez cilja, kao i pre.
  const finishRoomSequence = () => {
    if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
    if (!sequenceActiveRef.current || isInterruptedRef.current) return;
    roomSequenceFinishedRef.current = true;

    if (guideModeRef.current === 'auto') {
      // Brzina se preračuna svaki put kad kruženje (ponovo) krene - i na
      // startu i posle svakog nastavka iz pauze - uvek na osnovu TRENUTNOG
      // ugla kamere i PREOSTALOG vremena, pa uvek stigne do vrata bez
      // obzira koliko je puta pauzirano usput.
      const applyLingerRotation = (remainingMs: number) => {
        if (!viewerRef.current || isGyroActiveRef.current) return;
        const doorAhead = nextGuideDoor();
        if (doorAhead) {
          const fromYaw = normalizeYaw(viewerRef.current.getYaw());
          // NAMERNO ne getShortestTargetYaw (taj bira kraći put, koji ume da
          // bude suprotan smeru u kom je kamera već krenula u "Fazi 1" gore -
          // posetilac bi video da se okretanje odjednom vrati unazad). Umesto
          // toga uvek isti smer kao početna rotacija (pozitivan ugao/korak),
          // makar to značilo da ide "dužim putem" do vrata.
          const forwardDelta = (((doorAhead.yaw ?? 0) - fromYaw) % 360 + 360) % 360;
          const turnSpeed = remainingMs > 0 ? forwardDelta / (remainingMs / 1000) : 0;
          viewerRef.current.startAutoRotate(turnSpeed, clampPitch(doorAhead.pitch ?? targetEstablishPitch));
        } else {
          const idleRotateDegPerSec = 360 / 30; // 360° za 30 sekundi, bez cilja (poslednja soba)
          viewerRef.current.startAutoRotate(idleRotateDegPerSec, targetEstablishPitch);
        }
      };

      applyLingerRotation(GUIDE_ROOM_LINGER_MS);

      let lingerElapsed = 0;
      let lastTick = performance.now();
      let wasPaused = isGuidePausedRef.current;
      const lingerTick = (now: number) => {
        if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
        if (!sequenceActiveRef.current || isInterruptedRef.current) return;

        const pausedNow = isGuidePausedRef.current;
        if (pausedNow && !wasPaused) {
          if (viewerRef.current) viewerRef.current.stopAutoRotate();
        } else if (!pausedNow && wasPaused) {
          applyLingerRotation(Math.max(0, GUIDE_ROOM_LINGER_MS - lingerElapsed));
        }
        wasPaused = pausedNow;
        if (!pausedNow) lingerElapsed += now - lastTick;
        lastTick = now;

        if (lingerElapsed < GUIDE_ROOM_LINGER_MS) {
          animFrameRef.current = requestAnimationFrame(lingerTick);
        } else {
          if (viewerRef.current) viewerRef.current.stopAutoRotate();
          if (guideModeRef.current === 'auto') advanceGuide();
        }
      };
      animFrameRef.current = requestAnimationFrame(lingerTick);
    } else {
      startInfiniteGlide();
    }
  };


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

  // Namena sobe i specifično za sobu se pišu kao dva odvojena polja
  // (vidi TourAdminTools "📝 Naracija") i tako se i prikazuju - dva
  // uzastopna infoboksa, ne jedan spojen tekst. Izuzetak: ako soba već
  // ima SNIMLJEN audio (od pre nego što je TTS isključen), taj audio
  // priča ceo spojeni tekst kao jednu celinu, pa prikaz ostaje spojen
  // da se ne raziđe od onoga što se čuje - vidi [[project-voice-narration-pending]].
  const hasRecordedAudio = Boolean(getLocalizedText(introAudioUrl, langRef.current));
  const introOnlyText = getLocalizedText(establishData.intro_i18n, langRef.current);
  const detailOnlyText = getLocalizedText(establishData.detail_i18n, langRef.current);

  const playIntroNarration = async () => {
    await waitWhilePaused();
    if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
    if (!sequenceActiveRef.current || isInterruptedRef.current) return;
    if (hasRecordedAudio || (!introOnlyText && !detailOnlyText)) {
      await playNarration(introAudioUrl, introTextRaw, currentRoom.title_i18n, undefined, 0);
      return;
    }
    if (introOnlyText) {
      await playNarration(undefined, establishData.intro_i18n, currentRoom.title_i18n, undefined, 0);
    }
    if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
    if (!sequenceActiveRef.current || isInterruptedRef.current) return;
    if (detailOnlyText) {
      await playNarration(undefined, establishData.detail_i18n, currentRoom.title_i18n, undefined, 0);
    }
  };

  const rotatePromise = new Promise<void>((resolve) => {
    const durationPhase1 = 15000;
    const totalDegrees = 250;
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

      // elapsedMs raste samo dok NIJE pauzirano - pauza tako prirodno
      // zamrzne i odbrojavanje i kameru, bez posebnog "koliko je prošlo
      // dok je stajalo" računanja.
      let elapsedMs = 0;
      let lastTick = performance.now();
      let wasPaused = isGuidePausedRef.current;
      const checkCompletion = (now: number) => {
        if (!stillValid()) {
          if (viewerRef.current) viewerRef.current.stopAutoRotate();
          return resolve();
        }
        const pausedNow = isGuidePausedRef.current;
        if (pausedNow && !wasPaused) {
          if (viewerRef.current) viewerRef.current.stopAutoRotate();
        } else if (!pausedNow && wasPaused && viewerRef.current && !isGyroActiveRef.current) {
          viewerRef.current.startAutoRotate(speed, entry ? startPitch : targetEstablishPitch);
        }
        wasPaused = pausedNow;
        if (!pausedNow) elapsedMs += now - lastTick;
        lastTick = now;

        if (elapsedMs < durationPhase1) {
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

  await Promise.all([rotatePromise, playIntroNarration()]);

  if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
  if (!sequenceActiveRef.current || isInterruptedRef.current) return;

  const runInfoSequencePhase2 = async (index: number) => {
    if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
    if (!sequenceActiveRef.current || isInterruptedRef.current || !viewerRef.current) return;
    if (index >= infoPoints.length) {
      finishRoomSequence();
      return;
    }

    // Pauzirano IZMEĐU tačaka (nema šta da se zamrzne, ništa se još ne
    // pomera) - sledeći pogled ka tački čeka ovde dok se ne nastavi.
    await waitWhilePaused();
    if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
    if (!sequenceActiveRef.current || isInterruptedRef.current || !viewerRef.current) return;

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
}
