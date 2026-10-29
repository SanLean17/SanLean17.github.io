'use strict';
// Read-only WebSocket push transport. No packages, remote endpoints or client mutations.
const {createHash}=require('node:crypto');
function frame(op,payload=Buffer.alloc(0)){payload=Buffer.isBuffer(payload)?payload:Buffer.from(payload);const n=payload.length;let h;if(n<126){h=Buffer.from([0x80|op,n]);}else if(n<65536){h=Buffer.alloc(4);h[0]=0x80|op;h[1]=126;h.writeUInt16BE(n,2);}else{h=Buffer.alloc(10);h[0]=0x80|op;h[1]=127;h.writeBigUInt64BE(BigInt(n),2);}return Buffer.concat([h,payload]);}
module.exports=function accept(req,socket,head,onClose){
 const key=req.headers['sec-websocket-key'];
 if(req.headers.upgrade?.toLowerCase()!=='websocket'||req.headers['sec-websocket-version']!=='13'||typeof key!=='string'||!/^[A-Za-z0-9+/]{22}==$/.test(key)){socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');return false;}
 const hash=createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+hash+'\r\n\r\n');
 socket.setNoDelay(true);let buffered=Buffer.alloc(0),closed=false,lastPong=Date.now();
 const end=()=>{if(closed)return;closed=true;clearInterval(heartbeat);onClose();};
 const fail=code=>{const b=Buffer.alloc(2);b.writeUInt16BE(code);socket.end(frame(8,b));};
 const receive=chunk=>{buffered=Buffer.concat([buffered,chunk]);if(buffered.length>8192)return fail(1009);
  while(buffered.length>=2){const a=buffered[0],b=buffered[1],op=a&15,n=b&127;if((a&0x70)||!(a&0x80)||!(b&0x80)||n>125||![8,9,10].includes(op))return fail(1002);if(buffered.length<6+n)return;const mask=buffered.subarray(2,6),payload=Buffer.from(buffered.subarray(6,6+n));for(let i=0;i<n;i++)payload[i]^=mask[i%4];buffered=buffered.subarray(6+n);if(op===8){if(n===1)return fail(1002);socket.end(frame(8,payload));return;}if(op===9)socket.write(frame(10,payload));if(op===10)lastPong=Date.now();}
 };
 socket.send=data=>{if(!socket.destroyed&&!closed){if(socket.writableLength>1024*1024)return socket.destroy();socket.write(frame(1,JSON.stringify(data)));}};
 const heartbeat=setInterval(()=>{if(Date.now()-lastPong>65000)socket.destroy();else socket.write(frame(9));},20000);heartbeat.unref();socket.on('data',receive);socket.on('error',end);socket.on('close',end);if(head.length)receive(head);return true;
};
