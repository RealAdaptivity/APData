import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DTC_ENTRIES, DTC_LIBRARY } from '../src/data/dtcLibrary.ts';
import { MAKE_DTC_ENTRIES, makeEntriesFor } from '../src/data/dtcMakeCodes.ts';
import { FAULTS, faultById, faultsForCode, searchFaults } from '../src/data/faults.ts';
import { componentById } from '../src/data/locations.ts';
import { ARTICLE_BY_SLUG } from '../src/data/articles.ts';
import { SYSTEMS } from '../src/data/systems.ts';
import { allEntries, isMakeEntry, lookupCode, searchCodes } from '../src/lib/dtc.ts';

const SYS = new Set(SYSTEMS.map((s) => s.id));
const CODE = /^[PBCU][0-3][0-9A-F]{3}$/;

test('generic library has no duplicate codes and now covers B, C and U', () => {
  assert.equal(DTC_LIBRARY.size, DTC_ENTRIES.length, 'duplicate generic code');
  const letters = new Set(DTC_ENTRIES.map((e) => e.code[0]));
  for (const l of ['P', 'B', 'C', 'U']) assert.ok(letters.has(l), `has ${l} codes`);
  assert.ok(DTC_ENTRIES.filter((e) => e.code[0] === 'U').length >= 40);
});

test('make-specific codes are complete and unique per make', () => {
  const seen = new Set<string>();
  for (const e of MAKE_DTC_ENTRIES) {
    assert.match(e.code, CODE);
    assert.ok(SYS.has(e.system), `${e.code} system`);
    assert.ok(e.causes.length && e.checks.length && e.meaning.length > 30, `${e.code} ${e.makeLabel} content`);
    for (const m of e.makes) {
      const k = `${e.code}|${m}`;
      assert.ok(!seen.has(k), `duplicate ${k}`);
      seen.add(k);
    }
    for (const a of e.articles ?? []) assert.ok(ARTICLE_BY_SLUG.has(a), `${e.code} article ${a}`);
  }
  assert.ok(MAKE_DTC_ENTRIES.length >= 60);
});

test('the vehicle’s make picks the meaning', () => {
  assert.equal(lookupCode('C1145', 'Ford')?.title, 'Right Front Wheel Speed Sensor Input Circuit Failure');
  assert.ok(isMakeEntry(lookupCode('C1145', 'Lincoln')));
  assert.equal(lookupCode('C1145', 'Toyota'), null, 'no Toyota meaning for a Ford code');
  assert.equal(lookupCode('C1203', 'Toyota')?.title, 'ECM Communication Circuit Malfunction');
  assert.equal(lookupCode('C1203', 'Kia')?.title, 'Wheel Speed Sensor Front-Right Open/Short');
  assert.equal(makeEntriesFor('C1203').length, 2);
  assert.equal(lookupCode('U0121', 'Ford')?.title, 'Lost Communication With Anti-Lock Brake System (ABS) Control Module', 'generic codes still answer');
  assert.equal(lookupCode('C0035')?.code, 'C0035');
});

test('code search covers make codes, limited to the vehicle’s make when known', () => {
  assert.ok(searchCodes('C1', 200, 'Ford').every((e) => !isMakeEntry(e) || e.makes.includes('ford')));
  assert.ok(searchCodes('C1', 200).some((e) => isMakeEntry(e) && e.makes.includes('toyota')));
  assert.ok(searchCodes('wheel speed', 50, 'Ford').some((e) => e.code === 'C1145'));
  assert.equal(searchCodes('C1203').length, 2, 'every make’s meaning without a vehicle');
  assert.ok(allEntries('Ford').length < allEntries().length);
});

test('faults are complete and link to things that exist', () => {
  const ids = new Set<string>();
  for (const f of FAULTS) {
    assert.ok(!ids.has(f.id), `duplicate ${f.id}`);
    ids.add(f.id);
    assert.ok(SYS.has(f.system), `${f.id} system`);
    assert.ok(f.complaints.length && f.causes.length >= 2 && f.checks.length >= 2, `${f.id} content`);
    for (const c of f.codes ?? []) assert.ok(DTC_LIBRARY.has(c) || makeEntriesFor(c).length > 0, `${f.id} code ${c}`);
    for (const l of f.locations ?? []) assert.ok(componentById(l), `${f.id} location ${l}`);
    for (const a of f.articles ?? []) assert.ok(ARTICLE_BY_SLUG.has(a), `${f.id} article ${a}`);
  }
  assert.ok(FAULTS.length >= 35);
});

test('fault search and code links', () => {
  assert.equal(searchFaults('abs light')[0].id, 'abs-light-on');
  assert.equal(searchFaults('pulls right')[0].id, 'pulls-drifts');
  assert.equal(searchFaults('dead every morning')[0].id, 'battery-drain');
  assert.equal(searchFaults('clunk')[0].id, 'clunk-bumps', 'a title hit ranks first');
  assert.equal(searchFaults('').length, FAULTS.length);
  assert.ok(faultsForCode('C1145').some((f) => f.id === 'abs-light-on'));
  assert.equal(faultById('nope'), null);
});
