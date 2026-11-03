import { test } from 'node:test';
import assert from 'node:assert/strict';
import { breadcrumbJsonLd, packagesJsonLd } from './serviceJsonLd.ts';
import { displayPackagePrice } from './pricing.ts';
import { SITE_URL } from './site.ts';

const DURING = new Date('2026-11-03T12:00:00Z');
const AFTER = new Date('2026-11-20T12:00:00Z');

const offers = (now: Date) => packagesJsonLd(now).hasOfferCatalog.itemListElement;

test('za vreme promocije cena je promo cena sa rokom važenja', () => {
  const [basic, premium] = offers(DURING);
  assert.equal(basic.price, displayPackagePrice(1, 'basic', 'sr', true));
  assert.equal(premium.price, displayPackagePrice(1, 'premium', 'sr', true));
  assert.equal(basic.priceCurrency, 'RSD');
  assert.equal(basic.priceValidUntil, '2026-11-16');
});

test('posle promocije redovna cena, bez roka važenja', () => {
  const [basic, premium] = offers(AFTER);
  assert.equal(basic.price, displayPackagePrice(1, 'basic', 'sr', false));
  assert.equal(premium.price, displayPackagePrice(1, 'premium', 'sr', false));
  assert.equal('priceValidUntil' in basic, false);
});

test('Premium je skuplji od Osnovnog, oba vode na /cenovnik', () => {
  const [basic, premium] = offers(AFTER);
  assert.ok(premium.price > basic.price);
  assert.equal(basic.url, `${SITE_URL}/cenovnik`);
  assert.deepEqual([basic.name, premium.name], ['Osnovni', 'Premium']);
});

test('usluga upućuje na firmu sa početne', () => {
  assert.deepEqual(packagesJsonLd(AFTER).provider, { '@id': `${SITE_URL}/#business` });
});

test('putanja: početna pa strana', () => {
  const b = breadcrumbJsonLd('Cenovnik', '/cenovnik');
  assert.deepEqual(
    b.itemListElement.map((i) => [i.position, i.name, i.item]),
    [
      [1, 'Kvadrat360', SITE_URL],
      [2, 'Cenovnik', `${SITE_URL}/cenovnik`]
    ]
  );
});
