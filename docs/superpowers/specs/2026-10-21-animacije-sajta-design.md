# Animacije na sajtu: početna strana (krug 1)

Datum: 21. 10. 2026 · Status: čeka odobrenje vlasnika · Maketa: `public/mockup/Animacije.html`

## Cilj

- **Glavni cilj (B):** animacije objašnjavaju uslugu. Posetilac u par sekundi vidi
  put od poziva do gotove ture, šta dobija i koliko košta.
- **Ton (A):** utisak kvaliteta. Pokreti su jasni ali mirni, nema skakanja ni
  ponavljanja u petlji.
- **Obim kruga 1:** samo početna strana (`/` i `/en`, ista komponenta
  `app/HomePage.tsx`). Ostale strane nasleđuju isti sistem u kasnijim krugovima.

## Odluke vlasnika

| Pitanje | Odluka |
|---|---|
| Tehnika | Sopstveni lagani sistem (CSS + mali klijentski kod), bez biblioteke |
| Tempo | **Srednje**: pomeraj 18 px, trajanje 0,8 s, razmak u nizu 90 ms |
| "Kako radimo" | **Linija** (B2a), a ne traka preko kartica |
| Ostali efekti | Kao u maketi (A1, A2, A3, B1, B3, B4, brojke, C1, hover) |

## Rečnik efekata

| Oznaka | Efekat | Gde na početnoj |
|---|---|---|
| A1 | Izron: pomeraj 18 px naviše + pojava; elementi u grupi idu redom (90 ms) | oznake i podnaslovi sekcija, kartice tura, benefiti, usluge, pitanja, kontakt, poziv na sredini, kartica "Šta dobijate" |
| A2 | Naslov se izoštri iz zamućenja (blur 8 px → 0) uz izron | h1 u heroju, h2 svih sekcija |
| A3 | Izron uz blago uvećanje (0,965 → 1) | telefon u "U samoj turi", kartice paketa |
| B1 | Fotografija u heroju se za 2,4 s približi sa 1,07 na 1 | hero |
| B2a | Linija: siva vodilica između krugova 01–04, plava linija se spušta niz nju (3 × 540 ms); krug je beo sa plavim obodom i popuni se plavom (#1e5aa8) kad ga linija dotakne; tekst koraka izranja istovremeno | Kako radimo |
| B3 | Stavke "Šta dobijate" ulaze s leva, jedna za drugom | Kako radimo |
| B4 | Odgovor u pitanjima i tabela popusta se glatko otvaraju (0,45 s) | Pitanja, cenovnik |
| Brojke | Cena raste od 0 do pune vrednosti za 1,2 s; "600+ otvaranja" broji naviše | cenovnik, hero |
| C1 | Jedan blagi odsjaj preko plavog dugmeta kad se prvi put pojavi | sva `btn-primary` dugmad |
| Hover | Kartica se podigne 4 px uz senku (samo uređaji sa mišem) | ture, benefiti, usluge |

Svaki efekat se pušta **jednom**, kad element prvi put uđe u ekran (15% elementa
vidljivo, donja ivica ekrana umanjena za 8%). Pri skrolu nazad nema ponavljanja.

## Arhitektura

### 1. Oznake u markupu (serverske komponente)

Elementi dobijaju atribut `data-reveal`: `up` (A1), `blur` (A2), `scale` (A3),
`list` (B3). Sekcija "Kako radimo" dobija `data-reveal-steps` na `.steps-row`.
Redosled u grupi računa klijentski kod (indeks među braćom sa istim roditeljem),
pa ga ne treba ručno upisivati.

Atributi ne rade ništa sami od sebe. Na strani bez komponente iz tačke 2 sve je
odmah vidljivo kao danas. Zato je bezbedno staviti ih i u deljene komponente
(`Pricing`, `TourModulesShowcase`) koje koriste i druge strane.

### 2. `components/SiteReveal.tsx` (klijentska, renderuje `null`)

Isti obrazac kao `CardSpotlight` i `SiteTracker`: jedan efekat na nivou
dokumenta, pa sadržaj strane ostaje serverski.

- Pri montiranju postavlja `html.rv-armed`, računa `--i` za svaki `[data-reveal]`
  i pokreće jedan `IntersectionObserver`.
- Kad element uđe u ekran: dodaje `.is-in` i prestaje da ga posmatra.
- `[data-reveal-steps]`: ubacuje vodilicu i liniju (dva `div`-a sa
  `aria-hidden`), postavlja ih od centra prvog do centra poslednjeg kruga i
  pomera ih na `ResizeObserver`. Ceo red se okida kao celina.
- C1: posmatra `.btn-primary` i dodaje `.is-shone`.
- Ako je uključeno `prefers-reduced-motion: reduce`, ne postavlja `rv-armed`
  i ne radi ništa.
- Pri demontiranju (prelazak na drugu stranu kroz `Link`) gasi observere i
  skida `rv-armed`.

### 3. `components/CountUp.tsx` (klijentska)

`<CountUp value={8500} locale="sr-RS" suffix=" din." />`. Server ispisuje
**konačnu** vrednost, pa je cena u HTML-u tačna za Google, za čitače ekrana i
kad JS ne radi. Kad broj uđe u ekran, a `rv-armed` je postavljen, broji od 0
naviše (ease-out, 1,2 s). `aria-label` uvek nosi konačnu vrednost. Koristi se u
`Pricing` (vrednosti iz `app/lib/pricing.ts`, uz promo cene iz `PromoPrice`) i
za brojku otvaranja u heroju.

### 4. CSS u `app/lib/siteStyles.ts`

- Promenljive tempa na `:root`: `--rv-dist: 18px; --rv-dur: .8s; --rv-step: 90ms`.
- Skrivanje važi samo pod `html.rv-armed [data-reveal]:not(.is-in)`. Bez JS-a,
  pre hidratacije i sa smanjenim pokretima sadržaj je vidljiv.
- Animiraju se samo `opacity`, `transform` i `filter`, pa nema pomeranja
  rasporeda (CLS ostaje 0).
- **Hero je izuzetak:** h1, uvod, dugmad, činjenice i fotografija (B1) koriste
  CSS `@keyframes` pri učitavanju i ne čekaju JS. Tako prvi ekran ne treperi
  (vidljivo → skriveno → vidljivo) dok se React učitava.
- B4: `interpolate-size: allow-keywords` i `details::details-content`. Pregledači
  koji to ne podržavaju (trenutno Safari i Firefox) otvaraju odgovor odmah kao
  danas, bez greške.
- Hover podizanje stoji pod `@media (hover: hover)`.
- Postojeće globalno pravilo `prefers-reduced-motion` (siteStyles.ts:130) ostaje
  i važi i za nove efekte.

### 5. Montiranje

`<SiteReveal />` ide u `app/HomePage.tsx`, pored `CardSpotlight`. Druge strane
ga dobijaju tek u svom krugu.

## Wow sekcija: "Od tlocrta do ture" (odobreno 21. 10. 2026)

Maketa: `public/mockup/TlocrtTura.html` (+ `TlocrtTuraTelefon.html`). Tura:
**Apartman Belgrade Four, Dorćol** (`stan-gasse-1`). Sve što se prikazuje dolazi
iz njenih stvarnih podataka; ništa nije izmišljeno.

**Mesto:** nova sekcija `id="od-tlocrta"` odmah posle `#u-turi`, pre `#zakazite`.

**Kadrovi** (napredak `p` = koliko je sekcije proskrolovano, 0–1):

| p | Kadar | Šta se dešava |
|---|---|---|
| 0–.16 | 1 Snimimo svaki kvadrat | zidovi tlocrta se iscrtavaju jedan po jedan, pa se prostorije popune |
| .16–.23 | 2 Svaka prostorija ima ime | nazivi se pojavljuju redom |
| .23–.30 | 3 Tačka je mesto kamere | tačke soba (`floorplan_x/y`) iskaču |
| .30–.44 | 4 Jedan dodir, i kupac je unutra | soba A zasvetli, ostale se povuku, kamera uleti u tačku A, tlocrt se pretopi u panoramu A |
| .44–.58 | 5 Vidi i ono što slika ne kaže | pogled se okrene ka hotspotu, tačka "i" pulsira, otvori se kartica (naslov + prva rečenica opisa + "▶ Vodič čita opis") |
| .58–.72 | 6 Kreće se kao da je tamo | pogled ka strelici ka sobi B, strelica sa pravim tekstom, prolaz (uvećanje + zamućenje), panorama B; mali tlocrt u uglu: tačka putuje A → B, konus prati pogled |
| .72–.90 | 7 Vodič govori jezik kupca | titl uvodnog teksta sobe B se smenjuje SR → EN → DE → RU, uz talase zvuka |
| .90–1 | Kraj | "Razgledanje pre prvog dolaska" + dugme "Prošetajte sami →" na turu |

**Podaci (konfiguracija u kodu, ne u bazi):** slug `stan-gasse-1`; soba A
"Dnevna soba-centar" (`4998dd2b-…`); hotspot "Ugaona Garnitura" (yaw 136.9,
pitch −18.9); soba B "Soba 1" (`368699bf-…`), do nje strelica "Pređite u
spavaću sobu" (yaw 174.5, pitch −9.4). Tlocrt je `tours.floorplan_url`
(šematski SVG), a uglovi i tekstovi se čitaju iz `rooms` pri build-u, pa izmena
u admin panelu stiže u sekciju posle ponovnog objavljivanja.

**Tehnika:**
- Serverska komponenta učitava podatke i ubacuje SVG tlocrta u stranicu. Bez JS-a
  posetilac vidi ceo tlocrt, četiri koraka kao listu i dugme. Google vidi isto.
- Klijentska komponenta tek tada "naoruža" sekciju: visina 640vh (telefon
  ≤760 px: 520vh), scena `position: sticky`. Napredak se računa iz skrola u
  `requestAnimationFrame`, a petlja radi samo dok je sekcija na ekranu. Radi u
  svim pregledačima, i u Firefox-u.
- Panorame su ravne slike koje se pomeraju (kao hero), `panorama_url_mobile`
  (~435 KB + ~415 KB). Skidaju se kad je sekcija 800 px od ekrana.
- Konus na malom tlocrtu koristi postojeći `planHeadingFor` iz ture.
- `prefers-reduced-motion: reduce`: sekcija ostaje u statičnom obliku (kao bez JS-a).
- Tekst koraka je u `homeCopy.ts`, na srpskom i engleskom.

## "U samoj turi": mikro-filmovi u telefonu (odobreno 21. 10. 2026)

Maketa: `public/mockup/DugmadTura.html`. Postojeće samo-smenjivanje
(`TourModulesShowcase`) ostaje kakvo jeste: staje na klik, radi samo dok je
traka na ekranu i gasi se uz smanjene pokrete. Menja se ovo:

- `AUTO_MS` ide sa 3500 na **4600**.
- List u telefonu se pri promeni dugmeta podigne odozdo (0,42 s).
- Svako dugme dobija svoj film, kao u maketi:
  - **Info:** cena se izbroji, ključni podaci i redovi ulaze redom, ✓ iskoči;
  - **Pitanja:** dodir na prvo pitanje, tri tačke, odgovor se otkuca;
  - **Lokacija:** mapa klizne, pribadača padne, krug "kraja" i oznaka "Kućni broj skriven";
  - **Plan:** tačka obilazi prostorije, a soba u kojoj je zasvetli;
  - **Kontakt:** dodir na "Zakaži razgledanje", forma se sama popuni, "Šaljem…" i "Zahtev poslat ✓".
- Novi tekstovi (oznaka "Kućni broj skriven", primer forme, "Pošalji zahtev",
  "Šaljem…", "Zahtev poslat ✓") idu u `homeCopy.ts` `modules.preview`, na SR i EN.
- Film se pušta i kad posetilac sam klikne dugme. Uz smanjene pokrete telefon
  pokazuje konačno stanje bez filma.

## Opterećenje sajta

| Deo | Dodatno | Kada se učitava |
|---|---|---|
| Sistem otkrivanja + brojke | ~3 KB CSS + ~2 KB JS (gzip) | sa stranom |
| Wow sekcija: kod + tlocrt | ~4 KB JS + ~3 KB SVG | sa stranom |
| Wow sekcija: dve panorame | ~2 × 200–250 KB (smanjene kroz `/_next/image`) | tek kad je sekcija 800 px od ekrana |
| Mikro-filmovi | ~3 KB JS u postojećoj komponenti | sa stranom |

Nema novih biblioteka. Animira se samo `opacity`, `transform` i `filter`. Petlja
wow sekcije i smenjivanje dugmadi rade samo dok su na ekranu.

## Šta se ne radi u krugu 1

- Ostale strane (za-agencije, za-investitori, cenovnik, alati, blog, ture).
- Druge animacije vezane za skrol, osim sekcije "Od tlocrta do ture", i prelazi između strana.
- Bilo šta unutar 360° ture i u heroju-turi (Pannellum) osim fotografije pre
  učitavanja.
- Kontrolna tabla iz makete (služila je samo za izbor).

## Rizici

| Rizik | Rešenje |
|---|---|
| JS ne stigne ili pukne, pa sadržaj ostane skriven | Skrivanje zavisi od `rv-armed`, koji postavlja tek ispravno učitan kod |
| Treperenje prvog ekrana pri hidrataciji | Hero radi čistim CSS-om pri učitavanju |
| `HeroTour` zameni fotografiju turom usred B1 | B1 animira samo `.ht-still`; ako je tura već učitana, uvećanje se ne vidi i ništa se ne kvari |
| Count-up pokvari tekst koji React održava | Brojka je sopstvena klijentska komponenta, nema ručnog menjanja DOM-a |
| Linija ne prati krugove kad se promeni širina | `ResizeObserver` na `.steps-row` |

## Provera

1. `npx tsc --noEmit` i `npm run lint` bez novih grešaka.
2. U pregledaču na `/` i `/en`, na širini računara i telefona (375 px): svaki
   efekat iz tabele radi jednom, linija spaja centre krugova 01–04, cene se
   završe na tačnim iznosima (i sa promo cenom).
3. Emulacija `prefers-reduced-motion: reduce`: sve je odmah vidljivo, bez pokreta,
   cene su konačne.
4. Strana sa isključenim JS-om: sav sadržaj je vidljiv.
5. Konzola bez grešaka i bez upozorenja o hidrataciji.
6. Lighthouse na `/`: CLS = 0, a LCP nije lošiji nego pre izmene.
