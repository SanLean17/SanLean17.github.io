(()=>{
  const cfg=window.SANLEAN_SUPABASE;
  const root=document.getElementById('obsOverlayRoot');
  const stage=document.getElementById('obsStage');
  const controls=document.getElementById('obsControl');
  const spinBtn=document.getElementById('obsSpin');
  const hideBtn=document.getElementById('obsHide');
  const token=new URLSearchParams(location.search).get('token')||'';
  const endpoint=cfg?.url?`${cfg.url}/functions/v1/stream-overlay`:'';
  let snapshot=null,busy=false,lastSignature='';

  const escapeHtml=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const isRoulette=kind=>['roulette_killers','roulette_killer_perks','roulette_survivor_perks'].includes(kind);

  function secureIndex(max){
    if(max<=1)return 0;
    const limit=Math.floor(0x100000000/max)*max;
    const arr=new Uint32Array(1);
    do crypto.getRandomValues(arr);while(arr[0]>=limit);
    return arr[0]%max;
  }

  function weightedUnique(pool,count){
    const remaining=(pool||[]).filter(x=>Number(x.weight)>0).map(x=>({...x,weight:Number(x.weight)||1}));
    const out=[];
    while(remaining.length&&out.length<count){
      const total=remaining.reduce((sum,x)=>sum+x.weight,0);
      if(total<=0)break;
      const randomBytes=new Uint32Array(1);crypto.getRandomValues(randomBytes);
      let target=(randomBytes[0]/0x100000000)*total,index=0;
      for(;index<remaining.length;index++){target-=remaining[index].weight;if(target<0)break}
      const picked=remaining.splice(Math.min(index,remaining.length-1),1)[0];
      if(picked)out.push(picked);
    }
    return out;
  }

  async function postState(state){
    if(!snapshot?.canControl||!endpoint||!token)return false;
    const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({controlToken:token,state})});
    return r.ok;
  }

  async function spin(){
    if(busy||!snapshot?.canControl||!isRoulette(snapshot.kind))return;
    const pool=Array.isArray(snapshot.settings?.pool)?snapshot.settings.pool:[];
    if(!pool.length)return;
    busy=true;
    const resultCount=Math.max(1,Math.min(4,Number(snapshot.settings?.resultCount)||1));
    await postState({visible:true,status:'spinning',items:[],startedAt:new Date().toISOString()});
    setTimeout(async()=>{
      const items=weightedUnique(pool,resultCount).map(x=>({key:x.key,name:x.name,image:x.image}));
      await postState({visible:true,status:'result',items,finishedAt:new Date().toISOString()});
      busy=false;
    },1350);
  }

  function renderRoulette(data){
    const state=data.state||{};
    if(state.visible===false||state.status==='idle'){stage.innerHTML='';root.classList.add('obs-hidden');return}
    root.classList.remove('obs-hidden');
    if(state.status==='spinning'){
      stage.innerHTML='<div class="obs-spinning">GIRANDO...</div>';
      return;
    }
    const items=Array.isArray(state.items)?state.items:[];
    if(!items.length){stage.innerHTML='';return}
    stage.innerHTML=`<div class="obs-roulette">${items.map(item=>`<article class="obs-result-card"><div class="obs-result-diamond">${item.image?`<img src="${escapeHtml(item.image)}" alt="">`:''}</div><strong>${escapeHtml(item.name||item.key||'RESULTADO')}</strong></article>`).join('')}</div>`;
  }

  function renderVote(data){
    const s=data.state||{};
    if(s.visible===false){stage.innerHTML='';root.classList.add('obs-hidden');return}
    root.classList.remove('obs-hidden');
    const cards=Array.isArray(s.cards)?s.cards:[];
    stage.innerHTML=`<div class="obs-vote-box"><div class="obs-vote-head"><h2>${escapeHtml(s.deckName||'VOTACIÓN')}</h2><div class="obs-timer">${Math.max(0,Number(s.secondsLeft)||0)}s</div></div>${cards.map(c=>`<div class="obs-vote-row"><b>${escapeHtml(c.slot||'')}</b><div><div>${escapeHtml(c.label||'')}</div><div class="obs-vote-meter"><i style="width:${Math.max(0,Math.min(100,Number(c.percentage)||0))}%"></i></div></div><span>${Number(c.count)||0} · ${Math.round(Number(c.percentage)||0)}%</span></div>`).join('')}</div>`;
  }

  function renderGiveaway(data){
    const s=data.state||{};
    if(s.visible===false){stage.innerHTML='';root.classList.add('obs-hidden');return}
    root.classList.remove('obs-hidden');
    stage.innerHTML=`<div class="obs-giveaway-box"><div class="obs-giveaway-head"><h2>SORTEO</h2><strong>${escapeHtml(s.statusLabel||'ABIERTO')}</strong></div><div><span>PALABRA CLAVE</span><h3>${escapeHtml(s.keyword||'—')}</h3><p>PARTICIPANTES: <strong>${Number(s.count)||0}</strong></p></div></div>`;
  }

  function render(data){
    snapshot=data;
    root.classList.toggle('control-mode',!!data.canControl);
    controls.hidden=!data.canControl;
    spinBtn.hidden=!isRoulette(data.kind);
    if(isRoulette(data.kind))renderRoulette(data);
    else if(data.kind==='vote')renderVote(data);
    else if(data.kind==='giveaway')renderGiveaway(data);
    else{stage.innerHTML='';root.classList.add('obs-hidden')}
  }

  async function refresh(){
    if(!token||!endpoint)return;
    try{
      const r=await fetch(`${endpoint}?token=${encodeURIComponent(token)}`,{cache:'no-store'});
      if(!r.ok){stage.innerHTML='';root.classList.add('obs-hidden');return}
      const data=await r.json();
      const sig=JSON.stringify([data.kind,data.state,data.settings?.resultCount,data.settings?.pool?.length,data.canControl]);
      if(sig!==lastSignature){lastSignature=sig;render(data)}else snapshot=data;
    }catch(err){console.error('SanLean overlay:',err)}
  }

  spinBtn?.addEventListener('click',spin);
  hideBtn?.addEventListener('click',()=>postState({visible:false,status:'idle',items:[]}));
  if(!token||!endpoint){root.classList.add('obs-hidden');return}
  refresh();
  setInterval(refresh,700);
})();
