import {createGallery} from './gallery.mjs';
import {enrichCode,compareCodes} from './model.mjs';
import {setupLightbox} from './lightbox.mjs';
import {setupArchive} from './archive.mjs';
import {expiryLabel} from './presentation.mjs';
const $=id=>document.getElementById(id);
const raw='https://raw.githubusercontent.com/SanLean17/SanLean17.github.io/main/';
const production=['sanlean.com.ar','www.sanlean.com.ar','sanlean17.github.io'].includes(location.hostname);
const debug=new URLSearchParams(location.search).get('debug')==='1';
const official=/^https:\/\/bsky\.app\/profile\/deadbydaylight\.com\/post\/[a-z0-9]+$/i;
const imageFailures=new Set();
function logImageFailure(code){imageFailures.add(code);console.warn('image unavailable',code);if(debug){const log=$('codes-image-log')||element('pre',undefined);log.id='codes-image-log';log.textContent=[...imageFailures].map(c=>`image unavailable: ${c}`).join('\n');$('codes-debug').append(log);}}
const lightbox=setupLightbox();
const wikiOfficial=url=>{try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='deadbydaylight.wiki.gg'&&u.pathname.startsWith('/wiki/');}catch{return false;}};
const date=value=>new Intl.DateTimeFormat('es-AR',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(value));
async function json(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json();}
function element(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function card(c){
 const article=element('article',undefined,'tier-board code-card');article.dataset.status=c.status;
 const images=c.images||[];
 const hasImage=images.length>0; if(!hasImage)article.classList.add('code-card-text');
 const media=hasImage?createGallery({images:c.status==='active'?images:images.slice(0,1),code:c.code,swipe:c.status==='active',onFailure:()=>logImageFailure(c.code),...(c.status==='active'?{onOpen:(index,button)=>{lightbox.open(images,index,button,c.code);window.sanleanTrack?.('code_image_open',{code:c.code,image_index:index+1,image_count:images.length});}}:{})}).root:null;
 const content=element('div',undefined,'code-content'),heading=element('div',undefined,'code-heading');
 if(hasImage)heading.append(element('h3',c.code),element('span',c.status==='active'?'ACTIVO':'FINALIZADO','code-state'));
 else {const top=element('div',undefined,'code-topline');top.append(element('span',c.status==='active'?'ACTIVO':'FINALIZADO','code-state'),element('span','CÓDIGO DE RECOMPENSA','code-kind'));heading.append(top,element('h3',c.code));}
 const dl=element('dl');const field=(label,value)=>dl.append(element('dt',label),element('dd',value));
 field('RECOMPENSA',c.reward||'Consultá la publicación oficial.');
 const expiry=expiryLabel(c);if(expiry)field(c.status==='expired'?'FINALIZÓ':'DISPONIBLE HASTA',expiry);
 const actions=element('div',undefined,'code-actions');const button=element('button',c.status==='active'?'COPIAR CÓDIGO':'NO DISPONIBLE','tier-tab active');button.type='button';button.disabled=c.status!=='active';button.setAttribute('aria-label',`${c.status==='active'?'Copiar':'No disponible:'} ${c.code}`);
 const feedback=element('span',undefined,'code-feedback');feedback.setAttribute('role','status');let timer;
 button.addEventListener('click',async()=>{clearTimeout(timer);try{await navigator.clipboard.writeText(c.code);window.sanleanTrack?.('code_copy',{code:c.code,status:c.status,source_type:c.sourceType});button.textContent='COPIADO';feedback.textContent=`${c.code} copiado`;}catch{button.textContent='NO SE PUDO COPIAR';feedback.textContent='Seleccioná el código y copialo manualmente.';}timer=setTimeout(()=>{button.textContent='COPIAR CÓDIGO';feedback.textContent='';},2000);});
 const link=element('a',c.sourceType==='nightlight'?'VER EN NIGHTLIGHT':c.sourceType==='official_wiki'?'VER EN DBD WIKI':'VER PUBLICACIÓN OFICIAL','code-source');link.href=c.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';link.addEventListener('click',()=>window.sanleanTrack?.('code_source_click',{code:c.code,source_type:c.sourceType,source_host:new URL(c.sourceUrl).hostname}));
 if(c.status==='active')actions.append(button,feedback);actions.append(link);content.append(heading,dl,actions);if(media)article.append(media);article.append(content);return article;
}
function render(data){
 if(data.schemaVersion!==1||!Array.isArray(data.codes))throw Error('Catálogo inválido');
 const codes=data.codes.filter(c=>((c.official===true&&c.confidence==='CONFIRMED'&&(c.sourceAccount==='deadbydaylight.com'||c.sourceType==='official_wiki'))||(c.sourceType==='nightlight'&&c.confidence==='COMMUNITY_VERIFIED'&&c.official===false))&&/^[A-Z0-9_-]{3,64}$/.test(c.code)&&(official.test(c.sourceUrl)||c.sourceType==='official_wiki'&&wikiOfficial(c.sourceUrl)||c.sourceType==='nightlight'&&c.sourceUrl==='https://nightlight.gg/codes')&&(Number.isFinite(Date.parse(c.publishedAt))||Number.isFinite(Date.parse(c.detectedAt)))).map(c=>({...enrichCode(c),status:c.status==='expired'||(c.expiresAt&&Date.now()>Date.parse(c.expiresAt))?'expired':'active'}));
 const unique=[...new Map(codes.sort((a,b)=>Number(a.sourceType==='nightlight')-Number(b.sourceType==='nightlight')).map(c=>[c.code,c])).values()];
 const permanent=unique.filter(c=>c.status==='active'&&c.expiryPolicy==='never').sort(compareCodes);
 const active=unique.filter(c=>c.status==='active'&&c.expiryPolicy!=='never').sort(compareCodes);
 const expired=unique.filter(c=>c.status==='expired').sort(compareCodes);
 for(const [id,list] of [['codes-active',active],['codes-permanent',permanent],['codes-expired',expired]])$(id).replaceChildren(...(list.length?list.map(card):[element('p','No hay códigos en esta categoría.') ]));

}
async function showDebug(data){
 $('codes-debug').hidden=false;
 const s=data.stats||{};let health=null;
 try{const r=await json('https://api.github.com/repos/SanLean17/SanLean17.github.io/commits/main/check-runs?check_name=Codigos-health&filter=latest&per_page=1');health=JSON.parse(r.check_runs?.[0]?.output?.summary||'null');}catch{}
 const stale=!health?.lastSuccessAt||Date.now()-Date.parse(health.lastSuccessAt)>6*3600000;
 $('codes-debug-content').textContent=`AUTOMATIZACIÓN\n${stale?'ACTUALIZACIÓN ATRASADA':'ACTUALIZACIÓN CORRECTA'}\nÚltima ejecución programada: ${health?.lastScheduledAt||'Sin registro disponible'}\nÚltima actualización correcta: ${health?.lastSuccessAt||'Sin registro disponible'}\nÚltimo cambio de catálogo: ${data.updatedAt}\nFuentes correctas: ${health?.sourcesHealthy??'—'}\nFuentes con error: ${health?.sourcesFailed??'—'}\nModo: ${health?.mode||'—'}\n${Object.entries(health?.sources||{}).map(([id,v])=>`${id}: ${v.lastError||'correcta'} · consulta ${v.lastAttemptAt} · última correcta ${v.lastSuccessAt||'—'} · elementos ${v.itemsFetched}`).join('\n')}\nPosts del último cambio: ${s.postsAnalyzed??'—'}\nConfirmados: ${s.confirmed??'—'} · En revisión: ${s.review??'—'} · Rechazados: ${s.rejected??'—'}`;

}
async function load(){
 $('codes-retry').hidden=true;$('codes-notice').hidden=true;
 try{let data;try{data=await json(production?`${raw}data/codigos.json?t=${Date.now()}`:'/data/codigos.json');}catch(error){if(!production)throw error;data=await json('/data/codigos.json');$('codes-notice').hidden=false;$('codes-notice').textContent=`No se pudo consultar la actualización más reciente. Mostrando la copia publicada del ${date(data.updatedAt)}; verificá la fuente oficial antes de canjear.`;}try{const community=await json(production?`${raw}data/codigos-nightlight.json?t=${Date.now()}`:'/data/codigos-nightlight.json');if(community.schemaVersion===1&&Array.isArray(community.codes))data={...data,codes:[...community.codes,...data.codes]};}catch(error){console.warn('NightLight no disponible, conservando códigos oficiales',error);}render(data);if(debug)await showDebug(data);}
 catch{$('codes-notice').hidden=false;$('codes-notice').textContent='No se pudieron cargar los códigos. Intentá nuevamente en unos minutos.';$('codes-retry').hidden=false;}
}
setupArchive($('codes-expired'));
$('codes-retry').addEventListener('click',load);load();
