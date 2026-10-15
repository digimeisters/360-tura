import { HOME_OG_SIZE, renderHomeOgImage } from '../lib/homeOgImage';

// Kartica kad se /alati podeli (Viber, WhatsApp, Facebook, LinkedIn).
export const size = HOME_OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Kvadrat360 alati — kalkulator kredita i procena vrednosti';

// Nelomljivi razmaci drže akcenat naslova u istom redu.
const NB = '\u00a0';

export default function Image() {
  return renderHomeOgImage({
    title: `Alati za kupovinu i${NB}prodaju.`,
    subtitle: 'Kalkulator kredita sa povratom PDV-a i procena vrednosti. Kragujevac.'
  });
}
