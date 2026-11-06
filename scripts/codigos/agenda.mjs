// Agenda de respaldo para CÓDIGOS. No detecta ni publica datos por sí misma:
// únicamente solicita al workflow existente una revisión si está atrasada.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

const MINUTE=60_000;
export function evaluateAgenda(runs,now=Date.now()){
 if(!Array.isArray(runs))throw Error('Respuesta inválida de GitHub Actions');
 const validDate=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
 const ongoing=runs.some(r=>
  ['queued','in_progress','pending','waiting','requested'].includes(r.status)
  &&validDate(r.created_at)&&now-Date.parse(r.created_at)<55*MINUTE
 );
 if(ongoing)return {dispatch:false,reason:'Ya hay una revisión reciente en cola o ejecución'};
 const completed=runs.filter(r=>r.status==='completed'&&r.conclusion==='success'
  &&validDate(r.updated_at)).sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at));
 const lastSuccess=completed[0]?.updated_at||null;
 if(lastSuccess&&now-Date.parse(lastSuccess)<75*MINUTE){
  return {dispatch:false,reason:'Revisión reciente correcta',lastSuccess};
 }
 return {dispatch:true,reason:lastSuccess?'La última revisión correcta tiene más de 75 minutos':'Sin revisión correcta reciente',lastSuccess};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const json=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const decision=evaluateAgenda(json.workflow_runs);
 console.log(JSON.stringify(decision));
 if(decision.dispatch){
  const run=spawnSync('gh',['workflow','run','update-dbd-codes.yml','--ref','main'],{
   encoding:'utf8',timeout:25_000,env:process.env
  });
  if(run.status!==0){
   console.error(run.stderr||run.error||'No se pudo activar la revisión de CÓDIGOS');
   process.exitCode=1;
  }else console.log('Revisión de CÓDIGOS solicitada en GitHub Actions.');
 }
}
