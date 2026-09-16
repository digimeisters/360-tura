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
// Cena važi do MAX_AREA_SQM; za veće ide poseban dogovor (cenovnik za
// dodatnu kvadraturu još nije definisan).

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

/** Iznad ove kvadrature ide poseban dogovor - formula još nije definisana. */
export const MAX_AREA_SQM = 50;

/**
 * Uvodna promocija: popust na SVE cene, i na turu i na fotografije, i u
 * Osnovnom i u Premium paketu. Cilj je što više kontakata sa agencijama i
 * dovoljno tura za bazu, ne marža. Do MAX_AREA_SQM, 45 dana od lansiranja.
 *
 * Popust, a ne "HDR gratis": ko hoće samo turu, bez fotografija, kod gratis
 * fotografija ne bi dobio nikakav popust.
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

/** Najveći broj u kalkulatoru; preko toga je ionako poseban dogovor. */
export const CALC_MAX_COUNT = 20;

/** Od ovog broja kalkulator pominje i poseban predlog. */
export const CUSTOM_OFFER_FROM = 10;

// Vrednosti polja "Paket" u formi za kontakt. Stižu u bazu i na Telegram na
// srpskom, i na engleskoj strani (tamo se samo prikazuju prevedene).
export const CONTACT_PACKAGES = [
  'Pojedinačna tura',
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

/** Cena HDR fotografija po nekretnini. */
export function hdrPrice(tier: PriceTier, promoActive = false): number {
  return withPromo(tier.hdr, promoActive);
}

/**
 * Tura + HDR po nekretnini. Popust se računa po stavci, pa zbir prikazanih
 * stavki uvek daje prikazani ukupan iznos (bez razlike od zaokruživanja).
 */
export function perProperty(tier: PriceTier, pkg: PackageType, promoActive = false): number {
  return tourPrice(tier, pkg, promoActive) + hdrPrice(tier, promoActive);
}

/** Ukupna cena za dati broj nekretnina (kartice paketa - uvek redovna cena). */
export function packagePrice(count: number, pkg: PackageType = 'basic'): number {
  return count * perProperty(PRICE_TIERS[tierIndexFor(count)], pkg);
}

/** Paket u formi za kontakt koji odgovara izboru iz kalkulatora. */
export function contactPackageFor(count: number, pkg: PackageType): (typeof CONTACT_PACKAGES)[number] {
  if (count >= CUSTOM_OFFER_FROM) return CONTACT_PACKAGES[3];
  if (count <= 1) return CONTACT_PACKAGES[0];
  return pkg === 'premium' ? CONTACT_PACKAGES[2] : CONTACT_PACKAGES[1];
}

export type Quote = {
  count: number;
  packageType: PackageType;
  tierIndex: number;
  tier: PriceTier;
  /** Cena same ture, po nekretnini. */
  tourPrice: number;
  /** Cena HDR fotografija, po nekretnini. */
  hdrPrice: number;
  perProperty: number;
  total: number;
  /** Da li je promocija primenjena na ovu ponudu. */
  promoApplied: boolean;
  /** Ukupno bez promocije - za precrtanu cenu. */
  regularTotal: number;
  /** Koliko se uštedi u odnosu na cenu za 1–2 nekretnine (bez promocije). */
  saving: number;
  savingPercent: number;
  /** Sledeći stepen: koliko još nekretnina i kolika je tada cena po nekretnini. */
  next: { needed: number; perProperty: number } | null;
};

export function quote(count: number, pkg: PackageType = 'basic', promoActive = false): Quote {
  const safeCount = Math.min(Math.max(Math.round(count), 1), CALC_MAX_COUNT);
  const tierIndex = tierIndexFor(safeCount);
  const tier = PRICE_TIERS[tierIndex];

  const tour = tourPrice(tier, pkg, promoActive);
  const hdr = hdrPrice(tier, promoActive);
  const price = tour + hdr;
  const total = safeCount * price;

  const regularPrice = perProperty(tier, pkg);
  const entryPrice = perProperty(PRICE_TIERS[0], pkg);
  const fullPrice = safeCount * entryPrice;
  const nextTier = PRICE_TIERS[tierIndex + 1];

  return {
    count: safeCount,
    packageType: pkg,
    tierIndex,
    tier,
    tourPrice: tour,
    hdrPrice: hdr,
    perProperty: price,
    total,
    promoApplied: promoActive,
    regularTotal: safeCount * regularPrice,
    saving: fullPrice - safeCount * regularPrice,
    savingPercent: fullPrice ? Math.round(((fullPrice - safeCount * regularPrice) / fullPrice) * 100) : 0,
    next:
      nextTier && nextTier.min <= CALC_MAX_COUNT
        ? { needed: nextTier.min - safeCount, perProperty: perProperty(nextTier, pkg, promoActive) }
        : null
  };
}
