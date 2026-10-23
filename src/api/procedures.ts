import { supabase } from '../lib/supabase';
import { check } from '../lib/errors';
import { currentUserId, nameOf, numberOrNull, textOrNull } from './common';

/** Shop-written procedures (repair_procedures). */

export type ProcedureStep = { text: string };
export type ProcedureSpec = { label: string; value: string };

export type Procedure = {
  id: string;
  title: string;
  system: string;
  make: string | null;
  model: string | null;
  engine: string | null;
  year_from: number | null;
  year_to: number | null;
  summary: string | null;
  tools: string | null;
  warnings: string | null;
  steps: ProcedureStep[];
  specs: ProcedureSpec[];
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  author: string | null;
  editor: string | null;
};

const SELECT = `id, title, system, make, model, engine, year_from, year_to, summary, tools, warnings, steps, specs, notes,
  created_by, updated_by, created_at, updated_at,
  author:profiles!repair_procedures_created_by_fkey ( full_name ),
  editor:profiles!repair_procedures_updated_by_fkey ( full_name )`;

type Row = Omit<Procedure, 'author' | 'editor' | 'steps' | 'specs'> & { author: unknown; editor: unknown; steps: unknown; specs: unknown };

function asSteps(v: unknown): ProcedureStep[] {
  return Array.isArray(v)
    ? v
        .map((s) => ({ text: String((s as { text?: unknown })?.text ?? '').trim() }))
        .filter((s) => s.text)
    : [];
}

function asSpecs(v: unknown): ProcedureSpec[] {
  return Array.isArray(v)
    ? v
        .map((s) => ({
          label: String((s as { label?: unknown })?.label ?? '').trim(),
          value: String((s as { value?: unknown })?.value ?? '').trim(),
        }))
        .filter((s) => s.label && s.value)
    : [];
}

function toProcedure(r: Row): Procedure {
  return { ...r, steps: asSteps(r.steps), specs: asSpecs(r.specs), author: nameOf(r.author), editor: nameOf(r.editor) };
}

/** Every shop procedure (titles and scope); the page filters by vehicle and system. */
export async function listProcedures(): Promise<Procedure[]> {
  const { data, error } = await supabase.from('repair_procedures').select(SELECT).order('title').limit(1000);
  check(error, 'Could not load shop procedures');
  return ((data ?? []) as unknown as Row[]).map(toProcedure);
}

export async function getProcedure(id: string): Promise<Procedure | null> {
  const { data, error } = await supabase.from('repair_procedures').select(SELECT).eq('id', id).maybeSingle();
  check(error, 'Could not load that procedure');
  return data ? toProcedure(data as unknown as Row) : null;
}

export type ProcedureInput = {
  title: string;
  system: string;
  make: string;
  model: string;
  engine: string;
  yearFrom: string;
  yearTo: string;
  summary: string;
  tools: string;
  warnings: string;
  steps: string[];
  specs: ProcedureSpec[];
  notes: string;
};

export function validateProcedure(p: ProcedureInput): string | null {
  if (p.title.trim().length < 3) return 'Give the procedure a title.';
  if (p.model.trim() && !p.make.trim()) return 'A model needs its make.';
  const from = numberOrNull(p.yearFrom);
  const to = numberOrNull(p.yearTo);
  for (const y of [from, to]) if (y != null && (!Number.isInteger(y) || y < 1950 || y > 2100)) return 'Years must be four digits.';
  if (from != null && to != null && from > to) return 'The first year must come before the last year.';
  if (!p.steps.some((s) => s.trim()) && !p.notes.trim()) return 'Add at least one step or some notes.';
  return null;
}

function columns(p: ProcedureInput) {
  return {
    title: p.title.trim(),
    system: p.system,
    make: textOrNull(p.make),
    model: textOrNull(p.model),
    engine: textOrNull(p.engine),
    year_from: numberOrNull(p.yearFrom),
    year_to: numberOrNull(p.yearTo),
    summary: textOrNull(p.summary),
    tools: textOrNull(p.tools),
    warnings: textOrNull(p.warnings),
    steps: p.steps.map((t) => t.trim()).filter(Boolean).map((text) => ({ text })),
    specs: p.specs.map((s) => ({ label: s.label.trim(), value: s.value.trim() })).filter((s) => s.label && s.value),
    notes: textOrNull(p.notes),
  };
}

export async function createProcedure(p: ProcedureInput): Promise<string> {
  const problem = validateProcedure(p);
  if (problem) throw new Error(problem);
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from('repair_procedures')
    .insert({ ...columns(p), created_by: uid, updated_by: uid })
    .select('id')
    .single();
  check(error, 'Could not save the procedure');
  return (data as { id: string }).id;
}

export async function updateProcedure(id: string, p: ProcedureInput): Promise<void> {
  const problem = validateProcedure(p);
  if (problem) throw new Error(problem);
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from('repair_procedures')
    .update({ ...columns(p), updated_by: uid })
    .eq('id', id)
    .select('id');
  check(error, 'Could not save the procedure');
  if (!data?.length) throw new Error('Only the tech who wrote this procedure, or an admin, can edit it.');
}

export async function deleteProcedure(id: string): Promise<void> {
  const { data, error } = await supabase.from('repair_procedures').delete().eq('id', id).select('id');
  check(error, 'Could not delete the procedure');
  if (!data?.length) throw new Error('Only the tech who wrote this procedure, or an admin, can delete it.');
}
