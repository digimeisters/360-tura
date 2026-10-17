import { buildFactList } from './utils';
import type { Language, Tour } from './types';

/**
 * Pločice sa osnovnim podacima koje iskaču dok traje uvod ture - u turi
 * (TourIntroOverlay) i na početku videa (video/videoFrame.ts).
 */

export type Chip = { key: string; icon: string; text: string };

const ICONS: Record<string, string> = {
  structure: '🛏️',
  area: '📐',
  floor: '🏢',
  elevator: '↕️',
  terrace: '🌿',
  heating: '🔥',
  parking: '🚗',
  basement: '📦',
  buildStatus: '🏗️',
  finishStatus: '🛋️',
  registration: '📄'
};
/** Redosled pločica prati redosled kojim uvod priča (vidi /api/ai/tour-intro). */
const ORDER = ['structure', 'area', 'floor', 'elevator', 'terrace', 'heating', 'parking', 'basement', 'buildStatus', 'finishStatus', 'registration'];
const YES_NO_KEYS = new Set(['elevator', 'basement', 'registration']);
const NONE_VALUES = new Set(['Nema', 'None', 'Keine', 'Keiner', 'Нет']);

export function chipsFor(tour: Tour, lang: Language): Chip[] {
  const facts = buildFactList(tour, 'sr');
  const local = new Map<string, { label: string; value: string }>(buildFactList(tour, lang).map((f) => [f.key, f]));
  return ORDER.flatMap((key) => {
    const sr = facts.find((f) => f.key === key);
    const f = local.get(key);
    if (!sr || !f || NONE_VALUES.has(f.value)) return [];
    // Da/ne podatak ide samo kad je "da", i to kao naziv ("Lift"), ne "Da".
    if (YES_NO_KEYS.has(key)) return sr.value === 'Da' ? [{ key, icon: ICONS[key], text: f.label }] : [];
    return [{ key, icon: ICONS[key], text: f.value }];
  }).slice(0, 8);
}
