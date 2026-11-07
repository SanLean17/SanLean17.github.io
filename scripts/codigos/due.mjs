import fs from 'node:fs';
import {shouldScan} from './agenda.mjs';
let health={};try{health=JSON.parse(fs.readFileSync('data/codigos-health.json','utf8'));}catch{}
const scan=shouldScan(health,Date.now(),process.env.GITHUB_EVENT_NAME);
if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`scan=${scan}\n`);
console.log(scan?'Corresponde consultar fuentes':'Análisis completo reciente: se evita duplicar la consulta');
