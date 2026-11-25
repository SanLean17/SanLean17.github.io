import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {activateNightlight,discoverNightlight} from '../scripts/codigos/nightlight-baseline.mjs';
import {runCycle} from '../scripts/codigos/engine.mjs';
import {mergeWiki} from '../scripts/codigos/reconcile.mjs';
import {parsePage} from '../scripts/codigos/sources/wiki.mjs';
import {reconcileCodeStatuses} from '../codigos/model.mjs';
import {mergeCodes} from '../scripts/codigos/catalog.mjs';
import {officialPost} from '../scripts/codigos/sources/bluesky.mjs';
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

const launchOnly={code:'LAUNCHONLYTEST',reward:'Test Banner',evidenceYear:2026,expiryDate:null,currentAvailability:false,evidence:'Redeemable via code "LAUNCHONLYTEST" starting 21 November 2026.',sourceUrl:'https://deadbydaylight.wiki.gg/wiki/Template:Special_Banners',imageUrl:'https://deadbydaylight.wiki.gg/images/Test.png'};
const reviewTime='2026-11-25T12:00:00Z';
test('New Wiki launch without current availability enters persistent review, not active or expired',async()=>{
 const sources=[{id:'wiki',collect:async()=>({entries:[launchOnly],fetched:1})}];
 const first=await runCycle({catalog:{codes:[]},review:{items:[],manualCandidates:[{code:launchOnly.code,confidence:'REVIEW'}]},sources,now:reviewTime});
 const held=first.catalog.codes[0];
 assert.equal(held.status,'review');assert.equal(held.confidence,'REVIEW');assert.equal(held.expiresAt,undefined);
 assert.equal(held.images.length,1);assert.equal(first.review.availabilityReviews[0].code,held.code);
 assert.equal(first.review.manualCandidates[0].confidence,'REVIEW');
 const repeated=await runCycle({catalog:first.catalog,review:first.review,state:first.state,sources,now:'2026-11-25T13:00:00Z'});
 assert.equal(repeated.changed,false);
 const outage=await runCycle({catalog:first.catalog,review:first.review,sources:[{id:'wiki',collect:async()=>{throw Error('offline');}}],now:'2030-01-01T00:00:00Z'});
 assert.equal(outage.catalog.codes[0].status,'review');assert.deepEqual(outage.review.availabilityReviews,first.review.availabilityReviews);
});
test('Wiki deadlines and explicit current availability can confirm new discoveries; older accepted entries stay intact',()=>{
 for(const row of [{...launchOnly,expiryDate:'2026-12-01',expiryText:'until December 1, 2026'},{...launchOnly,currentAvailability:true}]){
  const item=mergeWiki([],[row],reviewTime)[0];assert.equal(item.status,'active');assert.equal(item.confidence,'CONFIRMED');
 }
 const accepted={code:launchOnly.code,status:'active',confidence:'CONFIRMED',sources:[]};
 assert.equal(mergeWiki([accepted],[launchOnly],reviewTime)[0].status,'active');
});
test('Wiki updates cannot silently clear a hold, even if a new deadline appears',()=>{
 const held=mergeWiki([],[launchOnly],reviewTime)[0];
 assert.deepEqual(mergeWiki([held],[{...launchOnly,currentAvailability:true,expiryDate:'2027-01-01'}],reviewTime),[held]);
});
test('Official announcements still publish without an expiry, but cannot silently clear an existing hold',()=>{
 const raw=JSON.parse(fs.readFileSync(new URL('./fixtures/codigos/official-feed.json',import.meta.url),'utf8'))[0];
 const post={...officialPost(raw),text:'Use code LAUNCHONLYTEST to unlock a Banner.',images:[],publishedAt:'2026-11-24T12:00:00Z'};
 const fresh=mergeCodes({codes:[]},{items:[]},[post],reviewTime).catalog.codes[0];
 assert.equal(fresh.status,'active');assert.equal(fresh.sourceType,'official_direct');
 const held=mergeWiki([],[launchOnly],reviewTime)[0];
 const next=mergeCodes({codes:[held]},{items:[]},[post],reviewTime).catalog.codes[0];
 assert.equal(next.status,'review');assert.equal(next.confidence,'REVIEW');
});
test('Browser reconciliation preserves review and does not resurrect a community duplicate',()=>{
 const held=mergeWiki([],[launchOnly],reviewTime)[0];
 const community={...held,official:false,sourceType:'nightlight',status:'active',confidence:'COMMUNITY_VERIFIED'};
 for(const rows of [[community,held],[held,community]]){
  const items=reconcileCodeStatuses(rows,Date.parse('2030-01-01'));
  assert.equal(items.length,1);assert.equal(items[0].status,'review');assert.equal(items[0].official,true);
 }
});
