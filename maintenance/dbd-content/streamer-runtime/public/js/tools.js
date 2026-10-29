'use strict';
(async()=>{
 const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const defs={'killer-wheel':{data:'killers',folder:'killers',kind:'roulette_killers'},'perks-killer':{data:'perks-killer',folder:'killer',kind:'roulette_killer_perks'},'perks-survivor':{data:'perks-survivor',folder:'survivor',kind:'roulette_survivor_perks'}};
 const all=['inicio','meta','win-streak','all-killer','all-survivor',...Object.keys(defs)],catalogs={},audio=new SanLeanWheelAudio(),signatures={},searches={},messages={},drafts={},busy=new Set();let packet=null,connected=false,active='inicio',queue=Promise.resolve();
 const norm=s=>SanLeanDBDCatalog.normalizeSearch(s);
 function navigate(key){if(!all.includes(key))key='inicio';active=key;for(const id of all)$(id).hidden=id!==key;document.querySelectorAll('[data-tool]').forEach(b=>{b.classList.toggle('active',b.dataset.tool===key);if(b.dataset.tool===key)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});history.replaceState(null,'','#'+key);try{localStorage.setItem('sanlean-streamer-tool',key);}catch{}audio.stopAll();render();}
 document.querySelectorAll('[data-tool],[data-go]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.tool||b.dataset.go)));
 let last='inicio';try{last=localStorage.getItem('sanlean-streamer-tool')||last;}catch{}navigate(location.hash.slice(1)||last);
 document.querySelectorAll('[data-copy]').forEach(b=>{let timer;b.onclick=async()=>{const input=$(b.dataset.copy),status=b.closest('.obs-url-box').querySelector('.copy-status');try{await navigator.clipboard.writeText(input.value);b.textContent='COPIADO';status.textContent='URL copiada.';clearTimeout(timer);timer=setTimeout(()=>{b.textContent='COPIAR URL';status.textContent='';},1800);}catch{input.focus();input.select();status.textContent='La URL quedó seleccionada. Presioná Ctrl+C para copiarla.';}};});
 await Promise.all(Object.entries(defs).map(async([key,d])=>{catalogs[key]=(await SanLeanDBDCatalog.load(d.data)).map(i=>({...i,image:'/'+(i.image||d.folder+'/'+i.key+'.png')}));}));
 const receive=data=>{if(!packet||data.state.revision>=packet.state.revision)packet=data;connected=true;window.toolsState=packet.state;render();};
 async function request(key,type,extra={}){
   if(!connected)return false;busy.add(key);render();
   const run=async()=>{try{for(let i=0;i<3;i++){const r=await fetch('/api/tools/action',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json','X-SanLean-Standalone':'1'},body:JSON.stringify({tool:key,type,...extra,revision:packet.state.revision})});const body=await r.json();if(r.status===409){receive(body);continue;}if(!r.ok)throw Error(body.error);messages[key]='';receive(body);return true;}throw Error('La ruleta está cambiando. Intentá nuevamente.');}catch(e){messages[key]=e.message;return false;}finally{busy.delete(key);render();}};
   const job=queue.then(run,run);queue=job;return job;
 }
 const stream=new SanLeanLocalEvents('/events/tools');stream.onmessage=e=>receive(JSON.parse(e.data));stream.onerror=()=>{connected=false;audio.stopAll();render();};
 function currentPool(key,t){return SanLeanRouletteEntries.pool(catalogs[key],t,key==='killer-wheel'&&t.repeatMode==='remove');}
 function renderGrid(key,t,locked){
   const grid=$(key+'-grid'),sig=JSON.stringify([t.entries,searches[key]||'']),options=SanLeanRouletteEntries.options(catalogs[key],t);
   if(signatures[key]!==sig){
     const focused=document.activeElement,focusKey=focused?.matches('.donor-input')&&grid.contains(focused)?focused.closest('[data-key]').dataset.key:null,selection=focusKey?[focused.selectionStart,focused.selectionEnd]:null;
     drafts[key]??={};grid.querySelectorAll('.donor-input').forEach(input=>drafts[key][input.closest('[data-key]').dataset.key]=input.value);
     const words=norm(searches[key]).split(/\s+/).filter(Boolean),filtered=options.filter(i=>words.every(w=>SanLeanDBDCatalog.buildSearchText(i,{type:defs[key].data}).includes(w)));
     if(key!=='killer-wheel')filtered.sort((a,b)=>(a.donations.length?0:a.count?1:2)-(b.donations.length?0:b.count?1:2));
     // Defer card movement during typing, including updates from another tab.
     if(focusKey){const order=new Map([...grid.children].map((el,i)=>[el.dataset.key,i]));filtered.sort((a,b)=>(order.get(a.key)??Infinity)-(order.get(b.key)??Infinity));}
     grid.innerHTML=filtered.map(i=>{const n=i.count,donors=i.entries.filter(e=>e.type==='donation'),image=window.SanLeanRouletteImageAssets[i.image]||i.image;return `<article class="weight-card${n===0?' disabled-option':''}${i.donations.length?' has-bonus':''}" data-key="${esc(i.key)}"><div class="weight-card-info"><img src="${esc(image)}" loading="lazy" alt=""><div class="weight-name">${esc(i.name)}</div></div><div class="weight-controls"><button type="button" data-delta="-1" aria-label="Quitar entrada de ${esc(i.name)}">−</button><span class="weight-value">${n}×</span><button type="button" data-delta="1" aria-label="Agregar entrada de ${esc(i.name)}">+</button></div><div class="donor-row"><input class="donor-input" maxlength="32" value="${esc(drafts[key][i.key]||'')}" placeholder="NOMBRE DE QUIEN AGREGA ESTA OPCIÓN" aria-label="Nombre para ${esc(i.name)}"><button type="button" class="add-entry">+ AGREGAR</button></div><div class="bonus-list">${donors.map(e=>`<span class="bonus-chip"><span>${esc(e.donor)}${e.enabled?'':' · desactivada'}</span><button class="remove-bonus" type="button" data-remove="${esc(e.entryId)}" aria-label="Eliminar ${esc(e.donor)}"><i></i><i></i></button></span>`).join('')}</div></article>`;}).join('')||'<p class="module-status">No hay resultados para esta búsqueda.</p>';
     if(focusKey){const input=[...grid.querySelectorAll('.donor-input')].find(el=>el.closest('[data-key]').dataset.key===focusKey);input?.focus({preventScroll:true});input?.setSelectionRange(...selection);}else signatures[key]=sig;
   }
   const byKey=new Map(options.map(i=>[i.key,i]));
   grid.querySelectorAll('[data-key]').forEach(card=>{const n=byKey.get(card.dataset.key).count;card.querySelector('[data-delta="-1"]').disabled=locked||!n;card.querySelector('[data-delta="1"]').disabled=locked||n>=99;card.querySelector('.add-entry').disabled=locked||!n||n>=99;card.querySelector('input').disabled=!connected||t.state.status==='spinning'||!n||n>=99;card.querySelectorAll('.remove-bonus').forEach(b=>b.disabled=locked);});
 }
 function renderSummary(key,t){
   const remove=key==='killer-wheel'&&t.repeatMode==='remove',stats=SanLeanRouletteEntries.stats(catalogs[key],t,remove);
   const boxes=remove?[['ENTRADAS TOTALES',stats.total,'total'],['ELIMINADOS',stats.eliminated.length+' / '+stats.total,'eliminated'],['DISPONIBLES',stats.available,'available'],['ENTRADAS AGREGADAS ACTIVAS',stats.activeExtras,'donations']]:[['ENTRADAS EN RULETA',stats.total+' / '+stats.base,'total'],['ENTRADAS AGREGADAS',stats.extras,'donations']];
   $(key+'-stats').innerHTML=boxes.map(([label,value,id])=>'<div><span>'+label+'</span><strong id="'+key+'-'+id+'">'+value+'</strong></div>').join('');
   const eliminatedById=new Map(stats.eliminated.map(e=>[e.entryId,e]));
   const usedEntries=key==='killer-wheel'?t.usedKillerEntries.map(id=>eliminatedById.get(id)).filter(Boolean):stats.eliminated;
   $(key+'-elimination').hidden=!remove;$(key+'-used-names').textContent=usedEntries.map(e=>e.name+(e.donor?' · '+e.donor:'')).join(' · ')||'Todavía no salió ninguna entrada.';
   const added=SanLeanRouletteEntries.summaries(catalogs[key],t);$(key+'-added').hidden=!added.length;
   $(key+'-added-list').innerHTML=added.map(e=>'<li>'+esc(e.donor?e.donor+' agregó '+e.name:'Entrada sin nombre · '+e.name)+(e.count>1?' ×'+e.count:'')+'</li>').join('');
 }
 function fold(button,content,closed){button.setAttribute('aria-expanded',String(!closed));button.querySelector('span').textContent=closed?'ABRIR':'CERRAR';content.hidden=closed;}
 function render(){
   if(!packet)return;
   for(const [key,d] of Object.entries(defs)){
     const t=packet.state.tools[key],spinning=t.state.status==='spinning',locked=!connected||busy.has(key)||spinning;
     fold($(key+'-fold'),$(key+'-sound'),t.soundCollapsed);fold($(key+'-options-fold'),$(key+'-options'),t.optionsCollapsed);
     if(!busy.has(key)){$(key+'-enabled').checked=t.soundEnabled;$(key+'-volume').value=t.soundVolume;}$(key+'-volume').disabled=!connected;$(key+'-volume-label').textContent=$(key+'-volume').value+'%';$(key+'-enabled-label').textContent=$(key+'-enabled').checked?'ON':'OFF';$(key+'-enabled').disabled=!connected||busy.has(key);
     const select=$(key+'-sound-type');if(!busy.has(key))select.value=t.soundType;select.disabled=!connected||busy.has(key);for(const o of select.options)o.toggleAttribute('selected',o.value===select.value);
     $(key+'-fold').disabled=!connected||busy.has(key);$(key+'-options-fold').disabled=!connected||busy.has(key);
     $(key+'-generate').disabled=locked||t.state.status==='ready';$(key+'-spin').disabled=locked||!['ready','result'].includes(t.state.status);$(key+'-spin').textContent=spinning?'GIRANDO…':'GIRAR';
     $(key+'-reset').disabled=locked;$(key+'-visibility').disabled=locked||t.state.status==='idle';$(key+'-visibility').textContent=t.state.visible?'OCULTAR EN OBS':'MOSTRAR EN OBS';
     $(key+'-status').textContent=messages[key]||(spinning?'Giro en curso…':t.state.status==='result'?'Resultado: '+t.state.items.map(i=>i.name).join(' · '):t.state.status==='ready'?'Ruleta preparada.':'Generá la ruleta para comenzar.');
     $(key+'-connection').textContent=connected?(packet.notice||'Configuración y resultados guardados en esta PC.'):'Sin conexión. Conservá abierta la ventana del servidor.';
     SanLeanAudioControls.sync($(key));renderSummary(key,t);
     const pool=currentPool(key,t);
     if(key==='killer-wheel'){
       $(key).querySelectorAll('[data-repeat]').forEach(b=>{b.disabled=locked;b.setAttribute('aria-pressed',String(t.repeatMode===b.dataset.repeat));});
       $(key+'-used').hidden=t.repeatMode==='remove';$(key+'-used').textContent='Los Killers pueden volver a salir en cualquier giro.';
       $(key+'-reset-used').hidden=t.repeatMode!=='remove';$(key+'-reset-used').disabled=locked||!t.usedKillerEntries.length;
     }
     if(key===active){SanLeanRouletteView.render($(key+'-stage'),{kind:d.kind,settings:{pool},state:t.state},{preview:true});if(!t.optionsCollapsed)renderGrid(key,t,locked);}
     if(key!==active||!t.soundEnabled||!connected||packet.overlayListeners[key]>0||!spinning){for(let i=0;i<4;i++)audio.stop(key+':'+i);}
   }
 }
 for(const key of Object.keys(defs)){
   const prefs=values=>request(key,'preferences',{values});
   $(key+'-fold').onclick=()=>prefs({soundCollapsed:!packet.state.tools[key].soundCollapsed});$(key+'-options-fold').onclick=()=>prefs({optionsCollapsed:!packet.state.tools[key].optionsCollapsed});
   $(key+'-volume').oninput=e=>{$(key+'-volume-label').textContent=e.target.value+'%';prefs({soundVolume:Number(e.target.value)});};$(key+'-enabled').onchange=e=>prefs({soundEnabled:e.target.checked});$(key+'-sound-type').onchange=e=>prefs({soundType:e.target.value});
   $(key+'-preview').onclick=async()=>{try{const ok=await audio.preview(key,packet.state.tools[key].soundType,packet.state.tools[key].soundVolume);$(key+'-audio-status').textContent=ok?'Muestra reproducida.':'Habilitá el audio de esta pestaña.';}catch(e){$(key+'-audio-status').textContent='No se pudo reproducir el audio: '+e.message;}};
   audio.attach($(key+'-stage'),key,()=>key===active&&connected&&packet?.overlayListeners[key]===0&&packet.state.tools[key].state.status==='spinning'?packet.state.tools[key]:null);
   $(key+'-generate').onclick=()=>request(key,'generate');$(key+'-spin').onclick=()=>request(key,'spin');$(key+'-visibility').onclick=()=>request(key,'visibility',{visible:!packet.state.tools[key].state.visible});
   $(key+'-reset').onclick=async()=>{if(await SanLeanConfirm.open({eyebrow:$(key).querySelector('h2').textContent,title:'RESTABLECER RULETA',text:'Todas las opciones volverán a tener una entrada. Se quitarán los nombres agregados y el resultado actual. Las opciones de sonido y el modo de repetición se conservarán.',confirmLabel:'RESTABLECER',cancelLabel:'CANCELAR'}))request(key,'reset',{confirm:'RESTABLECER RULETA'});};
   $(key+'-search').oninput=e=>{searches[key]=e.target.value;render();};
   const add=async card=>{const id=card.dataset.key,name=card.querySelector('input').value;document.activeElement?.blur();if(await request(key,'add',{key:id,name})){drafts[key]??={};drafts[key][id]='';const input=[...$(key+'-grid').querySelectorAll('.donor-input')].find(el=>el.closest('[data-key]').dataset.key===id);if(input)input.value='';delete signatures[key];render();}};
   $(key+'-grid').oninput=e=>{if(e.target.matches('.donor-input')){drafts[key]??={};drafts[key][e.target.closest('[data-key]').dataset.key]=e.target.value;}};
   $(key+'-grid').addEventListener('focusout',()=>{setTimeout(()=>{if(!$(key+'-grid').contains(document.activeElement))render();},0);});
   $(key+'-grid').onclick=e=>{const b=e.target.closest('button'),card=b?.closest('[data-key]');if(!b||!card||b.disabled)return;if(b.dataset.delta)request(key,'weight',{key:card.dataset.key,delta:Number(b.dataset.delta)});else if(b.dataset.remove!==undefined)request(key,'remove',{key:card.dataset.key,entryId:b.dataset.remove});else if(b.classList.contains('add-entry'))add(card);};
   $(key+'-grid').onkeydown=e=>{if(e.key==='Enter'&&e.target.matches('.donor-input')){e.preventDefault();add(e.target.closest('[data-key]'));}};
 }
 $('killer-wheel').querySelectorAll('[data-repeat]').forEach(b=>b.onclick=()=>request('killer-wheel','mode',{value:b.dataset.repeat}));
 $('killer-wheel-reset-used').onclick=async()=>{
   if(await SanLeanConfirm.open({eyebrow:'RULETA DE KILLERS',title:'RESTABLECER KILLERS USADOS',text:'Se volverán a habilitar todos los Killers que ya salieron en esta sesión. Las donaciones y configuraciones actuales se conservarán.',cancelLabel:'CANCELAR',confirmLabel:'RESTABLECER'}))request('killer-wheel','resetUsed');
 };
 audio.ready.then(()=>{window.wheelAudioReady=true;}).catch(e=>{for(const key of Object.keys(defs))$(key+'-audio-status').textContent=e.message;});window.wheelAudio=audio;
})().catch(e=>{console.error(e);document.querySelector('#inicio .stream-module-head p:last-child').textContent='No se pudo cargar el paquete: '+e.message;});
