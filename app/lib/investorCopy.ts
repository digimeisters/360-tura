/**
 * Tekst strane "Za investitore" (/za-investitore).
 *
 * Publika: investitor novogradnje u Kragujevcu koji prodaje stanove pre
 * nego što je zgrada gotova. Strana je za sada skrivena (noindex, nije u
 * meniju ni u sitemap-u) - vlasnik link šalje investitorima direktno.
 *
 * Raspored prati /za-agencije (vlasnik, 2. 10. 2026: „uskladi se sa stilom
 * celog sajta"): vrh sa živom zgradom -> prodaja danas / sa nama -> primer
 * -> kupac (četiri ekrana) -> vaša prodaja (tamno) -> plava traka -> paket
 * -> kako radimo -> pitanja -> kontakt.
 *
 * Opisuje samo ono što aplikacija danas radi (izbor stana, link za prodaju,
 * upiti, izveštaj, ugradnja, engleski, gradilište). Primer na strani je
 * izmišljen projekat i tako je i označen. Cene namerno ne stoje.
 *
 * Tekst između zvezdica u naslovima ide u kurziv (lib/accent.tsx).
 */

type Row = { day: string; title: string; text: string };

export type InvestorCopy = {
  meta: { title: string; description: string };
  nav: { brandAria: string; compare: string; demo: string; buyer: string; sales: string; offer: string; faq: string; home: string; cta: string };
  hero: {
    eyebrow: string;
    title: string;
    lede: string;
    ctaContact: string;
    ctaDemo: string;
    trust: string[];
    device: { project: string; floorCard: string; unitLabel: string };
  };
  compare: {
    eyebrow: string;
    title: string;
    note: string;
    without: { title: string; tag: string; rows: Row[] };
    with: { title: string; tag: string; rows: Row[] };
  };
  demo: { eyebrow: string; title: string; note: string; badge: string };
  buyer: {
    eyebrow: string;
    title: string;
    note: string;
    steps: { time: string; title: string; text: string }[];
    end: { text: string; cta: string };
  };
  sales: {
    eyebrow: string;
    title: string;
    text: string;
    points: string[];
    card: { title: string; badge: string; inquiry: string; inquiryWho: string; topTitle: string; top: { code: string; pct: number; views: string }[] };
  };
  midCta: { title: string; points: string[]; button: string; call: string };
  offer: { eyebrow: string; title: string; note: string; items: { title: string; text: string }[] };
  steps: {
    eyebrow: string;
    title: string;
    note: string;
    items: { title: string; text: string }[];
    needs: { title: string; items: string[] };
  };
  faq: { eyebrow: string; title: string; note: string; items: { question: string; answer: string }[] };
  contact: { eyebrow: string; title: string; note: string; call: string; hours: string };
  footer: string;
};

export const INVESTOR_COPY: InvestorCopy = {
  meta: {
    title: 'Za investitore novogradnje | Kvadrat360',
    description:
      'Izbor stana po spratu, 360° ture, pogled sa sprata dronom i link preko koga vaša prodaja sama menja statuse i cene. Kragujevac.'
  },
  nav: {
    brandAria: 'Kvadrat360 - početna',
    compare: 'Prodaja danas',
    demo: 'Primer',
    buyer: 'Kupac',
    sales: 'Vaša prodaja',
    offer: 'Paket',
    faq: 'Pitanja',
    home: 'Početna',
    cta: 'Zakažite razgovor'
  },
  hero: {
    eyebrow: 'Za investitore novogradnje · Kragujevac',
    title: 'Prodajte stan *pre nego što je sazidan*',
    lede:
      'Kupac na telefonu izabere sprat, klikne na stan i odmah vidi kvadraturu, cenu, raspored i pogled. Bez PDF-a i bez poziva „da li je još slobodan“.',
    ctaContact: 'Zakažite razgovor',
    ctaDemo: 'Isprobajte primer',
    trust: ['Izbor stana po spratu', '360° ture i dron', 'Prodaja menja statuse sama'],
    device: { project: 'Rezidencija Lipa · primer', floorCard: 'slobodno', unitLabel: 'Stan' }
  },
  compare: {
    eyebrow: 'Prodaja danas',
    title: 'Isti stanovi, *manje telefona*',
    note: 'Kupac novogradnje odlučuje o najvećoj kupovini u životu, a dobije PDF i dva rendera. Ovako izgleda ista nedelja vaše prodaje.',
    without: {
      title: 'Danas',
      tag: 'PDF i telefon',
      rows: [
        { day: 'Pon', title: 'Kupac dobije PDF tlocrt', text: 'Ne može da zamisli prostor ni da uporedi dva stana na istom spratu.' },
        { day: 'Uto', title: '„Da li je 12B još slobodan?“', text: 'Prodaja ceo dan odgovara na ista pitanja, a spisak stanova je u nečijem Excelu.' },
        { day: 'Sre', title: 'Pogled se ne vidi', text: 'Viši spratovi su skuplji zbog pogleda koji kupac prvi put vidi tek kad se useli.' },
        { day: 'Čet', title: 'Kupac sa strane odustaje', text: 'Bez dolaska u Kragujevac nema od čega da krene.' }
      ]
    },
    with: {
      title: 'Sa Kvadrat360',
      tag: 'Kupac bira sam',
      rows: [
        { day: 'Pon', title: 'Kupac klikne na sprat, pa na stan', text: 'Odmah vidi kvadraturu, strukturu, cenu i cenu po m².' },
        { day: 'Uto', title: 'Status je uvek tačan', text: 'Vaša prodaja ga menja sa telefona, sajt se osvežava odmah.' },
        { day: 'Sre', title: 'Pogled sa sprata, snimljen dronom', text: 'Kupac sa šestog sprata vidi tačno ono što plaća.' },
        { day: 'Čet', title: 'Upit za tačan stan', text: 'Stiže pravo prodaji, sa oznakom stana i kontaktom kupca.' }
      ]
    }
  },
  demo: {
    eyebrow: 'Primer',
    title: 'Ovako kupac *bira stan*',
    note: 'Kliknite na sprat, pa na stan. Zelen je slobodan, žut rezervisan, siv prodat.',
    badge: 'Primer: izmišljen projekat, cene i statusi nisu stvarni'
  },
  buyer: {
    eyebrow: 'Kupac',
    title: 'Od linka *do upita* za dva minuta',
    note: 'Sve na telefonu, bez aplikacije i bez dolaska u prodajnu kancelariju.',
    steps: [
      { time: 'Zgrada', title: 'Bira sprat', text: 'Na fotografiji zgrade vidi koliko je slobodnih stanova na svakom spratu.' },
      { time: 'Sprat', title: 'Bira stan', text: 'Osnova sprata, stanovi obojeni po statusu: slobodan, rezervisan, prodat.' },
      { time: 'Stan', title: 'Vidi sve bitno', text: 'Kvadratura, terasa, cena i cena po m², 360° tura i pogled sa sprata.' },
      { time: 'Upit', title: 'Javlja se prodaji', text: 'Ime i telefon, a prodaja odmah zna o kom stanu je reč.' }
    ],
    end: { text: 'Primer iznad radi isto - isprobajte ga na telefonu.', cta: 'Zakažite razgovor' }
  },
  sales: {
    eyebrow: 'Vaša prodaja',
    title: 'Prodaja menja statuse *sama*',
    text: 'Svaka osoba iz vaše prodaje dobija lični link. Bez lozinke i bez obuke - menja samo status i cenu, a sajt se osvežava odmah.',
    points: [
      'Slobodan, rezervisan, prodat - jednim dodirom, uz potvrdu za svaki stan',
      'Upiti kupaca stižu na isti link, sa oznakom stana',
      'Izveštaj: koji stanovi se najviše gledaju i gde treba korigovati cenu',
      'Svaka izmena je zapisana - ko, kada i šta',
      'Link se gasi jednim klikom kad neko ode iz firme'
    ],
    card: {
      title: 'Rezidencija Lipa',
      badge: 'primer',
      inquiry: 'Novi upit · Stan 4A',
      inquiryWho: 'Marko P. · 06x xxx xxxx',
      topTitle: 'Najgledaniji stanovi · 30 dana',
      top: [
        { code: '6B', pct: 100, views: '84 otvaranja' },
        { code: '4A', pct: 71, views: '60 otvaranja' },
        { code: '5D', pct: 52, views: '44 otvaranja' }
      ]
    }
  },
  midCta: {
    title: 'Pokažite stanove *pre nego što su gotovi*',
    points: ['Razgovor bez obaveze', 'Primer na vašem projektu', 'Kragujevac i okolina'],
    button: 'Zakažite razgovor',
    call: 'Pozovite'
  },
  offer: {
    eyebrow: 'Paket',
    title: 'Ceo projekat *na jednom linku*',
    note: 'Sve što prodaja danas objašnjava telefonom, kupac vidi sam, u bilo koje doba.',
    items: [
      { title: 'Izbor stana po spratu', text: 'Fotografija ili render zgrade, klik na sprat, pa na stan. Filteri po strukturi, ceni i kvadraturi.' },
      { title: '360° tura i pogled sa sprata', text: 'Tura iz rendera ili uzornog stana, i pogled snimljen dronom na visini sprata.' },
      { title: 'Link za vašu prodaju', text: 'Status i cena sa telefona, upiti kupaca i izveštaj po stanu na jednom mestu.' },
      { title: 'Gradilište svakog meseca', text: 'Novi 360° snimak mesečno - kupci koji su dali kaparu vide da radovi idu.' },
      { title: 'Na vašem sajtu', text: 'Isti izbor stana ugrađen na vaš sajt, bez našeg menija. Menja se zajedno sa našim.' },
      { title: 'Na engleskom', text: 'Cela strana i na engleskom - za kupce iz dijaspore, bez posebnog održavanja.' }
    ]
  },
  steps: {
    eyebrow: 'Kako radimo',
    title: 'Od razgovora *do prvog upita*',
    note: 'Vi šaljete ono što već imate. Snimanje, obradu i objavu radimo mi.',
    items: [
      { title: 'Razgovor', text: 'Pogledamo projekat, šta prodajete i kome. Bez obaveze.' },
      { title: 'Šaljete materijal', text: 'Osnove spratova, tabelu stanova i rendere koje već imate.' },
      { title: 'Snimamo i slažemo', text: 'Let dronom, ture, izbor stana i tekst na jezicima koje izaberete.' },
      { title: 'Objava i mesečno', text: 'Link za oglase i vaš sajt, novi snimak gradilišta svakog meseca.' }
    ],
    needs: {
      title: 'Šta nam treba od vas',
      items: [
        'Osnove spratova (PDF ili DWG od arhitekte)',
        'Tabela stanova iz Excela: oznaka, sprat, m², struktura, cena, status',
        'Render ili fotografija fasade',
        '360° renderi enterijera, ako ih arhitekta ima (nije obavezno)',
        'Pristup gradilištu jednom mesečno'
      ]
    }
  },
  faq: {
    eyebrow: 'Pitanja',
    title: 'Pre nego što *zakažete*',
    note: 'Ako vaše pitanje nije ovde, pozovite - odgovor stiže odmah.',
    items: [
      {
        question: 'Šta ako nemamo 3D model enterijera?',
        answer:
          'Izbor stana, pogled sa sprata i snimak gradilišta rade i bez njega. Ture enterijera dodajemo kad bude gotov uzorni stan, ili iz rendera ako ih vaš arhitekta ili vizualizator napravi.'
      },
      {
        question: 'Ko menja status i cene stanova?',
        answer:
          'Vaša prodaja, sama: svaka osoba dobija lični link na telefon i menja status i cenu, uz potvrdu za svaki stan. Kupac na sajtu nikad ne vidi prodat stan kao slobodan, a svaka izmena je zapisana.'
      },
      {
        question: 'Gde stižu upiti kupaca?',
        answer:
          'Na link vaše prodaje, sa oznakom stana, imenom i telefonom kupca. Prodaja ga označi kad se javi, pa se zna koji upit čeka.'
      },
      {
        question: 'Može li sve da stoji na našem sajtu?',
        answer:
          'Može. Dobijate link za oglase i društvene mreže i kod koji vaš programer ubacuje na sajt, isto kao video sa YouTube-a. Promene statusa i cena vide se i tamo.'
      },
      {
        question: 'Koliko košta?',
        answer:
          'Zavisi od broja stanova i od toga šta vam treba: izbor stana, ture, dron, gradilište. Cenu dogovaramo na razgovoru, posle koga dobijate ponudu u pisanom obliku.'
      }
    ]
  },
  contact: {
    eyebrow: 'Kontakt',
    title: 'Zakažite *razgovor*',
    note: 'Ostavite ime, broj i naziv projekta. Javljamo se da dogovorimo termin - kod vas, na gradilištu ili telefonom.',
    call: 'Pozovite',
    hours: 'Radnim danima 9–17h'
  },
  footer: 'Kvadrat360 · 360° ture i izbor stana za novogradnju · Kragujevac'
};
