const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/killers.json'), 'utf8'));

(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  try {
    const page = await browser.newPage({viewport:{width:1920,height:300}});
    const errors = [], writes = [];
    let missingBounds=false;
    page.on('pageerror', error => errors.push(error.message));
    let snapshot = {kind:'challenge_all_killers',state:{status:'active',visible:true,currentKey:catalog[0].key,entries:{[catalog[7].key]:'completed',[catalog[25].key]:'failed'}},settings:{}};
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname.includes('/rest/v1/rpc/')) {
        if (!url.pathname.endsWith('/get_stream_overlay_by_token')) writes.push(url.pathname);
        return route.fulfill({contentType:'application/json',body:JSON.stringify([snapshot])});
      }
      if (url.hostname === 'fixture.test') {
        if(missingBounds && url.pathname.endsWith('/challenge-roster-bounds.json')) return route.fulfill({contentType:'application/json',body:'{}'});
        const file = path.join(root, decodeURIComponent(url.pathname));
        if (process.env.ROSTER_BASELINE && url.pathname.endsWith('/challenge-roster-view.css')) return route.fulfill({contentType:'text/css',body:fs.readFileSync(process.env.ROSTER_BASELINE,'utf8')});
        return route.fulfill({path:file,contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'})[path.extname(file)]});
      }
      return route.abort();
    });
    await page.goto('https://fixture.test/Usuario/overlay.html?token=isolated-roster-qa');
    await page.waitForSelector('.sl-roster-card');
    await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth));
    // SVG images are not in document.images. Decode and independently measure all
    // source alpha bounds, proving that framing removes no nontransparent pixel.
    await page.evaluate(async()=>{
      for(const svg of document.querySelectorAll('.sl-roster-portrait')) {
        const source=new Image();source.src=svg.querySelector('image').getAttribute('href');await source.decode();
        const canvas=document.createElement('canvas');canvas.width=source.naturalWidth;canvas.height=source.naturalHeight;
        const ctx=canvas.getContext('2d');ctx.drawImage(source,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        let l=canvas.width,t=canvas.height,r=0,b=0;
        for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]){l=Math.min(l,x);r=Math.max(r,x+1);t=Math.min(t,y);b=Math.max(b,y+1)}
        if(svg.getAttribute('viewBox')!==[l,t,r-l,b-t].join(' '))throw new Error('Portrait pixels clipped: '+source.src);
      }
    });
    await page.waitForFunction(() => !document.querySelector('.obs-overlay-root').classList.contains('obs-entering'));
    const geometry = () => page.evaluate(() => {
      const rect = e => {const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
      return {
        rows:[...document.querySelectorAll('.sl-roster-row')].map(row => [...row.children].map(rect)),
        portraits:[...document.querySelectorAll('.sl-roster-portrait')].map(svg => {
          const v=svg.viewBox.baseVal,m=svg.getScreenCTM(),p=new DOMPoint(v.x,v.y).matrixTransform(m),q=new DOMPoint(v.x+v.width,v.y+v.height).matrixTransform(m);
          return {left:p.x,right:q.x,top:p.y,bottom:q.y,width:q.x-p.x,height:q.y-p.y,box:rect(svg.parentElement),ratio:v.width/v.height,fit:svg.getAttribute('preserveAspectRatio')};
        }),
        background:getComputedStyle(document.body).backgroundColor,
        names:[...document.querySelectorAll('.sl-roster-name')].every(e => getComputedStyle(e).display==='none')
      };
    });
    if (process.env.ROSTER_BASELINE) {
      console.log(JSON.stringify(await geometry()));
      if(process.env.QA_OUTPUT) {fs.mkdirSync(process.env.QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QA_OUTPUT,'before.png'),omitBackground:true})}
      return;
    }
    for (const [width,height] of [[1920,300],[1920,384],[1280,203],[960,152],[740,120],[390,80],[320,80]]) {
      await page.setViewportSize({width,height});
      const g = await geometry();
      assert.deepEqual(g.rows.map(r=>r.length),[19,19,6]);
      assert.equal(g.portraits.length,44);
      if(width===1920) assert(Math.abs(g.rows[0][0].left-10)<1 && Math.abs(g.rows[0].at(-1).right-1910)<1,'100px cards leave 10px on each side');
      assert(g.names);assert.equal(g.background,'rgba(0, 0, 0, 0)');
      for(const row of g.rows) {
        assert(Math.abs(row[0].left + row.at(-1).right - width)<1, 'Each row is centered');
        for(const card of row) assert(card.left>=0 && card.right<=width+.1 && card.top>=0 && card.bottom<=height+.1, `Card clipped at ${width}x${height}: ${JSON.stringify(card)}`);
      }
      for(const img of g.portraits) {
        assert.equal(img.fit,'xMidYMid meet');
        assert(img.left>=img.box.left-.1 && img.right<=img.box.right+.1 && img.top>=img.box.top-.1 && img.bottom<=img.box.bottom+.1,'Full portrait fits inner bounds');
        assert(Math.abs(img.width/img.height-img.ratio)<.02,'Portrait keeps natural aspect ratio');
        assert(Math.max(img.width/img.box.width,img.height/img.box.height)>.99,'Visible portrait fills its available bounds');
      }
      if(width===1920 && height===300) assert(g.rows.flat().every(c=>Math.abs(c.width-100)<.1&&Math.abs(c.height-100)<.1),'Approved 100px cards');
      if(process.env.QA_OUTPUT) {
        fs.mkdirSync(process.env.QA_OUTPUT,{recursive:true});
        await page.screenshot({path:path.join(process.env.QA_OUTPUT,`roster-${width}x${height}.png`),omitBackground:true});
        if((width===1920 && height===300)||width===960||width===390) {
          const backdrop=await page.addStyleTag({content:'html{background:linear-gradient(125deg,#373841,#111217)}'});
          await page.screenshot({path:path.join(process.env.QA_OUTPUT,`roster-preview-background-${width}.png`)});
          await backdrop.evaluate(e=>e.remove());
        }
      }
    }
    await page.setViewportSize({width:1920,height:300});
    assert.equal(await page.locator('.is-completed .sl-roster-mark').textContent(),'✓');
    assert.equal(await page.locator('.is-failed .sl-roster-mark').textContent(),'×');
    assert(await page.locator('.sl-roster-mark').evaluateAll(marks=>marks.every(mark=>{const m=mark.getBoundingClientRect(),c=mark.parentElement.getBoundingClientRect();return m.top>=c.top+c.height*.65 && m.bottom<=c.bottom})), 'Marks sit below the face');
    // Sample the pulsing first/last card and entrance at their peak, including edge cards.
    for(const key of [catalog[0].key,catalog.at(-1).key]) {
      snapshot.state={...snapshot.state,currentKey:key};
      await page.waitForFunction(key=>document.querySelector('.is-current')?.dataset.key===key,key);
      await page.evaluate(()=>document.querySelector('.is-current').getAnimations().forEach(a=>{a.pause();a.currentTime=1400}));
      const g=await geometry();for(const row of g.rows)for(const card of row)assert(card.left>=0&&card.right<=1920&&card.top>=0&&card.bottom<=300);
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
    assert.deepEqual(await page.evaluate(()=>window.SanLeanChallengeRosterView.rowsForObs(Array.from({length:49},(_,i)=>i)).map(r=>r.length)),[19,19,11],'Future catalog keeps every killer');
    missingBounds=true;
    await page.reload();
    await page.waitForSelector('.sl-roster-image img');
    await page.waitForFunction(()=>document.images.length===44&&[...document.images].every(i=>i.complete&&i.naturalWidth));
    assert.equal(await page.locator('.sl-roster-card').count(),44,'New portraits without measured bounds fall back to full image');
    assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
    console.log('PASS: all 44 portraits contained, 19/19/6 centered rows, seven viewport sizes, all states, hide/show and pause/resume, reduced motion, no live writes or JS errors.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
