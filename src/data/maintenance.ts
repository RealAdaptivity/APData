/**
 * Typical maintenance intervals: what most automakers schedule, in miles and
 * months, for normal and severe service. Written for AP Data from common
 * owner's-manual practice — the vehicle's own schedule (owner's manual or
 * maintenance minder) always wins, and the page says so.
 *
 * Severe service is what most of the shop's customers actually do: short
 * trips, stop-and-go, towing, dusty or very hot or cold weather, rideshare.
 *
 * No imports, so the node test runner loads it directly.
 */

export type Applies = 'all' | 'gas' | 'diesel' | 'turbo' | 'awd' | 'automatic' | 'cvt' | 'hybrid' | 'belt' | 'hydraulic-steering';

export type MaintenanceItem = {
  id: string;
  name: string;
  /** Normal service. */
  miles: number | null;
  months: number | null;
  /** Severe service, when it differs. */
  severeMiles?: number | null;
  severeMonths?: number | null;
  applies: Applies;
  /** What to tell the tech or customer about it. */
  note: string;
  /** Labor guide job code (src/data/laborJobs.ts), when there is one. */
  laborJob?: string;
  /** Component location id, when there is one. */
  location?: string;
};

export const APPLIES_LABEL: Record<Applies, string> = {
  all: '',
  gas: 'Gas engines',
  diesel: 'Diesels',
  turbo: 'Turbo engines',
  awd: 'AWD and 4WD',
  automatic: 'Automatic transmissions',
  cvt: 'CVT transmissions',
  hybrid: 'Hybrids',
  belt: 'Engines with a timing belt',
  'hydraulic-steering': 'Hydraulic power steering',
};

export const MAINTENANCE: MaintenanceItem[] = [
  { id: 'oil', name: 'Engine oil and filter', miles: 7500, months: 12, severeMiles: 5000, severeMonths: 6, applies: 'all', note: 'Use the oil-life monitor where fitted, with the viscosity and spec on the oil cap or in the manual. Turbo and direct-injection engines are hard on oil — stay on the severe interval.', laborJob: 'oil_change', location: 'oil-filter' },
  { id: 'rotate', name: 'Tire rotation and pressure check', miles: 6000, months: 6, laborJob: 'tire_rotation', applies: 'all', note: 'Check tread depth and wear pattern; relearn TPMS positions where needed.', location: 'tpms' },
  { id: 'inspect', name: 'Multi-point inspection', miles: 6000, months: 6, applies: 'all', note: 'Brakes, tires, fluids, belts, hoses, lights, wipers, suspension and leaks — with every oil change.' },
  { id: 'cabin-filter', name: 'Cabin air filter', miles: 15000, months: 12, severeMiles: 10000, laborJob: 'cabin_air_filter', applies: 'all', note: 'Sooner where there is dust, pollen or a smell from the vents.', location: 'cabin-filter' },
  { id: 'air-filter', name: 'Engine air filter', miles: 30000, months: 36, severeMiles: 15000, severeMonths: 18, laborJob: 'engine_air_filter', applies: 'all', note: 'Dusty or gravel roads: check at every oil change.', location: 'air-filter' },
  { id: 'wipers', name: 'Wiper blades', miles: null, months: 12, laborJob: 'wiper_blades', applies: 'all', note: 'Replace when streaking or chattering.' },
  { id: 'battery', name: 'Battery and charging test', miles: null, months: 12, laborJob: 'battery', applies: 'all', note: 'Test yearly once the battery is three years old; clean the terminals.', location: 'battery' },
  { id: 'brake-fluid', name: 'Brake fluid flush', miles: null, months: 36, severeMonths: 24, applies: 'all', note: 'Brake fluid absorbs water. Test it with a strip or meter; flush per the manual (often every 2–3 years).', laborJob: 'brake_fluid_flush', location: 'brake-master' },
  { id: 'brakes', name: 'Brake pads and rotors inspection', miles: 12000, months: 12, applies: 'all', note: 'Measure pad thickness and rotor condition; service slide pins on vehicles in salted states.' },
  { id: 'alignment', name: 'Alignment check', miles: 12000, months: 12, laborJob: 'alignment', applies: 'all', note: 'And after any pothole hit, new tires or steering and suspension parts.' },
  { id: 'serpentine', name: 'Drive belt and tensioner inspection', miles: 60000, months: 60, laborJob: 'drive_belt', applies: 'all', note: 'Replace at cracks, glazing or noise; many belts last about 90,000 miles.', location: 'alternator' },
  { id: 'spark-plugs', name: 'Spark plugs', miles: 100000, months: null, severeMiles: 60000, applies: 'gas', note: 'Iridium and platinum plugs usually 60,000–120,000 miles; copper plugs about 30,000. Turbo engines often sooner.', laborJob: 'spark_plugs', location: 'coils' },
  { id: 'coolant', name: 'Engine coolant', miles: 100000, months: 120, severeMiles: 60000, severeMonths: 60, laborJob: 'coolant_flush', applies: 'all', note: 'Long-life coolant: first change about 100,000 miles / 10 years, then about every 50,000 / 5 years. Use the coolant type the manual names.', location: 'radiator' },
  { id: 'atf', name: 'Automatic transmission fluid', miles: 60000, months: null, severeMiles: 30000, laborJob: 'trans_fluid_service', applies: 'automatic', note: '“Lifetime” fill means the warranty, not the transmission. Towing or hot climates: the severe interval. Use the exact fluid spec.', location: 'trans-fluid' },
  { id: 'cvt', name: 'CVT fluid', miles: 60000, months: null, severeMiles: 30000, laborJob: 'trans_fluid_service', applies: 'cvt', note: 'CVTs are fluid-sensitive: use only the maker’s fluid (Nissan NS-3, Honda HCF-2, Toyota FE…).', location: 'trans-fluid' },
  { id: 'diff', name: 'Differential and transfer case fluid', miles: 50000, months: null, severeMiles: 30000, laborJob: 'diff_fluid', applies: 'awd', note: 'Includes the AWD power transfer unit (PTU) on crossovers, which is often forgotten. Towing: the severe interval.', location: 'differential' },
  { id: 'timing-belt', name: 'Timing belt (and water pump)', miles: 90000, months: 84, severeMiles: 60000, laborJob: 'timing_belt', applies: 'belt', note: 'Only engines with a timing belt — most newer engines use a chain. An interference engine bends valves if the belt breaks: replace on time, with the tensioner, idlers and usually the water pump.', location: 'water-pump' },
  { id: 'fuel-filter-diesel', name: 'Diesel fuel filter and water separator', miles: 20000, months: 24, severeMiles: 10000, severeMonths: 12, laborJob: 'diesel_fuel_filters', applies: 'diesel', note: 'Drain the water separator at every oil change; water in diesel fuel destroys injectors and pumps.' },
  { id: 'def', name: 'DEF level and diesel aftertreatment check', miles: 7500, months: 6, severeMiles: 5000, applies: 'diesel', note: 'Top up DEF; check DPF soot load and regeneration history on the scan tool.' },
  { id: 'hybrid-filter', name: 'Hybrid battery cooling air filter', miles: 30000, months: 36, severeMiles: 15000, applies: 'hybrid', note: 'Usually behind a grille by the rear seat. A clogged filter overheats the hybrid battery.' },
  { id: 'hybrid-coolant', name: 'Hybrid inverter coolant', miles: 100000, months: 120, applies: 'hybrid', note: 'A separate cooling loop from the engine on most hybrids.' },
  { id: 'ps-fluid', name: 'Power steering fluid', miles: 60000, months: null, applies: 'hydraulic-steering', note: 'Check level and condition at every oil change; change when dark or burnt-smelling. Electric steering has none.' },
];

export type VehicleTraits = { diesel: boolean | null; turbo: boolean | null; hybrid: boolean | null };

/** Whether an item applies, as far as the engine text tells: true, false, or null (can't tell — show it, labelled). */
export function appliesTo(item: MaintenanceItem, t: VehicleTraits): boolean | null {
  switch (item.applies) {
    case 'all':
      return true;
    case 'gas':
      return t.diesel == null ? null : !t.diesel;
    case 'diesel':
      return t.diesel;
    case 'turbo':
      return t.turbo;
    case 'hybrid':
      return t.hybrid;
    default:
      return null;
  }
}

/** What the engine text says: "2.7L Turbo V6", "6.7L V8 Diesel", "2.5L Hybrid". */
export function traitsFromEngine(engine: string | null | undefined): VehicleTraits {
  const s = String(engine ?? '');
  if (!s.trim()) return { diesel: null, turbo: null, hybrid: null };
  return {
    diesel: /diesel|tdi|duramax|power ?stroke|cummins|ecodiesel/i.test(s),
    turbo: /turbo|ecoboost|tfsi|\btsi\b|supercharg/i.test(s),
    hybrid: /hybrid|plug-in|phev/i.test(s),
  };
}

export type DueState = { state: 'due' | 'soon' | 'later' | 'time'; atMiles: number | null };

/**
 * Where a vehicle at `miles` stands for an item with interval `every`, not
 * knowing when it was last done: due if it just passed a multiple of the
 * interval (within 10%), soon if the next multiple is within 1,500 miles,
 * otherwise later. Time-only items (wipers, brake fluid) are by age.
 */
export function dueAt(miles: number, every: number | null): DueState {
  if (!every || every <= 0) return { state: 'time', atMiles: null };
  const passed = Math.floor(miles / every) * every;
  if (passed > 0 && miles - passed <= every * 0.1) return { state: 'due', atMiles: passed };
  const next = passed + every;
  return { state: next - miles <= 1500 ? 'soon' : 'later', atMiles: next };
}

export function intervalText(miles: number | null | undefined, months: number | null | undefined): string {
  const parts = [miles ? `${miles.toLocaleString('en-US')} mi` : '', months ? (months % 12 === 0 ? `${months / 12} yr${months === 12 ? '' : 's'}` : `${months} mo`) : ''].filter(Boolean);
  return parts.length ? `every ${parts.join(' or ')}` : '';
}
