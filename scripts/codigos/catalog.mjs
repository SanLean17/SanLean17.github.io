import {classify,statusAt} from './detector.mjs';
export function mergeCodes(previous,previousReview,posts,now=new Date().toISOString()){
 const codes=new Map((previous?.codes||[]).map(c=>[c.code.toUpperCase(),structuredClone(c)]));
 const reviews=new Map((previousReview?.items||[]).map(c=>[c.sourceUrl,structuredClone(c)]));
 const stats={postsAnalyzed:posts.length,candidates:0,confirmed:0,review:0,rejected:0,imagesFound:0};
 for(const post of [...posts].sort((a,b)=>a.publishedAt.localeCompare(b.publishedAt))){
  let result=classify(post);
  if(Date.parse(post.publishedAt)>Date.parse(now)+300000)result={classification:'REVIEW',candidates:result.candidates,reason:'Publicación con fecha futura'};
  stats[result.classification.toLowerCase()]++;stats.candidates+=result.candidates.length;
  if(result.classification==='REJECTED')continue;
  const old=codes.get(result.code);
  if(old?.status==='expired'&&Date.parse(post.publishedAt)>Date.parse(old.expiresAt||old.expiryUpperBound||old.publishedAt)&&!old.sources.some(s=>s.rawPostUri===post.uri)){
   stats.confirmed--;stats.review++;result={...result,classification:'REVIEW',reason:'Reaparición de código finalizado: confirmar renovación antes de reactivar'};
  }
  if(result.classification==='REVIEW'){
   const record={candidates:result.candidates,confidence:'REVIEW',reason:result.reason,sourceUrl:post.sourceUrl,sourceAccount:post.sourceAccount,rawPostUri:post.uri,publishedAt:post.publishedAt,text:post.text};
   const oldReview=reviews.get(post.sourceUrl);reviews.set(post.sourceUrl,{...record,detectedAt:oldReview?.detectedAt||now});continue;
  }
  reviews.delete(post.sourceUrl);
  stats.imagesFound+=(post.images||[]).length;
  const evidence={images:post.images||[],source:post.source,sourceType:'official_direct',sourceUrl:post.sourceUrl,sourceAccount:post.sourceAccount,sourceDid:post.sourceDid,sourcePostId:post.id,rawPostUri:post.uri,publishedAt:post.publishedAt,text:post.text};
  const sources=[...(old?.sources||[])];const index=sources.findIndex(s=>s.rawPostUri===post.uri);
  if(index>=0)sources[index]=evidence;else sources.push(evidence);
  sources.sort((a,b)=>(a.publishedAt||a.revisionAt||'').localeCompare(b.publishedAt||b.revisionAt||'')||(a.rawPostUri||a.sourceUrl).localeCompare(b.rawPostUri||b.sourceUrl));
  const newer=!old||post.publishedAt>=(old.publishedAt||'');
  let entry=old?{...old,sources}:{code:result.code,reward:null,publishedAt:post.publishedAt,status:'active',official:true,confidence:'CONFIRMED',detectedAt:now,sources};
  if(newer)entry={...entry,reward:entry.rewardEvidence?.sourcePostUri===post.uri?entry.rewardEvidence.reward:(result.reward||entry.reward),publishedAt:post.publishedAt,source:post.source,sourceType:'official_direct',sourceUrl:post.sourceUrl,sourceAccount:post.sourceAccount,sourcePostId:post.id,rawPostUri:post.uri,
    expiresAt:result.expiresAt||entry.expiresAt||null,expiryText:result.expiryText||entry.expiryText||null,expiryPrecision:result.expiryPrecision||entry.expiryPrecision||null,expiryUpperBound:result.expiryUpperBound||entry.expiryUpperBound||null,expiryYearInferred:result.expiryText?result.expiryYearInferred:(entry.expiryYearInferred||false)};
  const illustrated=[...sources].reverse().find(s=>s.images?.length);
  if(illustrated){entry.imageUrl=illustrated.images[0].url;entry.imageAlt=`Gráfica oficial del código ${entry.code}`;entry.imageSourceUrl=illustrated.sourceUrl;}
  const oldComparable=old&&{...old,lastVerifiedAt:null};
  entry.lastVerifiedAt=old&&JSON.stringify({...entry,lastVerifiedAt:null})===JSON.stringify(oldComparable)?old.lastVerifiedAt:now;
  entry.status=statusAt(entry,now);codes.set(entry.code,entry);
 }
 for(const entry of codes.values())entry.status=statusAt(entry,now);
 const entries=[...codes.values()].sort((a,b)=>(b.publishedAt||b.detectedAt||'').localeCompare(a.publishedAt||a.detectedAt||'')||a.code.localeCompare(b.code));
 const reviewEntries=[...reviews.values()].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.sourceUrl.localeCompare(b.sourceUrl));
 const changed=JSON.stringify(entries)!==JSON.stringify(previous?.codes||[])||JSON.stringify(reviewEntries)!==JSON.stringify(previousReview?.items||[]);
 return{changed,stats,catalog:changed?{schemaVersion:1,updatedAt:now,stats,codes:entries}:previous,review:changed?{...previousReview,schemaVersion:1,updatedAt:now,items:reviewEntries}:previousReview};
}
