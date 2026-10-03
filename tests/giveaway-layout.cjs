const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const participants=['TaeKojima','SanLean17','LunaGaming','LeoStream','NicoPlay','SofiLive','AlexDBD','Vale','Mati','Juli','Fer'].map(name=>({name,platform:'twitch'}));
  const finalThree=participants.slice(0,3);
  let snapshot={kind:'giveaway',settings:{},state:{visible:true,phase:'open',keyword:'TULIPÁN',count:participants.length,participants,sequence:[],winner:null,platformMode:'both'}};
  await page.route('**/*',r=>{
   const u=new URL(r.request().url());
   if(u.hostname==='fixture.test')return r.fulfill({path:path.join(root,u.pathname),contentType:({'.css':'text/css','.js':'text/javascript','.html':'text/html'})[path.extname(u.pathname)]});
   if(u.pathname.endsWith('/get_stream_overlay_by_token'))return r.fulfill({contentType:'application/json',body:JSON.stringify([snapshot])});
   return r.abort();
  });
  await page.goto('https://fixture.test/Usuario/overlay.html?token=isolated-giveaway-test');
  await page.waitForSelector('.obs-giveaway-live');
  await page.waitForFunction(()=>!document.querySelector('.obs-overlay-root').classList.contains('obs-entering'));
  for(const width of [1920,1440,1280,960,740,390,320]){
   await page.setViewportSize({width,height:width>=960?1080:1000});
   for(const phase of ['open','spinning','celebrating','winner']){
    snapshot.state={...snapshot.state,phase,winner:['celebrating','winner'].includes(phase)?participants[1]:null,sequence:phase==='open'?[]:phase==='spinning'?[...Array.from({length:24},(_,i)=>participants[i%11]),...finalThree]:finalThree};
    const phaseClass={open:'is-open',spinning:'is-spinning',celebrating:'is-celebrating',winner:'has-winner'}[phase];
    await page.waitForSelector('.obs-giveaway-live.'+phaseClass);
    if(phase==='spinning')await page.evaluate(async()=>{const track=document.querySelector('.obs-giveaway-track');for(const a of track.getAnimations()){a.finish();await a.finished}});
    // Keep pulse at its largest frame so clipping checks cover its real amplitude.
    await page.evaluate(()=>{for(const a of document.getAnimations())if(a.animationName?.includes('winner')){a.pause();a.currentTime=a.effect.getTiming().duration/2}});
    const result=await page.evaluate(({phase})=>{
     const el=s=>document.querySelector(s),style=s=>getComputedStyle(el(s)),rect=s=>el(s).getBoundingClientRect();
     const center=rect('.obs-giveaway-center'),reel=rect('.obs-giveaway-reel'),rows=[...document.querySelectorAll('.obs-giveaway-row')].slice(-3);
     const textBounds=rows.map(row=>{const range=document.createRange();range.selectNodeContents(row);return range.getBoundingClientRect().toJSON()});
     return {center:center.toJSON(),reel:reel.toJSON(),textBounds,border:style('.obs-giveaway-center').borderTopColor,keywordBorder:style('.obs-giveaway-keyword').borderBottomWidth,reelBackground:style('.obs-giveaway-reel').backgroundColor,trackZ:+style('.obs-giveaway-track').zIndex,bandZ:+style('.obs-giveaway-band').zIndex,keywordTransform:style('.obs-giveaway-keyword strong').transform,sideVisible:style('.obs-giveaway-participants').display!=='none',winnerColor:phase==='open'?null:getComputedStyle(rows[1]).color,bodyBackground:style('body').backgroundColor,panels:[...document.querySelectorAll('.obs-giveaway-layout> *')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.getBoundingClientRect().toJSON())};
    },{phase});
    assert.equal(result.border,'rgba(255, 255, 255, 0.12)');
    assert.equal(result.keywordBorder,'0px');assert.equal(result.reelBackground,'rgba(0, 0, 0, 0)');
    assert(result.trackZ>result.bandZ,'Text must render above the red band');
    if(result.sideVisible)assert.equal(result.keywordTransform,'matrix(1, 0, 0, 1, 0, 3)');
    assert.equal(result.bodyBackground,'rgba(0, 0, 0, 0)');
    assert.equal(result.sideVisible,['open','winner'].includes(phase));
    if(phase!=='open')assert.equal(result.winnerColor,'rgb(255, 255, 255)');
    assert(Math.abs(result.center.bottom-result.reel.bottom-1)<1,'No empty block beneath reel');
    for(const bounds of result.textBounds){assert(bounds.top>=result.reel.top&&bounds.bottom<=result.reel.bottom,'All three names fit vertically');assert(bounds.left>=result.reel.left&&bounds.right<=result.reel.right,'Names fit horizontally');}
    for(const box of result.panels)assert(box.left>=0&&box.right<=width,'Panels fit viewport width');
    if(process.env.QA_OUTPUT&&[1920,390].includes(width)){
     fs.mkdirSync(process.env.QA_OUTPUT,{recursive:true});await page.screenshot({path:path.join(process.env.QA_OUTPUT,`giveaway-${width}-${phase}.png`),omitBackground:true});
    }
    console.log('PASS '+width+' '+phase);
   }
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.obs-giveaway-row.is-winner').evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.deepEqual(errors,[]);
  console.log('PASS: full isolated phase flow, 3 visible names, continuous surface, neutral borders, white winner, no empty block, transparent canvas, reduced motion.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
