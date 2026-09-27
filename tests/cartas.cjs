/* Run: NODE_PATH=<directory containing playwright> node tests/cartas.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const http=require('node:http');
const {webcrypto}=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const json=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const manifest=json('data/cards-assets.json');
const files=new Set([...Object.values(manifest.results),...Object.values(manifest.chaoticResults)]);
assert.equal(files.size,19);for(const file of files)assert(fs.existsSync(path.join(root,'cartas',file)),file);
const storage=new Map(),writes=[];let failResult=false;
const client={auth:{onAuthStateChange(){}},from(table){let payload;
  const chain={select(){return chain},eq(){return chain},update(p){payload=p;return chain},maybeSingle:async()=>({data:{settings:{weights:{}}}}),single:async()=>{if(failResult&&payload?.state?.status==='result')return{error:Error('offline')};writes.push({table,payload});return{data:{id:'overlay',kind:'roulette_survivor_perks',settings:{}}}}};return chain;
}};
const context={window:{SANLEAN_SUPABASE:{url:'https://example.test',publishableKey:'public'},supabase:{createClient:()=>client},addEventListener(){},dispatchEvent(){}},CustomEvent:function(type,options){this.type=type;this.detail=options?.detail},document:{getElementById:()=>null},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},navigator:{},location:{origin:'https://example.test'},crypto:webcrypto,console,setTimeout:(fn)=>setTimeout(fn,0),clearTimeout,clearInterval,fetch:async url=>({ok:true,json:async()=>json(url.replace('../',''))})};
context.window.window=context.window;vm.createContext(context);
let source=fs.readFileSync(path.join(root,'js/stream-tools.js'),'utf8');
source=source.replace('  window.SanLeanStreamTools=',"  window.test={normalSelection,itemsForCardRule,spinOverlay,queueCards,flushCards,setWorkspace:(id)=>workspace={id,owner_user_id:'user'},setup:()=>{workspace={id:'w1',owner_user_id:'user'};session={user:{id:'user'}};overlays=[{id:'overlay',workspace_id:'w1',kind:'roulette_survivor_perks',settings:{}},{id:'vote-overlay',workspace_id:'w1',kind:'vote'}]}};\n  window.SanLeanStreamTools=");
vm.runInContext(source,context);
const api=context.window.test;api.setup();
const setRule=(role,rule,id='r1')=>storage.set('sanlean-cards-pending-roulette',JSON.stringify({source:'cards',workspaceId:'w1',roundId:id,role,rule}));
const catalog=role=>{const all=json(`data/perks-${role}.json`).map(x=>({...x,weight:1}));return{all,enabled:all}};
async function testRules(){
  const onlyKiller=catalog('killer').all[1];
  assert.equal((await api.normalSelection('roulette_killers',[onlyKiller],1))[0].key,onlyKiller.key);
  await assert.rejects(api.normalSelection('roulette_survivor_perks',catalog('survivor').all.slice(1,4),4));
  for(let i=0;i<80;i++){
    const result=await api.normalSelection('roulette_survivor_perks',catalog('survivor').enabled,4);
    assert.equal(new Set(result.map(x=>x.key)).size,4);
    assert(json('data/perk-conflicts.json').survivor.every(g=>result.filter(x=>g.includes(x.key)).length<=1));
  }
  for(const role of ['survivor','killer']){
    const cat=catalog(role),kind=role==='killer'?'roulette_killer_perks':'roulette_survivor_perks';
    for(let count=0;count<=4;count++){
      setRule(role,{kind:'count',count});const result=await api.itemsForCardRule(kind,cat);
      assert.equal(result.items.length,count);assert(result.items.every(x=>!x.emptySlot));
    }
    for(const category of role==='killer'?['totem','aura','obsession']:['totem','aura']){
      setRule(role,{kind:'category',category,count:4});
      const result=await api.itemsForCardRule(kind,{all:cat.all,enabled:[]});
      assert.equal(result.items.length,4);assert(result.items.every(x=>json('data/perk-categories.json')[role][category].includes(x.key)));
    }
    for(let i=0;i<60;i++){
      setRule(role,{kind:'quality_mix',weak:2,strong:1,random:1});const result=await api.itemsForCardRule(kind,cat);
      assert.equal(new Set(result.items.map(x=>x.key)).size,4);
      assert(result.items.slice(0,2).every(x=>json('data/perk-categories.json')[role].weak.includes(x.key)));
      assert(json('data/perk-categories.json')[role].strong.includes(result.items[2].key));
      assert(result.items.every(x=>!x.emptySlot));
    }
  }
  for(const second of ['slot_vacio','32_objectOfObsession']){
    for(let i=0;i<60;i++){
      setRule('survivor',{kind:'fixed_random',fixed:['30_noMither',second],random:2});
      const result=await api.itemsForCardRule('roulette_survivor_perks',catalog('survivor'));
      assert.equal(new Set(result.items.map(x=>x.key)).size,4);assert.equal(result.items[0].key,'30_noMither');assert.equal(result.items[1].key,second);
      assert(result.items.slice(2).every(x=>!x.emptySlot&&!['42_selfCare','76_forThePeople','95_circleOfHealing'].includes(x.key)));
    }
  }
  setRule('survivor',{kind:'count',count:4});await assert.rejects(api.itemsForCardRule('roulette_survivor_perks',{all:catalog('survivor').all,enabled:[]}));
  api.setWorkspace('w2');assert.equal(await api.itemsForCardRule('roulette_survivor_perks',catalog('survivor')),null);api.setup();
  const first=api.spinOverlay('overlay'),second=api.spinOverlay('overlay');assert.equal(await second,false);assert.equal(await first,true);assert.equal(storage.size,0);
  setRule('survivor',{kind:'no_loadout',count:0,noAddons:true});assert.equal(await api.spinOverlay('overlay'),true);assert.equal(writes.at(-1).payload.state.items.length,0);assert.equal(writes.at(-1).payload.state.cardRule.noAddons,true);
  setRule('survivor',{kind:'count',count:2});failResult=true;assert.equal(await api.spinOverlay('overlay'),false);assert(storage.size);failResult=false;
  const beforeSync=writes.length;
  for(let i=0;i<3;i++){
    api.queueCards({workspaceId:'w1',state:'active',secondsLeft:30-i,cards:[]});
    await new Promise(r=>setTimeout(r,15));
  }
  assert.equal(writes.length-beforeSync,3);
  api.queueCards({workspaceId:'w2',state:'active',cards:[]});await new Promise(r=>setTimeout(r,15));assert.equal(writes.length-beforeSync,3);
  console.log('PASS: assets, categories, fixed slots, exclusions, unique perks, workspace scope, concurrent spin, one-use and failed-write retention');
}
const harness=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="../css/usuario-cartas.css"></head><body class="user-page" style="background:#121216;color:white;margin:0"><div id="streamVotesPanel"></div><script>window.spins=0;window.SanLeanStreamTools={getWorkspace:()=>({id:'w1'}),spinByRole:async()=>{window.spins++;await new Promise(r=>setTimeout(r,20));return true}};</script><script src="../js/cards-view.js"></script><script src="../js/usuario-cartas.js"></script></body></html>`;
async function browserTests(){
  const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname==='/Usuario/roulette-test.html'){res.setHeader('Content-Type','text/html');res.end(require('./roulette-harness.cjs'));return}if(pathname==='/Usuario/test.html'){res.setHeader('Content-Type','text/html');res.end(harness);return}const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.statusCode=404;res.end();return}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'})[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file))});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,channel:process.env.CARTAS_BROWSER||'msedge'});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install();await page.goto(base+'/Usuario/test.html');await page.waitForFunction(()=>window.SanLeanCards);
    assert.equal(await page.evaluate(()=>SanLeanCards.chaosProbability),0.15);assert.equal(await page.locator('#cardsEvent').count(),0);
    await page.evaluate(()=>{SanLeanCards.startNormal();SanLeanCards.registerChatMessage({platform:'twitch',userId:'a',message:'A'});SanLeanCards.registerChatMessage({platform:'twitch',userId:'a',message:'B'})});
    assert.equal(await page.evaluate(()=>SanLeanCards.getSnapshot().totalVotes),1);
    assert(await page.evaluate(()=>SanLeanCards.getSnapshot().cards.every(c=>!c.revealed&&!c.image&&!c.label&&!c.resultId)));
    await page.clock.runFor(31000);assert.equal(await page.evaluate(()=>SanLeanCards.getSnapshot().state),'awaiting-reveal');assert.equal(await page.locator('.sl-diamond-art').count(),0);
    await page.locator('#cardsRevealWinner').click();assert.equal(await page.locator('.sl-diamond-art').count(),1);
    await page.locator('#cardsRevealAll').click();assert.equal(await page.locator('.sl-diamond-art').count(),5);
    // Tie must preserve all five results, and finishing never reveals.
    await page.evaluate(()=>{SanLeanCards.startNormal();SanLeanCards.registerVote('a','A');SanLeanCards.registerVote('b','B');window.tieIds=SanLeanCards.getRound().cards.map(c=>c.result.id).join()});
    await page.clock.runFor(31000);assert.equal(await page.evaluate(()=>SanLeanCards.getSnapshot().state),'tie');await page.locator('#cardsRepeat').click();assert.equal(await page.evaluate(()=>SanLeanCards.getRound().cards.map(c=>c.result.id).join()===window.tieIds),true);
    // Hundreds of rounds: five unique options, role-correct and at least one special.
    assert.equal(await page.evaluate(()=>{for(const role of ['survivor','killer']){document.getElementById('cardsRole').value=role;for(let i=0;i<200;i++){SanLeanCards.startChaotic();const r=SanLeanCards.getRound();if(new Set(r.cards.map(c=>c.result.id)).size!==5||!r.cards.some(c=>c.result.type==='chaos')||r.cards.some(c=>c.result.type==='chaos'&&!c.result.id.startsWith(role)))return false}}return true}),true);
    await page.evaluate(()=>{SanLeanCards.startChaotic();SanLeanCards.registerChatMessage({platform:'twitch',userId:'a',message:'A'});SanLeanCards.registerChatMessage({platform:'twitch',userId:'a',message:'A'});SanLeanCards.registerChatMessage({platform:'kick',userId:'a',message:'A'})});assert.equal(await page.evaluate(()=>SanLeanCards.getSnapshot().totalVotes),2);
    await page.locator('[data-segment-value="manual"]').click();await page.locator('#cardsStart').click();await page.locator('[data-card="B"]').click();assert.equal(await page.locator('.sl-diamond-art').count(),0);await page.locator('#cardsRevealWinner').click();await page.locator('#cardsContinue').click();await page.clock.fastForward(30);await page.evaluate(()=>document.getElementById('cardsContinue').click());assert.equal(await page.evaluate(()=>window.spins),0);
    const artifacts=process.env.CARTAS_ARTIFACTS;if(artifacts)fs.mkdirSync(artifacts,{recursive:true});
    for(const [width,height] of [[1920,1080],[1280,720],[640,360],[390,844]]){
      await page.setViewportSize({width,height});await page.goto(base+'/Usuario/overlay.html?demo=chaotic&reveal=all');await page.waitForSelector('.sl-diamond-art');
      await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
      await page.clock.runFor(800);
      assert.equal(await page.locator('#obsControl').isVisible(),false);assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgba(0, 0, 0, 0)');
      const bounds=await page.locator('.sl-diamond-caption').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom}}));
      for(const b of bounds)assert(b.x>=0&&b.y>=0&&b.right<=width&&b.bottom<=height,JSON.stringify({width,height,b}));
      if(artifacts)await page.screenshot({path:path.join(artifacts,`obs-${width}.png`),omitBackground:true,animations:'disabled'});
    }
    await page.goto(base+'/Usuario/overlay.html?demo=normal');await page.waitForSelector('.sl-diamond-letter');assert.equal(await page.locator('.sl-diamond-art').count(),0);
    for(const demo of ['killers','killer-perks','survivor-perks']){
      await page.setViewportSize({width:1280,height:720});await page.goto(base+`/Usuario/overlay.html?demo=${demo}&spin=1`);await page.waitForSelector('.sl-roulette.is-spinning');
      await page.clock.runFor(4400);await page.waitForSelector('.sl-roulette:not(.is-spinning)');
      assert.equal(await page.locator('.sl-roulette-slot').count(),demo==='killers'?1:4);
      await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
      if(artifacts)await page.screenshot({path:path.join(artifacts,`${demo}.png`),omitBackground:true,animations:'disabled'});
      await page.setViewportSize({width:390,height:844});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }
    await page.goto(base+'/Usuario/roulette-test.html');await page.waitForFunction(()=>window.SanLeanStreamTools?.getOverlays().length===5);
    await page.locator('#privateRouletteSpin').waitFor({state:'visible'});
    // Only one enabled killer must always win; configured entries reach the private controller.
    await page.evaluate(async()=>{const catalog=await (await fetch('../data/killers.json')).json();fixtureSettings.weights=Object.fromEntries(catalog.map(x=>['killers:'+x.key,x.key==='trapper'?1:0]));localStorage.removeItem('sanlean-cards-pending-roulette')});
    await page.locator('#privateRouletteSpin').click();await page.waitForSelector('.sl-roulette.is-spinning');await page.clock.runFor(4400);
    await page.waitForFunction(()=>fixtureRows.find(x=>x.kind==='roulette_killers').state.status==='result');
    assert.equal(await page.evaluate(()=>fixtureRows.find(x=>x.kind==='roulette_killers').state.items[0].key),'trapper');
    for(const [section,kind] of [['survivor','roulette_survivor_perks'],['killerPerks','roulette_killer_perks']]){
      await page.evaluate(key=>SanLeanPanel.selectSection(key),section);await page.waitForFunction(()=>!document.getElementById('privateRouletteSpin').disabled);
      await page.locator('#privateRouletteSpin').click();await page.waitForSelector('.sl-roulette.is-spinning');await page.clock.runFor(4400);
      await page.waitForFunction(k=>fixtureRows.find(x=>x.kind===k).state.status==='result',kind);
      assert.equal(await page.evaluate(k=>new Set(fixtureRows.find(x=>x.kind===k).state.items.map(x=>x.key)).size,kind),4);
    }
    // Two perks from CARTAS: four visual slots, two inactive, consumes exactly once.
    await page.evaluate(()=>{localStorage.setItem('sanlean-cards-pending-roulette',JSON.stringify({source:'cards',workspaceId:'w1',role:'survivor',roundId:'count-two',label:'2 PERKS',rule:{kind:'count',count:2}}));SanLeanPanel.selectSection('survivor')});
    await page.locator('#privateRouletteSpin').click();await page.waitForSelector('.sl-roulette.is-spinning');await page.clock.runFor(4400);await page.waitForFunction(()=>!document.getElementById('privateRouletteSpin').disabled);
    assert.equal(await page.locator('.sl-roulette-slot.is-inactive').count(),2);assert.equal(await page.evaluate(()=>localStorage.getItem('sanlean-cards-pending-roulette')),null);
    await page.locator('#privateRouletteHide').click();assert.equal(await page.evaluate(()=>fixtureRows.find(x=>x.kind==='roulette_survivor_perks').state.visible),false);
    assert.deepEqual(errors,[]);console.log('PASS: CARTAS, 400 chaotic rounds, three private controls, disabled killer exclusion, one-use pending rule, four-slot view, hide, OBS transparency and responsive bounds');
  }finally{await browser.close();server.close()}
}
(async()=>{await testRules();await browserTests()})().catch(e=>{console.error(e);process.exitCode=1});

