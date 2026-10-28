# Šematski tlocrt: mere, jezici, vrata - plan izrade

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Šematski tlocrt dobija opcione mere (m² u prostoriji, merilo), nazive na jezicima ture (po jedan SVG/PNG po jeziku) i vrata koja se pomeraju duž zida, sa lukom ili kao prolaz.

**Architecture:** Sve ostaje u rasporedu `FloorplanLayout` (JSON na R2) sa novim opcionim poljima; jedna funkcija crtanja (`renderFloorplanSvg(layout, lang)`) služi editoru, serveru i PNG-u. Čiste funkcije (mere, vrata, nazivi, URL po jeziku) idu u `app/lib` i pokrivaju se `node --test` testovima; editor, API i tura ih samo pozivaju.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, `node --test` (Node 24, `.ts` uvoz sa ekstenzijom), R2 (`@aws-sdk/client-s3`), Gemini (`app/lib/gemini.ts`).

**Spec:** `docs/superpowers/specs/2026-10-28-tlocrt-mere-jezici-vrata-design.md`

## Global Constraints

- Plan bez ijedne mere crta se kao danas; napomena "Šematski prikaz — nije u razmeri".
- Sa merilom: "Mere su orijentacione · ukupno X m²"; bez potpuno izmerene prostorije samo "Mere su orijentacione".
- Neizmerena prostorija nikad ne dobija m² izračunat iz merila.
- m²: jedna decimala; zarez za sr/de/ru, tačka za en; jedinica `m²` (sr/en/de), `м²` (ru).
- Mere u editoru zaokružene na 0,05 m.
- Vrata stalne širine: `PLAN_DOOR` (34) bez merila, `0.8 * unitsPerMeter` sa merilom. Nema izbora širine.
- Stari JSON (vrata kao `[a, b]` / `[a, b, wall]`) mora da se čita: = prolaz na sredini zida.
- Srpski plan ostaje na `<slug>/floorplan-schematic.svg|png`; ostali jezici `<slug>/floorplan-schematic.<lang>.svg|png`.
- Jezici plana: `tours.target_languages` (JSON string, npr. `["sr","en"]`) bez `sr`; ako je `null`, jezici koji postoje u `title_i18n` soba ture.
- Bez migracije baze.
- Novi uvozi između fajlova u `app/lib` koje testovi učitavaju pišu se sa `.ts` ekstenzijom (`allowImportingTsExtensions` je uključen).
- **Bez commita** dok vlasnik ne kaže "pushuj". Koraci "Commit" iz šablona ovde su "zabeleži u ledger"; pregled na kraju ide nad radnim stablom (`git diff`).
- Ne dirati: `eslint.config.mjs`, `.github/`, `public/mockup/`, `.claude/launch.json`, `docs/cowork/`, `app/dev-video`, `app/api/dev-save` (privremeni fajlovi videa - brišu se posebno).

## Review Focus

1. Plan sačuvan pre ove izmene (tuple vrata, bez `labels`, bez merila) otvoren u editoru i ponovo sačuvan - mora izgledati isto kao pre (vrata na sredini, bez luka). Test u Task 1 i Task 3.
2. Zid se skrati (prostorija pomerena) ispod širine vrata + 2 debljine zida - vrata ne smeju da "iscure" van zida niti da nestanu bez razloga. Test u Task 3.
3. Prevod duži od srpskog (npr. "Schlafzimmer mit Ankleide") u maloj prostoriji - natpis se smanjuje kao srpski, ne prelazi zidove. Test u Task 3.
4. Tura na jeziku čiji SVG ne postoji (stari plan) - slika pada na srpski, ne prazan okvir. Test u Task 6 (URL) + ručna provera u Task 7.
5. Vlasnik obriše mere sa poslednjeg izmerenog pravougaonika - merilo nestaje, napomena se vraća na "nije u razmeri". Test u Task 2.

---

### Task 1: Model rasporeda i parser

**Files:**
- Modify: `app/lib/floorplanLayout.ts` (tipovi na vrhu, `parseLayout`)
- Modify: `app/lib/schematicFloorplan.ts:27` (uvoz `./floorplanLayout.ts`), `:336-338` (vrata kao objekti)
- Modify: `app/admin/plan/[slug]/page.tsx` (`toggleDoor`, `cycleDoorWall`, provere `layout.doors.some(...)` - samo prelazak na objekte, bez novog UI)
- Test: `app/lib/floorplanLayout.test.ts`

**Interfaces:**
- Produces:
  - `export type PlanLang = 'sr' | 'en' | 'de' | 'ru'`; `export type ForeignLang = Exclude<PlanLang, 'sr'>`
  - `PlanShape.measured?: boolean`
  - `PlanGroup.labels?: Partial<Record<ForeignLang, string>>`, `PlanGroup.labelsManual?: ForeignLang[]`
  - `export type PlanDoor = { a: string; b: string; wall?: number; at?: number; kind?: 'door' | 'opening'; into?: string; hinge?: 'start' | 'end' }`
  - `FloorplanLayout.doors: PlanDoor[]`, `FloorplanLayout.unitsPerMeter?: number`
  - `export function normalizeDoor(d: unknown, groupIds: Set<string>): PlanDoor | null` (prima stari niz ili objekat)
  - `parseLayout` vraća samo `PlanDoor` objekte; `DoorSpec` tip se briše.

- [ ] **Step 1: Napiši testove** u `app/lib/floorplanLayout.test.ts`:
  - `parseLayout čita stara vrata kao prolaz`: ulaz `doors: [['g1','g2'], ['g2','g3',1]]` → `[{a:'g1',b:'g2'}, {a:'g2',b:'g3',wall:1}]`; `doorKind` nije postavljen (podrazumeva se prolaz).
  - `parseLayout čuva nova polja vrata`: `{a,b,at:0.2,kind:'door',into:'g2',hinge:'end'}` vraćen isto; `at: 1.7` → odbačeno polje `at` (ostaje bez njega); `into: 'g9'` (nije a ni b) → polje `into` odbačeno.
  - `parseLayout čuva mere i nazive`: `unitsPerMeter: 50`, shape `measured: true`, group `labels: {en:'Kitchen', xx:'?'}`, `labelsManual: ['en','xx']` → `labels` samo `{en}`, `labelsManual` samo `['en']`; `unitsPerMeter: 0` ili `-3` → izostavljeno; label duži od 60 znakova u `labels` → izostavljen.
  - `parseLayout odbija vrata ka nepostojećoj grupi` (vraća `null`, kao danas).
- [ ] **Step 2:** `npm test` → FAIL (nema `normalizeDoor`, stara vrata se vraćaju kao nizovi).
- [ ] **Step 3: Implementiraj** tipove i `normalizeDoor`; `parseLayout` koristi `normalizeDoor`, prima `unitsPerMeter` (konačan broj 0.5–2000), `measured` (boolean), `labels`/`labelsManual` (samo en/de/ru, string 1–60). `schematicFloorplan.ts` vraća `doors` kao `PlanDoor`: `{ a, b, kind: 'door', at: 0.5, into: <grupa manje težine>, hinge: 'start' }`, osim kad je jedna strana dnevna (`/dnevn|boravak|living|wohn|гостин/i`) a druga kuhinja/trpezarija (`/kuhinj|trpezar|kitchen|dining|küche|кухн/i`) - tada `{ a, b, kind: 'opening' }`. Editor: `toggleDoor` dodaje `{ a, b, kind: 'door', at: 0.5, into: other, hinge: 'start' }`; `cycleDoorWall` menja `wall`; sva mesta sa `d[0]/d[1]/d[2]` → `d.a/d.b/d.wall`. `renderFloorplanBody` za sada čita `d.a/d.b/d.wall` (crtanje kao danas).
- [ ] **Step 4:** `npm test` → PASS; `npx tsc --noEmit` → bez grešaka.
- [ ] **Step 5:** Ledger: `Task 1: complete`.

### Task 2: Mere

**Files:**
- Create: `app/lib/floorplanMeasure.ts`
- Test: `app/lib/floorplanMeasure.test.ts`

**Interfaces:**
- Consumes: tipovi iz Task 1.
- Produces:
  - `export const DOOR_M = 0.8`, `export const METER_STEP = 0.05`
  - `export function shapeMeters(shape: PlanShape, upm: number | undefined): { w: number; h: number } | null` (null ako nije `measured` ili nema merila; zaokruženo na 0,05)
  - `export function groupAreaM2(layout: FloorplanLayout, groupId: string): number | null` (null ako bilo koji deo grupe nije izmeren)
  - `export function totalAreaM2(layout: FloorplanLayout): number | null` (zbir izmerenih grupa; null ako nema nijedne)
  - `export function formatArea(m2: number, lang: PlanLang): string` (`"14,1 m²"`, en `"14.1 m²"`, ru `"14,1 м²"`)
  - `export function parseMeters(text: string): number | null` (prima `3,40` i `3.40`; 0.3–50 m, inače null)
  - `export function applyMeters(layout: FloorplanLayout, shapeId: string, wM: number, hM: number): FloorplanLayout` (bez merila: `unitsPerMeter = shape.w / wM`, visina = `hM * upm`; sa merilom: `w = wM*upm`, `h = hM*upm`; `x/y` ostaju; `measured = true`)
  - `export function clearMeters(layout: FloorplanLayout, shapeId: string): FloorplanLayout` (`measured` uklonjen; ako nijedan shape više nije izmeren, briše `unitsPerMeter`)

- [ ] **Step 1: Testovi:**
  - `applyMeters bez merila postavlja merilo`: shape `w:220,h:100`, `applyMeters(.., 4.4, 3.2)` → `unitsPerMeter === 50`, `h === 160`, `w === 220`, `measured === true`.
  - `applyMeters sa merilom menja veličinu`: posle prethodnog, drugi shape `applyMeters(.., 2.6, 3.2)` → `w === 130`, `h === 160`.
  - `groupAreaM2 L-oblik`: grupa sa dva izmerena dela 100×50 i 50×50 jedinica, upm 50 → `3` (2 + 1 m²); ako je jedan deo neizmeren → `null`.
  - `totalAreaM2 sabira samo izmerene grupe` i vraća `null` kad nijedna nije izmerena.
  - `formatArea`: `(14.08,'sr') === '14,1 m²'`, `(14.08,'en') === '14.1 m²'`, `(14.08,'ru') === '14,1 м²'`, `(3,'de') === '3,0 m²'`.
  - `parseMeters`: `'3,40' → 3.4`, `' 3.4 ' → 3.4`, `'0,1' → null`, `'abc' → null`.
  - `shapeMeters zaokružuje na 5 cm`: shape `w:171` upm 50 → `w === 3.4`.
  - `clearMeters poslednjeg briše merilo` (Review Focus 5): posle `clearMeters` jedinog izmerenog → `unitsPerMeter === undefined`.
- [ ] **Step 2:** `npm test` → FAIL (modul ne postoji).
- [ ] **Step 3:** Implementiraj u `app/lib/floorplanMeasure.ts` (uvoz `./floorplanLayout.ts`).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Ledger.

### Task 3: Crtanje - jezik, m², napomena, vrata

**Files:**
- Modify: `app/lib/floorplanLayout.ts` (`labelBox`, `labelArea`, `labelSvg`, `renderFloorplanBody`, `renderFloorplanSvg`, `markerPoints`, `PLAN_STYLE`, `PLAN_NOTE`)
- Test: `app/lib/floorplanLayout.test.ts` (dopuna)

**Interfaces:**
- Consumes: Task 1 tipovi; Task 2 `groupAreaM2`, `totalAreaM2`, `formatArea`, `DOOR_M` (uvoz `./floorplanMeasure.ts`; `floorplanMeasure` ne sme da uvozi vrednosti iz `floorplanLayout` osim tipova - `import type` - da ne bude kružnog uvoza vrednosti).
- Produces:
  - `export function groupLabel(group: PlanGroup, lang: PlanLang): string` (`sr` ili prazan prevod → `group.label`)
  - `export function planNote(layout: FloorplanLayout, lang: PlanLang): string` - tekstovi:
    - sr: `Šematski prikaz — nije u razmeri` / `Mere su orijentacione` / `Mere su orijentacione · ukupno {X}`
    - en: `Schematic — not to scale` / `Dimensions are approximate` / `Dimensions are approximate · total {X}`
    - de: `Schematische Darstellung — nicht maßstabsgetreu` / `Maße sind ungefähr` / `Maße sind ungefähr · gesamt {X}`
    - ru: `Схема — не в масштабе` / `Размеры ориентировочные` / `Размеры ориентировочные · всего {X}`
    ({X} = `formatArea(total, lang)`)
  - `export function doorWidth(layout: FloorplanLayout): number` (`PLAN_DOOR` ili `DOOR_M * unitsPerMeter`)
  - `export function doorGeometry(layout: FloorplanLayout, door: PlanDoor): { vertical: boolean; at: number; from: number; to: number; center: number; width: number } | null` - `center` = `from + at*(to-from)` ograničen na `[from + width/2 + PLAN_WALL, to - width/2 - PLAN_WALL]`; ako je zid kraći od `width + 2*PLAN_WALL`, `center` = sredina zida i `width` = `max(12, dužina - 2*PLAN_WALL)`.
  - `export function doorAtFromPoint(layout: FloorplanLayout, door: PlanDoor, p: { x: number; y: number }): number` - projekcija tačke na zid → `at` u 0..1 (za editor).
  - `renderFloorplanBody(layout, lang: PlanLang = 'sr')`, `renderFloorplanSvg(layout, lang: PlanLang = 'sr')` - drugi parametar više nije tekst napomene.
- Crtanje vrata (`kind === 'door'`): otvor kao danas (`class="door"` linija širine `width`); krilo `class="leaf"` od šarke upravno na zid, dužine `width`, u stranu grupe `into` (strana se određuje po tome sa koje strane zida je centar `mainShape(into)`); luk `class="swing"` `<path d="M kraj-krila A width width 0 0 s drugi-kraj-otvora"/>`, sweep izabran tako da luk ide kroz unutrašnjost prostorije `into`. `hinge: 'start'` = šarka na manjoj koordinati duž zida. `PLAN_STYLE` dobija `.leaf,.swing{fill:none;stroke:#2B2D33;stroke-width:1.5}` i `.area{font-weight:500;fill:#6B6D73}`.
- m² red: `labelBox(group, r, lang, area?: string)` - `area` je poslednji red veličine `size * 0.72`, klasa `area`, ulazi u visinu za `labelArea` i za `markerPoints` (polovina visine natpisa računa se sa m² redom). Prevod ide kroz isti algoritam (podela u 2 reda, smanjenje do 12).

- [ ] **Step 1: Testovi:**
  - `renderFloorplanSvg bez merila`: sadrži `Šematski prikaz — nije u razmeri`, ne sadrži `m²`, ne sadrži `class="leaf"`.
  - `stari plan crta prolaz na sredini` (Review Focus 1): raspored sa `doors: [{a,b}]`, zid od y=0 do y=160 na x=220 → u SVG-u `<line x1="220" y1="63" x2="220" y2="97" class="door"/>` (sredina 80 ± 17) i nema `leaf`.
  - `izmerena prostorija ima m² na jeziku`: upm 50, grupa 220×160 izmerena → sr SVG sadrži `14,1 m²`, en SVG sadrži `14.1 m²` i `Dimensions are approximate · total 14.1 m²`.
  - `neizmerena prostorija nema m²` kad druga jeste izmerena: SVG sadrži tačno jedno pojavljivanje `m²` u `class="area"` tekstu.
  - `naziv na jeziku`: grupa `label:'Kuhinja', labels:{en:'Kitchen'}` → en SVG ima `>Kitchen<`, de SVG ima `>Kuhinja<` (nema prevoda → srpski).
  - `vrata sa lukom`: `{kind:'door', at:0.25, into:'g2', hinge:'start'}` na horizontalnom zidu dužine 200 → SVG sadrži `class="leaf"` i `class="swing"`; `doorGeometry(...).center === from + 50`.
  - `vrata ostaju na kratkom zidu` (Review Focus 2): zid dužine 40, `at: 0.9` → `center` = sredina zida, `width === 26`.
  - `dug prevod u maloj sobi` (Review Focus 3): grupa 90×80, en `Schlafzimmer mit Ankleide` → `labelArea` širina ≤ 90 - 2*PLAN_WALL (font ide do najmanje 12, red se prelama).
  - `doorAtFromPoint`: tačka na četvrtini zida → `0.25` (±0.01); van zida → ograničeno na 0..1.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementiraj. Editor (`page.tsx`) i dalje poziva `renderFloorplanBody(layout)` / `renderFloorplanSvg(layout)` - podrazumevani `sr` zadržava ponašanje.
- [ ] **Step 4:** `npm test` → PASS; `npx tsc --noEmit` čist.
- [ ] **Step 5:** Ledger.

### Task 4: Nazivi - rečnik i automatsko popunjavanje

**Files:**
- Create: `app/lib/roomNames.ts`
- Test: `app/lib/roomNames.test.ts`

**Interfaces:**
- Consumes: `PlanGroup`, `FloorplanLayout`, `ForeignLang` (Task 1).
- Produces:
  - `export function translateRoomName(sr: string, lang: ForeignLang): string | null` - rečnik (spec, odeljak 2, tačka 2) sa en/de/ru za svaki naziv; poređenje bez velikih slova i dijakritika (`đ→dj`, `ž→z`, `š→s`, `č/ć→c`); završni broj se prenosi (`"Spavaća soba 2"` → en `"Bedroom 2"`).
  - `export type RoomTitles = Map<string, Partial<Record<PlanLang, string>>>` (ID sobe ture → naslovi)
  - `export function fillAutoLabels(layout: FloorplanLayout, rooms: RoomTitles, langs: ForeignLang[]): { layout: FloorplanLayout; missing: { groupId: string; lang: ForeignLang; sr: string }[] }` - za svako prazno, ne-ručno polje: (1) soba ture iz `layout.rooms` u toj grupi čiji je srpski naslov (bez `" 1/2"`) jednak `group.label` → njen naslov na tom jeziku bez `" 1/2"`; (2) `translateRoomName`; inače u `missing`.
  - `export function renameGroup(group: PlanGroup, label: string): PlanGroup` - novi srpski naziv; briše automatske prevode (zadržava samo jezike iz `labelsManual`).
  - `export function setManualLabel(group: PlanGroup, lang: ForeignLang, text: string): PlanGroup` - neprazno → upisuje i dodaje u `labelsManual`; prazno → briše prevod i skida iz `labelsManual`.
  - `export function planLanguages(targetLanguages: string | null, roomI18n: unknown[]): ForeignLang[]` - JSON `target_languages` bez `sr`; ako je null/neispravan, jezici koji se pojavljuju kao ključevi u `title_i18n` soba (en/de/ru, tim redom).

- [ ] **Step 1: Testovi:**
  - `rečnik`: `translateRoomName('Dnevna soba','de') === 'Wohnzimmer'`, `('KUPATILO','en') === 'Bathroom'`, `('Spavaca soba 2','ru') === 'Спальня 2'`, `('Lođa','en') === 'Loggia'`, `('Vinski podrum','en') === null`.
  - `naslov sobe ima prednost`: grupa `Hodnik` sa sobom `{sr:'Hodnik 1/2', en:'Corridor 1/2'}` → en `Corridor` (ne rečnički `Hallway`).
  - `ručni prevod se ne dira`: `labels:{en:'Lounge'}, labelsManual:['en']` ostaje `Lounge`.
  - `nepoznat naziv ide u missing`: `Vinski podrum`, langs `['en','de']` → `missing.length === 2`.
  - `renameGroup briše automatske, čuva ručne`.
  - `setManualLabel('')` vraća automatiku (`labelsManual` bez tog jezika).
  - `planLanguages('["sr","en","de"]', []) → ['en','de']`; `planLanguages(null, [{sr:'a',ru:'b'}]) → ['ru']`; `planLanguages('nije json', []) → []`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementiraj.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Ledger.

### Task 5: API - jezici, prevod, čuvanje po jeziku

**Files:**
- Modify: `app/api/admin/floorplan/route.ts` (GET: `languages`, naslovi soba; POST: SVG/PNG po jeziku)
- Create: `app/api/admin/floorplan/translate/route.ts`

**Interfaces:**
- Consumes: `parseLayout`, `renderFloorplanSvg(layout, lang)` (Task 3), `planLanguages` (Task 4), `generateJsonWithRetry` (`app/lib/gemini.ts`), `requireAdmin` (kao u postojećoj ruti).
- Produces:
  - GET odgovor: `tour.languages: ForeignLang[]`; `rooms[].titles: Partial<Record<PlanLang, string>>` (iz `title_i18n`, plus `sr`).
  - `POST /api/admin/floorplan/translate` telo `{ names: string[]; langs: ForeignLang[] }` (najviše 40 naziva, svaki ≤ 60 znakova) → `{ success: true, translations: Record<string, Partial<Record<ForeignLang, string>>> }`; na grešku modela `{ success: false }` sa 502. Prompt: kratki nazivi prostorija u stanu, sa srpskog, bez objašnjenja, JSON objekat po nazivu. `label: 'floorplan-translate'`, `timeoutMs: 15000`.
  - POST čuvanja prima `pngs?: Partial<Record<PlanLang, string>>` (umesto/uz stari `png`, koji ostaje kao `sr` radi kompatibilnosti); za `sr` i svaki jezik iz `planLanguages` piše `floorplan-schematic.svg` / `.<lang>.svg` i PNG ako je stigao (svaki ≤ `MAX_PNG_BASE64`). JSON jedan. `tours.floorplan_url` i oznake kao danas.

- [ ] **Step 1:** Proveri da `requireAdmin` + Zod/ručna validacija tela prate postojeći stil rute (pročitaj gornji deo `route.ts`).
- [ ] **Step 2:** Implementiraj GET dopunu i POST po jeziku.
- [ ] **Step 3:** Implementiraj `translate/route.ts`; odgovor modela se filtrira: samo traženi nazivi i jezici, string 1–60 znakova.
- [ ] **Step 4:** `npx tsc --noEmit` čist; `npx eslint app/api/admin/floorplan` čist; `curl -s -X POST localhost:3000/api/admin/floorplan/translate` bez prijave → 401 (ruta odbija bez admina).
- [ ] **Step 5:** Ledger.

### Task 6: URL tlocrta po jeziku

**Files:**
- Modify: `app/lib/floorplanImage.ts`
- Test: `app/lib/floorplanImage.test.ts`

**Interfaces:**
- Produces:
  - `export function floorplanUrlFor(url: string | null | undefined, lang: PlanLang): string | null` - šematski (`/floorplan-schematic.svg`) i `lang !== 'sr'` → `/floorplan-schematic.<lang>.svg` sa istim upitom (`?v=`); inače isti URL.
  - `floorplanImageUrl(floorplanUrl, lang: PlanLang = 'sr')` - PNG blizanac jezika (`.<lang>.png`).
  - `fetchFloorplanImage(floorplanUrl, slug, lang: PlanLang = 'sr')` - prvo jezik; ako nema slike, srpski.

- [ ] **Step 1: Testovi** (`floorplanImage.test.ts`, bez mreže - samo URL funkcije):
  - `https://cdn.x/s/floorplan-schematic.svg?v=9` + `en` → `https://cdn.x/s/floorplan-schematic.en.svg?v=9`; + `sr` → isti.
  - pravi tlocrt `https://cdn.x/s/plan.jpg` + `de` → isti.
  - `floorplanImageUrl(šematski, 'ru')` → `.../floorplan-schematic.ru.png?v=9`.
  - `null` → `null`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementiraj.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Ledger.

### Task 7: Tura, video i mejl na jeziku posetioca

**Files:**
- Modify: `app/tour/[slug]/FloorplanMiniMap.tsx` (prop `lang` već postoji)
- Modify: `app/tour/[slug]/TourModals.tsx:578` (img prozora "Skica")
- Modify: `app/tour/[slug]/video/videoPlan.ts:332` (`floorplanUrl` po jeziku videa)
- Modify: `app/tour/[slug]/video/videoEncode.ts:135-136` (ako slika jezika ne učita, pokušaj srpsku)
- Modify: `app/api/tour-capture/route.ts:141` (`fetchFloorplanImage(..., lang)`)

**Interfaces:**
- Consumes: `floorplanUrlFor`, `fetchFloorplanImage(…, lang)` (Task 6).

- [ ] **Step 1:** U obe slike u turi: `src={floorplanUrlFor(url, lang)}` i `onError` koji jednom prebaci `src` na srpski URL (stanje `failed` po URL-u, da ne uđe u petlju) - Review Focus 4.
- [ ] **Step 2:** Video: `floorplanUrl: floorplanUrlFor(tour.floorplan_url, lang)` kad je `marked >= 2`; `videoEncode` čuva i srpski URL (`plan.floorplanFallbackUrl`) i koristi ga ako `loadImage` padne. Dodaj polje `floorplanFallbackUrl: string | null` u tip plana.
- [ ] **Step 3:** Mejl: proslediti `lang`.
- [ ] **Step 4:** `npx tsc --noEmit`, `npm test`. Ručno (dev server, bez prijave): `/tour/dvosoban-48-m2-novi-beograd` na EN - u mrežnim zahtevima tlocrt `floorplan-schematic.en.svg` vraća 404 (plan još nije ponovo sačuvan) i zatim se učita srpski; mini tlocrt nije prazan.
- [ ] **Step 5:** Ledger.

### Task 8: Editor - mere, nazivi, vrata, čuvanje

**Files:**
- Modify: `app/admin/plan/[slug]/page.tsx`
- Create: `app/admin/plan/[slug]/PlanSidePanels.tsx` (paneli "Izabrana prostorija" i "Izabrana vrata" - izdvojeni jer `page.tsx` već ima ~700 linija)

**Interfaces:**
- Consumes: `applyMeters`, `clearMeters`, `shapeMeters`, `groupAreaM2`, `parseMeters`, `formatArea` (Task 2); `doorGeometry`, `doorAtFromPoint`, `groupLabel` (Task 3); `fillAutoLabels`, `renameGroup`, `setManualLabel` (Task 4); GET `languages`/`titles`, `POST .../translate`, `pngs` (Task 5).
- Produces (unutar editora): stanje `selectedDoor: string | null` (ključ `doorKey(a,b)`); `Drag.mode` dobija `'door'`.

- [ ] **Step 1: Mere.** Za izabrani pravougaonik polja Š i D (tekst, `parseMeters` na blur/Enter); prazno/neispravno → poruka "Upišite mere u metrima, npr. 3,40". Prikaz `Površina: {formatArea}` za grupu kad je izmerena. Dugme "Ukloni mere". Pri povlačenju ivice izmerenog pravougaonika mere se prikazuju uživo (`shapeMeters`).
- [ ] **Step 2: Nazivi.** Pri učitavanju: `fillAutoLabels(layout, titles, languages)`. Polje "Naziv" koristi `renameGroup` pa ponovo `fillAutoLabels`. Ispod: po red za svaki jezik ture (`EN`, `DE`, `RU`) sa poljem → `setManualLabel`; automatski prevod se prikazuje sivim tekstom u polju (placeholder ili vrednost sa oznakom "auto").
- [ ] **Step 3: Vrata na platnu.** Za svaka vrata providan pravougaonik za hvatanje (širina vrata × 24 jedinice, preko zida); klik bira (`selectedDoor`, isprekidan plavi okvir), prevlačenje: `doorAtFromPoint` → `at` (zaokruženo na 0.01), `dirty`.
- [ ] **Step 4: Panel vrata.** Naslov "Vrata: {A} ↔ {B}"; Vrsta: [Vrata | Prolaz]; za vrata: "Otvaraju se u:" [A | B] i dugme "⇄ Šarka na drugu stranu"; "Obriši vrata". Postojeći čekboksovi "Vrata ka:" u panelu prostorije ostaju (dodaju/brišu vrata).
- [ ] **Step 5: Čuvanje.** Pre čuvanja: `fillAutoLabels`; ako `missing` nije prazan → `POST /translate`; uspešni prevodi se upisuju kao automatski (ne u `labelsManual`); ako ne uspe, nastavi i prikaži "N naziva nije prevedeno - prikazaće se na srpskom." PNG za `sr` i svaki jezik (`planPngBase64(layout, lang)`), slanje kao `pngs`.
- [ ] **Step 6:** `npx tsc --noEmit`, `npx eslint app/admin/plan`, `npm test`.
- [ ] **Step 7:** Ledger.

### Task 9: Provera na privremenoj strani i završni pregled

**Files:**
- Create (privremeno, briše se pre predaje): `app/dev-plan/page.tsx`

- [ ] **Step 1:** `app/dev-plan/page.tsx` (samo `NODE_ENV === 'development'`): montira editorsku logiku (`PlanSidePanels` + platno) nad lokalnim rasporedom bez R2 (čuvanje isključeno) i prikazuje `renderFloorplanSvg` za sr/en/de/ru jedan pored drugog. Rasporedi: bez mera; delimično izmeren; potpuno izmeren; stara vrata (tuple); vrata u sva četiri pravca.
- [ ] **Step 2:** U ugrađenom pregledaču: upiši mere, povuci ivicu (mere se menjaju), povuci vrata duž zida, promeni stranu i vrstu, preimenuj prostoriju (prevodi se osvežavaju), ručno ispravi EN. Snimak ekrana za vlasnika.
- [ ] **Step 3:** Obriši `app/dev-plan`; zaustavi server pre brisanja `.next/dev/types` ako tsc prijavi zastarele tipove (pitati vlasnika pre `rm`).
- [ ] **Step 4:** `npm test`, `npx tsc --noEmit`, `npx eslint` nad izmenjenim fajlovima - sve čisto.
- [ ] **Step 5:** Završni pregled celog `git diff` (subagent, najjači model) prema specifikaciji i Review Focus listi; ispravke Critical/Important; ledger. Bez commita do "pushuj".
