/* Shared presentation for the private CARTAS panel and its OBS source. */
(()=>{
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeImage=value=>/^\.\.\/(cartas\/[a-z0-9-]+\.png|rombo(?:-caotico)?\.png)$/.test(value||'')?value:'';
  function render(target,state,{interactive=false,onChoose}={}){
    const cards=state?.cards||[];
    const signature=JSON.stringify([state?.roundId,state?.special,state?.winner,state?.state,cards.map(c=>[c.letter,c.revealed,c.label,c.image])]);
    if(target.dataset.cardsSignature===signature)return;
    target.dataset.cardsSignature=signature;
    const previous=new Set([...target.querySelectorAll('.sl-diamond.is-revealed')].map(x=>x.dataset.card));
    const base=state?.special?'../rombo-caotico.png':'../rombo.png';
    target.innerHTML=`<div class="sl-diamonds${state?.special?' is-chaotic':''}"><div class="sl-diamond-layout">${cards.slice(0,5).map((c,i)=>{
      const letter=String(c.letter||'ABCDE'[i]),revealed=!!c.revealed;
      const clickable=interactive&&(state.state==='manual-choice'||(state.state==='revealed'&&!revealed));
      return `<${interactive?'button type="button"':'article'} class="sl-diamond${i%2?' is-upper':''}${state.winner===letter?' is-winner':''}${revealed?' is-revealed':''}${revealed&&!previous.has(letter)?' just-revealed':''}" data-card="${escape(letter)}" style="--position:${i}" ${interactive?`${clickable?'':'disabled'} aria-label="${escape(`Rombo ${letter}${revealed?`: ${c.label}`:''}`)}"`:''}>
        <span class="sl-diamond-face"><img class="sl-diamond-base" src="${base}" alt=""><span class="sl-diamond-letter" ${revealed?'hidden':''}>${escape(letter)}</span>${revealed&&safeImage(c.image)?`<img class="sl-diamond-art" src="${escape(c.image)}" alt="">`:''}</span>
        ${revealed?`<span class="sl-diamond-caption">${escape(c.label||'RESULTADO')}</span>`:''}
      </${interactive?'button':'article'}>`;
    }).join('')}</div></div>`;
    if(interactive)target.querySelectorAll('button:not(:disabled)').forEach(b=>b.addEventListener('click',()=>onChoose?.(b.dataset.card)));
  }
  window.SanLeanCardsView={render};
})();
