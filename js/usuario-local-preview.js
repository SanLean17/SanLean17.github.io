/* Only loaded by the strictly loopback-gated development adapter. */
(()=>{
 if(!['localhost','127.0.0.1'].includes(location.hostname)||!window.SanLeanLocal)return;
 const names={roulette_killers:'KILLERS',roulette_killer_perks:'PERKS DE KILLER',roulette_survivor_perks:'PERKS DE SUPERVIVIENTE',vote:'CARTAS',poll:'VOTACIÓN',giveaway:'SORTEOS',challenge_goal:'METAS',challenge_streak:'WIN STREAK',challenge_all_killers:'ALL KILLER',challenge_all_survivors:'ALL SURVIVOR'};
 const box=document.createElement('details');box.id='localVisualMonitor';box.className='module-box';
 const summary=document.createElement('summary');summary.textContent='ABRIR MONITOR LOCAL · VER SIN ESTAR EN VIVO';box.append(summary);
 const intro=document.createElement('p');intro.textContent='Elegí una salida y probá los controles de MI PANEL. Este monitor muestra la misma visualización que OBS, sin transmitir.';
 const status=document.createElement('p');status.id='localPreviewConnection';status.className='module-status';status.setAttribute('role','status');
 const choices=document.createElement('div');choices.className='module-actions';choices.setAttribute('aria-label','Salidas del monitor');
 const picker=document.createElement('details'),pickerLabel=document.createElement('summary');pickerLabel.textContent='ELEGIR VISUALIZACIÓN';picker.append(pickerLabel,choices);
 const title=document.createElement('h3'),hint=document.createElement('p');hint.className='ui-field-help';
 const viewport=document.createElement('div');viewport.className='local-monitor-viewport';
 const frame=document.createElement('iframe');frame.title='Visualización local de OBS';frame.setAttribute('allow','autoplay');viewport.append(frame);
 const controls=document.createElement('div');controls.className='module-actions';
 let currentURL='';const open=document.createElement('button');open.className='module-secondary';open.textContent='ABRIR VENTANA';open.onclick=()=>window.open(currentURL,'_blank','noopener');
 const copy=document.createElement('button');copy.className='module-secondary';copy.textContent='COPIAR URL OBS';copy.onclick=()=>navigator.clipboard.writeText(new URL(currentURL,location.href).href).then(()=>{hint.textContent='URL de visualización copiada. Usá 1920 × 1080 en OBS, con el servidor y MI PANEL abiertos.';}).catch(()=>{hint.textContent='Abrí la ventana y copiá su dirección.';});
 controls.append(open,copy);
 const testActions=document.createElement('div');testActions.className='module-actions';
 for(const [style,label] of [['harmful','PROBAR ALERTA PERJUDICIAL'],['beneficial','PROBAR ALERTA BENEFICIOSA']]){
  const button=document.createElement('button');button.className='module-secondary';button.textContent=label;button.onclick=async()=>{
   box.open=true;select('alert');button.disabled=true;
   // Let the iframe subscribe before emitting the test event.
   try{await fetch(window.SANLEAN_SUPABASE.url+'/functions/v1/stream-bits/test-alert',{method:'POST',body:JSON.stringify({workspaceId:window.SanLeanStreamTools.getWorkspace()?.id,style})});await window.SanLeanLocal.publishPreview();}finally{button.disabled=false;}
  };testActions.append(button);
 }
 box.append(intro,status,picker,title,hint,viewport,controls,testActions);document.getElementById('localDevelopmentBanner').after(box);
 const css=document.createElement('link');css.rel='stylesheet';css.href='../css/usuario-local-preview.css';document.head.append(css);
 let selected='alert',signature='',options=[];
 function select(id){const option=options.find(o=>o.id===id);if(!option)return;selected=id;title.textContent=option.label;hint.textContent=option.hint;if(frame.getAttribute('src')!==option.url)frame.src=option.url;currentURL=option.url;pickerLabel.textContent="ELEGIR VISUALIZACIÓN · "+option.label;picker.open=false;choices.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.preview===id)));}
 function refresh(){
  const tools=window.SanLeanStreamTools,overlays=tools?.getOverlays()||[];if(!overlays.length)return;
  const next=JSON.stringify(overlays.map(o=>[o.id,o.public_token]));if(next===signature)return;signature=next;
  options=overlays.map(o=>({id:o.id,label:names[o.kind]||o.kind,url:tools.overlayUrl(o.public_token),hint:'Si está vacío, generá una ronda, girá la ruleta o activá MOSTRAR en su sección. El monitor respeta lo que enviás a OBS.'}));
  const settings=JSON.parse(localStorage.getItem('sanlean-local-development-v1')).stream_bits_settings.find(s=>s.workspace_id===tools.getWorkspace()?.id);
  if(settings){const token=encodeURIComponent(settings.alert_token||settings.public_token);options.push({id:'alert',label:'ALERTAS BITS',url:'./alertas.html?token='+token,hint:'Usá PROBAR ALERTA aquí abajo. No necesitás donaciones reales ni estar en vivo.'},{id:'active',label:'ENTRADAS ACTIVAS',url:'./alertas.html?mode=active&token='+token,hint:'Usá SIMULAR APORTE DE BITS en Herramientas de la demo. Las entradas aparecen también en la ruleta.'});}
  choices.replaceChildren();for(const o of options){const b=document.createElement('button');b.className='module-secondary';b.textContent=o.label;b.dataset.preview=o.id;b.onclick=()=>select(o.id);choices.append(b);}select(options.some(o=>o.id===selected)?selected:options[0].id);
 }
 box.addEventListener('toggle',()=>{if(box.open){refresh();window.SanLeanLocal.publishPreview();}});
 window.addEventListener('sanlean:overlays-updated',refresh);refresh();
 new ResizeObserver(()=>{const scale=viewport.clientWidth/1920;frame.style.transform='scale('+scale+')';viewport.style.height=(1080*scale)+'px';}).observe(viewport);
})();
