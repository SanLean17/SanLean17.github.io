export const categories=Object.freeze({
 gate:{name:'Puerta de salida',color:'#69d99b',icon:'M5 21V3h14v18M9 21V7h6v14M12 13h1'},
 car:{name:'Auto de escape',color:'#6cbbff',icon:'M4 10l2-5h12l2 5v9h-3v-3H7v3H4zM4 10h16M7 13h1m8 0h1'},
 cellar:{name:'Sótano / escotilla',color:'#ff697d',icon:'M3 7h18v4H3zM6 11v9m12-9v9M6 15h12M6 19h12'},
 drain:{name:'Alcantarilla / desagüe',color:'#bd98ff',icon:'M3 7h18v12H3zM7 7v12m5-12v12m5-12v12M3 12h18'},
 vehicle_exit:{name:'Salida de vehículos',color:'#64d7cf',icon:'M3 9h12m-4-4l4 4-4 4M5 15v6m14-8v8M5 18h14'},
 supply:{name:'Posible fuente de objetos',color:'#f2bf64',icon:'M4 7h16v14H4zM8 7V3h8v4M4 12h16M10 12v3h4v-3'},
 landmark:{name:'Referencia',color:'#d6d9e2',icon:'M6 21V3h13l-3 4 3 4H6'}
});
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function fit(width,height,viewWidth,viewHeight){const scale=Math.min(viewWidth/width,viewHeight/height)*.96;return {scale,x:(viewWidth-width*scale)/2,y:(viewHeight-height*scale)/2};}
export function normalized(point,camera,width,height){return {x:(point.x-camera.x)/(camera.scale*width),y:(point.y-camera.y)/(camera.scale*height)};}
export function zoomAt(camera,point,scale){return {scale,x:point.x-(point.x-camera.x)*scale/camera.scale,y:point.y-(point.y-camera.y)*scale/camera.scale};}
export function validPoint(p){return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1;}
export function validateCatalog(data){
 if(data?.schemaVersion!==1||!Array.isArray(data.maps)||!data.maps.length)throw Error('Catálogo de mapas inválido');
 const ids=new Set();
 for(const map of data.maps){
  if(!/^[a-z0-9-]+$/.test(map.id)||ids.has(map.id)||typeof map.name!=='string'||!map.name.trim()||!/^\/assets\/halloween\/maps\/[a-z0-9-]+\.(svg|png|webp|jpg)$/.test(map.image)||!Number.isFinite(map.width)||!Number.isFinite(map.height)||!(map.width>0&&map.height>0)||typeof map.placeholder!=='boolean'||!Array.isArray(map.markers)||!Array.isArray(map.labels))throw Error('Mapa inválido');
  ids.add(map.id);const points=new Set();
  for(const marker of map.markers){
   if(!marker.id||points.has(marker.id)||!categories[marker.type]||!validPoint(marker)||typeof marker.title!=='string'||typeof marker.description!=='string'||typeof marker.possible!=='boolean'||!['confirmed','likely','community'].includes(marker.confidence)||typeof marker.source!=='string'||!marker.source.trim())throw Error('Marcador sin evidencia o coordenadas válidas');
   points.add(marker.id);
  }
  for(const label of map.labels)if(!validPoint(label)||typeof label.text!=='string'||!label.source)throw Error('Referencia sin evidencia');
  if(map.placeholder&&(map.markers.length||map.labels.length))throw Error('Un placeholder no debe publicar geografía ficticia');
 }
 return data;
}
