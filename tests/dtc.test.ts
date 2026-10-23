import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DTC_ENTRIES, DTC_LIBRARY } from '../src/data/dtcLibrary.ts';
import { ARTICLE_BY_SLUG } from '../src/data/articles.ts';
import { isSystemId } from '../src/data/systems.ts';
import { describeCode, isCode, lookupCode, normalizeCode, parseCodes, searchCodes } from '../src/lib/dtc.ts';

test('every library code is unique, well formed and complete', () => {
  assert.equal(DTC_LIBRARY.size, DTC_ENTRIES.length, 'duplicate codes in the library');
  assert.ok(DTC_ENTRIES.length >= 250, `expected a full library, got ${DTC_ENTRIES.length}`);
  for (const e of DTC_ENTRIES) {
    assert.ok(isCode(e.code), `${e.code} is not a code`);
    assert.ok(e.title.length > 5, `${e.code} has no title`);
    assert.ok(e.meaning.length > 40, `${e.code} has no meaning`);
    assert.ok(e.causes.length >= 1, `${e.code} lists no causes`);
    assert.ok(e.checks.length >= 1, `${e.code} lists no checks`);
    assert.ok(isSystemId(e.system), `${e.code} has unknown system ${e.system}`);
    assert.ok(!e.title.includes('undefined') && !e.meaning.includes('undefined'), `${e.code} text has a hole`);
  }
});

test('related codes and articles all exist', () => {
  for (const e of DTC_ENTRIES) {
    for (const r of e.related ?? []) assert.ok(DTC_LIBRARY.has(r), `${e.code} links to missing code ${r}`);
    assert.ok(!(e.related ?? []).includes(e.code), `${e.code} lists itself as related`);
    for (const a of e.articles ?? []) assert.ok(ARTICLE_BY_SLUG.has(a), `${e.code} links to missing article ${a}`);
  }
});

test('families get the right wording', () => {
  assert.equal(lookupCode('P0302')?.title, 'Cylinder 2 Misfire Detected');
  assert.equal(lookupCode('P0312')?.title, 'Cylinder 12 Misfire Detected');
  assert.equal(lookupCode('P0730')?.title, 'Incorrect Gear Ratio');
  assert.equal(lookupCode('P0736')?.title, 'Reverse Incorrect Ratio');
  assert.equal(lookupCode('P0135')?.title, 'O2 Sensor Heater Circuit (Bank 1 Sensor 1)');
  assert.equal(lookupCode('P0420')?.title, 'Catalyst System Efficiency Below Threshold (Bank 1)');
  assert.match(lookupCode('P0210')?.symptoms[0] ?? '', /P0310/);
  assert.match(lookupCode('P0117')?.meaning ?? '', /HOT/, 'a thermistor reading low voltage reads hot');
  assert.match(lookupCode('P0118')?.meaning ?? '', /COLD/);
  assert.ok(lookupCode('P0327')?.checks.some((c) => /torqued/.test(c)), 'knock sensors get knock-sensor checks');
  assert.ok(!lookupCode('P0327')?.checks.some((c) => /reluctor/.test(c)), 'not crank-sensor checks');
});

test('codes are read the way a scan report writes them', () => {
  assert.equal(normalizeCode(' p0300 '), 'P0300');
  assert.equal(normalizeCode('P0300-00'), 'P0300');
  assert.equal(normalizeCode('U0100:87'), 'U0100');
  assert.equal(normalizeCode('P0A80'), 'P0A80');
  assert.equal(normalizeCode('P4300'), null, 'second character is 0–3');
  assert.equal(normalizeCode('P030'), null);
  assert.deepEqual(parseCodes('Scan: p0301 Cyl1 misfire, P0171-00, U0100:87, P0301 again'), ['P0301', 'P0171', 'U0100']);
  assert.deepEqual(parseCodes(''), []);
});

test('any code explains itself even outside the library', () => {
  assert.equal(describeCode('P1450')?.scope, 'manufacturer');
  assert.equal(describeCode('P0455')?.scope, 'generic');
  assert.equal(describeCode('P2135')?.scope, 'generic');
  assert.equal(describeCode('P3000')?.scope, 'manufacturer');
  assert.equal(describeCode('P3400')?.scope, 'generic');
  assert.equal(describeCode('B1318')?.scope, 'manufacturer');
  assert.equal(describeCode('U0121')?.group, 'Lost communication with a module');
  assert.match(describeCode('P0301')?.group ?? '', /misfire/i);
  assert.equal(describeCode('nope'), null);
});

test('library search finds codes, families and words', () => {
  assert.deepEqual(searchCodes('p0420').map((e) => e.code), ['P0420']);
  assert.ok(searchCodes('P03').every((e) => e.code.startsWith('P03')));
  assert.ok(searchCodes('P03').length > 20);
  const evap = searchCodes('evap leak').map((e) => e.code);
  assert.ok(evap.includes('P0442') && evap.includes('P0455'));
  assert.deepEqual(searchCodes('   '), []);
});
