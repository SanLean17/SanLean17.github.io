'use strict';
(()=>{
  const key=location.pathname.split('/').pop(),kinds={'killer-wheel':'roulette_killers','perks-killer':'roulette_killer_perks','perks-survivor':'roulette_survivor_perks'},stage=document.getElementById('wheelStage'),audio=new SanLeanWheelAudio();let state,connected=false;
  audio.attach(stage,key,()=>connected&&state?.state.visible&&state?.state.status==='spinning'?state:null);
  const catalogName={'killer-wheel':'killers','perks-killer':'perks-killer','perks-survivor':'perks-survivor'}[key],folder={'killer-wheel':'killers','perks-killer':'killer','perks-survivor':'survivor'}[key];
  (async()=>{
    const catalog=(await SanLeanDBDCatalog.load(catalogName)).map(i=>({...i,image:'/'+(i.image||folder+'/'+i.key+'.png')}));
    const stream=new SanLeanLocalEvents('/events/tools?surface=overlay&tool='+key);
    stream.onmessage=e=>{const packet=JSON.parse(e.data);connected=true;state=packet.state.tools[key];window.wheelState=state;const pool=SanLeanRouletteEntries.pool(catalog,state,key==='killer-wheel'&&state.repeatMode==='remove');
      if(!state.soundEnabled||!state.state.visible||state.state.status!=='spinning')audio.stopAll();
      SanLeanRouletteView.render(stage,{kind:kinds[key],settings:{pool},state:state.state});
      window.SanLeanOverlayLoader?.ready();
    };
    stream.onerror=()=>{connected=false;audio.stopAll();window.SanLeanOverlayLoader?.waiting();};
    window.wheelAudio=audio;
  })().catch(e=>{console.error(e);stage.textContent='';});
})();
