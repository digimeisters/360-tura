import { THEME, GLASS, GLASS_ACCENT, overlayNavButtonStyle, SCREEN_BOTTOM } from './theme';
import { IconShare, IconSparkle, MODAL_ICONS, withoutEmoji } from './icons';
import type { ActiveModal } from './types';

/**
 * Traka uz samo dno ekrana: pet dugmadi za modale (pitanja, lokacija, info,
 * skica, kontakt) i dugme za deljenje iznad njih, na sredini.
 */

/** Redosled je isti kao u turi od početka - ne menjati bez razloga. */
const MENU_ORDER = ['faq', 'location', 'about', 'plan', 'contact'] as const;

export type MenuLabels = Record<(typeof MENU_ORDER)[number], string>;

export function TourMenuBar({
  activeModal,
  onOpenModal,
  onShare,
  shareCopied,
  labels,
  shareLabel,
  copiedLabel,
  // Na uvodnom ekranu deljenje već stoji gore desno (WelcomeScreen), pa se
  // ovde ne duplira - vidi showShare={tourStarted} u page.tsx.
  showShare = true,
  joined = false,
  compact = false
}: {
  activeModal: ActiveModal;
  onOpenModal: (modal: ActiveModal) => void;
  onShare: () => void;
  shareCopied: boolean;
  labels: MenuLabels;
  shareLabel: string;
  copiedLabel: string;
  showShare?: boolean;
  /**
   * Telefon, dok je otvorena kartica sa tekstom: dugmad sede u donjem delu
   * kartice (InfoCard docked), bez sopstvenog stakla - kartica i meni su
   * jedna ploča umesto dve kutije jedna iznad druge.
   */
  joined?: boolean;
  /**
   * Dok posetilac prstom razgleda panoramu: samo uvećane ikonice, bez naziva,
   * u nižoj traci - meni ostaje pri ruci, a pokriva manje slike. Nazivi se
   * vraćaju zajedno sa ostalim dugmićima (useImmersiveWhileDragging).
   */
  compact?: boolean;
}) {
  return (
    <>
      {/* Deljenje stoji iznad menija, na sredini (iznad "Info"). */}
      {showShare && !compact && (
      <button
        onClick={onShare}
        className="tour-ui-scale k360-tap"
        style={{
          ...GLASS,
          position: 'absolute',
          bottom: `calc(${SCREEN_BOTTOM} + 80px)`,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 56,
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          height: '36px',
          boxSizing: 'border-box',
          padding: '0 16px',
          borderRadius: '999px',
          color: shareCopied ? '#86efac' : '#fff',
          fontSize: '13px',
          fontWeight: 700,
          fontFamily: THEME.fontBody,
          cursor: 'pointer',
          whiteSpace: 'nowrap'
        }}
      >
        {shareCopied ? copiedLabel : (
          <>
            <IconShare size={16} color={GLASS_ACCENT} />
            {withoutEmoji(shareLabel)}
          </>
        )}
      </button>
      )}

      <div className="tour-ui-scale" style={{
        ...GLASS,
        ...(joined ? { background: 'transparent', border: '1px solid transparent', boxShadow: 'none', backdropFilter: 'none', WebkitBackdropFilter: 'none' } : {}),
        position: 'absolute',
        bottom: SCREEN_BOTTOM,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 55,
        display: 'flex',
        gap: '2px',
        width: 'calc(100% - 24px)',
        maxWidth: '520px',
        boxSizing: 'border-box',
        padding: compact ? '4px 6px' : '6px',
        borderRadius: '26px',
        transition: 'padding 0.2s ease',
        justifyContent: 'center'
      }}>
        {MENU_ORDER.map((modal) => {
          const Icon = MODAL_ICONS[modal];
          const active = activeModal === modal;
          return (
            <button
              key={modal}
              onClick={() => onOpenModal(modal)}
              aria-label={withoutEmoji(labels[modal])}
              style={{
                ...overlayNavButtonStyle,
                flex: 1,
                minWidth: 0,
                minHeight: compact ? '44px' : '52px',
                justifyContent: 'center',
                color: '#fff',
                background: active ? 'rgba(127, 176, 236, 0.18)' : 'transparent',
                borderRadius: '18px',
                fontSize: '12px',
                fontWeight: 600,
                fontFamily: THEME.fontBody
              }}
            >
              <span style={{ position: 'relative', display: 'flex' }}>
                <Icon size={compact ? 27 : 22} color={active ? GLASS_ACCENT : '#fff'} />
                {/* Mali znak: u Pitanjima sada odgovara i asistent (10. 10. 2026). */}
                {modal === 'faq' && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-9px',
                      width: '15px',
                      height: '15px',
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      background: 'linear-gradient(180deg, #7AA8E0 0%, #5B92D6 55%, #4A80C4 100%)',
                      border: '1.5px solid rgba(255, 255, 255, 0.9)'
                    }}
                  >
                    <IconSparkle size={8} color="#fff" />
                  </span>
                )}
              </span>
              {!compact && <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {withoutEmoji(labels[modal])}
              </span>}
            </button>
          );
        })}
      </div>
    </>
  );
}
