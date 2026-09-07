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
 */

const PRIMARY_MODEL = "gemini-3.1-flash-lite";
const FALLBACK_MODEL = "gemini-3.1-flash-lite";

const MAX_WAYPOINTS = 6;
const MIN_WAYPOINTS = 4;

// Povećani tajmeri kako ne bi ulazio u timeout pre Vercel granice
const FETCH_TIMEOUT_MS = 5_000;
const AI_TIMEOUT_MS = 25000;

type ListingType = 'sale' | 'rent' | 'booking';
const LISTING_TYPES: ListingType[] = ['sale', 'rent', 'booking'];

type ActionType = 'generate_draft' | 'translate_step' | 'generate_voice';

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  de: 'German',
  ru: 'Russian',
};

// ---- ELEVENLABS TTS KONFIGURACIJA ----
// Koristimo eleven_v3, jer je to (za sada) jedini ElevenLabs model koji
// eksplicitno podržava srpski jezik (Serbian - srp). Napomena: eleven_v3
// je i dalje "alpha/experimental" kod ElevenLabs-a, pa rezultati mogu
// povremeno da variraju u stabilnosti u odnosu na stariji multilingual_v2.
const ELEVENLABS_MODEL_ID = 'eleven_v3';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const SUPABASE_AUDIO_BUCKET = 'narrations';

const VALID_VOICE_LANGS = ['sr', 'en', 'de', 'ru'] as const;
type VoiceLang = typeof VALID_VOICE_LANGS[number];

/**
 * ============================================================
 * SCHEMAS
 * ============================================================
 */

function buildSingleLangSchema(): Schema {
  return {
    type: Type.OBJECT,
    properties: {
      sr: {
        type: Type.STRING,
        description: 'Text MUST be written entirely and naturally in Serbian (Serbian Latin script - Srpski).'
      }
    },
    required: ['sr'],
  };
}

function buildRoomAnalysisSchema(): Schema {
  const srI18nSchema = buildSingleLangSchema();

  return {
    type: Type.OBJECT,
    properties: {
      room: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: [
              'living_room', 'bedroom', 'kitchen', 'dining_room',
              'bathroom', 'hallway', 'entrance', 'terrace',
              'balcony', 'office', 'utility_room', 'other',
            ],
          },
          confidence: { type: Type.NUMBER },
          title_i18n: srI18nSchema,
        },
        required: ['type', 'confidence', 'title_i18n'],
      },
      visual_facts: {
        type: Type.OBJECT,
        properties: {
          light: {
            type: Type.STRING,
            enum: ['very_low', 'low', 'moderate', 'good', 'excellent', 'unknown'],
          },
          spatial_feel: {
            type: Type.STRING,
            enum: ['compact', 'moderate', 'spacious', 'very_spacious', 'unknown'],
          },
          condition: {
            type: Type.STRING,
            enum: [
              'needs_attention', 'dated', 'maintained', 'good',
              'very_good', 'renovated', 'unknown',
            ],
          },
          style: {
            type: Type.STRING,
            enum: [
              'modern', 'contemporary', 'minimalist', 'classic',
              'traditional', 'industrial', 'scandinavian', 'rustic',
              'eclectic', 'neutral', 'mixed', 'unknown',
            ],
          },
          visible_features: { type: Type.ARRAY, items: { type: Type.STRING } },
          furniture: { type: Type.ARRAY, items: { type: Type.STRING } },
          appliances: { type: Type.ARRAY, items: { type: Type.STRING } },
          architectural_features: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: [
          'light', 'spatial_feel', 'condition', 'style',
          'visible_features', 'furniture', 'appliances', 'architectural_features',
        ],
      },
      camera: {
        type: Type.OBJECT,
        properties: {
          yaw: { type: Type.NUMBER },
          pitch: { type: Type.NUMBER },
          reason: { type: Type.STRING },
        },
        required: ['yaw', 'pitch', 'reason'],
      },
      client_value: {
        type: Type.OBJECT,
        properties: {
          primary_value: { type: Type.STRING },
          secondary_values: { type: Type.ARRAY, items: { type: Type.STRING } },
          lifestyle_benefit: { type: Type.STRING },
        },
        required: ['primary_value', 'secondary_values', 'lifestyle_benefit'],
      },
      highlights: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title_i18n: srI18nSchema,
            text_i18n: srI18nSchema,
          },
          required: ['title_i18n', 'text_i18n'],
        },
      },
      waypoints: {
        type: Type.ARRAY,
        description: 'Array containing strictly 4 to 6 purely informational feature points. NEVER contain room transition or door navigation points.',
        items: {
          type: Type.OBJECT,
          properties: {
            yaw: { type: Type.NUMBER },
            pitch: { type: Type.NUMBER },
            type: { type: Type.STRING, enum: ['info'] },
            priority: { type: Type.NUMBER },
            title_i18n: srI18nSchema,
            text_i18n: srI18nSchema,
          },
          required: ['yaw', 'pitch', 'type', 'priority', 'title_i18n', 'text_i18n'],
        },
      },
      listing_copy: {
        type: Type.OBJECT,
        properties: {
          headline_i18n: srI18nSchema,
          short_description_i18n: srI18nSchema,
          full_description_i18n: srI18nSchema,
        },
        required: ['headline_i18n', 'short_description_i18n', 'full_description_i18n'],
      },
    },
    required: [
      'room', 'visual_facts', 'camera', 'client_value',
      'highlights', 'waypoints', 'listing_copy',
    ],
  };
}

function buildTranslationSchema(): Schema {
  return {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      narration: { type: Type.STRING },
      waypoints: {
        type: Type.ARRAY,
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

function buildPrompt(listingType: ListingType): string {
  return `
You are a senior residential real-estate agent. Analyze this equirectangular 360 panorama image.

${getClientStrategy(listingType)}

STRICT INSTRUCTIONS FOR GENERATION:
- Generate copy strictly and naturally in Serbian language using Latin script.
- CRITICAL: Do NOT generate any other language keys (like 'de', 'en', 'ru') in i18n objects. Include ONLY the 'sr' key.
- Base descriptions on visible details in the image.

CRITICAL WAYPOINT RULES:
- Generate EXACTLY between 4 and 6 waypoints.
- EVERY single waypoint MUST be purely INFORMATIONAL ('info').
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
  const waypointsBlock = waypoints
    .map((wp, i) => `${i + 1}. Title: ${wp.title}\n   Text: ${wp.text}`)
    .join('\n');

  return `
You are a professional translator specialized in luxury real-estate marketing.
Translate the following content from Serbian into ${targetLangName}.
Maintain an engaging, natural tone appropriate for a luxury property virtual tour narration.
Do not add, remove, or invent information — translate meaning faithfully.

Title: ${title}

Narration: ${narration}

Waypoints:
${waypointsBlock || '(no waypoints)'}

Respond with valid JSON matching the schema. The "waypoints" array MUST contain exactly ${waypoints.length} items, in the same order as given above.
`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sanitizeI18n(i18nObj: any, allowedLangs: string[]): Record<string, string> {
  if (!i18nObj || typeof i18nObj !== 'object') return { sr: '' };
  const clean: Record<string, string> = {};
  allowedLangs.forEach((lang) => {
    if (i18nObj[lang]) clean[lang] = i18nObj[lang];
  });
  return Object.keys(clean).length > 0 ? clean : { sr: i18nObj.sr || '' };
}

// Izvlači SR tekst iz i18n objekta, JSON stringa ili plain stringa
function extractSrText(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') return parsed.sr || '';
      return value;
    } catch {
      return value;
    }
  }
  if (typeof value === 'object') return (value as Record<string, string>).sr || '';
  return String(value);
}

async function fetchPanorama(panoramaUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(panoramaUrl, {
      signal: controller.signal,
      headers: { 'Accept': 'image/jpeg,image/webp' }
    });

    if (!response.ok) {
      throw new Error(`HTTP greška ${response.status} pri preuzimanju slike.`);
    }

    const inputBuffer = Buffer.from(await response.arrayBuffer());

    // Optimizovana širina na 1024px radi brže obrade AI modela
    const resizedBuffer = await sharp(inputBuffer)
      .resize({
        width: 1024,
        withoutEnlargement: true,
      })
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
    )
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

/**
 * ============================================================
 * ELEVENLABS TTS
 * ============================================================
 */

// Zove ElevenLabs API i vraća sirov MP3 sadržaj kao Buffer.
async function synthesizeSpeech(text: string, voiceId: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY fali.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL_ID,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`ElevenLabs greška ${response.status}: ${errBody.slice(0, 300)}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
}

// Upload-uje MP3 buffer na Supabase Storage i vraća javni URL.
async function uploadNarrationAudio(
  supabase: any,
  path: string,
  audioBuffer: Buffer
): Promise<string> {
  const { error: uploadError } = await supabase.storage
    .from(SUPABASE_AUDIO_BUCKET)
    .upload(path, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Supabase Storage upload greška (${path}): ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(SUPABASE_AUDIO_BUCKET)
    .getPublicUrl(path);

  if (!publicUrlData?.publicUrl) {
    throw new Error(`Nije moguće dobiti javni URL za ${path}.`);
  }

  return publicUrlData.publicUrl;
}

// Generiše i upload-uje audio za JEDAN tekst na JEDNOM jeziku. Vraća URL ili
// null ako je tekst prazan (nema šta da se izgovori).
async function synthesizeAndUpload(
  supabase: any,
  text: string,
  voiceId: string,
  storagePath: string
): Promise<string | null> {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;

  const audioBuffer = await synthesizeSpeech(trimmed, voiceId);
  return uploadNarrationAudio(supabase, storagePath, audioBuffer);
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

function validateAndSanitize(data: any): any {
  if (!data?.room || !data?.visual_facts || !data?.listing_copy || !data?.camera) {
    throw new Error('Generisani podaci ne sadrže sve obavezne sekcije.');
  }

  data.camera.yaw = clamp(Number(data.camera.yaw) || 0, -180, 180);
  data.camera.pitch = clamp(Number(data.camera.pitch) || 0, -90, 90);

  // Sanitizacija room sekcije
  if (data.room?.title_i18n) {
    data.room.title_i18n = sanitizeI18n(data.room.title_i18n, ['sr']);
  }

  // Sanitizacija listing_copy sekcije
  if (data.listing_copy) {
    data.listing_copy.headline_i18n = sanitizeI18n(data.listing_copy.headline_i18n, ['sr']);
    data.listing_copy.short_description_i18n = sanitizeI18n(data.listing_copy.short_description_i18n, ['sr']);
    data.listing_copy.full_description_i18n = sanitizeI18n(data.listing_copy.full_description_i18n, ['sr']);
  }

  // Sanitizacija highlights niza
  if (Array.isArray(data.highlights)) {
    data.highlights = data.highlights.map((h: any) => ({
      ...h,
      title_i18n: sanitizeI18n(h.title_i18n, ['sr']),
      text_i18n: sanitizeI18n(h.text_i18n, ['sr']),
    }));
  }

  if (!Array.isArray(data.waypoints)) data.waypoints = [];

  // Sanitizacija waypoints niza
  data.waypoints = data.waypoints
    .map((point: any) => ({
      ...point,
      type: 'info',
      yaw: clamp(Number(point.yaw) || 0, -180, 180),
      pitch: clamp(Number(point.pitch) || 0, -90, 90),
      priority: clamp(Number(point.priority) || 5, 1, 10),
      title_i18n: sanitizeI18n(point.title_i18n, ['sr']),
      text_i18n: sanitizeI18n(point.text_i18n, ['sr']),
    }))
    .slice(0, MAX_WAYPOINTS)
    .sort((a: any, b: any) => b.priority - a.priority);

  if (data.waypoints.length < MIN_WAYPOINTS) {
    console.warn(`[AI] Model je vratio samo ${data.waypoints.length} waypoint(a), očekivano minimum ${MIN_WAYPOINTS}.`);
  }

  return data;
}

// Pretvara punu analizu (room/visual_facts/listing_copy/...) u pojednostavljeni
// oblik koji frontend očekuje: { title, narration, waypoints }
function toSimplifiedDraft(data: any): { title: string; narration: string; waypoints: any[] } {
  const title =
    data.room?.title_i18n?.sr ||
    data.listing_copy?.headline_i18n?.sr ||
    '';

  const narration =
    data.listing_copy?.short_description_i18n?.sr ||
    data.listing_copy?.full_description_i18n?.sr ||
    '';

  const waypoints = (data.waypoints || []).map((wp: any) => ({
    yaw: wp.yaw,
    pitch: wp.pitch,
    type: 'info',
    title_i18n: { sr: wp.title_i18n?.sr || '' },
    text_i18n: { sr: wp.text_i18n?.sr || '' },
  }));

  return { title, narration, waypoints };
}

/**
 * ============================================================
 * ACTION HANDLERS
 * ============================================================
 */

async function handleGenerateDraft(
  ai: GoogleGenAI,
  supabase: any,
  roomId: string | number,
  panoramaUrl: string,
  listingType: ListingType
) {
  const image = await fetchPanorama(panoramaUrl);
  const prompt = buildPrompt(listingType);
  const dynamicSchema = buildRoomAnalysisSchema();

  const { response, usedModel } = await generateFast(
    ai,
    [
      { inlineData: { mimeType: image.contentType, data: image.base64 } },
      { text: prompt },
    ],
    {
      responseMimeType: 'application/json',
      responseSchema: dynamicSchema,
    }
  );

  let data = parseAIResponse(response);
  data = validateAndSanitize(data);

  const { error: updateError } = await supabase
    .from('rooms')
    .update({
      draft_data: data,
      status: 'draft_generated',
      ai_model: usedModel,
      ai_listing_type: listingType,
      target_languages: ['sr'],
    })
    .eq('id', roomId);

  if (updateError) {
    throw new Error(`Supabase upis greška: ${updateError.message}`);
  }

  const draft = toSimplifiedDraft(data);

  return NextResponse.json({
    success: true,
    action: 'generate_draft',
    model: usedModel,
    listingType,
    roomId,
    status: 'draft_generated',
    draft,
  });
}

async function handleTranslateStep(
  ai: GoogleGenAI,
  roomId: string | number,
  targetLang: string,
  draft: { title?: string; narration?: string; waypoints?: any[] }
) {
  const normalizedLang = String(targetLang).toLowerCase();
  const targetLangName = LANG_NAMES[normalizedLang] || targetLang;

  const srTitle = extractSrText(draft?.title) || String(draft?.title || '');
  const srNarration = extractSrText(draft?.narration) || String(draft?.narration || '');
  const srWaypoints = (draft?.waypoints || []).map((wp: any) => ({
    title: extractSrText(wp.title_i18n),
    text: extractSrText(wp.text_i18n),
  }));

  const translationPrompt = buildTranslationPrompt(targetLangName, srTitle, srNarration, srWaypoints);
  const translationSchema = buildTranslationSchema();

  const { response, usedModel } = await generateFast(
    ai,
    [{ text: translationPrompt }],
    {
      responseMimeType: 'application/json',
      responseSchema: translationSchema,
    }
  );

  const translatedRaw = parseAIResponse(response);

  if (!Array.isArray(translatedRaw.waypoints) || translatedRaw.waypoints.length !== srWaypoints.length) {
    console.warn(
      `[AI] Prevod za ${normalizedLang} je vratio ${translatedRaw.waypoints?.length ?? 0} waypoint(a), očekivano ${srWaypoints.length}.`
    );
  }

  const translated = {
    title: translatedRaw.title || srTitle,
    narration: translatedRaw.narration || srNarration,
    waypoints: srWaypoints.map((_: any, idx: number) => ({
      title_i18n: translatedRaw.waypoints?.[idx]?.title || '',
      text_i18n: translatedRaw.waypoints?.[idx]?.text || '',
    })),
  };

  return NextResponse.json({
    success: true,
    action: 'translate_step',
    model: usedModel,
    roomId,
    targetLang: normalizedLang,
    translated,
  });
}

// Vraća ElevenLabs Voice ID za DATI jezik. Prvo gleda specifičnu env
// varijablu za taj jezik (npr. ELEVENLABS_VOICE_ID_SR), a ako ona nije
// podešena, pada nazad na opšti ELEVENLABS_VOICE_ID (ako postoji).
function getVoiceIdForLang(lang: VoiceLang): string | undefined {
  const perLangKey = `ELEVENLABS_VOICE_ID_${lang.toUpperCase()}`;
  return process.env[perLangKey] || process.env.ELEVENLABS_VOICE_ID;
}

async function handleGenerateVoice(
  supabase: any,
  roomId: string | number,
  voiceLanguages: string[],
  content: {
    establishText?: Record<string, string> | string;
    waypoints?: { index: number; text: Record<string, string> | string }[];
  }
) {
  const requestedLangs = (voiceLanguages || [])
    .map((l) => String(l).toLowerCase())
    .filter((l): l is VoiceLang => (VALID_VOICE_LANGS as readonly string[]).includes(l));

  if (requestedLangs.length === 0) {
    // Ništa nije traženo - vrati prazan rezultat, frontend ovo tretira kao "bez glasa"
    return NextResponse.json({
      success: true,
      action: 'generate_voice',
      roomId,
      audio: { establish: {}, waypoints: [] },
    });
  }

  // Proveri da SVAKI traženi jezik ima svoj (ili opšti fallback) Voice ID
  // PRE nego što počnemo bilo kakve pozive - da ne potrošimo pola kredita
  // pa tek onda otkrijemo da fali podešavanje za jedan jezik.
  const missingVoiceLangs = requestedLangs.filter((lang) => !getVoiceIdForLang(lang));
  if (missingVoiceLangs.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error:
          `Nedostaje Voice ID za jezik(e): ${missingVoiceLangs.join(', ').toUpperCase()}. ` +
          `Podesi ELEVENLABS_VOICE_ID_${missingVoiceLangs[0].toUpperCase()} (ili opšti ELEVENLABS_VOICE_ID kao fallback) u env promenljivama.`,
      },
      { status: 500 }
    );
  }

  const establishAudio: Record<string, string> = {};
  const establishErrors: Record<string, string> = {};

  const waypointsInput = content?.waypoints || [];
  const waypointAudio: { index: number; audio_url_i18n: Record<string, string> }[] =
    waypointsInput.map((wp) => ({ index: wp.index, audio_url_i18n: {} }));
  const waypointErrors: Record<string, string> = {};

  for (const lang of requestedLangs) {
    const voiceId = getVoiceIdForLang(lang)!; // već proverili gore da postoji

    // Uvodna naracija
    try {
      const rawText =
        (content?.establishText && typeof content.establishText === 'object'
          ? (content.establishText as Record<string, string>)[lang]
          : undefined) ?? (typeof content?.establishText === 'string' ? content.establishText : '');
      const url = await synthesizeAndUpload(
        supabase,
        String(rawText || ''),
        voiceId,
        `rooms/${roomId}/establish_${lang}.mp3`
      );
      if (url) establishAudio[lang] = url;
    } catch (err: any) {
      console.error(`[TTS] Greška za establish (${lang}):`, err);
      establishErrors[lang] = err?.message || 'Nepoznata greška';
    }

    // Waypoint-ovi (paralelno unutar istog jezika radi brzine)
    await Promise.all(
      waypointsInput.map(async (wp, idx) => {
        try {
          const rawText = (wp.text as any)?.[lang] ?? (typeof wp.text === 'string' ? wp.text : '');
          const url = await synthesizeAndUpload(
            supabase,
            String(rawText || ''),
            voiceId,
            `rooms/${roomId}/waypoint_${wp.index}_${lang}.mp3`
          );
          if (url) waypointAudio[idx].audio_url_i18n[lang] = url;
        } catch (err: any) {
          console.error(`[TTS] Greška za waypoint ${wp.index} (${lang}):`, err);
          waypointErrors[`${wp.index}_${lang}`] = err?.message || 'Nepoznata greška';
        }
      })
    );
  }

  return NextResponse.json({
    success: true,
    action: 'generate_voice',
    roomId,
    audio: {
      establish: establishAudio,
      waypoints: waypointAudio,
    },
    errors: {
      establish: establishErrors,
      waypoints: waypointErrors,
    },
  });
}

/**
 * ============================================================
 * POST HANDLER
 * ============================================================
 */

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();

    const roomId = body.roomId || body.room_id || body.id;
    const action: ActionType =
      body.action === 'translate_step'
        ? 'translate_step'
        : body.action === 'generate_voice'
        ? 'generate_voice'
        : 'generate_draft';

    if (!roomId) {
      return NextResponse.json({ success: false, error: 'Nedostaje roomId.' }, { status: 400 });
    }

    // ---- GENERATE VOICE (ElevenLabs, ne treba Gemini) ----
    if (action === 'generate_voice') {
      const { voiceLanguages, content } = body;
      if (!Array.isArray(voiceLanguages)) {
        return NextResponse.json(
          { success: false, error: 'Nedostaje voiceLanguages (niz jezika).' },
          { status: 400 }
        );
      }
      return await handleGenerateVoice(supabase, roomId, voiceLanguages, content || {});
    }

    // ---- Za generate_draft i translate_step treba Gemini ----
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY fali.' }, { status: 500 });
    }
    const ai = new GoogleGenAI({ apiKey });

    // ---- TRANSLATE STEP ----
    if (action === 'translate_step') {
      const { targetLang, draft } = body;
      if (!targetLang || !draft) {
        return NextResponse.json(
          { success: false, error: 'Nedostaju targetLang ili draft za prevod.' },
          { status: 400 }
        );
      }
      return await handleTranslateStep(ai, roomId, targetLang, draft);
    }

    // ---- GENERATE DRAFT (default) ----
    const panoramaUrl = body.panoramaUrl || body.panorama_url;
    if (!panoramaUrl) {
      return NextResponse.json({ success: false, error: 'Nedostaje panoramaUrl.' }, { status: 400 });
    }

    let listingType: ListingType = body.listingType || body.listing_type;

    // Ako frontend nije poslao listingType, pokušaj da ga izvučeš iz tура preko room -> tour_slug -> tours.category
    if (!listingType) {
      try {
        const { data: roomRow } = await supabase
          .from('rooms')
          .select('tour_slug')
          .eq('id', roomId)
          .single();

        if (roomRow?.tour_slug) {
          const { data: tourRow } = await supabase
            .from('tours')
            .select('category')
            .eq('slug', roomRow.tour_slug)
            .single();

          if (tourRow?.category) listingType = tourRow.category as ListingType;
        }
      } catch (lookupErr) {
        console.warn('[AI] Nije uspelo automatsko određivanje listingType iz baze:', lookupErr);
      }
    }

    const safeListingType: ListingType = LISTING_TYPES.includes(listingType) ? listingType : 'rent';

    return await handleGenerateDraft(ai, supabase, roomId, panoramaUrl, safeListingType);
  } catch (error: any) {
    console.error('REAL ESTATE AI ERROR:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Greška tokom AI obrade.' },
      { status: 500 }
    );
  }
}
