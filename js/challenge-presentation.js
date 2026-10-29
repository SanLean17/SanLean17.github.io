/* Shared presentation clock. No network writes or personal data; each overlay owns its settings. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SanLeanChallengePresentation=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const kinds=['challenge_goal','challenge_streak','challenge_all_killers','challenge_all_survivors'];
  const defaults={mode:'show',interval:240,visible:30,animation:'top',compact:false,startedAt:0};
  function normalize(value={}){return {...defaults,mode:['show','hide','auto'].includes(value.mode)?value.mode:'show',interval:Math.max(1,Math.min(86400,Number(value.interval)||240)),visible:Math.max(1,Math.min(86400,Number(value.visible)||30)),animation:['top','left','right','fade'].includes(value.animation)?value.animation:'top',compact:value.compact===true,startedAt:Math.max(0,Number(value.startedAt)||0)};}
  function project(data,now=Date.now()){
    const p=normalize(data?.settings?.obsPresentation),state=data?.state||{},supported=kinds.includes(data?.kind),live=['active','reached'].includes(state.status),allowed=supported&&live&&state.visible!==false;
    if(!allowed||p.mode==='hide')return {visible:false,phase:'hidden',animation:p.animation,compact:false};
    if(p.mode!=='auto')return {visible:true,phase:'visible',animation:p.animation,compact:false};
    const start=Math.max(p.startedAt,Date.parse(state.runningSince||state.startedAt)||0),elapsed=Math.max(0,now-start)%(p.interval*1000+p.visible*1000+900);
    const phase=elapsed<p.interval*1000?'hidden':elapsed<p.interval*1000+450?'entering':elapsed<p.interval*1000+450+p.visible*1000?'visible':'exiting';
    return {visible:phase!=='hidden',phase,animation:p.animation,compact:p.compact&&data.kind.startsWith('challenge_all_')};
  }
  function apply(target,data,now=Date.now()){
    if(!target)return;const configured=kinds.includes(data?.kind)&&data?.settings?.obsPresentation;
    if(!configured){if(target.dataset.presentation){delete target.dataset.presentation;for(const property of ['opacity','transform','transition','animation'])target.style[property]='';}return;}
    const view=project(data,now),shown=['entering','visible'].includes(view.phase);target.dataset.presentation=view.phase;target.style.animation='none';target.style.transition='opacity 450ms ease, transform 450ms ease';target.style.opacity=shown?'1':'0';
    const shifted={top:'translateY(-180px)',left:'translateX(-2100px)',right:'translateX(2100px)',fade:'none'};
    target.style.transform=shown?'none':shifted[view.animation];
  }
  return {kinds,defaults,normalize,project,apply};
});
