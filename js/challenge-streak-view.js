/* SANLEAN — DESAFÍOS > WIN STREAK compartido entre USUARIO y OBS. */
(()=>{
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function normalized(data){
    const s=data?.state||{},settings=data?.settings||{};
    const role=s.role||settings.role||'survivor';
    const current=Math.max(0,Number(s.current)||0);
    const killer=s.killer||settings.killer||null;
    const layout=(s.layout||settings.layout)==='image-right'?'image-right':'image-left';
    return{role,current,killer,layout,status:s.status||'idle',visible:s.visible!==false};
  }
  function render(target,data,{preview=false}={}){
    if(!target)return;
    const v=normalized(data);
    if(!preview&&(!v.visible||v.status!=='active')){target.innerHTML='';return}
    const image=v.role==='killer'&&v.killer?.image?escape(v.killer.image):'../assets/usuario/desafios/metas/escapes.png';
    const alt=v.role==='killer'?(v.killer?.name||'Killer'):'Superviviente';
    target.innerHTML=`<div class="sl-streak-view${preview?' is-preview':''}" data-role="${escape(v.role)}">
      <div class="sl-streak-title"><span>WIN</span><b>STREAK</b></div>
      <div class="sl-streak-main ${v.layout==='image-right'?'is-image-right':''}">
        <div class="sl-streak-image"><img src="${image}" alt="${escape(alt)}"></div>
        <div class="sl-streak-number" aria-label="${v.current} victorias consecutivas">${v.current}</div>
      </div>
    </div>`;
  }
  window.SanLeanChallengeStreakView={render,normalized};
})();