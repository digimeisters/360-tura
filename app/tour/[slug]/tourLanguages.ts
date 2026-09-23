import type { Language, Room, Tour } from './types';
import { parseEstablish, parseWaypoints } from './utils';

/**
 * Koje jezike tura nudi posetiocu (uvodni ekran, traka u vrhu, ?lang= iz
 * linka). Srpski uvek; ostali prema tome šta tura stvarno ima.
 */

/** Da li i18n vrednost (objekat ili JSON-string) ima tekst za dati jezik. */
function hasLang(data: unknown, l: Language): boolean {
  if (!data) return false;
  if (typeof data === 'object') return Boolean((data as Record<string, unknown>)[l]);
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return Boolean(parsed && parsed[l]);
    } catch {
      return false;
    }
  }
  return false;
}

// Da li i18n objekat ima BILO KAKVU vrednost, za bilo koji jezik - koristi
// se da se utvrdi da li je tura UOPŠTE ikad prošla kroz generisanje glasa,
// bez obzira na koji jezik.
function hasAnyLangValue(data: unknown): boolean {
  if (!data) return false;
  let obj: unknown = data;
  if (typeof data === 'string') {
    try {
      obj = JSON.parse(data);
    } catch {
      return false;
    }
  }
  if (obj && typeof obj === 'object') {
    return Object.values(obj as Record<string, unknown>).some(
      (v) => typeof v === 'string' && v.trim().length > 0
    );
  }
  return false;
}

// Da li JE tura ikad dobila snimljen glas - u bilo kojoj sobi, na bilo
// kom jeziku. Razlikuje ture koje su prošle kroz TTS od onih koje nisu.
export function tourHasAnyAudio(rooms: Room[]): boolean {
  for (const room of rooms) {
    const establishData = parseEstablish(room.establish_i18n);
    if (establishData.audio_url || hasAnyLangValue(establishData.audio_url_i18n)) return true;
    for (const wp of parseWaypoints(room.waypoints_i18n)) {
      if (wp.audio_url || hasAnyLangValue(wp.audio_url_i18n)) return true;
    }
  }
  return false;
}

export function isLanguageAvailable(l: Language, tour: Tour | null, rooms: Room[]): boolean {
  if (l === 'sr') return true;

  // Čim je tura BAR JEDNOM prošla kroz generisanje glasa, jezik se nudi
  // SAMO ako baš za njega postoji snimljen audio - inače bi posetilac
  // izabrao jezik koji izgleda dostupan (ima prevod), a dobio turu bez
  // vodiča dok ostali jezici zvuče profesionalno. Dok tura nikad nije
  // dobila glas ni na jednom jeziku, ponašanje ostaje kao pre (dostupnost
  // po prevedenom TEKSTU) - ne sakriva prevode koji tek čekaju na glas.
  if (tourHasAnyAudio(rooms)) {
    for (const room of rooms) {
      if (hasLang(parseEstablish(room.establish_i18n).audio_url_i18n, l)) return true;
      for (const wp of parseWaypoints(room.waypoints_i18n)) {
        if (hasLang(wp.audio_url_i18n, l)) return true;
      }
    }
    return false;
  }

  if (
    tour &&
    (hasLang(tour.title_i18n, l) ||
      hasLang(tour.about_text_i18n, l) ||
      hasLang(tour.faq_1_i18n, l) ||
      hasLang(tour.faq_2_i18n, l) ||
      hasLang(tour.faq_3_i18n, l) ||
      hasLang(tour.faq_4_i18n, l) ||
      hasLang(tour.faq_5_i18n, l))
  ) {
    return true;
  }

  for (const room of rooms) {
    if (hasLang(room.title_i18n, l)) return true;
    for (const wp of parseWaypoints(room.waypoints_i18n)) {
      if (hasLang(wp.text_i18n, l) || hasLang(wp.title_i18n, l)) return true;
    }
  }

  return false;
}

export const ALL_LANGUAGES: Language[] = ['sr', 'en', 'de', 'ru'];
