const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const allowed=new Set(['usuario-stream-tabs.js','usuario-stream-tabs-core.js','usuario-canonical-selects.js','usuario-desafios.js','challenge-streak-view.js']);
  await page.route('**/*',r=>{const u=new URL(r.request().url()),f=path.join(root,u.pathname);if(u.hostname!=='fixture.test')return r.abort();if(path.extname(f)==='.js'&&!allowed.has(path.basename(f)))return r.fulfill({contentType:'text/javascript',body:''});if(!fs.existsSync(f))return r.fulfill({status:404,body:''});return r.fulfill({path:f,contentType:({'.css':'text/css','.js':'text/javascript','.html':'text/html','.png':'image/png','.json':'application/json'})[path.extname(f)]})});
  await page.addInitScript(()=>{
   window.fixture={workspace:{id:'test-workspace'},overlay:{id:'test-streak',kind:'challenge_streak',state:{role:'survivor',current:12,status:'active',visible:true,startedAt:'session-1'},settings:{role:'survivor',layout:'image-right',history:[{role:'survivor',current:9,finishedAt:'2026-10-01'}]}},writes:[],delay:0,fail:false,inflight:0};
   window.SANLEAN_SUPABASE={url:'fixture',publishableKey:'fixture'};
   window.supabase={createClient:()=>({from:table=>({update:update=>{const filters={},query={eq:(k,v)=>{filters[k]=v;return query},select:()=>query,single:async()=>{
    const captured=structuredClone(fixture.overlay);fixture.inflight++;await new Promise(r=>setTimeout(r,fixture.delay));fixture.inflight--;
    if(fixture.fail)return{error:{message:'Fallo de prueba'}};
    fixture.writes.push({table,filters,update:structuredClone(update)});return{data:{...captured,...structuredClone(update)}};
   }};return query}})})};
   window.SanLeanStreamTools={getOverlays:()=>[fixture.overlay],getWorkspace:()=>fixture.workspace,isOwner:()=>true};
  });
  await page.goto('https://fixture.test/Usuario/index.html#challenges');await page.waitForSelector('#streakCancel',{state:'attached'});
  await page.evaluate(()=>{document.getElementById('loginView').hidden=true;document.getElementById('panelView').hidden=false;window.SanLeanUsuarioNavigation.show('challenges')});
  await page.locator('#streakConfigureOpen').click();await page.waitForSelector('#streakCancel');
  const killer=JSON.parse(fs.readFileSync(path.join(root,'data/killers.json'),'utf8')).find(k=>k.key==='oni');killer.image='../'+killer.image;
  for(const role of ['survivor','killer'])for(const status of ['active','paused']){
   await page.evaluate(({role,status,killer})=>{fixture.overlay.state={role,killer:role==='killer'?killer:null,current:12,status,visible:status==='active',startedAt:role+status};fixture.overlay.settings={...fixture.overlay.settings,role,killer:role==='killer'?killer:null};window.dispatchEvent(new Event('sanlean:overlays-updated'))},{role,status,killer});
   for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:1100});
    assert(await page.locator('#streakCancel').isVisible());assert(await page.locator('#streakCancel').isEnabled());
    assert(await page.locator('#streakCancel').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth}),`Cancel fits ${width}`);
    if(process.env.QA_OUTPUT){fs.mkdirSync(process.env.QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QA_OUTPUT,`cancel-${role}-${status}-${width}.png`),fullPage:true})}
   }
   await page.locator('#streakCancel').click();await page.waitForFunction(()=>fixture.overlay.state.status==='idle');
   assert.equal(await page.evaluate(()=>fixture.overlay.state.visible),false);
   assert.equal(await page.evaluate(()=>fixture.overlay.settings.history.length),1);
   assert.equal(await page.evaluate(()=>fixture.overlay.settings.layout),'image-right');
   assert(await page.locator('#streakConfig').isVisible());assert(await page.locator('#streakLive').isHidden());
   await page.locator('#streakStart').click();await page.waitForFunction(()=>fixture.overlay.state.status==='active');
   assert.equal(await page.evaluate(()=>fixture.overlay.state.current),0);
   assert.equal(await page.evaluate(()=>fixture.overlay.state.role),role);
  }
  await page.evaluate(()=>fixture.delay=500);
  await page.locator('#streakCurrent').fill('32');await page.waitForFunction(()=>fixture.inflight===1);
  await page.locator('#streakCancel').click();await page.waitForFunction(()=>fixture.overlay.state.status==='idle');await page.waitForTimeout(650);
  assert.equal(await page.evaluate(()=>fixture.overlay.state.status),'idle','Late autosave cannot resurrect cancelled streak');
  assert.equal(await page.evaluate(()=>fixture.overlay.settings.history.length),1);
  await page.evaluate(()=>fixture.delay=0);await page.locator('#streakStart').click();await page.waitForFunction(()=>fixture.overlay.state.status==='active');
  await page.evaluate(()=>fixture.fail=true);await page.locator('#streakCancel').click();await page.waitForFunction(()=>document.getElementById('streakStatus').textContent.includes('Fallo'));
  assert.equal(await page.evaluate(()=>fixture.overlay.state.status),'active','Failed cancellation retains session');
  await page.evaluate(()=>fixture.fail=false);await page.locator('#streakFinish').click();await page.waitForFunction(()=>fixture.overlay.state.status==='finished');
  assert.equal(await page.evaluate(()=>fixture.overlay.settings.history.length),2,'Finish still adds history');
  await page.locator('#streakStart').click();await page.waitForFunction(()=>fixture.overlay.state.status==='active');
  await page.evaluate(()=>fixture.delay=500);await page.locator('#streakCurrent').fill('50');await page.waitForFunction(()=>fixture.inflight===1);await page.locator('#streakCancel').click();
  await page.evaluate(()=>{fixture.workspace={id:'other-workspace'};fixture.overlay={...fixture.overlay,id:'other-streak',state:{role:'survivor',current:77,status:'active',visible:true,startedAt:'other-session'}};window.dispatchEvent(new Event('sanlean:overlays-updated'))});
  await page.waitForTimeout(1100);assert.equal(await page.evaluate(()=>fixture.overlay.state.current),77);assert.equal(await page.evaluate(()=>fixture.overlay.state.status),'active');
  assert(await page.evaluate(()=>fixture.writes.every(w=>w.filters.id==='test-streak'&&w.filters.workspace_id==='test-workspace')));
  assert.deepEqual(errors,[]);console.log('PASS: cancel killer/survivor active/paused, OBS hidden, history preserved, restart zero, delayed autosave, failure/retry, finish and workspace isolation; desktop/mobile.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
