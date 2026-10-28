import { test } from 'node:test';
import assert from 'node:assert/strict';
import { floorplanImageUrl, floorplanUrlFor } from './floorplanImage.ts';

const SCH = 'https://cdn.x/s/floorplan-schematic.svg?v=9';

test('floorplanUrlFor šematski plan po jeziku', () => {
  assert.equal(floorplanUrlFor(SCH, 'en'), 'https://cdn.x/s/floorplan-schematic.en.svg?v=9');
  assert.equal(floorplanUrlFor(SCH, 'sr'), SCH);
});

test('floorplanUrlFor pravi tlocrt ostaje isti', () => {
  assert.equal(floorplanUrlFor('https://cdn.x/s/plan.jpg', 'de'), 'https://cdn.x/s/plan.jpg');
  assert.equal(floorplanUrlFor(null, 'de'), null);
});

test('floorplanImageUrl PNG po jeziku', () => {
  assert.equal(floorplanImageUrl(SCH, 'ru'), 'https://cdn.x/s/floorplan-schematic.ru.png?v=9');
  assert.equal(floorplanImageUrl(SCH), 'https://cdn.x/s/floorplan-schematic.png?v=9');
  assert.equal(floorplanImageUrl(null), null);
});
