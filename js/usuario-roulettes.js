(()=>{
  const kinds={killers:'roulette_killers',killerPerks:'roulette_killer_perks',survivor:'roulette_survivor_perks'};
  let section='killers',busy=false;
  const $=id=>document.getElementById(id),tools=()=>window.SanLeanStreamTools;
  const currentOverlay=()=>tools()?.getOverlays().find(o=>o.kind===kinds[section]);
  function refresh(){
    if(!$('privateRouletteStage'))return;
    const overlay=currentOverlay(),pending=tools()?.getPendingRule(section);
    window.SanLeanRouletteView.render($('privateRouletteStage'),overlay||{kind:kinds[section],state:{status:'idle',items:[]}}, {preview:true});
    $('privateRouletteSpin').disabled=busy||!overlay;
    $('privateRouletteHide').disabled=busy||!overlay;
    $('privateRouletteCopy').disabled=!overlay;
    $('privateRoulettePending').hidden=!pending;
    $('privateRoulettePending').textContent=pending?`CARTAS PENDIENTES · ${pending.label}`:'';
    $('privateRouletteSpin').textContent=busy?'GIRANDO…':pending?.rule?.count===0?'APLICAR RESULTADO':'GIRAR';
    $('privateRouletteWorkspace').textContent=tools()?.getWorkspace()?.name||'Cargando espacio de stream…';
    const canEdit=!!tools()?.isOwner()&&!!window.SanLeanAccount?.getSettings();
    if($('weightGrid'))$('weightGrid').inert=!canEdit;
    if($('resetWeights'))$('resetWeights').disabled=!canEdit;
    $('privateRoulettePermission').hidden=canEdit;
  }
  async function spin(){
    if(busy)return;const overlay=currentOverlay();if(!overlay)return;
    busy=true;refresh();$('privateRouletteStatus').textContent='';
    try{
      const ok=await tools().spinOverlay(overlay.id);
      $('privateRouletteStatus').textContent=ok?'Resultado enviado a OBS.':tools().getLastError()||'No se pudo completar el giro.';
    }finally{busy=false;refresh()}
  }
  function install(){
    const panel=$('roulettePanel');if(!panel)return;
    const box=document.createElement('section');box.className='private-roulette';box.id='privateRoulette';
    box.innerHTML='<p id="privateRouletteWorkspace" class="eyebrow"></p><p id="privateRoulettePending" class="module-status" hidden></p><div id="privateRouletteStage" class="private-roulette-stage"></div><div class="module-actions"><button id="privateRouletteSpin" class="module-primary" type="button" disabled>GIRAR</button><button id="privateRouletteHide" class="module-secondary" type="button" disabled>OCULTAR EN OBS</button></div><p id="privateRouletteStatus" class="module-status" role="status"></p><p id="privateRoulettePermission" class="module-help">La configuración pertenece al propietario del stream. Los colaboradores con permiso de OVERLAYS pueden usar la configuración que dejó sincronizada.</p><div class="private-roulette-link"><span>Fuente de navegador en OBS · 1920 × 1080 · fondo transparente</span><button id="privateRouletteCopy" class="ghost-btn" type="button" disabled>COPIAR URL OBS</button></div><p id="privateRouletteSaveStatus" class="module-status" role="status"></p>';
    panel.querySelector('.panel-tools').before(box);
    $('privateRouletteSpin').onclick=spin;
    $('privateRouletteHide').onclick=async()=>{try{await tools().hideOverlay(currentOverlay().id);$('privateRouletteStatus').textContent='Overlay oculto.';refresh()}catch{$('privateRouletteStatus').textContent='No se pudo ocultar el overlay.'}};
    $('privateRouletteCopy').onclick=async()=>{try{await navigator.clipboard.writeText(tools().overlayUrl(currentOverlay().public_token));$('privateRouletteStatus').textContent='URL de visualización copiada.'}catch{$('privateRouletteStatus').textContent='Copiá la URL desde OVERLAYS OBS.'}};
    refresh();
  }
  window.addEventListener('sanlean:section',e=>{if(kinds[e.detail]){section=e.detail;refresh()}});
  window.addEventListener('sanlean:overlays-updated',refresh);
  window.addEventListener('sanlean:settings-loaded',refresh);
  window.addEventListener('sanlean:roulette-state',refresh);
  window.addEventListener('sanlean:card-pending',refresh);
  window.addEventListener('sanlean:settings-status',e=>{if($('privateRouletteSaveStatus'))$('privateRouletteSaveStatus').textContent=e.detail;});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
