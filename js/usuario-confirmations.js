// SANLEAN — confirmación canónica para acciones importantes de USUARIO.
(()=>{
  if(window.SanLeanConfirm)return;
  let resolver=null,lastFocus=null;
  // Observe every canonical modal, including nested confirmations and legacy dialogs.
  let bodyLock=null;
  function syncBodyLock(){
    const open=[...document.querySelectorAll('.profile-modal')].some(n=>!n.hidden&&getComputedStyle(n).display!=='none');
    if(open&&!bodyLock){bodyLock={y:scrollY,position:document.body.style.position,top:document.body.style.top,width:document.body.style.width,overflow:document.body.style.overflow};document.body.style.position='fixed';document.body.style.top=-bodyLock.y+'px';document.body.style.width='100%';document.body.style.overflow='hidden';}
    else if(!open&&bodyLock){const saved=bodyLock;bodyLock=null;for(const k of ['position','top','width','overflow'])document.body.style[k]=saved[k];scrollTo(0,saved.y);}
  }
  const observe=()=>{new MutationObserver(syncBodyLock).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class']});syncBodyLock();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});else observe();
  function ensure(){
    let modal=document.getElementById('sanleanSystemConfirm');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='sanleanSystemConfirm';
    modal.className='profile-modal sl-system-confirm';
    modal.hidden=true;
    modal.innerHTML='<div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="slSystemConfirmTitle" aria-describedby="slSystemConfirmText"><p id="slSystemConfirmEyebrow" class="eyebrow">CONFIRMACIÓN</p><h2 id="slSystemConfirmTitle">CONFIRMAR ACCIÓN</h2><p id="slSystemConfirmText" class="reset-warning"></p><div class="confirm-actions sl-system-confirm-actions"><button id="slSystemConfirmCancel" type="button">CANCELAR</button><button id="slSystemConfirmAccept" type="button" class="danger-confirm">CONFIRMAR</button></div></div>';
    document.body.appendChild(modal);
    const cancel=modal.querySelector('#slSystemConfirmCancel'),accept=modal.querySelector('#slSystemConfirmAccept');
    const close=value=>{
      if(modal.hidden)return;
      modal.hidden=true;
      const done=resolver;resolver=null;
      if(lastFocus?.focus)requestAnimationFrame(()=>lastFocus.focus());
      if(done)done(value);
    };
    cancel.addEventListener('click',()=>close(false));
    accept.addEventListener('click',()=>close(true));
    modal.addEventListener('click',e=>{if(e.target===modal)close(false)});
    document.addEventListener('keydown',e=>{
      if(modal.hidden)return;
      if(e.key==='Escape'){e.preventDefault();close(false)}
      if(e.key==='Tab'){
        const items=[cancel,accept],i=items.indexOf(document.activeElement);
        if(e.shiftKey&&i<=0){e.preventDefault();accept.focus()}
        else if(!e.shiftKey&&i===items.length-1){e.preventDefault();cancel.focus()}
      }
    });
    return modal;
  }
  window.SanLeanConfirm={
    open({eyebrow='CONFIRMACIÓN',title='CONFIRMAR ACCIÓN',text='',confirmLabel='CONFIRMAR',cancelLabel='CANCELAR'}={}){
      const modal=ensure();
      if(resolver)resolver(false);
      lastFocus=document.activeElement;
      modal.querySelector('#slSystemConfirmEyebrow').textContent=eyebrow;
      modal.querySelector('#slSystemConfirmTitle').textContent=title;
      modal.querySelector('#slSystemConfirmText').textContent=text;
      modal.querySelector('#slSystemConfirmCancel').textContent=cancelLabel;
      modal.querySelector('#slSystemConfirmAccept').textContent=confirmLabel;
      modal.hidden=false;
      requestAnimationFrame(()=>modal.querySelector('#slSystemConfirmCancel')?.focus());
      return new Promise(resolve=>{resolver=resolve});
    }
  };
})();
