import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isVinShaped, normalizeVin, vinCheckDigitOk, vinRegion } from '../src/lib/vin.ts';
import { STORAGE_PATH_RULE, safeFileName, storagePath } from '../src/lib/fileNames.ts';
import { laborRateCentsForVehicle, vehicleLaborRateLabel } from '../src/lib/vehicleLaborRate.ts';
import { parseRoute } from '../src/lib/route.ts';

test('VINs are cleaned and checked', () => {
  assert.equal(normalizeVin(' 1ftew1eg5-gfa 00000 '), '1FTEW1EG5GFA00000');
  assert.ok(isVinShaped('1FTEW1EG5GFA00000'));
  assert.ok(!isVinShaped('1FTEW1EG5GFAO0000'), 'O is never used');
  assert.ok(vinCheckDigitOk('1M8GDM9AXKP042788'), 'the textbook check-digit example');
  assert.ok(!vinCheckDigitOk('1M8GDM9A1KP042788'));
  assert.equal(vinRegion('1FT'), 'North America');
  assert.equal(vinRegion('JHM'), 'Japan');
  assert.equal(vinRegion('WBA'), 'Europe');
  assert.equal(vinRegion('KMH'), 'South Korea');
});

test('uploaded file names always fit the database path rule', () => {
  const uid = '0b5d3c4e-1f2a-4b6c-8d9e-0a1b2c3d4e5f';
  for (const name of ['IMG 2041 (1).HEIC', 'Wiring diagram – rev B.PDF', '...', 'ñandú.jpg', 'a'.repeat(300) + '.png', 'noext']) {
    const path = storagePath(uid, name, 'abcd1234');
    assert.match(path, STORAGE_PATH_RULE, path);
  }
  assert.equal(safeFileName('IMG 2041 (1).HEIC'), 'img-2041-1.heic');
  assert.equal(safeFileName('...'), 'file');
});

test('estimates bill diesels and European makes at their own rate', () => {
  assert.equal(laborRateCentsForVehicle('2016 Ford F-150 3.5L V6 Turbo', 15000), 15000);
  assert.equal(laborRateCentsForVehicle('2019 Ram 2500 6.7L I6 Diesel', 15000), 20000);
  assert.equal(laborRateCentsForVehicle('2018 BMW 330i 2.0L I4 Turbo', 15000), 17500);
  assert.equal(vehicleLaborRateLabel('2018 Honda Civic'), null);
});

test('hash routes split into parts and a query', () => {
  const r = parseRoute('/fixes?codes=P0301,P0171&q=rough%20idle');
  assert.deepEqual(r.parts, ['fixes']);
  assert.equal(r.query.get('codes'), 'P0301,P0171');
  assert.equal(r.query.get('q'), 'rough idle');
  assert.deepEqual(parseRoute('/codes/P0300/').parts, ['codes', 'P0300']);
  assert.equal(parseRoute('/').path, '/');
  assert.deepEqual(parseRoute('/repair/a/compression-test').parts, ['repair', 'a', 'compression-test']);
});
