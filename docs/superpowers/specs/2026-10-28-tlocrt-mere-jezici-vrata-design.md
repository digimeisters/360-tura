# Šematski tlocrt: mere, nazivi na jezicima ture, pomerljiva vrata

Datum: 28. 10. 2026. Odobrio vlasnik u četu (skica u razgovoru).

## Cilj

Šematski tlocrt (editor `/admin/plan/[slug]`, crtanje `app/lib/floorplanLayout.ts`)
treba da bude precizniji kad vlasnik ima mere, da kupac vidi nazive prostorija na
svom jeziku i da vrata stoje tamo gde su stvarno, ne uvek na sredini zida.

Plan bez ijedne mere mora da radi tačno kao danas (vlasnik će neke planove
crtati odokativno, bez tlocrta od agencije).

## Šta je vlasnik rekao

- Mere: upisuje ih samo kad ih ima; ostalo crta proizvoljno.
- U izmerenoj prostoriji piše naziv + m².
- Nazivi: automatski na jezicima ture, uz mogućnost ručne ispravke.
- Vrata: pomeranje duž zida + vrsta (vrata sa lukom / prolaz) + strana otvaranja.
  **Bez izbora širine** - sva vrata su iste širine.
- Natpisi prostorija moraju da se pomeraju (već postoji u editoru); ne mora
  idealno tačno.
- Van obima (drugi krug): podloga sa pravim tlocrtom, prozori, strelica sever,
  naziv sobe na dodir u turi.

## 1. Mere

**Model** (`FloorplanLayout`, sve novo je opciono - stari JSON se čita bez promene):

- `layout.unitsPerMeter?: number` - merilo plana (jedinica plana po metru).
- `PlanShape.measured?: boolean` - pravougaonik ima upisane mere.

Mere se ne čuvaju posebno: širina u metrima = `w / unitsPerMeter`, pa crtež i
broj nikad ne mogu da se raziđu.

**Editor:**

- Izabrani pravougaonik dobija polja `Š × D` (metri, dve decimale, zarez ili tačka).
- Prvi unos mera u planu bez merila postavlja merilo: `unitsPerMeter = w / širina`
  (trenutna širina pravougaonika ostaje, visina se prilagodi dužini). Posle toga
  svaki unos menja `w`/`h` pravougaonika po merilu.
- Povlačenje ivice izmerenog pravougaonika menja njegove mere (prikaz uživo,
  zaokruženo na 5 cm).
- Dugme "Ukloni mere" na pravougaoniku (`measured = false`); kad nijedan
  pravougaonik više nema mere, merilo se briše.
- Ispod polja: "Površina: 14,1 m²".

**Crtanje (SVG):**

- Prostorija (grupa) je izmerena ako su svi njeni pravougaonici izmereni.
  m² = zbir površina njenih pravougaonika, jedna decimala, decimalni zarez
  (EN tačka).
- Izmerena prostorija: ispod naziva drugi red "14,1 m²" (manji, sivi), pomera se
  zajedno sa natpisom (`lx/ly`). Neizmerena: samo naziv - nikad izračunat broj
  iz merila (ne izmišljamo kvadraturu).
- Terasa ima m² kao i ostale prostorije i ulazi u ukupno.
- Napomena na dnu:
  - bez merila: "Šematski prikaz — nije u razmeri" (kao danas);
  - sa merilom: "Mere su orijentacione · ukupno X m²" (X = zbir izmerenih prostorija);
    ako nijedna prostorija nije potpuno izmerena, samo "Mere su orijentacione".

## 2. Nazivi na jezicima ture

**Model:** `PlanGroup.labels?: Partial<Record<'en' | 'de' | 'ru', string>>` i
`PlanGroup.labelsManual?: ('en' | 'de' | 'ru')[]` (jezici koje je vlasnik ručno
ispravio - automatika ih više ne dira). `label` ostaje srpski naziv.

Jezici plana = `tours.target_languages` (bez srpskog, koji je uvek tu).

**Automatsko popunjavanje** (redom, samo za prazna i ne-ručna polja):

1. Ako grupa nosi srpski naziv sobe ture (ili njen "X 1/2" osnovni naziv), uzima
   se `title_i18n[lang]` te sobe (isto skraćen "1/2").
2. Rečnik uobičajenih naziva (`app/lib/roomNames.ts`): dnevna soba, dnevni
   boravak, kuhinja, trpezarija, kuhinja sa trpezarijom, spavaća soba, dečja
   soba, radna soba, kupatilo, toalet/WC, hodnik, predsoblje, ulaz, ostava,
   špajz, terasa, balkon, lođa, garderober, vešernica, garaža, podrum, dvorište,
   studio. Poređenje bez obzira na velika slova i dijakritike; broj na kraju
   ("Spavaća soba 2") se prenosi ("Bedroom 2").
3. Ostalo: AI prevod pri čuvanju (isti Gemini put kao prevod teksta ture),
   jedan poziv za sve nazive koji fale. Ako AI ne uspe, plan se ipak čuva, a taj
   jezik prikazuje srpski naziv; editor javi "N naziva nije prevedeno".

Promena srpskog naziva u editoru briše automatske (ne ručne) prevode te grupe,
pa se ponovo popune.

**Editor:** ispod srpskog naziva male kolone EN / DE / RU (samo jezici ture).
Kucanje u polje ga označava kao ručno; prazno polje vraća automatiku.

**Čuvanje (R2):**

- `floorplan-schematic.svg` / `.png` - srpski, ista adresa kao danas
  (`tours.floorplan_url` se ne menja po formatu).
- `floorplan-schematic.<lang>.svg` / `.<lang>.png` za svaki jezik ture.
  PNG-ove crta editor (kao danas srpski) i šalje ih u istom zahtevu.
- `floorplan-schematic.json` - raspored (jedan za sve jezike).

Napomena na dnu prevedena: "Not to scale" / "Nicht maßstabsgetreu" /
"Не в масштабе"; "Dimensions are approximate · total X m²" itd.

**Gde se prikazuje jezik posetioca:** helper
`floorplanUrlFor(url, lang)` u `app/lib/floorplanImage.ts` - za šematski plan
zameni `floorplan-schematic.svg` sa `floorplan-schematic.<lang>.svg` (zadrži
`?v=`), za srpski ili pravi tlocrt (slika) vrati isti URL. Koriste ga:

- mini tlocrt u turi (`FloorplanMiniMap`) i prozor "Skica" (`TourModals`);
- video iz ture (`videoPlan.ts`, jezik videa);
- mejl "link i tlocrt" (`/api/tour-capture`, jezik posetioca; `floorplanImageUrl`
  dobija `lang`).

Izveštaj agenciji i priča "Od tlocrta do ture" ostaju na srpskom.

Ako plan nekog jezika ne postoji (stari plan, sačuvan pre ove izmene), slika
padne na srpski: `<img onError>` u turi prebaci na srpski URL; video i mejl
proveravaju odgovor i padaju na srpski.

Položaj oznaka soba (`floorplan_x/_y`) isti je za sve jezike, jer je raspored isti.

## 3. Vrata

**Model:** `DoorSpec` dobija i oblik objekta; parser i dalje prima stare nizove
`[a, b]` / `[a, b, wall]` (= prolaz na sredini zida, kao danas):

```ts
type DoorObj = {
  a: string; b: string;
  wall?: number;          // koji zajednički zid (kao do sada)
  at?: number;            // položaj sredine vrata duž zida, 0..1 (podrazumevano 0.5)
  kind?: 'door' | 'opening'; // podrazumevano 'opening' (stari planovi)
  into?: string;          // grupa u koju se vrata otvaraju (a ili b)
  hinge?: 'start' | 'end'; // šarka na početku ili kraju otvora (duž zida)
};
```

- Širina je stalna: `PLAN_DOOR` (34 jedinice); kad plan ima merilo, 0,80 m
  (`0.8 * unitsPerMeter`). Prolaz je iste širine kao i danas.
- `at` se pri crtanju ograniči tako da vrata ostanu celi na zidu (pola širine +
  debljina zida od krajeva). Ako se zid skrati pomeranjem prostorije, vrata se
  samo stisnu ka sredini, ne nestaju.
- Nova vrata dodata u editoru (postojeći tok "spoji prostorije") dobijaju
  `kind: 'door'`, `at: 0.5`, `into` = manja prostorija, `hinge: 'start'`.
  Vrata koja automatski nacrt postavi takođe dobijaju `kind: 'door'`, osim
  između dnevne i kuhinje/trpezarije (`opening`).

**Crtanje:** otvor u zidu kao danas; za `door` još tanka linija krila (dužina =
širina vrata, upravno na zid, iz šarke, u prostoriju `into`) i četvrtina kruga
od kraja krila do drugog kraja otvora (1.5 jedinica, boja zida).

**Editor:** klik na vrata ih bira (isticanje isprekidanim okvirom); prevlačenje
ih pomera duž zida (projekcija pokazivača na zid). Panel: Vrsta (Vrata / Prolaz),
Otvaraju se: u [prostorija A | prostorija B], dugme za zamenu strane šarke,
Obriši vrata.

## 4. Natpisi prostorija

Već se prevlače (`lx/ly`). Promene:

- Red sa m² ide uz natpis (pomeren natpis nosi i m²).
- Natpis na drugim jezicima se crta na istom mestu; duži prevod se smanji kao
  što se danas smanjuje dugačak srpski naziv (`labelBox` dobija tekst jezika).
- Oznake soba ispod natpisa (automatski položaj) računaju se od natpisa sa m²,
  da tačka ne pokrije broj.

## Šta se ne menja

- Automatski nacrt (`schematicFloorplan.ts`) i dalje procenjuje veličine po
  tipu sobe; mere unosi vlasnik.
- Baza: bez migracije. Sve je u JSON-u na R2 i u postojećoj `floorplan_url`.
- Pravi tlocrt (slika koju je agencija dala) - bez promene.

## Provera

Projekat nema test okvir. Provera: `tsc`, `eslint`, privremena test-strana koja
crta `renderFloorplanSvg` za nekoliko rasporeda (bez mera / delimično / potpuno
izmeren; stari nizovi vrata; vrata sa lukom u sva četiri pravca; EN/DE/RU
nazivi) i proverava napomenu i m² u SVG-u. Editor se ne može otvoriti bez
prijave - proverava se kroz istu test-stranu koja montira editorsku logiku sa
lokalnim rasporedom, bez čuvanja na R2. Tura: demo tlocrt (`demoFloorplan.ts`)
na EN/DE. Bez commita pre vlasnikovog "pushuj".
