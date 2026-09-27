import { useState } from 'react';
import { THEME, GLASS, GLASS_ACCENT } from './theme';
import { Logo } from './Logo';
import { LanguageChips } from './TourControls';
import { IconShare } from './icons';
import type { Language } from './types';
import type { ListingPrice } from '../../lib/listingPrice';
import { keepUnitsTogether } from '../../lib/typography';

/**
 * Uvodni ekran ture: naslovna fotografija, izbor jezika i dugme za polazak.
 * Stoji preko panorame dok posetilac ne krene (`tourStarted`).
 *
 * Gornja traka nosi samo logo (levo) i deljenje linka (desno) - ostatak
 * ekrana je slobodan za naslov i CTA. Izbor jezika stoji pre dugmadi za
 * polazak - prirodan tok je da posetilac prvo izabere jezik, pa tek onda
 * pusti turu.
 *
 * Kad tura ima putanju vodiča (`guideChoice`), umesto jednog dugmeta nudi
 * pravi izbor: automatsko vođenje (agent priča i hoda kroz sve prostorije
 * bez prekida) ili samostalno istraživanje. Bez putanje ostaje jedno dugme.
 *
 * Opis svakog izbora je jedan kratak red UNUTAR dugmeta (ne pasus ispod),
 * da ekran ne bude natrpan, a objašnjenje stoji tačno gde se odlučuje. Za
 * one kojima 360° tura nije poznata, ispod dugmadi je "Kako radi?" -
 * mali prozor sa tri koraka.
 */
export function WelcomeScreen({
  coverUrl,
  agencyName,
  title,
  price,
  startLabel,
  startHint,
  help,
  onStart,
  guideChoice,
  onShare,
  shareCopied,
  shareLabel,
  shareCopiedLabel,
  lang,
  languages,
  onChangeLanguage
}: {
  coverUrl: string | null;
  agencyName: string | null;
  title: string;
  /** Cena nekretnine - null kad nije upisana (tada se ne prikazuje). */
  price: ListingPrice | null;
  startLabel: string;
  /** Kratak opis ispod natpisa jedinog dugmeta (kad nema izbora vodiča). */
  startHint: string;
  /** Tekstovi prozora "Kako radi?". */
  help: { link: string; steps: [string, string, string, string]; gotIt: string };
  onStart: () => void;
  guideChoice?: {
    guidedLabel: string;
    guidedHint: string;
    exploreLabel: string;
    exploreHint: string;
    onStartGuided: () => void;
  } | null;
  onShare: () => void;
  shareCopied: boolean;
  shareLabel: string;
  shareCopiedLabel: string;
  lang: Language;
  /** Samo jezici koje tura zaista ima (admin vidi sve). */
  languages: Language[];
  onChangeLanguage: (l: Language) => void;
}) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div
      className="tour-ui-scale"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        overflow: 'hidden',
        // Bez slike (tura još nema pregled) ostaje tamna pozadina, da
        // beli tekst i stakleni meni i dalje izgledaju isto.
        background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 20px 140px',
        textAlign: 'center',
        color: '#fff',
        // Logo na tamnoj pozadini: belo "Kvadrat", svetlija plava "360".
        ['--ink' as string]: '#fff',
        ['--accent' as string]: '#5B92D6'
      }}
    >
      {coverUrl && (
        <>
          <style>{'@keyframes k360WelcomeDrift{from{transform:scale(1.02)}to{transform:scale(1.1)}}@media (prefers-reduced-motion: reduce){.k360-welcome-cover{animation:none!important}}'}</style>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="k360-welcome-cover"
            src={coverUrl}
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              animation: 'k360WelcomeDrift 24s ease-in-out infinite alternate'
            }}
          />
        </>
      )}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.55) 0%, rgba(15, 23, 42, 0.35) 40%, rgba(15, 23, 42, 0.8) 100%)'
        }}
      />

      <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo />
        <button
          onClick={onShare}
          title={shareCopied ? shareCopiedLabel : shareLabel}
          aria-label={shareCopied ? shareCopiedLabel : shareLabel}
          style={{
            ...GLASS,
            background: shareCopied ? 'rgba(34, 197, 94, 0.55)' : GLASS.background,
            color: shareCopied ? '#86efac' : '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            borderRadius: '999px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 700,
            fontFamily: THEME.fontBody,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <IconShare size={16} color={shareCopied ? '#86efac' : '#fff'} />
          {shareCopied ? shareCopiedLabel : shareLabel}
        </button>
      </div>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '520px', marginTop: '70px' }}>
        {agencyName && (
          <div style={{ color: GLASS_ACCENT, fontSize: '12px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
            {agencyName}
          </div>
        )}

        <h1 style={{ color: '#fff', fontSize: 'clamp(26px, 5vw, 38px)', lineHeight: 1.15, margin: '0 0 12px', fontWeight: 700, fontFamily: THEME.fontDisplay, textWrap: 'balance', textShadow: '0 2px 12px rgba(0, 0, 0, 0.35)' }}>
          {keepUnitsTogether(title)}
        </h1>
        {/* Cena odmah uz naslov - prvo što kupac pita, pre nego što krene
            u obilazak. Jedinica (mesečno / noć) sitnije, kao na karticama. */}
        {price && (
          <div style={{ ...GLASS, borderRadius: '999px', padding: '6px 16px', margin: '0 0 14px', fontFamily: THEME.fontDisplay, fontSize: '18px', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>
            {price.amount}
            {price.unit && (
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.78)' }}> {price.unit}</span>
            )}
          </div>
        )}

        {/* Prirodan tok: prvo jezik, pa tek onda polazak. */}
        <div style={{ ...GLASS, display: 'flex', gap: '4px', borderRadius: '999px', padding: '4px', marginBottom: '22px' }}>
          <LanguageChips lang={lang} languages={languages} onChange={onChangeLanguage} size="lg" selectedColor={THEME.accent} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '330px' }}>
          {guideChoice ? (
            <>
              <ChoiceButton icon="🎧" label={guideChoice.guidedLabel} hint={guideChoice.guidedHint} primary onClick={guideChoice.onStartGuided} />
              <ChoiceButton icon="🧭" label={guideChoice.exploreLabel} hint={guideChoice.exploreHint} onClick={onStart} />
            </>
          ) : (
            <ChoiceButton icon="▶" label={startLabel} hint={startHint} primary onClick={onStart} />
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowHelp(true)}
          style={{ marginTop: '16px', background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.88)', fontSize: '14px', fontFamily: THEME.fontBody, textDecoration: 'underline', textUnderlineOffset: '3px', cursor: 'pointer', textShadow: '0 1px 6px rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span aria-hidden="true" style={{ fontSize: '15px', textDecoration: 'none' }}>ⓘ</span>
          {help.link}
        </button>
      </div>

      {showHelp && <HowItWorks help={help} onClose={() => setShowHelp(false)} />}
    </div>
  );
}

/** Natpisi imaju emoji na početku ("▶ Pokreni turu") - ovde ikonica stoji posebno. */
function stripLeadingSymbol(label: string): string {
  return label.replace(/^[^\p{L}\p{N}]+/u, '');
}

/**
 * Dugme izbora: ikonica, natpis i jedan red opisa - ceo okvir je dugme,
 * pa je površina za dodir velika i opis se čita baš dok se bira.
 */
function ChoiceButton({
  icon,
  label,
  hint,
  primary = false,
  onClick
}: {
  icon: string;
  label: string;
  hint: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '11px 18px',
        borderRadius: '18px',
        border: primary ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid rgba(255, 255, 255, 0.45)',
        background: primary ? THEME.accent : 'rgba(255, 255, 255, 0.1)',
        boxShadow: primary ? '0 6px 18px rgba(30, 90, 168, 0.4)' : 'none',
        color: '#fff',
        textAlign: 'left',
        fontFamily: THEME.fontBody,
        cursor: 'pointer'
      }}
    >
      <span aria-hidden="true" style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0, width: '26px', textAlign: 'center' }}>
        {icon}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
        <span style={{ fontSize: '15.5px', fontWeight: 700, lineHeight: 1.2 }}>{stripLeadingSymbol(label)}</span>
        <span style={{ fontSize: '12.5px', lineHeight: 1.3, color: 'rgba(255, 255, 255, 0.82)' }}>{hint}</span>
      </span>
    </button>
  );
}

/**
 * Prozor "Kako radi 360° tura?" - četiri koraka, svaki sa sličicom koja
 * izgleda TAČNO kao u turi (siva tačka koja pulsira je ista klasa
 * .k360-hs-beacon iz TourOverlays), da posetilac prepozna šta traži.
 */
function HowItWorks({
  help,
  onClose
}: {
  help: { link: string; steps: [string, string, string, string]; gotIt: string };
  onClose: () => void;
}) {
  const tile: React.CSSProperties = {
    flexShrink: 0,
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    background: 'linear-gradient(160deg, #3A4252 0%, #1B2130 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden'
  };
  const pictures = [
    // 1. prevlačenje prstom
    <span key="drag" aria-hidden="true" style={tile}>
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h16M4 7l3-3M4 7l3 3M20 7l-3-3M20 7l-3 3" />
        <path d="M10 20v-6.5a1.5 1.5 0 0 1 3 0V16l3.2.6a2 2 0 0 1 1.6 2.3L17.3 21" />
      </svg>
    </span>,
    // 2. siva tačka koja pulsira + naziv sobe
    <span key="nav" aria-hidden="true" style={{ ...tile, flexDirection: 'column', gap: '3px' }}>
      <span className="k360-hs-beacon" style={{ width: '16px', height: '16px' }} />
      <span style={{ fontSize: '8px', fontWeight: 700, color: '#fff', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '999px', padding: '1px 5px', lineHeight: 1.3 }}>Soba</span>
    </span>,
    // 3. žuta info tačka
    <span key="info" aria-hidden="true" style={tile}>
      <span style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1px solid rgba(255, 255, 255, 0.7)', background: 'rgba(15, 23, 42, 0.32)', color: '#fde68a', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>ℹ</span>
    </span>,
    // 4. donji meni
    <span key="menu" aria-hidden="true" style={{ ...tile, alignItems: 'flex-end', paddingBottom: '8px' }}>
      <span style={{ display: 'flex', gap: '3px', background: 'rgba(255, 255, 255, 0.14)', borderRadius: '6px', padding: '4px 5px' }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: i === 2 ? '#7FB0EC' : '#fff' }} />
        ))}
      </span>
    </span>
  ];

  return (
    <div
      onClick={onClose}
      style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(10, 14, 25, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-title"
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'linear-gradient(180deg, #E6EEF9 0px, #F6F8FC 110px)', color: THEME.textPrimary, borderRadius: '24px', padding: '22px 18px 18px', width: '100%', maxWidth: '380px', maxHeight: '90%', overflowY: 'auto', textAlign: 'left', fontFamily: THEME.fontBody, boxShadow: THEME.shadowLg }}
      >
        <h2 id="how-title" style={{ margin: '0 2px 16px', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.015em', color: THEME.accent, fontFamily: 'var(--font-urbanist), ' + THEME.fontDisplay, lineHeight: 1.2 }}>
          {help.link}
        </h2>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {help.steps.map((step, i) => (
            <li
              key={i}
              style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#FFFFFF', border: '1.5px solid #9DBBE3', borderRadius: '18px', padding: '10px 12px 10px 10px' }}
            >
              {pictures[i]}
              <span style={{ fontSize: '14px', lineHeight: 1.45, color: '#2A2B30' }}>{step}</span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={onClose}
          style={{ marginTop: '16px', width: '100%', padding: '14px', borderRadius: '999px', border: 'none', background: THEME.accent, color: '#fff', fontFamily: 'var(--font-urbanist), ' + THEME.fontDisplay, fontSize: '15px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 20px -8px rgba(30, 90, 168, 0.7)' }}
        >
          {help.gotIt}
        </button>
      </div>
    </div>
  );
}
