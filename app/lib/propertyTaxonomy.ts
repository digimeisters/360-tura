/**
 * Zatvorene liste kojima se opisuje nekretnina: tip, struktura i naselje.
 *
 * Stoje na jednom mestu jer ih koriste tri strane koje moraju da se slažu:
 * upitnik (/unos) ih nudi, admin ih ispravlja, a filteri na /ture grupišu
 * ture po njima. Čim bi se ista struktura negde zvala drugačije, filter bi
 * je prikazao kao dve odvojene stavke.
 *
 * Vrednosti se upisuju u bazu kao tekst (tours.structure, tours.district),
 * pa se lista proširuje bez migracije - ali se postojeće stavke NE
 * preimenuju, jer bi zatečene ture ostale na starom nazivu.
 */

export const PROPERTY_TYPES = ['Stan', 'Kuća', 'Poslovni prostor', 'Vikendica', 'Apartman'] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

// Apartman je po strukturi stan - razlikuje se samo namena (stan na dan).
const FLAT_STRUCTURES = [
  'Garsonjera',
  'Jednosoban (1.0)',
  'Jednoiposoban (1.5)',
  'Dvosoban (2.0)',
  'Dvoiposoban (2.5)',
  'Trosoban (3.0)',
  'Troiposoban (3.5)',
  'Četvorosoban (4.0)',
  'Petosoban i veći'
];

/**
 * Struktura zavisi od tipa nekretnine - "dvoiposoban" nema smisla za lokal,
 * a "HoReCa" nema smisla za stan. Zato se drugi meni puni prema prvom.
 */
export const STRUCTURES: Record<string, string[]> = {
  Stan: FLAT_STRUCTURES,
  Apartman: FLAT_STRUCTURES,
  Kuća: ['Prizemna (Pr)', 'Spratna (Pr+1)', 'Višespratna (Pr+2 i više)', 'Dupleks / mezonet u kući'],
  'Poslovni prostor': [
    'Maloprodajni / trgovački',
    'Uslužni / kancelarijski',
    'Ugostiteljski (HoReCa)'
  ],
  Vikendica: ['Montažna', 'Zidana', 'Renovirana stara / etno kuća']
};

/**
 * Sve strukture redom kojim se nude. Filter na /ture po ovome reda pilule:
 * po azbuci bi garsonjera došla između četvorosobnog i dvosobnog stana.
 */
export const STRUCTURE_ORDER: string[] = [
  ...new Set(PROPERTY_TYPES.flatMap((type) => STRUCTURES[type] ?? []))
];

/** Poslednja stavka u meniju naselja - otvara polje za ručni unos. */
export const OTHER_NEIGHBOURHOOD = '__drugo__';

/**
 * Naselja po gradu. Ključ je grad malim slovima, jer se poredi sa onim što
 * je upisano u polju "Grad". Grad koji ovde nema svoju listu i dalje prima
 * naselje upisano rukom - dodaje se kao još jedan ključ.
 */
export const NEIGHBOURHOODS: Record<string, string[]> = {
  kragujevac: [
    'Aerodrom',
    'Bagdala',
    'Bagremar',
    'Beloševac',
    'Bresnica',
    'Centar',
    'Centar preko Lepenice',
    'Centralna radionica',
    'Denino brdo',
    'Erdeč',
    'Erdoglija',
    'Grošnica',
    'Ilićevo',
    'Ilina Voda',
    'Jabučar',
    'Kolonija',
    'Korićani',
    'Košutnjak',
    'Kozujevo',
    'Ljubine livade',
    'Mala Vaga',
    'Male Pčelice',
    'Maršić',
    'Metino brdo',
    'Ozon',
    'Paliluje',
    'Petrovac',
    'Pivara',
    'Potok',
    'Stanovo',
    'Sušica',
    'Šest Topola',
    'Šumarice',
    'Šumski Raj',
    'Vašnjak',
    'Vinogradi',
    'Zvezda',
    'Ždraljica'
  ]
};

export function neighbourhoodsFor(city: string | null | undefined): string[] {
  return NEIGHBOURHOODS[(city || '').trim().toLowerCase()] ?? [];
}
