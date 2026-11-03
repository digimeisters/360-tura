import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attemptTimeoutMs } from './aiDeadline.ts';

test('pun timeout kad ima vremena', () => {
  assert.equal(attemptTimeoutMs(0, 52_000, 25_000), 25_000);
});

test('timeout se skraćuje do roka, uz rezervu', () => {
  assert.equal(attemptTimeoutMs(30_000, 52_000, 25_000), 20_000);
});

test('bez pokušaja kad ostane manje od minimuma', () => {
  assert.equal(attemptTimeoutMs(45_000, 52_000, 25_000), null);
  assert.equal(attemptTimeoutMs(60_000, 52_000, 25_000), null);
});

test('bez roka nema skraćivanja', () => {
  assert.equal(attemptTimeoutMs(99_000, undefined, 25_000), 25_000);
});
