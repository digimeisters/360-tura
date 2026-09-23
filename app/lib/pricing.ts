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
 * Prikaz cene: dinari na srpskoj strani (lokalno tržište plaća u dinarima),
 * evri na engleskoj (strani kupci i dijaspora i dalje misle u evrima - ne
 * konvertujemo njima ništa). Cenovnik se zadaje u evrima (PRICE_TIERS), a
 * funkcije display* ispod ga prevode u ono što posetilac vidi napisano.
 */

/**
 * Kurs za pretvaranje u dinare. NIJE tačan kurs Narodne banke (taj se menja
 * iz dana u dan) - fiksan i zaokružen, ostavlja malu rezervu, pa cena u
 * dinarima ne prati svaki pomak kursa. Menja se ručno, po dogovoru.
 */
export const RSD_PER_EUR = 120;

/** Dinarski iznos, zaokružen na najbližih 500 - uvek "okrugla" cena. */
export function toRSD(eurAmount: number): number {
  return Math.round((eurAmount * RSD_PER_EUR) / 500) * 500;
}

/**
 * Jezik prikaza cene. Namerno običan tip, ne `HomeLang` iz lib/homeCopy.ts -
 * taj fajl uvozi odavde, pa obrnut uvoz pravi krug.
 */
export type PriceLang = 'sr' | 'en';

/*
 * CENE ZA PRIKAZ (valuta posetioca).
 *
 * Svaka STAVKA (tura, HDR) se pretvara u valutu prikaza i
 * zaokružuje ZA SEBE, pa se tek onda primenjuje promo, a svi zbirovi (paket,
 * kartica za 3 ture, kalkulator) se sabiraju od tih već zaokruženih stavki.
 * Ranije se u evrima prvo sabiralo pa tek onda pretvaralo u dinare, pa se
 * stavke nisu sabirale u prikazani zbir, a kartica "3 ture" i kalkulator
 * su za isti obim pokazivali različit iznos (16.000 naspram 3 × 5.500).
 *
 * Na engleskoj strani (evri) ovo daje iste brojeve kao ranije.
 */

/**
 * Zaokruživanje PROMO iznosa. Redovne dinarske cene su na 500 (toRSD), ali
 * popust od 30% zaokružen na 500 bi stvarni pad pomerao na 25-33% po stavci,
 * pa se promo cene zaokružuju na 100 - popust tako ostaje oko 30%.
 */
function roundForDisplay(amount: number, lang: PriceLang): number {
  return lang === 'sr' ? Math.round(amount / 100) * 100 : Math.round(amount);
}

/** Evro iznos u valuti prikaza: dinari (zaokruženo na 500) ili evri. */
export function inDisplayCurrency(eurAmount: number, lang: PriceLang): number {
  return lang === 'sr' ? toRSD(eurAmount) : eurAmount;
}

function applyPromo(amount: number, lang: PriceLang, promoActive: boolean): number {
  if (!promoActive) return amount;
  // toFixed skida grešku pokretnog zareza: 5500 * 0.7 = 3849.9999..., što bi
  // se zaokružilo na 3.800 umesto na 3.900.
  return roundForDisplay(Number((amount * (1 - PROMO.discount)).toFixed(6)), lang);
}

/** Tura (sa premium dodatkom, ako je Premium), u valuti prikaza. */
export function displayTourPrice(
  tier: PriceTier,
  pkg: PackageType,
  lang: PriceLang,
  promoActive = false
): number {
  // Premium tura se pretvara kao jedna stavka (tura + dodatak), ne kao dve
  // zaokružene - inače bi dva zaokruživanja na 500 napumpala cenu.
  const base =
    inDisplayCurrency(tier.tour + (pkg === 'premium' ? PREMIUM_EXTRA : 0), lang);
  return applyPromo(base, lang, promoActive);
}

/**
 * HDR fotografije KAO DEO PAKETA (uz turu), u valuti prikaza. Idu u promo
 * isto kao tura - vidi standaloneHdrPrice() za fotografije naručene SAME.
 */
export function displayHdrPrice(tier: PriceTier, lang: PriceLang, promoActive = false): number {
  return applyPromo(inDisplayCurrency(tier.hdr, lang), lang, promoActive);
}

/**
 * Za koliko je Premium tura skuplja od Osnovne na datom stepenu - razlika
 * već zaokruženih cena, da se "+X po turi" uvek slaže sa karticama.
 */
export function displayPremiumExtra(tier: PriceTier, lang: PriceLang, promoActive = false): number {
  return (
    displayTourPrice(tier, 'premium', lang, promoActive) - displayTourPrice(tier, 'basic', lang, promoActive)
  );
}

/** Tura + HDR po nekretnini (paket), u valuti prikaza. */
export function displayPerProperty(
  tier: PriceTier,
  pkg: PackageType,
  lang: PriceLang,
  promoActive = false
): number {
  return displayTourPrice(tier, pkg, lang, promoActive) + displayHdrPrice(tier, lang, promoActive);
}

/** Ukupno za dati broj nekretnina (kartice paketa), u valuti prikaza. */
export function displayPackagePrice(
  count: number,
  pkg: PackageType,
  lang: PriceLang,
  promoActive = false
): number {
  return count * displayPerProperty(PRICE_TIERS[tierIndexFor(count)], pkg, lang, promoActive);
}

/**
 * Stvarni popust na CEO paket (tura + HDR), zaokružen na ceo procenat, u
 * valuti te strane. Blizu je PROMO.discount (30%), ali ume da odstupi jer
 * se zaokružuje po stavci. Koristi ga nalepnica na kartici (SaleSticker),
 * da pokaže tačan broj za taj paket, ne paušalnih "−30%".
 */
export function packageDiscountPercent(count: number, pkg: PackageType, lang: PriceLang): number {
  const regular = displayPackagePrice(count, pkg, lang, false);
  const promo = displayPackagePrice(count, pkg, lang, true);
  return regular > 0 ? Math.round(((regular - promo) / regular) * 100) : 0;
}

/** Iznos koji je VEĆ u valuti prikaza, kao tekst ("6.000 din." / "€50"). */
export function formatAmount(amount: number, lang: PriceLang): string {
  if (lang === 'sr') return `${amount.toLocaleString('sr-RS')} din.`;
  // Nelomivi razmak nije potreban ovde - € stoji ispred broja, ne posle.
  return `€${amount}`;
}

/** Evro iznos kao tekst u valuti prikaza. */
export function formatPrice(eurAmount: number, lang: PriceLang): string {
  return formatAmount(inDisplayCurrency(eurAmount, lang), lang);
}
