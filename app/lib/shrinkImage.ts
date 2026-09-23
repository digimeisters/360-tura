/**
 * Smanjuje sliku u pregledaču pre slanja, kad je veća od `maxBytes`.
 *
 * Postoji zbog Vercela: telo zahteva ka API ruti ne sme da pređe 4,5MB, a
 * to platforma odbije pre našeg koda, običnim tekstom umesto JSON-a. Slika
 * tlocrta slikana telefonom lako ima 5-8MB, a za prikaz u modalu "Skica"
 * je 3000px po dužoj strani više nego dovoljno.
 *
 * Mala slika se vraća netaknuta. Ako pregledač ne ume da je dekodira,
 * vraća se original - server će je onda sam odbiti sa jasnom porukom.
 */

const MAX_SIDE_PX = 3000;
const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.5];

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

export async function shrinkImage(file: File, maxBytes: number): Promise<File> {
  if (file.size <= maxBytes) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  let side = MAX_SIDE_PX;
  try {
    // Posle svih koraka kvaliteta smanjuje se i rezolucija, do 1200px -
    // ispod toga tlocrt postaje nečitljiv, pa radije vraćamo original.
    while (side >= 1200) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      // JPEG nema providnost - PNG tlocrt sa providnom pozadinom bi
      // inače dobio crnu pozadinu.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, quality);
        if (blob && blob.size <= maxBytes) {
          const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
          return new File([blob], name, { type: 'image/jpeg' });
        }
      }
      side = Math.round(side * 0.75);
    }
    return file;
  } finally {
    bitmap.close();
  }
}
