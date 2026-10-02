const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try{
  const page=await browser.newPage();const errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>requests.push({url:r.url(),method:r.method()}));
  if(!process.env.LIVE_SIMULATION)await page.route('**/*',r=>r.fulfill({path:path.join(__dirname,'..',decodeURIComponent(new URL(r.request().url()).pathname))}));
  await page.goto((process.env.LIVE_SIMULATION||'https://fixture.test')+'/Usuario/challenge-simulation.html');
  await page.waitForSelector('.sl-roster-card');
  await page.evaluate(async()=>Promise.all([...document.querySelectorAll('svg image')].map(async e=>{const i=new Image();i.src=e.getAttribute('href');await i.decode()})));
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:1000});
   for(const layout of ['left','top','right']){
    await page.locator(`button[data-layout="${layout}"]`).click();
    const g=await page.evaluate(()=>{
     const cards=[...document.querySelectorAll('.sl-roster-card')],scene=document.querySelector('.simulation-scene').getBoundingClientRect(),rect=cards[0].getBoundingClientRect();
     return {rows:[...document.querySelectorAll('.sl-roster-row')].map(e=>e.children.length),sizes:cards.map(e=>[parseFloat(getComputedStyle(e).width),parseFloat(getComputedStyle(e).height)]),inside:cards.every(e=>{const r=e.getBoundingClientRect();return r.left>=scene.left-.1&&r.right<=scene.right+.1&&r.bottom<=scene.bottom+.1}),left:rect.left-scene.left,right:scene.right-cards[4].getBoundingClientRect().right,overflow:document.documentElement.scrollWidth>innerWidth,selected:document.querySelector('button[aria-pressed="true"]').dataset.layout};
    });
    assert.deepEqual(g.rows,layout==='top'?[19,19,6]:[5,5,5,5,5,5,5,5,4]);
    assert(g.sizes.every(([w,h])=>Math.abs(w-1920/19)<.05&&h===100));
    assert(g.inside&&!g.overflow);assert.equal(g.selected,layout);
    if(layout==='left')assert(Math.abs(g.left)<.1);
    if(layout==='right')assert(Math.abs(g.right)<.1);
   }
  }
  await page.setViewportSize({width:1440,height:1100});await page.locator('button[data-layout="left"]').click();
  if(process.env.QA_OUTPUT)await page.screenshot({path:process.env.QA_OUTPUT,fullPage:true});
  assert.deepEqual(errors,[]);assert(requests.every(r=>r.method==='GET'&&!/supabase|token=/.test(r.url)));
  console.log('PASS: lateral/top layouts, equal card sizes, 44 portraits, desktop/mobile, no live requests or writes');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
