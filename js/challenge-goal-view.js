/* SANLEAN — vista compartida de DESAFÍOS > METAS para USUARIO y OBS. */
(()=>{
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

  function iconKeys(title,role){
    const t=norm(title);
    if(t.includes('de frente'))return['de-frente'];
    if(t.includes('escotilla')||t.includes('hatch'))return['escotilla'];
    if(t.includes('me la pela')||t.includes('no mither'))return['me-la-pela'];
    if((t.includes('punto')&&t.includes('sangre'))||t.includes('bloodpoint'))return['puntos-de-sangre'];
    if(t.includes('motor')||t.includes('generador'))return['motores'];
    if(t.includes('salvad'))return['salvada'];
    if(t.includes('random')||t.includes('aleatori'))return['randoms'];
    if(t.includes('escape'))return['escapes'];
    if(role==='both')return['killers','superviviente'];
    if(role==='survivor')return['superviviente'];
    return['killers'];
  }

  function normalized(data){
    const settings=data?.settings||{},state=data?.state||{};
    const role=['killer','survivor','both'].includes(state.role)?state.role:(['killer','survivor','both'].includes(settings.role)?settings.role:'killer');
    const current=Math.max(0,Number(state.current)||0);
    const target=Math.max(1,Number(state.target??settings.target)||10);
    const title=String(state.title||settings.title||'META').trim()||'META';
    const reached=current>=target;
    return{role,current,target,title,reached,status:state.status||'idle',visible:state.visible!==false,icons:iconKeys(title,role)};
  }

  function iconMarkup(keys){
    return `<div class="sl-goal-icons ${keys.length>1?'is-double':''}">${keys.map(key=>`<span class="sl-goal-icon" data-icon="${escape(key)}"><img src="../assets/usuario/desafios/metas/${escape(key)}.png" alt="" onerror="this.hidden=true;this.parentElement.classList.add('is-missing')"><b>${key==='killers'?'K':key==='superviviente'?'S':'•'}</b></span>`).join('')}</div>`;
  }

  function roleLabel(role){return role==='both'?'KILLER + SUPERVIVIENTE':role==='survivor'?'SUPERVIVIENTE':'KILLER'}

  function render(target,data,{preview=false}={}){
    if(!target)return;
    const v=normalized(data);
    if(!preview&&(!v.visible||!['active','reached'].includes(v.status))){target.innerHTML='';return}
    target.innerHTML=`<div class="sl-goal-view${preview?' is-preview':''}${v.reached?' is-reached':''}">
      ${iconMarkup(v.icons)}
      <div class="sl-goal-copy">
        <span class="sl-goal-kicker">${escape(roleLabel(v.role))}</span>
        <strong class="sl-goal-title">${escape(v.title)}</strong>
      </div>
      <div class="sl-goal-counter" aria-label="${v.current} de ${v.target}">
        <span>${v.current}</span><i>/</i><b>${v.target}</b>
      </div>
    </div>`;
  }

  window.SanLeanChallengeGoalView={render,normalized,iconKeys};
})();