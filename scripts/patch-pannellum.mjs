/**
 * Pravi public/vendor/pannellum-2.5.6-k360.js iz zvanične Pannellum 2.5.6
 * verzije, sa dve izmene:
 *
 * 1. Panorama se raspakuje u pozadini (createImageBitmap) umesto na glavnoj
 *    niti pri slanju grafičkoj kartici. Bez ovoga se stranica pri svakom
 *    prelazu u sobu zamrzne 1-2s (panorame su 8000x4000), što se vidi kao
 *    trzaj ili stajanje kamere.
 *
 * 2. WebGL kontekst se prvo traži kao "webgl" (standardni naziv), pa tek ako
 *    to ne uspe kao "experimental-webgl" (stari naziv, jedini koji izvorna
 *    2.5.6 pokušava). Na nekim iPhone uređajima/verzijama Safari-ja prvi
 *    pokušaj sa "experimental-webgl" vrati null iako uređaj IMA WebGL -
 *    tura tad prikazuje "Your browser does not have the necessary WebGL
 *    support..." iako to nije tačno. Svaka moderna biblioteka prvo proba
 *    "webgl", pa tek onda stari naziv kao rezervu - ovo samo dodaje taj
 *    prvi pokušaj koji originalu nedostaje.
 *
 * Pokretanje:  node scripts/patch-pannellum.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';

const SOURCE = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
const TARGET = new URL('../public/vendor/pannellum-2.5.6-k360.js', import.meta.url);

const PATCHES = [
  {
    name: 'pozadinsko raspakivanje panorame',
    // U minifikovanoj verziji: P = slika panorame, E = window, pa() =
    // onImageLoad, a = preuzeti blob. Ako pregledač nema createImageBitmap
    // ili ne uspe da raspakuje sliku, ide stari put (Image + object URL).
    from: 'P.src=E.URL.createObjectURL(a)',
    to:
      'E.createImageBitmap?E.createImageBitmap(a).then(function(k){P=k;pa()},function(){P.src=E.URL.createObjectURL(a)}):P.src=E.URL.createObjectURL(a)'
  },
  {
    name: 'WebGL kontekst - "webgl" pre "experimental-webgl"',
    from: 'A.getContext("experimental-webgl",{alpha:!1,depth:!1})',
    to: '(A.getContext("webgl",{alpha:!1,depth:!1})||A.getContext("experimental-webgl",{alpha:!1,depth:!1}))'
  }
];

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`Preuzimanje nije uspelo: ${res.status}`);
let source = await res.text();

for (const patch of PATCHES) {
  const count = source.split(patch.from).length - 1;
  if (count !== 1) {
    throw new Error(`"${patch.name}": očekivano tačno jedno mesto za izmenu, nađeno ${count}.`);
  }
  source = source.replace(patch.from, patch.to);
}

const header =
  '/* Pannellum 2.5.6 + Kvadrat360 izmene (scripts/patch-pannellum.mjs): ' +
  'pozadinsko raspakivanje panorame + "webgl" pre "experimental-webgl". */\n';
await mkdir(new URL('.', TARGET), { recursive: true });
await writeFile(TARGET, header + source);
console.log('Napravljeno:', TARGET.pathname);
