export function createGallery({images,code,index=0,onOpen,onFailure=()=>{},swipe=true}){
 const root=document.createElement('div');root.className='code-media';
 const img=document.createElement('img');img.alt='';img.width=800;img.height=800;img.decoding='async';img.loading='lazy';img.draggable=false;img.referrerPolicy='no-referrer';
 const fallback=document.createElement('div');fallback.className='code-media-fallback';
 for(const [tag,text] of [['span','CÓDIGO'],['strong',code],['small','SIN IMAGEN OFICIAL']]){const el=document.createElement(tag);el.textContent=text;fallback.append(el);}
 root.append(fallback,img);let current=index,failed=new Set(),suppressUntil=0;
 const button=(cls,label,text)=>{const b=document.createElement('button');b.type='button';b.className=cls;b.setAttribute('aria-label',label);b.textContent=text;root.append(b);return b;};
 const zoom=onOpen?button('code-zoom',`Ampliar imagen de ${code}`,''):null;
 const prev=button('code-image-prev',`Imagen anterior de ${code}`,'‹'),next=button('code-image-next',`Imagen siguiente de ${code}`,'›');
 const dots=document.createElement('div');dots.className='code-image-dots';dots.setAttribute('role','status');root.append(dots);
 function render(){
  const available=images.map((_,i)=>i).filter(i=>!failed.has(i));if(!available.includes(current))current=available[0]??0;
  const item=available.length?images[current]:null;fallback.hidden=!!item;img.hidden=!item;if(zoom)zoom.hidden=!item;
  prev.hidden=next.hidden=dots.hidden=available.length<2;root.classList.toggle('has-many-images',available.length>1);
  dots.replaceChildren();dots.setAttribute('aria-label',`Imagen ${available.indexOf(current)+1} de ${available.length}`);
  for(const i of available){const dot=document.createElement('span');dot.className=i===current?'is-current':'';dot.setAttribute('aria-hidden','true');dots.append(dot);}
  if(item){img.alt=item.alt||item.reward||`Imagen de ${code}`;if(img.getAttribute('src')!==item.url)img.src=item.url;}else img.removeAttribute('src');
 }
 function move(delta){const available=images.map((_,i)=>i).filter(i=>!failed.has(i));if(available.length<2)return;current=available[(available.indexOf(current)+delta+available.length)%available.length];render();}
 prev.addEventListener('click',e=>{e.stopPropagation();move(-1);});next.addEventListener('click',e=>{e.stopPropagation();move(1);});
 zoom?.addEventListener('click',()=>{if(performance.now()>suppressUntil&&!img.hidden&&img.naturalWidth)onOpen(current,zoom);});
 img.addEventListener('error',()=>{if(!images.length||failed.has(current))return;failed.add(current);onFailure(images[current]);render();});
 if(swipe){root.style.touchAction='pan-y';let start;
 root.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||images.length<2)return;start={id:e.pointerId,x:e.clientX,y:e.clientY};});
 root.addEventListener('pointermove',e=>{if(start&&e.pointerId===start.id&&Math.abs(e.clientX-start.x)>35&&Math.abs(e.clientX-start.x)>Math.abs(e.clientY-start.y)*1.3)root.setPointerCapture(e.pointerId);});
 root.addEventListener('pointerup',e=>{if(!start||e.pointerId!==start.id)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)*1.3){suppressUntil=performance.now()+500;move(dx<0?1:-1);}});
 root.addEventListener('pointercancel',()=>{start=null;});}
 render();return {root,move,getIndex:()=>current};
}
