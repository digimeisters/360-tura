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

export type PlanShape = {
  id: string;
  group: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PlanGroup = {
  id: string;
  label: string;
  outdoor: boolean;
  /** Ručno pomeren natpis (sredina, u jedinicama plana); inače u sredini prostorije. */
  lx?: number;
  ly?: number;
};

export type DoorSpec = [string, string] | [string, string, number];

export type FloorplanLayout = {
  version: 1;
  groups: PlanGroup[];
  shapes: PlanShape[];
  /** Parovi ID-jeva grupa sa vratima; opcioni treći broj = koji zajednički zid (0 = najduži). */
  doors: DoorSpec[];
  /** ID sobe ture -> ID grupe (+ ručno postavljena oznaka). */
  rooms: PlanRoom[];
};

export type PlanRoom = { roomId: string; group: string; x?: number; y?: number };

export const PLAN_WALL = 7;
export const PLAN_PAD = 36;
export const PLAN_FOOTER = 42;
export const PLAN_DOOR = 34;
export const PLAN_MIN_SHARED = PLAN_DOOR + 12;
export const PLAN_NOTE = 'Šematski prikaz — nije u razmeri';

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

type LabelBox = { lines: string[]; size: number; vertical: boolean; cx: number; cy: number };

/** Natpis u dva reda najviše, sitniji ako prostorija ne može da ga primi. */
function labelBox(group: PlanGroup, r: Rect): LabelBox {
  const label = group.label;
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
  // Natpis malo iznad sredine - ispod njega ide red oznaka panorama.
  const fit = (along: number, across: number) =>
    Math.max(12, Math.min(34, (along - 16) / (longest * 0.62), (across - 10 - (across > 2 * MARKER_ROW ? MARKER_ROW : 0)) / (lines.length * 1.35)));
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
    cy: moved ? group.ly! : r.y + r.h / 2 - (vertical ? 0 : shift)
  };
}

/** Okvir natpisa prostorije (za hvatanje mišem u editoru). */
export function labelArea(layout: FloorplanLayout, groupId: string): Rect & { cx: number; cy: number } | null {
  const g = layout.groups.find((x) => x.id === groupId);
  const s = mainShape(layout, groupId);
  if (!g || !s) return null;
  const { lines, size, vertical, cx, cy } = labelBox(g, s);
  const along = Math.max(...lines.map((l) => l.length)) * size * 0.6 + 8;
  const across = lines.length * size * 1.2 + 4;
  const w = vertical ? across : along;
  const h = vertical ? along : across;
  return { x: cx - w / 2, y: cy - h / 2, w, h, cx, cy };
}

function labelSvg(group: PlanGroup, r: Rect): string {
  const { lines, size, vertical, cx, cy } = labelBox(group, r);
  const rotate = vertical ? ` transform="rotate(-90 ${cx.toFixed(1)} ${cy.toFixed(1)})"` : '';
  return lines
    .map((l, i) => {
      const offset = (i - (lines.length - 1) / 2) * size * 1.2;
      return `<text x="${cx.toFixed(1)}" y="${(cy + offset).toFixed(1)}" font-size="${size.toFixed(1)}" text-anchor="middle" dominant-baseline="middle"${rotate}>${escapeXml(l)}</text>`;
    })
    .join('');
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
export function renderFloorplanBody(layout: FloorplanLayout): string {
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

  const doors = layout.doors
    .map(([a, b, wallIndex]) => {
      const walls = groupWalls(layout, a, b);
      if (!walls.length) return '';
      const w = walls[(wallIndex ?? 0) % walls.length];
      const mid = (w.from + w.to) / 2;
      return w.vertical
        ? `<line x1="${w.at}" y1="${mid - PLAN_DOOR / 2}" x2="${w.at}" y2="${mid + PLAN_DOOR / 2}" class="door"/>`
        : `<line x1="${mid - PLAN_DOOR / 2}" y1="${w.at}" x2="${mid + PLAN_DOOR / 2}" y2="${w.at}" class="door"/>`;
    })
    .join('');

  const labels = layout.groups
    .map((g) => {
      const s = mainShape(layout, g.id);
      return s ? labelSvg(g, s) : '';
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
.note{font-size:15px;fill:#8C8E93;font-weight:500}`;

/** Ceo, uokviren SVG plana - ono što ide u turu. */
export function renderFloorplanSvg(layout: FloorplanLayout, note = PLAN_NOTE): { svg: string; width: number; height: number; bounds: Bounds } {
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
${renderFloorplanBody(layout)}
<text x="${(vx + width / 2).toFixed(1)}" y="${(vy + height - PLAN_FOOTER / 2).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" class="note">${escapeXml(note)}</text>
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
    const box = labelBox(g, s);
    const half = (box.lines.length * box.size * 1.2) / 2;
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
    groups.push(group);
  }
  const groupIds = new Set(groups.map((g) => g.id));
  const shapes: PlanShape[] = [];
  for (const s of l.shapes as Record<string, unknown>[]) {
    if (!str(s?.id) || !groupIds.has(String(s.group)) || ![s.x, s.y, s.w, s.h].every(num)) return null;
    if ((s.w as number) < 5 || (s.h as number) < 5) return null;
    shapes.push({ id: String(s.id), group: String(s.group), x: s.x as number, y: s.y as number, w: s.w as number, h: s.h as number });
  }
  const doors: DoorSpec[] = [];
  for (const d of l.doors as unknown[]) {
    if (!Array.isArray(d) || d.length < 2 || d.length > 3 || !groupIds.has(String(d[0])) || !groupIds.has(String(d[1]))) return null;
    const wall = d.length === 3 && Number.isInteger(d[2]) && (d[2] as number) >= 0 && (d[2] as number) < 20 ? (d[2] as number) : undefined;
    doors.push(wall === undefined ? [String(d[0]), String(d[1])] : [String(d[0]), String(d[1]), wall]);
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
  return { version: 1, groups, shapes, doors, rooms };
}
