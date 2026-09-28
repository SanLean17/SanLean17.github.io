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
  async function request(action,ctx){const response=await fetch(window.SANLEAN_SUPABASE.url+'/functions/v1/stream-bits/'+action,{method:'POST',headers:{Authorization:'Bearer '+ctx.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({workspaceId:ctx.workspace.id}),signal:AbortSignal.timeout(15000)});const data=await response.json();if(!response.ok)throw new Error(data.error||'No se pudo consultar Twitch.');return data}
  async function refresh(){
    const host=document.getElementById('connectionGrid')||document.querySelector('#section-connections .account-functional-box');if(!host)return;
    const version=++revision;
    host.innerHTML='<div class="sl-connections"><h3>TWITCH</h3><p data-state role="status">Consultando conexión…</p><div class="module-actions center-actions"><button type="button" class="primary-btn system-btn module-primary" data-connect disabled>CONECTAR TWITCH</button><button type="button" class="outline-btn system-btn module-secondary" data-refresh>ACTUALIZAR</button></div><p>Una sola vinculación para tu cuenta de SanLean: MI PANEL, MI CUENTA y Bits/Alertas comparten el mismo canal.</p><p>Usamos OAuth: autorizás el acceso en Twitch y SanLean no solicita ni guarda tu contraseña de Twitch. El permiso actual permite recibir eventos de bits. Podés revocar el acceso desde las conexiones de Twitch.</p><p>Si incorporamos funciones que necesiten otros permisos, Twitch te pedirá autorización antes de activarlas.</p><hr><h3>KICK</h3><p>Integración pendiente. Todavía no se solicitan permisos de Kick.</p></div>';
    const state=host.querySelector('[data-state]'),button=host.querySelector('[data-connect]');host.querySelector('[data-refresh]').onclick=refresh;
    try{const ctx=await context();if(version!==revision)return;
      if(!ctx){state.textContent='Iniciá sesión y seleccioná tu espacio de stream.';return}
      if(!ctx.workspace){state.textContent='Abrí MI PANEL una vez para preparar tu espacio de stream.';return}
      if(!ctx.owner){state.textContent='La conexión pertenece al propietario de este stream. Solo él puede autorizar Twitch.';return}
      const result=await request('status',ctx);if(version!==revision)return;
      state.textContent=result.connected?'TWITCH CONECTADO · BITS ACTIVOS':result.configured?'TWITCH SIN VINCULAR':'Pendiente de activar la aplicación de SanLean en Twitch Developers.';
      button.textContent=result.connected?'TWITCH VINCULADO':'CONECTAR TWITCH';button.disabled=result.connected||!result.configured;
      button.onclick=async()=>{button.disabled=true;try{const current=await context();if(!current?.owner||current.workspace.id!==ctx.workspace.id)throw new Error('Cambió el espacio de stream. Actualizá la conexión.');const data=await request('connect',current);location.assign(data.url)}catch(e){state.textContent=e.message;button.disabled=false}};
    }catch(e){if(version===revision)state.textContent=e.message}
  }
  window.SanLeanConnections={refresh};
  window.addEventListener('DOMContentLoaded',refresh);
  window.addEventListener('sanlean:overlays-updated',refresh);
  window.addEventListener('hashchange',()=>{if(['#platforms','#connections'].includes(location.hash))refresh()});
  window.addEventListener('focus',refresh);
})();
