import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.REPORT_LINK_SECRET = 'test-secret';
const { liveGuideToken, isLiveGuideToken, newLiveCode } = await import('./liveGuide.ts');

test('token je stabilan i dug 24 znaka', () => {
  assert.equal(liveGuideToken('stan-a'), liveGuideToken('stan-a'));
  assert.match(liveGuideToken('stan-a'), /^[A-Za-z0-9_-]{24}$/);
});

test('token jedne ture ne važi za drugu', () => {
  assert.equal(isLiveGuideToken('stan-a', liveGuideToken('stan-a')), true);
  assert.equal(isLiveGuideToken('stan-b', liveGuideToken('stan-a')), false);
});

test('loš ili prazan token ne prolazi i ne baca', () => {
  assert.equal(isLiveGuideToken('stan-a', ''), false);
  assert.equal(isLiveGuideToken('stan-a', 'x'.repeat(24)), false);
  assert.equal(isLiveGuideToken('stan-a', 'kratko'), false);
});

test('kod ima 6 znakova iz dozvoljenog alfabeta', () => {
  for (let i = 0; i < 200; i++) assert.match(newLiveCode(), /^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6}$/);
});
