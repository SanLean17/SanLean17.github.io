const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {root,names,fixture,copy}=require('./dbd-content-support.cjs');
test('local catalog upgrades preserve challenges, settings, donor identities, used entries, history and isolated data directory',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sanlean-upgrade-'));
 const reload=()=>{for(const key of Object.keys(require.cache))if(key.startsWith(dir+path.sep))delete require.cache[key];return require(path.join(dir,'application.cjs'));};
 try{
  fs.cpSync(path.join(root,'maintenance/dbd-content/streamer-runtime'),dir,{recursive:true});copy(path.join(root,'js/dbd-catalog.js'),path.join(dir,'public/js/dbd-catalog.js'));
  // Initial architecture with current content and an existing user's version-2 data.
  fs.mkdirSync(path.join(dir,'data'));for(const name of [...names,'perk-conflicts'])copy(path.join(root,'data',name+'.json'),path.join(dir,'data',name+'.json'));
  let factory=reload(),app=factory(path.join(dir,'datos'));
  const original=Object.fromEntries(['all-killer','all-survivor'].map(k=>[k,{total:factory.models.challenges[k].keys.length,first:factory.models.challenges[k].keys[0]}]));
  for(const key of ['all-killer','all-survivor']){app.action('challenges',key,{type:'start'});const first=factory.models.challenges[key].keys[0];app.action('challenges',key,{type:'correct',key:first,result:'completed'});app.action('challenges',key,{type:'preferences',values:{selectionSoundVolume:37,selectionSoundType:'dry'}});app.action('challenges',key,{type:'pause'});}
  app.action('tools','',{tool:'killer-wheel',type:'preferences',values:{soundVolume:31,soundType:'deep'}});
  app.action('tools','',{tool:'killer-wheel',type:'mode',value:'remove'});
  app.action('tools','',{tool:'killer-wheel',type:'add',key:original['all-killer'].first,name:'DONACIÓN DE PRUEBA'});
  app.action('tools','',{tool:'killer-wheel',type:'generate'});app.action('tools','',{tool:'killer-wheel',type:'spin'},1);
  // Settle through the actual model and persist through its public application checkpoint.
  const spin=app.get('tools').tools['killer-wheel'].state;assert(spin.targets.length);app.tick({scope:'tools',key:'killer-wheel'});
  app.action('counters','win-streak',{type:'start'});app.action('counters','win-streak',{type:'current',value:7});app.action('counters','win-streak',{type:'finish',confirm:'FINALIZAR WIN STREAK'});app.checkpoint();
  const saved=structuredClone(app.get('tools')),history=structuredClone(app.history()),prefs=JSON.parse(fs.readFileSync(path.join(dir,'datos/preferencias.json'))).data;
  // Future staged chapter: no new candidates or totals.
  fixture(dir,false);factory=reload();app=factory(path.join(dir,'datos'));
  for(const key of Object.keys(original))assert.equal(factory.models.challenges[key].catalog.length,original[key].total);
  for(const [tool,delta] of [['killer-wheel',1],['perks-killer',3],['perks-survivor',3]]){assert(!factory.models.wheel.pool(tool,app.get('tools').tools[tool]).some(i=>i.key.includes('fixture')));assert.equal(app.get('tools').tools[tool].entries.length,saved.tools[tool].entries.length+delta);}
  // Flip only enabled in JSON and restart. No code, loader or stored-data edit.
  fixture(dir,true);factory=reload();app=factory(path.join(dir,'datos'));
  for(const [key,added] of [['all-killer','fixturekiller'],['all-survivor','fixturesurvivor']]){const m=factory.models.challenges[key],s=app.get('challenges',key);assert.equal(m.catalog.length,original[key].total+1);assert.equal(s.entries[original[key].first],'completed');assert.equal(s.entries[added],'pending');assert.equal(s.status,'paused');assert.equal(s.selectionSoundVolume,37);assert.equal(s.selectionSoundType,'dry');}
  for(const tool of Object.keys(saved.tools)){const current=app.get('tools').tools[tool];for(const ticket of saved.tools[tool].entries)assert.deepEqual(current.entries.find(e=>e.entryId===ticket.entryId),ticket);assert.deepEqual(current.usedKillerEntries,saved.tools[tool].usedKillerEntries);assert.deepEqual(current.state,saved.tools[tool].state);assert(factory.models.wheel.pool(tool,current).some(i=>i.key.includes('fixture')));}
  assert.deepEqual(app.history(),history);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'datos/preferencias.json'))).data,prefs);
  assert.deepEqual(fs.readdirSync(dir).filter(n=>n==='datos'),['datos']);
  // Hiding and showing a previously completed character preserves its keyed state.
  const kfile=path.join(dir,'data/killers.json'),items=JSON.parse(fs.readFileSync(kfile)),hidden=items.find(i=>i.key===original['all-killer'].first),tickets=app.get('tools').tools['killer-wheel'].entries.filter(i=>i.key===hidden.key);hidden.enabled=false;fs.writeFileSync(kfile,JSON.stringify(items));factory=reload();app=factory(path.join(dir,'datos'));assert.equal(app.get('challenges','all-killer').entries[hidden.key],'completed');assert(!factory.models.wheel.pool('killer-wheel',app.get('tools').tools['killer-wheel']).some(i=>i.key===hidden.key));assert.throws(()=>app.action('tools','',{tool:'killer-wheel',type:'add',key:hidden.key,name:'NO ADMITIDA'}),/inválida/);assert.deepEqual(app.get('tools').tools['killer-wheel'].entries.filter(i=>i.key===hidden.key),tickets);
  hidden.enabled=true;fs.writeFileSync(kfile,JSON.stringify(items));factory=reload();app=factory(path.join(dir,'datos'));assert.equal(app.get('challenges','all-killer').entries[hidden.key],'completed');assert.deepEqual(app.get('tools').tools['killer-wheel'].entries.filter(i=>i.key===hidden.key),tickets);
 }finally{for(const key of Object.keys(require.cache))if(key.startsWith(dir+path.sep))delete require.cache[key];fs.rmSync(dir,{recursive:true,force:true});}
});
