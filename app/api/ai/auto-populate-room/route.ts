import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * ============================================================
 * CONFIG & MODELS
 * ============================================================
 *
 * ISPRAVKA (vidi napomene niže): ova ruta sada STVARNO razlikuje
 * dve akcije koje frontend šalje:
 *
 *   1) action: 'generate_draft'   -> analizira panoramu i vraća SR draft
 *   2) action: 'translate_step'   -> prevodi POSTOJEĆI draft na targetLang
 *
 * Ranije je ruta uvek radila isto (ponovo analizirala sliku i vraćala
 * `draft` u potpuno drugačijem obliku od onoga što frontend očekuje za
 * `result.translated.title / .narration / .waypoints`). Zbog toga je
 * prevod tiho pucao / ništa nije upisivao.
 */

const PRIMARY_MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';

const MIN_WAYPOINTS = 4;
const MAX_WAYPOINTS = 6;

const FETCH_TIMEOUT_MS = 5_000;
const AI_TIMEOUT_MS = 25_000;

type ListingType = 'sale' | 'rent' | 'booking';
const LISTING_TYPES: ListingType[] = ['sale', 'rent', 'booking'];

type ActionType = 'generate_draft' | 'translate_step';

/**
 * ============================================================
 * SCHEMAS
 * ============================================================
 */

// Šema za KORAK 1: generisanje SR drafta iz panorame.
// Namerno pojednostavljeno u odnosu na staru šemu (room/visual_facts/
// camera/client_value/listing_copy...) jer frontend ništa od toga ne
// koristi - koristi samo { title, narration, waypoints }.
function buildDraftSchema(): Schema {
  return {
    type: Type.OBJECT,
    properties: {
      title_i18n: {
        type: Type.OBJECT,
        properties: {
          sr: {
            type: Type.STRING,
            description: 'Kratak naziv sobe na srpskom (latinica), npr. "Dnevna soba".',
          },
        },
        required: ['sr'],
      },
      narration_i18n: {
        type: Type.OBJECT,
        properties: {
          sr: {
            type: Type.STRING,
            description: 'Uvodna naracija za sobu na srpskom (latinica), 2-4 rečenice.',
          },
        },
        required: ['sr'],
      },
      waypoints: {
        type: Type.ARRAY,
        description:
          'Niz od 4 do 6 ČISTO INFORMATIVNIH tačaka. NIKADA tačke za prelaz između soba / vrata / hodnike.',
        items: {
          type: Type.OBJECT,
          properties: {
            yaw: { type: Type.NUMBER },
            pitch: { type: Type.NUMBER },
            title_i18n: {
              type: Type.OBJECT,
              properties: { sr: { type: Type.STRING } },
              required: ['sr'],
            },
            text_i18n: {
              type: Type.OBJECT,
              properties: { sr: { type: Type.STRING } },
              required: ['sr'],
            },
          },
          required: ['yaw', 'pitch', 'title_i18n', 'text_i18n'],
        },
      },
    },
    required: ['title_i18n', 'narration_i18n', 'waypoints'],
  };
}

// Šema za KORAK 2: prevod postojećeg SR drafta na jedan ciljni jezik.
// Vraćamo OBIČNE stringove (ne i18n objekte) jer je ovo već "za jedan
// jezik" odgovor - frontend ih ubacuje u buildI18nObject sam.
function buildTranslationSchema(waypointCount: number): Schema {
  return {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      narration: { type: Type.STRING },
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
    required: ['title', 'narration', 'waypoints'],
  };
}

/**
 * ============================================================
 * PROMPT & HELPER UTILS
 * ============================================================
 */

function getClientStrategy(listingType: ListingType): string {
  switch (listingType) {
    case 'sale':
      return `CLIENT: POTENTIAL BUYER\nFocus on long-term value, comfort, layout quality, natural light, and property appeal.`;
    case 'rent':
      return `CLIENT: LONG-TERM TENANT\nFocus on everyday practicality, comfort, storage space, functional layout.`;
    case 'booking':
      return `CLIENT: SHORT-TERM GUEST\nFocus on overall experience, cozy atmosphere, relaxation, bright and inviting room aesthetics.`;
  }
}

function buildDraftPrompt(listingType: ListingType): string {
  return `
You are a senior residential real-estate agent. Analyze this equirectangular 360 panorama image.

${getClientStrategy(listingType)}

STRICT INSTRUCTIONS FOR GENERATION:
- Generate copy strictly and naturally in Serbian language using Latin script.
- CRITICAL: Do NOT generate any other language keys (like 'de', 'en', 'ru'). Include ONLY the 'sr' key.
- Base descriptions on visible details in the image.

CRITICAL WAYPOINT RULES:
- Generate EXACTLY between ${MIN_WAYPOINTS} and ${MAX_WAYPOINTS} waypoints.
- EVERY single waypoint MUST be purely INFORMATIONAL.
- Focus waypoints ONLY on interior design, furniture, lighting, flooring, appliances, window views, or materials in the room.
- STRICTLY DO NOT place waypoints on doors, hallways, stairs, or exits intended for room navigation/transitions.

- Output valid JSON matching the schema.
`;
}

function buildTranslationPrompt(
  targetLangName: string,
  title: string,
  narration: string,
  waypoints: { title: string; text: string }[]
): string {
  return `
You are a professional translator specialized in luxury real-estate copy.
Translate the following content from Serbian to ${targetLangName}.
Keep an engaging, natural tone appropriate for a virtual property tour narration.
Preserve the meaning; do not add or remove information.

Input:
{
  "title": ${JSON.stringify(title)},
  "narration": ${JSON.stringify(narration)},
  "waypoints": ${JSON.stringify(waypoints)}
}

Respond with a JSON object matching the schema EXACTLY, with "waypoints" containing
exactly ${waypoints.length} items in the SAME order as the input.
`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Izvlači SR (ili bilo koji prvi dostupan) tekst iz i18n vrednosti koja
// stiže sa frontenda - može biti plain string ili {sr, en, de, ru} objekat
// (ili JSON string tog objekta, jer stari zapisi to ponekad rade).
function extractText(value: unknown, lang: string = 'sr'): string {
  if (!value) return '';
  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return value;
    }
  }
  if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, string>;
    return record[lang] || record.sr || Object.values(record)[0] || '';
  }
  return String(parsed);
}

async function fetchPanorama(panoramaUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(panoramaUrl, {
      signal: controller.signal,
      headers: { Accept: 'image/jpeg,image/webp' },
    });

    if (!response.ok) {
      throw new Error(`HTTP greška ${response.status} pri preuzimanju slike.`);
    }

    const inputBuffer = Buffer.from(await response.arrayBuffer());

    const resizedBuffer = await sharp(inputBuffer)
      .resize({ width: 1024, withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();

    return {
      contentType: 'image/jpeg',
      base64: resizedBuffer.toString('base64'),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function generateWithStrictTimeout(aiClient: GoogleGenAI, model: string, contents: any[], config: any) {
  return Promise.race([
    aiClient.models.generateContent({ model, contents, config }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout od ${AI_TIMEOUT_MS}ms za model ${model}`)), AI_TIMEOUT_MS)
    ),
  ]);
}

async function generateFast(aiClient: GoogleGenAI, contents: any[], config: any) {
  try {
    const response = await generateWithStrictTimeout(aiClient, PRIMARY_MODEL, contents, config);
    return { response, usedModel: PRIMARY_MODEL };
  } catch (err) {
    console.warn(`[AI] ${PRIMARY_MODEL} nije uspeo u roku. Prebacujem odmah na ${FALLBACK_MODEL}...`);
    const response = await generateWithStrictTimeout(aiClient, FALLBACK_MODEL, contents, config);
    return { response, usedModel: FALLBACK_MODEL };
  }
}

function parseAIResponse(response: any): any {
  let text = '';
  if (typeof response?.text === 'function') text = response.text();
  else if (typeof response?.text === 'string') text = response.text;
  else if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
    text = response.candidates[0].content.parts[0].text;
  }

  if (!text) throw new Error('Gemini nije vratio tekstualni sadržaj.');

  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error('Model je vratio tekst koji nije validan JSON.');
  }
}

/**
 * ============================================================
 * KORAK 1: GENERATE_DRAFT
 * ============================================================
 */
async function handleGenerateDraft(ai: GoogleGenAI, body: any, supabase: ReturnType<typeof createClient>) {
  const roomId = body.roomId || body.room_id || body.id;
  const panoramaUrl = body.panoramaUrl || body.panorama_url;
  const listingType: ListingType = body.listingType || body.listing_type || 'rent';

  if (!roomId || !panoramaUrl) {
    return NextResponse.json({ success: false, error: 'Nedostaju roomId ili panoramaUrl.' }, { status: 400 });
  }

  const safeListingType: ListingType = LISTING_TYPES.includes(listingType) ? listingType : 'rent';

  const image = await fetchPanorama(panoramaUrl);
  const prompt = buildDraftPrompt(safeListingType);
  const schema = buildDraftSchema();

  const { response, usedModel } = await generateFast(
    ai,
    [{ inlineData: { mimeType: image.contentType, data: image.base64 } }, { text: prompt }],
    { responseMimeType: 'application/json', responseSchema: schema }
  );

  const raw = parseAIResponse(response);

  if (!raw?.title_i18n?.sr || !raw?.narration_i18n?.sr || !Array.isArray(raw.waypoints)) {
    throw new Error('Generisani draft ne sadrži sva obavezna polja.');
  }

  const waypoints = raw.waypoints
    .slice(0, MAX_WAYPOINTS)
    .map((wp: any) => ({
      yaw: clamp(Number(wp.yaw) || 0, -180, 180),
      pitch: clamp(Number(wp.pitch) || 0, -90, 90),
      type: 'info' as const,
      title_i18n: extractText(wp.title_i18n, 'sr'),
      text_i18n: extractText(wp.text_i18n, 'sr'),
    }));

  // Oblik koji frontend (handleAutoPopulateRoom -> aiDraft) očekuje:
  const draft = {
    title: raw.title_i18n.sr,
    narration: raw.narration_i18n.sr,
    waypoints,
  };

  // Opciono čuvamo "sirov" draft u bazu radi audita/debagovanja - ovo
  // ne utiče na frontend jer on koristi samo `draft` iz odgovora.
  try {
    await supabase
      .from('rooms')
      .update({
        draft_data: draft,
        status: 'draft_generated',
        ai_model: usedModel,
        ai_listing_type: safeListingType,
      })
      .eq('id', roomId);
  } catch (persistErr) {
    console.warn('Upozorenje: draft nije upisan u bazu (nastavljam bez prekida):', persistErr);
  }

  return NextResponse.json({
    success: true,
    model: usedModel,
    listingType: safeListingType,
    roomId,
    draft,
  });
}

/**
 * ============================================================
 * KORAK 2: TRANSLATE_STEP
 * ============================================================
 */
async function handleTranslateStep(ai: GoogleGenAI, body: any) {
  const roomId = body.roomId || body.room_id || body.id;
  const targetLang: string | undefined = body.targetLang;
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
  const sourceNarration = extractText(draft.narration, 'sr');
  const sourceWaypoints: { title: string; text: string }[] = Array.isArray(draft.waypoints)
    ? draft.waypoints.map((wp: any) => ({
        title: extractText(wp.title_i18n, 'sr'),
        text: extractText(wp.text_i18n, 'sr'),
      }))
    : [];

  const prompt = buildTranslationPrompt(targetLangName, sourceTitle, sourceNarration, sourceWaypoints);
  const schema = buildTranslationSchema(sourceWaypoints.length);

  const { response, usedModel } = await generateFast(ai, [{ text: prompt }], {
    responseMimeType: 'application/json',
    responseSchema: schema,
  });

  const raw = parseAIResponse(response);

  if (typeof raw?.title !== 'string' || typeof raw?.narration !== 'string' || !Array.isArray(raw.waypoints)) {
    throw new Error('Prevod ne sadrži sva obavezna polja.');
  }

  // Ako model vrati pogrešan broj tačaka, popuni/skrati da se indeksi ne pomere.
  const waypoints = sourceWaypoints.map((_, idx) => ({
    title_i18n: raw.waypoints[idx]?.title ?? sourceWaypoints[idx].title,
    text_i18n: raw.waypoints[idx]?.text ?? sourceWaypoints[idx].text,
  }));

  // Oblik koji frontend (handleConfirmDraftAndProcess) očekuje:
  // result.translated.title / .narration / .waypoints[i].title_i18n / .text_i18n
  const translated = {
    title: raw.title,
    narration: raw.narration,
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
 * POST HANDLER
 * ============================================================
 */
export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY fali.' }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const ai = new GoogleGenAI({ apiKey });
    const body = await req.json();

    const action: ActionType = body.action === 'translate_step' ? 'translate_step' : 'generate_draft';

    if (action === 'translate_step') {
      return await handleTranslateStep(ai, body);
    }

    return await handleGenerateDraft(ai, body, supabase);
  } catch (error: any) {
    console.error('REAL ESTATE AI ERROR:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Greška tokom AI obrade.' },
      { status: 500 }
    );
  }
}