/* Single content contract for WEB, USUARIO and Streamer Tools. No roster lives here. */
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SanLeanDBDCatalog=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const types={killers:'killers',survivors:'survivors',killer:'perks-killer',survivor:'perks-survivor',killerPerks:'perks-killer',survivorPerks:'perks-survivor','perks-killer':'perks-killer','perks-survivor':'perks-survivor',roulette_killers:'killers',roulette_killer_perks:'perks-killer',roulette_survivor_perks:'perks-survivor'};
  const ownerTypes={'perks-killer':'killers','perks-survivor':'survivors'};
  const cache=new Map(),allCache=new Map(),pending=new Map();
  const base=root.document?.currentScript?.src?new URL('../',root.document.currentScript.src).href:null;
  const typeOf=type=>types[type]||String(type).match(/(?:^|\/)(killers|survivors|perks-killer|perks-survivor)\.json(?:[?#].*)?$/)?.[1];
  function normalizeSearch(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().replace(/['’‘`]/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');}
  function normalizeAliases(value){return (Array.isArray(value)?value:typeof value==='string'?[value]:[]).filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim());}
  const filterEnabled=items=>(items||[]).filter(item=>item&&item.enabled!==false);
  function resolveItemImage(item,type){const t=typeOf(type);return item.image||(ownerTypes[t]?`${t==='perks-killer'?'killer':'survivor'}/${item.key}.png`:'');}
  function validateItem(item,type){
    const errors=[],t=typeOf(type);
    if(!item||typeof item!=='object'||Array.isArray(item))return ['El objeto no es válido.'];
    if(typeof item.key!=='string'||!item.key.trim())errors.push('Falta key.');
    if(typeof item.name!=='string'||!item.name.trim())errors.push('Falta name.');
    if(item.enabled!==undefined&&typeof item.enabled!=='boolean')errors.push('enabled debe ser booleano.');
    if(item.aliases!==undefined&&typeof item.aliases!=='string'&&(!Array.isArray(item.aliases)||item.aliases.some(x=>typeof x!=='string')))errors.push('aliases debe ser texto o un array de textos.');
    if(item.image!==undefined&&(typeof item.image!=='string'||!item.image.trim()))errors.push('image no puede estar vacía.');
    if(!ownerTypes[t]&&!item.image)errors.push('Falta image.');
    if(item.updateId!==undefined&&(typeof item.updateId!=='string'||! /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.updateId)))errors.push('updateId no válido.');
    if(item.ownerKey!==undefined&&(typeof item.ownerKey!=='string'||!item.ownerKey.trim()))errors.push('ownerKey no válido.');
    return errors;
  }
  function prepare(items,type,{includeDisabled=false}={}){
    if(!Array.isArray(items))throw Error('El catálogo debe ser un array.');
    const seen=new Set(),out=items.map(item=>{
      const errors=validateItem(item,type);if(seen.has(item?.key))errors.push('key duplicada.');
      if(errors.length)throw Error(`${type}: ${item?.key||'(sin key)'}: ${errors.join(' ')}`);
      seen.add(item.key);return {...item,enabled:item.enabled!==false,aliases:normalizeAliases(item.aliases),image:resolveItemImage(item,type)};
    });
    return includeDisabled?out:filterEnabled(out);
  }
  function buildSearchText(item,context={}){
    if(typeof context==='string')context={type:context};
    const ownerType=ownerTypes[typeOf(context.type)],owners=context.owners||allCache.get(ownerType)||cache.get(ownerType)||[];
    const owner=item.ownerKey?(owners.find(x=>x.key===item.ownerKey)||allCache.get(ownerType)?.find(x=>x.key===item.ownerKey)):null;
    return normalizeSearch([item.name,item.key, ...normalizeAliases(item.aliases),item.ownerKey,owner?.key,owner?.name,...normalizeAliases(owner?.aliases),context.legacy||''].filter(Boolean).join(' '));
  }
  const matches=(item,query,context)=>normalizeSearch(query).split(' ').filter(Boolean).every(word=>buildSearchText(item,context).includes(word));
  async function load(type){
    const t=typeOf(type);if(!t)throw Error('Tipo de catálogo no válido: '+type);
    if(cache.has(t))return cache.get(t);
    if(!pending.has(t))pending.set(t,(async()=>{
      const response=await root.fetch(base?new URL(`data/${t}.json`,base).href:`/data/${t}.json`,{cache:'no-store'});
      if(!response.ok)throw Error('No se pudo cargar data/'+t+'.json');
      const all=prepare(await response.json(),t,{includeDisabled:true}),items=filterEnabled(all);allCache.set(t,all);
      if(ownerTypes[t])await load(ownerTypes[t]);
      cache.set(t,items);return items;
    })().finally(()=>pending.delete(t)));
    return pending.get(t);
  }
  // Project saved overlay snapshots through today's catalog, without mutating stored data.
  function projectOverlay(data,items){
    const byKey=new Map(items.map(i=>[i.key,i]));
    const project=list=>(list||[]).filter(i=>i&&byKey.has(i.key)).map(i=>({...i,name:byKey.get(i.key).name,image:base?new URL(byKey.get(i.key).image,base).href:byKey.get(i.key).image}));
    const state={...data.state};for(const field of ['items','targets','spinPool'])if(Array.isArray(state[field]))state[field]=project(state[field]);
    const card=i=>byKey.has(i?.killer?.key||i?.key)?(i?.killer?{...i,killer:project([i.killer])[0]}:project([i])[0]):undefined;
    if(state.spinSequence){const sequence=state.spinSequence,valid=sequence.flat().every(i=>byKey.has(i?.killer?.key||i?.key));if(!valid){delete state.spinSequence;delete state.visualDeck;delete state.entryPool;delete state.winner;delete state.winnerEntryId;state.status='result';}else state.spinSequence=sequence.map(i=>Array.isArray(i)?i.map(card):card(i));}
    if(state.visualDeck)state.visualDeck=state.visualDeck.map(i=>Array.isArray(i)?i.map(card).filter(Boolean):card(i)).filter(Boolean);
    if(state.entryPool)state.entryPool=project(state.entryPool);
    if(state.winner&&byKey.has(state.winner.key||state.winner.killerKey)){const current=byKey.get(state.winner.key||state.winner.killerKey);state.winner={...state.winner,name:current.name,image:current.image};}
    else if(state.winner){delete state.winner;delete state.winnerEntryId;}
    return {...data,state,settings:{...data.settings,pool:project(data.settings?.pool)}};
  }
  return {typeOf,normalizeSearch,normalizeAliases,filterEnabled,resolveItemImage,validateItem,prepare,buildSearchText,matches,load,projectOverlay,peek:type=>cache.get(typeOf(type)),count:async type=>(await load(type)).length,loadKillers:()=>load('killers'),loadSurvivors:()=>load('survivors'),loadKillerPerks:()=>load('perks-killer'),loadSurvivorPerks:()=>load('perks-survivor')};
});
