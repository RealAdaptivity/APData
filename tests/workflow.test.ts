import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jobMatchesVehicle, parseJobLink } from '../src/lib/jobLink.ts';
import { buildTimeline, statusLabel, visitCount } from '../src/lib/history.ts';
import { MAINTENANCE, appliesTo, dueAt, intervalText, traitsFromEngine } from '../src/data/maintenance.ts';
import { LABOR_JOB_BY_CODE } from '../src/data/laborJobs.ts';
import { componentById } from '../src/data/locations.ts';
import { fixCapture, laborOverBook, perTech, topCounts } from '../src/lib/ownerStats.ts';

const q = (s: string) => new URLSearchParams(s);

test('a job link names the job, vehicle, complaint and codes', () => {
  const job = parseJobLink(q('job=AP-ZA4DHQ7B&vin=1fm5k8d84fga12345&year=2015&make=Ford&model=Explorer&issue=Rough%20idle%20P0301&codes=p0301,P0171,junk'));
  assert.deepEqual(job, { ref: 'AP-ZA4DHQ7B', vin: '1FM5K8D84FGA12345', year: '2015', make: 'Ford', model: 'Explorer', issue: 'Rough idle P0301', codes: ['P0301', 'P0171'] });
  assert.equal(parseJobLink(q('vin=1FM5K8D84FGA12345')), null, 'no job, no job link');
  assert.equal(parseJobLink(q('job=<script>')), null);
  assert.equal(parseJobLink(q('job=AP-1&vin=SHORT'))?.vin, undefined, 'a bad VIN is dropped, not trusted');
});

test('a job matches its vehicle by VIN, else by year/make/model', () => {
  const job = parseJobLink(q('job=AP-1618&vin=1FM5K8D84FGA12345&year=2015&make=Ford&model=Explorer'))!;
  assert.ok(jobMatchesVehicle(job, { year: '2015', make: 'Ford', model: 'Explorer', vin: '1fm5k8d84fga12345' }));
  assert.ok(!jobMatchesVehicle(job, { year: '2015', make: 'Ford', model: 'Explorer', vin: '1FTEW1EG5GFA00000' }), 'another truck of the same model is not this job');
  const noVin = parseJobLink(q('job=AP-1618&year=2015&make=Ford&model=F-150'))!;
  assert.ok(jobMatchesVehicle(noVin, { year: '2015', make: 'ford', model: 'F150' }));
  assert.ok(!jobMatchesVehicle(noVin, { year: '2016', make: 'Ford', model: 'F-150' }));
});

test('service history merges every source, newest first', () => {
  const entries = buildTimeline({
    jobs: [{ reference_code: 'AP-1', created_at: '2026-01-02T10:00:00Z', preferred_date: '2026-01-05', status: 'COMPLETED', services: ['Mobile Diagnostic Visit'], issue_description: 'Shakes at idle', vehicle_description: '2015 Ford Explorer' }],
    receipts: [{ receipt_number: 'R-9', paid_on: '2026-01-05', created_at: '2026-01-05T18:00:00Z', total_cents: 41250, line_items: [{ title: 'Ignition coil', hours: 0.8 }, { title: '' }], notes: null }],
    quotes: [{ quote_number: 'Q-3', created_at: '2026-01-04T12:00:00Z', status: 'ACCEPTED', total_cents: 41250, line_items: 'bad' }],
    fixes: [{ id: 'f1', created_at: '2026-01-05T19:00:00Z', mileage: 128400, dtc_codes: ['P0302'], root_cause: 'Cracked coil boot', fix: 'Replaced coil 2', job_ref: 'AP-1' }],
    confirmations: [{ fix_id: 'f0', created_at: '2025-06-01T00:00:00Z', note: null, root_cause: 'Vacuum leak' }],
    notes: [{ id: 'n1', created_at: '2026-01-06T09:00:00Z', note: ' Customer declined struts ', job_ref: null }],
  });
  assert.deepEqual(
    entries.map((e) => e.kind),
    ['note', 'fix', 'receipt', 'job', 'quote', 'confirmation']
  );
  assert.equal(entries[1].to, '/fixes/f1');
  assert.equal(entries[1].job, 'AP-1');
  assert.match(entries[1].detail.join(' '), /128,400 mi/);
  assert.equal(entries[2].title, 'Paid · receipt R-9 · $412.50');
  assert.deepEqual(entries[2].detail, ['Ignition coil (0.8 h)']);
  assert.match(entries[3].title, /Completed/);
  assert.equal(entries[4].detail.length, 0, 'unreadable line items are skipped');
  assert.equal(entries[0].detail[0], 'Customer declined struts');
  assert.equal(visitCount(entries), 1);
  assert.equal(statusLabel('ON_SITE'), 'Tech on site');
  assert.equal(statusLabel('SOMETHING_NEW'), 'Something new');
});

test('maintenance items are complete and link to real jobs and locations', () => {
  const ids = new Set<string>();
  for (const m of MAINTENANCE) {
    assert.ok(!ids.has(m.id), m.id);
    ids.add(m.id);
    assert.ok(m.miles || m.months, `${m.id} has an interval`);
    if (m.laborJob) assert.ok(LABOR_JOB_BY_CODE.has(m.laborJob), `${m.id} labor job ${m.laborJob}`);
    if (m.location) assert.ok(componentById(m.location), `${m.id} location ${m.location}`);
    if (m.severeMiles && m.miles) assert.ok(m.severeMiles <= m.miles, `${m.id} severe is not longer than normal`);
  }
});

test('what is due at a mileage', () => {
  assert.deepEqual(dueAt(61_200, 30_000), { state: 'due', atMiles: 60_000 });
  assert.deepEqual(dueAt(58_900, 30_000), { state: 'soon', atMiles: 60_000 });
  assert.deepEqual(dueAt(45_000, 30_000), { state: 'later', atMiles: 60_000 });
  assert.deepEqual(dueAt(500, 30_000), { state: 'later', atMiles: 30_000 }, 'a new vehicle is not due at 0');
  assert.deepEqual(dueAt(61_200, null), { state: 'time', atMiles: null });
  assert.equal(intervalText(7500, 12), 'every 7,500 mi or 1 yr');
  assert.equal(intervalText(null, 36), 'every 3 yrs');
  assert.equal(intervalText(null, 6), 'every 6 mo');
});

test('maintenance items fit the engine', () => {
  const diesel = traitsFromEngine('6.7L V8 Diesel');
  const gas = traitsFromEngine('3.5L V6');
  const unknown = traitsFromEngine('');
  const plugs = MAINTENANCE.find((m) => m.id === 'spark-plugs')!;
  const def = MAINTENANCE.find((m) => m.id === 'def')!;
  const diff = MAINTENANCE.find((m) => m.id === 'diff')!;
  assert.equal(appliesTo(plugs, diesel), false);
  assert.equal(appliesTo(plugs, gas), true);
  assert.equal(appliesTo(def, gas), false);
  assert.equal(appliesTo(def, unknown), null, 'unknown engine: shown with a label');
  assert.equal(appliesTo(diff, gas), null, 'AWD cannot be told from the engine');
  assert.deepEqual(traitsFromEngine('2.5L Hybrid'), { diesel: false, turbo: false, hybrid: true });
});

test('shop dashboard numbers', () => {
  const now = Date.parse('2026-10-27T12:00:00Z');
  const recent = '2026-10-20T00:00:00Z';
  const old = '2026-01-01T00:00:00Z';
  const techs = perTech(
    [{ id: 'a', name: 'Marcus' }, { id: 'b', name: 'Dee' }],
    { fixes: [{ by: 'a', at: recent }, { by: 'a', at: old }, { by: 'zz', at: recent }], confirmations: [{ by: 'b', at: recent }], photos: [], notes: [{ by: 'b', at: recent }], specs: [], labor: [] },
    30,
    now
  );
  assert.deepEqual(techs.map((t) => [t.name, t.fixes, t.total]), [['Dee', 0, 2], ['Marcus', 1, 1]]);
  assert.deepEqual(topCounts(['P0300', 'P0171', 'P0300', ' '], 5), [{ key: 'P0300', n: 2 }, { key: 'P0171', n: 1 }]);
  const over = laborOverBook([
    { job_code: 'brakes', kind: 'book', hours: 1.5 },
    { job_code: 'brakes', kind: 'actual', hours: 2 },
    { job_code: 'brakes', kind: 'actual', hours: 2.2 },
    { job_code: 'coil', kind: 'book', hours: 0.5 },
    { job_code: 'coil', kind: 'actual', hours: 0.55 },
    { job_code: 'alone', kind: 'actual', hours: 3 },
  ]);
  assert.deepEqual(over.map((o) => [o.job, o.overPct, o.count]), [['brakes', 40, 2]]);
  const cap = fixCapture(
    [
      { reference_code: 'AP-1', status: 'COMPLETED', created_at: recent },
      { reference_code: 'AP-2', status: 'COMPLETED', created_at: recent },
      { reference_code: 'AP-3', status: 'UNASSIGNED', created_at: recent },
      { reference_code: 'AP-4', status: 'COMPLETED', created_at: old },
    ],
    ['AP-1', null],
    30,
    now
  );
  assert.deepEqual(cap, { completed: 2, withFix: 1, pct: 50 });
});

import { TYPICAL_TIMES, engineKind, typicalFor } from '../src/data/laborTypical.ts';
import { LABOR_JOBS } from '../src/data/laborJobs.ts';
import { suggestedHours } from '../src/lib/labor.ts';

test('every labor job has a typical time, and the quote falls back to it', () => {
  for (const j of LABOR_JOBS) {
    const t = TYPICAL_TIMES[j.code];
    assert.ok(t, `${j.code} has a typical time`);
    for (const r of [t.base, t.v6, t.v8, t.diesel].filter(Boolean)) assert.ok(r![0] > 0 && r![0] <= r![1] && r![1] <= 16, `${j.code} range`);
  }
  for (const code of Object.keys(TYPICAL_TIMES)) assert.ok(LABOR_JOB_BY_CODE.get(code), `typical time for unknown job ${code}`);
  assert.equal(engineKind('2.0L I4'), 'other');
  assert.equal(engineKind('3.5L Turbo V6'), 'v6');
  assert.equal(engineKind('5.3L V8'), 'v8');
  assert.equal(engineKind('6.7L V8 Diesel'), 'diesel');
  assert.deepEqual(typicalFor('oil_change', '2.0L I4'), { low: 0.3, high: 0.5, hours: 0.4, note: undefined, engine: 'other' });
  assert.equal(typicalFor('spark_plugs', '3.5L V6')!.high, 3.0);
  assert.equal(typicalFor('spark_plugs', '3.5L V6')!.engine, 'v6');
  assert.equal(typicalFor('oil_change', '3.5L V6')!.engine, 'other', 'no V6 range for an oil change');
  const focus = { year: '2012', make: 'Ford', model: 'Focus', engine: '2.0L I4' };
  const s = suggestedHours([], focus, 'oil_change');
  assert.equal(s?.hours, 0.4);
  assert.match(s!.basis, /typical time \(0\.3–0\.5 h\)/);
  assert.equal(suggestedHours([], focus), null, 'no code, no fallback');
  const book = [{ id: 'b', job_code: 'oil_change', kind: 'book' as const, model_year: null, make: null, model: null, engine: null, hours: 0.6, note: null, created_at: '2026-01-01', created_by: null }];
  assert.equal(suggestedHours(book, focus, 'oil_change')?.hours, 0.6, 'shop book time wins');
});
