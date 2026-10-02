/**
 * Tekst strane "Za investitore" (/za-investitore).
 *
 * Publika: investitor novogradnje u Kragujevcu koji prodaje stanove pre
 * nego što je zgrada gotova. Strana je za sada skrivena (noindex, nije u
 * meniju ni u sitemap-u) - vlasnik link šalje investitorima direktno, a u
 * meni ide kad bude prava tura snimljena dronom (vidi memoriju "investor
 * offer").
 *
 * Paket za investitore se pravi tek sa prvim pilot projektom, pa strana
 * opisuje ponudu, a primer na strani je jasno označen kao izmišljen
 * projekat. Cene namerno ne stoje - dogovaraju se na razgovoru.
 *
 * Tekst između zvezdica u naslovima ide u kurziv (lib/accent.tsx).
 */

export type InvestorCopy = {
  meta: { title: string; description: string };
  nav: { brandAria: string; problem: string; demo: string; offer: string; steps: string; faq: string; home: string; cta: string };
  hero: { eyebrow: string; title: string; lede: string; ctaContact: string; ctaDemo: string; trust: string[] };
  problem: { eyebrow: string; title: string; note: string; items: { title: string; text: string }[] };
  demo: { eyebrow: string; title: string; note: string; badge: string };
  offer: { eyebrow: string; title: string; note: string; items: { icon: string; title: string; text: string }[] };
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
      'Izbor stana po spratu, 360° ture i pogled sa sprata snimljen dronom - da kupac vidi stan pre nego što je zgrada gotova. Kragujevac.'
  },
  nav: {
    brandAria: 'Kvadrat360 - početna',
    problem: 'Problem',
    demo: 'Primer',
    offer: 'Šta dobijate',
    steps: 'Kako radimo',
    faq: 'Pitanja',
    home: 'Početna',
    cta: 'Zakažite razgovor'
  },
  hero: {
    eyebrow: 'Za investitore novogradnje',
    title: 'Prodajte stan *pre nego što je sazidan*',
    lede:
      'Kupac na sajtu izabere sprat, klikne na stan i odmah vidi kvadraturu, cenu, raspored i pogled sa terase. Bez PDF-a, bez poziva „da li je još slobodan“.',
    ctaContact: 'Zakažite razgovor',
    ctaDemo: 'Isprobajte primer',
    trust: ['Izbor stana po spratu', '360° ture', 'Pogled sa sprata dronom', 'SR · EN · DE · RU']
  },
  problem: {
    eyebrow: 'Problem',
    title: 'Kupac kupuje *ono što ne vidi*',
    note: 'Novogradnja se prodaje dok je zgrada još skela. Kupac dobije papir i render, a o najvećoj kupovini u životu odlučuje napamet.',
    items: [
      {
        title: 'PDF tlocrt i dva rendera',
        text: 'Kupac ne može da zamisli prostor ni da uporedi dva stana na istom spratu. Treba mu sastanak da bi uopšte počeo da razmišlja.'
      },
      {
        title: '„Da li je 12B još slobodan?“',
        text: 'Prodaja ceo dan odgovara na ista pitanja telefonom, a spisak slobodnih stanova živi u nečijem Excelu.'
      },
      {
        title: 'Pogled se ne vidi',
        text: 'Viši spratovi su skuplji zbog pogleda, a pogled kupac prvi put vidi tek kad se useli.'
      }
    ]
  },
  demo: {
    eyebrow: 'Primer',
    title: 'Ovako kupac *bira stan*',
    note: 'Kliknite na sprat, pa na stan. Zelen je slobodan, žut rezervisan, siv prodat.',
    badge: 'Primer: izmišljen projekat, cene i statusi nisu stvarni'
  },
  offer: {
    eyebrow: 'Šta dobijate',
    title: 'Ceo projekat *na jednom linku*',
    note: 'Sve što prodaja danas objašnjava telefonom, kupac vidi sam, na telefonu, u bilo koje doba.',
    items: [
      {
        icon: '▦',
        title: 'Izbor stana po spratu',
        text: 'Fotografija ili render zgrade, klik na sprat, pa na stan. Status i cena su uvek tačni, bez starih PDF-ova.'
      },
      {
        icon: '◎',
        title: '360° tura po tipu stana',
        text: 'Iz rendera vašeg arhitekte pre izgradnje, a snimljena u uzornom stanu kad bude gotov.'
      },
      {
        icon: '△',
        title: 'Pogled sa sprata',
        text: 'Snimamo dronom na visini spratova. Kupac sa šestog sprata vidi tačno ono što plaća.'
      },
      {
        icon: '▤',
        title: 'Gradilište svakog meseca',
        text: 'Novi 360° snimak gradilišta mesečno. Kupci koji su dali kaparu vide da radovi idu.'
      },
      {
        icon: '✉',
        title: 'Upit za tačan stan',
        text: 'Kupac šalje upit iz kartice stana, pa prodaja odmah zna o kom stanu je reč.'
      },
      {
        icon: '◐',
        title: 'Na četiri jezika',
        text: 'Srpski, engleski, nemački i ruski - za kupce iz dijaspore i iz inostranstva, uz glasovno vođenje kroz turu.'
      }
    ]
  },
  steps: {
    eyebrow: 'Kako radimo',
    title: 'Od razgovora *do prvog upita*',
    note: 'Vi šaljete ono što već imate. Snimanje, obradu i objavu radimo mi.',
    items: [
      { title: 'Razgovor', text: 'Pogledamo projekat, šta prodajete i kome. Bez obaveze.' },
      { title: 'Šaljete materijal', text: 'Osnove spratova, tabelu stanova i rendere koje već imate.' },
      { title: 'Snimamo i slažemo', text: 'Let dronom, ture, izbor stana i tekstovi na jezicima koje izaberete.' },
      { title: 'Objava i mesečno', text: 'Link za vaš sajt i oglase, novi snimak gradilišta svakog meseca.' }
    ],
    needs: {
      title: 'Šta nam treba od vas',
      items: [
        'Osnove spratova (PDF ili DWG od arhitekte)',
        'Tabela stanova: oznaka, sprat, m², struktura, cena, status',
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
          'Svi podaci stoje u jednoj tabeli. Na početku je menjamo mi po vašoj poruci, istog dana, pa kupac na sajtu nikad ne vidi prodat stan kao slobodan.'
      },
      {
        question: 'Može li sve da stoji na našem sajtu?',
        answer:
          'Može. Dobijate link za oglase i društvene mreže i kod koji vaš programer ubacuje na sajt, isto kao video sa YouTube-a.'
      },
      {
        question: 'Koliko košta?',
        answer:
          'Zavisi od broja stanova i od toga šta vam treba: samo izbor stana, ture, dron, gradilište. Cenu dogovaramo na razgovoru, posle koga dobijate ponudu u pisanom obliku.'
      },
      {
        question: 'Da li snimate i kad je zgrada gotova?',
        answer:
          'Da. Kad zgrada bude gotova, rendere zamenjujemo pravim snimcima stanova, a ture ostaju za stanove koji se još prodaju.'
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
