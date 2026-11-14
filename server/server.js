// Mini-Server für User-Tests: liefert die Seite aus und legt jeden Testdurchlauf als eigene Datei ab:
//   data/sessions/<id>.json   (eine Datei pro Durchlauf, darum gibt es beim Zusammenführen via GitHub keine Konflikte)
// Auswertung im Browser: http://localhost:3000/results   (im Spiel: Taste E, dann „Testdaten ansehen“)
// Start: node server.js (Port 3000, oder PORT=... setzen).
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'data', 'sessions');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
};
// Nur diese Dateien werden ausgeliefert, damit data/ und server/ nicht direkt erreichbar sind.
const PUBLIC = {
  '/': 'index.html', '/index.html': 'index.html',
  '/spiel/spiel.html': 'spiel/spiel.html', '/spiel/zwei.html': 'spiel/zwei.html', '/spiel/results.html': 'spiel/results.html',
  '/spiel/app.js': 'spiel/app.js', '/spiel/zwei.js': 'spiel/zwei.js', '/spiel/style.css': 'spiel/style.css', '/spiel/zwei.css': 'spiel/zwei.css',
};
// Kurze Adressen leiten auf die echten Seiten weiter.
const REDIRECTS = {
  '/spiel': '/spiel/spiel.html', '/results': '/spiel/results.html', '/zwei': '/',
  '/oben': '/spiel/zwei.html?rolle=oben', '/unten': '/spiel/zwei.html?rolle=unten',
};

// Zwei Bildschirme: Das iPad schickt den Spielstand, der Server reicht ihn per Server-Sent Events an alle Bildschirme weiter.
let duoState = null;
const duoClients = new Set();
function duoBroadcast() {
  const msg = `data: ${JSON.stringify(duoState)}\n\n`;
  duoClients.forEach(res => res.write(msg));
}
setInterval(() => duoClients.forEach(res => res.write(': ping\n\n')), 20000);

// Adressen im WLAN, unter denen das iPad den Laptop erreicht.
function lanAddresses() {
  return Object.values(os.networkInterfaces()).flat()
    .filter(a => a && a.family === 'IPv4' && !a.internal).map(a => a.address);
}

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
  if (req.method === 'GET' && REDIRECTS[url]) { res.writeHead(302, { Location: REDIRECTS[url] }); res.end(); return; }
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
  if (req.method === 'GET' && url === '/api/duo/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 1500\n\n');
    if (duoState) res.write(`data: ${JSON.stringify(duoState)}\n\n`);
    duoClients.add(res);
    req.on('close', () => duoClients.delete(res));
    return;
  }
  if (req.method === 'POST' && url === '/api/duo') {
    let body = '', tooBig = false;
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 20000) { tooBig = true; req.destroy(); }
    });
    req.on('end', () => {
      if (tooBig) return;
      try {
        const next = JSON.parse(body);
        if (!next || typeof next !== 'object' || Array.isArray(next)) throw new Error('bad state');
        duoState = next;
        duoBroadcast();
        send(res, 204);
      } catch (e) { send(res, 400); }
    });
    return;
  }
  if (req.method === 'GET' && url === '/api/duo/info') {
    // Die Startseite kann auch als Datei (file://) offen sein und fragt dann von dort nach.
    res.setHeader('Access-Control-Allow-Origin', '*');
    send(res, 200, TYPES['.json'], JSON.stringify({ addresses: lanAddresses(), port: Number(process.env.PORT || 3000) }));
    return;
  }
  if (req.method === 'POST' && url === '/api/shutdown') {
    // Nur vom eigenen Rechner aus: beendet den Server (Startseite > „Server beenden“).
    const ra = req.socket.remoteAddress || '';
    if (!/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(ra)) { send(res, 403); return; }
    res.setHeader('Access-Control-Allow-Origin', '*');
    send(res, 204);
    setTimeout(() => process.exit(0), 100);
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
  console.log(`Zwei Bildschirme: Laptop http://localhost:${process.env.PORT || 3000}/oben`);
  lanAddresses().forEach(ip => console.log(`                  iPad   http://${ip}:${process.env.PORT || 3000}/unten`));
});
