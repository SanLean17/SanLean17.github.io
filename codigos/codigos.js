import {setupArchive} from './archive.mjs';
import {expiryLabel,officialImage} from './presentation.mjs';
const $=id=>document.getElementById(id);
const raw='https://raw.githubusercontent.com/SanLean17/SanLean17.github.io/main/';
const production=['sanlean.com.ar','www.sanlean.com.ar','sanlean17.github.io'].includes(location.hostname);
const debug=new URLSearchParams(location.search).get('debug')==='1';
const official=/^https:\/\/bsky\.app\/profile\/deadbydaylight\.com\/post\/[a-z0-9]+$/i;
const imageFailures=new Set();
function logImageFailure(code){imageFailures.add(code);console.warn('image unavailable',code);if(debug){const log=$('codes-image-log')||element('pre',undefined);log.id='codes-image-log';log.textContent=[...imageFailures].map(c=>`image unavailable: ${c}`).join('\n');$('codes-debug').append(log);}}
const date=value=>new Intl.DateTimeFormat('es-AR',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(value));
async function json(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json();}
function element(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function card(c){
 const article=element('article',undefined,'tier-board code-card');article.dataset.status=c.status;
 const media=element('div',undefined,'code-media');
 const imageUrl=c.imageUrl||[...(c.sources||[])].reverse().find(s=>s.images?.length)?.images[0]?.url;
 const fallback=element('div',undefined,'code-media-fallback');fallback.append(element('span','CÓDIGO'),element('strong',c.code),element('small','SIN IMAGEN OFICIAL'));fallback.hidden=officialImage(imageUrl);media.append(fallback);
 if(officialImage(imageUrl)){
  const img=element('img');img.alt=c.imageAlt||`Gráfica oficial del código ${c.code}`;img.width=800;img.height=800;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';img.draggable=false;
  img.addEventListener('error',()=>{img.hidden=true;fallback.hidden=false;logImageFailure(c.code);},{once:true});img.src=imageUrl;media.append(img);
 }
 const content=element('div',undefined,'code-content'),heading=element('div',undefined,'code-heading');
 heading.append(element('h3',c.code),element('span',c.status==='active'?'ACTIVO':'FINALIZADO','code-state'));
 const dl=element('dl');const field=(label,value)=>dl.append(element('dt',label),element('dd',value));
 field('RECOMPENSA',c.reward||'Consultá la publicación oficial.');
 const expiry=expiryLabel(c);if(expiry)field(c.status==='expired'?'FINALIZÓ':'DISPONIBLE HASTA',expiry);
 const actions=element('div',undefined,'code-actions');const button=element('button',c.status==='active'?'COPIAR CÓDIGO':'NO DISPONIBLE','tier-tab active');button.type='button';button.disabled=c.status!=='active';button.setAttribute('aria-label',`${c.status==='active'?'Copiar':'No disponible:'} ${c.code}`);
 const feedback=element('span',undefined,'code-feedback');feedback.setAttribute('role','status');let timer;
 button.addEventListener('click',async()=>{clearTimeout(timer);try{await navigator.clipboard.writeText(c.code);button.textContent='COPIADO';feedback.textContent=`${c.code} copiado`;}catch{button.textContent='NO SE PUDO COPIAR';feedback.textContent='Seleccioná el código y copialo manualmente.';}timer=setTimeout(()=>{button.textContent='COPIAR CÓDIGO';feedback.textContent='';},2000);});
 const link=element('a','VER PUBLICACIÓN OFICIAL','code-source');link.href=c.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';
 if(c.status==='active')actions.append(button,feedback);actions.append(link);content.append(heading,dl,actions);article.append(media,content);return article;
}
function render(data){
 if(data.schemaVersion!==1||!Array.isArray(data.codes))throw Error('Catálogo inválido');
 const codes=data.codes.filter(c=>c.official===true&&c.confidence==='CONFIRMED'&&c.sourceAccount==='deadbydaylight.com'&&/^[A-Z0-9_-]{3,64}$/.test(c.code)&&official.test(c.sourceUrl)&&Number.isFinite(Date.parse(c.publishedAt))).map(c=>({...c,status:c.status==='expired'||(c.expiresAt&&Date.now()>Date.parse(c.expiresAt))?'expired':'active'}));
 const unique=[...new Map(codes.map(c=>[c.code,c])).values()];
 const active=unique.filter(c=>c.status==='active').sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt));
 const expired=unique.filter(c=>c.status==='expired').sort((a,b)=>(b.expiresAt||b.expiryUpperBound||b.publishedAt).localeCompare(a.expiresAt||a.expiryUpperBound||a.publishedAt));
 for(const [id,list] of [['codes-active',active],['codes-expired',expired]])$(id).replaceChildren(...(list.length?list.map(card):[element('p','No hay códigos en esta categoría.') ]));

}
async function showDebug(data){
 $('codes-debug').hidden=false;
 const s=data.stats||{};let run='No disponible';
 try{const r=await json('https://api.github.com/repos/SanLean17/SanLean17.github.io/actions/workflows/update-dbd-codes.yml/runs?per_page=1');const last=r.workflow_runs?.[0];if(last)run=`${last.created_at} · ${({completed:'finalizada',in_progress:'en curso',queued:'en espera'})[last.status]||'pendiente'} · ${({success:'correcta',failure:'fallida',cancelled:'cancelada',skipped:'omitida'})[last.conclusion]||'pendiente'}`;}catch{}
 $('codes-debug-content').textContent=`Último cambio del catálogo: ${data.updatedAt}\nÚltima consulta programada (inicio de ejecución): ${run}\nEstadísticas del último cambio guardado:\nPosts analizados: ${s.postsAnalyzed??'—'}\nCandidatos: ${s.candidates??'—'}\nConfirmados: ${s.confirmed??'—'}\nEn revisión: ${s.review??'—'}\nRechazados: ${s.rejected??'—'}\nImágenes encontradas en códigos confirmados: ${s.imagesFound??data.codes.filter(c=>c.imageUrl).length}\nLas consultas sin cambios quedan en los logs de Actions, sin generar commits.`;
}
async function load(){
 $('codes-retry').hidden=true;$('codes-notice').hidden=true;
 try{let data;try{data=await json(production?`${raw}data/codigos.json?t=${Date.now()}`:'/data/codigos.json');render(data);}catch(error){if(!production)throw error;data=await json('/data/codigos.json');render(data);$('codes-notice').hidden=false;$('codes-notice').textContent=`No se pudo consultar la actualización más reciente. Mostrando la copia publicada del ${date(data.updatedAt)}; verificá la fuente oficial antes de canjear.`;}if(debug)await showDebug(data);}
 catch{$('codes-notice').hidden=false;$('codes-notice').textContent='No se pudieron cargar los códigos. Intentá nuevamente en unos minutos.';$('codes-retry').hidden=false;}
}
setupArchive($('codes-expired'));
$('codes-retry').addEventListener('click',load);load();
