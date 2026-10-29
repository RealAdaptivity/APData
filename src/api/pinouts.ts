import { supabase } from '../lib/supabase';
import { check } from '../lib/errors';
import { ilikeLiteral, matchVehicle, vehicleColumns, type Vehicle, type VehicleMatch } from '../lib/vehicle';
import { cleanPins, pinOrder, readPins, validatePinout, type PinRow, type PinoutInput } from '../lib/pinouts';
import { currentUserId, nameOf, textOrNull } from './common';

/** Connector pinouts (connector_pinouts) the shop's techs record. */

export type Pinout = {
  id: string;
  model_year: number | null;
  make: string;
  model: string | null;
  engine: string | null;
  component: string;
  connector: string | null;
  view_from: 'harness' | 'component' | null;
  pins: PinRow[];
  notes: string | null;
  created_by: string | null;
  created_at: string;
  author: string | null;
};

export type PinoutForVehicle = Pinout & { match: VehicleMatch };

const SELECT = `id, model_year, make, model, engine, component, connector, view_from, pins, notes, created_by, created_at,
  author:profiles!connector_pinouts_created_by_fkey ( full_name )`;

type Row = Omit<Pinout, 'author' | 'pins'> & { author: unknown; pins: unknown };

const toPinout = (r: Row): Pinout => ({ ...r, pins: readPins(r.pins).sort((a, b) => pinOrder(a.pin, b.pin)), author: nameOf(r.author) });

/** Pinouts on this model within two years (and the same engine where both say), closest first. */
export async function pinoutsForVehicle(v: Vehicle): Promise<PinoutForVehicle[]> {
  const y = Number(v.year);
  const { data, error } = await supabase
    .from('connector_pinouts')
    .select(SELECT)
    .ilike('make', ilikeLiteral(v.make))
    .gte('model_year', y - 2)
    .lte('model_year', y + 2)
    .order('component')
    .limit(500);
  check(error, 'Could not load connector pinouts');
  const out: PinoutForVehicle[] = [];
  for (const r of (data ?? []) as unknown as Row[]) {
    const match = matchVehicle(v, r);
    if (!match || (match.tier !== 'exact' && match.tier !== 'near' && match.tier !== 'engine')) continue;
    out.push({ ...toPinout(r), match });
  }
  return out.sort((a, b) => b.match.rank - a.match.rank || a.component.localeCompare(b.component));
}

export async function getPinout(id: string): Promise<Pinout | null> {
  const { data, error } = await supabase.from('connector_pinouts').select(SELECT).eq('id', id).maybeSingle();
  check(error, 'Could not load that pinout');
  return data ? toPinout(data as unknown as Row) : null;
}

function columns(p: PinoutInput) {
  return {
    component: p.component.trim(),
    connector: textOrNull(p.connector),
    view_from: p.viewFrom || null,
    pins: cleanPins(p.pins).sort((a, b) => pinOrder(a.pin, b.pin)),
    notes: textOrNull(p.notes),
  };
}

export async function addPinout(v: Vehicle, p: PinoutInput): Promise<string> {
  const problem = validatePinout(p);
  if (problem) throw new Error(problem);
  const uid = await currentUserId();
  const cols = vehicleColumns(v);
  const { data, error } = await supabase
    .from('connector_pinouts')
    .insert({ ...cols, engine: textOrNull(p.engine) ?? cols.engine, ...columns(p), created_by: uid })
    .select('id')
    .single();
  check(error, 'Could not save the pinout');
  return (data as { id: string }).id;
}

export async function updatePinout(id: string, p: PinoutInput): Promise<void> {
  const problem = validatePinout(p);
  if (problem) throw new Error(problem);
  const { data, error } = await supabase
    .from('connector_pinouts')
    .update({ ...columns(p), engine: textOrNull(p.engine) })
    .eq('id', id)
    .select('id');
  check(error, 'Could not save the pinout');
  if (!data?.length) throw new Error('Only the tech who added this pinout, or an admin, can edit it.');
}

export async function deletePinout(id: string): Promise<void> {
  const { data, error } = await supabase.from('connector_pinouts').delete().eq('id', id).select('id');
  check(error, 'Could not delete the pinout');
  if (!data?.length) throw new Error('Only the tech who added this pinout, or an admin, can delete it.');
}
