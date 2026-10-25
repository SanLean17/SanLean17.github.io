import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const health=JSON.parse(await fs.readFile(path.join(path.dirname(process.env.CODE_STATE_PATH),'health.json'),'utf8'));
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const response=await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/check-runs`,{method:'POST',headers:{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json','Content-Type':'application/json'},body:JSON.stringify({name:'Codigos-health',head_sha:sha,status:'completed',conclusion:health.sourcesHealthy===0?'failure':health.sourcesFailed?'neutral':'success',completed_at:new Date().toISOString(),output:{title:'Salud de fuentes CÓDIGOS',summary:JSON.stringify(health)}})});
if(!response.ok)throw Error(`No se pudo publicar diagnóstico: ${response.status}`);
if(!health.sourcesHealthy)throw Error('Todas las fuentes fallaron; expiraciones locales conservadas y diagnóstico publicado.');
