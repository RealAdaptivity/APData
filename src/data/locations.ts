/**
 * Where things usually are: the components a tech hunts for, the view of the
 * vehicle each shows on, and how to find it.
 *
 * Written for AP Data from general shop practice. These are typical locations
 * across makes, not factory diagrams (those are licensed by the automakers and
 * the information services): every entry says what varies, and the shop's own
 * photos for the vehicle on the lift sit under each diagram. Spots are in the
 * views' 400 × 260 drawing space (src/components/LocationDiagram.tsx).
 *
 * No imports except types, so the node test runner loads it directly.
 */

import type { SystemId } from './systems.ts';

export type LocationView = 'bay' | 'engine' | 'under' | 'cabin' | 'outside';

export const VIEW_LABEL: Record<LocationView, string> = {
  bay: 'Engine bay, from above',
  engine: 'Engine, from the belt end',
  under: 'Underneath, from below',
  cabin: 'Dash and footwells',
  outside: 'Outside the vehicle',
};

export type Spot = { view: LocationView; x: number; y: number; label?: string };

export type ComponentLocation = {
  id: string;
  name: string;
  /** Other names techs and scan tools use. */
  aka: string[];
  system: SystemId;
  /** Where it usually is, in one or two sentences. */
  where: string;
  /** How to find it or get at it. */
  tips: string[];
  /** What changes between vehicles. */
  varies: string;
  /** Where to mark it on the diagrams. The first spot is the main one. */
  spots: Spot[];
  /** Trouble codes that point at it: single codes or ranges ("P0335-P0339"). */
  codes: string[];
};

export const COMPONENT_LOCATIONS: ComponentLocation[] = [
  // ---------------------------------------------------------------- electrical
  {
    id: 'battery',
    name: 'Battery',
    aka: ['12 V battery', 'starting battery'],
    system: 'starting_charging',
    where: 'Usually a front corner of the engine bay. Some sit under the rear seat, in the trunk under the floor, or behind a front fender liner.',
    tips: [
      'No battery under the hood? Look for remote jump posts (a red cap marked +) near the fuse box: the battery is elsewhere.',
      'BMW, Mercedes, Chrysler 300/Charger and many SUVs keep it in the trunk or under the rear seat.',
      'Battery-monitor sensors (IBS) sit on the negative clamp: register a new battery on vehicles that use one.',
    ],
    varies: 'Corner, trunk, under a seat, or behind the bumper.',
    spots: [{ view: 'bay', x: 72, y: 72 }],
    codes: ['P0560-P0563', 'P0A80', 'B1317', 'B1318'],
  },
  {
    id: 'underhood-fuse-box',
    name: 'Under-hood fuse and relay box',
    aka: ['power distribution box', 'PDC', 'IPDM', 'TIPM', 'junction box'],
    system: 'electrical',
    where: 'A black box with a clip-on lid in the engine bay, usually beside the battery or along a fender.',
    tips: [
      'The lid’s underside usually maps the fuses and relays.',
      'Chrysler TIPM, Nissan IPDM and GM UBEC are modules as well as fuse boxes: they can fail internally.',
      'Some trucks have a second box on the driver-side firewall or by the battery.',
    ],
    varies: 'Driver or passenger side; some have two.',
    spots: [{ view: 'bay', x: 330, y: 92 }],
    codes: [],
  },
  {
    id: 'interior-fuse-panel',
    name: 'Interior fuse panel',
    aka: ['cabin fuse box', 'smart junction box', 'body control fuse block'],
    system: 'electrical',
    where: 'At the end of the dash behind a side cover (open the door to see it), under the dash on the driver side, or behind the glovebox.',
    tips: ['Pull the trim cover at the end of the dash or the kick panel by the driver’s feet.', 'On Fords the smart junction box (SJB) holds the body module too.'],
    varies: 'Driver or passenger side, dash end or kick panel.',
    spots: [{ view: 'cabin', x: 30, y: 178 }],
    codes: [],
  },
  {
    id: 'dlc',
    name: 'OBD-II diagnostic connector',
    aka: ['DLC', 'OBD port', 'data link connector', 'J1962'],
    system: 'network',
    where: 'Under the dash on the driver side, within reach of the steering column — required on every 1996-and-newer car and light truck.',
    tips: [
      'Look straight down beside the steering column, near the hood release or the knee bolster.',
      'A few hide behind a small cover or in the center console; heavy trucks use a 9-pin round connector instead.',
      'No communication? Check pin 16 (battery +), pins 4 and 5 (ground) and the cigar-lighter fuse first.',
    ],
    varies: 'Left or right of the column, sometimes behind a cover.',
    spots: [{ view: 'cabin', x: 92, y: 222 }],
    codes: ['U0001-U0100'],
  },
  {
    id: 'pcm',
    name: 'Engine computer (PCM / ECM)',
    aka: ['PCM', 'ECM', 'ECU', 'engine control module', 'powertrain control module'],
    system: 'network',
    where: 'In the engine bay on a fender or near the battery or air box on most domestics; behind the passenger kick panel or under the cowl on many imports.',
    tips: [
      'Follow the thickest wiring harness: it ends at the PCM’s big multi-pin connectors.',
      'Before replacing one, check its powers and grounds under load — a bad ground mimics a dead module.',
      'Replacements usually need programming (VIN, keys, immobilizer).',
    ],
    varies: 'Engine bay, cowl, kick panel or under a seat.',
    spots: [
      { view: 'bay', x: 300, y: 205, label: 'Common domestic spot' },
      { view: 'cabin', x: 370, y: 212, label: 'Common import spot' },
    ],
    codes: ['P0600-P0606', 'P0610', 'P062F', 'U0100', 'U0101'],
  },
  {
    id: 'tcm',
    name: 'Transmission computer (TCM)',
    aka: ['TCM', 'transmission control module', 'TCU'],
    system: 'transmission',
    where: 'Often inside or bolted to the transmission (Ford, GM 6- to 10-speeds, Chrysler 8-speed), otherwise in the engine bay or under the dash.',
    tips: ['Internal TCMs sit in the valve body: diagnosis may mean dropping the pan.', 'Many are built into the PCM (one box for both).'],
    varies: 'Inside the transmission, on it, or separate.',
    spots: [
      { view: 'under', x: 200, y: 96 },
      { view: 'bay', x: 112, y: 150 },
    ],
    codes: ['P0700', 'P0613', 'U0101'],
  },
  {
    id: 'bcm',
    name: 'Body computer (BCM)',
    aka: ['BCM', 'body control module', 'SJB', 'BCU'],
    system: 'network',
    where: 'Behind the dash on the driver side, often above the fuse panel or behind the knee bolster.',
    tips: ['Remove the knee bolster or the lower dash panel.', 'Water leaks from the cowl or windshield often reach it.'],
    varies: 'Driver or passenger side behind the dash; some are part of the fuse panel.',
    spots: [{ view: 'cabin', x: 58, y: 160 }],
    codes: ['U0140', 'B1000-B1999'],
  },
  {
    id: 'alternator',
    name: 'Alternator',
    aka: ['generator'],
    system: 'starting_charging',
    where: 'On the front (belt end) of the engine, driven by the serpentine belt — high on most engines, low on some.',
    tips: ['Follow the belt routing sticker (under the hood or on the fan shroud).', 'Some sit low and come out from underneath.'],
    varies: 'High or low, left or right on the belt end.',
    spots: [
      { view: 'engine', x: 108, y: 118 },
      { view: 'bay', x: 290, y: 118 },
    ],
    codes: ['P0620-P0625', 'P065B', 'P0A8F'],
  },
  {
    id: 'starter',
    name: 'Starter',
    aka: ['starter motor'],
    system: 'starting_charging',
    where: 'Low where the engine meets the transmission, on the side or underneath. A few sit in the engine valley under the intake (some GM and Toyota V8s).',
    tips: ['Find the heavy battery cable and follow it down.', 'Valley-mounted starters mean removing the intake manifold.'],
    varies: 'Driver or passenger side; occasionally under the intake.',
    spots: [
      { view: 'under', x: 160, y: 86 },
      { view: 'engine', x: 290, y: 212 },
    ],
    codes: ['P0615-P0617'],
  },
  {
    id: 'grounds',
    name: 'Main ground straps',
    aka: ['engine ground', 'body ground', 'battery ground'],
    system: 'electrical',
    where: 'Battery negative to the body near the battery, engine block to body or frame, and transmission to frame.',
    tips: ['Voltage-drop test with the circuit loaded: under 0.2 V across a ground.', 'Check after any engine or transmission removal: straps get left off.'],
    varies: 'Count and placement.',
    spots: [
      { view: 'bay', x: 100, y: 96 },
      { view: 'engine', x: 318, y: 170 },
    ],
    codes: [],
  },

  // ---------------------------------------------------------------- air and fuel
  {
    id: 'air-filter',
    name: 'Air filter box',
    aka: ['air cleaner', 'airbox'],
    system: 'maintenance',
    where: 'A plastic box near a front corner of the engine bay, joined to the throttle body by the intake duct.',
    tips: ['Clips or screws hold the lid.', 'A duct split after the mass airflow sensor causes lean codes.'],
    varies: 'Either front corner, or on top of the engine.',
    spots: [{ view: 'bay', x: 322, y: 50 }],
    codes: [],
  },
  {
    id: 'maf',
    name: 'Mass airflow sensor (MAF)',
    aka: ['MAF', 'mass air flow', 'MAF/IAT'],
    system: 'driveability',
    where: 'In the intake duct just after the air filter box, often clipped into the box’s outlet.',
    tips: ['Clean only with MAF cleaner, never touch the element.', 'Most also hold the intake air temperature (IAT) sensor.'],
    varies: 'Speed-density engines (many Chrysler, some GM trucks) have none.',
    spots: [{ view: 'bay', x: 286, y: 74 }],
    codes: ['P0100-P0104', 'P0171', 'P0174', 'P0101'],
  },
  {
    id: 'iat',
    name: 'Intake air temperature sensor (IAT)',
    aka: ['IAT', 'air charge temperature', 'ACT'],
    system: 'driveability',
    where: 'Built into the MAF on most engines; otherwise in the air duct, the air box, or the intake manifold. Turbo engines add one after the intercooler.',
    tips: ['Compare IAT with ambient temperature on a cold engine: they should match within a few degrees.'],
    varies: 'MAF, duct, box or manifold.',
    spots: [{ view: 'bay', x: 270, y: 84 }],
    codes: ['P0110-P0114', 'P0095-P0099'],
  },
  {
    id: 'throttle-body',
    name: 'Throttle body',
    aka: ['electronic throttle body', 'ETB', 'drive-by-wire throttle'],
    system: 'driveability',
    where: 'Where the intake duct meets the intake manifold, usually facing the front or the side of the engine.',
    tips: ['Carbon at the plate causes rough idle and stalling: clean, then run the idle relearn.', 'Electronic throttles need a relearn after cleaning or replacement.'],
    varies: 'Front, side or top of the intake.',
    spots: [
      { view: 'bay', x: 252, y: 108 },
      { view: 'engine', x: 200, y: 52 },
    ],
    codes: ['P0120-P0124', 'P0220-P0229', 'P2101', 'P2111', 'P2112', 'P2135', 'P0505-P0507'],
  },
  {
    id: 'map',
    name: 'Manifold pressure sensor (MAP)',
    aka: ['MAP', 'manifold absolute pressure', 'boost sensor'],
    system: 'driveability',
    where: 'On the intake manifold or plenum, often near the throttle body. Turbo engines have a boost-pressure sensor after the intercooler too.',
    tips: ['Some connect by a vacuum hose: check it for cracks.', 'Key on, engine off, MAP should read barometric pressure.'],
    varies: 'Top, front or rear of the manifold.',
    spots: [
      { view: 'bay', x: 216, y: 112 },
      { view: 'engine', x: 232, y: 46 },
    ],
    codes: ['P0105-P0109', 'P0235-P0238', 'P0068'],
  },
  {
    id: 'intake-manifold',
    name: 'Intake manifold',
    aka: ['plenum', 'upper intake'],
    system: 'engine',
    where: 'On top of the engine, between the throttle body and the cylinder heads.',
    tips: ['Vacuum leaks show up at the gaskets, the PCV and brake-booster hoses, and plastic manifold seams.'],
    varies: 'Shape and material.',
    spots: [
      { view: 'bay', x: 200, y: 122 },
      { view: 'engine', x: 200, y: 70 },
    ],
    codes: ['P0171', 'P0174', 'P2004-P2017'],
  },
  {
    id: 'fuel-injectors',
    name: 'Fuel injectors and rail',
    aka: ['injectors', 'fuel rail'],
    system: 'driveability',
    where: 'Port injection: along the intake runners where they meet the heads, fed by a rail. Direct injection: in the cylinder heads, fed by a high-pressure pump on the engine.',
    tips: ['Injector 1 is at cylinder 1: see the engine layout for the numbering.', 'Listen with a stethoscope for an even click at each one.'],
    varies: 'Port, direct, or both (dual injection).',
    spots: [
      { view: 'engine', x: 152, y: 76 },
      { view: 'bay', x: 168, y: 140 },
    ],
    codes: ['P0200-P0208', 'P0261-P0284', 'P0300-P0312'],
  },
  {
    id: 'high-pressure-pump',
    name: 'High-pressure fuel pump (direct injection)',
    aka: ['HPFP', 'GDI pump', 'mechanical fuel pump'],
    system: 'driveability',
    where: 'On a cylinder head or the top of the engine, driven by a camshaft lobe.',
    tips: ['Fuel pressure can top 2,000 psi: relieve it as the service information says before opening a line.'],
    varies: 'Which head and which end.',
    spots: [{ view: 'engine', x: 268, y: 66 }],
    codes: ['P0087-P0093', 'P0190-P0193', 'P228C', 'P228D'],
  },
  {
    id: 'fuel-pump',
    name: 'Fuel pump (in tank) and driver module',
    aka: ['fuel pump module', 'fuel sender', 'FPDM', 'fuel pump control module'],
    system: 'driveability',
    where: 'Inside the fuel tank, reached through an access panel under the rear seat or trunk carpet — or by dropping the tank. A fuel-pump driver module, where fitted, is near the tank, on a frame rail, or behind a rear trim panel.',
    tips: ['Look for an access panel under the rear seat cushion before dropping the tank.', 'Ford FPDMs on the frame above the spare tire corrode and cause no-starts.'],
    varies: 'Access panel or not; module location.',
    spots: [
      { view: 'under', x: 145, y: 178 },
      { view: 'under', x: 96, y: 150, label: 'Driver module (some)' },
    ],
    codes: ['P0230-P0233', 'P0087', 'P0460-P0464', 'P0627-P0629', 'P069E', 'U0109'],
  },

  // ---------------------------------------------------------------- engine sensors
  {
    id: 'crank-sensor',
    name: 'Crankshaft position sensor (CKP)',
    aka: ['CKP', 'crank sensor', 'engine speed sensor'],
    system: 'driveability',
    where: 'At the front of the engine by the crank pulley (reading a reluctor behind the balancer), on the side of the block, or at the back by the flywheel in the bellhousing.',
    tips: ['No-start with no RPM on the scan tool: check this sensor first.', 'Rear-mounted ones on V8 trucks are reached from under the vehicle, above the starter.'],
    varies: 'Front cover, side of the block, or bellhousing.',
    spots: [
      { view: 'engine', x: 232, y: 206 },
      { view: 'under', x: 228, y: 80, label: 'At the flywheel (some)' },
    ],
    codes: ['P0335-P0339', 'P0315', 'P0016-P0019'],
  },
  {
    id: 'cam-sensor',
    name: 'Camshaft position sensor (CMP)',
    aka: ['CMP', 'cam sensor', 'phase sensor'],
    system: 'driveability',
    where: 'On the cylinder head or timing cover, at the end of a camshaft. Overhead-cam V engines can have one per cam (two or four).',
    tips: ['Bank 1 is the side with cylinder 1: see the engine layout.', 'Oil inside the connector means a leaking sensor seal.'],
    varies: 'Front or rear of the head; how many.',
    spots: [
      { view: 'engine', x: 128, y: 70 },
      { view: 'engine', x: 272, y: 70 },
    ],
    codes: ['P0340-P0349', 'P0365-P0369', 'P0390-P0394', 'P0016-P0019'],
  },
  {
    id: 'vvt-solenoid',
    name: 'Variable valve timing solenoids',
    aka: ['VVT solenoid', 'cam phaser solenoid', 'oil control valve', 'OCV', 'VCT solenoid'],
    system: 'engine',
    where: 'On the front of the cylinder heads or the timing cover, one per controlled camshaft.',
    tips: ['Low or dirty oil causes most cam-timing codes: check level and condition first.', 'Swap left and right solenoids to see if the code follows.'],
    varies: 'Count and position.',
    spots: [
      { view: 'engine', x: 116, y: 92 },
      { view: 'engine', x: 284, y: 92 },
    ],
    codes: ['P0010-P0028', 'P0011', 'P0021'],
  },
  {
    id: 'knock-sensor',
    name: 'Knock sensors',
    aka: ['KS', 'detonation sensor'],
    system: 'driveability',
    where: 'Bolted to the engine block: in the valley under the intake manifold on many V engines, or on the side of the block below the intake on inline engines.',
    tips: ['Valley-mounted sensors (many GM, Toyota and Nissan V engines) need the intake off.', 'Torque matters: an over- or under-tightened sensor reads wrong.'],
    varies: 'Valley or side of the block; one or two.',
    spots: [{ view: 'engine', x: 200, y: 104 }],
    codes: ['P0325-P0334'],
  },
  {
    id: 'ect',
    name: 'Coolant temperature sensor (ECT)',
    aka: ['ECT', 'engine coolant temperature', 'CHT'],
    system: 'cooling',
    where: 'In the thermostat housing, the coolant outlet, or a cylinder head near the front, threaded into a coolant passage.',
    tips: ['Compare it with IAT on a cold engine: they should agree.', 'Some engines have a second sensor for the gauge, or a cylinder-head temperature sensor (Ford CHT) instead.'],
    varies: 'Housing, head or block.',
    spots: [
      { view: 'engine', x: 222, y: 92 },
      { view: 'bay', x: 236, y: 92 },
    ],
    codes: ['P0115-P0119', 'P0125', 'P0128', 'P1299'],
  },
  {
    id: 'oil-pressure',
    name: 'Oil pressure sensor / switch',
    aka: ['oil pressure sending unit', 'oil pressure switch', 'EOP'],
    system: 'engine',
    where: 'Threaded into the block near the oil filter, on the oil filter housing, or at the back of the engine near the distributor area on older V8s.',
    tips: ['Verify a low-pressure warning with a mechanical gauge before condemning the engine.', 'Leaks from the switch drip onto the exhaust: a common smoke and smell complaint.'],
    varies: 'Front, side or back of the block.',
    spots: [{ view: 'engine', x: 300, y: 178 }],
    codes: ['P0520-P0524', 'P06DD', 'P06DE'],
  },
  {
    id: 'oil-filter',
    name: 'Oil filter, drain plug and fill',
    aka: ['oil filter housing', 'oil drain plug', 'dipstick'],
    system: 'maintenance',
    where: 'Spin-on filters sit low on the side or front of the block; cartridge filters are in a housing on top or front of the engine. The drain plug is at the low point of the oil pan; the fill cap is on a valve cover.',
    tips: ['Cartridge housings: replace the O-ring every time and tighten to spec.', 'Some engines have two drain plugs (pan and filter housing).'],
    varies: 'Top or bottom, spin-on or cartridge.',
    spots: [
      { view: 'engine', x: 316, y: 196 },
      { view: 'under', x: 200, y: 56, label: 'Drain plug' },
    ],
    codes: [],
  },
  {
    id: 'coils',
    name: 'Ignition coils and spark plugs',
    aka: ['coil-on-plug', 'COP', 'coil pack', 'spark plugs'],
    system: 'driveability',
    where: 'On top of the valve covers, one coil per cylinder on most engines since the 2000s. On transverse V6s the rear bank is under the intake plenum.',
    tips: ['Swap the coil to another cylinder: if the misfire follows it, it is the coil.', 'Rear-bank plugs on many transverse V6s need the upper intake off.'],
    varies: 'Coil-on-plug, coil packs, or plugs under the intake.',
    spots: [
      { view: 'engine', x: 96, y: 52 },
      { view: 'engine', x: 304, y: 52 },
      { view: 'bay', x: 168, y: 170 },
    ],
    codes: ['P0300-P0312', 'P0350-P0362', 'P2300-P2318'],
  },
  {
    id: 'pcv',
    name: 'PCV valve and breather hoses',
    aka: ['PCV', 'positive crankcase ventilation', 'oil separator'],
    system: 'emissions',
    where: 'In a valve cover or an oil separator on the block, piped to the intake manifold. Many newer engines build it into the valve cover.',
    tips: ['A whistle at idle or lean codes on both banks: check the PCV and its hoses for splits.', 'Built-in PCVs mean replacing the valve cover.'],
    varies: 'Valve cover, separator, or built in.',
    spots: [{ view: 'engine', x: 82, y: 66 }],
    codes: ['P0171', 'P0174', 'P052E', 'P2279'],
  },
  {
    id: 'egr',
    name: 'EGR valve and cooler',
    aka: ['EGR', 'exhaust gas recirculation'],
    system: 'emissions',
    where: 'On or near the intake manifold, piped from the exhaust manifold. Diesels add an EGR cooler along the engine.',
    tips: ['Carbon blocks the passages: clean them, not just the valve.', 'Many 2010s gas engines have no external EGR valve (cam timing does the job).'],
    varies: 'Front, rear or side of the intake; not fitted on many engines.',
    spots: [{ view: 'bay', x: 196, y: 196 }],
    codes: ['P0400-P0409', 'P0489-P0490', 'P2457'],
  },
  {
    id: 'turbo',
    name: 'Turbocharger and boost hoses',
    aka: ['turbo', 'wastegate', 'intercooler', 'charge air cooler'],
    system: 'driveability',
    where: 'On the exhaust manifold (some in the V of the engine). The intercooler is in front of the radiator or behind the bumper, joined by large boost hoses.',
    tips: ['Smoke-test the boost side for leaks: a split hose gives underboost codes.', 'EcoBoost V6s have one turbo per bank, low on each side.'],
    varies: 'One or two turbos; side, front or in the valley.',
    spots: [
      { view: 'engine', x: 70, y: 150 },
      { view: 'bay', x: 200, y: 22, label: 'Intercooler' },
    ],
    codes: ['P0234', 'P0299', 'P0045-P0050', 'P2261-P2263', 'P0236'],
  },

  // ---------------------------------------------------------------- cooling
  {
    id: 'thermostat',
    name: 'Thermostat',
    aka: ['thermostat housing', 'coolant outlet'],
    system: 'cooling',
    where: 'Where the upper radiator hose meets the engine (outlet style), or where the lower hose meets the engine (inlet style, common on newer GM and Toyota).',
    tips: ['Follow the upper hose from the radiator to the engine; if that end is just a fitting, follow the lower hose instead.', 'P0128 with a normal-reading ECT is almost always a thermostat stuck open.'],
    varies: 'Upper or lower hose end; some are in the water pump.',
    spots: [
      { view: 'engine', x: 200, y: 92 },
      { view: 'bay', x: 220, y: 84 },
    ],
    codes: ['P0125', 'P0128', 'P0597-P0599'],
  },
  {
    id: 'radiator',
    name: 'Radiator, fans and coolant reservoir',
    aka: ['cooling fan', 'fan relay', 'expansion tank', 'degas bottle', 'overflow'],
    system: 'cooling',
    where: 'Radiator and fans at the front of the engine bay behind the grille; the coolant reservoir on a fender or the firewall.',
    tips: ['Never open a hot pressurized cap: open the reservoir cap only on a cool engine.', 'Fan relays are in the under-hood fuse box or on the shroud.'],
    varies: 'Pressurized reservoir or radiator cap.',
    spots: [
      { view: 'bay', x: 200, y: 38 },
      { view: 'bay', x: 330, y: 150, label: 'Reservoir' },
    ],
    codes: ['P0480-P0485', 'P0217', 'P0691-P0694'],
  },
  {
    id: 'water-pump',
    name: 'Water pump',
    aka: ['coolant pump', 'electric water pump'],
    system: 'cooling',
    where: 'On the front of the engine, driven by the serpentine belt, or behind the timing cover driven by the timing belt or chain. Some newer engines use an electric pump.',
    tips: ['Weep hole drip or crusty coolant below the pump means a failing seal.', 'Timing-chain-driven pumps (Ford 3.5/3.7 transverse, some GM 3.6) leak into the oil: check for milky oil.'],
    varies: 'Belt, timing drive or electric.',
    spots: [{ view: 'engine', x: 200, y: 140 }],
    codes: ['P2681', 'P261A-P261D'],
  },
  {
    id: 'heater-core',
    name: 'Heater core',
    aka: ['heater hoses', 'HVAC box'],
    system: 'hvac',
    where: 'Inside the HVAC box behind the center of the dash; two heater hoses run to it through the firewall.',
    tips: ['Sweet smell or a foggy windshield with the heat on: suspect the core.', 'Feel both hoses at the firewall: both hot means flow; one cold means a blockage.'],
    varies: 'Some are reached from below the dash, many need the dash out.',
    spots: [
      { view: 'cabin', x: 236, y: 196 },
      { view: 'bay', x: 236, y: 236, label: 'Hoses at the firewall' },
    ],
    codes: [],
  },

  // ---------------------------------------------------------------- emissions and exhaust
  {
    id: 'o2-upstream',
    name: 'Upstream oxygen sensors (sensor 1)',
    aka: ['B1S1', 'B2S1', 'air-fuel ratio sensor', 'A/F sensor', 'wideband O2', 'front O2'],
    system: 'emissions',
    where: 'In the exhaust manifold or the pipe just after it, before the catalytic converter: one per bank.',
    tips: ['Sensor 1 is before the catalyst, sensor 2 after it. Bank 1 is the side with cylinder 1: see the engine layout.', 'Manifold-mounted sensors on transverse V6 rear banks come out from underneath.'],
    varies: 'In the manifold or the down pipe; one or two.',
    spots: [
      { view: 'under', x: 166, y: 108 },
      { view: 'under', x: 234, y: 108 },
    ],
    codes: ['P0130-P0135', 'P0150-P0155', 'P2195-P2198', 'P0171-P0175', 'P0030-P0032', 'P0050-P0052', 'P2A00', 'P2A03'],
  },
  {
    id: 'o2-downstream',
    name: 'Downstream oxygen sensors (sensor 2)',
    aka: ['B1S2', 'B2S2', 'rear O2', 'catalyst monitor sensor', 'post-cat O2'],
    system: 'emissions',
    where: 'In the exhaust pipe just after the catalytic converter, one per converter.',
    tips: ['Sensor 2 should switch slowly or hold steady: a copy of sensor 1 means a worn catalyst.'],
    varies: 'One or two; some vehicles have a sensor 3.',
    spots: [
      { view: 'under', x: 176, y: 150 },
      { view: 'under', x: 224, y: 150 },
    ],
    codes: ['P0136-P0141', 'P0156-P0161', 'P0036-P0038', 'P0056-P0058', 'P2270-P2273'],
  },
  {
    id: 'catalytic-converter',
    name: 'Catalytic converters',
    aka: ['cat', 'catalyst', 'TWC'],
    system: 'emissions',
    where: 'In the exhaust after the manifolds: built into the manifold, just under the engine (close-coupled), or further back under the floor.',
    tips: ['Rattle when tapped, or a glowing red shell, means internal damage.', 'Fix misfires before replacing a converter, or the new one will fail too.'],
    varies: 'One to four; manifold, close-coupled or underfloor.',
    spots: [
      { view: 'under', x: 182, y: 130 },
      { view: 'under', x: 218, y: 130 },
    ],
    codes: ['P0420-P0434'],
  },
  {
    id: 'evap-purge',
    name: 'EVAP purge valve',
    aka: ['purge solenoid', 'canister purge valve', 'CPV'],
    system: 'emissions',
    where: 'In the engine bay on the hose from the charcoal canister to the intake manifold, often on or near the intake or a strut tower.',
    tips: ['Stuck open: rough idle and hard starts after refueling. Apply vacuum: it should hold with no power.'],
    varies: 'Intake, firewall or strut tower.',
    spots: [{ view: 'bay', x: 128, y: 104 }],
    codes: ['P0441', 'P0443-P0449', 'P0455', 'P0456', 'P0496', 'P0497'],
  },
  {
    id: 'evap-canister',
    name: 'EVAP canister, vent valve and tank pressure sensor',
    aka: ['charcoal canister', 'vent solenoid', 'canister vent valve', 'FTP sensor', 'leak detection pump', 'ESIM', 'LDP'],
    system: 'emissions',
    where: 'Near the fuel tank: beside it, above the rear axle, or behind a rear wheel liner. The tank pressure sensor is on the tank, the pump module, or the canister.',
    tips: [
      'Vent valves clog with dirt and spiders: P0446/P0455 often start here.',
      'Check the gas cap seal first on any large-leak code.',
      'Smoke-test through the service port in the engine bay.',
    ],
    varies: 'Tank side, frame rail or behind a liner.',
    spots: [
      { view: 'under', x: 176, y: 226 },
      { view: 'under', x: 170, y: 166, label: 'Tank pressure sensor' },
    ],
    codes: ['P0440-P0469', 'P2400-P2422', 'P0497'],
  },
  {
    id: 'fuel-cap',
    name: 'Fuel cap or capless filler',
    aka: ['gas cap', 'filler neck', 'easy fuel'],
    system: 'emissions',
    where: 'Behind the fuel door on a rear quarter panel.',
    tips: ['Check the seal and click it until it ratchets; capless fillers can stick open from dirt.'],
    varies: 'Left or right side.',
    spots: [{ view: 'outside', x: 300, y: 112 }],
    codes: ['P0455', 'P0456', 'P0457', 'P0442'],
  },

  // ---------------------------------------------------------------- transmission and drivetrain
  {
    id: 'trans-range',
    name: 'Transmission range sensor',
    aka: ['TRS', 'neutral safety switch', 'PRNDL switch', 'MLPS', 'park/neutral position switch'],
    system: 'transmission',
    where: 'On the side of the transmission where the shift cable attaches, or inside it on newer transmissions.',
    tips: ['No-crank in park but cranks in neutral: adjust or replace this switch.'],
    varies: 'Outside on the shift shaft, or internal.',
    spots: [{ view: 'under', x: 222, y: 104 }],
    codes: ['P0705-P0709', 'P0850'],
  },
  {
    id: 'trans-speed',
    name: 'Transmission speed sensors',
    aka: ['input speed sensor', 'output speed sensor', 'ISS', 'OSS', 'VSS', 'turbine speed sensor'],
    system: 'transmission',
    where: 'In the transmission case: input near the bellhousing end, output near the tail or the differential. Some are internal.',
    tips: ['An erratic speedometer plus harsh shifts often points to the output sensor.'],
    varies: 'External or internal.',
    spots: [{ view: 'under', x: 200, y: 116 }],
    codes: ['P0715-P0722', 'P0500-P0503', 'P0791-P0794'],
  },
  {
    id: 'trans-fluid',
    name: 'Transmission fluid check and fill',
    aka: ['ATF dipstick', 'fill plug', 'check plug'],
    system: 'transmission',
    where: 'Older automatics: a dipstick at the back of the engine bay. Most newer ones are sealed: a check plug on the case or pan, filled at a set fluid temperature.',
    tips: ['Sealed units are checked level on a lift with the engine running and fluid at the specified temperature.'],
    varies: 'Dipstick or sealed.',
    spots: [
      { view: 'under', x: 186, y: 96 },
      { view: 'bay', x: 140, y: 214, label: 'Dipstick (older)' },
    ],
    codes: ['P0710-P0714', 'P0218'],
  },
  {
    id: 'transfer-case',
    name: 'Transfer case and its motor',
    aka: ['4WD motor', 'encoder motor', 'shift motor'],
    system: 'drivetrain',
    where: 'Behind the transmission on 4WD and many AWD trucks and SUVs; the shift motor is on the back or side of the case.',
    tips: ['Check the fluid and the motor connector for corrosion before replacing the motor.'],
    varies: 'Part-time, full-time or AWD.',
    spots: [{ view: 'under', x: 200, y: 160 }],
    codes: ['P1812-P1815', 'C0300-C0399'],
  },
  {
    id: 'differential',
    name: 'Differentials and axles',
    aka: ['rear diff', 'front diff', 'axle', 'CV axle', 'PTU', 'power transfer unit'],
    system: 'drivetrain',
    where: 'Rear-drive: the rear axle housing. Front-drive: inside the transaxle, with a CV axle to each front wheel. AWD crossovers add a power transfer unit (PTU) beside the transaxle.',
    tips: ['Torn CV boots throw grease across the inner wheel well.', 'PTU fluid is often forgotten: check it on AWD Fords and others.'],
    varies: 'Front, rear, PTU, or all three.',
    spots: [
      { view: 'under', x: 200, y: 236 },
      { view: 'under', x: 268, y: 80, label: 'PTU / front axle' },
    ],
    codes: [],
  },

  // ---------------------------------------------------------------- brakes, steering, chassis
  {
    id: 'brake-master',
    name: 'Brake master cylinder and booster',
    aka: ['master cylinder', 'brake fluid reservoir', 'vacuum booster', 'hydroboost'],
    system: 'brakes',
    where: 'On the driver-side firewall, in line with the brake pedal.',
    tips: ['A hiss at the pedal or a hard pedal: check the booster vacuum hose and check valve.', 'Hybrids and many newer cars use an electric brake booster unit.'],
    varies: 'Vacuum, hydraulic (Hydroboost) or electric booster.',
    spots: [{ view: 'bay', x: 92, y: 214 }],
    codes: ['C0550-C0560', 'P0556', 'P0557-P0559'],
  },
  {
    id: 'abs-module',
    name: 'ABS module and pump',
    aka: ['ABS', 'EBCM', 'hydraulic control unit', 'HCU', 'stability control'],
    system: 'brakes',
    where: 'In the engine bay on a fender or frame rail, with all the brake lines running into it — often near the master cylinder.',
    tips: ['Brake lines from the master cylinder lead straight to it.', 'Replacements often need a bleed with a scan tool cycling the pump.'],
    varies: 'Driver or passenger side, high or low.',
    spots: [{ view: 'bay', x: 70, y: 186 }],
    codes: ['C0010-C0099', 'C0110-C0165', 'U0121'],
  },
  {
    id: 'wheel-speed',
    name: 'Wheel speed sensors',
    aka: ['ABS sensor', 'WSS', 'tone ring'],
    system: 'brakes',
    where: 'At each wheel: in the knuckle or the hub bearing at the front, the knuckle or the axle housing at the rear (some rear-drive trucks have one in the differential).',
    tips: ['Compare all four speeds on a scan tool while driving: the odd one out is the problem.', 'Rust under the sensor or a cracked tone ring gives erratic readings.'],
    varies: 'In the hub, the knuckle, or the differential.',
    spots: [
      { view: 'under', x: 74, y: 52 },
      { view: 'under', x: 326, y: 52 },
      { view: 'under', x: 74, y: 220 },
      { view: 'under', x: 326, y: 220 },
    ],
    codes: ['C0035-C0060', 'C0221-C0236', 'C1095-C1145'],
  },
  {
    id: 'steering-angle',
    name: 'Steering angle sensor',
    aka: ['SAS', 'clockspring'],
    system: 'suspension',
    where: 'On the steering column behind the steering wheel, often part of the clockspring.',
    tips: ['Calibrate it after an alignment or column work, or stability control lights come on.'],
    varies: 'Column or steering gear.',
    spots: [{ view: 'cabin', x: 110, y: 196 }],
    codes: ['C0455-C0460', 'C0710', 'U0126'],
  },
  {
    id: 'tpms',
    name: 'Tire pressure sensors (TPMS)',
    aka: ['TPMS', 'tire pressure monitor'],
    system: 'suspension',
    where: 'Inside each wheel on the valve stem (direct systems); indirect systems use the wheel speed sensors and have none.',
    tips: ['Relearn the sensor positions after a rotation on systems that need it.', 'Dead sensor batteries are common past 7 to 10 years.'],
    varies: 'Direct or indirect; relearn method.',
    spots: [
      { view: 'outside', x: 96, y: 166 },
      { view: 'outside', x: 300, y: 166 },
    ],
    codes: ['C0750-C0775', 'C2400-C2499'],
  },

  // ---------------------------------------------------------------- HVAC and body
  {
    id: 'cabin-filter',
    name: 'Cabin air filter',
    aka: ['pollen filter', 'A/C filter'],
    system: 'maintenance',
    where: 'Behind the glovebox on most vehicles (lower or remove the glovebox), or under the cowl panel at the base of the windshield.',
    tips: ['Squeeze the glovebox sides or unhook its damper to let it drop.', 'Note the airflow arrow when fitting the new one.'],
    varies: 'Glovebox, cowl, or none fitted.',
    spots: [{ view: 'cabin', x: 312, y: 176 }],
    codes: [],
  },
  {
    id: 'blower-motor',
    name: 'Blower motor and resistor',
    aka: ['blower', 'fan resistor', 'blower motor control module'],
    system: 'hvac',
    where: 'Under the dash on the passenger side; the resistor or control module is beside it in the duct.',
    tips: ['Blower works only on high: the resistor has failed.', 'Lie in the passenger footwell and look up.'],
    varies: 'Passenger side on almost all.',
    spots: [{ view: 'cabin', x: 304, y: 216 }],
    codes: ['B1260-B1265'],
  },
  {
    id: 'blend-door',
    name: 'HVAC blend door actuators',
    aka: ['blend door', 'mode door actuator', 'temperature door'],
    system: 'hvac',
    where: 'On the sides of the HVAC box behind the center of the dash; reach them from the footwells after removing lower panels.',
    tips: ['A clicking behind the dash after key-on is a stripped actuator gear.', 'Run the HVAC calibration after replacing one.'],
    varies: 'Count and position.',
    spots: [{ view: 'cabin', x: 196, y: 210 }],
    codes: ['B0400-B0499', 'B10A0-B10AF'],
  },
  {
    id: 'ac-compressor',
    name: 'A/C compressor and pressure sensor',
    aka: ['compressor', 'A/C pressure transducer', 'low pressure switch'],
    system: 'hvac',
    where: 'Compressor on the front of the engine on the belt, usually low; the pressure sensor is on a refrigerant line (often the high-side line near the condenser).',
    tips: ['Check the pressure sensor reading against gauges before adding refrigerant.'],
    varies: 'High or low on the belt end.',
    spots: [
      { view: 'engine', x: 288, y: 150 },
      { view: 'bay', x: 296, y: 166 },
    ],
    codes: ['P0530-P0534', 'P0645-P0647', 'B1A10'],
  },
  {
    id: 'brake-switch',
    name: 'Brake light switch',
    aka: ['stop lamp switch', 'BPP sensor', 'brake pedal position'],
    system: 'electrical',
    where: 'On the bracket above the brake pedal arm, under the dash.',
    tips: ['Failure can block shifting out of park and disable cruise control.'],
    varies: 'Switch or position sensor.',
    spots: [{ view: 'cabin', x: 142, y: 232 }],
    codes: ['P0571-P0573', 'P0504', 'C0040'],
  },
  {
    id: 'srs-module',
    name: 'Airbag module (SRS)',
    aka: ['RCM', 'SDM', 'ACM', 'restraints control module', 'occupant classification'],
    system: 'safety',
    where: 'On the floor under the center console, between the front seats. Side impact sensors are in the doors or pillars.',
    tips: ['Disconnect the battery and wait as the service information says before touching any SRS part.', 'Seat-mounted occupant sensors are under the passenger seat cushion.'],
    varies: 'Under the console or the dash center.',
    spots: [{ view: 'cabin', x: 200, y: 246 }],
    codes: ['B0001-B0099', 'U0151'],
  },
  {
    id: 'adas-camera',
    name: 'Front camera and radar (driver assist)',
    aka: ['lane camera', 'ADAS camera', 'adaptive cruise radar', 'forward collision sensor'],
    system: 'safety',
    where: 'Camera behind the rear-view mirror at the top of the windshield; radar behind the front emblem or lower grille.',
    tips: ['Windshield replacement or a front-end hit means calibrating the camera and radar.', 'Check for dirt, ice or a misaligned bumper before diagnosing the sensor.'],
    varies: 'Camera, radar or both; radar behind emblem or bumper.',
    spots: [
      { view: 'cabin', x: 200, y: 30 },
      { view: 'outside', x: 26, y: 120, label: 'Radar' },
    ],
    codes: ['U0235', 'U0236', 'C1A00-C1AFF'],
  },
  {
    id: 'ambient-temp',
    name: 'Outside air temperature sensor',
    aka: ['ambient air temperature', 'AAT sensor'],
    system: 'hvac',
    where: 'Behind the grille or the front bumper, ahead of the radiator; some are in a side mirror.',
    tips: ['Reads high in traffic or on a hot engine: that is normal heat soak.'],
    varies: 'Grille, bumper or mirror.',
    spots: [{ view: 'outside', x: 34, y: 132 }],
    codes: ['P0070-P0074', 'B1200'],
  },
  {
    id: 'washer-reservoir',
    name: 'Washer fluid reservoir and pump',
    aka: ['washer bottle', 'washer pump'],
    system: 'body',
    where: 'Filler in the engine bay; the tank and pump often hide behind the front bumper or a fender liner.',
    tips: ['A pump that hums but sprays nothing: check for a frozen or kinked hose.'],
    varies: 'Fill neck location.',
    spots: [{ view: 'bay', x: 64, y: 118 }],
    codes: [],
  },
  {
    id: 'horn',
    name: 'Horn',
    aka: ['horn relay'],
    system: 'body',
    where: 'Behind the grille or front bumper; the relay is in the under-hood fuse box.',
    tips: [],
    varies: 'One or two horns.',
    spots: [{ view: 'outside', x: 30, y: 144 }],
    codes: [],
  },
];

/* ---------------------------------------------------------------- lookups */

const BY_ID = new Map(COMPONENT_LOCATIONS.map((c) => [c.id, c]));

export function componentById(id: string): ComponentLocation | null {
  return BY_ID.get(id) ?? null;
}

/** "P0335-P0339" covers P0335 to P0339; the codes compare as hex within the same letter. */
export function codeInPattern(code: string, pattern: string): boolean {
  const c = code.toUpperCase();
  const [lo, hi = lo] = pattern.toUpperCase().split('-');
  if (c[0] !== lo[0] || hi[0] !== lo[0]) return false;
  const n = parseInt(c.slice(1), 16);
  return n >= parseInt(lo.slice(1), 16) && n <= parseInt(hi.slice(1), 16);
}

/** The components a trouble code points at, most specific pattern first. */
export function componentsForCode(code: string): ComponentLocation[] {
  const width = (p: string) => {
    const [lo, hi = lo] = p.toUpperCase().split('-');
    return parseInt(hi.slice(1), 16) - parseInt(lo.slice(1), 16);
  };
  return COMPONENT_LOCATIONS.map((c) => {
    const hits = c.codes.filter((p) => codeInPattern(code, p));
    return { c, w: hits.length ? Math.min(...hits.map(width)) : Infinity };
  })
    .filter((x) => x.w !== Infinity)
    .sort((a, b) => a.w - b.w)
    .map((x) => x.c);
}

const fold = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Components whose name, other names, location or codes match every word typed. */
export function searchComponents(query: string): ComponentLocation[] {
  const words = fold(query).split(' ').filter(Boolean);
  if (!words.length) return COMPONENT_LOCATIONS;
  const code = query.trim().toUpperCase();
  const isCode = /^[PBCU][0-9A-F]{4}$/.test(code);
  if (isCode) return componentsForCode(code);
  return COMPONENT_LOCATIONS.filter((c) => {
    const hay = fold([c.name, ...c.aka, c.where].join(' '));
    return words.every((w) => hay.includes(w));
  });
}
