(()=>{
  const $=id=>document.getElementById(id);
  function install(){
    const tabs=document.querySelector('.panel-tabs');if(!tabs||tabs.querySelector('[data-section-key="polls"]'))return;
    const btn=document.createElement('button');btn.type='button';btn.dataset.sectionKey='polls';btn.textContent='VOTACIÓN';tabs.querySelector('[data-section-key="votes"]')?.insertAdjacentElement('afterend',btn);
    const section=$('streamPollPanel');
    function open(){
      document.querySelectorAll('#dashboardHome,#roulettePanel,#tournamentPanel,#streamOverlaysPanel,#streamVotesPanel,#streamGiveawaysPanel,#streamBitsPanel,#streamPlatformsPanel,#platformPanel').forEach(x=>{x.hidden=true;x.style.display='none'});
      if(section){section.hidden=false;section.style.display='';const h=section.querySelector(':scope>.stream-module-head');if(h)h.innerHTML='<p class="eyebrow">COMUNIDAD</p><h2>VOTACIÓN</h2><p>Creá una votación simple para que cada persona del chat elija una sola vez.<br>Usá Killers de DBD con imagen automática o escribí opciones personalizadas.</p>'}
      tabs.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===btn));history.replaceState(null,'','#polls');
    }
    btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();open();setTimeout(open,0)});
    tabs.addEventListener('click',e=>{if(e.target.closest('button')!==btn&&section){section.hidden=true;section.style.display='none'}},true);
    window.addEventListener('hashchange',()=>{if(location.hash==='#polls')setTimeout(open,0)});if(location.hash==='#polls')setTimeout(open,0);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));else setTimeout(install,0);
})();