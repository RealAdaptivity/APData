/**
 * Generic network (U), body (B) and chassis (C) codes: the ones SAE J2012
 * defines the same way for every make. Titles follow the standard wording a
 * scan tool shows; meanings, causes and checks are written for AP Data from
 * general diagnostic practice.
 *
 * Make-specific chassis and body codes (most C1xxx and B1xxx) are in
 * dtcMakeCodes.ts, keyed by make, because the same code means different
 * things on a Ford and a Toyota.
 *
 * Only types are imported, so the node test runner loads it directly.
 */

import type { DtcEntry, Severity } from './dtcLibrary.ts';
import type { SystemId } from './systems.ts';

type Module = {
  code: string;
  who: string;
  /** In plain words: "the transfer case computer". */
  plain: string;
  system: SystemId;
  /** What stops working when it drops off the network. */
  affects: string[];
  severity?: Severity;
  extraCauses?: string[];
};

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function lostComm(m: Module): DtcEntry {
  return {
    code: m.code,
    title: `Lost Communication With ${m.who}`,
    system: m.system,
    severity: m.severity ?? 'medium',
    meaning: `Another module expected messages from the ${m.plain} and stopped hearing them. The ${m.plain} may have lost power or ground, its network wires may be broken, or it dropped out once during a low-voltage event such as a weak crank.`,
    symptoms: m.affects,
    causes: [
      `${cap(m.plain)} without power or ground (check its fuses and grounds first)`,
      ...(m.extraCauses ?? []),
      'Open or shorted network wiring, or a corroded connector at the module',
      'Low battery voltage during cranking (a history code only)',
      'Module failure',
    ],
    checks: [
      'Is the code current or history? A history U code after a dead battery or a jump start may only be a record of the low voltage.',
      `Try to talk to the ${m.plain} with the scan tool. If it answers, look at what was happening when the code set.`,
      'If it does not answer, check its fuses, powers and grounds with the circuit loaded before anything else.',
      'Check the network wires at its connector: CAN high about 2.5–3.5 V and CAN low about 1.5–2.5 V to ground, key on.',
      'Look for water in the connector and for aftermarket devices spliced into the network.',
    ],
    related: ['U0001', 'P0562'],
    articles: ['can-bus-diagnosis', 'battery-charging-test'],
  };
}

function invalidData(code: string, who: string, plain: string, system: SystemId): DtcEntry {
  return {
    code,
    title: `Invalid Data Received From ${who}`,
    system,
    severity: 'medium',
    meaning: `Messages from the ${plain} are arriving, but the data in them is invalid or flagged as faulty — usually because the ${plain} has a fault of its own and is marking its signal as bad.`,
    symptoms: ['Warning lights for the systems that use that data'],
    causes: [`A fault inside the ${plain} (read its own codes)`, 'Software mismatch after a module replacement or update', 'An intermittent network or power fault at that module'],
    checks: [`Read the codes stored in the ${plain} and fix those first.`, 'Check for software updates and service bulletins for both modules.', 'Check its power and ground with the circuit loaded.'],
    related: ['U0001', 'U0100'],
    articles: ['can-bus-diagnosis'],
  };
}

function bus(code: string, title: string, meaning: string, severity: Severity = 'high'): DtcEntry {
  return {
    code,
    title,
    system: 'network',
    severity,
    meaning,
    symptoms: ['Several warning lights at once', 'Gauges dropping out or modules not answering the scan tool', 'Possible no-start on vehicles whose immobilizer talks over that bus'],
    causes: [
      'A network wire shorted to ground, to voltage or to its partner wire',
      'An open network wire or a missing terminating resistor',
      'One failed module pulling the whole bus down',
      'Water in a connector, or an aftermarket device (remote start, tracker, stereo interface) spliced in',
      'Low system voltage',
    ],
    checks: [
      'Check battery voltage and the charging system first.',
      'High-speed CAN, key off: about 60 ohms between CAN high and CAN low at the DLC means both terminating resistors are present (120 = one missing).',
      'Key on: CAN high about 2.5–3.5 V and CAN low about 1.5–2.5 V to ground. Single-wire low-speed buses read differently: check the service information.',
      'Unplug modules on that bus one at a time; the bus coming back points at the last one unplugged.',
    ],
    related: ['U0001', 'U0073', 'U0100'],
    articles: ['can-bus-diagnosis'],
  };
}

function airbag(code: string, title: string, where: string): DtcEntry {
  return {
    code,
    title,
    system: 'safety',
    severity: 'critical',
    varies: false,
    meaning: `The airbag module found a fault in the ${where} deployment loop — the circuit that fires it. That airbag may not deploy in a crash, and the airbag light stays on.`,
    symptoms: ['Airbag warning light on', 'That airbag may not deploy in a crash'],
    causes: [
      where.startsWith('driver') ? 'Clockspring (spiral cable) worn through behind the steering wheel — the most common cause on driver loops' : 'Connector under the dash or seat loose or corroded',
      'Resistance in the loop too high (corroded terminals) or too low (shorted wires)',
      'Wiring chafed or pinched',
      'Failed airbag inflator (rare)',
    ],
    checks: [
      'Disconnect the battery and wait the time the service information gives before touching any airbag part.',
      'Read the code’s sub-type (resistance high, low, short to ground, short to voltage) — it says what to look for.',
      'Never measure an airbag with an ohmmeter. Use the correct load tool (resistor) in place of the airbag to see whether the fault moves.',
      'On driver loops, turn the wheel lock to lock with the scan tool on the live data: a dropping resistance points at the clockspring.',
    ],
    related: ['U0151'],
  };
}

export const GENERIC_NETWORK_BODY_CHASSIS: DtcEntry[] = [
  bus('U0002', 'High Speed CAN Communication Bus (Performance)', 'Errors on the high-speed CAN bus: messages are getting through, but corrupted or late.', 'medium'),
  bus('U0010', 'Medium Speed CAN Communication Bus', 'A module saw a fault on the medium-speed CAN bus, which usually carries body, comfort and infotainment messages.'),
  bus('U0019', 'Low Speed CAN Communication Bus', 'A module saw a fault on the low-speed (fault-tolerant) CAN bus, which usually carries body and comfort messages.', 'medium'),
  bus('U0028', 'Vehicle Communication Bus A', 'A module saw a fault on vehicle communication bus "A" — the network wires or a module pulling the bus down.'),
  bus('U0074', 'Control Module Communication Bus "B" Off', 'A module shut its connection to bus "B" because it saw too many errors.'),
  {
    code: 'U0300',
    title: 'Internal Control Module Software Incompatibility',
    system: 'network',
    severity: 'medium',
    meaning: 'A module found that its software or configuration does not match the other modules on the vehicle — common right after a module is replaced or reprogrammed.',
    symptoms: ['Warning lights after a module replacement', 'Features missing or not working', 'Possible no-start'],
    causes: ['Used or wrong-part-number module installed', 'Module not programmed or configured to this vehicle', 'Programming interrupted'],
    checks: ['Check the module part number against the vehicle build.', 'Program and configure the module with the factory tool, with a battery maintainer connected.', 'Check for software updates for the other modules.'],
    related: ['U0100'],
    articles: ['can-bus-diagnosis'],
  },

  lostComm({ code: 'U0102', who: 'Transfer Case Control Module', plain: 'transfer case computer', system: 'drivetrain', affects: ['4WD light flashing, 4WD will not engage or disengage'] }),
  lostComm({ code: 'U0103', who: 'Gear Shift Module', plain: 'shifter module', system: 'transmission', affects: ['Shifter or gear display not working, may not leave park'], severity: 'high' }),
  lostComm({ code: 'U0104', who: 'Cruise Control Module', plain: 'cruise control module', system: 'safety', affects: ['Cruise control and adaptive cruise not working'] }),
  lostComm({ code: 'U0107', who: 'Throttle Actuator Control Module', plain: 'throttle control module', system: 'driveability', affects: ['Reduced power or limp mode', 'Check engine light'], severity: 'high' }),
  lostComm({ code: 'U0109', who: 'Fuel Pump Control Module', plain: 'fuel pump control module', system: 'driveability', affects: ['No start, stalling or low power'], severity: 'high', extraCauses: ['Corroded module or connector (Ford modules above the spare tire are prone to this)'] }),
  lostComm({ code: 'U0122', who: 'Vehicle Dynamics Control Module', plain: 'stability control module', system: 'brakes', affects: ['Stability control and traction lights on'] }),
  lostComm({ code: 'U0123', who: 'Yaw Rate Sensor Module', plain: 'yaw rate sensor', system: 'brakes', affects: ['Stability control light on'], extraCauses: ['Sensor loose or knocked out of position under the console or seat'] }),
  lostComm({ code: 'U0124', who: 'Lateral Acceleration Sensor Module', plain: 'lateral acceleration sensor', system: 'brakes', affects: ['Stability control light on'] }),
  lostComm({ code: 'U0126', who: 'Steering Angle Sensor Module', plain: 'steering angle sensor', system: 'suspension', affects: ['Stability control and traction lights on', 'Power steering assist reduced on some vehicles'] }),
  lostComm({ code: 'U0128', who: 'Park Brake Control Module', plain: 'electric parking brake module', system: 'brakes', affects: ['Parking brake warning; the electric parking brake may not apply or release'], severity: 'high' }),
  lostComm({ code: 'U0129', who: 'Brake System Control Module', plain: 'brake control module', system: 'brakes', affects: ['Brake, ABS and stability lights on'], severity: 'high' }),
  lostComm({ code: 'U0131', who: 'Power Steering Control Module', plain: 'power steering module', system: 'suspension', affects: ['Power steering warning, heavy steering'], severity: 'high' }),
  lostComm({ code: 'U0132', who: 'Ride Level Control Module', plain: 'ride height / air suspension module', system: 'suspension', affects: ['Suspension warning, ride height not adjusting, vehicle sagging'] }),
  lostComm({ code: 'U0141', who: 'Body Control Module "A"', plain: 'body control module', system: 'network', affects: ['Lights, locks, wipers or other body features not working'] }),
  lostComm({ code: 'U0146', who: 'Gateway "A"', plain: 'gateway module', system: 'network', affects: ['Several modules unreachable from the DLC at once'], severity: 'high' }),
  lostComm({ code: 'U0156', who: 'Information Center "A"', plain: 'driver information display', system: 'electrical', affects: ['Message center or display blank'] }),
  lostComm({ code: 'U0159', who: 'Parking Assist Control Module "A"', plain: 'parking assist module', system: 'safety', affects: ['Park assist not working'] }),
  lostComm({ code: 'U0167', who: 'Vehicle Immobilizer Control Module', plain: 'immobilizer module', system: 'electrical', affects: ['No start, security light flashing'], severity: 'high' }),
  lostComm({ code: 'U0168', who: 'Vehicle Security Control Module', plain: 'security module', system: 'electrical', affects: ['No start or alarm problems'], severity: 'high' }),
  lostComm({ code: 'U0198', who: 'Telematic Control Module "A"', plain: 'telematics module', system: 'electrical', affects: ['Telematics, emergency call or remote features not working'], extraCauses: ['Telematics module with a dead backup battery'] }),
  lostComm({ code: 'U0199', who: 'Door Control Module "A"', plain: 'driver door module', system: 'body', affects: ['Windows, locks or mirrors on that door not working'], extraCauses: ['Wires broken in the door hinge harness (open and close the door while watching the data)'] }),
  lostComm({ code: 'U0200', who: 'Door Control Module "B"', plain: 'passenger door module', system: 'body', affects: ['Windows, locks or mirrors on that door not working'], extraCauses: ['Wires broken in the door hinge harness'] }),
  lostComm({ code: 'U0208', who: 'Seat Control Module "A"', plain: 'seat module', system: 'body', affects: ['Power seat or seat memory not working'] }),
  lostComm({ code: 'U0212', who: 'Steering Column Control Module', plain: 'steering column module', system: 'electrical', affects: ['Turn signals, wipers or steering-wheel buttons not working'] }),
  lostComm({ code: 'U0214', who: 'Remote Function Actuation', plain: 'keyless entry module', system: 'body', affects: ['Key fob or keyless entry not working'] }),
  lostComm({ code: 'U0230', who: 'Rear Gate Module', plain: 'power liftgate module', system: 'body', affects: ['Power liftgate not working'] }),
  lostComm({ code: 'U0235', who: 'Cruise Control Front Distance Range Sensor', plain: 'adaptive cruise radar', system: 'safety', affects: ['Adaptive cruise and forward collision warning off'], extraCauses: ['Radar connector damaged in a front-end repair'] }),
  lostComm({ code: 'U0293', who: 'Hybrid Powertrain Control Module', plain: 'hybrid control module', system: 'hybrid_ev', affects: ['Hybrid system warning, no ready mode'], severity: 'high' }),

  invalidData('U0402', 'TCM', 'transmission computer', 'transmission'),
  invalidData('U0416', 'Vehicle Dynamics Control Module', 'stability control module', 'brakes'),
  invalidData('U0418', 'Brake System Control Module', 'brake control module', 'brakes'),
  invalidData('U0420', 'Power Steering Control Module', 'power steering module', 'suspension'),
  invalidData('U0423', 'Instrument Panel Control Module', 'instrument cluster', 'electrical'),
  invalidData('U0428', 'Steering Angle Sensor Module', 'steering angle sensor', 'suspension'),

  ...(
    [
      ['P0556', 'Brake Booster Pressure Sensor Circuit Range/Performance', 'brake booster vacuum sensor', 'brakes', 'The brake booster vacuum (pressure) sensor reads something that does not fit the engine’s vacuum — a lazy sensor, or a real vacuum problem at the booster.', ['Cracked or collapsed booster vacuum hose, or a failed check valve', 'Weak vacuum pump (diesels and some turbo gas engines)', 'Failed sensor or wiring fault'], ['Compare the sensor reading with a vacuum gauge teed into the booster hose.', 'Check the hose and check valve.', 'Check the sensor’s 5-volt reference, signal and ground.']],
      ['P0615', 'Starter Relay Circuit', 'starter relay', 'starting_charging', 'The engine computer controls the starter relay and saw a fault in its control circuit — open, shorted, or not doing what it was told.', ['Failed starter relay', 'Corroded relay socket or fuse box terminals', 'Wiring fault between the computer and the relay'], ['Swap the starter relay with a matching one in the fuse box.', 'Check for the control signal at the relay while cranking.', 'Check the relay socket terminals for heat damage or corrosion.']],
    ] as const
  ).map(
    ([code, title, , system, meaning, causes, checks]): DtcEntry => ({
      code,
      title,
      system,
      severity: 'medium',
      meaning,
      symptoms: code === 'P0615' ? ['No crank or intermittent crank', 'Check engine light'] : ['Hard brake pedal', 'Check engine light'],
      causes: [...causes],
      checks: [...checks],
      related: code === 'P0615' ? ['P0562'] : [],
      ...(code === 'P0615' ? { articles: ['no-start-diagnosis'] } : {}),
    })
  ),

  airbag('B0001', 'Driver Frontal Stage 1 Deployment Control', 'driver front airbag (stage 1)'),
  airbag('B0002', 'Driver Frontal Stage 2 Deployment Control', 'driver front airbag (stage 2)'),
  airbag('B0010', 'Passenger Frontal Stage 1 Deployment Control', 'passenger front airbag (stage 1)'),
  airbag('B0011', 'Passenger Frontal Stage 2 Deployment Control', 'passenger front airbag (stage 2)'),
];
