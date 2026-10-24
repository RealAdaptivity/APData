/**
 * Manufacturer chassis (ABS, stability, steering), body and network codes
 * whose meaning depends on the make. The same code can mean different things
 * on a Ford and a Toyota, so every entry names the makes it applies to, and
 * the code page shows the meaning for the vehicle on the lift.
 *
 * Only codes whose meaning is widely documented for that make family are
 * here; anything else goes in the shop code book. Written for AP Data from
 * general diagnostic practice — confirm sub-codes and test values in the
 * factory service information.
 *
 * Only types are imported, so the node test runner loads it directly.
 */

import type { DtcEntry, Severity } from './dtcLibrary.ts';
import type { SystemId } from './systems.ts';

export type MakeDtcEntry = DtcEntry & {
  /** "Ford / Lincoln / Mercury" — shown on the code page. */
  makeLabel: string;
  /** Lower-case make names it applies to. */
  makes: string[];
};

type Family = { label: string; makes: string[] };

const GM: Family = { label: 'GM (Chevrolet, GMC, Buick, Cadillac)', makes: ['chevrolet', 'gmc', 'buick', 'cadillac', 'pontiac', 'saturn', 'hummer', 'oldsmobile'] };
const FORD: Family = { label: 'Ford / Lincoln / Mercury', makes: ['ford', 'lincoln', 'mercury'] };
const TOYOTA: Family = { label: 'Toyota / Lexus / Scion', makes: ['toyota', 'lexus', 'scion'] };
const CHRYSLER: Family = { label: 'Chrysler / Dodge / Jeep / Ram', makes: ['chrysler', 'dodge', 'jeep', 'ram'] };
const NISSAN: Family = { label: 'Nissan / Infiniti', makes: ['nissan', 'infiniti'] };
const HYUNDAI: Family = { label: 'Hyundai / Kia / Genesis', makes: ['hyundai', 'kia', 'genesis'] };

function entry(f: Family, e: DtcEntry): MakeDtcEntry {
  return { ...e, varies: false, makeLabel: f.label, makes: f.makes };
}

const WSS_CAUSES = [
  'Sensor wiring damaged where it flexes with suspension travel, or a corroded connector',
  'Rust lifting the sensor away from the tone ring, or a rusted or cracked tone ring',
  'Failed sensor',
  'Hub bearing with a built-in tone ring or magnetic encoder failing (play in the bearing changes the air gap)',
];

const WSS_CHECKS = [
  'Watch all four wheel speeds on the scan tool while driving slowly: the bad one drops out, reads low or spikes.',
  'Inspect the harness where it flexes near the wheel, and the connector for green corrosion.',
  'Check the sensor: AC volts while spinning the wheel on two-wire passive sensors, a square-wave signal on active sensors.',
  'Remove the sensor, clean rust from its bore, inspect the tone ring and check the bearing for play.',
];

function wheelSpeed(f: Family, code: string, corner: string, title: string, kind: 'circuit' | 'signal' = 'circuit'): MakeDtcEntry {
  return entry(f, {
    code,
    title,
    system: 'brakes',
    severity: 'medium',
    meaning:
      kind === 'circuit'
        ? `The ABS module saw an electrical fault in the ${corner} wheel speed sensor circuit — open, shorted, or a signal out of range. ABS and stability control are turned off; normal braking still works.`
        : `The ABS module saw the ${corner} wheel speed signal drop out or disagree with the other wheels while driving — the circuit tests fine, but the signal is missing or erratic. ABS and stability control are turned off; normal braking still works.`,
    symptoms: ['ABS, traction and stability lights on', 'Speedometer erratic on some vehicles', 'ABS clicking in at low speed when that sensor drops out'],
    causes: kind === 'circuit' ? WSS_CAUSES : [WSS_CAUSES[1], WSS_CAUSES[3], WSS_CAUSES[0], 'Wrong tire size on that wheel, or mismatched tires'],
    checks: WSS_CHECKS,
    articles: ['wheel-bearing-diagnosis'],
  });
}

function simple(f: Family, code: string, title: string, system: SystemId, severity: Severity, meaning: string, causes: string[], checks: string[], symptoms: string[] = [], articles?: string[]): MakeDtcEntry {
  return entry(f, { code, title, system, severity, meaning, symptoms, causes, checks, ...(articles ? { articles } : {}) });
}

const PUMP_CHECKS = [
  'Check the ABS pump fuse and the module’s power and ground with the circuit loaded.',
  'Command the pump on with the scan tool and listen for it; check the voltage at the motor connector while it is commanded.',
  'Look for corrosion in the module connector (it sits low, near road spray).',
];

const LOW_VOLT_CHECKS = [
  'Test the battery and charging system first: load-test the battery and check charging voltage at idle with loads on.',
  'Voltage-drop test the module’s power feed and ground while it is working.',
  'Clear the code; if it only returns after a weak start, the battery is the fault, not the module.',
];

const MAKE_ENTRIES: MakeDtcEntry[] = [
  // ---------------------------------------------------------------- GM
  simple(GM, 'C0110', 'Pump Motor Circuit Malfunction', 'brakes', 'medium', 'The brake control module (EBCM) saw a fault in the ABS pump motor circuit, or the pump did not run when commanded. ABS and stability control are off.', ['Pump motor fuse or relay', 'Corroded EBCM connector or ground', 'Seized or failed pump motor'], PUMP_CHECKS, ['ABS and stability lights on']),
  simple(GM, 'C0121', 'Valve Relay Circuit Malfunction', 'brakes', 'medium', 'The EBCM saw a fault in the circuit that powers its solenoid valves. ABS and stability control are off.', ['Low battery voltage or a poor EBCM ground', 'Blown fuse or corroded power feed', 'Internal EBCM fault'], LOW_VOLT_CHECKS, ['ABS and stability lights on']),
  simple(GM, 'C0161', 'ABS/TCS Brake Switch Circuit Malfunction', 'brakes', 'medium', 'The EBCM saw a brake switch signal that does not make sense — for example, braking detected by wheel speed with no brake switch signal.', ['Brake light switch out of adjustment or failed', 'Brake lamp fuse blown', 'Wiring fault to the switch'], ['Check that the brake lights work.', 'Watch the brake switch reading on the scan tool as the pedal is pressed.', 'Adjust or replace the switch at the pedal.'], ['ABS and traction lights on', 'Cruise control not working']),
  simple(GM, 'C0186', 'Lateral Accelerometer Circuit Malfunction', 'brakes', 'medium', 'The signal from the lateral (side-to-side) acceleration sensor, often combined with the yaw sensor, is missing or out of range. Stability control is off.', ['Sensor loose or knocked out of level under the console or seat', 'Connector or wiring fault', 'Failed sensor'], ['Check that the sensor is bolted tight and level.', 'Watch lateral g on the scan tool parked on level ground: it should read near zero.', 'Recalibrate after replacement.'], ['Stability control light on']),
  simple(GM, 'C0196', 'Yaw Rate Sensor Circuit Malfunction', 'brakes', 'medium', 'The yaw rate sensor signal is missing or out of range. Stability control is off.', ['Sensor loose or mounted crooked', 'Connector or wiring fault', 'Failed sensor'], ['Check the sensor mounting and connector.', 'Watch yaw rate on the scan tool parked: it should read near zero.', 'Calibrate after replacing the sensor.'], ['Stability control light on']),
  simple(GM, 'C0242', 'PCM Indicated Traction Control System Malfunction', 'brakes', 'medium', 'The engine computer told the brake module it cannot reduce engine torque for traction control, usually because the engine computer has its own code. The fix is in the engine codes, not the brake module.', ['Any engine fault that sets the check engine light (misfire, throttle, sensor codes)', 'Reduced-power or throttle faults'], ['Read and fix the engine computer codes first; C0242 usually clears once they are fixed.'], ['Traction and stability lights with the check engine light']),
  simple(GM, 'C0245', 'Wheel Speed Sensor Frequency Error', 'brakes', 'medium', 'A wheel speed signal changed frequency faster than a wheel can — signal noise or a dropout rather than a dead circuit.', ['Damaged tone ring or rust between the sensor and the ring', 'Loose or failing hub bearing', 'Chafed sensor wire picking up noise', 'Mismatched tire sizes'], WSS_CHECKS, ['ABS light, sometimes only on rough roads']),
  simple(GM, 'C0265', 'EBCM Relay Circuit', 'brakes', 'medium', 'The brake module’s internal relay for its valves or pump is not working — often a power supply problem to the module.', ['Low battery voltage or poor ground', 'Corroded module connector', 'Internal EBCM failure'], LOW_VOLT_CHECKS, ['ABS and stability lights on']),
  simple(GM, 'C0267', 'Pump Motor Circuit Open/Shorted', 'brakes', 'medium', 'The ABS pump motor circuit is open or shorted.', ['Pump fuse or power feed', 'Corroded connector', 'Failed pump motor'], PUMP_CHECKS, ['ABS and stability lights on']),
  simple(GM, 'C0281', 'Brake Switch Circuit', 'brakes', 'medium', 'The brake switch signal to the brake module is missing or does not agree with braking.', ['Brake light switch failed or out of adjustment', 'Fuse or wiring fault'], ['Check the brake lights.', 'Watch the switch on the scan tool and adjust or replace it.'], ['ABS and traction lights on', 'Cruise not working']),
  simple(GM, 'C0455', 'Steering Wheel Position Sensor Circuit', 'suspension', 'medium', 'The steering wheel position (angle) sensor signal is missing or out of range.', ['Sensor not calibrated after an alignment or column work', 'Connector or clockspring wiring fault', 'Failed sensor'], ['Check the steering angle on the scan tool with the wheels straight: it should read near zero.', 'Run the steering angle calibration.', 'Check the connector at the column.'], ['Stability control light on', 'Power steering warning on some models']),
  simple(GM, 'C0550', 'Electronic Control Unit Performance', 'brakes', 'medium', 'The module that set it (brake module or power steering module) failed its own internal self-test.', ['Internal module failure', 'Low or unstable supply voltage during the self-test'], ['Check battery and charging voltage, and the module’s power and grounds, first.', 'Check for service bulletins and software updates.', 'Replace and program the module only after power and ground are proven good.'], ['ABS or steering warning lights']),
  simple(GM, 'C0561', 'System Disabled Information Stored', 'brakes', 'low', 'An information code: the brake module turned stability control off because another fault is present. Look at the other codes.', ['Another chassis or engine code stored'], ['Fix the other stored codes; C0561 clears with them.'], ['Stability control light on']),
  simple(GM, 'C0710', 'Steering Position Signal Malfunction', 'suspension', 'medium', 'The steering position signal is missing, erratic or out of calibration.', ['Steering angle sensor not calibrated (after an alignment, column or steering gear work)', 'Connector or wiring fault', 'Failed sensor'], ['Calibrate the steering angle sensor with the scan tool.', 'Check the alignment: a crooked steering wheel confuses the system.', 'Check the connector at the column.'], ['Stability control light on']),
  simple(GM, 'C0896', 'Electronic Brake Control Module Voltage Range', 'brakes', 'medium', 'The brake module saw its supply voltage go outside the normal range, too low or too high.', ['Weak battery or poor battery terminals', 'Charging system fault', 'Poor ground or power feed to the module'], LOW_VOLT_CHECKS, ['ABS and stability lights, often after a weak start'], ['battery-charging-test', 'voltage-drop-testing']),
  simple(GM, 'B1000', 'Electronic Control Unit Performance', 'network', 'medium', 'The module that set it found an internal fault during its self-test.', ['Internal module failure', 'Low supply voltage during the self-test'], ['Check battery voltage and the module’s power and grounds first.', 'Check for software updates and bulletins before replacing the module.'], ['Features controlled by that module not working']),
  simple(GM, 'B1325', 'Device Power Circuit Low', 'starting_charging', 'medium', 'The module that set it saw its supply voltage drop below the normal range.', ['Weak battery or loose battery terminals', 'Charging system fault', 'High resistance in the module’s power feed'], LOW_VOLT_CHECKS, ['Several modules setting codes after a weak start'], ['battery-charging-test']),

  // ---------------------------------------------------------------- Ford
  simple(FORD, 'C1095', 'ABS Hydraulic Pump Motor Circuit Failure', 'brakes', 'medium', 'The ABS module saw a fault in the hydraulic pump motor circuit, or the pump did not run when commanded. ABS and stability control are off.', ['Pump fuse or power feed', 'Corroded module connector or ground', 'Failed pump motor'], PUMP_CHECKS, ['ABS light on']),
  wheelSpeed(FORD, 'C1145', 'right front', 'Right Front Wheel Speed Sensor Input Circuit Failure'),
  wheelSpeed(FORD, 'C1155', 'left front', 'Left Front Wheel Speed Sensor Input Circuit Failure'),
  wheelSpeed(FORD, 'C1165', 'right rear', 'Right Rear Wheel Speed Sensor Input Circuit Failure'),
  wheelSpeed(FORD, 'C1175', 'left rear', 'Left Rear Wheel Speed Sensor Input Circuit Failure'),
  simple(FORD, 'C1185', 'ABS Power Relay Output Circuit Failure', 'brakes', 'medium', 'The ABS module saw a fault in its power relay output circuit, which feeds the valves and pump.', ['Low battery voltage or poor ground', 'Blown fuse or corroded feed', 'Internal module fault'], LOW_VOLT_CHECKS, ['ABS light on']),
  wheelSpeed(FORD, 'C1233', 'left front', 'Left Front Wheel Speed Sensor Input Signal Missing', 'signal'),
  wheelSpeed(FORD, 'C1234', 'right front', 'Right Front Wheel Speed Sensor Input Signal Missing', 'signal'),
  wheelSpeed(FORD, 'C1235', 'right rear', 'Right Rear Wheel Speed Sensor Input Signal Missing', 'signal'),
  wheelSpeed(FORD, 'C1236', 'left rear', 'Left Rear Wheel Speed Sensor Input Signal Missing', 'signal'),
  simple(FORD, 'C1288', 'Pressure Transducer Main/Primary Input Circuit Failure', 'brakes', 'medium', 'The brake pressure sensor signal used by stability control is missing or out of range.', ['Connector or wiring fault at the sensor (often on the ABS unit or master cylinder)', 'Failed pressure sensor (often part of the ABS unit)'], ['Watch the brake pressure reading on the scan tool as the pedal is pressed: it should rise smoothly from zero.', 'Check the connector and wiring.', 'Check for service bulletins on the ABS unit.'], ['Stability control and ABS lights on']),
  simple(FORD, 'C1446', 'Brake Switch Circuit Failure', 'brakes', 'medium', 'The brake switch signal does not agree with braking, or the circuit is faulty.', ['Brake light switch failed or out of adjustment', 'Fuse or wiring fault'], ['Check the brake lights.', 'Watch the brake switch on the scan tool and replace or adjust it.'], ['ABS light', 'Cruise not working']),
  simple(FORD, 'B1317', 'Battery Voltage High', 'starting_charging', 'medium', 'The module that set it saw system voltage above the normal range — usually overcharging.', ['Charging system overcharging (voltage regulator)', 'A jump start or a battery charger left on', 'Poor ground causing a false reading'], ['Check charging voltage at the battery at idle and 2,000 rpm: it should stay under about 15 V.', 'Check the battery and alternator grounds.'], ['Bulbs burning out, battery smelling or bulging'], ['battery-charging-test']),
  simple(FORD, 'B1318', 'Battery Voltage Low', 'starting_charging', 'medium', 'The module that set it saw system voltage below the normal range.', ['Weak battery or loose terminals', 'Charging system fault', 'Parasitic drain flattening the battery overnight'], LOW_VOLT_CHECKS, ['Several modules setting codes', 'Slow cranking'], ['battery-charging-test', 'parasitic-draw-test']),
  simple(FORD, 'B1342', 'ECU Is Defective', 'network', 'medium', 'The module that set it failed its internal self-test. On some modules it sets with low voltage, so prove the power supply first.', ['Internal module failure', 'Low or unstable supply voltage during the self-test'], ['Check battery voltage and the module’s power and grounds first.', 'Clear it and see whether it returns; check for software updates.', 'Replace and program the module only if it returns with good power.'], ['Features from that module not working']),
  simple(FORD, 'B1600', 'PATS Ignition Key Transponder Signal Is Not Received', 'electrical', 'high', 'The anti-theft system (PATS) did not read a key chip when the key was turned. The engine will not start, or starts and stalls.', ['Key without a chip, or a damaged chip', 'Aftermarket key not programmed', 'Failed transceiver ring around the ignition', 'Wiring fault to the transceiver'], ['Try a second programmed key.', 'Check that the key is a programmed chip key, not a plain cut key.', 'Check power, ground and the signal wire at the transceiver around the lock cylinder.'], ['No start, theft light flashing']),
  simple(FORD, 'B1601', 'PATS Received Incorrect Key-Code From Ignition Key Transponder', 'electrical', 'high', 'The anti-theft system read a key chip it does not recognize.', ['Key not programmed to this vehicle', 'Key programmed to a replaced module'], ['Try another programmed key.', 'Program the key with a scan tool (two programmed keys allow self-programming on many Fords).'], ['No start, theft light flashing']),
  simple(FORD, 'B1602', 'PATS Received Invalid Format Of Key-Code From Ignition Key Transponder', 'electrical', 'high', 'The anti-theft system read a key chip but the data was garbled — a damaged chip or interference.', ['Damaged key chip', 'Another key or RFID tag on the key ring interfering', 'Transceiver fault'], ['Remove other keys and tags from the ring and retry.', 'Try another programmed key.'], ['No start, theft light flashing']),
  simple(FORD, 'B1681', 'PATS Transceiver Signal Is Not Received', 'electrical', 'high', 'The anti-theft module is not receiving the signal from the transceiver around the ignition.', ['Transceiver unplugged or failed', 'Wiring fault between transceiver and module'], ['Check the transceiver connector at the steering column.', 'Check its power, ground and signal wires.'], ['No start, theft light flashing']),
  simple(FORD, 'U2100', 'Initial Configuration Not Complete', 'network', 'medium', 'A module has not been configured with this vehicle’s options — common right after a module is replaced.', ['Replacement module not configured (programmable module installation not done)'], ['Run the module configuration (PMI) with the factory tool, with a battery maintainer connected.'], ['Features missing after a module replacement']),
  simple(FORD, 'U2101', 'Control Module Configuration Incompatible', 'network', 'medium', 'A module’s configuration does not match the vehicle — wrong options loaded, or a used module from another vehicle.', ['Used module from another vehicle', 'Configuration loaded for the wrong options'], ['Reconfigure the module with the vehicle’s as-built data.'], ['Features wrong or missing']),

  // ---------------------------------------------------------------- Toyota
  wheelSpeed(TOYOTA, 'C0200', 'right front', 'Right Front Speed Sensor Signal Malfunction'),
  wheelSpeed(TOYOTA, 'C0205', 'left front', 'Left Front Speed Sensor Signal Malfunction'),
  wheelSpeed(TOYOTA, 'C0210', 'right rear', 'Right Rear Speed Sensor Signal Malfunction'),
  wheelSpeed(TOYOTA, 'C0215', 'left rear', 'Left Rear Speed Sensor Signal Malfunction'),
  simple(TOYOTA, 'C0273', 'Open in ABS Motor Relay Circuit', 'brakes', 'medium', 'The ABS pump motor relay circuit is open — the pump cannot run.', ['Pump motor fuse', 'Corroded connector at the ABS actuator', 'Failed motor or relay'], PUMP_CHECKS, ['ABS, VSC and brake lights on']),
  simple(TOYOTA, 'C0274', 'Short to B+ in ABS Motor Relay Circuit', 'brakes', 'medium', 'The ABS pump motor relay circuit is shorted to battery voltage.', ['Shorted wiring', 'Internal actuator or relay fault'], PUMP_CHECKS, ['ABS, VSC and brake lights on']),
  simple(TOYOTA, 'C1201', 'Engine Control System Malfunction', 'brakes', 'medium', 'The engine computer has a fault, so stability control (VSC) and traction control are switched off. The fix is in the engine codes.', ['Any engine fault that sets the check engine light'], ['Read and fix the engine codes first; C1201 clears after they are fixed and the codes are cleared.'], ['VSC, TRAC and check engine lights together']),
  simple(TOYOTA, 'C1203', 'ECM Communication Circuit Malfunction', 'brakes', 'medium', 'The brake control computer and the engine computer do not agree on the vehicle’s configuration, or lost communication.', ['Wrong engine computer or skid control computer installed', 'Network wiring fault'], ['Check part numbers if a computer was replaced.', 'Check the network wiring between the computers.'], ['VSC and ABS lights on']),
  simple(TOYOTA, 'C1210', 'Zero Point Calibration of Yaw Rate Sensor Undone', 'brakes', 'low', 'The yaw rate sensor’s zero point has not been calibrated — expected after replacing the sensor, the skid control computer, or after battery or alignment work on some models.', ['Calibration not done after a repair'], ['Park on level ground and run the zero-point calibration (scan tool, or the factory jumper procedure on older models).'], ['VSC light on, slip light blinking']),
  simple(TOYOTA, 'C1336', 'Zero Point Calibration of Deceleration Sensor Undone', 'brakes', 'low', 'The deceleration (acceleration) sensor’s zero point has not been calibrated.', ['Calibration not done after a repair or battery disconnect'], ['Park on level ground and run the zero-point calibration.'], ['VSC light on']),
  simple(TOYOTA, 'C1241', 'Low Battery Positive Voltage', 'starting_charging', 'medium', 'The skid control computer saw its supply voltage drop too low.', ['Weak battery or loose terminals', 'Charging fault', 'Poor ground or power feed to the ABS actuator'], LOW_VOLT_CHECKS, ['ABS and VSC lights after a weak start'], ['battery-charging-test']),
  simple(TOYOTA, 'C1249', 'Open in Stop Light Switch Circuit', 'brakes', 'medium', 'The brake light switch signal circuit is open.', ['Brake light bulbs out (on some models the computer reads through the bulbs)', 'Failed or out-of-adjustment switch', 'Blown stop lamp fuse'], ['Check all brake lights work.', 'Check the switch and the stop lamp fuse.'], ['VSC and ABS lights on']),

  // ---------------------------------------------------------------- Chrysler
  simple(CHRYSLER, 'C121C', 'Torque Request Signal Denied', 'brakes', 'medium', 'The brake module asked the engine computer to cut torque for traction control and was refused — almost always because the engine computer has its own fault. Fix the engine codes first.', ['Any engine or throttle fault that sets the check engine light', 'Engine computer software (check bulletins)'], ['Read and fix the engine computer codes; C121C usually clears with them.', 'Check for engine computer software updates.'], ['Traction, stability and check engine lights together']),

  // ---------------------------------------------------------------- Nissan
  wheelSpeed(NISSAN, 'C1101', 'right rear', 'RR Sensor-1 (Right Rear Wheel Sensor Circuit)'),
  wheelSpeed(NISSAN, 'C1102', 'left rear', 'RL Sensor-1 (Left Rear Wheel Sensor Circuit)'),
  wheelSpeed(NISSAN, 'C1103', 'right front', 'FR Sensor-1 (Right Front Wheel Sensor Circuit)'),
  wheelSpeed(NISSAN, 'C1104', 'left front', 'FL Sensor-1 (Left Front Wheel Sensor Circuit)'),
  simple(NISSAN, 'C1111', 'Pump Motor', 'brakes', 'medium', 'The ABS pump motor or its circuit is faulty.', ['Pump motor fuse', 'Corroded actuator connector or ground', 'Failed motor'], PUMP_CHECKS, ['ABS and VDC lights on']),
  simple(NISSAN, 'C1143', 'Steering Angle Sensor Circuit', 'suspension', 'medium', 'The steering angle sensor signal is faulty or not calibrated.', ['Neutral position not adjusted after an alignment or steering work', 'Connector or wiring fault', 'Failed sensor'], ['Run the steering angle sensor neutral position adjustment.', 'Check the alignment and the connector at the column.'], ['VDC and slip lights on']),
  simple(NISSAN, 'C1155', 'Brake Fluid Level Low', 'brakes', 'high', 'The brake fluid level switch reads low. Low fluid usually means worn pads — or a leak.', ['Worn brake pads (fluid level drops as pads wear)', 'Brake fluid leak', 'Failed level switch or wiring'], ['Check the fluid level and the pad thickness.', 'Look for leaks at calipers, lines and the master cylinder.', 'Check the level switch if the fluid is full.'], ['Brake warning light', 'Soft pedal if leaking']),

  // ---------------------------------------------------------------- Hyundai / Kia
  wheelSpeed(HYUNDAI, 'C1200', 'left front', 'Wheel Speed Sensor Front-Left Open/Short'),
  wheelSpeed(HYUNDAI, 'C1203', 'right front', 'Wheel Speed Sensor Front-Right Open/Short'),
  wheelSpeed(HYUNDAI, 'C1206', 'left rear', 'Wheel Speed Sensor Rear-Left Open/Short'),
  wheelSpeed(HYUNDAI, 'C1209', 'right rear', 'Wheel Speed Sensor Rear-Right Open/Short'),
];

export const MAKE_DTC_ENTRIES: readonly MakeDtcEntry[] = MAKE_ENTRIES;

const MAKE_NORM = (s: string | null | undefined) => String(s ?? '').toLowerCase().trim();

/** The make-specific entry for a code on a vehicle of this make, if any. */
export function makeEntry(code: string, make: string | null | undefined): MakeDtcEntry | null {
  const m = MAKE_NORM(make);
  if (!m) return null;
  return MAKE_ENTRIES.find((e) => e.code === code && e.makes.includes(m)) ?? null;
}

/** Every make's meaning for a code. */
export function makeEntriesFor(code: string): MakeDtcEntry[] {
  return MAKE_ENTRIES.filter((e) => e.code === code);
}
