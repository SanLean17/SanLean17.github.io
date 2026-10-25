import {statusAt} from './detector.mjs';
export function applyCalendarExpiry(c){
 if(c.expiresAt||!c.expiryText)return c;
 if(c.expiryDate){c.expiresAt=c.expiryDate+'T23:59:59.999Z';c.expiryPolicy='calendar-day-end-UTC';return c;}
 if(c.expiryUpperBound&&['day','month'].includes(c.expiryPrecision)){
  // Existing upper bound represents the following day/month at 12 UTC.
  const next=Date.parse(c.expiryUpperBound)-12*3600000;
  c.expiryDate=new Date(next-86400000).toISOString().slice(0,10);
  c.expiresAt=new Date(/^before\b/i.test(c.expiryText)&&c.expiryPrecision==='day'?next-86400000:next-1).toISOString();
  c.expiryPolicy=/^before\b/i.test(c.expiryText)?'before-calendar-date-UTC':'calendar-period-end-UTC';
 }
 return c;
}
export function mergeWiki(codes,entries,now){
 const map=new Map(codes.map(c=>[c.code,structuredClone(c)]));const grouped=Map.groupBy(entries,e=>e.code);
 for(const [code,rows] of grouped){
  if(!map.has(code)&&rows.every(r=>r.evidenceYear&&r.evidenceYear<2026&&!r.currentAvailability))continue;
  let c=map.get(code);const direct=c?.source==='bluesky'||c?.sourceType==='official_direct';
  const rewards=[...new Set(rows.map(r=>r.reward))].sort();const dates=[...new Set(rows.map(r=>r.expiryDate).filter(Boolean))];
  if(dates.length>1)continue; // Conflicting dates cannot silently choose a winner.
  const first=rows[0],picture=rows.find(r=>r.imageUrl);
  c=c||{code,publishedAt:null,detectedAt:now,status:'active',official:true,confidence:'CONFIRMED',sources:[]};
  const evidence=rows.map(r=>({source:'wiki',sourceType:'official_wiki',sourceUrl:r.sourceUrl,revisionId:r.revisionId,revisionAt:r.revisionAt,reward:r.reward,expiryDate:r.expiryDate,imageUrl:r.imageUrl,evidence:r.evidence}));
  c.sources=[...(c.sources||[]).filter(s=>s.source!=='wiki'),...evidence];
  if(!direct){Object.assign(c,{reward:rewards.join(' + '),source:'wiki',sourceType:'official_wiki',sourceAccount:'deadbydaylight.wiki.gg',sourceUrl:first.sourceUrl});if(dates[0])Object.assign(c,{expiryDate:dates[0],expiryText:first.expiryText,expiryPrecision:'day',expiresAt:dates[0]+'T23:59:59.999Z',expiryPolicy:'calendar-day-end-UTC'});}
  else {c.sourceType='official_direct';if(!c.reward){c.reward=rewards.join(' + ');c.rewardSourceType='official_wiki';}
   if(!c.expiryText&&!c.expiresAt&&dates[0])Object.assign(c,{expiryDate:dates[0],expiryText:first.expiryText,expiryPrecision:'day',expiresAt:dates[0]+'T23:59:59.999Z',expiryPolicy:'calendar-day-end-UTC',expirySourceType:'official_wiki'});
  }
  if(!c.imageUrl&&picture)Object.assign(c,{imageUrl:picture.imageUrl,imageAlt:`Recompensa de ${code} en la Wiki oficial de DBD`,imageSourceUrl:picture.sourceUrl,imageSourceType:'official_wiki'});
  if(!direct&&picture)Object.assign(c,{imageUrl:picture.imageUrl,imageAlt:`Recompensa de ${code} en la Wiki oficial de DBD`,imageSourceUrl:picture.sourceUrl,imageSourceType:'official_wiki'});
  map.set(code,c);
 }
 return [...map.values()].map(c=>{applyCalendarExpiry(c);c.status=statusAt(c,now);return c;}).sort((a,b)=>(b.publishedAt||b.detectedAt||'').localeCompare(a.publishedAt||a.detectedAt||'')||a.code.localeCompare(b.code));
}
