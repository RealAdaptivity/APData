import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cylindersOf,
  engineOptionText,
  enginesFromEpa,
  epaBaseModel,
  epaDrive,
  epaItems,
  epaModelsFor,
  isFleetTrim,
  loadEngines,
  loadMakes,
  loadModels,
  loadTrims,
  modelsFromEpa,
  parseEngines,
  parseEpaOption,
  parseMakes,
  parseModels,
  parseTrims,
  refineEngines,
  vinCodeText,
  type GetJson,
  type MakeChoice,
  type ModelChoice,
} from '../src/lib/vehicleCatalog.ts';
import { NO_PICK, resolveStep, stepName, upstreamOf } from '../src/lib/pickerSteps.ts';

// Answers recorded from the live services (open.wenmarpro.com, fueleconomy.gov), trimmed.
const VPIC = 'https://open.wenmarpro.com/v1/vehicles';
const EPA = 'https://www.fueleconomy.gov/ws/rest/vehicle/menu';

const explorer2015Engines = [
  { id: '2-0l-turbo', label: '2.0L Turbo', vin8: '9', preset: false },
  { id: '3-5l-turbo-v6', label: '3.5L Turbo V6', vin8: 'T', preset: false },
  { id: '3-5l-v6', label: '3.5L V6', vin8: '8', preset: false },
  { id: '3-7l-v6', label: '3.7L V6', vin8: 'R', preset: false },
];

const explorer2015Trims = [
  { id: 'base', name: 'Base', kind: 'trim' },
  { id: 'king-ranch', name: 'King Ranch', kind: 'preset' },
  { id: 'limited', name: 'Limited', kind: 'trim' },
  { id: 'police', name: 'Police', kind: 'trim' },
  { id: 'sport', name: 'Sport', kind: 'trim' },
  { id: 'xlt', name: 'XLT', kind: 'trim' },
];

const ford2015Models = [
  { id: 'escape', name: 'Escape', year_from: 2001, year_to: 2027 },
  { id: 'explorer', name: 'Explorer', year_from: 1991, year_to: 2027 },
  { id: 'f-150', name: 'F-150', year_from: 1981, year_to: 2027 },
  { id: 'f-250', name: 'F-250', year_from: 1981, year_to: 2027 },
  { id: 'transit', name: 'Transit', year_from: 2015, year_to: 2027 },
  { id: 'transit-connect', name: 'Transit Connect', year_from: 2010, year_to: 2023 },
];

const epaFord2015 = {
  menuItem: [
    'Escape AWD', 'Escape FWD', 'Explorer 2WD FFV', 'Explorer AWD', 'Explorer AWD FFV', 'Explorer FWD',
    'F150 Pickup 2WD', 'F150 Pickup 4WD', 'Transit Connect Van 2WD', 'Transit Connect Wagon FWD', 'Transit T150 Wagon',
  ].map((m) => ({ text: m, value: m })),
};

const epaOptions: Record<string, unknown> = {
  'Explorer AWD': { menuItem: [{ text: 'Auto (S6), 6 cyl, 3.5 L', value: '35069' }, { text: 'Auto (S6), 6 cyl, 3.5 L, Turbo', value: '35070' }] },
  'Explorer FWD': { menuItem: [{ text: 'Auto (S6), 6 cyl, 3.5 L', value: '35062' }, { text: 'Auto 6-spd, 4 cyl, 2.0 L, Turbo', value: '35060' }] },
  // One option comes back as an object, not a one-item array.
  'Explorer AWD FFV': { menuItem: { text: 'Auto (S6), 6 cyl, 3.5 L', value: '35068' } },
  'Explorer 2WD FFV': { menuItem: { text: 'Auto (S6), 6 cyl, 3.5 L', value: '35067' } },
  'Transit T150 Wagon': { menuItem: { text: 'Auto (S6), 6 cyl, 3.5 L, Turbo', value: '35037' } },
};

const ford: MakeChoice = { id: 'ford', name: 'Ford', kind: 'light', source: 'vpic' };
const explorer: ModelChoice = { id: 'explorer', name: 'Explorer', source: 'vpic' };
const siblings = ford2015Models.map((m) => m.name);

/** A fake network: answers by URL, records what was asked, fails for anything unknown. */
function fakeGet(answers: Record<string, unknown>, failing: RegExp | null = null): GetJson & { asked: string[] } {
  const asked: string[] = [];
  const get = (async (url: string) => {
    asked.push(url);
    if (failing?.test(url)) throw new Error('Failed to fetch');
    if (!(url in answers)) throw new Error(`unexpected request ${url}`);
    return answers[url];
  }) as GetJson & { asked: string[] };
  get.asked = asked;
  return get;
}

function fordExplorerNetwork(extra: Record<string, unknown> = {}) {
  const answers: Record<string, unknown> = {
    [`${VPIC}/engines?make=ford&model=explorer&year=2015`]: explorer2015Engines,
    [`${VPIC}/engines?make=ford&model=explorer&year=2015&submodel=limited`]: explorer2015Engines,
    [`${VPIC}/engines?make=ford&model=explorer&year=2015&submodel=police`]: explorer2015Engines,
    [`${EPA}/model?year=2015&make=Ford`]: epaFord2015,
    ...extra,
  };
  for (const [model, options] of Object.entries(epaOptions)) {
    answers[`${EPA}/options?year=2015&make=Ford&model=${encodeURIComponent(model)}`] = options;
  }
  return answers;
}

test('catalog lists parse, dedupe and sort', () => {
  const makes = parseMakes([
    { id: 'toyota', name: 'Toyota', popular: true },
    { id: 'ford', name: 'Ford', popular: true },
    { id: 'blue-bird', name: 'Blue Bird', popular: false },
    { id: 'ford', name: 'Ford', popular: true },
    { id: 'x', name: '' },
    'junk',
  ]);
  assert.deepEqual(
    makes.map((m) => m.name),
    ['Blue Bird', 'Ford', 'Toyota']
  );
  assert.equal(makes[1].kind, 'light');
  assert.equal(makes[0].kind, 'other');

  assert.deepEqual(
    parseModels(ford2015Models).map((m) => m.id),
    ['escape', 'explorer', 'f-150', 'f-250', 'transit', 'transit-connect']
  );
  assert.deepEqual(parseModels({ error: 'nope' }), [], 'an error body is an empty list, not a crash');

  const trims = parseTrims(explorer2015Trims);
  assert.equal(trims.find((t) => t.id === 'king-ranch')?.kind, 'preset');
  assert.equal(trims.find((t) => t.id === 'sport')?.kind, 'trim');

  const engines = parseEngines(explorer2015Engines);
  assert.deepEqual(
    engines.map((e) => e.name),
    ['2.0L Turbo', '3.5L Turbo V6', '3.5L V6', '3.7L V6']
  );
  assert.equal(engines[1].vinCode, 'T');
  assert.equal(engines[1].cylinders, 6);
  assert.equal(engines[0].cylinders, undefined);
});

test('cylinder counts read the usual ways engines are written', () => {
  assert.equal(cylindersOf('3.5L V6'), 6);
  assert.equal(cylindersOf('2.0L I4'), 4);
  assert.equal(cylindersOf('2.5L H4'), 4);
  assert.equal(cylindersOf('5.7L 8-cyl'), 8);
  assert.equal(cylindersOf('6.7L V8 Diesel'), 8);
  assert.equal(cylindersOf('2.0L Turbo'), null, 'the L of "2.0L" is not a cylinder layout');
  assert.equal(cylindersOf('Electric'), null);
});

test('EPA menus and options parse, including the one-item object form', () => {
  assert.equal(epaItems(epaOptions['Explorer AWD FFV']).length, 1);
  assert.equal(epaItems(epaOptions['Explorer AWD']).length, 2);
  assert.deepEqual(epaItems({}), []);
  assert.deepEqual(epaItems(null), []);

  assert.deepEqual(parseEpaOption('Auto (S6), 6 cyl, 3.5 L, Turbo'), { liters: '3.5', cylinders: 6, boost: 'Turbo' });
  assert.deepEqual(parseEpaOption('Man 6-spd, 4 cyl, 2.0 L'), { liters: '2.0', cylinders: 4, boost: null });
  assert.deepEqual(parseEpaOption('Auto (A1)'), { liters: null, cylinders: null, boost: null });

  assert.equal(epaDrive('Explorer AWD FFV'), 'AWD');
  assert.equal(epaDrive('Silverado K10 4WD TrailBoss'), '4WD');
  assert.equal(epaDrive('Mustang'), null);
  assert.equal(epaBaseModel('Explorer 2WD FFV'), 'Explorer');
  assert.equal(epaBaseModel('Colorado Cab Chassis 2WD'), 'Colorado');
});

test('EPA model names belong to the right catalog model', () => {
  const epaNames = epaItems(epaFord2015).map((i) => i.value);
  assert.deepEqual(epaModelsFor('Explorer', siblings, epaNames), ['Explorer 2WD FFV', 'Explorer AWD', 'Explorer AWD FFV', 'Explorer FWD']);
  assert.deepEqual(epaModelsFor('F-150', siblings, epaNames), ['F150 Pickup 2WD', 'F150 Pickup 4WD'], '"F-150" and "F150" are the same truck');
  assert.deepEqual(epaModelsFor('Transit', siblings, epaNames), ['Transit T150 Wagon'], 'the Transit Connect is its own model');
  assert.deepEqual(epaModelsFor('Transit Connect', siblings, epaNames), ['Transit Connect Van 2WD', 'Transit Connect Wagon FWD']);
  assert.deepEqual(epaModelsFor('F-250', siblings, epaNames), [], 'heavy-duty trucks are not in EPA’s list');

  const models = modelsFromEpa(epaNames);
  const exp = models.find((m) => m.name === 'Explorer');
  assert.equal(exp?.source, 'epa');
  assert.deepEqual(exp?.epa, ['Explorer 2WD FFV', 'Explorer AWD', 'Explorer AWD FFV', 'Explorer FWD']);
  assert.ok(models.some((m) => m.name === 'F150 Pickup'));
});

test('2015 Explorer: EPA drops the police-only 3.7L and says which drive each engine came with', () => {
  const epa = Object.entries(epaOptions)
    .filter(([m]) => m.startsWith('Explorer'))
    .map(([model, json]) => ({ model, options: epaItems(json).map((i) => i.text) }));
  const { engines, checked } = refineEngines(parseEngines(explorer2015Engines), epa);
  assert.equal(checked, true);
  assert.deepEqual(
    engines.map((e) => e.name),
    ['2.0L Turbo 4-cyl', '3.5L Turbo V6', '3.5L V6']
  );
  const byName = Object.fromEntries(engines.map((e) => [e.name, e]));
  assert.equal(byName['2.0L Turbo 4-cyl'].driveNote, 'FWD only');
  assert.equal(byName['3.5L Turbo V6'].driveNote, 'AWD only');
  assert.equal(byName['3.5L V6'].driveNote, undefined, 'sold with every drive');
  assert.equal(byName['3.5L Turbo V6'].vinCode, 'T', 'the VIN code survives');
  assert.equal(engineOptionText(byName['3.5L Turbo V6']), '3.5L Turbo V6 · VIN 8th: T · AWD only');
});

test('EPA data that confirms nothing leaves the NHTSA list alone', () => {
  const vpic = parseEngines([
    { id: '6-2l-v8', label: '6.2L V8', vin8: '6' },
    { id: '6-7l-v8-diesel', label: '6.7L V8 Diesel', vin8: 'T' },
  ]);
  assert.deepEqual(refineEngines(vpic, []), { engines: vpic, checked: false });
  const unrelated = [{ model: 'Something', options: ['Auto (S6), 4 cyl, 1.5 L, Turbo'] }];
  assert.deepEqual(refineEngines(vpic, unrelated), { engines: vpic, checked: false });

  const ev = parseEngines([{ id: 'electric', label: 'Electric' }]);
  assert.equal(refineEngines(ev, [{ model: 'Model 3', options: ['Auto (A1)'] }]).engines.length, 1, 'an engine EPA cannot judge stays');
});

test('engines can come from EPA alone', () => {
  const engines = enginesFromEpa([
    { model: 'Explorer AWD', options: ['Auto (S6), 6 cyl, 3.5 L', 'Auto (S6), 6 cyl, 3.5 L, Turbo'] },
    { model: 'Explorer FWD', options: ['Auto (S6), 6 cyl, 3.5 L', 'Auto 6-spd, 4 cyl, 2.0 L, Turbo', 'Man 6-spd, 4 cyl, 2.0 L, Turbo'] },
  ]);
  assert.deepEqual(
    engines.map((e) => `${e.name}|${e.driveNote ?? ''}`),
    ['2.0L 4-cyl Turbo|FWD only', '3.5L 6-cyl|', '3.5L 6-cyl Turbo|AWD only']
  );
});

test('fleet trims and VIN codes', () => {
  assert.ok(isFleetTrim('Police'));
  assert.ok(isFleetTrim('Police Interceptor Utility'));
  assert.ok(isFleetTrim('PPV'));
  assert.ok(!isFleetTrim('Limited'));
  assert.ok(!isFleetTrim(null));
  assert.equal(vinCodeText('DF'), 'D / F');
  assert.equal(vinCodeText('T'), 'T');
  assert.equal(vinCodeText(undefined), '');
});

test('loadEngines: Explorer Limited gets the EPA-checked list', async () => {
  const get = fakeGet(fordExplorerNetwork());
  const { engines, checked } = await loadEngines('2015', ford, explorer, { id: 'limited', name: 'Limited', kind: 'trim' }, siblings, get);
  assert.equal(checked, true);
  assert.ok(!engines.some((e) => e.name.startsWith('3.7')));
  assert.ok(get.asked.includes(`${VPIC}/engines?make=ford&model=explorer&year=2015&submodel=limited`), 'asks for the trim’s engines');
  assert.ok(get.asked.includes(`${EPA}/options?year=2015&make=Ford&model=Explorer%20AWD`));
  assert.ok(!get.asked.some((u) => u.includes('Transit')), 'never asks EPA about other models');
});

test('loadEngines: a police trim keeps the police engine', async () => {
  const get = fakeGet(fordExplorerNetwork());
  const { engines, checked } = await loadEngines('2015', ford, explorer, { id: 'police', name: 'Police', kind: 'trim' }, siblings, get);
  assert.equal(checked, false);
  assert.ok(engines.some((e) => e.name === '3.7L V6'));
  assert.ok(!get.asked.some((u) => u.startsWith(EPA)), 'EPA has no police vehicles to check against');
});

test('loadEngines: a trim with no engines of its own falls back to the model’s', async () => {
  const get = fakeGet(fordExplorerNetwork({ [`${VPIC}/engines?make=ford&model=explorer&year=2015&submodel=king-ranch`]: [] }));
  const { engines } = await loadEngines('2015', ford, explorer, { id: 'king-ranch', name: 'King Ranch', kind: 'preset' }, siblings, get);
  assert.equal(engines.length, 3);
});

test('loadEngines: EPA down → the NHTSA list; NHTSA down → EPA’s list; both down → an error', async () => {
  const epaDown = await loadEngines('2015', ford, explorer, null, siblings, fakeGet(fordExplorerNetwork(), /fueleconomy/));
  assert.equal(epaDown.checked, false);
  assert.equal(epaDown.engines.length, 4);

  const vpicDown = await loadEngines('2015', ford, explorer, null, siblings, fakeGet(fordExplorerNetwork(), /wenmarpro/));
  assert.equal(vpicDown.checked, true);
  assert.deepEqual(
    vpicDown.engines.map((e) => e.name),
    ['2.0L 4-cyl Turbo', '3.5L 6-cyl', '3.5L 6-cyl Turbo']
  );

  await assert.rejects(loadEngines('2015', ford, explorer, null, siblings, fakeGet({}, /./)), /engine list/);
});

test('the make list is road-legal brands for the year only', async () => {
  const vpic2015 = [
    { id: 'ford', name: 'Ford', popular: true },
    { id: 'toyota', name: 'Toyota', popular: true },
    { id: 'blue-bird', name: 'Blue Bird', popular: false },
    { id: 'c-r-cheetah-race-cars', name: 'C-R CHEETAH RACE CARS', popular: false },
    { id: 'atlanta-fabricating-equipment-co', name: 'Atlanta Fabricating & Equipment Co', popular: false },
    { id: 'mclaren', name: 'McLaren', popular: false },
    { id: 'freightliner', name: 'Freightliner', popular: false },
    { id: 'volvo', name: 'Volvo', popular: true },
    { id: 'volvo-truck', name: 'Volvo Truck', popular: false },
  ];
  const makes = await loadMakes('2015', fakeGet({ [`${VPIC}/makes?year=2015`]: vpic2015 }));
  const names = makes.map((m) => m.name);
  for (const junk of ['Blue Bird', 'C-R CHEETAH RACE CARS', 'Atlanta Fabricating & Equipment Co']) assert.ok(!names.includes(junk), `${junk} is not a road vehicle brand`);
  for (const gone of ['Pontiac', 'Saturn', 'Hummer', 'Rivian']) assert.ok(!names.includes(gone), `${gone} sold nothing for 2015`);

  const by = Object.fromEntries(makes.map((m) => [m.name, m]));
  assert.deepEqual(by.Ford, { id: 'ford', name: 'Ford', kind: 'light', source: 'vpic' });
  assert.deepEqual(by.McLaren, { id: 'mclaren', name: 'McLaren', kind: 'light', source: 'vpic', epa: 'McLaren Automotive' });
  assert.deepEqual(by.Scion, { id: 'Scion', name: 'Scion', kind: 'light', source: 'epa' }, 'a brand NHTSA files under another make comes from EPA');
  assert.equal(by['Volvo Trucks'].id, 'volvo-truck', 'Volvo cars and Volvo trucks stay apart');
  assert.equal(by.Volvo.id, 'volvo');
  assert.equal(by.Freightliner.kind, 'truck');
  assert.equal(by.Kenworth.source, 'vpic', 'a truck brand NHTSA lacks that year still shows');

  // 2003: the Isuzu name holds both the Rodeo and the NPR, once.
  const m2003 = await loadMakes('2003', fakeGet({ [`${VPIC}/makes?year=2003`]: [{ id: 'isuzu', name: 'Isuzu' }] }));
  assert.equal(m2003.filter((m) => m.id === 'isuzu').length, 1);
  assert.ok(m2003.some((m) => m.name === 'Pontiac'));

  // Outside 2000–2026 the catalog answers as is.
  const m1995 = await loadMakes('1995', fakeGet({ [`${VPIC}/makes?year=1995`]: vpic2015 }));
  assert.equal(m1995.length, vpic2015.length);
});

test('makes, models and trims fall back to EPA when NHTSA’s catalog is down', async () => {
  const answers = {
    [`${EPA}/model?year=2015&make=Ford`]: epaFord2015,
  };
  const get = fakeGet(answers, /wenmarpro/);
  const makes = await loadMakes('2015', get);
  const fordEpa = makes.find((m) => m.name === 'Ford')!;
  assert.deepEqual(fordEpa, { id: 'Ford', name: 'Ford', kind: 'light', source: 'epa' }, 'the brand table answers without the network');
  const models = await loadModels('2015', fordEpa, get);
  const exp = models.find((m) => m.name === 'Explorer')!;
  assert.equal(exp.source, 'epa');
  assert.deepEqual(await loadTrims('2015', fordEpa, exp, get), [], 'EPA has no trims');

  const engines = await loadEngines('2015', fordEpa, exp, null, [], fakeGet(fordExplorerNetwork()));
  assert.equal(engines.checked, true);
  assert.equal(engines.engines.length, 3);
});

test('EPA is asked with its own spelling of the make', async () => {
  const mclaren: MakeChoice = { id: 'mclaren', name: 'McLaren', kind: 'light', source: 'vpic', epa: 'McLaren Automotive' };
  const get = fakeGet({ [`${EPA}/model?year=2015&make=McLaren%20Automotive`]: { menuItem: { text: '650S Coupe', value: '650S Coupe' } } }, /wenmarpro/);
  const models = await loadModels('2015', mclaren, get);
  assert.deepEqual(
    models.map((m) => m.name),
    ['650S Coupe']
  );
});

test('picker steps: list, loading, typed and remembered values', () => {
  const items = [
    { id: 'explorer', name: 'Explorer' },
    { id: 'f-150', name: 'F-150' },
  ];
  const loaded = { data: items, error: null, loading: false };

  assert.deepEqual(resolveStep(NO_PICK, loaded, 'off'), { kind: 'off' });
  assert.deepEqual(resolveStep(NO_PICK, { data: undefined, error: null, loading: true }, 'list'), { kind: 'loading' });
  assert.deepEqual(resolveStep({ name: 'Explorer', manual: false }, loaded, 'text'), { kind: 'text', text: 'Explorer', why: 'upstream' });
  assert.deepEqual(resolveStep({ name: 'Bronco', manual: true }, loaded, 'list'), { kind: 'text', text: 'Bronco', why: 'chosen' });
  assert.deepEqual(resolveStep(NO_PICK, { data: undefined, error: 'No connection', loading: false }, 'list'), { kind: 'text', text: '', why: 'error' });
  assert.deepEqual(resolveStep(NO_PICK, { data: [], error: null, loading: false }, 'list'), { kind: 'text', text: '', why: 'empty' });

  const byId = resolveStep({ id: 'f-150', name: 'F-150', manual: false }, loaded, 'list');
  assert.equal(byId.kind === 'list' && byId.value?.id, 'f-150');
  const remembered = resolveStep({ name: 'f150', manual: false }, loaded, 'list');
  assert.equal(remembered.kind === 'list' && remembered.value?.id, 'f-150', 'a remembered name finds its list entry');
  assert.deepEqual(resolveStep({ name: 'Bronco', manual: false }, loaded, 'list'), { kind: 'text', text: 'Bronco', why: 'unlisted' });
  const gone = resolveStep({ id: 'bronco', name: 'Bronco', manual: false }, loaded, 'list');
  assert.deepEqual(gone, { kind: 'list', items, value: null }, 'a list choice missing from a new year’s list clears');

  const single = { data: [items[0]], error: null, loading: false };
  const auto = resolveStep(NO_PICK, single, 'list', { autoSingle: true });
  assert.equal(auto.kind === 'list' && auto.value?.id, 'explorer', 'the only engine is chosen');
  const declined = resolveStep({ ...NO_PICK, touched: true }, single, 'list', { autoSingle: true });
  assert.equal(declined.kind === 'list' && declined.value, null, '…unless the tech chose “not sure”');

  assert.equal(upstreamOf(byId), 'list');
  assert.equal(upstreamOf({ kind: 'list', items, value: null }), 'off');
  assert.equal(upstreamOf({ kind: 'text', text: ' ', why: 'chosen' }), 'off');
  assert.equal(upstreamOf({ kind: 'text', text: 'Bronco', why: 'chosen' }), 'text');
  assert.equal(stepName({ kind: 'text', text: ' Bronco ', why: 'chosen' }), 'Bronco');
  assert.equal(stepName(byId), 'F-150');
});
