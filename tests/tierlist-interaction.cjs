const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Lean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), output = path.resolve(root, '../tierlist-interaction-checks');
fs.mkdirSync(output, {recursive:true});
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp'};
const server = http.createServer((req,res) => {
  const file = path.join(root,decodeURIComponent(req.url.split('?')[0]));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}
  catch{res.writeHead(404);res.end();}
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
  const errors = [], results = [];
  async function newPage(width,touch=false){
    const page=await browser.newPage({viewport:{width,height:844},hasTouch:touch,isMobile:touch});
    await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
    page.on('pageerror',error=>errors.push(error.message));
    return page;
  }
  const y = page => page.evaluate(()=>scrollY);
  async function startDrag(page,card){
    await card.evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY-innerHeight/2,behavior:'instant'}));
    const rect=await card.boundingBox();
    await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);
    await page.mouse.down();
    await page.mouse.move(rect.x+rect.width/2+12,rect.y+rect.height/2,{steps:4});
    await page.waitForFunction(()=>document.documentElement.classList.contains('tier-drag-active'));
  }
  async function finishAt(page,zone){
    await page.mouse.move(1100,422);
    const rect=await zone.boundingBox();
    assert.ok(rect.y>=0&&rect.y+rect.height<844,'Drop target is in the viewport');
    await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2,{steps:15});
    const finalRect=await zone.boundingBox();
    await page.mouse.move(finalRect.x+finalRect.width/2,finalRect.y+finalRect.height/2);
    await page.mouse.up();
    assert.equal(await page.locator('html.tier-drag-active').count(),0);
  }
  try{
    const desktop=await newPage(1440);
    for(const type of ['killerPerks','survivorPerks']){
      await desktop.goto(`${base}/tierlist-dbd.html`);
      await desktop.locator(`.tier-tab[data-type="${type}"]`).click();
      const card=desktop.locator('#tierPool .tier-perk-card').last();
      await card.waitFor();
      const id=await card.getAttribute('data-id');
      await card.click();
      assert.equal(await desktop.locator('.tier-perk-placement').isVisible(),false,'No desktop click selector');
      assert.equal(await card.getAttribute('aria-pressed'),null);
      await card.hover();
      assert.equal(await card.evaluate(el=>getComputedStyle(el,'::after').visibility),'visible','Perk name still appears');
      await startDrag(desktop,card);
      // Keep the captured preview and test wheel while held, away from the edge zones.
      await desktop.mouse.move(1100,400,{steps:5});
      const wheelBefore=await y(desktop);
      await desktop.mouse.wheel(0,-180);
      await desktop.waitForTimeout(250);
      const wheelDelta=wheelBefore-await y(desktop);
      assert.ok(wheelDelta>100,'Wheel scroll preserves the active drag');
      results.push({type,wheelDelta});
      await desktop.evaluate(()=>{
        window.scrollSamples=[];window.recordScroll=true;
        function sample(){if(!window.recordScroll)return;scrollSamples.push(scrollY);requestAnimationFrame(sample)}
        requestAnimationFrame(sample);
      });
      const before=await y(desktop);
      // A point in the custom edge band, outside the browser's tiny native edge.
      await desktop.mouse.move(1100,310,{steps:10});
      await desktop.waitForTimeout(450);
      const slow=before-await y(desktop);
      assert.ok(slow>5&&slow<100,`Slow scrolling near center: ${slow}`);
      const fastStart=await y(desktop);
      await desktop.mouse.move(1100,38,{steps:5});
      await desktop.waitForTimeout(450);
      const fast=fastStart-await y(desktop);
      assert.ok(fast>slow*2&&fast<650,`Progressive acceleration: ${slow} -> ${fast}`);
      await desktop.mouse.move(1100,400,{steps:10});
      const stopped=await y(desktop);
      await desktop.waitForTimeout(200);
      assert.ok(Math.abs(await y(desktop)-stopped)<3,'Stops away from edges');
      // Hold at the edge until the S row is reachable from the bottommost perk.
      await desktop.mouse.move(1100,26,{steps:10});
      await desktop.waitForFunction(()=>scrollY<250,null,{timeout:15000});
      await desktop.mouse.move(1100,400,{steps:10});
      const samples=await desktop.evaluate(()=>{window.recordScroll=false;return scrollSamples;});
      const maxStep=Math.max(...samples.slice(1).map((value,i)=>Math.abs(value-samples[i])));
      assert.ok(maxStep<70,`No abrupt jumps during auto-scroll: ${maxStep}`);
      await finishAt(desktop,desktop.locator('[data-tier="S"]'));
      assert.equal(await desktop.locator(`[data-tier="S"] [data-id="${id}"]`).count(),1,'Bottom perk reaches S');
      const dropY=await y(desktop);
      await desktop.waitForTimeout(250);
      assert.ok(Math.abs(await y(desktop)-dropY)<3,'No scrolling after drop');
      // Downward edge, release over page gap, and normal wheel after release.
      await startDrag(desktop,desktop.locator(`[data-id="${id}"]`));
      const downStart=await y(desktop);
      await desktop.mouse.move(1400,800,{steps:10});
      await desktop.waitForTimeout(450);
      assert.ok(await y(desktop)>downStart+60,'Bottom edge scrolls down '+JSON.stringify({downStart,after:await y(desktop),active:await desktop.locator('html.tier-drag-active').count()}));
      await desktop.mouse.up();
      const released=await y(desktop);
      await desktop.waitForTimeout(200);
      assert.ok(Math.abs(await y(desktop)-released)<3,'Release outside zones stops scrolling');
      assert.equal(await desktop.locator('.dragging').count(),0);
      await desktop.mouse.wheel(0,150);await desktop.waitForTimeout(200);
      assert.ok(await y(desktop)>released+50,'Normal wheel remains available');
      results.push({type,slow,maxStep,from:before,to:dropY});
    }
    for(const [name,type] of [['tierlist-dbd','killers'],['tierlist-dbd','survivors'],['tierlist-halloween',null]]){
      await desktop.goto(`${base}/${name}.html`);
      if(type)await desktop.locator(`.tier-tab[data-type="${type}"]`).click();
      const card=desktop.locator('#tierPool .tier-card').last();
      await card.click();assert.equal(await desktop.locator('.tier-perk-placement').isVisible(),false);
      await startDrag(desktop,card);
      await desktop.mouse.move(1100,422,{steps:5});
      const beforeWheel=await y(desktop);
      const ghostBefore=await desktop.locator('.tier-drag-preview').boundingBox();
      await desktop.mouse.wheel(0,-180);
      await desktop.waitForTimeout(250);
      assert.ok(beforeWheel-await y(desktop)>80,'Wheel during character drag');
      assert.equal(await desktop.locator('.dragging').count(),1);
      const ghostAfter=await desktop.locator('.tier-drag-preview').boundingBox();
      assert.ok(Math.abs(ghostBefore.y-ghostAfter.y)<1,'Preview stays with cursor during wheel');
      results.push({type:type||'heroes',wheelDelta:beforeWheel-await y(desktop)});
      await desktop.mouse.move(1200,30,{steps:10});
      await desktop.waitForFunction(()=>scrollY<220);
      await finishAt(desktop,desktop.locator('[data-tier="A"]'));
      assert.equal(await desktop.locator('[data-tier="A"] .tier-card').count(),1);
      await desktop.locator('.tier-reset').click();
      assert.equal(await desktop.locator('.tier-board .tier-card').count(),0);
    }
    // Cancelling pointer drag also stops the frame loop without needing a drop.
    await desktop.goto(base+'/tierlist-dbd.html');
    await desktop.locator('.tier-tab[data-type="killerPerks"]').click();
    await startDrag(desktop,desktop.locator('#tierPool .tier-card').last());
    await desktop.mouse.move(1100,30,{steps:10});
    await desktop.waitForTimeout(150);
    await desktop.keyboard.press('Escape');
    await desktop.mouse.up();
    const cancelled=await y(desktop);
    await desktop.waitForTimeout(200);
    assert.equal(await desktop.locator('html.tier-drag-active').count(),0);
    assert.ok(Math.abs(await y(desktop)-cancelled)<3,'Escape cancels auto-scroll');
    for(const width of [320,390,740]){
      const mobile=await newPage(width,true);
      for(const [name,type] of [['tierlist-dbd','killers'],['tierlist-dbd','survivors'],['tierlist-dbd','killerPerks'],['tierlist-dbd','survivorPerks'],['tierlist-halloween',null]]){
        await mobile.goto(`${base}/${name}.html`);
        if(type)await mobile.locator(`.tier-tab[data-type="${type}"]`).tap();
        const card=mobile.locator('#tierPool .tier-card').first();await card.waitFor();
        assert.equal(await card.getAttribute('draggable'),'false','Mobile does not depend on native drag');
        assert.equal(await card.evaluate(el=>getComputedStyle(el).touchAction),'pan-y');
        const count=await mobile.locator('#tierPool .tier-card').count();
        await card.scrollIntoViewIfNeeded();
        const rect=await card.boundingBox(), startY=await y(mobile);
        const touch=await mobile.context().newCDPSession(mobile);
        const x=rect.x+rect.width/2, top=rect.y+rect.height/2;
        await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:top}]});
        for(let i=1;i<=8;i++){
          await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:top+i*18}]});
          await mobile.waitForTimeout(20);
        }
        await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        await mobile.waitForTimeout(250);
        assert.ok(await y(mobile)<startY-40,'Swiping a mobile card scrolls without dragging');
        assert.equal(await mobile.locator('.tier-perk-placement').isVisible(),false,'A swipe does not select a card');
        await touch.detach();
        await card.tap();
        const menu=mobile.locator('.tier-perk-placement');
        assert.equal(await menu.isVisible(),true);
        assert.equal(await menu.getByRole('button',{name:'Devolver a disponibles'}).count(),0,'Pool destination is omitted while already available');
        assert.equal(await menu.locator('button:visible').count(),6);
        await menu.getByRole('button',{name:'Mover a S',exact:true}).tap();
        assert.equal(await mobile.locator('#tierPool .tier-card').count(),count-1);
        for(const [from,to] of [['S','A'],['A','B'],['B','C'],['C','D']]){
          await mobile.locator(`[data-tier="${from}"] .tier-card`).tap();
          assert.equal(await menu.getByRole('button',{name:`Mover a ${from}`,exact:true}).count(),0,'Current rank is omitted');
          assert.equal(await menu.getByRole('button',{name:'Devolver a disponibles'}).count(),1);
          assert.equal(await menu.locator('button:visible').count(),6);
          await menu.getByRole('button',{name:`Mover a ${to}`,exact:true}).tap();
          assert.equal(await mobile.locator(`[data-tier="${to}"] .tier-card`).count(),1);
        }
        await mobile.locator('[data-tier="D"] .tier-card').tap();
        assert.equal(await menu.getByRole('button',{name:'Mover a D',exact:true}).count(),0);
        await menu.getByRole('button',{name:'Devolver a disponibles'}).tap();
        assert.equal(await mobile.locator('#tierPool .tier-card').count(),count);
        assert.equal(await mobile.locator('.tier-board .tier-card').count(),0);
        await mobile.locator('#tierPool .tier-card').first().tap();
        await menu.getByRole('button',{name:'CANCELAR'}).tap();
        assert.equal(await menu.isVisible(),false);
        assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No overflow');
        results.push({width,type:type||'heroes',destinations:'pass'});
      }
      await mobile.locator('#tierPool .tier-card').first().tap();
      await mobile.screenshot({path:path.join(output,`hero-destinations-${width}.png`)});
      // Resizing must clear mobile selection and restore mouse-only interaction.
      await mobile.setViewportSize({width:1440,height:844});
      await mobile.waitForFunction(()=>document.querySelector('#tierPool .tier-card').tabIndex===-1);
      assert.equal(await mobile.locator('.tier-perk-placement').isVisible(),false);
      assert.equal(await mobile.locator('#tierPool .tier-card').first().getAttribute('draggable'),'false');
      await mobile.context().close();
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));
    console.log(JSON.stringify(results));
    console.log('PASS: pointer drag and edge scrolling, drop/release stop, desktop click isolation, all five mobile collections and destination filtering.');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
