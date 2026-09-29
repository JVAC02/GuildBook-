import test from 'node:test';
import assert from 'node:assert/strict';
import '../web/core/clinical-association.js';

const clinical = globalThis.GuildBookCore.clinicalAssociation;
const conditions = [
  { id: 'alpha', name: 'Síndrome Álfa', aliases: ['SA', 'estado alfa'] },
  { id: 'beta', name: 'Condição Beta', aliases: ['CB'] },
];

test('condition search resolves case, accents, spaces, explicit aliases and acronyms', () => {
  for (const query of ['SÍNDROME ÁLFA', 'sindrome alfa', '  síndrome   álfa ', 'SA', 'estado alfa']) {
    assert.deepEqual(clinical.searchConditions(conditions, query).map(row => row.id), ['alpha']);
  }
});

test('ambiguous alias yields all candidates without selecting one', () => {
  const shared = [{ ...conditions[0], aliases: ['SIG'] }, { ...conditions[1], aliases: ['sig'] }];
  assert.deepEqual(clinical.searchConditions(shared, 'SIG').map(row => row.id).sort(), ['alpha', 'beta']);
  assert.equal(clinical.resolveCondition(shared, 'SIG'), null);
});

test('search does not use aggressive fuzzy matching', () => {
  assert.deepEqual(clinical.searchConditions(conditions, 'sindrom alfra'), []);
  assert.deepEqual(clinical.searchConditions(conditions, 'sindrome').map(row => row.id), ['alpha']);
});

test('resources are resolved from lightweight IDs and catalog metadata', () => {
  const index = { medicationsByCondition: { alpha: ['med-a', 'med-b'] }, calculatorsByCondition: { alpha: ['score-a'] } };
  const catalog = [{ id: 'med-a', name: 'A' }, { id: 'med-b', name: 'B' }];
  const calculators = [{ id: 'score-a', name: 'Score A', url: '#score-a' }];
  assert.deepEqual(clinical.resourcesFor('alpha', index, catalog, calculators), { medications: catalog, calculators });
});

test('calculator names and explicit aliases are searchable without loading calculator logic', () => {
  const calculators = [{ id: 'score-a', name: 'Score Alfa', aliases: ['SA'], url: '#score-a', relatedConditions: ['alpha'] }];
  assert.deepEqual(clinical.searchCalculators(calculators, 'SCORE').map(row => row.id), ['score-a']);
  assert.deepEqual(clinical.searchCalculators(calculators, 'sa').map(row => row.id), ['score-a']);
  assert.deepEqual(clinical.searchCalculators(calculators, 'socre'), []);
});
