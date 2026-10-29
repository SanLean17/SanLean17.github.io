/* Local decoded audio only. Playback never changes challenge state or randomness. */
(()=>{
  const assets={dry:'/audio/streamer/rueda_seca_clean.wav',digital:'/assets/audio/selection/tick_01_digital.wav',mechanical:'/assets/audio/selection/tick_02_mechanical.wav',neon:'/assets/audio/selection/tick_03_neon.wav',impact:'/assets/audio/reveal/lucadialessandro-cinematic-impact.mp3',sanlean:'/assets/audio/reveal/reveal_cinematic_01.wav'};
  const defaults={selectionSoundEnabled:true,selectionSoundType:'mechanical',selectionSoundVolume:55,resultSoundEnabled:true,resultSoundType:'sanlean',resultSoundVolume:70};
  class AudioEngine{
    constructor({context,offline=false}={}){
      this.context=context||new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});this.offline=offline;this.preferences={...defaults};this.buffers={};this.ticks=[];this.lastTick=-Infinity;this.result=null;this.seen=new Set();
      this.tickBus=this.context.createGain();this.resultBus=this.context.createGain();this.tickPreviewBus=this.context.createGain();this.resultPreviewBus=this.context.createGain();for(const bus of [this.tickBus,this.resultBus,this.tickPreviewBus,this.resultPreviewBus])bus.connect(this.context.destination);this.applyPreferences(defaults,true);
      this.ready=Promise.all(Object.entries(assets).map(async([key,url])=>{const r=await fetch(url);if(!r.ok)throw Error('No se pudo cargar un sonido.');this.buffers[key]=await this.context.decodeAudioData(await r.arrayBuffer());})).then(()=>{this.loaded=true;this.emit('ready');return this;});
      this.unlock=()=>this.context.resume?.().catch(()=>{});if(!offline){this.unlock();addEventListener('pointerdown',this.unlock);addEventListener('keydown',this.unlock);addEventListener('pagehide',()=>this.stopAll(0));}
    }
    emit(kind,data={}){if(!this.offline)dispatchEvent(new CustomEvent('sanlean-audio',{detail:{kind,at:performance.now(),contextTime:this.context.currentTime,...data}}));}
    applyPreferences(values,immediate=false){
      Object.assign(this.preferences,Object.fromEntries(Object.keys(defaults).filter(k=>k in values).map(k=>[k,values[k]])));
      for(const [bus,prefix,preview] of [[this.tickBus,'selection'],[this.resultBus,'result'],[this.tickPreviewBus,'selection',true],[this.resultPreviewBus,'result',true]]){const p=bus.gain,t=this.context.currentTime,value=preview||this.preferences[prefix+'SoundEnabled']?this.preferences[prefix+'SoundVolume']/100:0;p.cancelAndHoldAtTime(t);if(immediate||this.offline)p.setValueAtTime(value,t);else p.linearRampToValueAtTime(value,t+.015);}
    }
    canPlay(){return this.loaded&&(this.offline||this.context.state==='running');}
    tick(type=this.preferences.selectionSoundType,key='',force=false){
      if(!this.canPlay()||(!force&&!this.preferences.selectionSoundEnabled))return false;
      const buffer=this.buffers[type];if(!buffer)return false;
      const t=this.context.currentTime;if(!force&&t-this.lastTick<.05)return false;
      this.stopTicks();this.lastTick=t;
      const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;source.playbackRate.value=1;source.connect(gain);gain.connect(force?this.tickPreviewBus:this.tickBus);
      gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(1,t+.002);gain.gain.setValueAtTime(1,t+Math.max(.002,buffer.duration-.003));gain.gain.linearRampToValueAtTime(0,t+buffer.duration);source.tickGain=gain;
      this.ticks.push(source);source.onended=()=>{this.ticks=this.ticks.filter(s=>s!==source);source.disconnect();gain.disconnect();};source.start(t);this.emit('tick',{type,key,volume:this.preferences.selectionSoundVolume,preview:force,voices:this.ticks.length,pitch:1});return true;
    }
    playResult({id,type=this.preferences.resultSoundType,duration,age=0,preview=false}){
      if(!this.canPlay()||age>=duration||(!preview&&!this.preferences.resultSoundEnabled)||(!preview&&this.seen.has(id)))return false;
      const ctx=this.context,buffer=this.buffers[type];if(!['impact','sanlean'].includes(type)||!buffer)return false;
      // One original file, from its beginning. Only a shorter card can cut it off.
      // The existing visual exit lasts 580ms; its first 450ms fade the audio out.
      age=Math.max(0,age);const shortened=!preview&&duration<buffer.duration,fade=shortened?.45:0,fadeStart=shortened?Math.max(0,duration-.58):null,soundEnd=shortened?Math.min(buffer.duration,fadeStart+fade):buffer.duration;
      if(age>=soundEnd)return false;
      this.stopResult(0);if(!preview){this.seen.add(id);if(this.seen.size>64)this.seen.delete(this.seen.values().next().value);}
      const now=ctx.currentTime,origin=now-age,end=origin+soundEnd,envelope=ctx.createGain(),source=ctx.createBufferSource();
      envelope.connect(preview?this.resultPreviewBus:this.resultBus);envelope.gain.setValueAtTime(shortened&&age>fadeStart?Math.max(0,(soundEnd-age)/fade):1,now);
      if(shortened){if(age<fadeStart)envelope.gain.setValueAtTime(1,origin+fadeStart);envelope.gain.linearRampToValueAtTime(0,end);}
      source.buffer=buffer;source.loop=false;source.playbackRate.value=1;source.connect(envelope);
      source.onended=()=>{source.disconnect();envelope.disconnect();if(this.result?.envelope===envelope)this.result=null;};
      source.start(now,age,soundEnd-age);source.stop(end);
      this.result={id,sources:[source],envelope,end};this.emit('result',{id,type,duration,age,preview,audioDuration:buffer.duration,soundEnd,segments:[{kind:'file',start:0,offset:age,length:soundEnd-age}],fadeStart,fadeDuration:fade,volume:this.preferences.resultSoundVolume});return true;
    }
    stopResult(fade=.015){const r=this.result;if(!r)return;this.result=null;const now=this.context.currentTime;r.envelope.gain.cancelAndHoldAtTime(now);r.envelope.gain.linearRampToValueAtTime(0,now+fade);for(const s of r.sources)try{s.stop(now+fade);}catch{};this.emit('stop-result',{id:r.id,fade});}
    stopTicks(){const t=this.context.currentTime;for(const source of this.ticks)try{source.tickGain.gain.cancelAndHoldAtTime(t);source.tickGain.gain.linearRampToValueAtTime(0,t+.002);source.stop(t+.002);}catch{}this.ticks=[];}
    stopAll(fade=.015){this.stopTicks();this.stopResult(fade);}
    async preview(kind,values){await this.unlock();await this.ready;this.stopAll(0);this.applyPreferences(values);if(kind==='selection')return this.tick(values.selectionSoundType,'',true);return this.playResult({id:'preview',type:values.resultSoundType,duration:this.buffers[values.resultSoundType].duration,preview:true});}
  }
  window.SanLeanAudio={AudioEngine,assets,defaults};
})();
