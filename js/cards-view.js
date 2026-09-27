/* Shared presentation for the private CARTAS panel and its OBS source. */
(()=>{
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const safeImage=value=>/^\.\.\/(cartas\/[a-z0-9-]+\.png|rombo(?:-caotico)?\.png)$/.test(value||'')?value:'';
  const stateLabel=state=>state?.state==='active'?'VOTACIÓN':state?.state==='awaiting-reveal'?'VOTACIÓN FINALIZADA':state?.state==='tie'?'EMPATE':state?.state==='manual-choice'?'ELECCIÓN MANUAL':state?.state==='revealed'?'RESULTADO':'CARTAS';
  function render(target,state,{interactive=false,onChoose}={}){
    const cards=state?.cards||[];
    const signature=JSON.stringify([interactive,state?.roundId,state?.special,state?.winner,state?.state,state?.secondsLeft,state?.totalVotes,cards.map(c=>[c.letter,c.votes,c.revealed,c.label,c.image])]);
    if(target.dataset.cardsSignature===signature)return;
    target.dataset.cardsSignature=signature;
    const previous=new Set([...target.querySelectorAll('.sl-diamond.is-revealed')].map(x=>x.dataset.card));
    const base=state?.special?'../rombo-caotico.png':'../rombo.png';
    const showVoting=!interactive&&state?.mode==='chat'&&['active','awaiting-reveal','tie','revealed'].includes(state?.state);
    const seconds=Math.max(0,Number(state?.secondsLeft)||0);
    const clock=`00:${String(seconds).padStart(2,'0')}`;
    const hud=showVoting?`<div class="sl-cards-hud"><strong>${escape(stateLabel(state))}</strong><span class="sl-cards-clock">${state.state==='active'?clock:'00:00'}</span><span>${Number(state.totalVotes)||0} VOTOS</span></div>`:'';
    target.innerHTML=`<div class="sl-diamonds${state?.special?' is-chaotic':''}${interactive?' is-control-preview':''}">${hud}<div class="sl-diamond-layout">${cards.slice(0,5).map((c,i)=>{
      const letter=String(c.letter||'ABCDE'[i]),revealed=!!c.revealed;
      const clickable=interactive&&(state.state==='manual-choice'||(state.state==='revealed'&&!revealed));
      const votes=Number(c.votes)||0;
      return `<${interactive?'button type="button"':'article'} class="sl-diamond${i%2?' is-upper':''}${state.winner===letter?' is-winner':''}${revealed?' is-revealed':''}${revealed&&!previous.has(letter)?' just-revealed':''}" data-card="${escape(letter)}" style="--position:${i}" ${interactive?`${clickable?'':'disabled'} aria-label="${escape(`Rombo ${letter}${revealed?`: ${c.label}`:''}`)}"`:''}>
        <span class="sl-diamond-face"><img class="sl-diamond-base" src="${base}" alt=""><span class="sl-diamond-letter" ${revealed?'hidden':''}>${escape(letter)}</span>${revealed&&safeImage(c.image)?`<img class="sl-diamond-art" src="${escape(c.image)}" alt="">`:''}</span>
        ${revealed&&!interactive?`<span class="sl-diamond-caption">${escape(c.label||'RESULTADO')}</span>`:''}
        ${showVoting&&!revealed?`<span class="sl-diamond-votes"><b>${votes}</b><small>${votes===1?'VOTO':'VOTOS'}</small></span>`:''}
      </${interactive?'button':'article'}>`;
    }).join('')}</div></div>`;
    if(interactive)target.querySelectorAll('button:not(:disabled)').forEach(b=>b.addEventListener('click',()=>onChoose?.(b.dataset.card)));
  }
  window.SanLeanCardsView={render};
})();
