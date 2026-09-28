import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const web = resolve(root, 'web');
const read = path => readFile(resolve(web, path), 'utf8');
let html = await read('index.html');
const css = await read('styles.css');
html = html.replace('<link rel="stylesheet" href="styles.css">', `<style>\n${css}\n</style>`);
const inlineData = {};
for (const path of ['data/medicines/index.json', 'data/medicines/dipirona.json', 'data/medicines/cetoprofeno.json']) {
  inlineData[path] = JSON.parse(await read(path));
}
html = html.replace('</head>', `<script>window.__GB_DATA__=${JSON.stringify(inlineData).replace(/</g, '\\u003c')};</script>\n</head>`);
for (const match of [...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)]) {
  html = html.replace(match[0], `<script>\n${await read(match[1])}\n</script>`);
}
if (/<script src=|<link rel="stylesheet"|@import\s+url/.test(html)) throw new Error('Standalone ainda contém dependências externas.');
html = html.replace(/\r\n/g, '\n');
await writeFile(resolve(root, 'GuildBook-Core-v7.html'), html);
console.log(`Gerado ${resolve(root, 'GuildBook-Core-v7.html')} (${Buffer.byteLength(html)} bytes)`);
