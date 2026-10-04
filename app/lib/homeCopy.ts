// Tekst početne strane na srpskom (/) i engleskom (/en). Raspored je jedan
// (app/HomePage.tsx), pa se nova rečenica dodaje ovde u oba jezika.

import type { PackageType } from './pricing';

// Iznosi NISU ovde - ni veliki broj na kartici ni iznosi u stavkama. Računa
// ih components/PromoPrice.tsx na klijentu, da bi dok kampanja traje
// pokazivali promo cenu, a posle isteka sami prestali, bez novog deploy-a.
//
// Stavke (tura, HDR) se ipak prikazuju odvojeno, da se cena ne čita kao da
// cela ide na samu turu - ovde stoji samo njihov tekst i koja je stavka.

export type HomeLang = 'sr' | 'en';

type Titled = { title: string; text: string };

export type TourModuleKey = 'about' | 'faq' | 'location' | 'plan' | 'contact';

/** Sekcija "Pet dugmadi" - donji meni ture predstavljen kao koristi (TourModulesShowcase). */
export type ModulesCopy = {
  eyebrow: string;
  title: string;
  note: string;
  hint: string;
  /** Brojač ispod menija: "{n} od {total} pogledano" (tekst, ne funkcija - ide sa servera u klijentsku komponentu). */
  seen: string;
  buyerLabel: string;
  youLabel: string;
  items: { key: TourModuleKey; tab: string; title: string; text: string; buyer: string; you: string }[];
  /** Primer sadržaja na telefonu - izmišljen stan, isti izgled kao u pravoj turi. */
  preview: {
    category: string;
    place: string;
    price: string;
    keys: [string, string][];
    rows: [string, string, boolean?][];
    questions: string[];
    answer: string;
    addressLabel: string;
    address: string;
    openMaps: string;
    planHeading: string;
    agent: string;
    agency: string;
    call: string;
    email: string;
    viewing: string;
    credit: string;
  };
};

/**
 * Jedna stavka cenovnika za sebe: tura (osnovna ili premium) ili HDR
 * fotografije. Koristi je red "samo tura / samo fotografije" i kutija sa
 * cenama u blogu (BlogPricingSnapshot).
 */
export type RateAmount = 'tourBasic' | 'tourPremium' | 'hdr';

/** Koju stavku kartice iznos prikazuje (računa ga PlanLinePrice). */
export type PlanLineAmount = 'tour' | 'hdr' | 'premiumExtra';

/**
 * Red na kartici paketa: običan tekst, ili stavka sa iznosom koji se računa
 * na klijentu - "{label} — {iznos} {suffix}".
 */
export type PlanItem = string | { label: string; amount: PlanLineAmount; suffix?: string };

export type PricePlan = {
  /** Kome paket odgovara, jednom rečenicom. */
  audience: string;
  title: string;
  /** Iznos se ne upisuje ovde: računa ga PlanPrice (za jednu nekretninu),
      da bi mogao da prikaže promo cenu dok kampanja traje (vidi
      components/PromoPrice.tsx). */
  packageType: PackageType;
  unit: string;
  items: PlanItem[];
  cta: string;
  // Oznaka za merenje klikova (data-track="cta:<track>").
  track: 'price_premium' | 'price_basic';
  badge?: string;
};

/** Natpisi u kojima se cena računa na klijentu (PromoPrice.tsx). */
export type PricingLabels = {
  /** "tura" / "tour" - ispod velike cene: "tura 6.000 + HDR fotografije 2.500". */
  tour: string;
  hdr: string;
  /** "uz Osnovni" - "+2.000 din. uz Osnovni" na Premium kartici. */
  overBasic: string;
};

export type HomeCopy = {
  locale: string;
  meta: { title: string; description: string };
  nav: {
    brandAria: string;
    examples: string;
    /** Sekcija "U samoj turi" (#u-turi). Benefiti i Pitanja nisu u meniju -
        vide se skrolovanjem, a meni je bio pretrpan (vlasnik, 27. 9. 2026). */
    modules: string;
    how: string;
    packages: string;
    // Strana za agencije postoji za sada samo na srpskom, pa link stoji
    // samo u srpskom meniju (vidi HomePage.tsx).
    agencies?: string;
    blog?: string;
    contact: string;
    cta: string;
    // Link ka drugoj jezičkoj verziji strane.
    switchLabel: string;
    switchAria: string;
    switchHref: string;
    switchLang: HomeLang;
  };
  hero: {
    chip: string;
    titleStart: string;
    titleEm: string;
    lede: string;
    ctaTour: string;
    ctaPackages: string;
    trust: string[];
    opens: (count: string) => string;
  };
  categories: Record<'sale' | 'rent' | 'booking', string>;
  tourCard: { rooms: (count: number) => string; open: string };
  examples: {
    eyebrow: string;
    title: string;
    note: string;
    /**
     * Link "Sve ture →" ispod kartica, dok mini-pretraga (database) nije
     * uključena (manje od TOUR_FILTERS_FROM tura). Samo srpski - /ture je
     * za sada samo na srpskom.
     */
    allTours?: string;
    /**
     * Traka posle mreže kartica, koja najavljuje da postoji ceo spisak tura
     * sa filterima (/ture) - inače ova sekcija i taj spisak danas prikazuju
     * ISTO (nema odsecanja na par tura), pa razlika nije očigledna dok baza
     * ne naraste. Strana je za sada samo na srpskom, pa traka postoji samo
     * tamo (kao ranije allTours).
     */
    database?: {
      title: string;
      text: string;
      /** Natpisi polja mini-pretrage; vrednosti idu u adresu /ture kao filteri. */
      fields: { category: string; city: string; structure: string };
      all: string;
      categories: { rent: string; sale: string; booking: string };
      cta: string;
    };
  };
  benefits: { eyebrow: string; title: string; note: string; items: Titled[] };
  modules: ModulesCopy;
  /**
   * Poziv na sredini strane, posle "U samoj turi" - ranije između primera
   * ture i cenovnika sedam ekrana nije bilo nijednog dugmeta.
   */
  midCta: { title: string; points: string[]; button: string; call: string };
  steps: { eyebrow: string; title: string; note: string; items: Titled[]; deliverTitle: string; deliver: string[] };
  pricing: {
    eyebrow: string;
    title: string;
    note: string;
    /** Dva paketa, cena po nekretnini (vidi lib/pricing.ts). */
    plans: PricePlan[];
    labels: PricingLabels;
    /** Tabela: više nekretnina mesečno, niža cena po nekretnini. */
    volume: { title: string; note: string; count: string; basic: string; premium: string };
    /** Jedan red: tura bez fotografija i fotografije bez ture. */
    single: { lead: string; tour: string; hdr: string };
    fine: string;
  };
  // Putokaz ka strani za agencije (/za-agencije), odmah ispod paketa. Ta
  // strana postoji za sada samo na srpskom, pa se i sekcija pojavljuje samo
  // tamo - isto pravilo kao nav.agencies.
  agencyBridge?: {
    eyebrow: string;
    title: string;
    text: string;
    points: string[];
    cta: string;
  };
  faq: { eyebrow: string; title: string; note: string };
  contact: {
    eyebrow: string;
    title: string;
    note: string;
    call: string;
    labels: { phone: string; email: string; address: string; hours: string };
    hours: string;
    country: string;
  };
  footer: string;
};

const sr: HomeCopy = {
  locale: 'sr-RS',
  meta: {
    title: 'Kvadrat360 — Virtuelne ture i HDR fotografije nekretnina u Kragujevcu',
    description:
      '360° virtuelne ture i HDR fotografije nekretnina u Kragujevcu i okolini, za agencije i vlasnike. Audio vodič na srpskom, engleskom, nemačkom i ruskom.'
  },
  nav: {
    brandAria: 'Kvadrat360, početak strane',
    examples: 'Ture',
    modules: 'U turi',
    how: 'Kako radimo',
    packages: 'Cenovnik',
    agencies: 'Za agencije',
    blog: 'Blog',
    contact: 'Kontakt',
    cta: 'Zakažite snimanje',
    switchLabel: 'EN',
    switchAria: 'English version',
    switchHref: '/en',
    switchLang: 'en'
  },
  hero: {
    chip: 'Prodaja · Izdavanje · Stan na dan',
    titleStart: 'Vaš kvadrat u Kragujevcu, u 360°, ',
    titleEm: 'bez skrivenih ćoškova.',
    lede:
      '360° tura i HDR fotografije vaše nekretnine — kupac prošeta kroz svaki ugao pre prvog dolaska. Za agencije i vlasnike u Kragujevcu.',
    ctaTour: 'Pogledajte primer ture',
    ctaPackages: 'Pogledajte cenovnik',
    trust: ['🎧 Audio vodič SR · EN · DE · RU', '⏱ Isporuka za 24–48h'],
    opens: (count) => `👁 ${count}+ otvaranja tura`
  },
  categories: { sale: 'Prodaja', rent: 'Izdavanje', booking: 'Smeštaj' },
  tourCard: {
    rooms: (count) => (count === 1 ? '1 prostorija' : `${count} prostorija`),
    open: 'Otvori turu →'
  },
  examples: {
    eyebrow: 'Ture',
    title: 'Prošetajte kroz *pravu turu*',
    note: 'Otvorite bilo koju — ovo je tačno ono što vidi vaš kupac.',
    allTours: 'Sve ture →',
    database: {
      title: 'Pronađite turu',
      text: 'Cela baza, sa mapom i filterima po naselju, kvadraturi i ceni.',
      fields: { category: 'Vrsta oglasa', city: 'Grad', structure: 'Struktura' },
      all: 'Sve',
      categories: { rent: 'Izdavanje', sale: 'Prodaja', booking: 'Stan na dan' },
      cta: 'Prikaži ture →'
    }
  },
  benefits: {
    eyebrow: 'Benefiti',
    title: 'Zašto virtuelna tura *prodaje bolje*',
    note: 'Ono što tura i HDR fotografije donose vama i vašim klijentima — a ne tehnologija iza njih.',
    items: [
      // Četiri, ne osam: ranije su se kartice preklapale međusobno ("Manje
      // uzaludnih razgledanja" / "Brža odluka") i sa sekcijom "U samoj turi"
      // ("Vaše ime u svakoj turi" = modul Kontakt). Svaka ovde je jedna ideja.
      { title: 'Manje uzaludnih razgledanja', text: 'Kupci prvo „prošetaju“ kroz nekretninu online. Na razgledanje dolaze samo oni koje zaista zanima — sa manje pitanja, spremni da brzo odluče.' },
      { title: 'Oglas koji se izdvaja', text: 'HDR fotografije i 360° tura odvajaju vaš oglas od stotina slikanih telefonom — i grade poverenje pre prvog poziva.' },
      { title: 'Kupci iz drugih gradova', text: 'Ko živi u Beogradu, Nišu ili inostranstvu razgleda nekretninu bez puta — a audio vodič mu ga ispriča na srpskom, engleskom, nemačkom ili ruskom.' },
      { title: 'Otvoreno 24 sata', text: 'Tura je otvorena u svako doba, na telefonu ili računaru, bez zakazivanja i bez aplikacije — uz vodiča kroz sve prostorije ili svojim tempom.' }
    ]
  },
  modules: {
    eyebrow: 'U samoj turi',
    title: 'Pet dugmadi koja *odgovaraju umesto vas*',
    note: 'Ispod svake ture stoji isti meni kao u aplikaciji. Kupac tu nađe ono što bi vas inače pitao telefonom — i zakaže razgledanje kad je spreman.',
    hint: '👆 Dodirnite bilo koje dugme',
    seen: '{n} od {total} pogledano',
    buyerLabel: 'Kupac',
    youLabel: 'Vi',
    items: [
      { key: 'about', tab: 'Info', title: 'Sve bitno na jednom listu', text: 'Cena, kvadratura, sprat, grejanje, terasa, parking, uknjiženost — pregledno, na jeziku posetioca. Bez listanja oglasa i bez nagađanja.', buyer: 'U pola minuta zna da li mu nekretnina odgovara.', you: 'Nema više poziva „koji je sprat?“ i „ima li lift?“.' },
      { key: 'faq', tab: 'Pitanja', title: 'Odgovori pre prvog poziva', text: 'Pet pitanja koja kupci uvek postave — drugačija za prodaju, izdavanje i stan na dan — sa odgovorima na svim jezicima ture.', buyer: 'Dobije odgovor odmah, i u ponoć.', you: 'Na razgledanje dolaze već informisani.' },
      { key: 'location', tab: 'Lokacija', title: 'Gde je — bez otkrivanja broja', text: 'Mapa, ulica i naselje. Jednim dodirom otvara Google mape i put do nekretnine. Kućni broj se ne prikazuje.', buyer: 'Odmah vidi kraj, prevoz i okolinu.', you: 'Tačnu adresu dajete tek kad zakažete razgledanje.' },
      { key: 'plan', tab: 'Plan', title: 'Raspored jednim pogledom', text: 'Tlocrt sa tačkama prostorija. Dodir na tačku vodi pravo u tu prostoriju u 360° turi.', buyer: 'Razume raspored pre nego što krene u obilazak.', you: 'Nema „a gde je kupatilo u odnosu na sobu?“.' },
      { key: 'contact', tab: 'Kontakt', title: 'Razgledanje zakazano iz ture', text: 'Vaša kartica sa imenom i agencijom, poziv jednim dodirom i dugme „Zakaži razgledanje“ — ime, telefon i željeni termin.', buyer: 'Zakaže u trenutku kad mu se nekretnina dopadne.', you: 'Upit nam stiže odmah, sa podacima o turi, i istog trenutka ga prosleđujemo vama.' }
    ],
    preview: {
      category: 'Prodaja',
      place: 'Kragujevac · Centar',
      price: '98.000 €',
      keys: [['54 m²', 'Kvadratura'], ['Dvosoban', 'Struktura'], ['3/5', 'Sprat']],
      rows: [['Ulica', 'Maglićka'], ['Grejanje', 'Centralno'], ['Terasa', 'Terasa'], ['Parking', 'Garaža'], ['Lift', '✓ Da', true], ['Uknjiženo', '✓ Da', true]],
      questions: ['Kolika je cena i da li je moguć kredit?', 'Kakvo je stanje objekta?', 'Da li je uknjižena?', 'Da li su porezi uključeni?', 'Šta sve ide uz nekretninu?'],
      answer: '98.000 €, kupovina na kredit je moguća.',
      addressLabel: 'Adresa',
      address: 'Maglićka, Kragujevac',
      openMaps: 'Otvori u Google mapama',
      planHeading: 'Tlocrt — raspored prostorija',
      agent: 'Marko Marković',
      agency: 'Vaša agencija',
      call: 'Pozovi',
      email: 'E-mail',
      viewing: 'Zakaži razgledanje',
      credit: '360° turu izradio ◇ Kvadrat360'
    }
  },
  midCta: {
    title: 'Hoćete ovakvu turu za *svoju nekretninu?*',
    points: ['snimanje 30–60 min', 'tura za 24–48h', 'audio vodič na više jezika'],
    button: 'Zakažite snimanje',
    call: 'Pozovite'
  },
  steps: {
    eyebrow: 'Kako radimo',
    title: 'Od poziva do *gotove ture*',
    note: 'Vaš deo je jednostavan — sve ostalo je na nama.',
    items: [
      { title: 'Zakazivanje', text: 'Javite se telefonom ili preko forme i dogovorimo termin. Dolazimo sa opremom, bez ometanja stanara.' },
      { title: 'Snimanje', text: '30–60 minuta po nekretnini: 360° panorame svake prostorije i HDR fotografije za oglas.' },
      { title: 'Obrada', text: 'Spajanje panorama, kalibracija boja i priprema audio vodiča na jezicima koje ste izabrali.' },
      { title: 'Isporuka', text: 'Link ka gotovoj turi i fotografije stižu za 24h u Premium paketu, a u Osnovnom najkasnije za 48h — možete ih postaviti na oglas istog dana.' }
    ],
    deliverTitle: 'Šta dobijate',
    // Šta stiže na kraju posla - ne spisak funkcija ture (taj je u cenovniku i
    // u "U samoj turi"). Poslednja stavka nosi ono što je ranije bila cela
    // sekcija "Tipovi oglasa".
    deliver: [
      'Link ka turi za oglas i gotov kod za sajt agencije',
      'HDR fotografije u punoj rezoluciji, za portal i društvene mreže',
      'Vaše ime i telefon u turi — i kad se link deli dalje',
      'Tekst i vodič prilagođeni oglasu: za prodaju vrednost i vlasništvo, za izdavanje troškovi i useljenje, za stan na dan utisak gosta'
    ]
  },
  pricing: {
    eyebrow: 'Cenovnik',
    title: 'Dva paketa, *jedna cena* po nekretnini',
    note: 'Cena uključuje 360° turu i HDR fotografije. Agencije koje snimaju više nekretnina mesečno plaćaju manje po svakoj.',
    plans: [
      {
        audience: 'Za oglas na domaćem tržištu',
        title: 'Osnovni',
        packageType: 'basic',
        unit: '/ nekretnina',
        items: [
          '360° tura kroz sve prostorije',
          'HDR fotografija svake prostorije',
          'Audio vodič na srpskom + jednom jeziku po izboru (EN, DE ili RU)',
          'Info, pitanja, lokacija i vaš kontakt u samoj turi',
          'Link za oglas i gotov kod za ugradnju na sajt',
          'Isporuka za 48h'
        ],
        cta: 'Zatražite ponudu',
        track: 'price_basic'
      },
      {
        audience: 'Kad oglas treba da vidi što više ljudi',
        title: 'Premium',
        packageType: 'premium',
        unit: '/ nekretnina',
        items: [
          'Sve iz Osnovnog, plus:',
          'Audio vodič na sva 4 jezika (SR, EN, DE, RU)',
          'Izrada tlocrta',
          'Prednost pri zakazivanju termina',
          'Isporuka za 24h',
          'QR kod za oglas, letak i izlog',
          'Kratak video iz ture za Instagram i Facebook'
        ],
        cta: 'Zatražite ponudu',
        track: 'price_premium',
        badge: 'Najbolje za agencije'
      }
    ],
    labels: { tour: 'tura', hdr: 'HDR fotografije', overBasic: 'uz Osnovni' },
    volume: {
      title: 'Više nekretnina mesečno, niža cena',
      note: 'Cena po nekretnini (tura + HDR fotografije), prema tome koliko nekretnina snimamo za vas u jednom mesecu.',
      count: 'Nekretnina mesečno',
      basic: 'Osnovni',
      premium: 'Premium'
    },
    single: {
      lead: 'Treba vam samo tura ili samo fotografije?',
      tour: 'Tura od',
      hdr: 'HDR fotografije'
    },
    fine: '* Cene su prosečne, za prostor od oko 50 m². Za manje i veće prostore cenu formiramo prema broju prostorija — javite kvadraturu i broj soba, pa šaljemo tačnu ponudu. Za gradove van Kragujevca dogovaramo posebno.'
  },
  agencyBridge: {
    eyebrow: 'Za agencije',
    title: 'Vodite više oglasa *odjednom?*',
    text:
      'Niža cena za više oglasa mesečno, upitnik za agente, kontakt agenta u svakoj turi i mesečni izveštaj o posetama — sve na jednom mestu.',
    points: ['Upitnik — sami ili zajedno sa nama', 'Kontakt agenta u svakoj turi', 'Praćenje poseta po oglasu'],
    cta: 'Pogledajte stranu za agencije →'
  },
  faq: {
    eyebrow: 'Česta pitanja',
    title: 'Pre nego što *zakažete*',
    note: 'Ono što agencije i vlasnici najčešće pitaju pre prvog snimanja. Ako vašeg pitanja nema, javite nam se.'
  },
  contact: {
    eyebrow: 'Kontakt',
    title: 'Zakažite *snimanje*',
    note: 'Odgovaramo za 24h radnim danima — ili se javite odmah, pozivom ili porukom:',
    call: 'Pozovite',
    labels: { phone: 'Telefon', email: 'E-mail', address: 'Adresa', hours: 'Radno vreme' },
    hours: 'Pon–Sub, 08–20h',
    country: ''
  },
  footer: '© 2026 Kvadrat360 · Virtuelne ture za nekretnine, ključ u ruke.'
};

const en: HomeCopy = {
  locale: 'en-GB',
  meta: {
    title: 'Kvadrat360 — 360° virtual tours and HDR real estate photography in Kragujevac, Serbia',
    description:
      '360° virtual tours and HDR photos for real estate agencies and owners in Kragujevac, Serbia. Audio guide in Serbian, English, German and Russian.'
  },
  nav: {
    brandAria: 'Kvadrat360, top of the page',
    examples: 'Tours',
    modules: 'In the tour',
    how: 'How it works',
    packages: 'Price list',
    contact: 'Contact',
    cta: 'Book a shoot',
    switchLabel: 'SR',
    switchAria: 'Srpska verzija',
    switchHref: '/',
    switchLang: 'sr'
  },
  hero: {
    chip: 'Sale · Rent · Short stays',
    titleStart: 'Real square meters, ',
    titleEm: 'no hidden corners.',
    lede:
      'A 360° tour and HDR photos of your property — buyers walk through every corner before the first visit. For agencies and owners in Kragujevac.',
    ctaTour: 'View a sample tour',
    ctaPackages: 'See the price list',
    trust: ['🎧 Audio guide SR · EN · DE · RU', '⏱ Delivery within 24–48h'],
    opens: (count) => `👁 ${count}+ tour views`
  },
  categories: { sale: 'For sale', rent: 'For rent', booking: 'Short stay' },
  tourCard: {
    rooms: (count) => (count === 1 ? '1 room' : `${count} rooms`),
    open: 'Open the tour →'
  },
  examples: {
    eyebrow: 'Tours',
    title: 'Walk through a *real tour*',
    note: 'Open any of them — this is exactly what your buyer sees.'
  },
  benefits: {
    eyebrow: 'Benefits',
    title: 'Why a virtual tour *sells better*',
    note: 'What the tour and HDR photos do for you and your clients — not the technology behind them.',
    items: [
      { title: 'Fewer wasted viewings', text: 'Buyers “walk” through the property online first. Only the seriously interested come to see it — with fewer questions, ready to decide.' },
      { title: 'A listing that stands out', text: 'HDR photos and a 360° tour set your listing apart from the hundreds shot on a phone — and build trust before the first call.' },
      { title: 'Buyers from other cities', text: 'Someone in Belgrade, Niš or abroad views the property without the trip — and the audio guide walks them through it in Serbian, English, German or Russian.' },
      { title: 'Open 24/7', text: 'The property is open at any hour, on a phone or a computer, with no appointment and no app — with a guide through every room or at their own pace.' }
    ]
  },
  modules: {
    eyebrow: 'Inside the tour',
    title: 'Five buttons that *answer for you*',
    note: 'Every tour has the same menu along the bottom. Buyers find what they would otherwise call you about — and book a viewing when they are ready.',
    hint: '👆 Tap any button',
    seen: '{n} of {total} viewed',
    buyerLabel: 'Buyer',
    youLabel: 'You',
    items: [
      { key: 'about', tab: 'Info', title: 'Everything that matters, on one sheet', text: 'Price, floor area, floor, heating, terrace, parking, registered title — clear, in the visitor’s own language. No scrolling through listings, no guessing.', buyer: 'Knows in half a minute whether the place fits.', you: 'No more calls asking “which floor?” or “is there a lift?”.' },
      { key: 'faq', tab: 'Questions', title: 'Answers before the first call', text: 'The five questions buyers always ask — different for sale, rent and short stays — answered in every language of the tour.', buyer: 'Gets an answer right away, even at midnight.', you: 'People arrive at the viewing already informed.' },
      { key: 'location', tab: 'Location', title: 'Where it is — without the house number', text: 'Map, street and neighbourhood. One tap opens Google Maps with directions. The house number is never shown.', buyer: 'Sees the area, transport and surroundings at once.', you: 'You share the exact address only once a viewing is booked.' },
      { key: 'plan', tab: 'Plan', title: 'The layout at a glance', text: 'A floor plan with a dot for every room. Tapping a dot takes the visitor straight into that room in the 360° tour.', buyer: 'Understands the layout before walking through.', you: 'No more “where is the bathroom from the bedroom?”.' },
      { key: 'contact', tab: 'Contact', title: 'Viewings booked from the tour', text: 'Your card with name and agency, one-tap calling and a “Book a viewing” button — name, phone and preferred time.', buyer: 'Books the moment they like the place.', you: 'The request reaches us instantly, with the tour details, and we pass it straight to you.' }
    ],
    preview: {
      category: 'For sale',
      place: 'Kragujevac · Centre',
      price: '€98,000',
      keys: [['54 m²', 'Area'], ['2-room', 'Layout'], ['3/5', 'Floor']],
      rows: [['Street', 'Maglićka'], ['Heating', 'Central'], ['Terrace', 'Terrace'], ['Parking', 'Garage'], ['Lift', '✓ Yes', true], ['Registered', '✓ Yes', true]],
      questions: ['What’s the price, is a mortgage possible?', 'What’s the condition?', 'Is it registered?', 'Are taxes included?', 'What comes with it?'],
      answer: '€98,000, and buying with a mortgage is possible.',
      addressLabel: 'Address',
      address: 'Maglićka, Kragujevac',
      openMaps: 'Open in Google Maps',
      planHeading: 'Floor plan — room layout',
      agent: 'Marko Marković',
      agency: 'Your agency',
      call: 'Call',
      email: 'Email',
      viewing: 'Book a viewing',
      credit: '360° tour by ◇ Kvadrat360'
    }
  },
  midCta: {
    title: 'Want a tour like this for *your property?*',
    points: ['30–60 min shoot', 'tour within 24–48h', 'audio guide in several languages'],
    button: 'Book a shoot',
    call: 'Call us'
  },
  steps: {
    eyebrow: 'How it works',
    title: 'From the first call to a *finished tour*',
    note: 'A simple process on your side — we take care of the rest.',
    items: [
      { title: 'Booking', text: 'Book a time by phone or through the form — we arrive with our equipment at the agreed time, without disturbing residents or tenants.' },
      { title: 'Shooting', text: '30–60 minutes per property: 360° panoramas of every room plus HDR photos for the listing.' },
      { title: 'Editing', text: 'Stitching the panoramas, color calibration and preparing the audio guide in the languages you need.' },
      { title: 'Delivery', text: 'The link to the finished tour and the photos arrive within 24 hours with Premium, and within 48 hours at the latest with Basic — ready to add to the listing the same day.' }
    ],
    deliverTitle: 'What you get',
    deliver: [
      'A link to the tour for your listing and ready-made embed code for your site',
      'Full-resolution HDR photos for portals and social media',
      'Your name and phone inside the tour — even when the link is passed on',
      'Text and guide tailored to the listing: value and ownership for a sale, costs and move-in for a rental, the guest’s impression for a short stay'
    ]
  },
  pricing: {
    eyebrow: 'Price list',
    title: 'Two packages, *one price* per property',
    note: 'The price covers the 360° tour and the HDR photos. Agencies that list more properties a month pay less for each one.',
    plans: [
      {
        audience: 'For a listing aimed at local buyers',
        title: 'Basic',
        packageType: 'basic',
        unit: '/ property',
        items: [
          '360° tour through every room',
          'An HDR photo of every room',
          'Audio guide in Serbian + one language of your choice (EN, DE or RU)',
          'Info, questions, location and your contact inside the tour',
          'A link for the listing and ready-made embed code for your site',
          'Delivery within 48 hours'
        ],
        cta: 'Request a quote',
        track: 'price_basic'
      },
      {
        audience: 'When the listing should reach as many people as possible',
        title: 'Premium',
        packageType: 'premium',
        unit: '/ property',
        items: [
          'Everything in Basic, plus:',
          'Audio guide in all 4 languages (SR, EN, DE, RU)',
          'We draw the floor plan',
          'Priority scheduling for the shoot',
          'Delivery within 24 hours',
          'A QR code for the listing, flyers and your shop window',
          'A short video from the tour for Instagram and Facebook'
        ],
        cta: 'Request a quote',
        track: 'price_premium',
        badge: 'Best for agencies'
      }
    ],
    labels: { tour: 'tour', hdr: 'HDR photos', overBasic: 'over Basic' },
    volume: {
      title: 'More properties a month, lower price',
      note: 'Price per property (tour + HDR photos), by how many properties we shoot for you in one month.',
      count: 'Properties a month',
      basic: 'Basic',
      premium: 'Premium'
    },
    single: {
      lead: 'Need only the tour or only the photos?',
      tour: 'Tour from',
      hdr: 'HDR photos'
    },
    fine: '* Prices are averages, for a property of about 50 m². For smaller and larger properties we quote by the number of rooms — tell us the size and room count and we will send an exact quote. Cities outside Kragujevac are arranged separately.'
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Before you *book*',
    note: 'What agencies and owners most often ask before the first shoot. If your question isn’t here, get in touch.'
  },
  contact: {
    eyebrow: 'Contact',
    title: 'Book a *shoot*',
    note: 'We reply within 24 hours on business days — or reach us right away by phone or message:',
    call: 'Call',
    labels: { phone: 'Phone', email: 'Email', address: 'Address', hours: 'Hours' },
    hours: 'Mon–Sat, 8 am – 8 pm',
    country: 'Serbia'
  },
  footer: '© 2026 Kvadrat360 · Turnkey virtual tours for real estate.'
};

export const HOME_COPY: Record<HomeLang, HomeCopy> = { sr, en };
