import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// ============================================================
// Migracija panorama sa Supabase URL-ova na Cloudflare R2.
//
// Za svaki room gde je panorama_url popunjen a panorama_url_cf
// je još prazan, poziva lokalnu /api/upload-to-r2 rutu (ista
// logika koju koristi i sama aplikacija za pojedinačni upload,
// pa nema duplirane logike za preuzimanje/upload/upis u bazu).
//
// VAŽNO: pokreni "npm run dev" u drugom terminalu PRE ovog
// skripta — ruta mora biti dostupna na http://localhost:3000
//
// Pokretanje:
//   node app/migrate-to-r2.mjs
// ============================================================

const APP_URL = process.env.MIGRATE_APP_URL || 'http://localhost:3000';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(
  envFile
    .split('\n')
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const [key, ...val] = line.split('=');
      return [key.trim(), val.join('=').trim()];
    })
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function migrate() {
  console.log(`Pokrećem migraciju panorama na R2 (preko ${APP_URL}/api/upload-to-r2)...\n`);

  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('id, title_i18n, panorama_url, panorama_url_cf')
    .not('panorama_url', 'is', null)
    .is('panorama_url_cf', null);

  if (error) {
    console.error('❌ Greška pri učitavanju rooms iz Supabase:', error.message);
    return;
  }

  if (!rooms || rooms.length === 0) {
    console.log('✅ Nema soba za migraciju — sve panorame već imaju panorama_url_cf (ili nema panorama_url).');
    return;
  }

  console.log(`📦 Pronađeno ${rooms.length} soba za migraciju.\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    const label =
      (room.title_i18n && (room.title_i18n.sr || room.title_i18n.en || Object.values(room.title_i18n)[0])) ||
      room.id;

    process.stdout.write(`[${i + 1}/${rooms.length}] ${label} ... `);

    try {
      const res = await fetch(`${APP_URL}/api/upload-to-r2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          currentPanoramaUrl: room.panorama_url,
        }),
      });

      const result = await res.json();

      if (result.success) {
        console.log(`✓ → ${result.r2Url}${result.skipped ? ' (već postojalo)' : ''}`);
        success++;
      } else {
        console.log(`✗ Greška: ${result.error || 'Nepoznata greška'}`);
        failed++;
      }
    } catch (err) {
      console.log(`✗ Greška: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n🎉 Migracija gotova! ${success} uspešno, ${failed} neuspešno, od ukupno ${rooms.length}.`);
}

migrate();
