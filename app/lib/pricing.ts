// Cene na jednom mestu. Odavde čitaju kartice paketa na početnoj
// (lib/homeCopy.ts) i kalkulator (components/PriceCalculator.tsx) - kad se
// cena promeni ovde, promeni se svuda. Bez uvoza, jer ga koristi i klijent.
//
// Paket (Basic/Premium) i obim (broj nekretnina mesečno) su NEZAVISNE ose:
// Basic = SR + jedan dodatni jezik po izboru agencije; Premium = sva 4
// jezika (SR/EN/DE/RU), fiksno +15€ po turi na svakom stepenu obima. HDR
// fotografije (po sobi) su uvek uključene u cenu - nema više posebnog
// prekidača. Cena važi za nekretnine do MAX_AREA_SQM; za veće ide poseban
// dogovor (cenovnik za dodatnu kvadraturu još nije definisan).

export type PackageType = 'basic' | 'premium';

export type PriceTier = {
  /** Od koliko nekretnina mesečno važi ovaj stepen. */
  min: number;
  /** Basic (SR + jezik po izboru), po nekretnini, sa HDR fotografijama (€). */
  basic: number;
  /** Premium (SR/EN/DE/RU), po nekretnini, sa HDR fotografijama (€). */
  premium: number;
};

export const PRICE_TIERS: readonly PriceTier[] = [
  { min: 1, basic: 70, premium: 85 },
  { min: 3, basic: 62, premium: 77 },
  { min: 5, basic: 55, premium: 70 },
  { min: 10, basic: 48, premium: 63 }
];

/** Iznad ove kvadrature ide poseban dogovor - formula za dodatnu kvadraturu još nije definisana. */
export const MAX_AREA_SQM = 50;

/**
 * Uvodna promocija: Basic paket po fiksnoj ceni, bez obzira na obim, dok
 * traje kampanja - cilj je što više kontakata sa agencijama i dovoljno tura
 * za bazu, ne marža. Basic-only (Premium ostaje po redovnoj ceni), do
 * MAX_AREA_SQM. Trajanje 45 dana od lansiranja.
 */
export const PROMO = {
  packageType: 'basic' as const,
  price: 50,
  maxAreaSqm: MAX_AREA_SQM,
  startDate: '2026-09-17',
  endDate: '2026-11-01'
} as const;

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

export function perProperty(tier: PriceTier, pkg: PackageType): number {
  return pkg === 'premium' ? tier.premium : tier.basic;
}

/** Ukupna cena za dati broj nekretnina (kartice paketa). */
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
  perProperty: number;
  total: number;
  /** Koliko se uštedi u odnosu na cenu za 1–2 nekretnine. */
  saving: number;
  savingPercent: number;
  /** Sledeći stepen: koliko još nekretnina i kolika je tada cena po nekretnini. */
  next: { needed: number; perProperty: number } | null;
};

export function quote(count: number, pkg: PackageType = 'basic'): Quote {
  const safeCount = Math.min(Math.max(Math.round(count), 1), CALC_MAX_COUNT);
  const tierIndex = tierIndexFor(safeCount);
  const tier = PRICE_TIERS[tierIndex];
  const price = perProperty(tier, pkg);
  const total = safeCount * price;
  const fullPrice = safeCount * perProperty(PRICE_TIERS[0], pkg);
  const nextTier = PRICE_TIERS[tierIndex + 1];

  return {
    count: safeCount,
    packageType: pkg,
    tierIndex,
    tier,
    perProperty: price,
    total,
    saving: fullPrice - total,
    savingPercent: fullPrice ? Math.round(((fullPrice - total) / fullPrice) * 100) : 0,
    next:
      nextTier && nextTier.min <= CALC_MAX_COUNT
        ? { needed: nextTier.min - safeCount, perProperty: perProperty(nextTier, pkg) }
        : null
  };
}
