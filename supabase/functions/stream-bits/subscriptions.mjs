// Twitch accepts only one EventSub filter. Narrow the remaining fields locally.
export async function findSubscription(headers,userId,type,callback,fetcher=fetch){
 let cursor;const visited=new Set();
 do {
  const query=new URLSearchParams({user_id:userId});if(cursor)query.set('after',cursor);
  const response=await fetcher('https://api.twitch.tv/helix/eventsub/subscriptions?'+query,{headers,signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('Twitch subscription lookup failed ('+response.status+')');
  const page=await response.json();
  const found=page.data?.find(s=>s.type===type&&s.condition?.broadcaster_user_id===userId&&(type!=='channel.chat.message'||s.condition?.user_id===userId)&&s.transport?.method==='webhook'&&s.transport?.callback===callback);
  if(found)return found;
  cursor=page.pagination?.cursor;if(cursor&&visited.has(cursor))throw new Error('Twitch subscription pagination repeated');if(cursor)visited.add(cursor);
 }while(cursor);
 return null;
}
