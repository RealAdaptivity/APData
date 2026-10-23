/**
 * Generic OBD-II trouble codes: what the computer saw, what usually causes it,
 * and the order to check things in.
 *
 * Titles follow the standard generic (SAE J2012 / ISO 15031-6) wording a scan
 * tool shows, so a tech recognises them. Everything else — meanings, causes,
 * checks — is written for AP Data from general diagnostic practice. It is
 * deliberately vehicle-agnostic: factory test values, pinouts and specs come
 * from the OEM service information for the vehicle, and what this shop learned
 * on real jobs lives in Confirmed Fixes.
 *
 * Manufacturer codes (P1xxx, most B, C and U codes past the basics) mean
 * different things per make; techs record those in the shop code book
 * (dtc_definitions table).
 *
 * No imports except the system id type, so the node test runner loads it.
 */

import type { SystemId } from './systems.ts';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type DtcEntry = {
  code: string;
  title: string;
  system: SystemId;
  severity: Severity;
  /** What the computer actually detected, in plain words. */
  meaning: string;
  symptoms: string[];
  /** Most likely first. */
  causes: string[];
  /** In the order to do them: cheap and quick before expensive. */
  checks: string[];
  related?: string[];
  /** Built-in article slugs (src/data/articles.ts). */
  articles?: string[];
  /** True where the meaning differs between manufacturers. */
  varies?: boolean;
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  low: 'Low — emissions or comfort; fix when convenient',
  medium: 'Medium — affects running or economy; fix soon',
  high: 'High — can damage parts or strand the driver',
  critical: 'Critical — stop driving; risk of engine damage or safety',
};

const ORD = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

// ---------------------------------------------------------------------------
// Sensor circuit families
// ---------------------------------------------------------------------------

type SensorKind = 'thermistor' | 'potentiometer' | 'pressure' | 'maf' | 'position_pickup' | 'piezo' | 'level';

type SensorSpec = {
  name: string;
  /** What it tells the computer. */
  measures: string;
  kind: SensorKind;
  system: SystemId;
  extraCauses?: string[];
  extraChecks?: string[];
  articles?: string[];
};

type CircuitKind = 'circuit' | 'range' | 'low' | 'high' | 'intermittent';

const KIND_SEVERITY: Record<CircuitKind, Severity> = {
  circuit: 'medium',
  range: 'medium',
  low: 'medium',
  high: 'medium',
  intermittent: 'medium',
};

function circuitMeaning(s: SensorSpec, kind: CircuitKind): string {
  const base = `The ${s.name} reports ${s.measures}.`;
  switch (kind) {
    case 'circuit':
      return `${base} The computer saw a signal it cannot use at all — missing, stuck, or electrically impossible.`;
    case 'range':
      return `${base} The signal is electrically valid but does not make sense against what the other sensors say the engine is doing — a sensor that is lazy, skewed or stuck, or a real mechanical problem it is reporting correctly.`;
    case 'intermittent':
      return `${base} The signal dropped out or jumped for a moment and came back — the classic sign of a loose pin, a chafed wire or a failing sensor.`;
    case 'low':
      if (s.kind === 'thermistor') {
        return `${base} Signal voltage is below what a working sensor can produce, so the computer reads an impossibly HOT temperature. A thermistor reads hot when its signal is pulled to ground: look for a short to ground or a failed sensor.`;
      }
      return `${base} Signal voltage is below what a working sensor can produce. Usually the signal wire is open or shorted to ground, the 5-volt reference is missing, or the sensor has failed.`;
    case 'high':
      if (s.kind === 'thermistor') {
        return `${base} Signal voltage is above what a working sensor can produce, so the computer reads an impossibly COLD temperature. A thermistor reads cold when its circuit is open: look for an unplugged connector, a broken wire, a bad ground or a failed sensor.`;
      }
      return `${base} Signal voltage is above what a working sensor can produce. Usually the signal is shorted to a voltage source, the sensor ground is open, or the sensor has failed.`;
  }
}

function circuitCauses(s: SensorSpec, kind: CircuitKind): string[] {
  const common: Record<CircuitKind, string[]> = {
    circuit: ['Connector unplugged, corroded or with a spread terminal', 'Open or shorted wiring', 'Failed sensor', 'Shared 5-volt reference pulled down by another sensor on the same circuit'],
    range: ['Sensor skewed or slow (reads, but wrong)', 'A real mechanical fault the sensor is reporting', 'High resistance in the signal or ground circuit', 'Contamination or damage to the sensor element'],
    intermittent: ['Loose or corroded terminal (check pin fit, not just the connector)', 'Wiring chafed against a bracket or the engine', 'Failing sensor that cuts out when hot or under vibration'],
    low:
      s.kind === 'thermistor'
        ? ['Signal circuit shorted to ground', 'Failed sensor (internally shorted)', 'Wiring harness pinched or melted against the engine']
        : ['Signal circuit open or shorted to ground', 'Missing 5-volt reference (often shared with other sensors)', 'Failed sensor', 'Connector not fully seated'],
    high:
      s.kind === 'thermistor'
        ? ['Connector unplugged or terminals corroded', 'Open signal or ground circuit', 'Failed sensor (open)', 'Signal shorted to voltage']
        : ['Sensor ground circuit open or high resistance', 'Signal circuit shorted to a voltage source', 'Failed sensor'],
  };
  return [...(s.extraCauses ?? []), ...common[kind]];
}

function circuitChecks(s: SensorSpec, kind: CircuitKind): string[] {
  const checks: string[] = [
    'Record freeze frame data, then clear the code and see what brings it back (cold start, heat, a bump, a wiggle).',
    `Watch the ${s.name} reading on the scan tool. Does it make sense for the conditions? Does it jump when you wiggle the harness and connector?`,
  ];
  if (s.kind === 'thermistor') {
    checks.push(
      'Cold engine: compare this reading with the other temperature sensors (coolant, intake air, ambient). After an overnight soak they should agree within a few degrees.',
      'Unplug the sensor: the reading should go to its coldest value (open). Jumper signal to ground: it should go to its hottest value. If both happen, the wiring and computer are good — suspect the sensor.'
    );
  } else if (s.kind === 'maf') {
    checks.push(
      'Inspect the intake for leaks or a loose duct between the sensor and the throttle — air that skips the sensor reads as low airflow.',
      'Check MAF readings against engine size: at warm idle a rough rule is about 1 gram/second per liter of displacement, rising smoothly with RPM.',
      'Check power, ground and signal at the connector with the key on. Clean the element only with MAF-safe cleaner; never touch it.'
    );
  } else if (s.kind === 'piezo') {
    checks.push(
      'Check the sensor is torqued to specification and sits on a clean, flat boss — a loose knock sensor cannot hear the engine.',
      'Inspect the harness (often under the intake manifold) for oil or coolant soaking, chafing and rodent damage.',
      'Measure sensor resistance or capacitance and the harness for opens and shorts per the service information; with the engine idling, a light tap on the block near the sensor should show knock activity on the scan tool.'
    );
  } else if (s.kind === 'level') {
    checks.push(
      'Compare the gauge and scan-tool reading with the real amount of fuel (fill up and note the change).',
      'Measure the sending unit resistance at the tank connector and compare with the specification for empty and full.',
      'Check the connector at the tank for corrosion, and the circuit back to the module that reads it (cluster, BCM or engine computer).'
    );
  } else if (s.kind === 'position_pickup') {
    checks.push(
      'Inspect the sensor tip and the reluctor/tone ring for metal debris, damage or excess air gap.',
      'Scope the signal while cranking or running: look for missing or misshapen pulses rather than relying on a meter.',
      'Check power and ground at the connector (two-wire sensors: check resistance and the AC output instead).'
    );
  } else {
    checks.push(
      'Key on, engine off, backprobe the connector: about 5 volts on the reference, good ground (under 0.1 V drop to battery negative), and a plausible signal voltage.',
      'If the reference is low, unplug other sensors that share it one at a time — the one that brings the 5 volts back is the shorted one.',
      'With the circuit good, compare the reading to a known value (atmospheric pressure, a closed throttle, a full tank) to judge the sensor.'
    );
  }
  if (kind === 'range') {
    checks.push('Rule out the real mechanical cause the sensor might be correctly reporting before replacing it.');
  }
  return [...checks, ...(s.extraChecks ?? [])];
}

const CIRCUIT_TITLE: Record<CircuitKind, string> = {
  circuit: 'Circuit',
  range: 'Circuit Range/Performance',
  low: 'Circuit Low',
  high: 'Circuit High',
  intermittent: 'Circuit Intermittent',
};

function sensorFamily(
  s: SensorSpec,
  titleBase: string,
  codes: Partial<Record<CircuitKind, string>>,
  opts: { titles?: Partial<Record<CircuitKind, string>>; symptoms?: string[]; related?: string[]; severity?: Severity } = {}
): DtcEntry[] {
  const all = Object.values(codes).filter(Boolean) as string[];
  return (Object.entries(codes) as [CircuitKind, string][]).map(([kind, code]) => ({
    code,
    title: opts.titles?.[kind] ?? `${titleBase} ${CIRCUIT_TITLE[kind]}`,
    system: s.system,
    severity: opts.severity ?? KIND_SEVERITY[kind],
    meaning: circuitMeaning(s, kind),
    symptoms: opts.symptoms ?? ['Check engine light', 'Possible rough running or poor economy while the computer uses a default value'],
    causes: circuitCauses(s, kind),
    checks: circuitChecks(s, kind),
    related: [...new Set([...(opts.related ?? []), ...all.filter((c) => c !== code)])],
    articles: [...new Set(['sensor-circuit-testing', ...(s.articles ?? [])])],
  }));
}

const MAF: SensorSpec = {
  name: 'mass air flow (MAF) sensor',
  measures: 'how much air is entering the engine',
  kind: 'maf',
  system: 'driveability',
  extraCauses: ['Dirty or oil-contaminated MAF element (oiled air filters are a common cause)', 'Intake air leak after the MAF'],
  articles: ['fuel-trim-diagnosis', 'smoke-test-vacuum-evap'],
};
const MAP: SensorSpec = {
  name: 'manifold absolute pressure (MAP) sensor',
  measures: 'intake manifold pressure (engine load)',
  kind: 'pressure',
  system: 'driveability',
  extraCauses: ['Cracked, collapsed or disconnected vacuum hose to the sensor', 'Vacuum leak or restricted exhaust giving a real abnormal reading'],
  extraChecks: ['Key on, engine off, the MAP reading should equal barometric pressure (about 29–30 inHg / 101 kPa at sea level, less at altitude). At warm idle a healthy engine shows high vacuum (low absolute pressure).'],
  articles: ['smoke-test-vacuum-evap'],
};
const IAT: SensorSpec = {
  name: 'intake air temperature (IAT) sensor',
  measures: 'the temperature of the air entering the engine',
  kind: 'thermistor',
  system: 'driveability',
  extraCauses: ['Sensor built into the MAF: check the MAF connector and pins too'],
};
const ECT: SensorSpec = {
  name: 'engine coolant temperature (ECT) sensor',
  measures: 'engine coolant temperature, which drives fueling, idle, fans and the gauge',
  kind: 'thermistor',
  system: 'cooling',
  extraCauses: ['Low coolant leaving the sensor in an air pocket'],
  articles: ['cooling-system-pressure-test'],
};
const TPS_A: SensorSpec = {
  name: 'throttle position sensor (TPS) "A"',
  measures: 'how far the throttle plate is open',
  kind: 'potentiometer',
  system: 'driveability',
  extraCauses: ['Worn track in the sensor (dead spot)', 'Carbon or damage in an electronic throttle body'],
  extraChecks: ['Sweep the throttle slowly (engine off, key on, where safe for the system) and watch for a smooth reading with no dropouts.'],
  articles: ['throttle-body-service'],
};
const TPS_B: SensorSpec = { ...TPS_A, name: 'throttle position sensor (TPS) "B"' };
const KS1: SensorSpec = {
  name: 'knock sensor 1 (bank 1 or the only sensor)',
  measures: 'engine vibration in the frequency that detonation makes',
  kind: 'piezo',
  system: 'driveability',
  extraCauses: ['Sensor not torqued to spec (it must be tight to hear the block)', 'Harness under the intake damaged by coolant or rodents', 'Real knock from carbon, low octane fuel or overheating'],
};
const KS2: SensorSpec = { ...KS1, name: 'knock sensor 2 (bank 2)' };
const CKP: SensorSpec = {
  name: 'crankshaft position (CKP) sensor',
  measures: 'crankshaft speed and position, the base signal for spark and injection',
  kind: 'position_pickup',
  system: 'driveability',
  extraCauses: ['Damaged or loose reluctor ring', 'Metal debris on a magnetic sensor tip', 'Heat-related sensor failure (stalls hot, restarts cold)'],
  articles: ['no-start-diagnosis'],
};
const CMP_A1: SensorSpec = {
  name: 'camshaft position (CMP) sensor "A" (bank 1 or the only sensor)',
  measures: 'camshaft position, so the computer knows which cylinder is on its power stroke',
  kind: 'position_pickup',
  system: 'driveability',
  extraCauses: ['Timing chain stretch or a jumped tooth changing the cam-to-crank relationship', 'Oil leaking into the sensor connector'],
  articles: ['no-start-diagnosis', 'cam-crank-correlation'],
};
const CMP_A2: SensorSpec = { ...CMP_A1, name: 'camshaft position (CMP) sensor "A" (bank 2)' };
const CMP_B1: SensorSpec = { ...CMP_A1, name: 'camshaft position (CMP) sensor "B" (bank 1)' };
const FRP: SensorSpec = {
  name: 'fuel rail pressure (FRP) sensor "A"',
  measures: 'fuel pressure in the rail',
  kind: 'pressure',
  system: 'driveability',
  extraCauses: ['Real low or high fuel pressure being reported correctly'],
  extraChecks: ['Verify actual fuel pressure with a mechanical gauge (or, on direct injection, compare the low-side gauge and commanded vs. actual high-side values) before condemning the sensor.'],
  articles: ['fuel-pressure-testing'],
};
const EVAP_P: SensorSpec = {
  name: 'EVAP system pressure sensor',
  measures: 'pressure in the fuel tank vapor system during leak tests',
  kind: 'pressure',
  system: 'emissions',
  extraCauses: ['Sensor mounted on or in the tank: corroded connector from road spray'],
  articles: ['smoke-test-vacuum-evap'],
};
const FUEL_LEVEL: SensorSpec = {
  name: 'fuel level sensor "A"',
  measures: 'fuel level in the tank',
  kind: 'level',
  system: 'electrical',
  extraCauses: ['Worn resistor card on the sending unit (common at the levels the tank sits at most)', 'Corroded connector at the tank'],
};
const OIL_P: SensorSpec = {
  name: 'engine oil pressure sensor/switch',
  measures: 'engine oil pressure',
  kind: 'pressure',
  system: 'engine',
  extraCauses: ['Real low oil pressure: low oil level, wrong viscosity, worn pump or bearings'],
  extraChecks: ['ALWAYS confirm actual oil pressure with a mechanical gauge before blaming the sensor, and check the oil level first.'],
  articles: ['oil-pressure-test'],
};
const TFT: SensorSpec = {
  name: 'transmission fluid temperature (TFT) sensor',
  measures: 'transmission fluid temperature, which controls shift feel and converter lockup',
  kind: 'thermistor',
  system: 'transmission',
  extraCauses: ['Sensor is often part of the internal harness or valve body: may require pan removal'],
};
const ACP: SensorSpec = {
  name: 'A/C refrigerant pressure sensor',
  measures: 'high-side refrigerant pressure, which runs the compressor and cooling fans',
  kind: 'pressure',
  system: 'hvac',
  extraCauses: ['System empty or overcharged (real pressure out of range)'],
  articles: ['ac-performance-test'],
};

// ---------------------------------------------------------------------------
// Repeating families: misfire, injectors, coils, O2 sensors, gear ratios
// ---------------------------------------------------------------------------

function misfire(n: number): DtcEntry {
  const code = `P03${String(n).padStart(2, '0')}`;
  return {
    code,
    title: `Cylinder ${ORD[n]} Misfire Detected`,
    system: 'driveability',
    severity: 'high',
    meaning: `The computer watches crankshaft speed for the small slowdown a cylinder makes when it fails to fire. It counted enough of them on cylinder ${ORD[n]} to fail the misfire monitor. A single-cylinder misfire points at something that cylinder owns: its spark, its injector or its compression.`,
    symptoms: ['Shake or stumble, worst under load or at idle', 'Flashing check engine light when the misfire is bad enough to overheat the catalytic converter', 'Loss of power'],
    causes: [
      `Ignition coil or coil boot on cylinder ${ORD[n]} (cracked boot, carbon tracking)`,
      'Worn, fouled or wrongly gapped spark plug',
      `Injector on cylinder ${ORD[n]} clogged, leaking or not firing`,
      'Low compression: valve, rings, head gasket or a dropped valve seat',
      'Vacuum leak at that cylinder’s intake runner or gasket',
      'Collapsed lifter or worn cam lobe (common on some V8s with cylinder deactivation)',
    ],
    checks: [
      'Check freeze frame and Mode $06 misfire counters to see when it misfires (idle, load, cold).',
      `Swap the cylinder ${ORD[n]} coil with a neighbouring cylinder, clear codes and drive. If the misfire moves, it is the coil.`,
      'Pull and read the spark plug: oil, fuel washing, coolant (white, clean), or a cracked insulator each tell a different story.',
      'If the coil and plug are good, swap or test the injector (balance test, noid light, current ramp on a scope).',
      'Run a compression test (and a leak-down if low) on that cylinder.',
      'Smoke test the intake around that runner.',
    ],
    related: ['P0300', `P02${String(n).padStart(2, '0')}`, ...(n <= 8 ? [`P035${n}`] : [])],
    articles: ['misfire-diagnosis', 'compression-test', 'spark-plug-replacement'],
  };
}

function injector(n: number): DtcEntry {
  const code = `P02${String(n).padStart(2, '0')}`;
  return {
    code,
    title: `Cylinder ${ORD[n]} Injector Circuit/Open`,
    system: 'driveability',
    severity: 'high',
    meaning: `The computer drives each injector by switching its ground. On cylinder ${ORD[n]} it did not see the voltage change it expects when it switches, so the injector circuit is open, shorted, or the injector coil has failed. That cylinder is likely not getting fuel.`,
    symptoms: [`Misfire on that cylinder (often P03${String(n).padStart(2, '0')} as well)`, 'Rough idle, loss of power'],
    causes: ['Injector connector unplugged, broken lock tab or corroded pins', 'Open injector coil', 'Broken wire in the injector harness (often at a bend near the intake)', 'Failed injector driver in the computer (rare; usually after a shorted injector)'],
    checks: [
      'Inspect the connector and harness at that injector.',
      'Measure injector coil resistance and compare with the others on the engine (they should all be close).',
      'Use a noid light or scope on the harness side while cranking: you should see a pulse.',
      'Check the injector feed voltage (usually switched battery voltage, often fused and shared).',
    ],
    related: [`P03${String(n).padStart(2, '0')}`],
    articles: ['injector-circuit-testing', 'misfire-diagnosis'],
  };
}

const COIL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function coil(i: number): DtcEntry {
  const letter = COIL_LETTERS[i];
  return {
    code: `P035${i + 1}`,
    title: `Ignition Coil "${letter}" Primary/Secondary Circuit`,
    system: 'driveability',
    severity: 'high',
    meaning: `The computer monitors the ignition coil control circuit and did not see the coil charge and fire correctly on coil "${letter}" (on most engines, coil ${letter} is cylinder ${i + 1}; check the service information). Expect a misfire on that cylinder.`,
    symptoms: ['Misfire, rough idle', 'Flashing check engine light under load'],
    causes: ['Failed ignition coil', 'Coil connector loose or corroded', 'Open or shorted coil control wire', 'Loss of coil power feed (fuse or relay shared by the coils)'],
    checks: [
      'Check for a matching misfire code to identify the cylinder.',
      'Swap the coil with another cylinder. If the code follows the coil, replace the coil.',
      'If it stays, check the coil power feed and ground, then the control wire to the computer for opens and shorts.',
      'Scope the primary circuit if available: a weak or missing primary pattern confirms the circuit.',
    ],
    related: [`P030${i + 1}`],
    articles: ['misfire-diagnosis'],
  };
}

type O2Pos = { bank: 1 | 2; sensor: 1 | 2 };

const O2_NAME = ({ bank, sensor }: O2Pos) =>
  `bank ${bank} sensor ${sensor} oxygen sensor (${sensor === 1 ? 'upstream, before the catalytic converter' : 'downstream, after the catalytic converter'})`;
const O2_SUFFIX = ({ bank, sensor }: O2Pos) => `(Bank ${bank} Sensor ${sensor})`;

function o2Codes(pos: O2Pos, codes: { circuit: string; low: string; high: string; slow: string; none: string; heater: string; heaterControl?: string }): DtcEntry[] {
  const name = O2_NAME(pos);
  const sfx = O2_SUFFIX(pos);
  const upstream = pos.sensor === 1;
  const role = upstream
    ? 'It is the main feedback for fuel control: the computer trims fuel to keep it switching around stoichiometric.'
    : 'It watches the catalytic converter: a healthy cat makes this sensor read steady while the upstream one switches.';
  const all = Object.values(codes).filter(Boolean) as string[];
  const rel = (code: string) => [...all.filter((c) => c !== code), upstream ? 'P0171' : 'P0420'];
  const articles = ['o2-sensor-testing', 'fuel-trim-diagnosis'];
  const baseChecks = [
    'Look for exhaust leaks ahead of the sensor first — outside air pulled in at a leak makes any O2 sensor read lean.',
    'Watch the sensor live on the scan tool at 2,500 rpm, warm: an upstream narrowband sensor should switch rapidly between about 0.1 and 0.9 V; a wideband (air/fuel) sensor reports lambda near 1.00 or a current near 0 mA.',
    'Check fuel trims: a sensor that reports a real lean or rich condition correctly is not the problem.',
    'Inspect the wiring where it runs near the exhaust for melted insulation.',
  ];
  const entries: DtcEntry[] = [
    {
      code: codes.circuit,
      title: `O2 Sensor Circuit ${sfx}`,
      system: 'emissions',
      severity: 'medium',
      meaning: `The ${name} signal is outside what the computer can use. ${role}`,
      symptoms: ['Check engine light', upstream ? 'Possible poor economy while fuel control runs open loop' : 'Usually no drivability symptom'],
      causes: ['Failed sensor', 'Damaged wiring near the exhaust', 'Connector corrosion or pins pushed back', 'Exhaust leak ahead of the sensor'],
      checks: baseChecks,
      related: rel(codes.circuit),
      articles,
    },
    {
      code: codes.low,
      title: `O2 Sensor Circuit Low Voltage ${sfx}`,
      system: 'emissions',
      severity: 'medium',
      meaning: `The ${name} stayed at low voltage (lean) longer than it should. Either the mixture really is lean at the sensor, or the sensor or its signal circuit is pulling low.`,
      symptoms: ['Check engine light', 'Possible hesitation if the engine really is lean'],
      causes: ['Exhaust leak ahead of the sensor', 'Real lean condition (vacuum leak, low fuel pressure, dirty MAF)', 'Signal wire shorted to ground', 'Failed sensor'],
      checks: [
        ...baseChecks,
        'Make the engine rich (propane enrichment or a quick snap of the throttle): a good sensor goes high. If it does, the sensor is honest — find the lean condition.',
      ],
      related: rel(codes.low),
      articles,
    },
    {
      code: codes.high,
      title: `O2 Sensor Circuit High Voltage ${sfx}`,
      system: 'emissions',
      severity: 'medium',
      meaning: `The ${name} stayed at high voltage (rich, or above a sensor's possible range). Either the mixture really is rich at the sensor, the sensor is contaminated, or the signal is shorted to voltage.`,
      symptoms: ['Check engine light', 'Possible fuel smell, black smoke or poor economy if really rich'],
      causes: ['Real rich condition (leaking injector, high fuel pressure, fuel in the oil)', 'Sensor contaminated by coolant, oil or silicone', 'Signal shorted to heater voltage inside a failed sensor or in the harness', 'Failed sensor'],
      checks: [
        ...baseChecks,
        'Create a lean condition (pull a large vacuum hose briefly): a good sensor drops low. If it does, look for why the engine runs rich.',
      ],
      related: rel(codes.high),
      articles,
    },
    {
      code: codes.slow,
      title: `O2 Sensor Circuit Slow Response ${sfx}`,
      system: 'emissions',
      severity: 'low',
      meaning: `The ${name} switches, but too slowly between lean and rich. Aged and contaminated sensors get lazy before they fail outright.`,
      symptoms: ['Check engine light', 'Slight economy loss'],
      causes: ['Aged sensor (high mileage)', 'Sensor contaminated (oil burning, coolant, silicone, leaded fuel)', 'Exhaust leak ahead of the sensor', 'Wrong replacement sensor'],
      checks: [...baseChecks, 'Graph the sensor: lean-to-rich and rich-to-lean transitions should each take well under a tenth of a second on a healthy narrowband sensor.'],
      related: rel(codes.slow),
      articles,
    },
    {
      code: codes.none,
      title: `O2 Sensor Circuit No Activity Detected ${sfx}`,
      system: 'emissions',
      severity: 'medium',
      meaning: `The ${name} signal sat still near the middle (around 0.45 V on a narrowband sensor, the computer's own bias voltage) — as though the sensor is not connected or never warmed up.`,
      symptoms: ['Check engine light', upstream ? 'Fuel control stays open loop: poor economy' : 'Usually no drivability symptom'],
      causes: ['Sensor heater not working (sensor never gets hot enough)', 'Open signal or ground circuit', 'Failed sensor', 'Exhaust too cold (long idle in cold weather, stuck-open thermostat)'],
      checks: [...baseChecks, 'Check the heater circuit (fuse, power, ground, heater resistance) — a sensor that never heats up never switches.'],
      related: rel(codes.none),
      articles,
    },
    {
      code: codes.heater,
      title: `O2 Sensor Heater Circuit ${sfx}`,
      system: 'emissions',
      severity: 'low',
      meaning: `The ${name} has an electric heater so it works soon after a cold start. The computer saw the heater circuit current or voltage out of range.`,
      symptoms: ['Check engine light', 'Longer open-loop time after a cold start'],
      causes: ['Open heater element inside the sensor (most common)', 'Blown fuse for the O2 heaters (often shared — check for other heater codes)', 'Open or shorted heater wiring', 'Connector melted or corroded'],
      checks: [
        'Check the O2 heater fuse; a shared fuse that blew will set heater codes on several sensors.',
        'Unplug the sensor and measure heater resistance across the heater pins (usually low, a few ohms to a couple dozen — compare with the specification). Open = replace sensor.',
        'Key on: check for battery voltage on the heater feed and a switching ground from the computer.',
      ],
      related: rel(codes.heater),
      articles,
    },
  ];
  if (codes.heaterControl) {
    entries.push({
      code: codes.heaterControl,
      title: `HO2S Heater Control Circuit ${sfx}`,
      system: 'emissions',
      severity: 'low',
      meaning: `The computer switches the ground (or feed) of the ${name} heater, and saw that control circuit behave wrongly — open, shorted, or drawing the wrong current.`,
      symptoms: ['Check engine light'],
      causes: ['Open heater element', 'Blown O2 heater fuse', 'Heater control wire open or shorted', 'Corroded connector'],
      checks: [
        'Check the O2 heater fuse.',
        'Measure the heater resistance at the sensor and compare with specification.',
        'Check for power on the heater feed with the key on, and continuity of the control wire back to the computer.',
      ],
      related: rel(codes.heaterControl),
      articles,
    });
  }
  return entries;
}

function ratio(code: string, gear: string, title = `${gear} Incorrect Ratio`): DtcEntry {
  return {
    code,
    title,
    system: 'transmission',
    severity: 'high',
    meaning: `In ${gear.toLowerCase()}, the computer compared input (turbine) speed with output speed and the ratio did not match the gear — the transmission is slipping or not holding that gear.`,
    symptoms: ['Slipping or flare on shifts', 'Harsh or delayed engagement', 'Transmission in limp mode (stuck in one gear)'],
    causes: ['Low or burnt fluid', 'Worn clutch packs or bands for that gear', 'Sticking valve or worn bore in the valve body', 'Shift or pressure control solenoid fault', 'Faulty input or output speed sensor giving a false ratio'],
    checks: [
      'Check fluid level and condition by the method the manufacturer specifies (many need a temperature-controlled check).',
      'Check for speed sensor codes and watch input and output speeds on the scan tool — a dropping sensor signal looks like slipping.',
      'Check for TSBs and software updates for shift complaints on this transmission.',
      'Line pressure test if a port is available, and compare commanded vs. actual pressure on electronic units.',
    ],
    related: ['P0730', 'P0715', 'P0720', 'P0700'].filter((c) => c !== code),
    articles: ['transmission-fluid-check'],
  };
}

// ---------------------------------------------------------------------------
// The library
// ---------------------------------------------------------------------------

const ENTRIES: DtcEntry[] = [
  // ---- Variable valve timing ------------------------------------------------
  ...(
    [
      ['P0010', '"A" Camshaft Position Actuator Circuit (Bank 1)', 'circuit'],
      ['P0011', '"A" Camshaft Position - Timing Over-Advanced or System Performance (Bank 1)', 'advanced'],
      ['P0012', '"A" Camshaft Position - Timing Over-Retarded (Bank 1)', 'retarded'],
      ['P0013', '"B" Camshaft Position - Actuator Circuit (Bank 1)', 'circuit'],
      ['P0014', '"B" Camshaft Position - Timing Over-Advanced or System Performance (Bank 1)', 'advanced'],
      ['P0015', '"B" Camshaft Position - Timing Over-Retarded (Bank 1)', 'retarded'],
      ['P0020', '"A" Camshaft Position Actuator Circuit (Bank 2)', 'circuit'],
      ['P0021', '"A" Camshaft Position - Timing Over-Advanced or System Performance (Bank 2)', 'advanced'],
      ['P0022', '"A" Camshaft Position - Timing Over-Retarded (Bank 2)', 'retarded'],
    ] as const
  ).map(([code, title, kind]): DtcEntry => {
    if (kind === 'circuit') {
      return {
        code,
        title,
        system: 'driveability',
        severity: 'medium',
        meaning: 'The computer controls the cam phaser with an oil control solenoid. It saw the solenoid circuit open, shorted, or drawing the wrong current. "A" is usually the intake cam, "B" the exhaust cam.',
        symptoms: ['Check engine light', 'Rough idle or loss of power if the phaser sticks', 'Cam timing held in its default position'],
        causes: ['Failed oil control (VVT) solenoid', 'Solenoid connector loose, oil-soaked or corroded', 'Open or shorted solenoid wiring'],
        checks: [
          'Measure solenoid resistance (typically a few ohms — compare with the specification) and check for shorts to ground.',
          'Command the solenoid with a bidirectional scan tool and listen/feel for it clicking.',
          'Check the feed voltage and the control circuit back to the computer.',
        ],
        related: ['P0011', 'P0012', 'P0016'],
        articles: ['cam-crank-correlation'],
      };
    }
    return {
      code,
      title,
      system: 'engine',
      severity: 'high',
      meaning: `The computer commanded a cam position and the camshaft ended up ${kind === 'advanced' ? 'more advanced than commanded, or not following commands' : 'more retarded than commanded'}. Cam phasers are moved by engine oil, so oil level, quality and pressure come first.`,
      symptoms: ['Rough idle, stalling or poor power', 'Rattle at start-up on engines with worn phasers', 'Check engine light'],
      causes: ['Low oil level, wrong viscosity or sludged oil', 'Oil control solenoid sticking or its screen clogged', 'Worn or sticking cam phaser', 'Timing chain stretched or jumped a tooth', 'Low oil pressure'],
      checks: [
        'Check oil level and condition and confirm the correct viscosity. Many cases end with an oil change.',
        'Compare desired vs. actual cam angle on the scan tool while commanding the phaser.',
        'Remove and inspect the oil control solenoid and any oil screens for debris.',
        'Check cam/crank correlation values; if they are off at rest, inspect timing chain stretch and alignment marks.',
      ],
      related: ['P0010', 'P0016', 'P0017', 'P0520'],
      articles: ['cam-crank-correlation', 'oil-pressure-test'],
    };
  }),
  ...(
    [
      ['P0016', 'Bank 1 Sensor A'],
      ['P0017', 'Bank 1 Sensor B'],
      ['P0018', 'Bank 2 Sensor A'],
      ['P0019', 'Bank 2 Sensor B'],
    ] as const
  ).map(
    ([code, pos]): DtcEntry => ({
      code,
      title: `Crankshaft Position - Camshaft Position Correlation (${pos})`,
      system: 'engine',
      severity: 'high',
      meaning: 'The crank and cam sensor signals do not line up the way they should. Either the camshaft is genuinely out of time with the crankshaft (chain/belt stretch, a jumped tooth, a phaser stuck), or one of the signals is wrong.',
      symptoms: ['Hard start or long crank', 'Rough running, low power', 'Rattle from the timing cover on stretched-chain engines'],
      causes: ['Stretched timing chain or worn guides/tensioner', 'Belt or chain jumped a tooth', 'Cam phaser stuck out of its park position', 'Damaged reluctor wheel or wrong sensor', 'Low oil level or pressure affecting the phaser or tensioner'],
      checks: [
        'Check oil level and condition first.',
        'Read the cam/crank deviation values on the scan tool if the platform provides them.',
        'Scope crank and cam signals together and compare their relationship with a known-good pattern.',
        'Verify mechanical timing marks; measure chain stretch where the manufacturer gives a method.',
      ],
      related: ['P0011', 'P0335', 'P0340'],
      articles: ['cam-crank-correlation'],
    })
  ),

  // ---- Oxygen sensors ---------------------------------------------------------
  ...o2Codes({ bank: 1, sensor: 1 }, { circuit: 'P0130', low: 'P0131', high: 'P0132', slow: 'P0133', none: 'P0134', heater: 'P0135', heaterControl: 'P0030' }),
  ...o2Codes({ bank: 1, sensor: 2 }, { circuit: 'P0136', low: 'P0137', high: 'P0138', slow: 'P0139', none: 'P0140', heater: 'P0141', heaterControl: 'P0036' }),
  ...o2Codes({ bank: 2, sensor: 1 }, { circuit: 'P0150', low: 'P0151', high: 'P0152', slow: 'P0153', none: 'P0154', heater: 'P0155', heaterControl: 'P0050' }),
  ...o2Codes({ bank: 2, sensor: 2 }, { circuit: 'P0156', low: 'P0157', high: 'P0158', slow: 'P0159', none: 'P0160', heater: 'P0161', heaterControl: 'P0056' }),
  {
    code: 'P2A00',
    title: 'O2 Sensor Circuit Range/Performance (Bank 1 Sensor 1)',
    system: 'emissions',
    severity: 'medium',
    meaning: 'The upstream (often wideband air/fuel) sensor reading does not agree with what the computer expects from fuel trims and airflow. The sensor may be skewed, or it may be honestly reporting a real lean or rich condition.',
    symptoms: ['Check engine light', 'Possible economy loss'],
    causes: ['Aged or contaminated air/fuel sensor', 'Exhaust leak ahead of the sensor', 'Real fueling problem (vacuum leak, MAF, injectors)'],
    checks: ['Check fuel trims and look for leaks first.', 'Snap-throttle and propane tests: the sensor should respond quickly and in the right direction.', 'Check for a software update or TSB for this code on the platform.'],
    related: ['P0171', 'P0172', 'P0133'],
    articles: ['o2-sensor-testing', 'fuel-trim-diagnosis'],
  },
  ...(
    [
      ['P2195', 'O2 Sensor Signal Biased/Stuck Lean (Bank 1 Sensor 1)', 'lean', 1, 1],
      ['P2196', 'O2 Sensor Signal Biased/Stuck Rich (Bank 1 Sensor 1)', 'rich', 1, 1],
      ['P2197', 'O2 Sensor Signal Biased/Stuck Lean (Bank 2 Sensor 1)', 'lean', 2, 1],
      ['P2198', 'O2 Sensor Signal Biased/Stuck Rich (Bank 2 Sensor 1)', 'rich', 2, 1],
      ['P2270', 'O2 Sensor Signal Biased/Stuck Lean (Bank 1 Sensor 2)', 'lean', 1, 2],
      ['P2271', 'O2 Sensor Signal Biased/Stuck Rich (Bank 1 Sensor 2)', 'rich', 1, 2],
      ['P2272', 'O2 Sensor Signal Biased/Stuck Lean (Bank 2 Sensor 2)', 'lean', 2, 2],
      ['P2273', 'O2 Sensor Signal Biased/Stuck Rich (Bank 2 Sensor 2)', 'rich', 2, 2],
    ] as const
  ).map(
    ([code, title, dir, bank, sensor]): DtcEntry => ({
      code,
      title,
      system: 'emissions',
      severity: 'medium',
      meaning: `The ${O2_NAME({ bank, sensor })} keeps reading ${dir} even when the computer has trimmed fuel the other way. Either the sensor is ${dir === 'lean' ? 'skewed low' : 'skewed high'}, or the engine really is ${dir} and fuel control has run out of authority.`,
      symptoms: ['Check engine light', dir === 'lean' ? 'Hesitation, possible lean codes' : 'Fuel smell, poor economy'],
      causes:
        dir === 'lean'
          ? ['Exhaust leak ahead of the sensor', 'Vacuum leak or dirty MAF', 'Low fuel pressure or clogged injectors', 'Aged sensor']
          : ['Leaking injector or high fuel pressure', 'Fuel diluting the oil (PCV pulling fuel vapor)', 'Sensor contaminated', 'Signal wire shorted to the heater circuit'],
      checks: ['Check fuel trims and compare both banks.', 'Look for exhaust leaks before the sensor.', 'Use propane (lean) or a vacuum leak (rich) to see if the sensor follows a forced change.'],
      related: dir === 'lean' ? ['P0171', 'P0174'] : ['P0172', 'P0175'],
      articles: ['o2-sensor-testing', 'fuel-trim-diagnosis'],
    })
  ),

  // ---- Air metering -----------------------------------------------------------
  ...sensorFamily(MAF, 'Mass or Volume Air Flow Sensor "A"', { circuit: 'P0100', range: 'P0101', low: 'P0102', high: 'P0103' }, {
    titles: {
      circuit: 'Mass or Volume Air Flow Sensor "A" Circuit',
      range: 'Mass or Volume Air Flow Sensor "A" Circuit Range/Performance',
      low: 'Mass or Volume Air Flow Sensor "A" Circuit Low',
      high: 'Mass or Volume Air Flow Sensor "A" Circuit High',
    },
    symptoms: ['Hesitation, stalling after a start, or poor power', 'Possible lean codes'],
    related: ['P0171', 'P0174', 'P0068'],
  }),
  ...sensorFamily(MAP, 'Manifold Absolute Pressure/Barometric Pressure', { circuit: 'P0105', range: 'P0106', low: 'P0107', high: 'P0108' }, {
    symptoms: ['Rough running, poor power or black smoke', 'Hard starting'],
    related: ['P0068', 'P0069'],
  }),
  ...sensorFamily(IAT, 'Intake Air Temperature Sensor 1', { circuit: 'P0110', range: 'P0111', low: 'P0112', high: 'P0113' }, {
    titles: {
      circuit: 'Intake Air Temperature Sensor 1 Circuit (Bank 1)',
      range: 'Intake Air Temperature Sensor 1 Circuit Range/Performance (Bank 1)',
      low: 'Intake Air Temperature Sensor 1 Circuit Low (Bank 1)',
      high: 'Intake Air Temperature Sensor 1 Circuit High (Bank 1)',
    },
    symptoms: ['Check engine light', 'Usually minor drivability change'],
  }),
  ...sensorFamily(ECT, 'Engine Coolant Temperature Sensor 1', { circuit: 'P0115', range: 'P0116', low: 'P0117', high: 'P0118', intermittent: 'P0119' }, {
    symptoms: ['Cooling fans running all the time (the computer\'s fail-safe)', 'Hard starting, rich running or poor economy', 'Temperature gauge pegged or dead'],
    related: ['P0125', 'P0128'],
  }),
  ...sensorFamily(TPS_A, 'Throttle/Pedal Position Sensor/Switch "A"', { circuit: 'P0120', range: 'P0121', low: 'P0122', high: 'P0123' }, {
    symptoms: ['Hesitation or surging', 'Reduced power / limp mode on electronic throttles', 'Erratic idle'],
    related: ['P2135', 'P2101'],
  }),
  ...sensorFamily(TPS_B, 'Throttle/Pedal Position Sensor/Switch "B"', { circuit: 'P0220', low: 'P0222', high: 'P0223' }, {
    symptoms: ['Reduced power / limp mode', 'Erratic idle'],
    related: ['P2135', 'P0122'],
  }),
  ...sensorFamily(
    { ...TPS_A, name: 'accelerator pedal position sensor "D"', measures: 'how far the driver is pressing the accelerator pedal' },
    'Throttle/Pedal Position Sensor/Switch "D"',
    { low: 'P2122', high: 'P2123' },
    { symptoms: ['Reduced power / limp mode', 'Pedal response lazy or dead'], related: ['P2138'] }
  ),
  ...sensorFamily(
    { ...TPS_A, name: 'accelerator pedal position sensor "E"', measures: 'how far the driver is pressing the accelerator pedal (second, cross-check signal)' },
    'Throttle/Pedal Position Sensor/Switch "E"',
    { low: 'P2127', high: 'P2128' },
    { symptoms: ['Reduced power / limp mode'], related: ['P2138'] }
  ),
  {
    code: 'P0068',
    title: 'MAP/MAF - Throttle Position Correlation',
    system: 'driveability',
    severity: 'medium',
    meaning: 'Airflow measured by the MAF or MAP sensor does not match what the throttle position says should be flowing. Air is getting in without passing the throttle, or a sensor is wrong.',
    symptoms: ['Rough or high idle', 'Reduced power mode on electronic throttles'],
    causes: ['Intake air leak after the throttle (vacuum hose, PCV, intake gasket, brake booster)', 'Dirty throttle body', 'Skewed MAF, MAP or TPS'],
    checks: ['Smoke test the intake.', 'Compare MAF, MAP and TPS readings at idle and during a snap.', 'Clean the throttle body and run the idle relearn.'],
    related: ['P0101', 'P0106', 'P0121'],
    articles: ['smoke-test-vacuum-evap', 'throttle-body-service'],
  },
  {
    code: 'P0069',
    title: 'Manifold Absolute Pressure - Barometric Pressure Correlation',
    system: 'driveability',
    severity: 'medium',
    meaning: 'With the engine off, manifold pressure should equal barometric pressure. The two readings disagree, so one sensor is skewed (or the baro value is inferred from a bad MAP).',
    symptoms: ['Check engine light', 'Possible hard start or rough running'],
    causes: ['Skewed MAP or BARO sensor', 'Blocked or leaking MAP vacuum hose', 'On turbo engines, a boost sensor out of calibration'],
    checks: ['Key on, engine off: compare MAP, BARO and (if fitted) boost pressure readings. They should match local barometric pressure.', 'Inspect the hose and port to the MAP sensor.'],
    related: ['P0106'],
    articles: ['sensor-circuit-testing'],
  },
  {
    code: 'P2279',
    title: 'Intake Air System Leak',
    system: 'driveability',
    severity: 'medium',
    meaning: 'Airflow and engine load disagree in a way that points to unmetered air entering the intake.',
    symptoms: ['Rough or high idle', 'Lean codes', 'Hissing noise'],
    causes: ['Cracked intake duct or loose clamp after the MAF', 'Vacuum hose split', 'PCV valve or hose leaking (oil fill cap seal too)', 'Intake manifold gasket leak'],
    checks: ['Smoke test the intake with the engine off.', 'Check fuel trims: a vacuum leak shows high positive trim at idle that improves at higher RPM.'],
    related: ['P0171', 'P0174', 'P0068'],
    articles: ['smoke-test-vacuum-evap', 'fuel-trim-diagnosis'],
  },

  // ---- Fuel trim ----------------------------------------------------------------
  ...(
    [
      ['P0171', 'System Too Lean (Bank 1)', 'lean', 1],
      ['P0174', 'System Too Lean (Bank 2)', 'lean', 2],
      ['P0172', 'System Too Rich (Bank 1)', 'rich', 1],
      ['P0175', 'System Too Rich (Bank 2)', 'rich', 2],
    ] as const
  ).map(([code, title, dir, bank]): DtcEntry => {
    const lean = dir === 'lean';
    return {
      code,
      title,
      system: 'driveability',
      severity: 'medium',
      meaning: lean
        ? `Bank ${bank} has been adding so much fuel to stay at the right mixture that long-term fuel trim reached its limit. Something is letting in air the computer does not know about, or not delivering the fuel it commands. When both banks set lean codes, look for a shared cause (MAF, fuel pressure, a central vacuum leak).`
        : `Bank ${bank} has been pulling so much fuel to stay at the right mixture that fuel trim reached its negative limit. Extra fuel is getting in from somewhere, or the engine is not getting the air the computer thinks it is.`,
      symptoms: lean ? ['Hesitation, rough idle, possible misfire', 'Check engine light'] : ['Fuel smell, black smoke', 'Poor economy, possible misfire or fouled plugs'],
      causes: lean
        ? ['Vacuum leak (intake gasket, PCV hose, brake booster, cracked boot)', 'Dirty or skewed MAF sensor reading low', 'Low fuel pressure (weak pump, clogged filter, regulator)', 'Clogged injectors', 'Exhaust leak ahead of the upstream O2 sensor']
        : ['Leaking injector', 'Fuel pressure too high (regulator)', 'Fuel in the oil being drawn through the PCV system', 'MAF reading high', 'Leaking EVAP purge valve at idle', 'Restricted air filter'],
      checks: lean
        ? [
            'Look at short- and long-term fuel trims at idle, 1,500 and 2,500 rpm. Lean at idle that improves with RPM = vacuum leak. Lean everywhere, worse under load = fuel delivery or MAF.',
            'Smoke test the intake.',
            'Check MAF grams/second against engine size; clean or test the MAF.',
            'Measure fuel pressure and volume.',
            'Check for exhaust leaks ahead of the upstream O2 sensor.',
          ]
        : [
            'Look at fuel trims at idle and cruise.',
            'Check fuel pressure, and leak-down after shut-off (a leaking injector or regulator loses pressure).',
            'Pinch or disconnect the purge line at idle and watch trims change.',
            'Smell the oil for fuel; check the air filter.',
          ],
      related: lean ? ['P0101', 'P0300', 'P2279', 'P0087'] : ['P0101', 'P0420', 'P0300'],
      articles: ['fuel-trim-diagnosis', 'smoke-test-vacuum-evap', 'fuel-pressure-testing'],
    };
  }),
  ...(
    [
      ['P2187', 'System Too Lean at Idle (Bank 1)', 'lean'],
      ['P2188', 'System Too Rich at Idle (Bank 1)', 'rich'],
      ['P2189', 'System Too Lean at Idle (Bank 2)', 'lean'],
      ['P2190', 'System Too Rich at Idle (Bank 2)', 'rich'],
    ] as const
  ).map(
    ([code, title, dir]): DtcEntry => ({
      code,
      title,
      system: 'driveability',
      severity: 'medium',
      meaning:
        dir === 'lean'
          ? 'Fuel trim hit its lean limit at idle only. A problem that shows at idle and fades with RPM is almost always a vacuum leak: at idle, a small leak is a large share of the total airflow.'
          : 'Fuel trim hit its rich limit at idle only. At idle, small extra fuel sources (a leaking purge valve, a dripping injector) have their biggest effect.',
      symptoms: ['Rough idle', 'Check engine light'],
      causes:
        dir === 'lean'
          ? ['Vacuum leak (PCV valve or hose, intake gasket, brake booster hose)', 'Leaking oil filler cap or dipstick seal', 'Dirty throttle body']
          : ['EVAP purge valve stuck open', 'Leaking injector', 'Fuel in the oil'],
      checks:
        dir === 'lean'
          ? ['Smoke test the intake.', 'Watch fuel trims while lightly spraying suspect areas with an approved leak-detection method.', 'Check the PCV valve and hoses.']
          : ['Pinch the purge line at idle and watch trims.', 'Check fuel pressure leak-down.'],
      related: dir === 'lean' ? ['P0171', 'P0174'] : ['P0172', 'P0175', 'P0496'],
      articles: ['fuel-trim-diagnosis', 'smoke-test-vacuum-evap'],
    })
  ),
  ...(
    [
      ['P2177', 'System Too Lean Off Idle (Bank 1)', 'lean'],
      ['P2178', 'System Too Rich Off Idle (Bank 1)', 'rich'],
      ['P2179', 'System Too Lean Off Idle (Bank 2)', 'lean'],
      ['P2180', 'System Too Rich Off Idle (Bank 2)', 'rich'],
    ] as const
  ).map(
    ([code, title, dir]): DtcEntry => ({
      code,
      title,
      system: 'driveability',
      severity: 'medium',
      meaning:
        dir === 'lean'
          ? 'Fuel trim hit its lean limit above idle, at cruise or under load. A lean condition that grows with airflow points to fuel delivery or an airflow sensor reading low, more than to a vacuum leak.'
          : 'Fuel trim hit its rich limit above idle. Extra fuel under load points to fuel pressure, injectors, or an airflow sensor reading high.',
      symptoms: dir === 'lean' ? ['Hesitation or surge at cruise', 'Lean misfire under load'] : ['Poor economy, fuel smell', 'Possible black smoke'],
      causes:
        dir === 'lean'
          ? ['MAF sensor contaminated, reading low', 'Weak fuel pump or clogged filter', 'Restricted injectors', 'Intake leak after the MAF (boost leak on turbo engines)']
          : ['Leaking injectors', 'Fuel pressure too high', 'MAF reading high', 'Fuel in the oil'],
      checks: [
        'Compare fuel trims at idle, 1,500 and 2,500 rpm and under load. If idle is fine and cruise is lean, test fuel volume and the MAF before smoke testing.',
        'Check MAF grams per second against engine size and clean or test the sensor.',
        'Measure fuel pressure and volume under load.',
      ],
      related: dir === 'lean' ? ['P0171', 'P0174', 'P0101'] : ['P0172', 'P0175'],
      articles: ['fuel-trim-diagnosis', 'fuel-pressure-testing'],
    })
  ),
  ...(
    [
      ['P2096', 'Post Catalyst Fuel Trim System Too Lean (Bank 1)', 'lean'],
      ['P2097', 'Post Catalyst Fuel Trim System Too Rich (Bank 1)', 'rich'],
      ['P2098', 'Post Catalyst Fuel Trim System Too Lean (Bank 2)', 'lean'],
      ['P2099', 'Post Catalyst Fuel Trim System Too Rich (Bank 2)', 'rich'],
    ] as const
  ).map(
    ([code, title, dir]): DtcEntry => ({
      code,
      title,
      system: 'emissions',
      severity: 'low',
      meaning: `The computer fine-tunes the mixture using the downstream O2 sensor too. That correction hit its ${dir} limit — the downstream sensor keeps reading ${dir}.`,
      symptoms: ['Check engine light', 'Often no drivability symptom'],
      causes:
        dir === 'lean'
          ? ['Exhaust leak near the downstream sensor', 'Aged upstream sensor skewing fuel control', 'Failing catalytic converter', 'Downstream sensor skewed']
          : ['Rich running from injectors or fuel pressure', 'Upstream sensor skewed lean (computer adds fuel)', 'Downstream sensor contaminated'],
      checks: ['Check for exhaust leaks around both O2 sensors.', 'Compare upstream and downstream sensor behaviour; test the upstream sensor first.', 'Check fuel trims for an underlying fueling problem.'],
      related: ['P0420', 'P0430', 'P0137', 'P0138'],
      articles: ['o2-sensor-testing', 'catalyst-efficiency-diagnosis'],
    })
  ),

  // ---- Temperature / thermostat ----------------------------------------------
  {
    code: 'P0125',
    title: 'Insufficient Coolant Temperature for Closed Loop Fuel Control',
    system: 'cooling',
    severity: 'low',
    meaning: 'The engine took too long to reach the temperature the computer needs before it starts using the O2 sensors for fuel control.',
    symptoms: ['Heater slow to warm up', 'Temperature gauge reads low', 'Poor economy'],
    causes: ['Thermostat stuck open or opening early', 'Coolant temperature sensor reading low', 'Low coolant level', 'Very cold weather with long idling'],
    checks: ['Watch coolant temperature on the scan tool during warm-up: it should climb steadily to the thermostat temperature and stay there.', 'Feel the upper radiator hose: if it warms with the engine from cold, the thermostat is open too early.', 'Check coolant level.'],
    related: ['P0128', 'P0116'],
    articles: ['cooling-system-pressure-test'],
  },
  {
    code: 'P0128',
    title: 'Coolant Thermostat (Coolant Temperature Below Thermostat Regulating Temperature)',
    system: 'cooling',
    severity: 'low',
    meaning: 'The engine did not reach its normal operating temperature in the time the computer allows. Nearly always a thermostat stuck open.',
    symptoms: ['Heater not as hot as normal', 'Gauge sits low or drops on the highway', 'Poor economy'],
    causes: ['Thermostat stuck open (most common)', 'Coolant temperature sensor reading low', 'Cooling fan running constantly', 'Low coolant level'],
    checks: ['Check coolant level.', 'Watch coolant temperature during a drive: if it drops at highway speed, the thermostat is open.', 'Check that the cooling fans are off when the engine is cold.', 'Compare the ECT reading with an infrared reading at the sensor.'],
    related: ['P0125', 'P0116', 'P0597'],
    articles: ['cooling-system-pressure-test', 'coolant-drain-fill-bleed'],
  },
  {
    code: 'P0597',
    title: 'Thermostat Heater Control Circuit/Open',
    system: 'cooling',
    severity: 'low',
    meaning: 'Some engines use an electrically heated thermostat so the computer can open it early under load. The heater circuit is open or the heater has failed.',
    symptoms: ['Check engine light', 'Usually no other symptom'],
    causes: ['Failed thermostat heater (replace the thermostat assembly)', 'Connector at the thermostat housing corroded', 'Open wiring'],
    checks: ['Measure the heater resistance at the thermostat connector.', 'Check for power and the control ground with the key on.'],
    related: ['P0128'],
    articles: ['sensor-circuit-testing'],
  },
  {
    code: 'P0217',
    title: 'Engine Coolant Over Temperature Condition',
    system: 'cooling',
    severity: 'critical',
    meaning: 'Coolant temperature went above the safe limit. The computer may cut cylinders or reduce power to protect the engine.',
    symptoms: ['Temperature gauge in the red, warning message', 'Steam, coolant smell', 'Reduced power'],
    causes: ['Low coolant from a leak', 'Cooling fan not running (motor, relay, fuse, control)', 'Thermostat stuck closed', 'Water pump failure', 'Head gasket pushing combustion gas into the coolant', 'Restricted radiator'],
    checks: ['STOP driving. Let the engine cool before opening the cooling system.', 'Check coolant level and look for leaks.', 'Verify the fans come on at temperature or when commanded.', 'Pressure test the cooling system, and test for combustion gases in the coolant.'],
    related: ['P0128', 'P2181', 'P0480'],
    articles: ['cooling-system-pressure-test', 'coolant-drain-fill-bleed'],
  },
  {
    code: 'P2181',
    title: 'Cooling System Performance',
    system: 'cooling',
    severity: 'medium',
    meaning: 'The coolant temperature did not behave the way the computer\'s model of the cooling system predicts: warming too slowly, too fast, or running hotter than it should.',
    symptoms: ['Gauge higher or lower than normal', 'Heater performance changes'],
    causes: ['Thermostat sticking', 'Low coolant or air pocket', 'Coolant temperature sensor skewed', 'Fan control problem'],
    checks: ['Check coolant level and bleed the system.', 'Watch ECT warm-up and compare with an infrared thermometer.', 'Check the thermostat and fan operation.'],
    related: ['P0128', 'P0217', 'P0116'],
    articles: ['cooling-system-pressure-test'],
  },
  {
    code: 'P0480',
    title: 'Fan 1 Control Circuit',
    system: 'cooling',
    severity: 'high',
    meaning: 'The computer saw a fault in the circuit it uses to switch cooling fan 1 (often through a relay or a fan control module).',
    symptoms: ['Overheating at idle or in traffic', 'A/C poor at idle', 'Fan running all the time'],
    causes: ['Failed fan relay', 'Open or shorted relay control wire', 'Failed fan control module (PWM fans)', 'Blown fuse'],
    checks: ['Command the fan on with the scan tool.', 'Check the fuse and swap the relay with a known-good identical one.', 'Check the control circuit from the computer to the relay coil.'],
    related: ['P0481', 'P0217'],
    articles: ['sensor-circuit-testing'],
  },
  {
    code: 'P0481',
    title: 'Fan 2 Control Circuit',
    system: 'cooling',
    severity: 'high',
    meaning: 'The computer saw a fault in the circuit it uses to switch cooling fan 2 (or the fan\'s second, high-speed stage).',
    symptoms: ['Overheating in traffic or with A/C on', 'Fan does not reach high speed'],
    causes: ['Failed fan relay', 'Fan motor or resistor failure', 'Open or shorted control wire'],
    checks: ['Command fan 2 / high speed with the scan tool.', 'Check fuses and relays.', 'Check the control circuit.'],
    related: ['P0480'],
  },

  // ---- Fuel delivery -------------------------------------------------------------
  {
    code: 'P0087',
    title: 'Fuel Rail/System Pressure - Too Low',
    system: 'driveability',
    severity: 'high',
    meaning: 'Measured fuel rail pressure is below what the computer commanded. On direct-injection and diesel engines this is the high-pressure side; the low-pressure supply feeding the high-pressure pump is still the first suspect.',
    symptoms: ['Hesitation or stall under load', 'Long crank or no start', 'Reduced power'],
    causes: ['Weak in-tank fuel pump or its connector/wiring', 'Clogged fuel filter (diesels especially)', 'Failing high-pressure pump (direct injection, diesel)', 'Fuel rail pressure sensor skewed', 'Air in the fuel system (diesel)', 'Running the tank empty'],
    checks: ['Check fuel level — a low tank on a hard corner causes this.', 'Measure low-side pressure and volume with a gauge.', 'Compare commanded vs. actual rail pressure on the scan tool, at idle and under load.', 'Check power and ground at the pump under load (voltage drop test).', 'Inspect and replace the fuel filter on diesels.'],
    related: ['P0191', 'P0171', 'P0093'],
    articles: ['fuel-pressure-testing', 'voltage-drop-testing'],
  },
  {
    code: 'P0088',
    title: 'Fuel Rail/System Pressure - Too High',
    system: 'driveability',
    severity: 'high',
    meaning: 'Rail pressure is above what was commanded — the pressure control is not bleeding or regulating pressure the way it should.',
    symptoms: ['Rich running, rough idle', 'Hard hot start', 'Check engine light'],
    causes: ['Pressure regulator or pressure control valve sticking', 'Return line restricted (return-style systems)', 'Rail pressure sensor reading high'],
    checks: ['Compare commanded and actual pressure.', 'Verify actual pressure mechanically where possible.', 'Check the regulator/control valve circuit and operation.'],
    related: ['P0089', 'P0193'],
    articles: ['fuel-pressure-testing'],
  },
  {
    code: 'P0089',
    title: 'Fuel Pressure Regulator 1 Performance',
    system: 'driveability',
    severity: 'medium',
    meaning: 'The computer commanded the fuel pressure regulator (or pump control valve) and actual pressure did not follow the command closely enough.',
    symptoms: ['Hesitation, stall, rough idle', 'Pressure fluctuating on the scan tool'],
    causes: ['Sticking regulator / volume control valve', 'Weak supply pump', 'Air in the fuel (diesel)', 'Fuel filter restriction'],
    checks: ['Graph commanded vs. actual pressure during a drive.', 'Check supply-side pressure and volume.', 'Check the regulator circuit.'],
    related: ['P0087', 'P0088'],
    articles: ['fuel-pressure-testing'],
  },
  {
    code: 'P0093',
    title: 'Fuel System Leak Detected - Large Leak',
    system: 'diesel',
    severity: 'critical',
    meaning: 'On common-rail engines the computer saw rail pressure drop faster than injection alone can explain — fuel is escaping from the high-pressure system, internally or externally.',
    symptoms: ['Stalling, no start, engine shut-down', 'Diesel smell, visible fuel', 'Fuel in the oil'],
    causes: ['Leaking high-pressure line or fitting', 'Injector leaking internally or its return excessive', 'Cracked fuel rail or failed pressure relief valve', 'Empty tank or air leak on the supply side'],
    checks: ['Do not run the engine with a visible high-pressure leak: it can cut skin and start fires.', 'Check the fuel level and supply side first.', 'Inspect lines and fittings with the engine off.', 'Measure injector return (back-leak) rates per the service information.', 'Check oil level for a rise from fuel dilution.'],
    related: ['P0087'],
    articles: ['fuel-pressure-testing'],
  },
  ...sensorFamily(FRP, 'Fuel Rail Pressure Sensor "A"', { circuit: 'P0190', range: 'P0191', low: 'P0192', high: 'P0193' }, {
    symptoms: ['Hesitation, stall, long crank', 'Reduced power'],
    related: ['P0087', 'P0088'],
  }),
  {
    code: 'P0230',
    title: 'Fuel Pump Primary Circuit',
    system: 'driveability',
    severity: 'high',
    meaning: 'The computer controls the fuel pump relay (or a fuel pump control module) and saw a fault in that control circuit.',
    symptoms: ['No start or stall', 'Pump not priming at key-on'],
    causes: ['Failed fuel pump relay', 'Open or shorted relay control wire', 'Inertia switch tripped (some makes)', 'Failed fuel pump control module'],
    checks: ['Listen for the pump to prime at key-on.', 'Check the fuse and relay; command the pump with the scan tool.', 'Check the relay control circuit back to the computer.'],
    related: ['P0627', 'P0087'],
    articles: ['no-start-diagnosis', 'voltage-drop-testing'],
  },
  {
    code: 'P0627',
    title: 'Fuel Pump "A" Control Circuit/Open',
    system: 'driveability',
    severity: 'high',
    meaning: 'The fuel pump control circuit (to a relay or pump driver module) is open or not behaving as commanded.',
    symptoms: ['No start, stall, low power'],
    causes: ['Fuel pump driver module failure (often mounted near the tank and exposed to corrosion)', 'Open control wire', 'Connector corrosion', 'Relay failure'],
    checks: ['Check for related pump module codes and communication.', 'Check power, ground and control signal at the pump driver module.', 'Inspect connectors at the tank area for corrosion.'],
    related: ['P0230', 'P0087'],
    articles: ['no-start-diagnosis', 'voltage-drop-testing'],
  },

  // ---- Injectors / misfire -----------------------------------------------------
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(injector),
  {
    code: 'P0300',
    title: 'Random/Multiple Cylinder Misfire Detected',
    system: 'driveability',
    severity: 'high',
    meaning: 'The computer counted misfires on more than one cylinder, or could not tell which cylinder. Look for something every cylinder shares: fuel pressure, a big vacuum leak, the MAF, cam timing, or low-quality fuel.',
    symptoms: ['Shaking, stumbling, loss of power', 'Flashing check engine light (catalyst-damaging misfire — reduce load)'],
    causes: ['Vacuum leak', 'Low fuel pressure or contaminated fuel', 'Dirty or failing MAF', 'Several worn plugs or coils', 'Cam timing out (stretched chain)', 'EGR stuck open', 'Crank sensor signal noise or reluctor damage', 'Rough road or a driveline vibration can falsely count misfires on some vehicles'],
    checks: [
      'Read Mode $06 / misfire counters for every cylinder. Is it really random, or mostly one or two?',
      'Check fuel trims: high positive trims point to a lean cause (vacuum leak, fuel delivery, MAF).',
      'Check fuel pressure and quality.',
      'Inspect plugs and coils; check for codes on cam/crank correlation.',
      'Relative compression test (cranking amperage) to compare all cylinders quickly.',
    ],
    related: ['P0301', 'P0171', 'P0174', 'P0087', 'P0016'],
    articles: ['misfire-diagnosis', 'fuel-trim-diagnosis', 'compression-test'],
  },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(misfire),
  {
    code: 'P0313',
    title: 'Misfire Detected with Low Fuel',
    system: 'driveability',
    severity: 'medium',
    meaning: 'The computer saw misfires while the fuel level was low — fuel starvation from the pump uncovering.',
    symptoms: ['Stumble on corners or hills with a low tank'],
    causes: ['Running very low on fuel', 'Fuel pump reservoir or jet pump fault', 'Fuel level sender reading wrong'],
    checks: ['Fill the tank and recheck.', 'Verify the fuel gauge against the actual amount in the tank.'],
    related: ['P0300', 'P0461'],
  },
  {
    code: 'P0316',
    title: 'Engine Misfire Detected on Startup (First 1000 Revolutions)',
    system: 'driveability',
    severity: 'medium',
    meaning: 'Misfires were counted in the first moments after start — usually something that is worst cold: moisture, a leaking injector flooding a cylinder overnight, or coolant entering a cylinder.',
    symptoms: ['Rough first start, smooths out after a minute', 'White smoke at start-up (coolant)'],
    causes: ['Leaking injector', 'Coolant leak into a cylinder (head gasket, cracked head, intake gasket on some engines)', 'Worn plugs or coils that fail when cold and damp', 'Carbon on intake valves (direct injection)'],
    checks: ['Check coolant level over several days for unexplained loss.', 'Pull plugs after an overnight sit: a clean, steam-cleaned plug points to coolant.', 'Check fuel pressure leak-down overnight.'],
    related: ['P0300'],
    articles: ['misfire-diagnosis', 'cooling-system-pressure-test'],
  },
  ...COIL_LETTERS.map((_, i) => coil(i)),

  // ---- Knock / crank / cam -----------------------------------------------------
  ...sensorFamily(KS1, 'Knock Sensor 1', { circuit: 'P0325', range: 'P0326', low: 'P0327', high: 'P0328' }, {
    titles: {
      circuit: 'Knock Sensor 1 Circuit (Bank 1 or Single Sensor)',
      range: 'Knock Sensor 1 Circuit Range/Performance (Bank 1 or Single Sensor)',
      low: 'Knock Sensor 1 Circuit Low (Bank 1 or Single Sensor)',
      high: 'Knock Sensor 1 Circuit High (Bank 1 or Single Sensor)',
    },
    symptoms: ['Check engine light', 'Timing retarded: dull power and economy'],
  }),
  ...sensorFamily(KS2, 'Knock Sensor 2', { circuit: 'P0330', low: 'P0332', high: 'P0333' }, {
    titles: {
      circuit: 'Knock Sensor 2 Circuit (Bank 2)',
      low: 'Knock Sensor 2 Circuit Low (Bank 2)',
      high: 'Knock Sensor 2 Circuit High (Bank 2)',
    },
    symptoms: ['Check engine light', 'Timing retarded: dull power and economy'],
  }),
  ...sensorFamily(CKP, 'Crankshaft Position Sensor "A"', { circuit: 'P0335', range: 'P0336', low: 'P0337', high: 'P0338', intermittent: 'P0339' }, {
    symptoms: ['No start (no spark and no injector pulse)', 'Stalling, often when hot', 'Tachometer drops to zero while running'],
    related: ['P0016', 'P0340'],
    severity: 'high',
  }),
  ...sensorFamily(CMP_A1, 'Camshaft Position Sensor "A"', { circuit: 'P0340', range: 'P0341', low: 'P0342', high: 'P0343', intermittent: 'P0344' }, {
    titles: {
      circuit: 'Camshaft Position Sensor "A" Circuit (Bank 1 or Single Sensor)',
      range: 'Camshaft Position Sensor "A" Circuit Range/Performance (Bank 1 or Single Sensor)',
      low: 'Camshaft Position Sensor "A" Circuit Low (Bank 1 or Single Sensor)',
      high: 'Camshaft Position Sensor "A" Circuit High (Bank 1 or Single Sensor)',
      intermittent: 'Camshaft Position Sensor "A" Circuit Intermittent (Bank 1 or Single Sensor)',
    },
    symptoms: ['Long crank or hard start', 'Rough running, possible stall'],
    related: ['P0016', 'P0335'],
  }),
  ...sensorFamily(CMP_A2, 'Camshaft Position Sensor "A"', { circuit: 'P0345' }, {
    titles: { circuit: 'Camshaft Position Sensor "A" Circuit (Bank 2)' },
    symptoms: ['Long crank or hard start', 'Rough running'],
    related: ['P0018', 'P0340'],
  }),
  ...sensorFamily(CMP_B1, 'Camshaft Position Sensor "B"', { circuit: 'P0365', range: 'P0366' }, {
    titles: {
      circuit: 'Camshaft Position Sensor "B" Circuit (Bank 1)',
      range: 'Camshaft Position Sensor "B" Circuit Range/Performance (Bank 1)',
    },
    symptoms: ['Long crank or hard start', 'Rough running'],
    related: ['P0017', 'P0340'],
  }),

  // ---- Diesel glow plugs ----------------------------------------------------------
  {
    code: 'P0380',
    title: 'Glow Plug/Heater Circuit "A"',
    system: 'diesel',
    severity: 'medium',
    meaning: 'The computer saw a fault in the glow plug circuit (or the intake air heater on some diesels).',
    symptoms: ['Hard cold start, white smoke at start-up', 'Rough running until warm'],
    causes: ['Failed glow plug relay or control module', 'One or more glow plugs open', 'Corroded connections, often at the heater grid or relay'],
    checks: ['Check glow plug resistance individually.', 'Check the relay/module operation and current draw.', 'Inspect the main feed connections for heat damage.'],
    related: ['P0670'],
    articles: ['voltage-drop-testing'],
  },
  {
    code: 'P0670',
    title: 'Glow Plug Control Module Control Circuit',
    system: 'diesel',
    severity: 'medium',
    meaning: 'The circuit the engine computer uses to command the glow plug module is faulty, or the module reports a fault.',
    symptoms: ['Hard cold start, white smoke'],
    causes: ['Failed glow plug control module', 'Open or shorted control/feedback wire', 'Module power or ground problem'],
    checks: ['Check module power and ground.', 'Check the command signal from the engine computer.', 'Check individual glow plug circuits for shorts that may have damaged the module.'],
    related: ['P0380'],
  },

  // ---- EGR / secondary air ------------------------------------------------------
  {
    code: 'P0400',
    title: 'Exhaust Gas Recirculation "A" Flow',
    system: 'emissions',
    severity: 'medium',
    meaning: 'EGR flow did not match what was commanded — too little or too much.',
    symptoms: ['Check engine light', 'Pinging (too little EGR) or rough idle (too much)'],
    causes: ['Carbon-clogged EGR passages', 'EGR valve sticking', 'Vacuum or electrical control fault'],
    checks: ['Command the EGR valve and watch MAP, fuel trims and RPM change.', 'Inspect and clean the valve and passages.'],
    related: ['P0401', 'P0402'],
  },
  {
    code: 'P0401',
    title: 'Exhaust Gas Recirculation "A" Flow Insufficient Detected',
    system: 'emissions',
    severity: 'medium',
    meaning: 'When the computer opened the EGR valve it did not see the change in manifold pressure, temperature or fuel trim that EGR flow makes. Carbon blockage is the usual cause.',
    symptoms: ['Pinging or spark knock under load', 'Failed emissions test (NOx)'],
    causes: ['Carbon-blocked EGR passages or ports in the intake', 'EGR valve stuck closed', 'Vacuum supply missing (vacuum-operated valves)', 'DPFE or EGR position sensor fault'],
    checks: ['Command the EGR open at idle: a healthy system makes the engine stumble noticeably.', 'Inspect the passages; carbon often fills the ports at the intake.', 'Test the valve and its position/pressure feedback sensor.'],
    related: ['P0400', 'P0404'],
  },
  {
    code: 'P0402',
    title: 'Exhaust Gas Recirculation "A" Flow Excessive Detected',
    system: 'emissions',
    severity: 'medium',
    meaning: 'More exhaust gas is being recirculated than commanded, typically because the valve is held open.',
    symptoms: ['Rough idle or stall, especially after deceleration', 'Hesitation'],
    causes: ['EGR valve stuck open by carbon', 'Vacuum control solenoid stuck', 'Faulty position sensor'],
    checks: ['Watch commanded vs. actual EGR position.', 'Remove and inspect the valve seat for carbon.'],
    related: ['P0400', 'P0300'],
  },
  {
    code: 'P0403',
    title: 'Exhaust Gas Recirculation "A" Control Circuit',
    system: 'emissions',
    severity: 'medium',
    meaning: 'The circuit the computer uses to drive the EGR valve or its control solenoid is open, shorted or out of range.',
    symptoms: ['Check engine light', 'EGR inoperative'],
    causes: ['Failed EGR valve motor or solenoid', 'Open or shorted control wire', 'Corroded connector (heat-cycled near the exhaust)'],
    checks: ['Measure valve/solenoid resistance.', 'Check feed and control circuits.'],
    related: ['P0404'],
    articles: ['sensor-circuit-testing'],
  },
  {
    code: 'P0404',
    title: 'Exhaust Gas Recirculation "A" Control Circuit Range/Performance',
    system: 'emissions',
    severity: 'medium',
    meaning: 'The EGR valve position does not follow the command — it is sticking, slow, or its position sensor is wrong.',
    symptoms: ['Rough idle, hesitation'],
    causes: ['Carbon on the valve', 'Worn valve motor', 'Position sensor fault'],
    checks: ['Graph commanded vs. actual EGR position.', 'Clean or replace the valve.'],
    related: ['P0401', 'P0402'],
  },
  {
    code: 'P0405',
    title: 'Exhaust Gas Recirculation Sensor "A" Circuit Low',
    system: 'emissions',
    severity: 'low',
    meaning: 'The EGR position or pressure (DPFE) sensor signal is below its possible range.',
    symptoms: ['Check engine light'],
    causes: ['Open signal or reference circuit', 'Signal shorted to ground', 'Failed sensor'],
    checks: ['Check reference, ground and signal at the sensor.'],
    related: ['P0406'],
    articles: ['sensor-circuit-testing'],
  },
  {
    code: 'P0406',
    title: 'Exhaust Gas Recirculation Sensor "A" Circuit High',
    system: 'emissions',
    severity: 'low',
    meaning: 'The EGR position or pressure (DPFE) sensor signal is above its possible range.',
    symptoms: ['Check engine light'],
    causes: ['Open sensor ground', 'Signal shorted to voltage', 'Failed sensor', 'Cracked DPFE hoses (pressure-type sensors)'],
    checks: ['Check ground and signal at the sensor; inspect sensor hoses.'],
    related: ['P0405'],
    articles: ['sensor-circuit-testing'],
  },
  {
    code: 'P0410',
    title: 'Secondary Air Injection System "A"',
    system: 'emissions',
    severity: 'low',
    meaning: 'The air pump system that blows fresh air into the exhaust after a cold start, to light off the catalyst sooner, did not work as expected.',
    symptoms: ['Check engine light', 'Loud whine at cold start (failing pump bearing) or no pump noise at all'],
    causes: ['Failed air pump (water ingestion is common)', 'Check valve stuck or leaking (exhaust backs up into the pump)', 'Blown fuse or relay', 'Hoses cracked'],
    checks: ['Cold start: the pump should run for about the first minute or so.', 'Check the fuse, relay and pump power.', 'Inspect the check valves and hoses; water in the pump means a failed check valve.'],
    related: ['P0411', 'P0491'],
  },
  {
    code: 'P0411',
    title: 'Secondary Air Injection System "A" Incorrect Flow Detected',
    system: 'emissions',
    severity: 'low',
    meaning: 'When the secondary air pump ran, the upstream O2 sensors did not show the lean swing that added air causes — flow is too low (or too high).',
    symptoms: ['Check engine light'],
    causes: ['Weak air pump', 'Blocked or carboned air passages in the head', 'Check/switch valve stuck', 'Hose leak'],
    checks: ['Command the pump and watch the upstream O2 sensors go lean.', 'Check passages and valves.'],
    related: ['P0410', 'P0491', 'P0492'],
  },
  {
    code: 'P0491',
    title: 'Secondary Air Injection System Insufficient Flow (Bank 1)',
    system: 'emissions',
    severity: 'low',
    meaning: 'Bank 1 did not see enough secondary air during the test.',
    symptoms: ['Check engine light'],
    causes: ['Carbon-clogged passages on bank 1', 'Combination/check valve stuck', 'Weak pump'],
    checks: ['Compare O2 response on each bank during the pump test.', 'Inspect the bank 1 valve and passages.'],
    related: ['P0410', 'P0492'],
  },
  {
    code: 'P0492',
    title: 'Secondary Air Injection System Insufficient Flow (Bank 2)',
    system: 'emissions',
    severity: 'low',
    meaning: 'Bank 2 did not see enough secondary air during the test.',
    symptoms: ['Check engine light'],
    causes: ['Carbon-clogged passages on bank 2', 'Combination/check valve stuck', 'Weak pump'],
    checks: ['Compare O2 response on each bank during the pump test.', 'Inspect the bank 2 valve and passages.'],
    related: ['P0410', 'P0491'],
  },

  // ---- Catalyst -------------------------------------------------------------------
  ...(
    [
      ['P0420', 1],
      ['P0430', 2],
    ] as const
  ).map(
    ([code, bank]): DtcEntry => ({
      code,
      title: `Catalyst System Efficiency Below Threshold (Bank ${bank})`,
      system: 'emissions',
      severity: 'low',
      meaning: `A working catalytic converter stores oxygen, so the downstream O2 sensor reads fairly steady while the upstream one switches. On bank ${bank}, the downstream sensor has started copying the upstream one — the converter is no longer storing enough oxygen. The converter may be worn out, but plenty of P0${bank === 1 ? '420' : '430'}s are fixed without replacing it.`,
      symptoms: ['Check engine light, usually no drivability symptom', 'Failed emissions inspection', 'Rotten-egg smell or rattling (broken substrate) in some cases'],
      causes: [
        'Exhaust leak near the downstream O2 sensor (pulls in air, fools the test)',
        'Aged or contaminated downstream O2 sensor',
        'Engine problem that damaged or poisoned the catalyst: misfires, oil burning, coolant loss',
        'Worn-out catalytic converter',
        'Aftermarket converter that does not meet the original\'s oxygen storage',
      ],
      checks: [
        'Fix any misfire, rich running, oil consumption or coolant loss first — a new converter will die the same way.',
        'Check for exhaust leaks ahead of and around the downstream sensor.',
        'Graph upstream and downstream sensors together at a steady 2,500 rpm, fully warm: a good cat keeps the downstream signal flat and high (around 0.6–0.7 V on a narrowband sensor).',
        'Check temperature in vs. out with an infrared thermometer only as a rough guide; the O2 comparison is the real test.',
        'Check for a TSB or reflash for this code before replacing the converter.',
      ],
      related: bank === 1 ? ['P0137', 'P0138', 'P2096', 'P0300'] : ['P0157', 'P0158', 'P2098', 'P0300'],
      articles: ['catalyst-efficiency-diagnosis', 'o2-sensor-testing'],
    })
  ),

  // ---- EVAP --------------------------------------------------------------------------
  {
    code: 'P0440',
    title: 'Evaporative Emission System',
    system: 'emissions',
    severity: 'low',
    meaning: 'A general EVAP system fault: the system did not pass its self-test, often a leak or a valve not operating.',
    symptoms: ['Check engine light', 'Possible fuel smell'],
    causes: ['Gas cap loose or seal worn', 'Leaking hose or canister', 'Purge or vent valve fault'],
    checks: ['Check the gas cap and filler neck seal.', 'Smoke test the EVAP system.', 'Command purge and vent valves with the scan tool.'],
    related: ['P0442', 'P0455', 'P0456'],
    articles: ['smoke-test-vacuum-evap'],
  },
  {
    code: 'P0441',
    title: 'Evaporative Emission System Incorrect Purge Flow',
    system: 'emissions',
    severity: 'low',
    meaning: 'When the computer opened the purge valve, it did not see the expected change in vacuum or fuel trim — purge flow is missing, or there is flow when the valve should be closed.',
    symptoms: ['Check engine light', 'Hard start after refueling (purge stuck open)'],
    causes: ['Purge valve stuck open or closed', 'Purge hose disconnected, kinked or cracked', 'Restricted canister'],
    checks: ['Command purge and watch fuel trims / EVAP pressure.', 'Apply vacuum to the purge valve: it should hold when closed.'],
    related: ['P0496', 'P0497', 'P0443'],
    articles: ['smoke-test-vacuum-evap'],
  },
  {
    code: 'P0442',
    title: 'Evaporative Emission System Leak Detected (Small Leak)',
    system: 'emissions',
    severity: 'low',
    meaning: 'The EVAP system failed to hold pressure or vacuum during its leak test. "Small" is about the size of a 0.040-inch (1 mm) hole.',
    symptoms: ['Check engine light', 'Occasional fuel smell'],
    causes: ['Gas cap seal worn or not clicked tight', 'Cracked EVAP hose or loose connection', 'Leaking purge or vent valve', 'Filler neck corroded where the cap seals', 'Canister cracked'],
    checks: ['Inspect and test the gas cap; check the filler neck lip for rust or dents.', 'Smoke test the EVAP system (seal the vent, introduce smoke at the service port).', 'Check the purge and vent valves seal when closed.'],
    related: ['P0455', 'P0456', 'P0457'],
    articles: ['smoke-test-vacuum-evap'],
  },
  {
    code: 'P0443',
    title: 'Evaporative Emission System Purge Control Valve Circuit',
    system: 'emissions',
    severity: 'low',
    meaning: 'The electrical circuit to the purge valve is open, shorted, or the valve coil has failed.',
    symptoms: ['Check engine light'],
    causes: ['Failed purge valve', 'Open or shorted wiring', 'Connector corrosion'],
    checks: ['Measure the valve coil resistance.', 'Check feed voltage and the computer\'s control ground.'],
    related: ['P0441'],
    articles: ['sensor-circuit-testing'],
  },
  {
    code: 'P0446',
    title: 'Evaporative Emission System Vent Control Circuit',
    system: 'emissions',
    severity: 'low',
    meaning: 'The canister vent valve circuit is faulty, or the valve did not seal or open when commanded. The vent valve usually lives near the canister and takes road spray, mud and spiders.',
    symptoms: ['Check engine light', 'Fuel pump nozzle clicking off early when refueling (vent blocked)'],
    causes: ['Vent valve stuck or failed', 'Vent filter or hose blocked with debris or insects', 'Wiring/connector corrosion near the tank'],
    checks: ['Command the vent valve and listen/feel for it.', 'Inspect the vent line and filter for blockage.', 'Check the circuit.'],
    related: ['P0449', 'P0455'],
    articles: ['smoke-test-vacuum-evap'],
  },
  {
    code: 'P0449',
    title: 'Evaporative Emission System Vent Valve/Solenoid Circuit',
    system: 'emissions',
    severity: 'low',
    meaning: 'The electrical circuit to the canister vent valve is open, shorted, or the valve coil has failed.',
    symptoms: ['Check engine light'],
    causes: ['Failed vent solenoid', 'Corroded connector near the canister', 'Open or shorted wiring'],
    checks: ['Measure the solenoid resistance; check power and the control circuit.'],
    related: ['P0446'],
    articles: ['sensor-circuit-testing'],
  },
  ...sensorFamily(EVAP_P, 'Evaporative Emission System Pressure Sensor/Switch', { range: 'P0451', low: 'P0452', high: 'P0453' }, {
    titles: {
      range: 'Evaporative Emission System Pressure Sensor/Switch Range/Performance',
      low: 'Evaporative Emission System Pressure Sensor/Switch Low',
      high: 'Evaporative Emission System Pressure Sensor/Switch High',
    },
    symptoms: ['Check engine light'],
    related: ['P0442', 'P0455'],
  }),
  {
    code: 'P0455',
    title: 'Evaporative Emission System Leak Detected (Large Leak)',
    system: 'emissions',
    severity: 'low',
    meaning: 'The EVAP system could not build or hold any meaningful vacuum or pressure during its self-test — a large leak or an open path.',
    symptoms: ['Check engine light', 'Fuel smell'],
    causes: ['Gas cap missing or not tightened', 'Hose disconnected or split', 'Purge or vent valve stuck open', 'Cracked canister'],
    checks: ['Check the gas cap first.', 'Smoke test: large leaks are usually easy to see.', 'Check that the vent valve closes when commanded.'],
    related: ['P0442', 'P0457', 'P0446'],
    articles: ['smoke-test-vacuum-evap'],
  },
  {
    code: 'P0456',
    title: 'Evaporative Emission System Leak Detected (Very Small Leak)',
    system: 'emissions',
    severity: 'low',
    meaning: 'The EVAP leak test found a very small leak — about the size of a 0.020-inch (0.5 mm) hole. Small enough that smoke may take patience to find.',
    symptoms: ['Check engine light only'],
    causes: ['Gas cap seal', 'Purge valve seeping', 'Tiny crack in a hose or the canister', 'Fuel pump module seal on top of the tank'],
    checks: ['Replace or test the gas cap if it is suspect.', 'Smoke test with a smoke machine that has a flow gauge; look under the vehicle with a bright light.', 'Check the purge valve holds vacuum.'],
    related: ['P0442', 'P0455'],
    articles: ['smoke-test-vacuum-evap'],
  },
  {
    code: 'P0457',
    title: 'Evaporative Emission System Leak Detected (Fuel Cap Loose/Off)',
    system: 'emissions',
    severity: 'low',
    meaning: 'A large EVAP leak was found right after refueling, so the computer suspects the fuel cap.',
    symptoms: ['Check engine light, often a "check fuel cap" message'],
    causes: ['Fuel cap not tightened, cross-threaded or seal damaged', 'Capless filler not sealing (debris in the flapper)'],
    checks: ['Inspect and tighten the cap; replace the seal or cap if damaged.', 'Clear the code; it should not return after a few drive cycles.'],
    related: ['P0455'],
    articles: ['smoke-test-vacuum-evap'],
  },
  {
    code: 'P0496',
    title: 'Evaporative Emission System High Purge Flow',
    system: 'emissions',
    severity: 'medium',
    meaning: 'The computer saw purge flow (vacuum in the tank system) when the purge valve should be closed. A purge valve stuck open pulls fuel vapor into the intake all the time.',
    symptoms: ['Hard start or rough idle right after refueling', 'Rich running at idle'],
    causes: ['Purge valve stuck open (most common)', 'Purge valve wired or controlled incorrectly'],
    checks: ['With the engine idling and purge commanded off, pinch the purge line: if idle quality or trims change, the valve is leaking through.', 'Apply vacuum to the purge valve unpowered: it should hold.'],
    related: ['P0441', 'P2188'],
    articles: ['smoke-test-vacuum-evap'],
  },
  {
    code: 'P0497',
    title: 'Evaporative Emission System Low Purge Flow',
    system: 'emissions',
    severity: 'low',
    meaning: 'When the purge valve was opened the computer did not see enough flow.',
    symptoms: ['Check engine light'],
    causes: ['Purge valve stuck closed', 'Blocked or kinked purge line', 'Canister restricted (charcoal saturated with liquid fuel)'],
    checks: ['Command purge and check for vacuum at the canister side.', 'Inspect lines for kinks and the canister for fuel saturation.'],
    related: ['P0441'],
    articles: ['smoke-test-vacuum-evap'],
  },
  ...sensorFamily(FUEL_LEVEL, 'Fuel Level Sensor "A"', { circuit: 'P0460', range: 'P0461', low: 'P0462', high: 'P0463' }, {
    symptoms: ['Fuel gauge erratic, stuck full or empty', 'Possible EVAP test not running'],
  }),

  // ---- Speed / idle -------------------------------------------------------------------
  {
    code: 'P0500',
    title: 'Vehicle Speed Sensor "A"',
    system: 'transmission',
    severity: 'medium',
    meaning: 'The vehicle speed signal is missing or impossible. Speed often comes from the transmission output sensor or the ABS wheel sensors through the network.',
    symptoms: ['Speedometer dead or erratic', 'Harsh or wrong shifts', 'Cruise control inoperative', 'ABS light on some vehicles'],
    causes: ['Failed speed sensor', 'Damaged wiring or connector', 'ABS module or wheel speed sensor fault (where the speed is shared)', 'Wrong tire size programmed'],
    checks: ['Check where this vehicle gets its speed signal (transmission sensor or ABS).', 'Compare speed readings from the engine computer, ABS module and cluster on the scan tool.', 'Scope the sensor signal.'],
    related: ['P0501', 'P0720', 'C0035'],
    articles: ['sensor-circuit-testing'],
  },
  {
    code: 'P0501',
    title: 'Vehicle Speed Sensor "A" Range/Performance',
    system: 'transmission',
    severity: 'medium',
    meaning: 'The vehicle speed signal does not match what other signals say (engine speed and gear, or wheel speeds).',
    symptoms: ['Speedometer erratic', 'Shift quality changes'],
    causes: ['Failing sensor or tone ring', 'Intermittent wiring', 'Incorrect tire size or axle ratio programming'],
    checks: ['Compare vehicle speed with GPS speed and wheel speeds.', 'Inspect the sensor and tone ring.'],
    related: ['P0500'],
  },
  {
    code: 'P0505',
    title: 'Idle Air Control System',
    system: 'driveability',
    severity: 'medium',
    meaning: 'Idle speed did not respond correctly to the computer\'s idle control (an IAC valve on older engines, the electronic throttle on newer ones).',
    symptoms: ['Idle too high, too low, or hunting', 'Stall when coming to a stop'],
    causes: ['Carbon build-up in the throttle body or IAC passage', 'Failed IAC valve', 'Vacuum leak', 'Idle relearn not done after battery disconnect or cleaning'],
    checks: ['Clean the throttle body and IAC passages.', 'Perform the idle relearn procedure.', 'Smoke test for vacuum leaks.'],
    related: ['P0506', 'P0507'],
    articles: ['throttle-body-service', 'smoke-test-vacuum-evap'],
  },
  {
    code: 'P0506',
    title: 'Idle Control System RPM Lower Than Expected',
    system: 'driveability',
    severity: 'medium',
    meaning: 'Actual idle speed stayed below the computer\'s target even with the idle control at its limit — something is starving the idle of air or adding load.',
    symptoms: ['Low, rough idle', 'Stall when the A/C kicks on or at a stop'],
    causes: ['Dirty throttle body (most common)', 'Restricted air intake', 'Engine mechanical drag or a misfire', 'Accessory load (alternator, A/C compressor)'],
    checks: ['Clean the throttle body and perform the idle relearn.', 'Check for misfires and air restrictions.'],
    related: ['P0505', 'P0507'],
    articles: ['throttle-body-service'],
  },
  {
    code: 'P0507',
    title: 'Idle Control System RPM Higher Than Expected',
    system: 'driveability',
    severity: 'medium',
    meaning: 'Actual idle speed stayed above target even with the idle control closed down — air is getting in that the computer cannot control.',
    symptoms: ['High idle', 'Vehicle pulls hard at a stop'],
    causes: ['Vacuum leak', 'PCV valve or hose leaking', 'Throttle not closing fully (sticking, carbon, cable)', 'Idle relearn needed'],
    checks: ['Smoke test the intake.', 'Check the throttle closes fully.', 'Perform the idle relearn.'],
    related: ['P0505', 'P0506', 'P2187'],
    articles: ['smoke-test-vacuum-evap', 'throttle-body-service'],
  },

  // ---- Oil pressure -----------------------------------------------------------------
  ...sensorFamily(OIL_P, 'Engine Oil Pressure Sensor/Switch "A"', { circuit: 'P0520', range: 'P0521', low: 'P0522', high: 'P0523' }, {
    symptoms: ['Oil pressure gauge erratic or warning light on', 'Possible cylinder deactivation disabled'],
    related: ['P0524'],
  }),
  {
    code: 'P0524',
    title: 'Engine Oil Pressure Too Low',
    system: 'engine',
    severity: 'critical',
    meaning: 'Oil pressure measured below the minimum the engine needs. Treat it as real until a mechanical gauge proves otherwise: running an engine without oil pressure destroys bearings in minutes.',
    symptoms: ['Oil pressure warning', 'Ticking or knocking', 'Engine shut-down or reduced power on some vehicles'],
    causes: ['Low oil level (leak or consumption)', 'Wrong oil viscosity or overdue oil change', 'Clogged oil pickup screen (sludge)', 'Worn oil pump or bearings', 'Failed sensor (only after a mechanical gauge shows good pressure)'],
    checks: ['STOP the engine. Check the oil level.', 'Install a mechanical oil pressure gauge and compare with the specification at idle and 2,000 rpm, hot.', 'If pressure is low, inspect the pickup screen and check for metal in the oil before going further.'],
    related: ['P0520', 'P0521', 'P0011'],
    articles: ['oil-pressure-test'],
  },

  // ---- A/C ---------------------------------------------------------------------------
  ...sensorFamily(ACP, 'A/C Refrigerant Pressure Sensor "A"', { circuit: 'P0530', low: 'P0532', high: 'P0533' }, {
    symptoms: ['A/C compressor will not engage', 'Cooling fans on high constantly'],
  }),

  // ---- Power / modules ----------------------------------------------------------------
  {
    code: 'P0562',
    title: 'System Voltage Low',
    system: 'starting_charging',
    severity: 'medium',
    meaning: 'The computer saw its supply voltage below normal for a period with the engine running — the charging system is not keeping up, or there is a bad connection in the computer\'s power or ground.',
    symptoms: ['Battery or charging light', 'Dim lights, weak start', 'Random electrical faults and module codes'],
    causes: ['Failing alternator', 'Loose or corroded battery terminals or ground straps', 'Worn battery', 'Slipping serpentine belt', 'High resistance in the computer power feed'],
    checks: ['Test the battery and charging output (engine running, loads on).', 'Voltage drop test the charging circuit and grounds.', 'Check the belt and tensioner.'],
    related: ['P0563', 'P0620'],
    articles: ['battery-charging-test', 'voltage-drop-testing'],
  },
  {
    code: 'P0563',
    title: 'System Voltage High',
    system: 'starting_charging',
    severity: 'high',
    meaning: 'Supply voltage went above normal — overcharging can boil a battery and damage modules.',
    symptoms: ['Very bright or flickering lights, bulbs failing', 'Battery hot or smelling of sulfur'],
    causes: ['Failed voltage regulator (in the alternator)', 'Poor sensing connection to the regulator', 'Computer-controlled charging fault'],
    checks: ['Measure charging voltage at the battery; it should stay within the normal charging range (roughly 13.5–14.8 V on most vehicles).', 'Check the alternator sense/control circuits.'],
    related: ['P0562', 'P0620'],
    articles: ['battery-charging-test'],
  },
  {
    code: 'P0571',
    title: 'Brake Switch "A" Circuit',
    system: 'brakes',
    severity: 'medium',
    meaning: 'The brake pedal switch signal is missing or disagrees with a second brake signal.',
    symptoms: ['Cruise control will not engage', 'Brake lights stuck on or off', 'Push-button start will not start (needs brake signal)'],
    causes: ['Brake light switch out of adjustment or failed', 'Blown brake light fuse', 'Wiring fault'],
    checks: ['Check the brake lights work.', 'Watch the brake switch status on the scan tool while pressing the pedal.', 'Check switch adjustment and fuses.'],
    related: [],
  },
  {
    code: 'P0600',
    title: 'Serial Communication Link',
    system: 'network',
    severity: 'medium',
    meaning: 'The engine computer had a problem on an internal or external serial data link.',
    symptoms: ['Various warning lights', 'Possible no-communication with modules'],
    causes: ['Network wiring fault', 'Poor power or ground to the module', 'Failing module'],
    checks: ['Check module powers and grounds.', 'Check network wiring and termination.', 'Check for software updates.'],
    related: ['U0100', 'P0606'],
    articles: ['can-bus-diagnosis'],
  },
  {
    code: 'P0601',
    title: 'Internal Control Module Memory Check Sum Error',
    system: 'network',
    severity: 'high',
    meaning: 'The computer\'s self-check found its stored program does not match its checksum — corrupt memory or a failed flash.',
    symptoms: ['Check engine light, may not start'],
    causes: ['Interrupted or failed programming', 'Internal module failure'],
    checks: ['Check powers and grounds, then try reprogramming with a stable battery maintainer connected.', 'Replace and program the module if reprogramming fails.'],
    related: ['P0602', 'P0606'],
  },
  {
    code: 'P0602',
    title: 'Control Module Programming Error',
    system: 'network',
    severity: 'medium',
    meaning: 'The module is not programmed, or its programming is incomplete (common after replacement).',
    symptoms: ['Check engine light', 'Possible no start'],
    causes: ['New or used module installed without programming', 'Programming interrupted'],
    checks: ['Program the module with the correct calibration for the VIN.'],
    related: ['P0601'],
  },
  {
    code: 'P0603',
    title: 'Internal Control Module Keep Alive Memory (KAM) Error',
    system: 'network',
    severity: 'low',
    meaning: 'The memory the computer keeps while the key is off (learned fuel trims, idle) was lost or corrupted.',
    symptoms: ['Check engine light', 'Rough idle until relearned'],
    causes: ['Battery disconnected or dead recently', 'Poor constant power feed to the module (fuse, corrosion)', 'Module failure'],
    checks: ['Check the module\'s constant (battery) power feed and fuse.', 'Clear and see if it returns; if so, test the feed under load.'],
    related: ['P0562'],
  },
  {
    code: 'P0606',
    title: 'Control Module Processor',
    system: 'network',
    severity: 'high',
    meaning: 'The computer found a fault in its own processor. On electronic throttle systems this also covers the throttle-monitoring processor.',
    symptoms: ['Reduced power / limp mode', 'Stalling, no start'],
    causes: ['Internal module fault', 'Poor power or ground causing processor resets', 'Software issue (check for updates)'],
    checks: ['Check all module powers and grounds with voltage drop tests under load.', 'Check for a software update or TSB.', 'Replace and program the module if the circuits are good.'],
    related: ['P0601', 'P2101'],
    articles: ['voltage-drop-testing'],
  },
  {
    code: 'P0607',
    title: 'Control Module Performance',
    system: 'network',
    severity: 'high',
    meaning: 'An internal performance check of the module failed.',
    symptoms: ['Check engine light, possible limp mode'],
    causes: ['Internal module fault', 'Power or ground problem'],
    checks: ['Check powers and grounds; check for updates; replace and program if needed.'],
    related: ['P0606'],
  },
  {
    code: 'P0620',
    title: 'Generator Control Circuit',
    system: 'starting_charging',
    severity: 'medium',
    meaning: 'The computer controls or monitors the alternator through a control circuit and saw a fault in it.',
    symptoms: ['Charging light', 'Low or high charging voltage'],
    causes: ['Alternator regulator fault', 'Open or shorted control wire', 'Connector at the alternator corroded'],
    checks: ['Check charging voltage.', 'Check the alternator control circuit and connector.'],
    related: ['P0562', 'P0563', 'P0622'],
    articles: ['battery-charging-test'],
  },
  {
    code: 'P0622',
    title: 'Generator Field "F" Control Circuit',
    system: 'starting_charging',
    severity: 'medium',
    meaning: 'The alternator field control or feedback circuit is faulty.',
    symptoms: ['Charging light', 'Low charging voltage'],
    causes: ['Alternator failure', 'Wiring or connector fault'],
    checks: ['Check charging output and the field circuit at the alternator.'],
    related: ['P0620'],
    articles: ['battery-charging-test'],
  },
  {
    code: 'P0641',
    title: 'Sensor Reference Voltage "A" Circuit/Open',
    system: 'electrical',
    severity: 'high',
    meaning: 'The computer supplies a 5-volt reference to several sensors on circuit "A". That reference is pulled down or out of range — usually one sensor or wire on it is shorted, and every sensor sharing it now reads wrong.',
    symptoms: ['Several sensor codes at once', 'Reduced power, stalling or no start'],
    causes: ['A shorted sensor on the reference circuit', 'Chafed reference wire shorted to ground', 'Water in a connector'],
    checks: ['Find which sensors share reference "A" in the wiring diagram.', 'Unplug them one at a time while watching the reference voltage: the one that brings it back to 5 V is the culprit.', 'If none do, check the wiring for a short.'],
    related: ['P0651', 'P2135', 'P0107'],
    articles: ['sensor-circuit-testing'],
  },
  {
    code: 'P0651',
    title: 'Sensor Reference Voltage "B" Circuit/Open',
    system: 'electrical',
    severity: 'high',
    meaning: 'The second 5-volt reference circuit is pulled down or open, affecting every sensor on it.',
    symptoms: ['Several sensor codes at once', 'Reduced power'],
    causes: ['A shorted sensor on the reference circuit', 'Chafed reference wire'],
    checks: ['Find the sensors on reference "B" and unplug them one at a time while watching the reference voltage.'],
    related: ['P0641'],
    articles: ['sensor-circuit-testing'],
  },
  {
    code: 'P0685',
    title: 'ECM/PCM Power Relay Control Circuit/Open',
    system: 'electrical',
    severity: 'high',
    meaning: 'The computer controls its own main power relay and saw a fault in that control circuit.',
    symptoms: ['No start, stalling', 'Intermittent loss of power to the computer'],
    causes: ['Failed main relay', 'Open control wire', 'Fuse'],
    checks: ['Swap the relay with a known-good identical relay.', 'Check the relay coil circuit and the module\'s ignition input.'],
    related: ['P0562'],
    articles: ['voltage-drop-testing'],
  },

  // ---- Transmission ----------------------------------------------------------------
  {
    code: 'P0700',
    title: 'Transmission Control System (MIL Request)',
    system: 'transmission',
    severity: 'medium',
    meaning: 'The transmission computer has a fault stored and asked the engine computer to turn on the check engine light. P0700 itself says nothing about the problem: read codes from the transmission module.',
    symptoms: ['Check engine light', 'Possible harsh shifts or limp mode'],
    causes: ['Any transmission fault stored in the TCM'],
    checks: ['Scan the transmission control module for its own codes and diagnose those.'],
    related: ['P0730', 'P0715', 'P0750'],
    articles: ['transmission-fluid-check'],
  },
  {
    code: 'P0705',
    title: 'Transmission Range Sensor "A" Circuit (PRNDL Input)',
    system: 'transmission',
    severity: 'medium',
    meaning: 'The gear selector (range) sensor reports an invalid or impossible position.',
    symptoms: ['No start in Park/Neutral, or starts in gear', 'Wrong gear on the display', 'Reverse lights not working', 'Harsh engagement'],
    causes: ['Range sensor out of adjustment or failed', 'Shift cable misadjusted', 'Connector corrosion (sensor often on the outside of the transmission)'],
    checks: ['Watch the range sensor reading on the scan tool while moving through each gear.', 'Check shift cable adjustment.', 'Inspect the connector and sensor.'],
    related: ['P0706'],
  },
  {
    code: 'P0706',
    title: 'Transmission Range Sensor "A" Circuit Range/Performance',
    system: 'transmission',
    severity: 'medium',
    meaning: 'The range sensor signal is valid but does not agree with what the transmission is doing.',
    symptoms: ['Wrong gear display', 'Harsh shifts'],
    causes: ['Sensor or cable adjustment', 'Worn sensor contacts'],
    checks: ['Check the sensor reading in each position and the cable adjustment.'],
    related: ['P0705'],
  },
  ...sensorFamily(TFT, 'Transmission Fluid Temperature Sensor "A"', { circuit: 'P0710', range: 'P0711', low: 'P0712', high: 'P0713' }, {
    symptoms: ['Harsh shifts', 'Torque converter clutch not engaging', 'Transmission temperature reading wrong'],
  }),
  ...(
    [
      ['P0715', 'Input/Turbine Speed Sensor "A" Circuit', 'circuit'],
      ['P0716', 'Input/Turbine Speed Sensor "A" Circuit Range/Performance', 'range'],
      ['P0717', 'Input/Turbine Speed Sensor "A" Circuit No Signal', 'none'],
      ['P0720', 'Output Shaft Speed Sensor Circuit', 'circuit'],
      ['P0721', 'Output Shaft Speed Sensor Circuit Range/Performance', 'range'],
      ['P0722', 'Output Shaft Speed Sensor Circuit No Signal', 'none'],
    ] as const
  ).map(([code, title, kind]): DtcEntry => {
    const input = code <= 'P0717';
    return {
      code,
      title,
      system: 'transmission',
      severity: 'medium',
      meaning: `The ${input ? 'input (turbine) shaft' : 'output shaft'} speed sensor ${kind === 'none' ? 'signal is missing' : kind === 'range' ? 'signal is erratic or does not agree with other speeds' : 'circuit is faulty'}. The transmission computer needs it to judge shifts${input ? ' and converter slip' : ' and road speed'}.`,
      symptoms: ['Harsh or erratic shifts', 'Limp mode (stuck in one gear)', input ? 'Torque converter lockup problems' : 'Speedometer dead on some vehicles'],
      causes: ['Failed speed sensor', 'Metal debris on a magnetic sensor tip', 'Wiring or connector fault (internal harness on some units)', 'Damaged tone wheel'],
      checks: ['Watch the speed sensor value while driving: it should rise smoothly with no dropouts.', 'Check sensor resistance / supply, and scope the signal.', 'Inspect the sensor tip for debris (which also tells you about wear inside).'],
      related: (input ? ['P0730', 'P0717'] : ['P0500', 'P0730']).filter((c) => c !== code),
      articles: ['sensor-circuit-testing', 'transmission-fluid-check'],
    };
  }),
  ratio('P0730', 'Any gear', 'Incorrect Gear Ratio'),
  ratio('P0731', 'Gear 1'),
  ratio('P0732', 'Gear 2'),
  ratio('P0733', 'Gear 3'),
  ratio('P0734', 'Gear 4'),
  ratio('P0735', 'Gear 5'),
  ratio('P0736', 'Reverse'),
  {
    code: 'P0740',
    title: 'Torque Converter Clutch Solenoid Circuit/Open',
    system: 'transmission',
    severity: 'medium',
    meaning: 'The electrical circuit to the torque converter clutch (TCC) solenoid is open or faulty, so the converter cannot lock up.',
    symptoms: ['Higher highway RPM, poor economy', 'Transmission running hot'],
    causes: ['Failed TCC solenoid', 'Internal harness or pass-through connector fault', 'Open wiring'],
    checks: ['Measure solenoid resistance through the transmission connector.', 'Check the feed and control circuit.'],
    related: ['P0741', 'P0743'],
    articles: ['transmission-fluid-check'],
  },
  {
    code: 'P0741',
    title: 'Torque Converter Clutch Solenoid Circuit Performance/Stuck Off',
    system: 'transmission',
    severity: 'medium',
    meaning: 'The computer commanded the converter to lock, but engine and turbine speeds still differ — the converter clutch is slipping or not applying.',
    symptoms: ['RPM flare or shudder at 35–55 mph', 'Poor economy', 'Transmission overheating'],
    causes: ['Worn converter clutch', 'TCC solenoid or valve sticking', 'Low or degraded fluid'],
    checks: ['Check fluid level and condition.', 'Watch TCC slip RPM while commanding lockup.', 'Check for TSBs (fluid changes and reflashes are common fixes for shudder).'],
    related: ['P0740'],
    articles: ['transmission-fluid-check'],
  },
  {
    code: 'P0743',
    title: 'Torque Converter Clutch Solenoid Circuit Electrical',
    system: 'transmission',
    severity: 'medium',
    meaning: 'The TCC solenoid circuit has an electrical fault (open, short to ground or short to voltage).',
    symptoms: ['No converter lockup', 'Possible stall when stopping if it is stuck on'],
    causes: ['Solenoid failure', 'Wiring or internal harness fault'],
    checks: ['Measure solenoid resistance and check the circuit for shorts.'],
    related: ['P0740'],
  },
  {
    code: 'P0748',
    title: 'Pressure Control Solenoid "A" Electrical',
    system: 'transmission',
    severity: 'high',
    meaning: 'The line pressure control solenoid circuit is faulty. Most transmissions default to maximum line pressure.',
    symptoms: ['Very harsh shifts and engagement', 'Limp mode'],
    causes: ['Failed pressure control solenoid', 'Internal harness fault', 'Connector'],
    checks: ['Measure solenoid resistance; check the circuit.'],
    related: ['P0700'],
  },
  ...(
    [
      ['P0750', 'Shift Solenoid "A"', 'A'],
      ['P0751', 'Shift Solenoid "A" Performance/Stuck Off', 'A'],
      ['P0755', 'Shift Solenoid "B"', 'B'],
      ['P0756', 'Shift Solenoid "B" Performance/Stuck Off', 'B'],
      ['P0760', 'Shift Solenoid "C"', 'C'],
      ['P0765', 'Shift Solenoid "D"', 'D'],
    ] as const
  ).map(
    ([code, title, letter]): DtcEntry => ({
      code,
      title,
      system: 'transmission',
      severity: 'high',
      meaning: title.includes('Performance')
        ? `Shift solenoid ${letter} is electrically fine but the transmission did not respond to it — the solenoid or the valve it moves is sticking, or the hydraulic circuit is leaking.`
        : `The electrical circuit to shift solenoid ${letter} is open or shorted, so the gears it controls are not available.`,
      symptoms: ['Missing gears or stuck in one gear (limp mode)', 'Harsh or wrong shifts'],
      causes: title.includes('Performance')
        ? ['Debris or varnish sticking the solenoid or valve', 'Low or degraded fluid', 'Worn valve body bores']
        : ['Failed solenoid', 'Internal harness or pass-through connector fault', 'Open or shorted wiring'],
      checks: ['Check fluid level and condition.', 'Measure solenoid resistance at the transmission connector.', 'Command the solenoid with a scan tool and check the shift response.'],
      related: ['P0700', 'P0730'],
      articles: ['transmission-fluid-check'],
    })
  ),
  {
    code: 'P0841',
    title: 'Transmission Fluid Pressure Sensor/Switch "A" Circuit Range/Performance',
    system: 'transmission',
    severity: 'medium',
    meaning: 'A transmission pressure switch reported pressure (or no pressure) when the computer expected the opposite for that gear.',
    symptoms: ['Harsh shifts', 'Limp mode'],
    causes: ['Low fluid', 'Sticking pressure switch (often part of a switch manifold)', 'Internal leak'],
    checks: ['Check fluid level.', 'Watch the pressure switch states in each gear.'],
    related: ['P0868'],
    articles: ['transmission-fluid-check'],
  },
  {
    code: 'P0868',
    title: 'Transmission Fluid Pressure Low',
    system: 'transmission',
    severity: 'high',
    meaning: 'Transmission line pressure is lower than commanded.',
    symptoms: ['Slipping, delayed engagement', 'Limp mode'],
    causes: ['Low fluid level', 'Clogged filter', 'Worn pump', 'Internal leaks (seals)', 'Pressure sensor fault'],
    checks: ['Check fluid level and condition.', 'Mechanical line pressure test where a port exists.'],
    related: ['P0841', 'P0730'],
    articles: ['transmission-fluid-check'],
  },
  {
    code: 'P0882',
    title: 'TCM Power Input Signal Low',
    system: 'transmission',
    severity: 'medium',
    meaning: 'The transmission computer saw its supply voltage low.',
    symptoms: ['Harsh shifts or limp mode', 'Often appears with charging problems or a weak battery'],
    causes: ['Weak battery or charging system', 'Poor TCM power feed or ground', 'Blown fuse'],
    checks: ['Test the battery and charging system.', 'Voltage drop test the TCM feed and ground.'],
    related: ['P0562'],
    articles: ['battery-charging-test', 'voltage-drop-testing'],
  },

  // ---- Electronic throttle ----------------------------------------------------------
  {
    code: 'P2101',
    title: 'Throttle Actuator "A" Control Motor Circuit Range/Performance',
    system: 'driveability',
    severity: 'high',
    meaning: 'The throttle motor is not moving the throttle the way it was commanded — it is sticking, slow, or its circuit is weak.',
    symptoms: ['Reduced power / limp mode', 'Idle stuck high or engine will not rev'],
    causes: ['Carbon build-up sticking the throttle plate', 'Failing throttle motor or gears', 'Poor connection at the throttle body', 'Low system voltage'],
    checks: ['Inspect and clean the throttle body (key off, battery precautions per the manufacturer).', 'Check the connector and wiring at the throttle body.', 'Watch commanded vs. actual throttle angle.', 'Perform the throttle relearn after any service.'],
    related: ['P2111', 'P2112', 'P2135'],
    articles: ['throttle-body-service'],
  },
  {
    code: 'P2111',
    title: 'Throttle Actuator "A" Control System - Stuck Open',
    system: 'driveability',
    severity: 'high',
    meaning: 'The throttle did not close as far as commanded.',
    symptoms: ['High idle', 'Reduced power mode'],
    causes: ['Debris or ice holding the throttle open', 'Throttle body gear or motor fault'],
    checks: ['Inspect the throttle bore and plate.', 'Check commanded vs. actual angle.'],
    related: ['P2101', 'P2112'],
    articles: ['throttle-body-service'],
  },
  {
    code: 'P2112',
    title: 'Throttle Actuator "A" Control System - Stuck Closed',
    system: 'driveability',
    severity: 'high',
    meaning: 'The throttle did not open as far as commanded.',
    symptoms: ['Stall, no power', 'Limp mode'],
    causes: ['Carbon or ice holding the plate closed', 'Throttle motor failure'],
    checks: ['Clean and inspect the throttle body; check the motor circuit.'],
    related: ['P2101', 'P2111'],
    articles: ['throttle-body-service'],
  },
  {
    code: 'P2119',
    title: 'Throttle Actuator "A" Control Throttle Body Range/Performance',
    system: 'driveability',
    severity: 'high',
    meaning: 'The throttle did not return to its rest ("default") position when unpowered, or moved outside its expected range.',
    symptoms: ['Reduced power mode', 'Idle problems'],
    causes: ['Carbon build-up', 'Weak return spring', 'Throttle body failure'],
    checks: ['Clean the throttle body and run the relearn; replace it if the fault returns.'],
    related: ['P2101'],
    articles: ['throttle-body-service'],
  },
  {
    code: 'P2135',
    title: 'Throttle/Pedal Position Sensor/Switch "A"/"B" Voltage Correlation',
    system: 'driveability',
    severity: 'high',
    meaning: 'An electronic throttle has two position sensors that must agree. They disagreed, so the computer cannot trust the throttle position and limits power.',
    symptoms: ['Reduced power / limp mode', 'Stalling or surging'],
    causes: ['Worn throttle position sensors in the throttle body', 'Poor connection at the throttle body connector', 'Shared reference or ground fault'],
    checks: ['Graph both TPS signals together while slowly sweeping the throttle — look for a spot where they stop tracking each other.', 'Wiggle test the connector and harness.', 'Check 5-volt reference and ground at the throttle body.'],
    related: ['P0122', 'P0222', 'P2101', 'P0641'],
    articles: ['throttle-body-service', 'sensor-circuit-testing'],
  },
  {
    code: 'P2138',
    title: 'Throttle/Pedal Position Sensor/Switch "D"/"E" Voltage Correlation',
    system: 'driveability',
    severity: 'high',
    meaning: 'The two accelerator pedal position sensors disagree, so the computer cannot trust the driver\'s request and limits power.',
    symptoms: ['Reduced power / limp mode', 'Pedal not responding'],
    causes: ['Worn pedal assembly', 'Connector at the pedal loose or corroded', 'Reference or ground fault'],
    checks: ['Graph both pedal signals while slowly pressing the pedal; look for disagreement.', 'Check the connector and circuits at the pedal.'],
    related: ['P2122', 'P2127'],
    articles: ['sensor-circuit-testing'],
  },

  // ---- Boost -------------------------------------------------------------------------
  {
    code: 'P0234',
    title: 'Turbocharger/Supercharger "A" Overboost Condition',
    system: 'driveability',
    severity: 'high',
    meaning: 'Boost pressure went above the computer\'s limit. Boost control (wastegate or variable vanes) is not limiting it.',
    symptoms: ['Sudden loss of power (the computer cuts boost)', 'Surging'],
    causes: ['Wastegate stuck closed or its actuator/linkage seized', 'Boost control solenoid fault', 'Variable geometry vanes sticking (diesels)', 'Boost pressure sensor reading high'],
    checks: ['Compare commanded vs. actual boost on the scan tool.', 'Check wastegate/vane movement and the control solenoid and lines.', 'Verify the boost sensor reading against barometric pressure with the engine off.'],
    related: ['P0299'],
  },
  {
    code: 'P0299',
    title: 'Turbocharger/Supercharger "A" Underboost Condition',
    system: 'driveability',
    severity: 'medium',
    meaning: 'Boost pressure stayed below what the computer commanded.',
    symptoms: ['Low power, slow acceleration', 'Whistling or hissing under load (boost leak)'],
    causes: ['Boost leak: split intercooler hose, loose clamp, cracked intercooler', 'Wastegate stuck open or its actuator leaking', 'Worn or damaged turbo', 'Restricted air filter or exhaust', 'Boost control solenoid fault'],
    checks: ['Pressure (smoke) test the intake and intercooler system.', 'Check wastegate actuation and control.', 'Inspect the turbo for shaft play and damaged blades.', 'Compare commanded vs. actual boost.'],
    related: ['P0234', 'P0101'],
    articles: ['smoke-test-vacuum-evap'],
  },

  // ---- Diesel aftertreatment ----------------------------------------------------------
  {
    code: 'P2002',
    title: 'Diesel Particulate Filter Efficiency Below Threshold (Bank 1)',
    system: 'diesel',
    severity: 'medium',
    meaning: 'The DPF is not trapping soot the way it should — usually a cracked or melted filter, or a faulty differential pressure measurement.',
    symptoms: ['Check engine light', 'Visible black smoke from the tailpipe'],
    causes: ['Cracked or melted DPF', 'DPF differential pressure sensor or hoses faulty', 'DPF removed or damaged'],
    checks: ['Check the DPF pressure sensor reading and hoses.', 'Inspect the outlet of the DPF for soot (a good filter leaves the tailpipe clean).'],
    related: ['P2463'],
  },
  {
    code: 'P2463',
    title: 'Diesel Particulate Filter Restriction - Soot Accumulation (Bank 1)',
    system: 'diesel',
    severity: 'high',
    meaning: 'The DPF is loaded with soot past the point a normal regeneration clears. Driving patterns, a fault preventing regeneration, or an engine making too much soot.',
    symptoms: ['Reduced power', 'Regeneration-required messages', 'Higher fuel consumption'],
    causes: ['Short trips that never allow regeneration', 'A fault blocking regeneration (sensor codes, low DEF, EGR fault)', 'Excess soot from injectors, EGR or boost problems', 'Faulty DPF pressure sensor'],
    checks: ['Fix any other stored codes first — they often block regeneration.', 'Check the DPF pressure sensor and its hoses.', 'Perform a service (forced) regeneration with the scan tool under the conditions the manufacturer specifies.'],
    related: ['P242F', 'P2002'],
  },
  {
    code: 'P242F',
    title: 'Diesel Particulate Filter Restriction - Ash Accumulation (Bank 1)',
    system: 'diesel',
    severity: 'high',
    meaning: 'Ash (from oil additives), which regeneration cannot burn off, has built up in the DPF. The filter needs cleaning or replacement.',
    symptoms: ['Reduced power', 'Frequent regenerations'],
    causes: ['High mileage on the DPF', 'Engine burning oil (accelerates ash)', 'Wrong oil specification (high-ash oil)'],
    checks: ['Confirm the ash load reading.', 'Check for oil consumption.', 'Clean or replace the DPF; reset the ash learned value with the scan tool.'],
    related: ['P2463'],
  },
  {
    code: 'P20EE',
    title: 'SCR NOx Catalyst Efficiency Below Threshold (Bank 1)',
    system: 'diesel',
    severity: 'medium',
    meaning: 'The selective catalytic reduction system is not reducing NOx enough, measured by the NOx sensors before and after it.',
    symptoms: ['Check engine light', 'DEF warnings, possible speed limitation countdown'],
    causes: ['Poor-quality or contaminated DEF', 'DEF doser clogged with crystals', 'NOx sensor fault', 'Degraded SCR catalyst', 'Exhaust leak'],
    checks: ['Test DEF concentration with a refractometer.', 'Inspect the DEF doser for crystals; run a dosing quantity test.', 'Compare upstream and downstream NOx sensor values.', 'Check for software updates.'],
    related: [],
  },

  // ---- Hybrid --------------------------------------------------------------------------
  {
    code: 'P0A80',
    title: 'Replace Hybrid Battery Pack',
    system: 'hybrid_ev',
    severity: 'medium',
    meaning: 'The hybrid computer found the battery blocks (modules) out of balance — one or more blocks have weakened compared with the rest.',
    symptoms: ['Hybrid warning, check engine light', 'Engine runs more, worse economy', 'Battery state of charge swings quickly'],
    causes: ['Aged or failed battery modules', 'Corroded bus bars between modules', 'Battery cooling fan or duct blocked (overheats the pack)'],
    checks: [
      'High voltage: follow the manufacturer\'s disable procedure and use rated gloves before touching anything orange.',
      'Read block voltages on the scan tool under load and rest; find the weak blocks.',
      'Check the battery cooling fan and intake for blockage (pet hair, debris).',
      'Inspect bus bars for corrosion before condemning the pack.',
    ],
    related: ['P0AA6'],
  },
  {
    code: 'P0AA6',
    title: 'Hybrid Battery Voltage System Isolation Fault',
    system: 'hybrid_ev',
    severity: 'critical',
    meaning: 'The high-voltage system leaks current to the vehicle chassis — insulation somewhere has broken down. This is a safety fault.',
    symptoms: ['Hybrid system warning', 'Vehicle may not enter ready mode'],
    causes: ['Coolant leaking into the inverter or motor', 'Damaged high-voltage cable insulation', 'A/C compressor (electric) internal leakage', 'Water intrusion in the battery pack'],
    checks: ['Do not work on the high-voltage system without training, rated gloves and the disable procedure.', 'Use an insulation tester (megohmmeter) per the service information to isolate the component.'],
    related: ['P0A80'],
  },

  // ---- Network (U codes) ------------------------------------------------------------
  {
    code: 'U0001',
    title: 'High Speed CAN Communication Bus',
    system: 'network',
    severity: 'high',
    meaning: 'A module saw a problem on the high-speed CAN bus itself — the network wires, not one module.',
    symptoms: ['Many warning lights, gauges dropping out', 'Possible no start'],
    causes: ['CAN high or low shorted to ground, voltage or each other', 'Open bus wire', 'A failed module pulling the bus down', 'Aftermarket device spliced into the network'],
    checks: ['Key off, measure resistance between CAN high and low at the DLC: about 60 ohms means both terminating resistors are present.', 'Key on, measure CAN high (about 2.5–3.5 V) and CAN low (about 1.5–2.5 V) to ground.', 'Unplug modules one at a time to find one pulling the bus down.'],
    related: ['U0100', 'U0073'],
    articles: ['can-bus-diagnosis'],
  },
  {
    code: 'U0073',
    title: 'Control Module Communication Bus "A" Off',
    system: 'network',
    severity: 'high',
    meaning: 'A module shut its connection to bus "A" because of too many errors.',
    symptoms: ['Multiple modules not communicating', 'Warning lights'],
    causes: ['Bus wiring short or open', 'A failing module disrupting the bus', 'Low voltage'],
    checks: ['Check battery voltage first.', 'Check bus resistance and voltages at the DLC.', 'Isolate modules one at a time.'],
    related: ['U0001'],
    articles: ['can-bus-diagnosis'],
  },
  ...(
    [
      ['U0100', 'ECM/PCM "A"', 'engine computer'],
      ['U0101', 'TCM', 'transmission computer'],
      ['U0121', 'Anti-Lock Brake System (ABS) Control Module', 'ABS module'],
      ['U0140', 'Body Control Module', 'body control module'],
      ['U0151', 'Restraints Control Module', 'airbag (restraints) module'],
      ['U0155', 'Instrument Panel Cluster (IPC) Control Module', 'instrument cluster'],
      ['U0164', 'HVAC Control Module', 'climate control module'],
      ['U0184', 'Radio', 'radio / infotainment unit'],
    ] as const
  ).map(
    ([code, who, plain]): DtcEntry => ({
      code,
      title: `Lost Communication With ${who}`,
      system: 'network',
      severity: code === 'U0100' || code === 'U0121' || code === 'U0151' ? 'high' : 'medium',
      meaning: `Another module expected messages from the ${plain} and stopped hearing them. The ${plain} itself may be dead (no power or ground), its network wires may be broken, or it may have just dropped out once during a low-voltage event like a weak start.`,
      symptoms: ['Warning lights for the systems that depend on its data', 'Features controlled by that module not working'],
      causes: [`${plain[0].toUpperCase() + plain.slice(1)} has lost power or ground (check its fuses first)`, 'Open or shorted network wiring to that module', 'Module failure', 'Low battery voltage during cranking (historic code only)'],
      checks: [
        'Check whether the code is current or history. A history U code with a weak battery may just be a symptom of the low voltage.',
        `Try to talk to the ${plain} with the scan tool. If it answers, check what was happening when the code set.`,
        `If it does not answer, check its fuses, powers and grounds before anything else.`,
        'Check network wiring and termination at the module connector.',
      ],
      related: ['U0001', 'P0562'],
      articles: ['can-bus-diagnosis', 'battery-charging-test'],
    })
  ),
  ...(
    [
      ['U0401', 'ECM/PCM "A"'],
      ['U0415', 'Anti-Lock Brake System (ABS) Control Module'],
      ['U0422', 'Body Control Module'],
    ] as const
  ).map(
    ([code, who]): DtcEntry => ({
      code,
      title: `Invalid Data Received From ${who}`,
      system: 'network',
      severity: 'medium',
      meaning: `Messages from the ${who} are arriving, but the data in them is invalid — often because that module has its own fault and is flagging the signal as bad.`,
      symptoms: ['Warning lights for systems that use that data'],
      causes: ['A fault inside the sending module (read its codes)', 'Software mismatch between modules after a replacement or update', 'Intermittent network fault'],
      checks: [`Read the codes in the ${who} itself and fix those first.`, 'Check for software updates for both modules.'],
      related: ['U0100', 'U0121', 'U0140'],
      articles: ['can-bus-diagnosis'],
    })
  ),

  // ---- Chassis (wheel speed) — meanings vary by manufacturer ----------------------------
  ...(
    [
      ['C0035', 'Left Front'],
      ['C0040', 'Right Front'],
      ['C0045', 'Left Rear'],
      ['C0050', 'Right Rear'],
    ] as const
  ).map(
    ([code, corner]): DtcEntry => ({
      code,
      title: `${corner} Wheel Speed Sensor Circuit`,
      system: 'brakes',
      severity: 'medium',
      varies: true,
      meaning: `The ABS module saw a fault in the ${corner.toLowerCase()} wheel speed sensor signal or circuit. ABS and traction control are disabled; normal brakes still work. (This is the common GM-style meaning; some makes number chassis codes differently — check the shop code book for the make.)`,
      symptoms: ['ABS and traction control lights', 'Speedometer erratic on some vehicles'],
      causes: ['Damaged or corroded sensor wiring (flexes with suspension travel)', 'Rust lifting the sensor or packing the tone ring', 'Failed sensor', 'Wheel bearing with a built-in tone ring failing'],
      checks: ['Watch all four wheel speeds on the scan tool while driving slowly — the bad one drops out or reads low.', 'Inspect the harness where it flexes near the wheel.', 'Check sensor output (AC volts on passive sensors, a square wave on active sensors).', 'Remove the sensor and clean rust from the bore; inspect the tone ring.'],
      related: ['C0035', 'C0040', 'C0045', 'C0050', 'P0500'].filter((c) => c !== code),
      articles: ['wheel-bearing-diagnosis'],
    })
  ),
];

/** Every library entry, keyed by code. Duplicate codes are a bug (see tests). */
export const DTC_LIBRARY: ReadonlyMap<string, DtcEntry> = new Map(ENTRIES.map((e) => [e.code, e]));

export const DTC_ENTRIES: readonly DtcEntry[] = ENTRIES;
