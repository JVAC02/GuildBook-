import test from 'node:test';
import assert from 'node:assert/strict';
import '../web/core/quantity.js';
import '../web/core/prescription.js';

const { quantity, prescription } = globalThis.GuildBookCore;
const liquid = { packageUnit: 'frasco', packageSizes: [10, 20], packageSizeUnit: 'mL', quantityPolicy: 'calculate' };
const solid = { packageUnit: 'caixa', packageSizes: [20, 30], packageSizeUnit: 'comprimido', quantityPolicy: 'calculate' };
const scheduled = hours => ({ intervalHours: hours, quantityKind: 'scheduled' });

test('liquid volume uses confirmed dose relation and smallest sufficient package', () => {
  const plan = quantity.plan({ presentation: liquid, regimen: scheduled(6), dose: { units: 7, unit: 'gotas', volumeMl: 0.35 }, days: 10 });
  assert.equal(plan.required, 14);
  assert.equal(plan.unit, 'mL');
  assert.deepEqual(plan.suggestion, [{ size: 20, count: 1 }]);
  assert.equal(quantity.select(plan, { kind: 'suggested' }).text, '1 frasco de 20 mL');
  assert.ok(quantity.select(plan, { kind: 'suggested' }).quantity >= plan.required);
});

test('solid treatment and multiple package combinations are data driven', () => {
  const plan = quantity.plan({ presentation: solid, regimen: scheduled(8), dose: { units: 1, unit: 'comprimido', mg: 500 }, days: 7 });
  assert.equal(plan.required, 21);
  assert.deepEqual(plan.suggestion, [{ size: 30, count: 1 }]);
  assert.equal(quantity.select(plan, { kind: 'suggested' }).text, '1 caixa de 30 comprimidos');
  const long = quantity.plan({ presentation: solid, regimen: scheduled(24), dose: { units: 5, unit: 'comprimido' }, days: 10 });
  assert.equal(long.required, 50);
  assert.deepEqual(long.suggestion, [{ size: 20, count: 1 }, { size: 30, count: 1 }]);
  assert.equal(quantity.select(long, { kind: 'suggested' }).quantity, 50);
});

test('without duration no package is selected until explicitly confirmed', () => {
  const plan = quantity.plan({ presentation: liquid, regimen: scheduled(6), dose: { units: 7, unit: 'gotas', volumeMl: 0.35 }, days: null });
  assert.equal(plan.required, null);
  assert.equal(plan.suggestion, null);
  assert.deepEqual(plan.options.map(option => option.size), [10, 20]);
  assert.equal(quantity.select(plan, { kind: 'suggested' }), null);
  assert.equal(quantity.select(plan, { kind: 'package', size: 20 }).text, '1 frasco de 20 mL');
  assert.equal(quantity.select(plan, { kind: 'manual', amount: 17 }).text, '17 mL');
});

test('plural package metadata retains singular quantity units for manual editing', () => {
  const plan = quantity.plan({ presentation: { ...solid, packageSizeUnit: 'comprimidos' }, regimen: scheduled(8), dose: { units: 1, unit: 'comprimido' }, days: null });
  assert.equal(plan.unit, 'comprimido');
  assert.deepEqual(plan.options.map(option => option.label), ['1 caixa de 20 comprimidos', '1 caixa de 30 comprimidos']);
  assert.equal(quantity.select(plan, { kind: 'manual', amount: 1 }).text, '1 comprimido');
});

test('as-needed regimen retains maximum-estimate semantics', () => {
  const plan = quantity.plan({ presentation: liquid, regimen: { intervalHours: 6, quantityKind: 'maximum' }, dose: { units: 7, unit: 'gotas', volumeMl: 0.35 }, days: 10 });
  assert.equal(plan.isMaximum, true);
  assert.equal(plan.required, 14);
});

test('variable quantity offers only confirmed packages or manual amount', () => {
  const gel = { packageUnit: 'bisnaga', packageSizeUnit: 'g', packageSizes: [30], quantityPolicy: 'manual' };
  const plan = quantity.plan({ presentation: gel, regimen: { quantityKind: 'variable' }, dose: { units: 0, unit: 'g' }, days: 7 });
  assert.equal(plan.required, null);
  assert.deepEqual(plan.options.map(option => option.label), ['1 bisnaga de 30 g']);
  assert.equal(quantity.select(plan, { kind: 'package', size: 30 }).text, '1 bisnaga de 30 g');
  assert.equal(quantity.select(plan, { kind: 'manual', amount: 45 }).text, '45 g');
});

test('unknown package metadata never creates a package choice', () => {
  const plan = quantity.plan({ presentation: { packageSizes: [], quantityPolicy: 'calculate' }, regimen: scheduled(12), dose: { units: 1, unit: 'comprimido' }, days: 5 });
  assert.deepEqual(plan.options, []);
  assert.equal(plan.required, 10);
  assert.equal(quantity.select(plan, { kind: 'suggested' }).text, '10 comprimidos');
  assert.equal(quantity.select(quantity.plan({ presentation: { packageSizes: [] }, regimen: scheduled(12), dose: { units: 1, unit: 'comprimido' }, days: null }), { kind: 'package', size: 1 }), null);
});

test('prescription requires a chosen quantity and prints the confirmed package', () => {
  const medicine = { id: 'new-medicine', name: 'Medicamento novo' };
  const presentation = { ...solid, id: 'new-solid', label: 'Medicamento novo 500 mg — comprimido', form: 'comprimido', concentration: '500 mg', route: 'oral', context: 'ambulatory' };
  const regimen = { id: 'adult', population: 'adult', dose: { kind: 'fixed', units: 1, unit: 'comprimido', mg: 500 }, intervalHours: 8, intervalText: 'a cada 8 horas', quantityKind: 'scheduled', durationKind: 'individual', verb: 'Tomar' };
  const plan = quantity.plan({ presentation, regimen, dose: regimen.dose, days: 7 });
  assert.equal(prescription.createItem({ medicine, presentation, regimen, dose: regimen.dose, days: null }), null);
  const item = prescription.createItem({ medicine, presentation, regimen, dose: regimen.dose, days: 7, dispensing: quantity.select(plan, { kind: 'suggested' }) });
  assert.equal(item.quantity, 30);
  assert.match(prescription.format([item]), /MEDICAMENTO NOVO 500 MG -+ 1 CAIXA DE 30 COMPRIMIDOS/);
  const changed = prescription.updateItem(item, { days: 10, quantity: '' });
  assert.equal(changed.quantity, 30);
  assert.equal(changed.quantityText, '1 caixa de 30 comprimidos');
  assert.equal(prescription.updateItem(item, { days: '', quantity: '' }), null);
  const manual = prescription.updateItem(item, { days: '', quantity: '40' });
  assert.equal(manual.quantityText, '40 comprimidos');
});
