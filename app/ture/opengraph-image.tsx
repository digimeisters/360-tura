import { HOME_OG_SIZE, renderHomeOgImage } from '../lib/homeOgImage';

// Kartica kad se /ture podeli.
export const size = HOME_OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Primeri 360° virtuelnih tura — Kvadrat360';

export default function Image() {
  return renderHomeOgImage({
    title: 'Prošetajte kroz primere 360° tura',
    subtitle: 'Svaka prostorija, tlocrt i audio vodič — pre prvog dolaska.'
  });
}
