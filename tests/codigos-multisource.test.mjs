import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {runCycle,selectMode} from '../scripts/codigos/engine.mjs';import {mergeWiki,applyCalendarExpiry} from '../scripts/codigos/reconcile.mjs';import {parsePage,collect} from '../scripts/codigos/sources/wiki.mjs';import {officialPost} from '../scripts/codigos/sources/bluesky.mjs';
const now='2026-10-26T00:00:00.000Z',catalog={schemaVersion:1,codes:[]},review={items:[]};
const pages=JSON.parse(fs.readFileSync(new URL('./fixtures/codigos/wiki-pages.json',import.meta.url),'utf8'));const entries=pages.flatMap(parsePage);
const posts=JSON.parse(fs.readFileSync(new URL('./fixtures/codigos/official-feed.json',import.meta.url),'utf8')).map(officialPost);
const goodBlue={id:'bluesky',collect:async()=>({posts,fetched:13})},goodWiki={id:'wiki',collect:async()=>({entries,fetched:5,state:{}})},bad=id=>({id,collect:async()=>{throw Error('simulated outage');}});
for(const [name,sources,healthy] of [['both succeed',[goodBlue,goodWiki],2],['Bluesky down, Wiki succeeds',[bad('bluesky'),goodWiki],1],['Wiki down, Bluesky succeeds',[goodBlue,bad('wiki')],1]])test(name,async()=>{const r=await runCycle({catalog,review,sources,now});assert.equal(r.state.sourcesHealthy,healthy);assert.ok(r.catalog.codes.length);if(sources.includes(goodWiki))assert.ok(r.catalog.codes.find(c=>c.code==='GROUNDCHUCKHBD'));if(sources.includes(goodBlue))assert.ok(r.catalog.codes.find(c=>c.code==='DIABLO'));});
test('all fail: preserve history and still expire locally',async()=>{const previous={codes:[{code:'EXPIRES',status:'active',expiresAt:'2026-10-25T23:00:00Z',sources:[]}]};const r=await runCycle({catalog:previous,review,sources:[bad('bluesky'),bad('wiki')],now});assert.equal(r.catalog.codes.length,1);assert.equal(r.catalog.codes[0].status,'expired');assert.equal(r.state.sourcesHealthy,0);const nochange=await runCycle({catalog:r.catalog,review:r.review,state:r.state,sources:[bad('bluesky'),bad('wiki')],now});assert.equal(nochange.changed,false);});
test('cross-source dedup and direct priority',async()=>{const r=await runCycle({catalog,review,sources:[goodBlue,goodWiki],now});const diablo=r.catalog.codes.filter(c=>c.code==='DIABLO');assert.equal(diablo.length,1);assert.equal(diablo[0].source,'bluesky');assert.ok(diablo[0].sources.some(s=>s.source==='wiki'));assert.ok(diablo[0].imageUrl.includes('cdn.bsky.app'));});
test('multiple wiki rewards, date and safe image filename',()=>{const codes=mergeWiki([],entries,now);const find=codes.find(c=>c.code==='FINDERSCREEPERS');assert.ok(find.reward.includes('Badge')&&find.reward.includes('Banner')&&find.reward.includes(' + '));assert.equal(find.expiresAt,'2026-11-25T23:59:59.999Z');assert.equal(codes.find(c=>c.code==='GROUNDCHUCKHBD').expiresAt,'2026-10-31T23:59:59.999Z');assert.equal(codes.find(c=>c.code==='MISSBEHAVIOURGC2026').expiresAt,undefined);});
test('no-op with unchanged evidence; REVIEW preserved',async()=>{const rev={items:[],manualCandidates:[{code:'BPFFM2026',confidence:'REVIEW'}]};const first=await runCycle({catalog,review:rev,sources:[goodBlue,goodWiki],now});const again=await runCycle({catalog:first.catalog,review:first.review,state:first.state,sources:[goodBlue,goodWiki],now:'2026-10-26T00:30:00.000Z'});assert.equal(again.changed,false);assert.equal(again.review.manualCandidates[0].confidence,'REVIEW');});
test('modes catch up after missed schedules',()=>{assert.equal(selectMode({},now),'daily');assert.equal(selectMode({lastDailyAt:now,lastFullAt:now},now),'fast');assert.equal(selectMode({lastDailyAt:'2026-10-25T04:00:00Z',lastFullAt:'2026-10-25T17:00:00Z'},now),'full');});
test('calendar policy explicit and month precision retained',()=>{const c=applyCalendarExpiry({expiryText:'until October 2027',expiryPrecision:'month',expiryUpperBound:'2027-11-01T12:00:00Z'});assert.equal(c.expiresAt,'2027-10-31T23:59:59.999Z');assert.equal(c.expiryPrecision,'month');assert.equal(applyCalendarExpiry({}).expiresAt,undefined);});
test('Wiki fast check reuses cached unchanged revisions without content or image downloads',async()=>{let calls=0;const state={version:6,pages:Object.fromEntries(pages.map(p=>[p.title,{revisionId:p.revisions[0].revid,entries:[]} ])),images:{}};await collect({mode:'fast',state,fetcher:async()=>{calls++;return {ok:true,json:async()=>({query:{pages:pages.map(p=>({title:p.title,revisions:[{revid:p.revisions[0].revid}]}))}})};}});assert.equal(calls,1);});

// Presentation metadata derives from evidence, never detection time when a better date exists.

const {codeImages,releaseInfo,wikiRelease,compareCodes,enrichCode,reconcileCodeStatuses}=await import('../codigos/model.mjs');
const wikiImage=n=>`https://deadbydaylight.wiki.gg/images/${n}.png`;
test('gallery derives one, multiple and deduplicated verified reward images',()=>{
 const c={code:'MULTI',sources:[{source:'wiki',reward:'A',imageUrl:wikiImage('A')},{source:'wiki',reward:'B',imageUrl:wikiImage('B')},{source:'wiki',reward:'A',imageUrl:wikiImage('A')+'?v=2'}]};
 assert.equal(codeImages({...c,sources:c.sources.slice(0,1)}).length,1);assert.deepEqual(codeImages(c).map(i=>i.reward),['A','B']);
 const url=posts.find(p=>p.images.length)?.images[0].url;assert.ok(url);c.sources.push({source:'bluesky',publishedAt:now,images:[{url}]});assert.equal(codeImages(c)[0].sourceType,'official_direct');assert.equal(codeImages(c).length,3);
});
test('release dates parse start of ranges and starting dates; revisions are marked estimates',()=>{
 assert.equal(wikiRelease('from 13-31 October 2026.'),'2026-10-13T00:00:00.000Z');
 assert.equal(wikiRelease('between 24 October - 25 November 2026.'),'2026-10-24T00:00:00.000Z');
 assert.equal(wikiRelease('starting 26 June 2026.'),'2026-06-26T00:00:00.000Z');
 const r=releaseInfo({sources:[{source:'wiki',revisionAt:'2026-08-28T23:07:34Z'}],detectedAt:now});assert.equal(r.releaseEvidence.estimated,true);assert.equal(r.releasedAt,'2026-08-28T23:07:34Z');
 assert.equal(releaseInfo({...r,sources:[{revisionAt:now}]}).releasedAt,r.releasedAt);
});
test('release ordering ignores expiration and recent discovery; new permanent code goes first',()=>{
 const list=[{code:'OLD',detectedAt:now,sources:[{evidence:'starting 26 June 2026.'}]},{code:'NEW',source:'bluesky',publishedAt:'2026-10-24T17:00:00Z',expiresAt:null},{code:'MIDDLE',sources:[{evidence:'from 13-31 October 2026.'}],expiresAt:'2026-10-31T23:59:59Z'}].map(enrichCode).sort(compareCodes);
 assert.deepEqual(list.map(c=>c.code),['NEW','MIDDLE','OLD']);assert.deepEqual(list.map(c=>({...c,status:'expired'})).sort(compareCodes).map(c=>c.code),['NEW','MIDDLE','OLD']);
 list.push(enrichCode({code:'TOMORROW',source:'bluesky',publishedAt:'2026-10-27T00:00:00Z'}));assert.equal(list.sort(compareCodes)[0].code,'TOMORROW');
});
test('expiry retains release date and an undated expiry remains active',async()=>{
 const c={codes:[enrichCode({code:'EXPIRED',source:'bluesky',publishedAt:'2026-10-24T00:00:00Z',expiresAt:'2026-10-25T00:00:00Z',status:'active',sources:[]}),enrichCode({code:'PERMANENT',source:'bluesky',publishedAt:'2026-10-24T00:00:00Z',status:'active',sources:[]})]};
 const r=await runCycle({catalog:c,review,sources:[bad('bluesky'),bad('wiki')],now});assert.equal(r.catalog.codes.find(c=>c.code==='EXPIRED').status,'expired');assert.equal(r.catalog.codes.find(c=>c.code==='PERMANENT').status,'active');assert.equal(r.catalog.codes[0].releasedAt,'2026-10-24T00:00:00Z');
});


// Disabled discovery metadata must never become a publishing source.
const {enabledSources,disabledSources,nightlight}=await import('../scripts/codigos/sources/index.mjs');
test('NightLight is known, disabled and cannot confirm or publish',()=>{
 assert.ok(disabledSources.includes(nightlight));
 assert.equal(nightlight.id,'nightlight');assert.equal(nightlight.url,'https://nightlight.gg/codes');
 for(const key of ['enabled','canConfirm','canPublish'])assert.equal(nightlight[key],false);
 assert.equal(nightlight.sourceType,'community_discovery');
 assert.deepEqual(enabledSources.map(s=>s.id),['bluesky','wiki']);
 assert.equal(nightlight.collect,undefined);
 assert.equal(nightlight.futureCandidate.confidence,'REVIEW');
 assert.equal(nightlight.futureCandidate.official,false);
 assert.equal(nightlight.futureCandidate.sourceType,'community_discovery');
});
test('registry import makes no requests; disabled discovery is absent from cycle',async()=>{
 const original=globalThis.fetch;let requests=0;
 globalThis.fetch=()=>{requests++;throw Error('unexpected network request');};
 try {
  const registry=await import('../scripts/codigos/sources/index.mjs?no-network-test');
  const r=await runCycle({catalog,review,now,sources:registry.enabledSources.map(s=>s.id==='bluesky'?goodBlue:goodWiki)});
  assert.equal(requests,0);assert.equal(r.state.sourcesHealthy,2);
  assert.equal(r.state.sources.nightlight,undefined);
  assert.ok(r.catalog.codes.some(c=>c.code==='DIABLO'));
  assert.ok(r.catalog.codes.some(c=>c.code==='GROUNDCHUCKHBD'));
 } finally {globalThis.fetch=original;}
});

test('Códigos duplicados: comunidad no reemplaza estado ni recompensas oficiales',()=>{
 const main=JSON.parse(fs.readFileSync(new URL('../data/codigos.json',import.meta.url),'utf8'));
 const community=JSON.parse(fs.readFileSync(new URL('../data/codigos-nightlight.json',import.meta.url),'utf8'));
 const merged=reconcileCodeStatuses([...community.codes,...main.codes],Date.parse('2026-11-02T18:00:00Z'));
 const find=code=>merged.find(c=>c.code===code);
 for(const code of ['MISSBEHAVIOURGC2026','GRASPINGTHEDARKNESS','NIGHTSHIFT']){
  const item=find(code),original=main.codes.find(c=>c.code===code);
  assert.ok(item&&original,code);
  assert.equal(original.status,'expired','No reactivar códigos que ya estaban caducados');
  assert.equal(item.status,original.status,code);
  assert.equal(item.sourceType,original.sourceType);
  assert.equal(item.reward,original.reward);
  assert.equal(item.sourceUrl,original.sourceUrl);
  assert.equal(original.expiryStatusSource,'previously_archived_community_status');
  assert.equal(item.expiryStatusSource,original.expiryStatusSource);
  assert.equal(original.expiresAt,undefined,'No inventar el día de vencimiento');
  assert.ok(codeImages(item).length>0,'Se conservan las imágenes de '+code);
 }
 assert.equal(find('DIABLO').status,'active');
 assert.equal(find('ROADTRIP').status,'active');
 assert.equal(find('GROUNDCHUCKHBD').status,'expired');
 assert.equal(merged.filter(c=>c.code==='MISSBEHAVIOURGC2026').length,1);
 const oldOnly=find('PLAYXENOMORPHIN2V8');
 assert.ok(oldOnly&&oldOnly.sourceType==='nightlight');
 assert.notEqual(oldOnly.trackedWhileActive,true);
 assert.ok(!(oldOnly.sourceType!=='nightlight'||oldOnly.trackedWhileActive===true));
});
test('La siguiente actualización Wiki conserva archivados los tres códigos caducados',()=>{
 const main=JSON.parse(fs.readFileSync(new URL('../data/codigos.json',import.meta.url),'utf8'));
 const names=['MISSBEHAVIOURGC2026','NIGHTSHIFT','GRASPINGTHEDARKNESS'];
 const before=main.codes.filter(c=>names.includes(c.code));
 const after=mergeWiki(main.codes,entries.filter(c=>names.includes(c.code)),'2026-11-07T15:00:00Z');
 for(const old of before){
  const current=after.find(c=>c.code===old.code);
  assert.equal(current.status,'expired',old.code);
  assert.equal(current.expiryStatusSource,'previously_archived_community_status',old.code);
  assert.equal(current.reward,old.reward);
  assert.equal(current.images.length,old.images.length);
  assert.equal(current.expiresAt,undefined);
 }
});

test('Conciliación automática respeta fechas futuras, fechas vencidas y permanentes',()=>{
 const now=Date.parse('2026-11-02T12:00:00Z');
 const shared={confidence:'CONFIRMED',status:'active',sourceType:'official_direct'};
 const community={status:'expired',sourceType:'nightlight'};
 const codes=reconcileCodeStatuses([
  {...community,code:'FUTURE'},{...community,code:'UNDATED'},{...community,code:'OLD'},{...community,code:'PERM'},
  {...shared,code:'FUTURE',expiresAt:'2026-11-25T00:00:00Z'},
  {...shared,code:'UNDATED'},
  {...shared,code:'OLD',expiresAt:'2026-10-31T00:00:00Z'},
  {...shared,code:'PERM',expiryPolicy:'never'}
 ],now);
 const find=code=>codes.find(c=>c.code===code);
 assert.equal(find('FUTURE').status,'active');
 assert.equal(find('UNDATED').status,'active');
 assert.equal(find('OLD').status,'expired');
 assert.equal(find('PERM').status,'active');
 assert.equal(codes.length,4);
 const reversed=reconcileCodeStatuses([...codes].reverse(),now);
 assert.equal(reversed.length,4);
 assert.equal(reversed.find(c=>c.code==='UNDATED').status,'active');
});

test('NightLight-only evidence cannot enter the published catalog',async()=>{
 const {mergeCodes}=await import('../scripts/codigos/catalog.mjs');
 const external={...posts[0],source:'nightlight',sourceType:'community_discovery',sourceAccount:'nightlight',sourceDid:null,sourceUrl:nightlight.url,text:'Use code NIGHTLIGHTONLY to unlock a reward.'};
 const r=mergeCodes(catalog,review,[external],now);
 assert.equal((r.catalog||catalog).codes.length,0);
 assert.equal(r.stats.confirmed,0);
});
