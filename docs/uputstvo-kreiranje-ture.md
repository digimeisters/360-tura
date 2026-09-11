# Uputstvo: kreiranje ture

Kompletan tok, od unosa nekretnine do objavljene ture.

> Ovaj dokument je živ — kad promenimo neku funkciju, izmena se upisuje ovde.
> Poslednja izmena: 11.09.2026.

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
| Osnovni podaci | tip nekretnine, naslov, adresa, Google Maps embed link (opciono), kratak opis, tlocrt |
| Oglašivač | svojstvo, naziv agencije, ime, telefon, e-mail |
| Vrsta oglasa | Izdavanje / Prodaja / Stan na dan + jezici ture |
| Uslovi | pitanja se menjaju prema izabranoj vrsti oglasa |
| Slanje | **kod za slanje** |

Napomene:

- **Kod za slanje** je vrednost iz `FORM_ACCESS_CODE` (Vercel → Settings → Environment Variables). Daje se agenciji zajedno sa linkom. Menja se izmenom te varijable i redeploy-om; stari kod odmah prestaje da važi.
- **Link se ne kuca** — pravi se iz naslova. Naša slova i ćirilica se preslovljavaju, a ako naslov već postoji, dodaje se broj na kraj.
- **Slanje traje do pola minuta** — u tom trenutku AI čisti podatke, piše opis i svih pet odgovora na svim izabranim jezicima.
- **Ništa se ne gubi** — pogrešan kod ostavlja formular popunjen, a nacrt se čuva u pretraživaču i ako se stranica osveži.
- **Tlocrt mora biti slika** (JPG, PNG, WEBP). PDF se ne prihvata jer se u turi crta kao slika.
- **Mapa se pravi iz adrese.** Polje za Maps link je opciono i prima samo *embed* oblik (`google.com/maps/embed?pb=...`), jer Google zabranjuje ugrađivanje običnog share linka.

### B) Ručno — `kvadrat360.com/admin/ture`

Za tvoje unose i za ispravke. Prijava administratorskim nalogom.

- Formular pravi turu: naslov, agencija, tip oglasa, adresa, tip nekretnine, podaci agenta.
- Link se generiše iz naslova i vidi se uživo dok kucaš.
- **Izmena** postojeće ture menja samo prikazane podatke — **link se ne menja**, jer su za njega vezani podeljeni linkovi i zabeležena analitika.
- Lista pokazuje sve ture, stanje (**Objavljena** / **U pripremi**), broj soba i crveno upozorenje kad tura nema sobe ili neka soba nema panoramu.
- **`Objavi` / `Skini`** menja stanje jednim klikom. Objava se ne da ako tura nema nijednu sobu, a pita za potvrdu ako neka soba nema panoramu. Skidanje sa objave takođe pita — podeljeni linkovi tad prestaju da rade.
- **Nema brisanja ture** — nepovratno je i povuklo bi sobe i analitiku. Briše se u Supabase-u, uz razmišljanje.

Razlika: upitnik popunjava i opis i svih pet odgovora; ručni panel ne — njega koristi za osnovne podatke i ispravke.

---

## 2. Sobe i panorame

Otvori `kvadrat360.com/tour/<slug>?admin=1` i prijavi se. Zatim:

**Dodaj sobu** — dugme `➕ Soba`. Prva soba je ono što posetilac prvo vidi; redosled soba je redosled obilaska.

**Otpremi panoramu** — dugme za panoramu, sa tvog diska.

- Podržano: JPG, PNG, WEBP, do 40MB.
- Slika se na serveru pretvara u **WebP u punoj rezoluciji** — oko 90% manja bez vidljive razlike. Rezolucija se ne dira.
- Usput se pravi i mala sličica za share karticu.
- **Zamena pogrešne slike** radi: otpremi novu i potvrdi pitanje. Svaka zamena dobija novu adresu, pa se odmah vidi.

---

## 3. Tekst, jezici i naracija

**AI popuna (SR)** — čita samu panoramu i piše srpski opis sobe i predlog tačaka. Otvara se prozor `✏️ Pregled i Izmena AI Drafta (SR)` gde ispraviš šta treba pre nego što se sačuva. Tu biraš i na koje jezike da se prevede.

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

---

## 6. Objava

Dok je tura „u pripremi", link vraća „tura nije pronađena" svima osim tebi. To je namerno: tako se link može pripremiti, testirati i podeliti tek kad je tura gotova.

Objavi je tek kad:

- sve sobe imaju panoramu,
- prva soba je ona kojom želiš da tura počne,
- hotspotovi za prelaz vode kuda treba.

`/admin/ture` → `Objavi`. Od tog trenutka tura je javna i ulazi u sitemap.

Ako nešto krene naopako, `Skini` je vraća u pripremu — ali linkovi koje si već podelio tada prestaju da rade, pa to nije potez za usput.

---

## 7. Analitika — `kvadrat360.com/admin/analitika`

Jedan ekran, sve ture. Period 7 / 30 / 90 dana.

- **Otvaranja** — koliko puta je link otvoren
- **Posetilaca** — različiti posetioci
- **Ušlo u turu** — koliko njih zaista pokrene turu umesto da odustane na početnom ekranu
- **Deljenja** i **Kontakt** — klikovi na deljenje i otvaranja kontakt prozora
- Klik na red otvara **vreme po prostoriji** — koja se najduže gleda, gde ljudi odustaju

Tvoje posete se **ne broje** dok si prijavljen kao administrator. Preview botovi (WhatsApp, Facebook) se takođe ne broje.

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
| Tekst u modalu „Info" | `about_text_i18n` |
| Odgovori u modalu „Pitanja" | `faq_1_i18n` … `faq_5_i18n` |
| Slika tlocrta | `floorplan_url` |
| Mapa lokacije | `location_map_url` |

Ako ovo počne često da treba, sledeći korak je dopuna `/admin/ture` da i ta polja uređuje kroz formular.

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
