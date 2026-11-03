import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkDraftField, checkRoomDraft, type DraftForCheck } from './roomDraftRules.ts';

const clean: DraftForCheck = {
  title: 'Kupatilo',
  narrationIntro: 'Iz hodnika ulazite u kupatilo sa kadom.',
  narrationDetail: 'Mašina za veš je pored kade, pa veš perete bez nošenja kroz stan.',
  waypoints: [{ title: 'Bojler', text: 'Bojler je iznad kade, na zidu.' }]
};
const has = (problems: string[], word: string) => problems.some((p) => p.toLowerCase().includes(word));

test('čist nacrt nema problema', () => {
  assert.deepEqual(checkRoomDraft(clean, []), []);
});

test('rečenica-definicija', () => {
  const p = checkRoomDraft({ ...clean, narrationIntro: 'Kupatilo je centralno mesto za higijenu.' }, []);
  assert.ok(has(p, 'definicij'), p.join(' | '));
});

test('zabranjeni počeci', () => {
  assert.ok(has(checkRoomDraft({ ...clean, narrationIntro: 'Ovo je kuhinja sa trpezarijom.' }, []), 'počet'));
  assert.ok(has(checkRoomDraft({ ...clean, narrationIntro: 'Nalazimo se u kuhinji.' }, []), 'počet'));
  const p = checkRoomDraft({ ...clean, title: 'Kuhinja', narrationIntro: 'Kuhinja je otvorena ka trpezariji.' }, []);
  assert.ok(has(p, 'počet'), p.join(' | '));
});

test('prazne pohvale, i višerečne', () => {
  assert.ok(has(checkRoomDraft({ ...clean, narrationDetail: 'Prostrana soba sa velikim prozorom.' }, []), 'pohval'));
  assert.ok(has(checkRoomDraft({ ...clean, narrationDetail: 'Kuhinja je potpuno opremljena.' }, []), 'pohval'));
  assert.ok(checkDraftField('detail', 'Kuhinja je potpuno opremljena.').warnings.some((w) => w.includes('pohval')));
});

test('pohvala se traži od početka reči', () => {
  assert.deepEqual(checkRoomDraft({ ...clean, narrationDetail: 'Multifunkcionalna polica stoji pored kade.' }, []), []);
});

test('prazan deo naracije', () => {
  assert.ok(has(checkRoomDraft({ ...clean, narrationDetail: '  ' }, []), 'prazan'));
});

test('tačka bez naziva', () => {
  assert.ok(has(checkRoomDraft({ ...clean, waypoints: [{ title: '', text: 'Bojler je iznad kade.' }] }, []), 'naziv'));
});

test('predugačak uvod', () => {
  assert.ok(has(checkRoomDraft({ ...clean, narrationIntro: 'a'.repeat(141) }, []), 'dug'));
});

test('isti početak kao druga soba, prazne naracije se ne broje', () => {
  const p = checkRoomDraft({ ...clean, narrationIntro: 'Iz hodnika ulazite u kupatilo.' }, ['Iz hodnika ulazite u spavaću sobu.']);
  assert.ok(has(p, 'isti početak'), p.join(' | '));
  assert.deepEqual(checkRoomDraft(clean, ['', '  ']), []);
});

test('počeci se gledaju do kraja reči', () => {
  assert.deepEqual(checkRoomDraft({ ...clean, narrationIntro: 'Ovde jednostavno vidite celu kuhinju.' }, []), []);
  assert.deepEqual(checkRoomDraft({ ...clean, title: 'Kuhinja', narrationIntro: 'Kuhinja jednostavnih linija gleda ka prozoru.' }, []), []);
});

test('"služi za" u tački nije definicija sobe', () => {
  assert.deepEqual(checkRoomDraft({ ...clean, waypoints: [{ title: 'Polica', text: 'Polica služi za obuću.' }] }, []), []);
});
