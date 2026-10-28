import type { Language, Room, Tour } from '../types';
import { buildFactList, getLocalizedText, normalizeYaw, parseEstablish, composeEstablishText } from '../utils';
import { parseGuidePath, resolveGuidePath } from '../guidePath';
import { toSubtitleCues } from '../subtitleCues';
import { formatListingPrice } from '../../../lib/listingPrice';
import { SITE_URL } from '../../../lib/site';
import { phoneToE164 } from '../TourControls';
import { ROTATE_RAMP_MS } from '../transition';
import { chipsFor } from '../introChips';

/**
 * Plan kratkog uspravnog videa iz ture (za Instagram/Facebook, Premium):
 * uvodna kartica -> prolazak kroz prostorije sa titlom -> završna kartica sa
 * linkom ture (QR kod izbačen 28. 10. 2026 - na Instagramu/TikToku se link
 * čita iz opisa objave). Sve se uzima iz podataka ture koji već postoje (Info, uvod sobe,
 * putanja vodiča), pa agent ništa ne piše posebno. Vlasnik je odobrio izgled
 * 1. 10. 2026 (uvodna kartica "za nijansu detaljnija": agencija, tri polja,
 * do tri prednosti).
 *
 * Ovde nema crtanja - samo podaci i vremena. Crta videoFrame.ts, kodira
 * videoEncode.ts.
 *
 * Od 17. 10. 2026 (Instagram i TikTok): tura sa lokacijom počinje "dolaskom sa
 * mape" kao uvod u turi - let do zgrade, oznaka, pločice sa podacima - uz glas
 * uvoda ture (tours.intro_audio_i18n), ako je snimljen za taj jezik. Tada
 * naslov i cena stoje u kartici preko mape umesto posebne uvodne kartice.
 */

export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;
export const VIDEO_FPS = 30;

/** Trajanja u sekundama. Susedni delovi se preklapaju za FADE (pretapanje). */
export const INTRO_S = 4;
// Soba traje 6 s (vlasnik, 28. 10. 2026: "malo duže predstavljanje panorame";
// bilo 4,2 s) - kamera pređe skoro trećinu kruga, a titl se stigne pročitati.
export const ROOM_S = 6;
export const FADE_S = 0.7;
export const OUTRO_S = 3.6;
/** Mapa na početku traje bar ovoliko; sa glasom uvoda - koliko glas plus predah. */
export const MAP_MIN_S = 6;
const MAP_AFTER_VOICE_S = 0.8;
/**
 * Kadar sobe u videu kreće od pogleda koji tura ima posle ovoliko sekundi
 * uvodne priče (vlasnik, 1. 10. 2026: početni kadar sobe mu nije odgovarao,
 * "neka bude na četvrtoj sekundi naracije"; šesta je probana i odbijena, ostaje četvrta).
 */
export const KEY_NARRATION_S = 4;
/**
 * Kruženje ture za vreme uvodne priče (roomSequence.ts: 250° za 15 s, kreće
 * od mirovanja i ubrzava ROTATE_RAMP_MS). Mora da prati turu, inače kadar u
 * videu ne bi bio isti kao u turi.
 */
const TOUR_ROTATE_DEG_PER_S = 250 / 15;
/**
 * Video klizi mirnije od ture (16,7°/s) - ovoliko stepeni u sekundi, u istom
 * smeru. Bilo 10; vlasnik je tražio "za nijansu brže".
 */
const VIDEO_PAN_DEG_PER_S = 13;

/** Za koliko stepeni se tura okrenula posle `seconds` sekundi priče. */
function tourRotationAfter(seconds: number): number {
  const ramp = ROTATE_RAMP_MS / 1000;
  const v = TOUR_ROTATE_DEG_PER_S;
  // Brzina raste kao 1-(1-k)^2 tokom ubrzavanja: put je v*(s^2/r - s^3/(3r^2)).
  if (seconds <= ramp) return v * (seconds ** 2 / ramp - seconds ** 3 / (3 * ramp ** 2));
  return v * ((2 * ramp) / 3 + (seconds - ramp));
}

/** Sa sobama od 6 s: najviše 6, da video ostane oko 45 s (granica pažnje za Reels). */
export const MAX_ROOMS = 6;
/** Sa mapom i glasom na početku: soba manje, da ceo video ostane oko 45 s. */
const TARGET_WITH_MAP_S = 45;
const MIN_ROOMS_WITH_MAP = 4;

export type VideoRoomShot = {
  roomId: string;
  title: string;
  /** Prva rečenica uvoda sobe - jedan titl po sobi. */
  subtitle: string;
  panoramaUrl: string;
  /** Kamera klizi od fromYaw do toYaw (stepeni), zum od fromHfov do toHfov. */
  fromYaw: number;
  toYaw: number;
  start: number;
  end: number;
  /** Položaj sobe na tlocrtu ture (procenat); null = soba nije obeležena. */
  planX: number | null;
  planY: number | null;
};

export type VideoMapScene = {
  center: [number, number];
  /** Kamera stiže do zgrade; tad pada oznaka. */
  flyEnd: number;
  /** Mapa se do ovog trenutka pretopi u prvu sobu. */
  end: number;
  chips: { icon: string; text: string; at: number }[];
};

export type VideoPlan = {
  lang: Language;
  /** Početak sa mape (tura ima koordinate); null = klasična uvodna kartica. */
  map: VideoMapScene | null;
  /** Glas uvoda ture na jeziku videa; null = video bez glasa. */
  voice: { url: string; seconds: number } | null;
  /** Logo agencije (agency_branding, migracija 027) za uvodnu i završnu karticu; null = samo naziv. */
  agencyLogoUrl: string | null;
  /** Tlocrt ture za mali prikaz u uglu ("ovde ste"); null = tura nema tlocrt ili bar dve obeležene sobe. */
  floorplanUrl: string | null;
  /** Soba za naslovnu sliku (indeks u rooms). */
  coverIndex: number;
  intro: {
    agency: string;
    eyebrow: string;
    title: string;
    price: string;
    tiles: { value: string; label: string }[];
    perks: string[];
    tagline: string;
    end: number;
  };
  rooms: VideoRoomShot[];
  outro: {
    start: number;
    end: number;
    title: string;
    note: string;
    url: string;
    shortUrl: string;
    agency: string;
    contact: string;
  };
  duration: number;
};

const TEXT: Record<Language, {
  categories: Record<'sale' | 'rent' | 'booking', string>;
  tagline: string;
  outroTitle: string;
  outroNote: string;
}> = {
  sr: {
    categories: { sale: 'Prodaja', rent: 'Izdavanje', booking: 'Stan na dan' },
    tagline: 'Prošetajte kroz nekretninu u 360°',
    outroTitle: 'Pogledajte celu turu',
    outroNote: 'Link je u opisu objave'
  },
  en: {
    categories: { sale: 'For sale', rent: 'For rent', booking: 'Short stay' },
    tagline: 'Walk through the property in 360°',
    outroTitle: 'See the full tour',
    outroNote: 'Link in the description'
  },
  de: {
    categories: { sale: 'Zu verkaufen', rent: 'Zu vermieten', booking: 'Kurzaufenthalt' },
    tagline: 'Gehen Sie in 360° durch die Immobilie',
    outroTitle: 'Die ganze Tour ansehen',
    outroNote: 'Link in der Beschreibung'
  },
  ru: {
    categories: { sale: 'Продажа', rent: 'Аренда', booking: 'Посуточно' },
    tagline: 'Прогуляйтесь по объекту в 360°',
    outroTitle: 'Смотрите весь тур',
    outroNote: 'Ссылка в описании'
  }
};

/**
 * Jedan titl po sobi: cela prva rečenica uvoda (do 3 reda). Ako je predugačka,
 * prvi deo kako ga deli titl u turi (toSubtitleCues), bez crte na kraju.
 */
function firstSentence(text: string): string {
  const cues = toSubtitleCues(text);
  let sentence = '';
  for (const cue of cues) {
    sentence = sentence ? `${sentence} ${cue.text}` : cue.text;
    if (/[.!?…]$/.test(cue.text)) break;
  }
  const pick = sentence.length <= 120 ? sentence : cues[0]?.text ?? '';
  return pick.replace(/\s*[—–-]\s*$/, '').trim();
}

/** "+381649367339" -> "+381 64 936 7339"; ostali brojevi ostaju kako jesu. */
function formatPhone(e164: string): string {
  const rs = e164.match(/^\+381(\d{2})(\d{3})(\d{3,4})$/);
  return rs ? `+381 ${rs[1]} ${rs[2]} ${rs[3]}` : e164;
}

/** Redosled soba: putanja vodiča (bez ponavljanja), inače redni broj sobe. */
function orderedRooms(tour: Tour, rooms: Room[]): Room[] {
  const steps = resolveGuidePath(parseGuidePath(tour.guide_path), rooms);
  const seen = new Set<string>();
  const fromGuide: Room[] = [];
  for (const step of steps) {
    const key = String(step.room.id);
    if (seen.has(key)) continue;
    seen.add(key);
    fromGuide.push(step.room);
  }
  if (fromGuide.length > 0) return fromGuide;
  return [...rooms].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
}

/**
 * Koliko je soba važna za video, po nazivu (vlasnik, 28. 10. 2026: u videu
 * Maglićke su bila dva hodnika, a dnevnog boravka nije bilo). Kad sve sobe ne
 * staju, ostaju najvažnije; redosled i dalje prati putanju vodiča.
 */
const ROOM_WEIGHTS: [RegExp, number][] = [
  [/dnevn|boravak|living|wohn|гостин/i, 5],
  [/kuhinj|trpezar|kitchen|dining|küche|кухн/i, 4],
  [/spava|soba|bedroom|schlaf|спальн|комнат/i, 3],
  [/teras|balkon|lođ|lodj|terrace|balcony|двор|garden|bašt|dvori/i, 3],
  [/kupatil|toalet|wc|bath|bad|ванн/i, 2],
  [/hodnik|ulaz|predsob|ostav|hall|entr|storage|flur|корид|прихож/i, 0]
];

function roomWeight(room: Room): number {
  const name = `${getLocalizedText(room.title_i18n, 'sr')} ${getLocalizedText(room.title_i18n, 'en')}`;
  return ROOM_WEIGHTS.find(([re]) => re.test(name))?.[1] ?? 2;
}

/** Najviše `max` soba: najvažnije (kod iste važnosti ranije na putanji), u redu putanje. */
function pickRooms(list: Room[], max: number): Room[] {
  if (list.length <= max) return list;
  const keep = new Set(
    list
      .map((room, i) => ({ room, i, w: roomWeight(room) }))
      .sort((a, b) => b.w - a.w || a.i - b.i)
      .slice(0, max)
      .map((x) => x.room)
  );
  return list.filter((room) => keep.has(room));
}

/** Telefoni i ovaj alat dobijaju kopiju od 6000 px - dovoljno oštra za 1080 px širine videa. */
function videoPanoramaUrl(room: Room): string {
  return room.panorama_url_mobile || room.panorama_url_cf || room.panorama_url || '';
}

/** Glas uvoda ture za jezik videa (bez pada na srpski, kao i u turi). */
export function introVoiceUrl(tour: Tour, lang: Language): string {
  return tour.intro_audio_i18n?.[lang]?.trim() || '';
}

export function buildVideoPlan(
  tour: Tour,
  rooms: Room[],
  lang: Language,
  /** Trajanje glasa uvoda u sekundama (zna se tek kad se fajl učita); null = bez glasa. */
  voiceSeconds: number | null = null
): VideoPlan {
  const t = TEXT[lang];
  const voiceUrl = introVoiceUrl(tour, lang);
  const voice = voiceUrl && voiceSeconds ? { url: voiceUrl, seconds: voiceSeconds } : null;
  const located = typeof tour.lat === 'number' && typeof tour.lng === 'number';
  let map: VideoMapScene | null = null;
  if (located) {
    const end = voice ? Math.max(MAP_MIN_S, voice.seconds + MAP_AFTER_VOICE_S) : MAP_MIN_S;
    const flyEnd = Math.min(5.5, Math.max(3, end * 0.35));
    const chips = chipsFor(tour, lang);
    // Pločice iskaču ravnomerno od kraja leta do pred kraj glasa.
    const from = flyEnd - 0.3;
    const to = Math.max(from + 0.5, (voice ? voice.seconds : end) - 1.2);
    map = {
      center: [tour.lng as number, tour.lat as number],
      flyEnd,
      end,
      chips: chips.map((c, i) => ({ icon: c.icon, text: c.text, at: from + ((to - from) * i) / Math.max(1, chips.length) }))
    };
  }
  const introEnd = map ? map.end : INTRO_S;
  const facts = buildFactList(tour, lang);
  const fact = (key: string) => facts.find((row) => row.key === key);

  const tiles = (['area', 'structure', 'floor'] as const)
    .map((key) => fact(key))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .map((row) => ({ value: row.value, label: row.label.toLowerCase() }));

  const elevator = fact('elevator');
  const heating = fact('heating');
  const perks = [
    // 'Nema' (bez terase / parkinga) nije prednost - na kartici je stajalo samo '✓ Nema'.
    tour.terrace !== 'Nema' ? fact('terrace')?.value : undefined,
    tour.parking !== 'Nema' ? fact('parking')?.value : undefined,
    elevator && tour.has_elevator === 'Da' ? elevator.label : undefined,
    heating ? `${heating.label}: ${heating.value.toLowerCase()}` : undefined
  ].filter((p): p is string => Boolean(p)).slice(0, 3);

  const priceParts = formatListingPrice(tour.price, tour.category, lang);
  const price = priceParts ? [priceParts.amount, priceParts.unit].filter(Boolean).join(' ') : '';
  const place = tour.district?.trim() || tour.city?.trim() || '';
  const category = tour.category ? t.categories[tour.category] : '';

  const shots: VideoRoomShot[] = [];
  const maxRooms = map
    ? Math.max(MIN_ROOMS_WITH_MAP, Math.min(MAX_ROOMS, Math.floor((TARGET_WITH_MAP_S - introEnd - OUTRO_S + FADE_S) / (ROOM_S - FADE_S))))
    : MAX_ROOMS;
  const list = pickRooms(
    orderedRooms(tour, rooms).filter((room) => videoPanoramaUrl(room)),
    maxRooms
  );
  let cursor = 0;
  list.forEach((room, i) => {
    const establish = parseEstablish(room.establish_i18n);
    const center = normalizeYaw(establish.fromYaw ?? 0);
    const intro = getLocalizedText(composeEstablishText(establish), lang);
    const subtitle = firstSentence(intro);
    // Prva soba je i pozadina uvodne kartice, pa traje duže i klizi više.
    // Posle mape kreće tek kad se mapa pretapa.
    const start = i === 0 ? (map ? introEnd - FADE_S : 0) : cursor - FADE_S;
    const duration = i === 0 && !map ? INTRO_S + ROOM_S - FADE_S : ROOM_S;
    // Kadar u trenutku kad se soba prvi put vidi = pogled ture posle
    // KEY_NARRATION_S sekundi priče (tura kruži smanjujući yaw). Prva soba se
    // vidi tek kad se skloni uvodna kartica, pa do tada već klizi ka tom kadru.
    const keyYaw = center - tourRotationAfter(KEY_NARRATION_S);
    const visibleAfter = i === 0 && !map ? INTRO_S - start : 0;
    const fromYaw = keyYaw + VIDEO_PAN_DEG_PER_S * visibleAfter;
    shots.push({
      roomId: String(room.id),
      title: getLocalizedText(room.title_i18n, lang),
      subtitle,
      panoramaUrl: videoPanoramaUrl(room),
      // Isti smer kao kruženje u turi (Pannellum autoRotate smanjuje yaw) -
      // vlasnik, 1. 10. 2026: u prvoj verziji je video išao na suprotnu stranu.
      fromYaw,
      toYaw: fromYaw - VIDEO_PAN_DEG_PER_S * duration,
      start,
      end: start + duration,
      planX: typeof room.floorplan_x === 'number' ? room.floorplan_x : null,
      planY: typeof room.floorplan_y === 'number' ? room.floorplan_y : null
    });
    cursor = start + duration;
  });
  const marked = shots.filter((shot) => shot.planX !== null && shot.planY !== null).length;
  // Naslovna slika: najvažnija soba u videu (kod iste važnosti - ranija).
  let coverIndex = 0;
  list.forEach((room, i) => {
    if (roomWeight(room) > roomWeight(list[coverIndex])) coverIndex = i;
  });
  const floorplanUrl = tour.floorplan_url && marked >= 2 ? tour.floorplan_url : null;

  const outroStart = Math.max(introEnd, cursor - FADE_S);
  const url = `${SITE_URL}/tour/${tour.slug}`;
  const phone = phoneToE164(tour.agent_phone || '');
  const phoneLabel = phone ? formatPhone(phone) : '';

  return {
    lang,
    map,
    voice,
    agencyLogoUrl: tour.agency_logo_url || null,
    floorplanUrl,
    coverIndex,
    intro: {
      agency: tour.agency_name?.trim() || 'Kvadrat360',
      eyebrow: [category, place].filter(Boolean).join(' · ').toUpperCase(),
      // "48 m²" i "52 m2" se ne smeju prelomiti u dva reda.
      title: getLocalizedText(tour.title_i18n, lang).replace(/(\d)\s+(m²|m2)/g, '$1 $2'),
      price,
      tiles,
      perks,
      tagline: t.tagline,
      end: introEnd
    },
    rooms: shots,
    outro: {
      start: outroStart,
      end: outroStart + OUTRO_S,
      title: t.outroTitle,
      note: t.outroNote,
      url,
      shortUrl: url.replace(/^https?:\/\//, ''),
      agency: tour.agency_name?.trim() || 'Kvadrat360',
      contact: phone ? `${phoneLabel} · ${lang === 'sr' ? 'Viber' : 'WhatsApp'}` : ''
    },
    duration: outroStart + OUTRO_S
  };
}

