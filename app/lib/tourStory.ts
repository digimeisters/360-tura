import { supabase } from './supabaseClient';
import { pickLang } from '../tour/[slug]/getTourMeta';
import { planHeadingFor } from '../tour/[slug]/planHeading';
import type { Room } from '../tour/[slug]/types';
import type { HomeLang } from './homeCopy';

/**
 * Podaci za sekciju "Od tlocrta do ture" na početnoj (vidi
 * docs/superpowers/specs/2026-10-21-animacije-sajta-design.md). Sve što
 * sekcija pokazuje dolazi iz prave ture: šematski tlocrt, tačke soba, hotspot
 * i strelica iz sobe A, uvodni tekst sobe B. Izmena u admin panelu stiže
 * ovde pri sledećem osvežavanju početne (revalidate).
 *
 * Tura i sobe su izabrane ručno (vlasnik, 21. 10. 2026): Apartman Belgrade
 * Four, dnevna soba -> spavaća soba 1 (panorama terase je bila 1,4 MB).
 */
export const STORY = {
  slug: 'stan-gasse-1',
  roomA: '4998dd2b-00f4-4368-acec-046221e58ec1',
  roomB: '368699bf-3674-42aa-9b6a-e98327d57bc4',
  hotspotTitle: 'Ugaona garnitura'
} as const;

export type StoryLang = 'sr' | 'en' | 'de' | 'ru';
export const STORY_LANGS: StoryLang[] = ['sr', 'en', 'de', 'ru'];

/** Panorama u dve veličine, smanjena kroz /_next/image (next.config: remotePatterns). */
export type StoryPanorama = { phone: string; desktop: string };

export type StoryRoom = {
  roomId: string;
  title: string;
  panorama: StoryPanorama;
  /** Pravac pogleda pri ulasku (establish fromYaw). */
  startYaw: number;
  /** Poravnanje panorame sa tlocrtom, za konus na malom planu (null = bez konusa). */
  heading: number | null;
};

export type StoryData = {
  slug: string;
  /** Unutrašnjost šematskog SVG-a, bez <svg> omotača i bez njegovog <style>. */
  planSvg: string;
  planBox: [number, number, number, number];
  cams: { roomId: string; x: number; y: number }[];
  a: StoryRoom;
  b: StoryRoom & { subtitles: Record<StoryLang, string> };
  hotspot: { yaw: number; pitch: number; title: string; text: string };
  /** label: prazno kad tura nema natpis na jeziku strane. */
  door: { yaw: number; pitch: number; label: string };
};

type StoryRoomRow = {
  id: string;
  title: string | null;
  title_i18n: unknown;
  establish_i18n: unknown;
  waypoints_i18n: unknown;
  panorama_url_mobile: string | null;
  floorplan_x: number | null;
  floorplan_y: number | null;
};

type Waypoint = {
  type?: string;
  yaw?: number;
  pitch?: number;
  targetRoomId?: string;
  text?: unknown;
  title_i18n?: unknown;
  text_i18n?: unknown;
};

function parse<T>(value: unknown): T | null {
  if (typeof value !== 'string') return (value as T) ?? null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/** Adresa kroz Next-ov optimizator slika; širina mora biti jedna od deviceSizes. */
function optimized(src: string, width: 2048 | 3840): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}

/** Prva rečenica, bez duplih razmaka - kartica hotspota je mala. */
function firstSentence(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  const end = clean.search(/[.!?](\s|$)/);
  return end === -1 ? clean : clean.slice(0, end + 1);
}

// Natpisi na šematskom tlocrtu su upisani na srpskom (pravi ih editor plana).
// Na /en se zamenjuju engleskim, inače bi posetilac čitao "Dnevna soba" i
// "Šematski prikaz" usred engleske strane (pregled 23. 10. 2026). Nepoznat
// natpis ostaje kakav jeste.
const PLAN_LABELS_EN: [RegExp, string][] = [
  [/^Šematski prikaz — nije u razmeri$/, 'Schematic — not to scale'],
  [/^Dnevna soba$/, 'Living room'],
  [/^Dnevni boravak$/, 'Living room'],
  [/^Dnevna-radni$/, 'Living / study'],
  [/^Spavaća soba (\d+)$/, 'Bedroom $1'],
  [/^Spavaća soba$/, 'Bedroom'],
  [/^Soba (\d+)$/, 'Room $1'],
  [/^Kuhinja(?: sa trpezarijom)?$/, 'Kitchen'],
  [/^Trpezarija$/, 'Dining room'],
  [/^Kupatilo$/, 'Bathroom'],
  [/^Toalet$/, 'Toilet'],
  [/^Ulaz-hodnik$/, 'Entrance hall'],
  [/^Hodnik$/, 'Hallway'],
  [/^Terasa$/, 'Terrace'],
  [/^Ostava$/, 'Storage']
];

function translatePlanLabels(svg: string, lang: HomeLang): string {
  if (lang === 'sr') return svg;
  return svg.replace(/(<text\b[^>]*>)([^<]*)(<\/text>)/g, (all, open: string, label: string, close: string) => {
    const text = label.trim();
    const hit = PLAN_LABELS_EN.find(([re]) => re.test(text));
    return hit ? open + text.replace(hit[0], hit[1]) + close : all;
  });
}

export async function getStoryData(lang: HomeLang): Promise<StoryData | null> {
  const fail = (why: string) => {
    console.error(`[tourStory] ${why}`);
    return null;
  };

  const { data: tour, error } = await supabase
    .from('tours')
    .select('slug, floorplan_url')
    .eq('slug', STORY.slug)
    .maybeSingle();
  if (error || !tour?.floorplan_url) return fail(error?.message ?? 'tura ili tlocrt ne postoji');

  const { data: rows, error: roomsErr } = await supabase
    .from('rooms')
    .select('id, title, title_i18n, establish_i18n, waypoints_i18n, panorama_url_mobile, floorplan_x, floorplan_y')
    .eq('tour_slug', STORY.slug)
    .returns<StoryRoomRow[]>();
  if (roomsErr || !rows?.length) return fail(roomsErr?.message ?? 'nema soba');

  let svg: string;
  try {
    // Rok od 5 s: zaglavljen CDN ne sme da zadrži osvežavanje početne (ISR);
    // posle roka sekcija se samo ne prikazuje.
    const res = await fetch(tour.floorplan_url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return fail(`tlocrt ${res.status}`);
    svg = await res.text();
  } catch (e) {
    return fail(`tlocrt: ${(e as Error).message}`);
  }
  const box = svg.match(/viewBox="([-\d.\s]+)"/)?.[1].trim().split(/\s+/).map(Number);
  const inner = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1];
  if (!box || box.length !== 4 || box.some((n) => !Number.isFinite(n)) || !inner) return fail('tlocrt bez viewBox-a');
  const planBox = box as [number, number, number, number];
  // Stil plana je globalan kad je SVG u strani (.note bi pregazio podnaslove
  // sajta), pa se izbacuje; isti izgled daje CSS sekcije (siteStyles .story-plan).
  const planSvg = translatePlanLabels(inner.replace(/<style[\s\S]*?<\/style>/g, ''), lang);

  const asRoom = (r: StoryRoomRow) => r as unknown as Room;
  const aspect = planBox[2] / planBox[3];
  const cams = rows
    .filter((r) => typeof r.floorplan_x === 'number' && typeof r.floorplan_y === 'number')
    .map((r) => ({
      roomId: r.id,
      x: planBox[0] + (planBox[2] * (r.floorplan_x as number)) / 100,
      y: planBox[1] + (planBox[3] * (r.floorplan_y as number)) / 100
    }));

  const roomA = rows.find((r) => r.id === STORY.roomA);
  const roomB = rows.find((r) => r.id === STORY.roomB);
  if (!roomA?.panorama_url_mobile || !roomB?.panorama_url_mobile) return fail('soba A ili B bez panorame');

  const waypoints = parse<Waypoint[]>(roomA.waypoints_i18n) ?? [];
  const info = waypoints.find((w) => w.type === 'info' && pickLang(w.title_i18n, 'sr') === STORY.hotspotTitle);
  const door = waypoints.find((w) => w.type === 'navigation' && w.targetRoomId === STORY.roomB);
  if (!info || !door || typeof info.yaw !== 'number' || typeof door.yaw !== 'number') return fail('nema hotspota ili strelice');

  const establish = (r: StoryRoomRow) => parse<{ fromYaw?: number; text_i18n?: Record<string, string> }>(r.establish_i18n) ?? {};
  const estB = establish(roomB);
  const subtitles = {} as Record<StoryLang, string>;
  for (const l of STORY_LANGS) subtitles[l] = (estB.text_i18n?.[l] ?? '').trim();
  if (STORY_LANGS.some((l) => !subtitles[l])) return fail('soba B nema uvodni tekst na sva 4 jezika');

  const room = (r: StoryRoomRow): StoryRoom => ({
    roomId: r.id,
    title: pickLang(r.title_i18n, lang) || r.title || '',
    panorama: { phone: optimized(r.panorama_url_mobile as string, 2048), desktop: optimized(r.panorama_url_mobile as string, 3840) },
    startYaw: establish(r).fromYaw ?? 0,
    heading: planHeadingFor(r.id, rows.map(asRoom), aspect)
  });

  return {
    slug: STORY.slug,
    planSvg,
    planBox,
    cams,
    a: room(roomA),
    b: { ...room(roomB), subtitles },
    hotspot: {
      yaw: info.yaw,
      pitch: info.pitch ?? 0,
      title: pickLang(info.title_i18n, lang),
      text: firstSentence(pickLang(info.text_i18n, lang))
    },
    // Natpis strelice postoji samo na srpskom; za drugi jezik prazno, pa
    // sekcija uzima svoj tekst (homeCopy story.doorFallback).
    door: { yaw: door.yaw, pitch: door.pitch ?? 0, label: (parse<Record<string, string>>(door.text) ?? {})[lang]?.trim() ?? '' }
  };
}
