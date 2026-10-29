'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),JSZip=require('jszip');
const root=path.resolve(__dirname,'../..'),runtime=path.join(__dirname,'streamer-runtime');
const BASE_SHA='fcee926aa9acc933b82366a54efd76315f2b69f79e2aaa801f0843c69e00c772';
const LOADERS_SHA='262e50767ac33563f40e526b00e36602753f0a8711bad033dec7c2c5ff519311';
const FILES=['spin-sequence.cjs','wheel-model.cjs','public/js/roulette-entries.js','public/js/tools.js'];
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const normal=bytes=>bytes.toString('utf8').replace(/\r\n/g,'\n').replace(/^\uFEFF/,'');
async function readBase(archive,loaderPatch){
 const original=fs.readFileSync(archive),patch=fs.readFileSync(loaderPatch);
 assert.equal(sha(original),BASE_SHA,'Use the exact delivered 1.2.0 ZIP');assert.equal(sha(patch),LOADERS_SHA,'Use the exact delivered OBS patch');
 const zip=await JSZip.loadAsync(original),prefix='SanLean-Streamer-Tools-Local/',files=new Map();
 for(const [name,item] of Object.entries(zip.files)){if(item.dir)continue;assert(name.startsWith(prefix));const rel=name.slice(prefix.length);assert(rel&&!rel.includes('..')&&!rel.includes('\\'));files.set(rel,await item.async('nodebuffer'));}
 const manifest=JSON.parse(files.get('SOURCE_MANIFEST.json'));assert.equal(manifest.version,'1.2.0');
 const initial=new Map(files),loaders=await JSZip.loadAsync(patch);
 for(const [name,item] of Object.entries(loaders.files)){if(item.dir)continue;assert(!name.includes('..')&&!name.includes('\\'));files.set(name,await item.async('nodebuffer'));}
 return {files,initial,manifest};
}
function replaceOnce(text,from,to){assert.equal(text.split(from).length,2,'Ambiguous hotfix anchor: '+from.slice(0,80));return text.replace(from,to);}
function payload(base){
 const result=new Map();
 for(const file of ['spin-sequence.cjs','public/js/roulette-entries.js'])result.set(file,fs.readFileSync(path.join(runtime,file)));
 let model=normal(base.files.get('wheel-model.cjs')),current=normal(fs.readFileSync(path.join(runtime,'wheel-model.cjs')));
 model=replaceOnce(model,"const {makeSequence,validKillerSequence}=require('./spin-sequence.cjs');","const {makeSequence,validKillerSequence,SEQUENCE_VERSION}=require('./spin-sequence.cjs');");
 const start='\n    const targets=s.targets?.length?s.targets:s.items,visualPool=s.spinPool||pool(key,t);',newStart='\n    const targets=s.targets?.length?s.targets:s.items;let visualPool=',end='\n    out.tools[key]=t;';
 const oldAt=model.indexOf(start),oldEnd=model.indexOf(end,oldAt),newAt=current.indexOf(newStart),newEnd=current.indexOf(end,newAt);
 assert(oldAt>0&&oldEnd>oldAt&&newAt>0&&newEnd>newAt);
 // Port only spin validation and legacy visual repair. Keep the delivered
 // public/data loader, original catalogs, selection, preferences and storage.
 const validation=current.slice(newAt,newEnd).replaceAll('allCatalogs[key]','catalogs[key]');
 model=model.slice(0,oldAt)+validation+model.slice(oldEnd);assert(!model.includes('catalog-store.cjs'));assert(model.includes("'public/data'"));
 result.set('wheel-model.cjs',Buffer.from(model,'utf8'));
 let control=normal(base.files.get('public/js/tools.js')),currentControl=normal(fs.readFileSync(path.join(runtime,'public/js/tools.js')));
 const oldLine=control.split('\n').find(l=>l.includes('const boxes=remove?')),newLine=currentControl.split('\n').find(l=>l.includes('const boxes=remove?'));assert(oldLine&&newLine);
 control=replaceOnce(control,oldLine,newLine);assert(!control.includes('SanLeanDBDCatalog'));result.set('public/js/tools.js',Buffer.from(control,'utf8'));
 for(const f of FILES)assert.notEqual(sha(result.get(f)),sha(base.files.get(f)),f+' must have an actual functional diff');
 return result;
}
const README=[
'SANLEAN STREAMER TOOLS',
'HOTFIX — RULETA DE KILLERS / ENTRADAS REALES',
'',
'INSTALACIÓN',
'',
'1. Cerrá SanLean Streamer Tools.',
'2. No hace falta cerrar OBS.',
'3. Hacé una copia de seguridad de la carpeta del programa si querés conservar un respaldo.',
'4. Extraé el contenido de este ZIP directamente sobre la carpeta donde está instalado SanLean Streamer Tools.',
'5. Cuando Windows pregunte, elegí REEMPLAZAR LOS ARCHIVOS EN EL DESTINO.',
'6. Volvé a abrir SanLean Streamer Tools.',
'',
'NO:',
'- borres datos;',
'- vuelvas a configurar OBS;',
'- cambies las fuentes de navegador;',
'- ejecutes nuevamente el configurador de loaders.',
'',
'CORRECCIÓN:',
'',
'Las entradas adicionales y donaciones de la Ruleta de Killers ahora se representan como tickets reales e independientes tanto en la probabilidad como en el recorrido visual.',
'',
'BASE COMPATIBLE',
'Streamer Tools Local 1.2.0 entregado el 24/10/2026, con el parche de loaders OBS de esa misma fecha.',
'El hotfix también se comprueba sobre el ZIP 1.2.0 sin ese parche; conserva sus URLs directas existentes.',
'No es un instalador completo ni un parche de catálogos para la MASTER del Gestor.',
'',
'ARCHIVOS QUE REEMPLAZA',
'- spin-sequence.cjs',
'- wheel-model.cjs',
'- public/js/roulette-entries.js',
'- public/js/tools.js',
'',
'No incluye datos personales, catálogos, imágenes, sonidos, loaders ni cambios de rutas o puertos.',
'Cada ticket conserva su entryId y donante. MANTENER conserva todas las entradas;',
'ELIMINAR retira sólo el ticket ganador. Panel y OBS usan el mismo giro.',
'',
'IDENTIFICACIÓN DE LA BASE',
'ZIP 1.2.0 SHA-256: '+BASE_SHA,
'Parche OBS SHA-256: '+LOADERS_SHA,
'',
].join('\r\n');
async function build({archive,loaderPatch,output,auditFile}){
 const base=await readBase(archive,loaderPatch),files=payload(base),zip=new JSZip();files.set('README-HOTFIX.txt',Buffer.from(README,'utf8'));
 for(const [name,bytes] of files)zip.file(name,bytes,{date:new Date('2026-10-29T12:00:00Z')});
 const bytes=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:9}});
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,bytes);
 const audit={baseVersion:'1.2.0',baseSha256:BASE_SHA,loaderPatchSha256:LOADERS_SHA,output,zipSha256:sha(bytes),bytes:bytes.length,
 files:[...files].map(([name,data])=>({name,before:base.files.has(name)?sha(base.files.get(name)):null,after:sha(data),bytes:data.length})),
 unchangedAudited:['public/js/roulette-view.js','public/js/control.js','public/js/wheel-overlay.js','public/js/wheel-audio.js','server.cjs','application.cjs','start.ps1']};
 if(auditFile){fs.mkdirSync(path.dirname(auditFile),{recursive:true});fs.writeFileSync(auditFile,JSON.stringify(audit,null,2));}
 return audit;
}
module.exports={build,readBase,payload,FILES,BASE_SHA,LOADERS_SHA,sha};
if(require.main===module)build({archive:process.env.SANLEAN_LEGACY_ZIP,loaderPatch:process.env.SANLEAN_LEGACY_OBS_PATCH,output:path.join(root,'exports/SanLean-Streamer-Tools-HOTFIX-Entradas-Reales-v1.zip'),auditFile:path.join(root,'test-results/ticket-hotfix/package-audit.json')}).then(a=>console.log(JSON.stringify(a,null,2))).catch(e=>{console.error(e);process.exitCode=1;});

