/**
 * Šematski tlocrt kao podaci (raspored) i njegovo crtanje u SVG.
 *
 * Raspored nastaje automatski (lib/schematicFloorplan.ts), a vlasnik ga
 * ispravlja u editoru (/admin/plan/[slug]). Ista funkcija crta i u editoru
 * i pri čuvanju, pa je sačuvani plan tačno ono što se videlo u editoru.
 * Bez zavisnosti - radi i u pregledaču i na serveru.
 *
 * Model:
 *  - shape: pravougaonik u jedinicama plana (1 jedinica ≈ 1 px na planu
 *    širine ~900).
 *  - group: prostorija. Više pravougaonika iste grupe crta se kao JEDNA
 *    prostorija bez zida između (npr. hodnik u obliku slova L).
 *  - doors: parovi grupa između kojih se crta otvor na zajedničkom zidu;
 *    treći broj bira zid kad dve prostorije dele više zidova (L-oblik).
 *  - rooms: sobe ture (panorame) -> grupa u kojoj stoji njihova oznaka;
 *    x/y = mesto oznake koje je vlasnik ručno postavio (inače ispod natpisa).
 */

import { DOOR_M, formatArea, groupAreaM2, totalAreaM2 } from './floorplanMeasure.ts';

export type PlanLang = 'sr' | 'en' | 'de' | 'ru';
export type ForeignLang = Exclude<PlanLang, 'sr'>;
export const FOREIGN_LANGS: ForeignLang[] = ['en', 'de', 'ru'];

export type PlanShape = {
  id: string;
  group: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Vlasnik je upisao mere ovog pravougaonika (metri = w / unitsPerMeter). */
  measured?: boolean;
};

export type PlanGroup = {
  id: string;
  /** Naziv na srpskom. */
  label: string;
  outdoor: boolean;
  /** Ručno pomeren natpis (sredina, u jedinicama plana); inače u sredini prostorije. */
  lx?: number;
  ly?: number;
  /** Naziv na drugim jezicima ture (automatski ili ručno). */
  labels?: Partial<Record<ForeignLang, string>>;
  /** Jezici čiji je naziv vlasnik ručno upisao - automatika ih ne dira. */
  labelsManual?: ForeignLang[];
};

/**
 * Vrata između dve grupe. Stari planovi su čuvali niz [a, b] ili [a, b, zid]
 * - to se čita kao prolaz na sredini zida (vidi normalizeDoor).
 */
export type PlanDoor = {
  a: string;
  b: string;
  /** Koji zajednički zid kad ih ima više (0 = najduži). */
  wall?: number;
  /** Sredina vrata duž zida, 0..1 (podrazumevano 0.5). */
  at?: number;
  /** 'door' = krilo i luk; 'opening' = samo otvor (podrazumevano). */
  kind?: 'door' | 'opening';
  /** Grupa u koju se vrata otvaraju (a ili b). */
  into?: string;
  /** Šarka na početku (manja koordinata) ili na kraju otvora duž zida. */
  hinge?: 'start' | 'end';
};

export type FloorplanLayout = {
  version: 1;
  groups: PlanGroup[];
  shapes: PlanShape[];
  doors: PlanDoor[];
  /** ID sobe ture -> ID grupe (+ ručno postavljena oznaka). */
  rooms: PlanRoom[];
  /** Merilo: jedinica plana po metru. Postoji tek kad je bar jedan pravougaonik izmeren. */
  unitsPerMeter?: number;
};

export type PlanRoom = { roomId: string; group: string; x?: number; y?: number };

export const PLAN_WALL = 7;
export const PLAN_PAD = 36;
export const PLAN_FOOTER = 42;
export const PLAN_DOOR = 34;
export const PLAN_MIN_SHARED = PLAN_DOOR + 12;

type Rect = { x: number; y: number; w: number; h: number };

/** Zajednički zid dva pravougaonika (null ako se ne dodiruju). */
export function sharedWall(
  a: Rect,
  b: Rect,
  eps = 0.5
): { length: number; vertical: boolean; at: number; from: number; to: number } | null {
  for (const [l, r] of [
    [a, b],
    [b, a]
  ]) {
    if (Math.abs(l.x + l.w - r.x) < eps) {
      const from = Math.max(l.y, r.y);
      const to = Math.min(l.y + l.h, r.y + r.h);
      if (to > from) return { length: to - from, vertical: true, at: r.x, from, to };
    }
    if (Math.abs(l.y + l.h - r.y) < eps) {
      const from = Math.max(l.x, r.x);
      const to = Math.min(l.x + l.w, r.x + r.w);
      if (to > from) return { length: to - from, vertical: false, at: r.y, from, to };
    }
  }
  return null;
}

/** Najduži zajednički zid između dve grupe (preko svih njihovih pravougaonika). */
export function groupWall(layout: FloorplanLayout, a: string, b: string) {
  let best: ReturnType<typeof sharedWall> = null;
  for (const sa of layout.shapes.filter((s) => s.group === a)) {
    for (const sb of layout.shapes.filter((s) => s.group === b)) {
      const w = sharedWall(sa, sb);
      if (w && (!best || w.length > best.length)) best = w;
    }
  }
  return best;
}

/** Svi zajednički zidovi dve grupe dovoljno dugi za vrata, najduži prvi. */
export function groupWalls(layout: FloorplanLayout, a: string, b: string) {
  const walls: NonNullable<ReturnType<typeof sharedWall>>[] = [];
  for (const sa of layout.shapes.filter((s) => s.group === a)) {
    for (const sb of layout.shapes.filter((s) => s.group === b)) {
      const w = sharedWall(sa, sb);
      if (w && w.length >= PLAN_MIN_SHARED) walls.push(w);
    }
  }
  return walls.sort((x, y) => y.length - x.length);
}

/** Grupe koje sa datom grupom dele dovoljno dug zid za vrata. */
export function adjacentGroups(layout: FloorplanLayout, group: string): string[] {
  return layout.groups
    .filter((g) => g.id !== group)
    .filter((g) => (groupWall(layout, group, g.id)?.length ?? 0) >= PLAN_MIN_SHARED)
    .map((g) => g.id);
}

export function doorKey(a: string, b: string): string {
  return [a, b].sort().join('|');
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Najveći pravougaonik grupe - tu ide natpis i oznake soba. */
export function mainShape(layout: FloorplanLayout, group: string): PlanShape | undefined {
  return layout.shapes.filter((s) => s.group === group).sort((a, b) => b.w * b.h - a.w * a.h)[0];
}

/** Razmak reda oznaka ispod natpisa i razmak između oznaka u redu. */
const MARKER_ROW = 44;
const MARKER_GAP = 56;

type LabelBox = {
  lines: string[];
  size: number;
  vertical: boolean;
  cx: number;
  cy: number;
  /** Red sa kvadraturom ispod naziva (samo izmerena prostorija). */
  area?: string;
  /** Visina celog natpisa (nazivi + m²), za okvir i oznake ispod. */
  block: number;
};

const AREA_SCALE = 0.72;

/** Naziv prostorije na jeziku; bez prevoda - srpski. */
export function groupLabel(group: PlanGroup, lang: PlanLang): string {
  return (lang !== 'sr' && group.labels?.[lang]) || group.label;
}

/** Natpis u dva reda najviše, sitniji ako prostorija ne može da ga primi. */
function labelBox(group: PlanGroup, r: Rect, lang: PlanLang = 'sr', area?: string): LabelBox {
  const label = groupLabel(group, lang);
  const words = label.split(/\s+/);
  let lines = [label];
  if (label.length > 12 && words.length > 1) {
    let best = [label, ''];
    let bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      const d = Math.abs(a.length - b.length);
      if (d < bestDiff) {
        bestDiff = d;
        best = [a, b];
      }
    }
    lines = best;
  }
  const longest = Math.max(...lines.map((l) => l.length));
  const rows = lines.length + (area ? AREA_SCALE : 0);
  // Natpis malo iznad sredine - ispod njega ide red oznaka panorama.
  const fit = (along: number, across: number) =>
    Math.max(12, Math.min(34, (along - 16) / (longest * 0.62), (across - 10 - (across > 2 * MARKER_ROW ? MARKER_ROW : 0)) / (rows * 1.35)));
  // Uska, visoka prostorija (ostava, terasa): uspravan natpis ako tako staje osetno veći.
  const vertical = r.h > r.w * 1.2 && fit(r.h, r.w) > fit(r.w, r.h) * 1.25;
  const across = vertical ? r.w : r.h;
  const room = across > 2 * MARKER_ROW;
  const size = vertical ? fit(r.h, r.w) : fit(r.w, r.h);
  const shift = room ? MARKER_ROW / 2 : 0;
  const moved = group.lx !== undefined && group.ly !== undefined;
  return {
    lines,
    size,
    vertical,
    cx: moved ? group.lx! : r.x + r.w / 2 - (vertical ? shift : 0),
    cy: moved ? group.ly! : r.y + r.h / 2 - (vertical ? 0 : shift),
    area,
    block: rows * size * 1.2
  };
}

/** Kvadratura za natpis prostorije ("14,1 m²") - samo kad je izmerena. */
function areaText(layout: FloorplanLayout, groupId: string, lang: PlanLang): string | undefined {
  const m2 = groupAreaM2(layout, groupId);
  return m2 === null ? undefined : formatArea(m2, lang);
}

/** Okvir natpisa prostorije (za hvatanje mišem u editoru). */
export function labelArea(layout: FloorplanLayout, groupId: string, lang: PlanLang = 'sr'): Rect & { cx: number; cy: number } | null {
  const g = layout.groups.find((x) => x.id === groupId);
  const s = mainShape(layout, groupId);
  if (!g || !s) return null;
  const { lines, size, vertical, cx, cy, block } = labelBox(g, s, lang, areaText(layout, groupId, lang));
  const along = Math.max(...lines.map((l) => l.length)) * size * 0.6 + 8;
  const across = block + 4;
  const w = vertical ? across : along;
  const h = vertical ? along : across;
  return { x: cx - w / 2, y: cy - h / 2, w, h, cx, cy };
}

function labelSvg(group: PlanGroup, r: Rect, lang: PlanLang, area: string | undefined): string {
  const { lines, size, vertical, cx, cy, block } = labelBox(group, r, lang, area);
  const rotate = vertical ? ` transform="rotate(-90 ${cx.toFixed(1)} ${cy.toFixed(1)})"` : '';
  // Redovi se slažu odozgo; ceo blok (nazivi + m²) je centriran na cy.
  const top = cy - block / 2;
  const text = lines.map((l, i) => {
    const y = top + (i + 0.5) * size * 1.2;
    return `<text x="${cx.toFixed(1)}" y="${y.toFixed(1)}" font-size="${size.toFixed(1)}" text-anchor="middle" dominant-baseline="middle"${rotate}>${escapeXml(l)}</text>`;
  });
  if (area) {
    const y = top + (lines.length + AREA_SCALE / 2) * size * 1.2;
    text.push(
      `<text x="${cx.toFixed(1)}" y="${y.toFixed(1)}" font-size="${(size * AREA_SCALE).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" class="area"${rotate}>${escapeXml(area)}</text>`
    );
  }
  return text.join('');
}

/** Širina vrata: stalna; sa merilom tačno 80 cm. */
export function doorWidth(layout: FloorplanLayout): number {
  return layout.unitsPerMeter ? DOOR_M * layout.unitsPerMeter : PLAN_DOOR;
}

export type DoorGeometry = {
  vertical: boolean;
  /** Koordinata zida (x za uspravan, y za vodoravan zid). */
  at: number;
  /** Početak i kraj zajedničkog zida duž zida. */
  from: number;
  to: number;
  /** Sredina otvora duž zida. */
  center: number;
  width: number;
};

/** Zid na kom stoje vrata (izabrani zajednički zid, a ako je kraći od praga - najduži dodir). */
function doorWall(layout: FloorplanLayout, door: PlanDoor) {
  const walls = groupWalls(layout, door.a, door.b);
  if (walls.length) return walls[(door.wall ?? 0) % walls.length];
  const w = groupWall(layout, door.a, door.b);
  return w && w.length > 2 * PLAN_WALL + 12 ? w : null;
}

/**
 * Gde tačno stoje vrata: `at` duž zida, ograničeno tako da otvor ostane ceo
 * na zidu. Kad je zid prekratak za punu širinu, vrata se stisnu na sredinu
 * umesto da nestanu.
 */
export function doorGeometry(layout: FloorplanLayout, door: PlanDoor): DoorGeometry | null {
  const w = doorWall(layout, door);
  if (!w) return null;
  const full = doorWidth(layout);
  const length = w.to - w.from;
  if (length < full + 2 * PLAN_WALL) {
    return { vertical: w.vertical, at: w.at, from: w.from, to: w.to, center: (w.from + w.to) / 2, width: Math.max(12, length - 2 * PLAN_WALL) };
  }
  const lo = w.from + full / 2 + PLAN_WALL;
  const hi = w.to - full / 2 - PLAN_WALL;
  const center = Math.min(hi, Math.max(lo, w.from + (door.at ?? 0.5) * length));
  return { vertical: w.vertical, at: w.at, from: w.from, to: w.to, center, width: full };
}

/** Položaj vrata (0..1 duž zida) za tačku pokazivača - prevlačenje u editoru. */
export function doorAtFromPoint(layout: FloorplanLayout, door: PlanDoor, p: { x: number; y: number }): number {
  const w = doorWall(layout, door);
  if (!w || w.to <= w.from) return door.at ?? 0.5;
  const along = w.vertical ? p.y : p.x;
  return Math.min(1, Math.max(0, (along - w.from) / (w.to - w.from)));
}

const n = (v: number) => String(Math.round(v * 10) / 10);

/** Otvor u zidu, a za prava vrata i krilo sa lukom otvaranja. */
function doorSvg(layout: FloorplanLayout, door: PlanDoor): string {
  const g = doorGeometry(layout, door);
  if (!g) return '';
  const half = g.width / 2;
  // Tačka: (duž zida, preko zida) -> (x, y).
  const xy = (along: number, across: number) => (g.vertical ? { x: n(across), y: n(along) } : { x: n(along), y: n(across) });
  const a1 = xy(g.center - half, g.at);
  const a2 = xy(g.center + half, g.at);
  const gap = `<line x1="${a1.x}" y1="${a1.y}" x2="${a2.x}" y2="${a2.y}" class="door"/>`;
  if (door.kind !== 'door') return gap;

  const into = mainShape(layout, door.into ?? door.b);
  if (!into) return gap;
  const intoCenter = g.vertical ? into.x + into.w / 2 : into.y + into.h / 2;
  const side = intoCenter >= g.at ? 1 : -1;
  const hinge = door.hinge === 'end' ? g.center + half : g.center - half;
  const other = door.hinge === 'end' ? g.center - half : g.center + half;
  const dirOther = Math.sign(other - hinge);
  const h = xy(hinge, g.at);
  const leaf = xy(hinge, g.at + side * g.width);
  const end = xy(other, g.at);
  // Smer luka (SVG y raste nadole): za uspravan zid side·dir, za vodoravan obrnuto.
  const sweep = (g.vertical ? side * dirOther : -side * dirOther) > 0 ? 1 : 0;
  return (
    gap +
    `<line x1="${h.x}" y1="${h.y}" x2="${leaf.x}" y2="${leaf.y}" class="leaf"/>` +
    `<path d="M${leaf.x} ${leaf.y} A${n(g.width)} ${n(g.width)} 0 0 ${sweep} ${end.x} ${end.y}" class="swing"/>`
  );
}

const NOTES: Record<PlanLang, { none: string; scale: string; total: string }> = {
  sr: { none: 'Šematski prikaz — nije u razmeri', scale: 'Mere su orijentacione', total: 'ukupno' },
  en: { none: 'Schematic — not to scale', scale: 'Dimensions are approximate', total: 'total' },
  de: { none: 'Schematische Darstellung — nicht maßstabsgetreu', scale: 'Maße sind ungefähr', total: 'gesamt' },
  ru: { none: 'Схема — не в масштабе', scale: 'Размеры ориентировочные', total: 'всего' }
};

/** Napomena na dnu plana: bez merila "nije u razmeri", sa merilom ukupna kvadratura izmerenih prostorija. */
export function planNote(layout: FloorplanLayout, lang: PlanLang): string {
  const t = NOTES[lang];
  if (!layout.unitsPerMeter) return t.none;
  const total = totalAreaM2(layout);
  return total === null ? t.scale : `${t.scale} · ${t.total} ${formatArea(total, lang)}`;
}

export type Bounds = { x: number; y: number; w: number; h: number };

export function layoutBounds(layout: FloorplanLayout): Bounds {
  if (!layout.shapes.length) return { x: 0, y: 0, w: 100, h: 100 };
  const x1 = Math.min(...layout.shapes.map((s) => s.x));
  const y1 = Math.min(...layout.shapes.map((s) => s.y));
  const x2 = Math.max(...layout.shapes.map((s) => s.x + s.w));
  const y2 = Math.max(...layout.shapes.map((s) => s.y + s.h));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/**
 * Unutrašnjost SVG-a (zidovi, vrata, natpisi) u koordinatama rasporeda.
 * Editor je crta ispod svojih ručica; renderFloorplanSvg je uokviruje.
 */
export function renderFloorplanBody(layout: FloorplanLayout, lang: PlanLang = 'sr'): string {
  const groups = new Map(layout.groups.map((g) => [g.id, g]));
  const byOutdoor = [...layout.shapes].sort(
    (a, b) => Number(!groups.get(a.group)?.outdoor) - Number(!groups.get(b.group)?.outdoor)
  );

  // Spoljni prostori prvi: zid koji dele sa stanom ostaje pun, ne isprekidan.
  const rects = byOutdoor
    .map((s) => {
      const outdoor = groups.get(s.group)?.outdoor;
      return `<rect x="${s.x.toFixed(1)}" y="${s.y.toFixed(1)}" width="${s.w.toFixed(1)}" height="${s.h.toFixed(1)}" class="${outdoor ? 'room outdoor' : 'room'}"/>`;
    })
    .join('');

  // Delovi iste prostorije: zid između njih se briše (ostaju uglovi) - i kad
  // se delovi samo dodiruju i kad se preklapaju. Briše se deo ivice iza kog
  // se nastavlja drugi deo iste prostorije.
  const seams: string[] = [];
  const inset = PLAN_WALL / 2 + 0.5;
  for (const a of layout.shapes) {
    for (const b of layout.shapes) {
      if (a === b || a.group !== b.group) continue;
      const cls = groups.get(a.group)?.outdoor ? 'seam outdoor-seam' : 'seam';
      const edges = [
        { vertical: true, at: a.x, covered: b.x < a.x - 1 && b.x + b.w > a.x - 1 },
        { vertical: true, at: a.x + a.w, covered: b.x < a.x + a.w + 1 && b.x + b.w > a.x + a.w + 1 },
        { vertical: false, at: a.y, covered: b.y < a.y - 1 && b.y + b.h > a.y - 1 },
        { vertical: false, at: a.y + a.h, covered: b.y < a.y + a.h + 1 && b.y + b.h > a.y + a.h + 1 }
      ];
      for (const e of edges) {
        if (!e.covered) continue;
        const from = e.vertical ? Math.max(a.y, b.y) : Math.max(a.x, b.x);
        const to = e.vertical ? Math.min(a.y + a.h, b.y + b.h) : Math.min(a.x + a.w, b.x + b.w);
        if (to - from <= 2 * inset) continue;
        seams.push(
          e.vertical
            ? `<line x1="${e.at}" y1="${from + inset}" x2="${e.at}" y2="${to - inset}" class="${cls}"/>`
            : `<line x1="${from + inset}" y1="${e.at}" x2="${to - inset}" y2="${e.at}" class="${cls}"/>`
        );
      }
    }
  }

  const doors = layout.doors.map((d) => doorSvg(layout, d)).join('');

  const labels = layout.groups
    .map((g) => {
      const s = mainShape(layout, g.id);
      return s ? labelSvg(g, s, lang, areaText(layout, g.id, lang)) : '';
    })
    .join('');

  return `${rects}${seams.join('')}${doors}${labels}`;
}

export const PLAN_STYLE = `.room{fill:#F7F7F4;stroke:#2B2D33;stroke-width:${PLAN_WALL};stroke-linejoin:miter}
.outdoor{fill:#EEF3F8;stroke-dasharray:14 8;stroke-width:4}
.seam{stroke:#F7F7F4;stroke-width:${PLAN_WALL + 3};stroke-linecap:butt}
.outdoor-seam{stroke:#EEF3F8}
.door{stroke:#F7F7F4;stroke-width:${PLAN_WALL + 3};stroke-linecap:butt}
text{font-family:Inter,Arial,Helvetica,sans-serif;fill:#2B2D33;font-weight:700}
.note{font-size:15px;fill:#8C8E93;font-weight:500}
.area{fill:#6B6D73;font-weight:500}
.leaf,.swing{fill:none;stroke:#2B2D33;stroke-width:1.5}`;

/** Ceo, uokviren SVG plana - ono što ide u turu. */
export function renderFloorplanSvg(layout: FloorplanLayout, lang: PlanLang = 'sr'): { svg: string; width: number; height: number; bounds: Bounds } {
  const b = layoutBounds(layout);
  const vx = b.x - PLAN_PAD;
  const vy = b.y - PLAN_PAD;
  const width = Math.round(b.w + 2 * PLAN_PAD);
  const height = Math.round(b.h + 2 * PLAN_PAD + PLAN_FOOTER);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${width} ${height}" width="${width}" height="${height}">
<style>
${PLAN_STYLE}
</style>
<rect x="${vx.toFixed(1)}" y="${vy.toFixed(1)}" width="${width}" height="${height}" fill="#FFFFFF"/>
${renderFloorplanBody(layout, lang)}
<text x="${(vx + width / 2).toFixed(1)}" y="${(vy + height - PLAN_FOOTER / 2).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" class="note">${escapeXml(planNote(layout, lang))}</text>
</svg>`;
  return { svg, width, height, bounds: { x: vx, y: vy, w: width, h: height } };
}

export type MarkerPoint = { roomId: string; group: string; x: number; y: number; manual: boolean };

/**
 * Mesto oznake svake sobe ture u koordinatama plana: ručno postavljeno, a
 * inače u redu ispod natpisa prostorije (da tačka ne pokriva naziv).
 */
export function markerPoints(layout: FloorplanLayout): MarkerPoint[] {
  const byGroup = new Map<string, PlanRoom[]>();
  for (const r of layout.rooms) {
    const list = byGroup.get(r.group) ?? [];
    list.push(r);
    byGroup.set(r.group, list);
  }
  const clamp = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
  const margin = PLAN_WALL + 18;
  const out: MarkerPoint[] = [];
  for (const [group, list] of byGroup) {
    const s = mainShape(layout, group);
    const g = layout.groups.find((x) => x.id === group);
    if (!s || !g) continue;
    // Oznake stoje isto na svim jezicima (floorplan_x/_y je jedan), pa se
    // mesto računa od srpskog natpisa, sa redom m² ako ga ima.
    const box = labelBox(g, s, 'sr', areaText(layout, group, 'sr'));
    const half = box.block / 2;
    const auto = list.filter((r) => r.x === undefined || r.y === undefined);
    for (const r of list) {
      if (r.x !== undefined && r.y !== undefined) {
        out.push({ roomId: r.roomId, group, x: r.x, y: r.y, manual: true });
        continue;
      }
      const spread = (auto.indexOf(r) - (auto.length - 1) / 2) * MARKER_GAP;
      const x = box.vertical ? box.cx + half + MARKER_ROW / 2 + 4 : box.cx + spread;
      const y = box.vertical ? box.cy + spread : box.cy + half + MARKER_ROW / 2 + 4;
      out.push({
        roomId: r.roomId,
        group,
        x: clamp(x, s.x + margin, s.x + s.w - margin),
        y: clamp(y, s.y + margin, s.y + s.h - margin),
        manual: false
      });
    }
  }
  return out;
}

/** Oznake u procentima slike (floorplan_x / _y) za sačuvani SVG. */
export function layoutMarkers(layout: FloorplanLayout, frame: Bounds): { roomId: string; xPct: number; yPct: number }[] {
  return markerPoints(layout).map((p) => ({
    roomId: p.roomId,
    xPct: Math.round(((p.x - frame.x) / frame.w) * 1000) / 10,
    yPct: Math.round(((p.y - frame.y) / frame.h) * 1000) / 10
  }));
}

/**
 * Vrata iz sačuvanog JSON-a: stari niz [a, b] / [a, b, zid] ili objekat.
 * Null ako vrata vode u nepostojeću grupu; neispravna opciona polja se samo izostave.
 */
export function normalizeDoor(d: unknown, groupIds: Set<string>): PlanDoor | null {
  let door: Record<string, unknown>;
  if (Array.isArray(d)) {
    if (d.length < 2 || d.length > 3) return null;
    door = { a: d[0], b: d[1], wall: d[2] };
  } else if (d && typeof d === 'object') {
    door = d as Record<string, unknown>;
  } else return null;
  const a = String(door.a ?? '');
  const b = String(door.b ?? '');
  if (!groupIds.has(a) || !groupIds.has(b)) return null;
  const out: PlanDoor = { a, b };
  if (Number.isInteger(door.wall) && (door.wall as number) >= 0 && (door.wall as number) < 20) out.wall = door.wall as number;
  if (typeof door.at === 'number' && door.at >= 0 && door.at <= 1) out.at = door.at;
  if (door.kind === 'door' || door.kind === 'opening') out.kind = door.kind;
  if (door.into === a || door.into === b) out.into = door.into as string;
  if (door.hinge === 'start' || door.hinge === 'end') out.hinge = door.hinge;
  return out;
}

/** Provera rasporeda koji stiže sa klijenta (API). Null ako nije ispravan. */
export function parseLayout(input: unknown): FloorplanLayout | null {
  if (!input || typeof input !== 'object') return null;
  const l = input as Record<string, unknown>;
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 100_000;
  const str = (v: unknown, max = 80) => typeof v === 'string' && v.length > 0 && v.length <= max;
  if (!Array.isArray(l.groups) || !Array.isArray(l.shapes) || !Array.isArray(l.doors) || !Array.isArray(l.rooms)) return null;
  if (l.groups.length > 60 || l.shapes.length > 120) return null;

  const groups: PlanGroup[] = [];
  for (const g of l.groups as Record<string, unknown>[]) {
    if (!str(g?.id) || typeof g.label !== 'string' || g.label.length > 60) return null;
    const group: PlanGroup = { id: String(g.id), label: g.label.trim() || ' ', outdoor: Boolean(g.outdoor) };
    if (num(g.lx) && num(g.ly)) {
      group.lx = g.lx as number;
      group.ly = g.ly as number;
    }
    if (g.labels && typeof g.labels === 'object') {
      const src = g.labels as Record<string, unknown>;
      const labels: Partial<Record<ForeignLang, string>> = {};
      for (const lang of FOREIGN_LANGS) {
        const v = src[lang];
        if (typeof v === 'string' && v.trim() && v.length <= 60) labels[lang] = v.trim();
      }
      if (Object.keys(labels).length) group.labels = labels;
    }
    if (Array.isArray(g.labelsManual)) {
      const manual = FOREIGN_LANGS.filter((lang) => (g.labelsManual as unknown[]).includes(lang));
      if (manual.length) group.labelsManual = manual;
    }
    groups.push(group);
  }
  const groupIds = new Set(groups.map((g) => g.id));
  const shapes: PlanShape[] = [];
  for (const s of l.shapes as Record<string, unknown>[]) {
    if (!str(s?.id) || !groupIds.has(String(s.group)) || ![s.x, s.y, s.w, s.h].every(num)) return null;
    if ((s.w as number) < 5 || (s.h as number) < 5) return null;
    const shape: PlanShape = { id: String(s.id), group: String(s.group), x: s.x as number, y: s.y as number, w: s.w as number, h: s.h as number };
    if (s.measured === true) shape.measured = true;
    shapes.push(shape);
  }
  const doors: PlanDoor[] = [];
  for (const d of l.doors as unknown[]) {
    const door = normalizeDoor(d, groupIds);
    if (!door) return null;
    doors.push(door);
  }
  const rooms: PlanRoom[] = [];
  for (const r of l.rooms as Record<string, unknown>[]) {
    if (!str(r?.roomId, 64) || !groupIds.has(String(r.group))) return null;
    const room: PlanRoom = { roomId: String(r.roomId), group: String(r.group) };
    if (num(r.x) && num(r.y)) {
      room.x = r.x as number;
      room.y = r.y as number;
    }
    rooms.push(room);
  }
  if (!shapes.length) return null;
  const layout: FloorplanLayout = { version: 1, groups, shapes, doors, rooms };
  const upm = l.unitsPerMeter;
  // Merilo bez ijednog izmerenog dela (npr. obrisana jedina izmerena prostorija) ne važi.
  if (typeof upm === 'number' && Number.isFinite(upm) && upm >= 0.5 && upm <= 2000 && shapes.some((s) => s.measured)) layout.unitsPerMeter = upm;
  return layout;
}
