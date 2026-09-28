// Exercises the real private controller with in-memory storage; no account writes.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../js/usuario-roulettes.js'),'utf8');
const raw=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/killers.json'),'utf8')).slice(0,30);
const overlay={id:'isolated-qa',kind:'roulette_killers',settings:{pool:[]}},writes=[];
const tools={getOverlays:()=>[overlay],isOwner:()=>true,spinOverlay:async()=>true,getLastError:()=>''};
const client={from:()=>({update:payload=>({eq:()=>({select:()=>({single:async()=>{writes.push(structuredClone(payload));return {data:{id:overlay.id}}}})})})})};
const context={window:{SanLeanStreamTools:tools,SanLeanAccount:{getSettings:()=>({}),flushSettings:async()=>{}},dispatchEvent:()=>{}},location:{origin:'https://qa.local'},crypto:require('node:crypto').webcrypto,CustomEvent:class{},navigator:{},setTimeout:cb=>cb(),fetch:async()=>({ok:true,json:async()=>raw}),supabaseClient:()=>client,console};
vm.createContext(context);
const start=source.indexOf('  function ensureKillerController()'),end=source.indexOf('  async function writeReady');
vm.runInContext("let killerControllerInstalled=false,killerError=''; const tools=()=>window.SanLeanStreamTools; const absoluteImage=item=>'https://qa.local/'+item.image; const random01=()=>0;"+source.slice(start,end)+'ensureKillerController();',context);
(async()=>{
 assert(await tools.prepareKillerOverlay());assert.equal(overlay.settings.pool.length,30);
 await tools.spinOverlay(overlay.id);const first=overlay.state.items[0].key;
 await tools.spinOverlay(overlay.id);assert.equal(overlay.state.items[0].key,first);assert.equal(overlay.settings.usedKillers.length,0);
 assert(await tools.setKillerRepeatMode('remove'));const winners=new Set();
 for(let i=0;i<30;i++){
  assert(await tools.spinOverlay(overlay.id));const key=overlay.state.items[0].key;assert(!winners.has(key));winners.add(key);
  assert.equal(overlay.settings.pool.length,29-i);assert(!overlay.settings.pool.some(x=>x.key===key));assert(overlay.state.spinPool.some(x=>x.key===key));
 }
 assert.equal(await tools.spinOverlay(overlay.id),false);assert.match(tools.getLastError(),/Ya salieron todos/);
 assert(await tools.resetUsedKillers());assert.equal(overlay.settings.pool.length,30);assert.equal(overlay.settings.usedKillers.length,0);
 const spinning=writes.filter(x=>x.state?.status==='spinning');assert(spinning.every(x=>x.state.durationMs===8000));
 console.log('PASS: keep repeats, 30 unique removals, last killer, exhausted pool, reset, 8000ms, in-memory storage only');
})().catch(e=>{console.error(e);process.exitCode=1});
