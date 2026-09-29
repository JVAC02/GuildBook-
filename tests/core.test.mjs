import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../web/core/quantity.js';
import '../web/core/pediatric.js';
import '../web/core/medication.js';
import '../web/core/prescription.js';

const root = new URL('../web/data/medicines/', import.meta.url);
const dip = JSON.parse(readFileSync(new URL('dipirona.json', root)));
const keto = JSON.parse(readFileSync(new URL('cetoprofeno.json', root)));
const { quantity, pediatric, medication, prescription } = globalThis.GuildBookCore;

test('only two unique medicines and separated presentations', () => {
  const catalog = [dip, keto];
  assert.deepEqual(catalog.map(item => item.id), ['dipirona', 'cetoprofeno']);
  assert.notEqual(medication.presentation(dip, 'dip-500').concentration, medication.presentation(dip, 'dip-1000').concentration);
  assert.notEqual(medication.presentation(dip, 'dip-500').regimens[0].dose.mg, medication.presentation(dip, 'dip-1000').regimens[0].dose.mg);
  assert.deepEqual(medication.populations(medication.presentation(keto, 'keto-im')), ['adult']);
  assert.deepEqual(medication.populations(medication.presentation(keto, 'keto-drops')), ['adult', 'pediatric']);
});

test('weight bands for dipirona do not become mg/kg arithmetic', () => {
  const regimen = medication.regimen(medication.presentation(dip, 'dip-drops'), 'pediatric');
  assert.deepEqual(pediatric.resolve(regimen, { weightKg: 12, ageMonths: 24 }), { units: 3, mg: 75, unit: 'gotas', range: [3, 10], volumeMl: 0.15 });
  assert.equal(pediatric.resolve(regimen, { weightKg: 12, ageMonths: 2 }), null);
});

test('cetoprofeno pediatric drops use confirmed drop relation and age rule', () => {
  const regimen = medication.regimen(medication.presentation(keto, 'keto-drops'), 'pediatric');
  assert.deepEqual(pediatric.resolve(regimen, { weightKg: 20, ageMonths: 60 }), { units: 20, mg: 20, unit: 'gotas', volumeMl: 1 });
  assert.deepEqual(pediatric.resolve(regimen, { weightKg: 30, ageMonths: 96 }), { units: 25, mg: 25, unit: 'gotas', volumeMl: 1.25 });
  assert.deepEqual(pediatric.resolve(regimen, { ageMonths: 96 }), { units: 25, mg: 25, unit: 'gotas', volumeMl: 1.25 });
  assert.equal(pediatric.resolve(regimen, { ageMonths: 60 }), null);
  assert.equal(pediatric.resolve(regimen, { weightKg: 10, ageMonths: 11 }), null);
});

test('pediatric presentations are selected by confirmed regimen, including solids', () => {
  const solid = { id: 'solid', form: 'comprimido dispersível', regimens: [{ population: 'pediatric', dose: { kind: 'fixed', units: 1, unit: 'comprimido', mg: 100, minAgeMonths: 72 } }] };
  const example = { presentations: [{ id: 'adult-only', form: 'solução', regimens: [{ population: 'adult' }] }, solid] };
  assert.deepEqual(medication.presentationsForPopulation(example, 'pediatric').map(item => item.id), ['solid']);
  assert.deepEqual(medication.presentationsForPopulation(example, 'pediatric', { ageMonths: 60 }).map(item => item.id), []);
  assert.deepEqual(medication.presentationsForPopulation(example, 'pediatric', { ageMonths: 96, weightKg: 18 }).map(item => item.id), ['solid']);
  assert.deepEqual(pediatric.resolve(solid.regimens[0], { ageMonths: 96 }), solid.regimens[0].dose);
  assert.deepEqual(pediatric.resolve({ population: 'pediatric', dose: { kind: 'fixed', units: 1, unit: 'comprimido', mg: 100 } }), { kind: 'fixed', units: 1, unit: 'comprimido', mg: 100 });
  assert.equal(pediatric.resolve(solid.regimens[0], { ageMonths: 60 }), null);
  assert.equal(medication.presentationsForPopulation(dip, 'pediatric', { ageMonths: 6, weightKg: 6 }).some(item => item.id === 'dip-iv'), false);
  assert.equal(medication.presentationsForPopulation(dip, 'pediatric', { ageMonths: 6, weightKg: 6 }).some(item => item.id === 'dip-im'), true);
});

test('duration calculates exact and closed pack quantities', () => {
  assert.deepEqual(quantity.calculate({ units: 1, unit: 'cápsula', intervalHours: 8, days: 10, packSize: 24 }), { required: 30, closedPack: 48, packs: 2, unit: 'cápsula' });
  assert.equal(quantity.calculate({ units: 1, unit: 'comprimido', intervalHours: 6, days: 0 }), null);
  assert.deepEqual(quantity.calculate({ units: 20, unit: 'gotas', unitsPerMl: 20, intervalHours: 6, days: 2, packSize: 10 }), { required: 8, closedPack: 10, packs: 1, unit: 'mL' });
});

test('as-needed instruction retains the selected regimen and duration', () => {
  const p = medication.presentation(dip, 'dip-500');
  const regimen = medication.regimen(p, 'adult');
  const q = quantity.calculate({ units: 1, unit: 'comprimido', intervalHours: 6, days: 5, packSize: 30 });
  const item = prescription.createItem({ medicine: dip, presentation: p, regimen, dose: regimen.dose, days: 5, quantity: q });
  assert.match(item.instruction, /DE 6\/6H POR 5 DIAS SE NECESSÁRIO\./);
  assert.equal(item.quantity, 20);
});

test('search ranks exact medicine ahead of aliases', () => {
  assert.equal(medication.search([keto, dip], 'dipirona')[0].id, 'dipirona');
  assert.equal(medication.search([dip, keto], 'cetoprofeno')[0].id, 'cetoprofeno');
});
