const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{try{const file=path.join(root,decodeURIComponent(req.url.split('?')[0]));res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file))}catch{res.writeHead(404);res.end()}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/roulette-private/'))requests.push(r.url())});
  await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  await page.goto(base+'/Usuario/overlay.html');
  await page.evaluate(async()=>{
   document.getElementById('obsOverlayRoot').classList.remove('obs-hidden');
   window.qaPool=(await(await fetch('../data/perks-killer.json')).json()).filter(x=>!x.emptySlot&&x.key!=='slot_vacio').slice(0,12).map(x=>({...x,image:'../killer/'+x.key+'.png'}));
   await SanLeanRouletteView.preload(qaPool);
  });
  const loaded=requests.length;assert.equal(loaded,12);
  await page.evaluate(()=>{
   window.qaFrames=[];let last=performance.now();function frame(t){qaFrames.push(t-last);last=t;if(qaFrames.length<260)requestAnimationFrame(frame)}requestAnimationFrame(frame);
   SanLeanRouletteView.render(document.getElementById('obsStage'),{kind:'roulette_killer_perks',settings:{pool:qaPool},state:{visible:true,status:'spinning',spinId:'quality',targets:qaPool.slice(0,4)}});
  });
  await page.waitForFunction(()=>[...document.querySelectorAll('canvas')].every(c=>c.width>300));
  const dimensions=await page.locator('canvas').evaluateAll(cs=>cs.map(c=>({width:c.width,css:c.clientWidth,smoothing:c.getContext('2d').imageSmoothingQuality})));
  assert.equal(dimensions.length,4);assert(dimensions.every(c=>c.width===c.css*2&&c.smoothing==='high'));
  await page.waitForTimeout(3700);
  assert.equal(requests.length,loaded,'Warm spin must not request more portrait files');
  assert(await page.locator('canvas').evaluateAll(cs=>cs.every(c=>c.dataset.spinning==='false'&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((n,i)=>i%4===3&&n>0))));
  const frames=await page.evaluate(()=>({count:qaFrames.length,over50ms:qaFrames.filter(x=>x>50).length,max:Math.round(Math.max(...qaFrames))}));
  await page.screenshot({path:path.join(root,'../roulette-image-quality.png')});
  await page.route('**/assets/roulette-private/assets/killers/*.webp',r=>r.fulfill({status:404,body:''}));
  await page.evaluate(async()=>{const k=(await(await fetch('../data/killers.json')).json())[0];k.image='../'+k.image;k.weight=1;await SanLeanRouletteView.preload([k]);SanLeanRouletteView.render(document.getElementById('obsStage'),{kind:'roulette_killers',settings:{pool:[k]},state:{visible:true,status:'result',items:[k]}})});
  await page.waitForFunction(()=>{const img=document.querySelector('.sl-killer-card-portrait');return img?.naturalWidth===512&&img.src.endsWith('.png')});
  assert.deepEqual(errors,[]);console.log('PASS: 12 deduplicated loads, four 2x perk canvases, no image requests during warm spin, painted results, PNG fallback. Frames:',frames);
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
