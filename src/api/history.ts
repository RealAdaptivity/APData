import { supabase } from '../lib/supabase';
import { normalizeVin } from '../lib/vin';
import { buildTimeline, type HistoryEntry, type HistoryRows } from '../lib/history';

/**
 * Everything recorded against one VIN. Jobs come from the Adaptivity bookings
 * (admins and techs can read them); quotes and receipts only answer for admins
 * (their row-level security), so a tech's history simply has none of those.
 * A table that refuses or is missing is left out rather than failing the page.
 */
export async function historyForVin(rawVin: string): Promise<{ entries: HistoryEntry[]; partial: boolean }> {
  const vin = normalizeVin(rawVin);
  if (vin.length !== 17) throw new Error('Enter all 17 characters of the VIN.');
  let partial = false;
  const settle = async <T,>(q: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> => {
    const { data, error } = await q;
    if (error) {
      partial = true;
      return [];
    }
    return data ?? [];
  };

  const [jobs, receipts, quotes, fixes, confirmations, notes] = await Promise.all([
    settle<HistoryRows['jobs'][number]>(
      supabase
        .from('bookings')
        .select('reference_code, created_at, preferred_date, status, services, issue_description, vehicle_description')
        .ilike('vin', vin)
        .order('created_at', { ascending: false })
        .limit(100)
    ),
    settle<HistoryRows['receipts'][number]>(
      supabase.from('receipts').select('receipt_number, paid_on, created_at, total_cents, line_items, notes').ilike('vin', vin).limit(100)
    ),
    settle<HistoryRows['quotes'][number]>(supabase.from('quotes').select('quote_number, created_at, status, total_cents, line_items').ilike('vin', vin).limit(100)),
    settle<HistoryRows['fixes'][number]>(
      supabase.from('repair_fixes').select('id, created_at, mileage, dtc_codes, root_cause, fix, job_ref').ilike('vin', vin).limit(100)
    ),
    settle<{ fix_id: string; created_at: string; note: string | null; fix: unknown }>(
      supabase.from('repair_fix_confirmations').select('fix_id, created_at, note, fix:repair_fixes ( root_cause )').ilike('vin', vin).limit(100)
    ),
    settle<HistoryRows['notes'][number]>(supabase.from('vehicle_notes').select('id, created_at, note, job_ref').ilike('vin', vin).limit(100)),
  ]);

  const rootOf = (f: unknown) => {
    const one = Array.isArray(f) ? f[0] : f;
    return (one as { root_cause?: string } | null)?.root_cause ?? null;
  };
  const entries = buildTimeline({
    jobs,
    receipts,
    quotes,
    fixes,
    confirmations: confirmations.map((c) => ({ fix_id: c.fix_id, created_at: c.created_at, note: c.note, root_cause: rootOf(c.fix) })),
    notes,
  });
  return { entries, partial };
}
