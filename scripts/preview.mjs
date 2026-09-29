import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildClinicalIndex } from './clinical-index.mjs';

const web = resolve(fileURLToPath(new URL('../web/', import.meta.url)));
await buildClinicalIndex(resolve(fileURLToPath(new URL('../', import.meta.url))));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
const port = Number(process.env.PORT || 4173);
createServer(async (request, response) => {
  const path = resolve(web, decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname).replace(/^\/+/, '') || 'index.html');
  if (path !== web && !path.startsWith(web + sep)) { response.writeHead(403).end(); return; }
  try {
    const body = await readFile(path);
    response.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(body);
  } catch { response.writeHead(404).end('Não encontrado'); }
}).listen(port, '127.0.0.1', () => console.log(`Prévia: http://127.0.0.1:${port}`));
