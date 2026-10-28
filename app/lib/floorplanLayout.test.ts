import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLayout } from './floorplanLayout.ts';

/** Najmanji ispravan raspored: tri prostorije u nizu. */
function base(extra: Record<string, unknown> = {}) {
  return {
    version: 1,
    groups: [
      { id: 'g1', label: 'Dnevna soba', outdoor: false },
      { id: 'g2', label: 'Kuhinja', outdoor: false },
      { id: 'g3', label: 'Hodnik', outdoor: false }
    ],
    shapes: [
      { id: 's1', group: 'g1', x: 0, y: 0, w: 220, h: 160 },
      { id: 's2', group: 'g2', x: 220, y: 0, w: 130, h: 160 },
      { id: 's3', group: 'g3', x: 0, y: 160, w: 150, h: 140 }
    ],
    doors: [],
    rooms: [],
    ...extra
  };
}

test('parseLayout čita stara vrata kao prolaz', () => {
  const l = parseLayout(base({ doors: [['g1', 'g2'], ['g2', 'g3', 1]] }));
  assert.ok(l);
  assert.deepEqual(l.doors, [
    { a: 'g1', b: 'g2' },
    { a: 'g2', b: 'g3', wall: 1 }
  ]);
  assert.equal(l.doors[0].kind, undefined);
});

test('parseLayout čuva nova polja vrata', () => {
  const door = { a: 'g1', b: 'g2', at: 0.2, kind: 'door', into: 'g2', hinge: 'end' };
  const l = parseLayout(base({ doors: [door, { a: 'g1', b: 'g3', at: 1.7, into: 'g9' }] }));
  assert.ok(l);
  assert.deepEqual(l.doors[0], door);
  assert.deepEqual(l.doors[1], { a: 'g1', b: 'g3' });
});

test('parseLayout čuva mere i nazive', () => {
  const input = base({ unitsPerMeter: 50 });
  (input.shapes[0] as Record<string, unknown>).measured = true;
  Object.assign(input.groups[1], { labels: { en: 'Kitchen', xx: '?', de: 'x'.repeat(61) }, labelsManual: ['en', 'xx'] });
  const l = parseLayout(input);
  assert.ok(l);
  assert.equal(l.unitsPerMeter, 50);
  assert.equal(l.shapes[0].measured, true);
  assert.equal(l.shapes[1].measured, undefined);
  assert.deepEqual(l.groups[1].labels, { en: 'Kitchen' });
  assert.deepEqual(l.groups[1].labelsManual, ['en']);

  for (const bad of [0, -3, Number.NaN]) {
    const p = parseLayout(base({ unitsPerMeter: bad }));
    assert.ok(p);
    assert.equal(p.unitsPerMeter, undefined);
  }
});

test('parseLayout odbija vrata ka nepostojećoj grupi', () => {
  assert.equal(parseLayout(base({ doors: [['g1', 'g9']] })), null);
  assert.equal(parseLayout(base({ doors: [{ a: 'g9', b: 'g1' }] })), null);
});

// ---------------------------------------------------------------------------
// Crtanje: jezik, m², napomena, vrata

import { doorAtFromPoint, doorGeometry, renderFloorplanSvg, type FloorplanLayout } from './floorplanLayout.ts';

/** g1 dnevna 220×160, g2 kuhinja desno (zid x=220, y 0..160), g3 hodnik ispod (zid y=160, x 0..200). */
function drawn(extra: Partial<FloorplanLayout> = {}): FloorplanLayout {
  return {
    version: 1,
    groups: [
      { id: 'g1', label: 'Dnevna soba', outdoor: false },
      { id: 'g2', label: 'Kuhinja', outdoor: false, labels: { en: 'Kitchen' } },
      { id: 'g3', label: 'Hodnik', outdoor: false }
    ],
    shapes: [
      { id: 's1', group: 'g1', x: 0, y: 0, w: 220, h: 160 },
      { id: 's2', group: 'g2', x: 220, y: 0, w: 130, h: 160 },
      { id: 's3', group: 'g3', x: 0, y: 160, w: 200, h: 140 }
    ],
    doors: [],
    rooms: [],
    ...extra
  };
}

const count = (s: string, sub: string) => s.split(sub).length - 1;

test('renderFloorplanSvg bez merila', () => {
  const { svg } = renderFloorplanSvg(drawn());
  assert.ok(svg.includes('Šematski prikaz — nije u razmeri'));
  assert.ok(!svg.includes('m²'));
  assert.ok(!svg.includes('class="leaf"'));
});

test('stari plan crta prolaz na sredini', () => {
  const l = parseLayout({ ...drawn(), doors: [['g1', 'g2']] })!;
  const { svg } = renderFloorplanSvg(l);
  assert.ok(svg.includes('<line x1="220" y1="63" x2="220" y2="97" class="door"/>'), svg);
  assert.ok(!svg.includes('class="leaf"'));
});

test('izmerena prostorija ima m² na jeziku', () => {
  const l = drawn({ unitsPerMeter: 50 });
  l.shapes[0] = { ...l.shapes[0], measured: true };
  assert.ok(renderFloorplanSvg(l).svg.includes('14,1 m²'));
  const en = renderFloorplanSvg(l, 'en').svg;
  assert.ok(en.includes('14.1 m²'));
  assert.ok(en.includes('Dimensions are approximate · total 14.1 m²'));
});

test('neizmerena prostorija nema m²', () => {
  const l = drawn({ unitsPerMeter: 50 });
  l.shapes[1] = { ...l.shapes[1], measured: true };
  const svg = renderFloorplanSvg(l).svg;
  assert.equal(count(svg, 'class="area"'), 1);
  assert.ok(svg.includes('Mere su orijentacione · ukupno 8,3 m²'));
});

test('merilo bez potpuno izmerene prostorije', () => {
  const svg = renderFloorplanSvg(drawn({ unitsPerMeter: 50 }), 'de').svg;
  assert.ok(svg.includes('>Maße sind ungefähr<'));
});

test('naziv na jeziku', () => {
  assert.ok(renderFloorplanSvg(drawn(), 'en').svg.includes('>Kitchen<'));
  assert.ok(renderFloorplanSvg(drawn(), 'de').svg.includes('>Kuhinja<'));
  assert.ok(renderFloorplanSvg(drawn(), 'ru').svg.includes('Схема — не в масштабе'));
});

test('vrata sa lukom', () => {
  const door = { a: 'g1', b: 'g3', kind: 'door' as const, at: 0.25, into: 'g3', hinge: 'start' as const };
  const l = drawn({ doors: [door] });
  const svg = renderFloorplanSvg(l).svg;
  assert.ok(svg.includes('class="leaf"'));
  assert.ok(svg.includes('class="swing"'));
  const g = doorGeometry(l, door)!;
  assert.equal(g.vertical, false);
  assert.equal(g.center, g.from + 50);
  // Šarka na x=33, krilo ide nadole (u hodnik), luk do drugog kraja otvora.
  assert.ok(svg.includes('<line x1="33" y1="160" x2="33" y2="194" class="leaf"/>'), svg);
  assert.ok(svg.includes('<path d="M33 194 A34 34 0 0 0 67 160" class="swing"/>'), svg);
});

test('vrata ostaju na kratkom zidu', () => {
  const l = drawn({ shapes: [
    { id: 's1', group: 'g1', x: 0, y: 0, w: 220, h: 160 },
    { id: 's2', group: 'g2', x: 220, y: 0, w: 130, h: 160 },
    { id: 's3', group: 'g3', x: 180, y: 160, w: 120, h: 140 }
  ] });
  const g = doorGeometry(l, { a: 'g1', b: 'g3', kind: 'door', at: 0.9 })!;
  assert.ok(g);
  assert.equal(g.to - g.from, 40);
  assert.equal(g.center, 200);
  assert.equal(g.width, 26);
});

test('dug prevod se prelama u dva reda', () => {
  const l = drawn();
  l.groups[2] = { ...l.groups[2], labels: { de: 'Schlafzimmer mit Ankleide' } };
  const svg = renderFloorplanSvg(l, 'de').svg;
  assert.ok(svg.includes('>Schlafzimmer<'));
  assert.ok(svg.includes('>mit Ankleide<'));
});

test('doorAtFromPoint', () => {
  const door = { a: 'g1', b: 'g3' };
  const l = drawn();
  assert.ok(Math.abs(doorAtFromPoint(l, door, { x: 50, y: 170 }) - 0.25) < 0.01);
  assert.equal(doorAtFromPoint(l, door, { x: -40, y: 160 }), 0);
  assert.equal(doorAtFromPoint(l, door, { x: 900, y: 160 }), 1);
});

test('parseLayout briše merilo kad nijedan deo nije izmeren', () => {
  const l = parseLayout({ ...drawn(), unitsPerMeter: 50 })!;
  assert.equal(l.unitsPerMeter, undefined);
  const m = drawn({ unitsPerMeter: 50 });
  m.shapes[0] = { ...m.shapes[0], measured: true };
  assert.equal(parseLayout(m)!.unitsPerMeter, 50);
});
