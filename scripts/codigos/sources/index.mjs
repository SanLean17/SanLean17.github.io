import {collect as bluesky} from './bluesky.mjs';
import {collect as wiki} from './wiki.mjs';
export const enabledSources=[{id:'bluesky',sourceType:'official_direct',collect:bluesky},{id:'wiki',sourceType:'official_wiki',collect:wiki}];
// Metadata only: no collector, network requests or automatic activation.
export const nightlight=Object.freeze({
 id:'nightlight',name:'NightLight Codes',url:'https://nightlight.gg/codes',
 sourceType:'community_discovery',enabled:false,canConfirm:false,canPublish:false,
 reason:'No existe una API pública de códigos y los términos no permiten scraping automatizado sin autorización.',
 futureCandidate:Object.freeze({sourceType:'community_discovery',confidence:'REVIEW',official:false,
  reason:'Código detectado en NightLight; pendiente de confirmación por una fuente oficial o por la Wiki DBD.'})
});
export const disabledSources=[
 nightlight,
 {id:'dbd_web',sourceType:'official_direct',url:'https://deadbydaylight.com/news/',enabled:false,reason:'No se verificó un feed/API público estable; no se usa scraping del sitio dinámico.'},
 {id:'discord',sourceType:'official_direct',channel:'dbd-announcements',enabled:false,reason:'La lectura de mensajes requiere autenticación/permisos; no se crea bot ni token.'},
 ...['deadbydaylight','DbDBHVR_ES','DbDPulse'].map(account=>({id:`x_${account}`,account,sourceType:'official_direct',url:`https://x.com/${account}`,enabled:false,reason:'Cuenta conocida según registro del proyecto; sin API gratuita estable autorizada, sin scraping ni intermediarios.'}))
];
