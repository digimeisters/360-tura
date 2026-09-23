import { cache } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { pickCoverRoom } from '../../lib/coverRoom';
import type { Tour } from './types';

export type TourMeta = {
  slug: string;
  title: string;
  agencyName: string | null;
  about: string;
  address: string | null;
  category: string | null;
  propertyType: string | null;
  previewUrl: string | null;
};

// Isti fallback lanac kao getLocalizedText u utils.tsx, ali bez povlačenja
// klijentskih zavisnosti (THEME, React komponente) u server bundle.
export function pickLang(value: unknown, lang = 'sr'): string {
  if (!value) return '';
  let parsed = value;
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

// U bazi se kao "prazna" vrednost sreće i doslovan tekst ("Nema adrese",
// "-", "n/a"), koji bi inače završio odštampan na OG kartici kao da je
// prava adresa.
const PLACEHOLDERS = new Set([
  'nema adrese',
  'nema',
  'nepoznato',
  'n/a',
  'na',
  '-',
  '/',
  '...'
]);

export function realValue(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || PLACEHOLDERS.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

type TourRoomRow = {
  preview_url: string | null;
  title: string | null;
  title_i18n: unknown;
  order_index: number | null;
};

// Kolone tabele osnovnih podataka i FAQ-a (migracije 011-015). Čitaju se za
// tekstualni sažetak ture koji ide u HTML sa servera (TourSeoSummary) - bez
// njega Google na stranici ture vidi samo "Učitavanje ture...".
const DETAIL_COLUMNS = [
  'city',
  'district',
  'structure',
  'area_sqm',
  'price',
  'floor',
  'has_elevator',
  'has_basement',
  'heating',
  'build_status',
  'finish_status',
  'status',
  'created_at',
  'faq_1_i18n',
  'faq_2_i18n',
  'faq_3_i18n',
  'faq_4_i18n',
  'faq_5_i18n'
].join(', ');

/**
 * Sirov red ture za sažetak - isti oblik koji tura koristi u pregledaču
 * (types.ts Tour), da buildFactList radi isto na oba mesta.
 */
export type TourDetails = Tour;

export type TourMetaFull = TourMeta & {
  details: TourDetails;
  /** Nazivi prostorija redom obilaska (srpski). */
  roomTitles: string[];
  createdAt: string | null;
};

// generateMetadata i opengraph-image se izvršavaju odvojeno za isti slug -
// cache() sprečava dupli upit ka Supabase-u u istom renderu.
export const getTourMeta = cache(async (slug: string): Promise<TourMetaFull | null> => {
  // Cast jer types/supabase.ts ne zna za kolone iz migracija 011-015.
  const { data, error } = await supabase
    .from('tours')
    .select(
      `slug, title, title_i18n, agency_name, about_text_i18n, address, category, property_type, ${DETAIL_COLUMNS}` as '*'
    )
    .eq('slug', slug)
    .maybeSingle<Tour & { title: string | null; address: string | null; property_type: string | null; created_at: string | null }>();

  if (error || !data) return null;

  // Cast jer types/supabase.ts još ne zna za preview_url (migracija 004) -
  // ukloniti kad se tipovi regenerišu.
  const { data: rooms } = await supabase
    .from('rooms')
    .select('preview_url, title, title_i18n, order_index' as '*')
    .eq('tour_slug', slug)
    .order('order_index', { ascending: true })
    .returns<TourRoomRow[]>();

  const roomTitles = (rooms ?? [])
    .map((room) => realValue(pickLang(room.title_i18n)) || realValue(room.title))
    .filter((title): title is string => Boolean(title));

  return {
    previewUrl: pickCoverRoom(rooms ?? [])?.preview_url ?? null,
    slug: data.slug,
    title: realValue(pickLang(data.title_i18n)) || realValue(data.title) || 'Virtuelna tura',
    agencyName: realValue(data.agency_name ?? null),
    about: realValue(pickLang(data.about_text_i18n)) || '',
    address: realValue(data.address ?? null),
    category: data.category ?? null,
    propertyType: data.property_type,
    details: data,
    roomTitles: [...new Set(roomTitles)],
    createdAt: data.created_at
  };
});
