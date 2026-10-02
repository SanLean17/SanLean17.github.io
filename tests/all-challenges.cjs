const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const allowed=new Set(['usuario-stream-tabs.js','usuario-stream-tabs-core.js','usuario-canonical-selects.js','usuario-desafios.js','usuario-all-killer-challenge.js']);
  await page.route('**/*',route=>{
   const u=new URL(route.request().url()),f=path.join(root,decodeURIComponent(u.pathname));
   if(u.hostname!=='fixture.test')return route.abort();
   if(path.extname(f)==='.js'&&!allowed.has(path.basename(f)))return route.fulfill({contentType:'text/javascript',body:''});
   if(!fs.existsSync(f))return route.fulfill({status:404,body:''});
   return route.fulfill({path:f,contentType:({'.css':'text/css','.js':'text/javascript','.html':'text/html','.png':'image/png','.webp':'image/webp','.json':'application/json'})[path.extname(f)]});
  });
  await page.addInitScript(()=>{
   const kinds=['challenge_all_killers','challenge_all_survivors'];
   const make=ws=>kinds.map(kind=>({id:ws+'-'+kind,workspace_id:ws,kind,state:{status:'idle',visible:false},settings:{history:[]}}));
   const saved=sessionStorage.getItem('all-challenge-fixture');
   window.fixture={db:saved?JSON.parse(saved):{a:make('a'),b:make('b')},workspace:{id:'a'},overlays:[],writes:[],delay:0,fail:false,inflight:0,owner:true};
   fixture.switchTo=ws=>{fixture.workspace={id:ws};fixture.overlays=structuredClone(fixture.db[ws]);window.dispatchEvent(new Event('sanlean:overlays-updated'))};
   fixture.switchTo('a');
   window.SANLEAN_SUPABASE={url:'fixture',publishableKey:'fixture'};
   window.supabase={createClient:()=>({from:table=>({update:update=>{const filters={},q={eq:(k,v)=>{filters[k]=v;return q},select:()=>q,single:async()=>{
    const payload=structuredClone(update);fixture.inflight++;await new Promise(r=>setTimeout(r,fixture.delay));fixture.inflight--;
    if(fixture.fail)return {error:{message:'Fallo de prueba'}};
    const ws=fixture.db[filters.workspace_id],index=ws?.findIndex(o=>o.id===filters.id);
    if(index==null||index<0)throw new Error('Unscoped challenge write');
    ws[index]={...ws[index],...payload};fixture.writes.push({table,filters,payload});sessionStorage.setItem('all-challenge-fixture',JSON.stringify(fixture.db));
    return {data:structuredClone(ws[index])};
   }};return q}})})};
   window.SanLeanStreamTools={getOverlays:()=>fixture.overlays,getWorkspace:()=>fixture.workspace,isOwner:()=>fixture.owner};
  });
  const show=async()=>{
   await page.waitForSelector('#allSurvivorOpen',{state:'attached'});
   await page.evaluate(()=>{document.getElementById('loginView').hidden=true;document.getElementById('panelView').hidden=false;window.SanLeanUsuarioNavigation.show('challenges')});
   await page.waitForFunction(()=>document.getElementById('allSurvivorTotalLabel').textContent.startsWith('54'));
  };
  await page.goto('https://fixture.test/Usuario/index.html#challenges');await show();
  for(const [prefix,kind,total,alignment,other] of [['allKiller','challenge_all_killers',44,'left','challenge_all_survivors'],['allSurvivor','challenge_all_survivors',54,'right','challenge_all_killers']]){
   await page.locator('#'+prefix+'Open').click();
   await page.locator(`#${prefix}Alignment [data-alignment="${alignment}"]`).click();
   await page.waitForFunction(({kind,alignment})=>fixture.overlays.find(o=>o.kind===kind).settings.lastRowAlignment===alignment,{kind,alignment});
   await page.locator('#'+prefix+'Start').click();
   await page.waitForFunction(kind=>fixture.overlays.find(o=>o.kind===kind).state.status==='active',kind);
   assert.equal(await page.locator('#'+prefix+'Grid .all-challenge-card').count(),total);
   const first=await page.locator('#'+prefix+'Grid .all-challenge-card').first().getAttribute('data-key');
   for(const [button,status] of [['Lose','failed'],['PendingBtn','pending'],['Win','completed']]){
    await page.locator(`#${prefix}Grid [data-key="${first}"]`).click();
    await page.locator('#'+prefix+button).click();
    await page.waitForFunction(({kind,first,status})=>fixture.overlays.find(o=>o.kind===kind).state.entries[first]===status,{kind,first,status});
   }
   await page.locator('#'+prefix+'Search').fill(prefix==='allKiller'?'cazadora':'dwight');
   assert.equal(await page.locator('#'+prefix+'Grid .all-challenge-card').count(),1);
   await page.locator('#'+prefix+'Search').fill('');
   assert(await page.locator('#'+prefix+'Selection').isHidden(),'Selection controls hide after marking a result');
   await page.locator('#'+prefix+'Pause').click();
   await page.waitForFunction(kind=>fixture.overlays.find(o=>o.kind===kind).state.status==='paused',kind);
   assert.equal(await page.evaluate(kind=>fixture.overlays.find(o=>o.kind===kind).state.visible,kind),false);
   assert(await page.locator('#'+prefix+'Grid .all-challenge-card').first().isDisabled());
   await page.locator('#'+prefix+'Pause').click();
   await page.waitForFunction(kind=>fixture.overlays.find(o=>o.kind===kind).state.status==='active',kind);
   await page.locator('#'+prefix+'Obs').click();
   await page.waitForFunction(kind=>fixture.overlays.find(o=>o.kind===kind).state.visible===false,kind);
   await page.locator('#'+prefix+'Obs').click();
   await page.waitForFunction(kind=>fixture.overlays.find(o=>o.kind===kind).state.visible===true,kind);
   for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:1100});
    const group=page.locator('#'+prefix+'Alignment');
    assert(await group.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth}));
    assert(await group.locator('button').evaluateAll(buttons=>buttons.every(b=>b.scrollWidth<=b.clientWidth)),`Alignment labels fit ${width}`);
    if(process.env.QA_OUTPUT){fs.mkdirSync(process.env.QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QA_OUTPUT,`${prefix}-${width}.png`),fullPage:true})}
   }
   await page.setViewportSize({width:1440,height:1100});
   await page.locator('#'+prefix+'Finish').click();
   await page.waitForFunction(kind=>fixture.overlays.find(o=>o.kind===kind).state.status==='finished',kind);
   const result=await page.evaluate(kind=>fixture.overlays.find(o=>o.kind===kind),kind);
   assert.equal(result.settings.history.length,1);assert.equal(result.settings.history[0].completed,1);assert.equal(result.settings.history[0].total,total);assert.equal(result.settings.lastRowAlignment,alignment);
   await page.locator('#'+prefix+'Start').click();
   await page.waitForFunction(kind=>fixture.overlays.find(o=>o.kind===kind).state.status==='active',kind);
   assert(await page.evaluate(kind=>Object.values(fixture.overlays.find(o=>o.kind===kind).state.entries).every(v=>v==='pending'),kind));
  }
  // Reload round-trips both independent states, histories and alignment choices.
  await page.reload();await show();
  assert.deepEqual(await page.evaluate(()=>fixture.overlays.map(o=>[o.state.status,o.settings.lastRowAlignment,o.settings.history.length])),[['active','left',1],['active','right',1]]);
  await page.locator('#allSurvivorOpen').click();
  await page.evaluate(()=>fixture.fail=true);
  await page.locator('#allSurvivorAlignment [data-alignment="left"]').click();
  await page.waitForFunction(()=>document.getElementById('allSurvivorStatus').textContent.includes('Fallo'));
  assert.equal(await page.locator('#allSurvivorAlignment [data-alignment="right"]').getAttribute('aria-pressed'),'true');
  await page.evaluate(()=>{fixture.fail=false;fixture.delay=400});
  await page.locator('#allSurvivorAlignment [data-alignment="center"]').click();
  await page.waitForFunction(()=>fixture.inflight===1);
  await page.evaluate(()=>fixture.switchTo('b'));
  await page.waitForFunction(()=>fixture.inflight===0);
  assert(await page.evaluate(()=>fixture.overlays.every(o=>o.state.status==='idle'&&!o.settings.lastRowAlignment)),'Late write cannot mutate another workspace');
  await page.evaluate(()=>{fixture.owner=false;window.dispatchEvent(new Event('sanlean:overlays-updated'))});
  assert(await page.locator('#allSurvivorStart').isDisabled());
  await page.locator('#goalConfigureOpen').click();
  assert(await page.locator('#allSurvivorInline').isHidden(),'Only one challenge is open at a time');
  assert(await page.evaluate(()=>fixture.writes.every(w=>w.filters.workspace_id==='a'&&w.filters.id.startsWith('a-'))));
  assert.deepEqual(errors,[]);
  console.log('PASS: both challenge panels, independent state/history/alignment, results and retry, pause, OBS visibility, restart, reload, failure rollback, workspace race and desktop/mobile.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
