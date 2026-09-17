// Cene na jednom mestu. Odavde čitaju kartice paketa na početnoj
// (lib/homeCopy.ts), kalkulator (components/PriceCalculator.tsx) i promo
// traka (components/PromoBanner.tsx) - kad se cena promeni ovde, promeni se
// svuda. Bez uvoza, jer ga koristi i klijent.
//
// Cenovnik ima TRI nezavisne ose:
//   1. Stavke     - 360° tura i HDR fotografije se uvek prikazuju odvojeno,
//                   da se vidi šta se plaća (tura 50 € + HDR 20 € = 70 €).
//   2. Paket      - Osnovni (SR + jedan jezik po izboru) ili Premium (sva 4
//                   jezika). Premium je uvek +15 € NA TURU; HDR je isti.
//   3. Obim       - koliko nekretnina mesečno (1-2 / 3-4 / 5-9 / 10+).
//
// Cene su prosek za stan od REFERENCE_AREA_SQM; manji i veći se računaju
// prema broju prostorija, jer posao (snimanje, obrada, naracija po sobi)
// prati broj prostorija, ne kvadraturu.

export type PackageType = 'basic' | 'premium';

export type PriceTier = {
  /** Od koliko nekretnina mesečno važi ovaj stepen. */
  min: number;
  /** 360° tura sa audio vodičem (Osnovni paket), po nekretnini (€). */
  tour: number;
  /** HDR fotografije, jedna po prostoriji, po nekretnini (€). */
  hdr: number;
};

export const PRICE_TIERS: readonly PriceTier[] = [
  { min: 1, tour: 50, hdr: 20 },
  { min: 3, tour: 44, hdr: 18 },
  { min: 5, tour: 39, hdr: 16 },
  { min: 10, tour: 34, hdr: 14 }
];

/** Premium (sva 4 jezika umesto SR + jedan) - dodatak na turu, ne na HDR. */
export const PREMIUM_EXTRA = 15;

/**
 * Kvadratura na koju se odnose objavljene cene - prosečan stan. Nije gornja
 * granica: manji i veći stanovi se računaju prema broju prostorija.
 */
export const REFERENCE_AREA_SQM = 50;

/**
 * Uvodna promocija: popust na CEO PAKET (tura + HDR fotografije zajedno), u
 * Osnovnom i u Premium paketu. Cilj je što više kontakata sa agencijama i
 * dovoljno tura za bazu, ne marža. Traje 45 dana od lansiranja.
 *
 * HDR fotografije NARUČENE SAME, bez ture, u popust ne idu - vidi
 * standaloneHdrPrice(). Bez ovoga bi -30% spustilo samostalnu fotografiju
 * na 14€, dovoljno nisko da agencija poruči samo fotografije umesto cele
 * ture - a to nije cilj promocije.
 */
export const PROMO = {
  /** 0.3 = −30%. */
  discount: 0.3,
  startDate: '2026-09-17',
  endDate: '2026-11-01'
} as const;

/** Cena sa promo popustom, zaokružena na ceo evro. */
export function withPromo(amount: number, promoActive: boolean): number {
  return promoActive ? Math.round(amount * (1 - PROMO.discount)) : amount;
}

export function isPromoActive(now: Date = new Date()): boolean {
  const start = new Date(`${PROMO.startDate}T00:00:00`);
  const end = new Date(`${PROMO.endDate}T23:59:59`);
  return now >= start && now <= end;
}

/** Najveći broj u cenovniku; preko toga je ionako poseban dogovor. */
export const CALC_MAX_COUNT = 20;

// Vrednosti polja "Paket" u formi za kontakt. Stižu u bazu i na Telegram na
// srpskom, i na engleskoj strani (tamo se samo prikazuju prevedene).
export const CONTACT_PACKAGES = [
  'Tura + fotografije',
  'Agencija — Osnovni (SR + jezik po izboru)',
  'Agencija — Premium (SR/EN/DE/RU)',
  'Veći obim (dogovor)'
] as const;

export function tierIndexFor(count: number): number {
  let index = 0;
  PRICE_TIERS.forEach((tier, i) => {
    if (count >= tier.min) index = i;
  });
  return index;
}

/** Poslednji broj koji pripada stepenu, ili null za poslednji stepen. */
export function tierMax(index: number): number | null {
  const next = PRICE_TIERS[index + 1];
  return next ? next.min - 1 : null;
}

/** Cena same ture za dati paket (Premium nosi dodatak za jezike). */
export function tourPrice(tier: PriceTier, pkg: PackageType, promoActive = false): number {
  return withPromo(tier.tour + (pkg === 'premium' ? PREMIUM_EXTRA : 0), promoActive);
}

/**
 * Cena HDR fotografija po nekretnini, KAO DEO PAKETA (uz turu). Ide u promo
 * popust isto kao tura - vidi standaloneHdrPrice() za cenu kad se
 * fotografije naručuju SAME, koja u popust ne ide.
 */
export function hdrPrice(tier: PriceTier, promoActive = false): number {
  return withPromo(tier.hdr, promoActive);
}

/**
 * Cena HDR fotografija kad se naručuju SAME, bez ture - uvek redovna, bez
 * obzira na promociju (vidi PROMO). Koristi je isključivo cenovnik po
 * stavci (komponente/PromoPrice.tsx), gde je fotografija zasebna ponuda, a
 * ne deo paketa.
 */
export function standaloneHdrPrice(tier: PriceTier): number {
  return tier.hdr;
}

/**
 * Tura + HDR po nekretnini, kao PAKET - oba idu u popust, pa ceo paket
 * padne za PROMO.discount (zaokruženo po stavci).
 */
export function perProperty(tier: PriceTier, pkg: PackageType, promoActive = false): number {
  return tourPrice(tier, pkg, promoActive) + hdrPrice(tier, promoActive);
}

/** Ukupna cena za dati broj nekretnina (kartice paketa). */
export function packagePrice(count: number, pkg: PackageType = 'basic', promoActive = false): number {
  return count * perProperty(PRICE_TIERS[tierIndexFor(count)], pkg, promoActive);
}

/**
 * Stvarni popust na CEO paket (tura + HDR), zaokružen na ceo procenat. Blizu
 * je PROMO.discount (30%), ali ume malo da odstupi (npr. 29%) jer se
 * zaokruživanje dešava po stavci (tura i HDR svaka za sebe), pre zbira.
 * Koristi ga nalepnica na kartici paketa (SaleSticker), da uvek pokaže tačan
 * broj za taj paket, ne paušalnih "−30%" na svakom.
 */
export function packageDiscountPercent(count: number, pkg: PackageType = 'basic'): number {
  const regular = packagePrice(count, pkg, false);
  const promo = packagePrice(count, pkg, true);
  return regular > 0 ? Math.round(((regular - promo) / regular) * 100) : 0;
}
