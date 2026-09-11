import { supabase } from './supabaseClient';
import { pickCoverRoom } from './coverRoom';
import { pickLang, realValue } from '../tour/[slug]/getTourMeta';

/**
 * Objavljene ture za početnu stranu sajta: kartice u "Primeri tura" i kadar
 * u vrhu strane. Čita se anon ključem, pa RLS (migracija 007) ionako vraća
 * samo objavljene - tura "u pripremi" se na sajtu ne pojavljuje.
 */

// Tura čiji se kadar prikazuje u vrhu strane. Ako nije objavljena ili nema
// nijednu sličicu, uzima se objavljena tura sa najviše soba sa sličicom.
export const HERO_TOUR_SLUG = 'stan-gasse-1';

const LANGUAGES = ['sr', 'en', 'de', 'ru'] as const;

// Koliko teksta naracije stane u info-karticu kadra u vrhu strane.
const NARRATION_PREVIEW_CHARS = 150;

export type ShowcaseCategory = 'sale' | 'rent' | 'booking';

export type ShowcaseRoom = {
  id: string;
  title: string;
  previewUrl: string;
  narration: string;
};

export type ShowcaseTour = {
  slug: string;
  title: string;
  agency: string | null;
  category: ShowcaseCategory | null;
  /** Sve sobe ture, i one još bez panorame. */
  roomCount: number;
  /** Jezici na kojima tura ima bar naziv ili naraciju neke sobe. */
  languages: string[];
  coverUrl: string | null;
  coverRoomId: string | null;
  /** Samo sobe koje imaju sličicu, redom obilaska. */
  rooms: ShowcaseRoom[];
};

type TourRow = {
  slug: string;
  title: string | null;
  title_i18n: unknown;
  category: string | null;
  agency_name: string | null;
  created_at: string | null;
};

type RoomRow = {
  id: string;
  tour_slug: string;
  title: string | null;
  title_i18n: unknown;
  preview_url: string | null;
  establish_i18n: unknown;
  order_index: number | null;
};

function asObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function hasText(i18n: unknown, lang: string): boolean {
  const v = asObject(i18n)[lang];
  return typeof v === 'string' && v.trim().length > 0;
}

// Skraćuje na granici reči, da info-kartica ne završi usred reči.
function preview(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : max).replace(/[,;:.\s]+$/, '') + '…';
}

const CATEGORIES: ShowcaseCategory[] = ['sale', 'rent', 'booking'];

// Kad tura nema naziv na traženom jeziku, pickLang pada na srpski.
const FALLBACK_TITLES: Record<string, { tour: string; room: (n: number) => string }> = {
  sr: { tour: 'Virtuelna tura', room: (n) => `Soba ${n}` },
  en: { tour: 'Virtual tour', room: (n) => `Room ${n}` }
};

export async function getShowcaseTours(lang = 'sr'): Promise<ShowcaseTour[]> {
  const fallback = FALLBACK_TITLES[lang] ?? FALLBACK_TITLES.sr;

  // Cast jer types/supabase.ts još ne zna za preview_url (004) i published
  // (007) - ukloniti kad se tipovi regenerišu.
  const { data: tours, error } = await supabase
    .from('tours')
    .select('slug, title, title_i18n, category, agency_name, created_at')
    .eq('published' as never, true as never)
    .order('created_at', { ascending: false })
    .returns<TourRow[]>();

  if (error || !tours?.length) {
    if (error) console.error('[showcaseTours] tours:', error.message);
    return [];
  }

  const { data: rooms, error: roomsErr } = await supabase
    .from('rooms')
    .select('id, tour_slug, title, title_i18n, preview_url, establish_i18n, order_index' as '*')
    .in(
      'tour_slug',
      tours.map((t) => t.slug)
    )
    .order('order_index', { ascending: true })
    .returns<RoomRow[]>();

  if (roomsErr) console.error('[showcaseTours] rooms:', roomsErr.message);

  const byTour = new Map<string, RoomRow[]>();
  for (const room of rooms ?? []) {
    const list = byTour.get(room.tour_slug) ?? [];
    list.push(room);
    byTour.set(room.tour_slug, list);
  }

  return tours.map((tour) => {
    const tourRooms = byTour.get(tour.slug) ?? [];
    const cover = pickCoverRoom(tourRooms);

    const languages = LANGUAGES.filter((l) =>
      tourRooms.some((r) => hasText(r.title_i18n, l) || hasText(asObject(r.establish_i18n).text_i18n, l))
    );

    const category = CATEGORIES.includes(tour.category as ShowcaseCategory)
      ? (tour.category as ShowcaseCategory)
      : null;

    return {
      slug: tour.slug,
      title: realValue(pickLang(tour.title_i18n, lang)) || realValue(tour.title) || fallback.tour,
      agency: realValue(tour.agency_name),
      category,
      roomCount: tourRooms.length,
      languages: languages.length ? [...languages] : ['sr'],
      coverUrl: cover?.preview_url ?? null,
      coverRoomId: cover ? String(cover.id) : null,
      rooms: tourRooms
        .filter((r) => r.preview_url)
        .map((r, i) => ({
          id: String(r.id),
          title: realValue(pickLang(r.title_i18n, lang)) || realValue(r.title) || fallback.room(i + 1),
          previewUrl: r.preview_url as string,
          narration: preview(pickLang(asObject(r.establish_i18n).text_i18n, lang), NARRATION_PREVIEW_CHARS)
        }))
    };
  });
}

/**
 * Tura za kadar u vrhu strane - vidi HERO_TOUR_SLUG. Na stranoj verziji
 * strane (/en) prednost imaju ture koje imaju taj jezik, da engleski
 * posetilac u kadru ne čita srpski tekst.
 */
export function pickHeroTour(tours: ShowcaseTour[], lang = 'sr'): ShowcaseTour | null {
  const usable = tours.filter((t) => t.rooms.length > 0);
  if (!usable.length) return null;

  const inLang = usable.filter((t) => t.languages.includes(lang));
  const pool = lang !== 'sr' && inLang.length ? inLang : usable;

  return (
    pool.find((t) => t.slug === HERO_TOUR_SLUG) ??
    [...pool].sort((a, b) => b.rooms.length - a.rooms.length)[0]
  );
}
