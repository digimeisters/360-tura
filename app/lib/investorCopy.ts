/**
 * Tekst strane "Za investitore" (/za-investitore).
 *
 * Publika: investitor novogradnje u Kragujevcu koji prodaje stanove pre
 * nego što je zgrada gotova. Strana je za sada skrivena (noindex, nije u
 * meniju ni u sitemap-u) - vlasnik link šalje investitorima direktno.
 *
 * Raspored prati /za-agencije (vlasnik, 2. 10. 2026: „uskladi se sa stilom
 * celog sajta"): vrh sa pravom fotografijom zgrade -> prodaja danas / sa
 * nama -> pravi izbor stana (primer) -> kupac (četiri ekrana) -> vaša prodaja
 * (tamno) -> plava traka -> postavljanje (AI čita materijal) -> paket ->
 * kako radimo -> pitanja -> kontakt.
 *
 * Opisuje samo ono što aplikacija danas radi. Primer je projekat
 * „Lepenički cvet" sa izmišljenim cenama i statusima i tako je označen.
 * Cene usluge namerno ne stoje.
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
    device: { project: string; kicker: string; floorCard: string; unitLabel: string };
  };
  compare: {
    eyebrow: string;
    title: string;
    note: string;
    without: { title: string; tag: string; rows: Row[] };
    with: { title: string; tag: string; rows: Row[] };
  };
  demo: { eyebrow: string; title: string; note: string; badge: string; fullNote: string; open: string };
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
  setup: {
    eyebrow: string;
    title: string;
    note: string;
    items: { from: string; to: string; title: string; text: string }[];
    foot: string;
  };
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
      'Stanovi obojeni po statusu na fotografiji zgrade, kartica stana sa osnovom i 360° turom, i link preko koga vaša prodaja sama menja statuse i cene. Kragujevac.'
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
      'Kupac na fotografiji zgrade klikne na stan i odmah vidi kvadraturu, raspored, cenu i pogled. Bez PDF-a i bez poziva „da li je još slobodan“.',
    ctaContact: 'Zakažite razgovor',
    ctaDemo: 'Isprobajte primer',
    trust: ['Stanovi na fotografiji zgrade', '360° ture i dron', 'Prodaja menja statuse sama'],
    device: { project: 'Lepenički cvet · primer', kicker: 'Izbor stana', floorCard: 'slobodno', unitLabel: 'Stan' }
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
        { day: 'Pon', title: 'Kupac klikne na stan na zgradi', text: 'Odmah vidi kvadraturu, prostorije, cenu i cenu po m².' },
        { day: 'Uto', title: 'Status je uvek tačan', text: 'Vaša prodaja ga menja sa telefona, sajt se osvežava odmah.' },
        { day: 'Sre', title: 'Pogled sa sprata, snimljen dronom', text: 'Kupac sa šestog sprata vidi tačno ono što plaća.' },
        { day: 'Čet', title: 'Upit za tačan stan', text: 'Stiže pravo prodaji, sa oznakom stana i kontaktom kupca.' }
      ]
    }
  },
  demo: {
    eyebrow: 'Primer',
    title: 'Ovako kupac *bira stan*',
    note: 'Pravi izbor stana, isti kakav dobija vaš projekat. Kliknite na stan na zgradi, okrenite zgradu strelicama, otvorite listu ili filtere.',
    badge: 'Primer: cene, statusi i opisi su izmišljeni',
    fullNote: 'Na računaru probajte „Ceo ekran“ - ovako izgleda na sastanku sa kupcem.',
    open: 'Cela strana projekta'
  },
  buyer: {
    eyebrow: 'Kupac',
    title: 'Od linka *do upita* za dva minuta',
    note: 'Sve na telefonu, bez aplikacije i bez dolaska u prodajnu kancelariju.',
    steps: [
      { time: 'Zgrada', title: 'Bira na zgradi', text: 'Na fotografiji zgrade stanovi su obojeni: slobodan, rezervisan, prodat.' },
      { time: 'Sprat', title: 'Sužava izbor', text: 'Osnova sprata ili lista svih stanova, uz filtere po spratu, m², sobama i ceni.' },
      { time: 'Stan', title: 'Vidi sve bitno', text: 'Osnova, 360° tura, 3D i slike, prostorije sa m², PDF letak i kalkulator rata.' },
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
      'Kratka beleška uz stan ili upit, da cela prodaja zna dogovor',
      'Izveštaj: koji stanovi se najviše gledaju i gde treba korigovati cenu',
      'Svaka izmena je zapisana - ko, kada i šta',
      'Link se gasi jednim klikom kad neko ode iz firme'
    ],
    card: {
      title: 'Lepenički cvet',
      badge: 'primer',
      inquiry: 'Novi upit · Stan 4I',
      inquiryWho: 'Marko P. · 06x xxx xxxx',
      topTitle: 'Najgledaniji stanovi · 30 dana',
      top: [
        { code: '6B', pct: 100, views: '84 otvaranja' },
        { code: '4I', pct: 71, views: '60 otvaranja' },
        { code: '5G', pct: 52, views: '44 otvaranja' }
      ]
    }
  },
  midCta: {
    title: 'Pokažite stanove *pre nego što su gotovi*',
    points: ['Razgovor bez obaveze', 'Primer na vašem projektu', 'Kragujevac i okolina'],
    button: 'Zakažite razgovor',
    call: 'Pozovite'
  },
  setup: {
    eyebrow: 'Postavljanje',
    title: 'Vi pošaljete, *sistem pročita*',
    note: 'Cenovnik, osnove i fotografiju zgrade ne prekucavamo ručno. Sistem ih pročita, a mi proverimo svaki broj pre objave.',
    items: [
      {
        from: 'cenovnik.pdf',
        to: '56 stanova u tabeli',
        title: 'Cenovnik postaje tabela',
        text: 'PDF, Excel ili slika cenovnika: oznake, spratovi, strukture, m², cene i statusi upišu se sami.'
      },
      {
        from: '23 osnove odjednom',
        to: 'prostorije i m²',
        title: 'Sve osnove odjednom',
        text: 'Osnove se same spoje sa stanovima, po oznaci ili tipu stana, a sa svake se pročitaju prostorije i kvadrature.'
      },
      {
        from: 'render zgrade',
        to: '7 spratova, 20 stanova',
        title: 'Stanovi na fotografiji',
        text: 'Sistem sam obeleži spratove i stanove na renderu ili fotografiji zgrade, na svakoj slici posebno.'
      }
    ],
    foot: 'Posle objave, promena cene ili statusa je jedan dodir na telefonu vaše prodaje.'
  },
  offer: {
    eyebrow: 'Paket',
    title: 'Ceo projekat *na jednom linku*',
    note: 'Sve što prodaja danas objašnjava telefonom, kupac vidi sam, u bilo koje doba.',
    items: [
      { title: 'Stanovi na fotografiji zgrade', text: 'Render ili fotografija zgrade, stanovi obojeni po statusu, više uglova koje kupac okreće strelicama.' },
      { title: 'Kartica stana', text: 'Osnova, 360° tura, 3D osnova i slike, prostorije sa m², PDF letak i kalkulator rata.' },
      { title: 'Ceo ekran za sastanke', text: 'Zgrada preko celog ekrana, sa filterima i karticom stana - za prodajnu kancelariju i sajam.' },
      { title: 'Kompleks sa više zgrada', text: 'Pogled iz vazduha: kupac prvo bira zgradu, pa sprat i stan.' },
      { title: 'Link za vašu prodaju', text: 'Status i cena sa telefona, upiti kupaca, beleške i izveštaj po stanu na jednom mestu.' },
      { title: '360° tura i pogled sa sprata', text: 'Tura iz rendera ili uzornog stana, i pogled snimljen dronom na visini sprata.' },
      { title: 'Gradilište svakog meseca', text: 'Novi 360° snimak mesečno - kupci koji su dali kaparu vide da radovi idu.' },
      { title: 'Okolina na mapi', text: 'Škole, vrtići, prodavnice i prevoz oko zgrade, sa udaljenošću od zgrade.' },
      { title: 'Na vašem sajtu, i na engleskom', text: 'Isti izbor stana ugrađen na vaš sajt, ceo i na engleskom - bez posebnog održavanja.' }
    ]
  },
  steps: {
    eyebrow: 'Kako radimo',
    title: 'Od razgovora *do prvog upita*',
    note: 'Vi šaljete ono što već imate. Snimanje, obradu i objavu radimo mi.',
    items: [
      { title: 'Razgovor', text: 'Pogledamo projekat, šta prodajete i kome. Bez obaveze.' },
      { title: 'Šaljete materijal', text: 'Cenovnik, osnove i rendere - u obliku u kom ih već imate.' },
      { title: 'Snimamo i slažemo', text: 'Let dronom, ture, izbor stana i tekst na jezicima koje izaberete.' },
      { title: 'Objava i mesečno', text: 'Link za oglase i vaš sajt, novi snimak gradilišta svakog meseca.' }
    ],
    needs: {
      title: 'Šta nam treba od vas',
      items: [
        'Cenovnik - PDF, Excel ili slika, kakav već imate',
        'Osnove stanova i spratova (PDF ili slike, sve odjednom)',
        'Render ili fotografija zgrade - može iz više uglova',
        'Snimak iz vazduha ako gradite više zgrada (ili ga snimimo dronom)',
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
        question: 'Koliko posla je na nama?',
        answer:
          'Malo. Pošaljete cenovnik, osnove i rendere kakve već imate - sistem ih pročita, a mi proverimo i složimo. Posle objave vaša prodaja samo menja statuse i cene sa telefona.'
      },
      {
        question: 'Šta ako nemamo 3D model enterijera?',
        answer:
          'Izbor stana, kartica sa osnovom i prostorijama, pogled sa sprata i snimak gradilišta rade i bez njega. Ture enterijera dodajemo kad bude gotov uzorni stan, ili iz rendera ako ih vaš arhitekta ili vizualizator napravi.'
      },
      {
        question: 'Gradimo više zgrada - da li to radi?',
        answer:
          'Radi. Kupac prvo vidi kompleks iz vazduha i bira zgradu, pa sprat i stan. Lista svih stanova ima i kolonu zgrade, a filteri važe za ceo kompleks.'
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
