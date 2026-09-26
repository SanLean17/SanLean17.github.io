(()=>{
  const cfg=window.SANLEAN_SUPABASE;
  if(!cfg||!window.supabase)return;
  const client=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=id=>document.getElementById(id);
  const CARDS_PENDING_KEY='sanlean-cards-pending-roulette';
  const CATEGORIES_URL='../data/perk-categories.json';
  const overlayKinds={
    roulette_killers:{label:'RULETA DE KILLERS',desc:'Un killer por tirada.',resultCount:1,source:'killers',data:'../data/killers.json',imageBase:'../killers'},
    roulette_killer_perks:{label:'PERKS DE KILLER',desc:'Hasta cuatro perks sin espacios vacíos.',resultCount:4,source:'killerPerks',role:'killer',data:'../data/perks-killer.json',imageBase:'../killer'},
    roulette_survivor_perks:{label:'PERKS DE SUPERVIVIENTE',desc:'Hasta cuatro perks sin espacios vacíos.',resultCount:4,source:'survivor',role:'survivor',data:'../data/perks-survivor.json',imageBase:'../survivor'},
    vote:{label:'CARTAS',desc:'Cinco cartas ocultas, votos, porcentajes, tiempo y revelación.',resultCount:0},
    giveaway:{label:'SORTEO / PARTICIPANTES',desc:'Palabra clave, estado y cantidad de participantes.',resultCount:0}
  };
  let session=null,workspace=null,workspaces=[],overlays=[],activeGiveaway=null,giveawayTicker=null,booting=false,bootedUser='',categoryCache=null;

  function setStatus(id,text,type=''){const el=$(id);if(!el)return;el.textContent=text||'';el.className='module-status'+(type?` ${type}`:'')}
  function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function weightedUnique(pool,count,exclude=new Set()){
    const remaining=(pool||[]).filter(x=>Number(x.weight)>0&&!exclude.has(x.key)).map(x=>({...x,weight:Number(x.weight)||1})),out=[];
    while(remaining.length&&out.length<count){const total=remaining.reduce((s,x)=>s+x.weight,0);if(total<=0)break;const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);let target=(bytes[0]/0x100000000)*total,index=0;for(;index<remaining.length;index++){target-=remaining[index].weight;if(target<0)break}out.push(remaining.splice(Math.min(index,remaining.length-1),1)[0])}
    return out;
  }
  function readPendingCardRule(){try{return JSON.parse(localStorage.getItem(CARDS_PENDING_KEY)||'null')}catch{return null}}
  function clearPendingCardRule(){try{localStorage.removeItem(CARDS_PENDING_KEY)}catch{}}
  async function loadCategories(){if(categoryCache)return categoryCache;const r=await fetch(CATEGORIES_URL,{cache:'no-store'});if(!r.ok)throw new Error('No se pudieron cargar las categorías de perks.');categoryCache=await r.json();return categoryCache}

  async function getSession(){session=(await client.auth.getSession()).data.session;return session}
  async function loadWorkspaces(){
    const {data,error}=await client.from('streamer_workspaces').select('id,name,owner_user_id,created_at').order('created_at',{ascending:true});if(error)throw error;workspaces=data||[];
    if(!workspaces.length){const {data:created,error:createError}=await client.from('streamer_workspaces').insert({owner_user_id:session.user.id,name:'Mi stream'}).select('id,name,owner_user_id,created_at').single();if(createError)throw createError;workspaces=[created]}
    const select=$('workspaceSelect');if(!select)return;const previous=workspace?.id;select.innerHTML='';workspaces.forEach((w,i)=>{const o=document.createElement('option');o.value=w.id;o.textContent=w.name||`STREAM ${i+1}`;select.appendChild(o)});workspace=workspaces.find(w=>w.id===previous)||workspaces[0];select.value=workspace.id;select.onchange=async()=>{workspace=workspaces.find(w=>w.id===select.value)||workspaces[0];await refreshWorkspace()}
  }
  async function refreshWorkspace(){clearInterval(giveawayTicker);activeGiveaway=null;await Promise.allSettled([loadOverlays(),loadGiveawayState(),loadConnections()])}

  function overlayUrl(token){return `${location.origin}/Usuario/overlay.html?token=${encodeURIComponent(token)}`}
  async function ensureOverlays(){
    const {data,error}=await client.from('stream_overlays').select('*').eq('workspace_id',workspace.id).order('created_at');if(error)throw error;const existing=data||[],missing=Object.keys(overlayKinds).filter(kind=>!existing.some(o=>o.kind===kind));
    if(missing.length){const rows=missing.map(kind=>({workspace_id:workspace.id,kind,settings:{resultCount:overlayKinds[kind].resultCount},state:{visible:false,status:'idle'}}));const {error:insertError}=await client.from('stream_overlays').insert(rows);if(insertError)throw insertError}
    const {data:all,error:allError}=await client.from('stream_overlays').select('*').eq('workspace_id',workspace.id).order('created_at');if(allError)throw allError;return all||[]
  }
  async function loadRouletteSettings(){if(workspace.owner_user_id!==session.user.id)return null;const {data,error}=await client.from('user_roulette_settings').select('settings').eq('user_id',session.user.id).maybeSingle();if(error)throw error;return data?.settings||{weights:{},bonusEntries:{}}}
  function catalogImage(meta,item){if(item.image){const raw=String(item.image).replace(/^\.\.\//,'').replace(/^\//,'');return `${location.origin}/${raw}`}return `${location.origin}/${meta.imageBase.replace(/^\.\.\//,'')}/${encodeURIComponent(item.key)}.png`}
  async function buildPool(kind){const meta=overlayKinds[kind];if(!meta?.source)return[];const settings=await loadRouletteSettings();if(!settings)return null;const response=await fetch(meta.data,{cache:'no-store'});if(!response.ok)throw new Error('No se pudo cargar el catálogo de la ruleta.');const items=await response.json();return items.map(item=>{const id=`${meta.source}:${item.key}`,weight=Number(settings.weights?.[id]??1);return{key:item.key,name:item.name||item.key,image:catalogImage(meta,item),weight:Math.max(0,weight)}}).filter(x=>x.weight>0)}
  async function syncRouletteOverlay(overlay){if(!overlayKinds[overlay.kind]?.source)return overlay;const pool=await buildPool(overlay.kind);if(pool===null)return overlay;const settings={...(overlay.settings||{}),pool,resultCount:overlayKinds[overlay.kind].resultCount,syncedAt:new Date().toISOString()};const {data,error}=await client.from('stream_overlays').update({settings,updated_at:new Date().toISOString()}).eq('id',overlay.id).select('*').single();if(error)throw error;return data}

  async function itemsForCardRule(kind,pool,rule){
    const meta=overlayKinds[kind],pending=readPendingCardRule();if(!pending||pending.consumed||pending.source!=='cards'||pending.role!==meta?.role)return null;const spec=pending.rule||{};
    const byKey=new Map(pool.map(x=>[x.key,x]));
    if(spec.kind==='no_loadout'||spec.count===0)return{items:[],pending};
    if(spec.kind==='count')return{items:weightedUnique(pool,Math.max(1,Math.min(4,Number(spec.count)||1))),pending};
    if(spec.kind==='fixed_random'){
      const fixed=(spec.fixed||[]).map(k=>byKey.get(k)).filter(Boolean),used=new Set(fixed.map(x=>x.key)),random=weightedUnique(pool,Math.max(0,Number(spec.random)||0),used);return{items:[...fixed,...random].slice(0,4),pending}
    }
    const categories=await loadCategories(),roleCats=categories?.[pending.role]||{};
    if(spec.kind==='category'){
      const keys=new Set(roleCats[spec.category]||[]),categoryPool=pool.filter(x=>keys.has(x.key));return{items:weightedUnique(categoryPool,Math.max(1,Math.min(4,Number(spec.count)||4))),pending}
    }
    if(spec.kind==='quality_mix'){
      const weakKeys=new Set(roleCats.weak||[]),strongKeys=new Set(roleCats.strong||[]),chosen=[];let used=new Set();const weak=weightedUnique(pool.filter(x=>weakKeys.has(x.key)),Number(spec.weak)||0,used);chosen.push(...weak);used=new Set(chosen.map(x=>x.key));const strong=weightedUnique(pool.filter(x=>strongKeys.has(x.key)),Number(spec.strong)||0,used);chosen.push(...strong);used=new Set(chosen.map(x=>x.key));chosen.push(...weightedUnique(pool,Number(spec.random)||0,used));return{items:chosen.slice(0,4),pending}
    }
    return null;
  }
  async function spinOverlay(id,overrideCount=null){
    let overlay=overlays.find(o=>o.id===id);if(!overlay)return false;
    try{
      overlay=await syncRouletteOverlay(overlay);const pool=overlay.settings?.pool||[];if(!pool.length)return false;const cardSelection=await itemsForCardRule(overlay.kind,pool);const pending=cardSelection?.pending||null;
      await client.from('stream_overlays').update({state:{visible:true,status:'spinning',items:[],cardRule:pending?{resultId:pending.resultId,label:pending.label,event:pending.event}:null,startedAt:new Date().toISOString()},updated_at:new Date().toISOString()}).eq('id',overlay.id);
      const baseCount=Number(overlayKinds[overlay.kind].resultCount)||1,count=Math.max(1,Math.min(4,Number(overrideCount??baseCount)||1));const items=cardSelection?cardSelection.items:weightedUnique(pool,count);
      setTimeout(async()=>{await client.from('stream_overlays').update({state:{visible:true,status:'result',items:items.map(x=>({key:x.key,name:x.name,image:x.image})),cardRule:pending?{resultId:pending.resultId,label:pending.label,event:pending.event,noAddons:!!pending.rule?.noAddons}:null,finishedAt:new Date().toISOString()},updated_at:new Date().toISOString()}).eq('id',overlay.id)},1150);
      if(pending)clearPendingCardRule();return true;
    }catch(err){console.error('Spin overlay:',err);return false}
  }
  async function hideOverlay(id){await client.from('stream_overlays').update({state:{visible:false,status:'idle',items:[]},updated_at:new Date().toISOString()}).eq('id',id)}
  async function loadOverlays(){try{overlays=await ensureOverlays();if(workspace.owner_user_id===session.user.id){const synced=[];for(const o of overlays){if(overlayKinds[o.kind]?.source){try{synced.push(await syncRouletteOverlay(o))}catch{synced.push(o)}}else synced.push(o)}overlays=synced}renderOverlays()}catch(err){console.error('Overlays:',err);if($('overlayGrid'))$('overlayGrid').innerHTML='<div class="module-box"><strong>SIN PERMISO DE OVERLAYS</strong><p>No tenés permiso para administrar esta herramienta.</p></div>'}}
  function renderOverlays(){const grid=$('overlayGrid');if(!grid)return;grid.innerHTML='';overlays.sort((a,b)=>Object.keys(overlayKinds).indexOf(a.kind)-Object.keys(overlayKinds).indexOf(b.kind)).forEach(overlay=>{const meta=overlayKinds[overlay.kind]||{label:overlay.kind,desc:''},card=document.createElement('article'),publicUrl=overlayUrl(overlay.public_token),controlUrl=overlayUrl(overlay.control_token),roulette=!!meta.source;card.className='overlay-card';card.innerHTML=`<span>${roulette?'RULETA':'OVERLAY'}</span><h3>${escapeHtml(meta.label)}</h3><p>${escapeHtml(meta.desc)}</p><label class="overlay-url-label">URL OBS · VISUALIZACIÓN</label><div class="copy-row"><input value="${escapeHtml(publicUrl)}" readonly><button type="button" data-copy="public">COPIAR</button></div><label class="overlay-url-label">URL PRIVADA · CONTROL</label><div class="copy-row"><input value="${escapeHtml(controlUrl)}" readonly><button type="button" data-copy="control">COPIAR</button></div><div class="overlay-actions">${roulette?'<button class="spin-overlay" type="button">GIRAR</button>':''}<button class="hide-overlay" type="button">OCULTAR</button><button class="preview-overlay" type="button">VISTA PREVIA</button></div>`;card.querySelector('[data-copy="public"]').onclick=()=>navigator.clipboard.writeText(publicUrl);card.querySelector('[data-copy="control"]').onclick=()=>navigator.clipboard.writeText(controlUrl);card.querySelector('.preview-overlay').onclick=()=>window.open(publicUrl,'_blank','noopener');card.querySelector('.hide-overlay').onclick=()=>hideOverlay(overlay.id);card.querySelector('.spin-overlay')?.addEventListener('click',()=>spinOverlay(overlay.id));grid.appendChild(card)})}

  async function loadGiveawayState(){try{const {data,error}=await client.from('stream_giveaway_sessions').select('*').eq('workspace_id',workspace.id).eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle();if(error)throw error;activeGiveaway=data||null;if(activeGiveaway){if($('startGiveaway'))$('startGiveaway').disabled=true;if($('closeGiveaway'))$('closeGiveaway').disabled=false;if($('giveawayState'))$('giveawayState').textContent='ABIERTO';await refreshGiveaway();giveawayTicker=setInterval(refreshGiveaway,1800)}else{if($('startGiveaway'))$('startGiveaway').disabled=false;if($('closeGiveaway'))$('closeGiveaway').disabled=true;if($('giveawayState'))$('giveawayState').textContent='SIN INICIAR';if($('giveawayCount'))$('giveawayCount').textContent='0';if($('giveawayParticipants'))$('giveawayParticipants').innerHTML=''}}catch(err){console.error(err);setStatus('giveawayStatus','No tenés permiso para administrar sorteos.','error')}}
  async function refreshGiveaway(){if(!activeGiveaway)return;const {data,error}=await client.from('stream_giveaway_entries').select('participant_name,platform,created_at').eq('session_id',activeGiveaway.id).eq('eligible',true).order('created_at',{ascending:true});if(error)return;const entries=data||[];if($('giveawayCount'))$('giveawayCount').textContent=String(entries.length);if($('giveawayParticipants'))$('giveawayParticipants').innerHTML=entries.map(e=>`<div class="participant-row"><span>${escapeHtml(e.participant_name)}</span><span>${escapeHtml(e.platform.toUpperCase())}</span></div>`).join('');const overlay=overlays.find(o=>o.kind==='giveaway');if(overlay)await client.from('stream_overlays').update({state:{visible:true,status:'active',statusLabel:'ABIERTO',keyword:activeGiveaway.keyword,count:entries.length},updated_at:new Date().toISOString()}).eq('id',overlay.id)}
  async function startGiveaway(){const keyword=$('giveawayKeyword')?.value.trim();if(!keyword){setStatus('giveawayStatus','Ingresá una palabra clave.','error');return}const minDays=$('followerDays')?.value===''?null:Math.max(0,Number($('followerDays')?.value)||0);try{const {data,error}=await client.from('stream_giveaway_sessions').insert({workspace_id:workspace.id,platform:$('giveawayPlatform')?.value||'both',keyword,status:'active',min_follower_days:minDays,subscriber_only:!!$('subscriberOnly')?.checked,vip_only:!!$('vipOnly')?.checked,moderator_only:!!$('moderatorOnly')?.checked,starts_at:new Date().toISOString()}).select('*').single();if(error)throw error;activeGiveaway=data;$('startGiveaway').disabled=true;$('closeGiveaway').disabled=false;$('giveawayState').textContent='ABIERTO';setStatus('giveawayStatus','Recepción de participantes iniciada.','success');await refreshGiveaway();giveawayTicker=setInterval(refreshGiveaway,1800)}catch(err){console.error(err);setStatus('giveawayStatus','No se pudo iniciar el sorteo.','error')}}
  async function closeGiveaway(){if(!activeGiveaway)return;clearInterval(giveawayTicker);const now=new Date().toISOString();await client.from('stream_giveaway_sessions').update({status:'closed',closed_at:now,updated_at:now}).eq('id',activeGiveaway.id);const overlay=overlays.find(o=>o.kind==='giveaway');if(overlay)await client.from('stream_overlays').update({state:{visible:true,status:'closed',statusLabel:'CERRADO',keyword:activeGiveaway.keyword,count:Number($('giveawayCount')?.textContent)||0},updated_at:now}).eq('id',overlay.id);activeGiveaway=null;if($('giveawayState'))$('giveawayState').textContent='CERRADO';if($('startGiveaway'))$('startGiveaway').disabled=false;if($('closeGiveaway'))$('closeGiveaway').disabled=true;setStatus('giveawayStatus','Participación cerrada. Los mensajes posteriores quedan fuera de esta sesión.','success')}
  async function loadConnections(){const grid=$('connectionGrid');if(!grid)return;try{const {data,error}=await client.from('stream_platform_connections').select('*').eq('workspace_id',workspace.id);if(error)throw error;const rows=data||[];grid.innerHTML=['twitch','kick'].map(platform=>{const row=rows.find(r=>r.platform===platform),connected=!!row?.connected,name=row?.display_name||row?.username||'';return`<article class="connection-card-stream"><div class="platform-icon">${platform==='twitch'?'T':'K'}</div><div><span>${platform.toUpperCase()}</span><h3>${connected?escapeHtml(name||'CONECTADO'):'NO CONECTADO'}</h3><div class="connection-state ${connected?'connected':''}"><i></i>${connected?'CUENTA VINCULADA':'ESPERANDO OAUTH'}</div></div><button type="button" disabled>${connected?'GESTIONAR':'CONECTAR'}</button></article>`}).join('')}catch(err){console.error(err);grid.innerHTML='<div class="module-box"><strong>SIN PERMISO</strong><p>No tenés permiso para administrar las conexiones de este streamer.</p></div>'}}

  function bindUi(){$('startGiveaway')?.addEventListener('click',startGiveaway);$('closeGiveaway')?.addEventListener('click',closeGiveaway)}
  async function boot(){if(booting)return;booting=true;try{const current=await getSession();if(!current){booting=false;return}if(bootedUser===current.user.id){booting=false;return}bootedUser=current.user.id;await loadWorkspaces();await refreshWorkspace()}catch(err){console.error('Stream modules:',err)}finally{booting=false}}
  window.addEventListener('DOMContentLoaded',()=>{bindUi();boot()});
  client.auth.onAuthStateChange((event,newSession)=>{if(event==='SIGNED_IN'&&newSession){session=newSession;bootedUser='';setTimeout(boot,0)}if(event==='SIGNED_OUT'){bootedUser='';clearInterval(giveawayTicker)}});
})();
