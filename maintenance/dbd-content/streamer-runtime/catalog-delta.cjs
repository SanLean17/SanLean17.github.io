'use strict';
// Content updates are operations, never replacement snapshots of somebody else's catalog.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const types=['killers','survivors','perks-killer','perks-survivor'];
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const canonical=v=>JSON.stringify(v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(canonical(v[k]))])):Array.isArray(v)?v.map(x=>JSON.parse(canonical(x))):v);
const normalized=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
function validateConflicts(catalogs,conflicts){
 for(const role of ['killer','survivor']){const rows=catalogs['perks-'+role],keys=new Set(rows.map(i=>i.key)),groups=conflicts[role];if(!Array.isArray(groups))throw Error('Falta grupo de conflictos: '+role);const seen=new Set();
  for(const group of groups){if(!Array.isArray(group)||group.length<2||new Set(group).size!==group.length||group.some(k=>!keys.has(k)))throw Error('Conflicto inválido o key duplicada/ausente: '+role);const id=[...group].sort().join('|');if(seen.has(id))throw Error('Grupo de conflictos duplicado: '+role);seen.add(id);}
  const active=rows.filter(i=>i.enabled!==false&&!i.emptySlot).map(i=>i.key);
  const complete=(chosen,start)=>{if(chosen.length===4)return true;for(let n=start;n<=active.length-(4-chosen.length);n++)if(!groups.some(g=>g.includes(active[n])&&chosen.some(k=>g.includes(k)))&&complete([...chosen,active[n]],n+1))return true;return false;};
  // An empty/small catalog remains loadable; requesting a build still fails explicitly.
  if(active.length>=4&&!complete([],0))throw Error('NO SE PUEDE GENERAR UNA BUILD VÁLIDA: '+role);
 }return conflicts;
}
function mergeConflicts(groups,additions){const result=structuredClone(groups);for(const group of additions){if(!Array.isArray(group))throw Error('Grupo de conflictos inválido.');if(!result.some(g=>canonical([...g].sort())===canonical([...group].sort())))result.push(group);}return result;}
function validate(catalogs){
 for(const type of types){const keys=new Set(),numbers=new Set();if(!Array.isArray(catalogs[type]))throw Error('Falta catálogo '+type);for(const entry of catalogs[type]){const key=String(entry.key||'');if(!key||keys.has(key.toLowerCase())||typeof entry.name!=='string'||!entry.name.trim())throw Error('Key/nombre no válido en '+type);keys.add(key.toLowerCase());if(type.startsWith('perks-')&&!entry.emptySlot){const number=Number(key.match(/^(\d+)_[a-zA-Z][a-zA-Z0-9_-]*$/)?.[1]);if(!Number.isSafeInteger(number)||numbers.has(number))throw Error('Prefijo numérico duplicado o inválido en '+type+': '+key);numbers.add(number);}else if(!/^[a-z0-9][a-z0-9_-]*$/.test(key))throw Error('Key inválida: '+key);if(entry.enabled!==undefined&&typeof entry.enabled!=='boolean')throw Error('Estado no válido.');if(entry.ownerKey){const owner=type==='perks-killer'?'killers':type==='perks-survivor'?'survivors':null;if(!owner||!catalogs[owner].some(o=>o.key===entry.ownerKey))throw Error('Propietario ausente o de otro rol: '+entry.ownerKey);}}}
 return catalogs;
}
function merge(catalogs,delta){
 if(delta.format!=='sanlean-dbd-delta-v1'||!Array.isArray(delta.changes)||!delta.changes.length)throw Error('Parche de cambios no válido.');
 const result=structuredClone(catalogs);
 for(const op of delta.changes){if(!types.includes(op.type)||typeof op.key!=='string')throw Error('Objeto del parche no válido.');const rows=result[op.type],index=rows.findIndex(i=>i.key===op.key),old=rows[index];
  if(op.action==='add'){if(op.entry?.key!==op.key)throw Error('Alta no válida.');if(old&&canonical(old)!==canonical(op.entry))throw Error('Ya existe contenido distinto con key '+op.key);if(!old&&rows.some(i=>normalized(i.name)===normalized(op.entry.name)))throw Error('Nombre duplicado: '+op.entry.name);if(!old)rows.push(structuredClone(op.entry));continue;}
  if(!old){if(op.action==='delete')continue;throw Error('El contenido '+op.key+' no existe en esta base.');}
  if(op.action==='enabled'){if(typeof op.value!=='boolean')throw Error('Estado no válido.');old.enabled=op.value;}
  else if(op.action==='owner'){if(old.ownerKey!==op.before&&old.ownerKey!==op.value)throw Error('Cambió el propietario de '+op.key);old.ownerKey=op.value;}
  else if(op.action==='fill'){if(op.ownerKey&&!old.ownerKey)old.ownerKey=op.ownerKey;if(op.aliases)old.aliases=[...new Set([...(Array.isArray(old.aliases)?old.aliases:old.aliases?[old.aliases]:[]),...op.aliases])];}
  else if(op.action==='metadata'){if(!op.fields||!Object.keys(op.fields).length)throw Error('Corrección vacía.');for(const [field,value] of Object.entries(op.fields)){if(!['name','aliases','image'].includes(field))throw Error('No se permite cambiar una key publicada: requiere una migración explícita.');if(canonical(old[field]??null)!==canonical(op.before?.[field]??null)&&canonical(old[field])!==canonical(value))throw Error('Cambió '+field+' de '+op.key+' en otra actualización. Revisá el conflicto.');old[field]=structuredClone(value);}if(rows.some(i=>i!==old&&normalized(i.name)===normalized(old.name)))throw Error('Nombre duplicado: '+old.name);}
  else if(op.action==='delete'){if(op.before&&canonical(old)!==canonical(op.before))throw Error('El contenido '+op.key+' cambió antes de eliminarlo.');rows.splice(index,1);}
  else throw Error('Operación de contenido desconocida.');
 }
 return validate(result);
}
function safe(root,rel){if(typeof rel!=='string'||! /^(data\/[a-zA-Z0-9_./-]+|assets\/killers\/[a-zA-Z0-9_. -]+|survivors?\/[a-zA-Z0-9_. -]+|killer\/[a-zA-Z0-9_. -]+)$/.test(rel)||rel.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Ruta de parche no válida.');const out=path.resolve(root,rel);if(!out.startsWith(path.resolve(root)+path.sep))throw Error('Ruta fuera de la instalación.');for(let p=out;p!==path.resolve(root);p=path.dirname(p))if(fs.existsSync(p)&&fs.lstatSync(p).isSymbolicLink())throw Error('No se admiten enlaces.');return out;}
function atomic(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=file+'.pending';fs.writeFileSync(tmp,JSON.stringify(value,null,2)+'\n');fs.renameSync(tmp,file);}
function applyPending(root){
 const data=path.join(root,'data'),queue=path.join(data,'actualizaciones'),journal=path.join(data,'catalog-update-journal.json'),ledgerFile=path.join(data,'catalog-updates-state.json');
 if(fs.existsSync(journal)){const recovery=read(journal);for(const [name,value] of Object.entries(recovery.before))if([...types,'perk-conflicts','catalog-updates-state'].includes(name))atomic(path.join(data,name+'.json'),value);fs.unlinkSync(journal);}
 if(!fs.existsSync(queue))return [];
 const ledger=fs.existsSync(ledgerFile)?read(ledgerFile):{format:2,applied:{},changes:{}},applied=[];ledger.changes||={};
 const updates=fs.readdirSync(queue).filter(n=>/^[a-z0-9-]+\.json$/.test(n)).map(n=>({file:path.join(queue,n),delta:read(path.join(queue,n))})).sort((a,b)=>String(a.delta.createdAt).localeCompare(String(b.delta.createdAt))||a.file.localeCompare(b.file));
 for(const {file,delta} of updates){const sha=digest(fs.readFileSync(file));if(!/^[a-z0-9-]+$/.test(delta.id))throw Error('ID de parche inválido.');if(ledger.applied[delta.id]){if(ledger.applied[delta.id]!==sha)throw Error('El parche aplicado fue reemplazado por otro distinto.');continue;}
  const affected=(delta.changes||[]).filter(op=>op.action!=='fill').flatMap(op=>op.action==='metadata'?Object.keys(op.fields||{}).map(field=>op.type+'/'+op.key+'/'+field):[op.type+'/'+op.key+'/'+(op.action==='enabled'?'enabled':op.action)]);
  for(const key of affected){const prior=ledger.changes[key];if(prior&&Date.parse(prior.at)>Date.parse(delta.createdAt))throw Error('PARCHE ANTIGUO: '+delta.id+' intenta retroceder '+key+' después de '+prior.id+'. No se aplicó.');}
  for(const asset of delta.assets||[]){const f=safe(root,asset.path);if(!fs.existsSync(f)||digest(fs.readFileSync(f))!==asset.sha256)throw Error('Falta o cambió el asset '+asset.path);}
  const before=Object.fromEntries(types.map(t=>[t,read(path.join(data,t+'.json'))])),after=merge(before,delta),conflicts=read(path.join(data,'perk-conflicts.json'));
  const updatedConflicts=structuredClone(conflicts);for(const role of ['killer','survivor'])updatedConflicts[role]=updatedConflicts[role].map(g=>g.filter(key=>after['perks-'+role].some(i=>i.key===key))).filter(g=>g.length>1);
  if(delta.conflicts)for(const role of ['killer','survivor'])if(delta.conflicts[role])updatedConflicts[role]=mergeConflicts(updatedConflicts[role],delta.conflicts[role]);validateConflicts(after,updatedConflicts);
  atomic(journal,{before:{...before,'perk-conflicts':conflicts,'catalog-updates-state':structuredClone(ledger)}});
  try{for(const type of types)atomic(path.join(data,type+'.json'),after[type]);atomic(path.join(data,'perk-conflicts.json'),updatedConflicts);ledger.applied[delta.id]=sha;for(const key of affected)ledger.changes[key]={at:delta.createdAt,id:delta.id};atomic(ledgerFile,ledger);fs.unlinkSync(journal);applied.push(delta.id);}catch(error){for(const [name,value] of Object.entries(read(journal).before))atomic(path.join(data,name+'.json'),value);fs.unlinkSync(journal);throw error;}
 }
 return applied;
}
module.exports={types,digest,canonical,normalized,validate,validateConflicts,mergeConflicts,merge,safe,applyPending};
