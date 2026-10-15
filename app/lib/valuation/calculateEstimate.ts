import type {
  EstimateInput,
  EstimateResult,
  PriceBaseline,
  ResolvedBaseline,
  ValuationCondition,
  ValuationFurnishing,
  ValuationListingType,
  ValuationPropertyType
} from './types';

/**
 * Čista kalkulacija grube procene - bez baze i bez mreže, da se testira
 * odvojeno od API rute. Model namerno vraća RASPON, ne jednu cifru: u
 * Srbiji nema javne baze stvarnih prodajnih cena, pa bi tačna cifra lagala.
 *
 * Isti model služi za prodaju i za izdavanje - razlikuju se samo cene po m²
 * (prodajne ukupno, odnosno kirija mesečno, svaka u svom redu tabele),
 * zaokruživanje i nameštenost, koja postoji samo kod izdavanja.
 */

export const CONDITION_MULTIPLIER: Record<ValuationCondition, number> = {
  needs_renovation: 0.85,
  maintained: 1.0,
  renovated: 1.1,
  new_build: 1.15
};

/** Množioci sprata (samo stan); izvezeni da ih strana prikaže bez prepisivanja. */
export const FLOOR_MULTIPLIER = {
  ground: 0.95,
  low: 1.0,
  mid: 1.02,
  highWithElevator: 1.02,
  highNoElevator: 0.93
} as const;

export const PARKING_BONUS = 0.03;
export const TERRACE_BONUS = 0.02;

/**
 * Nameštenost (samo izdavanje). Cene za izdavanje u zone_price_baselines se
 * upisuju za NAMEŠTENU nekretninu, pa je namešten 1.00, a ostalo umanjenje.
 * PRETPOSTAVKA (11. 10. 2026) - vrednosti nisu iz specifikacije; vlasnik ih
 * potvrđuje ili menja ovde, strana ih čita odavde.
 */
export const FURNISHING_MULTIPLIER: Record<ValuationFurnishing, number> = {
  furnished: 1.0,
  semi_furnished: 0.93,
  unfurnished: 0.85
};

/**
 * Cene po m² se osvežavaju na svaka 2 meseca (vlasnik, 12. 10. 2026) -
 * npm run prices:refresh. Starije od ovoga: Telegram uz svaki novi zahtev
 * nosi upozorenje (vidi /api/valuation/estimate).
 */
export const PRICE_MAX_AGE_DAYS = 60;

/** Koliko je dana prošlo od najnovijeg osvežavanja među upotrebljenim redovima. */
export function priceAgeDays(updatedAt: readonly (string | null | undefined)[], now = Date.now()): number | null {
  const times = updatedAt.map((v) => (v ? Date.parse(v) : NaN)).filter((t) => Number.isFinite(t));
  if (times.length === 0) return null;
  return Math.floor((now - Math.max(...times)) / 86_400_000);
}

/**
 * Zaokruživanje da procena ne deluje "robotski": prodajna cena na 1.000 €,
 * kirija na 10 € (na 1.000 € bi kirija od 350 € postala 0).
 */
const ROUND_TO: Record<ValuationListingType, number> = { sale: 1000, rent: 10 };

/**
 * Cena za naselje. Redosled: tačan red (grad+naselje+tip+prodaja/izdavanje,
 * bez obzira na velika/mala slova) -> prosek svih redova grada za taj tip
 * i istu vrstu oglasa -> null. Kad nema ni jednog reda, procena se NE
 * računa (nema izmišljanja cena). Prodajne cene se nikad ne mešaju sa
 * kirijama.
 */
export function resolveBaseline(
  rows: readonly PriceBaseline[],
  city: string,
  neighborhood: string,
  propertyType: ValuationPropertyType,
  listingType: ValuationListingType
): ResolvedBaseline | null {
  const norm = (value: string) => value.trim().toLowerCase();
  const cityRows = rows.filter(
    (row) =>
      norm(row.city) === norm(city) &&
      row.property_type === propertyType &&
      (row.listing_type ?? 'sale') === listingType
  );
  if (cityRows.length === 0) return null;

  const exact = cityRows.find((row) => norm(row.neighborhood) === norm(neighborhood));
  if (exact) {
    return {
      pricePerSqmLow: Number(exact.price_per_sqm_low),
      pricePerSqmHigh: Number(exact.price_per_sqm_high),
      source: 'exact'
    };
  }

  const sum = cityRows.reduce(
    (acc, row) => ({
      low: acc.low + Number(row.price_per_sqm_low),
      high: acc.high + Number(row.price_per_sqm_high)
    }),
    { low: 0, high: 0 }
  );
  return {
    pricePerSqmLow: sum.low / cityRows.length,
    pricePerSqmHigh: sum.high / cityRows.length,
    source: 'city_average'
  };
}

/**
 * Množilac sprata. Samo za stanove - kuća i poslovni prostor ga ignorišu.
 * Nepoznat lift na 7. spratu i više računa se kao "bez lifta" (oprezniji
 * kraj raspona).
 */
export function floorMultiplier(
  propertyType: ValuationPropertyType,
  floorNumber: number | null | undefined,
  hasElevator: boolean | null | undefined
): number {
  if (propertyType !== 'apartment') return 1;
  if (floorNumber == null || !Number.isFinite(floorNumber)) return 1;
  if (floorNumber <= 0) return FLOOR_MULTIPLIER.ground;
  if (floorNumber <= 3) return FLOOR_MULTIPLIER.low;
  if (floorNumber <= 6) return FLOOR_MULTIPLIER.mid;
  return hasElevator === true ? FLOOR_MULTIPLIER.highWithElevator : FLOOR_MULTIPLIER.highNoElevator;
}

/** Nameštenost utiče samo na kiriju; nepoznata se računa kao namešteno (osnova). */
export function furnishingMultiplier(
  listingType: ValuationListingType,
  furnishing: ValuationFurnishing | null | undefined
): number {
  if (listingType !== 'rent' || !furnishing) return 1;
  return FURNISHING_MULTIPLIER[furnishing];
}

export function calculateEstimate(
  baseline: Pick<ResolvedBaseline, 'pricePerSqmLow' | 'pricePerSqmHigh'>,
  input: EstimateInput
): EstimateResult {
  const extras = 1 + (input.hasParking ? PARKING_BONUS : 0) + (input.hasTerrace ? TERRACE_BONUS : 0);
  const factor =
    CONDITION_MULTIPLIER[input.condition] *
    floorMultiplier(input.propertyType, input.floorNumber, input.hasElevator) *
    furnishingMultiplier(input.listingType, input.furnishing) *
    extras *
    input.sqm;

  const step = ROUND_TO[input.listingType];
  const round = (value: number) => Math.round(value / step) * step;
  const low = round(baseline.pricePerSqmLow * factor);
  const high = round(baseline.pricePerSqmHigh * factor);

  // Zaokruživanje ne sme da obrne ili spljošti raspon (npr. mali lokal).
  return {
    low,
    high: Math.max(high, low),
    currency: 'EUR',
    period: input.listingType === 'rent' ? 'month' : 'total'
  };
}
