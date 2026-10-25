// Presentation only: never alters expiration or detector confidence.
export function expiryLabel(c){
 if(c.expiresAt&&Number.isFinite(Date.parse(c.expiresAt)))return new Intl.DateTimeFormat('es-AR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(c.expiresAt));
 if(!c.expiryText||!['day','month'].includes(c.expiryPrecision))return null;
 const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
 const spanish=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
 const text=c.expiryText.toLowerCase();const month=months.findIndex((m,i)=>new RegExp(`\\b(?:${m}|${spanish[i]})\\b`).test(text));if(month<0)return null;
 const year=+(text.match(/\b20\d{2}\b/)?.[0]||new Date(c.publishedAt).getUTCFullYear());
 if(c.expiryPrecision==='month')return `${spanish[month]} de ${year}`;
 const day=+(text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/)?.[1]);if(!day||day>31)return null;
 return `${day} de ${spanish[month]} de ${year}`;
}
export function officialImage(url){
 if(typeof url!=='string')return false;
 try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='cdn.bsky.app'&&u.pathname.startsWith('/img/feed_fullsize/plain/did:plc:rrbpnmgc4i2nn6naohkdsbhj/')&&!u.username&&!u.password;}catch{return false;}
}
