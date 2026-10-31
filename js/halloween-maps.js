import {categories,clamp,fit,normalized,zoomAt,validPoint,validateCatalog} from './halloween-map-model.mjs';

const app=document.querySelector('#halloweenMaps');
if(app)initialize();
async function initialize(){
 const el=id=>app.querySelector('#hm'+id);
 const gallery=el('Gallery'),viewer=el('Viewer'),viewport=el('Viewport'),scene=el('Scene');
 let maps,current,camera={scale:1,x:0,y:0},baseScale=1,ready=false,placing=false,loadId=0,lastInfoTrigger;
 let fittedViewport={width:0,height:0};
 let points=new Map(),gesture=null,moved=false,ignoreClickUntil=0,tapMarker=null;
 let pins={};const storageKey='sanlean.halloween.positions.v1';
 try{const value=JSON.parse(sessionStorage.getItem(storageKey));if(value&&typeof value==='object'&&!Array.isArray(value))for(const [id,p] of Object.entries(value))if(/^[a-z0-9-]+$/.test(id)&&validPoint(p))pins[id]={x:p.x,y:p.y};}catch{/* Storage is optional, never blocks the viewer. */}
 const hiddenTypes=new Set();
 const create=(tag,classes,text)=>{const node=document.createElement(tag);if(classes)node.className=classes;if(text!==undefined)node.textContent=text;return node;};
 function icon(type){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',categories[type].icon);svg.append(p);return svg;}
 function announce(text){el('PinHint').textContent=text;}
 function persist(){try{sessionStorage.setItem(storageKey,JSON.stringify(pins));}catch{announce('Tu posición se conserva mientras esta página esté abierta.');}}
 function paint(){
  scene.style.transform=`translate(${camera.x}px,${camera.y}px) scale(${camera.scale})`;
  scene.style.setProperty('--marker-scale',1/camera.scale);
  el('Zoom').value=Math.round(camera.scale/baseScale*100)+'%';
  el('ZoomOut').disabled=!ready||camera.scale<=baseScale+.00001;
  el('ZoomIn').disabled=!ready||camera.scale>=baseScale*8-.00001;
 }
 function constrain(){
  const w=current.width*camera.scale,h=current.height*camera.scale,vw=viewport.clientWidth,vh=viewport.clientHeight;
  camera.x=w<=vw?(vw-w)/2:clamp(camera.x,vw-w-24,24);
  camera.y=h<=vh?(vh-h)/2:clamp(camera.y,vh-h-24,24);
 }
 function reset(){if(!current||!ready)return;const width=viewport.clientWidth,height=viewport.clientHeight;if(!width||!height)return;camera=fit(current.width,current.height,width,height);baseScale=camera.scale;fittedViewport={width,height};paint();}
 function zoom(factor,point={x:viewport.clientWidth/2,y:viewport.clientHeight/2}){if(!ready)return;camera=zoomAt(camera,point,clamp(camera.scale*factor,baseScale,baseScale*8));constrain();paint();}
 function position(node,p){node.style.left=p.x*100+'%';node.style.top=p.y*100+'%';}
 function setPlacing(active){placing=active;el('Place').setAttribute('aria-pressed',String(active));viewport.classList.toggle('is-placing',active);announce(active?'TOCÁ EL MAPA DONDE ESTÁS · Esc para cancelar.':'');}
 function closeInfo(){el('Info').hidden=true;}
 function info(type,title,description,notes='',trigger){
  lastInfoTrigger=trigger;el('InfoType').textContent=type;el('InfoTitle').textContent=title;el('InfoText').textContent=description;el('InfoNotes').textContent=notes;el('Info').hidden=false;
  el('Info').focus({preventScroll:true});el('Info').scrollIntoView({block:'nearest',behavior:'instant'});
 }
 function renderPin(){
  el('PinLayer').replaceChildren();el('Clear').hidden=!pins[current.id];
  if(!pins[current.id])return;
  const pin=create('button','hm-marker hm-personal');pin.type='button';pin.title='MI POSICIÓN';pin.setAttribute('aria-label','MI POSICIÓN');position(pin,pins[current.id]);
  pin.addEventListener('click',()=>{if(performance.now()<ignoreClickUntil||placing)return;info('PIN PERSONAL','MI POSICIÓN','Esta marca es solo tuya y se conserva durante esta sesión.','Podés reubicarla con MARCAR MI POSICIÓN o borrarla.',pin);});el('PinLayer').append(pin);
 }
 function place(point){const p=normalized(point,camera,current.width,current.height);if(!validPoint(p)){announce('Elegí un punto dentro de la imagen del mapa.');return;}pins[current.id]=p;ignoreClickUntil=performance.now()+350;setPlacing(false);persist();renderPin();announce('MI POSICIÓN guardada solo en esta sesión.');}
 function renderMarkers(){
  el('Markers').replaceChildren();
  for(const marker of current.markers){
   if(hiddenTypes.has(marker.type))continue;
   const button=create('button','hm-marker');button.type='button';button.style.setProperty('--marker-color',categories[marker.type].color);button.append(icon(marker.type));position(button,marker);
   const title=(marker.possible?'Posible ubicación · ':'')+marker.title;button.title=title+' — '+marker.description;button.setAttribute('aria-label',title);
   button.addEventListener('click',()=>{if(performance.now()<ignoreClickUntil||placing)return;const caution=marker.possible?'Su aparición puede variar entre partidas. ':'';const confidence=marker.confidence!=='confirmed'?'Referencia orientativa, pendiente de verificación completa. ':'';info(categories[marker.type].name,title,marker.description,caution+confidence+[marker.requirements,marker.variant,marker.notes].filter(Boolean).join(' · '),button);});el('Markers').append(button);
  }
 }
 function renderFilters(){
  el('Filters').replaceChildren();
  for(const [type,category] of Object.entries(categories)){
   const count=current.markers.filter(m=>m.type===type).length;
   // No absent categories on real maps; placeholders preview the supported legend honestly.
   if(!count&&!current.placeholder)continue;
   const button=create('button','hm-filter');button.type='button';button.setAttribute('aria-pressed',String(!hiddenTypes.has(type)));button.disabled=!count;button.setAttribute('aria-label',category.name+': '+count+' puntos');
   const symbol=create('span','hm-icon');symbol.style.setProperty('--marker-color',category.color);symbol.append(icon(type));button.append(symbol,create('span','',category.name),create('span','',String(count)));
   button.addEventListener('click',()=>{if(hiddenTypes.has(type))hiddenTypes.delete(type);else hiddenTypes.add(type);button.setAttribute('aria-pressed',String(!hiddenTypes.has(type)));closeInfo();renderMarkers();});el('Filters').append(button);
  }
  el('Labels').disabled=!current.labels.length;
 }
 function renderLabels(){el('LabelLayer').replaceChildren();for(const label of current.labels){const node=create('span','hm-label',label.text);position(node,label);el('LabelLayer').append(node);}el('LabelLayer').hidden=!el('Labels').checked;}
 function stopGesture(){for(const id of points.keys()){if(viewport.hasPointerCapture(id))viewport.releasePointerCapture(id);}points.clear();gesture=null;viewport.classList.remove('is-dragging');}
 function loadMap(map){
  stopGesture();current=map;ready=false;const request=++loadId;setPlacing(false);closeInfo();hiddenTypes.clear();gallery.hidden=true;el('GalleryHeading').hidden=true;viewer.hidden=false;scene.hidden=true;
  el('MapTitle').textContent=map.name;el('MapTitle').focus({preventScroll:true});el('MapTitle').scrollIntoView({block:'start',behavior:'instant'});
  el('Notice').textContent=map.placeholder?'ESQUEMA ARTÍSTICO · La ilustración no representa las calles ni las posiciones reales del juego. Podés explorar los controles de zoom y tu marcador personal; los puntos de escape todavía no tienen coordenadas verificadas.':'Las marcas indican ubicaciones posibles; verificá siempre las condiciones de tu partida.';
  el('MapSummary').textContent=map.summary||'Referencias oficiales del escenario.';
  el('Verified').replaceChildren(...(map.highlights||[]).map(name=>create('li','',name)));
  const source=el('Official');
  if(typeof map.officialSourceUrl==='string'&&/^https:\/\/halloweengame\.com\/news\/[a-z0-9-]+\/$/.test(map.officialSourceUrl)){source.href=map.officialSourceUrl;source.hidden=false;}else{source.removeAttribute('href');source.hidden=true;}
  for(const button of el('MapList').children)button.setAttribute('aria-current',String(button.dataset.map===map.id));
  el('ImageState').textContent='CARGANDO MAPA...';el('ImageState').hidden=false;viewport.setAttribute('aria-busy','true');
  for(const id of ['ZoomIn','ZoomOut','Reset','Place'])el(id).disabled=true;
  renderFilters();renderLabels();renderMarkers();renderPin();
  scene.style.width=map.width+'px';scene.style.height=map.height+'px';
  const image=new Image();image.alt=map.placeholder?map.name+' · imagen del mapa pendiente':map.name;image.draggable=false;image.id='hmImage';
  image.onload=()=>{if(request!==loadId)return;el('Image').replaceWith(image);ready=true;scene.hidden=false;el('ImageState').hidden=true;viewport.setAttribute('aria-busy','false');for(const id of ['Reset','Place'])el(id).disabled=false;reset();};
  image.onerror=()=>{if(request!==loadId)return;el('ImageState').textContent='NO SE PUDO CARGAR EL MAPA · Podés elegir otro mapa.';viewport.setAttribute('aria-busy','false');};image.src=map.image;
 }
 for(let i=0;i<10;i++){const a=create('span','',String.fromCharCode(65+i)),n=create('span','',String(i+1));a.style.left=(i*10+5)+'%';a.style.top='0';n.style.top=(i*10+5)+'%';n.style.left='0';el('Grid').append(a,n);}
 const compact=matchMedia('(max-width:900px)');el('Legend').open=!compact.matches;compact.addEventListener('change',()=>{el('Legend').open=!compact.matches;});
 el('Labels').addEventListener('change',()=>{el('LabelLayer').hidden=!el('Labels').checked;});el('GridToggle').addEventListener('change',()=>{el('Grid').hidden=!el('GridToggle').checked;});
 el('ZoomIn').addEventListener('click',()=>zoom(1.25));el('ZoomOut').addEventListener('click',()=>zoom(.8));el('Reset').addEventListener('click',reset);
 el('Style').addEventListener('click',()=>{
  const next=!viewport.classList.contains('hm-paper');
  viewport.classList.toggle('hm-paper',next);
  el('Style').setAttribute('aria-pressed',String(next));
  el('Style').textContent=next?'VISTA OSCURA':'VISTA CLARA';
 });
 const fullscreen=el('Fullscreen');
 if(!viewport.requestFullscreen){fullscreen.hidden=true;}else{
  fullscreen.addEventListener('click',async()=>{
   try{if(document.fullscreenElement===viewport)await document.exitFullscreen();else await viewport.requestFullscreen();}
   catch{announce('Tu navegador no permite el modo de pantalla completa. Podés usar los controles de zoom.');}
  });
  document.addEventListener('fullscreenchange',()=>{fullscreen.textContent=document.fullscreenElement===viewport?'SALIR DE PANTALLA COMPLETA':'PANTALLA COMPLETA';});
 }
 el('Place').addEventListener('click',()=>{closeInfo();setPlacing(!placing);if(placing)viewport.focus({preventScroll:true});});
 el('Clear').addEventListener('click',()=>{delete pins[current.id];persist();renderPin();closeInfo();setPlacing(false);announce('Posición borrada.');el('Place').focus({preventScroll:true});});
 el('InfoClose').addEventListener('click',()=>{closeInfo();if(lastInfoTrigger?.isConnected)lastInfoTrigger.focus({preventScroll:true});});
 el('Back').addEventListener('click',()=>{++loadId;stopGesture();setPlacing(false);viewer.hidden=true;gallery.hidden=false;el('GalleryHeading').hidden=false;ready=false;gallery.querySelector(`[data-map="${current.id}"]`)?.focus();});
 const local=e=>{const rect=viewport.getBoundingClientRect();return {x:e.clientX-rect.left-viewport.clientLeft,y:e.clientY-rect.top-viewport.clientTop};};
 const snapshot=()=>{const values=[...points.values()];gesture={camera:{...camera},values};};
 viewport.addEventListener('pointerdown',event=>{
  if(!ready||event.button!==0)return;
  if(points.size>=2)return;
  if(!points.size){moved=false;tapMarker=event.target.closest('.hm-marker');viewport.focus({preventScroll:true});}
  points.set(event.pointerId,local(event));viewport.setPointerCapture(event.pointerId);if(points.size>1)moved=true;snapshot();viewport.classList.add('is-dragging');event.preventDefault();
 });
 viewport.addEventListener('pointermove',event=>{
  if(!points.has(event.pointerId)||!gesture)return;points.set(event.pointerId,local(event));const values=[...points.values()],old=gesture.values;
  if(values.length===2&&old.length===2){
   const midpoint=p=>({x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2}),distance=p=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
   const start=midpoint(old),end=midpoint(values),scale=clamp(gesture.camera.scale*distance(values)/Math.max(distance(old),1),baseScale,baseScale*8);
   camera=zoomAt(gesture.camera,start,scale);camera.x+=end.x-start.x;camera.y+=end.y-start.y;moved=true;
  }else if(values.length===1&&old.length===1){const dx=values[0].x-old[0].x,dy=values[0].y-old[0].y;if(Math.hypot(dx,dy)>5)moved=true;camera={...gesture.camera,x:gesture.camera.x+dx,y:gesture.camera.y+dy};}
  constrain();paint();event.preventDefault();
 });
 function endPointer(event){
  if(!points.has(event.pointerId))return;const tap=!moved&&points.size===1&&event.type==='pointerup';points.delete(event.pointerId);if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);
  if(points.size)snapshot();else{gesture=null;viewport.classList.remove('is-dragging');}
  if(moved)ignoreClickUntil=performance.now()+350;
  if(tap&&placing)place(local(event));
  else if(tap&&tapMarker){ignoreClickUntil=0;tapMarker.click();ignoreClickUntil=performance.now()+350;}
  if(!points.size)tapMarker=null;
 }
 for(const event of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(event,endPointer);
 window.addEventListener('blur',stopGesture);
 viewport.addEventListener('wheel',event=>{if(!ready)return;event.preventDefault();zoom(Math.exp(-clamp(event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?viewport.clientHeight:1),-300,300)*.002),local(event));},{passive:false});
 viewport.addEventListener('dblclick',event=>{if(!placing&&!event.target.closest('button'))zoom(1.5,local(event));});
 viewport.addEventListener('keydown',event=>{
  if(event.target!==viewport||!ready)return;
  if(['+','=','-','0','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','Escape'].includes(event.key))event.preventDefault();else return;
  if(event.key==='+'||event.key==='=')zoom(1.25);else if(event.key==='-')zoom(.8);else if(event.key==='0')reset();else if(event.key==='Enter'&&placing)place({x:viewport.clientWidth/2,y:viewport.clientHeight/2});else if(event.key==='Escape')setPlacing(false);else{const delta={ArrowUp:[0,40],ArrowDown:[0,-40],ArrowLeft:[40,0],ArrowRight:[-40,0]}[event.key];if(delta){camera.x+=delta[0];camera.y+=delta[1];constrain();paint();}}
 });
 app.addEventListener('keydown',event=>{if(event.key==='Escape'){setPlacing(false);if(!el('Info').hidden){closeInfo();lastInfoTrigger?.focus({preventScroll:true});}}});
 new ResizeObserver(()=>{if(ready&&!viewer.hidden&&(Math.abs(viewport.clientWidth-fittedViewport.width)>1||Math.abs(viewport.clientHeight-fittedViewport.height)>1)){stopGesture();reset();}}).observe(viewport);
 try{
  const response=await fetch('/data/halloween-maps.json');if(!response.ok)throw Error('No disponible');maps=validateCatalog(await response.json()).maps;
  for(const map of maps){
   const card=create('button','hm-card');card.type='button';card.dataset.map=map.id;const image=create('img');image.src=map.image;image.alt='';image.loading='lazy';image.width=map.width;image.height=map.height;image.addEventListener('error',()=>{image.hidden=true;});
   const copy=create('span','hm-card-copy');copy.append(create('strong','',map.name),create('small','',map.placeholder?'ESQUEMA ILUSTRATIVO · MAPA INTERACTIVO':'POSIBLES UBICACIONES · CONSULTÁ TU PARTIDA'),create('span','hm-open','EXPLORAR MAPA →'));card.append(image,copy);card.addEventListener('click',()=>loadMap(map));gallery.append(card);
   const button=create('button','',map.name);button.type='button';button.dataset.map=map.id;
   // A horizontal touch scroller can suppress the compatibility click after a pinch.
   // Handle a deliberate stationary tap, but never a swipe, cancel or second finger.
   let tap=null,handledAt=0;
   button.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse'&&event.isPrimary)tap={id:event.pointerId,x:event.clientX,y:event.clientY};});
   button.addEventListener('pointermove',event=>{if(tap&&Math.hypot(event.clientX-tap.x,event.clientY-tap.y)>6)tap=null;});
   button.addEventListener('pointercancel',()=>{tap=null;});
   button.addEventListener('pointerup',event=>{if(tap&&tap.id===event.pointerId&&Math.hypot(event.clientX-tap.x,event.clientY-tap.y)<=6){handledAt=performance.now();event.preventDefault();loadMap(map);}tap=null;});
   button.addEventListener('click',event=>{if(event.detail===0||performance.now()-handledAt>500)loadMap(map);});el('MapList').append(button);
  }
  el('Load').hidden=true;
 }catch{el('Load').textContent='NO SE PUDIERON CARGAR LOS MAPAS. Volvé a intentar recargando la página.';}
}
