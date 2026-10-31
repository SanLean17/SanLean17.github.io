import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {categories,fit,zoomAt,normalized,validateCatalog,validPoint} from '../js/halloween-map-model.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../data/halloween-maps.json',import.meta.url)));
test('five initial maps have own placeholders, no invented positions or external assets',()=>{
 validateCatalog(catalog);assert.equal(catalog.maps.length,5);
 for(const map of catalog.maps){assert.equal(map.placeholder,true);assert.deepEqual(map.markers,[]);assert.deepEqual(map.labels,[]);assert.ok(fs.existsSync(new URL('..'+map.image,import.meta.url)));}
 assert.equal(catalog.maps.at(-1).id,'tower-farm');
});
test('fit centers and contains every aspect ratio; zoom preserves the anchor',()=>{
 for(const [vw,vh] of [[1400,700],[320,600],[600,320]]){
  const c=fit(1200,900,vw,vh);assert.ok(c.x>=0&&c.y>=0);assert.ok(1200*c.scale<=vw&&900*c.scale<=vh);
  const at={x:vw*.3,y:vh*.6},before=normalized(at,c,1200,900),after=normalized(at,zoomAt(c,at,c.scale*3),1200,900);
  assert.ok(Math.abs(before.x-after.x)<1e-10);assert.ok(Math.abs(before.y-after.y)<1e-10);
 }
});
test('normalized pin survives resize and movement without editing its stored location',()=>{
 const p={x:.37,y:.61};
 for(const c of [fit(1200,900,300,500),{scale:2,x:-500,y:-400}])assert.deepEqual(normalized({x:c.x+p.x*1200*c.scale,y:c.y+p.y*900*c.scale},c,1200,900),p);
 assert.equal(validPoint({x:NaN,y:0}),false);assert.equal(validPoint({x:1.1,y:.5}),false);
});
test('schema supports future maps and all categories, requires evidence and rejects fake placeholder markers',()=>{
 const copy=structuredClone(catalog),map=copy.maps[0];map.placeholder=false;
 map.markers=Object.keys(categories).map((type,i)=>({id:'fixture-'+i,type,x:.5,y:.5,title:'TEST ONLY',description:'Synthetic test',possible:true,confidence:'community',source:'Synthetic test fixture; not game evidence'}));
 validateCatalog(copy);map.markers[0].x=2;assert.throws(()=>validateCatalog(copy));map.markers[0].x=.5;map.markers[0].source='';assert.throws(()=>validateCatalog(copy));map.markers[0].source='test';map.placeholder=true;assert.throws(()=>validateCatalog(copy));
 const sixth={...structuredClone(catalog.maps[0]),id:'future-map'};validateCatalog({...catalog,maps:[...catalog.maps,sixth]});
});

test('each map includes grounded official references and its illustrative asset remains clearly identified',()=>{
 for(const map of catalog.maps){
  assert.equal(map.placeholder,true);
  assert.ok(Array.isArray(map.highlights)&&map.highlights.length>=3);
  assert.equal(typeof map.summary,'string');
  assert.match(map.officialSourceUrl,/^https:\/\/halloweengame\.com\/news\/[a-z0-9-]+\/$/);
  assert.match(map.asset.origin,/cartográfica conceptual/);
  const asset=fs.readFileSync(new URL('..'+map.image,import.meta.url),'utf8');
  assert.match(asset,/ESQUEMA ARTÍSTICO/);
  assert.match(asset,/SIN COORDENADAS VERIFICADAS/);
 }
});
test('public HTML keeps the canonical heading and loads only Halloween assets',()=>{
 const html=fs.readFileSync(new URL('../halloween.html',import.meta.url),'utf8');
 assert.match(html,/<h1>HALLOWEEN<\/h1>/);
 assert.match(html,/Recorré los mapas y preparate tu próxima partida/);
 for(const id of ['hmGallery','hmGalleryHeading','hmViewer','hmViewport','hmLegend','hmMapList','hmPinLayer','hmMapSummary','hmVerified','hmOfficial','hmFullscreen','hmStyle'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/halloween-background\.css/);
 assert.match(html,/halloween-maps\.css/);
 assert.match(html,/halloween-maps\.js/);
});
