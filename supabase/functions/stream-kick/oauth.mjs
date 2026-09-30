export const SCOPES=['user:read','channel:read','events:subscribe'];
export function base64url(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}
export async function pkce(){const verifier=base64url(crypto.getRandomValues(new Uint8Array(32)));const challenge=base64url(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));return{verifier,challenge}}
export function validState(s){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s)}
export function scopesOf(value){return Array.isArray(value)?value:String(value||'').split(' ').filter(Boolean)}
