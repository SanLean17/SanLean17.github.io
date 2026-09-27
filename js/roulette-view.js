/* Presentation shared only by USUARIO and its OBS sources. */
(()=>{
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const imageUrl=value=>{try{const url=new URL(value,location.href);return url.origin===location.origin&&/\.png$/i.test(url.pathname)?url.href:''}catch{return''}};
  function itemMarkup(item,killer=false){
    const src=imageUrl(item?.image),empty=!item||item.emptySlot||item.key==='slot_vacio';
    return `<div class="sl-roulette-frame ${killer?'is-portrait':'is-perk'}${empty?' is-empty':''}">${!empty&&src?`<img src="${escape(src)}" alt="" decoding="async">`:''}</div><strong class="sl-roulette-name">${escape(item?.name||(killer?'KILLER':'SLOT VACÍO'))}</strong>${item?.donor?`<span class="sl-roulette-donor">${escape(item.donor)}</span>`:''}`;
  }
  function render(target,data,{preview=false}={}){
    const state=data?.state||{},killer=data?.kind==='roulette_killers',pool=data?.settings?.pool||[];
    const signature=JSON.stringify([data.kind,state,pool.map(x=>x.key)]);
    if(target.dataset.rouletteSignature===signature)return;
    target.dataset.rouletteSignature=signature;
    const spinning=state.status==='spinning',items=state.items||[];
    if(!preview&&(state.visible===false||state.status==='idle')){target.innerHTML='';return}
    const slots=killer?1:4,active=spinning?(state.activeSlots||Array.from({length:slots},(_,i)=>i)):[];
    const caption=state.cardRule?.label||(spinning?'GIRANDO…':items.length?'RESULTADO':preview?'LISTA PARA GIRAR':'');
    target.innerHTML=`<div class="sl-roulette${killer?' is-killers':''}${spinning?' is-spinning':''}${state.cardRule?.event==='chaotic'?' is-chaotic':''}"><div class="sl-roulette-slots">${Array.from({length:slots},(_,i)=>{
      if(spinning&&active.includes(i)){
        const samples=pool.filter(x=>!state.cardRule||!x.emptySlot).slice(0,24);
        return `<article class="sl-roulette-slot is-rolling"><div class="sl-roulette-window"><div class="sl-roulette-strip" style="--delay:-${i*.13}s">${[...samples,...samples.slice(0,1)].map(item=>`<div class="sl-roulette-sample">${itemMarkup(item,killer)}</div>`).join('')}</div></div></article>`;
      }
      const item=items[i]||null;
      return `<article class="sl-roulette-slot${item?.donor?' has-donor':''}${!item?' is-inactive':''}">${itemMarkup(item,killer)}</article>`;
    }).join('')}</div>${caption?`<p class="sl-roulette-caption">${escape(caption)}</p>`:''}</div>`;
  }
  window.SanLeanRouletteView={render};
})();
