# Razgledanje uživo — plan implementacije

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agent preko tajnog linka vodi kupca kroz 360° turu uživo: kupac vidi agentov pogled, može da odluta i vrati se, a agent može da pokaže tačku u prostoru.

**Architecture:** Jedan javni Supabase Realtime kanal po gledanju (`live:<slug>:<kod>`) sa broadcast porukama i presence-om. Naš server se poziva samo jednom, da proveri agentov HMAC link i napravi nasumičan kod. Sva logika živi u `app/tour/[slug]/live/`, a `page.tsx` dobija samo tanko uključivanje.

**Tech Stack:** Next.js 16 (App Router, `'use client'` tura), TypeScript strict, `@supabase/supabase-js` 2.112 (Realtime broadcast + presence), Pannellum 2.5.6 (k360 build), Node 24 `node --test` za čistu logiku.

**Spec:** `docs/superpowers/specs/2026-10-27-razgledanje-uzivo-design.md`

## Global Constraints

- Bez nove tabele, bez migracije, bez novog npm paketa.
- Agentov link: `/tour/<slug>?agent=<token>`. Kupčev link: `/tour/<slug>?uzivo=<KOD>`. `?vodic=1` (postojeće automatsko vođenje) se ne dira.
- Token: HMAC-SHA256 nad `live-guide:<slug>`, base64url, prvih 24 znaka. Ključ `REPORT_LINK_SECRET`, a bez njega `SUPABASE_SERVICE_ROLE_KEY`.
- Kod: 6 znakova iz `23456789ABCDEFGHJKMNPQRSTVWXYZ`, iz `crypto.randomInt`.
- Vremena: `view` najviše na 100 ms, `viewer` najviše na 250 ms, otkucaj 2000 ms, agent nestao → `lost` posle 30 000 ms, nikad nije došao → „završeno ili nije počelo" posle 20 000 ms, pokazivač traje 3000 ms, dugi dodir 500 ms uz pomeraj do 8 px.
- Svaka poruka nosi `v: 1`. Poruka nepoznatog oblika ili verzije se tiho ignoriše.
- Izgled: `GLASS`, `FILL_ACCENT`, `FILL_GLASS_ACCENT`, `GLASS_ACCENT` iz `theme.ts`, naslovi u `THEME.fontDisplay`, mete od najmanje 44 px. Crvena „uživo" tačka je `#E5484D`.
- Tekstovi za sve jezike ture (`sr`, `en`, `de`, `ru`) u `translations.ts`. Generički tekst kaže „nekretnina/prostor", a „stan" samo u konkretnim pričama (memorija: nekretnina, ne stan). Zato kupac vidi „vas vodi kroz nekretninu", ne „kroz stan".
- Komentari na srpskom, u istom tonu kao okolni kod.
- Ništa se ne commituje i ne pushuje dok vlasnik ne kaže „pushuj" (pravilo projekta). Koraci „Commit" u ovom planu znače samo `git add` za praćenje. Commit ide na kraju, na „pushuj".
- `docs/cowork/` i `public/mockup/` se nikad ne dodaju u git.

## Review Focus

1. **Kupac dodirne ekran tokom agentove šetnje kroz vrata:** odvaja se, šetnja se kod njega završava normalno, a „Vrati se agentu" ga posle vodi u agentovu sobu i pravac. Test: Task 6, korak 3.
2. **Kupac sam promeni sobu (strelice, lista, tačka na vratima):** mora da se odvoji, a ne da ga sledeća `view` poruka vrati u staru sobu. Test: Task 4, `roomChangeDetaches`, i Task 6, korak 3.
3. **Telefon kupca ode u pozadinu (Viber poziv) i vrati se:** nema skoka ni duplih kanala, a poravnava se na prvi otkucaj. Test: Task 6, korak 3.
4. **Agentov tab se osveži usred gledanja:** agent dobija nov kod (stari kupac ostaje na „Čeka se agent", pa „lost"). Ne sme da nastane ruševina od dva kanala u istom tabu. Test: Task 6, korak 3.
5. **Obična tura bez parametara:** nikakva promena ponašanja (uvod, narator, vodič, žiroskop). Test: Task 6, korak 3, prva stavka.

---

## Fajlovi

| Fajl | Uloga |
|---|---|
| `app/lib/liveGuide.ts` (novo) | Server: token za agenta, provera, nov kod |
| `app/lib/liveGuide.test.ts` (novo) | Testovi tokena i koda |
| `app/api/live/start/route.ts` (novo) | `POST` provera tokena → `{ code }` |
| `app/api/admin/tours/route.ts` (izmena) | `liveGuidePath` uz svaku turu |
| `app/admin/ture/TourRowMenu.tsx`, `app/admin/ture/page.tsx` (izmena) | Stavka „Link za vođenje uživo" |
| `app/tour/[slug]/live/protocol.ts` (novo) | Tipovi poruka, `parseLiveEvent`, konstante, ime kanala |
| `app/tour/[slug]/live/liveMath.ts` (novo) | Glatko praćenje, strana strelice, promena pogleda |
| `app/tour/[slug]/live/live.test.ts` (novo) | Testovi za `protocol.ts` i `liveMath.ts` |
| `app/tour/[slug]/live/useLiveSession.ts` (novo) | Kanal, presence, statusi |
| `app/tour/[slug]/live/useLiveGuide.ts` (novo) | Agent: šalje pogled, sobu, kraj; prati kupca |
| `app/tour/[slug]/live/useLiveFollow.ts` (novo) | Kupac: glatko praćenje, odvajanje, povratak |
| `app/tour/[slug]/live/livePointer.ts` (novo) | Dugi dodir → `point`; prikaz kao Pannellum hotspot |
| `app/tour/[slug]/live/LiveUi.tsx` (novo) | Svi ekrani: dugme, kartice, traka, strelica, povratak, kraj |
| `app/tour/[slug]/live/useLiveViewing.ts` (novo) | Spaja sve gore za `page.tsx` |
| `app/tour/[slug]/translations.ts` (izmena) | `live*` ključevi za 4 jezika |
| `app/tour/[slug]/page.tsx` (izmena) | Tanko uključivanje i gašenje sekvence/uvoda/žiroskopa |
| `tsconfig.json`, `package.json` (izmena) | `allowImportingTsExtensions` + `"test": "node --test"` |

---

### Task 1: Agentov link, API i admin stavka

**Files:**
- Modify: `tsconfig.json` (u `compilerOptions` dodati `"allowImportingTsExtensions": true`; dozvoljeno jer je `noEmit: true`)
- Modify: `package.json` (`"test": "node --test"` u `scripts`)
- Create: `app/lib/liveGuide.ts`, `app/lib/liveGuide.test.ts`
- Create: `app/api/live/start/route.ts`
- Modify: `app/api/admin/tours/route.ts` (`GET`, mapiranje tura oko reda 222)
- Modify: `app/admin/ture/TourRowMenu.tsx` (`TourRowAction` + stavka u grupi „Deljenje")
- Modify: `app/admin/ture/page.tsx` (`TourRow.liveGuidePath`, `rowAction`)

**Interfaces:**
- Produces (server): `liveGuideToken(slug: string): string`, `isLiveGuideToken(slug: string, token: string): boolean`, `newLiveCode(): string`, `LIVE_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'`.
- Produces (HTTP): `POST /api/live/start`, telo `{ slug: string; token: string }` → `200 { code: string }` | `400 { error }` (loše telo) | `403 { error }` (loš token) | `429 { error }` (posle 20 poziva na sat po IP-u, scope `'live-start'`).
- Produces (admin API): svaka tura u `GET /api/admin/tours` ima `liveGuidePath: string` = `` `/tour/${slug}?agent=${liveGuideToken(slug)}` ``.

- [ ] **Step 1: Napisati test koji pada** — `app/lib/liveGuide.test.ts` (uvoz `./liveGuide.ts`, `process.env.REPORT_LINK_SECRET = 'test-secret'` pre uvoza, preko `await import`):

```ts
test('token je stabilan i dug 24 znaka', () => {
  assert.equal(liveGuideToken('stan-a'), liveGuideToken('stan-a'));
  assert.match(liveGuideToken('stan-a'), /^[A-Za-z0-9_-]{24}$/);
});
test('token jedne ture ne važi za drugu', () => {
  assert.equal(isLiveGuideToken('stan-a', liveGuideToken('stan-a')), true);
  assert.equal(isLiveGuideToken('stan-b', liveGuideToken('stan-a')), false);
});
test('loš ili prazan token ne prolazi i ne baca', () => {
  assert.equal(isLiveGuideToken('stan-a', ''), false);
  assert.equal(isLiveGuideToken('stan-a', 'x'.repeat(24)), false);
  assert.equal(isLiveGuideToken('stan-a', 'kratko'), false);
});
test('kod ima 6 znakova iz dozvoljenog alfabeta', () => {
  for (let i = 0; i < 200; i++) assert.match(newLiveCode(), /^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6}$/);
});
```

- [ ] **Step 2: Pokrenuti test** — `node --test app/lib/liveGuide.test.ts`. Očekivano: FAIL (modul ne postoji).
- [ ] **Step 3: Napraviti `app/lib/liveGuide.ts`** po obrascu `app/lib/agencyReport.ts` (`signingKey`, `createHmac`, `timingSafeEqual`, poređenje dužina pre `timingSafeEqual`). Prefiks potpisa je `live-guide:`. Kod pravi `crypto.randomInt(LIVE_CODE_ALPHABET.length)` šest puta. Zaglavlje komentara objašnjava zašto je link stalan i kako se opoziva (promena ključa).
- [ ] **Step 4: Pokrenuti test** — `node --test app/lib/liveGuide.test.ts`. Očekivano: PASS. (Odvojenost od linkova izveštaja garantuje prefiks `live-guide:`. `agencyReport.ts` se ovde ne testira, jer uvozi `@/` alias koji `node --test` ne razume.)
- [ ] **Step 5: Napraviti `app/api/live/start/route.ts`** — `export async function POST(req: Request)`. Redosled: `rateLimit(req, 'live-start', 20, 60 * 60 * 1000)` → 429 sa `Retry-After`. Zatim `req.json()` u try-u, pa `slug` i `token` moraju biti neprazni stringovi (`slug` do 200 znakova) → 400. Zatim `isLiveGuideToken` → 403. Na kraju `NextResponse.json({ code: newLiveCode() })` uz `Cache-Control: no-store`. Poruke grešaka na srpskom, kratko.
- [ ] **Step 6: Admin API** — u `GET` mapiranju tura dodati `liveGuidePath`. U `TourRowMenu.tsx` proširiti `TourRowAction` sa `'live'` i dodati `<Item onClick={() => act('live')}>📡 Link za vođenje uživo</Item>` posle „Pošalji klijentu". U `page.tsx` dodati `liveGuidePath: string` u `TourRow` i granu `else if (action === 'live') void copyLiveGuideLink(tour);`. `copyLiveGuideLink` radi kao `copyEmbedCode`: clipboard, a ako ne uspe, `window.prompt`. Poruka: `` `Link za vođenje uživo je kopiran (${pickTitle(tour)}). Pošaljite ga agentu - samo on treba da ga ima.` ``
- [ ] **Step 7: Provera** — `npx tsc --noEmit` bez novih grešaka. Zatim preview `kvadrat360-dev`, pa u konzoli browsera: `fetch('/api/live/start',{method:'POST',body:JSON.stringify({slug:'stan-kragujevac-maglicka1',token:'pogresan'})}).then(r=>r.status)` → `403`. Sa tačnim tokenom (iz admin „⋯" kopije) → `200` i kod od 6 znakova.
- [ ] **Step 8: `git add`** svih fajlova iz ovog taska (bez commita, vidi Global Constraints).

---

### Task 2: Dogovor o porukama i matematika praćenja

**Files:**
- Create: `app/tour/[slug]/live/protocol.ts`, `app/tour/[slug]/live/liveMath.ts`, `app/tour/[slug]/live/live.test.ts`

Oba modula su bez uvoza (ni `./utils`, ni React), da ih `node --test` pokreće direktno.

**Interfaces:**
- Produces (`protocol.ts`):
  ```ts
  export const LIVE_V = 1;
  export const LIVE_CODE_RE = /^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6}$/;
  export const LIVE_TIMING = { viewMinMs: 100, viewerMinMs: 250, heartbeatMs: 2000, guideLostMs: 30000, noGuideMs: 20000, pointTtlMs: 3000, longPressMs: 500, longPressSlopPx: 8 } as const;
  export type LiveRole = 'guide' | 'viewer';
  export type LiveAngles = { yaw: number; pitch: number; hfov: number };
  export type LiveEvent =
    | ({ type: 'view'; roomId: string } & LiveAngles)
    | { type: 'room'; roomId: string; waypointIndex: number | null }
    | { type: 'point'; roomId: string; yaw: number; pitch: number }
    | { type: 'end' }
    | { type: 'viewer'; roomId: string; yaw: number; pitch: number; following: boolean };
  export type LiveEventType = LiveEvent['type'];
  export function liveChannelName(slug: string, code: string): string; // `live:${slug}:${code}`
  export function toPayload(e: LiveEvent): Record<string, unknown>;   // e bez `type`, plus v: LIVE_V
  export function parseLiveEvent(type: string, payload: unknown): LiveEvent | null;
  ```
- Produces (`liveMath.ts`):
  ```ts
  export const FOLLOW_TAU_MS = 120;
  export function wrapYaw(yaw: number): number;                          // u [-180, 180)
  export function stepToward(cur: LiveAngles, target: LiveAngles, dtMs: number): LiveAngles;
  export function viewChanged(a: LiveAngles, b: LiveAngles): boolean;    // bilo koja razlika > 0.3°
  export function edgeSide(selfYaw: number, peerYaw: number, hfov: number): 'left' | 'right' | null;
  ```
  `stepToward`: faktor `k = 1 - Math.exp(-dtMs / FOLLOW_TAU_MS)`. Yaw ide najkraćim putem (razlika umotana u ±180), a rezultat se umotava. Pitch i hfov idu linearno. Kad su sve razlike ispod 0.05, vraća tačno `target` (sa umotanim yaw-om). `LiveAngles` uvozi kao `import type` iz `./protocol.ts`. Tip-uvoz se briše pri izvršavanju, pa radi u `node --test`.

- [ ] **Step 1: Napisati testove koji padaju** — `live.test.ts`:

```ts
test('parseLiveEvent prihvata ispravan view', () => {
  assert.deepEqual(parseLiveEvent('view', { v: 1, roomId: '12', yaw: 10, pitch: -5, hfov: 90 }),
    { type: 'view', roomId: '12', yaw: 10, pitch: -5, hfov: 90 });
});
test('parseLiveEvent odbija pogrešnu verziju, NaN, nepoznat tip i višak polja ne prenosi', () => {
  assert.equal(parseLiveEvent('view', { v: 2, roomId: '1', yaw: 0, pitch: 0, hfov: 90 }), null);
  assert.equal(parseLiveEvent('view', { v: 1, roomId: '1', yaw: NaN, pitch: 0, hfov: 90 }), null);
  assert.equal(parseLiveEvent('zoom', { v: 1 }), null);
  assert.equal(parseLiveEvent('view', null), null);
  assert.deepEqual(parseLiveEvent('end', { v: 1, x: 'y' }), { type: 'end' });
});
test('room: waypointIndex je ceo broj >= 0 ili null', () => {
  assert.deepEqual(parseLiveEvent('room', { v: 1, roomId: '3', waypointIndex: null }), { type: 'room', roomId: '3', waypointIndex: null });
  assert.equal(parseLiveEvent('room', { v: 1, roomId: '3', waypointIndex: -1 }), null);
  assert.equal(parseLiveEvent('room', { v: 1, roomId: '3', waypointIndex: 1.5 }), null);
});
test('viewer: following mora biti boolean', () => {
  assert.equal(parseLiveEvent('viewer', { v: 1, roomId: '3', yaw: 0, pitch: 0, following: 'da' }), null);
});
test('toPayload i parseLiveEvent su inverzni', () => {
  const e = { type: 'point', roomId: '7', yaw: 33, pitch: 4 } as const;
  assert.deepEqual(parseLiveEvent(e.type, toPayload(e)), e);
});
test('LIVE_CODE_RE', () => {
  assert.ok(LIVE_CODE_RE.test('7KQ4MX'));
  assert.ok(!LIVE_CODE_RE.test('7kq4mx'));
  assert.ok(!LIVE_CODE_RE.test('7KQ4M0'));
  assert.ok(!LIVE_CODE_RE.test('7KQ4MXX'));
});
test('stepToward ide najkraćim putem preko ±180', () => {
  const r = stepToward({ yaw: 170, pitch: 0, hfov: 90 }, { yaw: -170, pitch: 0, hfov: 90 }, 120);
  assert.ok(r.yaw > 170 || r.yaw < -170, `yaw ${r.yaw} je otišao dugim putem`);
});
test('stepToward stiže tačno u cilj', () => {
  let c = { yaw: 0, pitch: 0, hfov: 100 };
  const t = { yaw: 90, pitch: -10, hfov: 70 };
  for (let i = 0; i < 200; i++) c = stepToward(c, t, 16);
  assert.deepEqual(c, t);
});
test('stepToward sa dt=0 ne pomera', () => {
  assert.deepEqual(stepToward({ yaw: 5, pitch: 1, hfov: 90 }, { yaw: 50, pitch: 1, hfov: 90 }, 0), { yaw: 5, pitch: 1, hfov: 90 });
});
test('viewChanged prag 0.3°', () => {
  assert.equal(viewChanged({ yaw: 0, pitch: 0, hfov: 90 }, { yaw: 0.2, pitch: 0, hfov: 90 }), false);
  assert.equal(viewChanged({ yaw: 179.9, pitch: 0, hfov: 90 }, { yaw: -179.9, pitch: 0, hfov: 90 }), false);
  assert.equal(viewChanged({ yaw: 0, pitch: 0, hfov: 90 }, { yaw: 0, pitch: 0, hfov: 90.5 }), true);
});
test('edgeSide', () => {
  assert.equal(edgeSide(0, 30, 90), null);
  assert.equal(edgeSide(0, 80, 90), 'right');
  assert.equal(edgeSide(0, -80, 90), 'left');
  assert.equal(edgeSide(170, -100, 90), 'right');
});
```

- [ ] **Step 2: Pokrenuti** — `node --test app/tour/[slug]/live/live.test.ts`. Očekivano: FAIL (moduli ne postoje).
- [ ] **Step 3: Napraviti `protocol.ts` i `liveMath.ts`** po interfejsima. `parseLiveEvent` za svaki tip proverava samo svoja polja (`typeof === 'number' && Number.isFinite`, `roomId` neprazan string do 64 znaka) i vraća nov objekat samo sa njima.
- [ ] **Step 4: Pokrenuti** — isti test. Očekivano: PASS. Zatim `npx tsc --noEmit` bez novih grešaka.
- [ ] **Step 5: `git add`** tri nova fajla.

---

### Task 3: Veza (`useLiveSession`)

**Files:**
- Create: `app/tour/[slug]/live/useLiveSession.ts`

**Interfaces:**
- Consumes: `supabase` iz `app/lib/supabaseClient.ts`. `LiveRole`, `LiveEvent`, `LIVE_TIMING`, `liveChannelName`, `toPayload`, `parseLiveEvent` iz Task 2.
- Produces:
  ```ts
  export type LiveStatus = 'connecting' | 'waiting' | 'live' | 'ended' | 'lost' | 'failed';
  export type LiveSession = {
    status: LiveStatus;
    peerPresent: boolean;               // agent: ima bar jedan viewer; kupac: agent je tu
    send: (e: LiveEvent) => void;       // tiho ne radi ništa dok kanal nije SUBSCRIBED
    onEvent: (h: (e: LiveEvent) => void) => () => void;  // vraća odjavu
    end: () => void;                    // agent: šalje 'end', zatvara kanal, status 'ended'
  };
  export function useLiveSession(args: { slug: string; code: string | null; role: LiveRole }): LiveSession;
  ```
  - `code === null` znači da nema sesije: status `'connecting'` i ništa se ne otvara.
  - Presence ključ: `crypto.randomUUID()` jednom po mount-u (`useRef`). Uz `track({ role })` posle `SUBSCRIBED`.
  - Agent: `waiting` dok nema `viewer` u `presenceState()`, a inače `live`.
  - Kupac: `waiting` dok nema `guide`. Ako `guide` nije stigao 20 s od `SUBSCRIBED`, status je `'ended'`. Ako `guide` nestane, tajmer od 30 s vodi u `'lost'`, a povratak agenta tajmer briše. Primljen `end` daje `'ended'`.
  - `CHANNEL_ERROR` ili `TIMED_OUT` pre prvog `SUBSCRIBED` daje `'failed'`. Posle toga se oslanja na ponovno povezivanje Supabase klijenta.
  - Cleanup: `supabase.removeChannel(channel)` i brisanje tajmera. Promena `code` zatvara stari kanal pre otvaranja novog (Review Focus 4).
  - Handleri se čuvaju u `useRef<Set<...>>`, pa promena handlera ne otvara kanal ponovo.

- [ ] **Step 1: Napisati hook po interfejsu.**
- [ ] **Step 2: `npx tsc --noEmit`** bez novih grešaka. (Ponašanje se proverava sa dva taba u Task 6, jer hook bez strane nema šta da prikaže.)
- [ ] **Step 3: Brza provera veze iz Node-a** — po uzoru na probu iz brainstorminga: skripta u scratchpad direktorijumu otvara dva klijenta na `liveChannelName('probe', 'ABC234')` i šalje `toPayload({ type: 'view', ... })`, a druga strana ga provlači kroz `parseLiveEvent`. Očekivano: primljen isti događaj. Skripta se briše posle provere i ne ulazi u repo.
- [ ] **Step 4: `git add`.**

---

### Task 4: Agent šalje, kupac prati

**Files:**
- Create: `app/tour/[slug]/live/useLiveGuide.ts`, `app/tour/[slug]/live/useLiveFollow.ts`
- Modify: `app/tour/[slug]/live/live.test.ts` (test `roomChangeDetaches` za čistu pomoćnu funkciju)
- Modify: `app/tour/[slug]/live/liveMath.ts` (`roomChangeDetaches`)

**Interfaces:**
- Consumes: `LiveSession` (Task 3), `stepToward`, `viewChanged`, `edgeSide` (Task 2). Iz `useRoomNavigation`: `walkToRoom(wp: Waypoint)`, `changeRoomById(id: string | number)`, `sceneReadyRef: MutableRefObject<boolean>`, `walkingRef: MutableRefObject<boolean>`. Iz `page.tsx`: `viewerRef: MutableRefObject<any>`, `rooms: Room[]`, `roomIdx: number`. Iz `./utils`: `parseWaypoints`.
- Produces (`liveMath.ts`): `roomChangeDetaches(newRoomId: string, expectedRoomId: string | null): boolean`. Vraća true kad je kupac ušao u sobu koju praćenje nije tražilo.
- Produces (`useLiveGuide.ts`):
  ```ts
  export type PeerView = { roomId: string; yaw: number; pitch: number; following: boolean; lastSeen: number } | null;
  export function useLiveGuide(args: {
    session: LiveSession; active: boolean; viewerRef: MutableRefObject<any>;
    rooms: Room[]; roomIdx: number; changeRoomById: (id: string | number) => void;
  }): {
    peer: PeerView;                         // poslednji 'viewer', null dok ne stigne
    announceWalk: (waypointIndex: number) => void;  // zove se iz klika na tačku PRE walkToRoom
    lookAtPeer: () => void;                 // dodir na strelicu: okreni se ka kupcu (lookAt, 600 ms) ili changeRoomById
  };
  ```
  Dok je `active`, `requestAnimationFrame` petlja čita `viewerRef.current` (`getYaw/getPitch/getHfov`) i šalje `view` kad je `viewChanged` i prošlo je ≥ `viewMinMs`. Otkucaj šalje `view` na `heartbeatMs` bez obzira na promenu. Promena `roomIdx` šalje `room` sa `waypointIndex: null`, osim ako je `announceWalk` već najavio baš tu sobu. `announceWalk` šalje `room` odmah, sa indeksom iz trenutne sobe. `peer.lastSeen` je `Date.now()` pri svakom primljenom `viewer`.
- Produces (`useLiveFollow.ts`):
  ```ts
  export function useLiveFollow(args: {
    session: LiveSession; active: boolean; viewerRef: MutableRefObject<any>;
    rooms: Room[]; roomIdx: number;
    walkToRoom: (wp: Waypoint) => void; changeRoomById: (id: string | number) => void;
    sceneReadyRef: MutableRefObject<boolean>; walkingRef: MutableRefObject<boolean>;
  }): { following: boolean; rejoin: () => void };
  ```
  - Cilj (`view`) se čuva u ref-u. rAF petlja, dok je `following && sceneReadyRef.current && !walkingRef.current`, primenjuje `stepToward` preko `setPitch/setYaw/setHfov` (svi sa trajanjem `0`), i to samo kad je `target.roomId` trenutna soba.
  - `room` sa indeksom: `parseWaypoints(rooms[roomIdx].waypoints_i18n)[i]` i `walkToRoom(wp)`, ako tačka vodi u `roomId`. Inače `changeRoomById(roomId)`. Pre poziva se upisuje `expectedRoomRef = roomId`. Kad stigne `view` za drugu sobu, a `room` je propušten (kasni ulazak), radi se `changeRoomById(view.roomId)`.
  - Odvajanje: `pointerdown` i `wheel` na `document.getElementById('panorama')` (capture faza), i `roomChangeDetaches(String(rooms[roomIdx].id), expectedRoomRef.current)` kad se `roomIdx` promeni. Oba daju `following = false`.
  - Šalje `viewer` (≤ `viewerMinMs`, plus otkucaj) sa trenutnim pogledom i `following`.
  - `rejoin()`: `following = true`. Ako je cilj u drugoj sobi, ide `changeRoomById`, a inače petlja sama glatko okreće.
  - Dok je `active`, kupcu su isključeni žiroskop i automatsko okretanje. To radi `page.tsx` u Task 6, a ovaj hook ne zna za njih.

- [ ] **Step 1: Napisati test koji pada** u `live.test.ts`:

```ts
test('roomChangeDetaches', () => {
  assert.equal(roomChangeDetaches('5', '5'), false);
  assert.equal(roomChangeDetaches('6', '5'), true);
  assert.equal(roomChangeDetaches('6', null), true);
});
```
- [ ] **Step 2: Pokrenuti** — `node --test app/tour/[slug]/live/live.test.ts`. Očekivano: FAIL za `roomChangeDetaches`.
- [ ] **Step 3: Dodati `roomChangeDetaches` u `liveMath.ts`.** Pokrenuti test. Očekivano: PASS.
- [ ] **Step 4: Napisati `useLiveGuide.ts` i `useLiveFollow.ts`** po interfejsima. Nijedan ne čuva instancu viewera, jer se viewer pravi iznova za svaku sobu. Uvek se čita `viewerRef.current` i svaki poziv ide u `try {}`, kao u ostatku ture.
- [ ] **Step 5: `npx tsc --noEmit`** bez novih grešaka.
- [ ] **Step 6: `git add`.**

---

### Task 5: Pokazivač i ekrani

**Files:**
- Create: `app/tour/[slug]/live/livePointer.ts`, `app/tour/[slug]/live/LiveUi.tsx`
- Modify: `app/tour/[slug]/translations.ts` (ključevi ispod, u sva 4 jezika)

**Interfaces:**
- Consumes: `LiveSession`, `LiveStatus` (Task 3), `PeerView` (Task 4), `LIVE_TIMING`, `edgeSide`, teme iz `theme.ts`.
- Produces (`livePointer.ts`):
  ```ts
  export function showLivePoint(viewer: any, p: { yaw: number; pitch: number }): void;  // hotspot id 'k360-live-point', zamenjuje stari, uklanja posle pointTtlMs
  export function useLongPress(args: { enabled: boolean; viewerRef: MutableRefObject<any>; onPoint: (p: { yaw: number; pitch: number }) => void }): void;
  export const LIVE_POINT_CSS: string;  // stilovi kruga sa talasom (kao .ping u mockupu), ubacuje ga LiveUi kroz <style>
  ```
  `useLongPress` sluša `pointerdown/pointermove/pointerup/pointercancel` na `#panorama`. Posle `longPressMs` bez pomeraja većeg od `longPressSlopPx` poziva `viewer.mouseEventToCoords(e)` (vraća `[pitch, yaw]`), pa `onPoint({ yaw, pitch })`.
- Produces (`LiveUi.tsx`), sve sa `lang: Language` i `t: Record<string,string>`:
  ```ts
  export function LiveStartButton(props: { onClick: () => void; busy: boolean; t: Record<string, string> }): JSX.Element;
  export function LiveShareCard(props: { url: string; peerPresent: boolean; onClose: () => void; t: Record<string, string> }): JSX.Element;
  export function LiveJoinCard(props: { agentName: string; agencyName: string | null; tourTitle: string; guidePresent: boolean; onJoin: () => void; t: Record<string, string> }): JSX.Element;
  export function LiveBar(props: { role: LiveRole; status: LiveStatus; peer: PeerView; following: boolean; agentName: string; onEnd: () => void; t: Record<string, string> }): JSX.Element;
  export function LiveBackButton(props: { onClick: () => void; t: Record<string, string> }): JSX.Element;
  export function LivePeerArrow(props: { side: 'left' | 'right' | null; peerRoomTitle: string | null; onClick: () => void; t: Record<string, string> }): JSX.Element | null;
  export function LiveEndCard(props: { reason: 'ended' | 'lost' | 'never' | 'failed'; agentName: string; onContinue: () => void; t: Record<string, string> }): JSX.Element;
  ```
  Raspored i tekstovi su isti kao u mockupu `public/mockup/RazgledanjeUzivo.html`. `LiveBar` je gore levo ispod izbora sobe (ne preko dugmadi sa strane). Kartice su iznad donjeg menija. `LiveStartButton` je okrugla „pilula" u koloni `OverlayButtons`. Viber dugme je `viber://forward?text=` + `encodeURIComponent(url)`, a „Kopiraj" koristi clipboard sa `window.prompt` rezervom.
  Na agentovoj traci, „Kupac je izašao" znači da kupčev otkucaj nije stigao duže od `guideLostMs` (`Date.now() - peer.lastSeen > guideLostMs`, proverava se tajmerom na 1 s dok je traka prikazana).
- Ključevi u `translations.ts` (SR tekst je obavezan, za EN/DE/RU prevod istog smisla):
  `liveStart` „Uživo" · `liveShareTitle` „Pošaljite kupcu ovaj link" · `liveShareText` „Kad ga otvori, vodite ga kroz nekretninu. Pozovite ga telefonom ili Viberom da biste razgovarali." · `liveCopy` „Kopiraj" · `liveCopied` „Kopirano" · `liveWaitingBuyer` „Čeka se kupac…" · `liveBadge` „UŽIVO" · `liveBuyerHere` „Kupac je tu" · `liveBuyerFollows` „Kupac prati" · `liveBuyerAlone` „Kupac gleda sam" · `liveBuyerLeft` „Kupac je izašao" · `liveEnd` „Završi" · `liveJoinTitle` „{name} vas vodi kroz nekretninu" · `liveJoinText` „Vi samo gledate, a sobu i pravac bira agent. Možete i sami da se osvrnete." · `liveJoin` „Uđite u razgledanje" · `liveWaitingAgent` „Čeka se agent…" · `liveLedBy` „Vodi vas {name}" · `liveAlone` „Gledate sami" · `liveBack` „Vrati se agentu" · `livePointing` „{name} pokazuje" · `livePeerHere` „Kupac gleda ovde" · `livePeerInRoom` „Kupac je u: {room}" · `liveEndedTitle` „{name} je završio razgledanje" · `liveLostTitle` „Veza sa agentom je prekinuta" · `liveNeverTitle` „Razgledanje je završeno ili još nije počelo" · `liveFailedTitle` „Veza nije uspela" · `liveEndText` „Tura ostaje otvorena, pa slobodno nastavite da gledate sami." · `liveContinue` „Nastavi razgledanje" · `liveAgentFallback` „Agent".

- [ ] **Step 1: Dodati ključeve u `translations.ts`** (sva 4 jezika). `npx tsc --noEmit`.
- [ ] **Step 2: Napisati `livePointer.ts` i `LiveUi.tsx`.** `{name}` i `{room}` se zamenjuju pomoćnom funkcijom u `LiveUi.tsx`.
- [ ] **Step 3: `npx tsc --noEmit` i `npm run lint`** bez novih grešaka.
- [ ] **Step 4: `git add`.**

---

### Task 6: Uključivanje u turu i provera sa dva taba

**Files:**
- Create: `app/tour/[slug]/live/useLiveViewing.ts`
- Modify: `app/tour/[slug]/page.tsx`

**Interfaces:**
- Consumes: sve iz Task 1–5.
- Produces:
  ```ts
  export type LiveViewing = {
    role: LiveRole | null;            // null = obična tura
    active: boolean;                  // sesija postoji i nije završena (agent: posle Uživo; kupac: posle Uđite)
    blocksAutoplay: boolean;          // role !== null: gasi uvod, sekvencu sobe, vodič, žiroskop, autorotate
    announceWalk: (waypointIndex: number) => void;  // no-op kad nije agent
    ui: ReactNode;                    // sve Live* komponente za trenutno stanje
    sideButton: ReactNode | null;     // LiveStartButton za OverlayButtons kolonu (samo agent sa važećim tokenom)
    skipWelcome: boolean;             // kupac: umesto WelcomeScreen ide LiveJoinCard
  };
  export function useLiveViewing(args: {
    slug: string; tour: Tour | null; lang: Language; t: Record<string, string>;
    rooms: Room[]; roomIdx: number; viewerRef: MutableRefObject<any>;
    walkToRoom: (wp: Waypoint) => void; changeRoomById: (id: string | number) => void;
    sceneReadyRef: MutableRefObject<boolean>; walkingRef: MutableRefObject<boolean>;
    tourStarted: boolean; startTour: () => void; adminMode: boolean;
  }): LiveViewing;
  ```
  - Čita `?agent` i `?uzivo` jednom posle mount-a (`URLSearchParams`, kao red 477 za `?vodic`). Ako postoje oba, važi `?agent`. `?uzivo` koji ne prolazi `LIVE_CODE_RE` se ignoriše (obična tura). U `adminMode` se ne radi ništa.
  - Agent: odmah `POST /api/live/start` sa tokenom. 200 prikazuje dugme, a sve drugo ga sakriva. Klik na „Uživo" (bez ponovnog poziva API-ja, kod je već tu) pravi sesiju i prikazuje `LiveShareCard`. URL za kupca je `` `${location.origin}/tour/${slug}?uzivo=${code}` ``. „Završi" zove `session.end()` i vraća običnu turu sa novim kodom za sledeći put (novi `POST`).
  - Kupac: `skipWelcome` je true. „Uđite" zove `startTour()`. Na `ended`/`lost`/`failed` prikazuje `LiveEndCard`, a „Nastavi" uklanja `?uzivo` (`history.replaceState`) i ostavlja običnu turu.
- Izmene u `page.tsx` (samo ovo):
  1. Posle `useRoomNavigation(...)`: `const live = useLiveViewing({...})`.
  2. Red ~642: `sequenceActiveRef.current = !live.blocksAutoplay;`. Kroz ref (`liveBlocksRef`), jer je u efektu sa svojim zavisnostima: `const liveBlocksRef = useRef(false); liveBlocksRef.current = live.blocksAutoplay;`.
  3. `withIntro`: `if (!introAudioUrl || adminMode || live.blocksAutoplay) return start();`.
  4. Red ~477 (`setGuideRequested`): ne pali vodič kad postoji `?agent` ili `?uzivo`.
  5. Klik na tačku na vratima (red ~388): `live.announceWalk(index); walkToRoom(wp);`.
  6. `{!tourStarted && !live.skipWelcome && (<WelcomeScreen …/>)}`.
  7. U koloni ispod `<OverlayButtons …/>`: `{live.sideButton}`. Žiroskop kod kupca: `canGyro={canGyro && !(live.role === 'viewer' && live.active)}`, a ako je bio uključen, gasi se pri ulasku.
  8. Pred kraj `<main>`: `{live.ui}`.
  9. AI asistent („Pitanja") se ionako ne pokreće sam, pa za njega nema izmene. Meni na dnu ostaje dostupan.
  10. `exhaustive-deps` lint: novi ref-ovi se ne dodaju u zavisnosti postojećih efekata.

- [ ] **Step 1: Napisati `useLiveViewing.ts`** po interfejsu.
- [ ] **Step 2: Napraviti izmene 1–10 u `page.tsx`.** `npx tsc --noEmit` i `npm run lint` bez novih grešaka. `node --test app/lib/liveGuide.test.ts app/tour/[slug]/live/live.test.ts` i dalje PASS.
- [ ] **Step 3: Provera sa dva taba** (preview `kvadrat360-dev`). Agentov tab je desktop, a kupčev je drugi tab sa `resize_window` preset `mobile`. Tura: `stan-kragujevac-maglicka1`, a agentov link je iz admin „⋯". Svaka stavka mora da prođe, sa slikom ekrana kao dokazom:
  - [ ] Obična tura bez parametara: uvod, narator sobe, izbor vodiča i žiroskop rade kao pre (Review Focus 5).
  - [ ] Loš `?agent`: dugme „Uživo" se ne pojavljuje, a tura radi.
  - [ ] Agent: „Uživo" → kartica sa linkom i „Čeka se kupac…".
  - [ ] Kupac otvara link: `LiveJoinCard` sa imenom agenta, bez `WelcomeScreen`-a i uvoda. Pre agenta stoji „Čeka se agent…".
  - [ ] „Uđite": agentova traka prelazi u „Kupac prati", a kupac vidi agentov pravac. Okretanje i zum kod agenta kupac prati glatko.
  - [ ] Agent prolazi kroz vrata: kupac ide istom šetnjom u istu sobu. Agent menja sobu iz liste: kupac prelazi pretapanjem.
  - [ ] Dugi dodir (agent): krug na istom mestu u prostoru kod oba, oznaka „Marko pokazuje" kod kupca, nestaje za 3 s.
  - [ ] Kupac prevuče: „Gledate sami" i „Vrati se agentu", a agent vidi „Kupac gleda sam" i strelicu na pravoj strani. Dodir na strelicu okreće agenta.
  - [ ] Kupac sam promeni sobu strelicom: ostaje u svojoj sobi (Review Focus 2), a agent vidi „Kupac je u: …". „Vrati se agentu" ga vodi nazad.
  - [ ] Kupac dodirne ekran usred agentove šetnje: šetnja se završi, kupac je odvojen, „Vrati se" radi (Review Focus 1).
  - [ ] Kupčev tab sakriven 40 s, pa vraćen: agent je u međuvremenu video „Kupac je izašao", a posle povratka praćenje radi bez skoka (Review Focus 3).
  - [ ] Agent osveži tab: kupac posle 30 s dobija „Veza sa agentom je prekinuta" (Review Focus 4).
  - [ ] „Završi": kupac dobija „… je završio razgledanje", a „Nastavi" ostavlja običnu turu bez `?uzivo` u adresi.
  - [ ] Isti kupčev link posle kraja: posle 20 s „Razgledanje je završeno ili još nije počelo".
  - [ ] Ni kod jedne strane tokom razgledanja ne kreće narator, uvod ni automatski vodič.
  - [ ] `read_console_messages` bez grešaka kod oba taba.
  - [ ] Vratiti `resize_window` na `desktop`.
- [ ] **Step 4: `git add`** svih fajlova taska. Zatim izveštaj vlasniku sa slikama ekrana i napomenom da je pre puštanja agentima potreban test na dva prava telefona preko mobilne mreže. Commit i push tek na „pushuj".
