'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),cp=require('node:child_process');
const {Manager,json,inside,run,hash}=require('./core.cjs'),{GitHub}=require('./github.cjs'),{Preview,serveFile}=require('./preview.cjs');
function createServer({home,port=4180,webPort=4181,streamerPort=4182,manager}={}){
 home=path.resolve(home||path.join(__dirname,'../..'));const config=json(path.join(home,'base-manifest.json'));
 const m=manager||new Manager({home,baseRoot:path.join(home,'base/web'),streamerRoot:config.streamerRelative?path.resolve(home,config.streamerRelative):path.join(home,'base/streamer'),baseCommit:config.commit});if(!manager)m.configureV4();const gh=new GitHub(m),preview=new Preview(m,{webPort,streamerPort});const token=crypto.randomBytes(32).toString('hex');const auditor=new (require('./audit.cjs').Auditor)(home);let queue=Promise.resolve(),auth=null;
 const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 const server=http.createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' blob: data:; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");if(req.headers.host!=='127.0.0.1:'+port||req.headers['sec-fetch-site']==='cross-site')return send(res,403,{error:'Origen no permitido.'});let url;try{url=new URL(req.url,'http://127.0.0.1:'+port);}catch{return send(res,400,{error:'URL no válida.'});}
 try{if(req.method==='GET'){
 if(url.pathname==='/health')return send(res,200,{app:'sanlean-dbd-manager',root:home});
 if(url.pathname==='/api/session')return send(res,200,{token,repo:m.repo,branch:m.branch,commit:m.baseCommit,data:m.data,github:await gh.status(),testMode:m.testMode===true,auth,drafts:m.list().map(d=>({...d,updateKind:m.kind(d)})),preview:preview.active,config,ports:{manager:port,web:webPort,streamer:streamerPort}});
 if(url.pathname==='/api/editor')return send(res,200,m.editorRead(url.searchParams.get('id')));
 if(url.pathname==='/api/publication-plan')return send(res,200,await gh.publicationPlan(url.searchParams.get('id')));
 if(url.pathname==='/api/publication-status')return send(res,200,await gh.progress(url.searchParams.get('id')));
 if(url.pathname==='/api/github-status')return send(res,200,await gh.status());
 if(url.pathname==='/api/publication-watch')return send(res,200,await gh.watch(url.searchParams.get('id')));
 if(url.pathname==='/api/history')return send(res,200,m.history());
 if(url.pathname==='/api/catalogs')return send(res,200,url.searchParams.get('id')?(url.searchParams.get('includeDraft')==='1'?m.analyze(m.read(url.searchParams.get('id'))).all:m.effectiveCatalogs(m.read(url.searchParams.get('id')))):m.catalogs);
 if(url.pathname==='/api/audit')return send(res,200,auditor.scan());
 if(url.pathname==='/catalog-asset'){const type=url.searchParams.get('type'),key=url.searchParams.get('key'),entry=m.catalogs[type]?.find(i=>i.key===key);if(!entry)throw Error('Contenido no encontrado.');return serveFile(req,res,inside(m.base,m.catalog.resolveItemImage(entry,type)));}
 if(url.pathname.startsWith('/canonical/')){const rel=decodeURIComponent(url.pathname.slice(11));const approved=['css/style.css','css/usuario.css','css/usuario-shell-v2.css','css/usuario-stream-modules.css','css/usuario-polish-v4.css','css/usuario-design-system.css','css/usuario-canonical-selects.css','css/usuario-confirmations.css','css/usuario-roulette-tools.css','css/usuario-segmented-control.css','js/usuario-canonical-selects.js','js/usuario-confirmations.js','logo.png','fondo-final-2.png','fondo-negro-textura-2.png'];if(!approved.includes(rel))throw Error('Componente no disponible.');const f=inside(m.base,rel);if(rel==='css/style.css'){res.writeHead(200,{'Content-Type':'text/css; charset=utf-8'});return res.end(fs.readFileSync(f,'utf8').replace(/^@import.*$/m,''));}return serveFile(req,res,f);}
 if(url.pathname==='/local-fonts.css')return serveFile(req,res,path.join(m.streamer,'public/css/fonts.css'));
 if(url.pathname.startsWith('/assets/fonts/')&&/^font-[0-9]\.ttf$/.test(path.basename(url.pathname)))return serveFile(req,res,path.join(m.streamer,'public',url.pathname.slice(1)));
 if(url.pathname==='/api/draft'){const d=m.read(url.searchParams.get('id'));return send(res,200,{draft:d,analysis:m.analyze(d),search:m.search(d.id,'')});}
 if(url.pathname==='/api/search')return send(res,200,m.search(url.searchParams.get('id'),url.searchParams.get('q')||''));
 if(url.pathname==='/api/auth')return send(res,200,auth||{running:false,output:''});
 if(url.pathname==='/asset'){const d=m.read(url.searchParams.get('id')),item=d.items.find(i=>i.id===url.searchParams.get('item'));if(!item?.asset)throw Error('Imagen no disponible.');return serveFile(req,res,inside(m.draftDir(d.id),item.asset.file));}
 if(url.pathname==='/download'){const kind=url.searchParams.get('kind');let file;if(kind==='initial')file=path.join(home,'SanLean-Streamer-Tools-Catalog-System-PATCH.zip');else {const d=m.read(url.searchParams.get('id'));const artifact=kind==='patch'?d.patch:kind==='export'?d.export:null;if(!artifact)throw Error('Primero generá el archivo.');file=inside(m.data,artifact.file);if(hash(fs.readFileSync(file))!==artifact.sha256)throw Error('El archivo exportado cambió en disco. No se descargó. Volvé a preparar la actualización.');}res.setHeader('Content-Disposition','attachment; filename="'+path.basename(file)+'"');return serveFile(req,res,file);}
 const assets={'/':'index.html','/app.js':'app.js','/publication-view.js':'publication-view.js','/style.css':'style.css','/catalog.js':null,'/font.ttf':null};if(Object.hasOwn(assets,url.pathname)){let file=assets[url.pathname]?path.join(__dirname,'ui',assets[url.pathname]):url.pathname==='/catalog.js'?path.join(m.base,'js/dbd-catalog.js'):path.join(__dirname,'ui/font.ttf');return serveFile(req,res,file);}return send(res,404,{error:'No encontrado.'});}
 if(req.method!=='POST')return send(res,405,{error:'Método no permitido.'});if(req.headers.origin!=='http://127.0.0.1:'+port||req.headers['x-sanlean-manager']!==token||req.headers['content-type']!=='application/json')return send(res,403,{error:'La sesión no es válida. Recargá el Gestor.'});let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>29*1024*1024)return send(res,413,{error:'El archivo supera el tamaño permitido.'});}const body=JSON.parse(raw);const action=async()=>{switch(url.pathname){
 case '/api/new':return m.create(body);
 case '/api/catalog-correction':return m.saveCorrection(body);
 case '/api/conflicts':return m.setConflicts(body.id,body);
 case '/api/catalog-save':return m.saveCatalogChange(body);
 case '/api/catalog-owner-save':{const d=body.destination?m.read(body.destination):m.create(body);if(body.destination)m.checkRevision(d,body.destinationRevision);return m.catalogOwner(d.id,{...body,revision:d.revision});}
 case '/api/combine':return m.combine(body);
 case '/api/editor':return m.editorCheckpoint(body.id,body);
 case '/api/check-all':return m.checkAll(body.id,body);
 case '/api/master':return require('./master.cjs').updateMaster(m,body.id,body);
 case '/api/retry-ci':return gh.retryCI(body.id,body);
 case '/api/production-pr':return gh.productionPR(body.id,body);
 case '/api/production':return gh.production(body.id,body);
 case '/api/catalog-owner':if(preview.active?.id===body.id)await preview.stop();return m.catalogOwner(body.id,body);
 case '/api/catalog-plan':return m.catalogPlan(body.id,body);
 case '/api/catalog-apply':if(preview.active?.id===body.id)await preview.stop();return m.catalogApply(body.id,body);
 case '/api/catalog-undo':if(preview.active?.id===body.id)await preview.stop();return m.catalogUndo(body.id,body);
 case '/api/audit-plan':return auditor.plan(body.ids);
 case '/api/audit-recycle':return auditor.execute(body);
 case '/api/save':if(preview.active?.id===body.id)await preview.stop();return m.save(body.id,body);
 case '/api/upload':if(preview.active?.id===body.id)await preview.stop();return m.upload(body.id,body);
 case '/api/propose':return {key:m.propose(body.type,body.name,body.items)};
 case '/api/prepare':if(preview.active?.id===body.id)await preview.stop();return m.prepare(body.id);
 case '/api/preview':return preview.open(body.id);
 case '/api/simulate':return m.simulate(body.id);
 case '/api/check':return m.check(body.id,body);
 case '/api/ready':return m.ready(body.id);
 case '/api/patch':return m.patch(body.id);
 case '/api/export':return m.exportManual(body.id);
 case '/api/publish':return gh.publish(body.id,body.confirmation,{revision:body.revision,manifestHash:body.manifestHash,baseBranch:body.baseBranch,baseCommit:body.baseCommit});
 case '/api/connect':{if(auth?.running)return auth;await run('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'check-credential-store.ps1')]);auth={running:true,output:''};const p=cp.spawn(gh.exe,['auth','login','--hostname','github.com','--git-protocol','https','--web','--skip-ssh-key'],{windowsHide:true,stdio:['pipe','pipe','pipe']});const collect=b=>{auth.output=(auth.output+b.toString('utf8')).slice(-6000);};p.stdout.on('data',collect);p.stderr.on('data',collect);p.on('error',e=>{auth.running=false;auth.output='No se pudo abrir GitHub CLI. Extraé el paquete completo. '+e.code;});p.on('close',code=>{auth.running=false;auth.success=code===0;});p.stdin.end();return auth;}
 case '/api/folder':if(process.platform==='win32')cp.spawn('explorer.exe',[m.data],{windowsHide:true,stdio:'ignore'}).on('error',()=>{});return {ok:true};
 default:throw Error('Acción no disponible.');}};const job=queue.then(action);queue=job.catch(()=>{});return send(res,200,await job);
 }catch(e){return send(res,400,{error:e.message});}});
 return {server,manager:m,preview,close:async()=>{await preview.stop();server.closeAllConnections();await new Promise(r=>server.close(r));}};
}
module.exports={createServer};
if(require.main===module){const home=process.argv[2]||path.resolve(__dirname,'../..');const app=createServer({home});app.server.on('error',e=>{console.error('No se pudo abrir el Gestor. El puerto 4180 puede estar ocupado. '+e.message);process.exitCode=1;});app.server.listen(4180,'127.0.0.1',()=>{console.log('SANLEAN — GESTOR DE CONTENIDO DBD\nhttp://127.0.0.1:4180/\nLos borradores se guardan sólo en esta PC. Dejá esta ventana abierta.');if(process.platform==='win32'&&process.env.SANLEAN_OPEN_BROWSER!=='0')cp.spawn('rundll32.exe',['url.dll,FileProtocolHandler','http://127.0.0.1:4180/'],{windowsHide:true,stdio:'ignore'}).on('error',()=>{});});for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>app.close().then(()=>process.exit()));}
