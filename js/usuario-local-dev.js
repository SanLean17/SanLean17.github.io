/* Local-only adapter. Must load before every USUARIO script. No production side effects. */
(() => {
  'use strict';
  if (!['localhost', '127.0.0.1'].includes(location.hostname) || !/^\/usuario\//i.test(location.pathname)) return;
  window.gtag=()=>{};
  const policy = document.createElement('meta');
  policy.httpEquiv = 'Content-Security-Policy';
  policy.content = "connect-src 'self'; form-action 'self'";
  document.head.append(policy);
  Object.defineProperty(window,'SANLEAN_SUPABASE',{configurable:false,get:()=>({url:location.origin+'/__sanlean_local',publishableKey:'LOCAL-DEMO'}),set(){}});
  const KEY = 'sanlean-local-development-v1', OWNER = 'local-owner', WS = 'local-stream';
  const permissions = ['overlays','votes','challenges','giveaways','bits','platforms','killers','killerPerks','survivor','tournament'];
  const now = () => new Date().toISOString();
  const clone = value => structuredClone(value);
  const ok = data => ({data: clone(data), error: null});
  const unavailable = () => ({data:null,error:{code:'LOCAL_UNAVAILABLE',message:'No disponible en MODO DESARROLLO LOCAL. No se contactó ningún servicio real.'}});
  function seed() {
    return {
      user_profiles:[{user_id:'local-collaborator',first_name:'Colaborador',last_name:'Demo local',username:'colaborador_demo',role:'collaborator',onboarding_completed:true},{user_id:OWNER,first_name:'Propietario',last_name:'Demo local',username:'demo_local',role:'owner',onboarding_completed:true}],
      user_roulette_settings:[{user_id:OWNER,settings:{weights:{},bonusEntries:{}}}],
      streamer_workspaces:[{id:WS,owner_user_id:OWNER,name:'STREAM DEMO LOCAL',created_at:now()}],
      workspace_members:[{user_id:'local-collaborator',workspace_id:WS,identifier:'colaborador_demo',role:'collaborator',permissions:['votes','giveaways','overlays']}],
      stream_platform_connections:['twitch','kick'].map(platform=>({id:'local-'+platform,workspace_id:WS,platform,connected:true,platform_username:'canal_demo_local',scopes:['moderator:read:followers']})),
      stream_overlays:[],stream_giveaway_sessions:[],stream_giveaway_entries:[],stream_chat_messages:[],
      stream_bits_settings:[{id:'local-bits',workspace_id:WS,public_token:'local-bits-demo',alert_token:'local-bits-demo',sound_enabled:true,activations_paused:false,timers_paused:false}],
      stream_bits_rules:[{id:'local-rule',workspace_id:WS,bits:100,kind:'killers',item_key:'trapper',item_name:'Trampero · DEMO',image:'../assets/killers/K01_TheTrapper_Portrait.png',quantity:2,duration_minutes:60,alert_style:'neutral'}],
      stream_bits_events:[],stream_bits_bonuses:[]
    };
  }
  function read() {
    const raw=localStorage.getItem(KEY);
    if(raw) return JSON.parse(raw);
    const db=seed();write(db);return db;
  }
  let publishTimer=null,publishing=false,publishAgain=false;
  const isPanel=/\/(index\.html)?$/i.test(location.pathname);
  function write(db) { localStorage.setItem(KEY,JSON.stringify(db)); if(isPanel){clearTimeout(publishTimer);publishTimer=setTimeout(publishPreview,80);} }
  async function publishPreview(){
    if(publishing){publishAgain=true;return;}publishing=true;
    try{
      const db=read();let source=localStorage.getItem('sanlean-local-preview-source');if(!source){source=crypto.randomUUID();localStorage.setItem('sanlean-local-preview-source',source);}
      const bits=db.stream_bits_settings.map(s=>({token:s.alert_token||s.public_token,sound:s.sound_enabled,timersPaused:s.timers_paused,active:db.stream_bits_bonuses.filter(b=>b.workspace_id===s.workspace_id),events:db.stream_bits_events.filter(e=>e.workspace_id===s.workspace_id).slice(-100)}));
      const response=await nativeFetch('/__sanlean_preview/publish',{method:'POST',headers:{'Content-Type':'application/json','X-SanLean-Local':'preview-v1'},body:JSON.stringify({source,overlays:db.stream_overlays.map(({id,public_token,kind,settings,state,updated_at})=>({id,public_token,kind,settings,state,updated_at})),bits})});
      const status=document.getElementById('localPreviewConnection');if(status)status.textContent=response.ok?'Monitor conectado. Las URLs de visualización también funcionan en OBS de esta PC.':'Vista en navegador disponible. Reiniciá el servidor local para habilitar OBS.';
    }catch{const status=document.getElementById('localPreviewConnection');if(status)status.textContent='Vista en navegador disponible. Reiniciá el servidor local para habilitar OBS.';}
    finally{publishing=false;if(publishAgain){publishAgain=false;publishPreview();}}
  }
  const listeners = new Set();
  let signedIn=true;
  const session=()=>signedIn?{access_token:'LOCAL-DEMO-NOT-A-JWT',user:{id:sessionStorage.getItem('sanlean-local-role')==='collaborator'?'local-collaborator':OWNER,email:sessionStorage.getItem('sanlean-local-role')==='collaborator'?'colaborador@demo.invalid':'propietario@demo.invalid',user_metadata:{}}}:null;
  class Query {
    constructor(table){this.table=table;this.filters=[];this.op='select';this.one=false;this.optional=false;this.max=Infinity;}
    select(){return this;}
    eq(k,v){this.filters.push(r=>r[k]===v);return this;}
    neq(k,v){this.filters.push(r=>r[k]!==v);return this;}
    in(k,v){this.filters.push(r=>v.includes(r[k]));return this;}
    is(k,v){return this.eq(k,v);}
    gt(k,v){this.filters.push(r=>r[k]>v);return this;}
    gte(k,v){this.filters.push(r=>r[k]>=v);return this;}
    lt(k,v){this.filters.push(r=>r[k]<v);return this;}
    lte(k,v){this.filters.push(r=>r[k]<=v);return this;}
    order(k,o={}){this.sort={k,asc:o.ascending!==false};return this;}
    limit(n){this.max=n;return this;}
    abortSignal(){return this;}
    single(){this.one=true;return this;}
    maybeSingle(){this.one=true;this.optional=true;return this;}
    insert(v){this.op='insert';this.value=v;return this;}
    upsert(v,o={}){this.op='upsert';this.value=v;this.conflict=o.onConflict||'id';return this;}
    update(v){this.op='update';this.value=v;return this;}
    delete(){this.op='delete';return this;}
    then(resolve,reject){return Promise.resolve().then(()=>this.execute()).then(resolve,reject);}
    execute(){
      const db=read();if(!Object.hasOwn(db,this.table))return unavailable();
      const all=db[this.table],matches=r=>this.filters.every(f=>f(r));let rows=all.filter(matches);
      if(this.op==='insert'||this.op==='upsert'){
        rows=(Array.isArray(this.value)?this.value:[this.value]).map(value=>{
          const keys=(this.conflict||'id').split(',');const old=this.op==='upsert'?all.find(r=>keys.every(k=>value[k]!==undefined&&r[k]===value[k])):null;
          if(old){Object.assign(old,clone(value),{updated_at:now()});return old;}
          const row={id:crypto.randomUUID(),created_at:now(),updated_at:now(),...clone(value)};
          if(this.table==='stream_overlays')Object.assign(row,{public_token:crypto.randomUUID(),control_token:crypto.randomUUID()});
          all.push(row);return row;
        });
      } else if(this.op==='update') rows.forEach(r=>Object.assign(r,clone(this.value),{updated_at:now()}));
      else if(this.op==='delete') db[this.table]=all.filter(r=>!matches(r));
      if(this.op!=='select')write(db);
      if(this.sort){const {k,asc}=this.sort;rows.sort((a,b)=>(a[k]>b[k]?1:a[k]<b[k]?-1:0)*(asc?1:-1));}
      rows=rows.slice(0,this.max);
      if(this.one&&(rows.length>1||(!rows.length&&!this.optional)))return {data:null,error:{code:'PGRST116',message:'La consulta local esperaba una fila.'}};
      return {...ok(this.one?rows[0]||null:rows),count:rows.length};
    }
  }
  async function rpc(name,p={}){
    const db=read();
    if(name==='sanlean_owner_list_collaborators')return ok(db.workspace_members);
    if(name==='sanlean_owner_remove_collaborator'){db.workspace_members=db.workspace_members.filter(r=>r.user_id!==p.p_user_id);write(db);return ok(true);}
    if(name==='sanlean_owner_upsert_collaborator'){
      let member=db.workspace_members.find(r=>r.identifier===p.p_identifier);
      if(!member){member={user_id:crypto.randomUUID(),workspace_id:WS,role:'collaborator',identifier:p.p_identifier};db.workspace_members.push(member);}
      member.permissions=p.p_permissions.filter(v=>permissions.includes(v));write(db);return ok(true);
    }
    if(name==='get_stream_overlay_delta'){
      const row=db.stream_overlays.find(r=>[r.public_token,r.control_token].includes(p.p_token));
      return ok(row?[{revision:row.updated_at,payload:p.p_revision===row.updated_at?null:{...row,overlay_id:row.id,can_control:row.control_token===p.p_token}}]:[]);
    }
    if(name==='update_stream_overlay_by_control'){
      const row=db.stream_overlays.find(r=>r.control_token===p.p_token);if(!row)return ok(false);
      row.state=p.p_state;row.updated_at=now();write(db);return ok(true);
    }
    if(name==='get_stream_bits_feed'){
      const settings=db.stream_bits_settings.find(r=>(r.public_token===p.p_token||r.alert_token===p.p_token));if(!settings)return unavailable();
      return ok({cursor:now(),sound:settings.sound_enabled,timersPaused:settings.timers_paused,active:db.stream_bits_bonuses.filter(r=>r.workspace_id===settings.workspace_id),events:db.stream_bits_events.filter(r=>r.workspace_id===settings.workspace_id&&(!p.p_after||r.created_at>p.p_after))});
    }
    return unavailable();
  }
  const client={from:table=>new Query(table),rpc,auth:{
    getSession:async()=>ok({session:session()}),getUser:async()=>ok({user:session()?.user||null}),
    onAuthStateChange(fn){listeners.add(fn);return {data:{subscription:{unsubscribe:()=>listeners.delete(fn)}}};},
    async signInWithPassword(){signedIn=true;listeners.forEach(fn=>fn('SIGNED_IN',session()));return ok({session:session(),user:session().user});},
    async signOut(){signedIn=false;listeners.forEach(fn=>fn('SIGNED_OUT',null));return ok(null);},
    updateUser:async()=>unavailable(),resetPasswordForEmail:async()=>unavailable(),signInWithOAuth:async()=>unavailable()
  },functions:{invoke:async()=>unavailable()},channel(){const channel={on(){return channel;},subscribe(){return channel;},unsubscribe:async()=>{}};return channel;},removeChannel:async()=>{}};
  // All existing createClient consumers get this adapter, even after the CDN loads.
  Object.defineProperty(window,'supabase',{configurable:false,get:()=>({createClient:()=>client}),set(){}});
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async(input,options={})=>{
    const url=new URL(typeof input==='string'||input instanceof URL?String(input):input.url,location.href);
    if(url.hostname.endsWith('.supabase.co')||url.pathname.startsWith('/__sanlean_local/')){
      let body={};try{body=JSON.parse(options.body||'{}');}catch{}
      let result;
      if(url.pathname.includes('/rest/v1/rpc/')){
        const name=url.pathname.split('/').pop();
        if(['get_stream_overlay_delta','get_stream_bits_feed'].includes(name)&&!isPanel){
          try{const response=await nativeFetch('/__sanlean_preview/'+name,{method:'POST',headers:{'Content-Type':'application/json','X-SanLean-Local':'preview-v1'},body:JSON.stringify(body)});if(response.ok){const data=await response.json();if(name==='get_stream_bits_feed'||data.length)return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});}}catch{}
        }
        result=await rpc(name,body);
      }
      else result=await edge(url.pathname,body);
      return new Response(JSON.stringify(result.error?{error:result.error.message}:result.data),{status:result.error?503:200,headers:{'Content-Type':'application/json'}});
    }
    if(url.origin!==location.origin)throw new Error('MODO DESARROLLO LOCAL: conexión externa bloqueada.');
    return nativeFetch(input,options);
  };
  async function edge(path,p){
    const db=read(),settings=db.stream_bits_settings.find(r=>r.workspace_id===(p.workspaceId||WS));
    const action=path.split('/').pop();
    if(action==='status')return ok({simulated:true,configured:false,connected:false,name:'SIMULACIÓN LOCAL',chatConnected:false,activationsPaused:settings?.activations_paused,timersPaused:settings?.timers_paused,settings});
    if(action==='resolve')return ok({harmful:'',beneficial:''});
    if(action==='set-activations-paused'||action==='set-timers-paused'){
      if(action==='set-timers-paused'&&settings.timers_paused!==!!p.paused){
        db.stream_bits_bonuses.filter(r=>r.workspace_id===settings.workspace_id).forEach(row=>{
          if(p.paused&&row.expires_at)row.paused_remaining_seconds=Math.max(0,(Date.parse(row.expires_at)-Date.now())/1000);
          if(!p.paused&&row.paused_remaining_seconds!==null){row.expires_at=new Date(Date.now()+row.paused_remaining_seconds*1000).toISOString();row.paused_remaining_seconds=null;}
        });
      }
      settings[action==='set-activations-paused'?'activations_paused':'timers_paused']=!!p.paused;write(db);return ok({settings});
    }
    if(action==='test-alert'){
      db.stream_bits_events.push({id:crypto.randomUUID(),workspace_id:p.workspaceId||WS,created_at:now(),donor:'Donante DEMO',bits:100,item_name:'Alerta simulada',alert_style:p.style||'neutral',quantity:2,kind:'killers',item_key:'trapper'});write(db);return ok({success:true});
    }
    return unavailable();
  }
  function simulateBits(){
    const db=read(),rule=db.stream_bits_rules.find(r=>r.workspace_id===WS),settings=db.stream_bits_settings.find(r=>r.workspace_id===WS);
    if(!rule||settings.activations_paused){alert('Agregá una regla y habilitá las activaciones de Bits.');return;}
    const event={id:crypto.randomUUID(),workspace_id:WS,created_at:now(),donor:'Donante_demo',bits:rule.bits,item_name:rule.item_name,quantity:rule.quantity,image:rule.image,alert_style:rule.alert_style};
    db.stream_bits_events.push(event);
    for(let i=0;i<rule.quantity;i++)db.stream_bits_bonuses.push({id:crypto.randomUUID(),workspace_id:WS,event_id:event.id,kind:rule.kind,item_key:rule.item_key,item_name:rule.item_name,donor:event.donor,quantity:1,created_at:now(),expires_at:rule.duration_minutes?new Date(Date.now()+rule.duration_minutes*60000).toISOString():null,paused_remaining_seconds:settings.timers_paused&&rule.duration_minutes?rule.duration_minutes*60:null});
    write(db);
  }
  function addDemoParticipants(people=null){
    const db=read(),active=db.stream_giveaway_sessions.find(r=>r.status==='active'&&r.workspace_id===(window.SanLeanStreamTools?.getWorkspace()?.id||WS));
    if(!active){alert('Iniciá un sorteo para agregar participantes demo.');return;}
    (Array.isArray(people)?people:['Luna_demo','Sol_demo','Nico_demo','Vale_demo','Alex_demo'].map(name=>({name}))).forEach((person,i)=>{
      const name=person.name;
      if(db.stream_giveaway_entries.some(r=>r.session_id===active.id&&r.participant_external_id===name))return;
      db.stream_giveaway_entries.push({id:crypto.randomUUID(),session_id:active.id,participant_external_id:name,participant_name:name,platform:person.platform||(active.platform==='kick'?'kick':'twitch'),eligible:true,excluded:false,eligibility:{is_subscriber:person.isSubscriber??true,is_vip:person.isVip??true},created_at:now()});
    });write(db);return true;
  }
  if(!localStorage.getItem('sanlean-tournament-demo-history'))localStorage.setItem('sanlean-tournament-demo-history',JSON.stringify([{id:1,name:'TORNEO DEMO LOCAL',period:new Date().toISOString().slice(0,7),bestTimesCount:3,state:'finished',logo:'',players:[['Luna_demo',1,12,500],['Sol_demo',1,18,200],['Nico_demo',1,25,0]]}]));
  window.SanLeanLocal=Object.freeze({active:true,addDemoParticipants,publishPreview});
  if(isPanel){setInterval(publishPreview,5000);window.addEventListener('storage',event=>{if(event.key===KEY)publishPreview();});}
  document.addEventListener('DOMContentLoaded',()=>{
    // OBS outputs remain clean; the development notice belongs only to the control panel.
    if(/\/(overlay|alertas)\.html$/i.test(location.pathname))return;
    const banner=document.createElement('aside');banner.id='localDevelopmentBanner';banner.className='module-box';banner.setAttribute('aria-label','Modo desarrollo local');
    const title=document.createElement('strong');title.textContent='MODO DESARROLLO LOCAL · IDENTIDAD DEMO';
    const copy=document.createElement('p');copy.textContent='Datos ficticios guardados en este navegador. Twitch/Kick, chat y Bits son simulados. Auth, OAuth, EventSub y servicios reales no están disponibles.';
    banner.append(title,copy);
    if(!/\/(overlay|alertas)\.html$/i.test(location.pathname)){
      const roles=document.createElement('div');roles.className='module-actions';
      for(const [role,label] of [['owner','VER COMO PROPIETARIO'],['collaborator','VER COMO COLABORADOR']]){
        const button=document.createElement('button');button.className='module-secondary';button.textContent=label;button.onclick=()=>{sessionStorage.setItem('sanlean-local-role',role);location.reload();};roles.append(button);
      }
      banner.append(roles);
    }
    if(/\/(index\.html)?$/i.test(location.pathname)){
      const actions=document.createElement('div');actions.className='module-actions';
      const participants=document.createElement('button');participants.className='module-secondary';participants.textContent='AGREGAR PARTICIPANTES DEMO';participants.onclick=addDemoParticipants;
      const vote=document.createElement('button');vote.className='module-secondary';vote.textContent='SIMULAR VOTO A';vote.onclick=()=>{const db=read();db.stream_chat_messages.push({id:Date.now(),workspace_id:WS,message_id:crypto.randomUUID(),user_id:crypto.randomUUID(),username:'Votante_demo',message:'A',platform:window.SanLeanCards?.getState()?.platform==='kick'?'kick':'twitch',sent_at:now(),created_at:now(),metadata:{}});write(db);};
      const bits=document.createElement('button');bits.className='module-secondary';bits.textContent='SIMULAR APORTE DE BITS';bits.onclick=simulateBits;actions.append(participants,vote);for(const letter of ['B','C','D','E']){const b=document.createElement('button');b.className='module-secondary';b.textContent='SIMULAR VOTO '+letter;b.onclick=()=>{const db=read();db.stream_chat_messages.push({id:Date.now(),workspace_id:WS,message_id:crypto.randomUUID(),user_id:crypto.randomUUID(),username:'Votante_demo',message:letter,platform:window.SanLeanCards?.getState()?.platform==='kick'?'kick':'twitch',sent_at:now(),created_at:now(),metadata:{}});write(db);};actions.append(b);}actions.append(bits);banner.append(actions);
      const preview=document.createElement('script');preview.src='../js/usuario-local-preview.js';document.head.append(preview);
    }
    if(!/\/(overlay|alertas)\.html$/i.test(location.pathname)){
      const details=document.createElement('details');details.id='localDevelopmentTools';
      const summary=document.createElement('summary');summary.textContent='Herramientas y límites de la demo';details.append(summary);
      while(banner.children.length>1)details.append(banner.children[1]);banner.append(details);
    }
    document.body.prepend(banner);
    const passwordStatus=document.getElementById('passwordStatus');if(passwordStatus)passwordStatus.textContent='No hay contraseñas reales en el modo local.';
    document.querySelectorAll('#savePassword,#sendRecoveryEmail,#completeRecovery').forEach(el=>{el.disabled=true;el.title='Auth real no disponible en desarrollo local';});
    document.querySelectorAll('#demoLogin input').forEach(el=>{el.required=false;});
    const submit=document.querySelector('#demoLogin button[type=submit]');if(submit)submit.textContent='ENTRAR A DEMO LOCAL';
  });
})();
