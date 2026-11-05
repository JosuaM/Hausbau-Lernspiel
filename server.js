// Mini-Server für User-Tests: liefert die Seite aus und legt jeden Testdurchlauf als eigene Datei ab:
//   data/sessions/<id>.json   (eine Datei pro Durchlauf, darum gibt es beim Zusammenführen via GitHub keine Konflikte)
// Auswertung im Browser: http://localhost:3000/results   (im Spiel: Taste E, dann „Testdaten ansehen“)
// Start: node server.js (Port 3000, oder PORT=... setzen).
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIR = path.join(ROOT, 'data', 'sessions');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
};
// Nur diese Dateien werden ausgeliefert, damit data/ und server.js nicht direkt erreichbar sind.
const PUBLIC = { '/': 'index.html', '/index.html': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css', '/results': 'results.html' };

fs.mkdirSync(DIR, { recursive: true });

// Alle vorhandenen Durchläufe laden (auch die, die per GitHub von anderen Rechnern kamen).
const records = new Map();
function loadAll() {
  records.clear();
  for (const f of fs.readdirSync(DIR)) {
    if (!f.endsWith('.json')) continue;
    try {
      const rec = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
      if (rec && rec.id) records.set(rec.id, rec);
    } catch (e) { console.warn(`Übersprungen (kaputt): ${f}`); }
  }
}
loadAll();

function persist(rec) {
  const file = path.join(DIR, `${rec.id}.json`);
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(rec, null, 2));
  fs.renameSync(`${file}.tmp`, file);
}

function upsert(input) {
  // Die ID wird zum Dateinamen, darum nur harmlose Zeichen zulassen.
  const id = String(input.id || '').slice(0, 64);
  if (!/^[A-Za-z0-9-]+$/.test(id)) throw new Error('bad id');
  const now = new Date().toISOString();
  let rec = records.get(id);
  if (!rec) { rec = { id, startedAt: now }; records.set(id, rec); }
  Object.assign(rec, {
    name: String(input.name || '').slice(0, 60),
    scenario: input.scenario ? String(input.scenario).slice(0, 40) : null,
    page: Number.isInteger(input.page) ? input.page : null,
    choices: input.choices && typeof input.choices === 'object' && !Array.isArray(input.choices) ? input.choices : {},
    ratings: input.ratings && typeof input.ratings === 'object' ? input.ratings : null,
    finished: input.finished === true || rec.finished === true,
    updatedAt: now,
  });
  persist(rec);
}

const sorted = () => [...records.values()].sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)));

function csv() {
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const steps = [...new Set(sorted().flatMap(r => Object.keys(r.choices || {})))];
  const head = ['id', 'name', 'szenario', 'gestartet', 'zuletzt', 'fertig', ...steps];
  const rows = sorted().map(r => [r.id, r.name, r.scenario, r.startedAt, r.updatedAt, r.finished ? 'ja' : 'nein',
    ...steps.map(s => (r.choices && r.choices[s] ? r.choices[s].text : ''))]);
  return '﻿' + [head, ...rows].map(row => row.map(cell).join(';')).join('\r\n');
}

function send(res, status, type, body) {
  res.writeHead(status, type ? { 'Content-Type': type } : {});
  res.end(body);
}

http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (req.method === 'POST' && url === '/api/session') {
    let body = '', tooBig = false;
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 20000) { tooBig = true; req.destroy(); }
    });
    req.on('end', () => {
      if (tooBig) return;
      try { upsert(JSON.parse(body)); send(res, 204); } catch (e) { send(res, 400); }
    });
    return;
  }
  if (req.method === 'GET' && url === '/api/results') { send(res, 200, TYPES['.json'], JSON.stringify(sorted())); return; }
  if (req.method === 'GET' && url === '/results.csv') { send(res, 200, TYPES['.csv'], csv()); return; }
  const name = req.method === 'GET' ? PUBLIC[url] : null;
  if (!name) { send(res, 404); return; }
  fs.readFile(path.join(ROOT, name), (err, buf) => {
    if (err) send(res, 404); else send(res, 200, TYPES[path.extname(name)], buf);
  });
}).listen(process.env.PORT || 3000, () => {
  console.log(`Läuft auf http://localhost:${process.env.PORT || 3000}`);
  console.log(`Auswertung: http://localhost:${process.env.PORT || 3000}/results  (${records.size} Durchläufe vorhanden)`);
});
