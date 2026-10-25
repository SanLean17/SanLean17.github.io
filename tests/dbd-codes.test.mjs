import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {classify,expiryFrom,statusAt} from '../scripts/codigos/detector.mjs';
import {mergeCodes} from '../scripts/codigos/catalog.mjs';
import {officialPost,collect,ACCOUNT,DID} from '../scripts/codigos/sources/bluesky.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/codigos/official-feed.json',import.meta.url),'utf8'));
const posts=fixture.map(officialPost).filter(Boolean);
const post=text=>({...posts[0],text,publishedAt:'2026-09-10T15:00:00.000Z'});
const empty={codes:[]},review={items:[]},now='2026-10-25T20:00:00.000Z';
test('real official announcements: twelve confirmed and one ambiguous publication',()=>{
 const results=posts.map(classify);assert.equal(results.filter(r=>r.classification==='CONFIRMED').length,12);assert.equal(results.filter(r=>r.classification==='REVIEW').length,1);
 const star=results.find(r=>r.code==='STARSGUIDE');assert.equal(star.reward,'Stardotter Banner');assert.equal(star.expiresAt,'2026-10-10T15:00:00.000Z');
 const road=results.find(r=>r.code==='ROADTRIP');assert.equal(road.reward,'Dark Bomber');assert.equal(road.expiresAt,null);assert.equal(road.expiryText,'until October 2027');
 assert.equal(results.find(r=>r.code==='DIABLO').classification,'CONFIRMED');
});
test('collection headlines and cosmetics are not codes',()=>{
 for(const text of ['DIABLO COLLECTION AVAILABLE NOW','Everything that lives is designed to end... Gear up as 2B with the NieR Collection available tomorrow.','NEW UPDATE AVAILABLE NOW'])assert.equal(classify(post(text)).classification,'REJECTED');
});
test('Spanish, quotes and lowercase normalization',()=>{
 const r=classify(post('Usá el código "prueba2026" para obtener 300 puntos hasta el 10 de octubre de 2026.'));assert.equal(r.code,'PRUEBA2026');assert.equal(r.reward,'300 puntos');assert.equal(r.expiresAt,null);
});
test('uncertain, multiple, future and negative claims require review',()=>{
 for(const text of ['New code SOMETHING soon!','Use code FIRSTCODE and SECONDCODE in the Store','Do not use code EXAMPLE in the Store','For example, use code EXAMPLE in the Store'])assert.equal(classify(post(text)).classification,'REVIEW');
});
test('source spoof, repost and embedded foreign content cannot publish',()=>{
 const item=structuredClone(fixture[0]);item.post.author.did='did:plc:impostor';assert.equal(officialPost(item),null);
 assert.equal(officialPost({...fixture[0],reason:{}}),null);
 assert.equal(classify({...post('Use code DIABLO'),sourceDid:'fake'}).classification,'REJECTED');
 const quoted=structuredClone(fixture[0]);quoted.post.record.text='Look at this';quoted.post.record.embed={record:{text:'Use code FAKECODE'}};assert.equal(classify(officialPost(quoted)).classification,'REJECTED');
});
test('only exact official timestamps automatically expire; missing and partial dates stay active',()=>{
 assert.equal(statusAt({expiresAt:null},'2030-01-01T00:00:00Z'),'active');
 const partial=expiryFrom('until October 2027','2026-09-01');assert.equal(statusAt(partial,'2028-01-01'),'active');
 const timed=expiryFrom('before October 10th, 11AM ET','2026-09-10');assert.equal(statusAt(timed,'2026-10-10T15:00:01Z'),'expired');assert.equal(statusAt(timed,'2026-10-10T15:00:00Z'),'active');
 assert.equal(expiryFrom('before February 30th, 11AM ET','2026-01-01').expiresAt,null);
 assert.equal(expiryFrom('until January 10th, 11AM ET','2026-01-01').expiresAt,'2026-01-10T16:00:00.000Z');
});
test('merge is idempotent, preserves history and deduplicates official sources',()=>{
 const first=mergeCodes(empty,review,posts,now);assert.equal(first.catalog.codes.length,12);assert.equal(first.review.items.length,1);
 const second=mergeCodes(first.catalog,first.review,posts,'2026-10-25T21:00:00.000Z');assert.equal(second.changed,false);
 const sample=posts.find(p=>classify(p).code==='ROADTRIP');const newer={...sample,id:'newpost',uri:sample.uri+'new',sourceUrl:sample.sourceUrl+'new',publishedAt:'2026-10-25T19:00:00.000Z'};
 const merged=mergeCodes(first.catalog,first.review,[newer],now);assert.equal(merged.catalog.codes.length,12);assert.equal(merged.catalog.codes.find(c=>c.code==='ROADTRIP').sources.length,2);
 const absent=mergeCodes(first.catalog,first.review,[],now);assert.equal(absent.changed,false);
});
test('network adapter checks identity and pagination before returning anything',async()=>{
 await assert.rejects(collect({fetcher:async()=>({ok:true,json:async()=>({did:'wrong',handle:ACCOUNT})})}),/identidad/);
 let n=0;const r=await collect({since:'2026-01-01',fetcher:async()=>({ok:true,json:async()=>++n===1?{did:DID,handle:ACCOUNT}:{feed:fixture}})});assert.equal(r.posts.length,13);
});
