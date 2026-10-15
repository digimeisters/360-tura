import { HOME_OG_SIZE, renderHomeOgImage } from '../../lib/homeOgImage';

// Kartica kad se /alati/procena-vrednosti podeli (Viber, WhatsApp, Facebook, LinkedIn).
export const size = HOME_OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Procena vrednosti i kirije nekretnine — Kvadrat360';

// Nelomljivi razmaci drže akcenat naslova u istom redu.
const NB = '\u00a0';

export default function Image() {
  return renderHomeOgImage({
    title: `Koliko vredi vaša${NB}nekretnina?`,
    subtitle: 'Prodaja ili kirija: raspon po naselju u Kragujevcu.'
  });
}
