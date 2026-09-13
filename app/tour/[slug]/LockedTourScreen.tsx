import { THEME, GLASS, GLASS_ACCENT, btnStyle } from './theme';
import { Logo } from './Logo';
import { LanguageChips } from './TourControls';
import { translations } from './translations';
import type { Language, Tour } from './types';

/**
 * Nekretnina je izdata, prodata ili pauzirana (`tours.status`, migracija
 * 010): posetilac umesto ture vidi kratku poruku i kontakt agenta, a link
 * ostaje živ. Admin i dalje otvara turu preko ?admin=1.
 */

type Labels = (typeof translations)[Language];

export function LockedTourScreen({
  tour,
  t,
  title,
  coverUrl,
  lang,
  languages,
  onChangeLanguage
}: {
  tour: Tour;
  t: Labels;
  /** Naziv ture na izabranom jeziku. */
  title: string;
  coverUrl: string | null;
  lang: Language;
  languages: Language[];
  onChangeLanguage: (l: Language) => void;
}) {
  const lockedTitle =
    tour.status === 'rented' ? t.lockedRentedTitle : tour.status === 'sold' ? t.lockedSoldTitle : t.lockedPausedTitle;
  const hasContact = Boolean(tour.agent_name || tour.agent_phone || tour.agent_email);

  const contactCard = {
    ...GLASS,
    borderRadius: '12px',
    padding: '14px 16px'
  };
  const contactRow = {
    ...contactCard,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px'
  };
  const contactBtn = {
    ...btnStyle,
    background: GLASS_ACCENT,
    color: '#fff',
    border: 'none',
    textDecoration: 'none',
    padding: '9px 16px',
    fontSize: '13px',
    flexShrink: 0
  };
  const label = { margin: '0 0 4px', fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)' };

  return (
    <main style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center', color: '#fff', background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)', fontFamily: THEME.fontBody, ['--ink' as string]: '#fff', ['--accent' as string]: GLASS_ACCENT }}>
      {coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.35)' }} />
      )}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.72)' }} />

      <div style={{ position: 'absolute', top: '16px', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Logo />
      </div>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '440px' }}>
        <div style={{ ...GLASS, display: 'flex', gap: '4px', borderRadius: '999px', padding: '4px', marginBottom: '24px' }}>
          <LanguageChips lang={lang} languages={languages} onChange={onChangeLanguage} size="lg" />
        </div>

        <h1 style={{ color: '#fff', fontSize: 'clamp(22px, 4.5vw, 30px)', lineHeight: 1.2, margin: '0 0 10px', fontWeight: 700, fontFamily: THEME.fontDisplay, textWrap: 'balance' }}>
          {lockedTitle}
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', margin: '0 0 24px', lineHeight: 1.5 }}>
          {title}{tour.agency_name ? ` — ${tour.agency_name}` : ''}
        </p>

        {hasContact && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
            <p style={{ margin: '0 0 2px', fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.65)', textAlign: 'center' }}>
              {t.lockedIntro}
            </p>
            {tour.agent_name && (
              <div style={contactCard}>
                <p style={label}>{t.agentLabel}</p>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{tour.agent_name}</p>
              </div>
            )}
            {tour.agent_phone && (
              <div style={contactRow}>
                <div>
                  <p style={label}>{t.phoneLabel}</p>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{tour.agent_phone}</p>
                </div>
                <a href={`tel:${tour.agent_phone}`} style={contactBtn}>
                  {t.callBtn}
                </a>
              </div>
            )}
            {tour.agent_email && (
              <div style={contactRow}>
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <p style={label}>{t.emailLabel}</p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{tour.agent_email}</p>
                </div>
                <a href={`mailto:${tour.agent_email}`} style={contactBtn}>
                  {t.emailBtn}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
