import { supabase } from '../lib/supabase';
import { check } from '../lib/errors';
import { ilikeLiteral, type Vehicle } from '../lib/vehicle';
import { currentUserId, nameOf } from './common';

/**
 * Shop notes per year / make / model (vehicle_notes). The same table the
 * admin Research tab in the AdaptivityPerformance portal reads and writes,
 * so a note made in either place shows in both.
 */

export type VehicleNote = { id: string; note: string; vin: string | null; createdAt: string; createdBy: string | null; authorName: string | null };

export async function listVehicleNotes(v: Vehicle): Promise<VehicleNote[]> {
  const { data, error } = await supabase
    .from('vehicle_notes')
    .select('id, note, vin, created_at, created_by, author:profiles!vehicle_notes_created_by_fkey ( full_name )')
    .eq('model_year', Number(v.year))
    .ilike('make', ilikeLiteral(v.make))
    .ilike('model', ilikeLiteral(v.model))
    .order('created_at', { ascending: false })
    .limit(200);
  check(error, 'Could not load shop notes');
  return (data ?? []).map((r) => ({
    id: r.id as string,
    note: r.note as string,
    vin: (r.vin as string | null) ?? null,
    createdAt: r.created_at as string,
    createdBy: (r.created_by as string | null) ?? null,
    authorName: nameOf((r as { author?: unknown }).author),
  }));
}

export async function addVehicleNote(v: Vehicle, note: string, jobRef?: string | null): Promise<void> {
  const text = note.trim();
  if (!text) throw new Error('Write the note first.');
  if (text.length > 4000) throw new Error('Notes are limited to 4,000 characters.');
  const uid = await currentUserId();
  const { error } = await supabase.from('vehicle_notes').insert({
    model_year: Number(v.year),
    make: v.make.trim(),
    model: v.model.trim(),
    vin: v.vin || null,
    note: text,
    job_ref: jobRef && /^[A-Za-z0-9-]{3,40}$/.test(jobRef) ? jobRef : null,
    created_by: uid,
  });
  check(error, 'Could not save the note');
}

/** Admins only (the table's delete policy). */
export async function deleteVehicleNote(id: string): Promise<void> {
  const { data, error } = await supabase.from('vehicle_notes').delete().eq('id', id).select('id');
  check(error, 'Could not delete the note');
  if (!data?.length) throw new Error('Only an admin can delete shop notes.');
}
