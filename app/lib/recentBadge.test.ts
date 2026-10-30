import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRecentlyAdded } from './recentBadge.ts';

test('isRecentlyAdded je tačno u prozoru od 21 dan', () => {
  const now = new Date('2026-10-30T12:00:00Z');
  assert.equal(isRecentlyAdded('2026-10-15', now), true); // 15 dana - još "Novo"
  assert.equal(isRecentlyAdded('2026-10-09', now), true); // 21 dan - granica, još "Novo"
  assert.equal(isRecentlyAdded('2026-10-08', now), false); // 22 dana - više nije
  assert.equal(isRecentlyAdded('2026-10-30', now), true); // danas
});

test('isRecentlyAdded prihvata budući datum kao "Novo" (ne baca)', () => {
  const now = new Date('2026-10-30T12:00:00Z');
  assert.equal(isRecentlyAdded('2026-11-05', now), true);
});
