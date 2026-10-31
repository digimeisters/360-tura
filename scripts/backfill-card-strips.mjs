/**
 * Pravi traku panorame za karticu ture (migracija 044) za sobe otpremljene
 * pre nje i upisuje je u rooms.strip_url. Panorama se ne dira - samo se
 * dodaje novi fajl pored nje.
 *
 * Pokretanje:  node --env-file=.env.local scripts/backfill-card-strips.mjs
 * Suvi hod:    node --env-file=.env.local scripts/backfill-card-strips.mjs --dry
 * Ponovo sve:  ... --force  (npr. posle promene veličine trake)
 */
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { makeCardStrip, cardStripKey } from '../app/lib/panoramaPreview.ts';

const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }
});
const bucket = process.env.R2_BUCKET_NAME;
const cdnBase = process.env.NEXT_PUBLIC_CDN_URL.replace(/\/+$/, '');

const { data: rooms, error } = await supabase
  .from('rooms')
  .select('id, tour_slug, panorama_url_cf, panorama_url_mobile, strip_url')
  .not('panorama_url_cf', 'is', null)
  .order('tour_slug');

if (error) {
  console.error(/strip_url/.test(error.message) ? 'Kolona strip_url ne postoji - prvo migracija 044.' : error.message);
  process.exit(1);
}

let ok = 0, skipped = 0, failed = 0, bytes = 0;

for (const room of rooms) {
  const label = `${room.tour_slug} / ${String(room.id).slice(0, 8)}`;
  if (room.strip_url && !FORCE) { skipped++; continue; }

  const mainPath = room.panorama_url_cf.split('?')[0];
  if (!mainPath.startsWith(cdnBase + '/')) {
    console.log(`- ${label}: panorama nije na našem CDN-u, preskačem`);
    skipped++;
    continue;
  }
  // Ključ je izveden iz glavne panorame - isto kao pri otpremanju i brisanju.
  const key = cardStripKey(decodeURIComponent(mainPath.slice(cdnBase.length + 1)));
  // Kopija za telefone je dovoljno velika za traku od 2400px, a dvostruko lakša za preuzimanje.
  const source = room.panorama_url_mobile || room.panorama_url_cf;

  try {
    const res = await fetch(source);
    if (!res.ok) { console.log(`! ${label}: panorama nedostupna (HTTP ${res.status})`); failed++; continue; }
    const strip = await makeCardStrip(Buffer.from(await res.arrayBuffer()));
    bytes += strip.length;
    const info = `${(strip.length / 1024).toFixed(0)} KB`;
    if (DRY) { console.log(`= ${label}: ${info} (nije upisano)`); ok++; continue; }

    await r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: strip, ContentType: 'image/webp' }));
    const { error: upErr } = await supabase
      .from('rooms')
      .update({ strip_url: `${cdnBase}/${key}?v=${Date.now()}` })
      .eq('id', room.id);
    if (upErr) throw new Error(upErr.message);
    console.log(`+ ${label}: ${info}`);
    ok++;
  } catch (err) {
    console.log(`! ${label}: ${err.message}`);
    failed++;
  }
}

console.log(`\nGotovo. Uspešno: ${ok}, preskočeno: ${skipped}, neuspešno: ${failed}` +
  (ok ? `, prosečno ${(bytes / ok / 1024).toFixed(0)} KB po traci` : ''));
