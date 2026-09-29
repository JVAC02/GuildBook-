import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClinicalIndex, validateClinicalIndex, buildClinicalIndex } from '../scripts/clinical-index.mjs';

const conditions = [
  { id: 'condicao-a', name: 'Condição A', aliases: ['CA', 'condicao alfa'] },
  { id: 'condicao-b', name: 'Condição B', aliases: ['CB'] },
];
const catalog = [
  { id: 'med-a', name: 'Medicamento A', file: 'med-a.json' },
  { id: 'med-b', name: 'Medicamento B', file: 'med-b.json' },
];
const relation = (conditionId, type = 'indication') => ({ conditionId, type, sourceIds: ['bula'] });
const medicines = [
  { id: 'med-a', sources: [{ id: 'bula' }], clinicalRelations: [relation('condicao-a'), relation('condicao-b', 'symptomatic')] },
  { id: 'med-b', sources: [{ id: 'bula' }], clinicalRelations: [relation('condicao-a', 'prophylaxis')] },
];
const calculators = [{ id: 'score-a', name: 'Score A', relatedConditions: ['condicao-a'], url: '#score-a' }];
const input = overrides => ({ conditions, catalog, medicines, calculators, ...overrides });

test('derived index supports many-to-many medicines and independent calculators', () => {
  const index = createClinicalIndex(input());
  assert.deepEqual(index.medicationsByCondition['condicao-a'], ['med-a', 'med-b']);
  assert.deepEqual(index.medicationsByCondition['condicao-b'], ['med-a']);
  assert.deepEqual(index.calculatorsByCondition['condicao-a'], ['score-a']);
  assert.deepEqual(index.calculatorsByCondition['condicao-b'], []);
  assert.equal('clinicalRelations' in calculators[0], false);
});

test('relation types remain distinct and all four initial types are accepted', () => {
  const rows = ['indication', 'symptomatic', 'prophylaxis', 'adjunct'].map(type => relation('condicao-a', type));
  const index = createClinicalIndex(input({ medicines: [{ ...medicines[0], clinicalRelations: rows }, medicines[1]] }));
  assert.deepEqual(index.medicationsByCondition['condicao-a'], ['med-a', 'med-b']);
  assert.deepEqual(rows.map(row => row.type), ['indication', 'symptomatic', 'prophylaxis', 'adjunct']);
});

test('new and removed relations change only the derived index', () => {
  const added = [...medicines, { id: 'med-c', sources: [{ id: 'bula' }], clinicalRelations: [relation('condicao-a')] }];
  const extended = [...catalog, { id: 'med-c', name: 'Medicamento C', file: 'med-c.json' }];
  assert.deepEqual(createClinicalIndex(input({ catalog: extended, medicines: added })).medicationsByCondition['condicao-a'], ['med-a', 'med-b', 'med-c']);
  const removed = [{ ...medicines[0], clinicalRelations: [relation('condicao-b', 'symptomatic')] }, medicines[1]];
  assert.deepEqual(createClinicalIndex(input({ medicines: removed })).medicationsByCondition['condicao-a'], ['med-b']);
});

const invalidCases = [
  ['unknown condition', { medicines: [{ ...medicines[0], clinicalRelations: [relation('absent')] }, medicines[1]] }, /conditionId.*absent/],
  ['duplicate condition id', { conditions: [...conditions, { id: 'condicao-a', name: 'Other', aliases: [] }] }, /duplicate condition id/i],
  ['duplicate alias across conditions', { conditions: [conditions[0], { ...conditions[1], aliases: ['CA'] }] }, /ambiguous alias/i],
  ['duplicate alias inside condition', { conditions: [{ ...conditions[0], aliases: ['CA', 'ca'] }, conditions[1]] }, /duplicate alias/i],
  ['duplicate relation', { medicines: [{ ...medicines[0], clinicalRelations: [relation('condicao-a'), relation('condicao-a')] }, medicines[1]] }, /duplicate relation/i],
  ['invalid relation type', { medicines: [{ ...medicines[0], clinicalRelations: [relation('condicao-a', 'first-line')] }, medicines[1]] }, /invalid relation type/i],
  ['missing source', { medicines: [{ ...medicines[0], clinicalRelations: [{ ...relation('condicao-a'), sourceIds: ['missing'] }] }, medicines[1]] }, /unknown sourceId/i],
  ['missing catalog medicine', { medicines: [medicines[0]] }, /missing medicine.*med-b/i],
  ['unknown calculator condition', { calculators: [{ ...calculators[0], relatedConditions: ['absent'] }] }, /calculator.*conditionId.*absent/i],
  ['duplicate calculator id', { calculators: [calculators[0], calculators[0]] }, /duplicate calculator id/i],
  ['calculator without navigation target', { calculators: [{ id: 'score-a', name: 'Score A', relatedConditions: ['condicao-a'] }] }, /requires a URL/i],
  ['legacy canonical conflict', { medicines: [{ ...medicines[0], indications: ['Condição A'] }, medicines[1]] }, /legacy indication.*canonical/i],
];
for (const [name, override, message] of invalidCases) {
  test(`validation detects ${name}`, () => assert.throws(() => createClinicalIndex(input(override)), message));
}

test('unmapped legacy text is preserved and reported without inventing a condition', () => {
  const legacy = { ...medicines[0], indications: ['Texto antigo sem correspondência'] };
  const index = createClinicalIndex(input({ medicines: [legacy, medicines[1]] }));
  assert.deepEqual(legacy.indications, ['Texto antigo sem correspondência']);
  assert.deepEqual(index.unresolvedLegacy, [{ medicationId: 'med-a', text: 'Texto antigo sem correspondência' }]);
});

test('derived index rejects references to missing medicines or calculators', () => {
  const index = createClinicalIndex(input());
  assert.throws(() => validateClinicalIndex({ ...index, medicationsByCondition: { ...index.medicationsByCondition, 'condicao-a': ['absent'] } }, catalog, calculators), /unknown medicationId/i);
  assert.throws(() => validateClinicalIndex({ ...index, calculatorsByCondition: { ...index.calculatorsByCondition, 'condicao-a': ['absent'] } }, catalog, calculators), /unknown calculatorId/i);
});

test('hundreds of medicines index from data without per-medicine branches', () => {
  const manyCatalog = Array.from({ length: 450 }, (_, i) => ({ id: `med-${i}`, name: `Medicamento ${i}`, file: `med-${i}.json` }));
  const manyMedicines = manyCatalog.map((row, i) => ({ id: row.id, sources: [{ id: 'bula' }], clinicalRelations: [relation(i % 2 ? 'condicao-a' : 'condicao-b')] }));
  const index = createClinicalIndex(input({ catalog: manyCatalog, medicines: manyMedicines }));
  assert.equal(index.medicationsByCondition['condicao-a'].length, 225);
  assert.equal(index.medicationsByCondition['condicao-b'].length, 225);
  assert.equal(JSON.stringify(index).includes('presentations'), false);
});

test('build writes a reusable light index and check detects stale output', async () => {
  const root = await mkdtemp(join(tmpdir(), 'guildbook-clinical-'));
  try {
    await cp(new URL('../web/', import.meta.url), join(root, 'web'), { recursive: true });
    const result = await buildClinicalIndex(root);
    assert.deepEqual(result.medicationsByCondition.dor, ['dipirona', 'cetoprofeno']);
    const path = join(root, 'web', 'data', 'clinical', 'index.json');
    const serialized = await readFile(path, 'utf8');
    assert.equal(serialized.includes('presentations'), false);
    await buildClinicalIndex(root, { check: true });
    await writeFile(path, '{}');
    await assert.rejects(() => buildClinicalIndex(root, { check: true }), /stale/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
