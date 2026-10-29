'use strict';
// The real server and both renderers share disposable data. No installed app is needed in CI.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process'),net=require('node:net'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const repo=path.resolve(__dirname,'..'),parent=path.join(repo,'test-results/dbd-release'),work=path.join(parent,'browser-'+crypto.randomUUID()),runtime=path.join(work,'runtime'),out=path.join(repo,'test-results/dbd-browser');
const pause=ms=>new Promise(r=>setTimeout(r,ms));let child,browser;
(async()=>{try{
 fs.mkdirSync(work,{recursive:true});fs.writeFileSync(path.join(work,'.sanlean-fixture.json'),'{"fixture":true}');fs.mkdirSync(out,{recursive:true});
 fs.cpSync(path.join(repo,'maintenance/dbd-content/streamer-runtime'),runtime,{recursive:true});fs.mkdirSync(path.join(runtime,'data'),{recursive:true});
 for(const name of ['killers','survivors','perks-killer','perks-survivor','perk-conflicts'])fs.copyFileSync(path.join(repo,'data',name+'.json'),path.join(runtime,'data',name+'.json'));
 fs.copyFileSync(path.join(repo,'js/dbd-catalog.js'),path.join(runtime,'public/js/dbd-catalog.js'));
 const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));const url='http://127.0.0.1:'+port;
 let log='';child=cp.spawn(process.execPath,[path.join(runtime,'server.cjs')],{windowsHide:true,env:{...process.env,SANLEAN_PORT:String(port),SANLEAN_OPEN_BROWSER:'0',SANLEAN_DATA_DIR:path.join(work,'personal-fixture')},stdio:'pipe'});child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);
 for(let i=0;i<100;i++){if(await fetch(url+'/health').then(r=>r.ok).catch(()=>false))break;if(child.exitCode!==null)throw Error(log);await pause(100);}
 browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});const ctx=await browser.newContext({viewport:{width:1440,height:1000}}),errors=[];
 await ctx.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!==url)return route.fulfill({status:200,body:''});const relative=decodeURIComponent(u.pathname).slice(1);if(!/^(?:css|js|assets|killer|survivor|survivors)\//.test(relative)&&!['rombo.png','logo.png'].includes(relative))return route.continue();const bundled=path.join(runtime,'public',relative),source=path.join(repo,relative);if(fs.existsSync(bundled))return route.continue();if(fs.existsSync(source)&&fs.statSync(source).isFile())return route.fulfill({path:source});return route.fulfill({status:200,body:''});});
 const panel=await ctx.newPage(),obs=await ctx.newPage();for(const page of [panel,obs])page.on('pageerror',e=>errors.push(e.message));const get=async()=> (await(await fetch(url+'/api/tools')).json()).state;
 const act=async(tool,type,extra={})=>{const r=await fetch(url+'/api/tools/action',{method:'POST',headers:{Origin:url,'Content-Type':'application/json','X-SanLean-Standalone':'1'},body:JSON.stringify({tool,type,...extra})});const packet=await r.json();assert(r.ok,packet.error);return packet.state;};
 const checks=[];
 for(const [tool,catalog] of [['killer-wheel','killers'],['perks-killer','perks-killer'],['perks-survivor','perks-survivor']]){
  const rows=JSON.parse(fs.readFileSync(path.join(runtime,'data',catalog+'.json'))).filter(i=>i.enabled!==false&&!i.emptySlot&&i.key!=='slot_vacio'),key=rows[0].key;
  await panel.goto(url+'/#'+tool);await panel.waitForFunction(()=>window.toolsState).catch(async e=>{throw Error(e.message+' '+await panel.locator('#inicio .stream-module-head p:last-child').innerText()+' '+errors.join('; '));});for(const name of ['LC','SANLEAN'])await act(tool,'add',{key,name});await act(tool,'generate');await act(tool,'spin');await obs.goto(url+'/obs/'+tool);
  await panel.waitForFunction(t=>window.toolsState?.tools[t].state.status==='spinning',tool);await obs.waitForFunction(()=>window.wheelState?.state.status==='spinning');const authoritative=(await get()).tools[tool].state,a=await panel.evaluate(t=>window.toolsState.tools[t].state,tool),b=await obs.evaluate(()=>window.wheelState.state);
  for(const field of ['spinId','spinSequence','targets','startedAt','durationMs']){assert.deepEqual(a[field],authoritative[field]);assert.deepEqual(b[field],authoritative[field]);}
  if(tool==='killer-wheel'){
   assert.equal(authoritative.visualDeck.length,rows.length+2);assert.equal(new Set(authoritative.visualDeck.map(e=>e.entryId)).size,rows.length+2);assert.equal(authoritative.visualDeck.filter(e=>e.killer.key===key).length,3);
   const rendered=page=>page.locator('.sl-killer-track .sl-killer-card').evaluateAll(nodes=>nodes.map(e=>({id:e.dataset.entryId,key:e.dataset.key,donor:e.querySelector('.sl-killer-card-donor')?.textContent||null})));
   const expected=authoritative.spinSequence.map(e=>({id:e.entryId,key:e.killer.key,donor:e.donor}));assert.deepEqual(await rendered(panel),expected);assert.deepEqual(await rendered(obs),expected);
  }else assert.equal(new Set(a.targets.map(i=>i.key)).size,4);
  await panel.waitForFunction(t=>window.toolsState.tools[t].state.status==='result',tool,{timeout:30000});await obs.waitForFunction(()=>window.wheelState.state.status==='result',{timeout:30000});
  assert.deepEqual((await panel.evaluate(t=>window.toolsState.tools[t].state,tool)).targets,await obs.evaluate(()=>window.wheelState.state.targets));checks.push({tool,panelEqualsOBS:true,lateJoin:true,uniqueBuild:tool!=='killer-wheel'});
 }
 await panel.screenshot({path:path.join(out,'streamer-release-panel.png')});await obs.screenshot({path:path.join(out,'streamer-release-obs.png')});assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'streamer-release-report.json'),JSON.stringify({passed:true,checks},null,2));console.log('PASS real server, real tickets, PANEL = OBS, late join, donors and both unique perk builds');
}finally{await browser?.close();if(child&&child.exitCode===null){const done=new Promise(r=>child.once('exit',r));child.kill();await done;}assert(path.resolve(work).startsWith(path.resolve(parent)+path.sep));fs.rmSync(work,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
