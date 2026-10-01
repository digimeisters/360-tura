import { useEffect, useMemo, useRef, useState } from 'react';
import { THEME, GLASS, GLASS_ACCENT, FILL_ACCENT, FILL_ACCENT_EDGE, FILL_ACTIVE_ICON, FILL_GLASS_ACCENT, overlayIconStyle, SCREEN_BOTTOM, ABOVE_MENU_BOTTOM, MENU_HEIGHT } from './theme';
import { IconCheck, IconCollapse, IconCompass, IconExpand, IconHand, IconHeadphones, IconMute, IconPause, IconPlay, IconShare, IconSound } from './icons';
import type { Language } from './types';
import { toSubtitleCues } from './subtitleCues';

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
            ...(lang === l
              ? selectedColor === THEME.accent ? FILL_ACCENT : FILL_GLASS_ACCENT
              : { background: 'transparent' }),
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
          style={{ ...overlayIconStyle, ...(isGyroActive ? FILL_ACTIVE_ICON : {}) }}
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
          style={{ ...overlayIconStyle, ...(isGuidePaused ? FILL_ACTIVE_ICON : {}) }}
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
          style={{ ...overlayIconStyle, ...(guideMode === 'auto' ? FILL_ACTIVE_ICON : {}) }}
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
  raised = false,
  docked = false,
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
  /** Donji meni je vidljiv ispod kartice - kartica stoji iznad njega. */
  raised?: boolean;
  /**
   * Telefon: kartica je donji deo jedne ploče sa menijem (meni sedi u njenom
   * dnu, TourMenuBar joined) - naziv i tri reda teksta (ceo uvod sobe najčešće stane), "Više" ispod.
   * Na telefonu kartica + meni jedno iznad drugog zauzimaju četvrtinu ekrana.
   */
  docked?: boolean;
  /** Dugme u zaglavlju kartice, levo od zatvaranja (Viber / WhatsApp agentu). */
  action?: React.ReactNode;
}) {
  const headRoom = docked ? '38px' : action ? '150px' : '44px';
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
      bottom: docked ? SCREEN_BOTTOM : raised ? ABOVE_MENU_BOTTOM : SCREEN_BOTTOM,
      left: '50%',
      transform: 'translateX(-50%)',
      // Spojena: ispod menija (55), da dugmad ostanu klikabilna preko nje.
      zIndex: docked ? 54 : 30,
      width: 'calc(100% - 24px)',
      maxWidth: '520px',
      boxSizing: 'border-box',
      background: docked ? 'rgba(15, 20, 34, 0.72)' : 'rgba(15, 18, 28, 0.62)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: docked ? '26px' : '24px',
      padding: docked ? `10px 14px calc(${MENU_HEIGHT} + 2px)` : '14px 18px 16px',
      color: '#fff',
      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
      fontFamily: THEME.fontBody
    }}>
      <div style={{ position: 'absolute', top: docked ? '7px' : '10px', right: docked ? '8px' : '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      {action}
      <button
        onClick={onClose}
        className="k360-tap"
        style={{
          width: docked ? '30px' : '36px',
          height: docked ? '30px' : '36px',
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
        <h3 style={{ margin: docked ? '2px 0 3px' : '0 0 6px', paddingRight: headRoom, fontFamily: 'var(--font-urbanist), var(--font-jakarta), system-ui, sans-serif', fontSize: docked ? '16px' : '20px', lineHeight: 1.15, fontWeight: 700, letterSpacing: '-0.01em', color: '#fff', textWrap: 'balance' }}>
          {title}
        </h3>
      )}
      <div>
      <p
        ref={textRef}
        style={{
          margin: 0,
          
          minWidth: 0,
          fontSize: docked ? '13px' : '13.5px',
          lineHeight: 1.55,
          color: 'rgba(255, 255, 255, 0.9)',
          paddingRight: title ? '6px' : headRoom,
          ...(expanded
            ? { maxHeight: docked ? '34vh' : '40vh', overflowY: 'auto' as const }
            : { display: '-webkit-box', WebkitLineClamp: docked ? 3 : 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' })
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
            flex: 'none',
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
    </div>
  );
}

/**
 * Titlovi uz snimljeni glas u automatskom vođenju (vlasnik, 27. 9. 2026:
 * "kad dođe naracija, tekst kao na filmu"). Umesto kartice sa celim tekstom
 * ide samo rečenica koja se upravo izgovara - bez dugmadi i "Više", da
 * panorama ostane otvorena. Rečenica se bira po tome dokle je
 * glas stigao (getClock), srazmerno dužini rečenica - ElevenLabs ne daje
 * vremena reči, a za titl je ovo dovoljno tačno.
 *
 * Izgled (vlasnik, 1. 10. 2026 - varijanta C): naziv tačke sa talasom, titl
 * i donji meni su JEDNA ploča, kao kartica u ručnom režimu (InfoCard
 * docked). Ranije su to bila tri odvojena reda (crna oznaka, titl, meni) i
 * dno je delovalo razbacano. Na širokom ekranu ista ploča stoji iznad menija.
 */
export function NarrationSubtitles({
  title,
  text,
  getClock,
  hidden = false,
  docked = false
}: {
  /** Naziv info-tačke, a za uvod sobe naziv sobe - u vrhu ploče, uz talas. */
  title: string;
  text: string;
  getClock: () => { time: number; duration: number } | null;
  hidden?: boolean;
  /** Telefon: meni (TourMenuBar joined) sedi u dnu ove ploče. */
  docked?: boolean;
}) {
  const cues = useMemo(() => toSubtitleCues(text), [text]);
  const [cueIdx, setCueIdx] = useState(0);

  // Novi tekst = nova komponenta (page.tsx daje key={tekst}), pa cueIdx kreće od 0.
  useEffect(() => {
    if (cues.length < 2) return;
    const total = cues.reduce((sum, c) => sum + c.weight, 0);
    const id = window.setInterval(() => {
      const clock = getClock();
      if (!clock) return;
      const at = (clock.time / clock.duration) * total;
      let acc = 0;
      let idx = cues.length - 1;
      for (let i = 0; i < cues.length; i++) {
        acc += cues[i].weight;
        if (at < acc) {
          idx = i;
          break;
        }
      }
      setCueIdx(idx);
    }, 150);
    return () => window.clearInterval(id);
  }, [cues, getClock]);

  const cue = cues[Math.min(cueIdx, cues.length - 1)];
  if (!cue) return null;

  return (
    <div
      aria-live="polite"
      className={`tour-ui-scale k360-fade-ui${hidden ? ' is-immersive' : ''}`}
      style={{
        position: 'absolute',
        left: '50%',
        bottom: docked ? SCREEN_BOTTOM : ABOVE_MENU_BOTTOM,
        transform: 'translateX(-50%)',
        // Spojena: ispod menija (55), da njegova dugmad ostanu klikabilna.
        zIndex: docked ? 54 : 30,
        // Ista širina i staklo kao InfoCard, da vođenje i ručni režim izgledaju isto.
        width: 'calc(100% - 24px)',
        maxWidth: '520px',
        boxSizing: 'border-box',
        padding: docked ? `10px 16px calc(${MENU_HEIGHT} + 2px)` : '12px 18px 14px',
        borderRadius: docked ? '26px' : '24px',
        background: 'rgba(10, 14, 24, 0.78)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
        color: '#fff',
        // Titl na sredini, kao na filmu (vlasnik, 1. 10. 2026).
        textAlign: 'center',
        pointerEvents: 'none',
        fontFamily: THEME.fontBody
      }}
    >
      {/* Naziv sa talasom: šta se opisuje i da vodič upravo priča. */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '7px',
        marginBottom: '4px',
        color: '#9CC0EE',
        fontSize: '11.5px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        lineHeight: 1.2
      }}>
        <span className="k360-voice-wave" aria-hidden="true"><i /><i /><i /><i /></span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
      </div>
      {/* Mesto za dva reda, da ploča ne skače kad se rečenice smenjuju. */}
      <p
        key={cue.text}
        className="k360-subtitle"
        style={{ margin: 0, minHeight: '2.9em', fontSize: '17px', lineHeight: 1.45, fontWeight: 600, color: '#fff', textWrap: 'balance' }}
      >
        {cue.text}
      </p>
    </div>
  );
}

/**
 * Pretvara broj agenta kako je upisan u adminu ("064 936 7339",
 * "+381 64...", "00381...") u međunarodni oblik bez razmaka (+38164...).
 * Broj koji počinje nulom smatra se srpskim - agencije su iz Srbije.
 */
export function phoneToE164(raw: string): string | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8) return null;
  if (trimmed.startsWith('+')) return `+${digits}`;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('0')) return `+381${digits.slice(1)}`;
  return `+${digits}`;
}

/**
 * Dugme za poruku agentu, umesto "Pozovi" (vlasnik, 1. 10. 2026): ko gleda
 * na srpskom dobija Viber (tako se ovde dopisuje), ostali jezici WhatsApp.
 * Poruka se otvara već započeta, sa linkom ture, pa agent odmah zna koji
 * stan je u pitanju. Pojavljuje se tek kad soba "odćuti" (page.tsx).
 *
 * Boje su boje aplikacija (Viber ljubičasta, WhatsApp zelena) sa istim
 * prelazom i svetlom ivicom kao ostala puna dugmad ture (FILL_ACCENT).
 */
export function ChatAgentButton({
  phone,
  viber,
  label,
  message,
  onOpen,
  floating = false
}: {
  /** Broj u obliku +381... (phoneToE164). */
  phone: string;
  /** true = Viber (srpski), false = WhatsApp. */
  viber: boolean;
  label: string;
  /** Započeta poruka (pozdrav + link ture). */
  message: string;
  onOpen: () => void;
  /** Samostalno, desno iznad donjeg menija (kad kartice nema), umesto prikačeno uz nju. */
  floating?: boolean;
}) {
  const href = viber
    ? `viber://chat?number=${encodeURIComponent(phone)}&draft=${encodeURIComponent(message)}`
    : `https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(message)}`;
  return (
    <a
      href={href}
      {...(viber ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
      className={floating ? 'tour-ui-scale k360-tap' : 'k360-tap'}
      onClick={onOpen}
      aria-label={label}
      title={label}
      style={{
        ...(floating
          ? { position: 'absolute' as const, right: '12px', bottom: ABOVE_MENU_BOTTOM, zIndex: 30 }
          : {}),
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: '36px',
        boxSizing: 'border-box',
        padding: '0 14px 0 11px',
        borderRadius: '999px',
        background: viber
          ? 'linear-gradient(180deg, #8C7CF7 0%, #7360F2 55%, #5F4BDB 100%)'
          : 'linear-gradient(180deg, #34C46F 0%, #1FA855 55%, #178F47 100%)',
        border: '1px solid rgba(255, 255, 255, 0.35)',
        boxShadow: `${FILL_ACCENT_EDGE}, 0 4px 12px rgba(0, 0, 0, 0.25)`,
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
      {/* Beli oblačić sa slušalicom - prepoznaje se kao Viber (zaobljen
          kvadrat) ili WhatsApp (krug) i bez pravog logoa, isto kao ChatBubble na sajtu. */}
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        {viber ? (
          <path d="M7 2.5h10A4.5 4.5 0 0 1 21.5 7v6.5A4.5 4.5 0 0 1 17 18h-5.2L7.5 21.5V18H7A4.5 4.5 0 0 1 2.5 13.5V7A4.5 4.5 0 0 1 7 2.5Z" fill="#fff" />
        ) : (
          <path d="M12 2.5a9.5 9.5 0 0 1 0 19 9.4 9.4 0 0 1-4.6-1.2L2.5 21.5l1.3-4.7A9.5 9.5 0 0 1 12 2.5Z" fill="#fff" />
        )}
        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill={viber ? '#7360F2' : '#1FA855'} transform={viber ? 'translate(6.3 4.3) scale(0.48)' : 'translate(6.5 6.3) scale(0.48)'} />
      </svg>
      {viber ? 'Viber' : 'WhatsApp'}
    </a>
  );
}

/**
 * "Da li želite da napustite turu?" - pojavljuje se na dugme "nazad" kad
 * ništa drugo nije otvoreno (vidi useBackGuard). Dodir van prozora = ostani.
 */
export function LeaveTourDialog({
  title,
  stayLabel,
  leaveLabel,
  onStay,
  onLeave
}: {
  title: string;
  stayLabel: string;
  leaveLabel: string;
  onStay: () => void;
  onLeave: () => void;
}) {
  const font = 'var(--font-urbanist), var(--font-jakarta), system-ui, sans-serif';
  const btn: React.CSSProperties = {
    flex: 1,
    height: '48px',
    borderRadius: '999px',
    fontFamily: font,
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer'
  };
  return (
    <div
      onClick={onStay}
      style={{ position: 'absolute', inset: 0, zIndex: 90, background: THEME.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="k360-leave-title"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '340px', background: 'linear-gradient(180deg, #E6EEF9 0px, #F6F8FC 90px)', border: '1px solid ' + THEME.border, borderRadius: '24px', padding: '22px 18px 18px', boxShadow: THEME.shadowLg, textAlign: 'center' }}
      >
        <h2 id="k360-leave-title" style={{ margin: '0 0 18px', fontFamily: font, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.015em', lineHeight: 1.25, color: THEME.accent }}>
          {title}
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" onClick={onLeave} style={{ ...btn, background: '#FFFFFF', color: THEME.accent, border: '1.5px solid ' + THEME.accent }}>
            {leaveLabel}
          </button>
          <button type="button" autoFocus onClick={onStay} style={{ ...btn, ...FILL_ACCENT, color: '#FFFFFF', border: 'none' }}>
            {stayLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
