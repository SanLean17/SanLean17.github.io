const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:520,height:220}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  let snapshot={kind:'challenge_streak',state:{role:'survivor',current:123,status:'active',visible:true},settings:{}};
  await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname==='fixture.test'){const f=path.join(root,u.pathname);return r.fulfill({path:f,contentType:({'.css':'text/css','.js':'text/javascript','.html':'text/html','.png':'image/png','.json':'application/json'})[path.extname(f)]})}if(u.pathname.includes('/rest/v1/rpc/'))return r.fulfill({contentType:'application/json',body:JSON.stringify([snapshot])});return r.abort()});
  await page.goto('https://fixture.test/Usuario/overlay.html?token=fixture');
  await page.waitForSelector('.sl-streak-number');await page.emulateMedia({reducedMotion:'reduce'});
  const killer=JSON.parse(fs.readFileSync(path.join(root,'data/killers.json'),'utf8')).find(k=>k.key==='oni');
  for(const width of [720,520,320])for(const role of ['survivor','killer'])for(const layout of ['image-left','image-right']){
   await page.setViewportSize({width,height:220});snapshot.state={...snapshot.state,role,layout,killer:{...killer,image:'../'+killer.image}};
   await page.waitForFunction(({role,layout})=>document.querySelector('.sl-streak-view')?.dataset.role===role&&document.querySelector('.sl-streak-main').classList.contains('is-image-right')===(layout==='image-right'),{role,layout});
   await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
   const geometry=await page.evaluate(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect(),t=rect('.sl-streak-title'),i=rect('.sl-streak-image'),n=rect('.sl-streak-number');return{gap:i.top-t.bottom,height:i.height,left:Math.min(i.left,n.left),right:Math.max(i.right,n.right),bottom:Math.max(i.bottom,n.bottom),bg:getComputedStyle(document.body).backgroundColor}});
   assert(geometry.left>=0&&geometry.right<=width&&geometry.bottom<=220);
   assert.equal(geometry.bg,'rgba(0, 0, 0, 0)');
   if(role==='survivor'){assert(geometry.gap<=0,'Survivor block joins title');assert(geometry.height<=118)}else assert(geometry.height>=134);
   if(process.env.QA_OUTPUT){fs.mkdirSync(process.env.QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QA_OUTPUT,`streak-${role}-${layout}-${width}.png`),omitBackground:true})}
  }
  // Execute the unchanged OVERLAYS OBS renderer with isolated workspaces and tokens.
  const panel=await browser.newPage();await panel.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<select id="workspaceSelect"></select><div id="overlayGrid"></div>'}));await panel.goto('https://fixture.test/Usuario/test.html');
  await panel.evaluate(()=>{
   const kinds=['roulette_killers','roulette_killer_perks','roulette_survivor_perks','vote','challenge_goal','challenge_streak','challenge_all_killers','giveaway'];
   window.SANLEAN_SUPABASE={url:'fixture',publishableKey:'fixture'};
   window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:'collaborator'}}}}),onAuthStateChange:()=>{}},from:table=>{
    const q={select:()=>q,eq:()=>q,order:()=>Promise.resolve({data:table==='streamer_workspaces'?[{id:'workspace-test',name:'TEST',owner_user_id:'owner'}]:kinds.map(kind=>({id:kind,kind,public_token:'public-'+kind,control_token:'private-'+kind,state:{status:'paused',visible:false},settings:{}}))}),maybeSingle:async()=>({data:null})};return q;
   }})};
  });
  await panel.addScriptTag({content:fs.readFileSync(path.join(root,'js/stream-tools.js'),'utf8')});await panel.evaluate(()=>window.dispatchEvent(new Event('DOMContentLoaded')));
  await panel.waitForSelector('.overlay-card');
  for(const [kind,label]of [['challenge_goal','META'],['challenge_streak','WIN STREAK']]){
   const card=panel.locator('.overlay-card').filter({has:panel.getByRole('heading',{name:label,exact:true})});
   assert.equal(await card.locator('input').first().inputValue(),'https://fixture.test/Usuario/overlay.html?token=public-'+kind);
  }
  assert.deepEqual(errors,[]);console.log('PASS: compact survivor, unchanged killer, both orientations at 720/520/320, transparency, META and WIN STREAK URLs in OVERLAYS OBS.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
