'use strict';
(()=>{
 class LocalEvents{
  constructor(path){this.path=path;this.closed=false;this.connect();addEventListener('pagehide',()=>this.close(),{once:true});}
  connect(){if(this.closed)return;const socket=this.socket=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+this.path);socket.onmessage=e=>this.onmessage?.(e);socket.onclose=()=>{if(this.closed)return;this.onerror?.();this.timer=setTimeout(()=>this.connect(),1000);};socket.onerror=()=>this.onerror?.();}
  close(){this.closed=true;clearTimeout(this.timer);this.socket?.close();}
 }
 window.SanLeanLocalEvents=LocalEvents;
})();
