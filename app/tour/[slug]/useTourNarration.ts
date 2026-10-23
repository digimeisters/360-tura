import { useCallback, useRef, type RefObject } from 'react';
import { getAudioUrlFor, getLocalizedText } from './utils';
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
  onAudioActiveChange,
  onAutoplayBlocked,
  onAudioFailedChange,
  onExternalPause
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
  /**
   * Pregledač nije dozvolio zvuk (iPhone pušta glas samo na dodir). Strana
   * tada isključi zvuk: posetilac čita tekst i ikonica pokazuje da je zvuk
   * isključen - jedan dodir na nju (pravi dodir) pušta istu naraciju.
   */
  onAutoplayBlocked?: () => void;
  /**
   * Snimak ove naracije nije mogao da se pusti (greška, zaglavljena mreža).
   * Strana tada umesto titla pokaže karticu sa tekstom; false na početku
   * svake naracije.
   */
  onAudioFailedChange?: (failed: boolean) => void;
  /** Glas je pauzirao neko drugi (poziv, zaključan ekran, slušalice). */
  onExternalPause?: () => void;
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
    /** Kartica se skloni kad se snimljeni glas odsluša do kraja ("Istražite sami"). */
    closeWhenDone?: boolean;
  } | null>(null);

  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Glas koji predugo čeka mrežu (waiting/stalled bez napretka) prelazi na tekst.
  const stallTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clearStall = useCallback(() => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  }, []);
  const guideCompleteTimerRef = useRef<NodeJS.Timeout | null>(null);

  /** Zaustavlja <audio> i pamti dokle je stigao, bez diranja obećanja. */
  const pauseElement = useCallback(() => {
    clearStall();
    if (activeAudioRef.current) {
      audioCurrentTimeRef.current = activeAudioRef.current.currentTime;
      // Rukovaoci se skidaju PRE pause(): naša pauza nije "spoljna" (onpause).
      activeAudioRef.current.onended = null;
      activeAudioRef.current.onerror = null;
      activeAudioRef.current.onpause = null;
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
  }, [clearStall]);

  const stopAudio = useCallback(() => {
    pauseElement();
    // Prekinuta naracija se ZAVRŠAVA: sekvenca ture koja je čeka nastavlja
    // (posle await-a sama proveri da li je soba i dalje ista). Ranije je
    // obećanje ostajalo nerešeno - zatvorena kartica ili "nazad" tokom
    // vodiča zaustavljali su vodič zauvek, a promena jezika je posle toga
    // ponovo puštala već zatvorenu naraciju.
    activePlaybackRawRef.current = null;
    const resolveFn = activeResolveRef.current;
    activeResolveRef.current = null;
    if (resolveFn) resolveFn();
    // Nova naracija ne sme da nasledi dužinu prekinute (getAudioClock).
    audioDurationRef.current = 0;
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
    clearStall();
    if (activeAudioRef.current) {
      activeAudioRef.current.onended = null;
      activeAudioRef.current.onerror = null;
      activeAudioRef.current.onpause = null;
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    onAudioFailedChange?.(false);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    const resolvedAudioUrl = getAudioUrlFor(raw.audioUrlI18n, langRef.current);
    const resolvedText = getLocalizedText(raw.textFallback, langRef.current);

    // spoken = glas je odslušan do kraja (ne greška, ne tekst bez snimka).
    const finish = (spoken: boolean = false) => {
      activeAudioRef.current = null;
      audioCurrentTimeRef.current = 0;
      audioDurationRef.current = 0;
      setAudioActive(false);
      const resolveFn = activeResolveRef.current;
      activeResolveRef.current = null;
      activePlaybackRawRef.current = null;
      // "Istražite sami": posle odslušanog glasa kartica se sama skloni
      // (vlasnik, 2. 10. 2026). Bez snimka ili sa isključenim zvukom ostaje -
      // posetilac čita svojim tempom, pa nema "kraja" priče.
      if (spoken && raw.closeWhenDone && isMountedRef.current) onNarrationChange(null);
      if (isMountedRef.current && resolveFn) resolveFn();
    };

    const readTime = Math.max(3000, resolvedText.length * 50);
    if (isMutedRef.current || !resolvedAudioUrl) {
      setAudioActive(false);
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
    // Glas ne može da se pusti: ista naracija ide kao tekst, sa vremenom za
    // čitanje (kao bez zvuka). Ranije se završavala odmah - vodič je tada
    // preletao tačke bez glasa i bez teksta (pregled 23. 10. 2026).
    const readInstead = () => {
      if (activeAudioRef.current !== audio || !isMountedRef.current) return;
      clearStall();
      audio.onended = null;
      audio.onerror = null;
      audio.onpause = null;
      audio.pause();
      activeAudioRef.current = null;
      setAudioActive(false);
      hideTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) finish();
      }, readTime);
    };

    audio.onplaying = () => {
      clearStall();
      if (isMountedRef.current && activeAudioRef.current === audio) setAudioActive(true);
    };
    audio.ontimeupdate = clearStall;
    audio.onwaiting = audio.onstalled = () => {
      if (activeAudioRef.current !== audio || stallTimerRef.current) return;
      stallTimerRef.current = setTimeout(() => {
        stallTimerRef.current = null;
        onAudioFailedChange?.(true);
        readInstead();
      }, 15000);
    };
    // Telefon je sam zaustavio glas (poziv, zaključan ekran) - bez ovoga je
    // vodič zauvek čekao kraj snimka koji ne dolazi.
    audio.onpause = () => {
      if (activeAudioRef.current !== audio || audio.ended) return;
      onExternalPause?.();
    };

    audio.onended = () => finish(true);
    audio.onerror = () => {
      onAudioFailedChange?.(true);
      readInstead();
    };

    audio.play().catch((err: unknown) => {
      if (activeAudioRef.current !== audio) return;
      if (err instanceof DOMException && err.name === 'NotAllowedError' && onAutoplayBlocked) onAutoplayBlocked();
      else onAudioFailedChange?.(true);
      readInstead();
    });
  }, [clearStall, isMountedRef, isMutedRef, langRef, onAudioFailedChange, onAutoplayBlocked, onExternalPause, onNarrationChange, setAudioActive]);

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
    startAt: number = 0,
    options?: { closeWhenDone?: boolean }
  ): Promise<void> => {
    return new Promise((resolve) => {
      stopAudio();

      if (!isMountedRef.current) return resolve();

      activeResolveRef.current = resolve;
      activePlaybackRawRef.current = { audioUrlI18n, textFallback, title, index, closeWhenDone: options?.closeWhenDone };

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
