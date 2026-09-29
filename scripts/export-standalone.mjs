import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildClinicalIndex } from './clinical-index.mjs';

export async function buildStandalone(root) {
  await buildClinicalIndex(root);
  const web = resolve(root, 'web');
  const read = path => readFile(resolve(web, path), 'utf8');
  let html = await read('index.html');
  const css = await read('styles.css');
  html = html.replace('<link rel="stylesheet" href="styles.css">', `<style>\n${css}\n</style>`);
  const catalog = JSON.parse(await read('data/medicines/index.json'));
  const inlineData = {
    'data/medicines/index.json': catalog,
    'data/clinical/conditions.json': JSON.parse(await read('data/clinical/conditions.json')),
    'data/clinical/index.json': JSON.parse(await read('data/clinical/index.json')),
    'data/calculators/index.json': JSON.parse(await read('data/calculators/index.json')),
  };
  for (const item of catalog) {
    if (!/^[a-z0-9-]+\.json$/.test(item.file)) throw new Error(`Arquivo de medicamento inválido: ${item.file}`);
    const path = `data/medicines/${item.file}`;
    inlineData[path] = JSON.parse(await read(path));
  }
  html = html.replace('</head>', `<script>window.__GB_DATA__=${JSON.stringify(inlineData).replace(/</g, '\\u003c')};</script>\n</head>`);
  for (const match of [...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)]) {
    html = html.replace(match[0], `<script>\n${await read(match[1])}\n</script>`);
  }
  if (/<script src=|<link rel="stylesheet"|@import\s+url/.test(html)) throw new Error('Standalone ainda contém dependências externas.');
  html = html.replace(/\r\n/g, '\n');
  const destination = resolve(root, 'GuildBook-Core-v7.html');
  await writeFile(destination, html);
  return { destination, bytes: Buffer.byteLength(html) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildStandalone(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
  console.log(`Gerado ${result.destination} (${result.bytes} bytes)`);
}
