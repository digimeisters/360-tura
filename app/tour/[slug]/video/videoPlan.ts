import type { Language, Room, Tour } from '../types';
import { buildFactList, getLocalizedText, normalizeYaw, parseEstablish, composeEstablishText } from '../utils';
import { parseGuidePath, resolveGuidePath } from '../guidePath';
import { toSubtitleCues } from '../subtitleCues';
import { formatListingPrice } from '../../../lib/listingPrice';
import { SITE_URL } from '../../../lib/site';
import { phoneToE164 } from '../TourControls';

/**
 * Plan kratkog uspravnog videa iz ture (za Instagram/Facebook, Premium):
 * uvodna kartica -> prolazak kroz prostorije sa titlom -> završna kartica sa
 * QR kodom. Sve se uzima iz podataka ture koji već postoje (Info, uvod sobe,
 * putanja vodiča), pa agent ništa ne piše posebno. Vlasnik je odobrio izgled
 * 1. 10. 2026 (uvodna kartica "za nijansu detaljnija": agencija, tri polja,
 * do tri prednosti).
 *
 * Ovde nema crtanja - samo podaci i vremena. Crta videoFrame.ts, kodira
 * videoEncode.ts.
 */

export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;
export const VIDEO_FPS = 30;

/** Trajanja u sekundama. Susedni delovi se preklapaju za FADE (pretapanje). */
export const INTRO_S = 4;
// Soba traje dovoljno da se pročita jedna rečenica titla (~2,5 s čistog teksta).
export const ROOM_S = 4.2;
export const FADE_S = 0.7;
export const OUTRO_S = 3.2;
/** Više soba bi video učinilo dužim od 35 s - za Reels je to granica pažnje. */
export const MAX_ROOMS = 8;

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
};

export type VideoPlan = {
  lang: Language;
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
    outroNote: 'Skenirajte kod ili otvorite link'
  },
  en: {
    categories: { sale: 'For sale', rent: 'For rent', booking: 'Short stay' },
    tagline: 'Walk through the property in 360°',
    outroTitle: 'See the full tour',
    outroNote: 'Scan the code or open the link'
  },
  de: {
    categories: { sale: 'Zu verkaufen', rent: 'Zu vermieten', booking: 'Kurzaufenthalt' },
    tagline: 'Gehen Sie in 360° durch die Immobilie',
    outroTitle: 'Die ganze Tour ansehen',
    outroNote: 'Code scannen oder Link öffnen'
  },
  ru: {
    categories: { sale: 'Продажа', rent: 'Аренда', booking: 'Посуточно' },
    tagline: 'Прогуляйтесь по объекту в 360°',
    outroTitle: 'Смотрите весь тур',
    outroNote: 'Отсканируйте код или откройте ссылку'
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

/** Telefoni i ovaj alat dobijaju kopiju od 6000 px - dovoljno oštra za 1080 px širine videa. */
function videoPanoramaUrl(room: Room): string {
  return room.panorama_url_mobile || room.panorama_url_cf || room.panorama_url || '';
}

export function buildVideoPlan(tour: Tour, rooms: Room[], lang: Language): VideoPlan {
  const t = TEXT[lang];
  const facts = buildFactList(tour, lang);
  const fact = (key: string) => facts.find((row) => row.key === key);

  const tiles = (['area', 'structure', 'floor'] as const)
    .map((key) => fact(key))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .map((row) => ({ value: row.value, label: row.label.toLowerCase() }));

  const elevator = fact('elevator');
  const heating = fact('heating');
  const perks = [
    fact('terrace')?.value,
    fact('parking')?.value,
    elevator && tour.has_elevator === 'Da' ? elevator.label : undefined,
    heating ? `${heating.label}: ${heating.value.toLowerCase()}` : undefined
  ].filter((p): p is string => Boolean(p)).slice(0, 3);

  const priceParts = formatListingPrice(tour.price, tour.category, lang);
  const price = priceParts ? [priceParts.amount, priceParts.unit].filter(Boolean).join(' ') : '';
  const place = tour.district?.trim() || tour.city?.trim() || '';
  const category = tour.category ? t.categories[tour.category] : '';

  const shots: VideoRoomShot[] = [];
  const list = orderedRooms(tour, rooms).filter((room) => videoPanoramaUrl(room)).slice(0, MAX_ROOMS);
  let cursor = 0;
  list.forEach((room, i) => {
    const establish = parseEstablish(room.establish_i18n);
    const center = normalizeYaw(establish.fromYaw ?? 0);
    const intro = getLocalizedText(composeEstablishText(establish), lang);
    const subtitle = firstSentence(intro);
    // Prva soba je i pozadina uvodne kartice, pa traje duže i klizi više.
    const start = i === 0 ? 0 : cursor - FADE_S;
    const duration = i === 0 ? INTRO_S + ROOM_S - FADE_S : ROOM_S;
    const span = i === 0 ? 70 : 40;
    shots.push({
      roomId: String(room.id),
      title: getLocalizedText(room.title_i18n, lang),
      subtitle,
      panoramaUrl: videoPanoramaUrl(room),
      // Isti smer kao kruženje u turi (Pannellum autoRotate smanjuje yaw) -
      // vlasnik, 1. 10. 2026: u prvoj verziji je video išao na suprotnu stranu.
      fromYaw: center + span / 2,
      toYaw: center - span / 2,
      start,
      end: start + duration
    });
    cursor = start + duration;
  });

  const outroStart = Math.max(INTRO_S, cursor - FADE_S);
  const url = `${SITE_URL}/tour/${tour.slug}`;
  const phone = phoneToE164(tour.agent_phone || '');
  const phoneLabel = phone ? formatPhone(phone) : '';

  return {
    lang,
    intro: {
      agency: tour.agency_name?.trim() || 'Kvadrat360',
      eyebrow: [category, place].filter(Boolean).join(' · ').toUpperCase(),
      // "48 m²" i "52 m2" se ne smeju prelomiti u dva reda.
      title: getLocalizedText(tour.title_i18n, lang).replace(/(\d)\s+(m²|m2)/g, '$1 $2'),
      price,
      tiles,
      perks,
      tagline: t.tagline,
      end: INTRO_S
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

