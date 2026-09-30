(()=>{
  const client=()=>window.sanleanSupabase||window.SanLeanConnectionsClient;
  let revision=0;
  async function context(){
    const db=client();if(!db)return null;
    const {data:{session},error}=await db.auth.getSession();if(error)throw error;if(!session)return null;
    const tools=window.SanLeanStreamTools;
    if(tools){const workspace=tools.getWorkspace();return workspace?{db,session,workspace,owner:workspace.owner_user_id===session.user.id}:null}
    const {data:workspace,error:e}=await db.from('streamer_workspaces').select('id,owner_user_id').eq('owner_user_id',session.user.id).maybeSingle();if(e)throw e;
    return {db,session,workspace,owner:!!workspace};
  }
  async function request(action,ctx,platform){const fn=platform==='kick'?'stream-kick':'stream-bits';const response=await fetch(window.SANLEAN_SUPABASE.url+'/functions/v1/'+fn+'/'+action,{method:'POST',headers:{Authorization:'Bearer '+ctx.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({workspaceId:ctx.workspace.id}),signal:AbortSignal.timeout(15000)});const data=await response.json();if(!response.ok)throw new Error(data.error||'No se pudo consultar la conexión.');return data}
  let shownWorkspace='';
  async function refresh(force=true){
    const host=document.getElementById('connectionGrid')||document.querySelector('#section-connections .account-functional-box');if(!host)return;
    let ctx;try{ctx=await context()}catch{host.textContent='No se pudo consultar tu sesión. Volvé a ingresar.';return}
    const key=ctx?.session.user.id+':'+ctx?.workspace?.id;
    if(!force&&shownWorkspace===key&&host.querySelector('.sl-connections'))return;shownWorkspace=key;const version=++revision;
    host.innerHTML='<div class="sl-connections"><p>Una sola vinculación por plataforma para tu cuenta de SanLean. MI PANEL y MI CUENTA comparten las conexiones.</p><p>Usamos OAuth: autorizás el acceso en la plataforma. SanLean no solicita ni guarda tu contraseña de Twitch o Kick. Podés revocar los permisos desde la plataforma.</p>'+['twitch','kick'].map(platform=>'<section data-connection="'+platform+'"><h3>'+platform.toUpperCase()+'</h3><p data-state role="status">Consultando conexión…</p><p>'+ (platform==='twitch'?'Permisos: recibir mensajes del chat y eventos de bits del canal.':'Permisos: leer tu identidad, los datos de tu canal y los mensajes del chat.')+'</p><div class="module-actions center-actions"><button type="button" class="primary-btn system-btn module-primary" data-connect disabled>CONECTAR '+platform.toUpperCase()+'</button></div></section>').join('<hr>')+'<button type="button" class="outline-btn system-btn module-secondary" data-refresh>ACTUALIZAR</button><p>Cuando una nueva función requiera permisos adicionales, se pedirá tu autorización antes de activarla.</p></div>';
    host.querySelector('[data-refresh]').onclick=()=>refresh(true);
    await Promise.all(['twitch','kick'].map(async platform=>{
      const card=host.querySelector('[data-connection="'+platform+'"]'),state=card.querySelector('[data-state]'),button=card.querySelector('[data-connect]');
      if(!ctx){state.textContent='Iniciá sesión y seleccioná tu espacio de stream.';return}
      if(!ctx.workspace){state.textContent='Abrí MI PANEL una vez para preparar tu espacio de stream.';return}
      if(!ctx.owner){state.textContent='Solo el propietario puede autorizar el canal de este stream.';return}
      try{const result=await request('status',ctx,platform);if(version!==revision||!card.isConnected)return;
        const name=platform.toUpperCase();state.textContent=result.connected?name+' CONECTADO'+(result.name?' · '+result.name:'')+(platform==='twitch'?' · BITS ACTIVOS':'')+(result.chatConnected?' · CHAT ACTIVO':' · CHAT PENDIENTE'):result.configured?name+' SIN VINCULAR':'Pendiente de configurar la aplicación '+name+' de SanLean.';
        button.textContent=result.reauthorize?'ACTUALIZAR PERMISOS':result.connected?name+' VINCULADO':'CONECTAR '+name;button.disabled=(result.connected&&!result.reauthorize)||!result.configured;
        button.onclick=async()=>{button.disabled=true;try{const current=await context();if(!current?.owner||current.workspace.id!==ctx.workspace.id)throw new Error('Cambió el espacio de stream. Actualizá la conexión.');const data=await request('connect',current,platform);location.assign(data.url)}catch(e){state.textContent=e.message;button.disabled=false}};
      }catch(e){state.textContent=e.message}
    }));
  }
  window.SanLeanConnections={refresh};
  window.addEventListener('DOMContentLoaded',()=>refresh(true));
  window.addEventListener('sanlean:overlays-updated',()=>refresh(false));
  window.addEventListener('hashchange',()=>{if(['#platforms','#connections'].includes(location.hash))refresh(true)});
})();
