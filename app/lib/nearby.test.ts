import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchNearby, NEARBY_CATEGORIES, NEARBY_LABELS, nearbyChange, nearestByCategory, type NearbyCategory, type NearbyPlace } from './nearby.ts';

const p = (cat: NearbyCategory, m: number): NearbyPlace => ({ cat, m, name: cat + m, lat: 0, lng: 0 });

test('nearestByCategory uzima najbliže po vrsti', () => {
  const r = nearestByCategory([p('shop', 600), p('shop', 250), p('bus', 140), p('school', 480)]);
  assert.equal(r.shop?.m, 250);
  assert.equal(r.bus?.m, 140);
  assert.equal(r.pharmacy, undefined);
});

test('nearestByCategory za prazan niz', () => assert.deepEqual(nearestByCategory([]), {}));

test('NEARBY_LABELS ima sva 4 jezika i sve vrste', () => {
  for (const l of ['sr', 'en', 'de', 'ru'] as const) for (const c of NEARBY_CATEGORIES) assert.ok(NEARBY_LABELS[l][c]);
});

test('nearbyChange: nova lokacija briše staru okolinu i traži novu', () => {
  assert.deepEqual(nearbyChange({ lat: 1, lng: 1, hasNearby: true }, 2, 2), { refresh: true, clear: true });
});
test('nearbyChange: ista lokacija sa okolinom ne zove Overpass', () => {
  assert.deepEqual(nearbyChange({ lat: 1, lng: 1, hasNearby: true }, 1, 1), { refresh: false, clear: false });
});
test('nearbyChange: ista lokacija bez okoline pokušava ponovo, bez brisanja', () => {
  assert.deepEqual(nearbyChange({ lat: 1, lng: 1, hasNearby: false }, 1, 1), { refresh: true, clear: false });
});
test('nearbyChange: bez koordinata nema traženja, a stara okolina se briše', () => {
  assert.deepEqual(nearbyChange({ lat: 1, lng: 1, hasNearby: true }, null, null), { refresh: false, clear: true });
});

// Lažni Overpass serveri: odgovaraju posle `ms`, sa statusom; poštuju abort.
type FakeServer = { ms: number; status: number };
function fakeOverpass(servers: Record<string, FakeServer>) {
  const calls: { host: string; at: number; aborted: boolean }[] = [];
  const t0 = Date.now();
  const elements = [{ lat: 44.8, lon: 20.4, tags: { shop: 'supermarket', name: 'Maxi' } }];
  const impl = (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const host = new URL(String(url)).host;
    const call = { host, at: Date.now() - t0, aborted: false };
    calls.push(call);
    const s = servers[host] ?? { ms: 10, status: 504 };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => resolve(new Response(s.status === 200 ? JSON.stringify({ elements }) : 'busy', { status: s.status })),
        s.ms
      );
      init?.signal?.addEventListener('abort', () => {
        call.aborted = true;
        clearTimeout(timer);
        reject(new DOMException('aborted', 'AbortError'));
      });
    });
  };
  return { impl: impl as typeof fetch, calls };
}

test('fetchNearby pita sve servere odjednom i uzima prvi ispravan odgovor', async () => {
  const fake = fakeOverpass({
    'overpass-api.de': { ms: 300, status: 504 },
    'maps.mail.ru': { ms: 120, status: 200 },
    'overpass.kumi.systems': { ms: 5000, status: 200 }
  });
  const t = Date.now();
  const places = await fetchNearby(44.8, 20.4, { fetchImpl: fake.impl });
  assert.equal(places[0]?.name, 'Maxi');
  assert.ok(Date.now() - t < 1000, 'ne čeka spori server');
  assert.equal(fake.calls.length, 3);
  // Pre nego što je i najbrži server (120 ms) odgovorio - nije jedan za drugim.
  assert.ok(fake.calls.every((c) => c.at < 100), 'svi upiti krenu odmah');
  assert.equal(fake.calls.find((c) => c.host === 'overpass.kumi.systems')?.aborted, true, 'gubitnik se prekida');
});

test('fetchNearby javlja grešku kad nijedan server ne odgovori ispravno', async () => {
  const fake = fakeOverpass({
    'overpass-api.de': { ms: 20, status: 504 },
    'maps.mail.ru': { ms: 30, status: 502 },
    'overpass.kumi.systems': { ms: 40, status: 429 }
  });
  await assert.rejects(fetchNearby(44.8, 20.4, { fetchImpl: fake.impl }), /Overpass/);
});

test('fetchNearby poštuje ukupan rok', async () => {
  const fake = fakeOverpass({
    'overpass-api.de': { ms: 5000, status: 200 },
    'maps.mail.ru': { ms: 5000, status: 200 },
    'overpass.kumi.systems': { ms: 5000, status: 200 }
  });
  const t = Date.now();
  await assert.rejects(fetchNearby(44.8, 20.4, { budgetMs: 300, fetchImpl: fake.impl }), /Overpass/);
  assert.ok(Date.now() - t < 1500);
});
