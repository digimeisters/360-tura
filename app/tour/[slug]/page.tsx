'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

type Language = 'sr' | 'en' | 'de' | 'ru';

type Waypoint = {
  yaw: number;
  pitch: number;
  text_i18n?: Record<string, string> | string;
  title_i18n?: Record<string, string> | string;
  type?: 'navigation' | 'info';
  targetRoomId?: string | number;
  audio_url?: string;
};

type EstablishData = {
  text_i18n?: Record<string, string> | string;
  fromYaw?: number;
  pitch?: number;
  audio_url?: string;
};

type Room = {
  id: string | number;
  tour_slug: string;
  title_i18n?: Record<string, string> | string;
  order_index?: number;
  waypoints_i18n?: Waypoint[] | string;
  establish_i18n?: EstablishData | string;
  panorama_url?: string;
};

type Tour = {
  id: string | number;
  slug: string;
  title_i18n?: Record<string, string> | string;
  category?: 'rent' | 'sale' | 'booking';
  location_map_url?: string;
  about_text_i18n?: Record<string, string> | string;
  floorplan_url?: string;
  faq_1_i18n?: Record<string, string> | string;
  faq_2_i18n?: Record<string, string> | string;
  faq_3_i18n?: Record<string, string> | string;
  faq_4_i18n?: Record<string, string> | string;
  faq_5_i18n?: Record<string, string> | string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  agent_name?: string;
  agent_phone?: string;
  agent_email?: string;
  agency_name?: string;
};

type ActiveModal = 'plan' | 'location' | 'about' | 'faq' | 'contact' | null;

const normalizeYaw = (yaw: number): number => {
  let res = (yaw + 180) % 360;
  if (res < 0) res += 360;
  return res - 180;
};

const getShortestTargetYaw = (currentYaw: number, targetYaw: number): number => {
  const normCurrent = normalizeYaw(currentYaw);
  const normTarget = normalizeYaw(targetYaw);
  let diff = normTarget - normCurrent;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return currentYaw + diff;
};

const getLocalizedText = (textData: unknown, lang: string = 'sr'): string => {
  if (!textData) return '';
  let parsed = textData;
  if (typeof textData === 'string') {
    try {
      parsed = JSON.parse(textData);
    } catch {
      return textData;
    }
  }
  if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, string>;
    return record[lang] || record['sr'] || Object.values(record)[0] || '';
  }
  return String(parsed);
};

const parseWaypoints = (waypointsData: unknown): Waypoint[] => {
  if (!waypointsData) return [];
  if (Array.isArray(waypointsData)) return waypointsData as Waypoint[];
  if (typeof waypointsData === 'string') {
    try {
      const parsed = JSON.parse(waypointsData);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
};

const parseEstablish = (establishData: unknown): EstablishData => {
  if (!establishData) return {};
  if (typeof establishData === 'object') return establishData as EstablishData;
  if (typeof establishData === 'string') {
    try {
      const parsed = JSON.parse(establishData);
      if (parsed && typeof parsed === 'object') return parsed as EstablishData;
    } catch {}
  }
  return {};
};

const buildI18nObject = (
  textValue: string,
  existingData?: unknown,
  currentLang: Language = 'sr'
): Record<string, string> => {
  let result: Record<string, string> = { sr: '', en: '', de: '', ru: '' };
  if (existingData) {
    if (typeof existingData === 'string') {
      try {
        const parsed = JSON.parse(existingData);
        if (parsed && typeof parsed === 'object') {
          result = { ...result, ...(parsed as Record<string, string>) };
        }
      } catch {
        result.sr = existingData;
      }
    } else if (typeof existingData === 'object') {
      result = { ...result, ...(existingData as Record<string, string>) };
    }
  }
  result[currentLang] = textValue;
  return result;
};

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: 'white', background: '#0a0a0a', height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', gap: '20px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ width: '12px', height: '12px', backgroundColor: '#38bdf8', borderRadius: '50%', animation: 'pulseDot 1.4s infinite ease-in-out both', animationDelay: '-0.32s' }} />
        <div style={{ width: '12px', height: '12px', backgroundColor: '#38bdf8', borderRadius: '50%', animation: 'pulseDot 1.4s infinite ease-in-out both', animationDelay: '-0.16s' }} />
        <div style={{ width: '12px', height: '12px', backgroundColor: '#38bdf8', borderRadius: '50%', animation: 'pulseDot 1.4s infinite ease-in-out both' }} />
      </div>
      <style>{`
        @keyframes pulseDot {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40% { transform: scale(1.0); opacity: 1; }
        }
        .pnlm-load-box {
          display: none !important;
        }
      `}</style>
      <div style={{ color: '#38bdf8', fontSize: '14px', letterSpacing: '1px', fontWeight: 500 }}>{children}</div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.75)',
  color: '#000000',
  border: '1px solid rgba(255, 255, 255, 0.4)',
  borderRadius: '16px',
  padding: '6px 12px',
  fontSize: '11px',
  cursor: 'pointer',
  backdropFilter: 'blur(8px)',
  transition: 'all 0.2s ease',
  flexShrink: 0,
  userSelect: 'none',
  fontWeight: 500,
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
};

const categoryQuestions: Record<string, Record<Language, string[]>> = {
  rent: {
    sr: [
      'Kolika je mesečna zakupnina i kakvi su uslovi za depozit?',
      'Koji je minimalni period zakupa i od kog datuma je stan useljiv?',
      'Koliki su prosečni mesečni troškovi (režije i informatika) i kakvo je grejanje?',
      'Da li su dozvoljeni kućni ljubimci (pet friendly)?',
      'Kakvi su dodatni uslovi ugovora i obaveze zakupca?'
    ],
    en: [
      'What is the monthly rent and what are the deposit conditions?',
      'What is the minimum lease period and from what date is the apartment available?',
      'What are the average monthly utilities and heating costs?',
      'Are pets allowed (pet friendly)?',
      'What are the additional contract terms and tenant obligations?'
    ],
    de: [
      'Wie hoch ist die monatliche Miete und wie sind die Kautionsbedingungen?',
      'Wie lange ist die Mindestmietdauer und ab welchem Datum ist die Wohnung verfügbar?',
      'Wie hoch sind die durchschnittlichen Nebenkosten und die Heizungsart?',
      'Sind Haustiere erlaubt (haustierfreundlich)?',
      'Wie lauten die zusätzlichen Vertragsbedingungen und Pflichten des Mieters?'
    ],
    ru: [
      'Какова ежемесячная арендная плата и каковы условия залога?',
      'Каков минимальный срок аренды и с какой даты квартира свободна для заселения?',
      'Каковы средние ежемесячные коммунальные расходы и тип отопления?',
      'Разрешено ли проживание с домашними животными?',
      'Каковы дополнительные условия договора и обязанности арендатора?'
    ]
  },
  sale: {
    sr: [
      'Kolika je prodajna cena i da li postoji mogućnost kupovine na kredit?',
      'Kolika je kvadratura i kakvo je stanje objekta (novogradnja, starogradnja, renoviran)?',
      'Da li je nekretnina uknjižena i kakvo je vlasništvo (1/1, suvlasništvo)?',
      'Da li su porezi i agencijska provizija uključeni u cenu ili su dodatni?',
      'Da li nekretnina ima pripadajući podrum, terasu ili garažno mesto?'
    ],
    en: [
      'What is the selling price and is mortgage purchase possible?',
      'What is the square footage and property condition (new build, old build, renovated)?',
      'Is the property registered and what is the ownership type (1/1, co-ownership)?',
      'Are taxes and agency commission included in the price or additional?',
      'Does the property include a basement, terrace, or garage space?'
    ],
    de: [
      'Wie hoch ist der Verkaufspreis und ist ein Kreditkauf möglich?',
      'Wie groß ist die Fläche und wie ist der Zustand des Objekts (Neubau, Altbau, renoviert)?',
      'Ist die Immobilie im Grundbuch eingetragen und wie ist die Eigentumsverhältnisse (1/1)?',
      'Sind Steuern und Maklerprovision im Preis inbegriffen oder zusätzlich?',
      'Verfügt die Immobilie über einen Keller, eine Terrasse oder einen Garagenplatz?'
    ],
    ru: [
      'Какова цена продажи и возможна ли покупка в ипотеку?',
      'Какова площадь и состояние объекта (новостройка, вторичное жилье, ремонт)?',
      'Зарегистрирована ли недвижимость в кадастре и каков тип собственности?',
      'Включены ли налоги и комиссия агентства в стоимость или оплачиваются отдельно?',
      'Есть ли у недвижимости подвал, терраса или парковочное место?'
    ]
  },
  booking: {
    sr: [
      'Kolika je cena po noćenju i koliki je minimalni boravak?',
      'Koliki je maksimalan broj gostiju (kapacitet) i kakva su pravila kuće?',
      'Koje je tačno vreme za check-in i check-out?',
      'Koliki je iznos takse za čišćenje po boravku?',
      'Da li je obezbeđen parking, Wi-Fi i kakva su pravila otkazivanja?'
    ],
    en: [
      'What is the price per night and what is the minimum stay?',
      'What is the maximum number of guests (capacity) and what are the house rules?',
      'What are the exact check-in and check-out times?',
      'What is the cleaning fee amount per stay?',
      'Is parking and Wi-Fi provided, and what are the cancellation policies?'
    ],
    de: [
      'Wie hoch ist der Preis pro Nacht und wie lang ist der Mindestaufenthalt?',
      'Was ist die maximale Gästeanzahl (Kapazität) und wie lauten die Hausregeln?',
      'Um wie viel Uhr ist Check-in und Check-out?',
      'Wie hoch ist die Reinigungsgebühr pro Aufenthalt?',
      'Sind Parkplätze und WLAN vorhanden und wie lauten die Stornierungsbedingungen?'
    ],
    ru: [
      'Какова стоимость за ночь и каков минимальный срок проживания?',
      'Какова максимальное количество гостей (вместимость) и каковы правила дома?',
      'Каково точное время заезда (check-in) и выезда (check-out)?',
      'Какова сумма платы за уборку за всё время проживания?',
      'Предоставляется ли парковка, Wi-Fi и каковы правила отмены бронирования?'
    ]
  }
};

const translations: Record<Language, Record<string, string>> = {
  sr: {
    startTour: '▶ Pokreni turu',
    welcome: 'Dobrodošli! Izaberite jezik i kliknite na dugme ispod da pokrenete interaktivnu turu.',
    loading: 'Učitavanje ture...',
    roomLoadingPrefix: 'Ulazimo u prostoriju: ',
    tourNotFound: 'Tura nije pronađena.',
    noRooms: 'Ova tura nema soba.',
    guideCompleted: 'Vodič završen',
    freeExplore: 'Slobodno razgledajte prostoriju ili pređite na drugu tačku, koristeći gornji pokretni meni ili plutajući naziv na slici.',
    targetRoom: '-- Izaberi sobu --',
    save: 'Sačuvaj Poziciju & Podatke',
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
    btnAbout: 'ℹ️ O stanu',
    btnFaq: '❓ Pitanja',
    btnContact: '📞 Kontakt',
    btnPlan: '🗺️ Skica',
    noPlan: 'Skica osnove trenutno nije dostupna za ovu nekretninu.',
    noLocation: 'Mapa lokacije trenutno nije dostupna za ovu nekretninu.',
    noAbout: 'Informacije trenutno nisu dostupne.',
    noFaq: 'Trenutno nema FAQ odgovora za ovu nekretninu.',
    contactTitle: 'Kontakt informacije',
    agentLabel: 'Agent:',
    agencyLabel: 'Agencija:',
    phoneLabel: 'Telefon:',
    emailLabel: 'Email:',
    callBtn: 'Pozovi',
    emailBtn: 'Pošalji Email',
    close: 'Zatvori',
    comingSoon: 'Odgovor uskoro...'
  },
  en: {
    startTour: '▶ Start Tour',
    welcome: 'Welcome! Select a language and click the button below to start the tour.',
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
    infoPoint: 'ℹ️ Info Point',
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
    noPlan: 'Floor plan is currently not available for this property.',
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
    comingSoon: 'Answer coming soon...'
  },
  de: {
    startTour: '▶ Tour Starten',
    welcome: 'Willkommen! Wählen Sie eine Sprache und klicken Sie unten, um die Tour zu starten.',
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
    infoPoint: 'ℹ️ Infopunkt',
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
    noPlan: 'Der Grundriss ist derzeit für diese Immobilie nicht verfügbar.',
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
    comingSoon: 'Antwort folgt...'
  },
  ru: {
    startTour: '▶ Начать тур',
    welcome: 'Добро пожаловать! Выберите язык и нажмите кнопку ниже, чтобы начать виртуальный тур.',
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
    btnAbout: 'ℹ️ О жилье',
    btnFaq: '❓ Вопросы',
    btnContact: '📞 Контакты',
    noPlan: 'План помещения временно недоступен для этого объекта.',
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
    comingSoon: 'Ответ скоро появится...'
  }
};

export default function TourPage() {
  const [hasMounted, setHasMounted] = useState(false);
  const isMountedRef = useRef(true);
  const roomSessionRef = useRef(0);

  const [tourStarted, setTourStarted] = useState(false);
  const [lang, setLang] = useState<Language>('sr');
  const [targetLanguages, setTargetLanguages] = useState<Language[]>(['sr', 'en', 'de', 'ru']);

  const langRef = useRef<Language>('sr');
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  const t = translations[lang];

  const params = useParams();
  const slug = params?.slug as string;

  const [tour, setTour] = useState<Tour | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomIdx, setRoomIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [roomLoading, setRoomLoading] = useState(false);
  const [error, setError] = useState('');

  const [pannellumReady, setPannellumReady] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const adminModeRef = useRef(false);
  const [aiLoading, setAiLoading] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null);
  const [isRoomTourFullyCompleted, setIsRoomTourFullyCompleted] = useState(false);
  const [isInfoboxManuallyClosed, setIsInfoboxManuallyClosed] = useState(false);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastAudioUrlRef = useRef<string | undefined>(undefined);
  const lastAudioTextRef = useRef<unknown | undefined>(undefined);
  const lastAudioTitleRef = useRef<unknown | undefined>(undefined);
  const lastAudioIndexRef = useRef<number | undefined>(undefined);
  const audioCurrentTimeRef = useRef<number>(0);

  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const guideCompleteTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [infoBoxData, setInfoBoxData] = useState<{ titleRaw?: unknown; textRaw: unknown; index?: number; audio_url?: string } | null>(null);

  const [pendingCoords, setPendingCoords] = useState<{ yaw: number; pitch: number } | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [hotspotType, setHotspotType] = useState<'navigation' | 'info' | 'establish'>('navigation');
  const [targetRoomId, setTargetRoomId] = useState<string | number>('');

  const [hotspotText, setHotspotText] = useState<string>('');
  const [hotspotTitle, setHotspotTitle] = useState<string>('');
  const [hotspotAudioUrl, setHotspotAudioUrl] = useState<string>('');

  const viewerRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const sequenceActiveRef = useRef<boolean>(false);
  const isInterruptedRef = useRef<boolean>(false);

  const tickerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const autoScrollPausedRef = useRef(false);

  const toggleTargetLanguage = (l: Language) => {
    setTargetLanguages((prev) =>
      prev.includes(l) ? prev.filter((langItem) => langItem !== l) : [...prev, l]
    );
  };

  const handleStartEditWaypoint = useCallback((index: number) => {
    const currentRoom = rooms[roomIdx];
    if (!currentRoom) return;
    const waypointsList = parseWaypoints(currentRoom.waypoints_i18n);
    const targetWp = waypointsList[index];
    if (!targetWp) return;

    setEditingIndex(index);
    setPendingCoords({ pitch: targetWp.pitch || 0, yaw: targetWp.yaw || 0 });

    if (viewerRef.current) {
      viewerRef.current.lookAt(targetWp.pitch || 0, targetWp.yaw || 0, 70, 1000);
    }

    const isNav = targetWp.type === 'navigation' || Boolean(targetWp.targetRoomId);
    setHotspotType(isNav ? 'navigation' : 'info');

    setHotspotText(getLocalizedText(targetWp.text_i18n, langRef.current));
    setHotspotTitle(getLocalizedText(targetWp.title_i18n, langRef.current));
    setHotspotAudioUrl(targetWp.audio_url || '');
    setTargetRoomId(targetWp.targetRoomId || '');
  }, [rooms, roomIdx]);

  const handleStartEditEstablish = () => {
    const currentRoom = rooms[roomIdx];
    if (!currentRoom) return;
    const est = parseEstablish(currentRoom.establish_i18n);

    setHotspotType('establish');
    setEditingIndex(null);

    const currentPitch = viewerRef.current ? Math.round(viewerRef.current.getPitch() * 10) / 10 : (est.pitch || 0);
    const currentYaw = viewerRef.current ? Math.round(normalizeYaw(viewerRef.current.getYaw()) * 10) / 10 : (est.fromYaw || 0);

    setPendingCoords({ pitch: currentPitch, yaw: currentYaw });
    setHotspotText(getLocalizedText(est.text_i18n, lang));
    setHotspotAudioUrl(est.audio_url || '');
  };

  const handleSaveWaypoint = async () => {
    if (!pendingCoords || !rooms[roomIdx]) return;
    const currentRoom = rooms[roomIdx];

    let finalPitch = pendingCoords.pitch;
    let finalYaw = pendingCoords.yaw;

    if (viewerRef.current) {
      finalPitch = Math.round(viewerRef.current.getPitch() * 10) / 10;
      finalYaw = Math.round(normalizeYaw(viewerRef.current.getYaw()) * 10) / 10;
    }

    if (hotspotType === 'establish') {
      const existingEst = parseEstablish(currentRoom.establish_i18n);
      const updatedEstablish: EstablishData = {
        ...existingEst,
        pitch: finalPitch,
        fromYaw: finalYaw,
        audio_url: hotspotAudioUrl,
        text_i18n: buildI18nObject(hotspotText, existingEst.text_i18n, lang)
      };

      const { error: err } = await supabase
        .from('rooms')
        .update({ establish_i18n: updatedEstablish })
        .eq('id', currentRoom.id);

      if (!err && isMountedRef.current) {
        const updatedRooms = [...rooms];
        updatedRooms[roomIdx].establish_i18n = updatedEstablish;
        setRooms(updatedRooms);
        setPendingCoords(null);
      }
      return;
    }

    const currentWaypoints = parseWaypoints(currentRoom.waypoints_i18n);

    let existingWpText: unknown = undefined;
    let existingWpTitle: unknown = undefined;
    if (editingIndex !== null && currentWaypoints[editingIndex]) {
      existingWpText = currentWaypoints[editingIndex].text_i18n;
      existingWpTitle = currentWaypoints[editingIndex].title_i18n;
    }

    const newWaypoint: Waypoint = {
      pitch: finalPitch,
      yaw: finalYaw,
      type: hotspotType === 'navigation' ? 'navigation' : 'info',
      audio_url: hotspotType === 'info' ? hotspotAudioUrl : undefined,
      text_i18n: hotspotType === 'info' ? buildI18nObject(hotspotText, existingWpText, lang) : undefined,
      title_i18n: hotspotType === 'info' ? buildI18nObject(hotspotTitle, existingWpTitle, lang) : undefined,
      targetRoomId: hotspotType === 'navigation' ? targetRoomId : undefined
    };

    let updatedList: Waypoint[] = [];
    if (editingIndex !== null) {
      updatedList = [...currentWaypoints];
      updatedList[editingIndex] = newWaypoint;
    } else {
      updatedList = [...currentWaypoints, newWaypoint];
    }

    const { error: err } = await supabase
      .from('rooms')
      .update({ waypoints_i18n: updatedList })
      .eq('id', currentRoom.id);

    if (!err && isMountedRef.current) {
      const updatedRooms = [...rooms];
      updatedRooms[roomIdx].waypoints_i18n = updatedList;
      setRooms(updatedRooms);
      setPendingCoords(null);
    }
  };

  const handleDeleteWaypoint = async () => {
    if (editingIndex === null || !rooms[roomIdx]) return;
    const currentRoom = rooms[roomIdx];
    const currentWaypoints = parseWaypoints(currentRoom.waypoints_i18n);

    const updatedList = currentWaypoints.filter((_, idx) => idx !== editingIndex);

    const { error: err } = await supabase
      .from('rooms')
      .update({ waypoints_i18n: updatedList })
      .eq('id', currentRoom.id);

    if (!err && isMountedRef.current) {
      const updatedRooms = [...rooms];
      updatedRooms[roomIdx].waypoints_i18n = updatedList;
      setRooms(updatedRooms);
      setPendingCoords(null);
    }
  };

  const stopCurrentAnimation = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (activeAudioRef.current) {
      audioCurrentTimeRef.current = activeAudioRef.current.currentTime;
      activeAudioRef.current.pause();
      activeAudioRef.current.onended = null;
      activeAudioRef.current.onerror = null;
      activeAudioRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (guideCompleteTimerRef.current) {
      clearTimeout(guideCompleteTimerRef.current);
      guideCompleteTimerRef.current = null;
    }
  }, []);

  const playAudioFileWithCompletion = useCallback((
    audioUrl?: string,
    textFallback?: unknown,
    title?: unknown,
    index?: number,
    startAt: number = 0
  ): Promise<void> => {
    return new Promise((resolve) => {
      stopAudio();

      if (!isMountedRef.current) return resolve();

      lastAudioUrlRef.current = audioUrl;
      lastAudioTextRef.current = textFallback;
      lastAudioTitleRef.current = title;
      lastAudioIndexRef.current = index;

      setInfoBoxData({ titleRaw: title, textRaw: textFallback, index, audio_url: audioUrl });

      const resolvedText = getLocalizedText(textFallback, langRef.current);

      if (isMutedRef.current || !audioUrl) {
        const readTime = Math.max(3000, resolvedText.length * 50);
        const timer = setTimeout(() => {
          if (isMountedRef.current) resolve();
        }, readTime);
        hideTimerRef.current = timer;
        return;
      }

      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;

      audio.onloadedmetadata = () => {
        if (!isMountedRef.current) return;
        if (startAt > 0 && startAt < audio.duration) {
          audio.currentTime = startAt;
        }
      };

      audio.onended = () => {
        activeAudioRef.current = null;
        audioCurrentTimeRef.current = 0;
        if (isMountedRef.current) resolve();
      };

      audio.onerror = () => {
        activeAudioRef.current = null;
        if (isMountedRef.current) resolve();
      };

      audio.play().catch(() => {
        activeAudioRef.current = null;
        if (isMountedRef.current) resolve();
      });
    });
  }, [stopAudio]);

  const changeRoomById = useCallback((id: string | number) => {
    roomSessionRef.current += 1;
    sequenceActiveRef.current = false;
    isInterruptedRef.current = true;
    audioCurrentTimeRef.current = 0;
    setIsRoomTourFullyCompleted(false);
    setIsInfoboxManuallyClosed(false);
    stopCurrentAnimation();
    stopAudio();

    const foundIndex = rooms.findIndex(r => r.id == id);
    if (foundIndex !== -1) {
      setRoomLoading(true);
      setRoomIdx(foundIndex);
      setInfoBoxData(null);
    }
  }, [rooms, stopAudio, stopCurrentAnimation]);

  const handleAutoPopulateRoom = async () => {
    const currentRoom = rooms[roomIdx];
    if (!currentRoom || !currentRoom.panorama_url) {
      alert('Nema dostupne panorame za ovu sobu.');
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch('/api/process-form/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: currentRoom.id,
          panoramaUrl: currentRoom.panorama_url,
          target_languages: targetLanguages,
        }),
      });

      const result = await res.json();
      if (result.success) {
        alert('Soba je uspešno automatski popunjena pomoću AI-ja!');
        window.location.reload();
      } else {
        alert('Greška pri obradi: ' + (result.error || 'Nepoznata greška'));
      }
    } catch (err) {
      console.error('AI Error:', err);
      alert('Došlo je do greške prilikom pozivanja AI servisa.');
    } finally {
      setAiLoading(false);
    }
  };

  const changeLanguage = (newLang: Language) => {
    setLang(newLang);
    langRef.current = newLang;

    if (viewerRef.current && rooms[roomIdx]) {
      const currentYaw = viewerRef.current.getYaw();
      const currentPitch = viewerRef.current.getPitch();
      const currentHfov = viewerRef.current.getHfov();

      const currentRoom = rooms[roomIdx];
      const waypointsList = parseWaypoints(currentRoom.waypoints_i18n);

      waypointsList.forEach((wp, index) => {
        try {
          viewerRef.current.removeHotSpot(`hotspot-${index}`);
        } catch {}

        const isNav = wp.type === 'navigation' || Boolean(wp.targetRoomId);
        let tooltipText = getLocalizedText(wp.title_i18n, newLang);
        if (!tooltipText && !isNav) {
          tooltipText = getLocalizedText(wp.text_i18n, newLang);
          if (tooltipText.length > 40) tooltipText = tooltipText.substring(0, 40) + '...';
        }
        if (isNav && !tooltipText && wp.targetRoomId) {
          const targetRoomObj = rooms.find(r => r.id == wp.targetRoomId);
          if (targetRoomObj) tooltipText = getLocalizedText(targetRoomObj.title_i18n, newLang);
        }

        viewerRef.current.addHotSpot({
          id: `hotspot-${index}`,
          pitch: wp.pitch || 0,
          yaw: wp.yaw || 0,
          createTooltipFunc: (hotSpotDiv: HTMLDivElement) => {
            hotSpotDiv.classList.add(isNav ? 'custom-nav-hotspot' : 'custom-info-hotspot');
            hotSpotDiv.style.backgroundColor = isNav ? 'rgba(7, 9, 10, 0.68)' : 'rgba(4, 26, 37, 0.73)';
            hotSpotDiv.style.border = '1.5px solid rgba(248, 244, 244, 0.9)';
            hotSpotDiv.style.borderRadius = isNav ? '50px' : '50%';
            hotSpotDiv.style.color = '#fff';
            hotSpotDiv.style.display = 'flex';
            hotSpotDiv.style.alignItems = 'center';
            hotSpotDiv.style.justifyContent = 'center';
            hotSpotDiv.style.cursor = 'pointer';
            hotSpotDiv.style.padding = isNav ? '3px 6px' : '0.5px';
            hotSpotDiv.style.width = isNav ? 'auto' : '22px';
            hotSpotDiv.style.height = isNav ? 'auto' : '22px';
            hotSpotDiv.style.fontWeight = 'bold';
            hotSpotDiv.style.fontSize = isNav ? '10px' : '15px';
            hotSpotDiv.style.boxShadow = '8px 10px 20px rgba(0, 0, 0, 0.53)';
            hotSpotDiv.innerHTML = isNav ? `${tooltipText}` : 'ℹ';
          },
          text: tooltipText,
          clickHandlerFunc: () => {
            if (adminModeRef.current) {
              handleStartEditWaypoint(index);
            } else if (isNav && wp.targetRoomId) {
              changeRoomById(wp.targetRoomId);
            } else if (!isNav) {
              isInterruptedRef.current = true;
              stopCurrentAnimation();
              audioCurrentTimeRef.current = 0;
              if (viewerRef.current) viewerRef.current.setHfov(48);
              playAudioFileWithCompletion(wp.audio_url, wp.text_i18n, wp.title_i18n, index, 0);
            }
          }
        });
      });

      viewerRef.current.setYaw(currentYaw);
      viewerRef.current.setPitch(currentPitch);
      viewerRef.current.setHfov(currentHfov);
    }
  };

  const isLanguageAvailable = (l: Language): boolean => {
    if (l === 'sr') return true;

    const checkI18n = (data: any): boolean => {
      if (!data) return false;
      if (typeof data === 'object') return Boolean(data[l]);
      if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          return Boolean(parsed && parsed[l]);
        } catch {
          return false;
        }
      }
      return false;
    };

    if (tour) {
      if (
        checkI18n(tour.title_i18n) || 
        checkI18n(tour.about_text_i18n) ||
        checkI18n(tour.faq_1_i18n) ||
        checkI18n(tour.faq_2_i18n) ||
        checkI18n(tour.faq_3_i18n) ||
        checkI18n(tour.faq_4_i18n) ||
        checkI18n(tour.faq_5_i18n)
      ) return true;
    }

    if (rooms && rooms.length > 0) {
      for (const room of rooms) {
        if (checkI18n(room.title_i18n)) return true;
        const waypoints = parseWaypoints(room.waypoints_i18n);
        for (const wp of waypoints) {
          if (checkI18n(wp.text_i18n) || checkI18n(wp.title_i18n)) return true;
        }
      }
    }

    return false;
  };

  useEffect(() => {
    isMountedRef.current = true;
    setHasMounted(true);
    const urlParams = new URLSearchParams(window.location.search);

    const isAdmin = urlParams.get('admin') === 'mojtajnikljuc';
    setAdminMode(isAdmin);
    adminModeRef.current = isAdmin;

    if (isAdmin) {
      localStorage.setItem('tour_admin', 'true');
    } else {
      localStorage.removeItem('tour_admin');
    }

    return () => {
      isMountedRef.current = false;
      stopAudio();
      stopCurrentAnimation();
      if (viewerRef.current) {
        try { viewerRef.current.destroy(); } catch {}
        viewerRef.current = null;
      }
    };
  }, [stopAudio, stopCurrentAnimation]);

  useEffect(() => {
    if (!tourStarted) return;
    const ticker = tickerRef.current;
    if (!ticker) return;

    let tickerAnimationId: number;
    const step = () => {
      if (ticker && !autoScrollPausedRef.current && !isDraggingRef.current && isMountedRef.current && !document.hidden) {
        ticker.scrollLeft += 0.5;
        if (ticker.scrollLeft >= ticker.scrollWidth - ticker.clientWidth) {
          ticker.scrollLeft = 0;
        }
      }
      tickerAnimationId = requestAnimationFrame(step);
    };
    tickerAnimationId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(tickerAnimationId);
  }, [tourStarted]);

  const toggleMute = () => {
    const nextMuteState = !isMutedRef.current;
    isMutedRef.current = nextMuteState;
    setIsMuted(nextMuteState);

    if (nextMuteState) {
      stopAudio();
    } else if (lastAudioUrlRef.current) {
      playAudioFileWithCompletion(
        lastAudioUrlRef.current,
        lastAudioTextRef.current,
        lastAudioTitleRef.current,
        lastAudioIndexRef.current,
        audioCurrentTimeRef.current
      );
    }
  };

  useEffect(() => {
    if (!hasMounted) return;
    if ((window as any).pannellum) { setPannellumReady(true); return; }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
    script.onload = () => setPannellumReady(true);
    document.body.appendChild(script);

    return () => {
      stopAudio();
      stopCurrentAnimation();
    };
  }, [hasMounted, stopAudio, stopCurrentAnimation]);

  useEffect(() => {
    if (!slug || !hasMounted) return;
    async function load() {
      setLoading(true);
      const { data: tourData } = await supabase.from('tours').select('*').eq('slug', slug).single();
      const { data: roomRows } = await supabase.from('rooms').select('*').eq('tour_slug', slug).order('order_index', { ascending: true });

      if (!isMountedRef.current) return;

      if (!tourData) setError(translations[langRef.current].tourNotFound);
      else setTour(tourData as Tour);

      if (!roomRows || roomRows.length === 0) setError(translations[langRef.current].noRooms);
      else setRooms(roomRows as Room[]);

      setLoading(false);
    }
    load();
  }, [slug, hasMounted]);

  useEffect(() => {
    if (!tourStarted || rooms.length === 0 || !pannellumReady || !hasMounted) return;

    const currentSession = ++roomSessionRef.current;
    const currentRoom = rooms[roomIdx];
    if (!currentRoom?.panorama_url) return;

    setRoomLoading(true);
    sequenceActiveRef.current = true;
    isInterruptedRef.current = false;
    setIsInfoboxManuallyClosed(false);
    setInfoBoxData(null);

    if (viewerRef.current) {
      try { viewerRef.current.destroy(); } catch {}
      viewerRef.current = null;
    }
    const panoramaContainer = document.getElementById('panorama');
    if (panoramaContainer) panoramaContainer.innerHTML = '';

    const waypointsList = parseWaypoints(currentRoom.waypoints_i18n);
    const establishData = parseEstablish(currentRoom.establish_i18n);

    const formattedHotspots = waypointsList.map((wp, index) => {
      const isNav = wp.type === 'navigation' || Boolean(wp.targetRoomId);

      let tooltipText = getLocalizedText(wp.title_i18n, langRef.current);
      if (!tooltipText && !isNav) {
         tooltipText = getLocalizedText(wp.text_i18n, langRef.current);
         if (tooltipText.length > 40) tooltipText = tooltipText.substring(0, 40) + '...';
      }
      if (isNav && !tooltipText && wp.targetRoomId) {
        const targetRoomObj = rooms.find(r => r.id == wp.targetRoomId);
        if (targetRoomObj) tooltipText = getLocalizedText(targetRoomObj.title_i18n, langRef.current);
      }

      return {
        id: `hotspot-${index}`,
        pitch: wp.pitch || 0,
        yaw: wp.yaw || 0,
        createTooltipFunc: (hotSpotDiv: HTMLDivElement) => {
          hotSpotDiv.classList.add(isNav ? 'custom-nav-hotspot' : 'custom-info-hotspot');
          hotSpotDiv.style.backgroundColor = isNav ? 'rgba(7, 9, 10, 0.68)' : 'rgba(4, 26, 37, 0.73)';
          hotSpotDiv.style.border = '1.5px solid rgba(248, 244, 244, 0.9)';
          hotSpotDiv.style.borderRadius = isNav ? '50px' : '50%';
          hotSpotDiv.style.color = '#fff';
          hotSpotDiv.style.display = 'flex';
          hotSpotDiv.style.alignItems = 'center';
          hotSpotDiv.style.justifyContent = 'center';
          hotSpotDiv.style.cursor = 'pointer';
          hotSpotDiv.style.padding = isNav ? '3px 6px' : '0.5px';
          hotSpotDiv.style.width = isNav ? 'auto' : '22px';
          hotSpotDiv.style.height = isNav ? 'auto' : '22px';
          hotSpotDiv.style.fontWeight = 'bold';
          hotSpotDiv.style.fontSize = isNav ? '10px' : '15px';
          hotSpotDiv.style.boxShadow = '8px 10px 20px rgba(0, 0, 0, 0.53)';
          hotSpotDiv.innerHTML = isNav ? `${tooltipText}` : 'ℹ';
        },
        text: tooltipText,
        clickHandlerFunc: () => {
          if (adminModeRef.current) {
            handleStartEditWaypoint(index);
          } else if (isNav && wp.targetRoomId) {
            changeRoomById(wp.targetRoomId);
          } else if (!isNav) {
            isInterruptedRef.current = true;
            stopCurrentAnimation();
            audioCurrentTimeRef.current = 0;
            if (viewerRef.current) viewerRef.current.setHfov(48);
            playAudioFileWithCompletion(wp.audio_url, wp.text_i18n, wp.title_i18n, index, 0);
          }
        }
      };
    });

    const targetEstablishYaw = normalizeYaw(establishData.fromYaw ?? 0);
    const targetEstablishPitch = establishData.pitch ?? 0;

    const v = (window as any).pannellum.viewer('panorama', {
      type: 'equirectangular',
      panorama: currentRoom.panorama_url,
      autoLoad: true,
      showControls: false,
      hfov: 65,
      minHfov: 30,
      maxHfov: 110,
      yaw: targetEstablishYaw,
      pitch: targetEstablishPitch,
      autoRotate: 0,
      hotSpots: formattedHotspots,
      loadingHtml: ''
    });
    viewerRef.current = v;

    const infoPoints = waypointsList
      .map((wp, i) => ({ wp, i }))
      .filter(item => item.wp.type === 'info' || (!item.wp.type && !item.wp.targetRoomId));

    const startInfiniteGlide = () => {
      if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
      if (!sequenceActiveRef.current || isInterruptedRef.current) return;
      stopCurrentAnimation();
      setInfoBoxData({
        titleRaw: translations[langRef.current].guideCompleted,
        textRaw: translations[langRef.current].freeExplore
      });

      if (guideCompleteTimerRef.current) clearTimeout(guideCompleteTimerRef.current);
      guideCompleteTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current || currentSession !== roomSessionRef.current) return;
        setInfoBoxData(null);
        setIsRoomTourFullyCompleted(true);
      }, 7000);

      if (viewerRef.current) viewerRef.current.setHfov(65);

      let lastTime = performance.now();
      const degreesPerMs = 360 / 25000;

      const animateGlide = (now: number) => {
        if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
        if (!sequenceActiveRef.current || isInterruptedRef.current) return;
        const delta = now - lastTime;
        lastTime = now;
        if (viewerRef.current) {
          const currentYaw = viewerRef.current.getYaw();
          viewerRef.current.setYaw(currentYaw + degreesPerMs * delta);
          viewerRef.current.setPitch(targetEstablishPitch);
        }
        animFrameRef.current = requestAnimationFrame(animateGlide);
      };
      animFrameRef.current = requestAnimationFrame(animateGlide);
    };

    v.on('load', async () => {
      if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
      setRoomLoading(false);

      if (!sequenceActiveRef.current || isInterruptedRef.current) return;

      const introTextRaw = establishData.text_i18n ||
`${translations[langRef.current].welcomePrefix}${getLocalizedText(currentRoom.title_i18n, langRef.current)}`;
      const introAudioUrl = establishData.audio_url;

      const rotatePromise = new Promise<void>((resolve) => {
        const durationPhase1 = 15000;
        const totalDegrees = 240;
        const speed = totalDegrees / (durationPhase1 / 1000);

        if (currentSession !== roomSessionRef.current || !isMountedRef.current) return resolve();
        if (!sequenceActiveRef.current || isInterruptedRef.current) return resolve();

        if (viewerRef.current) {
          viewerRef.current.setHfov(65);
          viewerRef.current.setYaw(targetEstablishYaw);
          viewerRef.current.setPitch(targetEstablishPitch);
          viewerRef.current.startAutoRotate(speed, targetEstablishPitch);
        }

        const startTime = performance.now();
        const checkCompletion = (now: number) => {
          if (currentSession !== roomSessionRef.current || !isMountedRef.current) {
            if (viewerRef.current) viewerRef.current.stopAutoRotate();
            return resolve();
          }
          if (!sequenceActiveRef.current || isInterruptedRef.current) {
            if (viewerRef.current) viewerRef.current.stopAutoRotate();
            return resolve();
          }
          const elapsed = now - startTime;
          if (elapsed < durationPhase1) {
            animFrameRef.current = requestAnimationFrame(checkCompletion);
          } else {
            if (viewerRef.current) viewerRef.current.stopAutoRotate();
            resolve();
          }
        };
        animFrameRef.current = requestAnimationFrame(checkCompletion);
      });

      await Promise.all([
        rotatePromise,
        playAudioFileWithCompletion(introAudioUrl, introTextRaw, currentRoom.title_i18n, undefined, 0)
      ]);

      if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
      if (!sequenceActiveRef.current || isInterruptedRef.current) return;

      const runInfoSequencePhase2 = async (index: number) => {
        if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
        if (!sequenceActiveRef.current || isInterruptedRef.current || !viewerRef.current) return;
        if (index >= infoPoints.length) {
          startInfiniteGlide();
          return;
        }

        const item = infoPoints[index];
        const currentYaw = normalizeYaw(viewerRef.current.getYaw());
        const targetYaw = getShortestTargetYaw(currentYaw, item.wp.yaw);
        const targetPitch = item.wp.pitch ?? 0;

        viewerRef.current.lookAt(targetPitch, targetYaw, 50, 2200);

        await new Promise(r => setTimeout(r, 2300));
        if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
        if (!sequenceActiveRef.current || isInterruptedRef.current) return;

        await playAudioFileWithCompletion(item.wp.audio_url, item.wp.text_i18n, item.wp.title_i18n, item.i, 0);
        if (currentSession !== roomSessionRef.current || !isMountedRef.current) return;
        if (!sequenceActiveRef.current || isInterruptedRef.current) return;

        await new Promise(r => setTimeout(r, 1000));
        runInfoSequencePhase2(index + 1);
      };

      if (infoPoints.length > 0) {
        runInfoSequencePhase2(0);
      } else {
        startInfiniteGlide();
      }
    });

    const handleDblClick = () => {
      if (adminModeRef.current && viewerRef.current) {
        const currentPitch = Math.round(viewerRef.current.getPitch() * 10) / 10;
        const currentYaw = Math.round(normalizeYaw(viewerRef.current.getYaw()) * 10) / 10;
        setPendingCoords({ pitch: currentPitch, yaw: currentYaw });
        setEditingIndex(null);
        setHotspotText('');
        setHotspotTitle('');
        setHotspotAudioUrl('');
        setTargetRoomId('');
        setHotspotType('navigation');
      }
    };

    panoramaContainer?.addEventListener('dblclick', handleDblClick);

    return () => {
      sequenceActiveRef.current = false;
      isInterruptedRef.current = true;
      panoramaContainer?.removeEventListener('dblclick', handleDblClick);
      stopCurrentAnimation();
      stopAudio();
      if (viewerRef.current) {
        try { viewerRef.current.destroy(); } catch {}
        viewerRef.current = null;
      }
    };
  }, [tourStarted, roomIdx, pannellumReady, hasMounted, changeRoomById, stopCurrentAnimation, stopAudio, handleStartEditWaypoint, playAudioFileWithCompletion]);

  if (!hasMounted || loading) return <Centered>{t.loading}</Centered>;
  if (error) return <Centered>{error}</Centered>;

  const currentRoom = rooms[roomIdx];
  const waypointsList = parseWaypoints(currentRoom?.waypoints_i18n);

  let displayedInfoTitle = '';
  let displayedInfoText = '';
  if (infoBoxData) {
    displayedInfoTitle = getLocalizedText(infoBoxData.titleRaw, lang);
    if (!displayedInfoTitle && infoBoxData.index === undefined) {
      displayedInfoTitle = getLocalizedText(currentRoom?.title_i18n, lang);
    }
    displayedInfoText = getLocalizedText(infoBoxData.textRaw, lang);
  }

  const currentCategory = tour?.category || 'rent';
  const questionsList = categoryQuestions[currentCategory]?.[lang] || categoryQuestions['rent']['sr'];

  const faqAnswersList = [
    getLocalizedText(tour?.faq_1_i18n, lang),
    getLocalizedText(tour?.faq_2_i18n, lang),
    getLocalizedText(tour?.faq_3_i18n, lang),
    getLocalizedText(tour?.faq_4_i18n, lang),
    getLocalizedText(tour?.faq_5_i18n, lang)
  ];

  const faqList = questionsList.map((q, idx) => ({
    question: q,
    answer: faqAnswersList[idx] || ''
  }));

  const aboutText = getLocalizedText(tour?.about_text_i18n, lang);

  const fullTourTitle = getLocalizedText(tour?.title_i18n, lang);
  const currentRoomTitle = getLocalizedText(currentRoom?.title_i18n, lang) || `Soba ${roomIdx + 1}`;

  const availableLanguages: Language[] = ['sr', 'en', 'de', 'ru'];

  return (
    <main style={{ position: 'relative', width: '100vw', height: '100dvh', backgroundColor: '#000', overflow: 'hidden' }}>
      <style>{`
        .pnlm-load-box {
          display: none !important;
        }
      `}</style>

      {!tourStarted && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50, backgroundColor: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
          <div style={{
            display: 'flex',
            gap: '6px',
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '4px 8px',
            marginBottom: '20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}>
            {availableLanguages
              .filter((l) => isLanguageAvailable(l))
              .map((l) => (
                <button
                  key={l}
                  onClick={() => changeLanguage(l)}
                  style={{
                    background: lang === l ? '#0284c7' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: lang === l ? 'bold' : 'normal',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  {l.toUpperCase()}
                </button>
              ))}
          </div>

          <h1 style={{ color: '#fff', fontSize: '24px', marginBottom: '10px' }}>{fullTourTitle}</h1>
          <p style={{ color: '#aaa', fontSize: '14px', maxWidth: '400px', marginBottom: '30px' }}>{t.welcome}</p>
          <button onClick={() => setTourStarted(true)} style={{ padding: '12px 28px', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '30px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)' }}>
            {t.startTour}
          </button>
        </div>
      )}

      {tourStarted && (
        <div style={{
          position: 'absolute',
          top: '4px',
          left: '4px',
          right: '4px',
          zIndex: 35,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          pointerEvents: 'none'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '6px 12px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              pointerEvents: 'auto',
              maxWidth: '55%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }}>
              {fullTourTitle}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '3px 6px',
              pointerEvents: 'auto',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }}>
              <button
                onClick={toggleMute}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '3px 4px'
                }}
                title={isMuted ? 'Uključi zvuk' : 'Isključi zvuk'}
              >
                {isMuted ? '🔇' : '🔊'}
              </button>

              <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 2px' }} />

              {availableLanguages
                .filter((l) => isLanguageAvailable(l))
                .map((l) => (
                  <button
                    key={l}
                    onClick={() => changeLanguage(l)}
                    style={{
                      background: lang === l ? '#0284c7' : 'transparent',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '3px 6px',
                      fontSize: '11px',
                      fontWeight: lang === l ? 'bold' : 'normal',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
            </div>
          </div>

          <div
            ref={tickerRef}
            onMouseEnter={() => { autoScrollPausedRef.current = true; }}
            onMouseLeave={() => { autoScrollPausedRef.current = false; isDraggingRef.current = false; }}
            onMouseDown={(e) => {
              isDraggingRef.current = true;
              autoScrollPausedRef.current = true;
              startXRef.current = e.pageX - tickerRef.current!.offsetLeft;
              scrollLeftRef.current = tickerRef.current!.scrollLeft;
            }}
            onMouseMove={(e) => {
              if (!isDraggingRef.current) return;
              e.preventDefault();
              const x = e.pageX - tickerRef.current!.offsetLeft;
              const walk = (x - startXRef.current) * 2;
              tickerRef.current!.scrollLeft = scrollLeftRef.current - walk;
            }}
            onMouseUp={() => { isDraggingRef.current = false; }}
            onTouchStart={(e) => {
              isDraggingRef.current = true;
              autoScrollPausedRef.current = true;
              startXRef.current = e.touches[0].pageX - tickerRef.current!.offsetLeft;
              scrollLeftRef.current = tickerRef.current!.scrollLeft;
            }}
            onTouchMove={(e) => {
              if (!isDraggingRef.current) return;
              const x = e.touches[0].pageX - tickerRef.current!.offsetLeft;
              const walk = (x - startXRef.current) * 2;
              tickerRef.current!.scrollLeft = scrollLeftRef.current - walk;
            }}
            onTouchEnd={() => { isDraggingRef.current = false; autoScrollPausedRef.current = false; }}
            style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              maxWidth: '100%',
              padding: '2px 0',
              pointerEvents: 'auto',
              scrollbarWidth: 'none',
              cursor: 'grab',
              whiteSpace: 'nowrap'
            }}
          >
            {rooms.map((room, idx) => (
              <button
                key={room.id}
                onClick={() => changeRoomById(room.id)}
                style={{
                  backgroundColor: idx === roomIdx ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(8px)',
                  color: idx === roomIdx ? '#000000' : '#ffffff',
                  border: idx === roomIdx ? '1px solid rgba(0, 0, 0, 0.3)' : '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: idx === roomIdx ? 600 : 400,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  flexShrink: 0,
                  userSelect: 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                🚪 {getLocalizedText(room.title_i18n, lang) || `Soba ${idx + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}

      <div id="panorama" style={{ width: '100%', height: '100%' }} />

      {tourStarted && !pendingCoords && (isRoomTourFullyCompleted || isInfoboxManuallyClosed) && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 35,
          display: 'flex',
          gap: '5px',
          width: '96%',
          maxWidth: '520px',
          justifyContent: 'center'
        }}>
          <button onClick={() => setActiveModal('faq')} style={{ ...btnStyle, flex: 1, textAlign: 'center', backgroundColor: activeModal === 'faq' ? '#0284c7' : 'rgba(15, 23, 42, 0.9)', color: '#fff', padding: '10px 2px', fontSize: '11px' }}>
            {t.btnFaq}
          </button>
          <button onClick={() => setActiveModal('location')} style={{ ...btnStyle, flex: 1, textAlign: 'center', backgroundColor: activeModal === 'location' ? '#0284c7' : 'rgba(15, 23, 42, 0.9)', color: '#fff', padding: '10px 2px', fontSize: '11px' }}>
            {t.btnLocation}
          </button>
          <button onClick={() => setActiveModal('about')} style={{ ...btnStyle, flex: 1, textAlign: 'center', backgroundColor: activeModal === 'about' ? '#0284c7' : 'rgba(15, 23, 42, 0.9)', color: '#fff', padding: '10px 2px', fontSize: '11px' }}>
            {t.btnAbout}
          </button>
          <button onClick={() => setActiveModal('plan')} style={{ ...btnStyle, flex: 1, textAlign: 'center', backgroundColor: activeModal === 'plan' ? '#0284c7' : 'rgba(15, 23, 42, 0.9)', color: '#fff', padding: '10px 2px', fontSize: '11px' }}>
            {t.btnPlan}
          </button>
          <button onClick={() => setActiveModal('contact')} style={{ ...btnStyle, flex: 1, textAlign: 'center', backgroundColor: activeModal === 'contact' ? '#0284c7' : 'rgba(15, 23, 42, 0.9)', color: '#fff', padding: '10px 2px', fontSize: '11px' }}>
            {t.btnContact}
          </button>
        </div>
      )}

      {tourStarted && adminMode && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ position: 'absolute', width: '28px', height: '2px', backgroundColor: '#38bdf8', boxShadow: '0 0 4px rgba(0,0,0,0.8)' }} />
          <div style={{ position: 'absolute', width: '2px', height: '28px', backgroundColor: '#38bdf8', boxShadow: '0 0 4px rgba(0,0,0,0.8)' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffffff', border: '2px solid #38bdf8' }} />
        </div>
      )}

      {roomLoading && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px', padding: '20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#38bdf8', borderRadius: '50%', animation: 'pulseDot 1.4s infinite ease-in-out both', animationDelay: '-0.32s' }} />
            <div style={{ width: '12px', height: '12px', backgroundColor: '#38bdf8', borderRadius: '50%', animation: 'pulseDot 1.4s infinite ease-in-out both', animationDelay: '-0.16s' }} />
            <div style={{ width: '12px', height: '12px', backgroundColor: '#38bdf8', borderRadius: '50%', animation: 'pulseDot 1.4s infinite ease-in-out both' }} />
          </div>
          <style>{`
            @keyframes pulseDot {
              0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
              40% { transform: scale(1.0); opacity: 1; }
            }
          `}</style>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '450px' }}>
            <div style={{ color: '#fff', fontSize: '15px', fontWeight: 600, letterSpacing: '0.5px' }}>
              {fullTourTitle}
            </div>
            <div style={{ color: '#38bdf8', fontSize: '13px', letterSpacing: '0.5px' }}>
              {t.roomLoadingPrefix}<b style={{ color: '#fff' }}>{currentRoomTitle}</b>
            </div>
          </div>
        </div>
      )}

      {infoBoxData && !pendingCoords && !activeModal && (
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30,
          width: '94%',
          maxWidth: '450px',
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '16px',
          padding: '12px 14px',
          color: '#fff',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
        }}>
          <button
            onClick={() => {
              stopAudio();
              setInfoBoxData(null);
              setIsInfoboxManuallyClosed(true);
            }}
            style={{
              position: 'absolute',
              top: '8px',
              right: '10px',
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              padding: '2px 6px',
              lineHeight: '1',
              borderRadius: '4px',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
            title={t.close}
          >
            ×
          </button>

          {displayedInfoTitle && (
            <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#38bdf8', paddingRight: '20px' }}>
              {displayedInfoTitle}
            </h3>
          )}
          <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.35', color: '#e2e8f0', paddingRight: '10px' }}>
            {displayedInfoText}
          </p>
        </div>
      )}

      {hasMounted && activeModal && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 60, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '20px', width: '100%', maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <h2 style={{ color: '#fff', fontSize: '16px', margin: 0 }}>
                {activeModal === 'plan' && t.btnPlan}
                {activeModal === 'location' && t.btnLocation}
                {activeModal === 'about' && t.btnAbout}
                {activeModal === 'faq' && t.btnFaq}
                {activeModal === 'contact' && t.btnContact}
              </h2>
              <button onClick={() => { setActiveModal(null); setSelectedFaq(null); }} style={{ ...btnStyle, backgroundColor: '#dc2626', color: '#fff', borderColor: '#ef4444', padding: '6px 12px' }}>
                {t.close}
              </button>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', flex: 1, color: '#e2e8f0', fontSize: '13px' }}>
              {activeModal === 'plan' && (
                tour?.floorplan_url ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <img src={tour.floorplan_url} alt="Floorplan" style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '12px' }} />
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: '#94a3b8' }}>{t.noPlan}</p>
                )
              )}

              {activeModal === 'location' && (
                tour?.location_map_url ? (
                  <div style={{ width: '100%', height: '350px', borderRadius: '12px', overflow: 'hidden' }}>
                    <iframe src={tour.location_map_url} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: '#94a3b8' }}>{t.noLocation}</p>
                )
              )}

              {activeModal === 'about' && (
                aboutText ? (
                  <p style={{ margin: 0, lineHeight: '1.5', color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>{aboutText}</p>
                ) : (
                  <p style={{ textAlign: 'center', color: '#94a3b8' }}>{t.noAbout}</p>
                )
              )}

              {activeModal === 'faq' && (
                faqList.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {faqList.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedFaq(index)}
                        style={{
                          textAlign: 'left',
                          backgroundColor: 'rgba(30, 41, 59, 0.7)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '10px',
                          padding: '12px 14px',
                          color: '#fef08a',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          width: '100%'
                        }}
                      >
                        {item.question}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: '#94a3b8' }}>{t.noFaq}</p>
                )
              )}

              {activeModal === 'contact' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '6px' }}>
                  {tour?.agent_name && (
                    <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.7)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#94a3b8' }}>{t.agentLabel}</p>
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>{tour.agent_name}</p>
                    </div>
                  )}

                  {tour?.agent_phone && (
                    <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.7)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#94a3b8' }}>{t.phoneLabel}</p>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#fff' }}>{tour.agent_phone}</p>
                      </div>
                      <a href={`tel:${tour.agent_phone}`} style={{ ...btnStyle, backgroundColor: '#0284c7', color: '#fff', borderColor: '#38bdf8', textDecoration: 'none', padding: '8px 14px' }}>
                        {t.callBtn}
                      </a>
                    </div>
                  )}

                  {tour?.agent_email && (
                    <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.7)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ overflow: 'hidden', paddingRight: '8px' }}>
                        <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#94a3b8' }}>{t.emailLabel}</p>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden' }}>{tour.agent_email}</p>
                      </div>
                      <a href={`mailto:${tour.agent_email}`} style={{ ...btnStyle, backgroundColor: '#0284c7', color: '#fff', borderColor: '#38bdf8', textDecoration: 'none', padding: '8px 14px', flexShrink: 0 }}>
                        {t.emailBtn}
                      </a>
                    </div>
                  )}

                  {tour?.agency_name && (
                    <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.7)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#94a3b8' }}>{t.agencyLabel}</p>
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>{tour.agency_name}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {hasMounted && selectedFaq !== null && faqList[selectedFaq] && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 70, backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(254, 240, 138, 0.4)', borderRadius: '20px', width: '100%', maxWidth: '450px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <h3 style={{ color: '#fef08a', fontSize: '15px', margin: 0, paddingRight: '10px' }}>
                {faqList[selectedFaq].question}
              </h3>
              <button onClick={() => setSelectedFaq(null)} style={{ ...btnStyle, backgroundColor: '#dc2626', color: '#fff', borderColor: '#ef4444', flexShrink: 0, padding: '6px 12px' }}>
                {t.close}
              </button>
            </div>
            <div style={{ padding: '16px', overflowY: 'auto', flex: 1, color: '#e2e8f0', fontSize: '13px' }}>
              <p style={{ margin: 0, lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                {faqList[selectedFaq].answer || t.comingSoon}
              </p>
            </div>
          </div>
        </div>
      )}

      {adminMode && !pendingCoords && (
        <div style={{ position: 'absolute', top: '80px', left: '12px', zIndex: 40, backgroundColor: 'rgba(0,0,0,0.85)', padding: '10px', borderRadius: '12px', border: '1px solid #333', color: '#fff', fontSize: '11px', maxWidth: '280px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#38bdf8' }}>ADMIN KONTROLE</div>
          
          <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: '#aaa' }}>Ciljni jezici za AI:</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {availableLanguages.map((l) => (
                <label key={l} style={{ display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer', fontSize: '10px' }}>
                  <input
                    type="checkbox"
                    checked={targetLanguages.includes(l)}
                    onChange={() => toggleTargetLanguage(l)}
                  />
                  {l.toUpperCase()}
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleAutoPopulateRoom}
            disabled={aiLoading}
            style={{
              ...btnStyle,
              width: '100%',
              marginBottom: '6px',
              backgroundColor: aiLoading ? '#64748b' : '#9333ea',
              color: '#fff',
              borderColor: '#c084fc',
              fontWeight: 'bold',
              cursor: aiLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {aiLoading ? '⚡ AI Generiše...' : '✨ Popuni sobu pomoću AI'}
          </button>
          <button onClick={handleStartEditEstablish} style={{ ...btnStyle, width: '100%', marginBottom: '6px' }}>{t.introNarration}</button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '100px', overflowY: 'auto' }}>
            {waypointsList.map((wp, idx) => (
              <button key={idx} onClick={() => handleStartEditWaypoint(idx)} style={{ ...btnStyle, textAlign: 'left', width: '100%' }}>
                {wp.type === 'navigation' || wp.targetRoomId ? '🚪 Nav' : 'ℹ️ Info'}: {getLocalizedText(wp.title_i18n, lang) || getLocalizedText(wp.text_i18n, lang) || `Tačka ${idx + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {pendingCoords && (
        <div style={{
          position: 'absolute',
          top: '75px',
          right: '12px',
          zIndex: 45,
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          padding: '14px',
          borderRadius: '16px',
          border: '1px solid #38bdf8',
          color: '#fff',
          width: '92%',
          maxWidth: '320px',
          maxHeight: '82vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)'
        }}>
          <h3 style={{ margin: 0, color: '#38bdf8', fontSize: '14px' }}>
            {hotspotType === 'establish' ? t.introNarration : editingIndex !== null ? t.editPoint : t.addPoint}
          </h3>

          {hotspotType !== 'establish' && (
            <div>
              <label style={{ fontSize: '11px', color: '#aaa', display: 'block', marginBottom: '3px' }}>{t.actionType}</label>
              <select
                value={hotspotType}
                onChange={(e) => setHotspotType(e.target.value as any)}
                style={{ width: '100%', padding: '6px', borderRadius: '8px', background: '#1e293b', color: '#fff', border: '1px solid #475569', fontSize: '12px' }}
              >
                <option value="navigation">{t.navArrow}</option>
                <option value="info">{t.infoPoint}</option>
              </select>
            </div>
          )}

          {hotspotType === 'navigation' && (
            <div>
              <label style={{ fontSize: '11px', color: '#aaa', display: 'block', marginBottom: '3px' }}>Ciljna soba:</label>
              <select
                value={targetRoomId}
                onChange={(e) => setTargetRoomId(e.target.value)}
                style={{ width: '100%', padding: '6px', borderRadius: '8px', background: '#1e293b', color: '#fff', border: '1px solid #475569', fontSize: '12px' }}
              >
                <option value="">{t.targetRoom}</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {getLocalizedText(r.title_i18n, lang) || `Soba ${r.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(hotspotType === 'info' || hotspotType === 'establish') && (
            <>
              {hotspotType === 'info' && (
                <input
                  type="text"
                  placeholder={t.titlePlaceholder}
                  value={hotspotTitle}
                  onChange={(e) => setHotspotTitle(e.target.value)}
                  style={{ width: '100%', padding: '6px', borderRadius: '8px', background: '#1e293b', color: '#fff', border: '1px solid #475569', boxSizing: 'border-box', fontSize: '12px' }}
                />
              )}
              <textarea
                placeholder={t.descPlaceholder}
                value={hotspotText}
                onChange={(e) => setHotspotText(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '6px', borderRadius: '8px', background: '#1e293b', color: '#fff', border: '1px solid #475569', boxSizing: 'border-box', resize: 'vertical', fontSize: '12px' }}
              />
              <input
                type="text"
                placeholder={t.audioUrlPlaceholder}
                value={hotspotAudioUrl}
                onChange={(e) => setHotspotAudioUrl(e.target.value)}
                style={{ width: '100%', padding: '6px', borderRadius: '8px', background: '#1e293b', color: '#fff', border: '1px solid #475569', boxSizing: 'border-box', fontSize: '12px' }}
              />
            </>
          )}

          <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexDirection: 'column' }}>
            <button
              onClick={handleSaveWaypoint}
              style={{ ...btnStyle, backgroundColor: '#0284c7', color: '#fff', borderColor: '#38bdf8', fontWeight: 'bold', padding: '8px', fontSize: '12px' }}
            >
              {t.save}
            </button>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setPendingCoords(null)}
                style={{ ...btnStyle, flex: 1, padding: '6px', fontSize: '12px' }}
              >
                {t.cancel}
              </button>
              {editingIndex !== null && hotspotType !== 'establish' && (
                <button
                  onClick={handleDeleteWaypoint}
                  style={{ ...btnStyle, backgroundColor: '#dc2626', color: '#fff', borderColor: '#ef4444' }}
                >
                  {t.delete}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}