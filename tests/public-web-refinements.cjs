const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Lean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const output = path.resolve(root, '../public-web-checks');
fs.mkdirSync(output, {recursive:true});
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp'};
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep)) {res.writeHead(403);res.end();return;}
  try {res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');res.end(fs.readFileSync(file));}
  catch {res.writeHead(404);res.end();}
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless:true, channel:process.env.BROWSER_CHANNEL || 'chrome'});
  const failures = [];
  async function pageFor(width, touch=false) {
    const context = await browser.newContext({viewport:{width,height:1000},hasTouch:touch,isMobile:touch});
    // No live accounts or analytics are involved in these public-page tests.
    await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
    const page = await context.newPage();
    page.on('pageerror', error => failures.push(error.message));
    return page;
  }
  async function goto(page, name) {
    await page.goto(`${base}/${name}.html?skipSplash=1`);
    await page.evaluate(() => document.fonts.ready);
  }
  async function drag(page, source, target) {
    await source.evaluate(el => window.scrollTo({top:Math.max(0,el.getBoundingClientRect().bottom+scrollY-innerHeight+40),behavior:'instant'}));
    const from = await source.boundingBox(), to = await target.boundingBox();
    await page.mouse.move(from.x+from.width/2,from.y+from.height/2);
    await page.mouse.down();
    await page.mouse.move(from.x+from.width/2+8,from.y+from.height/2,{steps:3});
    await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:20});
    await page.mouse.move(to.x+to.width/2+1,to.y+to.height/2,{steps:2});
    await page.mouse.up();
  }
  async function centered(page) {
    const margins = await page.locator('#tierPool').evaluate(pool => {
      const rect = pool.getBoundingClientRect();
      const cards = [...pool.children].filter(c => c.getBoundingClientRect().width);
      const first = cards[0].getBoundingClientRect();
      const row = cards.map(c => c.getBoundingClientRect()).filter(r => Math.abs(r.top-first.top)<1);
      return [first.left-rect.left,rect.right-row.at(-1).right];
    });
    assert.ok(Math.abs(margins[0]-margins[1])<2, `Unequal pool margins: ${margins}`);
  }
  try {
    const page = await pageFor(1440);
    for (const name of ['index','ruleta-killer','ruleta-perks','ruleta-perks-killer','ruleta-perks-superviviente','tierlist-dbd','tierlist-halloween','halloween','creditos','1vs1']) {
      await goto(page,name);
      const nav = page.locator('.main-nav .has-dropdown').first();
      await nav.hover();
      const style = await nav.locator('.dropdown').evaluate(el => ({background:getComputedStyle(el).backgroundColor,radius:getComputedStyle(el).borderRadius,border:getComputedStyle(el).borderColor,borderWidth:getComputedStyle(el).borderTopWidth}));
      assert.equal(style.background,'rgb(218, 1, 53)'); assert.equal(style.radius,'14px');assert.equal(style.borderWidth,'0px');
      for (const gear of await page.locator('.perk-gear-btn,.killer-gear-btn').all()) {
        await gear.hover();
        const tooltip = await gear.evaluate(el => ({content:getComputedStyle(el,'::after').content,transform:getComputedStyle(el,'::after').textTransform}));
        assert.match(tooltip.content,/Configurar (Killers|Perks)/); assert.equal(tooltip.transform,'uppercase');
      }
      if (name === 'index') {
        const rects = await page.evaluate(() => ['.home-title','.home-options'].map(s => {const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,right:r.right};}));
        const width = await page.evaluate(() => document.body.clientWidth);
        assert.ok(Math.abs((rects[0].left+rects[0].right)/2-width/2)<2,'Home title is centered '+JSON.stringify({rects,width}));
        assert.ok(Math.abs(rects[1].left-rects[0].left-4)<1,'Original vertical selection alignment');
      }
      if (name === '1vs1') {
        assert.equal(await page.locator('.versus').evaluate(el => getComputedStyle(el).color),'rgb(255, 255, 255)');
        assert.equal(await page.locator('h1>.accent').evaluate(el => getComputedStyle(el).color),'rgb(255, 0, 60)');
      }
      await page.screenshot({path:path.join(output,`${name}-desktop.png`),fullPage:true});
    }
    await goto(page,'tierlist-dbd');
    for (const type of ['killers','survivors','killerPerks','survivorPerks']) {
      await page.locator(`[data-type="${type}"].tier-tab`).click();
      await page.locator(`#tierPool .tier-card[data-type="${type}"]`).first().waitFor();
      await centered(page);
      const cards = page.locator('#tierPool .tier-card');
      const count = await cards.count();
      if (type.endsWith('Perks')) {
        const role = type === 'killerPerks' ? 'killer' : 'survivor';
        assert.equal(count,JSON.parse(fs.readFileSync(path.join(root,`data/perks-${role}.json`))).filter(p=>!p.emptySlot&&p.key!=='slot_vacio').length);
        await cards.first().hover();
        assert.equal(await cards.first().evaluate(el => getComputedStyle(el,'::after').visibility),'visible');
        await page.waitForFunction(() => [...document.querySelectorAll('#tierPool img')].every(img => img.complete));
        assert.equal(await cards.locator('img').evaluateAll(imgs => imgs.filter(img => !img.naturalWidth).length),0,'All perk assets load');
      }
      await drag(page,cards.first(),page.locator('[data-tier="S"]'));
      assert.equal(await page.locator(`[data-tier="S"] .tier-card[data-type="${type}"]`).count(),1);
      assert.equal(await cards.count(),count-1);
    }
    for (const type of ['killers','survivors','killerPerks','survivorPerks']) {
      await page.locator(`[data-type="${type}"].tier-tab`).click();
      assert.equal(await page.locator('[data-tier="S"] .tier-card:visible').count(),1,'Collections keep independent ranks');
      assert.equal(await page.locator('[data-tier="S"] .tier-card:visible').getAttribute('data-type'),type);
    }
    await page.locator('.tier-reset').click();
    assert.equal(await page.locator('.tier-board .tier-card').count(),0,'Reset covers all collections');
    await page.screenshot({path:path.join(output,'perks-desktop.png'),fullPage:true});
    await goto(page,'tierlist-halloween');
    await centered(page);
    await drag(page,page.locator('#tierPool .tier-card').first(),page.locator('[data-tier="A"]'));
    assert.equal(await page.locator('[data-tier="A"] .tier-card').count(),1);
    await page.locator('.tier-reset').click();
    assert.equal(await page.locator('#tierPool .tier-card').count(),12);

    for (const width of [320,390,740]) {
      const mobile = await pageFor(width,true);
      await goto(mobile,'tierlist-dbd');
      for (const type of ['killerPerks','survivorPerks']) {
        await mobile.locator(`.tier-tab[data-type="${type}"]`).tap();
        const card = mobile.locator('#tierPool .tier-card').first();
        await card.waitFor();
        assert.equal(await card.evaluate(el=>getComputedStyle(el).touchAction),'pan-y');
        await card.tap();
        assert.equal(await mobile.locator('.tier-perk-placement').isVisible(),true);
        await mobile.getByRole('button',{name:'Mover a S',exact:true}).tap();
        const ranked = mobile.locator(`[data-tier="S"] .tier-card[data-type="${type}"]`);
        assert.equal(await ranked.count(),1);
        await ranked.tap();
        await mobile.getByRole('button',{name:'Mover a B',exact:true}).tap();
        await mobile.locator(`[data-tier="B"] .tier-card[data-type="${type}"]`).tap();
        await mobile.getByRole('button',{name:'Devolver a disponibles',exact:true}).tap();
        assert.equal(await mobile.locator('.tier-board .tier-card').count(),0);
        assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No mobile overflow');
      }
      await mobile.screenshot({path:path.join(output,`perks-${width}.png`),fullPage:true});
      await mobile.context().close();
    }
    for (const width of [1440,320,390,740]) {
      const roulette = await pageFor(width,width<900);
      for (const name of ['ruleta-killer','ruleta-perks-killer','ruleta-perks-superviviente']) {
        console.log('Checking roulette',width,name);
        await goto(roulette,name);
        const gear = roulette.locator('#perkGearBtn');
        await gear.waitFor();
        await roulette.locator('.config-item[data-key="slot_vacio"]').waitFor({state:'attached'});
        await roulette.evaluate(()=>Promise.allSettled([...imageCache.values()]));
        await gear.click();
        const empty = roulette.locator('.config-item[data-key="slot_vacio"]');
        await empty.waitFor({state:'visible'});
        const style = await empty.evaluate(el => ({inner:getComputedStyle(el.querySelector('img')).visibility,outer:getComputedStyle(el,'::before').backgroundImage}));
        assert.equal(style.inner,'hidden'); assert.match(style.outer,/rombo.png/);
        await empty.click();assert.match(await empty.getAttribute('class'),/disabled/);
        await empty.click();assert.doesNotMatch(await empty.getAttribute('class'),/disabled/);
        await empty.screenshot({path:path.join(output,`${name}-empty-${width}.png`)});
        await gear.click();
        if(width===1440){
          const spin = roulette.locator(name==='ruleta-killer'?'#spinKillerPerksBtn':'#spinBtn');
          await spin.click();
          await roulette.waitForFunction(()=>[...document.querySelectorAll('.reel-name')].filter(el=>el.textContent.trim()).length===4,{},{timeout:15000});
          if(name==='ruleta-killer'){
            await roulette.locator('#spinKillerBtn').click();
            await roulette.waitForFunction(()=>!document.getElementById('spinKillerBtn').disabled,{},{timeout:15000});
            assert.equal(await roulette.locator('.killer-card.selected').count(),1);
          }
        }
      }
      await roulette.context().close();
    }
    assert.deepEqual(failures,[],'No runtime errors');
    console.log('PASS: desktop pages, centered grids, independent collections, drag/drop, reset, all perk assets, touch placement at 320/390/740, empty slots and roulette spins.');
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});


