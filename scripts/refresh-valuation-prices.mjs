// Predlog novih cena po m² za kalkulator procene (/procena-vrednosti) iz
// javnih oglasa za Kragujevac na 4zida.rs.
//
// Cene se osvežavaju NA SVAKA 2 MESECA (vlasnik, 12. 10. 2026). Kad su
// starije od toga, svaki novi zahtev sa kalkulatora na Telegramu nosi
// upozorenje (vidi PRICE_MAX_AGE_DAYS u app/lib/valuation/calculateEstimate.ts).
//
// Skripta NIŠTA ne upisuje u bazu - samo pravi SQL fajl za pregled:
//   supabase/seed/zone_price_baselines_4zida_<GGGG-MM-DD>.sql
// Vlasnik ga pregleda, pa se pokrene u Supabase SQL editoru (upsert -
// postojeći redovi se samo zamene, ništa se ne briše).
//
// Pokretanje:  npm run prices:refresh      (traje ~2 minuta)
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
//   uz bar MIN_LISTINGS oglasa, ostala kalkulator računa iz proseka grada.

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
const MIN_LISTINGS = 5;

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
  'bubanj-centar': 'Centar',
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
        const slug = url.split(`/${category}/`)[1]?.split('/')[0] || '';
        out.push({ category, url, slug, price, m2 });
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

function toRows(listings) {
  const groups = new Map();
  const unmapped = new Map();
  for (const r of listings) {
    const kind = r.category.startsWith('prodaja') ? 'sale' : 'rent';
    const type = r.category.includes('stanova') ? 'apartment' : r.category.includes('kuca') ? 'house' : 'commercial';
    if (r.m2 < 15 || r.m2 > 2000) continue;
    const ppm = r.price / r.m2;
    if (ppm < SANE[kind][0] || ppm > SANE[kind][1]) continue;
    const a = area(r.slug);
    const hood = AREA_TO_NEIGHBOURHOOD[a];
    if (!hood) {
      unmapped.set(a, (unmapped.get(a) || 0) + 1);
      continue;
    }
    const key = `${hood}|${type}|${kind}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(ppm);
  }

  const rows = [];
  for (const [key, values] of groups) {
    if (values.length < MIN_LISTINGS) continue;
    const [hood, type, kind] = key.split('|');
    const rule = RULE[kind];
    const low = roundTo(rule.low(quantile(values, 0.25)), rule.round);
    const high = Math.max(roundTo(low * 1.1, rule.round), roundTo(rule.high(quantile(values, 0.5)), rule.round));
    rows.push({ hood, type, kind, n: values.length, low, high });
  }
  const typeOrder = { apartment: 0, house: 1, commercial: 2 };
  rows.sort((a, b) => b.kind.localeCompare(a.kind) || typeOrder[a.type] - typeOrder[b.type] || b.n - a.n);
  return { rows, unmapped };
}

function toSql(rows, counts, date) {
  const esc = (s) => s.replace(/'/g, "''");
  const source = `4zida-oglasi-${date}`;
  const values = rows
    .map(
      (r, i) =>
        `  ('Kragujevac', '${esc(r.hood)}', '${r.type}', '${r.kind}', ${r.low}, ${r.high}, '${source}')${i < rows.length - 1 ? ',' : ''} -- ${r.n} oglasa`
    )
    .join('\n');
  return `-- ============================================================
-- Cene po m² za kalkulator procene - PREDLOG iz javnih oglasa
-- ============================================================
-- Napravljeno: ${date}, npm run prices:refresh (scripts/refresh-valuation-prices.mjs)
-- Izvor: oglasi za Kragujevac na 4zida.rs - ${counts}
-- Pravilo i odbacivanje grešaka: vidi zaglavlje skripte.
-- Pregledati, pa pokrenuti u Supabase SQL editoru. Bezbedno je pokrenuti
-- više puta (upsert); naselja kojih nema u ovom fajlu zadržavaju staru cenu.

insert into public.zone_price_baselines
  (city, neighborhood, property_type, listing_type, price_per_sqm_low, price_per_sqm_high, updated_by)
values
${values}
on conflict (lower(city), lower(neighborhood), property_type, listing_type) do update set
  price_per_sqm_low = excluded.price_per_sqm_low,
  price_per_sqm_high = excluded.price_per_sqm_high,
  updated_at = now(),
  updated_by = excluded.updated_by;
`;
}

// Lokalni datum (sv-SE daje GGGG-MM-DD) - toISOString je UTC, pa bi kasno uveče dao juče.
const date = new Date().toLocaleDateString('sv-SE');
console.log('Preuzimam oglase sa 4zida.rs...');
const listings = await scrape();
const { rows, unmapped } = toRows(listings);

const perCategory = CATEGORIES.map((c) => `${c} ${listings.filter((l) => l.category === c).length}`).join(', ');
const out = path.join(root, 'supabase', 'seed', `zone_price_baselines_4zida_${date}.sql`);
fs.writeFileSync(out, toSql(rows, perCategory, date));

console.log(`\n${rows.length} redova -> ${path.relative(root, out)}`);
for (const r of rows) console.log(`  ${r.kind}\t${r.type}\t${r.hood}\t${r.low} – ${r.high}\t(${r.n})`);
const bigUnmapped = [...unmapped].filter(([, n]) => n >= MIN_LISTINGS).sort((a, b) => b[1] - a[1]);
if (bigUnmapped.length) {
  console.log('\nDelovi grada sa dovoljno oglasa koji nisu povezani sa naseljem (AREA_TO_NEIGHBOURHOOD):');
  for (const [a, n] of bigUnmapped) console.log(`  ${a || '(bez naselja)'}: ${n}`);
}
