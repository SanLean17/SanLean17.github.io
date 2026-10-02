const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/killers.json'), 'utf8'));

(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  try {
    const page = await browser.newPage({viewport:{width:1920,height:384}});
    const errors = [], writes = [];
    page.on('pageerror', error => errors.push(error.message));
    let snapshot = {kind:'challenge_all_killers',state:{status:'active',visible:true,currentKey:catalog[0].key,entries:{[catalog[7].key]:'completed',[catalog[25].key]:'failed'}},settings:{}};
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname.includes('/rest/v1/rpc/')) {
        if (!url.pathname.endsWith('/get_stream_overlay_by_token')) writes.push(url.pathname);
        return route.fulfill({contentType:'application/json',body:JSON.stringify([snapshot])});
      }
      if (url.hostname === 'fixture.test') {
        const file = path.join(root, decodeURIComponent(url.pathname));
        if (process.env.ROSTER_BASELINE && url.pathname.endsWith('/challenge-roster-view.css')) return route.fulfill({contentType:'text/css',body:fs.readFileSync(process.env.ROSTER_BASELINE,'utf8')});
        return route.fulfill({path:file,contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'})[path.extname(file)]});
      }
      return route.abort();
    });
    await page.goto('https://fixture.test/Usuario/overlay.html?token=isolated-roster-qa');
    await page.waitForSelector('.sl-roster-card');
    await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth));
    await page.waitForFunction(() => !document.querySelector('.obs-overlay-root').classList.contains('obs-entering'));
    const geometry = () => page.evaluate(() => {
      const rect = e => {const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
      return {
        rows:[...document.querySelectorAll('.sl-roster-row')].map(row => [...row.children].map(rect)),
        portraits:[...document.querySelectorAll('.sl-roster-image img')].map(img => ({...rect(img),box:rect(img.parentElement),ratio:img.naturalWidth/img.naturalHeight,fit:getComputedStyle(img).objectFit})),
        background:getComputedStyle(document.body).backgroundColor,
        names:[...document.querySelectorAll('.sl-roster-name')].every(e => getComputedStyle(e).display==='none')
      };
    });
    if (process.env.ROSTER_BASELINE) {
      console.log(JSON.stringify(await geometry()));
      if(process.env.QA_OUTPUT) {fs.mkdirSync(process.env.QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QA_OUTPUT,'before.png'),omitBackground:true})}
      return;
    }
    for (const [width,height] of [[1920,384],[1920,250],[1280,256],[960,192],[740,220],[390,180],[320,160]]) {
      await page.setViewportSize({width,height});
      const g = await geometry();
      assert.deepEqual(g.rows.map(r=>r.length),[15,15,14]);
      assert(g.names);assert.equal(g.background,'rgba(0, 0, 0, 0)');
      for(const row of g.rows) {
        assert(Math.abs(row[0].left + row.at(-1).right - width)<1, 'Each row is centered');
        for(const card of row) assert(card.left>=0 && card.right<=width+.1 && card.top>=0 && card.bottom<=height+.1, `Card clipped at ${width}x${height}: ${JSON.stringify(card)}`);
      }
      for(const img of g.portraits) {
        assert.equal(img.fit,'contain');
        assert(img.left>=img.box.left-.1 && img.right<=img.box.right+.1 && img.top>=img.box.top-.1 && img.bottom<=img.box.bottom+.1,'Full portrait fits inner bounds');
        assert(Math.abs(img.width/img.height-img.ratio)<.02,'Portrait keeps natural aspect ratio');
      }
      if(width===1920 && height===384) assert(g.portraits.every(i=>i.height>100),'Portraits have more room than old 83px cards');
      if(process.env.QA_OUTPUT) {
        fs.mkdirSync(process.env.QA_OUTPUT,{recursive:true});
        await page.screenshot({path:path.join(process.env.QA_OUTPUT,`roster-${width}x${height}.png`),omitBackground:true});
        if(width===1920 && height===384) {
          const backdrop=await page.addStyleTag({content:'html{background:linear-gradient(125deg,#373841,#111217)}'});
          await page.screenshot({path:path.join(process.env.QA_OUTPUT,'roster-preview-background.png')});
          await backdrop.evaluate(e=>e.remove());
        }
      }
    }
    await page.setViewportSize({width:1920,height:384});
    assert.equal(await page.locator('.is-completed .sl-roster-mark').textContent(),'✓');
    assert.equal(await page.locator('.is-failed .sl-roster-mark').textContent(),'×');
    // Sample the pulsing first/last card and entrance at their peak, including edge cards.
    for(const key of [catalog[0].key,catalog.at(-1).key]) {
      snapshot.state={...snapshot.state,currentKey:key};
      await page.waitForFunction(key=>document.querySelector('.is-current')?.dataset.key===key,key);
      await page.evaluate(()=>document.querySelector('.is-current').getAnimations().forEach(a=>{a.pause();a.currentTime=1400}));
      const g=await geometry();for(const row of g.rows)for(const card of row)assert(card.left>=0&&card.right<=1920&&card.top>=0&&card.bottom<=384);
    }
    // Existing paused/hidden behavior, progress restoration and results remain intact.
    for(const state of [{status:'paused',visible:true},{status:'active',visible:true},{status:'active',visible:false},{status:'active',visible:true}]) {
      snapshot.state={...snapshot.state,...state};
      await page.waitForFunction(show=>document.querySelector('.obs-overlay-root').classList.contains('obs-hidden')!==show,state.status==='active'&&state.visible);
    }
    await page.waitForSelector('.is-completed .sl-roster-mark');
    assert.equal(await page.locator('.sl-roster-card').count(),catalog.length);
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('.is-current').evaluate(e=>getComputedStyle(e).animationName),'none');
    assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
    console.log('PASS: all 44 portraits contained, 15/15/14 centered rows, seven viewport sizes, all states, hide/show and pause/resume, reduced motion, no live writes or JS errors.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
