const engines=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const engine=process.env.HALLOWEEN_ENGINE||'chromium';
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
 const base=process.env.HALLOWEEN_BASE_URL||'http://127.0.0.1:'+server.address().port+'/halloween.html';
 const shots=path.resolve(root,'../halloween-audit/browser-'+engine);fs.mkdirSync(shots,{recursive:true});
 const browser=await engines[engine].launch({headless:true,...(process.env.HALLOWEEN_CHANNEL?{channel:process.env.HALLOWEEN_CHANNEL}:{})});
 try{
  for(const width of (process.env.HALLOWEEN_WIDTHS||'1440,320,390,430').split(',').map(Number)){
   const ctx=await browser.newContext({viewport:{width,height:900},hasTouch:width<760,isMobile:width<760});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route(/googletagmanager|google-analytics/,r=>r.abort());
   await page.goto(base);
   await page.locator('.hm-card').first().waitFor();
   assert.equal(await page.locator('.hm-card').count(),5);
   assert.equal(await page.locator('iframe').count(),0);
   assert.equal(await page.locator('.hm-site-disclaimer,.hm-verified').count(),0);
   assert.equal(await page.locator('#hmLegend summary').textContent(),'FILTROS');
   assert.equal(await page.locator('.hm-map-nav h3').textContent(),'MAPAS');
   assert.equal(await page.locator('.hm-map-nav #hmLabels,.hm-map-nav #hmGridToggle').count(),2);
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
   assert.match(await page.locator('#hmImage').getAttribute('src'),/haddonfield-heights-map\.webp/);
   assert.ok(await page.locator('#hmImage').evaluate(e=>e.naturalWidth>0));
   assert.match(await page.locator('#hmNotice').textContent(),/UBICACIONES POSIBLES/);
   const represented=()=>page.locator('#hmMarkers button').evaluateAll(nodes=>nodes.flatMap(n=>JSON.parse(n.dataset.markerIds)).length);
   const initial=await represented();
   const expected=catalog.maps[0].markers.filter(m=>['gate','car','cellar','drain','landmark'].includes(m.type)).length;
   assert.equal(initial,expected);
   assert.ok(initial>10);
   assert.equal(await page.locator('#hmFilters [data-category="item_gas"]').getAttribute('aria-pressed'),'false');
   assert.equal(await page.locator('#hmFilters [data-category="item_fuse"]').isDisabled(),true);
   assert.match(await page.locator('#hmFilters [data-category="item_fuse"]').textContent(),/FUSIBLES\(0\)/);
   assert.doesNotMatch(await page.locator('#hmFilters').textContent(),/Sin ubicaciones|OPCIONALES/);
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
   assert.equal(await represented(),initial+catalog.maps[0].markers.filter(m=>m.type==='item_gas').length);
   await activate(gas,width);
   assert.equal(await represented(),initial);
   const cellar=page.locator('#hmFilters [data-category="cellar"]');
   await activate(cellar,width);
   assert.equal(await represented(),initial-catalog.maps[0].markers.filter(m=>m.type==='cellar').length);
   await activate(cellar,width);
   assert.equal(await represented(),initial);
   await page.locator('#hmGridToggle').check();assert.ok(await page.locator('#hmGrid').isVisible());
   await page.locator('#hmLabels').uncheck();assert.equal(await page.locator('#hmLabelLayer').isVisible(),false);
   await page.locator('#hmLabels').check();assert.ok(await page.locator('#hmLabelLayer').isVisible());
   if(width>=760){
    await page.locator('#hmMarkers button').first().hover();
    assert.ok(await page.locator('#hmTooltip').isVisible());
    assert.match(await page.locator('#hmTooltip').textContent(),/Posible|posibles|Sótano|Auto|Puerta/);
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
   await page.waitForFunction(()=>document.querySelector('#hmImage').getAttribute('src')?.includes('haddonfield-town-center-map.jpeg')).catch(async e=>{await page.screenshot({path:path.join(shots,width+'-failure.png')});console.log('DEBUG',errors,await page.locator('#hmMapTitle').textContent(),await page.locator('#hmImage').getAttribute('src'));throw e;});
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
   // Every real map: calibrated anchors, filters, collisions, zoom/pan, fullscreen and pin.
   for(const map of catalog.maps){
    await activate(page.locator('#hmMapList button[data-map="'+map.id+'"]'),width);
    await page.waitForFunction(src=>document.querySelector('#hmImage')?.getAttribute('src')===src&&!document.querySelector('#hmScene').hidden,map.image);
    await page.locator('#hmViewport').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(shots,width+'-'+map.id+'-overview.png')});
    const data=await page.locator('#hmMarkers button').evaluateAll(nodes=>nodes.map(n=>({ids:JSON.parse(n.dataset.markerIds),x:Number(n.dataset.mapX),y:Number(n.dataset.mapY)})));
    const wanted=map.markers.filter(m=>['gate','car','cellar','drain','landmark'].includes(m.type));
    assert.deepEqual(data.flatMap(g=>g.ids).sort(),wanted.map(m=>m.id).sort());
    for(const group of data){const source=wanted.find(m=>m.id===group.ids[0]);assert.ok(Math.abs(group.x-(1-source.y))<1e-6&&Math.abs(group.y-source.x)<1e-6,'Anchor must match actual oriented image');}
    const overlaps=await page.locator('#hmMarkers button').evaluateAll(nodes=>{let boxes=nodes.map(n=>n.getBoundingClientRect());return boxes.some((a,i)=>boxes.some((b,j)=>j>i&&Math.hypot(a.x-b.x,a.y-b.y)<44))});assert.equal(overlaps,false);
    if(!await page.locator('#hmLegend').evaluate(n=>n.open))await page.locator('#hmLegend summary').click();
    for(const button of await page.locator('#hmFilters button:not([disabled])').all())await activate(button,width);
    for(const type of await page.locator('#hmFilters button[aria-pressed="false"]:not([disabled])').evaluateAll(nodes=>nodes.map(n=>n.dataset.category)))await activate(page.locator('#hmFilters button[data-category="'+type+'"]'),width);
    assert.equal(await represented(),map.markers.length,'Grouping must never lose any candidate');
    await page.locator('#hmViewport').scrollIntoViewIfNeeded();
    const group=page.locator('#hmMarkers button:has(.hm-marker-count)').first();
    if(await group.count()){
     await activate(group,width);assert.ok(await page.locator('.hm-location-list button').count()>1);
     await activate(page.locator('.hm-location-list button').first(),width);assert.match(await page.locator('#hmInfoNotes').textContent(),/variar|comunitaria/);
     await activate(page.locator('#hmInfoClose'),width);
    }
    await page.locator('#hmLabels').check();await page.locator('#hmGridToggle').check();
    assert.ok(await page.locator('#hmGrid').isVisible());
    await page.locator('#hmLabels').uncheck();assert.ok(await page.locator('#hmGrid').isVisible());await page.locator('#hmLabels').check();
    await page.locator('#hmViewport').press('+');await page.locator('#hmViewport').press('+');await page.locator('#hmViewport').press('+');
    await page.locator('#hmViewport').press('ArrowLeft');
    await page.locator('#hmViewport').scrollIntoViewIfNeeded();
    const dragBox=await page.locator('#hmViewport').boundingBox();
    const beforeDrag=await page.locator('#hmScene').evaluate(n=>n.style.transform);
    if(width>=760){
     await page.mouse.move(dragBox.x+dragBox.width*.5,dragBox.y+dragBox.height*.5);await page.mouse.down();
     await page.mouse.move(dragBox.x+dragBox.width*.5+35,dragBox.y+dragBox.height*.5+25,{steps:6});await page.mouse.up();
    }else if(engine==='chromium'){
     const client=await ctx.newCDPSession(page),x=dragBox.x+dragBox.width*.5,y=dragBox.y+dragBox.height*.5;
     await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:0}]});
     await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+35,y:y+25,id:0}]});
     await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
     const beforePinch=await scale(page);
     await client.send('Input.synthesizePinchGesture',{x,y,scaleFactor:1.4,relativeSpeed:800,gestureSourceType:'touch'});
     await page.waitForFunction(old=>Number(document.querySelector('#hmScene').style.transform.match(/scale\(([^)]+)\)/)[1])>old,beforePinch);
     await client.detach();
    }
    if(width>=760||engine==='chromium')assert.notEqual(await page.locator('#hmScene').evaluate(n=>n.style.transform),beforeDrag);

    await page.locator('#hmViewport').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(shots,width+'-'+map.id+'-zoom.png')});
    const labelOverlap=await page.locator('#hmLabelLayer .hm-label:not([hidden])').evaluateAll(nodes=>{let b=nodes.map(n=>n.getBoundingClientRect());return b.some((a,i)=>b.some((c,j)=>j>i&&a.left<c.right&&a.right>c.left&&a.top<c.bottom&&a.bottom>c.top))});assert.equal(labelOverlap,false);
    // At minimum, intermediate and maximum zoom: overlay remains unscaled and anchored.
    for(const level of [1,4,8]){
     await activate(page.locator('#hmReset'),width);
     for(let i=1;i<level;i++)await page.locator('#hmViewport').press('+');
     if(level===8)for(let i=0;i<8;i++)await page.locator('#hmViewport').press('+');
     await page.locator('#hmViewport').scrollIntoViewIfNeeded();
     const geometry=await page.evaluate(()=>{
      const image=document.querySelector('#hmImage').getBoundingClientRect(),nodes=[...document.querySelectorAll('#hmMarkers button')];
      return nodes.map(n=>{const r=n.getBoundingClientRect(),m=new DOMMatrix(getComputedStyle(n).transform);return {w:r.width,h:r.height,a:m.a,d:m.d,error:Math.hypot(r.x+r.width/2-(image.x+Number(n.dataset.mapX)*image.width),r.y+r.height/2-(image.y+Number(n.dataset.mapY)*image.height)),scaledParent:n.closest('#hmScene')!==null};});
     });
     for(const p of geometry){assert.equal(p.scaledParent,false);assert.equal(p.a,1);assert.equal(p.d,1);assert.ok(p.error<1);assert.ok(p.w<46&&p.h<46);}
     assert.equal(await page.locator('#hmOverlay').evaluate(n=>getComputedStyle(n).transform),'none');
     await page.screenshot({path:path.join(shots,width+'-'+map.id+'-level-'+level+'.png')});
    }
    // Inspect actual text at maximum zoom with filters off so labels are not occluded.
    for(const type of await page.locator('#hmFilters button[aria-pressed="true"]:not([disabled])').evaluateAll(nodes=>nodes.map(n=>n.dataset.category)))await activate(page.locator('#hmFilters button[data-category="'+type+'"]'),width);
    await activate(page.locator('#hmReset'),width);await page.locator('#hmViewport').scrollIntoViewIfNeeded();
    const label=page.locator('#hmLabelLayer .hm-address:not([hidden])').first();
    const labelBox=await label.boundingBox(),labelText=await label.textContent(),fontSize=await label.evaluate(n=>getComputedStyle(n).fontSize);
    await page.mouse.move(labelBox.x+labelBox.width/2,labelBox.y+labelBox.height/2);
    for(let i=0;i<5;i++)await page.mouse.wheel(0,-300);
    const sameLabel=page.locator('#hmLabelLayer .hm-address').filter({hasText:new RegExp('^'+labelText+'$')});
    assert.equal(await sameLabel.evaluate(n=>getComputedStyle(n).fontSize),fontSize);
    assert.equal(await sameLabel.evaluate(n=>n.closest('#hmScene')!==null),false);
    await page.screenshot({path:path.join(shots,width+'-'+map.id+'-text-detail.png')});
    await activate(page.locator('#hmReset'),width);
    // Restore the configured defaults for the fullscreen interaction below.
    for(const type of ['gate','car','cellar','drain','landmark']){const button=page.locator('#hmFilters button[data-category="'+type+'"]');if(await button.count())await activate(button,width);}
    await activate(page.locator('#hmPlace'),width);await page.locator('#hmViewport').press('Enter');
    assert.equal(await page.locator('.hm-personal').count(),1);
    await activate(page.locator('#hmClear'),width);assert.equal(await page.locator('.hm-personal').count(),0);
    if(engine==='chromium'){
     await activate(page.locator('#hmFullscreen'),width);await page.waitForFunction(()=>!!document.fullscreenElement);
     await page.locator('#hmViewport > #hmInfo').waitFor({state:'attached'});
     await page.locator('#hmMarkers button').first().click();assert.ok(await page.locator('#hmInfo').isVisible());
     const detailScale=await scale(page);await page.locator('#hmInfo').hover();await page.mouse.wheel(0,100);assert.equal(await scale(page),detailScale,'Rueda sobre ficha no debe ampliar el mapa');
     await page.locator('#hmInfoClose').click();await page.evaluate(()=>document.exitFullscreen());
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
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
  assert.equal(await page.locator('#hmLabelLayer .hm-label').count(),0);
  await page.locator('#hmMapList button').nth(1).click();
  await page.waitForFunction(()=>document.querySelector('#hmImage').getAttribute('src').includes('town-center-map.jpeg'));
  assert.ok(await page.locator('#hmMarkers button').count()>0);
  await context.close();
  console.log('PASS HALLOWEEN fallback visual sin marcadores incorrectos');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
