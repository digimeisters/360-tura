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
  nav: { brandAria: string; week: string; buyer: string; owner: string; benefits: string; packages: string; faq: string; home: string; cta: string };
  hero: {
    eyebrow: string;
    title: string;
    lede: string;
    ctaContact: string;
    ctaStory: string;
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
  benefits: {
    eyebrow: string;
    title: string;
    items: { title: string; text: string }[];
    embed: { summary: string; text: string };
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
      '360° virtuelne ture za agencije za nekretnine u Kragujevcu i okolini: vaš oglas se izdvaja od ostalih agencija, manje uzaludnih razgledanja, kupci iz drugih gradova obiđu stan sa telefona, a vlasnik svakog meseca dobija brojke.'
  },
  nav: {
    brandAria: 'Kvadrat360, početna strana',
    week: 'Vaša nedelja',
    buyer: 'Kupac',
    owner: 'Vlasnik',
    benefits: 'Koristi',
    packages: 'Cene',
    faq: 'Pitanja',
    home: 'Početna',
    cta: 'Zatražite ponudu'
  },
  hero: {
    eyebrow: '360° ture za agencije · Kragujevac i okolina',
    title: 'Isti stan, tri agencije. *Kupac zove vas.*',
    lede:
      'Kad je vaš oglas jedini u kome kupac može da prošeta kroz stan, zove vas. Mi snimamo — vi za 48h dobijate turu za oglas.',
    ctaContact: 'Zatražite ponudu',
    ctaStory: 'Kako to izgleda u praksi ↓',
    trust: ['Snimanje 30–60 min', 'Tura za 48h', 'Radi na svakom telefonu']
  },
  week: {
    eyebrow: 'Vaša nedelja',
    title: 'Jedan stan. Ista nedelja. *Dva ishoda.*',
    note: 'Levo je nedelja koju zna svaki agent u Kragujevcu. Desno — isti stan, isti kupci, samo sa turom u oglasu.',
    without: {
      title: 'Bez ture',
      tag: 'samo fotografije u oglasu',
      days: [
        { day: 'PON', title: 'Isti stan na portalu oglašavaju još dve agencije.', text: 'Iste fotografije, ista cena. Kupac zove onoga ko se prvi javi.' },
        { day: 'UTO', title: 'Vožnja od Aerodroma do Stanova za razgledanje.', text: 'Kupac posle tri minuta: „Nije to za nas.“ Pola popodneva je otišlo.' },
        { day: 'ČET', title: 'Roditelji studenta iz Kraljeva.', text: '„Možemo da dođemo tek u subotu.“ Do subote je stan već izdat nekom drugom.' },
        { day: 'SUB', title: 'Zove vlasnik: „Šta ste uradili ove nedelje?“', text: 'A stanar se žali što mu svaki dan neko dolazi u stan.' }
      ]
    },
    with: {
      title: 'Sa turom',
      tag: '360° tura u vašem oglasu',
      days: [
        { day: 'PON', title: 'Vaš oglas je onaj sa šetnjom kroz stan.', text: 'Kupac ostaje u vašem oglasu i zove vas — ne konkurenciju.' },
        { day: 'UTO', title: 'Vozite se samo na razgledanja koja imaju smisla.', text: 'Dolazi kupac kome se stan već dopao na turi. Pričate o ceni.' },
        { day: 'ČET', title: 'Roditelji iz Kraljeva obiđu stan uveče, sa telefona.', text: 'I javljaju se odmah — pre nego što ga neko drugi uzme.' },
        { day: 'SUB', title: 'Vlasniku pokazujete brojke.', text: 'Koliko ljudi je pogledalo stan. A stanar otvara vrata samo ozbiljnim kupcima.' }
      ]
    }
  },
  buyer: {
    eyebrow: 'Kupčeva strana priče',
    title: 'Četvrtak, 21:40. Mama studenta iz Kraljeva *„ulazi“ u stan.*',
    note: 'Vi ste odavno kod kuće. Ona je 55 kilometara daleko. Tura radi umesto vas — deset minuta od poruke do poziva.',
    steps: [
      { time: '21:40', title: 'Link u Viber poruci', text: 'Bez aplikacije, bez prijave. Otvara se odmah.' },
      { time: '21:41', title: 'Šetaju kroz stan', text: 'Vodič ih sam provede kroz sobe. Sin gleda gde bi stao sto.' },
      { time: '21:46', title: 'Znaju raspored', text: 'Plan pokazuje gde su i šta su već videli.' },
      { time: '21:50', title: 'Zovu vas', text: 'Jednim dodirom — ili pošalju zahtev za termin iz ture.' }
    ],
    chat: {
      app: 'Viber · Agencija',
      message: 'Dobro veče! Evo stana kod Ekonomskog fakulteta — možete ga obići odmah:',
      card: 'Jednosoban · Centar',
      reply: 'Hvala, gledamo odmah sa sinom!'
    },
    guide: { room: 'Soba · 2/5', label: 'Automatsko vođenje', caption: 'Svetla soba sa prozorom na ulicu' },
    plan: { title: 'Plan stana', rooms: ['Soba', 'Kuhinja', 'Kupatilo'], legend: 'Plavo: ovde ste · Belo: već viđeno · Tamno: još niste bili' },
    contact: {
      title: 'Kontakt agenta',
      agent: 'Vaš agent',
      agency: 'Agencija · Kragujevac',
      call: 'Pozovi agenta',
      book: 'Zakaži razgledanje',
      note: 'Petak ujutru dolaze da potpišu — bez dolaska „da vide“.'
    }
  },
  owner: {
    eyebrow: 'Vlasnik stana',
    title: 'Vlasnik bira agenciju. *Pokažite mu više.*',
    text:
      'Kad dođete po nalog, ponesite primer ture na telefonu. Vlasnik odmah vidi kako će njegov stan izgledati u oglasu — i da nećete dovoditi svakoga u njegov stan.',
    points: [
      'Oglas koji se izdvaja od ostalih agencija',
      'Manje nepoznatih ljudi u njegovom stanu',
      'Svakog meseca izveštaj: koliko ljudi je pogledalo vaše oglase'
    ],
    report: {
      title: 'Mesečni izveštaj · Stan, Centar',
      badge: 'Primer',
      kpis: [
        { label: 'Pogledali stan', value: '184', delta: '+32%' },
        { label: 'Prosečno vreme', value: '3:40', delta: '+18%' },
        { label: 'Zahtevi za razgled.', value: '4', delta: '+2' }
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
  benefits: {
    eyebrow: 'Šta konkretno dobijate',
    title: 'Šest stvari koje tura radi *za vašu agenciju.*',
    items: [
      { title: 'Oglas koji se izdvaja', text: 'Kad isti stan oglašava više agencija, kupac ostaje u oglasu u kome može da uđe u stan.' },
      { title: 'Manje uzaludnih razgledanja', text: 'Kupac koji nije za taj stan to vidi na turi — a ne posle vožnje preko grada.' },
      { title: 'Kupci iz drugih gradova', text: 'Roditelji studenata, ljudi koji dolaze zbog posla — obiđu stan odmah, bez putovanja.' },
      { title: 'Dokaz za vlasnika', text: 'Mesečni izveštaj: koliko ljudi je pogledalo stan i ko je tražio razgledanje.' },
      { title: 'Mir za stanara i vlasnika', text: 'Vrata se otvaraju samo kupcima koji su stan već videli i ozbiljno ga razmatraju.' },
      { title: 'Radi i kad vi ne radite', text: 'Ljudi stanove gledaju uveče i vikendom. Tura je otvorena 24 sata — sa vašim telefonom u njoj.' }
    ],
    embed: {
      summary: 'Za vašeg programera: kod za ugradnju na sajt agencije',
      text: 'Ubacite ovaj kod na stranicu nekretnine i tura radi u okviru vašeg sajta:'
    }
  },
  proof: {
    eyebrow: 'Nije samo naša priča',
    title: 'Tržišta koja su ture uvela pre nas *već imaju brojke.*',
    items: [
      { value: 'do 31%', label: 'brža prodaja sa 3D/360° turom', source: 'Matterport, analiza MLS prodaja u SAD' },
      { value: '+79%', label: 'više pregleda oglasa sa turom i floorplanom', source: 'Zillow Showcase' },
      { value: '+49%', label: 'više kvalifikovanih upita', source: 'Matterport, interno istraživanje' }
    ]
  },
  steps: {
    eyebrow: 'Kako radimo',
    title: 'Vaš tim ne uči *ništa novo.*',
    note:
      'Mi smo iz Kragujevca. Dolazimo, snimamo i javljamo se na telefon — nema pretplate na softver koji niko u agenciji ne stigne da nauči.',
    items: [
      { title: 'Pošaljete podatke o stanu', text: 'Kroz kratak upitnik — ili ga popunimo zajedno telefonom.' },
      { title: 'Mi snimamo, 30–60 minuta', text: 'Dovoljno je da nam neko otvori stan.' },
      { title: 'Za 48h: tura, tlocrt, opis na jezicima', text: 'Link za oglas, Viber i kod za vaš sajt.' },
      { title: 'Svakog meseca: izveštaj', text: 'Brojke za sve vaše ture, spremne za vlasnike.' }
    ]
  },
  pricing: {
    eyebrow: 'Cene',
    titleStart: 'Tura za vaš oglas —',
    note: 'Mesečni paketi za agencije sa stalnim prilivom oglasa. Cena po nekretnini uključuje turu i HDR fotografije.',
    fine:
      '* Cene su prosečne, za stan od oko 50m², u Kragujevcu i okolini. Za manje i veće stanove cenu formiramo prema broju prostorija. Za druge gradove i veći obim pravimo poseban predlog.'
  },
  faq: {
    eyebrow: 'Pitanja agencija',
    title: 'Ono što agencije pitaju *pre prve saradnje*',
    note: 'Ako vašeg pitanja nema, javite se — odgovaramo u roku od 24h radnim danima.',
    items: [
      {
        question: 'Da li neko iz agencije mora da bude prisutan tokom snimanja?',
        answer:
          'Ne mora — dovoljno je da nam neko otvori stan. Snimanje traje 30–60 minuta i tokom njega u prostoriji ne treba da bude nikoga, jer 360° kamera vidi ceo prostor. Pomaže ako su pre toga upaljena svetla, razgrnute zavese i sklonjene lične stvari.'
      },
      {
        question: 'Kako dobijamo mesečni izveštaj?',
        answer:
          'Šaljemo vam jedan link koji otvara izveštaj za sve ture vaše agencije — bez prijave i lozinke. Link je zaštićen, pa niko drugi ne može da vidi vaše brojke niti da ga prepravi na tuđu agenciju. Izveštaj možete sačuvati kao PDF i poslati vlasniku stana.'
      },
      {
        question: 'Šta se dešava kada se nekretnina izda ili proda?',
        answer:
          'Turu zaključavamo jednim klikom. Ko otvori stari link, umesto stana vidi kratku poruku da nekretnina više nije dostupna — ali sa kontaktom agenta, pa taj poziv često završi na nekoj vašoj drugoj nekretnini. Kad se ista nekretnina vrati u ponudu, tura se otključava jednim klikom, bez novog snimanja.'
      },
      {
        question: 'Šta ako se nešto u stanu promeni posle snimanja?',
        answer:
          'Ponovo snimamo samo prostorije koje su se promenile i zamenjujemo ih u postojećoj turi. Link ostaje isti, pa oglasi i poruke koje ste već poslali nastavljaju da rade. Cenu dodatnog snimanja dogovaramo prema broju prostorija.'
      },
      {
        question: 'Koliko dugo tura ostaje online?',
        answer:
          'Bez vremenskog ograničenja — link ostaje živ trajno. Kada nekretninu privremeno pauzirate, posetilac umesto ture vidi kratku poruku, a ime agencije i telefon ostaju vidljivi.'
      },
      {
        question: 'Da li postoji obavezan ugovor ili minimalni period?',
        answer:
          'Mesečni paket dogovaramo za onoliko nekretnina koliko vam stvarno treba tog meseca. Uslove i period potvrđujemo u razgovoru pre prve saradnje.'
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
    title: 'Sledeći stan koji dobijete — *neka ga kupci obiđu pre vas.*',
    note: 'Javite koliko nekretnina mesečno oglašavate, pa šaljemo predlog za 24h radnim danima. Ili se javite odmah:',
    call: 'Pozovite',
    hours: 'Pon–Sub, 08–20h'
  },
  footer: '© 2026 Kvadrat360 · Virtuelne ture za nekretnine, ključ u ruke.'
};
