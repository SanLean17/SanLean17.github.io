import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {chatMetadata} from '../_shared/chat-metadata.mjs';
import {verifyKick} from './verify.mjs';
import {SCOPES,pkce,validState,scopesOf} from './oauth.mjs';
const url=Deno.env.get('SUPABASE_URL')||'',db=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',{auth:{persistSession:false,autoRefreshToken:false}});
const clientId=Deno.env.get('KICK_CLIENT_ID')||'',clientSecret=Deno.env.get('KICK_CLIENT_SECRET')||'',callback=url+'/functions/v1/stream-kick/callback';
const cors={'Access-Control-Allow-Origin':'https://sanlean.com.ar','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,GET,OPTIONS','Cache-Control':'no-store'};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:cors});
const checked=async(q:any)=>{const {data,error}=await q;if(error)throw error;return data};
async function owner(req:Request,workspaceId:string){const {data,error}=await db.auth.getUser((req.headers.get('authorization')||'').replace(/^Bearer /,''));if(error||!data.user)throw new Error('Unauthorized');const w=await checked(db.from('streamer_workspaces').select('id').eq('id',workspaceId).eq('owner_user_id',data.user.id).maybeSingle());if(!w)throw new Error('Forbidden');return data.user.id}
async function token(values:Record<string,string>){const r=await fetch('https://id.kick.com/oauth/token',{method:'POST',body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,...values}),signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error(r.status===400||r.status===401?'KickAuthorization':'KickUnavailable');return r.json()}
async function identity(access:string){const headers={Authorization:'Bearer '+access};const r=await fetch('https://api.kick.com/public/v1/users',{headers,signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error(r.status===401||r.status===403?'KickAuthorization':'KickUnavailable');const user=(await r.json()).data?.[0];if(!user?.user_id)throw new Error('KickAuthorization');const c=await fetch('https://api.kick.com/public/v1/channels',{headers,signal:AbortSignal.timeout(12000)});if(!c.ok)throw new Error(c.status===401||c.status===403?'KickAuthorization':'KickUnavailable');const channel=(await c.json()).data?.[0];if(!channel||String(channel.broadcaster_user_id)!==String(user.user_id))throw new Error('KickAuthorization');return {id:String(user.user_id),name:String(user.name||channel.slug),slug:String(channel.slug)}}
async function saveToken(workspaceId:string,t:any){const scopes=scopesOf(t.scope);if(!SCOPES.every(s=>scopes.includes(s))||!t.access_token||!t.refresh_token||!Number.isFinite(Number(t.expires_in)))throw new Error('KickAuthorization');const value={workspace_id:workspaceId,platform:'kick',access_token:t.access_token,refresh_token:t.refresh_token,expires_at:new Date(Date.now()+Number(t.expires_in)*1000).toISOString(),scopes,updated_at:new Date().toISOString()};await checked(db.from('stream_platform_tokens').upsert(value,{onConflict:'workspace_id,platform'}));return value}
const refreshing=new Map<string,Promise<any>>();
async function activeToken(workspaceId:string,stored:any){if(Date.parse(stored.expires_at)>Date.now()+60000)return stored;if(refreshing.has(workspaceId))return refreshing.get(workspaceId);const work=(async()=>{try{return await saveToken(workspaceId,await token({grant_type:'refresh_token',refresh_token:stored.refresh_token}))}catch(e){const latest=await checked(db.from('stream_platform_tokens').select('*').eq('workspace_id',workspaceId).eq('platform','kick').maybeSingle());if(latest?.refresh_token!==stored.refresh_token&&Date.parse(latest?.expires_at)>Date.now()+60000)return latest;throw e}})();refreshing.set(workspaceId,work);try{return await work}finally{refreshing.delete(workspaceId)}}
async function subscribeChat(workspaceId:string,broadcaster:string,access:string){
 const headers={Authorization:'Bearer '+access,'Content-Type':'application/json'};
 const list=await fetch('https://api.kick.com/public/v1/events/subscriptions',{headers,signal:AbortSignal.timeout(12000)});if(!list.ok)throw new Error('KickUnavailable');
 let subscription=(await list.json()).data?.find((s:any)=>s.event==='chat.message.sent'&&String(s.broadcaster_user_id)===broadcaster);
 if(!subscription){const response=await fetch('https://api.kick.com/public/v1/events/subscriptions',{method:'POST',headers,body:JSON.stringify({events:[{name:'chat.message.sent',version:1}],method:'webhook'}),signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error('KickUnavailable');const created=(await response.json()).data?.find((s:any)=>s.name==='chat.message.sent');if(created?.error||!created?.subscription_id)throw new Error('KickUnavailable');subscription={id:created.subscription_id}}
 await checked(db.from('stream_chat_subscriptions').upsert({workspace_id:workspaceId,platform:'kick',broadcaster_id:broadcaster,subscription_id:subscription.id,connected:true},{onConflict:'workspace_id,platform'}));
}
Deno.serve(async(req:Request)=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});try{const u=new URL(req.url),route=u.pathname.split('/').at(-1);
 if(route==='webhook'&&req.method==='POST'){
  const raw=await req.text();if(raw.length>100000)return json({error:'payload_too_large'},413);
  if(!await verifyKick(req.headers,raw))return json({error:'invalid_signature'},403);
  if(req.headers.get('Kick-Event-Type')!=='chat.message.sent'||req.headers.get('Kick-Event-Version')!=='1')return json({error:'unsupported_event'},400);
  const e=JSON.parse(raw);if(!e.message_id||!e.sender?.user_id||!e.broadcaster?.user_id||typeof e.content!=='string'||!Number.isFinite(Date.parse(e.created_at)))return json({error:'invalid_chat'},400);
  const channel=await checked(db.from('stream_chat_subscriptions').select('workspace_id').eq('platform','kick').eq('broadcaster_id',String(e.broadcaster.user_id)).eq('subscription_id',req.headers.get('Kick-Event-Subscription-Id')).eq('connected',true).maybeSingle());if(!channel)return json({error:'unknown_subscription'},403);
  await checked(db.rpc('stream_chat_ingest',{p_workspace:channel.workspace_id,p_platform:'kick',p_message_id:e.message_id,p_user_id:String(e.sender.user_id),p_username:String(e.sender.username||e.sender.user_id).slice(0,100),p_message:e.content.slice(0,4000),p_sent_at:e.created_at,p_metadata:chatMetadata('kick',e)}));return new Response(null,{status:204});
 }
 if(route==='callback'&&req.method==='GET'){
  const state=u.searchParams.get('state')||'';if(!validState(state))return json({error:'invalid_state'},400);
  const rows=await checked(db.from('stream_kick_oauth').delete().eq('state',state).gt('expires_at',new Date().toISOString()).select('*'));const flow=rows?.[0];if(!flow)return json({error:'expired_state'},400);
  const workspace=await checked(db.from('streamer_workspaces').select('id').eq('id',flow.workspace_id).eq('owner_user_id',flow.user_id).maybeSingle());if(!workspace)throw new Error('Forbidden');
  if(u.searchParams.has('error'))return Response.redirect('https://sanlean.com.ar/Usuario/index.html#platforms',303);
  const result=await token({grant_type:'authorization_code',code:u.searchParams.get('code')||'',redirect_uri:callback,code_verifier:flow.verifier}),user=await identity(result.access_token);
  const existing=await checked(db.from('stream_kick_channels').select('broadcaster_id').eq('workspace_id',flow.workspace_id).maybeSingle());if(existing&&existing.broadcaster_id!==user.id)return json({error:'Este espacio ya está vinculado a otro canal Kick.'},409);
  await checked(db.from('stream_kick_channels').upsert({workspace_id:flow.workspace_id,broadcaster_id:user.id}));const saved=await saveToken(flow.workspace_id,result);
  await subscribeChat(flow.workspace_id,user.id,saved.access_token);
  await checked(db.from('stream_platform_connections').upsert({workspace_id:flow.workspace_id,platform:'kick',platform_user_id:user.id,username:user.slug,display_name:user.name,scopes:saved.scopes,connected:true,token_expires_at:saved.expires_at,updated_at:new Date().toISOString()},{onConflict:'workspace_id,platform'}));
  return Response.redirect('https://sanlean.com.ar/Usuario/index.html#platforms',303);
 }
 if(req.method!=='POST'||!['status','connect'].includes(route||''))return json({error:'not_found'},404);
 const body=await req.json(),workspaceId=body.workspaceId;if(typeof workspaceId!=='string'||!validState(workspaceId))return json({error:'invalid_workspace'},400);const userId=await owner(req,workspaceId);
 if(route==='connect'){
  if(!clientId||!clientSecret)return json({error:'Falta configurar la aplicación Kick de SanLean.'},503);
  const {verifier,challenge}=await pkce();await checked(db.from('stream_kick_oauth').delete().eq('workspace_id',workspaceId));const flow=await checked(db.from('stream_kick_oauth').insert({workspace_id:workspaceId,user_id:userId,verifier}).select('state').single());
  return json({url:'https://id.kick.com/oauth/authorize?'+new URLSearchParams({response_type:'code',client_id:clientId,redirect_uri:callback,state:flow.state,scope:SCOPES.join(' '),code_challenge:challenge,code_challenge_method:'S256'})});
 }
 const configured=!!(clientId&&clientSecret);if(!configured)return json({configured,connected:false});
 const channel=await checked(db.from('stream_kick_channels').select('broadcaster_id').eq('workspace_id',workspaceId).maybeSingle()),stored=await checked(db.from('stream_platform_tokens').select('*').eq('workspace_id',workspaceId).eq('platform','kick').maybeSingle());if(!channel||!stored)return json({configured,connected:false});
 try{const current=await activeToken(workspaceId,stored),user=await identity(current.access_token);if(user.id!==channel.broadcaster_id)throw new Error('KickAuthorization');const chat=await checked(db.from('stream_chat_subscriptions').select('connected').eq('workspace_id',workspaceId).eq('platform','kick').maybeSingle());return json({configured,connected:true,chatConnected:!!chat?.connected,reauthorize:!chat?.connected,name:user.name,scopes:current.scopes})}catch(e){if((e as Error).message!=='KickAuthorization')throw e;await checked(db.from('stream_platform_connections').update({connected:false}).eq('workspace_id',workspaceId).eq('platform','kick'));return json({configured,connected:false,reauthorize:true})}
 }catch(e){const m=(e as Error).message;return json({error:m==='Unauthorized'?'Sesión vencida. Volvé a ingresar.':m==='Forbidden'?'Solo el propietario puede conectar este canal.':m==='KickAuthorization'?'Kick requiere autorizar la conexión otra vez.':'No se pudo completar la conexión con Kick. Reintentá.'},m==='Unauthorized'?401:m==='Forbidden'?403:502)}});
