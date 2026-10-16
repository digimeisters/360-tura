import type {
  BuildType,
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
  // Prizemlje: oglasi u KG ~13% jeftiniji od 1-3. sprata za slične stanove
  // (696 oglasa, 4zida, 15. 10. 2026) - vlasnik odobrio −10%.
  ground: 0.9,
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
 * Izmereno na 222 oglasa za izdavanje stanova u KG (4zida, 15. 10. 2026),
 * poređenjem sličnih stanova (isto naselje, sobe, stanje): polunamešteno
 * −10%, prazno −18%. Strana čita vrednosti odavde.
 */
export const FURNISHING_MULTIPLIER: Record<ValuationFurnishing, number> = {
  furnished: 1.0,
  semi_furnished: 0.9,
  unfurnished: 0.82
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

/** Red cena za ceo grad (scripts/refresh-valuation-prices.mjs) - nije naselje. */
export const CITY_ROW = 'Ceo grad';

/**
 * Koja cena po m² važi za ovu nekretninu: stan na prodaju se deli na
 * novogradnju (stanje 'new_build') i starogradnju (vlasnik, 16. 10. 2026);
 * kuće, lokali i kirije imaju zajedničku cenu ('any').
 */
export function buildTypeFor(propertyType: ValuationPropertyType, listingType: ValuationListingType, condition: ValuationCondition): BuildType {
  if (propertyType !== 'apartment' || listingType !== 'sale') return 'any';
  return condition === 'new_build' ? 'new' : 'old';
}

/**
 * Cena za naselje. Za traženu vrstu gradnje (pa za 'any' ako za nju nema
 * nijednog reda): tačan red za naselje -> red "Ceo grad" -> prosek redova
 * naselja -> null. Poređenje je bez obzira na velika/mala slova. Kad nema
 * ni jednog reda, procena se NE računa (nema izmišljanja cena). Prodajne
 * cene se nikad ne mešaju sa kirijama.
 */
export function resolveBaseline(
  rows: readonly PriceBaseline[],
  city: string,
  neighborhood: string,
  propertyType: ValuationPropertyType,
  listingType: ValuationListingType,
  buildType: BuildType = 'any'
): ResolvedBaseline | null {
  const norm = (value: string) => value.trim().toLowerCase();
  const cityRows = rows.filter(
    (row) =>
      norm(row.city) === norm(city) &&
      row.property_type === propertyType &&
      (row.listing_type ?? 'sale') === listingType
  );

  const pick = (build: BuildType): ResolvedBaseline | null => {
    const pool = cityRows.filter((row) => (row.build_type ?? 'any') === build);
    if (pool.length === 0) return null;
    const of = (row: PriceBaseline, source: ResolvedBaseline['source']): ResolvedBaseline => ({
      pricePerSqmLow: Number(row.price_per_sqm_low),
      pricePerSqmHigh: Number(row.price_per_sqm_high),
      source,
      build
    });
    const exact = pool.find((row) => norm(row.neighborhood) === norm(neighborhood) && norm(row.neighborhood) !== norm(CITY_ROW));
    if (exact) return of(exact, 'exact');
    const wholeCity = pool.find((row) => norm(row.neighborhood) === norm(CITY_ROW));
    if (wholeCity) return of(wholeCity, 'city_average');
    const sum = pool.reduce(
      (acc, row) => ({ low: acc.low + Number(row.price_per_sqm_low), high: acc.high + Number(row.price_per_sqm_high) }),
      { low: 0, high: 0 }
    );
    return { pricePerSqmLow: sum.low / pool.length, pricePerSqmHigh: sum.high / pool.length, source: 'city_average', build };
  };

  return pick(buildType) ?? (buildType === 'any' ? null : pick('any'));
}

/**
 * Množilac stanja. Uz cenu novogradnje je 1 (cena je već za novu zgradu);
 * uz cenu starogradnje ili zajedničku važi tabela iznad (novogradnja +15%
 * ostaje samo za kuće, lokale i kirije).
 */
export function conditionMultiplier(condition: ValuationCondition, baselineBuild: BuildType): number {
  return baselineBuild === 'new' ? 1 : CONDITION_MULTIPLIER[condition];
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
  baseline: Pick<ResolvedBaseline, 'pricePerSqmLow' | 'pricePerSqmHigh' | 'build'>,
  input: EstimateInput
): EstimateResult {
  const extras = 1 + (input.hasParking ? PARKING_BONUS : 0) + (input.hasTerrace ? TERRACE_BONUS : 0);
  const factor =
    conditionMultiplier(input.condition, baseline.build) *
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
