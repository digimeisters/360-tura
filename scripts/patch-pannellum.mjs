/**
 * Pravi public/vendor/pannellum-2.5.6-k360.js iz zvanične Pannellum 2.5.6
 * verzije, sa sledećim izmenama:
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
 * 3-5. Žiroskop (2. 10. 2026, vlasnik: "seče kad se dodirne ekran"):
 *    ublažavanje šuma, dodir više ne trza nagib, brže hvatanje posle dodira.
 *    Isti problem prijavljuju i drugi korisnici Pannellum-a (GitHub issues
 *    #364, #656, #165) - original gasi žiroskop na svaki dodir.
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
  },
  {
    // Original upisuje svako očitavanje senzora direktno u pogled - šum
    // senzora se vidi kao sitno drhtanje slike, a posle dodira (kad se
    // žiroskop ponovo uključi) pogled skoči na ugao telefona. Ovde pogled
    // za kratko vreme (~70 ms) "stigne" do ugla telefona: drhtanje nestaje,
    // skok postaje kratko klizanje, a odziv i dalje deluje trenutno.
    // b = config, $a = pomak yaw-a (da posle prevlačenja pogled ostane gde jeste).
    name: 'žiroskop: ublažavanje šuma i skokova',
    from: '(b.pitch=f[0]/Math.PI*180,b.roll=-f[1]/Math.PI*180,b.yaw=-f[2]/Math.PI*180+$a)',
    to:
      '(function(tp,tr,ty){var now=Date.now(),dt=b.k360GyroT?Math.min(33,now-b.k360GyroT):16,k=1-Math.exp(-dt/70);b.k360GyroT=now;' +
      'b.pitch+=(tp-b.pitch)*k;b.roll+=(tr-b.roll)*k;b.yaw+=(((ty-b.yaw)%360+540)%360-180)*k})' +
      '(f[0]/Math.PI*180,-f[1]/Math.PI*180,-f[2]/Math.PI*180+$a)'
  },
  {
    // Dodir/klik/taster gasi žiroskop dok traje prevlačenje (tura ga posle
    // sama pali - page.tsx handlePanEnd), ali original uz to naglo vrati
    // nagib slike na nulu - kad telefon nije savršeno uspravan, horizont se
    // trzne na svaki dodir. Bez žiroskopa nagib je ionako 0; isključivanje
    // dugmetom ga lagano vraća na 0 (useViewerControls stopGyroscope).
    name: 'žiroskop: dodir ne trza nagib',
    from: 'Da();b.roll=0;',
    to: 'Da();',
    count: 3
  },
  {
    // Posle ponovnog uključivanja original čeka 10 očitavanja (~0,15 s
    // smrznute slike) pre nego što pogled opet prati telefon. Tri su dovoljna
    // da se preskoče prva, nepouzdana očitavanja.
    name: 'žiroskop: brže hvatanje posle dodira',
    from: '10>X?X+=1:10===X?',
    to: '3>X?X+=1:3===X?'
  }
];

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`Preuzimanje nije uspelo: ${res.status}`);
let source = await res.text();

for (const patch of PATCHES) {
  const expected = patch.count ?? 1;
  const count = source.split(patch.from).length - 1;
  if (count !== expected) {
    throw new Error(`"${patch.name}": očekivano ${expected} mesta za izmenu, nađeno ${count}.`);
  }
  source = source.split(patch.from).join(patch.to);
}

const header =
  '/* Pannellum 2.5.6 + Kvadrat360 izmene (scripts/patch-pannellum.mjs): ' +
  'pozadinsko raspakivanje panorame + "webgl" pre "experimental-webgl" + mirniji žiroskop. */\n';
await mkdir(new URL('.', TARGET), { recursive: true });
await writeFile(TARGET, header + source);
console.log('Napravljeno:', TARGET.pathname);
