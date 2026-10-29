'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { TYPES, OWNER, json, copy, mkdir, run, hash } = require('./core.cjs');

// Every administrative change belongs to a draft. The bundled base is immutable.
function install(Manager) {
  Manager.prototype.effectiveCatalogs = function(d) {
    return Object.fromEntries(TYPES.map(type => [type, this.catalogs[type].flatMap(entry => {
      const change = (d.catalogChanges || []).find(c => c.type === type && c.key === entry.key);
      if (change?.action === 'delete') return [];
      return [{ ...entry, ...(change?.action === 'enabled' ? { enabled: change.enabled } : {}), ...(change?.ownerKey ? { ownerKey: change.ownerKey } : {}) }];
    })]));
  };

  Manager.prototype.catalogOwner = function(id, input) {
    const d = this.read(id);
    this.checkRevision(d, input.revision);
    const all = this.effectiveCatalogs(d), ownerType = OWNER[input.type];
    for(const pending of d.items)all[pending.type].push(this.entry(pending,d));
    const entry = all[input.type]?.find(i => i.key === input.key && !i.emptySlot);
    if (!ownerType || !entry || !all[ownerType].some(i => i.key === input.ownerKey)) throw Error('Elegí una perk y un personaje existente del mismo rol.');
    const pending=d.items.find(i=>i.type===input.type&&i.key===input.key);
    if(pending){pending.ownerKey=input.ownerKey;return this.changed(d);}
    d.catalogChanges ||= [];
    const change = d.catalogChanges.find(c => c.type === input.type && c.key === input.key);
    if (change) change.ownerKey = input.ownerKey;
    else d.catalogChanges.push({ type: input.type, key: entry.key, name: entry.name, action: 'owner', ownerKey: input.ownerKey });
    return this.changed(d);
  };

  Manager.prototype.catalogPlan = function(id, input) {
    const d = this.read(id);
    const { type, key, scope = 'item', action } = input;
    if (!TYPES.includes(type) || !['item', 'perks', 'package'].includes(scope) || !['disable', 'enable', 'delete'].includes(action)) throw Error('Acción de catálogo no válida.');
    const all = this.effectiveCatalogs(d);
    for (const pending of d.items) all[pending.type].push(this.entry(pending,d));
    const item = all[type].find(i => i.key === key && !i.emptySlot);
    if (!item) throw Error('El contenido no existe en esta preparación.');
    if (OWNER[type] && scope !== 'item') throw Error('Una perk se administra individualmente.');
    const perkType = type === 'killers' ? 'perks-killer' : 'perks-survivor';
    const perks = OWNER[type] ? [] : all[perkType].filter(i => i.ownerKey === key && !i.emptySlot);
    const affected = [...(scope !== 'perks' ? [{ type, key, name: item.name }] : []), ...(scope !== 'item' ? perks.map(i => ({ type: perkType, key: i.key, name: i.name })) : [])];
    if (!affected.length) throw Error('No hay perks asociadas a este personaje.');
    if (action === 'delete' && scope === 'item' && perks.length) throw Error('Este personaje tiene ' + perks.length + ' perks. Eliminá sus perks explícitamente o elegí ELIMINAR PAQUETE COMPLETO para revisar la lista.');
    const pendingPerks = d.items.filter(i => i.ownerKey === key && OWNER[i.type] === type);
    if (action === 'delete' && scope === 'item' && pendingPerks.length) throw Error('Hay perks nuevas asociadas en este borrador. Revisá el paquete completo o quitalas antes de eliminar el personaje.');
    const assets=affected.map(i=>({path:this.catalog.resolveItemImage(all[i.type].find(x=>x.key===i.key),i.type),action:'CONSERVAR ARCHIVO'}));
    const conflicts=json(path.join(this.base,'data/perk-conflicts.json'));
    const references=affected.flatMap(i=>{const role=i.type==='perks-killer'?'killer':i.type==='perks-survivor'?'survivor':null;return role?(conflicts[role]||[]).filter(group=>group.includes(i.key)).map(group=>({file:'data/perk-conflicts.json',keys:group})):[];});
    return { revision: d.revision, type, key, scope, action, name: item.name, affected, assets, references };
  };

  Manager.prototype.catalogApply = function(id, input) {
    const d = this.read(id);
    this.checkRevision(d, input.revision);
    const plan = this.catalogPlan(id, input);
    if (JSON.stringify(input.affected) !== JSON.stringify(plan.affected)) throw Error('Cambió la lista de objetos. Revisá nuevamente la acción.');
    if (plan.action === 'delete' && input.confirmation !== 'ELIMINAR') throw Error('Confirmá la eliminación de los objetos indicados.');
    const changes = [...(d.catalogChanges || [])];
    for (const item of plan.affected) {
      const pending=d.items.find(i=>i.type===item.type&&i.key===item.key);
      if(pending){if(plan.action==='delete')d.items=d.items.filter(i=>i.id!==pending.id);else pending.enabled=plan.action==='enable';continue;}
      const index = changes.findIndex(c => c.type === item.type && c.key === item.key);
      const ownerKey = index !== -1 ? changes[index].ownerKey : undefined;
      const wasDisabled = index !== -1 && changes[index].action==='enabled' && changes[index].enabled===false;
      if (index !== -1) changes.splice(index, 1);
      const original = this.catalogs[item.type].find(i => i.key === item.key);
      if (plan.action === 'delete') changes.push({ ...item, action: 'delete' });
      else if ((original.enabled !== false) !== (plan.action === 'enable')) changes.push({ ...item, action: 'enabled', enabled: plan.action === 'enable', ...(ownerKey ? { ownerKey } : {}) });
      else if (plan.action==='enable' && input.retainActivation===true && wasDisabled) changes.push({...item,action:'enabled',enabled:true,restoresPreviousPatch:true,...(ownerKey?{ownerKey}:{})});
      else if (ownerKey) changes.push({ ...item, action: 'owner', ownerKey });
    }
    d.catalogChanges = changes;
    return this.changed(d);
  };

  Manager.prototype.catalogUndo = function(id, input) {
    const d = this.read(id);
    this.checkRevision(d, input.revision);
    d.catalogChanges = (d.catalogChanges || []).filter(c => c.type !== input.type || c.key !== input.key);
    return this.changed(d);
  };

  Manager.prototype.prepareConflicts = function(d, root, files) {
    const rel = 'data/perk-conflicts.json';
    const original = fs.readFileSync(path.join(this.base, rel));
    const conflicts = json(path.join(this.base, rel));
    let changed = false;
    for (const role of ['killer', 'survivor']) {
      const removed = new Set((d.catalogChanges || []).filter(c => c.type === 'perks-' + role && c.action === 'delete').map(c => c.key));
      conflicts[role] = conflicts[role].map(group => group.filter(key => {
        if (removed.has(key)) { changed = true; return false; }
        return true;
      })).filter(group => group.length > 1);
    }
    fs.writeFileSync(path.join(root, rel), changed ? JSON.stringify(conflicts, null, 2) + '\n' : original);
    if (changed) files.push({ path: rel, kind: 'modified' });
  };

  const originalPatch = Manager.prototype.patch;
  Manager.prototype.patch = async function(id) {
    let d = this.read(id);
    if (!d.catalogChanges?.length) return originalPatch.call(this, id);
    const a = this.artifact(d), out = path.join(a.dir, 'parche'), staging = path.join(out, 'contenido');
    mkdir(staging);
    for (const type of [...TYPES, 'perk-conflicts']) copy(path.join(a.root, 'data', type + '.json'), path.join(staging, 'data', type + '.json'));
    for (const file of a.manifest.files.filter(f => f.kind === 'new')) copy(path.join(a.root, file.path), path.join(staging, file.path));
    fs.writeFileSync(path.join(staging, 'README-PATCH.txt'), 'SANLEAN — PARCHE DE CATÁLOGOS\r\nCerrar Streamer Tools y respaldar su carpeta. Extraer este parche sobre la instalación adaptada al sistema de catálogos. Reemplaza únicamente catálogos y nuevos assets. No borrar datos ni reconfigurar OBS. Desactivar conserva identidad, progreso y archivos de imagen. Eliminar quita entradas del catálogo; no borra las imágenes antiguas ni datos personales.\r\n');
    const zip = path.join(out, 'SanLean-' + d.updateId + '-PATCH.zip');
    if (!fs.existsSync(zip)) await run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `Compress-Archive -Path '${staging.replaceAll("'", "''")}/*' -DestinationPath '${zip.replaceAll("'", "''")}'`]);
    d.patch = { file: path.relative(this.data, zip).split(path.sep).join('/'), sha256: hash(fs.readFileSync(zip)), manifestHash: d.build.manifestHash };
    return this.write(d);
  };
}
module.exports = { install };
