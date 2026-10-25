import {ACCOUNT,DID} from './sources/bluesky.mjs';
const months={january:1,enero:1,february:2,febrero:2,march:3,marzo:3,april:4,abril:4,may:5,mayo:5,june:6,junio:6,july:7,julio:7,august:8,agosto:8,september:9,septiembre:9,october:10,octubre:10,november:11,noviembre:11,december:12,diciembre:12};
const names=Object.keys(months).join('|');
function easternISO(year,month,day,hour,minute){
  let ms=Date.UTC(year,month-1,day,hour,minute);
  const fmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  for(let i=0;i<3;i++){const p=Object.fromEntries(fmt.formatToParts(new Date(ms)).map(x=>[x.type,x.value]));const local=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);ms+=Date.UTC(year,month-1,day,hour,minute)-local;}
  return new Date(ms).toISOString();
}
export function expiryFrom(text,publishedAt){
  const empty={expiresAt:null,expiryText:null,expiryPrecision:null,expiryUpperBound:null,expiryYearInferred:false};
  const match=text.match(new RegExp(`\\b(before|until|available until|hasta|disponible hasta)\\s+(?:el\\s+)?((?:${names})\\s+\\d{1,4}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?(?:,?\\s+\\d{1,2}(?::\\d{2})?\\s*[AP]M\\s*(?:ET|UTC|GMT))?|\\d{1,2}\\s+de\\s+(?:${names})(?:\\s+de\\s+\\d{4})?)`,'i'));
  if(!match)return empty;
  const raw=match[2],monthWord=raw.match(new RegExp(names,'i'))?.[0].toLowerCase();const month=months[monthWord];const numbers=raw.match(/\d+/g)||[];
  const fullYear=numbers.find(n=>n.length===4);const year=fullYear?+fullYear:new Date(publishedAt).getUTCFullYear();const monthOnly=numbers[0]?.length===4;
  const day=monthOnly?null:+numbers[0];
  const result={...empty,expiryText:match[0],expiryPrecision:monthOnly?'month':'day',expiryYearInferred:!fullYear};
  if(!month||year<new Date(publishedAt).getUTCFullYear()||year>new Date(publishedAt).getUTCFullYear()+3||(!monthOnly&&(!day||day>31)))return {...empty,expiryText:match[0]};
  if(!monthOnly&&new Date(Date.UTC(year,month-1,day)).getUTCMonth()!==month-1)return {...empty,expiryText:match[0]};
  // A date earlier than its post could mean a different year; never guess that rollover.
  if(!fullYear&&Date.UTC(year,month-1,day||1)<Date.parse(publishedAt)-86400000)return {...empty,expiryText:match[0]};
  const time=raw.match(/(\d{1,2})(?::(\d{2}))?\s*([AP]M)\s*(ET|UTC|GMT)/i);
  if(time&&!monthOnly){let hour=+time[1]%12+(time[3].toUpperCase()==='PM'?12:0);const minute=+(time[2]||0);if(+time[1]>12||minute>59)return {...empty,expiryText:match[0]};result.expiresAt=time[4].toUpperCase()==='ET'?easternISO(year,month,day,hour,minute):new Date(Date.UTC(year,month-1,day,hour,minute)).toISOString();result.expiryPrecision='instant';}
  // Conservative upper bound, NOT a claimed official timestamp: wait until the entire
  // named day/month has ended even in UTC-12. A vague date is never presented as exact.
  result.expiryUpperBound=result.expiresAt||new Date(monthOnly?Date.UTC(year,month,1,12):Date.UTC(year,month-1,day+1,12)).toISOString();
  return result;
}
const token='([A-Z0-9][A-Z0-9_-]{2,63})';
const stop=new Set(['THE','CODE','CODES','STORE','NOW','GET','USE','ENTER','REDEEM','FREE','IN','AND','FOR','AVAILABLE','INGAME']);
function valid(code){return !stop.has(code.toUpperCase())&&/[A-Za-z]/.test(code)&&/^[A-Za-z0-9_-]{3,64}$/.test(code);}
export function classify(post){
  if(post.source!=='bluesky'||post.sourceAccount!==ACCOUNT||post.sourceDid!==DID)return{classification:'REJECTED',candidates:[],reason:'Fuente no autorizada'};
  const text=post.text.normalize('NFKC');const signals=/\b(code|codes|redeem|canje(?:ar|á|a)?|c[oó]digo|ingres[aá]|introduce|enter)\b/i.test(text);
  const found=[];
  const patterns=[new RegExp(`\\b(?:use|using|enter|redeem|us[aá]|usando|ingres[aá]|introduce|canje[aá])\\s+(?:the\\s+|el\\s+)?(?:promo\\s+)?(?:code|c[oó]digo)\\s*[:=]?\\s*["“'\x60]?${token}\\b`,'gi'),new RegExp(`\\benter\\s+["“'\x60]?${token}["”'\x60]?\\s+in(?:to)?\\s+the\\s+in[- ]game\\s+store`,'gi')];
  for(const pattern of patterns)for(const match of text.matchAll(pattern)){if(valid(match[1]))found.push({code:match[1].toUpperCase(),end:match.index+match[0].length});}
  const unique=[...new Set(found.map(x=>x.code))];
  if(!unique.length){const candidates=signals?[...new Set(text.match(/\b[A-Z][A-Z0-9_-]{2,63}\b/g)||[])].filter(valid):[];return {classification:candidates.length?'REVIEW':'REJECTED',candidates,reason:candidates.length?'Contexto de canje incompleto':'Sin código inequívoco ni instrucción de canje'};}
  const multi=unique.length!==1||found.some(x=>/^\s*["”']?\s*(?:and|y|,|&)\s+[A-Z][A-Z0-9_-]{2,63}\b/.test(text.slice(x.end)));
  if(multi)return{classification:'REVIEW',candidates:[...new Set([...unique,...(text.match(/\b[A-Z][A-Z0-9_-]{3,63}\b/g)||[]).filter(valid)])],reason:'Varios códigos; revisar asociación individual de recompensas y fechas'};
  const negative=/\b(?:do not|don't|cannot|can't|not yet|no longer|will be able to|coming soon|not a code|example|for example|no uses|no canjees|ejemplo)\b/i.test(text);
  if(negative)return{classification:'REVIEW',candidates:unique,reason:'Negación, ejemplo o disponibilidad futura; requiere revisión'};
  const patternsReward=[/\bredeem\s+(?:the\s+)?(.+?)\s+using\s+(?:the\s+)?code\b/i,/\b(?:to\s+(?:redeem|unlock)|to get)\s+(?:the\s+)?(.+?)(?=\s+(?:until|before|in the in-game Store|just in time)\b|[.!\n]|$)/i,/\bwith\s+(a Banner and a Badge)\b/i,/\b(?:para\s+(?:canjear|obtener|desbloquear))\s+(.+?)(?=\s+hasta\b|[.!\n]|$)/i];
  let reward=null;for(const p of patternsReward){const m=text.match(p);if(m){reward=m[1].replace(/[✨🌈]/gu,'').replace(/[,\s]+$/,'').trim();break;}}
  if(reward&&reward.length>180)reward=null;
  // Generic 'this Charm' is what the official text says; never infer names from art.
  return{classification:'CONFIRMED',candidates:unique,code:unique[0],reward,...expiryFrom(text,post.publishedAt),reason:'Cuenta oficial + instrucción explícita de canje + un código inequívoco'};
}
export function statusAt(entry,now){const end=entry.expiresAt;return entry.status==='expired'||(end&&Date.parse(now)>Date.parse(end))?'expired':'active';}
