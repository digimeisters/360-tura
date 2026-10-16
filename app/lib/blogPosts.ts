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
  /** Kraći <title> za pretragu (bez "| Kvadrat360", to dodaje layout). Ako ga nema, koristi se title. */
  seoTitle?: string;
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
      'Od čega zavisi cena fotografisanja i virtuelne ture za nekretninu - prostorije, vrsta fotografije, jezici audio vodiča - i koliki je raspon cena u Srbiji.',
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
  },
  {
    slug: 'sta-agencija-za-nekretnine-gubi-sa-obicnim-fotografijama',
    title: 'Šta agencija za nekretnine gubi kad koristi samo obične fotografije',
    seoTitle: 'Obične fotografije vs 360 tura nekretnina',
    description:
      'Agencije koje koriste samo fotografije gube upite i troše vreme na neozbiljne posete. Otkrijte zašto 360° virtuelna tura menja rezultat.',
    excerpt:
      'Kupac pogleda osam fotografija i za deset sekundi ode na sledeći oglas. Evo koliko to agenciju stvarno košta - i zašto se taj trošak ne vidi na fakturi.',
    publishedAt: '2026-10-16',
    sections: [
      {
        paragraphs: [
          'Kupac otvori oglas, pogleda osam fotografija, zatvori ga za deset sekundi i ode na sledeći. Ne zato što mu se stan ne dopada - nego zato što ne zna dovoljno da bi mu se dopao. To je cena koju agencija plaća svaki put kad prezentacija staje na foto-galeriji.'
        ]
      },
      {
        variant: 'callout',
        heading: 'Ukratko',
        paragraphs: [],
        bullets: [
          'Fotografija pokazuje uglove koje je izabrao fotograf; tura pušta kupca da sam obiđe ceo prostor.',
          'Kupac koji je prošetao kroz turu dolazi na razgledanje već zainteresovan - manje neozbiljnih poseta.',
          'Kupac iz drugog grada ili iz inostranstva bez ture najčešće odlazi kod konkurenta.',
          'Ušteda na fotografisanju se plaća manjim brojem poziva i nekretninom koja duže stoji na oglasu.'
        ]
      },
      {
        heading: 'Fotografija pokazuje sobu, tura pokazuje stan',
        paragraphs: [
          'Obična fotografija daje osam do petnaest uglova iz kojih je fotograf odlučio da stan treba da se vidi. Kupac nema kontrolu:'
        ],
        bullets: [
          'Ne može da pogleda levo',
          'Ne može da proceni koliko je hodnik dug',
          'Ne zna da li kuhinja gleda na ulicu ili dvorište'
        ]
      },
      {
        paragraphs: [
          '360° virtuelna tura prebacuje tu kontrolu kupcu: on hoda kroz stan onim redom koji mu je logičan, zadržava se gde ga zanima, preskače gde ne.',
          'Razlika nije kozmetička. Agencije koje su prešle sa foto-galerije na virtuelnu turu beleže znatno više upita i bržu prodaju - ne zato što je tura "lepša", nego zato što kupac stigne do ozbiljnog pitanja (termin za posetu, ponuda) sa mnogo jasnijom slikom u glavi nego posle galerije fotografija.'
        ]
      },
      {
        heading: 'Neozbiljne posete koštaju agenciju vreme, ne samo novac',
        paragraphs: [
          'Svaka poseta koja se završi rečenicom "ovo ipak nije to" jeste vreme utrošeno na put, dogovor termina i prezentaciju - vreme koje je moglo da ode na kupca koji je stvarno spreman. Fotografija ne daje dovoljno informacija da kupac sam sebe isključi pre nego što zakaže posetu. Tura to radi: ko je prošetao kroz stan na ekranu i i dalje je zainteresovan, dolazi na teren već ubeđen, ne na razgledanje.',
          'To je razlika između "dovodim ljude da vide stan" i "dovodim ljude koji žele taj stan".'
        ]
      },
      {
        heading: 'Kupac iz drugog grada ili iz inostranstva nema drugu opciju',
        paragraphs: [
          'Za kupca koji fizički ne može da dođe pre nego što donese prvu odluku - radi u drugom gradu, živi u inostranstvu, kupuje za investiciju - fotografija je sve što ima. Osam slika i opis od tri rečenice.',
          'Tura mu daje ono najbliže stvarnoj poseti što je moguće bez puta: hoda kroz prostor, gleda kroz prozore, proverava raspored soba sam. Agencija koja nudi samo fotografije u tom slučaju jednostavno gubi tog kupca u korist konkurenta čiji je oglas opremljen turom.'
        ]
      },
      {
        heading: 'Šta agencija zapravo plaća kad "štedi" na fotografisanju',
        paragraphs: [
          'Izbor da se ostane na običnim fotografijama nije besplatan - samo je trošak nevidljiv. On se ne pojavljuje na fakturi, nego u:'
        ],
        bullets: [
          'Broju poziva koji ne stižu',
          'Posetama koje propadnu na vratima',
          'Stanu koji sedi na oglasu nedeljama duže nego što bi morao'
        ]
      },
      {
        paragraphs: [
          'Agencija koja uporedi te brojeve sa cenom jedne 360° ture obično brzo vidi gde je stvarna ušteda.'
        ]
      },
      {
        heading: 'Kako to radi Kvadrat360',
        paragraphs: [
          'Kvadrat360 radi ceo proces "ključ u ruke" - snimanje, optimizaciju i ugradnju ture na sajt agencije za manje od 5 minuta, uz AI opise i glasovnu naraciju na više jezika za kupce koji ne govore srpski. Javite nam se za primer gotove ture i okvirnu ponudu za vaš portfolio nekretnina.'
        ]
      }
    ],
    relatedLinks: [
      { href: '/za-agencije', label: 'Agencija ste? Pogledajte paket za agencije i primer gotove ture' },
      { href: '/#cenovnik', label: 'Koliko košta tura za jednu nekretninu? Pogledajte cenovnik' }
    ]
  },
  {
    slug: 'prodaja-stanova-u-izgradnji-bez-poseta',
    title: 'Prodaja stanova u izgradnji bez poseta: kako 360° tura ubeđuje kupca da kupi na daljinu',
    seoTitle: 'Prodaja stanova u izgradnji bez poseta',
    description:
      'Kako 360° virtuelna tura ubeđuje kupca da kupi stan u izgradnji na daljinu - za investitore koji prodaju kupcima iz drugih gradova i inostranstva.',
    excerpt:
      'Kupac ne mora da dođe na gradilište da bi odlučio. Kako 360° tura pomaže investitorima da prodaju stanove u izgradnji kupcima na daljinu.',
    publishedAt: '2026-10-16',
    sections: [
      {
        paragraphs: [
          'Investitor ima dvadeset stanova u izgradnji i kupca koji živi u Beču. Kupac ne može da dođe na gradilište svaki put kad želi da proveri raspored soba ili pogled sa terase. Ako jedino što investitor nudi jesu tehnički crtež i par renderovanih slika, taj kupac ostaje u fazi "razmišljam" mnogo duže nego što bi trebalo - ili ode kod konkurenta koji mu pokaže više.'
        ]
      },
      {
        variant: 'callout',
        heading: 'Ukratko',
        paragraphs: [],
        bullets: [
          'Crtež pokazuje dimenzije, render idealizovan izgled - nijedno ne daje stvaran osećaj prostora.',
          'Tura po modelu ili reprezentativnom stanu pušta kupca da sam prošeta kroz raspored.',
          'Kupac iz inostranstva otvara turu u browseru, uz naraciju na svom jeziku.',
          'Manje poziva "samo da proverim", više razgovora o roku useljenja i ugovoru.'
        ]
      },
      {
        heading: 'Problem off-plan prodaje: kupac kupuje nešto što još ne postoji',
        paragraphs: [
          'Kod stanova u izgradnji kupac ne može fizički da obiđe prostor - zato se oslanja na ono što mu investitor pokaže. Tehnički crtež pokazuje dimenzije, ali ne i osećaj prostora. Render pokazuje izgled, ali je uvek "idealizovana" verzija i kupci to znaju, pa mu veruju manje nego stvarnom snimku.',
          'Rezultat:'
        ],
        bullets: [
          'Duža faza odlučivanja',
          'Više pitanja napred-nazad',
          'Veći rizik da kupac odustane jer jednostavno nije siguran šta tačno kupuje'
        ]
      },
      {
        heading: '360° tura rešava problem koji render ne može',
        paragraphs: [
          'Virtuelna tura ne mora da čeka da zgrada bude gotova - može se napraviti na osnovu gotovog modela ili na reprezentativnom stanu istog tipa, pa kupac hoda kroz prostor baš onim redom koji mu je prirodan: iz hodnika u dnevnu sobu, do terase, nazad u spavaću sobu. Vidi stvarne proporcije, ne ono što render sugeriše.',
          'Za kupca koji donosi odluku na daljinu, to je razlika između "verujem na reč" i "video sam sam".'
        ]
      },
      {
        heading: 'Kupac iz inostranstva dobija ono što bi dobio na terenu',
        paragraphs: [
          'Veliki deo kupaca za novogradnju u Srbiji dolazi iz dijaspore ili iz inostranstva - kupuju za sebe, za decu ili kao investiciju, a ne mogu da putuju zbog svake odluke. Kvadrat360 tura im to olakšava:'
        ],
        bullets: [
          'Radi direktno u browseru, bez instalacije aplikacije',
          'Podržava giroskop na mobilnom - kupac samo nagne telefon i "okreće se" po stanu kao da stoji u njemu',
          'AI opisi sa glasovnom naracijom na više jezika - kupac koji ne govori srpski prati turu bez prevodioca i bez da iko mora da mu objašnjava raspored uživo'
        ]
      },
      {
        heading: 'Manje poziva "samo da proverim", više poziva "spreman sam da potpišem"',
        paragraphs: [
          'Kad kupac može sam da istraži stan koliko god puta želi, broj uzaludnih poziva i mejlova sa pitanjima tipa "koliko je kuhinja udaljena od dnevne sobe" pada - kupac je to već video. Ono što ostaje su pitanja koja zaista pomeraju prodaju napred:'
        ],
        bullets: ['Rok useljenja', 'Način plaćanja', 'Detalji ugovora']
      },
      {
        paragraphs: ['Investitor troši vreme na zatvaranje posla, ne na objašnjavanje rasporeda.']
      },
      {
        heading: 'Kako to radi Kvadrat360',
        paragraphs: [
          'Kvadrat360 pravi "ključ u ruke" 360° ture i za stanove u izgradnji - na osnovu modela ili reprezentativne jedinice, sa optimizacijom za brzo učitavanje i ugradnjom na sajt investitora za manje od 5 minuta. Javite nam se da vidite primer gotove ture i proverite da li paket odgovara vašem projektu.'
        ]
      }
    ],
    relatedLinks: [
      { href: '/za-investitore', label: 'Investitor ste? Pogledajte kako izgleda prodaja novogradnje sa 360° turom' },
      { href: '/za-agencije', label: 'Agencija ste i prodajete stanove investitora? Pogledajte paket za agencije' }
    ]
  }
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
