// Compatibilidad de MI PANEL.
// La navegación de secciones está centralizada en js/usuario.js.
(()=>{
  function installTieRepeat(){
    const status=document.getElementById('voteRoundStatus');
    const repeat=document.getElementById('repeatVoteRound');
    if(!status||!repeat)return;
    let restarting=false;
    const check=()=>{
      const text=(status.textContent||'').toLocaleLowerCase('es');
      if(restarting||!text.includes('empatada'))return;
      restarting=true;
      status.textContent='La ronda terminó empatada. Se reinicia la votación completa con las mismas cinco cartas.';
      setTimeout(()=>{
        repeat.click();
        restarting=false;
      },350);
    };
    new MutationObserver(check).observe(status,{childList:true,subtree:true,characterData:true});
    check();
  }
  window.addEventListener('DOMContentLoaded',installTieRepeat);
})();
