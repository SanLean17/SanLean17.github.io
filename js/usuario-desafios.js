(()=>{
  const cfg=window.SANLEAN_SUPABASE;
  const client=cfg&&window.supabase?window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
  const $=id=>document.getElementById(id),tools=()=>window.SanLeanStreamTools;
  let busy=false;
  const goalOverlay=()=>tools()?.getOverlays?.().find(o=>o.kind==='challenge_goal')||null;
  const workspace=()=>tools()?.getWorkspace?.()||null;
  const isLive=o=>['active','reached'].includes(o?.state?.status);
  const roleMetric=role=>role==='survivor'?'ESCAPES':'VICTORIAS';
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function installPanel(){
    if(document.getElementById('streamChallengesPanel'))return;
    const panel=document.createElement('section');panel.id='streamChallengesPanel';panel.className='stream-module challenges-panel';panel.hidden=true;
    panel.innerHTML=`<div class="stream-module-head"></div>
      <section class="module-box challenge-selector">
        <div class="challenge-row"><div class="challenge-copy"><h3>METAS</h3><p>Definí una cantidad de victorias o escapes, acumulativos o consecutivos.</p></div><div class="module-actions"><button id="goalConfigureOpen" class="module-secondary" type="button">CONFIGURAR</button></div></div>
        <div class="challenge-row"><div class="challenge-copy"><h3>WIN STREAK</h3><p>Buscá tu mejor racha con un Killer, Survivor o selección libre.</p></div><div class="module-actions"><button class="module-secondary" type="button" disabled>PRÓXIMAMENTE</button></div></div>
        <div class="challenge-row"><div class="challenge-copy"><h3>ALL KILLER CHALLENGE</h3><p>Completá el roster de Killers y elegí el siguiente con la ruleta.</p></div><div class="module-actions"><button class="module-secondary" type="button" disabled>PRÓXIMAMENTE</button></div></div>
        <div class="challenge-row"><div class="challenge-copy"><h3>ALL SURVIVOR CHALLENGE</h3><p>Completá el roster de Survivors y registrá cada escape.</p></div><div class="module-actions"><button class="module-secondary" type="button" disabled>PRÓXIMAMENTE</button></div></div>
      </section>

      <section id="goalConfigurator" class="module-box challenge-goal-config" hidden>
        <div class="challenge-config-head"><div><span>METAS</span><h3>CONFIGURACIÓN</h3><p>Prepará el contador antes de iniciar. La configuración pertenece al streamer de este espacio.</p></div></div>
        <div class="challenge-goal-form">
          <label>NOMBRE DE LA META<input id="goalTitle" type="text" maxlength="42" value="VICTORIAS SEGUIDAS" placeholder="EJ. 10 VICTORIAS SEGUIDAS"></label>
          <label>ROL<select id="goalRole"><option value="killer">KILLER</option><option value="survivor">SUPERVIVIENTE</option></select></label>
          <label>OBJETIVO<input id="goalTarget" type="number" min="1" max="999" step="1" value="10"></label>
          <div class="challenge-goal-mode cards-choice-field"><span class="cards-choice-label">TIPO DE META</span><div class="cards-segmented" role="group" aria-label="Tipo de meta"><button id="goalModeTotal" type="button" aria-pressed="false">ACUMULATIVA</button><button id="goalModeConsecutive" type="button" aria-pressed="true">CONSECUTIVA</button></div></div>
        </div>
        <div class="module-actions challenge-goal-actions"><button id="goalSave" class="module-secondary" type="button">GUARDAR CONFIGURACIÓN</button><button id="goalStart" class="module-primary" type="button">INICIAR META</button></div>
        <p id="goalConfigStatus" class="module-status" role="status"></p>
      </section>

      <section id="goalActiveBox" class="module-box challenge-goal-active" hidden>
        <div class="challenge-active-head"><div><span>DESAFÍO ACTIVO</span><h3 id="goalActiveTitle">META</h3></div><strong id="goalState" class="challenge-state is-active">ACTIVA</strong></div>
        <div class="challenge-counter-panel"><div class="challenge-counter-copy"><span id="goalMetricLabel">VICTORIAS</span><strong><span id="goalCurrent">0</span><i>/</i><span id="goalActiveTarget">10</span></strong><p id="goalActiveMeta" class="challenge-counter-meta">KILLER · CONSECUTIVA</p></div><div class="challenge-counter-buttons"><button id="goalMinus" class="ui-btn ui-btn-secondary challenge-step" type="button">−1</button><button id="goalPlus" class="ui-btn ui-btn-primary challenge-step" type="button">+1</button><button id="goalExtend" class="ui-btn ui-btn-secondary" type="button">+1 OBJETIVO</button><button id="goalResetStreak" class="ui-btn ui-btn-secondary" type="button">REINICIAR RACHA</button></div></div>
        <div class="module-actions challenge-active-actions"><button id="goalFinish" class="module-secondary challenge-danger" type="button">FINALIZAR META</button></div>
        <p id="goalActiveStatus" class="module-status" role="status"></p>
      </section>

      <section id="goalOutput" class="stream-output-box challenge-goal-output" hidden>
        <div class="stream-output-head"><div><span>OBS</span><h3>VISTA DE LA META</h3><p>Esta vista tiene fondo transparente. Cuando subas las imágenes finales las integramos acá sin cambiar la lógica del contador.</p></div></div>
        <div class="stream-output-grid"><div id="goalPreview" class="stream-preview-frame"></div><div class="stream-output-side"><div class="stream-output-field"><label>URL OBS · VISUALIZACIÓN</label><div class="stream-output-url"><input id="goalObsUrl" type="text" readonly><button id="goalCopyUrl" type="button">COPIAR</button></div></div><p class="stream-output-note">Fuente de navegador recomendada: 1920 × 1080, fondo transparente.</p></div></div>
      </section>

      <section class="module-box challenge-library"><div class="challenge-section-head"><div><span>HISTORIAL</span><h3>MIS METAS</h3></div><small>Se guardan las metas finalizadas de este espacio para conservar el resultado y el objetivo alcanzado.</small></div><div id="goalHistory" class="challenge-history-list"></div><p id="goalHistoryEmpty" class="challenge-empty">TODAVÍA NO HAY METAS GUARDADAS.</p></section>`;
    const anchor=document.getElementById('streamGiveawaysPanel');anchor?.parentNode.insertBefore(panel,anchor);
  }

  function readForm(){
    const role=$('goalRole')?.value==='survivor'?'survivor':'killer';
    const target=Math.max(1,Math.min(999,Math.floor(Number($('goalTarget')?.value)||10)));
    const consecutive=$('goalModeConsecutive')?.getAttribute('aria-pressed')==='true';
    let title=String($('goalTitle')?.value||'').trim();
    if(!title)title=consecutive?(role==='survivor'?'ESCAPES SEGUIDOS':'VICTORIAS SEGUIDAS'):(role==='survivor'?'META DE ESCAPES':'META DE VICTORIAS');
    return{title,role,target,consecutive};
  }

  function setSelectValue(select,value){if(!select)return;select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}))}

  function setMode(consecutive){
    $('goalModeConsecutive')?.setAttribute('aria-pressed',String(!!consecutive));
    $('goalModeTotal')?.setAttribute('aria-pressed',String(!consecutive));
  }

  async function writeOverlay(patch){
    const overlay=goalOverlay(),ws=workspace();if(!client||!overlay||!ws)throw new Error('La META todavía no está disponible para este espacio.');
    const update={updated_at:new Date().toISOString()};
    if(patch.settings)update.settings=patch.settings;if(patch.state)update.state=patch.state;
    const {data,error}=await client.from('stream_overlays').update(update).eq('id',overlay.id).eq('workspace_id',ws.id).select('*').single();
    if(error||!data)throw error||new Error('No se pudo guardar la META.');
    if(patch.settings)overlay.settings=patch.settings;if(patch.state)overlay.state=patch.state;
    window.dispatchEvent(new CustomEvent('sanlean:challenge-goal',{detail:{id:overlay.id,state:overlay.state,settings:overlay.settings}}));
    window.dispatchEvent(new CustomEvent('sanlean:overlays-updated'));
    return overlay;
  }

  async function saveConfig({silent=false}={}){
    const overlay=goalOverlay();if(!overlay)throw new Error('Esperá a que cargue el espacio de stream.');if(!tools()?.isOwner?.())throw new Error('La configuración de la META pertenece al propietario del stream.');if(isLive(overlay))throw new Error('Finalizá la meta activa antes de cambiar su configuración.');
    const form=readForm(),settings={...(overlay.settings||{}),...form};
    await writeOverlay({settings});
    if(!silent)$('goalConfigStatus').textContent='Configuración guardada.';
    return form;
  }

  async function startGoal(){
    if(busy)return;busy=true;refresh();try{
      const form=await saveConfig({silent:true}),now=new Date().toISOString(),overlay=goalOverlay();
      const state={visible:true,status:'active',current:0,target:form.target,title:form.title,role:form.role,consecutive:form.consecutive,startedAt:now,updatedAt:now};
      await writeOverlay({state});$('goalConfigStatus').textContent='Meta iniciada y visible en OBS.';
    }catch(err){$('goalConfigStatus').textContent=err.message||'No se pudo iniciar la meta.'}finally{busy=false;refresh()}
  }

  async function changeProgress(delta){
    if(busy)return;const overlay=goalOverlay();if(!overlay||!isLive(overlay))return;busy=true;refresh();try{
      const current=Math.max(0,(Number(overlay.state.current)||0)+delta),target=Math.max(1,Number(overlay.state.target)||10),status=current>=target?'reached':'active';
      await writeOverlay({state:{...overlay.state,visible:true,current,target,status,updatedAt:new Date().toISOString()}});
    }catch(err){$('goalActiveStatus').textContent=err.message||'No se pudo actualizar el contador.'}finally{busy=false;refresh()}
  }

  async function resetStreak(){
    if(busy)return;const overlay=goalOverlay();if(!overlay||!isLive(overlay))return;busy=true;refresh();try{await writeOverlay({state:{...overlay.state,visible:true,current:0,status:'active',updatedAt:new Date().toISOString()}})}catch(err){$('goalActiveStatus').textContent=err.message||'No se pudo reiniciar la racha.'}finally{busy=false;refresh()}
  }

  async function extendTarget(){
    if(busy)return;const overlay=goalOverlay();if(!overlay||!isLive(overlay))return;busy=true;refresh();try{
      const target=Math.min(999,Math.max(1,Number(overlay.state.target)||10)+1),current=Math.max(0,Number(overlay.state.current)||0),state={...overlay.state,visible:true,target,status:current>=target?'reached':'active',updatedAt:new Date().toISOString()},settings={...(overlay.settings||{}),target};
      await writeOverlay({settings,state});$('goalActiveStatus').textContent=`Objetivo aumentado a ${target}.`;
    }catch(err){$('goalActiveStatus').textContent=err.message||'No se pudo aumentar el objetivo.'}finally{busy=false;refresh()}
  }

  async function finishGoal(){
    if(busy)return;const overlay=goalOverlay();if(!overlay||!isLive(overlay))return;busy=true;refresh();try{
      const finishedAt=new Date().toISOString(),record={title:overlay.state.title,role:overlay.state.role,consecutive:!!overlay.state.consecutive,current:Number(overlay.state.current)||0,target:Number(overlay.state.target)||10,startedAt:overlay.state.startedAt||null,finishedAt,reached:(Number(overlay.state.current)||0)>=(Number(overlay.state.target)||10)},history=[...(Array.isArray(overlay.settings?.history)?overlay.settings.history:[]),record].slice(-20),settings={...(overlay.settings||{}),history},state={...overlay.state,visible:false,status:'finished',finishedAt,updatedAt:finishedAt};
      await writeOverlay({settings,state});$('goalActiveStatus').textContent='Meta finalizada.';
    }catch(err){$('goalActiveStatus').textContent=err.message||'No se pudo finalizar la meta.'}finally{busy=false;refresh()}
  }

  function renderHistory(overlay){
    const list=$('goalHistory'),empty=$('goalHistoryEmpty');if(!list||!empty)return;const history=Array.isArray(overlay?.settings?.history)?[...overlay.settings.history].reverse():[];empty.hidden=history.length>0;list.innerHTML=history.map(x=>`<div class="challenge-history-row"><strong>${escape(x.title||'META')}</strong><span>${escape(roleMetric(x.role))} · ${x.consecutive?'CONSECUTIVA':'ACUMULATIVA'}</span><b>${Number(x.current)||0}/${Number(x.target)||0}</b></div>`).join('');
  }

  function refresh(){
    const overlay=goalOverlay(),owner=!!tools()?.isOwner?.(),live=isLive(overlay),settings=overlay?.settings||{},state=overlay?.state||{};
    if($('goalSave'))$('goalSave').disabled=busy||!owner||live;if($('goalStart'))$('goalStart').disabled=busy||!owner||live;
    ['goalTitle','goalRole','goalTarget'].forEach(id=>{if($(id))$(id).disabled=busy||!owner||live});['goalModeTotal','goalModeConsecutive'].forEach(id=>{if($(id))$(id).disabled=busy||!owner||live});
    
    $('goalActiveBox').hidden=!live;
    if(live){const current=Math.max(0,Number(state.current)||0),target=Math.max(1,Number(state.target)||10),reached=current>=target;$('goalActiveTitle').textContent=state.title||'META';$('goalState').textContent=reached?'OBJETIVO ALCANZADO':'ACTIVA';$('goalState').className='challenge-state '+(reached?'is-reached':'is-active');$('goalMetricLabel').textContent=roleMetric(state.role);$('goalCurrent').textContent=String(current);$('goalActiveTarget').textContent=String(target);$('goalActiveMeta').textContent=`${state.role==='survivor'?'SUPERVIVIENTE':'KILLER'} · ${state.consecutive?'CONSECUTIVA':'ACUMULATIVA'}`;$('goalMinus').disabled=busy||current<=0;$('goalPlus').disabled=busy;$('goalExtend').disabled=busy||target>=999;$('goalResetStreak').hidden=!state.consecutive;$('goalResetStreak').disabled=busy||current===0;$('goalFinish').disabled=busy}
    $('goalOutput').hidden=!overlay;
    if(overlay){const publicUrl=`${location.origin}/Usuario/overlay.html?token=${encodeURIComponent(overlay.public_token||'')}`;$('goalObsUrl').value=publicUrl;window.SanLeanChallengeGoalView?.render($('goalPreview'),overlay,{preview:true})}
    renderHistory(overlay);
  }

  function bind(){
    $('goalConfigureOpen')?.addEventListener('click',()=>{const box=$('goalConfigurator'),overlay=goalOverlay(),settings=overlay?.settings||{};box.hidden=false;if(!isLive(overlay)){if(settings.title)$('goalTitle').value=settings.title;setSelectValue($('goalRole'),settings.role||'killer');$('goalTarget').value=String(Math.max(1,Number(settings.target)||10));setMode(settings.consecutive!==false)}refresh();box.scrollIntoView({behavior:'smooth',block:'start'})});
    $('goalModeTotal')?.addEventListener('click',()=>setMode(false));$('goalModeConsecutive')?.addEventListener('click',()=>setMode(true));
    $('goalRole')?.addEventListener('change',()=>{const current=$('goalTitle')?.value.trim().toUpperCase();if(!current||['VICTORIAS SEGUIDAS','ESCAPES SEGUIDOS','META DE VICTORIAS','META DE ESCAPES'].includes(current))$('goalTitle').value=$('goalRole').value==='survivor'?'ESCAPES SEGUIDOS':'VICTORIAS SEGUIDAS'});
    $('goalSave')?.addEventListener('click',async()=>{if(busy)return;busy=true;refresh();try{await saveConfig()}catch(err){$('goalConfigStatus').textContent=err.message||'No se pudo guardar la configuración.'}finally{busy=false;refresh()}});
    $('goalStart')?.addEventListener('click',startGoal);$('goalMinus')?.addEventListener('click',()=>changeProgress(-1));$('goalPlus')?.addEventListener('click',()=>changeProgress(1));$('goalExtend')?.addEventListener('click',extendTarget);$('goalResetStreak')?.addEventListener('click',resetStreak);$('goalFinish')?.addEventListener('click',finishGoal);
    $('goalCopyUrl')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('goalObsUrl').value);$('goalConfigStatus').textContent='URL de OBS copiada.'}catch{$('goalConfigStatus').textContent='No se pudo copiar la URL.'}});
    window.addEventListener('sanlean:overlays-updated',refresh);window.addEventListener('sanlean:challenge-goal',refresh);window.addEventListener('sanlean:section',refresh);
  }

  function install(){installPanel();bind();setMode(true);refresh();setTimeout(()=>{refresh();if(location.hash==='#challenges')window.SanLeanUsuarioNavigation?.show?.('challenges',{updateHash:false})},250)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,40),{once:true});else setTimeout(install,40);
})();