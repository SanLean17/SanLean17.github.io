'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {Manager,TYPES,json,hash}=require('../maintenance/dbd-manager/core.cjs'),presentation=require('../js/challenge-presentation.js');
const root=path.resolve(__dirname,'..'),home=path.join(root,'test-results/manager-v3-unit-'+Date.now()),m=new Manager({home,baseRoot:root,baseCommit:'569ace03228d36b2a3eb23605884cb03398e9753'});
test('asociaciones: 98 personajes, 294 perks, claves exactas y búsqueda por propietario',()=>{
 const {reference}=require('../maintenance/dbd-manager/associations.cjs');assert.equal(Object.keys(reference.owners.killers).length,44);assert.equal(Object.keys(reference.owners.survivors).length,54);
 for(const [type,ownerType] of [['perks-killer','killers'],['perks-survivor','survivors']]){const owned=m.catalogs[type].filter(i=>i.ownerKey);assert.equal(owned.filter(i=>Object.hasOwn(reference.perks[type],i.key)).length,Object.keys(reference.perks[type]).length);for(const owner of m.catalogs[ownerType].filter(i=>Object.hasOwn(reference.owners[ownerType],i.key))){const perks=owned.filter(i=>i.ownerKey===owner.key);assert.equal(perks.length,3,owner.key);for(const perk of perks)assert(m.catalog.matches(perk,owner.name,{type,owners:m.catalogs[ownerType]}));}}
 for(const [key,owner] of [['20_hexDevourHope','hag'],['24_hexRuin','hag'],['25_hexTheThirdSeal','hag'],['118_darkArrogance','vecna'],['136_hiveMind','lich'],['112_batteriesIncluded','chucky']])assert.equal(m.catalogs['perks-killer'].find(i=>i.key===key).ownerKey,owner);
 assert(!m.catalogs['perks-killer'].find(i=>i.key==='96_boonDestroyer').ownerKey);assert(!m.catalogs['perks-survivor'].find(i=>i.key==='13_darkSense').ownerKey);
});
test('parche de reactivación explícita funciona sin assets, con movimientos separados del neto',async()=>{
 let d=m.create({name:'Chucky unit',updateId:'chucky-v3'});const act=(action,extra={})=>{const plan=m.catalogPlan(d.id,{type:'killers',key:'chucky',action});d=m.catalogApply(d.id,{...plan,...extra});};
 act('disable');d=await m.prepare(d.id);assert(d.validation.ok,JSON.stringify(d.validation));let a=m.artifact(d);assert.equal(a.manifest.totals.killers.disabled,1);assert.equal(a.manifest.totals.killers.after,m.catalogs.killers.filter(i=>i.enabled!==false&&i.key!=='chucky').length);d=await m.patch(d.id);const image=m.catalogs.killers.find(i=>i.key==='chucky').image,digest=hash(fs.readFileSync(path.join(root,image)));assert.equal(hash(fs.readFileSync(path.join(a.root,image))),digest);
 act('enable',{retainActivation:true});assert(d.catalogChanges.some(c=>c.restoresPreviousPatch));d=await m.prepare(d.id);assert(d.validation.ok);a=m.artifact(d);assert.equal(a.manifest.totals.killers.after,m.catalogs.killers.filter(i=>i.enabled!==false||i.key==='chucky').length);assert.equal(a.manifest.totals.killers.disabled,0);assert.equal(a.manifest.totals.killers.added,0);d=await m.patch(d.id);const zip=await require('jszip').loadAsync(fs.readFileSync(path.join(m.data,d.patch.file)));assert(JSON.parse(await zip.file('data/killers.json').async('string')).find(i=>i.key==='chucky').enabled);assert(!Object.keys(zip.files).some(f=>/datos|AppData/.test(f)));assert.equal(hash(fs.readFileSync(path.join(a.root,image))),digest);
});
test('administración del paquete nuevo conserva identidad de borrador y no agrega cambios históricos falsos',()=>{
 let d=m.create({name:'Paquete nuevo',updateId:'paquete-v3'});d=m.save(d.id,{...d,items:[{type:'killers',key:'nuevo',name:'Nuevo'},{type:'perks-killer',key:'145_nuevo',name:'Perk nueva',ownerKey:'nuevo'}]});let plan=m.catalogPlan(d.id,{type:'killers',key:'nuevo',scope:'package',action:'disable'});assert.equal(plan.affected.length,2);d=m.catalogApply(d.id,plan);assert(d.items.every(i=>i.enabled===false));assert.equal((d.catalogChanges||[]).length,0);plan=m.catalogPlan(d.id,{type:'killers',key:'nuevo',scope:'package',action:'enable'});d=m.catalogApply(d.id,plan);assert(d.items.every(i=>i.enabled));
});
test('presentación automática: fases sincronizadas, cuatro efectos, pausa y ajustes independientes',()=>{
 const data={kind:'challenge_all_killers',settings:{obsPresentation:{mode:'auto',interval:2,visible:1,animation:'left',compact:true,startedAt:10000}},state:{status:'active',visible:true}};
 for(const [time,phase] of [[10000,'hidden'],[12000,'entering'],[12450,'visible'],[13450,'exiting'],[13900,'hidden']])assert.equal(presentation.project(data,time).phase,phase);
 const before=JSON.stringify(data);assert.equal(presentation.project({...data,state:{...data.state,status:'paused'}},12500).visible,false);assert.equal(presentation.project({...data,settings:{obsPresentation:{mode:'hide'}}},12500).visible,false);assert.equal(presentation.project({...data,settings:{obsPresentation:{mode:'show'}}},12500).visible,true);assert.equal(JSON.stringify(data),before);
 for(const animation of ['top','left','right','fade'])assert.equal(presentation.project({...data,settings:{obsPresentation:{...data.settings.obsPresentation,animation}}},12500).animation,animation);
});

test('administración independiente de personaje, perk, todas las perks y paquete; confirma assets y referencias',()=>{
 for(const [type,key,scope,size] of [['killers','hag','item',1],['perks-killer','24_hexRuin','item',1],['killers','hag','perks',3],['killers','hag','package',4]]){
  let d=m.create({name:'Administrar '+scope,updateId:'admin-'+scope+'-'+type});
  let plan=m.catalogPlan(d.id,{type,key,scope,action:'disable'});assert.equal(plan.affected.length,size);assert.equal(plan.assets.length,size);
  const identities=plan.affected.map(i=>m.effectiveCatalogs(d)[i.type].find(x=>x.key===i.key));
  d=m.catalogApply(d.id,plan);for(const item of plan.affected)assert.equal(m.effectiveCatalogs(d)[item.type].find(i=>i.key===item.key).enabled,false);
  plan=m.catalogPlan(d.id,{type,key,scope,action:'enable'});d=m.catalogApply(d.id,plan);
  assert.deepEqual(plan.affected.map(i=>m.effectiveCatalogs(d)[i.type].find(x=>x.key===i.key)),identities);
 }
 const d=m.create({name:'Referencias',updateId:'referencias-v3'}),plan=m.catalogPlan(d.id,{type:'perks-survivor',key:'30_noMither',action:'delete'});
 assert(plan.references.length);assert(plan.assets.every(a=>a.action==='CONSERVAR ARCHIVO'));assert.throws(()=>m.catalogApply(d.id,plan),/Confirmá/);
});

test('reasignar propietario nuevo y animaciones aplicadas sin alterar progreso',()=>{
 let d=m.create({name:'Asignación nueva',updateId:'asignacion-v3'});d=m.save(d.id,{...d,items:[{type:'killers',key:'nuevo',name:'Nuevo'},{type:'perks-killer',key:'145_nuevo',name:'Perk nueva',ownerKey:'hag'}]});
 d=m.catalogOwner(d.id,{revision:d.revision,type:'perks-killer',key:'145_nuevo',ownerKey:'nuevo'});assert.equal(d.items[1].ownerKey,'nuevo');assert.equal((d.catalogChanges||[]).length,0);
 for(const [animation,transform] of [['top','translateY(-180px)'],['left','translateX(-2100px)'],['right','translateX(2100px)'],['fade','none']]){
  const el={dataset:{},style:{}},data={kind:'challenge_goal',state:{status:'active',visible:true,current:4},settings:{obsPresentation:{mode:'auto',interval:2,visible:1,animation,startedAt:10000}}};
  const identity=JSON.stringify(data);presentation.apply(el,data,11000);assert.equal(el.style.transform,transform);assert.equal(el.style.opacity,'0');presentation.apply(el,data,12500);assert.equal(el.style.transform,'none');assert.equal(el.style.opacity,'1');assert.equal(JSON.stringify(data),identity);
 }
});

test.after(()=>{assert(path.resolve(home).startsWith(path.join(root,'test-results')+path.sep));assert(/^manager(-v[23]-unit)?-\d+$/.test(path.basename(home)));fs.rmSync(home,{recursive:true,force:true});});
