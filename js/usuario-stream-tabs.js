// SANLEAN — USUARIO navigation controller.
// This file is loaded last on MI PANEL and owns the final menu/router behavior.
// Rule: only one functional section may be visible at a time.
(()=>{
  const CORE_KEYS=new Set(['killers','killerPerks','survivor','tournament','overlays','votes','giveaways','platforms']);
  const MENU_ORDER=['home','overlays','votes','giveaways','platforms','killers','killerPerks','survivor','tournament'];
  const LABELS={
    home:'INICIO',
    overlays:'OVERLAYS OBS',
    votes:'VOTACIONES',
    giveaways:'SORTEOS',
    platforms:'TWITCH / KICK',
    killers:'KILLERS',
    killerPerks:'PERKS DE KILLERS',
    survivor:'PERKS DE SUPERVIVIENTES',
    tournament:'TORNEO 1VS1'
  };
  const HEADERS={
    overlays:{kicker:'STREAM',title:'OVERLAYS OBS',copy:'Generá y controlá las vistas transparentes que vas a utilizar durante el stream.<br>Administrá desde acá cada overlay y sus acciones antes de llevarlo a OBS.'},
    votes:{kicker:'CHAT',title:'VOTACIONES',copy:'Creá votaciones para que el chat elija entre las opciones que prepares para cada ronda.<br>Controlá el resultado y decidí manualmente cuándo continuar con la acción ganadora.'},
    giveaways:{kicker:'COMUNIDAD',title:'SORTEOS',copy:'Configurá la participación por palabra clave y definí quién puede ingresar a cada sorteo.<br>Abrí, cerrá y controlá la sesión desde un único lugar durante el stream.'},
    platforms:{kicker:'INTEGRACIONES',title:'TWITCH / KICK',copy:'Vinculá las plataformas de cada streamer para habilitar herramientas y automatizaciones.<br>Administrá las conexiones de Twitch y Kick desde la misma cuenta de SanLean.'},
    killers:{kicker:'RULETAS',title:'KILLERS',copy:'Administrá los killers disponibles en tu ruleta y configurá la presencia de cada opción.<br>Revisá los valores y registrá quién agregó cada killer antes de utilizar la ruleta.'},
    killerPerks:{kicker:'RULETAS',title:'PERKS DE KILLERS',copy:'Administrá las perks de Killer disponibles y configurá la presencia de cada opción.<br>Revisá los valores y registrá quién agregó cada perk antes de utilizar la ruleta.'},
    survivor:{kicker:'RULETAS',title:'PERKS DE SUPERVIVIENTES',copy:'Administrá las perks de Superviviente disponibles y configurá la presencia de cada opción.<br>Revisá los valores y registrá quién agregó cada perk antes de utilizar la ruleta.'},
    tournament:{kicker:'COMPETENCIA',title:'TORNEO 1VS1',copy:'Creá y administrá tus torneos 1VS1 desde el mismo espacio de trabajo de SanLean.<br>Gestioná participantes, tiempos, resultados e historial sin salir de esta sección.'}
  };

  const $=id=>document.getElementById(id);

  function ensureHome(){
    const panel=$('panelView');
    let home=$('dashboardHome');
    if(home||!panel)return home;
    home=document.createElement('section');
    home.id='dashboardHome';
    home.className='dashboard-home';
    home.innerHTML='<div class="dashboard-welcome"><p class="eyebrow">PANEL DE USUARIO</p><h2>BIENVENIDO A <span>MI PANEL</span></h2><p>Administrá tus ruletas, torneos, colaboradores y conexiones desde un solo lugar.<br>Elegí una sección del menú para comenzar a configurar tu cuenta.</p></div><div class="dashboard-cards"><article class="dashboard-card"><span class="card-kicker">RULETAS</span><h3>CONFIGURACIÓN</h3><p>Administrá killers, perks de Killer y perks de Superviviente disponibles en tus ruletas.</p><button type="button" data-go="killers">VER RULETAS</button></article><article class="dashboard-card"><span class="card-kicker">PLATAFORMAS</span><h3>TWITCH + KICK</h3><p>Prepará tus conexiones para automatizar acciones de las ruletas con eventos de tus canales.</p><button type="button" data-go="platforms">VER PLATAFORMAS</button></article><article class="dashboard-card"><span class="card-kicker">CUENTA</span><h3>COLABORADORES</h3><p>Administrá quién puede trabajar en cada sección de tu panel y revisá sus permisos.</p><button type="button" data-account="collaborators">ADMINISTRAR</button></article></div>';
    const tabs=panel.querySelector('.panel-tabs');
    tabs?.insertAdjacentElement('afterend',home);
    return home;
  }

  function normalizeMenu(){
    const old=document.querySelector('.panel-tabs');
    if(!old)return null;

    // Clone once to remove every legacy click handler registered by older modules.
    const tabs=old.cloneNode(true);
    old.replaceWith(tabs);

    // Legacy separate TWITCH/KICK buttons duplicated the integrated platform section.
    tabs.querySelectorAll('[data-platform]').forEach(btn=>btn.remove());

    let homeBtn=tabs.querySelector('[data-dashboard="home"]');
    if(!homeBtn){
      homeBtn=document.createElement('button');
      homeBtn.type='button';
      homeBtn.dataset.dashboard='home';
      tabs.prepend(homeBtn);
    }

    const byKey={home:homeBtn};
    tabs.querySelectorAll('button[data-tab]').forEach(btn=>{byKey[btn.dataset.tab]=btn});

    MENU_ORDER.forEach(key=>{
      const btn=byKey[key];
      if(!btn)return;
      btn.textContent=LABELS[key];
      btn.classList.remove('active','menu-group-start');
      btn.dataset.sectionKey=key;
      tabs.appendChild(btn);
    });

    // Visual group boundaries without creating a second navigation system.
    byKey.platforms?.classList.add('menu-group-start');
    byKey.killers?.classList.add('menu-group-start');
    byKey.tournament?.classList.add('menu-group-start');
    return tabs;
  }

  function hideEverySection(){
    [
      $('dashboardHome'),$('roulettePanel'),$('tournamentPanel'),
      $('streamOverlaysPanel'),$('streamVotesPanel'),$('streamGiveawaysPanel'),$('streamPlatformsPanel'),
      $('platformPanel')
    ].forEach(section=>{if(section)section.hidden=true});
  }

  function setActive(tabs,key){
    tabs.querySelectorAll('button').forEach(btn=>btn.classList.toggle('active',btn.dataset.sectionKey===key));
  }

  function sectionElement(key){
    if(['killers','killerPerks','survivor'].includes(key))return $('roulettePanel');
    if(key==='tournament')return $('tournamentPanel');
    if(key==='overlays')return $('streamOverlaysPanel');
    if(key==='votes')return $('streamVotesPanel');
    if(key==='giveaways')return $('streamGiveawaysPanel');
    if(key==='platforms')return $('streamPlatformsPanel');
    return null;
  }

  function ensureSectionHeader(key){
    const meta=HEADERS[key],section=sectionElement(key);
    if(!meta||!section)return;
    let head;
    if(section.classList.contains('stream-module')){
      head=section.querySelector('.stream-module-head');
      if(!head){head=document.createElement('div');head.className='stream-module-head';section.prepend(head)}
    }else{
      head=section.querySelector('.section-context');
      if(!head){head=document.createElement('div');head.className='section-context';section.prepend(head)}
    }
    head.innerHTML=`<p class="eyebrow">${meta.kicker}</p><h2>${meta.title}</h2><p>${meta.copy}</p>`;
  }

  function show(key,{updateHash=true}={}){
    const tabs=document.querySelector('.panel-tabs');
    if(!tabs)return;
    if(!MENU_ORDER.includes(key))key='home';

    hideEverySection();

    if(key==='home'){
      ensureHome().hidden=false;
    }else if(CORE_KEYS.has(key)){
      ensureSectionHeader(key);
      // The canonical controller owns roulette loading and stream/tournament visibility.
      window.SanLeanPanel?.selectSection?.(key,{updateHash:false});
      // SanLeanPanel intentionally knows nothing about the home/dashboard, so enforce again.
      if($('dashboardHome'))$('dashboardHome').hidden=true;
      if($('platformPanel'))$('platformPanel').hidden=true;
    }

    setActive(tabs,key);
    if(updateHash){
      const next=key==='home'?location.pathname:`#${key}`;
      history.replaceState(null,'',next);
    }
  }

  function installTieRepeat(){
    const status=$('voteRoundStatus');
    const repeat=$('repeatVoteRound');
    if(!status||!repeat)return;
    let restarting=false;
    const check=()=>{
      const text=(status.textContent||'').toLocaleLowerCase('es');
      if(restarting||!text.includes('empatada'))return;
      restarting=true;
      status.textContent='La ronda terminó empatada. Se reinicia la votación completa con las mismas cinco cartas.';
      setTimeout(()=>{repeat.click();restarting=false},350);
    };
    new MutationObserver(check).observe(status,{childList:true,subtree:true,characterData:true});
    check();
  }

  function install(){
    const panel=$('panelView');
    if(!panel)return;
    ensureHome();
    const tabs=normalizeMenu();
    if(!tabs)return;

    // Build every canonical heading once so all sections share the same component from first render.
    Object.keys(HEADERS).forEach(ensureSectionHeader);

    tabs.addEventListener('click',e=>{
      const btn=e.target.closest('button[data-section-key]');
      if(!btn)return;
      e.preventDefault();
      show(btn.dataset.sectionKey);
    });

    $('dashboardHome')?.addEventListener('click',e=>{
      const go=e.target.closest('[data-go]');
      if(go){e.preventDefault();show(go.dataset.go);return}
      const account=e.target.closest('[data-account]');
      if(account)location.href=`./cuenta.html#${account.dataset.account}`;
    });

    const openLocation=()=>{
      const key=location.hash.replace('#','');
      show(MENU_ORDER.includes(key)?key:'home',{updateHash:false});
    };
    window.addEventListener('hashchange',openLocation);

    // Auth reveals panelView asynchronously. Always route once it becomes visible.
    const observer=new MutationObserver(()=>{if(!panel.hidden)openLocation()});
    observer.observe(panel,{attributes:true,attributeFilter:['hidden']});
    if(!panel.hidden)openLocation();

    installTieRepeat();
    window.SanLeanUsuarioNavigation={show,order:[...MENU_ORDER]};
  }

  window.addEventListener('DOMContentLoaded',install);
})();
