import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARTICLES, ARTICLE_BY_SLUG, searchArticles } from '../src/data/articles.ts';
import { DTC_LIBRARY } from '../src/data/dtcLibrary.ts';
import { LABOR_JOBS, LABOR_JOB_BY_CODE, laborJob, searchLaborJobs } from '../src/data/laborJobs.ts';
import { SYSTEMS, isSystemId, systemInfo } from '../src/data/systems.ts';

// The database checks only the shape of these ids, so the app must keep to it.
const SYSTEM_RULE = /^[a-z_]{2,30}$/; // repair_fixes.system, repair_procedures.system, repair_files.system
const JOB_RULE = /^[a-z0-9_]{2,60}$/; // labor_times.job_code

test('system ids are unique and fit the database rule', () => {
  assert.equal(new Set(SYSTEMS.map((s) => s.id)).size, SYSTEMS.length);
  for (const s of SYSTEMS) assert.match(s.id, SYSTEM_RULE);
  assert.equal(systemInfo('nonsense').id, 'other');
});

test('articles are unique, complete and link to real codes', () => {
  assert.equal(ARTICLE_BY_SLUG.size, ARTICLES.length, 'duplicate article slugs');
  for (const a of ARTICLES) {
    assert.match(a.slug, /^[a-z0-9-]+$/);
    assert.ok(isSystemId(a.system), `${a.slug}: unknown system`);
    assert.ok(a.steps.length >= 3, `${a.slug}: too few steps`);
    assert.ok(a.summary.length > 40, `${a.slug}: no summary`);
    assert.ok(a.lookUp.length >= 1, `${a.slug}: says nothing about what to look up`);
    for (const c of a.codes ?? []) assert.ok(DTC_LIBRARY.has(c), `${a.slug} links to missing code ${c}`);
  }
});

test('article search ranks title hits first', () => {
  assert.equal(searchArticles('compression')[0]?.slug, 'compression-test');
  assert.ok(searchArticles('brake').length >= 3);
  assert.deepEqual(searchArticles(''), []);
});

test('labor job codes are unique and fit the database rule', () => {
  assert.equal(LABOR_JOB_BY_CODE.size, LABOR_JOBS.length, 'duplicate job codes');
  for (const j of LABOR_JOBS) {
    assert.match(j.code, JOB_RULE);
    assert.ok(isSystemId(j.system), `${j.code}: unknown system`);
  }
  assert.equal(laborJob('not_a_job').name, 'not a job', 'an unknown code still has a name');
  assert.ok(searchLaborJobs('pads rotors').some((j) => j.code === 'brake_pads_rotors_front'));
  assert.equal(searchLaborJobs('').length, LABOR_JOBS.length);
});
