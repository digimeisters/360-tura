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

const PRIMARY_MODEL = 'gemini-2.0-flash';
const FALLBACK_MODEL = 'gemini-1.5-flash-latest';

const MAX_WAYPOINTS = 5;
const MIN_WAYPOINTS = 4;

// Povećani tajmeri kako ne bi ulazio u timeout pre Vercel granice
const FETCH_TIMEOUT_MS = 5_000;
const AI_TIMEOUT_MS = 7_500;

type ListingType = 'sale' | 'rent' | 'booking';
const LISTING_TYPES: ListingType[] = ['sale', 'rent', 'booking'];

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
        description: 'Array containing strictly 3 or 4 purely informational feature points. NEVER contain room transition or door navigation points.',
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

  return data;
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

    const roomId = body.roomId || body.room_id || body.id;
    const panoramaUrl = body.panoramaUrl || body.panorama_url;
    const listingType: ListingType = body.listingType || body.listing_type || 'rent';

    if (!roomId || !panoramaUrl) {
      return NextResponse.json({ success: false, error: 'Nedostaju roomId ili panoramaUrl.' }, { status: 400 });
    }

    const safeListingType: ListingType = LISTING_TYPES.includes(listingType) ? listingType : 'rent';

    const image = await fetchPanorama(panoramaUrl);
    const prompt = buildPrompt(safeListingType);
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
        ai_listing_type: safeListingType,
        target_languages: ['sr'],
      })
      .eq('id', roomId);

    if (updateError) {
      throw new Error(`Supabase upis greška: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      model: usedModel,
      listingType: safeListingType,
      roomId,
      status: 'draft_generated',
      draft: data,
    });
  } catch (error: any) {
    console.error('REAL ESTATE AI ERROR:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Greška tokom AI obrade.' },
      { status: 500 }
    );
  }
}