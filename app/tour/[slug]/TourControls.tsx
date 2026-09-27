import { useEffect, useRef, useState } from 'react';
import { THEME, GLASS, GLASS_ACCENT, overlayIconStyle, SCREEN_BOTTOM } from './theme';
import { IconCheck, IconCollapse, IconCompass, IconExpand, IconHand, IconHeadphones, IconMute, IconPause, IconPhone, IconPlay, IconShare, IconSound } from './icons';
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
          className="k360-tap"
          aria-pressed={lang === l}
          style={{
            background: lang === l ? selectedColor : 'transparent',
            color: lang === l ? '#fff' : `rgba(255, 255, 255, ${lg ? 0.78 : 0.75})`,
            border: 'none',
            borderRadius: '999px',
            height: lg ? '40px' : '36px',
            minWidth: lg ? '48px' : '34px',
            padding: lg ? '0 16px' : '0 7px',
            fontSize: lg ? '14px' : '12.5px',
            fontWeight: lang === l ? 700 : 500,
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

/**
 * Agencija i naziv nekretnine, u staklenoj kartici u levom vrhu, sa dugmetom
 * za deljenje - deli se baš ova nekretnina, pa stoji uz njen naziv (isto
 * mesto kao na velikim oglasnicima).
 */
export function TourTitleCard({
  agencyName,
  title,
  onShare,
  shareLabel,
  shareCopied = false
}: {
  agencyName: string | null;
  title: string;
  onShare?: () => void;
  shareLabel?: string;
  shareCopied?: boolean;
}) {
  return (
    <div className="k360-top__title" style={{ ...GLASS, borderRadius: '12px', padding: onShare ? '5px 5px 5px 12px' : '6px 12px 7px', pointerEvents: 'auto', maxWidth: '55%', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ minWidth: 0, flex: 1 }}>
      {agencyName && (
        <div style={{ color: GLASS_ACCENT, fontSize: '12px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {agencyName}
        </div>
      )}
      <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {title}
      </div>
      </div>
      {onShare && (
        <button
          type="button"
          onClick={onShare}
          className="k360-tap"
          title={shareLabel}
          aria-label={shareLabel}
          style={{
            flexShrink: 0,
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            border: 'none',
            borderRadius: '10px',
            background: shareCopied ? 'rgba(134, 239, 172, 0.22)' : 'rgba(255, 255, 255, 0.12)',
            color: shareCopied ? '#86efac' : '#fff',
            cursor: 'pointer'
          }}
        >
          {shareCopied ? <IconCheck size={18} /> : <IconShare size={18} />}
        </button>
      )}
    </div>
  );
}

/**
 * Uspravna dugmad uz desnu ivicu: ceo ekran (gde ga pregledač podržava -
 * iPhone ga nema), žiroskop (telefoni i tableti), zvuk i vodič/ručno.
 */
export function OverlayButtons({
  isFullscreen,
  canFullscreen,
  onToggleFullscreen,
  isGyroActive,
  canGyro,
  onToggleGyroscope,
  isMuted,
  onToggleMute,
  hasGuide,
  guideMode,
  onToggleGuideMode,
  isGuidePaused,
  onTogglePauseGuide
}: {
  isFullscreen: boolean;
  canFullscreen: boolean;
  onToggleFullscreen: () => void;
  isGyroActive: boolean;
  canGyro: boolean;
  onToggleGyroscope: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  hasGuide: boolean;
  guideMode: 'auto' | 'manual';
  onToggleGuideMode: () => void;
  isGuidePaused: boolean;
  onTogglePauseGuide: () => void;
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
        gap: '8px',
        pointerEvents: 'auto'
      }}
    >
      {canFullscreen && (
        <button
          onClick={onToggleFullscreen}
          style={overlayIconStyle}
          title={isFullscreen ? 'Napusti ceo ekran' : 'Ceo ekran'}
          aria-label={isFullscreen ? 'Napusti ceo ekran' : 'Ceo ekran'}
        >
          {isFullscreen ? <IconCollapse size={21} /> : <IconExpand size={21} />}
        </button>
      )}

      {canGyro && (
        <button
          onClick={onToggleGyroscope}
          style={{ ...overlayIconStyle, background: isGyroActive ? 'rgba(91, 146, 214, 0.55)' : GLASS.background }}
          title={isGyroActive ? 'Ugasi razgledanje pomeranjem telefona' : 'Razgledajte pomeranjem telefona'}
          aria-label={isGyroActive ? 'Ugasi razgledanje pomeranjem telefona' : 'Razgledajte pomeranjem telefona'}
          aria-pressed={isGyroActive}
        >
          <IconCompass size={21} />
        </button>
      )}

      <button
        onClick={onToggleMute}
        style={overlayIconStyle}
        title={isMuted ? 'Uključi zvuk' : 'Isključi zvuk'}
        aria-label={isMuted ? 'Uključi zvuk' : 'Isključi zvuk'}
      >
        {isMuted ? <IconMute size={21} /> : <IconSound size={21} />}
      </button>

      {hasGuide && guideMode === 'auto' && (
        <button
          onClick={onTogglePauseGuide}
          style={{ ...overlayIconStyle, background: isGuidePaused ? 'rgba(91, 146, 214, 0.55)' : GLASS.background }}
          title={isGuidePaused ? 'Nastavi turu' : 'Pauziraj turu'}
          aria-label={isGuidePaused ? 'Nastavi turu' : 'Pauziraj turu'}
          aria-pressed={isGuidePaused}
        >
          {isGuidePaused ? <IconPlay size={21} /> : <IconPause size={21} />}
        </button>
      )}

      {hasGuide && (
        <button
          onClick={onToggleGuideMode}
          style={{ ...overlayIconStyle, background: guideMode === 'auto' ? 'rgba(91, 146, 214, 0.55)' : GLASS.background }}
          title={guideTitle}
          aria-label={guideTitle}
          aria-pressed={guideMode === 'auto'}
        >
          {guideMode === 'auto' ? <IconHeadphones size={21} /> : <IconHand size={21} />}
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
      className="tour-ui-scale"
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
 *
 * Tekst je skraćen na dva reda sa "Više", da kartica ne pokriva trećinu
 * panorame; ceo se otvara u istoj kartici. Nova tačka (drugi tekst) počinje
 * opet skraćeno - page.tsx daje karticu sa key={tekst}.
 */
export function InfoCard({
  title,
  text,
  onClose,
  closeLabel,
  moreLabel,
  lessLabel,
  hidden = false,
  action
}: {
  title: string | null;
  text: string;
  onClose: () => void;
  closeLabel: string;
  moreLabel: string;
  lessLabel: string;
  /** Sklonjena dok se prstom razgleda panorama (useImmersiveWhileDragging). */
  hidden?: boolean;
  /** Dugme u zaglavlju kartice, levo od zatvaranja ("Pozovi"). */
  action?: React.ReactNode;
}) {
  const headRoom = action ? '150px' : '44px';
  const [expanded, setExpanded] = useState(false);
  // "Više" samo kad tekst stvarno ne staje u dva reda.
  const [overflows, setOverflows] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (!expanded) setOverflows(el.scrollHeight > el.clientHeight + 1);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, text]);

  return (
    <div className={`tour-ui-scale k360-fade-ui${hidden ? ' is-immersive' : ''}`} style={{
      position: 'absolute',
      bottom: SCREEN_BOTTOM,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 30,
      width: 'calc(100% - 24px)',
      maxWidth: '520px',
      boxSizing: 'border-box',
      background: 'rgba(15, 18, 28, 0.62)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '24px',
      padding: '14px 18px 16px',
      color: '#fff',
      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
      fontFamily: THEME.fontBody
    }}>
      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      {action}
      <button
        onClick={onClose}
        className="k360-tap"
        style={{
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.1)',
          border: 'none',
          borderRadius: '50%',
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: '20px',
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
      </div>

      {title && (
        <h3 style={{ margin: '0 0 6px', paddingRight: headRoom, fontFamily: 'var(--font-urbanist), var(--font-jakarta), system-ui, sans-serif', fontSize: '20px', lineHeight: 1.15, fontWeight: 700, letterSpacing: '-0.01em', color: '#fff', textWrap: 'balance' }}>
          {title}
        </h3>
      )}
      <p
        ref={textRef}
        style={{
          margin: 0,
          fontSize: '13.5px',
          lineHeight: 1.55,
          color: 'rgba(255, 255, 255, 0.9)',
          paddingRight: title ? '6px' : headRoom,
          ...(expanded
            ? { maxHeight: '40vh', overflowY: 'auto' as const }
            : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' })
        }}
      >
        {text}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          className="k360-tap"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '4px',
            padding: '2px 0',
            background: 'none',
            border: 'none',
            color: GLASS_ACCENT,
            fontFamily: THEME.fontBody,
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          {expanded ? lessLabel : moreLabel}
          <span aria-hidden="true" style={{ display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>▾</span>
        </button>
      )}
    </div>
  );
}

/**
 * Malo dugme "Pozovi" koje stoji u turi dok donji meni (sa Kontaktom) nije
 * vidljiv - tokom vođenja i dok su otvorene kartice sa opisom. Bez njega
 * posetilac kome se stan dopadne baš u tom trenutku nema kako da pozove.
 *
 * Na telefonu je to običan tel: link (jedan dodir do poziva). Na računaru
 * poziv nema smisla, pa `onDesktop` otvara modal "Kontakt" (ime, telefon,
 * mejl) - on se i broji u analitici kao kontakt.
 */
export function CallAgentButton({
  phone,
  label,
  onPhoneCall,
  onDesktop,
  floating = false
}: {
  phone: string;
  label: string;
  /** Poziv sa telefona - modal se ne otvara, pa se kontakt broji ovde. */
  onPhoneCall: () => void;
  onDesktop: () => void;
  /** Samostalno u dnu ekrana (kad kartice nema), umesto prikačeno uz nju. */
  floating?: boolean;
}) {
  return (
    <a
      href={`tel:${phone.replace(/[^\d+]/g, '')}`}
      className={floating ? 'tour-ui-scale k360-tap' : 'k360-tap'}
      onClick={(e) => {
        const touch = window.matchMedia('(pointer: coarse)').matches;
        if (touch) {
          onPhoneCall();
          return;
        }
        e.preventDefault();
        onDesktop();
      }}
      style={{
        ...(floating
          ? { position: 'absolute' as const, right: '12px', bottom: SCREEN_BOTTOM, zIndex: 30 }
          : {}),
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: '36px',
        boxSizing: 'border-box',
        padding: '0 14px 0 12px',
        borderRadius: '999px',
        background: THEME.accent,
        border: '1px solid rgba(255, 255, 255, 0.35)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
        color: '#fff',
        fontFamily: THEME.fontBody,
        fontSize: '13.5px',
        fontWeight: 700,
        lineHeight: 1,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        cursor: 'pointer'
      }}
    >
      <IconPhone size={16} color="#fff" />
      {label}
    </a>
  );
}
