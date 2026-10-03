import sharp from 'sharp';
import { Type, type Schema } from '@google/genai';

/**
 * AI čitanje dokumenata investitora za novogradnju (admin rute
 * /api/admin/projects, akcije rooms-from-plan, plan-read, pricelist-read):
 *   - osnova stana → prostorije sa kvadraturom (+ oznaka stana)
 *   - cenovnik (PDF ili slika) → redovi za „Uvoz iz Excela"
 * Samo predlog: ništa se odavde ne upisuje u bazu, admin pregleda rezultat.
 */

/** Osnova stana (JPG/PNG) za AI čitanje prostorija: preuzme, smanji na razumnu širinu, PNG (oštrije linije i brojevi od JPEG-a). */
export async function fetchPlanImage(url: string): Promise<{ contentType: string; base64: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} pri preuzimanju slike.`);
    const buf = Buffer.from(await res.arrayBuffer());
    const resized = await sharp(buf, { limitInputPixels: false }).resize({ width: 1800, withoutEnlargement: true }).png().toBuffer();
    return { contentType: 'image/png', base64: resized.toString('base64') };
  } finally {
    clearTimeout(timeout);
  }
}

export function roomsFromPlanSchema(): Schema {
  return {
    type: Type.OBJECT,
    properties: {
      rooms: {
        type: Type.ARRAY,
        description: 'Jedna prostorija po redu, redom kako se čita osnova (ne abecedno).',
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'Naziv prostorije na srpskom.' },
            dims: { type: Type.STRING, description: 'Mere pročitane sa osnove, u metrima, npr. "4,57 × 3,03"; prazno ako je kvadratura odštampana na osnovi.' },
            m2: { type: Type.NUMBER, description: 'Površina prostorije u m², zaokružena na 2 decimale.' }
          },
          required: ['name', 'dims', 'm2']
        }
      }
    },
    required: ['rooms']
  };
}

/** Prompt za čitanje osnove stana: linije sa merama u mm, legenda tipova prostorija, ponekad već odštampana kvadratura. */
export function buildRoomsFromPlanPrompt(areaSqm: number | null): string {
  return `You are reading an architectural floor plan of ONE apartment (not a whole floor, not a building).

The plan may show:
- wall dimension lines with numbers along room edges, in CENTIMETERS or MILLIMETERS - infer the unit from the size: a room wall written as 300-800 is centimeters, 3000-8000 is millimeters
- a legend mapping numbers to room types (e.g. 1 = Kitchen/Living room, 2 = Bedroom, 3 = WC, 4 = Bathroom, 5 = Hall, 6 = Balcony/Terrace, 7 = Corridor, 8 = Stairs, 9 = Lift, 10 = Technical room)
- furniture icons (bed, sofa, sink, stove...) that also hint at room use
- sometimes an area already printed inside a room (e.g. "15,2 m²") - if present, PREFER that printed number over computing one yourself

For EVERY room that belongs to THIS apartment (inside its own walls), output one entry with:
- "dims": the two dimensions you read for that room, converted to meters with a comma decimal, e.g. "4,57 × 3,03" (empty string if you used an area printed on the plan). Read the numbers that sit on THIS room's own edges - not a neighbour's.
- "name": the room's purpose, in SERBIAN. Use these exact terms when they apply: "Dnevna soba sa kuhinjom i trpezarijom" (or "Dnevna soba sa kuhinjom" if there is no separate dining area), "Spavaća soba", "Kupatilo", "Toalet", "Hodnik", "Ostava", "Terasa", "Balkon", "Radna soba", "Garderober". Use a plain descriptive Serbian name for anything else.
- "m2": the room's floor area in square meters = the product of "dims" for a rectangular room (best effort for an irregular one), rounded to 2 decimals. Double-check the multiplication.

Rules:
- Skip anything that is NOT part of this apartment: shared building stairs, shared elevator/lift, shared corridors used by other apartments, technical risers belonging to the building. Only include a private hallway/corridor if it is clearly inside this apartment's own walls.
- If the same room type appears more than once (e.g. two bedrooms), output each one as its own entry with the same name - do not merge them.
- Do not output a "total" row - it is computed separately.
- Every room and every number must come from something actually visible in the image. Never invent a room or a dimension that is not shown, and never guess when the image is unreadable - return fewer rooms instead.${
    areaSqm ? `
- The apartment's total area from the listing is about ${areaSqm} m² - use it only as a sanity check, not as a target to force the sum to match.` : ''
  }

Respond with JSON matching the schema exactly.`;
}

/** Masovne osnove: uz prostorije model pročita i oznaku stana sa osnove i upari je sa spiskom oznaka. */
export function planReadSchema(): Schema {
  const base = roomsFromPlanSchema();
  return {
    ...base,
    properties: {
      label: { type: Type.STRING, description: 'Oznaka stana kako piše na osnovi ("STAN 3A", "Tip B"); prazno ako je nema.' },
      matchedCode: { type: Type.STRING, description: 'Jedna oznaka iz datog spiska na koju se osnova odnosi, ili prazno.' },
      ...base.properties
    },
    required: ['label', 'matchedCode', 'rooms']
  };
}

export function buildPlanReadPrompt(codes: string[], fileName: string): string {
  return `${buildRoomsFromPlanPrompt(null).replace('Respond with JSON matching the schema exactly.', '')}
ALSO identify which apartment this plan is for:
- "label": the apartment label printed on the plan (title block, heading or stamp, e.g. "STAN 3A", "Apartman 12", "Tip B", "Lokal 2"), exactly as written. Empty string if there is none.
- "matchedCode": the ONE code from this list that the label refers to, or "" if none clearly matches: ${JSON.stringify(codes)}
  The file name is ${JSON.stringify(fileName)} - it may also contain the code. If the plan shows a TYPE ("Tip A") rather than one apartment, leave matchedCode empty.

Respond with JSON matching the schema exactly.`;
}

/** Cenovnik investitora: PDF ide modelu kakav jeste, slika se smanji kao osnova. */
export async function fetchDocForAi(url: string): Promise<{ mimeType: string; data: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} pri preuzimanju cenovnika.`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (/\.pdf$/i.test(url) || (res.headers.get('content-type') ?? '').includes('pdf')) {
      return { mimeType: 'application/pdf', data: buf.toString('base64') };
    }
    const png = await sharp(buf, { limitInputPixels: false }).resize({ width: 2200, withoutEnlargement: true }).png().toBuffer();
    return { mimeType: 'image/png', data: png.toString('base64') };
  } finally {
    clearTimeout(timeout);
  }
}

export type PriceRow = {
  code: string;
  floor: string;
  structure: string;
  area: number;
  terrace: number;
  orientation: string;
  price: number;
  status: string;
  building: string;
};

export function priceListSchema(): Schema {
  const str = (description: string) => ({ type: Type.STRING, description });
  const nr = (description: string) => ({ type: Type.NUMBER, description });
  return {
    type: Type.OBJECT,
    properties: {
      units: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            code: str('Oznaka stana/lokala tačno kako piše (npr. "3A", "S12").'),
            floor: str('Sprat: "P" za prizemlje, inače broj ("3"); prazno ako ga nema.'),
            structure: str('Struktura na srpskom ("Dvosoban", "Trosoban", "Lokal"…); prazno ako je nema.'),
            area: nr('Površina u m²; 0 ako je nema.'),
            terrace: nr('Terasa/balkon u m²; 0 ako je nema.'),
            orientation: str('Orijentacija ("Jug", "Severoistok"…); prazno ako je nema.'),
            price: nr('Ukupna cena u evrima (ne cena po m²); 0 ako je nema ili je prodato bez cene.'),
            status: str('"slobodan", "rezervisan" ili "prodat".'),
            building: str('Lamela/zgrada ako je tabela ima ("A", "Lamela B"); prazno ako nema.')
          },
          required: ['code', 'floor', 'structure', 'area', 'terrace', 'orientation', 'price', 'status', 'building']
        }
      }
    },
    required: ['units']
  };
}

export const PRICE_LIST_PROMPT = `This is a developer's price list (cenovnik) for apartments in a new building - a table, possibly over several pages, possibly in Serbian (Latin or Cyrillic) or English.

Return EVERY apartment / commercial unit row as one entry. Rules:
- "code": the unit label exactly as written ("3A", "S12", "L1"). Skip rows without a label, and skip header, subtotal and total rows.
- "floor": "P" for ground floor (prizemlje, PR, VP), otherwise the floor number as digits. If the table has no floor column but the code starts with the floor (e.g. "3A"), leave floor empty.
- "structure": Serbian name if given or obvious (jednosoban, jednoiposoban, dvosoban, dvoiposoban, trosoban, četvorosoban, lokal, garaža, ostava), capitalised ("Dvosoban").
- "area": net apartment area in m² (use the main area column, not the gross area with common parts if both exist). Decimal comma means a decimal point ("54,30" = 54.3).
- "terrace": terrace/balcony/loggia area in m² if shown separately, else 0.
- "orientation": the full Serbian word - expand abbreviations: S = Sever, J = Jug, I = Istok, Z = Zapad, SI = Severoistok, SZ = Severozapad, JI = Jugoistok, JZ = Jugozapad (English N/S/E/W the same way). Several sides ("J/I", "jug-istok") stay as written but spelled out ("Jug/Istok").
- "price": the TOTAL price in EUR. A dot or space can be a thousands separator ("95.600" = 95600). If only a price per m² is given, multiply it by the area. 0 when there is no price.
- "status": map to exactly "slobodan" (available, free, slobodno, u prodaji), "rezervisan" (reserved, kapara, rezervisano) or "prodat" (sold, prodato, crossed out or greyed rows marked sold). If the table shows no status, use "slobodan".
- "building": the lamela/building if the table has that column or section heading, else "".
Never invent rows or numbers that are not in the document.

Respond with JSON matching the schema exactly.`;

/** Red cenovnika → red za uvoz (iste kolone kao „Uvoz iz Excela", tab između). */
export function priceRowToLine(r: PriceRow, withBuilding: boolean): string {
  const n = (v: number) => (Number.isFinite(v) && v > 0 ? String(Math.round(v * 100) / 100).replace('.', ',') : '');
  const clean = (v: string) => (v ?? '').replace(/[\t\r\n]+/g, ' ').trim();
  const floor = clean(r.floor) || (() => {
    const m = clean(r.code).match(/^(P|PR|\d{1,2})(?=\D)/i);
    return m ? (/^p/i.test(m[1]) ? 'P' : m[1]) : '';
  })();
  const cols = [clean(r.code), floor, clean(r.structure), n(r.area), n(r.terrace), clean(r.orientation), r.price > 0 ? String(Math.round(r.price)) : '', clean(r.status) || 'slobodan'];
  if (withBuilding) cols.push(clean(r.building));
  return cols.join('\t');
}


// ============================================================
// Fasada → spratovi (admin: „✨ Predloži spratove")
// ============================================================
// Model obeleži svaki sprat pravougaonikom box_2d [ymin, xmin, ymax, xmax]
// (0-1000) - format na kome je Gemini treniran za prepoznavanje objekata.
// Test 3. 10. 2026 na fasadi „Lepeničkog cveta" (7 etaža), više pokretanja:
//   Lite: granice spratova sa greškom 0,5-1,8 % visine slike, 4-7 s
//   Flash: ~5,6 %, ~30 s
//   (raniji pristup sa linijama tavanica: Lite ~9 %, ravnomerno „pogađa")
// Zato je ovde Lite glavni model, a Flash rezerva. Perspektiva se ne
// prati (pravougaonici) - admin povuče uglove gde fasada nije frontalna.

/** Fotografija/render fasade za AI: JPEG (fotografija, ne linije), 1600 px. */
export async function fetchFacadeImage(url: string): Promise<{ contentType: string; base64: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} pri preuzimanju slike fasade.`);
    const buf = Buffer.from(await res.arrayBuffer());
    const jpg = await sharp(buf, { limitInputPixels: false }).resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    return { contentType: 'image/jpeg', base64: jpg.toString('base64') };
  } finally {
    clearTimeout(timeout);
  }
}

export type StoreyBox = { level: number; box_2d: number[] };

export function facadeFloorsSchema(): Schema {
  return {
    type: Type.OBJECT,
    properties: {
      storeys: {
        type: Type.ARRAY,
        description: 'Jedna etaža po stavci, od prizemlja (0) nagore.',
        items: {
          type: Type.OBJECT,
          properties: {
            level: { type: Type.NUMBER, description: '0 = prizemlje, 1 = prvi sprat…' },
            box_2d: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: '[ymin, xmin, ymax, xmax], 0-1000.' }
          },
          required: ['level', 'box_2d']
        }
      }
    },
    required: ['storeys']
  };
}

export function buildFacadeFloorsPrompt(expectedFloors: number): string {
  return `Detect every above-ground storey (floor) of the main building in this facade image.
Return one entry per storey, from the ground floor (level 0) upward, with "box_2d" = [ymin, xmin, ymax, xmax] normalized to 0-1000.
Each box spans the full width of the building facade and exactly the height of that storey: from its floor slab to the next floor slab above (balcony slabs, window rows and colour bands show the slabs).
The developer says the building has ${expectedFloors} storeys including the ground floor - if you clearly see a different number, return what you see.
Do not count an underground garage or a roof terrace without walls. Ignore trees, cars, people, sky and neighbouring buildings.`;
}

/**
 * Pravougaonici etaža (0-1000) → oblik svakog sprata u udelu slike (0..1),
 * odozdo nagore. Granica između dve susedne etaže je sredina njihovih
 * ivica, pa trake nemaju ni razmak ni preklop. Neispravni okviri se
 * preskaču.
 */
export function storeyBoxesToPolygons(storeys: StoreyBox[]): [number, number][][] {
  const c = (v: number) => Math.min(1, Math.max(0, Math.round((v / 1000) * 10000) / 10000));
  const boxes = storeys
    .map((s) => (Array.isArray(s.box_2d) ? s.box_2d.map(Number) : []))
    .filter((b) => b.length === 4 && b.every((v) => Number.isFinite(v)))
    .map(([y1, x1, y2, x2]) => ({ top: c(Math.min(y1, y2)), bottom: c(Math.max(y1, y2)), left: c(Math.min(x1, x2)), right: c(Math.max(x1, x2)) }))
    .filter((b) => b.bottom - b.top >= 0.01 && b.right - b.left >= 0.02)
    .sort((a, b) => b.bottom - a.bottom);
  // Susedne granice spojene na sredini.
  for (let i = 0; i + 1 < boxes.length; i++) {
    const mid = Math.round(((boxes[i].top + boxes[i + 1].bottom) / 2) * 10000) / 10000;
    boxes[i].top = mid;
    boxes[i + 1].bottom = mid;
  }
  return boxes
    .filter((b) => b.bottom - b.top >= 0.005)
    .map((b) => [
      [b.left, b.bottom],
      [b.right, b.bottom],
      [b.right, b.top],
      [b.left, b.top]
    ]);
}


// ============================================================
// Fasada → stanovi (admin: „✨ Predloži stanove")
// ============================================================
// AI dobija dve slike: fasadu sa već sačuvanim spratovima (obeleženi
// trakama i brojem) i osnovu tipskog sprata sa obeleženim stanovima. Za svaki
// sprat vrati koji se stanovi vide na fasadi, sleva nadesno, i njihov
// vodoravni raspon (x). Oblik stana = traka sprata isečena tim rasponom, pa
// stan uvek leži tačno u svom spratu. Isti stan („B" na svakom spratu) dobija
// isti raspon na svim spratovima istog rasporeda (medijana) - kolone na
// fasadi su ravne.

type Pt = [number, number];

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} pri preuzimanju slike.`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timeout);
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Slika sa oblicima i natpisima (udeo slike 0..1) iscrtanim preko nje - da AI zna šta je šta. */
async function overlayShapes(
  buf: Buffer,
  width: number,
  shapes: { polygon: Pt[]; label: string }[],
  format: 'jpeg' | 'png'
): Promise<{ contentType: string; base64: string }> {
  const base = sharp(buf, { limitInputPixels: false }).resize({ width, withoutEnlargement: true });
  const { data, info } = await base.toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const font = Math.max(16, Math.round(W / 70));
  const parts = shapes.map(({ polygon, label }) => {
    const pts = polygon.map(([x, y]) => `${(x * W).toFixed(1)},${(y * H).toFixed(1)}`).join(' ');
    const cx = ((Math.min(...polygon.map((p) => p[0])) + Math.max(...polygon.map((p) => p[0]))) / 2) * W;
    const cy = ((Math.min(...polygon.map((p) => p[1])) + Math.max(...polygon.map((p) => p[1]))) / 2) * H;
    return `<polygon points="${pts}" fill="none" stroke="#FF1F6B" stroke-width="3"/>
<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" font-family="Arial, sans-serif" font-weight="700" font-size="${font}" fill="#FF1F6B" stroke="#FFFFFF" stroke-width="4" paint-order="stroke" text-anchor="middle" dominant-baseline="middle">${esc(label)}</text>`;
  });
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${parts.join('')}</svg>`);
  const out = sharp(data).composite([{ input: svg, top: 0, left: 0 }]);
  const res = format === 'png' ? await out.png().toBuffer() : await out.jpeg({ quality: 85 }).toBuffer();
  return { contentType: format === 'png' ? 'image/png' : 'image/jpeg', base64: res.toString('base64') };
}

/** Fasada sa obeleženim spratovima („P", „1", „2"…). */
export async function fetchFacadeWithFloors(url: string, floors: { level: number; polygon: Pt[] }[]) {
  const buf = await fetchImageBuffer(url);
  return overlayShapes(
    buf,
    1600,
    floors.map((f) => ({ polygon: f.polygon, label: f.level === 0 ? 'P' : String(f.level) })),
    'jpeg'
  );
}

/** Osnova sprata sa obeleženim stanovima (oznake stanova). */
export async function fetchPlanWithUnits(url: string, units: { code: string; polygon: Pt[] }[]) {
  const buf = await fetchImageBuffer(url);
  return overlayShapes(buf, 1600, units.map((u) => ({ polygon: u.polygon, label: u.code })), 'png');
}

export type FacadeUnitSpan = { level: number; code: string; x1: number; x2: number };

export function facadeUnitsSchema(): Schema {
  return {
    type: Type.OBJECT,
    properties: {
      units: {
        type: Type.ARRAY,
        description: 'Stanovi vidljivi na fasadi: za svaki sprat sleva nadesno.',
        items: {
          type: Type.OBJECT,
          properties: {
            level: { type: Type.NUMBER, description: 'Sprat (0 = prizemlje), kao broj na traci sprata.' },
            code: { type: Type.STRING, description: 'Oznaka stana tačno iz spiska.' },
            x1: { type: Type.NUMBER, description: 'Leva ivica stana na fasadi, 0-1000 širine slike.' },
            x2: { type: Type.NUMBER, description: 'Desna ivica stana na fasadi, 0-1000 širine slike.' }
          },
          required: ['level', 'code', 'x1', 'x2']
        }
      }
    },
    required: ['units']
  };
}

export type FacadeUnitsLevel = {
  level: number;
  units: { code: string; structure: string | null; orientation: string | null; areaSqm: number | null }[];
};

export function buildFacadeUnitsPrompt(levels: FacadeUnitsLevel[], hasPlan: boolean, viewLabel: string | null): string {
  const lines = levels
    .map((l) => {
      const name = l.level === 0 ? 'P (ground floor)' : `${l.level}`;
      const list = l.units
        .map((u) => [u.code, u.structure, u.orientation ? `faces ${u.orientation}` : null, u.areaSqm ? `${u.areaSqm} m²` : null].filter(Boolean).join(', '))
        .join(' | ');
      return `- storey ${name}: ${list}`;
    })
    .join('\n');
  return `Image 1 is a facade of a residential building. Each storey is outlined in pink and labelled with its number (P = ground floor).${
    viewLabel ? ` The developer calls this view "${viewLabel}".` : ''
  }
${
  hasPlan
    ? 'Image 2 is the floor plan of a typical upper storey, with every apartment outlined in pink and labelled with its code (the code on other storeys differs only in the storey number at the start).'
    : 'There is no floor plan.'
}

Apartments on each storey (code, structure, which side its windows face - Serbian: Sever = north, Jug = south, Istok = east, Zapad = west, combinations like Jugoistok = south-east):
${lines}

Task: for EVERY outlined storey, including the ground floor P, decide which units (apartments, and shops/lokali on the ground floor) have their exterior wall (windows, balconies, loggias) on the facade visible in image 1, and give each one's horizontal extent on image 1 as x1 (left edge) and x2 (right edge), 0-1000 of the image width.
- Work out which side of the floor plan faces the camera: match the facade's shape (projections, recesses, balcony columns, stair core, corners) and the apartments' orientations to the plan's outline. The apartment at the left end of that plan side is the left-most on the facade.
- Apartments that face away from the camera are NOT listed. If the building corner is visible and two facades show, list the apartments of both visible facades.
- On one storey, the visible apartments together cover the storey's full width without gaps or overlaps: the first x1 = left edge of the building, the last x2 = right edge, and each x2 = the next x1. Put boundaries at the wall between two apartments (usually between two window or balcony groups), never through a window.
- Upper storeys with the same layout have the same columns: the same apartment letter sits at the same x on every storey.
- Every outlined storey that has units in the list must get at least one unit if any of its windows, shop fronts or balconies show on this facade.
- Use exactly the codes from the list above.
Respond with JSON matching the schema.`;
}

/** Sutherland-Hodgman: deo mnogougla između x = a i x = b. */
function clipX(poly: Pt[], a: number, b: number): Pt[] {
  const clip = (pts: Pt[], keep: (p: Pt) => boolean, edgeX: number): Pt[] => {
    const out: Pt[] = [];
    for (let i = 0; i < pts.length; i++) {
      const cur = pts[i];
      const prev = pts[(i + pts.length - 1) % pts.length];
      const inCur = keep(cur);
      const inPrev = keep(prev);
      if (inCur !== inPrev) {
        const t = (edgeX - prev[0]) / (cur[0] - prev[0]);
        out.push([edgeX, prev[1] + t * (cur[1] - prev[1])]);
      }
      if (inCur) out.push(cur);
    }
    return out;
  };
  return clip(
    clip(poly, (p) => p[0] >= a, a),
    (p) => p[0] <= b,
    b
  );
}

/**
 * Rasponi stanova (0-1000) → oblik svakog stana: traka sprata isečena
 * rasponom. Pre toga:
 *   - isti stan („B") na spratovima istog rasporeda dobija medijanu raspona,
 *   - susedni stanovi na spratu dele granicu (sredina razmaka/preklopa),
 *   - stanovi van spiska ili bez trake sprata se preskaču.
 */
export function facadeSpansToPolygons(
  spans: FacadeUnitSpan[],
  floors: { level: number; polygon: Pt[]; units: { id: string; code: string; suffix: string | null }[] }[]
): { unitId: string; code: string; level: number; polygon: Pt[] }[] {
  const norm = (s: string) => s.replace(/\s+/g, '').toUpperCase();
  type Row = { unitId: string; code: string; level: number; suffix: string | null; layout: string; x1: number; x2: number };
  const rows: Row[] = [];
  const seen = new Set<string>();
  for (const s of spans) {
    const f = floors.find((x) => x.level === Number(s.level)) ?? floors.find((x) => x.units.some((u) => norm(u.code) === norm(String(s.code ?? ''))));
    if (!f) continue;
    const u = f.units.find((x) => norm(x.code) === norm(String(s.code ?? '')));
    if (!u || seen.has(u.id)) continue;
    let x1 = Number(s.x1) / 1000;
    let x2 = Number(s.x2) / 1000;
    if (!Number.isFinite(x1) || !Number.isFinite(x2)) continue;
    if (x1 > x2) [x1, x2] = [x2, x1];
    x1 = Math.min(1, Math.max(0, x1));
    x2 = Math.min(1, Math.max(0, x2));
    if (x2 - x1 < 0.01) continue;
    seen.add(u.id);
    // Raspored sprata = skup nastavaka oznaka (A-I na tipskim spratovima, A-B u prizemlju).
    const layout = f.units
      .map((x) => x.suffix ?? '?')
      .sort()
      .join(',');
    rows.push({ unitId: u.id, code: u.code, level: f.level, suffix: u.suffix, layout, x1, x2 });
  }
  // Ravne kolone: medijana po (raspored, nastavak).
  const median = (v: number[]) => {
    const s = [...v].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    if (!r.suffix) continue;
    const k = `${r.layout}|${r.suffix}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const m1 = median(g.map((r) => r.x1));
    const m2 = median(g.map((r) => r.x2));
    for (const r of g) {
      r.x1 = m1;
      r.x2 = m2;
    }
  }
  // Susedi na spratu dele granicu.
  const byLevel = new Map<number, Row[]>();
  for (const r of rows) byLevel.set(r.level, [...(byLevel.get(r.level) ?? []), r]);
  for (const list of byLevel.values()) {
    list.sort((a, b) => a.x1 + a.x2 - (b.x1 + b.x2));
    for (let i = 0; i + 1 < list.length; i++) {
      const gap = list[i + 1].x1 - list[i].x2;
      if (Math.abs(gap) < 0.06) {
        const mid = (list[i].x2 + list[i + 1].x1) / 2;
        list[i].x2 = mid;
        list[i + 1].x1 = mid;
      }
    }
  }
  const r4 = (v: number) => Math.round(v * 10000) / 10000;
  const out: { unitId: string; code: string; level: number; polygon: Pt[] }[] = [];
  for (const r of rows) {
    const f = floors.find((x) => x.level === r.level)!;
    const poly = clipX(f.polygon, r.x1, r.x2).map(([x, y]) => [r4(x), r4(y)] as Pt);
    if (poly.length >= 3) out.push({ unitId: r.unitId, code: r.code, level: r.level, polygon: poly });
  }
  return out.sort((a, b) => b.level - a.level || a.polygon[0][0] - b.polygon[0][0]);
}
