'use strict';
const path=require('node:path'),fs=require('node:fs');
const factory=require('./challenge-model.cjs'),wheel=require('./wheel-model.cjs'),counter=require('./counter-model.cjs');
const challenges=Object.fromEntries(['killer','survivor'].map(role=>['all-'+role,factory({catalog:require('./catalog-store.cjs').read(role==='killer'?'killers':'survivors',true),format:'sanlean-all-'+role,title:'ALL '+role.toUpperCase()+' CHALLENGE',singular:role==='killer'?'killer':'superviviente',plural:role==='killer'?'killers':'supervivientes'})]));
const wheelPreferences=['soundVolume','soundEnabled','soundType','soundCollapsed','optionsCollapsed','repeatMode'];
const split=(state,keys)=>({preferences:Object.fromEntries(keys.map(k=>[k,state[k]])),progress:Object.fromEntries(Object.entries(state).filter(([k])=>!keys.includes(k)))});
function encode(state){
 const preferences={challenges:{},counters:{},wheels:{}},progress={challenges:{},counters:{},wheels:{format:state.wheels.format,version:state.wheels.version,revision:state.wheels.revision,tools:{}}};
 for(const [key,m] of Object.entries(challenges)){const v=m.serialize(state.challenges[key]);preferences.challenges[key]=v.preferences;progress.challenges[key]={...v,preferences:undefined};}
 for(const key of ['meta','win-streak']){const v=split(state.counters[key],counter.preferenceKeys);preferences.counters[key]=v.preferences;progress.counters[key]=v.progress;}
 for(const key of Object.keys(wheel.definitions)){const v=split(state.wheels.tools[key],wheelPreferences);preferences.wheels[key]=v.preferences;progress.wheels.tools[key]=v.progress;}
 return {preferencias:preferences,progreso:progress,'historial-win-streak':state.history};
}
function decode({preferencias:p,progreso:g,'historial-win-streak':history}){
 const state={challenges:{},counters:{},wheels:{...g.wheels,tools:{}},history};
 for(const [key,m] of Object.entries(challenges))state.challenges[key]=m.validate({...g.challenges[key],preferences:p.challenges[key]});
 for(const key of ['meta','win-streak'])state.counters[key]=counter.validate({...g.counters[key],...p.counters[key]},key);
 for(const key of Object.keys(wheel.definitions))state.wheels.tools[key]={...g.wheels.tools[key],...p.wheels[key]};state.wheels=wheel.validate(state.wheels);
 if(!Array.isArray(history)||history.some(h=>!h.id||!Number.isFinite(Date.parse(h.date))||!['killer','survivor'].includes(h.role)||!Number.isSafeInteger(h.current)||h.current<0||(h.role==='killer'&&(!h.killer?.key||typeof h.killer.name!=='string'))))throw Error('Historial Win Streak inválido. Los datos se conservaron.');
 return state;
}
function fresh(){return {challenges:Object.fromEntries(Object.entries(challenges).map(([k,m])=>[k,m.fresh()])),counters:Object.fromEntries(['meta','win-streak'].map(k=>[k,counter.fresh(k)])),wheels:wheel.fresh(),history:[]};}
module.exports=function application(dataRoot){
 const disk=require('./disk-store.cjs')(dataRoot),loaded=disk.read();let state=loaded?decode(loaded):fresh();
 function save(next){decode(encode(next));disk.write(encode(next));state=next;}
 // Preserve phase and remaining time during shutdown, instead of replaying overdue cycles.
 const now=Date.now(),stamp=path.join(dataRoot,'sesion.json');let previous=now;try{previous=JSON.parse(fs.readFileSync(stamp,'utf8')).savedAt;}catch{}
 const gap=Math.max(0,now-previous);
 for(const [key,m] of Object.entries(challenges)){let s=state.challenges[key];if(s.selection)s=m.reduce(s,{type:'settle'},Math.max(now,s.selection.start+s.selection.duration));if(s.status==='active')s.runningSince=new Date(now).toISOString();if(s.reveal&&s.reveal.start+s.reveal.duration<now)s.reveal=null;if(s.visibilityMode==='auto'){s.autoDeadline+=gap;s.autoCycleStartedAt+=gap;}state.challenges[key]=s;}
 for(const s of Object.values(state.counters))if(s.visibilityMode==='auto'){s.autoDeadline+=gap;s.autoCycleStartedAt+=gap;}
 for(const [key,t] of Object.entries(state.wheels.tools))if(t.state.status==='spinning')state.wheels=wheel.settle(state.wheels,key,Math.max(now,Date.parse(t.state.startedAt)+t.state.durationMs));
 const checkpoint=()=>{const next=structuredClone(state),t=Date.now();for(const [key,m] of Object.entries(challenges)){const s=next.challenges[key];if(s.status==='active'){s.accumulatedMs=m.elapsed(s,t);s.runningSince=new Date(t).toISOString();}}save(next);fs.writeFileSync(stamp,JSON.stringify({savedAt:t}));};
 save(state);
 function get(scope,key){return scope==='tools'?state.wheels:state[scope][key];}
 function action(scope,key,a,now=Date.now()){
  const old=get(scope,key);if(a.revision!==undefined&&a.revision!==old.revision&&a.type!=='preferences'){const e=Error('El estado cambió en otro panel. Intentá nuevamente.');e.conflict=true;throw e;}
  const next=structuredClone(state);
  if(scope==='tools')next.wheels=wheel.reduce(state.wheels,a,now);
  else if(scope==='challenges')next.challenges[key]=challenges[key].reduce(old,a,now);
  else {const r=counter.reduce(old,a,now);next.counters[key]=r.state;if(r.record)next.history.unshift(r.record);}
  save(next);
 }
 function due(){const out=[];for(const [key,s] of Object.entries(state.challenges)){if(s.selection)out.push({scope:'challenges',key,type:'settle',at:s.selection.start+s.selection.duration});if(s.visibilityMode==='auto')out.push({scope:'challenges',key,type:'autoTick',at:s.autoDeadline});}for(const [key,s] of Object.entries(state.counters))if(s.visibilityMode==='auto')out.push({scope:'counters',key,type:'autoTick',at:s.autoDeadline});for(const [key,t] of Object.entries(state.wheels.tools))if(t.state.status==='spinning')out.push({scope:'tools',key,type:'settle',at:Date.parse(t.state.startedAt)+t.state.durationMs});return out.sort((a,b)=>a.at-b.at);}
 function tick(d){if(d.scope==='tools'){const next=structuredClone(state);next.wheels=wheel.settle(next.wheels,d.key);save(next);}else action(d.scope,d.key,{type:d.type});}
 return {get,action,due,tick,checkpoint,history:()=>state.history};
};
module.exports.models={challenges,wheel,counter};module.exports.encode=encode;module.exports.decode=decode;
