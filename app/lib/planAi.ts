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
