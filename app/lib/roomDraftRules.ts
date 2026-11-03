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
  'očaravajuć',
  // Iz pravih tura (2026-11-03): zvuče kao opis, a ne kažu ništa.
  'prostran',
  'sve neophodn',
  'sve potrebn',
  'potpuno opremljen',
  'funkcionaln',
  'praktično rešenje',
  'lep pogled'
] as const;

/** Prazne pohvale u tekstu (malim slovima), od početka reči. */
function praiseIn(lower: string): string[] {
  return EMPTY_PRAISE.filter((stem) => new RegExp(`(^|[^\\p{L}])${stem}`, 'u').test(lower));
}

/** Rečenice-definicije: kažu čemu služi bilo koja takva soba, ne ova. */
export const DEFINITION_PATTERNS = ['je mesto za', 'je prostor za', 'služi za', 'centralno mesto', 'povezuje sve prostorije'] as const;

/** Počeci koji zvuče kao čitanje spiska, a ne kao agent koji vodi. */
export const BANNED_OPENINGS = ['ovo je', 'nalazimo se', 'ovde je'] as const;

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
  const praise = praiseIn(lower);
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

export type DraftForCheck = {
  title?: string;
  narrationIntro: string;
  narrationDetail: string;
  waypoints: { title: string; text: string }[];
};

const firstWords = (text: string, n = 3) =>
  text
    .toLocaleLowerCase('sr')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, n)
    .join(' ');

/**
 * Provera celog AI nacrta sobe pre nego što ga admin vidi (spec §5). Vraća
 * probleme na srpskom; ruta ih šalje modelu za jedan prepis, a ono što
 * ostane prikazuje se u prozoru za pregled. Prazno = čisto.
 */
export function checkRoomDraft(draft: DraftForCheck, otherNarrations: string[]): string[] {
  const problems: string[] = [];
  const intro = draft.narrationIntro.trim();
  const detail = draft.narrationDetail.trim();

  if (!intro) problems.push('Uvod (prvi deo naracije) je prazan.');
  if (!detail) problems.push('Detalj (drugi deo naracije) je prazan.');
  if (intro.length > MAX_NARRATION_INTRO_CHARS) problems.push(`Uvod je predug (${intro.length}/${MAX_NARRATION_INTRO_CHARS}).`);
  if (detail.length > MAX_NARRATION_DETAIL_CHARS) problems.push(`Detalj je predug (${detail.length}/${MAX_NARRATION_DETAIL_CHARS}).`);

  const texts = [intro, detail, ...draft.waypoints.map((w) => w.text)];
  const lower = texts.join(' \n ').toLocaleLowerCase('sr');
  const praise = praiseIn(lower);
  if (praise.length) problems.push(`Prazna pohvala („${praise.join('", „')}") – reći šta se vidi.`);
  // Definicija je problem u naraciji sobe; u tački je "služi za obuću" baš ono što treba.
  const narration = `${intro} \n ${detail}`.toLocaleLowerCase('sr');
  const definitions = DEFINITION_PATTERNS.filter((p) => narration.includes(p));
  if (definitions.length) problems.push(`Rečenica-definicija („${definitions.join('", „')}") – reći šta je posebno u ovoj sobi.`);

  const start = intro.toLocaleLowerCase('sr');
  const title = draft.title?.trim().toLocaleLowerCase('sr');
  // Do kraja reči: "Ovde jednostavno..." nije "Ovde je".
  const opens = (o: string) => start.startsWith(o) && !/\p{L}/u.test(start.charAt(o.length));
  const badStart = BANNED_OPENINGS.find(opens) ?? (title && opens(`${title} je`) ? `${title} je` : null);
  if (badStart) problems.push(`Loš početak („${badStart}…") – počnite od kretanja ili od onoga što se prvo vidi.`);

  draft.waypoints.forEach((w, i) => {
    if (!w.title.trim()) problems.push(`Tačka ${i + 1} je bez naziva.`);
    if (w.text.trim().length > MAX_WAYPOINT_TEXT_CHARS) problems.push(`Tekst tačke ${i + 1} je predug.`);
    if (w.title.trim().split(/\s+/).length > MAX_WAYPOINT_TITLE_WORDS) problems.push(`Naziv tačke ${i + 1} je duži od ${MAX_WAYPOINT_TITLE_WORDS} reči.`);
  });

  const own = firstWords(intro);
  if (own && otherNarrations.some((n) => n.trim() && firstWords(n) === own)) {
    problems.push(`Uvod ima isti početak kao druga soba („${own}…") – posetilac ih čuje jednu za drugom.`);
  }
  return problems;
}
