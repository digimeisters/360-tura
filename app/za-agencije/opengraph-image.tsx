import { HOME_OG_SIZE, renderHomeOgImage } from '../lib/homeOgImage';

// Kartica kad se /za-agencije podeli (Viber, WhatsApp, Facebook, LinkedIn).
export const size = HOME_OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Kvadrat360 za agencije — 360° ture za oglase u Kragujevcu';

// Nelomljivi razmaci drže „Kupac zove vas.“ u istom redu.
const NB = ' ';

export default function Image() {
  return renderHomeOgImage({
    title: `Ista nekretnina, tri agencije. Kupac${NB}zove${NB}vas.`,
    subtitle: '360° tura za vaš oglas za 24–48h. Kragujevac i okolina.'
  });
}
