/**
 * Cena NEKRETNINE za prikaz (kartice na /ture i početnoj, uvodni ekran
 * ture). Nije isto što i cenovnik usluge (lib/pricing.ts).
 *
 * `tours.price` je broj u evrima, a njegovo značenje zavisi od vrste oglasa
 * (vidi lib/tourNumbers.ts): ukupna cena kod prodaje, mesečna kod
 * izdavanja, po noćenju kod smeštaja - zato uz iznos ide i jedinica, inače
 * bi "450 €" za kiriju i "450 €" za noćenje izgledali isto.
 */

export type ListingCategory = 'sale' | 'rent' | 'booking';
export type ListingPriceLang = 'sr' | 'en' | 'de' | 'ru';

export type ListingPrice = {
  /** "85.000 €" / "€85,000" */
  amount: string;
  /** "/ mesečno", "/ noć" - null kod prodaje. */
  unit: string | null;
};

const UNITS: Record<Exclude<ListingCategory, 'sale'>, Record<ListingPriceLang, string>> = {
  rent: { sr: '/ mesečno', en: '/ month', de: '/ Monat', ru: '/ месяц' },
  booking: { sr: '/ noć', en: '/ night', de: '/ Nacht', ru: '/ ночь' }
};

const LOCALES: Record<ListingPriceLang, string> = {
  sr: 'sr-RS',
  en: 'en-US',
  de: 'de-DE',
  ru: 'ru-RU'
};

function asNumber(value: unknown): number | null {
  const n = typeof value === 'string' ? Number.parseFloat(value) : typeof value === 'number' ? value : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Null kad cena nije upisana ili nije broj - tada se ništa ne prikazuje. */
export function formatListingPrice(
  price: unknown,
  category: string | null | undefined,
  lang: string
): ListingPrice | null {
  const value = asNumber(price);
  if (value === null) return null;

  const l: ListingPriceLang = lang in LOCALES ? (lang as ListingPriceLang) : 'sr';
  const number = Math.round(value).toLocaleString(LOCALES[l]);
  // Nelomivi razmak između broja i znaka, da se "€" ne prelomi sam u red.
  const amount = l === 'en' ? `€${number}` : `${number} €`;
  const unit = category === 'rent' || category === 'booking' ? UNITS[category][l] : null;

  return { amount, unit };
}

/** Samo jedinica ("/ mesečno", "/ noć"), npr. uz vrednosti klizača cene. */
export function listingPriceUnit(category: string | null | undefined, lang: string): string | null {
  if (category !== 'rent' && category !== 'booking') return null;
  const l: ListingPriceLang = lang in LOCALES ? (lang as ListingPriceLang) : 'sr';
  return UNITS[category][l];
}
