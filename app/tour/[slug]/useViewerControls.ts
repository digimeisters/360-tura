import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Ceo ekran i žiroskop - dve stvari koje idu zajedno: ulazak u ceo ekran
 * pali žiroskop, izlazak ga gasi, pa i stoje na jednom mestu.
 *
 * `isGyroActiveRef` čita i ostatak ture (automatsko okretanje sobe), pa se
 * vraća uz stanje: stanje je za iscrtavanje, ref za proveru usred animacije.
 */
export function useViewerControls(viewerRef: RefObject<{
  startOrientation?: () => void;
  stopOrientation?: () => void;
  stopAutoRotate?: () => void;
} | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGyroActive, setIsGyroActive] = useState(false);
  const isGyroActiveRef = useRef(false);

  const stopGyroscope = useCallback(() => {
    if (viewerRef.current && typeof viewerRef.current.stopOrientation === 'function') {
      viewerRef.current.stopOrientation();
    }
    setIsGyroActive(false);
    isGyroActiveRef.current = false;
  }, [viewerRef]);

  const startGyroscope = useCallback(async () => {
    if (!viewerRef.current) return;

    const enableOrientation = () => {
      const viewer = viewerRef.current;
      if (viewer && typeof viewer.startOrientation === 'function') {
        // Žiroskop piše ugao kamere direktno na svaki event senzora (i do
        // 60x/s); ako u isto vreme radi i naše automatsko okretanje sobe
        // (startAutoRotate - uvodni pan ili mirno "lebdenje"), oba
        // neprekidno prepisuju isti ugao jedno preko drugog - to je
        // "sečkanje" koje se vidi. Žiroskop uvek ima prednost.
        if (typeof viewer.stopAutoRotate === 'function') {
          viewer.stopAutoRotate();
        }
        viewer.startOrientation();
        setIsGyroActive(true);
        isGyroActiveRef.current = true;
      }
    };

    const orientationEvent = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof orientationEvent.requestPermission === 'function') {
      try {
        const permissionState = await orientationEvent.requestPermission();
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
  }, [viewerRef]);

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

  // Izlazak iz celog ekrana može i mimo našeg dugmeta (Esc, gest pregledača).
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

  return {
    isFullscreen,
    isGyroActive,
    isGyroActiveRef,
    startGyroscope,
    stopGyroscope,
    toggleGyroscope,
    toggleFullscreen
  };
}
