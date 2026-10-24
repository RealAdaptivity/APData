/**
 * Faults: problems a customer brings in that may set no code at all — an ABS
 * light with the wheel sensors reading fine, a pull, a clunk, a dead battery
 * every morning. Each lists what the customer says, the usual causes (most
 * likely first) and the checks in order, cheap and quick first.
 *
 * Written for AP Data from general shop practice; they apply to every vehicle.
 * What this shop learned on real jobs lives in Confirmed Fixes.
 *
 * Only types are imported, so the node test runner loads it directly.
 */

import type { SystemId } from './systems.ts';
import type { Severity } from './dtcLibrary.ts';

export type Fault = {
  id: string;
  title: string;
  system: SystemId;
  severity: Severity;
  /** How customers describe it. */
  complaints: string[];
  /** Most likely first. */
  causes: string[];
  /** In order: quick and cheap first. */
  checks: string[];
  /** Codes that often come with it. */
  codes?: string[];
  /** Component location ids (src/data/locations.ts). */
  locations?: string[];
  /** Built-in article slugs. */
  articles?: string[];
};

export const FAULTS: Fault[] = [
  // ---------------------------------------------------------------- brakes and ABS
  {
    id: 'abs-light-on',
    title: 'ABS or traction light on',
    system: 'brakes',
    severity: 'medium',
    complaints: ['ABS light stays on', 'Traction control light on', 'ABS and brake light came on together'],
    causes: [
      'A wheel speed sensor or its wiring (most common — damaged where the wire flexes, or rust under the sensor)',
      'Rusted or cracked tone ring, or a failing hub bearing with a built-in encoder',
      'Low battery voltage or a poor ABS module ground',
      'Brake light switch fault',
      'ABS pump motor or module fault',
      'An engine fault telling the ABS to turn off traction control',
    ],
    checks: [
      'Read codes in the ABS module, not just the engine computer — a generic code reader often cannot.',
      'Check battery voltage and the charging system.',
      'Drive slowly with the scan tool on the four wheel speeds: the bad sensor drops out or reads low.',
      'Inspect the sensor harness at each wheel and the connectors.',
      'Pull the suspect sensor, clean the bore, inspect the tone ring and check the bearing for play.',
    ],
    codes: ['C0035', 'C0040', 'C0045', 'C0050', 'C1145', 'C1155', 'C1165', 'C1175', 'U0121'],
    locations: ['wheel-speed', 'abs-module', 'brake-switch'],
    articles: ['wheel-bearing-diagnosis'],
  },
  {
    id: 'red-brake-light',
    title: 'Red brake warning light on',
    system: 'brakes',
    severity: 'high',
    complaints: ['Brake light on the dash', 'BRAKE light with the parking brake off'],
    causes: ['Brake fluid low (worn pads, or a leak)', 'Parking brake switch stuck or out of adjustment', 'Electric parking brake fault', 'Electronic brake distribution off because of an ABS fault'],
    checks: ['Check the fluid level and the pad thickness — low fluid with worn pads is normal; low fluid with good pads means a leak.', 'Look for wetness at the calipers, wheel cylinders, lines and master cylinder.', 'Check the parking brake switch.', 'Read ABS codes: an ABS fault can turn on the red light too.'],
    codes: ['C1155'],
    locations: ['brake-master', 'abs-module'],
    articles: ['brake-fluid-bleed'],
  },
  {
    id: 'brake-pulsation',
    title: 'Brake pedal or steering wheel pulsates when braking',
    system: 'brakes',
    severity: 'medium',
    complaints: ['Pedal pulses when stopping', 'Steering wheel shakes when braking from highway speed'],
    causes: ['Rotor thickness variation (from runout, uneven pad deposits, or uneven lug torque)', 'Rusted or uneven hub face causing rotor runout', 'Worn suspension or steering parts amplifying the shake'],
    checks: ['Road test: shake in the wheel points at the front rotors, in the seat or pedal at the rear.', 'Measure rotor runout on the vehicle with a dial indicator and thickness variation with a micrometer.', 'Clean the hub face, then torque the lugs to spec in a star pattern with a torque wrench.'],
    locations: ['wheel-speed'],
    articles: ['brake-noise-pull-pulsation', 'brake-pads-rotors', 'wheel-installation-torque'],
  },
  {
    id: 'soft-brake-pedal',
    title: 'Soft, spongy or sinking brake pedal',
    system: 'brakes',
    severity: 'critical',
    complaints: ['Pedal goes almost to the floor', 'Pedal feels mushy', 'Pedal slowly sinks at a stop'],
    causes: ['Air in the system (after a repair, or from low fluid)', 'External fluid leak', 'Master cylinder bypassing internally (pedal sinks with no leak)', 'Flexing or swollen brake hoses', 'Rear brakes out of adjustment on drum brakes'],
    checks: ['Do not let the vehicle leave until it is found.', 'Check the fluid level and look for leaks at every wheel and the master cylinder.', 'Pump the pedal: if it rises, there is air or drums need adjusting.', 'Hold steady pressure engine running: a slow sink with no leak points at the master cylinder.', 'Bleed in the factory sequence (some ABS units need a scan tool bleed).'],
    locations: ['brake-master', 'abs-module'],
    articles: ['brake-fluid-bleed'],
  },
  {
    id: 'hard-brake-pedal',
    title: 'Hard brake pedal, poor braking',
    system: 'brakes',
    severity: 'high',
    complaints: ['Have to stand on the brakes', 'Pedal is hard as a rock'],
    causes: ['Brake booster vacuum lost (split hose, failed check valve)', 'Failed vacuum booster diaphragm', 'Hydroboost: low power steering fluid or a belt problem', 'Glazed or contaminated pads, or a seized caliper'],
    checks: ['Engine off, pump the pedal to empty the booster, hold it, start the engine: the pedal should drop slightly.', 'Check the vacuum hose and check valve; diesels and some gas engines use a vacuum pump — check its output.', 'Look for a hissing at the pedal (leaking booster).', 'Inspect pads and calipers.'],
    codes: ['P0556'],
    locations: ['brake-master'],
  },
  {
    id: 'brake-noise',
    title: 'Brakes squeal, grind or click',
    system: 'brakes',
    severity: 'medium',
    complaints: ['Squeal when stopping', 'Grinding metal noise', 'Clunk or click when starting to brake'],
    causes: ['Pad wear indicator touching (high squeal while driving)', 'Pads worn to the backing plate (grinding)', 'Missing or dry pad hardware and shims', 'Loose caliper bolts or worn bracket pins (click or clunk)', 'Rust lip on the rotor edge'],
    checks: ['Measure pad thickness at every wheel.', 'Inspect rotors for scoring and a rust lip.', 'Check caliper and bracket bolt torque and slide pins.', 'Replace pad hardware and lubricate contact points with brake grease.'],
    articles: ['brake-noise-pull-pulsation', 'brake-pads-rotors'],
  },
  {
    id: 'pulls-when-braking',
    title: 'Pulls to one side when braking',
    system: 'brakes',
    severity: 'high',
    complaints: ['Swerves when stopping', 'Pulls left or right only when braking'],
    causes: ['Sticking caliper slide or piston on one side', 'Collapsed brake hose holding pressure', 'Contaminated pad on one side (grease or fluid)', 'Worn control arm bushings or tie rod letting the wheel move under braking'],
    checks: ['After a drive, compare wheel temperatures side to side — a hot wheel is dragging.', 'Check each caliper slides freely and the piston retracts.', 'Look for fluid or grease on the pads.', 'Inspect front suspension bushings and tie rods.'],
    articles: ['brake-noise-pull-pulsation', 'front-end-inspection'],
  },
  {
    id: 'false-abs',
    title: 'ABS kicks in at low speed',
    system: 'brakes',
    severity: 'high',
    complaints: ['Pedal buzzes and pushes back when stopping slowly', 'Brakes feel like they release just before stopping'],
    causes: ['Rust under a wheel speed sensor or on the tone ring making a weak signal at low speed', 'Cracked tone ring', 'Loose hub bearing changing the air gap'],
    checks: ['Watch all four wheel speeds while coasting to a stop: one dropping to zero early is the culprit.', 'Remove that sensor, clean rust from the bore and tone ring, and check the bearing.'],
    locations: ['wheel-speed'],
    articles: ['wheel-bearing-diagnosis'],
  },
  {
    id: 'epb-fault',
    title: 'Electric parking brake will not apply or release',
    system: 'brakes',
    severity: 'high',
    complaints: ['Park brake light flashing', 'Parking brake stuck on', 'Service parking brake message'],
    causes: ['Low battery voltage', 'Rear caliper motor seized or corroded', 'Switch fault', 'Pads replaced without retracting the motor with a scan tool'],
    checks: ['Check battery voltage first.', 'Read codes in the park brake or ABS module.', 'Use the scan tool service mode to retract the calipers for brake work — never force the piston back.', 'Check the motor connector at each rear caliper for corrosion.'],
    codes: ['U0128'],
  },

  // ---------------------------------------------------------------- steering and suspension
  {
    id: 'pulls-drifts',
    title: 'Pulls or drifts to one side',
    system: 'suspension',
    severity: 'medium',
    complaints: ['Car pulls right', 'Have to hold the wheel to go straight'],
    causes: ['Uneven tire pressure', 'Tire conicity (a tire that pulls; swap fronts to check)', 'Alignment out (camber or caster difference side to side)', 'Dragging brake', 'Worn control arm bushings or a bent part'],
    checks: ['Set all tire pressures to the door placard.', 'Swap the front tires side to side: if the pull changes direction, it is a tire.', 'Check for a dragging brake (hot wheel after a drive).', 'Inspect bushings and ball joints, then check the alignment.'],
    articles: ['front-end-inspection'],
  },
  {
    id: 'clunk-bumps',
    title: 'Clunk or knock over bumps',
    system: 'suspension',
    severity: 'medium',
    complaints: ['Clunk when going over bumps', 'Knock from the front end on rough roads'],
    causes: ['Worn sway bar end links or bushings (most common)', 'Worn strut mount or loose strut nut', 'Worn ball joint or control arm bushing', 'Loose or worn tie rod end', 'Loose exhaust or heat shield'],
    checks: ['Bounce each corner and listen; have a helper bounce while you feel the parts.', 'Unload the suspension and pry each joint with a bar, looking for play.', 'Check sway bar links by rocking the bar by hand.', 'Check the strut top nut torque and mount.', 'Shake the exhaust to rule it out.'],
    articles: ['front-end-inspection'],
  },
  {
    id: 'loose-steering',
    title: 'Loose or wandering steering',
    system: 'suspension',
    severity: 'high',
    complaints: ['Steering feels sloppy', 'Constantly correcting on the highway', 'Play in the steering wheel'],
    causes: ['Worn inner or outer tie rods', 'Worn ball joints', 'Loose steering gear or worn rack bushings', 'Worn steering shaft coupler', 'Alignment toe out of spec'],
    checks: ['Engine off, wheels on the ground: rock the steering wheel and watch for movement before the tires move.', 'Lift and check each tie rod and ball joint for play.', 'Check the steering gear mounting bolts and rack bushings.', 'Align after replacing steering parts.'],
    articles: ['front-end-inspection'],
  },
  {
    id: 'highway-vibration',
    title: 'Vibration at highway speed',
    system: 'suspension',
    severity: 'medium',
    complaints: ['Shake at 55 to 70 mph', 'Steering wheel shakes', 'Seat vibrates'],
    causes: ['Wheel out of balance or a lost weight', 'Bent wheel or out-of-round tire (belt shift)', 'Worn CV joint or driveshaft U-joint', 'Driveshaft angle or balance on trucks', 'Worn suspension parts'],
    checks: ['Shake in the steering wheel points at the front wheels; in the seat, the rear or the driveline.', 'Road-force balance the wheels and look for bent rims.', 'Check tires for separated belts (a lump or uneven wear).', 'Check U-joints and CV joints for play.'],
    articles: ['front-end-inspection'],
  },
  {
    id: 'noise-turning',
    title: 'Noise when turning',
    system: 'suspension',
    severity: 'medium',
    complaints: ['Clicking when turning', 'Groan or creak turning the wheel', 'Whine when turning'],
    causes: ['Outer CV joint worn (clicking in tight turns under power)', 'Dry or worn strut bearing (creak or bind)', 'Low or aerated power steering fluid (whine)', 'Dry ball joint or sway bar bushings (creak)'],
    checks: ['Clicks in a tight turn under power: check the outer CV boots for a tear and grease thrown around.', 'Turn the wheel lock to lock parked, listening at each strut top.', 'Check power steering fluid level and condition.'],
    locations: ['differential'],
    articles: ['front-end-inspection'],
  },
  {
    id: 'hard-steering',
    title: 'Hard steering or loss of power assist',
    system: 'suspension',
    severity: 'high',
    complaints: ['Steering suddenly heavy', 'Power steering warning light', 'Steering heavy when cold'],
    causes: ['Electric steering: low battery voltage, a module fault or a steering angle sensor not calibrated', 'Hydraulic: low fluid, worn pump or slipping belt', 'Binding steering column or a seized ball joint'],
    checks: ['Electric steering: check battery voltage and read codes in the power steering module.', 'Hydraulic: check fluid level, the belt and for leaks.', 'Lift the front and turn the wheel: it should move freely with the tires off the ground.'],
    codes: ['U0131', 'C0455', 'C0710'],
    locations: ['steering-angle'],
  },
  {
    id: 'uneven-tire-wear',
    title: 'Uneven tire wear',
    system: 'suspension',
    severity: 'low',
    complaints: ['Tires wearing on the inside edge', 'Cupped tires', 'Tires worn on the edges'],
    causes: ['Toe out of spec (feathered wear)', 'Camber out (one edge worn)', 'Worn shocks or struts (cupping)', 'Under-inflation (both edges)', 'Over-inflation (center)', 'Worn suspension parts'],
    checks: ['Read the wear pattern: feathering is toe, one edge is camber, cupping is dampers, both edges is low pressure.', 'Inspect bushings, ball joints and tie rods for play.', 'Bounce test and inspect the shocks and struts for leaks.', 'Align after parts are fixed, and rotate the tires.'],
    articles: ['front-end-inspection'],
  },
  {
    id: 'bouncy-ride',
    title: 'Bouncy ride, nose dive or body sway',
    system: 'suspension',
    severity: 'medium',
    complaints: ['Floats over bumps', 'Nose dives when braking', 'Leans hard in turns'],
    causes: ['Worn or leaking shocks or struts', 'Broken or sagging springs', 'Worn sway bar bushings or links', 'Air suspension leaking'],
    checks: ['Look for oil on the shock bodies.', 'Measure ride height side to side.', 'Bounce test: the body should settle after one rebound.', 'Check sway bar bushings and links.'],
  },
  {
    id: 'air-suspension-sag',
    title: 'Air suspension sagging or warning on',
    system: 'suspension',
    severity: 'medium',
    complaints: ['Sits low in the morning', 'Suspension fault message', 'Compressor runs all the time'],
    causes: ['Leaking air spring (cracked bag)', 'Leaking line or valve block', 'Worn compressor or failed relay', 'Ride height sensor fault'],
    checks: ['Spray soapy water on each air spring and fitting with the system full.', 'Read codes in the suspension module.', 'Check the compressor relay and fuse; time how long it takes to pump up.', 'Check the ride height sensors on the scan tool against actual height.'],
    codes: ['U0132'],
  },
  {
    id: 'wheel-bearing-noise',
    title: 'Humming or growling that changes with speed',
    system: 'drivetrain',
    severity: 'medium',
    complaints: ['Drone that gets louder with speed', 'Noise changes when turning one way'],
    causes: ['Worn hub bearing (gets louder turning away from the bad side as weight loads it)', 'Cupped or aggressive tires', 'Differential or transfer case bearing noise'],
    checks: ['Road test: swerve gently left and right — the noise growing when turning right usually means the left bearing, and the other way round.', 'Lift and spin each wheel by hand, feeling for roughness; check for play.', 'Rule out tires by checking wear pattern or swapping.'],
    locations: ['wheel-speed', 'differential'],
    articles: ['wheel-bearing-diagnosis'],
  },
  {
    id: 'tpms-light',
    title: 'Tire pressure light on or flashing',
    system: 'suspension',
    severity: 'low',
    complaints: ['Tire light stays on', 'Tire light flashes then stays on'],
    causes: ['Low tire (solid light)', 'Dead sensor battery or a missing sensor (flashing for about a minute then solid)', 'Sensors not relearned after a rotation or tire change', 'Spare without a sensor fitted'],
    checks: ['Set all tires, including a full-size spare with a sensor, to the door placard.', 'Read each sensor with a TPMS tool to find a dead one.', 'Do the relearn the vehicle needs after any rotation or sensor change.'],
    locations: ['tpms'],
  },

  // ---------------------------------------------------------------- starting, charging, electrical
  {
    id: 'battery-drain',
    title: 'Battery dead overnight (parasitic drain)',
    system: 'starting_charging',
    severity: 'medium',
    complaints: ['Dead every morning', 'Battery dies if it sits a few days'],
    causes: ['A module staying awake (aftermarket remote start, stereo or tracker is common)', 'Glovebox, trunk or under-hood light staying on', 'Failed battery that cannot hold a charge', 'Alternator diode leaking', 'A relay stuck on'],
    checks: ['Load-test the battery first.', 'Measure draw with an ammeter in series after letting modules sleep (often 30–60 minutes); most vehicles should settle under about 50 mA.', 'Find the circuit by measuring voltage drop across each fuse rather than pulling them (pulling fuses wakes modules).', 'Disconnect the alternator output to rule it out.'],
    codes: ['B1318'],
    locations: ['battery', 'underhood-fuse-box', 'interior-fuse-panel'],
    articles: ['parasitic-draw-test', 'battery-charging-test'],
  },
  {
    id: 'no-crank',
    title: 'Clicks or does nothing when turning the key (no crank)',
    system: 'starting_charging',
    severity: 'high',
    complaints: ['Click but no crank', 'Nothing happens', 'Dash lights up but will not crank'],
    causes: ['Weak battery or corroded terminals (most common)', 'Bad ground cable or starter cable', 'Starter motor or solenoid failed', 'Transmission range switch or clutch switch not signalling park/neutral', 'Anti-theft blocking the starter'],
    checks: ['Test the battery and clean the terminals.', 'Voltage-drop test both battery cables while trying to crank: over 0.5 V on either is a cable or connection problem.', 'Try starting in neutral; wiggle the shifter.', 'Check for voltage at the starter solenoid wire while cranking.', 'Watch the security light: flashing means the immobilizer is blocking the start.'],
    codes: ['P0615', 'B1600'],
    locations: ['battery', 'starter', 'grounds', 'trans-range'],
    articles: ['no-start-diagnosis', 'battery-charging-test', 'voltage-drop-testing'],
  },
  {
    id: 'crank-no-start',
    title: 'Cranks but will not start',
    system: 'driveability',
    severity: 'high',
    complaints: ['Turns over but will not fire', 'Starts then dies immediately'],
    causes: ['No fuel pressure (pump, relay, fuse, or fuel pump module)', 'No spark or no crank signal (crank sensor)', 'Immobilizer not recognizing the key (starts and dies)', 'Flooded or very low compression (timing chain or belt)'],
    checks: ['Check for RPM on the scan tool while cranking: none means no crank signal.', 'Check fuel pressure at the rail.', 'Check for spark and injector pulse.', 'Watch the security light.', 'Do a compression test if fuel and spark are present.'],
    codes: ['P0335', 'P0230', 'P0087', 'B1600'],
    locations: ['crank-sensor', 'fuel-pump', 'coils'],
    articles: ['no-start-diagnosis', 'fuel-pressure-testing', 'compression-test'],
  },
  {
    id: 'charging-light',
    title: 'Battery or charging light on, dim lights',
    system: 'starting_charging',
    severity: 'high',
    complaints: ['Battery light on while driving', 'Lights dim at idle', 'Gauges flicker'],
    causes: ['Alternator failed or worn brushes', 'Loose or slipping belt', 'Corroded alternator output wire or ground', 'Battery that cannot accept charge', 'Charging control fault from the engine computer (smart charging)'],
    checks: ['Check charging voltage at the battery with loads on: about 13.5–14.8 V on most vehicles.', 'Check the belt and tensioner.', 'Voltage-drop test the alternator output and ground circuits.', 'Read codes: many newer vehicles control the alternator through the engine computer.'],
    codes: ['P0562', 'P0620', 'B1317', 'B1318'],
    locations: ['alternator', 'battery', 'grounds'],
    articles: ['battery-charging-test', 'voltage-drop-testing', 'serpentine-belt'],
  },
  {
    id: 'fuse-blows',
    title: 'Same fuse keeps blowing',
    system: 'electrical',
    severity: 'medium',
    complaints: ['Fuse blows right away', 'Fuse blows over bumps or when using a feature'],
    causes: ['Wire chafed through to ground (common at door hinges, seat tracks, trailer wiring and behind the dash)', 'Shorted motor or component on that circuit', 'Wrong fuse rating installed earlier', 'Water in a connector'],
    checks: ['Use the wiring diagram to list everything on that fuse.', 'Replace the fuse with a short tester or a sealed-beam test lamp across the fuse cavity, then unplug parts one at a time until it goes out.', 'Wiggle the harness at known chafe points while watching the tester.'],
    locations: ['underhood-fuse-box', 'interior-fuse-panel'],
  },
  {
    id: 'intermittent-electrical',
    title: 'Random electrical problems, several warning lights at once',
    system: 'electrical',
    severity: 'medium',
    complaints: ['Gauges drop out', 'Lights flicker', 'Different warning lights come and go', 'Radio resets'],
    causes: ['Poor main ground (engine, body or battery)', 'Loose or corroded battery terminals', 'Weak battery or a failing alternator', 'Network fault from one module or water in a connector'],
    checks: ['Check and clean the battery terminals and main grounds.', 'Voltage-drop test the grounds with loads on.', 'Test the battery and charging system.', 'Read all modules for U codes to see which ones lost communication.'],
    codes: ['U0001', 'U0100', 'U0140'],
    locations: ['grounds', 'battery', 'dlc'],
    articles: ['voltage-drop-testing', 'can-bus-diagnosis'],
  },
  {
    id: 'key-not-detected',
    title: 'Key not detected, security light flashing, no start',
    system: 'electrical',
    severity: 'high',
    complaints: ['Key not detected message', 'Security light flashing', 'Push to start does nothing'],
    causes: ['Weak key fob battery', 'Key not programmed, or a damaged chip', 'Interference from other keys, chargers or phone cases', 'Immobilizer antenna or module fault'],
    checks: ['Hold the fob against the start button or in the backup slot (see the owner’s manual) — it should start with a dead fob battery.', 'Replace the fob battery and try the second key.', 'Remove other keys and devices from the ring.', 'Read immobilizer codes.'],
    codes: ['B1600', 'B1601', 'U0167'],
  },
  {
    id: 'power-windows-locks',
    title: 'Power windows, locks or mirrors not working',
    system: 'body',
    severity: 'low',
    complaints: ['Window will not go up', 'Locks work from one door only', 'Key fob does not unlock'],
    causes: ['Broken wires in the door hinge boot (very common on driver doors)', 'Failed window regulator or motor', 'Failed switch', 'Door module or body module fault', 'Fuse or relay'],
    checks: ['Does it work from any switch? If one switch works, the motor is fine.', 'Open the door hinge boot and check for broken wires while operating the switch.', 'Check voltage at the motor while operating the switch.', 'Read body and door module codes.'],
    codes: ['U0199', 'U0200', 'U0214'],
    locations: ['bcm', 'interior-fuse-panel'],
  },
  {
    id: 'lights-out',
    title: 'Headlight, tail light or turn signal out',
    system: 'electrical',
    severity: 'medium',
    complaints: ['Headlight out', 'Turn signal flashes fast', 'Brake lights not working'],
    causes: ['Burned bulb', 'Corroded socket or ground', 'Failed LED module or headlight driver', 'Brake light switch (all brake lights out)', 'Body module output fault'],
    checks: ['Swap the bulb side to side.', 'Check voltage and ground at the socket with the load on.', 'Fast flashing usually means a bulb out on that side.', 'All brake lights out: check the fuse and the brake light switch.'],
    locations: ['brake-switch', 'bcm'],
  },
  {
    id: 'cluster-dead',
    title: 'Gauges or instrument cluster dead or erratic',
    system: 'electrical',
    severity: 'medium',
    complaints: ['Speedometer stuck', 'Gauges all drop to zero', 'Cluster goes dark'],
    causes: ['Cluster lost communication (power, ground or network)', 'Failed stepper motors or solder joints in the cluster', 'Vehicle speed signal fault (speedometer only)', 'Low voltage'],
    checks: ['Read codes: U0155 points at communication with the cluster.', 'Check the cluster fuses, power and ground.', 'Run the cluster self-test (many have a button sequence).', 'Speedometer only: check the wheel speed and output speed signals.'],
    codes: ['U0155', 'U0423', 'P0500'],
  },

  // ---------------------------------------------------------------- HVAC and body
  {
    id: 'ac-warm',
    title: 'A/C blows warm',
    system: 'hvac',
    severity: 'low',
    complaints: ['A/C not cold', 'Cold on the highway, warm at idle'],
    causes: ['Low refrigerant from a leak', 'Compressor clutch not engaging (fuse, relay, low-pressure cutout, or a worn clutch air gap)', 'Condenser fan not running (warm at idle)', 'Blend door stuck on heat', 'Clogged condenser'],
    checks: ['Check that the compressor engages and the condenser fans run.', 'Connect gauges and compare pressures to the ambient-temperature chart.', 'Leak-test with dye or an electronic detector before recharging.', 'Check the blend door moves (temperature at the vents changes from hot to cold).'],
    locations: ['ac-compressor', 'radiator', 'blend-door'],
    articles: ['ac-performance-test'],
  },
  {
    id: 'blower-issues',
    title: 'Blower works only on high, or not at all',
    system: 'hvac',
    severity: 'low',
    complaints: ['Fan only works on high', 'No air from the vents'],
    causes: ['Blower resistor or control module failed (works only on high)', 'Blower motor worn or seized', 'Fuse or relay', 'Melted connector at the resistor'],
    checks: ['Works only on high: replace the resistor, and check its connector for heat damage.', 'Check voltage at the blower motor on each speed.', 'A noisy or slow motor draws high current and kills resistors — replace both.'],
    locations: ['blower-motor', 'cabin-filter'],
  },
  {
    id: 'no-heat',
    title: 'Heat not hot',
    system: 'hvac',
    severity: 'low',
    complaints: ['Heater blows lukewarm', 'Temperature gauge stays low'],
    causes: ['Low coolant or air in the system', 'Thermostat stuck open (gauge low, heat lukewarm)', 'Clogged heater core', 'Blend door stuck on cold'],
    checks: ['Check the coolant level cold and bleed air.', 'Watch engine temperature on the scan tool: it should reach about 190–220 °F.', 'Feel both heater hoses at the firewall: one cold means a blocked core.', 'Check the blend door moves.'],
    codes: ['P0128'],
    locations: ['thermostat', 'heater-core', 'blend-door'],
    articles: ['coolant-drain-fill-bleed'],
  },
  {
    id: 'water-leak',
    title: 'Water inside the vehicle',
    system: 'body',
    severity: 'medium',
    complaints: ['Wet carpet', 'Water on the passenger floor', 'Fogging windows'],
    causes: ['Clogged cowl or sunroof drains', 'Clogged A/C evaporator drain (passenger floor)', 'Leaking windshield seal or door vapor barrier', 'Heater core leak (sweet smell, greasy fog)'],
    checks: ['Smell the water: sweet means coolant from the heater core.', 'Clear the cowl, sunroof and A/C drains.', 'Water-test with a helper inside, working from low to high.', 'Check the door vapor barriers and windshield seal.'],
    locations: ['heater-core', 'bcm'],
  },

  // ---------------------------------------------------------------- engine and transmission without codes
  {
    id: 'overheating',
    title: 'Overheating',
    system: 'cooling',
    severity: 'critical',
    complaints: ['Temperature gauge climbing', 'Steam from under the hood', 'Overheats in traffic'],
    causes: ['Low coolant from a leak', 'Cooling fan not running (overheats at idle)', 'Thermostat stuck closed', 'Water pump failed', 'Blocked radiator', 'Head gasket leaking combustion gas into the coolant'],
    checks: ['Do not open the cap hot. Check the coolant level cold.', 'Pressure-test the cooling system for leaks.', 'Check the fans come on at temperature.', 'Check for combustion gas in the coolant with a block tester.'],
    codes: ['P0217', 'P0480'],
    locations: ['radiator', 'thermostat', 'water-pump'],
    articles: ['cooling-system-pressure-test', 'coolant-drain-fill-bleed'],
  },
  {
    id: 'rough-idle-no-code',
    title: 'Rough idle or hesitation with no code',
    system: 'driveability',
    severity: 'medium',
    complaints: ['Shakes at idle', 'Stumbles on takeoff', 'Idles rough when cold'],
    causes: ['Vacuum leak (PCV, intake gaskets, brake booster hose)', 'Dirty throttle body', 'Worn spark plugs or a weak coil not yet setting a misfire code', 'Dirty MAF sensor', 'Worn engine or transmission mounts'],
    checks: ['Look at short and long fuel trims at idle and 2,500 rpm: high positive at idle that drops at speed means a vacuum leak.', 'Watch misfire counters on the scan tool — they show misfires before a code sets.', 'Smoke-test the intake.', 'Clean the throttle body and run the idle relearn.', 'Check the mounts with a helper shifting between drive and reverse.'],
    locations: ['intake-manifold', 'throttle-body', 'pcv', 'maf', 'coils'],
    articles: ['fuel-trim-diagnosis', 'smoke-test-vacuum-evap', 'throttle-body-service', 'misfire-diagnosis'],
  },
  {
    id: 'harsh-shift',
    title: 'Harsh, late or slipping shifts',
    system: 'transmission',
    severity: 'high',
    complaints: ['Bangs into gear', 'Slips between gears', 'Revs up before shifting'],
    causes: ['Low or burnt fluid', 'Adaptive learning not reset after a repair', 'Shift solenoid or valve body fault', 'Engine torque signal wrong (an engine fault)', 'Internal wear'],
    checks: ['Check fluid level and condition the way the factory says (many are checked hot with the engine running).', 'Read transmission codes and look at the fluid temperature and slip data.', 'Check for software updates and reset adaptives after repairs.'],
    codes: ['P0700', 'P0715', 'P0730'],
    locations: ['trans-fluid', 'tcm', 'trans-speed'],
    articles: ['transmission-fluid-check'],
  },
  {
    id: 'oil-leak',
    title: 'Oil leak or burning oil smell',
    system: 'engine',
    severity: 'medium',
    complaints: ['Oil spots on the driveway', 'Burning smell after driving', 'Smoke from the engine bay'],
    causes: ['Valve cover gaskets (oil burning on the exhaust)', 'Oil filter or drain plug not sealed', 'Oil pan or timing cover gasket', 'Oil pressure switch or oil cooler lines', 'Rear main seal'],
    checks: ['Clean the area and add UV dye; drive and check with a UV light.', 'Start at the highest wet point — oil runs down and back.', 'Check the filter, drain plug and oil pressure switch first (cheapest).'],
    locations: ['oil-filter', 'oil-pressure', 'pcv'],
    articles: ['oil-filter-service'],
  },
];

const BY_ID = new Map(FAULTS.map((f) => [f.id, f]));

export function faultById(id: string): Fault | null {
  return BY_ID.get(id) ?? null;
}

const fold = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Faults matching every word typed, title and complaints first. */
export function searchFaults(query: string): Fault[] {
  const words = fold(query).split(' ').filter((w) => w.length > 1);
  if (!words.length) return FAULTS;
  const scored = FAULTS.map((f) => {
    const head = fold([f.title, ...f.complaints].join(' '));
    const body = fold([...f.causes, ...(f.codes ?? [])].join(' '));
    // The whole phrase as typed ("pulls right") beats the same words scattered.
    let score = head.includes(words.join(' ')) ? 5 : 0;
    const title = fold(f.title);
    for (const w of words) {
      if (title.includes(w)) score += 4;
      else if (head.includes(w)) score += 3;
      else if (body.includes(w)) score += 1;
      else return { f, score: 0 };
    }
    return { f, score };
  });
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.f);
}

/** Faults that list a code. */
export function faultsForCode(code: string): Fault[] {
  const c = code.toUpperCase();
  return FAULTS.filter((f) => f.codes?.includes(c));
}
