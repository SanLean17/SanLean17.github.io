import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {enabledSources} from './sources/index.mjs';
import {runCycle} from './engine.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const statePath=process.env.CODE_STATE_PATH||path.resolve(root,'../codigos-runtime/state.json');
async function read(file,fallback){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}}
async function write(file,value){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file+'.tmp',JSON.stringify(value,null,2)+'\n');await fs.rename(file+'.tmp',file);}
async function main(){
 const catalog=await read(path.join(root,'data/codigos.json'),{codes:[]});const review=await read(path.join(root,'data/codigos-review.json'),{items:[]});const state=await read(statePath,{});
 const result=await runCycle({catalog,review,state,sources:enabledSources,event:process.env.GITHUB_EVENT_NAME||'local',...(process.env.CODE_MODE?{mode:process.env.CODE_MODE}:{})});
 if(result.changed){await write(path.join(root,'data/codigos.json'),result.catalog);await write(path.join(root,'data/codigos-review.json'),result.review);}
 await write(statePath,result.state);
 const health={...result.state,sources:Object.fromEntries(Object.entries(result.state.sources).map(([id,{cursor,...s}])=>[id,s]))};
 await write(path.join(path.dirname(statePath),'health.json'),health);
 console.log(JSON.stringify(health,null,2));
 if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,'## CÓDIGOS: '+health.mode+'\n```json\n'+JSON.stringify(health,null,2)+'\n```\n');
}
main().catch(e=>{console.error('Actualización fallida:',e.message);process.exitCode=1;});
