'use strict';
// DBD CONTENT RELEASE REGRESSION — all writes are inside a marked, disposable fixture.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const {Manager,TYPES,FOLDERS,OWNER,json,hash,atomic}=require('../maintenance/dbd-manager/core.cjs');
const delta=require('../maintenance/dbd-content/streamer-runtime/catalog-delta.cjs'),catalog=require('../js/dbd-catalog.js');
const repo=path.resolve(__dirname,'..'),parent=path.join(repo,'test-results/dbd-release/tests'),temp=path.join(parent,'run-'+crypto.randomUUID()),base=path.join(temp,'base'),home=path.join(temp,'manager'),runtime=path.join(temp,'streamer');
let m,serial=0;
const clone=v=>structuredClone(v),file=(rel,value)=>{const f=path.join(base,rel);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,value);};
async function bytes(format='png'){const n=++serial;return sharp({create:{width:32,height:40,channels:4,background:{r:n%255,g:Math.floor(n/255)%255,b:(n*23)%255,alpha:.5}}})[format]().toBuffer();}
const draft=name=>m.create({name:'FIXTURE '+name,updateId:'fixture-'+name.toLowerCase()+'-'+(++serial)});
const setState=(d,type,key,enabled)=>m.catalogApply(d.id,{...m.catalogPlan(d.id,{type,key,action:enabled?'enable':'disable'}),retainActivation:true});
const clean=root=>{assert(path.resolve(root).startsWith(path.resolve(parent)+path.sep));fs.rmSync(root,{recursive:true,force:true});};
test.before(async()=>{
 fs.mkdirSync(temp,{recursive:true});fs.writeFileSync(path.join(temp,'.sanlean-fixture.json'),'{"fixture":true}');
 const all={killers:[],survivors:[],'perks-killer':[],'perks-survivor':[]};
 for(const type of TYPES)for(let n=0;n<(OWNER[type]?8:2);n++){const key=OWNER[type]?n+'_base'+n:type+n,extension=n%2?'webp':'png',item={key,name:type+' base '+n,aliases:['Alias '+type+' '+n],enabled:true,image:FOLDERS[type]+'/'+key+'.'+extension,...(OWNER[type]?{ownerKey:OWNER[type]+(n%2)}:{})};all[type].push(item);file(item.image,await bytes(extension));}
 for(const [t,rows]of Object.entries({...all,'perk-conflicts':{killer:[],survivor:[]}}))file('data/'+t+'.json',JSON.stringify(rows));
 for(const rel of ['js/usuario-confirmations.js','css/usuario-confirmations.css'])file(rel,fs.readFileSync(path.join(repo,rel)));
 file('js/dbd-catalog.js',fs.readFileSync(path.join(repo,'js/dbd-catalog.js')));file('maintenance/dbd-content/ContentTools.ps1',fs.readFileSync(path.join(repo,'maintenance/dbd-content/ContentTools.ps1')));
 fs.cpSync(path.join(repo,'maintenance/dbd-content/streamer-runtime'),runtime,{recursive:true});fs.mkdirSync(path.join(runtime,'public/js'),{recursive:true});fs.copyFileSync(path.join(repo,'js/dbd-catalog.js'),path.join(runtime,'public/js/dbd-catalog.js'));
 m=new Manager({home,baseRoot:base,streamerRoot:runtime,baseCommit:'fixture-base'});fs.writeFileSync(path.join(m.data,'.sanlean-fixture.json'),'{"fixture":true}');m.configureV4({testMode:true,dataRoot:m.data});
});
test.after(()=>{for(const key of Object.keys(require.cache))if(key.startsWith(temp+path.sep))delete require.cache[key];clean(temp);});
test('technical fixtures never appear in the operational prepared-update list',()=>{
 const fixture=draft('hidden-fixture');assert.equal(fixture.fixture,true);assert(m.list().some(d=>d.id===fixture.id));const original=m.testMode;try{m.testMode=false;assert(!m.list().some(d=>d.id===fixture.id));}finally{m.testMode=original;}
});
async function chapter(name,k,s,pk,ps,extension='png',enabled=true){
 let d=draft(name),items=[];const push=(type,n)=>{const item={id:crypto.randomUUID(),type,name:name+' '+type+' '+n+" á ñ ü O’Connor & : - /",english:'English '+name+' '+type+' '+n,aliases:'Alias '+name+' '+n,ownerKey:OWNER[type]?(items.find(i=>i.type===OWNER[type])?.key||OWNER[type]+'0'):'',enabled};item.key=m.propose(type,item.english,items);items.push(item);};
 for(const [type,count]of [['killers',k],['survivors',s],['perks-killer',pk],['perks-survivor',ps]])for(let n=0;n<count;n++)push(type,n);
 d=m.save(d.id,{...d,items});for(const item of d.items)d=await m.upload(d.id,{revision:d.revision,itemId:item.id,filename:'fixture.'+extension,base64:(await bytes(extension)).toString('base64'),confirmFilename:true});
 return d;
}
test('A–H: unknown chapters, independent roles and arbitrary counts; PNG, WebP, staged then active',async()=>{
 for(const [name,k,s,pk,ps]of [['a',1,0,3,0],['b',0,1,0,3],['c',1,1,3,3],['d',0,2,0,6],['e',2,0,0,0],['f',0,0,2,2],['g',1,0,0,0],['h',2,3,0,0]]){
  let d=await chapter(name,k,s,pk,ps,name==='d'?'webp':'png',false);d=await m.prepare(d.id);assert(d.validation.ok,JSON.stringify(d.validation));
  const a=m.artifact(d);for(const [type,n]of [['killers',k],['survivors',s],['perks-killer',pk],['perks-survivor',ps]]){assert.equal(a.manifest.totals[type].addedDisabled,n);assert.equal(a.manifest.totals[type].after,m.catalogs[type].length);}
  d=m.save(d.id,{...d,items:d.items.map(i=>({...i,enabled:true}))});d=await m.prepare(d.id);assert(d.validation.ok);for(const type of TYPES)assert.equal(m.artifact(d).manifest.totals[type].after,m.catalogs[type].length+d.items.filter(i=>i.type===type).length);
  d=await m.patch(d.id);const zip=await require('jszip').loadAsync(fs.readFileSync(path.join(m.data,d.patch.file))),names=Object.keys(zip.files).filter(n=>!zip.files[n].dir),payload=JSON.parse(await zip.file(names.find(n=>n.startsWith('data/actualizaciones/'))).async('string'));
  assert.equal(payload.updateId,d.updateId);assert.equal(payload.assets.length,d.items.length);assert(!names.some(n=>/datos|AppData|preferencias|historial|sesion/i.test(n)));assert.deepEqual(payload.assets.map(a=>a.path).sort(),d.items.map(i=>m.imagePath(i)).sort());
  for(const asset of payload.assets)assert.equal(hash(await zip.file(asset.path).async('nodebuffer')),asset.sha256);
 }
});
test('prefix max, gaps, leading zeros, role separation, duplicates, stable normalized keys and update IDs',()=>{
 const raw=m.catalogs['perks-killer'];try{m.catalogs['perks-killer']=[{key:'001_one'},{key:'9_nine'},{key:'5_gap'}];assert.equal(m.propose('perks-killer','Futúra habilidad'), '10_futuraHabilidad');assert.equal(m.propose('perks-survivor','Futúra habilidad'),'8_futuraHabilidad');assert.equal(m.propose('perks-killer','Futúra habilidad',[{type:'perks-killer',key:'10_used'}]),'11_futuraHabilidad');}finally{m.catalogs['perks-killer']=raw;}
 for(const name of ['The New Killer','María López',"O'Connor",'Killer-01','123 The Ültimo']){const key=m.propose('killers',name);assert(/^[a-z0-9][a-z0-9_-]*$/.test(key));assert.equal(key,m.propose('killers',name));}
 const d=draft('ids');for(const updateId of ['',d.updateId,'UPPER','with spaces','../unsafe'])assert.throws(()=>m.create({name:'test',updateId}),/ID/);
 const all=clone(m.catalogs);all['perks-killer'].push({...all['perks-killer'][0],key:'000_new'});assert.throws(()=>delta.validate(all),/Prefijo/);
 for(const [type,owner]of [['perks-killer','survivors0'],['perks-survivor','killers0'],['perks-killer','missing']]){const a=clone(m.catalogs);a[type][0].ownerKey=owner;assert.throws(()=>delta.validate(a),/Propietario/);}
});
test('duplicates, wrong owners, missing/corrupt/empty/wrong-extension assets and stale revisions block preparation',async()=>{
 let d=await chapter('invalid',1,0,1,0);const original=clone(d),a=d.items[0];d.items[1].ownerKey='survivors0';d=m.save(d.id,d);assert(m.analyze(d).errors.some(e=>/propietario/.test(e.message)));
 d=m.save(d.id,{...d,items:original.items});const stale=clone(d);d=m.save(d.id,{...d,items:d.items.map(i=>i.id===a.id?{...i,name:m.catalogs.killers[0].name}:i)});assert(m.analyze(d).errors.some(e=>/duplicado/.test(e.message)));assert.throws(()=>m.save(d.id,stale),/otra ventana/);
 d=m.save(d.id,{...d,items:original.items});const asset=path.join(m.draftDir(d.id),d.items[0].asset.file),saved=fs.readFileSync(asset);
 for(const content of [Buffer.alloc(0),Buffer.from('corrupt fixture image')]){fs.writeFileSync(asset,content);const prepared=await m.prepare(d.id);assert(!prepared.validation.ok);assert(prepared.validation.errors.some(e=>/imagen|disco/.test(e.message)));}
 fs.writeFileSync(asset,saved);await assert.rejects(m.inspectImage(saved,'.webp'),/extensión/);await assert.rejects(m.upload(d.id,{revision:d.revision,itemId:a.id,filename:'../bad.png',base64:saved.toString('base64')}),/Nombre/);
 fs.unlinkSync(asset);assert(!(await m.prepare(d.id)).validation.ok);fs.writeFileSync(asset,saved);
 const ready=await m.prepare(d.id);assert(ready.validation.ok);fs.writeFileSync(path.join(m.artifact(ready).root,m.imagePath(ready.items[0])),Buffer.alloc(0));assert.throws(()=>m.artifact(ready),/Cambió/);
});
test('inactive owner with active perks is allowed explicitly; individual and package states remain independent',()=>{
 for(const [owner,perks]of [['killers','perks-killer'],['survivors','perks-survivor']]){
  let d=draft('independent-'+owner);d=setState(d,owner,owner+'0',false);let all=m.analyze(d).all;assert(all[perks].filter(i=>i.ownerKey===owner+'0').every(i=>i.enabled));assert.doesNotThrow(()=>delta.validate(all));
  d=setState(d,perks,'0_base0',false);all=m.analyze(d).all;assert.equal(catalog.filterEnabled(all[perks]).length,7);assert(all[perks].find(i=>i.key==='2_base2').enabled);
  d=m.catalogApply(d.id,m.catalogPlan(d.id,{type:owner,key:owner+'0',scope:'package',action:'disable'}));assert(m.analyze(d).all[perks].filter(i=>i.ownerKey===owner+'0').every(i=>i.enabled===false));
 }
});
test('metadata and image corrections retain key, show replacement, preserve unrelated changes and reject stale edits',async()=>{
 let d=draft('correction');const old=m.catalogs.killers[0],before=clone(old),replacement=await bytes('webp');
 d=await m.catalogMetadata(d.id,{revision:d.revision,type:'killers',key:old.key,name:"María O'Connor — Áéíóú ñ ü & : - /",aliases:"English corrected\nAlias español",filename:'nueva.webp',base64:replacement.toString('base64')});
 assert.equal(d.items.length,0);assert.equal(m.effectiveCatalogs(d).killers[0].key,old.key);await assert.rejects(m.catalogMetadata(d.id,{revision:d.revision,type:'killers',key:old.key,newKey:'renamed'}),/migración/);
 d=await m.prepare(d.id);assert(d.validation.ok,JSON.stringify(d.validation));const a=m.artifact(d),asset=a.manifest.files.find(f=>f.kind==='replacement');assert(asset);assert.equal(asset.beforePath,old.image);assert.equal(hash(fs.readFileSync(path.join(base,old.image))),asset.beforeSha256);
 const ops=m.delta(d),newBase=clone(m.catalogs);newBase.killers[1].enabled=false;const merged=delta.merge(newBase,ops);assert.equal(merged.killers[1].enabled,false);assert.equal(merged.killers[0].key,old.key);assert(catalog.matches(merged.killers[0],'maria oconnor'));assert(catalog.matches(merged.killers[0],'English corrected'));
 newBase.killers[0].name='Changed by another update';assert.throws(()=>delta.merge(newBase,ops),/otra actualización/);assert.deepEqual(m.catalogs.killers[0],before);
 d=await m.patch(d.id);const zip=await require('jszip').loadAsync(fs.readFileSync(path.join(m.data,d.patch.file)));assert.equal(hash(await zip.file(asset.path).async('nodebuffer')),hash(replacement));assert(!zip.file(asset.beforePath));
});
test('conflicts validate ownership keys, duplicate keys/groups and impossible builds; new conflict included in delta',async()=>{
 let d=await chapter('conflict',0,0,1,0);d=m.setConflicts(d.id,{revision:d.revision,conflicts:{killer:[[d.items[0].key,'0_base0']]}});d=await m.prepare(d.id);assert(d.validation.ok);assert(m.delta(d).conflicts.killer[0].includes(d.items[0].key));
 for(const group of [['missing','0_base0'],['0_base0','0_base0']])assert.throws(()=>delta.validateConflicts(m.catalogs,{killer:[group],survivor:[]}),/inválido/);
 assert.throws(()=>delta.validateConflicts(m.catalogs,{killer:[['0_base0','1_base1'],['1_base1','0_base0']],survivor:[]}),/duplicado/);
 assert.throws(()=>delta.validateConflicts(m.catalogs,{killer:[m.catalogs['perks-killer'].map(i=>i.key)],survivor:[]}),/NO SE PUEDE GENERAR UNA BUILD VÁLIDA/);
});
test('old draft A merges only its delta after update B; known out-of-order patches fail without rollback',async()=>{
 let a=await chapter('drafta',1,0,0,0);a=await m.prepare(a.id);const bytesBefore=fs.readFileSync(path.join(m.draftDir(a.id),'actualizacion.json')),b=clone(m.catalogs);b.killers[1].enabled=false;assert.equal(delta.merge(b,m.delta(a)).killers[1].enabled,false);assert.deepEqual(fs.readFileSync(path.join(m.draftDir(a.id),'actualizacion.json')),bytesBefore);
 const target=path.join(temp,'ordered');fs.mkdirSync(path.join(target,'data/actualizaciones'),{recursive:true});for(const [type,value]of Object.entries({...m.catalogs,'perk-conflicts':{killer:[],survivor:[]}}))atomic(path.join(target,'data',type+'.json'),value);
 const queue=(id,at,value)=>atomic(path.join(target,'data/actualizaciones',id+'.json'),{format:'sanlean-dbd-delta-v1',id,createdAt:at,changes:[{type:'killers',key:'killers0',action:'enabled',value}],assets:[]});
 queue('newer','2026-10-29T12:00:00.000Z',false);assert.deepEqual(delta.applyPending(target),['newer']);queue('older','2026-10-28T12:00:00.000Z',true);assert.throws(()=>delta.applyPending(target),/PARCHE ANTIGUO/);assert.equal(json(path.join(target,'data/killers.json'))[0].enabled,false);
});
test('44 → 45 → 44 → 41 and 54 → 55 → 57; hidden progress survives by key and new identities are pending',()=>{
 const factory=require(path.join(runtime,'challenge-model.cjs'));
 for(const [start,sequence]of [[44,[45,44,41]],[54,[55,57]]]){
  let roster=Array.from({length:start},(_,n)=>({key:'fixture'+n,name:'Fixture '+n,image:'fixture.png',enabled:true})),model=factory({catalog:roster,format:'regression',title:'FIXTURE'}),state=model.fresh();state.entries.fixture0='completed';state.entries.fixture1='failed';
  for(const total of sequence){while(roster.length<total)roster.push({key:'fixture'+roster.length,name:'Added',image:'fixture.png',enabled:true});roster=roster.map((r,n)=>({...r,enabled:n>=roster.length-total}));const next=factory({catalog:roster,format:'regression',title:'FIXTURE'});state=next.validate(model.serialize(state));assert.equal(next.keys.length,total);assert.equal(state.entries.fixture0,'completed');assert.equal(state.entries.fixture1,'failed');for(let n=start;n<roster.length;n++)assert.equal(state.entries['fixture'+n],'pending');model=next;}
  roster=roster.map(r=>({...r,enabled:true}));const restored=factory({catalog:roster,format:'regression',title:'FIXTURE'}).validate(model.serialize(state));assert.equal(restored.entries.fixture0,'completed');
 }
});
test('MASTER patch retains structural files, sounds and seven loaders; smoke test data stays outside distribution',async()=>{
 fs.cpSync(path.join(base,'data'),path.join(runtime,'data'),{recursive:true});for(const folder of Object.values(FOLDERS))fs.cpSync(path.join(base,folder),path.join(runtime,folder),{recursive:true});
 const sentinels=['public/audio/test.wav',...['meta','win-streak','all-killer','all-survivor','killer-wheel','perks-killer','perks-survivor'].map(n=>'OBS/'+n+'.html')];for(const f of sentinels){fs.mkdirSync(path.dirname(path.join(runtime,f)),{recursive:true});fs.writeFileSync(path.join(runtime,f),'fixture-structure '+f);}
 const before=Object.fromEntries(sentinels.map(f=>[f,hash(fs.readFileSync(path.join(runtime,f)))]));let d=draft('master');d=setState(d,'killers','killers0',false);d=await m.prepare(d.id);assert(d.validation.ok);d=await m.patch(d.id);d=await require('../maintenance/dbd-manager/master.cjs').updateMaster(m,d.id,{confirmation:d.updateId,manifestHash:d.build.manifestHash});assert(d.master.ok);assert(!fs.existsSync(path.join(runtime,'datos')));for(const [f,digest]of Object.entries(before))assert.equal(hash(fs.readFileSync(path.join(runtime,f))),digest);assert.equal(json(path.join(runtime,'data/killers.json'))[0].enabled,false);
});

