# Uputstvo: kreiranje ture

Kompletan tok, od unosa nekretnine do objavljene ture.

> Ovaj dokument je živ — kad promenimo neku funkciju, izmena se upisuje ovde.
> Poslednja izmena: 27.09.2026.

---

## Pregled toka

```
1. Unos nekretnine   →  /unos  (agent)  ili  /admin/ture  (ti)
2. Sobe i panorame   →  /tour/<slug>?admin=1
3. Tekst i jezici    →  AI draft, prevodi, naracija
4. Tačke u prostoru  →  hotspotovi
5. Tlocrt            →  oznake soba na skici
6. Objava            →  /admin/ture → „Objavi"
7. Praćenje          →  /admin/analitika
```

**Nova tura je „u pripremi" dok je ne objaviš.** Link radi samo tebi, prijavljenom; za sve ostale se ponaša kao da ne postoji, i Google je ne vidi. Tako niko ne može da naleti na poluzavršenu turu.

---

## 1. Unos nekretnine

### A) Upitnik za agenta — `kvadrat360.com/unos`

Ovo je glavni put. Agent popunjava, tura se pravi sama.

Šta upitnik traži:

| Odeljak | Polja |
|---|---|
| Osnovni podaci | tip i struktura nekretnine, naslov, adresa, grad, naselje, sprat, lift, podrum, grejanje, status gradnje, stanje enterijera, terasa, parking, Google Maps embed link (opciono), kratak opis (opciono, ≤2 rečenice), tlocrt |
| Oglašivač | svojstvo, naziv agencije, ime, telefon, e-mail |
| Vrsta oglasa | Izdavanje / Prodaja / Stan na dan + jezici ture |
| Uslovi | pitanja se menjaju prema izabranoj vrsti oglasa (cena, kvadratura, uslovi ugovora/kredita/otkazivanja...); **depozit** samo za izdavanje, **uknjiženost** samo za prodaju |
| Slanje | **kod za slanje** |

Napomene:

- **Kod za slanje** je vrednost iz `FORM_ACCESS_CODE` (Vercel → Settings → Environment Variables). Daje se agenciji zajedno sa linkom. Menja se izmenom te varijable i redeploy-om; stari kod odmah prestaje da važi.
- **Link se ne kuca** — pravi se iz naslova. Naša slova i ćirilica se preslovljavaju, a ako naslov već postoji, dodaje se broj na kraj.
- **Slanje traje do pola minuta** — u tom trenutku AI čisti podatke, piše kratku napomenu i pet FAQ odgovora na svim izabranim jezicima. Naselje, kvadratura, struktura, sprat, lift, podrum, grejanje, status gradnje, stanje, terasa, parking, depozit i uknjiženost **ne prolaze kroz AI** — agent ih bira sa zatvorene liste ili kuca, upisuju se tačno tako, a aplikacija ih sama prevodi za posetioca ture.
- **Struktura se posetiocu prikazuje bez oznake u zagradi** — agent bira „Dvosoban (2.0)", a u turi, na `/ture` i na početnoj piše „Dvosoban". U bazi i u linku filtera ostaje pun naziv.
- **Lift i podrum nemaju podrazumevan odgovor** — moraju se ručno izabrati (Da/Ne), namerno: pogrešan da/ne podatak je gori od praznog.
- **Ništa se ne gubi** — pogrešan kod ostavlja formular popunjen, a nacrt se čuva u pretraživaču i ako se stranica osveži.
- **Tlocrt mora biti slika** (JPG, PNG, WEBP). PDF se ne prihvata jer se u turi crta kao slika.
- **Mapa se pravi iz adrese.** Polje za Maps link je opciono i prima samo *embed* oblik (`google.com/maps/embed?pb=...`), jer Google zabranjuje ugrađivanje običnog share linka.

### B) Ručno — `kvadrat360.com/admin/ture`

Za tvoje unose i za ispravke. Prijava administratorskim nalogom.

- Formular pravi turu: naslov, agencija, tip oglasa, adresa, grad, naselje, struktura, kvadratura, cena, sprat, lift, podrum, grejanje, status gradnje, stanje enterijera, terasa, parking, depozit (izdavanje), uknjiženost (prodaja), tip nekretnine, podaci agenta.
- Pri **izmeni** se uređuju i odgovori na pet pitanja (modul „Pitanja").
- Posle čuvanja sa adresom tura sama dobija koordinate za mapu na `/ture`.
- Link se generiše iz naslova i vidi se uživo dok kucaš.
- **Izmena** postojeće ture menja samo prikazane podatke — **link se ne menja**, jer su za njega vezani podeljeni linkovi i zabeležena analitika.
- Lista pokazuje sve ture, stanje (**Objavljena** / **U pripremi**), broj soba i crveno upozorenje kad tura nema sobe ili neka soba nema panoramu.
- **`Objavi` / `Skini`** menja stanje jednim klikom. Objava se ne da ako tura nema nijednu sobu, a pita za potvrdu ako neka soba nema panoramu. Skidanje sa objave takođe pita — podeljeni linkovi tad prestaju da rade.
- **`QR`** pravi QR kod ture sa logom Kvadrat360 u sredini (deo Premium paketa): `Preuzmi PNG` za oglas, poruku i društvene mreže, `Preuzmi SVG` za letak i izlog (oštar u svakoj veličini; na štampi najmanje 2,5 cm). Kod radi tek kad je tura objavljena.
- **`Obriši`** trajno uklanja turu, sobe, panorame i statistiku. Traži da upišeš slug ture za potvrdu, jer se ne može vratiti.

Razlika: upitnik popunjava i opis i svih pet odgovora; ručni panel pravi turu bez njih — njega koristi za osnovne podatke i ispravke (odgovori se dopisuju kroz `Izmeni`).

---

## 2. Sobe i panorame

Otvori `kvadrat360.com/tour/<slug>?admin=1` i prijavi se. Zatim:

**Dodaj sobu** — dugme `➕ Soba`. Prva soba je ono što posetilac prvo vidi; redosled soba je redosled obilaska.

**Otpremi panoramu** — dugme za panoramu, sa tvog diska.

- Podržano: JPG, PNG, WEBP, do 40MB.
- Slika se na serveru pretvara u **WebP u punoj rezoluciji** — oko 90% manja bez vidljive razlike. Rezolucija se ne dira.
- Usput se prave još dve kopije: mala sličica za share karticu i **lakša panorama za telefone** (6000 px širine). Telefon učitava nju — ista oštrina na malom ekranu, a skoro upola manje memorije, pa stariji iPhone ne ruši turu. Računar i dalje učitava punu panoramu.
- **Zamena pogrešne slike** radi: otpremi novu i potvrdi pitanje. Svaka zamena dobija novu adresu, pa se odmah vidi.

Ostali alati u gornjoj admin traci:

| Dugme | Šta radi |
|---|---|
| `✏️ Preimenuj` | menja naziv trenutne sobe |
| `🗑️ Soba` | trajno briše sobu, njenu panoramu i strelice iz drugih soba koje vode u nju |
| `🗑️ Panorama` | briše samo sliku (npr. pogrešno otpremljenu); soba ostaje |
| `📝` uvodna naracija | menja tekst kojim vodič otvara sobu |
| putanja vodiča | redosled soba kojim ide automatski vodič, brojevi odvojeni zarezom |

---

## 3. Tekst, jezici i naracija

**AI popuna (SR)** — čita samu panoramu i piše srpski opis sobe i predlog tačaka. Zna naziv sobe, podatke o stanu i šta je već rečeno u drugim sobama, pa ne izmišlja raspored i ne ponavlja uvode. Otvara se prozor `✏️ Pregled i Izmena AI Drafta (SR)` gde ispraviš šta treba pre nego što se sačuva. Tu biraš i na koje jezike da se prevede.

U tom prozoru:
- **Ispod svakog polja je brojač** (npr. `118/140`): crveno kad je tekst predugačak, žuto upozorenje za prazne pohvale („savršen", „idealan"…) i za ono što glas loše čita („m²", skraćenice).
- **`🔍 Proveri i ispravi`** — AI lektor pregleda tekst pre prevoda: gramatiku, da li prirodno zvuči kad se izgovori, ponavljanja. Svaki predlog prihvatiš ili odbaciš (ili „Prihvati sve"). Za tvrdnje koje ne vidi na slici (npr. „hidromasaža", „bojler od 80 litara") napiše žuto „Proveri: …" ispod polja — to ne menja sam, jer ti znaš stan. Traje nekoliko sekundi. Vredi ga pustiti pre svakog prevoda, jer se greška u srpskom prenese na sve jezike.

Tekst se piše prema **tipu oglasa ture**: za prodaju se naglašava vrednost i raspored, za izdavanje svakodnevna praktičnost, za stan na dan atmosfera i ugođaj. Tip se uzima sa same ture, pa ga ne biraš ručno.

**`🌐 Dodaj Jezik`** — prevodi sobu na još neki jezik, u bilo kom trenutku, i naknadno. Postojeći prevodi se ne gube. Svaki jezik se prevodi svojim pozivom, pa ako jedan ne uspe, ostali su i dalje tu.

**`🎙️ AI Glasovna Naracija`** — **trenutno ne radi.** Servis za sintezu govora nije podešen na serveru, pa dugme vraća poruku o tome. Tekstualni deo ture radi normalno.

Jezici koje posetilac vidi ne biraju se ručno — pojavljuju se sami, čim soba dobije tekst na tom jeziku.

---

## 4. Tačke u prostoru (hotspotovi)

U admin režimu **klikni na mesto u panorami** gde želiš tačku. Otvara se prozor sa tri tipa:

| Tip | Čemu služi |
|---|---|
| `🚪 Strelica za prelaz` | Vodi u drugu prostoriju. Bira se ciljna soba. |
| `ℹ️ Info tačka` | Naslov i tekst o detalju u prostoru, uz opcioni zvuk. |
| `🎬 Uvodna naracija` | **Nije klikabilna tačka.** Određuje odakle se soba otvara i šta vodič prvo kaže. |

Napomene:

- Klik na **postojeću** tačku u admin režimu je otvara za izmenu; pomeranje se vidi odmah, uživo.
- Tekst tačke se unosi na jeziku koji je trenutno izabran; prevodi ostalih jezika ostaju netaknuti.
- Uvodna naracija je ono što daje utisak vođene ture — vredi je postaviti u svakoj sobi.

---

## 5. Tlocrt

Ako tura ima tlocrt (otpremljen kroz upitnik), otvori modal **Skica** u admin režimu i **klikni na mesto** gde se nalazi trenutna soba. Time se postavlja oznaka za tu sobu.

Posetilac zatim klikom na oznaku skače pravo u tu prostoriju.

Ponovi za svaku sobu. Oznaka trenutne sobe je istaknuta drugom bojom.

**Konus pogleda:** na maloj mapi i u modulu Plan, iz tačke sobe u kojoj je posetilac, plavi konus pokazuje kuda gleda i koliko široko (zum ga sužava). Pravac se računa sam, iz tačaka soba na planu i strelica za prelaz u panoramama, pa za tačan konus treba:
- da svaka soba ima tačku na planu;
- da strelice za prelaz vode u prave sobe.

Soba bez ijedne strelice ka označenoj sobi nema konus, jer bi pokazivao nasumično.

---

## 6. Objava

Dok je tura „u pripremi", link vraća „tura nije pronađena" svima osim tebi. To je namerno: tako se link može pripremiti, testirati i podeliti tek kad je tura gotova.

Objavi je tek kad:

- sve sobe imaju panoramu,
- prva soba je ona kojom želiš da tura počne,
- hotspotovi za prelaz vode kuda treba.

`/admin/ture` → `Objavi`. Od tog trenutka tura je javna i ulazi u sitemap.

Ako nešto krene naopako, `Skini` je vraća u pripremu — ali linkovi koje si već podelio tada prestaju da rade, pa to nije potez za usput.

### Tura na početnoj strani sajta

Objavljena tura se **sama pojavi** na `kvadrat360.com`, u odeljku „Primeri tura": kartica sa naslovnom slikom (dnevna soba, ako je ima), tipom oglasa, jezicima i dugmetom „Otvori turu". Skinuta tura sa sajta nestaje.

- Promena se vidi odmah posle `Objavi` / `Skini`, izmene naziva ili zamene panorame. Inače se sajt osvežava sam, najkasnije na sat.
- Kadar u vrhu strane, sa čipovima soba, pokazuje turu **`stan-gasse-1`**. Ako ona nije objavljena, uzima se objavljena tura sa najviše soba. Za drugu turu u vrhu — reci mi, menja se u kodu (`HERO_TOUR_SLUG` u `app/lib/showcaseTours.ts`).
- Naziv na kartici je naziv ture, tačno kako je upisan. Ružan naziv (npr. `stan-gasse-apartman`) ispravi u `/admin/ture` → `Izmeni`.
- Ista tura se pojavljuje i na engleskoj početnoj, `kvadrat360.com/en`. Tamo kartica pokazuje engleski naziv, ako ga tura ima, i otvara turu na engleskom. Za kadar u vrhu engleske strane prednost ima tura koja ima engleski; ako `stan-gasse-1` nema engleski, tamo se prikazuje druga tura.

### Link ture na određenom jeziku

Na kraj linka dodaj `?lang=` i tura se otvara odmah na tom jeziku, bez biranja na početnom ekranu:

- `kvadrat360.com/tour/stan-gasse-1?lang=de` — nemački, npr. za agenciju iz Beča
- `?lang=en` engleski, `?lang=ru` ruski

Ako tura nema traženi jezik, otvara se na srpskom. Posetilac i dalje može da promeni jezik u turi.

### Šta posetilac vidi u turi

Korisno kad agenciji objašnjavaš turu ili proveravaš da li nešto radi kako treba.

- **Početni ekran:** izbor jezika, „Istražite sami" ili „Automatsko vođenje", i link „Kako radi 360° tura?" — prozor sa 4 slikovna koraka, zatvara se na ×.
- **Kartica sa naslovom** (gore levo) nosi i dugme za **deljenje ture**.
- **Kartica sa tekstom** (naracija i info-tačke) pokazuje naziv i dva reda teksta; ostatak otvara „Više".
- **Donji moduli:** Plan (tlocrt, uz objašnjenje da je to mapa stana i da tačka vodi u prostoriju), Lokacija, Info (grad, ulica, cena, cena po m² i sve činjenice u jednoj čitkoj celini), Pitanja (sa pozivom i mejlom agenta na dnu), Kontakt. U dnu modula diskretno stoji „360° turu izradio Kvadrat360" — link na naš sajt, meri se kao `utm_source=tura`.
- **Prostorija koju je posetilac već obišao** ne priča ponovo svoju priču kad se u nju vrati.
- **„Istražite sami":** donji meni je uvek na ekranu (kartica sa tekstom stoji iznad njega), soba se ne okreće sama: posetilac vidi uvod sobe (na telefonu do tri reda, „Više" za ostatak) i sam dodiruje tačke. Dok prstom razgleda panoramu, sklanja se sve osim donjeg menija, koji tada pokazuje samo uvećane ikonice; nazivi i ostala dugmad vraćaju se 3 sekunde pošto pusti ekran. U „Automatskom vođenju" vodič i dalje vodi do kraja sobe.
- **Na telefonu:** dok posetilac prstom okreće panoramu, dugmad se povlače u stranu i vraćaju se sekund i po posle.
- **Dugme „nazad"** (Android) i povlačenje od ivice (iPhone) prvo zatvaraju ono što je otvoreno (modul, karticu, formu). Kad ništa nije otvoreno, tura pita „Da li želite da napustite turu?"; još jedno „nazad" izlazi. Ako je tura otvorena direktno iz poruke (nema strane pre nje), izlazak vodi na početnu stranu sajta.

---

## 7. Analitika — `kvadrat360.com/admin/analitika`

Jedan ekran, sve ture. Period 7 / 30 / 90 dana.

- **Otvaranja** — koliko puta je link otvoren
- **Posetilaca** — različiti posetioci
- **Ušlo u turu** — koliko njih zaista pokrene turu umesto da odustane na početnom ekranu
- **Deljenja** i **Kontakt** — klikovi na deljenje i otvaranja kontakt prozora
- Klik na red otvara **vreme po prostoriji** — koja se najduže gleda, gde ljudi odustaju

Tvoje posete se **ne broje** dok si prijavljen kao administrator. Preview botovi (WhatsApp, Facebook) se takođe ne broje.

Ispod tura je odeljak **Početna strana** (radi posle migracije `008_site_events.sql`):

- **Posetilaca** i **Poslatih upita** preko forme, i koliki deo posetilaca pošalje upit
- **Sa telefona** — koliki deo poseta dolazi sa telefona
- **Klikovi** — „Pogledajte primer ture", kartice tura, paketi, poziv / Viber / WhatsApp / mejl / mapa
- **Odakle dolaze** — sa kog sajta je posetilac došao (google.com, instagram...). Za kampanju dodaj `?utm_source=naziv` na link, npr. `kvadrat360.com/?utm_source=facebook_oglas`, pa se vidi posebno.

---

## 8. Pristup i kodovi

| Šta | Gde stoji | Ko koristi |
|---|---|---|
| Admin nalog | Supabase Auth, e-mail mora biti u `ADMIN_EMAILS` | ti |
| Kod za upitnik | `FORM_ACCESS_CODE` | agencija |

Javna registracija na Supabase-u je **isključena** — nalog može da napravi samo ti, iz Supabase panela.

Sve varijable se podešavaju na Vercel → Settings → Environment Variables, i traže **redeploy** da bi počele da važe.

---

## 9. Šta se još ne uređuje kroz aplikaciju

Ovo se popunjava **samo pri prvom unosu kroz upitnik**. Naknadna izmena ide direktno u Supabase, tabela `tours`:

| Sadržaj | Kolona |
|---|---|
| Kratka napomena u modulu „Info" | `about_text_i18n` |
| Slika tlocrta | `floorplan_url` (ili šematski plan: `/admin/ture` → `🗺 Plan`) |
| Mapa lokacije | `location_map_url` |

Sve ostalo u modulu „Info" (grad, ulica, cena i cena po m², naselje, kvadratura, struktura, sprat, lift, podrum, grejanje, status gradnje, stanje, terasa, parking, depozit, uknjiženost) i odgovori u modulu „Pitanja" **se uređuju** kroz `/admin/ture` → `Izmeni`.

Prazno polje se u turi ne prikazuje — red jednostavno izostane. Zato je bolje ostaviti prazno nego upisati netačno.

---

## 10. Česti problemi

**Tura se otvara ali panorama neće da se učita.**
Slika je obrisana sa starog Supabase Storage-a. Otpremi je ponovo kroz admin režim.

**Zamenio sam sliku a vidim staru.**
Za slike otpremljene pre 11.09.2026. pretraživač može da drži staru u kešu — osveži sa `Ctrl+Shift+R`. Kasnije otpremljene se menjaju odmah.

**Podelio sam turu a preview pokazuje staru sliku.**
Facebook i WhatsApp keširaju preview. Proveri kako stvarno izgleda na `opengraph.xyz`.

**Upitnik javlja da kod nije ispravan.**
Kod na Vercelu i onaj koji si dao agenciji nisu isti, ili posle izmene nije urađen redeploy.

**Upitnik javlja „previše pokušaja".**
Pet pogrešnih kodova sa iste veze zatvara slanje na petnaest minuta. Ispravan kod se ne broji, pa agent koji radi turu za turom ne može da se saplete o ovo.

**Poslao sam link, a agenciji piše da tura ne postoji.**
Tura je još „u pripremi". Otvori `/admin/ture` i klikni `Objavi`.

**Admin panel javlja da nalog nema prava.**
E-mail nije u `ADMIN_EMAILS` na Vercelu.

**AI tačke padaju pored onoga što opisuju.**
Za sobe popunjene pre 11.09.2026. — model tada nije dobijao objašnjenje koordinata. Pokreni AI popunu ponovo ili pomeri tačke ručno.

**Google Forma više ne upisuje ture.**
Tako i treba — ruta za nju je uklonjena 11.09.2026. Jedini put za unos je `/unos`. Ako Apps Script okidač još radi, ugasi ga da ne šalje u prazno.
