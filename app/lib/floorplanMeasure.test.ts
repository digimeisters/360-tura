import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FloorplanLayout } from './floorplanLayout.ts';
import { applyMeters, clearMeters, withoutUnusedScale, formatArea, groupAreaM2, parseMeters, shapeMeters, totalAreaM2 } from './floorplanMeasure.ts';

function plan(): FloorplanLayout {
  return {
    version: 1,
    groups: [
      { id: 'g1', label: 'Dnevna soba', outdoor: false },
      { id: 'g2', label: 'Kuhinja', outdoor: false },
      { id: 'g3', label: 'Hodnik', outdoor: false }
    ],
    shapes: [
      { id: 's1', group: 'g1', x: 0, y: 0, w: 220, h: 100 },
      { id: 's2', group: 'g2', x: 220, y: 0, w: 100, h: 100 },
      { id: 's3', group: 'g3', x: 0, y: 100, w: 100, h: 50 },
      { id: 's4', group: 'g3', x: 100, y: 100, w: 50, h: 50 }
    ],
    doors: [],
    rooms: []
  };
}

const shape = (l: FloorplanLayout, id: string) => l.shapes.find((s) => s.id === id)!;

test('applyMeters bez merila postavlja merilo', () => {
  const l = applyMeters(plan(), 's1', 4.4, 3.2);
  assert.equal(l.unitsPerMeter, 50);
  assert.equal(shape(l, 's1').w, 220);
  assert.equal(shape(l, 's1').h, 160);
  assert.equal(shape(l, 's1').measured, true);
});

test('applyMeters sa merilom menja veličinu', () => {
  const l = applyMeters(applyMeters(plan(), 's1', 4.4, 3.2), 's2', 2.6, 3.2);
  assert.equal(shape(l, 's2').w, 130);
  assert.equal(shape(l, 's2').h, 160);
  assert.equal(shape(l, 's2').x, 220);
});

test('groupAreaM2 L-oblik', () => {
  const l = { ...plan(), unitsPerMeter: 50 };
  l.shapes = l.shapes.map((s) => (s.group === 'g3' ? { ...s, measured: true } : s));
  assert.equal(groupAreaM2(l, 'g3'), 3);
  l.shapes = l.shapes.map((s) => (s.id === 's4' ? { ...s, measured: false } : s));
  assert.equal(groupAreaM2(l, 'g3'), null);
});

test('totalAreaM2 sabira samo izmerene grupe', () => {
  assert.equal(totalAreaM2(plan()), null);
  const l = applyMeters(applyMeters(plan(), 's1', 4.4, 3.2), 's2', 2.6, 3.2);
  assert.ok(Math.abs(totalAreaM2(l)! - (14.08 + 8.32)) < 1e-9);
});

test('formatArea', () => {
  assert.equal(formatArea(14.08, 'sr'), '14,1 m²');
  assert.equal(formatArea(14.08, 'en'), '14.1 m²');
  assert.equal(formatArea(14.08, 'ru'), '14,1 м²');
  assert.equal(formatArea(3, 'de'), '3,0 m²');
});

test('parseMeters', () => {
  assert.equal(parseMeters('3,40'), 3.4);
  assert.equal(parseMeters(' 3.4 '), 3.4);
  assert.equal(parseMeters('0,1'), null);
  assert.equal(parseMeters('abc'), null);
  assert.equal(parseMeters(''), null);
});

test('shapeMeters zaokružuje na 5 cm', () => {
  const l = { ...plan(), unitsPerMeter: 50 };
  l.shapes[0] = { ...l.shapes[0], w: 171, measured: true };
  assert.deepEqual(shapeMeters(l.shapes[0], 50), { w: 3.4, h: 2 });
  assert.equal(shapeMeters(l.shapes[1], 50), null);
  assert.equal(shapeMeters(l.shapes[0], undefined), null);
});

test('clearMeters poslednjeg briše merilo', () => {
  const two = applyMeters(applyMeters(plan(), 's1', 4.4, 3.2), 's2', 2.6, 3.2);
  const one = clearMeters(two, 's1');
  assert.equal(one.unitsPerMeter, 50);
  assert.equal(shape(one, 's1').measured, undefined);
  const none = clearMeters(one, 's2');
  assert.equal(none.unitsPerMeter, undefined);
});

test('withoutUnusedScale posle brisanja izmerene prostorije', () => {
  const l = applyMeters(plan(), 's1', 4.4, 3.2);
  const deleted = { ...l, shapes: l.shapes.filter((s) => s.id !== 's1') };
  assert.equal(withoutUnusedScale(deleted).unitsPerMeter, undefined);
  assert.equal(withoutUnusedScale(l).unitsPerMeter, 50);
});
