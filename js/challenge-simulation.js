/* Isolated visual fixture: no auth, tokens, persistence or live overlay requests. */
(()=>{
  const scene=document.querySelector('.simulation-scene'),viewport=document.querySelector('.simulation-viewport');
  const target=document.getElementById('simulationRoster'),info=document.getElementById('layoutInfo'),status=document.getElementById('simulationStatus');
  let catalog=[],layout='left';
  const resize=()=>{scene.style.transform=`scale(${viewport.clientWidth/1920})`};
  new ResizeObserver(resize).observe(viewport);resize();
  function render(){
    scene.dataset.layout=layout;
    document.querySelectorAll('button[data-layout]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.layout===layout)));
    const columns=layout==='top'?19:5,rows=Math.ceil(catalog.length/columns);
    info.textContent=layout==='top'?`${columns} columnas · ${rows} filas · 1920 × ${rows*100} px.`:`${columns} columnas · ${rows} filas · ≈505,26 × ${rows*100} px, al costado del stream.`;
    scene.querySelector('.simulation-roster').style.height=`${rows*100}px`;
    if(!catalog.length)return;
    window.SanLeanChallengeRosterView.render(target,{kind:'challenge_all_killers',settings:{lastRowAlignment:layout==='top'?'center':layout},state:{status:'active',visible:true,currentKey:catalog[2].key,entries:{[catalog[0].key]:'completed',[catalog[1].key]:'failed'}}},{columns});
  }
  document.querySelectorAll('button[data-layout]').forEach(button=>button.addEventListener('click',()=>{layout=button.dataset.layout;render()}));
  window.SanLeanChallengeRosterView.loadKillers().then(rows=>{catalog=rows;render();status.textContent=`${rows.length} Killers · ejemplo con pendiente, actual, completado y fallido.`}).catch(()=>{status.textContent='No se pudieron cargar los retratos. Recargá esta simulación para volver a intentar.'});
})();
