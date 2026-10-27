# Okolina ture i poređenje nekretnina — plan implementacije

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kupac u turi vidi šta je u blizini (kartice u „Lokaciji“ i ceo ekran „Istraži okolinu“), a na `/ture` i u turi bira do 4 nekretnine i poredi ih na `/ture/uporedi`.

**Architecture:** Okolina koristi postojeći `app/lib/nearby.ts` (OpenStreetMap, Overpass). Rezultat se čuva u novoj koloni `tours.nearby` i puni se u `after()` posle čuvanja ture, a mapa je postojeća `ProjectNearbyMap`. Poređenje je bez servera: izbor je u `localStorage`, a stranica `/ture/uporedi?t=…` je server komponenta koja čita objavljene ture.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Supabase (MCP za migraciju), MapLibre (postojeći `components/maps/protomaps`), `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-27-okolina-i-poredjenje-design.md`

## Global Constraints

- **Migracija:** `041_tour_nearby.sql`, samo `add column if not exists`. Primenjuje se preko Supabase MCP-a, pa `npm run db:types`.
- **Okolina:** krug `RADIUS_M` = 1200 m (≈15 min). Minuti se računaju sa `walkMinutes` (≈80 m/min). Na kartici „Lokacija“ su 4 vrste: `shop`, `bus`, `school`, `pharmacy`.
- **Poređenje:**
  - `COMPARE_KEY = 'k360-compare'`, `COMPARE_MAX = 4`. Link je `/ture/uporedi?t=slug1,slug2`, a slug prolazi samo ako odgovara `/^[a-z0-9-]{1,100}$/`.
  - Stranica `/ture/uporedi` je `robots: { index: false, follow: true }` i ide samo na srpskom. Dugme u turi ide na sva 4 jezika ture.
  - Dugme za poređenje se ne pokazuje u admin režimu ni tokom razgledanja uživo (`live.blocksAutoplay`).
- **Izgled:** tamno staklo samo preko panorame. Prozori ture su svetli (`BOX`, `THEME`). Mete su najmanje 44 px, a naslovi u Urbanist fontu.
- **Tekst:** generički tekst kaže „nekretnina“, ne „stan“. Fraze u natpisima ne smeju da se lome (npr. `N min` drži se zajedno).
- **Komentari:** na srpskom, u tonu okolnog koda.
- **Git:** ništa se ne commituje ni pushuje do „pushuj“. Koraci „git add“ samo pripremaju fajlove. `docs/cowork/` i `public/mockup/` se nikad ne dodaju.
- **Supabase:** nove tabele bi trebale GRANT-ove, ali ovde ih nema, jer se dodaju samo kolone.

## Review Focus

1. **Okolina pri promeni adrese:** posle čuvanja ture sa promenjenom adresom stara okolina se zameni novom, a čuvanje ture bez promene adrese ne zove Overpass. Test: Task 2, korak 4.
2. **„Istraži okolinu“ zatvaranje:** posle ✕, Escape ili „nazad“ na telefonu kupac je u istoj sobi i na istom pogledu, i „nazad“ ga ne izbacuje iz ture. Test: Task 3, korak 5.
3. **Dugme „Uporedi“ na kartici:** klik ne otvara turu (kartica je link), a tastatura (Tab, pa Enter) radi isto kao klik. Test: Task 5, korak 3.
4. **Link poređenja otvoren na drugom uređaju:** isti redosled, a nepostojeća tura se tiho izostavlja. Ako ne ostane nijedna, prikazuje se prazno stanje, a ne greška. Test: Task 7, korak 4.
5. **`localStorage` nedostupan** (privatni režim, Safari): ni dugme, ni traka, ni stranica ne bacaju grešku. Test: Task 4 (čiste funkcije) i Task 7, korak 4.

---

## Fajlovi

| Fajl | Uloga |
|---|---|
| `supabase/migrations/041_tour_nearby.sql` (novo) | Kolone `nearby`, `nearby_updated_at` u `tours` |
| `app/lib/nearby.ts` (izmena) | Natpisi za `de`/`ru` i `nearestByCategory` |
| `app/lib/nearby.test.ts` (novo) | Test za `nearestByCategory` |
| `app/api/admin/tours/route.ts` (izmena) | Punjenje u `after()` i radnja `nearby-refresh` |
| `app/admin/ture/TourRowMenu.tsx`, `app/admin/ture/page.tsx` (izmena) | „📍 Osveži okolinu“ |
| `scripts/backfill-tour-nearby.mts` (novo) | Jednokratno punjenje postojećih tura |
| `components/projekat/ProjectNearbyMap.tsx` (izmena) | Opcioni krug `radiusM` |
| `app/tour/[slug]/NearbyExplorer.tsx` (novo) | Ceo ekran „Istraži okolinu“ |
| `app/tour/[slug]/TourModals.tsx`, `types.ts`, `translations.ts`, `page.tsx` (izmena) | Kartica u „Lokaciji“, dugme u „Info“, prevodi |
| `app/lib/compare.ts`, `app/lib/compare.test.ts` (novo) | Čista logika izbora i link |
| `app/lib/useCompare.ts` (novo) | Hook za `localStorage` i događaje |
| `components/TourCard.tsx`, `components/TourList.tsx` (izmena), `components/CompareTray.tsx` (novo) | Dugme na kartici i traka |
| `app/ture/uporedi/page.tsx`, `app/ture/uporedi/CompareActions.tsx` (novo) | Stranica poređenja |

---

### Task 1: Baza i čista logika okoline

**Files:**
- Create: `supabase/migrations/041_tour_nearby.sql`, `app/lib/nearby.test.ts`
- Modify: `app/lib/nearby.ts`, `types/supabase.ts` (preko `npm run db:types`), `app/tour/[slug]/types.ts` (`Tour`: `nearby?: unknown; nearby_updated_at?: string | null;`)

**Interfaces:**
- Produces: `NEARBY_LABELS: Record<'sr' | 'en' | 'de' | 'ru', Record<NearbyCategory, string>>`, `nearestByCategory(places: NearbyPlace[]): Partial<Record<NearbyCategory, NearbyPlace>>`, `TOUR_NEARBY_SUMMARY: NearbyCategory[] = ['shop', 'bus', 'school', 'pharmacy']`.

- [ ] **Step 1: Test** — `app/lib/nearby.test.ts` (uvoz `./nearby.ts`):
```ts
test('nearestByCategory uzima najbliže po vrsti', () => {
  const p = (cat, m, name = cat + m) => ({ cat, m, name, lat: 0, lng: 0 });
  const r = nearestByCategory([p('shop', 600), p('shop', 250), p('bus', 140), p('school', 480)]);
  assert.equal(r.shop?.m, 250);
  assert.equal(r.bus?.m, 140);
  assert.equal(r.pharmacy, undefined);
});
test('nearestByCategory za prazan niz', () => assert.deepEqual(nearestByCategory([]), {}));
test('NEARBY_LABELS ima sva 4 jezika i sve vrste', () => {
  for (const l of ['sr', 'en', 'de', 'ru']) for (const c of NEARBY_CATEGORIES) assert.ok(NEARBY_LABELS[l][c]);
});
```
- [ ] **Step 2:** `node app/lib/nearby.test.ts`. Očekivano: FAIL (`nearestByCategory` ne postoji).
- [ ] **Step 3: `nearby.ts`** — dodati `de` i `ru` u `NEARBY_LABELS`:
  - `de`: Schule, Kindergarten, Geschäft, Apotheke, Gesundheitszentrum, Bushaltestelle, Park.
  - `ru`: Школа, Детский сад, Магазин, Аптека, Поликлиника, Автобус, Парк.
  - Dodati i `nearestByCategory` i `TOUR_NEARBY_SUMMARY`.
  - Postojeći korisnici (`ProjectNearby`, `ProjectNearbyMap`, `NearbyPanel`) indeksiraju sa `sr|en`, i to ostaje ispravno.
- [ ] **Step 4:** `node app/lib/nearby.test.ts` → PASS. `npm test` → svi prolaze.
- [ ] **Step 5: Migracija** — `041_tour_nearby.sql`, sa komentarom na vrhu u stilu 022:
```sql
alter table public.tours add column if not exists nearby jsonb;
alter table public.tours add column if not exists nearby_updated_at timestamptz;
```
  Primeniti preko Supabase MCP `apply_migration` (ime `041_tour_nearby`). Provera: `execute_sql` → `select column_name from information_schema.columns where table_name='tours' and column_name like 'nearby%'` vraća 2 reda. Zatim `npm run db:types` i `npx tsc --noEmit` bez grešaka.
- [ ] **Step 6:** `git add` fajlova iz taska.

---

### Task 2: Punjenje okoline (ruta, admin, skripta)

**Files:**
- Modify: `app/api/admin/tours/route.ts`, `app/admin/ture/TourRowMenu.tsx`, `app/admin/ture/page.tsx`
- Create: `scripts/backfill-tour-nearby.mts`

**Interfaces:**
- Consumes: `fetchNearby(lat, lng): Promise<NearbyPlace[]>` (postojeće).
- Produces: `PATCH /api/admin/tours` telo `{ action: 'nearby-refresh', slug }` → `200 { success: true, nearby: NearbyPlace[], nearby_updated_at: string }` | `400 { success: false, error: 'Tura nema adresu na mapi.' }` | `502 { success: false, error: 'OpenStreetMap ne odgovara, probajte kasnije.' }`.
- Produces: `TourRowAction` dobija `'nearby'`.

- [ ] **Step 1: Pomoćna funkcija** u ruti: `async function fillTourNearby(db: SupabaseClient, slug: string, lat: number, lng: number): Promise<NearbyPlace[]>`. Zove `fetchNearby`, pa `update({ nearby, nearby_updated_at: new Date().toISOString() }).eq('slug', slug)`, a greška upisa baca grešku.
- [ ] **Step 2: `POST`** — posle uspešnog inserta, ako `newRow.lat != null && newRow.lng != null`: `after(() => fillTourNearby(ctx.supabase, slug, lat, lng).catch((e) => console.error('[api/admin/tours] nearby', e)))`.
- [ ] **Step 3: `PATCH`, izmena forme** — posle uspešnog `update`, ako su nove koordinate neprazne i (`current.lat !== coords.lat || current.lng !== coords.lng || current.nearby == null`), isti `after(...)`. U `select` za `current` (red ~415) dodati `nearby`. Na početku `PATCH` dodati granu `body.action === 'nearby-refresh'`: čita `lat, lng`, vraća 400 bez koordinata, a inače `await fillTourNearby`, uz 502 kad baci.
- [ ] **Step 4: Provera** — preview `kvadrat360-dev` (pane je prijavljen kao admin):
  - Na test turi sa adresom pokrenuti „📍 Osveži okolinu“, pa `execute_sql` `select jsonb_array_length(nearby), nearby_updated_at from tours where slug='…'` daje broj > 0 i današnje vreme.
  - Zatim sačuvati formu bez promene adrese i proveriti da se `nearby_updated_at` NIJE promenio (Review Focus 1).
- [ ] **Step 5: Admin** — `TourRowMenu`: `<Item onClick={() => act('nearby')}>📍 Osveži okolinu</Item>` posle „🎙 Uvod (glas)“. `page.tsx`: `else if (action === 'nearby') void refreshNearby(tour);`. `refreshNearby` radi `authFetch` PATCH (isti obrazac kao ostale radnje), a poruke su „Okolina je osvežena (N mesta).“ i `data.error`.
- [ ] **Step 6: Skripta** `scripts/backfill-tour-nearby.mts`:
  - Čita `.env.local` (isti parser kao u ostalim skriptama) i pravi `createClient(url, SUPABASE_SERVICE_ROLE_KEY)`.
  - Bira `select slug, lat, lng from tours where lat is not null and lng is not null and nearby is null`.
  - Za svaku turu: `fetchNearby` (uvoz `../app/lib/nearby.ts`), upis, ispis `ok slug N` ili `greška slug poruka`, pa `await new Promise(r => setTimeout(r, 3000))`.
  - Na kraju ispisuje `Gotovo: X ok, Y greška`.
  - Pokreće se sa `node scripts/backfill-tour-nearby.mts`. Očekivano: sve ture ok, osim pojedinačnih grešaka Overpass-a, koje se ponove drugim pokretanjem.
- [ ] **Step 7:** `npx tsc --noEmit`, `npx eslint` za izmenjene fajlove (bez novih grešaka), pa `git add`.

---

### Task 3: Okolina u turi

**Files:**
- Modify: `components/projekat/ProjectNearbyMap.tsx`, `app/tour/[slug]/TourModals.tsx`, `app/tour/[slug]/translations.ts`
- Create: `app/tour/[slug]/NearbyExplorer.tsx`

**Interfaces:**
- Consumes: `parseNearby`, `nearestByCategory`, `TOUR_NEARBY_SUMMARY`, `NEARBY_LABELS`, `NEARBY_ICONS`, `NEARBY_CATEGORIES`, `walkMinutes`, `RADIUS_M`.
- Produces: `ProjectNearbyMap` prop `radiusM?: number`. `NearbyExplorer({ lat, lng, address, places, lang, t, onClose }: { lat: number; lng: number; address: string; places: NearbyPlace[]; lang: Language; t: Record<string, string>; onClose: () => void }): JSX.Element`.

- [ ] **Step 1: Prevodi** u sva 4 jezika:
  - `nearbyTitle`: „U blizini · peške“ / „Nearby · on foot“ / „In der Nähe · zu Fuß“ / „Рядом · пешком“.
  - `nearbyExplore`: „Istraži okolinu“ / „Explore the area“ / „Umgebung erkunden“ / „Исследовать район“.
  - `nearbyAreaTitle`: „Okolina“ / „The area“ / „Umgebung“ / „Окрестности“.
  - `nearbyAll`: „Sve“ / „All“ / „Alle“ / „Все“.
  - `nearbyMin`: „{n} min“ (svi jezici; RU „{n} мин“).
  - `nearbyM`: „{m} m“ (RU „{m} м“).
  - `nearbySource`: „Podaci: © OpenStreetMap saradnici. Minuti su vazdušnom linijom, okvirno.“, plus EN, DE i RU sa istim smislom.
- [ ] **Step 2: Krug na mapi** — u `ProjectNearbyMap`, kad je `radiusM` zadat, posle učitavanja stila dodati GeoJSON izvor `nearby-radius`: poligon kruga sa 64 tačke oko `[lng, lat]`, računato na sferi (`dLat = r / 111320`, `dLng = r / (111320 * cos(lat))`). Sloj `line` ide sa `line-color: '#1E5AA8'`, `line-opacity: .45`, `line-width: 1.5`, `line-dasharray: [2, 2]`. Ako nema `radiusM`, ponašanje je isto kao danas.
- [ ] **Step 3: Kartica u „Lokaciji“** (`TourModals.tsx`, grana `activeModal === 'location'`): `const nearbyPlaces = parseNearby(tour?.nearby)`.
  - Kada nije prazno, ispod postojećeg bloka ide kartica (`BOX`, `borderRadius: 18`) sa naslovom `t.nearbyTitle`.
  - Mreža 2×2 za `TOUR_NEARBY_SUMMARY`, filtrirana na postojeće: ikonica `NEARBY_ICONS`, natpis `NEARBY_LABELS[lang]` i desno `N min` sa `whiteSpace: nowrap`.
  - Ispod mreže ide dugme `FILL_ACCENT` od 44 px: „🧭 {t.nearbyExplore}“, koje otvara `NearbyExplorer` (lokalni `useState` u `TourModals`).
  - Uslov `tour?.location_map_url ? … : empty(t.noLocation)` se menja tako da, bez mape a sa okolinom, ide adresa i kartica umesto „nije dostupna“.
  - Explorer se pokazuje samo kad `tour.lat != null && tour.lng != null`.
- [ ] **Step 4: `NearbyExplorer.tsx`** po specu O6:
  - `position: fixed; inset: 0; zIndex: 80`, pozadina `THEME.bg`. Mapa ide preko `next/dynamic(() => import('../../../components/projekat/ProjectNearbyMap'), { ssr: false })`, sa `radiusM={RADIUS_M}`, `lang={lang === 'sr' ? 'sr' : 'en'}`, `places={filtrirana}` i `active={indeks u filtriranom}`.
  - Filter `cat: NearbyCategory | 'all'`. Kod promene filtera `active` postaje `null`.
  - Raspored: kolona na telefonu, a od 821 px red (CSS klasa u `<style>`, kao `.k360-about`).
  - Zatvaranje:
    - ✕ (44 px, `aria-label={t.close}`), Escape (`keydown`) i „nazad“ (`history.pushState({ k360Nearby: 1 }, '')` pri otvaranju).
    - `popstate` zove `onClose`. Zatvaranje preko ✕ ili Escape radi `history.back()` ako je stanje i dalje na vrhu.
  - Tekstovi idu kroz `t` i `NEARBY_LABELS[lang]`. Mesto bez imena koristi naziv vrste.
- [ ] **Step 5: Provera** (Playwright, bez prijave, tura sa okolinom iz Task 2):
  - Na telefonu (375×812): „Lokacija“ pokazuje 4 kartice. „Istraži okolinu“ ima mapu sa krugom i spisak, a filter „Prodavnice“ ostavlja samo prodavnice.
  - Dodir na stavku istakne pin. ✕, pa „nazad“ zatvara: isto ime sobe u traci i isti `yaw` (Review Focus 2). Pogled se poredi preko `document.querySelector('.k360-top__roomnav').innerText` i snimka ekrana pre i posle.
  - Isto na računaru (1280×720).
  - Tura bez koordinata: „Lokacija“ izgleda kao pre.
  - `npx tsc --noEmit`, eslint.
- [ ] **Step 6:** `git add`.

---

### Task 4: Čista logika poređenja

**Files:**
- Create: `app/lib/compare.ts`, `app/lib/compare.test.ts`, `app/lib/useCompare.ts`

**Interfaces:**
- Produces (`compare.ts`, bez uvoza):
  ```ts
  export const COMPARE_KEY = 'k360-compare';
  export const COMPARE_MAX = 4;
  export const COMPARE_EVENT = 'k360-compare';
  export function cleanSlugs(input: unknown): string[];            // niz stringova, /^[a-z0-9-]{1,100}$/, bez duplikata, najviše COMPARE_MAX
  export function parseCompareParam(t: string | undefined | null): string[]; // "a,b,c" → cleanSlugs
  export function toggleSlug(list: string[], slug: string): { slugs: string[]; full: boolean };
  export function removeSlug(list: string[], slug: string): string[];
  export function compareHref(slugs: string[]): string;            // '/ture/uporedi?t=' + slugs.join(','), prazno → '/ture/uporedi'
  export function readCompare(storage: Pick<Storage, 'getItem'> | null): string[];  // JSON, greške → []
  export function writeCompare(storage: Pick<Storage, 'setItem'> | null, slugs: string[]): void; // greške se gutaju
  ```
- Produces (`useCompare.ts`, `'use client'`): `useCompare(): { slugs: string[]; toggle: (slug: string) => { full: boolean }; remove: (slug: string) => void; set: (slugs: string[]) => void }`. Koristi `useSyncExternalStore` sa `storage` i `COMPARE_EVENT`, a na serveru vraća `[]`. Svaka promena radi `writeCompare(safeLocalStorage(), …)` i `window.dispatchEvent(new Event(COMPARE_EVENT))`. Snapshot se kešira po sirovom stringu, da `useSyncExternalStore` ne dobija nov niz svaki put.

- [ ] **Step 1: Testovi** — `compare.test.ts`:
```ts
test('toggle dodaje i skida', () => {
  assert.deepEqual(toggleSlug([], 'a').slugs, ['a']);
  assert.deepEqual(toggleSlug(['a'], 'a').slugs, []);
});
test('peta se ne dodaje', () => {
  const r = toggleSlug(['a', 'b', 'c', 'd'], 'e');
  assert.equal(r.full, true);
  assert.deepEqual(r.slugs, ['a', 'b', 'c', 'd']);
});
test('cleanSlugs: duplikati, loši slugovi, najviše 4', () => {
  assert.deepEqual(cleanSlugs(['a', 'a', 'B!', '', 'b', 'c', 'd', 'e', 5]), ['a', 'b', 'c', 'd']);
  assert.deepEqual(cleanSlugs('a'), []);
});
test('parseCompareParam i compareHref', () => {
  assert.deepEqual(parseCompareParam('stan-a,stan-b,,stan-a'), ['stan-a', 'stan-b']);
  assert.deepEqual(parseCompareParam(undefined), []);
  assert.equal(compareHref(['x', 'y']), '/ture/uporedi?t=x,y');
  assert.equal(compareHref([]), '/ture/uporedi');
});
test('readCompare/writeCompare podnose kvar i null', () => {
  assert.deepEqual(readCompare(null), []);
  assert.deepEqual(readCompare({ getItem: () => '{nije json' }), []);
  assert.deepEqual(readCompare({ getItem: () => { throw new Error('blokirano'); } }), []);
  assert.doesNotThrow(() => writeCompare({ setItem: () => { throw new Error('pun'); } }, ['a']));
  let saved = ''; writeCompare({ setItem: (_k, v) => { saved = v; } }, ['a']);
  assert.deepEqual(readCompare({ getItem: () => saved }), ['a']);
});
```
- [ ] **Step 2:** `node app/lib/compare.test.ts`. Očekivano: FAIL (modul ne postoji).
- [ ] **Step 3:** Napisati `compare.ts`. → PASS. Napisati `useCompare.ts`. `npx tsc --noEmit`, eslint (bez `setState` u efektima).
- [ ] **Step 4:** `npm test` → svi prolaze. `git add`.

---

### Task 5: Poređenje na `/ture`

**Files:**
- Modify: `components/TourCard.tsx`, `components/TourList.tsx`
- Create: `components/CompareTray.tsx`

**Interfaces:**
- Consumes: `useCompare`, `compareHref`, `COMPARE_MAX` (Task 4).
- Produces: `TourCard` prop `compare?: { selected: boolean; onToggle: () => void }` (bez njega kartica je ista kao danas). `CompareTray({ tours, notice }: { tours: ShowcaseTour[]; notice: boolean }): JSX.Element | null`, gde `tours` služi za sličice i naslove izabranih, a `notice` pokazuje „Najviše 4 – uklonite jednu“ (TourList ga drži 3 s posle `full: true`).

- [ ] **Step 1: `TourCard`** — kad postoji `compare`, u `.tour-photo` ide `<button type="button" className="tour-compare" aria-pressed={selected} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}>`.
  - Natpis je „⇄ Uporedi“ ili „✓ U poređenju“. Stil ide u postojeći stylesheet sajta za kartice (gde je `.tour-photo`): 34 px visine sa nevidljivim proširenjem do 44 px (`::before` inset -5px), gore desno. Izabrano je `background: var(--accent)` i bela slova.
  - Jezici ture (`.tour-langs`) su takođe gore desno, pa se pomeraju dole levo, ali samo na kartici sa `compare`.
- [ ] **Step 2: `TourList`** — `const { slugs, toggle } = useCompare()`, pa za obe `<TourCard … compare={{ selected: slugs.includes(tour.slug), onToggle: () => { const r = toggle(tour.slug); if (r.full) setTrayNotice(true); } }} />`. Na kraju liste ide `<CompareTray tours={allTours} notice={…} />`.
  - `CompareTray`: `position: fixed; left: 12px; right: 12px; bottom: calc(env(safe-area-inset-bottom) + 12px); max-width: 560px; margin: 0 auto`, tamna (`#14161a`), sa do 4 sličice iz `coverUrl`.
  - Tekst je „Poređenje (N)“ i „Dodajte još do X“, a pri `notice` 3 s ide „Najviše 4 – uklonite jednu“. Link „Uporedi →“ vodi na `compareHref(slugs)`. Kad nema izabranih, traka se ne prikazuje (`return null`).
  - Ispod liste ide prazan prostor (`padding-bottom`), da traka ne pokrije poslednju karticu.
- [ ] **Step 3: Provera** (Playwright, 375×812 i 1280×720, `/ture`):
  - Klik „⇄ Uporedi“ na dve kartice: URL ostaje `/ture`, traka pokazuje „Poređenje (2)“.
  - Tab do dugmeta, pa Enter, menja izbor i ne otvara turu (Review Focus 3).
  - Peta daje poruku, a dugme pete ostaje „⇄ Uporedi“.
  - Osvežavanje strane čuva izbor.
  - Početna strana `/`: kartice bez dugmeta.
  - Konzola bez grešaka. `npx tsc --noEmit`, eslint.
- [ ] **Step 4:** `git add`.

---

### Task 6: „Dodaj u poređenje“ u turi

**Files:**
- Modify: `app/tour/[slug]/TourModals.tsx`, `app/tour/[slug]/translations.ts`, `app/tour/[slug]/page.tsx`

**Interfaces:**
- Consumes: `useCompare`, `compareHref`.
- Produces: `TourModals` prop `compareEnabled: boolean`.

- [ ] **Step 1: Prevodi** (4 jezika):
  - `compareAdd`: „⇄ Dodaj u poređenje“ / „⇄ Add to comparison“ / „⇄ Zum Vergleich hinzufügen“ / „⇄ Добавить к сравнению“.
  - `compareIn`: „✓ U poređenju · Otvori ({n})“ / „✓ In comparison · Open ({n})“ / „✓ Im Vergleich · Öffnen ({n})“ / „✓ В сравнении · Открыть ({n})“.
  - `compareFull`: „Najviše 4 nekretnine – uklonite jednu na stranici poređenja.“, plus EN, DE i RU istog smisla.
- [ ] **Step 2: Dugme u „Info“** — u grani `activeModal === 'about'`, ispod `k360-about__hero`, kad je `compareEnabled && tour?.slug`, ide dugme sa obrisom od 44 px, puna širina, `borderRadius: 999`, boja `THEME.accent`.
  - Ako tura nije izabrana: `compareAdd`. Klik zove `toggle`, a ako vrati `full: true`, ispod se pokaže `compareFull`.
  - Ako je izabrana: `<a href={compareHref(slugs)}>` sa `compareIn` i `{n}` = broj izabranih.
  - U `page.tsx` se prosleđuje `compareEnabled={!adminMode && !live.blocksAutoplay}`.
- [ ] **Step 3: Provera** (Playwright, obična tura): „Info“ i dodir, pa natpis postaje „✓ U poređenju · Otvori (N)“, a link vodi na `/ture/uporedi?t=…`. Sa `?uzivo=` ili `?agent=` dugmeta nema. Zatim `npx tsc --noEmit`, eslint, `git add`.

---

### Task 7: Stranica `/ture/uporedi`

**Files:**
- Create: `app/ture/uporedi/page.tsx`, `app/ture/uporedi/CompareActions.tsx`

**Interfaces:**
- Consumes: `parseCompareParam`, `useCompare`, `formatListingPrice`, `tourHref`, `STRUCTURE_LABELS`, `HEATING_LABELS` i ostali natpisi iz `app/tour/[slug]/translations.ts` (isti ključevi kao u Info), `SiteNav`/`SiteFooter`/`SiteStylesheets` kao `/ture`.
- Produces: `CompareActions({ slugs }: { slugs: string[] })` (klijent): upisuje `slugs` u `localStorage` pri otvaranju (`useCompare().set` u efektu je dozvoljeno, jer ne postavlja React stanje), pa „Pošalji link“. `RemoveButton({ slug, slugs })` (klijent): ✕, `remove(slug)` i `router.replace(compareHref(ostali))`.

- [ ] **Step 1: Server stranica**:
  - Ima `export const metadata` (naslov, `robots: { index: false, follow: true }`) i `export default async function Page({ searchParams })`, gde je `searchParams` `Promise` u ovoj verziji Next-a. Proveriti u `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`.
  - `slugs = parseCompareParam(t)`. Upit ide preko anon klijenta (isti kao `showcaseTours.ts`): `from('tours').select('slug, title_i18n, agency_name, category, price, area_sqm, structure, floor, has_elevator, heating, district, city').in('slug', slugs).eq('published', true)`. Rezultat se ređa po redosledu u `slugs`.
  - Naslovna slika i naslov: iz `getShowcaseTours('sr')` filtrirano po slugovima, ako to ne učitava previše; inače ista pomoćna funkcija koju koristi `showcaseTours.ts` za sliku.
  - Cena po m²: samo za `category === 'sale'`, kad postoje i cena i površina, i kad tura nije demo (`isDemoTour`). Zaokružuje se i formatira kao `formatListingPrice`.
  - Red se prikazuje samo ako bar jedna nekretnina ima vrednost.
- [ ] **Step 2: Izgled** po mockupu i specu P4:
  - Tabela sa `th.k` / `td.k` `position: sticky; left: 0`, a omotač `overflow-x: auto`.
  - Na računaru, kad je manje od 4, poslednja kolona je „＋ Dodaj sa liste tura“ (`/ture`).
  - Prazno stanje: „Još niste izabrali nekretnine za poređenje.“ i „Pogledajte ture“. Kad je jedna nekretnina, ispod ide poziv „Dodajte još jednu sa liste tura“.
- [ ] **Step 3: Klijentski delovi**:
  - „Pošalji link“: `navigator.share({ url })`. Bez njega ide `clipboard.writeText`, pa „Kopirano“. Bez ijednog od ta dva ide `window.prompt`.
  - ✕ po koloni.
- [ ] **Step 4: Provera** (Playwright):
  - Sa `/ture` izaberi 3, pa „Uporedi →“: tabela ima 3 kolone u istom redosledu, redove, „Otvori turu“ i „Pošalji link“.
  - ✕ na drugoj koloni: adresa i tabela imaju 2 kolone, a `/ture` traka kaže 2.
  - Novi kontekst bez `localStorage` (novi Playwright `browser.newContext()`) sa istim linkom: iste kolone (Review Focus 4).
  - Link sa nepostojećim slugom i jednim pravim: samo pravi. Link samo sa nepostojećim: prazno stanje.
  - `?t=` sa 6 slugova: 4 kolone.
  - Na telefonu (375×812) se kolone pomeraju, a nazivi redova stoje.
  - `localStorage` blokiran (`page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blokirano'); } }); })`): `/ture` i `/ture/uporedi?t=…` rade bez greške u konzoli (Review Focus 5).
  - `npx tsc --noEmit`, `npm run lint` (bez novih grešaka), `npm test`.
- [ ] **Step 5:** `git add`. Završni izveštaj vlasniku sa slikama ekrana, pa commit i push tek na „pushuj“.
