import { NextResponse } from 'next/server';
import { Type, Schema } from '@google/genai';
import { generateJsonWithRetry, GEMINI_FALLBACK_MODEL, GEMINI_MODEL, TEMP_GROUNDED } from '@/app/lib/gemini';
import { MAX_NARRATION_DETAIL_CHARS, MAX_NARRATION_INTRO_CHARS, MAX_WAYPOINT_TEXT_CHARS, MAX_WAYPOINT_TITLE_WORDS, MAX_WAYPOINTS } from '@/app/lib/roomDraftRules';
import { checkRoomDraft } from '@/app/lib/roomDraftRules';
import { buildDraftPrompt, buildRewritePrompt, type RoomContext, type TourPlanEntry } from '@/app/lib/roomDraftPrompt';
import { attemptTimeoutMs } from '@/app/lib/aiDeadline';
import { isOffLimitsFact } from '@/app/lib/roomAiContext';

// Do kraja rute (maxDuration = 60 s) ostaje rezerva za odgovor.
const ROUTE_BUDGET_MS = 55_000;
import { AI_TIMEOUT_MS, clamp, extractText, loadRoomContext, fetchPanorama } from './shared';

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
                  description: `OBAVEZAN naziv detalja na srpskom (latinica), 1-${MAX_WAYPOINT_TITLE_WORDS} reči, bez tačke na kraju.`,
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
  /** Stavka iz plana ture ("AI sve sobe"), ako postoji. */
  plan?: unknown;
  /** Napomena sobe upisana u prozoru AI popune (pre čuvanja). */
  roomNote?: unknown;
  /** "AI sve sobe": nacrti soba iz iste serije koji još nisu sačuvani. */
  siblings?: unknown;
};

/** Nacrti iz iste serije: { roomId: { title, narration } }, samo tekst. */
function siblingsFromBody(value: unknown): Record<string, { title?: string; narration: string }> {
  const out: Record<string, { title?: string; narration: string }> = {};
  if (!Array.isArray(value)) return out;
  for (const item of value.slice(0, 30)) {
    const v = item as { id?: unknown; title?: unknown; narration?: unknown };
    if (typeof v?.id !== 'string' || typeof v.narration !== 'string') continue;
    out[v.id] = { title: typeof v.title === 'string' ? v.title.slice(0, 80) : undefined, narration: v.narration.slice(0, 360) };
  }
  return out;
}

/** Plan sa klijenta je samo tekst; sve ostalo se odbacuje. */
function planFromBody(value: unknown): TourPlanEntry | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as { role?: unknown; transition?: unknown; facts?: unknown };
  const text = (x: unknown) => (typeof x === 'string' ? x.slice(0, 300) : '');
  return {
    role: text(v.role),
    transition: text(v.transition),
    facts: Array.isArray(v.facts)
      ? v.facts
          .filter((f): f is string => typeof f === 'string' && !isOffLimitsFact(f))
          .slice(0, 6)
          .map((f) => f.slice(0, 200))
      : []
  };
}

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

type Draft = {
  title: string;
  narrationIntro: string;
  narrationDetail: string;
  waypoints: { yaw: number; pitch: number; type: 'info'; title_i18n: string; text_i18n: string }[];
};

/**
 * Odgovor modela -> nacrt. Uglovi se računaju iz pravougaonika; tačka bez
 * ispravnog okvira, bez teksta ili preblizu prethodnoj se odbacuje (model
 * ume da stavi dve tačke na isti predmet sa različitim nazivom). Naziv tačke
 * sme da fali - to javlja provera, da admin vidi.
 */
function toDraft(raw: DraftRaw, roomTitle: string): Draft {
  if (!raw?.title_i18n?.sr || typeof raw?.narration_intro_i18n?.sr !== 'string' || typeof raw?.narration_detail_i18n?.sr !== 'string' || !Array.isArray(raw.waypoints)) {
    throw new Error('Generisani draft ne sadrži sva obavezna polja.');
  }
  const waypoints: Draft['waypoints'] = [];
  for (const wp of raw.waypoints) {
    if (waypoints.length >= MAX_WAYPOINTS) break;
    const angles = boxToAngles(wp?.box_2d);
    const title = extractText(wp?.title_i18n, 'sr').trim();
    const text = extractText(wp?.text_i18n, 'sr').trim();
    if (!angles || !text) continue;
    if (waypoints.some((kept) => angularGap(kept, angles) < MIN_WAYPOINT_GAP_DEG)) continue;
    waypoints.push({ ...angles, type: 'info', title_i18n: title, text_i18n: text });
  }
  return {
    // Naziv koji je admin već dao ostaje, čak i da ga je model promenio.
    title: roomTitle || raw.title_i18n.sr,
    narrationIntro: raw.narration_intro_i18n.sr.trim(),
    narrationDetail: raw.narration_detail_i18n.sr.trim(),
    waypoints
  };
}

const problemsOf = (draft: Draft, ctx: RoomContext) =>
  checkRoomDraft(
    {
      title: draft.title,
      narrationIntro: draft.narrationIntro,
      narrationDetail: draft.narrationDetail,
      waypoints: draft.waypoints.map((w) => ({ title: w.title_i18n, text: w.text_i18n }))
    },
    ctx.otherRooms.map((r) => r.narration)
  );

export async function handleGenerateDraft(body: GenerateDraftBody) {
  const started = Date.now();
  const roomId = body.roomId ?? body.room_id ?? body.id;
  const panoramaUrl = body.panoramaUrl ?? body.panorama_url;

  if (!roomId || !panoramaUrl) {
    return NextResponse.json({ success: false, error: 'Nedostaju roomId ili panoramaUrl.' }, { status: 400 });
  }

  const [ctx, image] = await Promise.all([
    loadRoomContext(String(roomId), body.listingType ?? body.listing_type, {
      roomNote: typeof body.roomNote === 'string' ? body.roomNote : undefined,
      siblings: siblingsFromBody(body.siblings)
    }),
    fetchPanorama(panoramaUrl)
  ]);
  const prompt = buildDraftPrompt(ctx, planFromBody(body.plan));
  const schema = buildDraftSchema();
  const imagePart = { inlineData: { mimeType: image.contentType, data: image.base64 } };

  // Za čitanje slike jači Flash (Lite je slabije prepoznavao predmete i više
  // nagađao), Lite je rezerva. Dva pokušaja po modelu: Flash ume da vrati
  // "preopterećen" (503) ceo dan, a drugi pokušaj posle pauze često prođe;
  // greška zbog isteka vremena ide odmah na Lite (generateWithRetry).
  // Rok rute (maxDuration 60 s) uz rezervu: pokušaj koji ne može da stane se
  // ne počinje (generateWithRetry), da odgovor stigne umesto 504.
  const deadlineAt = started + ROUTE_BUDGET_MS;
  const call = (text: string, rewriteModel?: string): Promise<{ data: DraftRaw; usedModel: string }> =>
    generateJsonWithRetry<DraftRaw>({
      contents: [imagePart, { text }],
      config: { responseMimeType: 'application/json', responseSchema: schema, temperature: TEMP_GROUNDED },
      model: rewriteModel ?? GEMINI_FALLBACK_MODEL,
      // Prepis: jedan pokušaj modelom koji je upravo radio, bez rezerve.
      fallbackModel: rewriteModel ?? GEMINI_MODEL,
      attempts: rewriteModel ? 1 : 2,
      timeoutMs: AI_TIMEOUT_MS,
      deadlineAt,
      label: rewriteModel ? 'AI draft sobe (prepis)' : 'AI draft sobe'
    });

  const first = await call(prompt);
  let usedModel = first.usedModel;
  let draft = toDraft(first.data, ctx.roomTitle);
  let problems = problemsOf(draft, ctx);

  // Jedan prepis sa spiskom problema, samo dok ima vremena do kraja rute; ako
  // ne uspe, ostaje prvi nacrt, a problemi idu u prozor za pregled.
  if (problems.length && attemptTimeoutMs(Date.now(), deadlineAt, AI_TIMEOUT_MS) !== null) {
    try {
      const second = await call(buildRewritePrompt(prompt, problems, first.data), usedModel);
      const rewritten = toDraft(second.data, ctx.roomTitle);
      const rewrittenProblems = problemsOf(rewritten, ctx);
      if (rewrittenProblems.length <= problems.length) {
        draft = rewritten;
        problems = rewrittenProblems;
        usedModel = second.usedModel;
      }
    } catch (err) {
      console.warn('[AI draft sobe] prepis nije uspeo, ostaje prvi nacrt:', err);
    }
  }

  // Nema upisa u bazu: admin pregleda nacrt, pa ga potvrda (roomDraftApply.ts)
  // prevodi, snima glas i čuva.
  return NextResponse.json({
    success: true,
    model: usedModel,
    listingType: ctx.listingType,
    roomId,
    draft: { ...draft, problems }
  });
}
