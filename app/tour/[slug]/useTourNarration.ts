import { useCallback, useRef, type RefObject } from 'react';
import { getLocalizedText } from './utils';
import type { Language } from './types';

/**
 * Naracija ture: pušta audio za tekući jezik, a kad audio ne postoji ili je
 * zvuk isključen, drži tekst na ekranu onoliko koliko treba da se pročita.
 *
 * Ceo posao je oko JEDNOG obećanja (Promise): sekvenca ture čeka da se
 * naracija završi. Zato promena jezika ili vraćanje zvuka usred naracije NE
 * pravi novo obećanje, nego presvlači audio i završi ono isto - inače bi
 * prvo ostalo zauvek nerešeno i cela tura bi stala.
 */

export type NarrationInfo = {
  titleRaw?: unknown;
  textRaw: unknown;
  index?: number;
  audio_url?: unknown;
} | null;

/** Dokle je stigao glas - titlovi po tome biraju rečenicu (NarrationSubtitles). */
export type AudioClock = { time: number; duration: number };

export function useTourNarration({
  isMountedRef,
  langRef,
  isMutedRef,
  onNarrationChange,
  onAudioActiveChange
}: {
  isMountedRef: RefObject<boolean>;
  langRef: RefObject<Language>;
  isMutedRef: RefObject<boolean>;
  /** Tekst koji prati naraciju - strana ga prikazuje u info kartici. */
  onNarrationChange: (info: NarrationInfo) => void;
  /**
   * true od trenutka kad snimljeni glas stvarno krene, false kad se naracija
   * završi ili prekine. Pauza (vodič pauziran) ga NE gasi - titl ostaje na
   * rečenici na kojoj je glas stao.
   */
  onAudioActiveChange?: (active: boolean) => void;
}) {
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCurrentTimeRef = useRef<number>(0);
  const audioDurationRef = useRef<number>(0);
  const setAudioActive = useCallback((active: boolean) => {
    onAudioActiveChange?.(active);
  }, [onAudioActiveChange]);

  // Rešavanje obećanja trenutne naracije i sirovi i18n podaci iz kojih se
  // ona može ponovo složiti na drugom jeziku.
  const activeResolveRef = useRef<(() => void) | null>(null);
  const activePlaybackRawRef = useRef<{
    audioUrlI18n: unknown;
    textFallback: unknown;
    title: unknown;
    index?: number;
  } | null>(null);

  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const guideCompleteTimerRef = useRef<NodeJS.Timeout | null>(null);

  /** Zaustavlja <audio> i pamti dokle je stigao, bez diranja obećanja. */
  const pauseElement = useCallback(() => {
    if (activeAudioRef.current) {
      audioCurrentTimeRef.current = activeAudioRef.current.currentTime;
      activeAudioRef.current.pause();
      activeAudioRef.current.onended = null;
      activeAudioRef.current.onerror = null;
      activeAudioRef.current = null;
    }
  }, []);

  const stopAudio = useCallback(() => {
    pauseElement();
    setAudioActive(false);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (guideCompleteTimerRef.current) {
      clearTimeout(guideCompleteTimerRef.current);
      guideCompleteTimerRef.current = null;
    }
  }, [pauseElement, setAudioActive]);

  /**
   * Pušta naraciju za TRENUTNI jezik iz zapamćenih sirovih podataka i završava
   * ISTO obećanje koje je napravljeno kad je naracija prvi put pokrenuta.
   */
  const playCurrent = useCallback((startAt: number = 0) => {
    const raw = activePlaybackRawRef.current;
    if (!raw || !isMountedRef.current) return;

    // Zaustavi trenutni <audio>/tajmer, ali NE rešavaj obećanje ovde.
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
      audioDurationRef.current = 0;
      setAudioActive(false);
      const resolveFn = activeResolveRef.current;
      activeResolveRef.current = null;
      activePlaybackRawRef.current = null;
      if (isMountedRef.current && resolveFn) resolveFn();
    };

    if (isMutedRef.current || !resolvedAudioUrl) {
      setAudioActive(false);
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
      if (Number.isFinite(audio.duration)) audioDurationRef.current = audio.duration;
      if (startAt > 0 && startAt < audio.duration) {
        audio.currentTime = startAt;
      }
    };
    audio.onplaying = () => {
      if (isMountedRef.current && activeAudioRef.current === audio) setAudioActive(true);
    };

    audio.onended = finish;
    audio.onerror = finish;

    audio.play().catch(finish);
  }, [isMountedRef, isMutedRef, langRef, setAudioActive]);

  /**
   * Trenutak i dužina glasa koji se čuje. Za vreme pauze vraća mesto na kom
   * je stao (titl ostaje na toj rečenici); null kad glasa nema.
   */
  const getAudioClock = useCallback((): AudioClock | null => {
    const audio = activeAudioRef.current;
    if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
      return { time: audio.currentTime, duration: audio.duration };
    }
    if (!audio && activePlaybackRawRef.current && audioDurationRef.current > 0) {
      return { time: audioCurrentTimeRef.current, duration: audioDurationRef.current };
    }
    return null;
  }, []);

  /** Pokreće naraciju i vraća obećanje koje se rešava kad se ona završi. */
  const playNarration = useCallback((
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

      onNarrationChange({ titleRaw: title, textRaw: textFallback, index, audio_url: audioUrlI18n });

      playCurrent(startAt);
    });
  }, [isMountedRef, onNarrationChange, playCurrent, stopAudio]);

  /** Isključen zvuk: pauziraj, ali sačuvaj mesto i obećanje. */
  const pauseForMute = useCallback(() => {
    pauseElement();
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, [pauseElement]);

  /** Vraćen zvuk: nastavi ISTU naraciju odakle je stala. */
  const resumeAfterMute = useCallback(() => {
    if (activePlaybackRawRef.current) playCurrent(audioCurrentTimeRef.current);
  }, [playCurrent]);

  /** Promenjen jezik usred naracije: ista naracija, novi jezik, od početka. */
  const restartInCurrentLanguage = useCallback(() => {
    if (activePlaybackRawRef.current) playCurrent(0);
  }, [playCurrent]);

  /** Naredna naracija kreće od početka, ne od zapamćenog mesta. */
  const resetPosition = useCallback(() => {
    audioCurrentTimeRef.current = 0;
  }, []);

  /**
   * Vodič javlja da je tura gotova tek kad naracija odćuti - tajmer zato
   * živi uz naraciju i gasi se zajedno sa njom (stopAudio).
   */
  const scheduleAfterNarration = useCallback((fn: () => void, ms: number) => {
    if (guideCompleteTimerRef.current) clearTimeout(guideCompleteTimerRef.current);
    guideCompleteTimerRef.current = setTimeout(fn, ms);
  }, []);

  return {
    stopAudio,
    playNarration,
    pauseForMute,
    resumeAfterMute,
    restartInCurrentLanguage,
    resetPosition,
    scheduleAfterNarration,
    getAudioClock
  };
}
