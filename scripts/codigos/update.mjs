import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {enabledSources} from './sources/index.mjs';
import {officialPost} from './sources/bluesky.mjs';
import {mergeCodes} from './catalog.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
async function read(name,fallback){try{return JSON.parse(await fs.readFile(path.join(root,name),'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}}
async function main(){
 const now=new Date().toISOString(),since=new Date(Date.parse(now)-150*86400000).toISOString();
 const fixtureIndex=process.argv.indexOf('--feed');let posts=[],fetched=0;
 if(fixtureIndex>=0){const feed=JSON.parse(await fs.readFile(process.argv[fixtureIndex+1],'utf8'));posts=feed.map(officialPost).filter(p=>p&&p.publishedAt>=since);fetched=feed.length;}
 else for(const source of enabledSources){const result=await source.collect({since});posts.push(...result.posts);fetched+=result.fetched;}
 const previous=await read('data/codigos.json',{schemaVersion:1,updatedAt:null,codes:[]});
 const review=await read('data/codigos-review.json',{schemaVersion:1,updatedAt:null,items:[]});
 const result=mergeCodes(previous,review,posts,now);
 if(result.changed){for(const [file,data] of [['data/codigos.json',result.catalog],['data/codigos-review.json',result.review]]){const dest=path.join(root,file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest+'.tmp',JSON.stringify(data,null,2)+'\n');await fs.rename(dest+'.tmp',dest);}}
 const log=`Posts consultados: ${fetched}\nPosts analizados: ${result.stats.postsAnalyzed}\nCandidatos: ${result.stats.candidates}\nConfirmed: ${result.stats.confirmed}\nReview: ${result.stats.review}\nRejected: ${result.stats.rejected}\nCambios realizados: ${result.changed?'sí':'no'}`;
 console.log(log);
 if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,`## Códigos DBD — ${now}\n\n\x60\x60\x60\n${log}\n\x60\x60\x60\n`);
}
main().catch(error=>{console.error('Actualización cancelada; se conserva el catálogo anterior:',error.message);process.exitCode=1;});
