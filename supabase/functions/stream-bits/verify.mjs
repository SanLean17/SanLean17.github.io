export async function webhookSecret(clientSecret){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('sanlean-eventsub:'+clientSecret)))].map(n=>n.toString(16).padStart(2,'0')).join('')}
export async function verifyMessage(headers,body,secret,now=Date.now()){
 const id=headers.get('Twitch-Eventsub-Message-Id'),timestamp=headers.get('Twitch-Eventsub-Message-Timestamp'),signature=headers.get('Twitch-Eventsub-Message-Signature');
 if(!id||!timestamp||!signature||!/^sha256=[0-9a-f]{64}$/.test(signature))return false;
 const time=Date.parse(timestamp);if(!Number.isFinite(time)||Math.abs(now-time)>600000)return false;
 const encode=s=>new TextEncoder().encode(s),key=await crypto.subtle.importKey('raw',encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,encode(id+timestamp+body))),expected='sha256='+[...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');
 let difference=0;for(let i=0;i<expected.length;i++)difference|=expected.charCodeAt(i)^signature.charCodeAt(i);return difference===0;
}
