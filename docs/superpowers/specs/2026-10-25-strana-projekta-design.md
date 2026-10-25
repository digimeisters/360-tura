# Strana projekta novogradnje: raspored oko upita, ekran stana i mediji

Datum: 25. 10. 2026.
Primer: https://kvadrat360.com/novogradnja/jadranska-garic-invest (`app/novogradnja/[slug]`, `components/projekat/*`).

Odobreni mockupi (lokalno, `public/mockup/`, nisu u git-u):

| Fajl | Šta pokazuje |
|---|---|
| `ProjekatDizajnV2.html` / `.png` | glavna strana, dizajn v2 |
| `StanDizajnV2.html` / `.png` | ekran stana, dizajn v2 (računar i telefon) |
| `ProjekatJadranskaInterakcija.html` | izbor sprata i strane zgrade |
| `ProjekatJadranskaV3.html`, `ProjekatJadranskaTelefon.html`, `ProjekatJadranskaStan*.html` | struktura (ranije verzije, isti raspored) |

## Cilj

Strana ima dva cilja, podjednako važna (vlasnik):
1. **Kupac** bira stan i šalje upit investitoru.
2. **Drugi investitori** stranu vide kao primer i traže ovakvu za svoj projekat.

Strana ostaje alat za izbor stana, ne "sajt" sa dugim marketinškim delovima. Ispod alata idu informacije, a svaki deo vodi ka stanu ili ka upitu.

### Šta je vlasnik rekao
- Pravac 1 (prodajna strana), pa: "neću da mi napraviš kao sajt… redizajniraj… celine da dovode do konverzije".
- "Mora i ispod da ima informacije".
- Računar odobren. Telefon odobren uz izmene.
- 3D render i video: grupišu se sa 360° turom. 3D render (i video iz njega) ulazi u našu ponudu investitorima, jer ga mnogi nemaju.
- Osnova se podrazumeva. Između fotografija i videa preporučen je video; vlasnik nije bio siguran i prihvatio je.
- Izbor sprata i strane zgrade treba da bude interaktivniji.
- Klik na slobodan stan ulazi u ekran tog stana sa svim informacijama (struktura, opis, mediji), a ako ima cenu, i sa kalkulatorom.
- "Ova struktura mi je dobra… dizajn treba da se poboljša" → dizajn v2: "može tako".

### Pretpostavke (nisu posebno potvrđene)
- Kompas i natpisi strana sveta se ne prave (nema podatka o orijentaciji fasade). Strana zgrade ima samo natpis iz postojećeg `project_views.label`.
- "Slični slobodni stanovi" = ista struktura, slobodni, najviše 3, prvo najbliži po kvadraturi.
- Opis stana je novo polje. Video (stan i projekat) je novo polje sa linkom; mi ga snimamo ili ga investitor pošalje.

### Uspeh
- Od ulaska do upita za konkretan stan: **najviše 3 klika** (sprat → stan → upit), bez napuštanja strane.
- "Na upit" je uvek dugme za upit, nikad slepa tačka.
- Nijedno prazno polje se ne prikazuje kao "—": deo bez podataka se sakriva.
- Strana radi i za projekat bez cena, osnova, opisa i medija (kao Jadranska danas) i izgleda završeno.

## Van obima
- Kompas / strane sveta, poređenje stanova, sačuvani stanovi, galerija fotografija.
- Promene u ugradnji kod investitora (`/novogradnja/[slug]/ugradnja`) i engleskoj verziji, osim prevoda novih tekstova (svi novi tekstovi idu i u `projectI18n` za EN).
- Cena 3D rendera u ponudi: određuje vlasnik, ne izmišlja se.

## Dizajn (v2, važi za sve ekrane)
- Tipografija:
  - Urbanist (naslovi, brojevi);
  - Inter (tekst);
  - plavi akcent u Newsreader kurzivu za deo naslova, kao na početnoj strani sajta (`feedback_tour_fonts`).
- Boje:
  - podloga `#F6F5F1`, kartice bele sa mekom senkom, ivice `#E6E3DB`;
  - akcent `#1E5AA8`;
  - statusi: slobodan zelena, rezervisan narandžasta, prodat crvena.
- Tamnoplava površina je samo jedna po ekranu: kartica cene (stan) ili broj slobodnih (projekat).
- Ikonice (linijske, kao u adminu i na sajtu) umesto emodžija.
- Statusi su male oznake sa tačkom.
- Ne deli se akcentni izraz u dva reda (`feedback_typographic_grouping`).

## 1. Glavna strana projekta

Redosled odozgo:
1. **Zaglavlje (traka):** logo, EN, dugme "Pitajte investitora" (otvara formu iz odeljka 1.4, skroluje do nje).
2. **Naslov:** eyebrow "Novogradnja · grad", naslov projekta (akcent na delu posle crte), adresa i investitor. Desno 3–5 brojeva iz podataka: slobodnih / ukupno (tamnoplav), kvadratura od–do, spratnost, cena od (samo ako postoje cene), useljenje (samo ako je upisano).
3. **Istraživač** (dve kolone na računaru):
   - **Levo, zgrada:**
     - prekidač "Zgrada · 3D render · Video" (render i video samo ako postoje za projekat);
     - filteri: struktura, kvadratura, samo slobodni;
     - scena sa fotografijom strane zgrade (`project_views`) i obojenim oblicima stanova;
     - dole levo strelice i sličice strana zgrade (natpis iz `label`), gore natpis strane;
     - legenda statusa.
   - **Desno, spratovi:**
     - lista spratova sa brojem stanova, trakom slobodno/rezervisano/prodato i oznakom "N slob.";
     - dugme "Lista svih N stanova".
   - **Interakcija:**
     - prelaz preko sprata (na fotografiji ili u listi) ističe sprat na obe strane i bledi ostale;
     - oblačić "III sprat · 9 stanova · 6 slobodnih · klik za osnovu";
     - klik na sprat otvara osnovu sprata u istoj sceni (kratka animacija), sa dugmadima spratova sa strane za skok gore/dole i "← Cela zgrada";
     - klik na stan (na fotografiji, osnovi ili u listi) otvara ekran stana (odeljak 2).
4. **Informacije ispod** (traka za skok koja ostaje pri vrhu: O projektu · Lokacija · Gradilište · Kupovina · Kontakt; stavka bez sadržaja se ne prikazuje):
   - **O projektu:** opis (ako postoji) + tabla podataka (investitor, spratnost, broj stanova, kvadratura, adresa, useljenje ako postoji) + traka "Najviše slobodnih: … → Na zgradu ↑".
   - **Lokacija:** mapa + najbliže po grupi (zdravlje, prevoz, prodavnice i apoteke, vrtići i škole, parkovi), iz postojećeg `projects.nearby`.
   - **Gradilište:** postojeći `ProjectProgress`, samo ako ima bar jedan mesec.
   - **Kupovina:** 4 koraka (Izaberite stan · Zatražite cenu · Razgledanje · Ugovor) i link na `/alati/kalkulator-kredita`.
   - **Kontakt:** tamni blok "Pitajte investitora": ime, telefon, poruka, opcioni izbor stana. Šalje preko postojećeg `/api/contact` (isti put kao `UnitInquiry`). Telefon i mejl investitora prikazuju se ako su upisani.
   - **Traka za investitore** na dnu: "Strana i izbor stana: Kvadrat360 · za investitore novogradnje" → `/za-investitore`.
5. **Telefon:**
   - isti redosled u jednoj koloni;
   - "Lista" i ekran stana otvaraju se odozdo preko zgrade (× vraća);
   - prevlačenje levo/desno menja stranu zgrade;
   - prvi dodir na sprat ga ističe, a drugi ulazi u osnovu;
   - traka na dnu uvek: "☰ Lista (N)" i "Pitajte investitora".

## 2. Ekran stana (u istoj strani)

Otvara se klikom na stan, bez nove strane. Adresa dobija `?stan=<oznaka>` da se može podeliti i da "nazad" radi. Postojeća strana `/novogradnja/[slug]/stan/[code]` ostaje za letak i deljenje.

- **Zaglavlje:**
  - "← III sprat · N stanova · M slobodnih";
  - "Stan 12 · *Trosoban*" i oznaka statusa;
  - red podataka: površina, terasa, sprat, orijentacija (ako postoji);
  - strelice "‹ Stan 11 · Stan 13 ›" (prethodni i sledeći na istom spratu).
- **Levo:**
  1. **Mediji, kartice** "Osnova · 360° tura · 3D render · Video". Prikazuju se samo kartice sa sadržajem, a prva je Osnova. Osnova: postojeći `plan_url` (kad postoji) sa "Ceo ekran". 360°: `tour_id` → tura. 3D render: postojeći `plan3d_url`. Video: novo polje.
  2. **Prostorije:** postojeći `rooms` (naziv + m²) sa ikonicom po vrsti prostorije i "Ukupno". Prelaz preko prostorije je ističe na osnovi samo ako osnova ima obeležene prostorije; inače samo u listi.
  3. **O stanu:** spavaće sobe, kupatila (iz `rooms`, ako se mogu prebrojati), sprat, orijentacija, opis (novo polje).
  4. **Položaj:** mala zgrada sa označenim spratom i šema sprata sa označenim stanom.
  5. **Slični slobodni stanovi** (do 3).
- **Desno** (lepi se pri skrolovanju):
  - **Sa cenom:** tamnoplava kartica cene (cena, €/m², napomena o PDV-u ako postoji u podacima); postojeći `PaymentCalculator` u novom izgledu; forma "Zakažite obilazak" (ime, telefon). Uz upit ide i obračun iz kalkulatora.
  - **Bez cene:** kartica "Na upit" i forma "Zatražite cenu i uslove" (ime, telefon).
  - Ispod: letak PDF (postojeći), podeli, investitor (ime, telefon ako postoji).
- **Prodat ili rezervisan stan:** ekran se otvara, bez kalkulatora i upita za taj stan. Umesto toga stoji oznaka statusa i "Slični slobodni stanovi" na vrhu desne kolone.
- **Telefon:** jedna kolona istim redom. Traka na dnu: cena (ili mesečna rata kad je kalkulator otvoren; "Cena na upit" bez cene) i dugme "Pošaljite upit" / "Zatražite cenu" koje skroluje do forme.

## 3. Podaci i admin

| Polje | Gde | Novo? |
|---|---|---|
| Opis stana | `project_units.description` (text, ≤ 600) + EN | novo, migracija |
| Video stana | `project_units.video_url` (link) | novo, migracija |
| 3D render i video projekta | `projects.render_url`, `projects.video_url` | novo, migracija |
| Strane zgrade | `project_views` (+ `label`) | postoji |
| 3D render stana | `project_units.plan3d_url` | postoji |

- Nove kolone dobijaju GRANT-ove u istoj migraciji (`project_supabase_explicit_grants`) i ulaze u `npm run db:types`.
- Admin (`/admin/projekti/[id]`): polja za opis i video u prozoru stana (`UnitMediaModal`); render i video projekta u sekciji "Podaci".

## 4. Ponuda: 3D render i video
- Na `/za-investitore` se dodaje usluga "3D render enterijera i fasade" i "Video iz rendera".
- Cena: **prazno dok je vlasnik ne odredi**. Do tada piše "na upit".

## Greške i krajnji slučajevi
- **Nema `project_views`:** pada se na postojeći crtež zgrade sa spratovima.
- **Projekat sa lamelama:** prvo izbor lamele (postojeći "Kompleks iz vazduha"), pa ista interakcija po lameli.
- **Upit nije poslat:** poruka greške u formi, uneti podaci ostaju, dugme ponovo radi.
- **`?stan=` sa nepostojećom oznakom:** strana se otvara bez ekrana stana.
- **Nijedan slobodan stan:** "Samo slobodni" je isključen, a broj slobodnih je 0 / N.

## Provera
- tsc čist; lint bez novih grešaka.
- Ručno na Jadranskoj (bez cena, osnova i medija), na lokalnom serveru, sa probnim podacima u lokalnoj bazi ili na kopiji projekta. Pravi podaci Garić Investa se ne menjaju bez pitanja.
- Provera na telefonu (375 px): traka na dnu, ekran stana odozdo, prevlačenje strana.
- Upit sa strane i iz ekrana stana stiže na isti put kao danas (`/api/contact`) sa oznakom stana.

## Redosled rada (faze; svaka je poseban plan i poseban push)
1. Glavna strana: novi raspored, istraživač sa interakcijom spratova i strana, informacije ispod, kontakt, sakrivanje praznih podataka, dizajn v2.
2. Ekran stana u istoj strani (`?stan=`), sa medijima, prostorijama, kalkulatorom i upitom.
3. Nova polja i admin (opis i video stana; render i video projekta).
4. Ponuda 3D rendera na `/za-investitore`.
