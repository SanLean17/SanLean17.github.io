'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {TYPES,CHECKS,atomic,inside,mkdir,json,hash,copy,run}=require('./core.cjs');
const deltaRuntime=require('../dbd-content/streamer-runtime/catalog-delta.cjs');
const same=(a,b)=>deltaRuntime.canonical(a)===deltaRuntime.canonical(b);
function kind(d){return d.items.length?'NUEVO CONTENIDO':d.catalogChanges?.length&&d.catalogChanges.every(c=>c.action==='enabled'&&!c.ownerKey)?'CAMBIO DE ESTADO':'CORRECCIÓN';}
function install(Manager){
 Manager.prototype.kind=kind;
 Manager.prototype.configureV4=function({testMode=false,dataRoot}={}){
  this.v4=true;this.testMode=testMode===true;
  if(dataRoot){const root=path.resolve(dataRoot);if(!this.testMode||!root.includes(path.sep+'tests'+path.sep)||!fs.existsSync(path.join(root,'.sanlean-fixture.json')))throw Error('Las pruebas requieren una carpeta aislada y su identificación.');this.data=root;}
  if(this.testMode&&!fs.existsSync(path.join(this.data,'.sanlean-fixture.json')))throw Error('Prueba bloqueada: no se admiten datos operativos.');
  const current=path.join(this.data,'catalogo-actual','catalogos.json');if(fs.existsSync(current)){this.rawCatalogs=json(current);this.catalogs=require('./associations.cjs').enrich(this.rawCatalogs);}
  return this;
 };
 const plan=Manager.prototype.catalogPlan;
 Manager.prototype.catalogPlan=function(id,input){if(id)return plan.call(this,id,input);const read=this.read;try{this.read=()=>({revision:0,items:[],catalogChanges:[]});return plan.call(this,'current',input);}finally{this.read=read;}};
 Manager.prototype.saveCatalogChange=async function(input){
  let d=input.destination?this.read(input.destination):null;
  if(d)this.checkRevision(d,input.destinationRevision);
  const original=this.catalogPlan(input.contextId||null,input);
  if(!same(original.affected,input.affected))throw Error('Cambió la selección. Volvé a revisar el cambio.');
  if(!d)d=this.create({name:input.name,updateId:input.updateId});
  const target=this.catalogPlan(d.id,input);
  if(!same(target.affected,original.affected))throw Error('La actualización elegida tiene otro conjunto de perks. Revisá sus cambios antes de combinar.');
  d=this.catalogApply(d.id,{...input,revision:d.revision,affected:target.affected,retainActivation:true});
  if(kind(d)==='CAMBIO DE ESTADO')d=await this.prepare(d.id);
  return d;
 };
 const prepare=Manager.prototype.prepare;
 Manager.prototype.prepare=async function(id){
  if(!this.v4)return prepare.call(this,id);
  const previous=this.read(id);if(previous.validation?.ok&&previous.build){try{this.artifact(previous);return previous;}catch{}}
  let d=await prepare.call(this,id);if(!d.validation?.ok)return d;
  d.updateKind=kind(d);
  if(kind(d)==='CAMBIO DE ESTADO'){
   try{const all=this.analyze(d).all;deltaRuntime.validate(all);
    for(const type of TYPES){const active=this.catalog.filterEnabled(all[type]);for(const change of d.catalogChanges.filter(c=>c.type===type))if(active.some(i=>i.key===change.key)!==change.enabled)throw Error('El filtro no respeta el estado de '+change.name);}
    // Exercise the real persistence model; disabled identities must survive reload.
    const challenge=require(path.join(this.streamer,'challenge-model.cjs'));
    for(const type of ['killers','survivors']){const before=challenge({catalog:this.catalogs[type],format:'manager-proof',title:type}),state=before.fresh();for(const key of Object.keys(state.entries))state.entries[key]='completed';const after=challenge({catalog:all[type],format:'manager-proof',title:type}),restored=after.validate(before.serialize(state));for(const key of Object.keys(state.entries))if(restored.entries[key]!==state.entries[key])throw Error('No se conservó el progreso de '+key);if(after.keys.length!==this.catalog.filterEnabled(all[type]).length)throw Error('Total de desafíos incorrecto.');}
    d.automatic={manifestHash:d.build.manifestHash,at:new Date().toISOString(),catalog:true,references:true,totals:true,enabledFilter:true,progress:true};d.simulation={manifestHash:d.build.manifestHash,at:d.automatic.at};d.state='CAMBIO LISTO PARA PUBLICAR';d.preparedAt=d.automatic.at;
   }catch(e){d.validation.ok=false;d.validation.errors.push({message:e.message});d.state='BORRADOR';}
  }
  return this.write(d);
 };
 const ready=Manager.prototype.ready;
 Manager.prototype.ready=function(id){if(!this.v4)return ready.call(this,id);const d=this.read(id);this.artifact(d);if(kind(d)==='CAMBIO DE ESTADO'){if(!d.automatic||d.automatic.manifestHash!==d.build.manifestHash||!Object.values(d.automatic).every(Boolean))throw Error('Validá el cambio de estado.');if(d.state==='CAMBIO LISTO PARA PUBLICAR')return d;d.state='CAMBIO LISTO PARA PUBLICAR';}
  else{if(d.preview?.manifestHash!==d.build.manifestHash||CHECKS.some(c=>d.checks[c]!==true))throw Error('Completá la revisión visual antes de marcar como preparada.');if(d.state==='PREPARADA PARA PUBLICAR')return d;d.state='PREPARADA PARA PUBLICAR';}
  d.preparedAt=new Date().toISOString();d.simulation={manifestHash:d.build.manifestHash,at:d.preparedAt};return this.write(d);
 };
 Manager.prototype.checkAll=function(id,input){const d=this.read(id);this.checkRevision(d,input.revision);this.artifact(d);if(d.preview?.manifestHash!==d.build.manifestHash)throw Error('Abrí la vista previa de esta preparación.');if(!['WEB','USUARIO','STREAMER','ALL'].includes(input.group))throw Error('Sección no válida.');const keys=CHECKS.filter(k=>input.group==='ALL'||k.startsWith(input.group.toLowerCase()+'-'));d.visualChecks||={};for(const key of keys){d.checks[key]=true;d.visualChecks[key]=Object.fromEntries(['image','name','desktop','mobile','animation'].map(a=>[a,true]));}return this.write(d);};
 Manager.prototype.editorCheckpoint=function(id,input){const d=this.read(id);this.checkRevision(d,input.revision);const file=path.join(this.draftDir(id),'edicion-local.json');if(input.clear){if(fs.existsSync(file))fs.unlinkSync(file);return {saved:true};}if(!input.item||!TYPES.includes(input.item.type)||JSON.stringify(input).length>29000000)throw Error('Edición no válida.');atomic(file,{revision:d.revision,item:input.item,file:input.file||null,at:new Date().toISOString()});return {saved:true};};
 Manager.prototype.editorRead=function(id){const d=this.read(id),f=path.join(this.draftDir(id),'edicion-local.json');return fs.existsSync(f)?{...json(f),current:json(f).revision===d.revision}:null;};
 Manager.prototype.combine=function(input){
  const ids=[...new Set(input.ids||[])];if(ids.length<2)throw Error('Elegí al menos dos actualizaciones.');
  const sources=ids.map(id=>this.read(id));if(sources.some(d=>d.publication))throw Error('Combiná sólo actualizaciones locales.');
  const items=[],changes=[],seen=new Map();for(const d of sources){for(const i of d.items){const key=i.type+'/'+i.key;if(seen.has(key)&&!same(seen.get(key),i))throw Error('Conflicto en '+i.name+'. Resolvelo en una copia antes de combinar.');if(!seen.has(key)){seen.set(key,i);items.push({source:d.id,item:i});}}for(const c of d.catalogChanges||[]){const key=c.type+'/'+c.key,existing=changes.find(x=>x.type+'/'+x.key===key);if(seen.has(key)||existing&&!same(c,existing))throw Error('Cambios incompatibles en '+c.name);if(!existing)changes.push(c);}}
  const out=this.create(input);out.items=items.map(({source,item})=>{const i=structuredClone(item);i.id=crypto.randomUUID();if(i.asset){const rel='imagenes/'+crypto.randomUUID()+i.asset.extension;copy(inside(this.draftDir(source),i.asset.file),inside(this.draftDir(out.id),rel));i.asset.file=rel;}return i;});out.catalogChanges=structuredClone(changes);out.combinedFrom=ids;return this.changed(out);
 };
 Manager.prototype.delta=function(d){
  const a=this.artifact(d),changes=[];
  // Carry audited historical associations only as additive metadata.
  for(const type of TYPES)for(const e of this.catalogs[type]){const raw=this.rawCatalogs[type].find(x=>x.key===e.key);if(raw&&(e.ownerKey&&!raw.ownerKey||!same(e.aliases||[],raw.aliases||[])))changes.push({type,key:e.key,action:'fill',...(e.ownerKey?{ownerKey:e.ownerKey}:{}),aliases:e.aliases||[]});}
  for(const i of d.items)changes.push({type:i.type,key:i.key,action:'add',entry:this.entry(i,d)});
  for(const c of d.catalogChanges||[]){const before=this.catalogs[c.type].find(i=>i.key===c.key);if(c.action==='delete')changes.push({type:c.type,key:c.key,action:'delete',before});if(c.action==='enabled')changes.push({type:c.type,key:c.key,action:'enabled',value:c.enabled});if(c.ownerKey)changes.push({type:c.type,key:c.key,action:'owner',before:before.ownerKey,value:c.ownerKey});}
  return {format:'sanlean-dbd-delta-v1',id:d.updateId+'-'+d.build.manifestHash.slice(0,8),updateId:d.updateId,name:d.name,createdAt:a.manifest.createdAt,changes,assets:a.manifest.files.filter(f=>f.kind==='new').map(f=>({path:f.path,sha256:f.sha256}))};
 };
 const patch=Manager.prototype.patch;
 Manager.prototype.patch=async function(id){if(!this.v4)return patch.call(this,id);const d=this.read(id),a=this.artifact(d),delta=this.delta(d),out=path.join(a.dir,'parche-v4'),staging=path.join(out,'contenido');mkdir(staging);const rel='data/actualizaciones/'+delta.id+'.json';atomic(inside(staging,rel),delta);for(const f of delta.assets)copy(inside(a.root,f.path),inside(staging,f.path));
  // Bootstrap delta support even on the previous catalog-aware Streamer release.
  for(const file of ['catalog-delta.cjs','catalog-store.cjs'])copy(path.resolve(__dirname,'../dbd-content/streamer-runtime',file),path.join(staging,file));
  fs.writeFileSync(path.join(staging,'README-PATCH.txt'),'SANLEAN — PARCHE LOCAL\r\n1. Cerrar Streamer Tools.\r\n2. Extraer sobre su carpeta y aceptar reemplazar.\r\n3. Volver a abrir.\r\nLos cambios se aplican al catálogo actual al arrancar, conservando otras actualizaciones, progreso y preferencias. OBS reconecta automáticamente. Refrescar la fuente sólo es una contingencia.\r\nNo contiene datos personales. Streamer Tools se actualiza por este parche local, no desde GitHub.\r\n');
  const zip=path.join(out,'SanLean-'+d.updateId+'-PATCH.zip');if(!fs.existsSync(zip))await run('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-Command',`Compress-Archive -Path '${staging.replaceAll("'","''")}/*' -DestinationPath '${zip.replaceAll("'","''")}'`]);d.patch={file:path.relative(this.data,zip).split(path.sep).join('/'),sha256:hash(fs.readFileSync(zip)),manifestHash:d.build.manifestHash,format:delta.format};return this.write(d);
 };
}
module.exports={install,kind,same};
