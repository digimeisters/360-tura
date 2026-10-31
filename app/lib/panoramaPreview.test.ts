import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { CARD_STRIP_WIDTH, cardStripKey, makeCardStrip } from './panoramaPreview.ts';

test('cardStripKey stoji pored panorame, bez obzira na ekstenziju', () => {
  assert.equal(cardStripKey('maglicka/abc-panorama.webp'), 'maglicka/abc-strip.webp');
  assert.equal(cardStripKey('maglicka/abc-panorama.jpg'), 'maglicka/abc-strip.webp');
  assert.equal(cardStripKey('abc-panorama.JPEG'), 'abc-strip.webp');
});

async function panorama(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 120, g: 140, b: 160 } } }).jpeg().toBuffer();
}

test('makeCardStrip: pojas oko horizonta, pune širine, 2400px', async () => {
  const strip = await makeCardStrip(await panorama(8000, 4000));
  const meta = await sharp(strip).metadata();
  assert.equal(meta.format, 'webp');
  assert.equal(meta.width, CARD_STRIP_WIDTH);
  // 70° od 180° visine: 2400 × (4000/8000) × 70/180 ≈ 467
  assert.equal(meta.height, 467);
});

test('makeCardStrip ne povećava usku panoramu', async () => {
  const meta = await sharp(await makeCardStrip(await panorama(2000, 1000))).metadata();
  assert.equal(meta.width, 2000);
  assert.equal(meta.height, 389);
});
