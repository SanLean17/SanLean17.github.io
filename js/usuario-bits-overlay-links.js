(()=>{
 const VERSION='20260930-2';
 const TYPES=['harmful','beneficial'];
 function apply(){
  for(const type of TYPES){
   const card=document.querySelector(`[data-bits-overlay-card="${type}"]`);
   if(!card)continue;
   const input=card.querySelector('.copy-row input');
   if(input){
    try{const u=new URL(input.value,location.origin);u.searchParams.set('mode','alert');u.searchParams.set('filter',type);u.searchParams.set('v',VERSION);input.value=u.href}catch{}
   }
   const copy=card.querySelector('p');
   if(copy)copy.textContent=type==='harmful'?'Muestra únicamente donaciones de reglas perjudiciales en esta Browser Source.':'Muestra únicamente donaciones de reglas beneficiosas en esta Browser Source.';
   const actions=card.querySelector('.overlay-actions');
   if(actions&&!actions.querySelector('[data-alert-preview]')){
    const btn=document.createElement('button');btn.type='button';btn.className='module-secondary';btn.dataset.alertPreview=type;btn.textContent='VISTA PREVIA';
    btn.addEventListener('click',()=>window.open(`${location.origin}/Usuario/alertas.html?demo=1&mode=alert&style=${type}&v=${VERSION}`,'_blank','noopener'));
    actions.appendChild(btn);
   }
  }
 }
 function install(){apply();const grid=document.getElementById('overlayGrid');if(grid)new MutationObserver(apply).observe(grid,{childList:true,subtree:true});window.addEventListener('sanlean:overlays-updated',apply)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();