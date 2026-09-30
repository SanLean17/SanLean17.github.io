/* Presentation shared only by USUARIO and its OBS sources. Killer reel mirrors the operative WEB implementation. */
(()=>{
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const imageUrl=value=>{try{const url=new URL(value,location.href);if(url.origin!==location.origin||! /\.png$/i.test(url.pathname))return '';const optimized=window.SanLeanRouletteImageAssets?.[url.pathname];return optimized?new URL(optimized,url.origin).href:url.href}catch{return''}};
  const imageCache=new Map();
  const preload=pool=>Promise.all([...new Set((pool||[]).map(x=>imageUrl(x.image)).filter(Boolean))].map(loadImage));
  function originalImage(src){try{const url=new URL(src,location.href);return url.origin===location.origin&&url.pathname.startsWith('/assets/roulette-private/')&&url.pathname.endsWith('.webp')?url.origin+url.pathname.replace('/assets/roulette-private/','/').replace(/\.webp$/,'.png'):''}catch{return ''}}
  function loadImage(src){
    if(!src)return Promise.resolve(null);
    if(imageCache.has(src))return imageCache.get(src);
    const promise=new Promise(resolve=>{
      const img=new Image();img.decoding='async';
      const timer=setTimeout(()=>finish(null),15000);
      let finished=false;
      function finish(value){if(finished)return;finished=true;clearTimeout(timer);if(!value)imageCache.delete(src);resolve(value)}
      img.onload=async()=>{if(img.decode)await img.decode().catch(()=>{});finish(img)};
      img.onerror=()=>{const fallback=originalImage(img.src);if(fallback)img.src=fallback;else finish(null)};
      img.src=src;
    });
    imageCache.set(src,promise);return promise;
  }
  function easeOutQuint(t){return 1-Math.pow(1-t,5)}
  function drawPerk(ctx,img,x,y,w,h){if(!img)return;const pad=w*.08,boxW=w-pad*2,boxH=h-pad*2,ratio=img.width/img.height;let dw=boxW,dh=boxW/ratio;if(dh>boxH){dh=boxH;dw=boxH*ratio}ctx.drawImage(img,x+pad+(boxW-dw)/2,y+pad+(boxH-dh)/2,dw,dh)}
  function itemMarkup(item){const src=imageUrl(item?.image),empty=!item||item.emptySlot||item.key==='slot_vacio',name=item?.name||'',longName=name.length>14;return `${item?.donor?`<span class="sl-roulette-donor${longName?' is-long-name':''}">${escape(item.donor)}</span>`:''}<div class="sl-roulette-frame is-perk${empty?' is-empty':''}">${!empty&&src?`<img src="${escape(src)}" alt="" decoding="async">`:''}</div>${name?`<strong class="sl-roulette-name${longName?' is-long-name':''}">${escape(name)}</strong>`:''}`}
  async function animatePerkCanvas(canvas,pool,target,delay=0,elapsed=0){if(!canvas||!target||canvas.dataset.spinning==='true')return;canvas.dataset.spinning='true';const usable=(pool||[]).filter(x=>x&&!x.emptySlot&&x.key!=='slot_vacio'&&imageUrl(x.image)),sequence=[];for(let i=0;i<36;i++)sequence.push(usable[Math.floor(Math.random()*usable.length)]||target);sequence.push(target);const sources=[...new Set(sequence.filter(x=>!x.emptySlot).map(x=>imageUrl(x.image)))],decoded=new Map(await Promise.all(sources.map(async src=>[src,await loadImage(src)])));const remainingDelay=Math.max(0,delay-elapsed);if(remainingDelay)await new Promise(r=>setTimeout(r,remainingDelay));if(!canvas.isConnected)return;const ctx=canvas.getContext('2d');if(!ctx)return;const cssWidth=canvas.clientWidth||180,cssHeight=canvas.clientHeight||180,dpr=canvas.closest('.obs-stage')?3:2;canvas.width=Math.round(cssWidth*dpr);canvas.height=Math.round(cssHeight*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';const end=sequence.length-1,duration=3000,effectiveElapsed=Math.max(0,elapsed-delay),startTime=performance.now()-Math.min(duration,effectiveElapsed);function frame(now){if(!canvas.isConnected)return;const progress=Math.min(1,(now-startTime)/duration),position=end*easeOutQuint(progress);ctx.clearRect(0,0,cssWidth,cssHeight);const first=Math.floor(position)-2;for(let i=first;i<=first+6;i++){if(i<0||i>=sequence.length)continue;const item=sequence[i];if(item.emptySlot)continue;drawPerk(ctx,decoded.get(imageUrl(item.image)),0,(i-position)*cssHeight,cssWidth,cssHeight)}if(progress>=1){ctx.clearRect(0,0,cssWidth,cssHeight);drawPerk(ctx,decoded.get(imageUrl(target.image)),0,0,cssWidth,cssHeight);canvas.dataset.spinning='false';return}requestAnimationFrame(frame)}requestAnimationFrame(frame)}

  function killerEntries(pool){const out=[];(pool||[]).forEach(k=>{if(!k?.image||Number(k.weight)<=0)return;const donors=Array.isArray(k.donors)?k.donors.filter(Boolean):[];out.push({killer:k,donor:null,id:k.key+':base'});donors.forEach((d,i)=>out.push({killer:k,donor:d,id:k.key+':donor:'+i}));for(let i=0;i<Math.max(0,Math.floor(Number(k.weight)||1)-1-donors.length);i++)out.push({killer:k,donor:null,id:k.key+':extra:'+i})});return out}
  function noAdjacent(source,previous=null){const pool=[...source],out=[];let prev=previous;while(pool.length){const choices=[];for(let i=0;i<pool.length;i++)if(pool[i].killer.key!==prev)choices.push(i);const pick=choices.length?choices[Math.floor(Math.random()*choices.length)]:Math.floor(Math.random()*pool.length),e=pool.splice(pick,1)[0];out.push(e);prev=e.killer.key}return out}
  function longDeck(entries,min){if(!entries.length)return [];const out=[];let prev=null;while(out.length<min){const batch=noAdjacent(entries,prev);out.push(...batch);prev=out.length?out[out.length-1].killer.key:null}return out.slice(0,Math.max(min,entries.length*8))}
  // The WEB noAdjacent/longDeck functions above are copied from main.js.
  // OBS receives its winner from USUARIO. Repair only the visual deck after
  // pinning that winner; never reroll the outcome or change owner weights.
  function prepareKillerDeck(entries,min,index,winner=null){
    if(!entries.length)return [];
    const unique=new Set(entries.map(e=>e.killer.key));
    const replacement=winner?{killer:winner,donor:winner.donor||null,id:winner.key+':winner'}:null;
    if(unique.size===1)return [replacement||entries[0]];
    const deck=longDeck(entries,min);
    if(replacement)deck[index]=replacement;
    // Walk away from the pinned center so neither neighbor can repeat it.
    // The public greedy shuffle can also exhaust its alternatives with weights.
    for(const direction of [-1,1]){
      for(let i=index+direction;i>=0&&i<deck.length;i+=direction){
        const previous=deck[i-direction].killer.key;
        if(deck[i].killer.key!==previous)continue;
        const candidates=entries.filter(e=>e.killer.key!==previous);
        deck[i]=candidates[Math.floor(Math.random()*candidates.length)];
      }
    }
    return deck;
  }
  function killerCard(entry){const c=document.createElement('div');c.className='sl-killer-card'+(entry.donor?' donated':'');c.dataset.key=entry.killer.key;c.dataset.entryId=entry.id||entry.killer.key;const frame=document.createElement('img');frame.className='sl-killer-card-frame';frame.src='../rectangulo-fondo.png';frame.alt='';const img=document.createElement('img');img.className='sl-killer-card-portrait';img.src=imageUrl(entry.killer.image);img.alt=entry.killer.name||'';img.draggable=false;img.decoding='async';img.loading='eager';const name=document.createElement('div');name.className='sl-killer-card-name';name.textContent=entry.killer.name==='Jason (El Destripador)'?'Jason':entry.killer.name;c.append(frame,img,name);if(entry.donor){const d=document.createElement('div');d.className='sl-killer-card-donor';d.textContent=entry.donor;d.style.setProperty('--sl-donor-font',Math.max(12,Math.min(25,300/String(entry.donor).length))+'px');c.appendChild(d)}return c}
  function killerOffset(track,index){const first=track.firstElementChild,width=first?parseFloat(getComputedStyle(first).width):196,gap=parseFloat(getComputedStyle(track).columnGap)||0;return -(index*(width+gap)+width/2)}
  function centerKiller(track,index){track.getAnimations().forEach(a=>a.cancel());track.style.transition='none';track.style.transform=`translate3d(${killerOffset(track,index)}px,-50%,0)`}
  function renderKillerDeck(track,deck){track.replaceChildren(...deck.map(killerCard))}
  function staticKiller(track,pool,winner=null){const entries=killerEntries(pool);if(!entries.length){track.replaceChildren();return}const deck=prepareKillerDeck(entries,Math.max(18,entries.length*3),6,winner),index=deck.length===1?0:6;renderKillerDeck(track,deck);centerKiller(track,index);track.dataset.centerIndex=index;if(winner&&track.children[index])track.children[index].classList.add('selected')}
  function spinKiller(target,track,pool,winner,spinId,duration=8000,elapsed=0){const entries=killerEntries(pool);if(new Set(entries.map(e=>e.killer.key)).size<2||!winner){staticKiller(track,pool,winner);return}const min=Math.max(100,entries.length*10),start=5,targetIndex=min-7,deck=prepareKillerDeck(entries,min,targetIndex,winner);renderKillerDeck(track,deck);const sx=killerOffset(track,start),ex=killerOffset(track,targetIndex);track.dataset.centerIndex=targetIndex;track.style.transition='none';track.style.transform=`translate3d(${sx}px,-50%,0)`;track.getBoundingClientRect();const anim=track.animate([{transform:`translate3d(${sx}px,-50%,0)`,offset:0},{transform:`translate3d(${sx+(ex-sx)*.72}px,-50%,0)`,offset:.60},{transform:`translate3d(${sx+(ex-sx)*.92}px,-50%,0)`,offset:.84},{transform:`translate3d(${ex}px,-50%,0)`,offset:1}],{duration,easing:'cubic-bezier(.12,.72,.16,1)',fill:'forwards'});if(elapsed>0)try{anim.currentTime=Math.min(Math.max(0,elapsed),Math.max(0,duration-1))}catch{}target._slKillerSpin={spinId,anim,track,targetIndex,ex,winner};anim.finished.then(()=>{if(!track.isConnected)return;track.style.transform=`translate3d(${ex}px,-50%,0)`;anim.cancel();const card=track.children[targetIndex];if(card)card.classList.add('selected');if(target._slKillerSpin?.spinId===spinId)target._slKillerSpin.finished=true}).catch(()=>{})}
  function observeKillerSize(target,track){
    target._slKillerResize?.disconnect();
    const fit=()=>{
      if(!track.isConnected)return;
      if(target.closest('.obs-stage')){
        const reel=target.querySelector('.sl-killer-web');
        reel.style.zoom=Math.min(1,target.clientWidth/1180,target.clientHeight/370);
      }else if(!track.getAnimations().length){centerKiller(track,Number(track.dataset.centerIndex)||0)}
    };
    target._slKillerResize=new ResizeObserver(fit);target._slKillerResize.observe(target);fit();
  }
  function paintKiller(target,data){target._slKillerSpin?.anim?.cancel();const state=data?.state||{},pool=state.spinPool||data?.settings?.pool||[],winner=(state.targets||[])[0]||(state.items||[])[0]||null;target.innerHTML='<div class="sl-killer-web"><div class="sl-killer-web-reel"><div class="sl-killer-track"></div><div class="sl-killer-edge sl-killer-edge-left"></div><div class="sl-killer-edge sl-killer-edge-right"></div><div class="sl-killer-marker sl-killer-marker-top"></div><div class="sl-killer-marker sl-killer-marker-bottom"></div></div></div>';preload(pool);const track=target.querySelector('.sl-killer-track');observeKillerSize(target,track);if(state.status==='spinning'){const started=Date.parse(state.startedAt||'');const elapsed=Number.isFinite(started)?Math.max(0,Date.now()-started):0;spinKiller(target,track,pool,winner,state.spinId||'',Number(state.durationMs)||8000,elapsed)}else staticKiller(track,pool,state.status==='result'?winner:null)}

  function paintPerks(target,data){const state=data?.state||{},pool=data?.settings?.pool||[],spinning=state.status==='spinning',result=state.status==='result',items=state.items||[],targets=state.targets||[],chaotic=state.cardRule?.event==='chaotic',slots=4,active=spinning?(state.activeSlots||[0,1,2,3]):[];target.innerHTML=`<div class="sl-roulette${spinning?' is-spinning':''}${result?' is-result':''}${chaotic?' is-chaotic':''}"><div class="sl-roulette-slots">${Array.from({length:slots},(_,i)=>{if(spinning){const fixed=items[i]||null;if(active.includes(i))return `<article class="sl-roulette-slot is-rolling"><div class="sl-roulette-roll-shell"><canvas class="sl-roulette-canvas" data-slot="${i}"></canvas></div><div class="sl-roulette-label-space"></div></article>`;return `<article class="sl-roulette-slot${fixed?' is-result-slot':''}${!fixed?' is-inactive':''}">${itemMarkup(fixed)}</article>`}const item=items[i]||null;return `<article class="sl-roulette-slot${result&&item?' is-result-slot':''}${item?.donor?' has-donor':''}${!item?' is-inactive':''}">${itemMarkup(item)}</article>`}).join('')}</div></div>`;if(spinning){const started=Date.parse(state.startedAt||'');const elapsed=Number.isFinite(started)?Math.max(0,Date.now()-started):0;target.querySelectorAll('.sl-roulette-canvas').forEach(canvas=>{const i=Number(canvas.dataset.slot),targetItem=targets[i];if(targetItem)animatePerkCanvas(canvas,pool,targetItem,i*140,elapsed)})}}
  function render(target,data,{preview=false}={}){if(!target._slImageFallback){target._slImageFallback=true;target.addEventListener('error',event=>{const img=event.target;if(img.tagName==='IMG'){const fallback=originalImage(img.src);if(fallback)img.src=fallback}},true);}const state=data?.state||{},killer=data?.kind==='roulette_killers',items=state.items||[],targets=state.targets||[],pool=state.spinPool||data?.settings?.pool||[],signature=JSON.stringify([data.kind,state.status,state.visible,state.spinId,items.map(x=>x?.key),targets.map(x=>x?.key),state.activeSlots,state.cardRule?.resultId,state.cardRule?.event,pool.map(x=>[x.key,x.weight,x.donors]),items.map(x=>x?.donor),targets.map(x=>x?.donor)]);if(!preview&&state.visible===false){target.dataset.rouletteSignature=signature;target.innerHTML='';target._slKillerResize?.disconnect();target._slKillerSpin=null;return}if(killer&&state.status==='result'&&state.spinId&&target._slKillerSpin?.spinId===state.spinId){target.dataset.rouletteSignature=signature;return}if(target.dataset.rouletteSignature===signature)return;target.dataset.rouletteSignature=signature;killer?paintKiller(target,data):paintPerks(target,data)}
  window.SanLeanRouletteView={render,preload};
})();
