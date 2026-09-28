// SANLEAN — canonical select enhancer for USUARIO.
// TORNEO 1VS1 (MES / AÑO / MEJORES TIEMPOS) is the exact visual/behavior reference.
// Native <select> remains the source of truth; the visible DOM reproduces the tournament component.
(()=>{
  const ROOT_SELECTOR='.user-page .stream-module select:not([hidden]):not([data-sl-select-ignore]), .account-page select:not([hidden]):not([data-sl-select-ignore])';
  const ENHANCED='slSelectEnhanced';

  const parts=root=>({
    trigger:root?.querySelector(':scope > button'),
    menu:root?.querySelector(':scope > .custom-options')
  });

  function sync(root,select){
    const {trigger,menu}=parts(root);if(!trigger||!menu)return;
    const options=[...select.options];
    const selected=options[select.selectedIndex]||options.find(o=>o.selected)||options[0];
    const span=trigger.querySelector('span');if(span)span.textContent=selected?.textContent||'SELECCIONAR...';
    trigger.disabled=select.disabled;
    trigger.setAttribute('aria-disabled',select.disabled?'true':'false');
    trigger.setAttribute('aria-expanded',menu.hidden?'false':'true');
    menu.querySelectorAll('button').forEach((button,index)=>{
      const option=options[index];
      if(!option)return;
      button.disabled=option.disabled;
      button.classList.toggle('is-selected',!!option.selected);
      button.setAttribute('aria-selected',option.selected?'true':'false');
    });
  }

  function close(root){
    const {trigger,menu}=parts(root);if(!trigger||!menu)return;
    menu.hidden=true;
    trigger.setAttribute('aria-expanded','false');
    root.classList.remove('is-open');
  }

  function closeAll(except=null){
    document.querySelectorAll('.sl-select-enhanced.custom-select').forEach(root=>{if(root!==except)close(root)});
  }

  function rebuild(root,select){
    const {trigger,menu}=parts(root);if(!trigger||!menu)return;
    menu.innerHTML='';
    [...select.options].forEach((option,index)=>{
      const button=document.createElement('button');
      button.type='button';
      button.textContent=option.textContent;
      button.dataset.value=option.value;
      button.dataset.index=String(index);
      button.disabled=option.disabled;
      button.setAttribute('role','option');
      button.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        if(option.disabled||select.disabled)return;
        const previous=select.value;
        select.selectedIndex=index;
        if(select.value!==previous)select.dispatchEvent(new Event('input',{bubbles:true}));
        select.dispatchEvent(new Event('change',{bubbles:true}));
        sync(root,select);
        close(root);
        trigger.focus();
      });
      menu.appendChild(button);
    });
    sync(root,select);
  }

  function focusOption(root,direction){
    const {menu}=parts(root);if(!menu)return;
    const items=[...menu.querySelectorAll('button:not(:disabled)')];if(!items.length)return;
    let index=items.indexOf(document.activeElement);
    if(index<0){
      const selected=items.findIndex(item=>item.getAttribute('aria-selected')==='true');
      index=selected>=0?selected:0;
    }else index=(index+direction+items.length)%items.length;
    items[index].focus();
  }

  function enhance(select){
    if(!(select instanceof HTMLSelectElement)||select.dataset[ENHANCED]==='true'||select.hidden)return;
    select.dataset[ENHANCED]='true';
    select.classList.add('sl-native-select-source');

    // EXACT same visible structure as TORNEO 1VS1:
    // .custom-select > button > span + b ; .custom-options > button...
    const root=document.createElement('div');
    root.className='custom-select sl-select-enhanced';

    const trigger=document.createElement('button');
    trigger.type='button';
    trigger.className='sl-select-trigger';
    trigger.setAttribute('aria-haspopup','listbox');
    trigger.setAttribute('aria-expanded','false');
    trigger.innerHTML='<span>SELECCIONAR...</span><b aria-hidden="true"></b>';

    const menu=document.createElement('div');
    menu.className='custom-options';
    menu.setAttribute('role','listbox');
    menu.hidden=true;

    root.append(trigger,menu);
    select.insertAdjacentElement('afterend',root);
    rebuild(root,select);

    trigger.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      if(select.disabled)return;
      const opening=menu.hidden;
      closeAll(root);
      if(opening){
        menu.hidden=false;
        trigger.setAttribute('aria-expanded','true');
        root.classList.add('is-open');
        sync(root,select);
      }else close(root);
    });

    trigger.addEventListener('keydown',event=>{
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){
        event.preventDefault();
        if(menu.hidden){closeAll(root);menu.hidden=false;trigger.setAttribute('aria-expanded','true');root.classList.add('is-open');sync(root,select)}
        focusOption(root,event.key==='ArrowDown'?1:-1);
      }
    });

    menu.addEventListener('keydown',event=>{
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();focusOption(root,event.key==='ArrowDown'?1:-1)}
      if(event.key==='Escape'){event.preventDefault();close(root);trigger.focus()}
      if(event.key==='Tab')close(root);
    });

    select.addEventListener('change',()=>sync(root,select));
    new MutationObserver(()=>rebuild(root,select)).observe(select,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','label','selected']});
  }

  const scan=(scope=document)=>scope.querySelectorAll?.(ROOT_SELECTOR).forEach(enhance);

  function install(){
    scan();
    new MutationObserver(mutations=>{
      mutations.forEach(mutation=>mutation.addedNodes.forEach(node=>{
        if(node.nodeType!==1)return;
        if(node.matches?.(ROOT_SELECTOR))enhance(node);
        scan(node);
      }));
    }).observe(document.body,{childList:true,subtree:true});

    document.addEventListener('pointerdown',event=>{if(!event.target.closest('.sl-select-enhanced.custom-select'))closeAll()});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeAll()});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();