import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIVE_CODE_RE, parseLiveEvent, toPayload } from './protocol.ts';
import { edgeSide, roomChangeDetaches, stepToward, viewChanged } from './liveMath.ts';

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

test('roomChangeDetaches', () => {
  assert.equal(roomChangeDetaches('5', '5'), false);
  assert.equal(roomChangeDetaches('6', '5'), true);
  assert.equal(roomChangeDetaches('6', null), true);
});

test('stepToward posle duge pauze (telefon u pozadini) ne skače u cilj', () => {
  const r = stepToward({ yaw: 0, pitch: 0, hfov: 90 }, { yaw: 170, pitch: 0, hfov: 90 }, 60000);
  assert.ok(r.yaw > 0 && r.yaw < 90, `yaw ${r.yaw} je skočio`);
});
