'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {makeSequence,validKillerSequence,SEQUENCE_VERSION}=require('./spin-sequence.cjs');
const tickets=require('./public/js/roulette-entries.js');
const definitions={
  'killer-wheel':{name:'RULETA DE KILLERS',kind:'roulette_killers',catalog:'killers',folder:'killers',sounds:['digital','dry','round','deep'],duration:8000,count:1},
  'perks-killer':{name:'PERKS DE KILLERS',kind:'roulette_killer_perks',catalog:'perks-killer',folder:'killer',sounds:['digital','dry','round','deep'],duration:3420,count:4},
  'perks-survivor':{name:'PERKS DE SUPERVIVIENTES',kind:'roulette_survivor_perks',catalog:'perks-survivor',folder:'survivor',sounds:['digital','dry','round','deep'],duration:3420,count:4}
};
const store=require('./catalog-store.cjs');
const allCatalogs=Object.fromEntries(Object.entries(definitions).map(([key,d])=>[key,store.read(d.catalog,true).map(item=>({...item,image:'/'+item.image}))]));
const catalogs=Object.fromEntries(Object.entries(allCatalogs).map(([key,items])=>[key,items.filter(i=>i.enabled!==false)]));
const conflicts=JSON.parse(fs.readFileSync(path.join(__dirname,'data/perk-conflicts.json'),'utf8'));
const extra=(key,donor=null,enabled=true)=>({entryId:key+':'+(donor?'donation':'extra')+':'+crypto.randomUUID(),key,donor,type:donor?'donation':'extra',enabled});
function freshTool(key){return {soundVolume:55,soundEnabled:true,soundType:definitions[key].sounds[0],soundCollapsed:false,optionsCollapsed:true,repeatMode:'keep',entries:tickets.defaults(allCatalogs[key]),usedKillerEntries:[],state:{status:'idle',visible:false,items:[]}};}
function fresh(){return {format:'sanlean-local-roulettes',version:2,revision:0,tools:Object.fromEntries(Object.keys(definitions).map(k=>[k,freshTool(k)]))};}
function pool(key,tool){return tickets.pool(catalogs[key],tool,key==='killer-wheel'&&tool.repeatMode==='remove');}
function view(key,tool){return {kind:definitions[key].kind,settings:{pool:pool(key,tool)},state:tool.state};}
function migrate(key,old){
  const t=structuredClone(old),ids=new Set(allCatalogs[key].map(i=>i.key));
  if(!t.weights||!t.donors||!Array.isArray(t.used))throw Error('Opciones de ruleta inválidas.');
  for(const [id,n] of Object.entries(t.weights))if(!ids.has(id)||!Number.isInteger(n)||n<0||n>99)throw Error('Cantidad inválida.');
  for(const [id,list] of Object.entries(t.donors))if(!ids.has(id)||!Array.isArray(list)||list.length>98||list.some(n=>typeof n!=='string'||!n.trim()||n.length>32))throw Error('Entradas inválidas.');
  if(t.used.some(id=>!ids.has(id))||new Set(t.used).size!==t.used.length)throw Error('Killers usados inválidos.');
  t.entries=tickets.defaults(allCatalogs[key]);
  for(const base of [...t.entries]){
    const n=t.weights[base.key]??1,names=t.donors[base.key]||[];base.enabled=n>0;
    // Retain all old names, even on disabled options. Re-enabling restores them.
    for(const name of names)t.entries.push(extra(base.key,name,n>0));
    for(let i=0;i<Math.max(0,n-1-names.length);i++)t.entries.push(extra(base.key));
  }
  t.usedKillerEntries=t.used.map(tickets.baseId);delete t.weights;delete t.donors;delete t.used;
  const s=t.state;
  if(s){
    const identity=item=>({...item,...(t.entries.find(e=>e.key===item.key&&e.donor===(item.donor||null))||extra(item.key,item.donor||null))});
    s.items=(s.items||[]).map(identity);if(s.targets)s.targets=s.targets.map(identity);
    if(s.spinPool){const keys=new Set(s.spinPool.map(i=>i.key));s.spinPool=tickets.configured(catalogs[key],t).filter(e=>keys.has(e.key));}
    let visual=s.spinPool||pool(key,t);const targets=s.targets?.length?s.targets:s.items;
    // A saved ready/result deck can outlive option edits or an exhausted pool.
    // Its presentation may use past tickets without putting them back in play.
    if(s.spinSequence&&(!visual.length||targets.some(i=>!visual.some(e=>e.key===i.key)))){
      const keys=new Set(key==='killer-wheel'?s.spinSequence.filter(Boolean).map(e=>e.killer.key):s.spinSequence.flat().map(e=>e.key));
      visual=t.entries.filter(e=>keys.has(e.key)).map(e=>({...catalogs[key].find(i=>i.key===e.key),...e,weight:1}));
    }
    if(s.status!=='idle'&&visual.length)Object.assign(s,makeSequence(key,visual,targets));
  }
  return t;
}
function validate(raw){
  if(raw?.format!=='sanlean-local-roulettes'||![1,2].includes(raw.version)||!Number.isSafeInteger(raw.revision)||raw.revision<0)throw Error('Archivo de ruletas inválido.');
  const out=fresh();out.revision=raw.revision;
  for(const key of Object.keys(definitions)){
    const original=raw.tools?.[key],d=definitions[key],ids=new Set(allCatalogs[key].map(i=>i.key));
    if(!original)throw Error('Configuración de ruleta inválida.');
    const t=raw.version===1?migrate(key,original):structuredClone(original);
    if(!Number.isFinite(t.soundVolume)||t.soundVolume<0||t.soundVolume>100||!d.sounds.includes(t.soundType)||!['keep','remove'].includes(t.repeatMode))throw Error('Configuración de ruleta inválida.');
    for(const p of ['soundEnabled','soundCollapsed','optionsCollapsed'])if(typeof t[p]!=='boolean')throw Error('Configuración de ruleta inválida.');
    if(!Array.isArray(t.entries)||!Array.isArray(t.usedKillerEntries))throw Error('Entradas inválidas.');
    // Retain retired identities and donations in storage. Active pools still come only from catalogs.
    for(const entry of t.entries){if(typeof entry?.key!=='string'||entry.key.length>500||!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(entry.key))throw Error('Identidad de catálogo inválida.');ids.add(entry.key);}
    // Add only missing base tickets. Keep every donation, disabled choice and used identity.
    const savedDefaults=new Set(t.entries.filter(e=>e?.type==='default').map(e=>e.key));
    t.entries.push(...tickets.defaults(allCatalogs[key]).filter(e=>!savedDefaults.has(e.key)));
    const entryIds=new Set(),counts=new Map(),defaults=new Set();
    const validEntry=e=>e&&ids.has(e.key)&&typeof e.entryId==='string'&&e.entryId.length<=150&&e.entryId.startsWith(e.key+':')&&['default','donation','extra'].includes(e.type)&&typeof e.enabled==='boolean'&&(e.type==='donation'?typeof e.donor==='string'&&!!e.donor.trim()&&e.donor.length<=32:e.donor===null)&&(e.type!=='default'||e.entryId===tickets.baseId(e.key));
    for(const e of t.entries){
      if(!validEntry(e)||entryIds.has(e.entryId))throw Error('Identidad de entrada inválida.');
      entryIds.add(e.entryId);counts.set(e.key,(counts.get(e.key)||0)+(e.enabled?1:0));
      if(e.type==='default'){if(defaults.has(e.key))throw Error('Entrada base duplicada.');defaults.add(e.key);}
    }
    if(defaults.size!==ids.size||[...counts.values()].some(n=>n>99)||t.entries.length>ids.size*99)throw Error('Cantidad de entradas inválida.');
    if(new Set(t.usedKillerEntries).size!==t.usedKillerEntries.length||t.usedKillerEntries.some(id=>!entryIds.has(id)))throw Error('Entradas usadas inválidas.');
    const s=t.state;if(!s||!['idle','ready','spinning','result'].includes(s.status)||typeof s.visible!=='boolean'||!Array.isArray(s.items))throw Error('Estado de ruleta inválido.');
    for(const list of [s.items,s.targets||[]]){
      if(list.length>d.count||list.some(i=>!validEntry(i))||new Set(list.map(i=>i.key)).size!==list.length)throw Error('Resultado inválido o repetido.');
      // A saved result may predate today's conflict rules. New draws enforce the current rules in select().
    }
    if(s.status==='spinning'&&(!Number.isFinite(Date.parse(s.startedAt))||s.durationMs!==d.duration||s.targets?.length!==d.count||!Array.isArray(s.spinPool)||s.spinPool.some(i=>!validEntry(i))||s.targets.some(target=>!s.spinPool.some(e=>e.entryId===target.entryId&&e.key===target.key&&e.donor===target.donor))))throw Error('Giro inválido.');
    const targets=s.targets?.length?s.targets:s.items;let visualPool=s.entryPool||s.spinPool||pool(key,t);
    // A legacy ready deck may survive disabling every option. Recover its
    // historical tickets by ID without re-enabling any configured option.
    if(s.sequenceVersion!==SEQUENCE_VERSION&&!visualPool.length&&s.spinSequence?.length){
      const cards=key==='killer-wheel'?s.spinSequence.map(e=>({...e.killer,entryId:e.entryId,type:e.type,donor:e.donor,enabled:true})):s.spinSequence.flat();
      const history=new Map(cards.map(e=>[e.entryId,e])),keys=new Set(cards.map(e=>e.key));
      for(const e of t.entries.filter(e=>keys.has(e.key)))history.set(e.entryId,{...allCatalogs[key].find(i=>i.key===e.key),...e,enabled:true});
      visualPool=[...history.values()];
    }
    // Upgrade only the presentation of legacy saves. Keep their exact winner,
    // ticket identities, donor, spinId and timing; never draw another winner.
    if(s.status!=='idle'&&(!s.spinSequence||s.sequenceVersion!==SEQUENCE_VERSION)&&visualPool.length)Object.assign(s,makeSequence(key,visualPool,targets));
    if(s.spinSequence){
      const seq=s.spinSequence;if(!Array.isArray(seq))throw Error('Secuencia inválida.');
      if(!Array.isArray(s.entryPool)||!s.entryPool.length||s.entryPool.some(e=>!validEntry(e)||e.killerKey!==e.key||e.source!==e.type)||new Set(s.entryPool.map(e=>e.entryId)).size!==s.entryPool.length)throw Error('Pool visual inválido.');
      const sameTicket=(a,b)=>a?.entryId===b?.entryId&&a?.key===b?.key&&a?.donor===b?.donor&&a?.type===b?.type;
      if(s.spinPool&&(s.spinPool.length!==s.entryPool.length||s.spinPool.some((e,i)=>!sameTicket(e,s.entryPool[i]))))throw Error('El pool del giro no coincide.');
      if(key==='killer-wheel'){
        if(seq.length<100||seq.length>3*s.entryPool.length+107||!Number.isInteger(s.targetIndex)||s.targetIndex<5||s.targetIndex>seq.length-5||s.startIndex!==5||seq.some(e=>!ids.has(e?.killer?.key)||typeof e.entryId!=='string'))throw Error('Secuencia inválida.');
        if(targets[0]&&(seq[s.targetIndex].entryId!==targets[0].entryId||seq[s.targetIndex].donor!==targets[0].donor||s.winnerEntryId!==targets[0].entryId||!sameTicket(s.winner,targets[0])||s.winner.killerKey!==targets[0].key||s.winner.source!==targets[0].type))throw Error('Ventana final inválida.');
        if(!Array.isArray(s.visualDeck)||s.visualDeck.length!==s.entryPool.length||!validKillerSequence(s.visualDeck,s.entryPool)||!validKillerSequence(seq,s.entryPool)||s.visualDeck.some((e,i)=>e.entryId!==seq[i].entryId))throw Error('Tickets o separación visual inválidos.');
      }else {
        if(!Array.isArray(s.visualDeck)||s.visualDeck.length!==s.entryPool.length||s.visualDeck.some((e,i)=>!sameTicket(e,s.entryPool[i])))throw Error('Tickets de perks inválidos.');
        const byEntry=new Map(s.entryPool.map(e=>[e.entryId,e]));
        if(seq.length!==targets.length||s.targetIndex!==36||seq.some((slot,i)=>!Array.isArray(slot)||slot.length!==37||slot.some(e=>!sameTicket(e,byEntry.get(e?.entryId)))||slot[36].entryId!==targets[i].entryId||slot[36].donor!==targets[i].donor))throw Error('Secuencia de perks inválida.');
      }
    }
    out.tools[key]=t;
  }
  return out;
}
const compatible=(key,chosen,groups)=>!chosen.some(e=>e.key===key)&&!groups.some(g=>g.includes(key)&&chosen.some(e=>g.includes(e.key)));
function select(key,entries){
  const d=definitions[key],groups=key==='killer-wheel'?[]:conflicts[d.folder]||[];
  // Public WEB strategy: pick a concrete ticket, exclude its key and conflicts.
  // Its donor is part of that ticket, never a second random draw.
  for(let attempt=0;attempt<250;attempt++){
    const chosen=[];
    while(chosen.length<d.count){const candidates=entries.filter(e=>compatible(e.key,chosen,groups));if(!candidates.length)break;chosen.push(candidates[crypto.randomInt(candidates.length)]);}
    if(chosen.length===d.count)return chosen.map(e=>({...e,emptySlot:!!e.emptySlot}));
  }
  // Exhaustive four-key fallback avoids false failures in sparse valid setups.
  const unique=[...new Map(entries.map(e=>[e.key,e])).values()];
  function complete(chosen,start){if(chosen.length===d.count)return chosen;for(let i=start;i<=unique.length-(d.count-chosen.length);i++){if(!compatible(unique[i].key,chosen,groups))continue;const found=complete([...chosen,unique[i]],i+1);if(found)return found;}return null;}
  const fallback=complete([],0);if(fallback)return fallback.map(i=>{const candidates=entries.filter(e=>e.key===i.key);return {...candidates[crypto.randomInt(candidates.length)],emptySlot:!!i.emptySlot};});
  throw Error(key==='killer-wheel'?'No quedan killers disponibles. Restablecé los usados o agregá opciones.':'NO SE PUEDE GENERAR UNA BUILD VÁLIDA CON LA CONFIGURACIÓN ACTUAL.');
}
function settle(input,key,now=Date.now()){
  const t=input.tools[key],s=t?.state;if(s?.status!=='spinning'||now<Date.parse(s.startedAt)+s.durationMs)return input;
  const next=structuredClone(input),tool=next.tools[key];
  if(key==='killer-wheel'&&tool.repeatMode==='remove')tool.usedKillerEntries=[...new Set([...tool.usedKillerEntries,s.targets[0].entryId])];
  tool.state={...s,status:'result',items:s.targets,finishedAt:new Date(now).toISOString()};next.revision++;return next;
}
function reduce(input,action,now=Date.now()){
  const {tool:key,type}=action,d=definitions[key];if(!d)throw Error('Herramienta inválida.');
  const next=structuredClone(input),t=next.tools[key],spinning=t.state.status==='spinning';
  if(type==='preferences'){
    for(const [k,v] of Object.entries(action.values||{})){
      if(['soundEnabled','soundCollapsed','optionsCollapsed'].includes(k)&&typeof v==='boolean')t[k]=v;
      else if(k==='soundType'&&d.sounds.includes(v))t[k]=v;
      else if(k==='soundVolume'&&Number.isFinite(v)&&v>=0&&v<=100)t[k]=v;
      else throw Error('Configuración inválida.');
    }
  }else{
    if(spinning)throw Error('Esperá a que termine el giro.');
    if(type==='mode'){
      if(key!=='killer-wheel'||!['keep','remove'].includes(action.value))throw Error('Modo inválido.');t.repeatMode=action.value;
    }else if(['weight','add','remove'].includes(type)){
      if(!catalogs[key].some(i=>i.key===action.key))throw Error('Opción inválida.');
      const entries=t.entries.filter(e=>e.key===action.key&&e.enabled),base=t.entries.find(e=>e.entryId===tickets.baseId(action.key));
      const remove=id=>{t.entries=t.entries.filter(e=>e.entryId!==id);t.usedKillerEntries=t.usedKillerEntries.filter(e=>e!==id);};
      if(type==='weight'){
        if(![-1,1].includes(action.delta))throw Error('Cantidad inválida.');
        if(action.delta===1&&entries.length<99){
          if(!base.enabled){base.enabled=true;for(const e of t.entries)if(e.key===action.key)e.enabled=true;}
          else t.entries.push(extra(action.key));
        }else if(action.delta===-1&&entries.length){
          const last=entries.findLast(e=>e.type==='extra')||entries.findLast(e=>e.type==='donation');
          if(last)remove(last.entryId);else base.enabled=false;
        }
      }else if(type==='add'){
        if(typeof action.name!=='string'||!action.name.trim()||action.name.trim().length>32||!entries.length||entries.length>=99)throw Error('Ingresá un nombre de hasta 32 caracteres en una opción habilitada. Máximo 99 entradas.');
        t.entries.push(extra(action.key,action.name.trim()));
      }else{
        const e=t.entries.find(e=>e.entryId===action.entryId&&e.key===action.key&&e.type!=='default');if(!e)throw Error('Entrada inválida.');remove(e.entryId);
      }
    }else if(type==='generate'){
      if(!pool(key,t).length)throw Error('Habilitá opciones antes de generar la ruleta.');
      t.state={status:'ready',visible:true,items:[],...makeSequence(key,pool(key,t),[])};
    }else if(type==='spin'){
      if(!['ready','result'].includes(t.state.status))throw Error('Generá la ruleta antes de girar.');
      const spinPool=pool(key,t),targets=select(key,spinPool);
      t.state={...makeSequence(key,spinPool,targets),visible:true,status:'spinning',items:[],targets,spinPool,spinId:crypto.randomUUID(),durationMs:d.duration,activeSlots:Array.from({length:d.count},(_,i)=>i),startedAt:new Date(now).toISOString()};
    }else if(type==='visibility'){
      if(typeof action.visible!=='boolean')throw Error('Visibilidad inválida.');
      if(t.state.status==='idle'&&action.visible)throw Error('Generá la ruleta antes de mostrarla.');t.state.visible=action.visible;
    }else if(type==='resetUsed'){
      if(key!=='killer-wheel')throw Error('Acción inválida.');t.usedKillerEntries=[];const available=pool(key,t);t.state=available.length?{status:'ready',visible:true,items:[],...makeSequence(key,available,[])}:{status:'idle',visible:false,items:[]};
    }else if(type==='reset'){
      if(action.confirm!=='RESTABLECER RULETA')throw Error('Falta confirmar el restablecimiento.');t.entries=tickets.defaults(allCatalogs[key]);t.usedKillerEntries=[];t.state={status:'idle',visible:false,items:[]};
    }else throw Error('Acción inválida.');
  }
  next.revision++;return next;
}
module.exports={definitions,catalogs,fresh,validate,pool,view,reduce,settle,select};
