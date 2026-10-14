/**
 * Obračun plana plaćanja stana u novogradnji: učešće, rate ili kredit,
 * troškovi kupovine (notar, katastar, banka) i povrat PDV-a za prvi stan.
 * Isti obračun koriste kalkulator u kartici stana (PaymentCalculator), PDF
 * letak stana (UnitSheet, preko parametara u adresi - planToQuery/planFromQuery)
 * i samostalni kalkulator /alati/kalkulator-kredita (i starogradnja: porez na prenos).
 *
 * Sve je informativno. Iznosi taksi su po tarifama ispod; menjaju se retko,
 * proveriti ih jednom godišnje zajedno sa kursom (TARIFE_OD).
 */

/** Datum kad su tarife i kurs ispod poslednji put provereni. */
export const TARIFE_OD = '2026-10-14';

/** Kurs za preračun taksi iz dinara (NBS srednji, okvirno). */
export const EUR_RSD = 117.2;

/** PDV na stan u novogradnji: 10 % (sadržan u ceni stana). */
const VAT_RATE = 0.1;

/** Povrat PDV-a za prvi stan (čl. 56a Zakona o PDV): 40 m² za kupca + 15 m² po članu domaćinstva bez stana. */
export const VAT_BUYER_SQM = 40;
export const VAT_MEMBER_SQM = 15;
export const VAT_MAX_MEMBERS = 6;

/**
 * Javnobeležnička tarifa, tarifni broj 1 (sa PDV-om, važi od 19. 7. 2025):
 * nagrada za javnobeležnički zapis prema vrednosti, u dinarima.
 * Solemnizacija ugovora = 60 %, založna izjava = 50 % ovog iznosa.
 */
const NOTARY_STEPS: ReadonlyArray<[upToRsd: number, fee: number]> = [
  [600_000, 12_960],
  [2_500_000, 21_600],
  [5_000_000, 30_240],
  [7_000_000, 43_200],
  [10_000_000, 51_840],
  [14_000_000, 60_480]
];
const NOTARY_OVER_STEP = 2_160; // za svaki započeti milion preko 14 miliona
const NOTARY_MAX = 864_000;
const NOTARY_SOLEMNIZATION = 0.6;
const NOTARY_PLEDGE = 0.5;

/** Tarifa republičkih administrativnih taksi (RGZ), u dinarima - okvirno. */
const CADASTRE_OWNERSHIP = 5_220 + 320; // upis prava svojine + zahtev
const CADASTRE_MORTGAGE_REQUEST = 380;
const CADASTRE_MORTGAGE_STEPS: ReadonlyArray<[upToRsd: number, fee: number]> = [
  [6_000_000, 26_060],
  [30_000_000, 65_140],
  [60_000_000, 130_260],
  [Infinity, 195_370]
];

/**
 * Porez na prenos apsolutnih prava (starogradnja, kupovina od vlasnika): 2,5 %
 * cene. Kupac prvog stana je oslobođen za iste kvadrate kao kod PDV-a
 * (čl. 31a Zakona o porezima na imovinu). Po zakonu ga plaća prodavac, ali ga
 * ugovorom najčešće preuzima kupac - tako ga i prikazujemo.
 */
const TRANSFER_TAX = 0.025;

/** Procena stana za banku - zavisi od banke, okvirno u evrima. */
const BANK_APPRAISAL_EUR = 120;

export const DEPOSITS = [10, 20, 30, 50] as const;
export const MONTHS = [6, 12, 18, 24, 36] as const;
export const YEARS = [15, 20, 25, 30] as const;
export const DEFAULT_RATE = 4.5;

export type PlanMode = 'installments' | 'loan';
/** Od koga se kupuje: investitor (novogradnja, PDV u ceni) ili vlasnik (starogradnja, porez na prenos). */
export type Seller = 'developer' | 'owner';

export type PlanInput = {
  /** Cena stana u evrima, sa PDV-om. */
  price: number;
  /** Površina stana u m² - bez nje nema povrata PDV-a po kvadraturi. */
  areaSqm: number | null;
  deposit: number;
  mode: PlanMode;
  months: number;
  years: number;
  /** Godišnja kamata u procentima. */
  rate: number;
  /** Kupac kupuje prvi stan (pravo na povrat PDV-a). */
  firstHome: boolean;
  /** Članovi domaćinstva bez stana, pored kupca. */
  members: number;
  /** Podrazumevano investitor - kartica stana je uvek novogradnja. */
  seller?: Seller;
};

export type CostKey = 'notaryContract' | 'cadastreOwnership' | 'transferTax' | 'notaryPledge' | 'cadastreMortgage' | 'bankAppraisal';
export type CostItem = { key: CostKey; eur: number };

export type PlanResult = {
  now: number;
  rest: number;
  monthly: number;
  costs: CostItem[];
  costsTotal: number;
  /** Učešće + troškovi kupovine. */
  upfront: number;
  /**
   * m² na koje kupac prvog stana ima olakšicu: povrat PDV-a (novogradnja) ili
   * oslobođenje od poreza na prenos (starogradnja). Null = nema površine ili nije prvi stan.
   */
  vatSqm: number | null;
  vatRefund: number;
};

export const DEFAULT_PLAN: Omit<PlanInput, 'price' | 'areaSqm'> = {
  deposit: 20,
  mode: 'installments',
  months: 18,
  years: 25,
  rate: DEFAULT_RATE,
  firstHome: false,
  members: 0
};

/** Mesečna rata kredita (anuitet). */
function annuity(principal: number, yearlyRatePct: number, years: number): number {
  const n = years * 12;
  const r = yearlyRatePct / 100 / 12;
  if (r <= 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

function step(steps: ReadonlyArray<[number, number]>, valueRsd: number): number {
  for (const [upTo, fee] of steps) if (valueRsd <= upTo) return fee;
  return steps[steps.length - 1][1];
}

/** Nagrada notara za zapis prema vrednosti u evrima, u dinarima. */
function notaryRecordRsd(valueEur: number): number {
  const rsd = valueEur * EUR_RSD;
  const last = NOTARY_STEPS[NOTARY_STEPS.length - 1];
  if (rsd <= last[0]) return step(NOTARY_STEPS, rsd);
  return Math.min(NOTARY_MAX, last[1] + NOTARY_OVER_STEP * Math.ceil((rsd - last[0]) / 1_000_000));
}

const rsdToEur = (rsd: number) => rsd / EUR_RSD;

export function computePlan(input: PlanInput): PlanResult {
  const { price, areaSqm, mode } = input;
  const seller = input.seller ?? 'developer';
  const now = (price * input.deposit) / 100;
  const rest = price - now;
  const monthly = mode === 'installments' ? rest / input.months : annuity(rest, input.rate, input.years);

  const costs: CostItem[] = [
    { key: 'notaryContract', eur: rsdToEur(notaryRecordRsd(price) * NOTARY_SOLEMNIZATION) },
    { key: 'cadastreOwnership', eur: rsdToEur(CADASTRE_OWNERSHIP) }
  ];
  // Kvadrati sa olakšicom za prvi stan (40 m² + 15 m² po članu), ograničeni površinom stana.
  const reliefSqm = input.firstHome && areaSqm && areaSqm > 0 ? Math.min(areaSqm, VAT_BUYER_SQM + VAT_MEMBER_SQM * input.members) : null;

  if (seller === 'owner') {
    const exempt = reliefSqm !== null && areaSqm ? reliefSqm / areaSqm : 0;
    costs.push({ key: 'transferTax', eur: price * TRANSFER_TAX * (1 - exempt) });
  }
  if (mode === 'loan' && rest > 0) {
    costs.push(
      { key: 'notaryPledge', eur: rsdToEur(notaryRecordRsd(rest) * NOTARY_PLEDGE) },
      { key: 'cadastreMortgage', eur: rsdToEur(step(CADASTRE_MORTGAGE_STEPS, rest * EUR_RSD) + CADASTRE_MORTGAGE_REQUEST) },
      { key: 'bankAppraisal', eur: BANK_APPRAISAL_EUR }
    );
  }
  const costsTotal = costs.reduce((s, c) => s + c.eur, 0);

  let vatRefund = 0;
  if (seller === 'developer' && reliefSqm !== null && areaSqm) {
    // PDV je 10 % od cene bez PDV-a, tj. 10/110 cene sa PDV-om.
    vatRefund = ((price * VAT_RATE) / (1 + VAT_RATE)) * (reliefSqm / areaSqm);
  }

  return { now, rest, monthly, costs, costsTotal, upfront: now + costsTotal, vatSqm: reliefSqm, vatRefund };
}

/* ---------- prenos izbora u PDF letak preko adrese ---------- */

const pick = <T extends number>(list: readonly T[], v: number, fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);

export function planToQuery(p: Omit<PlanInput, 'price' | 'areaSqm'>): string {
  const q = new URLSearchParams({ ucesce: String(p.deposit) });
  if (p.mode === 'loan') {
    q.set('kredit', String(p.years));
    q.set('kamata', String(p.rate));
  } else {
    q.set('rate', String(p.months));
  }
  if (p.firstHome) q.set('prvi', String(p.members));
  return q.toString();
}

/** Null kad adresa nema plan (letak bez obračuna). */
export function planFromQuery(q: URLSearchParams): Omit<PlanInput, 'price' | 'areaSqm'> | null {
  const deposit = Number(q.get('ucesce'));
  if (!q.has('ucesce') || !Number.isFinite(deposit)) return null;
  const loan = q.has('kredit');
  const rate = Number(q.get('kamata'));
  const members = Number(q.get('prvi'));
  return {
    deposit: pick(DEPOSITS, deposit, DEFAULT_PLAN.deposit as (typeof DEPOSITS)[number]),
    mode: loan ? 'loan' : 'installments',
    months: pick(MONTHS, Number(q.get('rate')), DEFAULT_PLAN.months as (typeof MONTHS)[number]),
    years: pick(YEARS, Number(q.get('kredit')), DEFAULT_PLAN.years as (typeof YEARS)[number]),
    rate: Number.isFinite(rate) ? Math.min(20, Math.max(0, rate)) : DEFAULT_RATE,
    firstHome: q.has('prvi'),
    members: Number.isFinite(members) ? Math.min(VAT_MAX_MEMBERS, Math.max(0, Math.round(members))) : 0
  };
}
