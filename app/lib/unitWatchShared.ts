/**
 * Deo "Obavesti me" koji treba i pregledaču (prodajna tabla): ko čeka koji
 * stan. Serverski deo (upis, mejlovi, odjava) je u unitWatch.ts.
 */

/** "Dvosoban (2.0)" i "dvosoban" su ista struktura. */
export function sameStructure(a: string | null | undefined, b: string | null | undefined): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, '').replace(/\s+/g, '');
  return Boolean(a && b) && norm(a as string) === norm(b as string);
}

type WatchLike = { unit_code: string; structure: string | null; or_similar: boolean };

/** Koje prijave bi dobile mejl kad se ovaj stan oslobodi. */
export function watchersOf<T extends WatchLike>(watches: T[], unit: { code: string; structure: string | null }): T[] {
  return watches.filter((w) => w.unit_code === unit.code || (w.or_similar && sameStructure(w.structure, unit.structure)));
}
