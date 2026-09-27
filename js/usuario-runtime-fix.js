// SANLEAN — USUARIO runtime recovery for stream workspaces and enhanced selects.
(()=>{
  const RECOVERY_PREFIX='sanlean-stream-runtime:';
  const $=id=>document.getElementById(id);

  function syncEnhancedSelect(select){
    if(!(select instanceof HTMLSelectElement))return;
    const root=select.nextElementSibling;
    if(!root?.classList.contains('ui-select-enhanced'))return;
    const trigger=root.querySelector(':scope>button');
    const label=trigger?.querySelector('span');
    const menu=root.querySelector(':scope>.ui-select-options');
    if(label)label.textContent=select.options[select.selectedIndex]?.textContent||'SELECCIONAR...';
    if(trigger)trigger.disabled=select.disabled;
    if(!menu)return;
    menu.innerHTML='';
    [...select.options].forEach(option=>{
      const button=document.createElement('button');
      button.type='button';
      button.textContent=option.textContent;
      button.disabled=option.disabled;
      button.addEventListener('click',()=>{
        select.value=option.value;
        select.dispatchEvent(new Event('change',{bubbles:true}));
        menu.hidden=true;
        trigger?.setAttribute('aria-expanded','false');
        syncEnhancedSelect(select);
      });
      menu.appendChild(button);
    });
  }

  function watchWorkspaceSelect(){
    const select=$('workspaceSelect');
    if(!select)return;
    const sync=()=>syncEnhancedSelect(select);
    new MutationObserver(sync).observe(select,{childList:true,subtree:true,attributes:true});
    select.addEventListener('change',sync);
    sync();setTimeout(sync,250);setTimeout(sync,1000);
  }

  async function recoverAfterAuth(session){
    if(!session?.user?.id)return;
    const key=RECOVERY_PREFIX+session.user.id;
    setTimeout(async()=>{
      const select=$('workspaceSelect');
      if(!select)return;
      if(window.SanLeanStreamTools?.getWorkspace?.()){syncEnhancedSelect(select);sessionStorage.removeItem(key);return}
      if(sessionStorage.getItem(key)==='reloaded')return;
      sessionStorage.setItem(key,'reloaded');
      location.reload();
    },1500);
  }

  function install(){
    watchWorkspaceSelect();
    const account=window.SanLeanAccount;
    if(!account)return;
    account.session().then(session=>{if(session)setTimeout(()=>syncEnhancedSelect($('workspaceSelect')),1200)}).catch(()=>{});
    account.onAuthChange?.((event,session)=>{
      if(event==='SIGNED_OUT')return;
      if(session&&['SIGNED_IN','INITIAL_SESSION','TOKEN_REFRESHED'].includes(event))recoverAfterAuth(session);
    });
  }

  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
