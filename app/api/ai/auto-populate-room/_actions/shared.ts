import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { structureLabel } from '@/app/lib/propertyTaxonomy';

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

type ListingType = 'sale' | 'rent' | 'booking';
const LISTING_TYPES: ListingType[] = ['sale', 'rent', 'booking'];

export function getClientStrategy(listingType: ListingType): string {
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
export type RoomContext = {
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
 * tip oglasa, naziv sobe, podaci o stanu i ostale sobe sa njihovom naracijom.
 *
 * Tip oglasa određuje kome se soba obraća - kupcu, podstanaru ili gostu. Prvo
 * se uzima onaj koji je poslao frontend, pa iz baze, i tek ako ni to ne uspe
 * 'rent' (pretpostavka je bolja od praznog teksta). Ako čitanje baze ne uspe,
 * AI popuna i dalje radi - samo bez konteksta, kao ranije.
 */
export async function loadRoomContext(roomId: string, providedListingType: unknown): Promise<RoomContext> {
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

export async function fetchPanorama(panoramaUrl: string) {
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
