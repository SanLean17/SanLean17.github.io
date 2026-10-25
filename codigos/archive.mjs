export function setupArchive(track){
 let drag=null,suppressUntil=0;
 const finish=()=>{if(!drag)return;if(drag.moved)suppressUntil=performance.now()+300;const id=drag.id;drag=null;track.classList.remove('is-dragging');if(track.hasPointerCapture(id))track.releasePointerCapture(id);};
 track.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:track.scrollLeft,moved:false};});
 window.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x;if(!drag.moved){if(Math.abs(dx)<6)return;if(Math.abs(e.clientY-drag.y)>Math.abs(dx)){drag=null;return;}drag.moved=true;track.setPointerCapture(e.pointerId);track.classList.add('is-dragging');}e.preventDefault();track.scrollLeft=drag.left-dx;},{passive:false});
 window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);window.addEventListener('blur',finish);track.addEventListener('lostpointercapture',finish);
 track.addEventListener('dragstart',e=>e.preventDefault());
 track.addEventListener('click',e=>{if(performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();suppressUntil=0;}},true);
 track.addEventListener('keydown',e=>{if(e.target!==track)return;const step=track.clientWidth*.8;const target={ArrowRight:track.scrollLeft+step,ArrowLeft:track.scrollLeft-step,Home:0,End:track.scrollWidth}[e.key];if(target===undefined)return;e.preventDefault();track.scrollTo({left:target,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});});
}
