(()=>{
  const cfg=window.SANLEAN_SUPABASE;
  const client=cfg&&window.supabase?window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
  const $=id=>document.getElementById(id),tools=()=>window.SanLeanStreamTools;
  let busy=false,liveSaveTimer=null,syncing=false,dirty=false,editVersion=0,saveQueue=Promise.resolve(),activeKey='',activeChallenge='',historyOpen=false,goalHistoryOpen=false,streakHistoryOpen=false,streakBusy=false,streakSaveTimer=null,streakKillers=[],selectedStreakKiller=null,streakConfigInitialized=false;
  const contextKey=()=>[workspace()?.id,goalOverlay()?.id,goalOverlay()?.state?.startedAt].join(':');
  const cancelLiveTimer=()=>{clearTimeout(liveSaveTimer);liveSaveTimer=null};
  const goalOverlay=()=>tools()?.getOverlays?.().find(o=>o.kind==='challenge_goal')||null;
  const streakOverlay=()=>tools()?.getOverlays?.().find(o=>o.kind==='challenge_streak')||null;
  const workspace=()=>tools()?.getWorkspace?.()||null;
  const isLive=o=>['active','reached'].includes(o?.state?.status);
  const isStreakLive=o=>o?.state?.status==='active';
  const isStreakPaused=o=>o?.state?.status==='paused';
  const isStreakSession=o=>['active','paused'].includes(o?.state?.status);
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const roleLabel=role=>role==='both'?'KILLER + SUPERVIVIENTE':role==='survivor'?'SUPERVIVIENTE':'KILLER';
  const normalizeRole=value=>['killer','survivor','both'].includes(value)?value:'killer';
  const killerAliases={trapper:'trampero evan macmillan',wraith:'espectro philip ojomo',hillbilly:'pueblerino max thompson',nurse:'enfermera sally smithson',myers:'michael myers shape forma',hag:'bruja lisa sherwood',doctor:'herman carter',huntress:'cazadora anna',leatherface:'cannibal canibal bubba sawyer',freddy:'nightmare pesadilla freddy krueger',pig:'cerda amanda young',clown:'payaso kenneth chase',spirit:'espiritu rin yamaoka',legion:'frank julie susie joey',plague:'plaga adiris',ghostface:'ghost face cara fantasma danny johnson',demogorgon:'demo',oni:'kazan yamaoka',deathslinger:'arponero caleb quinn',pyramidhead:'pyramid head executioner verdugo',blight:'deterioro talbot grimes',twins:'gemelos charlotte victor deshayes',trickster:'traicionero ji woon hak',nemesis:'t type',cenobite:'cenobita pinhead elliot spencer',artist:'artista carmina mora',onryo:'sadako yamamura',dredge:'draga',wesker:'mastermind mente maestra albert wesker',knight:'caballero tarhos kovacs',skullmerchant:'skull merchant comerciante calaveras adriana imai',singularity:'singularidad hux',xenomorph:'xenomorfo alien',chucky:'good guy charles lee ray',unknown:'desconocido',vecna:'lich liche',dracula:'dark lord señor oscuro',houndmaster:'adiestradora canina portia maye',ghoul:'kaneki ken kaneki',animatronic:'animatronico springtrap',krasue:'krasue',lich:'first primero',jason:'voorhees slasher destripador',judgment:'sentencia'};
  const normalizeSearch=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[_-]+/g,' ').replace(/[^a-z0-9ñ ]/g,' ').replace(/\s+/g,' ').trim();


  function installPanel(){
    if(document.getElementById('streamChallengesPanel'))return;
    const panel=document.createElement('section');panel.id='streamChallengesPanel';panel.className='stream-module challenges-panel';panel.hidden=true;
    const openButton=(id,label)=>`<button id="${id}" class="module-secondary challenge-open-btn" type="button" aria-expanded="false"><span>${label}</span><i class="challenge-open-chevron" aria-hidden="true"></i></button>`;
    panel.innerHTML=`<div class="stream-module-head"></div>
      <section id="challengeSelector" class="module-box challenge-selector">
        <div class="challenge-row"><div class="challenge-copy"><h3>METAS</h3><p>Creá un contador manual para el objetivo que quieras mostrar durante el stream.</p></div><div class="module-actions">${openButton('goalConfigureOpen','ABRIR')}</div></div>
        <div class="challenge-row"><div class="challenge-copy"><h3>WIN STREAK</h3><p>Llevá una racha de escapes como Superviviente o victorias con un Killer específico.</p></div><div class="module-actions">${openButton('streakConfigureOpen','ABRIR')}</div></div>
        <div class="challenge-row"><div class="challenge-copy"><h3>ALL KILLER CHALLENGE</h3><p>Completá el roster de Killers y elegí el siguiente con la ruleta.</p></div><div class="module-actions"><button class="module-secondary" type="button" disabled>PRÓXIMAMENTE</button></div></div>
        <div class="challenge-row"><div class="challenge-copy"><h3>ALL SURVIVOR CHALLENGE</h3><p>Completá el roster de Survivors y registrá cada escape.</p></div><div class="module-actions"><button class="module-secondary" type="button" disabled>PRÓXIMAMENTE</button></div></div>
      </section>

      <section id="goalConfigurator" class="module-box challenge-goal-config" hidden>
        <div class="challenge-config-head"><div><span>METAS</span><h3>CONFIGURACIÓN</h3><p>Escribí la meta como quieras verla en stream. SanLean usará el nombre y el rol para elegir el icono correspondiente cuando esté disponible.</p></div></div>
        <div class="challenge-goal-form">
          <label>NOMBRE DE LA META<input id="goalTitle" type="text" maxlength="42" value="ESCAPES" placeholder="EJ. ESCAPES CONSECUTIVOS"></label>
          <label>ROL<select id="goalRole"><option value="killer">KILLER</option><option value="survivor">SUPERVIVIENTE</option><option value="both">AMBOS</option></select></label>
          <label>OBJETIVO<input id="goalTarget" type="number" min="1" max="999999999" step="1" value="10"></label>
        </div>
        <div class="module-actions challenge-goal-actions"><button id="goalStart" class="module-primary" type="button">INICIAR META</button></div>
        <p id="goalConfigStatus" class="module-status" role="status"></p>
      </section>

      <section id="goalActiveBox" class="module-box challenge-goal-active" hidden>
        <div class="challenge-active-head"><div><span>META ACTIVA</span><h3>CONTROL</h3></div></div>
        <div class="challenge-live-form">
          <label class="challenge-live-title">NOMBRE DE LA META<input id="goalLiveTitle" type="text" maxlength="42"></label>
          <label>ROL<select id="goalLiveRole"><option value="killer">KILLER</option><option value="survivor">SUPERVIVIENTE</option><option value="both">AMBOS</option></select></label>
          <div class="challenge-live-progress"><span class="challenge-live-label">PROGRESO ACTUAL</span><div class="challenge-progress-edit"><button id="goalMinus" class="ui-btn ui-btn-secondary challenge-step" type="button">−1</button><input id="goalLiveCurrent" type="number" min="0" max="999999999" step="1"><button id="goalPlus" class="ui-btn ui-btn-primary challenge-step" type="button">+1</button></div></div>
          <label>OBJETIVO<input id="goalLiveTarget" type="number" min="1" max="999999999" step="1"><small class="ui-field-help">Podés modificar el número de tu objetivo en cualquier momento.</small></label>
        </div>
        <div class="ui-field-help challenge-icon-help" aria-label="Palabras recomendadas para los iconos">
          <span>ICONOS SEGÚN EL NOMBRE</span><ul class="challenge-icon-vocabulary">${[['escapes','ESCAPES'],['escotilla','TRAMPILLA / ESCOTILLA'],['me-la-pela','ME LA PELA'],['salvada','SALVADAS'],['de-frente','DE FRENTE'],['puntos-de-sangre','PUNTOS DE SANGRE'],['motores','GENERADORES'],['randoms','RANDOM']].map(([key,label])=>`<li><img src="../assets/usuario/desafios/metas/${key}.png" alt="" width="24" height="24"><span>${label}</span></li>`).join('')}</ul>
        </div>
        <div class="module-actions challenge-active-actions"><button id="goalSaveLive" class="module-primary" type="button">GUARDAR CAMBIOS</button><button id="goalObsToggle" class="module-secondary" type="button">OCULTAR EN OBS</button><button id="goalFinish" class="module-secondary challenge-danger" type="button">FINALIZAR META</button></div>
        <p id="goalActiveStatus" class="module-status" role="status"></p>
      </section>

      <section id="goalOutput" class="stream-output-box challenge-goal-output" hidden>
        <div class="stream-output-head"><div><span>OBS</span><h3>VISTA DE LA META</h3><p>La vista se actualiza con cada cambio de nombre, rol, progreso u objetivo.</p></div></div>
        <div class="stream-output-grid"><div id="goalPreview" class="stream-preview-frame"></div><div class="stream-output-side"><div class="stream-output-field"><label>URL OBS · VISUALIZACIÓN</label><div class="stream-output-url"><input id="goalObsUrl" type="text" readonly><button id="goalCopyUrl" type="button">COPIAR</button></div></div><p class="stream-output-note">Fuente de navegador recomendada: 720 × 180, fondo transparente.</p></div></div>
      </section>

      <section id="streakPanel" class="module-box challenge-streak-panel" hidden>
        <div class="challenge-config-head"><div><span>WIN STREAK</span><h3>CONFIGURACIÓN</h3><p>Superviviente cuenta escapes. Killer permite elegir un personaje específico y llevar su racha de victorias.</p></div></div>
        <div class="challenge-streak-layout cards-choice-field">
          <span class="cards-choice-label">DISTRIBUCIÓN EN OBS</span>
          <div class="cards-segmented" role="group" aria-label="Distribución de imagen y número">
            <button id="streakLayoutLeft" type="button" aria-pressed="true">IMAGEN IZQUIERDA</button>
            <button id="streakLayoutRight" type="button" aria-pressed="false">IMAGEN DERECHA</button>
          </div>
        </div>
        <div id="streakConfig">
          <div class="challenge-streak-form">
            <label>ROL<select id="streakRole"><option value="survivor">SUPERVIVIENTE</option><option value="killer">KILLER</option></select></label>
            <div id="streakKillerPicker" class="challenge-killer-picker" hidden>
              <label>BUSCAR KILLER<input id="streakKillerSearch" type="search" placeholder="EJ. ONI, CAZADORA, WESKER..." autocomplete="off"></label>
              <div id="streakKillerResults" class="challenge-killer-results"></div>
              <p id="streakKillerSelected" class="ui-field-help">Seleccioná un Killer para iniciar la racha.</p>
            </div>
          </div>
          <div class="module-actions challenge-goal-actions"><button id="streakStart" class="module-primary" type="button">INICIAR WIN STREAK</button></div>
        </div>
        <div id="streakLive" hidden>
          <div class="challenge-active-head"><div><span id="streakSessionState">WIN STREAK ACTIVA</span><h3 id="streakLiveName">SUPERVIVIENTE</h3></div></div>
          <div class="challenge-streak-live-layout">
            <div id="streakUserPreview" class="challenge-streak-user-preview"></div>
            <div class="challenge-streak-controls">
              <span class="challenge-live-label">RACHA ACTUAL</span>
              <div class="challenge-progress-edit"><button id="streakMinus" class="ui-btn ui-btn-secondary challenge-step" type="button">−1</button><input id="streakCurrent" type="number" min="0" max="999999999" step="1"><button id="streakPlus" class="ui-btn ui-btn-primary challenge-step" type="button">+1</button></div>
              <button id="streakReset" class="ui-btn ui-btn-secondary" type="button">REINICIAR RACHA</button>
            </div>
          </div>
          <div class="module-actions challenge-active-actions"><button id="streakPause" class="module-secondary" type="button">PAUSAR</button><button id="streakObsToggle" class="module-secondary" type="button">OCULTAR EN OBS</button><button id="streakFinish" class="module-secondary challenge-danger" type="button">FINALIZAR WIN STREAK</button></div>
        </div>
        <p id="streakStatus" class="module-status" role="status"></p>
      </section>



      <section id="challengeHistorySection" class="challenge-history-shell">
        <button id="challengeHistoryToggle" class="challenge-history-master-toggle" type="button" aria-expanded="false">
          <span><small>DESAFÍOS</small><strong>HISTORIAL</strong></span><i class="challenge-open-chevron" aria-hidden="true"></i>
        </button>
        <div id="challengeHistoryBody" class="challenge-history-master-body" hidden>
          <section class="challenge-history-group">
            <button id="goalHistoryToggle" class="challenge-library-toggle" type="button" aria-expanded="false">
              <span><small>HISTORIAL</small><strong>MIS METAS</strong></span><i class="challenge-open-chevron" aria-hidden="true"></i>
            </button>
            <div id="goalHistoryBody" class="challenge-history-body" hidden>
              <div id="goalHistory" class="challenge-history-list"></div><p id="goalHistoryEmpty" class="challenge-empty">TODAVÍA NO HAY METAS GUARDADAS.</p>
            </div>
          </section>
          <section class="challenge-history-group">
            <button id="streakHistoryToggle" class="challenge-library-toggle" type="button" aria-expanded="false">
              <span><small>HISTORIAL</small><strong>WIN STREAK</strong></span><i class="challenge-open-chevron" aria-hidden="true"></i>
            </button>
            <div id="streakHistoryBody" class="challenge-history-body" hidden>
              <div id="streakHistory" class="challenge-history-list"></div><p id="streakHistoryEmpty" class="challenge-empty">TODAVÍA NO HAY WIN STREAKS GUARDADAS.</p>
            </div>
          </section>
        </div>
      </section>`;
    const anchor=document.getElementById('streamGiveawaysPanel');anchor?.parentNode.insertBefore(panel,anchor);
    arrangeChallengeInline();
  }

  function arrangeChallengeInline(){
    const goalButton=$('goalConfigureOpen'),streakButton=$('streakConfigureOpen');
    const goalRow=goalButton?.closest('.challenge-row'),streakRow=streakButton?.closest('.challenge-row');
    if(goalRow&&!$('goalInlineArea')){
      const wrap=document.createElement('div');wrap.id='goalInlineArea';wrap.className='challenge-inline-area';wrap.hidden=true;
      goalRow.insertAdjacentElement('afterend',wrap);['goalConfigurator','goalActiveBox','goalOutput'].forEach(id=>{const el=$(id);if(el)wrap.appendChild(el)});
    }
    if(streakRow&&!$('streakInlineArea')){
      const wrap=document.createElement('div');wrap.id='streakInlineArea';wrap.className='challenge-inline-area';wrap.hidden=true;
      streakRow.insertAdjacentElement('afterend',wrap);['streakPanel'].forEach(id=>{const el=$(id);if(el)wrap.appendChild(el)});
    }
  }

  function setSelect(select,value){
    if(!select)return;const next=normalizeRole(value);if(select.value===next)return;syncing=true;try{select.value=next;select.dispatchEvent(new Event('change',{bubbles:true}))}finally{syncing=false}
  }

  function readConfig(){
    const role=normalizeRole($('goalRole')?.value),target=Math.max(1,Math.min(999999999,Math.floor(Number($('goalTarget')?.value)||10)));
    const title=String($('goalTitle')?.value||'').trim()||'META';
    return{title,role,target};
  }

  function readLive(){
    const role=normalizeRole($('goalLiveRole')?.value),current=Math.max(0,Math.min(999999999,Math.floor(Number($('goalLiveCurrent')?.value)||0))),target=Math.max(1,Math.min(999999999,Math.floor(Number($('goalLiveTarget')?.value)||1)));
    const title=String($('goalLiveTitle')?.value||'').trim()||'META';
    return{title,role,current,target};
  }

  async function writeOverlay(patch){
    const overlay=goalOverlay(),ws=workspace();if(!client||!overlay||!ws)throw new Error('La META todavía no está disponible para este espacio.');
    const update={updated_at:new Date().toISOString()};if(patch.settings)update.settings=patch.settings;if(patch.state)update.state=patch.state;
    const {data,error}=await client.from('stream_overlays').update(update).eq('id',overlay.id).eq('workspace_id',ws.id).select('*').single();
    if(error||!data)throw error||new Error('No se pudo guardar la META.');
    if(workspace()?.id!==ws.id||goalOverlay()?.id!==overlay.id)return overlay;
    const currentOverlay=goalOverlay();if(patch.settings)currentOverlay.settings=data.settings;if(patch.state)currentOverlay.state=data.state;
    if(patch.settings)overlay.settings=data.settings;if(patch.state)overlay.state=data.state;
    window.dispatchEvent(new CustomEvent('sanlean:challenge-goal',{detail:{id:overlay.id,state:overlay.state,settings:overlay.settings}}));window.dispatchEvent(new CustomEvent('sanlean:overlays-updated'));return overlay;
  }

  async function startGoal(){
    if(busy)return;const overlay=goalOverlay();if(!overlay)return;$('goalConfigStatus').textContent='';const form=readConfig();busy=true;try{
      if(!tools()?.isOwner?.())throw new Error('La configuración de la META pertenece al propietario del stream.');
      const now=new Date().toISOString(),settings={...(overlay.settings||{}),title:form.title,role:form.role,target:form.target},state={visible:true,status:'active',current:0,target:form.target,title:form.title,role:form.role,startedAt:now,updatedAt:now};
      await writeOverlay({settings,state});$('goalConfigStatus').textContent='';$('goalActiveStatus').textContent='';
    }catch(err){$('goalConfigStatus').textContent=err.message||'No se pudo iniciar la meta.'}finally{busy=false;refresh()}
  }

  function saveLive({silent=false}={}){
    cancelLiveTimer();
    const form=readLive(),version=editVersion,key=contextKey();
    const save=async()=>{
      const overlay=goalOverlay();if(key!==contextKey()||!overlay||!isLive(overlay))return false;
      const status=form.current>=form.target?'reached':'active',settings={...(overlay.settings||{}),title:form.title,role:form.role,target:form.target},state={...overlay.state,...form,visible:overlay.state?.visible!==false,status,updatedAt:new Date().toISOString()};
      delete state.finishedAt;
      await writeOverlay({settings,state});
      if(key!==contextKey())return false;
      if(version===editVersion)dirty=false;
      if(!silent)$('goalActiveStatus').textContent='Cambios guardados.';
      refresh();return true;
    };
    const result=saveQueue.then(save);saveQueue=result.catch(()=>{});return result;
  }

  async function changeProgress(delta){
    if(busy)return;const overlay=goalOverlay();if(!overlay||!isLive(overlay))return;const base=Math.max(0,Number($('goalLiveCurrent')?.value)||0),current=Math.max(0,Math.min(999999999,base+delta));$('goalLiveCurrent').value=String(current);dirty=true;editVersion++;busy=true;refresh();try{await saveLive({silent:true})}catch(err){$('goalActiveStatus').textContent=err.message||'No se pudo actualizar el contador.'}finally{busy=false;refresh()}
  }

  async function toggleGoalObs(){
    if(busy)return;const overlay=goalOverlay();if(!overlay||!isLive(overlay))return;busy=true;
    try{
      const visible=overlay.state?.visible===false;
      await writeOverlay({state:{...overlay.state,visible,updatedAt:new Date().toISOString()}});
    }catch(err){$('goalActiveStatus').textContent=err.message||'No se pudo cambiar la visibilidad en OBS.'}finally{busy=false;refresh()}
  }

  async function finishGoal(){
    if(busy)return;const overlay=goalOverlay();if(!overlay||!isLive(overlay))return;cancelLiveTimer();busy=true;refresh();try{
      if(!await saveLive({silent:true}))return;const latest=goalOverlay(),finishedAt=new Date().toISOString(),record={title:latest.state.title,role:latest.state.role,current:Number(latest.state.current)||0,target:Number(latest.state.target)||1,startedAt:latest.state.startedAt||null,finishedAt,reached:(Number(latest.state.current)||0)>=(Number(latest.state.target)||1)},history=[...(Array.isArray(latest.settings?.history)?latest.settings.history:[]),record].slice(-20),settings={...(latest.settings||{}),history},state={...latest.state,visible:false,status:'finished',finishedAt,updatedAt:finishedAt};
      await writeOverlay({settings,state});$('goalActiveStatus').textContent='';$('goalConfigStatus').textContent='';
    }catch(err){$('goalActiveStatus').textContent=err.message||'No se pudo finalizar la meta.'}finally{busy=false;refresh()}
  }


  function formatHistoryDate(value){
    if(!value)return'—';const d=new Date(value);if(Number.isNaN(d.getTime()))return'—';
    return new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d);
  }

  function syncChallengeButtons(){
    [['goal',$('goalConfigureOpen')],['streak',$('streakConfigureOpen')]].forEach(([key,button])=>{
      if(!button)return;const open=activeChallenge===key;button.setAttribute('aria-expanded',String(open));const label=button.querySelector('span');if(label)label.textContent=open?'CERRAR':'ABRIR';
    });
    if($('goalInlineArea'))$('goalInlineArea').hidden=activeChallenge!=='goal';
    if($('streakInlineArea'))$('streakInlineArea').hidden=activeChallenge!=='streak';
    const master=$('challengeHistoryToggle');if(master){master.setAttribute('aria-expanded',String(historyOpen));$('challengeHistoryBody').hidden=!historyOpen}
    const goalHistory=$('goalHistoryToggle');if(goalHistory){goalHistory.setAttribute('aria-expanded',String(goalHistoryOpen));$('goalHistoryBody').hidden=!goalHistoryOpen}
    const streakHistory=$('streakHistoryToggle');if(streakHistory){streakHistory.setAttribute('aria-expanded',String(streakHistoryOpen));$('streakHistoryBody').hidden=!streakHistoryOpen}
  }

  function populateGoalConfig(){
    const overlay=goalOverlay(),settings=overlay?.settings||{};$('goalConfigStatus').textContent='';$('goalActiveStatus').textContent='';
    if(settings.title)$('goalTitle').value=settings.title;setSelect($('goalRole'),settings.role||'killer');$('goalTarget').value=String(Math.max(1,Number(settings.target)||10));
  }

  async function setChallengeOpen(key){
    const closing=activeChallenge===key;activeChallenge=closing?'':key;
    if(activeChallenge==='goal'&&!isLive(goalOverlay()))populateGoalConfig();
    if(activeChallenge==='streak'){
      await loadStreakKillers();streakConfigInitialized=false;initializeStreakConfig();refreshStreak();
    }
    syncChallengeButtons();refresh();
    if(activeChallenge){const target=activeChallenge==='goal'?(isLive(goalOverlay())?$('goalActiveBox'):$('goalConfigurator')):$('streakPanel');setTimeout(()=>target?.scrollIntoView({behavior:'smooth',block:'nearest'}),40)}
  }

  function initializeStreakConfig(){
    if(streakConfigInitialized||isStreakSession(streakOverlay()))return;
    const settings=streakOverlay()?.settings||{},role=settings.role==='killer'?'killer':'survivor';
    setSelect($('streakRole'),role);
    selectedStreakKiller=settings.killer?streakKillers.find(k=>k.key===settings.killer.key)||settings.killer:null;
    streakConfigInitialized=true;syncStreakSelection();renderStreakKillers();
  }

  function streakLayout(){
    const settings=streakOverlay()?.settings||{},state=streakOverlay()?.state||{};
    return (state.layout||settings.layout)==='image-right'?'image-right':'image-left';
  }

  function syncStreakLayoutButtons(layout=streakLayout()){
    const right=layout==='image-right';
    $('streakLayoutLeft')?.setAttribute('aria-pressed',String(!right));
    $('streakLayoutRight')?.setAttribute('aria-pressed',String(right));
  }

  async function setStreakLayout(layout){
    if(streakBusy)return;const overlay=streakOverlay();if(!overlay)return;
    const next=layout==='image-right'?'image-right':'image-left';syncStreakLayoutButtons(next);
    streakBusy=true;
    try{
      const settings={...(overlay.settings||{}),layout:next},patch={settings};
      if(isStreakSession(overlay))patch.state={...overlay.state,layout:next,updatedAt:new Date().toISOString()};
      await writeStreakOverlay(patch);
    }catch(err){$('streakStatus').textContent=err.message||'No se pudo guardar la distribución.'}finally{streakBusy=false;refreshStreak()}
  }

  async function loadStreakKillers(){
    if(streakKillers.length)return streakKillers;
    try{
      const response=await fetch('../data/killers.json',{cache:'no-store'});if(!response.ok)throw new Error('No se pudo cargar el catálogo de Killers.');
      const raw=await response.json();
      streakKillers=raw.filter(k=>k?.key&&k?.name&&k?.image).map(k=>({...k,image:'../'+String(k.image).replace(/^\.\.\//,'').replace(/^\//,''),search:normalizeSearch(`${k.key} ${k.name} ${killerAliases[k.key]||''}`)}));
      return streakKillers;
    }catch(err){$('streakStatus').textContent=err.message||'No se pudo cargar el catálogo de Killers.';return[]}
  }

  function renderStreakKillers(){
    const list=$('streakKillerResults');if(!list)return;const words=normalizeSearch($('streakKillerSearch')?.value).split(' ').filter(Boolean);
    const matches=streakKillers.filter(k=>words.every(w=>k.search.includes(w)));
    list.innerHTML=matches.map(k=>`<button type="button" class="challenge-killer-option${selectedStreakKiller?.key===k.key?' is-selected':''}" data-killer="${escape(k.key)}"><img src="${escape(k.image)}" alt=""><span>${escape(k.name)}</span></button>`).join('');
    list.querySelectorAll('[data-killer]').forEach(button=>button.addEventListener('click',()=>{
      selectedStreakKiller=streakKillers.find(k=>k.key===button.dataset.killer)||null;renderStreakKillers();syncStreakSelection();$('streakStatus').textContent='';
    }));
  }

  function syncStreakSelection(){
    const role=$('streakRole')?.value||'survivor',picker=$('streakKillerPicker'),label=$('streakKillerSelected'),start=$('streakStart');
    if(picker)picker.hidden=role!=='killer';
    if(label)label.textContent=selectedStreakKiller?`SELECCIONADO: ${selectedStreakKiller.name}`:'Seleccioná un Killer para iniciar la racha.';
    if(start)start.disabled=streakBusy||!tools()?.isOwner?.()||(role==='killer'&&!selectedStreakKiller);
  }

  async function writeStreakOverlay(patch){
    const overlay=streakOverlay(),ws=workspace();if(!client||!overlay||!ws)throw new Error('WIN STREAK todavía no está disponible para este espacio.');
    const update={updated_at:new Date().toISOString()};if(patch.settings)update.settings=patch.settings;if(patch.state)update.state=patch.state;
    const {data,error}=await client.from('stream_overlays').update(update).eq('id',overlay.id).eq('workspace_id',ws.id).select('*').single();
    if(error||!data)throw error||new Error('No se pudo guardar WIN STREAK.');
    const current=streakOverlay();if(current){if(patch.settings)current.settings=data.settings;if(patch.state)current.state=data.state}
    window.dispatchEvent(new CustomEvent('sanlean:challenge-streak',{detail:{id:overlay.id,state:data.state,settings:data.settings}}));window.dispatchEvent(new CustomEvent('sanlean:overlays-updated'));return data;
  }

  async function startStreak(){
    if(streakBusy)return;const overlay=streakOverlay();if(!overlay)return;$('streakStatus').textContent='';
    const role=$('streakRole')?.value==='killer'?'killer':'survivor';if(role==='killer'&&!selectedStreakKiller){$('streakStatus').textContent='Seleccioná un Killer antes de iniciar.';return}
    streakBusy=true;refreshStreak();
    try{
      if(!tools()?.isOwner?.())throw new Error('La configuración de WIN STREAK pertenece al propietario del stream.');
      const killer=role==='killer'?{key:selectedStreakKiller.key,name:selectedStreakKiller.name,image:selectedStreakKiller.image}:null,now=new Date().toISOString(),layout=streakLayout();
      const settings={...(overlay.settings||{}),role,killer,layout},state={visible:true,status:'active',current:0,role,killer,layout,startedAt:now,updatedAt:now};
      await writeStreakOverlay({settings,state});
    }catch(err){$('streakStatus').textContent=err.message||'No se pudo iniciar WIN STREAK.'}finally{streakBusy=false;refreshStreak()}
  }

  function saveStreakCurrent(value=null){
    clearTimeout(streakSaveTimer);const overlay=streakOverlay();if(!overlay||!isStreakSession(overlay))return Promise.resolve(false);
    const source=value===null?$('streakCurrent')?.value:value,current=Math.max(0,Math.min(999999999,Math.floor(Number(source)||0))),state={...overlay.state,current,visible:overlay.state?.visible!==false,status:overlay.state?.status||'active',updatedAt:new Date().toISOString()};
    if($('streakCurrent'))$('streakCurrent').value=String(current);
    return writeStreakOverlay({state}).then(()=>true);
  }

  async function changeStreak(delta){
    if(streakBusy)return;const overlay=streakOverlay();if(!overlay||!isStreakLive(overlay))return;
    const base=Math.max(0,Number($('streakCurrent')?.value)||0),next=Math.max(0,Math.min(999999999,base+delta));$('streakCurrent').value=String(next);streakBusy=true;
    try{await saveStreakCurrent(next)}catch(err){$('streakStatus').textContent=err.message||'No se pudo actualizar la racha.'}finally{streakBusy=false;refreshStreak()}
  }

  async function resetStreak(){
    if(streakBusy||!isStreakLive(streakOverlay()))return;streakBusy=true;$('streakCurrent').value='0';
    try{await saveStreakCurrent(0)}catch(err){$('streakStatus').textContent=err.message||'No se pudo reiniciar la racha.'}finally{streakBusy=false;refreshStreak()}
  }

  async function pauseStreak(){
    if(streakBusy)return;const overlay=streakOverlay();if(!overlay||!isStreakLive(overlay))return;streakBusy=true;
    try{
      clearTimeout(streakSaveTimer);if(isStreakLive(overlay)){const current=Math.max(0,Number($('streakCurrent')?.value)||0);await saveStreakCurrent(current)}
      const latest=streakOverlay();await writeStreakOverlay({state:{...latest.state,visible:false,status:'paused',pausedAt:new Date().toISOString(),updatedAt:new Date().toISOString()}});
      $('streakStatus').textContent='';
    }catch(err){$('streakStatus').textContent=err.message||'No se pudo pausar WIN STREAK.'}finally{streakBusy=false;refreshStreak()}
  }

  async function continueStreak(){
    if(streakBusy)return;const overlay=streakOverlay();if(!overlay||!isStreakPaused(overlay))return;streakBusy=true;
    try{
      await writeStreakOverlay({state:{...overlay.state,visible:true,status:'active',resumedAt:new Date().toISOString(),updatedAt:new Date().toISOString()}});
      $('streakStatus').textContent='';
    }catch(err){$('streakStatus').textContent=err.message||'No se pudo continuar WIN STREAK.'}finally{streakBusy=false;refreshStreak()}
  }

  async function toggleStreakObs(){
    if(streakBusy)return;const overlay=streakOverlay();if(!overlay||!isStreakSession(overlay)||isStreakPaused(overlay))return;streakBusy=true;
    try{
      const visible=overlay.state?.visible===false;
      await writeStreakOverlay({state:{...overlay.state,visible,updatedAt:new Date().toISOString()}});
    }catch(err){$('streakStatus').textContent=err.message||'No se pudo cambiar la visibilidad en OBS.'}finally{streakBusy=false;refreshStreak()}
  }

  async function finishStreak(){
    if(streakBusy)return;const overlay=streakOverlay();if(!overlay||!isStreakSession(overlay))return;streakBusy=true;
    try{
      clearTimeout(streakSaveTimer);const current=Math.max(0,Number($('streakCurrent')?.value)||0);await saveStreakCurrent(current);
      const latest=streakOverlay(),finishedAt=new Date().toISOString(),record={role:latest.state.role||'survivor',killer:latest.state.killer||null,current:Number(latest.state.current)||0,startedAt:latest.state.startedAt||null,finishedAt};
      const history=[...(Array.isArray(latest.settings?.history)?latest.settings.history:[]),record].slice(-30),settings={...(latest.settings||{}),history};
      await writeStreakOverlay({settings,state:{...latest.state,visible:false,status:'finished',finishedAt,updatedAt:finishedAt}});
      streakConfigInitialized=false;selectedStreakKiller=null;$('streakStatus').textContent='';
    }catch(err){$('streakStatus').textContent=err.message||'No se pudo finalizar WIN STREAK.'}finally{streakBusy=false;initializeStreakConfig();refreshStreak();renderStreakHistory(streakOverlay())}
  }

  function refreshStreak(){
    const panel=$('streakPanel');if(!panel)return;
    const open=activeChallenge==='streak',overlay=streakOverlay(),session=isStreakSession(overlay),paused=isStreakPaused(overlay),state=overlay?.state||{};
    panel.hidden=!open;$('streakConfig').hidden=session;$('streakLive').hidden=!session;
    if(!open)return;
    if(!session){
      initializeStreakConfig();syncStreakSelection();renderStreakKillers();syncStreakLayoutButtons();
    }else{
      const current=$('streakCurrent');if(current&&document.activeElement!==current&&!streakBusy)current.value=String(Math.max(0,Number(state.current)||0));
      $('streakLiveName').textContent=state.role==='killer'?(state.killer?.name||'KILLER'):'SUPERVIVIENTE';
      ['streakCurrent','streakMinus','streakPlus','streakReset','streakPause','streakObsToggle','streakFinish','streakLayoutLeft','streakLayoutRight'].forEach(id=>{if($(id))$(id).disabled=streakBusy});
      if($('streakMinus'))$('streakMinus').disabled=streakBusy||paused||(Number(state.current)||0)<=0;
      if($('streakPlus'))$('streakPlus').disabled=streakBusy||paused;
      if($('streakReset'))$('streakReset').disabled=streakBusy||paused;
      if($('streakCurrent'))$('streakCurrent').disabled=streakBusy||paused;
      const sessionState=$('streakSessionState');if(sessionState)sessionState.textContent=paused?'WIN STREAK PAUSADA':'WIN STREAK ACTIVA';
      const pauseBtn=$('streakPause');if(pauseBtn){pauseBtn.textContent=paused?'CONTINUAR':'PAUSAR';pauseBtn.disabled=streakBusy}
      const obsBtn=$('streakObsToggle');if(obsBtn){obsBtn.textContent=paused?'OCULTO EN PAUSA':(state.visible===false?'MOSTRAR EN OBS':'OCULTAR EN OBS');obsBtn.disabled=streakBusy||paused}
      window.SanLeanChallengeStreakView?.render($('streakUserPreview'),overlay,{preview:true});syncStreakLayoutButtons();
    }
    syncStreakSelection();
  }

  function renderStreakHistory(overlay){
    const list=$('streakHistory'),empty=$('streakHistoryEmpty');if(!list||!empty)return;
    const history=Array.isArray(overlay?.settings?.history)?[...overlay.settings.history].reverse():[];empty.hidden=history.length>0;
    list.innerHTML=history.map(x=>`<div class="challenge-history-row streak-history-row"><strong>${escape(x.role==='killer'?(x.killer?.name||'KILLER'):'SUPERVIVIENTE')}</strong><span>${x.role==='killer'?'KILLER':'ESCAPES'}</span><b>RACHA ${Number(x.current)||0}</b><time>${formatHistoryDate(x.finishedAt)}</time></div>`).join('');
  }

  function renderHistory(overlay){
    const list=$('goalHistory'),empty=$('goalHistoryEmpty');if(!list||!empty)return;
    const history=Array.isArray(overlay?.settings?.history)?[...overlay.settings.history].reverse():[];empty.hidden=history.length>0;
    list.innerHTML=history.map(x=>`<div class="challenge-history-row"><strong>${escape(x.title||'META')}</strong><span>${escape(roleLabel(x.role))}</span><b>${Number(x.current)||0}/${Number(x.target)||0}</b><time>${formatHistoryDate(x.finishedAt)}</time></div>`).join('');
  }

  function syncLiveFields(state,force=false){
    const title=$('goalLiveTitle'),current=$('goalLiveCurrent'),target=$('goalLiveTarget');
    if(title&&(force||document.activeElement!==title))title.value=state.title||'META';
    if(current&&(force||document.activeElement!==current))current.value=String(Math.max(0,Number(state.current)||0));
    if(target&&(force||document.activeElement!==target))target.value=String(Math.max(1,Number(state.target)||1));
    setSelect($('goalLiveRole'),state.role||'killer');
  }

  function refresh(){
    const key=contextKey(),changed=key!==activeKey;if(changed){cancelLiveTimer();dirty=false;editVersion++;activeKey=key;$('goalActiveStatus').textContent='';$('goalConfigStatus').textContent=''}
    const overlay=goalOverlay(),owner=!!tools()?.isOwner?.(),live=isLive(overlay),state=overlay?.state||{},goalOpen=activeChallenge==='goal',config=$('goalConfigurator');
    if(config)config.hidden=!goalOpen||live;$('goalActiveBox').hidden=!goalOpen||!live;$('goalOutput').hidden=!goalOpen||!live||!overlay;
    ['goalTitle','goalRole','goalTarget'].forEach(id=>{if($(id))$(id).disabled=busy||!owner});if($('goalStart'))$('goalStart').disabled=busy||!owner;
    if(live){if(!dirty)syncLiveFields(state,changed);['goalLiveTitle','goalLiveRole','goalLiveCurrent','goalLiveTarget','goalMinus','goalPlus','goalSaveLive','goalObsToggle','goalFinish'].forEach(id=>{if($(id))$(id).disabled=busy});if($('goalMinus'))$('goalMinus').disabled=busy||(Number(state.current)||0)<=0;const obsBtn=$('goalObsToggle');if(obsBtn)obsBtn.textContent=state.visible===false?'MOSTRAR EN OBS':'OCULTAR EN OBS'}
    if(overlay&&goalOpen&&live){const publicUrl=`${location.origin}/Usuario/overlay.html?token=${encodeURIComponent(overlay.public_token||'')}`;$('goalObsUrl').value=publicUrl;window.SanLeanChallengeGoalView?.render($('goalPreview'),dirty?{...overlay,state:{...state,...readLive()}}:overlay,{preview:true})}
    if(!goalOpen||!live){if(!live){cancelLiveTimer();dirty=false}$('goalPreview')._goalResizeObserver?.disconnect();$('goalPreview').replaceChildren();$('goalObsUrl').value='';if(!live)$('goalActiveStatus').textContent=''}
    renderHistory(overlay);renderStreakHistory(streakOverlay());refreshStreak();syncChallengeButtons();
  }

  function scheduleLiveSave(){
    if(syncing||busy||!isLive(goalOverlay()))return;
    dirty=true;editVersion++;cancelLiveTimer();$('goalActiveStatus').textContent='';
    const draft=readLive();window.SanLeanChallengeGoalView?.render($('goalPreview'),{settings:goalOverlay().settings,state:{...goalOverlay().state,...draft}},{preview:true});
    const key=contextKey();
    liveSaveTimer=setTimeout(async()=>{liveSaveTimer=null;if(key!==contextKey()||busy||!isLive(goalOverlay()))return;try{await saveLive({silent:true})}catch(err){if(key===contextKey())$('goalActiveStatus').textContent=err.message||'No se pudieron guardar los cambios.'}},320);
  }

  function bind(){
    $('goalConfigureOpen')?.addEventListener('click',()=>setChallengeOpen('goal'));
    $('streakConfigureOpen')?.addEventListener('click',()=>setChallengeOpen('streak'));
    $('challengeHistoryToggle')?.addEventListener('click',()=>{historyOpen=!historyOpen;syncChallengeButtons()});$('goalHistoryToggle')?.addEventListener('click',()=>{goalHistoryOpen=!goalHistoryOpen;syncChallengeButtons()});$('streakHistoryToggle')?.addEventListener('click',()=>{streakHistoryOpen=!streakHistoryOpen;syncChallengeButtons()});
    $('goalStart')?.addEventListener('click',startGoal);
    $('goalMinus')?.addEventListener('click',()=>changeProgress(-1));$('goalPlus')?.addEventListener('click',()=>changeProgress(1));['goalLiveTitle','goalLiveCurrent','goalLiveTarget'].forEach(id=>$(id)?.addEventListener('input',scheduleLiveSave));$('goalLiveRole')?.addEventListener('change',scheduleLiveSave);
    $('goalSaveLive')?.addEventListener('click',async()=>{if(busy)return;busy=true;refresh();try{await saveLive()}catch(err){$('goalActiveStatus').textContent=err.message||'No se pudieron guardar los cambios.'}finally{busy=false;refresh()}});
    $('goalObsToggle')?.addEventListener('click',toggleGoalObs);$('goalFinish')?.addEventListener('click',finishGoal);
    $('goalCopyUrl')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('goalObsUrl').value);$('goalActiveStatus').textContent='URL de OBS copiada.'}catch{$('goalActiveStatus').textContent='No se pudo copiar la URL.'}});
    $('streakRole')?.addEventListener('change',()=>{if(syncing)return;if($('streakRole').value!=='killer')selectedStreakKiller=null;syncStreakSelection();renderStreakKillers();$('streakStatus').textContent=''});
    $('streakKillerSearch')?.addEventListener('input',renderStreakKillers);
    $('streakLayoutLeft')?.addEventListener('click',()=>setStreakLayout('image-left'));$('streakLayoutRight')?.addEventListener('click',()=>setStreakLayout('image-right'));
    $('streakStart')?.addEventListener('click',startStreak);$('streakMinus')?.addEventListener('click',()=>changeStreak(-1));$('streakPlus')?.addEventListener('click',()=>changeStreak(1));$('streakReset')?.addEventListener('click',resetStreak);$('streakPause')?.addEventListener('click',()=>isStreakPaused(streakOverlay())?continueStreak():pauseStreak());$('streakObsToggle')?.addEventListener('click',toggleStreakObs);$('streakFinish')?.addEventListener('click',finishStreak);
    $('streakCurrent')?.addEventListener('input',()=>{if(!isStreakLive(streakOverlay()))return;clearTimeout(streakSaveTimer);streakSaveTimer=setTimeout(()=>saveStreakCurrent().catch(err=>$('streakStatus').textContent=err.message||'No se pudo actualizar la racha.'),320)});
    window.addEventListener('sanlean:overlays-updated',()=>{refresh();refreshStreak()});window.addEventListener('sanlean:challenge-goal',refresh);window.addEventListener('sanlean:challenge-streak',refreshStreak);window.addEventListener('sanlean:section',()=>{refresh();refreshStreak()});
  }

  function install(){installPanel();arrangeChallengeInline();bind();syncChallengeButtons();loadStreakKillers().then(()=>{initializeStreakConfig();refreshStreak()});refresh();setTimeout(()=>{renderStreakHistory(streakOverlay());refresh();refreshStreak();if(location.hash==='#challenges')window.SanLeanUsuarioNavigation?.show?.('challenges',{updateHash:false})},250)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,40),{once:true});else setTimeout(install,40);
})();