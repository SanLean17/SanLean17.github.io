const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
let cachedKey;
async function publicKey(){
 if(cachedKey)return cachedKey;
 const r=await fetch('https://api.kick.com/public/v1/public-key',{signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw new Error('Kick key unavailable');
 const pem=(await r.json()).data?.public_key;
 if(typeof pem!=='string')throw new Error('Invalid Kick key');
 cachedKey=await crypto.subtle.importKey('spki',bytes(pem.replace(/-----[^-]+-----/g,'').replace(/\s/g,'')),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);return cachedKey;
}
export async function verifyKick(headers,raw,key=null,now=Date.now()){
 const id=headers.get('Kick-Event-Message-Id'),time=headers.get('Kick-Event-Message-Timestamp'),signature=headers.get('Kick-Event-Signature');
 if(!id||!time||!signature||!Number.isFinite(Date.parse(time))||Math.abs(now-Date.parse(time))>600000)return false;
 try{return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key||await publicKey(),bytes(signature),new TextEncoder().encode(id+'.'+time+'.'+raw))}catch{return false}
}
