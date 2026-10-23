/**
 * Vehicle systems: how fixes, procedures, files and codes are grouped, the way
 * a repair manual's table of contents is. The ids are stored in the database
 * (repair_fixes.system, repair_procedures.system, repair_files.system), which
 * only checks their shape, so a new system here needs no migration — but an id
 * must never be renamed once records use it.
 *
 * No imports, so the node test runner loads it directly.
 */

export type SystemId =
  | 'maintenance'
  | 'engine'
  | 'driveability'
  | 'cooling'
  | 'emissions'
  | 'starting_charging'
  | 'electrical'
  | 'network'
  | 'brakes'
  | 'suspension'
  | 'transmission'
  | 'drivetrain'
  | 'hvac'
  | 'safety'
  | 'body'
  | 'hybrid_ev'
  | 'diesel'
  | 'other';

export type SystemInfo = { id: SystemId; label: string; short: string; blurb: string };

export const SYSTEMS: SystemInfo[] = [
  { id: 'maintenance', label: 'Maintenance', short: 'Maint.', blurb: 'Fluids, filters, belts, inspections' },
  { id: 'engine', label: 'Engine mechanical', short: 'Engine', blurb: 'Compression, timing, gaskets, oil pressure' },
  { id: 'driveability', label: 'Engine performance', short: 'Perf.', blurb: 'Misfire, fuel trim, air flow, ignition, fuel' },
  { id: 'cooling', label: 'Cooling system', short: 'Cooling', blurb: 'Overheating, leaks, fans, thermostat' },
  { id: 'emissions', label: 'Emissions & EVAP', short: 'Emissions', blurb: 'Catalyst, O2 sensors, EGR, EVAP leaks' },
  { id: 'starting_charging', label: 'Starting & charging', short: 'Charging', blurb: 'Battery, starter, alternator, draws' },
  { id: 'electrical', label: 'Electrical & lighting', short: 'Electrical', blurb: 'Circuits, lighting, power accessories' },
  { id: 'network', label: 'Modules & networks', short: 'Network', blurb: 'CAN bus, U codes, programming' },
  { id: 'brakes', label: 'Brakes & ABS', short: 'Brakes', blurb: 'Pads, rotors, hydraulics, ABS, parking brake' },
  { id: 'suspension', label: 'Steering & suspension', short: 'Susp.', blurb: 'Noises, alignment, ball joints, struts' },
  { id: 'transmission', label: 'Transmission', short: 'Trans.', blurb: 'Shifting, slipping, TCC, fluid' },
  { id: 'drivetrain', label: 'Drivetrain & 4WD', short: 'Drivetrain', blurb: 'Axles, bearings, differentials, transfer case' },
  { id: 'hvac', label: 'Heating & A/C', short: 'HVAC', blurb: 'A/C performance, heater, blend doors, blower' },
  { id: 'safety', label: 'Airbags & driver assist', short: 'SRS/ADAS', blurb: 'SRS, seat belts, cameras, radar' },
  { id: 'body', label: 'Body & interior', short: 'Body', blurb: 'Locks, windows, wipers, leaks, trim' },
  { id: 'hybrid_ev', label: 'Hybrid & EV', short: 'Hybrid/EV', blurb: 'High-voltage battery, inverter, charging' },
  { id: 'diesel', label: 'Diesel', short: 'Diesel', blurb: 'Injection, glow plugs, DPF, SCR/DEF' },
  { id: 'other', label: 'Other', short: 'Other', blurb: 'Anything that fits nowhere else' },
];

const BY_ID = new Map(SYSTEMS.map((s) => [s.id, s]));

export function systemInfo(id: string | null | undefined): SystemInfo {
  return BY_ID.get(id as SystemId) ?? { id: 'other', label: id ? String(id) : 'Other', short: 'Other', blurb: '' };
}

export function isSystemId(id: string): id is SystemId {
  return BY_ID.has(id as SystemId);
}
