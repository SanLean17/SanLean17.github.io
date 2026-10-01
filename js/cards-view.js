/* Shared presentation for the private CARTAS panel and its OBS source. */
(()=>{
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const safeImage=value=>/^\.\.\/(cartas\/[a-z0-9-]+\.png|rombo(?:-caotico)?\.png)$/.test(value||'')?value:'';
  const stateLabel=state=>state?.state==='preview'?'POR COMENZAR':state?.state==='active'?'VOTACIÓN':state?.state==='awaiting-reveal'?'GANADORA DEFINIDA':state?.state==='tie'?'EMPATE':state?.state==='manual-choice'?'ELECCIÓN MANUAL':state?.state==='revealed'?'RESULTADO':'CARTAS';
  const displayLabel=card=>{
    const aliases={
      survivor_totems:'BUILD DE TÓTEMS',
      killer_totems:'BUILD DE TÓTEMS',
      survivor_auras:'BUILD DE AURAS',
      killer_auras:'BUILD DE AURAS',
      killer_obsession:'BUILD DE OBSESIÓN'
    };
    return aliases[card?.resultId]||card?.label||'RESULTADO';
  };
  const captionHtml=card=>{
    const label=displayLabel(card);
    if(card?.resultId==='survivor_zero_perks_addons'||card?.resultId==='killer_zero_perks_addons')return '0 PERKS<br>0 ADDONS';
    return escape(label);
  };
  function render(target,state,{interactive=false,onChoose}={}){
    const cards=state?.cards||[];
    const signature=JSON.stringify([interactive,state?.roundId,state?.special,state?.winner,state?.state,state?.endsAt,state?.totalVotes,cards.map(c=>[c.letter,c.votes,c.revealed,c.resultId,c.label,c.image])]);
    if(target.dataset.cardsSignature===signature)return;
    target.dataset.cardsSignature=signature;
    const previous=new Set([...target.querySelectorAll('.sl-diamond.is-revealed')].map(x=>x.dataset.card));
    const base=state?.special?'../rombo-caotico.png':'../rombo.png';
    const showHud=!interactive&&state?.mode==='chat'&&['preview','active','awaiting-reveal','tie','revealed'].includes(state?.state);
    const showVoting=!interactive&&state?.mode==='chat'&&['active','awaiting-reveal','tie','revealed'].includes(state?.state);
    const deadline=Number(state?.endsAt)||0;
    const seconds=deadline&&state?.state==='active'?Math.max(0,Math.ceil((deadline-Date.now())/1000)):Math.max(0,Number(state?.secondsLeft)||0);
    const clock=`00:${String(seconds).padStart(2,'0')}`;
    const hud=showHud?`<div class="sl-cards-hud"><strong>${escape(stateLabel(state))}</strong><span class="sl-cards-clock">${state.state==='active'?clock:state.state==='preview'?'00:30':'00:00'}</span><span>${Number(state.totalVotes)||0} VOTOS</span></div>`:'';
    target.innerHTML=`<div class="sl-diamonds${state?.special?' is-chaotic':''}${interactive?' is-control-preview':''}">${hud}<div class="sl-diamond-layout">${cards.slice(0,5).map((c,i)=>{
      const letter=String(c.letter||'ABCDE'[i]),revealed=!!c.revealed;
      const clickable=interactive&&(state.state==='manual-choice'||(state.state==='revealed'&&!revealed));
      return `<${interactive?'button type="button"':'article'} class="sl-diamond${i%2?' is-upper':''}${state.winner===letter?' is-winner':''}${revealed?' is-revealed':''}${revealed&&!previous.has(letter)?' just-revealed':''}" data-card="${escape(letter)}" style="--position:${i}" ${interactive?`${clickable?'':'disabled'} aria-label="${escape(`Rombo ${letter}${revealed?`: ${displayLabel(c)}`:''}`)}"`:''}>
        <span class="sl-diamond-face"><img class="sl-diamond-base" src="${base}" alt=""><span class="sl-diamond-letter" ${revealed?'hidden':''}>${escape(letter)}</span>${revealed&&safeImage(c.image)?`<img class="sl-diamond-art" src="${escape(c.image)}" alt="">`:''}</span>
        ${revealed&&!interactive?`<span class="sl-diamond-caption"><span>${captionHtml(c)}</span></span>`:''}
      </${interactive?'button':'article'}>`;
    }).join('')}</div>${showVoting?`<div class="sl-cards-vote-panel" aria-label="Resultados de la votación">${cards.slice(0,5).map((card,index)=>{const letter=String(card.letter||'ABCDE'[index]),votes=Number(card.votes)||0,percent=Number(state.totalVotes)>0?Math.round(votes/Number(state.totalVotes)*100):0;return `<div class="sl-cards-vote-row${state.winner===letter?' is-winner':''}"><b>${escape(letter)}</b><div class="sl-cards-vote-track"><i style="width:${percent}%"></i></div><span>${votes} ${votes===1?'VOTO':'VOTOS'} · ${percent}%</span></div>`}).join('')}</div>`:''}</div>`;
    if(target._slCardsClockTimer){clearInterval(target._slCardsClockTimer);target._slCardsClockTimer=null}
    if(showVoting&&state?.state==='active'&&deadline){const updateClock=()=>{const el=target.querySelector('.sl-cards-clock');if(!el)return;const left=Math.max(0,Math.ceil((deadline-Date.now())/1000));el.textContent=`00:${String(left).padStart(2,'0')}`;if(left<=0&&target._slCardsClockTimer){clearInterval(target._slCardsClockTimer);target._slCardsClockTimer=null}};updateClock();target._slCardsClockTimer=setInterval(updateClock,200)}
    if(interactive)target.querySelectorAll('button:not(:disabled)').forEach(b=>b.addEventListener('click',()=>onChoose?.(b.dataset.card)));
  }
  window.SanLeanCardsView={render};
})();
