import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankFixes, timesFixed, type RankableFix } from '../src/lib/fixRank.ts';

const f150 = { year: '2016', make: 'Ford', model: 'F-150', engine: '3.5L V6 Turbo' };
const fix = (id: string, f: Partial<RankableFix>): RankableFix => ({
  id,
  model_year: 2016,
  make: 'Ford',
  model: 'F-150',
  engine: null,
  dtc_codes: [],
  created_at: '2026-01-01T00:00:00Z',
  confirmations: [],
  ...f,
});
const confirmed = (k: number) => Array.from({ length: k }, (_, i) => ({ user_id: `u${i}` }));

test('closer vehicles rank first, whatever the confirmations', () => {
  const ranked = rankFixes(
    [
      fix('other-model', { model: 'Mustang', confirmations: confirmed(9) }),
      fix('near', { model_year: 2018, confirmations: confirmed(3) }),
      fix('exact', {}),
      fix('model', { model_year: 2021, confirmations: confirmed(5) }),
    ],
    f150
  ).map((r) => r.fix.id);
  assert.deepEqual(ranked, ['exact', 'near', 'model', 'other-model']);
});

test('a near match two years out stays in its tier', () => {
  // Rank inside a tier drops a little per year; the tier itself must not.
  const ranked = rankFixes([fix('near-2yrs', { model_year: 2014 }), fix('model-3yrs', { model_year: 2019, confirmations: confirmed(10) })], f150);
  assert.equal(ranked[0].fix.id, 'near-2yrs');
  assert.equal(ranked[0].match?.tier, 'near');
});

test('within a tier: shared codes, then confirmations, then newest', () => {
  const ranked = rankFixes(
    [
      fix('old', { created_at: '2025-01-01T00:00:00Z' }),
      fix('popular', { confirmations: confirmed(4) }),
      fix('code', { dtc_codes: ['P0302'] }),
      fix('new', { created_at: '2026-09-01T00:00:00Z' }),
    ],
    f150,
    { codes: ['P0302'] }
  ).map((r) => r.fix.id);
  assert.deepEqual(ranked, ['code', 'popular', 'new', 'old']);
});

test('other makes are dropped unless asked for', () => {
  const fixes = [fix('ford', {}), fix('honda', { make: 'Honda', model: 'Civic' })];
  assert.deepEqual(rankFixes(fixes, f150).map((r) => r.fix.id), ['ford']);
  assert.deepEqual(rankFixes(fixes, f150, { includeOtherMakes: true }).map((r) => r.fix.id), ['ford', 'honda']);
  assert.equal(rankFixes(fixes, null).length, 2, 'no vehicle: everything, unranked by vehicle');
});

test('the author counts as the first fix', () => {
  assert.equal(timesFixed(fix('a', {})), 1);
  assert.equal(timesFixed(fix('a', { confirmations: confirmed(2) })), 3);
});
