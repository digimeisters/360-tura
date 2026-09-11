import { cache } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { pickCoverRoom } from '../../lib/coverRoom';

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

type CoverRoom = {
  preview_url: string | null;
  title: string | null;
  title_i18n: unknown;
  order_index: number | null;
};

// generateMetadata i opengraph-image se izvršavaju odvojeno za isti slug -
// cache() sprečava dupli upit ka Supabase-u u istom renderu.
export const getTourMeta = cache(async (slug: string): Promise<TourMeta | null> => {
  const { data, error } = await supabase
    .from('tours')
    .select('slug, title, title_i18n, agency_name, about_text_i18n, address, category, property_type')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) return null;

  // Cast jer types/supabase.ts još ne zna za preview_url (migracija 004) -
  // ukloniti kad se tipovi regenerišu.
  const { data: rooms } = await supabase
    .from('rooms')
    .select('preview_url, title, title_i18n, order_index' as '*')
    .eq('tour_slug', slug)
    .not('preview_url', 'is', null)
    .order('order_index', { ascending: true })
    .returns<CoverRoom[]>();

  return {
    previewUrl: pickCoverRoom(rooms ?? [])?.preview_url ?? null,
    slug: data.slug,
    title: realValue(pickLang(data.title_i18n)) || realValue(data.title) || 'Virtuelna tura',
    agencyName: realValue(data.agency_name),
    about: realValue(pickLang(data.about_text_i18n)) || '',
    address: realValue(data.address),
    category: data.category,
    propertyType: data.property_type
  };
});
