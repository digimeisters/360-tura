import {
  CONDITION_MULTIPLIER,
  FLOOR_MULTIPLIER,
  FURNISHING_MULTIPLIER,
  PARKING_BONUS,
  TERRACE_BONUS
} from './calculateEstimate';

/**
 * Tekstovi strane /alati/procena-vrednosti na jednom mestu. Raspored prati
 * kalkulator kredita: vrh -> forma i rezultat -> šta utiče na procenu ->
 * tamni blok (360° tura) -> pitanja -> veza ka drugom alatu.
 *
 * Kartice "Šta utiče na procenu" ne prepisuju procente rukom - računaju ih
 * iz istih konstanti kojima računa i API, pa se strana i model ne razilaze.
 */

function pct(multiplier: number): string {
  const value = Math.round((multiplier - 1) * 100);
  return `${value > 0 ? '+' : value < 0 ? '−' : '±'}${Math.abs(value)}%`;
}

// Tvrdi razmak: drži broj uz reč ("7. sprat", "−7%"), da ne visi na kraju reda.
const NB = ' ';

export const VALUATION_COPY = {
  meta: {
    title: 'Procena vrednosti i kirije nekretnine u Kragujevcu — besplatno | Kvadrat360',
    description:
      'Koliko vredi vaša nekretnina i koliko kirije može da donese? Besplatna okvirna procena za prodaju ili izdavanje stana, kuće ili lokala, po naselju u Kragujevcu. Bez obaveze.'
  },
  hero: {
    crumb: 'Procena vrednosti',
    chip: 'Za vlasnike · cene iz oglasa, oktobar 2026.',
    titleStart: 'Koliko vredi vaša ',
    titleEm: 'nekretnina?',
    lede: 'Prodajna cena ili mesečna kirija za stan, kuću ili lokal — raspon po naselju, za 90 sekundi. Bez obaveze, bez spama.'
  },
  factors: {
    eyebrow: 'Kako se računa',
    title: 'Šta utiče *na procenu.*',
    note: 'Osnova je cena po m² za vaše naselje, posebno za prodaju i za izdavanje, a za stan na prodaju i posebno za novogradnju i starogradnju. Na nju se primenjuju samo ove korekcije.',
    items: [
      {
        title: 'Stanje',
        value: `${pct(CONDITION_MULTIPLIER.needs_renovation)} do ${pct(CONDITION_MULTIPLIER.renovated)}`,
        text: `Za renoviranje${NB}${pct(CONDITION_MULTIPLIER.needs_renovation)}, održavano${NB}${pct(CONDITION_MULTIPLIER.maintained)}, renovirano${NB}${pct(CONDITION_MULTIPLIER.renovated)}. Novogradnja: stan na prodaju po cenama novogradnje, kuće, lokali i kirije${NB}${pct(CONDITION_MULTIPLIER.new_build)}.`
      },
      {
        title: 'Sprat (samo stan)',
        value: `${pct(Math.min(FLOOR_MULTIPLIER.ground, FLOOR_MULTIPLIER.highNoElevator))} do ${pct(FLOOR_MULTIPLIER.mid)}`,
        text: `Prizemlje${NB}${pct(FLOOR_MULTIPLIER.ground)}, 4–6.${NB}sprat${NB}${pct(FLOOR_MULTIPLIER.mid)}, 7.${NB}sprat i${NB}više bez${NB}lifta${NB}${pct(FLOOR_MULTIPLIER.highNoElevator)}.`
      },
      {
        title: 'Parking i terasa',
        value: `do ${pct(1 + PARKING_BONUS + TERRACE_BONUS)}`,
        text: `Parking mesto ili garaža${NB}${pct(1 + PARKING_BONUS)}, terasa ili balkon${NB}${pct(1 + TERRACE_BONUS)}.`
      },
      {
        title: 'Nameštenost (izdavanje)',
        value: `${pct(FURNISHING_MULTIPLIER.unfurnished)} do ${pct(FURNISHING_MULTIPLIER.furnished)}`,
        text: `Namešteno${NB}${pct(FURNISHING_MULTIPLIER.furnished)}, polunamešteno${NB}${pct(FURNISHING_MULTIPLIER.semi_furnished)}, prazno${NB}${pct(FURNISHING_MULTIPLIER.unfurnished)}. Kod prodaje se ne računa.`
      }
    ],
    fine: 'Pogled, orijentacija, uknjiženost i raspored ne ulaze u automatsku procenu — zato je rezultat raspon, a ne jedna cifra.'
  },
  next: {
    title: 'Prodajete ili izdajete? *Pokažite je 360° turom.*',
    text: 'Sa 360° turom kupci i zakupci pregledaju nekretninu pre poziva — na razgledanje dolaze oni koji su već zainteresovani.',
    cta: 'Pogledajte primer ture'
  },
  faqHead: {
    eyebrow: 'Pitanja vlasnika',
    title: 'Koliko je procena *tačna?*',
    note: 'Šta procena vidi, šta ne vidi i šta radimo sa vašim podacima.'
  },
  faq: [
    {
      q: 'Koliko je procena tačna?',
      a: 'Okvirno. Računa se iz cena po m² za vaše naselje i nekoliko korekcija (stanje, sprat, parking, terasa, a kod izdavanja i nameštenost). Ne vidi pogled, raspored ni papire, pa daje raspon. Za tačnu cenu treba obići nekretninu.'
    },
    {
      q: 'Odakle su cene po m²?',
      a: 'Iz javnih oglasa za Kragujevac, po naseljima, i osvežavaju se na svaka dva meseca. Oglasi su tražene cene, pa su prodajne cene spuštene ka onima po kojima se stanovi stvarno prodaju.'
    },
    {
      q: 'Da li radi i za izdavanje?',
      a: 'Da. Izaberite „Izdajem" i dobićete raspon mesečne kirije. Kirije se vode odvojeno od prodajnih cena, jer se jedna ne može izvesti iz druge.'
    },
    {
      q: 'Da li je ovo zvanična procena?',
      a: 'Ne. Ovo nije procena ovlašćenog procenitelja, sudsko veštačenje niti procena za banku. Služi samo za orijentaciju pre prodaje ili izdavanja.'
    },
    {
      q: 'Šta radite sa mojim podacima?',
      a: 'Koristimo ih samo da vas kontaktiramo povodom ove procene. Ne šaljemo reklame i ne upisujemo vas ni na kakvu listu.'
    },
    {
      q: 'Mog naselja nema na listi.',
      a: 'Izaberite „Drugo / okolina" i upišite naselje. Procena se tada računa iz proseka za ceo grad, pa je raspon nešto širi.'
    }
  ],
  other: {
    title: 'Kupujete nekretninu?',
    text: 'Izračunajte ratu, troškove notara i povrat PDV-a.',
    link: 'Kalkulator kredita →'
  }
} as const;
