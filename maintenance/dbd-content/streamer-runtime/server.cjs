'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname,publicRoot=path.join(root,'public'),port=Number(process.env.SANLEAN_PORT)||4175;
const app=require('./application.cjs')(process.env.SANLEAN_DATA_DIR||path.join(root,'datos')),clients=new Map();let timer,notice='';
const valid={challenges:['all-killer','all-survivor'],counters:['meta','win-streak'],tools:['']};
function packet(scope,key){return {state:app.get(scope,key),serverTime:Date.now(),notice,...(scope==='counters'&&key==='win-streak'?{history:app.history()}:{}),...(scope==='tools'?{overlayListeners:Object.fromEntries(['killer-wheel','perks-killer','perks-survivor'].map(k=>[k,[...clients.values()].filter(c=>c.overlay===k).length]))}:{})};}
function broadcast(){for(const [res,c] of clients){const p=packet(c.scope,c.key);if(c.websocket)res.send(p);else res.write('data: '+JSON.stringify(p)+'\n\n');}}
function schedule(){clearTimeout(timer);const d=app.due()[0];if(d)timer=setTimeout(()=>{try{app.tick(d);broadcast();schedule();}catch(e){notice='No se pudo guardar: '+e.message;broadcast();}},Math.max(0,d.at-Date.now()));}schedule();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.ttf':'font/ttf','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg'};
const server=http.createServer(async(req,res)=>{
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host))return send(403,{error:'Host no permitido'});

 let url;try{url=new URL(req.url,'http://127.0.0.1:'+port);}catch{return send(400,{error:'URL inválida'});}const p=url.pathname;
 const localOverlay=/^\/obs\/(meta|win-streak|all-killer|all-survivor|killer-wheel|perks-killer|perks-survivor)$/.test(p);
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',`default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'; frame-ancestors 'self'${localOverlay?' file: http://absolute':''}; form-action 'self'; base-uri 'none'`);
 if(p==='/health'&&req.method==='GET')return send(200,{app:'sanlean-streamer-tools',root});
 const match=p.match(/^\/(api|events)\/(tools|challenges|counters)(?:\/([^/]+))?(?:\/(action))?$/);
 if(match){let [,kind,scope,key='',operation]=match;if(scope==='tools'&&key==='action'){operation=key;key='';}if(!valid[scope].includes(key))return send(404,{error:'Herramienta inválida'});
  if(kind==='events'&&req.method==='GET'&&!operation){clients.set(res,{scope,key,overlay:scope==='tools'&&url.searchParams.get('surface')==='overlay'?url.searchParams.get('tool'):null});res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive'});res.write('retry: 1000\n\ndata: '+JSON.stringify(packet(scope,key))+'\n\n');broadcast();req.on('close',()=>{clients.delete(res);broadcast();});return;}
  if(kind==='api'&&req.method==='GET'&&!operation)return send(200,packet(scope,key));
  if(kind==='api'&&req.method==='POST'&&operation==='action'){
   if(req.headers.origin!==`http://${req.headers.host}`||req.headers['content-type']!=='application/json'||req.headers['x-sanlean-standalone']!=='1')return send(403,{error:'Origen no permitido'});
   try{let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>32768)return send(413,{error:'Solicitud demasiado grande'});}app.action(scope,key,JSON.parse(raw));schedule();broadcast();return send(200,packet(scope,key));}catch(e){return send(e.conflict?409:400,{error:e.message,...(e.conflict?packet(scope,key):{})});}
  }
  return send(405,{error:'Método no permitido'});
 }
 if(!['GET','HEAD'].includes(req.method))return send(405,{error:'Método no permitido'});
 try{
  const relative=decodeURIComponent(p);if(relative.includes('\\')||relative.split('/').some(v=>v.startsWith('.')))return send(403,{error:'Ruta no permitida'});
  const routes={'/':'control.html','/control':'control.html','/obs/meta':'counter-overlay.html','/obs/win-streak':'counter-overlay.html','/obs/all-killer':'overlay.html','/obs/all-survivor':'overlay.html','/obs/killer-wheel':'wheel-overlay.html','/obs/perks-killer':'wheel-overlay.html','/obs/perks-survivor':'wheel-overlay.html'};
  const content=/^\/(data\/(killers|survivors|perks-killer|perks-survivor|perk-conflicts)\.json|(?:assets\/killers|survivors|killer|survivor)\/[^/]+\.(?:png|webp)|rombo\.png)$/.test(relative),base=content?root:publicRoot;
  const target=path.join(base,routes[relative]||relative);if(!target.startsWith(base+path.sep)||!fs.statSync(target).isFile())return send(404,{error:'No encontrado'});
  res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});if(req.method==='HEAD')return res.end();fs.createReadStream(target).pipe(res);
 }catch{return send(404,{error:'No encontrado'});}
});
server.on('upgrade',(req,socket,head)=>{
 const reject=()=>socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
 if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host)||req.headers.origin!==`http://${req.headers.host}`)return reject();
 let url;try{url=new URL(req.url,'http://127.0.0.1:'+port);}catch{return reject();}
 const m=url.pathname.match(/^\/events\/(tools|challenges|counters)(?:\/([^/]+))?$/);if(!m||!valid[m[1]].includes(m[2]||''))return reject();
 const scope=m[1],key=m[2]||'',overlay=scope==='tools'&&url.searchParams.get('surface')==='overlay'?url.searchParams.get('tool'):null;
 if(require('./local-events.cjs')(req,socket,head,()=>{clients.delete(socket);broadcast();})){clients.set(socket,{scope,key,overlay,websocket:true});broadcast();}
});
setInterval(()=>{for(const [res,c] of clients)if(!c.websocket)res.write(': keepalive\n\n');},20000).unref();
setInterval(()=>{try{app.checkpoint();}catch(e){notice='No se pudo guardar: '+e.message;broadcast();}},2000).unref();
server.on('error',e=>{console.error('No se pudo iniciar: el puerto 4175 está ocupado o no está disponible. '+e.message);process.exit(1);});
server.listen(port,'127.0.0.1',()=>{console.log('SANLEAN STREAMER TOOLS\n\nPANEL: http://127.0.0.1:4175/\nOBS: copiá la URL desde cada herramienta.\n\nDejá esta ventana abierta. Ctrl+C para cerrar.\nTus datos se guardan automáticamente en la carpeta datos.');if(process.env.SANLEAN_OPEN_BROWSER!=='0'&&process.platform==='win32')require('node:child_process').spawn('rundll32.exe',['url.dll,FileProtocolHandler','http://127.0.0.1:4175/'],{windowsHide:true,stdio:'ignore'}).on('error',()=>{});});
function close(){try{app.checkpoint();}finally{process.exit(0);}}process.on('SIGINT',close);process.on('SIGTERM',close);
