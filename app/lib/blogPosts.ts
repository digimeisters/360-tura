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
  /** Datum poslednje suštinske izmene teksta (YYYY-MM-DD); bez njega važi publishedAt. */
  updatedAt?: string;
  sections: BlogSection[];
  /**
   * Dugme odmah posle poslednjeg pasusa (vlasnik, 22. 10. 2026). Bez njega
   * vodi na kontakt na početnoj; tekstovi pisani za agencije ili investitore
   * vode na kontakt svoje strane.
   */
  cta?: { href: string; label: string };
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
    cta: { href: '/za-agencije#kontakt', label: 'Zatražite ponudu za agenciju' },
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
        heading: 'Fotografija pokazuje sobu, tura pokazuje celu nekretninu',
        paragraphs: [
          'Obična fotografija daje osam do petnaest uglova iz kojih je fotograf odlučio da nekretnina treba da se vidi. Kupac nema kontrolu:'
        ],
        bullets: [
          'Ne može da pogleda levo',
          'Ne može da proceni koliko je hodnik dug',
          'Ne zna da li kuhinja gleda na ulicu ili dvorište'
        ]
      },
      {
        paragraphs: [
          '360° virtuelna tura prebacuje tu kontrolu kupcu: on hoda kroz prostor onim redom koji mu je logičan, zadržava se gde ga zanima, preskače gde ne.',
          'Razlika nije kozmetička. Tura ne pomaže zato što je "lepša", nego zato što kupac stigne do ozbiljnog pitanja (termin za posetu, ponuda) sa mnogo jasnijom slikom u glavi nego posle galerije fotografija.'
        ]
      },
      {
        heading: 'Neozbiljne posete koštaju agenciju vreme, ne samo novac',
        paragraphs: [
          'Svaka poseta koja se završi rečenicom "ovo ipak nije to" jeste vreme utrošeno na put, dogovor termina i prezentaciju - vreme koje je moglo da ode na kupca koji je stvarno spreman. Fotografija ne daje dovoljno informacija da kupac sam sebe isključi pre nego što zakaže posetu. Tura to radi: ko je prošetao kroz nekretninu na ekranu i i dalje je zainteresovan, dolazi na razgledanje već ubeđen.',
          'To je razlika između "dovodim ljude da vide nekretninu" i "dovodim ljude koji žele baš tu nekretninu".'
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
          'Nekretnini koja stoji na oglasu nedeljama duže nego što bi morala'
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
          'Kvadrat360 radi ceo proces "ključ u ruke" - snimanje i optimizaciju ture, a ugradnja na sajt agencije traje manje od 5 minuta. Uz turu idu AI opisi i glasovna naracija na više jezika za kupce koji ne govore srpski. Javite nam se za primer gotove ture i okvirnu ponudu za vaš portfolio nekretnina.'
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
    cta: { href: '/za-investitore#kontakt', label: 'Zakažite razgovor o projektu' },
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
          'Tura snimljena u oglednom stanu pušta kupca da sam prošeta kroz raspored.',
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
          'Virtuelna tura ne mora da čeka da cela zgrada bude gotova - dovoljno je snimiti ogledni stan ili prvi završeni stan istog tipa, pa kupac hoda kroz prostor baš onim redom koji mu je prirodan: iz hodnika u dnevnu sobu, do terase, nazad u spavaću sobu. Vidi stvarne proporcije, ne ono što render sugeriše.',
          'Za kupca koji donosi odluku na daljinu, to je razlika između "verujem na reč" i "video sam sam".'
        ]
      },
      {
        heading: 'Kupac iz inostranstva dobija ono što bi dobio na terenu',
        paragraphs: [
          'Deo kupaca za novogradnju dolazi iz drugih gradova ili iz inostranstva - kupuju za sebe, za decu ili kao investiciju, a ne mogu da putuju zbog svake odluke. Kvadrat360 tura im to olakšava:'
        ],
        bullets: [
          'Radi direktno u browseru, bez instalacije aplikacije',
          'Podržava giroskop na mobilnom - kupac samo nagne telefon i "okreće se" po stanu kao da stoji u njemu',
          'AI opisi sa glasovnom naracijom na više jezika - kupac koji ne govori srpski prati turu bez prevodioca, a da niko ne mora da mu objašnjava raspored uživo'
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
          'Kvadrat360 pravi "ključ u ruke" 360° ture i za stanove u izgradnji - na oglednom ili prvom završenom stanu istog tipa, sa optimizacijom za brzo učitavanje i ugradnjom na sajt investitora za manje od 5 minuta. Javite nam se da vidite primer gotove ture i proverite da li paket odgovara vašem projektu.'
        ]
      }
    ],
    relatedLinks: [
      { href: '/za-investitore', label: 'Investitor ste? Pogledajte kako izgleda prodaja novogradnje sa 360° turom' },
      { href: '/', label: 'Želite da probate kako izgleda gotova 360° tura? Prošetajte kroz jednu' },
      { href: '/za-agencije', label: 'Agencija ste i prodajete stanove investitora? Pogledajte paket za agencije' }
    ]
  },
  {
    slug: 'kako-brze-prodati-stan-u-kragujevcu',
    title: 'Kako brže prodati stan u Kragujevcu: šta uraditi pre nego što objavite oglas',
    seoTitle: 'Kako brže prodati stan u Kragujevcu',
    description:
      'Realna cena, sređeni papiri, oglas koji odgovara na pitanja i tura za kupce iz okolnih mesta - pet koraka pre objave koji skraćuju prodaju u Kragujevcu.',
    excerpt:
      'Oglas je postavljen, a posle mesec dana stižu samo pozivi "koji je sprat?". Evo šta uraditi pre objave da se nekretnina u Kragujevcu ne zadrži na portalu.',
    publishedAt: '2026-10-22',
    sections: [
      {
        paragraphs: [
          'Vlasnik slika stan telefonom, upiše cenu "otprilike kao komšija" i objavi oglas. Prve nedelje telefon zvoni, ali pitanja su uvek ista: koji je sprat, ima li lifta, koliko su troškovi. Posle mesec dana poziva je sve manje, a oglas tone na portalu ispod novijih.',
          'Prodaja ne počinje objavom oglasa - počinje pripremom pre nje. Evo šta u Kragujevcu najviše skraćuje put od oglasa do kupca.'
        ]
      },
      {
        variant: 'callout',
        heading: 'Ukratko',
        paragraphs: [],
        bullets: [
          'Cena po naselju, a ne po osećaju - previsoka cena najviše produžava prodaju.',
          'Papiri sređeni pre prvog poziva, da ozbiljan kupac ne odustane zbog čekanja.',
          'Oglas koji sam odgovara na pitanja: sprat, lift, grejanje, troškovi, parking.',
          'Tura za kupce iz Kraljeva, Jagodine ili Gornjeg Milanovca, koji ne mogu da dođu "samo da pogledaju".'
        ]
      },
      {
        heading: 'Počnite od cene po naselju, ne od željene cene',
        paragraphs: [
          'Isti kvadrat ne vredi isto u Centru, na Bubnju, Erdogliji ili Aerodromu. Kupci to znaju, jer pre poziva uporede desetak oglasa iz istog kraja. Nekretnina čija je cena iznad tog raspona najčešće ne dobije ni prvi poziv - i onda se cena spušta tek posle nekoliko nedelja, kad oglas već deluje "ustajalo".',
          'Pre objave proverite raspon cena za vaše naselje. Na kvadrat360.com/alati postoji besplatna procena vrednosti po naselju i tipu nekretnine, za prodaju i za izdavanje - bez naloga i bez obaveze.'
        ]
      },
      {
        heading: 'Sredite papire pre prvog poziva',
        paragraphs: ['Kupac koji je odlučio često želi da krene odmah. Ako dokumentacija tek treba da se traži, gubi se i nedelja i volja. Pripremite unapred:'],
        bullets: [
          'List nepokretnosti i dokaz o uknjiženosti',
          'Podatke o kvadraturi iz dokumentacije, da se poklapaju sa oglasom',
          'Okvirne mesečne troškove: grejanje, struja, zajednički troškovi zgrade',
          'Informaciju šta ostaje uz nekretninu (kuhinja, ugradni ormari, klima)'
        ]
      },
      {
        heading: 'Oglas koji odgovara na pitanja pre nego što zazvoni telefon',
        paragraphs: [
          'Svaki poziv "koji je sprat?" znači da oglas nije rekao dovoljno. Kupac koji ne nađe odgovor ne zove uvek - često samo pređe na sledeći oglas. U opisu jasno navedite:'
        ],
        bullets: [
          'Sprat i ukupan broj spratova, uz lift',
          'Vrstu grejanja i okvirne troškove',
          'Terasu, parking ili garažu, podrum',
          'Stanje: renovirano, za renoviranje, useljivo odmah',
          'Raspored prostorija - najbolje sa tlocrtom'
        ]
      },
      {
        paragraphs: [
          'Virtuelna tura ide korak dalje: kupac sam prošeta kroz nekretninu, a u turi su na jednom mestu i podaci, odgovori na najčešća pitanja, tlocrt i dugme za zakazivanje razgledanja.'
        ]
      },
      {
        heading: 'Kupci iz okolnih mesta ne dolaze "samo da pogledaju"',
        paragraphs: [
          'Deo kupaca za Kragujevac dolazi iz Kraljeva, Jagodine, Gornjeg Milanovca ili Aranđelovca - za posao, studije ili zbog dece. Za njih je svaka poseta pola dana puta. Pre nego što krenu, žele da budu sigurni da nekretnina vredi dolaska.',
          'Sa fotografijama to ne mogu da procene, sa turom mogu. Tura im daje raspored, svetlo i stanje prostorija pre nego što sednu u auto - i na razgledanje dolaze oni koji su već skoro odlučili.'
        ]
      },
      {
        heading: 'Pomozite kupcu da izračuna ratu',
        paragraphs: [
          'Većina kupaca ne pita "da li mi se dopada", nego "mogu li to da platim". Ako odmah vidi kolika bi bila mesečna rata kredita i koliko mu treba za učešće i troškove kupovine, brže prelazi sa razgledanja na odluku.',
          'Uz oglas možete podeliti i naš besplatan kalkulator kredita i troškova kupovine - računa ratu, učešće, troškove notara i katastra, i povrat PDV-a za prvi stan.'
        ]
      },
      {
        heading: 'Kako vam Kvadrat360 skraćuje prodaju',
        paragraphs: [
          'U Kragujevcu snimamo 360° turu i HDR fotografije za oglas za 30-60 minuta, a gotova tura stiže za 24-48 sati. Link stavljate u oglas i šaljete kupcima na Viber, a tura ima audio vodiča na četiri jezika i dugme za zakazivanje razgledanja. Javite se za termin snimanja.'
        ]
      }
    ],
    relatedLinks: [
      { href: '/alati/procena-vrednosti', label: 'Koliko vredi vaša nekretnina? Proverite raspon cene za vaše naselje' },
      { href: '/#cenovnik', label: 'Hoćete turu za svoju nekretninu? Pogledajte cenovnik' },
      { href: '/za-agencije', label: 'Agencija ste? Pogledajte kako tura štedi uzaludna razgledanja' }
    ]
  },
  {
    slug: 'kako-pripremiti-nekretninu-za-snimanje-360-ture',
    title: 'Kako pripremiti nekretninu za snimanje 360° ture: kontrolna lista',
    seoTitle: 'Priprema nekretnine za snimanje 360° ture',
    description:
      '360° kamera vidi svaki ugao, pa priprema traje duže nego za obične slike. Kontrolna lista za agente i vlasnike: svetlo, prostorije, privatnost i dan snimanja.',
    excerpt:
      'Obična fotografija preskoči ugao sa kutijama. 360° kamera ga vidi. Evo šta pripremiti dan pre snimanja, da tura pokaže nekretninu u najboljem svetlu.',
    publishedAt: '2026-10-22',
    sections: [
      {
        paragraphs: [
          'Fotograf za oglas bira uglove: okrene se od police sa kutijama, izostavi sušilicu sa vešom, ne snima hodnik. Kod 360° ture to ne postoji - kamera snima ceo prostor oko sebe, i kupac kasnije može da pogleda svaki ugao.',
          'Zato priprema za turu traje malo duže nego za obične fotografije. Dobra vest: sve se svodi na listu koju možete da prođete za sat-dva, dan pre snimanja.'
        ]
      },
      {
        variant: 'callout',
        heading: 'Ukratko',
        paragraphs: [],
        bullets: [
          'Sklonite sitnice sa svih površina - kamera vidi i ono što ste hteli da ostane "van kadra".',
          'Upalite sva svetla i podignite roletne; tamna prostorija na turi deluje manja.',
          'Sklonite lične fotografije, dokumenta i sve sa imenom i adresom.',
          'Za vreme snimanja niko ne ostaje u prostoriji koja se snima.'
        ]
      },
      {
        heading: 'Dan pre snimanja: ono što kamera ne prašta',
        paragraphs: ['360° kamera ne može da "okrene glavu" od nereda. Prođite kroz nekretninu i:'],
        bullets: [
          'Ispraznite radne površine u kuhinji i kupatilu',
          'Sklonite veš, sušilice, kese i kutije',
          'Zamenite pregorele sijalice',
          'Obrišite ogledala, staklena vrata i prozore',
          'Sklonite tepihe za kućne ljubimce, posude za hranu i igračke'
        ]
      },
      {
        heading: 'Svetlo pravi utisak prostora',
        paragraphs: [
          'Ista soba deluje veća i toplija kad je ravnomerno osvetljena. HDR snimanje izjednačava svetlo prozora i unutrašnjosti, ali mu treba vaša pomoć:'
        ],
        bullets: [
          'Podignite sve roletne i razmaknite zavese',
          'Upalite sva svetla, i u hodniku i kupatilu',
          'Isključite televizore i monitore - crni ekran deluje kao rupa u zidu'
        ]
      },
      {
        heading: 'Prostorija po prostorija',
        paragraphs: [],
        list: [
          { term: 'Dnevna soba', text: 'Jastuci na mestu, daljinski i punjači u fioci, stolić prazan ili sa jednim ukrasom.' },
          { term: 'Kuhinja', text: 'Prazna sudopera, aparati sklonjeni sa pulta, krpe sklonjene sa rerne.' },
          { term: 'Kupatilo', text: 'Spuštena daska, sklonjene četkice i kozmetika, čisti peškiri ili nijedan.' },
          { term: 'Spavaća soba', text: 'Namešten krevet, zatvoreni ormari, ništa na podu.' },
          { term: 'Terasa', text: 'Sklonjen veš, prazne kese i pepeljare; ako ima nameštaja, poređajte ga.' }
        ]
      },
      {
        heading: 'Privatnost: šta mora da nestane iz kadra',
        paragraphs: [
          'Tura je javna i deli se dalje, pa iz kadra sklonite sve što otkriva ko tu živi: porodične fotografije, dokumenta, račune, kovertu sa imenom i adresom, kalendar sa obavezama.',
          'Tačna adresa se u turi i ne prikazuje - kupac vidi ulicu i naselje, a kućni broj dobija tek kad zakaže razgledanje.'
        ]
      },
      {
        heading: 'Na dan snimanja u Kragujevcu',
        paragraphs: ['Snimanje jedne nekretnine traje 30-60 minuta. Da prođe brzo i bez ponavljanja:'],
        bullets: [
          'Otključajte sve prostorije koje treba da budu u turi',
          'Ljubimce prebacite kod komšija ili u auto na kratko',
          'Ukućani čekaju u prostoriji koja se ne snima, ili napolju',
          'Ostavite otvorena unutrašnja vrata - tura tako lakše vodi kroz raspored'
        ]
      },
      {
        heading: 'Pravi kvadrati, bez skrivenih ćoškova',
        paragraphs: [
          'Priprema nije sakrivanje mana - kupac će ih videti na razgledanju. Cilj je da tura pokaže pravo stanje, bez nereda koji odvlači pažnju. Kupac koji na turi vidi i manu, a i dalje zakaže razgledanje, dolazi ozbiljno zainteresovan.',
          'Kvadrat360 snima turu i HDR fotografije u Kragujevcu i okolini, a gotova tura stiže za 24-48 sati. Ako ste agent, ovu listu slobodno pošaljite vlasniku pre termina.'
        ]
      }
    ],
    relatedLinks: [
      { href: '/za-agencije', label: 'Agencija ste? Pogledajte kako izgleda saradnja i primer ture' },
      { href: '/#cenovnik', label: 'Koliko košta snimanje jedne nekretnine? Pogledajte cenovnik' },
      { href: '/blog/kako-brze-prodati-stan-u-kragujevcu', label: 'Spremate se za prodaju? Pročitajte šta uraditi pre objave oglasa' }
    ]
  }
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
