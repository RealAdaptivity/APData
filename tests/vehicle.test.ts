import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  engineRelation,
  isCompleteVehicle,
  matchVehicle,
  norm,
  sameModel,
  scopeFit,
  scopeLabel,
  vehicleKey,
} from '../src/lib/vehicle.ts';

const f150 = { year: '2016', make: 'Ford', model: 'F-150', engine: '3.5L V6 Turbo' };

test('make and model names compare the way techs type them', () => {
  assert.equal(norm('F-150'), norm('f150'));
  assert.equal(norm(' Mercedes-Benz '), 'mercedesbenz');
  assert.ok(sameModel('F-150', 'F150'));
  assert.ok(sameModel('Silverado', 'Silverado 1500'), 'a base name matches its suffixed variant');
  assert.ok(!sameModel('300', '3'), 'a one-letter stub does not match everything');
  assert.ok(!sameModel('Model 3', 'Model S'));
  assert.ok(!sameModel('', 'F-150'));
});

test('engines are the same when displacement and boost agree', () => {
  assert.equal(engineRelation('3.5L V6 Turbo', '3.5 EcoBoost'), 'same');
  assert.equal(engineRelation('3.5L V6 Turbo', '3.5L V6'), 'different', 'EcoBoost and Ti-VCT are different engines');
  assert.equal(engineRelation('5.3L V8', '6.2L V8'), 'different');
  assert.equal(engineRelation('6.7L V8 Diesel', '6.7L V8'), 'different');
  assert.equal(engineRelation('3.5L V6', null), 'unknown');
});

test('a record from the same model and year is an exact match', () => {
  const m = matchVehicle(f150, { model_year: 2016, make: 'FORD', model: 'F150', engine: '3.5L V6 Turbo' });
  assert.equal(m?.tier, 'exact');
  assert.equal(m?.label, 'This vehicle');
});

test('match tiers fall off with years, models and engines', () => {
  assert.equal(matchVehicle(f150, { model_year: 2017, make: 'Ford', model: 'F-150' })?.tier, 'near');
  assert.equal(matchVehicle(f150, { model_year: 2016, make: 'Ford', model: 'F-150', engine: '5.0L V8' })?.tier, 'near', 'same truck, other engine');
  assert.equal(matchVehicle(f150, { model_year: 2012, make: 'Ford', model: 'F-150' })?.tier, 'model');
  assert.equal(matchVehicle(f150, { model_year: 2005, make: 'Ford', model: 'F-150' })?.tier, 'make');
  assert.equal(matchVehicle(f150, { model_year: 2017, make: 'Ford', model: 'Explorer', engine: '3.5L EcoBoost' })?.tier, 'engine');
  assert.equal(matchVehicle(f150, { model_year: 2016, make: 'Ford', model: 'Focus', engine: '2.0L I4' })?.tier, 'make');
  assert.equal(matchVehicle(f150, { model_year: 2016, make: 'Chevrolet', model: 'Silverado' }), null, 'another make says nothing');
});

test('closer matches rank higher', () => {
  const exact = matchVehicle(f150, { model_year: 2016, make: 'Ford', model: 'F-150', engine: '3.5L V6 Turbo' })!;
  const near = matchVehicle(f150, { model_year: 2018, make: 'Ford', model: 'F-150' })!;
  const model = matchVehicle(f150, { model_year: 2020, make: 'Ford', model: 'F-150' })!;
  const make = matchVehicle(f150, { model_year: 2016, make: 'Ford', model: 'Mustang' })!;
  assert.ok(exact.rank > near.rank && near.rank > model.rank && model.rank > make.rank);
});

test('scoped records apply by make, model, years and engine', () => {
  assert.equal(scopeFit(f150, { make: null, model: null }), 0, 'a generic record applies to everything');
  assert.equal(scopeFit(f150, { make: 'Toyota', model: null }), null);
  assert.ok((scopeFit(f150, { make: 'Ford', model: 'F-150', year_from: 2015, year_to: 2017 }) ?? -1) > (scopeFit(f150, { make: 'Ford', model: null }) ?? -1));
  assert.equal(scopeFit(f150, { make: 'Ford', model: 'F-150', year_from: 2018, year_to: null }), null);
  assert.equal(scopeFit(f150, { make: 'Ford', model: 'F-150', engine: '5.0L V8' }), null);
  assert.equal(scopeFit(f150, { make: 'Ford', model: 'F-150', model_year: 2016 }), 4);
});

test('scope labels read naturally', () => {
  assert.equal(scopeLabel({ make: null, model: null }), 'All vehicles');
  assert.equal(scopeLabel({ make: 'Ford', model: 'F-150', year_from: 2015, year_to: 2020 }), '2015–2020 Ford F-150');
  assert.equal(scopeLabel({ make: 'Ford', model: null, year_from: 2015, year_to: null }), '2015+ Ford');
  assert.equal(scopeLabel({ make: 'Ram', model: '2500', model_year: 2019, engine: '6.7L Diesel' }), '2019 Ram 2500 6.7L Diesel');
});

test('vehicle keys ignore spelling differences, and a vehicle needs year make and model', () => {
  assert.equal(vehicleKey(f150), vehicleKey({ year: '2016', make: 'FORD', model: 'F150', engine: '3.5l v6 turbo' }));
  assert.ok(isCompleteVehicle(f150));
  assert.ok(!isCompleteVehicle({ year: '16', make: 'Ford', model: 'F-150' }));
  assert.ok(!isCompleteVehicle(null));
});
