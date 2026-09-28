const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pub=read('js/main.js'),privateCode=read('js/roulette-view.js');
const publicShuffle=pub.split('\n').find(s=>s.includes('function noAdjacent')).trim();
assert(privateCode.includes(publicShuffle),'Public sequencing function must remain verbatim');
const context={window:{},location:{href:'http://localhost/Usuario/overlay.html'},URL,Map,Set,Math};vm.createContext(context);
vm.runInContext(privateCode.replace('window.SanLeanRouletteView={render,preload}', 'window.SanLeanRouletteView={render,killerEntries,prepareKillerDeck}'),context);
const api=context.window.SanLeanRouletteView;
const catalog=JSON.parse(read('data/killers.json')).map(x=>({...x,weight:1,image:'../'+x.image}));
for(const weights of [[1,1],[99,1],[5,5,1],[1,1,1,1],Array(40).fill(1)]){
 const pool=catalog.slice(0,weights.length).map((x,i)=>({...x,weight:weights[i],donors:['DONANTE']}));
 for(let run=0;run<50;run++){
  const entries=api.killerEntries(pool),min=Math.max(100,entries.length*10),index=min-7,winner=pool[run%pool.length];
  const deck=api.prepareKillerDeck(entries,min,index,winner);
  assert.equal(deck[index].killer.key,winner.key);
  assert(deck.every((e,i)=>!i||e.killer.key!==deck[i-1].killer.key));
  assert(deck.every(e=>pool.some(x=>x.key===e.killer.key)));
 }
}
assert.equal(api.prepareKillerDeck(api.killerEntries([catalog[0]]),100,93,catalog[0]).length,1);
assert.equal(api.prepareKillerDeck([],100,93).length,0);
const server=http.createServer((req,res)=>{try{const file=path.join(root,decodeURIComponent(req.url.split('?')[0]));res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end()}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  await page.goto(base+'/ruleta-killer.html');await page.waitForSelector('.killer-card');
  const publicStyle=await page.locator('.killer-card').first().evaluate(c=>{const s=getComputedStyle(c),n=getComputedStyle(c.querySelector('.killer-card-name')),p=getComputedStyle(c.querySelector('.killer-card-portrait'));return [s.width,s.height,n.color,n.fontSize,n.minHeight,n.boxSizing,p.filter,p.objectFit]});
  await page.click('#spinKillerBtn');
  const publicAnimation=await page.locator('#killerDomTrack').evaluate(t=>{const a=t.getAnimations()[0];return {frames:a.effect.getKeyframes(),timing:a.effect.getTiming()}});
  await page.goto(base+'/Usuario/overlay.html');
  await page.evaluate(()=>document.getElementById('obsOverlayRoot').classList.remove('obs-hidden'));
  const paint=async(status,spinId='qa',pool=catalog)=>page.evaluate(({status,spinId,pool})=>{window.qaData={kind:'roulette_killers',settings:{pool},state:{visible:true,status,spinId,targets:[pool[0]],items:status==='result'?[pool[0]]:[],spinPool:pool,durationMs:8000}};SanLeanRouletteView.render(document.getElementById('obsStage'),qaData)}, {status,spinId,pool});
  await paint('ready');
  const privateStyle=await page.locator('.sl-killer-card').first().evaluate(c=>{const s=getComputedStyle(c),n=getComputedStyle(c.querySelector('.sl-killer-card-name')),p=getComputedStyle(c.querySelector('.sl-killer-card-portrait'));return [s.width,s.height,n.color,n.fontSize,n.minHeight,n.boxSizing,p.filter,p.objectFit]});assert.deepEqual(privateStyle.slice(0,6),publicStyle.slice(0,6));assert.equal(privateStyle[6],'brightness(1.18) contrast(1.035)');
  for(const width of [1920,1280,800,640,390]){
   await page.setViewportSize({width,height:600});await page.waitForTimeout(80);
   const geometry=await page.locator('.sl-killer-web-reel').evaluate(reel=>{const r=reel.getBoundingClientRect();return {width:r.width,visible:[...reel.querySelectorAll('.sl-killer-card')].filter(c=>{const b=c.getBoundingClientRect();return b.right>r.left&&b.left<r.right}).length}});
   assert.equal(geometry.visible,7,JSON.stringify({width,geometry}));assert(geometry.width<=width+.1);
  }
  await page.setViewportSize({width:1920,height:1080});await paint('spinning');await page.waitForFunction(()=>document.querySelector('.sl-killer-track')?.getAnimations().length);
  const privateAnimation=await page.locator('.sl-killer-track').evaluate(t=>{const a=t.getAnimations()[0];return {frames:a.effect.getKeyframes(),timing:a.effect.getTiming()}});
  assert.deepEqual(privateAnimation,publicAnimation);
  const samples=[];
  for(const ms of [0,4800,6720,7600,7999])samples.push(await page.locator('.sl-killer-track').evaluate((t,ms)=>{t.getAnimations()[0].pause();t.getAnimations()[0].currentTime=ms;return getComputedStyle(t).transform},ms));
  await paint('result');assert.equal(await page.locator('.sl-killer-track').evaluate(t=>t.getAnimations().length),1,'Result must preserve active braking');
  await page.locator('.sl-killer-track').evaluate(t=>t.getAnimations()[0].finish());await page.waitForTimeout(400);
  assert.equal(await page.locator('.sl-killer-card.selected').getAttribute('data-key'),catalog[0].key);
  const out=process.env.QA_OUTPUT||path.join(root,'..','killer-parity-results');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'obs-1920.png')});
  assert.equal(await page.locator('h1,h2').count(),0);
  // Same winner after reloading the source, then a new spin excluding that killer.
  await page.evaluate(()=>{document.getElementById('obsStage').dataset.rouletteSignature='';document.getElementById('obsStage')._slKillerSpin=null});await paint('result');
  assert.equal(await page.locator('.sl-killer-card.selected').getAttribute('data-key'),catalog[0].key);
  await paint('spinning','qa-next',catalog.slice(1));await page.waitForFunction(()=>document.querySelector('.sl-killer-track')?.getAnimations().length);assert.equal(await page.locator(`.sl-killer-card[data-key="${catalog[0].key}"]`).count(),0);
  await paint('ready','one',[catalog[0]]);assert.equal(await page.locator('.sl-killer-card').count(),1);
  console.log(JSON.stringify({ok:true,sequenceRuns:250,widths:[1920,1280,800,640,390],publicStyle,animationDuration:privateAnimation.timing.duration,samples}));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
