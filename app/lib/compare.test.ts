import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanSlugs, compareHref, keepKnown, parseCompareParam, readCompare, removeSlug, toggleSlug, writeCompare } from './compare.ts';

test('toggle dodaje i skida', () => {
  assert.deepEqual(toggleSlug([], 'a').slugs, ['a']);
  assert.deepEqual(toggleSlug(['a'], 'a').slugs, []);
});

test('peta se ne dodaje', () => {
  const r = toggleSlug(['a', 'b', 'c', 'd'], 'e');
  assert.equal(r.full, true);
  assert.deepEqual(r.slugs, ['a', 'b', 'c', 'd']);
});

test('removeSlug', () => {
  assert.deepEqual(removeSlug(['a', 'b'], 'a'), ['b']);
  assert.deepEqual(removeSlug(['a'], 'x'), ['a']);
});

test('cleanSlugs: duplikati, loši slugovi, najviše 4', () => {
  assert.deepEqual(cleanSlugs(['a', 'a', 'B!', '', 'b', 'c', 'd', 'e', 5]), ['a', 'b', 'c', 'd']);
  assert.deepEqual(cleanSlugs('a'), []);
});

test('parseCompareParam i compareHref', () => {
  assert.deepEqual(parseCompareParam('stan-a,stan-b,,stan-a'), ['stan-a', 'stan-b']);
  assert.deepEqual(parseCompareParam(undefined), []);
  assert.equal(compareHref(['x', 'y']), '/ture/uporedi?t=x,y');
  assert.equal(compareHref([]), '/ture/uporedi');
});

test('readCompare/writeCompare podnose kvar i null', () => {
  assert.deepEqual(readCompare(null), []);
  assert.deepEqual(readCompare({ getItem: () => '{nije json' }), []);
  assert.deepEqual(readCompare({ getItem: () => { throw new Error('blokirano'); } }), []);
  assert.doesNotThrow(() => writeCompare({ setItem: () => { throw new Error('pun'); } }, ['a']));
  let saved = '';
  writeCompare({ setItem: (_k: string, v: string) => { saved = v; } }, ['a']);
  assert.deepEqual(readCompare({ getItem: () => saved }), ['a']);
});

test('keepKnown izbacuje ture kojih više nema na listi', () => {
  assert.deepEqual(keepKnown(['a', 'x', 'b'], ['a', 'b', 'c']), ['a', 'b']);
  assert.deepEqual(keepKnown([], ['a']), []);
});
