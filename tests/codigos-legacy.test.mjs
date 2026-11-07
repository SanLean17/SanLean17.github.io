import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reconcileCodeStatuses,enrichCode} from '../codigos/model.mjs';

const read=rel=>fs.readFileSync(new URL(rel,import.meta.url),'utf8');
const legacy=JSON.parse(read('../data/codigos-legacy-community.json'));
const official=JSON.parse(read('../data/codigos.json'));
const ui=read('../codigos/codigos.js');
const source=read('../.github/workflows/codigos-nightlight.yml');

test('restaura exclusivamente los 44 códigos previamente mostrados sin imagen',()=>{
 assert.equal(legacy.schemaVersion,1);
 assert.equal(legacy.codes.length,44);
 assert.equal(new Set(legacy.codes.map(c=>c.code)).size,44);
 assert.ok(legacy.codes.every(c=>c.legacyPreviouslyPublished===true));
 assert.ok(legacy.codes.every(c=>c.status==='active'&&c.trackedWhileActive===true));
 assert.ok(legacy.codes.every(c=>c.sourceType==='nightlight'&&c.official===false));
 assert.ok(legacy.codes.every(c=>enrichCode(c).images.length===0));
 assert.ok(legacy.codes.every(c=>!official.codes.some(o=>o.code===c.code)));
 assert.ok(!legacy.codes.some(c=>c.code==='MISSBEHAVIOURGC2026'||c.code==='GROUNDCHUCKHBD'));
});
test('40 códigos anteriores permanentes continúan sin fecha de caducidad',()=>{
 const permanent=legacy.codes.filter(c=>c.expiryPolicy==='never');
 assert.equal(permanent.length,40);
 assert.ok(permanent.every(c=>c.expiresAt===null));
 const merged=reconcileCodeStatuses(legacy.codes,Date.parse('2040-01-01T00:00:00Z'));
 for(const code of permanent)assert.equal(merged.find(c=>c.code===code.code).status,'active',code.code);
});
test('cuatro temporales pasan a códigos anteriores después de vencer',()=>{
 const limited=legacy.codes.filter(c=>c.expiryPolicy!=='never');
 assert.equal(limited.length,4);
 for(const item of limited){
  assert.ok(Number.isFinite(Date.parse(item.expiresAt)));
  const before=reconcileCodeStatuses([item],Date.parse(item.expiresAt)-1)[0];
  const after=reconcileCodeStatuses([item],Date.parse(item.expiresAt)+1)[0];
  assert.equal(before.status,'active',item.code);
  assert.equal(after.status,'expired',item.code);
  assert.equal(after.trackedWhileActive,true);
 }
});
test('el navegador vuelve a cargar las tarjetas existentes sin reactivar el recolector no autorizado',()=>{
 assert.match(ui,/codigos-legacy-community\.json/);
 assert.match(ui,/\.\.\.previouslyPublished\.codes,\.\.\.data\.codes/);
 assert.match(ui,/c\.sourceType!=='nightlight'\|\|c\.trackedWhileActive===true/);
 assert.match(source,/Integración desactivada/);
 assert.doesNotMatch(source,/schedule:/);
});
