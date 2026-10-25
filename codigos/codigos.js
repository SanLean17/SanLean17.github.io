const $=id=>document.getElementById(id);
const raw='https://raw.githubusercontent.com/SanLean17/SanLean17.github.io/main/';
const production=['sanlean.com.ar','www.sanlean.com.ar','sanlean17.github.io'].includes(location.hostname);
const debug=new URLSearchParams(location.search).get('debug')==='1';
const official=/^https:\/\/bsky\.app\/profile\/deadbydaylight\.com\/post\/[a-z0-9]+$/i;
const date=value=>new Intl.DateTimeFormat('es-AR',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(value));
async function json(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json();}
function element(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function card(c){
 const article=element('article',undefined,'code-card');article.dataset.status=c.status;
 article.append(element('span',c.status==='active'?'ACTIVO':'FINALIZADO','code-state'),element('h3',c.code));
 const dl=element('dl');const field=(label,value)=>dl.append(element('dt',label),element('dd',value));
 field('RECOMPENSA',c.reward||'La publicación no detalla la recompensa.');
 field('PUBLICACIÓN OFICIAL',date(c.publishedAt));
 field(c.status==='expired'?'PLAZO FINALIZADO':'FINALIZACIÓN',c.expiresAt?`${date(c.expiresAt)} · ${new Date(c.expiresAt).toISOString().slice(11,16)} UTC`:c.expiryText?`${c.expiryText}${c.expiryYearInferred?' (año según publicación: '+new Date(c.publishedAt).getUTCFullYear()+')':''} · Sin hora exacta confirmada.`:'SIN FECHA DE FINALIZACIÓN CONFIRMADA');
 const actions=element('div',undefined,'code-actions');const button=element('button',c.status==='active'?'COPIAR CÓDIGO':'NO DISPONIBLE','btn');button.type='button';button.disabled=c.status!=='active';button.setAttribute('aria-label',`${c.status==='active'?'Copiar':'No disponible:'} ${c.code}`);
 const feedback=element('span');feedback.setAttribute('role','status');feedback.hidden=true;
 button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(c.code);button.textContent='COPIADO';feedback.hidden=false;feedback.textContent='Código copiado';setTimeout(()=>{button.textContent='COPIAR CÓDIGO';feedback.hidden=true;},2000);}catch{feedback.hidden=false;feedback.textContent='No se pudo acceder al portapapeles. Seleccioná el código y copialo manualmente.';}});
 const link=element('a','VER FUENTE OFICIAL','code-source');link.href=c.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';
 actions.append(button,link,feedback);article.append(dl,actions);return article;
}
function render(data){
 if(data.schemaVersion!==1||!Array.isArray(data.codes))throw Error('Catálogo inválido');
 const codes=data.codes.filter(c=>c.official===true&&c.confidence==='CONFIRMED'&&c.sourceAccount==='deadbydaylight.com'&&/^[A-Z0-9_-]{3,64}$/.test(c.code)&&official.test(c.sourceUrl)&&Number.isFinite(Date.parse(c.publishedAt))).map(c=>({...c,status:c.status==='expired'||(c.expiresAt&&Date.now()>Date.parse(c.expiresAt))?'expired':'active'}));
 const unique=[...new Map(codes.map(c=>[c.code,c])).values()];
 const active=unique.filter(c=>c.status==='active').sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt));
 const expired=unique.filter(c=>c.status==='expired').sort((a,b)=>(b.expiresAt||b.expiryUpperBound||b.publishedAt).localeCompare(a.expiresAt||a.expiryUpperBound||a.publishedAt));
 for(const [id,list] of [['codes-active',active],['codes-expired',expired]])$(id).replaceChildren(...(list.length?list.map(card):[element('p','No hay códigos en esta categoría.') ]));
 $('codes-summary').textContent=`${active.length} CÓDIGOS ACTIVOS · ${expired.length} FINALIZADOS`;
}
async function showDebug(data){
 $('codes-debug').hidden=false;
 const s=data.stats||{};let run='No disponible';
 try{const r=await json('https://api.github.com/repos/SanLean17/SanLean17.github.io/actions/workflows/update-dbd-codes.yml/runs?per_page=1');const last=r.workflow_runs?.[0];if(last)run=`${last.created_at} · ${last.status} · ${last.conclusion||'pendiente'}`;}catch{}
 $('codes-debug-content').textContent=`Último cambio del catálogo: ${data.updatedAt}\nÚltima ejecución GitHub: ${run}\nEstadísticas del último cambio guardado:\nPosts analizados: ${s.postsAnalyzed??'—'}\nCandidatos: ${s.candidates??'—'}\nConfirmed: ${s.confirmed??'—'}\nReview: ${s.review??'—'}\nRejected: ${s.rejected??'—'}\nLas consultas sin cambios quedan en los logs de Actions, sin generar commits.`;
}
async function load(){
 $('codes-retry').hidden=true;$('codes-notice').hidden=true;
 try{let data;try{data=await json(production?`${raw}data/codigos.json?t=${Date.now()}`:'/data/codigos.json');render(data);}catch(error){if(!production)throw error;data=await json('/data/codigos.json');render(data);$('codes-notice').hidden=false;$('codes-notice').textContent=`No se pudo consultar la actualización más reciente. Mostrando la copia publicada del ${date(data.updatedAt)}; verificá la fuente oficial antes de canjear.`;}if(debug)await showDebug(data);}
 catch{$('codes-summary').textContent='No se pudieron cargar los códigos.';$('codes-notice').hidden=false;$('codes-notice').textContent='Intentá nuevamente en unos minutos.';$('codes-retry').hidden=false;}
}
$('codes-retry').addEventListener('click',load);load();
