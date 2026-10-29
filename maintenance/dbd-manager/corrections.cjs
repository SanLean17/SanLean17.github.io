'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {TYPES,FOLDERS,OWNER,inside,hash,json,copy}=require('./core.cjs'),delta=require('../dbd-content/streamer-runtime/catalog-delta.cjs');
function install(Manager){
 Manager.prototype.validateAssets=async function(root,all){
  const seen=new Set();for(const type of TYPES)for(const item of all[type]){const rel=this.catalog.resolveItemImage(item,type);if(seen.has(rel))continue;seen.add(rel);try{const bytes=fs.readFileSync(inside(root,rel));await this.inspectImage(bytes,path.extname(rel).toLowerCase());}catch(e){throw Error(item.name+' — '+rel+': '+e.message);}}
 };
 Manager.prototype.catalogMetadata=async function(id,input){
  const d=this.read(id);this.checkRevision(d,input.revision);
  const original=this.catalogs[input.type]?.find(i=>i.key===input.key&&!i.emptySlot);
  if(!original)throw Error('Elegí contenido ya publicado del catálogo.');
  if(input.newKey&&input.newKey!==input.key)throw Error('No se puede cambiar una key publicada. Puede romper progreso, historial, configuraciones, donaciones, entradas usadas y overlays; requiere una migración explícita.');
  d.catalogChanges||=[];let change=d.catalogChanges.find(c=>c.type===input.type&&c.key===input.key);
  if(change?.action==='delete')throw Error('Quitá la eliminación antes de corregir este contenido.');
  if(!change){change={type:input.type,key:input.key,name:original.name,action:'metadata',fields:{},fieldsBefore:{}};d.catalogChanges.push(change);}
  change.fields||={};change.fieldsBefore||={};
  if(input.name!==undefined){if(typeof input.name!=='string'||!input.name.trim())throw Error('Escribí el nombre visible.');change.fields.name=input.name.trim().slice(0,500);}
  if(input.aliases!==undefined){if(typeof input.aliases!=='string')throw Error('Ingresá un alias por línea.');change.fields.aliases=[...new Set(input.aliases.split(/\r?\n/).map(s=>s.trim()).filter(Boolean))];}
  if(input.base64){
   if(!/^[^\\/:*?"<>|\x00-\x1f]+\.(png|webp)$/i.test(input.filename||'')||! /^[A-Za-z0-9+/]*={0,2}$/.test(input.base64))throw Error('Nombre o archivo de imagen no válido.');
   const bytes=Buffer.from(input.base64,'base64'),extension=path.extname(input.filename).toLowerCase(),info=await this.inspectImage(bytes,extension);
   if(this.assetHashes.has(info.sha256)||d.items.some(i=>i.asset?.sha256===info.sha256)||(d.catalogChanges||[]).some(c=>c!==change&&c.asset?.sha256===info.sha256))throw Error('La imagen ya existe. Elegí un reemplazo diferente.');
   if(!info.transparent&&input.allowOpaque!==true)throw Error('Confirmá si querés conservar esta imagen sin transparencia.');
   const file='imagenes/'+crypto.randomUUID()+extension;fs.mkdirSync(path.join(this.draftDir(id),'imagenes'),{recursive:true});fs.writeFileSync(inside(this.draftDir(id),file),bytes,{flag:'wx'});
   // Address replacements by content hash: an old ZIP cannot overwrite a newer image's bytes.
   change.fields.image=FOLDERS[input.type]+'/'+input.key+'-'+info.sha256.slice(0,12)+extension;
   change.asset={...info,file,extension,filename:input.filename,allowOpaque:input.allowOpaque===true,beforePath:this.catalog.resolveItemImage(original,input.type),beforeSha256:hash(fs.readFileSync(inside(this.base,this.catalog.resolveItemImage(original,input.type))))};
  }
  for(const field of Object.keys(change.fields))if(!Object.hasOwn(change.fieldsBefore,field))change.fieldsBefore[field]=original[field]??null;
  if(!Object.keys(change.fields).length)throw Error('La corrección está vacía.');
  const candidate=this.effectiveCatalogs(d);delta.validate(candidate);
  const row=candidate[input.type].find(i=>i.key===input.key);
  if(candidate[input.type].some(i=>i.key!==input.key&&delta.normalized(i.name)===delta.normalized(row.name)))throw Error('Nombre duplicado: '+row.name);
  return this.changed(d);
 };
 Manager.prototype.saveCorrection=async function(input){
  let d=input.destination?this.read(input.destination):null;
  if(d)this.checkRevision(d,input.destinationRevision);else d=this.create({...input,name:input.updateName||input.name});
  return this.catalogMetadata(d.id,{...input,revision:d.revision});
 };
 Manager.prototype.prepareCorrections=async function(d,root,files){
  for(const c of d.catalogChanges||[])if(c.asset){const bytes=fs.readFileSync(inside(this.draftDir(d.id),c.asset.file));if(hash(bytes)!==c.asset.sha256)throw Error('La imagen de '+c.name+' cambió. Volvé a cargarla.');await this.inspectImage(bytes,c.asset.extension);copy(inside(this.draftDir(d.id),c.asset.file),inside(root,c.fields.image));files.push({path:c.fields.image,kind:'replacement',beforePath:c.asset.beforePath,beforeSha256:c.asset.beforeSha256});}
 };
 Manager.prototype.setConflicts=function(id,input){
  const d=this.read(id);this.checkRevision(d,input.revision);
  if(!input.conflicts||Object.keys(input.conflicts).some(k=>!['killer','survivor'].includes(k)))throw Error('Conflictos no válidos.');
  const all=this.analyze(d).all,base=json(path.join(this.base,'data/perk-conflicts.json'));
  for(const role of ['killer','survivor'])base[role]=delta.mergeConflicts(base[role],input.conflicts[role]||[]);
  delta.validateConflicts(all,base);d.conflictChanges=structuredClone(input.conflicts);return this.changed(d);
 };
 const prepareConflicts=Manager.prototype.prepareConflicts;
 Manager.prototype.prepareConflicts=function(d,root,files){
  prepareConflicts.call(this,d,root,files);const rel='data/perk-conflicts.json',file=path.join(root,rel),groups=json(file);
  if(d.conflictChanges){for(const role of ['killer','survivor'])groups[role]=delta.mergeConflicts(groups[role],d.conflictChanges[role]||[]);fs.writeFileSync(file,JSON.stringify(groups,null,2)+'\n');if(!files.some(f=>f.path===rel))files.push({path:rel,kind:'modified'});}
  delta.validateConflicts(this.analyze(d).all,groups);
 };
}
module.exports={install};

