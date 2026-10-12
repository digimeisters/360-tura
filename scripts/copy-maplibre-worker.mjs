/**
 * Kopira MapLibre-ov worker (rasklapa pločice mape u pozadini) u public/vendor,
 * pod imenom sa verzijom: public/vendor/maplibre-gl-worker-<verzija>.mjs.
 *
 * MapLibre 6 traži worker fajl pored sopstvenog koda (import.meta.url), a
 * kad Next.js upakuje kod, tog fajla tamo nema - mapa ostane siva uz grešku
 * „Worker failed to load". Zato ga serviramo sami, a components/maps/
 * protomaps.ts ga zove po verziji koja je instalirana (getVersion()).
 *
 * Posle svake nadogradnje paketa maplibre-gl: node scripts/copy-maplibre-worker.mjs
 * (pa obrisati stari fajl iz public/vendor).
 */
import fs from 'fs';
import path from 'path';

const pkg = JSON.parse(fs.readFileSync('node_modules/maplibre-gl/package.json', 'utf8'));
const src = 'node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs';
const dest = path.join('public', 'vendor', `maplibre-gl-worker-${pkg.version}.mjs`);
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log(`${dest} (${Math.round(fs.statSync(dest).size / 1024)} KB)`);
