(()=>{
  const cfg=window.SANLEAN_SUPABASE;
  if(!cfg||!window.supabase)return;
  const client=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=id=>document.getElementById(id);
  const overlayKinds={
    roulette_killers:{label:'RULETA DE KILLERS',desc:'Un killer por tirada.',resultCount:1,source:'killers',data:'../data/killers.json',imageBase:'../killers'},
    roulette_killer_perks:{label:'PERKS DE KILLER',desc:'Hasta cuatro perks sin espacios vacíos.',resultCount:4,source:'killerPerks',data:'../data/perks-killer.json',imageBase:'../killer'},
    roulette_survivor_perks:{label:'PERKS DE SUPERVIVIENTE',desc:'Hasta cuatro perks sin espacios vacíos.',resultCount:4,source:'survivor',data:'../data/perks-survivor.json',imageBase:'../survivor'},
    vote:{label:'VOTACIÓN DE CARTAS',desc:'Conteos, porcentajes y tiempo restante.',resultCount:0},
    giveaway:{label:'SORTEO / PARTICIPANTES',desc:'Palabra clave, estado y cantidad de participantes.',resultCount:0}
  };
  const permissionMap={overlays:'overlays',votes:'votes',giveaways:'giveaways',connections:'connections'};
  let session=null,workspace=null,workspaces=[],overlays=[],voteDecks=[],activeVote=null,voteTicker=null,activeGiveaway=null,giveawayTicker=null;

  function setStatus(id,text,type=''){
    const el=$(id);if(!el)return;el.textContent=text||'';el.className='stream-status'+(type?` ${type}`:'');
  }
  function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function openSection(key){
    document.querySelectorAll('.stream-nav button').forEach(b=>b.classList.toggle('active',b.dataset.streamSection===key));
    document.querySelectorAll('.stream-section').forEach(s=>s.classList.toggle('active',s.id===`stream-${key}`));
    history.replaceState(null,'',`#${key}`);
  }
  document.querySelectorAll('.stream-nav button').forEach(b=>b.addEventListener('click',()=>openSection(b.dataset.streamSection)));
  document.querySelectorAll('[data-go-stream]').forEach(b=>b.addEventListener('click',()=>openSection(b.dataset.goStream)));

  function secureRandom(max){
    if(max<=1)return 0;const arr=new Uint32Array(1),limit=Math.floor(0x100000000/max)*max;do crypto.getRandomValues(arr);while(arr[0]>=limit);return arr[0]%max;
  }
  function weightedUnique(pool,count){
    const remaining=(pool||[]).filter(x=>Number(x.weight)>0).map(x=>({...x,weight:Number(x.weight)||1})),out=[];
    while(remaining.length&&out.length<count){
      const total=remaining.reduce((s,x)=>s+x.weight,0);if(total<=0)break;
      const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);let target=(bytes[0]/0x100000000)*total,index=0;
      for(;index<remaining.length;index++){target-=remaining[index].weight;if(target<0)break}
      out.push(remaining.splice(Math.min(index,remaining.length-1),1)[0]);
    }
    return out;
  }

  async function loadSession(){
    const {data:{session:s}}=await client.auth.getSession();session=s;if(!session){location.href='./index.html';return false}return true;
  }

  async function loadWorkspaces(){
    const {data,error}=await client.from('streamer_workspaces').select('id,name,owner_user_id,created_at').order('created_at',{ascending:true});
    if(error)throw error;
    workspaces=data||[];
    if(!workspaces.length){
      const {data:created,error:createError}=await client.from('streamer_workspaces').insert({owner_user_id:session.user.id,name:'Mi stream'}).select('id,name,owner_user_id,created_at').single();
      if(createError)throw createError;workspaces=[created];
    }
    const select=$('workspaceSelect');select.innerHTML='';
    workspaces.forEach((w,i)=>{const o=document.createElement('option');o.value=w.id;o.textContent=w.name||`STREAM ${i+1}`;select.appendChild(o)});
    workspace=workspaces[0];select.value=workspace.id;
    select.onchange=async()=>{workspace=workspaces.find(w=>w.id===select.value)||workspaces[0];await refreshWorkspace()};
  }

  async function refreshWorkspace(){
    clearInterval(voteTicker);clearInterval(giveawayTicker);activeVote=null;activeGiveaway=null;
    await Promise.allSettled([loadOverlays(),loadVoteDecks(),loadGiveawayState(),loadConnections()]);
    $('streamHomeStatus').textContent=`STREAMER ACTIVO: ${workspace?.name||'—'}`;
  }

  function overlayUrl(token){return `${location.origin}/Usuario/overlay.html?token=${encodeURIComponent(token)}`}
  async function ensureOverlays(){
    const {data,error}=await client.from('stream_overlays').select('*').eq('workspace_id',workspace.id).order('created_at');
    if(error)throw error;
    const existing=data||[],missing=Object.keys(overlayKinds).filter(kind=>!existing.some(o=>o.kind===kind));
    if(missing.length){
      const rows=missing.map(kind=>({workspace_id:workspace.id,kind,settings:{resultCount:overlayKinds[kind].resultCount},state:{visible:false,status:'idle'}}));
      const {error:insertError}=await client.from('stream_overlays').insert(rows);if(insertError)throw insertError;
    }
    const {data:all,error:allError}=await client.from('stream_overlays').select('*').eq('workspace_id',workspace.id).order('created_at');if(allError)throw allError;return all||[];
  }

  async function loadRouletteSettings(){
    if(workspace.owner_user_id!==session.user.id)return null;
    const {data,error}=await client.from('user_roulette_settings').select('settings').eq('user_id',session.user.id).maybeSingle();
    if(error)throw error;return data?.settings||{weights:{},bonusEntries:{}};
  }

  function catalogImage(meta,item){
    if(item.image){
      const raw=String(item.image).replace(/^\.\.\//,'').replace(/^\//,'');
      return `${location.origin}/${raw}`;
    }
    return `${location.origin}/${meta.imageBase.replace(/^\.\.\//,'')}/${encodeURIComponent(item.key)}.png`;
  }

  async function buildPool(kind){
    const meta=overlayKinds[kind];if(!meta?.source)return [];
    const settings=await loadRouletteSettings();
    if(!settings)return null;
    const response=await fetch(meta.data,{cache:'no-store'});if(!response.ok)throw new Error('No se pudo cargar el catálogo de la ruleta.');
    const items=await response.json();
    return items.map(item=>{
      const id=`${meta.source}:${item.key}`;
      const weight=Number(settings.weights?.[id]??1);
      return {key:item.key,name:item.name||item.key,image:catalogImage(meta,item),weight:Math.max(0,weight)};
    }).filter(x=>x.weight>0);
  }

  async function syncRouletteOverlay(overlay){
    if(!overlayKinds[overlay.kind]?.source)return overlay;
    const pool=await buildPool(overlay.kind);
    if(pool===null)return overlay;
    const settings={...(overlay.settings||{}),pool,resultCount:overlayKinds[overlay.kind].resultCount,syncedAt:new Date().toISOString()};
    const {data,error}=await client.from('stream_overlays').update({settings,updated_at:new Date().toISOString()}).eq('id',overlay.id).select('*').single();
    if(error)throw error;return data;
  }

  async function spinOverlay(id){
    let overlay=overlays.find(o=>o.id===id);if(!overlay)return;
    try{
      overlay=await syncRouletteOverlay(overlay);const pool=overlay.settings?.pool||[];
      if(!pool.length){setStatus('streamHomeStatus','La ruleta no tiene opciones activas para girar.','error');return}
      await client.from('stream_overlays').update({state:{visible:true,status:'spinning',items:[],startedAt:new Date().toISOString()},updated_at:new Date().toISOString()}).eq('id',overlay.id);
      setTimeout(async()=>{
        const count=Math.max(1,Math.min(4,Number(overlayKinds[overlay.kind].resultCount)||1));
        const items=weightedUnique(pool,count).map(x=>({key:x.key,name:x.name,image:x.image}));
        await client.from('stream_overlays').update({state:{visible:true,status:'result',items,finishedAt:new Date().toISOString()},updated_at:new Date().toISOString()}).eq('id',overlay.id);
      },1150);
    }catch(err){console.error(err);setStatus('streamHomeStatus','No se pudo girar el overlay. Revisá permisos o configuración.','error')}
  }

  async function hideOverlay(id){
    await client.from('stream_overlays').update({state:{visible:false,status:'idle',items:[]},updated_at:new Date().toISOString()}).eq('id',id);
  }

  async function loadOverlays(){
    try{
      overlays=await ensureOverlays();
      if(workspace.owner_user_id===session.user.id){
        const synced=[];for(const overlay of overlays){if(overlayKinds[overlay.kind]?.source){try{synced.push(await syncRouletteOverlay(overlay))}catch(e){console.warn(e);synced.push(overlay)}}else synced.push(overlay)}overlays=synced;
      }
      renderOverlays();
    }catch(err){console.error('Overlays:',err);$('overlayGrid').innerHTML='<div class="connection-note"><strong>SIN PERMISO DE OVERLAYS</strong><p>Este colaborador no tiene habilitada esta herramienta o todavía no existe una configuración para el streamer.</p></div>'}
  }

  function renderOverlays(){
    const grid=$('overlayGrid');grid.innerHTML='';
    overlays.sort((a,b)=>Object.keys(overlayKinds).indexOf(a.kind)-Object.keys(overlayKinds).indexOf(b.kind)).forEach(overlay=>{
      const meta=overlayKinds[overlay.kind]||{label:overlay.kind,desc:''};
      const card=document.createElement('article');card.className='overlay-card';
      const publicUrl=overlayUrl(overlay.public_token),controlUrl=overlayUrl(overlay.control_token),roulette=!!meta.source;
      card.innerHTML=`<span>${roulette?'RULETA':'OVERLAY'}</span><h3>${escapeHtml(meta.label)}</h3><p>${escapeHtml(meta.desc)}</p><label class="overlay-url-label">URL OBS · VISUALIZACIÓN</label><div class="copy-row"><input value="${escapeHtml(publicUrl)}" readonly><button type="button" data-copy="public">COPIAR</button></div><label class="overlay-url-label">URL PRIVADA · CONTROL</label><div class="copy-row"><input value="${escapeHtml(controlUrl)}" readonly><button type="button" data-copy="control">COPIAR</button></div><div class="overlay-actions">${roulette?'<button class="spin-overlay" type="button">GIRAR</button>':''}<button class="hide-overlay" type="button">OCULTAR</button><button class="preview-overlay" type="button">VISTA PREVIA</button></div>`;
      card.querySelector('[data-copy="public"]').onclick=()=>navigator.clipboard.writeText(publicUrl);
      card.querySelector('[data-copy="control"]').onclick=()=>navigator.clipboard.writeText(controlUrl);
      card.querySelector('.preview-overlay').onclick=()=>window.open(publicUrl,'_blank','noopener');
      card.querySelector('.hide-overlay').onclick=()=>hideOverlay(overlay.id);
      card.querySelector('.spin-overlay')?.addEventListener('click',()=>spinOverlay(overlay.id));
      grid.appendChild(card);
    });
  }

  function renderVoteEditor(){
    const letters=['A','B','C','D','E'];$('voteCardEditor').innerHTML=letters.map((letter,i)=>`<article class="vote-card-form" data-slot="${i+1}"><b>${letter}</b><label>TEXTO<input class="vote-card-label" maxlength="60" placeholder="CARTA ${letter}"></label><label>CANTIDAD<select class="vote-card-count"><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label></article>`).join('');
  }

  async function saveVoteDeck(){
    const name=$('voteDeckName').value.trim(),forms=[...document.querySelectorAll('.vote-card-form')];
    const cards=forms.map((f,i)=>({slot:i+1,label:f.querySelector('.vote-card-label').value.trim(),roulette_count:Number(f.querySelector('.vote-card-count').value)||0}));
    if(!name||cards.some(c=>!c.label)){setStatus('voteBuilderStatus','Completá el nombre del mazo y las cinco cartas A–E.','error');return}
    try{
      const {data:deck,error}=await client.from('stream_vote_decks').insert({workspace_id:workspace.id,name,duration_seconds:30}).select('id').single();if(error)throw error;
      const {error:cardsError}=await client.from('stream_vote_cards').insert(cards.map(c=>({...c,deck_id:deck.id})));if(cardsError){await client.from('stream_vote_decks').delete().eq('id',deck.id);throw cardsError}
      $('voteDeckName').value='';forms.forEach(f=>{f.querySelector('.vote-card-label').value='';f.querySelector('.vote-card-count').value='0'});
      setStatus('voteBuilderStatus','Mazo guardado correctamente.','success');await loadVoteDecks();
    }catch(err){console.error(err);setStatus('voteBuilderStatus','No se pudo guardar el mazo. Revisá tus permisos.','error')}
  }

  async function loadVoteDecks(){
    try{
      const {data,error}=await client.from('stream_vote_decks').select('id,name,duration_seconds,stream_vote_cards(id,slot,label,roulette_count,roulette_target)').eq('workspace_id',workspace.id).order('created_at',{ascending:false});if(error)throw error;
      voteDecks=(data||[]).map(d=>({...d,stream_vote_cards:[...(d.stream_vote_cards||[])].sort((a,b)=>a.slot-b.slot)}));
      const select=$('savedVoteDecks');select.innerHTML='<option value="">SELECCIONAR...</option>'+voteDecks.map(d=>`<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
    }catch(err){console.error(err);setStatus('voteBuilderStatus','No tenés permiso para administrar votaciones.','error')}
  }

  async function updateVoteOverlay(deck,sessionId,secondsLeft,status='active'){
    const overlay=overlays.find(o=>o.kind==='vote');if(!overlay)return;
    const {data:entries,error}=await client.from('stream_vote_entries').select('card_id').eq('session_id',sessionId);if(error)return;
    const counts=new Map();(entries||[]).forEach(e=>counts.set(e.card_id,(counts.get(e.card_id)||0)+1));
    const total=(entries||[]).length;
    const cards=deck.stream_vote_cards.map((c,i)=>({id:c.id,slot:String.fromCharCode(65+i),label:c.label,count:counts.get(c.id)||0,percentage:total?((counts.get(c.id)||0)/total)*100:0,rouletteCount:c.roulette_count}));
    await client.from('stream_overlays').update({state:{visible:true,status,deckName:deck.name,secondsLeft,cards,totalVotes:total},updated_at:new Date().toISOString()}).eq('id',overlay.id);
    renderVoteLive(deck,secondsLeft,cards,total,status);
    return cards;
  }

  function renderVoteLive(deck,secondsLeft,cards,total,status){
    const box=$('voteLive');box.hidden=false;box.innerHTML=`<div class="vote-live-head"><div><strong>${escapeHtml(deck.name)}</strong><div>${total} VOTOS</div></div><strong>${Math.max(0,secondsLeft)}s</strong></div><div class="vote-result-list">${cards.map(c=>`<div class="vote-result"><b>${c.slot}</b><div><span>${escapeHtml(c.label)}</span><div class="vote-result-bar"><i style="width:${Math.max(0,Math.min(100,c.percentage))}%"></i></div></div><strong>${c.count}</strong></div>`).join('')}</div>${status==='finished'?'<p>RONDA FINALIZADA</p>':''}`;
  }

  async function finalizeVote(){
    if(!activeVote)return;clearInterval(voteTicker);
    const deck=voteDecks.find(d=>d.id===activeVote.deck_id);if(!deck)return;
    const cards=await updateVoteOverlay(deck,activeVote.id,0,'finished')||[];
    const max=Math.max(0,...cards.map(c=>c.count)),leaders=cards.filter(c=>c.count===max&&max>0);
    const winner=leaders.length===1?leaders[0]:null;
    await client.from('stream_vote_sessions').update({status:'finished',winning_card_id:winner?.id||null,updated_at:new Date().toISOString()}).eq('id',activeVote.id);
    setStatus('voteRoundStatus',winner?`Ganó la carta ${winner.slot}: ${winner.label}.`:(max===0?'La ronda terminó sin votos.':'La ronda terminó empatada.'),winner?'success':'');
    $('startVoteRound').disabled=false;$('stopVoteRound').disabled=true;activeVote=null;
  }

  async function startVote(){
    const deck=voteDecks.find(d=>d.id===$('savedVoteDecks').value);if(!deck){setStatus('voteRoundStatus','Seleccioná un mazo.','error');return}
    const now=new Date(),ends=new Date(now.getTime()+30000);
    try{
      const {data,error}=await client.from('stream_vote_sessions').insert({workspace_id:workspace.id,deck_id:deck.id,platform:$('roundPlatform').value,status:'active',starts_at:now.toISOString(),ends_at:ends.toISOString()}).select('*').single();if(error)throw error;
      activeVote=data;$('startVoteRound').disabled=true;$('stopVoteRound').disabled=false;setStatus('voteRoundStatus','Votación iniciada.','success');
      const tick=async()=>{if(!activeVote)return;const left=Math.max(0,Math.ceil((new Date(activeVote.ends_at).getTime()-Date.now())/1000));await updateVoteOverlay(deck,activeVote.id,left,'active');if(left<=0)await finalizeVote()};
      await tick();voteTicker=setInterval(tick,1000);
    }catch(err){console.error(err);setStatus('voteRoundStatus','No se pudo iniciar la votación.','error')}
  }

  async function loadGiveawayState(){
    try{
      const {data,error}=await client.from('stream_giveaway_sessions').select('*').eq('workspace_id',workspace.id).eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle();if(error)throw error;
      activeGiveaway=data||null;if(activeGiveaway){$('startGiveaway').disabled=true;$('closeGiveaway').disabled=false;$('giveawayState').textContent='ABIERTO';await refreshGiveaway();giveawayTicker=setInterval(refreshGiveaway,1800)}else{$('startGiveaway').disabled=false;$('closeGiveaway').disabled=true;$('giveawayState').textContent='SIN INICIAR';$('giveawayCount').textContent='0';$('giveawayParticipants').innerHTML=''}
    }catch(err){console.error(err);setStatus('giveawayStatus','No tenés permiso para administrar sorteos.','error')}
  }

  async function refreshGiveaway(){
    if(!activeGiveaway)return;
    const {data,error}=await client.from('stream_giveaway_entries').select('participant_name,platform,created_at').eq('session_id',activeGiveaway.id).eq('eligible',true).order('created_at',{ascending:true});if(error)return;
    const entries=data||[];$('giveawayCount').textContent=String(entries.length);$('giveawayParticipants').innerHTML=entries.map(e=>`<div class="participant-row"><span>${escapeHtml(e.participant_name)}</span><span>${escapeHtml(e.platform.toUpperCase())}</span></div>`).join('');
    const overlay=overlays.find(o=>o.kind==='giveaway');if(overlay)await client.from('stream_overlays').update({state:{visible:true,status:'active',statusLabel:'ABIERTO',keyword:activeGiveaway.keyword,count:entries.length},updated_at:new Date().toISOString()}).eq('id',overlay.id);
  }

  async function startGiveaway(){
    const keyword=$('giveawayKeyword').value.trim();if(!keyword){setStatus('giveawayStatus','Ingresá una palabra clave.','error');return}
    const minDays=$('followerDays').value===''?null:Math.max(0,Number($('followerDays').value)||0);
    try{
      const {data,error}=await client.from('stream_giveaway_sessions').insert({workspace_id:workspace.id,platform:$('giveawayPlatform').value,keyword,status:'active',min_follower_days:minDays,subscriber_only:$('subscriberOnly').checked,vip_only:$('vipOnly').checked,moderator_only:$('moderatorOnly').checked,starts_at:new Date().toISOString()}).select('*').single();if(error)throw error;
      activeGiveaway=data;$('startGiveaway').disabled=true;$('closeGiveaway').disabled=false;$('giveawayState').textContent='ABIERTO';setStatus('giveawayStatus','Recepción de participantes iniciada.','success');await refreshGiveaway();giveawayTicker=setInterval(refreshGiveaway,1800);
    }catch(err){console.error(err);setStatus('giveawayStatus','No se pudo iniciar el sorteo.','error')}
  }

  async function closeGiveaway(){
    if(!activeGiveaway)return;clearInterval(giveawayTicker);
    const now=new Date().toISOString();await client.from('stream_giveaway_sessions').update({status:'closed',closed_at:now,updated_at:now}).eq('id',activeGiveaway.id);
    const overlay=overlays.find(o=>o.kind==='giveaway');if(overlay)await client.from('stream_overlays').update({state:{visible:true,status:'closed',statusLabel:'CERRADO',keyword:activeGiveaway.keyword,count:Number($('giveawayCount').textContent)||0},updated_at:now}).eq('id',overlay.id);
    activeGiveaway=null;$('giveawayState').textContent='CERRADO';$('startGiveaway').disabled=false;$('closeGiveaway').disabled=true;setStatus('giveawayStatus','Participación cerrada. Los mensajes posteriores quedan fuera de esta sesión.','success');
  }

  async function loadConnections(){
    const grid=$('connectionGrid');
    try{
      const {data,error}=await client.from('stream_platform_connections').select('*').eq('workspace_id',workspace.id);if(error)throw error;
      const rows=data||[];grid.innerHTML=['twitch','kick'].map(platform=>{
        const row=rows.find(r=>r.platform===platform),connected=!!row?.connected,name=row?.display_name||row?.username||'';
        return `<article class="connection-card-stream"><div class="platform-icon">${platform==='twitch'?'T':'K'}</div><div><span>${platform.toUpperCase()}</span><h3>${connected?escapeHtml(name||'CONECTADO'):'NO CONECTADO'}</h3><div class="connection-state ${connected?'connected':''}"><i></i>${connected?'CUENTA VINCULADA':'ESPERANDO OAUTH'}</div></div><button type="button" disabled>${connected?'GESTIONAR':'CONECTAR'}</button></article>`;
      }).join('');
    }catch(err){console.error(err);grid.innerHTML='<div class="connection-note"><strong>SIN PERMISO</strong><p>No tenés permiso para administrar las conexiones de este streamer.</p></div>'}
  }

  $('saveVoteDeck').onclick=saveVoteDeck;$('startVoteRound').onclick=startVote;$('stopVoteRound').onclick=finalizeVote;$('startGiveaway').onclick=startGiveaway;$('closeGiveaway').onclick=closeGiveaway;
  renderVoteEditor();

  (async()=>{
    try{
      if(!await loadSession())return;await loadWorkspaces();await refreshWorkspace();
      const hash=location.hash.replace('#','');openSection(['home','overlays','votes','giveaways','connections'].includes(hash)?hash:'home');
    }catch(err){console.error('Stream Tools:',err);setStatus('streamHomeStatus','No se pudo cargar Stream Tools. Revisá la sesión y la configuración de Supabase.','error')}
  })();
})();
