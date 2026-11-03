# AI tekst soba (obim B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI popuna sobe piše kao agent koji vodi (ugao po tipu oglasa), koristi napomene vlasnika i plan cele ture, sama proverava tekst, a "AI sve sobe" ne puca kad je Gemini preopterećen.

**Architecture:** Čiste funkcije (kontekst, uputstva, provera, napomene) idu u `app/lib/` sa `node --test` testovima; serverske akcije u `app/api/ai/auto-populate-room/_actions/` ih samo pozivaju. Napomene su u novoj admin-only tabeli `tour_ai_notes`, čitaju se/pišu preko nove admin rute. Klijent (`BulkRoomFill`, `DraftModal`, `TourFormDrawer`) dobija polja i plan korak.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (MCP `execute_sql`/`apply_migration`, projekat `tmnaguwmzlwirhjprdbh`), `@google/genai`, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-03-ai-tekst-soba-design.md`

## Global Constraints

- **Bez commit-a i push-a** dok vlasnik ne kaže "pushuj". Umesto "Commit" koraka: ništa se ne stage-uje. Nikad `git add .claude/launch.json`, `docs/cowork/`, `.impeccable/`.
- Pre završetka svakog zadatka: `node --test app/lib/*.test.ts` zeleno i `npx tsc --noEmit -p tsconfig.json` bez grešaka.
- Novi fajlovi u `app/lib/` koje testovi uvoze koriste samo relativne uvoze sa `.ts` nastavkom (kao `serviceJsonLd.ts`), bez `@/` i bez serverskih paketa.
- Dužine ostaju: intro ≤ 140, detail ≤ 220, tačka ≤ 180 znakova, naziv tačke ≤ 3 reči, najviše 4 tačke (`roomDraftRules.ts`).
- U sobe ne ulaze: cena, depozit, troškovi, uslovi zakupa, pravila kuće, parking, okolina, pitanja i odgovori, uknjiženost.
- Zabranjeni počeci: "Ovo je", "Nalazimo se", "Ovde je", "<naziv sobe> je".
- Nova tabela: RLS uključen + eksplicitni GRANT za `authenticated` i `service_role` u istoj migraciji.
- Modeli: glavni za sliku `GEMINI_FALLBACK_MODEL` ('gemini-flash-latest'), rezerva `GEMINI_MODEL` ('gemini-3.1-flash-lite'); `maxDuration` rute ostaje 60.
- Tekst za korisnika na srpskom (latinica); generički tekst kaže "nekretnina", ne "stan".

## Review Focus

- Plan od modela sa sobama istog naziva ("Hodnik" dva puta) ili pogrešnim brojem stavki - mapira se po rednom broju, višak/manjak se ignoriše, nikad se ne pripiše pogrešnoj sobi (test u Task 5).
- `guide_path` sa brojem sobe koja više ne postoji, ponavljanjima ili smećem - red obilaska preskače nepoznato, ostale sobe dodaje po `order_index` (test u Task 2).
- Prepis posle provere bi probio 60 s - ruta vraća prvi nacrt sa problemima umesto greške (test kroz `shouldRewrite` u Task 4).
- Druga soba bez naracije (prazan string) ne sme da izazove lažno "isti početak" (test u Task 3).
- Napomene sa samo razmacima, ogromnim tekstom ili ključem sobe koji nije UUID - normalizuju se, ne ruše čuvanje (test u Task 1).

---

### Task 1: Tabela napomena + admin ruta

**Files:**
- Create: `supabase/migrations/046_tour_ai_notes.sql`
- Create: `app/lib/aiNotes.ts`, `app/lib/aiNotes.test.ts`
- Create: `app/api/admin/ai-notes/route.ts`

**Interfaces:**
- Produces: `type AiNotes = { notes: string; roomNotes: Record<string, string> }`; `normalizeAiNotes(input: unknown): AiNotes`; konstante `MAX_TOUR_NOTES_CHARS = 2000`, `MAX_ROOM_NOTE_CHARS = 500`.
- Produces: `GET /api/admin/ai-notes?slug=<slug>` → `{ success: true, notes: AiNotes }` (prazno ako reda nema); `PUT /api/admin/ai-notes` body `{ slug: string, notes?: string, roomNotes?: Record<string,string> }` → upsert, polja koja nisu poslata ostaju; `{ success: true, notes: AiNotes }`.

- [ ] **Step 1: Testovi `normalizeAiNotes`** u `aiNotes.test.ts`:
  - `normalizeAiNotes(null)` → `{ notes: '', roomNotes: {} }`
  - trim: `{ notes: '  renovirano 2023 \n' }` → `notes === 'renovirano 2023'`
  - sečenje: notes od 2500 znakova → dužina 2000; napomena sobe od 800 → 500
  - `roomNotes: { '<validan uuid>': '  klima ostaje ', 'abc': 'x', '<uuid2>': '   ' }` → samo `{ '<validan uuid>': 'klima ostaje' }`
  - `roomNotes: 'nije objekat'` → `{}`
- [ ] **Step 2:** `node --test app/lib/aiNotes.test.ts` → FAIL (modul ne postoji).
- [ ] **Step 3:** Implementirati `aiNotes.ts` (UUID regex `/^[0-9a-f-]{36}$/i`).
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5: Migracija 046** - tabela po specu (§1): `tour_slug text primary key references public.tours(slug) on delete cascade`, `notes text not null default ''`, `room_notes jsonb not null default '{}'`, `updated_at timestamptz not null default now()`; `enable row level security`; policy "Admins manage ai notes" `for all to authenticated using/with check (exists (select 1 from public.app_admins a where a.email = auth.jwt() ->> 'email'))` (isti obrazac kao `028_admin_only_rls.sql`); `grant select, insert, update, delete ... to authenticated, service_role`. Primeniti preko MCP `apply_migration` (ime `tour_ai_notes`), pa `get_advisors` security - bez novih upozorenja za ovu tabelu.
- [ ] **Step 6: Ruta** po obrascu `app/api/admin/tours/route.ts` (`requireAdmin(req)`, `ctx.supabase`); slug mora postojati u `tours` (inače 404); `PUT` spaja sa postojećim redom pa `normalizeAiNotes`, `updated_at = now()`.
- [ ] **Step 7:** `npx tsc --noEmit -p tsconfig.json` → bez grešaka.

### Task 2: Kontekst sobe (činjenice, red obilaska, napomene)

**Files:**
- Create: `app/lib/roomAiContext.ts`, `app/lib/roomAiContext.test.ts`
- Modify: `app/api/ai/auto-populate-room/_actions/shared.ts` (`loadRoomContext`, `RoomContext`)

**Interfaces:**
- Consumes: `AiNotes` (Task 1).
- Produces (u `roomAiContext.ts`):
  - `type TourFactsRow = { property_type?: string|null; structure?: string|null; area_sqm?: number|string|null; floor?: string|null; city?: string|null; district?: string|null; terrace?: string|null; heating?: string|null; has_elevator?: string|null; has_basement?: string|null; build_status?: string|null; finish_status?: string|null }` (structure već kao `structureLabel` tekst).
  - `roomFactsFromTour(row: TourFactsRow): string[]` - oblik `"Label: vrednost"`, redom: Property type, Structure, Total area (whole property, m²), Floor, City, District, Outdoor space, Heating, Elevator in building, Basement, Building, Furnishing; prazne vrednosti preskočene. Nikad: cena, depozit, parking, uknjiženost.
  - `visitOrder(guidePath: string|null|undefined, rooms: { id: string; order_index: number }[]): { ids: string[]; fromGuide: boolean }` - prvi dolazak u sobu iz `guide_path` (format kao `parseGuidePath`: brojevi `order_index` odvojeni zarezom), nepoznati brojevi preskočeni, zatim sobe kojih nema u putanji po `order_index`; `fromGuide` = putanja dala bar jednu sobu.
  - `previousInVisit(ids: string[], roomId: string): string | null`.
- Produces (u `shared.ts`, `RoomContext` dobija): `district`, ništa novo u `facts` osim gornjih; `listingText: string` (iz `tours.about_text_i18n` sr, do 700 znakova); `tourNotes: string`; `roomNote: string`; `previousRoomTitle: string` (prazno na početku); `visitIndex: number` (0-based, -1 nepoznato). `loadRoomContext(roomId, listingType, roomNoteOverride?: string)`.

- [ ] **Step 1: Testovi** `roomAiContext.test.ts`:
  - `roomFactsFromTour({ structure: 'Dvosoban', floor: 'Prizemlje', has_elevator: 'Da', finish_status: 'Namešteno' })` sadrži `'Floor: Prizemlje'`, `'Elevator in building: Da'`, `'Furnishing: Namešteno'`, ne sadrži ništa sa "Parking"/"Price".
  - prazne/null vrednosti → nema stavke.
  - `visitOrder('8,5,8,4,8,9,1', rooms 1..9)` → ids sobe 8,5,4,9,1 pa 2,3,6,7; `fromGuide: true`.
  - `visitOrder('3,99,abc,3', rooms 1..4)` → 3,1,2,4; `fromGuide: true`.
  - `visitOrder(null, rooms [{id:'b',order_index:2},{id:'a',order_index:1}])` → `['a','b']`, `fromGuide: false`.
  - `previousInVisit(['a','b','c'], 'a')` → `null`; `'c'` → `'b'`; nepoznat → `null`.
- [ ] **Step 2:** Test → FAIL.
- [ ] **Step 3:** Implementirati `roomAiContext.ts`.
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5:** `loadRoomContext`: select-uje i `district, has_elevator, has_basement, build_status, finish_status, about_text_i18n, guide_path` iz `tours`, `order_index` iz `rooms`, red iz `tour_ai_notes`; facts = `roomFactsFromTour`; `previousRoomTitle`/`visitIndex` iz `visitOrder` + `previousInVisit`; `otherRooms` po redu obilaska; `roomNote` = override ako je poslat, inače `room_notes[roomId]`. Greška pri čitanju napomena ne ruši AI (kao sada).
- [ ] **Step 6:** tsc → bez grešaka.

### Task 3: Automatska provera `checkRoomDraft`

**Files:**
- Modify: `app/lib/roomDraftRules.ts`
- Create: `app/lib/roomDraftRules.test.ts`

**Interfaces:**
- Produces: `type DraftForCheck = { title?: string; narrationIntro: string; narrationDetail: string; waypoints: { title: string; text: string }[] }`; `checkRoomDraft(draft: DraftForCheck, otherNarrations: string[]): string[]` - poruke na srpskom, prazno = čisto.
- `EMPTY_PRAISE` proširen sa: `'prostran'`, `'sve neophodn'`, `'sve potrebn'`, `'potpuno opremljen'`, `'funkcionaln'`, `'praktično rešenje'`, `'lep pogled'` (višerečne stavke moraju raditi i u `checkDraftField`).
- Nove konstante: `DEFINITION_PATTERNS` (`je mesto za`, `je prostor za`, `služi za`, `centralno mesto`, `povezuje sve prostorije`), `BANNED_OPENINGS` (`Ovo je`, `Nalazimo se`, `Ovde je`, + `<title> je` kad je `title` poslat).

- [ ] **Step 1: Testovi** (`roomDraftRules.test.ts`), svaki problem posebno:
  - čist nacrt ("Iz hodnika ulazite u kupatilo sa kadom." / "Mašina za veš je pored kade, pa ...", tačka "Bojler") → `[]`
  - "Kupatilo je centralno mesto za higijenu." → poruka o definiciji
  - intro "Ovo je kuhinja." → poruka o početku; sa `title: 'Kuhinja'` i "Kuhinja je otvorena..." → poruka o početku
  - "prostrana soba", "potpuno opremljena" → poruka o praznoj pohvali
  - prazan `narrationDetail` → poruka o praznom delu
  - tačka sa `title: ''` → poruka "tačka bez naziva"
  - intro 141 znak → poruka o dužini
  - `otherNarrations: ['Iz hodnika ulazite u spavaću sobu.']` i intro "Iz hodnika ulazite u kupatilo." → poruka "isti početak kao druga soba"; `otherNarrations: ['', '  ']` → bez te poruke
- [ ] **Step 2:** Test → FAIL.
- [ ] **Step 3:** Implementirati (poređenje prvih 3 reči, mala slova, bez interpunkcije; dužine iz postojećih konstanti).
- [ ] **Step 4:** Test → PASS; ceo `node --test app/lib/*.test.ts` zelen.

### Task 4: Novo uputstvo za sobu + prepis + pouzdanost

**Files:**
- Create: `app/lib/roomDraftPrompt.ts`, `app/lib/roomDraftPrompt.test.ts`
- Modify: `app/api/ai/auto-populate-room/_actions/draft.ts`, `_actions/shared.ts` (ukloniti `getClientStrategy`), `_actions/review.ts` (prevod)
- Modify: `app/tour/[slug]/roomDraftApply.ts` (`AiDraft.problems?`, `requestRoomDraft` opcije)

**Interfaces:**
- Consumes: `RoomContext` (Task 2), `checkRoomDraft` (Task 3).
- Produces (u `roomDraftPrompt.ts`, tip `RoomContext` se premešta ovde, `shared.ts` ga re-exportuje):
  - `type TourPlanEntry = { role: string; transition: string; facts: string[] }`
  - `clientAngle(listingType: 'sale'|'rent'|'booking'): string` - tri ugla iz speca §4.
  - `buildDraftPrompt(ctx: RoomContext, plan?: TourPlanEntry): string`
  - `buildRewritePrompt(base: string, problems: string[], previous: unknown): string`
  - `shouldRewrite(problems: string[], elapsedMs: number): boolean` - `problems.length > 0 && elapsedMs < 30_000`.
- Produces (klijent): `requestRoomDraft(room, listingType, opts?: { plan?: TourPlanEntry; roomNote?: string }): Promise<AiDraft>`; `AiDraft` dobija `problems?: string[]`. Ruta prima `plan` i `roomNote` u body, vraća `draft.problems`.

- [ ] **Step 1: Testovi** `roomDraftPrompt.test.ts`:
  - `buildDraftPrompt` sa `tourNotes: 'renovirano 2023'`, `roomNote: 'klima ostaje'` → sadrži oba teksta
  - sa `previousRoomTitle: 'Hodnik'` → sadrži `Hodnik`; sa planom `{ role: 'R1', transition: 'T1', facts: ['F1'] }` → sadrži R1, T1, F1
  - ne sadrži reči `Price`, `Deposit`, `Parking` ni kad su u `listingText` kao "Cena 270" (listingText ide uz uputstvo "facts only", ali cena iz tabele tours se nikad ne dodaje - proveriti da `facts` bez cene ostaju bez cene)
  - `clientAngle('sale')`, `('rent')`, `('booking')` - tri različita teksta
  - sadrži zabranjene početke i rečenicu o "vi"
  - `shouldRewrite(['x'], 10_000)` → true; `(['x'], 31_000)` → false; `([], 1000)` → false
- [ ] **Step 2:** Test → FAIL.
- [ ] **Step 3:** Implementirati `roomDraftPrompt.ts` - sadržaj uputstva prema specu §4 i probi (`scratchpad/probe/probe2.mjs`, `roomPrompt`): glas agenta, "vi", kratke rečenice, uloga/prelaz/činjenice iz plana, napomene ("koristi samo gde pripadaju, prilagodi tipu oglasa, ne dodaj nove činjenice"), opis oglasa "samo činjenice, ne prepisuj pohvale", pravila bez zaključivanja, tačke samo za ne-očigledno + obavezan naziv, `box_2d` pravila iz sadašnjeg `buildDraftPrompt`.
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5: `draft.ts`**: koristi novi `buildDraftPrompt(ctx, body.plan)`; `loadRoomContext(..., body.roomNote)`; `attempts: 2` (pauza na 503/429 već postoji u `generateWithRetry`); posle parsiranja `checkRoomDraft(...)` sa naracijama ostalih soba; ako `shouldRewrite(problems, Date.now() - start)` → jedan poziv sa `buildRewritePrompt` i ponovna provera; odgovor nosi `draft.problems` (preostali). Šema: naziv tačke opisan kao obavezan.
- [ ] **Step 6: `review.ts` prevod**: ukloniti "luxury real-estate copy"; dodati: isti glas agenta koji vodi, govorni jezik, kratke rečenice, bez dodavanja pohvala kojih nema u originalu.
- [ ] **Step 7:** `rg -n "2\.5-flash|gemini-3\.1-flash'" app` → nema pogodaka (osim `-lite`).
- [ ] **Step 8:** tsc + ceo `node --test` → zeleno.

### Task 5: Plan obilaska (`plan_tour`)

**Files:**
- Create: `app/api/ai/auto-populate-room/_actions/plan.ts`
- Modify: `app/api/ai/auto-populate-room/route.ts` (akcija `plan_tour`)
- Modify: `app/lib/roomDraftPrompt.ts`, `app/lib/roomDraftPrompt.test.ts`

**Interfaces:**
- Consumes: `visitOrder`, `roomFactsFromTour` (Task 2), `TourPlanEntry` (Task 4).
- Produces: `buildTourPlanPrompt(input: { listingType: 'sale'|'rent'|'booking'; facts: string[]; listingText: string; tourNotes: string; rooms: { title: string; note: string }[] }): string`; `mapPlanToRooms(raw: unknown, roomIds: string[]): Record<string, TourPlanEntry>` - stavke po polju `n` (1-based redni broj u `rooms`), nepoznat/dupli `n` ignorisan, nedostajuća polja → prazni stringovi/niz.
- Produces (ruta): body `{ action: 'plan_tour', tourSlug: string }` → `{ success: true, plan: Record<roomId, TourPlanEntry>, order: string[], fromGuide: boolean, model: string }`.
- Produces (klijent, `roomDraftApply.ts`): `requestTourPlan(tourSlug: string): Promise<{ plan: Record<string, TourPlanEntry>; order: string[]; fromGuide: boolean }>`.

- [ ] **Step 1: Testovi**:
  - `buildTourPlanPrompt` navodi sobe numerisano `1. Hodnik`, `2. Hodnik` (isti naziv dva puta) i sadrži pravilo da novac/uslovi/pravila/parking/okolina ne idu u sobe
  - `mapPlanToRooms({ rooms: [{ n: 2, role: 'B', transition: 't', facts: ['f'] }, { n: 1, role: 'A' }, { n: 2, role: 'dupli' }, { n: 9, role: 'x' }] }, ['id1','id2'])` → `{ id1: { role: 'A', transition: '', facts: [] }, id2: { role: 'B', transition: 't', facts: ['f'] } }`
  - `mapPlanToRooms('smeće', ['id1'])` → `{}`
- [ ] **Step 2:** Test → FAIL.
- [ ] **Step 3:** Implementirati obe funkcije (pravila plana iz `probe2.mjs`, `planPrompt`).
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5: `plan.ts`**: učita turu, sobe, napomene; red iz `visitOrder`; panorame (`panorama_url_mobile` → `panorama_url_cf` → `panorama_url`) paralelno preuzete i smanjene na 1024 px (`sharp`, kao `fetchPanorama`); jedan Gemini poziv (Flash, rezerva Lite, `attempts: 2`, `timeoutMs: 40_000`, `TEMP_GROUNDED`), šema `{ rooms: [{ n, role, transition, facts[] }] }`; soba bez panorame se šalje samo kao naziv.
- [ ] **Step 6:** ruta: `plan_tour` → `handlePlanTour(body)`.
- [ ] **Step 7:** tsc + ceo `node --test` → zeleno.

### Task 6: "AI sve sobe" i "AI Popuni Sobu" u adminu

**Files:**
- Modify: `app/tour/[slug]/BulkRoomFill.tsx`
- Modify: `app/tour/[slug]/_admin/DraftModal.tsx`, `app/tour/[slug]/_admin/useTourAdmin.tsx` (`handleAutoPopulateRoom` koristi `requestRoomDraft`)
- Create: `app/lib/aiOverload.ts`, `app/lib/aiOverload.test.ts`

**Interfaces:**
- Consumes: `requestRoomDraft` opcije, `requestTourPlan`, `GET/PUT /api/admin/ai-notes`.
- Produces: `isOverloadError(message: string): boolean` (`/503|429|high demand|overloaded|preoptere/i`); konstanta `OVERLOAD_PAUSE_MS = 8000`.

- [ ] **Step 1: Test** `aiOverload.test.ts`: `'{"code":503,...high demand'` → true; `'Rate limit 429'` → true; `'Soba nema panoramu.'` → false.
- [ ] **Step 2:** Test → FAIL → implementacija → PASS.
- [ ] **Step 3: BulkRoomFill, korak izbora soba**: učitava napomene (`GET`); prikazuje "Redosled za AI: 1. … 2. …" (iz `visitOrder` sa `tour.guide_path` i sobama); kad `fromGuide` nije true, žuto upozorenje: „Vodič nije postavljen - prelazi će pratiti redosled soba. Postavite vodič pre AI popune.“; uz svaku izabranu sobu polje „Napomena za AI (ne vidi se u turi)“, placeholder „npr. klima ostaje, nova kada 2024“.
- [ ] **Step 4: Pokretanje**: prvo `PUT` napomena soba (samo ako su menjane), pa `requestTourPlan`; ako plan ne uspe, poruka „Plan ture nije uspeo - sobe se pišu bez plana.“ i nastavak; sobe redom obilaska, svaka sa `{ plan: plan[id], roomNote }`; posle greške za koju `isOverloadError` → čekanje `OVERLOAD_PAUSE_MS` pre sledeće sobe (status: „Gemini je preopterećen, čekam par sekundi…“).
- [ ] **Step 5: Neuspele sobe**: posle pisanja, ako ima grešaka, lista ✗ soba sa dugmetom **„Pokušaj ponovo“** (ponovo samo te sobe, ista pravila) pre pregleda.
- [ ] **Step 6: Pregled**: `draft.problems` se prikazuju kao upozorenja iznad polja (postojeći stil upozorenja); „Novi predlog“ šalje isti plan i napomenu.
- [ ] **Step 7: `beforeunload`**: dok postoji bar jedan nacrt koji nije sačuvan ni odbijen, `beforeunload` traži potvrdu; skida se na kraju i pri zatvaranju prozora.
- [ ] **Step 8: Jedna soba**: `handleAutoPopulateRoom` zove `requestRoomDraft(currentRoom, tour?.category)`; `DraftModal` dobija polje „Napomena za AI“ (učitano iz `GET`) i dugme „Napiši ponovo sa napomenom“ (sačuva `PUT`, pa novi nacrt) i prikazuje `aiDraft.problems`.
- [ ] **Step 9:** tsc + lint (`npx eslint app/tour app/lib`) + ceo `node --test` → zeleno.

### Task 7: Napomene ture u formi + uputstva + provera

**Files:**
- Modify: `app/admin/ture/TourFormDrawer.tsx` (kartica "Podaci za Info")
- Modify: `docs/uputstvo-kreiranje-ture.md`, `docs/ai-agent-uvod.md`

**Interfaces:**
- Consumes: `GET/PUT /api/admin/ai-notes`, `MAX_TOUR_NOTES_CHARS`.

- [ ] **Step 1: Forma**: u kartici "Podaci za Info" polje „Napomene za AI (ne vide se u turi)“, textarea, brojač do 2000, placeholder „Jedna po redu: renovirano 2023, nova PVC stolarija, klima ostaje, pogled na park…“; učitava se pri otvaranju postojeće ture; čuva se zajedno sa "Sačuvaj" (posle uspešnog PATCH-a ture, `PUT` napomena samo ako su menjane; greška napomena prikazana posebno, ne poništava čuvanje ture). Za novu turu polje je skriveno dok tura ne postoji.
- [ ] **Step 2: Uputstvo za turu**: odeljak „AI popuna: redosled rada“ - sobe i nazivi → vodič → napomene → „AI sve sobe“; šta su napomene i primeri po tipu oglasa; šta znače upozorenja i „Pokušaj ponovo“.
- [ ] **Step 3: `ai-agent-uvod.md`**: redovi u tabeli `app/lib/` za `aiNotes.ts`, `roomAiContext.ts`, `roomDraftPrompt.ts`, `aiOverload.ts`; akcija `plan_tour` i tabela `tour_ai_notes` (migracija 046).
- [ ] **Step 4: Završna provera**: `node --test app/lib/*.test.ts`, tsc, `npx eslint .`, `npm run build > /tmp/b.log` (scratchpad) - sve prolazi.
- [ ] **Step 5: Ručna proba bez prijave**: kopija `scratchpad/probe/probe2.mjs` koja uvozi `buildTourPlanPrompt`, `buildDraftPrompt`, `checkRoomDraft` iz repozitorijuma i pušta Maglićku (kupatilo, kuhinja, terasa); rezultat staro pored novog ide vlasniku. Proba u pregledaču (admin) je vlasnikova: jedna tura, „AI sve sobe“.
- [ ] **Step 6:** Ažurirati memoriju (`project_ai_waypoint_precision.md` ili nova beleška) - šta je promenjeno, šta čeka "pushuj".
