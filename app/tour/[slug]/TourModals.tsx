import { useState } from 'react';
import { THEME, btnStyle } from './theme';
import {
  MODAL_ICONS,
  withoutEmoji,
  IconArea,
  IconBox,
  IconBrush,
  IconBuilding,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconElevator,
  IconExternal,
  IconFlame,
  IconGlobe,
  IconHome,
  IconInfo,
  IconMail,
  IconPhone,
  IconPin,
  IconPlan,
  IconQuestion,
  IconRooms,
  IconShare,
  IconStairs,
  IconText,
  IconTerrace,
  IconParking,
  IconWallet,
  IconDocument
} from './icons';
import { getLocalizedText, type FactKey, type FactRow } from './utils';
import { translations } from './translations';
import type { ActiveModal, Language, Room, Tour } from './types';
import { VIEWING_TEXT } from './ViewingRequestModal';
import { formatListingPrice } from '../../lib/listingPrice';
import { SITE_URL } from '../../lib/site';

/**
 * Modali ture: skica, lokacija, info, pitanja i kontakt. Sve je prikaz
 * podataka ture - nijedna odluka se ne donosi ovde, strana šalje gotove
 * vrednosti i rukovaoce.
 *
 * Izgled (odobren mockup "Donji moduli - bogatija verzija"): svako polje je
 * bela kartica sa plavim okvirom i plavom ikonicom, delovi su odvojeni plavim
 * naslovima, a glavna radnja stoji pri dnu prozora.
 */

type Labels = (typeof translations)[Language];

export type FaqItem = { question: string; answer: string };

// Plavi okviri kartica: svetliji za obična polja, pun plavi za glavno polje.
const FRAME = '#9DBBE3';
const BOX: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1.5px solid ' + FRAME,
  borderRadius: '18px',
  boxShadow: '0 6px 16px -10px rgba(30, 90, 168, 0.45)',
  minWidth: 0
};
const BOX_STRONG: React.CSSProperties = { ...BOX, borderColor: THEME.accent };

const CTA: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  background: THEME.accent,
  color: '#FFFFFF',
  border: 0,
  borderRadius: '999px',
  fontFamily: 'var(--font-urbanist), ' + THEME.fontDisplay,
  fontWeight: 700,
  fontSize: '15px',
  padding: '14px',
  cursor: 'pointer',
  textDecoration: 'none',
  boxShadow: '0 8px 20px -8px rgba(30, 90, 168, 0.7)'
};
const CTA_OUTLINE: React.CSSProperties = { ...CTA, background: '#FFFFFF', color: THEME.accent, border: '1.5px solid ' + THEME.accent, boxShadow: 'none' };

const FACT_ICONS: Record<FactKey, (p: { size?: number; color?: string }) => React.ReactElement> = {
  neighbourhood: IconBuilding,
  area: IconArea,
  structure: IconRooms,
  floor: IconStairs,
  elevator: IconElevator,
  basement: IconBox,
  heating: IconFlame,
  buildStatus: IconHome,
  finishStatus: IconBrush,
  terrace: IconTerrace,
  parking: IconParking,
  deposit: IconWallet,
  registration: IconDocument
};

/** Plavi kvadratić sa ikonicom, levo u kartici. */
function Chip({ children, solid = false }: { children: React.ReactNode; solid?: boolean }) {
  return (
    <span aria-hidden="true" style={{ width: '36px', height: '36px', borderRadius: '12px', background: solid ? THEME.accent : THEME.accentSoft, color: solid ? '#FFFFFF' : THEME.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {children}
    </span>
  );
}

/** Mali plavi naziv polja ("NASELJE") iznad vrednosti. */
const smallLabel: React.CSSProperties = { display: 'block', fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: THEME.accent };
const bigValue: React.CSSProperties = { display: 'block', fontFamily: 'var(--font-urbanist), ' + THEME.fontDisplay, fontSize: '16px', fontWeight: 700, color: THEME.textPrimary, marginTop: '2px', overflowWrap: 'break-word', hyphens: 'auto' };

/** Plavi naslov dela prozora sa linijom koja bledi udesno. */
function Section({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '20px 2px 10px', fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: THEME.accent }}>
      {icon}
      <span>{children}</span>
      <span aria-hidden="true" style={{ flex: 1, height: '1.5px', background: `linear-gradient(90deg, ${FRAME}, rgba(157, 187, 227, 0))` }} />
    </div>
  );
}

function FactCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ ...BOX, padding: '11px 12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
      <Chip>{icon}</Chip>
      <div style={{ minWidth: 0 }}>
        <span style={smallLabel}>{label}</span>
        <span style={bigValue}>{value}</span>
      </div>
    </div>
  );
}

/** Plavi naslov unutar bele kartice ("OPIS", "OSNOVNI PODACI"). */
const cardHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', padding: '13px 16px 4px', fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: THEME.accent };

/**
 * Samo ulica, bez kućnog broja: "Maglićka 12, Kragujevac" -> "Maglićka".
 * Tačan broj posetilac dobija od agenta, pred razgledanje.
 */
function streetOnly(address: string | null | undefined): string {
  const first = address?.split(',')[0]?.trim() || '';
  return first.replace(/\s+(bb|b\.b\.|\d+[a-zA-Z]?(\s*[/-]\s*\d+[a-zA-Z]?)?)$/i, '').trim();
}

// Na telefonu dve kolone, na računaru tri - uže kartice bi lomile reči.
const factGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(190px, 42%), 1fr))', gap: '8px' };

/**
 * Adresa i link "Otvori u Google mapama" iz linka mape. Mapa napravljena iz
 * adrese (lib/tourFromForm.ts) ima oblik ...maps?q=<adresa>&output=embed, pa
 * se iz nje čita adresa. Nalepljen "embed?pb=..." link nema adresu, ali ima
 * koordinate (!2d<dužina>!3d<širina>) - po njima se otvara ista tačka.
 */
function parseMapUrl(url: string): { address: string | null; openUrl: string | null } {
  const search = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  try {
    const u = new URL(url);
    const q = u.searchParams.get('q');
    if (q) return { address: q, openUrl: search(q) };
    const coords = url.match(/!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/);
    return { address: null, openUrl: coords ? search(`${coords[2]},${coords[1]}`) : null };
  } catch {
    return { address: null, openUrl: null };
  }
}

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
  onChangeRoom,
  onFloorplanClick,
  onShare,
  onRequestViewing,
  shareCopied
}: {
  activeModal: ActiveModal;
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
  // Pitanja: odgovor se otvara u istoj kartici; prvo je otvoreno odmah.
  const [openFaq, setOpenFaq] = useState<number | null>(0);
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

  const viewingCta = VIEWING_TEXT[lang]?.cta ?? VIEWING_TEXT.sr.cta;
  const phone = tour?.agent_phone || '';
  const email = tour?.agent_email || '';
  const price = formatListingPrice(tour?.price, tour?.category, lang);
  const categoryLabel = tour?.category === 'rent' ? t.catRent : tour?.category === 'sale' ? t.catSale : tour?.category === 'booking' ? t.catBooking : '';
  const city = tour?.city?.trim() || '';
  const neighbourhood = tour?.district?.trim() || '';
  const neighbourhoodLabel = factList.find((f) => f.key === 'neighbourhood')?.label;
  const map = tour?.location_map_url ? parseMapUrl(tour.location_map_url) : null;
  const street = streetOnly(tour?.address) || streetOnly(map?.address);

  // Info: kvadratura, struktura i sprat idu kao veliki brojevi u plavu karticu,
  // sve ostalo u jedan spisak.
  const KEY_FACTS: FactKey[] = ['area', 'structure', 'floor'];
  const keyFacts = KEY_FACTS.map((k) => factList.find((f) => f.key === k)).filter((f): f is FactRow => Boolean(f));
  const locationLine = [city, neighbourhood].filter(Boolean).join(' · ');
  const areaNum = Number(tour?.area_sqm);
  const priceNum = Number(tour?.price);
  const pricePerSqm =
    tour?.category === 'sale' && areaNum > 0 && priceNum > 0
      ? `${formatListingPrice(priceNum / areaNum, 'sale', lang)?.amount}/m²`
      : null;
  type SpecRow = { key: string; icon: React.ReactNode; label: string; value: string; tone?: 'yes' | 'no' };
  const toneOf = (v: string | null | undefined): SpecRow['tone'] => (v === 'Da' ? 'yes' : v === 'Ne' || v === 'Nema' ? 'no' : undefined);
  const TONE_SOURCE: Partial<Record<FactKey, string | null | undefined>> = {
    elevator: tour?.has_elevator,
    basement: tour?.has_basement,
    registration: tour?.registration,
    terrace: tour?.terrace,
    parking: tour?.parking
  };
  const specRows: SpecRow[] = [
    ...(city ? [{ key: 'city', icon: <IconGlobe size={18} />, label: t.cityLabel, value: city }] : []),
    ...(street ? [{ key: 'street', icon: <IconPin size={18} />, label: t.addressLabel, value: street }] : []),
    ...factList
      .filter((f) => !KEY_FACTS.includes(f.key))
      .map((f) => {
        const FactIcon = FACT_ICONS[f.key];
        const tone = toneOf(TONE_SOURCE[f.key]);
        return { key: f.key, icon: <FactIcon size={18} />, label: f.label, value: f.value, tone };
      })
  ];

  const empty = (text: string) => (
    <p style={{ textAlign: 'center', color: THEME.textMuted, fontSize: '16px' }}>{text}</p>
  );

  // Dugmad "Zakaži razgledanje" + poziv, pri dnu prozora (Info, Lokacija).
  const viewingButton = (outline: boolean) =>
    onRequestViewing && (
      <button type="button" onClick={onRequestViewing} style={{ ...(outline ? CTA_OUTLINE : CTA), flex: 1 }}>
        <IconCalendar size={18} />
        {viewingCta}
      </button>
    );

  let footer: React.ReactNode = null;
  if (activeModal === 'about' && (onRequestViewing || phone)) {
    footer = (
      <div style={{ display: 'flex', gap: '8px' }}>
        {viewingButton(false)}
        {phone && (
          <a href={`tel:${phone}`} aria-label={t.callBtn} title={t.callBtn} style={{ ...CTA_OUTLINE, width: '54px', padding: 0, flex: onRequestViewing ? 'none' : 1 }}>
            <IconPhone size={18} />
            {!onRequestViewing && t.callBtn}
          </a>
        )}
      </div>
    );
  }
  if (activeModal === 'location' && tour?.location_map_url && (map?.openUrl || onRequestViewing)) {
    footer = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {map?.openUrl && (
          <a href={map.openUrl} target="_blank" rel="noopener noreferrer" style={CTA}>
            <IconExternal size={17} />
            {t.openInMaps}
          </a>
        )}
        {viewingButton(Boolean(map?.openUrl))}
      </div>
    );
  }
  if (activeModal === 'faq' && faqList.length > 0 && (phone || email)) {
    footer = (
      <div style={{ ...BOX_STRONG, background: THEME.accentSoft, padding: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Chip solid><IconQuestion size={18} /></Chip>
          <div>
            <p style={{ margin: 0, fontFamily: 'var(--font-urbanist), ' + THEME.fontDisplay, fontWeight: 700, fontSize: '15px' }}>{t.faqMoreTitle}</p>
            <p style={{ margin: 0, fontSize: '13px', color: THEME.textSecondary }}>{t.faqMoreText}</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: phone && email ? '1fr 1fr' : '1fr', gap: '8px', marginTop: '12px' }}>
          {phone && <a href={`tel:${phone}`} style={{ ...CTA, padding: '12px', fontSize: '14px' }}><IconPhone size={16} />{t.callBtn}</a>}
          {email && <a href={`mailto:${email}`} style={{ ...CTA_OUTLINE, padding: '12px', fontSize: '14px' }}><IconMail size={16} />{t.emailShort}</a>}
        </div>
      </div>
    );
  }

  return (
    <div className="tour-ui-scale k360-modal-wrap" style={{ position: 'absolute', inset: 0, zIndex: 80, backgroundColor: THEME.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      {/* Na telefonu prozor izlazi odozdo kao list (zaobljen gore), na računaru je kartica u sredini. */}
      <style>{'@media (max-width: 720px){.k360-modal-wrap{align-items:flex-end!important;padding:0!important}.k360-modal{border-radius:30px 30px 0 0!important;max-height:88vh!important;border-left:0!important;border-right:0!important;border-bottom:0!important}}'}</style>
      <div className="k360-modal" style={{ background: 'linear-gradient(180deg, #E6EEF9 0px, #F6F8FC 130px)', border: '1px solid ' + THEME.border, borderRadius: '24px', width: '100%', maxWidth: activeModal === 'about' ? '900px' : '680px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: THEME.shadowLg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 6px' }}>
          <h2 style={{ color: THEME.accent, fontSize: '30px', margin: 0, fontWeight: 400, fontStyle: 'italic', letterSpacing: '-0.005em', fontFamily: 'var(--font-serif), Georgia, serif', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon size={22} color={THEME.accent} />
            {withoutEmoji(title)}
          </h2>
          <button
            onClick={onClose}
            title={t.close}
            style={{ background: '#FFFFFF', border: '1.5px solid ' + FRAME, color: THEME.accent, fontSize: '22px', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%', lineHeight: '1', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '10px 16px 20px', overflowY: 'auto', flex: 1, color: THEME.textPrimary, fontSize: '16px' }}>
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
                {/* Unutrašnji omotač je tačno veličine slike: oznake su u
                    procentima slike, a spoljni okvir je širi kad je skica
                    visoka - tada bi oznake stajale pomereno. */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '0 2px 12px' }}>
                  <Chip solid><IconPlan size={18} /></Chip>
                  <div>
                    <p style={{ margin: 0, fontFamily: 'var(--font-urbanist), ' + THEME.fontDisplay, fontWeight: 800, fontSize: '17px' }}>{t.planIntroTitle}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '13.5px', lineHeight: 1.45, color: THEME.textSecondary }}>{t.planIntroText}</p>
                  </div>
                </div>
                <div style={{ ...BOX_STRONG, padding: '10px', display: 'flex', justifyContent: 'center' }}>
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
                      style={{ maxWidth: '100%', maxHeight: '52vh', borderRadius: '10px', cursor: placeMode ? 'crosshair' : 'default', display: 'block' }}
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
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '12px', fontSize: '12.5px', fontWeight: 600, color: THEME.textSecondary }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><i style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#5B92D6' }} />{t.planHere}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><i style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', border: '2px solid #334155' }} />{t.planSeen}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><i style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(15,23,42,.55)', border: '2px solid #fff', boxShadow: '0 0 0 1px #D3D3CB' }} />{t.planNew}</span>
                </div>
              </div>
            ) : empty(t.noPlan)
          )}

          {activeModal === 'location' && (
            tour?.location_map_url ? (
              <div>
                <div style={{ ...BOX_STRONG, padding: 0, overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '300px' }}>
                    <iframe src={tour.location_map_url} width="100%" height="100%" style={{ border: 0, display: 'block' }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                  </div>
                  {street && (
                    <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1.5px solid ' + FRAME }}>
                      <Chip><IconPin size={18} /></Chip>
                      <div style={{ minWidth: 0 }}>
                        <span style={smallLabel}>{t.addressLabel}</span>
                        <span style={{ ...bigValue, fontSize: '15px' }}>{[street, city].filter(Boolean).join(', ')}</span>
                      </div>
                    </div>
                  )}
                </div>
                {(neighbourhood || city) && (
                  <div style={{ ...factGrid, marginTop: '10px' }}>
                    {neighbourhood && neighbourhoodLabel && <FactCard icon={<IconBuilding size={18} />} label={neighbourhoodLabel} value={neighbourhood} />}
                    {city && <FactCard icon={<IconGlobe size={18} />} label={t.cityLabel} value={city} />}
                  </div>
                )}
              </div>
            ) : empty(t.noLocation)
          )}

          {activeModal === 'about' && (
            factList.length > 0 || aboutText || price || city ? (
              <div className="k360-about">
                <style>{'.k360-about{display:grid;gap:12px;align-items:start}@media (min-width: 821px){.k360-about{grid-template-columns:1fr 1fr;grid-template-areas:"hero spec" "desc spec";gap:16px}.k360-about__hero{grid-area:hero}.k360-about__spec{grid-area:spec}.k360-about__desc{grid-area:desc}}'}</style>
                  {/* Glavna kartica: vrsta oglasa, gde je, cena i tri ključna broja. */}
                  {(price || categoryLabel || locationLine) && (
                    <div className="k360-about__hero" style={{ borderRadius: '20px', padding: '16px 16px 14px', background: `linear-gradient(135deg, ${THEME.accent} 0%, #2C6FC4 100%)`, color: '#FFFFFF', boxShadow: '0 10px 24px -12px rgba(30, 90, 168, 0.8)' }}>
                      {categoryLabel && (
                        <span style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#CFE0F5' }}>{categoryLabel}</span>
                      )}
                      {locationLine && (
                        <p style={{ margin: categoryLabel ? '8px 0 0' : 0, display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-urbanist), ' + THEME.fontDisplay, fontWeight: 700, fontSize: '15.5px' }}>
                          <IconPin size={16} color="#FFFFFF" />
                          {locationLine}
                        </p>
                      )}
                      {price && (
                        <p style={{ margin: '6px 0 0', display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'var(--font-urbanist), ' + THEME.fontDisplay, fontWeight: 800, fontSize: '32px', letterSpacing: '-0.02em' }}>{price.amount}</span>
                          {price.unit && <span style={{ fontSize: '14px', color: '#CFE0F5' }}>{price.unit}</span>}
                        </p>
                      )}
                      {pricePerSqm && <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#CFE0F5' }}>{pricePerSqm}</p>}
                      {keyFacts.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${keyFacts.length}, minmax(0, 1fr))`, marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.22)' }}>
                          {keyFacts.map((row, i) => (
                            <div key={row.key} style={{ textAlign: 'center', padding: '0 4px', minWidth: 0, borderLeft: i ? '1px solid rgba(255, 255, 255, 0.22)' : 'none' }}>
                              <span style={{ display: 'block', fontFamily: 'var(--font-urbanist), ' + THEME.fontDisplay, fontWeight: 800, fontSize: '20px', lineHeight: 1.1, overflowWrap: 'anywhere' }}>{row.value}</span>
                              <span style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#CFE0F5', marginTop: '3px' }}>{row.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                {/* Svi ostali podaci u JEDNOJ kartici: naziv levo, vrednost desno. */}
                {specRows.length > 0 && (
                  <div className="k360-about__spec" style={{ ...BOX, borderRadius: '20px' }}>
                    <div style={cardHead}><IconInfo size={14} />{t.secBasics}</div>
                    <ul style={{ listStyle: 'none', margin: 0, padding: '0 16px 6px' }}>
                      {specRows.map((row, i) => (
                        <li key={row.key} style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '11px 0', borderTop: i ? '1px solid #EDF1F7' : 'none' }}>
                          <span aria-hidden="true" style={{ display: 'flex', flexShrink: 0 }}>{row.icon}</span>
                          <span style={{ flex: 1, color: THEME.textSecondary, fontSize: '14px' }}>{row.label}</span>
                          <span style={{ fontFamily: 'var(--font-urbanist), ' + THEME.fontDisplay, fontWeight: 700, fontSize: '15.5px', textAlign: 'right', overflowWrap: 'anywhere', color: row.tone === 'yes' ? '#1E7A4C' : row.tone === 'no' ? '#9A9CA1' : THEME.textPrimary }}>
                            {row.tone === 'yes' ? '✓ ' : ''}{row.value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aboutText && (
                  <div className="k360-about__desc" style={{ ...BOX, borderRadius: '20px' }}>
                    <div style={cardHead}><IconText size={14} />{t.secDescription}</div>
                    <p style={{ margin: 0, padding: '4px 16px 16px', lineHeight: 1.6, color: '#2A2B30', whiteSpace: 'pre-wrap', fontSize: '15px' }}>{aboutText}</p>
                  </div>
                )}
              </div>
            ) : empty(t.noAbout)
          )}

          {activeModal === 'faq' && (
            faqList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {faqList.map((item, index) => {
                  const open = openFaq === index;
                  return (
                    <div key={index} style={{ ...(open ? BOX_STRONG : BOX), padding: 0 }}>
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setOpenFaq(open ? null : index)}
                        style={{ width: '100%', background: 'none', border: 0, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', font: 'inherit', color: THEME.textPrimary, cursor: 'pointer' }}
                      >
                        <span style={{ width: '30px', height: '30px', borderRadius: '10px', background: open ? THEME.accent : THEME.accentSoft, color: open ? '#FFFFFF' : THEME.accent, fontFamily: 'var(--font-urbanist), ' + THEME.fontDisplay, fontWeight: 800, fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span style={{ flex: 1, fontWeight: 650, fontSize: '15px', lineHeight: 1.35 }}>{item.question}</span>
                        <span style={{ display: 'flex', color: THEME.accent, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease' }}>
                          <IconChevronDown size={18} />
                        </span>
                      </button>
                      {open && (
                        <p style={{ margin: '0 14px 14px 56px', paddingLeft: '12px', borderLeft: '2px solid ' + FRAME, fontSize: '14.5px', lineHeight: 1.6, color: '#3A3B40', whiteSpace: 'pre-wrap' }}>
                          {item.answer || t.comingSoon}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : empty(t.noFaq)
          )}

          {activeModal === 'contact' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(tour?.agent_name || tour?.agency_name) && (
                <div style={{ ...BOX_STRONG, padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span aria-hidden="true" style={{ width: '56px', height: '56px', borderRadius: '50%', background: THEME.accent, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-urbanist), ' + THEME.fontDisplay, fontWeight: 800, fontSize: '20px', flexShrink: 0, boxShadow: '0 0 0 4px ' + THEME.accentSoft }}>
                    {initials(tour.agent_name || tour.agency_name || '')}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <span style={smallLabel}>{t.yourAgent}</span>
                    <p style={{ margin: '2px 0 0', fontFamily: 'var(--font-urbanist), ' + THEME.fontDisplay, fontSize: '17px', fontWeight: 700 }}>{tour.agent_name || tour.agency_name}</p>
                    {(tour.agent_name && tour.agency_name) || phone ? (
                      <p style={{ margin: '1px 0 0', fontSize: '13px', color: THEME.textSecondary }}>
                        {[tour.agent_name ? tour.agency_name : '', phone].filter(Boolean).join(' · ')}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Pločice: poziv (glavna, plava), e-mail, deljenje ture. */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${1 + (phone ? 1 : 0) + (email ? 1 : 0)}, minmax(0, 1fr))`, gap: '8px' }}>
                {phone && (
                  <a href={`tel:${phone}`} style={{ ...BOX_STRONG, background: THEME.accent, color: '#FFFFFF', padding: '12px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', fontFamily: 'var(--font-urbanist), ' + THEME.fontDisplay, fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}>
                    <span style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconPhone size={18} /></span>
                    {t.callBtn}
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} style={{ ...BOX, padding: '12px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', fontFamily: 'var(--font-urbanist), ' + THEME.fontDisplay, fontWeight: 700, fontSize: '13px', color: THEME.textPrimary, textDecoration: 'none' }}>
                    <Chip><IconMail size={18} /></Chip>
                    {t.emailShort}
                  </a>
                )}
                <button
                  type="button"
                  onClick={onShare}
                  style={{ ...BOX, borderColor: shareCopied ? THEME.success : FRAME, padding: '12px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', fontFamily: 'var(--font-urbanist), ' + THEME.fontDisplay, fontWeight: 700, fontSize: '13px', color: shareCopied ? THEME.success : THEME.textPrimary, cursor: 'pointer' }}
                >
                  <Chip>{shareCopied ? <IconCheck size={18} /> : <IconShare size={18} />}</Chip>
                  {withoutEmoji(shareCopied ? t.linkCopied : t.shareTour)}
                </button>
              </div>

              {/* Glavna radnja: zahtev za termin - posetilac koji ne želi da
                  zove odmah ostavlja kontakt, a agent zove kad može. */}
              {onRequestViewing && (
                <>
                  <Section icon={<IconCalendar size={14} />}>{t.viewingLive}</Section>
                  <div style={{ ...BOX, padding: '16px', background: 'linear-gradient(180deg, #FFFFFF 0%, #F1F6FD 100%)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '14px', color: '#2A2B30' }}>
                      {[t.viewingStep1, t.viewingStep2, t.viewingStep3].map((step) => (
                        <span key={step} style={{ display: 'flex', gap: '9px', alignItems: 'center', color: '#2A2B30' }}>
                          <IconCheck size={16} color={THEME.accent} />
                          {step}
                        </span>
                      ))}
                    </div>
                    <button type="button" onClick={onRequestViewing} style={{ ...CTA, width: '100%', marginTop: '14px' }}>
                      <IconCalendar size={18} />
                      {viewingCta}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tiho potpisivanje: ko je pravio turu, za posetioca koga to zanima. */}
          <a
            href={`${SITE_URL}/?utm_source=tura&utm_medium=potpis&utm_campaign=${encodeURIComponent(tour?.slug ?? '')}`}
            target="_blank"
            rel="noopener"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginTop: '22px', fontSize: '11.5px', color: '#9A9CA1', textDecoration: 'none' }}
          >
            {t.tourBy}
            <svg aria-hidden="true" width="11" height="11" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M14 2 L26 14 L14 26 L2 14 Z" /></svg>
            <b style={{ fontFamily: 'var(--font-urbanist), ' + THEME.fontDisplay, fontWeight: 700 }}>Kvadrat360</b>
          </a>
        </div>

        {footer && (
          <div style={{ padding: '12px 16px calc(16px + env(safe-area-inset-bottom))', borderTop: '1px solid ' + THEME.border, background: '#F6F8FC' }}>
            {footer}
          </div>
        )}
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
