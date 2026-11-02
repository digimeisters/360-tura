import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'crypto';

process.env.REPORT_LINK_SECRET = 'test-secret';
delete process.env.VALUATION_LINK_SECRET;
const { signLink, checkLinkSignature } = await import('./signedLink.ts');
const { liveGuideToken } = await import('./liveGuide.ts');
const { projectPreviewToken, isValidPreviewToken } = await import('./projectPreview.ts');
const { callbackToken, verifyCallbackToken } = await import('./valuation/callbackToken.ts');

// Potpis kakav su linkovi imali pre zajedničkog modula - poslati linkovi
// (izveštaji, odjava, vođenje) moraju i dalje da važe.
const legacy = (message: string, length: number, key = 'test-secret') =>
  createHmac('sha256', key).update(message).digest('base64url').slice(0, length);

test('potpis je isti kao pre (24 znaka podrazumevano)', () => {
  for (const message of ['agency-report:Agencija Dom', 'project-report:abc', 'unit-watch:x', 'live-guide:stan-a']) {
    assert.equal(signLink(message), legacy(message, 24));
  }
  assert.equal(signLink('valuation-callback:1', { length: 32 }), legacy('valuation-callback:1', 32));
});

test('poseban ključ ima prednost, bez njega važi zajednički', () => {
  assert.equal(signLink('m', { preferredKey: 'drugi' }), legacy('m', 24, 'drugi'));
  assert.equal(signLink('m', { preferredKey: undefined }), legacy('m', 24));
});

test('provera prihvata tačan potpis, a odbija tuđ, kratak i prazan', () => {
  assert.equal(checkLinkSignature('live-guide:a', signLink('live-guide:a')), true);
  assert.equal(checkLinkSignature('live-guide:b', signLink('live-guide:a')), false);
  assert.equal(checkLinkSignature('live-guide:a', 'kratko'), false);
  assert.equal(checkLinkSignature('live-guide:a', ''), false);
});

test('bez ijednog ključa baca grešku umesto da potpiše praznim', () => {
  const saved = { r: process.env.REPORT_LINK_SECRET, s: process.env.SUPABASE_SERVICE_ROLE_KEY };
  delete process.env.REPORT_LINK_SECRET;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    assert.throws(() => signLink('m'));
  } finally {
    process.env.REPORT_LINK_SECRET = saved.r;
    if (saved.s !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = saved.s;
  }
});

test('postojeći linkovi daju iste tokene kao pre', () => {
  assert.equal(liveGuideToken('stan-a'), legacy('live-guide:stan-a', 24));
  const now = 1_700_000_000_000;
  const expires = now + 30 * 24 * 60 * 60 * 1000;
  assert.equal(projectPreviewToken('p1', now), `${expires.toString(36)}.${legacy(`project-preview:p1:${expires}`, 24)}`);
  assert.equal(isValidPreviewToken('p1', projectPreviewToken('p1', now), now), true);
  assert.equal(isValidPreviewToken('p2', projectPreviewToken('p1', now), now), false);
  assert.equal(callbackToken('lead-1'), legacy('valuation-callback:lead-1', 32));
  assert.equal(verifyCallbackToken('lead-1', callbackToken('lead-1')), true);
});
