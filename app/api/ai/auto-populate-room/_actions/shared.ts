import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { structureLabel } from '@/app/lib/propertyTaxonomy';
import { normalizeAiNotes } from '@/app/lib/aiNotes';
import { applyNarrationOverrides, isPlaceholderTitle, previousInVisit, roomFactsFromTour, stripOffLimits, visitOrder } from '@/app/lib/roomAiContext';
import { LISTING_TYPES, type ListingType, type RoomContext } from '@/app/lib/roomDraftPrompt';

export type { RoomContext } from '@/app/lib/roomDraftPrompt';

/**
 * Zajedničko za AI popunjavanje sobe: podešavanja, kontekst sobe iz baze,
 * preuzimanje panorame i čitanje i18n teksta. SAMO SERVER.
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
export const AI_TIMEOUT_MS = 25_000;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function extractText(value: unknown, lang: string = 'sr'): string {
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
 * tip oglasa, naziv sobe, podaci o nekretnini, opis oglasa, napomene vlasnika
 * i ostale sobe redom obilaska (putanja vodiča), sa njihovom naracijom.
 *
 * Tip oglasa određuje kome se soba obraća - kupcu, podstanaru ili gostu. Prvo
 * se uzima onaj koji je poslao frontend, pa iz baze, i tek ako ni to ne uspe
 * 'rent' (pretpostavka je bolja od praznog teksta). Ako čitanje baze ne uspe,
 * AI popuna i dalje radi - samo bez konteksta.
 *
 * opts.roomNote: napomena sobe upisana u prozoru AI popune; ima prednost nad
 * sačuvanom (stiže pre nego što se sačuva).
 * opts.siblings: nacrti iz iste serije "AI sve sobe" koji još nisu u bazi.
 */
export async function loadRoomContext(
  roomId: string,
  providedListingType: unknown,
  opts: { roomNote?: string; siblings?: Record<string, { title?: string; narration: string }> } = {}
): Promise<RoomContext> {
  const roomNoteOverride = opts.roomNote;
  const given = String(providedListingType ?? '').toLowerCase();
  const ctx: RoomContext = {
    listingType: LISTING_TYPES.includes(given as ListingType) ? (given as ListingType) : 'rent',
    roomTitle: '',
    facts: [],
    listingText: '',
    tourNotes: '',
    roomNote: typeof roomNoteOverride === 'string' ? roomNoteOverride.trim().slice(0, 500) : '',
    previousRoomTitle: '',
    visitIndex: -1,
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
    ctx.roomTitle = isPlaceholderTitle(ownTitle) ? '' : ownTitle;

    const [{ data: tour }, { data: rooms }, { data: notesRow }] = await Promise.all([
      supabase
        .from('tours')
        .select('category, property_type, structure, area_sqm, floor, city, district, terrace, heating, has_elevator, has_basement, build_status, finish_status, about_text_i18n, guide_path')
        .eq('slug', room.tour_slug)
        .single(),
      supabase
        .from('rooms')
        .select('id, title_i18n, establish_i18n, order_index')
        .eq('tour_slug', room.tour_slug)
        .order('order_index', { ascending: true }),
      supabase.from('tour_ai_notes').select('notes, room_notes').eq('tour_slug', room.tour_slug).maybeSingle()
    ]);

    if (tour) {
      const category = String(tour.category ?? '').toLowerCase();
      if (!LISTING_TYPES.includes(given as ListingType) && LISTING_TYPES.includes(category as ListingType)) {
        ctx.listingType = category as ListingType;
      }
      ctx.facts = roomFactsFromTour({ ...tour, structure: tour.structure ? structureLabel(String(tour.structure)) : null });
      // Bez rečenica o ceni, uslovima, parkingu - to ne ide u sobe.
      ctx.listingText = stripOffLimits(extractText(tour.about_text_i18n).trim()).slice(0, 700);
    }

    const notes = normalizeAiNotes({ notes: notesRow?.notes, roomNotes: notesRow?.room_notes });
    ctx.tourNotes = notes.notes;
    if (typeof roomNoteOverride !== 'string') ctx.roomNote = notes.roomNotes[roomId] ?? '';

    const list = (rooms ?? []).map((r) => ({ ...r, id: String(r.id), order_index: Number(r.order_index) }));
    const { ids } = visitOrder(tour?.guide_path, list);
    // "Soba 3" nije naziv - AI bi napisao "Iz sobe 3 ulazite...".
    const titleOf = (t: unknown) => {
      const text = extractText(t).trim();
      return isPlaceholderTitle(text) ? '' : text;
    };
    const known = applyNarrationOverrides(
      list.map((r) => ({ id: r.id, title: titleOf(r.title_i18n), narration: narrationOf(r.establish_i18n) })),
      opts.siblings ?? {}
    );
    const byId = new Map(known.map((r) => [r.id, r]));
    ctx.visitIndex = ids.indexOf(String(roomId));
    const prev = previousInVisit(ids, String(roomId));
    ctx.previousRoomTitle = prev ? (byId.get(prev)?.title ?? '') : '';
    ctx.otherRooms = ids
      .filter((id) => id !== String(roomId))
      .slice(0, 15)
      .map((id) => byId.get(id)!)
      .map((r) => ({ title: r.title, narration: r.narration }));
  } catch (err) {
    console.warn('[AI] Kontekst sobe nije pročitan iz baze, radim bez njega:', err);
  }

  return ctx;
}

export async function fetchPanorama(panoramaUrl: string, width: number = AI_IMAGE_WIDTH) {
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
      .resize({ width, withoutEnlargement: true })
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
 * Jedno polje teksta sačuvanog u draftu (i18n objekat/string) - vidi
 * extractText. Prihvata oba imena polja (camelCase/snake_case) jer stari
 * pozivi sa frontenda mešaju konvencije; novi kod šalje camelCase.
 */
type DraftWaypoint = { title_i18n?: unknown; text_i18n?: unknown };
export type DraftShape = {
  title?: unknown;
  narrationIntro?: unknown;
  narrationDetail?: unknown;
  waypoints?: DraftWaypoint[];
};
