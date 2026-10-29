/**
 * Typical labor times for every job in the labor guide, so a quote never
 * starts blank. These are AP Data's own ranges from general shop practice —
 * not copied from any OEM, Mitchell or ALLDATA labor guide, which are
 * licensed. A shop book time, or enough of the shop's own logged times, always
 * replaces them.
 *
 * Ranges are for a typical car or light truck. Where the engine layout changes
 * the job a lot (spark plugs on a transverse V6, timing on a V8), a separate
 * range applies.
 *
 * No imports, so the node test runner loads it directly.
 */

export type Range = readonly [number, number];
export type TypicalTime = { base: Range; v6?: Range; v8?: Range; diesel?: Range; note?: string };

export const TYPICAL_TIMES: Record<string, TypicalTime> = {
  // Maintenance
  oil_change: { base: [0.3, 0.5], diesel: [0.6, 1.0] },
  engine_air_filter: { base: [0.1, 0.3] },
  cabin_air_filter: { base: [0.2, 0.5], note: 'Behind the glovebox on most; under the dash or cowl takes longer.' },
  spark_plugs: { base: [0.8, 1.3], v6: [1.5, 3.0], v8: [1.5, 2.5], note: 'Transverse V6 rear bank often needs the intake plenum off — the high end.' },
  drive_belt: { base: [0.3, 0.7], v8: [0.4, 0.8] },
  belt_tensioner: { base: [0.5, 1.0] },
  coolant_flush: { base: [0.8, 1.2], note: 'Includes bleeding the air out.' },
  trans_fluid_service: { base: [0.6, 1.0], note: 'Drain and fill; a pan and filter service is the high end.' },
  diff_fluid: { base: [0.4, 0.6] },
  transfer_case_fluid: { base: [0.4, 0.6] },
  brake_fluid_flush: { base: [0.8, 1.0], note: 'Some ABS units need a scan-tool bleed — add 0.3.' },
  tire_rotation: { base: [0.3, 0.5] },
  wiper_blades: { base: [0.1, 0.2] },
  inspection: { base: [0.8, 1.0] },

  // Diagnosis
  diag_engine: { base: [1.0, 1.0], note: 'First hour of diagnosis; more by authorization.' },
  diag_electrical: { base: [1.0, 1.0], note: 'Per hour.' },
  diag_no_start: { base: [1.0, 1.5] },
  diag_noise: { base: [1.0, 1.0] },
  diag_ac: { base: [1.0, 1.0] },
  diag_parasitic_draw: { base: [1.0, 2.0], note: 'Modules can take 20–60 minutes to sleep.' },

  // Brakes
  brake_pads_front: { base: [0.8, 1.2] },
  brake_pads_rotors_front: { base: [1.2, 1.8] },
  brake_pads_rear: { base: [0.8, 1.3], note: 'Electronic parking brake: scan tool to retract.' },
  brake_pads_rotors_rear: { base: [1.3, 2.0] },
  brake_shoes_rear: { base: [1.5, 2.2] },
  brake_caliper: { base: [0.8, 1.2], note: 'Includes bleeding that corner.' },
  brake_hose: { base: [0.6, 1.0] },
  master_cylinder: { base: [1.0, 1.6] },
  abs_wheel_sensor: { base: [0.5, 1.0], note: 'Seized sensors in rust-belt hubs run long.' },

  // Electrical / starting / charging
  battery: { base: [0.3, 0.6], note: 'Battery under a seat or in the trunk, or needing registration: the high end.' },
  alternator: { base: [1.0, 2.0], v6: [1.5, 2.5], v8: [1.2, 2.5] },
  starter: { base: [1.0, 2.0], v6: [1.5, 3.0], v8: [1.2, 2.5] },
  module_programming: { base: [0.5, 1.0] },
  headlamp_bulb: { base: [0.2, 0.5], note: 'Some need the bumper cover off — up to 1.5 h.' },
  headlamp_assembly: { base: [0.8, 1.8] },
  window_regulator: { base: [1.0, 1.5] },
  door_lock_actuator: { base: [1.0, 1.5] },

  // Engine performance
  ignition_coil: { base: [0.3, 0.5], v6: [0.3, 1.5], note: 'Rear-bank coils on a transverse V6 can need the plenum off.' },
  ignition_coils_all: { base: [0.5, 0.8], v6: [1.2, 2.5], v8: [0.8, 1.5] },
  o2_upstream: { base: [0.4, 0.8] },
  o2_downstream: { base: [0.4, 0.8] },
  maf_sensor: { base: [0.2, 0.3] },
  throttle_body_clean: { base: [0.4, 0.6], note: 'Includes the idle relearn.' },
  throttle_body: { base: [0.5, 1.0] },
  crank_sensor: { base: [0.5, 1.2], v8: [0.6, 1.5], note: 'Bellhousing or behind-the-balancer sensors run long.' },
  cam_sensor: { base: [0.3, 0.6] },
  vvt_solenoid: { base: [0.4, 1.2], v6: [0.6, 2.0] },
  fuel_pump: { base: [1.5, 2.5], note: 'Access panel under the seat: low end. Tank drop: high end, or more on trucks.' },
  fuel_filter: { base: [0.4, 0.8] },
  fuel_injector: { base: [1.0, 2.0], v6: [1.5, 3.0], v8: [1.5, 3.0], note: 'Direct-injection injectors: the high end or more.' },
  evap_purge_valve: { base: [0.3, 0.6] },
  evap_vent_valve: { base: [0.5, 1.0] },
  egr_valve: { base: [0.8, 1.5], diesel: [2.0, 4.0] },
  catalytic_converter: { base: [1.0, 1.8], note: 'Manifold-style converters: up to 3 h or more.' },
  pcv_valve: { base: [0.2, 0.6], note: 'Some are built into the valve cover — then it is a cover job.' },

  // Engine mechanical
  valve_cover_gasket: { base: [1.0, 1.5], v6: [1.2, 3.5], v8: [1.5, 3.0], note: 'Transverse V6 rear cover: the high end.' },
  intake_manifold_gasket: { base: [1.5, 3.0], v6: [3.0, 5.0], v8: [3.0, 5.5] },
  oil_pan_gasket: { base: [1.5, 3.0], note: 'Subframe or engine lift needed: up to 6 h.' },
  timing_belt: { base: [2.5, 4.0], v6: [3.5, 5.5], note: 'Add 0.3–0.5 h for the water pump when done together.' },
  timing_chain: { base: [5.0, 8.0], v6: [8.0, 14.0], v8: [8.0, 12.0], note: 'Varies the most of any job — some need the engine out.' },
  motor_mount: { base: [0.8, 1.5] },
  compression_test: { base: [0.8, 1.0], v6: [1.0, 2.0], v8: [1.0, 1.8] },

  // Cooling
  thermostat: { base: [0.8, 1.5], v6: [1.0, 2.0], v8: [1.0, 2.0] },
  water_pump: { base: [1.5, 3.0], v6: [2.0, 4.5], v8: [2.0, 3.5], note: 'Timing-chain-driven pumps can run 6 h or more.' },
  radiator: { base: [1.5, 2.5] },
  radiator_hose: { base: [0.5, 1.0] },
  cooling_fan: { base: [0.8, 1.5] },
  heater_core: { base: [3.0, 6.0], note: 'Many need the dash out: up to 10 h or more.' },

  // Steering and suspension
  struts_front_pair: { base: [2.0, 3.0], note: 'Add the alignment.' },
  shocks_rear_pair: { base: [0.8, 1.5] },
  control_arm_lower: { base: [1.0, 1.5] },
  ball_joint: { base: [1.0, 1.8] },
  tie_rod_outer: { base: [0.6, 1.0], note: 'Add the alignment.' },
  tie_rod_inner: { base: [0.8, 1.3], note: 'Add the alignment.' },
  sway_bar_links: { base: [0.5, 0.8] },
  wheel_bearing_hub: { base: [1.0, 1.8], note: 'Press-in bearings: up to 2.5 h.' },
  cv_axle: { base: [1.0, 1.5] },
  alignment: { base: [1.0, 1.2] },
  power_steering_pump: { base: [1.2, 2.0] },

  // HVAC
  ac_recharge: { base: [0.8, 1.2] },
  ac_compressor: { base: [2.0, 3.5], note: 'Includes evacuate and recharge.' },
  ac_condenser: { base: [1.5, 2.5], note: 'Includes evacuate and recharge.' },
  blower_motor: { base: [0.5, 1.2] },
  blower_resistor: { base: [0.3, 0.8] },

  // Diesel
  diesel_fuel_filters: { base: [0.5, 1.0] },
  glow_plugs: { base: [1.5, 3.0], diesel: [1.5, 4.0] },
  dpf_regen: { base: [1.0, 1.5] },
};

export type EngineKind = 'v6' | 'v8' | 'diesel' | 'other';

/** "3.5L Turbo V6", "5.3L V8", "6.7L V8 Diesel", "2.0L I4". */
export function engineKind(engine: string | null | undefined): EngineKind {
  const s = String(engine ?? '');
  if (/diesel|duramax|power ?stroke|cummins|tdi|ecodiesel/i.test(s)) return 'diesel';
  if (/\bV-?8\b|\b8 cyl/i.test(s)) return 'v8';
  if (/\bV-?6\b|\b6 cyl/i.test(s) && !/\b(I|L|inline)-?6\b/i.test(s)) return 'v6';
  return 'other';
}

/** `engine` is the engine kind whose own range was used, or 'other' for the base range. */
export type Typical = { low: number; high: number; hours: number; note?: string; engine: EngineKind };

/**
 * The typical range for a job on this engine, and the hours to quote from it:
 * the middle of the range, rounded to the tenth. Null for a job with no range.
 */
export function typicalFor(code: string, engine?: string | null): Typical | null {
  const t = TYPICAL_TIMES[code];
  if (!t) return null;
  const kind = engineKind(engine);
  const own = kind !== 'other' ? t[kind] : undefined;
  const [low, high] = own ?? t.base;
  return { low, high, hours: Math.round(((low + high) / 2) * 10) / 10, note: t.note, engine: own ? kind : 'other' };
}

export function rangeText(t: Pick<Typical, 'low' | 'high'>): string {
  return t.low === t.high ? `${t.low} h` : `${t.low}–${t.high} h`;
}
