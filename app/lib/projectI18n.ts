import type { UnitStatus } from './projects';

/**
 * Tekst strane projekta novogradnje na srpskom i engleskom
 * (/novogradnja/[slug] i /en/novogradnja/[slug], i ugradnja). Podaci
 * stanova (struktura, orijentacija) unose se na srpskom, pa se ovde
 * prevode rečnikom; nepoznata vrednost ostaje kako je upisana.
 */

export type ProjectLang = 'sr' | 'en';

export const PROJECT_TEXT = {
  sr: {
    newBuild: 'Novogradnja',
    pickFloor: 'Izaberite sprat',
    pickFloorHint: 'Kliknite na sprat na zgradi ili u spisku.',
    pickFloorList: 'Izaberite sprat iz spiska.',
    pickUnit: 'Izaberite stan',
    pickUnitHint: 'Kliknite na stan u osnovi ili u spisku.',
    pickUnitList: 'Izaberite stan iz spiska.',
    building: '← Zgrada',
    floorDown: 'Sprat niže',
    floorUp: 'Sprat više',
    units: 'stanova',
    free: 'slobodnih',
    moveIn: 'useljenje',
    freeShort: (n: number) => `${n} slob.`,
    freeLong: (n: number) => `${n} slobodno`,
    none: 'nema',
    from: (p: string) => `od ${p}`,
    unitsCount: (n: number) => `${n} stanova`,
    investor: 'Investitor',
    structure: 'Struktura',
    all: 'Svi',
    priceTo: 'Cena do',
    areaFrom: 'Kvadratura od',
    any: 'bilo koja',
    unit: 'Stan',
    area: 'Površina',
    terrace: 'Terasa',
    orientation: 'Orijentacija',
    price: 'Cena',
    perSqm: 'po m²',
    onRequest: 'na upit',
    soldNote: 'Stan je prodat',
    walk: 'Prošetajte kroz stan',
    viewFrom: (f: string) => `Pogled sa ${f}`,
    ask: 'Raspitaj se za ovaj stan',
    notifyMe: 'Javite mi ako se oslobodi',
    name: 'Ime i prezime',
    contact: 'Telefon ili e-mail',
    message: 'Poruka',
    msgDefault: (code: string) => `Zanima me stan ${code}. Kada može razgledanje?`,
    msgReserved: (code: string) => `Javite mi ako se stan ${code} oslobodi.`,
    send: 'Pošalji upit',
    sending: 'Šaljemo...',
    sent: '✓ Upit je poslat. Prodaja vam se javlja uskoro.',
    failed: 'Upit nije poslat. Pokušajte ponovo.',
    offline: 'Nema veze sa serverom. Proverite internet.',
    otherUnits: '← Ostali stanovi na spratu',
    noMatch: 'Nijedan stan ne odgovara filteru.',
    progress: 'Gradilište',
    progressTitle: 'Gradilište po mesecima',
    progressOpen: 'Obiđite gradilište u 360°',
    soon: 'Stanovi za ovaj projekat uskoro će biti objavljeni.',
    sales: 'Prodaja',
    credit: 'Izbor stana i 360° ture: Kvadrat360',
    floorList: 'Izaberite sprat',
    statusFilter: 'Struktura',
    nearbyNav: 'Okolina',
    nearbyTitle: 'Šta je u blizini',
    nearbyNote: 'Škole, vrtići, prodavnice i prevoz - i koliko je to peške od zgrade.',
    walkMin: 'min peške',
    nearbySource: 'Podaci o okolini: © OpenStreetMap saradnici. Udaljenost je vazdušnom linijom, preračunata u minute hoda.',
    tabPlan: 'Osnova',
    tab360: '360° tura',
    tab3d: '3D osnova',
    tabPhotos: 'Slike',
    fullscreen: 'Preko celog ekrana ↗',
    roomsTitle: 'Prostorije',
    roomsTotal: 'Ukupno',
    pdf: 'PDF letak stana',
    photoOf: (i: number, n: number) => `${i} / ${n}`,
    payOpen: 'Izračunajte plan plaćanja',
    payTitle: 'Plan plaćanja',
    payDeposit: 'Učešće',
    payInstallments: 'Rate investitoru',
    payLoan: 'Stambeni kredit',
    payMonths: 'Broj rata',
    payTerm: 'Rok kredita',
    payYears: (n: number) => `${n} god.`,
    payInterest: 'Kamata godišnje',
    payNow: 'Odmah (učešće)',
    payRest: 'Ostatak',
    payMonthly: 'mesečno',
    payNote: 'Informativni obračun. Tačne uslove plaćanja dogovarate sa prodajom, a kredit sa bankom.',
    pickBuilding: 'Izaberite zgradu',
    pickBuildingHint: 'Kliknite na zgradu na slici ili u spisku.',
    pickBuildingList: 'Izaberite zgradu.',
    complex: '← Ceo kompleks',
    backToBuilding: '← Nazad na zgradu',
    floorPlan: 'Osnova sprata →',
    pickOnFacade: 'Kliknite na stan ili sprat na zgradi, ili izaberite iz spiska.',
    pickUnitOnFacade: 'Kliknite na stan na zgradi - boja pokazuje da li je slobodan.',
    rotatePrev: 'Prethodni pogled na zgradu',
    rotateNext: 'Sledeći pogled na zgradu',
    viewMode: 'Prikaz',
    tabBuilding: 'Zgrada',
    tabComplex: 'Kompleks',
    tabList: 'Lista stanova',
    buildingCol: 'Zgrada',
    floor: 'Sprat',
    statusCol: 'Status',
    onlyFree: 'Samo slobodni',
    shownOf: (n: number, total: number) => (n === total ? `Ukupno ${total} ${srPlural(total, 'stan', 'stana', 'stanova')}` : `Prikazano ${n} od ${total}`)
  },
  en: {
    newBuild: 'New development',
    pickFloor: 'Choose a floor',
    pickFloorHint: 'Click a floor on the building or in the list.',
    pickFloorList: 'Choose a floor from the list.',
    pickUnit: 'Choose an apartment',
    pickUnitHint: 'Click an apartment on the floor plan or in the list.',
    pickUnitList: 'Choose an apartment from the list.',
    building: '← Building',
    floorDown: 'Floor down',
    floorUp: 'Floor up',
    units: 'apartments',
    free: 'available',
    moveIn: 'move-in',
    freeShort: (n: number) => `${n} avail.`,
    freeLong: (n: number) => `${n} available`,
    none: 'none',
    from: (p: string) => `from ${p}`,
    unitsCount: (n: number) => `${n} apartments`,
    investor: 'Developer',
    structure: 'Layout',
    all: 'All',
    priceTo: 'Price up to',
    areaFrom: 'Size from',
    any: 'any',
    unit: 'Apartment',
    area: 'Size',
    terrace: 'Terrace',
    orientation: 'Orientation',
    price: 'Price',
    perSqm: 'per m²',
    onRequest: 'on request',
    soldNote: 'This apartment is sold',
    walk: 'Walk through the apartment',
    viewFrom: (f: string) => `View from the ${f}`,
    ask: 'Ask about this apartment',
    notifyMe: 'Let me know if it becomes available',
    name: 'Full name',
    contact: 'Phone or email',
    message: 'Message',
    msgDefault: (code: string) => `I am interested in apartment ${code}. When can I see it?`,
    msgReserved: (code: string) => `Please let me know if apartment ${code} becomes available.`,
    send: 'Send inquiry',
    sending: 'Sending...',
    sent: '✓ Your inquiry has been sent. The sales team will contact you soon.',
    failed: 'The inquiry was not sent. Please try again.',
    offline: 'No connection to the server. Check your internet.',
    otherUnits: '← Other apartments on this floor',
    noMatch: 'No apartment matches the filter.',
    progress: 'Construction',
    progressTitle: 'Construction month by month',
    progressOpen: 'Visit the site in 360°',
    soon: 'Apartments for this project will be published soon.',
    sales: 'Sales',
    credit: 'Apartment selector and 360° tours: Kvadrat360',
    floorList: 'Choose a floor',
    statusFilter: 'Layout',
    nearbyNav: 'Area',
    nearbyTitle: 'What is nearby',
    nearbyNote: 'Schools, kindergartens, shops and transport - and how far they are on foot.',
    walkMin: 'min walk',
    nearbySource: 'Area data: © OpenStreetMap contributors. Straight-line distance, converted to walking minutes.',
    tabPlan: 'Floor plan',
    tab360: '360° tour',
    tab3d: '3D plan',
    tabPhotos: 'Photos',
    fullscreen: 'Full screen ↗',
    roomsTitle: 'Rooms',
    roomsTotal: 'Total',
    pdf: 'Apartment PDF sheet',
    photoOf: (i: number, n: number) => `${i} / ${n}`,
    payOpen: 'Calculate a payment plan',
    payTitle: 'Payment plan',
    payDeposit: 'Down payment',
    payInstallments: 'Developer instalments',
    payLoan: 'Mortgage',
    payMonths: 'Instalments',
    payTerm: 'Loan term',
    payYears: (n: number) => `${n} yrs`,
    payInterest: 'Interest per year',
    payNow: 'Now (down payment)',
    payRest: 'Remaining',
    payMonthly: 'per month',
    payNote: 'For information only. Payment terms are agreed with the sales team, mortgage terms with your bank.',
    pickBuilding: 'Choose a building',
    pickBuildingHint: 'Click a building in the image or in the list.',
    pickBuildingList: 'Choose a building.',
    complex: '← Whole complex',
    backToBuilding: '← Back to the building',
    floorPlan: 'Floor plan →',
    pickOnFacade: 'Click an apartment or a floor on the building, or choose from the list.',
    pickUnitOnFacade: 'Click an apartment on the building - the colour shows whether it is available.',
    rotatePrev: 'Previous view of the building',
    rotateNext: 'Next view of the building',
    viewMode: 'View',
    tabBuilding: 'Building',
    tabComplex: 'Complex',
    tabList: 'Apartment list',
    buildingCol: 'Building',
    floor: 'Floor',
    statusCol: 'Status',
    onlyFree: 'Available only',
    shownOf: (n: number, total: number) => (n === total ? `${total} ${total === 1 ? 'apartment' : 'apartments'} in total` : `Showing ${n} of ${total}`)
  }
} as const;

export type ProjectText = (typeof PROJECT_TEXT)[ProjectLang];

const STATUS: Record<ProjectLang, Record<UnitStatus, string>> = {
  sr: { available: 'Slobodan', reserved: 'Rezervisan', sold: 'Prodat' },
  en: { available: 'Available', reserved: 'Reserved', sold: 'Sold' }
};

export const statusLabel = (s: UnitStatus, lang: ProjectLang) => STATUS[lang][s];

/** Naziv sprata. Ručni naziv iz admina je na srpskom, pa važi samo za srpsku stranu. */
export function floorLabel(level: number, label: string | null | undefined, lang: ProjectLang): string {
  if (lang === 'sr') {
    if (label && label.trim()) return label.trim();
    return level === 0 ? 'Prizemlje' : level < 0 ? 'Podrum' : `${level}. sprat`;
  }
  if (level === 0) return 'Ground floor';
  if (level < 0) return 'Basement';
  const suffix = level % 10 === 1 && level % 100 !== 11 ? 'st' : level % 10 === 2 && level % 100 !== 12 ? 'nd' : level % 10 === 3 && level % 100 !== 13 ? 'rd' : 'th';
  return `${level}${suffix} floor`;
}

/** "Pogled sa 3. sprata" / "View from the 3rd floor". */
export function floorFrom(level: number, label: string | null | undefined, lang: ProjectLang): string {
  if (lang === 'en') return floorLabel(level, null, 'en').replace(/^G/, 'g');
  if (label && label.trim()) return label.trim().toLowerCase();
  return level === 0 ? 'prizemlja' : `${level}. sprata`;
}

const STRUCTURE_EN: Record<string, string> = {
  garsonjera: 'Studio',
  jednosoban: 'One-room',
  jednoiposoban: 'One-and-a-half-room',
  dvosoban: 'Two-room',
  dvoiposoban: 'Two-and-a-half-room',
  trosoban: 'Three-room',
  troiposoban: 'Three-and-a-half-room',
  četvorosoban: 'Four-room',
  cetvorosoban: 'Four-room',
  petosoban: 'Five-room',
  penthaus: 'Penthouse',
  lokal: 'Commercial unit',
  dupleks: 'Duplex'
};

const ORIENTATION_EN: Record<string, string> = {
  sever: 'North',
  jug: 'South',
  istok: 'East',
  zapad: 'West',
  severoistok: 'Northeast',
  severozapad: 'Northwest',
  jugoistok: 'Southeast',
  jugozapad: 'Southwest'
};

/** Struktura sa srpskog ("Dvosoban", "Dvosoban (2.0)") na engleski; nepoznato ostaje. */
export function structureText(value: string | null, lang: ProjectLang): string | null {
  if (!value || lang === 'sr') return value;
  const key = value.toLowerCase().replace(/\(.*?\)/g, '').replace(/\s+/g, '').trim();
  return STRUCTURE_EN[key] ?? value;
}

/** Orijentacija ("Jug", "Jug–istok", "jugozapad") na engleski; nepoznato ostaje. */
export function orientationText(value: string | null, lang: ProjectLang): string | null {
  if (!value || lang === 'sr') return value;
  const parts = value.split(/\s*[-–—/,]\s*|\s+/).filter(Boolean);
  const mapped = parts.map((p) => ORIENTATION_EN[p.toLowerCase()]);
  if (mapped.every(Boolean)) return mapped.join('–');
  const whole = ORIENTATION_EN[value.toLowerCase().replace(/[\s–—-]/g, '')];
  return whole ?? value;
}

export function formatPrice(n: number | null | undefined, lang: ProjectLang): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '—';
  return `${Math.round(Number(n)).toLocaleString(lang === 'en' ? 'en-GB' : 'sr-RS')} €`;
}

export function formatArea(n: number | null | undefined, lang: ProjectLang): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  return `${Number.isInteger(v) ? v : v.toLocaleString(lang === 'en' ? 'en-GB' : 'sr-RS', { maximumFractionDigits: 2 })} m²`;
}

/** Oznaka za merenje (site_events.target: samo [a-z0-9_:-], do 80 znakova). */
export function trackKey(prefix: string, slug: string, code?: string): string {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  const parts = [prefix, clean(slug).slice(0, 50)];
  if (code !== undefined) parts.push(clean(code).slice(0, 20) || 'x');
  return parts.join(':').slice(0, 80);
}

/** Srpska množina: 1 upit, 2 upita, 5 upita (11-14 uvek treći oblik). */
export function srPlural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
