'use strict';
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
// A durable redo journal makes the three separate domains one transaction.
module.exports=function diskStore(root){
 fs.mkdirSync(root,{recursive:true});const names=['preferencias','progreso','historial-win-streak'],journal=path.join(root,'pendiente.json'),backup=path.join(root,'respaldo.json');
 function atomic(file,body){const tmp=file+'.tmp',fd=fs.openSync(tmp,'w');try{fs.writeFileSync(fd,JSON.stringify(body,null,2));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(tmp,file);}
 function parse(file){return JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));}
 function validBundle(b){if(!b||b.format!=='sanlean-streamer-domains'||b.version!==1||typeof b.transaction!=='string'||names.some(k=>!Object.hasOwn(b,k)))throw Error('Archivos locales inválidos.');return b;}
 function materialize(b){validBundle(b);for(const name of names)atomic(path.join(root,name+'.json'),{format:b.format,version:1,transaction:b.transaction,data:b[name]});}
 if(fs.existsSync(journal)){const pending=validBundle(parse(journal));materialize(pending);fs.unlinkSync(journal);}
 let current=null;
 function read(){
  const exist=names.map(n=>fs.existsSync(path.join(root,n+'.json')));if(!exist.some(Boolean)){if(fs.existsSync(backup))throw Error('Faltan los archivos de datos. Conservá datos y recuperá respaldo.json.');return null;}
  try{if(!exist.every(Boolean))throw Error('Falta un archivo de datos.');const rows=names.map(n=>parse(path.join(root,n+'.json')));if(rows.some(r=>r.format!=='sanlean-streamer-domains'||r.version!==1||r.transaction!==rows[0].transaction))throw Error('Datos incompletos.');current=validBundle({format:rows[0].format,version:1,transaction:rows[0].transaction,...Object.fromEntries(names.map((n,i)=>[n,rows[i].data]))});return current;}
  catch(e){if(!fs.existsSync(backup))throw Error('No se pudieron leer los datos. No se borró ningún archivo. '+e.message);current=validBundle(parse(backup));for(const n of names){const p=path.join(root,n+'.json');if(fs.existsSync(p))fs.copyFileSync(p,p+'.dañado-'+Date.now());}materialize(current);return {...current,recovered:true};}
 }
 return {read,write(domains){const next={format:'sanlean-streamer-domains',version:1,transaction:randomUUID(),...domains};validBundle(next);if(current)atomic(backup,current);atomic(journal,next);materialize(next);fs.unlinkSync(journal);current=next;}};
};
