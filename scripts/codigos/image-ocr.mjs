import {spawnSync} from 'node:child_process';

// Solo imágenes adjuntas a publicaciones de la identidad oficial de DBD.
// No se descargan imágenes arbitrarias ni se utiliza un servicio OCR externo.
const CDN_PREFIX='https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:rrbpnmgc4i2nn6naohkdsbhj/';
export function officialImageUrl(url){
 if(typeof url!=='string'||!url.startsWith(CDN_PREFIX))return false;
 try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='cdn.bsky.app'&&!u.username&&!u.password&&/^\/[a-z0-9/_:.-]+$/i.test(u.pathname);}catch{return false;}
}
export function runOCR(bytes){
 const result=spawnSync('tesseract',['stdin','stdout','--psm','11','-l','eng'],{
  input:bytes,encoding:'utf8',timeout:18000,maxBuffer:35000
 });
 if(result.error)throw result.error;
 if(result.status!==0)throw Error('Tesseract devolvió estado '+result.status);
 return result.stdout||'';
}
export async function readImageText(url,{fetcher=fetch,recognizer=runOCR}={}){
 if(!officialImageUrl(url))throw Error('Imagen ajena al CDN oficial autorizado');
 const response=await fetcher(url,{signal:AbortSignal.timeout(15000),headers:{Accept:'image/jpeg,image/png,image/webp'}});
 if(!response.ok)throw Error('No se pudo leer imagen oficial: HTTP '+response.status);
 const mime=response.headers?.get?.('content-type')||'';
 if(mime&&!/image\/(?:jpeg|png|webp)/i.test(mime))throw Error('Formato de imagen no admitido');
 const bytes=Buffer.from(await response.arrayBuffer());
 if(!bytes.length||bytes.length>2_500_000)throw Error('Imagen vacía o demasiado grande');
 return String(await recognizer(bytes)).slice(0,1800);
}
