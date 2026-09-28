import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../web/core/quantity.js';
import '../web/core/prescription.js';

const dip = JSON.parse(readFileSync(new URL('../web/data/medicines/dipirona.json', import.meta.url)));
const keto = JSON.parse(readFileSync(new URL('../web/data/medicines/cetoprofeno.json', import.meta.url)));
const { prescription, quantity } = globalThis.GuildBookCore;
const selection = (medicine, id) => {
  const presentation = medicine.presentations.find(item => item.id === id);
  return { medicine, presentation, regimen: presentation.regimens[0], dose: presentation.regimens[0].dose };
};

test('selected presentation and optional duration are captured without inventing quantity', () => {
  const item = prescription.createItem({ ...selection(dip, 'dip-1000'), days: null, quantity: null });
  assert.equal(item.presentationId, 'dip-1000');
  assert.equal(item.label, 'Dipirona 1 g — comprimido');
  assert.equal(item.durationDays, null);
  assert.equal(item.quantity, null);
  assert.match(item.instruction, /TOMAR 01 CP DE 6\/6H SE NECESSÁRIO\./);
  assert.match(prescription.format([item]), /DIPIRONA 1 G -+ QTDE A DEFINIR/);
});

test('calculated quantity is on the medication line and grouped by route', () => {
  const chosen = selection(keto, 'keto-100');
  const calculated = quantity.calculate({ units: 1, unit: 'comprimido', intervalHours: 12, days: 5, packSize: 20 });
  const oral = prescription.createItem({ ...chosen, days: 5, quantity: calculated });
  const topical = prescription.createItem({ ...selection(keto, 'keto-gel'), days: null, quantity: null });
  const text = prescription.format([oral, topical], 'Maria');
  assert.match(text, /PACIENTE: Maria/);
  assert.match(text, /USO ORAL\n\n1\. CETOPROFENO 100 MG -+ 10 CP/);
  assert.match(text, /TOMAR 01 CP DE 12\/12H POR 5 DIAS\./);
  assert.match(text, /USO TÓPICO/);
  assert.match(text, /CETOPROFENO 25 MG\/G -+ QTDE A DEFINIR/);
  assert.doesNotMatch(text, /— GEL/);
  assert.doesNotMatch(text, /Quantidade:/i);
});

test('prescription line omits dosage form while aligning quantities', () => {
  const dip500 = prescription.createItem({ ...selection(dip, 'dip-500'), mode: 'manual', manualQuantity: 20 });
  const keto100 = prescription.createItem({ ...selection(keto, 'keto-100'), days: 5, mode: 'manual', manualQuantity: 10 });
  const lines = prescription.format([dip500, keto100]).split('\n');
  const dipLine = lines.find(line => line.includes('DIPIRONA 500 MG'));
  const ketoLine = lines.find(line => line.includes('CETOPROFENO 100 MG'));
  assert.match(dipLine, /^1\. DIPIRONA 500 MG -+ 20 CP$/);
  assert.match(ketoLine, /^2\. CETOPROFENO 100 MG -+ 10 CP$/);
  assert.equal(dipLine.indexOf('20 CP'), ketoLine.indexOf('10 CP'));
  assert.equal(dip500.label, 'Dipirona 500 mg — comprimido');
  assert.equal(keto100.label, 'Cetoprofeno 100 mg — comprimido entérico');
  const extended = prescription.createItem({ ...selection(keto, 'keto-150'), days: 5, mode: 'manual', manualQuantity: 5 });
  assert.match(prescription.format([extended]), /CETOPROFENO 150 MG — LIBERAÇÃO PROLONGADA/);
});

test('adding the same regimen replaces it and a different presentation remains', () => {
  const a = prescription.createItem({ ...selection(dip, 'dip-500'), days: null });
  const b = prescription.createItem({ ...selection(dip, 'dip-1000'), days: null });
  const updated = prescription.createItem({ ...selection(dip, 'dip-500'), days: 5, manualQuantity: 20, mode: 'manual' });
  const list = prescription.upsert(prescription.upsert(prescription.upsert([], a), b), updated);
  assert.equal(list.length, 2);
  assert.equal(list[0].quantity, 20);
  assert.deepEqual(prescription.remove(list, a.key).map(item => item.key), [b.key]);
});

test('editing duration recalculates automatic quantity without changing dose', () => {
  const chosen = selection(keto, 'keto-50');
  const q = quantity.calculate({ units: 1, unit: 'cápsula', intervalHours: 8, days: 5, packSize: 24 });
  const item = prescription.createItem({ ...chosen, days: 5, quantity: q });
  const changed = prescription.updateItem(item, { days: 10, quantity: '' });
  assert.equal(changed.quantity, 30);
  assert.equal(changed.dose.units, 1);
  assert.match(changed.instruction, /POR 10 DIAS/);
});

test('empty manual field retains a safe automatic quantity', () => {
  const chosen = selection(keto, 'keto-100');
  const q = quantity.calculate({ units: 1, unit: 'comprimido', intervalHours: 12, days: 5, packSize: 20 });
  const item = prescription.createItem({ ...chosen, days: 5, quantity: q, mode: 'manual', manualQuantity: '' });
  assert.equal(item.quantity, 10);
  assert.equal(item.quantityMethod, 'automatic');
});

test('editing a closed-pack item does not silently switch to exact quantity', () => {
  const chosen = selection(keto, 'keto-50');
  const q = quantity.calculate({ units: 1, unit: 'cápsula', intervalHours: 8, days: 10, packSize: 24 });
  const item = prescription.createItem({ ...chosen, days: 10, quantity: q, mode: 'pack', packSize: 24 });
  const saved = prescription.updateItem(item, { days: 10, quantity: '' });
  assert.equal(saved.quantity, 48);
  assert.equal(saved.quantityMethod, 'pack');
});

test('simple prescription reserves patient, issuance date and manual identification', () => {
  const item = prescription.createItem({ ...selection(dip, 'dip-1000'), days: null });
  const text = prescription.format([item]);
  assert.match(text, /^RECEITUÁRIO SIMPLES\n/);
  assert.match(text, /PACIENTE: _+/);
  assert.match(text, /PRESCRIÇÃO:\n\nUSO ORAL/);
  assert.match(text, /DATA DE EMISSÃO: __\/__\/____/);
  assert.match(text, /ASSINATURA DO\(A\) MÉDICO\(A\)/);
  assert.match(text, /NOME E CRM\/UF/);
  assert.doesNotMatch(text, /VIA DIGITAL|ITI|CNES:/);
});

test('optional issuer details appear only when supplied and sections match copied text', () => {
  const item = prescription.createItem({ ...selection(keto, 'keto-100'), days: 5, manualQuantity: 10, mode: 'manual' });
  const details = { issuedAt: '2026-09-27', doctorName: 'Dra. Ana', crm: '12345', doctorUf: 'SP', serviceName: 'Clínica A', cnes: '9876', address: 'Rua A, 10', neighborhood: 'Centro', city: 'São Paulo', serviceUf: 'SP', phone: '11 9999-0000' };
  const sections = prescription.formatSections([item], 'Maria', details);
  const text = prescription.format([item], 'Maria', details);
  assert.equal(Object.values(sections).join(''), text);
  assert.match(text, /PACIENTE: Maria/);
  assert.match(text, /DATA DE EMISSÃO: 27\/09\/2026/);
  assert.match(text, /NOME DO\(A\) MÉDICO\(A\): Dra\. Ana\nCRM: 12345\s+UF: SP/);
  assert.doesNotMatch(text, /NOME E CRM\/UF: _+/);
  assert.match(text, /LOCAL DE ATENDIMENTO: Clínica A.*CNES: 9876/);
  assert.match(text, /ENDEREÇO: Rua A, 10.*BAIRRO: Centro/);
  assert.match(text, /CIDADE: São Paulo.*UF: SP.*TELEFONE: 11 9999-0000/);
  assert.doesNotMatch(prescription.format([item], 'Maria'), /Dra\. Ana|Clínica A|CNES:/);
});
