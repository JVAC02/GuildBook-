import assert from 'node:assert/strict';
const { chromium } = await import(process.env.GUILDBOOK_PLAYWRIGHT || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.GUILDBOOK_BROWSER ? { executablePath: process.env.GUILDBOOK_BROWSER } : {}) });
const base = process.env.GUILDBOOK_URL || 'http://127.0.0.1:4173/';
try {
 for (const width of [1440, 390, 320]) {
  const page = await browser.newPage({viewport:{width,height:1000}});
  page.setDefaultTimeout(4000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);
  await page.locator('[data-open="dipirona"]').click();
  await page.locator('[data-presentation="dip-500"]').waitFor();
  assert.equal(await page.locator('#duration').count(),0,'selection must precede editor');
  await page.locator('[data-presentation="dip-500"]').click();
  await page.locator('#dispense-choice').selectOption('package:30');
  assert.match(await page.locator('#inline-preview').innerText(),/DIPIRONA 500 MG -+ 30 CP/);
  assert.match(await page.locator('#inline-preview').innerText(),/TOMAR 1 CP DE 6\/6H SE DOR OU FEBRE/);
  await page.locator('#duration').fill('5');
  assert.doesNotMatch(await page.locator('#inline-preview').innerText(),/POR 5 DIAS|SE NECESSÁRIO|COMPRIMIDOS|CAIXA/);
  await page.locator('[data-presentation="dip-1000"]').click();
  assert.equal(await page.locator('#duration').inputValue(),'');
  await page.locator('[data-presentation="dip-500"]').click();
  assert.equal(await page.locator('#duration').inputValue(),'5');
  await page.locator('#add-builder').click();
  await page.locator('[data-open="cetoprofeno"]').click();
  assert.equal(await page.locator('.med-card.is-expanded').count(),1);
  await page.locator('[data-presentation="keto-150"]').click();
  await page.locator('#dispense-choice').selectOption('package:10');
  assert.match(await page.locator('#inline-preview').innerText(),/CETOPROFENO 150 MG -+ 10 CP/);
  assert.doesNotMatch(await page.locator('#inline-preview').innerText(),/LIBERAÇÃO/);
  await page.locator('#add-builder').click();
  await page.locator('[data-open="cetoprofeno"]').click();
  assert.equal(await page.locator('.med-card.is-expanded').count(),0);
  await page.locator('#search').fill('novalgina');assert.equal(await page.locator('.med-card').count(),1);
  await page.locator('#search').fill('zzzzz');assert.equal(await page.locator('.med-card').count(),0);
  await page.locator('#search').fill('');
  await page.locator('[data-library-population="pediatric"]').click();
  await page.locator('#patient-age-months').fill('24');
  await page.locator('#patient-weight-kg').fill('12');
  await page.locator('[data-open="dipirona"]').click();
  await page.locator('[data-presentation="dip-drops"]').click();
  await page.locator('#dose-units').fill('5');
  await page.locator('#dispense-choice').selectOption('package:10');
  await page.locator('#duration').fill('3');
  await page.locator('[data-library-population="adult"]').click();
  await page.locator('[data-library-population="pediatric"]').click();
  assert.equal(await page.locator('#dose-units').inputValue(),'5');
  assert.equal(await page.locator('#duration').inputValue(),'3');
  await page.locator('#patient-age-months').fill('2');
  assert.equal(await page.locator('[data-presentation="dip-drops"]').count(),0);
  assert.equal(await page.locator('#add-builder').count(),0);
  await page.locator('#patient-age-months').fill('24');
  await page.locator('[data-presentation="dip-drops"]').click();
  await page.locator('#dose-units').fill('99');assert.equal(await page.locator('#add-builder').isEnabled(),false);
  await page.locator('#dose-units').fill('5');
  await page.locator('#patient-weight-kg').fill('22');
  assert.match(await page.locator('#clinical-output').innerText(),/125 mg/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'horizontal overflow');
  await page.locator('[data-view="builder"]:visible').first().click();
  const rx=await page.locator('#builder-preview').innerText();
  assert.match(rx,/DIPIRONA 500 MG -+ 30 CP/);assert.match(rx,/SE DOR OU FEBRE/);assert.match(rx,/CETOPROFENO 150 MG -+ 10 CP/);
  assert.doesNotMatch(rx,/SE NECESSÁRIO|COMPRIMIDOS|LIBERAÇÃO/);
  if (width === 1440) {
   await page.evaluate(() => {
    const key='guildbook-v7-prescription-builder';const items=JSON.parse(localStorage.getItem(key));
    const item=items.find(x=>x.medicineId==='dipirona');delete item.asNeededReason;delete item.durationPurpose;
    item.quantityText='30 comprimidos';item.instruction='TOMAR 01 CP DE 6/6H POR 5 DIAS SE NECESSÁRIO.';
    localStorage.setItem(key,JSON.stringify(items));
   });
   await page.reload();await page.locator('#builder-preview').waitFor();
   const restored=await page.locator('#builder-preview').innerText();
   assert.match(restored,/SE DOR OU FEBRE/);assert.doesNotMatch(restored,/SE NECESSÁRIO|COMPRIMIDOS|POR 5 DIAS/);
  }
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('Compact flow desktop/mobile: passed');
} finally {await browser.close();}
