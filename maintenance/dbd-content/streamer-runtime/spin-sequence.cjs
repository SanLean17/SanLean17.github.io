'use strict';
const {randomInt}=require('node:crypto');
const FINAL_RADIUS=4;
const VISIBLE_UNIQUE_SPAN=7;
const SEQUENCE_VERSION=2;
const identity=item=>({...item,killerKey:item.key,source:item.type});
const entry=item=>({killer:{key:item.key,name:item.name,image:item.image},killerKey:item.key,source:item.type,donor:item.donor||null,id:item.entryId,entryId:item.entryId,type:item.type});
function shuffled(items){const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=randomInt(i+1);[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
function spacingBound(pool){const counts=new Map();for(const i of pool)counts.set(i.key,(counts.get(i.key)||0)+1);return pool.length?Math.floor(pool.length/Math.max(...counts.values())):0;}
// M copies of the most frequent key divide a circular deck of N tickets into
// M gaps: no arrangement can have a minimum gap greater than floor(N / M).
// Deal descending groups across M rows, then read the rows. Each row has
// floor(N/M) or ceil(N/M) tickets. Full groups start at column zero; a partial
// group occupies consecutive rows at one column (one later after wrapping).
// Consecutive occurrences are therefore at least floor(N/M) apart, including
// the last-to-first boundary. Every ticket is dealt once; none are deduplicated.
function balancedCycle(pool){
  const groups=new Map();for(const item of pool){if(!groups.has(item.key))groups.set(item.key,[]);groups.get(item.key).push(item);}
  const ordered=shuffled([...groups.values()]).sort((a,b)=>b.length-a.length),m=ordered[0].length;
  let rows=Array.from({length:m},()=>[]),cursor=0;
  for(const group of ordered)for(const ticket of shuffled(group))rows[cursor++%m].push(ticket);
  // When one key is a majority, adjacent copies are unavoidable. Spread the
  // intervening tickets evenly instead of concentrating the unavoidable pairs.
  if(Math.floor(pool.length/m)===1){
    const long=rows.filter(r=>r.length===2),short=rows.filter(r=>r.length===1),count=long.length;
    rows=Array.from({length:m},(_,i)=>Math.floor((i+1)*count/m)>Math.floor(i*count/m)?long.shift():short.shift());
  }
  let deck=rows.flat();if(randomInt(2))deck.reverse();const offset=randomInt(deck.length);
  return [...deck.slice(offset),...deck.slice(0,offset)].map(entry);
}
function validKillerSequence(sequence,pool){
  if(!pool?.length||!Array.isArray(sequence)||sequence.length<pool.length)return false;
  const tickets=new Map(pool.map(i=>[i.entryId,i])),seen=new Set(),last=new Map(),span=spacingBound(pool);
  if(tickets.size!==pool.length)return false;
  for(let i=0;i<sequence.length;i++){
    const card=sequence[i],ticket=tickets.get(card?.entryId),key=card?.killer?.key;
    if(!ticket||ticket.key!==key||ticket.donor!==card.donor||ticket.type!==card.type||card.killerKey!==key||card.source!==ticket.type||i-(last.get(key)??-Infinity)<span)return false;
    if(i<pool.length){if(seen.has(card.entryId))return false;seen.add(card.entryId);}
    else if(card.entryId!==sequence[i%pool.length].entryId)return false;
    last.set(key,i);
  }
  // Check the circular boundary even when only the base cycle is supplied.
  const first=new Map();for(let i=0;i<pool.length;i++){const key=sequence[i].killer.key;if(!first.has(key))first.set(key,i);last.set(key,i);}
  return [...first].every(([key,index])=>pool.length+index-last.get(key)>=span);
}
function prepareKillerDeck(pool,winner){
  if(!pool.length||new Set(pool.map(i=>i.entryId)).size!==pool.length||!pool.some(i=>i.entryId===winner?.entryId))throw Error('La ruleta no tiene entradas válidas.');
  const visualDeck=balancedCycle(pool),winnerIndex=visualDeck.findIndex(i=>i.entryId===winner.entryId);
  // Land on the existing winning ticket. Never replace a card or exchange keys.
  const targetIndex=Math.ceil(Math.max(80,pool.length)/pool.length)*pool.length+winnerIndex;
  const length=Math.ceil(Math.max(100,targetIndex+7)/pool.length)*pool.length;
  return {sequenceVersion:SEQUENCE_VERSION,entryPool:pool.map(identity),visualDeck,spinSequence:Array.from({length},(_,i)=>visualDeck[i%pool.length]),targetIndex,startIndex:5};
}
function makeSequence(key,pool,targets){
  if(key==='killer-wheel')return {...prepareKillerDeck(pool,targets[0]||pool[0]),...(targets[0]?{winner:identity(targets[0]),winnerEntryId:targets[0].entryId}:{})};
  return {sequenceVersion:SEQUENCE_VERSION,entryPool:pool.map(identity),visualDeck:pool.map(identity),spinSequence:targets.map(target=>{
    const usable=pool.filter(i=>!i.emptySlot&&i.key!=='slot_vacio');
    const sequence=Array.from({length:36},()=>{
      const item=usable.length?usable[randomInt(usable.length)]:target;
      return {...identity(item),emptySlot:!!item.emptySlot};
    });return [...sequence,identity(target)];
  }),targetIndex:36,startIndex:0};
}
function finalWindow(state){return state.spinSequence.slice(state.targetIndex-FINAL_RADIUS,state.targetIndex+FINAL_RADIUS+1);}
module.exports={makeSequence,prepareKillerDeck,finalWindow,FINAL_RADIUS,validKillerSequence,VISIBLE_UNIQUE_SPAN,SEQUENCE_VERSION,spacingBound};
