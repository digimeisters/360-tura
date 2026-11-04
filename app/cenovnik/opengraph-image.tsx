import { HOME_OG_SIZE, renderHomeOgImage } from '../lib/homeOgImage';
import { displayPackagePrice, formatAmount, isPromoActive } from '../lib/pricing';

// Kartica kad se /cenovnik podeli (Viber, WhatsApp, Facebook). Cena dolazi iz
// pricing.ts: dok traje promocija je promo cena, posle nje redovna.
export const size = HOME_OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Cenovnik Kvadrat360 — 360° tura i HDR fotografije po nekretnini';

// Osvežava se kao strana, pa posle kraja promocije kartica sama pokaže redovnu cenu.
export const revalidate = 3600;

// Nelomljivi razmaci drže iznos i "din." u istom redu.
const NB = ' ';

export default function Image() {
  const price = formatAmount(displayPackagePrice(1, 'basic', 'sr', isPromoActive()), 'sr').replace(' ', NB);
  return renderHomeOgImage({
    title: `Cenovnik: 360° tura od${NB}${price}`,
    subtitle: 'Po nekretnini. Agencije sa više nekretnina mesečno plaćaju manje.'
  });
}
