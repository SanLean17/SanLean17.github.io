const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Lean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../public-info-checks');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.json':'application/json'};
const server=http.createServer((req,res)=>{const file=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});const errors=[],results=[];
try{
 for(const width of [1440,1024,740,390,320]){
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<761,isMobile:width<761});
  await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  for(const name of ['index','1vs1','halloween','ruleta-killer','ruleta-perks','ruleta-perks-killer','ruleta-perks-superviviente','tierlist-dbd','tierlist-halloween','creditos','aviso-legal','contacto']){
   await page.goto(`${base}/${name}.html?skipSplash=1`);await page.waitForTimeout(100);
   const footer=page.locator('.public-footer');assert.equal(await footer.count(),1);assert.equal(await footer.locator('a').count(),3);
   const layout=await footer.evaluate(el=>({parent:el.parentElement.tagName,bottom:el.getBoundingClientRect().bottom+scrollY,doc:document.documentElement.scrollHeight,mainBottom:document.querySelector('main').getBoundingClientRect().bottom+scrollY,top:el.getBoundingClientRect().top+scrollY,position:getComputedStyle(el).position}));
   assert.equal(layout.parent,'BODY');assert.ok(Math.abs(layout.bottom-layout.doc)<2,`Footer ends document ${name} ${width}: ${JSON.stringify(layout)}`);assert.ok(layout.bottom>=899,`Footer fills viewport ${name} ${width}`);assert.ok(layout.top>=layout.mainBottom-1,'No content overlap');assert.notEqual(layout.position,'fixed');
   if(['1vs1','aviso-legal'].includes(name)&&width>=390)assert.ok(Math.abs(layout.bottom-900)<2,`Short page footer at viewport bottom ${name} ${width}: ${layout.bottom}`);
   await footer.scrollIntoViewIfNeeded();const rect=await footer.boundingBox();assert.ok(rect.y>=0&&rect.y+rect.height<=905,`Reachable footer ${name} ${width}: ${JSON.stringify(rect)}`);
   for(const link of await footer.locator('a').all()){const href=await link.getAttribute('href');assert.equal((await context.request.get(base+'/'+href)).status(),200);}
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No overflow ${name} ${width}`);
   if(width>900){assert.deepEqual(await page.locator('.main-nav>ul>li>.nav-link').allTextContents(),['DEAD BY DAYLIGHT','HALLOWEEN','TIERLIST','CONTACTO']);await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    for(const option of await page.locator('.main-nav>.nav-secondary,.main-nav>ul>li:not(.nav-secondary)>.nav-link').all()){
     await option.hover();assert.equal(await option.evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
    }
    for(const dropdown of await page.locator('.main-nav .has-dropdown').all()){
     await dropdown.hover();for(const a of await dropdown.locator('.dropdown a').all()){await a.hover();const style=await a.evaluate(e=>({border:getComputedStyle(e).borderBottomWidth,bg:getComputedStyle(e).backgroundColor,w:e.getBoundingClientRect().width,parent:e.parentElement.getBoundingClientRect().width}));assert.equal(style.border,'0px');assert.equal(style.bg,'rgb(25, 25, 29)');assert.equal(style.w,style.parent);}
    }
   }
  }
  await page.goto(base+'/tierlist-dbd.html');
  const titleStyle=()=>{const el=document.querySelector('.tierlist-title'),s=getComputedStyle(el);return [s.fontSize,s.fontFamily,s.fontWeight,s.lineHeight]};
  const reference=await page.evaluate(titleStyle);
  await page.goto(base+'/contacto.html');assert.deepEqual(await page.evaluate(titleStyle),reference,'Contact uses existing section title system');
  assert.equal(await page.locator('.contact-form').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(9, 9, 10)');
  assert.doesNotMatch(await page.locator('main').innerText(),/FormSubmit|leandrosanchez10@gmail.com|enlace de correo/i);assert.equal(await page.locator('a[href^=mailto]').count(),0);
  if(width<761){await page.locator('#menuToggle').tap();await page.locator('#publicMobileMenu').getByRole('button',{name:'SANLEAN',exact:true}).tap();await page.locator('#publicMobileMenu').getByRole('link',{name:'CONTACTO',exact:true}).tap();assert.ok(page.url().endsWith('/contacto.html'));}
  await page.screenshot({path:path.join(out,`contact-${width}.png`),fullPage:true});
  const email=page.locator('#contactEmail'),message=page.locator('#contactMessage'),button=page.locator('#contactForm button[type=submit]'),status=page.locator('#contactStatus');
  assert.equal(await page.locator('#contactForm').getAttribute('data-contact-enabled'),'true');
  await page.locator('#contactForm').evaluate(e=>e.dataset.contactEnabled='false');
  let requests=0;await page.route('https://formsubmit.co/**',async r=>{requests++;await r.abort();});
  await button.click();assert.equal(await email.evaluate(e=>e.validity.valueMissing),true);
  await email.fill('invalid');await button.click();assert.equal(await email.evaluate(e=>e.validity.typeMismatch),true);
  await email.fill('test@example.invalid');await button.click();assert.equal(await message.evaluate(e=>e.validity.valueMissing),true);
  await message.fill('   ');await button.click();assert.equal(await message.evaluate(e=>e.validity.customError),true);
  await message.fill('Mensaje de prueba local, sin envío real.');await button.click();assert.match(await status.textContent(),/todavía no está habilitado/);assert.equal(requests,0);
  assert.equal(await page.locator('#contactDirect').count(),0);
  // Enable only inside this isolated browser page. Every provider response is intercepted.
  await page.locator('#contactForm').evaluate(e=>e.dataset.contactEnabled='true');await page.unroute('https://formsubmit.co/**');
  await page.locator('#contactWebsite').evaluate(e=>e.value='bot');await button.click();assert.equal(requests,0,'Honeypot blocks outbound submission');assert.match(await status.textContent(),/No se pudo enviar/);await page.locator('#contactWebsite').evaluate(e=>e.value='');
  await page.route('https://formsubmit.co/**',async r=>{requests++;await new Promise(resolve=>setTimeout(resolve,500));await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true})});});
  await button.click();assert.equal(await button.isDisabled(),true);assert.match(await status.textContent(),/Enviando/);
  await page.locator('#contactForm').evaluate(e=>{e.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));e.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
  await page.waitForFunction(()=>document.querySelector('#contactStatus').dataset.state==='success');assert.equal(requests,1);assert.equal(await email.inputValue(),'');
  await page.unroute('https://formsubmit.co/**');await page.route('https://formsubmit.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:false})}));
  await email.fill('test@example.invalid');await message.fill('Conservar este mensaje');await button.click();await page.waitForFunction(()=>document.querySelector('#contactStatus').dataset.state==='error');assert.equal(await message.inputValue(),'Conservar este mensaje');assert.equal(await button.isEnabled(),true);
  await page.unroute('https://formsubmit.co/**');await page.route('https://formsubmit.co/**',r=>r.abort());await button.click();await page.waitForFunction(()=>document.querySelector('#contactStatus').dataset.state==='error');assert.equal(await message.inputValue(),'Conservar este mensaje');
  await page.goto(base+'/creditos.html');
  const creditsText=await page.locator('main').innerText();assert.doesNotMatch(creditsText,/INSPIRACIONES|TierMaker|Anton|Montserrat|321|12 retratos|FormSubmit|Analytics|DanteASC4|NightLight/i);
  for(const h of await page.locator('main h1,main h2').all())assert.equal(await h.evaluate(e=>getComputedStyle(e).color),'rgb(255, 255, 255)');
  assert.equal(await page.locator('main a[href*="creativecommons.org/licenses/by-nc-sa/3.0"]').count(),1);
  await page.screenshot({path:path.join(out,`credits-${width}.png`),fullPage:true});
  await page.goto(base+'/1vs1.html');await page.screenshot({path:path.join(out,`footer-short-${width}.png`),fullPage:true});
  results.push({width,pages:12,footer:'pass',contact:'validation, disabled, mocked success/error and double submit pass'});await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
