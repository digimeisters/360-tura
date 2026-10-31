import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tidyBody } from './adTextTidy.ts';

test('oglasni sajt: heštegovi se uklanjaju, pasusi ostaju', () => {
  const out = tidyBody('Izdaje se stan.\n\nProšetajte kroz stan:\nhttps://x.rs/t\n\n#kragujevac #stan', '4zida');
  assert.equal(out, 'Izdaje se stan.\n\nProšetajte kroz stan:\nhttps://x.rs/t');
});

test('Instagram: blok teksta se deli po rečenicama, heštegovi na kraju', () => {
  const out = tidyBody('Izdaje se stan od 54 m2. Ima terasu. Link je u opisu profila. #Kragujevac #stan', 'instagram');
  assert.equal(out, 'Izdaje se stan od 54 m2.\nIma terasu.\nLink je u opisu profila.\n\n#Kragujevac #stan');
});

test('Facebook: URL u svom redu, najviše 2 hešteg', () => {
  const out = tidyBody('Izdaje se stan. Pogledajte turu: https://x.rs/t?utm_source=facebook #a #b #c', 'facebook');
  assert.equal(out, 'Izdaje se stan.\nPogledajte turu:\nhttps://x.rs/t?utm_source=facebook\n\n#a #b');
});
