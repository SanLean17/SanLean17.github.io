'use strict';
const fs=require('node:fs'),path=require('node:path'),catalog=require('./public/js/dbd-catalog.js');
require('./catalog-delta.cjs').applyPending(__dirname);
const cache=new Map();
exports.read=(type,includeDisabled=false)=>{const name=catalog.typeOf(type);if(!name)throw Error('Catálogo no válido');if(!cache.has(name))cache.set(name,catalog.prepare(JSON.parse(fs.readFileSync(path.join(__dirname,'data',name+'.json'),'utf8')),name,{includeDisabled:true}));return includeDisabled?cache.get(name):catalog.filterEnabled(cache.get(name));};
