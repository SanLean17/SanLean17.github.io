const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Lean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../public-touch-checks');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const file=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({channel:'chrome',headless:true}),results=[],errors=[];try{
for(const width of [320,390,740]){
 const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true});await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());page.on('pageerror',e=>errors.push(e.message));
 for(const [name,type] of [['tierlist-dbd','killers'],['tierlist-dbd','survivors'],['tierlist-dbd','killerPerks'],['tierlist-dbd','survivorPerks'],['tierlist-halloween',null]]){
  await page.goto(base+'/'+name+'.html');if(type)await page.locator(`.tier-tab[data-type="${type}"]`).tap();await page.locator('#tierPool .tier-card').first().waitFor();
  const sizes=await page.locator('#tierPool').evaluate(p=>{const pr=p.getBoundingClientRect(),cards=[...p.children].filter(e=>e.matches('.tier-card')),first=cards[0].getBoundingClientRect(),row=cards.map(e=>e.getBoundingClientRect()).filter(r=>Math.abs(r.top-first.top)<1);return {left:first.left-pr.left,right:pr.right-row.at(-1).right,width:first.width,height:first.height,gap:parseFloat(getComputedStyle(p).gap),cols:row.length,available:p.clientWidth-parseFloat(getComputedStyle(p).paddingLeft)-parseFloat(getComputedStyle(p).paddingRight)};});
  assert.ok(Math.abs(sizes.left-sizes.right)<2,`Centered ${width} ${type}: ${JSON.stringify(sizes)}`);const expected=type?.includes('Perks')?66:type?(width>700?88:66):(width>700?105:80);assert.equal(sizes.width,expected,'Existing widths preserved');assert.equal(sizes.gap,type?8:9);assert.equal(sizes.cols,Math.floor((sizes.available+sizes.gap)/(sizes.width+sizes.gap)),'Column count follows unchanged card width/gap');
  await page.locator('#tierPool').evaluate(p=>scrollTo({top:p.getBoundingClientRect().top+scrollY-200,behavior:'instant'}));
  const cards=page.locator('#tierPool .tier-card');
  for(const index of [0,1,2,0]){
   const card=cards.nth(index);await card.tap();assert.equal(await page.locator('.tier-selected').count(),1);assert.equal(await card.getAttribute('aria-pressed'),'true');assert.ok(await card.evaluate(e=>e.classList.contains('tier-selected')));
   const style=await card.evaluate(e=>{const s=getComputedStyle(e);return [s.outlineColor,s.outlineStyle,s.outlineWidth]});assert.deepEqual(style,['rgb(255, 0, 60)','solid','2px']);
   for(const previous of [0,1,2].filter(i=>i!==index))assert.equal(await cards.nth(previous).evaluate(e=>getComputedStyle(e).outlineStyle),'none');
   assert.equal(await page.locator('.tier-perk-placement').isVisible(),true);
   if(index===1&&width===390)await page.screenshot({path:path.join(out,`${type||'heroes'}-second-selected.png`)});
  }
  await page.screenshot({path:path.join(out,`${type||'heroes'}-${width}.png`),fullPage:true});
  const moved=await cards.first().elementHandle();await page.locator('.tier-perk-placement').getByRole('button',{name:'Mover a S',exact:true}).tap();assert.equal(await moved.evaluate(e=>e.parentElement.dataset.tier),'S');assert.equal(await page.locator('.tier-selected').count(),0);results.push({width,type:type||'heroes',selection:'pass',margins:[sizes.left,sizes.right]});
 }
 for(const name of ['ruleta-killer','ruleta-perks-killer','ruleta-perks-superviviente']){
  await page.goto(base+'/'+name+'.html');await page.waitForFunction(()=>document.querySelectorAll('.config-item').length>2);await page.waitForLoadState('networkidle');
  for(const gear of await page.locator('.perk-gear-btn,.killer-gear-btn').all()){
   const killer=await gear.evaluate(e=>/killers/i.test(e.getAttribute('aria-label')));await gear.tap();await page.waitForTimeout(350);const tip=page.locator('.public-gear-tooltip');assert.equal(await tip.isVisible(),true,JSON.stringify({name,width,killer,errors,expanded:await gear.getAttribute('aria-expanded'),tooltip:await tip.evaluate(e=>({hidden:e.hidden,text:e.textContent,display:getComputedStyle(e).display})),count:await page.locator('.public-gear-tooltip').count()}));assert.equal(await tip.textContent(),killer?'CONFIGURAR KILLERS':'CONFIGURAR PERKS');assert.equal(await gear.getAttribute('aria-expanded'),'true',`Configuration still opens ${name} ${width} ${await gear.getAttribute('id')}`);assert.equal(await gear.evaluate(e=>getComputedStyle(e,'::after').display),'none');
   const rect=await tip.boundingBox();assert.ok(rect.width>110&&rect.x>=0&&rect.x+rect.width<=width&&rect.y>=0&&rect.y+rect.height<=844);assert.equal(await tip.evaluate(e=>getComputedStyle(e).pointerEvents),'none');await page.screenshot({path:path.join(out,`${name}-${killer?'killers':'perks'}-${width}.png`)});await page.waitForTimeout(2200);assert.equal(await tip.isVisible(),false);await gear.tap();assert.equal(await gear.getAttribute('aria-expanded'),'false');
  }
 }
 await page.close();
}
assert.deepEqual(errors,[]);console.log(JSON.stringify(results));fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
