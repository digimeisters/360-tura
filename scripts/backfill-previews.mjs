/**
 * Popunjava rooms.preview_url i pretvara panorame u WebP za sobe
 * uploadovane pre nego što je to dodato u /api/upload-panorama.
 *
 * Pokretanje:  node --env-file=.env.local scripts/backfill-previews.mjs
 * Suvi hod:    node --env-file=.env.local scripts/backfill-previews.mjs --dry
 */
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const DRY = process.argv.includes('--dry');

const PREVIEW_WIDTH = 1200;
const PREVIEW_HEIGHT = 630;
const HORIZONTAL_FOV_DEG = 100;

async function generatePreview(panorama) {
  const image = sharp(panorama, { failOn: 'none' });
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new Error('nema dimenzija');

  let cropWidth = Math.round((HORIZONTAL_FOV_DEG / 360) * width);
  let cropHeight = Math.round(cropWidth * (PREVIEW_HEIGHT / PREVIEW_WIDTH));
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

async function toWebp(panorama) {
  return sharp(panorama, { failOn: 'none', limitInputPixels: false })
    .webp({ quality: 78 })
    .toBuffer();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

const bucket = process.env.R2_BUCKET_NAME;
const cdnBase = process.env.NEXT_PUBLIC_CDN_URL.replace(/\/+$/, '');

const { data: rooms, error } = await supabase
  .from('rooms')
  .select('id, tour_slug, panorama_url, panorama_url_cf, preview_url, order_index')
  .order('tour_slug', { ascending: true })
  .order('order_index', { ascending: true });

if (error) {
  console.error('Greška pri čitanju soba:', error.message);
  process.exit(1);
}

console.log(`Soba za proveru: ${rooms.length}${DRY ? ' (suvi hod)' : ''}\n`);

let ok = 0;
let skipped = 0;
let failed = 0;

for (const room of rooms) {
  const url = room.panorama_url_cf || room.panorama_url;
  const label = `${room.tour_slug} / ${room.id.slice(0, 8)}`;

  if (!url) {
    console.log(`- ${label}: nema panoramu, preskačem`);
    skipped++;
    continue;
  }

  // Ništa da se radi - ne vuci nekoliko megabajta bez potrebe.
  if (room.preview_url && url.split('?')[0].endsWith('.webp')) {
    skipped++;
    continue;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`! ${label}: panorama nedostupna (HTTP ${res.status})`);
      failed++;
      continue;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const updates = {};
    const parts = [];

    if (!room.preview_url) {
      const preview = await generatePreview(buf);
      parts.push(`preview ${(preview.length / 1024).toFixed(0)}KB`);
      if (!DRY) {
        const key = `${room.id}-preview.jpg`;
        await r2.send(
          new PutObjectCommand({ Bucket: bucket, Key: key, Body: preview, ContentType: 'image/jpeg' })
        );
        updates.preview_url = `${cdnBase}/${key}`;
      }
    }

    // Panorame snimljene kao JPEG su 7-12MB; iste u WebP-u su ispod 1MB bez
    // vidljivog gubitka. Rezolucija se ne dira.
    if (!url.split('?')[0].endsWith('.webp')) {
      const webp = await toWebp(buf);
      const saved = (100 - (webp.length / buf.length) * 100).toFixed(0);
      parts.push(
        `webp ${(buf.length / 1024 / 1024).toFixed(1)}MB -> ${(webp.length / 1024 / 1024).toFixed(2)}MB (-${saved}%)`
      );
      if (!DRY) {
        const key = `${room.id}-panorama.webp`;
        await r2.send(
          new PutObjectCommand({ Bucket: bucket, Key: key, Body: webp, ContentType: 'image/webp' })
        );
        updates.panorama_url_cf = `${cdnBase}/${key}`;
      }
    }

    if (DRY) {
      console.log(`= ${label}: ${parts.join(', ')} (nije upisano)`);
      ok++;
      continue;
    }

    const { error: upErr } = await supabase.from('rooms').update(updates).eq('id', room.id);
    if (upErr) throw new Error(upErr.message);

    console.log(`+ ${label}: ${parts.join(', ')}`);
    ok++;
  } catch (err) {
    console.log(`! ${label}: ${err.message}`);
    failed++;
  }
}

console.log(`\nGotovo. Uspešno: ${ok}, preskočeno: ${skipped}, neuspešno: ${failed}`);
