import { NextResponse } from 'next/server';
import { Type, Schema } from '@google/genai';
import { generateJsonWithRetry, GEMINI_FALLBACK_MODEL, GEMINI_MODEL, TEMP_GROUNDED } from '@/app/lib/gemini';
import { MAX_NARRATION_DETAIL_CHARS, MAX_NARRATION_INTRO_CHARS, MAX_WAYPOINT_TEXT_CHARS, MAX_WAYPOINT_TITLE_WORDS, MAX_WAYPOINTS } from '@/app/lib/roomDraftRules';
import { AI_TIMEOUT_MS, getClientStrategy, type RoomContext, clamp, extractText, loadRoomContext, fetchPanorama } from './shared';

/**
 * KORAK 1: GENERATE_DRAFT - AI piše naziv, naraciju i tačke za sobu iz
 * panorame. Ništa se ne upisuje; admin pregleda nacrt.
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

type GenerateDraftBody = {
  roomId?: string | number;
  room_id?: string | number;
  id?: string | number;
  panoramaUrl?: string;
  panorama_url?: string;
  listingType?: unknown;
  listing_type?: unknown;
};

/**
 * ============================================================
 * KORAK 1: GENERATE_DRAFT
 * ============================================================
 */

/** Odgovor modela po buildDraftSchema - polja se proveravaju pre upotrebe. */
type DraftRaw = {
  title_i18n?: { sr?: string };
  narration_intro_i18n?: { sr?: string };
  narration_detail_i18n?: { sr?: string };
  waypoints?: { box_2d?: unknown; title_i18n?: unknown; text_i18n?: unknown }[];
};

export async function handleGenerateDraft(body: GenerateDraftBody) {
  const roomId = body.roomId ?? body.room_id ?? body.id;
  const panoramaUrl = body.panoramaUrl ?? body.panorama_url;

  if (!roomId || !panoramaUrl) {
    return NextResponse.json({ success: false, error: 'Nedostaju roomId ili panoramaUrl.' }, { status: 400 });
  }

  const [ctx, image] = await Promise.all([
    loadRoomContext(String(roomId), body.listingType ?? body.listing_type),
    fetchPanorama(panoramaUrl)
  ]);
  const safeListingType = ctx.listingType;
  const prompt = buildDraftPrompt(ctx);
  const schema = buildDraftSchema();

  // Za čitanje slike jači Flash (Lite je slabije prepoznavao predmete i više
  // nagađao), Lite je rezerva. Po jedan pokušaj po modelu, da zbir ostane
  // ispod maxDuration rute (60s) i sa preuzimanjem panorame.
  const { data: raw, usedModel } = await generateJsonWithRetry<DraftRaw>({
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
