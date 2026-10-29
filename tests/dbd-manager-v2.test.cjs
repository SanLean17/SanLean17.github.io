'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {Manager,TYPES,hash,json}=require('../maintenance/dbd-manager/core.cjs');
const {Auditor,measure}=require('../maintenance/dbd-manager/audit.cjs');
const root=path.resolve(__dirname,'..'),home=path.join(root,'test-results/manager-v2-unit-'+Date.now());
const m=new Manager({home,baseRoot:root,baseCommit:'569ace03228d36b2a3eb23605884cb03398e9753'});
const before=Object.fromEntries(TYPES.map(t=>[t,hash(fs.readFileSync(path.join(root,'data',t+'.json')))]));
let serial=0;
const create=()=>m.create({name:'Administración '+(++serial),updateId:'admin-'+serial});
function apply(d,type,key,action,scope='item') {const plan=m.catalogPlan(d.id,{type,key,action,scope});return m.catalogApply(d.id,{...plan,confirmation:action==='delete'?'ELIMINAR':''});}

test('migración v1 conserva nombres, aliases y datos; invalida sólo revisión antigua y cachés ausentes',()=>{
 let d=create();delete d.schemaVersion;d.checks={'web-killers':true};d.state='LISTO PARA PUBLICAR';d.build={id:'preparacion-ausente'};d.validation={ok:true};d.items=[{id:require('node:crypto').randomUUID(),type:'killers',key:'legacytest',name:'Prueba heredada',english:'',realName:'Nombre real anterior',otherNames:'Nombre alternativo',aliases:'Alias anterior',ownerKey:'',enabled:true}];
 const file=path.join(m.draftDir(d.id),'actualizacion.json');fs.writeFileSync(file,JSON.stringify(d));const raw=fs.readFileSync(file);
 const read=m.read(d.id);assert.equal(read.state,'BORRADOR');assert.deepEqual(read.items,d.items);assert.deepEqual(read.checks,{});assert.equal(hash(fs.readFileSync(file)),hash(raw),'leer no sobrescribe datos v1');
 const saved=m.save(d.id,{...read,items:read.items.map(i=>({...i,realName:'',otherNames:'',aliases:'Nombre real anterior\nNombre alternativo\nAlias anterior'}))});assert.deepEqual(saved.items[0].legacyNames,{realName:'Nombre real anterior',otherNames:'Nombre alternativo'});assert(m.search(d.id,'Nombre alternativo')[0].matches);
});

test('nombre descargado con espacios, paréntesis y acentos conserva los bytes originales',async()=>{
 let d=create();d=m.save(d.id,{...d,items:[{type:'killers',name:'Retrato local',key:'retratolocal',english:'',realName:'',otherNames:'',aliases:'',ownerKey:''}]});
 const bytes=await require('sharp')({create:{width:32,height:48,channels:4,background:{r:31,g:48,b:111,alpha:.7}}}).png().toBuffer();
 d=await m.upload(d.id,{revision:d.revision,itemId:d.items[0].id,filename:'Imágen descargada (1).png',base64:bytes.toString('base64'),confirmFilename:true});assert.equal(d.items[0].asset.filename,'retratolocal.png');assert.equal(hash(fs.readFileSync(path.join(m.draftDir(d.id),d.items[0].asset.file))),hash(bytes));
});

test('desactivar/reactivar conserva exactamente identidad, imagen, aliases y owner; prepara sin altas',async()=>{
 let d=create();const original=m.catalogs.killers.find(i=>i.enabled!==false),key=original.key;
 d=apply(d,'killers',key,'disable');const entry=m.effectiveCatalogs(d).killers.find(i=>i.key===key);
 assert.deepEqual(entry,{...original,enabled:false});d=await m.prepare(d.id);assert(d.validation.ok,JSON.stringify(d.validation));
 const a=m.artifact(d),changed=TYPES.map(t=>'data/'+t+'.json').filter(f=>hash(fs.readFileSync(path.join(root,f)))!==hash(fs.readFileSync(path.join(a.root,f))));assert(changed.includes('data/killers.json'));assert.deepEqual(a.manifest.files.map(f=>f.path).sort(),changed.sort());assert.equal(a.manifest.totals.killers.after,a.manifest.totals.killers.before-1);
 d=await m.patch(d.id);const JSZip=require('jszip'),zip=await JSZip.loadAsync(fs.readFileSync(path.join(m.data,d.patch.file)));assert.equal(Object.values(zip.files).filter(f=>!f.dir).length,6);assert(!Object.keys(zip.files).some(f=>/datos|AppData/i.test(f)));
 d=apply(d,'killers',key,'enable');assert.equal(d.catalogChanges.length,0);assert.deepEqual(m.effectiveCatalogs(d).killers.find(i=>i.key===key),original);
});

test('acciones por paquete: scope explícito, lista exacta, sin eliminación automática de perks',async()=>{
 let d=create();const type='killers',key=m.catalogs.killers.find(i=>i.enabled!==false&&m.catalogs['perks-killer'].some(p=>p.ownerKey===i.key)).key,perks=m.catalogs['perks-killer'].filter(i=>i.ownerKey===key);
 for(const perk of perks)d=m.catalogOwner(d.id,{revision:d.revision,type:'perks-killer',key:perk.key,ownerKey:key});
 assert(perks.length);const plan=m.catalogPlan(d.id,{type,key,action:'disable',scope:'package'});assert.equal(plan.affected.length,perks.length+1);
 assert.throws(()=>m.catalogApply(d.id,{...plan,affected:plan.affected.slice(1)}),/lista/);
 d=m.catalogApply(d.id,plan);assert(m.effectiveCatalogs(d)['perks-killer'].filter(i=>i.ownerKey===key).every(i=>i.enabled===false));
 d=apply(d,type,key,'enable','package');assert.equal(d.catalogChanges.length,perks.length);assert(d.catalogChanges.every(c=>c.action==='owner'));
 assert.throws(()=>m.catalogPlan(d.id,{type,key,action:'delete',scope:'item'}),/perks/);
 const deletion=m.catalogPlan(d.id,{type,key,action:'delete',scope:'package'});assert.throws(()=>m.catalogApply(d.id,deletion),/Confirmá/);
 d=m.catalogApply(d.id,{...deletion,confirmation:'ELIMINAR'});assert(!m.effectiveCatalogs(d).killers.some(i=>i.key===key));assert(!m.effectiveCatalogs(d)['perks-killer'].some(i=>i.ownerKey===key));
 d=await m.prepare(d.id);assert(d.validation.ok,JSON.stringify(d.validation));assert(fs.existsSync(path.join(m.artifact(d).root,m.catalogs.killers.find(i=>i.key===key).image)));
});

test('eliminar una perk actualiza referencias de incompatibilidad y conserva el asset',async()=>{
 let d=create();d=apply(d,'perks-survivor','30_noMither','delete');d=await m.prepare(d.id);assert(d.validation.ok,JSON.stringify(d.validation));const a=m.artifact(d);
 assert(a.manifest.files.some(f=>f.path==='data/perk-conflicts.json'));assert(!json(path.join(a.root,'data/perk-conflicts.json')).survivor.flat().includes('30_noMither'));
 assert(fs.existsSync(path.join(a.root,'survivor/30_noMither.png')));
});

test('revisión visual por aspecto, invalidación y rechazo de valores desconocidos',async()=>{
 let d=apply(create(),'killers','plague','disable');d=await m.prepare(d.id);d.preview={manifestHash:d.build.manifestHash};m.write(d);
 for(const aspect of ['image','name','desktop','mobile'])d=m.check(d.id,{revision:d.revision,key:'web-killers',aspect,value:true});assert.equal(d.checks['web-killers'],false);
 d=m.check(d.id,{revision:d.revision,key:'web-killers',aspect:'animation',value:true});assert(d.checks['web-killers']);assert.throws(()=>m.check(d.id,{revision:d.revision,key:'web-killers',aspect:'fake',value:true}),/no válida/);
 d=apply(d,'survivors','dwightfairfield','disable');assert.deepEqual(d.visualChecks,{});
});

test('auditor: sólo ubicaciones aprobadas, nada seleccionado, protección, confirmación y cambios de disco',async()=>{
 const dir=path.join(home,'audit-fixtures'),current=path.join(dir,'manager-current'),old=path.join(dir,'manager-old'),outside=path.join(dir,'personal');
 for(const p of [current,old,outside]){fs.mkdirSync(p,{recursive:true});fs.writeFileSync(path.join(p,'data.txt'),'guardar');}
 const moved=[],auditor=new Auditor(current,{roots:[{path:dir,pattern:/^manager-/,type:'EXPORT'}],protectedPaths:[current],recycle:async p=>moved.push(p)});
 const scan=auditor.scan();assert.equal(scan.entries.length,2);assert(scan.entries.every(r=>r.selected===false));assert(!scan.entries.find(r=>r.path===current).selectable);assert.equal(moved.length,0);
 assert.throws(()=>auditor.plan([]),/Seleccioná/);assert.throws(()=>auditor.plan([scan.entries.find(r=>r.path===current).id]),/protegida/);
 const selected=scan.entries.find(r=>r.path===old);let plan=auditor.plan([selected.id]);await assert.rejects(auditor.execute({token:plan.token,confirmation:'sí'}),/confirmá/);assert.equal(moved.length,0);
 fs.appendFileSync(path.join(old,'data.txt'),' cambia');await assert.rejects(auditor.execute({token:plan.token,confirmation:'MOVER A LA PAPELERA'}),/cambió/);assert.equal(moved.length,0);
 plan=auditor.plan([auditor.scan().entries.find(r=>r.path===old).id]);await auditor.execute({token:plan.token,confirmation:'MOVER A LA PAPELERA'});assert.deepEqual(moved,[old]);assert.equal(measure(old).files,1);assert(fs.existsSync(path.join(current,'data.txt')));assert(fs.existsSync(path.join(outside,'data.txt')));
 if(process.platform==='win32'){const junction=path.join(old,'link');fs.symlinkSync(outside,junction,'junction');assert(!auditor.scan().entries.find(r=>r.path===old).selectable);assert(fs.lstatSync(junction).isSymbolicLink());fs.unlinkSync(junction);}
});

test('catálogos originales y separación de producción permanecen intactos',()=>{
 for(const t of TYPES)assert.equal(hash(fs.readFileSync(path.join(root,'data',t+'.json'))),before[t]);
 const ui=fs.readFileSync(path.join(root,'maintenance/dbd-manager/ui/app.js'),'utf8');assert(!/(?:window\.)?alert\s*\(/.test(ui));assert(!/(?<!function )confirm\(['"]/.test(ui));
 const html=fs.readFileSync(path.join(root,'maintenance/dbd-manager/ui/index.html'),'utf8');for(const name of ['usuario-design-system.css','usuario-canonical-selects.js','usuario-confirmations.js','usuario-shell-v2.css'])assert(html.includes(name));
});

test('Win Streak activa sobrevive a desactivación, reactivación y eliminación del killer sin perder historial',()=>{
 const dir=path.join(home,'streamer-progress');fs.cpSync(path.join(root,'maintenance/dbd-content/streamer-runtime'),dir,{recursive:true});fs.mkdirSync(path.join(dir,'public/js'),{recursive:true});fs.copyFileSync(path.join(root,'js/dbd-catalog.js'),path.join(dir,'public/js/dbd-catalog.js'));fs.mkdirSync(path.join(dir,'data'));
 for(const type of [...TYPES,'perk-conflicts'])fs.copyFileSync(path.join(root,'data',type+'.json'),path.join(dir,'data',type+'.json'));
 const load=()=>{for(const key of Object.keys(require.cache))if(key.startsWith(dir+path.sep))delete require.cache[key];return require(path.join(dir,'application.cjs'))(path.join(dir,'datos'));};
 const tracked=json(path.join(dir,'data/killers.json')).find(i=>i.enabled!==false).key;let app=load();app.action('tools','',{type:'add',tool:'killer-wheel',key:tracked,name:'DONACIÓN CONSERVADA'});app.action('tools','',{type:'generate',tool:'killer-wheel'});app.action('challenges','all-killer',{type:'start'});app.action('challenges','all-killer',{type:'correct',key:tracked,result:'completed'});app.action('challenges','all-killer',{type:'pause'});app.action('counters','win-streak',{type:'preferences',values:{role:'killer',killerKey:tracked}});app.action('counters','win-streak',{type:'start'});app.action('counters','win-streak',{type:'current',value:7});app.action('counters','win-streak',{type:'pause'});app.checkpoint();
 const file=path.join(dir,'data/killers.json'),items=json(file),killer=items.find(i=>i.key===tracked);killer.enabled=false;fs.writeFileSync(file,JSON.stringify(items));app=load();assert.equal(app.get('counters','win-streak').current,7);assert.equal(app.get('counters','win-streak').sessionKiller,tracked);assert.equal(app.get('counters','win-streak').status,'paused');
 killer.enabled=true;fs.writeFileSync(file,JSON.stringify(items));app=load();assert.equal(app.get('counters','win-streak').current,7);app.action('counters','win-streak',{type:'finish',confirm:'FINALIZAR WIN STREAK'});assert.equal(app.history()[0].current,7);assert.equal(app.history()[0].killer.key,tracked);
 app.action('counters','win-streak',{type:'start'});app.action('counters','win-streak',{type:'current',value:9});app.checkpoint();fs.writeFileSync(file,JSON.stringify(items.filter(i=>i.key!==tracked)));app=load();assert.equal(app.get('counters','win-streak').current,9);assert.equal(app.get('challenges','all-killer').entries[tracked],'completed');assert(app.get('tools').tools['killer-wheel'].entries.some(e=>e.key===tracked&&e.donor==='DONACIÓN CONSERVADA'));const models=require(path.join(dir,'application.cjs')).models;assert(!models.wheel.pool('killer-wheel',app.get('tools').tools['killer-wheel']).some(e=>e.key===tracked));assert(!models.challenges['all-killer'].keys.includes(tracked));app.action('counters','win-streak',{type:'finish',confirm:'FINALIZAR WIN STREAK'});assert.equal(app.history()[0].killer.name,killer.name);assert.deepEqual(app.history().map(h=>h.current),[9,7]);assert.throws(()=>app.action('counters','win-streak',{type:'start'}),/activo/);
 const factory=require(path.join(dir,'challenge-model.cjs'));
 for(const catalog of [[],items.map(i=>({...i,enabled:false}))]){const model=factory({catalog,format:'zero-catalog',title:'PRUEBA',singular:'killer',plural:'killers'});assert.doesNotThrow(()=>model.validate(model.fresh()));assert.equal(model.keys.length,0);}
});

test.after(()=>{assert(path.resolve(home).startsWith(path.join(root,'test-results')+path.sep));assert(/^manager(-v[23]-unit)?-\d+$/.test(path.basename(home)));fs.rmSync(home,{recursive:true,force:true});});
