---
name: tura-tekst-prevod-naracija
description: "Sređuje tekst ture (gramatika, kontekst), prevodi ga na jezike paketa i generiše ElevenLabs glasovnu naraciju. Koristi se kad vlasnik kaže da sredi/popravi tekst neke ture, da je prevede, ili da joj napravi/osveži glas."
---

# tura-tekst-prevod-naracija — sređivanje teksta, prevod i glas za jednu turu

Ovo je procedura korišćena da se sve 4 demo ture srede na srpskom, prevedu i dobiju ElevenLabs naraciju (30. 9 - 1. 10. 2026). Pet faza, redom - svaka zavisi od prethodne.

## Gde živi tekst jedne sobe

- `rooms.title_i18n` - naziv sobe.
- `rooms.establish_i18n` (JSONB): `intro_i18n` (namena sobe u ovom konkretnom domu) + `detail_i18n` (nešto specifično za OVU sobu) - prikazuju se kao dva odvojena pasusa (vidi `composeEstablishText` u `utils.tsx`). Stare sobe imaju samo `text_i18n` (jedan spojen tekst) - ne deliti ga nasilno na dva polja, ostaje kako jeste.
- `rooms.waypoints_i18n` (niz): svaka info-tačka ima svoj `text_i18n` i `title_i18n`.
- Svako od ovih `*_i18n` polja je `{ sr, en, de, ru }` - `getLocalizedText` čita traženi jezik, pada nazad na `sr`.
- Audio ide u `establish_i18n.audio_url_i18n` i u `waypoints_i18n[].audio_url_i18n`, isti oblik `{ sr, en, de, ru }`.

Za čitanje/upis koristi Supabase MCP (`execute_sql` nad pravim projektom - vidi `[[project-supabase-cli-wrong-account]]`, CLI gleda pogrešan projekat). Nikad ne izmišljaj ID sobe/ture - pitaj bazu.

## Faza 1 - srpski tekst (izvor istine)

1. Pročitaj `title_i18n`, `establish_i18n`, `waypoints_i18n` za SVE sobe ture (jedan `execute_sql` sa svim sobama, ne soba po soba).
2. Pre bilo kakvog pisanja, shvati **tok ture**: kojim redom se sobe obilaze (`guide_path`), kako jedna uvodi u drugu, da se izbegne da svaka soba zvuči kao izolovan opis.
3. Ispravi gramatiku i dovrši nedovršene rečenice/tačke, ali ne izmišljaj podatke o nekretnini (kvadratura, sprat, da li ima lift...) - to je u `rooms` kolonama (`buildFactList`), ne u naraciji.
4. Primeni važeće copy konvencije sajta dok pišeš:
   - **„Nekretnina", ne „stan"** u opštim rečenicama; „stan" samo kad je stvarno reč o stanu kao primeru - vidi `[[nekretnina-not-stan]]`.
   - Nema cepanja smislene fraze preko dva reda (manje bitno u naraciji nego u naslovima sajta, ali pazi na rod/broj kad menjaš imenice).
5. Upiši ispravljen srpski nazad u bazu (UPDATE po sobi/tački). Ovo je sada izvor istine za prevod.

## Faza 2 - prevod na jezike paketa

Koji jezici zavisi od paketa te ture: Premium = sva 4 (SR/EN/DE/RU), Osnovni = SR + jedan po izboru vlasnika - pitaj ako nije rečeno.

Dva načina, biraj prema situaciji:

- **Admin dugme „🌐 Jezici"** (po sobi, u turi): zove postojeću rutu `/api/ai/auto-populate-room` (`action: 'translate_step'`, Gemini) i PREVODI postojeći srpski tekst sobe na izabrane jezike. Ovo je pravi, radni put kad tekst ne treba dodatno ujednačavanje - vlasnik ga može i sam koristiti.
- **Ručni prevod (Claude piše direktno u bazu)**: biraj ovo kad treba doslednost kroz CELU turu odjednom (ista terminologija, isto "nekretnina" pravilo, isti ton) - prevodi sobu po sobu, ali drži uporedo sve sobe da se iste reči ne prevedu različito. Upiši u odgovarajuće `*_i18n[lang]` polje.

U oba slučaja na kraju pročitaj nazad sve prevode i uporedi - ime sobe mora da se prevodi isto kad se pominje u drugoj sobi (hodnik, kuhinja...).

## Faza 3 - procena pre glasa

Pre nego što se potroši ElevenLabs kredit:
1. Saberi broj karaktera SRPSKOG teksta cele ture (uvod + sve info-tačke).
2. Pomnoži sa brojem jezika koji idu u glas (1 za Osnovni ako samo SR ima glas, inače prebroj karaktere svakog prevoda posebno - dužine nisu iste).
3. Javi vlasniku procenu pre generisanja ako je tura velika ili je kredit pri kraju (videti `[[voice-narration-pending-elevenlabs]]` za cenovnik Creator plana).

## Faza 4 - ElevenLabs glas

**Kad vlasnik sam pravi glas: admin dugme „🎙️ Glas"** (u turi, admin režim, po sobi) - vraćeno u kod 1. 10. 2026 (`handleGenerateVoice` u `app/api/ai/auto-populate-room/route.ts`):
1. Otvori sobu u adminu, klikni „🎙️ Glas", izaberi jezike, potvrdi.
2. Ruta za svaki izabrani jezik pravi glas za uvod sobe i za svaku info-tačku koja IMA svoj tekst na tom jeziku (prazan prevod se preskače, ne izgovara se srpski pod stranim jezikom), sa `eleven_v4` i `ELEVENLABS_VOICE_ID` (jedan glas za sve jezike; `ELEVENLABS_VOICE_ID_<JEZIK>` ima prednost ako postoji).
3. MP3 ide u kantu `narrations` na `{slug}/{roomId}/establish-{lang}.mp3` i `.../waypoint-{index}-{lang}.mp3` (prepisuje stari snimak na istom mestu), a frontend upiše linkove u `audio_url_i18n` (dopunjuje, ne briše druge jezike).
4. Prozor posle kaže koliko je segmenata napravljeno i koji nisu uspeli. Segment duži od 700 znakova se odbija (kočnica za slučajno zalepljen tekst).
5. Ograničenje: ruta ima 60 s. Soba sa mnogo tačaka na sva 4 jezika može da se približi granici - tada pusti glas u dva navrata (npr. SR+EN, pa DE+RU).

**Uslov:** `ELEVENLABS_API_KEY` i `ELEVENLABS_VOICE_ID` moraju biti podešeni i na Vercel-u (Settings → Environment Variables), ne samo lokalno preko `setx` - inače dugme na sajtu kaže da ključ nije podešen. Vlasnik ih unosi sam; nikad ih ne traži u chatu.

**Kad vlasnik traži glas iz chata (Claude radi sam):** dugme traži admin prijavu u pregledaču, a Claude se ne prijavljuje umesto vlasnika - zato iz chata ide privremeni Node skript (isto važi i za masovno, celu turu odjednom). Za ovaj put Vercel ključevi nisu potrebni: ElevenLabs ključ je na vlasnikovom računaru (`setx`). Pre većeg posla (npr. cela tura na 4 jezika) prvo javi procenu iz faze 3 i sačekaj potvrdu. Skript: koji radi isto što i ruta - ElevenLabs `text-to-speech/{voiceId}` sa `eleven_v4`, otpremanje u `narrations` na istu putanju, upis u `audio_url_i18n`. Skript mora da se KOPIRA u koren projekta i pokrene odatle (`require('@supabase/supabase-js')` se traži pored skripte, pa iz `scratchpad/` ne radi), Supabase ključeve čita iz `.env.local`. Posle obavezno obriši i skript i svaki probni MP3.

Ako auto-mod/klasifikator (ili sam ElevenLabs) povremeno ne odgovori, sačekaj i pokušaj ponovo pre nego što prijaviš grešku.

## Faza 5 - provera

1. Otvori turu (ne mora admin mod) i pusti „Automatsko vođenje".
2. Proveri da glas i titlovi idu zajedno (titl prati rečenicu po rečenicu - `subtitleCues.ts`).
3. Promeni jezik USRED naracije i proveri da nastavi na novom jeziku bez pucanja (`useTourNarration`).
4. Prođi kroz SVE jezike koje ta tura ima, ne samo srpski.
5. Ako neki jezik nema glas (npr. Osnovni paket bez tog jezika), proveri da se tura i dalje normalno koristi - tekst se tada samo čita (`useTourNarration` pada nazad na vreme čitanja kad nema `audio_url`).

## Pravila koja važe kroz sve faze

- Nikad ne traži API ključeve/lozinke u chatu - vlasnik ih postavlja preko `setx`.
- Baza (Supabase) se menja odmah kad je ispravka potvrđena - to nije `git push` i ne čeka "pushuj". Svaka izmena KODA ide kroz običan tok: `tsc` čist, pa čekaj "pushuj".
- Skripte u `scratchpad/` koje menjaju postojeće fajlove preko tačnog teksta (string replace) moraju prvo da normalizuju kraj reda (CRLF/LF) - inače tačno poklapanje teksta ne uspeva na Windows fajlovima.

## Ovaj skill se dograđuje

Kad vlasnik da povratnu informaciju o toku, terminologiji ili nečemu što treba drugačije u sređivanju/prevodu/glasu - zabeleži to ovde, u odgovarajućoj fazi, da se sledeća tura automatski radi po novom pravilu.
