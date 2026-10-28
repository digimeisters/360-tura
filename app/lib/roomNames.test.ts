import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FloorplanLayout } from './floorplanLayout.ts';
import { fillAutoLabels, planLanguages, renameGroup, setManualLabel, translateRoomName, type RoomTitles } from './roomNames.ts';

function plan(label: string, extra: object = {}): FloorplanLayout {
  return {
    version: 1,
    groups: [{ id: 'g1', label, outdoor: false, ...extra }],
    shapes: [{ id: 's1', group: 'g1', x: 0, y: 0, w: 100, h: 100 }],
    doors: [],
    rooms: [{ roomId: 'r1', group: 'g1' }]
  };
}

test('rečnik', () => {
  assert.equal(translateRoomName('Dnevna soba', 'de'), 'Wohnzimmer');
  assert.equal(translateRoomName('KUPATILO', 'en'), 'Bathroom');
  assert.equal(translateRoomName('Spavaca soba 2', 'ru'), 'Спальня 2');
  assert.equal(translateRoomName('Spavaća soba 2', 'en'), 'Bedroom 2');
  assert.equal(translateRoomName('Lođa', 'en'), 'Loggia');
  assert.equal(translateRoomName('Vinski podrum', 'en'), null);
});

test('naslov sobe ima prednost', () => {
  const titles: RoomTitles = new Map([['r1', { sr: 'Hodnik 1/2', en: 'Corridor 1/2' }]]);
  const { layout, missing } = fillAutoLabels(plan('Hodnik'), titles, ['en', 'de']);
  assert.equal(layout.groups[0].labels?.en, 'Corridor');
  assert.equal(layout.groups[0].labels?.de, 'Flur');
  assert.equal(missing.length, 0);
});

test('ručni prevod se ne dira', () => {
  const { layout } = fillAutoLabels(plan('Dnevna soba', { labels: { en: 'Lounge' }, labelsManual: ['en'] }), new Map(), ['en']);
  assert.equal(layout.groups[0].labels?.en, 'Lounge');
});

test('nepoznat naziv ide u missing', () => {
  const { missing } = fillAutoLabels(plan('Vinski podrum'), new Map(), ['en', 'de']);
  assert.deepEqual(missing, [
    { groupId: 'g1', lang: 'en', sr: 'Vinski podrum' },
    { groupId: 'g1', lang: 'de', sr: 'Vinski podrum' }
  ]);
});

test('renameGroup briše automatske, čuva ručne', () => {
  const g = renameGroup({ id: 'g1', label: 'Soba', outdoor: false, labels: { en: 'Room', de: 'Mein Zimmer' }, labelsManual: ['de'] }, 'Radna soba');
  assert.equal(g.label, 'Radna soba');
  assert.deepEqual(g.labels, { de: 'Mein Zimmer' });
});

test('setManualLabel', () => {
  const g0 = { id: 'g1', label: 'Kuhinja', outdoor: false };
  const g1 = setManualLabel(g0, 'en', 'Cooking area');
  assert.deepEqual(g1.labels, { en: 'Cooking area' });
  assert.deepEqual(g1.labelsManual, ['en']);
  const g2 = setManualLabel(g1, 'en', '  ');
  assert.equal(g2.labels?.en, undefined);
  assert.ok(!g2.labelsManual?.includes('en'));
});

test('planLanguages', () => {
  assert.deepEqual(planLanguages('["sr","en","de"]', []), ['en', 'de']);
  assert.deepEqual(planLanguages(null, [{ sr: 'a', ru: 'b' }, '{"sr":"x","en":"y"}']), ['en', 'ru']);
  assert.deepEqual(planLanguages('nije json', []), []);
});

test('setManualLabel čuva razmak dok se kuca', () => {
  const g = setManualLabel({ id: 'g1', label: 'Trpezarija', outdoor: false }, 'en', 'Dining ');
  assert.equal(g.labels?.en, 'Dining ');
});
