/* Presentation shared only by USUARIO and its OBS sources. Perk motion mirrors WEB spinTrack. */
(()=>{
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const imageUrl=value=>{try{const url=new URL(value,location.href);return url.origin===location.origin&&/\.png$/i.test(url.pathname)?url.href:''}catch{return''}};
  const imageCache=new Map();
  function loadImage(src){if(!src)return Promise.resolve(null);if(imageCache.has(src))return imageCache.get(src);const promise=new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=src});imageCache.set(src,promise);return promise}
  function easeOutQuint(t){return 1-Math.pow(1-t,5)}
  function drawContain(ctx,img,x,y,w,h){if(!img)return;const ratio=img.width/img.height;let dw=w,dh=w/ratio;if(dh>h){dh=h;dw=h*ratio}ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh)}
  function itemMarkup(item,killer=false){const src=imageUrl(item?.image),empty=!item||item.emptySlot||item.key==='slot_vacio',name=item?.name||'';return `<div class="sl-roulette-frame ${killer?'is-portrait':'is-perk'}${empty?' is-empty':''}">${!empty&&src?`<img src="${escape(src)}" alt="" decoding="async">`:''}</div>${name?`<strong class="sl-roulette-name">${escape(name)}</strong>`:''}${item?.donor?`<span class="sl-roulette-donor">${escape(item.donor)}</span>`:''}`}
  async function animatePerkCanvas(canvas,pool,target,delay=0){
    if(!canvas||!target||canvas.dataset.spinning==='true')return;canvas.dataset.spinning='true';
    const usable=(pool||[]).filter(x=>x&&!x.emptySlot&&x.key!=='slot_vacio'&&imageUrl(x.image));
    const sequence=[];for(let i=0;i<36;i++)sequence.push(usable[Math.floor(Math.random()*usable.length)]||target);sequence.push(target);
    await Promise.all(sequence.filter(x=>!x.emptySlot).map(x=>loadImage(imageUrl(x.image))));if(delay)await new Promise(r=>setTimeout(r,delay));if(!canvas.isConnected)return;
    const ctx=canvas.getContext('2d');if(!ctx)return;const cssWidth=canvas.clientWidth||180,cssHeight=canvas.clientHeight||176,dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(cssWidth*dpr);canvas.height=Math.round(cssHeight*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    const end=sequence.length-1,startTime=performance.now(),duration=3000;
    function frame(now){
      if(!canvas.isConnected)return;const progress=Math.min(1,(now-startTime)/duration),position=end*easeOutQuint(progress);ctx.clearRect(0,0,cssWidth,cssHeight);const first=Math.floor(position)-2;
      for(let i=first;i<=first+6;i++){if(i<0||i>=sequence.length)continue;const item=sequence[i];if(item.emptySlot)continue;const promise=imageCache.get(imageUrl(item.image));if(promise)promise.then(img=>{if(canvas.dataset.spinning==='true'&&canvas.isConnected){const y=(i-position)*cssHeight;ctx.clearRect(0,y,cssWidth,cssHeight);drawContain(ctx,img,0,y,cssWidth,cssHeight)}})}
      if(progress>=1){ctx.clearRect(0,0,cssWidth,cssHeight);if(!target.emptySlot){const p=imageCache.get(imageUrl(target.image));if(p)p.then(img=>{if(canvas.isConnected){ctx.clearRect(0,0,cssWidth,cssHeight);drawContain(ctx,img,0,0,cssWidth,cssHeight)}})}canvas.dataset.spinning='false';return}requestAnimationFrame(frame)
    }requestAnimationFrame(frame)
  }
  function render(target,data,{preview=false}={}){
    const state=data?.state||{},killer=data?.kind==='roulette_killers',perkRoulette=!killer,pool=data?.settings?.pool||[],spinning=state.status==='spinning',items=state.items||[],targets=state.targets||[],chaotic=state.cardRule?.event==='chaotic';
    const signature=JSON.stringify([data.kind,state.status,state.visible,state.spinId,items.map(x=>x?.key),targets.map(x=>x?.key),state.activeSlots,state.cardRule?.resultId,state.cardRule?.event,pool.map(x=>x.key)]);if(target.dataset.rouletteSignature===signature)return;target.dataset.rouletteSignature=signature;if(!preview&&state.visible===false){target.innerHTML='';return}
    const slots=killer?1:4,active=spinning?(state.activeSlots||Array.from({length:slots},(_,i)=>i)):[];
    target.innerHTML=`<div class="sl-roulette${killer?' is-killers':''}${spinning?' is-spinning':''}${chaotic?' is-chaotic':''}"><div class="sl-roulette-slots">${Array.from({length:slots},(_,i)=>{
      if(spinning&&perkRoulette&&active.includes(i))return `<article class="sl-roulette-slot is-rolling"><div class="sl-roulette-roll-shell"><canvas class="sl-roulette-canvas" data-slot="${i}"></canvas></div></article>`;
      if(spinning&&killer&&active.includes(i)){const samples=pool.slice(0,24);return `<article class="sl-roulette-slot is-rolling"><div class="sl-roulette-window"><div class="sl-roulette-strip" style="--delay:-${i*.13}s">${[...samples,...samples.slice(0,1)].map(item=>`<div class="sl-roulette-sample">${itemMarkup(item,true)}</div>`).join('')}</div></div></article>`}
      const item=items[i]||null;return `<article class="sl-roulette-slot${item?.donor?' has-donor':''}${!item?' is-inactive':''}">${itemMarkup(item,killer)}</article>`}).join('')}</div></div>`;
    if(spinning&&perkRoulette)target.querySelectorAll('.sl-roulette-canvas').forEach(canvas=>{const i=Number(canvas.dataset.slot),targetItem=targets[i];if(targetItem)animatePerkCanvas(canvas,pool,targetItem,i*140)})
  }
  window.SanLeanRouletteView={render};
})();
