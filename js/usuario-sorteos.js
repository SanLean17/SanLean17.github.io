// SANLEAN — SORTEOS / visualización, simulación y control privado de ganador.
(()=>{
  const $=id=>document.getElementById(id);
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  let participants=[],simulatedParticipants=[],winner=null,winners=[],winnerMessages=[],spinning=false,lastSequence=[],spinId='',sessionStarted=false,participationOpen=false,overlayVisible=true,testMode=false;
  let currentWorkspaceId='',currentSessionId='',overlayWrite=Promise.resolve(),moderating=false;
  const rowHeight=56;
  const demoNames=['Pedro_33','Agusneta','MikaDBD','FengMain','NeaRunner','TotemHunter','MaxiGG','SableWard','YuiPower','DwightPro','ClaudetteX','JakeParkARG','LaurieStrode','BillMain','AdaWong','LeonRPD','MikaelaMoon','Vittorio77','NicolasCageFan','RipleyMain','LaraCroft','TrevorB','TaurieCain','RickGrimes','Michonne','Eleven011','DustinH','AuroraLive','PyramidFan','FreddyARG','UnknownMain','GhostFaceTV','OniRush','HuntressAxe','TrapperKing','NurseBlink','PlagueMain','KnightGuard','ChuckyGG','VecnaLich','Wesker7','ArtistCrow','DredgeNight','SadakoTV','NemesisRPD'];

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  const winnerKey=w=>w?String(w.userId||norm(w.name))+'|'+norm(w.platform):'';
  const wonKeys=()=>new Set(winners.map(winnerKey));
  const platformMode=()=>String($('giveawayPlatform')?.value||'both').toLowerCase();
  const subscriberBoost=()=>!!$('subscriberDoubleChance')?.checked;
  const vipBoost=()=>!!$('vipDoubleChance')?.checked;

  function dbParticipantRows(){
    const source=$('giveawayParticipants'); if(!source)return [];
    return [...source.querySelectorAll('.participant-row')].map(row=>{
      const spans=row.querySelectorAll('span');
      return {
        userId:row.dataset.userId||'',
        excluded:row.dataset.excluded==='true',
        name:(spans[0]?.textContent||'').trim(),
        platform:(spans[1]?.textContent||'').trim().toLowerCase(),
        isSubscriber:row.dataset.subscriber==='true',
        isVip:row.dataset.vip==='true'
      };
    }).filter(x=>x.name);
  }
  function mergedParticipants(){
    const map=new Map();(testMode?simulatedParticipants:dbParticipantRows()).forEach(p=>map.set(winnerKey(p),p));return [...map.values()]
  }
  function remainingParticipants(){const won=wonKeys();return participants.filter(x=>!x.excluded&&!won.has(winnerKey(x))&&!winners.some(w=>!w.userId&&norm(w.name)===norm(x.name)&&norm(w.platform)===norm(x.platform)))}
  function chanceMultiplier(p){return ((subscriberBoost()&&p.isSubscriber)||(vipBoost()&&p.isVip))?2:1}
  function chancePool(){
    const pool=[];
    remainingParticipants().forEach(p=>{for(let i=0;i<chanceMultiplier(p);i++)pool.push(p)});
    return pool;
  }
  function pick(pool){
    if(!pool.length)return null;
    const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);
    return pool[Math.floor(bytes[0]/0x100000000*pool.length)];
  }
  function pickDifferent(pool,avoid){
    const filtered=pool.filter(x=>winnerKey(x)!==avoid);
    return pick(filtered.length?filtered:pool);
  }

  function syncPanelState(){
    const panel=$('streamGiveawaysPanel'); if(panel)panel.classList.toggle('is-session-active',sessionStarted);
    const live=$('slGiveawayLive');if(live)live.hidden=!sessionStarted;
    const history=$('slGiveawayHistory');if(history)history.hidden=sessionStarted;
    const toggle=$('slParticipationToggle');
    if(toggle){
      toggle.disabled=!sessionStarted||spinning||moderating;
      toggle.textContent=participationOpen?'CERRAR PARTICIPACIÓN':'REABRIR PARTICIPACIÓN';
    }
    const state=$('slGiveawaySessionState');
    document.querySelectorAll('#slGiveawayLiveParticipants button,#slGiveawayExcludedList button').forEach(button=>button.disabled=spinning||moderating);
    if($('slSimulateGiveaway'))$('slSimulateGiveaway').disabled=!testMode;
    if($('slStartGiveawaySimulation'))$('slStartGiveawaySimulation').disabled=sessionStarted&&!testMode;
    if(state)state.textContent=testMode?'SIMULACIÓN · SIN GUARDADO':!sessionStarted?'SIN INICIAR':participationOpen?'PARTICIPACIÓN ABIERTA':'PARTICIPACIÓN CERRADA';
  }

  async function syncOverlay(extra={}){
    if(testMode)return true;
    const db=window.sanleanSupabase,overlay=window.SanLeanStreamTools?.getOverlays?.().find(o=>o.kind==='giveaway');
    if(!db||!overlay||!sessionStarted)return false;
    const keyword=$('giveawayKeyword')?.value.trim().toUpperCase()||'PEDRO',remaining=remainingParticipants();
    const state={
      sessionId:currentSessionId,
      visible:overlayVisible,
      phase:spinning?'spinning':winner?'winner':'open',
      statusLabel:participationOpen?'ABIERTO':'CERRADO',
      keyword,platformMode:platformMode(),count:remaining.length,
      participants:remaining.slice(-120),winner,winners:[...winners],
      winnerMessages:[...winnerMessages],sequence:lastSequence,spinId,
      subscriberDoubleChance:subscriberBoost(),vipDoubleChance:vipBoost(),
      ...extra
    };
    const write=async()=>{try{const {data,error}=await db.from('stream_overlays').update({state,updated_at:new Date().toISOString()}).eq('id',overlay.id).select('id').single();if(error||!data)return false;overlay.state=state;return true}catch{return false}};
    overlayWrite=overlayWrite.then(write,write);return overlayWrite;
  }

  function syncParticipants({push=true}={}){
    participants=mergedParticipants(); const remaining=remainingParticipants();
    if($('slGiveawayLiveCount'))$('slGiveawayLiveCount').textContent=String(remaining.length);
    const list=$('slGiveawayLiveParticipants');
    renderParticipantList(list,[...remaining].reverse(),false);
    const excluded=participants.filter(p=>p.excluded);if($('slGiveawayExcluded'))$('slGiveawayExcluded').hidden=!excluded.length;
    if($('slGiveawayExcludedCount'))$('slGiveawayExcludedCount').textContent=String(excluded.length);
    renderParticipantList($('slGiveawayExcludedList'),excluded,true);
    if($('slDrawWinner'))$('slDrawWinner').disabled=spinning||moderating||participationOpen||remaining.length<2;
    syncPanelState(); if(push&&sessionStarted&&!spinning)syncOverlay();
  }

  function renderParticipantList(host,people,excluded){
    if(!host)return;const key=JSON.stringify(people.map(p=>[winnerKey(p),p.name,p.excluded]));if(host.dataset.renderKey===key)return;host.dataset.renderKey=key;host.replaceChildren();
    if(!people.length){host.innerHTML='<p class="sl-giveaway-empty">No quedan participantes disponibles.</p>';return;}
    for(const person of people){
      const row=document.createElement('div');row.className='sl-giveaway-person';
      const name=document.createElement('span');name.textContent=person.name;name.title=person.name;
      const platform=document.createElement('small');platform.textContent=(person.platform||'chat').toUpperCase();
      const button=document.createElement('button');button.type='button';button.className=excluded?'ui-btn ui-btn-secondary sl-giveaway-allow':'sl-giveaway-message-remove';button.textContent=excluded?'AUTORIZAR':'×';
      button.setAttribute('aria-label',(excluded?'Volver a autorizar a ':'Excluir a ')+person.name+' de '+person.platform);button.title=excluded?'Volver a autorizar en este sorteo':'Excluir de este sorteo';button.disabled=spinning||moderating;
      button.onclick=()=>moderateParticipant(person,!excluded);row.append(name,platform,button);host.append(row);
    }
  }
  async function moderateParticipant(person,excluded){
    if(spinning||moderating||!sessionStarted)return;
    if($('slGiveawaySessionError'))$('slGiveawaySessionError').hidden=true;
    const sessionId=currentSessionId,workspaceId=currentWorkspaceId;moderating=true;syncParticipants({push:false});
    try{
      if(testMode){person.excluded=excluded;}
      else if(!await window.SanLeanStreamTools?.setGiveawayExcluded(person,excluded))throw new Error('No se pudo guardar el cambio. Reintentá.');
      if(currentSessionId!==sessionId||currentWorkspaceId!==workspaceId)return;
      syncParticipants({push:false});if(!await syncOverlay())throw new Error('El cambio se guardó, pero OBS no se pudo actualizar. Reintentá la conexión.');
    }catch(error){showSessionError(error.message||'No se pudo actualizar la participación.');}
    finally{moderating=false;syncParticipants({push:false});}
  }

  function buildSequence(pool,selected){
    const seq=[];let previousKey='';
    for(let i=0;i<64;i++){
      const next=pickDifferent(pool,previousKey)||selected;
      seq.push(next);previousKey=winnerKey(next);
    }
    const selectedKey=winnerKey(selected);
    const before=pickDifferent(pool,selectedKey)||selected;
    const afterCandidates=pool.filter(x=>winnerKey(x)!==selectedKey&&winnerKey(x)!==winnerKey(before));
    const after=pick(afterCandidates)||pickDifferent(pool,selectedKey)||before;
    if(winnerKey(seq.at(-1))===winnerKey(before))seq.pop();
    seq.push(before,selected,after);
    return seq;
  }

  async function drawWinner(){
    if(spinning||moderating||participationOpen)return;const weighted=chancePool();if(remainingParticipants().length<2||!weighted.length)return;
    const drawWorkspace=currentWorkspaceId,drawSession=currentSessionId;
    sessionStarted=true;overlayVisible=true;spinning=true;winner=null;winnerMessages=[];syncVisibilityButton();syncPanelState();
    const selected=pick(weighted),track=$('slGiveawayReelTrack'),shell=$('slGiveawayReel');
    if($('slDrawWinner'))$('slDrawWinner').disabled=true;
    shell?.classList.add('is-spinning');$('slGiveawayWinnerName').textContent='BUSCANDO...';$('slGiveawayWinnerPlatform').textContent='';renderWinnerMessages();
    lastSequence=buildSequence(weighted,selected);spinId=crypto.randomUUID();
    if(!await syncOverlay({visible:true,phase:'spinning',winner:null,winnerMessages:[],sequence:lastSequence,spinId})){spinning=false;shell?.classList.remove('is-spinning');syncParticipants({push:false});showSessionError('No se pudo sincronizar OBS. Reintentá el sorteo.');return;}

    if(track){
      track.innerHTML=lastSequence.map((p,i)=>'<div class="sl-giveaway-reel-row'+(i===lastSequence.length-2?' is-target':'')+'">'+escapeHtml(p.name)+'</div>').join('');
      track.style.transform='translate3d(0,0,0)';track.getAnimations().forEach(a=>a.cancel());
      const targetIndex=lastSequence.length-2,end=-(targetIndex-1)*rowHeight;
      const anim=track.animate([{transform:'translate3d(0,0,0)'},{transform:'translate3d(0,'+end+'px,0)'}],{duration:5200,easing:'cubic-bezier(.12,.72,.12,1)',fill:'forwards'});
      try{await anim.finished}catch{} track.style.transform='translate3d(0,'+end+'px,0)';anim.cancel();
    }

    if(currentWorkspaceId!==drawWorkspace||currentSessionId!==drawSession)return;
    winner=selected;winners.push(selected);shell?.classList.remove('is-spinning');shell?.classList.add('has-winner');
    $('slGiveawayWinnerName').textContent=selected.name;$('slGiveawayWinnerPlatform').textContent=(selected.platform||'CHAT').toUpperCase();
    renderWinnerHistory();syncParticipants({push:false});
    await syncOverlay({visible:overlayVisible,phase:'celebrating',winner,sequence:lastSequence,spinId});
    await new Promise(r=>setTimeout(r,5000));
    if(currentWorkspaceId!==drawWorkspace||currentSessionId!==drawSession)return;
    if(sessionStarted&&winnerKey(winner)===winnerKey(selected)){
      if(simulatedParticipants.length){
        const demoBadges=[...(selected.isVip?['VIP']:[]),...(selected.isSubscriber?['SUB']:[])];
        const demoColor=selected.isVip?'#8f6cff':selected.isSubscriber?'#58a6ff':'#ffffff';
        winnerMessages=[
          {id:crypto.randomUUID(),username:selected.name,message:'¡Hola! Sí, gané 😄',platform:selected.platform||'',color:demoColor,badges:demoBadges},
          {id:crypto.randomUUID(),username:selected.name,message:'Qué suerte, muchas gracias por el sorteo.',platform:selected.platform||'',color:demoColor,badges:demoBadges},
          {id:crypto.randomUUID(),username:selected.name,message:'Mi Instagram es @'+norm(selected.name).replace(/[^a-z0-9]/g,'')+'.',platform:selected.platform||'',color:demoColor,badges:demoBadges}
        ];
        renderWinnerMessages();
      }
      await syncOverlay({visible:overlayVisible,phase:'winner',winner,sequence:lastSequence,spinId,winnerMessages:[...winnerMessages]});
    }
    spinning=false;
    if($('slDrawWinner')){$('slDrawWinner').disabled=participationOpen||remainingParticipants().length<2;$('slDrawWinner').textContent='SORTEAR OTRO GANADOR'}
    syncPanelState();
  }

  function renderWinnerHistory(){
    const host=$('slGiveawayWinners');if(!host)return;
    host.innerHTML=winners.length?winners.map((w,i)=>'<div class="sl-giveaway-winner-row"><span>'+(i+1).toString().padStart(2,'0')+' · '+escapeHtml(w.name)+'</span><small>'+escapeHtml((w.platform||'chat').toUpperCase())+'</small></div>').join(''):'<p class="sl-giveaway-empty">Todavía no hay ganadores en esta sesión.</p>';
  }
  function renderWinnerMessages(){
    const host=$('slWinnerMessages');if(!host)return;
    if(!winnerMessages.length){host.innerHTML='<p class="sl-giveaway-empty">Cuando haya ganador, sus mensajes nuevos aparecerán acá.</p>';return}
    host.innerHTML='';
    winnerMessages.forEach(msg=>{
      const row=document.createElement('div');row.className='sl-giveaway-winner-message';
      const p=document.createElement('p'),identity=document.createElement('span');identity.className='sl-giveaway-chat-identity';
      (Array.isArray(msg.badges)?msg.badges:[]).forEach(label=>{const badge=document.createElement('i');badge.className='sl-giveaway-chat-badge';badge.textContent=label;identity.appendChild(badge)});
      const strong=document.createElement('strong');strong.textContent=msg.username+': ';if(msg.color)strong.style.color=msg.color;identity.appendChild(strong);p.append(identity,document.createTextNode(msg.message||''));
      const remove=document.createElement('button');remove.type='button';remove.className='sl-giveaway-message-remove';remove.setAttribute('aria-label','Ocultar mensaje del overlay');remove.textContent='×';
      remove.onclick=()=>{winnerMessages=winnerMessages.filter(x=>x.id!==msg.id);renderWinnerMessages();syncOverlay({winnerMessages:[...winnerMessages]})};
      row.append(p,remove);host.append(row);
    });host.scrollTop=host.scrollHeight;
  }
  function receiveWinnerMessage(detail){
    if(!winner||!detail||(winner.userId?String(detail.userId)!==String(winner.userId):norm(detail.username)!==norm(winner.name))||(winner.platform&&norm(detail.platform)!==norm(winner.platform)))return;
    winnerMessages.push({id:crypto.randomUUID(),username:detail.username,message:detail.message||'',platform:detail.platform||'',color:detail.color||'',badges:Array.isArray(detail.badges)?detail.badges:[]});
    if(winnerMessages.length>12)winnerMessages.shift();renderWinnerMessages();if(!spinning)syncOverlay({winnerMessages:[...winnerMessages]});
  }

  function enhanceFilters(){
    const box=document.querySelector('#streamGiveawaysPanel .eligibility-box');if(!box)return;
    if(!$('followerOnly')){
      const label=document.createElement('label');label.innerHTML='<input id="followerOnly" type="checkbox"> SÓLO SEGUIDORES';
      const first=box.querySelector('label');box.insertBefore(label,first||null);
      const days=$('followerDays');if(days){const sync=()=>{days.disabled=!$('followerOnly').checked;if(days.disabled)days.value='0'};$('followerOnly').addEventListener('change',sync);sync()}
    }
    if(!$('giveawayChanceBox')){
      const chance=document.createElement('div');chance.id='giveawayChanceBox';chance.className='sl-giveaway-chance-box';
      chance.innerHTML='<span>CHANCES EXTRA</span><label><input id="subscriberDoubleChance" type="checkbox"> SUSCRIPTORES ×2</label><label><input id="vipDoubleChance" type="checkbox"> VIPS ×2</label><small>La bonificación duplica la chance una sola vez aunque una persona sea VIP y suscriptora.</small>';
      box.insertAdjacentElement('afterend',chance);
      ['subscriberDoubleChance','vipDoubleChance'].forEach(id=>$(id)?.addEventListener('change',()=>{if(sessionStarted)syncOverlay()}));
    }
  }

  function arrangeConfig(){
    const panel=$('streamGiveawaysPanel'),box=panel?.querySelector(':scope > .module-box');
    if(!box||box.querySelector('.sl-giveaway-config-grid'))return;
    const keyword=$('giveawayKeyword')?.closest('label'),platform=$('giveawayPlatform')?.closest('label'),follower=$('followerDays')?.closest('label'),filters=box.querySelector('.eligibility-box'),chance=$('giveawayChanceBox');
    if(!keyword||!platform||!follower||!filters||!chance)return;
    if(follower.firstChild&&follower.firstChild.nodeType===Node.TEXT_NODE)follower.firstChild.nodeValue='ANTIGÜEDAD MÍNIMA COMO SEGUIDOR (MESES)';
    const title=document.createElement('div');title.className='sl-giveaway-config-head';title.innerHTML='<span>SORTEOS</span><h3>CREACIÓN DEL SORTEO</h3><p>Definí la palabra clave, la plataforma y los requisitos antes de abrir la participación.</p>';
    box.prepend(title);
    const grid=document.createElement('div');grid.className='sl-giveaway-config-grid';
    const fields=document.createElement('div');fields.className='sl-giveaway-config-fields';
    const options=document.createElement('div');options.className='sl-giveaway-config-options';
    fields.append(keyword,platform,follower);options.append(filters,chance);grid.append(fields,options);
    const firstFields=box.querySelector('.module-fields');if(firstFields)firstFields.insertAdjacentElement('beforebegin',grid);else box.prepend(grid);
    [...box.querySelectorAll('.module-fields')].forEach(row=>{if(!row.children.length)row.remove()});
    box.querySelector('.giveaway-live')?.remove();
  }

  function renderGiveawayHistory(){
    const host=$('slGiveawayHistoryList'),empty=$('slGiveawayHistoryEmpty'),overlay=window.SanLeanStreamTools?.getOverlays?.().find(o=>o.kind==='giveaway');
    if(!host||!empty)return;
    const history=Array.isArray(overlay?.settings?.history)?[...overlay.settings.history].reverse():[];
    empty.hidden=history.length>0;
    host.innerHTML=history.map(item=>{
      const date=new Date(item.finishedAt||item.createdAt||Date.now());
      const label=Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(date);
      const names=(Array.isArray(item.winners)?item.winners:[]).map(w=>w.name).filter(Boolean);
      return '<div class="sl-giveaway-history-row"><div><strong>'+escapeHtml(String(item.keyword||'SORTEO').toUpperCase())+'</strong><span>'+escapeHtml(label)+'</span></div><b>'+Number(item.participantCount||0)+' participantes</b><p>'+(names.length?'Ganadores: '+escapeHtml(names.join(', ')):'Sin ganadores registrados')+'</p></div>';
    }).join('');
  }

  async function saveGiveawayHistory(){
    if(testMode)return true;
    const db=window.sanleanSupabase,overlay=window.SanLeanStreamTools?.getOverlays?.().find(o=>o.kind==='giveaway');
    if(!db||!overlay)return false;
    const record={
      id:currentSessionId||crypto.randomUUID(),
      keyword:$('giveawayKeyword')?.value.trim().toUpperCase()||'SORTEO',
      platform:platformMode(),
      participantCount:participants.length,
      winners:winners.map(w=>({name:w.name,platform:w.platform||''})),
      finishedAt:new Date().toISOString()
    };
    const history=[...(Array.isArray(overlay.settings?.history)?overlay.settings.history.filter(item=>item.id!==record.id):[]),record].slice(-30);
    const settings={...(overlay.settings||{}),history};
    const {data,error}=await db.from('stream_overlays').update({settings,updated_at:new Date().toISOString()}).eq('id',overlay.id).select('settings').single();
    if(!error){overlay.settings=data?.settings||settings;renderGiveawayHistory()}return !error;
  }

  function simulateParticipants(){
    if(sessionStarted&&!testMode)return;
    const mode=platformMode();winner=null;winners=[];winnerMessages=[];lastSequence=[];currentSessionId='';
    simulatedParticipants=demoNames.map((name,i)=>({name,platform:mode==='both'?(i%4===0?'kick':'twitch'):mode,isSubscriber:i%5===0||i%9===0,isVip:i%7===0}));
    if(!$('giveawayKeyword').value.trim())$('giveawayKeyword').value='TULIPÁN';
    testMode=true;sessionStarted=true;participationOpen=true;overlayVisible=true;
    if($('giveawayState'))$('giveawayState').textContent='ABIERTO · SIMULACIÓN';
    syncVisibilityButton();syncParticipants({push:false});syncPanelState();
    syncOverlay({visible:true,phase:winner?'winner':'open',statusLabel:'ABIERTO · SIMULACIÓN'});
  }

  async function closeParticipation(){
    if(!sessionStarted||!participationOpen||spinning)return;
    if(testMode||simulatedParticipants.length)participationOpen=false;
    else {const ok=await window.SanLeanStreamTools?.closeGiveaway?.();if(!ok)return;participationOpen=false}
    if($('giveawayState'))$('giveawayState').textContent='CERRADO';syncPanelState();syncParticipants({push:false});syncOverlay({visible:overlayVisible,statusLabel:'CERRADO'});
  }
  async function reopenParticipation(){
    if(!sessionStarted||participationOpen||spinning)return;
    const ok=(testMode||simulatedParticipants.length)?true:await window.SanLeanStreamTools?.reopenGiveaway?.();if(!ok)return;
    participationOpen=true;if($('giveawayState'))$('giveawayState').textContent=simulatedParticipants.length?'ABIERTO · SIMULACIÓN':'ABIERTO';
    syncPanelState();syncParticipants({push:false});syncOverlay({visible:overlayVisible,statusLabel:$('giveawayState')?.textContent||'ABIERTO',phase:winner?'winner':'open'});
  }
  async function toggleParticipation(){if(participationOpen)await closeParticipation();else await reopenParticipation()}

  function syncVisibilityButton(){const btn=$('slToggleGiveawayObs');if(btn){btn.hidden=testMode;btn.textContent=overlayVisible?'OCULTAR EN OBS':'MOSTRAR EN OBS'}}
  async function toggleObs(){if(!sessionStarted)return;overlayVisible=!overlayVisible;syncVisibilityButton();await syncOverlay({visible:overlayVisible})}

  async function cancelGiveaway(){
    if(spinning||moderating||!sessionStarted)return;
    const confirm=window.SanLeanConfirm?.open?await window.SanLeanConfirm.open({
      eyebrow:'SORTEOS',
      title:'DESCARTAR SORTEO',
      text:'Se descartará la sesión actual y volverás a la configuración sin guardarla en el historial.',
      cancelLabel:'VOLVER',
      confirmLabel:'DESCARTAR SORTEO'
    }):true;
    if(!confirm)return;
    if(sessionStarted&&!testMode&&!await window.SanLeanStreamTools?.finishGiveaway?.('cancelled'))return;
    if(!await syncOverlay({visible:false,phase:'finished',statusLabel:'CANCELADO'})){showSessionError('No se pudo ocultar OBS. Reintentá DESCARTAR SORTEO.');return;}
    sessionStarted=false;participationOpen=false;overlayVisible=false;testMode=false;simulatedParticipants=[];participants=[];winner=null;winners=[];winnerMessages=[];lastSequence=[];spinId='';
    if($('giveawayState'))$('giveawayState').textContent='SIN INICIAR';
    if($('slDrawWinner')){$('slDrawWinner').disabled=true;$('slDrawWinner').textContent='SORTEAR GANADOR'}
    $('slGiveawayWinnerName').textContent='—';$('slGiveawayWinnerPlatform').textContent='';$('slGiveawayReelTrack').innerHTML='<div class="sl-giveaway-reel-row is-placeholder">ESPERANDO SORTEO</div>';
    renderWinnerHistory();renderWinnerMessages();syncParticipants({push:false});syncVisibilityButton();syncPanelState();
  }

  async function finalizeGiveaway(){
    if(spinning||moderating||!sessionStarted)return;
    const confirm=window.SanLeanConfirm?.open?await window.SanLeanConfirm.open({
      eyebrow:'SORTEOS',
      title:'FINALIZAR SORTEO',
      text:'¿Estás seguro de finalizar este sorteo? Se cerrará la sesión y no se podrá volver a editar.',
      confirmLabel:'FINALIZAR SORTEO'
    }):true;
    if(!confirm)return;
    if(!await saveGiveawayHistory()){showSessionError('No se pudo guardar el historial. El sorteo sigue abierto para reintentar.');return;}
    if(sessionStarted&&!testMode&&!await window.SanLeanStreamTools?.finishGiveaway?.('finished'))return;
    if(!await syncOverlay({visible:false,phase:'finished',statusLabel:'FINALIZADO'})){showSessionError('No se pudo ocultar OBS. Reintentá FINALIZAR SORTEO.');return;}
    sessionStarted=false;participationOpen=false;overlayVisible=false;testMode=false;simulatedParticipants=[];participants=[];winner=null;winners=[];winnerMessages=[];lastSequence=[];spinId='';
    if($('giveawayState'))$('giveawayState').textContent='SIN INICIAR';
    if($('slDrawWinner')){$('slDrawWinner').disabled=true;$('slDrawWinner').textContent='SORTEAR GANADOR'}
    $('slGiveawayWinnerName').textContent='—';$('slGiveawayWinnerPlatform').textContent='';$('slGiveawayReelTrack').innerHTML='<div class="sl-giveaway-reel-row is-placeholder">ESPERANDO SORTEO</div>';
    renderWinnerHistory();renderWinnerMessages();syncParticipants({push:false});syncVisibilityButton();syncPanelState();
  }

  function bindSessionButtons(){
    $('slParticipationToggle')?.addEventListener('click',toggleParticipation);
    $('slSimulateGiveaway')?.addEventListener('click',simulateParticipants);
    $('slToggleGiveawayObs')?.addEventListener('click',toggleObs);
    $('slCancelGiveaway')?.addEventListener('click',cancelGiveaway);
    $('slFinalizeGiveaway')?.addEventListener('click',finalizeGiveaway);
  }

  function showSessionError(message){const el=$('slGiveawaySessionError');if(el){el.textContent=message;el.hidden=false;}}
  function restoreOverlayState(){
    const tools=window.SanLeanStreamTools,workspaceId=tools?.getWorkspace?.()?.id||'',active=tools?.getGiveaway?.();
    if(currentWorkspaceId&&currentWorkspaceId!==workspaceId){sessionStarted=false;testMode=false;spinning=false;simulatedParticipants=[];participants=[];winner=null;winners=[];winnerMessages=[];lastSequence=[];currentSessionId='';}
    currentWorkspaceId=workspaceId;
    if(testMode||spinning)return;
    if(!active){sessionStarted=false;syncPanelState();return}
    const overlay=tools.getOverlays?.().find(o=>o.kind==='giveaway'),saved=overlay?.state||{},legacy=!saved.sessionId&&saved.phase!=='finished'&&norm(saved.keyword)===norm(active.keyword)&&saved.platformMode===active.platform,s=saved.sessionId===active.id||legacy?saved:{};
    currentSessionId=active.id;sessionStarted=true;participationOpen=active.status==='active';overlayVisible=s.visible!==false;winner=s.winner||null;winners=Array.isArray(s.winners)?s.winners:[];winnerMessages=Array.isArray(s.winnerMessages)?s.winnerMessages:[];lastSequence=Array.isArray(s.sequence)?s.sequence:[];spinId=s.spinId||'';
    if($('giveawayKeyword'))$('giveawayKeyword').value=String(active.keyword).toUpperCase();
    if($('giveawayPlatform')){$('giveawayPlatform').value=active.platform;$('giveawayPlatform').dispatchEvent(new Event('change',{bubbles:true}))}
    for(const [id,key] of [['followerOnly','follower_only'],['subscriberOnly','subscriber_only'],['vipOnly','vip_only'],['moderatorOnly','moderator_only']])if($(id))$(id).checked=!!active[key];
    if($('followerDays')){$('followerDays').disabled=!active.follower_only;$('followerDays').value=String(active.min_follower_months||0)}
    if($('subscriberDoubleChance')&&(saved.sessionId===active.id||legacy))$('subscriberDoubleChance').checked=!!s.subscriberDoubleChance;
    if($('vipDoubleChance')&&(saved.sessionId===active.id||legacy))$('vipDoubleChance').checked=!!s.vipDoubleChance;
    $('slGiveawayWinnerName').textContent=winner?.name||'—';$('slGiveawayWinnerPlatform').textContent=winner?.platform?.toUpperCase()||'';
    const track=$('slGiveawayReelTrack');if(track&&lastSequence.length){track.style.transform='none';track.innerHTML=lastSequence.slice(-3).map((p,i)=>'<div class="sl-giveaway-reel-row'+(i===1?' is-target':'')+'">'+escapeHtml(p.name)+'</div>').join('')}
    if(s.phase==='spinning'&&lastSequence.length>=3){winner=lastSequence.at(-2);if(!winners.some(w=>winnerKey(w)===winnerKey(winner)))winners.push(winner);$('slGiveawayWinnerName').textContent=winner.name;$('slGiveawayWinnerPlatform').textContent=winner.platform?.toUpperCase()||'';}
    renderWinnerHistory();renderWinnerMessages();syncParticipants({push:false});syncVisibilityButton();syncPanelState();
    if(!s.sessionId||['spinning','celebrating'].includes(s.phase))syncOverlay();
  }

  function mount(){
    const panel=$('streamGiveawaysPanel'),nativeList=$('giveawayParticipants'),config=panel?.querySelector(':scope > .module-box');
    if(!panel||!nativeList||!config||$('slGiveawayLive'))return;
    const keywordInput=$('giveawayKeyword');
    if(keywordInput){
      const uppercaseKeyword=event=>{
        if(event?.isComposing)return;
        const start=keywordInput.selectionStart,end=keywordInput.selectionEnd;
        keywordInput.value=keywordInput.value.toUpperCase();
        if(start!==null)keywordInput.setSelectionRange(start,end);
      };
      keywordInput.addEventListener('input',uppercaseKeyword);
      keywordInput.addEventListener('compositionend',uppercaseKeyword);
      uppercaseKeyword();
    }
    enhanceFilters();arrangeConfig();
    const simulate=document.createElement('button');simulate.type='button';simulate.id='slStartGiveawaySimulation';simulate.className='module-secondary';simulate.textContent='SIMULAR SORTEO';simulate.onclick=simulateParticipants;
    const start=$('startGiveaway');start?.insertAdjacentElement('afterend',simulate);
    const live=document.createElement('section');live.id='slGiveawayLive';live.className='sl-giveaway-live ui-content-box';live.hidden=true;
    live.innerHTML=
      '<div class="sl-giveaway-live-head"><div><span class="sl-giveaway-kicker">SORTEO EN VIVO</span><h3>SELECCIÓN DE GANADOR</h3><p>Los participantes validados aparecen a la izquierda. Al sortear, el visor ocupa el protagonismo hasta detenerse en el ganador.</p></div><button id="slSimulateGiveaway" type="button" class="module-secondary">SIMULAR 45 PARTICIPANTES</button></div>'+
      '<div class="sl-giveaway-session-strip"><span>ESTADO</span><strong id="slGiveawaySessionState">SIN INICIAR</strong></div>'+
      '<div class="sl-giveaway-layout"><aside class="sl-giveaway-column sl-giveaway-participants"><div class="sl-giveaway-column-head"><span>PARTICIPANTES DISPONIBLES</span><strong id="slGiveawayLiveCount">0</strong></div><div id="slGiveawayLiveParticipants" class="sl-giveaway-scroll"></div></aside>'+
      '<div class="sl-giveaway-center"><div id="slGiveawayReel" class="sl-giveaway-reel"><div class="sl-giveaway-selection-band"></div><div class="sl-giveaway-reel-mask top"></div><div class="sl-giveaway-reel-mask bottom"></div><div id="slGiveawayReelTrack" class="sl-giveaway-reel-track"><div class="sl-giveaway-reel-row is-placeholder">ESPERANDO SORTEO</div></div></div><div class="sl-giveaway-draw-actions"><button id="slParticipationToggle" type="button" class="module-secondary" disabled>CERRAR PARTICIPACIÓN</button><button id="slDrawWinner" type="button" class="module-primary" disabled>SORTEAR GANADOR</button></div></div>'+
      '<aside class="sl-giveaway-column sl-giveaway-winner"><span class="sl-giveaway-kicker">GANADOR ACTUAL</span><div class="sl-giveaway-winner-name" id="slGiveawayWinnerName">—</div><div class="sl-giveaway-winner-platform" id="slGiveawayWinnerPlatform"></div><div class="sl-giveaway-chat-title">MENSAJES DEL GANADOR</div><div id="slWinnerMessages" class="sl-giveaway-winner-chat"><p class="sl-giveaway-empty">Cuando haya ganador, sus mensajes nuevos aparecerán acá.</p></div></aside></div>'+
      '<details id="slGiveawayExcluded" class="sl-giveaway-session-history" hidden><summary>EXCLUIDOS DE ESTE SORTEO (<span id="slGiveawayExcludedCount">0</span>)</summary><p class="ui-field-help">No pueden volver a entrar aunque repitan la palabra clave. AUTORIZAR los devuelve a la lista. Esta exclusión sólo vale para el sorteo actual.</p><div id="slGiveawayExcludedList" class="sl-giveaway-scroll"></div></details>'+
      '<div class="sl-giveaway-session-history"><span>GANADORES DE ESTA SESIÓN</span><div id="slGiveawayWinners"><p class="sl-giveaway-empty">Todavía no hay ganadores en esta sesión.</p></div></div>'+
      '<p id="slGiveawaySessionError" class="module-status error" role="alert" hidden></p><div class="sl-giveaway-session-actions"><div class="sl-giveaway-session-actions-left"><button id="slToggleGiveawayObs" type="button" class="module-secondary">OCULTAR EN OBS</button></div><div class="sl-giveaway-session-actions-right"><button id="slCancelGiveaway" type="button" class="module-secondary">CANCELAR SORTEO</button><button id="slFinalizeGiveaway" type="button" class="module-secondary sl-giveaway-finalize">FINALIZAR SORTEO</button></div></div>';
    config.insertAdjacentElement('afterend',live);
    const history=document.createElement('section');history.id='slGiveawayHistory';history.className='sl-giveaway-history ui-content-box';history.innerHTML='<div class="sl-giveaway-history-head"><span>SORTEOS</span><h3>HISTORIAL DE SORTEOS</h3></div><div id="slGiveawayHistoryList" class="sl-giveaway-history-list"></div><p id="slGiveawayHistoryEmpty" class="sl-giveaway-empty">TODAVÍA NO HAY SORTEOS GUARDADOS.</p>';
    live.insertAdjacentElement('afterend',history);
    nativeList.classList.add('sl-giveaway-native-list');
    $('slDrawWinner')?.addEventListener('click',drawWinner);bindSessionButtons();
    new MutationObserver(()=>{if(participationOpen)syncParticipants()}).observe(nativeList,{childList:true,subtree:true});
    restoreOverlayState();syncParticipants({push:false});renderGiveawayHistory();syncPanelState();
  }

  window.addEventListener('sanlean:giveaway-session',restoreOverlayState);
  window.addEventListener('sanlean:chat-message',e=>receiveWinnerMessage(e.detail));
  window.addEventListener('DOMContentLoaded',mount,{once:true});
  window.addEventListener('sanlean:overlays-updated',()=>{mount();restoreOverlayState();syncParticipants({push:false});renderGiveawayHistory()});
})();
