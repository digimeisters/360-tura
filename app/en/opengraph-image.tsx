import { HOME_OG_SIZE, renderHomeOgImage } from '../lib/homeOgImage';

export const size = HOME_OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Kvadrat360 — 360° virtual tours for real estate';

export default function Image() {
  return renderHomeOgImage({
    title: '360° virtual tours for real estate',
    subtitle: 'Audio guide in four languages, interactive floor plan and HDR photography.'
  });
}
