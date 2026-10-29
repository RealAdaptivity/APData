import { supabase } from '../lib/supabase';
import { check } from '../lib/errors';
import { normalizeVin } from '../lib/vin';
import { validateEvent, type EventInput } from '../lib/vehicleReport';
import { currentUserId, textOrNull } from './common';

/** Vehicle history facts the shop records against a VIN (vehicle_history_events). */

export async function addHistoryEvent(rawVin: string, e: EventInput): Promise<void> {
  const vin = normalizeVin(rawVin);
  if (vin.length !== 17) throw new Error('Enter all 17 characters of the VIN.');
  const problem = validateEvent(e);
  if (problem) throw new Error(problem);
  const uid = await currentUserId();
  const miles = e.mileage.replace(/[,\s]/g, '');
  const { error } = await supabase.from('vehicle_history_events').insert({
    vin,
    kind: e.kind,
    event_date: e.date || null,
    mileage: miles ? Number(miles) : null,
    note: e.note.trim() || (e.kind === 'odometer' ? 'Odometer reading' : ''),
    source: textOrNull(e.source),
    created_by: uid,
  });
  check(error, 'Could not save that');
}

export async function deleteHistoryEvent(id: string): Promise<void> {
  const { data, error } = await supabase.from('vehicle_history_events').delete().eq('id', id).select('id');
  check(error, 'Could not delete that');
  if (!data?.length) throw new Error('Only the person who added this, or an admin, can delete it.');
}
