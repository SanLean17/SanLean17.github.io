'use strict';
const path=require('node:path');
// One compatible program set for content patches and the clean MASTER. Never includes user data.
module.exports=function(m){
 const runtime=path.resolve(__dirname,'../dbd-content/streamer-runtime');
 const files=['catalog-delta.cjs','catalog-store.cjs','server.cjs','wheel-model.cjs','spin-sequence.cjs','public/js/roulette-entries.js','public/js/roulette-view.js','public/js/tools.js','public/js/wheel-overlay.js'].map(file=>({file,source:path.join(runtime,file)}));
 for(const file of ['js/dbd-catalog.js','js/usuario-confirmations.js','css/usuario-confirmations.css'])files.push({file:'public/'+file,source:path.join(m.base,file)});
 return files;
};
