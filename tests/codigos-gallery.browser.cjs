const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{let file=path.join(root,decodeURIComponent(req.url.split('?')[0]));try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=process.env.CODE_BASE_URL||`http://127.0.0.1:${server.address().port}/codigos/`;const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});try{
for(const width of [1440,900,390,320]){
 const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<760});const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await p.waitForSelector('.code-card');
 const textCodes=await p.locator('#codes-active-text h3').allTextContents();
 assert.deepEqual(textCodes.slice(0,3).slice().sort(),['DBDDY','DBDXHH','DBDXHS'].sort());
 assert.ok((await p.locator('#codes-active-images h3').allTextContents()).includes('DIABLO'));
 assert.ok((await p.locator('#codes-expired h3').allTextContents()).includes('STARSGUIDE'));
 assert.ok(!(await p.locator('#codes-expired h3').allTextContents()).includes('WORLDPRIDE2026'));
 assert.ok(await p.locator('#codes-permanent .code-card').count()>0);
 const cols=width>1200?3:width>760?2:1;
 for(const section of ['#codes-active-text','#codes-active-images','#codes-permanent']){
  assert.equal(await p.locator(section).evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),cols);
 }
 const textWidth=await p.locator('#codes-active-text .code-card').first().evaluate(e=>e.getBoundingClientRect().width);
 const imageWidth=await p.locator('#codes-active-images .code-card').first().evaluate(e=>e.getBoundingClientRect().width);
 assert.ok(Math.abs(textWidth-imageWidth)<2,'Las tarjetas deben usar idéntico ancho de columna.');

 const card=p.locator('#codes-active .code-card').filter({has:p.locator('h3',{hasText:'MISSBEHAVIOURGC2026'})}),media=card.locator('.code-media');await media.scrollIntoViewIfNeeded();await p.waitForFunction(()=>[...document.querySelectorAll('#codes-active article')].find(e=>e.textContent.includes('MISSBEHAVIOURGC2026')).querySelector('img').naturalWidth>0);
 assert.equal(await media.locator('img').getAttribute('alt'),'Pixel Dwight Banner');const geom=()=>card.evaluate(e=>({x:e.offsetLeft,y:e.offsetTop,w:e.offsetWidth,h:e.offsetHeight}));const before=await geom();await media.locator('.code-image-next').click();assert.equal(await media.locator('img').getAttribute('alt'),'Pixel Sable Banner');await p.waitForTimeout(300);assert.deepEqual(await geom(),before);
 await media.locator('.code-zoom').click();assert.equal(await p.locator('dialog img').getAttribute('alt'),'Pixel Sable Banner');await p.keyboard.press('ArrowLeft');assert.equal(await p.locator('dialog img').getAttribute('alt'),'Pixel Dwight Banner');await p.locator('dialog .code-image-next').click();assert.equal(await p.locator('dialog img').getAttribute('alt'),'Pixel Sable Banner');assert.equal(await p.locator('dialog').evaluate(e=>getComputedStyle(e).borderTopWidth),'2px');await p.keyboard.press('Escape');assert.equal(await p.locator('dialog').isVisible(),false);assert.deepEqual(await geom(),before);
 if(width>760){await card.hover();await p.waitForTimeout(250);assert.equal(await card.evaluate(e=>getComputedStyle(e,'::after').borderTopWidth),'2px');assert.deepEqual(await geom(),before);}else{
  const session=await context.newCDPSession(p);const swipe=async(locator,dx,dy)=>{const box=await locator.boundingBox(),x=box.x+box.width*.7,y=box.y+box.height*.5;await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=10;i++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/10,y:y+dy*i/10}]});await p.waitForTimeout(20);}await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(200);};
  await swipe(media,-120,0);assert.equal(await media.locator('img').getAttribute('alt'),'Pixel Dwight Banner');assert.equal(await p.locator('dialog').isVisible(),false);await p.waitForTimeout(500);await media.locator('.code-zoom').tap();assert.equal(await p.locator('dialog').isVisible(),true);await swipe(p.locator('dialog .code-media'),-120,0);assert.equal(await p.locator('dialog img').getAttribute('alt'),'Pixel Sable Banner');await p.locator('.codes-lightbox-close').tap();await media.scrollIntoViewIfNeeded();const y=await p.evaluate(()=>scrollY);await swipe(media,0,-110);assert.ok(await p.evaluate(()=>scrollY)>y);
 }
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);console.log('PASS gallery/order/lightbox/geometry',width);await context.close();
}
const data=JSON.parse(fs.readFileSync(path.join(root,'data/codigos.json'))),images=data.codes.find(c=>c.code==='MISSBEHAVIOURGC2026').images;
for(const all of [false,true]){const p=await browser.newPage();await p.route('https://deadbydaylight.wiki.gg/images/**',r=>images.slice(0,all?2:1).some(i=>i.url===r.request().url())?r.abort():r.continue());await p.goto(base);const card=p.locator('#codes-active article').filter({has:p.locator('h3',{hasText:'MISSBEHAVIOURGC2026'})});await card.scrollIntoViewIfNeeded();if(all){await card.locator('.code-media').waitFor({state:'detached'});assert.equal(await card.locator('.code-media').count(),0);assert.ok(await card.evaluate(e=>e.classList.contains('code-card-text')));}else{await p.waitForFunction(()=>[...document.querySelectorAll('#codes-active article')].find(e=>e.textContent.includes('MISSBEHAVIOURGC2026')).querySelector('img').alt==='Pixel Sable Banner');assert.equal(await card.locator('.code-image-next').isVisible(),false);}console.log('PASS failed images',all?'all':'one of two');await p.close();}
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
