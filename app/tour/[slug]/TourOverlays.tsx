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
