/**
 * Šematski tlocrt iz same ture - bez AI-ja, bez mera, "samo vizuelno".
 *
 * Ulaz su sobe ture i njihove tačke "vrata" (waypoint sa targetRoomId i
 * uglom yaw u panorami). Postupak:
 *
 *  1. Spajanje: više snimaka iste prostorije ("Hodnik 1/2", "Hodnik 2/2")
 *     crta se kao jedna prostorija.
 *  2. Poravnanje panorama. Svaka panorama je snimljena okrenuta "na svoju
 *     stranu" - yaw 0 nije isti pravac u dve sobe. Kad postoje vrata u oba
 *     smera (A→B pod uglom a, B→A pod uglom b), pravac A→B u svetu je
 *     suprotan pravcu B→A, pa se iz toga izračuna zaokret sobe B u odnosu
 *     na A. Idući od sobe sa najviše veza, poravnaju se sve sobe.
 *  3. Približni položaji: soba B stoji od sobe A u pravcu vrata A→B.
 *  4. Podela pravougaonika (k-d): stan je jedan pravougaonik podeljen na
 *     sobe, bez preklapanja i rupa. Isproba se nekoliko stotina varijanti
 *     podele i bira najbolje ocenjena: povezane sobe treba da dele zid (da
 *     vrata mogu da se nacrtaju), raspored da prati pravce vrata, terasa
 *     da bude uz spoljni zid, a sobe ne previše izdužene.
 *  5. Vrata: povezane prostorije koje u nacrtu dele zid.
 *
 * Veličine soba nisu izmerene: površina se deli po tipu sobe (dnevna
 * veća, ostava manja). Zato plan nosi natpis "nije u razmeri". Rezultat
 * je uvek isti za iste ulaze (pretraga koristi seme iz ID-jeva soba).
 */

import { PLAN_MIN_SHARED, sharedWall, type FloorplanLayout } from './floorplanLayout';

export type SchematicRoomInput = {
  id: string;
  title: string;
  /** Vrata iz ove sobe: u koju sobu vode i pod kojim uglom u panorami (−180..180). */
  doors: { targetId: string; yaw: number }[];
};

// ---------------------------------------------------------------------------
// Tip sobe po nazivu (bilo koji jezik) -> relativna veličina

type Kind = { weight: number; outdoor?: boolean };

const KINDS: { match: RegExp; kind: Kind }[] = [
  { match: /teras|balkon|lođ|lodj|terrace|balcony|terrasse|балкон|террас/i, kind: { weight: 1.6, outdoor: true } },
  { match: /ostav|špajz|spajz|pantry|storage|abstell|кладов/i, kind: { weight: 0.55 } },
  { match: /toalet|wc\b|^wc|toilet|туалет/i, kind: { weight: 0.7 } },
  { match: /kupat|bath|bad\b|ванн/i, kind: { weight: 1.4 } },
  { match: /hodnik|predsob|ulaz|hol\b|hall|flur|entr|корид|прихож/i, kind: { weight: 1.2 } },
  { match: /kuhinj|kitchen|küche|кухн/i, kind: { weight: 2.6 } },
  { match: /dnevn|boravak|living|wohn|гостин/i, kind: { weight: 4.2 } },
  { match: /spava|soba|bed|schlaf|room|спальн|комнат/i, kind: { weight: 3.0 } },
  { match: /radn|office|arbeit|кабинет/i, kind: { weight: 2.4 } }
];

function kindOf(title: string): Kind {
  return KINDS.find((k) => k.match.test(title))?.kind ?? { weight: 2.2 };
}

/** "Hodnik 1/2" -> "Hodnik": više snimaka iste prostorije nosi isti natpis. */
function baseLabel(title: string): string {
  return title.replace(/\s*\d+\s*\/\s*\d+\s*$/, '').trim() || title;
}

// ---------------------------------------------------------------------------
// Korak 1: spajanje snimaka iste prostorije

type Space = {
  key: string;
  label: string;
  roomIds: string[];
  weight: number;
  outdoor: boolean;
};

function groupSpaces(rooms: SchematicRoomInput[]): { spaces: Space[]; spaceOf: Map<string, string> } {
  const spaces = new Map<string, Space>();
  const spaceOf = new Map<string, string>();
  for (const r of rooms) {
    const numbered = baseLabel(r.title) !== r.title;
    // Spajaju se samo numerisani snimci ("X 1/2", "X 2/2"); ostali ostaju
    // posebne prostorije i kad liče po imenu.
    const key = numbered ? `n:${baseLabel(r.title).toLowerCase()}` : `r:${r.id}`;
    const kind = kindOf(r.title);
    const existing = spaces.get(key);
    if (existing) {
      existing.roomIds.push(r.id);
      existing.weight += kind.weight * 0.6; // drugi snimak iste prostorije je dodatak, ne još jedna soba
    } else {
      spaces.set(key, { key, label: baseLabel(r.title), roomIds: [r.id], weight: kind.weight, outdoor: Boolean(kind.outdoor) });
    }
    spaceOf.set(r.id, key);
  }
  return { spaces: [...spaces.values()], spaceOf };
}

// ---------------------------------------------------------------------------
// Koraci 2 i 3: poravnanje i približni položaji

const norm = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

type Embedding = {
  pos: Map<string, { x: number; y: number }>;
  /** Pravac u svetu (stepeni) za povezane parove prostorija "a|b" (a→b). */
  dir: Map<string, number>;
  /** Neusmereni parovi povezanih prostorija. */
  links: [string, string][];
};

function embed(rooms: SchematicRoomInput[], spaces: Space[], spaceOf: Map<string, string>): Embedding {
  const weight = new Map(spaces.map((s) => [s.key, s.weight]));

  // Vrata između prostorija (unutar iste prostorije se preskaču).
  const doors: { from: string; to: string; yaw: number }[] = [];
  const known = new Set(rooms.map((r) => r.id));
  for (const r of rooms) {
    for (const d of r.doors) {
      if (!known.has(d.targetId)) continue;
      const from = spaceOf.get(r.id)!;
      const to = spaceOf.get(d.targetId)!;
      if (from !== to) doors.push({ from, to, yaw: d.yaw });
    }
  }
  const yawOf = (from: string, to: string) => doors.find((d) => d.from === from && d.to === to)?.yaw;

  const neighbours = new Map<string, Set<string>>(spaces.map((s) => [s.key, new Set<string>()]));
  const linkSet = new Set<string>();
  const links: [string, string][] = [];
  for (const d of doors) {
    neighbours.get(d.from)!.add(d.to);
    neighbours.get(d.to)!.add(d.from);
    const k = [d.from, d.to].sort().join('|');
    if (!linkSet.has(k)) {
      linkSet.add(k);
      links.push([d.from, d.to]);
    }
  }

  const root = [...spaces].sort(
    (a, b) => neighbours.get(b.key)!.size - neighbours.get(a.key)!.size || b.weight - a.weight
  )[0];

  const rot = new Map<string, number>([[root.key, 0]]);
  const pos = new Map<string, { x: number; y: number }>([[root.key, { x: 0, y: 0 }]]);
  const dir = new Map<string, number>();
  const radius = (k: string) => Math.sqrt(weight.get(k)!) / 2;

  const queue = [root.key];
  while (queue.length) {
    const a = queue.shift()!;
    for (const b of neighbours.get(a)!) {
      const ab = yawOf(a, b);
      const ba = yawOf(b, a);
      let world: number | undefined;
      if (ab !== undefined) world = norm(ab + rot.get(a)!);
      else if (ba !== undefined && rot.has(b)) world = norm(ba + rot.get(b)! + 180);
      if (world !== undefined && !dir.has(`${a}|${b}`)) {
        dir.set(`${a}|${b}`, world);
        dir.set(`${b}|${a}`, norm(world + 180));
      }
      if (pos.has(b)) continue;
      const w = world ?? 0;
      // Zaokret B: pravac B→A u svetu mora biti suprotan pravcu A→B.
      rot.set(b, ba !== undefined ? norm(w + 180 - ba) : rot.get(a)!);
      const rad = (w * Math.PI) / 180;
      const dist = radius(a) + radius(b);
      const pa = pos.get(a)!;
      // yaw raste udesno (u smeru kazaljke): 0 = gore, 90 = desno.
      pos.set(b, { x: pa.x + Math.sin(rad) * dist, y: pa.y - Math.cos(rad) * dist });
      queue.push(b);
    }
  }

  // Prostorije bez ijedne veze: poređaju se ispod, jedna do druge.
  let spareX = 0;
  const maxY = Math.max(...[...pos.values()].map((p) => p.y), 0);
  for (const s of spaces) {
    if (pos.has(s.key)) continue;
    pos.set(s.key, { x: spareX, y: maxY + 2 });
    spareX += 2;
  }
  return { pos, dir, links };
}

// ---------------------------------------------------------------------------
// Korak 4: podela pravougaonika + pretraga

type Rect = { x: number; y: number; w: number; h: number };
type Item = { key: string; weight: number; px: number; py: number };

/** Mali deterministički generator slučajnih brojeva (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Deli `rect` na prostorije. Bez `rand` je to osnovna podela (duža strana,
 * najuravnoteženija površina); sa `rand` se biraju varijacije.
 */
function partition(items: Item[], rect: Rect, out: Map<string, Rect>, rand?: () => number) {
  if (items.length === 1) {
    out.set(items[0].key, rect);
    return;
  }
  const longer = rect.w >= rect.h;
  const vertical = rand && rand() < 0.25 ? !longer : longer;
  const noise = rand ? 0.35 : 0;
  const keyed = items.map((i) => ({
    item: i,
    k: (vertical ? i.px : i.py) + (rand ? (rand() - 0.5) * noise : 0)
  }));
  keyed.sort((a, b) => a.k - b.k);
  const sorted = keyed.map((k) => k.item);
  const total = sorted.reduce((s, i) => s + i.weight, 0);

  const splits: { k: number; diff: number }[] = [];
  let acc = 0;
  for (let k = 1; k < sorted.length; k++) {
    acc += sorted[k - 1].weight;
    splits.push({ k, diff: Math.abs(acc - total / 2) });
  }
  splits.sort((a, b) => a.diff - b.diff);
  // Sa varijacijama: jedno od dva-tri najuravnoteženija mesta podele.
  const pick = rand ? splits[Math.min(splits.length - 1, Math.floor(rand() * Math.min(3, splits.length)))] : splits[0];

  const left = sorted.slice(0, pick.k);
  const right = sorted.slice(pick.k);
  const share = left.reduce((s, i) => s + i.weight, 0) / total;

  if (vertical) {
    const w1 = rect.w * share;
    partition(left, { x: rect.x, y: rect.y, w: w1, h: rect.h }, out, rand);
    partition(right, { x: rect.x + w1, y: rect.y, w: rect.w - w1, h: rect.h }, out, rand);
  } else {
    const h1 = rect.h * share;
    partition(left, { x: rect.x, y: rect.y, w: rect.w, h: h1 }, out, rand);
    partition(right, { x: rect.x, y: rect.y + h1, w: rect.w, h: rect.h - h1 }, out, rand);
  }
}

const PLAN_WIDTH = 828;

function score(rects: Map<string, Rect>, emb: Embedding, spaces: Space[], outer: Rect): number {
  let s = 0;
  for (const [a, b] of emb.links) {
    const ra = rects.get(a)!;
    const rb = rects.get(b)!;
    const wall = sharedWall(ra, rb);
    if (wall && wall.length >= PLAN_MIN_SHARED) s += 10;
    else if (wall) s += 3;
    // Raspored treba da prati pravac vrata.
    const d = emb.dir.get(`${a}|${b}`);
    if (d !== undefined) {
      const vx = rb.x + rb.w / 2 - (ra.x + ra.w / 2);
      const vy = rb.y + rb.h / 2 - (ra.y + ra.h / 2);
      const len = Math.hypot(vx, vy) || 1;
      const rad = (d * Math.PI) / 180;
      s += 3 * ((vx / len) * Math.sin(rad) + (vy / len) * -Math.cos(rad));
    }
  }
  const eps = 0.5;
  for (const sp of spaces) {
    const r = rects.get(sp.key)!;
    const ratio = Math.max(r.w / r.h, r.h / r.w);
    if (ratio > 2.4) s -= (ratio - 2.4) * 4;
    if (sp.outdoor) {
      const onEdge =
        Math.abs(r.x - outer.x) < eps ||
        Math.abs(r.y - outer.y) < eps ||
        Math.abs(r.x + r.w - (outer.x + outer.w)) < eps ||
        Math.abs(r.y + r.h - (outer.y + outer.h)) < eps;
      if (!onEdge) s -= 25;
    }
  }
  return s;
}

const SEARCH_ITERATIONS = 700;

/**
 * Automatski NACRT rasporeda. Vlasnik ga posle ispravlja u editoru
 * (/admin/plan/[slug]); crta ga lib/floorplanLayout.ts.
 */
export function buildSchematicLayout(rooms: SchematicRoomInput[]): FloorplanLayout | null {
  if (rooms.length === 0) return null;

  const { spaces, spaceOf } = groupSpaces(rooms);
  const emb = embed(rooms, spaces, spaceOf);

  // Oblik stana prati raspored iz koraka 3, ali ne ekstremno izdužen.
  const xs = [...emb.pos.values()].map((p) => p.x);
  const ys = [...emb.pos.values()].map((p) => p.y);
  const spreadX = Math.max(...xs) - Math.min(...xs) + 1;
  const spreadY = Math.max(...ys) - Math.min(...ys) + 1;
  const aspect = Math.min(1.6, Math.max(1 / 1.15, spreadX / spreadY));
  const outer: Rect = { x: 0, y: 0, w: PLAN_WIDTH, h: Math.round(PLAN_WIDTH / aspect) };

  const items: Item[] = spaces.map((s) => ({ key: s.key, weight: s.weight, px: emb.pos.get(s.key)!.x, py: emb.pos.get(s.key)!.y }));

  let best = new Map<string, Rect>();
  partition(items, outer, best);
  let bestScore = score(best, emb, spaces, outer);
  const rand = rng(hashSeed(rooms.map((r) => r.id).join(',')));
  for (let i = 0; i < SEARCH_ITERATIONS; i++) {
    const candidate = new Map<string, Rect>();
    partition(items, outer, candidate, rand);
    const s = score(candidate, emb, spaces, outer);
    if (s > bestScore) {
      bestScore = s;
      best = candidate;
    }
  }

  // Celi brojevi: u editoru se lepi na mrežu, a JSON ostaje čitljiv.
  const round = (v: number) => Math.round(v);
  const groupId = (key: string) => `g${spaces.findIndex((s) => s.key === key) + 1}`;

  return {
    version: 1,
    groups: spaces.map((sp) => ({ id: groupId(sp.key), label: sp.label, outdoor: sp.outdoor })),
    shapes: spaces.map((sp) => {
      const r = best.get(sp.key)!;
      const x = round(r.x);
      const y = round(r.y);
      return { id: `s${groupId(sp.key).slice(1)}`, group: groupId(sp.key), x, y, w: round(r.x + r.w) - x, h: round(r.y + r.h) - y };
    }),
    // Vrata: povezane prostorije koje u nacrtu dele dovoljno dug zid.
    doors: emb.links
      .filter(([a, b]) => (sharedWall(best.get(a)!, best.get(b)!)?.length ?? 0) >= PLAN_MIN_SHARED)
      .map(([a, b]) => [groupId(a), groupId(b)] as [string, string]),
    rooms: rooms.map((r) => ({ roomId: r.id, group: groupId(spaceOf.get(r.id)!) }))
  };
}
