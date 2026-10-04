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

type DayRow = { day: string; title: string; text: string };

export type AgencyCopy = {
  meta: { title: string; description: string };
  nav: { brandAria: string; week: string; buyer: string; owner: string; packages: string; faq: string; home: string; cta: string };
  hero: {
    eyebrow: string;
    title: string;
    lede: string;
    ctaContact: string;
    /** Drugo dugme u vrhu: otvara primer ture (agent prvo želi da vidi proizvod). */
    ctaTour: string;
    trust: string[];
  };
  week: {
    eyebrow: string;
    title: string;
    note: string;
    without: { title: string; tag: string; days: DayRow[] };
    with: { title: string; tag: string; days: DayRow[] };
  };
  buyer: {
    eyebrow: string;
    title: string;
    note: string;
    steps: { time: string; title: string; text: string }[];
    chat: { app: string; message: string; card: string; reply: string };
    guide: { room: string; label: string; caption: string };
    plan: { title: string; rooms: [string, string, string]; legend: string };
    contact: { title: string; agent: string; agency: string; call: string; book: string; note: string };
    /** Kraj priče: poziv odmah posle četvrtog ekrana. */
    end: { text: string; cta: string };
  };
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
      chips: string[];
    };
  };
  /** Poziv na sredini strane, posle priče i dokaza - pre cena. */
  midCta: {
    /** Naslov; iza njega ide ulazna cena ("od 6.000 din."), računa je FromPrice pa prati akciju. */
    title: string;
    points: string[];
    button: string;
    call: string;
  };
  proof: {
    eyebrow: string;
    title: string;
    items: { value: string; label: string; source: string }[];
  };
  steps: {
    eyebrow: string;
    title: string;
    note: string;
    items: { title: string; text: string }[];
    /** Kod za ugradnju na sajt agencije - ispod koraka (ranije u "Šest stvari"). */
    embed: { summary: string; text: string };
  };
  pricing: { eyebrow: string; titleStart: string; note: string; fine: string };
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
    week: 'Vaša nedelja',
    buyer: 'Kupac',
    owner: 'Vlasnik',
    packages: 'Cene',
    faq: 'Pitanja',
    home: 'Početna',
    cta: 'Zatražite ponudu'
  },
  hero: {
    eyebrow: '360° ture za agencije · Kragujevac i okolina',
    title: 'Ista nekretnina, tri agencije. *Kupac zove vas.*',
    lede:
      'Kad je vaš oglas jedini u kome kupac može da prošeta kroz nekretninu, zove vas. Mi snimamo — vi za 48h dobijate turu za oglas.',
    ctaContact: 'Zatražite ponudu',
    ctaTour: 'Pogledajte primer ture',
    trust: ['Snimanje 30–60 min', 'Tura za 24–48h', 'Radi na svakom telefonu']
  },
  week: {
    eyebrow: 'Vaša nedelja',
    title: 'Jedna nekretnina. Ista nedelja. *Dva ishoda.*',
    note: 'Levo je nedelja koju zna svaki agent u Kragujevcu. Desno — ista nekretnina, isti kupci, samo sa turom u oglasu.',
    without: {
      title: 'Bez ture',
      tag: 'samo fotografije u oglasu',
      days: [
        { day: 'PON', title: 'Istu nekretninu na portalu oglašavaju još dve agencije.', text: 'Iste fotografije, ista cena. Kupac zove onoga ko se prvi javi.' },
        { day: 'UTO', title: 'Vožnja od Aerodroma do Stanova za razgledanje.', text: 'Kupac posle tri minuta: „Nije to za nas.“ Pola popodneva je otišlo.' },
        { day: 'ČET', title: 'Roditelji studenta iz Kraljeva.', text: '„Možemo da dođemo tek u subotu.“ Do subote je stan već izdat nekom drugom.' },
        { day: 'SUB', title: 'Zove vlasnik: „Šta ste uradili ove nedelje?“', text: 'A stanar se žali što mu svaki dan neko dolazi u stan.' }
      ]
    },
    with: {
      title: 'Sa turom',
      tag: '360° tura u vašem oglasu',
      days: [
        { day: 'PON', title: 'Vaš oglas je onaj sa šetnjom kroz nekretninu.', text: 'Kupac ostaje u vašem oglasu i zove vas — ne konkurenciju.' },
        { day: 'UTO', title: 'Vozite se samo na razgledanja koja imaju smisla.', text: 'Dolazi kupac kome se nekretnina već dopala na turi. Već pričate o ceni.' },
        { day: 'ČET', title: 'Roditelji iz Kraljeva obiđu stan uveče, sa telefona.', text: 'I javljaju se odmah — pre nego što ga neko drugi uzme.' },
        { day: 'SUB', title: 'Vlasniku pokazujete brojke.', text: 'Koliko je ljudi pogledalo nekretninu. A stanar otvara vrata samo ozbiljnim kupcima.' }
      ]
    }
  },
  buyer: {
    eyebrow: 'Kupčeva strana priče',
    title: 'Četvrtak, 21:40. Mama studenta iz Kraljeva *„ulazi“ u stan.*',
    note: 'Vi ste odavno kod kuće. Ona je 55 kilometara daleko. Tura radi umesto vas — deset minuta od poruke do poziva.',
    steps: [
      { time: '21:40', title: 'Link u Viber poruci', text: 'Bez aplikacije, bez prijave. Otvara se odmah.' },
      { time: '21:41', title: 'Šetaju kroz stan', text: 'Vodič ih sam provede kroz sobe, uz glas i titlove. Sin gleda gde bi stao sto.' },
      { time: '21:46', title: 'Znaju raspored', text: 'Plan pokazuje gde su i kuda gledaju.' },
      { time: '21:50', title: 'Javljaju se', text: 'Poziv ili Viber poruka jednim dodirom — ili zahtev za termin iz ture.' }
    ],
    chat: {
      app: 'Viber · Agencija',
      message: 'Dobro veče! Evo stana kod Ekonomskog fakulteta — možete ga obići odmah:',
      card: 'Jednosoban · Centar',
      reply: 'Hvala, gledamo odmah sa sinom!'
    },
    guide: { room: 'Soba · 2/5', label: 'Automatsko vođenje', caption: 'Svetla soba sa prozorom na ulicu' },
    plan: { title: 'Plan', rooms: ['Soba', 'Kuhinja', 'Kupatilo'], legend: 'Plavo: ovde ste · Belo: već viđeno · Tamno: još niste bili' },
    contact: {
      title: 'Kontakt agenta',
      agent: 'Vaš agent',
      agency: 'Agencija · Kragujevac',
      call: 'Pozovi agenta',
      book: 'Zakaži razgledanje',
      note: 'Petak ujutru dolaze da potpišu — bez dolaska „da vide“.'
    },
    end: {
      text: 'Ovakav link šaljete svakom kupcu — od prvog snimanja.',
      cta: 'Zatražite turu za sledeći oglas →'
    }
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
      chips: ['Sačuvaj kao PDF', 'Poređenje sa prošlim mesecom']
    }
  },
  midCta: {
    title: 'Probajte na *jednoj nekretnini* —',
    points: ['tura za 48h', 'vaš kontakt u turi', 'izveštaj za vlasnika'],
    button: 'Zatražite ponudu',
    call: 'Pozovite'
  },
  proof: {
    eyebrow: 'Nije samo naša priča',
    title: 'Tržišta koja su ture uvela pre nas *već imaju brojke.*',
    items: [
      { value: 'do 31%', label: 'brža prodaja sa 3D/360° turom', source: 'Matterport, analiza MLS prodaja u SAD' },
      { value: '+79%', label: 'pregleda oglasa sa turom i tlocrtom', source: 'Zillow Showcase' },
      { value: '+49%', label: 'kvalifikovanih upita', source: 'Matterport, interno istraživanje' }
    ]
  },
  steps: {
    eyebrow: 'Kako radimo',
    title: 'Vaš tim ne uči *ništa novo.*',
    note:
      'Mi smo iz Kragujevca. Dolazimo, snimamo i javljamo se na telefon — nema pretplate na softver koji niko u agenciji ne stigne da nauči.',
    items: [
      { title: 'Pošaljete podatke o nekretnini', text: 'Kroz kratak upitnik — ili ga zajedno popunimo preko telefona.' },
      { title: 'Mi snimamo, 30–60 minuta', text: 'Dovoljno je da nam neko otvori vrata.' },
      { title: 'Za 24–48h: tura sa opisom i audio vodičem', text: 'Link za oglas i Viber, i kod za vaš sajt. Uz Premium i tlocrt.' },
      { title: 'Svakog meseca: izveštaj', text: 'Brojke za sve vaše ture, spremne za vlasnike.' }
    ],
    embed: {
      summary: 'Za vašeg programera: kod za ugradnju na sajt agencije',
      text: 'Ubacite ovaj kod na stranicu nekretnine i tura radi u okviru vašeg sajta:'
    }
  },
  pricing: {
    eyebrow: 'Cene',
    titleStart: 'Tura za vaš oglas —',
    note: 'Dva paketa, cena po nekretnini — uključuje turu i HDR fotografije. Što više nekretnina mesečno snimamo za vas, to je cena po svakoj niža.',
    fine:
      '* Cene su prosečne, za prostor od oko 50 m², u Kragujevcu i okolini. Za manje i veće prostore cenu formiramo prema broju prostorija. Za druge gradove i veći obim pravimo poseban predlog.'
  },
  faq: {
    eyebrow: 'Pitanja agencija',
    title: 'Ono što agencije pitaju *pre prve saradnje*',
    note: 'Ako vašeg pitanja nema, javite se — odgovaramo u roku od 24h radnim danima.',
    items: [
      {
        question: 'Da li neko iz agencije mora da bude prisutan tokom snimanja?',
        answer:
          'Ne mora — dovoljno je da nam neko otvori vrata. Snimanje traje 30–60 minuta i tokom njega u prostoriji ne treba da bude nikoga, jer 360° kamera vidi ceo prostor. Pomaže ako su pre toga upaljena svetla, razgrnute zavese i sklonjene lične stvari.'
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
