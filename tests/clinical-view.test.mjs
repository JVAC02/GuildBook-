import test from 'node:test';
import assert from 'node:assert/strict';
import '../web/components/medication-card.js';
import '../web/components/clinical-condition.js';

const ui = globalThis.GuildBookUI;
const condition = { id: 'alpha', name: 'Condição A', aliases: ['CA'] };
const resources = { medications: [{ id: 'med-a', name: 'Medicamento A' }], calculators: [{ id: 'score-a', name: 'Score A', url: '#score-a' }] };

test('compact condition view shows related resources without prescription or editorial text', () => {
  const html = ui.clinicalCondition(condition, resources, () => false);
  assert.match(html, /Medicamentos relacionados/);
  assert.match(html, /Ferramentas relacionadas/);
  assert.match(html, /data-open="med-a"/);
  assert.match(html, /Score A/);
  assert.doesNotMatch(html, /Prescrever|Tratamento indicado|Fisiopatologia/);
});

test('empty resource sections do not render', () => {
  const html = ui.clinicalCondition(condition, { medications: [], calculators: [] }, () => false);
  assert.doesNotMatch(html, /Medicamentos relacionados|Ferramentas relacionadas/);
});

test('calculator search card links to the independent resource', () => {
  const html = ui.calculatorCard(resources.calculators[0]);
  assert.match(html, /href="#score-a"/);
  assert.match(html, /Score A/);
});
