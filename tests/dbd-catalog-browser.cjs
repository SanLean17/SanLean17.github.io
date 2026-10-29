const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {root,names,read,chapter,catalog}=require('./dbd-content-support.cjs');
function releaseChapter(){const f=chapter();for(const type of names)for(const i of f[type])i.name+=" María O’Connor á é í ó ú ñ ü & : - / <img src=x onerror='window.__fixtureScript=true'>";return f;}
const output=path.join(root,'test-results/dbd-browser');fs.mkdirSync(output,{recursive:true});
const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})}),report=[];try{
 for(const enabled of [false,true])for(const width of [1440,390,320]){
  const context=await browser.newContext({viewport:{width,height:1000}}),errors=[],extra=releaseChapter(),data=Object.fromEntries(names.map(n=>[n,[...read(n),...extra[n].map(i=>({...i,enabled}))]]));context.setDefaultTimeout(15000);
  await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!=='fixture.test')return route.abort();const relative=decodeURIComponent(u.pathname).replace(/^\//,'');
   if(relative==='Usuario/catalog-harness.html')return route.fulfill({body:require('./roulette-harness.cjs'),contentType:'text/html'});
   const name=relative.match(/^data\/(.+)\.json$/)?.[1];if(data[name]){if(name==='perks-killer')await new Promise(r=>setTimeout(r,250));return route.fulfill({json:data[name]});}
   const fixtureItem=Object.entries(extra).flatMap(([type,items])=>items.map(i=>[catalog.resolveItemImage(i,type),i])).find(([image])=>image===relative);
   const f=path.join(root,fixtureItem?(relative.endsWith('.webp')?read('survivors').find(i=>i.image.endsWith('.webp')).image:'rombo.png'):relative);
   if(fs.existsSync(f)&&fs.statSync(f).isFile())return route.fulfill({path:f,contentType:mime[path.extname(f)]||'application/octet-stream'});return route.fulfill({status:404,body:'Not found'});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  for(const [url,grid,type] of [['ruleta-killer.html','#cfgKillersGrid','killers'],['ruleta-perks-killer.html','#cfgGrid','perks-killer'],['ruleta-perks-superviviente.html','#cfgGrid','perks-survivor']]){
   console.log('CHECK',enabled,width,url);await page.goto('http://fixture.test/'+url);await page.waitForFunction(({grid,count})=>document.querySelectorAll(grid+' .config-item[data-key]').length===count,{grid,count:read(type).filter(i=>i.enabled!==false).length+(enabled?extra[type].length:0)});
   assert.equal(await page.locator(grid+' [data-key="'+extra[type][0].key+'"]').count(),enabled?1:0);
   if(enabled){const item=extra[type][0];for(const query of ['prueba',item.key,type==='killers'?'valquiria':type==='perks-killer'?'Propietario Nuevo':'Superviviente de Prueba'])assert(await page.locator(grid+' [data-key="'+item.key+'"]').evaluate((el,q)=>SanLeanDBDCatalog.normalizeSearch(q).split(' ').every(w=>el.dataset.search.includes(w)),query),query);}
   await page.locator(type==='killers'?'#killerGearBtn':'#perkGearBtn').click();
   assert.equal(await page.evaluate(()=>window.__fixtureScript===true),false,'Names must render as text');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),url+' overflow '+width);
   if(!enabled)await page.screenshot({path:path.join(output,url+'-'+width+'.png')});
  }
  await page.goto('http://fixture.test/tierlist-dbd.html');for(const [type,file] of [['killers','killers'],['survivors','survivors'],['killerPerks','perks-killer'],['survivorPerks','perks-survivor']]){
   await page.locator('.tier-tab[data-type="'+type+'"]').click();const expected=data[file].filter(i=>i.enabled!==false&&!i.emptySlot).length;await page.waitForFunction(n=>document.querySelectorAll('#tierPool .tier-card').length===n,expected);
   assert.equal(await page.locator('[data-id="'+type+'-'+extra[file][0].key+'"]').count(),enabled?1:0);const ids=await page.locator('#tierPool .tier-card').evaluateAll(els=>els.map(e=>e.dataset.id));assert.equal(new Set(ids).size,ids.length);assert(ids.includes(type+'-'+read(file).find(i=>!i.emptySlot&&i.enabled!==false).key));
  }
  await page.goto('http://fixture.test/Usuario/catalog-harness.html');await page.waitForSelector('#weightGrid .weight-card');
  for(const [section,type] of [['killers','killers'],['killerPerks','perks-killer'],['survivor','perks-survivor']]){
   await page.evaluate(section=>loadTab(section),section);await page.waitForFunction(n=>document.querySelectorAll('#weightGrid .weight-card').length===n,data[type].filter(i=>i.enabled!==false).length);
   if(enabled){for(const query of [extra[type][0].key,'prueba',type==='killers'?'valquiria':type==='perks-killer'?'Propietario Nuevo':'English Test Survivor']){await page.locator('#panelSearch').fill(query);await page.waitForFunction(name=>Array.from(document.querySelectorAll('#weightGrid .weight-name')).some(el=>el.textContent===name),extra[type][0].name);}}
   await page.locator('#panelSearch').fill('');
  }
  assert.equal(await page.evaluate(()=>window.__fixtureScript===true),false);assert.deepEqual(errors,[]);report.push({enabled,width,publicRoulettes:true,tierlist:true,privateRoulettes:true,search:true});await context.close();
 }
 console.log('PASS public/private fixtures: staging, activation, searches, stable Tierlist IDs, WebP, 1440/390/320px');
}finally{fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
