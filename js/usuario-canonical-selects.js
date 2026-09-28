// SANLEAN — canonical select enhancer for USUARIO.
// Native <select> remains the source of truth; this layer only standardizes the UI.
(()=>{
  const ROOT_SELECTOR='.user-page .stream-module select:not([hidden]):not([data-sl-select-ignore]), .account-page select:not([hidden]):not([data-sl-select-ignore])';
  const ENHANCED='slSelectEnhanced';

  const close=(root)=>{
    if(!root)return;
    const trigger=root.querySelector(':scope > .sl-select-trigger');
    const menu=root.querySelector(':scope > .sl-select-menu');
    if(menu)menu.hidden=true;
    trigger?.setAttribute('aria-expanded','false');
    root.classList.remove('is-open');
  };

  const closeAll=(except=null)=>{
    document.querySelectorAll('.sl-select-enhanced').forEach(root=>{if(root!==except)close(root)});
  };

  function enhance(select){
    if(!(select instanceof HTMLSelectElement)||select.dataset[ENHANCED]==='true'||select.hidden)return;
    select.dataset[ENHANCED]='true';
    select.classList.add('sl-native-select-source');

    const root=document.createElement('div');
    root.className='custom-select ui-select sl-select-enhanced';

    const trigger=document.createElement('button');
    trigger.type='button';
    trigger.className='sl-select-trigger';
    trigger.setAttribute('aria-haspopup','listbox');
    trigger.setAttribute('aria-expanded','false');
    trigger.innerHTML='<span></span><b aria-hidden="true"></b>';

    const menu=document.createElement('div');
    menu.className='ui-select-options sl-select-menu';
    menu.setAttribute('role','listbox');
    menu.hidden=true;

    root.append(trigger,menu);
    select.insertAdjacentElement('afterend',root);

    const render=()=>{
      const options=[...select.options];
      const selected=options[select.selectedIndex]||options.find(o=>o.selected)||options[0];
      trigger.querySelector('span').textContent=selected?.textContent||'SELECCIONAR...';
      trigger.disabled=select.disabled;
      trigger.setAttribute('aria-disabled',select.disabled?'true':'false');
      menu.innerHTML='';

      options.forEach((option,index)=>{
        const item=document.createElement('button');
        item.type='button';
        item.className='sl-select-option';
        item.textContent=option.textContent;
        item.dataset.value=option.value;
        item.dataset.index=String(index);
        item.disabled=option.disabled;
        item.setAttribute('role','option');
        item.setAttribute('aria-selected',option.selected?'true':'false');
        if(option.selected)item.classList.add('is-selected');
        item.addEventListener('click',event=>{
          event.preventDefault();
          if(item.disabled||select.disabled)return;
          const old=select.value;
          select.value=option.value;
          if(select.value!==old)select.dispatchEvent(new Event('input',{bubbles:true}));
          select.dispatchEvent(new Event('change',{bubbles:true}));
          render();
          close(root);
          trigger.focus();
        });
        menu.appendChild(item);
      });
    };

    const move=(direction)=>{
      const items=[...menu.querySelectorAll('.sl-select-option:not(:disabled)')];
      if(!items.length)return;
      const active=document.activeElement;
      let index=items.indexOf(active);
      if(index<0){
        const selected=items.findIndex(item=>item.getAttribute('aria-selected')==='true');
        index=selected>=0?selected:0;
      }else index=(index+direction+items.length)%items.length;
      items[index].focus();
    };

    trigger.addEventListener('click',event=>{
      event.preventDefault();
      if(select.disabled)return;
      const opening=menu.hidden;
      closeAll(root);
      if(opening){render();menu.hidden=false;trigger.setAttribute('aria-expanded','true');root.classList.add('is-open')}
      else close(root);
    });

    trigger.addEventListener('keydown',event=>{
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){
        event.preventDefault();
        if(menu.hidden){closeAll(root);render();menu.hidden=false;trigger.setAttribute('aria-expanded','true');root.classList.add('is-open')}
        move(event.key==='ArrowDown'?1:-1);
      }
    });

    menu.addEventListener('keydown',event=>{
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();move(event.key==='ArrowDown'?1:-1)}
      if(event.key==='Escape'){event.preventDefault();close(root);trigger.focus()}
      if(event.key==='Tab')close(root);
    });

    select.addEventListener('change',render);
    new MutationObserver(render).observe(select,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','label','selected']});
    render();
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

    document.addEventListener('pointerdown',event=>{if(!event.target.closest('.sl-select-enhanced'))closeAll()});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeAll()});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
