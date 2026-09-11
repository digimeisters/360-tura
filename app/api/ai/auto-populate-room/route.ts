import { NextResponse } from 'next/server';
import { Type, Schema } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { requireAdmin } from '@/app/lib/adminAuth';
import { generateJsonWithRetry, TEMP_DESCRIPTIVE, TEMP_EXTRACT } from '@/app/lib/gemini';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * ============================================================
 * CONFIG & MODELS
 * ============================================================
 *
 * ISPRAVKA #2: Uklonjen Supabase upis iz generate_draft jer:
 * - Frontend `code-glavni.txt` ionako prvo čuva draft u React state (`aiDraft`)
 * - Tek kad korisnik klikne "Potvrdi" ide `handleConfirmDraftAndProcess` koji 
 *   koristi `translate_step`, a posle toga frontend direktno čuva u bazu
 * - Pokušaj upisa iz API rute je pravio TypeScript konflikt sa tipima
 *   jer supabase klijent u API rutti nije isti kao u `lib/supabaseClient`
 *
 * Rezultat: čistiji kod, bez tipskih greški, ista funkcionalnost.
 */

const MIN_WAYPOINTS = 4;
const MAX_WAYPOINTS = 6;

// Tekst tačke ide u mali tooltip u panorami, pa dužina mora da bude
// ograničena već u generisanju - posle je kasno, admin bi morao ručno da
// skraćuje svaku tačku.
const MAX_WAYPOINT_TITLE_WORDS = 3;
const MAX_WAYPOINT_TEXT_CHARS = 180;
const MAX_NARRATION_CHARS = 320;

// Panorama pokriva punih 360°, pa na 1024px širine ispada ~2.8° po pikselu -
// premalo da model prepozna materijal poda, tip klime ili pogled kroz prozor.
// Na 2048px opisi postaju konkretni, a slika je i dalje nekoliko stotina KB.
const AI_IMAGE_WIDTH = 2048;
const AI_IMAGE_QUALITY = 80;

// Panorame otpremljene pre WebP konverzije su i po 12MB; 5s nije dovoljno da
// se skinu sa CDN-a preko sporije veze, a ispadalo bi kao AI greška.
const FETCH_TIMEOUT_MS = 15_000;
const AI_TIMEOUT_MS = 25_000;

type ListingType = 'sale' | 'rent' | 'booking';
const LISTING_TYPES: ListingType[] = ['sale', 'rent', 'booking'];

type ActionType = 'generate_draft' | 'translate_step';

/**
 * ============================================================
 * SCHEMAS
 * ============================================================
 */

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
            description: `Uvodna naracija za sobu na srpskom (latinica), 2-4 rečenice, najviše ${MAX_NARRATION_CHARS} karaktera.`,
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
            yaw: {
              type: Type.NUMBER,
              description:
                'Horizontal angle in degrees, from -180 to 180, computed as (x / imageWidth - 0.5) * 360 ' +
                'where x is the horizontal pixel position of the object. 0 is the horizontal center of the image, ' +
                'negative is the left half, positive is the right half.',
            },
            pitch: {
              type: Type.NUMBER,
              description:
                'Vertical angle in degrees, from -90 to 90, computed as (0.5 - y / imageHeight) * 180 ' +
                'where y is the vertical pixel position of the object. 0 is the horizon (vertical center of the image), ' +
                'positive is above the horizon (toward the ceiling), negative is below it (toward the floor).',
            },
            title_i18n: {
              type: Type.OBJECT,
              properties: {
                sr: {
                  type: Type.STRING,
                  description: `Naziv detalja na srpskom (latinica), najviše ${MAX_WAYPOINT_TITLE_WORDS} reči, bez tačke na kraju.`,
                },
              },
              required: ['sr'],
            },
            text_i18n: {
              type: Type.OBJECT,
              properties: {
                sr: {
                  type: Type.STRING,
                  description: `Opis detalja na srpskom (latinica), 1-2 rečenice, najviše ${MAX_WAYPOINT_TEXT_CHARS} karaktera.`,
                },
              },
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
- Base descriptions on visible details in the image. Name what you actually see -
  the flooring material, the type of appliance, what the window looks out on -
  instead of generic praise like "prostrana i svetla prostorija".

COORDINATE SYSTEM - READ CAREFULLY:
The image is an equirectangular projection covering the full 360x180 degrees of the
room. Every waypoint must carry the angles of the object it describes, converted
from that object's pixel position in the image:

  yaw   = (x / imageWidth  - 0.5) * 360    -> -180..180, 0 is the horizontal center, positive to the right
  pitch = (0.5 - y / imageHeight) * 180    -> -90..90, 0 is the horizon, positive upward

- Aim at the CENTER of the object, not its edge.
- Furniture, flooring and appliances sit BELOW the horizon, so their pitch is
  usually negative; ceiling lights and beams are above it, so pitch is positive.
- Every waypoint must have DIFFERENT coordinates. Never return 0 for both yaw and
  pitch, and never repeat the same pair twice.

CRITICAL WAYPOINT RULES:
- Generate EXACTLY between ${MIN_WAYPOINTS} and ${MAX_WAYPOINTS} waypoints.
- EVERY single waypoint MUST be purely INFORMATIONAL.
- Focus waypoints ONLY on interior design, furniture, lighting, flooring, appliances, window views, or materials in the room.
- STRICTLY DO NOT place waypoints on doors, hallways, stairs, or exits intended for room navigation/transitions.

LENGTH LIMITS - these strings are rendered in a small tooltip inside the panorama:
- waypoint title: at most ${MAX_WAYPOINT_TITLE_WORDS} words, no trailing period.
- waypoint text: 1-2 sentences, at most ${MAX_WAYPOINT_TEXT_CHARS} characters.
- narration: 2-4 sentences, at most ${MAX_NARRATION_CHARS} characters.

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

RULES:
- Keep proper nouns as they are: street and city names, building names, brand and
  appliance manufacturer names. Do not translate or transliterate them.
- Keep the length close to the original - these strings are rendered in a small
  tooltip inside the panorama. Titles stay short (at most ${MAX_WAYPOINT_TITLE_WORDS} words).
- Convert nothing: no unit conversions, no currency conversions, no rounding of
  numbers that appear in the text.

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

/**
 * Tip oglasa određuje kome se soba obraća - kupcu, podstanaru ili gostu na
 * nekoliko noćenja. Frontend ga šalje iz učitane ture; ako ga nema (stariji
 * klijent, ručni poziv), čita se iz baze. Tek ako ni to ne uspe ide 'rent',
 * jer je pretpostavka bolja od praznog teksta - ali ne sme da bude prvi izbor,
 * kako je ranije bilo, pa je svaki stan opisivan kao da se izdaje.
 */
async function resolveListingType(roomId: string, provided: unknown): Promise<ListingType> {
  const given = String(provided ?? '').toLowerCase();
  if (LISTING_TYPES.includes(given as ListingType)) return given as ListingType;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return 'rent';

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: room } = await supabase
      .from('rooms')
      .select('tour_slug')
      .eq('id', roomId)
      .single();

    if (!room?.tour_slug) return 'rent';

    const { data: tour } = await supabase
      .from('tours')
      .select('category')
      .eq('slug', room.tour_slug)
      .single();

    const category = String(tour?.category ?? '').toLowerCase();
    if (LISTING_TYPES.includes(category as ListingType)) return category as ListingType;
  } catch (err) {
    console.warn('[AI] Tip oglasa nije pročitan iz baze, koristim "rent":', err);
  }

  return 'rent';
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

    const resizedBuffer = await sharp(inputBuffer, { limitInputPixels: false })
      .resize({ width: AI_IMAGE_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: AI_IMAGE_QUALITY })
      .toBuffer();

    return {
      contentType: 'image/jpeg',
      base64: resizedBuffer.toString('base64'),
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * ============================================================
 * KORAK 1: GENERATE_DRAFT
 * ============================================================
 */
async function handleGenerateDraft(body: any) {
  const roomId = body.roomId || body.room_id || body.id;
  const panoramaUrl = body.panoramaUrl || body.panorama_url;

  if (!roomId || !panoramaUrl) {
    return NextResponse.json({ success: false, error: 'Nedostaju roomId ili panoramaUrl.' }, { status: 400 });
  }

  const safeListingType = await resolveListingType(roomId, body.listingType || body.listing_type);

  const image = await fetchPanorama(panoramaUrl);
  const prompt = buildDraftPrompt(safeListingType);
  const schema = buildDraftSchema();

  const { data: raw, usedModel } = await generateJsonWithRetry<any>({
    contents: [{ inlineData: { mimeType: image.contentType, data: image.base64 } }, { text: prompt }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: TEMP_DESCRIPTIVE,
    },
    timeoutMs: AI_TIMEOUT_MS,
    label: 'AI draft sobe',
  });

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

  // NAPOMENA: Nema upisa u bazu ovde jer:
  // 1. Frontend prvo čuva draft u React state (aiDraft)
  // 2. Tek kad korisnik klikne "Potvrdi", ide handleConfirmDraftAndProcess
  //    koji koristi translate_step API
  // 3. Posle prevođenja, frontend sam čuva sve u bazu
  // Pokušaj upisa ovde je pravio TypeScript konflikt bez stvarne potrebe.

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
async function handleTranslateStep(body: any) {
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

  const { data: raw, usedModel } = await generateJsonWithRetry<any>({
    contents: [{ text: prompt }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: TEMP_EXTRACT,
    },
    timeoutMs: AI_TIMEOUT_MS,
    label: `Prevod na ${targetLangName}`,
  });

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
    // Ruta troši Gemini kredit i prepisuje sadržaj sobe, pa je otvorena samo
    // prijavljenom administratoru.
    const ctx = await requireAdmin(req);
    if (!ctx.ok) {
      return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });
    }

    const body = await req.json();

    // Glasovna naracija je izgubljena kad je ruta prepisana (commit 9678ce2):
    // frontend i dalje šalje 'generate_voice', a handler ne postoji. Bez ovog
    // uslova poziv bi upao u generate_draft i vratio poruku o panoramskom
    // linku, koja nema veze sa onim što je korisnik kliknuo.
    if (body.action === 'generate_voice') {
      return NextResponse.json(
        {
          success: false,
          error:
            'Glasovna naracija trenutno nije dostupna - TTS servis nije podešen na serveru.',
        },
        { status: 501 }
      );
    }

    const action: ActionType = body.action === 'translate_step' ? 'translate_step' : 'generate_draft';

    if (action === 'translate_step') {
      return await handleTranslateStep(body);
    }

    return await handleGenerateDraft(body);
  } catch (error: any) {
    console.error('REAL ESTATE AI ERROR:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Greška tokom AI obrade.' },
      { status: 500 }
    );
  }
}