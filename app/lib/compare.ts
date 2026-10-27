/**
 * Poređenje nekretnina (/ture/uporedi): izbor do COMPARE_MAX tura, pamti se
 * u pregledaču kupca (localStorage), bez naloga. Ovde je samo čista logika,
 * bez window - React deo je u useCompare.ts, a testovi u compare.test.ts.
 */

export const COMPARE_KEY = 'k360-compare';
export const COMPARE_MAX = 4;
/** Događaj kojim se ista kartica javlja da se izbor promenio (druge čuju "storage"). */
export const COMPARE_EVENT = 'k360-compare';

const SLUG_RE = /^[a-z0-9-]{1,100}$/;

/** Ispravni slugovi, bez duplikata, najviše COMPARE_MAX - sve ostalo se odbacuje. */
export function cleanSlugs(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const s of input) {
    if (typeof s === 'string' && SLUG_RE.test(s) && !out.includes(s)) out.push(s);
    if (out.length === COMPARE_MAX) break;
  }
  return out;
}

/** "?t=a,b,c" iz linka poređenja. */
export function parseCompareParam(t: string | undefined | null): string[] {
  return t ? cleanSlugs(t.split(',')) : [];
}

/** Dodaje ili skida; `full` = pokušaj da se doda preko granice (izbor ostaje isti). */
export function toggleSlug(list: string[], slug: string): { slugs: string[]; full: boolean } {
  if (list.includes(slug)) return { slugs: list.filter((s) => s !== slug), full: false };
  if (list.length >= COMPARE_MAX) return { slugs: list, full: true };
  return { slugs: [...list, slug], full: false };
}

/** Samo ture koje još postoje (skinuta ili prodata tura ne sme da zauzme mesto od 4). */
export function keepKnown(slugs: string[], known: string[]): string[] {
  return slugs.filter((s) => known.includes(s));
}

export function removeSlug(list: string[], slug: string): string[] {
  return list.filter((s) => s !== slug);
}

export function compareHref(slugs: string[]): string {
  return slugs.length ? `/ture/uporedi?t=${slugs.join(',')}` : '/ture/uporedi';
}

/** Privatni režim, pun disk ili zabrana sajta - izbor je tada prazan, bez greške. */
export function readCompare(storage: Pick<Storage, 'getItem'> | null): string[] {
  if (!storage) return [];
  try {
    return cleanSlugs(JSON.parse(storage.getItem(COMPARE_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

export function writeCompare(storage: Pick<Storage, 'setItem'> | null, slugs: string[]): void {
  if (!storage) return;
  try {
    storage.setItem(COMPARE_KEY, JSON.stringify(cleanSlugs(slugs)));
  } catch {
    // Bez pamćenja izbor važi samo do osvežavanja strane - nije greška.
  }
}
