# AI tekst soba: agent koji vodi (obim B)

Datum: 2026-11-03 · Odobren obim: B (vlasnik, 2026-11-03)

## Cilj

AI popuna sobe ("AI Popuni Sobu" i "AI sve sobe") treba da piše naraciju i info-tačke koje
**zvuče kao pravi agent koji vodi kupca kroz nekretninu** i iz kojih **kupac sazna nešto korisno**.
Ugao zavisi od tipa oglasa: kupac (prodaja), podstanar (izdavanje), gost ("Stan na dan").

Vlasnik nema napomene za postojeće ture; testiraće sa pravim podacima kad ih bude imao.
Dakle sve mora da radi i **bez napomena**, a napomene su dodatak.

## Šta je pokazalo istraživanje (35 soba, 4 objavljene ture)

- Uvodi su definicije ("Kupatilo je centralno mesto za higijenu").
- Izmišljanje: vrsta drveta, raspored soba, "dovoljno za više ljudi".
- Iste fraze u različitim turama; zabranjene reči ("idealne") ipak prolaze.
- Tačke bez naziva, opšte ("obezbeđuju sve uslove za kuvanje").
- Pola soba ima samo jedan od dva dela naracije.
- Svaka soba se piše sama, bez toka obilaska.
- AI ne dobija podatke koje baza već ima (opis, deo grada, lift, podrum, stanje gradnje i uređenja).

Proba (2 kruga, Maglićka, skripta van repozitorijuma) potvrdila je:
- plan cele ture + glas agenta daje prelaze ("Iz hodnika ulazimo...") i korisne tačke sa nazivima;
- ako se sobama daju cena, uslovi zakupa, pravila i okolina, AI ih gura gde ne pripadaju
  (kirija u kupatilu) - zato ti podaci **ne idu u sobe**;
- bez napomena tekst ume da bude očigledan - tačka mora da kaže nešto što se ne vidi odmah;
- `gemini-flash-latest` je ceo dan vraćao 503, a `gemini-2.5-flash` više nije dostupan novim nalozima.

## Delovi rešenja

### 1. Napomene (nova tabela)

`tour_ai_notes` - interne beleške za AI, nisu javne:

| kolona | tip | značenje |
|---|---|---|
| `tour_slug` | text, PK, FK → tours.slug, on delete cascade | tura |
| `notes` | text, default '' | napomene za celu turu, slobodan tekst (jedna po redu) |
| `room_notes` | jsonb, default '{}' | `{ "<room_id>": "napomena" }` |
| `updated_at` | timestamptz default now() | |

- RLS uključen; čitanje i pisanje samo za admina (`app_admins`), service role za rutu.
- Eksplicitni GRANT-ovi u istoj migraciji (authenticated, service_role) - pravilo od 2026-10-30.
- Posebna tabela, a ne kolona u `tours`, jer je `tours` javno čitljiva.

Unos:
- **Napomene ture:** polje "Napomene za AI" u admin prozoru sa podacima ture, sa primerima u
  placeholder-u ("renovirano 2023", "nova PVC stolarija", "klima ostaje", "pogled na park").
- **Napomena sobe:** jedno polje u prozoru AI popune (pojedinačna soba i "AI sve sobe", pre generisanja).

Pravilo za AI: napomenu koristi samo u sobi gde pripada, prilagodi je tipu oglasa,
nikad ne dodaje činjenice kojih nema u napomenama ili podacima.

### 2. Kontekst iz baze

`loadRoomContext` dobija i: deo grada, lift, podrum, stanje gradnje, uređenost, činjenice iz opisa
(`about_text_i18n`, samo kao činjenice - pohvale se ne prepisuju) i napomene.

U sobe **ne ulaze**: cena, depozit, troškovi, uslovi zakupa, pravila kuće, parking, okolina,
pitanja i odgovori. To već prikazuju Info, Pitanja, mapa i glasovni uvod.

### 3. Plan obilaska (samo "AI sve sobe")

Nova akcija `plan_tour` (jedan poziv pre soba):
- ulaz: sve sobe ture po redu obilaska (prvi dolazak u sobu iz `guide_path`, inače `order_index`),
  svaka panorama na 1024 px, podaci i napomene;
- izlaz po sobi: zadatak sobe u priči, ideja za prelaz iz prethodne sobe, napomene/činjenice koje
  pripadaju **samo toj sobi** (najviše jednom u turi; većina soba prazna);
- plan se ne čuva u bazi; "AI sve sobe" ga drži u memoriji i šalje uz svaki `generate_draft`.
- Ako plan ne uspe, "AI sve sobe" radi kao danas (bez plana) i to kaže u prozoru.
- Pre pokretanja prozor prikazuje redosled koji će AI koristiti. Ako vodič (`guide_path`) nije
  postavljen, piše upozorenje: "Vodič nije postavljen - prelazi će pratiti redosled soba.
  Postavite vodič pre AI popune." (prelazi tipa "Iz kuhinje izlazimo..." su pogrešni ako se
  vodič posle promeni).

Pojedinačna "AI Popuni Sobu" nema plan: dobija prethodnu sobu po redu obilaska (za prelaz) i
naraciju ostalih soba (kao danas, da ne ponavlja).

### 4. Novo uputstvo za sobu

- Glas: agent iz Kragujevca stoji pored posetioca; govorni srpski, latinica, obraćanje sa "vi";
  kratke rečenice za glas.
- Ugao po tipu oglasa (zamenjuje sadašnji `getClientStrategy`):
  - prodaja: stanje, kvalitet, šta se menja/ne menja posle kupovine, svetlo, raspored koji se vidi;
  - izdavanje: svakodnevica, šta je u stanu, odlaganje, održavanje;
  - "Stan na dan": doživljaj boravka, šta je gostu na dohvat ruke, odmor.
- `intro` (≤140): orijentacija + jedna stvar bitna za ovog klijenta; nikad definicija.
- `detail` (≤220): jedna konkretna stvar sa slike + sigurna praktična posledica.
- Zabranjeni počeci: "Ovo je", "Nalazimo se", "Ovde je", "<naziv sobe> je".
- Bez zaključivanja: šta predmet radi za ceo stan, "nema dodatnih troškova", da nešto ostaje
  (osim ako to kažu napomene ili "namešteno"), da je pogled lep.
- Tačke (0-4): samo gde posetilac sazna nešto što se ne vidi odmah ili što je bitno za odluku;
  naziv obavezan (1-3 reči); tekst = šta je + zašto je bitno. Očigledne stvari (vodokotlić,
  prekidač) se preskaču. Nula tačaka je ispravan odgovor.

### 5. Automatska provera

Nova čista funkcija `checkRoomDraft(draft, otherRooms)` u `app/lib/roomDraftRules.ts`
(koristi je i pregledač, bez uvoza), vraća listu problema:
- prazne pohvale (proširen `EMPTY_PRAISE`: "prostran", "sve neophodno", "sve potrebno",
  "potpuno opremljen", "funkcionaln", "praktično rešenje", "lep pogled");
- definicije ("je mesto za", "je prostor za", "služi za", "centralno mesto", "povezuje sve prostorije");
- zabranjeni počeci;
- prazan `intro` ili `detail`; tačka bez naziva; prekoračena dužina;
- isti početak (prve 3 reči) kao naracija neke druge sobe.

Ruta posle generisanja pokreće proveru; ako ima problema, **jedan** prepis sa spiskom problema.
Ono što ostane prikazuje se kao upozorenje u prozoru za pregled (postojeći mehanizam upozorenja).

### 6. Prevod

Uputstvo prevodiocu: bez "luxury" tona; isti glas agenta, govorni jezik, kratke rečenice;
bez dodavanja pohvala koje u srpskom nisu.

### 7. Modeli i pouzdanost

- Flash ostaje glavni za čitanje slike; na 503 jedan ponovljeni pokušaj posle kratke pauze, pa Lite.
- Sve unutar postojećeg vremena rute (60 s); `plan_tour` je poseban zahtev sa svojim budžetom.
- Ukloniti iz koda svako pominjanje modela koji Google više ne nudi.
- U prozoru se vidi koji model je pisao (već postoji `model` u odgovoru).

### 8. "AI sve sobe" bez pucanja

Već postoji: sobe se pišu **jedna po jedna** (ne odjednom), greška jedne sobe ne zaustavlja ostale,
a svaka prihvaćena soba se čuva odmah, pa kasnija greška ne briše urađene.

Dodaje se:
- posle pisanja, sobe koje nisu uspele dobijaju dugme **"Pokušaj ponovo"** (sada se samo preskoče
  i vide kao ✗ na kraju);
- kad Gemini vrati "preopterećen" (503/429), pauza od nekoliko sekundi pre sledeće sobe;
- upozorenje pregledača ako se tab zatvori ili osveži dok nacrti još nisu sačuvani
  (nacrti su samo u memoriji do prihvatanja).

## Van obima

- Seckanje panorame na 6 slika za preciznije tačke (obim C) - tek ako tačke i dalje promašuju.
- Automatsko prepisivanje postojećih tura - vlasnik sam bira sobe u "AI sve sobe".
- Sređivanje starog oblika teksta tačaka u bazi (string vs objekat) - čitanje već radi za oba.

## Testiranje

- `node --test`: `checkRoomDraft` (svaki problem + čist tekst bez lažnih uzbuna), izbor činjenica
  za sobu (cena/okolina ne ulaze), red obilaska iz `guide_path` (ponavljanja, prazno, neispravno).
- tsc, lint, build.
- Ručna proba: iste 3 sobe Maglićke (kupatilo, kuhinja, terasa), staro pored novog, pre pusha.
- Vlasnik testira sa pravim napomenama na sledećoj turi.
