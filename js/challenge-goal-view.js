/* SANLEAN — vista compartida de DESAFÍOS > METAS para USUARIO y OBS. */
(()=>{
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

  function detectSpecial(title){
    const t=norm(title);
    const compact=t.replace(/[^a-z0-9]+/g,'');
    const has=(...terms)=>terms.some(term=>t.includes(term)||compact.includes(term.replace(/[^a-z0-9]+/g,'')));

    if(has('de frente','defrente','head on','headon'))return'de-frente';
    if(has('escotilla','trampilla','trampiya','trampia','hatch'))return'escotilla';
    if(has('me la pela','melapela','me-la-pela','me_la_pela','no mither','nomither'))return'me-la-pela';
    if(has('puntos de sangre','punto de sangre','puntos sangre','bloodpoint','blood point','bloodpoints')||/(^|\s)bp(\s|$)/.test(t))return'puntos-de-sangre';
    if(has('motor','motores','generador','generadores','generator','generators')||/(^|\s)gens?(\s|$)/.test(t))return'motores';
    if(has('salvada','salvadas','salvar','rescate','rescates','linterna','flashlight','pallet','palet','palette'))return'salvada';
    if(has('random','randoms','aleatorio','aleatoria','aleatorios','aleatorias','ruleta'))return'randoms';
    if(has('escape','escapes','escapar','escaped'))return'escapes';
    return'';
  }

  function iconKeys(title,role){
    const special=detectSpecial(title);
    if(role==='both'){
      if(special&&special!=='killers')return['killers',special];
      return['killers','escapes'];
    }
    if(special)return[special];
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
    if(!preview&&(!v.visible||!['active','reached'].includes(v.status))){target.innerHTML='';return}
    const left=v.icons[0],right=v.icons[1]||'';
    target.innerHTML=`<div class="sl-goal-view${preview?' is-preview':''}">
      <strong class="sl-goal-title">${escape(v.title)}</strong>
      <div class="sl-goal-main">
        ${icon(left,'left')}
        <div class="sl-goal-counter" aria-label="${v.current} de ${v.target}"><span>${v.current}</span><i>/</i><b>${v.target}</b></div>
        ${right?icon(right,'right'):'<span class="sl-goal-icon-spacer" aria-hidden="true"></span>'}
      </div>
    </div>`;
    target.querySelectorAll('.sl-goal-icon img').forEach(img=>img.addEventListener('error',()=>{img.hidden=true;img.parentElement.classList.add('is-missing')},{once:true}));
  }

  window.SanLeanChallengeGoalView={render,normalized,iconKeys,detectSpecial};
})();