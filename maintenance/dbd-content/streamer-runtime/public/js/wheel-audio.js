'use strict';
(()=>{
  const files={digital:'digital.wav',dry:'rueda_seca_clean.wav',round:'rueda_redonda_clean.wav',deep:'rueda_profunda_clean.wav'},perkFiles=files;
  class WheelAudio{
    constructor(){this.context=new AudioContext();this.buffers=new Map();this.sources=new Map();this.ready=Promise.all(Object.values(files).map(async file=>{const r=await fetch('/audio/streamer/'+file);if(!r.ok)throw Error('Falta '+file);this.buffers.set(file,await this.context.decodeAudioData(await r.arrayBuffer()));}));this.ready.catch(()=>{});const resume=()=>this.context.resume().catch(()=>{});addEventListener('pointerdown',resume);addEventListener('keydown',resume);addEventListener('pagehide',()=>this.stopAll());resume();}
    stop(channel){const source=this.sources.get(channel);if(source){const t=this.context.currentTime;source.envelope.gain.cancelAndHoldAtTime(t);source.envelope.gain.linearRampToValueAtTime(0,t+.002);try{source.stop(t+.002);}catch{}this.sources.delete(channel);}}
    stopAll(){for(const key of this.sources.keys())this.stop(key);}
    play(tool,type,channel,detail,volume=55){
      const file=(tool==='killer-wheel'?files:perkFiles)[type],buffer=this.buffers.get(file),t=this.context.currentTime;if(!buffer||this.context.state!=='running'||(!detail.preview&&t-(this.lastTick??-Infinity)<.05))return false;
      // One principal voice across all slots; only 2ms of replacement crossfade.
      // The 50ms gate follows real rendered steps, never an independent timer.
      this.stopAll();this.lastTick=t;const source=this.context.createBufferSource(),gain=this.context.createGain(),level=(tool==='killer-wheel'?.45:.18)*Math.max(0,Math.min(100,volume))/100;source.buffer=buffer;source.playbackRate.value=1;source.envelope=gain;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(level,t+.002);gain.gain.setValueAtTime(level,t+Math.max(.002,buffer.duration-.003));gain.gain.linearRampToValueAtTime(0,t+buffer.duration);source.connect(gain).connect(this.context.destination);this.sources.set(channel,source);source.onended=()=>{if(this.sources.get(channel)===source)this.sources.delete(channel);source.disconnect();gain.disconnect();};source.start(t);
      dispatchEvent(new CustomEvent('sanlean-wheel-audio',{detail:{...detail,tool,type,file,channel,pitch:1,volume,gain:level,voices:this.sources.size,contextTime:t,at:performance.now()}}));return true;
    }
    async preview(tool,type,volume=55){await this.ready;await this.context.resume();return this.play(tool,type,'preview',{preview:true},volume);}
    attach(stage,tool,allowed){
      stage.addEventListener('sanlean-roulette-step',e=>{const config=allowed();if(!config?.soundEnabled)return;this.play(tool,config.soundType,tool+':'+e.detail.slot,{...e.detail,preview:false},config.soundVolume);});
    }
  }
  window.SanLeanWheelAudio=WheelAudio;
})();
