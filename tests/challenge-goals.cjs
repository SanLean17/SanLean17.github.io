const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'js/challenge-goal-view.js'),'utf8'),context);
const view=context.window.SanLeanChallengeGoalView;
const aliases={
 'me-la-pela':['melapela','me la pela','me-la-pela','me_la_pela','no mither','nomither'],
 'de-frente':['de frente','defrente','de-frente','head on'],
 escotilla:['escotilla','trampilla','trampiya','hatch'],
 salvada:['salvada','salvadas','linterna','flashlight','pallet','palet'],
 'puntos-de-sangre':['puntos de sangre','bloodpoints','bp'],
 motores:['motor','motores','generador','generadores','gens'],
 randoms:['random','randoms','aleatorio','ruleta'],escapes:['escape','escapes']
};
for(const [key,terms] of Object.entries(aliases))for(const term of terms)for(const role of ['killer','survivor','both']){
 for(const title of [term,`VICTORIAS CON ${term.toUpperCase()}`,`  ${term.replace(/ /g,'_')}!  `])
  assert.deepEqual([...view.iconKeys(title,role)],[key],`${title} / ${role}`);
}
for(const [title,key] of [['salvadas con de frente','de-frente'],['salvadas defrente','de-frente'],['escapes con mélápéla','me-la-pela'],['melapela por trampilla','me-la-pela'],['salvadas con bloodpoints','salvada'],['generadores con randoms','motores']])assert.equal(view.detectSpecial(title),key);
assert.deepEqual([...view.iconKeys('OBJETIVO','both')],['killers','escapes']);
assert.deepEqual([...view.iconKeys('OBJETIVO','survivor')],['escapes']);
assert.deepEqual([...view.iconKeys('OBJETIVO','killer')],['killers']);
assert.equal(view.detectSpecial('subproceso'),'');

(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const errors=[],missing=[];
 try{
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='fonts.googleapis.com')return route.fulfill({contentType:'text/css',body:''});
   if(url.hostname!=='fixture.test')return route.abort();
   if(url.pathname==='/Usuario/test.html')return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="user-page"><main style="max-width:1100px;margin:auto"><section id="streamGiveawaysPanel"></section></main></body></html>'});
   const file=path.join(root,decodeURIComponent(url.pathname));
   if(!fs.existsSync(file)){missing.push(url.pathname);return route.fulfill({status:404,body:''})}
   return route.fulfill({path:file,contentType:({'.css':'text/css','.js':'text/javascript','.html':'text/html','.png':'image/png'})[path.extname(file)]});
  });
  await page.goto('https://fixture.test/Usuario/test.html');
  for(const file of ['roulette-view.css','usuario.css','usuario-stream-modules.css','usuario-design-system.css','usuario-canonical-selects.css','desafios.css','challenge-goal-view.css'])await page.addStyleTag({url:'../css/'+file});
  const setup=()=>{
   window.fixture={workspace:{id:'workspace-test'},overlay:{id:'goal-test',kind:'challenge_goal',public_token:'test-only',settings:{},state:{title:'ESCAPES',role:'survivor',current:2,target:15,status:'active',visible:true,startedAt:'test-round'}},writes:[],delay:0,fail:false,inflight:0,maxInflight:0};
   window.SANLEAN_SUPABASE={url:'https://fixture.test',publishableKey:'fixture'};
   window.supabase={createClient:()=>({from:table=>({update:update=>{const filters={};const query={eq:(k,v)=>{filters[k]=v;return query},select:()=>query,single:async()=>{
    fixture.inflight++;fixture.maxInflight=Math.max(fixture.maxInflight,fixture.inflight);
    await new Promise(r=>setTimeout(r,fixture.delay));fixture.inflight--;
    if(fixture.fail)return{error:{message:'Fallo de prueba'}};
    fixture.writes.push({table,filters,update:structuredClone(update)});
    return{data:{...fixture.overlay,...structuredClone(update)}};
   }};return query}})})};
   window.SanLeanStreamTools={getOverlays:()=>[fixture.overlay],getWorkspace:()=>fixture.workspace,isOwner:()=>true};
  };
  await page.evaluate(setup);
  for(const file of ['challenge-goal-view.js','usuario-canonical-selects.js','usuario-desafios.js'])await page.addScriptTag({url:'../js/'+file});
  await page.waitForSelector('#goalLiveTitle',{state:'attached'});
  await page.evaluate(()=>document.getElementById('streamChallengesPanel').hidden=false);
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(()=>fixture.writes.length),0,'Initial select sync must not write');
  assert.equal(await page.locator('.challenge-icon-vocabulary li').count(),8);
  for(const width of [1440,740,390,320]){
   await page.setViewportSize({width,height:1100});await page.waitForTimeout(50);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Page overflow at ${width}`);
   assert(await page.locator('#goalPreview').evaluate(e=>e.getBoundingClientRect().height<=110),'Compact preview');
   assert(await page.locator('#goalLiveRole').evaluate(e=>getComputedStyle(e).opacity==='0'||e.getBoundingClientRect().width<=1||getComputedStyle(e).display==='none'),'Canonical select hides native control');
   if(process.env.QA_OUTPUT){fs.mkdirSync(process.env.QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QA_OUTPUT,`metas-${width}.png`),fullPage:true})}
  }
  await page.setViewportSize({width:1440,height:1100});
  await page.locator('#goalLiveTitle').fill('victorias con melapela');
  await page.locator('#goalLiveTarget').fill('20');
  await page.evaluate(()=>window.dispatchEvent(new Event('sanlean:overlays-updated')));
  assert.equal(await page.locator('#goalLiveTitle').inputValue(),'victorias con melapela','Refresh preserves unfocused draft');
  await page.waitForFunction(()=>fixture.overlay.state.target===20);
  assert.equal(await page.evaluate(()=>fixture.overlay.state.title),'victorias con melapela');
  await page.locator('#goalLiveRole + .custom-select > button').click();
  await page.locator('#goalLiveRole + .custom-select [data-value="both"]').click();
  await page.waitForFunction(()=>fixture.overlay.state.role==='both');
  assert.deepEqual(await page.locator('#goalPreview [data-icon]').evaluateAll(es=>es.map(e=>e.dataset.icon)),['me-la-pela']);
  await page.evaluate(()=>fixture.delay=550);
  await page.locator('#goalLiveTitle').fill('salvadas');await page.waitForTimeout(360);
  await page.locator('#goalLiveTitle').fill('salvadas con de frente');await page.locator('#goalLiveCurrent').fill('4');
  await page.waitForFunction(()=>fixture.overlay.state.title==='salvadas con de frente'&&fixture.overlay.state.current===4);
  assert.equal(await page.evaluate(()=>fixture.maxInflight),1,'Writes are serialized');
  await page.evaluate(()=>{fixture.delay=0;fixture.fail=true});
  await page.locator('#goalLiveTarget').fill('25');await page.waitForFunction(()=>document.getElementById('goalActiveStatus').textContent.includes('Fallo'));
  await page.evaluate(()=>window.dispatchEvent(new Event('sanlean:overlays-updated')));
  assert.equal(await page.locator('#goalLiveTarget').inputValue(),'25','Failure preserves unsaved draft');
  await page.evaluate(()=>fixture.fail=false);await page.locator('#goalSaveLive').click();await page.waitForFunction(()=>fixture.overlay.state.target===25);
  await page.locator('#goalPlus').click();await page.waitForFunction(()=>fixture.overlay.state.current===5);
  await page.locator('#goalMinus').click();await page.waitForFunction(()=>fixture.overlay.state.current===4);
  await page.evaluate(()=>fixture.delay=450);
  await page.locator('#goalLiveTitle').fill('ESCAPES FINALES');await page.waitForTimeout(350);
  await page.locator('#goalLiveCurrent').fill('7');await page.locator('#goalFinish').click();
  await page.waitForFunction(()=>fixture.overlay.state.status==='finished');await page.waitForTimeout(700);
  assert.equal(await page.evaluate(()=>fixture.overlay.settings.history.at(-1).current),7);
  assert.equal(await page.locator('#goalPreview').textContent(),'');assert.equal(await page.locator('#goalObsUrl').inputValue(),'');
  await page.evaluate(()=>fixture.delay=0);await page.locator('#goalConfigureOpen').click();await page.locator('#goalStart').click();
  await page.waitForFunction(()=>fixture.overlay.state.status==='active');
  assert.equal(await page.evaluate(()=>fixture.overlay.state.current),0);assert.equal(await page.evaluate(()=>fixture.overlay.state.finishedAt),undefined);
  await page.locator('#goalLiveTitle').fill('UNSAVED OLD WORKSPACE');
  const count=await page.evaluate(()=>{fixture.workspace={id:'different-workspace'};fixture.overlay={...fixture.overlay,id:'different-goal',state:{...fixture.overlay.state,title:'NEW WORKSPACE'}};window.dispatchEvent(new Event('sanlean:overlays-updated'));return fixture.writes.length});
  await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>fixture.writes.length),count,'No draft crosses workspaces');
  assert.equal(await page.locator('#goalLiveTitle').inputValue(),'NEW WORKSPACE','Focused field clears on workspace change');
  assert(await page.evaluate(()=>fixture.writes.every(w=>w.table==='stream_overlays'&&w.filters.id==='goal-test'&&w.filters.workspace_id==='workspace-test')));

  // Actual panel markup and stylesheet/loader ordering, with isolated account data.
  const panel=await browser.newPage();panel.on('pageerror',e=>errors.push(e.message));await panel.addInitScript(setup);
  const allowed=new Set(['challenge-goal-view.js','usuario-stream-tabs.js','usuario-stream-tabs-core.js','usuario-canonical-selects.js','usuario-desafios.js']);
  await panel.route('**/*',r=>{const u=new URL(r.request().url()),f=path.join(root,u.pathname);if(u.hostname!=='fixture.test')return r.abort();if(path.extname(f)==='.js'&&!allowed.has(path.basename(f)))return r.fulfill({contentType:'text/javascript',body:''});if(!fs.existsSync(f))return r.fulfill({status:404,body:''});return r.fulfill({path:f,contentType:({'.css':'text/css','.js':'text/javascript','.html':'text/html','.png':'image/png'})[path.extname(f)]})});
  await panel.goto('https://fixture.test/Usuario/index.html#challenges');await panel.waitForSelector('#goalActiveBox',{state:'attached'});
  await panel.evaluate(()=>{document.getElementById('loginView').hidden=true;document.getElementById('panelView').hidden=false;window.SanLeanUsuarioNavigation.show('challenges')});
  await panel.waitForSelector('#goalLiveTitle');
  for(const width of [1440,740,390,320]){
   await panel.setViewportSize({width,height:1100});await panel.waitForTimeout(100);
   assert(await panel.locator('#streamChallengesPanel').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1}),`Actual panel fits ${width}`);
   assert(await panel.locator('#goalPreview').evaluate(e=>e.getBoundingClientRect().height<=110));
   if(process.env.QA_OUTPUT)await panel.screenshot({path:path.join(process.env.QA_OUTPUT,`panel-${width}.png`),fullPage:true});
  }
  assert(await panel.evaluate(()=>[...document.scripts].some(s=>s.src.includes('usuario-desafios.js?v=20261002-11'))));

  // Load the actual OBS document and exercise its polling/rendering with isolated RPC data.
  const obs=await browser.newPage({viewport:{width:720,height:180}});obs.on('pageerror',e=>errors.push(e.message));
  let snapshot={kind:'challenge_goal',state:{title:'SALVADAS CON DE FRENTE',role:'both',current:3,target:15,status:'active',visible:true},settings:{}};
  await obs.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname==='fixture.test'){const f=path.join(root,u.pathname);return r.fulfill({path:f,contentType:({'.css':'text/css','.js':'text/javascript','.html':'text/html','.png':'image/png'})[path.extname(f)]})}if(u.pathname.includes('/rest/v1/rpc/'))return r.fulfill({contentType:'application/json',body:JSON.stringify([snapshot])});return r.abort()});
  await obs.goto('https://fixture.test/Usuario/overlay.html?token=fixture');await obs.waitForSelector('.sl-goal-counter');
  for(const role of ['killer','both'])for(const key of Object.keys(aliases)){
   snapshot.state={...snapshot.state,title:aliases[key][0],role};await obs.waitForFunction(key=>!!document.querySelector(`[data-icon="${key}"]`),key);
   await obs.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
   const geometry=await obs.evaluate(()=>{const q=s=>document.querySelector(s),r=e=>e.getBoundingClientRect();return{a:getComputedStyle(q('.sl-goal-counter span')).fontSize,b:getComputedStyle(q('.sl-goal-counter b')).fontSize,bg:getComputedStyle(document.body).backgroundColor,gap:r(q('.sl-goal-counter')).left-r(q('.sl-goal-icon-left')).right,bottom:r(q('.sl-goal-main')).bottom,right:r(q('.sl-goal-main')).right,left:r(q('.sl-goal-main')).left}});
   assert.equal(geometry.a,geometry.b);assert.equal(geometry.bg,'rgba(0, 0, 0, 0)');assert(Math.abs(geometry.gap+2)<1);assert(geometry.bottom<=180&&geometry.left>=0&&geometry.right<=720);
  }
  snapshot.state={...snapshot.state,title:'SALVADAS CON DE FRENTE',current:3,target:15,role:'both'};await obs.waitForFunction(()=>document.querySelector('.sl-goal-title').textContent==='SALVADAS CON DE FRENTE');
  if(process.env.QA_OUTPUT)await obs.screenshot({path:path.join(process.env.QA_OUTPUT,'obs-720x180.png'),omitBackground:true});
  assert(await obs.locator('.sl-goal-main').evaluate(e=>{const icon=e.querySelector('.sl-goal-icon').getBoundingClientRect(),counter=e.querySelector('.sl-goal-counter').getBoundingClientRect();return Math.abs(icon.y+icon.height/2-counter.y-counter.height/2)<1}),'Icons centered on numbers');
  assert.equal(await obs.locator('.sl-goal-counter span').evaluate(e=>getComputedStyle(e).fontSize),'48px');
  assert.equal(await obs.locator('.sl-goal-counter i').evaluate(e=>getComputedStyle(e).fontSize),'48px','Slash matches number height');
  assert(await obs.locator('.sl-goal-icon img').evaluate(e=>e.naturalWidth>=e.width*2&&e.naturalHeight>=e.height*2),'Original icons have enough detail at small sizes');
  snapshot.state={...snapshot.state,current:15};await obs.waitForSelector('.sl-goal-view.is-reached');
  assert.equal(await obs.locator('.sl-goal-view').evaluate(e=>getComputedStyle(e).animationName),'sl-result-float');
  assert(await obs.locator('.sl-goal-view').evaluate(e=>e.getAnimations().length>0),'Existing roulette keyframes loaded');
  await obs.waitForTimeout(300);
  assert(await obs.locator('.sl-goal-view').evaluate(e=>e.getAnimations()[0].currentTime>0),'Reached animation moves');
  assert.equal(await obs.locator('.sl-goal-main').evaluate(e=>getComputedStyle(e,'::before').animationName),'sl-goal-aura');
  assert.equal(await obs.locator('.sl-goal-main').evaluate(e=>getComputedStyle(e).filter),'none','Glow does not filter the foreground');
  assert.equal(await obs.locator('.sl-goal-icon img').first().evaluate(e=>getComputedStyle(e).transform),'none','No fractional image scaling during achievement');
  if(process.env.QA_OUTPUT){
   await obs.screenshot({path:path.join(process.env.QA_OUTPUT,'obs-reached.png'),omitBackground:true});
   await obs.locator('#obsOverlayRoot').evaluate(e=>{e.style.transform='scale(.65)';e.style.transformOrigin='center top'});
   await obs.screenshot({path:path.join(process.env.QA_OUTPUT,'obs-reached-small.png'),omitBackground:true});
   await obs.locator('#obsOverlayRoot').evaluate(e=>{e.style.transform='';e.style.transformOrigin=''});
  }
  snapshot.state={...snapshot.state,current:16};await obs.waitForFunction(()=>document.querySelector('.sl-goal-counter span').textContent==='16');
  assert.equal(await obs.locator('.sl-goal-view.is-reached').count(),1,'Above target continues animation');
  await obs.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await obs.locator('.sl-goal-view').evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.equal(await obs.locator('.sl-goal-main').evaluate(e=>getComputedStyle(e,'::before').animationName),'none','Aura respects reduced motion');
  await obs.emulateMedia({reducedMotion:'no-preference'});
  snapshot.state={...snapshot.state,target:20};await obs.waitForFunction(()=>!document.querySelector('.sl-goal-view.is-reached'));
  assert.equal(await obs.locator('.sl-goal-view').evaluate(e=>getComputedStyle(e).animationName),'none','Raising target stops animation');
  assert.equal(await obs.locator('.sl-goal-main').evaluate(e=>getComputedStyle(e,'::before').content),'none','Aura disappears below target');
  await page.evaluate(()=>{fixture.overlay.state.current=30;fixture.overlay.state.target=20;window.dispatchEvent(new Event('sanlean:overlays-updated'));window.qaGoalNode=document.querySelector('#goalPreview .sl-goal-view');window.dispatchEvent(new Event('sanlean:overlays-updated'))});
  assert(await page.evaluate(()=>qaGoalNode===document.querySelector('#goalPreview .sl-goal-view')),'Identical refresh preserves animation node');
  snapshot.state={...snapshot.state,current:999999999,target:999999999};await obs.waitForFunction(()=>document.querySelector('.sl-goal-counter span').textContent==='999999999');
  assert(await obs.locator('.sl-goal-main').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=720}),'Large counters fit');
  snapshot.state={...snapshot.state,status:'finished',visible:false};await obs.waitForFunction(()=>document.getElementById('obsOverlayRoot').classList.contains('obs-hidden'));
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  console.log('PASS: aliases × roles, precedence, responsive panel, canonical select, delayed/failed autosave, finish/restart, workspace isolation, OBS polling/assets/layout/transparency, reached animation and reduced motion.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
