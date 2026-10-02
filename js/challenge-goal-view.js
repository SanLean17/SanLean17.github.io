/* SANLEAN — vista compartida de DESAFÍOS > METAS para USUARIO y OBS. */
(()=>{
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function normalized(data){
    const settings=data?.settings||{},state=data?.state||{};
    const role=state.role||settings.role||'killer';
    const current=Math.max(0,Number(state.current)||0);
    const target=Math.max(1,Number(state.target??settings.target)||10);
    const consecutive=state.consecutive??settings.consecutive??true;
    const title=state.title||settings.title||(role==='survivor'?'ESCAPES SEGUIDOS':'VICTORIAS SEGUIDAS');
    const metric=role==='survivor'?'ESCAPES':'VICTORIAS';
    const reached=current>=target;
    return{role,current,target,consecutive,title,metric,reached,status:state.status||'idle',visible:state.visible!==false};
  }
  function render(target,data,{preview=false}={}){
    if(!target)return;
    const v=normalized(data);
    if(!preview&&(!v.visible||!['active','reached'].includes(v.status))){target.innerHTML='';return}
    const mode=v.consecutive?'CONSECUTIVAS':'ACUMULATIVAS';
    target.innerHTML=`<div class="sl-goal-view${preview?' is-preview':''}${v.reached?' is-reached':''}">
      <div class="sl-goal-copy">
        <span class="sl-goal-kicker">${escape(v.metric)} · ${mode}</span>
        <strong class="sl-goal-title">${escape(v.title)}</strong>
      </div>
      <div class="sl-goal-counter" aria-label="${v.current} de ${v.target}">
        <span>${v.current}</span><i>/</i><b>${v.target}</b>
      </div>
    </div>`;
  }
  window.SanLeanChallengeGoalView={render,normalized};
})();