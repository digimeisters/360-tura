import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NEARBY_CATEGORIES, NEARBY_LABELS, nearbyChange, nearestByCategory, type NearbyCategory, type NearbyPlace } from './nearby.ts';

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
