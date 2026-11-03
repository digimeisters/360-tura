import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyNarrationOverrides, isOffLimitsFact, isPlaceholderTitle, previousInVisit, roomFactsFromTour, stripOffLimits, visitOrder } from './roomAiContext.ts';

test('činjenice o nekretnini za sobu', () => {
  const facts = roomFactsFromTour({ structure: 'Dvosoban', floor: 'Prizemlje', has_elevator: 'Da', finish_status: 'Namešteno' });
  assert.ok(facts.includes('Floor: Prizemlje'));
  assert.ok(facts.includes('Elevator in building: Da'));
  assert.ok(facts.includes('Furnishing: Namešteno'));
  assert.ok(facts.includes('Structure: Dvosoban'));
  assert.ok(!facts.some((f) => /parking|price|deposit|registration/i.test(f)));
});

test('prazne vrednosti se preskaču', () => {
  assert.deepEqual(roomFactsFromTour({ floor: null, city: '  ', heating: undefined, area_sqm: null }), []);
  assert.deepEqual(roomFactsFromTour({ area_sqm: 54 }), ['Total area (whole property, m²): 54']);
});

const rooms = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `r${i + 1}`, order_index: i + 1 }));

test('red obilaska prati vodič, pa ostale sobe po redu', () => {
  assert.deepEqual(visitOrder('8,5,8,4,8,9,1', rooms(9)), {
    ids: ['r8', 'r5', 'r4', 'r9', 'r1', 'r2', 'r3', 'r6', 'r7'],
    fromGuide: true
  });
});

test('vodič sa nepostojećom sobom i smećem', () => {
  assert.deepEqual(visitOrder('3,99,abc,3', rooms(4)), { ids: ['r3', 'r1', 'r2', 'r4'], fromGuide: true });
  assert.deepEqual(visitOrder('99,abc', rooms(2)), { ids: ['r1', 'r2'], fromGuide: false });
});

test('bez vodiča red je po order_index', () => {
  assert.deepEqual(
    visitOrder(null, [
      { id: 'b', order_index: 2 },
      { id: 'a', order_index: 1 }
    ]),
    { ids: ['a', 'b'], fromGuide: false }
  );
});

test('prethodna soba u obilasku', () => {
  assert.equal(previousInVisit(['a', 'b', 'c'], 'a'), null);
  assert.equal(previousInVisit(['a', 'b', 'c'], 'c'), 'b');
  assert.equal(previousInVisit(['a', 'b', 'c'], 'x'), null);
});

test('iz opisa oglasa ispadaju cena, uslovi, parking i uknjiženost', () => {
  const text = 'Svetao stan u prizemlju. Cena 85.000 €, parking mesto u garaži. Uknjižen. Kirija 270 eura, depozit jedna kirija! Nova kuhinja 2023.';
  assert.equal(stripOffLimits(text), 'Svetao stan u prizemlju. Nova kuhinja 2023.');
  assert.equal(stripOffLimits(''), '');
});

test('činjenica iz plana koja ne sme u sobu', () => {
  assert.equal(isOffLimitsFact('parking u garaži'), true);
  assert.equal(isOffLimitsFact('Monthly costs about 110 EUR'), true);
  assert.equal(isOffLimitsFact('No pets allowed'), true);
  assert.equal(isOffLimitsFact('Heating: Centralno grejanje'), false);
});

test('privremeni nazivi soba', () => {
  for (const t of ['Soba 3', 'Nova soba', 'room 2', '']) assert.equal(isPlaceholderTitle(t), true, t);
  assert.equal(isPlaceholderTitle('Kupatilo'), false);
});

test('nacrti iz iste serije menjaju staru naraciju', () => {
  const rooms = [
    { id: 'a', title: 'Soba 1', narration: 'staro A' },
    { id: 'b', title: 'Kuhinja', narration: 'staro B' }
  ];
  assert.deepEqual(applyNarrationOverrides(rooms, { a: { title: 'Hodnik', narration: 'novo A' } }), [
    { id: 'a', title: 'Hodnik', narration: 'novo A' },
    { id: 'b', title: 'Kuhinja', narration: 'staro B' }
  ]);
});
