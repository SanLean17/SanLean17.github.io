'use strict';
const reference=require('./catalog-associations.json');
function enrich(catalogs){
  return Object.fromEntries(Object.entries(catalogs).map(([type,items])=>[type,items.map(item=>{
    const aliases=reference.owners[type]?.[item.key];
    const ownerKey=item.ownerKey||reference.perks[type]?.[item.key];
    const old=Array.isArray(item.aliases)?item.aliases:item.aliases?[item.aliases]:[];
    return {...item,...(aliases?{aliases:[...new Set([...old,...aliases])]}:{}),...(ownerKey?{ownerKey}:{})};
  })]));
}
module.exports={enrich,reference};
