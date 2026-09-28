# Kvadrat360: uvod za AI agenta

Ovo je prvi dokument koji AI agent (Claude, Codex, Gemini...) treba da pročita pre rada na projektu. Kaže šta je Kvadrat360, kako je sistem složen, gde šta stoji i koja pravila vlasnik traži.

Stanje opisano ovde važi na dan **27. 9. 2026**. Ako se kod i ovaj dokument razilaze, **kod je tačan**. Tada ispravi i dokument.

Uputstvo za ljude (kako se pravi tura, korak po korak) je u [`uputstvo-kreiranje-ture.md`](uputstvo-kreiranje-ture.md).

---

## 1. Šta je Kvadrat360

Platforma za **360° virtuelne ture nekretnina**, sajt **kvadrat360.com**. Kvadrat360 snima stan (360° panorame i HDR fotografije), a kupac ili zakupac posle „šeta" kroz njega u pregledaču, sa audio vodičem na više jezika.

- **Kome se prodaje:** agencijama za nekretnine (mesečni paketi) i vlasnicima koji sami prodaju ili izdaju (pojedinačna tura).
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
                          (2 reda + Više/Manje), Pozovi, LeaveTourDialog
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
  unos/page.tsx           upitnik za agenta
  api/                    rute (vidi §8)
  lib/                    zajednička logika (vidi ispod)
  sitemap.ts, robots.ts, opengraph-image.tsx
components/               komponente sajta: HeroDevice, ContactForm, PriceCalculator, SiteTracker,
                          TourList + TourMap (/ture), TourModulesShowcase (moduli ture kao benefiti)
supabase/migrations/      001–018, SQL koji vlasnik ručno pokreće u Supabase SQL editoru
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

---

## 5. Baza (Supabase)

### Tabele

| Tabela | Šta | Važne kolone |
|---|---|---|
| `tours` | jedna nekretnina | `slug` (ključ za URL), `title_i18n`, `category` (`sale`/`rent`/`booking`), `about_text_i18n` (kratka napomena, ≤2 rečenice), `faq_1..5_i18n`, `location_map_url`, `floorplan_url`, `agency_name`, `agent_*`, `address`, `city` (011), `structure`, `district` (012), `area_sqm`, `price` (013), `floor`, `has_elevator`, `has_basement`, `heating` (014), `build_status`, `finish_status` (015), `lat`, `lng` (016, geokodirano), `terrace`, `parking`, `deposit` (samo izdavanje), `registration` (samo prodaja) (017), `property_type`, `status` (010, aktivna/izdato/prodato/pauza), **`published`** (007) |
| `rooms` | prostorija u turi | `tour_slug` (FK na `tours.slug`), `order_index`, `title_i18n`, `panorama_url_cf` (R2/CDN), `panorama_url_mobile` (018, 6000 px kopija za telefone; prazno = telefon uzima punu), `panorama_url` (stari Supabase URL), `preview_url` (004), `waypoints_i18n`, `establish_i18n`, `floorplan_x/y` (003) |
| `contact_requests` | upiti sa forme | `name`, `contact`, `package`, `agency`, `listing_type`, `size`, `message` (prvi red može biti „Željeni termin: ..."), `source` (`landing` / `landing_en`) |
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

### Tipovi baze

`types/supabase.ts` pravi `npm run db:types` (`scripts/gen-db-types.mjs`) iz **žive baze sajta**, samo čitanjem. Pokreće se posle svake nove migracije. Supabase CLI (`supabase gen types`) se ovde NE koristi: baza je premeštena na poslovni nalog, a CLI na ovom računaru je i dalje prijavljen na stari nalog (projekat „360-tura"), pa daje pogrešne tipove. Kastovi `as '*'` ostaju samo tamo gde se lista kolona slaže iz promenljive.

### Migracije

`supabase/migrations/NNN_naziv.sql` se pišu tako da ih je **bezbedno pokrenuti više puta** (`if not exists`, `drop policy if exists`). **Vlasnik ih pokreće ručno** u Supabase SQL editoru. Agent mu da SQL, sačeka potvrdu i posle proveri (npr. da tabela postoji i da anon ne može da čita).

---

## 6. Mediji (R2)

- Panorama sobe: `<roomId>-panorama.webp` (WebP, **puna rezolucija**; smanjivanje bi pokvarilo zumiranje), u folderu ture
- Kopija za telefone: `<roomId>-panorama-m.webp` (6000×3000; ~72 MB u memoriji telefona umesto ~128 MB). Pravi je `/api/upload-panorama/finish`; brisanje sobe ili panorame briše i nju. Telefon = `(pointer: coarse)` ili širina < 1024 (`panoramaUrlFor` u `transition.ts`).
- Sličica sobe: `<roomId>-preview.jpg` (1200×630, isečak oko horizonta; za OG i početnu)
- URL-ovi se u bazu upisuju sa `?v=<vreme>`, da CDN posle zamene ne vraća staru sliku.
- ⚠️ Folderi **`Maglicka/`** i **`Slavisa -booking/`** u bucketu sadrže **originalne panorame** na koje nijedan red u bazi ne pokazuje. To **nisu siročići** i **nikad se ne brišu**. Pri čišćenju R2 briše se samo po tačnom obrascu ključeva soba, uvek prvo suvim hodom.

---

## 7. Tura (`/tour/[slug]`)

- Klijentska komponenta. Tura i sobe se učitavaju paralelno, a susedne panorame se unapred skidaju.
- Početni ekran ima izbor jezika, „Istražite sami" / „Automatsko vođenje" i prozor „Kako radi 360° tura?" (4 slikovna koraka sa pravim `.k360-hs-beacon`, zatvara se na ×). Posle starta Pannellum prikazuje sobu, radi uvodna naracija (establish), pa tačke (waypoints). Ručni povratak u već obiđenu sobu **ne ponavlja** priču.
- Moduli (donja traka): **Plan** (tlocrt sa uvodom `planIntroTitle/Text` da je to mapa stana; bez spiska soba), **Lokacija** (Google mapa u iframe-u), **Info** (hero kartica + ključne činjenice + redovi: grad, ulica, cena, cena po m², ostalo iz `buildFactList()` u `utils.tsx`; opciona napomena `about_text_i18n`), **Pitanja** (FAQ 1–5, u dnu jedan red sa okruglim dugmadima poziv/mejl), **Kontakt** (agent, poziv, mejl, „Zakaži razgledanje"). Svaki modul u dnu ima diskretan potpis „360° turu izradio Kvadrat360" → `SITE_URL/?utm_source=tura&utm_medium=potpis&utm_campaign=<slug>`.
- Gornji deo: jezici, kartica naslova sa dugmetom za **deljenje** (Web Share). Na računaru traka soba stoji u vrhu, mala mapa levo. „Pozovi" je u kartici sa tekstom.
- **InfoCard** (naracija / info-tačka): naslov + 2 reda, „Više/Manje" samo kad tekst ne staje (ResizeObserver).
- **Veličine dodira:** okrugla dugmad 44 px, pilule 36 px sa `.k360-tap` (nevidljivo `::after` −4px proširuje metu). Na računaru ceo UI ture ima zoom 1.122.
- **Telefon:** dok se prstom vuče panorama (>12 px), gornji UI se sklanja (`is-immersive`) i vraća 1,5 s posle; dugme za ceo ekran i žiroskop se prikazuju samo gde rade (iPhone nema fullscreen).
- **Dugme „nazad"** (`useBackGuard`): jedan `{k360Guard:true}` korak istorije. Nazad zatvara redom: zakazivanje → modul → InfoCard; ako ništa nije otvoreno, `LeaveTourDialog` („Da li želite da napustite turu?"); drugo nazad izlazi. Bez strane pre ture ide na `/`. Admin ga nema. Next 16 zadržava `__NA` u stanju istorije — ne dirati `history.state` ručno van ovog hook-a.
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
| `POST /api/viewing-request` | 5 zahteva / 10 min po IP-u; samo objavljena aktivna tura | „Zakaži razgledanje" iz ture → `contact_requests` (`source = tour:<slug>`) + Telegram sa podacima ture i agenta |
| `POST /api/client-error` | 10 / 10 min po IP-u, botovi se odbacuju, ista greška najviše 1×/h | Greška iz pregledača (`lib/reportError.ts`) → Telegram vlasniku + Vercel log |
| `GET/POST /api/admin/floorplan` | `requireAdmin` | Raspored šematskog plana (sačuvan ili nov nacrt) / čuvanje plana u turu |
| `POST /api/track` | 120 / min, botovi se odbacuju | Događaji tura (`tour_events`) i, uz `scope: 'site'`, početne (`site_events`) |
| `POST /api/unos` | kod `FORM_ACCESS_CODE`; 10 slanja / h; 5 pogrešnih kodova / 15 min | Upitnik agenta → Gemini nacrt → neobjavljena tura |
| `GET/POST/PATCH/DELETE /api/admin/tours` | `requireAdmin` | Spisak, nova tura, izmena (uklj. FAQ, geokodiranje), objava, brisanje (sa R2 fajlovima). Posle izmene osvežava `/`, `/en`, `/ture`, `/za-agencije` i sitemap (`lib/revalidatePublic.ts`) |
| `POST /api/upload-panorama` + `POST .../finish` | `requireAdmin` | Presigned R2 PUT (Vercel prima najviše 4,5 MB), pa `finish`: WebP + sličica + kopija za telefone → `rooms`. `DELETE` briše panoramu sobe (i `-m.webp`) |
| `DELETE /api/admin/rooms` | `requireAdmin` | Brisanje sobe sa panoramama i strelicama koje vode u nju |
| `POST /api/upload-to-r2` | `requireAdmin` | Migracija panorame sa starog Supabase URL-a na R2 |
| `POST /api/ai/auto-populate-room` | `requireAdmin` | `generate_draft` (Gemini gleda panoramu i predlaže naziv, tekst i tačke), `translate_step` (prevodi); `generate_voice` vraća 501 |
| `GET /api/analytics` | `requireAdmin` | Zbir za admin analitiku (ture i početna) |

Nova ruta koja menja podatke **mora** imati `requireAdmin` ili ograničenje broja zahteva. Tajne se nikad ne vraćaju klijentu.

---

## 9. AI (Gemini)

- `lib/gemini.ts`: glavni model `gemini-3.1-flash-lite`, rezervni `gemini-flash-latest` (alias; stari `gemini-3.1-flash` ne postoji i davao je 404, pa rezerva do 27. 9. 2026 nije radila). Spisak dostupnih modela: `GET https://generativelanguage.googleapis.com/v1beta/models`.
- **AI popuna sobe** (`generate_draft`) radi obrnuto: glavni je Flash (bolje čita sliku), Lite je rezerva, temperatura `TEMP_GROUNDED` (0.35). Server sam čita kontekst iz baze (`loadRoomContext`): naziv sobe (ostaje kakav je admin dao), podatke o stanu i ostale sobe sa njihovom naracijom, da ne izmišlja raspored i da ne ponavlja uvode. Tačke: model vraća pravougaonik `box_2d` ([ymin, xmin, ymax, xmax], 0–1000), a yaw/pitch računa kod iz centra (`boxToAngles`); preveliki okviri i tačke bliže od 12° se odbacuju. Na probi na 3 sobe sve nove tačke su pale na predmet, stare uglavnom pored.
- **„Proveri i ispravi"** (`review_draft`, ista ruta): AI lektor u prozoru za pregled drafta, pre prevoda i glasa. Vraća predloge (ceo novi tekst polja + razlog), koje admin prihvata ili odbacuje, i napomene „proveri" za tvrdnje koje ne vidi na slici. Sam ništa ne menja. Ograničenja dužine, prazne pohvale i zamke za glas su u `lib/roomDraftRules.ts`: po njima AI piše, lektor proverava, a prozor broji znakove i pali upozorenja dok se kuca. `generateWithRetry` ima timeout, 2 pokušaja i ponavlja na 429/500/503. `readResponseText` baca grešku ako je odgovor odsečen (MAX_TOKENS) ili prazan.
- Temperature: `TEMP_EXTRACT = 0.2` (izvlačenje podataka), `TEMP_DESCRIPTIVE = 0.6` (opisni tekst).
- Nacrt sobe dobija tip oglasa ture (`listingType`); ograničenja su 3 reči za naziv tačke, 180 znakova za tekst tačke i 320 za naraciju.
- **Poznato i prihvaćeno:** AI i dalje ne postavlja tačke precizno u panoramu. Vlasnik to prihvata; ne popravljati bez njegovog zahteva.
- **Glasovna naracija (TTS) je još isključena** (`generate_voice` vraća 501). ElevenLabs je plaćen 23. 9. 2026, ali tekstovi još nisu spremni. Kad vlasnik kaže, vraća se handler iz commita `0d8491e`. Dogovoreno za tada: automatski vodič kreće sa zvukom uz kratko obaveštenje „🔊 Zvuk je uključen · Isključi" (3 s), a u automatskom režimu idu i titlovi.

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
- **Merenje:** element sa `data-track="cta:cilj"` ili `data-track="contact:cilj"` se broji sam (`SiteTracker`). Novi cilj treba dodati i u `TARGET_LABELS` u `admin/analitika/page.tsx`. Posete admina se ne broje (proverava se ključ `sb-*-auth-token` u localStorage).
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
| `FORM_ACCESS_CODE` | kod koji agencija unosi u `/unos` |
| `NEXT_PUBLIC_SITE_URL` | opciono; menja kanonski domen (npr. za staging) |
| `REPORT_LINK_SECRET` | opciono; ključ za potpis linkova izveštaja agencija. Bez njega se izvodi iz service-role ključa. Promena poništava sve poslate linkove. |

`FORM_WEBHOOK_SECRET` iz `.env.local` se više ne koristi (stari Google Form tok je uklonjen).

---

## 12. Način rada

### Pravila vlasnika (obavezna)

1. **Nikad commit ni push dok vlasnik izričito ne napiše „pushuj"** (ili „push"). „Nastavi", „continue" i „ok" **nisu** dozvola za push.
2. Folder **`.claude/` nikad ne ide u commit.** Isto važi za `docs/cowork/` (repo je javan), `public/mockup/` i `welcome-screen.png`, osim ako vlasnik ne traži.
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

**Tehnički dug**
- rate limit je u memoriji, pa na više Vercel instanci važi približno
- `/api/unos` još šalje fajlove kroz telo zahteva (limit 4,5 MB na Vercelu) — treba presigned R2 kao kod panorama

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
