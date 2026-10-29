'use strict';
const {randomUUID}=require('node:crypto');
const killers=require('./catalog-store.cjs').read('killers');
const defaults={title:'ESCAPES',role:'survivor',target:10,killerKey:null,layout:'image-left',configCollapsed:false,automaticCollapsed:false,historyCollapsed:false,autoIntervalValue:4,autoIntervalUnit:'minutes',autoVisibleValue:30,autoVisibleUnit:'seconds',autoAnimation:'top'};
const preferenceKeys=Object.keys(defaults),limit=999999999;
const duration=(s,k)=>s['auto'+k+'Value']*(s['auto'+k+'Unit']==='minutes'?60000:1000);
function visibility(s,mode,now){s.visibilityMode=mode;s.visible=mode==='show';s.autoPhase='hidden';s.autoDeadline=mode==='auto'?now+duration(s,'Interval'):null;s.autoCycleStartedAt=mode==='auto'?now:null;}
function fresh(kind){return {kind,revision:0,...defaults,status:'idle',current:0,startedAt:null,sessionRole:null,sessionKiller:null,visibilityMode:'hide',visible:false,autoPhase:'hidden',autoDeadline:null,autoCycleStartedAt:null};}
function valid(k,v,kind){if(k.endsWith('Collapsed'))return typeof v==='boolean';if(k==='title')return typeof v==='string'&&v.trim().length>0&&v.length<=42;if(k==='target')return Number.isSafeInteger(v)&&v>=1&&v<=limit;if(k==='role')return (kind==='meta'?['killer','survivor','both']:['killer','survivor']).includes(v);if(k==='killerKey')return v===null||killers.some(i=>i.key===v);if(k==='layout')return ['image-left','image-right'].includes(v);if(k.endsWith('Unit'))return ['seconds','minutes'].includes(v);if(k==='autoAnimation')return ['top','left','right','fade'].includes(v);return ['autoIntervalValue','autoVisibleValue'].includes(k)&&Number.isFinite(v)&&v>=1&&v<=1440;}
function validate(s,kind){
 if(!s||s.kind!==kind||!Number.isSafeInteger(s.revision)||s.revision<0||!['idle','active','paused','completed'].includes(s.status)||!Number.isSafeInteger(s.current)||s.current<0||s.current>limit)throw Error('Progreso de contador inválido.');
 for(const k of preferenceKeys)if(!valid(k,s[k],kind))throw Error('Preferencia de contador inválida: '+k);
 if(!['show','hide','auto'].includes(s.visibilityMode)||!['hidden','entering','visible','exiting'].includes(s.autoPhase)||typeof s.visible!=='boolean')throw Error('Visibilidad inválida.');
 if(s.visibilityMode==='auto'){if(!Number.isFinite(s.autoDeadline)||!Number.isFinite(s.autoCycleStartedAt)||s.visible!==(s.autoPhase!=='hidden'))throw Error('Ciclo inválido.');}else if(s.autoDeadline!==null||s.autoCycleStartedAt!==null||s.autoPhase!=='hidden'||s.visible!==(s.visibilityMode==='show'))throw Error('Visibilidad inválida.');
 if(s.startedAt!==null&&!Number.isFinite(Date.parse(s.startedAt)))throw Error('Fecha inválida.');
 if(kind==='win-streak'&&s.status!=='idle'&&(!['killer','survivor'].includes(s.sessionRole)||(s.sessionRole==='killer'&&!killers.some(k=>k.key===s.sessionKiller))))throw Error('Personaje de racha inválido.');
 return structuredClone(s);
}
function reduce(before,action,now=Date.now()){
 const s=structuredClone(before),{type}=action,kind=s.kind;let record=null;
 const requireLive=()=>{if(!['active','paused'].includes(s.status))throw Error('Iniciá una racha antes de usar esta acción.');};
 if(type==='preferences'){
  for(const [k,v] of Object.entries(action.values||{})){if(!preferenceKeys.includes(k)||!valid(k,v,kind))throw Error('Configuración inválida: '+k);if(kind==='win-streak'&&s.status!=='idle'&&['role','killerKey'].includes(k)&&s[k]!==v)throw Error('Finalizá o cancelá la racha antes de cambiar el personaje.');s[k]=v;}
  if(s.visibilityMode==='auto'&&Object.keys(action.values||{}).some(k=>['autoIntervalValue','autoIntervalUnit','autoVisibleValue','autoVisibleUnit','autoAnimation'].includes(k)))visibility(s,'auto',now);
  if(kind==='meta'&&['active','completed'].includes(s.status))s.status=s.current>=s.target?'completed':'active';
 }else if(type==='start'){
  if(s.status!=='idle')throw Error('La herramienta ya está iniciada.');if(kind==='win-streak'&&s.role==='killer'&&!s.killerKey)throw Error('Seleccioná un killer.');s.status='active';s.startedAt=new Date(now).toISOString();s.sessionRole=s.role;s.sessionKiller=s.killerKey;visibility(s,'show',now);
 }else if(type==='current'||type==='step'){
  if(!['active','completed'].includes(s.status))throw Error('Iniciá o continuá la herramienta.');const value=type==='step'?s.current+action.delta:action.value;if(type==='step'&&![-1,1].includes(action.delta))throw Error('Paso inválido.');if(!Number.isSafeInteger(value)||value<0||value>limit)throw Error('Ingresá un número entre 0 y '+limit+'.');s.current=value;if(kind==='meta')s.status=s.current>=s.target?'completed':'active';
 }else if(type==='pause'){
  if(s.status!=='active')throw Error('La herramienta no está activa.');s.status='paused';visibility(s,'hide',now);
 }else if(type==='resume'){
  if(s.status!=='paused')throw Error('La herramienta no está pausada.');s.status=kind==='meta'&&s.current>=s.target?'completed':'active';visibility(s,'show',now);
 }else if(type==='visibility'){
  if(s.status==='idle'||!['show','hide','auto'].includes(action.mode))throw Error('Iniciá la herramienta y elegí un modo de OBS.');visibility(s,action.mode,now);
 }else if(type==='autoTick'){
  if(s.visibilityMode!=='auto'||now<s.autoDeadline)return {state:before,record:null};
  if(s.autoPhase==='hidden'){s.autoPhase='entering';s.autoDeadline=now+450;}else if(s.autoPhase==='entering'){s.autoPhase='visible';s.autoDeadline=now+duration(s,'Visible');}else if(s.autoPhase==='visible'){s.autoPhase='exiting';s.autoDeadline=now+450;}else{s.autoPhase='hidden';s.autoDeadline=now+duration(s,'Interval');}s.visible=s.autoPhase!=='hidden';
 }else if(['reset','finish','cancel','zero'].includes(type)){
  const names={reset:kind==='meta'?'RESTABLECER META':'RESTABLECER WIN STREAK',finish:'FINALIZAR WIN STREAK',cancel:'CANCELAR WIN STREAK',zero:'REINICIAR RACHA'};if(action.confirm!==names[type])throw Error('Falta confirmar la acción.');
  if(['finish','cancel','zero'].includes(type)){if(kind!=='win-streak')throw Error('Acción inválida.');requireLive();}
  if(type==='zero'){s.current=0;}
  else{
   if(type==='finish'){const killer=killers.find(k=>k.key===s.sessionKiller);record={id:randomUUID(),date:new Date(now).toISOString(),role:s.sessionRole,killer:s.sessionRole==='killer'?{key:killer.key,name:killer.name}:null,current:s.current};}
   const next=fresh(kind);for(const key of preferenceKeys)next[key]=s[key];next.revision=s.revision+1;return {state:next,record};
  }
 }else throw Error('Acción desconocida.');
 s.revision++;return {state:s,record};
}
module.exports={fresh,validate,reduce,visibility,preferenceKeys};
