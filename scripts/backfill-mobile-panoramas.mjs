/**
 * Pravi kopiju panorame za telefone (6000px, WebP) za sobe otpremljene pre
 * migracije 018 i upisuje je u rooms.panorama_url_mobile. Glavna panorama
 * se ne dira - samo se dodaje novi fajl pored nje.
 *
 * Pokretanje:  node --env-file=.env.local scripts/backfill-mobile-panoramas.mjs
 * Suvi hod:    node --env-file=.env.local scripts/backfill-mobile-panoramas.mjs --dry
 */
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const DRY = process.argv.includes('--dry');

// Isto kao app/lib/panoramaPreview.ts (MOBILE_PANORAMA_WIDTH, mobilePanoramaKey).
const MOBILE_PANORAMA_WIDTH = 6000;
const mobileKey = (key) => key.replace(/-panorama\.[a-z]+$/i, '-panorama-m.webp');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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
  .select('id, tour_slug, panorama_url_cf, panorama_url_mobile')
  .not('panorama_url_cf', 'is', null)
  .order('tour_slug');

if (error) {
  console.error(
    /panorama_url_mobile/.test(error.message)
      ? 'Kolona panorama_url_mobile ne postoji - prvo pokrenite supabase/migrations/018_room_mobile_panorama.sql.'
      : error.message
  );
  process.exit(1);
}

let ok = 0;
let skipped = 0;
let failed = 0;

for (const room of rooms) {
  const label = `${room.tour_slug} / ${String(room.id).slice(0, 8)}`;

  if (room.panorama_url_mobile) {
    skipped++;
    continue;
  }

  const url = room.panorama_url_cf;
  const path = url.split('?')[0];
  if (!path.startsWith(cdnBase + '/')) {
    console.log(`- ${label}: panorama nije na našem CDN-u, preskačem`);
    skipped++;
    continue;
  }
  const key = mobileKey(decodeURIComponent(path.slice(cdnBase.length + 1)));
  const version = url.includes('?') ? url.slice(url.indexOf('?')) : '';

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`! ${label}: panorama nedostupna (HTTP ${res.status})`);
      failed++;
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(buf, { limitInputPixels: false }).metadata();
    const mobile = await sharp(buf, { failOn: 'none', limitInputPixels: false })
      .resize({ width: MOBILE_PANORAMA_WIDTH, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    const info = `${meta.width}px ${(buf.length / 1024).toFixed(0)}KB -> ${Math.min(meta.width, MOBILE_PANORAMA_WIDTH)}px ${(mobile.length / 1024).toFixed(0)}KB`;

    if (DRY) {
      console.log(`= ${label}: ${info} (nije upisano)`);
      ok++;
      continue;
    }

    await r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: mobile, ContentType: 'image/webp' }));
    const { error: upErr } = await supabase
      .from('rooms')
      .update({ panorama_url_mobile: `${cdnBase}/${key}${version}` })
      .eq('id', room.id);
    if (upErr) throw new Error(upErr.message);

    console.log(`+ ${label}: ${info}`);
    ok++;
  } catch (err) {
    console.log(`! ${label}: ${err.message}`);
    failed++;
  }
}

console.log(`\nGotovo. Uspešno: ${ok}, preskočeno: ${skipped}, neuspešno: ${failed}`);
