const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/halloween-maps.json'),'utf8'));
const contentType={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json',
 '.svg':'image/svg+xml','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpeg':'image/jpeg','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
 const relative=decodeURIComponent(req.url.split('?')[0]);
 const file=path.resolve(root,'.'+relative);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{res.setHeader('Content-Type',contentType[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}
 catch{res.writeHead(404).end();}
});
const scale=page=>page.locator('#hmScene').evaluate(e=>Number(e.style.transform.match(/scale\(([^)]+)\)/)?.[1]||0));
const activate=async(locator,width)=>{
 await locator.evaluate(e=>e.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
 return width<760?locator.tap():locator.click();
};
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port+'/halloween.html';
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,390]){
   const ctx=await browser.newContext({viewport:{width,height:900},hasTouch:width<760,isMobile:width<760});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route(/googletagmanager|google-analytics/,r=>r.abort());
   await page.goto(base);
   await page.locator('.hm-card').first().waitFor();
   assert.equal(await page.locator('.hm-card').count(),5);
   assert.equal(await page.locator('iframe').count(),0);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await activate(page.locator('.hm-card').first(),width);
   await page.waitForSelector('#hmScene:not([hidden])');
   if(width<760){
    const nav=await page.locator('#hmMapList').evaluate(el=>({
     display:getComputedStyle(el).display,overflowX:getComputedStyle(el).overflowX,
     scrollWidth:el.scrollWidth,clientWidth:el.clientWidth
    }));
    assert.equal(nav.display,'grid','Mobile debe usar lista vertical, no carrusel horizontal');
    assert.ok(nav.scrollWidth<=nav.clientWidth+1,'La lista mobile no debe tener desplazamiento horizontal');
    const positions=await page.locator('#hmMapList button').evaluateAll(els=>
     els.map(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width};})
    );
    assert.equal(positions.length,5);
    for(let i=1;i<positions.length;i++)
     assert.ok(positions[i].top>=positions[i-1].bottom-1,'Los mapas deben estar uno debajo del otro');
    assert.ok(positions.every(p=>p.width>150),'Los botones deben ser anchos y fáciles de tocar');
   }
   assert.match(await page.locator('#hmImage').getAttribute('src'),/haddonfield-heights-map\\.webp/);
   assert.ok(await page.locator('#hmImage').evaluate(e=>e.naturalWidth>0));
   assert.match(await page.locator('#hmNotice').textContent(),/UBICACIONES POSIBLES/);
   const initial=await page.locator('#hmMarkers button').count();
   const expected=catalog.maps[0].markers.filter(m=>['gate','car','cellar','drain','landmark'].includes(m.type)).length;
   assert.equal(initial,expected);
   assert.ok(initial>10);
   assert.equal(await page.locator('#hmFilters [data-category="item_gas"]').getAttribute('aria-pressed'),'false');
   assert.equal(await page.locator('#hmFilters [data-category="item_fuse"]').isDisabled(),true);
   assert.ok(await page.locator('#hmLabelLayer .hm-street').count()>3);
   assert.ok(await page.locator('#hmLabelLayer .hm-address').count()>8);
   assert.equal(await page.locator('#hmGrid').isVisible(),false);
   if(width<760){
    assert.equal(await page.locator('#hmLegend').getAttribute('open'),null);
    await page.locator('#hmLegend summary').click();
   }
   const gas=page.locator('#hmFilters [data-category="item_gas"]');
   await activate(gas,width);
   assert.equal(await gas.getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('#hmMarkers button').count(),initial+catalog.maps[0].markers.filter(m=>m.type==='item_gas').length);
   await activate(gas,width);
   assert.equal(await page.locator('#hmMarkers button').count(),initial);
   const cellar=page.locator('#hmFilters [data-category="cellar"]');
   await activate(cellar,width);
   assert.equal(await page.locator('#hmMarkers button').count(),initial-catalog.maps[0].markers.filter(m=>m.type==='cellar').length);
   await activate(cellar,width);
   assert.equal(await page.locator('#hmMarkers button').count(),initial);
   await page.locator('#hmGridToggle').check();assert.ok(await page.locator('#hmGrid').isVisible());
   await page.locator('#hmLabels').uncheck();assert.equal(await page.locator('#hmLabelLayer').isVisible(),false);
   await page.locator('#hmLabels').check();assert.ok(await page.locator('#hmLabelLayer').isVisible());
   if(width>=760){
    await page.locator('#hmMarkers button').first().hover();
    assert.ok(await page.locator('#hmTooltip').isVisible());
    assert.match(await page.locator('#hmTooltip').textContent(),/Posible|Sótano|Auto|Puerta/);
   }
   const initialScale=await scale(page);
   await page.locator('#hmViewport').press('+');
   assert.ok((await scale(page))>initialScale*1.2);
   await activate(page.locator('#hmReset'),width);
   assert.ok(Math.abs((await scale(page))-initialScale)<.0001);
   await activate(page.locator('#hmPlace'),width);
   await page.locator('#hmViewport').scrollIntoViewIfNeeded();
   const rect=await page.locator('#hmViewport').boundingBox();
   if(width<760)await page.touchscreen.tap(rect.x+rect.width*.5,rect.y+rect.height*.5);
   else await page.mouse.click(rect.x+rect.width*.5,rect.y+rect.height*.5);
   assert.equal(await page.locator('.hm-personal').count(),1);
   const p=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('sanlean.halloween.positions.v1'))['haddonfield-heights']);
   assert.ok(p.x>0&&p.x<1&&p.y>0&&p.y<1);
   await activate(page.locator('#hmMapList button').nth(1),width);
   await page.waitForFunction(()=>document.querySelector('#hmImage').getAttribute('src')?.includes('haddonfield-town-center-map.jpeg'));
   await page.waitForSelector('#hmScene:not([hidden])');
   assert.equal(await page.locator('.hm-personal').count(),0);
   await activate(page.locator('#hmMapList button').first(),width);
   await page.waitForFunction(()=>document.querySelector('#hmImage').getAttribute('src')?.includes('haddonfield-heights-map.webp'));
   assert.equal(await page.locator('.hm-personal').count(),1);
   if(width>=760&&page.locator('#hmViewport').isVisible()){
    const center=await page.locator('#hmViewport').boundingBox();
    // La zona inferior derecha se usa solamente para comprobar pantalla completa, no el marcador.
    await page.mouse.click(center.x+center.width*.96,center.y+center.height*.96);
    await page.waitForFunction(()=>!!document.fullscreenElement,{timeout:7000}).catch(()=>{});
    if(await page.evaluate(()=>!!document.fullscreenElement)){
     assert.equal(await page.evaluate(()=>document.fullscreenElement?.id),'hmViewport');
     await page.evaluate(()=>document.exitFullscreen());
    }
   }
   await activate(page.locator('#hmBack'),width);
   assert.equal(await page.locator('#hmGallery').isVisible(),true);
   assert.deepEqual(errors,[]);
   console.log('PASS HALLOWEEN',width,'mapas locales, categorías, overlays, tooltips, gestos y posición');
   await ctx.close();
  }
  const context=await browser.newContext(),page=await context.newPage();
  await page.route(/googletagmanager|google-analytics/,r=>r.abort());
  await page.route('**/assets/halloween/maps/haddonfield-heights-map.webp',r=>r.abort());
  await page.goto(base);await page.locator('.hm-card').first().click();
  await page.waitForSelector('#hmScene:not([hidden])');
  assert.match(await page.locator('#hmImage').getAttribute('src'),/haddonfield-heights\.svg/);
  assert.equal(await page.locator('#hmMarkers button').count(),0);
  await context.close();
  console.log('PASS HALLOWEEN fallback visual sin marcadores incorrectos');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
