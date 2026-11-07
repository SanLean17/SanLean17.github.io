import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateAgenda,shouldScan} from '../scripts/codigos/agenda.mjs';
import {reconcileCodeStatuses} from '../codigos/model.mjs';
import {statusAt} from '../scripts/codigos/detector.mjs';

const now=Date.parse('2026-11-06T18:00:00Z');
const at=minutes=>new Date(now-minutes*60_000).toISOString();
const success=minutes=>({status:'completed',conclusion:'success',created_at:at(minutes+1),updated_at:at(minutes)});
const failed=minutes=>({status:'completed',conclusion:'failure',created_at:at(minutes+1),updated_at:at(minutes)});

test('La agenda solicita una primera revisión cuando no hay éxitos',()=>{
 assert.equal(evaluateAgenda([],now).dispatch,true);
 assert.equal(evaluateAgenda([failed(8)],now).dispatch,true);
});
test('Una revisión reciente evita consultas duplicadas',()=>{
 assert.equal(evaluateAgenda([],now,{lastCompleteSuccessAt:at(20)}).dispatch,false);
 assert.equal(evaluateAgenda([],now,{lastCompleteSuccessAt:at(59)}).dispatch,false);
 assert.equal(evaluateAgenda([],now,{lastCompleteSuccessAt:at(60)}).dispatch,true);
 assert.equal(evaluateAgenda([success(5)],now,{}).dispatch,true,'Workflow verde sin diagnóstico no acredita análisis');
 assert.equal(evaluateAgenda([],now,{lastAttemptAt:at(5)}).dispatch,false);
 assert.equal(shouldScan({lastCompleteSuccessAt:at(10)},now),false);
 assert.equal(shouldScan({lastCompleteSuccessAt:at(10)},now,'push'),true);
 assert.equal(shouldScan({},now),true);
});
test('No duplica un escaneo que ya está en cola o ejecutándose',()=>{
 for(const status of ['queued','in_progress','pending','waiting','requested']){
  assert.equal(evaluateAgenda([success(180),{status,created_at:at(10)}],now).dispatch,false,status);
 }
 assert.equal(evaluateAgenda([success(180),{status:'in_progress',created_at:at(90)}],now).dispatch,false);
});
test('No cuenta fallos recientes como revisión exitosa',()=>{
 assert.equal(evaluateAgenda([success(90),failed(5)],now).dispatch,true);
});
test('Rechaza respuestas de GitHub incompletas',()=>{
 assert.throws(()=>evaluateAgenda(null,now),/Respuesta inválida/);
});

test('El vencimiento pasa automáticamente de ACTIVOS a CÓDIGOS ANTERIORES',()=>{
 const before=Date.parse('2026-11-24T23:00:00Z'),after=Date.parse('2026-11-26T00:00:00Z');
 const entry={code:'CADUCATEST',sourceType:'official_direct',status:'active',
  expiryPolicy:'calendar-day-end-UTC',expiresAt:'2026-11-25T23:59:59.999Z'};
 assert.equal(reconcileCodeStatuses([entry],before)[0].status,'active');
 assert.equal(reconcileCodeStatuses([entry],after)[0].status,'expired');
 assert.equal(statusAt(entry,new Date(after).toISOString()),'expired');
});
test('Sin fecha ni evidencia de caducidad no se inventa un vencimiento',()=>{
 const item={code:'SINFECHATEST',status:'active',sourceType:'official_direct',expiresAt:null};
 assert.equal(reconcileCodeStatuses([item],Date.parse('2028-01-01T00:00:00Z'))[0].status,'active');
 assert.equal(statusAt(item,'2028-01-01T00:00:00Z'),'active');
});
