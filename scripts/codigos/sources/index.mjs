import {collect as bluesky} from './bluesky.mjs';
import {collect as wiki} from './wiki.mjs';
export const enabledSources=[{id:'bluesky',sourceType:'official_direct',collect:bluesky},{id:'wiki',sourceType:'official_wiki',collect:wiki}];
export const disabledSources=[
 {id:'dbd_web',sourceType:'official_direct',url:'https://deadbydaylight.com/news/',enabled:false,reason:'No se verificó un feed/API público estable; no se usa scraping del sitio dinámico.'},
 {id:'discord',sourceType:'official_direct',channel:'dbd-announcements',enabled:false,reason:'La lectura de mensajes requiere autenticación/permisos; no se crea bot ni token.'},
 ...['deadbydaylight','DbDBHVR_ES','DbDPulse'].map(account=>({id:`x_${account}`,account,sourceType:'official_direct',url:`https://x.com/${account}`,enabled:false,reason:'Cuenta conocida según registro del proyecto; sin API gratuita estable autorizada, sin scraping ni intermediarios.'}))
];
