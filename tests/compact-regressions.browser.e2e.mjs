import assert from 'node:assert/strict';
const {chromium}=await import(process.env.GUILDBOOK_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.GUILDBOOK_BROWSER?{executablePath:process.env.GUILDBOOK_BROWSER}:{})});
const base=process.env.GUILDBOOK_URL||'http://127.0.0.1:4173/';
let failures=0;
async function check(name,fn){const page=await browser.newPage();page.setDefaultTimeout(2500);try{await fn(page);console.log('PASS',name)}catch(e){failures++;console.error('FAIL',name,e.message)}finally{await page.close()}}
try{
 await check('invalidated pediatric dose remains editable',async page=>{
  await page.goto(base);await page.locator('[data-library-population="pediatric"]').click();await page.locator('#patient-age-months').fill('24');await page.locator('#patient-weight-kg').fill('12');await page.locator('[data-open="dipirona"]').click();await page.locator('[data-presentation="dip-drops"]').click();await page.locator('#dose-units').fill('10');await page.locator('#dispense-choice').selectOption('package:10');await page.locator('#patient-weight-kg').fill('8');
  await page.locator('#dose-units').waitFor();assert.equal(await page.locator('#dose-units').inputValue(),'10');assert.equal(await page.locator('#dose-units').getAttribute('max'),'5');assert.equal(await page.locator('#add-builder').isEnabled(),false);await page.locator('#dose-units').fill('3');assert.equal(await page.locator('#add-builder').isEnabled(),true);
 });
 await check('keyboard focus stays on inline controls',async page=>{
  await page.goto(base);await page.locator('[data-open="dipirona"]').focus();await page.keyboard.press('Enter');await page.locator('[data-presentation="dip-500"]').waitFor();assert.equal(await page.evaluate(()=>document.activeElement.dataset.open),'dipirona');await page.locator('[data-presentation="dip-500"]').focus();await page.keyboard.press('Enter');await page.locator('#dispense-choice').waitFor();assert.equal(await page.evaluate(()=>document.activeElement.dataset.presentation),'dip-500');await page.locator('#dispense-choice').focus();await page.locator('#dispense-choice').selectOption('package:30');assert.equal(await page.evaluate(()=>document.activeElement.id),'dispense-choice');
 });
 await check('history navigation cancels an outstanding expansion',async page=>{
  let pending;await page.route('**/data/medicines/dipirona.json',route=>{pending=route});await page.goto(base);await page.locator('[data-open="dipirona"]').click();for(let i=0;i<100&&!pending;i++)await page.waitForTimeout(10);assert.ok(pending);await page.evaluate(()=>{location.hash='#builder'});await page.getByRole('heading',{name:'Montador de Prescrição'}).waitFor();await pending.continue();await page.waitForTimeout(150);assert.equal(await page.getByRole('heading',{name:'Montador de Prescrição'}).count(),1);
 });
}finally{await browser.close()}
if(failures)process.exitCode=1;
