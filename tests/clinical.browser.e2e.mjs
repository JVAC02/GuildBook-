import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const { chromium } = await import(process.env.GUILDBOOK_PLAYWRIGHT || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.GUILDBOOK_BROWSER ? { executablePath: process.env.GUILDBOOK_BROWSER } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const base = process.env.GUILDBOOK_URL || 'http://127.0.0.1:4173/';
const output = resolve(process.env.GUILDBOOK_SCREENSHOTS_DIR || 'screenshots');
await mkdir(output, { recursive: true });
const web = new URL('../web/', import.meta.url);
const json = async path => JSON.parse(await readFile(new URL(path, web), 'utf8'));
const conditions = await json('data/clinical/conditions.json');
const index = await json('data/clinical/index.json');
const calculator = { id: 'score-teste', name: 'Score de teste', url: '#score-teste', relatedConditions: ['dor'] };
conditions.find(row => row.id === 'dor').aliases = ['ALGIA', 'DA'];
index.calculatorsByCondition.dor = ['score-teste'];
await page.route('**/data/clinical/conditions.json', route => route.fulfill({ json: conditions }));
await page.route('**/data/clinical/index.json', route => route.fulfill({ json: index }));
await page.route('**/data/calculators/index.json', route => route.fulfill({ json: [calculator] }));
const errors = [];
const fullMedicineRequests = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('request', request => { if (/\/data\/medicines\/(?!index\.json)[^/]+\.json$/.test(new URL(request.url()).pathname)) fullMedicineRequests.push(request.url()); });
const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

try {
  await page.goto(base);
  await page.getByRole('button', { name: 'Abrir Dipirona' }).waitFor();
  await page.locator('#search').fill('dipirona');
  assert.equal(await page.getByRole('button', { name: 'Abrir Dipirona' }).count(), 1);
  assert.equal(fullMedicineRequests.length, 0);

  await page.locator('#search').fill('ALGIA');
  assert.equal(await page.locator('[data-condition="dor"]').count(), 1);
  await page.locator('#search').fill('da');
  assert.equal(await page.locator('[data-condition="dor"]').count(), 1);
  await page.locator('#search').fill('score de');
  assert.equal(await page.locator('#clinical-results .tool-card').count(), 1);
  assert.equal(await page.locator('#clinical-results .tool-card').getAttribute('href'), '#score-teste');
  await page.locator('#search').fill('DÓR');
  assert.equal(await page.locator('#medication-results').count(), 1);
  assert.equal(await page.locator('#medication-results').isVisible(), false);
  await page.locator('[data-condition="dor"]').click();
  assert.equal(await page.locator('.related-section .med-card').count(), 2);
  assert.match(await page.locator('.condition-heading').innerText(), /Dor/);
  assert.match(await page.locator('.tool-grid').innerText(), /Score de teste/);
  assert.equal(await page.locator('#add-builder, #presentation, #duration').count(), 0);
  assert.equal(fullMedicineRequests.length, 0);
  assert.doesNotMatch(await page.locator('#content').innerText(), /Fisiopatologia|Epidemiologia|Tratamento indicado/);
  await page.screenshot({ path: resolve(output, 'clinical-desktop-condition.png'), fullPage: true });
  await noOverflow();

  await page.getByRole('button', { name: 'Abrir Dipirona' }).click();
  assert.equal(await page.locator('#presentation').inputValue(), 'dip-500');
  assert.match(await page.locator('#clinical-output').innerText(), /500 mg/);
  assert.equal(await page.locator('#add-builder').isEnabled(), false);
  assert.equal(fullMedicineRequests.length, 1);
  await page.goBack();
  await page.locator('.condition-heading').waitFor();
  assert.equal(await page.locator('.related-section .med-card').count(), 2);

  await page.goto(`${base}#condition/febre`);
  await page.locator('.condition-heading').waitFor();
  assert.equal(await page.locator('.tool-grid').count(), 0);
  assert.equal(await page.locator('.related-section .med-card').count(), 1);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await page.locator('#search').fill('dor');
  await page.locator('[data-condition="dor"]').click();
  await noOverflow();
  await page.screenshot({ path: resolve(output, 'clinical-mobile-condition.png'), fullPage: true });
  await page.locator('.breadcrumbs [data-view="home"]').click();
  await page.locator('[data-library-population="pediatric"]').click();
  await page.locator('#patient-age-months').fill('48');
  await page.locator('#patient-weight-kg').fill('18');
  await page.locator('#search').fill('dor');
  await page.locator('[data-condition="dor"]').click();
  await page.getByRole('button', { name: 'Abrir Dipirona' }).click();
  assert.equal(await page.locator('#presentation').inputValue(), 'dip-drops');
  assert.match(await page.locator('.patient-context-indicator').innerText(), /Pediatria/);
  assert.match(await page.locator('#clinical-output').innerText(), /125 mg/);
  await noOverflow();
  assert.deepEqual(errors, []);

  const scalePage = await context.newPage();
  const scaleCatalog = Array.from({ length: 450 }, (_, i) => ({ id: `fixture-${i}`, name: `Medicamento fictício ${i}`, file: `fixture-${i}.json` }));
  const scaleIndex = { medicationsByCondition: { 'fixture-condition': scaleCatalog.map(row => row.id) }, calculatorsByCondition: { 'fixture-condition': [] } };
  let scaleFullLoads = 0;
  scalePage.on('request', request => { if (/\/data\/medicines\/(?!index\.json)[^/]+\.json$/.test(new URL(request.url()).pathname)) scaleFullLoads++; });
  await scalePage.route('**/data/medicines/index.json', route => route.fulfill({ json: scaleCatalog }));
  await scalePage.route('**/data/clinical/conditions.json', route => route.fulfill({ json: [{ id: 'fixture-condition', name: 'Condição fictícia', aliases: ['FC'] }] }));
  await scalePage.route('**/data/clinical/index.json', route => route.fulfill({ json: scaleIndex }));
  await scalePage.route('**/data/calculators/index.json', route => route.fulfill({ json: [] }));
  await scalePage.goto(base);
  await scalePage.locator('#search').fill('FC');
  await scalePage.locator('[data-condition="fixture-condition"]').click();
  assert.equal(await scalePage.locator('.related-section .med-card').count(), 450);
  assert.equal(scaleFullLoads, 0);
  await scalePage.close();
  console.log('Clinical browser E2E: desktop/mobile, aliases, sigla, navigation and normal medication flow passed; 450 fictitious records listed with 0 full medicine loads');
} finally {
  await browser.close();
}
