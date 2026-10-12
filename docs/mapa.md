# Mapa sajta (Protomaps na R2)

Od 12. 10. 2026. sajt koristi **sopstvenu mapu Srbije** umesto OpenStreetMap pločica: nema naloga, ključa ni računa kod trećih strana. Dve mape je koriste:

- **/ture**, dugme „Mapa“: [components/TourMap.tsx](../components/TourMap.tsx)
- **„Šta je u blizini“** na strani projekta: [components/projekat/ProjectNearbyMap.tsx](../components/projekat/ProjectNearbyMap.tsx), koja se učitava tek kad posetilac priđe mapi

Zajednički deo (adresa fajla, stil, dugmad): [components/maps/protomaps.ts](../components/maps/protomaps.ts).

## Šta je gde

| Šta | Gde |
|---|---|
| Podaci mape (Srbija, zoom 0-15, ~680 MB) | `cdn.kvadrat360.com/mape/srbija-<datum>-lat.pmtiles` (R2, fascikla `mape/`) |
| Slova za natpise (Noto Sans) | `cdn.kvadrat360.com/mape/fonts/<font>/<opseg>.pbf` |
| Ikonice | `cdn.kvadrat360.com/mape/sprites/light*.json/png` |
| Prikaz | MapLibre GL (`maplibre-gl`) + `pmtiles` protokol + stil `@protomaps/basemaps` (svetli, imena „hr“) |
| MapLibre worker | `public/vendor/maplibre-gl-worker-<verzija>.mjs` (vidi ispod) |

CORS na R2 već dozvoljava čitanje delova fajla (GET/HEAD, zaglavlje `Range`) sa bilo koje adrese, pa podešavanje bucket-a nije potrebno.

**Cena:** besplatni R2 paket (10 GB prostora, 10 miliona čitanja mesečno). Pregledač čita samo pločice koje prikazuje, ne ceo fajl.

## MapLibre worker

MapLibre 6 rasklapa pločice u pozadinskom procesu (worker) i traži njegov fajl pored sopstvenog koda. Kad Next.js upakuje kod, tog fajla tamo nema i mapa ostane siva (u konzoli: „Worker failed to load“). Zato ga sajt servira sam iz `public/vendor/`, a [protomaps.ts](../components/maps/protomaps.ts) ga traži po instaliranoj verziji.

**Posle svake nadogradnje paketa `maplibre-gl`:** `node scripts/copy-maplibre-worker.mjs`, pa obrisati stari fajl iz `public/vendor/`.

Pregledač bez WebGL2 (stari uređaj, isključena grafika) umesto mape dobija poruku i link na lokaciju na OpenStreetMap-u. Greške mape idu u konzolu sa oznakom `[mapa]`.

## Latinica

Protomaps nema srpski među jezicima natpisa, a lokalno ime (`name`) je u Srbiji uglavnom ćirilicom. Stil bi onda ispisivao dva reda (ime na drugom jeziku i ćirilicu). Zato se pre postavljanja **svako ćirilično ime u fajlu preslovi na srpsku latinicu** ([scripts/mapa/latinica.mjs](../scripts/mapa/latinica.mjs)), a oznaka pisma se obriše. Tada stil ispisuje jedno latinično ime. Gde postoji hrvatsko ime (`name:hr`, uglavnom veći gradovi), prikazuje se ono.

## Osvežavanje mape (otprilike jednom godišnje)

Potrebno: alat `pmtiles` (https://github.com/protomaps/go-pmtiles/releases, Windows x86_64) i Node.

1. Najnoviji build sveta: https://build-metadata.protomaps.dev/builds.json (poslednji `key`, npr. `20271011.pmtiles`).
2. Izvod Srbije (traje ~15 min, ~700 MB):
   ```
   pmtiles extract https://build.protomaps.com/<key> srbija.pmtiles --bbox=18.80,41.85,23.05,46.20 --download-threads=8
   ```
3. Latinica, u posebnoj fascikli (ne u projektu):
   ```
   npm init -y
   npm install pmtiles @mapbox/vector-tile pbf vt-pbf better-sqlite3
   node --max-old-space-size=1024 latinica.mjs srbija.pmtiles srbija-lat.mbtiles
   pmtiles convert srbija-lat.mbtiles srbija-lat.pmtiles
   ```
   Traje ~10 min. Računar sa 8 GB memorije: ne pokretati istovremeno sa drugim teškim poslovima.
4. Postaviti na R2 **pod novim imenom** (`mape/srbija-<datum>-lat.pmtiles`), deo po deo (multipart). Stari fajl se kešira godinu dana, pa se isto ime ne prepisuje.
5. U [components/maps/protomaps.ts](../components/maps/protomaps.ts) promeniti `MAP_FILE` na novo ime, pa push.
6. Kad nova verzija radi na sajtu, stari fajl može da se obriše sa R2 (prvo proveriti da ga ništa ne koristi).
