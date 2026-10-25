export function setupLightbox(){
 const dialog=document.createElement('dialog');dialog.className='codes-lightbox';dialog.setAttribute('aria-label','Imagen ampliada del código');
 const image=document.createElement('img'),close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Cerrar imagen');dialog.append(close,image);document.body.append(dialog);let trigger;
 const finish=()=>{dialog.close();trigger?.focus({preventScroll:true});};close.addEventListener('click',finish);dialog.addEventListener('click',e=>{if(e.target===dialog)finish();});dialog.addEventListener('cancel',e=>{e.preventDefault();finish();});image.addEventListener('error',finish);
 return{open:(url,alt,button)=>{trigger=button;image.src=url;image.alt=alt;dialog.showModal();close.focus({preventScroll:true});}};
}
