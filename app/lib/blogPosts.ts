/**
 * Blog postovi, statično u kodu - isti pristup kao homeCopy.ts. Za dva
 * posta ovo je brže i jednostavnije od Supabase tabele; ako broj postova
 * poraste i treba da se dodaju bez git commit-a, ovo je mesto za migraciju
 * na bazu (isti oblik podataka, samo drugi izvor).
 */

export type BlogSection = {
  heading?: string;
  paragraphs: string[];
  /** Kratka definiciona lista (termin: objašnjenje), renderuje se kao <dl>. */
  list?: { term: string; text: string }[];
  /** Obična nabrajajuća lista, za skeniranje - renderuje se kao <ul>. */
  bullets?: string[];
  /** "callout" = izdvojen okvir (npr. "Ukratko" na vrhu teksta). */
  variant?: 'callout';
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  publishedAt: string;
  sections: BlogSection[];
  relatedLinks: { href: string; label: string }[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'zasto-nekretnina-sa-virtuelnom-turom-brze-prodaje',
    title: 'Zašto se nekretnina sa virtuelnom turom brže prodaje',
    description:
      'Virtuelna 360° tura menja redosled kojim kupac upoznaje stan - i to je razlog zašto nekretnine sa turom dolaze do ozbiljnog kupca brže. Evo tačno šta se menja.',
    excerpt:
      'Ista nekretnina, ista cena, isti oglas - samo sa jednim dodatkom. Evo šta se menja kad kupac stan prvo obiđe iz fotelje.',
    publishedAt: '2026-09-18',
    sections: [
      {
        paragraphs: [
          'Svaki vlasnik i svaka agencija zna ovaj scenario: deset poziva za razgledanje, dolaze tri osobe, a jedna od njih uopšte nije ozbiljna - samo je "htela da vidi kako izgleda iznutra". Sat vremena provedenog u vožnji, čekanju i otključavanju - i na kraju nijedna ponuda.',
          'Virtuelna tura ne rešava ovo zato što je "moderna" ili "efektna". Rešava ga zato što menja redosled kojim kupac upoznaje stan.'
        ]
      },
      {
        variant: 'callout',
        heading: 'Ukratko',
        paragraphs: [],
        bullets: [
          'Bez ture kupac prvo dolazi uživo, pa tek onda odlučuje - i to troši vreme i njemu i vama.',
          'Sa turom kupac prvo odlučuje iz fotelje, pa dolazi samo ako mu se stan stvarno dopao.',
          'Najviše se isplati kod kupaca van grada i gostiju koji smeštaj rezervišu na daljinu.'
        ]
      },
      {
        heading: 'Bez virtuelne ture: kupac prvo dolazi, pa tek onda odlučuje',
        paragraphs: [
          'Klasičan oglas ima par fotografija i kratak tekst. Ostatak kupac zamišlja sam - a ta slika u glavi često pogodi pogrešno:'
        ],
        bullets: [
          'Koliko je dnevni boravak stvarno velik',
          'Da li se spavaća soba vidi sa ulice',
          'Kako izgleda prostor kad se uđe kroz hodnik'
        ]
      },
      {
        paragraphs: [
          'Kad stvarnost ne liči na tu sliku, razočaranje dolazi na licu mesta - termin je već zakazan, a vreme i vlasnika i kupca već izgubljeno.',
          'Otuda i "turisti razgledanja" - ljudi koji dolaze da vide, ne da kupe, jer im oglas nije dao dovoljno da se unapred sami isključe.'
        ]
      },
      {
        heading: 'Sa virtuelnom turom: kupac prvo odlučuje, pa tek onda dolazi',
        paragraphs: [
          'Virtuelna tura taj redosled okreće. Kupac uđe u stan iz fotelje, prošeta kroz svaku prostoriju i vidi stvaran raspored, stvarnu veličinu i stvaran ugao iz kog ulazi svetlo. Ako mu se ne uklapa, sazna to za dva minuta - besplatno, bez ičijeg izgubljenog vremena.',
          'Na razgledanje onda dolaze samo oni kojima se stan već dopao dovoljno da žele da ga vide uživo. To nisu "turisti" - to su ljudi korak bliže ponudi.'
        ]
      },
      {
        heading: 'Kad kupac nije iz Kragujevca - ili nije ni iz Srbije',
        paragraphs: [
          'Kupci koji se u Kragujevac sele iz drugog grada, ili iz inostranstva, fizički ne mogu da dođu na svako razgledanje koje ih zanima. Bez ture, takva nekretnina jednostavno ispada iz njihovog izbora - nema šanse da je ozbiljno razmotre dok fizički ne stignu u grad. Sa turom, mogu da je "obiđu" uveče, sa telefona, i da tačno znaju da li vredi zakazati put.',
          'Isto važi za vlasnike koji izdaju stan na dan (Airbnb, kratkoročni smeštaj) - gost koji rezerviše sa drugog kontinenta odlučuje na osnovu onoga što vidi, ne na osnovu obećanja iz opisa.'
        ]
      },
      {
        heading: 'Šta jednu virtuelnu turu čini stvarno korisnom',
        paragraphs: [
          'Nije svaka "virtuelna tura" ista. Da bi stvarno skratila put do ozbiljnog kupca, treba joj:'
        ],
        bullets: [
          'Kvalitetna 360° panorama svake prostorije - ne samo dnevnog boravka',
          'Jasna navigacija soba-po-sobu, da se kupac ne izgubi',
          'Kratak opis ili audio vodič koji odgovara na pitanja koja bi inače postavio uživo - kvadratura, sprat, orijentacija, šta je sve u blizini',
          'Tlocrt povezan sa turom, da kupac odmah vidi gde se soba koju gleda nalazi u odnosu na celinu'
        ]
      }
    ],
    relatedLinks: [
      { href: '/', label: 'Pogledajte kako izgleda naša 360° tura i cenovnik' },
      { href: '/za-agencije', label: 'Agencija ste i vodite više nekretnina mesečno? Pogledajte paket za agencije' }
    ]
  },
  {
    slug: 'koliko-kosta-fotografisanje-nekretnine-za-oglas',
    title: 'Koliko košta fotografisanje nekretnine za oglas u Srbiji',
    description:
      'Cena fotografisanja i virtuelne ture za nekretninu zavisi od broja prostorija, tipa fotografije i broja jezika audio vodiča. Evo od čega zavisi cena, i orijentacioni raspon na tržištu u Srbiji.',
    excerpt:
      'Nema jedne cene za "fotografisanje stana" - zavisi šta tačno naručujete. Evo od čega cena zavisi, i gde se kreće na tržištu u Srbiji.',
    publishedAt: '2026-09-18',
    sections: [
      {
        paragraphs: [
          'Kad neko pita "koliko košta fotografisanje stana za oglas", odgovor zavisi od tri stvari: da li je u pitanju obična fotografija ili HDR, da li se pravi i 360° virtuelna tura, i na koliko jezika treba opis ili audio vodič. Iste tri stvari određuju cenu kod svih studija u Srbiji - samo se paketi drugačije slažu.'
        ]
      },
      {
        heading: 'Tri stvari koje određuju cenu',
        paragraphs: [],
        list: [
          {
            term: 'Broj prostorija',
            text: 'Posao (dolazak, snimanje, obrada) prati broj soba, ne kvadraturu - garsonjera i trosoban stan iste kvadrature nemaju istu cenu ako trosoban ima više odvojenih prostorija za snimanje.'
          },
          {
            term: 'HDR fotografija ili 360° tura, ili oboje',
            text: 'HDR fotografija je pojedinačna slika prostorije u visokom dinamičkom opsegu (bolje osvetljenje, bez pretamnih i prepaljenih delova) - koristi se za same fotografije u oglasu. Virtuelna tura je odvojen proizvod: interaktivni obilazak kroz sve prostorije, obično naplaćen posebno ili u paketu sa fotografijama.'
          },
          {
            term: 'Broj jezika audio vodiča ili opisa',
            text: 'Osnovni paket obično pokriva srpski i jedan strani jezik; paket sa svim jezicima (npr. engleski, nemački, ruski) je po pravilu skuplji jer se svaki jezik posebno snima i prevodi.'
          }
        ]
      },
      {
        heading: 'Koliko to košta na tržištu u Srbiji',
        paragraphs: [
          'Cenovnici se razlikuju od studija do studija, ali se u proseku kreću u ovim okvirima:'
        ],
        bullets: [
          'Samostalna HDR fotografija: oko 20-25 evra po komadu',
          '360° virtuelna tura manjeg stana (do 70 m²): okvirno od 12.000 dinara naviše, zavisno od broja prostorija i da li je uključen audio vodič'
        ]
      },
      {
        paragraphs: [
          'Ovo su okvirne cifre sa tržišta, ne naša ponuda. Naša cena je ispod - i računa se tačno po broju prostorija i jezika koje izaberete.'
        ]
      }
    ],
    relatedLinks: [
      { href: '/#cenovnik', label: 'Pogledajte tačan cenovnik po broju prostorija' },
      { href: '/za-agencije', label: 'Agencija ste i naručujete više nekretnina mesečno? Cena po nekretnini pada - pogledajte paket za agencije' }
    ]
  }
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
