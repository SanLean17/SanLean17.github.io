const assert=require('node:assert/strict'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const server=spawn(process.execPath,[path.join(__dirname,'../scripts/serve-usuario-local.cjs')],{env:{...process.env,SANLEAN_LOCAL_PORT:'4174'},windowsHide:true});
 let browser;try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Server exited '+code)));});
 const base='http://127.0.0.1:4174';
 assert.equal((await fetch(base+'/__sanlean_preview/publish',{method:'POST',body:'{}'})).status,403);
 assert.equal((await fetch(base+'/__sanlean_preview/publish',{method:'POST',headers:{Origin:'https://evil.test','X-SanLean-Local':'preview-v1'},body:'{}'})).status,403);
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const panelContext=await browser.newContext(),obsContext=await browser.newContext();const errors=[],remote=[];
 for(const ctx of [panelContext,obsContext])ctx.on('page',p=>{p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/https?:\/\/[^/]*supabase\./.test(r.url()))remote.push(r.url());});});
 const panel=await panelContext.newPage();await panel.goto(base+'/Usuario/');await panel.waitForFunction(()=>window.SanLeanStreamTools?.getOverlays().length===10);
 await panel.locator('#localVisualMonitor').evaluate(el=>el.open=true);
 await panel.getByRole('button',{name:'PROBAR ALERTA BENEFICIOSA',exact:true}).click();
 const monitor=panel.frameLocator('#localVisualMonitor iframe');await monitor.locator('#bitsAlertStage').waitFor({state:'visible'});
 const overlay=await panel.evaluate(async()=>{const o=window.SanLeanStreamTools.getOverlays().find(o=>o.kind==='roulette_killers');await window.SanLeanStreamTools.spinOverlay(o.id);await window.SanLeanLocal.publishPreview();return o;});
 const obs=await obsContext.newPage();await obs.goto(base+'/Usuario/overlay.html?token='+overlay.public_token);
 await obs.waitForFunction(()=>document.getElementById('obsStage').textContent.trim().length>0);
 assert.equal(await obs.evaluate(()=>JSON.parse(localStorage.getItem('sanlean-local-development-v1')||'{"stream_overlays":[]}').stream_overlays.length),0);
 await panel.evaluate(async id=>{await window.SanLeanStreamTools.hideOverlay(id);await window.SanLeanLocal.publishPreview();},overlay.id);
 await obs.waitForFunction(()=>document.getElementById('obsOverlayRoot').classList.contains('obs-hidden'));
 assert.equal(await obs.locator('#localDevelopmentBanner').count(),0);
 await panel.locator('.panel-tabs [data-section-key="polls"]').click();
 await panel.evaluate(()=>{const t=document.getElementById('pollType');t.value='custom';t.dispatchEvent(new Event('change',{bubbles:true}));});
 await panel.locator('#pollOptions input').nth(0).fill('OPCIÓN UNO');await panel.locator('#pollOptions input').nth(1).fill('OPCIÓN DOS');
 await panel.locator('#pollStart').click();
 const pollOverlay=await panel.evaluate(()=>window.SanLeanStreamTools.getOverlays().find(o=>o.kind==='poll'));
 await obs.goto(base+'/Usuario/overlay.html?token='+pollOverlay.public_token);await obs.locator('.sl-poll-card').first().waitFor();
 await panel.locator('#localDevelopmentTools').evaluate(el=>el.open=true);await panel.getByRole('button',{name:'SIMULAR VOTO B',exact:true}).click();
 await obs.waitForFunction(()=>document.querySelectorAll('.sl-poll-meta')[1]?.textContent.includes('100%'));
 await obs.setViewportSize({width:1920,height:1080});await obs.screenshot({path:path.resolve(__dirname,'../../local-votacion-obs.png')});
 await panel.locator('#pollFinish').click();await obs.locator('.sl-poll-card.is-winner').waitFor();assert((await obs.locator('.sl-poll-card.is-winner').innerText()).includes('OPCIÓN DOS'));
 await panel.locator('#pollHide').click();await obs.waitForFunction(()=>document.getElementById('obsOverlayRoot').classList.contains('obs-hidden'));
 for(const width of [1440,390,320]){await panel.setViewportSize({width,height:900});await panel.evaluate(()=>scrollTo(0,0));await panel.locator('#localVisualMonitor').screenshot({path:path.resolve(__dirname,'../../local-monitor-'+width+'.png')});assert(await panel.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 const bits=await obsContext.newPage();await bits.goto(base+'/Usuario/alertas.html?token=local-bits-demo&mode=active');
 await panel.locator('#localDevelopmentTools').evaluate(el=>el.open=true);await panel.getByRole('button',{name:'SIMULAR APORTE DE BITS',exact:true}).click();await bits.locator('#bitsActiveDock').waitFor({state:'visible'});
 assert.equal(await bits.locator('#localDevelopmentBanner').count(),0);assert.equal(await monitor.locator('#localDevelopmentBanner').count(),0);assert.deepEqual(remote,[]);assert.deepEqual(errors,[]);console.log('PASS monitor rendering, 1440/390/320, isolated OBS context, live overlay updates, Bits entries, blocked cross-origin writes, zero Supabase requests');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
