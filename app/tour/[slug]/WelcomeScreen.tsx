import { THEME, GLASS, GLASS_ACCENT } from './theme';
import { Logo } from './Logo';
import { LanguageChips } from './TourControls';
import { IconLink } from './icons';
import type { Language } from './types';
import type { ListingPrice } from '../../lib/listingPrice';
import { keepUnitsTogether } from '../../lib/typography';

/**
 * Uvodni ekran ture: naslovna fotografija, izbor jezika i dugme za polazak.
 * Stoji preko panorame dok posetilac ne krene (`tourStarted`).
 *
 * Gornja traka nosi samo logo (levo) i deljenje linka (desno) - ostatak
 * ekrana je slobodan za naslov i CTA. Izbor jezika stoji odmah ispod
 * obaveštenja o pokretanju (lede), pre dugmadi za polazak - prirodan tok je
 * da posetilac prvo izabere jezik, pa tek onda pusti turu.
 *
 * Kad tura ima putanju vodiča (`guideChoice`), umesto jednog dugmeta nudi
 * pravi izbor: automatsko vođenje (agent priča i hoda kroz sve prostorije
 * bez prekida) ili samostalno istraživanje (kao i do sada). Bez putanje
 * ostaje stari jednodelan CTA.
 */
export function WelcomeScreen({
  coverUrl,
  agencyName,
  title,
  price,
  lede,
  startLabel,
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
  lede: string;
  startLabel: string;
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
          <IconLink size={16} color={shareCopied ? '#86efac' : '#fff'} />
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
        <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '16px', maxWidth: '440px', margin: '0 0 18px', lineHeight: 1.5, textShadow: '0 1px 8px rgba(0, 0, 0, 0.35)' }}>
          {lede}
        </p>

        {/*
          Odmah ispod obaveštenja ("Izaberite jezik i kliknite...") - prirodan
          tok je da posetilac prvo izabere jezik, pa tek onda pusti turu.
        */}
        <div style={{ ...GLASS, display: 'flex', gap: '4px', borderRadius: '999px', padding: '4px', marginBottom: '26px' }}>
          <LanguageChips lang={lang} languages={languages} onChange={onChangeLanguage} size="lg" selectedColor={THEME.accent} />
        </div>

        {guideChoice ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '9px', width: '100%', maxWidth: '320px' }}>
            <button
              onClick={guideChoice.onStartGuided}
              style={{ width: '100%', padding: '12px 24px', fontSize: '15px', fontWeight: 'bold', backgroundColor: THEME.accent, color: '#fff', border: '1px solid rgba(255, 255, 255, 0.25)', borderRadius: '999px', cursor: 'pointer', boxShadow: '0 6px 18px rgba(30, 90, 168, 0.4)' }}
            >
              {guideChoice.guidedLabel}
            </button>
            <p style={{ margin: '0 0 4px', fontSize: '12.5px', lineHeight: 1.4, color: 'rgba(255, 255, 255, 0.75)', textShadow: '0 1px 6px rgba(0, 0, 0, 0.35)' }}>
              {guideChoice.guidedHint}
            </p>

            <button
              onClick={onStart}
              style={{ width: '100%', padding: '10px 24px', fontSize: '13.5px', fontWeight: 700, background: 'rgba(255, 255, 255, 0.08)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.35)', borderRadius: '999px', cursor: 'pointer' }}
            >
              {guideChoice.exploreLabel}
            </button>
            <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.4, color: 'rgba(255, 255, 255, 0.75)', textShadow: '0 1px 6px rgba(0, 0, 0, 0.35)' }}>
              {guideChoice.exploreHint}
            </p>
          </div>
        ) : (
          <button onClick={onStart} style={{ padding: '12px 28px', fontSize: '15px', fontWeight: 'bold', backgroundColor: THEME.accent, color: '#fff', border: '1px solid rgba(255, 255, 255, 0.25)', borderRadius: '999px', cursor: 'pointer', boxShadow: '0 6px 18px rgba(30, 90, 168, 0.4)' }}>
            {startLabel}
          </button>
        )}
      </div>
    </div>
  );
}
