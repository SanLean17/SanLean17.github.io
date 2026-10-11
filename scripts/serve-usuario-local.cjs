'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg'};
const mirror=require('./usuario-preview-bridge.cjs')();
const server=http.createServer(async(req,res)=>{
  const requestURL=new URL(req.url,'http://127.0.0.1');
  if(await mirror(req,res,requestURL))return;
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    let relative=decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if(relative.split(/[\\/]/).some(part=>part.startsWith('.'))){res.writeHead(403);return res.end();}
    relative=relative.replace(/^usuario(?=\/|$)/i,'Usuario');
    let file=path.resolve(root,relative||'Usuario/index.html');
    if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
    if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res);
  }catch{res.writeHead(404);res.end('Archivo no encontrado');}
});
server.on('error',error=>{console.error('No se pudo iniciar el servidor:',error.message);process.exitCode=1;});
const port=Number(process.env.SANLEAN_LOCAL_PORT)||4173;
server.listen(port,'127.0.0.1',()=>console.log(`MODO DESARROLLO LOCAL\nAbrí http://127.0.0.1:${port}/Usuario/\nDejá esta ventana abierta. Ctrl+C para detener.`));
