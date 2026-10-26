import {createGallery} from './gallery.mjs';
export function setupLightbox(){
 const dialog=document.createElement('dialog');dialog.className='codes-lightbox';dialog.setAttribute('aria-label','Imagen ampliada del código');
 const close=document.createElement('button');close.className='codes-lightbox-close';close.type='button';close.textContent='×';close.setAttribute('aria-label','Cerrar imagen');dialog.append(close);document.body.append(dialog);let trigger,gallery;
 const finish=()=>{dialog.close();trigger?.focus({preventScroll:true});};close.addEventListener('click',finish);dialog.addEventListener('click',e=>{if(e.target===dialog)finish();});dialog.addEventListener('cancel',e=>{e.preventDefault();finish();});
 dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();gallery?.move(e.key==='ArrowLeft'?-1:1);}});
 return{open:(images,index,button,code)=>{trigger=button;gallery?.root.remove();gallery=createGallery({images,index,code});dialog.append(gallery.root);dialog.showModal();close.focus({preventScroll:true});}};
}
