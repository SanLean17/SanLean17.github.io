/* SANLEAN — roster visual compartido para ALL KILLER / ALL SURVIVOR CHALLENGE. */
(()=>{
  const catalogs={},loading={},pending=new WeakMap();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function loadCatalog(role='killers'){
    role=role==='survivors'?'survivors':'killers';
    if(catalogs[role])return catalogs[role];
    if(loading[role])return loading[role];
    loading[role]=Promise.all([
      fetch(`../data/${role}.json`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('No se pudo cargar el catálogo.');return r.json()}),
      fetch('../data/challenge-roster-bounds.json?v=20261002-2').then(r=>r.ok?r.json():{}).catch(()=>({}))
    ]).then(([rows,bounds])=>{
      catalogs[role]=rows.filter(x=>x?.key&&x?.image).map(x=>{const source=String(x.image).replace(/^\.\.\//,'').replace(/^\//,'');return {...x,image:'../'+source,portraitBounds:bounds[source]}});
      return catalogs[role];
    }).finally(()=>delete loading[role]);
    return loading[role];
  }

  function rowsBalanced(items,count=3){
    const n=items.length;if(!n)return[];
    const rows=Math.min(count,n),base=Math.floor(n/rows),rem=n%rows,out=[];let i=0;
    for(let r=0;r<rows;r++){const size=base+(r<rem?1:0);out.push(items.slice(i,i+size));i+=size}
    return out;
  }

  function stateFor(data,key){
    return data?.state?.entries?.[key]||'pending';
  }

  // Match the approved 100px portraits on a 1920px stream. Fill each row
  // before starting the next; catalog additions must never drop a portrait.
  function rowsForObs(items,columns=19){
    columns=columns===5?5:19;
    const rows=[];
    for(let i=0;i<items.length;i+=columns)rows.push(items.slice(i,i+columns));
    return rows;
  }

  function renderNow(target,data,{preview=false,columns=19}={}){
    columns=columns===5?5:19;
    const state=data?.state||{},catalog=catalogs[data?.kind==='challenge_all_survivors'?'survivors':'killers']||[];
    if(!preview&&(state.visible===false||!['active','paused'].includes(state.status))){target.innerHTML='';return}
    const current=state.currentKey||'',rows=preview?rowsBalanced(catalog,3):rowsForObs(catalog,columns),maxCols=preview?Math.max(1,...rows.map(r=>r.length)):columns;
    const alignment=['left','center','right'].includes(data?.settings?.lastRowAlignment)?data.settings.lastRowAlignment:'center';
    target.innerHTML=`<div class="sl-roster-view${preview?' is-preview':''}" data-last-row-alignment="${alignment}" style="--roster-cols:${maxCols};--roster-rows:${Math.max(1,rows.length)}">
      ${rows.map(row=>`<div class="sl-roster-row">${row.map(item=>{
        const status=stateFor(data,item.key),isCurrent=current===item.key;
        const cls=['sl-roster-card',`is-${status}`,isCurrent?'is-current':''].filter(Boolean).join(' ');
        const mark=status==='completed'?'✓':status==='failed'?'×':'';
        return `<div class="${cls}" data-key="${esc(item.key)}" title="${esc(item.name||item.key)}">
          <div class="sl-roster-image">${!preview&&item.portraitBounds?`<svg class="sl-roster-portrait" viewBox="${item.portraitBounds.viewBox.join(' ')}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(item.name||item.key)}"><image href="${esc(item.image)}" width="${item.portraitBounds.width}" height="${item.portraitBounds.height}" /></svg>`:`<img src="${esc(item.image)}" alt="${esc(item.name||item.key)}">`}</div>
          ${mark?`<span class="sl-roster-mark" aria-hidden="true">${mark}</span>`:''}
          <span class="sl-roster-name">${esc(item.name||item.key)}</span>
        </div>`;
      }).join('')}</div>`).join('')}
    </div>`;
  }

  function render(target,data,options={}){
    if(!target)return;
    const request={data,options};pending.set(target,request);
    const role=data?.kind==='challenge_all_survivors'?'survivors':'killers';
    if(catalogs[role]){renderNow(target,data,options);return}
    target.innerHTML='';
    loadCatalog(role).then(()=>{if(pending.get(target)===request)renderNow(target,data,options)}).catch(()=>{if(pending.get(target)===request)target.innerHTML=''});
  }

  window.SanLeanChallengeRosterView={render,loadKillers:()=>loadCatalog('killers'),loadCatalog,rowsBalanced,rowsForObs};
})();
