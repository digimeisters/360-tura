# Strana projekta – faza 2 (ekran stana na istoj strani) – plan izvođenja

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Klik na stan na strani projekta otvara pun ekran stana na istoj strani (adresa `?stan=<oznaka>`), u dizajnu v2: mediji, prostorije, podaci, cena i kalkulator ili „na upit", upit, položaj i slični stanovi. Na telefonu je dole traka sa cenom i dugmetom za upit.

**Architecture:**
- Telo današnje strane stana (`components/projekat/UnitPage.tsx`, ruta `/novogradnja/[slug]/stan/[code]`) izdvaja se u `components/projekat/UnitScreen.tsx`.
- `UnitScreen` ima dva načina rada:
  - `mode="page"`: linkovi, za postojeću rutu i letak;
  - `mode="inline"`: dugmad koja menjaju stan u biraču.
- `ProjectSelector` na javnoj strani (ne u ugradnji) umesto male kartice i linka „Pogledajte stan" prikazuje `UnitScreen` preko cele širine birača.
- Postojeći delovi se ne pišu ponovo: `UnitMedia`, `UnitRooms`, `PaymentCalculator`, `UnitInquiry`.

**Tech Stack:** Next.js 16 App Router, React 19 klijentske komponente, TypeScript, CSS u string konstantama.

**Spec:** `docs/superpowers/specs/2026-10-25-strana-projekta-design.md`, odeljak 2.

## Global Constraints
- Ništa se ne commituje dok vlasnik ne kaže „pushuj". Faza 1 i faza 2 idu zajedno ili odvojeno, kako vlasnik kaže.
- Ne šalju se pravi upiti. Forma se proverava samo na test-strani sa zamenjenim `fetch`.
- Postojeća strana stana `/novogradnja/[slug]/stan/[code]` i letak `/letak` moraju da rade kao i pre (isti tekst i isti delovi, novi izgled).
- Ugradnja (`embedded`) i pregled pre objave (`letakBase === null`) zadržavaju današnju malu karticu stana.
- Prazno polje se ne prikazuje kao „—". Činjenica bez podatka se izostavlja.
- Prodat stan:
  - bez kalkulatora i bez upita;
  - slični slobodni stanovi na vrhu desne kolone;
  - otvaranje se i dalje broji (postojeći `UnitInquiry trackView`).
- Rezervisan stan zadržava današnje „Javite mi ako se oslobodi" (`t.notifyMe`).
- Svi novi tekstovi na sr i en (`app/lib/projectI18n.ts`).
- Dizajn v2 kao u `public/mockup/StanDizajnV2.png`:
  - tamnoplava kartica cene;
  - prostorije sa linijskim ikonicama;
  - podaci kao mala tabla;
  - akcent u naslovu („Stan 12 · *Trosoban*").
- Provera:
  - privremena `app/dev-stan/` sa izmišljenim stanovima (cena / bez cene / prodat / rezervisan, prostorije);
  - lokalna Jadranska, samo gledanje;
  - tsc + eslint.

## Review Focus
1. `?stan=` sa nepostojećom oznakom → strana se otvara normalno, bez ekrana stana i bez greške. Test u Zadatku 2.
2. Dugme „nazad" u pregledaču posle otvaranja stana zatvara ekran stana i vraća na zgradu/sprat, a ne izlazi sa strane. Test u Zadatku 2.
3. Strana `/stan/[code]` posle izdvajanja ima iste delove kao pre: mrvice, ‹ ›, mediji, cena, podaci, prostorije, PDF, kalkulator/upit, slični. Test u Zadatku 1.
4. Telefon: traka stana zamenjuje traku strane (ne dve trake jedna preko druge); dugme skroluje do forme. Test u Zadatku 3.
5. Stan bez cene, osnove i prostorija (Jadranska danas): ekran ne izgleda polomljeno — nema praznih kartica, nema „—". Test u Zadatku 3.

---

### Task 1: Izdvajanje `UnitScreen` iz `UnitPage`

**Files:**
- Create: `components/projekat/UnitScreen.tsx` (klijent ili deljena; bez serverskih importa)
- Modify: `components/projekat/UnitPage.tsx` (zadržava nav, footer, `SiteStylesheets`, `SiteTracker`; telo je `<UnitScreen mode="page" …/>`)

**Interfaces:**
- Produces:
```ts
export type UnitScreenData = Pick<ProjectPageData, 'units' | 'floors' | 'buildings' | 'demoMedia'> & {
  project: { slug: string; title: string; city: string | null };
};
export default function UnitScreen(props: {
  data: UnitScreenData;
  unit: SelectorUnit;
  floor: SelectorFloor | null;
  lang: ProjectLang;
  mode: 'page' | 'inline';
  /** inline: izbor drugog stana (‹ ›, slični) i povratak na sprat. */
  onPick?: (unitId: string) => void;
  onBack?: () => void;
  embedded?: boolean;
}): JSX.Element
```
- Stilovi strane stana (`PAGE_STYLES` iz `UnitPage`) prelaze u `UnitScreen` kao `UNIT_SCREEN_STYLES` (renderuje ih sam ekran), da važe i na strani projekta.

- [ ] **Step 1:** Snimi tekst današnje `/novogradnja/jadranska-garic-invest/stan/1` (curl → tekst bez tagova) u scratchpad kao „pre".
- [ ] **Step 2:** Izdvoj komponentu bez promene izgleda i teksta.
- [ ] **Step 3:** Snimi „posle" i uporedi. Razlika sme biti samo u razmacima. (Review Focus 3)
- [ ] **Step 4:** tsc + eslint.

### Task 2: Ekran stana na strani projekta + `?stan=`

**Files:**
- Modify: `components/projekat/ProjectSelector.tsx`:
  - kad je `unit` izabran, nije `embedded` i postoji `letakBase` → umesto rešetke birača (zgrada + panel) prikazuje se `<UnitScreen mode="inline" …/>`;
  - `onBack` = povratak na sprat (postojeći `pickUnit(null)` / `pickFloor(null)` kao danas);
  - `onPick` = izbor drugog stana (postojeći `pickUnit`, koji postavlja i sprat);
  - **adresa:** pri otvaranju stana `history.pushState` sa `?stan=<oznaka>` (hash se zadržava);
  - pri zatvaranju (`onBack`) se vraća adresa bez `stan`;
  - `popstate` čita `?stan=` i otvara ili zatvara ekran;
  - pri učitavanju strane `?stan=<oznaka>` otvara taj stan (ako postoji);
  - posle otvaranja stana birač se skroluje na vrh ekrana stana.
- Create (privremeno): `app/dev-stan/page.tsx` + `Client.tsx`: `ProjectSelector` sa izmišljenim projektom (1 pogled, 2 sprata, stanovi: sa cenom i prostorijama, bez cene, prodat, rezervisan), `letakBase` postavljen.

- [ ] **Step 1:** Test-strana; potvrdi da klik na stan danas pokazuje malu karticu i link „Pogledajte stan" (staro stanje).
- [ ] **Step 2:** Implementiraj.
- [ ] **Step 3 (provera):**
  - klik na stan → ekran stana, adresa `?stan=3`;
  - ‹ › i slični menjaju stan i adresu;
  - „nazad" u pregledaču → zgrada/sprat (Review Focus 2);
  - učitavanje `?stan=3` → otvoren stan 3;
  - `?stan=999` → normalna strana (Review Focus 1);
  - ugradnja (`embedded`) → stara kartica.
- [ ] **Step 4:** tsc + eslint.

### Task 3: Izgled v2 ekrana stana i traka na telefonu

**Files:**
- Modify: `components/projekat/UnitScreen.tsx`:
  - zaglavlje sa akcentom na strukturi;
  - oznake podataka samo kad postoje;
  - tamnoplava kartica cene (cena, €/m²) ili kartica „Na upit";
  - tabla podataka (površina, terasa, sprat, orijentacija; samo postojeće; bez „—");
  - „Gde je stan u zgradi" (mala šema: spratovi kao trake sa označenim spratom, stanovi sprata kao kutije sa označenim stanom, iz `floors` / `units`);
  - slični slobodni do 3: ista struktura, najbliža kvadratura (spec), a ako ima cena, najbliža cena;
  - prodat stan: slični na vrhu desne kolone.
- Modify: `components/projekat/UnitMedia.tsx` (`UnitRooms`): linijska ikonica po vrsti prostorije iz naziva. Ključne reči:

  | Ikonica | Reči |
  |---|---|
  | krevet | soba, spavać |
  | kada | kupatilo, wc, toalet |
  | kauč | dnevn, kuhinj, trpezar |
  | vrata | hodnik, ulaz, predsob |
  | kutija | ostava, špajz, garderob |
  | sunce | teras, lođ, balkon |
  | kvadrat | ostalo |

- Create u `UnitScreen` (samo `mode="inline"`): traka na dnu ispod 900 px sa cenom (ili „Cena na upit") i dugmetom „Pošaljite upit" / „Zatražite cenu", koje skroluje do forme. `ProjectMobileBar` se sklanja kad postoji traka stana (`body:has(.usb) .pmb{display:none}` u `selectorStyles.ts`).
- Modify: `app/lib/projectI18n.ts`: `whereTitle`, `floorPosition`, `askCta`, `askPriceCta`, `onRequestBar` (sr + en).

- [ ] **Step 1 (provera na test-strani):**
  - stan sa cenom → tamna kartica, kalkulator, upit;
  - bez cene → „Na upit" i forma;
  - prodat → bez kalkulatora i upita, slični gore;
  - rezervisan → „Javite mi…";
  - prostorije imaju ikonice;
  - na 375 px jedna traka (stana), dugme skroluje do forme (Review Focus 4).
- [ ] **Step 2 (provera):** lokalna Jadranska `?stan=1` — bez praznih kartica i bez „—" (Review Focus 5); `/stan/1` i dalje radi.
- [ ] **Step 3:** tsc + eslint.

### Task 4: Završna provera i čišćenje
- [ ] **Step 1:** Obriši `app/dev-stan/`, `.playwright-mcp/`.
- [ ] **Step 2:** tsc čist; eslint bez novih grešaka u odnosu na HEAD.
- [ ] **Step 3 (pregledač, samo gledanje):**
  - Jadranska `?stan=1` na 1440 i 375 px;
  - `/en/…?stan=1`;
  - `/stan/1` i `/stan/1/letak`;
  - ugradnja;
  - konzola bez grešaka.
- [ ] **Step 4:** Nezavisni pregled celog posla, ispravke, pa poruka vlasniku. Čekati „pushuj".
