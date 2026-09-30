const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
 const page=await browser.newPage();
 await page.route('https://fixture.test/**',r=>r.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));
 await page.goto('https://fixture.test/Usuario/index.html');
 await page.setContent('<button id="navigate">SECCIÓN</button><div id="overlayGrid"></div>');
 await page.evaluate(()=>{
  window.qaCallbacks=0;window.qaLoop=false;const Native=MutationObserver;
  window.MutationObserver=class extends Native{constructor(cb){super((records,observer)=>{if(++qaCallbacks>30){qaLoop=true;observer.disconnect();return}cb(records,observer)})}};
  document.getElementById('navigate').onclick=()=>document.body.dataset.navigated='yes';
  window.qaCards=()=>['harmful','beneficial'].map(type=>`<article data-bits-overlay-card="${type}"><p>Anterior</p><div class="copy-row"><input value="https://example.test/Usuario/alertas.html?token=fixture"></div><div class="overlay-actions"></div></article>`).join('');
 });
 await page.addScriptTag({path:path.join(__dirname,'../js/usuario-bits-overlay-links.js')});
 await page.evaluate(()=>document.getElementById('overlayGrid').innerHTML=qaCards());
 await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>qaLoop),false,'Overlay observer continuously retriggers itself and starves input');
 const settled=await page.evaluate(()=>qaCallbacks);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>qaCallbacks),settled);
 await page.locator('#navigate').click({timeout:1500});assert.equal(await page.locator('body').getAttribute('data-navigated'),'yes');
 for(let i=0;i<10;i++)await page.evaluate(()=>{document.getElementById('overlayGrid').innerHTML=qaCards();window.dispatchEvent(new Event('sanlean:overlays-updated'))});
 await page.waitForTimeout(100);assert.equal(await page.locator('[data-alert-preview]').count(),2);
 const links=await page.locator('.copy-row input').evaluateAll(inputs=>inputs.map(x=>x.value));
 assert(links.every(x=>x.includes('mode=alert')&&x.includes('token=fixture')));assert(links[0].includes('filter=harmful'));assert(links[1].includes('filter=beneficial'));
 assert.equal(await page.evaluate(()=>qaLoop),false);
 const root=path.resolve(__dirname,'..');
 await page.route('**/*',async r=>{
  const url=new URL(r.request().url());if(url.origin!=='https://fixture.test')return r.abort();
  try{const file=path.join(root,url.pathname==='/'?'index.html':decodeURIComponent(url.pathname));return r.fulfill({body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream'})}catch{return r.fulfill({status:404,body:''})}
 });
 // Use the real panel DOM and navigation with no account/database writes.
 await page.setContent(fs.readFileSync(path.join(root,'Usuario/index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
 await page.addScriptTag({path:path.join(root,'js/usuario.js')});
 await page.addScriptTag({path:path.join(root,'js/usuario-bits-overlay-links.js')});
 await page.evaluate(()=>{document.getElementById('panelView').hidden=false;document.getElementById('loginView').hidden=true});
 await page.evaluate(()=>document.getElementById('overlayGrid').innerHTML=qaCards());
 for(const tab of ['platforms','overlays','killers','survivor','killerPerks','giveaways','votes']){
  await page.locator(`.panel-tabs button[data-tab="${tab}"]`).click({timeout:1500});
  assert.equal(await page.evaluate(()=>location.hash),'#'+tab);
 }
 await page.goto('https://fixture.test/',{waitUntil:'domcontentloaded',timeout:15000});
 const heartbeat=await page.evaluate(()=>new Promise(resolve=>setTimeout(()=>resolve(document.querySelectorAll('a[href]').length),100)));
 assert(heartbeat>5,'Public home must finish loading and respond to timers');
 console.log('PASS: observer settles, navigation responds, ten grid rebuilds retain both distinct links and exactly two preview buttons');
 console.log('PASS: seven real panel navigation buttons; public home scripts load and timer remains responsive (external services blocked)');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
