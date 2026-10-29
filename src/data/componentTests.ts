/**
 * Guided component testing: how a part works and how to test it at the
 * connector, step by step, with the readings a good part usually gives.
 *
 * Written for AP Data from general shop practice, by circuit type — a 3-wire
 * 5 V sensor tests the same way on a Ford as on a Toyota. Vehicle-specific
 * pin numbers and wire colors come from the shop's own pinouts
 * (connector_pinouts), never copied from OEM or ProDemand data, which is
 * licensed. Typical values are a guide: the service information wins.
 *
 * No imports, so the node test runner loads it directly (tests/testing.test.ts).
 */

export type TestKind = 'sensor' | 'actuator' | 'power' | 'module' | 'network' | 'mechanical';

export const TEST_KIND_LABEL: Record<TestKind, string> = {
  sensor: 'Sensors',
  actuator: 'Actuators',
  power: 'Power, ground and charging',
  module: 'Modules',
  network: 'Networks',
  mechanical: 'Mechanical checks',
};

/** One circuit at the connector, described by what it does (not a pin number). */
export type TestPin = { role: string; typical: string };

export type TestStep = {
  title: string;
  /** What to do, in order. */
  how: string;
  /** What a good circuit or part shows. */
  good: string;
  /** What a bad reading means. */
  bad?: string;
};

export type ComponentTest = {
  id: string;
  name: string;
  kind: TestKind;
  /** Component location ids (src/data/locations.ts) this test is for. */
  components: string[];
  /** How the circuit works, in plain words. */
  operation: string;
  /** Typical circuits at the connector. */
  pins: TestPin[];
  tools: string[];
  steps: TestStep[];
  /** What a good scope pattern looks like, where a scope helps. */
  scope?: string;
  cautions?: string[];
  /** Built-in article slugs (src/data/articles.ts). */
  articles?: string[];
};

const DMM = 'Digital multimeter';
const BACKPROBE = 'Back-probe pins or a breakout lead';
const SCAN = 'Scan tool with live data';
const SCOPE = 'Lab scope';
const TESTLIGHT = 'Test light (LED or incandescent load)';
const FUSED = 'Fused jumper leads';

export const COMPONENT_TESTS: ComponentTest[] = [
  // ---------------------------------------------------------------- sensors
  {
    id: 'thermistor',
    name: 'Temperature sensor (2-wire thermistor)',
    kind: 'sensor',
    components: ['ect', 'iat', 'ambient-temp', 'trans-fluid'],
    operation:
      'A resistor that changes with temperature (NTC: resistance falls as it warms). The module feeds it 5 V through a fixed resistor and reads the voltage left on the signal wire: cold reads high voltage, hot reads low.',
    pins: [
      { role: 'Signal (5 V pull-up from the module)', typical: 'About 5 V unplugged, key on' },
      { role: 'Sensor ground (from the module)', typical: 'Under 0.1 V to battery negative' },
    ],
    tools: [SCAN, DMM, BACKPROBE, FUSED],
    steps: [
      { title: 'Compare to the real temperature', how: 'Engine cold-soaked overnight: compare ECT, IAT and ambient on the scan tool.', good: 'All within about 5–10 °F of each other and of the air temperature.', bad: 'One sensor far off the others points at that sensor or its circuit.' },
      { title: 'Open the circuit', how: 'Key on, unplug the sensor and watch the scan tool.', good: 'Reading drops to the minimum (about −40 °F) and an open/high-input code may set.', bad: 'No change: the scan tool is not reading this circuit — wrong sensor or a short.' },
      { title: 'Short the circuit', how: 'With a fused jumper, connect signal to sensor ground at the harness connector.', good: 'Reading jumps to the maximum (about 280–300 °F).', bad: 'No change: open in the signal or ground wire back to the module.' },
      { title: 'Check the reference', how: 'Unplugged, key on: measure signal to ground at the harness.', good: 'About 5 V (some modules use 3.3 V).', bad: '0 V: open or shorted to ground. 12 V: shorted to power.' },
      { title: 'Check the sensor', how: 'Measure the sensor’s resistance and compare to its chart at a known temperature.', good: 'Typical: several kΩ cold (about 2–3 kΩ at 68 °F), a few hundred Ω hot (about 200–300 Ω at 200 °F).', bad: 'Open, shorted, or far off the chart: replace the sensor.' },
    ],
    cautions: ['Check coolant level and bleed the system first — an air pocket makes a good ECT read wrong.'],
    articles: ['sensor-circuit-testing'],
  },
  {
    id: 'five-volt-sensor',
    name: '3-wire 5 V sensor (pressure or position)',
    kind: 'sensor',
    components: ['map', 'oil-pressure', 'high-pressure-pump', 'evap-canister', 'ac-compressor', 'fuel-pump'],
    operation:
      'A powered sensor: the module sends a regulated 5 V reference and a ground, and the sensor returns a signal between them — about 0.5 V at one end of its range and 4.5 V at the other. MAP, fuel rail pressure, fuel tank pressure, A/C pressure and oil pressure sensors work this way.',
    pins: [
      { role: '5 V reference', typical: '4.8–5.2 V, key on' },
      { role: 'Signal', typical: 'Between about 0.5 and 4.5 V, changes with pressure' },
      { role: 'Sensor ground', typical: 'Under 0.1 V to battery negative' },
    ],
    tools: [SCAN, DMM, BACKPROBE, 'Vacuum pump (MAP)', 'Mechanical gauge (pressure sensors)'],
    steps: [
      { title: 'Check the reading makes sense', how: 'Key on engine off, then idle. Compare the scan reading to what it should be (MAP: key on = barometric pressure; idle = high vacuum).', good: 'MAP: about 4–4.5 V / 29–30 inHg key on at sea level; about 1–1.5 V at a warm idle.', bad: 'Stuck at one value or at 0 or 5 V: circuit or sensor fault.' },
      { title: 'Check the 5 V reference', how: 'Back-probe the reference wire to battery negative, key on.', good: '4.8–5.2 V.', bad: 'Low or 0 V on every 5 V sensor: a shorted sensor on the shared reference — unplug them one at a time until it comes back.' },
      { title: 'Check the ground', how: 'Back-probe sensor ground to battery negative, key on.', good: 'Under 0.1 V.', bad: 'Higher: poor ground in the harness or at the module.' },
      { title: 'Move the signal', how: 'Back-probe the signal and change what it measures (vacuum pump on MAP; start the engine for oil pressure; A/C on for refrigerant pressure).', good: 'Smooth change with no dropouts, matching a mechanical gauge.', bad: 'Signal matches neither gauge nor scan: sensor. Signal right at the sensor but wrong on the scan tool: wiring or module.' },
      { title: 'Prove the signal wire', how: 'Unplug the sensor and jumper the 5 V reference to the signal at the harness.', good: 'Scan reads the maximum (and a high-input code may set).', bad: 'No change: open signal wire to the module.' },
    ],
    cautions: ['On fuel rail pressure sensors, never open a high-pressure fuel line with the engine running.'],
    articles: ['sensor-circuit-testing'],
  },
  {
    id: 'hall-sensor',
    name: 'Hall-effect position sensor (3-wire crank, cam, speed)',
    kind: 'sensor',
    components: ['crank-sensor', 'cam-sensor', 'trans-speed'],
    operation:
      'A powered sensor with electronics inside: it switches its signal between low and high as teeth or windows on a reluctor pass, making a square wave. The module counts the edges to know engine speed and position.',
    pins: [
      { role: 'Power (5 V or 12 V, depends on the maker)', typical: '5 V or battery voltage, key on' },
      { role: 'Signal', typical: 'Square wave 0 V to 5 V (or 12 V) while cranking' },
      { role: 'Ground', typical: 'Under 0.1 V to battery negative' },
    ],
    tools: [SCAN, SCOPE, DMM, BACKPROBE],
    steps: [
      { title: 'Look for RPM while cranking', how: 'Crank the engine and watch engine RPM (and cam/crank sync if the scan tool shows it).', good: 'RPM about 150–300 while cranking.', bad: '0 RPM on a crank-sensor no-start: test the circuit below.' },
      { title: 'Check power and ground', how: 'Back-probe power and ground at the connector, key on.', good: 'Power at its supply voltage; ground under 0.1 V.', bad: 'No power: fuse, relay or module reference. A shorted crank sensor can pull down a shared 5 V reference.' },
      { title: 'Scope the signal', how: 'Back-probe the signal and crank or run the engine.', good: 'Clean square wave, full height, with the missing-tooth or window pattern repeating every revolution.', bad: 'Missing or ragged edges, low amplitude or dropouts when hot: sensor or reluctor.' },
      { title: 'Check cam-to-crank timing', how: 'Scope crank and cam together (two channels).', good: 'The same relationship every time — compare to a known-good capture of the same engine.', bad: 'Shifted pattern: timing chain stretch or a jumped belt (P0016–P0019).' },
    ],
    scope: 'Square wave that switches cleanly from near 0 V to the supply voltage, with the missing tooth (crank) or window pattern (cam) repeating.',
    cautions: ['Many fail only hot: test after a heat soak, or warm the sensor with a heat gun.'],
    articles: ['cam-crank-correlation', 'no-start-diagnosis'],
  },
  {
    id: 'reluctance-sensor',
    name: 'Magnetic (variable reluctance) sensor, 2-wire',
    kind: 'sensor',
    components: ['crank-sensor', 'wheel-speed', 'trans-speed'],
    operation:
      'A coil around a magnet. Teeth passing the tip make an AC voltage — the faster they pass, the higher the voltage and frequency. It needs no power. Older crank sensors, passive wheel speed sensors and many transmission speed sensors work this way.',
    pins: [
      { role: 'Signal +', typical: 'AC voltage while turning' },
      { role: 'Signal − (low reference)', typical: 'AC voltage while turning' },
    ],
    tools: [DMM, SCOPE, SCAN],
    steps: [
      { title: 'Measure the coil', how: 'Unplug the sensor and measure resistance across its two pins, then each pin to the sensor body.', good: 'Typical 200–2,000 Ω across the pins (check the spec); open (no continuity) to the body.', bad: 'Open, near 0 Ω, or continuity to the body: replace the sensor.' },
      { title: 'Measure the output', how: 'Meter on AC volts across the pins; crank the engine or spin the wheel by hand.', good: 'Typical: about 0.2 V AC or more cranking or spinning slowly, rising with speed.', bad: 'Little or no output: sensor gap too large, metal debris on the magnet tip, or a damaged tone ring.' },
      { title: 'Compare side to side', how: 'Drive or spin the wheels and compare all wheel speeds on the scan tool.', good: 'All four read the same at a steady speed.', bad: 'One reads low or drops out: that sensor, tone ring, or wheel bearing play.' },
    ],
    scope: 'Sine-like wave that grows taller and closer together as speed rises; each tooth gives one cycle. A flat spot or a short cycle shows a damaged tooth.',
    articles: ['sensor-circuit-testing'],
  },
  {
    id: 'active-wheel-speed',
    name: 'Active wheel speed sensor (2-wire, powered by the ABS module)',
    kind: 'sensor',
    components: ['wheel-speed'],
    operation:
      'A magneto-resistive or Hall sensor powered by the ABS module over the same two wires it signals on: it switches its current draw between two levels (often about 7 and 14 mA) as the tone ring or magnetic encoder passes. Most vehicles since the mid-2000s use these.',
    pins: [
      { role: 'Supply from the ABS module', typical: 'About 8–12 V key on, unplugged' },
      { role: 'Signal return', typical: 'Current switches between two levels while turning' },
    ],
    tools: [SCAN, DMM, BACKPROBE, SCOPE],
    steps: [
      { title: 'Check live wheel speeds', how: 'Spin the wheel by hand or drive slowly; compare all four wheel speeds on the scan tool.', good: 'Reading starts at very low speed and matches the other wheels.', bad: 'No reading or erratic: sensor, wiring or encoder.' },
      { title: 'Check the supply', how: 'Unplug the sensor, key on, and measure across the two harness pins.', good: 'Supply voltage from the module (often 8–12 V).', bad: 'No voltage: open wire or module output — check the wiring along the strut and at the body grommet.' },
      { title: 'Watch the current', how: 'With a meter in series (mA) or a scope across a small shunt, turn the wheel slowly.', good: 'Two steady levels switching as the wheel turns.', bad: 'No switching: sensor or a damaged magnetic encoder in the wheel bearing.' },
    ],
    cautions: ['Do not measure resistance on an active sensor — the reading means nothing and the meter can damage it.', 'A magnetic encoder ring is inside many wheel bearings: a bearing installed backwards or a damaged seal kills the signal.'],
  },
  {
    id: 'narrowband-o2',
    name: 'Oxygen sensor (zirconia narrowband, 4-wire)',
    kind: 'sensor',
    components: ['o2-upstream', 'o2-downstream'],
    operation:
      'The sensor makes its own voltage from the oxygen difference between exhaust and outside air: about 0.1 V lean and 0.9 V rich. It only works hot, so it has a heater. Upstream sensors switch back and forth as fuel control trims; a downstream sensor behind a healthy converter stays steady.',
    pins: [
      { role: 'Heater power', typical: 'Battery voltage, key on or engine running' },
      { role: 'Heater control (module grounds it)', typical: 'Switched or pulsed ground' },
      { role: 'Signal', typical: '0.1–0.9 V, switching (upstream)' },
      { role: 'Signal ground / low reference', typical: 'Under 0.1 V (some modules bias it about 0.45 V)' },
    ],
    tools: [SCAN, DMM, BACKPROBE, SCOPE, 'Propane enrichment tool'],
    steps: [
      { title: 'Watch it switch', how: 'Warm engine, hold about 2,500 RPM and graph upstream O2.', good: 'Switches between under 0.3 V and over 0.6 V, several times a second.', bad: 'Slow, lazy or stuck: a tired sensor, or a real rich or lean condition — check fuel trims first.' },
      { title: 'Drive it rich and lean', how: 'Add propane at the intake (or snap the throttle), then make a small vacuum leak.', good: 'Rich: over 0.8 V within a second. Lean: under 0.2 V.', bad: 'Does not reach both ends: replace the sensor.' },
      { title: 'Check the heater', how: 'Unplug and measure heater resistance; with the key on, check heater power at the harness.', good: 'Heater typically a few ohms up to about 15 Ω (check the spec); battery voltage on the power wire.', bad: 'Open heater: replace the sensor. No power: fuse (often shared by all O2 heaters).' },
      { title: 'Downstream sensor', how: 'Warm engine at 2,500 RPM: graph downstream next to upstream.', good: 'Steady, usually about 0.5–0.8 V, while upstream switches.', bad: 'Copies the upstream switching: converter not storing oxygen (P0420/P0430).' },
    ],
    scope: 'Upstream: a wave between about 0.1 and 0.9 V, crossing 0.45 V several times a second at 2,500 RPM. Downstream: nearly flat.',
    cautions: ['Exhaust leaks ahead of the sensor pull in air and make it read lean.'],
    articles: ['o2-sensor-testing', 'fuel-trim-diagnosis'],
  },
  {
    id: 'wideband-af',
    name: 'Air/fuel ratio sensor (wideband)',
    kind: 'sensor',
    components: ['o2-upstream'],
    operation:
      'A wideband sensor reports the actual air/fuel ratio, not just rich or lean. The module pumps a small current in or out of the sensor to keep it balanced; the size and direction of that current is the reading. Scan tools show it as lambda, equivalence ratio, current (mA) or a converted voltage.',
    pins: [
      { role: 'Heater power', typical: 'Battery voltage' },
      { role: 'Heater control', typical: 'Pulsed ground from the module' },
      { role: 'Sensing cell and pump cell wires (2–4)', typical: 'Module-biased: values vary by maker — read it on the scan tool' },
    ],
    tools: [SCAN, 'Propane enrichment tool', DMM],
    steps: [
      { title: 'Read it on the scan tool', how: 'Warm engine at idle and 2,500 RPM.', good: 'Lambda close to 1.00 (or current near 0 mA) with small movement as fuel control trims.', bad: 'Fixed value, or always rich or lean while fuel trims are near zero: suspect the sensor.' },
      { title: 'Snap and fuel-cut test', how: 'Snap the throttle, then let it decelerate with the throttle closed (fuel cut).', good: 'Goes rich on the snap, then very lean (lambda well above 1.5, or maximum) on fuel cut within a second or two.', bad: 'Slow or small response: sensor is contaminated or aging.' },
      { title: 'Check the heater', how: 'Unplug: measure heater resistance; key on, check heater power.', good: 'Heater usually a few ohms (often 2–4 Ω); battery voltage on the power wire.', bad: 'Open heater or no power.' },
    ],
    cautions: ['Do not judge a wideband by voltage at the connector the way you would a narrowband — the readings are not comparable.'],
    articles: ['o2-sensor-testing', 'fuel-trim-diagnosis'],
  },
  {
    id: 'maf-sensor',
    name: 'Mass airflow sensor (hot-wire / hot-film)',
    kind: 'sensor',
    components: ['maf'],
    operation:
      'A heated element in the intake air stream: the more air flows past, the more current it takes to keep it hot, and the sensor turns that into a voltage or frequency signal. Most also contain the intake air temperature sensor.',
    pins: [
      { role: 'Power (ignition feed)', typical: 'Battery voltage, key on' },
      { role: 'Ground', typical: 'Under 0.1 V' },
      { role: 'Signal (voltage or frequency)', typical: 'Rises with airflow' },
      { role: 'IAT signal and ground (if built in)', typical: 'See the temperature sensor test' },
    ],
    tools: [SCAN, DMM, BACKPROBE, SCOPE],
    steps: [
      { title: 'Check airflow at idle', how: 'Warm engine at idle, all loads off: read MAF in grams per second.', good: 'Rule of thumb: about 1 g/s per litre of engine size at a warm idle (a 2.0 L reads about 2–3 g/s).', bad: 'Well below with lean fuel trims: dirty or failing MAF, or unmetered air after it.' },
      { title: 'Check it rises smoothly', how: 'Graph MAF during a hard acceleration in 2nd gear (or a snap with a scope on the signal).', good: 'Smooth rise with RPM, no flat spots or dropouts.', bad: 'Flat or capped at high RPM: sensor or air filter restriction.' },
      { title: 'Check power and ground', how: 'Back-probe power and ground, engine running.', good: 'Battery voltage; ground under 0.1 V.', bad: 'Low power or high ground drop: fix the circuit before condemning the sensor.' },
      { title: 'Check for leaks after the sensor', how: 'Inspect the intake duct, PCV hoses and oil fill cap; smoke-test the intake.', good: 'No unmetered air.', bad: 'Split duct or loose clamp: fix it and recheck trims.' },
    ],
    cautions: ['Clean only with MAF cleaner, never touch the element. A dirty or oiled air filter contaminates it.'],
    articles: ['fuel-trim-diagnosis'],
  },
  {
    id: 'electronic-throttle',
    name: 'Electronic throttle body (motor and two position sensors)',
    kind: 'actuator',
    components: ['throttle-body'],
    operation:
      'The module drives a small DC motor in both directions to open and close the throttle, and watches two position sensors that must always agree. The pedal has two sensors of its own. If any pair disagrees, the module drops into reduced power.',
    pins: [
      { role: 'Motor + / motor − (H-bridge from the module)', typical: 'Pulsed voltage, polarity reverses to close' },
      { role: '5 V reference (shared by both sensors)', typical: '4.8–5.2 V' },
      { role: 'Sensor ground', typical: 'Under 0.1 V' },
      { role: 'Position signal 1 and signal 2', typical: 'Change in opposite or offset directions as the plate opens' },
    ],
    tools: [SCAN, DMM, BACKPROBE, SCOPE],
    steps: [
      { title: 'Compare the two sensors', how: 'Key on engine off: graph throttle position 1 and 2 (and pedal 1 and 2) while slowly pressing and releasing the pedal.', good: 'Both move smoothly together in their set relationship, no spikes.', bad: 'One jumps or drops out: that sensor track (replace the throttle body or pedal assembly).' },
      { title: 'Inspect the plate', how: 'Key off: look in the bore and open the plate gently by hand.', good: 'Clean bore, plate springs back freely.', bad: 'Carbon ring: clean it, then run the throttle relearn.' },
      { title: 'Check the sensor reference and ground', how: 'Back-probe 5 V reference and ground.', good: '4.8–5.2 V; ground under 0.1 V.', bad: 'Fix the circuit first.' },
      { title: 'Check the motor circuit', how: 'Scope or meter both motor wires while moving the pedal, key on.', good: 'Pulsed drive that changes with the pedal.', bad: 'No drive from the module with good sensors: wiring or module. Drive present but no movement: motor or gear.' },
    ],
    cautions: ['Keep fingers out of the bore with the key on — the plate can snap shut.', 'Many vehicles need a throttle relearn after cleaning or replacement.'],
    articles: ['throttle-body-service'],
  },
  {
    id: 'knock-sensor',
    name: 'Knock sensor (piezo)',
    kind: 'sensor',
    components: ['knock-sensor'],
    operation:
      'A piezo crystal bolted to the block: vibration squeezes it and it makes a small AC voltage. The module listens in a window after each firing for the frequency of knock and pulls timing when it hears it.',
    pins: [
      { role: 'Signal', typical: 'Small AC voltage when tapped or under load' },
      { role: 'Signal return (or the block, on 1-wire types)', typical: 'Some modules bias it about 2.5 V DC' },
    ],
    tools: [SCOPE, SCAN, DMM],
    steps: [
      { title: 'Check retard and noise', how: 'Graph knock retard (and knock count if shown) during a load test drive.', good: 'Little or no retard on the right fuel.', bad: 'Constant retard with no audible knock: suspect a sensor or loose mounting; audible knock: real knock (fuel, carbon, lean, overheat).' },
      { title: 'Tap test', how: 'Scope on the signal, engine idling or key on: tap the block near the sensor with a small wrench.', good: 'A clear AC spike with each tap.', bad: 'No response: sensor or wiring.' },
      { title: 'Check the wiring', how: 'Unplug and check continuity from the module to the sensor and for shorts to ground (many sit under the intake manifold where coolant rots the harness).', good: 'Continuity; no short to ground.', bad: 'Repair the harness — a pigtail kit is common.' },
      { title: 'Check the mounting', how: 'When replaced, clean the mounting face and torque to spec.', good: 'Sensor flat on the block at the specified torque.', bad: 'Over- or under-torqued sensors read wrong.' },
    ],
    cautions: ['Resistance checks are not reliable on knock sensors; some have an internal resistor and some read open.'],
  },
  {
    id: 'two-wire-switch',
    name: 'Pressure or position switch (2-wire)',
    kind: 'sensor',
    components: ['oil-pressure', 'fuel-cap', 'trans-range'],
    operation:
      'A simple switch that opens or closes at a set pressure or position. The module or gauge feeds one side with voltage and watches it go to ground (or the reverse).',
    pins: [
      { role: 'Feed / signal from the module or gauge', typical: 'About 5 V or 12 V when open' },
      { role: 'Ground or switched output', typical: 'Near 0 V when closed' },
    ],
    tools: [DMM, SCAN, 'Mechanical gauge (oil pressure)'],
    steps: [
      { title: 'Watch the state change', how: 'Watch the switch status on the scan tool (or the voltage on the signal wire) while changing the condition.', good: 'Changes state at the set point.', bad: 'Never changes: switch or circuit.' },
      { title: 'Bypass the switch', how: 'Unplug and jumper the harness side to ground (or open it).', good: 'Gauge, lamp or scan status changes.', bad: 'No change: the wire or the module, not the switch.' },
      { title: 'Verify the real condition', how: 'For oil pressure: fit a mechanical gauge in the switch port and compare to the spec.', good: 'Pressure in spec — then the switch is the problem.', bad: 'Low pressure: an engine problem, not the switch.' },
    ],
    articles: ['oil-pressure-test'],
  },

  // ---------------------------------------------------------------- actuators
  {
    id: 'pwm-solenoid',
    name: 'Solenoid with a module-switched ground (VVT, purge, EGR, shift)',
    kind: 'actuator',
    components: ['vvt-solenoid', 'evap-purge', 'egr', 'turbo'],
    operation:
      'Battery voltage feeds one side of the coil (often through a relay or a module), and the module switches the other side to ground — on/off, or pulsed (PWM) for proportional control. More on-time means more opening or more oil flow.',
    pins: [
      { role: 'Power feed', typical: 'Battery voltage, key on' },
      { role: 'Control (module-switched ground)', typical: 'About 12 V when off, near 0 V when on, pulsed when commanded' },
    ],
    tools: [SCAN, DMM, BACKPROBE, SCOPE, 'Low-amp current clamp'],
    steps: [
      { title: 'Command it', how: 'Use the scan tool’s output test to command the solenoid on and off (or change the duty cycle).', good: 'You hear or feel a click; the related data changes (cam angle moves, purge flow rises).', bad: 'Nothing: test the circuit below.' },
      { title: 'Check power', how: 'Back-probe the feed to battery negative, key on.', good: 'Within 0.5 V of battery voltage.', bad: 'Low or none: fuse, relay or feed wire.' },
      { title: 'Check the control', how: 'Scope or test-light from battery positive to the control wire while commanding it.', good: 'Pulls to ground when commanded (the light comes on or flickers with PWM).', bad: 'Never pulls down: open control wire or module driver.' },
      { title: 'Check the coil', how: 'Unplug and measure resistance across the solenoid.', good: 'Typical 6–15 Ω for VVT and purge solenoids (check the spec).', bad: 'Open or near 0 Ω: replace the solenoid — a shorted coil can damage the module driver.' },
      { title: 'Check current', how: 'Low-amp clamp on either wire while commanding it.', good: 'A clean current rise each time it switches on.', bad: 'No current or a sharp jump: open or shorted coil.' },
    ],
    scope: 'Control wire: 12 V while off, dropping near 0 V when on, with a short inductive spike when it turns off (missing spike = open coil on some drivers).',
    cautions: ['VVT codes are most often oil: level, condition, and the right viscosity come first. A plugged screen in the solenoid or the oil passage is common.'],
    articles: ['cam-crank-correlation'],
  },
  {
    id: 'fuel-injector',
    name: 'Fuel injector',
    kind: 'actuator',
    components: ['fuel-injectors'],
    operation:
      'An electric valve: battery voltage feeds one side and the module grounds the other for a few milliseconds per cycle. Pulse width sets how much fuel. Direct-injection injectors run on a much higher voltage from a booster in the module.',
    pins: [
      { role: 'Power (port injection)', typical: 'Battery voltage, key on or cranking' },
      { role: 'Control (module-switched ground)', typical: 'Pulses to ground; inductive spike about 30–80 V at turn-off' },
    ],
    tools: [SCAN, 'Noid light', DMM, SCOPE, 'Low-amp current clamp', 'Fuel pressure gauge'],
    steps: [
      { title: 'Check for a pulse', how: 'Unplug the injector, fit a noid light and crank.', good: 'The light flashes.', bad: 'No flash: power feed, control wire or no crank/cam signal to the module.' },
      { title: 'Check resistance', how: 'Unplug and measure across the injector; compare to the others on the engine.', good: 'Port injectors: high-impedance about 11–18 Ω, low-impedance about 2–5 Ω. All injectors within about 0.5 Ω of each other.', bad: 'Open, shorted, or different from the rest: replace that injector.' },
      { title: 'Current ramp', how: 'Low-amp clamp on the feed (all injectors on one wire) and run the engine.', good: 'Each injector’s ramp the same height and shape, with the pintle-open hump.', bad: 'One lower or missing the hump: weak or sticking injector.' },
      { title: 'Balance test', how: 'Fuel pressure gauge on the rail; with the scan tool, fire each injector for the same time and note the pressure drop.', good: 'Every injector drops pressure about the same amount.', bad: 'One drops much more (or less): leaking or clogged.' },
    ],
    scope: 'Control wire: battery voltage, a drop near 0 V for the pulse width, then an inductive spike at turn-off (usually 30–80 V clamped).',
    cautions: ['Direct-injection injectors are driven at 50 V or more: do not use a noid light or back-probe them with the engine running; use the scan tool and a current probe.'],
    articles: ['injector-circuit-testing', 'fuel-pressure-testing'],
  },
  {
    id: 'ignition-coil',
    name: 'Ignition coil (coil-on-plug with built-in driver)',
    kind: 'actuator',
    components: ['coils'],
    operation:
      'The module sends a low-current trigger pulse to the coil; a driver inside the coil switches the primary winding, building a magnetic field and collapsing it to make the high-voltage spark. Older coils without a driver are switched directly by the module.',
    pins: [
      { role: 'Power (ignition feed)', typical: 'Battery voltage' },
      { role: 'Power ground', typical: 'Under 0.1 V' },
      { role: 'Trigger from the module', typical: '0–5 V square pulse per firing' },
      { role: 'Reference / signal ground (4-wire types)', typical: 'Under 0.1 V' },
    ],
    tools: [SCAN, 'Spark tester (adjustable gap)', DMM, BACKPROBE, SCOPE],
    steps: [
      { title: 'Find the cylinder', how: 'Read misfire counts per cylinder at idle and under load.', good: 'No counts.', bad: 'One cylinder counting: go on.' },
      { title: 'Swap test', how: 'Swap the coil with a neighbour and clear counts.', good: 'Misfire moves with the coil: coil. Stays: plug, injector or mechanical.', bad: 'Also check the boot and plug for carbon tracking.' },
      { title: 'Check power and ground', how: 'Back-probe power and ground at the coil, engine cranking or running.', good: 'Battery voltage (above 9.6 V cranking); ground under 0.1 V.', bad: 'Fix the feed or ground.' },
      { title: 'Check the trigger', how: 'Scope or LED test light on the trigger while cranking.', good: 'A pulse for every firing.', bad: 'No trigger: wiring or module driver.' },
      { title: 'Check the spark', how: 'Spark tester set to the coil’s gap (often about 25 kV) and crank.', good: 'Strong blue spark every time.', bad: 'Weak or missing spark with a good trigger: coil.' },
    ],
    scope: 'Trigger: a clean square pulse whose width is the dwell. Secondary (with a COP probe): a firing line, a burn line about 1–2 ms long, then the coil oscillations.',
    cautions: ['Never pull a coil off a running engine with bare hands — and never run with an open secondary for long; it can damage the coil and module.'],
    articles: ['misfire-diagnosis', 'spark-plug-replacement'],
  },
  {
    id: 'fuel-pump',
    name: 'Electric fuel pump (relay or pump control module)',
    kind: 'actuator',
    components: ['fuel-pump'],
    operation:
      'A DC motor in the tank. A relay feeds it full voltage, or a fuel pump driver module pulses it to hold the pressure the engine asks for. Pressure, volume and current tell you more than voltage alone.',
    pins: [
      { role: 'Pump power (from relay or driver module)', typical: 'Battery voltage (or pulsed) while running' },
      { role: 'Pump ground', typical: 'Under 0.2 V drop while running' },
      { role: 'Fuel level sender (2 wires, same connector)', typical: 'Varies with level' },
    ],
    tools: ['Fuel pressure gauge', 'Low-amp current clamp', DMM, SCAN, TESTLIGHT],
    steps: [
      { title: 'Check pressure', how: 'Gauge on the rail (or scan fuel pressure on returnless systems): key on, then idle, then snap.', good: 'Pressure in spec and holds after key off for several minutes.', bad: 'Low: pump, filter, regulator or wiring. Bleeds down: leaking injector, check valve or regulator.' },
      { title: 'Check volume', how: 'Measure flow into a container for 15 seconds.', good: 'Typical about a pint or more in 15 seconds (check the spec).', bad: 'Good pressure but low volume: clogged filter or sock, or a weak pump.' },
      { title: 'Check voltage under load', how: 'With the pump running, back-probe power and ground at the pump connector.', good: 'Within about 0.5 V of battery voltage; ground drop under 0.2 V.', bad: 'Voltage lost in the relay, connector or ground: fix the circuit first.' },
      { title: 'Check current', how: 'Current clamp on the pump feed.', good: 'Typical 4–8 A, with a steady, even pattern on a scope.', bad: 'High current: tight or worn pump. Low: worn brushes or a voltage problem. Ragged pattern: worn commutator.' },
    ],
    cautions: ['Relieve fuel pressure before opening lines; keep a fire extinguisher close.'],
    articles: ['fuel-pressure-testing'],
  },
  {
    id: 'relay',
    name: 'Relay (4- or 5-pin ISO)',
    kind: 'power',
    components: ['underhood-fuse-box', 'interior-fuse-panel', 'fuel-pump', 'ac-compressor', 'horn', 'starter'],
    operation:
      'A small coil (pins 85 and 86) pulls a set of heavy contacts closed so a low-current signal can switch a high-current load (pin 30 in, pin 87 out; 87a is the normally-closed contact on 5-pin relays). The module usually switches the coil’s ground.',
    pins: [
      { role: '30 — battery feed to the contacts', typical: 'Battery voltage at all times (or with the key)' },
      { role: '87 — output to the load', typical: 'Battery voltage when energized' },
      { role: '85 / 86 — coil', typical: 'One side fed, the other switched to ground by the module' },
    ],
    tools: [TESTLIGHT, FUSED, DMM],
    steps: [
      { title: 'Swap test', how: 'Swap with an identical relay from a known-good circuit.', good: 'Fault follows the relay: replace it.', bad: 'Fault stays: test the socket below.' },
      { title: 'Check the socket', how: 'Relay out: test-light pin 30 (power), and check the coil feed pin for voltage when the module commands it.', good: 'Power on 30; coil feed and ground present when commanded.', bad: 'No power on 30: fuse or feed wire. No coil command: switch or module.' },
      { title: 'Bypass the relay', how: 'With a fused jumper, connect socket pin 30 to pin 87.', good: 'The load runs — the circuit to the load is good.', bad: 'Load does not run: the wiring or the load itself.' },
      { title: 'Bench test', how: 'Measure coil resistance (85–86), then power the coil and measure voltage drop across 30–87 under load.', good: 'Coil typically 50–120 Ω; contact drop under about 0.2 V.', bad: 'Open coil or high contact drop: replace.' },
    ],
    cautions: ['Use a fused jumper of the circuit’s rating — never bypass a starter or blower relay with a bare wire.'],
  },
  {
    id: 'motor-actuator',
    name: 'Electric motor or actuator (blower, blend door, cooling fan)',
    kind: 'actuator',
    components: ['blower-motor', 'blend-door', 'radiator'],
    operation:
      'A DC motor fed through a resistor, a speed-control module, a relay or a module’s H-bridge. Smart actuators (blend doors) also report their position on a feedback or LIN wire and must be calibrated after replacement.',
    pins: [
      { role: 'Motor power / motor control', typical: 'Battery voltage or a commanded (pulsed) voltage' },
      { role: 'Ground (or the other side of an H-bridge)', typical: 'Under 0.2 V drop under load' },
      { role: 'Position feedback or LIN (smart actuators)', typical: '5 V reference and a signal, or a LIN data line' },
    ],
    tools: [SCAN, DMM, 'High-amp current clamp', TESTLIGHT],
    steps: [
      { title: 'Command it', how: 'Use the scan tool or the control head to run it through each speed or position.', good: 'Runs at every speed or reaches both ends of travel; data shows the commanded position reached.', bad: 'Some speeds only: resistor or speed-control module. Clicking from a blend door: stripped gear.' },
      { title: 'Voltage at the motor', how: 'Back-probe power and ground at the motor while it is commanded.', good: 'Commanded voltage at the motor, ground drop under 0.2 V.', bad: 'Voltage present but no movement: the motor. No voltage: the circuit or control.' },
      { title: 'Current draw', how: 'Clamp the feed while it runs.', good: 'Steady current in the normal range for that motor (blowers often 10–20 A on high).', bad: 'High current: binding motor that will keep blowing fuses or burning resistors.' },
      { title: 'Calibrate', how: 'After replacing a smart actuator or the HVAC module, run the calibration from the scan tool or by the key-cycle procedure.', good: 'Doors find their end stops; no codes.', bad: 'Calibration fails: binding door or the wrong part.' },
    ],
  },
  {
    id: 'ac-clutch',
    name: 'A/C compressor clutch and control',
    kind: 'actuator',
    components: ['ac-compressor'],
    operation:
      'An electromagnet in the front of the compressor pulls the clutch plate against the pulley when the A/C relay feeds it. The module only engages it when refrigerant pressure, evaporator temperature and engine conditions allow. Many newer compressors have no clutch and use a variable-displacement control valve instead.',
    pins: [
      { role: 'Clutch feed (from the A/C relay)', typical: 'Battery voltage when engaged' },
      { role: 'Clutch ground', typical: 'Under 0.2 V' },
    ],
    tools: ['A/C gauge set', DMM, SCAN, FUSED, 'Feeler gauge'],
    steps: [
      { title: 'Check pressures first', how: 'Engine off: static pressure on the gauges and on the scan tool’s A/C pressure sensor.', good: 'Static pressure roughly matches the temperature chart for the refrigerant.', bad: 'Low: the system is low or empty — the module will not engage the clutch.' },
      { title: 'Check the request', how: 'A/C on: watch A/C request and relay command on the scan tool.', good: 'Request seen and relay commanded.', bad: 'No request: HVAC control or network. Requested but not commanded: the module is refusing — check pressure and evaporator temperature data.' },
      { title: 'Check the clutch circuit', how: 'Measure voltage at the clutch connector when commanded; measure coil resistance.', good: 'Battery voltage; coil typically about 2–5 Ω.', bad: 'Voltage but no engagement: open coil or excess air gap.' },
      { title: 'Check the air gap', how: 'Feeler gauge between the plate and pulley.', good: 'Within the spec (often about 0.015–0.030 in).', bad: 'Too wide: shim it or replace the clutch.' },
    ],
    cautions: ['Never jumper refrigerant pressure switches to run a low system — it can destroy the compressor.'],
    articles: ['ac-performance-test'],
  },
  {
    id: 'evap-system',
    name: 'EVAP purge and vent system',
    kind: 'actuator',
    components: ['evap-purge', 'evap-canister', 'fuel-cap'],
    operation:
      'The charcoal canister stores fuel vapour. The purge valve opens (under engine vacuum) to burn the vapour; the vent valve closes to seal the system for leak tests. The module watches tank pressure while it seals and pulls a vacuum to find leaks.',
    pins: [
      { role: 'Purge and vent valves: power feed', typical: 'Battery voltage, key on' },
      { role: 'Purge and vent valves: control (module ground)', typical: 'Pulsed or switched ground' },
      { role: 'Tank pressure sensor', typical: 'A 3-wire 5 V sensor' },
    ],
    tools: [SCAN, 'Smoke machine', 'Hand vacuum pump', DMM],
    steps: [
      { title: 'Check the cap and filler neck', how: 'Inspect the cap seal and the filler neck for rust; test the cap on a cap tester.', good: 'Seal intact, holds pressure.', bad: 'Replace the cap — the cheapest fix for large-leak codes.' },
      { title: 'Purge valve holds vacuum', how: 'Engine off: hand-pump vacuum on the purge valve’s engine side.', good: 'Holds vacuum when not powered.', bad: 'Leaks: stuck-open purge valve (hard starting after refuel, rough idle).' },
      { title: 'Command the valves', how: 'Scan tool: close the vent and open the purge with the engine idling; watch tank pressure.', good: 'Tank pressure goes into vacuum, then holds when purge closes.', bad: 'No vacuum: purge valve, lines or a leak. Vacuum that will not release: blocked vent.' },
      { title: 'Smoke test', how: 'Seal the system (vent closed) and introduce smoke at the service port or purge line.', good: 'No smoke escapes.', bad: 'Smoke shows the leak: hoses, canister, filler neck, tank seams.' },
    ],
    articles: ['smoke-test-vacuum-evap'],
  },
  {
    id: 'thermostat-cooling',
    name: 'Thermostat and cooling system',
    kind: 'mechanical',
    components: ['thermostat', 'radiator', 'water-pump', 'heater-core'],
    operation:
      'The thermostat stays closed until the engine reaches operating temperature, then opens to send coolant through the radiator. Some engines use an electrically heated thermostat the module controls, or an electric water pump.',
    pins: [
      { role: 'Heated thermostat (where fitted): power', typical: 'Battery voltage' },
      { role: 'Heated thermostat: control', typical: 'Module-switched ground' },
    ],
    tools: [SCAN, 'Infrared thermometer', 'Cooling system pressure tester', 'Combustion leak (block) tester'],
    steps: [
      { title: 'Graph the warm-up', how: 'Cold engine: graph ECT from start to operating temperature.', good: 'Steady rise to the opening temperature (often about 195–215 °F), then holds.', bad: 'Slow rise or never reaches it: stuck-open thermostat (P0128). Climbs past it: stuck closed, airlock, fan or pump.' },
      { title: 'Check the hoses', how: 'Feel or read the upper radiator hose during warm-up.', good: 'Cool until the thermostat opens, then warms quickly.', bad: 'Warm early: stuck open.' },
      { title: 'Pressure test', how: 'Pressure the cold system to the cap rating and leave it 15 minutes; test the cap.', good: 'Holds pressure.', bad: 'Drops: find the external leak (or internal — run a block test).' },
      { title: 'Check for combustion gas', how: 'Block tester on the radiator neck, engine warm.', good: 'Fluid stays blue.', bad: 'Turns yellow: head gasket or cracked head.' },
    ],
    cautions: ['Never open a hot cooling system.'],
    articles: ['cooling-system-pressure-test', 'coolant-drain-fill-bleed'],
  },

  // ---------------------------------------------------------------- power and ground
  {
    id: 'battery-test',
    name: 'Battery and parasitic draw',
    kind: 'power',
    components: ['battery'],
    operation:
      'A 12 V lead-acid (flooded, AGM or EFB) battery. Its resting voltage shows its state of charge; a load or conductance test shows whether it can still deliver current. Modules draw a little current with the key off — too much drains it overnight.',
    pins: [
      { role: 'Positive terminal', typical: '12.6 V or more fully charged, at rest' },
      { role: 'Negative terminal', typical: 'Battery ground' },
    ],
    tools: [DMM, 'Battery tester (conductance or load)', 'Low-amp current clamp or meter amps fuse'],
    steps: [
      { title: 'Resting voltage', how: 'Engine off at least an hour (or remove surface charge by turning headlights on for a minute).', good: 'About 12.6 V is full; 12.4 V is about 75%; 12.2 V about 50%.', bad: 'Below about 12.4 V: charge it before testing anything else.' },
      { title: 'Test the battery', how: 'Conductance or load test at its rated CCA.', good: 'Passes at its rating.', bad: 'Fails after a full charge: replace it — and register it on vehicles that need battery registration.' },
      { title: 'Parasitic draw', how: 'Everything off and doors latched; meter or clamp on the negative cable; wait for modules to sleep (can take 20–60 minutes).', good: 'Usually under about 50 mA once asleep (check the spec; some newer vehicles allow more).', bad: 'High draw: pull fuses one at a time, or measure the tiny voltage drop across each fuse to find the circuit without waking the vehicle.' },
    ],
    cautions: ['Wear eye protection; charge AGM batteries on the AGM setting.'],
    articles: ['battery-charging-test', 'parasitic-draw-test'],
  },
  {
    id: 'charging-system',
    name: 'Charging system (alternator)',
    kind: 'power',
    components: ['alternator', 'battery'],
    operation:
      'The alternator makes AC current and rectifies it to DC. A regulator (inside it, or in the engine module on smart-charging systems) controls the field to hold the target voltage. Smart systems vary the voltage on purpose to save fuel.',
    pins: [
      { role: 'B+ output stud', typical: 'Charging voltage while running' },
      { role: 'Control / field (L, S, COM or LIN, by maker)', typical: 'Commanded by the module on smart systems' },
      { role: 'Case ground', typical: 'Under 0.2 V drop to battery negative under load' },
    ],
    tools: [DMM, 'High-amp current clamp or carbon-pile tester', SCAN, SCOPE],
    steps: [
      { title: 'Charging voltage', how: 'Engine at 2,000 RPM, loads off, then headlights, blower and defroster on.', good: 'About 13.5–14.8 V (smart systems may run 12.8–15 V and change it as they go).', bad: 'Below battery voltage: not charging — check fuse, field command and output.' },
      { title: 'Output under load', how: 'Load the system and clamp the output cable.', good: 'Close to the rated output (within about 10%).', bad: 'Low output: alternator — after the belt and wiring check good.' },
      { title: 'Ripple', how: 'Meter on AC volts (or scope) at the alternator output, engine running with loads on.', good: 'Under about 0.1–0.5 V AC.', bad: 'Higher: a failed diode or stator — causes flickering lights and odd module codes.' },
      { title: 'Voltage drop', how: 'Under load: measure from the alternator B+ stud to battery positive, and alternator case to battery negative.', good: 'Under about 0.5 V on the positive side, under 0.2 V on the ground side.', bad: 'Clean or replace the cable, fusible link or ground.' },
    ],
    articles: ['battery-charging-test', 'voltage-drop-testing'],
  },
  {
    id: 'starting-system',
    name: 'Starting system',
    kind: 'power',
    components: ['starter', 'battery'],
    operation:
      'The ignition switch or the module energizes the starter relay, which feeds the starter solenoid. The solenoid pushes the drive gear into the flywheel and closes the heavy contacts that feed the motor.',
    pins: [
      { role: 'Battery cable (B+) on the solenoid', typical: 'Battery voltage at all times' },
      { role: 'Solenoid trigger (S terminal)', typical: 'Battery voltage while cranking' },
      { role: 'Starter case ground (through the engine block)', typical: 'Under 0.3 V drop while cranking' },
    ],
    tools: [DMM, 'Battery tester', 'High-amp current clamp', SCAN],
    steps: [
      { title: 'Battery first', how: 'Charge and test the battery.', good: 'Passes.', bad: 'A weak battery causes most slow cranks.' },
      { title: 'Cranking voltage', how: 'Disable fuel or ignition and crank for a few seconds while reading battery voltage.', good: 'Stays above about 9.6 V.', bad: 'Drops low with a good battery: high starter draw or a mechanical drag on the engine.' },
      { title: 'Voltage drop', how: 'While cranking: battery positive post to starter B+ terminal, and battery negative post to the engine block.', good: 'Under about 0.5 V positive side; under about 0.3 V ground side.', bad: 'Clean the terminals or replace the cable or ground strap.' },
      { title: 'Trigger', how: 'Measure the S terminal while cranking.', good: 'Within about 1 V of battery voltage.', bad: 'Low or none: relay, neutral safety / range switch, clutch switch, or the security system.' },
    ],
    articles: ['no-start-diagnosis', 'voltage-drop-testing'],
  },
  {
    id: 'ground-circuit',
    name: 'Ground and power circuit voltage drop',
    kind: 'power',
    components: ['grounds', 'battery', 'pcm', 'bcm', 'underhood-fuse-box'],
    operation:
      'Every circuit needs a clean path back to the battery. Corroded grounds and connectors only show up with current flowing, so measure the voltage lost along the wire while the circuit is working, not resistance with it off.',
    pins: [
      { role: 'Any power feed', typical: 'Within 0.5 V of battery voltage under load' },
      { role: 'Any ground', typical: 'Under 0.1 V (electronics) or 0.3 V (heavy loads) under load' },
    ],
    tools: [DMM, TESTLIGHT, BACKPROBE],
    steps: [
      { title: 'Load the circuit', how: 'Turn the circuit on (or use a test light as a load on module power and ground pins).', good: 'Current is flowing — readings now mean something.', bad: 'A meter alone (no load) can show 12 V on a wire that will not carry current.' },
      { title: 'Ground side drop', how: 'Meter from the component’s ground pin to battery negative while working.', good: 'Under 0.1 V for sensors and modules, under 0.3 V for motors.', bad: 'Higher: move the lead toward the battery one connection at a time until the drop disappears — the bad joint is just before that.' },
      { title: 'Power side drop', how: 'Meter from battery positive to the component’s power pin while working.', good: 'Under 0.5 V.', bad: 'Higher: fuse, relay contacts, connector or wire.' },
    ],
    articles: ['voltage-drop-testing'],
  },

  // ---------------------------------------------------------------- modules and networks
  {
    id: 'module-power',
    name: 'Module power, ground and wake-up',
    kind: 'module',
    components: ['pcm', 'tcm', 'bcm', 'abs-module', 'srs-module', 'adas-camera', 'steering-angle', 'tpms'],
    operation:
      'Every module needs constant battery power (for memory), an ignition or wake-up feed, and good grounds — then it talks on the network. A module that will not communicate is usually missing one of these, not failed.',
    pins: [
      { role: 'Battery (constant) feed', typical: 'Battery voltage at all times' },
      { role: 'Ignition / wake-up feed', typical: 'Battery voltage key on' },
      { role: 'Grounds (often several)', typical: 'Under 0.1 V with a load' },
      { role: 'Network (CAN high / CAN low, or LIN)', typical: 'See the network test' },
    ],
    tools: [SCAN, DMM, TESTLIGHT, BACKPROBE],
    steps: [
      { title: 'Network scan', how: 'Run a full module scan and note which modules do not answer.', good: 'Every module answers.', bad: 'One missing: test its power, ground and network pins. Several missing on one bus: test the bus.' },
      { title: 'Load-test power pins', how: 'Back-probe each power pin with a test light to ground (key on for ignition feeds).', good: 'Light is bright on each.', bad: 'Dim or out: fuse, relay or wire.' },
      { title: 'Load-test grounds', how: 'Test light from battery positive to each ground pin.', good: 'Light is bright on each.', bad: 'Dim: clean the ground point.' },
      { title: 'Check the network pins', how: 'At the module connector, check CAN high and CAN low voltages and resistance to the rest of the bus.', good: 'Same as at the DLC.', bad: 'Open between the module and the bus: repair the wiring.' },
    ],
    cautions: ['SRS: disconnect the battery and wait the specified time before unplugging the SRS module or any airbag connector. Never back-probe airbag squib circuits.', 'Replacing or reprogramming a module may need setup, coding or a security relearn.'],
    articles: ['can-bus-diagnosis', 'voltage-drop-testing'],
  },
  {
    id: 'can-bus',
    name: 'CAN bus (resistance and voltage)',
    kind: 'network',
    components: ['dlc', 'pcm', 'bcm', 'abs-module'],
    operation:
      'High-speed CAN is a twisted pair (CAN high and CAN low) with a 120 Ω resistor at each end. At rest both wires sit about 2.5 V; when a module talks, CAN high rises and CAN low falls by about 1 V. At the DLC, CAN high is usually pin 6 and CAN low pin 14; pins 4 and 5 are grounds and pin 16 is battery power.',
    pins: [
      { role: 'DLC pin 6 — CAN high', typical: 'About 2.5–3.5 V while active' },
      { role: 'DLC pin 14 — CAN low', typical: 'About 1.5–2.5 V while active' },
      { role: 'DLC pins 4 and 5 — chassis and signal ground', typical: 'Under 0.1 V' },
      { role: 'DLC pin 16 — battery power', typical: 'Battery voltage at all times' },
    ],
    tools: [DMM, SCOPE, SCAN],
    steps: [
      { title: 'Check the DLC', how: 'Meter pin 16 to pins 4 and 5.', good: 'Battery voltage.', bad: 'None: the scan tool cannot power up — fix the DLC feed (often a shared fuse with the lighter) first.' },
      { title: 'Bus resistance', how: 'Key off and the bus asleep (or battery disconnected): measure pin 6 to pin 14.', good: 'About 60 Ω (two 120 Ω terminators in parallel).', bad: 'About 120 Ω: one terminator or a branch to it is open. Near 0 Ω: CAN high shorted to CAN low.' },
      { title: 'Shorts to power or ground', how: 'Bus asleep: each CAN wire to ground and to battery positive.', good: 'No continuity to either.', bad: 'A short: unplug modules one at a time until the bus recovers.' },
      { title: 'Scope the bus', how: 'Two channels: CAN high and CAN low to ground, key on.', good: 'Mirror-image square waves around 2.5 V.', bad: 'One line flat, noisy, or stuck: find which module or wire drags it.' },
    ],
    scope: 'CAN high switches up from about 2.5 V to 3.5 V, and CAN low down from 2.5 V to 1.5 V, at the same moments — a mirror image.',
    cautions: ['Some makers use other pins or several buses (body CAN, chassis CAN): check where they land before testing.'],
    articles: ['can-bus-diagnosis'],
  },

  // ---------------------------------------------------------------- body and chassis
  {
    id: 'brake-switch',
    name: 'Brake pedal switch',
    kind: 'sensor',
    components: ['brake-switch'],
    operation:
      'A switch (or a pair of switches, one normally open and one normally closed, or a Hall-type position sensor) at the brake pedal. It lights the brake lights and tells the engine, transmission, ABS and cruise modules the brake is pressed.',
    pins: [
      { role: 'Feed', typical: 'Battery voltage (often all the time)' },
      { role: 'Output to the brake lights / modules', typical: 'Battery voltage when pressed' },
      { role: 'Second circuit (dual switches)', typical: 'Opposite state of the first' },
    ],
    tools: [SCAN, DMM, TESTLIGHT],
    steps: [
      { title: 'Check the status', how: 'Watch brake switch status on the scan tool (engine and ABS) while pressing and releasing the pedal.', good: 'Changes state as the pedal is pressed, in every module.', bad: 'Stuck or late: adjust or replace the switch.' },
      { title: 'Check both circuits', how: 'On dual switches, back-probe both outputs while pressing the pedal.', good: 'They swap states together.', bad: 'Disagree: a code for brake switch correlation sets and cruise will not work.' },
      { title: 'Check the lamps', how: 'Check the brake lamps and the third light.', good: 'All on when pressed.', bad: 'Some off: bulbs, sockets or the trailer wiring.' },
    ],
  },
  {
    id: 'tpms-sensor',
    name: 'TPMS sensor',
    kind: 'sensor',
    components: ['tpms'],
    operation:
      'A battery-powered sensor in each wheel sends pressure (and temperature) by radio to the receiver. The vehicle has to learn each sensor’s ID and, on some, its wheel position.',
    pins: [{ role: 'No wiring — radio signal', typical: 'Read with a TPMS tool' }],
    tools: ['TPMS tool', SCAN, 'Tire pressure gauge'],
    steps: [
      { title: 'Read each sensor', how: 'Trigger each sensor with the TPMS tool.', good: 'Each answers with ID, pressure and battery status.', bad: 'No answer or low battery: replace the sensor.' },
      { title: 'Compare to the vehicle', how: 'Compare IDs and pressures the TPMS tool reads to what the vehicle has stored.', good: 'IDs match the wheels fitted.', bad: 'Different: run the relearn for the vehicle (stationary, OBD or drive cycle).' },
    ],
  },
  {
    id: 'steering-angle-cal',
    name: 'Steering angle sensor',
    kind: 'sensor',
    components: ['steering-angle'],
    operation:
      'Reports how far and how fast the steering wheel is turned, usually on the CAN bus. Stability control compares it to yaw rate and wheel speeds; it must read zero with the wheels straight.',
    pins: [
      { role: 'Power and ground', typical: 'Battery voltage and under 0.1 V' },
      { role: 'Network (CAN or a dedicated line)', typical: 'See the network test' },
    ],
    tools: [SCAN, 'Alignment rack'],
    steps: [
      { title: 'Check the zero', how: 'Wheels straight ahead, on the scan tool read the steering angle.', good: 'Within a few degrees of zero; changes smoothly lock to lock.', bad: 'Off: calibrate it (after an alignment, column work or battery disconnect on some).' },
      { title: 'Calibrate', how: 'Run the steering angle reset or calibration from the scan tool after the alignment is right.', good: 'Calibration completes and the stability light goes out.', bad: 'Will not calibrate: check the alignment and the clock spring.' },
    ],
  },
  {
    id: 'horn-circuit',
    name: 'Horn circuit',
    kind: 'actuator',
    components: ['horn'],
    operation:
      'The horn button (through the clock spring) tells the body module, or grounds a relay coil directly; the relay then feeds the horns.',
    pins: [
      { role: 'Horn feed (from the relay)', typical: 'Battery voltage when the button is pressed' },
      { role: 'Horn ground (case or wire)', typical: 'Under 0.2 V' },
    ],
    tools: [DMM, TESTLIGHT, FUSED, SCAN],
    steps: [
      { title: 'Command it', how: 'Use the scan tool to command the horn, or press the button.', good: 'Horn sounds.', bad: 'Go on.' },
      { title: 'Check at the horn', how: 'Test light across the horn connector while pressing the button.', good: 'Light on: the circuit works — the horn is bad.', bad: 'No light: relay, fuse, clock spring or button.' },
    ],
  },
];

/**
 * How each component works, in plain words — ProDemand’s "Component
 * Operation". Keyed by component location id. Written for AP Data.
 */
export const COMPONENT_OPERATION: Record<string, string> = {
  battery: 'Stores energy to crank the engine and run electronics with the engine off. The alternator recharges it while running; many newer vehicles monitor it with a sensor on the negative cable.',
  'underhood-fuse-box': 'Holds the high-current fuses and relays (fans, fuel pump, starter, A/C clutch, ABS). On many vehicles it is a smart power module that switches circuits itself.',
  'interior-fuse-panel': 'Holds the fuses for cabin circuits — lighting, accessories, modules — and is often built into the body control module.',
  dlc: 'The 16-pin OBD-II diagnostic connector. Pin 16 is battery power, 4 and 5 are grounds, and 6 and 14 are usually the high-speed CAN bus the scan tool talks on.',
  pcm: 'The engine (and often transmission) computer: reads sensors, controls fuel, spark, throttle, cam timing and emissions devices, and stores powertrain codes.',
  tcm: 'Controls shifting: reads speed, range, pressure and temperature, and drives the shift and pressure-control solenoids. Some are inside the transmission.',
  bcm: 'The body computer: lighting, locks, windows, wipers, security and often the gateway between networks. Many body and network faults start here.',
  alternator: 'Driven by the belt, it charges the battery and powers the vehicle while running. The regulator — inside it or in the engine module — sets the charging voltage.',
  starter: 'A high-torque motor with a solenoid that pushes its gear into the flywheel ring gear to crank the engine.',
  grounds: 'Straps and cables that return current to the battery from the engine, body and modules. A corroded ground causes odd electrical faults and codes in several modules at once.',
  'air-filter': 'Filters the air entering the engine. A clogged filter restricts airflow at high load; an oiled or dirty one contaminates the MAF sensor.',
  maf: 'Measures the mass of air entering the engine with a heated element, so the module can meter fuel to match.',
  iat: 'A thermistor that measures intake air temperature, used to correct fuel and spark for air density. Often built into the MAF sensor.',
  'throttle-body': 'An electronically controlled throttle plate the module opens with a motor, watching two position sensors that must agree. Pedal position is read by two more sensors.',
  map: 'Measures manifold pressure (engine load). On speed-density engines it replaces the MAF; on boosted engines it reads boost.',
  'intake-manifold': 'Delivers air to each cylinder. Gaskets and runner-control valves can leak or stick, causing lean codes and rough idle.',
  'fuel-injectors': 'Electric valves the module pulses open to spray fuel into the port or straight into the cylinder (direct injection). Pulse width sets how much.',
  'high-pressure-pump': 'On direct-injection engines, a cam-driven pump raises fuel pressure to several thousand psi. The module controls it with a solenoid and watches a rail pressure sensor.',
  'fuel-pump': 'An electric pump in the tank that supplies fuel to the engine, switched by a relay or speed-controlled by a pump driver module.',
  'crank-sensor': 'Reads a toothed wheel on the crankshaft so the module knows engine speed and position. Without it most engines will not start.',
  'cam-sensor': 'Reads the camshaft position so the module knows which stroke each cylinder is on, and checks cam timing on engines with variable valve timing.',
  'vvt-solenoid': 'An oil control valve the module pulses to send engine oil to the cam phaser, advancing or retarding cam timing. Oil level and condition matter most.',
  'knock-sensor': 'A piezo sensor on the block that hears detonation, so the module can retard spark timing to protect the engine.',
  ect: 'A thermistor in the coolant that tells the module engine temperature — used for fuel, idle, fan control and the gauge.',
  'oil-pressure': 'A switch or a 3-wire sensor that reports engine oil pressure for the warning lamp, gauge and, on some engines, oil pump control.',
  'oil-filter': 'Removes particles from the engine oil. A wrong or clogged filter can starve the engine of oil pressure.',
  coils: 'Turn the module’s trigger signal into the high voltage that fires each spark plug. Most engines have one coil per cylinder sitting on the plug.',
  pcv: 'The PCV valve and hoses pull crankcase gases back into the intake to be burned. A stuck or split PCV causes vacuum leaks, oil use and lean codes.',
  egr: 'Recirculates a little exhaust into the intake to cool combustion and cut NOx. A stuck-open valve causes rough idle; carbon-blocked passages cause low-flow codes.',
  turbo: 'An exhaust-driven compressor that pushes more air into the engine. A wastegate (vacuum or electric) and bypass valve control boost.',
  thermostat: 'A valve that stays closed until the engine is warm, then opens to send coolant to the radiator, holding a steady temperature.',
  radiator: 'Sheds engine heat to the air; electric fans pull air through it when the vehicle is slow or stopped.',
  'water-pump': 'Circulates coolant through the engine, radiator and heater core — belt, chain or electric driven.',
  'heater-core': 'A small radiator behind the dash that heats the cabin air with engine coolant.',
  'o2-upstream': 'Before the converter: measures oxygen in the exhaust so the module can keep the air/fuel ratio correct (fuel trims). May be a narrowband or wideband sensor.',
  'o2-downstream': 'After the converter: watches how well the converter stores oxygen, for the catalyst efficiency monitor.',
  'catalytic-converter': 'Burns off hydrocarbons and carbon monoxide and reduces NOx in the exhaust. Misfires and oil burning damage it.',
  'evap-purge': 'A valve the module opens to draw fuel vapour from the charcoal canister into the engine to be burned.',
  'evap-canister': 'Stores fuel vapour from the tank; the vent valve on or near it closes so the module can leak-test the system.',
  'fuel-cap': 'Seals the fuel tank. A loose or worn cap is the most common cause of EVAP leak codes.',
  'trans-range': 'Tells the modules which gear the selector is in (P, R, N, D…), for starting, reverse lights and shifting.',
  'trans-speed': 'Input and output speed sensors let the transmission computer calculate gear ratio and slip, and often supply vehicle speed.',
  'trans-fluid': 'Fluid cools, lubricates and applies the clutches. The wrong type or a low level causes harsh or slipping shifts.',
  'transfer-case': 'Splits power between front and rear axles on 4WD and AWD vehicles, often with an electric shift motor and an encoder.',
  differential: 'Lets the wheels on an axle turn at different speeds through corners; needs the right gear oil (and friction modifier on limited-slip units).',
  'brake-master': 'Converts pedal force into hydraulic pressure for the brakes. Its reservoir level sensor lights the brake warning lamp.',
  'abs-module': 'The ABS pump, valves and computer: pulses brake pressure to stop wheel lock-up and runs traction and stability control.',
  'wheel-speed': 'Reports each wheel’s speed to the ABS module, which also shares vehicle speed with other modules.',
  'steering-angle': 'Reports how far and how fast the steering wheel is turned, for stability control and driver assists.',
  tpms: 'A sensor in each wheel radios tire pressure to the receiver; the vehicle warns when one is low.',
  'cabin-filter': 'Filters air coming into the cabin through the HVAC system. A clogged one cuts airflow and causes smells.',
  'blower-motor': 'Moves air through the HVAC box; speed set by a resistor block or an electronic speed-control module.',
  'blend-door': 'Small motors that move doors in the HVAC box to mix hot and cold air and direct it to vents. They report position and need calibration after replacement.',
  'ac-compressor': 'Pumps refrigerant through the A/C system — engaged by an electric clutch, or a clutchless variable-displacement design controlled by the module.',
  'brake-switch': 'Tells the brake lights and modules (engine, transmission, ABS, cruise) the brake pedal is pressed.',
  'srs-module': 'The airbag computer: reads crash sensors and seat sensors, and fires airbags and pretensioners in a crash. Handle with care.',
  'adas-camera': 'The forward camera (and radar) behind driver assists like lane keeping and automatic braking. Needs calibration after windshield or mounting work.',
  'ambient-temp': 'Measures outside air temperature for the display and automatic climate control. Usually behind the grille, so engine heat affects it at a stop.',
  'washer-reservoir': 'Holds washer fluid; the pump in the reservoir sprays the windshield (and rear window on some).',
  horn: 'Sounds when the horn button, through the clock spring, triggers the horn relay or body module.',
};

/** Labor guide jobs (src/data/laborJobs.ts) for replacing each component. */
export const COMPONENT_LABOR: Record<string, string[]> = {
  battery: ['battery'],
  alternator: ['alternator'],
  starter: ['starter'],
  'air-filter': ['engine_air_filter'],
  maf: ['maf_sensor'],
  'throttle-body': ['throttle_body_clean', 'throttle_body'],
  'intake-manifold': ['intake_manifold_gasket'],
  'fuel-injectors': ['fuel_injector'],
  'fuel-pump': ['fuel_pump', 'fuel_filter'],
  'crank-sensor': ['crank_sensor'],
  'cam-sensor': ['cam_sensor'],
  'vvt-solenoid': ['vvt_solenoid'],
  'oil-filter': ['oil_change'],
  coils: ['ignition_coil', 'ignition_coils_all', 'spark_plugs'],
  pcv: ['pcv_valve'],
  egr: ['egr_valve'],
  thermostat: ['thermostat'],
  radiator: ['radiator', 'radiator_hose', 'cooling_fan'],
  'water-pump': ['water_pump'],
  'heater-core': ['heater_core'],
  'o2-upstream': ['o2_upstream'],
  'o2-downstream': ['o2_downstream'],
  'catalytic-converter': ['catalytic_converter'],
  'evap-purge': ['evap_purge_valve'],
  'evap-canister': ['evap_vent_valve'],
  'trans-fluid': ['trans_fluid_service'],
  'transfer-case': ['transfer_case_fluid'],
  differential: ['diff_fluid'],
  'brake-master': ['master_cylinder', 'brake_fluid_flush'],
  'wheel-speed': ['abs_wheel_sensor'],
  'steering-angle': ['alignment'],
  'cabin-filter': ['cabin_air_filter'],
  'blower-motor': ['blower_motor', 'blower_resistor'],
  'ac-compressor': ['ac_compressor', 'ac_recharge'],
  pcm: ['module_programming'],
  tcm: ['module_programming'],
  bcm: ['module_programming'],
};

export function laborFor(componentId: string): string[] {
  return COMPONENT_LABOR[componentId] ?? [];
}

export const TEST_BY_ID: ReadonlyMap<string, ComponentTest> = new Map(COMPONENT_TESTS.map((t) => [t.id, t]));

export function testById(id: string): ComponentTest | null {
  return TEST_BY_ID.get(id) ?? null;
}

/** Guided tests that apply to a component, sensor-type tests first. */
export function testsForComponent(componentId: string): ComponentTest[] {
  const order: TestKind[] = ['sensor', 'actuator', 'mechanical', 'power', 'module', 'network'];
  return COMPONENT_TESTS.filter((t) => t.components.includes(componentId)).sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

export function operationFor(componentId: string): string | null {
  return COMPONENT_OPERATION[componentId] ?? null;
}

/** Search tests by name, operation and the components they cover. */
export function searchTests(query: string): ComponentTest[] {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return COMPONENT_TESTS;
  return COMPONENT_TESTS.map((t) => {
    const hay = `${t.name} ${t.operation} ${t.components.join(' ')} ${t.pins.map((p) => p.role).join(' ')}`.toLowerCase();
    const name = t.name.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (name.includes(w)) score += 3;
      else if (hay.includes(w)) score += 1;
      else return { t, score: 0 };
    }
    return { t, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.t);
}
