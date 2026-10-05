import type { MutableRefObject } from 'react';
import { lastCueStartFraction } from './subtitleCues';
import { translations } from './translations';
import type { EstablishData, Language, Room, Waypoint } from './types';
import { composeEstablishText, getLocalizedText, getShortestTargetYaw, normalizeYaw } from './utils';
import {
  ARRIVE_GLIDE_DEG_PER_S,
  ARRIVE_GLIDE_MAX_MS,
  ARRIVE_GLIDE_MIN_MS,
  DEFAULT_HFOV,
  INFO_HFOV,
  INFO_TURN_MAX_MS,
  ENTRY_HOLD_MS,
  INFO_TURN_MIN_MS,
  LEVEL_PITCH,
  ROTATE_PITCH,
  ROTATE_RAMP_MS,
  clampPitch,
  pickHfov,
  prefersReducedMotion,
  turnMsFor
} from './transition';
import { GUIDE_REVISIT_SETTLE_MS } from './guidePath';

/**
 * "Koreografija" jedne sobe, od trenutka kad se njena panorama učita:
 *
 *   1. uvod - kamera kruži (faza 1) dok traje uvodna naracija sobe;
 *   2. info-tačke - kamera se okrene ka svakoj i pusti njen opis;
 *   3. kraj - u ručnom režimu mirno kruženje ("slobodno razgledanje"), a
 *      u automatskom vodiču kruženje tačno do sledećih vrata, pa dalje;
 *   *  soba koju je vodič već predstavio samo se prođe (odmah ka vratima).
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
  /**
   * Priča i info-tačke ove sobe su gotove - tek tada se pojavljuje dugme za
   * poruku agentu (page.tsx, ChatAgentButton). Na ulasku u sobu se gasi.
   */
  setRoomTalkDone: (value: boolean) => void;
  scheduleAfterNarration: (fn: () => void, fallbackMs: number) => void;
  playNarration: (
    audio: unknown,
    text: unknown,
    title: unknown,
    index: number | undefined,
    startAt: number,
    options?: { closeWhenDone?: boolean }
  ) => Promise<unknown>;
  waitWhilePaused: () => Promise<void>;
  /** Dokle je stigao snimljeni glas (useTourNarration) - za puls vrata. */
  getAudioClock: () => { time: number; duration: number } | null;
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
    targetEstablishYaw,
    targetEstablishPitch,
    isGuidedStep,
    stopCurrentAnimation,
    setInfoBoxData,
    setIsRoomTourFullyCompleted,
    setRoomTalkDone,
    scheduleAfterNarration,
    playNarration,
    waitWhilePaused,
    getAudioClock,
    nextGuideDoor,
    advanceGuide
  } = ctx;

  setRoomTalkDone(false);

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
        viewerRef.current.startAutoRotate(idleRotateDegPerSec, ROTATE_PITCH);
      }
    }
  };

  // Poslednja soba (nema vrata dalje): kamera još ovoliko mirno kruži pre
  // poruke da je obilazak gotov.
  const GUIDE_ROOM_LINGER_MS = 7000;
  // Pošto se kamera okrene ka vratima koja svetle, zadrži se na njima
  // ovoliko pre nego što krene kroz njih - da posetilac vidi kuda ide.
  const DOOR_HOLD_MS = 2500;

  // Kraj priče u sobi. Ručni režim: mirno kruženje (startInfiniteGlide).
  // Automatski vodič (vlasnik, 30. 9. 2026 - "neka kamera kruži prema
  // sledećoj tački"): kamera se NAJKRAĆIM putem, mirno (turnMsFor), okrene
  // ka vratima koja upravo svetle (watchNextDoorPulse), ravno i odzumirano,
  // zadrži se DOOR_HOLD_MS, pa prilaz. Ranije je ovde išlo startAutoRotate
  // sa brzinom računatom "do vrata", ali Pannellum pozitivnom brzinom
  // SMANJUJE yaw, pa se kamera vrtela od vrata umesto ka njima.
  const finishRoomSequence = () => {
    if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
    if (!sequenceActiveRef.current || isInterruptedRef.current) return;
    roomSequenceFinishedRef.current = true;
    setRoomTalkDone(true);

    if (guideModeRef.current === 'auto') {
      const doorAhead = nextGuideDoor();
      const doorYawFrom = (fromYaw: number) => getShortestTargetYaw(fromYaw, doorAhead?.yaw ?? 0);

      // Okret ka vratima za preostalo vreme okreta - i na početku i posle
      // nastavka iz pauze, uvek od TRENUTNOG pogleda.
      const turnToDoor = (ms: number) => {
        if (!doorAhead || !viewerRef.current || isGyroActiveRef.current) return;
        const fromYaw = normalizeYaw(viewerRef.current.getYaw());
        try {
          viewerRef.current.lookAt(LEVEL_PITCH, doorYawFrom(fromYaw), pickHfov(DEFAULT_HFOV), Math.max(600, ms));
        } catch {}
      };
      const idleRotate = () => {
        if (!viewerRef.current || isGyroActiveRef.current) return;
        viewerRef.current.startAutoRotate(360 / 30, ROTATE_PITCH); // 360° za 30 s, bez cilja
      };

      let turnMs = 0;
      if (doorAhead && viewerRef.current && !isGyroActiveRef.current) {
        const fromYaw = normalizeYaw(viewerRef.current.getYaw());
        turnMs = prefersReducedMotion() ? 0 : turnMsFor(doorYawFrom(fromYaw) - fromYaw, INFO_TURN_MIN_MS, INFO_TURN_MAX_MS);
      }
      const totalMs = doorAhead ? turnMs + DOOR_HOLD_MS : GUIDE_ROOM_LINGER_MS;

      if (doorAhead) turnToDoor(turnMs);
      else idleRotate();
      // Priča je gotova (ili je bez zvuka) - vrata ka sledećoj sobi svetle
      // dok kamera ne krene kroz njih.
      watchNextDoorPulse(null);

      // Vreme teče samo dok vodič NIJE pauziran; pauza zaustavi i kameru.
      let elapsed = 0;
      let lastTick = performance.now();
      let wasPaused = isGuidePausedRef.current;
      const lingerTick = (now: number) => {
        if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
        if (!sequenceActiveRef.current || isInterruptedRef.current) return;

        const pausedNow = isGuidePausedRef.current;
        if (pausedNow && !wasPaused && viewerRef.current) {
          try {
            viewerRef.current.stopAutoRotate();
            viewerRef.current.stopMovement?.();
          } catch {}
        } else if (!pausedNow && wasPaused) {
          if (doorAhead) turnToDoor(turnMs - elapsed);
          else idleRotate();
        }
        wasPaused = pausedNow;
        if (!pausedNow) elapsed += now - lastTick;
        lastTick = now;

        if (elapsed < totalMs) {
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


  // Vrata kroz koja vodič sledeće ide lagano zasvetle (vlasnik, 30. 9. 2026):
  // od poslednje rečenice priče u sobi pa dok kamera ne krene kroz njih.
  // Klasa k360-next-door (izgled u TourOverlays) ide na tačku čiji je cilj
  // soba sledećeg koraka - page.tsx joj upisuje data-target-room.
  const setNextDoorPulse = (on: boolean) => {
    const container: HTMLElement | undefined = viewerRef.current?.getContainer?.();
    if (!container) return;
    container.querySelectorAll('.k360-next-door').forEach((el) => el.classList.remove('k360-next-door'));
    const door = on ? nextGuideDoor() : null;
    if (door?.targetRoomId == null) return;
    container.querySelectorAll<HTMLElement>('.custom-nav-hotspot').forEach((el) => {
      if (el.dataset.targetRoom === String(door.targetRoomId)) el.classList.add('k360-next-door');
    });
  };
  let pulseWatch: number | null = null;
  // lastText: tekst poslednje priče - puls kreće kad glas stigne do njene
  // poslednje rečenice. null = odmah. Bez snimljenog glasa (isključen zvuk)
  // sat ne postoji, pa puls kreće tek kad soba završi (finishRoomSequence).
  // Nadzor se gasi i skida puls čim vodič stane (ručni klik, druga soba).
  const watchNextDoorPulse = (lastText: string | null) => {
    if (pulseWatch !== null) window.clearInterval(pulseWatch);
    const from = lastText === null ? 0 : lastCueStartFraction(lastText);
    let on = false;
    const tick = () => {
      const guiding =
        currentSession === roomSessionRef.current && isMountedRef.current &&
        sequenceActiveRef.current && !isInterruptedRef.current && guideModeRef.current === 'auto';
      if (!guiding) {
        if (pulseWatch !== null) window.clearInterval(pulseWatch);
        pulseWatch = null;
        if (on && currentSession === roomSessionRef.current) setNextDoorPulse(false);
        return;
      }
      if (on) return;
      const clock = lastText === null ? null : getAudioClock();
      if (lastText === null || (clock && clock.time / clock.duration >= from)) {
        on = true;
        setNextDoorPulse(true);
      }
    };
    pulseWatch = window.setInterval(tick, 200);
    tick();
  };

  const roomKey = String(currentRoom.id);
  if (isGuidedStep && visitedGuideRoomsRef.current.has(roomKey)) {
    // Vodič drugi put prolazi kroz VEĆ predstavljenu sobu (npr. hodnik
    // kao prolaz između grana) - bez priče i bez stajanja. Posetilac je
    // ušao gledajući napred (entryViewFor), pa posle kratkog predaha odmah
    // kreće prilaz sledećim vratima - taj prilaz SAM okrene kameru ka njima
    // (walkToRoom). Ranije se ovde kamera prvo okretala ka vratima, pa je
    // prilaz dodavao još jedan okret; kad putanja prođe kroz više takvih
    // soba zaredom, to je izgledalo kao vrtenje u krug (vlasnik, 30. 9. 2026).
    window.setTimeout(() => {
      if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
      if (!sequenceActiveRef.current || isInterruptedRef.current) return;
      if (guideModeRef.current === 'auto') advanceGuide();
    }, GUIDE_REVISIT_SETTLE_MS);
    return;
  }
  if (!isGuidedStep && visitedGuideRoomsRef.current.has(roomKey)) {
    // Ručni povratak u sobu koja je već ispričana: bez priče i bez kruženja -
    // posetilac sam gleda, info-tačke i dalje pričaju na klik.
    stopCurrentAnimation();
    roomSequenceFinishedRef.current = true;
    setIsRoomTourFullyCompleted(true);
    return;
  }
  visitedGuideRoomsRef.current.add(roomKey);

  // Posle ulaska kroz vrata kamera gleda u smeru kretanja (entryViewFor) -
  // to je samo spoj dve slike. Odmah se glatko okrene ka najlepšem kadru
  // sobe (establish), uz koji ide uvodna naracija. Vraća trajanje okreta
  // (0 = nije bilo okreta: nema ulaska, žiroskop ili smanjeno kretanje).
  // Pre okreta kamera ENTRY_HOLD_MS mirno gleda napred (vidi transition.ts);
  // vraćeno trajanje uključuje i to zadržavanje.
  const glideToEstablish = (): number => {
    if (!entry || !viewerRef.current || isGyroActiveRef.current || prefersReducedMotion()) return 0;
    try {
      const fromYaw = normalizeYaw(viewerRef.current.getYaw());
      const toYaw = getShortestTargetYaw(fromYaw, targetEstablishYaw);
      const ms = turnMsFor(toYaw - fromYaw, ARRIVE_GLIDE_MIN_MS, ARRIVE_GLIDE_MAX_MS, ARRIVE_GLIDE_DEG_PER_S);
      // Vodič posle ovoga kruži, pa odmah na nagib kruženja; ručni režim
      // staje na kadru koji je autor ture izabrao.
      const pitch = guideModeRef.current === 'auto' ? ROTATE_PITCH : clampPitch(targetEstablishPitch);
      window.setTimeout(() => {
        // Posetilac je za tu sekundu mogao da pređe u drugu sobu ili da
        // sam uhvati panoramu - tada se ne okreće.
        if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
        if (!sequenceActiveRef.current || isInterruptedRef.current || !viewerRef.current) return;
        try { viewerRef.current.lookAt(pitch, toYaw, undefined, ms); } catch {}
      }, ENTRY_HOLD_MS);
      return ENTRY_HOLD_MS + ms;
    } catch {
      return 0;
    }
  };

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

  // "Istražite sami" (vlasnik, 28. 9. 2026): bez priče koja teče sama. Ranije
  // je i ovde kamera sama kružila i obilazila info-tačke, a tekst se menjao na
  // svakih par sekundi - posetilac je dobijao niz prekinutih rečenica koje mu
  // beže, i naslov sobe iznad teksta o nekom detalju. Sada: kadar se otvori,
  // kartica pokaže naziv sobe i uvod (ceo, "Više" za ostatak); info-tačke
  // pričaju tek na dodir, svaka sa svojim naslovom. Snimljena naracija (ako
  // soba ima audio) se i dalje pušta, a kad se odsluša, kartica se sama
  // skloni (vlasnik, 2. 10. 2026). Bez snimka kartica stoji dok je posetilac
  // ne zatvori - čita svojim tempom.
  if (guideModeRef.current !== 'auto') {
    stopCurrentAnimation();
    if (!entry && viewerRef.current) {
      try {
        if (!zoomedIn) viewerRef.current.setHfov(pickHfov(DEFAULT_HFOV));
        viewerRef.current.setYaw(targetEstablishYaw);
        viewerRef.current.setPitch(targetEstablishPitch);
      } catch {}
    }
    // Priča kreće tek kad kamera stigne do početnog kadra (vlasnik, 1. 10. 2026).
    const glideMs = entry ? glideToEstablish() : 0;
    window.setTimeout(() => {
      if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
      if (!sequenceActiveRef.current || isInterruptedRef.current) return;
      void playNarration(hasRecordedAudio ? introAudioUrl : undefined, introTextRaw, currentRoom.title_i18n, undefined, 0, { closeWhenDone: true });
    }, glideMs);
    roomSequenceFinishedRef.current = true;
    setIsRoomTourFullyCompleted(true);
    return;
  }

  // Koliko traje ulazak (zadržavanje + okret ka početnom kadru) - priča i
  // kruženje čekaju da se završi. Postavlja beginRotation, pre playIntroNarration.
  let arrivalMs = 0;

  const playIntroNarration = async () => {
    // Priča kreće tek kad kamera STIGNE do početnog kadra priče, ne dok se
    // još okreće (vlasnik, 1. 10. 2026).
    if (arrivalMs > 0) await new Promise((r) => setTimeout(r, arrivalMs));
    await waitWhilePaused();
    if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
    if (!sequenceActiveRef.current || isInterruptedRef.current) return;
    if (hasRecordedAudio || (!introOnlyText && !detailOnlyText)) {
      // Soba bez info-tačaka: uvod je poslednja priča u sobi.
      if (infoPoints.length === 0) watchNextDoorPulse(getLocalizedText(introTextRaw, langRef.current));
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

  // Menja brzinu kruženja POSTEPENO (ROTATE_RAMP_MS, ease-out) umesto skoka -
  // Pannellum-ov startAutoRotate kreće odmah punom brzinom. Brzina se menja
  // kroz getConfig().autoRotate, koji Pannellum čita u svakom kadru. Do nule
  // = kruženje se na kraju zaustavi. Prekid (pauza, druga soba) ga prekida.
  const easeAutoRotate = (toSpeed: number, stillValid: () => boolean) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (prefersReducedMotion()) {
      if (toSpeed === 0) viewer.stopAutoRotate();
      else viewer.startAutoRotate(toSpeed, ROTATE_PITCH);
      return;
    }
    const config = viewer.getConfig?.();
    let fromSpeed = config && typeof config.autoRotate === 'number' ? config.autoRotate : 0;
    if (!fromSpeed) {
      if (toSpeed === 0) return;
      // Kreni jedva primetno, pa ubrzaj (startAutoRotate ujedno vrati nagib i zoom).
      fromSpeed = toSpeed * 0.02;
      viewer.startAutoRotate(fromSpeed, ROTATE_PITCH);
    }
    const cfg = viewer.getConfig?.();
    if (!cfg) return;
    const startedAt = performance.now();
    const step = (now: number) => {
      if (!stillValid() || viewerRef.current !== viewer || !cfg.autoRotate || isGuidePausedRef.current) return;
      const k = Math.min(1, (now - startedAt) / ROTATE_RAMP_MS);
      const eased = 1 - (1 - k) * (1 - k);
      const v = fromSpeed + (toSpeed - fromSpeed) * eased;
      if (k >= 1 && toSpeed === 0) {
        viewer.stopAutoRotate();
        return;
      }
      cfg.autoRotate = v === 0 ? toSpeed * 0.001 : v;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const rotatePromise = new Promise<void>((resolve) => {
    const durationPhase1 = 15000;
    const totalDegrees = 250;
    // Smer kruženja je uvek isti (vlasnik, 1. 10. 2026: kad se pratio smer
    // okreta ka kadru, priča je "išla u pogrešnom smeru"). Prelaz ostaje
    // gladak jer okret ka kadru staje u mirovanju, a kruženje kreće od nule.
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
          // Ušli smo kroz vrata gledajući napred: prvo glatko ka najlepšem
          // kadru sobe, pa odatle kruženje - bez skoka.
          const glideMs = glideToEstablish();
          arrivalMs = glideMs;
          const startRotate = () => {
            if (!stillValid() || !viewerRef.current || isGyroActiveRef.current) return;
            if (isGuidePausedRef.current) return;
            easeAutoRotate(speed, stillValid);
          };
          if (glideMs > 0) window.setTimeout(startRotate, glideMs);
          else startRotate();
        } else {
          if (!zoomedIn) viewerRef.current.setHfov(pickHfov(DEFAULT_HFOV));
          viewerRef.current.setYaw(targetEstablishYaw);
          viewerRef.current.setPitch(ROTATE_PITCH);
          if (!isGyroActiveRef.current) easeAutoRotate(speed, stillValid);
        }
      }

      // elapsedMs raste samo dok NIJE pauzirano - pauza tako prirodno
      // zamrzne i odbrojavanje i kameru, bez posebnog "koliko je prošlo
      // dok je stajalo" računanja.
      let elapsedMs = 0;
      let lastTick = performance.now();
      let wasPaused = isGuidePausedRef.current;
      let slowingDown = false;
      const checkCompletion = (now: number) => {
        if (!stillValid()) {
          if (viewerRef.current) viewerRef.current.stopAutoRotate();
          return resolve();
        }
        const pausedNow = isGuidePausedRef.current;
        if (pausedNow && !wasPaused) {
          if (viewerRef.current) viewerRef.current.stopAutoRotate();
        } else if (!pausedNow && wasPaused && viewerRef.current && !isGyroActiveRef.current) {
          easeAutoRotate(speed, stillValid);
        }
        // Pred kraj faze kruženje lagano uspori do nule (ne staje naglo pred
        // okret ka prvoj info-tački).
        if (!pausedNow && !slowingDown && elapsedMs >= durationPhase1 - ROTATE_RAMP_MS) {
          slowingDown = true;
          easeAutoRotate(0, stillValid);
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
      // Odbrojavanje kruženja kreće kad kamera stigne do početnog kadra -
      // zajedno sa pričom (arrivalMs), da faza ne pojede vreme ulaska.
      window.setTimeout(() => {
        lastTick = performance.now();
        animFrameRef.current = requestAnimationFrame(checkCompletion);
      }, arrivalMs);
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

    // Trajanje srazmerno uglu (vidi turnMsFor): daleke tačke se ne
    // "prelete", bliske se ne razvlače.
    const turnMs = turnMsFor(targetYaw - currentYaw, INFO_TURN_MIN_MS, INFO_TURN_MAX_MS);
    viewerRef.current.lookAt(targetPitch, targetYaw, pickHfov(INFO_HFOV), turnMs);

    await new Promise(r => setTimeout(r, turnMs + 100));
    if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
    if (!sequenceActiveRef.current || isInterruptedRef.current) return;

    if (index === infoPoints.length - 1) watchNextDoorPulse(getLocalizedText(item.wp.text_i18n, langRef.current));
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
