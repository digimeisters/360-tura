/**
 * Uputstva za AI popunu sobe i plan obilaska ture (spec:
 * docs/superpowers/specs/2026-11-03-ai-tekst-soba-design.md §3-4). Samo
 * tekst i čiste funkcije - Gemini poziv je u
 * app/api/ai/auto-populate-room/_actions. Bez uvoza paketa, zbog node testova.
 */

import {
  MAX_NARRATION_DETAIL_CHARS,
  MAX_NARRATION_INTRO_CHARS,
  MAX_WAYPOINT_TEXT_CHARS,
  MAX_WAYPOINT_TITLE_WORDS,
  MAX_WAYPOINTS
} from './roomDraftRules.ts';
import { isOffLimitsFact } from './roomAiContext.ts';

export type ListingType = 'sale' | 'rent' | 'booking';
export const LISTING_TYPES: ListingType[] = ['sale', 'rent', 'booking'];

/**
 * Sve što model treba da zna o sobi a ne vidi na slici. Bez ovoga je dobijao
 * samo panoramu i vezu sa drugim sobama izmišljao.
 */
export type RoomContext = {
  listingType: ListingType;
  /** Naziv koji je admin već dao sobi (prazno ako je soba neimenovana). */
  roomTitle: string;
  /** Podaci o nekretnini koje soba sme da pomene (roomFactsFromTour). */
  facts: string[];
  /** Opis iz oglasa (about_text_i18n, sr) - samo kao izvor činjenica. */
  listingText: string;
  /** Napomene vlasnika za celu turu i za ovu sobu (tour_ai_notes). */
  tourNotes: string;
  roomNote: string;
  /** Soba iz koje posetilac dolazi po redu obilaska (prazno na početku). */
  previousRoomTitle: string;
  /** Mesto sobe u obilasku, od 0; -1 kad nije poznato. */
  visitIndex: number;
  /** Ostale sobe redom obilaska, sa već napisanom naracijom. */
  otherRooms: { title: string; narration: string }[];
};

/** Iz plana ture (plan_tour): šta ova soba priča i kako se u nju ulazi. */
export type TourPlanEntry = { role: string; transition: string; facts: string[] };

/** Kome se soba obraća i šta ga zanima - po tipu oglasa (spec §4). */
export function clientAngle(listingType: ListingType): string {
  switch (listingType) {
    case 'sale':
      return [
        'THE VISITOR: a potential BUYER.',
        'They care about: condition and quality of what they see, what they would or would not have to change',
        'after buying, natural light, the layout that is visible, storage, and long-term comfort.'
      ].join('\n');
    case 'rent':
      return [
        'THE VISITOR: a potential long-term TENANT.',
        'They care about: everyday use, what is already in the property (furniture, appliances), storage,',
        'upkeep, and comfort of living here day to day.'
      ].join('\n');
    case 'booking':
      return [
        'THE VISITOR: a short-stay GUEST.',
        'They care about: how the stay will feel, what is within reach (bed, shower, kitchen basics, a place',
        'to sit outside), rest and convenience.'
      ].join('\n');
  }
}

const bullets = (items: string[], empty: string) => (items.length ? items.map((f) => `- ${f}`).join('\n') : `- ${empty}`);

/** Uputstvo za jednu sobu: glas agenta koji vodi, iz slike + podataka + napomena. */
export function buildDraftPrompt(ctx: RoomContext, plan?: TourPlanEntry): string {
  const others = ctx.otherRooms.length
    ? ctx.otherRooms.map((r) => `- ${r.title || '(unnamed)'}${r.narration ? `: "${r.narration}"` : ''}`).join('\n')
    : '- (none yet)';
  const titleRule = ctx.roomTitle
    ? `The admin already named this room "${ctx.roomTitle}". Return exactly that as title_i18n.sr.`
    : 'The room has no name yet - give it a short, plain Serbian name (e.g. "Dnevna soba", "Kupatilo").';
  const where = ctx.previousRoomTitle
    ? `The visitor has just come from: ${ctx.previousRoomTitle}.`
    : ctx.visitIndex === 0
      ? 'This is the first room of the tour.'
      : 'The previous room is not known - do not invent where the visitor came from.';
  const planBlock = plan
    ? [
        '',
        'THIS ROOM IN THE TOUR PLAN:',
        `- Its job in the story: ${plan.role || '(not set)'}`,
        `- Transition idea from the previous room: ${plan.transition || '(none)'}`,
        '- Facts that belong HERE (use only if they fit naturally):',
        bullets(plan.facts, '(none)'),
        ''
      ].join('\n')
    : '';
  const notes = [ctx.tourNotes && `For the whole property:\n${ctx.tourNotes}`, ctx.roomNote && `For THIS room:\n${ctx.roomNote}`]
    .filter(Boolean)
    .join('\n');

  return `
You are a real estate agent from Kragujevac, standing next to the visitor and walking them through the
property. You are writing the spoken voice-over for ONE room of a 360° virtual tour. Analyze this
equirectangular 360° panorama image.

${clientAngle(ctx.listingType)}

VOICE:
- Natural spoken Serbian, Latin script. Address the visitor with "vi" (lowercase). Short sentences that
  are easy to say out loud. No advertising tone. Include ONLY the 'sr' key.
- Never start the intro with "Ovo je", "Nalazimo se", "Ovde je" or with the room name followed by "je".
  Start from movement or from what catches the eye ("Iz hodnika...", "Levo od ulaza...", "Prvo što primetite...").

THIS ROOM: ${titleRule}
${where}
${planBlock}
WHAT YOU KNOW ABOUT THE PROPERTY (reliable; so you never contradict it - do not list it):
${bullets(ctx.facts, '(no data)')}

FROM THE LISTING TEXT (use only as facts, never copy its praise words):
${ctx.listingText || '(none)'}

OWNER'S NOTES (true facts that the image may not show):
${notes || '(none)'}
- Use a note only in the room where it belongs, phrased for this visitor. Never add facts that are not in
  the notes, the property data or the image.

OTHER ROOMS IN THIS TOUR, in visiting order, with narration already written:
${others}
- Do not reuse their openings or sentence patterns - the visitor hears them one after another.

GROUNDING - THE MOST IMPORTANT RULE:
- Say only what is clearly visible in this image, stated in the property data, or in the owner's notes.
- NEVER claim: sizes or "prostran/prostrano", age or year of renovation (unless in the notes), brands,
  exact materials or wood species you cannot be sure of, compass direction, noise or quiet, smells, what
  is outside the frame or behind closed doors, or a layout you do not see.
- NO INFERENCE: do not claim what an object does for the whole property, that there are no extra costs,
  that something stays or is included (unless the notes say so, or the property is furnished and it is
  furniture in view), or that a view is nice. Describe, then give one practical consequence that is
  certainly true.
- Money, lease terms, house rules, parking and the neighbourhood are shown elsewhere in the tour - do not
  mention them in a room.
- No empty praise: idealan, savršen, maksimalan, luksuzan, jedinstven, prelep, sve neophodno, sve potrebno,
  potpuno opremljen, funkcionalan.

INTRO NARRATION - TWO PARTS, PLAYED BACK TO BACK:
- narration_intro_i18n (max ${MAX_NARRATION_INTRO_CHARS} chars): orient the visitor - what they are looking
  at and the one thing that matters about it for THIS visitor. Never a definition ("Kupatilo je mesto za...",
  "služi za", "centralno mesto", "povezuje sve prostorije").
- narration_detail_i18n (max ${MAX_NARRATION_DETAIL_CHARS} chars): one concrete thing you SEE and what it
  means in daily use ("..., pa ...", "..., što znači da ..."). No waypoint repeats it.

WAYPOINTS (0-${MAX_WAYPOINTS}):
- Only where the visitor learns something that is not obvious at first glance or that matters for the
  decision (an appliance, storage, a window, the shower, something from the owner's notes). Skip obvious
  things (a toilet cistern, a light switch, an unremarkable wall). Zero waypoints is a correct answer.
- title_i18n: REQUIRED, 1-${MAX_WAYPOINT_TITLE_WORDS} words, no trailing period.
- text_i18n (max ${MAX_WAYPOINT_TEXT_CHARS} chars): what it is + why it matters for this visitor.
- box_2d = [ymin, xmin, ymax, xmax], integers 0-1000, normalized to the image height and width, drawn
  TIGHTLY around the object. If you cannot point at it precisely, do not create that waypoint.
- Each waypoint is a different object in a different place. NEVER on doors, hallways, stairs or exits.

- Output valid JSON matching the schema.
`;
}

/** Drugi pokušaj: isto uputstvo + šta provera (checkRoomDraft) nije pustila. */
export function buildRewritePrompt(base: string, problems: string[], previous: unknown): string {
  return `${base}
YOUR PREVIOUS ANSWER FAILED THESE CHECKS - fix them and keep everything else that was good:
${problems.map((p) => `- ${p}`).join('\n')}
Previous answer: ${JSON.stringify(previous)}
`;
}

/**
 * Uputstvo za plan obilaska (plan_tour): model vidi sve sobe redom obilaska
 * i za svaku kaže šta priča, kako se u nju ulazi i koje činjenice pripadaju
 * baš njoj. Sobe se navode rednim brojem jer nazivi nisu jedinstveni (dva
 * "Hodnika") - mapPlanToRooms vraća plan po tom broju.
 */
export function buildTourPlanPrompt(input: {
  listingType: ListingType;
  facts: string[];
  listingText: string;
  tourNotes: string;
  rooms: { title: string; note: string }[];
}): string {
  const rooms = input.rooms
    .map((r, i) => `${i + 1}. ${r.title || '(unnamed)'}${r.note ? ` - owner's note: ${r.note}` : ''}`)
    .join('\n');
  return `
You plan the spoken guide for a 360° virtual tour of one property. The images are the rooms in visiting
order (image 1 = room 1, and so on):
${rooms}

${clientAngle(input.listingType)}

PROPERTY FACTS (the only facts that exist):
${bullets(input.facts, '(no data)')}

FROM THE LISTING TEXT (facts only):
${input.listingText || '(none)'}

OWNER'S NOTES FOR THE WHOLE PROPERTY:
${input.tourNotes || '(none)'}

For EVERY room return:
- n: the room number from the list above;
- role: the room's single job in the story, one short line;
- transition: a short idea for entering it from the previous room, only if the passage is plausible from
  the images; empty for the first room or when unsure;
- facts: facts or owner's notes that are physically about THIS room and naturally checked there (central
  heating where a radiator is in view, the terrace itself, a note about this room's new floor). Most rooms
  get an empty list. Never assign the same fact twice.

Money, lease terms, house rules, parking and the neighbourhood are already shown elsewhere in the tour
(Info card, FAQ, map) - NEVER assign them to a room. Use only the facts and notes above.
`;
}

/** Odgovor plana -> { roomId: stavka }, po rednom broju n (1 = prva soba u obilasku). */
export function mapPlanToRooms(raw: unknown, roomIds: string[]): Record<string, TourPlanEntry> {
  const out: Record<string, TourPlanEntry> = {};
  const items = raw && typeof raw === 'object' ? (raw as { rooms?: unknown }).rooms : undefined;
  if (!Array.isArray(items)) return out;
  // Brojanje od nule pomera ceo plan za jednu sobu - takav plan se ne koristi.
  if (items.some((it) => it && typeof it === 'object' && Number((it as { n?: unknown }).n) === 0)) return out;
  const text = (x: unknown) => (typeof x === 'string' ? x.trim() : '');
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const it = item as { n?: unknown; role?: unknown; transition?: unknown; facts?: unknown };
    const n = Number(it.n);
    const id = Number.isInteger(n) && n >= 1 ? roomIds[n - 1] : undefined;
    if (!id || out[id]) continue;
    out[id] = {
      role: text(it.role),
      transition: text(it.transition),
      facts: Array.isArray(it.facts) ? it.facts.map(text).filter((f) => f && !isOffLimitsFact(f)) : []
    };
  }
  return out;
}
