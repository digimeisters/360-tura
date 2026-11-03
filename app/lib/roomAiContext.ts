/**
 * Šta AI popuna sobe zna o nekretnini i o putu kroz nju (vidi
 * docs/superpowers/specs/2026-11-03-ai-tekst-soba-design.md §2-3). Bez uvoza -
 * koriste ga serverska ruta i node testovi.
 */

export type TourFactsRow = {
  property_type?: string | null;
  /** Već kao tekst za prikaz (structureLabel), npr. "Dvosoban". */
  structure?: string | null;
  area_sqm?: number | string | null;
  floor?: string | null;
  city?: string | null;
  district?: string | null;
  terrace?: string | null;
  heating?: string | null;
  has_elevator?: string | null;
  has_basement?: string | null;
  build_status?: string | null;
  finish_status?: string | null;
};

/**
 * Podaci o nekretnini koje soba sme da pomene. Cena, depozit, parking i
 * uknjiženost namerno nisu ovde: prikazuju ih Info i Pitanja, a u sobi ih je
 * model gurao gde ne pripadaju (kirija u kupatilu).
 */
export function roomFactsFromTour(row: TourFactsRow): string[] {
  const facts: string[] = [];
  const add = (label: string, value: unknown) => {
    if (value !== null && value !== undefined && String(value).trim()) facts.push(`${label}: ${String(value).trim()}`);
  };
  add('Property type', row.property_type);
  add('Structure', row.structure);
  add('Total area (whole property, m²)', row.area_sqm);
  add('Floor', row.floor);
  add('City', row.city);
  add('District', row.district);
  add('Outdoor space', row.terrace);
  add('Heating', row.heating);
  add('Elevator in building', row.has_elevator);
  add('Basement', row.has_basement);
  add('Building', row.build_status);
  add('Furnishing', row.finish_status);
  return facts;
}

/**
 * Redosled kojim posetilac prvi put ulazi u sobe: iz putanje vodiča (isti
 * format kao parseGuidePath u app/tour/[slug]/guidePath.ts - redni brojevi
 * soba odvojeni zarezom), pa sobe kojih u putanji nema, po order_index.
 */
export function visitOrder(
  guidePath: string | null | undefined,
  rooms: { id: string; order_index: number }[]
): { ids: string[]; fromGuide: boolean } {
  const byIndex = new Map(rooms.map((r) => [r.order_index, r.id]));
  const ids: string[] = [];
  for (const part of (guidePath ?? '').split(',')) {
    const n = Number(part.trim());
    const id = Number.isInteger(n) && n > 0 ? byIndex.get(n) : undefined;
    if (id && !ids.includes(id)) ids.push(id);
  }
  const fromGuide = ids.length > 0;
  for (const r of [...rooms].sort((a, b) => a.order_index - b.order_index)) {
    if (!ids.includes(r.id)) ids.push(r.id);
  }
  return { ids, fromGuide };
}

/** Soba iz koje posetilac dolazi (null na početku ili za nepoznatu sobu). */
export function previousInVisit(ids: string[], roomId: string): string | null {
  const i = ids.indexOf(roomId);
  return i > 0 ? ids[i - 1] : null;
}

// Novac, uslovi, pravila, parking i uknjiženost: prikazuju ih Info, Pitanja i
// mapa, a u sobi ih je model gurao gde ne pripadaju (spec §2).
const OFF_LIMITS = /(€|\beur|\bdin\b|dinar|\bcen[aeiu]|kirij|zakup|depozit|parking|garaž|uknjiž|troškov|ljubim|price|\brent\b|deposit|\blease|\bcosts?\b|registration|\bpets?\b)/i;

/** Da li činjenica (npr. iz plana ture) spada u ono što ne ide u sobe. */
export function isOffLimitsFact(text: string): boolean {
  return OFF_LIMITS.test(text);
}

/** Opis oglasa bez rečenica o ceni, uslovima, parkingu i uknjiženosti. */
export function stripOffLimits(text: string): string {
  return (text.match(/[^.!?]+[.!?]*/g) ?? [])
    .map((s) => s.trim())
    .filter((s) => s && !OFF_LIMITS.test(s))
    .join(' ');
}

// Nazivi koje admin daje novoj, još neimenovanoj sobi - to nije pravi naziv.
const PLACEHOLDER_TITLE = /^(nova soba|soba \d+|room \d+|new room)?$/i;

export function isPlaceholderTitle(title: string): boolean {
  return PLACEHOLDER_TITLE.test(title.trim());
}

/**
 * "AI sve sobe" čuva nacrte tek na kraju, pa baza još ima staru naraciju
 * soba iz iste serije. Nacrti koje je klijent već dobio menjaju je, da AI
 * vidi nove uvode (ponavljanje) i nove nazive.
 */
export function applyNarrationOverrides<T extends { id: string; title: string; narration: string }>(
  rooms: T[],
  overrides: Record<string, { title?: string; narration: string }>
): T[] {
  return rooms.map((r) => {
    const o = overrides[r.id];
    return o ? { ...r, title: o.title?.trim() || r.title, narration: o.narration } : r;
  });
}
