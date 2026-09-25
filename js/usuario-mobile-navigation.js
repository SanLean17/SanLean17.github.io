/* Mobile navigation reuses the existing section controls and session actions. */
(() => {
  const mobile = matchMedia('(max-width:760px)');
  const groups = [
    ['panel','MI PANEL', [['home','INICIO'],['overlays','OVERLAYS OBS'],['votes','VOTACIONES'],['giveaways','SORTEOS'],['platforms','TWITCH / KICK'],['tournament','TORNEO 1VS1']]],
    ['roulette','RULETAS', [['killers','KILLERS'],['killerPerks','PERKS DE KILLERS'],['survivor','PERKS DE SUPERVIVIENTES']]],
    ['account','MI CUENTA', [['home','MI CUENTA'],['profile','MI PERFIL'],['security','SEGURIDAD'],['collaborators','COLABORADORES'],['connections','CONEXIONES']]]
  ];
  const account = document.body.classList.contains('account-page');
  const dialog = document.createElement('dialog');
  dialog.className = 'mobile-user-navigation';
  dialog.id = 'mobileUserNavigation';
  dialog.setAttribute('aria-labelledby','mobileNavigationTitle');
  dialog.innerHTML = '<header><h2 id="mobileNavigationTitle">NAVEGACIÓN</h2><button type="button" class="mobile-nav-close" aria-label="Cerrar navegación">×</button></header><div class="mobile-nav-columns"><div class="mobile-nav-groups" role="tablist" aria-label="Categorías" aria-orientation="vertical"></div><nav class="mobile-nav-options" id="mobileNavigationOptions" role="tabpanel" aria-label="Secciones"></nav></div><footer><button type="button" class="mobile-nav-logout">CERRAR SESIÓN</button></footer>';
  document.body.append(dialog);
  const tabs = dialog.querySelector('.mobile-nav-groups');
  const options = dialog.querySelector('.mobile-nav-options');
  let activeGroup = account ? 'account' : 'panel';
  let sourceTrigger = null;
  function currentKey(){return account ? document.querySelector('.account-nav .active')?.dataset.section || 'home' : document.querySelector('.panel-tabs .active')?.dataset.sectionKey || 'home'}
  function selectGroup(id){
    activeGroup = id;
    const group = groups.find(g=>g[0]===id);
    tabs.querySelectorAll('button').forEach(button=>{
      const selected=button.dataset.group===id;
      button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
    });
    options.setAttribute('aria-labelledby',`mobileCategory-${id}`);
    options.replaceChildren();
    group[2].forEach(([key,label])=>{
      const link=document.createElement('a');
      link.textContent=label;
      link.href=`./${id==='account'?'cuenta':'index'}.html#${key}`;
      if((id==='account')===account && key===currentKey())link.setAttribute('aria-current','page');
      link.addEventListener('click',event=>{
        if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
        event.preventDefault();close();
        if(id==='account' && account){document.querySelector(`.account-nav [data-section="${key}"]`)?.click();}
        else if(id!=='account' && !account){window.SanLeanUsuarioNavigation?.show(key);}
        else if(account){
          // Route through the existing unsaved-profile confirmation handler.
          const existing=document.querySelector('a.user-panel-link');
          const old=existing.getAttribute('href');existing.href=link.href;existing.click();existing.setAttribute('href',old);
        }else{location.href=link.href;}
      });
      options.append(link);
    });
  }
  groups.forEach(([id,label])=>{
    const button=document.createElement('button');button.type='button';button.role='tab';
    button.id=`mobileCategory-${id}`;button.dataset.group=id;button.textContent=label;
    button.setAttribute('aria-controls','mobileNavigationOptions');
    button.addEventListener('click',()=>selectGroup(id));tabs.append(button);
  });
  tabs.addEventListener('keydown',event=>{
    const buttons=[...tabs.children],index=buttons.indexOf(document.activeElement);
    if(index<0)return;
    let next=index;
    if(event.key==='ArrowDown')next=(index+1)%buttons.length;
    else if(event.key==='ArrowUp')next=(index+buttons.length-1)%buttons.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=buttons.length-1;
    else return;
    event.preventDefault();selectGroup(buttons[next].dataset.group);buttons[next].focus();
  });
  function close(){dialog.close();}
  dialog.addEventListener('close',()=>{
    document.body.classList.remove('mobile-navigation-open');
    if(sourceTrigger){sourceTrigger.setAttribute('aria-expanded','false');sourceTrigger.focus();}
  });
  dialog.querySelector('.mobile-nav-close').addEventListener('click',close);
  dialog.addEventListener('click',event=>{if(event.target===dialog)close()});
  dialog.querySelector('.mobile-nav-logout').addEventListener('click',()=>{
    close();document.getElementById(account?'accountLogout':'headerLogout')?.click();
  });
  window.addEventListener('click',event=>{
    const trigger=event.target.closest?.('.user-account-trigger');
    if(!mobile.matches||!trigger)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(document.getElementById('panelView')?.hidden)return;
    sourceTrigger=trigger;
    const key=currentKey();
    selectGroup(account?'account':['killers','killerPerks','survivor'].includes(key)?'roulette':'panel');
    dialog.showModal();document.body.classList.add('mobile-navigation-open');
    trigger.setAttribute('aria-expanded','true');
    tabs.querySelector('[aria-selected="true"]').focus();
  },true);
  function syncMode(){
    if(dialog.open)close();
    document.querySelectorAll('.user-account-trigger').forEach(trigger=>{
      trigger.setAttribute('aria-controls',mobile.matches?dialog.id:'accountIdentityDropdown');
      trigger.setAttribute('aria-expanded','false');
      if(mobile.matches)trigger.setAttribute('aria-haspopup','dialog');else trigger.removeAttribute('aria-haspopup');
    });
    document.querySelectorAll('.user-account-dropdown').forEach(menu=>menu.hidden=true);
  }
  mobile.addEventListener('change',syncMode);
  document.body.classList.add('mobile-navigation-ready');
  syncMode();
})();
