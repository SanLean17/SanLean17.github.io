const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),catalog=require('../js/dbd-catalog.js');
const names=['killers','survivors','perks-killer','perks-survivor'];
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'data',name+'.json'),'utf8'));
const chapter=()=>JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/dbd-content/chapter.json'),'utf8'));
function copy(from,to){fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);}
function fixture(destination,enabled=false){
  const extra=chapter(),all={};
  for(const type of names){all[type]=[...read(type),...extra[type].map(i=>({...i,enabled}))];fs.mkdirSync(path.join(destination,'data'),{recursive:true});fs.writeFileSync(path.join(destination,'data',type+'.json'),JSON.stringify(all[type],null,2));
    for(const item of all[type]){const image=catalog.resolveItemImage(item,type),source=extra[type].some(i=>i.key===item.key)?(image.endsWith('.webp')?read('survivors').find(i=>i.image.endsWith('.webp')).image:'rombo.png'):image;copy(path.join(root,source),path.join(destination,image));}
  }
  copy(path.join(root,'data/perk-conflicts.json'),path.join(destination,'data/perk-conflicts.json'));return all;
}
module.exports={root,catalog,names,read,chapter,fixture,copy};
