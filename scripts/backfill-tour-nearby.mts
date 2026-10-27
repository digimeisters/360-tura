/**
 * Jednokratno: okolina (OpenStreetMap) za postojeće ture sa adresom, a bez
 * okoline (migracija 041). Nove ture je dobijaju same pri čuvanju u adminu.
 *
 * Pokretanje:  node --env-file=.env.local scripts/backfill-tour-nearby.mts
 * Suvi hod:    node --env-file=.env.local scripts/backfill-tour-nearby.mts --dry
 *
 * Overpass je javan i deljen - ture idu jedna po jedna, sa pauzom. Tura kod
 * koje Overpass ne odgovori ostaje prazna; drugo pokretanje je pokušava ponovo.
 */
import { createClient } from '@supabase/supabase-js';
import { fetchNearby } from '../app/lib/nearby.ts';

const DRY = process.argv.includes('--dry');
const PAUSE_MS = 3000;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Nedostaju NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (--env-file=.env.local).');
  process.exit(1);
}
const db = createClient(url, key);

const { data: tours, error } = await db
  .from('tours')
  .select('slug, lat, lng')
  .not('lat', 'is', null)
  .not('lng', 'is', null)
  .is('nearby', null);
if (error) {
  console.error('Čitanje tura nije uspelo:', error.message);
  process.exit(1);
}

console.log(`Ture bez okoline: ${tours.length}${DRY ? ' (suvi hod)' : ''}`);
let ok = 0;
let failed = 0;
for (const [i, tour] of tours.entries()) {
  if (DRY) {
    console.log(`- ${tour.slug}`);
    continue;
  }
  try {
    const places = await fetchNearby(tour.lat, tour.lng);
    const { error: upErr } = await db
      .from('tours')
      .update({ nearby: places, nearby_updated_at: new Date().toISOString() })
      .eq('slug', tour.slug);
    if (upErr) throw new Error(upErr.message);
    ok++;
    console.log(`ok ${tour.slug} ${places.length}`);
  } catch (err) {
    failed++;
    console.log(`greška ${tour.slug} ${err instanceof Error ? err.message : err}`);
  }
  if (i < tours.length - 1) await new Promise((r) => setTimeout(r, PAUSE_MS));
}
if (!DRY) console.log(`Gotovo: ${ok} ok, ${failed} greška`);
