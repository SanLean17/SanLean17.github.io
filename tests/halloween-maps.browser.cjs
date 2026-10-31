const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),catalog=JSON.parse(fs.readFileSync(path.join(root,'data/halloween-maps.json')));
const server=http.createServer((req,res)=>{const file=path.join(root,decodeURIComponent(req.url.split('?')[0]));try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
const fixture=structuredClone(catalog);fixture.maps[0].placeholder=false;
fixture.maps[0].markers=['gate','car','cellar','drain','vehicle_exit','supply','landmark'].map((type,i)=>({id:'test-'+i,type,x:.25+i*.075,y:.5,title:'PUNTO DE PRUEBA '+i,description:'Fixture sintÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©tico, no representa ubicaciones del juego.',possible:true,confidence:'community',source:'Test fixture only'}));
fixture.maps[0].labels=[{x:.5,y:.25,text:'CALLE DE PRUEBA',source:'Test fixture only'}];
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=process.env.HALLOWEEN_BASE_URL||`http://127.0.0.1:${server.address().port}/halloween.html`;
 const engine=process.env.HALLOWEEN_ENGINE||'chromium';const browser=await (engine==='webkit'?webkit:chromium).launch({...(engine==='chromium'&&process.env.HALLOWEEN_BROWSER_CHANNEL?{channel:process.env.HALLOWEEN_BROWSER_CHANNEL}:{}),headless:true});
 const output=path.resolve(root,'../halloween-verification');fs.mkdirSync(output,{recursive:true});
 try{
 for(const width of (process.env.HALLOWEEN_WIDTHS?process.env.HALLOWEEN_WIDTHS.split(',').map(Number):engine==='webkit'?[430,390,375,320]:[1920,1440,1280,1024,430,390,375,320])){
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<760,isMobile:width<760});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route(/googletagmanager|google-analytics/,r=>r.abort());
  await page.goto(base);await page.waitForSelector('.hm-card');assert.equal(await page.locator('.hm-card').count(),5);assert.equal(await page.locator('#hmGalleryHeading').isVisible(),true);
  const preview=await page.locator('.hm-card img').first().boundingBox();assert.ok(Math.abs(preview.width/preview.height-4/3)<.02);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if([1440,390].includes(width))await page.screenshot({path:path.join(output,engine+'-gallery-'+width+'.png'),fullPage:true});
  const getScale=()=>page.locator('#hmScene').evaluate(e=>Number(e.style.transform.match(/scale\(([^)]+)\)/)?.[1]||0));
  const activate=async locator=>{await locator.evaluate(node=>node.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));await page.waitForTimeout(100);return width<760?locator.tap():locator.click();};
  await activate(page.locator('.hm-card').first());await page.waitForSelector('#hmScene:not([hidden])');assert.equal(await page.locator('#hmGalleryHeading').isVisible(),false);
  const fitScale=await getScale();assert.ok(fitScale>0);assert.equal(await page.locator('#hmMarkers button').count(),0);assert.equal(await page.locator('#hmZoomIn').count(),0);assert.equal(await page.locator('#hmZoomOut').count(),0);
  assert.equal(await page.locator('#hmVerified li').count(),4);
  assert.match(await page.locator('#hmMapSummary').textContent(),/residencial/i);
  assert.equal(await page.locator('#hmOfficial').count(),0);
  await page.locator('#hmStyle').click();assert.equal(await page.locator('#hmViewport').evaluate(e=>e.classList.contains('hm-paper')),true);
  await activate(page.locator('#hmStyle'));assert.equal(await page.locator('#hmViewport').evaluate(e=>e.classList.contains('hm-paper')),false);
  assert.match(await page.locator('#hmNotice').textContent(),/ESQUEMA ARTÍSTICO/);
  if(width>=1024){const left=await page.locator('#hmLegend').boundingBox(),map=await page.locator('#hmViewport').boundingBox(),right=await page.locator('.hm-map-nav').boundingBox();assert.ok(left.x<map.x&&map.x<right.x);assert.ok(map.width>left.width*3);}
  else{assert.equal(await page.locator('#hmLegend').getAttribute('open'),null);await activate(page.locator('#hmLegend summary'));assert.notEqual(await page.locator('#hmLegend').getAttribute('open'),null);await activate(page.locator('#hmLegend summary'));}
  if([1440,390].includes(width))await page.screenshot({path:path.join(output,engine+'-viewer-'+width+'.png'),fullPage:true});
  await page.locator('#hmViewport').press('+');assert.ok((await getScale())>fitScale*1.2);
  await activate(page.locator('#hmPlace'));await page.locator('#hmViewport').scrollIntoViewIfNeeded();let box=await page.locator('#hmViewport').boundingBox();
  if(width<760)await page.touchscreen.tap(box.x+box.width*.5,box.y+box.height*.5);else await page.mouse.click(box.x+box.width*.5,box.y+box.height*.5);
  assert.equal(await page.locator('.hm-personal').count(),1);
  const stored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('sanlean.halloween.positions.v1')));
  await activate(page.locator('#hmReset'));for(let j=0;j<3;j++)await page.locator('#hmViewport').press('+');
  await page.locator('#hmViewport').scrollIntoViewIfNeeded();box=await page.locator('#hmViewport').boundingBox();let before=await page.locator('#hmScene').getAttribute('style');
  if(width<760&&engine==='chromium'){
   const cdp=await context.newCDPSession(page),x=box.x+box.width*.5,y=box.y+box.height*.45;
   await cdp.send('Input.synthesizePinchGesture',{x,y,scaleFactor:1.8,relativeSpeed:600,gestureSourceType:'touch'});
   assert.ok((await getScale())>fitScale*3);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+45,y:y+30}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300);await cdp.detach();
  }else{
   await page.mouse.move(box.x+box.width*.4,box.y+box.height*.4);await page.mouse.down();await page.mouse.move(box.x+box.width*.4+50,box.y+box.height*.4+45,{steps:8});await page.mouse.up();
   if(engine==='chromium'){await page.mouse.wheel(0,-150);await page.waitForTimeout(100);}
  }
  assert.notEqual(await page.locator('#hmScene').getAttribute('style'),before);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('sanlean.halloween.positions.v1'))),stored);
  const anchored=await page.locator('.hm-personal').evaluate(pin=>{const b=pin.getBoundingClientRect(),s=document.querySelector('#hmScene').getBoundingClientRect();return {x:(b.x+b.width/2-s.x)/s.width,y:(b.y+b.height/2-s.y)/s.height};});assert.ok(Math.abs(anchored.x-stored['haddonfield-heights'].x)<.001&&Math.abs(anchored.y-stored['haddonfield-heights'].y)<.001);
  await activate(page.locator('#hmMapList button').last());await page.waitForFunction(()=>document.querySelector('#hmImage').alt.startsWith('The Tower Farm'));assert.ok(Math.abs((await getScale())-fitScale)<.0001);assert.equal(await page.locator('.hm-personal').count(),0);
  await activate(page.locator('#hmMapList button').first());await page.waitForFunction(()=>document.querySelector('#hmImage').alt.startsWith('Haddonfield Heights'));assert.equal(await page.locator('.hm-personal').count(),1);
  await page.reload();await page.waitForSelector('.hm-card');await activate(page.locator('.hm-card').first());await page.waitForSelector('#hmScene:not([hidden])');assert.equal(await page.locator('.hm-personal').count(),1);
  await activate(page.locator('#hmPlace'));await page.locator('#hmViewport').press('+');await page.locator('#hmViewport').press('ArrowRight');await page.locator('#hmViewport').press('Enter');assert.equal(await page.locator('.hm-personal').count(),1);
  await activate(page.locator('#hmClear'));assert.equal(await page.locator('.hm-personal').count(),0);
  for(let index=1;index<5;index++){await activate(page.locator('#hmMapList button').nth(index));await page.waitForFunction(name=>document.querySelector('#hmImage').alt.startsWith(name),catalog.maps[index].name);assert.ok(Math.abs((await getScale())-fitScale)<.0001);}
  await activate(page.locator('#hmBack'));assert.ok(await page.locator('#hmGallery').isVisible());
  if(width<760){await activate(page.locator('#menuToggle'));assert.ok(await page.locator('.public-mobile-menu').isVisible());await activate(page.locator('#menuToggle'));}
  assert.equal(await page.locator('footer.public-footer a').count(),3);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  console.log('PASS',engine,width,'gallery, layout, gestures, pin, storage, switching, header/footer');await context.close();
 }
 // Synthetic points are injected only by this test; never written to production JSON.
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<760,isMobile:width<760}),page=await context.newPage();await page.route(/googletagmanager|google-analytics/,r=>r.abort());await page.route('**/data/halloween-maps.json',r=>r.fulfill({json:fixture}));
  await page.goto(base);await page.locator('.hm-card').first().click();await page.waitForSelector('#hmScene:not([hidden])');assert.equal(await page.locator('#hmMarkers button').count(),7);
  if(width<760)await page.locator('#hmMarkers button').nth(3).tap();else await page.locator('#hmMarkers button').nth(3).click();assert.match(await page.locator('#hmInfoText').textContent(),/Fixture/);assert.match(await page.locator('#hmInfoNotes').textContent(),/orientativa/);await page.locator('#hmInfoClose').click();
  if(width<760)await page.locator('#hmLegend summary').click();await page.locator('.hm-filter').nth(3).click();assert.equal(await page.locator('#hmMarkers button').count(),6);await page.locator('.hm-filter').nth(3).click();assert.equal(await page.locator('#hmMarkers button').count(),7);
  await page.locator('#hmLabels').uncheck();assert.equal(await page.locator('#hmLabelLayer').isVisible(),false);await page.locator('#hmGridToggle').check();assert.ok(await page.locator('#hmGrid').isVisible());
  await page.locator('#hmPlace').click();await page.locator('#hmViewport').press('Enter');assert.equal(await page.locator('.hm-personal').count(),1);await page.locator('#hmViewport').press('+');await page.locator('#hmViewport').press('ArrowRight');await page.locator('#hmViewport').press('0');assert.ok(await page.locator('#hmScene').evaluate(e=>e.style.transform.includes('scale(')));
  await page.setViewportSize({width:900,height:390});await page.waitForTimeout(150);assert.equal(await page.locator('.hm-personal').count(),1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await context.close();console.log('PASS',engine,width,'fixture filters, marker info, labels, grid, keyboard, rotation');
 }
 const context=await browser.newContext(),page=await context.newPage();await page.route(/googletagmanager|google-analytics/,r=>r.abort());await page.route('**/assets/halloween/maps/haddonfield-heights.svg',r=>r.abort());await page.goto(base);await page.locator('.hm-card').first().click();await page.waitForFunction(()=>document.querySelector('#hmImageState').textContent.includes('NO SE PUDO'));assert.equal(await page.locator('#hmScene').isVisible(),false);await page.locator('#hmMapList button').last().click();
  await page.waitForSelector('#hmScene:not([hidden])');await context.close();console.log('PASS image failure and navigation recovery');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
