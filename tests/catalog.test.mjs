import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildStandalone } from '../scripts/export-standalone.mjs';

test('standalone export includes a newly registered medicine without script changes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'guildbook-catalog-'));
  try {
    await cp(new URL('../web/', import.meta.url), join(root, 'web'), { recursive: true });
    const catalogPath = join(root, 'web', 'data', 'medicines', 'index.json');
    const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
    catalog.push({ id: 'new-drug', name: 'Medicamento novo', file: 'new-drug.json' });
    await writeFile(catalogPath, JSON.stringify(catalog));
    await writeFile(join(root, 'web', 'data', 'medicines', 'new-drug.json'), JSON.stringify({ id: 'new-drug', presentations: [] }));
    await buildStandalone(root);
    const html = await readFile(join(root, 'GuildBook-Core-v7.html'), 'utf8');
    assert.match(html, /new-drug\.json/);
    assert.match(html, /Medicamento novo/);
    assert.match(html, /data\/clinical\/index\.json/);
    assert.match(html, /medicationsByCondition/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
