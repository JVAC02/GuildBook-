import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../web/core/quantity.js';
import '../web/core/prescription.js';
const { quantity, prescription } = globalThis.GuildBookCore;
const dip = JSON.parse(readFileSync(new URL('../web/data/medicines/dipirona.json', import.meta.url)));
const keto = JSON.parse(readFileSync(new URL('../web/data/medicines/cetoprofeno.json', import.meta.url)));
function create(medicine, id, days = '', population = 'adult') {
 const presentation = medicine.presentations.find(p => p.id === id);
 const regimen = presentation.regimens.find(r => r.population === population);
 const dose = regimen.dose;
 const plan = quantity.plan({ presentation, regimen, dose, days });
 return prescription.createItem({ medicine, presentation, regimen, dose, days, dispensing: quantity.select(plan, { kind: days ? 'suggested' : 'package', size: presentation.packageSizes[0] }) });
}
test('symptomatic instructions use registered reason and calculation period only', () => {
 const item = create(dip, 'dip-500', 5);
 assert.equal(item.instruction, 'TOMAR 1 CP DE 6/6H SE DOR OU FEBRE.');
 assert.equal(item.durationDays, 5);
 assert.equal(item.quantity, 30);
 const edited = prescription.updateItem(item, { days: 10, quantity: '' });
 assert.equal(edited.quantity, 60);
 assert.equal(edited.instruction, item.instruction);
 assert.match(prescription.format([item]), /DIPIRONA 500 MG -+ 30 CP/);
});
test('condition is driven by regimen metadata, never inferred from medicine name', () => {
 const p = { ...dip.presentations[0], regimens: undefined };
 const regimen = { ...dip.presentations[0].regimens[0], asNeededReason: 'outro sintoma', durationPurpose: 'quantity' };
 const item = prescription.createItem({ medicine: { id: 'synthetic', name: 'Synthetic' }, presentation: p, regimen, dose: regimen.dose, days: 5, dispensing: { quantity: 30, unit: 'comprimido', text: '30 CP', method: 'manual' } });
 assert.equal(item.instruction, 'TOMAR 1 CP DE 6/6H SE OUTRO SINTOMA.');
});
test('release and form remain in item metadata without polluting prescription name', () => {
 const item = create(keto, 'keto-150', 5);
 assert.match(item.label, /liberação prolongada/);
 assert.match(prescription.format([item]), /CETOPROFENO 150 MG -+ 10 CP/);
 assert.doesNotMatch(prescription.format([item]), /LIBERAÇÃO/);
 assert.equal(item.instruction, 'TOMAR 1 CP 1 VEZ AO DIA POR 5 DIAS.');
});
test('quantities have one abbreviated representation, preserving numeric values', () => {
 for (const [unit, expected] of [['comprimido','CP'],['cápsula','CAP'],['ampola','AMP'],['frasco-ampola','FA'],['frasco','FR'],['caixa','CX'],['bisnaga','TB'],['mL','mL']]) assert.equal(quantity.measure(1, unit), '1 ' + expected);
 assert.equal(quantity.packageText([{size:20,count:1},{size:30,count:1}], 'caixa', 'comprimido'), '50 CP');
 assert.equal(quantity.packageText([{size:30,count:1}], 'bisnaga', 'g'), '1 TB');
 assert.equal(quantity.packageText([{size:10,count:1},{size:20,count:1}], 'frasco', 'mL'), '30 mL');
});
