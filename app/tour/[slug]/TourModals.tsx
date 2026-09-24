import { useState } from 'react';
import { THEME, btnStyle } from './theme';
import { MODAL_ICONS, withoutEmoji } from './icons';
import { getLocalizedText, type FactRow } from './utils';
import { translations } from './translations';
import type { ActiveModal, Language, Room, Tour } from './types';
import { VIEWING_TEXT } from './ViewingRequestModal';

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
  seenRoomIds,
  lang,
  adminMode,
  aboutText,
  factList,
  faqList,
  onSelectFaq,
  onChangeRoom,
  onFloorplanClick,
  onShare,
  onRequestViewing,
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
  /** Sobe koje je posetilac već video - tačke na skici to pokazuju kao na mini skici. */
  seenRoomIds: Set<string>;
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
  /** Otvara formu "Zakaži razgledanje" - null kad je tura nema (admin, nepoznata tura). */
  onRequestViewing: (() => void) | null;
  shareCopied: boolean;
}) {
  // Admin: postavljanje oznake na skicu tek posle klika na dugme.
  const [placing, setPlacing] = useState(false);
  if (!activeModal) return null;

  const schematic = Boolean(tour?.floorplan_url?.includes('/floorplan-schematic.svg'));
  const placeMode = adminMode && !schematic && placing;

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
    <div className="tour-ui-scale k360-modal-wrap" style={{ position: 'absolute', inset: 0, zIndex: 80, backgroundColor: THEME.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      {/* Na telefonu prozor izlazi odozdo kao list (zaobljen gore), na računaru je kartica u sredini. */}
      <style>{'@media (max-width: 720px){.k360-modal-wrap{align-items:flex-end!important;padding:0!important}.k360-modal{border-radius:30px 30px 0 0!important;max-height:88vh!important;border-left:0!important;border-right:0!important;border-bottom:0!important}}'}</style>
      <div className="k360-modal" style={{ backgroundColor: THEME.surface, border: '1px solid ' + THEME.border, borderRadius: '24px', width: '100%', maxWidth: '680px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: THEME.shadowLg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid ' + THEME.border }}>
          <h2 style={{ color: THEME.accent, fontSize: '30px', margin: 0, fontWeight: 400, fontStyle: 'italic', letterSpacing: '-0.005em', fontFamily: 'var(--font-serif), Georgia, serif', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon size={22} color={THEME.accent} />
            {withoutEmoji(title)}
          </h2>
          <button
            onClick={onClose}
            title={t.close}
            style={{ background: THEME.surfaceAlt, border: 'none', color: THEME.textSecondary, fontSize: '22px', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%', lineHeight: '1', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, color: THEME.textPrimary, fontSize: '16px' }}>
          {activeModal === 'plan' && (
            tour?.floorplan_url ? (
              <div>
                {/* Admin: šematski plan se uređuje u editoru; na pravom
                    tlocrtu oznaka se postavlja tek posle klika na dugme -
                    inače bi svaki klik po skici (i kad je admin samo
                    razgleda turu kao posetilac) pomerio oznaku. */}
                {adminMode && schematic && (
                  <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: THEME.textMuted, textAlign: 'center' }}>
                    Admin: oznake i raspored menjate u{' '}
                    <a href={`/admin/plan/${tour.slug}`} style={{ color: THEME.accent, fontWeight: 600 }}>editoru plana</a>.
                  </p>
                )}
                {adminMode && !schematic && (
                  <div style={{ margin: '0 0 12px 0', textAlign: 'center' }}>
                    {placing ? (
                      <p style={{ margin: 0, fontSize: '13px', color: THEME.accent, fontWeight: 600 }}>
                        🖊️ Klikni na skicu gde je soba: <b>{currentRoomTitle}</b>{' '}
                        <button type="button" onClick={() => setPlacing(false)} style={{ ...btnStyle, padding: '2px 10px', fontSize: '12px', marginLeft: '6px' }}>
                          Otkaži
                        </button>
                      </p>
                    ) : (
                      <button type="button" onClick={() => setPlacing(true)} style={{ ...btnStyle, padding: '5px 12px', fontSize: '13px' }}>
                        🖊️ Postavi oznaku za: {currentRoomTitle}
                      </button>
                    )}
                  </div>
                )}
                {/* Unutrašnji omotač je tačno veličine slike: oznake su u
                    procentima slike, a spoljni okvir je širi kad je skica
                    visoka - tada bi oznake stajale pomereno. */}
                {/* Tačke kao na mini skici (računar): plava pulsira = ovde ste,
                    bela = viđeno, tamna = još niste bili. Malo veće za prst. */}
                <style>{`
                  .k360-plan-dot { position: absolute; transform: translate(-50%, -50%); padding: 0; cursor: pointer; border-radius: 50%;
                    width: 16px; height: 16px; border: 2.5px solid #fff; background: rgba(15, 23, 42, 0.55);
                    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.35); transition: transform 0.15s ease; }
                  .k360-plan-dot::before { content: ''; position: absolute; inset: -12px; border-radius: 50%; }
                  .k360-plan-dot:hover { transform: translate(-50%, -50%) scale(1.25); }
                  .k360-plan-dot[data-state="seen"] { background: #fff; border-color: #334155; }
                  .k360-plan-dot[data-state="current"] { width: 20px; height: 20px; background: #5B92D6; border-color: #fff; z-index: 1; }
                  .k360-plan-dot[data-state="current"]::after { content: ''; position: absolute; inset: -8px; border-radius: 50%;
                    border: 2.5px solid #5B92D6; animation: k360PlanPulse 1.8s ease-out infinite; }
                  @keyframes k360PlanPulse { from { transform: scale(0.6); opacity: 1; } to { transform: scale(1.6); opacity: 0; } }
                  @media (prefers-reduced-motion: reduce) { .k360-plan-dot[data-state="current"]::after { animation: none; } }
                `}</style>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{ position: 'relative', lineHeight: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={tour.floorplan_url}
                      alt="Floorplan"
                      onClick={
                        placeMode
                          ? (e) => {
                              onFloorplanClick(e);
                              setPlacing(false);
                            }
                          : undefined
                      }
                      style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '12px', cursor: placeMode ? 'crosshair' : 'default', display: 'block' }}
                    />
                    {rooms
                      .filter((r) => typeof r.floorplan_x === 'number' && typeof r.floorplan_y === 'number')
                      .map((r) => {
                        const isCurrent = r.id === currentRoom?.id;
                        const state = isCurrent ? 'current' : seenRoomIds.has(String(r.id)) ? 'seen' : 'unseen';
                        const name = getLocalizedText(r.title_i18n, lang);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            className="k360-plan-dot"
                            data-state={state}
                            title={name}
                            aria-label={name}
                            aria-current={isCurrent ? 'location' : undefined}
                            onClick={(e) => {
                              e.stopPropagation();
                              onChangeRoom(r.id);
                              onClose();
                            }}
                            style={{ left: `${r.floorplan_x}%`, top: `${r.floorplan_y}%` }}
                          />
                        );
                      })}
                  </div>
                </div>
                {/* Legenda: šta znači koja tačka. */}
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '14px', fontSize: '12.5px', fontWeight: 600, color: THEME.textSecondary }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><i style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#5B92D6' }} />{t.planHere}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><i style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', border: '2px solid #334155' }} />{t.planSeen}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><i style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(15,23,42,.55)', border: '2px solid #fff', boxShadow: '0 0 0 1px #D3D3CB' }} />{t.planNew}</span>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
                    {factList.map((row) => (
                      <div
                        key={row.label}
                        style={{ background: THEME.surface, border: '1px solid ' + THEME.border, borderRadius: '16px', padding: '12px 14px', minWidth: 0 }}
                      >
                        <span style={{ display: 'block', color: THEME.textMuted, fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{row.label}</span>
                        <span style={{ display: 'block', color: THEME.textPrimary, fontFamily: THEME.fontDisplay, fontSize: '16.5px', fontWeight: 700, marginTop: '3px', overflowWrap: 'anywhere' }}>{row.value}</span>
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
              <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid ' + THEME.borderStrong }}>
                {faqList.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => onSelectFaq(index)}
                    style={{
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      borderTop: '1px solid ' + THEME.borderStrong,
                      padding: '15px 2px',
                      color: THEME.textPrimary,
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      width: '100%',
                      lineHeight: '1.4',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <span>{item.question}</span>
                    <span aria-hidden="true" style={{ color: THEME.accent, fontSize: '20px', fontWeight: 500, flexShrink: 0 }}>+</span>
                  </button>
                ))}
              </div>
            ) : empty(t.noFaq)
          )}

          {activeModal === 'contact' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px' }}>
              {/* Glavna radnja u kontaktu: zahtev za termin, ne samo broj
                  telefona - posetilac koji ne želi da zove odmah ostavlja
                  kontakt, a agent zove kad može. */}
              {onRequestViewing && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={onRequestViewing}
                    style={{ ...btnStyle, width: '100%', backgroundColor: THEME.accent, color: '#fff', borderColor: THEME.accent, borderRadius: '999px', padding: '13px', fontSize: '15px', fontWeight: 700 }}
                  >
                    📅 {VIEWING_TEXT[lang]?.cta ?? VIEWING_TEXT.sr.cta}
                  </button>
                  <p style={{ margin: 0, fontSize: '12.5px', color: THEME.textSecondary, textAlign: 'center' }}>
                    {VIEWING_TEXT[lang]?.ctaHint ?? VIEWING_TEXT.sr.ctaHint}
                  </p>
                </div>
              )}

              {(tour?.agent_name || tour?.agency_name) && (
                <div style={{ background: '#111113', color: '#FFFFFF', borderRadius: '22px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span aria-hidden="true" style={{ width: '52px', height: '52px', borderRadius: '50%', background: THEME.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: '19px', flexShrink: 0 }}>
                    {initials(tour.agent_name || tour.agency_name || '')}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    {tour.agent_name && (
                      <p style={{ margin: 0, fontFamily: THEME.fontDisplay, fontSize: '17px', fontWeight: 700 }}>{tour.agent_name}</p>
                    )}
                    {tour.agency_name && (
                      <p style={{ margin: tour.agent_name ? '2px 0 0' : 0, fontSize: tour.agent_name ? '13.5px' : '17px', fontWeight: tour.agent_name ? 500 : 700, color: tour.agent_name ? '#A8A9AE' : '#FFFFFF' }}>{tour.agency_name}</p>
                    )}
                    {tour.agent_phone && (
                      <p style={{ margin: '2px 0 0', fontSize: '13.5px', color: '#A8A9AE' }}>{tour.agent_phone}</p>
                    )}
                  </div>
                </div>
              )}

              {(tour?.agent_phone || tour?.agent_email) && (
                <div style={{ display: 'grid', gridTemplateColumns: tour.agent_phone && tour.agent_email ? '1fr 1fr' : '1fr', gap: '8px' }}>
                  {tour.agent_phone && (
                    <a href={`tel:${tour.agent_phone}`} style={{ ...btnStyle, backgroundColor: THEME.accent, color: '#fff', borderColor: THEME.accent, textDecoration: 'none', padding: '13px', fontSize: '15px', fontWeight: 700, borderRadius: '999px', textAlign: 'center' }}>
                      {t.callBtn}
                    </a>
                  )}
                  {tour.agent_email && (
                    <a href={`mailto:${tour.agent_email}`} style={{ ...btnStyle, backgroundColor: THEME.surfaceAlt, color: THEME.textPrimary, borderColor: THEME.surfaceAlt, boxShadow: 'none', textDecoration: 'none', padding: '13px', fontSize: '15px', fontWeight: 700, borderRadius: '999px', textAlign: 'center' }}>
                      {t.emailBtn}
                    </a>
                  )}
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
            style={{ background: THEME.surfaceAlt, border: 'none', color: THEME.textSecondary, fontSize: '22px', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%', lineHeight: '1', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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

/** Inicijali za krug u kartici agenta: "Marko Marković" -> "MM", "Immoblick Wien" -> "IW". */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}
