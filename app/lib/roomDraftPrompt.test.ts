import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDraftPrompt, buildRewritePrompt, buildTourPlanPrompt, clientAngle, mapPlanToRooms, type RoomContext } from './roomDraftPrompt.ts';

const ctx = (patch: Partial<RoomContext> = {}): RoomContext => ({
  listingType: 'rent',
  roomTitle: 'Kupatilo',
  facts: ['Floor: Prizemlje', 'Furnishing: Namešteno'],
  listingText: 'Svetao stan u prizemlju.',
  tourNotes: '',
  roomNote: '',
  previousRoomTitle: '',
  visitIndex: 1,
  otherRooms: [],
  ...patch
});

test('napomene vlasnika ulaze u uputstvo', () => {
  const p = buildDraftPrompt(ctx({ tourNotes: 'renovirano 2023', roomNote: 'klima ostaje' }));
  assert.ok(p.includes('renovirano 2023'));
  assert.ok(p.includes('klima ostaje'));
});

test('prethodna soba i plan ture', () => {
  assert.ok(buildDraftPrompt(ctx({ previousRoomTitle: 'Hodnik' })).includes('Hodnik'));
  const p = buildDraftPrompt(ctx(), { role: 'R1-uloga', transition: 'T1-prelaz', facts: ['F1-cinjenica'] });
  assert.ok(p.includes('R1-uloga') && p.includes('T1-prelaz') && p.includes('F1-cinjenica'));
});

test('u sobi nema cene, depozita ni parkinga iz podataka', () => {
  const p = buildDraftPrompt(ctx());
  assert.ok(!/^- (Price|Deposit|Parking)/m.test(p));
});

test('tri različita ugla po tipu oglasa', () => {
  const angles = new Set([clientAngle('sale'), clientAngle('rent'), clientAngle('booking')]);
  assert.equal(angles.size, 3);
  assert.ok(buildDraftPrompt(ctx({ listingType: 'sale' })).includes(clientAngle('sale')));
});

test('glas agenta i zabranjeni počeci su u uputstvu', () => {
  const p = buildDraftPrompt(ctx());
  assert.ok(p.includes('"vi"'));
  for (const o of ['Ovo je', 'Nalazimo se', 'Ovde je']) assert.ok(p.includes(o), o);
});

test('prepis nosi probleme i prethodni odgovor', () => {
  const p = buildRewritePrompt('BAZA', ['Uvod je prazan.'], { intro: 'x' });
  assert.ok(p.startsWith('BAZA') && p.includes('Uvod je prazan.') && p.includes('"intro":"x"'));
});


test('plan ture: sobe numerisane, i istog naziva', () => {
  const p = buildTourPlanPrompt({
    listingType: 'rent',
    facts: ['Floor: Prizemlje'],
    listingText: '',
    tourNotes: 'klima ostaje',
    rooms: [
      { title: 'Hodnik', note: '' },
      { title: 'Hodnik', note: 'novi parket' }
    ]
  });
  assert.ok(p.includes('1. Hodnik') && p.includes('2. Hodnik'));
  assert.ok(p.includes('klima ostaje') && p.includes('novi parket'));
  assert.ok(/money|lease|rules|parking|neighbourhood/i.test(p));
});

test('plan ture se mapira po rednom broju', () => {
  const raw = {
    rooms: [
      { n: 2, role: 'B', transition: 't', facts: ['f'] },
      { n: 1, role: 'A' },
      { n: 2, role: 'dupli' },
      { n: 9, role: 'x' }
    ]
  };
  assert.deepEqual(mapPlanToRooms(raw, ['id1', 'id2']), {
    id1: { role: 'A', transition: '', facts: [] },
    id2: { role: 'B', transition: 't', facts: ['f'] }
  });
  assert.deepEqual(mapPlanToRooms('smeće', ['id1']), {});
});

test('plan brojan od nule ili sa zabranjenim činjenicama', () => {
  assert.deepEqual(mapPlanToRooms({ rooms: [{ n: 0, role: 'A' }, { n: 1, role: 'B' }] }, ['id1', 'id2']), {});
  assert.deepEqual(mapPlanToRooms({ rooms: [{ n: 1, role: 'A', transition: '', facts: ['parking u garaži', 'Heating: Centralno'] }] }, ['id1']), {
    id1: { role: 'A', transition: '', facts: ['Heating: Centralno'] }
  });
});
