import { HOME_OG_SIZE, renderHomeOgImage } from '../lib/homeOgImage';

// Kartica kad se /blog podeli. Članci imaju svoju (blog/[slug]/opengraph-image.tsx).
export const size = HOME_OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Blog Kvadrat360';

export default function Image() {
  return renderHomeOgImage({
    title: 'Pročitajte pre nego što zakažete snimanje',
    subtitle: 'Saveti za prodaju i izdavanje nekretnina sa 360° turom i fotografijom.'
  });
}
