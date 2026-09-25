/* USUARIO > CARTAS — replaces the legacy configurable-deck UI with the approved live game flow. */
(() => {
  const STORAGE_PLATFORM='sanlean-cards-platform';
  const STORAGE_PENDING='sanlean-cards-pending-roulette';
  const LETTERS=['A','B','C','D','E'];
  const NORMAL_RESULTS=[0,1,2,3,4];
  let timer=null;
  let secondsLeft=30;
  let round=null;

  const $=id=>document.getElementById(id);
  const shuffle=input=>{
    const a=[...input];
    for(let i=a.length-1;i>0;i--){
      const r=new Uint32Array(1);crypto.getRandomValues(r);const j=r[0]%(i+1);[a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  };
  const safeStorage={
    get(k,f=''){try{return localStorage.getItem(k)||f}catch{return f}},
    set(k,v){try{localStorage.setItem(k,v)}catch{}}
  };

  function injectCss(){
    if(document.querySelector('link[data-sanlean-cards]'))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href='../css/usuario-cartas.css?v=20260925-2';link.dataset.sanleanCards='true';document.head.appendChild(link);
  }

  function renameSurface(){
    document.querySelectorAll('[data-section-key="votes"],[data-tab="votes"]').forEach(btn=>btn.textContent='CARTAS');
    const head=$('streamVotesPanel')?.querySelector('.stream-module-head');
    if(head){
      const kicker=head.querySelector('.eyebrow');if(kicker)kicker.textContent='JUEGO EN STREAM';
      const title=head.querySelector('h2');if(title)title.textContent='CARTAS';
      const copy=head.querySelector('p:last-child');if(copy)copy.innerHTML='Generá una ronda de cinco cartas ocultas para que el chat vote o para elegir manualmente.<br>Revelá el resultado ganador y continuá a la ruleta de perks cuando corresponda.';
    }
    const output=$('streamVotesPanel')?.querySelector('[data-stream-output="votes"]');
    if(output){
      const title=output.querySelector('.stream-output-head h3');if(title)title.textContent='CARTAS EN STREAM';
      const copy=output.querySelector('.stream-output-head p');if(copy)copy.textContent='El overlay mostrará las cinco cartas, el tiempo y los resultados de la votación debajo de ellas, además de la revelación que controle el streamer.';
    }
    document.querySelectorAll('.account-page .permission-grid label').forEach(label=>{const span=label.querySelector('span');if(span?.textContent.trim()==='VOTACIONES')span.textContent='CARTAS'});
    document.querySelectorAll('.account-page .permission-tags span').forEach(span=>{if(span.textContent.trim()==='VOTACIONES')span.textContent='CARTAS'});
  }

  function simulationMarkup(){
    const normal=[['C',33,41],['B',26,32],['D',12,15],['E',10,12],['A',0,0]];
    const special=[['B',12,36],['D',8,24],['C',8,24],['A',5,15],['E',0,0]];
    const board=(rows,specialRound=false,winner='C')=>`<div class="cards-review-label"><span>${specialRound?'EVENTO ESPECIAL':'RONDA NORMAL'}</span><strong>${specialRound?'VOTOS ACUMULABLES':'1 VOTO ACTIVO POR USUARIO'}</strong></div><div class="cards-review-stage">${rows.map(([letter])=>`<div class="cards-review-card${specialRound?' is-special':''}${letter===winner?' is-winner':''}"><b>${letter}</b></div>`).join('')}</div><div class="cards-review-results">${rows.map(([letter,count,percent])=>`<div><b>${letter}</b><span><i style="width:${percent}%"></i></span><strong>${count} VOTOS · ${percent}%</strong></div>`).join('')}</div>`;
    return `<details class="ui-simulation cards-review" open><summary>SIMULACIÓN · CARTAS</summary><p>Vista ficticia para revisar la lógica visual. Las cartas quedan limpias y los votos/porcentajes aparecen debajo.</p><div class="cards-review-toolbar"><span class="ui-badge">MODO CHAT</span><span class="ui-badge">SUPERVIVIENTE</span><strong>00:00 · VOTACIÓN CERRADA</strong></div>${board(normal,false,'C')}<div class="cards-review-separator"></div>${board(special,true,'B')}</details>`;
  }

  function buildPanel(){
    const section=$('streamVotesPanel');if(!section||section.dataset.cardsUi==='true')return false;
    section.dataset.cardsUi='true';
    section.innerHTML=`
      <div class="stream-module-head">
        <p class="eyebrow">JUEGO EN STREAM</p>
        <h2>CARTAS</h2>
        <p>Generá una ronda de cinco cartas ocultas para que el chat vote o para elegir manualmente.<br>Revelá el resultado ganador y continuá a la ruleta de perks cuando corresponda.</p>
      </div>
      <div class="cards-platform-box">
        <h3 class="cards-section-title">PLATAFORMA DE CARTAS</h3>
        <div class="cards-fields">
          <label>PLATAFORMA
            <select id="cardsPlatform">
              <option value="twitch">TWITCH</option>
              <option value="kick">KICK</option>
              <option value="both">TWITCH + KICK</option>
            </select>
          </label>
        </div>
        <p class="cards-help">Esta elección queda guardada para las próximas rondas. No hace falta configurarla cada vez.</p>
      </div>
      <div class="cards-round-box">
        <h3 class="cards-section-title">CONFIGURACIÓN DE LA RONDA</h3>
        <div class="cards-fields">
          <label>MODO DE ELECCIÓN
            <select id="cardsMode">
              <option value="chat">CHAT</option>
              <option value="manual">MANUAL</option>
            </select>
          </label>
          <label>PRÓXIMA PARTIDA
            <select id="cardsRole">
              <option value="survivor">SUPERVIVIENTE</option>
              <option value="killer">KILLER</option>
            </select>
          </label>
        </div>
        <div class="cards-actions"><button id="cardsStart" class="cards-primary" type="button">INICIAR VOTACIÓN</button></div>
        <p id="cardsRoundStatus" class="cards-status"></p>
      </div>
      <div class="cards-live-box">
        <h3 class="cards-section-title">CONTROL EN VIVO</h3>
        <div id="cardsEventBadge" class="cards-event-badge">EVENTO ESPECIAL · VOTOS ACUMULABLES</div>
        <div class="cards-metrics">
          <div class="cards-metric"><span>ESTADO</span><strong id="cardsState">SIN INICIAR</strong></div>
          <div class="cards-metric"><span>TIEMPO</span><strong id="cardsTimer">00:30</strong></div>
          <div class="cards-metric"><span>TOTAL DE VOTOS</span><strong id="cardsTotalVotes">0</strong></div>
        </div>
      </div>
      <div class="cards-board-box">
        <h3 class="cards-section-title">CARTAS</h3>
        <div id="cardsStage" class="cards-stage"></div>
        <div id="cardsVoteResults" class="cards-vote-results"></div>
        <div class="cards-actions">
          <button id="cardsRevealWinner" class="cards-primary" type="button" disabled>REVELAR CARTA GANADORA</button>
          <button id="cardsNewRound" class="cards-secondary" type="button" disabled>NUEVA RONDA</button>
        </div>
        <p id="cardsBoardStatus" class="cards-status"></p>
        <p class="cards-preview-note">La imagen definitiva de las cartas y los símbolos PNG de resultados se conectarán a esta estructura cuando estén cargados en GitHub.</p>
      </div>
      <div id="cardsResultBox" class="cards-result-box" hidden>
        <h3 class="cards-section-title">RESULTADO DE LA RONDA</h3>
        <div class="cards-result-summary"><strong id="cardsOfficialResult">—</strong><span id="cardsOfficialRole">—</span></div>
        <div class="cards-actions"><button id="cardsContinue" class="cards-primary" type="button">IR A LA RULETA</button></div>
      </div>
      ${simulationMarkup()}`;
    return true;
  }

  function makeRound(){
    const letters=shuffle(LETTERS),results=shuffle(NORMAL_RESULTS);
    return {
      mode:$('cardsMode')?.value||'chat',
      role:$('cardsRole')?.value||'survivor',
      platform:$('cardsPlatform')?.value||'twitch',
      special:false,
      state:'ready',
      winner:null,
      revealed:new Set(),
      cards:letters.map((letter,index)=>({letter,result:results[index],votes:0}))
    };
  }

  function setState(text){if($('cardsState'))$('cardsState').textContent=text}
  function setTimer(value){if($('cardsTimer'))$('cardsTimer').textContent=`00:${String(Math.max(0,value)).padStart(2,'0')}`}
  function totalVotes(){return round?round.cards.reduce((s,c)=>s+c.votes,0):0}

  function renderVoteRows(){
    const box=$('cardsVoteResults');if(!box||!round)return;
    const total=totalVotes();if($('cardsTotalVotes'))$('cardsTotalVotes').textContent=String(total);
    box.innerHTML=round.cards.map(c=>{
      const percent=total?Math.round(c.votes/total*100):0;
      return `<div class="cards-vote-row${round.special?' is-special':''}"><b>${c.letter}</b><div class="cards-vote-track"><i style="width:${percent}%"></i></div><span class="cards-vote-meta">${c.votes} VOTOS · ${percent}%</span></div>`;
    }).join('');
  }

  function cardMarkup(card){
    const classes=['game-card'];
    if(round?.special)classes.push('is-special');
    if(round?.winner===card.letter)classes.push('is-winner');
    if(round?.revealed.has(card.letter))classes.push('is-revealed');
    if(round?.state==='manual-choice'||(round?.state==='revealed'&&round?.winner!==card.letter))classes.push('is-clickable');
    const label=card.result===1?'1 PERK':`${card.result} PERKS`;
    return `<button type="button" class="${classes.join(' ')}" data-card="${card.letter}" aria-label="Carta ${card.letter}"><span class="game-card-letter">${card.letter}</span><span class="game-card-result">${label}</span></button>`;
  }

  function renderCards(){
    const stage=$('cardsStage');if(!stage||!round)return;
    stage.innerHTML=round.cards.map(cardMarkup).join('');
    stage.querySelectorAll('[data-card]').forEach(btn=>btn.addEventListener('click',()=>onCardClick(btn.dataset.card)));
    renderVoteRows();
    $('cardsEventBadge')?.classList.toggle('is-visible',!!round.special);
  }

  function configureButton(){
    const start=$('cardsStart');if(!start)return;
    start.textContent=$('cardsMode')?.value==='manual'?'GENERAR CARTAS':'INICIAR VOTACIÓN';
  }

  function resetRoundUi(){
    clearInterval(timer);timer=null;secondsLeft=30;round=makeRound();
    setState('SIN INICIAR');setTimer(30);if($('cardsTotalVotes'))$('cardsTotalVotes').textContent='0';
    if($('cardsRevealWinner'))$('cardsRevealWinner').disabled=true;
    if($('cardsNewRound'))$('cardsNewRound').disabled=true;
    if($('cardsResultBox'))$('cardsResultBox').hidden=true;
    if($('cardsRoundStatus'))$('cardsRoundStatus').textContent='';
    if($('cardsBoardStatus'))$('cardsBoardStatus').textContent='';
    renderCards();configureButton();
  }

  function startChatRound(){
    round=makeRound();round.state='active';secondsLeft=30;setState('VOTACIÓN ACTIVA');setTimer(secondsLeft);
    if($('cardsRoundStatus'))$('cardsRoundStatus').textContent='La votación se cerrará automáticamente a los 30 segundos.';
    if($('cardsRevealWinner'))$('cardsRevealWinner').disabled=true;
    if($('cardsNewRound'))$('cardsNewRound').disabled=true;
    if($('cardsResultBox'))$('cardsResultBox').hidden=true;
    renderCards();
    clearInterval(timer);
    timer=setInterval(()=>{secondsLeft-=1;setTimer(secondsLeft);if(secondsLeft<=0)finishChatRound()},1000);
  }

  function finishChatRound(){
    clearInterval(timer);timer=null;secondsLeft=0;setTimer(0);
    const max=Math.max(...round.cards.map(c=>c.votes));
    const leaders=round.cards.filter(c=>c.votes===max);
    if(max>0&&leaders.length===1){
      round.winner=leaders[0].letter;round.state='awaiting-reveal';setState('ESPERANDO REVELACIÓN');
      $('cardsRevealWinner').disabled=false;$('cardsNewRound').disabled=false;
      $('cardsBoardStatus').textContent=`Ganó la carta ${round.winner}. El resultado sigue oculto hasta que lo reveles.`;
    }else{
      round.state='tie';setState('EMPATE');$('cardsNewRound').disabled=false;
      $('cardsBoardStatus').textContent=max===0?'La ronda terminó sin votos. Podés iniciar una nueva ronda.':'La ronda terminó empatada. La repetición debe mantener estas mismas cinco cartas y reiniciar los votos.';
    }
    renderCards();
  }

  function startManualRound(){
    round=makeRound();round.state='manual-choice';setState('ELECCIÓN MANUAL');setTimer(30);
    $('cardsRevealWinner').disabled=true;$('cardsNewRound').disabled=false;$('cardsResultBox').hidden=true;
    $('cardsRoundStatus').textContent='Elegí una carta. Seleccionarla no revela el resultado automáticamente.';
    $('cardsBoardStatus').textContent='TOCÁ UNA CARTA PARA ELEGIRLA';
    renderCards();
  }

  function onCardClick(letter){
    if(!round)return;
    if(round.state==='manual-choice'){
      round.winner=letter;round.state='awaiting-reveal';setState('ESPERANDO REVELACIÓN');$('cardsRevealWinner').disabled=false;
      $('cardsBoardStatus').textContent=`Elegiste la carta ${letter}. El resultado sigue oculto.`;renderCards();return;
    }
    if(round.state==='revealed'&&round.winner!==letter){
      round.revealed.add(letter);renderCards();
    }
  }

  function revealWinner(){
    if(!round?.winner)return;
    round.revealed.add(round.winner);round.state='revealed';setState('REVELADA');renderCards();
    const winner=round.cards.find(c=>c.letter===round.winner);const count=winner?.result??0;const role=round.role==='killer'?'KILLER':'SUPERVIVIENTE';
    $('cardsOfficialResult').textContent=count===1?'1 PERK':`${count} PERKS`;$('cardsOfficialRole').textContent=role;$('cardsResultBox').hidden=false;$('cardsNewRound').disabled=false;
    const continueBtn=$('cardsContinue');
    if(count<=0){continueBtn.hidden=true;$('cardsBoardStatus').textContent='Esta partida se juega sin perks. Ahora podés revelar las otras cartas por curiosidad.'}
    else{continueBtn.hidden=false;continueBtn.textContent=`IR A PERKS DE ${role==='KILLER'?'KILLERS':'SUPERVIVIENTES'}`;$('cardsBoardStatus').textContent='Podés revelar también las otras cartas sin cambiar el resultado oficial.'}
  }

  function continueToRoulette(){
    if(!round?.winner)return;const winner=round.cards.find(c=>c.letter===round.winner);const count=winner?.result??0;if(count<=0)return;
    safeStorage.set(STORAGE_PENDING,JSON.stringify({source:'cards',role:round.role,count,createdAt:new Date().toISOString()}));
    const key=round.role==='killer'?'killerPerks':'survivor';
    if(window.SanLeanUsuarioNavigation?.show)window.SanLeanUsuarioNavigation.show(key);else location.hash=`#${key}`;
  }

  function installEvents(){
    $('cardsPlatform').value=safeStorage.get(STORAGE_PLATFORM,'twitch');
    $('cardsPlatform').addEventListener('change',()=>safeStorage.set(STORAGE_PLATFORM,$('cardsPlatform').value));
    $('cardsMode').addEventListener('change',()=>{configureButton();resetRoundUi()});
    $('cardsRole').addEventListener('change',()=>resetRoundUi());
    $('cardsStart').addEventListener('click',()=>{$('cardsMode').value==='manual'?startManualRound():startChatRound()});
    $('cardsRevealWinner').addEventListener('click',revealWinner);
    $('cardsNewRound').addEventListener('click',resetRoundUi);
    $('cardsContinue').addEventListener('click',continueToRoulette);
  }

  function install(){
    injectCss();renameSurface();
    const built=buildPanel();if(!built)return;
    installEvents();resetRoundUi();renameSurface();
    const observer=new MutationObserver(renameSurface);observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  }

  window.addEventListener('load',()=>setTimeout(install,0),{once:true});
})();
