# Admin okvir, strana Ture i strana Agencije — plan izvođenja

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jedan admin okvir (meni levo, jedna prijava) za sve `/admin` strane, pregledna strana Ture (lista + panel sa formom + meni „⋯") i nova strana Agencije.

**Architecture:** `app/admin/layout.tsx` (server, zadržava noindex) obavija strane klijentskim `components/admin/AdminShell.tsx`, koji drži Supabase sesiju i ekran za prijavu; strane gube svoju prijavu. Strana Ture se deli na `page.tsx` (lista), `TourFormDrawer.tsx` (forma u 4 kartice) i `TourRowMenu.tsx` („⋯"). Agencije koriste postojeći `GET /api/admin/tours` (`agencyReports`).

**Tech Stack:** Next.js 16 App Router (pročitati `node_modules/next/dist/docs/` za `redirect` i layout pre koda), React 19, TypeScript, Supabase JS, inline stilovi + `FORM` / `formBtnStyle` / `FormThemeStyle` iz `app/lib/formTheme.tsx`.

**Spec:** `docs/superpowers/specs/2026-10-24-admin-okvir-design.md`

## Global Constraints

- Ništa se ne commituje ni ne pushuje dok vlasnik ne napiše „pushuj"; tada jedan commit sa specom, planom i kodom (bez `.superpowers/`, `docs/cowork/`, `eslint.config.mjs`, `.github/`).
- Projekat nema test framework. „Test" u ovom planu = privremena strana `app/dev-admin/page.tsx` sa izmišljenim podacima + Playwright (`mcp__plugin_playwright_playwright__*`) na lokalnom dev serveru, plus `npx tsc --noEmit -p .` i `npx eslint <fajlovi>`. Privremena strana se briše u poslednjem zadatku.
- Lint osnovica: `app/admin/ture/page.tsx` ima 2 postojeće greške (set-state-in-effect, `<a>` ka `/admin/projekti/`); ne sme ih biti više nigde.
- Tekst u UI na srpskom (latinica), kao u mockupima. Nazivi u meniju tačno: „Ture", „Agencije", „Analitika", „Novogradnja", „Odjava".
- Meni levo: širina 210 px; uski meni u editorima ~56 px; ispod 900 px gornja traka sa dugmetom „Meni".
- Nijedna postojeća radnja nad turom ne nestaje; API rute se ne menjaju.
- Pravi admin sa nalogom vlasnika se ne otvara (Claude se ne prijavljuje); to proverava vlasnik posle deploy-a.

## Review Focus

1. Meni „⋯" u poslednjim redovima tabele: kartica tabele ima `overflowX: auto`, pa bi padajući meni bio odsečen — meni se crta preko `position: fixed` (koordinate dugmeta) ili otvara nagore kad nema mesta dole. Test u Zadatku 3.
2. Esc dok je otvoren dijalog unutar strane (QR, Pošalji, Video…) iznad panela: zatvara samo gornji sloj, ne i panel. Test u Zadatku 4.
3. Enter u polju na drugoj kartici forme šalje formu: prazan naslov mora da prebaci na „Osnovno" i fokusira naslov, a ne da tiho ne uradi ništa. Test u Zadatku 4.
4. Istek sesije ili Odjava dok je panel otvoren: okvir prelazi na prijavu bez greške u konzoli. Claude ne može da se prijavi, pa ovo nema automatsku proveru: u Zadatku 1 okvir mora da reaguje na `onAuthStateChange` sa `session === null`, a vlasnik posle deploy-a proverava klikom na „Odjava" dok je panel otvoren (navesti u poruci iz Zadatka 7).
5. Direktan ulaz na `/admin/agencije` ili `/admin/plan/x` neprijavljen: jedan ekran za prijavu, ne prazna strana ni stara poruka „Prvo se prijavite". Test u Zadacima 1 i 2.

---

### Task 1: Okvir admina i preusmerenje `/admin`

**Files:**
- Create: `components/admin/AdminShell.tsx`
- Create: `app/admin/page.tsx`
- Modify: `app/admin/layout.tsx`
- Create (privremeno): `app/dev-admin/page.tsx`

**Interfaces:**
- Produces: `export default function AdminShell({ children }: { children: React.ReactNode })` — renderuje „Učitavanje…", ekran za prijavu (email + `PasswordInput`, `supabase.auth.signInWithPassword`, greška „Pogrešan email ili lozinka.") ili meni + `children`.
- Produces: `export function AdminNav({ pathname, compact }: { pathname: string; compact: boolean })` iz istog fajla (meni; izvezen da ga test-strana prikaže bez sesije).
- Produces: `export function isEditorPath(pathname: string): boolean` — `true` za `/admin/plan/...` i `/admin/projekti/<id>`, `false` za `/admin/projekti`.

- [ ] **Step 1: Test-strana** `app/dev-admin/page.tsx` (`'use client'`) koja prikazuje `<AdminNav pathname="/admin/agencije" compact={false} />`, `<AdminNav pathname="/admin/plan/x" compact />` i ispisuje `isEditorPath` za `/admin/plan/a`, `/admin/projekti/12`, `/admin/projekti`, `/admin/ture` u `<pre id="editor">`.
- [ ] **Step 2: Pokreni i potvrdi da pada:** otvori `http://localhost:<port>/dev-admin` → greška kompilacije (modul `components/admin/AdminShell` ne postoji).
- [ ] **Step 3: Napravi `AdminShell.tsx`** (`'use client'`): sesija preko `supabase.auth.getSession()` + `onAuthStateChange` (stanja `'checking' | 'in' | 'out'`); aktivna stavka po prefiksu `usePathname()`; tamna traka 210 px (logo `Logo` iz `app/tour/[slug]/Logo`, stavke kao `Link`, dole „Odjava" = `supabase.auth.signOut()` i email naloga); `compact` = samo ikone 56 px sa `title`; ispod 900 px gornja traka + „Meni" koje otvara iste stavke preko ekrana (zatvara se na izbor stavke i Esc). Sadržaj desno: `<main className="k-form">` + `<FormThemeStyle />`.
- [ ] **Step 4: `layout.tsx`** zadržava `metadata` (noindex) i vraća `<AdminShell>{children}</AdminShell>`. **`app/admin/page.tsx`**: server `redirect('/admin/ture')` iz `next/navigation`.
- [ ] **Step 5: Proveri:** `/dev-admin` — `#editor` pokazuje `true, true, false, false`; „Agencije" je istaknuta; uski meni ima samo ikone. `curl -s -o /dev/null -w "%{http_code} %{redirect_url}" http://localhost:<port>/admin` → `307 …/admin/ture`. Playwright na `/admin/agencije` neprijavljen → vidi se jedan ekran „Prijavi se" (Review Focus 5). Prozor 375 px → gornja traka i „Meni".
- [ ] **Step 6:** `npx tsc --noEmit -p .` bez grešaka; `npx eslint components/admin/AdminShell.tsx app/admin/layout.tsx app/admin/page.tsx` bez grešaka.

### Task 2: Uklanjanje sopstvenih prijava sa admin strana

**Files:**
- Modify: `app/admin/analitika/page.tsx` (stanja `checkingSession`/`loggedIn`, ekran za prijavu, zaglavlje sa logom)
- Modify: `app/admin/projekti/page.tsx` (stanje `session`, linkovi „← Ture" i „Prvo se prijavite")
- Modify: `app/admin/projekti/[id]/page.tsx` (isto)
- Modify: `app/admin/plan/[slug]/page.tsx` (isto)

**Interfaces:**
- Consumes: `AdminShell` garantuje sesiju pre nego što se strana prikaže.

- [ ] **Step 1:** Na svakoj strani ukloni proveru sesije i ekran/poruku za prijavu; učitavanje podataka kreće pri montiranju (token i dalje iz `supabase.auth.getSession()` u samom pozivu, kao sada). Ukloni linkove „← Ture" / „← Projekti" samo tamo gde ih zamenjuje meni (lista projekata: „← Ture"; editor projekta zadržava „← Projekti" jer vodi na listu); ukloni duplirano zaglavlje sa logom i dugmetom Odjava gde postoji.
- [ ] **Step 2: Proveri:** Playwright neprijavljen na `/admin/analitika`, `/admin/projekti`, `/admin/projekti/1`, `/admin/plan/stan-gasse-1` → svuda isti ekran „Prijavi se", nigde tekst „Prvo se prijavite" (Review Focus 5); na editorima meni je uzak.
- [ ] **Step 3:** `npx tsc --noEmit -p .`; `npx eslint` na četiri fajla — bez novih grešaka.

### Task 3: Meni „⋯" za red ture

**Files:**
- Create: `app/admin/ture/TourRowMenu.tsx`
- Modify (privremeno): `app/dev-admin/page.tsx`

**Interfaces:**
- Produces:
```ts
export type TourRowAction = 'content' | 'plan' | 'intro' | 'send' | 'qr' | 'video' | 'snapshot' | 'embed' | 'delete';
export default function TourRowMenu(props: {
  slug: string;
  status: 'active' | 'rented' | 'sold' | 'paused';
  statusLabels: Record<'active' | 'rented' | 'sold' | 'paused', string>;
  embedCopied: boolean;          // „Kod za sajt" pokazuje „Kopirano ✓"
  busy?: boolean;                // brisanje ili promena stanja u toku
  onAction: (action: TourRowAction) => void;
  onStatus: (status: 'active' | 'rented' | 'sold' | 'paused') => void;
}): JSX.Element
```
- Grupe i tekstovi: „Sadržaj ture" (Uredi sadržaj · Plan (tlocrt) · Uvod (glas)), „Deljenje" (Pošalji klijentu · QR kod · Video · Snimak · Kod za sajt), „Nekretnina" (select stanja), pa crveno „Obriši turu". „Uredi sadržaj" i „Plan" su linkovi (`/tour/{slug}?admin=1` u novom tabu, `/admin/plan/{slug}`), ostalo zove `onAction`.

- [ ] **Step 1: Test-strana:** tabela od 6 redova u kartici sa `overflowX: 'auto'` i `TourRowMenu` u svakom redu; `onAction`/`onStatus` upisuju poslednji događaj u `<pre id="last">`.
- [ ] **Step 2: Potvrdi da pada:** strana ne kompajlira (nema `TourRowMenu`).
- [ ] **Step 3: Napravi komponentu:** dugme „⋯" (`aria-haspopup="menu"`, `aria-expanded`); meni sa `position: 'fixed'` na koordinatama dugmeta, otvara se nagore kad je ispod dugmeta manje od visine menija; zatvara se na izbor, klik van i Esc.
- [ ] **Step 4: Proveri (Playwright):** u 6. redu meni je ceo vidljiv (sve stavke unutar prozora — Review Focus 1); klik „QR kod" → `#last` = `qr`; promena stanja na „Prodato" → `#last` = `status:sold`; Esc zatvara meni.
- [ ] **Step 5:** `npx tsc`, `npx eslint app/admin/ture/TourRowMenu.tsx` čisti.

### Task 4: Panel sa formom ture

**Files:**
- Create: `app/admin/ture/TourFormDrawer.tsx`
- Modify (privremeno): `app/dev-admin/page.tsx`

**Interfaces:**
- Consumes: `FormState`, `EMPTY_FORM` i opcije polja premeštaju se iz `ture/page.tsx` u `app/admin/ture/tourForm.ts` (izvoz: `type FormState`, `EMPTY_FORM`, `CATEGORY_LABELS`), da ih koriste i strana i panel. `AgencyPicker` (postojeći).
- Produces:
```ts
export type DrawerTab = 'basic' | 'info' | 'faq' | 'agent';
export default function TourFormDrawer(props: {
  open: boolean;
  editingSlug: string | null;     // null = nova tura
  form: FormState;
  onChange: (next: FormState) => void;
  agencies: string[];
  saving: boolean;
  error: string;                  // prikazuje se iznad dugmadi
  onSave: () => void;
  onClose: () => void;
}): JSX.Element | null
```
- Kartice i natpisi: „Osnovno", „Podaci za Info", „Pitanja", „Agent"; raspored polja tačno kao u specu (odeljak 2). Dugmad u dnu: „Otkaži", „Sačuvaj" (tokom čuvanja „Čuvanje…").

- [ ] **Step 1: Test-strana:** dugme „otvori" koje otvara panel sa izmišljenom turom; `onSave` upisuje `save` u `#last`; dugme „dijalog" otvara običan `<dialog open>` iznad panela.
- [ ] **Step 2: Potvrdi da pada:** strana ne kompajlira.
- [ ] **Step 3: Napravi `tourForm.ts`** (premeštanje bez promene vrednosti) i **`TourFormDrawer.tsx`**: panel 440 px desno (ispod 900 px ceo ekran), podloga iza; zatvaranje na ×, „Otkaži", klik na podlogu i Esc — Esc se ignoriše kad je fokus/događaj unutar otvorenog `dialog` ili druge modale (`event.defaultPrevented` ili provera `document.querySelector('[role=dialog][data-k-modal]')`). Na „Sačuvaj"/Enter: ako je naslov prazan → kartica „basic" i `focus()` na `#tour-title`, bez `onSave`.
- [ ] **Step 4: Proveri (Playwright):** sve 4 kartice se menjaju; na kartici „Agent" obriši naslov i pritisni Enter u polju agenta → aktivna kartica „Osnovno", fokus na naslovu, `#last` prazan (Review Focus 3); sa naslovom → `#last` = `save`; Esc zatvara panel; sa otvorenim dijalogom Esc ne zatvara panel (Review Focus 2); klik na podlogu zatvara.
- [ ] **Step 5:** `npx tsc`, `npx eslint app/admin/ture/TourFormDrawer.tsx app/admin/ture/tourForm.ts` čisti.

### Task 5: Strana Ture u novom rasporedu

**Files:**
- Modify: `app/admin/ture/page.tsx`

**Interfaces:**
- Consumes: `TourRowMenu` / `TourRowAction` (Task 3), `TourFormDrawer` (Task 4), `tourForm.ts`, `AdminShell` (Task 1).

- [ ] **Step 1:** Ukloni prijavu i zaglavlje sa Logom/Analitika/Novogradnja/Odjava; učitavanje pri montiranju. Ukloni karticu „Agencije: logo i izveštaji" (i `reportAgency`, `copiedReport` ako ih više niko ne koristi). Zaglavlje: „Ture", „N tura · M objavljenih", dugme „+ Nova tura" (otvara panel sa `EMPTY_FORM`).
- [ ] **Step 2:** Forma ide u `TourFormDrawer`; `handleSave` dobija oblik `() => Promise<void>` i posle uspeha zatvara panel; obaveštenje ostaje iznad liste. „Izmeni" puni formu i otvara panel.
- [ ] **Step 3:** Red tabele: Objavi/Skini · Izmeni · „Otvori ↗" (`/tour/{slug}`, novi tab) · `TourRowMenu`; `onAction` mapira na postojeće handlere (`setSendTour`, `setQrTour`, `setVideoSlug`, `setSnapshotSlug`, `setIntroSlug`, `copyEmbedCode`, brisanje sa postojećim potvrđivanjem). Kolona „Nekretnina" nestaje; kad `status !== 'active'`, uz oznaku objave stoji obojena oznaka sa `STATUS_LABELS[status]`.
- [ ] **Step 4: Proveri:** `npx tsc` čist; `npx eslint app/admin/ture/page.tsx` — najviše 2 postojeće greške ili manje; Playwright neprijavljen na `/admin/ture` → ekran za prijavu iz okvira.

### Task 6: Strana Agencije

**Files:**
- Create: `app/admin/agencije/page.tsx`
- Create: `app/admin/agencije/AgencyTable.tsx`
- Modify (privremeno): `app/dev-admin/page.tsx`

**Interfaces:**
- Produces: `export type AgencyReport = { agency: string; tours: number; path: string; logoUrl: string | null }` i `export default function AgencyTable({ reports, onLogoChanged }: { reports: AgencyReport[]; onLogoChanged: () => void })` u `AgencyTable.tsx`.
- `page.tsx` učitava `GET /api/admin/tours` sa tokenom i prosleđuje `agencyReports`.

- [ ] **Step 1: Test-strana:** `AgencyTable` sa dve izmišljene agencije (jedna sa `logoUrl`, jedna bez) i sa praznim nizom.
- [ ] **Step 2: Potvrdi da pada:** strana ne kompajlira.
- [ ] **Step 3: Napravi `AgencyTable`:** red = krug sa logom ili inicijalima (prva slova prve dve reči) + naziv + „N tura" (1 tura / 2–4 ture / 5+ tura), kolona sa `AgencyLogoButton`, „Kopiraj link" (`${SITE_URL}${path}` u clipboard → „Kopirano ✓" 1,8 s; rezervno `window.prompt('Link izveštaja (Ctrl+C, pa Enter):', link)`), „Otvori izveštaj ↗" (novi tab). Ispod tabele objašnjenje iz mockupa. Prazno: „Još nema agencija — dodelite agenciju turi u formi ture." **`page.tsx`**: zaglavlje „Agencije" + „N agencija · mesečni izveštaj i logo u turama".
- [ ] **Step 4: Proveri (Playwright):** inicijali „AC" za „Agencija Centar"; klik „Kopiraj link" → dugme „Kopirano ✓"; prazan niz → poruka; neprijavljen `/admin/agencije` → prijava iz okvira.
- [ ] **Step 5:** `npx tsc`, `npx eslint app/admin/agencije/*.tsx` čisti.

### Task 7: Završna provera i čišćenje

**Files:**
- Delete: `app/dev-admin/`, `.playwright-mcp/`

- [ ] **Step 1:** Obriši privremenu stranu i Playwright izlaz.
- [ ] **Step 2:** `npx tsc --noEmit -p .` čist; `npx eslint app/admin components/admin` — jedine greške su 2 iz osnovice (ili manje).
- [ ] **Step 3:** Playwright neprijavljen: `/admin` → `/admin/ture`; `/admin/ture`, `/admin/agencije`, `/admin/analitika`, `/admin/projekti`, `/admin/plan/stan-gasse-1` → isti ekran za prijavu; konzola bez grešaka.
- [ ] **Step 4:** `git status` — izmenjeni/novi su samo fajlovi iz ovog plana + spec + plan + `.gitignore`. Javi vlasniku šta da proveri prijavljen i čekaj „pushuj"; tada jedan commit i push.
