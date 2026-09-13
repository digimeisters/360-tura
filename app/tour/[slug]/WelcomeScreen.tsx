import { THEME, GLASS, GLASS_ACCENT } from './theme';
import { Logo } from './Logo';
import { LanguageChips } from './TourControls';
import type { Language } from './types';

/**
 * Uvodni ekran ture: naslovna fotografija, izbor jezika i dugme za polazak.
 * Stoji preko panorame dok posetilac ne krene (`tourStarted`).
 */
export function WelcomeScreen({
  coverUrl,
  agencyName,
  title,
  lede,
  startLabel,
  onStart,
  lang,
  languages,
  onChangeLanguage
}: {
  coverUrl: string | null;
  agencyName: string | null;
  title: string;
  lede: string;
  startLabel: string;
  onStart: () => void;
  lang: Language;
  /** Samo jezici koje tura zaista ima (admin vidi sve). */
  languages: Language[];
  onChangeLanguage: (l: Language) => void;
}) {
  return (
    <div
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

      <div style={{ position: 'absolute', top: '16px', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Logo />
      </div>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '520px' }}>
        <div style={{ ...GLASS, display: 'flex', gap: '4px', borderRadius: '999px', padding: '4px', marginBottom: '22px' }}>
          <LanguageChips lang={lang} languages={languages} onChange={onChangeLanguage} size="lg" />
        </div>

        {agencyName && (
          <div style={{ color: GLASS_ACCENT, fontSize: '12px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
            {agencyName}
          </div>
        )}

        <h1 style={{ color: '#fff', fontSize: 'clamp(26px, 5vw, 38px)', lineHeight: 1.15, margin: '0 0 12px', fontWeight: 700, fontFamily: THEME.fontDisplay, textWrap: 'balance', textShadow: '0 2px 12px rgba(0, 0, 0, 0.35)' }}>
          {title}
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '16px', maxWidth: '440px', margin: '0 0 30px', lineHeight: 1.5, textShadow: '0 1px 8px rgba(0, 0, 0, 0.35)' }}>
          {lede}
        </p>
        <button onClick={onStart} style={{ padding: '15px 34px', fontSize: '17px', fontWeight: 'bold', backgroundColor: THEME.accent, color: '#fff', border: '1px solid rgba(255, 255, 255, 0.25)', borderRadius: '999px', cursor: 'pointer', boxShadow: '0 8px 24px rgba(30, 90, 168, 0.45)' }}>
          {startLabel}
        </button>
      </div>
    </div>
  );
}
