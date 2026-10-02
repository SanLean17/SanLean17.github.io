/* SANLEAN — vista compartida de DESAFÍOS > METAS para USUARIO y OBS. */
(()=>{
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

  function detectSpecial(title){
    const t=norm(title);
    const compact=t.replace(/[^a-z0-9]+/g,'');
    const has=(...terms)=>terms.some(term=>t.includes(term)||compact.includes(term.replace(/[^a-z0-9]+/g,'')));

    if(has('de frente','defrente','head on','headon'))return'de-frente';
    if(has('me la pela','melapela','me-la-pela','me_la_pela','no mither','nomither'))return'me-la-pela';
    if(has('escotilla','trampilla','trampiya','trampia','hatch'))return'escotilla';
    if(has('salvada','salvadas','salvar','rescate','rescates','linterna','flashlight','pallet','palet','palette'))return'salvada';
    if(has('puntos de sangre','punto de sangre','puntos sangre','bloodpoint','blood point','bloodpoints')||/(^|\s)bp(\s|$)/.test(t))return'puntos-de-sangre';
    if(has('motor','motores','generador','generadores','generator','generators')||/(^|\s)gens?(\s|$)/.test(t))return'motores';
    if(has('random','randoms','aleatorio','aleatoria','aleatorios','aleatorias','ruleta'))return'randoms';
    if(has('escape','escapes','escapar','escaped'))return'escapes';
    return'';
  }

  function iconKeys(title,role){
    const special=detectSpecial(title);
    if(special)return[special];
    if(role==='both')return['killers','escapes'];
    return[role==='survivor'?'escapes':'killers'];
  }

  function normalized(data){
    const settings=data?.settings||{},state=data?.state||{};
    const role=['killer','survivor','both'].includes(state.role)?state.role:(['killer','survivor','both'].includes(settings.role)?settings.role:'killer');
    const current=Math.max(0,Number(state.current)||0);
    const target=Math.max(1,Number(state.target??settings.target)||10);
    const title=String(state.title||settings.title||'META').trim()||'META';
    return{role,current,target,title,status:state.status||'idle',visible:state.visible!==false,icons:iconKeys(title,role)};
  }

  function icon(key,side){
    return `<span class="sl-goal-icon sl-goal-icon-${side}" data-icon="${escape(key)}"><img src="../assets/usuario/desafios/metas/${escape(key)}.png" alt="" decoding="async"><b>•</b></span>`;
  }

  function render(target,data,{preview=false}={}){
    if(!target)return;
    const v=normalized(data);
    const signature=JSON.stringify([v,preview,data?.overlayId||data?.id,data?.state?.startedAt]);
    // Repeated panel refreshes must not restart the reached animation.
    if(target._goalRenderSignature===signature&&target.querySelector('.sl-goal-view'))return;
    target._goalResizeObserver?.disconnect();target._goalRenderSignature=signature;
    if(!preview&&(!v.visible||!['active','reached'].includes(v.status))){target.innerHTML='';return}
    const reached=v.current>=v.target&&['active','reached'].includes(v.status);
    const left=v.icons[0],right=v.icons[1]||'';
    target.innerHTML=`<div class="sl-goal-view${preview?' is-preview':''}${reached?' is-reached':''}">
      <strong class="sl-goal-title">${escape(v.title)}</strong>
      <div class="sl-goal-main">
        ${icon(left,'left')}
        <div class="sl-goal-counter" aria-label="${v.current} de ${v.target}"><span>${v.current}</span><i>/</i><b>${v.target}</b></div>
        ${right?icon(right,'right'):''}
      </div>
    </div>`;
    target.querySelectorAll('.sl-goal-icon img').forEach(img=>img.addEventListener('error',()=>{img.hidden=true;img.parentElement.classList.add('is-missing')},{once:true}));
    // Scale the whole row only when needed; both numbers keep identical typography.
    const view=target.querySelector('.sl-goal-view'),main=target.querySelector('.sl-goal-main');
    const fit=()=>{if(!view.isConnected||!view.clientWidth)return;main.style.zoom='';const css=getComputedStyle(view),available=view.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight);if(main.offsetWidth>available)main.style.zoom=String(available/main.offsetWidth);
      // Size the background to all visible content, including the title, not just the counter.
      const title=view.querySelector('.sl-goal-title'),range=document.createRange();range.selectNodeContents(title);
      const scale=view.getBoundingClientRect().width/view.offsetWidth||1,zoom=Number(main.style.zoom)||1;
      view.style.setProperty('--goal-aura-width',Math.min(available,Math.max(range.getBoundingClientRect().width/scale,main.offsetWidth*zoom))+'px');
      view.style.setProperty('--goal-aura-height',title.offsetHeight+main.offsetHeight*zoom+parseFloat(css.paddingTop)*2+'px');
    };
    fit();document.fonts?.ready.then(fit);target._goalResizeObserver=new ResizeObserver(fit);target._goalResizeObserver.observe(view);
  }

  window.SanLeanChallengeGoalView={render,normalized,iconKeys,detectSpecial};
})();