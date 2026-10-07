# Kvadrat360: uvod za AI agenta

Ovo je prvi dokument koji AI agent (Claude, Codex, Gemini...) treba da pročita pre rada na projektu. Kaže šta je Kvadrat360, kako je sistem složen, gde šta stoji i koja pravila vlasnik traži.

Stanje opisano ovde važi na dan **2. 10. 2026**. Ako se kod i ovaj dokument razilaze, **kod je tačan**. Tada ispravi i dokument.

Uputstva za ljude: kako se pravi tura — [`uputstvo-kreiranje-ture.md`](uputstvo-kreiranje-ture.md); novogradnja (projekti, pristup za prodaju) — [`uputstvo-novogradnja.md`](uputstvo-novogradnja.md).

---

## 1. Šta je Kvadrat360

Platforma za **360° virtuelne ture nekretnina**, sajt **kvadrat360.com**. Kvadrat360 snima stan (360° panorame i HDR fotografije), a kupac ili zakupac posle „šeta" kroz njega u pregledaču, sa audio vodičem na više jezika.

- **Kome se prodaje:** agencijama za nekretnine (mesečni paketi) i vlasnicima koji sami prodaju ili izdaju (pojedinačna tura). Od 2. 10. 2026 i **investitorima novogradnje** (paket „Novogradnja": izbor stana zgrada → sprat → stan, §15) — u pripremi, još bez cene i bez pravog klijenta.
- **Tipovi oglasa:** prodaja (`sale`), izdavanje (`rent`), kratkoročni smeštaj (`booking`). Tip menja fokus teksta koji AI piše za turu.
- **Jezici:** srpski (osnovni, latinica), engleski, nemački, ruski. Sadržaj ture se čuva po jezicima u JSONB poljima.
- **Područje:** Kragujevac i okolina, drugi gradovi po dogovoru.
- **Faza:** posao **tek počinje**, prvi klijenti tek dolaze. Cenovnik je utvrđen (`app/lib/pricing.ts`), sa uvodnom promocijom koja ima datum isteka. Firma **još nije registrovana**.

Vlasnik govori srpski, vodi se proizvodom i dizajnom, nije programer. Objašnjenja mu treba davati jednostavno, a za veće izmene izgleda prvo napraviti **mockup**, pa tek onda kod.

---

## 2. Delovi sistema

| Deo | Adresa | Za koga | Šta radi |
|---|---|---|---|
| Početna (SR) | `/` | posetioci, agencije | Prodaja usluge: primeri tura, benefiti, paketi, kalkulator, česta pitanja, forma sa terminom |
| Početna (EN) | `/en` | strani posetioci | Isti raspored, engleski tekst |
| Tura | `/tour/[slug]` | kupci, zakupci | 360° pregled nekretnine: sobe, tačke u prostoru, audio vodič, tlocrt, lokacija, kontakt agenta |
| Upitnik | `/unos` | agencija | Agent unese podatke o nekretnini i pošalje ih uz kod; AI od toga napravi nacrt ture |
| Admin, ture | `/admin/ture` | vlasnik | Spisak tura, novi unos, izmena, **Objavi / Skini** |
| Admin, analitika | `/admin/analitika` | vlasnik | Posete tura i početne strane, klikovi, izvori poseta |
| Admin u turi | `/tour/[slug]?admin=1` | vlasnik | Dodavanje soba, otpremanje panorama, AI popuna, prevodi, tačke, tlocrt |
| Izveštaj agencije | `/izvestaj/[token]?mesec=YYYY-MM` | agencija | Mesečni izveštaj o posetama njenih tura. Tajni potpisan link (`lib/agencyReport.ts`), bez prijave; linkovi su u `/admin/ture` → „Izveštaji za agencije". Nije za Google. |
| Sve ture | `/ture` | posetioci | Baza objavljenih tura: jedna traka filtera, Leaflet mapa pored filtera (računar), kartice 4 u redu |
| Za agencije | `/za-agencije` | agencije | Prodajna strana za agencije iz Kragujevca; živa tura u vrhu, moduli ture kao benefiti |
| Za investitore | `/za-investitore` | investitori | Prodajna strana za investitore novogradnje sa klikabilnim primerom (`components/InvestorDemo.tsx`, izmišljen projekat). **Skrivena:** `noindex`, nije u meniju, podnožju ni sitemap-u (vlasnik, 2. 10. 2026) |
| Projekat novogradnje | `/novogradnja/[slug]` | kupci | Izbor stana: fasada → sprat → stan → upit. Samo objavljen projekat (RLS). §15 |
| Projekat (EN) | `/en/novogradnja/[slug]` (+ `/ugradnja`) | strani kupci | Isti podaci, tekst iz `lib/projectI18n.ts`, naziv/opis iz `title_en`/`description_en`; hreflang sr/en |
| Ugradnja projekta | `/novogradnja/[slug]/ugradnja` | sajt investitora (iframe) | Samo izbor stana + potpis; `noindex`, kanonska = javna strana; visinu javlja roditelju (`EmbedAutoHeight`, poruka `{type:'k360-height', slug, height}`). Kod je u adminu projekta (`EmbedCodePanel`) |
| Link za pokazivanje | `/novogradnja/[slug]/pregled?t=` (+ `/en/...`) | vlasnik, investitor | Izgleda kao javna strana (bez trake), i za neobjavljen projekat; potpisan link 30 dana (`lib/projectPreview.ts`), `noindex`, bez merenja |
| Prodaja investitora | `/prodaja/[kod]` | prodaja investitora | Menja SAMO status i cenu stanova jednog projekta; lični link bez naloga (`lib/salesAccess.ts`) |
| Admin, novogradnja | `/admin/projekti`, `/admin/projekti/[id]` | vlasnik | Projekti, fasada i spratovi, osnove i stanovi, uvoz iz Excela, kopiranje rasporeda, pregled, pristup za prodaju. Dugme „Novogradnja" u `/admin/ture` |
| Šematski plan | `/admin/plan/[slug]` | vlasnik | Editor tlocrta: automatski nacrt iz tačaka vrata (`lib/schematicFloorplan.ts`) koji se ispravlja povlačenjem; čuvanje crta SVG (`lib/floorplanLayout.ts`), stavlja ga na R2 kao `<slug>/floorplan-schematic.svg` (+ `.json` sa rasporedom za kasniju izmenu) i upisuje `floorplan_url` i oznake soba. Pravi tlocrt se ne menja bez potvrde. Dugme „🗺 Plan" u `/admin/ture`. |

---

## 3. Tehnički stack

- **Next.js 16.3.1** (App Router, Turbopack), **React 19.2**, **TypeScript 5**, Tailwind 4 (malo korišćen; stil je uglavnom u inline stilovima i CSS stringovima)
- **Supabase**: Postgres, Auth (prijava admina email/lozinka) i RLS
- **Cloudflare R2**: panorame i sličice, iza CDN-a (`NEXT_PUBLIC_CDN_URL`), preko `@aws-sdk/client-s3`
- **Pannellum 2.5.6** (sa jsDelivr-a): prikaz 360° panorama u turi
- **Google Gemini** (`@google/genai`): AI popuna soba i obrada upitnika
- **sharp**: pretvaranje panorama u WebP i pravljenje sličica
- **Telegram bot**: obaveštenje vlasniku za svaki upit sa sajta
- **Vercel**: hosting; deploy ide sam posle pusha na `main`

> ⚠️ **Next.js 16 nije verzija iz tvog znanja.** API-ji i konvencije su se menjali. Pre pisanja koda pročitaj odgovarajući vodič u `node_modules/next/dist/docs/` (vidi `AGENTS.md`).

---

## 4. Mapa repoa

```
app/
  layout.tsx              root layout: fontovi (next/font: Inter, Plus Jakarta Sans, Newsreader
                          samo za kurziv u naslovima sajta, Urbanist za naslove u turi), preconnect na CDN
  globals.css             --font-body / --font-display (koristi ih i THEME)
  page.tsx                / (srpski) → <HomePage lang="sr" />
  en/page.tsx             /en (engleski) → <HomePage lang="en" />
  HomePage.tsx            JEDAN raspored početne za oba jezika + sav CSS početne
  tour/[slug]/
    page.tsx              sklapa turu: stanje, Pannellum scena (efekat koji pravi sobu), raspored ekrana
    useRoomNavigation.ts  kretanje između soba (klik, vrata, strelice) + automatski vodič i pauza
    roomSequence.ts       "koreografija" sobe posle učitavanja: uvod, info-tačke, kraj / vodič dalje;
                          ručni povratak u već obiđenu sobu preskače priču
    transition.ts         prelaz između soba; panoramaUrlFor() bira lakšu panoramu za telefon
    useViewerControls.ts  ceo ekran (i webkit) i žiroskop; canFullscreen / canGyro sakrivaju dugme gde ne radi
    useBackGuard.ts       dugme "nazad": zatvara gornji sloj, pa pita "napustiti turu?", pa izlazi
    useTourNarration.ts   zvuk naracije
    WelcomeScreen.tsx     početni ekran + prozor "Kako radi 360° tura?" (4 koraka, ×, "nazad" ga zatvara)
    TourControls.tsx      jezici, kartica naslova (sa deljenjem), dugmad preko panorame, InfoCard
                          (2 reda + Više/Manje), ChatAgentButton (Viber/WhatsApp), LeaveTourDialog
    TourMenuBar.tsx       donja traka modula
    TourModals.tsx        moduli Plan / Lokacija / Info / Pitanja / Kontakt + potpis Kvadrat360
    ViewingRequestModal.tsx  "Zakaži razgledanje"
    RoomNavBar.tsx, FloorplanMiniMap.tsx  traka soba (na računaru u vrhu) i mala mapa levo
    ViewCone.tsx, planHeading.ts  konus pogleda na planu (mala mapa i modul Plan): pravac
                          i širina prate yaw/hfov viewer-a uživo; poravnanje panorame sa
                          planom se računa iz tačaka soba + strelica vrata (bez ručnog unosa)
    useTourData.ts        učitavanje ture i soba
    useAdminSession.ts    admin prijava u turi
    useHotspotEditor.ts   admin: dodavanje/pomeranje/brisanje tačaka, oznaka na tlocrtu
    useTourAnalytics.ts   merenje poseta (tour_events) + unapred skidanje susednih soba
    tourLanguages.ts      koji jezici se nude (tekst / snimljen glas)
    TourOverlays.tsx      globalni CSS ture (.k360-tap, .k360-top-ui), ekran učitavanja, admin nišan,
                          useImmersiveWhileDragging (sakriva dugmad dok se prstom vuče)
    TourSeoSummary.tsx    tekst ture za Google i čitače ekrana (renderuje layout.tsx)
    TourAdminTools.tsx    admin alati u turi (poseban chunk, samo za admina)
    layout.tsx            metadata ture (naslov, opis, OG)
    getTourMeta.ts        serversko čitanje ture za metadata / OG (pickLang, realValue)
    theme.ts              THEME boje i fontovi za turu, admin i /unos
    translations.ts       tekst interfejsa ture na 4 jezika
    pannellum.ts          URL-ovi Pannellum skripte i CSS-a
    adminUtils.ts, utils.tsx, types.ts, Logo.tsx, opengraph-image.tsx
  admin/ture, admin/analitika     admin ekrani (klijentski, Supabase prijava)
  admin/projekti/         novogradnja: spisak + [id] editor projekta (§15)
  novogradnja/[slug]/     javna strana projekta + pregled/ (potpisan link)
  prodaja/[token]/        strana za prodaju investitora (status i cena)
  za-investitore/         prodajna strana za investitore (skrivena)
  unos/page.tsx           upitnik za agenta
  api/                    rute (vidi §8)
  lib/                    zajednička logika (vidi ispod)
  sitemap.ts, robots.ts, opengraph-image.tsx
components/               komponente sajta: HeroDevice, ContactForm, PriceCalculator, SiteTracker,
                          TourList + TourMap (/ture), TourModulesShowcase (moduli ture kao benefiti),
                          InvestorDemo (primer na /za-investitore)
components/projekat/      novogradnja: ProjectSelector (izbor stana), ProjectView (cela strana projekta),
                          PolygonCanvas (crtanje oblika u adminu), SalesBoard (/prodaja), SalesAccessPanel
                          (admin: linkovi + istorija), EmbedCodePanel + EmbedAutoHeight (ugradnja),
                          InsightsPanel (izveštaj + upiti), ProgressPanel / ProjectProgress (gradilište),
                          NameAdvice (savet za naziv),
                          selectorStyles.ts (.inv-*), adminStyles.ts (.pa-*)
supabase/migrations/      001–025 (019–025 = novogradnja)
scripts/                  jednokratni skriptovi + gen-db-types.mjs (npm run db:types),
                          backfill-mobile-panoramas.mjs (lakše panorame za postojeće sobe; urađeno za sve)
types/supabase.ts         generisani tipovi baze (`npm run db:types`, vidi §5)
docs/                     uputstvo-kreiranje-ture.md, ovaj fajl
```

Najvažnije u `app/lib/`:

| Fajl | Čemu služi |
|---|---|
| `site.ts` | `SITE_URL`, `CONTACT` (telefon, mejl, adresa, radno vreme), linkovi za poziv, Viber, WhatsApp i mapu |
| `homeCopy.ts` | **sav tekst početne**, SR i EN |
| `homeFaq.ts` | česta pitanja, SR i EN; idu i u JSON-LD |
| `pricing.ts` | **sve cene**: stepeni po broju nekretnina, kartice paketa, kalkulator |
| `shootSlot.ts` | željeni termin snimanja (dani i delovi dana; provera na serveru) |
| `showcaseTours.ts` | objavljene ture za početnu; `HERO_TOUR_SLUG` = tura u kadru u vrhu |
| `gemini.ts` | zajednički Gemini sloj (modeli, retry, timeout, JSON) |
| `tourFromForm.ts` | upitnik → nacrt ture preko Gemini-ja |
| `adminAuth.ts` | `requireAdmin(req)`: Bearer token + `ADMIN_EMAILS` |
| `authFetch.ts` | `adminAuthHeader()` za klijentske pozive admin ruta |
| `rateLimit.ts` | ograničenje broja zahteva po IP-u (u memoriji, približno) |
| `track.ts` | `trackEvent` (ture) i `trackSiteEvent` (početna), sendBeacon |
| `r2.ts`, `panoramaPreview.ts` | R2 klijent; WebP konverzija, sličica 1200×630 i kopija za telefone (`MOBILE_PANORAMA_WIDTH = 6000`, `mobilePanoramaKey`) |
| `propertyTaxonomy.ts` | zatvorene liste (tip, struktura, naselja, grejanje, terasa, parking, depozit, uknjiženost); `structureLabel()` skida „(2.0)" za prikaz |
| `geocode.ts` | adresa → koordinate (Nominatim) za mapu na `/ture` |
| `structuredData.ts` | JSON-LD (WebSite, LocalBusiness, FAQPage) |
| `slug.ts` | slug od naziva (latinica i ćirilica, jedinstven) |
| `telegram.ts` | slanje poruke na Telegram |
| `projects.ts` | novogradnja: tipovi, statusi i boje, `floorName`, `parseLevels` („P-6"), `parseUnitTable` (Excel), `levelPrefix`/`unitSuffix` (uparivanje 2A→3A), `cleanPolygon` |
| `projectData.ts` | čitanje projekta za javnu stranu (anon + RLS) i za pregled (service role posle provere potpisa) |
| `projectPreview.ts` | potpisan link za pokazivanje projekta (HMAC, 30 dana) |
| `salesAccess.ts` | linkovi za prodaju (kod + SHA-256 otisak), `resolveSalesLink`, `loadSalesData`, `recordUnitChanges` (istorija + Telegram) |
| `investorCopy.ts` | tekst strane `/za-investitore` |
| `projectI18n.ts` | tekst strane projekta SR/EN, `floorLabel`, `structureText`/`orientationText` (rečnik), `formatPrice`/`formatArea`, `trackKey` (oznake merenja), `srPlural` |
| `projectStats.ts` | izveštaj po stanu (30 dana): `pv:`/`pu:` događaji + `project_inquiries` |
| `projectMeta.ts`, `projectOgImage.tsx`, `revalidateProject.ts` | metapodaci + hreflang, slika za deljenje (ImageResponse), osvežavanje svih adresa projekta (SR/EN, ugradnja, OG) |

---

## 5. Baza (Supabase)

### Tabele

| Tabela | Šta | Važne kolone |
|---|---|---|
| `tours` | jedna nekretnina | `slug` (ključ za URL), `title_i18n`, `category` (`sale`/`rent`/`booking`), `about_text_i18n` (kratka napomena, ≤2 rečenice), `faq_1..5_i18n`, `location_map_url`, `floorplan_url`, `agency_name`, `agent_*`, `address`, `city` (011), `structure`, `district` (012), `area_sqm`, `price` (013), `floor`, `has_elevator`, `has_basement`, `heating` (014), `build_status`, `finish_status` (015), `lat`, `lng` (016, geokodirano), `terrace`, `parking`, `deposit` (samo izdavanje), `registration` (samo prodaja) (017), `property_type`, `nadir_logo` (027), `status` (010, aktivna/izdato/prodato/pauza), **`published`** (007) |
| `rooms` | prostorija u turi | `tour_slug` (FK na `tours.slug`), `order_index`, `title_i18n`, `panorama_url_cf` (R2/CDN), `panorama_url_mobile` (018, 6000 px kopija za telefone; prazno = telefon uzima punu), `panorama_url` (stari Supabase URL), `preview_url` (004), `waypoints_i18n`, `establish_i18n`, `floorplan_x/y` (003) |
| `contact_requests` | upiti sa forme | `name`, `contact`, `package`, `agency`, `listing_type`, `size`, `message` (prvi red može biti „Željeni termin: ..."), `source` (`landing`, `landing_en`, `agencije`, `investitori` = `/za-investitore`, `novogradnja` = upit za stan; tada je u `agency` naziv projekta, a u `package` oznaka stana) |
| `projects` | projekat novogradnje (019) | `slug`, `title`, `developer_name`, `address`, `city`, `move_in` (tekst), `description`, `contact_phone/email`, `facade_url` (ZASTARELO od 025, ne piše se), `published`, `notify_sales` (020) |
| `project_floors` | sprat (019) | `project_id`, `building_id` (025; null = bez lamela), `level` (0 = prizemlje, jedinstven po lameli - indeks `project_floors_building_level_key` sa `coalesce`), `label`, `polygon` (ZASTARELO od 025), `plan_url` (osnova), `view_tour_id` (pogled sa sprata → `tours.id`) |
| `project_buildings` | lamela kompleksa (025) | `project_id`, `name` (1–40), `sort`. Prazno = jedna zgrada |
| `project_views` | slika projekta (025) | `kind` (`site` = kompleks iz vazduha, `building` = fasada), `building_id` (null kod `site` i kod projekta bez lamela), `label` („Ulica“), `image_url`, `sort` (redosled rotacije) |
| `project_view_shapes` | oblik na slici (025) | `view_id`, `project_id`, tačno jedno od `building_id` / `floor_id` / `unit_id` (check `num_nonnulls = 1`, unique po slici), `polygon` |
| `project_units` | stan (019) | `floor_id`, `code` (jedinstven u projektu), `structure`, `area_sqm`, `terrace_sqm`, `orientation`, `price`, `status` (`available`/`reserved`/`sold`), `polygon` (oblik na osnovi), `tour_id` (→ `tours.id`), `sort` |
| `project_sales_links` | link za prodaju (020) | `project_id`, `person_name`, `token_hash` (SHA-256; sam kod se ne čuva), `last_used_at`, `revoked_at` |
| `project_inquiries` | upit za stan (021) | `project_id`, `unit_id`, `unit_code`, `name`, `contact`, `message`, `embedded`, `lang`, `handled_at`, `handled_by` (prodaja: „javio/la sam se") |
| `projects` (022) | lokacija i okolina | `lat`, `lng`, `nearby` (JSONB `[{cat,name,lat,lng,m}]`), `nearby_updated_at` |
| `project_notes` | kratka beleška prodaje (023) | `unit_id` ILI `inquiry_id` (jedinstveni), `text` (1–120), `important`, `author`, `updated_at`. RLS bez policy-ja - posebna tabela upravo zato što anon čita `project_units` |
| `project_progress` | gradilište po mesecima (021) | `project_id`, `month` (1. u mesecu, jedinstven), `tour_id`, `note` |
| `project_unit_changes` | istorija statusa i cena (020) | `unit_id`, `unit_code`, `link_id`, `actor` (ime iz linka ili `Admin`), `field` (`status`/`price`), `old_value`, `new_value` |
| `agency_branding` | logo agencije (027) | `agency_name` (ključ, tačno kao `tours.agency_name`), `logo_url` (R2 `agencije/...`), `updated_at`. Anon čita; upis samo kroz `/api/admin/agency-logo` |
| `tour_events` | analitika tura | `tour_slug`, `event_type` (`open`, `start`, `room_view`, `share`, `contact`), `session_id`, `room_id`, `duration_ms`, `lang` |
| `site_events` | analitika početne (008) | `event_type` (`page_view`, `cta_click`, `contact_click`, `form_submit`), `target`, `session_id`, `device`, `source` |

**Tabela osnovnih podataka u turi** (migracije 012–015 i 017: `structure`, `district`, `area_sqm`, `floor`, `has_elevator`, `has_basement`, `heating`, `build_status`, `finish_status`, `terrace`, `parking`, `deposit`, `registration`) namerno **nema i18n kolone**. Agent u `/unos` bira sa zatvorene liste (vidi `app/lib/propertyTaxonomy.ts`) ili kuca broj/tekst; AI to ne dodiruje. Prevod na EN/DE/RU radi statički rečnik u `app/tour/[slug]/translations.ts` (`FACT_LABELS`, `STRUCTURE_LABELS`, `HEATING_LABELS`, `BUILD_STATUS_LABELS`, `FINISH_STATUS_LABELS`, `TERRACE_LABELS`, `PARKING_LABELS`, `DEPOSIT_LABELS`, `REGISTRATION_LABELS`). Struktura se posetiocu uvek prikazuje kroz `structureLabel()` („Dvosoban (2.0)" → „Dvosoban"); u bazi i u `?struktura=` ostaje pun naziv — proširiti listu u `propertyTaxonomy.ts` znači dodati i prevod tamo, za sva 4 jezika, inače nova vrednost ostaje neprevedena na EN/DE/RU (i dalje se prikazuje, samo na srpskom).

### Višejezični sadržaj (JSONB)

Polja `*_i18n` su objekti po jezicima: `{ "sr": "...", "en": "...", "de": "...", "ru": "..." }`. Stariji redovi ih ponekad imaju kao **JSON string**, pa čitanje uvek ide kroz pomoćne funkcije (`pickLang`, `getLocalizedText`, `parseWaypoints`). Ako prevod nedostaje, prikazuje se srpski.

- **Waypoint** (tačka u panorami): `{ yaw, pitch, type: 'navigation' | 'info', targetRoomId?, title_i18n, text_i18n, audio_url_i18n? }`
- **Establish** (uvodna naracija sobe): `{ text_i18n, fromYaw?, pitch?, audio_url_i18n? }`
- **Koordinate** (Pannellum): `yaw = (x / širina − 0.5) · 360` (−180..180), `pitch = (0.5 − y / visina) · 180`. Pannellum vraća **[pitch, yaw]**, ne [yaw, pitch].

### RLS i ključevi

- **anon** (javni ključ) čita **samo objavljene** ture (`published is true`) i njihove sobe, i sme da upisuje u `contact_requests`. Ne vidi analitiku.
- **authenticated** (prijavljeni admin) čita sve, a u `rooms` i piše. Zato javna registracija na Supabase projektu **mora ostati isključena**.
- **service role** (samo na serveru) zaobilazi RLS. Koriste ga API rute i admin rute posle `requireAdmin`.
- **Novogradnja:** anon čita `projects` / `project_floors` / `project_units` / `project_buildings` / `project_views` / `project_view_shapes` samo za **objavljen** projekat. Za te tri tabele nema policy-ja za upis; `project_sales_links` i `project_unit_changes` nemaju nijedan policy (Supabase savetnik to javlja kao INFO — namerno). Sve izmene idu kroz server rute sa service role ključem.

### Tipovi baze

`types/supabase.ts` pravi `npm run db:types` (`scripts/gen-db-types.mjs`) iz **žive baze sajta**, samo čitanjem. Pokreće se posle svake nove migracije. Supabase CLI (`supabase gen types`) se ovde NE koristi: baza je premeštena na poslovni nalog, a CLI na ovom računaru je i dalje prijavljen na stari nalog (projekat „360-tura"), pa daje pogrešne tipove. Kastovi `as '*'` ostaju samo tamo gde se lista kolona slaže iz promenljive.

### Migracije

`supabase/migrations/NNN_naziv.sql` se pišu tako da ih je **bezbedno pokrenuti više puta** (`if not exists`, `drop policy if exists`). Do 018 ih je vlasnik pokretao ručno u Supabase SQL editoru. **019–027 je pustio agent preko Supabase MCP alata** (`apply_migration`) — MCP vidi živu bazu sajta, za razliku od CLI-ja (§5 Tipovi). Posle svake migracije: `get_advisors` (security), `npm run db:types`. Migracija koja menja ili briše postojeće podatke ide tek uz izričitu potvrdu vlasnika; čisto dodavanje tabela/kolona je dogovoreno uz zadatak.

---

## 6. Mediji (R2)

- Panorama sobe: `<roomId>-panorama.webp` (WebP, **puna rezolucija**; smanjivanje bi pokvarilo zumiranje), u folderu ture
- Kopija za telefone: `<roomId>-panorama-m.webp` (6000×3000; ~72 MB u memoriji telefona umesto ~128 MB). Pravi je `/api/upload-panorama/finish`; brisanje sobe ili panorame briše i nju. Telefon = `(pointer: coarse)` ili širina < 1024 (`panoramaUrlFor` u `transition.ts`).
- Sličica sobe: `<roomId>-preview.jpg` (1200×630, isečak oko horizonta; za OG i početnu)
- URL-ovi se u bazu upisuju sa `?v=<vreme>`, da CDN posle zamene ne vraća staru sliku.
- Novogradnja: `projekti/<projectId>/facade-<vreme>.<ext>` i `.../plan-<vreme>.<ext>` (presigned PUT iz `/api/admin/projects/upload`; pregledač pre slanja smanji sliku na ~3 MB). Zamenjena slika ostaje na R2 (namerno, da projekat nikad ne ostane bez slike) — kandidat za čišćenje, uvek suvim hodom.
- ⚠️ Folderi **`Maglicka/`** i **`Slavisa -booking/`** u bucketu sadrže **originalne panorame** na koje nijedan red u bazi ne pokazuje. To **nisu siročići** i **nikad se ne brišu**. Pri čišćenju R2 briše se samo po tačnom obrascu ključeva soba, uvek prvo suvim hodom.

---

## 7. Tura (`/tour/[slug]`)

- Klijentska komponenta. Tura i sobe se učitavaju paralelno, a susedne panorame se unapred skidaju.
- Početni ekran ima izbor jezika, „Istražite sami" / „Automatsko vođenje" i prozor „Kako radi 360° tura?" (4 slikovna koraka sa pravim `.k360-hs-beacon`, zatvara se na ×). Posle starta Pannellum prikazuje sobu, radi uvodna naracija (establish), pa tačke (waypoints). Ručni povratak u već obiđenu sobu **ne ponavlja** priču.
- Moduli (donja traka): **Plan** (tlocrt sa uvodom `planIntroTitle/Text` da je to mapa stana; bez spiska soba), **Lokacija** (Google mapa u iframe-u), **Info** (hero kartica + ključne činjenice + redovi: grad, ulica, cena, cena po m², ostalo iz `buildFactList()` u `utils.tsx`; opciona napomena `about_text_i18n`), **Pitanja** (FAQ 1–5, u dnu jedan red sa okruglim dugmadima poziv/mejl), **Kontakt** (agent, poziv, mejl, „Zakaži razgledanje"). Svaki modul u dnu ima diskretan potpis „360° turu izradio Kvadrat360" → `SITE_URL/?utm_source=tura&utm_medium=potpis&utm_campaign=<slug>`.
- Gornji deo: jezici kao čipovi (namerno vidljivi svi, ne padajuća lista — odluka vlasnika), kartica naslova sa dugmetom za **deljenje** (Web Share). Na računaru traka soba stoji u vrhu, mala mapa levo. Umesto „Pozovi" je **dugme za poruku agentu** (`ChatAgentButton`, 1. 10. 2026): Viber na srpskom, WhatsApp na ostalim jezicima, poruka već započeta sa linkom ture; broj iz `agent_phone` ide kroz `phoneToE164` (broj sa nulom = Srbija). Samo u automatskom vođenju i tek kad se završe priča i info-tačke sobe (`roomTalkDone` iz `roomSequence.ts`), do ulaska u sledeću sobu.
- **„Istražite sami" (guideMode 'manual'):** `isModalToolbarVisible` je uvek true, a InfoCard dobija `raised` i stoji iznad menija (`ABOVE_MENU_BOTTOM` u theme.ts). U `runRoomSequence` ručni režim ne pokreće priču: pogled se postavi na establish, uvod sobe se prikaže u kartici (ne menja se sam; posle odslušanog snimljenog glasa se sama skloni - `closeWhenDone` u `playNarration`, isto i za info-tačku na dodir; bez snimka stoji dok se ne zatvori), soba se odmah računa kao završena; info-tačke govore tek na dodir, svaka sa svojim naslovom. Prvi pointerdown/touchstart/wheel u `#panorama` (capture) dok traje priča sobe (`takeOverStory` u page.tsx) prekida je: `isInterruptedRef`, `stopCurrentAnimation`, soba se računa kao završena. U 'auto' režimu ništa od ovoga ne važi. Na telefonu (<1024px, `useNarrowScreen`) kartica i meni su jedna ploča: InfoCard `docked` (naziv + tri reda + „Više" ispod, donji razmak `MENU_HEIGHT`), TourMenuBar `joined` (bez sopstvenog stakla, sedi u dnu kartice). Dok se prstom vuče panorama, kartica se sklanja, a meni postaje `compact` (niža traka, samo uvećane ikonice 27 px, bez naziva); nazivi se vraćaju zajedno sa ostalim UI.
- **InfoCard** (naracija / info-tačka): naslov + 2 reda, „Više/Manje" samo kad tekst ne staje (ResizeObserver).
- **Titlovi** (`NarrationSubtitles`): u automatskom vođenju, dok se čuje snimljeni glas, umesto InfoCard ide samo rečenica koja se izgovara, a iznad nje plavi talas i naziv tačke (ili sobe, za uvod). Naziv i titl su jedna ploča. Na telefonu ona dok glas priča stoji skroz u dnu, a donji meni se za to vreme skloni (`isModalToolbarVisible = !(isNarrow && showSubtitles)`, vlasnik 1. 10. 2026) i vraća se čim glas završi; na računaru su titl i meni jedna ploča (`NarrationSubtitles joined` + `TourMenuBar joined`, vlasnik 1. 10. 2026). Naziv i titl (17 px) su centrirani, kao na filmu. Dok idu titlovi nema dugmeta za poruku agentu. Rečenica se bira srazmerno dužini teksta po `getAudioClock()` iz `useTourNarration`. Kad glas završi, titl nestaje i kartica se ne vraća. Isključen zvuk, jezik bez snimka ili ručni režim = InfoCard.
- **Veličine dodira:** okrugla dugmad 44 px, pilule 36 px sa `.k360-tap` (nevidljivo `::after` −4px proširuje metu). Na računaru ceo UI ture ima zoom 1.122.
- **Telefon:** dok se prstom vuče panorama (>12 px), gornji UI se sklanja (`is-immersive`) i vraća 2,2 s posle puštanja (`IMMERSIVE_RESTORE_MS`, običan dodir ne skriva ništa); dugme za ceo ekran i žiroskop se prikazuju samo gde rade (iPhone nema fullscreen).
- **Dugme „nazad"** (`useBackGuard`): jedan `{k360Guard:true}` korak istorije. Nazad zatvara redom: zakazivanje → modul → InfoCard; ako ništa nije otvoreno, `LeaveTourDialog` („Da li želite da napustite turu?"); drugo nazad izlazi. Bez strane pre ture ide na `/`. Admin ga nema. Next 16 zadržava `__NA` u stanju istorije — ne dirati `history.state` ručno van ovog hook-a.
- **Kretanje kamere (30. 9. 2026):** prelaz kroz vrata otvara sobu **u smeru kretanja** (`entryViewFor` = povratna vrata ciljne sobe + 180°, ili ručni `targetYaw`), pa se kamera posle `ENTRY_HOLD_MS` = 1 s mirnog gledanja napred glatko okrene ka najlepšem kadru (`glideToEstablish` u `roomSequence.ts`) — smer ulaska je samo spoj dve slike, ne ostaje se na njemu (iz sredine sobe ume da gleda u zid). Svi okreti imaju trajanje srazmerno uglu, ~45°/s (`turnMsFor`/`TURN_DEG_PER_S` u `transition.ts`): info-tačka 1,5–4 s, prilaz vratima 2,5–4 s, okret po ulasku 1,2–3,5 s. Ponovni prolaz vodiča kroz već ispričanu sobu nema sopstveni okret — posle `GUIDE_REVISIT_SETTLE_MS` (700 ms) odmah kreće prilaz sledećim vratima, koji sam okreće kameru (ranije dupli okret, više takvih soba zaredom izgledalo je kao vrtenje).
- **Ravan horizont i vrata koja svetle (30. 9. 2026):** svako kruženje vodiča (uvod, čekanje pred vratima, slobodno razgledanje) ide na `LEVEL_PITCH` = 0 (`transition.ts`); pogled ka info-tački i prilaz vratima i dalje smeju da se nagnu. Vrata ka sledećem koraku vodiča dobijaju klasu `k360-next-door` (plavi far koji diše, `TourOverlays.tsx`) od poslednje rečenice poslednje priče u sobi (`lastCueStartFraction` iz `subtitleCues.ts` + `getAudioClock`), a bez zvuka od kraja priče; skida se čim vodič stane. Tačke nose `data-target-room` (page.tsx). Učitavanje unapred već postoji (`useNeighbourPreload`, 1,5 s po ulasku skida sve susedne sobe) — izmereno: sledeća soba se pri prelazu učita iz keša za ~14 ms.
- **Prolaz kroz vrata (1. 10. 2026):** prilaz ide ravno (`LEVEL_PITCH`) i manje duboko (`WALK_HFOV` 40, bilo 32 - mutilo se); nova soba se pojavi na `ENTRY_START_HFOV` 44 (bilo 60 - skok unazad), pretapanje traje `FADE_MS` 900 (bilo 550), a nova soba se za to vreme lagano raširi na `ARRIVE_HFOV` 56 (`ENTRY_WIDEN_MS` 2,4 s, `v.on('load')` u page.tsx).
- **Ulazak u sobu, glatko (1. 10. 2026):** okret ka kadru priče ide sporije (`ARRIVE_GLIDE_DEG_PER_S` = 30, 1,8–5 s), a kruženje posle njega uvek ide istim, starim smerom (vlasnik je odbio praćenje smera okreta) i ne kreće naglo: `easeAutoRotate` u `roomSequence.ts` menja `viewer.getConfig().autoRotate` postepeno (`ROTATE_RAMP_MS` = 1,5 s) od nule do pune brzine, a pred kraj faze nazad do nule. Izmereno: okret do ~56°/s, pad na ~0, kruženje 0→17°/s. Uvodna priča sobe (i odbrojavanje faze kruženja) kreće tek kad kamera stigne do početnog kadra (`arrivalMs` = zadržavanje + okret), u oba režima.
- **Kraj priče u sobi (30. 9. 2026):** vodič se najkraćim putem (`turnMsFor`) okrene ka vratima koja svetle, ravno i odzumirano, zadrži se `DOOR_HOLD_MS` = 2,5 s, pa prilaz (`finishRoomSequence` u `roomSequence.ts`). Pažnja: Pannellum `startAutoRotate` sa pozitivnom brzinom SMANJUJE yaw — stari kod je zato kružio od vrata. Poslednja soba i dalje mirno kruži 7 s.
- **Žiroskop (2. 10. 2026):** koristi Pannellum-ov `startOrientation`, sa tri naše izmene u `scripts/patch-pannellum.mjs` (pokreni skriptu posle izmene, ne menjaj `public/vendor/pannellum-2.5.6-k360.js` ručno): ublažavanje šuma senzora (pogled stiže do ugla telefona za ~70 ms), dodir više ne vraća nagib naglo na 0, posle dodira žiroskop hvata posle 3 očitavanja umesto 10. Dodir i dalje gasi žiroskop dok traje prevlačenje, a `handlePanEnd` u page.tsx ga pali posle podizanja prsta (pogled ostaje gde ga je posetilac doveo). Isključivanje dugmetom lagano vraća horizont na ravno (`settleRoll` u `useViewerControls.ts`). Na http/localhost Pannellum ne nudi žiroskop (traži https i mobilni UA) - pravi test samo na telefonu.
- **Ekran se ne gasi** dok automatski vodič radi: `useScreenWakeLock` (Screen Wake Lock API; Chrome/Android, Safari od iOS 16.4), traži se ponovo posle povratka u aplikaciju, pušta se na pauzu, ručni režim i kraj obilaska. Gde API ne postoji, ništa se ne menja.
- **Video iz ture (1. 10. 2026, Premium „Kratak video iz ture za Instagram i Facebook"):** dugme „Video" u spisku tura u adminu (`/admin/ture`, pored „Iframe" i „QR") otvara `app/admin/ture/TourVideoLauncher.tsx`, koji učita turu i sobe pa otvori `video/TourVideoModal.tsx` (do 1. 10. 2026 je dugme bilo u admin traci ture). Uspravni MP4 1080×1920, 30 fps, H.264, pravi se potpuno u pregledaču (Chrome): `videoPlan.ts` (redosled = putanja vodiča bez ponavljanja, najviše 8 soba; uvodna kartica iz `buildFactList`; titl = prva rečenica uvoda sobe; kraj = QR ka turi, agencija, telefon + Viber/WhatsApp), `panoRenderer.ts` (sopstveni WebGL2 prikaz equirect panorame sa mipmapama, kopija od 6000 px), `videoFrame.ts` (crta kadar za tačno vreme t - ne snima ekran, pa je glatko na svakom računaru), `videoEncode.ts` (WebCodecs + biblioteka `mediabunny` → MP4, učitava se tek na klik). Agencija sa logom (`agency_branding`, 027) dobija logo na beloj pločici na uvodnoj kartici (umesto znaka i naziva) i na završnoj ispod QR koda (umesto naziva) - `drawLogoBadge` u `videoFrame.ts`, logo se učitava sa CDN-a uz CORS; bez loga ostaje naziv. Ništa se ne otprema; ~35 s videa za ~20 s rada, ~16 MB. Bez zvuka u prvoj verziji.
- **Logo na mestu stativa (6. 10. 2026):** `NadirLogo.tsx` crta beli krug sa logom agencije tačno iznad nadira (dno panorame), kao sloj preko panorame, ne u slici - logo se menja bez ponovne obrade. Uvek okrugao i uspravan (vlasnik nije želeo istezanje kao pod), prati zum; pojavljuje se od 40° pogleda nadole, ceo od 50° (`SHOW_FROM`/`SHOW_FULL`) - vodič spušta kameru do ~34°, pa ga u kadrovima vodiča nema. Logo dolazi iz `agency_branding` po `agency_name` (`useTourData`, naknadno, ne drži otvaranje); bez loga agencije = Kvadrat360 znak (`/brand/kvadrat360-icon.svg`). Otpremanje: `/admin/ture` → „Agencije: logo i izveštaji" → „Dodaj logo" (`AgencyLogoButton.tsx`, PNG/SVG/WEBP/JPG do 2 MB), važi za sve ture agencije. Opciono po turi: `tours.nadir_logo` (027, podrazumevano uključeno), polje „Logo na mestu stativa" u izmeni ture - isključuje se kad klijent ne želi logo.
- **Fontovi:** naslovi u turi su **Urbanist** bold; kurziv sa serifima samo na sajtu.
- Dodaci: auto-rotacija, žiroskop na telefonu, zvuk.
- **`?lang=en|de|ru`** otvara turu na tom jeziku, ako ga tura ima.
- **Admin režim:** prijava preko `?admin=1`; sesija se posle pamti. Admin alati su u `TourAdminTools.tsx` (dugmad se ubacuju u gornju traku preko portala), a uređivanje tačaka je u `useHotspotEditor.ts`.
- Neobjavljena tura vraća „tura nije pronađena" svima osim adminu.

---

## 8. API rute

| Ruta | Zaštita | Šta radi |
|---|---|---|
| `POST /api/contact` | 5 zahteva / 10 min po IP-u | Upit sa forme → `contact_requests` + Telegram (termin, oznaka EN strane) |
| `POST /api/viewing-request` | 5 zahteva / 10 min po IP-u; samo objavljena aktivna tura | „Zakaži razgledanje" iz ture → `contact_requests` (`source = tour:<slug>`) + **email agentu** (`agent_email` ture, Resend, `app/lib/email.ts`; 7. 10. 2026) + Telegram kopija vlasniku sa redom da li je email otišao (ako nije - „prosledite mu zahtev") |
| `POST /api/client-error` | 10 / 10 min po IP-u, botovi se odbacuju, ista greška najviše 1×/h | Greška iz pregledača (`lib/reportError.ts`) → Telegram vlasniku + Vercel log |
| `GET/POST /api/admin/floorplan` | `requireAdmin` | Raspored šematskog plana (sačuvan ili nov nacrt) / čuvanje plana u turu |
| `POST /api/track` | 120 / min, botovi se odbacuju | Događaji tura (`tour_events`) i, uz `scope: 'site'`, početne (`site_events`) |
| `POST /api/unos` | kod `FORM_ACCESS_CODE`; 10 slanja / h; 5 pogrešnih kodova / 15 min | Upitnik agenta → Gemini nacrt → neobjavljena tura |
| `GET/POST/PATCH/DELETE /api/admin/tours` | `requireAdmin` | Spisak, nova tura, izmena (uklj. FAQ, geokodiranje), objava, brisanje (sa R2 fajlovima). Posle izmene osvežava `/`, `/en`, `/ture`, `/za-agencije` i sitemap (`lib/revalidatePublic.ts`) |
| `POST /api/upload-panorama` + `POST .../finish` | `requireAdmin` | Presigned R2 PUT (Vercel prima najviše 4,5 MB), pa `finish`: WebP + sličica + kopija za telefone → `rooms`. `DELETE` briše panoramu sobe (i `-m.webp`) |
| `DELETE /api/admin/rooms` | `requireAdmin` | Brisanje sobe sa panoramama i strelicama koje vode u nju |
| `POST /api/upload-to-r2` | `requireAdmin` | Migracija panorame sa starog Supabase URL-a na R2 |
| `POST /api/ai/auto-populate-room` | `requireAdmin` | `generate_draft` (Gemini gleda panoramu i predlaže naziv, tekst i tačke), `translate_step` (prevodi); `generate_voice` (ElevenLabs `eleven_v4` → kanta `narrations`, vraćeno 1. 10. 2026) |
| `GET /api/analytics` | `requireAdmin` | Zbir za admin analitiku (ture i početna) |
| `GET/POST /api/admin/projects` | `requireAdmin` | Novogradnja. GET = spisak / ceo projekat (`?id=`). POST `action`: `create`, `update`, `delete`, `preview-link`, `floor-save`, `floors-add`, `floor-copy`, `floor-delete`, `unit-save`, `unit-delete`, `units-import`, `sales-list`, `sales-link-create`, `sales-link-revoke`. Izmene statusa/cene upisuje u istoriju kao `Admin`; osvežava `/novogradnja/<slug>` |
| `POST /api/admin/projects/upload` | `requireAdmin` | Presigned R2 PUT za fasadu ili osnovu (do 25 MB) |
| `GET/POST /api/prodaja/[token]` | važeći neugašen link; 120 GET i 60 POST / min po IP-u | Strana za prodaju: GET sveži podaci, POST menja JEDAN stan (`unitId`, `status`, `price`, `expected`) ili `action: 'inquiry-handled'` (`inquiryId`, `handled`). Ako `expected` ne odgovara bazi → 409 sa novim stanjem (ne gazi tuđu izmenu). Istorija + Telegram (`notify_sales`, samo prodat/rezervisan) |

Nova ruta koja menja podatke **mora** imati `requireAdmin` ili ograničenje broja zahteva. Tajne se nikad ne vraćaju klijentu.

---

## 9. AI (Gemini)

- `lib/gemini.ts`: glavni model `gemini-3.1-flash-lite`, rezervni `gemini-flash-latest` (alias; stari `gemini-3.1-flash` ne postoji i davao je 404, pa rezerva do 27. 9. 2026 nije radila). Spisak dostupnih modela: `GET https://generativelanguage.googleapis.com/v1beta/models`.
- **AI popuna sobe** (`generate_draft`) radi obrnuto: glavni je Flash (bolje čita sliku), Lite je rezerva, temperatura `TEMP_GROUNDED` (0.35). Server sam čita kontekst iz baze (`loadRoomContext`): naziv sobe (ostaje kakav je admin dao), podatke o stanu i ostale sobe sa njihovom naracijom, da ne izmišlja raspored i da ne ponavlja uvode. Tačke: model vraća pravougaonik `box_2d` ([ymin, xmin, ymax, xmax], 0–1000), a yaw/pitch računa kod iz centra (`boxToAngles`); preveliki okviri i tačke bliže od 12° se odbacuju. Na probi na 3 sobe sve nove tačke su pale na predmet, stare uglavnom pored.
- **„Proveri i ispravi"** (`review_draft`, ista ruta): AI lektor u prozoru za pregled drafta, pre prevoda i glasa. Vraća predloge (ceo novi tekst polja + razlog), koje admin prihvata ili odbacuje, i napomene „proveri" za tvrdnje koje ne vidi na slici. Sam ništa ne menja. Ograničenja dužine, prazne pohvale i zamke za glas su u `lib/roomDraftRules.ts`: po njima AI piše, lektor proverava, a prozor broji znakove i pali upozorenja dok se kuca. `generateWithRetry` ima timeout, 2 pokušaja i ponavlja na 429/500/503. `readResponseText` baca grešku ako je odgovor odsečen (MAX_TOKENS) ili prazan.
- Temperature: `TEMP_EXTRACT = 0.2` (izvlačenje podataka), `TEMP_DESCRIPTIVE = 0.6` (opisni tekst).
- Nacrt sobe dobija tip oglasa ture (`listingType`); ograničenja su 3 reči za naziv tačke, 180 znakova za tekst tačke i 320 za naraciju.
- **Poznato i prihvaćeno:** AI i dalje ne postavlja tačke precizno u panoramu. Vlasnik to prihvata; ne popravljati bez njegovog zahteva.
- **Glasovna naracija (TTS) radi** od 1. 10. 2026: `handleGenerateVoice` u `app/api/ai/auto-populate-room/route.ts` (ugovor koji `TourAdminTools` šalje: `voiceLanguages`, `content.establishText`, `content.waypoints[]`; vraća `audio`, `errors`, `skipped`). Model `eleven_v4`, jedan glas `ELEVENLABS_VOICE_ID` za sve jezike (`ELEVENLABS_VOICE_ID_<JEZIK>` ima prednost), prazan prevod se preskače (ne pada na srpski), najviše 3 poziva odjednom, 2 pokušaja po segmentu, segment do 700 znakova. MP3 ide na `narrations/{slug}/{roomId}/establish-{lang}.mp3` i `.../waypoint-{i}-{lang}.mp3`. Na Vercel-u moraju postojati `ELEVENLABS_API_KEY` i `ELEVENLABS_VOICE_ID`. Ceo tok teksta, prevoda i glasa: skill `.claude/skills/tura-tekst-prevod-naracija`.

---

## 10. Početna strana

- **Jedan raspored, dva jezika:** `app/HomePage.tsx` + tekst iz `lib/homeCopy.ts` i `lib/homeFaq.ts`. Nova rečenica se dodaje **u oba jezika**.
- Statična je i osvežava se na sat (`revalidate = 3600`), a odmah posle objave, skidanja ili izmene ture.
- **Ture (odeljak "Ture", `#primeri`)** i **kadar u vrhu** su prave objavljene ture (`showcaseTours.ts`). Na `/en` prednost ima tura koja ima engleski. Posle prikazanih tura stoji traka koja najavljuje kompletnu bazu sa filterima i vodi na `/ture`.
- **Cene:** samo u `lib/pricing.ts`. Od 27. 9. 2026 cenovnik (`components/Pricing.tsx`, isti na početnoj SR/EN i na `/za-agencije`) ima tri dela: dva paketa **Osnovni / Premium** sa cenom za jednu nekretninu (tura + HDR, ispod piše od čega se sastoji), tabelu obima (1–2 → 70 €, 3–4 → 62 €, 5–9 → 55 €, 10+ → 48 € za Osnovni) i jedan red „samo tura / samo fotografije". Premium je **uvek isti dodatak na turu** (15 € = 2.000 din., pretvara se zasebno pa je razlika ista na svakom stepenu) i donosi: 4 jezika, izradu plana, prednost pri zakazivanju, isporuku za 24h, QR kod i kratak video iz ture za Instagram (video vlasnik zasad pravi ručno). Kalkulatora i „agencijskih paketa za 3 ture" više nema. Uvodna promocija (`PROMO` u `pricing.ts`) daje −30% na pakete do datuma u `PROMO.endDate`; HDR naručen **samostalno** (bez ture) se **nikad** ne spušta (`standaloneHdrPrice()`) - namerno, da se ne isplati poručiti samo fotografije.
- **/ture:** spisak svih objavljenih tura. Vrsta oglasa je segmentirano dugme (`tl-seg`), ostali filteri (grad, naselje, struktura, agencija, kvadratura, cena) su jedna traka polja (`tl-bar`) sa iskačućim menijem (`FieldPopover`) i čipovima aktivnih filtera. Na računaru (≥ 861 px) Leaflet mapa stoji desno od filtera (`tl-top`), kartice idu 4 u redu; na telefonu dugme „Filteri". `components/TourList.tsx` + `TourMap.tsx` + `FilterMenu.tsx` + `RangeFilter.tsx`, stil u `lib/siteStyles.ts`. Adresa filtera: `?kategorija=&grad=&struktura=`.
- **Pretraga na početnoj** (`db-teaser`) je obična GET forma ka `/ture` sa istim parametrima.
- **Vizuelni potpis „reflektor i mreža"** (od 27. 9. 2026): hero, sive (`.band`), tamne i plave sekcije, podnožje i zaglavlja modula ture imaju svetlo odozgo i finu mrežu kvadrata koja bledi ka dnu. Jedan recept u `siteStyles.ts` (odeljak REFLEKTOR I MREŽA), blok menja samo `--k-*` promenljive. Glavno dugme je plavi prelaz sa svetlom ivicom; sporedno na tamnom/plavom je „staklo". Brojevi poglavlja su u kvadratu. Kartice tura: svetlo prati miš (`components/CardSpotlight.tsx`). U turi: `MODAL_BACKGROUND` u `TourModals.tsx`.
- **`/za-agencije` je levak** (28. 9. 2026): vrh → nedelja → kupčeva priča (zbijena, sa pozivom na kraju) → brojke iz sveta → vlasnik → kompaktna plava traka sa cenom (`midCta`, `FromPrice`) → kako radimo (+ kod za sajt) → cene → pitanja → kontakt. Forma je `ContactForm variant="agency"`: ime, kontakt, agencija, broj nekretnina mesečno (ide u polje `package`), poruka. Upit dobija `source = 'agencije'` i red „🏢 Sa strane za agencije" na Telegramu.
- **Promo traka** (`PromoBanner`): veliki procenat, cena, odbrojavanje dani · sati (`usePromoMinutesLeft`, osvežava se u minuti) i dugme ka formi.
- **Prelomi:** kratke naglašene fraze (≤24 znaka) se ne lome (`.keep` iz `lib/accent.tsx`, od 640px), pasusi imaju `text-wrap: pretty`.
- **Moduli ture kao benefiti:** meni se sam smenjuje dok je traka na ekranu (staje na prvi klik), sa tačkama na neviđenim dugmadima i brojačem „X od 5 pogledano".
- **Moduli ture kao benefiti (tekst):** `TourModulesShowcase` (početna i `/za-agencije`), tekst u `homeCopy.ts`.
- **Forma:** vrednosti polja (paket, tip) stižu **na srpskom** i sa engleske strane. Na Telegramu ide oznaka „🌐 Sa engleske strane".
- **/ture i pretraga:** dok je objavljeno manje od `TOUR_FILTERS_FROM` (10, `lib/showcaseTours.ts`) tura, `/ture` je „Primeri tura" bez filtera i mape, a mini-pretraga na početnoj se ne prikazuje. Iznad toga se sve uključuje samo.
- **Merenje:** element sa `data-track="cta:cilj"` ili `data-track="contact:cilj"` se broji sam (`SiteTracker`). Novi cilj treba dodati i u `TARGET_LABELS` u `admin/analitika/page.tsx`. Posete admina se ne broje (proverava se ključ `sb-*-auth-token` u localStorage). Uređaj vlasnika bez prijave: `?ne-brojim` upisuje `k360_ne_brojim` u localStorage i tada se ne šalje ništa ni za sajt ni za ture (`isOwnerDevice` u `app/lib/track.ts`); `?brojim` briše.
- **Kontakt na telefonu:** `ChatBubble` (samo ≤760px, dole desno) — Viber na SR, WhatsApp na EN; sklanja se kad je `#kontakt` na ekranu. Dugmad paketa u `Pricing` nose `data-package`, pa `ContactForm` pri kliku bira isti paket u formi. Forma na početnoj pokazuje samo ime, kontakt i paket; tip oglasa, kvadratura, agencija, termin i poruka su u sklopljenom `<details className="form-more">` („Dodatni detalji (opciono)") i šalju se i kad je zatvoren.
- **Brojač** „X+ otvaranja tura" se pojavljuje sam tek od 500 otvaranja (`lib/tourStats.ts`).
- **SEO:** hreflang sr/en/x-default, JSON-LD, sitemap sa `/en`, posebna OG slika za `/en`.
- **Performanse:** Pannellum se učitava samo na turi; fontovi idu sa našeg domena (`next/font`), bez Google Fonts CSS-a.

---

## 11. Promenljive okruženja

Samo imena. **Vrednosti se nikad ne upisuju u kod, dokumente ni poruke.** Stoje u `.env.local` lokalno i u Vercel → Settings → Environment Variables.

| Promenljiva | Za šta |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase, javni pristup |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase sa punim pravima (samo server) |
| `ADMIN_EMAILS` | lista email-ova sa admin pravima (zarezom odvojeni) |
| `GEMINI_API_KEY` | Google Gemini |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET_NAME` | Cloudflare R2 |
| `NEXT_PUBLIC_CDN_URL` | javni CDN ispred R2 |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | obaveštenja o upitima |
| `RESEND_API_KEY`, `EMAIL_FROM` | email agentu za zahtev za razgledanje (resend.com; domen kvadrat360.com mora biti potvrđen u Resend-u). `EMAIL_FROM` opciono, podrazumevano `Kvadrat360 <razgledanje@kvadrat360.com>`. Bez ključa zahtev i dalje radi, samo stiže vlasniku na Telegram |
| `FORM_ACCESS_CODE` | kod koji agencija unosi u `/unos` |
| `NEXT_PUBLIC_SITE_URL` | opciono; menja kanonski domen (npr. za staging) |
| `REPORT_LINK_SECRET` | opciono; ključ za potpis linkova izveštaja agencija **i linkova za pregled projekta**. Bez njega se izvodi iz service-role ključa. Promena poništava sve poslate linkove. (Linkovi za prodaju ne zavise od njega — to su nasumični kodovi čiji je otisak u bazi.) |

`FORM_WEBHOOK_SECRET` iz `.env.local` se više ne koristi (stari Google Form tok je uklonjen).

---

## 12. Način rada

### Pravila vlasnika (obavezna)

1. **Nikad commit ni push dok vlasnik izričito ne napiše „pushuj"** (ili „push"). „Nastavi", „continue" i „ok" **nisu** dozvola za push.
2. Folder **`.claude/` nikad ne ide u commit.** Isto važi za `docs/cowork/` (repo je javan), `public/mockup/` i `welcome-screen.png`, osim ako vlasnik ne traži. (`public/mockup/` sadrži i odobrene mockupe novogradnje: `Novogradnja.html`, `Prodaja.html` — referenca za izgled.)
3. **Ne menjaj nazive tura** (`title` / `title_i18n`). To radi vlasnik u `/admin/ture` → Izmeni.
4. Pri brisanju **ne pravi rezervne kopije**, osim ako vlasnik to traži. Uvek prvo **suvi hod** i pokaži šta će biti obrisano.
5. R2 folderi sa originalima (§6) se ne diraju.
6. Tajne se u commitovanim fajlovima pominju **samo po imenu promenljive**.
7. Komunikacija je **na srpskom**, jednostavno i konkretno. Za veće izmene izgleda prvo mockup.

### Pre nego što kažeš „gotovo"

- `npx tsc --noEmit -p .` bez grešaka
- `npx next build` prolazi
- za UI: pokreni `npx next start -p 3100` i proveri u pregledaču (Playwright), na telefonu (400px) i računaru, u oba jezika. Pogledaj snimke ekrana.
- forme i analitiku testiraj sa **presretnutim** `/api/contact` i `/api/track`, da ne ode pravi upit u bazu i na Telegram.

### Commit i deploy

- Repo: `github.com/digimeisters/360-tura`, grana `main`; Vercel deployuje sam.
- Poruke commita na engleskom, jasne, sa `Co-Authored-By` redom koji traži okruženje. Na Windowsu poruku piši kroz Bash heredoc (`git commit -F - <<'MSG'`), ne kroz PowerShell here-string.
- Stanje deploya ne proveravaj učestalim `curl` pozivima ka sajtu, jer se tako upali Vercel Security Checkpoint. Umesto toga pitaj GitHub: `curl -s https://api.github.com/repos/digimeisters/360-tura/commits/<sha>/status` (Vercel tamo upisuje `pending` / `success` i opis). GitHub CLI (`gh`) nije instaliran.
- Ako Vercel ne primi push (nema statusa), prazan commit na vlasnikov „pushuj" ga pokreće.
- Windows: posle gašenja `next start` proces ume da ostane na portu. Ugasi ga po portu (`Get-NetTCPConnection -LocalPort 3100`).
- Posle pusha **proveri da je izmena stvarno živa** (npr. da traženi tekst postoji u živom JS-u) — Vercel je jednom preskočio deploy.
- Deo fajlova u `app/tour/[slug]/` ima CRLF kraj reda. Veće izmene radi skriptom u privremenom folderu (čita, normalizuje na LF, vraća CRLF), ne kroz `node -e` u komandnoj liniji: escape-ovanje tamo je jednom pretvorilo `\b` u backspace i srušilo `getTourMeta`.

---

## 13. Otvorene stavke i tehnički dug

**Čeka vlasnika**
- Registracija firme, pa naziv, PIB i MB u podnožju + strana „Politika privatnosti"
- Tekstovi za naraciju, pa vraćanje glasovne naracije (ElevenLabs je plaćen)
- 2–3 para fotografija (telefon / HDR), pa klizač „pre i posle" za HDR
- Dopuna podataka po turama (vlasnik sam upisuje, npr. depozit, terasa, parking; 3 ture imaju samo srpski)

**Predloženo, nije započeto** (samo na zahtev vlasnika)
- zahtev za razgledanje direktno agentu (mejl/SMS), ne samo vlasniku na Telegram
- link na tačnu sobu (`?soba=`)
- bogatija analitika (moduli, deljenja po kanalu)
- test na pravom iPhone-u i Android-u (dugme nazad, žiroskop, ceo ekran)

**Novogradnja — nije urađeno**
- mejl prodaji investitora za nov upit (sada: strana prodaje + Telegram vlasniku; mejl traži servis za slanje, npr. Resend, i novu promenljivu okruženja)
- nemački i ruski za stranu projekta (rečnik je spreman za proširenje u `lib/projectI18n.ts`)
- puštanje `/za-investitore` u javnost (meni, podnožje, sitemap, `llms.txt`, skinuti `noindex`) — kad bude prava tura dronom; tada i `PROJECT_PAGES_INDEXABLE = true` u `lib/projectMeta.ts` (sada su i objavljeni projekti `noindex`) + projekti u sitemap

**Tehnički dug**
- rate limit je u memoriji, pa na više Vercel instanci važi približno
- `/api/unos` još šalje fajlove kroz telo zahteva (limit 4,5 MB na Vercelu) — treba presigned R2 kao kod panorama
- novogradnja nema automatske testove; najosetljivije su čiste funkcije u `lib/projects.ts` (`parseUnitTable`, `parseLevels`, `unitSuffix`)
- stara greška lintera u `components/ContactForm.tsx` (`setDays` u efektu), nije od novogradnje

---

## 14. Recepti za česte zadatke

**Novi tekst na početnoj:** dodaj polje u `HomeCopy` tip i u **oba** objekta (`sr`, `en`) u `lib/homeCopy.ts`, pa ga iskoristi u `HomePage.tsx`. CSS početne je u `styles` stringu u `HomePage.tsx`; boje uzimaj iz tokena (`--ink`, `--accent`, ...), svetla i tamna tema su već definisane.

**Promena cena:** samo `lib/pricing.ts` (`PRICE_TIERS`). Proveri da kartice paketa i kalkulator pokazuju očekivano; ako se menja smisao paketa, prilagodi i tekst u `homeCopy.ts`.

**Nova kolona ili tabela:** nova migracija `NNN_...sql` (bezbedna za ponovno pokretanje, sa RLS-om) → vlasnik je pokrene → proveri iz koda. Dok se tipovi ne regenerišu, koristi kast.

**Nova admin ruta:** `const ctx = await requireAdmin(req); if (!ctx.ok) return ...`, pa radi sa `ctx.supabase` (service role). Klijent šalje `adminAuthHeader()`.

**Nova javna ruta:** `rateLimit(req, 'naziv', limit, prozorMs)` + `tooManyRequests(...)`; skrati dužine polja pre upisa.

**Nova činjenica u modulu Info** (kao terasa/parking u 017): migracija sa `text` kolonom → lista u `propertyTaxonomy.ts` → polje u `/unos` (+ `api/unos`) i `/admin/ture` (+ `api/admin/tours`) → red u `buildFactList()` (`utils.tsx`) → `FACT_LABELS` i rečnik vrednosti u `translations.ts` za sva 4 jezika → `npm run db:types`.

**Novi sloj u turi koji se zatvara** (modul, forma): dodaj ga u `closeTopLayer` koji `page.tsx` daje `useBackGuard`-u, inače ga dugme „nazad" preskače i odmah pita za izlazak.

**Novi klik za merenje:** dodaj `data-track="cta:naziv"` na element i `naziv` u `TARGET_LABELS` (admin analitika).

**Objava ture:** radi je vlasnik (`/admin/ture` → Objavi). Tura bez soba ne može da se objavi; pre objave treba proveriti da sve sobe imaju panoramu.

**Novo polje projekta novogradnje:** migracija (kolona u `projects`) → `ProjectRow` u `lib/projects.ts` → `PROJECT_FIELDS` u `api/admin/projects/route.ts` (dužina!) → `INFO_FIELDS` u `admin/projekti/[id]/page.tsx` → prikaz u `components/projekat/ProjectView.tsx` → `npm run db:types`.

**Test novogradnje bez prijave:** ubaci privremen projekat SQL-om (sa `notify_sales = false`, da Telegram ne pošalje lažnu poruku vlasniku), testiraj javnu stranu / `/prodaja` sa kodom čiji si otisak upisao, pa obriši projekat (kaskadno briše spratove, stanove, linkove i istoriju). Nikad ne testiraj na pravom projektu vlasnika.

---

## 15. Novogradnja (paket za investitore)

Od 2. 10. 2026. Ture i projekti su **odvojeni**: projekat na turu samo pokazuje (`tour_id`, `view_tour_id`), pa se `tours`/`rooms` ovde nikad ne menjaju.

- **Oblici** (`polygon`) su nizovi tačaka `[[x, y], ...]` u **udelu slike (0..1)** — ne zavise od veličine slike na ekranu. U prikazu: SVG `viewBox="0 0 1 1"` + `preserveAspectRatio="none"` preko slike, linije `vectorEffect="non-scaling-stroke"`, natpisi kao HTML (da se ne izobliče). Server ih čisti kroz `cleanPolygon` (3–200 tačaka, ograničeno na 0..1).
- **Crtanje u adminu** (`PolygonCanvas`): klik dodaje tačku; klik blizu prve tačke ili Enter zatvara; Backspace/z vraća tačku; Esc otkazuje.
- **Ispravka oblika** (`onEdit`): izabrani (`active`) oblik dobija ručice. Povlačenje ugla (pointer capture na slici), povlačenje sredine ivice ubacuje ugao, dva brza pritiska na ugao (<400 ms) ga brišu — ručno, jer zbog pointer capture-a `dblclick` ide slici, ne ručici. Čuva se na puštanje; editor (`onShapeEdit`) odmah menja stanje i vraća stari oblik ako čuvanje ne uspe.
- **Naziv projekta** (`projectNameAdvice` + `NameAdvice`): malo početno slovo, `-cki/-cka/-cko` → `-čki…`, `dj` → `đ`; predlog „Ispravi u …". Opšteg upozorenja „nema kvačica" namerno nema (smetalo bi ispravnim nazivima). Pri pravljenju se prikazuje i buduća adresa, a slanje sa upozorenjem traži potvrdu.
- **Spratovi:** polje „Dodaj sprat" ide kroz `parseLevels` (`3`, `P`, `prizemlje`, `1. sprat`, `P, 1, 2`, `P-6`, `-1` = podrum) → akcija `floors-add` (postojeći se preskaču).
- **Uvoz iz Excela** (`parseUnitTable`): kolone oznaka | sprat | struktura | m² | terasa | orijentacija | cena | status [| lamela]; lamela preko `matchBuilding` („A“ = „Lamela A“), bez nje `body.buildingId`; tab, `;` ili `,`. Zaglavlje se preskače. Bilo koja greška = ništa se ne upisuje. Upsert po `(project_id, code)`, oblici i ture ostaju.
- **Kopiranje rasporeda** (`floor-copy`): osnova + oblici sa jednog sprata na izabrane spratove ISTE lamele. Uparivanje po oznaci (`unitSuffix`: „2A" na 2. spratu → „A" → „3A"; posle oznake sprata ne sme cifra, pa „12" i „P1" ne uparuju po oznaci). Bez oznake sprata → redom, samo ako je broj stanova isti. `createMissing` pravi stan koji fali (bez cene, slobodan). Status i cena se nikad ne kopiraju.
- **Javna strana** (`ProjectView` + `ProjectSelector`): ISR 1 h, a svaka izmena kroz admin ili prodaju radi `revalidatePath('/novogradnja/<slug>')`. Zgrada se vidi čim ima spratova. Dugme za turu samo za objavljenu turu. Stan „prodat" ne pokazuje cenu ni dugme za upit. Upit za stan → `/api/contact` sa `from: 'project'`.
- **Telefon (≤960 px):** `ProjectSelector` prikazuje red dugmadi spratova (`.inv-floorchips`) ispod fasade i iznad osnove; izbor sprata iz spiska vraća pogled na osnovu, izbor stana spušta do kartice.
- **Ugradnja** (`/ugradnja`): isti `getPublicProject` i keš; svaka izmena osvežava i tu adresu (`refresh()` u admin ruti, `recordUnitChanges`). Upit šalje `embedded: true` → red „🌐 Poslato sa sajta investitora" na Telegramu. Iframe sme jer sajt ne šalje `X-Frame-Options` / `frame-ancestors` (ture se ugrađuju isto). Visina se meri na `<main>`, ne na dokumentu (dokument nikad nije niži od iframe-a, pa se okvir ne bi skupljao).
- **Link za pokazivanje** (`/pregled?t=`, SR i EN): posebna dinamična adresa (ne `?pregled` na javnoj, da javna ostane statična), `noindex`, `no-referrer`, bez `SiteTracker`-a; **bez trake „pregled"** (vlasnik ga pokazuje investitorima kao gotov primer, 2. 10. 2026). `ProjectView previewToken` drži prekidač jezika na pregledu.
- **Prodaja investitora** (mockup `public/mockup/Prodaja.html`, odobren): **svaki stan se potvrđuje posebno** (izmena → „Potvrdi" → „Stan X: da li ste sigurni?" sa starim/novim vrednostima → „Da, potvrđujem"); zajedničkog „Sačuvaj sve" namerno nema. Strana je `force-dynamic`, `noindex`, `referrer: no-referrer` (kod u adresi ne sme da procuri). Kod: 32 nasumična bajta (base64url, 43 znaka); prikazuje se adminu samo jednom.
- **Upit za stan:** `ProjectSelector` šalje `/api/contact` sa `from: 'project'`, `unitId`, `lang`, `embedded`. Ruta upisuje `contact_requests` (`source = novogradnja` — proverava se PRE `lang === 'en'`) i `project_inquiries` (projekat i oznaka iz baze po `unitId`, ne iz pregledača), pa Telegram. Prodaja ih vidi na vrhu `/prodaja` i označava obrađene.
- **Izveštaj po stanu:** `ProjectSelector` šalje `cta_click` sa `pv:<slug>` (otvaranje strane) i `pu:<slug>:<oznaka>` (otvaranje stana), upit `form_submit` `pq:...`. `site_events.target` prima samo `[a-z0-9_:-]{1,80}`, zato `trackKey` čisti oznaku (stara `project_unit:2A` se zbog velikog slova nikad nije upisivala). Admin analitika sajta preskače `pv:`/`pu:` u „Klikovima". Prikaz: `InsightsPanel` (admin, akcija `insights`) i kraći u `SalesBoard`.
- **Plan plaćanja** (`PaymentCalculator` u kartici stana, samo za neprodat stan sa cenom): učešće 10/20/30/50 %, rate investitoru (6–36, bez kamate) ili kredit (anuitet, 15–30 god., kamata koju kupac upiše, početno 4,5 %). Čisto u pregledaču, ništa se ne čuva. Napomena: sajt boji svaki `<em>` akcentnom bojom - unutar plave površine treba `color:inherit`.
- **Okolina** (migracija 022: `projects.lat/lng/nearby/nearby_updated_at`): `lib/nearby.ts` `fetchNearby` (Overpass, 1,2 km; škola, vrtić, prodavnica, apoteka, zdravstvo, autobus, park; do 3 po vrsti; ćirilica → latinica `toLatin`; neimenovano samo najbliže; tri Overpass servera redom jer javni umeju da vrate 504/timeout). Zove ga SAMO admin akcija `nearby-refresh` (geokodira ako nema koordinata); `update` sa novom adresom geokodira (`geocodeAddress`), ručne `lat`/`lng` imaju prednost. Javno: `ProjectNearby` + `ProjectNearbyMap` (Leaflet, `next/dynamic` ssr:false, kao `TourMap`), prikazuje se samo uz koordinate i bar jedno mesto. Admin: `NearbyPanel`. Ruta ima `maxDuration = 60`.
- **Filteri:** struktura, „cena do", „kvadratura od" (pragovi samo unutar stvarnog opsega); „cena do" isključuje prodate. Cena po m² na kartici stana.
- **Gradilište** (`project_progress`, admin `ProgressPanel`, javno `ProjectProgress`): mesec bez objavljene ture se ne prikazuje; napomena samo na srpskoj strani.
- **Engleski** (`/en/novogradnja/[slug]`): `ProjectView lang="en"`; ručni naziv sprata (`label`) važi samo za SR; prevod opisa = admin akcija `translate-en` (`translateTexts`, Gemini), samo predlog.
- **Slika za deljenje:** `opengraph-image.tsx` u `app/novogradnja/[slug]` i `app/en/novogradnja/[slug]` → `renderProjectOgImage`. Fasada u WEBP-u se preskače (Satori), ostaje plava kartica. Važi i za `/pregled` i `/ugradnja` (nasleđuju segment).
- **Kartica stana** (migracija 024, po uzoru na 3d.sokolis.rs koji vlasnik pokazao): `project_units.plan_url / plan3d_url / photos / rooms` (javni podaci). Admin: `UnitMediaModal` (dugme „Detalji“, upload `kind: 'unit'`, `parseRoomsText`), akcija `unit-media-copy` (isto slovo u oznaci preko `unitSuffix`, inače ista struktura + m²). Javno: `UnitMedia` (kartice; 360° kao iframe) + `UnitRooms`; kad stan ima osnovu/3D/slike, staro dugme „Prošetajte“ se ne prikazuje. PDF letak: `UnitSheet` na `/novogradnja/[slug]/stan/[code]/letak` (+ `/en`), print CSS A4 + `window.print()`, QR iz biblioteke `qrcode`; u pregledu (`previewToken`) dugme se ne prikazuje jer letak čita samo objavljen projekat. `revalidateProject` osvežava `base` sa `'layout'` da obuhvati letke.
- **Lamele, rotacija, stanovi na fasadi, lista** (migracija 025, Sokolis tačke 2–4, 2. 10. 2026): migracija je postojeću fasadu prepisala u prvi `project_views` red i oblike spratova u `project_view_shapes`; stare kolone ostaju, ali ih kod više ne čita ni ne piše (osim rezerve u `projectOgImage`). Admin akcije: `building-add` (prva lamela prebacuje postojeće spratove i fasade u `existingName`), `building-save`, `building-delete` (samo prazna), `view-add` / `view-save` (natpis ili nova slika - oblici ostaju) / `view-move` (zamena sort-a sa susedom) / `view-delete`, `shape-save` (`target` building|floor|unit, `polygon: null` briše; lamela samo na `site` slici, sprat/stan samo na `building`). `floors-add` i `floor-save` (insert) primaju `buildingId`. Upload `kind: 'view'` (staro `facade` i dalje prolazi). Admin UI: kartice „Zgrade i lamele“, „Kompleks iz vazduha“ (≥2 lamele), „Fasada i spratovi“ sa `ViewManager` i prekidačem Spratove/Stanove (na platnu samo jedna vrsta, da se ručice ne preklapaju). Javno (`ProjectSelector`): ≥2 lamele → nivo kompleksa (slika `site` sa lamelama, ili kartice lamela bez nje); jedna lamela = odmah njena fasada. `rotator()` = strelice, natpis „Ulica · 1/2“, prevlačenje prstom, slike se učitavaju unapred. Stan na fasadi → `pickUnitOnFacade` (`onFacade`: pozornica ostaje fasada, dugme „Osnova sprata →“ ako postoji osnova; „← Nazad na zgradu“). Prekidač „Zgrada/Kompleks | Lista stanova“ (sakriven bez stanova): tabela sa sortiranjem (`aria-sort`) i filterima, na ≤700 px kartice; klik na red → `openFromList`. `SalesData.floors[].building` daje naslov „Lamela A · 3. sprat“ na `/prodaja`. Upit na Telegramu nosi i lamelu.
- **Strana stana i dizajn 2** (2. 10. 2026): `/novogradnja/[slug]/stan/[code]` (+ `/en`) = `components/projekat/UnitPage` (podaci i metapodaci u `lib/unitPageData.ts`, samo objavljen projekat, ISR 3600, osvežava je `revalidateProject` preko `'layout'`). `UnitMedia` prima `fallbackPlan` (osnova sprata + `unit.polygon` → `UnitPlanCrop`, CSS isečak bez serverskog sečenja) i `large` (kartice kao velika dugmad). Upit je izdvojen u `UnitInquiry` (deli ga kartica u izboru i strana stana; `trackView` broji `pu:`). `ProjectSelector`: jedna traka filtera `.inv-fbar` (pilule sa `<select>`, prekidač „samo slobodni“ je deo `matches`, `Poništi (n)`), strukture po prosečnoj kvadraturi, redovi `.inv-frow` sa trakom zauzetosti `.inv-occ`, panel bez ponavljanja naslova (osim `embedded`), slika sticky na računaru, `#lista` u adresi otvara listu. `ProjectView` ima vrh sa 4 brojke (`.proj-stats`) i dugmićima.
- **Prezentacija** (migracija 026: `projects.show_all_tabs`, `demo_tour_id`): `projectData` daje `demoMedia` ({ tourHref objavljene demo ture, photos = slike fasada }) samo kad je uključeno; `UnitMedia demo` tada uvek ima 4 kartice, prazne su `.inv-um-soon`, tuđa tura nosi oznaku `.inv-um-demo` („Primer ture“). Admin: kvačica + izbor ture u kartici „Podaci projekta“ (akcija `update`). Pravi projekti: false.
- **AI prostorije iz osnove** (3. 10. 2026): admin akcija `rooms-from-plan` (`imageUrl` = `plan_url` stana, `areaSqm` samo kao provera) → `fetchPlanImage` (sharp, 1800 px, PNG) → Gemini sa šemom `{ rooms: [{ name, dims, m2 }] }`. Glavni model je `GEMINI_FALLBACK_MODEL` (Flash), a `GEMINI_MODEL` (Lite) je samo rezerva, jer Lite u testu uzima mere susednih prostorija; `backup: true` u odgovoru znači da je čitao Lite. `dims` (pročitane mere) idu samo u poruku u `UnitMediaModal`, a `cleanRooms` ih ne čuva. Rezultat popunjava tekst prostorija i ništa ne upisuje u bazu bez „Sačuvaj“. Test na osnovi koju je vlasnik poslao (mere u cm): 8 od 8 prostorija tačno.
- **Masovne osnove i cenovnik (AI)** (3. 10. 2026): AI pomoćnici su u `app/lib/planAi.ts` (osnova → prostorije, osnova → oznaka + prostorije, cenovnik → redovi za uvoz); ruta `/api/admin/projects` ima akcije `rooms-from-plan`, `plan-read` (`codes` = oznake projekta; vraća `label`, `matchedCode` samo ako je u spisku, `rooms`, `dims`, `backup`) i `pricelist-read` (PDF ide Geminiju direktno kao `application/pdf`, slika kroz sharp; vraća `text` u kolonama `parseUnitTable` + lamela kad projekat ima lamele). Upload `kind: 'doc'` prima i PDF (do 15MB). Svi pozivi: Flash glavni, Lite rezerva, 24 s × 1 pokušaj po modelu (sa 14 s × 2 su paralelni pozivi pucali na timeout). Admin: `BulkPlansPanel` (2 slike paralelno; uparivanje `matchPlanToUnit` u `lib/projects.ts`: natpis → ime fajla → tip „Tip B"/„B.jpg" na najniži stan iznad prizemlja; čuvanje: prvo tipske osnove + `unit-media-copy`, pa direktne, da tip ne pregazi osnovu konkretnog stana) i `PriceListReader` (puni polje „Uvoz iz Excela"). Ništa od AI-ja se ne upisuje bez klika admina. Testirano kroz pravi admin na privremenom projektu (obrisan): 3/3 osnove uparene, cenovnik 6/6 redova.
- **AI stanovi na fasadi** (3. 10. 2026): akcija `facade-units` (`viewId`; traži sačuvane oblike spratova na toj slici). `planAi.ts`: `fetchFacadeWithFloors` (fasada sa iscrtanim trakama spratova i brojevima, sharp + SVG), `fetchPlanWithUnits` (osnova prvog tipskog sprata sa iscrtanim stanovima i oznakama), `buildFacadeUnitsPrompt` (spisak stanova po spratu sa strukturom i orijentacijom) + `facadeUnitsSchema` (`units[{level, code, x1, x2}]`, 0-1000), `facadeSpansToPolygons` (isti nastavak oznake na spratovima istog rasporeda → medijana raspona = ravne kolone; susedi dele granicu; oblik = traka sprata isečena rasponom, Sutherland-Hodgman). Lite glavni (6-13 s; na „Lepeničkom cvetu" pogodio G/H/I + PA/PB, granice do ~1 % od ručno nacrtanih), Flash rezerva. Admin: `aiFloors` stanje sada ima `kind: 'floor' | 'unit'`; „Sačuvaj predlog" za stanove prvo briše oblike stanova sa te slike kojih nema u predlogu.
- **Ceo ekran** (3. 10. 2026): `components/projekat/FacadeFullscreen.tsx` (klase `.inv-fs`, `.fs-*` u `selectorStyles.ts`). Otvara ga ProjectSelector (stanje `full`): dugme `.inv-fullbtn` (vidljivo samo > 960 px), klik na bilo koji `a[href="#izbor"]` na računaru i adresa sa `#ceo-ekran`. Ne u ugradnji (`embedded`). Slika je SVG `<image>` + oblici u pikselima slike (`viewBox` = prirodna veličina), `preserveAspectRatio` slice kad se odseca ≤ 18 %, inače meet sa zamućenom pozadinom; dok je fioka otvorena slika se uklapa u levi deo, a traka filtera se sakriva. Filteri su sopstveni (sprat i m² od-do, strukture, statusi), ne dele se sa običnim izborom.
- **AI spratovi na fasadi** (3. 10. 2026): akcija `facade-floors` (`viewId` slike tipa `building`; spratovi te lamele sa `level >= 0`, rastuće) → `planAi.ts`: `fetchFacadeImage` (JPEG 1600), `buildFacadeFloorsPrompt` + `facadeFloorsSchema` (`storeys[].box_2d` [ymin, xmin, ymax, xmax] 0-1000), `storeyBoxesToPolygons` (odozdo nagore, susedne granice spojene na sredini). Ovde je **Lite glavni, Flash rezerva** (test na „Lepeničkom cvetu": Lite 0,5-1,8 % greške za 4-7 s, Flash ~5,6 % za ~30 s; pristup sa linijama tavanica bio je ~9 %). Odgovor: `proposals[{floorId, level, polygon}]` (najniži oblik = najniža etaža), `seen`, `floors`, `backup`; ništa se ne upisuje. Admin: dugme u kartici fasade (samo „Spratove"), predlog u stanju `aiFloors` (ljubičasto, uglovi se povlače pre čuvanja), „Sačuvaj predlog" = `shape-save` po spratu.
- **Kratka beleška** (mockup `public/mockup/ProdajaBeleske.html`, vlasnik odbio duži sistem sa istorijom i nivoima): jedna po stanu i po upitu, nova zamenjuje staru (upsert po `unit_id`/`inquiry_id`), prazan tekst briše. `saveNote`/`loadNotes` u `lib/salesAccess.ts`, akcija `note` na `/api/prodaja/[token]` (autor = ime iz linka). `SalesBoard` → `NoteRow`; admin samo prikazuje (kolona u tabeli stanova i u `InsightsPanel`). Nikad u `projectData` (javna strana).
- **Istorija** (`project_unit_changes`): svaka promena statusa/cene — iz prodaje (ime osobe), iz admina (`Admin`, i iz Excel uvoza za postojeće stanove). Telegram samo za prodaju i samo za prelaz u prodat/rezervisan, ako je `notify_sales`.
