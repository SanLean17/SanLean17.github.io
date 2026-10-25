export const ENDPOINT='https://deadbydaylight.wiki.gg/api.php';
export const PAGES=['Template:General Event Charms','Template:General Event Banners','Template:General Event Badges','Template:Special Banners','Template:Special Badges'];
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
const clean=s=>s.replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g,'$1').replace(/'{2,}/g,'').replace(/<[^>]*>/g,' ').replace(/&quot;/g,'"').trim();
export function parsePage(page){
 const rev=page.revisions?.[0],text=rev?.slots?.main?.content;if(typeof text!=='string')throw Error(`Sin contenido estructurado: ${page.title}`);
 const entries=[];
 for(const row of text.split(/\n\|-/)){
  const name=clean(row.match(/^!\s+([^\n!]+)/m)?.[1]||'');if(!name||name==='Icon')continue;
  for(const m of row.matchAll(/(?:[Rr]edeemable via code)\s+["“]([A-Za-z0-9_-]{3,64})["”]([^\n]*)/g)){
   const code=m[1].toUpperCase(),clause=clean(m[2]),year=clause.match(/20\d{2}/g)?.at(-1);
   // Restrict automatic historical import to recent dated announcements and explicit current availability.

   const dates=[...clause.matchAll(new RegExp(`(\\d{1,2})\\s+(${months.join('|')})\\s+(20\\d{2})`,'g'))];
   const last=dates.at(-1);let expiryDate=null;
   if(last&&/\b(?:between|from|until|before)\b/i.test(clause)){
    const month=months.indexOf(last[2])+1;const d=new Date(Date.UTC(+last[3],month-1,+last[1]));if(d.getUTCMonth()===month-1)expiryDate=d.toISOString().slice(0,10);
   }
   if(!year&&!/Now redeemable/i.test(row)&&!expiryDate)continue;
   const kind=page.title.endsWith('Charms')?'Charm':page.title.endsWith('Badges')?'Badge':'Banner';
   const file=row.match(/\[\[File:([^|\]]+)/i)?.[1];
   entries.push({code,reward:`${name} ${kind}`,expiryDate,expiryText:expiryDate?`until ${last[2]} ${last[1]}, ${last[3]}`:null,imageFile:file&&file!=='.png'?`File:${file}`:null,evidenceYear:year?+year:null,currentAvailability:/Now redeemable/i.test(row),source:'wiki',sourceType:'official_wiki',sourceUrl:`https://deadbydaylight.wiki.gg/wiki/${encodeURIComponent(page.title.replaceAll(' ','_'))}`,revisionId:rev.revid,revisionAt:rev.timestamp,evidence:clean(m[0]),page:page.title});
  }
 }
 return entries;
}
async function query(params,fetcher){const u=new URL(ENDPOINT);u.search=new URLSearchParams({action:'query',format:'json',formatversion:'2',...params});const r=await fetcher(u,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'SanLean-Codes/2.0 (https://sanlean.com.ar/codigos/)'}});if(!r.ok)throw Error(`Wiki HTTP ${r.status}`);const d=await r.json();if(d.error)throw Error(d.error.info);return d.query;}
export async function collect({mode='daily',state={},knownCodes=[],candidates=[],fetcher=fetch}={}){
 const watched=[...new Set([...PAGES,...Object.keys(state.pages||{})])].slice(0,25);
 const meta=await query({prop:'revisions',rvprop:'ids|timestamp',titles:watched.join('|')},fetcher);
 if(meta.pages?.length!==watched.length||meta.pages.some(p=>p.missing||!p.revisions?.[0]))throw Error('Wiki: faltan páginas o revisiones esperadas');
 const changed=meta.pages.filter(p=>mode==='daily'||state.version!==3||state.pages?.[p.title]?.revisionId!==p.revisions[0].revid);
 let pages={...(state.pages||{})};
 if(changed.length){const full=await query({prop:'revisions',rvprop:'ids|timestamp|content',rvslots:'main',titles:changed.map(p=>p.title).join('|')},fetcher);for(const page of full.pages){const entries=parsePage(page);pages[page.title]={revisionId:page.revisions[0].revid,entries};}}
 let entries=Object.values(pages).flatMap(p=>p.entries);
 let candidateSearch={...(state.candidateSearch||{})};
 if(mode!=='fast')for(const code of candidates.slice(0,20)){
  const found=await query({list:'search',srsearch:`"${code}"`,srlimit:'3'},fetcher);candidateSearch[code]=(found.search||[]).map(p=>p.title);
  const titles=candidateSearch[code].filter(t=>!PAGES.includes(t));
  if(titles.length){const extra=await query({prop:'revisions',rvprop:'ids|timestamp|content',rvslots:'main',titles:titles.join('|')},fetcher);for(const p of extra.pages||[])if(!p.missing){const parsed=parsePage(p).filter(e=>e.code===code);if(parsed.length){pages[p.title]={revisionId:p.revisions[0].revid,entries:parsed};for(const e of parsed)if(!entries.some(x=>x.code===e.code&&x.sourceUrl===e.sourceUrl&&x.reward===e.reward))entries.push(e);}}}
 }

 const files=[...new Set(entries.map(e=>e.imageFile).filter(Boolean))];let images={...(state.images||{})};const missing=files.filter(f=>mode!=='fast'||!Object.hasOwn(images,f));
 for(let i=0;i<missing.length;i+=50){const result=await query({prop:'imageinfo',iiprop:'url',titles:missing.slice(i,i+50).join('|')},fetcher);for(const p of result.pages||[])images[p.title]=p.imageinfo?.[0]?.url||null;for(const n of result.normalized||[])images[n.from]=images[n.to]||null;}
 entries=entries.map(e=>({...e,imageUrl:images[e.imageFile]||null}));
 return {entries,fetched:meta.pages.length+changed.length,state:{version:3,pages,images,candidateSearch}};
}
