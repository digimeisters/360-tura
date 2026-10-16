// Predlog novih cena po m² za kalkulator procene (/procena-vrednosti) iz
// javnih oglasa za Kragujevac na 4zida.rs.
//
// Cene se osvežavaju NA SVAKA 2 MESECA (vlasnik, 12. 10. 2026). Kad su
// starije od toga, svaki novi zahtev sa kalkulatora na Telegramu nosi
// upozorenje (vidi PRICE_MAX_AGE_DAYS u app/lib/valuation/calculateEstimate.ts).
//
// Skripta NIŠTA ne upisuje u bazu - samo pravi SQL fajl za pregled:
//   supabase/seed/zone_price_baselines_4zida_<GGGG-MM-DD>.sql
// Vlasnik ga pregleda, pa se pokrene u Supabase SQL editoru (upsert, pa
// brisanje redova iz ranijih osvežavanja koji sada ne prolaze pravilo;
// ručno uneti redovi se ne diraju).
//
// Pokretanje:  npm run prices:refresh      (traje ~12 minuta)
//
// Kako radi: strane sa listom oglasa na 4zida sadrže JSON-LD (cena,
// kvadratura, adresa sa naseljem). Strane se čitaju jedna po jedna, sa
// pauzom, kao kad čovek lista oglase.
//
// Pravilo za cene (isto za svako naselje):
//   prodaja:    od = 25. percentil oglasa × 0,85   do = medijana × 0,95
//               (oglasi su tražene cene; RGZ prosek stvarnih prodaja je
//               ~30% ispod oglasnog)
//   izdavanje:  od = 25. percentil                  do = medijana
//               (€/m² MESEČNO; oglasi su uglavnom namešteni stanovi)
//   raspon je uvek bar 10% širi od donje granice; naselje dobija red samo
//   uz bar MIN_LISTINGS nezavisnih oglasa, ostala kalkulator računa iz
//   proseka grada.
//
// Nezavisni oglasi (vlasnik, 15. 10. 2026 - lokali na Pivari su ispali
// skuplji od Centra jer je isti prodavac oglasio dva lokala u istoj zgradi):
// oglasi sa istom ulicom u istom naselju i kategoriji računaju se kao JEDAN
// (uzima se njihova medijana). Oglas čiji je naziv samo naselje ("Centar",
// "Pivara") nema ulicu, pa ostaje zaseban.
//
// Novogradnja i starogradnja (vlasnik, 16. 10. 2026) - samo stanovi na prodaju:
//   - oglasi investitora (/novogradnja/... na 4zida) su novogradnja; ceo
//     projekat je jedan glas, kao jedna ulica
//   - ostalim oglasima skripta otvori stranu i pročita "Stanje" i godinu
//     izgradnje: Novo / U izgradnji ili godina >= NEW_FROM_YEAR -> novogradnja;
//     Uobičajeno / Renovirano / Za renoviranje ili starija godina ->
//     starogradnja; bez toga (npr. samo "Luksuzno") oglas ne ulazi ni u jednu
//   - zato traje ~12 minuta umesto 2
// Kuće, lokali i kirije ostaju zajedno (build_type 'any') - novih ima premalo.
// Uz naselja ide i red "Ceo grad" za svaku kombinaciju: procena ga koristi za
// naselje bez sopstvenog reda (umesto proseka redova naselja).

import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');

const CATEGORIES = [
  'prodaja-stanova',
  'izdavanje-stanova',
  'prodaja-kuca',
  'izdavanje-kuca',
  'prodaja-poslovnih-prostora',
  'izdavanje-poslovnih-prostora'
];
const MAX_PAGES = 80;
const PAUSE_MS = 900;
// Lokala i kuća ima malo i jako se razlikuju, pa im treba više oglasa.
const MIN_LISTINGS = { apartment: 5, house: 10, commercial: 10 };
// Red "Ceo grad" traži bar ovoliko nezavisnih glasova.
const MIN_CITY = 8;
// Naselje sa posebnim rasponom za novogradnju ili starogradnju traži više
// glasova (vlasnik, 16. 10. 2026): na Vašarištu je 7 "novih" bilo skoro sve
// iz jednog projekta "na papiru" (jeftinije), a 5 "starih" renovirani/lux.
const MIN_SPLIT = 8;
// Zgrada od ove godine pa naovamo je novogradnja.
const NEW_FROM_YEAR = 2018;
// Naziv reda za ceo grad (nije naselje; strana cena i procena ga prepoznaju).
const CITY_ROW = 'Ceo grad';

// Oglas van ovih granica (€/m²) je greška u oglasu: cena u dinarima,
// kirija upisana kao prodaja, pogrešna kvadratura...
const SANE = { sale: [250, 6000], rent: [1.5, 40] };
const RULE = {
  sale: { low: (p25) => p25 * 0.85, high: (med) => med * 0.95, round: 10 },
  rent: { low: (p25) => p25, high: (med) => med, round: 0.1 }
};

// Deo adrese na 4zida -> naziv naselja iz app/lib/propertyTaxonomy.ts.
// Mešovite oznake ("centar-aerodrom") se namerno ne dodeljuju nijednom
// naselju. Novo naselje na 4zida koje ovde nema samo se preskače - skripta
// ga ispiše na kraju, da se odluči da li se dodaje.
const AREA_TO_NEIGHBOURHOOD = {
  'centar': 'Centar',
  // 4zida vodi Bubanj kao "bubanj-centar"; vlasnik, 15. 10. 2026: Bubanj je
  // svoje naselje, ne Centar.
  'bubanj-centar': 'Bubanj',
  'centar-stari-grad': 'Centar',
  'stari-grad': 'Centar',
  'mala-vaga-centar': 'Mala Vaga',
  'aerodrom': 'Aerodrom',
  'erdoglija': 'Erdoglija',
  'bagremar': 'Bagremar',
  'stanovo': 'Stanovo',
  'centralna-radionica': 'Centralna radionica',
  'pivara': 'Pivara',
  'centar-preko-lepenice-pivara': 'Centar preko Lepenice',
  'bresnica': 'Bresnica',
  'palilule': 'Palilule',
  'sumarice': 'Šumarice',
  'park-jezero-sumarice': 'Šumarice',
  'petrovac': 'Petrovac',
  'belosevac': 'Beloševac',
  'susica-aerodrom': 'Sušica',
  'susice': 'Sušica',
  'ilicevo': 'Ilićevo',
  'koricani': 'Korićani',
  'denino-brdo-aerodrom': 'Denino brdo',
  'marsic-okolne-lokacije': 'Maršić',
  'vinogradi': 'Vinogradi',
  'male-pcelice': 'Male Pčelice',
  'erdec-okolne-lokacije': 'Erdeč',
  'grosnica-okolne-lokacije': 'Grošnica',
  'sest-topola-palilule': 'Šest Topola',
  'kosutnjak-ilina-voda': 'Košutnjak',
  'ilina-voda': 'Ilina Voda',
  'stara-zvezda-palilule': 'Zvezda',
  'stara-radnicka-kolonija': 'Kolonija',
  'vasariste': 'Vašarište',
  'veliki-park-vasariste': 'Vašarište',
  'visnjak': 'Višnjak'
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const area = (slug) =>
  slug.replace(/-kragujevac$/, '').replace(/-(gradske|prigradske|seoske|ostale)-lokacije$/, '');
const quantile = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b);
  const i = (s.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
};
const roundTo = (x, step) => Number((Math.round(x / step) * step).toFixed(1));

function parseListings(html, category) {
  const out = [];
  const re = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    let data;
    try {
      data = JSON.parse(m[1]);
    } catch {
      continue;
    }
    const lists = [data, ...(data['@graph'] || [])].filter((d) => d && d['@type'] === 'ItemList');
    for (const list of lists) {
      for (const el of list.itemListElement || []) {
        const offer = el.item || el;
        const url = offer.url || el.url;
        const price = offer.price ?? offer.offers?.price;
        const m2 = (offer.itemOffered || {}).floorSize?.value;
        if (!url || !price || !m2) continue;
        const name = String(offer.name || offer.itemOffered?.name || '');
        // Stan iz projekta investitora: /novogradnja/<deo-grada>/<investitor>/<projekat>/...
        if (url.includes('/novogradnja/')) {
          const parts = url.split('/novogradnja/')[1].split('/');
          out.push({ category, url, slug: parts[0] || '', price, m2, name, build: 'new', project: `${parts[1]}/${parts[2]}` });
          continue;
        }
        const slug = url.split(`/${category}/`)[1]?.split('/')[0] || '';
        out.push({ category, url, slug, price, m2, name, build: null, project: null });
      }
    }
  }
  return out;
}

async function scrape() {
  const all = [];
  for (const category of CATEGORIES) {
    const seen = new Set();
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `https://www.4zida.rs/${category}/kragujevac${page > 1 ? `?strana=${page}` : ''}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Kvadrat360 price refresh)' } });
      if (!res.ok) {
        console.warn(`  ${category} strana ${page}: HTTP ${res.status}`);
        break;
      }
      const items = parseListings(await res.text(), category).filter((i) => !seen.has(i.url));
      if (items.length === 0) break;
      items.forEach((i) => seen.add(i.url));
      all.push(...items);
      await sleep(PAUSE_MS);
    }
    console.log(`  ${category}: ${seen.size} oglasa`);
  }
  return all;
}

/**
 * Novogradnja ili starogradnja iz strane oglasa ("Stanje - Novo, ..." i
 * "Godina izgradnje"). null = oglas ne kaže dovoljno.
 */
function buildFromDetail(html) {
  const state = (html.match(/Stanje - ([^,.\\"<]+)/) || [])[1]?.trim().toLowerCase() || '';
  const year = Number((html.match(/[Gg]odina izgradnje[^0-9]{0,40}(\d{4})/) || [])[1]) || null;
  if (state === 'novo' || state === 'u izgradnji') return 'new';
  if (year) return year >= NEW_FROM_YEAR ? 'new' : 'old';
  if (['uobičajeno', 'renovirano', 'za renoviranje', 'potrebno renoviranje'].includes(state)) return 'old';
  return null;
}

/** Otvara svaki oglas stana na prodaju (osim investitorskih) i upisuje build. */
async function classifyApartments(listings) {
  const todo = listings.filter((l) => l.category === 'prodaja-stanova' && !l.build);
  let done = 0;
  for (const l of todo) {
    try {
      const res = await fetch(l.url, { headers: { 'User-Agent': 'Mozilla/5.0 (Kvadrat360 price refresh)' } });
      if (res.ok) l.build = buildFromDetail(await res.text());
    } catch {
      // Oglas koji se ne otvori ostaje nesvrstan.
    }
    if (++done % 100 === 0) console.log(`  stanje oglasa: ${done}/${todo.length}`);
    await sleep(PAUSE_MS);
  }
  const count = (b) => listings.filter((l) => l.category === 'prodaja-stanova' && l.build === b).length;
  console.log(`  stanovi na prodaju: novogradnja ${count('new')}, starogradnja ${count('old')}, nesvrstano ${count(null)}`);
}

const plain = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'dj')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// Nazivi koji su samo deo grada, a ne ulica: sva naselja i početni delovi
// oznaka sa 4zida ("veliki park", "stari grad"...).
const AREA_WORDS = new Set([
  ...Object.values(AREA_TO_NEIGHBOURHOOD).map(plain),
  ...Object.keys(AREA_TO_NEIGHBOURHOOD).flatMap((k) => k.split('-').map((_, i, parts) => parts.slice(0, i + 1).join(' ')))
]);

/** Ulica iz naziva oglasa ("Kosovska 12" -> "kosovska"), ili null kad je naziv samo naselje. */
function street(name) {
  const p = plain(name).replace(/\s*\d.*$/, '').trim();
  return !p || AREA_WORDS.has(p) ? null : p;
}

function toRows(listings) {
  const groups = new Map();
  const unmapped = new Map();
  for (const r of listings) {
    const kind = r.category.startsWith('prodaja') ? 'sale' : 'rent';
    const type = r.category.includes('stanova') ? 'apartment' : r.category.includes('kuca') ? 'house' : 'commercial';
    if (r.m2 < 15 || r.m2 > 2000) continue;
    const ppm = r.price / r.m2;
    if (ppm < SANE[kind][0] || ppm > SANE[kind][1]) continue;
    // Samo stanovi na prodaju se dele na novo/staro; nesvrstan stan ne ulazi.
    const build = type === 'apartment' && kind === 'sale' ? r.build : 'any';
    if (!build) continue;
    const a = area(r.slug);
    const hood = AREA_TO_NEIGHBOURHOOD[a];
    // Glas: projekat investitora, ulica, ili oglas sam (naziv je samo naselje).
    const voter = r.project ? `projekat:${r.project}` : street(r.name);
    for (const place of hood ? [hood, CITY_ROW] : [CITY_ROW]) {
      const key = `${place}|${type}|${kind}|${build}`;
      if (!groups.has(key)) groups.set(key, { total: 0, byVoter: new Map(), single: [] });
      const g = groups.get(key);
      g.total++;
      if (voter) g.byVoter.set(voter, [...(g.byVoter.get(voter) || []), ppm]);
      else g.single.push(ppm);
    }
    if (!hood) unmapped.set(a, (unmapped.get(a) || 0) + 1);
  }

  const rows = [];
  for (const [key, g] of groups) {
    const [hood, type, kind, build] = key.split('|');
    // Jedna ulica (ili jedan projekat) = jedan glas (medijana njenih oglasa).
    const values = [...g.single, ...[...g.byVoter.values()].map((v) => quantile(v, 0.5))];
    const min = hood === CITY_ROW ? MIN_CITY : build === 'any' ? MIN_LISTINGS[type] : Math.max(MIN_LISTINGS[type], MIN_SPLIT);
    if (values.length < min) continue;
    const rule = RULE[kind];
    const low = roundTo(rule.low(quantile(values, 0.25)), rule.round);
    const high = Math.max(roundTo(low * 1.1, rule.round), roundTo(rule.high(quantile(values, 0.5)), rule.round));
    rows.push({ hood, type, kind, build, n: values.length, total: g.total, low, high });
  }
  const typeOrder = { apartment: 0, house: 1, commercial: 2 };
  rows.sort(
    (a, b) =>
      b.kind.localeCompare(a.kind) ||
      typeOrder[a.type] - typeOrder[b.type] ||
      a.build.localeCompare(b.build) ||
      Number(b.hood === CITY_ROW) - Number(a.hood === CITY_ROW) ||
      b.n - a.n
  );
  return { rows, unmapped };
}

function toSql(rows, counts, date) {
  const esc = (s) => s.replace(/'/g, "''");
  const source = `4zida-oglasi-${date}`;
  const values = rows
    .map(
      (r, i) =>
        `  ('Kragujevac', '${esc(r.hood)}', '${r.type}', '${r.kind}', '${r.build}', ${r.low}, ${r.high}, ${r.total}, ${r.n}, '${source}')${i < rows.length - 1 ? ',' : ''}`
    )
    .join('\n');
  return `-- ============================================================
-- Cene po m² za kalkulator procene - PREDLOG iz javnih oglasa
-- ============================================================
-- Napravljeno: ${date}, npm run prices:refresh (scripts/refresh-valuation-prices.mjs)
-- Izvor: oglasi za Kragujevac na 4zida.rs - ${counts}
-- Pravilo i odbacivanje grešaka: vidi zaglavlje skripte.
-- Pregledati, pa pokrenuti u Supabase SQL editoru. Bezbedno je pokrenuti
-- više puta (upsert). Na kraju se brišu redovi iz RANIJIH osvežavanja sa
-- oglasa koji ovog puta ne prolaze pravilo (vlasnik, 15. 10. 2026) - za ta
-- naselja procena računa iz proseka grada. Ručno uneti redovi ostaju.
-- Kolone listing_count / independent_count: migracija 031; build_type
-- (new = novogradnja, old = starogradnja, any = zajedno): migracija 032.

insert into public.zone_price_baselines
  (city, neighborhood, property_type, listing_type, build_type, price_per_sqm_low, price_per_sqm_high, listing_count, independent_count, updated_by)
values
${values}
on conflict (lower(city), lower(neighborhood), property_type, listing_type, build_type) do update set
  price_per_sqm_low = excluded.price_per_sqm_low,
  price_per_sqm_high = excluded.price_per_sqm_high,
  listing_count = excluded.listing_count,
  independent_count = excluded.independent_count,
  updated_at = now(),
  updated_by = excluded.updated_by;

delete from public.zone_price_baselines
where updated_by like '4zida-oglasi-%' and updated_by <> '${source}';
`;
}

// Lokalni datum (sv-SE daje GGGG-MM-DD) - toISOString je UTC, pa bi kasno uveče dao juče.
const date = new Date().toLocaleDateString('sv-SE');
console.log('Preuzimam oglase sa 4zida.rs...');
const listings = await scrape();
console.log('Čitam stanje svakog oglasa stana na prodaju (novogradnja / starogradnja)...');
await classifyApartments(listings);
const { rows, unmapped } = toRows(listings);

const perCategory = CATEGORIES.map((c) => `${c} ${listings.filter((l) => l.category === c).length}`).join(', ');
const out = path.join(root, 'supabase', 'seed', `zone_price_baselines_4zida_${date}.sql`);
fs.writeFileSync(out, toSql(rows, perCategory, date));

console.log(`\n${rows.length} redova -> ${path.relative(root, out)}`);
for (const r of rows) console.log(`  ${r.kind}\t${r.type}\t${r.build}\t${r.hood}\t${r.low} – ${r.high}\t(${r.n} od ${r.total})`);
const bigUnmapped = [...unmapped].filter(([, n]) => n >= MIN_LISTINGS.apartment).sort((a, b) => b[1] - a[1]);
if (bigUnmapped.length) {
  console.log('\nDelovi grada sa dovoljno oglasa koji nisu povezani sa naseljem (AREA_TO_NEIGHBOURHOOD):');
  for (const [a, n] of bigUnmapped) console.log(`  ${a || '(bez naselja)'}: ${n}`);
}
