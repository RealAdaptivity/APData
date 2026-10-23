import { supabase } from '../lib/supabase';
import { check } from '../lib/errors';
import { ilikeLiteral, vehicleColumns, type Vehicle } from '../lib/vehicle';
import { normalizeCode } from '../lib/dtc';
import { currentUserId, nameOf, numberOrNull, textOrNull } from './common';

/** Confirmed fixes (repair_fixes) and the techs who confirmed them. */

export type FixConfirmation = { user_id: string; note: string | null; created_at: string; name: string | null };

export type Fix = {
  id: string;
  model_year: number;
  make: string;
  model: string;
  engine: string | null;
  vin: string | null;
  mileage: number | null;
  system: string;
  dtc_codes: string[];
  symptom: string;
  tests_performed: string | null;
  root_cause: string;
  fix: string;
  parts: string | null;
  labor_hours: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  author: string | null;
  confirmations: FixConfirmation[];
};

const SELECT = `id, model_year, make, model, engine, vin, mileage, system, dtc_codes, symptom, tests_performed,
  root_cause, fix, parts, labor_hours, created_by, created_at, updated_at,
  author:profiles!repair_fixes_created_by_fkey ( full_name ),
  confirmations:repair_fix_confirmations ( user_id, note, created_at, who:profiles ( full_name ) )`;

type Row = Omit<Fix, 'author' | 'confirmations' | 'labor_hours'> & {
  labor_hours: number | string | null;
  author: unknown;
  confirmations: { user_id: string; note: string | null; created_at: string; who: unknown }[] | null;
};

function toFix(r: Row): Fix {
  return {
    ...r,
    labor_hours: r.labor_hours == null ? null : Number(r.labor_hours),
    dtc_codes: r.dtc_codes ?? [],
    author: nameOf(r.author),
    confirmations: (r.confirmations ?? [])
      .map((c) => ({ user_id: c.user_id, note: c.note, created_at: c.created_at, name: nameOf(c.who) }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
}

/** Fixes on the same make within five model years: the candidates the ranker scores. */
export async function fixesNearVehicle(v: Vehicle): Promise<Fix[]> {
  const y = Number(v.year);
  const { data, error } = await supabase
    .from('repair_fixes')
    .select(SELECT)
    .ilike('make', ilikeLiteral(v.make))
    .gte('model_year', y - 5)
    .lte('model_year', y + 5)
    .order('created_at', { ascending: false })
    .limit(500);
  check(error, 'Could not load confirmed fixes');
  return ((data ?? []) as unknown as Row[]).map(toFix);
}

export async function fixesForCode(code: string): Promise<Fix[]> {
  const c = normalizeCode(code);
  if (!c) return [];
  const { data, error } = await supabase
    .from('repair_fixes')
    .select(SELECT)
    .contains('dtc_codes', [c])
    .order('created_at', { ascending: false })
    .limit(300);
  check(error, 'Could not load fixes for that code');
  return ((data ?? []) as unknown as Row[]).map(toFix);
}

/** Full-text search over symptom, cause, fix, parts and tests ("hard start hot", "coil boot"). */
export async function searchFixes(text: string): Promise<Fix[]> {
  const q = text.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from('repair_fixes')
    .select(SELECT)
    .textSearch('search', q, { type: 'websearch', config: 'english' })
    .order('created_at', { ascending: false })
    .limit(200);
  check(error, 'Search failed');
  return ((data ?? []) as unknown as Row[]).map(toFix);
}

export async function recentFixes(limit = 30): Promise<Fix[]> {
  const { data, error } = await supabase.from('repair_fixes').select(SELECT).order('created_at', { ascending: false }).limit(limit);
  check(error, 'Could not load confirmed fixes');
  return ((data ?? []) as unknown as Row[]).map(toFix);
}

export async function getFix(id: string): Promise<Fix | null> {
  const { data, error } = await supabase.from('repair_fixes').select(SELECT).eq('id', id).maybeSingle();
  check(error, 'Could not load that fix');
  return data ? toFix(data as unknown as Row) : null;
}

export type FixInput = {
  vehicle: Vehicle;
  mileage: string;
  system: string;
  codes: string[];
  symptom: string;
  tests: string;
  rootCause: string;
  fix: string;
  parts: string;
  laborHours: string;
};

export function validateFix(f: FixInput): string | null {
  if (!/^\d{4}$/.test(f.vehicle.year) || !f.vehicle.make.trim() || !f.vehicle.model.trim()) return 'Pick the vehicle first.';
  if (f.symptom.trim().length < 3) return 'Describe the symptom or customer concern.';
  if (f.rootCause.trim().length < 3) return 'Say what was actually wrong (the root cause).';
  if (f.fix.trim().length < 3) return 'Say what fixed it.';
  const hours = numberOrNull(f.laborHours);
  if (f.laborHours.trim() && (hours == null || hours <= 0 || hours > 100)) return 'Labor hours must be a number between 0.1 and 100.';
  const miles = numberOrNull(f.mileage);
  if (f.mileage.trim() && (miles == null || miles < 0 || miles > 2_000_000)) return 'Mileage does not look right.';
  if (f.codes.length > 20) return 'Twenty codes at most.';
  return null;
}

function columns(f: FixInput) {
  const miles = numberOrNull(f.mileage);
  return {
    ...vehicleColumns(f.vehicle),
    vin: f.vehicle.vin || null,
    mileage: miles == null ? null : Math.round(miles),
    system: f.system,
    dtc_codes: [...new Set(f.codes.map((c) => normalizeCode(c)).filter((c): c is string => !!c))],
    symptom: f.symptom.trim(),
    tests_performed: textOrNull(f.tests),
    root_cause: f.rootCause.trim(),
    fix: f.fix.trim(),
    parts: textOrNull(f.parts),
    labor_hours: numberOrNull(f.laborHours),
  };
}

export async function createFix(f: FixInput): Promise<string> {
  const problem = validateFix(f);
  if (problem) throw new Error(problem);
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from('repair_fixes')
    .insert({ ...columns(f), created_by: uid })
    .select('id')
    .single();
  check(error, 'Could not save the fix');
  return (data as { id: string }).id;
}

export async function updateFix(id: string, f: FixInput): Promise<void> {
  const problem = validateFix(f);
  if (problem) throw new Error(problem);
  const { data, error } = await supabase.from('repair_fixes').update(columns(f)).eq('id', id).select('id');
  check(error, 'Could not save the fix');
  if (!data?.length) throw new Error('Only the tech who added this fix, or an admin, can edit it.');
}

export async function deleteFix(id: string): Promise<void> {
  const { data, error } = await supabase.from('repair_fixes').delete().eq('id', id).select('id');
  check(error, 'Could not delete the fix');
  if (!data?.length) throw new Error('Only the tech who added this fix, or an admin, can delete it.');
}

export async function confirmFix(fixId: string, note: string, vin?: string): Promise<void> {
  const uid = await currentUserId();
  const { error } = await supabase
    .from('repair_fix_confirmations')
    .insert({ fix_id: fixId, user_id: uid, note: textOrNull(note), vin: vin || null });
  if (error?.code === '23505') return; // already confirmed
  check(error, 'Could not save your confirmation');
}

export async function unconfirmFix(fixId: string): Promise<void> {
  const uid = await currentUserId();
  const { error } = await supabase.from('repair_fix_confirmations').delete().eq('fix_id', fixId).eq('user_id', uid);
  check(error, 'Could not remove your confirmation');
}
