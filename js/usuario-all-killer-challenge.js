/* SANLEAN — USUARIO > DESAFÍOS > ALL KILLER CHALLENGE. */
(()=>{
  const cfg=window.SANLEAN_SUPABASE;if(!cfg||!window.supabase)return;
  const client=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=id=>document.getElementById(id),tools=()=>window.SanLeanStreamTools;
  let open=false,busy=false,catalog=[],search='',installed=false;

  const overlay=()=>tools()?.getOverlays?.().find(o=>o.kind==='challenge_all_killers')||null;
  const workspace=()=>tools()?.getWorkspace?.()||null;
  const isActive=o=>o?.state?.status==='active';
  const isPaused=o=>o?.state?.status==='paused';
  const isSession=o=>['active','paused'].includes(o?.state?.status);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[_-]+/g,' ').replace(/[^a-z0-9ñ ]/g,' ').replace(/\s+/g,' ').trim();
  const aliases={trapper:'trampero evan macmillan',wraith:'espectro philip ojomo',hillbilly:'pueblerino max thompson',nurse:'enfermera sally smithson',myers:'michael myers shape forma',hag:'bruja lisa sherwood',doctor:'herman carter',huntress:'cazadora anna',leatherface:'cannibal canibal bubba sawyer',freddy:'nightmare pesadilla freddy krueger',pig:'cerda amanda young',clown:'payaso kenneth chase',spirit:'espiritu rin yamaoka',legion:'frank julie susie joey',plague:'plaga adiris',ghostface:'ghost face cara fantasma danny johnson',demogorgon:'demo',oni:'kazan yamaoka',deathslinger:'arponero caleb quinn',pyramidhead:'pyramid head executioner verdugo',blight:'deterioro talbot grimes',twins:'gemelos charlotte victor',trickster:'traicionero ji woon',nemesis:'nemesis',cenobite:'pinhead cenobita',artist:'artista carmina mora',onryo:'sadako',dredge:'draga',wesker:'mastermind albert wesker',knight:'caballero',skullmerchant:'comerciante calaveras',singularity:'singularidad',xenomorph:'xenomorfo alien',chucky:'good guy',unknown:'desconocido',vecna:'lich liche',dracula:'dark lord señor oscuro',houndmaster:'adiestradora canina',ghoul:'kaneki',animatronic:'springtrap animatronico',krasue:'krasue',lich:'first primero',jason:'voorhees slasher',judgment:'sentencia'};

  async function loadCatalog(){
    if(catalog.length)return catalog;
    const r=await fetch('../data/killers.json',{cache:'no-store'});if(!r.ok)throw new Error('No se pudo cargar el catálogo de Killers.');
    const rows=await r.json();
    catalog=rows.filter(x=>x?.key&&x?.image).map(x=>({...x,image:'../'+String(x.image).replace(/^\.\.\//,'').replace(/^\//,''),search:norm(`${x.key} ${x.name||''} ${aliases[x.key]||''}`)}));
    return catalog;
  }

  function install(){
    if(installed)return;const selector=$('challengeSelector');if(!selector)return;
    const row=[...selector.querySelectorAll('.challenge-row')].find(r=>r.querySelector('h3')?.textContent.trim()==='ALL KILLER CHALLENGE');if(!row)return;
    installed=true;
    const actions=row.querySelector('.module-actions');actions.innerHTML='<button id="allKillerOpen" class="module-secondary challenge-open-btn" type="button" aria-expanded="false"><span>ABRIR</span><i class="challenge-open-chevron" aria-hidden="true"></i></button>';
    const inline=document.createElement('div');inline.id='allKillerInline';inline.className='challenge-inline-area';inline.hidden=true;row.insertAdjacentElement('afterend',inline);
    inline.innerHTML=`<section id="allKillerPanel" class="module-box all-challenge-panel">
      <div class="challenge-config-head"><div><span>ALL KILLER CHALLENGE</span><h3>CONFIGURACIÓN</h3><p>Completá el roster de Killers. Seleccioná el personaje que estás jugando y registrá cada victoria o derrota.</p></div></div>
      <div id="allKillerSetup"><div class="all-challenge-intro"><strong id="allKillerTotalLabel">44 KILLERS</strong><p>El tiempo del desafío se registra internamente sólo mientras la sesión está activa.</p></div><div class="module-actions challenge-goal-actions"><button id="allKillerStart" class="module-primary" type="button">INICIAR ALL KILLER CHALLENGE</button></div></div>
      <div id="allKillerLive" hidden>
        <div class="challenge-active-head"><div><span id="allKillerStateLabel">CHALLENGE ACTIVO</span><h3>CONTROL</h3></div></div>
        <div class="all-challenge-stats"><div><span>COMPLETADOS</span><strong id="allKillerCompleted">0 / 44</strong></div><div><span>FALLIDOS</span><strong id="allKillerFailed">0</strong></div><div><span>PENDIENTES</span><strong id="allKillerPending">44</strong></div></div>
        <label class="all-challenge-search">BUSCAR KILLER<input id="allKillerSearch" type="search" placeholder="EJ. ONI, MYERS, CAZADORA..." autocomplete="off"></label>
        <div id="allKillerGrid" class="all-challenge-grid"></div>
        <div id="allKillerSelection" class="all-challenge-selection" hidden><div><span>KILLER ACTUAL</span><strong id="allKillerSelectedName">—</strong></div><div class="all-challenge-result-actions"><button id="allKillerWin" class="ui-btn ui-btn-primary" type="button">MARCAR GANADO</button><button id="allKillerLose" class="ui-btn ui-btn-secondary" type="button">MARCAR PERDIDO</button><button id="allKillerPendingBtn" class="ui-btn ui-btn-secondary" type="button">VOLVER A PENDIENTE</button></div></div>
        <div class="module-actions challenge-active-actions all-challenge-session-actions"><button id="allKillerPause" class="module-secondary" type="button">PAUSAR</button><button id="allKillerObs" class="module-secondary" type="button">OCULTAR EN OBS</button><button id="allKillerFinish" class="module-secondary challenge-danger" type="button">FINALIZAR CHALLENGE</button></div>
        <p class="ui-field-help">PAUSAR conserva todo el progreso y detiene el tiempo acumulado. FINALIZAR lo guarda en el historial.</p>
      </div><p id="allKillerStatus" class="module-status" role="status"></p>
    </section>`;

    installHistory();
    bind();
    loadCatalog().then(refresh).catch(err=>setStatus(err.message));
    refresh();
  }

  function installHistory(){
    const body=$('challengeHistoryBody');if(!body||$('allKillerHistoryToggle'))return;
    const group=document.createElement('section');group.className='challenge-history-group';group.innerHTML=`<button id="allKillerHistoryToggle" class="challenge-library-toggle" type="button" aria-expanded="false"><span><small>HISTORIAL</small><strong>ALL KILLER CHALLENGE</strong></span><i class="challenge-open-chevron" aria-hidden="true"></i></button><div id="allKillerHistoryBody" class="challenge-history-body" hidden><div id="allKillerHistory" class="challenge-history-list"></div><p id="allKillerHistoryEmpty" class="challenge-empty">TODAVÍA NO HAY ALL KILLER CHALLENGES GUARDADOS.</p></div>`;
    body.appendChild(group);
    group.querySelector('#allKillerHistoryToggle').addEventListener('click',e=>{const b=e.currentTarget,expanded=b.getAttribute('aria-expanded')==='true';b.setAttribute('aria-expanded',String(!expanded));$('allKillerHistoryBody').hidden=expanded});
  }

  function setStatus(t=''){$('allKillerStatus')&&($('allKillerStatus').textContent=t)}
  function stateOf(key){return overlay()?.state?.entries?.[key]||'pending'}
  function counts(){
    let completed=0,failed=0;for(const k of catalog){const s=stateOf(k.key);if(s==='completed')completed++;else if(s==='failed')failed++}
    return{completed,failed,pending:Math.max(0,catalog.length-completed-failed)};
  }
  function elapsedMs(state=overlay()?.state||{}){
    let total=Math.max(0,Number(state.accumulatedMs)||0);
    if(state.status==='active'&&state.runningSince){const t=Date.parse(state.runningSince);if(Number.isFinite(t))total+=Math.max(0,Date.now()-t)}
    return total;
  }
  function formatDate(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d)}
  function formatDuration(ms){const min=Math.floor(Math.max(0,ms)/60000),h=Math.floor(min/60),m=min%60;if(h)return`${h} h ${String(m).padStart(2,'0')} min`;return`${m} min`}

  async function write(patch){
    const o=overlay(),ws=workspace();if(!o||!ws)throw new Error('ALL KILLER CHALLENGE todavía no está disponible.');
    const update={updated_at:new Date().toISOString()};if(patch.settings)update.settings=patch.settings;if(patch.state)update.state=patch.state;
    const {data,error}=await client.from('stream_overlays').update(update).eq('id',o.id).eq('workspace_id',ws.id).select('*').single();if(error||!data)throw error||new Error('No se pudo guardar el challenge.');
    const current=overlay();if(current){if(patch.settings)current.settings=data.settings;if(patch.state)current.state=data.state}
    window.dispatchEvent(new CustomEvent('sanlean:challenge-all-killers',{detail:data}));window.dispatchEvent(new CustomEvent('sanlean:overlays-updated'));return data;
  }

  async function start(){
    if(busy)return;const o=overlay();if(!o||isSession(o))return;busy=true;setStatus('');
    try{
      if(!tools()?.isOwner?.())throw new Error('La configuración pertenece al propietario del stream.');
      const now=new Date().toISOString(),entries={};catalog.forEach(k=>entries[k.key]='pending');
      await write({state:{visible:true,status:'active',entries,currentKey:null,startedAt:now,runningSince:now,accumulatedMs:0,updatedAt:now}});
    }catch(err){setStatus(err.message||'No se pudo iniciar el challenge.')}finally{busy=false;refresh()}
  }

  async function selectCurrent(key){
    if(busy||!isActive(overlay()))return;const o=overlay();if(!catalog.some(k=>k.key===key))return;busy=true;
    try{await write({state:{...o.state,currentKey:key,updatedAt:new Date().toISOString()}})}catch(err){setStatus(err.message||'No se pudo seleccionar el Killer.')}finally{busy=false;refresh()}
  }

  async function mark(status){
    if(busy||!isActive(overlay()))return;const o=overlay(),key=o.state?.currentKey;if(!key)return;busy=true;
    try{await write({state:{...o.state,entries:{...(o.state.entries||{}),[key]:status},currentKey:null,updatedAt:new Date().toISOString()}})}catch(err){setStatus(err.message||'No se pudo guardar el resultado.')}finally{busy=false;refresh()}
  }

  async function pauseOrContinue(){
    if(busy||!isSession(overlay()))return;const o=overlay(),now=new Date();busy=true;
    try{
      if(isActive(o)){await write({state:{...o.state,status:'paused',visible:false,accumulatedMs:elapsedMs(o.state),runningSince:null,pausedAt:now.toISOString(),updatedAt:now.toISOString()}})}
      else{await write({state:{...o.state,status:'active',visible:true,runningSince:now.toISOString(),resumedAt:now.toISOString(),updatedAt:now.toISOString()}})}
    }catch(err){setStatus(err.message||'No se pudo cambiar el estado del challenge.')}finally{busy=false;refresh()}
  }

  async function toggleObs(){
    if(busy||!isActive(overlay()))return;const o=overlay();busy=true;
    try{await write({state:{...o.state,visible:o.state.visible===false,updatedAt:new Date().toISOString()}})}catch(err){setStatus(err.message||'No se pudo cambiar la visibilidad en OBS.')}finally{busy=false;refresh()}
  }

  async function finish(){
    if(busy||!isSession(overlay()))return;const o=overlay(),now=new Date(),duration=elapsedMs(o.state),c=counts();busy=true;
    try{
      const record={startedAt:o.state.startedAt||null,finishedAt:now.toISOString(),durationMs:duration,completed:c.completed,failed:c.failed,pending:c.pending,total:catalog.length};
      const history=[...(Array.isArray(o.settings?.history)?o.settings.history:[]),record].slice(-30);
      await write({settings:{...(o.settings||{}),history},state:{...o.state,status:'finished',visible:false,currentKey:null,accumulatedMs:duration,runningSince:null,finishedAt:now.toISOString(),updatedAt:now.toISOString()}});
    }catch(err){setStatus(err.message||'No se pudo finalizar el challenge.')}finally{busy=false;refresh()}
  }

  function renderGrid(){
    const grid=$('allKillerGrid');if(!grid)return;const o=overlay(),words=norm(search).split(' ').filter(Boolean),paused=isPaused(o),current=o?.state?.currentKey||'';
    const items=catalog.filter(k=>words.every(w=>k.search.includes(w)));
    grid.innerHTML=items.map(k=>{const status=stateOf(k.key),cur=current===k.key;return`<button type="button" class="all-challenge-card is-${status}${cur?' is-current':''}" data-key="${esc(k.key)}" ${paused||busy?'disabled':''}><div><img src="${esc(k.image)}" alt=""></div><strong>${esc(k.name)}</strong><span class="all-card-state">${status==='completed'?'✓':status==='failed'?'×':''}</span></button>`}).join('');
    grid.querySelectorAll('[data-key]').forEach(btn=>btn.addEventListener('click',()=>selectCurrent(btn.dataset.key)));
  }

  function renderHistory(){
    const list=$('allKillerHistory'),empty=$('allKillerHistoryEmpty');if(!list||!empty)return;const history=Array.isArray(overlay()?.settings?.history)?[...overlay().settings.history].reverse():[];empty.hidden=history.length>0;
    list.innerHTML=history.map(x=>`<div class="challenge-history-row all-history-row"><strong>${Number(x.completed)||0}/${Number(x.total)||0} COMPLETADOS</strong><span>${formatDate(x.startedAt)} → ${formatDate(x.finishedAt)}</span><b>${formatDuration(Number(x.durationMs)||0)}</b><time>${Number(x.failed)||0} fallidos</time></div>`).join('');
  }

  function refresh(){
    if(!installed)return;const o=overlay(),session=isSession(o),paused=isPaused(o),state=o?.state||{},c=counts();
    $('allKillerInline').hidden=!open;$('allKillerOpen').setAttribute('aria-expanded',String(open));$('allKillerOpen').querySelector('span').textContent=open?'CERRAR':'ABRIR';
    $('allKillerSetup').hidden=session;$('allKillerLive').hidden=!session;
    $('allKillerTotalLabel').textContent=`${catalog.length||44} KILLERS`;
    if(session){
      $('allKillerStateLabel').textContent=paused?'CHALLENGE PAUSADO':'CHALLENGE ACTIVO';
      $('allKillerCompleted').textContent=`${c.completed} / ${catalog.length}`;$('allKillerFailed').textContent=String(c.failed);$('allKillerPending').textContent=String(c.pending);
      const current=catalog.find(k=>k.key===state.currentKey);$('allKillerSelection').hidden=!current;$('allKillerSelectedName').textContent=current?.name||'—';
      ['allKillerWin','allKillerLose','allKillerPendingBtn'].forEach(id=>{if($(id))$(id).disabled=busy||paused||!current});
      const pause=$('allKillerPause');pause.textContent=paused?'CONTINUAR':'PAUSAR';pause.disabled=busy;
      const obs=$('allKillerObs');obs.textContent=paused?'OCULTO EN PAUSA':state.visible===false?'MOSTRAR EN OBS':'OCULTAR EN OBS';obs.disabled=busy||paused;
      $('allKillerFinish').disabled=busy;
    }
    $('allKillerStart').disabled=busy||!tools()?.isOwner?.()||session;
    renderGrid();renderHistory();
  }

  function toggleOpen(){
    open=!open;
    if(open){['goalConfigureOpen','streakConfigureOpen'].forEach(id=>{const b=$(id);if(b?.getAttribute('aria-expanded')==='true')b.click()})}
    refresh();if(open)setTimeout(()=>$('allKillerPanel')?.scrollIntoView({behavior:'smooth',block:'nearest'}),40);
  }

  function bind(){
    $('allKillerOpen').addEventListener('click',toggleOpen);$('allKillerStart').addEventListener('click',start);$('allKillerSearch').addEventListener('input',e=>{search=e.currentTarget.value;renderGrid()});
    $('allKillerWin').addEventListener('click',()=>mark('completed'));$('allKillerLose').addEventListener('click',()=>mark('failed'));$('allKillerPendingBtn').addEventListener('click',()=>mark('pending'));
    $('allKillerPause').addEventListener('click',pauseOrContinue);$('allKillerObs').addEventListener('click',toggleObs);$('allKillerFinish').addEventListener('click',finish);
    window.addEventListener('sanlean:overlays-updated',refresh);window.addEventListener('sanlean:challenge-all-killers',refresh);window.addEventListener('sanlean:section',refresh);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,80),{once:true});else setTimeout(install,80);
})();