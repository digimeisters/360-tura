import { HOME_OG_SIZE, renderHomeOgImage } from '../lib/homeOgImage';

// Kartica kad vlasnik pošalje link /za-investitore investitoru.
export const size = HOME_OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Kvadrat360 za investitore novogradnje';

export default function Image() {
  return renderHomeOgImage({
    title: 'Prodajte stan pre nego što je sazidan',
    subtitle: 'Stanovi na fotografiji zgrade, 360° ture i prodaja koja sama menja statuse.'
  });
}
