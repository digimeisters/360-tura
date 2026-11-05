/**
 * Tekst strane "Za agencije" (/za-agencije).
 *
 * Odvojeno od homeCopy.ts, jer je ovo prodajna strana za jednu publiku:
 * agencija u Kragujevcu koja već ima priliv oglasa. Priča je namerno
 * lokalna (vlasnik je to tražio - vidi memoriju "local market
 * positioning"): isti stan kod više agencija, vožnja na razgledanja,
 * kupci iz okolnih gradova, vlasnik koji bira agenciju. Strani kupci su
 * dodatak u Premium paketu, ne glavna poruka.
 *
 * Ne obećava se ništa preko onoga što aplikacija danas radi. Brojke iz
 * sveta (Matterport, Zillow) stoje sa izvorom; primer izveštaja je jasno
 * označen kao primer.
 *
 * Tekst između zvezdica u naslovima ide u kurziv (lib/accent.tsx).
 */

export type AgencyCopy = {
  meta: { title: string; description: string };
  nav: { brandAria: string; buyer: string; owner: string; packages: string; faq: string; home: string; cta: string };
  hero: {
    eyebrow: string;
    title: string;
    lede: string;
    ctaContact: string;
    /** Drugo dugme u vrhu: cene. Tura je već u samom vrhu (HeroTour), sa svojim dugmetom. */
    ctaPrices: string;
    trust: string[];
  };
  buyer: {
    eyebrow: string;
    title: string;
    note: string;
    steps: { time: string; title: string; text: string }[];
    /** Jedan telefon sa Viber razgovorom (vlasnik, 5. 11. 2026; maketa public/mockup/Cetvrtak2140.html). */
    chat: { app: string; sub: string; day: string; message: string; card: string; sent: string; reply: string; replyAt: string; followUp: string; followUpAt: string; call: string; callAt: string };
    /** Kraj priče: poziv odmah ispod vremenske linije. */
    end: { text: string; cta: string };
  };
  /** Razgledanje uživo odmah posle kupčeve priče (02): pravi ekrani agenta i kupca (public/hero/tura-koraci/uzivo-*.webp). */
  live: { eyebrow: string; title: string; text: string; steps: { title: string; text: string }[]; use: string; cta: string };
  /** Ispod "Pet dugmadi" (TourModulesShowcase): ono što dugmad u turi ne pokazuju. Samo ono što aplikacija danas radi. */
  extras: { title: string; items: { title: string; text: string }[] };
  owner: {
    eyebrow: string;
    title: string;
    text: string;
    points: string[];
    report: {
      title: string;
      badge: string;
      kpis: { label: string; value: string; delta: string }[];
      roomsTitle: string;
      rooms: { name: string; pct: number }[];
      /** Izvori poseta (visitSources.ts) - samo redosled, bez izmišljenih procenata. */
      sourcesTitle: string;
      sources: string[];
      chips: string[];
    };
  };
  proof: {
    eyebrow: string;
    title: string;
    /** Svaka brojka mora da ima javni izvor koji agent može da otvori (url). */
    items: { value: string; label: string; source: string; url: string }[];
  };
  steps: {
    eyebrow: string;
    title: string;
    note: string;
    items: { title: string; text: string }[];
    /** Kod za ugradnju na sajt agencije - ispod koraka (ranije u "Šest stvari"). */
    embed: { summary: string; text: string };
  };
  faq: { eyebrow: string; title: string; note: string; items: { question: string; answer: string }[] };
  contact: {
    eyebrow: string;
    title: string;
    note: string;
    call: string;
    hours: string;
  };
  footer: string;
};

export const AGENCY_COPY: AgencyCopy = {
  meta: {
    title: 'Kvadrat360 za agencije — 360° ture za oglase u Kragujevcu',
    description:
      '360° ture za oglase agencija u Kragujevcu i okolini: vaš oglas se izdvaja, manje je uzaludnih razgledanja, a vlasnik svakog meseca dobija brojke.'
  },
  nav: {
    brandAria: 'Kvadrat360, početna strana',
    buyer: 'Kupac',
    owner: 'Vlasnik',
    packages: 'Cene',
    faq: 'Pitanja',
    home: 'Početna',
    cta: 'Zakažite snimanje'
  },
  hero: {
    eyebrow: '360° ture za agencije · Kragujevac i okolina',
    title: 'Ista nekretnina, tri agencije. *Kupac zove vas.*',
    lede:
      'Kad je vaš oglas jedini u kome kupac može da prošeta kroz nekretninu, zove vas. Mi snimamo — vi za 24–48h dobijate turu za oglas.',
    ctaContact: 'Zakažite snimanje',
    ctaPrices: 'Pogledajte cene',
    trust: ['Snimanje 30–60 min', 'Tura za 24–48h', 'Radi na svakom telefonu']
  },
  buyer: {
    eyebrow: 'Kupčeva strana priče',
    title: 'Četvrtak, 21:40. Mama studenta iz Kraljeva *„ulazi“ u stan.*',
    note: 'Vi ste odavno kod kuće. Ona je 55 kilometara daleko. Tura radi umesto vas.',
    steps: [
      { time: '21:40', title: 'Link u Viber poruci', text: 'Bez aplikacije i bez prijave. Otvara se odmah.' },
      { time: '21:41', title: 'Šetaju kroz stan', text: 'Vodič ih provede kroz sobe, uz glas i titlove.' },
      { time: '21:46', title: 'Znaju raspored', text: 'Plan pokazuje gde su i šta su već videli.' },
      { time: '21:50', title: 'Javljaju se vama', text: 'Poziv ili zahtev za razgledanje, jednim dodirom.' }
    ],
    chat: {
      app: 'Agencija · Kragujevac',
      sub: 'Viber',
      day: 'Četvrtak',
      message: 'Dobro veče! Evo stana kod Ekonomskog fakulteta, možete ga obići odmah:',
      card: 'Jednosoban · Centar',
      sent: '21:40',
      reply: 'Hvala, gledamo odmah sa sinom!',
      replyAt: '21:41',
      followUp: 'Baš nam se dopao. Možemo li u petak ujutru da dođemo?',
      followUpAt: '21:49',
      call: 'Dolazni poziv',
      callAt: '21:50'
    },
    end: {
      text: 'Ovakav link šaljete svakom kupcu, od prvog snimanja.',
      cta: 'Zakažite snimanje'
    }
  },
  live: {
    eyebrow: 'Razgledanje uživo',
    title: 'Kupac je u drugom gradu? *Provedite ga lično, sa svog telefona.*',
    text: 'Vi se krećete kroz turu, a kupac na svom telefonu vidi isti kadar, u istom trenutku. Razgovarate telefonom ili Viberom, kao da ste zajedno na razgledanju.',
    steps: [
      { title: 'Dodirnete „● Uživo“', text: 'U turi, na svom telefonu.' },
      { title: 'Pošaljete link', text: 'Viberom ili kopiranjem. Kupac ne instalira ništa i ne pravi nalog.' },
      { title: 'Vodite ga kroz prostorije', text: 'Gde vi uđete, uđe i on. Pozovete ga i pričate dok šetate.' }
    ],
    use: 'Kad pomaže: kupac iz drugog grada, roditelji koji biraju stan za studenta, drugo gledanje pre odluke.',
    cta: 'Zakažite snimanje'
  },
  extras: {
    title: 'Još uz svaku turu',
    items: [
      { title: 'Gotov tekst oglasa', text: 'Za 4zida, Halo oglase i društvene mreže.' },
      { title: 'Tura na vašem sajtu', text: 'Kod za ugradnju u sajt agencije.' },
      { title: 'Na jeziku kupca', text: 'Do četiri jezika: srpski, engleski, nemački i ruski.' },
      { title: 'Šta kupce zanima', text: 'Najgledanije prostorije i odakle dolaze posetioci.' },
      { title: 'Prodato? Tura se zaključa', text: 'Stari link pokazuje vaš kontakt, pa poziv ide na drugu nekretninu.' }
    ]
  },
  owner: {
    eyebrow: 'Vlasnik nekretnine',
    title: 'Vlasnik bira agenciju. *Pokažite mu više.*',
    text:
      'Kad dođete po nalog, ponesite primer ture na telefonu. Vlasnik odmah vidi kako će njegova nekretnina izgledati u oglasu — i da u nju nećete dovoditi svakoga.',
    points: [
      'Oglas koji se izdvaja od ostalih agencija',
      'Manje nepoznatih ljudi u njegovom prostoru',
      'Svakog meseca izveštaj: koliko je ljudi pogledalo njegovu nekretninu'
    ],
    report: {
      title: 'Mesečni izveštaj · Stan, Centar',
      badge: 'Primer',
      kpis: [
        { label: 'Pogledali turu', value: '184', delta: '+32%' },
        { label: 'Prosečno vreme', value: '3:40', delta: '+18%' },
        { label: 'Zahtevi za termin', value: '4', delta: '+2' }
      ],
      roomsTitle: 'Najgledanije prostorije',
      rooms: [
        { name: 'Dnevni boravak', pct: 100 },
        { name: 'Kuhinja', pct: 74 },
        { name: 'Terasa', pct: 61 }
      ],
      sourcesTitle: 'Odakle dolaze posetioci',
      sources: ['4zida', 'Facebook', 'Halo oglasi', 'Viber'],
      chips: ['Sačuvaj kao PDF', 'Poređenje sa prošlim mesecom']
    }
  },
  proof: {
    eyebrow: 'Nije samo naša priča',
    title: 'Tržišta koja su ture uvela pre nas *već imaju brojke.*',
    // Pregled 23. 10. 2026: "+49% kvalifikovanih upita" je izbačen - kruži po
    // marketinškim stranama, ali bez ijedne javne studije iza sebe. Ostale
    // dve brojke vode na originalni tekst.
    items: [
      {
        value: 'do 31%',
        label: 'brža prodaja sa 3D/360° turom',
        source: 'Matterport, analiza MLS prodaja na 4 tržišta u SAD',
        url: 'https://matterport.com/blog/3d-tours-properties-sell-31-faster-and-higher-price'
      },
      {
        value: '+79%',
        label: 'pregleda oglasa sa turom i osnovom nekretnine',
        source: 'Zillow Showcase, podaci Zillow-a (2025)',
        url: 'https://zillow.mediaroom.com/2025-09-30-More-than-50-brokerages-adopt-Zillow-Showcase-as-go-to-tool-for-listing-marketing-innovation'
      }
    ]
  },
  steps: {
    eyebrow: 'Kako radimo',
    // Nevidljiv razmak drži "ne uči" zajedno u istom redu.
    title: 'Vaš tim ne uči *ništa novo.*',
    note:
      'Mi smo iz Kragujevca. Dolazimo, snimamo i javljamo se na telefon — nema pretplate na softver koji niko u agenciji ne stigne da nauči.',
    items: [
      { title: 'Pošaljete podatke o nekretnini', text: 'Kroz kratak upitnik — ili ga zajedno popunimo preko telefona.' },
      { title: 'Mi snimamo, 30–60 minuta', text: 'Dovoljno je da nam neko otvori vrata.' },
      { title: 'Za 24–48h: tura sa opisom i audio vodičem', text: 'Link za oglas i Viber, kod za vaš sajt i gotov tekst oglasa za 4zida, Halo i mreže. Uz Premium i osnovu nekretnine.' },
      { title: 'Svakog meseca: izveštaj', text: 'Brojke za sve vaše ture, spremne za vlasnike.' }
    ],
    embed: {
      summary: 'Za vašeg programera: kod za ugradnju na sajt agencije',
      text: 'Ubacite ovaj kod na stranicu nekretnine i tura radi u okviru vašeg sajta:'
    }
  },
  faq: {
    eyebrow: 'Pitanja agencija',
    title: 'Ono što agencije pitaju *pre prve saradnje*',
    note: 'Ako vašeg pitanja nema, javite se — odgovaramo u najkraćem roku, u toku radnog dana.',
    items: [
      {
        question: 'Da li neko iz agencije mora da bude prisutan tokom snimanja?',
        answer:
          'Ne mora — dovoljno je da nam neko otvori vrata. Snimanje traje 30–60 minuta i tokom njega u prostoriji ne treba da bude nikoga, jer 360° kamera vidi ceo prostor. Pomaže ako su pre toga upaljena svetla, razgrnute zavese i sklonjene lične stvari.'
      },
      {
        question: 'Mogu li lično da provedem kupca kroz turu, uživo?',
        answer:
          'Da. U turi dodirnete „● Uživo“ i pošaljete kupcu link (Viber ili kopiranje). Kupac ga otvori na svom telefonu, pridruži se jednim dodirom i prati tačno ono što vi gledate dok se krećete kroz prostorije — bez instalacije i bez prijave, na oba telefona.'
      },
      {
        question: 'Kako dobijamo mesečni izveštaj?',
        answer:
          'Šaljemo vam jedan link koji otvara izveštaj za sve ture vaše agencije — bez prijave i lozinke. Link je zaštićen: niko drugi ne može da vidi vaše brojke, a izmenom linka ne mogu se otvoriti ni brojke druge agencije. Izveštaj možete sačuvati kao PDF i poslati vlasniku nekretnine.'
      },
      {
        question: 'Šta se dešava kada se nekretnina izda ili proda?',
        answer:
          'Turu zaključavamo jednim klikom. Ko otvori stari link, umesto ture vidi kratku poruku da nekretnina više nije dostupna — ali sa kontaktom agenta, pa taj poziv može da završi na nekoj vašoj drugoj nekretnini. Kad se ista nekretnina vrati u ponudu, tura se otključava jednim klikom, bez novog snimanja.'
      },
      {
        question: 'Šta ako se nešto u prostoru promeni posle snimanja?',
        answer:
          'Ponovo snimamo samo prostorije koje su se promenile i zamenjujemo ih u postojećoj turi. Link ostaje isti, pa oglasi i poruke koje ste već poslali nastavljaju da rade. Cenu dodatnog snimanja dogovaramo prema broju prostorija.'
      },
      {
        question: 'Koliko dugo tura ostaje online?',
        answer:
          'Bez vremenskog ograničenja — link trajno ostaje aktivan. Kada nekretninu pauzirate, posetilac umesto ture vidi kratku poruku, a ime agencije i telefon ostaju vidljivi.'
      },
      {
        question: 'Da li postoji obavezan ugovor ili minimalni period?',
        answer:
          'Ne. Plaćate po snimljenoj nekretnini — bez pretplate i bez minimalnog perioda. U mesecu u kom snimamo više nekretnina za vas, cena po svakoj je niža.'
      },
      {
        question: 'U kojim gradovima snimate?',
        answer:
          'U Kragujevcu i okolini. Za druge gradove dolazimo po dogovoru — javite koliko nekretnina imate i gde, pa ćemo reći šta je izvodljivo.'
      }
    ]
  },
  contact: {
    eyebrow: 'Kraj priče — ili početak',
    title: 'Sledeća nekretnina koju dobijete — neka je kupci obiđu *pre prvog razgledanja.*',
    note: 'Javite koliko nekretnina mesečno oglašavate, a mi vam u roku od 24h (radnim danima) šaljemo predlog. Ili se javite odmah:',
    call: 'Pozovite',
    hours: 'Pon–Sub, 08–20h'
  },
  footer: '© 2026 Kvadrat360 · Virtuelne ture za nekretnine, ključ u ruke.'
};
