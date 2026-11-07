// Browser-only fixtures: never write synthetic codes to the real catalog.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{try{let file=path.join(root,req.url.split('?')[0]);if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
try{for(const width of [1440,390]){
 const p=await browser.newPage({viewport:{width,height:900}});await p.route(/googletagmanager|google-analytics/,r=>r.abort());
 let revision=0,fail=false,requests=0;
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
 console.log('PASS refresh, text-only card, client expiry, retry',width);await p.close();
}}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
