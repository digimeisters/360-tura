// normalize('NFD') razlaže č/ć/š/ž na slovo + akcenat, ali đ nije slovo sa
// akcentom nego zaseban znak, pa ide ručno. Ćirilica se preslovljava cela -
// oglasi u Srbiji se pišu i jednim i drugim pismom, a bez ovoga bi ćirilični
// naziv dao prazan slug.
const CHAR_MAP: Record<string, string> = {
  đ: 'dj',
  Đ: 'dj',
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'dj', е: 'e', ж: 'z', з: 'z',
  и: 'i', ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', ћ: 'c', у: 'u', ф: 'f', х: 'h', ц: 'c',
  ч: 'c', џ: 'dz', ш: 's',
  А: 'a', Б: 'b', В: 'v', Г: 'g', Д: 'd', Ђ: 'dj', Е: 'e', Ж: 'z', З: 'z',
  И: 'i', Ј: 'j', К: 'k', Л: 'l', Љ: 'lj', М: 'm', Н: 'n', Њ: 'nj', О: 'o',
  П: 'p', Р: 'r', С: 's', Т: 't', Ћ: 'c', У: 'u', Ф: 'f', Х: 'h', Ц: 'c',
  Ч: 'c', Џ: 'dz', Ш: 's'
};

export const MAX_SLUG_LENGTH = 60;

export function slugify(input: string): string {
  return input
    .split('')
    .map((ch) => CHAR_MAP[ch] ?? ch)
    .join('')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');
}

/**
 * Slug koji sigurno nije zauzet. Zauzeti dobija sufiks -2, -3...
 * `taken` je skup postojećih slug-ova (mala slova).
 */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const clean = slugify(base) || 'tura';
  if (!taken.has(clean)) return clean;

  for (let i = 2; i < 500; i++) {
    const candidate = `${clean.slice(0, MAX_SLUG_LENGTH - 4)}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${clean.slice(0, MAX_SLUG_LENGTH - 14)}-${Date.now().toString(36)}`;
}
