import {officialImage} from './presentation.mjs';
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
const valid=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export function wikiRelease(text=''){
 const m=text.match(new RegExp(`(?:from|between|starting)\\s+(\\d{1,2})(?:\\s*[-–]\\s*\\d{1,2})?\\s+(${months.join('|')})(?:\\s+(20\\d{2}))?`, 'i'));
 if(!m)return null;const year=m[3]||text.slice(m.index).match(/20\d{2}/)?.[0];if(!year)return null;
 const month=months.findIndex(x=>x.toLowerCase()===m[2].toLowerCase()),d=new Date(Date.UTC(+year,month,+m[1]));
 return d.getUTCMonth()===month&&d.getUTCDate()===+m[1]?d.toISOString():null;
}
export function releaseInfo(c){
 const sources=c.sources||[];
 const direct=sources.filter(s=>s.sourceType==='official_direct'||s.source==='bluesky').map(s=>({date:s.publishedAt,url:s.sourceUrl})).filter(s=>valid(s.date)).sort((a,b)=>a.date.localeCompare(b.date));
 if(!direct.length&&c.source==='bluesky'&&valid(c.publishedAt))direct.push({date:c.publishedAt,url:c.sourceUrl});
 if(direct.length)return {releasedAt:direct[0].date,releaseEvidence:{type:'official_direct',sourceUrl:direct[0].url,estimated:false}};
 const wiki=sources.map(s=>({date:wikiRelease(s.evidence),url:s.sourceUrl})).filter(s=>s.date).sort((a,b)=>a.date.localeCompare(b.date));
 if(wiki.length)return {releasedAt:wiki[0].date,releaseEvidence:{type:'wiki_explicit',sourceUrl:wiki[0].url,estimated:false}};
 // A later page edit must not make an old code look newly released.
 if(valid(c.releasedAt)&&c.releaseEvidence)return {releasedAt:c.releasedAt,releaseEvidence:c.releaseEvidence};
 const revisions=sources.filter(s=>valid(s.revisionAt)).sort((a,b)=>a.revisionAt.localeCompare(b.revisionAt));
 const date=revisions[0]?.revisionAt||c.publishedAt||c.detectedAt;
 return {releasedAt:valid(date)?date:null,releaseEvidence:{type:revisions.length?'source_revision':'detected',sourceUrl:revisions[0]?.sourceUrl||c.sourceUrl||null,estimated:true}};
}
export function codeImages(c){
 const sources=c.sources||[],all=[];
 const add=(url,alt,reward,sourceUrl,sourceType)=>{if(officialImage(url))all.push({url,alt:alt||reward||`Imagen de ${c.code}`,reward:reward||null,sourceUrl:sourceUrl||c.sourceUrl,sourceType});};
 for(const s of sources.filter(s=>s.sourceType==='official_direct'||s.source==='bluesky').sort((a,b)=>String(b.publishedAt).localeCompare(String(a.publishedAt))))for(const i of s.images||[])add(i.url,i.alt,c.reward,s.sourceUrl,'official_direct');
 if(c.imageUrl&&!c.imageUrl.includes('deadbydaylight.wiki.gg'))add(c.imageUrl,c.imageAlt,c.reward,c.imageSourceUrl,'official_direct');
 for(const s of sources.filter(s=>s.sourceType==='official_wiki'||s.source==='wiki'))add(s.imageUrl,s.reward,s.reward,s.sourceUrl,'official_wiki');
 if(!all.length)for(const i of c.images||[])add(i.url,i.alt,i.reward,i.sourceUrl,i.sourceType);
 if(!all.length)add(c.imageUrl,c.imageAlt,c.reward,c.imageSourceUrl,c.imageSourceType||c.sourceType);
 const urls=new Set(),rewards=new Set();return all.filter(i=>{const u=new URL(i.url);u.hash='';if(u.hostname==='deadbydaylight.wiki.gg')u.search='';const key=u.href,r=i.sourceType==='official_wiki'?i.reward?.toLowerCase():null;if(urls.has(key)||(r&&rewards.has(r)))return false;urls.add(key);if(r)rewards.add(r);return true;});
}
export function compareCodes(a,b){return (Date.parse(b.releasedAt)||0)-(Date.parse(a.releasedAt)||0)||(Date.parse(b.expiresAt)||0)-(Date.parse(a.expiresAt)||0)||a.code.localeCompare(b.code);}
export function enrichCode(c){return {...c,...releaseInfo(c),images:codeImages(c)};}
