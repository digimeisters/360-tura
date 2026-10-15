// Tipovi kalkulatora procene vrednosti. Bez uvoza - koristi ih i klijent
// (forma) i server (/api/valuation/estimate).

/** sale = prodajna cena (ukupno, €); rent = mesečna kirija (€/mesec). */
export const VALUATION_LISTING_TYPES = ['sale', 'rent'] as const;
export type ValuationListingType = (typeof VALUATION_LISTING_TYPES)[number];

/** Nameštenost - pita se i računa samo za izdavanje. */
export const VALUATION_FURNISHING = ['furnished', 'semi_furnished', 'unfurnished'] as const;
export type ValuationFurnishing = (typeof VALUATION_FURNISHING)[number];

export const VALUATION_PROPERTY_TYPES = ['apartment', 'house', 'commercial'] as const;
export type ValuationPropertyType = (typeof VALUATION_PROPERTY_TYPES)[number];

export const VALUATION_CONDITIONS = ['needs_renovation', 'maintained', 'renovated', 'new_build'] as const;
export type ValuationCondition = (typeof VALUATION_CONDITIONS)[number];

export const VALUATION_SOURCES = ['organic', 'google_ads', 'facebook', 'referral'] as const;
export type ValuationSource = (typeof VALUATION_SOURCES)[number];

/** Red iz zone_price_baselines (samo kolone koje model koristi). */
export type PriceBaseline = {
  city: string;
  neighborhood: string;
  property_type: ValuationPropertyType;
  /** Za rent su cene u €/m² MESEČNO, za sale ukupna €/m². */
  listing_type: ValuationListingType;
  price_per_sqm_low: number;
  price_per_sqm_high: number;
};

/** Cena po m² koja je stvarno upotrebljena i odakle je došla. */
export type ResolvedBaseline = {
  pricePerSqmLow: number;
  pricePerSqmHigh: number;
  /** exact = red za to naselje; city_average = prosek redova grada za tip. */
  source: 'exact' | 'city_average';
};

export type EstimateInput = {
  listingType: ValuationListingType;
  propertyType: ValuationPropertyType;
  /** Samo za rent; za sale se ignoriše. */
  furnishing?: ValuationFurnishing | null;
  sqm: number;
  condition: ValuationCondition;
  floorNumber?: number | null;
  hasElevator?: boolean | null;
  hasParking: boolean;
  hasTerrace: boolean;
};

export type EstimateResult = {
  low: number;
  high: number;
  currency: 'EUR';
  /** total = prodajna cena; month = kirija mesečno. */
  period: 'total' | 'month';
};

/** Telo POST /api/valuation/estimate. */
export type EstimateRequestBody = {
  listingType: ValuationListingType;
  furnishing?: ValuationFurnishing;
  city: string;
  neighborhood: string;
  propertyType: ValuationPropertyType;
  sqm: number;
  rooms?: number;
  floorNumber?: number;
  hasElevator?: boolean;
  buildYear?: number;
  condition: ValuationCondition;
  hasParking: boolean;
  hasTerrace: boolean;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  source?: string;
  utmCampaign?: string;
};

export type EstimateResponse =
  | {
      success: true;
      /** null kad za lokaciju nema upisanih cena - lead je ipak sačuvan. */
      estimate: EstimateResult | null;
      leadId: string;
    }
  | { success: false; error: string };
