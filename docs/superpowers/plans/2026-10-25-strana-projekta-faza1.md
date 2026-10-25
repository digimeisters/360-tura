# Strana projekta – faza 1 (glavna strana) – plan izvođenja

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Glavna strana projekta (`/novogradnja/[slug]`) u novom rasporedu i dizajnu v2. Zgrada i spratovi su gore, sa interaktivnijim izborom sprata i strane zgrade, a ispod su informacije i kontakt. Prazni podaci se ne prikazuju.

**Architecture:**
- `components/projekat/ProjectView.tsx` ostaje sastavljač strane, ali novi delovi idu u zasebne komponente: `ProjectFacts`, `ProjectJumpBar`, `ProjectBuying`, `ProjectContact`, `ProjectMobileBar`.
- `ProjectSelector.tsx` dobija samo ciljane dodatke: sličice strana, oblačić sprata, zajedničko isticanje lista↔fasada i prevlačenje na telefonu. Njegova logika izbora se ne prepisuje.
- `/api/contact` prima opšti upit za projekat (bez stana).
- Izgled ide kroz `PAGE_STYLES` i `selectorStyles.ts` (v2 vrednosti).

**Tech Stack:** Next.js 16 App Router (server stranica + klijentske komponente), React 19, TypeScript, CSS u string konstantama (postojeći obrazac), Supabase.

**Spec:** `docs/superpowers/specs/2026-10-25-strana-projekta-design.md` (odeljak 1, „Dizajn", „Greške").

## Global Constraints
- Ništa se ne commituje dok vlasnik ne kaže „pushuj".
- Ne menjaju se pravi podaci Garić Investa. Forma se uživo **ne šalje**, jer lokalni server piše u pravu bazu i šalje Telegram. Slanje proverava vlasnik posle deploy-a.
- Engleska strana (`/en/novogradnja/[slug]`) koristi isti `ProjectView`. Svaki novi tekst ide u `PROJECT_TEXT.sr` **i** `PROJECT_TEXT.en` (`app/lib/projectI18n.ts`).
- Ugradnja (`ProjectEmbed`) ostaje kakva je: samo birač, okolina i gradilište.
- Prazno polje se nikad ne prikazuje kao „—". Deo ili broj bez podatka se izostavlja.
- Dizajn v2:
  - fontovi: Urbanist (naslovi i brojevi), Newsreader kurziv za plavi akcenat (već učitani na sajtu);
  - akcent `#1E5AA8`;
  - jedna tamnoplava površina u vrhu (broj slobodnih);
  - kartice: bele, radijus 18px, meka senka;
  - linijske ikonice umesto emodžija.
- Nema test frameworka. „Test" = privremena strana `app/dev-projekat/page.tsx` sa izmišljenim podacima i provera pregledačem na lokalnom serveru (Jadranska, samo gledanje), uz `npx tsc --noEmit -p .` i `npx eslint <fajlovi>`.
- Privremena strana se briše u poslednjem zadatku.

## Review Focus
1. **Jadranska bez cena, opisa, roka useljenja i kontakta:**
   - u vrhu tačno 3 broja (slobodni, kvadratura, spratnost), bez „—";
   - „O projektu" bez praznog pasusa;
   - bez reda „Prodaja: …".
   Test u Zadatku 2.
2. **Projekat sa jednom slikom fasade (ili bez `project_views`):** sličice strana se ne prikazuju, a strelice rade kao danas. Test u Zadatku 3.
3. **Telefon 375 px:**
   - traka na dnu ne pokriva poslednje dugme forme (donji razmak strane);
   - ne prikazuje se u ugradnji;
   - ne prikazuje se preko otvorene kartice stana (kartica ima prednost).
   Test u Zadacima 4 i 6.
4. **Opšti upit bez stana:**
   - API ne sme da padne kad nema `unitId`;
   - kad ima `projectSlug`, upis ide u `project_inquiries` sa `unit_id = null`;
   - kad nema ni jedno, ponašanje je isto kao danas.
   Test u Zadatku 1 (pregled koda + tsc; slanje proverava vlasnik).
5. **Engleska strana:** svi novi naslovi i dugmad su na engleskom. Test u Zadatku 6 (`/en/novogradnja/jadranska-garic-invest`).

---

### Task 1: Opšti upit za projekat u `/api/contact`

**Files:**
- Modify: `app/api/contact/route.ts` (grana `fromProjectPage`, ~red 125–145)

**Interfaces:**
- Produces: telo zahteva `{ from: 'project', projectSlug: string, name, contact, message?, lang }`, bez `unitId`.
  - Ruta po `projectSlug` (regex `^[a-z0-9-]{1,120}$`) čita `projects.id`, samo objavljen projekat.
  - Upisuje `project_inquiries` sa `unit_id: null`, `unit_code: 'Opšti upit'`.
  - Telegram red: „🏢 Opšti upit za projekat – prodaja investitora ga vidi na svojoj strani".
- Postojeći upit sa `unitId` se ne menja.

- [ ] **Step 1:** Pročitaj kako `SalesBoard` / `InsightsPanel` prikazuju `unit_code`. Potvrdi da „Opšti upit" ne lomi prikaz (string, bez parsiranja). Ako nešto parsira oznaku, zabeleži ruling.
- [ ] **Step 2:** Dodaj granu `else if (fromProjectPage && typeof body.projectSlug === 'string' && …)` posle postojeće grane za `unitId`.
- [ ] **Step 3:** `npx tsc --noEmit -p .` čist; `npx eslint app/api/contact/route.ts` bez novih grešaka.

### Task 2: Vrh strane, informacije i sakrivanje praznog

**Files:**
- Create: `components/projekat/ProjectFacts.tsx`: tabla „O projektu" (investitor, spratnost, broj stanova, kvadratura, adresa, useljenje; svaka stavka samo ako postoji) i traka „Najviše slobodnih: … → Na zgradu ↑".
- Create: `components/projekat/ProjectBuying.tsx`: 4 koraka + link na `/alati/kalkulator-kredita` (u EN: `/alati/kalkulator-kredita` ostaje, tekst na engleskom).
- Create: `components/projekat/ProjectJumpBar.tsx` (klijent): traka za skok sa stavkama koje postoje. Aktivna stavka prema skrolovanju (`IntersectionObserver`, bez setState u effect-u osim kroz callback posmatrača).
- Modify: `components/projekat/ProjectView.tsx`:
  - vrh: brojevi samo kad postoje (slobodni uvek, kad ima stanova; kvadratura; spratnost iz `floors` kao „P + IV"; cena od ako ima cena; useljenje ako je upisano); naslov sa akcentom na delu posle „ – ";
  - redosled ispod birača: JumpBar → O projektu (opis + ProjectFacts) → Lokacija (`ProjectNearby`) → Gradilište (`ProjectProgress`, samo ako ima unosa) → Kupovina → Kontakt (Task 4) → traka za investitore;
  - CTA u zaglavlju postaje „Pitajte investitora" → `#kontakt`;
  - uklanja se stari red „Prodaja: telefon/mejl" (prelazi u kontakt).
- Modify: `app/lib/projectI18n.ts`: novi tekstovi (sr + en):

  | Ključ | sr |
  |---|---|
  | `aboutTitle` | „O projektu" |
  | `facts` | (nazivi polja table) |
  | `mostFree` | „Najviše slobodnih: {spratovi}" |
  | `toBuilding` | „Na zgradu" |
  | `buyTitle` | „Od izbora do ključeva" |
  | `buySteps[4]` | (4 koraka) |
  | `calcCta` | „Kalkulator kredita" |
  | `contactTitle` | „Pitajte investitora" |
  | `investorBadge` | „Strana i izbor stana: Kvadrat360 · za investitore novogradnje" |
  | `investorCta` | „Hoću ovakvu stranu za svoj projekat" |
  | `floorsShort` | „Spratnost" |
  | `jump.*` | (stavke trake za skok) |

  EN prevodi idu uz svaki ključ.
- Create (privremeno): `app/dev-projekat/page.tsx`: renderuje `ProjectFacts` i `ProjectBuying` sa izmišljenim projektom bez opisa, bez useljenja i bez cena.

- [ ] **Step 1:** Test-strana sa dva slučaja: (a) bez opisa, useljenja i cena; (b) sa svim podacima.
- [ ] **Step 2:** Potvrdi da pada (moduli ne postoje).
- [ ] **Step 3:** Napravi komponente i izmeni `ProjectView`.
- [ ] **Step 4 (provera):**
  - test-strana (a): nema stavke „Useljenje", nema „—";
  - lokalna `/novogradnja/jadranska-garic-invest`: u vrhu 3 broja, bez „—", bez praznog opisa i bez reda „Prodaja";
  - traka za skok ima O projektu · Lokacija · Kupovina · Kontakt (bez Gradilišta, jer je prazno).
  (Review Focus 1)
- [ ] **Step 5:** tsc + eslint na izmenjenim fajlovima.

### Task 3: Interaktivniji izbor sprata i strane zgrade (`ProjectSelector`)

**Files:**
- Modify: `components/projekat/ProjectSelector.tsx`:
  - pogled zgrade (~red 780–830): ispod/preko fasade **sličice strana** (`views` iste lamele, natpis iz `label` ili „1, 2, 3…"), samo kad ima ≥2 pogleda; klik postavlja `viewIdx`;
  - **oblačić** pri prelazu preko sprata na fasadi: „{sprat} · N stanova · M slobodnih · klik za osnovu" (pozicija prema mišu, `pointer-events:none`);
  - **zajedničko isticanje:** prelaz preko sprata u listi spratova (desni panel / „inv-floorchips") postavlja isti `hover` kao fasada; ostali spratovi na fasadi blede (klasa na svg grupi);
  - **telefon:** prevlačenje levo/desno po fasadi (`pointerdown/up`, prag 40px, samo horizontalno) menja pogled.
- Modify: `components/projekat/selectorStyles.ts`: stilovi za sličice, oblačić i bleđenje.
- Modify: `app/lib/projectI18n.ts`: `floorTip(n, free)`, `viewN(i)` (sr + en).

- [ ] **Step 1:** Test-strana dobija `ProjectSelector` sa izmišljenim projektom: 3 pogleda sa natpisima, 4 sprata sa oblicima (slike: `/brand/...` ili gradient data-URL), jedan slučaj sa 1 pogledom.
- [ ] **Step 2:** Potvrdi da sličica nema (staro stanje) – zabeleži.
- [ ] **Step 3:** Implementiraj sličice, oblačić, zajedničko isticanje i prevlačenje.
- [ ] **Step 4 (provera, pregledač):**
  - 3 pogleda → 3 sličice, klik menja pogled i natpis;
  - 1 pogled → nema sličica (Review Focus 2);
  - prelaz preko sprata u listi → isti sprat istaknut na fasadi, ostali bledi;
  - oblačić pokazuje tačne brojeve;
  - na 375 px prevlačenje menja pogled.
- [ ] **Step 5:** tsc + eslint.

### Task 4: Kontakt investitora i traka na telefonu

**Files:**
- Create: `components/projekat/ProjectContact.tsx` (klijent):
  - tamni blok, forma ime / telefon ili mejl / poruka / opcioni izbor stana (padajući spisak slobodnih stanova);
  - šalje na `/api/contact` iz Taska 1 (kad je stan izabran, šalje `unitId` kao `UnitInquiry`);
  - prikazuje `contact_phone` / `contact_email` ako postoje;
  - stanja: šalje se / poslato / greška, uneti podaci ostaju posle greške.
- Create: `components/projekat/ProjectMobileBar.tsx` (klijent):
  - samo ispod 900 px;
  - „☰ Lista (N)" (otvara listu kao postojeći `#lista`) i „Pitajte investitora" (→ `#kontakt`);
  - sakriva se dok je otvorena kartica stana ili ceo ekran birača (klasa na `body` ili prop iz birača; izabrati jednostavniji put i zabeležiti ruling).
- Modify: `components/projekat/ProjectView.tsx`: ubacuje `ProjectContact` (id `kontakt`) i `ProjectMobileBar`; donji razmak strane na telefonu za traku.
- Modify: `app/lib/projectI18n.ts`: tekstovi forme i trake (sr + en).

- [ ] **Step 1:** Test-strana renderuje `ProjectContact` sa 3 izmišljena stana i `ProjectMobileBar`. Fetch se **zamenjuje** u test-strani (`window.fetch` stub koji vraća uspeh/grešku), da ništa ne ode u bazu.
- [ ] **Step 2:** Potvrdi da pada (moduli ne postoje).
- [ ] **Step 3:** Implementiraj.
- [ ] **Step 4 (provera):**
  - stub uspeh → „poslato";
  - stub greška → poruka, polja zadržana;
  - telo zahteva sadrži `projectSlug` (bez stana) ili `unitId` (sa stanom);
  - na 375 px traka je vidljiva, na 1280 px nije;
  - poslednje dugme forme nije ispod trake (Review Focus 3).
- [ ] **Step 5:** tsc + eslint.

### Task 5: Izgled v2

**Files:**
- Modify: `components/projekat/ProjectView.tsx` (`PAGE_STYLES`), `components/projekat/selectorStyles.ts`, `components/projekat/ProjectNearby.tsx` (emodži → linijske ikonice po kategoriji; isti podaci).

- [ ] **Step 1:** Primeni v2 vrednosti iz Global Constraints:
  - vrh sa tamnoplavim brojem slobodnih;
  - kartice birača i panela spratova;
  - traka za skok;
  - informacioni blokovi u mreži (O projektu 7/12 + Lokacija 5/12; Kupovina 6/12 + Kontakt 6/12; na telefonu jedno ispod drugog).
- [ ] **Step 2 (provera):** snimak lokalne Jadranske na 1440 px i 375 px. Uporedi sa `public/mockup/ProjekatDizajnV2.png`: raspored, tipografija, jedna tamnoplava površina, bez emodžija.
- [ ] **Step 3:** tsc + eslint.

### Task 6: Završna provera i čišćenje

**Files:**
- Delete: `app/dev-projekat/`, `.playwright-mcp/`

- [ ] **Step 1:** Obriši privremenu stranu.
- [ ] **Step 2:** tsc čist; `npx eslint components/projekat app/api/contact/route.ts app/lib/projectI18n.ts`: bez novih grešaka u odnosu na HEAD.
- [ ] **Step 3:** Pregledač (samo gledanje, forma se ne šalje):
  - `/novogradnja/jadranska-garic-invest` na 1440 i 375 px;
  - `/en/novogradnja/jadranska-garic-invest` (Review Focus 5);
  - `/novogradnja/jadranska-garic-invest/ugradnja` (bez trake na dnu i bez kontakta);
  - konzola bez grešaka.
- [ ] **Step 4:** Javi vlasniku šta da proveri posle deploy-a (slanje opšteg upita i upita sa izabranim stanom; prodaja vidi „Opšti upit"). Čekaj „pushuj".
