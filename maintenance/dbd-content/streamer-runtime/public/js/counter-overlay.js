'use strict';
(async()=>{
 const key=location.pathname.split('/').pop(),meta=key==='meta',root=document.getElementById('obsOverlayRoot'),stage=document.getElementById('counterStage'),catalog=meta?[]:await SanLeanDBDCatalog.loadKillers();document.title=(meta?'META':'WIN STREAK')+' · OBS';let signature='';
 const stream=new SanLeanLocalEvents('/events/counters/'+key);stream.onmessage=e=>{const p=JSON.parse(e.data),s=p.state;window.counterState=s;root.hidden=!s.visible||s.status==='idle';root.dataset.effect=s.autoAnimation;root.dataset.phase=s.visibilityMode==='auto'?s.autoPhase:'manual';root.style.animationDelay=s.visibilityMode==='auto'&&['entering','exiting'].includes(s.autoPhase)?`-${Math.max(0,450-(s.autoDeadline-p.serverTime))}ms`:'0ms';
  const killer=catalog.find(k=>k.key===(s.sessionKiller||s.killerKey)),v={...s,role:meta?s.role:(s.sessionRole||s.role),killer:killer?{...killer,image:'/'+killer.image}:null,status:s.status==='completed'?'reached':'active',visible:true};const next=JSON.stringify([v.current,v.title,v.role,v.killer,v.target,v.layout,v.status]);if(next!==signature){signature=next;(meta?SanLeanChallengeGoalView:SanLeanChallengeStreakView).render(stage,{state:v});}
  window.SanLeanOverlayLoader?.ready();
 };stream.onerror=()=>{root.hidden=true;window.SanLeanOverlayLoader?.waiting();};
})().catch(console.error);
