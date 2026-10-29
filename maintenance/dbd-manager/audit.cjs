'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { run, json } = require('./core.cjs');

const within = (file, root) => file.toLowerCase() === root.toLowerCase() || file.toLowerCase().startsWith(root.toLowerCase() + path.sep);
function measure(root) {
  const digest = crypto.createHash('sha256');
  let bytes = 0, files = 0;
  function visit(file) {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) throw Error('Contiene un enlace a otra ubicación.');
    digest.update(path.relative(root, file) + ':' + stat.size + ':' + stat.mtimeMs + '\n');
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(file).sort()) visit(path.join(file, name));
    } else { bytes += stat.size; files++; }
  }
  visit(root);
  return { bytes, files, fingerprint: digest.digest('hex') };
}
function noLinkedAncestors(file) {
  for (let p = file; p !== path.dirname(p); p = path.dirname(p)) {
    if (fs.lstatSync(p).isSymbolicLink()) throw Error('No se permite operar sobre enlaces de carpetas.');
  }
}

class Auditor {
  constructor(home, { roots, protectedPaths, recycle } = {}) {
    this.home = path.resolve(home);
    const project = path.join(os.homedir(), '.codex', '.chatgpt-projects', 'g-p-6ab548a8c5d08191b7b59a6ef5977ea5');
    this.roots = roots || [
      { path: path.join(project, 'exports'), pattern: /^(?:gestor|dbd-manager|dbd-catalog-review|SanLean-.*(?:DBD|Catalog|PATCH))/i, type: 'EXPORT' },
      { path: path.join(project, 'repo', 'dbd-content-test', 'test-results'), pattern: /^(?:manager|gestor)/i, type: 'TEMPORAL' }
    ];
    this.protected = (protectedPaths || [this.home, path.join(project, 'standalone', 'streamer-tools-local'), path.join(project, 'repo'), path.join(os.homedir(), 'AppData'), path.join(os.homedir(), 'Desktop', 'Programa para cargar Superviviente-Killer')]).map(p => path.resolve(p));
    // The repository is protected as an object. Only explicitly listed test-results children may be recycled.
    this.recycle = recycle || (async file => {
      if (process.platform !== 'win32') throw Error('La Papelera sólo está disponible en Windows. No se borró nada.');
      await run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'recycle.ps1'), '-LiteralTarget', file]);
    });
    this.records = new Map();
    this.plans = new Map();
  }
  allowed(file, root) {
    if (path.dirname(file).toLowerCase() !== path.resolve(root.path).toLowerCase() || !root.pattern.test(path.basename(file))) return false;
    // Cannot select a current installation, its parent, or any of its descendants.
    if (within(file, this.home) || within(this.home, file)) return false;
    return !this.protected.some(p => within(p, file) || (within(file, p) && !(root.type === 'TEMPORAL' && path.basename(root.path) === 'test-results' && !within(this.home, file))));
  }
  scan() {
    this.records.clear(); this.plans.clear();
    const entries = [];
    for (const root of this.roots) {
      if (!fs.existsSync(root.path)) continue;
      for (const name of fs.readdirSync(root.path).filter(n => root.pattern.test(n)).sort()) {
        const file = path.join(root.path, name), id = crypto.randomUUID();
        let stats, error = '';
        try { noLinkedAncestors(file); stats = measure(file); } catch (e) { error = e.message; }
        const isCurrent = within(this.home, file) || within(file, this.home);
        let version = '';
        try { version = json(path.join(file, 'base-manifest.json')).version || ''; } catch {}
        const row = { id, path: file, type: fs.lstatSync(file).isDirectory() ? 'Carpeta' : 'Archivo', date: fs.lstatSync(file).mtime.toISOString(), bytes: stats?.bytes || 0, files: stats?.files || 0, version, status: isCurrent ? 'ACTUAL' : /\.zip$/i.test(name) ? 'ZIP' : root.type === 'TEMPORAL' ? 'TEMPORAL' : version ? 'ANTIGUA' : 'EXPORT', selectable: !error && this.allowed(file, root), reason: error || (isCurrent ? 'Contiene el Gestor actual y sus datos.' : ''), selected: false };
        entries.push(row);
        this.records.set(id, { row, root, fingerprint: stats?.fingerprint });
      }
    }
    return { entries, roots: this.roots.map(r => r.path), protected: this.protected, message: 'Auditoría de ubicaciones conocidas. Ningún archivo fue movido ni borrado. Las casillas empiezan sin seleccionar.' };
  }
  selected(ids) {
    if (!Array.isArray(ids) || !ids.length || ids.length > 100 || new Set(ids).size !== ids.length) throw Error('Seleccioná manualmente las copias que querés revisar.');
    return ids.map(id => {
      const record = this.records.get(id);
      if (!record?.row.selectable || !this.allowed(record.row.path, record.root)) throw Error('La selección contiene una ubicación protegida o desconocida.');
      noLinkedAncestors(record.row.path);
      if (measure(record.row.path).fingerprint !== record.fingerprint) throw Error('La copia cambió desde la auditoría. Volvé a auditar.');
      return record;
    });
  }
  plan(ids) {
    const selected = this.selected(ids), token = crypto.randomUUID();
    const plan = { token, ids, entries: selected.map(r => r.row), bytes: selected.reduce((n, r) => n + r.row.bytes, 0), expires: Date.now() + 10 * 60 * 1000 };
    this.plans.set(token, plan);
    return plan;
  }
  async execute({ token, confirmation }) {
    const plan = this.plans.get(token);
    if (!plan || plan.expires < Date.now() || confirmation !== 'MOVER A LA PAPELERA') throw Error('Revisá y confirmá la selección antes de moverla.');
    const selected = this.selected(plan.ids);
    this.plans.delete(token);
    const moved = [];
    for (const record of selected) {
      try { await this.recycle(record.row.path); moved.push(record.row.path); }
      catch (e) { throw Error('Movidos: ' + moved.length + '. No se pudo mover ' + record.row.path + '. ' + e.message + ' No se usa borrado permanente.'); }
    }
    return { moved, message: 'Las copias seleccionadas se enviaron a la Papelera. El espacio se libera cuando vos vaciás la Papelera.' };
  }
}
module.exports = { Auditor, measure, within };
