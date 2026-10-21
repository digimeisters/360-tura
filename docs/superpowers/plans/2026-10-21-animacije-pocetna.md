# Animacije na početnoj (krug 1): plan izvedbe

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Efekti iz odobrene makete (tempo Srednje, "Kako radimo" kao Linija) i wow sekcija "Od tlocrta do ture" ugrađeni na `/` i `/en`.

**Architecture:** Serverski markup dobija atribute `data-reveal`. Jedna klijentska komponenta `SiteReveal` (renderuje `null`, kao `CardSpotlight`) postavlja `html.rv-armed` i preko jednog IntersectionObserver-a dodaje `.is-in`. Sav izgled je u `app/lib/siteStyles.ts`. Hero radi čistim CSS-om pri učitavanju. Brojke idu kroz klijentsku `CountUp`, koja na serveru ispisuje konačnu vrednost.

**Tech Stack:** Next.js 16.3.5 (App Router), React 19.2, TypeScript, CSS u template stringu (`SITE_STYLES`).

**Spec:** `docs/superpowers/specs/2026-10-21-animacije-sajta-design.md`

## Global Constraints

- Nema novih npm zavisnosti.
- Tempo: `--rv-dist: 18px; --rv-dur: .8s; --rv-step: 90ms; --rv-ease: cubic-bezier(.22,.8,.24,1)`. Razmak koraka u "Kako radimo": `--sg: calc(var(--rv-step) * 6)` (540 ms).
- Plava boja linije i krugova: `#1e5aa8`. Siva vodilica: `#dbe4f0`.
- Skrivanje sadržaja važi samo pod `html.rv-armed`. Bez JS-a, pre hidratacije i uz `prefers-reduced-motion: reduce` sve je vidljivo.
- Animiraju se samo `opacity`, `transform` i `filter`.
- Atributi `data-reveal` su bez efekta na stranama koje ne montiraju `SiteReveal`.
- Komentari na srpskom, u stilu okolnog koda. Ne komitovati i ne pushovati dok vlasnik ne kaže "pushuj" (zato nema koraka za commit).
- Pre pisanja klijentskog koda pročitati relevantan vodič u `node_modules/next/dist/docs/` (AGENTS.md).
- Projekat nema test runner i ne dodajemo ga. Provera ide kroz `npx tsc --noEmit`, `npm run lint` i skriptovane provere u pregledaču (preview `kvadrat360-dev`, `javascript_tool`).

## Review Focus

1. **Navigacija kroz `Link` sa početne i nazad:** `rv-armed` mora da se skine pri demontiranju, inače druga strana ostane skrivena. Provera u Task 2, korak 4.
2. **Promo cena (`usePromoActive` menja iznos posle hidratacije):** CountUp mora da završi na trenutnoj vrednosti, ne na onoj sa servera. Provera u Task 3, korak 3.
3. **Element već vidljiv pri montiranju (osvežavanje usred strane):** mora da dobije `.is-in` odmah, a ne da ostane skriven. Provera u Task 2, korak 4.
4. **Širina telefona 375 px:** linija mora da spaja centre krugova i posle promene širine. Provera u Task 4, korak 3.
5. **Smanjeni pokreti:** bez skrivanja, cene odmah konačne. Provera u Task 5.

---

### Task 1: CSS sistem i hero pri učitavanju

**Files:**
- Modify: `app/lib/siteStyles.ts` (novi blok na kraju `SITE_STYLES`, pre zatvarajućeg `` ` ``)

**Interfaces:**
- Produces: klase i atributi koje koriste Task 2–4: `html.rv-armed`, `[data-reveal="up"|"blur"|"scale"|"list"]`, `.is-in`, `--i` (indeks u grupi), `[data-reveal-steps]` + `.is-in` na redu, `.rv-steps-track`, `.rv-steps-line`, `.btn-primary.is-shone`.

- [ ] **Step 1: Dodati blok "Animacije (krug 1)" u `SITE_STYLES`**
  - Promenljive tempa na `:root` (vrednosti iz Global Constraints).
  - `html.rv-armed [data-reveal]:not(.is-in)`: `opacity:0`, `transform:translateY(var(--rv-dist))`. Za `blur` dodati `filter:blur(8px)`, za `scale` `translateY(..) scale(.965)`, za `list` `translateX(calc(var(--rv-dist) * -1))`.
  - `[data-reveal]`: tranzicija `opacity, transform, filter` u trajanju `var(--rv-dur)` sa `var(--rv-ease)`, uz kašnjenje `calc(var(--i,0) * var(--rv-step))`.
  - Hero, samo pri učitavanju (`@media (prefers-reduced-motion: no-preference)`): `@keyframes rv-hero-in` (od blur 8px + translateY 18px + opacity 0 do kraja). Primeniti na `.ht-copy h1` (0 ms), `.ht-copy .lede` (90 ms), `.hero-ctas` (180 ms) i `.ht-facts li:nth-child(n)` (270 + 90·(n−1) ms), sa `animation-fill-mode: both`. Za `.ht-still` napraviti `@keyframes rv-hero-zoom` (scale 1.07 → 1, 2,4 s, `cubic-bezier(.2,.7,.2,1)`).
  - B2a: `[data-reveal-steps]{position:relative;--sg:…}`, `.steps-row .step .num{position:relative;z-index:1}`. `.rv-steps-track` i `.rv-steps-line`: `position:absolute;width:2px;border-radius:2px;pointer-events:none`. Linija: `transform:scaleY(0);transform-origin:top`, tranzicija `transform calc(var(--sg) * 3) cubic-bezier(.45,0,.55,1) .15s`. Na `[data-reveal-steps].is-in` linija ide na `scaleY(1)`. Pod `html.rv-armed`, za korak koji još nije `.is-in`: `.num{background:#fff;color:#1e5aa8;box-shadow:inset 0 0 0 2px #1e5aa8}`. Tranzicija boje kreće sa `calc(var(--i) * var(--sg) + .15s)`. Kartice koraka imaju kašnjenje `calc(var(--i) * var(--sg))` umesto `--rv-step`.
  - B4: `:root{interpolate-size:allow-keywords}` i `details.faq-item::details-content, details.vol-details::details-content{height:0;overflow:clip;transition:height .45s var(--rv-ease),content-visibility .45s allow-discrete}`, a `[open]::details-content{height:auto}`.
  - C1: `html.rv-armed .btn-primary{position:relative;overflow:hidden}` i `::after` sa gradijentom `linear-gradient(105deg,transparent 35%,rgba(255,255,255,.45) 50%,transparent 65%)`, `translateX(-120%)`. `.is-shone::after` ide na `translateX(120%)` za 1,1 s sa kašnjenjem .35 s. Pre toga proveriti da `.btn-primary` već nema svoj `::after`; ako ima, koristiti `::before`.
  - Hover: `@media (hover:hover)` na `.tour-card, .card.feat, .card.svc`: `translateY(-4px)` uz senku `0 14px 34px -18px rgba(15,23,42,.35)`. Ne sme da pregazi postojeći `.tour-card::after` reflektor.

- [ ] **Step 2: Provera**
  Run: `npx tsc --noEmit` → bez grešaka. Otvoriti `/` u preview-u: hero naslov izroni iz zamućenja, fotografija se približi, a ostatak strane je **vidljiv** (bez `SiteReveal` ništa se ne skriva).

---

### Task 2: `SiteReveal` i atributi na početnoj

**Files:**
- Create: `components/SiteReveal.tsx`
- Modify: `app/HomePage.tsx` (montiranje pored `<CardSpotlight />` na liniji 102; atributi u sekcijama 183–420)
- Modify: `components/TourModulesShowcase.tsx:124` (`data-reveal="scale"` na `.mods-phone`)
- Modify: `components/Pricing.tsx` (`data-reveal="scale"` na svaku karticu paketa u `.price-grid`)

**Interfaces:**
- Consumes: CSS iz Task 1.
- Produces: `export default function SiteReveal(): null`. Ostavlja `html.rv-armed` dok je montiran. Task 3 čita `document.documentElement.classList.contains('rv-armed')`. Task 4 proširuje isti fajl.

- [ ] **Step 1: Napisati `components/SiteReveal.tsx`** (`'use client'`, `useEffect`)
  - Ako `matchMedia('(prefers-reduced-motion: reduce)').matches`, odmah izaći.
  - Svakom `[data-reveal]` postaviti `--i` = indeks među braćom sa `[data-reveal]` u istom roditelju.
  - Postaviti `rv-armed` na `<html>`, pa pokrenuti `IntersectionObserver` (`threshold: .15`, `rootMargin: '0px 0px -8% 0px'`). Na ulazak: dodati `is-in` (za `.btn-primary`: `is-shone`) i `unobserve`. Posmatra `[data-reveal]` van `[data-reveal-steps]` i sve `.btn-primary`.
  - Cleanup: `disconnect`, pa skinuti `rv-armed`, `is-in` i `is-shone`.

- [ ] **Step 2: Atributi u `app/HomePage.tsx`**
  - `data-reveal="up"`: `.section-head .eyebrow` i `.note`, svaki `TourCard` omotač (staviti na element koji je dete `.tours-grid`; ako `TourCard` renderuje koren direktno, dodati prop `reveal?: boolean` u `components/TourCard.tsx`), `.db-teaser`, `.card.feat`, `.mid-cta-text`, `.mid-cta-actions`, `.deliver-card`, `.card.svc`, `.faq-item`, deca `.contact .wrap`.
  - `data-reveal="blur"`: svaki `.section-head h2`.
  - `data-reveal="list"`: `li` u `.deliver-list`.
  - Ne stavljati ništa u `.hero-tour` (to radi Task 1 kroz CSS).

- [ ] **Step 3: Montirati `<SiteReveal />`** odmah posle `<CardSpotlight />`.

- [ ] **Step 4: Provera u pregledaču** (`/`, širina računara)
  - Posle skrola do `#benefiti` i čekanja od 1,5 s: `document.querySelectorAll('#benefiti [data-reveal]:not(.is-in)').length === 0`.
  - Pri učitavanju: `html.rv-armed` postoji, a sekcije ispod prvog ekrana imaju `opacity` 0.
  - Osvežiti stranu sa `#cenovnik` u adresi: kartice paketa dobiju `is-in` bez skrola.
  - Klik na `Link` ka `/ture`: `document.documentElement.classList.contains('rv-armed') === false` i kartice na `/ture` su vidljive.
  - `read_console_messages` bez grešaka i bez upozorenja o hidrataciji. `npx tsc --noEmit` i `npm run lint` čisti.

---

### Task 3: `CountUp` za cene i otvaranja

**Files:**
- Create: `components/CountUp.tsx`
- Modify: `components/PromoPrice.tsx:119` (`<b>` u `PlanPrice`)
- Modify: `app/lib/homeCopy.ts:134, 242, 478` (`opens` → `opensSuffix: string`: `'+ otvaranja tura'` / `'+ tour views'`)
- Modify: `app/HomePage.tsx:178`

**Interfaces:**
- Consumes: `rv-armed` iz Task 2; `formatAmount(amount: number, lang: PriceLang): string` iz `app/lib/pricing.ts:251`.
- Produces: `export default function CountUp(props: { value: number; lang: PriceLang; kind: 'amount' | 'count' }): JSX.Element`. `amount` se formatira kroz `formatAmount`, a `count` kroz `toLocaleString(lang === 'sr' ? 'sr-RS' : 'en-US')`.

- [ ] **Step 1: Napisati `CountUp`**
  Renderuje `<span aria-label={konačan tekst}>{tekst}</span>`. U `useEffect` zavisnom od `value`: ako na `<html>` nema `rv-armed` ili je `value < 50`, ništa ne radi. Inače čeka da span uđe u ekran (sopstveni IntersectionObserver, ista podešavanja kao Task 2), pa broji od 0 do `value` za 1200 ms (`1 - (1-k)^3`) preko `requestAnimationFrame`, kroz state. Ako se `value` promeni usred brojanja (promo), animacija završava na novoj vrednosti. Cleanup otkazuje rAF i observer.

- [ ] **Step 2: Ugraditi**
  - `PlanPrice`: `<b><CountUp value={active ? promo : regular} lang={lang} kind="amount" /></b>`. `price-was` i ostali iznosi ostaju kakvi jesu.
  - Hero: `<li><CountUp value={openCount} lang={lang} kind="count" />{hero.opensSuffix}</li>`.

- [ ] **Step 3: Provera**
  - Kad je JS isključen, HTML strane `/` sadrži `8.500 din.` i `10.500 din.` (`curl -s localhost:3000/ | grep -o '8.500 din.'`).
  - Posle skrola do `#cenovnik` i čekanja od 1,6 s: tekst u `.price-value b` je `8.500 din.` i `10.500 din.` (ili tačna promo cena ako je promocija aktivna; uporediti sa `displayPackagePrice`).
  - Na `/en` hero kaže `N+ tour views`, a cena je u evrima.
  - Na `/za-agencije` (bez `SiteReveal`) cene stoje odmah, bez brojanja.
  - `npx tsc --noEmit` čist.

---

### Task 4: Linija u "Kako radimo" (B2a)

**Files:**
- Modify: `components/SiteReveal.tsx`
- Modify: `app/HomePage.tsx:310` (`data-reveal-steps` na `.steps-row`; `data-reveal="up"` na svaki `.card.step`)

**Interfaces:**
- Consumes: CSS klase iz Task 1, observer iz Task 2.
- Produces: ništa novo za druge zadatke.

- [ ] **Step 1: Proširiti `SiteReveal`**
  Za `[data-reveal-steps]`: ubaciti na početak dva `div`-a (`rv-steps-track`, `rv-steps-line`) sa `aria-hidden="true"`. Funkcija `place()` računa `left = centar prvog .num − 1px` i `top = centar prvog .num`, relativno na red, a `height = razmak između centara prvog i poslednjeg .num`. Poziva se odmah i na `ResizeObserver(red)`. Red posmatra isti observer: na ulazak dodati `is-in` redu i svim `.step` u njemu. Cleanup uklanja ubačene `div`-ove.

- [ ] **Step 2: Atributi u `HomePage.tsx`** (vidi Files).

- [ ] **Step 3: Provera** na 1280×800 i 375×812
  - Posle skrola do `#kako-radimo` i čekanja od 2,5 s: `getComputedStyle(.rv-steps-line).transform` je `none` ili matrica sa `scaleY` 1, a sva četiri `.num` imaju `background-color` `rgb(30, 90, 168)`.
  - Centar linije se poklapa sa centrom svakog `.num` u granici od ±1 px (proveriti preko `getBoundingClientRect`), na obe širine i posle promene širine.
  - Na 600 ms od ulaska: linija je na pola puta, prvi krug je pun, a četvrti je beo (snimak ekrana za vlasnika).

---

### Task 5: Sekcija "Od tlocrta do ture": podaci i statičan prikaz

**Files:**
- Create: `app/lib/tourStory.ts` (konfiguracija + loader, samo server)
- Create: `components/TourStory.tsx` (serverska: markup sekcije)
- Modify: `app/lib/homeCopy.ts` (tip `story` + SR i EN tekst)
- Modify: `app/HomePage.tsx` (sekcija `id="od-tlocrta"` posle `#u-turi`, linija ~273)

**Interfaces:**
- Produces:
  ```ts
  export type StoryData = {
    slug: string;
    planSvg: string;                 // sadržaj floorplan-schematic.svg, bez <?xml?>
    planBox: [number, number, number, number]; // viewBox iz SVG-a
    cams: { roomId: string; x: number; y: number }[]; // u koordinatama viewBox-a
    a: { roomId: string; title: string; panorama: string; startYaw: number; heading: number | null };
    b: { roomId: string; title: string; panorama: string; startYaw: number; heading: number | null; subtitles: Record<'sr'|'en'|'de'|'ru', string> };
    hotspot: { yaw: number; pitch: number; title: string; text: string };
    door: { yaw: number; pitch: number; label: string };
  };
  export async function getStoryData(): Promise<StoryData | null>;
  ```
- Konfiguracija u `tourStory.ts`: `STORY = { slug: 'stan-gasse-1', roomA: '4998dd2b-00f4-4368-acec-046221e58ec1', roomB: '368699bf-3674-42aa-9b6a-e98327d57bc4', hotspotTitle: 'Ugaona Garnitura' }`.
- `homeCopy` dobija `story: { eyebrow: string; steps: { kicker: string; title: string; text: string }[]; cta: string; tourName: string }`. `steps` ima tačno 8 stavki, redom kao tabela kadrova u specu. SR tekst je preuzet iz makete; EN napisati u istom tonu. Akcenat se piše `*…*` (kao ostali naslovi, kroz `accent`).

- [ ] **Step 1: `getStoryData`.** Isti Supabase klijent i obrazac keširanja kao `getShowcaseTours`. Čita turu i sve njene sobe. SVG se dohvata sa `tours.floorplan_url`, a `planBox` čita iz `viewBox`. `cams` = `floorplan_x/y` (procenti) preračunati u viewBox. `startYaw` = `establish_i18n.fromYaw`. `heading` = `planHeadingFor(roomId, rooms, planBox[2] / planBox[3])`. Hotspot je `type:'info'` sa naslovom `hotspotTitle` u sobi A; tekst je prva rečenica opisa, sa višestrukim razmacima svedenim na jedan. `door` je `type:'navigation'` iz A sa `targetRoomId === roomB`. `subtitles` = `establish_i18n.text_i18n` sobe B. Panorama je `panorama_url_mobile`. Ako bilo šta nedostaje, vraća `null` i sekcija se ne prikazuje (uz `reportError`, kao ostali loaderi).
- [ ] **Step 2: `TourStory` (serverska).** Props `{ data: StoryData; copy: HomeCopy['story']; lang: HomeLang }`. Renderuje `<section id="od-tlocrta" class="story">` sa `.story-stage` (tlocrt kroz `dangerouslySetInnerHTML`, jer je SVG naš i sa našeg CDN-a), listom koraka (`ol`, svih 8, vidljivi) i dugmetom ka `tourHref(slug)` sa `data-track="cta:story_tour"`. Prazni kontejneri za panorame i UI (hotspot, kartica, strelica, mali tlocrt, titl) imaju `hidden`. Klijentsku komponentu iz Task 6 montira na kraju, a podatke joj prosleđuje kao props.
- [ ] **Step 3: CSS u `siteStyles.ts`.** Statičan raspored: tlocrt levo, koraci desno, a na ≤760 px jedno ispod drugog. Stilovi elemenata scene (hotspot, kartica, strelica, mini, titl, talasi) prenose se iz makete, bez kontrolne trake makete.
- [ ] **Step 3b: Smanjene panorame.** U `next.config.ts` dodati `remotePatterns` stavku `{ protocol: 'https', hostname: 'cdn.kvadrat360.com', pathname: '/*-panorama-m.webp', search: '' }`. `getStoryData` vraća po dve adrese za svaku panoramu, kroz `getImageProps` (`width` 2048 za telefon i 3840 za računar, `quality` 75). `StoryData.a/b.panorama` postaje `{ phone: string; desktop: string }`, a player bira po `innerWidth <= 760`. Provera: `curl -sI` na obe adrese daje `content-type: image/webp`, a `content-length` je ispod 300 KB.
- [ ] **Step 4: Provera.** `npx tsc --noEmit` čist. `curl -s localhost:3000/ | grep -c 'od-tlocrta'` = 1, a HTML sadrži `Ugaona garnitura`, 8 koraka i `/tour/stan-gasse-1`. Na `/en` je engleski tekst. Bez JS-a (`curl`) sekcija je čitljiva lista + tlocrt.

---

### Task 6: Sekcija "Od tlocrta do ture": animacija

**Files:**
- Create: `components/TourStoryPlayer.tsx` (`'use client'`)
- Modify: `app/lib/siteStyles.ts` (stanje `.story.is-armed`)

**Interfaces:**
- Consumes: `StoryData` i markup iz Task 5.
- Produces: `export default function TourStoryPlayer({ data }: { data: StoryData }): null`.

- [ ] **Step 1: Naoružavanje.** Ako je uključeno `prefers-reduced-motion: reduce`, ne radi ništa. Inače dodaje `.is-armed` na sekciju: CSS tada daje visinu 640vh (≤760 px: 520vh), scena postaje `sticky`, lista koraka postaje jedan po jedan natpis, a skriveni UI se otkriva. Zidovima tlocrta (`rect.room`) postavlja `pathLength=1` i `stroke-dasharray`. Tačke kamera crta u SVG. Cleanup vraća sve kako je bilo.
- [ ] **Step 2: Petlja.** `IntersectionObserver` pali i gasi `scroll` slušaoca. `render(p)` se poziva kroz `requestAnimationFrame`. Granice kadrova, trajanja, uvećanje 1→6, proračun pozicije tačke (yaw, pitch) na ravnoj panorami (`background-size: auto 165%`, `background-position-y: 52%`) i okreti pogleda prepisuju se iz `public/mockup/TlocrtTura.html` (funkcije `seg`, `ease`, `geo`, `look`, `place`). Vrednosti ne izmišljati: maketa je odobrena referenca. Uglovi i tekstovi dolaze iz `data`, ne iz konstanti makete. Panorame se postavljaju kao `backgroundImage` kad je sekcija 800 px od ekrana.
- [ ] **Step 3: Provera u pregledaču** (`/`, 1280×800 i 375×812): skrol na `p` = .27, .54, .635, .80, .95, sa snimkom ekrana na svakom. Očekivano:
  - na .54 tačka "i" je na garnituri, a kartica je otvorena;
  - na .635 je strelica "Pređite u spavaću sobu" na vratima;
  - na .80 se titl smenjuje kroz 4 jezika, a na telefonu mali tlocrt nije vidljiv;
  - na .95 je dugme vidljivo.

  Konzola mora biti bez grešaka. Uz emulaciju smanjenih pokreta sekcija je statična. Posle prelaska na `/ture` i nazad sekcija radi ponovo, bez dupliranih tačaka u SVG-u.

---

### Task 7: "U samoj turi": mikro-filmovi u telefonu

**Files:**
- Modify: `components/TourModulesShowcase.tsx` (`AUTO_MS`, `STYLES`, JSX telefona)
- Modify: `app/lib/homeCopy.ts` (`ModulesCopy.preview` dobija `hiddenNumber: string; form: { name: [string, string]; phone: [string, string]; slot: [string, string] }; send: string; sending: string; sent: string; planTip: string`, na SR i EN)

**Interfaces:**
- Consumes: ništa iz ranijih zadataka.
- Produces: ništa za druge zadatke.

- [ ] **Step 1: Tekst.** SR vrednosti uzeti iz makete `public/mockup/DugmadTura.html`: "Kućni broj skriven", Ime/Jelena, Telefon/064 123 4567, Termin/subota, 11:00, "Pošalji zahtev", "Šaljem…", "Zahtev poslat ✓", "Dodir na tačku vodi u tu prostoriju." EN napisati u istom smislu.
- [ ] **Step 2: Filmovi.** `AUTO_MS = 4600`. Za svaki modul film počinje u `useEffect` zavisnom od `active`, a koraci vremena idu kroz state (npr. `phase: number`) i `setTimeout`-ove koje cleanup gasi. Ništa se ne radi ručnim menjanjem DOM-a. Trajanja i kašnjenja prepisati iz funkcija `film()` i `sheetHtml()` makete (Info: brojanje 900 ms, redovi na 520 + 130·i ms; Pitanja: dodir 700 ms, kucanje od 1350 ms po 32 ms/znak; Plan: koraci na 500 + 700·i ms, redom sobe 3, 2, 3, 4, 1; Kontakt: 800 / 1000 / 1350 / 1850 / 2700 / 3200 ms). Brojanje cene koristi `CountUp` iz Task 3 samo ako se uklapa bez menjanja njegovog interfejsa; inače lokalni rAF. CSS ključni kadrovi (`sheetUp`, `inUp`, `okPop`, `rip`, `dot`, `blink`, `mapPan`, `pinDrop`, `areaGrow`) idu u `STYLES`, sa `@media (prefers-reduced-motion: reduce)` koji ih gasi. Uz smanjene pokrete telefon odmah pokazuje konačno stanje (otvoren odgovor, popunjena forma, "Zahtev poslat ✓").
- [ ] **Step 3: Provera** (`/`, 1280 i 375 px). Posle 1,5 s cena je `98.000 €`. Na "Pitanja" posle 3 s odgovor je ceo. Klik na "Kontakt" posle 3,5 s daje dugme "Zahtev poslat ✓" i tri popunjena polja. Klik zaustavlja smenjivanje. Uz emulaciju smanjenih pokreta stanja su konačna. `npx tsc --noEmit` i lint čisti, konzola bez grešaka i bez upozorenja o hidrataciji.

---

### Task 8: Završna provera

- [ ] **Step 1:** `npx tsc --noEmit` i `npm run lint` bez novih grešaka.
- [ ] **Step 2:** Emulirati `prefers-reduced-motion: reduce` (kroz `javascript_tool`, `matchMedia` override pre učitavanja, ili DevTools emulaciju ako je dostupna). Očekivano: nema `rv-armed`, sav sadržaj je vidljiv, cene su konačne.
- [ ] **Step 3:** Proći celu `/` i `/en` na 1280 i na 375 px: svaki efekat iz tabele u specu radi jednom, bez grešaka u konzoli.
- [ ] **Step 4:** `npm run build`, pa `kvadrat360-prod` preview i Lighthouse (ako je dostupan) ili `PerformanceObserver` za `layout-shift`. Očekivano: CLS 0.
- [ ] **Step 5:** Snimci ekrana za vlasnika (hero, Kako radimo usred animacije, cenovnik, "Od tlocrta do ture" na .54 i .80). Makete u `public/mockup/` (Animacije, TlocrtTura, TlocrtTuraTelefon, DugmadTura) obrisati tek kad vlasnik kaže.
