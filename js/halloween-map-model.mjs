export const categories=Object.freeze({
 gate:{name:'Puerta de salida',color:'#69d99b',group:'escape',defaultVisible:true,image:'/assets/halloween/icons/game-puertas.png',icon:'M5 21V3h14v18M9 21V7h6v14M12 13h1'},
 car:{name:'Auto de escape',color:'#6cbbff',group:'escape',defaultVisible:true,image:'/assets/halloween/icons/game-auto.png',icon:'M4 10l2-5h12l2 5v9h-3v-3H7v3H4zM4 10h16M7 13h1m8 0h1'},
 cellar:{name:'Sótano / escotilla',color:'#ff697d',group:'escape',defaultVisible:true,image:'/assets/halloween/icons/game-sotano.png',icon:'M3 7h18v4H3zM6 11v9m12-9v9M6 15h12M6 19h12'},
 drain:{name:'Alcantarilla',color:'#bd98ff',group:'escape',defaultVisible:true,image:'/assets/halloween/icons/game-alcantarillas.png',icon:'M3 7h18v12H3zM7 7v12m5-12v12m5-12v12M3 12h18'},
 vehicle_exit:{name:'Ruta de salida vehicular',color:'#64d7cf',group:'escape',defaultVisible:false,icon:'M3 9h12m-4-4l4 4-4 4M5 15v6m14-8v8M5 18h14'},
 item_bolt_cutters:{name:'Cortapernos',color:'#f8b84d',group:'item',defaultVisible:false,image:'/assets/halloween/icons/item-cortadora-de-pernos.png',icon:'M5 4l14 14M19 4L5 18M3 20l4-4m10 0l4 4'},
 item_fuse:{name:'Fusible',color:'#f8b84d',group:'item',defaultVisible:false,image:'/assets/halloween/icons/item-fusible.png',icon:'M9 2h6v5H9zM7 7h10v10H7zM9 17v5m6-5v5'},
 item_gas:{name:'Gasolina',color:'#f8b84d',group:'item',defaultVisible:false,image:'/assets/halloween/icons/item-gasolina.png',icon:'M7 4h10v17H7zM9 7h6v5H9zM17 8l3 3v6h-3'},
 item_repair:{name:'Kit de reparación',color:'#f8b84d',group:'item',defaultVisible:false,image:'/assets/halloween/icons/item-kit-de-reparacion.png',icon:'M4 8h16v13H4zM9 8V4h6v4M12 11v7m-4-3h8'},
 item_sedan_key:{name:'Llave del sedán',color:'#f8b84d',group:'item',defaultVisible:false,image:'/assets/halloween/icons/item-llaves-sedan.png',icon:'M14 10a4 4 0 1 0-8 0a4 4 0 0 0 8 0M14 10l8 8-3 3-3-3'},
 supply:{name:'Fuente de objetos sin identificar',color:'#f2bf64',group:'other',defaultVisible:false,icon:'M4 7h16v14H4zM8 7V3h8v4M4 12h16M10 12v3h4v-3'},
 landmark:{name:'Referencia del escenario',color:'#d6d9e2',group:'other',defaultVisible:true,icon:'M6 21V3h13l-3 4 3 4H6'}
});
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function fit(width,height,viewWidth,viewHeight){const scale=Math.min(viewWidth/width,viewHeight/height)*.96;return {scale,x:(viewWidth-width*scale)/2,y:(viewHeight-height*scale)/2};}
export function normalized(point,camera,width,height){return {x:(point.x-camera.x)/(camera.scale*width),y:(point.y-camera.y)/(camera.scale*height)};}
export function zoomAt(camera,point,scale){return {scale,x:point.x-(point.x-camera.x)*scale/camera.scale,y:point.y-(point.y-camera.y)*scale/camera.scale};}
export function validPoint(p){return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1;}
// Source coordinates stay immutable. Personal pins already belong to image space.
export function calibrateMap(map){
 if(!map.calibration||map.coordinateSpace==='image')return map;
 const [a,b,c,d,e,f]=map.calibration.sourceToImage;
 const project=p=>({...p,x:a*p.x+b*p.y+c,y:d*p.x+e*p.y+f});
 return {...map,coordinateSpace:'image',markers:map.markers.map(project),labels:map.labels.map(p=>{
  const q=project(p),angle=(p.rotation||0)*Math.PI/180;
  let rotation=Math.atan2(d*Math.cos(angle)+e*Math.sin(angle),a*Math.cos(angle)+b*Math.sin(angle))*180/Math.PI;
  // Street text follows the road; house numbers always remain upright.
  if(rotation>90)rotation-=180;if(rotation<=-90)rotation+=180;
  return {...q,rotation:p.kind==='street'?rotation:0};
 })};
}
// Group close visible points without moving their geographic coordinates.
// The group's anchor is its first point, never a fabricated new location.
export function markerGroups(markers,width,height,scale,distance=46){
 const groups=[];
 for(const marker of markers){
  const group=groups.find(g=>Math.hypot((g.x-marker.x)*width*scale,(g.y-marker.y)*height*scale)<distance);
  if(group)group.members.push(marker);else groups.push({x:marker.x,y:marker.y,members:[marker]});
 }
 return groups;
}
export function validateCatalog(data){
 if(data?.schemaVersion!==1||!Array.isArray(data.maps)||!data.maps.length)throw Error('Catálogo de mapas inválido');
 const ids=new Set();
 for(const map of data.maps){
  if(!/^[a-z0-9-]+$/.test(map.id)||ids.has(map.id)||typeof map.name!=='string'||!map.name.trim()||!/^\/assets\/halloween\/maps\/[a-z0-9-]+\.(svg|png|webp|jpe?g)$/.test(map.image)||!Number.isFinite(map.width)||!Number.isFinite(map.height)||!(map.width>0&&map.height>0)||typeof map.placeholder!=='boolean'||!Array.isArray(map.markers)||!Array.isArray(map.labels))throw Error('Mapa inválido');
  if(map.fallbackImage!==undefined&&!/^\/assets\/halloween\/maps\/[a-z0-9-]+\.(svg|png|webp|jpe?g)$/.test(map.fallbackImage))throw Error('Imagen alternativa inválida');
  ids.add(map.id);const points=new Set();
  if(map.calibration){
   const matrix=map.calibration.sourceToImage;
   if(!Array.isArray(matrix)||matrix.length!==6||!matrix.every(Number.isFinite)||Math.abs(matrix[0]*matrix[4]-matrix[1]*matrix[3])<1e-9)throw Error('Calibración inválida');
   const projected=calibrateMap(map);
   if([...projected.markers,...projected.labels].some(p=>!validPoint(p)))throw Error('Calibración fuera del mapa');
  }
  for(const marker of map.markers){
   if(!marker.id||points.has(marker.id)||!categories[marker.type]||!validPoint(marker)||typeof marker.title!=='string'||typeof marker.description!=='string'||typeof marker.possible!=='boolean'||!['confirmed','likely','community'].includes(marker.confidence)||typeof marker.source!=='string'||!marker.source.trim())throw Error('Marcador sin evidencia o coordenadas válidas');
   points.add(marker.id);
  }
  for(const label of map.labels)if(!validPoint(label)||typeof label.text!=='string'||!label.source||(label.rotation!==undefined&&!Number.isFinite(label.rotation))||(label.kind!==undefined&&!['street','address','landmark'].includes(label.kind)))throw Error('Referencia sin evidencia');
  if(map.placeholder&&(map.markers.length||map.labels.length))throw Error('Un placeholder no debe publicar geografía ficticia');
 }
 return data;
}
