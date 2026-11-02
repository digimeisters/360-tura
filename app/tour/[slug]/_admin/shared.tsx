'use client';

import { Language, Waypoint, Room, Tour } from '../types';
import { THEME } from '../theme';
import { parseWaypoints, parseEstablish } from '../utils';
import { checkDraftField, type DraftFieldKind } from '../../../lib/roomDraftRules';

/** Zajedničko za admin alate ture (TourAdminTools i _admin/*). */

export const AVAILABLE_LANGUAGES: Language[] = ['sr', 'en', 'de', 'ru'];

export type AiDraft = { title: string; narrationIntro: string; narrationDetail: string; waypoints: Waypoint[] };

/** Odgovor "Proveri i ispravi" (review_draft u /api/ai/auto-populate-room). */
export type ReviewField = 'title' | 'intro' | 'detail' | 'wpTitle' | 'wpText';
export type ReviewSuggestion = { field: ReviewField; index: number; original: string; suggested: string; reason: string };
export type ReviewCheck = { field: ReviewField; index: number; message: string };
export type DraftReview = { suggestions: ReviewSuggestion[]; checks: ReviewCheck[] };

export const REVIEW_FIELD_LABEL: Record<ReviewField, string> = {
  title: 'Naziv sobe',
  intro: 'Uvod – namena',
  detail: 'Uvod – detalj',
  wpTitle: 'Naslov tačke',
  wpText: 'Tekst tačke'
};

export function reviewTargetLabel(field: ReviewField, index: number): string {
  return field === 'wpTitle' || field === 'wpText'
    ? `${REVIEW_FIELD_LABEL[field]} ${index + 1}`
    : REVIEW_FIELD_LABEL[field];
}

/**
 * Brojač znakova i upozorenja ispod polja drafta - računa se dok se kuca,
 * bez AI-ja (pravila su u lib/roomDraftRules.ts). Crveno = preko granice,
 * žuto = upozorenje; napomene AI provere za to polje idu odmah ispod.
 */
export function FieldHint({ kind, text, checks = [] }: { kind: DraftFieldKind; text: string; checks?: string[] }) {
  const c = checkDraftField(kind, text);
  const lines = [...c.warnings, ...checks];
  return (
    <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '11px', fontWeight: 700, color: c.over ? '#dc2626' : THEME.textMuted, alignSelf: 'flex-end' }}>
        {c.count}
        {c.over && ' · predugačko'}
      </span>
      {lines.map((w) => (
        <span key={w} style={{ fontSize: '11px', color: '#92400e', background: '#fef3c7', borderRadius: '6px', padding: '3px 7px' }}>
          ⚠ {w}
        </span>
      ))}
    </div>
  );
}

export type TourAdminToolsProps = {
  /** 'full' = dugmad u traci i modali; 'empty' = samo dugme za prvu sobu. */
  variant: 'full' | 'empty';
  slug: string;
  tour: Tour | null;
  setTour: React.Dispatch<React.SetStateAction<Tour | null>>;
  rooms: Room[];
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  roomIdx: number;
  setRoomIdx: (index: number) => void;
  lang: Language;
  langRef: React.MutableRefObject<Language>;
  refreshViewerHotspots: (waypoints: Waypoint[], l: Language) => void;
  /** Soba je napravljena - tura mora da se pokrene i greška da nestane. */
  onRoomCreated: () => void;
  /**
   * Mesto u gornjoj traci ture gde idu admin dugmad. Dugmad se crtaju kroz
   * portal, jer traka pripada page.tsx, a stanje koje dugmad pokreću (draft,
   * napredak prevoda...) mora da bude na istom mestu kao i modali.
   */
  toolbarSlot: HTMLElement | null;
};

export const toolbarButtonStyle: React.CSSProperties = {
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  padding: '4px 8px',
  fontSize: '11px',
  fontWeight: 'bold',
  cursor: 'pointer',
  marginRight: '6px'
};

// Da li soba već ima sadržaj za dati jezik - modal za dodavanje jezika po
// tome pokazuje šta je već prevedeno, a šta nedostaje.
export function roomHasLanguageContent(room: Room | undefined, l: Language): boolean {
  if (!room) return false;

  const checkI18n = (data: unknown): boolean => {
    if (!data) return false;
    if (typeof data === 'object') return Boolean((data as Record<string, string>)[l]);
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return Boolean(parsed && parsed[l]);
      } catch {
        return false;
      }
    }
    return false;
  };

  if (checkI18n(room.title_i18n)) return true;

  const establishData = parseEstablish(room.establish_i18n);
  if (checkI18n(establishData.intro_i18n) || checkI18n(establishData.detail_i18n) || checkI18n(establishData.text_i18n)) {
    return true;
  }

  const waypoints = parseWaypoints(room.waypoints_i18n);
  for (const wp of waypoints) {
    if (checkI18n(wp.text_i18n) || checkI18n(wp.title_i18n)) return true;
  }

  return false;
}
