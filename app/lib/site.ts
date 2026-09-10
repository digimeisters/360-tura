// Kanonski domen sajta. Na Vercelu se može pregaziti preko
// NEXT_PUBLIC_SITE_URL (npr. za staging), inače je produkcijski domen.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://kvadrat360.com'
).replace(/\/$/, '');

export const SITE_NAME = 'Kvadrat360';
