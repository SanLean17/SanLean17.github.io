'use strict';
// Volatile, loopback-only display mirror. Never receives account/auth/collaborator data.
module.exports=function createMirror(){
 const sources=new Map();
 return async function mirror(req,res,url){
  if(!url.pathname.startsWith('/__sanlean_preview/'))return false;
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  const host=req.headers.host;
  if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host||'')){send(403,{error:'Host no permitido'});return true;}
  if(req.method!=='POST'||req.headers.origin!==`http://${host}`||req.headers['x-sanlean-local']!=='preview-v1'){send(403,{error:'Origen no permitido'});return true;}
  try{
   let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>12*1024*1024){send(413,{error:'Vista demasiado grande'});return true;}}
   const body=JSON.parse(raw),action=url.pathname.split('/').pop();
   if(action==='publish'){
    if(typeof body.source!=='string'||!Array.isArray(body.overlays)||!Array.isArray(body.bits))throw Error('Formato inválido');
    if(!sources.has(body.source)&&sources.size>=8)sources.delete(sources.keys().next().value);
    // Whitelist the visual fields. Private tokens, profiles and account settings are excluded.
    sources.set(body.source,{overlays:body.overlays.map(r=>({public_token:r.public_token,id:r.id,kind:r.kind,settings:r.settings,state:r.state,updated_at:r.updated_at})),bits:body.bits.map(r=>({token:r.token,sound:r.sound,timersPaused:r.timersPaused,active:r.active,events:r.events}))});
    send(200,{ok:true});return true;
   }
   if(action==='get_stream_overlay_delta'){
    const row=[...sources.values()].flatMap(s=>s.overlays).find(r=>r.public_token===body.p_token);
    send(200,row?[{revision:row.updated_at,payload:row.updated_at===body.p_revision?null:{overlay_id:row.id,kind:row.kind,settings:row.settings,state:row.state,updated_at:row.updated_at,can_control:false}}]:[]);return true;
   }
   if(action==='get_stream_bits_feed'){
    const row=[...sources.values()].flatMap(s=>s.bits).find(r=>r.token===body.p_token);
    send(200,row?{...row,events:row.events.filter(e=>!body.p_after||e.created_at>body.p_after),cursor:new Date().toISOString()}:{active:[],events:[],cursor:new Date().toISOString(),sound:false});return true;
   }
   send(404,{error:'Operación no disponible'});
  }catch{send(400,{error:'Datos de vista no válidos'});}
  return true;
 };
};
