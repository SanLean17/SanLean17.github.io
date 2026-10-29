(()=>{
  const names={'meta':'METAS','win-streak':'WIN STREAK','all-killer':'ALL KILLER CHALLENGE','all-survivor':'ALL SURVIVOR CHALLENGE','killer-wheel':'RULETA DE KILLERS','perks-killer':'PERKS DE KILLERS','perks-survivor':'PERKS DE SUPERVIVIENTES'};
  const key=new URLSearchParams(location.search).get('tool'),status=document.getElementById('status');
  if(!names[key]){status.textContent='Herramienta no válida. Volvé al Gestor y elegí un monitor.';return;}
  document.getElementById('title').textContent=names[key];
  document.getElementById('control').href='/#'+key;
  document.getElementById('raw').href='/obs/'+key;
  const frame=document.getElementById('overlay');frame.src='/obs/'+key;
  const container=frame.parentElement,height=key.startsWith('all-')?360:1080;
  frame.style.height=height+'px';
  const resize=new ResizeObserver(()=>{const scale=container.clientWidth/1920;frame.style.transform='scale('+scale+')';container.style.height=(height*scale)+'px';});resize.observe(container);
  let stopped=false;
  async function update(){
    try{
      const scope=key.startsWith('all-')?'challenges':key==='meta'||key==='win-streak'?'counters':'tools';
      const response=await fetch('/api/'+scope+(scope==='tools'?'':'/'+key));if(!response.ok)throw Error();
      const packet=await response.json(),state=scope==='tools'?packet.state.tools[key]:packet.state;
      const labels={idle:'INACTIVO',inactive:'INACTIVO',active:'ACTIVO',ready:'PREPARADO',completed:'FINALIZADO',running:'EN CURSO',paused:'PAUSADO',finished:'FINALIZADO',spinning:'GIRANDO',result:'RESULTADO',hidden:'OCULTO'};
      const value=state.state?.status||state.status||state.phase||'disponible';
      status.textContent='Conexión local activa · Estado: '+(labels[value]||value.toUpperCase())+' · '+(state.visibilityMode==='hide'||state.state?.visible===false||state.visible===false?'Salida oculta':'Vista sincronizada con la herramienta');
      const doc=frame.contentDocument;
      if(doc&&doc.body&&doc.body.innerText.trim().startsWith('{"error"'))status.textContent='No se pudo abrir la salida. Volvé a iniciar la vista previa desde el Gestor.';
    }catch{status.textContent='Sin conexión con la vista previa. Abrila nuevamente desde el Gestor.';}
    if(!stopped)setTimeout(update,500);
  }
  window.addEventListener('pagehide',()=>{stopped=true;resize.disconnect();});update();
})();
