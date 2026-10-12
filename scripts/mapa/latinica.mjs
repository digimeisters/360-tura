// node scripts/mapa/latinica.mjs ulaz.pmtiles izlaz.mbtiles   (postupak: docs/mapa.md)
// Prepisuje sve pločice mape: ćirilična imena (name, name2, name3) preslovljava na
// srpsku latinicu i briše oznaku pisma (script), pa stil Protomaps-a ispisuje jedno,
// latinično ime umesto dva reda. Rezultat je MBTiles; u PMTiles ga pretvara
// zvanični alat: pmtiles convert izlaz.mbtiles izlaz.pmtiles
import fs from 'fs';
import zlib from 'zlib';
import Database from 'better-sqlite3';
import { PMTiles, tileIdToZxy } from 'pmtiles';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import vtpbf from 'vt-pbf';

const [input, output] = process.argv.slice(2);
const fd = fs.openSync(input, 'r');
const source = {
  getKey: () => input,
  getBytes: async (offset, length) => {
    const buf = Buffer.alloc(length);
    fs.readSync(fd, buf, 0, length, offset);
    return { data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + length) };
  }
};
const pm = new PMTiles(source);
const header = await pm.getHeader();
const metadata = await pm.getMetadata();

// Srpska ćirilica (+ slova iz makedonskog, bugarskog i ruskog u istom kadru mape).
const MAP = {
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Ђ: 'Đ', Е: 'E', Ж: 'Ž', З: 'Z', И: 'I', Ј: 'J', К: 'K', Л: 'L', Љ: 'Lj', М: 'M', Н: 'N', Њ: 'Nj',
  О: 'O', П: 'P', Р: 'R', С: 'S', Т: 'T', Ћ: 'Ć', У: 'U', Ф: 'F', Х: 'H', Ц: 'C', Ч: 'Č', Џ: 'Dž', Ш: 'Š',
  Ѓ: 'Đ', Ќ: 'Ć', Ѕ: 'Dz', Й: 'J', Щ: 'Št', Ъ: 'A', Ь: '', Ю: 'Ju', Я: 'Ja', Ы: 'Y', Э: 'E', Ё: 'Jo', Ї: 'Ji', Є: 'Je', І: 'I', Ў: 'U'
};
const lower = Object.fromEntries(Object.entries(MAP).map(([k, v]) => [k.toLowerCase(), v.toLowerCase()]));
const CYR = /[Ѐ-ӿ]/;
const translit = (s) => {
  let out = '';
  const chars = [...s];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (MAP[c] !== undefined) {
      const v = MAP[c];
      // „ЉУБОВИЈА" -> „LJUBOVIJA": dvoslovno veliko slovo u reči pisanoj velikim slovima.
      const next = chars[i + 1];
      out += v.length > 1 && next && next !== next.toLowerCase() ? v.toUpperCase() : v;
    } else if (lower[c] !== undefined) out += lower[c];
    else out += c;
  }
  return out;
};

let changed = 0;
function rewrite(raw) {
  const tile = new VectorTile(new PbfReader(zlib.gunzipSync(raw)));
  const layers = {};
  let touched = false;
  for (const name of Object.keys(tile.layers)) {
    const layer = tile.layers[name];
    const features = [];
    for (let i = 0; i < layer.length; i++) {
      const f = layer.feature(i);
      const props = { ...f.properties };
      for (const [nk, sk] of [['name', 'script'], ['name2', 'script2'], ['name3', 'script3']]) {
        if (typeof props[nk] === 'string' && CYR.test(props[nk])) {
          props[nk] = translit(props[nk]);
          if (props[sk] === 'Cyrillic') delete props[sk];
          touched = true;
          changed++;
        }
      }
      features.push({ id: f.id, type: f.type, properties: props, loadGeometry: () => f.loadGeometry(), extent: f.extent });
    }
    layers[name] = { name, version: layer.version, extent: layer.extent, length: features.length, feature: (i) => features[i] };
  }
  if (!touched) return raw;
  return zlib.gzipSync(Buffer.from(vtpbf({ layers })));
}

const db = new Database(output);
db.pragma('journal_mode = OFF');
db.pragma('synchronous = OFF');
db.exec('CREATE TABLE metadata (name TEXT, value TEXT); CREATE TABLE tiles (zoom_level INTEGER, tile_column INTEGER, tile_row INTEGER, tile_data BLOB); CREATE UNIQUE INDEX tile_index ON tiles (zoom_level, tile_column, tile_row);');
const meta = db.prepare('INSERT INTO metadata VALUES (?, ?)');
meta.run('name', metadata.name ?? 'Protomaps Basemap');
meta.run('format', 'pbf');
meta.run('minzoom', String(header.minZoom));
meta.run('maxzoom', String(header.maxZoom));
meta.run('bounds', [header.minLon, header.minLat, header.maxLon, header.maxLat].join(','));
meta.run('center', [header.centerLon, header.centerLat, header.centerZoom].join(','));
meta.run('json', JSON.stringify({ vector_layers: metadata.vector_layers }));
meta.run('attribution', metadata.attribution ?? '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a>');
const ins = db.prepare('INSERT INTO tiles VALUES (?, ?, ?, ?)');

const cache = new Map(); // isti sadržaj (offset) se obrađuje jednom - samo male pločice
let tiles = 0;
const t0 = Date.now();
const insertMany = db.transaction((rows) => { for (const r of rows) ins.run(...r); });
let batch = [];
async function walk(offset, length) {
  const entries = await pm.cache.getDirectory(source, offset, length, header);
  for (const e of entries) {
    if (e.runLength === 0) {
      await walk(header.leafDirectoryOffset + e.offset, e.length);
      continue;
    }
    let data = cache.get(e.offset);
    if (!data) {
      const raw = Buffer.alloc(e.length);
      fs.readSync(fd, raw, 0, e.length, header.tileDataOffset + e.offset);
      data = rewrite(raw);
      // Pamte se samo male pločice (prazno more, polja) - one se ponavljaju; velike bi napunile memoriju.
      if (e.length < 2048) cache.set(e.offset, data);
    }
    for (let r = 0; r < e.runLength; r++) {
      const [z, x, y] = tileIdToZxy(e.tileId + r);
      batch.push([z, x, (1 << z) - 1 - y, data]);
      tiles++;
    }
    if (batch.length >= 5000) {
      insertMany(batch);
      batch = [];
      process.stdout.write(`\r${tiles} pločica, ${changed} imena, ${Math.round((Date.now() - t0) / 1000)} s`);
    }
  }
}
await walk(header.rootDirectoryOffset, header.rootDirectoryLength);
insertMany(batch);
db.close();
console.log(`\nGotovo: ${tiles} pločica, ${changed} preslovljenih imena, ${Math.round((Date.now() - t0) / 1000)} s`);
