import { supabase } from '../lib/supabase';
import { check } from '../lib/errors';
import type { Dated } from '../lib/ownerStats';

export type OwnerData = {
  staff: { id: string; name: string; role: string }[];
  fixes: { created_by: string | null; created_at: string; dtc_codes: string[] | null; make: string | null; model: string | null; job_ref: string | null }[];
  confirmations: Dated[];
  photos: Dated[];
  notes: Dated[];
  specs: Dated[];
  labor: { job_code: string; kind: string; hours: number | null; created_by: string | null; created_at: string }[];
  bookings: { reference_code: string; status: string | null; created_at: string }[];
};

const dated = (rows: { created_by?: string | null; user_id?: string | null; created_at: string }[] | null): Dated[] =>
  (rows ?? []).map((r) => ({ by: r.created_by ?? r.user_id ?? null, at: r.created_at }));

/** Everything the shop dashboard counts. Admin only in practice: bookings and profiles need admin to read in full. */
export async function loadOwnerData(): Promise<OwnerData> {
  const cutoff = new Date(Date.now() - 365 * 86_400_000).toISOString();
  const [staff, fixes, confirmations, photos, notes, specs, labor, bookings] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, role').in('role', ['admin', 'tech']),
    supabase.from('repair_fixes').select('created_by, created_at, dtc_codes, make, model, job_ref').gte('created_at', cutoff).limit(5000),
    supabase.from('repair_fix_confirmations').select('user_id, created_at').gte('created_at', cutoff).limit(5000),
    supabase.from('repair_files').select('created_by, created_at').gte('created_at', cutoff).limit(5000),
    supabase.from('vehicle_notes').select('created_by, created_at').gte('created_at', cutoff).limit(5000),
    supabase.from('vehicle_specs').select('created_by, created_at').gte('created_at', cutoff).limit(5000),
    supabase.from('labor_times').select('job_code, kind, hours, created_by, created_at').limit(10000),
    supabase.from('bookings').select('reference_code, status, created_at').gte('created_at', cutoff).limit(5000),
  ]);
  check(staff.error, 'Could not load the staff list');
  check(fixes.error, 'Could not load fixes');
  return {
    staff: (staff.data ?? []).map((p) => ({
      id: p.id as string,
      name: ((p.full_name as string | null) ?? '').trim() || ((p.email as string | null) ?? '').split('@')[0] || 'Staff',
      role: p.role as string,
    })),
    fixes: (fixes.data ?? []) as OwnerData['fixes'],
    confirmations: dated(confirmations.data as never),
    photos: dated(photos.data as never),
    notes: dated(notes.data as never),
    specs: dated(specs.data as never),
    labor: (labor.data ?? []) as OwnerData['labor'],
    bookings: (bookings.data ?? []) as OwnerData['bookings'],
  };
}
