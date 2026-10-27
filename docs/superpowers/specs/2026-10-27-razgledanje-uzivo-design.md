# Razgledanje uživo: agent vodi kupca kroz turu na daljinu

Datum: 27. 10. 2026.
Odobreni mockup: `public/mockup/RazgledanjeUzivo.html` (lokalno, `public/mockup/` nije u git-u).

## Cilj

Agent pošalje kupcu link i vodi ga kroz turu: kupac na svom telefonu vidi tačno ono što agent
pokazuje (sobu, pravac, zum), a razgovaraju telefonom ili Viberom. Svrha je da agent obavi
„prvo gledanje" sa kupcem iz drugog grada bez vožnje, pa na pravo gledanje dolaze samo ozbiljni
kupci. To je odgovor na dva problema agencija u Kragujevcu: gledanja koja ne vode nikuda i kupci
iz okolnih gradova.

### Šta je vlasnik rekao
- Vodi agent, preko tajnog linka za turu (bez naloga). Kupci to dugme ne vide.
- Kupac prati agenta, ali može da odluta. Tada dobija „Vrati se agentu", a agent vidi gde kupac gleda.
- Od dodataka u prvoj verziji ide samo pokazivač. Bez glasa kroz sajt, bez izveštaja posle gledanja i bez dugmeta za upit na kraju.
- Tehnički pristup: Supabase Realtime kanal, bez tabele u bazi.
- Mockup: „dobar".

### Pretpostavke (vlasnik ih nije posebno potvrdio)
- Narator, AI asistent („Pitanja"), uvod i automatsko vođenje su isključeni kod oba učesnika dok traje razgledanje uživo.
- Jedan link je za jedno gledanje. Ako ga otvori više ljudi, radi kod svih, a agent vidi „Kupac je tu" čim je bar jedan povezan.
- Zaključana tura (`LockedTourScreen`) ostaje zaključana. Razgledanje uživo je ne otključava.
- **Odstupanje od mockupa:** link za kupca nije `kvadrat360.com/u/7KQ-4MX`, nego `kvadrat360.com/tour/<slug>?uzivo=7KQ4MX`.
  Kratak link bi zahtevao tabelu koja povezuje kod sa turom, a dogovor je bio bez tabele. Link se ionako
  šalje Viberom i otvara dodirom. Ako vlasnik ipak želi kratak link, dodaje se jedna mala tabela (vidi „Kasnije").
- Link agenta za vođenje je stalan za turu (kao link izveštaja). Opoziva se samo promenom ključa, što poništava sve takve linkove.

### Uspeh
- Agent otvori svoj link, dodirne „Uživo", pošalje link Viberom, i kupac posle jednog dodira vidi agentov pogled.
- Kod kupca kamera prati agenta glatko (bez trzanja), sa kašnjenjem ispod pola sekunde na običnoj mobilnoj mreži.
- Prelazak u drugu sobu kod kupca izgleda isto kao kad sam prelazi (ista „šetnja" do vrata).
- Pokazivač se pojavi kod kupca na istom mestu u prostoru i ostaje tu i kad se kamera pomeri.
- Kad kupac sam pomeri kameru, odvaja se. Agent to vidi u roku od sekunde, a „Vrati se agentu" ga glatko vraća.
- Kad agent završi ili nestane duže od 30 sekundi, kupac dobija završnu karticu i ostaje u običnoj turi.
- Posle završenog razgledanja isti link kupca prikazuje „Razgledanje je završeno ili još nije počelo".
- Bez novih troškova: nema novog servisa ni tabele, i Vercel funkcije se ne pozivaju tokom vođenja.

## Van obima
- Glas ili video kroz sajt (WebRTC).
- Izveštaj posle gledanja, beleženje sesija u bazu, statistika u mesečnom izveštaju.
- Kratak link `/u/<kod>`.
- Više agenata u istoj sesiji, predaja vođenja kupcu, ravnopravni režim.
- Dugme za upit na kraju razgledanja (postojeći „Kontakt" ostaje dostupan u običnoj turi).
- Nalozi za agente.

## Arhitektura

### Pregled
```
Agent (tura + ?agent=<token>)                     Kupac (tura + ?uzivo=<kod>)
   │ POST /api/live/start {slug, token}              │
   │ ← {code}  (server proveri potpis, napravi kod)  │
   │                                                 │
   └──── Supabase Realtime kanal  live:<slug>:<kod> ─┘
          broadcast: view, room, point, end   (agent → kupac)
          broadcast: viewer                   (kupac → agent)
          presence:  {role: 'guide' | 'viewer'}
```
Jedini poziv našeg servera je provera agentovog linka na početku. Sve ostalo ide direktno između
browsera i Supabase Realtime-a.

### 1. Link agenta (`app/lib/liveGuide.ts`, samo server)
- Isti obrazac kao `app/lib/agencyReport.ts`: `liveGuideToken(slug)` = HMAC-SHA256 nad `live-guide:<slug>`,
  skraćen na 24 znaka (base64url). `isLiveGuideToken(slug, token)` poredi preko `timingSafeEqual`.
- Ključ: `REPORT_LINK_SECRET` ili, ako ga nema, `SUPABASE_SERVICE_ROLE_KEY` (isto kao izveštaj).
  Prefiks `live-guide:` drži ove potpise odvojenim od linkova izveštaja.
- Link agenta: `/tour/<slug>?agent=<token>`. (Ne `?vodic`: `?vodic=1` već postoji i pokreće automatsko vođenje.)

### 2. API: `POST /api/live/start` (`app/api/live/start/route.ts`)
- Telo: `{ slug: string, token: string }`. Proverava token. Ako ne valja, vraća 403.
- Ako valja, vraća `{ code }`: 6 znakova iz Crockford alfabeta bez sličnih slova
  (`23456789ABCDEFGHJKMNPQRSTVWXYZ`), iz `crypto.randomInt`. To je ~887 miliona kombinacija.
- Rate limit preko postojećeg `app/lib/rateLimit.ts` (npr. 20 po satu po IP adresi).
- Ništa ne upisuje u bazu.

### 3. Dogovor o porukama (`app/tour/[slug]/live/protocol.ts`)
Tipovi koje dele obe strane (stroge TypeScript unije):
- `view` (agent → kupac): `{ roomId, yaw, pitch, hfov }`. Šalje se kad se pogled promeni, najviše 10 puta u sekundi,
  i kao „otkucaj" na svake 2 sekunde, da se kupac koji kasnije uđe odmah poravna.
- `room` (agent → kupac): `{ roomId, waypointIndex: number | null }` (redni broj tačke u sobi iz koje se kreće; tačke nemaju id). Indeks postoji kad je agent prešao kroz vrata,
  pa kupac ide istom „šetnjom". `null` znači promenu iz liste soba.
- `point` (agent → kupac): `{ roomId, yaw, pitch }`, koordinate u prostoru iz `viewer.mouseEventToCoords`.
- `end` (agent → kupac): `{}`.
- `viewer` (kupac → agent): `{ roomId, yaw, pitch, following }`. Šalje se kad se promeni, najviše 4 puta u sekundi, i otkucaj na 2 s.
- Presence: `{ role: 'guide' | 'viewer' }`, ključ je nasumičan id taba.
- Svaka poruka nosi `v: 1` (verzija dogovora). Poruka sa nepoznatim `v` ili lošim oblikom se ignoriše.

### 4. Veza (`app/tour/[slug]/live/useLiveSession.ts`)
- Otvara `supabase.channel('live:<slug>:<code>', { config: { broadcast: { self: false }, presence: { key } } })`
  preko postojećeg klijenta iz `app/lib/supabaseClient.ts`.
- Izlaže `status` (`connecting | waiting | live | ended | lost`), `peerPresent`, `send(event)`, `onEvent(handler)`, `end()`.
- Agent: `waiting` dok nema `viewer` u presence-u, pa `live`. `end()` šalje `end` i zatvara kanal.
- Kupac: `waiting` dok nema `guide`. Ako `guide` nestane iz presence-a, posle 30 s prelazi u `lost`.
  Kanal bez agenta duže od 20 s od ulaska daje „Razgledanje je završeno ili još nije počelo".
- Ponovno povezivanje posle kratkog prekida (tunel, prebacivanje WiFi/mobilni) radi Supabase klijent sam.
  Posle povratka kupac se poravnava na prvi `view` otkucaj.

### 5. Praćenje kod kupca (`app/tour/[slug]/live/useLiveFollow.ts`)
- Čuva poslednji agentov pogled kao cilj. U `requestAnimationFrame` petlji približava trenutni pogled cilju
  (yaw najkraćim putem preko `getShortestTargetYaw`/`normalizeYaw` iz `utils`), pa poziva `setYaw`/`setPitch`/`setHfov`.
  Zato brze uzastopne poruke izgledaju glatko, a ne kao skokovi.
- `room` poruka: ako postoji `waypointIndex`, poziva postojeći `walkToRoom(wp)`, a inače `changeRoomById(roomId)`
  (oba iz `useRoomNavigation`). Za vreme prelaza `view` poruke se samo pamte i primenjuju kad je scena spremna (`sceneReadyRef`).
  Pošto se viewer pravi iznova za svaku sobu, hook uvek čita `viewerRef.current`, nikad sačuvanu instancu.
- Odvajanje: `mousedown`/`touchstart`/`wheel` na kontejneru viewera, ili kupčeva promena sobe, postavlja `following = false`.
  Programski `setYaw` ne pokreće te događaje, pa se praćenje ne prekida samo od sebe.
- „Vrati se agentu": `following = true`. Ako je agent u drugoj sobi, prvo `changeRoomById`, pa glatko okretanje na cilj.
- Žiroskop (`startOrientation`) i automatsko okretanje su isključeni kod kupca dok prati, jer bi se borili sa agentom.

### 6. Pokazivač (`app/tour/[slug]/live/livePointer.ts`)
- Agent: dugi dodir (500 ms bez pomeranja više od 8 px) ili držanje miša pozove `viewer.mouseEventToCoords(e)`,
  pa pošalje `point`. Isto mesto se odmah prikaže i kod agenta.
- Prikaz kod oba: Pannellum hotspot sa posebnom CSS klasom (krug sa talasom, kao u mockupu) na `{yaw, pitch}`, pa
  ostaje u prostoru kad se kamera pomera. Uklanja se posle 3 s. Ako stigne novi `point`, stari se uklanja odmah.
- Kod kupca ide i oznaka „<Ime> pokazuje". Ako kupac ne gleda u tom pravcu, `point` ga ne okreće silom, ali pokazuje strelicu ka tački na ivici ekrana.
- Ako je `point.roomId` druga soba od trenutne, poruka se ignoriše.

### 7. Ekrani (`app/tour/[slug]/live/*.tsx`)
Sve u postojećem tamnom staklu (`GLASS`, `FILL_ACCENT`, `GLASS_ACCENT` iz `theme.ts`), Urbanist za naslove, mete od najmanje 44 px.
- `LiveStartButton`: samo kod agenta (`?agent` je prošao proveru), u koloni dugmadi sa strane, ispod postojećih. Crvena tačka i „Uživo".
- `LiveShareCard` (agent): „Pošaljite kupcu ovaj link", link, dugmad „Viber" (`viber://forward?text=`) i „Kopiraj", plus „Čeka se kupac…".
- `LiveJoinCard` (kupac): „<Agent> vas vodi kroz stan", agencija, naslov i kvadratura ture, dugme „Uđite u razgledanje".
  Dok agent nije tu, umesto dugmeta stoji „Čeka se agent…". Dugme je i potreban dodir za zvuk i pun ekran.
- `LiveBar` (oba, gore levo ispod izbora sobe, da ne pokriva dugmad sa strane):
  - agent: `UŽIVO` · „Čeka se kupac" / „Kupac je tu" / „Kupac prati" / „Kupac gleda sam" / „Kupac je izašao" · „Završi";
  - kupac: `UŽIVO` · „Vodi vas <ime>" / „Gledate sami".
- `LiveBackButton` (kupac, kad je odvojen): „↺ Vrati se agentu", iznad kartice sa opisom sobe.
- `LivePeerArrow` (agent, kad kupac gleda sam): strelica na levoj ili desnoj ivici prema kupčevom yaw-u
  („Kupac gleda ovde"), ili „Kupac je u <sobi>" kad je u drugoj sobi. Dodir okreće agenta tamo.
- `LiveEndCard` (kupac): „<Ime> je završio razgledanje" ili „Veza sa agentom je prekinuta", pa „Nastavi razgledanje".
- Ime agenta: `tour.agent_name`, a ako ga nema, „Agent". Agencija: `tour.agency_name` (red se ne prikazuje ako ga nema).
- Svi tekstovi idu u `translations.ts`, za sve jezike koje tura podržava (SR, EN, DE, RU).

### 8. Uključivanje u turu (`app/tour/[slug]/page.tsx`)
`page.tsx` već ima 1400 redova, pa sva logika ostaje u `live/`, a u stranu ide samo:
- čitanje `?agent` i `?uzivo` iz URL-a i jedan `useLiveViewing(...)` poziv koji vraća ulogu i stanje;
- kad je uloga `viewer`: preskače se `WelcomeScreen`/uvod i prikazuje `LiveJoinCard`;
- kad je razgledanje aktivno (bilo koja uloga): `TourIntroOverlay`, narator, „Pitanja"/asistent i automatsko vođenje se ne pokreću,
  a admin alati se ne prikazuju;
- prosleđivanje `viewerRef`, `walkToRoom`, `changeRoomById`, `sceneReadyRef`, `roomIdx`/`rooms` hooku;
- agent šalje `room` iz istog mesta gde tura menja sobu (bez dupliranja logike prelaza).
- Kad se razgledanje završi, kupac ostaje u običnoj turi bez ponovnog učitavanja, a `?uzivo` se uklanja iz URL-a (`history.replaceState`).

### 9. Admin (`app/admin/ture/`)
- U „⋯" meniju reda ture nova stavka „Link za vođenje uživo": kopira `/tour/<slug>?agent=<token>`.
- Token pravi server (postojeća admin API ruta za ture vraća ga uz ostale linkove, kao link izveštaja na strani Agencije).

## Greške i krajnji slučajevi
- **Loš ili stari `?agent`:** `/api/live/start` vraća 403, dugme „Uživo" se ne prikazuje, a tura radi normalno.
- **Loš `?uzivo` kod:** ne može da se proveri bez tabele. Kupac vidi „Čeka se agent…", pa posle 20 s
  „Razgledanje je završeno ili još nije počelo" i dugme „Razgledajte sami".
- **Supabase Realtime nedostupan:** status `lost`, poruka „Veza nije uspela", tura radi normalno.
- **Javni kanali isključeni u Supabase podešavanjima** (Realtime → „Allow public access"): prvi korak plana proverava podešavanje.
  Ako su samo privatni kanali dozvoljeni, potrebna je RLS politika na `realtime.messages`, što menja dizajn, pa se vraćamo vlasniku.
- **Sigurnost:** kanal je javan za svakog ko zna slug i kod. Kod je nasumičan i važi samo dok traje gledanje, a podaci u kanalu su samo uglovi kamere za javnu turu.
  Neko ko ima kupčev link mogao bi da se predstavi kao agent. Prihvatljivo: link ima samo kupac, a šteta je najviše pogrešno okretanje kamere.
- **Agent zatvori tab bez „Završi":** presence nestaje, a kupac posle 30 s dobija „Veza sa agentom je prekinuta".
- **Dva taba agenta sa istim kodom:** drugi tab pokreće novo razgledanje sa novim kodom, a stari kod ostaje kod prvog taba.
- **Spora mreža:** pogled se samo kasnije poravna. Otkucaj na 2 s ispravlja propuštene poruke.
- **Telefon u pozadini** (kupac prebaci na Viber da se javi): kad se vrati, poravnava se na prvi otkucaj. Ako je bio odsutan duže od 30 s, agent to vidi kao „Kupac je izašao".
- **Tura bez waypointa za neku sobu:** `room` sa `waypointIndex: null` daje običan prelaz.

## Provera
Projekat nema test runner, pa:
- `npx tsc --noEmit` i `npm run lint` bez novih grešaka.
- Ručno, dva taba u browser pane-u (agent na računaru, kupac u mobilnom prikazu 375×812):
  pokretanje, ulazak, praćenje, prelazak kroz vrata, promena sobe iz liste, pokazivač, odvajanje i povratak,
  strelica kod agenta, „Završi", zatvoren tab agenta (30 s), loš kod (20 s), loš token (nema dugmeta).
- Provera da se narator, uvod i asistent ne pokreću ni kod jedne strane tokom razgledanja.
- Provera da obična tura bez parametara radi potpuno isto kao pre.
- Pravi test na dva telefona preko mobilne mreže pre puštanja agentima (vlasnik i agent).

## Redosled rada
1. Provera Realtime podešavanja (javni kanali) preko Supabase MCP-a ili dashboarda.
2. `liveGuide.ts` + `/api/live/start` + stavka u admin „⋯" meniju.
3. `protocol.ts` + `useLiveSession` (veza, presence, statusi).
4. `useLiveFollow` (glatko praćenje, sobe, odvajanje, povratak).
5. Ekrani (`LiveStartButton`, `LiveShareCard`, `LiveJoinCard`, `LiveBar`, `LiveBackButton`, `LivePeerArrow`, `LiveEndCard`) + prevodi.
6. Pokazivač.
7. Uključivanje u `page.tsx` i gašenje naratora, uvoda i asistenta tokom razgledanja.
8. Provera (gore), pa čekanje na „pushuj".

## Kasnije (ako vlasnik zatraži)
- Kratak link `/u/<kod>`: tabela `live_sessions (code, slug, created_at, ended_at)` sa GRANT-ovima u istoj migraciji, i redirect.
- Izveštaj posle gledanja: ista tabela + trajanje, sobe, vreme odvajanja.
- Dugme „Zakaži pravo gledanje" na završnoj kartici.
