'use strict';
const {randomInt}=require('node:crypto');
const FINAL_RADIUS=4;
const VISIBLE_UNIQUE_SPAN=7;
const entry=item=>({killer:{key:item.key,name:item.name,image:item.image},donor:item.donor||null,id:item.entryId,entryId:item.entryId,type:item.type});
function shuffled(items){const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=randomInt(i+1);[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
function validKillerSequence(sequence,pool){
  const ids=new Set(pool.map(i=>i.key)),span=Math.min(VISIBLE_UNIQUE_SPAN,ids.size),last=new Map();
  if(!span||!Array.isArray(sequence)||!sequence.length)return false;
  for(let i=0;i<sequence.length;i++){
    const key=sequence[i]?.killer?.key;
    if(!ids.has(key)||i-(last.get(key)??-Infinity)<span)return false;
    last.set(key,i);
  }
  return true;
}
// Walk shuffled cycles without replacement, carrying the last six keys across
// cycle boundaries. For small pools, use n-1 recent keys: repeats are n apart.
// Winner selection (including weights) happens before this visual-only step.
function prepareKillerDeck(pool,winner){
  const unique=[...new Map(pool.map(i=>[i.key,i])).values()];
  if(!unique.length||!unique.some(i=>i.key===winner?.key))throw Error('La ruleta no tiene opciones válidas.');
  const length=Math.max(100,unique.length*10),targetIndex=length-7,deck=[],recent=[],cooldown=Math.min(VISIBLE_UNIQUE_SPAN-1,unique.length-1);
  while(deck.length<length){
    const cycle=shuffled(unique);
    while(cycle.length&&deck.length<length){
      const index=cycle.findIndex(i=>!recent.includes(i.key));
      // A candidate always exists: used keys in this cycle are already removed,
      // and previous-cycle exclusions expire faster than candidates are consumed.
      if(index<0)throw Error('No se pudo construir la secuencia visual.');
      const item=cycle.splice(index,1)[0];deck.push(entry(item));recent.push(item.key);
      if(recent.length>cooldown)recent.shift();
    }
  }
  // Pin by exchanging the two identities EVERYWHERE, a bijection that preserves
  // every cooldown and complete cycle. Never overwrite just the center/neighbors,
  // and never reroll the already chosen winner.
  const displaced=deck[targetIndex].killer;
  for(let i=0;i<deck.length;i++){
    const key=deck[i].killer.key;
    if(key===displaced.key)deck[i]=entry({...winner,donor:null});
    else if(key===winner.key)deck[i]=entry(displaced);
  }
  // Character cooldown and ticket identity are independent. Deal actual tickets
  // for each character only after fixing the visual keys, then pin the winner.
  const queues=new Map();
  for(const item of pool){if(!queues.has(item.key))queues.set(item.key,[]);queues.get(item.key).push(item);}
  const available=new Map([...queues].map(([key,items])=>[key,shuffled(items)])),positions=new Map();
  for(let i=0;i<deck.length;i++){const key=deck[i].killer.key,items=available.get(key),position=positions.get(key)||0;deck[i]=entry(items[position%items.length]);positions.set(key,position+1);}
  deck[targetIndex]=entry(winner);
  return {spinSequence:deck,targetIndex,startIndex:5};
}
function makeSequence(key,pool,targets){
  if(key==='killer-wheel')return prepareKillerDeck(pool,targets[0]||pool[0]);
  return {spinSequence:targets.map(target=>{
    const usable=pool.filter(i=>!i.emptySlot&&i.key!=='slot_vacio');
    const sequence=Array.from({length:36},()=>{
      const item=usable.length?usable[randomInt(usable.length)]:target;
      return {...item,emptySlot:!!item.emptySlot};
    });return [...sequence,target];
  }),targetIndex:36,startIndex:0};
}
function finalWindow(state){return state.spinSequence.slice(state.targetIndex-FINAL_RADIUS,state.targetIndex+FINAL_RADIUS+1);}
module.exports={makeSequence,prepareKillerDeck,finalWindow,FINAL_RADIUS,validKillerSequence,VISIBLE_UNIQUE_SPAN};
