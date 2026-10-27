import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRoomHeat, MIN_HEAT_VIEWERS, type HeatEvent, type HeatRoom } from './roomHeat.ts';

const CAP = 5 * 60 * 1000;

const rooms: HeatRoom[] = [
  { id: 'a', title: 'Dnevna', x: 50, y: 50, order: 0 },
  { id: 'b', title: 'Kupatilo', x: 20, y: 20, order: 1 },
  { id: 'c', title: 'Terasa', x: 80, y: 80, order: 2 }
];

let clock = 0;
/** Posetilac s prolazi kroz sobe redom; svako gledanje traje ms. */
function visit(s: string, steps: [string, number][]): HeatEvent[] {
  return steps.map(([room, ms]) => ({ session_id: s, room_id: room, duration_ms: ms, created_at: new Date(++clock * 1000).toISOString() }));
}

function crowd(n: number, steps: [string, number][], prefix = 's'): HeatEvent[] {
  return Array.from({ length: n }, (_, i) => visit(`${prefix}${i}`, steps)).flat();
}

test('ispod praga posetilaca nema mape', () => {
  const events = crowd(MIN_HEAT_VIEWERS - 1, [['a', 1000]]);
  assert.equal(buildRoomHeat(events, rooms, CAP), null);
});

test('procenat pogledalo = različiti posetioci po sobi / svi koji imaju podatke', () => {
  const events = [...crowd(10, [['a', 10_000], ['b', 10_000]]), ...crowd(10, [['a', 10_000], ['a', 10_000]], 'x')];
  const heat = buildRoomHeat(events, rooms, CAP)!;
  assert.equal(heat.viewers, 20);
  const byId = Object.fromEntries(heat.rows.map((r) => [r.id, r]));
  assert.equal(byId.a.seenPct, 100);
  assert.equal(byId.b.seenPct, 50);
  assert.equal(byId.c.seenPct, 0);
  assert.deepEqual(
    heat.rows.map((r) => r.id),
    ['a', 'b', 'c']
  );
});

test('prosečno vreme je po gledanju i seče predugo gledanje', () => {
  const events = [...crowd(9, [['a', 20_000]]), ...visit('long', [['a', 60 * 60 * 1000]])];
  const heat = buildRoomHeat(events, rooms, CAP)!;
  const a = heat.rows.find((r) => r.id === 'a')!;
  assert.equal(a.avgSeconds, Math.round((9 * 20 + 300) / 10));
});

test('izašli tu = poslednja soba posetioca po vremenu, ne po redu u nizu', () => {
  const events = crowd(10, [['a', 1000], ['b', 1000]]).reverse();
  const heat = buildRoomHeat(events, rooms, CAP)!;
  const byId = Object.fromEntries(heat.rows.map((r) => [r.id, r]));
  assert.equal(byId.b.exitPct, 100);
  assert.equal(byId.a.exitPct, 0);
  assert.equal(heat.exitRoomId, 'b');
});

test('obrisane sobe i događaji bez sobe se preskaču', () => {
  const events = [...crowd(10, [['a', 1000]]), ...visit('z', [['obrisana', 1000]]), { session_id: 'q', room_id: null, duration_ms: 5, created_at: '2026-01-01T00:00:00Z' }];
  const heat = buildRoomHeat(events, rooms, CAP)!;
  assert.equal(heat.viewers, 10);
  assert.ok(!heat.rows.some((r) => r.id === 'obrisana'));
});

test('zaključak: retko viđena soba u kojoj se dugo ostaje', () => {
  const events = [
    ...crowd(20, [['a', 30_000], ['b', 30_000]]),
    ...crowd(5, [['a', 30_000], ['c', 120_000], ['b', 30_000]], 'g')
  ];
  const heat = buildRoomHeat(events, rooms, CAP)!;
  const gem = heat.insights.find((i) => i.kind === 'hidden-gem');
  assert.ok(gem);
  assert.equal(gem.room, 'Terasa');
  assert.equal(gem.seenPct, 20);
  assert.equal(gem.typicalSeconds, 120);
});

test('nema zaključka o skrivenoj sobi kad je dugo vreme od par ostavljenih tabova', () => {
  const events = [
    ...crowd(20, [['a', 30_000], ['b', 30_000]]),
    ...crowd(2, [['a', 30_000], ['c', 300_000], ['b', 30_000]], 'idle'),
    ...crowd(3, [['a', 30_000], ['c', 10_000], ['b', 30_000]], 'quick')
  ];
  const heat = buildRoomHeat(events, rooms, CAP)!;
  assert.equal(heat.insights.find((i) => i.kind === 'hidden-gem'), undefined);
});

test('nema zaključka o skrivenoj sobi kad ju je videlo manje od 5 kupaca', () => {
  const events = [...crowd(16, [['a', 30_000], ['b', 30_000]]), ...crowd(4, [['a', 30_000], ['c', 120_000], ['b', 30_000]], 'g')];
  const heat = buildRoomHeat(events, rooms, CAP)!;
  assert.equal(heat.insights.find((i) => i.kind === 'hidden-gem'), undefined);
});

test('zaključak: mnogo kupaca izađe već u prvoj prostoriji', () => {
  const events = [...crowd(4, [['a', 5000]]), ...crowd(6, [['a', 5000], ['b', 5000]], 'y')];
  const heat = buildRoomHeat(events, rooms, CAP)!;
  const early = heat.insights.find((i) => i.kind === 'early-exit');
  assert.ok(early);
  assert.equal(early.room, 'Dnevna');
  assert.equal(early.exitPct, 40);
});

test('ravnomerno gledanje ne daje zaključke', () => {
  const events = crowd(10, [['a', 30_000], ['b', 30_000], ['c', 30_000]]);
  assert.deepEqual(buildRoomHeat(events, rooms, CAP)!.insights, []);
});
