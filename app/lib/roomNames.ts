/**
 * Nazivi prostorija šematskog tlocrta na jezicima ture (vlasnik, 28. 10. 2026:
 * "automatski, uz mogućnost ispravke").
 *
 * Redom: naslov sobe ture na tom jeziku (već preveden uz turu), pa rečnik
 * uobičajenih naziva ispod, a ono što ni jedno ne zna ide u `missing` - editor
 * to pri čuvanju šalje na AI prevod (api/admin/floorplan/translate). Naziv
 * koji je vlasnik sam upisao (labelsManual) automatika ne dira.
 */

import { FOREIGN_LANGS, type FloorplanLayout, type ForeignLang, type PlanGroup, type PlanLang } from './floorplanLayout.ts';

type Names = Record<ForeignLang, string>;

/** Ključ = srpski naziv bez dijakritika, malim slovima. */
const DICTIONARY: Record<string, Names> = {
  'dnevna soba': { en: 'Living room', de: 'Wohnzimmer', ru: 'Гостиная' },
  'dnevni boravak': { en: 'Living room', de: 'Wohnzimmer', ru: 'Гостиная' },
  boravak: { en: 'Living room', de: 'Wohnzimmer', ru: 'Гостиная' },
  kuhinja: { en: 'Kitchen', de: 'Küche', ru: 'Кухня' },
  trpezarija: { en: 'Dining room', de: 'Esszimmer', ru: 'Столовая' },
  'kuhinja sa trpezarijom': { en: 'Kitchen and dining', de: 'Küche mit Essbereich', ru: 'Кухня-столовая' },
  'kuhinja i trpezarija': { en: 'Kitchen and dining', de: 'Küche mit Essbereich', ru: 'Кухня-столовая' },
  'spavaca soba': { en: 'Bedroom', de: 'Schlafzimmer', ru: 'Спальня' },
  spavaca: { en: 'Bedroom', de: 'Schlafzimmer', ru: 'Спальня' },
  soba: { en: 'Room', de: 'Zimmer', ru: 'Комната' },
  'decja soba': { en: "Children's room", de: 'Kinderzimmer', ru: 'Детская' },
  'radna soba': { en: 'Study', de: 'Arbeitszimmer', ru: 'Кабинет' },
  kupatilo: { en: 'Bathroom', de: 'Bad', ru: 'Ванная' },
  toalet: { en: 'Toilet', de: 'WC', ru: 'Туалет' },
  wc: { en: 'WC', de: 'WC', ru: 'Туалет' },
  hodnik: { en: 'Hallway', de: 'Flur', ru: 'Коридор' },
  predsoblje: { en: 'Entrance hall', de: 'Diele', ru: 'Прихожая' },
  ulaz: { en: 'Entrance', de: 'Eingang', ru: 'Вход' },
  hol: { en: 'Hall', de: 'Halle', ru: 'Холл' },
  ostava: { en: 'Storage room', de: 'Abstellraum', ru: 'Кладовая' },
  spajz: { en: 'Pantry', de: 'Speisekammer', ru: 'Кладовая' },
  terasa: { en: 'Terrace', de: 'Terrasse', ru: 'Терраса' },
  balkon: { en: 'Balcony', de: 'Balkon', ru: 'Балкон' },
  lodja: { en: 'Loggia', de: 'Loggia', ru: 'Лоджия' },
  garderober: { en: 'Walk-in closet', de: 'Ankleide', ru: 'Гардеробная' },
  garderoba: { en: 'Walk-in closet', de: 'Ankleide', ru: 'Гардеробная' },
  vesernica: { en: 'Laundry room', de: 'Waschküche', ru: 'Постирочная' },
  garaza: { en: 'Garage', de: 'Garage', ru: 'Гараж' },
  podrum: { en: 'Basement', de: 'Keller', ru: 'Подвал' },
  dvoriste: { en: 'Yard', de: 'Hof', ru: 'Двор' },
  basta: { en: 'Garden', de: 'Garten', ru: 'Сад' },
  studio: { en: 'Studio', de: 'Studio', ru: 'Студия' }
};

function plain(s: string): string {
  return s
    .toLowerCase()
    .replace(/đ/g, 'dj')
    .replace(/[čć]/g, 'c')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "Hodnik 1/2" -> "Hodnik" (više snimaka iste prostorije). */
const withoutPart = (s: string) => s.replace(/\s*\d+\s*\/\s*\d+\s*$/, '').trim();

/** Naziv iz rečnika; broj na kraju se prenosi ("Spavaća soba 2" -> "Bedroom 2"). Null ako ga nema. */
export function translateRoomName(sr: string, lang: ForeignLang): string | null {
  const m = plain(sr).match(/^(.*?)(?:\s+(\d+))?$/);
  const hit = m ? DICTIONARY[m[1]] : undefined;
  if (!hit) return null;
  return m![2] ? `${hit[lang]} ${m![2]}` : hit[lang];
}

/** ID sobe ture -> naslov po jezicima. */
export type RoomTitles = Map<string, Partial<Record<PlanLang, string>>>;

export type MissingLabel = { groupId: string; lang: ForeignLang; sr: string };

/** Popunjava prazne, ne-ručne prevode naziva; ono što ne zna vraća u `missing`. */
export function fillAutoLabels(
  layout: FloorplanLayout,
  rooms: RoomTitles,
  langs: ForeignLang[]
): { layout: FloorplanLayout; missing: MissingLabel[] } {
  const missing: MissingLabel[] = [];
  const groups = layout.groups.map((g) => {
    const labels = { ...g.labels };
    const sr = withoutPart(g.label);
    const titles = layout.rooms
      .filter((r) => r.group === g.id)
      .map((r) => rooms.get(r.roomId))
      .find((t) => t?.sr && plain(withoutPart(t.sr)) === plain(sr));
    for (const lang of langs) {
      if (labels[lang] || g.labelsManual?.includes(lang)) continue;
      const fromTour = titles?.[lang] ? withoutPart(titles[lang]!) : '';
      const found = fromTour || translateRoomName(sr, lang);
      if (found) labels[lang] = found;
      else if (sr) missing.push({ groupId: g.id, lang, sr });
    }
    return Object.keys(labels).length ? { ...g, labels } : g;
  });
  return { layout: { ...layout, groups }, missing };
}

/** Novi srpski naziv: automatski prevodi se brišu (popuniće se ponovo), ručni ostaju. */
export function renameGroup(group: PlanGroup, label: string): PlanGroup {
  const manual = group.labelsManual ?? [];
  const labels: Partial<Record<ForeignLang, string>> = {};
  for (const lang of manual) if (group.labels?.[lang]) labels[lang] = group.labels[lang];
  const next: PlanGroup = { ...group, label };
  if (Object.keys(labels).length) next.labels = labels;
  else delete next.labels;
  return next;
}

/** Ručni prevod; prazno polje vraća automatiku za taj jezik. */
export function setManualLabel(group: PlanGroup, lang: ForeignLang, text: string): PlanGroup {
  // Bez trim-a dok se kuca (inače nestaje razmak između reči); čisti se u parseLayout.
  const value = text.slice(0, 60);
  const labels = { ...group.labels };
  const manual = (group.labelsManual ?? []).filter((l) => l !== lang);
  if (value.trim()) {
    labels[lang] = value;
    manual.push(lang);
  } else delete labels[lang];
  const next: PlanGroup = { ...group, labels };
  if (!Object.keys(labels).length) delete next.labels;
  if (manual.length) next.labelsManual = FOREIGN_LANGS.filter((l) => manual.includes(l));
  else delete next.labelsManual;
  return next;
}

/**
 * Jezici plana (bez srpskog): tours.target_languages (JSON niz), a kad ga
 * nema (starije ture) - jezici koji postoje u nazivima soba.
 */
export function planLanguages(targetLanguages: string | null, roomI18n: unknown[]): ForeignLang[] {
  if (targetLanguages) {
    try {
      const list = JSON.parse(targetLanguages);
      return Array.isArray(list) ? FOREIGN_LANGS.filter((l) => list.includes(l)) : [];
    } catch {
      return [];
    }
  }
  const seen = new Set<string>();
  for (const raw of roomI18n) {
    let v = raw;
    if (typeof v === 'string') {
      try {
        v = JSON.parse(v);
      } catch {
        continue;
      }
    }
    if (v && typeof v === 'object') for (const [k, s] of Object.entries(v)) if (typeof s === 'string' && s.trim()) seen.add(k);
  }
  return FOREIGN_LANGS.filter((l) => seen.has(l));
}
