import {enrichCode,compareCodes} from '../../codigos/model.mjs';
import {mergeCodes} from './catalog.mjs';
import {mergeWiki} from './reconcile.mjs';
export function selectMode(state,now){const t=Date.parse(now);if(!state.lastDailyAt||t-Date.parse(state.lastDailyAt)>=86400000)return 'daily';if(!state.lastFullAt||t-Date.parse(state.lastFullAt)>=21600000)return 'full';return 'fast';}
export async function runCycle({catalog,review,state={},sources,now=new Date().toISOString(),event='local',mode=selectMode(state,now)}){
 const next=structuredClone(state);next.sources||={};next.lastAttemptAt=now;if(event==='schedule')next.lastScheduledAt=now;
 const results=await Promise.allSettled(sources.map(s=>s.collect({mode,candidates:(review.manualCandidates||[]).filter(r=>r.confidence==='REVIEW').map(r=>r.code),catalog:catalog.codes,knownCodes:catalog.codes.map(c=>c.code),state:state.sources?.[s.id]?.cursor||{},since:new Date(Date.parse(mode==='fast'?(state.sources?.[s.id]?.lastSuccessAt||now):now)-(mode==='fast'?2:mode==='full'?150*24:365*24)*3600000).toISOString()})));
 let posts=[],wiki=[],success=0;
 results.forEach((r,i)=>{const id=sources[i].id,old=next.sources[id]||{};if(r.status==='fulfilled'){success++;const data=r.value;if(id==='bluesky')posts=data.posts;else if(id==='wiki')wiki=data.entries;next.sources[id]={...old,lastAttemptAt:now,lastSuccessAt:now,lastError:null,itemsFetched:data.fetched,candidatesFound:(data.entries||[]).length,cursor:data.state||old.cursor||{}};}else next.sources[id]={...old,lastAttemptAt:now,lastError:String(r.reason?.message||r.reason),itemsFetched:0,candidatesFound:0};});
 const merged=mergeCodes(catalog,review,posts,now);if(next.sources.bluesky&&!next.sources.bluesky.lastError)next.sources.bluesky.candidatesFound=merged.stats.candidates;
 const codes=mergeWiki(merged.catalog?.codes||catalog.codes,wiki,now).map(enrichCode).sort(compareCodes);
 for(const c of codes){const old=catalog.codes.find(x=>x.code===c.code);if(old&&JSON.stringify({...c,lastVerifiedAt:null})===JSON.stringify({...old,lastVerifiedAt:null}))c.lastVerifiedAt=old.lastVerifiedAt;}
 let updatedReview=structuredClone(merged.review||review);
 const conflicts=[];for(const [code,rows] of Map.groupBy(wiki,r=>r.code)){const dates=[...new Set(rows.map(r=>r.expiryDate).filter(Boolean))];if(dates.length>1)conflicts.push({code,confidence:'REVIEW',reason:'Fechas contradictorias entre entradas Wiki',dates,sources:rows.map(r=>r.sourceUrl)});}
 if(wiki.length||!next.sources.wiki?.lastError)updatedReview.sourceConflicts=conflicts;
 if(updatedReview.manualCandidates)updatedReview.manualCandidates=updatedReview.manualCandidates.map(r=>codes.some(c=>c.code===r.code)?{...r,confidence:'CONFIRMED',resolvedBy:codes.find(c=>c.code===r.code).sourceUrl}:r);
 const changed=JSON.stringify(codes)!==JSON.stringify(catalog.codes)||JSON.stringify(updatedReview.items)!==JSON.stringify(review.items)||JSON.stringify(updatedReview.manualCandidates)!==JSON.stringify(review.manualCandidates)||JSON.stringify(updatedReview.sourceConflicts||[])!==JSON.stringify(review.sourceConflicts||[]);
 if(success)next.lastSuccessAt=now;
 if(success){if(mode==='daily')next.lastDailyAt=now;if(mode!=='fast')next.lastFullAt=now;}
 next.mode=mode;next.catalogChanged=changed;next.lastCatalogChange=changed?now:catalog.updatedAt;next.sourcesHealthy=success;next.sourcesFailed=sources.length-success;
 return{changed,catalog:changed?{...catalog,updatedAt:now,stats:merged.stats,codes}:catalog,review:changed?{...updatedReview,updatedAt:now}:review,state:next};
}
