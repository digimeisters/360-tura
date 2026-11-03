import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_ROOM_NOTE_CHARS, MAX_TOUR_NOTES_CHARS, normalizeAiNotes } from './aiNotes.ts';

const ROOM_A = '6399133f-f9e3-455f-94fd-32262345dfee';
const ROOM_B = '62b7afdb-7b40-4857-9f49-9945d3524c81';

test('prazan ulaz daje prazne napomene', () => {
  assert.deepEqual(normalizeAiNotes(null), { notes: '', roomNotes: {} });
  assert.deepEqual(normalizeAiNotes(undefined), { notes: '', roomNotes: {} });
});

test('napomene ture se trimuju', () => {
  assert.equal(normalizeAiNotes({ notes: '  renovirano 2023 \n' }).notes, 'renovirano 2023');
});

test('predugačke napomene se seku', () => {
  assert.equal(normalizeAiNotes({ notes: 'a'.repeat(2500) }).notes.length, MAX_TOUR_NOTES_CHARS);
  assert.equal(MAX_TOUR_NOTES_CHARS, 2000);
  const r = normalizeAiNotes({ roomNotes: { [ROOM_A]: 'b'.repeat(800) } });
  assert.equal(r.roomNotes[ROOM_A].length, MAX_ROOM_NOTE_CHARS);
  assert.equal(MAX_ROOM_NOTE_CHARS, 500);
});

test('napomene soba: samo UUID ključevi i neprazan tekst', () => {
  const r = normalizeAiNotes({ roomNotes: { [ROOM_A]: '  klima ostaje ', abc: 'x', [ROOM_B]: '   ' } });
  assert.deepEqual(r.roomNotes, { [ROOM_A]: 'klima ostaje' });
});

test('roomNotes koji nije objekat postaje prazan', () => {
  assert.deepEqual(normalizeAiNotes({ roomNotes: 'nije objekat' }).roomNotes, {});
  assert.deepEqual(normalizeAiNotes({ roomNotes: ['x'] }).roomNotes, {});
});
