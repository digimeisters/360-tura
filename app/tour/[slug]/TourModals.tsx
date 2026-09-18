import { THEME, btnStyle } from './theme';
import { MODAL_ICONS, withoutEmoji } from './icons';
import { getLocalizedText, type FactRow } from './utils';
import { translations } from './translations';
import type { ActiveModal, Language, Room, Tour } from './types';

/**
 * Modali ture: skica, lokacija, info, pitanja i kontakt, plus zaseban modal
 * sa odgovorom na izabrano pitanje. Sve je prikaz podataka ture - nijedna
 * odluka se ne donosi ovde, strana šalje gotove vrednosti i rukovaoce.
 */

type Labels = (typeof translations)[Language];

export type FaqItem = { question: string; answer: string };

export function TourModals({
  activeModal,
  onClose,
  t,
  tour,
  rooms,
  currentRoom,
  currentRoomTitle,
  lang,
  adminMode,
  aboutText,
  factList,
  faqList,
  onSelectFaq,
  onChangeRoom,
  onFloorplanClick,
  onShare,
  shareCopied
}: {
  activeModal: ActiveModal;
  /** Zatvara i modal i otvoreno pitanje. */
  onClose: () => void;
  t: Labels;
  tour: Tour | null;
  rooms: Room[];
  currentRoom: Room | undefined;
  currentRoomTitle: string;
  lang: Language;
  adminMode: boolean;
  aboutText: string;
  factList: FactRow[];
  faqList: FaqItem[];
  onSelectFaq: (index: number | null) => void;
  onChangeRoom: (id: string | number) => void;
  /** Admin: klik po skici postavlja oznaku trenutne sobe. */
  onFloorplanClick: React.MouseEventHandler<HTMLImageElement>;
  onShare: () => void;
  shareCopied: boolean;
}) {
  if (!activeModal) return null;

  const Icon = MODAL_ICONS[activeModal];
  const title = {
    plan: t.btnPlan,
    location: t.btnLocation,
    about: t.btnAbout,
    faq: t.btnFaq,
    contact: t.btnContact
  }[activeModal];

  const empty = (text: string) => (
    <p style={{ textAlign: 'center', color: THEME.textMuted, fontSize: '16px' }}>{text}</p>
  );

  return (
    <div className="tour-ui-scale" style={{ position: 'absolute', inset: 0, zIndex: 80, backgroundColor: THEME.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ backgroundColor: THEME.surface, border: '1px solid ' + THEME.border, borderRadius: '20px', width: '100%', maxWidth: '680px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: THEME.shadowLg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid ' + THEME.border }}>
          <h2 style={{ color: THEME.textPrimary, fontSize: '20px', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon size={22} color={THEME.accent} />
            {withoutEmoji(title)}
          </h2>
          <button
            onClick={onClose}
            title={t.close}
            style={{ background: 'transparent', border: 'none', color: THEME.textMuted, fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', padding: '0 4px', lineHeight: '1', flexShrink: 0 }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, color: THEME.textPrimary, fontSize: '16px' }}>
          {activeModal === 'plan' && (
            tour?.floorplan_url ? (
              <div>
                {adminMode && (
                  <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: THEME.accent, fontWeight: 600, textAlign: 'center' }}>
                    🖊️ Klikni na skicu da postaviš oznaku za trenutnu sobu: <b>{currentRoomTitle}</b>
                  </p>
                )}
                {/* Unutrašnji omotač je tačno veličine slike: oznake su u
                    procentima slike, a spoljni okvir je širi kad je skica
                    visoka - tada bi oznake stajale pomereno. */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{ position: 'relative', lineHeight: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={tour.floorplan_url}
                      alt="Floorplan"
                      onClick={adminMode ? onFloorplanClick : undefined}
                      style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '12px', cursor: adminMode ? 'crosshair' : 'default', display: 'block' }}
                    />
                    {rooms
                      .filter((r) => typeof r.floorplan_x === 'number' && typeof r.floorplan_y === 'number')
                      .map((r) => {
                        const isCurrent = r.id === currentRoom?.id;
                        return (
                          <button
                            key={r.id}
                            title={getLocalizedText(r.title_i18n, lang)}
                            onClick={(e) => {
                              e.stopPropagation();
                              onChangeRoom(r.id);
                              onClose();
                            }}
                            style={{
                              position: 'absolute',
                              left: `${r.floorplan_x}%`,
                              top: `${r.floorplan_y}%`,
                              transform: 'translate(-50%, -50%)',
                              width: isCurrent ? '18px' : '14px',
                              height: isCurrent ? '18px' : '14px',
                              borderRadius: '50%',
                              backgroundColor: isCurrent ? THEME.accent : THEME.surface,
                              border: '2px solid ' + (isCurrent ? '#fff' : THEME.accent),
                              boxShadow: THEME.shadowLg,
                              cursor: 'pointer',
                              padding: 0
                            }}
                          />
                        );
                      })}
                  </div>
                </div>
              </div>
            ) : empty(t.noPlan)
          )}

          {activeModal === 'location' && (
            tour?.location_map_url ? (
              <div style={{ width: '100%', height: '380px', borderRadius: '12px', overflow: 'hidden' }}>
                <iframe src={tour.location_map_url} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
            ) : empty(t.noLocation)
          )}

          {activeModal === 'about' && (
            factList.length > 0 || aboutText ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {factList.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', borderRadius: '12px', overflow: 'hidden', border: '1px solid ' + THEME.border }}>
                    {factList.map((row, i) => (
                      <div
                        key={row.label}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '12px',
                          padding: '11px 14px',
                          backgroundColor: i % 2 === 0 ? THEME.surfaceAlt : 'transparent',
                          borderTop: i === 0 ? 'none' : '1px solid ' + THEME.border
                        }}
                      >
                        <span style={{ color: THEME.textSecondary, fontSize: '14.5px' }}>{row.label}</span>
                        <span style={{ color: THEME.textPrimary, fontSize: '14.5px', fontWeight: 600, textAlign: 'right' }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                {aboutText && (
                  <p style={{ margin: 0, lineHeight: '1.6', color: THEME.textPrimary, whiteSpace: 'pre-wrap', fontSize: '15px' }}>{aboutText}</p>
                )}
              </div>
            ) : empty(t.noAbout)
          )}

          {activeModal === 'faq' && (
            faqList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {faqList.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => onSelectFaq(index)}
                    style={{
                      textAlign: 'left',
                      backgroundColor: THEME.surfaceAlt,
                      border: '1px solid ' + THEME.border,
                      borderRadius: '12px',
                      padding: '14px 16px',
                      color: THEME.textPrimary,
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      width: '100%',
                      lineHeight: '1.4'
                    }}
                  >
                    {item.question}
                  </button>
                ))}
              </div>
            ) : empty(t.noFaq)
          )}

          {activeModal === 'contact' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px' }}>
              {tour?.agent_name && (
                <div style={{ backgroundColor: THEME.surfaceAlt, padding: '16px', borderRadius: '12px', border: '1px solid ' + THEME.border }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: THEME.textSecondary }}>{t.agentLabel}</p>
                  <p style={{ margin: 0, fontSize: '17px', fontWeight: 'bold', color: THEME.textPrimary }}>{tour.agent_name}</p>
                </div>
              )}

              {tour?.agent_phone && (
                <div style={{ backgroundColor: THEME.surfaceAlt, padding: '16px', borderRadius: '12px', border: '1px solid ' + THEME.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: THEME.textSecondary }}>{t.phoneLabel}</p>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: THEME.textPrimary }}>{tour.agent_phone}</p>
                  </div>
                  <a href={`tel:${tour.agent_phone}`} style={{ ...btnStyle, backgroundColor: THEME.accent, color: '#fff', borderColor: THEME.accent, textDecoration: 'none', padding: '10px 18px', fontSize: '14px' }}>
                    {t.callBtn}
                  </a>
                </div>
              )}

              {tour?.agent_email && (
                <div style={{ backgroundColor: THEME.surfaceAlt, padding: '16px', borderRadius: '12px', border: '1px solid ' + THEME.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ overflow: 'hidden', paddingRight: '8px' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: THEME.textSecondary }}>{t.emailLabel}</p>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: THEME.textPrimary, textOverflow: 'ellipsis', overflow: 'hidden' }}>{tour.agent_email}</p>
                  </div>
                  <a href={`mailto:${tour.agent_email}`} style={{ ...btnStyle, backgroundColor: THEME.accent, color: '#fff', borderColor: THEME.accent, textDecoration: 'none', padding: '10px 18px', fontSize: '14px', flexShrink: 0 }}>
                    {t.emailBtn}
                  </a>
                </div>
              )}

              {tour?.agency_name && (
                <div style={{ backgroundColor: THEME.surfaceAlt, padding: '16px', borderRadius: '12px', border: '1px solid ' + THEME.border }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: THEME.textSecondary }}>{t.agencyLabel}</p>
                  <p style={{ margin: 0, fontSize: '17px', fontWeight: 'bold', color: THEME.textPrimary }}>{tour.agency_name}</p>
                </div>
              )}

              <button
                onClick={onShare}
                style={{
                  ...btnStyle,
                  backgroundColor: shareCopied ? THEME.success : THEME.surface,
                  color: shareCopied ? '#fff' : THEME.textPrimary,
                  borderColor: shareCopied ? THEME.success : THEME.border,
                  padding: '12px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {shareCopied ? t.linkCopied : t.shareTour}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Odgovor na izabrano pitanje, preko spiska pitanja. */
export function FaqAnswerModal({
  item,
  onClose,
  closeLabel,
  comingSoon
}: {
  item: FaqItem;
  onClose: () => void;
  closeLabel: string;
  comingSoon: string;
}) {
  return (
    <div className="tour-ui-scale" style={{ position: 'absolute', inset: 0, zIndex: 90, backgroundColor: THEME.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ backgroundColor: THEME.surface, border: '1px solid ' + THEME.border, borderRadius: '20px', width: '100%', maxWidth: '520px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: THEME.shadowLg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid ' + THEME.border }}>
          <h3 style={{ color: THEME.textPrimary, fontSize: '17px', margin: 0, paddingRight: '12px', fontWeight: 600 }}>
            {item.question}
          </h3>
          <button
            onClick={onClose}
            title={closeLabel}
            style={{ background: 'transparent', border: 'none', color: THEME.textMuted, fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', padding: '0 4px', lineHeight: '1', flexShrink: 0 }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, color: THEME.textPrimary, fontSize: '16px' }}>
          <p style={{ margin: 0, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
            {item.answer || comingSoon}
          </p>
        </div>
      </div>
    </div>
  );
}
