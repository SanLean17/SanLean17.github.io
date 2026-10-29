'use strict';
const {randomInt,randomUUID}=require('node:crypto');
module.exports=function createChallenge({catalog,format,title,singular,plural}){
const allCatalog=catalog;catalog=require('./public/js/dbd-catalog.js').filterEnabled(catalog);
const keys=catalog.map(k=>k.key),states=['pending','failed','completed'];
const clone=x=>structuredClone(x);
const iso=t=>new Date(t).toISOString();
const preferenceRanges={selectionDuration:[3,20],resultCardScale:[20,100],resultCardDuration:[2,15],selectionSoundVolume:[0,100],resultSoundVolume:[0,100],autoIntervalValue:[1,1440],autoVisibleValue:[1,1440]};
const audioDefaults={selectionSoundEnabled:true,selectionSoundType:'mechanical',selectionSoundVolume:55,resultSoundEnabled:false,resultSoundType:'sanlean',resultSoundVolume:70};
const autoDefaults={autoIntervalValue:4,autoIntervalUnit:'minutes',autoVisibleValue:30,autoVisibleUnit:'seconds',autoAnimation:'top',autoCompactProgressEnabled:false};
const foldDefaults={selectionSettingsCollapsed:false,presentationSettingsCollapsed:false,automaticSettingsCollapsed:false,survivorListCollapsed:false};
const preferenceKeys=[...new Set([...Object.keys(preferenceRanges),...Object.keys(audioDefaults),...Object.keys(autoDefaults),...Object.keys(foldDefaults)])];
const validPreference=(key,value)=>key.endsWith('Enabled')||key.endsWith('Collapsed')?typeof value==='boolean':key.endsWith('Unit')?['seconds','minutes'].includes(value):key==='autoAnimation'?['top','left','right','fade'].includes(value):key==='selectionSoundType'?['digital','mechanical','neon','dry'].includes(value):key==='resultSoundType'?['impact','sanlean'].includes(value):Object.hasOwn(preferenceRanges,key)&&Number.isFinite(value)&&value>=preferenceRanges[key][0]&&value<=preferenceRanges[key][1];
const transitionMs=450;
const duration=(s,kind)=>s['auto'+kind+'Value']*(s['auto'+kind+'Unit']==='minutes'?60000:1000);
function setVisibility(s,mode,t){
  s.visibilityMode=mode;s.autoPhase='hidden';s.autoDeadline=mode==='auto'?t+duration(s,'Interval'):null;
  s.autoCycleStartedAt=mode==='auto'?t:null;s.visible=mode==='show';s.reveal=null;
}
function fresh(){return {format:format,version:2,revision:0,entries:Object.fromEntries(keys.map(k=>[k,'pending'])),currentKey:null,currentPrevious:null,status:'idle',visible:false,visibilityMode:'hide',autoPhase:'hidden',autoDeadline:null,autoCycleStartedAt:null,alignment:'center',selectionDuration:10,resultCardScale:70,resultCardDuration:6,...audioDefaults,...autoDefaults,...foldDefaults,startedAt:null,runningSince:null,accumulatedMs:0,updatedAt:iso(Date.now()),selection:null,reveal:null};}
// One atomic document, two explicit domains. Reset never discards preferences.
// The flat state sent to existing OBS clients remains backward compatible.
function serialize(state){
  const progress=clone(state),preferences={};
  for(const key of [...preferenceKeys,'alignment']){preferences[key]=progress[key];delete progress[key];}
  delete progress.format;delete progress.version;
  return {format:format,version:3,progress,preferences};
}
function eligible(s){return keys.filter(k=>s.entries[k]!=='completed');}
function elapsed(s,t){return s.accumulatedMs+(s.status==='active'&&s.runningSince?Math.max(0,t-Date.parse(s.runningSince)):0);}
function validate(input){
  const fail=()=>{throw Error(`El archivo no es un progreso válido de SANLEAN ${title}.`);};
  if(input?.format===format&&input.version===3){
    if(!input.progress||!input.preferences||Array.isArray(input.progress)||Array.isArray(input.preferences))fail();
    const preferences={};for(const key of [...preferenceKeys,'alignment'])if(Object.hasOwn(input.preferences,key))preferences[key]=input.preferences[key];
    input={...input.progress,...preferences,format:input.format,version:2};
  }
  if(!input||input.format!==format||![1,2].includes(input.version)||!input.entries||typeof input.entries!=='object')fail();
  for(const key of preferenceKeys)if(input[key]!==undefined&&!validPreference(key,input[key]))fail();
  if(input.selectionSeconds!==undefined&&!validPreference('selectionDuration',input.selectionSeconds))fail();
  if(Array.isArray(input.entries)||!Object.keys(input.entries).length||Object.values(input.entries).some(v=>!states.includes(v)))fail();
  // New catalog entries start pending; removed characters do not remain in the total.
  input=clone(input);input.entries=Object.fromEntries(allCatalog.map(k=>[k.key,input.entries[k.key]||'pending']));
  if(input.currentKey&&!keys.includes(input.currentKey)){input.currentKey=null;input.currentPrevious=null;}
  if(input.selection&&(!keys.includes(input.selection.target)||input.selection.steps.some(step=>!keys.includes(step.key))))input.selection=null;
  if(input.reveal&&!keys.includes(input.reveal.key))input.reveal=null;
  if(['completed','finished'].includes(input.status)&&eligible(input).length){input.status='paused';input.runningSince=null;input.visible=false;input.visibilityMode='hide';input.autoDeadline=null;input.autoPhase='hidden';input.autoCycleStartedAt=null;}
  if(!['show','hide','auto'].includes(input.visibilityMode)||!['hidden','entering','visible','exiting'].includes(input.autoPhase))fail();
  if(input.visibilityMode==='auto'){
    if(!['active','paused','completed'].includes(input.status)||!Number.isFinite(input.autoDeadline)||!Number.isFinite(input.autoCycleStartedAt)||input.visible!==(input.autoPhase!=='hidden'))fail();
  }else if(input.autoDeadline!==null||input.autoCycleStartedAt!==null||input.autoPhase!=='hidden'||input.visible!==(input.visibilityMode==='show'))fail();
  if(!['idle','active','paused','completed','finished'].includes(input.status)||typeof input.visible!=='boolean'||!['left','center','right'].includes(input.alignment))fail();
  const date=v=>v===null||(typeof v==='string'&&Number.isFinite(Date.parse(v)));
  if(!date(input.startedAt)||!date(input.runningSince)||!date(input.updatedAt)||!Number.isFinite(input.accumulatedMs)||input.accumulatedMs<0||!Number.isSafeInteger(input.revision)||input.revision<0)fail();
  if(input.status==='active'&&!input.runningSince)fail();
  if(input.status!=='active'&&input.runningSince!==null)fail();
  if(input.currentKey!==null&&(!keys.includes(input.currentKey)||input.entries[input.currentKey]==='completed'||!['active','paused'].includes(input.status)||input.currentPrevious!==input.entries[input.currentKey]))fail();
  if(input.currentKey===null&&input.currentPrevious!==null)fail();
  if(['completed','finished'].includes(input.status)&&eligible(input).length)fail();
  if(['active','paused'].includes(input.status)&&!eligible(input).length)fail();
  if(input.selection){const a=input.selection;
    if(input.status!=='active'||input.currentKey!==null||typeof a.id!=='string'||!Number.isFinite(a.start)||!Number.isInteger(a.duration)||!(a.duration===800||(a.duration>=3000&&a.duration<=20000))||!eligible(input).includes(a.target)||!Array.isArray(a.steps)||a.steps.length<1||a.steps.length>80)fail();
    let last=-1;for(const step of a.steps){if(!Number.isFinite(step.at)||step.at<0||step.at>a.duration||step.at<=last||!eligible(input).includes(step.key))fail();last=step.at;}
    if(input.version===2&&(a.steps.at(-1).key!==a.target||a.steps.at(-1).at!==a.duration))fail();
  }
  if(input.reveal&&(!keys.includes(input.reveal.key)||typeof input.reveal.id!=='string'||!Number.isFinite(input.reveal.start)||!Number.isFinite(input.reveal.duration)||input.reveal.duration<2000||input.reveal.duration>15000))fail();
  const s=fresh();for(const name of Object.keys(s)){if(name in input)s[name]=clone(input[name]);}
  // Keep the current challenge and preferences from earlier files; discard past sessions.
  s.version=2;if(s.status==='finished')s.status='completed';if(input.selectionDuration===undefined&&input.selectionSeconds!==undefined)s.selectionDuration=input.selectionSeconds;
  if(input.version===1&&s.selection){s.selection.steps=s.selection.steps.filter(step=>step.at<s.selection.duration);if(s.selection.steps.length===80)s.selection.steps.pop();s.selection.steps.push({at:s.selection.duration,key:s.selection.target});}
  return s;
}
function plan(s,t){
  const pool=eligible(s);if(!pool.length)throw Error(`Todos los ${plural} están completados.`);
  const target=pool[randomInt(pool.length)],duration=pool.length===1?800:Math.round(s.selectionDuration*1000),steps=[];
  const count=pool.length===1?1:Math.max(24,Math.min(80,Math.round(duration/250)));
  // Choose the winner before animation. The last timed step IS the result, never a replacement.
  for(let i=0;i<count;i++){
    if(i===count-1){steps.push({at:duration,key:target});break;}
    if(pool.length===2){steps.push({at:Math.round(Math.pow(i/(count-1),2)*duration),key:pool[(pool.indexOf(target)+(count-1-i)%2)%2]});continue;}
    let candidates=pool.filter(k=>k!==steps.at(-1)?.key&&(i!==count-2||k!==target));
    if(!candidates.length)candidates=pool.filter(k=>k!==target);
    steps.push({at:Math.round(Math.pow(i/(count-1),2)*duration),key:candidates[randomInt(candidates.length)]});
  }
  return {id:randomUUID(),start:t,duration,target,steps};
}
function reconcileCompletion(s,t){
  if(!eligible(s).length){
    if(!['completed','finished'].includes(s.status)){
      s.accumulatedMs=elapsed(s,t);s.runningSince=null;s.status='completed';s.currentKey=null;s.currentPrevious=null;s.reveal=null;
    }
  }else if(['completed','finished'].includes(s.status)){
    s.status='active';s.runningSince=iso(t);s.startedAt=s.startedAt||iso(t);
  }
}
function reduce(before,action,t=Date.now()){
  const s=clone(before),type=action?.type;
  const requireActive=()=>{if(s.status!=='active')throw Error('Iniciá o continuá el challenge.');};
  const livePreferences=type==='preferences'&&action.values&&Object.keys(action.values).every(key=>Object.hasOwn(audioDefaults,key)||Object.hasOwn(foldDefaults,key));
  if(s.selection&&!['settle','autoTick'].includes(type)&&!livePreferences)throw Error('Esperá a que termine la selección.');
  if(type==='start'){
    if(s.status!=='idle')throw Error('Restablecé el challenge para comenzar uno nuevo.');
    s.status='active';setVisibility(s,'show',t);s.startedAt=s.runningSince=iso(t);
  }else if(type==='select'){
    requireActive();s.currentKey=null;s.currentPrevious=null;s.reveal=null;s.selection=plan(s,t);
  }else if(type==='settle'){
    if(!s.selection||t<s.selection.start+s.selection.duration)return before;
    const a=s.selection;s.currentKey=a.target;s.currentPrevious=s.entries[a.target];s.selection=null;s.reveal={id:a.id,key:a.target,start:a.start+a.duration+1400,duration:Math.round(s.resultCardDuration*1000)};
  }else if(type==='autoTick'){
    if(s.visibilityMode!=='auto'||t<s.autoDeadline)return before;
    if(s.autoPhase==='hidden'){s.autoPhase='entering';s.autoDeadline=t+transitionMs;}
    else if(s.autoPhase==='entering'){s.autoPhase='visible';s.autoDeadline=t+duration(s,'Visible');}
    else if(s.autoPhase==='visible'){s.autoPhase='exiting';s.autoDeadline=t+transitionMs;s.reveal=null;}
    else{s.autoPhase='hidden';s.autoDeadline=t+duration(s,'Interval');}
    s.visible=s.autoPhase!=='hidden';
  }else if(type==='manual'){
    if(!['active','paused'].includes(s.status))throw Error(`Iniciá el challenge para elegir un ${singular}.`);
    if(!eligible(s).includes(action.key))throw Error(`Un ${singular} completado no puede volver a seleccionarse.`);
    if(s.currentKey===action.key)return before;
    s.currentKey=action.key;s.currentPrevious=s.entries[action.key];s.reveal=null;
  }else if(type==='preferences'||type==='duration'){
    const values=type==='duration'?{selectionDuration:action.seconds}:action.values;
    if(!values||typeof values!=='object'||!Object.keys(values).length)throw Error('Ingresá una configuración válida.');
    for(const [key,value] of Object.entries(values)){
      if(!preferenceKeys.includes(key)||!validPreference(key,value))throw Error('La configuración está fuera del rango permitido.');
      s[key]=value;
    }
    if(Object.keys(values).every(key=>before[key]===s[key]))return before;
    // Timing/effect changes restart a complete hidden interval. Compact toggles do not.
    if(s.visibilityMode==='auto'&&Object.keys(values).some(k=>Object.hasOwn(autoDefaults,k)&&k!=='autoCompactProgressEnabled'))setVisibility(s,'auto',t);
  }else if(type==='correct'){
    if(!keys.includes(action.key)||!states.includes(action.result))throw Error(`Elegí un ${singular} y un estado válido.`);
    if(s.entries[action.key]===action.result&&s.visibilityMode!=='auto')return before;
    s.entries[action.key]=action.result;
    if(s.currentKey===action.key){s.currentKey=null;s.currentPrevious=null;s.reveal=null;}
    if(s.visibilityMode==='auto')setVisibility(s,'show',t);
    reconcileCompletion(s,t);
  }else if(type==='mark'){
    requireActive();if(!s.currentKey||!states.includes(action.result))throw Error(`Elegí un ${singular} y un resultado válido.`);
    s.entries[s.currentKey]=action.result;s.currentKey=null;s.currentPrevious=null;s.reveal=null;setVisibility(s,'show',t);
    reconcileCompletion(s,t);
  }else if(type==='pause'){
    requireActive();s.accumulatedMs=elapsed(s,t);s.runningSince=null;s.status='paused';setVisibility(s,'hide',t);
  }else if(type==='resume'){
    if(s.status!=='paused')throw Error('El challenge no está pausado.');s.status='active';setVisibility(s,'show',t);s.runningSince=iso(t);
  }else if(type==='visibility'){
    if(!['active','paused','completed'].includes(s.status))throw Error('Iniciá el challenge para controlar OBS.');
    const mode=action.mode||(s.visibilityMode==='hide'?'show':'hide');
    if(!['show','hide','auto'].includes(mode))throw Error('Modo de OBS inválido.');setVisibility(s,mode,t);
  }else if(type==='alignment'){
    if(!['left','center','right'].includes(action.value))throw Error('Alineación inválida.');s.alignment=action.value;
  }else if(type==='reset'){
    if(action.confirm!=='RESTABLECER '+title)throw Error('Falta confirmar el restablecimiento.');
    const n=fresh();n.alignment=s.alignment;for(const key of preferenceKeys)n[key]=s[key];n.revision=s.revision+1;return n;
  }else throw Error('Acción desconocida.');
  s.updatedAt=iso(t);s.revision++;return s;
}
return {fresh,validate,serialize,reduce,eligible,keys,catalog,elapsed,setVisibility,transitionMs,preferenceKeys};
};
