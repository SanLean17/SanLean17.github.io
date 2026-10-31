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

// Calibration is checked against independent roof/road evidence, not just bounds.
test('calibración por imagen: hashes, puntos fijos y giro de calles sin rotar números',async()=>{
 const {calibrateMap}=await import('../js/halloween-map-model.mjs');
 const {createHash}=await import('node:crypto');
 const expected={
  'haddonfield-heights':{text:'702',x:.2412,y:.3314},
  'haddonfield-town-center':{text:'1086',x:.3197,y:.3405},
  'orange-grove-estates':{text:'1514',x:.4099,y:.2732},
  'east-haddonfield':{text:'812',x:.6788,y:.4064},
  'tower-farm':{text:'300',x:.2754,y:.3517}
 };
 for(const map of catalog.maps){
  const calibration=map.calibration;
  assert.equal(calibration.imageSha256,createHash('sha256').update(fs.readFileSync(new URL('..'+map.image,import.meta.url))).digest('hex'),'Una imagen nueva exige recalibración');
  assert.ok(calibration.registration.inliers>300);
  assert.ok(calibration.registration.medianErrorPixels<.5);
  assert.equal(calibration.registration.controlPoints.length,9);
  const result=calibrateMap(map),target=expected[map.id],label=result.labels.find(l=>l.text===target.text);
  assert.ok(Math.abs(label.x-target.x)<.001&&Math.abs(label.y-target.y)<.001);
  assert.ok(result.labels.filter(l=>l.kind==='address').every(l=>l.rotation===0));
  assert.deepEqual(calibrateMap(result),result,'No aplicar la calibración dos veces');
  assert.notDeepEqual(result.markers[0],map.markers[0]);
  for(const p of result.markers)assert.ok(validPoint(p));
 }
 const bad=structuredClone(catalog);bad.maps[0].calibration.sourceToImage=[1,0,4,0,1,0];assert.throws(()=>validateCatalog(bad));
});

test('agrupación no pierde candidatos, conserva anclas y separa puntos al ampliar',async()=>{
 const {markerGroups}=await import('../js/halloween-map-model.mjs');
 const markers=[{id:'gas',x:.4,y:.4},{id:'key',x:.4,y:.4},{id:'repair',x:.42,y:.4},{id:'gate',x:.8,y:.8}];
 const small=markerGroups(markers,1280,1280,.3),large=markerGroups(markers,1280,1280,4);
 assert.equal(small.length,2);assert.equal(large.length,3);
 assert.deepEqual(small.flatMap(g=>g.members.map(m=>m.id)),markers.map(m=>m.id));
 assert.equal(small[0].x,markers[0].x);
 assert.equal(large[0].members.length,2,'Objetos en el mismo punto siguen accesibles juntos');
});
