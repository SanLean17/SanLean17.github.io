(()=>{
  const cfg=window.SANLEAN_SUPABASE;
  const client=cfg&&window.supabase?window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
  const $=id=>document.getElementById(id),tools=()=>window.SanLeanStreamTools;
  let busy=false;
  const goalOverlay=()=>tools()?.getOverlays?.().find(o=>o.kind==='challenge_goal')||null;
  const workspace=()=>tools()?.getWorkspace?.()||null;
  const isLive=o=>['active','reached'].includes(o?.state?.status);
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const roleLabel=role=>role==='both'?'KILLER + SUPERVIVIENTE':role==='survivor'?'SUPERVIVIENTE':'KILLER';
  const normalizeRole=value=>['killer','survivor','both'].includes(value)?value:'killer';

  function installPanel(){
    if(document.getElementById('streamChallengesPanel'))return;
    const panel=document.createElement('section');panel.id='streamChallengesPanel';panel.className='stream-module challenges-panel';panel.hidden=true;
    panel.innerHTML=`<div class="stream-module-head"></div>
      <section id="challengeSelector" class="module-box challenge-selector">
        <div class="challenge-row"><div class="challenge-copy"><h3>METAS</h3><p>Creá un contador manual para el objetivo que quieras mostrar durante el stream.</p></div><div class="module-actions"><button id="goalConfigureOpen" class="module-secondary" type="button">CONFIGURAR</button></div></div>
        <div class="challenge-row"><div class="challenge-copy"><h3>WIN STREAK</h3><p>Buscá tu mejor racha con un Killer, Survivor o selección libre.</p></div><div class="module-actions"><button class="module-secondary" type="button" disabled>PRÓXIMAMENTE</button></div></div>
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
        <div class="challenge-active-head"><div><span>META ACTIVA</span><h3>CONTROL</h3></div><strong id="goalState" class="challenge-state is-active">ACTIVA</strong></div>
        <div class="challenge-live-form">
          <label class="challenge-live-title">NOMBRE DE LA META<input id="goalLiveTitle" type="text" maxlength="42"></label>
          <label>ROL<select id="goalLiveRole"><option value="killer">KILLER</option><option value="survivor">SUPERVIVIENTE</option><option value="both">AMBOS</option></select></label>
          <div class="challenge-live-progress"><span class="challenge-live-label">PROGRESO ACTUAL</span><div class="challenge-progress-edit"><button id="goalMinus" class="ui-btn ui-btn-secondary challenge-step" type="button">−1</button><input id="goalLiveCurrent" type="number" min="0" max="999999999" step="1"><button id="goalPlus" class="ui-btn ui-btn-primary challenge-step" type="button">+1</button></div></div>
          <label>OBJETIVO<input id="goalLiveTarget" type="number" min="1" max="999999999" step="1"></label>
        </div>
        <div class="module-actions challenge-active-actions"><button id="goalSaveLive" class="module-primary" type="button">GUARDAR CAMBIOS</button><button id="goalFinish" class="module-secondary challenge-danger" type="button">FINALIZAR META</button></div>
        <p id="goalActiveStatus" class="module-status" role="status"></p>
      </section>

      <section id="goalOutput" class="stream-output-box challenge-goal-output" hidden>
        <div class="stream-output-head"><div><span>OBS</span><h3>VISTA DE LA META</h3><p>La vista se actualiza con cada cambio. Cuando subas los iconos finales se mostrarán automáticamente según el nombre y el rol.</p></div></div>
        <div class="stream-output-grid"><div id="goalPreview" class="stream-preview-frame"></div><div class="stream-output-side"><div class="stream-output-field"><label>URL OBS · VISUALIZACIÓN</label><div class="stream-output-url"><input id="goalObsUrl" type="text" readonly><button id="goalCopyUrl" type="button">COPIAR</button></div></div><p class="stream-output-note">Fuente de navegador recomendada: 1920 × 1080, fondo transparente.</p></div></div>
      </section>

      <section class="module-box challenge-library"><div class="challenge-section-head"><div><span>HISTORIAL</span><h3>MIS METAS</h3></div><small>Se guarda el nombre, rol y resultado final de cada meta de este espacio.</small></div><div id="goalHistory" class="challenge-history-list"></div><p id="goalHistoryEmpty" class="challenge-empty">TODAVÍA NO HAY METAS GUARDADAS.</p></section>`;
    const anchor=document.getElementById('streamGiveawaysPanel');anchor?.parentNode.insertBefore(panel,anchor);
  }

  function setSelect(select,value){
    if(!select)return;const next=normalizeRole(value);if(select.value===next)return;select.value=next;select.dispatchEvent(new Event('change',{bubbles:true}));
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
    if(patch.settings)overlay.settings=patch.settings;if(patch.state)overlay.state=patch.state;
    window.dispatchEvent(new CustomEvent('sanlean:challenge-goal',{detail:{id:overlay.id,state:overlay.state,settings:overlay.settings}}));window.dispatchEvent(new CustomEvent('sanlean:overlays-updated'));return overlay;
  }

  async function startGoal(){
    if(busy)return;const overlay=goalOverlay();if(!overlay)return;$('goalConfigStatus').textContent='';const form=readConfig();busy=true;try{
      if(!tools()?.isOwner?.())throw new Error('La configuración de la META pertenece al propietario del stream.');
      const now=new Date().toISOString(),settings={...(overlay.settings||{}),title:form.title,role:form.role,target:form.target},state={visible:true,status:'active',current:0,target:form.target,title:form.title,role:form.role,startedAt:now,updatedAt:now};
      await writeOverlay({settings,state});$('goalConfigStatus').textContent='Meta iniciada y visible en OBS.';
    }catch(err){$('goalConfigStatus').textContent=err.message||'No se pudo iniciar la meta.'}finally{busy=false;refresh()}
  }

  async function saveLive({silent=false}={}){
    const overlay=goalOverlay();if(!overlay||!isLive(overlay))return false;const form=readLive(),status=form.current>=form.target?'reached':'active',settings={...(overlay.settings||{}),title:form.title,role:form.role,target:form.target},state={...overlay.state,visible:true,title:form.title,role:form.role,current:form.current,target:form.target,status,updatedAt:new Date().toISOString()};
    await writeOverlay({settings,state});if(!silent)$('goalActiveStatus').textContent='Cambios guardados.';return true;
  }

  async function changeProgress(delta){
    if(busy)return;const overlay=goalOverlay();if(!overlay||!isLive(overlay))return;const current=Math.max(0,(Number(overlay.state.current)||0)+delta);$('goalLiveCurrent').value=String(current);busy=true;try{await saveLive({silent:true})}catch(err){$('goalActiveStatus').textContent=err.message||'No se pudo actualizar el contador.'}finally{busy=false;refresh()}
  }

  async function finishGoal(){
    if(busy)return;const overlay=goalOverlay();if(!overlay||!isLive(overlay))return;busy=true;try{
      await saveLive({silent:true});const latest=goalOverlay(),finishedAt=new Date().toISOString(),record={title:latest.state.title,role:latest.state.role,current:Number(latest.state.current)||0,target:Number(latest.state.target)||1,startedAt:latest.state.startedAt||null,finishedAt,reached:(Number(latest.state.current)||0)>=(Number(latest.state.target)||1)},history=[...(Array.isArray(latest.settings?.history)?latest.settings.history:[]),record].slice(-20),settings={...(latest.settings||{}),history},state={...latest.state,visible:false,status:'finished',finishedAt,updatedAt:finishedAt};
      await writeOverlay({settings,state});$('goalActiveStatus').textContent='Meta finalizada.';
    }catch(err){$('goalActiveStatus').textContent=err.message||'No se pudo finalizar la meta.'}finally{busy=false;refresh()}
  }

  function renderHistory(overlay){
    const list=$('goalHistory'),empty=$('goalHistoryEmpty');if(!list||!empty)return;const history=Array.isArray(overlay?.settings?.history)?[...overlay.settings.history].reverse():[];empty.hidden=history.length>0;list.innerHTML=history.map(x=>`<div class="challenge-history-row"><strong>${escape(x.title||'META')}</strong><span>${escape(roleLabel(x.role))}</span><b>${Number(x.current)||0}/${Number(x.target)||0}</b></div>`).join('');
  }

  function syncLiveFields(state){
    const title=$('goalLiveTitle'),current=$('goalLiveCurrent'),target=$('goalLiveTarget');
    if(title&&document.activeElement!==title)title.value=state.title||'META';
    if(current&&document.activeElement!==current)current.value=String(Math.max(0,Number(state.current)||0));
    if(target&&document.activeElement!==target)target.value=String(Math.max(1,Number(state.target)||1));
    setSelect($('goalLiveRole'),state.role||'killer');
  }

  function refresh(){
    const overlay=goalOverlay(),owner=!!tools()?.isOwner?.(),live=isLive(overlay),settings=overlay?.settings||{},state=overlay?.state||{},selector=$('challengeSelector'),config=$('goalConfigurator');
    if(selector)selector.hidden=live;if(config&&live)config.hidden=true;$('goalActiveBox').hidden=!live;$('goalOutput').hidden=!live||!overlay;
    ['goalTitle','goalRole','goalTarget'].forEach(id=>{if($(id))$(id).disabled=busy||!owner});if($('goalStart'))$('goalStart').disabled=busy||!owner;
    if(live){const reached=(Number(state.current)||0)>=(Number(state.target)||1);syncLiveFields(state);$('goalState').textContent=reached?'OBJETIVO ALCANZADO':'ACTIVA';$('goalState').className='challenge-state '+(reached?'is-reached':'is-active');['goalLiveTitle','goalLiveRole','goalLiveCurrent','goalLiveTarget','goalMinus','goalPlus','goalSaveLive','goalFinish'].forEach(id=>{if($(id))$(id).disabled=busy});if($('goalMinus'))$('goalMinus').disabled=busy||(Number(state.current)||0)<=0}
    if(overlay&&live){const publicUrl=`${location.origin}/Usuario/overlay.html?token=${encodeURIComponent(overlay.public_token||'')}`;$('goalObsUrl').value=publicUrl;window.SanLeanChallengeGoalView?.render($('goalPreview'),overlay,{preview:true})}
        renderHistory(overlay);
  }

  function bind(){
    $('goalConfigureOpen')?.addEventListener('click',()=>{const box=$('goalConfigurator'),overlay=goalOverlay(),settings=overlay?.settings||{};box.hidden=false;if(settings.title)$('goalTitle').value=settings.title;setSelect($('goalRole'),settings.role||'killer');$('goalTarget').value=String(Math.max(1,Number(settings.target)||10));refresh();box.scrollIntoView({behavior:'smooth',block:'start'})});
    $('goalStart')?.addEventListener('click',startGoal);
    $('goalMinus')?.addEventListener('click',()=>changeProgress(-1));$('goalPlus')?.addEventListener('click',()=>changeProgress(1));
    $('goalSaveLive')?.addEventListener('click',async()=>{if(busy)return;busy=true;try{await saveLive()}catch(err){$('goalActiveStatus').textContent=err.message||'No se pudieron guardar los cambios.'}finally{busy=false;refresh()}});
    $('goalFinish')?.addEventListener('click',finishGoal);
    $('goalCopyUrl')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('goalObsUrl').value);$('goalActiveStatus').textContent='URL de OBS copiada.'}catch{$('goalActiveStatus').textContent='No se pudo copiar la URL.'}});
    window.addEventListener('sanlean:overlays-updated',refresh);window.addEventListener('sanlean:challenge-goal',refresh);window.addEventListener('sanlean:section',refresh);
  }

  function install(){installPanel();bind();refresh();setTimeout(()=>{refresh();if(location.hash==='#challenges')window.SanLeanUsuarioNavigation?.show?.('challenges',{updateHash:false})},250)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,40),{once:true});else setTimeout(install,40);
})();