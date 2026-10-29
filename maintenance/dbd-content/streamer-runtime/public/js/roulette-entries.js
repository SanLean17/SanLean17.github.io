/* One ticket projection for the server, control panel and OBS. No storage or randomness. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SanLeanRouletteEntries=factory();})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const baseId=key=>key+':default';
  const defaults=catalog=>catalog.map(i=>({entryId:baseId(i.key),key:i.key,donor:null,type:'default',enabled:true}));
  function configured(catalog,tool){const byKey=new Map(catalog.map(i=>[i.key,i]));return tool.entries.filter(e=>e.enabled&&byKey.has(e.key)).map(e=>({...byKey.get(e.key),...e,killerKey:e.key,source:e.type,weight:1}));}
  function pool(catalog,tool,remove=false){const used=new Set(remove?tool.usedKillerEntries:[]);return configured(catalog,tool).filter(e=>!used.has(e.entryId));}
  function stats(catalog,tool,remove=false){
    const all=configured(catalog,tool),available=pool(catalog,tool,remove),remaining=new Set(available.map(e=>e.entryId));
    return {base:catalog.length,total:all.length,available:available.length,eliminated:all.filter(e=>!remaining.has(e.entryId)),extras:all.filter(e=>e.type!=='default').length,activeExtras:available.filter(e=>e.type!=='default').length,donations:all.filter(e=>e.type==='donation').length,activeDonations:available.filter(e=>e.type==='donation').length};
  }
  function options(catalog,tool){
    const grouped=new Map(catalog.map(i=>[i.key,[]]));for(const e of tool.entries)grouped.get(e.key)?.push(e);
    return catalog.map(i=>{const entries=grouped.get(i.key),enabled=entries.filter(e=>e.enabled);return {...i,entries,count:enabled.length,donations:enabled.filter(e=>e.type==='donation')};});
  }
  function summaries(catalog,tool){
    const groups=new Map();for(const e of configured(catalog,tool)){if(e.type==='default')continue;const id=JSON.stringify([e.key,e.donor]);if(!groups.has(id))groups.set(id,{key:e.key,name:e.name,donor:e.donor,count:0});groups.get(id).count++;}return [...groups.values()];
  }
  return {baseId,defaults,configured,pool,stats,options,summaries};
});
