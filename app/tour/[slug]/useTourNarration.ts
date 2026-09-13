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

export function useTourNarration({
  isMountedRef,
  langRef,
  isMutedRef,
  onNarrationChange
}: {
  isMountedRef: RefObject<boolean>;
  langRef: RefObject<Language>;
  isMutedRef: RefObject<boolean>;
  /** Tekst koji prati naraciju - strana ga prikazuje u info kartici. */
  onNarrationChange: (info: NarrationInfo) => void;
}) {
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCurrentTimeRef = useRef<number>(0);

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
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (guideCompleteTimerRef.current) {
      clearTimeout(guideCompleteTimerRef.current);
      guideCompleteTimerRef.current = null;
    }
  }, [pauseElement]);

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
  }, [isMountedRef, isMutedRef, langRef]);

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
    scheduleAfterNarration
  };
}
