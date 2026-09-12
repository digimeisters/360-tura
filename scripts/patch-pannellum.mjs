/**
 * Pravi public/vendor/pannellum-2.5.6-k360.js iz zvanične Pannellum 2.5.6
 * verzije, sa jednom izmenom: panorama se raspakuje u pozadini
 * (createImageBitmap) umesto na glavnoj niti pri slanju grafičkoj kartici.
 * Bez ovoga se stranica pri svakom prelazu u sobu zamrzne 1-2 s (panorame
 * su 8000x4000), što se vidi kao trzaj ili stajanje kamere.
 *
 * Pokretanje:  node scripts/patch-pannellum.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';

const SOURCE = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
const TARGET = new URL('../public/vendor/pannellum-2.5.6-k360.js', import.meta.url);

// U minifikovanoj verziji: P = slika panorame, E = window, pa() = onImageLoad,
// a = preuzeti blob. Ako pregledač nema createImageBitmap ili ne uspe da
// raspakuje sliku, ide stari put (Image + object URL).
const FROM = 'P.src=E.URL.createObjectURL(a)';
const TO =
  'E.createImageBitmap?E.createImageBitmap(a).then(function(k){P=k;pa()},function(){P.src=E.URL.createObjectURL(a)}):P.src=E.URL.createObjectURL(a)';

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`Preuzimanje nije uspelo: ${res.status}`);
const source = await res.text();

const count = source.split(FROM).length - 1;
if (count !== 1) throw new Error(`Očekivano tačno jedno mesto za izmenu, nađeno: ${count}`);

const header = '/* Pannellum 2.5.6 + Kvadrat360 izmena (scripts/patch-pannellum.mjs): panorama se raspakuje u pozadini. */\n';
await mkdir(new URL('.', TARGET), { recursive: true });
await writeFile(TARGET, header + source.replace(FROM, TO));
console.log('Napravljeno:', TARGET.pathname);
