import { Language } from './types';

/**
 * Pet kratkih pitanja po kategoriji, jedno-dva polja iz upitnika po pitanju
 * (vidi FAQ_CONTEXT u app/lib/tourFromForm.ts - mora da prati ISTO uparivanje,
 * inače AI odgovara na pitanje koje posetilac ne vidi). Ranije spojena
 * pitanja ("...i kakvo je...") su razdvojena na jedan fokus, da odgovor
 * može da bude jedna kratka rečenica umesto pasusa.
 */
export const categoryQuestions: Record<string, Record<Language, string[]>> = {
  rent: {
    sr: [
      'Kolika je zakupnina i mesečni troškovi?',
      'Koliki je depozit?',
      'Koji je minimalni period zakupa?',
      'Da li su dozvoljeni kućni ljubimci?',
      'Kakvi su dodatni uslovi ugovora?'
    ],
    en: [
      "What's the rent and monthly costs?",
      'How much is the deposit?',
      "What's the minimum lease period?",
      'Are pets allowed?',
      'What are the extra contract terms?'
    ],
    de: [
      'Wie hoch sind Miete und Nebenkosten?',
      'Wie hoch ist die Kaution?',
      'Wie lange ist die Mindestmietdauer?',
      'Sind Haustiere erlaubt?',
      'Welche zusätzlichen Vertragsbedingungen gibt es?'
    ],
    ru: [
      'Какова аренда и коммунальные расходы?',
      'Какой размер залога?',
      'Каков минимальный срок аренды?',
      'Разрешены ли домашние животные?',
      'Какие дополнительные условия договора?'
    ]
  },
  sale: {
    sr: [
      'Kolika je cena i da li je moguć kredit?',
      'Kakvo je stanje objekta?',
      'Da li je uknjižena i kakvo je vlasništvo?',
      'Da li su porezi i provizija uključeni?',
      'Šta sve ide uz stan?'
    ],
    en: [
      "What's the price, and is a mortgage possible?",
      "What's the property's condition?",
      "Is it registered, and what's the ownership?",
      'Are taxes and commission included?',
      'What comes with the property?'
    ],
    de: [
      'Wie hoch ist der Preis, ist ein Kredit möglich?',
      'Wie ist der Zustand der Immobilie?',
      'Ist sie im Grundbuch eingetragen, wie ist das Eigentum?',
      'Sind Steuern und Provision inbegriffen?',
      'Was gehört zur Immobilie dazu?'
    ],
    ru: [
      'Какова цена и возможна ли ипотека?',
      'В каком состоянии объект?',
      'Зарегистрирована ли недвижимость и какая форма собственности?',
      'Включены ли налоги и комиссия?',
      'Что входит в состав недвижимости?'
    ]
  },
  booking: {
    sr: [
      'Kolika je cena i minimalan boravak?',
      'Koliki je kapacitet i koja su pravila kuće?',
      'Koje je vreme za check-in i check-out?',
      'Kolika je taksa za čišćenje?',
      'Koje su pogodnosti i pravila otkazivanja?'
    ],
    en: [
      "What's the price and minimum stay?",
      "What's the capacity and house rules?",
      'What are check-in and check-out times?',
      "What's the cleaning fee?",
      'What amenities and cancellation policy?'
    ],
    de: [
      'Wie hoch sind Preis und Mindestaufenthalt?',
      'Wie viele Gäste und welche Hausregeln?',
      'Wann sind Check-in und Check-out?',
      'Wie hoch ist die Reinigungsgebühr?',
      'Welche Annehmlichkeiten und Stornobedingungen?'
    ],
    ru: [
      'Какова цена и минимальный срок проживания?',
      'Какова вместимость и правила дома?',
      'Во сколько заезд и выезд?',
      'Какова плата за уборку?',
      'Какие удобства и условия отмены?'
    ]
  }
};

/**
 * Nazivi redova u tabeli osnovnih podataka (Info modal, vidi TourModals.tsx)
 * i prevodi vrednosti sa zatvorenih lista (grejanje, da/ne). AI ovo ne
 * dodiruje - vrednost stiže iz upitnika na srpskom (propertyTaxonomy.ts) i
 * ovde se samo prevodi, isto kao "Prodaja/Izdavanje/Smeštaj" na sajtu.
 */
export const FACT_LABELS: Record<
  Language,
  {
    neighbourhood: string;
    area: string;
    structure: string;
    floor: string;
    elevator: string;
    basement: string;
    heating: string;
    buildStatus: string;
    finishStatus: string;
    yes: string;
    no: string;
  }
> = {
  sr: {
    neighbourhood: 'Naselje',
    area: 'Kvadratura',
    structure: 'Struktura',
    floor: 'Sprat',
    elevator: 'Lift',
    basement: 'Podrum',
    heating: 'Grejanje',
    buildStatus: 'Status gradnje',
    finishStatus: 'Stanje',
    yes: 'Da',
    no: 'Ne'
  },
  en: {
    neighbourhood: 'Neighbourhood',
    area: 'Floor area',
    structure: 'Structure',
    floor: 'Floor',
    elevator: 'Elevator',
    basement: 'Basement',
    heating: 'Heating',
    buildStatus: 'Build status',
    finishStatus: 'Finish',
    yes: 'Yes',
    no: 'No'
  },
  de: {
    neighbourhood: 'Viertel',
    area: 'Wohnfläche',
    structure: 'Struktur',
    floor: 'Etage',
    elevator: 'Aufzug',
    basement: 'Keller',
    heating: 'Heizung',
    buildStatus: 'Baustatus',
    finishStatus: 'Ausbauzustand',
    yes: 'Ja',
    no: 'Nein'
  },
  ru: {
    neighbourhood: 'Район',
    area: 'Площадь',
    structure: 'Структура',
    floor: 'Этаж',
    elevator: 'Лифт',
    basement: 'Подвал',
    heating: 'Отопление',
    buildStatus: 'Статус строительства',
    finishStatus: 'Отделка',
    yes: 'Да',
    no: 'Нет'
  }
};

/**
 * Vrednosti grejanja sa zatvorene liste (HEATING_OPTIONS u
 * app/lib/propertyTaxonomy.ts), prevedene. Ključ je TAČNO ono što agent
 * bira u upitniku - ako se lista tamo proširi, dodati novi ključ i ovde.
 */
export const HEATING_LABELS: Record<string, Record<Language, string>> = {
  'Centralno grejanje': {
    sr: 'Centralno grejanje',
    en: 'Central heating',
    de: 'Zentralheizung',
    ru: 'Центральное отопление'
  },
  Gas: { sr: 'Gas', en: 'Gas', de: 'Gas', ru: 'Газ' },
  Struja: { sr: 'Struja', en: 'Electric', de: 'Strom', ru: 'Электричество' },
  Klima: { sr: 'Klima', en: 'AC unit', de: 'Klimaanlage', ru: 'Кондиционер' },
  'Čvrsto gorivo': { sr: 'Čvrsto gorivo', en: 'Solid fuel', de: 'Feststoff', ru: 'Твёрдое топливо' },
  'Podno grejanje': {
    sr: 'Podno grejanje',
    en: 'Underfloor heating',
    de: 'Fußbodenheizung',
    ru: 'Тёплый пол'
  }
};

/**
 * Struktura sa zatvorene liste (STRUCTURES u app/lib/propertyTaxonomy.ts) -
 * ista lista za sve tipove nekretnine, pa je ovde jedan rečnik. Ključ je
 * TAČNO ono što agent bira u upitniku.
 */
export const STRUCTURE_LABELS: Record<string, Record<Language, string>> = {
  Garsonjera: { sr: 'Garsonjera', en: 'Studio', de: 'Studio', ru: 'Студия' },
  'Jednosoban (1.0)': {
    sr: 'Jednosoban (1.0)',
    en: '1-room apartment',
    de: '1-Zimmer-Wohnung',
    ru: '1-комнатная квартира'
  },
  'Jednoiposoban (1.5)': {
    sr: 'Jednoiposoban (1.5)',
    en: '1.5-room apartment',
    de: '1,5-Zimmer-Wohnung',
    ru: '1,5-комнатная квартира'
  },
  'Dvosoban (2.0)': {
    sr: 'Dvosoban (2.0)',
    en: '2-room apartment',
    de: '2-Zimmer-Wohnung',
    ru: '2-комнатная квартира'
  },
  'Dvoiposoban (2.5)': {
    sr: 'Dvoiposoban (2.5)',
    en: '2.5-room apartment',
    de: '2,5-Zimmer-Wohnung',
    ru: '2,5-комнатная квартира'
  },
  'Trosoban (3.0)': {
    sr: 'Trosoban (3.0)',
    en: '3-room apartment',
    de: '3-Zimmer-Wohnung',
    ru: '3-комнатная квартира'
  },
  'Troiposoban (3.5)': {
    sr: 'Troiposoban (3.5)',
    en: '3.5-room apartment',
    de: '3,5-Zimmer-Wohnung',
    ru: '3,5-комнатная квартира'
  },
  'Četvorosoban (4.0)': {
    sr: 'Četvorosoban (4.0)',
    en: '4-room apartment',
    de: '4-Zimmer-Wohnung',
    ru: '4-комнатная квартира'
  },
  'Petosoban i veći': {
    sr: 'Petosoban i veći',
    en: '5+ rooms',
    de: '5 Zimmer und mehr',
    ru: '5+ комнат'
  },
  'Prizemna (Pr)': {
    sr: 'Prizemna (Pr)',
    en: 'Single-storey (ground floor)',
    de: 'Eingeschossig (Erdgeschoss)',
    ru: 'Одноэтажный (первый этаж)'
  },
  'Spratna (Pr+1)': {
    sr: 'Spratna (Pr+1)',
    en: 'Two-storey (ground + 1)',
    de: 'Zweigeschossig (EG+1)',
    ru: 'Двухэтажный'
  },
  'Višespratna (Pr+2 i više)': {
    sr: 'Višespratna (Pr+2 i više)',
    en: 'Multi-storey (ground + 2 or more)',
    de: 'Mehrgeschossig (EG+2 oder mehr)',
    ru: 'Многоэтажный'
  },
  'Dupleks / mezonet u kući': {
    sr: 'Dupleks / mezonet u kući',
    en: 'Duplex / mezzanine in the house',
    de: 'Duplex / Maisonette im Haus',
    ru: 'Дуплекс / мезонин в доме'
  },
  'Maloprodajni / trgovački': {
    sr: 'Maloprodajni / trgovački',
    en: 'Retail / shop',
    de: 'Einzelhandel / Ladengeschäft',
    ru: 'Розничная торговля / магазин'
  },
  'Uslužni / kancelarijski': {
    sr: 'Uslužni / kancelarijski',
    en: 'Service / office',
    de: 'Dienstleistung / Büro',
    ru: 'Услуги / офис'
  },
  'Ugostiteljski (HoReCa)': {
    sr: 'Ugostiteljski (HoReCa)',
    en: 'Hospitality (HoReCa)',
    de: 'Gastronomie (HoReCa)',
    ru: 'Общепит (HoReCa)'
  },
  Montažna: { sr: 'Montažna', en: 'Prefab', de: 'Fertighaus', ru: 'Сборный дом' },
  Zidana: { sr: 'Zidana', en: 'Brick-built', de: 'Massivbau', ru: 'Кирпичный дом' },
  'Renovirana stara / etno kuća': {
    sr: 'Renovirana stara / etno kuća',
    en: 'Renovated old / ethno house',
    de: 'Renoviertes altes / Ethno-Haus',
    ru: 'Отремонтированный старый / этно-дом'
  }
};

/** Status gradnje (BUILD_STATUS_OPTIONS), prevedeno. */
export const BUILD_STATUS_LABELS: Record<string, Record<Language, string>> = {
  Novogradnja: { sr: 'Novogradnja', en: 'New build', de: 'Neubau', ru: 'Новостройка' },
  Starogradnja: { sr: 'Starogradnja', en: 'Old build', de: 'Altbau', ru: 'Вторичное жильё' },
  'Starogradnja - renovirano': {
    sr: 'Starogradnja - renovirano',
    en: 'Old build - renovated',
    de: 'Altbau - renoviert',
    ru: 'Вторичное жильё - отремонтировано'
  }
};

/** Stanje enterijera (FINISH_STATUS_OPTIONS), prevedeno. */
export const FINISH_STATUS_LABELS: Record<string, Record<Language, string>> = {
  'Siva faza': { sr: 'Siva faza', en: 'Shell finish', de: 'Rohbau', ru: 'Черновая отделка' },
  Polunamešteno: {
    sr: 'Polunamešteno',
    en: 'Partly furnished',
    de: 'Teilmöbliert',
    ru: 'Частично меблированная'
  },
  Namešteno: { sr: 'Namešteno', en: 'Furnished', de: 'Möbliert', ru: 'Меблированная' }
};

export const translations: Record<Language, Record<string, string>> = {
  sr: {
    secBasics: 'Osnovni podaci',
    secDescription: 'Opis',
    faqMoreTitle: 'Niste našli odgovor?',
    faqMoreText: 'Pitajte agenta direktno.',
    openInMaps: 'Otvori u Google mapama',
    addressLabel: 'Adresa',
    cityLabel: 'Grad',
    roomsLabel: 'Prostorije',
    roomsSeen: '{seen} od {total} viđeno',
    yourAgent: 'Vaš agent',
    viewingLive: 'Razgledanje uživo',
    viewingStep1: 'Izaberete dan i deo dana',
    viewingStep2: 'Ostavite ime i telefon',
    viewingStep3: 'Agent vas zove i potvrđuje termin',
    catRent: 'Izdavanje',
    catSale: 'Prodaja',
    catBooking: 'Smeštaj',
    emailShort: 'E-mail',
    startTour: '▶ Pokreni turu',
    loading: 'Učitavanje ture...',
    roomLoadingPrefix: 'Ulazimo u prostoriju: ',
    tourNotFound: 'Tura nije pronađena.',
    noRooms: 'Ova tura još nema prostorije.',
    guideCompleted: 'Vođenje je završeno',
    freeExplore: 'Slobodno razgledajte prostoriju ili pređite u drugu — preko menija na vrhu ili naziva sobe na slici.',
    targetRoom: '-- Izaberi prostoriju --',
    save: 'Sačuvaj poziciju i podatke',
    cancel: 'Otkaži',
    delete: '🗑️ Obriši tačku',
    editPoint: '✏️ Izmeni tačku',
    addPoint: 'Dodaj novu tačku',
    actionType: 'Tip akcije:',
    navArrow: '🚪 Strelica za prelaz',
    infoPoint: 'ℹ️ Info tačka',
    introNarration: '🎬 Uvodna naracija',
    titlePlaceholder: 'Naslov:',
    descPlaceholder: 'Opis / Tekst naracije...',
    audioUrlPlaceholder: 'Link do MP3 fajla:',
    welcomePrefix: 'Dobrodošli u ',
    btnLocation: '📍 Lokacija',
    btnAbout: 'ℹ️ Info',
    btnFaq: '❓ Pitanja',
    btnContact: '📞 Kontakt',
    callNow: 'Pozovi',
    btnPlan: '🗺️ Plan',
    noPlan: 'Plan stana još nije dostupan za ovu nekretninu.',
    planHere: 'Ovde ste',
    planSeen: 'Viđeno',
    planNew: 'Još niste bili',
    noLocation: 'Mapa lokacije još nije dostupna za ovu nekretninu.',
    noAbout: 'Informacije još nisu dostupne.',
    noFaq: 'Za ovu nekretninu još nema pitanja i odgovora.',
    contactTitle: 'Podaci za kontakt',
    agentLabel: 'Agent:',
    agencyLabel: 'Agencija:',
    phoneLabel: 'Telefon:',
    emailLabel: 'E-mail:',
    callBtn: 'Pozovi',
    emailBtn: 'Pošalji e-mail',
    close: 'Zatvori',
    comingSoon: 'Odgovor uskoro...',
    shareTour: '🔗 Podeli turu',
    shareShort: 'Podeli',
    linkCopied: '✅ Link kopiran!',
    startGuidedTour: '▶ Automatsko vođenje',
    startGuidedTourHint: 'Samo gledate i slušate',
    exploreSelf: '🧭 Istražite sami',
    exploreSelfHint: 'Prevlačite prstom, birate sobe',
    howItWorks: 'Kako radi 360° tura?',
    howStep1: 'Prevucite prstom po ekranu — gledate na sve strane.',
    howStep2: 'Dodirnite plavu tačku — prelazite u drugu prostoriju.',
    howStep3: 'Dole su plan stana, lokacija i kontakt agenta.',
    howGotIt: 'Razumem',
    dragHintTouch: 'Prevucite prstom da razgledate',
    dragHintMouse: 'Prevucite mišem da razgledate',
    navPrev: 'Prethodna',
    navNext: 'Sledeća',
    chooseRoom: 'Izaberi prostoriju',
    roomPosition: 'Prostorija {current} od {total}',
    guidePosition: '🎧 Vodič · {current} od {total}',
    guideAllSeen: '🎉 Obišli ste sve prostorije',
    lockedRentedTitle: 'Ova nekretnina je izdata',
    lockedSoldTitle: 'Ova nekretnina je prodata',
    lockedPausedTitle: 'Ova nekretnina trenutno nije dostupna',
    lockedIntro: 'Za slične nekretnine ili više informacija javite se:'
  },
  en: {
    secBasics: 'Key facts',
    secDescription: 'Description',
    faqMoreTitle: 'Didn’t find your answer?',
    faqMoreText: 'Ask the agent directly.',
    openInMaps: 'Open in Google Maps',
    addressLabel: 'Address',
    cityLabel: 'City',
    roomsLabel: 'Rooms',
    roomsSeen: '{seen} of {total} seen',
    yourAgent: 'Your agent',
    viewingLive: 'In-person viewing',
    viewingStep1: 'Pick a day and time of day',
    viewingStep2: 'Leave your name and phone',
    viewingStep3: 'The agent calls you to confirm',
    catRent: 'For rent',
    catSale: 'For sale',
    catBooking: 'Short stay',
    emailShort: 'E-mail',
    startTour: '▶ Start Tour',
    loading: 'Loading tour...',
    roomLoadingPrefix: 'Entering room: ',
    tourNotFound: 'Tour not found.',
    noRooms: 'This tour has no rooms.',
    guideCompleted: 'Guide Completed',
    freeExplore: 'Feel free to look around or switch rooms using the top menu or arrows.',
    targetRoom: '-- Select room --',
    save: 'Save Position & Data',
    cancel: 'Cancel',
    delete: '🗑️ Delete Point',
    editPoint: '✏️ Edit Point',
    addPoint: 'Add New Point',
    actionType: 'Action Type:',
    navArrow: '🚪 Room Navigation',
    infoPoint: 'ℹ️ Info ',
    introNarration: '🎬 Intro Narration',
    titlePlaceholder: 'Title:',
    descPlaceholder: 'Description / Narration text...',
    audioUrlPlaceholder: 'MP3 URL:',
    welcomePrefix: 'Welcome to ',
    btnPlan: '🗺️ Plan',
    btnLocation: '📍 Location',
    btnAbout: 'ℹ️ Info',
    btnFaq: '❓ FAQ',
    btnContact: '📞 Contact',
    callNow: 'Call',
    noPlan: 'Floor plan is currently not available for this property.',
    planHere: 'You are here',
    planSeen: 'Seen',
    planNew: 'Not visited yet',
    noLocation: 'Location map is currently not available for this property.',
    noAbout: 'Information is currently unavailable.',
    noFaq: 'No FAQ available for this property at the moment.',
    contactTitle: 'Contact Information',
    agentLabel: 'Agent:',
    agencyLabel: 'Agency:',
    phoneLabel: 'Phone:',
    emailLabel: 'Email:',
    callBtn: 'Call',
    emailBtn: 'Send Email',
    close: 'Close',
    comingSoon: 'Answer coming soon...',
    shareTour: '🔗 Share Tour',
    shareShort: 'Share',
    linkCopied: '✅ Link copied!',
    startGuidedTour: '▶ Guided Tour',
    startGuidedTourHint: 'Just watch and listen',
    exploreSelf: '🧭 Explore on Your Own',
    exploreSelfHint: 'Look around, pick the rooms',
    howItWorks: 'How does a 360° tour work?',
    howStep1: 'Drag across the screen — look in every direction.',
    howStep2: 'Tap a blue dot — move to another room.',
    howStep3: 'At the bottom: floor plan, location and agent contact.',
    howGotIt: 'Got it',
    dragHintTouch: 'Swipe to look around',
    dragHintMouse: 'Drag with the mouse to look around',
    navPrev: 'Previous',
    navNext: 'Next',
    chooseRoom: 'Choose a room',
    roomPosition: 'Room {current} of {total}',
    guidePosition: '🎧 Guide · {current} of {total}',
    guideAllSeen: '🎉 You have seen every room',
    lockedRentedTitle: 'This property has been rented',
    lockedSoldTitle: 'This property has been sold',
    lockedPausedTitle: 'This property is currently unavailable',
    lockedIntro: 'For similar properties or more information, contact:'
  },
  de: {
    secBasics: 'Eckdaten',
    secDescription: 'Beschreibung',
    faqMoreTitle: 'Keine Antwort gefunden?',
    faqMoreText: 'Fragen Sie den Makler direkt.',
    openInMaps: 'In Google Maps öffnen',
    addressLabel: 'Adresse',
    cityLabel: 'Stadt',
    roomsLabel: 'Räume',
    roomsSeen: '{seen} von {total} gesehen',
    yourAgent: 'Ihr Makler',
    viewingLive: 'Besichtigung vor Ort',
    viewingStep1: 'Tag und Tageszeit wählen',
    viewingStep2: 'Name und Telefon angeben',
    viewingStep3: 'Der Makler ruft zur Bestätigung an',
    catRent: 'Zu vermieten',
    catSale: 'Zu verkaufen',
    catBooking: 'Kurzaufenthalt',
    emailShort: 'E-Mail',
    startTour: '▶ Tour Starten',
    loading: 'Tour wird geladen...',
    roomLoadingPrefix: 'Betrete Raum: ',
    tourNotFound: 'Tour nicht gefunden.',
    noRooms: 'Diese Tour hat keine Räume.',
    guideCompleted: 'Führung beendet',
    freeExplore: 'Schauen Sie sich frei um oder wechseln Sie den Raum oben.',
    targetRoom: '-- Raum wählen --',
    save: 'Speichern',
    cancel: 'Abbrechen',
    delete: '🗑️ Löschen',
    editPoint: '✏️ Bearbeiten',
    addPoint: 'Neuen Punkt hinzufügen',
    actionType: 'Aktionstyp:',
    navArrow: '🚪 Raumnavigation',
    infoPoint: 'ℹ️ Info',
    introNarration: '🎬 Intro-Erzählung',
    titlePlaceholder: 'Titel:',
    descPlaceholder: 'Beschreibung...',
    audioUrlPlaceholder: 'MP3-URL:',
    welcomePrefix: 'Willkommen in ',
    btnPlan: '🗺️ Grundriss',
    btnLocation: '📍 Standort',
    btnAbout: 'ℹ️ Info',
    btnFaq: '❓ FAQ',
    btnContact: '📞 Kontakt',
    callNow: 'Anrufen',
    noPlan: 'Der Grundriss ist derzeit für diese Immobilie nicht verfügbar.',
    planHere: 'Sie sind hier',
    planSeen: 'Gesehen',
    planNew: 'Noch nicht besucht',
    noLocation: 'Die Standortkarte ist derzeit für diese Immobilie nicht verfügbar.',
    noAbout: 'Informationen derzeit nicht verfügbar.',
    noFaq: 'Derzeit sind keine FAQ verfügbar.',
    contactTitle: 'Kontaktinformationen',
    agentLabel: 'Makler:',
    agencyLabel: 'Agentur:',
    phoneLabel: 'Telefon:',
    emailLabel: 'E-Mail:',
    callBtn: 'Anrufen',
    emailBtn: 'E-Mail senden',
    close: 'Schließen',
    comingSoon: 'Antwort folgt...',
    shareTour: '🔗 Tour teilen',
    shareShort: 'Teilen',
    linkCopied: '✅ Link kopiert!',
    startGuidedTour: '▶ Geführte Tour',
    startGuidedTourHint: 'Einfach zusehen und zuhören',
    exploreSelf: '🧭 Selbst Erkunden',
    exploreSelfHint: 'Selbst umsehen, Räume wählen',
    howItWorks: 'Wie funktioniert die 360°-Tour?',
    howStep1: 'Über den Bildschirm wischen — in alle Richtungen schauen.',
    howStep2: 'Blauen Punkt antippen — in einen anderen Raum wechseln.',
    howStep3: 'Unten: Grundriss, Lage und Kontakt zum Makler.',
    howGotIt: 'Verstanden',
    dragHintTouch: 'Wischen Sie, um sich umzusehen',
    dragHintMouse: 'Mit der Maus ziehen, um sich umzusehen',
    navPrev: 'Zurück',
    navNext: 'Weiter',
    chooseRoom: 'Raum wählen',
    roomPosition: 'Raum {current} von {total}',
    guidePosition: '🎧 Führung · {current} von {total}',
    guideAllSeen: '🎉 Sie haben alle Räume gesehen',
    lockedRentedTitle: 'Diese Immobilie ist bereits vermietet',
    lockedSoldTitle: 'Diese Immobilie ist bereits verkauft',
    lockedPausedTitle: 'Diese Immobilie ist derzeit nicht verfügbar',
    lockedIntro: 'Für ähnliche Immobilien oder weitere Informationen wenden Sie sich an:'
  },
  ru: {
    secBasics: 'Основные данные',
    secDescription: 'Описание',
    faqMoreTitle: 'Не нашли ответ?',
    faqMoreText: 'Спросите агента напрямую.',
    openInMaps: 'Открыть в Google Картах',
    addressLabel: 'Адрес',
    cityLabel: 'Город',
    roomsLabel: 'Комнаты',
    roomsSeen: 'Просмотрено {seen} из {total}',
    yourAgent: 'Ваш агент',
    viewingLive: 'Просмотр вживую',
    viewingStep1: 'Выберите день и время суток',
    viewingStep2: 'Оставьте имя и телефон',
    viewingStep3: 'Агент перезвонит и подтвердит время',
    catRent: 'Аренда',
    catSale: 'Продажа',
    catBooking: 'Посуточно',
    emailShort: 'E-mail',
    startTour: '▶ Начать тур',
    loading: 'Загрузка тура...',
    roomLoadingPrefix: 'Входим в помещение: ',
    tourNotFound: 'Тур не найден.',
    noRooms: 'В этом туре нет комнат.',
    guideCompleted: 'Экскурсия завершена',
    freeExplore: 'Осмотритесь или перейдите в другую комнату, используя верхнее меню или стрелки.',
    targetRoom: '-- Выберите комнату --',
    save: 'Сохранить позицию и данные',
    cancel: 'Отмена',
    delete: '🗑️ Удалить точку',
    editPoint: '✏️ Редактировать точку',
    addPoint: 'Добавить новую точку',
    actionType: 'Тип действия:',
    navArrow: '🚪 Переход в комнату',
    infoPoint: 'ℹ️ Инфо-точка',
    introNarration: '🎬 Вводная озвучка',
    titlePlaceholder: 'Заголовок:',
    descPlaceholder: 'Описание / Текст озвучки...',
    audioUrlPlaceholder: 'Ссылка на MP3 файл:',
    welcomePrefix: 'Добро пожаловать в ',
    btnPlan: '🗺️ План',
    btnLocation: '📍 Локация',
    btnAbout: 'ℹ️ Инфо',
    btnFaq: '❓ Вопросы',
    btnContact: '📞 Контакты',
    callNow: 'Позвонить',
    noPlan: 'План помещения временно недоступен для этого объекта.',
    planHere: 'Вы здесь',
    planSeen: 'Просмотрено',
    planNew: 'Ещё не были',
    noLocation: 'Карта расположения временно недоступна.',
    noAbout: 'Информация временно недоступна.',
    noFaq: 'Часто задаваемые вопросы временно отсутствуют.',
    contactTitle: 'Контактная информация',
    agentLabel: 'Агент:',
    agencyLabel: 'Агентство:',
    phoneLabel: 'Телефон:',
    emailLabel: 'Email:',
    callBtn: 'Позвонить',
    emailBtn: 'Написать Email',
    close: 'Закрыть',
    comingSoon: 'Ответ скоро появится...',
    shareTour: '🔗 Поделиться туром',
    shareShort: 'Поделиться',
    linkCopied: '✅ Ссылка скопирована!',
    startGuidedTour: '▶ Тур с гидом',
    startGuidedTourHint: 'Просто смотрите и слушайте',
    exploreSelf: '🧭 Осмотреть самостоятельно',
    exploreSelfHint: 'Осматривайтесь сами, выбирайте комнаты',
    howItWorks: 'Как работает 360° тур?',
    howStep1: 'Проведите пальцем по экрану — смотрите во все стороны.',
    howStep2: 'Нажмите на синюю точку — перейдёте в другую комнату.',
    howStep3: 'Внизу: план квартиры, расположение и контакт агента.',
    howGotIt: 'Понятно',
    dragHintTouch: 'Проведите пальцем, чтобы осмотреться',
    dragHintMouse: 'Перетаскивайте мышью, чтобы осмотреться',
    navPrev: 'Назад',
    navNext: 'Далее',
    chooseRoom: 'Выбрать комнату',
    roomPosition: 'Комната {current} из {total}',
    guidePosition: '🎧 Гид · {current} из {total}',
    guideAllSeen: '🎉 Вы осмотрели все комнаты',
    lockedRentedTitle: 'Эта недвижимость уже сдана',
    lockedSoldTitle: 'Эта недвижимость уже продана',
    lockedPausedTitle: 'Эта недвижимость временно недоступна',
    lockedIntro: 'По поводу похожих объектов или дополнительной информации обращайтесь:'
  }
};

/**
 * Sprat je slobodan tekst iz upitnika ("3/6", "Prizemlje"), pa se brojevi
 * prikazuju kako su upisani, a REČI se prevode - inače bi "Prizemlje"
 * ostalo na srpskom u engleskoj, nemačkoj i ruskoj turi. Ključ je mala
 * slova, bez tačke; vidi formatFloor u utils.tsx.
 */
export const FLOOR_WORDS: Record<string, Record<Language, string>> = {
  prizemlje: { sr: 'Prizemlje', en: 'Ground floor', de: 'Erdgeschoss', ru: 'Первый этаж' },
  pr: { sr: 'Prizemlje', en: 'Ground floor', de: 'Erdgeschoss', ru: 'Первый этаж' },
  'visoko prizemlje': { sr: 'Visoko prizemlje', en: 'Raised ground floor', de: 'Hochparterre', ru: 'Высокий первый этаж' },
  vpr: { sr: 'Visoko prizemlje', en: 'Raised ground floor', de: 'Hochparterre', ru: 'Высокий первый этаж' },
  suteren: { sr: 'Suteren', en: 'Semi-basement', de: 'Souterrain', ru: 'Цокольный этаж' },
  potkrovlje: { sr: 'Potkrovlje', en: 'Attic floor', de: 'Dachgeschoss', ru: 'Мансарда' }
};
