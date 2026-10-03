// SANLEAN — SORTEOS / visualización, simulación y control privado de ganador.
(()=>{
  const $=id=>document.getElementById(id);
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  let participants=[],simulatedParticipants=[],winner=null,winners=[],winnerMessages=[],spinning=false,lastSequence=[],spinId='',sessionStarted=false,participationOpen=false,overlayVisible=true;
  const rowHeight=56;
  const demoNames=['Pedro_33','Agusneta','MikaDBD','FengMain','NeaRunner','TotemHunter','MaxiGG','SableWard','YuiPower','DwightPro','ClaudetteX','JakeParkARG','LaurieStrode','BillMain','AdaWong','LeonRPD','MikaelaMoon','Vittorio77','NicolasCageFan','RipleyMain','LaraCroft','TrevorB','TaurieCain','RickGrimes','Michonne','Eleven011','DustinH','AuroraLive','PyramidFan','FreddyARG','UnknownMain','GhostFaceTV','OniRush','HuntressAxe','TrapperKing','NurseBlink','PlagueMain','KnightGuard','ChuckyGG','VecnaLich','Wesker7','ArtistCrow','DredgeNight','SadakoTV','NemesisRPD'];

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  const winnerKey=w=>w?norm(w.name)+'|'+norm(w.platform):'';
  const wonKeys=()=>new Set(winners.map(winnerKey));
  const platformMode=()=>String($('giveawayPlatform')?.value||'both').toLowerCase();

  function dbParticipantRows(){
    const source=$('giveawayParticipants'); if(!source)return [];
    return [...source.querySelectorAll('.participant-row')].map(row=>{
      const spans=row.querySelectorAll('span');
      return {name:(spans[0]?.textContent||'').trim(),platform:(spans[1]?.textContent||'').trim().toLowerCase()};
    }).filter(x=>x.name);
  }
  function mergedParticipants(){
    const map=new Map();[...dbParticipantRows(),...simulatedParticipants].forEach(p=>map.set(winnerKey(p),p));return [...map.values()]
  }
  function remainingParticipants(){const won=wonKeys();return participants.filter(x=>!won.has(winnerKey(x)))}

  function syncPanelState(){
    const panel=$('streamGiveawaysPanel'); if(panel)panel.classList.toggle('is-session-active',sessionStarted);
    const close=$('slCloseParticipation'),reopen=$('slReopenGiveaway');
    if(close)close.disabled=!sessionStarted||!participationOpen||spinning;
    if(reopen)reopen.disabled=!sessionStarted||participationOpen||spinning;
    const state=$('slGiveawaySessionState');
    if(state)state.textContent=!sessionStarted?'SIN INICIAR':participationOpen?'PARTICIPACIÓN ABIERTA':'PARTICIPACIÓN CERRADA';
  }

  async function syncOverlay(extra={}){
    const db=window.sanleanSupabase,overlay=window.SanLeanStreamTools?.getOverlays?.().find(o=>o.kind==='giveaway');
    if(!db||!overlay||!sessionStarted)return false;
    const keyword=$('giveawayKeyword')?.value.trim()||'PEDRO',remaining=remainingParticipants();
    const state={
      visible:overlayVisible,
      phase:spinning?'spinning':winner?'winner':'open',
      statusLabel:participationOpen?'ABIERTO':'CERRADO',
      keyword,platformMode:platformMode(),count:remaining.length,
      participants:remaining.slice(-120),winner,winners:[...winners],
      winnerMessages:[...winnerMessages],sequence:lastSequence,spinId,...extra
    };
    try{const {error}=await db.from('stream_overlays').update({state,updated_at:new Date().toISOString()}).eq('id',overlay.id);return !error}catch{return false}
  }

  function syncParticipants({push=true}={}){
    participants=mergedParticipants(); const remaining=remainingParticipants();
    if($('slGiveawayLiveCount'))$('slGiveawayLiveCount').textContent=String(remaining.length);
    const list=$('slGiveawayLiveParticipants');
    if(list)list.innerHTML=remaining.length?remaining.slice(-120).reverse().map(p=>'<div class="sl-giveaway-person"><span>'+escapeHtml(p.name)+'</span><small>'+escapeHtml((p.platform||'chat').toUpperCase())+'</small></div>').join(''):'<p class="sl-giveaway-empty">No quedan participantes disponibles.</p>';
    if($('slDrawWinner'))$('slDrawWinner').disabled=spinning||remaining.length<2;
    syncPanelState(); if(push&&sessionStarted)syncOverlay();
  }

  function pick(pool){if(!pool.length)return null;const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);return pool[Math.floor(bytes[0]/0x100000000*pool.length)]}
  function buildSequence(pool,selected){
    const seq=[];for(let i=0;i<64;i++)seq.push(pick(pool)||selected);
    const previous=pick(pool.filter(x=>winnerKey(x)!==winnerKey(selected)))||selected;
    const next=pick(pool.filter(x=>winnerKey(x)!==winnerKey(selected)&&winnerKey(x)!==winnerKey(previous)))||previous;
    seq.push(previous,selected,next);return seq;
  }

  async function drawWinner(){
    if(spinning)return;const pool=remainingParticipants();if(pool.length<2)return;
    sessionStarted=true;overlayVisible=true;spinning=true;winner=null;winnerMessages=[];syncVisibilityButton();syncPanelState();
    const selected=pick(pool),track=$('slGiveawayReelTrack'),shell=$('slGiveawayReel');
    if($('slDrawWinner'))$('slDrawWinner').disabled=true;
    shell?.classList.add('is-spinning');$('slGiveawayWinnerName').textContent='BUSCANDO...';$('slGiveawayWinnerPlatform').textContent='';renderWinnerMessages();
    lastSequence=buildSequence(pool,selected);spinId=crypto.randomUUID();
    await syncOverlay({visible:true,phase:'spinning',winner:null,winnerMessages:[],sequence:lastSequence,spinId});

    if(track){
      track.innerHTML=lastSequence.map((p,i)=>'<div class="sl-giveaway-reel-row'+(i===lastSequence.length-2?' is-target':'')+'">'+escapeHtml(p.name)+'</div>').join('');
      track.style.transform='translate3d(0,0,0)';track.getAnimations().forEach(a=>a.cancel());
      const targetIndex=lastSequence.length-2,end=-(targetIndex-1)*rowHeight;
      const anim=track.animate([{transform:'translate3d(0,0,0)'},{transform:'translate3d(0,'+end+'px,0)'}],{duration:5200,easing:'cubic-bezier(.12,.72,.12,1)',fill:'forwards'});
      try{await anim.finished}catch{} track.style.transform='translate3d(0,'+end+'px,0)';anim.cancel();
    }

    winner=selected;winners.push(selected);spinning=false;shell?.classList.remove('is-spinning');shell?.classList.add('has-winner');
    $('slGiveawayWinnerName').textContent=selected.name;$('slGiveawayWinnerPlatform').textContent=(selected.platform||'CHAT').toUpperCase();
    renderWinnerHistory();syncParticipants({push:false});
    await syncOverlay({visible:overlayVisible,phase:'celebrating',winner,sequence:lastSequence,spinId});
    await new Promise(r=>setTimeout(r,5000));
    if(sessionStarted&&winnerKey(winner)===winnerKey(selected))await syncOverlay({visible:overlayVisible,phase:'winner',winner,sequence:lastSequence,spinId});
    if($('slDrawWinner')){$('slDrawWinner').disabled=remainingParticipants().length<2;$('slDrawWinner').textContent='SORTEAR OTRO GANADOR'}
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
      const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=msg.username+': ';p.append(strong,document.createTextNode(msg.message||''));
      const remove=document.createElement('button');remove.type='button';remove.className='sl-giveaway-message-remove';remove.setAttribute('aria-label','Ocultar mensaje del overlay');remove.textContent='×';
      remove.onclick=()=>{winnerMessages=winnerMessages.filter(x=>x.id!==msg.id);renderWinnerMessages();syncOverlay({winnerMessages:[...winnerMessages]})};
      row.append(p,remove);host.append(row);
    });host.scrollTop=host.scrollHeight;
  }
  function receiveWinnerMessage(detail){
    if(!winner||!detail||norm(detail.username)!==norm(winner.name)||(winner.platform&&norm(detail.platform)!==norm(winner.platform)))return;
    winnerMessages.push({id:crypto.randomUUID(),username:detail.username,message:detail.message||'',platform:detail.platform||''});
    if(winnerMessages.length>12)winnerMessages.shift();renderWinnerMessages();syncOverlay({winnerMessages:[...winnerMessages]});
  }

  function enhanceFilters(){
    const box=document.querySelector('#streamGiveawaysPanel .eligibility-box');if(!box||$('followerOnly'))return;
    const label=document.createElement('label');label.innerHTML='<input id="followerOnly" type="checkbox"> SÓLO SEGUIDORES';
    const first=box.querySelector('label');box.insertBefore(label,first||null);
    const days=$('followerDays');if(days){const sync=()=>{days.disabled=!$('followerOnly').checked;if(days.disabled)days.value='0'};$('followerOnly').addEventListener('change',sync);sync()}
  }

  function simulateParticipants(){
    const mode=platformMode();simulatedParticipants=demoNames.map((name,i)=>({name,platform:mode==='both'?(i%4===0?'kick':'twitch'):mode}));
    if(!$('giveawayKeyword').value.trim())$('giveawayKeyword').value='PEDRO';
    sessionStarted=true;participationOpen=true;overlayVisible=true;
    if($('giveawayState'))$('giveawayState').textContent='ABIERTO · SIMULACIÓN';
    syncVisibilityButton();syncParticipants({push:false});syncPanelState();
    syncOverlay({visible:true,phase:winner?'winner':'open',statusLabel:'ABIERTO · SIMULACIÓN'});
  }

  async function closeParticipation(){
    if(!sessionStarted||!participationOpen||spinning)return;
    if(simulatedParticipants.length){participationOpen=false}
    else {const ok=await window.SanLeanStreamTools?.closeGiveaway?.();if(!ok)return;participationOpen=false}
    if($('giveawayState'))$('giveawayState').textContent='CERRADO';syncPanelState();syncOverlay({visible:overlayVisible,statusLabel:'CERRADO'});
  }
  async function reopenParticipation(){
    if(!sessionStarted||participationOpen||spinning)return;
    const ok=simulatedParticipants.length?true:await window.SanLeanStreamTools?.reopenGiveaway?.();if(!ok)return;
    participationOpen=true;if($('giveawayState'))$('giveawayState').textContent=simulatedParticipants.length?'ABIERTO · SIMULACIÓN':'ABIERTO';
    syncPanelState();syncOverlay({visible:overlayVisible,statusLabel:$('giveawayState')?.textContent||'ABIERTO',phase:winner?'winner':'open'});
  }

  function syncVisibilityButton(){const btn=$('slToggleGiveawayObs');if(btn)btn.textContent=overlayVisible?'OCULTAR EN OBS':'MOSTRAR EN OBS'}
  async function toggleObs(){if(!sessionStarted)return;overlayVisible=!overlayVisible;syncVisibilityButton();await syncOverlay({visible:overlayVisible})}

  async function finalizeGiveaway(){
    if(spinning)return;
    if(sessionStarted&&!simulatedParticipants.length)await window.SanLeanStreamTools?.finishGiveaway?.();
    await syncOverlay({visible:false,phase:'finished',statusLabel:'FINALIZADO'});
    sessionStarted=false;participationOpen=false;overlayVisible=false;simulatedParticipants=[];participants=[];winner=null;winners=[];winnerMessages=[];lastSequence=[];spinId='';
    if($('giveawayState'))$('giveawayState').textContent='SIN INICIAR';
    if($('slDrawWinner')){$('slDrawWinner').disabled=true;$('slDrawWinner').textContent='SORTEAR GANADOR'}
    $('slGiveawayWinnerName').textContent='—';$('slGiveawayWinnerPlatform').textContent='';$('slGiveawayReelTrack').innerHTML='<div class="sl-giveaway-reel-row is-placeholder">ESPERANDO SORTEO</div>';
    renderWinnerHistory();renderWinnerMessages();syncParticipants({push:false});syncVisibilityButton();syncPanelState();
  }

  function bindSessionButtons(){
    $('slCloseParticipation')?.addEventListener('click',closeParticipation);
    $('slReopenGiveaway')?.addEventListener('click',reopenParticipation);
    $('slSimulateGiveaway')?.addEventListener('click',simulateParticipants);
    $('slToggleGiveawayObs')?.addEventListener('click',toggleObs);
    $('slFinalizeGiveaway')?.addEventListener('click',finalizeGiveaway);
    $('startGiveaway')?.addEventListener('click',()=>setTimeout(()=>{if(!$('startGiveaway')?.disabled)return;sessionStarted=true;participationOpen=true;overlayVisible=true;syncVisibilityButton();syncPanelState();syncOverlay({visible:true,statusLabel:'ABIERTO'})},450));
  }

  function restoreOverlayState(){
    const overlay=window.SanLeanStreamTools?.getOverlays?.().find(o=>o.kind==='giveaway'),s=overlay?.state||{};
    if(!overlay||s.phase==='finished'||!s.phase)return;
    sessionStarted=true;participationOpen=String(s.statusLabel||'').includes('ABIERTO');overlayVisible=s.visible!==false;winner=s.winner||null;winners=Array.isArray(s.winners)?s.winners:[];winnerMessages=Array.isArray(s.winnerMessages)?s.winnerMessages:[];lastSequence=Array.isArray(s.sequence)?s.sequence:[];spinId=s.spinId||'';
    renderWinnerHistory();renderWinnerMessages();syncVisibilityButton();syncPanelState();
  }

  function mount(){
    const panel=$('streamGiveawaysPanel'),nativeList=$('giveawayParticipants'),config=panel?.querySelector(':scope > .module-box');
    if(!panel||!nativeList||!config||$('slGiveawayLive'))return;
    enhanceFilters();
    const live=document.createElement('section');live.id='slGiveawayLive';live.className='sl-giveaway-live ui-content-box';
    live.innerHTML=
      '<div class="sl-giveaway-live-head"><div><span class="sl-giveaway-kicker">SORTEO EN VIVO</span><h3>SELECCIÓN DE GANADOR</h3><p>Los participantes validados aparecen a la izquierda. Al sortear, el visor ocupa el protagonismo hasta detenerse en el ganador.</p></div><button id="slSimulateGiveaway" type="button" class="module-secondary">SIMULAR 45 PARTICIPANTES</button></div>'+
      '<div class="sl-giveaway-session-strip"><span>ESTADO</span><strong id="slGiveawaySessionState">SIN INICIAR</strong></div>'+
      '<div class="sl-giveaway-layout"><aside class="sl-giveaway-column sl-giveaway-participants"><div class="sl-giveaway-column-head"><span>PARTICIPANTES DISPONIBLES</span><strong id="slGiveawayLiveCount">0</strong></div><div id="slGiveawayLiveParticipants" class="sl-giveaway-scroll"></div></aside>'+
      '<div class="sl-giveaway-center"><div id="slGiveawayReel" class="sl-giveaway-reel"><div class="sl-giveaway-selection-band"></div><div class="sl-giveaway-reel-mask top"></div><div class="sl-giveaway-reel-mask bottom"></div><div id="slGiveawayReelTrack" class="sl-giveaway-reel-track"><div class="sl-giveaway-reel-row is-placeholder">ESPERANDO SORTEO</div></div></div><div class="sl-giveaway-draw-actions"><button id="slDrawWinner" type="button" class="module-primary" disabled>SORTEAR GANADOR</button><button id="slCloseParticipation" type="button" class="module-secondary" disabled>CERRAR PARTICIPACIÓN</button><button id="slReopenGiveaway" type="button" class="module-secondary" disabled>REABRIR PARTICIPACIÓN</button></div></div>'+
      '<aside class="sl-giveaway-column sl-giveaway-winner"><span class="sl-giveaway-kicker">GANADOR ACTUAL</span><div class="sl-giveaway-winner-name" id="slGiveawayWinnerName">—</div><div class="sl-giveaway-winner-platform" id="slGiveawayWinnerPlatform"></div><div class="sl-giveaway-chat-title">MENSAJES DEL GANADOR</div><div id="slWinnerMessages" class="sl-giveaway-winner-chat"><p class="sl-giveaway-empty">Cuando haya ganador, sus mensajes nuevos aparecerán acá.</p></div></aside></div>'+
      '<div class="sl-giveaway-session-history"><span>GANADORES DE ESTA SESIÓN</span><div id="slGiveawayWinners"><p class="sl-giveaway-empty">Todavía no hay ganadores en esta sesión.</p></div></div>'+
      '<div class="sl-giveaway-session-actions"><button id="slToggleGiveawayObs" type="button" class="module-secondary">OCULTAR EN OBS</button><button id="slFinalizeGiveaway" type="button" class="module-secondary sl-giveaway-finalize">FINALIZAR SORTEO</button></div>';
    config.insertAdjacentElement('afterend',live);nativeList.classList.add('sl-giveaway-native-list');
    $('slDrawWinner')?.addEventListener('click',drawWinner);bindSessionButtons();
    new MutationObserver(()=>syncParticipants()).observe(nativeList,{childList:true,subtree:true});
    restoreOverlayState();syncParticipants({push:false});syncPanelState();
  }

  window.addEventListener('sanlean:chat-message',e=>receiveWinnerMessage(e.detail));
  window.addEventListener('DOMContentLoaded',mount,{once:true});
  window.addEventListener('sanlean:overlays-updated',()=>{mount();restoreOverlayState();syncParticipants({push:false})});
})();