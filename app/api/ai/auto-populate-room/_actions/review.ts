import { NextResponse } from 'next/server';
import { Type, Schema } from '@google/genai';
import { generateJsonWithRetry, GEMINI_FALLBACK_MODEL, GEMINI_MODEL, TEMP_EXTRACT } from '@/app/lib/gemini';
import { EMPTY_PRAISE, MAX_NARRATION_DETAIL_CHARS, MAX_NARRATION_INTRO_CHARS, MAX_WAYPOINT_TEXT_CHARS, MAX_WAYPOINT_TITLE_WORDS } from '@/app/lib/roomDraftRules';
import { AI_TIMEOUT_MS, type RoomContext, extractText, loadRoomContext, fetchPanorama, type DraftShape } from './shared';

/**
 * KORAK 1b i 2: pregled nacrta ("Proveri i ispravi") i prevod na jezike.
 */

function buildTranslationSchema(waypointCount: number): Schema {
  return {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      narrationIntro: { type: Type.STRING },
      narrationDetail: { type: Type.STRING },
      waypoints: {
        type: Type.ARRAY,
        description: `Mora imati TAČNO ${waypointCount} elemenata, istim redosledom kao ulaz.`,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            text: { type: Type.STRING },
          },
          required: ['title', 'text'],
        },
      },
    },
    required: ['title', 'narrationIntro', 'narrationDetail', 'waypoints'],
  };
}

function buildTranslationPrompt(
  targetLangName: string,
  title: string,
  narrationIntro: string,
  narrationDetail: string,
  waypoints: { title: string; text: string }[]
): string {
  return `
You are a professional translator of spoken voice-overs for 360° property tours.
Translate the following content from Serbian to ${targetLangName}.
The Serbian text is a real estate agent walking a visitor through the property, speaking to them
directly. Keep that voice: natural spoken language, short sentences that are easy to say out loud,
addressing the visitor directly (formal "you" where the language has one, e.g. "Sie", "вы").
Preserve the meaning; do not add or remove information, and do not add praise or adjectives that the
Serbian text does not have.

RULES:
- Keep proper nouns as they are: street and city names, building names, brand and
  appliance manufacturer names. Do not translate or transliterate them.
- Keep the length close to the original - these strings are rendered in a small
  tooltip inside the panorama. Titles stay short (at most ${MAX_WAYPOINT_TITLE_WORDS} words).
- Convert nothing: no unit conversions, no currency conversions, no rounding of
  numbers that appear in the text.
- "narrationIntro" and "narrationDetail" are two SEPARATE sentences played back to
  back - translate each on its own, do not merge or reorder them.

Input:
{
  "title": ${JSON.stringify(title)},
  "narrationIntro": ${JSON.stringify(narrationIntro)},
  "narrationDetail": ${JSON.stringify(narrationDetail)},
  "waypoints": ${JSON.stringify(waypoints)}
}

Respond with a JSON object matching the schema EXACTLY, with "waypoints" containing
exactly ${waypoints.length} items in the SAME order as the input.
`;
}

/**
 * ============================================================
 * KORAK 2: TRANSLATE_STEP
 * ============================================================
 */
type TranslateStepBody = {
  roomId?: string | number;
  room_id?: string | number;
  id?: string | number;
  targetLang?: string;
  draft?: DraftShape;
};

/** Odgovor modela po buildTranslationSchema - polja se proveravaju pre upotrebe. */
type TranslationRaw = {
  title?: unknown;
  narrationIntro?: unknown;
  narrationDetail?: unknown;
  waypoints?: { title?: string; text?: string }[];
};

export async function handleTranslateStep(body: TranslateStepBody) {
  const roomId = body.roomId ?? body.room_id ?? body.id;
  const targetLang = body.targetLang;
  const draft = body.draft;

  if (!roomId || !targetLang || !draft) {
    return NextResponse.json(
      { success: false, error: 'Nedostaju roomId, targetLang ili draft za prevođenje.' },
      { status: 400 }
    );
  }

  const langNames: Record<string, string> = {
    en: 'English',
    de: 'German',
    ru: 'Russian',
  };
  const targetLangName = langNames[targetLang.toLowerCase()] || targetLang;

  const sourceTitle = extractText(draft.title, 'sr');
  const sourceNarrationIntro = extractText(draft.narrationIntro, 'sr');
  const sourceNarrationDetail = extractText(draft.narrationDetail, 'sr');
  const sourceWaypoints: { title: string; text: string }[] = Array.isArray(draft.waypoints)
    ? draft.waypoints.map((wp) => ({
        title: extractText(wp.title_i18n, 'sr'),
        text: extractText(wp.text_i18n, 'sr'),
      }))
    : [];

  const prompt = buildTranslationPrompt(
    targetLangName,
    sourceTitle,
    sourceNarrationIntro,
    sourceNarrationDetail,
    sourceWaypoints
  );
  const schema = buildTranslationSchema(sourceWaypoints.length);

  const { data: raw, usedModel } = await generateJsonWithRetry<TranslationRaw>({
    contents: [{ text: prompt }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: TEMP_EXTRACT,
    },
    timeoutMs: AI_TIMEOUT_MS,
    label: `Prevod na ${targetLangName}`,
  });

  if (
    typeof raw?.title !== 'string' ||
    typeof raw?.narrationIntro !== 'string' ||
    typeof raw?.narrationDetail !== 'string' ||
    !Array.isArray(raw.waypoints)
  ) {
    throw new Error('Prevod ne sadrži sva obavezna polja.');
  }

  // Ako model vrati pogrešan broj tačaka, popuni/skrati da se indeksi ne pomere.
  const rawWaypoints = raw.waypoints;
  const waypoints = sourceWaypoints.map((_, idx) => ({
    title_i18n: rawWaypoints[idx]?.title ?? sourceWaypoints[idx].title,
    text_i18n: rawWaypoints[idx]?.text ?? sourceWaypoints[idx].text,
  }));

  // Oblik koji frontend (handleConfirmDraftAndProcess) očekuje:
  // result.translated.title / .narrationIntro / .narrationDetail / .waypoints[i].title_i18n / .text_i18n
  const translated = {
    title: raw.title,
    narrationIntro: raw.narrationIntro,
    narrationDetail: raw.narrationDetail,
    waypoints,
  };

  return NextResponse.json({
    success: true,
    model: usedModel,
    targetLang,
    roomId,
    translated,
  });
}

/**
 * ============================================================
 * KORAK 1b: REVIEW_DRAFT ("Proveri i ispravi")
 * ============================================================
 *
 * Drugi AI prolaz, pre prevoda i glasa: lektor i urednik, ne pisac. Ništa ne
 * menja sam - vraća PREDLOGE (ceo novi tekst polja + razlog), koje admin
 * prihvata ili odbacuje jedan po jedan, i NAPOMENE za tvrdnje koje ne vidi na
 * slici (tu ne predlaže izmenu - admin zna stan). Greška u srpskom bi se
 * posle umnožila na tri prevoda i u glas, zato je ovo pre "Potvrdi i prevedi".
 */

type ReviewField = 'title' | 'intro' | 'detail' | 'wpTitle' | 'wpText';
const REVIEW_FIELDS: ReviewField[] = ['title', 'intro', 'detail', 'wpTitle', 'wpText'];

function buildReviewSchema(): Schema {
  const target = {
    field: {
      type: Type.STRING,
      enum: REVIEW_FIELDS,
      description: 'Which text: title, intro, detail, wpTitle (waypoint title) or wpText (waypoint text).',
    },
    index: {
      type: Type.INTEGER,
      description: 'Waypoint number starting at 0 for wpTitle/wpText; -1 for title, intro and detail.',
    },
  };
  return {
    type: Type.OBJECT,
    properties: {
      suggestions: {
        type: Type.ARRAY,
        description: 'Only real improvements. Empty array if the text is already good.',
        items: {
          type: Type.OBJECT,
          properties: {
            ...target,
            suggested: { type: Type.STRING, description: 'The whole corrected text of that field, in Serbian Latin.' },
            reason: { type: Type.STRING, description: 'Why, in Serbian, one short sentence.' },
          },
          required: ['field', 'index', 'suggested', 'reason'],
        },
      },
      checks: {
        type: Type.ARRAY,
        description: 'Claims you cannot confirm in the image. Empty array if everything is visible.',
        items: {
          type: Type.OBJECT,
          properties: {
            ...target,
            message: { type: Type.STRING, description: 'What to verify, in Serbian, one short sentence.' },
          },
          required: ['field', 'index', 'message'],
        },
      },
    },
    required: ['suggestions', 'checks'],
  };
}

type ReviewInput = {
  title: string;
  intro: string;
  detail: string;
  waypoints: { title: string; text: string }[];
};

function buildReviewPrompt(input: ReviewInput, ctx: RoomContext): string {
  const others = ctx.otherRooms
    .filter((r) => r.narration)
    .map((r) => `- ${r.title || '(unnamed)'}: "${r.narration}"`)
    .join('\n');
  return `
You are a meticulous Serbian copy editor (lektor) reviewing the voice-over text for one
room of a 360° real-estate virtual tour, BEFORE it is translated into three languages and
read aloud by a text-to-speech voice. The image is the room's equirectangular panorama.

TEXT TO REVIEW (Serbian, Latin script):
${JSON.stringify(input, null, 2)}

NARRATION ALREADY USED IN OTHER ROOMS OF THIS TOUR:
${others || '- (none)'}

CHECK, IN THIS ORDER:
1. Grammar and spelling: cases (padeži), gender and number agreement, ekavica, capitals,
   commas. Correct Serbian Latin with č ć š ž đ.
2. Spoken naturalness: it will be READ ALOUD. Replace stiff bureaucratic verbs
   ("sadrži", "poseduje", "vrši", "predstavlja") and split sentences that are too long to
   say in one breath. Keep the meaning.
3. Repetition: the same word or phrase repeated across title/intro/detail/waypoints, or an
   opening that copies the other rooms' narration above.
4. Empty praise: ${EMPTY_PRAISE.map((w) => `"${w}…"`).join(', ')} - replace with something
   visible, or drop it.
5. Length limits (hard): intro ≤ ${MAX_NARRATION_INTRO_CHARS} characters, detail ≤
   ${MAX_NARRATION_DETAIL_CHARS}, waypoint text ≤ ${MAX_WAYPOINT_TEXT_CHARS}, waypoint title ≤
   ${MAX_WAYPOINT_TITLE_WORDS} words with no trailing period.

FACT CHECK (goes to "checks", NOT to "suggestions"):
- Look at the image. For any claim you cannot confirm there (a material, an appliance, a
  view, a brand, a size, a connection to another room), add a check telling the admin
  what to verify. Do not rewrite it yourself - the admin knows the property.

RULES FOR SUGGESTIONS:
- Suggest only real improvements. If a field is fine, leave it out. Do not rephrase
  just to rephrase, and never add information that is not in the original.
- "suggested" is the WHOLE new text of that field, ready to paste.
- The room title is the admin's choice: suggest a title change only for a spelling error.
- "reason" and "message" are short and in Serbian.

Output valid JSON matching the schema.
`;
}

type ReviewDraftBody = {
  roomId?: string | number;
  room_id?: string | number;
  id?: string | number;
  panoramaUrl?: string;
  panorama_url?: string;
  draft?: DraftShape;
  listingType?: unknown;
};

export async function handleReviewDraft(body: ReviewDraftBody) {
  const roomId = body.roomId ?? body.room_id ?? body.id;
  const panoramaUrl = body.panoramaUrl ?? body.panorama_url;
  const draft = body.draft;
  if (!roomId || !panoramaUrl || !draft) {
    return NextResponse.json({ success: false, error: 'Nedostaju roomId, panoramaUrl ili draft.' }, { status: 400 });
  }

  const input: ReviewInput = {
    title: extractText(draft.title, 'sr'),
    intro: extractText(draft.narrationIntro, 'sr'),
    detail: extractText(draft.narrationDetail, 'sr'),
    waypoints: Array.isArray(draft.waypoints)
      ? draft.waypoints.map((wp) => ({ title: extractText(wp.title_i18n, 'sr'), text: extractText(wp.text_i18n, 'sr') }))
      : [],
  };

  const [ctx, image] = await Promise.all([loadRoomContext(String(roomId), body.listingType), fetchPanorama(panoramaUrl)]);

  const { data: raw, usedModel } = await generateJsonWithRetry<{ suggestions?: unknown; checks?: unknown }>({
    contents: [{ inlineData: { mimeType: image.contentType, data: image.base64 } }, { text: buildReviewPrompt(input, ctx) }],
    config: { responseMimeType: 'application/json', responseSchema: buildReviewSchema(), temperature: TEMP_EXTRACT },
    model: GEMINI_FALLBACK_MODEL,
    fallbackModel: GEMINI_MODEL,
    attempts: 1,
    timeoutMs: AI_TIMEOUT_MS,
    label: 'AI provera drafta',
  });

  // Tekst polja na koje se predlog odnosi - da se odbaci predlog za
  // nepostojeću tačku i "ispravka" koja je ista kao original.
  const current = (field: ReviewField, index: number): string | null => {
    if (field === 'title') return input.title;
    if (field === 'intro') return input.intro;
    if (field === 'detail') return input.detail;
    const wp = input.waypoints[index];
    if (!wp) return null;
    return field === 'wpTitle' ? wp.title : wp.text;
  };
  // Odgovor modela je nepoznatog oblika dok se ne proveri - čita se samo
  // preko optional chaining-a, nikad kao da je već validan.
  const target = (item: unknown) => {
    const rec = item as Record<string, unknown> | null | undefined;
    const field = REVIEW_FIELDS.includes(rec?.field as ReviewField) ? (rec!.field as ReviewField) : null;
    const index = field === 'wpTitle' || field === 'wpText' ? Number(rec?.index) : -1;
    return field && current(field, index) !== null ? { field, index } : null;
  };

  const suggestions = (Array.isArray(raw?.suggestions) ? (raw.suggestions as unknown[]) : [])
    .map((s) => {
      const t = target(s);
      const rec = s as Record<string, unknown> | null | undefined;
      const suggested = String(rec?.suggested ?? '').trim();
      if (!t || !suggested || suggested === current(t.field, t.index)?.trim()) return null;
      return { ...t, original: current(t.field, t.index), suggested, reason: String(rec?.reason ?? '').trim() };
    })
    .filter(Boolean);

  const checks = (Array.isArray(raw?.checks) ? (raw.checks as unknown[]) : [])
    .map((c) => {
      const t = target(c);
      const rec = c as Record<string, unknown> | null | undefined;
      const message = String(rec?.message ?? '').trim();
      return t && message ? { ...t, message } : null;
    })
    .filter(Boolean);

  return NextResponse.json({ success: true, model: usedModel, roomId, suggestions, checks });
}
