import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeFilterCount, EMPTY_FILTERS, hasAnyFilter, matchesFilters, sortUnits, type UnitFilters } from './unitFilters.ts';
import type { SelectorUnit } from '../../components/projekat/ProjectSelector';

const unit = (over: Partial<SelectorUnit>): SelectorUnit =>
  ({ id: over.code ?? 'x', code: 'x', floorId: 'f1', structure: null, areaSqm: null, terraceSqm: null, price: null, status: 'available', ...over }) as SelectorUnit;
const levels: Record<string, number> = { f0: 0, f1: 1, f2: 2 };
const levelOf = (u: SelectorUnit) => levels[u.floorId] ?? 0;
const f = (over: Partial<UnitFilters>): UnitFilters => ({ ...EMPTY_FILTERS, ...over });

test('bez filtera prolaze svi stanovi', () => {
  assert.equal(matchesFilters(unit({ status: 'sold' }), EMPTY_FILTERS, levelOf), true);
  assert.equal(hasAnyFilter(EMPTY_FILTERS), false);
  assert.equal(activeFilterCount(EMPTY_FILTERS, true), 0);
});

test('cena do: bez cene i prodati ne prolaze', () => {
  const max = f({ maxPrice: 100_000 });
  assert.equal(matchesFilters(unit({ price: 90_000 }), max, levelOf), true);
  assert.equal(matchesFilters(unit({ price: 110_000 }), max, levelOf), false);
  assert.equal(matchesFilters(unit({ price: null }), max, levelOf), false);
  assert.equal(matchesFilters(unit({ price: 90_000, status: 'sold' }), max, levelOf), false);
});

test('sprat, kvadratura, strukture i statusi', () => {
  assert.equal(matchesFilters(unit({ floorId: 'f2' }), f({ floorRange: [0, 1] }), levelOf), false);
  assert.equal(matchesFilters(unit({ floorId: 'f1' }), f({ floorRange: [0, 1] }), levelOf), true);
  assert.equal(matchesFilters(unit({ areaSqm: 55 }), f({ areaRange: [50, 60], minArea: 50 }), levelOf), true);
  assert.equal(matchesFilters(unit({ areaSqm: null }), f({ minArea: 50 }), levelOf), false);
  assert.equal(matchesFilters(unit({ structure: 'dvosoban' }), f({ rooms: ['trosoban'] }), levelOf), false);
  assert.equal(matchesFilters(unit({ structure: 'dvosoban' }), f({ structure: 'dvosoban', rooms: ['dvosoban'] }), levelOf), true);
  assert.equal(matchesFilters(unit({ status: 'reserved' }), f({ statuses: ['available'] }), levelOf), false);
  assert.equal(matchesFilters(unit({ status: 'reserved' }), f({ onlyFree: true }), levelOf), false);
});

test('broj aktivnih filtera: sprat i lamela liste se broje samo u listi', () => {
  const all = f({ structure: 'a', maxPrice: 1, onlyFree: true, rooms: ['a', 'b'], listFloor: 2, listBuilding: 'b1' });
  assert.equal(activeFilterCount(all, false), 4);
  assert.equal(activeFilterCount(all, true), 6);
  assert.equal(hasAnyFilter(f({ listFloor: 2 })), false);
  assert.equal(hasAnyFilter(f({ rooms: ['a'] })), true);
});

test('sortiranje: po spratu, isti sprat po oznaci (brojevi prirodno)', () => {
  const list = [unit({ code: '10', floorId: 'f1' }), unit({ code: '2', floorId: 'f1' }), unit({ code: '1', floorId: 'f2' })];
  const floorLevel = (u: SelectorUnit) => levelOf(u);
  const codes = (s: Parameters<typeof sortUnits>[1]) => sortUnits(list, s, { levelOf: floorLevel, buildingOf: () => '' }).map((u) => u.code);
  assert.deepEqual(codes({ key: 'floor', dir: 1 }), ['2', '10', '1']);
  assert.deepEqual(codes({ key: 'floor', dir: -1 }), ['1', '2', '10']);
});

test('sortiranje po ceni: bez cene i prodati idu na kraj', () => {
  const list = [unit({ code: 'a', price: null }), unit({ code: 'b', price: 50, status: 'sold' }), unit({ code: 'c', price: 80 }), unit({ code: 'd', price: 70 })];
  const sorted = sortUnits(list, { key: 'price', dir: 1 }, { levelOf, buildingOf: () => '' }).map((u) => u.code);
  assert.deepEqual(sorted, ['d', 'c', 'a', 'b']);
});
