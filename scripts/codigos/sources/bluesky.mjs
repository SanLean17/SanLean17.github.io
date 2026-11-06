import {readImageText} from '../image-ocr.mjs';
export const ACCOUNT = 'deadbydaylight.com';
export const DID = 'did:plc:rrbpnmgc4i2nn6naohkdsbhj';
export const ENDPOINT = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed';
export function officialPost(item) {
  const p = item?.post;
  if (item?.reason || !p || p.author?.did !== DID || p.author?.handle !== ACCOUNT || p.record?.$type !== 'app.bsky.feed.post') return null;
  const prefix = `at://${DID}/app.bsky.feed.post/`;
  if (!p.uri?.startsWith(prefix) || !/^[a-z0-9]+$/i.test(p.uri.slice(prefix.length))) return null;
  if (typeof p.record.text !== 'string' || p.record.text.length > 5000 || !Number.isFinite(Date.parse(p.record.createdAt))) return null;
  const images=(p.embed?.images||p.embed?.media?.images||[]).filter(i=>typeof i.fullsize==='string'&&i.fullsize.startsWith('https://cdn.bsky.app/')).map(i=>({url:i.fullsize,alt:typeof i.alt==='string'?i.alt.slice(0,2000):''}));
  return {images,id:p.uri.slice(prefix.length), uri:p.uri, text:p.record.text, publishedAt:new Date(p.record.createdAt).toISOString(), source:'bluesky', sourceType:'official_direct', sourceAccount:ACCOUNT, sourceDid:DID, sourceUrl:`https://bsky.app/profile/${ACCOUNT}/post/${p.uri.slice(prefix.length)}`};
}
async function json(url, fetcher) {
  let last;
  for (let attempt=0; attempt<3; attempt++) {
    try {
      const response=await fetcher(url,{signal:AbortSignal.timeout(20000),headers:{Accept:'application/json','User-Agent':'SanLean-Codes-Lab/1.0'}});
      if (!response.ok) throw new Error(`Bluesky HTTP ${response.status}`);
      return await response.json();
    } catch(error) {last=error;if(attempt<2)await new Promise(r=>setTimeout(r,1000*(attempt+1)));}
  }
  throw last;
}
export async function collect({since,fetcher=fetch,maxPages=12,mode,catalog=[],state={},imageReader=readImageText}={}) {
  const profile=await json(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${ACCOUNT}`,fetcher);
  if(profile.did!==DID || profile.handle!==ACCOUNT)throw new Error('La identidad oficial de Bluesky no coincide; actualización cancelada.');
  const posts=new Map();let cursor;let fetched=0;
  async function finish(){
    if(mode==='daily'){
      const uris=[...new Set(catalog.filter(c=>c.status==='active'&&c.source==='bluesky'&&c.rawPostUri).map(c=>c.rawPostUri))];
      for(let i=0;i<uris.length;i+=25){const u=new URL('https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts');for(const uri of uris.slice(i,i+25))u.searchParams.append('uris',uri);const d=await json(u,fetcher);if(!Array.isArray(d.posts))throw Error('Respuesta inválida al conciliar posts activos');fetched+=d.posts.length;for(const raw of d.posts){const p=officialPost({post:raw});if(p)posts.set(p.uri,p);}}
    }
    // OCR opcional y acotado: únicamente imágenes recientes de posts verificablemente
    // oficiales que no traen un código explícito en el texto ni en el alt.
    // La caché evita descargar repetidamente las mismas gráficas.
    const imageScan={...(state.imageScan||{})};
    const candidatePattern=/\b(?:use|enter|redeem|usar|ingresar|canjear)\s+(?:the\s+|el\s+)?(?:promo\s+)?(?:code|c[oó]digo)\s*[:=\-]?\s*[A-Z0-9][A-Z0-9_-]{2,63}\b/i;
    const cutoff=Date.now()-14*86400000;
    let imageScanned=0,imageScanErrors=0,imageCodesFound=0,lastImageError=null;
    for(const p of [...posts.values()].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt))){
      if(typeof imageScan[p.uri]?.text==='string'&&imageScan[p.uri].text)p.imageOcrText=imageScan[p.uri].text;
      if(p.uri in imageScan||Date.parse(p.publishedAt)<cutoff||!p.images?.length)continue;
      if(candidatePattern.test([p.text,...p.images.map(i=>i.alt)].join('\n')))continue;
      if(imageScanned>=8)break;
      let visualText='',success=true;
      for(const i of p.images.slice(0,2)){
        if(imageScanned>=8)break;
        imageScanned++;
        try{
          const detected=String(await imageReader(i.url,{fetcher})).replace(/\s+/g,' ').trim();
          if(candidatePattern.test(detected)){visualText=detected.slice(0,900);imageCodesFound++;break;}
        }catch(error){success=false;imageScanErrors++;lastImageError=String(error.message||error).slice(0,180);}
      }
      if(visualText)p.imageOcrText=visualText;
      if(success)imageScan[p.uri]={text:visualText};
    }
    const compact=Object.fromEntries(Object.entries(imageScan).slice(-300));
    return {posts:[...posts.values()],fetched,
      imageScanned,imageScanErrors,imageCodesFound,lastImageError,
      state:{...state,imageScan:compact}};

  }
  for(let page=0;page<maxPages;page++) {
    const url=new URL(ENDPOINT);url.search=new URLSearchParams({actor:DID,limit:'100',filter:'posts_no_replies',...(cursor?{cursor}:{})});
    const data=await json(url,fetcher);
    if(!Array.isArray(data.feed))throw new Error('Respuesta inválida de Bluesky');
    fetched+=data.feed.length;let dated=[];
    for(const item of data.feed){const p=officialPost(item);if(!p)continue;dated.push(Date.parse(p.publishedAt));if(!since||p.publishedAt>=since)posts.set(p.uri,p);}
    if(!data.cursor || (dated.length && Math.max(...dated)<Date.parse(since)))return finish();
    if(data.cursor===cursor)throw new Error('Cursor repetido; consulta incompleta');
    cursor=data.cursor;
  }
  throw new Error('Se alcanzó el límite de páginas sin completar la ventana; no se escribieron datos.');
}
