import { HOME_OG_SIZE, renderHomeOgImage } from '../../lib/homeOgImage';

// Kartica kad se /alati/cene-nekretnina-kragujevac podeli (Viber, WhatsApp, Facebook, LinkedIn).
export const size = HOME_OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Cene stanova u Kragujevcu po naseljima — Kvadrat360';

// Nelomljivi razmaci drže akcenat naslova u istom redu.
const NB = '\u00a0';

export default function Image() {
  return renderHomeOgImage({
    title: `Cene stanova u Kragujevcu po${NB}naseljima.`,
    subtitle: 'Cena kvadrata i kirija za Centar, Bubanj, Erdogliju, Aerodrom i ostala naselja.'
  });
}
