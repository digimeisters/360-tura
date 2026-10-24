# Admin: zajednički okvir, pregledna strana Ture i strana Agencije

Datum: 24. 10. 2026.
Odobreni mockupi: `.superpowers/brainstorm/1529-1792868617/content/admin-ture.html` i `admin-agencije.html` (lokalno, nisu u git-u).

## Cilj

Vlasnik (ne-tehnička osoba, radi uglavnom na računaru) želi da admin radi kao prava aplikacija:
jedan meni za sve delove, pregledna lista tura, forma samo kad pravi ili menja turu, i agencije
na posebnom mestu. Odgovor na pitanje „šta smeta" bio je: sve od sledećeg —
previše dugmadi po turi, forma stalno otvorena gore, nema glavnog menija.

### Šta je vlasnik rekao
- Pristup 1: meni levo, lista kao glavni sadržaj, forma u panelu sa desne strane, „⋯" meni po redu, strana Agencije.
- Telefon samo za brze provere (objavi ili skini turu, kopiraj link).
- Oba mockupa: „može" i „dobro je". Tehnički opis: „u redu".

### Pretpostavke (vlasnik ih nije posebno potvrdio)
- Na strani Agencije stoje sve agencije jedna ispod druge, bez padajućeg spiska (rečeno u poruci uz mockup; vlasnik nije tražio spisak nazad).
- Brojevi pored stavki u meniju se ne prikazuju.

### Uspeh
- Svaka admin strana ima isti meni levo i jednu prijavu.
- Strana Ture na prvi pogled pokazuje listu; forma je zatvorena dok se ne zatraži.
- Red tabele ima tri dugmeta i „⋯"; nijedna postojeća radnja ne nestaje.
- Link izveštaja agencije se kopira jednim klikom sa strane Agencije.
- `/admin` više ne vraća 404.

## Van obima
- Nove funkcije (nove kolone u bazi, nove API rute, nova statistika na strani Agencije).
- Promena izgleda Analitike, liste projekata i editora iznutra — dobijaju samo okvir.
- Pamćenje filtera, brojači u meniju, tamna tema admina.

## Arhitektura

### 1. Okvir admina (`app/admin/layout.tsx` + `components/admin/AdminShell.tsx`)
- `layout.tsx` ostaje server komponenta (zadržava `robots: noindex`) i renderuje klijentski `AdminShell` oko `children`.
- `AdminShell` jednom proverava Supabase sesiju (`supabase.auth.getSession` + `onAuthStateChange`).
  - Dok proverava: miran ekran „Učitavanje…".
  - Nema sesije: jedan ekran za prijavu (email + `PasswordInput`, isti izgled kao danas na Turama).
  - Ima sesiju: meni levo + sadržaj strane.
- Meni levo (tamna traka, 210 px): logo, Ture (`/admin/ture`), Agencije (`/admin/agencije`), Analitika (`/admin/analitika`), Novogradnja (`/admin/projekti`); dole Odjava i email prijavljenog naloga. Aktivna stavka po `usePathname()` (prefiks putanje).
- Editori na ceo ekran — `/admin/plan/*` i `/admin/projekti/[id]` (ne sama lista `/admin/projekti`): meni se sužava na traku od ~56 px sa ikonama i `title` natpisom.
- Ispod 900 px širine: umesto trake levo, gornja traka sa logom i dugmetom „Meni" koje otvara iste stavke preko ekrana.
- `app/admin/page.tsx`: `redirect('/admin/ture')` (server).
- Strane više nemaju svoju proveru sesije ni svoj ekran za prijavu: uklanja se iz `ture/page.tsx`, `analitika/page.tsx`, `projekti/page.tsx`, `projekti/[id]/page.tsx`, `plan/[slug]/page.tsx`. Linkovi „← Ture" i „Prvo se prijavite u admin" u tim stranama se brišu.
- Strane i dalje same šalju token u API pozivima (`authedFetch` / `getSession` za token) — okvir ne menja API sloj.
- Istek sesije: `onAuthStateChange` (SIGNED_OUT) vraća okvir na ekran za prijavu na bilo kojoj strani.

### 2. Strana Ture (`app/admin/ture/`)
Današnji `page.tsx` (1.343 reda) se deli; ponašanje i API pozivi ostaju isti.

- `page.tsx` — učitavanje tura, zaglavlje strane („Ture", „N tura · M objavljenih", dugme „+ Nova tura"), `TourFilterBar`, tabela, dijalozi (QR, Pošalji klijentu, Video, Snimak, Uvod). Kartica „Agencije: logo i izveštaji" se uklanja.
- `TourFormDrawer.tsx` — panel sa desne strane (širina ~440 px, na telefonu ceo ekran), tamna podloga iza; zatvara se na ×, „Otkaži", klik na podlogu i Esc. Sadrži celu današnju formu, podeljenu na kartice:
  - **Osnovno:** naslov oglasa (+ pregled linka pri novoj turi / napomena da se link ne menja pri izmeni), agencija (`AgencyPicker`), tip oglasa, adresa, grad, naselje, struktura, kvadratura, cena, tip nekretnine, logo na mestu stativa.
  - **Podaci za Info:** sprat, grejanje, lift, podrum, status gradnje, stanje enterijera, terasa/balkon, parking, depozit (izdavanje), uknjiženost (prodaja).
  - **Pitanja:** odgovori na pet pitanja prema tipu oglasa.
  - **Agent:** ime, telefon, email agenta.
  - Dugmad „Sačuvaj" / „Otkaži" stoje u dnu panela, vidljiva na svim karticama. Ako čuvanje ne prođe, greška se prikazuje iznad dugmadi; ako je prazan naslov, panel prelazi na karticu Osnovno i fokusira polje.
  - Posle uspešnog čuvanja panel se zatvara, a obaveštenje („Izmene su sačuvane." / „Tura je kreirana: …") se prikazuje iznad liste kao i sada.
- `TourRowMenu.tsx` — dugme „⋯" i padajući meni (zatvara se klikom van i na Esc). Grupe:
  - Sadržaj ture: Uredi sadržaj (link `/tour/{slug}?admin=1`, novi tab), Plan (`/admin/plan/{slug}`), Uvod (glas).
  - Deljenje: Pošalji klijentu, QR kod, Video, Snimak, Kod za sajt (iframe; „Kopirano ✓" kao sada).
  - Nekretnina: stanje (Aktivna / Izdato / Prodato / Pauza).
  - Obriši turu (crveno, na dnu, uz isto potvrđivanje kao danas).
- Red tabele: naziv + grad i link, Kreirana, Stanje (Objavljena / U pripremi), Agencija, Tip, Sobe, pa dugmad **Objavi/Skini · Izmeni · Otvori ↗ · ⋯**. Kad nekretnina nije aktivna, pored stanja objave stoji obojena oznaka (Izdato / Prodato / Pauza).

### 3. Strana Agencije (`app/admin/agencije/page.tsx`)
- Podaci: isti `GET /api/admin/tours` koji već vraća `agencyReports` (`agency`, `tours`, `path`, `logoUrl`); nema nove rute.
- Tabela: logo (krug; inicijali kad nema loga) + naziv + broj tura, kolona „Logo u turama" sa postojećim `AgencyLogoButton`, i „Kopiraj link" (→ „Kopirano ✓", rezervno `window.prompt` kao sada) i „Otvori izveštaj ↗".
- Ispod tabele kratko objašnjenje kako link radi i kako se agencija pojavljuje (dodela prve ture).
- Bez agencija: poruka „Još nema agencija — dodelite agenciju turi u formi ture."

### 4. Ostale strane
- Analitika i lista projekata: samo uklanjanje sopstvene prijave i zaglavlja koje dupliraju okvir; sadržaj isti.
- Plan i editor projekta: uklanjanje prijave i linka „← Ture"; okvir prikazuje uski meni.

## Greške i krajnji slučajevi
- API vrati 401 (istekla sesija): strana prikazuje grešku kao i danas; okvir prelazi na prijavu čim Supabase javi odjavu.
- Otvoren panel sa nesačuvanim izmenama pa zatvaranje: bez upozorenja (isto kao današnje „Otkaži").
- Dugi nazivi tura i agencija: prelamaju se u ćeliji, dugmad u redu se ne lome u dva reda (min širina tabele + horizontalno pomeranje unutar kartice, kao sada).

## Provera
- `npx tsc --noEmit` čist; `eslint` na izmenjenim fajlovima bez novih grešaka (osnovica: 2 postojeće u `ture/page.tsx`).
- Svaka admin strana otvorena neprijavljena (lokalni server): prikazuje se jedan ekran za prijavu u okviru.
- `/admin` preusmerava na `/admin/ture`.
- Privremena test-strana sa izmišljenim podacima (briše se posle): okvir sa menijem (široko, usko, telefon), panel sa karticama (otvaranje, zatvaranje na Esc/podlogu, prelaz na Osnovno kod praznog naslova), meni „⋯" (sve stavke, zatvaranje), tabela agencija (kopiranje linka).
- Pravi admin sa nalogom vlasnika proverava vlasnik posle deploy-a.

## Redosled rada
1. Okvir (`AdminShell`, `layout.tsx`, `/admin` preusmerenje) i uklanjanje prijava sa svih strana.
2. Strana Ture: `TourFormDrawer`, `TourRowMenu`, novi red tabele, uklanjanje kartice agencija.
3. Strana Agencije.
4. Provera, pa jedan commit i push tek na vlasnikovo „pushuj".
