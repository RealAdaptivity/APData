/**
 * The shop's job catalog: the standard jobs labor times are kept against.
 *
 * AP Data ships no labor times. Published labor guides are licensed data;
 * instead the shop builds its own: an admin sets the book hours it charges
 * (for all vehicles, a make, or a model), and every tech logs how long the job
 * really took. Over a few months that is a labor guide fitted to how this
 * shop works, on the vehicles it actually sees.
 *
 * `code` is stored in labor_times.job_code. Never rename a code once times
 * are logged against it; add a new one instead.
 *
 * No imports except the system id type, so the node test runner loads it.
 */

import type { SystemId } from './systems.ts';

export type LaborJob = {
  code: string;
  name: string;
  system: SystemId;
  /** What the time includes, or how to count it. */
  note?: string;
};

export const LABOR_JOBS: LaborJob[] = [
  // Maintenance
  { code: 'oil_change', name: 'Engine oil and filter change', system: 'maintenance' },
  { code: 'engine_air_filter', name: 'Engine air filter replace', system: 'maintenance' },
  { code: 'cabin_air_filter', name: 'Cabin air filter replace', system: 'maintenance' },
  { code: 'spark_plugs', name: 'Spark plugs replace (all)', system: 'maintenance', note: 'Includes removing and refitting coils / intake plenum where needed.' },
  { code: 'drive_belt', name: 'Serpentine / drive belt replace', system: 'maintenance' },
  { code: 'belt_tensioner', name: 'Drive belt tensioner replace', system: 'maintenance', note: 'Includes belt removal and refit.' },
  { code: 'coolant_flush', name: 'Coolant drain, fill and bleed', system: 'cooling' },
  { code: 'trans_fluid_service', name: 'Automatic transmission fluid service', system: 'transmission', note: 'Drain and fill; add time for a filter / pan gasket.' },
  { code: 'diff_fluid', name: 'Differential fluid service (one axle)', system: 'drivetrain' },
  { code: 'transfer_case_fluid', name: 'Transfer case fluid service', system: 'drivetrain' },
  { code: 'brake_fluid_flush', name: 'Brake fluid flush and bleed', system: 'brakes' },
  { code: 'tire_rotation', name: 'Tire rotation', system: 'maintenance' },
  { code: 'wiper_blades', name: 'Wiper blades replace', system: 'body' },
  { code: 'inspection', name: 'Multi-point / pre-purchase inspection', system: 'maintenance' },

  // Diagnostics
  { code: 'diag_engine', name: 'Check engine light diagnosis', system: 'driveability', note: 'First hour of diagnosis; log extra time separately.' },
  { code: 'diag_electrical', name: 'Electrical diagnosis (per hour)', system: 'electrical' },
  { code: 'diag_no_start', name: 'No-start diagnosis', system: 'driveability' },
  { code: 'diag_noise', name: 'Noise / vibration diagnosis', system: 'suspension' },
  { code: 'diag_ac', name: 'A/C performance diagnosis', system: 'hvac' },
  { code: 'diag_parasitic_draw', name: 'Parasitic draw diagnosis', system: 'starting_charging' },

  // Brakes
  { code: 'brake_pads_front', name: 'Front brake pads replace', system: 'brakes' },
  { code: 'brake_pads_rotors_front', name: 'Front brake pads and rotors replace', system: 'brakes' },
  { code: 'brake_pads_rear', name: 'Rear brake pads replace', system: 'brakes', note: 'Includes electronic parking brake service mode where fitted.' },
  { code: 'brake_pads_rotors_rear', name: 'Rear brake pads and rotors replace', system: 'brakes' },
  { code: 'brake_shoes_rear', name: 'Rear brake shoes replace (drum)', system: 'brakes' },
  { code: 'brake_caliper', name: 'Brake caliper replace (one)', system: 'brakes', note: 'Includes bleeding that wheel.' },
  { code: 'brake_hose', name: 'Brake hose replace (one)', system: 'brakes' },
  { code: 'master_cylinder', name: 'Brake master cylinder replace', system: 'brakes', note: 'Includes bench bleed and system bleed.' },
  { code: 'abs_wheel_sensor', name: 'ABS wheel speed sensor replace (one)', system: 'brakes' },

  // Starting and charging
  { code: 'battery', name: 'Battery replace', system: 'starting_charging', note: 'Includes battery registration where required.' },
  { code: 'alternator', name: 'Alternator replace', system: 'starting_charging' },
  { code: 'starter', name: 'Starter replace', system: 'starting_charging' },

  // Engine performance and ignition
  { code: 'ignition_coil', name: 'Ignition coil replace (one)', system: 'driveability' },
  { code: 'ignition_coils_all', name: 'Ignition coils replace (all)', system: 'driveability' },
  { code: 'o2_upstream', name: 'Upstream O2 / air-fuel sensor replace (one)', system: 'emissions' },
  { code: 'o2_downstream', name: 'Downstream O2 sensor replace (one)', system: 'emissions' },
  { code: 'maf_sensor', name: 'Mass air flow sensor replace', system: 'driveability' },
  { code: 'throttle_body_clean', name: 'Throttle body clean and relearn', system: 'driveability' },
  { code: 'throttle_body', name: 'Throttle body replace', system: 'driveability' },
  { code: 'crank_sensor', name: 'Crankshaft position sensor replace', system: 'driveability' },
  { code: 'cam_sensor', name: 'Camshaft position sensor replace (one)', system: 'driveability' },
  { code: 'vvt_solenoid', name: 'VVT oil control solenoid replace (one)', system: 'engine' },
  { code: 'fuel_pump', name: 'Fuel pump / module replace', system: 'driveability' },
  { code: 'fuel_filter', name: 'Fuel filter replace', system: 'driveability' },
  { code: 'fuel_injector', name: 'Fuel injector replace (one)', system: 'driveability' },
  { code: 'evap_purge_valve', name: 'EVAP purge valve replace', system: 'emissions' },
  { code: 'evap_vent_valve', name: 'EVAP canister vent valve replace', system: 'emissions' },
  { code: 'egr_valve', name: 'EGR valve replace / clean', system: 'emissions' },
  { code: 'catalytic_converter', name: 'Catalytic converter replace (one)', system: 'emissions' },
  { code: 'pcv_valve', name: 'PCV valve / hose replace', system: 'engine' },

  // Engine mechanical
  { code: 'valve_cover_gasket', name: 'Valve cover gasket replace (one side)', system: 'engine' },
  { code: 'intake_manifold_gasket', name: 'Intake manifold gasket replace', system: 'engine' },
  { code: 'oil_pan_gasket', name: 'Oil pan gasket replace', system: 'engine' },
  { code: 'timing_belt', name: 'Timing belt replace', system: 'engine', note: 'Add water pump separately if done together.' },
  { code: 'timing_chain', name: 'Timing chain set replace', system: 'engine' },
  { code: 'motor_mount', name: 'Engine mount replace (one)', system: 'engine' },
  { code: 'compression_test', name: 'Compression / leak-down test', system: 'engine' },

  // Cooling
  { code: 'thermostat', name: 'Thermostat replace', system: 'cooling', note: 'Includes coolant top-up and bleed.' },
  { code: 'water_pump', name: 'Water pump replace', system: 'cooling' },
  { code: 'radiator', name: 'Radiator replace', system: 'cooling' },
  { code: 'radiator_hose', name: 'Radiator hose replace (one)', system: 'cooling' },
  { code: 'cooling_fan', name: 'Cooling fan assembly replace', system: 'cooling' },
  { code: 'heater_core', name: 'Heater core replace', system: 'hvac' },

  // Steering and suspension
  { code: 'struts_front_pair', name: 'Front struts replace (pair)', system: 'suspension', note: 'Complete strut assemblies; alignment separate.' },
  { code: 'shocks_rear_pair', name: 'Rear shocks replace (pair)', system: 'suspension' },
  { code: 'control_arm_lower', name: 'Lower control arm replace (one)', system: 'suspension' },
  { code: 'ball_joint', name: 'Ball joint replace (one)', system: 'suspension' },
  { code: 'tie_rod_outer', name: 'Outer tie rod end replace (one)', system: 'suspension' },
  { code: 'tie_rod_inner', name: 'Inner tie rod replace (one)', system: 'suspension' },
  { code: 'sway_bar_links', name: 'Sway bar links replace (pair)', system: 'suspension' },
  { code: 'wheel_bearing_hub', name: 'Wheel bearing / hub replace (one)', system: 'drivetrain' },
  { code: 'cv_axle', name: 'CV axle replace (one)', system: 'drivetrain' },
  { code: 'alignment', name: 'Wheel alignment', system: 'suspension' },
  { code: 'power_steering_pump', name: 'Power steering pump replace', system: 'suspension' },

  // HVAC
  { code: 'ac_recharge', name: 'A/C evacuate and recharge', system: 'hvac' },
  { code: 'ac_compressor', name: 'A/C compressor replace', system: 'hvac', note: 'Includes evacuate and recharge.' },
  { code: 'ac_condenser', name: 'A/C condenser replace', system: 'hvac' },
  { code: 'blower_motor', name: 'Blower motor replace', system: 'hvac' },
  { code: 'blower_resistor', name: 'Blower motor resistor / module replace', system: 'hvac' },

  // Body and electrical
  { code: 'window_regulator', name: 'Window regulator / motor replace (one door)', system: 'body' },
  { code: 'door_lock_actuator', name: 'Door lock actuator replace (one door)', system: 'body' },
  { code: 'headlamp_bulb', name: 'Headlamp bulb replace (one)', system: 'electrical' },
  { code: 'headlamp_assembly', name: 'Headlamp assembly replace (one)', system: 'electrical' },
  { code: 'module_programming', name: 'Module programming / setup', system: 'network' },

  // Diesel
  { code: 'diesel_fuel_filters', name: 'Diesel fuel filters replace', system: 'diesel' },
  { code: 'glow_plugs', name: 'Glow plugs replace (all)', system: 'diesel' },
  { code: 'dpf_regen', name: 'DPF service regeneration', system: 'diesel' },
];

export const LABOR_JOB_BY_CODE: ReadonlyMap<string, LaborJob> = new Map(LABOR_JOBS.map((j) => [j.code, j]));

export function laborJob(code: string): LaborJob {
  return LABOR_JOB_BY_CODE.get(code) ?? { code, name: code.replace(/_/g, ' '), system: 'other' };
}

export function searchLaborJobs(query: string): LaborJob[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return LABOR_JOBS;
  return LABOR_JOBS.filter((j) => {
    const hay = `${j.name} ${j.code.replace(/_/g, ' ')} ${j.note ?? ''}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
