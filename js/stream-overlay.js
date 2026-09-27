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
    if(!items.length){stage.innerHTML=state.cardRule?`<div class="obs-spinning">${escapeHtml(state.cardRule.label)}</div>`:'';return}
    stage.innerHTML=`<div class="obs-roulette">${items.map(item=>`<article class="obs-result-card"><div class="obs-result-diamond">${item.image?`<img src="${escapeHtml(item.image)}" alt="">`:''}</div><strong>${escapeHtml(item.name||item.key||'RESULTADO')}</strong></article>`).join('')}</div>`;
  }

  function renderVote(data){
    const s=data.state||{};
    if(s.visible===false||!Array.isArray(s.cards)||!s.cards.length){stage.innerHTML='';delete stage.dataset.cardsSignature;root.classList.add('obs-hidden');return}
    root.classList.remove('obs-hidden');
    window.SanLeanCardsView.render(stage,s);
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
    const demo=new URLSearchParams(location.search).get('demo');
  if(!token&&['normal','chaotic'].includes(demo)){
    fetch('../data/cards-assets.json').then(r=>r.json()).then(manifest=>{
      const special=demo==='chaotic',reveal=new URLSearchParams(location.search).get('reveal')||'none';
      const ids=special?['normal_4','survivor_no_mither_object_random','survivor_totems','survivor_zero_perks_addons','survivor_two_bad_one_good_random']:['normal_0','normal_1','normal_2','normal_3','normal_4'];
      const labels=special?['4 PERKS','ME LA PELA + OBJETO DE OBSESIÓN + 2 RANDOM','BUILD DE TÓTEMS','0 PERKS + 0 ADDONS','2 MALAS + 1 BUENA + 1 RANDOM']:['0 PERKS','1 PERK','2 PERKS','3 PERKS','4 PERKS'];
      render({kind:'vote',canControl:false,state:{visible:true,special,state:'revealed',winner:reveal==='none'?null:'B',cards:ids.map((id,i)=>({letter:'ABCDE'[i],revealed:reveal==='all'||(reveal==='winner'&&i===1),label:labels[i],image:`../cartas/${(special?manifest.chaoticResults[id]:null)||manifest.results[id]}`}))}});
    });return;
  }
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
  const demo=new URLSearchParams(location.search).get('demo');
  if(!token&&['normal','chaotic'].includes(demo)){
    fetch('../data/cards-assets.json').then(r=>r.json()).then(manifest=>{
      const special=demo==='chaotic',reveal=new URLSearchParams(location.search).get('reveal')||'none';
      const ids=special?['normal_4','survivor_no_mither_object_random','survivor_totems','survivor_zero_perks_addons','survivor_two_bad_one_good_random']:['normal_0','normal_1','normal_2','normal_3','normal_4'];
      const labels=special?['4 PERKS','ME LA PELA + OBJETO DE OBSESIÓN + 2 RANDOM','BUILD DE TÓTEMS','0 PERKS + 0 ADDONS','2 MALAS + 1 BUENA + 1 RANDOM']:['0 PERKS','1 PERK','2 PERKS','3 PERKS','4 PERKS'];
      render({kind:'vote',canControl:false,state:{visible:true,special,state:'revealed',winner:reveal==='none'?null:'B',cards:ids.map((id,i)=>({letter:'ABCDE'[i],revealed:reveal==='all'||(reveal==='winner'&&i===1),label:labels[i],image:`../cartas/${(special?manifest.chaoticResults[id]:null)||manifest.results[id]}`}))}});
    });return;
  }
  if(!token||!endpoint){root.classList.add('obs-hidden');return}
  async function poll(){await refresh();setTimeout(poll,700)}
  poll();
})();
