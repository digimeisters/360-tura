import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isOverloadError, OVERLOAD_PAUSE_MS } from './aiOverload.ts';

test('preopterećen model se prepoznaje', () => {
  assert.equal(isOverloadError('{"error":{"code":503,"message":"This model is currently experiencing high demand."}}'), true);
  assert.equal(isOverloadError('Rate limit 429'), true);
  assert.equal(isOverloadError('Model overloaded'), true);
});

test('obična greška nije preopterećenje', () => {
  assert.equal(isOverloadError('Soba nema panoramu.'), false);
  assert.equal(isOverloadError(''), false);
});

test('pauza je 8 sekundi', () => {
  assert.equal(OVERLOAD_PAUSE_MS, 8000);
});
