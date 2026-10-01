// Isolated browser fixtures. No real user data or network requests.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900}});
   await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));
   await page.goto('https://fixture.test/Usuario/overlay.html?token=fixture-view');
   await page.setContent('<main id="obsOverlayRoot"><section id="obsStage"></section></main><div id="obsControl"><button id="obsSpin"></button><button id="obsHide"></button></div>');
   await page.evaluate(()=>{
    window.calls=[];window.scheduled=[];window.rendered=[];window.fail=false;
    window.SANLEAN_SUPABASE={url:'https://db.test',publishableKey:'fixture-publishable'};
    window.row={overlay_id:'one',kind:'roulette_killers',settings:{pool:[{key:'a'}]},state:{visible:true,status:'spinning',spinId:'one'},can_control:false};
    window.SanLeanRouletteView={render:(_,data)=>rendered.push(structuredClone(data))};
    const timeout=window.setTimeout;
    window.setTimeout=(fn,ms,...args)=>fn.name==='poll'?(scheduled.push({fn,ms}),1):timeout(fn,ms,...args);
    window.fetch=async(url,options)=>{calls.push({url,body:JSON.parse(options.body),headers:options.headers,timeout:!!options.signal});if(fail)return{ok:false,status:503};return{ok:true,json:async()=>url.endsWith('update_stream_overlay_by_control')?true:[structuredClone(row)]}};
    window.step=async()=>{const next=scheduled.shift();await next.fn();return next.ms};
   });
   await page.addScriptTag({path:path.join(root,'js/stream-overlay.js')});
   await page.waitForFunction(()=>scheduled.length===1);
   assert.equal(await page.evaluate(()=>calls.length),1);
   assert.equal(await page.evaluate(()=>calls[0].url),'https://db.test/rest/v1/rpc/get_stream_overlay_by_token');
   assert.equal(await page.evaluate(()=>calls[0].body.p_token),'fixture-view');
   assert.equal(await page.evaluate(()=>calls[0].timeout),true);
   assert.equal(await page.locator('#obsControl').isHidden(),true);
   await page.evaluate(()=>document.getElementById('obsHide').click());
   assert.equal(await page.evaluate(()=>calls.length),1,'View token cannot invoke control through UI');
   await page.evaluate(async()=>{row.settings.pool=[{key:'b'}];await step()});
   assert.equal(await page.evaluate(()=>rendered.at(-1).settings.pool[0].key),'b','Same-size pool edits propagate');
   assert.equal(await page.evaluate(()=>scheduled[0].ms),500);
   await page.evaluate(async()=>{row.state.status='result';row.can_control=true;await step()});
   assert.equal(await page.evaluate(()=>rendered.at(-1).state.status),'result');
   await page.locator('#obsHide').click();
   assert.equal(await page.evaluate(()=>calls.at(-1).body.p_state.visible),false);
   await page.evaluate(async()=>{fail=true;for(let i=0;i<8;i++)await step()});
   assert.equal(await page.evaluate(()=>scheduled.length),1,'One serial polling chain');
   assert.equal(await page.evaluate(()=>scheduled[0].ms),30000,'Backoff is capped');
   await page.evaluate(async()=>{fail=false;row.state.visible=false;await step()});
   assert.equal(await page.evaluate(()=>scheduled[0].ms),500,'Recovery restores normal cadence');
   assert.equal(await page.evaluate(()=>calls.some(c=>c.url.includes('/functions/'))),false);
   await page.close();
  }
  for(const mode of ['alert','active']){
   const page=await browser.newPage();
   await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));
   await page.goto('https://fixture.test/Usuario/alertas.html?token=fixture&mode='+mode);
   await page.setContent('<main id="bitsAlertStage" hidden></main><aside id="bitsActiveDock" hidden></aside>');
   await page.evaluate(()=>{
    window.SANLEAN_SUPABASE={url:'https://db.test'};window.calls=[];window.scheduled=[];window.fail=false;
    window.payload={cursor:'100',events:[],active:[],sound:false,timersPaused:false};
    const timeout=window.setTimeout;
    window.setTimeout=(fn,ms,...args)=>fn.name==='poll'?(scheduled.push({fn,ms}),1):timeout(fn,ms,...args);
    window.fetch=async url=>{if(!url.includes('/stream-bits/alerts'))return{ok:false};calls.push(url);if(fail)return{ok:false,status:503};return{ok:true,json:async()=>structuredClone(payload)}};
    window.step=async()=>{const next=scheduled.shift();await next.fn();return next.ms};
   });
   await page.addScriptTag({path:path.join(root,'js/bits-alert.js')});
   await page.waitForFunction(()=>scheduled.length===1);
   assert.equal(await page.evaluate(()=>scheduled[0].ms),mode==='active'?5000:2000);
   await page.evaluate(async()=>{fail=true;await step();await step()});
   assert.equal(await page.evaluate(()=>scheduled[0].ms),mode==='active'?20000:8000);
   await page.evaluate(async()=>{fail=false;payload.cursor='101';payload.events=[{id:'101',donor:'PRUEBA',bits:300,quantity:1,item_name:'AGITACIÓN',alert_style:'neutral'}];payload.active=[{donor:'PRUEBA',quantity:1,item_name:'AGITACIÓN',expires_at:null}];await step()});
   assert((await page.evaluate(()=>calls.at(-1))).includes('after=100'),'Cursor survives failed requests');
   assert.equal(await page.locator(mode==='active'?'#bitsActiveDock':'#bitsAlertStage').isVisible(),true);
   assert.equal(await page.evaluate(()=>scheduled.length),1);
   await page.close();
  }
  const panel=await browser.newPage();
  await panel.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));
  await panel.goto('https://fixture.test/Usuario/index.html');
  await panel.setContent('<section id="streamBitsPanel" hidden><strong id="bitsActivationState">UNCHANGED</strong></section><script data-sanlean-canonical-selects></script>');
  await panel.evaluate(()=>{
   window.intervals=[];window.calls=[];window.workspaceId='one';window.release=null;
   window.setInterval=(fn,ms)=>(intervals.push({fn,ms}),intervals.length);
   window.SANLEAN_SUPABASE={url:'https://db.test'};
   window.SanLeanStreamTools={getWorkspace:()=>({id:workspaceId}),isOwner:()=>true};
   window.SanLeanAccount={session:async()=>({access_token:'fixture'})};
   window.fetch=async(url,options)=>{calls.push(JSON.parse(options.body));return new Promise(resolve=>{window.release=()=>resolve({ok:true,json:async()=>({activationsPaused:true})})})};
   window.tick=()=>intervals.find(x=>x.ms===30000).fn();
  });
  await panel.addScriptTag({path:path.join(root,'js/usuario-bits-overlays.js')});
  await panel.evaluate(()=>tick());
  assert.equal(await panel.evaluate(()=>calls.length),0,'Hidden Bits section does not poll');
  await panel.evaluate(()=>{document.getElementById('streamBitsPanel').hidden=false;tick()});
  await panel.waitForFunction(()=>calls.length===1);
  await panel.evaluate(()=>{tick();tick()});
  assert.equal(await panel.evaluate(()=>calls.length),1,'Slow status requests cannot overlap');
  await panel.evaluate(()=>{workspaceId='two';release()});
  await panel.waitForTimeout(30);
  assert.equal(await panel.locator('#bitsActivationState').textContent(),'UNCHANGED','Old workspace response discarded');
  await panel.evaluate(()=>tick());
  await panel.waitForFunction(()=>calls.length===2);
  await panel.evaluate(()=>release());
  await panel.waitForFunction(()=>document.getElementById('bitsActivationState').textContent==='REGLAS PAUSADAS');
  await panel.close();
  console.log('PASS: desktop/mobile RPC rendering, view/control separation, pool updates, backoff/recovery, zero overlay Edge calls, Bits cursor and both overlay modes');
  console.log('PASS: hidden panel skips polling, slow requests cannot overlap, workspace switches discard stale results');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
