// Browser-only fixtures: never write synthetic codes to the real catalog.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{try{let file=path.join(root,req.url.split('?')[0]);if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
try{for(const width of [1440,390]){
 const p=await browser.newPage({viewport:{width,height:900}});await p.route(/googletagmanager|google-analytics/,r=>r.abort());
 let revision=0,fail=false,requests=0,refFail=false;
 const requested=[];p.on('request',r=>requested.push(r.url()));
 await p.route('https://api.github.com/repos/SanLean17/SanLean17.github.io/git/ref/heads/main*',r=>refFail?r.abort():r.fulfill({contentType:'application/json',body:JSON.stringify({object:{sha:String(revision).repeat(40)}})}));
 const entry={code:'BROWSERTESTONLY',reward:'Synthetic test reward',official:true,confidence:'CONFIRMED',source:'bluesky',sourceType:'official_direct',sourceAccount:'deadbydaylight.com',sourceUrl:'https://bsky.app/profile/deadbydaylight.com/post/testonly',publishedAt:'2026-11-01T00:00:00Z',status:'active'};
 await p.route('**/data/codigos.json*',r=>{requests++;return fail?r.abort():r.fulfill({contentType:'application/json',body:JSON.stringify({schemaVersion:1,updatedAt:new Date().toISOString(),codes:revision?[entry,{...entry,code:'RELOADTESTONLY',expiresAt:'2020-01-01T00:00:00Z'}]:[entry]})});});
 const url=`http://127.0.0.1:${server.address().port}/codigos/`;
 await p.goto(url);await p.locator('#codes-active-text h3').waitFor();assert.equal(await p.locator('.code-card-text').count(),1);
 revision++;await p.reload();await p.locator('#codes-expired h3').waitFor();
 assert.deepEqual(await p.locator('#codes-expired h3').allTextContents(),['RELOADTESTONLY']);
 assert.equal(await p.locator('#codes-active-text h3').textContent(),'BROWSERTESTONLY');assert.ok(requests>=2);
 fail=true;await p.reload();await p.locator('#codes-retry').waitFor({state:'visible'});
 fail=false;await p.locator('#codes-retry').click();await p.locator('#codes-active-text h3').waitFor();
 assert.equal(await p.locator('#codes-retry').isVisible(),false);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 // Simulate the production hostname, serving our current files, not the deployed app.
 await p.route('https://sanlean.com.ar/**',async r=>{
  const u=new URL(r.request().url());
  if(u.pathname==='/data/codigos.json')return r.fulfill({contentType:'application/json',body:JSON.stringify({schemaVersion:1,updatedAt:new Date().toISOString(),codes:[entry]})});
  const response=await p.request.get(`http://127.0.0.1:${server.address().port}${u.pathname}${u.search}`);
  return r.fulfill({response});
 });
 await p.goto('https://sanlean.com.ar/codigos/');await p.locator('.code-card').first().waitFor();
 assert.ok(requested.some(u=>u.includes('/'+String(revision).repeat(40)+'/data/codigos.json')));
 revision++;await p.reload();await p.locator('.code-card').first().waitFor();
 assert.ok(requested.some(u=>u.includes('/'+String(revision).repeat(40)+'/data/codigos.json')));
 assert.ok(!requested.some(u=>u.includes('raw.githubusercontent.com')&&u.includes('/main/')));
 refFail=true;await p.reload();await p.locator('.code-card').first().waitFor();
 assert.match(await p.locator('#codes-notice').textContent(),/copia publicada/);
 console.log('PASS refresh, text-only card, client expiry, retry',width);await p.close();
}}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
