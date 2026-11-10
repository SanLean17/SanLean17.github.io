'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const catalog = require('../js/dbd-catalog.js');
const patch = require('../maintenance/dbd-content/patches/el-primero-v1.json');
const delta = require('../maintenance/dbd-content/streamer-runtime/catalog-delta.cjs');
const { root, copy } = require('./dbd-content-support.cjs');
const types = ['killers', 'survivors', 'perks-killer', 'perks-survivor'];
const catalogs = Object.fromEntries(types.map(type => [type, require('../data/' + type + '.json')]));
const byKey = key => catalogs.killers.find(row => row.key === key);

test('K36 and K42 retain separate portraits, owners and search results', () => {
  for (const [key, name, portrait] of [
    ['vecna', 'El Liche', 'K36_TheLich_Portrait.png'],
    ['lich', 'El Primero', 'T_UI_K42_TheFirst_Portrait.png']
  ]) {
    assert.equal(byKey(key).name, name);
    assert.equal(path.basename(byKey(key).image), portrait);
  }
  for (const [query, expected] of [
    ['El Liche', ['vecna']], ['The Lich', ['vecna']], ['Lich', ['vecna']],
    ['D&D', ['vecna']], ['El Primero', ['lich']], ['The First', ['lich']],
    ['Henry Creel', ['lich']], ['001', ['lich']], ['Vecna', ['vecna', 'lich']]
  ]) {
    const result = catalogs.killers.filter(row => catalog.matches(row, query, {
      type: 'killers', legacy: row.key === 'lich' ? 'first lich primer liche el primer liche' : ''
    }));
    assert.deepEqual(result.map(row => row.key), expected, query);
  }
  const owners = catalogs.killers;
  for (const [query, expected] of [['The Lich','vecna'],['Henry Creel','lich']]) {
    const perks = catalogs['perks-killer'].filter(row => ['vecna','lich'].includes(row.ownerKey));
    assert.deepEqual([...new Set(perks.filter(row => catalog.matches(row,query,{type:'perks-killer',owners})).map(row => row.ownerKey))],[expected]);
  }
});

test('the incremental patch preserves tickets, keyed progress and historical winners', () => {
  const runtime = fs.mkdtempSync(path.join(os.tmpdir(), 'sanlean-k42-'));
  const data = path.join(runtime, 'data');
  try {
    fs.cpSync(path.join(root,'maintenance/dbd-content/streamer-runtime'),runtime,{recursive:true});
    copy(path.join(root,'js/dbd-catalog.js'),path.join(runtime,'public/js/dbd-catalog.js'));
    fs.mkdirSync(data);
    const old = structuredClone(catalogs);
    const k36 = old.killers.find(row=>row.key==='vecna');
    const k42 = old.killers.find(row=>row.key==='lich');
    Object.assign(k36,{name:'Vecna',aliases:['vecna lich liche el liche']});
    Object.assign(k42,{name:'El Liche',aliases:['first lich primer liche el primer liche']});
    const {previewKillers} = require('../maintenance/dbd-manager/preview.cjs');
    const staged = structuredClone(old.killers);
    staged.find(row=>row.key==='lich').enabled = false;
    const preview = previewKillers(staged,catalogs.killers);
    assert.equal(preview.find(row=>row.key==='lich').enabled,false);
    assert.equal(preview.find(row=>row.key==='lich').name,'El Primero');
    assert.deepEqual(preview.find(row=>row.key==='vecna').aliases,byKey('vecna').aliases);
    assert.equal(staged.find(row=>row.key==='lich').name,'El Liche');
    for (const type of types) fs.writeFileSync(path.join(data,type+'.json'),JSON.stringify(old[type]));
    copy(path.join(root,'data/perk-conflicts.json'),path.join(data,'perk-conflicts.json'));
    const open = () => {
      for (const id of Object.keys(require.cache)) if (id.startsWith(runtime + path.sep)) delete require.cache[id];
      const factory = require(path.join(runtime,'application.cjs'));
      return {app:factory(path.join(runtime,'datos')),wheel:factory.models.wheel};
    };
    let {app,wheel} = open();
    app.action('challenges','all-killer',{type:'correct',key:'vecna',result:'completed'});
    app.action('tools','',{tool:'killer-wheel',type:'add',key:'lich',name:'SANLEAN'});
    app.checkpoint();
    const ticket = app.get('tools').tools['killer-wheel'].entries.find(e=>e.donor==='SANLEAN');
    fs.mkdirSync(path.join(data,'actualizaciones'));
    fs.writeFileSync(path.join(data,'actualizaciones',patch.id+'.json'),JSON.stringify(patch));
    ({app,wheel} = open());
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(data,'killers.json'))),catalogs.killers);
    const progress=app.get('challenges','all-killer').entries;
    assert.equal(progress.vecna,'completed');
    assert.equal(progress.lich,'pending');
    const pool=wheel.pool('killer-wheel',app.get('tools').tools['killer-wheel']);
    assert.deepEqual(pool.filter(e=>['vecna','lich'].includes(e.key)&&e.type==='default').map(e=>e.name),['El Liche','El Primero']);
    assert.equal(pool.find(e=>e.entryId===ticket.entryId).name,'El Primero');
    const legacy={...ticket,name:'El Liche'};
    const projected=catalog.projectOverlay({state:{items:[legacy],winner:legacy},settings:{pool:[legacy]}},catalogs.killers);
    assert.deepEqual([projected.state.winner.name,projected.state.winner.donor,projected.state.winner.entryId],['El Primero','SANLEAN',ticket.entryId]);
    assert.equal(legacy.name,'El Liche');
    assert.deepEqual(delta.applyPending(runtime),[]);
    // Earlier catalogs have no aliases and may have different enabled flags and content.
    delete k36.aliases; delete k42.aliases; k42.enabled=false;
    const result=delta.merge(old,patch);
    assert.equal(result.killers.find(row=>row.key==='lich').enabled,false);
    assert.deepEqual(result.killers.filter(row=>!['lich','vecna'].includes(row.key)),old.killers.filter(row=>!['lich','vecna'].includes(row.key)));
  } finally {
    fs.rmSync(runtime,{recursive:true,force:true});
  }
});

