(()=>{
  let workspaceId=null,cursor=null,busy=false,generation=0,realtimeChannel=null,realtimeStatus='idle';
  const seen=new Set();
  function receive(row){
    if(row.workspace_id!==workspaceId||seen.has(row.platform+':'+row.message_id))return;
    seen.add(row.platform+':'+row.message_id);if(seen.size>2000)seen.delete(seen.values().next().value);
    const detail={platform:row.platform,userId:row.user_id,username:row.username,message:row.message,sentAt:row.sent_at,workspaceId};
    const round=window.SanLeanCards?.getState();
    if(round?.workspaceId===workspaceId&&Date.parse(row.sent_at)>=round.startedAt&&(round.platform==='both'||round.platform===row.platform))window.SanLeanCards.receiveChatMessage({username:row.platform+':'+row.user_id,message:row.message,sentAt:row.sent_at});
    const vote=window.SanLeanPoll?.getState();if(vote?.workspaceId===workspaceId&&Date.parse(row.sent_at)>=vote.startedAt)window.SanLeanPoll.ingestVote(row.platform+':'+row.user_id,row.message);
    window.dispatchEvent(new CustomEvent('sanlean:chat-message',{detail}));
    const log=document.getElementById('streamChatMessages');if(log){const item=document.createElement('p'),name=document.createElement('strong');name.textContent=row.platform.toUpperCase()+' · '+row.username+': ';item.append(name,document.createTextNode(row.message));log.append(item);while(log.children.length>50)log.firstElementChild.remove();log.scrollTop=log.scrollHeight}
  }
  function stopRealtime(){const db=window.sanleanSupabase;if(realtimeChannel&&db?.removeChannel)db.removeChannel(realtimeChannel).catch?.(()=>{});realtimeChannel=null;realtimeStatus='idle'}
  function startRealtime(id){const db=window.sanleanSupabase;if(!db||!id)return;stopRealtime();realtimeStatus='connecting';const channelName='sanlean-chat-'+id+'-'+Date.now();realtimeChannel=db.channel(channelName).on('postgres_changes',{event:'INSERT',schema:'public',table:'stream_chat_messages',filter:'workspace_id=eq.'+id},payload=>{const row=payload?.new;if(row?.workspace_id===workspaceId)receive(row)}).subscribe(status=>{realtimeStatus=status==='SUBSCRIBED'?'subscribed':status;const el=document.getElementById('streamChatStatus');if(el&&status==='SUBSCRIBED')el.textContent='Chat en tiempo real conectado. CARTAS recibe mensajes apenas llegan a SanLean.'})}
  async function poll(){
    const db=window.sanleanSupabase,id=window.SanLeanStreamTools?.getWorkspace()?.id||null;
    if(id!==workspaceId){workspaceId=id;cursor=null;seen.clear();generation++;document.getElementById('streamChatMessages')?.replaceChildren();if(id)startRealtime(id);else stopRealtime()}
    if(!db||!id||busy)return;busy=true;const version=generation;
    try{
      let q=db.from('stream_chat_messages').select('id,workspace_id,platform,message_id,user_id,username,message,sent_at').eq('workspace_id',id);
      if(cursor===null){const {data,error}=await q.order('id',{ascending:false}).limit(1);if(error)throw error;if(version!==generation)return;cursor=data?.[0]?.id||0;return}
      const {data,error}=await q.gt('id',cursor).gt('created_at',new Date(Date.now()-60000).toISOString()).order('id').limit(200);if(error)throw error;
      if(version!==generation||window.SanLeanStreamTools?.getWorkspace()?.id!==id)return;
      for(const row of data||[]){receive(row);cursor=row.id}
      const status=document.getElementById('streamChatStatus');if(status&&realtimeStatus!=='subscribed')status.textContent='Recepción preparada. Realtime se está conectando; el polling queda activo como respaldo.';
    }catch{const status=document.getElementById('streamChatStatus');if(status)status.textContent='No se pudo consultar el chat. Revisá la conexión y los permisos de tu espacio.'}finally{busy=false}
  }
  function mount(){const host=document.getElementById('streamPlatformsPanel')||document.getElementById('connectionGrid')?.parentElement;if(!host||document.getElementById('streamChatMessages'))return;const box=document.createElement('section');box.className='module-box';box.innerHTML='<h3>MENSAJES DEL CHAT</h3><p id="streamChatStatus" role="status">Los mensajes nuevos de tus canales se reciben aquí.</p><div id="streamChatMessages" class="stream-chat-messages" aria-label="Mensajes de Twitch y Kick"></div>';host.append(box)}
  window.addEventListener('sanlean:overlays-updated',()=>{mount();poll()});window.addEventListener('beforeunload',stopRealtime);
  window.addEventListener('DOMContentLoaded',()=>{mount();poll()});setInterval(()=>{mount();poll()},800);
})();
