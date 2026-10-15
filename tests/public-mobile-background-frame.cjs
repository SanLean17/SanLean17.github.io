const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{execFileSync}=require('child_process');
const {chromium}=require('C:/Users/Lean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../mobile-background-proof');fs.mkdirSync(out,{recursive:true});
const pages=['index','ruleta-perks','ruleta-killer','ruleta-perks-killer','ruleta-perks-superviviente','1vs1','halloween','contacto','creditos','aviso-legal','tierlist-dbd','tierlist-halloween'];
const server=http.createServer((q,r)=>{try{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]));r.setHeader('Content-Type',({'.css':'text/css','.js':'text/javascript','.html':'text/html','.png':'image/png','.json':'application/json'})[path.extname(f)]||'application/octet-stream');r.end(fs.readFileSync(f))}catch{r.writeHead(404);r.end()}});
// Chromium may round a few rasterized channels differently across compositor layers.
// Permit only 1/255 per channel on at most 0.1% of pixels; geometry must still match exactly.
function sameFrame(actual,expected){
 if(actual.equals(expected))return true;
 const a=path.join(out,'actual-frame.png'),b=path.join(out,'reference-frame.png');fs.writeFileSync(a,actual);fs.writeFileSync(b,expected);
 const script="from PIL import Image,ImageChops\nimport sys\na=Image.open(sys.argv[1]).convert('RGB');b=Image.open(sys.argv[2]).convert('RGB')\nassert a.size==b.size\nd=ImageChops.difference(a,b)\nassert max(v[1] for v in d.getextrema())<=1\nassert sum(any(p) for p in d.getdata())<=a.width*a.height*.001";
 execFileSync('C:/Users/Lean/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',['-c',script,a,b]);return true;
}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=process.env.PUBLIC_BASE||`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({channel:'chrome',headless:true});try{
for(const [width,height] of process.env.PUBLIC_BASE?[[390,844]]:(process.env.FRAME_LANDSCAPE?[[740,390]]:[[320,700],[390,844],[740,900],[740,390],[1440,900],[1024,768]])){
 let reference=null;
 for(const name of pages){const states=[];
 for(const baseline of process.env.PUBLIC_BASE?[false]:[true,false]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:width<=760,isMobile:width<=760});await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==base)return r.abort();if(baseline&&['/css/public-mobile.css','/css/public-refinements.css'].includes(u.pathname))return r.fulfill({contentType:'text/css',body:execFileSync('git',['show','838c632:'+u.pathname.slice(1)],{cwd:root})});return r.continue()});await page.goto(base+'/'+name+'.html?skipSplash=1');await page.evaluate(()=>document.fonts.ready);await page.waitForLoadState('networkidle');
 const snapshot=()=>page.evaluate(()=>{const props=['backgroundImage','backgroundSize','backgroundPosition','backgroundRepeat','backgroundAttachment','backgroundColor','maskImage','height','position','zIndex','display'];const style=(e,p)=>{const s=getComputedStyle(e,p);return Object.fromEntries(props.map(k=>[k,s[k]]))};const rect=e=>{const r=e.getBoundingClientRect();return[r.x,r.y,r.width,r.height]};return{layout:[...document.querySelectorAll('header,main,footer,main h1,.build-grid,.home-options')].map(rect),backgrounds:[document.body,...document.querySelectorAll('.config-section,.config-grid')].map(e=>[style(e),style(e,'::before'),style(e,'::after')])}});
 const state=await snapshot();states.push(state);
 if(!baseline&&width<=760&&!name.startsWith('tierlist')){
  const bg=state.backgrounds[0][1];assert.match(bg.backgroundImage,/fondo-sanlean-mobile2/);assert.equal(bg.backgroundSize,'cover');assert.equal(bg.backgroundPosition,'50% 0%');assert.equal(bg.backgroundRepeat,'no-repeat');assert.equal(bg.backgroundAttachment,'scroll');assert.equal(bg.height,height+'px');assert.equal(bg.position,'absolute');
  if(width===390)await page.screenshot({path:path.join(out,name+'.png')});
  const hide=await page.addStyleTag({content:'body>*{visibility:hidden!important}'});const pixels=await page.screenshot();if(reference)assert.ok(sameFrame(pixels,reference),`Identical portrait pixels ${name} ${width}x${height}`);else reference=pixels;await hide.evaluate(e=>e.remove());
  if(['ruleta-killer','ruleta-perks-killer','ruleta-perks-superviviente'].includes(name)){
   await page.waitForFunction(()=>document.querySelectorAll('.config-item').length>2);for(const gear of await page.locator('.perk-gear-btn,.killer-gear-btn').all())await gear.click();const config=await snapshot();assert.deepEqual(config.backgrounds[0][1],bg,'Configuration does not resize portrait');assert.match(JSON.stringify(config.backgrounds.slice(1)),/fondo-negro-textura-2/);await page.evaluate(()=>scrollTo(0,innerHeight+100));const after=await snapshot();assert.deepEqual(after.backgrounds[0][1],bg,'Scrolling does not resize portrait');
  }
 }
 await page.close();}
 if(states.length===2){if(width<=760){for(const k of ['backgroundImage','backgroundSize','backgroundPosition','backgroundRepeat','backgroundAttachment'])assert.equal(states[1].backgrounds[0][0][k].split(',').at(-1).trim(),states[0].backgrounds[0][0][k].split(',').at(-1).trim(),`Texture layer unchanged ${name} ${width} ${k}`);}assert.deepEqual(states[1].layout,states[0].layout,`Layout unchanged ${name} ${width}`);if(width>760||name.startsWith('tierlist'))assert.deepEqual(states[1],states[0],`Desktop/Tierlist untouched ${name} ${width}`);else assert.deepEqual(states[1].backgrounds.slice(1),states[0].backgrounds.slice(1),`Configuration backgrounds unchanged ${name} ${width}`);}
 console.log('PASS',name,width,height);
 }
 if(width<=760){const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true});await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());await page.goto(base+'/index.html');await page.evaluate(()=>document.fonts.ready);if(width===390)await page.screenshot({path:path.join(out,'splash.png')});await page.addStyleTag({content:'body>*{visibility:hidden!important}body>.splash{visibility:visible!important}.splash>*{visibility:hidden!important}'});assert.ok(sameFrame(await page.screenshot(),reference),'Splash portrait identical to HOME');await page.close();}
}
console.log('PASS: matching first-screen backgrounds, unchanged desktop/layout/Tierlist/configuration.');
}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
