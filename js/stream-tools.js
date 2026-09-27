(()=>{
  const cfg=window.SANLEAN_SUPABASE;
  if(!cfg||!window.supabase)return;
  const client=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=id=>document.getElementById(id);
  const CARDS_PENDING_KEY='sanlean-cards-pending-roulette';
  const CATEGORIES_URL='../data/perk-categories.json';
  const CONSTRAINTS_URL='../data/perk-constraints.json';
  const overlayKinds={
    roulette_killers:{label:'RULETA DE KILLERS',desc:'Un killer por tirada.',resultCount:1,source:'killers',data:'../data/killers.json',imageBase:'../killers'},
    roulette_killer_perks:{label:'PERKS DE KILLER',desc:'Hasta cuatro perks sin espacios vacíos.',resultCount:4,source:'killerPerks',role:'killer',data:'../data/perks-killer.json',imageBase:'../killer'},
    roulette_survivor_perks:{label:'PERKS DE SUPERVIVIENTE',desc:'Hasta cuatro perks sin espacios vacíos.',resultCount:4,source:'survivor',role:'survivor',data:'../data/perks-survivor.json',imageBase:'../survivor'},
    vote:{label:'CARTAS',desc:'Cinco rombos A–E, revelación manual y resultado ganador.',resultCount:0},
    giveaway:{label:'SORTEO / PARTICIPANTES',desc:'Palabra clave, estado y cantidad de participantes.',resultCount:0}
  };
  let session=null,workspace=null,workspaces=[],overlays=[],activeGiveaway=null,giveawayTicker=null,booting=false,bootedUser='',categoryCache=null,constraintCache=null;

  function setStatus(id,text,type=''){const el=$(id);if(!el)return;el.textContent=text||'';el.className='module-status'+(type?` ${type}`:'')}
  function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function weightedUnique(pool,count,exclude=new Set()){
    const remaining=(pool||[]).filter(x=>Number(x.weight)>0&&!exclude.has(x.key)).map(x=>({...x,weight:Number(x.weight)||1})),out=[];
    while(remaining.length&&out.length<count){const total=remaining.reduce((s,x)=>s+x.weight,0);if(total<=0)break;const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);let target=(bytes[0]/0x100000000)*total,index=0;for(;index<remaining.length;index++){target-=remaining[index].weight;if(target<0)break}out.push(remaining.splice(Math.min(index,remaining.length-1),1)[0])}
    return out;
  }
  function readPendingCardRule(){try{return JSON.parse(localStorage.getItem(CARDS_PENDING_KEY)||'null')}catch{return null}}
  function clearPendingCardRule(expected){try{if(readPendingCardRule()?.roundId===expected.roundId)localStorage.removeItem(CARDS_PENDING_KEY)}catch{}}
  async function loadJsonCached(url,key){const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error(`No se pudo cargar ${key}.`);return response.json()}
  async function loadCategories(){if(categoryCache)return categoryCache;categoryCache=await loadJsonCached(CATEGORIES_URL,'las categorías de perks');return categoryCache}
  async function loadConstraints(){if(constraintCache)return constraintCache;constraintCache=await loadJsonCached(CONSTRAINTS_URL,'las restricciones de perks');return constraintCache}

  async function getSession(){session=(await client.auth.getSession()).data.session;return session}
  async function loadWorkspaces(){
    const {data,error}=await client.from('streamer_workspaces').select('id,name,owner_user_id,created_at').order('created_at',{ascending:true});if(error)throw error;workspaces=data||[];
    if(!workspaces.length){const {data:created,error:createError}=await client.from('streamer_workspaces').insert({owner_user_id:session.user.id,name:'Mi stream'}).select('id,name,owner_user_id,created_at').single();if(createError)throw createError;workspaces=[created]}
    const select=$('workspaceSelect');if(!select)return;const previous=workspace?.id;select.innerHTML='';workspaces.forEach((w,i)=>{const o=document.createElement('option');o.value=w.id;o.textContent=w.name||`STREAM ${i+1}`;select.appendChild(o)});workspace=workspaces.find(w=>w.id===previous)||workspaces[0];select.value=workspace.id;select.onchange=async()=>{queuedCards=null;overlays=[];workspace=workspaces.find(w=>w.id===select.value)||workspaces[0];window.SanLeanCards?.reset();await refreshWorkspace()}
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
  async function buildCatalog(kind){const meta=overlayKinds[kind];if(!meta?.source)return{all:[],enabled:[]};const settings=await loadRouletteSettings();if(!settings)return null;const response=await fetch(meta.data,{cache:'no-store'});if(!response.ok)throw new Error('No se pudo cargar el catálogo de la ruleta.');const raw=await response.json();const all=raw.map(item=>{const id=`${meta.source}:${item.key}`,weight=Math.max(0,Number(settings.weights?.[id]??1));return{key:item.key,name:item.name||item.key,image:catalogImage(meta,item),weight,emptySlot:!!item.emptySlot}});return{all,enabled:all.filter(x=>x.weight>0)}}
  async function syncRouletteOverlay(overlay){if(!overlayKinds[overlay.kind]?.source)return overlay;const catalog=await buildCatalog(overlay.kind);if(catalog===null)return overlay;const settings={...(overlay.settings||{}),pool:catalog.enabled,resultCount:overlayKinds[overlay.kind].resultCount,syncedAt:new Date().toISOString()};const {data,error}=await client.from('stream_overlays').update({settings,updated_at:new Date().toISOString()}).eq('id',overlay.id).select('*').single();if(error)throw error;return data}

  function takeRequired(pool,count,used=new Set()){
    const items=weightedUnique(pool,count,used);
    if(items.length!==count)throw new Error('No hay suficientes perks distintas para cumplir la carta. Revisá el pool habilitado.');
    return items;
  }
  function themedSelection(keys,all,enabled,count,used=new Set()){
    const preferred=weightedUnique(enabled.filter(x=>keys.has(x.key)),count,used);
    const excluded=new Set([...used,...preferred.map(x=>x.key)]);
    return [...preferred,...takeRequired(all.filter(x=>keys.has(x.key)).map(x=>({...x,weight:x.weight>0?x.weight:1})),count-preferred.length,excluded)];
  }
  async function itemsForCardRule(kind,catalog){
    const meta=overlayKinds[kind],pending=readPendingCardRule();
    if(!pending||pending.consumed||pending.source!=='cards'||pending.role!==meta?.role||pending.workspaceId!==workspace?.id)return null;
    const spec=pending.rule||{},all=(catalog.all||[]).filter(x=>!x.emptySlot&&x.key!=='slot_vacio'),enabled=(catalog.enabled||[]).filter(x=>!x.emptySlot&&x.key!=='slot_vacio'),allByKey=new Map((catalog.all||[]).map(x=>[x.key,x]));
    if(spec.kind==='no_loadout'||spec.count===0)return{items:[],pending};
    if(spec.kind==='count')return{items:takeRequired(enabled,Math.max(1,Math.min(4,Number(spec.count)||1))),pending};
    const [categories,constraints]=await Promise.all([loadCategories(),loadConstraints()]),roleCats=categories?.[pending.role]||{},roleConstraints=constraints?.[pending.role]||{};
    if(spec.kind==='fixed_random'){
      const fixed=(spec.fixed||[]).map(k=>allByKey.get(k));
      if(fixed.some(x=>!x))throw new Error('Falta una perk fija en el catálogo.');
      const used=new Set(fixed.map(x=>x.key)),blocked=new Set();
      for(const item of fixed)for(const key of roleConstraints.fixedRules?.[item.key]?.exclude||[])blocked.add(key);
      const random=takeRequired(enabled.filter(x=>!blocked.has(x.key)),Number(spec.random)||0,used);
      return{items:[...fixed,...random],pending};
    }
    if(spec.kind==='category')return{items:themedSelection(new Set(roleCats[spec.category]||[]),all,enabled,Math.max(1,Math.min(4,Number(spec.count)||4))),pending};
    if(spec.kind==='quality_mix'){
      const weak=themedSelection(new Set(roleCats.weak||[]),all,enabled,spec.weak),used=new Set(weak.map(x=>x.key));
      const strong=themedSelection(new Set(roleCats.strong||[]),all,enabled,spec.strong,used);strong.forEach(x=>used.add(x.key));
      const random=takeRequired(enabled,spec.random,used);
      return{items:[...weak,...strong,...random],pending};
    }
    throw new Error('Regla de CARTAS desconocida.');
  }
  const spinningOverlays=new Set();
  async function spinOverlay(id,overrideCount=null){
    const overlay=overlays.find(o=>o.id===id);if(!overlay||spinningOverlays.has(id))return false;
    spinningOverlays.add(id);
    const run=async()=>{
      try{
        const catalog=await buildCatalog(overlay.kind);if(catalog===null||workspace?.id!==overlay.workspace_id)return false;
        const cardSelection=await itemsForCardRule(overlay.kind,catalog),pending=cardSelection?.pending||null;
        if(!cardSelection&&!catalog.enabled.length)return false;
        const baseCount=Number(overlayKinds[overlay.kind].resultCount)||1,count=Math.max(1,Math.min(4,Number(overrideCount??baseCount)||1));
        const items=cardSelection?cardSelection.items:weightedUnique(catalog.enabled,count);
        const rule=pending?{resultId:pending.resultId,label:pending.label,event:pending.event,noAddons:!!pending.rule?.noAddons}:null;
        const write=async state=>{const {data,error}=await client.from('stream_overlays').update({state,updated_at:new Date().toISOString()}).eq('id',id).select('id').single();if(error||!data)throw error||new Error('Sin permiso para actualizar la ruleta.')};
        if(workspace?.id!==overlay.workspace_id)return false;
        await syncRouletteOverlay(overlay);
        if(workspace?.id!==overlay.workspace_id)return false;
        await write({visible:true,status:'spinning',items:[],cardRule:rule,startedAt:new Date().toISOString()});
        await new Promise(resolve=>setTimeout(resolve,1150));
        await write({visible:true,status:'result',items:items.map(x=>({key:x.key,name:x.name,image:x.image})),cardRule:rule,finishedAt:new Date().toISOString()});
        if(pending)clearPendingCardRule(pending);
        return true;
      }catch(err){console.error('Spin overlay:',err);return false}
    };
    try{return navigator.locks?await navigator.locks.request(`sanlean-spin:${id}`,{ifAvailable:true},lock=>lock?run():false):await run()}
    finally{spinningOverlays.delete(id)}
  }
  async function spinByRole(role){const kind=role==='killer'?'roulette_killer_perks':'roulette_survivor_perks',overlay=overlays.find(o=>o.kind===kind);return overlay?spinOverlay(overlay.id):false}
  async function hideOverlay(id){await client.from('stream_overlays').update({state:{visible:false,status:'idle',items:[]},updated_at:new Date().toISOString()}).eq('id',id)}
  async function loadOverlays(){try{overlays=await ensureOverlays();if(workspace.owner_user_id===session.user.id){const synced=[];for(const o of overlays){if(overlayKinds[o.kind]?.source){try{synced.push(await syncRouletteOverlay(o))}catch{synced.push(o)}}else synced.push(o)}overlays=synced}renderOverlays()}catch(err){console.error('Overlays:',err);if($('overlayGrid'))$('overlayGrid').innerHTML='<div class="module-box"><strong>SIN PERMISO DE OVERLAYS</strong><p>No tenés permiso para administrar esta herramienta.</p></div>'}}
  function renderOverlays(){const grid=$('overlayGrid');if(!grid)return;grid.innerHTML='';overlays.sort((a,b)=>Object.keys(overlayKinds).indexOf(a.kind)-Object.keys(overlayKinds).indexOf(b.kind)).forEach(overlay=>{const meta=overlayKinds[overlay.kind]||{label:overlay.kind,desc:''},card=document.createElement('article'),publicUrl=overlayUrl(overlay.public_token),controlUrl=overlayUrl(overlay.control_token),roulette=!!meta.source;card.className='overlay-card';card.innerHTML=`<span>${roulette?'RULETA':'OVERLAY'}</span><h3>${escapeHtml(meta.label)}</h3><p>${escapeHtml(meta.desc)}</p><label class="overlay-url-label">URL OBS · VISUALIZACIÓN</label><div class="copy-row"><input value="${escapeHtml(publicUrl)}" readonly><button type="button" data-copy="public">COPIAR</button></div><label class="overlay-url-label">URL PRIVADA · CONTROL</label><div class="copy-row"><input value="${escapeHtml(controlUrl)}" readonly><button type="button" data-copy="control">COPIAR</button></div><div class="overlay-actions">${roulette?'<button class="spin-overlay" type="button">GIRAR</button>':''}<button class="hide-overlay" type="button">OCULTAR</button><button class="preview-overlay" type="button">VISTA PREVIA</button></div>`;card.querySelector('[data-copy="public"]').onclick=()=>navigator.clipboard.writeText(publicUrl);card.querySelector('[data-copy="control"]').onclick=()=>navigator.clipboard.writeText(controlUrl);card.querySelector('.preview-overlay').onclick=()=>window.open(publicUrl,'_blank','noopener');card.querySelector('.hide-overlay').onclick=()=>hideOverlay(overlay.id);card.querySelector('.spin-overlay')?.addEventListener('click',()=>spinOverlay(overlay.id));grid.appendChild(card)})}

  // Publish a redacted snapshot; unrevealed result IDs/rules never leave the panel.
  let queuedCards=null,cardsSyncTimer=null,cardsSyncBusy=false;
  function queueCards(snapshot){
    if(!snapshot||!workspace||snapshot.workspaceId!==workspace.id)return;
    const overlay=overlays.find(o=>o.kind==='vote'&&o.workspace_id===workspace.id);
    if(!overlay){setStatus('cardsOverlayStatus','El overlay de CARTAS todavía no está disponible. Revisá tus permisos de OVERLAYS.','error');return}
    queuedCards={id:overlay.id,workspaceId:workspace.id,state:{...snapshot,status:snapshot.state}};
    if(!cardsSyncTimer)cardsSyncTimer=setTimeout(()=>{cardsSyncTimer=null;flushCards()},100);
  }
  async function flushCards(){
    if(cardsSyncBusy||!queuedCards)return;
    const update=queuedCards;queuedCards=null;
    if(update.workspaceId!==workspace?.id)return;
    cardsSyncBusy=true;
    try{
      const {data,error}=await client.from('stream_overlays').update({state:update.state,updated_at:new Date().toISOString()}).eq('id',update.id).eq('workspace_id',update.workspaceId).select('id').single();
      if(error||!data)throw error||new Error('Sin permiso para actualizar CARTAS.');
      if(update.workspaceId===workspace?.id)setStatus('cardsOverlayStatus','OBS sincronizado.','success');
    }catch(err){
      if(update.workspaceId===workspace?.id){setStatus('cardsOverlayStatus','No se pudo sincronizar OBS. Reintentando…','error');if(!queuedCards)queuedCards=update}
    }finally{cardsSyncBusy=false;if(queuedCards){clearTimeout(cardsSyncTimer);cardsSyncTimer=setTimeout(()=>{cardsSyncTimer=null;flushCards()},1500)}}
  }
  window.addEventListener('sanlean:cards-state',event=>queueCards(event.detail));

  async function loadGiveawayState(){try{const {data,error}=await client.from('stream_giveaway_sessions').select('*').eq('workspace_id',workspace.id).eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle();if(error)throw error;activeGiveaway=data||null;if(activeGiveaway){if($('startGiveaway'))$('startGiveaway').disabled=true;if($('closeGiveaway'))$('closeGiveaway').disabled=false;if($('giveawayState'))$('giveawayState').textContent='ABIERTO';await refreshGiveaway();giveawayTicker=setInterval(refreshGiveaway,1800)}else{if($('startGiveaway'))$('startGiveaway').disabled=false;if($('closeGiveaway'))$('closeGiveaway').disabled=true;if($('giveawayState'))$('giveawayState').textContent='SIN INICIAR';if($('giveawayCount'))$('giveawayCount').textContent='0';if($('giveawayParticipants'))$('giveawayParticipants').innerHTML=''}}catch(err){console.error(err);setStatus('giveawayStatus','No tenés permiso para administrar sorteos.','error')}}
  async function refreshGiveaway(){if(!activeGiveaway)return;const {data,error}=await client.from('stream_giveaway_entries').select('participant_name,platform,created_at').eq('session_id',activeGiveaway.id).eq('eligible',true).order('created_at',{ascending:true});if(error)return;const entries=data||[];if($('giveawayCount'))$('giveawayCount').textContent=String(entries.length);if($('giveawayParticipants'))$('giveawayParticipants').innerHTML=entries.map(e=>`<div class="participant-row"><span>${escapeHtml(e.participant_name)}</span><span>${escapeHtml(e.platform.toUpperCase())}</span></div>`).join('');const overlay=overlays.find(o=>o.kind==='giveaway');if(overlay)await client.from('stream_overlays').update({state:{visible:true,status:'active',statusLabel:'ABIERTO',keyword:activeGiveaway.keyword,count:entries.length},updated_at:new Date().toISOString()}).eq('id',overlay.id)}
  async function startGiveaway(){const keyword=$('giveawayKeyword')?.value.trim();if(!keyword){setStatus('giveawayStatus','Ingresá una palabra clave.','error');return}const minDays=$('followerDays')?.value===''?null:Math.max(0,Number($('followerDays')?.value)||0);try{const {data,error}=await client.from('stream_giveaway_sessions').insert({workspace_id:workspace.id,platform:$('giveawayPlatform')?.value||'both',keyword,status:'active',min_follower_days:minDays,subscriber_only:!!$('subscriberOnly')?.checked,vip_only:!!$('vipOnly')?.checked,moderator_only:!!$('moderatorOnly')?.checked,starts_at:new Date().toISOString()}).select('*').single();if(error)throw error;activeGiveaway=data;$('startGiveaway').disabled=true;$('closeGiveaway').disabled=false;$('giveawayState').textContent='ABIERTO';setStatus('giveawayStatus','Recepción de participantes iniciada.','success');await refreshGiveaway();giveawayTicker=setInterval(refreshGiveaway,1800)}catch(err){console.error(err);setStatus('giveawayStatus','No se pudo iniciar el sorteo.','error')}}
  async function closeGiveaway(){if(!activeGiveaway)return;clearInterval(giveawayTicker);const now=new Date().toISOString();await client.from('stream_giveaway_sessions').update({status:'closed',closed_at:now,updated_at:now}).eq('id',activeGiveaway.id);const overlay=overlays.find(o=>o.kind==='giveaway');if(overlay)await client.from('stream_overlays').update({state:{visible:true,status:'closed',statusLabel:'CERRADO',keyword:activeGiveaway.keyword,count:Number($('giveawayCount')?.textContent)||0},updated_at:now}).eq('id',overlay.id);activeGiveaway=null;if($('giveawayState'))$('giveawayState').textContent='CERRADO';if($('startGiveaway'))$('startGiveaway').disabled=false;if($('closeGiveaway'))$('closeGiveaway').disabled=true;setStatus('giveawayStatus','Participación cerrada. Los mensajes posteriores quedan fuera de esta sesión.','success')}
  async function loadConnections(){const grid=$('connectionGrid');if(!grid)return;try{const {data,error}=await client.from('stream_platform_connections').select('*').eq('workspace_id',workspace.id);if(error)throw error;const rows=data||[];grid.innerHTML=['twitch','kick'].map(platform=>{const row=rows.find(r=>r.platform===platform),connected=!!row?.connected,name=row?.display_name||row?.username||'';return`<article class="connection-card-stream"><div class="platform-icon">${platform==='twitch'?'T':'K'}</div><div><span>${platform.toUpperCase()}</span><h3>${connected?escapeHtml(name||'CONECTADO'):'NO CONECTADO'}</h3><div class="connection-state ${connected?'connected':''}"><i></i>${connected?'CUENTA VINCULADA':'ESPERANDO OAUTH'}</div></div><button type="button" disabled>${connected?'GESTIONAR':'CONECTAR'}</button></article>`}).join('')}catch(err){console.error(err);grid.innerHTML='<div class="module-box"><strong>SIN PERMISO</strong><p>No tenés permiso para administrar las conexiones de este streamer.</p></div>'}}

  function bindUi(){$('startGiveaway')?.addEventListener('click',startGiveaway);$('closeGiveaway')?.addEventListener('click',closeGiveaway)}
  async function boot(){if(booting)return;booting=true;try{const current=await getSession();if(!current){booting=false;return}if(bootedUser===current.user.id){booting=false;return}bootedUser=current.user.id;await loadWorkspaces();await refreshWorkspace()}catch(err){console.error('Stream modules:',err)}finally{booting=false}}
  window.SanLeanStreamTools={spinByRole,spinOverlay:async id=>spinOverlay(id),getWorkspace:()=>workspace,getOverlays:()=>[...overlays],refresh:refreshWorkspace};
  window.addEventListener('DOMContentLoaded',()=>{bindUi();boot()});
  client.auth.onAuthStateChange((event,newSession)=>{if(event==='SIGNED_IN'&&newSession){session=newSession;bootedUser='';setTimeout(boot,0)}if(event==='SIGNED_OUT'){bootedUser='';workspace=null;overlays=[];queuedCards=null;clearTimeout(cardsSyncTimer);clearInterval(giveawayTicker);window.SanLeanCards?.reset()}});
})();
