import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateAgenda} from '../scripts/codigos/agenda.mjs';

const now=Date.parse('2026-11-06T18:00:00Z');
const at=minutes=>new Date(now-minutes*60_000).toISOString();
const success=minutes=>({status:'completed',conclusion:'success',created_at:at(minutes+1),updated_at:at(minutes)});
const failed=minutes=>({status:'completed',conclusion:'failure',created_at:at(minutes+1),updated_at:at(minutes)});

test('La agenda solicita una primera revisión cuando no hay éxitos',()=>{
 assert.equal(evaluateAgenda([],now).dispatch,true);
 assert.equal(evaluateAgenda([failed(8)],now).dispatch,true);
});
test('Una revisión reciente evita consultas duplicadas',()=>{
 assert.equal(evaluateAgenda([success(20)],now).dispatch,false);
 assert.equal(evaluateAgenda([success(74)],now).dispatch,false);
 assert.equal(evaluateAgenda([success(75)],now).dispatch,true);
 assert.equal(evaluateAgenda([success(120),success(5)],now).dispatch,false);
});
test('No duplica un escaneo que ya está en cola o ejecutándose',()=>{
 for(const status of ['queued','in_progress','pending','waiting','requested']){
  assert.equal(evaluateAgenda([success(180),{status,created_at:at(10)}],now).dispatch,false,status);
 }
 assert.equal(evaluateAgenda([success(180),{status:'in_progress',created_at:at(90)}],now).dispatch,true);
});
test('No cuenta fallos recientes como revisión exitosa',()=>{
 assert.equal(evaluateAgenda([success(90),failed(5)],now).dispatch,true);
});
test('Rechaza respuestas de GitHub incompletas',()=>{
 assert.throws(()=>evaluateAgenda(null,now),/Respuesta inválida/);
});
