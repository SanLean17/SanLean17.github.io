'use strict';
// One-time, reproducible consolidation of the project's explicit historical search metadata.
// This script is not used at runtime; catalog-associations.json is the single reviewed source.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const extract=(file,name)=>{const source=read(file),start=source.indexOf('const '+name+'=');assert(start>=0,name);const end=source.indexOf(';',start);return vm.runInNewContext(source.slice(start,end)+';'+name,Object.create(null),{timeout:1000});};
const helper='js/usuario-roulette-tools.js',usuario='js/usuario.js';
const types=['killers','survivors','perks-killer','perks-survivor'];
const catalogs=Object.fromEntries(types.map(t=>[t,JSON.parse(read('data/'+t+'.json'))]));
const killerKey={ghost:'ghostface',pyramid:'pyramidhead',skull:'skullmerchant',first:'lich'};
const survivorKeys=['ashleyjwilliams','steveharrington','nancywheeler','yuikimura','zarinakassir','cherylmason','felixrichter','elodierakoto','yunjinlee','jillvalentine','leonskennedy','mikaelareid','jonahvasquez','yoichiasakawa','haddiekaur','rebeccachambers','adawong','vittoriotoscano','renatolyra','thalitalyra','gabrielsoma','nicolascage','ellenripley','alanwake','sableward','thetroupe','laracroft','trevorbelmont','tauriecain','orelarose','rickgrimes','michonnegrimes','veeboonyasak','dustinhenderson','eleven','kwontaeyoung','shanewiigwaas','aurora'];
const result={schemaVersion:1,sources:[{path:helper,fields:['OWNER_BY_KEY','OWNER_RANGES'],note:'Explicit keys before 60; corrected ranges 97–114 take precedence over shifted legacy groups.'},{path:usuario,fields:['survivorOwners','survivorOwnerGroups'],note:'Existing explicit survivor keys and ranges; no roster-order inference.'}],owners:{killers:{},survivors:{}},perks:{'perks-killer':{},'perks-survivor':{}},unassigned:{}};
function assign(type,key,owner,aliases){const ownerType=type==='perks-killer'?'killers':'survivors';assert(catalogs[ownerType].some(i=>i.key===owner),owner);assert(catalogs[type].some(i=>i.key===key),key);assert(!result.perks[type][key],key);result.perks[type][key]=owner;result.owners[ownerType][owner]=[aliases];}
for(const [key,aliases] of Object.entries(extract(helper,'OWNER_BY_KEY'))){const first=aliases.split(' ')[0];assign('perks-killer',key,killerKey[first]||first,aliases);}
for(const [from,to,aliases] of extract(helper,'OWNER_RANGES')){const first=aliases.split(' ')[0];for(const item of catalogs['perks-killer'].filter(i=>{const n=Number(i.key.split('_')[0]);return n>=from&&n<=to;}))assign('perks-killer',item.key,killerKey[first]||first,aliases);}
for(const [key,aliases] of Object.entries(extract(usuario,'survivorOwners'))){const owner=catalogs.survivors.find(i=>aliases.replace(/[^a-z]/g,'').startsWith(i.key));assert(owner,aliases);assign('perks-survivor',key,owner.key,aliases);}
const groups=extract(usuario,'survivorOwnerGroups');assert.equal(groups.length,survivorKeys.length);
groups.forEach(([aliases,start],index)=>{for(const item of catalogs['perks-survivor'].filter(i=>{const n=Number(i.key.split('_')[0]);return n>=start&&n<=start+2;}))assign('perks-survivor',item.key,survivorKeys[index],aliases);});
for(const type of ['perks-killer','perks-survivor'])result.unassigned[type]=catalogs[type].filter(i=>!result.perks[type][i.key]).map(i=>({key:i.key,name:i.name,reason:i.emptySlot?'Empty slot':'No character association in project sources; retained without owner, pending review.'}));
for(const type of ['killers','survivors'])for(const i of catalogs[type])assert(result.owners[type][i.key],i.key);
fs.writeFileSync(path.join(__dirname,'catalog-associations.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({owners:Object.fromEntries(Object.entries(result.owners).map(([t,x])=>[t,Object.keys(x).length])),perks:Object.fromEntries(Object.entries(result.perks).map(([t,x])=>[t,Object.keys(x).length])),unassigned:result.unassigned},null,2));
