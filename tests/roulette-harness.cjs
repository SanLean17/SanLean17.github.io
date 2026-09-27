// Local browser fixture: every database request stays in this in-memory fake.
module.exports=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="../css/style.css"><link rel="stylesheet" href="../css/usuario.css"><link rel="stylesheet" href="../css/usuario-stream-modules.css"><link rel="stylesheet" href="../css/roulette-view.css"></head><body class="user-page"><main style="max-width:1000px;margin:30px auto"><div id="roulettePanel"><div class="panel-tools"><input id="panelSearch"><button id="resetWeights">RESTABLECER</button></div><div id="weightGrid"></div></div><section id="streamOverlaysPanel" hidden><select id="workspaceSelect"></select><div id="overlayGrid"></div></section></main><script>
window.fixtureSettings={weights:{},bonusEntries:{}};
window.SanLeanAccount={getSettings:()=>structuredClone(fixtureSettings),flushSettings:async()=>true,queueSettings:s=>{fixtureSettings=structuredClone(s)}};
window.SANLEAN_SUPABASE={url:'https://example.invalid',publishableKey:'fixture'};
const rows=['roulette_killers','roulette_killer_perks','roulette_survivor_perks','vote','giveaway'].map(kind=>({id:kind,kind,workspace_id:'w1',public_token:'fixture-public',control_token:'fixture-control',settings:{},state:{visible:false,status:'idle',items:[]}}));
window.fixtureRows=rows;
window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:'owner'}}}}),onAuthStateChange(){}},from(table){
  let filters=[],payload=null;
  const response=()=>{if(table==='streamer_workspaces')return{data:[{id:'w1',name:'Stream de prueba',owner_user_id:'owner'}]};if(table==='user_roulette_settings')return{data:{settings:fixtureSettings}};if(table==='stream_giveaway_sessions')return{data:null};let matched=rows.filter(row=>filters.every(([key,value])=>row[key]===value));if(payload)matched.forEach(row=>Object.assign(row,structuredClone(payload)));return{data:matched}};
  const q={select(){return q},eq(key,value){filters.push([key,value]);return q},order(){return q},limit(){return q},update(value){payload=value;return q},single:async()=>{const result=response();return{data:Array.isArray(result.data)?result.data[0]:result.data}},maybeSingle:async()=>response(),then(resolve,reject){return Promise.resolve(response()).then(resolve,reject)}};return q;
}})};
</script><script src="../js/usuario.js"></script><script src="../js/roulette-view.js"></script><script src="../js/stream-tools.js"></script><script src="../js/usuario-roulettes.js"></script></body></html>`;
