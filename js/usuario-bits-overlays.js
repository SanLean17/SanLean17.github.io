(()=>{
 const $=id=>document.getElementById(id);
 let observer=null;
 function renamePauseButtons(){
  const rules=$('bitsActivationToggle'),entries=$('bitsTimerToggle');
  if(rules){
   if(rules.textContent.trim()==='PAUSAR ACTIVACIONES')rules.textContent='PAUSAR REGLAS';
   if(rules.textContent.trim()==='REANUDAR ACTIVACIONES')rules.textContent='REANUDAR REGLAS';
  }
  if(entries){
   if(entries.textContent.trim()==='PAUSAR TEMPORIZADORES')entries.textContent='PAUSAR ENTRADAS';
   if(entries.textContent.trim()==='REANUDAR TEMPORIZADORES')entries.textContent='REANUDAR ENTRADAS';
  }
 }
 function ownerVisible(box){
  const known=window.SanLeanStreamTools?.getWorkspace?.();
  if(!known){box.hidden=true;return}
  box.hidden=!window.SanLeanStreamTools?.isOwner?.();
 }
 function moveObsManager(){
  const source=$('bitsCopyAlert')?.closest('.module-box'),panel=$('streamOverlaysPanel');
  if(!source||!panel)return false;
  source.id='bitsObsManager';
  source.classList.add('bits-obs-manager');
  const help=[...panel.children].find(el=>el.classList?.contains('module-help'));
  if(source.parentElement!==panel)panel.insertBefore(source,help||null);
  ownerVisible(source);
  renamePauseButtons();
  return true;
 }
 function sync(){moveObsManager();renamePauseButtons()}
 function install(){
  sync();
  observer?.disconnect();
  observer=new MutationObserver(()=>sync());
  const bits=$('streamBitsPanel');
  if(bits)observer.observe(bits,{childList:true,subtree:true,characterData:true});
  const manager=$('bitsObsManager');
  if(manager)observer.observe(manager,{childList:true,subtree:true,characterData:true});
  window.addEventListener('sanlean:overlays-updated',sync);
  window.addEventListener('hashchange',sync);
  setTimeout(sync,0);setTimeout(sync,250);setTimeout(sync,900);
 }
 window.addEventListener('DOMContentLoaded',install);
})();