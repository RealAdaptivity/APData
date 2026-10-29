import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_KINDS, HISTORY_KINDS, freeChecks, kindInfo, odometerReadings, summarize, validateEvent } from '../src/lib/vehicleReport.ts';
import { buildTimeline } from '../src/lib/history.ts';

const ev = (kind: string, note: string, extra: Partial<{ event_date: string | null; mileage: number | null; source: string | null }> = {}) => ({ id: kind + note, kind, note, event_date: null, mileage: null, source: null, created_at: '2026-10-01T00:00:00Z', ...extra });

test('report summary flags wrecks, brands, owners, flood, theft and airbags', () => {
  const s = summarize([ev('accident', 'Front hit'), ev('title_brand', 'Rebuilt'), ev('title_brand', 'Rebuilt'), ev('owner_change', '2nd owner'), ev('owner_change', '3rd owner'), ev('airbag', 'Driver bag')]);
  assert.equal(s.accidents, 1);
  assert.deepEqual(s.titleBrands, ['Rebuilt']);
  assert.equal(s.ownerChanges, 2);
  assert.equal(s.airbag, true);
  assert.equal(s.major, true);
  const clean = summarize([ev('owner_change', '2nd owner'), ev('damage_seen', 'Overspray on bumper')]);
  assert.equal(clean.major, false, 'owner changes and minor repair are not major');
  assert.equal(clean.damage, 1);
});

test('odometer readings sort by date and flag a drop', () => {
  const r = odometerReadings([
    { date: '2026-09-02T15:00:00Z', miles: 128_400, from: 'Fix' },
    { date: '2025-03-01', miles: 101_000, from: 'Customer said' },
    { date: '2026-10-20', miles: 96_000, from: 'Seen on the vehicle' },
    { date: '2026-01-01', miles: null, from: 'nothing' },
  ]);
  assert.deepEqual(r.map((x) => x.miles), [101_000, 128_400, 96_000]);
  assert.deepEqual(r.map((x) => x.drop), [false, false, true]);
});

test('history records are validated', () => {
  const base = { kind: 'accident' as const, date: '', mileage: '', note: 'Rear-ended', source: 'Customer said' };
  assert.equal(validateEvent(base), null);
  assert.match(validateEvent({ ...base, note: ' ' }) ?? '', /what happened/);
  assert.match(validateEvent({ ...base, kind: 'odometer', note: '' }) ?? '', /odometer reading/);
  assert.equal(validateEvent({ ...base, kind: 'odometer', note: '', mileage: '128,400' }), null);
  assert.match(validateEvent({ ...base, mileage: '12.5k' }) ?? '', /whole number/);
  assert.match(validateEvent({ ...base, date: '2999-01-01' }, new Date('2026-10-29')) ?? '', /future/);
  assert.match(validateEvent({ ...base, date: '1900-01-01' }) ?? '', /too early/);
});

test('every history kind has a label, and records join the timeline', () => {
  for (const k of HISTORY_KINDS) assert.ok(EVENT_KINDS[k].label, k);
  assert.equal(kindInfo('nonsense').label, 'Other');
  const t = buildTimeline({ jobs: [], receipts: [], quotes: [], fixes: [], confirmations: [], notes: [], events: [{ ...ev('accident', 'Front hit', { event_date: '2024-05-01', mileage: 80_000, source: 'CARFAX / AutoCheck report' }), label: 'Accident / wreck' }] });
  assert.equal(t[0].kind, 'event');
  assert.equal(t[0].date, '2024-05-01');
  assert.match(t[0].detail.join(' '), /80,000 mi · Source: CARFAX/);
  assert.equal(freeChecks('1FTEW1EG5GFA12345')[2].href, 'https://www.nhtsa.gov/recalls?vin=1FTEW1EG5GFA12345');
});
