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

 await panel.evaluate(()=>window.SanLeanUsuarioNavigation.show('giveaways'));
 await panel.locator('#giveawayKeyword').fill('SORTEO LOCAL');await panel.locator('#startGiveaway').click();
 await panel.waitForFunction(()=>window.SanLeanStreamTools.getGiveaway());
 const overlay=await panel.evaluate(()=>window.SanLeanStreamTools.getOverlays().find(o=>o.kind==='giveaway'));
 const obs=await obsContext.newPage();await obs.goto(base+'/Usuario/overlay.html?token='+overlay.public_token);
 await obs.waitForFunction(()=>document.querySelector('.obs-giveaway-keyword')?.textContent.includes('SORTEO LOCAL')&&!document.getElementById('obsOverlayRoot').classList.contains('obs-hidden'));
 assert.equal(await panel.locator('#slSimulateGiveaway').isEnabled(),true);
 await panel.locator('#slSimulateGiveaway').click();await obs.waitForFunction(()=>document.querySelector('.obs-giveaway-side-head strong')?.textContent==='45');
 await panel.locator('#slSimulateGiveaway').click();await panel.waitForTimeout(300);assert.equal(await panel.locator('#slGiveawayLiveCount').textContent(),'45');
 await panel.locator('#slParticipationToggle').click();await panel.locator('#slDrawWinner').click();
 await obs.locator('.obs-giveaway-live.is-spinning').waitFor();await panel.waitForFunction(()=>!document.getElementById('slDrawWinner').disabled);
 const first=await panel.locator('#slGiveawayWinnerName').textContent();assert.notEqual(first,'—');
 await obs.waitForFunction(()=>document.querySelectorAll('.obs-giveaway-winner-chat .obs-chat-identity').length===3);
 assert.equal(await obs.locator('.obs-giveaway-winner h2').textContent(),first);
 await panel.reload();await panel.waitForFunction(()=>document.getElementById('slGiveawayLiveCount')?.textContent==='44');
 await panel.evaluate(()=>window.SanLeanUsuarioNavigation.show('giveaways'));assert.equal(await panel.locator('#slGiveawayWinnerName').textContent(),first);
 await panel.locator('#slDrawWinner').click();await panel.waitForFunction(()=>!document.getElementById('slDrawWinner').disabled);
 const second=await panel.locator('#slGiveawayWinnerName').textContent();assert.notEqual(second,first);assert.equal(await panel.locator('#slGiveawayLiveCount').textContent(),'43');
 await panel.locator('#slToggleGiveawayObs').click();await obs.waitForFunction(()=>document.getElementById('obsOverlayRoot').classList.contains('obs-hidden'));
 await panel.reload();await panel.waitForFunction(()=>document.getElementById('slToggleGiveawayObs')?.textContent==='MOSTRAR EN OBS');await panel.evaluate(()=>window.SanLeanUsuarioNavigation.show('giveaways'));
 await panel.evaluate(()=>window.SanLeanConfirm.open=async()=>true);await panel.locator('#slFinalizeGiveaway').click();
 await obs.waitForFunction(()=>document.getElementById('obsOverlayRoot').classList.contains('obs-hidden'));
 assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
 console.log('PASS start visible in OBS, simulate 45, idempotent participants, live spin/winners/messages, reload, unique second winner, finalize hides OBS, zero Supabase');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
