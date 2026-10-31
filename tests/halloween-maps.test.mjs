import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {categories,fit,zoomAt,normalized,validateCatalog,validPoint} from '../js/halloween-map-model.mjs';

const get=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const catalog=JSON.parse(get('../data/halloween-maps.json'));
const exists=path=>fs.existsSync(new URL('..'+path,import.meta.url));

test('cinco mapas cargados por SanLean, con nombres y extensiones reales',()=>{
 validateCatalog(catalog);assert.equal(catalog.maps.length,5);
 assert.deepEqual(catalog.maps.map(m=>m.id),[
  'haddonfield-heights','haddonfield-town-center','orange-grove-estates','east-haddonfield','tower-farm'
 ]);
 const extension={ 'haddonfield-heights':'webp','haddonfield-town-center':'jpeg',
 'orange-grove-estates':'jpeg','east-haddonfield':'webp','tower-farm':'jpeg'};
 for(const map of catalog.maps){
  assert.equal(map.placeholder,false);
  assert.ok(map.image.endsWith('-map.'+extension[map.id]));
  assert.ok(exists(map.image),'Falta '+map.image);
  assert.ok(exists(map.fallbackImage),'Falta respaldo de '+map.id);
  assert.ok(map.markers.length>10);
  assert.ok(map.labels.some(l=>l.kind==='street'),'Faltan calles en '+map.id);
  assert.ok(map.labels.some(l=>l.kind==='address'),'Faltan números de casas en '+map.id);
  assert.ok(map.markers.every(p=>p.possible&&p.confidence==='community'));
 }
});

test('íconos locales en todas las categorías solicitadas',()=>{
 for(const id of ['gate','car','cellar','drain','item_bolt_cutters','item_fuse','item_gas','item_repair','item_sedan_key']){
  assert.ok(categories[id],id);
  assert.ok(exists(categories[id].image),'Falta ícono '+id);
 }
 for(const id of ['gate','car','cellar','drain'])assert.equal(categories[id].defaultVisible,true);
 for(const id of ['item_bolt_cutters','item_fuse','item_gas','item_repair','item_sedan_key'])assert.equal(categories[id].defaultVisible,false);
});

test('no inventa ubicaciones de fusibles; fuentes de objetos son orientativas',()=>{
 const types=new Set(catalog.maps.flatMap(m=>m.markers.map(p=>p.type)));
 for(const type of ['gate','car','cellar','drain','item_gas','item_bolt_cutters','item_repair','item_sedan_key'])assert.ok(types.has(type),type);
 assert.equal(catalog.maps.flatMap(m=>m.markers).filter(p=>p.type==='item_fuse').length,0);
 for(const marker of catalog.maps.flatMap(m=>m.markers).filter(p=>p.type.startsWith('item_'))){
  assert.match(marker.description,/Posible aparición/);
  assert.ok(marker.source.trim());
 }
});

test('calle y número se mantienen en coordenadas normalizadas, sin HTML externo',()=>{
 for(const map of catalog.maps)for(const label of map.labels){
  assert.ok(validPoint(label));
  assert.ok(['street','address'].includes(label.kind));
  assert.equal(typeof label.rotation,'number');
  assert.ok(label.text.trim());
 }
 const heights=catalog.maps[0];
 assert.ok(heights.labels.some(p=>/Lampkin Lane/.test(p.text)));
 assert.ok(heights.labels.some(p=>p.kind==='address'&&p.text==='702'));
 const html=get('../halloween.html');
 assert.doesNotMatch(html,/<iframe|p8riot|hmOwnTab|hmCommunity/i);
 assert.match(html,/id="hmViewport"/);
 assert.match(html,/id="hmTooltip"/);
 assert.match(html,/MOSTRAR CUADRÍCULA/);
 assert.match(html,/MOSTRAR REFERENCIAS/);
});

test('zoom conserva el punto ancla, posición se preserva con tamaños distintos',()=>{
 for(const [vw,vh] of [[1400,700],[320,600],[600,320]]){
  const c=fit(4096,4096,vw,vh);
  const at={x:vw*.3,y:vh*.6},before=normalized(at,c,4096,4096),
   after=normalized(at,zoomAt(c,at,c.scale*3),4096,4096);
  assert.ok(Math.abs(before.x-after.x)<1e-10);
  assert.ok(Math.abs(before.y-after.y)<1e-10);
 }
 const pin={x:.37,y:.61};
 for(const c of [fit(4096,4096,300,500),{scale:2,x:-500,y:-400}]){
  const p=normalized({x:c.x+pin.x*4096*c.scale,y:c.y+pin.y*4096*c.scale},c,4096,4096);
  assert.ok(Math.abs(p.x-pin.x)<1e-9&&Math.abs(p.y-pin.y)<1e-9);
 }
 assert.equal(validPoint({x:1.1,y:.4}),false);
});

test('validación rechaza posiciones o categorías inválidas y soporta futuros mapas',()=>{
 const copy=structuredClone(catalog),m=copy.maps[0];
 m.markers[0].x=4;assert.throws(()=>validateCatalog(copy));
 m.markers[0].x=.5;m.markers[0].type='invalid';assert.throws(()=>validateCatalog(copy));
 m.markers[0].type='gate';m.markers[0].source='';assert.throws(()=>validateCatalog(copy));
 m.markers[0].source='dato comprobable';m.placeholder=true;assert.throws(()=>validateCatalog(copy));
 const sixth={...structuredClone(catalog.maps[0]),id:'otro-mapa'};
 validateCatalog({...catalog,maps:[...catalog.maps,sixth]});
});

test('JS usa los archivos propios y no integra visores de terceros',()=>{
 const js=get('../js/halloween-maps.js'),css=get('../css/halloween-maps.css');
 assert.match(js,/detailedMapPath=map=>map.image/);
 assert.match(js,/backupMapPath/);
 assert.match(js,/showTooltip/);
 assert.match(js,/viewport.requestFullscreen\(\)/);
 assert.match(css,/hm-map-nav h3/);
 assert.match(css,/\.hm-filter-group/);
 assert.match(css,/\.hm-label\.hm-street/);
 assert.doesNotMatch(js,/p8riot|hmCommunity|OwnTab/);
});
