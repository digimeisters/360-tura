# Okolina ture i poređenje nekretnina

Datum: 27. 10. 2026.
Odobreni mockup: `public/mockup/OkolinaIPoredjenje.html` (lokalno, `public/mockup/` nije u git-u).

Ovo su dve nezavisne funkcije u jednom specu, jer ih je vlasnik tražio zajedno. Plan ih radi kao odvojene celine, prvo okolinu, pa poređenje. Nijedna ne zavisi od druge.

## Cilj

1. **Šta je u blizini:** kupac u turi vidi šta je oko nekretnine (prodavnica, autobus, škola, apoteka, vrtić, zdravstvo, park) i koliko je to minuta hoda. Kupci iz drugih gradova to najviše pitaju, a agent ne mora da objašnjava.
2. **Poređenje:** kupac izabere do 4 nekretnine i vidi ih jednu pored druge: cenu, cenu po m², površinu, strukturu, sprat, lift, grejanje i naselje. Poređenje može da pošalje linkom.

### Šta je vlasnik rekao
- **Okolina:**
  - Popunjava se sama pri čuvanju ture. Postojeće ture se popune jednom. U „⋯“ meniju stoji „Osveži okolinu“.
  - U prozoru „Lokacija“ ide dugme tipa „Istraži okolinu“, a ideja za prikaz je prepuštena meni. Predlog iz mockupa (kartice sa 4 vrste + ceo ekran sa mapom i spiskom) je odobren.
- **Poređenje:**
  - Bira se i na `/ture` i u turi.
  - U tabeli je samo osnovno, bez okoline, bez procene cene i bez isticanja boljeg.
- Mockup: „dobar“.

### Pretpostavke (vlasnik ih nije posebno potvrdio, stoje u mockupu)
- **Okolina:**
  - Na kartici „Lokacija“ su 4 vrste: prodavnica, autobus, škola i apoteka, svaka sa najbližim mestom. Vrsta koje nema u krugu od 1,2 km se ne prikazuje.
  - Okolina postoji samo za ture sa adresom. Bez koordinata prozor „Lokacija“ ostaje kao danas.
- **Poređenje:**
  - Najviše 4 nekretnine. Izbor se pamti u pregledaču kupca (`localStorage`), bez naloga.
  - Red tabele se ne prikazuje ako ga nema nijedna izabrana nekretnina. Prazno polje je „—“.
  - Za izdavanje i smeštaj cena nosi „/mes.“ ili „/noć“ (isto kao `formatListingPrice`), a cena po m² se računa samo za prodaju.
  - Stranica poređenja je `noindex` i ide samo na srpskom, kao `/ture`. Dugme u turi prati jezik ture (SR, EN, DE, RU).
  - Demo ture (`isDemoTour`) mogu u poređenje, ali bez cene, isto kao na `/ture`.

### Uspeh
- **Okolina:**
  - Posle čuvanja ture sa novom adresom, okolina se pojavi u turi bez ikakvog klika, a čuvanje ne čeka OpenStreetMap.
  - Sve objavljene ture sa koordinatama posle jednokratnog punjenja imaju okolinu.
  - „Istraži okolinu“ radi na telefonu i računaru, a ✕ vraća kupca u turu na isto mesto, na isti pogled.
- **Poređenje:**
  - Kupac sa `/ture` ili iz ture doda nekretninu, vidi traku sa brojem i otvori poređenje.
  - Link poređenja otvoren na drugom uređaju pokazuje iste nekretnine.
- **Bez novih troškova:** OpenStreetMap je besplatan, a poređenje radi bez servera osim jednog čitanja baze.

## Van obima
- Okolina na mapi `/ture`, na listi tura i na stranici poređenja.
- Merenje stvarne rute hoda. Minuti su vazdušnom linijom, ≈80 m po minutu, kao kod novogradnje (`walkMinutes`).
- Poređenje na engleskom sajtu, poređenje projekata novogradnje, nalog ili pamćenje na serveru.
- Isticanje boljeg u redu, procena cene, okolina u tabeli.

## Arhitektura: okolina

### O1. Baza (migracija `041_tour_nearby.sql`)
- `alter table public.tours add column if not exists nearby jsonb;`
- `alter table public.tours add column if not exists nearby_updated_at timestamptz;`
- Nema novih GRANT-ova. Kolone u postojećoj tabeli nasleđuju postojeća prava, a tura se čita sa `select('*')`.
- Primenjuje se preko Supabase MCP-a (projekat na kancelarijskom nalogu), pa `npm run db:types`.

### O2. Prevodi kategorija (`app/lib/nearby.ts`)
- `NEARBY_LABELS` se proširuje na `Record<'sr' | 'en' | 'de' | 'ru', Record<NearbyCategory, string>>`. Novogradnja i dalje koristi `sr` i `en`.
- Nova pomoćna funkcija `nearestByCategory(places: NearbyPlace[]): Partial<Record<NearbyCategory, NearbyPlace>>` vraća najbliže mesto po vrsti, za kartice u „Lokaciji“.

### O3. Punjenje pri čuvanju (`app/api/admin/tours/route.ts`)
- U `POST` (nova tura) i `PATCH` (izmena), kada posle čuvanja tura ima `lat`/`lng`, a koordinate su nove ili promenjene (ili `nearby` je `null`), u `after()` se zove `fetchNearby(lat, lng)` i upisuje `nearby` i `nearby_updated_at`.
- Greška OpenStreetMap-a se samo loguje (`console.error('[api/admin/tours] nearby', …)`). Tura je već sačuvana, a okolina ostaje stara ili prazna.
- Nova radnja `PATCH { action: 'nearby-refresh', slug }` radi isto, ali čeka rezultat i vraća `{ success, nearby, nearby_updated_at }`. Ako tura nema koordinate, vraća 400 „Tura nema adresu na mapi“. Obrazac je isti kao `nearby-refresh` za projekte.

### O4. Admin (`app/admin/ture/`)
- U „⋯“ meniju, grupa „Sadržaj ture“, ide stavka „📍 Osveži okolinu“ (`TourRowAction` `'nearby'`).
- Posle uspeha poruka glasi „Okolina je osvežena (N mesta).“, a kod greške ide poruka sa servera.

### O5. Jednokratno punjenje (`scripts/backfill-tour-nearby.mjs`)
- Za sve ture sa `lat`/`lng` i `nearby is null`: `fetchNearby`, pa upis, jedna po jedna, sa pauzom od 3 s (Overpass je javan i deljen).
- Ključ je service role iz `.env.local`, isto kao kod ostalih skripti u `scripts/`.
- Pokreće se jednom posle migracije. Ispisuje „ok / greška“ po turi.
- Logika `fetchNearby` je u TS fajlu bez serverskih uvoza, pa skripta ide preko `node` sa uklanjanjem tipova (Node 24), uvozom `../app/lib/nearby.ts`.

### O6. Prikaz u turi
- **`types.ts`:** `Tour` dobija `nearby?: unknown` i `nearby_updated_at?: string | null`. Čita se preko `parseNearby`.
- **`TourModals.tsx`, prozor „Lokacija“:** ispod kartice sa mapom i adresom, kad `parseNearby(tour.nearby)` nije prazno:
  - Kartica „📍 U blizini · peške“ sa do 4 polja (prodavnica, autobus, škola, apoteka). Svako polje ima ikonicu, naziv vrste i „N min“ najbližeg mesta.
  - Ispod je dugme „🧭 Istraži okolinu“ u stilu `FILL_ACCENT`, visine 44 px.
  - Ako tura nema `location_map_url`, a ima okolinu, prozor pokazuje adresu i okolinu umesto „Mapa lokacije još nije dostupna“.
- **`NearbyExplorer.tsx` (novo, `app/tour/[slug]/`):** ceo ekran preko ture, `position: fixed`, `zIndex` iznad modala.
  - Na telefonu je mapa gore (42 % visine), ispod su filteri (traka koja se pomera vodoravno: „Sve“ + vrste koje postoje) i spisak grupisan po vrsti. Svaka stavka ima naziv (ili naziv vrste kad mesto nema ime), „X m · N min“ i dodir koji je ističe na mapi.
  - Na računaru (≥ 821 px, isti prelom kao Info) mapa je levo, spisak desno.
  - Gore levo stoji naslov „Okolina“ sa adresom, a gore desno ✕ (44 px). Ispod spiska je napomena o izvoru i okvirnim minutima.
  - Mapa je postojeća `components/projekat/ProjectNearbyMap.tsx`, učitana preko `next/dynamic` (`ssr: false`). Dobija filtrirana mesta i `active` indeks u tom filtriranom nizu, a `lang` je `'en'` za `en`/`de`/`ru`.
  - Dobija novi opcioni prop `radiusM?: number`: isprekidan krug na mapi (GeoJSON sloj) od `RADIUS_M` (1,2 km ≈ 15 min). Novogradnja ga ne prosleđuje i ostaje ista.
  - Zatvaranje: ✕, taster Escape ili „nazad“ na telefonu, preko postojećeg `useBackGuard` obrasca ako odgovara. Tura ispod se ne dira, pa pogled i soba ostaju isti.
- **`translations.ts`:** `nearbyTitle`, `nearbyWalk` („peške“), `nearbyExplore`, `nearbyAll`, `nearbyMinutes` („{n} min“), `nearbyMeters` („{m} m“), `nearbySource`, za sva 4 jezika.

## Arhitektura: poređenje

### P1. Pamćenje izbora (`app/lib/compare.ts`, klijent, bez uvoza)
- `COMPARE_KEY = 'k360-compare'`, `COMPARE_MAX = 4`.
- `readCompare(): string[]`, `writeCompare(slugs: string[]): void`, `toggleCompare(slug: string): { slugs: string[]; full: boolean }` (`full` = pokušaj da se doda peta), `compareHref(slugs: string[]): string` vraća `/ture/uporedi?t=slug1,slug2`.
- Sve preko `localStorage` u `try/catch`. Kad pregledač ne da pristup, lista je prazna i dugme samo vodi na stranicu sa tom jednom turom.
- Promena se javlja kroz `window.dispatchEvent(new Event('k360-compare'))` (ista kartica) i događaj `storage` (druge kartice), a `useCompare()` hook sluša oba (`useSyncExternalStore`).
- Čista logika (dodavanje, uklanjanje, granica, link, čišćenje duplikata i praznih slugova) je u funkcijama bez `window`, pa se testira kroz `node --test`.

### P2. `/ture` (`components/TourCard.tsx`, `components/TourList.tsx`)
- Na slici kartice, gore desno, stoji dugme „⇄ Uporedi“, a za izabranu „✓ U poređenju“ (plavo). Visina je 34 px, a meta za dodir 44 px.
- Dugme je `button` unutar kartice-linka. Klik radi `preventDefault` i `stopPropagation`, da se tura ne otvori.
- `TourCard` se koristi i na početnoj, pa dugme ide preko opcionog propa `compare?: boolean`, koji uključuje samo `TourList` na `/ture`.
- Traka na dnu ekrana (`CompareTray`, novo u `components/`) se pokazuje kad je izabrana bar jedna nekretnina. Ima sličice, „Poređenje (N)“, „Dodajte još do X“ (ili „Najviše 4“) i „Uporedi →“ (vodi na `compareHref`).
- Pokušaj da se doda peta daje kratku poruku na traci: „Najviše 4 – uklonite jednu“.

### P3. U turi (`TourModals.tsx`, prozor „Info“)
- Ispod glavne plave kartice stoji dugme sa obrisom (44 px): „⇄ Dodaj u poređenje“, a posle dodavanja „✓ U poređenju · Otvori (N)“, koje vodi na `compareHref` u istoj kartici.
- Ne pokazuje se u admin režimu ni tokom razgledanja uživo.
- `translations.ts`: `compareAdd`, `compareIn` („✓ U poređenju · Otvori ({n})“), `compareFull`, za sva 4 jezika.

### P4. Stranica poređenja (`app/ture/uporedi/page.tsx`, server)
- `searchParams.t` se deli po zarezu. Uzima se najviše 4 jedinstvena sluga, svaki do 100 znakova iz `[a-z0-9-]`.
- Čita samo objavljene ture (`published = true`): `slug, title_i18n, agency_name, category, price, area_sqm, structure, floor, has_elevator, heating, district, city`, plus naslovna slika kao na `/ture` (`getShowcaseTours` ili ista pomoćna funkcija za sliku).
- Redosled kolona je redosled u linku. Slug koji ne postoji ili nije objavljen se tiho izostavlja.
- `metadata`: naslov „Poređenje nekretnina | Kvadrat360“, `robots: { index: false, follow: true }`.
- Izgled je kao u mockupu (`SiteNav`/`SiteFooter` kao `/ture`):
  - Kolona po nekretnini. Prvi red ima sliku, naslov i ✕ (ukloni), a zatim idu redovi:
    - Cena (`formatListingPrice`).
    - Cena po m² (samo za prodaju, cena/površina, zaokruženo na €).
    - Površina, struktura i sprat (sa ukupno spratova ako postoji).
    - Lift, grejanje i naselje, sa postojećim natpisima iz `translations.ts` (`HEATING_LABELS`, `STRUCTURE_LABELS`, …).
  - Poslednji red je „Otvori turu“ (`tourHref`).
  - Nazivi redova su `position: sticky; left: 0`, a tabela se na telefonu pomera vodoravno.
  - Na računaru, kad su izabrane manje od 4, poslednja kolona je „＋ Dodaj sa liste tura“ (link na `/ture`).
- Klijentski deo (`CompareTable` ili samo dugmad):
  - ✕ skida slug iz `localStorage` i iz adrese (`router.replace`).
  - „Pošalji link“ ide preko `navigator.share`, a bez njega kopira u clipboard sa „Kopirano“.
  - Kad se stranica otvori sa `?t=`, ta lista se upisuje u `localStorage`, pa kupac koji je dobio link može dalje da dodaje.
- **Prazno stanje** (bez `t` ili nijedna važeća tura): „Još niste izabrali nekretnine za poređenje.“ i dugme „Pogledajte ture“.
- **Jedna nekretnina:** tabela sa jednom kolonom i pozivom „Dodajte još jednu sa liste tura“.

## Greške i krajnji slučajevi
- **Okolina:**
  - Overpass ne odgovori pri čuvanju: tura je sačuvana, okolina prazna ili stara, a vlasnik može „Osveži okolinu“.
  - Tura promeni adresu: nove koordinate pokreću novo punjenje.
  - Mesta bez imena prikazuju naziv vrste („Prodavnica“).
  - Imena iz OpenStreetMap-a su već u latinici (`toLatin` u `nearby.ts`).
- **Poređenje:**
  - Link sa nepostojećim ili skinutim turama ih izostavlja. Ako ne ostane nijedna, prikazuje se prazno stanje.
  - Više od 4 u linku: uzimaju se prve 4.
  - Isti slug dva puta se računa jednom.
  - Kad `localStorage` nije dostupan, ne pojavljuje se greška: dugme na `/ture` ne pamti izbor, a stranica sa linkom i dalje radi.
- **Bezbednost:** stranica poređenja čita samo javna polja objavljenih tura, kao `/ture`. Slugovi se proveravaju pre upita.

## Provera
- `npx tsc --noEmit` i `npm run lint` bez novih grešaka.
- `npm test`: `compare.ts` (dodavanje, uklanjanje, granica 4, duplikati, link) i `nearestByCategory`.
- Migracija se proverava upitom preko MCP-a (kolone postoje). Skripta za punjenje se pokreće i ispisuje broj popunjenih tura.
- U pregledaču (Playwright, bez prijave):
  - „Lokacija“ sa okolinom, „Istraži okolinu“ na telefonu i računaru, filter, isticanje i ✕ (vraća isti pogled).
  - `/ture`: dodavanje 2, traka, peta odbijena.
  - U turi „Dodaj u poređenje“.
  - Stranica poređenja: ✕, „Pošalji link“, link u novom kontekstu (bez `localStorage`), prazno stanje.
  - Konzola bez grešaka.
- Admin „Osveži okolinu“ u pane-u (prijavljen).

## Redosled rada
1. Okolina: migracija i tipovi, pa `nearby.ts` (prevodi i `nearestByCategory`), pa ruta (`after` i `nearby-refresh`), pa admin stavka, pa skripta za punjenje.
2. Okolina u turi: kartice u „Lokaciji“, `NearbyExplorer`, krug na mapi i prevodi.
3. Poređenje: `compare.ts` sa testovima, pa dugme i traka na `/ture`, pa dugme u turi, pa stranica `/ture/uporedi`.
4. Provera, pa čekanje na „pushuj“.
