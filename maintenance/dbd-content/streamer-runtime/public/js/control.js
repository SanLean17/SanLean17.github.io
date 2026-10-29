'use strict';
async function initChallenge(meta){
  const $=id=>document.getElementById(meta.prefix+id),catalog=await SanLeanDBDCatalog.load(meta.catalog);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>SanLeanDBDCatalog.normalizeSearch(v);
  let state=null,connected=false,busy=false,busyType='',search='',gridSignature='',editingKey=null,preferenceTimer,preferenceSaving=null,selectionFrame,serverOffset=0;
  const audio=new window.SanLeanAudio.AudioEngine();window.sanleanAudio=audio;
  audio.ready.then(()=>{$('audioPreviewStatus').textContent='Sonidos listos. Los ajustes se guardan automáticamente.';render();}).catch(()=>{$('audioPreviewStatus').textContent='No se pudieron cargar los sonidos. Revisá que se haya extraído el ZIP completo.';});
  const status=t=>{$('allSurvivorStatus').textContent=t;};
  function receive(data){if(!state||data.state.revision>=state.revision){state=data.state;(window.challengeStates??={})[meta.key]=state;serverOffset=data.serverTime-Date.now();}connected=true;$('connectionStatus').classList.remove('error');$('connectionStatus').textContent=data.notice||'Progreso guardado en esta PC.';render();}
  const stream=new SanLeanLocalEvents('/events/challenges/'+meta.key);stream.onmessage=e=>receive(JSON.parse(e.data));stream.onerror=()=>{connected=false;$('connectionStatus').textContent='Sin conexión con el servidor. Conservá su ventana abierta; se reconectará automáticamente.';$('connectionStatus').classList.add('error');render();};
  async function act(type,extra={}){
    if(!connected||busy||!state)return;busy=true;busyType=type;status('');render();
    try{
      for(let attempt=0;attempt<3;attempt++){
        const r=await fetch('/api/challenges/'+meta.key+'/action',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json','X-SanLean-Standalone':'1'},body:JSON.stringify({type,...extra,revision:state.revision})});const data=await r.json();
        if(r.status===409&&data.state){receive(data);continue;}
        if(!r.ok)throw Error(data.error);receive(data);return true;
      }
      throw Error('El progreso está cambiando. Intentá nuevamente.');
    }catch(e){status(e.message);return false;}finally{busy=false;busyType='';render();}
  }
  const preferenceFields={selectionDuration:{min:3,max:20,help:'Entre 3 y 20 segundos.'},resultCardScale:{min:20,max:100,help:'Entre 20% y 100% del máximo en OBS.'},resultCardDuration:{min:2,max:15,help:'Entre 2 y 15 segundos.'}},dirtyPreferences=new Set();
  Object.assign(preferenceFields,{selectionSoundType:{audio:true,choices:['digital','mechanical','neon','dry']},resultSoundType:{audio:true,choices:['impact','sanlean']},selectionSoundEnabled:{audio:true,boolean:true},resultSoundEnabled:{audio:true,boolean:true},selectionSoundVolume:{audio:true,min:0,max:100},resultSoundVolume:{audio:true,min:0,max:100}});
  Object.assign(preferenceFields,{autoIntervalValue:{min:1,max:1440,help:'Entre 1 y 1440.'},autoIntervalUnit:{choices:['seconds','minutes']},autoVisibleValue:{min:1,max:1440,help:'Entre 1 y 1440.'},autoVisibleUnit:{choices:['seconds','minutes']},autoAnimation:{choices:['top','left','right','fade']},autoCompactProgressEnabled:{boolean:true}});
  const pendingFolds=new Map();
  const folds={selectionSettingsCollapsed:{button:'fold-0',content:'settings-content-0',label:'configuración de selección'},presentationSettingsCollapsed:{button:'fold-1',content:'settings-content-1',label:'configuración de presentación'},automaticSettingsCollapsed:{button:'fold-2',content:'settings-content-2',label:'configuración de modo automático'},survivorListCollapsed:{button:'allSurvivorOpen',content:'allSurvivorInline',label:'listado de supervivientes'}};
  for(const key of Object.keys(folds))preferenceFields[key]={boolean:true,fold:true};
  const readPreference=key=>preferenceFields[key].fold?(pendingFolds.has(key)?pendingFolds.get(key):state?.[key]??false):preferenceFields[key].boolean?$(key).checked:preferenceFields[key].choices?$(key).value:$(key).valueAsNumber;
  const preferenceValid=key=>{const value=readPreference(key),config=preferenceFields[key];return config.boolean?typeof value==='boolean':config.choices?config.choices.includes(value):Number.isFinite(value)&&value>=config.min&&value<=config.max;};
  const audioValues=()=>Object.fromEntries(Object.keys(window.SanLeanAudio.defaults).map(key=>[key,readPreference(key)]));
  const preferencesValid=()=>Object.keys(preferenceFields).every(preferenceValid);
  async function savePreferences(){
    clearTimeout(preferenceTimer);if(!state)return false;
    if(preferenceSaving){await preferenceSaving;return savePreferences();}
    if(busy){preferenceTimer=setTimeout(savePreferences,200);return false;}
    const values={};for(const key of dirtyPreferences)if(preferenceValid(key)&&(!state.selection||preferenceFields[key].audio||preferenceFields[key].fold)){if(readPreference(key)===state[key]){dirtyPreferences.delete(key);pendingFolds.delete(key);}else values[key]=readPreference(key);}
    if(!Object.keys(values).length)return preferencesValid();
    preferenceSaving=act('preferences',{values});const saved=await preferenceSaving;preferenceSaving=null;
    if(saved)for(const [key,value] of Object.entries(values))if(readPreference(key)===value){dirtyPreferences.delete(key);pendingFolds.delete(key);}
    if(saved&&dirtyPreferences.size)preferenceTimer=setTimeout(savePreferences,0);
    render();return saved&&preferencesValid();
  }
  async function correct(result){
    if(!editingKey||busy||state.selection)return;const key=editingKey,item=catalog.find(k=>k.key===key);
    if(state.entries[key]==='completed'&&result!=='completed'){
      if(!await window.SanLeanConfirm.open({eyebrow:'CORREGIR ESTADO',title:'CAMBIAR ESTADO DE '+item.name.toUpperCase(),text:`${item.name} dejará de contar como completado y volverá a estar disponible para la selección.`,confirmLabel:'CAMBIAR ESTADO'}))return;
    }
    await act('correct',{key,result});
  }
  function renderGrid(){
    if(!state)return;const signature=JSON.stringify([state.entries,state.currentKey,!!state.selection,state.status,search,busy,connected]);if(gridSignature===signature)return;gridSignature=signature;
    const words=norm(search).split(' ').filter(Boolean),disabled=busy||!connected||!!state.selection;
    $('allSurvivorGrid').innerHTML=catalog.filter(k=>words.every(w=>SanLeanDBDCatalog.buildSearchText(k,{type:meta.catalog,legacy:(window.SURVIVOR_ALIASES?.[k.key]||window.KILLER_ALIASES?.[k.key])||''}).includes(w))).map(k=>{const s=state.entries[k.key],cur=state.currentKey===k.key;return `<button type="button" class="all-challenge-card is-${s}${cur?' is-current':''}" data-key="${esc(k.key)}" ${disabled?'disabled':''} aria-disabled="${disabled}" aria-label="${esc(k.name)} · ${s==='completed'?'completado':cur?'actual':s==='failed'?'perdido':'pendiente'}"><div><img src="/${esc(k.image)}" alt=""></div><strong>${esc(k.name)}</strong><span class="all-card-state">${s==='completed'?'✓':s==='failed'?'×':''}</span></button>`;}).join('');
  }
  function paintSelection(){
    cancelAnimationFrame(selectionFrame);if(!state?.selection)return;
    const a=state.selection,elapsed=Date.now()+serverOffset-a.start;let key=null;for(const step of a.steps){if(step.at<=elapsed)key=step.key;else break;}if(elapsed>=a.duration)key=a.target;
    $('allSurvivorGrid').querySelectorAll('.is-current').forEach(el=>{if(el.dataset.key!==key)el.classList.remove('is-current');});if(key)$('allSurvivorGrid').querySelector('[data-key="'+key+'"]')?.classList.add('is-current');
    if(elapsed<a.duration)selectionFrame=requestAnimationFrame(paintSelection);
  }
  function render(){
    if(!state)return;const active=state.status==='active',paused=state.status==='paused',done=['completed','finished'].includes(state.status),session=state.status!=='idle',locked=busy||!connected||!!state.selection;
    const completed=catalog.filter(k=>state.entries[k.key]==='completed').length,failed=catalog.filter(k=>state.entries[k.key]==='failed').length;
    $('allSurvivorSetup').hidden=session;$('allSurvivorLive').hidden=false;
    $('allSurvivorObsSize').textContent='Se guarda con tu progreso. OBS: 1920 × 1080 px.';
    $('allSurvivorStart').disabled=locked||session;
    $('allSurvivorStateLabel').textContent=!session?'CHALLENGE SIN INICIAR':done?'CHALLENGE COMPLETADO':paused?'CHALLENGE PAUSADO':state.selection?'SELECCIONANDO '+meta.noun+'…':'CHALLENGE ACTIVO';
    $('allSurvivorStateLabel').dataset.status=state.status;
    $('allSurvivorCompleted').textContent=`${completed} / ${catalog.length}`;$('allSurvivorFailed').textContent=failed;$('allSurvivorPending').textContent=catalog.length-completed-failed;
    const current=catalog.find(k=>k.key===state.currentKey);$('allSurvivorSelection').hidden=!current;$('allSurvivorSelectedName').textContent=current?.name||'—';
    for(const id of ['allSurvivorWin','allSurvivorLose','allSurvivorPendingBtn'])$(id).disabled=locked||!active||!current;
    for(const [key,config] of Object.entries(preferenceFields)){
      if(config.fold){
        const fold=folds[key],collapsed=readPreference(key),button=$(fold.button);$(fold.content).hidden=collapsed;button.disabled=!connected;button.setAttribute('aria-expanded',String(!collapsed));button.setAttribute('aria-label',(collapsed?'Abrir ':'Cerrar ')+fold.label);
        button.querySelector('span').textContent=collapsed?'ABRIR':'CERRAR';
        continue;
      }
      if(!dirtyPreferences.has(key)){if(config.boolean)$(key).checked=state[key];else $(key).value=state[key];}
      $(key).disabled=!connected||(busy&&busyType!=='preferences')||(!config.audio&&!!state.selection);
      if(config.choices)for(const option of $(key).options)option.toggleAttribute('selected',option.value===$(key).value);
      const valid=preferenceValid(key),help=$(key+'Help');if(help){help.textContent=valid?config.help:'Ingresá un número entre '+config.min+' y '+config.max+'.';help.classList.toggle('error',!valid);}$(key).setAttribute('aria-invalid',String(!valid));
    }
    $('resultCardScaleValue').textContent=$('resultCardScale').value+'%';$('resultCardScale').setAttribute('aria-valuetext',$('resultCardScale').value+' por ciento');$('resultCardScale').style.setProperty('--range-progress',(($('resultCardScale').valueAsNumber-20)/80*100)+'%');
    for(const prefix of ['selection','result']){$(prefix+'SoundEnabledValue').textContent=$(prefix+'SoundEnabled').checked?'ACTIVADO':'APAGADO';$(prefix+'SoundPreview').disabled=!audio.loaded;}
    SanLeanAudioControls.sync(document.getElementById(meta.key));
    audio.applyPreferences(audioValues());
    $('allSurvivorRandom').disabled=locked||!active||completed===catalog.length||!preferencesValid();
    $('allSurvivorPause').textContent=paused?'CONTINUAR':'PAUSAR';$('allSurvivorPause').disabled=locked||done||!session;
    $('allSurvivorPause').hidden=!session||done;
    $('obsVisibility').querySelectorAll('button').forEach(b=>{b.disabled=locked||!['active','paused','completed'].includes(state.status);b.setAttribute('aria-pressed',String(b.dataset.mode===state.visibilityMode));});
    $('autoCompactProgressEnabledValue').textContent=$('autoCompactProgressEnabled').checked?'ACTIVADO':'APAGADO';renderAutoStatus();
    $('allSurvivorAlignment').querySelectorAll('button').forEach(b=>{b.disabled=locked;b.setAttribute('aria-pressed',String(b.dataset.alignment===state.alignment));});
    $('resetProgress').disabled=locked;
    renderGrid();paintSelection();
    const editor=catalog.find(k=>k.key===editingKey);$('survivorEditor').hidden=!editor;
    if(editor){
      const entry=state.entries[editingKey];$('editorName').textContent=editor.name;$('editorState').textContent='Estado actual: '+({completed:'GANADO',failed:'PERDIDO',pending:'PENDIENTE'})[entry]+(state.currentKey===editingKey?' · '+meta.noun+' ACTUAL':'');
      for(const [id,result] of [['editorWin','completed'],['editorLose','failed'],['editorPending','pending']])$(id).disabled=locked||entry===result;
    }
  }
  function renderAutoStatus(){
    if(!state)return;
    const seconds=Math.max(0,Math.ceil((state.autoDeadline-Date.now()-serverOffset)/1000));
    $('autoStatus').textContent=state.selection?'Visibilidad bloqueada hasta terminar la selección.':state.visibilityMode==='auto'?(state.autoPhase==='hidden'?`Automático · próxima entrada en ${seconds} s. ${state.autoCompactProgressEnabled?'Progreso compacto visible.':'Pantalla limpia.'}`:state.autoPhase==='visible'?`Automático · listado visible durante ${seconds} s más.`:state.autoPhase==='entering'?'Automático · entrando.':'Automático · saliendo.'):state.visibilityMode==='show'?'Listado visible hasta que elijas otro modo.':'OBS completamente oculto. Sin apariciones automáticas.';
  }
  setInterval(renderAutoStatus,250);
  $('obsVisibility').onclick=async e=>{const b=e.target.closest('[data-mode]');if(b&&!b.disabled){if(b.dataset.mode==='auto'&&!await savePreferences())return;act('visibility',{mode:b.dataset.mode});}};
  $('allSurvivorStart').onclick=()=>act('start');$('allSurvivorRandom').onclick=async()=>{if(await savePreferences())act('select');};
  for(const key of Object.keys(preferenceFields)){
    if(preferenceFields[key].fold){$(folds[key].button).onclick=()=>{pendingFolds.set(key,!readPreference(key));dirtyPreferences.add(key);render();savePreferences();};continue;}
    $(key).oninput=()=>{dirtyPreferences.add(key);render();if(preferenceValid(key))savePreferences();};
    $(key).onchange=savePreferences;
  }
  // A final valid edit can finish even if its tab closes immediately. Preferences
  // merge by field on the server; they cannot restore stale progress or timers.
  addEventListener('pagehide',()=>{
    if(!state)return;const values={};for(const key of dirtyPreferences)if(preferenceValid(key)&&(!state.selection||preferenceFields[key].audio||preferenceFields[key].fold))values[key]=readPreference(key);
    if(Object.keys(values).length)fetch('/api/challenges/'+meta.key+'/action',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json','X-SanLean-Standalone':'1'},body:JSON.stringify({type:'preferences',values,revision:state.revision})}).catch(()=>{});
  });
  for(const prefix of ['selection','result'])$(prefix+'SoundPreview').onclick=async()=>{try{const played=await audio.preview(prefix,audioValues());$('audioPreviewStatus').textContent=played?'Prueba de sonido. No cambia el challenge.':'Habilitá el audio de esta pestaña para escuchar la prueba.';}catch{$('audioPreviewStatus').textContent='No se pudo reproducir la prueba.';}};
  $('editorWin').onclick=()=>correct('completed');$('editorLose').onclick=()=>correct('failed');$('editorPending').onclick=()=>correct('pending');$('editorClose').onclick=()=>{editingKey=null;render();};
  $('allSurvivorWin').onclick=()=>act('mark',{result:'completed'});$('allSurvivorLose').onclick=()=>act('mark',{result:'failed'});$('allSurvivorPendingBtn').onclick=()=>act('mark',{result:'pending'});
  $('allSurvivorPause').onclick=()=>act(state.status==='paused'?'resume':'pause');
  $('allSurvivorGrid').onclick=async e=>{const b=e.target.closest('[data-key]');if(b&&!b.disabled){editingKey=b.dataset.key;if(['active','paused'].includes(state.status)&&state.entries[editingKey]!=='completed'&&state.currentKey!==editingKey)await act('manual',{key:editingKey});render();$('survivorEditor').scrollIntoView({behavior:'smooth',block:'nearest'});}};
  $('allSurvivorSearch').oninput=e=>{search=e.target.value;renderGrid();};
  $('allSurvivorAlignment').onclick=e=>{const b=e.target.closest('[data-alignment]');if(b&&!b.disabled)act('alignment',{value:b.dataset.alignment});};

  $('resetProgress').onclick=async()=>{if(await window.SanLeanConfirm.open({eyebrow:meta.title,title:'RESTABLECER '+meta.title,text:'Se eliminará todo el progreso actual y todos los personajes volverán a estado pendiente. Las configuraciones visuales y de sonido se conservarán.',confirmLabel:'RESTABLECER',cancelLabel:'CANCELAR'})){await savePreferences();if(await act('reset',{confirm:'RESTABLECER '+meta.title})){dirtyPreferences.clear();pendingFolds.clear();render();}}};
}
for(const role of ['killer','survivor'])initChallenge({key:'all-'+role,prefix:role==='killer'?'ak-':'as-',catalog:role==='killer'?'killers':'survivors',title:'ALL '+role.toUpperCase()+' CHALLENGE',noun:role==='killer'?'KILLER':'SUPERVIVIENTE'}).catch(console.error);