import { HOME_OG_SIZE, renderHomeOgImage } from './lib/homeOgImage';

export const size = HOME_OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Kvadrat360 — 360° virtuelne ture za nekretnine';

export default function Image() {
  return renderHomeOgImage({
    title: '360° virtuelne ture za nekretnine',
    subtitle: 'Audio vodič na četiri jezika, interaktivni tlocrt i HDR fotografija.'
  });
}
