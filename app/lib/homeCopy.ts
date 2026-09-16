// Tekst početne strane na srpskom (/) i engleskom (/en). Raspored je jedan
// (app/HomePage.tsx), pa se nova rečenica dodaje ovde u oba jezika.

import { PREMIUM_EXTRA, PRICE_TIERS, packagePrice, tierIndexFor, tourPrice, type PackageType } from './pricing';

// Iznosi na karticama paketa se računaju iz cena (lib/pricing.ts). Kartice
// uvek prikazuju REDOVNU cenu - promocija ide kroz PromoBanner, da traka
// može sama da nestane kad kampanja istekne.
const tierFor = (count: number) => PRICE_TIERS[tierIndexFor(count)];
const srAmount = (count: number, pkg: PackageType = 'basic') => `${packagePrice(count, pkg)}€`;
const enAmount = (count: number, pkg: PackageType = 'basic') => `€${packagePrice(count, pkg)}`;
// Stavke se prikazuju odvojeno (tura 50€ + HDR 20€), da se ne čita kao da
// cela cena ide na samu turu.
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
  amount: string;
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
    title: 'Kvadrat360 — Virtuelne ture i HDR fotografija nekretnina',
    description:
      'Profesionalne 360° virtuelne ture i HDR fotografije za agencije za nekretnine i vlasnike koji prodaju ili izdaju. Audio vodič na srpskom, engleskom, nemačkom i ruskom.'
  },
  nav: {
    brandAria: 'Kvadrat360, početak strane',
    examples: 'Primeri tura',
    how: 'Kako radimo',
    benefits: 'Benefiti',
    packages: 'Paketi',
    faq: 'Pitanja',
    agencies: 'Za agencije',
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
      'Virtuelna 360° tura i HDR fotografije pokazuju svaki ugao unapred, za ceo portfolio agencije ili pojedinačan oglas — dolaze samo ozbiljno zainteresovani kupci i zakupci, spremni da brzo donesu odluku.',
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
    note: 'Ture koje su trenutno objavljene — otvaraju se u pretraživaču, na telefonu ili računaru, bez preuzimanja aplikacije.',
    allTours: 'Pogledajte sve ture →'
  },
  benefits: {
    eyebrow: 'Benefiti',
    title: 'Zašto virtuelna tura prodaje bolje',
    note: 'Ono što tura i HDR fotografije donose vama i vašim klijentima — ne tehnologija iza toga.',
    items: [
      { title: 'Manje uzaludnih poseta', text: 'Kupci i zakupci prvo „prošetaju“ kroz stan online — na razgledanje dolaze samo ozbiljno zainteresovani.' },
      { title: 'Oglas koji se izdvaja', text: 'HDR fotografije i 360° tura odmah odvajaju oglas od onih sa slikama telefonom.' },
      { title: 'Doseg do inostranih kupaca', text: 'Audio vodič je dostupan na srpskom, engleskom, nemačkom i ruskom — bez potrebe za prevodiocem.' },
      { title: 'Vođena tura, bez klikanja', text: 'Posetilac bira: da ga vodič sam provede kroz sve prostorije i ispriča šta se gde nalazi, ili da razgleda sam, svojim tempom.' },
      { title: 'Brža odluka', text: 'Kupac ili zakupac koji je već „prošetao“ kroz stan dolazi na razgledanje sa manje pitanja i brže se odlučuje.' },
      { title: 'Sve na jednom mestu', text: 'Plan stana, lokacija i vaš kontakt dostupni su unutar iste ture — bez dodatnih poziva i mejlova.' },
      { title: 'Profesionalan prvi utisak', text: 'Kvalitetna fotografija i uređena tura grade poverenje pre prvog kontakta.' },
      { title: 'Otvoreno 24 sata, na svakom uređaju', text: 'Nekretnina je „otvorena“ za razgledanje u svakom trenutku, u pretraživaču na telefonu ili računaru — bez zakazivanja i bez preuzimanja aplikacije.' }
    ]
  },
  steps: {
    eyebrow: 'Kako radimo',
    title: 'Od poziva do gotove ture',
    note: 'Jednostavan proces sa vaše strane — mi vodimo računa o ostatku.',
    items: [
      { title: 'Zakazivanje', text: 'Dogovorite termin telefonom ili preko forme — dolazimo sa opremom u ugovoreno vreme, bez ometanja stanara ili zakupaca.' },
      { title: 'Snimanje', text: '30–60 minuta po nekretnini: 360° panorame svake prostorije i HDR fotografije za oglas.' },
      { title: 'Obrada', text: 'Spajanje panorame, kalibracija boja i priprema audio vodiča na jezicima koji su vam potrebni.' },
      { title: 'Isporuka', text: 'Link za gotovu turu i fotografije stiže za 48h — spremno za postavljanje na oglas istog dana.' }
    ],
    deliverTitle: 'Šta dobijate',
    deliver: [
      'Interaktivnu 360° turu sa navigacijom kroz sve prostorije',
      'HDR fotografije spremne za oglas i društvene mreže',
      'Automatsko vođenje kroz prostor, uz mogućnost samostalnog razgledanja',
      'Audio vodič na srpskom, engleskom, nemačkom i ruskom',
      'Plan stana i lokaciju integrisane u turu',
      'Vašu kontakt karticu, vidljivu tokom cele ture'
    ]
  },
  types: {
    eyebrow: 'Tipovi oglasa',
    title: 'Ista tura, drugačiji fokus',
    note: 'Bilo da agencija vodi ceo portfolio ili vlasnik oglašava jednu nekretninu, naglasak i pitanja u turi prate namenu oglasa.',
    faqLabel: 'Tipično pitanje',
    items: [
      { eyebrow: 'Prodaja', title: 'Dugoročna vrednost', focus: 'Fokus na kvadraturu, stanje objekta i vlasništvo — informacije koje su bitne za odluku o kupovini.', faq: '„Da li je nekretnina uknjižena i kakvo je vlasništvo?“' },
      { eyebrow: 'Izdavanje', title: 'Svakodnevna praktičnost', focus: 'Fokus na mesečne troškove, uslove ugovora i datum useljenja — ono što zanima budućeg stanara.', faq: '„Koliki su prosečni mesečni troškovi i kakvo je grejanje?“' },
      { eyebrow: 'Kratkoročni smeštaj', title: 'Utisak gosta', focus: 'Fokus na atmosferu, kapacitet i uslove boravka — ono što gost proverava pre rezervacije.', faq: '„Koje je tačno vreme za check-in i check-out?“' }
    ]
  },
  pricing: {
    eyebrow: 'Paketi',
    title: 'Osmišljeno za agencije, otvoreno i za pojedince',
    note: 'Mesečni paketi su zamišljeni za agencije sa stalnim prilivom oglasa; vlasnici koji prodaju ili izdaju samostalno biraju pojedinačnu turu.',
    plans: [
      {
        audience: 'Za pojedinačne vlasnike',
        title: 'Pojedinačna tura',
        from: 'od',
        amount: srAmount(1),
        unit: '/ nekretnina',
        items: [
          `360° tura sa audio vodičem — ${srTour(1)}`,
          `HDR fotografije, jedna po prostoriji — ${srHdr(1)}`,
          'Audio vodič na srpskom + jeziku po izboru',
          'Isporuka za 48h'
        ],
        cta: 'Zatražite ponudu',
        track: 'price_single'
      },
      {
        audience: 'Za agencije · Osnovni paket',
        title: 'Agencija Osnovni',
        from: 'od',
        amount: srAmount(3, 'basic'),
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
        amount: srAmount(3, 'premium'),
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
    fine: '* Cene su orijentacione i važe za nekretnine do 50m² — izračunajte tačnu ispod. Za veću kvadraturu i druge gradove van Kragujevca javite nam se za ponudu.'
  },
  integration: {
    eyebrow: 'Integracija',
    title: 'Ugradnja na vaš sajt u jednom koraku',
    desc: 'Isporučujemo gotov iframe kod. Ubacite ga na stranicu nekretnine i tura je odmah dostupna posetiocima — bez dodatnog razvoja.'
  },
  faq: {
    eyebrow: 'Česta pitanja',
    title: 'Pre nego što zakažete',
    note: 'Šta agencije i vlasnici najčešće pitaju pre prvog snimanja. Ako vašeg pitanja nema, javite nam se.'
  },
  contact: {
    eyebrow: 'Kontakt',
    title: 'Zakažite snimanje',
    note: 'Odgovaramo u roku od 24h radnim danima — ili se javite odmah, pozivom ili porukom:',
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
        amount: enAmount(1),
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
        amount: enAmount(3, 'basic'),
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
        amount: enAmount(3, 'premium'),
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
    fine: '* Prices are indicative, for properties up to 50m² — work out the exact price below. For larger properties or other cities, contact us for a quote.'
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
