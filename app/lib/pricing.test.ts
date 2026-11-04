import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayPackagePrice, displayPerProperty, displayHdrPrice, PRICE_TIERS, standaloneHdrPrice, toRSD } from './pricing.ts';

// Cenovnik od 4. 11. 2026 (vlasnik): Osnovni = samo tura, Premium = tura +
// HDR fotografije + sve ostalo; HDR ista cena na svakom obimu.
const counts = [1, 3, 5, 10];

test('Osnovni je samo tura, po obimu (din.)', () => {
  assert.deepEqual(counts.map((n) => displayPerProperty(PRICE_TIERS[counts.indexOf(n)], 'basic', 'sr')), [6000, 5500, 4500, 4000]);
});

test('Premium je tura + HDR, po obimu (din.)', () => {
  assert.deepEqual(counts.map((n, i) => displayPerProperty(PRICE_TIERS[i], 'premium', 'sr')), [8500, 8000, 7000, 6500]);
});

test('promo cene (−30%, zaokruženo na 100 po stavci)', () => {
  assert.deepEqual(counts.map((_, i) => displayPerProperty(PRICE_TIERS[i], 'basic', 'sr', true)), [4200, 3900, 3200, 2800]);
  assert.deepEqual(counts.map((_, i) => displayPerProperty(PRICE_TIERS[i], 'premium', 'sr', true)), [6000, 5700, 5000, 4600]);
});

test('HDR je ista cena na svakom obimu, a sam se ne popušta', () => {
  assert.deepEqual(PRICE_TIERS.map((t) => toRSD(standaloneHdrPrice(t))), [2500, 2500, 2500, 2500]);
  assert.deepEqual(PRICE_TIERS.map((t) => displayHdrPrice(t, 'sr')), [2500, 2500, 2500, 2500]);
});

test('engleske cene u evrima', () => {
  assert.deepEqual(PRICE_TIERS.map((t) => displayPerProperty(t, 'basic', 'en')), [50, 44, 39, 34]);
  assert.deepEqual(PRICE_TIERS.map((t) => displayPerProperty(t, 'premium', 'en')), [70, 64, 59, 54]);
});

test('ukupno za više nekretnina koristi stepen obima', () => {
  assert.equal(displayPackagePrice(1, 'premium', 'sr'), 8500);
  assert.equal(displayPackagePrice(3, 'basic', 'sr'), 3 * 5500);
});
