import { supabase } from '../lib/supabase';
import { check } from '../lib/errors';
import { ilikeLiteral, matchVehicle, vehicleColumns, type Vehicle, type VehicleMatch } from '../lib/vehicle';
import { currentUserId, nameOf, textOrNull } from './common';

/** Vehicle specs (vehicle_specs): torque, fluids, capacities, recorded by techs and verified by a second tech. */

export type SpecCategory = 'torque' | 'fluid' | 'capacity' | 'electrical' | 'tire' | 'dimension' | 'other';

export const SPEC_CATEGORIES: { id: SpecCategory; label: string; examples: string }[] = [
  { id: 'fluid', label: 'Fluids', examples: 'Oil spec, coolant type, ATF type, brake fluid' },
  { id: 'capacity', label: 'Capacities', examples: 'Oil with filter, coolant, A/C refrigerant charge' },
  { id: 'torque', label: 'Torque', examples: 'Lug nuts, caliper bracket, drain plug, spark plugs' },
  { id: 'tire', label: 'Tires & wheels', examples: 'Tire size, pressure, lug pattern' },
  { id: 'electrical', label: 'Electrical', examples: 'Battery group, CCA, bulb numbers' },
  { id: 'dimension', label: 'Dimensions & clearances', examples: 'Rotor minimum thickness, plug gap, belt part number' },
  { id: 'other', label: 'Other', examples: 'Anything else worth writing down' },
];

export const SPEC_SOURCES = [
  'Factory service manual',
  'Owner’s manual',
  'Under-hood or door label',
  'Parts catalog / box',
  'Measured on the vehicle',
  'Other tech / shop',
];

export type Spec = {
  id: string;
  model_year: number;
  make: string;
  model: string;
  engine: string | null;
  category: SpecCategory | string;
  label: string;
  value: string;
  source: string | null;
  created_by: string | null;
  created_at: string;
  verified_by: string | null;
  verified_at: string | null;
  author: string | null;
  verifier: string | null;
};

export type SpecForVehicle = Spec & { match: VehicleMatch };

const SELECT = `id, model_year, make, model, engine, category, label, value, source, created_by, created_at, verified_by, verified_at,
  author:profiles!vehicle_specs_created_by_fkey ( full_name ),
  verifier:profiles!vehicle_specs_verified_by_fkey ( full_name )`;

type Row = Omit<Spec, 'author' | 'verifier'> & { author: unknown; verifier: unknown };

/**
 * Specs recorded on this model within two years, closest first. Specs from a
 * neighbouring year are shown but marked — they often carry over, but not always.
 */
export async function specsForVehicle(v: Vehicle): Promise<SpecForVehicle[]> {
  const y = Number(v.year);
  const { data, error } = await supabase
    .from('vehicle_specs')
    .select(SELECT)
    .ilike('make', ilikeLiteral(v.make))
    .gte('model_year', y - 2)
    .lte('model_year', y + 2)
    .order('label')
    .limit(1000);
  check(error, 'Could not load specs');
  const out: SpecForVehicle[] = [];
  for (const r of (data ?? []) as unknown as Row[]) {
    const match = matchVehicle(v, r);
    if (!match || (match.tier !== 'exact' && match.tier !== 'near')) continue;
    out.push({ ...r, author: nameOf(r.author), verifier: nameOf(r.verifier), match });
  }
  return out.sort((a, b) => b.match.rank - a.match.rank || a.label.localeCompare(b.label));
}

export type SpecInput = { category: string; label: string; value: string; source: string; engine: string };

export function validateSpec(s: SpecInput): string | null {
  if (!s.label.trim()) return 'Say what the spec is for (for example “Lug nut torque”).';
  if (!s.value.trim()) return 'Enter the value with its unit (for example “140 ft-lb”).';
  if (s.label.length > 120 || s.value.length > 200) return 'That is too long for one spec.';
  return null;
}

export async function addSpec(v: Vehicle, s: SpecInput): Promise<void> {
  const problem = validateSpec(s);
  if (problem) throw new Error(problem);
  const uid = await currentUserId();
  const cols = vehicleColumns(v);
  const { error } = await supabase.from('vehicle_specs').insert({
    ...cols,
    engine: textOrNull(s.engine) ?? cols.engine,
    category: s.category,
    label: s.label.trim(),
    value: s.value.trim(),
    source: textOrNull(s.source),
    created_by: uid,
  });
  check(error, 'Could not save the spec');
}

export async function updateSpec(id: string, s: SpecInput): Promise<void> {
  const problem = validateSpec(s);
  if (problem) throw new Error(problem);
  const { data, error } = await supabase
    .from('vehicle_specs')
    .update({ category: s.category, label: s.label.trim(), value: s.value.trim(), source: textOrNull(s.source), engine: textOrNull(s.engine) })
    .eq('id', id)
    .select('id');
  check(error, 'Could not save the spec');
  if (!data?.length) throw new Error('Only the tech who added this spec, or an admin, can edit it.');
}

export async function verifySpec(id: string): Promise<void> {
  const { error } = await supabase.rpc('verify_vehicle_spec', { p_spec_id: id });
  check(error, 'Could not verify the spec');
}

export async function deleteSpec(id: string): Promise<void> {
  const { data, error } = await supabase.from('vehicle_specs').delete().eq('id', id).select('id');
  check(error, 'Could not delete the spec');
  if (!data?.length) throw new Error('Only the tech who added this spec, or an admin, can delete it.');
}
