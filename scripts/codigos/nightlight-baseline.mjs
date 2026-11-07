// Offline policy only. No network adapter is enabled without written permission.
import {createHash} from 'node:crypto';
export const normalizeCode=value=>String(value||'').normalize('NFKC').trim().toUpperCase();
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const validCode=c=>/^[A-Z0-9_-]{3,64}$/.test(c);
function authorize(authorization){
 if(authorization?.enabled!==true||!authorization.permissionReference||!authorization.channel)throw Error('NightLight pendiente de autorización');
}
function validateSnapshot(snapshot){
 if(snapshot?.complete!==true||!Array.isArray(snapshot.codes)||!snapshot.codes.length)throw Error('Referencia incompleta: no importar');
 const ids=snapshot.codes.map(c=>normalizeCode(c.code));
 if(ids.some(c=>!validCode(c)))throw Error('Identificador inválido: no importar');
 return [...new Set(ids)].sort();
}
function seal(state){const {checksum,...body}=state;return {...body,checksum:digest(body)};}
export function activateNightlight(snapshot,authorization,now=new Date().toISOString()){
 authorize(authorization);const baselineIds=validateSnapshot(snapshot);
 return seal({schemaVersion:1,activatedAt:now,permissionReference:authorization.permissionReference,
  channel:authorization.channel,baselineIds,seenIds:baselineIds,baselineDigest:digest(baselineIds)});
}
export function discoverNightlight(snapshot,state,authorization){
 authorize(authorization);
 if(!state||state.schemaVersion!==1||!state.activatedAt)throw Error('Falta estado persistente: restaurar referencia; no importar');
 const {checksum,...body}=state;
 if(checksum!==digest(body)||state.baselineDigest!==digest(state.baselineIds)
  ||state.permissionReference!==authorization.permissionReference||state.channel!==authorization.channel
  ||state.baselineIds.some(c=>!state.seenIds.includes(c)))throw Error('Referencia inválida: no importar');
 const ids=validateSnapshot(snapshot),seen=new Set(state.seenIds);
 const candidates=ids.filter(c=>!seen.has(c)).map(code=>({code,source:'nightlight',sourceType:'community_discovery',
  sourceUrl:'https://nightlight.gg/codes',official:false,confidence:'REVIEW',reason:'Novedad posterior a la referencia; requiere confirmación independiente'}));
 return {candidates,state:seal({...state,seenIds:[...new Set([...state.seenIds,...ids])].sort()})};
}
