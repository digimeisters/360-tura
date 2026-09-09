import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// ============================================================
// Pronalazi (i, sa --apply, uklanja) duple waypoints/hotspotove
// u rooms.waypoints_i18n - najčešće nastaju od ponovljenog AI
// generisanja ili duplog čuvanja iste tačke.
//
// Dva waypoint-a se smatraju duplikatom ako imaju:
//   - isti tip (navigation / info)
//   - yaw i pitch zaokruženi na 0.1 stepen su identični
//   - (za navigation) isti targetRoomId
//
// Kad nađe duplikat, zadržava onaj sa "bogatijim" sadržajem
// (više popunjenih jezika u title_i18n/text_i18n), a ostale
// briše.
//
// Pokretanje (samo izveštaj, ništa se ne menja u bazi):
//   node app/find-duplicate-waypoints.mjs
//
// Pokretanje (stvarno briše duplikate iz baze):
//   node app/find-duplicate-waypoints.mjs --apply
// ============================================================

const APPLY = process.argv.includes('--apply');

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

function parseWaypoints(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* ignore */
    }
  }
  return [];
}

function getLabel(titleI18n) {
  if (!titleI18n) return '(bez naslova)';
  if (typeof titleI18n === 'string') return titleI18n;
  if (typeof titleI18n === 'object') {
    return titleI18n.sr || titleI18n.en || Object.values(titleI18n)[0] || '(bez naslova)';
  }
  return '(bez naslova)';
}

// "Bogatstvo" waypoint-a - koliko jezika ima popunjen tekst, koristi se
// da odlučimo koju kopiju da ZADRŽIMO kad nađemo duplikat.
function richness(wp) {
  let count = 0;
  for (const field of [wp.title_i18n, wp.text_i18n]) {
    if (field && typeof field === 'object') {
      count += Object.values(field).filter((v) => typeof v === 'string' && v.trim().length > 0).length;
    } else if (typeof field === 'string' && field.trim().length > 0) {
      count += 1;
    }
  }
  if (wp.audio_url) count += 1;
  return count;
}

function dedupeKey(wp) {
  const type = wp.type === 'navigation' || wp.targetRoomId ? 'navigation' : 'info';
  const yaw = Math.round((Number(wp.yaw) || 0) * 10);
  const pitch = Math.round((Number(wp.pitch) || 0) * 10);
  const target = type === 'navigation' ? String(wp.targetRoomId ?? '') : '';
  return `${type}|${yaw}|${pitch}|${target}`;
}

async function run() {
  console.log(APPLY ? '⚠️  REŽIM PRIMENE — duplikati će biti obrisani iz baze.\n' : 'ℹ️  Samo izveštaj (dry-run) — ništa se ne menja. Dodaj --apply da stvarno obrišeš duplikate.\n');

  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('id, title_i18n, waypoints_i18n');

  if (error) {
    console.error('❌ Greška pri učitavanju rooms:', error.message);
    return;
  }

  let totalDuplicates = 0;
  let roomsWithDuplicates = 0;

  for (const room of rooms) {
    const waypoints = parseWaypoints(room.waypoints_i18n);
    if (waypoints.length === 0) continue;

    const groups = new Map();
    waypoints.forEach((wp, idx) => {
      const key = dedupeKey(wp);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ wp, idx });
    });

    const toRemoveIdx = new Set();
    const roomDuplicateReport = [];

    for (const [key, items] of groups.entries()) {
      if (items.length <= 1) continue;

      // zadrži onaj sa najviše sadržaja, ostale označi za brisanje
      items.sort((a, b) => richness(b.wp) - richness(a.wp));
      const keep = items[0];
      const remove = items.slice(1);

      remove.forEach((item) => toRemoveIdx.add(item.idx));

      roomDuplicateReport.push({
        key,
        keepLabel: getLabel(keep.wp.title_i18n),
        removedCount: remove.length,
      });
    }

    if (toRemoveIdx.size === 0) continue;

    roomsWithDuplicates++;
    totalDuplicates += toRemoveIdx.size;

    console.log(`🚪 ${getLabel(room.title_i18n)} (room ${room.id}) — ${toRemoveIdx.size} duplikat(a):`);
    roomDuplicateReport.forEach((r) => {
      console.log(`   • "${r.keepLabel}" — zadržana 1, obrisano ${r.removedCount} duplikata (${r.key})`);
    });

    if (APPLY) {
      const cleanedWaypoints = waypoints.filter((_, idx) => !toRemoveIdx.has(idx));
      const { error: updateErr } = await supabase
        .from('rooms')
        .update({ waypoints_i18n: cleanedWaypoints })
        .eq('id', room.id);

      if (updateErr) {
        console.log(`   ❌ Greška pri upisu za sobu ${room.id}: ${updateErr.message}`);
      } else {
        console.log(`   ✅ Sačuvano (${waypoints.length} → ${cleanedWaypoints.length} tačaka).`);
      }
    }
    console.log('');
  }

  if (totalDuplicates === 0) {
    console.log('✅ Nema pronađenih duplikata ni u jednoj sobi.');
    return;
  }

  console.log(
    `\n📊 Ukupno: ${totalDuplicates} duplikata u ${roomsWithDuplicates} soba.` +
      (APPLY ? ' Sve je upisano u bazu.' : ' Pokreni sa --apply da ih stvarno obrišeš.')
  );
}

run();
