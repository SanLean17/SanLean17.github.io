/* Real ZIP extraction over a copy of the user's final local package. Never touches its data or AppData. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {root,fixture}=require('./dbd-content-support.cjs');
const source=process.env.SANLEAN_LOCAL_SOURCE,initial=process.env.SANLEAN_INITIAL_PATCH;
if(!source||!initial)throw Error('Set SANLEAN_LOCAL_SOURCE and SANLEAN_INITIAL_PATCH to the reviewed local package and ZIP.');
const output=path.join(root,'test-results/streamer-package'),install=path.join(output,'install'),base='http://127.0.0.1:4175',routes=['meta','win-streak','all-killer','all-survivor','killer-wheel','perks-killer','perks-survivor'];
fs.mkdirSync(output,{recursive:true});if(fs.existsSync(install))throw Error('Use a fresh test-results/streamer-package/install folder.');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),wait=ms=>new Promise(r=>setTimeout(r,ms)),quote=s=>"'"+s.replaceAll("'","''")+"'";
const ps=args=>cp.execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass',...args],{encoding:'utf8',windowsHide:true});
const extract=zip=>ps(['-Command',`Expand-Archive -LiteralPath ${quote(zip)} -DestinationPath ${quote(install)} -Force`]);
const state=async(scope,key='')=>(await(await fetch(base+'/api/'+scope+(key?'/'+key:''))).json()).state;
const act=async(scope,key,type,extra={})=>{const r=await fetch(base+'/api/'+scope+(key?'/'+key:'')+'/action',{method:'POST',headers:{Origin:base,'Content-Type':'application/json','X-SanLean-Standalone':'1'},body:JSON.stringify({type,...extra})}),body=await r.json();assert(r.ok,body.error);return body;};
let server,browser;const report={passed:false,errors:[]};
async function stop(){if(server&&server.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done;}server=null;}
async function start(){assert(!await fetch(base+'/health').then(()=>true).catch(()=>false),'4175 occupied');server=cp.spawn(path.join(install,'runtime/node.exe'),['server.cjs'],{cwd:install,windowsHide:true,env:{...process.env,SANLEAN_OPEN_BROWSER:'0'},stdio:'pipe'});let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);for(let i=0;i<100;i++){const h=await fetch(base+'/health').then(r=>r.json()).catch(()=>null);if(h){assert.equal(path.resolve(h.root),path.resolve(install));return;}if(server.exitCode!==null)break;await wait(100);}throw Error(logs);}
(async()=>{try{
 fs.mkdirSync(install);for(const folder of ['public','runtime','obs-loaders','licenses'])fs.cpSync(path.join(source,folder),path.join(install,folder),{recursive:true});
 for(const file of fs.readdirSync(source).filter(f=>/\.(cjs|bat|ps1|txt)$/i.test(f)))fs.copyFileSync(path.join(source,file),path.join(install,file));
 const old=require(path.join(source,'application.cjs')),a=old(path.join(install,'datos'));
 for(const role of ['killer','survivor']){const key='all-'+role;a.action('challenges',key,{type:'start'});a.action('challenges',key,{type:'correct',key:old.models.challenges[key].keys[0],result:'completed'});a.action('challenges',key,{type:'pause'});a.action('challenges',key,{type:'visibility',mode:'show'});}
 a.action('tools','',{tool:'killer-wheel',type:'add',key:'trapper',name:'PRUEBA DONACIÓN'});a.action('tools','',{tool:'killer-wheel',type:'preferences',values:{soundType:'deep',soundVolume:31}});a.action('tools','',{tool:'killer-wheel',type:'mode',value:'remove'});
 for(const tool of ['killer-wheel','perks-killer','perks-survivor']){a.action('tools','',{tool,type:'preferences',values:{optionsCollapsed:false}});a.action('tools','',{tool,type:'generate'});}
 for(const key of ['meta','win-streak'])a.action('counters',key,{type:'start'});
 a.checkpoint();const before={wheels:structuredClone(a.get('tools')),challenges:Object.fromEntries(['all-killer','all-survivor'].map(k=>[k,structuredClone(a.get('challenges',k))])),preferences:JSON.parse(fs.readFileSync(path.join(install,'datos/preferencias.json'))).data};
 const loaders=Object.fromEntries(fs.readdirSync(path.join(install,'obs-loaders')).map(n=>[n,hash(path.join(install,'obs-loaders',n))]));extract(initial);report.initialPatchExtracted=true;
 browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const context=await browser.newContext(),pages={};context.setDefaultTimeout(15000);
 for(const tool of routes){const p=pages[tool]=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));await p.goto(pathToFileURL(path.join(install,'obs-loaders/obs-'+tool+'.html')).href);await p.waitForFunction(()=>document.documentElement.dataset.state==='waiting'&&!document.querySelector('iframe'));}
 await start();for(const p of Object.values(pages))await p.waitForFunction(()=>document.documentElement.dataset.state==='ready');report.loadersBeforeServer=true;
 for(const key of ['all-killer','all-survivor'])assert.deepEqual(await state('challenges',key),before.challenges[key]);assert.deepEqual(await state('tools'),before.wheels);
 await stop();for(const p of Object.values(pages))await p.waitForFunction(()=>document.documentElement.dataset.state==='waiting'&&!document.querySelector('iframe'));report.transparentWhenStopped=true;
 for(const enabled of [false,true]){
  const content=path.join(output,enabled?'active-content':'staged-content');fixture(content,enabled);
  ps(['-File',path.join(root,'maintenance/dbd-content/ContentTools.ps1'),'-Root',content,'-Mode','Patch','-UpdateId','catalog-fixture']);extract(path.join(content,'exports/SanLean-catalog-fixture-PATCH.zip'));
  await start();for(const p of Object.values(pages))await p.waitForFunction(()=>document.documentElement.dataset.state==='ready');
  const panel=await context.newPage();panel.on('pageerror',e=>report.errors.push(e.message));await panel.goto(base);await panel.waitForFunction(()=>window.toolsState&&window.challengeStates?.['all-survivor']);
  for(const [key,total,added,prefix] of [['all-killer',44,'fixturekiller','ak'],['all-survivor',54,'fixturesurvivor','as']]){
   await panel.locator('[data-tool="'+key+'"]').click();assert.equal(await panel.locator('#'+prefix+'-allSurvivorGrid [data-key]').count(),total+(enabled?1:0));assert.equal(await panel.locator('#'+prefix+'-allSurvivorGrid [data-key="'+added+'"]').count(),enabled?1:0);const s=await state('challenges',key);assert.equal(s.entries[Object.keys(before.challenges[key].entries)[0]],'completed');assert.equal(s.entries[added],'pending');
   const f=pages[key].frames().find(f=>f.url().includes('/obs/'));await f.waitForFunction(n=>document.querySelectorAll('.sl-roster-card').length===n,total+(enabled?1:0)).catch(async()=>{assert.equal((await f.evaluate(()=>SanLeanChallengeRosterView.loadCatalog(location.pathname.includes('all-survivor')?'survivors':'killers'))).length,total+(enabled?1:0));});
  }
  for(const [key,role,total] of [['killer-wheel','killer',44],['perks-killer','killer',146],['perks-survivor','survivor',177]]){
   await panel.locator('[data-tool="'+key+'"]').click();await panel.locator('#'+key+'-grid [data-key]').first().waitFor();
   assert.equal(await panel.locator('#'+key+'-grid [data-key]').count(),total+(enabled?(key==='killer-wheel'?1:3):0));
   if(enabled){const q=key==='perks-survivor'?'English Test Survivor':'Propietario Nuevo';await panel.locator('#'+key+'-search').fill(q);assert.equal(await panel.locator('#'+key+'-grid [data-key]').count(),key==='killer-wheel'?1:3);await panel.locator('#'+key+'-search').fill('');}
  }
  for(const width of [1366,390]){await panel.setViewportSize({width,height:1000});assert(await panel.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await panel.screenshot({path:path.join(output,(enabled?'active':'staged')+'-'+width+'.png')});}
  const wheels=await state('tools');assert.equal(wheels.tools['killer-wheel'].soundVolume,31);assert.deepEqual(wheels.tools['killer-wheel'].entries.filter(e=>e.type==='donation'),before.wheels.tools['killer-wheel'].entries.filter(e=>e.type==='donation'));assert.deepEqual(JSON.parse(fs.readFileSync(path.join(install,'datos/preferencias.json'))).data,before.preferences);
  await panel.close();await stop();for(const p of Object.values(pages))await p.waitForFunction(()=>document.documentElement.dataset.state==='waiting'&&!document.querySelector('iframe'));
 }
 await start();const duplicate=await context.newPage();await duplicate.goto(pathToFileURL(path.join(install,'obs-loaders/obs-all-killer.html')).href);await duplicate.waitForFunction(()=>document.documentElement.dataset.state==='ready');for(const p of Object.values(pages))await p.waitForFunction(()=>document.documentElement.dataset.state==='ready');report.serverBeforeLoader=true;report.twoScenes=true;
 await act('challenges','all-killer','correct',{key:'fixturekiller',result:'completed'});for(const p of [duplicate,pages['all-killer']])await p.frames().find(f=>f.url().includes('/obs/')).waitForFunction(()=>challengeState.entries.fixturekiller==='completed');
 await pages['killer-wheel'].bringToFront();const w=pages['killer-wheel'].frames().find(f=>f.url().includes('/obs/'));await w.waitForFunction(()=>window.wheelState);await w.evaluate(()=>wheelAudio.ready);report.audioContext=await w.evaluate(()=>wheelAudio.context.state);await w.evaluate(()=>{window.qaAudio=[];addEventListener('sanlean-wheel-audio',e=>qaAudio.push(e.detail))});await act('tools','','spin',{tool:'killer-wheel'});await w.waitForFunction(()=>wheelState.state.status==='result',null,{timeout:14000});const sounds=await w.evaluate(()=>qaAudio);report.audioTicks=sounds.length;assert(sounds.length>10,JSON.stringify({ticks:sounds.length,context:report.audioContext}));assert(sounds.every(x=>x.voices===1));report.singleVoiceSpin=true;const used=(await state('tools')).tools['killer-wheel'].usedKillerEntries;assert.equal(used.length,1);await stop();await start();assert.deepEqual((await state('tools')).tools['killer-wheel'].usedKillerEntries,used);
 for(const tool of routes){const r=await fetch(base+'/obs/'+tool);assert.equal(r.status,200);}for(const [file,digest] of Object.entries(loaders))assert.equal(hash(path.join(install,'obs-loaders',file)),digest);assert.deepEqual(fs.readdirSync(install).filter(n=>/^(datos|progreso|preferencias|historial|sesion|respaldos)$/.test(n)),['datos']);
 assert.deepEqual(report.errors,[]);report.stagedAndActive=true;report.dataPreserved=true;report.loadersUnchanged=true;report.passed=true;console.log('PASS extracted initial + chapter ZIPs, old progress, donations/settings/used entries, 7 unchanged OBS loaders, both startup orders, restart, two scenes, single audio voice, desktop/mobile');
}catch(e){report.error=e.stack;throw e;}finally{await browser?.close();await stop();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));}})().catch(e=>{console.error(e);process.exitCode=1});
