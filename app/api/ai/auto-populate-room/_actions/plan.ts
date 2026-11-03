import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Type, Schema } from '@google/genai';
import { generateJsonWithRetry, GEMINI_FALLBACK_MODEL, GEMINI_MODEL, TEMP_GROUNDED } from '@/app/lib/gemini';
import { normalizeAiNotes } from '@/app/lib/aiNotes';
import { structureLabel } from '@/app/lib/propertyTaxonomy';
import { isPlaceholderTitle, roomFactsFromTour, stripOffLimits, visitOrder } from '@/app/lib/roomAiContext';
import { buildTourPlanPrompt, LISTING_TYPES, mapPlanToRooms, type ListingType } from '@/app/lib/roomDraftPrompt';
import { extractText, fetchPanorama } from './shared';

/**
 * PLAN_TOUR - pre "AI sve sobe": model vidi sve sobe redom obilaska i za
 * svaku kaže šta priča, kako se u nju ulazi i koje činjenice pripadaju baš
 * njoj (spec §3). Ništa se ne upisuje; klijent drži plan u memoriji i šalje
 * stavku uz svaki generate_draft.
 */

// Male slike: za plan je dovoljno da se prepozna soba, a 10+ slika na 2048 px
// bi trajalo i koštalo više nego sam plan.
const PLAN_IMAGE_WIDTH = 1024;
// Po pokušaju; Flash pa Lite + preuzimanje slika moraju da stanu u 60 s rute.
const PLAN_TIMEOUT_MS = 22_000;
const MAX_PLAN_ROOMS = 20;
const PLAN_FETCH_CONCURRENCY = 4;

const planSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    rooms: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          n: { type: Type.INTEGER, description: 'Room number from the list (1 = first room).' },
          role: { type: Type.STRING },
          transition: { type: Type.STRING },
          facts: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['n', 'role', 'transition', 'facts']
      }
    }
  },
  required: ['rooms']
};

export async function handlePlanTour(body: { tourSlug?: unknown; listingType?: unknown }) {
  const started = Date.now();
  const slug = typeof body.tourSlug === 'string' ? body.tourSlug : '';
  if (!slug) return NextResponse.json({ success: false, error: 'Nedostaje tourSlug.' }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ success: false, error: 'Baza nije podešena.' }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  const [{ data: tour }, { data: rooms }, { data: notesRow }] = await Promise.all([
    supabase
      .from('tours')
      .select('category, property_type, structure, area_sqm, floor, city, district, terrace, heating, has_elevator, has_basement, build_status, finish_status, about_text_i18n, guide_path')
      .eq('slug', slug)
      .maybeSingle(),
    supabase
      .from('rooms')
      .select('id, title_i18n, order_index, panorama_url, panorama_url_cf, panorama_url_mobile')
      .eq('tour_slug', slug)
      .order('order_index', { ascending: true }),
    supabase.from('tour_ai_notes').select('notes, room_notes').eq('tour_slug', slug).maybeSingle()
  ]);
  if (!tour) return NextResponse.json({ success: false, error: 'Tura ne postoji.' }, { status: 404 });

  const list = (rooms ?? []).map((r) => ({ ...r, id: String(r.id), order_index: Number(r.order_index) }));
  if (list.length === 0) return NextResponse.json({ success: false, error: 'Tura nema sobe.' }, { status: 400 });

  const given = String(body.listingType ?? tour.category ?? '').toLowerCase();
  const listingType: ListingType = LISTING_TYPES.includes(given as ListingType) ? (given as ListingType) : 'rent';
  const notes = normalizeAiNotes({ notes: notesRow?.notes, roomNotes: notesRow?.room_notes });
  const { ids, fromGuide } = visitOrder(tour.guide_path, list);
  const byId = new Map(list.map((r) => [r.id, r]));
  // Plan pokriva prvih MAX_PLAN_ROOMS soba obilaska; ostale se pišu bez plana.
  const planIds = ids.slice(0, MAX_PLAN_ROOMS);
  const ordered = planIds.map((id) => byId.get(id)!);

  // Slike po PLAN_FETCH_CONCURRENCY odjednom (originali bez kopije za telefon
  // su i po 12 MB). Soba bez panorame (ili čija slika ne stigne) dobija samo
  // tekst "Image N: (no image)", da brojevi slika i soba ostanu isti.
  const images: (Awaited<ReturnType<typeof fetchPanorama>> | null)[] = [];
  for (let i = 0; i < ordered.length; i += PLAN_FETCH_CONCURRENCY) {
    const batch = await Promise.all(
      ordered.slice(i, i + PLAN_FETCH_CONCURRENCY).map(async (r) => {
        const url = r.panorama_url_mobile || r.panorama_url_cf || r.panorama_url;
        if (!url) return null;
        try {
          return await fetchPanorama(url, PLAN_IMAGE_WIDTH);
        } catch {
          return null;
        }
      })
    );
    images.push(...batch);
  }

  const titleOf = (t: unknown) => {
    const text = extractText(t).trim();
    return isPlaceholderTitle(text) ? '' : text;
  };
  const prompt = buildTourPlanPrompt({
    listingType,
    facts: roomFactsFromTour({ ...tour, structure: tour.structure ? structureLabel(String(tour.structure)) : null }),
    listingText: stripOffLimits(extractText(tour.about_text_i18n).trim()).slice(0, 700),
    tourNotes: notes.notes,
    rooms: ordered.map((r) => ({ title: titleOf(r.title_i18n), note: notes.roomNotes[r.id] ?? '' }))
  });

  const parts = images.flatMap((img, i) =>
    img
      ? [{ text: `Image ${i + 1}:` }, { inlineData: { mimeType: img.contentType, data: img.base64 } }]
      : [{ text: `Image ${i + 1}: (no image for this room)` }]
  );

  const { data, usedModel } = await generateJsonWithRetry<unknown>({
    contents: [...parts, { text: prompt }],
    config: { responseMimeType: 'application/json', responseSchema: planSchema, temperature: TEMP_GROUNDED },
    model: GEMINI_FALLBACK_MODEL,
    fallbackModel: GEMINI_MODEL,
    // Jedan pokušaj po modelu, u roku rute: plan je dodatak, a "AI sve sobe"
    // bez njega radi i dalje - bolje brz neuspeh nego 504 posle minut.
    attempts: 1,
    timeoutMs: PLAN_TIMEOUT_MS,
    deadlineAt: started + 55_000,
    label: 'AI plan ture'
  });

  const plan = mapPlanToRooms(data, planIds);
  if (!Object.keys(plan).length) {
    return NextResponse.json({ success: false, error: 'AI nije vratio upotrebljiv plan ture.' }, { status: 502 });
  }
  return NextResponse.json({ success: true, plan, order: ids, fromGuide, model: usedModel });
}
