import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENT_LOCATIONS, codeInPattern, componentById, componentsForCode, searchComponents } from '../src/data/locations.ts';
import { SYSTEMS } from '../src/data/systems.ts';
import { bank1Words, cylinderMap, engineShape, familyFor, FAMILIES, firingOrder, guessOrientation } from '../src/data/engineLayouts.ts';

test('every component is complete and drawn inside its view', () => {
  const ids = new Set<string>();
  const systems = new Set(SYSTEMS.map((s) => s.id));
  for (const c of COMPONENT_LOCATIONS) {
    assert.ok(!ids.has(c.id), `duplicate id ${c.id}`);
    ids.add(c.id);
    assert.ok(systems.has(c.system), `${c.id} system`);
    assert.ok(c.where.length > 20 && c.varies.length > 3, `${c.id} text`);
    assert.ok(c.spots.length > 0, `${c.id} has a spot`);
    for (const s of c.spots) assert.ok(s.x > 0 && s.x < 400 && s.y > 0 && s.y < 262, `${c.id} spot ${s.x},${s.y}`);
    for (const p of c.codes) assert.match(p, /^[PBCU][0-9A-F]{4}(-[PBCU][0-9A-F]{4})?$/, `${c.id} code ${p}`);
  }
  assert.ok(COMPONENT_LOCATIONS.length >= 50);
});

test('code ranges', () => {
  assert.ok(codeInPattern('P0337', 'P0335-P0339'));
  assert.ok(!codeInPattern('P0340', 'P0335-P0339'));
  assert.ok(codeInPattern('P062F', 'P062F'));
  assert.ok(codeInPattern('C1A20', 'C1A00-C1AFF'), 'hex digits count');
  assert.ok(!codeInPattern('B0335', 'P0335-P0339'), 'the letter must match');
});

test('a code leads to the parts to look at, most specific first', () => {
  assert.equal(componentsForCode('P0335')[0].id, 'crank-sensor');
  assert.equal(componentsForCode('P0340')[0].id, 'cam-sensor');
  assert.equal(componentsForCode('P0420')[0].id, 'catalytic-converter');
  const evap = componentsForCode('P0455').map((c) => c.id);
  for (const id of ['fuel-cap', 'evap-purge', 'evap-canister']) assert.ok(evap.includes(id), `P0455 → ${id}`);
  assert.equal(componentsForCode('P0302')[0].id, 'fuel-injectors');
  assert.ok(componentsForCode('P0302').some((c) => c.id === 'coils'));
  assert.deepEqual(componentsForCode('P1234'), []);
});

test('search by name, other name or code', () => {
  assert.equal(searchComponents('crank')[0].id, 'crank-sensor');
  assert.ok(searchComponents('ckp').some((c) => c.id === 'crank-sensor'));
  assert.ok(searchComponents('obd port').some((c) => c.id === 'dlc'));
  assert.equal(searchComponents('p0335')[0].id, 'crank-sensor');
  assert.equal(searchComponents('').length, COMPONENT_LOCATIONS.length);
  assert.equal(componentById('nope'), null);
});

test('engine shape from the engine text', () => {
  assert.deepEqual(engineShape('3.5L Turbo V6'), { cylinders: 6, layout: 'v', liters: '3.5', diesel: false });
  assert.deepEqual(engineShape('2.0L Turbo 4-cyl'), { cylinders: 4, layout: 'inline', liters: '2.0', diesel: false });
  assert.deepEqual(engineShape('2.5L H4', 'Subaru'), { cylinders: 4, layout: 'flat', liters: '2.5', diesel: false });
  assert.equal(engineShape('2.5L 4-cyl', 'Subaru').layout, 'flat');
  assert.equal(engineShape('3.0L 6-cyl', 'BMW').layout, 'inline');
  assert.equal(engineShape('5.3L').cylinders, null);
  assert.equal(engineShape('6.7L V8 Diesel').diesel, true);
});

test('engine families and firing orders', () => {
  assert.equal(familyFor('Ford', '5.0L V8')?.id, 'ford-v8');
  assert.equal(firingOrder(FAMILIES['ford-v8'], '5.0L V8'), '1-5-4-8-6-3-7-2');
  assert.equal(firingOrder(FAMILIES['ford-v8'], '5.4L V8'), '1-3-7-2-6-5-4-8');
  assert.equal(familyFor('Ford', '3.5L Turbo V6')?.id, 'ford-v6');
  assert.equal(familyFor('Ford', '6.4L V8 Diesel'), null, 'Navistar-built diesels are numbered differently');
  assert.equal(familyFor('Ford', '6.7L V8 Diesel')?.id, 'ford-v8');
  assert.equal(familyFor('Chevrolet', '5.3L V8')?.id, 'gm-v8');
  assert.equal(firingOrder(FAMILIES['gm-v8'], '5.3L V8'), '1-8-7-2-6-5-4-3');
  assert.equal(familyFor('GMC', '4.3L V6')?.id, 'gm-43');
  assert.equal(familyFor('Chevrolet', '3.6L V6'), null, 'only families whose numbering is certain');
  assert.equal(familyFor('Ram', '5.7L V8')?.id, 'chrysler-v8');
  assert.equal(familyFor('Lexus', '3.5L V6')?.id, 'toyota-v');
  assert.equal(firingOrder(FAMILIES['toyota-v'], '5.7L V8'), '1-8-4-3-6-5-7-2');
  assert.equal(familyFor('Acura', '3.5L V6')?.id, 'honda-v6');
  assert.equal(familyFor('Nissan', '3.5L V6'), null);
  assert.equal(familyFor('Honda', '1.5L Turbo 4-cyl')?.id, 'inline');
  assert.equal(firingOrder(FAMILIES.inline, '1.5L Turbo 4-cyl'), '1-3-4-2');
  assert.equal(firingOrder(FAMILIES.inline, '3.0L I6'), '1-5-3-6-2-4');
  assert.equal(firingOrder(FAMILIES['subaru-flat'], '2.5L H4', 'Subaru'), '1-3-2-4');
});

test('cylinder numbering and bank 1', () => {
  const gm = cylinderMap(8, 'v', 'alternating');
  assert.deepEqual(gm.filter((c) => c.bank === 1).map((c) => c.n), [1, 3, 5, 7]);
  const ford = cylinderMap(8, 'v', 'sequential');
  assert.deepEqual(ford.filter((c) => c.bank === 1).map((c) => c.n), [1, 2, 3, 4]);
  assert.deepEqual(ford.find((c) => c.n === 5), { n: 5, bank: 2, index: 0 });
  assert.equal(cylinderMap(4, 'inline', 'sequential').every((c) => c.bank === 1), true);

  assert.equal(bank1Words(FAMILIES['ford-v6'], 'transverse'), 'Bank 1 is the rear bank (toward the firewall).');
  assert.equal(bank1Words(FAMILIES['ford-v8'], 'longitudinal'), 'Bank 1 is the passenger side.');
  assert.equal(bank1Words(FAMILIES['gm-v8'], 'longitudinal'), 'Bank 1 is the driver side.');
  assert.equal(bank1Words(null, 'transverse'), 'Bank 1 is the bank with cylinder 1.');
});

test('how the engine sits, first guess', () => {
  assert.equal(guessOrientation('Ford', 'F-150', 2016), 'longitudinal');
  assert.equal(guessOrientation('Ford', 'Explorer', 2015), 'transverse');
  assert.equal(guessOrientation('Ford', 'Explorer', 2021), 'longitudinal');
  assert.equal(guessOrientation('Ford', 'Transit Connect', 2016), 'transverse');
  assert.equal(guessOrientation('Ford', 'Transit', 2016), 'longitudinal');
  assert.equal(guessOrientation('Honda', 'Accord', 2018), 'transverse');
  assert.equal(guessOrientation('Chevrolet', 'Silverado', 2019), 'longitudinal');
  assert.equal(guessOrientation('BMW', 'X5', 2019), 'longitudinal');
});
