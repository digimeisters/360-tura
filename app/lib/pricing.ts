// Cene na jednom mestu. Odavde čitaju kartice paketa na početnoj
// (lib/homeCopy.ts) i kalkulator (components/PriceCalculator.tsx) - kad se
// cena promeni ovde, promeni se svuda. Bez uvoza, jer ga koristi i klijent.
//
// Cena po nekretnini pada sa brojem nekretnina (za agencije: mesečno).
// Stepeni su izabrani tako da se poklope sa paketima: 3 nekretnine = paket
// Osnovni (3 × 50 = 150 €), 5 nekretnina = paket Premium (5 × 44 = 220 €).

export type PriceTier = {
  /** Od koliko nekretnina važi ovaj stepen. */
  min: number;
  /** 360° tura, po nekretnini (€). */
  tour: number;
  /** HDR fotografije za oglas, po nekretnini (€). */
  hdr: number;
  /** Jezici audio vodiča uključeni u cenu - isto kao u paketima. */
  languages: readonly string[];
};

export const PRICE_TIERS: readonly PriceTier[] = [
  { min: 1, tour: 40, hdr: 20, languages: ['SR'] },
  { min: 3, tour: 34, hdr: 16, languages: ['SR', 'EN'] },
  { min: 5, tour: 30, hdr: 14, languages: ['SR', 'EN', 'DE', 'RU'] },
  { min: 10, tour: 27, hdr: 13, languages: ['SR', 'EN', 'DE', 'RU'] }
];

/** Najveći broj u kalkulatoru; preko toga je ionako poseban dogovor. */
export const CALC_MAX_COUNT = 20;

/** Od ovog broja kalkulator pominje i poseban predlog. */
export const CUSTOM_OFFER_FROM = 10;

// Vrednosti polja "Paket" u formi za kontakt. Stižu u bazu i na Telegram na
// srpskom, i na engleskoj strani (tamo se samo prikazuju prevedene).
export const CONTACT_PACKAGES = [
  'Pojedinačna tura',
  'Agencija — 3 ture mesečno',
  'Agencija — 5 tura mesečno',
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

export function perProperty(tier: PriceTier, withHdr: boolean): number {
  return tier.tour + (withHdr ? tier.hdr : 0);
}

/** Ukupna cena za dati broj nekretnina, sa HDR fotografijama (kartice paketa). */
export function packagePrice(count: number): number {
  return count * perProperty(PRICE_TIERS[tierIndexFor(count)], true);
}

/** Paket u formi za kontakt koji odgovara broju iz kalkulatora. */
export function contactPackageFor(count: number): (typeof CONTACT_PACKAGES)[number] {
  if (count >= CUSTOM_OFFER_FROM) return CONTACT_PACKAGES[3];
  if (count >= 5) return CONTACT_PACKAGES[2];
  if (count >= 3) return CONTACT_PACKAGES[1];
  return CONTACT_PACKAGES[0];
}

export type Quote = {
  count: number;
  withHdr: boolean;
  tierIndex: number;
  tier: PriceTier;
  perProperty: number;
  total: number;
  /** Koliko se uštedi u odnosu na cenu za 1–2 nekretnine. */
  saving: number;
  savingPercent: number;
  /** Sledeći stepen: koliko još nekretnina i kolika je tada cena po nekretnini. */
  next: { needed: number; perProperty: number } | null;
};

export function quote(count: number, withHdr: boolean): Quote {
  const safeCount = Math.min(Math.max(Math.round(count), 1), CALC_MAX_COUNT);
  const tierIndex = tierIndexFor(safeCount);
  const tier = PRICE_TIERS[tierIndex];
  const price = perProperty(tier, withHdr);
  const total = safeCount * price;
  const fullPrice = safeCount * perProperty(PRICE_TIERS[0], withHdr);
  const nextTier = PRICE_TIERS[tierIndex + 1];

  return {
    count: safeCount,
    withHdr,
    tierIndex,
    tier,
    perProperty: price,
    total,
    saving: fullPrice - total,
    savingPercent: fullPrice ? Math.round(((fullPrice - total) / fullPrice) * 100) : 0,
    next:
      nextTier && nextTier.min <= CALC_MAX_COUNT
        ? { needed: nextTier.min - safeCount, perProperty: perProperty(nextTier, withHdr) }
        : null
  };
}
