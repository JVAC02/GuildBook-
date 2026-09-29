import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = new Set(['indication', 'symptomatic', 'prophylaxis', 'adjunct']);
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

function uniqueId(id, seen, label) {
  if (!ID.test(id || '')) throw new Error(`Invalid ${label} id: ${id}`);
  if (seen.has(id)) throw new Error(`Duplicate ${label} id: ${id}`);
  seen.add(id);
}

export function validateClinicalIndex(index, catalog, calculators) {
  const medications = new Set(catalog.map(row => row.id));
  const tools = new Set(calculators.map(row => row.id));
  for (const ids of Object.values(index.medicationsByCondition)) {
    for (const id of ids) if (!medications.has(id)) throw new Error(`Unknown medicationId in clinical index: ${id}`);
  }
  for (const ids of Object.values(index.calculatorsByCondition)) {
    for (const id of ids) if (!tools.has(id)) throw new Error(`Unknown calculatorId in clinical index: ${id}`);
  }
}

export function createClinicalIndex({ conditions, catalog, medicines, calculators = [] }) {
  const conditionIds = new Set();
  const aliasOwner = new Map();
  for (const condition of conditions) {
    uniqueId(condition.id, conditionIds, 'condition');
    if (!condition.name?.trim()) throw new Error(`Condition ${condition.id} requires a name`);
    const localAliases = new Set();
    for (const alias of condition.aliases || []) {
      const key = normalize(alias);
      if (!key || localAliases.has(key)) throw new Error(`Duplicate alias in condition ${condition.id}: ${alias}`);
      localAliases.add(key);
    }
    for (const text of [condition.name, ...(condition.aliases || [])]) {
      const key = normalize(text);
      const previous = aliasOwner.get(key);
      if (previous && previous !== condition.id) throw new Error(`Ambiguous alias "${text}" for ${previous} and ${condition.id}`);
      aliasOwner.set(key, condition.id);
    }
  }

  const catalogIds = new Set();
  for (const item of catalog) uniqueId(item.id, catalogIds, 'medication catalog');
  const medicineIds = new Set();
  const medicationsByCondition = Object.fromEntries(conditions.map(row => [row.id, []]));
  const unresolvedLegacy = [];
  for (const medicine of medicines) {
    uniqueId(medicine.id, medicineIds, 'medicine');
    if (!catalogIds.has(medicine.id)) throw new Error(`Medicine ${medicine.id} missing from catalog`);
    const sources = new Set((medicine.sources || []).map(row => row.id));
    const relations = new Set();
    for (const row of medicine.clinicalRelations || []) {
      if (!conditionIds.has(row.conditionId)) throw new Error(`Unknown conditionId ${row.conditionId} in ${medicine.id}`);
      if (!TYPES.has(row.type)) throw new Error(`Invalid relation type ${row.type} in ${medicine.id}`);
      const key = `${row.conditionId}:${row.type}`;
      if (relations.has(key)) throw new Error(`Duplicate relation ${key} in ${medicine.id}`);
      relations.add(key);
      if (!Array.isArray(row.sourceIds) || !row.sourceIds.length) throw new Error(`Missing sourceIds for ${medicine.id}:${key}`);
      for (const sourceId of row.sourceIds) if (!sources.has(sourceId)) throw new Error(`Unknown sourceId ${sourceId} in ${medicine.id}:${key}`);
      const list = medicationsByCondition[row.conditionId];
      if (!list.includes(medicine.id)) list.push(medicine.id);
    }
    for (const text of medicine.indications || []) {
      if (aliasOwner.has(normalize(text))) throw new Error(`Legacy indication "${text}" matches canonical condition in ${medicine.id}; migrate it to clinicalRelations`);
      unresolvedLegacy.push({ medicationId: medicine.id, text });
    }
  }
  for (const id of catalogIds) if (!medicineIds.has(id)) throw new Error(`Missing medicine ${id} listed in catalog`);

  const calculatorIds = new Set();
  const calculatorsByCondition = Object.fromEntries(conditions.map(row => [row.id, []]));
  for (const calculator of calculators) {
    uniqueId(calculator.id, calculatorIds, 'calculator');
    if (!calculator.name?.trim()) throw new Error(`Calculator ${calculator.id} requires a name`);
    if (!calculator.url?.trim()) throw new Error(`Calculator ${calculator.id} requires a URL`);
    const seen = new Set();
    for (const conditionId of calculator.relatedConditions || []) {
      if (!conditionIds.has(conditionId)) throw new Error(`Calculator ${calculator.id} references unknown conditionId ${conditionId}`);
      if (seen.has(conditionId)) throw new Error(`Duplicate calculator relation ${calculator.id}:${conditionId}`);
      seen.add(conditionId);
      calculatorsByCondition[conditionId].push(calculator.id);
    }
  }
  const index = { medicationsByCondition, calculatorsByCondition, unresolvedLegacy };
  validateClinicalIndex(index, catalog, calculators);
  return index;
}

export async function buildClinicalIndex(root, { check = false } = {}) {
  const web = resolve(root, 'web');
  const read = async path => JSON.parse(await readFile(resolve(web, path), 'utf8'));
  const conditions = await read('data/clinical/conditions.json');
  const catalog = await read('data/medicines/index.json');
  const calculators = await read('data/calculators/index.json');
  const medicines = await Promise.all(catalog.map(async item => {
    if (!/^[a-z0-9-]+\.json$/.test(item.file)) throw new Error(`Invalid medicine file: ${item.file}`);
    return read(`data/medicines/${item.file}`);
  }));
  const index = createClinicalIndex({ conditions, catalog, medicines, calculators });
  const path = resolve(web, 'data/clinical/index.json');
  const { medicationsByCondition, calculatorsByCondition } = index;
  const serialized = `${JSON.stringify({ medicationsByCondition, calculatorsByCondition }, null, 2)}\n`;
  if (check) {
    if (await readFile(path, 'utf8') !== serialized) throw new Error('Clinical index is stale; run npm run clinical:index');
  } else await writeFile(path, serialized);
  return index;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
  const index = await buildClinicalIndex(root, { check: process.argv.includes('--check') });
  if (index.unresolvedLegacy.length) console.warn(`Legacy indications pending review: ${index.unresolvedLegacy.map(row => `${row.medicationId}:${row.text}`).join(', ')}`);
  console.log(`Clinical index: ${Object.keys(index.medicationsByCondition).length} conditions`);
}
