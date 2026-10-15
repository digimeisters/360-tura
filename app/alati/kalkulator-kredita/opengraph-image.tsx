import { HOME_OG_SIZE, renderHomeOgImage } from '../../lib/homeOgImage';

// Kartica kad se /alati/kalkulator-kredita podeli (Viber, WhatsApp, Facebook, LinkedIn).
export const size = HOME_OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Kalkulator stambenog kredita i troškova kupovine — Kvadrat360';

// Nelomljivi razmaci drže akcenat naslova u istom redu.
const NB = '\u00a0';

export default function Image() {
  return renderHomeOgImage({
    title: `Koliko vas stan zaista${NB}košta?`,
    subtitle: 'Rata, notar, katastar i povrat PDV-a za prvi stan.'
  });
}
