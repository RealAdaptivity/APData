import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENT_LABOR, COMPONENT_OPERATION, COMPONENT_TESTS, TEST_KIND_LABEL, searchTests, testsForComponent } from '../src/data/componentTests.ts';
import { COMPONENT_LOCATIONS, componentById } from '../src/data/locations.ts';
import { ARTICLE_BY_SLUG } from '../src/data/articles.ts';
import { LABOR_JOB_BY_CODE } from '../src/data/laborJobs.ts';
import { causeKey, mileageBuckets, bucketLabel, topRepairs } from '../src/lib/topRepairs.ts';
import { cleanPins, colorWords, pinOrder, pinoutMatches, readPins, validatePinout, emptyPin } from '../src/lib/pinouts.ts';

test('every guided test is complete and points at real components and articles', () => {
  const ids = new Set<string>();
  for (const t of COMPONENT_TESTS) {
    assert.ok(!ids.has(t.id), `duplicate ${t.id}`);
    ids.add(t.id);
    assert.ok(TEST_KIND_LABEL[t.kind], t.id);
    assert.ok(t.components.length, `${t.id} covers a component`);
    for (const c of t.components) assert.ok(componentById(c), `${t.id}: unknown component ${c}`);
    assert.ok(t.pins.length && t.steps.length >= 2 && t.tools.length, `${t.id} has pins, steps and tools`);
    for (const s of t.steps) assert.ok(s.title && s.how && s.good, `${t.id}: step ${s.title}`);
    for (const a of t.articles ?? []) assert.ok(ARTICLE_BY_SLUG.get(a), `${t.id}: unknown article ${a}`);
  }
});

test('every component says how it works and has a guided test', () => {
  for (const c of COMPONENT_LOCATIONS) {
    assert.ok(COMPONENT_OPERATION[c.id]?.length > 40, `${c.id} has an operation description`);
  }
  for (const id of Object.keys(COMPONENT_OPERATION)) assert.ok(componentById(id), `operation for unknown component ${id}`);
  const untested = COMPONENT_LOCATIONS.filter((c) => !testsForComponent(c.id).length).map((c) => c.id);
  assert.ok(untested.length <= 12, `too many components without a test: ${untested.join(', ')}`);
  for (const id of ['crank-sensor', 'cam-sensor', 'vvt-solenoid', 'pcm', 'map', 'ect', 'o2-upstream', 'wheel-speed', 'fuel-injectors', 'coils']) {
    assert.ok(testsForComponent(id).length, `${id} has a test`);
  }
  for (const [id, jobs] of Object.entries(COMPONENT_LABOR)) {
    assert.ok(componentById(id), id);
    for (const j of jobs) assert.ok(LABOR_JOB_BY_CODE.get(j), `${id}: unknown labor job ${j}`);
  }
});

test('test search finds by part and circuit', () => {
  assert.equal(searchTests('injector')[0].id, 'fuel-injector');
  assert.ok(searchTests('CAN').some((t) => t.id === 'can-bus'));
  assert.equal(testsForComponent('crank-sensor')[0].kind, 'sensor');
  assert.equal(searchTests('zzzz').length, 0);
});

test('top repairs group the same cause and rank by times fixed', () => {
  const fix = (id: string, root_cause: string, mileage: number | null, conf = 0, parts: string | null = null, labor_hours: number | null = null) => ({ id, root_cause, fix: 'x', parts, mileage, labor_hours, confirmations: Array.from({ length: conf }, () => ({})) });
  const top = topRepairs([
    fix('a', 'Failed VCT solenoid (bank 1)', 98_000, 1, 'Motorcraft CM-5260', 1.2),
    fix('b', 'failed vct solenoid bank 1', 121_500, 0, 'Motorcraft CM-5260', 1.6),
    fix('c', 'Stretched timing chain', 143_000, 0),
    fix('d', 'Low oil level', null, 0),
  ]);
  assert.equal(top[0].cause, 'Failed VCT solenoid (bank 1)');
  assert.equal(top[0].times, 3);
  assert.deepEqual(top[0].fixIds, ['a', 'b']);
  assert.deepEqual(top[0].miles, [98_000, 121_500]);
  assert.deepEqual(top[0].parts, ['Motorcraft CM-5260']);
  assert.equal(top[0].avgLabor, 1.4);
  assert.equal(top[0].pct, 60);
  assert.equal(top.length, 3);
  assert.equal(causeKey('The bad coil!'), 'coil');
});

test('fixes by mileage bands', () => {
  const b = mileageBuckets([12_000, 30_000, 31_000, 140_000, 0, -5]);
  assert.equal(b.length, 6);
  assert.deepEqual(b.map((x) => x.n), [1, 2, 0, 0, 0, 1]);
  assert.equal(bucketLabel(b[1]), '25k–50k');
  assert.deepEqual(mileageBuckets([]), []);
});

test('pinouts validate, tidy and sort', () => {
  const base = { component: 'PCM', connector: 'C1', viewFrom: 'harness' as const, notes: '', engine: '' };
  assert.match(validatePinout({ ...base, pins: [emptyPin()] }) ?? '', /at least one pin/);
  assert.match(validatePinout({ ...base, pins: [{ pin: '1', function: '', color: 'BK', value: '' }] }) ?? '', /number and what it does/);
  assert.match(validatePinout({ ...base, pins: [{ pin: '1', function: 'Ground', color: '', value: '' }, { pin: '1', function: 'B+', color: '', value: '' }] }) ?? '', /twice/);
  assert.equal(validatePinout({ ...base, component: ' ', pins: [{ pin: '1', function: 'Ground', color: '', value: '' }] })?.startsWith('Say which component'), true);
  assert.equal(validatePinout({ ...base, pins: [{ pin: '1', function: 'Ground', color: 'BK', value: '' }, emptyPin()] }), null);
  assert.equal(cleanPins([emptyPin(), { pin: ' 2 ', function: ' CKP signal ', color: '', value: '' }]).length, 1);
  assert.deepEqual(['10', '2', 'A1', '1'].sort(pinOrder), ['1', '2', '10', 'A1']);
  assert.deepEqual(readPins([{ pin: 3, function: 'x' }, null]), [{ pin: '3', function: 'x', color: '', value: '' }, { pin: '', function: '', color: '', value: '' }]);
  assert.deepEqual(readPins('nope'), []);
  assert.equal(colorWords('BK/WH'), 'Black/White');
  assert.equal(colorWords('Black'), '');
});

test('a pinout belongs to a component by any of its names', () => {
  const ckp = componentById('crank-sensor')!;
  const names = [ckp.name, ...ckp.aka];
  assert.ok(pinoutMatches('CKP sensor', names));
  assert.ok(pinoutMatches('Crank sensor', names));
  assert.ok(pinoutMatches('crankshaft position sensor', names));
  assert.ok(!pinoutMatches('Cam sensor', names));
  assert.ok(!pinoutMatches('', names));
  const pcm = componentById('pcm')!;
  assert.ok(pinoutMatches('PCM C1 58-pin', [pcm.name, ...pcm.aka]));
});
