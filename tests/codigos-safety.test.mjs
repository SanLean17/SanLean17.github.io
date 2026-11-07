import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {activateNightlight,discoverNightlight} from '../scripts/codigos/nightlight-baseline.mjs';
import {runCycle} from '../scripts/codigos/engine.mjs';
import {mergeWiki} from '../scripts/codigos/reconcile.mjs';
import {parsePage} from '../scripts/codigos/sources/wiki.mjs';
const permission={enabled:true,permissionReference:'TEST-ONLY written permission',channel:'TEST-ONLY authorized snapshot'};
const snapshot=codes=>({complete:true,codes:codes.map(code=>({code}))});
const initial=snapshot(['OLDTEST','PERMANENTTEST','EXPIREDTEST']);
const state=()=>activateNightlight(initial,permission,'2026-11-07T12:00:00Z');
test('NightLight activation imports nothing and freezes all original identifiers',()=>{
 const s=state();assert.deepEqual(s.baselineIds,['EXPIREDTEST','OLDTEST','PERMANENTTEST']);
 assert.equal(s.activatedAt,'2026-11-07T12:00:00Z');
 assert.deepEqual(discoverNightlight(initial,s,permission).candidates,[]);
});
test('Historic edits, reactivation, timestamps and images never become new codes',()=>{
 const edited={complete:true,codes:initial.codes.map(c=>({...c,status:'active',publishedAt:'2030-01-01',imageUrl:'changed',reward:'changed'}))};
 assert.deepEqual(discoverNightlight(edited,state(),permission).candidates,[]);
});
test('Only genuinely new normalized IDs become community REVIEW once',()=>{
 const s=snapshot(['oldtest','NEwTest','NEWTEST']);
 const r=discoverNightlight(s,state(),permission);
 assert.equal(r.candidates.length,1);assert.equal(r.candidates[0].code,'NEWTEST');
 assert.equal(r.candidates[0].official,false);assert.equal(r.candidates[0].confidence,'REVIEW');
 assert.equal(r.candidates[0].sourceType,'community_discovery');
 assert.deepEqual(discoverNightlight(s,r.state,permission).candidates,[]);
});
test('Missing state, corruption, incomplete snapshots and absent permission fail closed',()=>{
 assert.throws(()=>discoverNightlight(initial,null,permission),/Falta estado/);
 assert.throws(()=>discoverNightlight(initial,{...state(),baselineIds:[]},permission),/inválida/);
 assert.throws(()=>discoverNightlight({codes:initial.codes},state(),permission),/incompleta/);
 assert.throws(()=>activateNightlight(initial,{}),/autorización/);
 assert.throws(()=>discoverNightlight(initial,{schemaVersion:1,status:'pending_authorization'},permission),/Falta estado/);
});
test('No executable path downloads NightLight; public page does not consume old snapshot',()=>{
 const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
 assert.doesNotMatch(read('scripts/sync_nightlight_codes.py'),/urlopen|requests|BeautifulSoup|fetch/);
 assert.doesNotMatch(read('.github/workflows/codigos-nightlight.yml'),/schedule:|sync_nightlight_codes.py/);
 assert.doesNotMatch(read('codigos/codigos.js'),/codigos-nightlight.json/);
 assert.equal(JSON.parse(read('data/codigos-nightlight-state.json')).activatedAt,null);
});
test('Partial source failure does not report complete success or advance full-scan cadence',async()=>{
 const previous={lastCompleteSuccessAt:'2026-11-06T00:00:00Z'};
 const r=await runCycle({catalog:{codes:[]},review:{items:[]},state:previous,now:'2026-11-07T00:00:00Z',sources:[{id:'wiki',collect:async()=>({entries:[],fetched:5})},{id:'bluesky',collect:async()=>{throw Error('test outage');}}]});
 assert.equal(r.state.lastCompleteSuccessAt,previous.lastCompleteSuccessAt);
 assert.equal(r.state.lastSuccessAt,'2026-11-07T00:00:00Z');assert.equal(r.state.lastDailyAt,undefined);
});
test('Wiki start date alone is not an expiration',()=>{
 const page={title:'Template:General Event Charms',revisions:[{revid:1,timestamp:'2026-11-07',slots:{main:{content:'! Test Charm\n| Redeemable via code "STARTTEST" starting from 6 November 2026.'}}}]};
 assert.equal(parsePage(page)[0].expiryDate,null);
});
test('Wiki ranges with a shared year preserve the final date across months',()=>{
 for(const [clause,expected] of [['between 6 November - 6 December 2026.','2026-12-06'],['between 24 October - 25 November 2026.','2026-11-25'],['from 13-31 October 2026.','2026-10-31']]){
  const page={title:'Template:General Event Charms',revisions:[{revid:1,timestamp:'2026-11-07',slots:{main:{content:`! Test Charm\n| Redeemable via code "RANGETEST" ${clause}`}}}]};
  assert.equal(parsePage(page)[0].expiryDate,expected,clause);
 }
});
test('Wiki before-date and future availability do not publish incorrect active states',async()=>{
 const page={title:'Template:General Event Charms',revisions:[{revid:1,timestamp:'2026-11-07',slots:{main:{content:'! Test Charm\n| Redeemable via code "BEFORETEST" before 8 November 2026.'}}}]};
 const rows=parsePage(page);
 assert.equal(mergeWiki([],rows,'2026-11-07T00:00:00Z')[0].expiresAt,'2026-11-08T00:00:00.000Z');
 const future={...rows[0],code:'FUTURETEST',evidence:'Redeemable via code "FUTURETEST" starting from 20 November 2026.',expiryDate:null};
 const result=await runCycle({catalog:{codes:[]},review:{items:[]},now:'2026-11-07T00:00:00Z',sources:[{id:'wiki',collect:async()=>({entries:[future],fetched:1})}]});
 assert.equal(result.catalog.codes.length,0);assert.equal(result.review.sourceConflicts[0].confidence,'REVIEW');
});
test('Wiki historical imports, conflicting dates and reactivation remain conservative',()=>{
 const now='2026-11-07T00:00:00Z',row={code:'HISTORYTEST',reward:'Test reward',expiryDate:'2020-01-01',evidenceYear:2020};
 assert.equal(mergeWiki([],[row],now).length,0);
 const old={code:'OLDTEST',status:'expired',reward:'Preserved',expiresAt:'2026-10-01T00:00:00Z',sources:[]};
 assert.deepEqual(mergeWiki([old],[{...row,code:old.code,expiryDate:'2027-01-01',currentAvailability:true}],now),[old]);
 const active={...old,status:'active',expiresAt:'2027-01-01T00:00:00Z'};
 assert.equal(mergeWiki([active],[{...row,code:old.code,expiryDate:'2027-02-01'}],now)[0].expiresAt,active.expiresAt);
});
