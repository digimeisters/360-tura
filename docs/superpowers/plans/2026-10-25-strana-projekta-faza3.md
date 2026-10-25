# Strana projekta – faza 3 (nova polja i admin) – plan izvođenja

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Opis i video stana, 3D render i video projekta. Unose se u admin, a prikazuju na ekranu stana i u istraživaču projekta. Prazno se ne prikazuje.

**Architecture:**
- Pet novih kolona (migracija 040).
- Jedan pomoćnik za video linkove (`app/lib/videoEmbed.ts`), koji koriste i API (provera) i prikaz.
- Postojeći putevi ostaju:
  - `unit-save` i `update` u `/api/admin/projects`;
  - `upload` sa novom vrstom `render`;
  - `UnitMedia` kartice;
  - prekidač iznad slike zgrade u `ProjectSelector`.

**Tech Stack:** Supabase (migracija preko MCP-a), Next.js 16, React 19, TypeScript.

**Spec:** `docs/superpowers/specs/2026-10-25-strana-projekta-design.md`, odeljak 3 (i 1.3 „prekidač Zgrada · 3D render · Video", i 2 „Mediji… Video", „O stanu").

## Global Constraints
- Ništa se ne commituje dok vlasnik ne kaže „pushuj".
- Kolone su prazne (`null`) za sve postojeće redove. Pravi podaci Garić Investa se ne menjaju.
- Opis stana ima najviše 600 znakova (sr i en). Engleska strana prikazuje samo engleski opis; ako ga nema, opis se ne prikazuje (isto kao opis projekta).
- Video je link na:
  - YouTube (watch, youtu.be, shorts);
  - Vimeo;
  - https `.mp4` fajl.
  Drugi linkovi se odbijaju u adminu sa porukom.
- Render projekta je slika otpremljena kroz admin (naš CDN).
- Prekidač „Zgrada · 3D render · Video" se vidi samo kad postoji bar jedno od dva.
- Svi novi tekstovi su na sr i en.

## Review Focus
1. Pogrešan video link (npr. obična strana, `javascript:`) u adminu → poruka, ne čuva se; na strani nikad ne ide u `iframe`.
2. Engleska strana bez engleskog opisa → nema kartice „O stanu" sa srpskim tekstom.
3. Projekat bez rendera i videa (Jadranska danas) → istraživač izgleda kao pre, bez prekidača.
4. Ugradnja (`embedded`) → prekidač radi ili se ne vidi, ništa ne puca.
5. Video u kartici stana ne počinje sam i ne učitava se dok se kartica ne otvori.

---

### Task 1: Migracija 040 + tipovi + video pomoćnik
**Files:**
- Create: `supabase/migrations/040_project_media_fields.sql`:
  - `project_units`: `description text check (char_length(description) <= 600)`, `description_en` (isto), `video_url text`;
  - `projects`: `render_url text`, `video_url text`.
- Modify: `app/lib/projects.ts`: `UnitRow` i `ProjectRow` dobijaju polja.
- Modify: `app/lib/database.types.ts`: ručno dodata polja (CLI vidi stari nalog; `project_supabase_cli_wrong_account`).
- Create: `app/lib/videoEmbed.ts`:
  - `parseVideo(url: string | null): { kind: 'youtube' | 'vimeo' | 'file'; src: string } | null`;
  - `src` je embed adresa (`https://www.youtube-nocookie.com/embed/<id>`, `https://player.vimeo.com/video/<id>`) ili sam `.mp4` link.

**Provera:** `parseVideo` kroz node skriptu u scratchpadu:

| Ulaz | Očekivano |
|---|---|
| `https://youtu.be/abc123DEF45` | youtube |
| `https://www.youtube.com/watch?v=abc123DEF45&t=3` | youtube |
| `https://www.youtube.com/shorts/abc123DEF45` | youtube |
| `https://vimeo.com/123456` | vimeo |
| `https://cdn.x/a.mp4` | file |
| `http://cdn.x/a.mp4`, `javascript:alert(1)`, `https://example.com` | null |

Migracija se primenjuje preko Supabase MCP-a, pa se proverava `list_tables` / `execute_sql` na kolonama.

### Task 2: Admin
**Files:**
- Modify: `app/api/admin/projects/route.ts`:
  - `unit-save`: `description`, `description_en` (`text(…, 600)`), `video_url` (`parseVideo` ili greška „Video link mora biti YouTube, Vimeo ili .mp4.");
  - `update`: `video_url` (isto), `render_url` (samo `${cdn}/projekti/${id}/render-`, kao logo);
  - `unit-media-copy` ne prenosi opis ni video (to je po stanu).
- Modify: `app/api/admin/projects/upload/route.ts`: vrsta `render` (JPG/PNG/WEBP).
- Modify: `components/projekat/UnitMediaModal.tsx`:
  - polja „Opis stana" i „Opis na engleskom" (600, brojač);
  - dugme „Prevedi" (postojeći `translate-en`);
  - „Video stana (link)";
  - sve ide u isti `unit-save`.
- Modify: `app/admin/projekti/[id]/page.tsx`: u „Podaci projekta" blok „3D render i video projekta": otpremanje rendera (pregled + Ukloni) i polje za video link, sa čuvanjem preko `update`.

**Provera:** tsc. Admin se otvara u pregledaču samo radi gledanja (bez čuvanja na pravim projektima).

### Task 3: Prikaz
**Files:**
- Modify: `app/lib/projectData.ts` + `SelectorUnit` (`description`, `descriptionEn`, `videoUrl`) + `SelectorProject` (`renderUrl`, `videoUrl`).
- Modify: `components/projekat/UnitMedia.tsx`: kartica `video` posle slika. Prikazuje `iframe` (YouTube/Vimeo, `loading="lazy"`, bez autoplay) ili `<video controls preload="none">`, samo kad je kartica izabrana. U prezentaciji (`demo`) prazna kartica „uskoro" kao ostale.
- Modify: `components/projekat/UnitScreen.tsx`: kartica „O stanu" u levoj koloni posle medija (opis po jeziku; nema opisa → nema kartice); video ide u `UnitMedia`.
- Modify: `components/projekat/ProjectSelector.tsx`: prekidač `Zgrada · 3D render · Video` iznad scene zgrade, samo kad `renderUrl || videoUrl`. Render je slika u istoj sceni, video je embed; filteri i spratovi ostaju.
- Modify: `app/lib/projectI18n.ts`: `tabVideo`, `aboutUnit`, `modeBuilding`, `modeRender`, `modeVideo`.
- Create (privremeno): `app/dev-stan/` sa opisom, YouTube videom i renderom projekta. Briše se na kraju.

**Provera:**
- Test-strana: kartica „O stanu", kartica Video (iframe tek posle klika), prekidač na računaru i na 375 px, EN.
- Jadranska: bez prekidača, bez „O stanu", bez Video kartice (Review Focus 3).
- Ugradnja.
- tsc i eslint u odnosu na HEAD.

### Task 4: Završno
- Obrisati test-stranu i `.playwright-mcp/`.
- Nezavisni pregled (Opus), ako limit dozvoli; inače sopstveni pregled, uz napomenu vlasniku.
- Poruka vlasniku. Čekati „pushuj".
