import { useEffect, useState } from 'react';
import { THEME } from './theme';

/**
 * Delovi ekrana ture izdvojeni iz page.tsx: globalni CSS ture, veliki ekran
 * dok se prva soba učitava, nišan za admina i natpis "prevucite prstom" pri
 * prvom ulasku (jedino ovaj ima svoje stanje - useFirstTimeDragHint).
 */

/** CSS koji tura dodaje stranici (Pannellum, uvećanje na računaru, pulsiranje tačaka). */
export function TourGlobalStyles() {
  return (
    <style>{`
      .pnlm-load-box {
        display: none !important;
      }
      /* Dugmad-pilule (jezici, Pozovi, Podeli, zatvaranje kartice) su 36px, a
         ova nevidljiva ivica od 4px daje prstu punih 44px bez većeg izgleda. */
      .k360-tap { position: relative; }
      .k360-tap::after { content: ''; position: absolute; inset: -4px; }
      /* Gornja traka i bočna dugmad se sklanjaju dok se prstom razgleda (useImmersiveWhileDragging). */
      .k360-top-ui { transition: opacity 0.25s ease, transform 0.25s ease; }
      .k360-top-ui.is-immersive { opacity: 0; transform: translateY(-8px); }
      .k360-top-ui.is-immersive, .k360-top-ui.is-immersive * { pointer-events: none !important; }
      /* Kartica sa tekstom tačke: samo bledi (njen položaj drži inline transform). */
      .k360-fade-ui { transition: opacity 0.25s ease; }
      .k360-fade-ui.is-immersive { opacity: 0; }
      .k360-fade-ui.is-immersive, .k360-fade-ui.is-immersive * { pointer-events: none !important; }
      /* Titl uz glas: svaka nova rečenica se blago pojavi (NarrationSubtitles). */
      @keyframes k360SubtitleIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
      .k360-subtitle { animation: k360SubtitleIn 0.22s ease-out both; }
      /* Talas u crnoj oznaci titla: vodič upravo priča. */
      .k360-voice-wave { display: inline-flex; align-items: center; gap: 2px; height: 11px; flex: none; }
      .k360-voice-wave i { display: block; width: 2px; height: 4px; border-radius: 1px; background: #5B92D6; animation: k360Wave 0.9s ease-in-out infinite; }
      .k360-voice-wave i:nth-child(2) { animation-delay: 0.15s; }
      .k360-voice-wave i:nth-child(3) { animation-delay: 0.3s; }
      .k360-voice-wave i:nth-child(4) { animation-delay: 0.45s; }
      @keyframes k360Wave { 0%, 100% { height: 4px; } 50% { height: 11px; } }
      @media (prefers-reduced-motion: reduce) { .k360-top-ui { transition: none; } .k360-subtitle, .k360-voice-wave i { animation: none; } }
      @media (min-width: 1024px) {
        .tour-ui-scale { zoom: 1.122; }
        /* Zoom ide na unutrašnji omotač (.k360-hotspot-scale), NE na
           .custom-nav-hotspot/.custom-info-hotspot - to je isti div koji
           Pannellum svaki kadar pozicionira preko transform:translate(),
           pa bi zoom na njemu skalirao i tu vrednost i tačka bi "plutala"
           dok se gleda okolo (vidi komentar u theme.ts). */
        .k360-hotspot-scale { zoom: 1.122; }
        /* Posetilac na računaru: traka sa sobama ide gore u isti red sa
           nazivom ture, da ne zaklanja panoramu. Admin traka je preširoka za to. */
        .k360-top--visitor .k360-top__roomnav { position: absolute; top: 0; left: 50%; transform: translateX(-50%); }
        .k360-top--visitor .k360-top__title { max-width: calc(50% - 230px) !important; }
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
      /* Prelaz u drugu sobu: gore far koji pulsira (tamnija plava sajta
         tačka + dva talasa u razmaku), dole miran natpis sa imenom sobe.
         Na prelaz mišem far poraste i pojača se, a natpis postane plav. */
      .k360-hs-nav { position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .k360-hs-beacon { position: relative; width: 24px; height: 24px; border-radius: 50%;
        background: radial-gradient(circle at 50% 50%, #FFFFFF 0 20%, rgba(120, 120, 130, 0.85) 34%, rgba(80, 80, 90, 0.95) 100%);
        border: 2px solid rgba(255, 255, 255, 0.9);
        box-shadow: 0 0 0 1px rgba(80, 80, 90, 0.35), 0 0 16px 3px rgba(100, 100, 110, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3);
        -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
        transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease; }
      .k360-hs-beacon::before, .k360-hs-beacon::after { content: ''; position: absolute; inset: -2px; border-radius: 50%;
        border: 2.5px solid rgba(100, 100, 110, 0.85); animation: k360HsRing 6s ease-out infinite; pointer-events: none; }
      .k360-hs-beacon::after { animation-delay: 3s; }
      @keyframes k360HsRing { 0% { transform: scale(1); opacity: 0.9; } 100% { transform: scale(2.6); opacity: 0; } }
      .k360-hs-label { position: absolute; top: calc(100% + 2px); left: 50%; transform: translateX(-50%); white-space: nowrap;
        padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 650; letter-spacing: 0.01em; color: #FFFFFF;
        background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(255, 255, 255, 0.28);
        -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25); transition: background 0.2s ease, border-color 0.2s ease; }
      .custom-nav-hotspot:hover .k360-hs-beacon { transform: scale(1.2);
        background: radial-gradient(circle at 50% 50%, #FFFFFF 0 20%, rgba(100, 100, 110, 0.9) 34%, rgba(60, 60, 70, 0.95) 100%);
        box-shadow: 0 0 0 1px rgba(30, 90, 168, 0.4), 0 0 22px 6px rgba(100, 100, 110, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3); }
      .custom-nav-hotspot:hover .k360-hs-beacon::before, .custom-nav-hotspot:hover .k360-hs-beacon::after { animation-duration: 3.6s; }
      .custom-nav-hotspot:hover .k360-hs-label { background: rgba(100, 100, 110, 0.8); border-color: rgba(100, 100, 110, 0.8); }
      /* Vrata kroz koja vodič sledeće ide (roomSequence.ts, k360-next-door):
         far lagano diše u plavoj boji sajta, a natpis postane plav. */
      .custom-nav-hotspot.k360-next-door .k360-hs-beacon {
        background: radial-gradient(circle at 50% 50%, #FFFFFF 0 20%, rgba(91, 146, 214, 0.9) 34%, rgba(30, 90, 168, 0.95) 100%);
        animation: k360NextDoor 1.8s ease-in-out infinite; }
      .custom-nav-hotspot.k360-next-door .k360-hs-beacon::before, .custom-nav-hotspot.k360-next-door .k360-hs-beacon::after {
        border-color: rgba(91, 146, 214, 0.9); animation-duration: 3.6s; }
      .custom-nav-hotspot.k360-next-door .k360-hs-label { background: rgba(30, 90, 168, 0.78); border-color: rgba(147, 185, 232, 0.7); }
      @keyframes k360NextDoor {
        0%, 100% { transform: scale(1); box-shadow: 0 0 0 1px rgba(91, 146, 214, 0.5), 0 0 14px 3px rgba(91, 146, 214, 0.45), 0 2px 8px rgba(0, 0, 0, 0.3); }
        50% { transform: scale(1.18); box-shadow: 0 0 0 1px rgba(91, 146, 214, 0.7), 0 0 26px 9px rgba(91, 146, 214, 0.6), 0 2px 8px rgba(0, 0, 0, 0.3); }
      }
      /* Puls na samoj tački, ne na omotaču - omotač ima nevidljivu marginu za prst. */
      .custom-info-hotspot > .k360-hotspot-scale { animation: k360HotspotPulseInfo 2.6s ease-out infinite; }
      @media (prefers-reduced-motion: reduce) {
        .custom-info-hotspot > .k360-hotspot-scale, .k360-hs-beacon::before, .k360-hs-beacon::after,
        .custom-nav-hotspot.k360-next-door .k360-hs-beacon { animation: none; }
      }
    `}</style>
  );
}

/** Nišan u sredini ekrana za admina - tačka se dodaje tamo gde se klikne. */
export function AdminCrosshair() {
  return (
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
  );
}

/**
 * Veliki ekran "Ulazimo u prostoriju" - samo pri prvoj sobi. Pri prelazu
 * između soba stara scena ostaje vidljiva (vidi transition.ts), pa se tada
 * prikazuje samo mali natpis (StatusNotice), i to tek ako soba kasni.
 */
export function RoomLoadingScreen({
  agencyName,
  tourTitle,
  loadingPrefix,
  roomTitle
}: {
  agencyName: string | null;
  tourTitle: string;
  loadingPrefix: string;
  roomTitle: string;
}) {
  return (
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
        {agencyName && (
          <div style={{ color: THEME.accent, fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {agencyName}
          </div>
        )}
        <div style={{ color: THEME.textPrimary, fontSize: '16px', fontWeight: 600, letterSpacing: '0.5px' }}>
          {tourTitle}
        </div>
        <div style={{ color: THEME.accent, fontSize: '14px', letterSpacing: '0.5px' }}>
          {loadingPrefix}<b style={{ color: THEME.textPrimary }}>{roomTitle}</b>
        </div>
      </div>
    </div>
  );
}

const DRAG_HINT_KEY = 'k360_drag_hint_seen';
const DRAG_HINT_MS = 4000;

/**
 * Natpis "Prevucite prstom da razgledate" pri PRVOM ulasku u turu na ovom
 * uređaju - onome ko ne zna da se 360° slika pomera, to je prva prepreka.
 * Pojavi se na 4 sekunde (ili dok posetilac prvi put ne dotakne ekran) i
 * više se ne prikazuje; pamti se u pregledaču. Ako pregledač ne dozvoljava
 * pamćenje (privatni režim), prikazuje se svaki put - bolje nego nikad.
 */
export function useFirstTimeDragHint(tourStarted: boolean): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!tourStarted) return;
    try {
      if (localStorage.getItem(DRAG_HINT_KEY)) return;
      localStorage.setItem(DRAG_HINT_KEY, '1');
    } catch {
      // bez pamćenja - natpis se ipak prikaže
    }
    // Mali predah da se prva soba pojavi pre natpisa.
    let dismissed = false;
    const show = setTimeout(() => {
      if (!dismissed) setVisible(true);
    }, 900);
    const hide = setTimeout(() => setVisible(false), 900 + DRAG_HINT_MS);
    const onTouch = () => {
      dismissed = true;
      setVisible(false);
    };
    window.addEventListener('pointerdown', onTouch, { once: true });
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
      window.removeEventListener('pointerdown', onTouch);
    };
  }, [tourStarted]);

  return visible;
}

/** Sam natpis - na sredini ekrana, ne hvata dodir (ispod se odmah može prevlačiti). */
export function DragHint({ text }: { text: string }) {
  return (
    <div
      role="status"
      className="tour-ui-scale"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 34,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 18px',
        borderRadius: '999px',
        background: 'rgba(15, 23, 42, 0.72)',
        border: '1px solid rgba(255, 255, 255, 0.35)',
        color: '#fff',
        fontFamily: THEME.fontBody,
        fontSize: '15px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
        animation: 'k360HintIn 0.35s ease-out both'
      }}
    >
      <style>{`
        @keyframes k360HintIn { from { opacity: 0; transform: translate(-50%, -40%); } to { opacity: 1; transform: translate(-50%, -50%); } }
        @keyframes k360HintSwipe { 0%, 100% { transform: translateX(-6px); } 50% { transform: translateX(6px); } }
        @media (prefers-reduced-motion: reduce) { .k360-swipe { animation: none !important; } }
      `}</style>
      <span aria-hidden="true" className="k360-swipe" style={{ fontSize: '22px', display: 'inline-block', animation: 'k360HintSwipe 1.2s ease-in-out infinite' }}>
        👆
      </span>
      {text}
    </div>
  );
}

/**
 * Telefon: dok posetilac prstom razgleda panoramu, gornja traka i dugmad sa
 * strane se sklanjaju (zauzimaju skoro četvrtinu ekrana), a vraćaju se čim
 * pusti. Pali se tek na pomeranje prsta, ne na dodir - dodir tačke ili
 * dugmeta ne sme ništa da sakrije.
 */
export function useImmersiveWhileDragging(enabled: boolean): boolean {
  const [immersive, setImmersive] = useState(false);

  useEffect(() => {
    if (!enabled || !window.matchMedia('(pointer: coarse)').matches) return;
    const panorama = document.getElementById('panorama');
    if (!panorama) return;

    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let startX = 0;
    let startY = 0;
    let dragging = false;

    const onStart = (e: TouchEvent) => {
      if (showTimer) clearTimeout(showTimer);
      startX = e.touches[0]?.clientX ?? 0;
      startY = e.touches[0]?.clientY ?? 0;
      dragging = false;
    };
    const onMove = (e: TouchEvent) => {
      if (dragging) return;
      const t = e.touches[0];
      if (!t || Math.hypot(t.clientX - startX, t.clientY - startY) < 12) return;
      dragging = true;
      setImmersive(true);
    };
    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      showTimer = setTimeout(() => setImmersive(false), 3000);
    };

    panorama.addEventListener('touchstart', onStart, { passive: true });
    panorama.addEventListener('touchmove', onMove, { passive: true });
    panorama.addEventListener('touchend', onEnd);
    panorama.addEventListener('touchcancel', onEnd);
    return () => {
      if (showTimer) clearTimeout(showTimer);
      panorama.removeEventListener('touchstart', onStart);
      panorama.removeEventListener('touchmove', onMove);
      panorama.removeEventListener('touchend', onEnd);
      panorama.removeEventListener('touchcancel', onEnd);
      setImmersive(false);
    };
  }, [enabled]);

  return immersive;
}
