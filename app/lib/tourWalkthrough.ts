/**
 * Sekcija "Kako radi tura" na srpskoj početnoj (vlasnik, 4. 11. 2026; maketa
 * public/mockup/KakoFunkcionisTura.html): telefon sa pravim ekranima ture
 * "Apartman Belgrade Four, Dorćol" (stan-gasse-1) i priča korak po korak -
 * šta kupac dodirne i šta se tada otvori. Od 5. 11. 2026 priča ide sama, kao
 * Instagram priča (skrol verzija je na telefonu preskakala korake).
 *
 * Ekrani su snimci (public/hero/tura-koraci/*.webp, 600x1298, telefon
 * 390x844). Kad se izgled ture promeni, snimaju se ponovo (Playwright,
 * telefon 390x844, DPR 2, pa sharp na 600 px). x/y su mesto dodira kao deo
 * širine i visine snimka.
 */

export type WalkScreen =
  | 'pocetak'
  | 'glas'
  | 'tacke-soba'
  | 'jezik-en'
  | 'jezik-de'
  | 'jezik-ru'
  | 'plan'
  | 'info'
  | 'lokacija'
  | 'pitanja'
  | 'kontakt';

export const WALK_SCREENS: WalkScreen[] = [
  'pocetak',
  'glas',
  'tacke-soba',
  'jezik-en',
  'jezik-de',
  'jezik-ru',
  'plan',
  'info',
  'lokacija',
  'pitanja',
  'kontakt'
];

export type WalkStep = {
  /** Naziv uz telefon. */
  name: string;
  /** Ekran pre dodira i ekran koji se otvori (isti = samo reflektor). */
  base: WalkScreen;
  result: WalkScreen;
  x: number;
  y: number;
  /** Središte reflektora, kad nije na mestu dodira (npr. cela kartica opisa). */
  cx?: number;
  cy?: number;
  /** Veličina reflektora kao deo širine / visine ekrana. */
  rw?: number;
  rh?: number;
  side: 'l' | 'r';
  /** fade = pretapanje, walk = ulazak kroz tačku, sheet = prozor odozdo. */
  mode?: 'fade' | 'walk' | 'sheet';
  /** Prst redom dodiruje dugmad u istom redu (jezici): ekran i x dugmeta. */
  cycle?: [WalkScreen, number][];
  /** Trajanje koraka u ms, kad mu treba više od uobičajenog. */
  dur?: number;
  title: string;
  text: string;
};

export const WALK_STEPS: WalkStep[] = [
  {
    name: 'Vodič', base: 'pocetak', result: 'glas', x: 0.928, y: 0.367, side: 'r', mode: 'fade',
    title: 'Uključite vodiča i *samo slušajte*',
    text: 'Glas vodi kroz svaku prostoriju, a titl prati svaku rečenicu.'
  },
  {
    name: 'Tačka', base: 'pocetak', result: 'tacke-soba', x: 0.815, y: 0.493, side: 'r', mode: 'walk',
    title: 'Dodirnite tačku i *uđite u sobu*',
    text: 'Tačke vode u susednu prostoriju, kao da kupac hoda kroz nekretninu.'
  },
  {
    name: 'Opis', base: 'tacke-soba', result: 'tacke-soba', x: 0.2, y: 0.848, cx: 0.5, cy: 0.875, rw: 0.62, rh: 0.14, side: 'l',
    title: 'Uz svaku sobu *kratak opis*',
    text: 'Par rečenica o onome što se na slici ne vidi.'
  },
  {
    name: 'Jezik', base: 'tacke-soba', result: 'jezik-en', x: 0.754, y: 0.029, side: 'r', mode: 'fade',
    dur: 6600,
    cycle: [['jezik-en', 0.754], ['jezik-de', 0.846], ['jezik-ru', 0.938], ['tacke-soba', 0.662]],
    title: 'Četiri jezika, *jednim dodirom*',
    text: 'Srpski, engleski, nemački ili ruski: menjaju se nazivi, dugmad i opisi.'
  },
  {
    name: 'Plan', base: 'pocetak', result: 'plan', x: 0.681, y: 0.948, side: 'r', mode: 'sheet',
    title: 'Osnova nekretnine, *„ovde ste“*',
    text: 'Kupac uvek zna gde je i dodirom ulazi u bilo koju sobu.'
  },
  {
    name: 'Info', base: 'pocetak', result: 'info', x: 0.5, y: 0.948, side: 'l', mode: 'sheet',
    title: 'Svi podaci *na jednom mestu*',
    text: 'Kvadratura, struktura, sprat, grejanje i lift, bez listanja oglasa.'
  },
  {
    name: 'Lokacija', base: 'pocetak', result: 'lokacija', x: 0.317, y: 0.948, side: 'l', mode: 'sheet',
    title: 'Gde je i *šta je blizu*',
    text: 'Mapa i koliko je peške do prodavnice, škole i autobusa.'
  },
  {
    name: 'Pitanja', base: 'pocetak', result: 'pitanja', x: 0.136, y: 0.948, side: 'l', mode: 'sheet',
    title: 'Pita, a tura *odgovara*',
    text: 'Odgovor stiže iz podataka o nekretnini. Kad ga nema, kupca upućuje na agenta.'
  },
  {
    name: 'Kontakt', base: 'pocetak', result: 'kontakt', x: 0.863, y: 0.948, side: 'r', mode: 'sheet',
    title: 'Javi se *jednim dodirom*',
    text: 'Poziv, mejl ili zakazivanje razgledanja uživo.'
  }
];

export const WALK_TITLE = 'Kupac sam razgleda, a *tura sve objašnjava*';
