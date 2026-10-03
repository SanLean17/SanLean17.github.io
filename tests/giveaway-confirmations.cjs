const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const page=await browser.newPage();
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname==='fixture.test')return r.fulfill({path:path.join(root,u.pathname),contentType:({'.css':'text/css','.js':'text/javascript','.html':'text/html','.json':'application/json'})[path.extname(u.pathname)]});return r.abort()});
 await page.goto('https://fixture.test/Usuario/index.html');
 await page.evaluate(()=>{document.getElementById('panelView').hidden=false;document.getElementById('loginView').hidden=true});
 await page.locator('[data-section-key="tournament"]').click();
 await page.locator('#tournamentName').fill('SIMULACIÓN LOCAL');await page.locator('#createTournament').click();
 const check=async(id,name,width)=>{const m=page.locator(id);await m.waitFor({state:'visible'});const g=await m.evaluate(e=>{const r=s=>e.querySelector(s).getBoundingClientRect();const t=r('.reset-warning'),a=r('.confirm-actions'),d=r('.confirm-dialog');return{gap:a.top-t.bottom,left:d.left,right:d.right,buttons:[...e.querySelectorAll('.confirm-actions button')].map(x=>({text:x.textContent,...x.getBoundingClientRect().toJSON()}))}});assert(Math.abs(g.gap-48)<1,`${name}: actual gap ${g.gap}`);assert(g.left>=0&&g.right<=width);for(const b of g.buttons)assert(b.left>=g.left&&b.right<=g.right);if(process.env.QA_OUTPUT){fs.mkdirSync(process.env.QA_OUTPUT,{recursive:true});await m.screenshot({path:path.join(process.env.QA_OUTPUT,`${name}-${width}.png`)})}};
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:900});
  await page.locator('#deleteTournament').click();assert.equal(await page.locator('#tournamentConfirmTitle').innerText(),'CANCELAR TORNEO');assert.equal(await page.locator('#tournamentConfirmCancel').innerText(),'VOLVER');assert.equal(await page.locator('#tournamentConfirmAccept').innerText(),'CANCELAR TORNEO');
  await check('#tournamentConfirmModal','cancel-tournament',width);await page.locator('#tournamentConfirmCancel').click();assert(await page.locator('#createdTournament').isVisible());
  await page.locator('#finishTournament').click();await check('#tournamentConfirmModal','finish-tournament',width);await page.locator('#tournamentConfirmCancel').click();
  for(const title of ['FINALIZAR META','CANCELAR WIN STREAK','FINALIZAR CHALLENGE']){await page.evaluate(title=>{void window.SanLeanConfirm.open({title,text:'Se cerrará la sesión y no se podrá volver a editar.',confirmLabel:title})},title);await check('#sanleanSystemConfirm',title.replaceAll(' ','-'),width);await page.keyboard.press('Escape');assert(await page.locator('#sanleanSystemConfirm').isHidden())}
  console.log('PASS modal geometry and labels '+width);
 }
 await page.setViewportSize({width:1440,height:900});
 await page.locator('[data-section-key="giveaways"]').click();
 await page.locator('#giveawayKeyword').fill('tulipán');assert.equal(await page.locator('#giveawayKeyword').inputValue(),'TULIPÁN');
 await page.locator('#giveawayKeyword').fill('árbol');assert.equal(await page.locator('#giveawayKeyword').inputValue(),'ÁRBOL');
 console.log('PASS keyword input uppercase preserves accents');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
