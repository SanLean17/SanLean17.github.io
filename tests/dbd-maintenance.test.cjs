const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const {root,fixture}=require('./dbd-content-support.cjs');
const script=path.join(root,'maintenance/dbd-content/ContentTools.ps1');
const run=(folder,args=[])=>cp.spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',script,'-Root',folder,...args],{encoding:'utf8',windowsHide:true});
test('Windows validator rejects malformed catalogs, bad owners, paths, metadata, missing assets and conflicts; patch is complete and data-free',{skip:process.platform!=='win32'},()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'sanlean-validator-'));try{
    fixture(folder,false);let result=run(folder);assert.equal(result.status,0,result.stdout+result.stderr);
    const file=path.join(folder,'data/perks-killer.json'),original=fs.readFileSync(file,'utf8');
    for(const [label,mutate,expected] of [
      ['duplicate key',a=>a.push({...a[0]}),'duplicada'],
      ['numeric prefix',a=>a.push({...a.at(-1),key:'903_other'}),'numérico duplicado'],
      ['missing name',a=>delete a.at(-1).name,'Falta name'],
      ['enabled string',a=>a.at(-1).enabled='false','enabled debe'],
      ['aliases object',a=>a.at(-1).aliases={bad:true},'aliases debe'],
      ['aliases member',a=>a.at(-1).aliases=[2],'Cada alias'],
      ['owner',a=>a.at(-1).ownerKey='doesnotexist','ownerKey no existe'],
      ['update id',a=>a.at(-1).updateId='../bad','updateId no válido'],
      ['empty image',a=>a.at(-1).image='','image debe'],
      ['traversal',a=>a.at(-1).image='killer/../secret.png','Ruta de imagen'],
      ['extension',a=>a.at(-1).image='killer/x.svg','Ruta de imagen'],
      ['missing asset',a=>a.at(-1).image='killer/missing.png','No existe']
    ]){const a=JSON.parse(original);mutate(a);fs.writeFileSync(file,JSON.stringify(a));result=run(folder,['-Mode','Patch','-UpdateId','catalog-fixture']);assert.notEqual(result.status,0,label);assert(result.stdout.includes(expected),label+': '+result.stdout);assert(!fs.existsSync(path.join(folder,'exports/SanLean-catalog-fixture-PATCH.zip')));}
    fs.writeFileSync(file,'[{"key":"broken",}] broken');assert.notEqual(run(folder).status,0);fs.writeFileSync(file,original);
    const conflicts=path.join(folder,'data/perk-conflicts.json'),before=fs.readFileSync(conflicts);fs.writeFileSync(conflicts,JSON.stringify({killer:[['missing']],survivor:[]}));assert(run(folder).stdout.includes('referenciada no existe'));fs.writeFileSync(conflicts,before);
    assert.notEqual(run(folder,['-Mode','Patch','-UpdateId','unknown-update']).status,0);
    for(const dir of ['datos','progreso','preferencias','historial','sesion','respaldos']){fs.mkdirSync(path.join(folder,dir));fs.writeFileSync(path.join(folder,dir,'PRIVATE-SENTINEL.txt'),'DO NOT PACKAGE');}
    result=run(folder,['-Mode','Patch','-UpdateId','catalog-fixture']);assert.equal(result.status,0,result.stdout+result.stderr);assert(result.stdout.includes('ASSETS: 8'));
    const zip=path.join(folder,'exports/SanLean-catalog-fixture-PATCH.zip');const list=cp.execFileSync('powershell.exe',['-NoProfile','-Command',`Add-Type -AssemblyName System.IO.Compression.FileSystem; $z=[IO.Compression.ZipFile]::OpenRead('${zip.replaceAll("'","''")}'); $z.Entries.FullName; $z.Dispose()`],{encoding:'utf8',windowsHide:true}).trim().split(/\r?\n/).map(x=>x.replaceAll('\\','/')).filter(x=>!x.endsWith('/'));
    assert.equal(list.length,14,list.join('\n'));assert(list.includes('README-PATCH.txt'));assert.equal(list.filter(n=>n.startsWith('data/')).length,5);assert.equal(list.filter(n=>/\.(png|webp)$/.test(n)).length,8);assert(list.every(n=>/^(data|assets\/killers|survivors|killer|survivor)\/|^README-PATCH.txt$/.test(n)));assert(!list.some(n=>/PRIVATE|\.js$|\.cjs$|datos\//.test(n)));
    assert.notEqual(run(folder,['-Mode','Patch','-UpdateId','catalog-fixture']).status,0,'Do not overwrite prior deliverable');
  }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
