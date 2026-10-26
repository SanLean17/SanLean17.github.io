/* Public WEB only. One GA4 config per document; no manual page_view. */
(()=>{
 'use strict';
 if(/^\/usuario(?:\/|$)/i.test(location.pathname)||window.__sanleanPublicAnalytics)return;
 window.__sanleanPublicAnalytics=true;
 const ID='G-0VBRTF7W0R';
 const cleanUrl=value=>{try{const u=new URL(value);return /^https?:$/.test(u.protocol)?u.origin+(/@|%40/i.test(u.pathname)?'/':u.pathname):'';}catch{return '';}};
 const schemas={code_copy:['code','status','source_type'],code_source_click:['code','source_type','source_host'],code_image_open:['code','image_index','image_count'],roulette_spin:['roulette_type','page_path']};
 window.sanleanTrack=(name,params={})=>{
  try{
   if(typeof window.gtag!=='function'||!schemas[name])return;
   const safe={};
   for(const key of schemas[name]){
    const v=params[key];
    if(key==='code'&&typeof v==='string'&&/^[A-Z0-9_-]{3,64}$/.test(v))safe[key]=v;
    else if(key==='status'&&['active','expired'].includes(v))safe[key]=v;
    else if(key==='source_type'&&['official_direct','official_wiki'].includes(v))safe[key]=v;
    else if(key==='source_host'&&['bsky.app','deadbydaylight.wiki.gg'].includes(v))safe[key]=v;
    else if(['image_index','image_count'].includes(key)&&Number.isSafeInteger(v)&&v>0)safe[key]=v;
    else if(key==='roulette_type'&&['killer','perks_killer','perks_superviviente'].includes(v))safe[key]=v;
    else if(key==='page_path')safe[key]=location.pathname;
   }
   window.gtag('event',name,safe);
  }catch{/* Measurement must never interrupt an interaction. */}
 };
 try{
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
  // Strip queries/fragments from page context; never read inputs or form contents.
  window.gtag('set',{page_location:cleanUrl(location.href),page_referrer:cleanUrl(document.referrer)});
  window.gtag('js',new Date());
  window.gtag('config',ID,{page_location:cleanUrl(location.href),page_referrer:cleanUrl(document.referrer),page_title:document.title});
  if(!document.querySelector('script[src*="googletagmanager.com/gtag/js"]')){
   const tag=document.createElement('script');tag.async=true;tag.src='https://www.googletagmanager.com/gtag/js?id='+ID;tag.referrerPolicy='origin';tag.onerror=()=>{};document.head.append(tag);
  }
 }catch{/* Optional, non-blocking service. */}
})();
