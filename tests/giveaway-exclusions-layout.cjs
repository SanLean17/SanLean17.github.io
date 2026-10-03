const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.stack));
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname==='fixture.test')return r.fulfill({path:path.join(root,u.pathname),contentType:({'.css':'text/css','.js':'text/javascript','.html':'text/html','.json':'application/json'})[path.extname(u.pathname)]});return r.abort()});
 await page.goto('https://fixture.test/Usuario/index.html#giveaways');
 await page.evaluate(()=>{document.getElementById('panelView').hidden=false;document.getElementById('loginView').hidden=true});
 await page.locator('[data-section-key="giveaways"]').click();
 await page.locator('#slStartGiveawaySimulation').click();
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:1000});
  const remove=page.locator('#slGiveawayLiveParticipants button').first();const label=await remove.getAttribute('aria-label');await remove.click();
  assert.equal(await page.locator('#slGiveawayLiveCount').textContent(),'44');assert.equal(await page.locator('#slGiveawayExcludedCount').textContent(),'1');
  if(!await page.locator('#slGiveawayExcludedList').isVisible())await page.locator('#slGiveawayExcluded summary').click();
  const allow=page.locator('#slGiveawayExcludedList button');assert.match(await allow.getAttribute('aria-label'),new RegExp(label.replace('Excluir a ','Volver a autorizar a ')));
  for(const selector of ['#slGiveawayLiveParticipants button','#slGiveawayExcludedList button'])assert(await page.locator(selector).evaluateAll(elements=>elements.every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.width>=28&&r.height>=28})),`Controls fit ${width}`);
  if(process.env.QA_OUTPUT){fs.mkdirSync(process.env.QA_OUTPUT,{recursive:true});await page.locator('#slGiveawayLive').screenshot({path:path.join(process.env.QA_OUTPUT,`exclusions-${width}.png`)});}
  await allow.click();assert.equal(await page.locator('#slGiveawayLiveCount').textContent(),'45');assert(await page.locator('#slGiveawayExcluded').isHidden());
  console.log('PASS remove/authorize simulation and responsive controls '+width);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
