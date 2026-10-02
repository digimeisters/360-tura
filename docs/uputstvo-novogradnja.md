# Uputstvo: novogradnja (paket za investitore)

Kako se postavlja projekat novogradnje: zgrada → sprat → stan, i kako prodaja investitora sama menja status i cene.

> Ovaj dokument je živ — kad promenimo neku funkciju, izmena se upisuje ovde.
> Poslednja izmena: 02.10.2026.

Uputstvo za ture je u [`uputstvo-kreiranje-ture.md`](uputstvo-kreiranje-ture.md). Ture i projekti su odvojeni: projekat na turu samo pokazuje, pa izmena projekta nikad ne kvari turu.

---

## Pregled toka

```
1. Novi projekat         →  /admin/projekti  (dugme „Novogradnja" u /admin/ture)
2. Podaci projekta       →  naziv, investitor, adresa, useljenje, kontakt prodaje
3. Fasada i spratovi     →  slika zgrade + obeležavanje spratova
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

## 3. Fasada i spratovi

1. **Slika fasade:** fotografija ili render zgrade (JPG, PNG, WEBP). Velika slika se sama smanji pre slanja.
2. **Dodaj spratove** u polju pored spiska:
   - jedan sprat: `3`, `P`, `prizemlje`, `1. sprat`
   - više odjednom: `P, 1, 2`
   - **sve odjednom: `P-6`** (prizemlje i spratovi 1–6)
   - sprat koji već postoji se preskače
3. **Obeleži svaki sprat na slici:** izaberi sprat u spisku → **Iscrtaj na fasadi** → klikći redom na uglove sprata na slici. Oblik zatvaraš klikom na prvu tačku ili tasterom **Enter**.
   - `↶ Poništi tačku` (ili `Backspace`) briše poslednju tačku
   - `Otkaži` (ili `Esc`) prekida crtanje
   - **ispravka bez ponovnog crtanja:** izaberi sprat (klik na njega na slici ili u spisku) — na uglovima se pojave kvadratići:
     - **povuci kvadratić** = pomeriš ugao;
     - **povuci malu tačku na sredini ivice** = dodaš novi ugao;
     - **dvoklik na kvadratić** = obrišeš ugao (ostaju najmanje 3);
     - čuva se čim pustiš miš; ako čuvanje ne uspe, oblik se vrati na stari;
   - potpuno pogrešan oblik: **Iscrtaj ponovo**

Na javnoj strani se pored svakog sprata piše koliko je slobodnih stanova („3 slob." / „nema").

Poruke (greške i potvrde) se pojavljuju **na dnu ekrana** i stoje dok ih ne zatvoriš ×.

## 4. Stanovi

### Uvoz iz Excela (najbrže)

Na dnu stranice: **Uvoz iz Excela**. U Excelu označi kolone **ovim redom**, kopiraj i nalepi:

| oznaka | sprat | struktura | m² | terasa m² | orijentacija | cena | status |
|---|---|---|---|---|---|---|---|
| 1A | 1 | Dvosoban | 54 | 6 | Jug | 89000 | slobodan |
| 1B | 1 | Trosoban | 72 | 9 | Zapad | 118000 | prodat |

- Sprat `P` = prizemlje. Status: `slobodan`, `rezervisan` ili `prodat`.
- Cena može sa tačkama i znakom evra („95.600 €"), kvadratura sa zarezom („54,5").
- Red zaglavlja (Oznaka, Sprat…) se sam preskače.
- **Spratovi koji fale se sami naprave.**
- Stan koji već postoji (ista oznaka) se **ažurira** — nacrtani oblici i ture ostaju.
- Ako je nešto u tabeli nejasno (npr. status „možda"), uvoz javlja red i razlog, i ne upisuje ništa.

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

**Filteri za kupca:** struktura, **cena do** i **kvadratura od** (ponude se samo pragovi koji postoje u projektu). Kartica stana pokazuje i **cenu po m²**.

**Engleska verzija:** `kvadrat360.com/en/novogradnja/<naziv-projekta>` — sav tekst strane je na engleskom (strukture i orijentacije se prevode same: Dvosoban → Two-room, Jug → South). U „Podaci projekta" popuni **Naziv na engleskom** (prazno = srpski naziv) i **Opis na engleskom** — dugme **🌐 Prevedi opis na engleski** predloži prevod, proveri ga pa klikni „Sačuvaj podatke". Dugme za turu na engleskoj strani otvara turu na engleskom, ako ga ima. Gore u meniju je prekidač SR / EN.

**Slika za deljenje:** kad se link projekta podeli na Viberu, WhatsApp-u ili Facebooku, prikazuje se kartica sa fotografijom fasade, nazivom, gradom i „Slobodnih stanova: 4 od 6" (na engleskoj strani na engleskom). Pravi se sama. Fotografija u WEBP formatu se na kartici ne prikazuje (ostaje plava kartica) — za fasadu je bolje otpremiti JPG. Viber i Facebook pamte karticu, pa se broj slobodnih stanova na već podeljenom linku ne menja sam.

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
