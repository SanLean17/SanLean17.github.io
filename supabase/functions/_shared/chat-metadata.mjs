// Only call with a platform-verified webhook, never with browser input.
export const normalizeKeyword=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function chatMetadata(platform,event){
 const source=platform==='twitch'?event.badges:event.sender?.identity?.badges;
 const badges=(Array.isArray(source)?source:[]).map(b=>String(platform==='twitch'?b.set_id:b.type).toLowerCase());
 const color=platform==='twitch'?event.color:event.sender?.identity?.username_color;
 return {is_subscriber:badges.some(b=>['subscriber','founder'].includes(b)),is_vip:badges.includes('vip'),is_moderator:badges.includes('moderator')||badges.includes('broadcaster'),badges:badges.filter(b=>['subscriber','founder','vip','moderator','broadcaster'].includes(b)),color:/^#[0-9a-f]{6}$/i.test(color||'')?color:''};
}
