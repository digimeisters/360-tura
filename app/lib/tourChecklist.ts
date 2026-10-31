import { getAudioUrlFor, getLocalizedText, parseEstablish, parseWaypoints } from '@/app/tour/[slug]/utils';
import type { Room, Tour } from '@/app/tour/[slug]/types';

/**
 * "Šta fali" za turu u admin spisku (2026-10-31): pre predaje agenciji vidi
 * se šta još nije urađeno - bez otvaranja ture. Računa se na serveru iz
 * podataka koje spisak ionako čita.
 */

export type ChecklistItem = { key: string; label: string; ok: boolean; detail?: string };
export type TourChecklist = { done: number; total: number; missing: ChecklistItem[] };

const LANGS = ['sr', 'en', 'de', 'ru'] as const;

function roomsLabel(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return `${n} soba`;
  return n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? `${n} sobe` : `${n} soba`;
}

function hasText(room: Room): boolean {
  const e = parseEstablish(room.establish_i18n);
  return Boolean(getLocalizedText(e.intro_i18n, 'sr') || getLocalizedText(e.detail_i18n, 'sr') || getLocalizedText(e.text_i18n, 'sr'));
}

function hasVoice(room: Room, lang: string): boolean {
  const e = parseEstablish(room.establish_i18n);
  return Boolean(getAudioUrlFor(e.audio_url_i18n ?? e.audio_url, lang));
}

export function tourChecklist(tour: Partial<Tour> & { about_text_i18n?: unknown }, rooms: Room[]): TourChecklist {
  const items: ChecklistItem[] = [];
  const add = (key: string, label: string, ok: boolean, detail?: string) => items.push({ key, label, ok, detail });
  const n = rooms.length;

  const noPano = rooms.filter((r) => !(r.panorama_url_cf || r.panorama_url)).length;
  add('panorama', 'Panorame', n > 0 && noPano === 0, n === 0 ? 'nema soba' : noPano ? `bez panorame: ${roomsLabel(noPano)}` : undefined);

  const noText = rooms.filter((r) => !hasText(r)).length;
  add('text', 'Tekst soba', n > 0 && noText === 0, noText ? `bez teksta: ${roomsLabel(noText)}` : undefined);

  if (n > 1) {
    const noDoors = rooms.filter((r) => !parseWaypoints(r.waypoints_i18n).some((w) => w.targetRoomId != null)).length;
    add('doors', 'Vrata između soba', noDoors === 0, noDoors ? `bez vrata: ${roomsLabel(noDoors)}` : undefined);
  }

  // Glas: srpski u svakoj sobi sa tekstom, i svaki jezik koji tura negde već ima - u svim sobama.
  const withText = rooms.filter(hasText);
  const voiceLangs = LANGS.filter((l) => l === 'sr' || rooms.some((r) => hasVoice(r, l)));
  const voiceGaps = voiceLangs
    .map((l) => ({ l, missing: withText.filter((r) => !hasVoice(r, l)).length }))
    .filter((g) => g.missing > 0);
  add(
    'voice',
    'Glas',
    withText.length > 0 && voiceGaps.length === 0,
    voiceGaps.length ? voiceGaps.map((g) => `${g.l.toUpperCase()}: ${roomsLabel(g.missing)}`).join(', ') : undefined
  );

  if (n > 2) add('guide', 'Putanja vodiča', Boolean(tour.guide_path?.trim()), tour.guide_path?.trim() ? undefined : 'nema automatskog vođenja');

  const onPlan = rooms.filter((r) => r.floorplan_x != null && r.floorplan_y != null).length;
  add('plan', 'Tlocrt', Boolean(tour.floorplan_url) && onPlan >= Math.min(2, n), !tour.floorplan_url ? 'nema tlocrta' : onPlan < Math.min(2, n) ? 'sobe nisu označene na tlocrtu' : undefined);

  add('intro', 'Uvod (glas)', Boolean(tour.intro_audio_i18n?.sr));
  add('location', 'Lokacija na mapi', typeof tour.lat === 'number' && typeof tour.lng === 'number');
  add('about', 'Opis nekretnine', Boolean(getLocalizedText(tour.about_text_i18n, 'sr').trim()));
  add('agent', 'Kontakt agenta', Boolean(tour.agent_phone?.trim() || tour.agent_email?.trim()));

  const done = items.filter((i) => i.ok).length;
  return { done, total: items.length, missing: items.filter((i) => !i.ok) };
}
