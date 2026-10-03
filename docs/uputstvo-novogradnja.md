# Uputstvo: novogradnja (paket za investitore)

Kako se postavlja projekat novogradnje: zgrada → sprat → stan, i kako prodaja investitora sama menja status i cene.

> Ovaj dokument je živ — kad promenimo neku funkciju, izmena se upisuje ovde.
> Poslednja izmena: 02.10.2026. (lamele, rotacija, stanovi na fasadi, lista stanova)

Uputstvo za ture je u [`uputstvo-kreiranje-ture.md`](uputstvo-kreiranje-ture.md). Ture i projekti su odvojeni: projekat na turu samo pokazuje, pa izmena projekta nikad ne kvari turu.

---

## Pregled toka

```
1. Novi projekat         →  /admin/projekti  (dugme „Novogradnja" u /admin/ture)
2. Podaci projekta       →  naziv, investitor, adresa, useljenje, kontakt prodaje
2a. Lamele (opciono)     →  kompleks sa više zgrada + slika iz vazduha
3. Fasada i spratovi     →  slike zgrade (rotacija) + obeležavanje spratova i/ili stanova
4. Stanovi               →  uvoz iz Excela (ili jedan po jedan)
5. Osnove spratova       →  slika osnove + obeležavanje stanova, pa kopiranje na tipske spratove
6. Ture i pogled         →  360° tura za stan, „pogled sa sprata" za sprat
7. Pokazivanje          →  „Link za pokazivanje ↗" (važi 30 dana, izgleda kao prava strana)
8. Objava                →  „Objavi"
9. Pristup za prodaju    →  lični linkovi za prodaju investitora
```

Javna strana projekta je **`kvadrat360.com/novogradnja/<naziv-projekta>`**. Vidi se tek kad klikneš „Objavi".

---

## 1. Novi projekat

`/admin/projekti` → upiši naziv kako ga investitor prodaje (npr. „Lepenički cvet") → **+ Napravi projekat**.

- Adresa strane se pravi iz naziva prilikom pravljenja i **posle se ne menja**, pa piši naziv odmah kako treba — sa velikim slovom i kvačicama. Dok kucaš, ispod polja piše kakva će biti adresa (`/novogradnja/lepenicki-cvet`).
- Ako naziv počinje malim slovom ili izgleda da fale kvačice (npr. „lepenicki" → „Lepenički", „dj" → „đ"), pojavi se žuto upozorenje sa dugmetom **Ispravi u „…"**. Ako ipak klikneš „Napravi projekat" bez ispravke, pita te još jednom.
- Naziv koji se prikazuje na strani možeš kasnije da ispraviš u „Podaci projekta" (isto upozorenje važi i tamo).

## 2. Podaci projekta

Naziv, investitor, adresa, grad, useljenje (slobodan tekst, npr. „jun 2027"), telefon i email prodaje, opis. Klikni **Sačuvaj podatke**.

Telefon i email prodaje stoje na dnu javne strane („Prodaja: …").

## 2a. Lamele i kompleks (više zgrada)

Ako investitor gradi **više lamela ili zgrada**, kartica **Zgrade i lamele**:

1. Prvi put: upiši naziv postojeće zgrade (npr. „Lamela A") i nove („Lamela B") → **+ Podeli na lamele**. Spratovi, stanovi i slike koji već postoje prelaze u prvu lamelu — ništa se ne briše.
2. Svaka sledeća: upiši naziv → **+ Lamela**.
3. **Klik na lamelu** bira koju uređuješ — fasada, spratovi i osnove ispod su za nju. Tabela stanova na dnu prikazuje sve lamele.
4. Naziv lamele menjaš u polju ispod; **Obriši lamelu** radi samo za praznu lamelu (bez spratova).

**Kompleks iz vazduha** (pojavi se kad postoje bar dve lamele): otpremi render ili snimak dronom celog kompleksa → za svaku lamelu u spisku desno **Iscrtaj** → obeleži je klik po klik. Kupac na javnoj strani prvo klikne lamelu na toj slici. Bez ove slike kupac bira lamelu sa kartica (slika fasade + broj slobodnih).

Oznake stanova moraju biti različite u celom projektu — npr. „A12" i „B12", a ne dva puta „12".

## 3. Fasada i spratovi

Kartica **Fasada i spratovi** (kod kompleksa: za izabranu lamelu).

1. **Slike fasade:** fotografija ili render zgrade (JPG, PNG, WEBP). Velika slika se sama smanji pre slanja.
   - **Više slika = rotacija:** **+ Slika** dodaje istu zgradu iz drugog ugla (ulica, dvorište…). Kupac ih okreće strelicama ‹ › (na telefonu i prevlačenjem prstom). Najviše 8 slika po zgradi.
   - Ispod slike: **natpis** („Ulica", „Dvorište" — vidi se na javnoj strani), **← →** menja redosled, **Zameni sliku** (nov render iz ISTOG ugla — nacrtani oblici ostaju), **Obriši sliku** (briše i oblike na njoj).
   - Oblici se crtaju posebno na svakoj slici.
2. **Dodaj spratove** u polju pored spiska:
   - jedan sprat: `3`, `P`, `prizemlje`, `1. sprat`
   - više odjednom: `P, 1, 2`
   - **sve odjednom: `P-6`** (prizemlje i spratovi 1–6)
   - sprat koji već postoji se preskače
3. **Obeleži svaki sprat na slici:** prekidač **Na slici crtam: Spratove** → izaberi sprat u spisku → **Iscrtaj na slici** → klikći redom na uglove sprata na slici. Oblik zatvaraš klikom na prvu tačku ili tasterom **Enter**.
   - `↶ Poništi tačku` (ili `Backspace`) briše poslednju tačku
   - `Otkaži` (ili `Esc`) prekida crtanje
   - **ispravka bez ponovnog crtanja:** izaberi sprat (klik na njega na slici ili u spisku) — na uglovima se pojave kvadratići:
     - **povuci kvadratić** = pomeriš ugao;
     - **povuci malu tačku na sredini ivice** = dodaš novi ugao;
     - **dvoklik na kvadratić** = obrišeš ugao (ostaju najmanje 3);
     - čuva se čim pustiš miš; ako čuvanje ne uspe, oblik se vrati na stari;
   - potpuno pogrešan oblik: **Iscrtaj ponovo**; sklanjanje sa slike: **Ukloni sa slike**
   - **✨ Predloži spratove (AI):** kad su spratovi dodati (npr. „P-6") i slika fasade otpremljena, dugme pored „Na slici crtam" za 5–10 sekundi predloži oblik svakog sprata, od prizemlja nagore (ljubičasto na slici). Klikni sprat i povuci ugao ako ne leži tačno, pa **Sačuvaj predlog**, ili **Odbaci**. Čuvanje zamenjuje spratove već nacrtane na toj slici. Predlog je pravougaonik: kad je zgrada snimljena iskosa, povuci uglove da prate perspektivu. Ako AI vidi manje etaža nego što projekat ima, gornji ostaju za ručno crtanje.
4. **Stanovi na fasadi (kao Sokolis):** prekidač **Na slici crtam: Stanove** → u spisku desno za svaki stan **Iscrtaj** → obeleži njegov deo fasade (prozori i terasa tog stana). × sklanja oblik sa slike. Stan koji se ne vidi sa te strane ostavi neiscrtan, ili ga nacrtaj na drugoj slici.
   - Kupac na javnoj strani vidi stanove obojene po statusu (zeleno slobodan, žuto rezervisan, sivo prodat); prelaz mišem pokaže oznaku i cenu, a klik odmah otvara karticu stana — bez ulaska na sprat.
   - Na istoj slici mogu i spratovi i stanovi: tada kupac klikne stan, a sprat tamo gde stan nije nacrtan.
   - **✨ Predloži stanove (AI):** kad su spratovi već označeni na toj slici, dugme u režimu „Stanove" za ~10 sekundi podeli svaki sprat na stanove koji se vide (ljubičasto, sa oznakama). AI gleda i osnovu tipskog sprata sa iscrtanim stanovima i orijentacije stanova, pa sam nađe koja strana zgrade je na slici. Proveri oznake, povuci ugao ako treba, pa **Sačuvaj predlog** (zamenjuje stanove već nacrtane na toj slici) ili **Odbaci**. Bez osnove sa iscrtanim stanovima AI teže pogađa koji je stan koji — to piše u poruci.

Na javnoj strani se pored svakog sprata piše koliko je slobodnih stanova („3 slob." / „nema") — kad su na slici i stanovi, te oznake se ne prikazuju (bilo bi pretrpano).

**Ceo ekran (računar):** na računaru izbor stana ima i prikaz preko celog ekrana, kao kod Sokolisa — dugme **⛶ Ceo ekran** (u traci izbora i na slici zgrade), a otvara ga i **Izaberite stan** u vrhu strane. Fotografija zgrade preko celog prozora, stanovi obojeni po statusu (zeleno slobodan, narandžasto rezervisan, crveno prodat), prelaz mišem pokaže stan, sprat, strukturu, m² i cenu, klik otvara karticu stana sa desne strane (osnova, 360°, cena, upit). Na dnu filteri: sprat i površina (klizači od–do), broj soba, status i „Poništi sve filtere"; strelice levo/desno okreću zgradu; **Lista** vodi na tabelu, Esc ili × zatvara. Link koji odmah otvara ovaj prikaz (za prezentaciju): adresa strane + `#ceo-ekran`. Na telefonu ostaje obični izbor. Ako na slici nema nacrtanih stanova, prikaz boji spratove (zeleno ima slobodnih, crveno nema), a klik na sprat otvara spisak njegovih stanova.

**Lista stanova:** iznad izbora stana na javnoj strani je prekidač **Zgrada / Lista stanova**. Lista je tabela svih stanova (kod kompleksa i kolona „Zgrada") sa filterima (zgrada, sprat, cena do, kvadratura od, struktura, samo slobodni) i sortiranjem klikom na naslov kolone. Klik na red otvara stan. Na telefonu je svaki stan kartica. Ne podešava se ništa — pravi se sama iz tabele stanova.

Poruke (greške i potvrde) se pojavljuju **na dnu ekrana** i stoje dok ih ne zatvoriš ×.

## 4. Stanovi

### Uvoz iz Excela (najbrže)

Na dnu stranice: **Uvoz iz Excela**. U Excelu označi kolone **ovim redom**, kopiraj i nalepi:

| oznaka | sprat | struktura | m² | terasa m² | orijentacija | cena | status | lamela (samo kompleks) |
|---|---|---|---|---|---|---|---|---|
| 1A | 1 | Dvosoban | 54 | 6 | Jug | 89000 | slobodan | A |
| 1B | 1 | Trosoban | 72 | 9 | Zapad | 118000 | prodat | A |

- Sprat `P` = prizemlje. Status: `slobodan`, `rezervisan` ili `prodat`.
- Cena može sa tačkama i znakom evra („95.600 €"), kvadratura sa zarezom („54,5").
- Red zaglavlja (Oznaka, Sprat…) se sam preskače.
- **Spratovi koji fale se sami naprave.**
- Kompleks: deveta kolona je lamela („A" ili „Lamela A"). Redovi bez nje idu u lamelu izabranu iznad tabele za uvoz. Projekat bez lamela deveta kolona ne zanima.
- Stan koji već postoji (ista oznaka) se **ažurira** — nacrtani oblici i ture ostaju.
- Ako je nešto u tabeli nejasno (npr. status „možda"), uvoz javlja red i razlog, i ne upisuje ništa.

### Cenovnik investitora (AI)

U „Uvoz iz Excela ili cenovnika" klikni **📄 Pročitaj cenovnik (PDF ili slika)** i izaberi cenovnik koji je poslao investitor. AI ga pročita (do pola minuta) i popuni polje za uvoz istim kolonama kao Excel: oznaka, sprat, struktura, m², terasa, orijentacija, cena, status (i lamela kod kompleksa). Proveri tabelu, pa klikni **Uvezi tabelu**. Ništa se ne upisuje pre tog klika.

- Prepoznaje hiljade sa tačkom („95.600"), prizemlje kao „PR/VP", „PRODATO", cenu po m² (pomnoži sa kvadraturom) i skraćene orijentacije (SZ → Severozapad).
- Novi cenovnik za isti projekat = isto: postojeći stanovi (ista oznaka) dobiju nove cene i statuse, a osnove, prostorije i ture ostaju.
- Ako piše da je čitao rezervni model, proveri tabelu posebno pažljivo.

### Osnove stanova odjednom (AI)

Ispod tabele stanova je kartica **Osnove stanova odjednom (AI)**. Prevuci (ili izaberi) sve slike osnova koje je poslao investitor (JPG, PNG, WEBP; PDF prvo sačuvaj kao slike):

1. AI na svakoj slici pročita oznaku stana („STAN 3A") i prostorije sa kvadraturom. Dve slike se čitaju istovremeno, oko 10–25 sekundi po slici.
2. Stan se bira sam: po natpisu na osnovi, po imenu fajla („osnova_3A.jpg") ili po tipu („Tip B" → najniži stan B iznad prizemlja, sa kvačicom **prenesi** na 2B, 3B…).
3. U tabeli proveri stan za svaku osnovu (ispravi u padajućem spisku ako treba), klikni broj prostorija da vidiš pročitane mere. Narandžasto = zbir prostorija se ne slaže sa površinom stana, ili je čitao rezervni model.
4. **Sačuvaj sve** upiše osnove (i prostorije, ako je kvačica uključena). Tipske osnove se prvo prenesu na iste stanove, a osnova dodeljena baš određenom stanu ostaje njegova.

Isti stan na dve slike je označen crveno i ne može da se sačuva dok ne izabereš drugi stan ili ukloniš jednu sliku.

### Jedan po jedan

Izaberi sprat → **+ Novi stan** → u tabeli mu promeni oznaku i podatke → **Sačuvaj** u tom redu.

### Tabela stanova

Svaki red: oznaka, sprat, struktura, m², terasa, orijentacija, cena, status, 360° tura. Izmenjen red se oboji plavo; **Sačuvaj** u tom redu ga upisuje. Javna strana se osvežava odmah.

## 5. Osnove spratova i kopiranje

1. Izaberi sprat → **Osnova sprata** (slika; PDF od arhitekte sačuvaj kao sliku).
2. Za svaki stan u spisku desno → **Iscrtaj** → obeleži stan na osnovi, isto kao sprat na fasadi. Uglove izabranog stana ispravljaš povlačenjem, isto kao kod sprata.
3. **Tipski spratovi:** kad je jedan sprat gotov, u kutiji **„Isti raspored i na drugim spratovima?"** upiši npr. `2-6` → **Primeni na te spratove**:
   - osnova se kopira na te spratove;
   - oblici stanova se prenose po oznaci: **1A → 2A, 3A…**, **1-1 → 2-1…**;
   - **status i cena se ne diraju**;
   - uključeno „Napravi stanove koji tamo još ne postoje" pravi stanove koji fale (ista struktura, m², orijentacija; cena prazna, status slobodan);
   - ako stanovi nemaju sprat u oznaci (numerisani 1–28 kroz zgradu), uparuju se redom — samo kad je broj stanova na oba sprata isti;
   - spratovi koji ne postoje se preskaču i navode u poruci — prvo ih dodaj.

Stan bez oblika na osnovi se i dalje bira iz spiska pored osnove, samo se ne može kliknuti na slici.

## 5a. Detalji stana: osnova, 3D osnova, slike, prostorije

**✨ Popuni iz osnove (AI):** u prozoru „Detalji“ stana, kad je otpremljena **Osnova stana** (tlocrt sa merama, kao od arhitekte), dugme pored „Prostorije i kvadratura“ pročita mere sa slike i samo popuni spisak prostorija sa kvadraturom. Ispod se pojave pročitane mere (npr. „Spavaća soba: 4,62 × 3,00 = 13,86 m²“) — uporedi ih sa osnovom, ispravi ako treba, pa klikni **Sačuvaj**. Ništa se ne čuva samo. Mere mogu biti u cm ili mm, AI prepozna sam. Ako piše da je čitao rezervni model, proveri mere posebno pažljivo.

**Strana stana** (kao kod Sokolisa): svaki stan ima svoju adresu `kvadrat360.com/novogradnja/<projekat>/stan/<oznaka>` (npr. `.../lepenicki-cvet/stan/5I`), i na engleskom pod `/en/...`. Otvara se dugmetom **Otvori stranu stana →** u kartici stana. Na njoj su velike kartice Osnova / 360° tura / 3D osnova / Slike, cena, prostorije, PDF letak, plan plaćanja, upit, strelice na prethodni i sledeći stan i „Slični slobodni stanovi“. Ovaj link prodaja šalje kupcu na Viber.

**Prezentacija (prikaži sve kartice stana):** u „Podaci projekta“ je kvačica **Prezentacija: prikaži sve kartice stana**. Kad je uključena, svaki stan ima sve četiri kartice: stan bez ture dobija **demo turu** (biraš je ispod kvačice; na turi piše „Primer ture“), bez slika — rendere zgrade, a 3D osnova bez slike piše „Uskoro za ovaj stan“. Za pravi projekat kvačicu isključi — tada se vidi samo ono što stan stvarno ima. „Lepenički cvet“ je uključen (demo tura: Maglićka).

**Osnova bez posebne slike:** ako stan nema svoju osnovu, a iscrtan je na osnovi sprata, kao osnova stana se sama prikazuje uvećan isečak osnove sprata, sa obeleženim stanom. Posebna slika osnove (Detalji) uvek ima prednost.

**Filteri na javnoj strani:** jedna traka iznad izbora stana (struktura, cena do, kvadratura od, „samo slobodni“; u listi još sprat i zgrada), dugme „Poništi“. Stanovi koji ne odgovaraju izblede i na fasadi i na osnovi.

Tabela stanova → dugme **Detalji** u redu stana (✓ kad stan već ima nešto od ovoga):
- **Osnova stana** — tlocrt samo tog stana (PNG/JPG);
- **3D osnova** — render stana odozgo, ako postoji;
- **Slike stana** — do 12 slika (renderi ili uzorni stan); strelica ← menja redosled;
- **Prostorije i kvadratura** — jedan red = jedna prostorija, kvadratura na kraju („Hodnik 15,17“); može da se nalepi iz Excela. Zbir se računa sam i upozori ako se ne slaže sa površinom stana.

**Sačuvaj i primeni na iste stanove** prenese osnovu, 3D osnovu, slike i prostorije (po želji i 360° turu) na isti tip stana na drugim spratovima — 2A → 3A, 4A… Status, cena i oblik na osnovi sprata se ne diraju.

Kupac u kartici stana dobija kartice **Osnova / 360° tura / 3D osnova / Slike** (samo one koje postoje; 360° tura se otvara u samoj kartici), **tabelu prostorija** sa zbirom i dugme **PDF letak stana**.

**PDF letak** (`/novogradnja/<projekat>/stan/<oznaka>/letak`): jedna A4 strana sa osnovom, podacima, prostorijama, cenom, kontaktom prodaje i QR kodom ka projektu. Dugme **Sačuvaj kao PDF / Štampaj** — u prozoru za štampu izabrati „Sačuvaj kao PDF“. Postoji i na engleskom.

## 6. Ture i pogled sa sprata

- **360° tura stana:** u tabeli stanova, kolona „360° tura" — izaberi postojeću turu. Više stanova istog tipa može na istu turu.
- **Pogled sa sprata:** u delu „Osnova" izabranog sprata — tura sa snimkom dronom na toj visini.
- Na javnoj strani se dugme za turu pojavljuje **samo kad je tura objavljena**, pa posetilac nikad ne dobije link koji vodi na grešku.

## 7. Link za pokazivanje (pre objave)

**Link za pokazivanje ↗** u vrhu stranice projekta — za sastanak sa investitorom ili da mu pošalješ primer, a da projekat ne bude javan:
- strana izgleda **tačno kao prava** (bez ikakve oznake „pregled"), i kad projekat **nije objavljen**;
- radi i na engleskom — prekidač SR / EN gore u meniju ostaje na istom posebnom linku;
- link se **kopira sam** i važi **30 dana**; posle toga napravi novi;
- bez tog linka projekat niko ne vidi (javna adresa daje „stranica ne postoji"), Google ga ne vidi, a posete sa njega se ne broje u izveštaju.

## 8. Objava

**Objavi** u vrhu stranice projekta. Pojavi se dugme **Otvori javnu stranu ↗**. **Skloni sa sajta** ga vraća u pripremu.

Zgrada se na javnoj strani vidi čim postoje spratovi; stanovi mogu da stignu i kasnije.

> **Dok novogradnja nije zvanično puštena**, ni objavljen projekat nije u meniju sajta ni u Google-u — strana radi samo za onoga ko ima adresu. Kad budeš hteo da projekti budu javni i u pretrazi, reci mi (jedno podešavanje u kodu). Za potpuno skriven projekat: **Skloni sa sajta** + **Link za pokazivanje**.

**Upit za stan** (dugme „Raspitaj se za ovaj stan") stiže **i tebi na Telegram i prodaji investitora** — na njihovom linku za prodaju, u odeljku „Upiti kupaca" na vrhu (vidi 9). Ne moraš ništa da prosleđuješ.

**Plan plaćanja:** u kartici stana (kad stan ima cenu i nije prodat) je dugme **„Izračunajte plan plaćanja“**. Kupac bira **učešće** (10, 20, 30 ili 50%), pa **rate investitoru** (6–36 rata, bez kamate) ili **stambeni kredit** (15–30 godina, kamatu upisuje sam, početno 4,5%). Vidi koliko mu treba odmah, koliko ostaje i **mesečnu ratu**. Piše da je obračun informativan i da tačne uslove daje prodaja, odnosno banka. Ništa se ne šalje i ne čuva.

**Filteri za kupca:** struktura, **cena do** i **kvadratura od** (ponude se samo pragovi koji postoje u projektu). Kartica stana pokazuje i **cenu po m²**.

**Engleska verzija:** `kvadrat360.com/en/novogradnja/<naziv-projekta>` — sav tekst strane je na engleskom (strukture i orijentacije se prevode same: Dvosoban → Two-room, Jug → South). U „Podaci projekta" popuni **Naziv na engleskom** (prazno = srpski naziv) i **Opis na engleskom** — dugme **🌐 Prevedi opis na engleski** predloži prevod, proveri ga pa klikni „Sačuvaj podatke". Dugme za turu na engleskoj strani otvara turu na engleskom, ako ga ima. Gore u meniju je prekidač SR / EN.

**Slika za deljenje:** kad se link projekta podeli na Viberu, WhatsApp-u ili Facebooku, prikazuje se kartica sa fotografijom fasade, nazivom, gradom i „Slobodnih stanova: 4 od 6" (na engleskoj strani na engleskom). Pravi se sama. Fotografija u WEBP formatu se na kartici ne prikazuje (ostaje plava kartica) — za fasadu je bolje otpremiti JPG. Viber i Facebook pamte karticu, pa se broj slobodnih stanova na već podeljenom linku ne menja sam.

### Okolina na mapi

Stranica projekta → **Okolina na mapi**:
1. upiši tačnu **adresu** u „Podaci projekta“ i sačuvaj — lokacija se nađe sama (ili u polje **Koordinate** nalepi npr. „44.0128, 20.9114“: desni klik na zgradu u Google mapama ih kopira);
2. klikni **Pronađi okolinu** — za nekoliko sekundi stigne spisak: škole, vrtići, prodavnice, apoteke, dom zdravlja, autobus i parkovi u krugu od 1,2 km (najbližih do 3 po vrsti).

Na strani projekta (i na engleskoj, i u ugradnji) pojavi se odeljak **„Šta je u blizini“**: mapa sa zgradom i mestima, i spisak sa **minutima hoda**. U meniju strane pojavi se link „Okolina“. Klik na mesto u spisku ga pokaže na mapi.

- Podaci su iz **OpenStreetMap-a** (besplatno). Ako nešto fali ili je pogrešno, to je u OpenStreetMap-u — posle ispravke tamo klikni **Osveži okolinu**.
- OpenStreetMap ume da bude preopterećen — ako piše „trenutno ne odgovara“, pokušaj ponovo za minut.
- Udaljenost je vazdušnom linijom, preračunata u minute hoda (oko 80 m u minuti) — tako i piše ispod mape.

### Gradilište po mesecima

Stranica projekta → **Gradilište po mesecima**:
1. snimi gradilište 360° (i dronom) i napravi **običnu turu** u `/admin/ture` (objavi je);
2. ovde izaberi **mesec** i tu **turu**, po želji napiši kratku napomenu („Završena konstrukcija 4. sprata") → **+ Dodaj mesec**.

Na javnoj strani, ispod izbora stana, pojavi se odeljak „Gradilište po mesecima": dugmad po mesecima (najnoviji prvi) i kartica „Obiđite gradilište u 360°". Isti mesec ponovo = izmena. Mesec čija tura nije objavljena se ne prikazuje. U meniju strane pojavi se i link „Gradilište".

### Izveštaj i upiti

Stranica projekta → **Izveštaj i upiti** (poslednjih 30 dana):
- **posetilaca**, otvaranja strane, **otvaranja stanova**, **upita**;
- **najgledaniji stanovi** sa brojem otvaranja i upita — argument za investitora i znak gde cena možda treba korekciju;
- **spisak svih upita** kupaca: kada, stan, ime i kontakt, poruka, i ko iz prodaje se javio („čeka" / ✓ ime).

Tvoje posete se ne broje. Isti izveštaj (kraći) vidi i prodaja na svom linku.

**Na telefonu** se ispod slike zgrade (i iznad osnove sprata) pojavljuje red velikih dugmadi spratova sa brojem slobodnih stanova („4 · 2 slob."), jer se trake spratova na fotografiji teško pogađaju prstom. Na računaru tog reda nema.

### Ugradnja na sajt investitora

Stranica projekta → **Ugradnja na sajt investitora** (radi tek kad je projekat objavljen):
- **Kopiraj kod** i pošalji ga programeru investitora — nalepi ga na stranu projekta na njihovom sajtu;
- tamo se prikazuje samo izbor stana, bez našeg menija i podnožja, sa malim potpisom „Izbor stana i 360° ture: Kvadrat360" u dnu;
- visina se podešava sama (nema skrola u skrolu);
- podaci su isti kao kod nas: kad prodaja promeni status ili cenu, menja se i na njihovom sajtu;
- upit sa njihovog sajta stiže ti na Telegram sa oznakom „🌐 Poslato sa sajta investitora";
- **Kako izgleda ugrađeno ↗** otvara tu verziju u novom tabu.

## 9. Pristup za prodaju investitora

Da te prodaja ne bi zvala za svaku promenu: svaka osoba iz prodaje dobija **svoj link** i sama menja **samo status i cenu** stanova u tom projektu. Bez naloga i lozinke.

### Pravljenje linka

Stranica projekta → **Pristup za prodaju** → upiši ime i ulogu (npr. „Marko, prodaja") → **+ Napravi link** → **Kopiraj link** ili **Pošalji na Viber**.

> ⚠️ Link se prikazuje **samo tada**. U bazi se čuva samo njegov otisak, pa ga ni ti kasnije ne možeš ponovo videti. Ako se izgubi — napravi novi, a stari ugasi.

### Šta vidi prodaja (telefon)

- brojači slobodnih / rezervisanih / prodatih (klik filtrira), pretraga po oznaci;
- stanovi po spratovima: dugmad **Slobodan / Rezervisan / Prodat** i polje za **cenu** (pored piše cena po m²);
- posle izmene: **„Izmena još nije na sajtu"** + **Poništi** / **Potvrdi**;
- **Potvrdi** pita **„Stan 3B: da li ste sigurni?"** i pokaže šta je bilo i šta će biti; tek **Da, potvrđujem** šalje izmenu na sajt;
- kod „Prodat" objašnjava da se na sajtu skriva cena i nestaje dugme za upit;
- ako je neko drugi u međuvremenu promenio isti stan, izmena se ne upisuje preko njegove — prodavac vidi novo stanje i poruku;
- „Poslednje promene" na dnu.

Prodaja **ne može** da menja slike, oblike, tekstove, ture, druge projekte, niti da briše ili dodaje stanove.

### Gašenje

**Ugasi** pored imena → link odmah prestaje da radi (otvara „stranica ne postoji"). Ugaši kad neko ode iz firme ili kad link procuri.

### Kratka beleška

Na svakom **stanu** (ispod cene) i svakom **upitu** (ispod poruke kupca) prodaja može da ostavi **jednu kratku belešku** — jedan red, najviše 120 znakova, npr. „Rezervisan do 20. 10., kapara 5.000 €“ ili „Zvala, dolazi u subotu 11h“.

- dodir na **+ Beleška** (ili na postojeću belešku) otvara polje; **Sačuvaj** / **Otkaži** / **Obriši**;
- **nova beleška zamenjuje staru** — nema spiska ni istorije; ispod piše ko i kada;
- **⚑** = važno: beleška je narandžasta, a ⚑ se vidi i u naslovu stana;
- **kupac je nikad ne vidi** (ni na javnoj strani, ni u ugradnji).

U tvom adminu ista beleška stoji u koloni **„Beleška prodaje“** — u tabeli stanova i u „Izveštaj i upiti“.

### Upiti i izveštaj na strani prodaje

- Na vrhu strane prodaje je **„Upiti kupaca"** (sa brojem novih): stan, ime, kontakt (telefon se zove jednim dodirom), poruka, oznaka „EN" ili „sa vašeg sajta".
- **Javio/la sam se kupcu** označava upit kao obrađen (vidi se ko i kada); **Vrati** ga vraća. Obrađeni upiti se sklanjaju — „Prikaži obrađene upite".
- Pri dnu je **Izveštaj · poslednjih 30 dana** (posetioci, otvaranja stanova, upiti, najgledaniji stanovi).

### Telegram i istorija

- **„Javi mi na Telegram…"**: kad prodaja označi stan kao prodat ili rezervisan, stigne ti poruka (npr. „✅ Stan 3B: slobodan → prodat · Marko").
- **Sve promene**: kada, ko, šta je bilo, šta je sada. Tu su i **tvoje** izmene iz admina (piše „Admin") i iz uvoza Excela.

---

## 10. Strana za investitore — `kvadrat360.com/za-investitore`

Prodajna strana za investitore sa klikabilnim primerom („Rezidencija Lipa", izmišljen projekat) i formom „Zakažite razgovor".

- **Za sada je skrivena:** nema je u meniju, Google je ne indeksira. Link šalješ investitorima direktno.
- Upit sa nje stiže na Telegram sa oznakom „🏗️ Sa strane za investitore".
- U javnost ide kad bude snimljena prava tura dronom — tada se dodaje u meni (reci mi).

---

## 11. Česti problemi

**Ne mogu da dodam sprat.**
Pogledaj poruku na dnu ekrana. Polje prima broj, „P", „prizemlje", „1. sprat", spisak („P, 1, 2") ili raspon („P-6").

**Kopiranje nije uparilo stanove.**
Poruka navodi koje nije uparila. Najčešće oznake na ciljnom spratu ne prate obrazac (1A → 2A), ili sprat ne postoji. Ispravi oznake u tabeli ili uključi „Napravi stanove koji tamo još ne postoje".

**Javna strana kaže da projekat ne postoji.**
Nije objavljen. Koristi **Pregledaj** ili klikni **Objavi**.

**Prodavac kaže da link ne radi.**
Link je ugašen ili nije cel kopiran. Napravi novi.

**Dugme za turu se ne vidi kod stana.**
Tura nije objavljena — objavi je u `/admin/ture`.
