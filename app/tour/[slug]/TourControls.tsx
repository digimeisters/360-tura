import { THEME, GLASS, GLASS_ACCENT, overlayIconStyle, SCREEN_BOTTOM } from './theme';
import { IconCollapse, IconCompass, IconExpand, IconHand, IconHeadphones, IconMute, IconSound } from './icons';
import type { Language } from './types';

/**
 * Sitne komponente HUD-a preko panorame: izbor jezika, kartica sa nazivom i
 * bočna dugmad. Stoje izdvojeno jer se ista dugmad javljaju na dva mesta
 * (uvodni ekran i traka u vrhu), a stajala su prepisana.
 */

/** Izbor jezika: veliki na uvodnom ekranu, mali u traci u vrhu. */
export function LanguageChips({
  lang,
  languages,
  onChange,
  size,
  selectedColor = GLASS_ACCENT
}: {
  lang: Language;
  languages: Language[];
  onChange: (l: Language) => void;
  size: 'lg' | 'sm';
  /** Boja izabranog jezika - podrazumevano GLASS_ACCENT, uvodni ekran ture koristi THEME.accent da se poklopi sa dugmetom za polazak. */
  selectedColor?: string;
}) {
  const lg = size === 'lg';
  return (
    <>
      {languages.map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          style={{
            background: lang === l ? selectedColor : 'transparent',
            color: lang === l ? '#fff' : `rgba(255, 255, 255, ${lg ? 0.78 : 0.75})`,
            border: 'none',
            borderRadius: lg ? '999px' : '8px',
            padding: lg ? '6px 14px' : '3px 7px',
            fontSize: lg ? '13px' : '11px',
            fontWeight: lang === l ? 'bold' : 'normal',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </>
  );
}

/** Agencija i naziv nekretnine, u staklenoj kartici u levom vrhu. */
export function TourTitleCard({ agencyName, title }: { agencyName: string | null; title: string }) {
  return (
    <div style={{ ...GLASS, borderRadius: '12px', padding: '6px 12px 7px', pointerEvents: 'auto', maxWidth: '55%' }}>
      {agencyName && (
        <div style={{ color: GLASS_ACCENT, fontSize: '12px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {agencyName}
        </div>
      )}
      <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {title}
      </div>
    </div>
  );
}

/**
 * Uspravna dugmad uz desnu ivicu: ceo ekran, giroskop (samo u celom ekranu),
 * zvuk i prebacivanje vodič/ručno.
 */
export function OverlayButtons({
  isFullscreen,
  onToggleFullscreen,
  isGyroActive,
  onToggleGyroscope,
  isMuted,
  onToggleMute,
  hasGuide,
  guideMode,
  onToggleGuideMode
}: {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isGyroActive: boolean;
  onToggleGyroscope: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  hasGuide: boolean;
  guideMode: 'auto' | 'manual';
  onToggleGuideMode: () => void;
}) {
  const guideTitle =
    guideMode === 'auto'
      ? 'Vodič vodi - klikni da sam istražuješ'
      : 'Sami istražujete - klikni da vodič vodi';

  return (
    <div
      style={{
        // U istom bloku kao traka sa sobama, ispod nje - nikad se ne
        // preklapaju, ni kad se gornji red prelomi zbog dugog naziva.
        alignSelf: 'flex-end',
        marginTop: '6px',
        marginRight: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        pointerEvents: 'auto'
      }}
    >
      <button
        onClick={onToggleFullscreen}
        style={overlayIconStyle}
        title={isFullscreen ? 'Napusti ceo ekran' : 'Ceo ekran'}
        aria-label={isFullscreen ? 'Napusti ceo ekran' : 'Ceo ekran'}
      >
        {isFullscreen ? <IconCollapse size={19} /> : <IconExpand size={19} />}
      </button>

      {isFullscreen && (
        <button
          onClick={onToggleGyroscope}
          style={{ ...overlayIconStyle, background: isGyroActive ? 'rgba(91, 146, 214, 0.55)' : GLASS.background }}
          title={isGyroActive ? 'Ugasi giroskop' : 'Upali giroskop'}
          aria-label={isGyroActive ? 'Ugasi giroskop' : 'Upali giroskop'}
        >
          <IconCompass size={19} />
        </button>
      )}

      <button
        onClick={onToggleMute}
        style={overlayIconStyle}
        title={isMuted ? 'Uključi zvuk' : 'Isključi zvuk'}
        aria-label={isMuted ? 'Uključi zvuk' : 'Isključi zvuk'}
      >
        {isMuted ? <IconMute size={19} /> : <IconSound size={19} />}
      </button>

      {hasGuide && (
        <button
          onClick={onToggleGuideMode}
          style={{ ...overlayIconStyle, background: guideMode === 'auto' ? 'rgba(91, 146, 214, 0.55)' : GLASS.background }}
          title={guideTitle}
          aria-label={guideTitle}
          aria-pressed={guideMode === 'auto'}
        >
          {guideMode === 'auto' ? <IconHeadphones size={19} /> : <IconHand size={19} />}
        </button>
      )}
    </div>
  );
}

/**
 * Poruka u dnu ekrana: "učitavam sobu..." i "obišli ste sve". Dve vrste se
 * razlikuju samo po gustini stakla i razmaku - vrednosti su prepisane
 * onakve kakve su bile, da se izgled ne pomeri ni za piksel.
 */
export function StatusNotice({
  variant,
  children
}: {
  variant: 'loading' | 'done';
  children: React.ReactNode;
}) {
  const loading = variant === 'loading';
  return (
    <div
      role="status"
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 120px)',
        transform: 'translateX(-50%)',
        zIndex: 15,
        ...(loading ? { display: 'flex', alignItems: 'center', gap: '8px' } : {}),
        padding: loading ? '8px 14px' : '10px 18px',
        borderRadius: '999px',
        background: loading ? 'rgba(15, 23, 42, 0.55)' : 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        color: '#fff',
        fontSize: '13px',
        fontFamily: THEME.fontBody,
        whiteSpace: 'nowrap',
        ...(loading ? { pointerEvents: 'none' as const } : { textAlign: 'center' as const })
      }}
    >
      {children}
    </div>
  );
}

/**
 * Kartica sa naracijom tačke, uz samo dno ekrana - isto tamno staklo kao
 * traka sa sobama, samo gušće, jer se ovde čita duži tekst preko svetlih
 * delova fotografije.
 */
export function InfoCard({
  title,
  text,
  onClose,
  closeLabel
}: {
  title: string | null;
  text: string;
  onClose: () => void;
  closeLabel: string;
}) {
  return (
    <div style={{
      position: 'absolute',
      bottom: SCREEN_BOTTOM,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 30,
      width: 'calc(100% - 24px)',
      maxWidth: '520px',
      boxSizing: 'border-box',
      background: 'rgba(15, 23, 42, 0.68)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.28)',
      borderRadius: '16px',
      padding: '14px 18px 16px',
      color: '#fff',
      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
      fontFamily: THEME.fontBody
    }}>
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.1)',
          border: 'none',
          borderRadius: '50%',
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: '17px',
          lineHeight: '1',
          cursor: 'pointer',
          transition: 'background 0.15s ease'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.22)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
        title={closeLabel}
        aria-label={closeLabel}
      >
        ×
      </button>

      {title && (
        <h3 style={{ margin: '0 0 7px', paddingRight: '34px', fontFamily: THEME.fontDisplay, fontSize: '17px', lineHeight: 1.2, fontWeight: 700, color: '#fff', textWrap: 'balance' }}>
          {title}
        </h3>
      )}
      <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.55, color: 'rgba(255, 255, 255, 0.9)', paddingRight: '6px' }}>
        {text}
      </p>
    </div>
  );
}
