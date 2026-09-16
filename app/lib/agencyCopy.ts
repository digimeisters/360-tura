/**
 * Tekst strane "Za agencije" (/za-agencije).
 *
 * Odvojeno od homeCopy.ts, jer je ovo prodajna strana za jednu publiku:
 * agencija koja već ima priliv oglasa i pita se šta konkretno dobija i
 * koliko je to mesečno. Sadržaj prati dogovoreni opis proizvoda
 * (docs/cowork/kvadrat360-proizvod.md) - ovde se ne obećava ništa preko
 * onoga što aplikacija danas radi.
 *
 * Za sada samo srpski. Kad zatreba engleski, ovo postaje
 * Record<HomeLang, AgencyCopy>, isto kao HOME_COPY.
 */

export type AgencyCopy = {
  meta: { title: string; description: string };
  nav: { brandAria: string; benefits: string; packages: string; faq: string; home: string; cta: string };
  hero: {
    chip: string;
    titleStart: string;
    titleEm: string;
    lede: string;
    ctaContact: string;
    ctaPackages: string;
    trust: string[];
  };
  benefits: {
    eyebrow: string;
    title: string;
    note: string;
    items: { title: string; text: string }[];
  };
  pricing: { eyebrow: string; title: string; note: string; fine: string };
  faq: { eyebrow: string; title: string; note: string; items: { question: string; answer: string }[] };
  contact: {
    eyebrow: string;
    title: string;
    note: string;
    call: string;
    labels: { phone: string; email: string; address: string; hours: string };
    hours: string;
  };
  footer: string;
};

export const AGENCY_COPY: AgencyCopy = {
  meta: {
    title: 'Kvadrat360 za agencije — 360° ture za ceo portfolio',
    description:
      'Mesečni paketi virtuelnih 360° tura i HDR fotografija za agencije za nekretnine: kontakt agenta u svakoj turi, upitnik za agente, ugradnja na sajt agencije i isporuka za 48h.'
  },
  nav: {
    brandAria: 'Kvadrat360, početna strana',
    benefits: 'Šta dobijate',
    packages: 'Paketi',
    faq: 'Pitanja',
    home: 'Početna',
    cta: 'Zatražite ponudu'
  },
  hero: {
    chip: 'Za agencije za nekretnine',
    titleStart: 'Ceo portfolio ',
    titleEm: 'u 360°.',
    lede:
      'Vaši agenti šalju nekretninu kroz upitnik, mi snimamo i za 48h vraćamo gotovu turu sa audio vodičem, linkom za oglas i kodom za vaš sajt. Kupca kroz stan vodi automatski vodič — prošeta kroz sve prostorije pre nego što vas pozove, pa na razgledanje dolaze samo ozbiljno zainteresovani.',
    ctaContact: 'Zatražite ponudu',
    ctaPackages: 'Pogledajte pakete',
    trust: ['Isporuka za 48h', 'Do 4 jezika', 'Kontakt agenta u svakoj turi']
  },
  benefits: {
    eyebrow: 'Šta dobijate',
    title: 'Napravljeno za rad agencije, ne samo za jedan oglas',
    note:
      'Sve što je agenciji potrebno da turu odmah pusti u opticaj — bez programera, bez dodatnih alata i bez obuke tima.',
    items: [
      {
        title: 'Upitnik za vaše agente',
        text:
          'Agencija dobija link i kod. Agent unese podatke o nekretnini i pošalje ih — opis i odgovori na česta pitanja se iz toga pripremaju sami, na svim izabranim jezicima. Niko ne mora isto da objašnjava telefonom.'
      },
      {
        title: 'Kontakt agenta u svakoj turi',
        text:
          'Ime i telefon agenta stoje u turi sve vreme. Poziv i mejl idu jednim dodirom, pa zainteresovani kupac ne mora da traži oglas ponovo da bi vas našao.'
      },
      {
        title: 'Ugradnja na sajt agencije',
        text:
          'Uz turu ide gotov kod za ugradnju. Ubacite ga na stranicu nekretnine i tura radi odmah, u okviru vašeg sajta — bez dodatnog razvoja.'
      },
      {
        title: 'Link koji radi svuda',
        text:
          'Isti link ide u oglas na portalu, u Viber ili WhatsApp poruku i u mejl. Otvara se u pregledaču na telefonu i računaru, bez preuzimanja aplikacije.'
      },
      {
        title: 'Do četiri jezika',
        text:
          'Tekst i audio vodič na srpskom, engleskom, nemačkom i ruskom. Stranom kupcu se šalje link koji se odmah otvara na njegovom jeziku — broj jezika zavisi od paketa.'
      },
      {
        title: 'Praćenje poseta',
        text:
          'Beležimo koliko je puta tura otvorena, koliko ljudi je ušlo i koje prostorije najduže gledaju — bez ličnih podataka posetilaca. Izveštaj šaljemo na zahtev, pa vidite koji oglas stvarno privlači pažnju.'
      }
    ]
  },
  pricing: {
    eyebrow: 'Paketi',
    title: 'Više nekretnina mesečno — niža cena po nekretnini',
    note:
      'Mesečni paketi su za agencije sa stalnim prilivom oglasa. Ispod izračunajte cenu za svoj broj nekretnina.',
    fine:
      '* Cene su orijentacione i važe za nekretnine do 50m², u Kragujevcu i okolini. Za veću kvadraturu, druge gradove i veći obim pravimo poseban predlog.'
  },
  faq: {
    eyebrow: 'Pitanja agencija',
    title: 'Ono što agencije pitaju pre prve saradnje',
    note: 'Ako vašeg pitanja nema, javite se — odgovaramo u roku od 24h radnim danima.',
    items: [
      {
        question: 'Da li neko iz agencije mora da bude prisutan tokom snimanja?',
        answer:
          'Ne mora. Dovoljno je da nam neko otvori stan. Snimanje traje 30–60 minuta i tokom njega u prostoriji ne treba da bude nikoga, jer 360° kamera vidi ceo prostor. Pomaže ako su pre toga upaljena svetla, razgrnute zavese i sklonjene lične stvari.'
      },
      {
        question: 'Šta se dešava kada se nekretnina izda ili proda?',
        answer:
          'Turu zaključavamo jednim klikom. Posetilac koji otvori stari link ne vidi više stan, nego kratku poruku da nekretnina više nije dostupna, sa kontaktom agenta — pa taj poziv često završi na nekoj vašoj drugoj nekretnini. Kad ista nekretnina ponovo ide u ponudu, tura se vraća jednim klikom, bez novog snimanja.'
      },
      {
        question: 'Šta ako se nešto u stanu promeni posle snimanja?',
        answer:
          'Ponovo snimamo samo prostorije koje su se promenile i menjamo ih u postojećoj turi. Link ostaje isti, pa oglasi i poruke koje ste već poslali nastavljaju da rade. Cenu dodatnog snimanja dogovaramo prema broju prostorija.'
      },
      {
        question: 'Koliko dugo tura ostaje online?',
        answer:
          'Bez vremenskog ograničenja — link ostaje živ trajno. Kada se nekretnina proda, izda ili je privremeno pauzirate, menjamo joj status: posetilac umesto ture vidi kratku poruku, a ime agencije i telefon ostaju vidljivi, pa vas i dalje mogu kontaktirati za druge nekretnine.'
      },
      {
        question: 'Da li postoji obavezan ugovor ili minimalni period?',
        answer:
          'Mesečni paket dogovaramo za onaj broj nekretnina koji vam stvarno treba tog meseca. Uslove i period potvrđujemo u razgovoru pre prve saradnje.'
      },
      {
        question: 'U kojim gradovima snimate?',
        answer:
          'U Kragujevcu i okolini. Za druge gradove dolazak je moguć po dogovoru — javite koliko nekretnina imate i gde, pa ćemo reći šta je izvodljivo.'
      }
    ]
  },
  contact: {
    eyebrow: 'Kontakt',
    title: 'Zatražite ponudu za svoju agenciju',
    note:
      'Javite koliko nekretnina mesečno oglašavate i u kom gradu, pa šaljemo konkretan predlog. Odgovaramo u roku od 24h radnim danima — ili se javite odmah:',
    call: 'Pozovite',
    labels: { phone: 'Telefon', email: 'E-mail', address: 'Adresa', hours: 'Radno vreme' },
    hours: 'Pon–Sub, 08–20h'
  },
  footer: '© 2026 Kvadrat360 · Virtuelne ture za nekretnine, ključ u ruke.'
};
