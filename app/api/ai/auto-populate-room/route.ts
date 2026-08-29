import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

/**
 * ============================================================
 * CONFIG
 * ============================================================
 */

// Popravljen naziv modela na zvanični stable 3.6 flash
const MODEL = 'gemini-3.6-flash';

const MAX_WAYPOINTS = 4;
const MAX_RETRIES = 3;

const REQUEST_TIMEOUT_MS = 45_000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

// Service role ključ treba uvek imati prednost za pozadinske API rute (izbegavanje RLS blokada)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

type ListingType = 'sale' | 'rent' | 'booking';

const LISTING_TYPES: ListingType[] = ['sale', 'rent', 'booking'];

/**
 * ============================================================
 * CLIENT-CENTRIC STRATEGY
 * ============================================================
 */

function getClientStrategy(listingType: ListingType): string {
  switch (listingType) {
    case 'sale':
      return `
CLIENT: POTENTIAL BUYER

The reader is considering buying the property.
Think like a highly experienced residential real-estate agent.

The buyer wants to understand:
- How comfortable will everyday life be?
- Does the space feel pleasant and well organized?
- What makes the property attractive compared with alternatives?
- Does the interior feel maintained and coherent?
- What visible qualities suggest good usability?
- Which features contribute to perceived property quality?
- Is the space flexible enough for different lifestyles?

WRITING PRIORITIES:
1. Lifestyle
2. Quality of space
3. Natural light
4. Layout
5. Functionality
6. Visible finishes
7. Architectural character
8. Long-term usability

Do NOT make unsupported claims about investment return, appreciation, yield, or location.
The copy should create the feeling: "This is a property I can genuinely imagine owning and living in."
`;

    case 'rent':
      return `
CLIENT: LONG-TERM TENANT

The reader is considering renting the property for everyday life.
Think like an experienced rental agent.

The tenant wants to understand:
- Is the space practical?
- Is it comfortable for daily routines?
- Is the layout easy to use?
- Is there enough usable furniture?
- Is there a comfortable place to relax?
- Is there room for working from home if visible?
- Is storage practical if visible?
- Does the room feel bright and pleasant?

WRITING PRIORITIES:
1. Everyday usability
2. Comfort
3. Practical layout
4. Furniture
5. Storage
6. Natural light
7. Work / relaxation possibilities
8. Ease of living

Avoid luxury language unless clearly justified.
The copy should create the feeling: "I could comfortably live here."
`;

    case 'booking':
      return `
CLIENT: SHORT-TERM GUEST

The reader is considering staying in the property for a short vacation/trip.
Think like a high-quality hospitality and short-term rental agent.

The guest wants to understand:
- How will the room feel when I arrive?
- Is it comfortable and bright?
- Where can I relax or work?
- Is there a comfortable dining area?
- What makes the stay pleasant?

WRITING PRIORITIES:
1. Experience
2. Comfort
3. Atmosphere
4. Relaxation
5. Practicality
6. Natural light
7. Guest experience

Never invent amenities not visible in the image.
The copy should create the feeling: "I can imagine myself staying here."
`;
  }
}

/**
 * ============================================================
 * REAL ESTATE WRITING RULES & LANGUAGE
 * ============================================================
 */

function getWritingRules(): string {
  return `
============================================================
REAL ESTATE COPYWRITING RULES
============================================================
Write like a real human real-estate professional.
Answer the client's implicit question: "Why does this space matter to me?"

DO: Concrete observations, natural professional language, specific benefits.
DO NOT: Avoid generic AI clichés ("beautiful space", "dream home", "luxurious").

FACTUAL INTEGRITY:
The image is the source of truth. Never invent square meters, price, location, floor, heating, etc.
`;
}

function getLanguageRules(): string {
  return `
============================================================
LANGUAGE RULES
============================================================
Generate three independent native versions (SR - Serbian Latin, EN - English, DE - German).
Do NOT translate word-for-word. Each version must sound natural to native real estate buyers.
`;
}

/**
 * ============================================================
 * JSON SCHEMA DEFINITION
 * ============================================================
 */

const roomAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    room: {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          enum: [
            'living_room',
            'bedroom',
            'kitchen',
            'dining_room',
            'bathroom',
            'hallway',
            'entrance',
            'terrace',
            'balcony',
            'office',
            'utility_room',
            'other',
          ],
        },
        confidence: { type: Type.NUMBER },
        title_i18n: {
          type: Type.OBJECT,
          properties: {
            sr: { type: Type.STRING },
            en: { type: Type.STRING },
            de: { type: Type.STRING },
          },
          required: ['sr', 'en', 'de'],
        },
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
            'needs_attention',
            'dated',
            'maintained',
            'good',
            'very_good',
            'renovated',
            'unknown',
          ],
        },
        style: {
          type: Type.STRING,
          enum: [
            'modern',
            'contemporary',
            'minimalist',
            'classic',
            'traditional',
            'industrial',
            'scandinavian',
            'rustic',
            'eclectic',
            'neutral',
            'mixed',
            'unknown',
          ],
        },
        visible_features: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        furniture: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        appliances: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        architectural_features: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: [
        'light',
        'spatial_feel',
        'condition',
        'style',
        'visible_features',
        'furniture',
        'appliances',
        'architectural_features',
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
        secondary_values: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        lifestyle_benefit: { type: Type.STRING },
      },
      required: ['primary_value', 'secondary_values', 'lifestyle_benefit'],
    },
    highlights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title_i18n: {
            type: Type.OBJECT,
            properties: {
              sr: { type: Type.STRING },
              en: { type: Type.STRING },
              de: { type: Type.STRING },
            },
            required: ['sr', 'en', 'de'],
          },
          text_i18n: {
            type: Type.OBJECT,
            properties: {
              sr: { type: Type.STRING },
              en: { type: Type.STRING },
              de: { type: Type.STRING },
            },
            required: ['sr', 'en', 'de'],
          },
        },
        required: ['title_i18n', 'text_i18n'],
      },
    },
    waypoints: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          yaw: { type: Type.NUMBER },
          pitch: { type: Type.NUMBER },
          type: {
            type: Type.STRING,
            enum: ['info', 'navigation'],
          },
          priority: { type: Type.NUMBER },
          title_i18n: {
            type: Type.OBJECT,
            properties: {
              sr: { type: Type.STRING },
              en: { type: Type.STRING },
              de: { type: Type.STRING },
            },
            required: ['sr', 'en', 'de'],
          },
          text_i18n: {
            type: Type.OBJECT,
            properties: {
              sr: { type: Type.STRING },
              en: { type: Type.STRING },
              de: { type: Type.STRING },
            },
            required: ['sr', 'en', 'de'],
          },
        },
        required: [
          'yaw',
          'pitch',
          'type',
          'priority',
          'title_i18n',
          'text_i18n',
        ],
      },
    },
    listing_copy: {
      type: Type.OBJECT,
      properties: {
        headline_i18n: {
          type: Type.OBJECT,
          properties: {
            sr: { type: Type.STRING },
            en: { type: Type.STRING },
            de: { type: Type.STRING },
          },
          required: ['sr', 'en', 'de'],
        },
        short_description_i18n: {
          type: Type.OBJECT,
          properties: {
            sr: { type: Type.STRING },
            en: { type: Type.STRING },
            de: { type: Type.STRING },
          },
          required: ['sr', 'en', 'de'],
        },
        full_description_i18n: {
          type: Type.OBJECT,
          properties: {
            sr: { type: Type.STRING },
            en: { type: Type.STRING },
            de: { type: Type.STRING },
          },
          required: ['sr', 'en', 'de'],
        },
      },
      required: [
        'headline_i18n',
        'short_description_i18n',
        'full_description_i18n',
      ],
    },
  },
  required: [
    'room',
    'visual_facts',
    'camera',
    'client_value',
    'highlights',
    'waypoints',
    'listing_copy',
  ],
};

/**
 * ============================================================
 * PROMPT BUILDER
 * ============================================================
 */

function buildPrompt(listingType: ListingType): string {
  return `
You are a senior residential real-estate agent, property marketing specialist and client psychology expert.
You are analyzing ONE equirectangular 360-degree panorama of a property.

The description MUST be CLIENT-CENTRIC depending on: ${listingType.toUpperCase()}.

${getClientStrategy(listingType)}
${getWritingRules()}
${getLanguageRules()}

Return ONLY valid JSON matching the schema.
`;
}

/**
 * ============================================================
 * UTILS & RETRY
 * ============================================================
 */

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: any): boolean {
  const status = error?.status || error?.code || error?.response?.status;
  const message = String(error?.message || '').toLowerCase();

  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    message.includes('429') ||
    message.includes('resource exhausted') ||
    message.includes('rate limit') ||
    message.includes('temporarily unavailable')
  );
}

async function generateWithRetry(contents: any[], config: any) {
  let lastError: any;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await ai.models.generateContent({
        model: MODEL,
        contents,
        config,
      });
    } catch (error: any) {
      lastError = error;
      if (attempt === MAX_RETRIES || !isRetryableError(error)) {
        throw error;
      }

      const baseDelay = Math.pow(2, attempt) * 1000;
      const jitter = Math.floor(Math.random() * 500);
      await sleep(baseDelay + jitter);
    }
  }

  throw lastError;
}

function parseAIResponse(response: any): any {
  if (!response?.text) {
    throw new Error('Gemini nije vratio tekstualni rezultat.');
  }

  try {
    return JSON.parse(response.text);
  } catch {
    console.error('Gemini invalid JSON:', response.text);
    throw new Error('Gemini je vratio neispravan JSON.');
  }
}

/**
 * ============================================================
 * SANITIZATION
 * ============================================================
 */

function validateAndSanitize(data: any): any {
  if (!data?.room || !data?.visual_facts || !data?.listing_copy || !data?.camera) {
    throw new Error('AI rezultat ne sadrži sve obavezne objekte (room, visual_facts, listing_copy, camera).');
  }

  // Camera bounds
  data.camera.yaw = clamp(Number(data.camera.yaw) || 0, -180, 180);
  data.camera.pitch = clamp(Number(data.camera.pitch) || 0, -90, 90);

  // Waypoints
  if (!Array.isArray(data.waypoints)) {
    data.waypoints = [];
  }

  data.waypoints = data.waypoints
    .slice(0, MAX_WAYPOINTS)
    .map((point: any) => ({
      ...point,
      yaw: clamp(Number(point.yaw) || 0, -180, 180),
      pitch: clamp(Number(point.pitch) || 0, -90, 90),
      priority: clamp(Number(point.priority) || 5, 1, 10),
    }))
    .sort((a: any, b: any) => b.priority - a.priority);

  // Highlights
  if (!Array.isArray(data.highlights)) {
    data.highlights = [];
  }
  data.highlights = data.highlights.slice(0, 5);

  // Client value safety check
  if (!data.client_value) {
    data.client_value = { primary_value: '', secondary_values: [], lifestyle_benefit: '' };
  } else if (!Array.isArray(data.client_value.secondary_values)) {
    data.client_value.secondary_values = [];
  }

  return data;
}

/**
 * ============================================================
 * FETCH IMAGE
 * ============================================================
 */

async function fetchPanorama(panoramaUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(panoramaUrl, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Panorama download failed: HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      throw new Error(`URL ne vraća sliku. Content-Type: ${contentType}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer.byteLength) {
      throw new Error('Panorama slika je prazna.');
    }

    return {
      contentType,
      base64: Buffer.from(arrayBuffer).toString('base64'),
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * ============================================================
 * MAIN POST HANDLER
 * ============================================================
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomId, panoramaUrl, listingType = 'rent' } = body;

    if (!roomId) {
      return NextResponse.json({ success: false, error: 'roomId je obavezan.' }, { status: 400 });
    }

    if (!panoramaUrl) {
      return NextResponse.json({ success: false, error: 'panoramaUrl je obavezan.' }, { status: 400 });
    }

    const safeListingType: ListingType = LISTING_TYPES.includes(listingType)
      ? listingType
      : 'rent';

    const image = await fetchPanorama(panoramaUrl);
    const prompt = buildPrompt(safeListingType);

    // Poziv ka Gemini uz odgovarajući SDK config
    const response = await generateWithRetry(
      [
        {
          inlineData: {
            mimeType: image.contentType,
            data: image.base64,
          },
        },
        { text: prompt },
      ],
      {
        responseMimeType: 'application/json',
        responseJsonSchema: roomAnalysisSchema, // Zvanični ključ za novije SDK verzije
      }
    );

    let data = parseAIResponse(response);
    data = validateAndSanitize(data);

    // Supabase DB Update
    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        title_i18n: data.room.title_i18n,
        establish_i18n: {
          fromYaw: data.camera.yaw,
          pitch: data.camera.pitch,
          text_i18n: data.listing_copy.short_description_i18n,
        },
        waypoints_i18n: data.waypoints,
        visual_analysis: data.visual_facts,
        highlights_i18n: data.highlights,
        listing_copy_i18n: data.listing_copy,
        client_value: data.client_value,
        ai_model: MODEL,
        ai_listing_type: safeListingType,
      })
      .eq('id', roomId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      model: MODEL,
      listingType: safeListingType,
      data,
    });
  } catch (error: any) {
    console.error('REAL ESTATE AI V3 ERROR:', error);

    const status = error?.status === 429 ? 429 : 500;
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Došlo je do greške prilikom AI analize.',
      },
      { status }
    );
  }
}