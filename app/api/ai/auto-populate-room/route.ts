import { NextResponse } from 'next/server';
import { Type, Schema } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { requireAdmin } from '@/app/lib/adminAuth';
import {
  generateJsonWithRetry,
  GEMINI_FALLBACK_MODEL,
  GEMINI_MODEL,
  TEMP_EXTRACT,
  TEMP_GROUNDED
} from '@/app/lib/gemini';
import { structureLabel } from '@/app/lib/propertyTaxonomy';
import {
  EMPTY_PRAISE,
  MAX_NARRATION_DETAIL_CHARS,
  MAX_NARRATION_INTRO_CHARS,
  MAX_WAYPOINT_TEXT_CHARS,
  MAX_WAYPOINT_TITLE_WORDS,
  MAX_WAYPOINTS
} from '@/app/lib/roomDraftRules';

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

// Ograničenja dužine i broja tačaka su u app/lib/roomDraftRules.ts - po
// istim pravilima i admin prozor broji znakove dok se kuca. Nema minimuma
// tačaka: sa kvotom je model "izmišljao" tačku (prekidač za svetlo i sl.).

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

type ActionType = 'generate_draft' | 'translate_step' | 'review_draft';

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
      narration_intro_i18n: {
        type: Type.OBJECT,
        properties: {
          sr: {
            type: Type.STRING,
            description:
              `Prva rečenica uvodne naracije na srpskom (latinica): čemu ova soba služi u ovom stanu, oslonjeno na ` +
              `ono što se vidi i na podatke o stanu iz uputstva - ne generička definicija tipa sobe. ` +
              `1 rečenica, najviše ${MAX_NARRATION_INTRO_CHARS} karaktera.`,
          },
        },
        required: ['sr'],
      },
      narration_detail_i18n: {
        type: Type.OBJECT,
        properties: {
          sr: {
            type: Type.STRING,
            description:
              `Drugi deo uvodne naracije na srpskom (latinica): nešto SPECIFIČNO za ovu sobu, vidljivo na slici ` +
              `(materijal poda, nameštaj, pogled kroz prozor...). 1-2 rečenice, najviše ${MAX_NARRATION_DETAIL_CHARS} karaktera.`,
          },
        },
        required: ['sr'],
      },
      waypoints: {
        type: Type.ARRAY,
        description:
          `Niz od 0 do ${MAX_WAYPOINTS} ČISTO INFORMATIVNIH tačaka. Prazan niz je u redu ako soba (hodnik, ostava, ` +
          'prolaz) nema ništa vredno isticanja. NIKADA tačke za prelaz između soba / vrata / hodnike.',
        items: {
          type: Type.OBJECT,
          properties: {
            // Gemini je treniran da predmete na slici označava pravougaonikom u
            // ovom obliku - u tome je znatno precizniji nego kad sam računa
            // uglove. Uglove (yaw/pitch) iz centra pravougaonika računa naš kod.
            box_2d: {
              type: Type.ARRAY,
              description:
                'Bounding box of the object as [ymin, xmin, ymax, xmax], each an integer from 0 to 1000, ' +
                'normalized to the image height (y) and width (x). Tight around the object only.',
              items: { type: Type.INTEGER },
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
          required: ['box_2d', 'title_i18n', 'text_i18n'],
        },
      },
    },
    required: ['title_i18n', 'narration_intro_i18n', 'narration_detail_i18n', 'waypoints'],
  };
}

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

/**
 * Sve što model treba da zna o sobi a ne vidi na slici. Bez ovoga je dobijao
 * samo panoramu, a prompt je tražio "kako se soba nadovezuje na ostatak
 * stana" - pa je vezu sa drugim sobama izmišljao.
 */
type RoomContext = {
  listingType: ListingType;
  /** Naziv koji je admin već dao sobi (prazno ako je soba neimenovana). */
  roomTitle: string;
  /** Podaci o stanu: struktura, kvadratura, sprat, grad... */
  facts: string[];
  /** Ostale sobe u turi, redom obilaska, sa već napisanom naracijom. */
  otherRooms: { title: string; narration: string }[];
};

// Nazivi koje admin panel daje novoj, još neimenovanoj sobi - to nije pravi naziv.
const PLACEHOLDER_TITLE = /^(nova soba|soba \d+|room \d+|new room)?$/i;

function buildDraftPrompt(ctx: RoomContext): string {
  const facts = ctx.facts.length ? ctx.facts.map((f) => `- ${f}`).join('\n') : '- (no data)';
  const others = ctx.otherRooms.length
    ? ctx.otherRooms
        .map((r) => `- ${r.title || '(unnamed)'}${r.narration ? `: "${r.narration}"` : ''}`)
        .join('\n')
    : '- (none yet)';
  const titleRule = ctx.roomTitle
    ? `The admin already named this room "${ctx.roomTitle}". Return exactly that as title_i18n.sr.`
    : 'The room has no name yet - give it a short, plain Serbian name (e.g. "Dnevna soba", "Kupatilo").';

  return `
You are a senior residential real-estate agent writing the voice-over for one room
of a 360° virtual tour. Analyze this equirectangular 360° panorama image.

${getClientStrategy(ctx.listingType)}

WHAT YOU KNOW ABOUT THE PROPERTY (from the listing, reliable):
${facts}

OTHER ROOMS IN THIS TOUR, in visiting order, with narration already written:
${others}

THIS ROOM: ${titleRule}

LANGUAGE:
- Write naturally in Serbian, Latin script. Include ONLY the 'sr' key.

GROUNDING - THE MOST IMPORTANT RULE:
- Say only what is clearly visible in this image or stated in the property data above.
- NEVER claim: sizes or square meters of the room, age or year of renovation, brand or
  model names, compass direction (north/south...), noise or quiet, smells, what is
  outside the frame, or what is behind closed doors.
- Mention a connection to another room ONLY if the opening/passage is visible in the
  image (e.g. an open pass-through to the kitchen). Never guess the layout.
- When unsure whether something is true, leave it out. Plain and correct beats vivid and wrong.
- The property data is there so you never CONTRADICT it (e.g. call a studio "trosoban"),
  not as content to insert. Do not mention heating, parking, floor, city or total area
  in a room's narration unless that very room shows it (a radiator in view, a terrace
  door...).
- No empty superlatives: "idealan", "savršen", "maksimalan", "luksuzan", "jedinstven".
- Name concrete things you see - flooring material, a piece of furniture, the kind of
  window or light - instead of generic praise like "prostrana i svetla prostorija".

INTRO NARRATION - TWO SEPARATE PARTS, PLAYED BACK TO BACK:
- narration_intro_i18n = what this room is for in THIS home, grounded in what you see
  and in the property data. NOT a dictionary definition ("Dnevna soba je prostor za
  odmor..." is BAD).
- narration_detail_i18n = one specific, concrete observation from the image (material,
  furniture, light, view through a visible window) that no waypoint repeats.
- Do not reuse the openings or sentence patterns of the other rooms' narration listed
  above - a visitor hears them one after another.

WAYPOINT LOCATION:
- For every waypoint return box_2d = [ymin, xmin, ymax, xmax], integers 0-1000,
  normalized to the image height and width, drawn TIGHTLY around the object itself.
- The object must be clearly visible in the image. If you cannot point at it
  precisely, do not create that waypoint.
- Each waypoint is a different object in a different place.

CRITICAL WAYPOINT RULES:
- Generate AT MOST ${MAX_WAYPOINTS} waypoints - fewer is fine, and ZERO is
  correct when the room genuinely has nothing worth pointing out (a plain
  hallway, a closet, a utility passage). An empty array is a valid, expected
  answer for such rooms - do not force it to look "populated".
- Quality over quantity: only the most distinctive, worth-mentioning features.
  Do NOT invent a waypoint just to reach a quota - one strong waypoint beats
  ${MAX_WAYPOINTS} where the rest are filler (a generic light switch, an
  unremarkable wall).
- EVERY single waypoint MUST be purely INFORMATIONAL.
- Focus waypoints ONLY on interior design, furniture, lighting, flooring, appliances, window views, or materials in the room.
- STRICTLY DO NOT place waypoints on doors, hallways, stairs, or exits intended for room navigation/transitions.

LENGTH LIMITS - these strings are rendered in a small tooltip inside the panorama:
- waypoint title: at most ${MAX_WAYPOINT_TITLE_WORDS} words, no trailing period.
- waypoint text: 1-2 sentences, at most ${MAX_WAYPOINT_TEXT_CHARS} characters.
- narration_intro_i18n: 1 sentence, at most ${MAX_NARRATION_INTRO_CHARS} characters.
- narration_detail_i18n: 1-2 sentences, at most ${MAX_NARRATION_DETAIL_CHARS} characters.

- Output valid JSON matching the schema.
`;
}

function buildTranslationPrompt(
  targetLangName: string,
  title: string,
  narrationIntro: string,
  narrationDetail: string,
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

/** Uvodna naracija sobe kao jedan tekst (novi oblik intro+detail ili stari text). */
function narrationOf(establish: unknown): string {
  let value: unknown = establish;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return '';
    }
  }
  if (!value || typeof value !== 'object') return '';
  const e = value as { intro_i18n?: unknown; detail_i18n?: unknown; text_i18n?: unknown };
  const parts = [extractText(e.intro_i18n), extractText(e.detail_i18n)].filter(Boolean);
  return (parts.length ? parts.join(' ') : extractText(e.text_i18n)).slice(0, 360);
}

/**
 * Kontekst za AI popunu, iz baze (service role - ruta je samo za admina):
 * tip oglasa, naziv sobe, podaci o stanu i ostale sobe sa njihovom naracijom.
 *
 * Tip oglasa određuje kome se soba obraća - kupcu, podstanaru ili gostu. Prvo
 * se uzima onaj koji je poslao frontend, pa iz baze, i tek ako ni to ne uspe
 * 'rent' (pretpostavka je bolja od praznog teksta). Ako čitanje baze ne uspe,
 * AI popuna i dalje radi - samo bez konteksta, kao ranije.
 */
async function loadRoomContext(roomId: string, providedListingType: unknown): Promise<RoomContext> {
  const given = String(providedListingType ?? '').toLowerCase();
  const ctx: RoomContext = {
    listingType: LISTING_TYPES.includes(given as ListingType) ? (given as ListingType) : 'rent',
    roomTitle: '',
    facts: [],
    otherRooms: []
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return ctx;

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: room } = await supabase
      .from('rooms')
      .select('tour_slug, title_i18n')
      .eq('id', roomId)
      .single();
    if (!room?.tour_slug) return ctx;

    const ownTitle = extractText(room.title_i18n).trim();
    ctx.roomTitle = PLACEHOLDER_TITLE.test(ownTitle) ? '' : ownTitle;

    const [{ data: tour }, { data: rooms }] = await Promise.all([
      supabase
        .from('tours')
        .select('category, property_type, structure, area_sqm, floor, city, terrace, parking, heating')
        .eq('slug', room.tour_slug)
        .single(),
      supabase
        .from('rooms')
        .select('id, title_i18n, establish_i18n, order_index')
        .eq('tour_slug', room.tour_slug)
        .order('order_index', { ascending: true })
    ]);

    if (tour) {
      const category = String(tour.category ?? '').toLowerCase();
      if (!LISTING_TYPES.includes(given as ListingType) && LISTING_TYPES.includes(category as ListingType)) {
        ctx.listingType = category as ListingType;
      }
      const fact = (label: string, value: unknown) => {
        if (value !== null && value !== undefined && String(value).trim()) ctx.facts.push(`${label}: ${value}`);
      };
      fact('Property type', tour.property_type);
      fact('Structure', tour.structure ? structureLabel(String(tour.structure)) : null);
      fact('Total area (whole property, m²)', tour.area_sqm);
      fact('Floor', tour.floor);
      fact('City', tour.city);
      fact('Outdoor space', tour.terrace);
      fact('Parking', tour.parking);
      fact('Heating', tour.heating);
    }

    ctx.otherRooms = (rooms ?? [])
      .filter((r) => String(r.id) !== String(roomId))
      .slice(0, 15)
      .map((r) => ({ title: extractText(r.title_i18n).trim(), narration: narrationOf(r.establish_i18n) }));
  } catch (err) {
    console.warn('[AI] Kontekst sobe nije pročitan iz baze, radim bez njega:', err);
  }

  return ctx;
}

/**
 * Pravougaonik koji je vratio model ([ymin, xmin, ymax, xmax], 0-1000) u
 * uglove panorame. Vraća null za neispravan ili preveliki okvir - tačka bez
 * jasnog predmeta ispod sebe gora je od nikakve.
 */
function boxToAngles(box: unknown): { yaw: number; pitch: number } | null {
  if (!Array.isArray(box) || box.length !== 4) return null;
  const [ymin, xmin, ymax, xmax] = box.map(Number);
  if (![ymin, xmin, ymax, xmax].every((n) => Number.isFinite(n) && n >= 0 && n <= 1000)) return null;
  if (xmax <= xmin || ymax <= ymin) return null;
  // Okvir preko pola panorame nije "predmet" nego zid ili cela soba.
  if (xmax - xmin > 500 || ymax - ymin > 700) return null;

  const cx = (xmin + xmax) / 2 / 1000;
  const cy = (ymin + ymax) / 2 / 1000;
  return {
    yaw: Math.round(clamp((cx - 0.5) * 360, -180, 180) * 10) / 10,
    pitch: Math.round(clamp((0.5 - cy) * 180, -85, 85) * 10) / 10
  };
}

/** Ugaona razdaljina dve tačke u panorami (stepeni), sa prelazom preko ±180. */
function angularGap(a: { yaw: number; pitch: number }, b: { yaw: number; pitch: number }): number {
  const dYaw = Math.abs(((a.yaw - b.yaw + 540) % 360) - 180);
  return Math.hypot(dYaw, a.pitch - b.pitch);
}

// Dve tačke bliže od ovoga se u panorami preklapaju - ostaje prva.
const MIN_WAYPOINT_GAP_DEG = 12;

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

  const [ctx, image] = await Promise.all([
    loadRoomContext(roomId, body.listingType || body.listing_type),
    fetchPanorama(panoramaUrl)
  ]);
  const safeListingType = ctx.listingType;
  const prompt = buildDraftPrompt(ctx);
  const schema = buildDraftSchema();

  // Za čitanje slike jači Flash (Lite je slabije prepoznavao predmete i više
  // nagađao), Lite je rezerva. Po jedan pokušaj po modelu, da zbir ostane
  // ispod maxDuration rute (60s) i sa preuzimanjem panorame.
  const { data: raw, usedModel } = await generateJsonWithRetry<any>({
    contents: [{ inlineData: { mimeType: image.contentType, data: image.base64 } }, { text: prompt }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: TEMP_GROUNDED,
    },
    model: GEMINI_FALLBACK_MODEL,
    fallbackModel: GEMINI_MODEL,
    attempts: 1,
    timeoutMs: AI_TIMEOUT_MS,
    label: 'AI draft sobe',
  });

  if (
    !raw?.title_i18n?.sr ||
    !raw?.narration_intro_i18n?.sr ||
    !raw?.narration_detail_i18n?.sr ||
    !Array.isArray(raw.waypoints)
  ) {
    throw new Error('Generisani draft ne sadrži sva obavezna polja.');
  }

  // Uglovi se računaju iz pravougaonika; tačka bez ispravnog okvira ili
  // preblizu prethodnoj se odbacuje (model ume da stavi dve tačke na isti
  // predmet sa različitim nazivom).
  const waypoints: { yaw: number; pitch: number; type: 'info'; title_i18n: string; text_i18n: string }[] = [];
  for (const wp of raw.waypoints) {
    if (waypoints.length >= MAX_WAYPOINTS) break;
    const angles = boxToAngles(wp?.box_2d);
    const title = extractText(wp?.title_i18n, 'sr').trim();
    const text = extractText(wp?.text_i18n, 'sr').trim();
    if (!angles || !title || !text) continue;
    if (waypoints.some((kept) => angularGap(kept, angles) < MIN_WAYPOINT_GAP_DEG)) continue;
    waypoints.push({ ...angles, type: 'info', title_i18n: title, text_i18n: text });
  }

  // Oblik koji frontend (handleAutoPopulateRoom -> aiDraft) očekuje:
  const draft = {
    // Naziv koji je admin već dao ostaje, čak i da ga je model promenio.
    title: ctx.roomTitle || raw.title_i18n.sr,
    narrationIntro: raw.narration_intro_i18n.sr,
    narrationDetail: raw.narration_detail_i18n.sr,
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
  const sourceNarrationIntro = extractText(draft.narrationIntro, 'sr');
  const sourceNarrationDetail = extractText(draft.narrationDetail, 'sr');
  const sourceWaypoints: { title: string; text: string }[] = Array.isArray(draft.waypoints)
    ? draft.waypoints.map((wp: any) => ({
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

  if (
    typeof raw?.title !== 'string' ||
    typeof raw?.narrationIntro !== 'string' ||
    typeof raw?.narrationDetail !== 'string' ||
    !Array.isArray(raw.waypoints)
  ) {
    throw new Error('Prevod ne sadrži sva obavezna polja.');
  }

  // Ako model vrati pogrešan broj tačaka, popuni/skrati da se indeksi ne pomere.
  const waypoints = sourceWaypoints.map((_, idx) => ({
    title_i18n: raw.waypoints[idx]?.title ?? sourceWaypoints[idx].title,
    text_i18n: raw.waypoints[idx]?.text ?? sourceWaypoints[idx].text,
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

async function handleReviewDraft(body: any) {
  const roomId = body.roomId || body.room_id || body.id;
  const panoramaUrl = body.panoramaUrl || body.panorama_url;
  const draft = body.draft;
  if (!roomId || !panoramaUrl || !draft) {
    return NextResponse.json({ success: false, error: 'Nedostaju roomId, panoramaUrl ili draft.' }, { status: 400 });
  }

  const input: ReviewInput = {
    title: extractText(draft.title, 'sr'),
    intro: extractText(draft.narrationIntro, 'sr'),
    detail: extractText(draft.narrationDetail, 'sr'),
    waypoints: Array.isArray(draft.waypoints)
      ? draft.waypoints.map((wp: any) => ({ title: extractText(wp.title_i18n, 'sr'), text: extractText(wp.text_i18n, 'sr') }))
      : [],
  };

  const [ctx, image] = await Promise.all([loadRoomContext(roomId, body.listingType), fetchPanorama(panoramaUrl)]);

  const { data: raw, usedModel } = await generateJsonWithRetry<any>({
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
  const target = (item: any) => {
    const field = REVIEW_FIELDS.includes(item?.field) ? (item.field as ReviewField) : null;
    const index = field === 'wpTitle' || field === 'wpText' ? Number(item?.index) : -1;
    return field && current(field, index) !== null ? { field, index } : null;
  };

  const suggestions = (Array.isArray(raw?.suggestions) ? raw.suggestions : [])
    .map((s: any) => {
      const t = target(s);
      const suggested = String(s?.suggested ?? '').trim();
      if (!t || !suggested || suggested === current(t.field, t.index)?.trim()) return null;
      return { ...t, original: current(t.field, t.index), suggested, reason: String(s?.reason ?? '').trim() };
    })
    .filter(Boolean);

  const checks = (Array.isArray(raw?.checks) ? raw.checks : [])
    .map((c: any) => {
      const t = target(c);
      const message = String(c?.message ?? '').trim();
      return t && message ? { ...t, message } : null;
    })
    .filter(Boolean);

  return NextResponse.json({ success: true, model: usedModel, roomId, suggestions, checks });
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

    const action: ActionType =
      body.action === 'translate_step' || body.action === 'review_draft' ? body.action : 'generate_draft';

    if (action === 'translate_step') {
      return await handleTranslateStep(body);
    }
    if (action === 'review_draft') {
      return await handleReviewDraft(body);
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