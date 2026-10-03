import assert from 'node:assert/strict';
import {chatMetadata,normalizeKeyword} from '../supabase/functions/_shared/chat-metadata.mjs';
for(const platform of ['twitch','kick']){
 const source=[{set_id:'subscriber',type:'subscriber'},{set_id:'vip',type:'vip'},{set_id:'moderator',type:'moderator'}];
 const event=platform==='twitch'?{badges:source,color:'#123abc'}:{sender:{identity:{badges:source,username_color:'#123abc'}}};
 const m=chatMetadata(platform,event);assert(m.is_subscriber&&m.is_vip&&m.is_moderator);assert.equal(m.color,'#123abc');
 const gifted=platform==='twitch'?{badges:[{set_id:'sub-gifter'}]}:{sender:{identity:{badges:[{type:'sub_gifter'}]}}};assert.equal(chatMetadata(platform,gifted).is_subscriber,false);
 assert.equal(chatMetadata(platform,{}).is_vip,false);
}
assert.equal(normalizeKeyword('TuLiPa\u0301N'),'tulipan');
console.log('PASS: verified Twitch/Kick badge mapping, gift badge is not subscription, missing metadata denied, Unicode keywords');
