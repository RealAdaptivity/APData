import { supabase } from '../lib/supabase';
import { check } from '../lib/errors';
import { vehicleColumns, type Vehicle } from '../lib/vehicle';
import type { LaborEntry } from '../lib/labor';
import { currentUserId, nameOf, numberOrNull, textOrNull } from './common';

/** The shop labor guide (labor_times) and the shop labor rate (app_config). */

const SELECT = `id, job_code, kind, model_year, make, model, engine, hours, note, created_at, created_by,
  author:profiles!labor_times_created_by_fkey ( full_name )`;

type Row = Omit<LaborEntry, 'author' | 'hours'> & { hours: number | string; author: unknown };

function toEntry(r: Row): LaborEntry {
  return { ...r, hours: Number(r.hours), author: nameOf(r.author) };
}

/** Every entry for one job. */
export async function laborForJob(jobCode: string): Promise<LaborEntry[]> {
  const { data, error } = await supabase
    .from('labor_times')
    .select(SELECT)
    .eq('job_code', jobCode)
    .order('created_at', { ascending: false })
    .limit(2000);
  check(error, 'Could not load labor times');
  return ((data ?? []) as unknown as Row[]).map(toEntry);
}

/** Every entry for several jobs at once (the estimate). */
export async function laborForJobs(jobCodes: string[]): Promise<LaborEntry[]> {
  if (!jobCodes.length) return [];
  const { data, error } = await supabase
    .from('labor_times')
    .select(SELECT)
    .in('job_code', jobCodes)
    .order('created_at', { ascending: false })
    .limit(5000);
  check(error, 'Could not load labor times');
  return ((data ?? []) as unknown as Row[]).map(toEntry);
}

/** Which jobs have any time logged, and how many entries — for the job list. */
export async function laborCounts(): Promise<Map<string, { book: number; actual: number }>> {
  const { data, error } = await supabase.from('labor_times').select('job_code, kind').limit(20000);
  check(error, 'Could not load labor times');
  const m = new Map<string, { book: number; actual: number }>();
  for (const r of (data ?? []) as { job_code: string; kind: 'book' | 'actual' }[]) {
    const c = m.get(r.job_code) ?? { book: 0, actual: 0 };
    c[r.kind] += 1;
    m.set(r.job_code, c);
  }
  return m;
}

function parseHours(h: string): number {
  const n = numberOrNull(h);
  if (n == null || n <= 0 || n > 100) throw new Error('Hours must be a number between 0.1 and 100 (for example 1.5).');
  return Math.round(n * 100) / 100;
}

/** A tech logging how long a job really took on a vehicle. */
export async function logActualTime(jobCode: string, v: Vehicle, hours: string, note: string): Promise<void> {
  const uid = await currentUserId();
  const { error } = await supabase.from('labor_times').insert({
    job_code: jobCode,
    kind: 'actual',
    ...vehicleColumns(v),
    hours: parseHours(hours),
    note: textOrNull(note),
    created_by: uid,
  });
  check(error, 'Could not save the time');
}

export type BookScope = 'all' | 'make' | 'model' | 'vehicle';

/** Admin: the hours the shop charges for a job, for every vehicle or narrowed to this one. */
export async function setBookTime(jobCode: string, scope: BookScope, v: Vehicle | null, hours: string, note: string): Promise<void> {
  const uid = await currentUserId();
  if (scope !== 'all' && !v) throw new Error('Pick a vehicle to narrow the book time to.');
  const cols = v ? vehicleColumns(v) : null;
  const { error } = await supabase.from('labor_times').insert({
    job_code: jobCode,
    kind: 'book',
    make: scope === 'all' ? null : cols!.make,
    model: scope === 'model' || scope === 'vehicle' ? cols!.model : null,
    model_year: scope === 'vehicle' ? cols!.model_year : null,
    engine: scope === 'vehicle' ? cols!.engine : null,
    hours: parseHours(hours),
    note: textOrNull(note),
    created_by: uid,
  });
  check(error, 'Could not save the book time');
}

export async function deleteLaborEntry(id: string): Promise<void> {
  const { data, error } = await supabase.from('labor_times').delete().eq('id', id).select('id');
  check(error, 'Could not delete that entry');
  if (!data?.length) throw new Error('Only the tech who logged it, or an admin, can delete it.');
}

/** What the website advertises, used when the admin has not set a rate. */
export const FALLBACK_LABOR_RATE_CENTS = 15000;

/** The shop rate new quotes start from (set by the owner in the admin portal). */
export async function fetchShopLaborRateCents(): Promise<number> {
  const { data, error } = await supabase.from('app_config').select('value').eq('key', 'default_labor_rate_cents').maybeSingle();
  if (error) return FALLBACK_LABOR_RATE_CENTS;
  const n = Number((data as { value?: unknown } | null)?.value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : FALLBACK_LABOR_RATE_CENTS;
}
