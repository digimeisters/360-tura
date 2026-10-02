import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Ceo ekran i žiroskop - dve odvojene stvari.
 *
 * Ranije ih je vezivao ulazak u ceo ekran (on je palio žiroskop, a dugme za
 * žiroskop se videlo samo u celom ekranu). iPhone Safari nema ceo ekran za
 * stranice, pa na iPhone-u nije radilo ni jedno ni drugo. Sad:
 * - žiroskop ima svoje dugme na svakom uređaju sa senzorom (telefon, tablet);
 * - ceo ekran se nudi samo tamo gde ga pregledač podržava.
 *
 * `isGyroActiveRef` čita i ostatak ture (automatsko okretanje sobe), pa se
 * vraća uz stanje: stanje je za iscrtavanje, ref za proveru usred animacije.
 */

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

function fullscreenElement(): Element | null {
  const doc = document as WebkitDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

type GyroViewer = {
  startOrientation?: () => void;
  stopOrientation?: () => void;
  stopAutoRotate?: () => void;
  getConfig?: () => { roll?: number };
  getNorthOffset?: () => number;
  setNorthOffset?: (offset: number) => void;
};

/**
 * Posle isključivanja žiroskopa slika ostaje nagnuta koliko je telefon bio
 * nagnut (dodir ga više ne ispravlja naglo - scripts/patch-pannellum.mjs),
 * pa se horizont ovde lagano vrati na ravno (~0,35 s). Pannellum nema javnu
 * funkciju za nagib: vrednost se menja u config-u, a setNorthOffset sa istom
 * vrednošću samo traži novo iscrtavanje.
 */
function settleRoll(viewer: GyroViewer) {
  const config = viewer.getConfig?.();
  if (!config || !config.roll || typeof viewer.setNorthOffset !== 'function') return;
  const from = config.roll;
  const startedAt = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - startedAt) / 350);
    config.roll = from * (1 - k) * (1 - k);
    try { viewer.setNorthOffset?.(viewer.getNorthOffset?.() ?? 0); } catch {}
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function useViewerControls(viewerRef: RefObject<GyroViewer | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGyroActive, setIsGyroActive] = useState(false);
  const isGyroActiveRef = useRef(false);

  // Tura se crta tek u pregledaču (page.tsx čeka hasMounted), pa se ovo
  // proverava odmah, bez efekta.
  const [canFullscreen] = useState(() => {
    if (typeof document === 'undefined') return false;
    const doc = document as WebkitDocument;
    const el = document.documentElement as WebkitElement;
    return Boolean((doc.fullscreenEnabled || doc.webkitFullscreenEnabled) && (el.requestFullscreen || el.webkitRequestFullscreen));
  });
  const [canGyro] = useState(
    () =>
      typeof window !== 'undefined' &&
      'DeviceOrientationEvent' in window &&
      window.matchMedia('(pointer: coarse)').matches
  );

  const stopGyroscope = useCallback(() => {
    if (viewerRef.current && typeof viewerRef.current.stopOrientation === 'function') {
      viewerRef.current.stopOrientation();
      settleRoll(viewerRef.current);
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

    // iPhone/iPad traže dozvolu, i to baš iz klika - zato se ovo zove samo
    // iz dugmeta, nikad samo od sebe.
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
    const doc = document as WebkitDocument;
    const el = document.documentElement as WebkitElement;
    try {
      if (!fullscreenElement()) {
        // iPad Safari zna samo za webkit verziju.
        if (el.requestFullscreen) await el.requestFullscreen();
        else await el.webkitRequestFullscreen?.();
      } else if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else {
        await doc.webkitExitFullscreen?.();
      }
    } catch (err) {
      console.error('Greška pri promeni celog ekrana:', err);
    }
  }, []);

  // Stanje prati sam pregledač - ulazak i izlazak mogu i mimo našeg dugmeta
  // (Esc, gest pregledača).
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(fullscreenElement()));
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  return {
    isFullscreen,
    canFullscreen,
    isGyroActive,
    canGyro,
    isGyroActiveRef,
    startGyroscope,
    stopGyroscope,
    toggleGyroscope,
    toggleFullscreen
  };
}
