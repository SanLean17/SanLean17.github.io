// SANLEAN — SORTEOS / visualización y control privado de ganador.
(()=>{
  const $=id=>document.getElementById(id);
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  let participants=[],winner=null,winners=[],spinning=false;
  const rowHeight=56;

  function participantRows(){
    const source=$('giveawayParticipants');
    if(!source)return [];
    return [...source.querySelectorAll('.participant-row')].map(row=>{
      const spans=row.querySelectorAll('span');
      return {name:(spans[0]?.textContent||'').trim(),platform:(spans[1]?.textContent||'').trim().toLowerCase()};
    }).filter(x=>x.name);
  }

  function syncParticipants(){
    participants=participantRows();
    const count=$('slGiveawayLiveCount');
    if(count)count.textContent=String(participants.length);
    const list=$('slGiveawayLiveParticipants');
    if(list){
      list.innerHTML=participants.length
        ? participants.slice(-120).reverse().map((p,i)=>'<div class="sl-giveaway-person"><span>'+escapeHtml(p.name)+'</span><small>'+escapeHtml((p.platform||'chat').toUpperCase())+'</small></div>').join('')
        : '<p class="sl-giveaway-empty">Todavía no hay participantes validados.</p>';
    }
    const draw=$('slDrawWinner');
    if(draw)draw.disabled=spinning||participants.length<2;
  }

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  function pick(pool){
    if(!pool.length)return null;
    const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);
    return pool[Math.floor(bytes[0]/0x100000000*pool.length)];
  }

  function eligiblePool(){
    const won=new Set(winners.map(x=>norm(x.name)+'|'+x.platform));
    const remaining=participants.filter(x=>!won.has(norm(x.name)+'|'+x.platform));
    return remaining.length?remaining:participants;
  }

  function buildSequence(pool,selected){
    const seq=[];
    for(let i=0;i<64;i++)seq.push(pick(pool)||selected);
    seq.push(selected);
    let tail=pick(pool.filter(x=>x!==selected))||pick(pool)||selected;
    seq.push(tail);
    return seq;
  }

  async function drawWinner(){
    if(spinning)return;
    const pool=eligiblePool();
    if(pool.length<2)return;
    spinning=true;winner=null;
    const selected=pick(pool),track=$('slGiveawayReelTrack'),shell=$('slGiveawayReel');
    const draw=$('slDrawWinner');
    if(draw)draw.disabled=true;
    shell?.classList.add('is-spinning');
    $('slGiveawayWinnerName').textContent='BUSCANDO...';
    $('slGiveawayWinnerPlatform').textContent='';
    $('slWinnerMessages').innerHTML='<p class="sl-giveaway-empty">Cuando haya ganador, sus mensajes nuevos aparecerán acá.</p>';

    const sequence=buildSequence(pool,selected);
    if(track){
      track.innerHTML=sequence.map((p,i)=>'<div class="sl-giveaway-reel-row'+(i===sequence.length-2?' is-target':'')+'">'+escapeHtml(p.name)+'</div>').join('');
      track.style.transform='translate3d(0,0,0)';
      track.getAnimations().forEach(a=>a.cancel());
      const targetIndex=sequence.length-2;
      const end=-(targetIndex-1)*rowHeight;
      const anim=track.animate([
        {transform:'translate3d(0,0,0)'},
        {transform:'translate3d(0,'+end+'px,0)'}
      ],{duration:5200,easing:'cubic-bezier(.12,.72,.12,1)',fill:'forwards'});
      try{await anim.finished}catch{}
      track.style.transform='translate3d(0,'+end+'px,0)';
      anim.cancel();
    }

    winner=selected;winners.push(selected);spinning=false;
    shell?.classList.remove('is-spinning');
    shell?.classList.add('has-winner');
    $('slGiveawayWinnerName').textContent=selected.name;
    $('slGiveawayWinnerPlatform').textContent=(selected.platform||'CHAT').toUpperCase();
    renderWinnerHistory();
    const drawAgain=$('slDrawWinner');
    if(drawAgain){drawAgain.disabled=participants.length<2;drawAgain.textContent='SORTEAR OTRO GANADOR'}
  }

  function renderWinnerHistory(){
    const host=$('slGiveawayWinners');
    if(!host)return;
    host.innerHTML=winners.length?winners.map((w,i)=>'<div class="sl-giveaway-winner-row"><span>'+(i+1).toString().padStart(2,'0')+' · '+escapeHtml(w.name)+'</span><small>'+escapeHtml((w.platform||'chat').toUpperCase())+'</small></div>').join(''):'<p class="sl-giveaway-empty">Todavía no hay ganadores en esta sesión.</p>';
  }

  function receiveWinnerMessage(detail){
    if(!winner||!detail)return;
    if(norm(detail.username)!==norm(winner.name))return;
    if(winner.platform&&norm(detail.platform)!==norm(winner.platform))return;
    const host=$('slWinnerMessages');if(!host)return;
    if(host.querySelector('.sl-giveaway-empty'))host.innerHTML='';
    const p=document.createElement('p');const strong=document.createElement('strong');
    strong.textContent=detail.username+': ';p.append(strong,document.createTextNode(detail.message||''));host.append(p);
    while(host.children.length>12)host.firstElementChild.remove();
    host.scrollTop=host.scrollHeight;
  }

  function enhanceFilters(){
    const box=document.querySelector('#streamGiveawaysPanel .eligibility-box');
    if(!box||$('followerOnly'))return;
    const label=document.createElement('label');
    label.innerHTML='<input id="followerOnly" type="checkbox"> SÓLO SEGUIDORES';
    const first=box.querySelector('label');box.insertBefore(label,first||null);
    const days=$('followerDays');
    if(days){
      const sync=()=>{days.disabled=!$('followerOnly').checked;if(days.disabled)days.value='0'};
      $('followerOnly').addEventListener('change',sync);sync();
    }
  }

  function mount(){
    const panel=$('streamGiveawaysPanel'),nativeList=$('giveawayParticipants');
    if(!panel||!nativeList||$('slGiveawayLive'))return;
    enhanceFilters();
    const live=document.createElement('section');
    live.id='slGiveawayLive';
    live.className='sl-giveaway-live ui-content-box';
    live.innerHTML=
      '<div class="sl-giveaway-live-head"><div><span class="sl-giveaway-kicker">SORTEO EN VIVO</span><h3>SELECCIÓN DE GANADOR</h3><p>Los participantes validados aparecen a la izquierda. Al sortear, los nombres recorren el visor hasta detenerse en el ganador.</p></div></div>'+
      '<div class="sl-giveaway-layout">'+
        '<aside class="sl-giveaway-column sl-giveaway-participants"><div class="sl-giveaway-column-head"><span>PARTICIPANTES</span><strong id="slGiveawayLiveCount">0</strong></div><div id="slGiveawayLiveParticipants" class="sl-giveaway-scroll"></div></aside>'+
        '<div class="sl-giveaway-center">'+
          '<div id="slGiveawayReel" class="sl-giveaway-reel"><div class="sl-giveaway-selection-band"></div><div class="sl-giveaway-reel-mask top"></div><div class="sl-giveaway-reel-mask bottom"></div><div id="slGiveawayReelTrack" class="sl-giveaway-reel-track"><div class="sl-giveaway-reel-row is-placeholder">ESPERANDO SORTEO</div></div></div>'+
          '<button id="slDrawWinner" type="button" class="module-primary" disabled>SORTEAR GANADOR</button>'+
        '</div>'+
        '<aside class="sl-giveaway-column sl-giveaway-winner"><span class="sl-giveaway-kicker">GANADOR</span><div class="sl-giveaway-winner-name" id="slGiveawayWinnerName">—</div><div class="sl-giveaway-winner-platform" id="slGiveawayWinnerPlatform"></div><div class="sl-giveaway-chat-title">MENSAJES DEL GANADOR</div><div id="slWinnerMessages" class="sl-giveaway-winner-chat"><p class="sl-giveaway-empty">Cuando haya ganador, sus mensajes nuevos aparecerán acá.</p></div></aside>'+
      '</div>'+
      '<div class="sl-giveaway-session-history"><span>GANADORES DE ESTA SESIÓN</span><div id="slGiveawayWinners"><p class="sl-giveaway-empty">Todavía no hay ganadores en esta sesión.</p></div></div>';
    nativeList.insertAdjacentElement('afterend',live);
    nativeList.classList.add('sl-giveaway-native-list');
    $('slDrawWinner')?.addEventListener('click',drawWinner);
    new MutationObserver(syncParticipants).observe(nativeList,{childList:true,subtree:true});
    syncParticipants();
  }

  window.addEventListener('sanlean:chat-message',e=>receiveWinnerMessage(e.detail));
  window.addEventListener('DOMContentLoaded',mount,{once:true});
  window.addEventListener('sanlean:overlays-updated',()=>{mount();syncParticipants()});
})();