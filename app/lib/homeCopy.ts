// Tekst početne strane na srpskom (/) i engleskom (/en). Raspored je jedan
// (app/HomePage.tsx), pa se nova rečenica dodaje ovde u oba jezika.

import { PREMIUM_EXTRA, PRICE_TIERS, tierIndexFor, tourPrice, type PackageType } from './pricing';

// Veliki iznos na kartici NIJE ovde - računa ga components/PromoPrice.tsx na
// klijentu, da bi mogao da pokaže promo cenu dok kampanja traje, a da posle
// isteka sam prestane, bez novog deploy-a.
//
// Stavke u spisku jesu ovde, i prikazuju se odvojeno (tura 50€ + HDR 20€),
// da se cena ne čita kao da cela ide na samu turu. To su REDOVNE cene -
// popust na njih objašnjavaju nalepnica i traka iznad kartica.
const tierFor = (count: number) => PRICE_TIERS[tierIndexFor(count)];
const srTour = (count: number, pkg: PackageType = 'basic') => `${tourPrice(tierFor(count), pkg)}€`;
const enTour = (count: number, pkg: PackageType = 'basic') => `€${tourPrice(tierFor(count), pkg)}`;
const srHdr = (count: number) => `${tierFor(count).hdr}€`;
const enHdr = (count: number) => `€${tierFor(count).hdr}`;

export type HomeLang = 'sr' | 'en';

type Titled = { title: string; text: string };

export type PricePlan = {
  audience: string;
  title: string;
  from: string;
  /** Iznos se ne upisuje ovde: računa ga PlanPrice, da bi mogao da prikaže
      promo cenu dok kampanja traje (vidi components/PromoPrice.tsx). */
  count: number;
  packageType: PackageType;
  unit: string;
  items: string[];
  cta: string;
  // Oznaka za merenje klikova (data-track="cta:<track>").
  track: 'price_single' | 'price_premium' | 'price_basic';
  badge?: string;
};

export type HomeCopy = {
  locale: string;
  meta: { title: string; description: string };
  nav: {
    brandAria: string;
    examples: string;
    how: string;
    benefits: string;
    packages: string;
    faq: string;
    // Strana za agencije postoji za sada samo na srpskom, pa link stoji
    // samo u srpskom meniju (vidi HomePage.tsx).
    agencies?: string;
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
  // allTours: link ka spisku svih tura (/ture); strana je za sada samo na
  // srpskom, pa se dugme prikazuje samo tamo.
  examples: { eyebrow: string; title: string; note: string; allTours?: string };
  benefits: { eyebrow: string; title: string; note: string; items: Titled[] };
  steps: { eyebrow: string; title: string; note: string; items: Titled[]; deliverTitle: string; deliver: string[] };
  types: {
    eyebrow: string;
    title: string;
    note: string;
    faqLabel: string;
    items: { eyebrow: string; title: string; focus: string; faq: string }[];
  };
  pricing: { eyebrow: string; title: string; note: string; plans: PricePlan[]; fine: string };
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
  integration: { eyebrow: string; title: string; desc: string };
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
    title: 'Kvadrat360 — Virtuelne ture i HDR fotografije nekretnina',
    description:
      'Profesionalne 360° virtuelne ture i HDR fotografije nekretnina — za agencije i vlasnike koji prodaju ili izdaju. Audio vodič na srpskom, engleskom, nemačkom i ruskom.'
  },
  nav: {
    brandAria: 'Kvadrat360, početak strane',
    examples: 'Primeri tura',
    how: 'Kako radimo',
    benefits: 'Benefiti',
    packages: 'Paketi',
    faq: 'Pitanja',
    agencies: 'Za agencije',
    contact: 'Kontakt',
    cta: 'Zakažite snimanje',
    switchLabel: 'EN',
    switchAria: 'English version',
    switchHref: '/en',
    switchLang: 'en'
  },
  hero: {
    chip: 'Prodaja · Izdavanje · Smeštaj',
    titleStart: 'Pravi kvadrati, ',
    titleEm: 'bez skrivenih ćoškova.',
    lede:
      'Virtuelna 360° tura i HDR fotografije pokazuju svaki ugao pre prvog dolaska — bilo da agencija vodi ceo portfolio ili vlasnik oglašava jedan stan. Na razgledanje tako dolaze samo ozbiljno zainteresovani, spremni da brzo odluče.',
    ctaTour: '▶ Pogledajte primer ture',
    ctaPackages: 'Paketi za agencije',
    trust: ['🎧 Audio vodič SR · EN · DE · RU', '⏱ Isporuka za 48h'],
    opens: (count) => `👁 ${count}+ otvaranja tura`
  },
  categories: { sale: 'Prodaja', rent: 'Izdavanje', booking: 'Smeštaj' },
  tourCard: {
    rooms: (count) => (count === 1 ? '1 prostorija' : `${count} prostorija`),
    open: 'Otvori turu →'
  },
  examples: {
    eyebrow: 'Primeri tura',
    title: 'Prošetajte kroz pravu turu',
    note: 'Ture koje su trenutno objavljene — otvaraju se u pretraživaču, na telefonu ili računaru, bez instaliranja aplikacije.',
    allTours: 'Pogledajte sve ture →'
  },
  benefits: {
    eyebrow: 'Benefiti',
    title: 'Zašto virtuelna tura prodaje bolje',
    note: 'Ono što tura i HDR fotografije donose vama i vašim klijentima — a ne tehnologija iza njih.',
    items: [
      { title: 'Manje uzaludnih razgledanja', text: 'Kupci i zakupci prvo „prošetaju“ kroz stan online. Na razgledanje dolaze samo oni koje stan zaista zanima.' },
      { title: 'Oglas koji se izdvaja', text: 'HDR fotografije i 360° tura odmah izdvajaju vaš oglas među stotinama onih slikanih telefonom.' },
      { title: 'Strani kupci bez prevodioca', text: 'Audio vodič govori srpski, engleski, nemački i ruski — kupac iz inostranstva čuje sve na svom jeziku.' },
      { title: 'Vođena tura, bez klikanja', text: 'Posetilac bira: da ga vodič provede kroz sve prostorije i ispriča šta se gde nalazi, ili da razgleda sam, svojim tempom.' },
      { title: 'Brža odluka', text: 'Ko je već „prošetao“ kroz stan, na razgledanje dolazi sa manje pitanja i brže se odlučuje.' },
      { title: 'Sve na jednom mestu', text: 'Plan stana, lokacija i vaš kontakt stoje u samoj turi — bez dodatnih poziva i mejlova.' },
      { title: 'Profesionalan prvi utisak', text: 'Kvalitetna fotografija i uredna tura grade poverenje i pre prvog poziva.' },
      { title: 'Otvoreno 24 sata, na svakom uređaju', text: 'Stan je otvoren za razgledanje u svako doba — u pretraživaču na telefonu ili računaru, bez zakazivanja i bez instaliranja aplikacije.' }
    ]
  },
  steps: {
    eyebrow: 'Kako radimo',
    title: 'Od poziva do gotove ture',
    note: 'Vaš deo je jednostavan — sve ostalo je na nama.',
    items: [
      { title: 'Zakazivanje', text: 'Javite se telefonom ili preko forme i dogovorimo termin. Dolazimo sa opremom, bez ometanja stanara.' },
      { title: 'Snimanje', text: '30–60 minuta po nekretnini: 360° panorame svake prostorije i HDR fotografije za oglas.' },
      { title: 'Obrada', text: 'Spajanje panorama, kalibracija boja i priprema audio vodiča na jezicima koje ste izabrali.' },
      { title: 'Isporuka', text: 'Link ka gotovoj turi i fotografije stižu za 48h — možete ih postaviti na oglas istog dana.' }
    ],
    deliverTitle: 'Šta dobijate',
    deliver: [
      'Interaktivnu 360° turu sa prolazom kroz sve prostorije',
      'HDR fotografije spremne za oglas i društvene mreže',
      'Automatsko vođenje kroz stan, ili samostalno razgledanje — posetilac bira',
      'Audio vodič na srpskom, engleskom, nemačkom i ruskom',
      'Plan stana i lokaciju, ugrađene u turu',
      'Vašu kontakt karticu, vidljivu tokom cele ture'
    ]
  },
  types: {
    eyebrow: 'Tipovi oglasa',
    title: 'Ista tura, drugačiji fokus',
    note: 'Bilo da agencija vodi ceo portfolio ili vlasnik oglašava jedan stan, tura naglašava ono što je za taj oglas najvažnije.',
    faqLabel: 'Tipično pitanje',
    items: [
      { eyebrow: 'Prodaja', title: 'Dugoročna vrednost', focus: 'Naglasak na kvadraturi, stanju objekta i vlasništvu — ono što presuđuje pri kupovini.', faq: '„Da li je nekretnina uknjižena i kakvo je vlasništvo?“' },
      { eyebrow: 'Izdavanje', title: 'Svakodnevna praktičnost', focus: 'Naglasak na mesečnim troškovima, uslovima ugovora i datumu useljenja — ono što zanima budućeg stanara.', faq: '„Koliki su prosečni mesečni troškovi i kakvo je grejanje?“' },
      { eyebrow: 'Kratkoročni smeštaj', title: 'Utisak gosta', focus: 'Naglasak na atmosferi, kapacitetu i uslovima boravka — ono što gost proverava pre rezervacije.', faq: '„Koje je tačno vreme za check-in i check-out?“' }
    ]
  },
  pricing: {
    eyebrow: 'Paketi',
    title: 'Osmišljeno za agencije, otvoreno i za pojedince',
    note: 'Mesečni paketi su za agencije sa stalnim prilivom oglasa. Ako sami prodajete ili izdajete jedan stan, uzmite pojedinačnu turu.',
    plans: [
      {
        audience: 'Za pojedinačne vlasnike',
        title: 'Pojedinačna tura',
        from: 'od',
        count: 1,
        packageType: 'basic',
        unit: '/ nekretnina',
        items: [
          `360° tura sa audio vodičem — ${srTour(1)}`,
          `HDR fotografije, jedna po prostoriji — ${srHdr(1)}`,
          'Audio vodič na srpskom + jednom jeziku po izboru',
          'Isporuka za 48h'
        ],
        cta: 'Zatražite ponudu',
        track: 'price_single'
      },
      {
        audience: 'Za agencije · Osnovni paket',
        title: 'Agencija Osnovni',
        from: 'od',
        count: 3,
        packageType: 'basic',
        unit: '/ mesečno (3 ture)',
        items: [
          `360° tura sa audio vodičem — ${srTour(3)} po turi`,
          `HDR fotografije, jedna po prostoriji — ${srHdr(3)} po nekretnini`,
          'Audio vodič na srpskom + jednom jeziku po izboru (EN, DE ili RU)',
          'Plan stana uz svaku turu',
          'Isporuka za 48h'
        ],
        cta: 'Zatražite ponudu',
        track: 'price_basic',
        badge: 'Preporučeno za agencije'
      },
      {
        audience: 'Za agencije · Premium paket',
        title: 'Agencija Premium',
        from: 'od',
        count: 3,
        packageType: 'premium',
        unit: '/ mesečno (3 ture)',
        items: [
          'Sve iz Osnovnog paketa, plus:',
          `Audio vodič na sva 4 jezika (SR, EN, DE, RU) — +${PREMIUM_EXTRA}€ po turi`,
          'Izrada plana stana ako ga nekretnina nema',
          'Lokacija na mapi uz svaku turu',
          'Prioritetno zakazivanje termina',
          'Stalni kontakt za agenciju'
        ],
        cta: 'Zatražite ponudu',
        track: 'price_premium',
        badge: 'Za strane kupce'
      }
    ],
    fine: '* Cene su prosečne, za stan od oko 50m². Za manje i veće stanove cenu formiramo prema broju prostorija — javite kvadraturu i broj soba, pa šaljemo tačnu ponudu. Za gradove van Kragujevca dogovaramo posebno.'
  },
  agencyBridge: {
    eyebrow: 'Za agencije',
    title: 'Vodite više oglasa odjednom?',
    text:
      'Za agencije smo napravili posebnu stranu. Tamo piše kako agenti šalju osnovne podatke kroz upitnik — sami ili zajedno sa nama — kako tura ide na sajt agencije i šta sve dobijate uz mesečni paket.',
    points: ['Upitnik — sami ili zajedno sa nama', 'Kontakt agenta u svakoj turi', 'Praćenje poseta po oglasu'],
    cta: 'Pogledajte stranu za agencije →'
  },
  integration: {
    eyebrow: 'Integracija',
    title: 'Ugradnja na vaš sajt u jednom koraku',
    desc: 'Dobijate gotov kod za ugradnju. Ubacite ga na stranicu nekretnine i tura odmah radi u okviru vašeg sajta — bez programera.'
  },
  faq: {
    eyebrow: 'Česta pitanja',
    title: 'Pre nego što zakažete',
    note: 'Ono što agencije i vlasnici najčešće pitaju pre prvog snimanja. Ako vašeg pitanja nema, javite nam se.'
  },
  contact: {
    eyebrow: 'Kontakt',
    title: 'Zakažite snimanje',
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
    title: 'Kvadrat360 — 360° virtual tours and HDR real estate photography',
    description:
      'Professional 360° virtual tours and HDR photos for real estate agencies and owners who sell or rent. Audio guide in Serbian, English, German and Russian.'
  },
  nav: {
    brandAria: 'Kvadrat360, top of the page',
    examples: 'Sample tours',
    how: 'How it works',
    benefits: 'Benefits',
    packages: 'Packages',
    faq: 'FAQ',
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
      'A 360° virtual tour and HDR photos show every corner up front, for an agency’s whole portfolio or a single listing — only genuinely interested buyers and tenants come to viewings, ready to decide quickly.',
    ctaTour: '▶ View a sample tour',
    ctaPackages: 'Packages for agencies',
    trust: ['🎧 Audio guide SR · EN · DE · RU', '⏱ Delivery within 48h'],
    opens: (count) => `👁 ${count}+ tour views`
  },
  categories: { sale: 'For sale', rent: 'For rent', booking: 'Short stay' },
  tourCard: {
    rooms: (count) => (count === 1 ? '1 room' : `${count} rooms`),
    open: 'Open the tour →'
  },
  examples: {
    eyebrow: 'Sample tours',
    title: 'Walk through a real tour',
    note: 'Tours that are live right now — they open in the browser, on a phone or computer, with no app to download.'
  },
  benefits: {
    eyebrow: 'Benefits',
    title: 'Why a virtual tour sells better',
    note: 'What the tour and HDR photos do for you and your clients — not the technology behind them.',
    items: [
      { title: 'Fewer wasted viewings', text: 'Buyers and tenants “walk” through the apartment online first — only the seriously interested come to see it in person.' },
      { title: 'A listing that stands out', text: 'HDR photos and a 360° tour instantly set your listing apart from ones shot on a phone.' },
      { title: 'Reach buyers abroad', text: 'The audio guide is available in Serbian, English, German and Russian — no interpreter needed.' },
      { title: 'A guided walkthrough', text: 'Visitors choose: let the guide take them through every room and explain what is where, or explore on their own, at their own pace.' },
      { title: 'Faster decisions', text: 'A buyer or tenant who has already “walked” through the apartment comes to the viewing with fewer questions and decides faster.' },
      { title: 'Everything in one place', text: 'The floor plan, location and your contact details are inside the same tour — no extra calls or emails.' },
      { title: 'A professional first impression', text: 'Quality photography and a polished tour build trust before the first contact.' },
      { title: 'Open 24/7, on any device', text: 'The property is “open” for viewing at any time, in the browser on a phone or a computer — no appointments, no app to download.' }
    ]
  },
  steps: {
    eyebrow: 'How it works',
    title: 'From the first call to a finished tour',
    note: 'A simple process on your side — we take care of the rest.',
    items: [
      { title: 'Booking', text: 'Book a time by phone or through the form — we arrive with our equipment at the agreed time, without disturbing residents or tenants.' },
      { title: 'Shooting', text: '30–60 minutes per property: 360° panoramas of every room plus HDR photos for the listing.' },
      { title: 'Editing', text: 'Stitching the panoramas, color calibration and preparing the audio guide in the languages you need.' },
      { title: 'Delivery', text: 'The link to the finished tour and the photos arrive within 48 hours — ready to add to the listing the same day.' }
    ],
    deliverTitle: 'What you get',
    deliver: [
      'An interactive 360° tour with navigation through every room',
      'HDR photos ready for listings and social media',
      'An automatic guided walkthrough, with free exploring as an option',
      'An audio guide in Serbian, English, German and Russian',
      'The floor plan and location built into the tour',
      'Your contact card, visible throughout the tour'
    ]
  },
  types: {
    eyebrow: 'Listing types',
    title: 'Same tour, different focus',
    note: 'Whether an agency manages a whole portfolio or an owner lists a single property, the emphasis and questions in the tour follow the purpose of the listing.',
    faqLabel: 'Typical question',
    items: [
      { eyebrow: 'Sale', title: 'Long-term value', focus: 'Focus on floor area, condition and ownership — what matters when deciding to buy.', faq: '“Is the property registered, and what is the ownership status?”' },
      { eyebrow: 'Rent', title: 'Everyday practicality', focus: 'Focus on monthly costs, lease terms and move-in date — what a future tenant wants to know.', faq: '“What are the average monthly costs, and what kind of heating is there?”' },
      { eyebrow: 'Short-term stays', title: 'The guest’s impression', focus: 'Focus on atmosphere, capacity and house rules — what a guest checks before booking.', faq: '“What are the exact check-in and check-out times?”' }
    ]
  },
  pricing: {
    eyebrow: 'Packages',
    title: 'Built for agencies, open to individuals',
    note: 'Monthly packages are designed for agencies with a steady flow of listings; owners selling or renting on their own choose a single tour.',
    plans: [
      {
        audience: 'For individual owners',
        title: 'Single tour',
        from: 'from',
        count: 1,
        packageType: 'basic',
        unit: '/ property',
        items: [
          `360° tour with audio guide — ${enTour(1)}`,
          `HDR photos, one per room — ${enHdr(1)}`,
          'Audio guide in Serbian + a language of your choice',
          'Delivery within 48 hours'
        ],
        cta: 'Request a quote',
        track: 'price_single'
      },
      {
        audience: 'For agencies · Basic package',
        title: 'Agency Basic',
        from: 'from',
        count: 3,
        packageType: 'basic',
        unit: '/ month (3 tours)',
        items: [
          `360° tour with audio guide — ${enTour(3)} per tour`,
          `HDR photos, one per room — ${enHdr(3)} per property`,
          'Audio guide in Serbian + one language of your choice (EN, DE or RU)',
          'Floor plan with every tour',
          'Delivery within 48 hours'
        ],
        cta: 'Request a quote',
        track: 'price_basic',
        badge: 'Recommended for agencies'
      },
      {
        audience: 'For agencies · Premium package',
        title: 'Agency Premium',
        from: 'from',
        count: 3,
        packageType: 'premium',
        unit: '/ month (3 tours)',
        items: [
          'Everything in Basic, plus:',
          `Audio guide in all 4 languages (SR, EN, DE, RU) — +€${PREMIUM_EXTRA} per tour`,
          'We draw the floor plan if the property doesn’t have one',
          'Location on the map with every tour',
          'Priority scheduling',
          'A dedicated contact for your agency'
        ],
        cta: 'Request a quote',
        track: 'price_premium',
        badge: 'For foreign buyers'
      }
    ],
    fine: '* Prices are averages, for a flat of about 50m². For smaller and larger flats we quote by the number of rooms — tell us the size and room count and we will send an exact quote. Cities outside Kragujevac are arranged separately.'
  },
  integration: {
    eyebrow: 'Integration',
    title: 'Embed it on your website in one step',
    desc: 'We deliver a ready-made iframe code. Paste it into the property page and the tour is instantly available to visitors — no extra development.'
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Before you book',
    note: 'What agencies and owners most often ask before the first shoot. If your question isn’t here, get in touch.'
  },
  contact: {
    eyebrow: 'Contact',
    title: 'Book a shoot',
    note: 'We reply within 24 hours on business days — or reach us right away by phone or message:',
    call: 'Call',
    labels: { phone: 'Phone', email: 'Email', address: 'Address', hours: 'Hours' },
    hours: 'Mon–Sat, 8 am – 8 pm',
    country: 'Serbia'
  },
  footer: '© 2026 Kvadrat360 · Turnkey virtual tours for real estate.'
};

export const HOME_COPY: Record<HomeLang, HomeCopy> = { sr, en };
