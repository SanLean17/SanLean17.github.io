import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {enrichCode} from '../codigos/model.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const page=read('../codigos/index.html');
const script=read('../codigos/codigos.js');
const css=read('../codigos/codigos.css');
const official=JSON.parse(read('../data/codigos.json'));
const nightlight=JSON.parse(read('../data/codigos-nightlight.json'));

test('Activos: dos grillas separadas; imágenes inician nueva fila',()=>{
 for(const id of ['codes-active-text','codes-active-images','codes-permanent','codes-expired']){
  assert.match(page,new RegExp('id="'+id+'"'));
 }
 assert.match(script,/active\.filter\(c=>c\.images\.length===0\)/);
 assert.match(script,/active\.filter\(c=>c\.images\.length>0\)/);
 assert.match(css,/\.codes-active-layout\{display:flex;flex-direction:column;gap:26px\}/);
 assert.match(css,/\.codes-grid > \.code-card\{grid-column:span 1;/);
 assert.doesNotMatch(css,/grid-column:span 2/);
});

test('Grillas responsivas: tres columnas escritorio, dos tablet, una mobile',()=>{
 assert.match(css,/\.codes-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}/);
 assert.match(css,/@media\(max-width:1200px\)\{\s*\.codes-page \.codes-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
 assert.match(css,/\.codes-grid\{grid-template-columns:minmax\(0,1fr\)\}/);
 assert.match(css,/\.code-card\.code-card-text::after\{display:none\}/);
});

test('Mantener los vencidos de SanLean, no los históricos previos de NightLight',()=>{
 assert.equal(nightlight.schemaVersion,1);
 assert.equal(official.schemaVersion,1);
 assert.match(script,/c\.sourceType!=='nightlight'\|\|c\.trackedWhileActive===true/);
 const inherited=nightlight.codes.filter(c=>c.status==='expired'&&!c.trackedWhileActive);
 for(const c of inherited){
  assert.notEqual(c.trackedWhileActive,true);
 }
 const existing=official.codes.filter(c=>c.status==='expired');
 assert.ok(existing.length>0);
});

test('Códigos nuevos y tarjetas oficiales mantienen su fuente verificable',()=>{
 const three=['DBDXHS','DBDXHH','DBDDY'];
 for(const code of three){
  const entry=nightlight.codes.find(c=>c.code===code);
  assert.ok(entry);
  assert.equal(entry.trackedWhileActive,true);
  assert.equal(enrichCode(entry).images.length,0);
 }
 const diablo=official.codes.find(c=>c.code==='DIABLO');
 assert.ok(enrichCode(diablo).images.length>0);
 assert.doesNotMatch(script,/VER EN NIGHTLIGHT/);
 assert.match(script,/c\.officialPublicationUrl/);
 assert.match(script,/if\(publication\)/);
});
