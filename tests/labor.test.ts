import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actualSummary, bookHoursFor, estimateTotals, hoursStats, round1, suggestedHours, type LaborEntry } from '../src/lib/labor.ts';

const f150 = { year: '2016', make: 'Ford', model: 'F-150', engine: '3.5L V6 Turbo' };
let n = 0;
const entry = (e: Partial<LaborEntry>): LaborEntry => ({
  id: String(++n),
  job_code: 'brake_pads_front',
  kind: 'actual',
  model_year: null,
  make: null,
  model: null,
  engine: null,
  hours: 1,
  note: null,
  created_at: `2026-10-${String(10 + n).padStart(2, '0')}T12:00:00Z`,
  created_by: null,
  ...e,
});

test('hours stats: median, average and range', () => {
  assert.equal(hoursStats([]), null);
  assert.deepEqual(hoursStats([1, 2, 3, 10]), { count: 4, average: 4, median: 2.5, min: 1, max: 10 });
  assert.equal(hoursStats([1.24, 1.26, 0, -1])?.count, 2, 'zero and negative times are ignored');
  assert.equal(round1(1.25), 1.3);
});

test('the most specific book time wins', () => {
  const all = entry({ kind: 'book', hours: 1.5 });
  const make = entry({ kind: 'book', make: 'Ford', hours: 1.6 });
  const model = entry({ kind: 'book', make: 'Ford', model: 'F-150', hours: 1.8 });
  const exact = entry({ kind: 'book', make: 'Ford', model: 'F-150', model_year: 2016, hours: 2.0 });
  const otherYear = entry({ kind: 'book', make: 'Ford', model: 'F-150', model_year: 2020, hours: 9 });
  assert.equal(bookHoursFor([all, make, model, exact, otherYear], f150)?.hours, 2.0);
  assert.equal(bookHoursFor([all, make, model], f150)?.hours, 1.8);
  assert.equal(bookHoursFor([all, make], f150)?.hours, 1.6);
  assert.equal(bookHoursFor([all], f150)?.hours, 1.5);
  assert.equal(bookHoursFor([make], { year: '2016', make: 'Honda', model: 'Civic' }), null);
  assert.equal(bookHoursFor([all, make], null)?.hours, 1.5, 'no vehicle: only the default applies');
});

test('a newer book time replaces an older one at the same scope', () => {
  const older = entry({ kind: 'book', hours: 1.5, created_at: '2026-01-01T00:00:00Z' });
  const newer = entry({ kind: 'book', hours: 1.7, created_at: '2026-06-01T00:00:00Z' });
  assert.equal(bookHoursFor([older, newer], f150)?.hours, 1.7);
});

test('actual times summarise this model, the make and everything', () => {
  const es = [
    entry({ make: 'Ford', model: 'F-150', model_year: 2016, hours: 1.4 }),
    entry({ make: 'Ford', model: 'F-150', model_year: 2017, hours: 1.6 }),
    entry({ make: 'Ford', model: 'Explorer', model_year: 2016, hours: 2.2 }),
    entry({ make: 'Toyota', model: 'Camry', model_year: 2016, hours: 1.0 }),
  ];
  const s = actualSummary(es, f150);
  assert.equal(s.thisVehicle?.count, 2);
  assert.equal(s.thisVehicle?.median, 1.5);
  assert.equal(s.sameMake?.count, 3);
  assert.equal(s.all?.count, 4);
});

test('the quote uses book time, then enough real times, then nothing', () => {
  const real = [
    entry({ make: 'Ford', model: 'F-150', model_year: 2016, hours: 1.4 }),
    entry({ make: 'Ford', model: 'F-150', model_year: 2016, hours: 1.6 }),
  ];
  assert.deepEqual(suggestedHours([...real, entry({ kind: 'book', hours: 1.5 })], f150), { hours: 1.5, basis: 'Shop book time' });
  assert.equal(suggestedHours(real, f150)?.hours, 1.5);
  assert.match(suggestedHours(real, f150)?.basis ?? '', /2 jobs on this model/);
  assert.equal(suggestedHours([real[0]], f150), null, 'one job is not enough to quote from');
});

test('estimate totals', () => {
  const t = estimateTotals(
    [
      { key: 'a', name: 'A', hours: 1.5, partsCents: 12000 },
      { key: 'b', name: 'B', hours: 0.75, partsCents: 0 },
      { key: 'c', name: 'C', hours: -1, partsCents: -50 },
    ],
    15000
  );
  assert.deepEqual(t, { hours: 2.3, laborCents: 34500, partsCents: 12000, totalCents: 46500 });
});
