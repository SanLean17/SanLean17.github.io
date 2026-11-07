// Recovery scheduler. Workflow success alone is not proof of a source scan.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const MINUTE=60_000;
export function evaluateAgenda(runs,now=Date.now(),health={}){
 if(!Array.isArray(runs))throw Error('Respuesta inválida de GitHub Actions');
 const ongoing=runs.some(r=>['queued','in_progress','pending','waiting','requested'].includes(r.status));
 if(ongoing)return {dispatch:false,reason:'Ya hay una revisión en cola o ejecución'};
 const lastSuccess=health.lastCompleteSuccessAt||null;
 const age=now-Date.parse(lastSuccess);
 if(Number.isFinite(age)&&age>=0&&age<60*MINUTE)return {dispatch:false,reason:'Análisis completo reciente',lastSuccess};
 const attempt=now-Date.parse(health.lastAttemptAt);
 if(Number.isFinite(attempt)&&attempt>=0&&attempt<15*MINUTE)return {dispatch:false,reason:'Reintento en espera tras análisis parcial o fallido',lastSuccess};
 return {dispatch:true,reason:'Falta un análisis completo durante la última hora',lastSuccess};
}
export function shouldScan(health,now=Date.now(),event='schedule'){
 if(event==='push')return true;
 const age=now-Date.parse(health?.lastCompleteSuccessAt);
 return !Number.isFinite(age)||age<0||age>=50*MINUTE;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const json=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 let health={};try{health=JSON.parse(fs.readFileSync('data/codigos-health.json','utf8'));}catch{}
 const decision=evaluateAgenda(json.workflow_runs,Date.now(),health);
 console.log(JSON.stringify(decision));
 if(decision.dispatch){
  const run=spawnSync('gh',['workflow','run','update-dbd-codes.yml','--ref','main'],{encoding:'utf8',timeout:25_000,env:process.env});
  if(run.status!==0){console.error(run.stderr||run.error||'No se pudo activar la revisión');process.exitCode=1;}
  else console.log('Revisión solicitada en GitHub Actions.');
 }
}
