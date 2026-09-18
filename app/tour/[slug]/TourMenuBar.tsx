import { THEME, GLASS, GLASS_ACCENT, overlayNavButtonStyle, SCREEN_BOTTOM } from './theme';
import { IconLink, MODAL_ICONS, withoutEmoji } from './icons';
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
  showShare = true
}: {
  activeModal: ActiveModal;
  onOpenModal: (modal: ActiveModal) => void;
  onShare: () => void;
  shareCopied: boolean;
  labels: MenuLabels;
  shareLabel: string;
  copiedLabel: string;
  showShare?: boolean;
}) {
  return (
    <>
      {/* Deljenje stoji iznad menija, na sredini (iznad "Info"). */}
      {showShare && (
      <button
        onClick={onShare}
        className="tour-ui-scale"
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
          padding: '7px 14px',
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
            <IconLink size={16} color={GLASS_ACCENT} />
            {withoutEmoji(shareLabel)}
          </>
        )}
      </button>
      )}

      <div className="tour-ui-scale" style={{
        ...GLASS,
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
        padding: '5px',
        borderRadius: '16px',
        justifyContent: 'center'
      }}>
        {MENU_ORDER.map((modal) => {
          const Icon = MODAL_ICONS[modal];
          const active = activeModal === modal;
          return (
            <button
              key={modal}
              onClick={() => onOpenModal(modal)}
              style={{
                ...overlayNavButtonStyle,
                flex: 1,
                minWidth: 0,
                color: active ? GLASS_ACCENT : '#fff',
                background: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                fontSize: '12.5px',
                fontFamily: THEME.fontBody
              }}
            >
              <Icon size={22} color={GLASS_ACCENT} />
              <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {withoutEmoji(labels[modal])}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
