/* SANLEAN — roster visual compartido para ALL KILLER / ALL SURVIVOR CHALLENGE. */
(()=>{
  let killerCatalog=null,killerLoading=null,lastTarget=null,lastData=null,lastOptions=null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function loadKillers(){
    if(killerCatalog)return killerCatalog;
    if(killerLoading)return killerLoading;
    killerLoading=fetch('../data/killers.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('No se pudo cargar el catálogo de Killers.');return r.json()}).then(rows=>{
      killerCatalog=rows.filter(x=>x?.key&&x?.image).map(x=>({...x,image:'../'+String(x.image).replace(/^\.\.\//,'').replace(/^\//,'')}));
      return killerCatalog;
    }).finally(()=>killerLoading=null);
    return killerLoading;
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

  function renderNow(target,data,{preview=false}={}){
    const state=data?.state||{},catalog=killerCatalog||[];
    if(!preview&&(state.visible===false||!['active','paused'].includes(state.status))){target.innerHTML='';return}
    const current=state.currentKey||'',rows=rowsBalanced(catalog,3),maxCols=Math.max(1,...rows.map(r=>r.length));
    target.innerHTML=`<div class="sl-roster-view${preview?' is-preview':''}" style="--roster-cols:${maxCols}">
      ${rows.map(row=>`<div class="sl-roster-row">${row.map(item=>{
        const status=stateFor(data,item.key),isCurrent=current===item.key;
        const cls=['sl-roster-card',`is-${status}`,isCurrent?'is-current':''].filter(Boolean).join(' ');
        const mark=status==='completed'?'✓':status==='failed'?'×':'';
        return `<div class="${cls}" data-key="${esc(item.key)}" title="${esc(item.name||item.key)}">
          <div class="sl-roster-image"><img src="${esc(item.image)}" alt="${esc(item.name||item.key)}"></div>
          ${mark?`<span class="sl-roster-mark" aria-hidden="true">${mark}</span>`:''}
          <span class="sl-roster-name">${esc(item.name||item.key)}</span>
        </div>`;
      }).join('')}</div>`).join('')}
    </div>`;
  }

  function render(target,data,options={}){
    if(!target)return;lastTarget=target;lastData=data;lastOptions=options;
    if(killerCatalog){renderNow(target,data,options);return}
    target.innerHTML='';
    loadKillers().then(()=>{if(lastTarget===target)renderNow(target,lastData,lastOptions||{})}).catch(()=>{target.innerHTML=''});
  }

  window.SanLeanChallengeRosterView={render,loadKillers,rowsBalanced};
})();