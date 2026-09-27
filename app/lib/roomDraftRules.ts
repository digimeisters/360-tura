/**
 * Pravila za tekst sobe (naziv, uvodna naracija, info-tačke) na jednom
 * mestu: po njima AI piše draft (app/api/ai/auto-populate-room), po njima ga
 * lektor proverava, i po njima prozor za pregled drafta u admin režimu
 * (TourAdminTools.tsx) broji znakove i pali upozorenja dok se kuca.
 * Bez uvoza - koristi ga i pregledač.
 */

// Tekst tačke ide u mali tooltip u panorami, pa dužina mora da bude
// ograničena već u generisanju - posle je kasno, admin bi morao ručno da
// skraćuje svaku tačku.
export const MAX_WAYPOINTS = 4;
export const MAX_WAYPOINT_TITLE_WORDS = 3;
export const MAX_WAYPOINT_TEXT_CHARS = 180;

// Uvodna naracija je podeljena na dva dela koja se čitaju jedan za drugim:
// prvo namena sobe, pa nešto specifično za nju.
export const MAX_NARRATION_INTRO_CHARS = 140;
export const MAX_NARRATION_DETAIL_CHARS = 220;

/**
 * Prazne pohvale: ne govore ništa o stanu, a u glasu zvuče kao reklama.
 * Poredi se po početku reči, pa "idealan" hvata i "idealna", "idealno".
 */
export const EMPTY_PRAISE = [
  'idealn',
  'savršen',
  'maksimaln',
  'luksuz',
  'jedinstven',
  'fantastič',
  'neverovatn',
  'prelep',
  'očaravajuć'
] as const;

/** Oznake koje glas (TTS) čita loše, pa ih treba napisati rečima. */
const TTS_TRAPS: { pattern: RegExp; hint: string }[] = [
  { pattern: /m²|m2\b/i, hint: '„m²" napišite rečima („kvadrata"), da ga glas izgovori pravilno' },
  { pattern: /\d+\s*%/, hint: 'procenat napišite rečima („trideset odsto")' },
  { pattern: /\b(npr|tj|itd|kv|br)\./i, hint: 'skraćenicu napišite celom rečju – glas je čita slovo po slovo' }
];

export type DraftFieldKind = 'intro' | 'detail' | 'wpTitle' | 'wpText';

export type FieldCheck = {
  /** "118/140" ili "2/3 reči" - šta brojač pokazuje. */
  count: string;
  over: boolean;
  warnings: string[];
};

function limitFor(kind: DraftFieldKind): { max: number; words: boolean } {
  switch (kind) {
    case 'intro':
      return { max: MAX_NARRATION_INTRO_CHARS, words: false };
    case 'detail':
      return { max: MAX_NARRATION_DETAIL_CHARS, words: false };
    case 'wpTitle':
      return { max: MAX_WAYPOINT_TITLE_WORDS, words: true };
    case 'wpText':
      return { max: MAX_WAYPOINT_TEXT_CHARS, words: false };
  }
}

/** Brojač i upozorenja za jedno polje - bez AI-ja, računa se dok se kuca. */
export function checkDraftField(kind: DraftFieldKind, text: string): FieldCheck {
  const value = text.trim();
  const { max, words } = limitFor(kind);
  const used = words ? value.split(/\s+/).filter(Boolean).length : value.length;
  const warnings: string[] = [];

  if (!value) warnings.push('Polje je prazno.');

  const lower = value.toLocaleLowerCase('sr');
  const praise = EMPTY_PRAISE.filter((stem) => new RegExp(`(^|[^\\p{L}])${stem}`, 'u').test(lower));
  if (praise.length) {
    warnings.push(`Prazna pohvala („${praise.map((p) => `${p}…`).join('", „')}") – zamenite onim što se vidi.`);
  }

  // Naziv tačke se ne izgovara, pa ga zamke za glas ne tiču.
  if (kind !== 'wpTitle') {
    for (const trap of TTS_TRAPS) if (trap.pattern.test(value)) warnings.push(trap.hint);
  }

  if (kind === 'wpTitle' && /[.!]$/.test(value)) warnings.push('Naziv tačke bez tačke na kraju.');

  return {
    count: words ? `${used}/${max} reči` : `${used}/${max}`,
    over: used > max,
    warnings
  };
}
