import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickCardStrips } from './cardStrips.ts';

const room = (id: string, strip: boolean) => ({ id, title: `Soba ${id}`, stripUrl: strip ? `https://cdn/${id}-strip.webp` : null });

test('pickCardStrips počinje od naslovne sobe i ide dalje redom, najviše tri', () => {
  const rooms = [room('a', true), room('b', true), room('c', true), room('d', true), room('e', true)];
  assert.deepEqual(pickCardStrips(rooms, 'c').map((s) => s.title), ['Soba c', 'Soba d', 'Soba e']);
});

test('pickCardStrips se vraća na početak spiska i preskače sobe bez trake', () => {
  const rooms = [room('a', true), room('b', false), room('c', true), room('d', false)];
  assert.deepEqual(pickCardStrips(rooms, 'c').map((s) => s.title), ['Soba c', 'Soba a']);
});

test('pickCardStrips bez naslovne sobe kreće od prve; bez traka je prazno', () => {
  assert.deepEqual(pickCardStrips([room('a', true), room('b', true)], null).map((s) => s.title), ['Soba a', 'Soba b']);
  assert.deepEqual(pickCardStrips([room('a', false)], 'a'), []);
});
