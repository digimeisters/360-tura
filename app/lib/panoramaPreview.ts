import sharp from 'sharp';

export const PREVIEW_WIDTH = 1200;
export const PREVIEW_HEIGHT = 630;

// Panorame stižu kao JPEG od 7-12MB, što je na mobilnoj mreži nekoliko
// sekundi čekanja po prostoriji. Isti kadar u WebP-u je ispod 1MB bez
// vidljivog gubitka - na uvećanju 1:1 razlika se ne primećuje. Glavna
// kopija zato zadržava punu rezoluciju (računar, zumiranje).
export async function convertPanoramaToWebp(panorama: Buffer): Promise<Buffer> {
  return sharp(panorama, { failOn: 'none', limitInputPixels: false })
    .webp({ quality: 78 })
    .toBuffer();
}

/**
 * Širina kopije za telefone. Telefon prikazuje 65° vidnog polja na ~1170
 * fizičkih piksela (~18 px/°); 6000px daje ~17 px/° - ista oštrina na oko,
 * a ~72MB memorije umesto ~128MB kod 8000px, što starije iPhone-e drži
 * dalje od pada pregledača. Vidi migraciju 018.
 */
export const MOBILE_PANORAMA_WIDTH = 6000;

/** Ključ kopije za telefone izveden iz ključa glavne panorame. */
export function mobilePanoramaKey(key: string): string {
  return key.replace(/-panorama\.[a-z]+$/i, '-panorama-m.webp');
}

/** Kopija za telefone; panorama uža od MOBILE_PANORAMA_WIDTH se samo prepakuje. */
export async function makeMobilePanorama(panorama: Buffer): Promise<Buffer> {
  return sharp(panorama, { failOn: 'none', limitInputPixels: false })
    .resize({ width: MOBILE_PANORAMA_WIDTH, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
}

// Equirectangular panorama pokriva 360°x180°, pa je cela slika neupotrebljiva
// kao thumbnail - plafon i pod su razvučeni preko celog kadra. Uzima se prozor
// oko horizonta (vertikalna sredina), gde je izobličenje najmanje.
const HORIZONTAL_FOV_DEG = 100;

/**
 * Pravi 1200x630 JPEG isečak panorame za deljenje (OG kartica).
 * Ulaz je sirov buffer panorame, izlaz JPEG buffer.
 */
export async function generatePanoramaPreview(panorama: Buffer): Promise<Buffer> {
  const image = sharp(panorama, { failOn: 'none' });
  const meta = await image.metadata();

  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) {
    throw new Error('Nije moguće pročitati dimenzije panorame.');
  }

  // Širina prozora iz željenog horizontalnog ugla, pa visina iz odnosa 1200:630.
  let cropWidth = Math.round((HORIZONTAL_FOV_DEG / 360) * width);
  let cropHeight = Math.round(cropWidth * (PREVIEW_HEIGHT / PREVIEW_WIDTH));

  // Kod uskih/netipičnih slika prozor može da ispadne viši od originala.
  if (cropHeight > height) {
    cropHeight = height;
    cropWidth = Math.round(cropHeight * (PREVIEW_WIDTH / PREVIEW_HEIGHT));
  }
  cropWidth = Math.min(cropWidth, width);

  return image
    .extract({
      left: Math.round((width - cropWidth) / 2),
      top: Math.round((height - cropHeight) / 2),
      width: cropWidth,
      height: cropHeight
    })
    .resize(PREVIEW_WIDTH, PREVIEW_HEIGHT, { fit: 'cover' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}
