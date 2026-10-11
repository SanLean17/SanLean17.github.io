/* Run: node tests/usuario-local.cjs. Set PLAYWRIGHT_MODULE if Playwright is installed elsewhere. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=path.resolve(__dirname,'..');
const contentType=file=>({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
 const context=await browser.newContext();const errors=[],external=[];
 context.on('page',page=>{page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/https?:\/\/[^/]*supabase\.(co|com)/.test(r.url()))external.push(r.url());});});
 await context.route('**/*',async route=>{
   const url=new URL(route.request().url());if(!['127.0.0.1','localhost'].includes(url.hostname))return route.abort();
   let file=path.join(root,decodeURIComponent(url.pathname));if(file.endsWith(path.sep))file+='index.html';
   try{await route.fulfill({body:fs.readFileSync(file),contentType:contentType(file)});}catch{await route.fulfill({status:404,body:''});}
 });
 const page=await context.newPage();const base='http://127.0.0.1:4173/Usuario/';
 await page.goto(base);await page.waitForFunction(()=>window.SanLeanStreamTools?.getOverlays().length===9);
 assert.equal(await page.locator('#panelView').isVisible(),true);
 assert.equal(await page.evaluate(()=>window.SANLEAN_SUPABASE.url),'http://127.0.0.1:4173/__sanlean_local');
 const sections=['home','overlays','votes','poll','challenges','giveaways','bits','platforms','killers','killerPerks','survivor','tournament'];
 for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:900});
   for(const section of sections){await page.evaluate(key=>window.SanLeanUsuarioNavigation.show(key),section);await page.waitForTimeout(80);assert(await page.locator('#panelView').isVisible());}
   await page.evaluate(()=>window.SanLeanUsuarioNavigation.show('home'));
   await page.screenshot({path:path.resolve(root,'../local-panel-'+width+'.png')});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   console.log('PASS navigation',width);
 }
 await page.evaluate(async()=>{const a=window.SanLeanAccount;a.queueSettings({weights:{'killers:trapper':3},bonusEntries:{}});await a.flushSettings();});
 await page.reload();await page.waitForFunction(()=>window.SanLeanStreamTools?.getOverlays().length===9);
 assert.equal(await page.evaluate(()=>window.SanLeanAccount.getSettings().weights['killers:trapper']),3);
 await page.evaluate(()=>window.SanLeanUsuarioNavigation.show('tournament'));
 await page.locator('[data-history="0"]').click();assert.equal(await page.locator('#finishedTournamentName').textContent(),'TORNEO DEMO LOCAL');
 const spin=await page.evaluate(async()=>{const tools=window.SanLeanStreamTools;const o=tools.getOverlays().find(o=>o.kind==='roulette_killers');return tools.spinOverlay(o.id);});assert.equal(spin,true);
 const bits=await page.evaluate(async()=>{const url=window.SANLEAN_SUPABASE.url;await fetch(url+'/functions/v1/stream-bits/test-alert',{method:'POST',body:JSON.stringify({workspaceId:'local-stream',style:'beneficial'})});return (await (await fetch(url+'/rest/v1/rpc/get_stream_bits_feed',{method:'POST',body:JSON.stringify({p_token:'local-bits-demo'})})).json()).events;});assert.equal(bits.length,1);assert.equal(bits[0].alert_style,'beneficial');
 const overlay=await page.evaluate(async()=>{const o=window.SanLeanStreamTools.getOverlays().find(o=>o.kind==='challenge_goal');await window.sanleanSupabase.from('stream_overlays').update({state:{visible:true,status:'active',label:'META DEMO',current:1,target:5}}).eq('id',o.id);return o;});
 const obs=await context.newPage();await obs.goto(base+'overlay.html?token='+overlay.control_token);
 assert.equal(await obs.evaluate(async token=>(await (await fetch(window.SANLEAN_SUPABASE.url+'/rest/v1/rpc/get_stream_overlay_delta',{method:'POST',body:JSON.stringify({p_token:token})})).json())[0].payload.can_control,overlay.control_token),true);
 assert.equal(await obs.evaluate(async token=>(await (await fetch(window.SANLEAN_SUPABASE.url+'/rest/v1/rpc/get_stream_overlay_delta',{method:'POST',body:JSON.stringify({p_token:token})})).json())[0].payload.can_control,overlay.public_token),false);
 await obs.close();
 await page.locator('#localDevelopmentTools').evaluate(el=>el.open=true);
 await page.getByText('SIMULAR APORTE DE BITS',{exact:true}).click();
 const bonuses=await page.evaluate(async()=>{const db=window.sanleanSupabase;const url=window.SANLEAN_SUPABASE.url+'/functions/v1/stream-bits/set-timers-paused';await fetch(url,{method:'POST',body:JSON.stringify({workspaceId:'local-stream',paused:true})});return (await db.from('stream_bits_bonuses').select('*')).data;});assert.equal(bonuses.length,2);assert(bonuses.every(b=>b.paused_remaining_seconds>0));
 assert.equal(await page.evaluate(async()=>(await window.sanleanSupabase.auth.updateUser({password:'not-real'})).error.code),'LOCAL_UNAVAILABLE');
 await page.evaluate(()=>window.SanLeanUsuarioNavigation.show('giveaways'));await page.locator('#giveawayKeyword').fill('DEMO');await page.locator('#startGiveaway').click();await page.waitForFunction(()=>window.SanLeanStreamTools.getGiveaway());
 await page.locator('#localDevelopmentTools').evaluate(el=>el.open=true);await page.getByText('AGREGAR PARTICIPANTES DEMO',{exact:true}).click();await page.waitForFunction(()=>document.getElementById('slGiveawayLiveCount')?.textContent==='5');
 await page.evaluate(()=>window.SanLeanStreamTools.closeGiveaway());assert.equal(await page.evaluate(()=>window.SanLeanStreamTools.getGiveaway().status),'closed');
 await page.evaluate(()=>window.SanLeanUsuarioNavigation.show('votes'));await page.evaluate(()=>window.SanLeanCards.startTestRound({mode:'chat',role:'killer',platform:'twitch'}));await page.waitForTimeout(1000);
 await page.locator('#cardsStart').click();await page.getByText('SIMULAR VOTO A',{exact:true}).click();await page.waitForTimeout(1700);
 assert.equal(await page.locator('#cardsTotalVotes').textContent(),'1');await page.evaluate(()=>window.SanLeanCards.finishVoting());await page.locator('#cardsRevealWinner').click();console.log('PASS CARTAS vote and manual reveal');
 await page.goto(base+'cuenta.html');await page.waitForFunction(()=>document.getElementById('accountUsername').value==='demo_local');
 assert.equal(await page.locator('#collabCount').textContent(),'1');
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});await page.screenshot({path:path.resolve(root,'../local-account-'+width+'.png')});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 const saved=await page.evaluate(async()=>{const db=window.SanLeanConnectionsClient;await db.rpc('sanlean_owner_upsert_collaborator',{p_identifier:'nuevo_demo',p_permissions:['votes']});return (await db.rpc('sanlean_owner_list_collaborators')).data;});assert.equal(saved.length,2);
 await page.reload();await page.waitForFunction(()=>document.getElementById('collabCount').textContent==='2');
 await page.locator('#localDevelopmentTools').evaluate(el=>el.open=true);await page.getByText('VER COMO COLABORADOR',{exact:true}).click();await page.waitForFunction(()=>window.SanLeanAccess?.get().role==='collaborator');
 assert.equal(await page.evaluate(()=>window.SanLeanAccess.can('votes')),true);assert.equal(await page.evaluate(()=>window.SanLeanAccess.can('bits')),false);
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log('PASS persistence, overlays, giveaway, collaborators, roles, zero Supabase requests');
 const localhost=await context.newPage();await localhost.goto('http://localhost:4173/Usuario/');await localhost.waitForFunction(()=>window.SanLeanStreamTools?.getOverlays().length===9);assert.equal(await localhost.evaluate(()=>window.SanLeanLocal.active),true);await localhost.close();
 await context.close();
 // Production and deceptive hosts must not acquire the local adapter, regardless of flags.
 for(const host of ['sanlean.com.ar','localhost.evil.test','192.168.1.2']){
   const prod=await browser.newContext();await prod.route('**/*',async route=>{
     const u=new URL(route.request().url());
     if(u.pathname==='/Usuario/test.html')return route.fulfill({contentType:'text/html',body:'<html><head><script>localStorage.setItem("sanlean-local-development-v1","{}");localStorage.setItem("local","true");</script><script src="/js/usuario-local-dev.js"></script><script src="/js/supabase-config.js"></script><script>window.gtag=()=>{};window.supabase={createClient:(url,key)=>{window.realClientConfig={url,key};return {auth:{onAuthStateChange:()=>{}}};}};</script><script src="/js/sanlean-auth.js"></script></head><body></body></html>'});
     const file=path.join(root,u.pathname);try{return route.fulfill({body:fs.readFileSync(file),contentType:contentType(file)});}catch{return route.abort();}
   });const p=await prod.newPage();await p.goto('http://'+host+'/Usuario/test.html?local=1&demo=1');assert.equal(await p.evaluate(()=>!!window.SanLeanLocal),false);assert.equal(await p.evaluate(()=>window.SANLEAN_SUPABASE.url),'https://ugdwieebdgarkjrrpyal.supabase.co');assert.equal(await p.evaluate(()=>window.realClientConfig.url),'https://ugdwieebdgarkjrrpyal.supabase.co');await prod.close();
 }
 console.log('PASS production and deceptive host guards');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
