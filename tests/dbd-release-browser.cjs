'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..'),ui=path.join(root,'maintenance/dbd-manager/ui'),output=path.join(root,'test-results/dbd-browser');
const all=Object.fromEntries(['killers','survivors','perks-killer','perks-survivor'].map(t=>[t,JSON.parse(fs.readFileSync(path.join(root,'data',t+'.json')))]));
const d={id:'00000000-0000-4000-8000-000000000001',revision:1,updateId:'fixture-release-ui',name:"FIXTURE · María O’Connor á ñ ü & <img src=x onerror='window.__fixtureScript=true'>",state:'PREPARADA PARA PUBLICAR',items:[],catalogChanges:[{type:'killers',key:all.killers[0].key,name:all.killers[0].name,action:'enabled',enabled:false}],build:{manifestHash:'a'.repeat(64)},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),validation:{ok:true,errors:[],warnings:[]},checks:{}};
const manifest={revision:1,baseCommit:'fixture-base',totals:Object.fromEntries(Object.entries(all).map(([type,items])=>[type,{before:items.length,after:items.length,added:0,disabled:0,reactivated:0,removed:0}])),files:Array.from({length:80},(_,n)=>({path:'assets/killers/fixture-'+n+'.webp',kind:n?'new':'replacement'})),entries:all,catalogChanges:[]};
let connected=false,auth=false,status={state:'SIN PUBLICACIÓN',active:false,canProduction:false},calls=[],forbidden=[];
const session=()=>({token:'fixture-session',repo:'SanLean17/SanLean17.github.io',branch:'codex/dbd-content-catalogs',commit:'fixture-base',data:'C:\\Fixture\\tests\\isolated\\datos',github:{connected,login:connected?'SanLean17':undefined},testMode:true,auth:{running:false},drafts:[d],preview:null,config:{},ports:{manager:4180,web:4181,streamer:4182}});
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.ttf':'font/ttf','.png':'image/png'};
(async()=>{
 fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})}),context=await browser.newContext({viewport:{width:1440,height:900}}),errors=[];
 context.setDefaultTimeout(15000);
 try{
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url()),p=u.pathname;if(u.hostname!=='manager.fixture')return route.abort();
   if(p.startsWith('/api/')){
    calls.push(p);let value;
    if(p==='/api/session')value=session();
    else if(p==='/api/catalogs')value=all;
    else if(p==='/api/draft')value={draft:d,analysis:{errors:[],warnings:[],all}};
    else if(p==='/api/editor')value=null;
    else if(p==='/api/github-status')value=session().github;
    else if(p==='/api/auth'){connected=auth;value={running:false,output:connected?'Logged in as SanLean17':'',success:connected};}
    else if(p==='/api/connect'){auth=true;value={running:true,output:'Conectando…'};}
    else if(p==='/api/publication-status')value=status;
    else if(p==='/api/publication-watch')value={changed:false};
    else if(p==='/api/publication-plan')value={baseBranch:'codex/dbd-content-catalogs',baseCommit:'fixture-base'};
    else if(p==='/api/simulate')value={draft:d,manifest};
    else {forbidden.push(p);return route.fulfill({status:400,json:{error:'Acción no permitida en fixture: '+p}});}
    return route.fulfill({json:value});
   }
   let f=p.startsWith('/canonical/')?path.join(root,p.slice(11)):p==='/catalog.js'?path.join(root,'js/dbd-catalog.js'):p==='/catalog-asset'?path.join(root,'rombo.png'):path.join(ui,p==='/'?'index.html':p.slice(1));
   if(p==='/local-fonts.css')return route.fulfill({body:'',contentType:'text/css'});
   if(fs.existsSync(f)&&fs.statSync(f).isFile())return route.fulfill({path:f,contentType:mime[path.extname(f)]||'application/octet-stream'});
   return route.fulfill({status:404,body:''});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async dialog=>{errors.push('Native dialog '+dialog.message());await dialog.dismiss();});
  await page.goto('http://manager.fixture/#settings');await page.locator('#githubConnection').waitFor();assert.match(await page.locator('#githubConnection').innerText(),/no conectado/);
  await page.locator('[data-action=connect]').click();await page.waitForFunction(()=>document.querySelector('#githubConnection')?.textContent.includes('SanLean17'));assert(await page.locator('#githubConnection').evaluate(n=>n.classList.contains('success')));
  await page.locator('#notice').waitFor({state:'hidden'});
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:900});await page.screenshot({path:path.join(output,'release-settings-'+width+'.png'),fullPage:true});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'settings overflow '+width);
   assert(await page.locator('.section-context h2').evaluate(n=>n.getBoundingClientRect().height<=parseFloat(getComputedStyle(n).lineHeight)*1.1),'Configuration title must not leave one letter on a second line');
   if(width===1440){const boxes=await page.locator('.settings-cards>.module-box').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect(),h=n.querySelector('h3').getBoundingClientRect(),a=n.querySelector('.actions').getBoundingClientRect();return {top:r.top,height:r.height,title:h.top,bottom:a.bottom};}));for(const field of ['top','height','title','bottom'])assert(Math.abs(boxes[0][field]-boxes[1][field])<2,'aligned '+field);}
  }
  await page.goto('http://manager.fixture/#edit/'+d.id);await page.locator('.steps [data-step="3"]').click();await page.locator('[data-action=publish]').waitFor();
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:760});await page.locator('[data-action=publish]').click();await page.locator('#modal').waitFor({state:'visible'});
   await page.locator('#modalBody details summary').click();await page.waitForFunction(()=>document.body.style.position==='fixed');
   const content=page.locator('.modal-content');assert(await content.evaluate(n=>n.scrollHeight>n.clientHeight),'long modal scroll');
   const top=await page.evaluate(()=>document.body.style.top),before=await content.evaluate(n=>n.scrollTop);await content.hover();await page.mouse.wheel(0,700);await page.waitForFunction(n=>document.querySelector('.modal-content').scrollTop>n,before);assert.equal(await page.evaluate(()=>document.body.style.top),top);
   await page.mouse.move(2,2);await page.mouse.wheel(0,700);assert.equal(await page.evaluate(()=>document.body.style.top),top);
   const buttons=await page.locator('.modal-bottom').boundingBox();assert(buttons.y>=0&&buttons.y+buttons.height<=760,'modal actions visible');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'modal overflow '+width);
   await page.screenshot({path:path.join(output,'release-publication-modal-'+width+'.png')});
   // The same canonical confirmation is used by local USUARIO and Streamer Tools.
   await page.evaluate(()=>{void SanLeanConfirm.open({title:'FINALIZAR ALL KILLER CHALLENGE',text:'Descripción larga de prueba. '.repeat(200),confirmLabel:'FINALIZAR'});});
   await page.locator('#slSystemConfirmCancel').waitFor();await page.waitForFunction(()=>document.activeElement.id==='slSystemConfirmCancel');await page.keyboard.press('Escape');await page.locator('#sanleanSystemConfirm').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>document.body.style.position),'fixed');
   await page.keyboard.press('Escape');await page.locator('#modal').waitFor({state:'hidden'});await page.waitForFunction(()=>document.body.style.position!=='fixed');
  }
  // Backdrop is a safe dismissal too.
  await page.locator('[data-action=publish]').click();await page.locator('#modal').waitFor({state:'visible'});await page.mouse.click(2,2);await page.locator('#modal').waitFor({state:'hidden'});
  d.publication={id:'fixture-publication',number:12,pr:'https://github.com/SanLean17/SanLean17.github.io/pull/12',commit:'fixture-sha',baseBranch:'codex/dbd-content-catalogs'};
  await page.reload();await page.locator('.steps [data-step="3"]').click();await page.locator('[data-action=verify-publication]').waitFor();
  const startedAt=new Date(Date.now()-38000).toISOString(),finishedAt=new Date(Date.parse(startedAt)+38000).toISOString();
  for(const state of ['CI EN CURSO','CI APROBADA','CI FALLÓ','BLOQUEADO POR BASE','DESPLEGANDO','PRODUCCIÓN ACTUALIZADA']){
   status={state,ciState:state==='BLOQUEADO POR BASE'?'CI APROBADA':state,active:['CI EN CURSO','DESPLEGANDO'].includes(state),startedAt,finishedAt:['CI EN CURSO','DESPLEGANDO'].includes(state)?null:finishedAt,pr:d.publication.pr,canProduction:false,completed:state==='PRODUCCIÓN ACTUALIZADA',...(state==='CI FALLÓ'?{error:'Falló la verificación del PR #12',failure:{workflow:'DBD content architecture',step:'Regression test',url:'https://github.com/SanLean17/SanLean17.github.io/actions/runs/99'}}:{})};
   await page.locator('[data-action=verify-publication]').click();await page.waitForFunction(s=>document.querySelector('#publicationStatus h3')?.textContent===s,state);
   assert(await page.locator('[data-action=production]').isDisabled());const clock=await page.locator('#publicationClock').innerText();
   if(!status.active){await page.waitForTimeout(1100);assert.equal(await page.locator('#publicationClock').innerText(),clock);assert(!await page.locator('#publicationStatus').innerText().then(t=>t.includes('El despliegue puede tardar')));}
   else assert(clock.startsWith('Tiempo transcurrido:'));
   await page.screenshot({path:path.join(output,'release-state-'+state.toLowerCase().replaceAll(' ','-')+'.png'),fullPage:true});
  }
  status={...status,state:'CI FALLÓ',completed:false,error:'Fallo de prueba',active:false};await page.reload();await page.locator('.steps [data-step="3"]').click();await page.waitForFunction(()=>document.querySelector('#publicationStatus h3')?.textContent==='CI FALLÓ');assert.equal(await page.locator('#publicationClock').innerText(),'Duración: 00:38');
  const terminalCalls=calls.filter(p=>p==='/api/publication-status').length;await page.waitForTimeout(11000);assert.equal(calls.filter(p=>p==='/api/publication-status').length,terminalCalls,'terminal CI polling stops');
  assert.equal(await page.evaluate(()=>window.__fixtureScript===true),false);assert.deepEqual(errors,[]);assert.deepEqual(forbidden,[]);
  fs.writeFileSync(path.join(output,'release-ui-report.json'),JSON.stringify({passed:true,widths:[1440,390,320],states:6,authAutoRefresh:true,modalScroll:true,bodyLock:true,nestedEscape:true,backdrop:true,cardsAligned:true,reload:true,terminalPollingStopped:true,productionRequests:0},null,2));
  console.log('PASS DBD CONTENT RELEASE REGRESSION UI: six states, timers, auth refresh, nested modals, scroll, backdrop and responsive cards.');
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

