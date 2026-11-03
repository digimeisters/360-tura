import { HOME_OG_SIZE, renderHomeOgImage } from '../lib/homeOgImage';

// Kartica kad se /za-vlasnike podeli (Viber, WhatsApp, Facebook).
export const size = HOME_OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Kvadrat360 za vlasnike — 360° tura za prodaju ili izdavanje nekretnine';

// Nelomljivi razmaci drže „pre poziva.“ u istom redu.
const NB = ' ';

export default function Image() {
  return renderHomeOgImage({
    title: `Prodajete ili izdajete? Kupac prošeta pre${NB}poziva.`,
    subtitle: '360° tura i HDR fotografije za 24–48h. Kragujevac i okolina.'
  });
}
