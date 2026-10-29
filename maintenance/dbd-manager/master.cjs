'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),net=require('node:net');
const {atomic,copy,inside,hash,mkdir}=require('./core.cjs');
const deltaRuntime=require('../dbd-content/streamer-runtime/catalog-delta.cjs');
async function smoke(root,temp){
 const probe=net.createServer();await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(0,'127.0.0.1',resolve);});const port=probe.address().port;await new Promise(r=>probe.close(r));
 const child=cp.spawn(process.execPath,[path.join(root,'server.cjs')],{cwd:root,windowsHide:true,env:{...process.env,SANLEAN_OPEN_BROWSER:'0',SANLEAN_PORT:String(port),SANLEAN_DATA_DIR:temp},stdio:['ignore','pipe','pipe']});let output='',spawnError;child.on('error',e=>spawnError=e);child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
 try{for(let n=0;n<100;n++){if(spawnError)throw spawnError;if(child.exitCode!==null)throw Error(output||'No arrancó el MASTER.');const health=await fetch('http://127.0.0.1:'+port+'/health',{signal:AbortSignal.timeout(800)}).then(r=>r.json()).catch(()=>null);if(health){if(path.resolve(health.root)!==path.resolve(root))throw Error('Respondió otra instalación.');return {ok:true,at:new Date().toISOString(),root};}await new Promise(r=>setTimeout(r,100));}throw Error('El MASTER no respondió a la comprobación de arranque.');}finally{if(child.exitCode===null)await new Promise(r=>{child.once('exit',r);child.kill();setTimeout(r,5000).unref();});}
}
async function updateMaster(m,id,input){
 let d=m.read(id);if(input.confirmation!==d.updateId||input.manifestHash!==d.build?.manifestHash)throw Error('Revisá y confirmá el parche exacto antes de actualizar el MASTER.');const a=m.artifact(d);if(!d.patch||d.patch.manifestHash!==d.build.manifestHash)throw Error('Generá el parche de esta preparación.');
 const root=path.resolve(m.streamer),normal=path.resolve(m.home,'../SanLean Streamer Tools');if(root!==normal&&!m.testMode)throw Error('El destino no es la carpeta MASTER configurada.');if(fs.lstatSync(root).isSymbolicLink())throw Error('El MASTER debe ser una carpeta real.');
 if(fs.existsSync(path.join(root,'datos'))&&fs.readdirSync(path.join(root,'datos')).length)throw Error('El MASTER contiene datos personales. Conservá esa instalación y elegí una distribución limpia antes de actualizar.');
 const running=await fetch('http://127.0.0.1:4175/health',{signal:AbortSignal.timeout(700)}).then(r=>r.json()).catch(()=>null);if(running&&path.resolve(running.root)===root)throw Error('Cerrá Streamer Tools MASTER antes de aplicar el parche.');
 const program=require('./release-files.cjs')(m),delta=m.delta(d),rel='data/actualizaciones/'+delta.id+'.json',files=[...deltaRuntime.types.map(t=>'data/'+t+'.json'),'data/perk-conflicts.json','data/catalog-updates-state.json','data/catalog-update-journal.json',rel,...program.map(p=>p.file),...delta.assets.map(f=>f.path)];
 const backup=inside(m.data,'respaldos/master/'+delta.id+'-'+Date.now()),before={};mkdir(backup);
 for(const f of files){const target=inside(root,f);before[f]=fs.existsSync(target)?hash(fs.readFileSync(target)):null;if(before[f])copy(target,inside(backup,'antes/'+f));}
 atomic(path.join(backup,'respaldo.json'),{root,manifestHash:d.build.manifestHash,before});
 try{for(const asset of delta.assets){const target=inside(root,asset.path);if(fs.existsSync(target)&&hash(fs.readFileSync(target))!==asset.sha256)throw Error('El MASTER ya contiene otro asset en '+asset.path);copy(inside(a.root,asset.path),target);}
  for(const {file,source}of program)copy(source,inside(root,file));atomic(inside(root,rel),delta);deltaRuntime.applyPending(root);
  const temp=inside(m.data,'temp/master-check-'+delta.id);let result;try{result=await smoke(root,temp);}finally{if(path.dirname(temp)!==path.resolve(m.data,'temp')||!path.basename(temp).startsWith('master-check-'))throw Error('Carpeta temporal inválida.');fs.rmSync(temp,{recursive:true,force:true});}d.master={...result,backup,manifestHash:d.build.manifestHash};return m.write(d);
 }catch(error){for(const f of files){const target=inside(root,f);if(before[f])copy(inside(backup,'antes/'+f),target);else if(fs.existsSync(target))fs.unlinkSync(target);}throw Error('No se completó la actualización; se restauró el respaldo. '+error.message);}
}
module.exports={updateMaster,smoke};
