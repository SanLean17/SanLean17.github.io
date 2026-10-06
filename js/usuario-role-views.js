// SANLEAN — vistas de ADMINISTRADOR / PROPIETARIO / COLABORADOR.
(()=>{
  const $=id=>document.getElementById(id);
  const LABELS=()=>window.SanLeanAccess?.labels||{};
  const ORDER=['overlays','votes','challenges','giveaways','bits','platforms','killers','killerPerks','survivor','tournament'];

  function badge(label){
    const el=document.createElement('span');el.className='sl-role-badge';el.textContent=label;return el;
  }

  function roleLabel(role){
    return role==='admin'?'ADMINISTRADOR':role==='collaborator'?'COLABORADOR':'PROPIETARIO';
  }

  function setMainHeader(ctx){
    const welcome=$('dashboardHome')?.querySelector('.dashboard-welcome');if(!welcome)return;
    const kicker=welcome.querySelector('.eyebrow'),title=welcome.querySelector('h2'),copy=welcome.querySelector('p:last-child');
    welcome.querySelector('.sl-role-badge')?.remove();
    welcome.prepend(badge(roleLabel(ctx.role)));

    if(ctx.role==='admin'){
      if(kicker)kicker.textContent='PANEL DE ADMINISTRADOR';
      if(title)title.innerHTML='CONTROL GENERAL DE <span>SANLEAN</span>';
      if(copy)copy.innerHTML='Accedé a todas las herramientas de USUARIO y supervisá la configuración de propietarios y colaboradores.<br>El perfil administrador conserva acceso completo al sistema privado.';
    }else if(ctx.role==='collaborator'){
      if(kicker)kicker.textContent='PANEL DE COLABORADOR';
      if(title)title.innerHTML='HERRAMIENTAS <span>HABILITADAS</span>';
      if(copy)copy.innerHTML='Tu panel muestra únicamente las secciones que el propietario habilitó para tu cuenta.<br>Los permisos pueden modificarse en cualquier momento desde la cuenta del propietario.';
    }else{
      if(kicker)kicker.textContent='PANEL DE USUARIO';
      if(title)title.innerHTML='BIENVENIDO A <span>MI PANEL</span>';
    }
  }

  function makeCard(section){
    const labels=LABELS(),article=document.createElement('article');article.className='dashboard-card';
    article.innerHTML='<span class="card-kicker">PERMISO HABILITADO</span><h3>'+String(labels[section]||section)+'</h3><p>Tenés acceso a esta herramienta dentro del espacio del propietario.</p><button type="button" data-go="'+section+'">ABRIR</button>';
    return article;
  }

  function setHomeCards(ctx){
    const home=$('dashboardHome'),grid=home?.querySelector('.dashboard-cards');if(!grid)return;
    if(ctx.role==='collaborator'){
      grid.innerHTML='';
      const allowed=ORDER.filter(section=>window.SanLeanAccess?.can(section));
      if(!allowed.length){
        const empty=document.createElement('div');empty.className='sl-access-empty';empty.style.gridColumn='1/-1';
        empty.innerHTML='<strong>NO TENÉS SECCIONES HABILITADAS</strong><p>El propietario todavía no asignó permisos a tu cuenta. Cuando lo haga, las herramientas aparecerán automáticamente acá.</p>';
        grid.appendChild(empty);
      }else allowed.forEach(section=>grid.appendChild(makeCard(section)));
      home?.querySelector('.sl-admin-note')?.remove();
      return;
    }

    if(ctx.role==='admin'){
      grid.innerHTML='<article class="dashboard-card"><span class="card-kicker">ADMINISTRACIÓN</span><h3>ACCESO TOTAL</h3><p>Entrá a todas las herramientas privadas de USUARIO con permisos completos de administración.</p><button type="button" data-go="overlays">VER HERRAMIENTAS</button></article><article class="dashboard-card"><span class="card-kicker">PERMISOS</span><h3>COLABORADORES</h3><p>Revisá la estructura de propietarios, colaboradores y permisos del sistema.</p><button type="button" data-account="collaborators">ADMINISTRAR</button></article><article class="dashboard-card"><span class="card-kicker">INTEGRACIONES</span><h3>TWITCH + KICK</h3><p>Accedé a las conexiones y herramientas vinculadas a las plataformas de cada espacio.</p><button type="button" data-go="platforms">VER PLATAFORMAS</button></article>';
      let note=home.querySelector('.sl-admin-note');
      if(!note){note=document.createElement('p');note.className='sl-admin-note';grid.insertAdjacentElement('afterend',note)}
      note.textContent='Vista de administrador: esta capa habilita toda la interfaz de USUARIO. La autorización sensible debe seguir validándose también en Supabase/RLS.';
    }else{
      home?.querySelector('.sl-admin-note')?.remove();
    }
  }

  function enforceNavigation(){
    const nav=document.querySelector('.panel-tabs');if(!nav)return;
    nav.querySelectorAll('[data-section-key]').forEach(btn=>{
      const key=btn.dataset.sectionKey;
      const hidden=key!=='home'&&!window.SanLeanAccess.can(key);
      btn.dataset.accessHidden=hidden?'true':'false';
    });

    const original=window.SanLeanUsuarioNavigation?.show;
    if(original&&!original.__sanleanAccessWrapped){
      const wrapped=function(key,opts){
        if(key!=='home'&&!window.SanLeanAccess.can(key))key='home';
        return original(key,opts);
      };
      wrapped.__sanleanAccessWrapped=true;
      window.SanLeanUsuarioNavigation.show=wrapped;
    }

    const current=location.hash.slice(1);
    if(current&&!window.SanLeanAccess.can(current))window.SanLeanUsuarioNavigation?.show?.('home',{updateHash:true});
  }

  function bindDynamicHome(){
    const home=$('dashboardHome');if(!home||home.dataset.roleBound)return;
    home.dataset.roleBound='true';
    home.addEventListener('click',e=>{
      const go=e.target.closest('[data-go]');if(go){e.preventDefault();window.SanLeanUsuarioNavigation?.show?.(go.dataset.go);return}
      const account=e.target.closest('[data-account]');if(account){e.preventDefault();location.href='./cuenta.html#'+account.dataset.account}
    });
  }

  function applyMain(ctx){
    if(!document.body.classList.contains('user-page'))return;
    setMainHeader(ctx);setHomeCards(ctx);enforceNavigation();bindDynamicHome();
  }

  function applyAccount(ctx){
    if(!document.body.classList.contains('account-page'))return;
    document.body.dataset.accountRole=ctx.role;
    const nav=document.querySelector('.account-nav');if(!nav)return;
    const collab=nav.querySelector('[data-section="collaborators"]');
    const connections=nav.querySelector('[data-section="connections"]');
    if(collab)collab.dataset.accessHidden=ctx.role==='collaborator'?'true':'false';
    if(connections)connections.dataset.accessHidden=(ctx.role==='collaborator'&&!window.SanLeanAccess.can('platforms'))?'true':'false';

    const home=$('section-home'),welcome=home?.querySelector('.account-welcome');
    if(welcome){
      welcome.querySelector('.sl-role-badge')?.remove();welcome.prepend(badge(roleLabel(ctx.role)));
      if(ctx.role==='admin'){
        const title=welcome.querySelector('h2'),copy=welcome.querySelector('p:last-child');
        if(title)title.textContent='CUENTA DE ADMINISTRADOR';
        if(copy)copy.innerHTML='Administrá tu perfil y accedé a la configuración general de USUARIO.<br>Tu rol conserva acceso completo a colaboradores, conexiones y herramientas.';
      }else if(ctx.role==='collaborator'){
        const title=welcome.querySelector('h2'),copy=welcome.querySelector('p:last-child');
        if(title)title.textContent='MI CUENTA';
        if(copy)copy.innerHTML='Administrá tus datos personales y seguridad.<br>Las herramientas del panel dependen de los permisos asignados por el propietario.';
        home?.querySelector('[data-account-go="collaborators"]')?.closest('article')?.setAttribute('data-access-hidden','true');
      }
    }

    const hash=location.hash.slice(1);
    if(ctx.role==='collaborator'&&hash==='collaborators')location.hash='#home';
    if(ctx.role==='collaborator'&&hash==='connections'&&!window.SanLeanAccess.can('platforms'))location.hash='#home';
  }

  function apply(ctx){applyMain(ctx);applyAccount(ctx)}

  window.addEventListener('sanlean:access-ready',e=>setTimeout(()=>apply(e.detail),80));
  window.addEventListener('DOMContentLoaded',async()=>{
    const ctx=window.SanLeanAccess?.get?.();
    if(ctx?.ready)setTimeout(()=>apply(ctx),120);
    else {
      const resolved=await window.SanLeanAccess?.resolve?.();
      if(resolved)setTimeout(()=>apply(resolved),120);
    }
  });
})();