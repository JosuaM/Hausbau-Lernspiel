// Version 2, zwei Bildschirme: oben zeigt an, unten wird bedient. Beide teilen sich einen Spielstand (state):
// Nur „unten“ ändert ihn und schickt ihn weiter (über server.js oder, ohne Server, über BroadcastChannel/localStorage).
// Das 3D-Haus kommt aus haus3d.js, die Inhalte aus daten.js.
'use strict';

const ROLE = (() => {
  const asked = new URLSearchParams(location.search).get('rolle');
  return asked === 'oben' || asked === 'unten' ? asked : null;
})();
if (!ROLE) { location.replace('../index.html'); throw new Error('Keine Rolle: zurück zur Startseite'); }

const SCEN = SCENARIOS.find(s => !s.locked);
const START = -1, SELECT = 0, CHALLENGE = 1, FIRST_STEP = 2;
const LAST_STEP = FIRST_STEP + SCEN.steps.length - 1, HOUSE = LAST_STEP + 1, SIM = HOUSE + 1, RESULT = SIM + 1;
const KINDS = { foundation: 'foundation', wall: 'wall', roof: 'roof', extra: 'extra' };
const SIM_RISE_S = 6, SIM_DELAY_MS = 900; // Simulation: Dauer des Wasseranstiegs und kurze Pause davor
const CYCLE_MS = 10000; // so lange steht ein Szenario in der Übersicht im Fokus (muss zu --cycle in v2.css passen)

const ui = document.getElementById('ui');
document.documentElement.dataset.role = ROLE;

// picked: Szenario, das unten angetippt wurde (null = Übersicht läuft von selbst durch)
// preset: gewählte Vorlage auf der Startseite (null = selbst bauen). durch: im Ergebnis durchs Wasser schauen.
let state = { rev: 0, page: START, focus: SCEN.id, picked: null, answers: [], run: 0, detail: null, preset: null, durch: false };
let scenario = SCEN, answers = [];

/* ---------- Vorlagen (Presets) ---------- */

const presetOf = id => (id ? PRESETS.find(p => p.id === id) || null : null);
// Antworten (Index der Option je Bauschritt) und Hausaufbau (id je Bauteil) einer Vorlage
const presetAnswers = p => SCEN.steps.map(step => Math.max(0, step.options.findIndex(o => o.id === p.pick[step.kind])));
const presetConfig = p => { const cfg = {}; SCEN.steps.forEach(step => { cfg[step.kind] = p.pick[step.kind] || null; }); return cfg; };

/* ---------- Helfer ---------- */

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

// Symbole im einheitlichen Linienstil (24 × 24, Strichstärke 1,8; Formen angelehnt an die freie Bibliothek Lucide)
const ICONS = {
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  next: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
  tap: '<path d="M9 11V5.5a1.5 1.5 0 013 0V11m0-1.5a1.5 1.5 0 013 0V12m0-1a1.5 1.5 0 013 0v4.5A5.5 5.5 0 0112 21h-1.5A5.5 5.5 0 015.7 18L3.5 14a1.5 1.5 0 012.3-1.8L9 15"/>',
  restart: '<path d="M3.5 12a8.5 8.5 0 108.5-8.5c-2.6 0-4.9 1.2-6.5 3L3.5 9"/><path d="M3.5 4v5h5"/>',
  open: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 018 0v3"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  task: '<rect x="6" y="4.5" width="12" height="16.5" rx="2"/><path d="M9.5 4.5V4a1 1 0 011-1h3a1 1 0 011 1v.5M9 10h6M9 14h6M9 17.5h3.5"/>',
  foundation: '<path d="M12 4l9 4.5-9 4.5-9-4.5z"/><path d="M3 12.5l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5"/>',
  wall: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 9.7h18M3 14.3h18M9 5v4.7M15 9.7v4.6M9 14.3V19"/>',
  roof: '<path d="M2.5 14L12 5l9.5 9"/><path d="M6.5 14L12 9l5.5 5M5 19h14"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8 6.8 19.5l1-5.8-4.2-4.1 5.8-.8z"/>',
  house: '<path d="M3 11l9-7.5 9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>',
  drop: '<path d="M12 3.5s6 6.2 6 10.5a6 6 0 01-12 0c0-4.3 6-10.5 6-10.5z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H4.5v1.5A3.5 3.5 0 008 11M16 6h3.5v1.5A3.5 3.5 0 0116 11M12 13v4M8.5 20.5h7M10 17h4"/>',
};
function icon(name) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.8'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICONS[name];
  return s;
}

function button(label, onTap, cls = '', iconName = null, iconAfter = false) {
  const b = el('button', `btn ${cls}`);
  b.type = 'button';
  if (iconName && !iconAfter) b.append(icon(iconName));
  if (label) b.append(document.createTextNode(label));
  if (iconName && iconAfter) b.append(icon(iconName));
  b.onclick = onTap;
  return b;
}
const iconButton = (name, title, onTap, cls = 'ghost') => {
  const b = button('', onTap, `icon ${cls}`, name);
  b.title = title; b.setAttribute('aria-label', title);
  return b;
};

const stepIndex = s => s.page - FIRST_STEP;
const chosenOption = i => (answers[i] == null ? null : scenario.steps[i].options[answers[i]]);
const optionOfKind = kind => { const i = scenario.steps.findIndex(s => s.kind === kind); return i < 0 ? null : chosenOption(i); };

function applyGlobals() {
  scenario = SCEN;
  answers = state.answers.slice();
}

// Mittelwert aller bewerteten Antworten; Besonderheiten können Werte ändern (sets/boost/boostWith).
function houseRatings() {
  const chosen = scenario.steps.map((_, i) => chosenOption(i)).filter(Boolean);
  const rated = chosen.map(o => o.ratings).filter(Boolean);
  const result = {};
  SCALES.forEach(([key]) => {
    result[key] = rated.length ? Math.round(rated.reduce((t, r) => t + r[key], 0) / rated.length) : 0;
    if (!rated.length) return;
    chosen.forEach(o => {
      if (o.sets && o.sets[key]) result[key] = o.sets[key];
      const foundation = optionOfKind('foundation');
      const applies = !o.boostWith || (foundation && foundation.id === o.boostWith);
      if (o.boost && o.boost[key] && applies) result[key] = Math.min(5, result[key] + o.boost[key]);
    });
  });
  return result;
}

// Zur Punktzahl zählen nur Stabilität und Flutschutz. Die Materialverfügbarkeit ist eine Zusatzinfo.
const SCORE_KEYS = ['stability', 'flood'];
const scoreOf = ratings => SCORE_KEYS.reduce((t, k) => t + (ratings[k] || 0), 0);
const scaleName = key => SCALES.find(s => s[0] === key)[1];
const scaleHelp = key => SCALES.find(s => s[0] === key)[2];

function verdictOf(points) {
  if (points >= 9) return { word: 'Sehr robust', lead: 'Dein Haus übersteht die Flut sehr gut. Die Auswahl passt zu den Bedingungen vor Ort.' };
  if (points >= 7) return { word: 'Solide', lead: 'Das Haus hält viel aus. An einzelnen Stellen geht noch etwas.' };
  if (points >= 5) return { word: 'Mit Schwächen', lead: 'Das Haus steht, aber bei einer größeren Flut wird es kritisch.' };
  return { word: 'Kritisch', lead: 'Eine Flut würde diesem Haus stark zusetzen. Überlege, welche Bauteile du ändern kannst.' };
}
const rateClass = v => (v >= 4 ? 'good' : v <= 2 ? 'bad' : 'mid');

function partScores(option) { return option && (option.ratings || option.scores) || null; }
function partVerdict(option) {
  const sc = partScores(option);
  if (!sc) return { kind: 'mid', label: 'Ohne Wertung' };
  const avg = SCORE_KEYS.reduce((t, k) => t + sc[k], 0) / SCORE_KEYS.length;
  return avg >= 3.5 ? { kind: 'good', label: 'Stark' } : avg <= 2.5 ? { kind: 'bad', label: 'Schwach' } : { kind: 'mid', label: 'Durchschnitt' };
}

// Farbfläche zur Auswahl (Material auf einen Blick)
const SWATCH = {
  earth: 'linear-gradient(135deg,#a98660,#7d5f40)', concrete: 'linear-gradient(135deg,#b4b4af,#8d8d88)', brick: 'linear-gradient(135deg,#c05d3e,#8d3d27)', stilts: 'linear-gradient(135deg,#cdc372,#8e9640)',
  mud: 'linear-gradient(135deg,#9c7c5c,#6f5340)', tin: 'linear-gradient(135deg,#d3dade,#8e979e)', brickwall: 'linear-gradient(135deg,#e2dccc,#c2b8a2)', ferro: 'linear-gradient(135deg,#cfd1cd,#a3a5a1)',
  tinhip: 'linear-gradient(135deg,#d3dade,#8e979e)', concreteflat: 'linear-gradient(135deg,#b4b4af,#8d8d88)', tilegable: 'linear-gradient(135deg,#d46a42,#a14527)', thatch: 'linear-gradient(135deg,#d9b866,#a2823c)',
  platform: 'linear-gradient(135deg,#8fa86a,#6b5237)', well: 'linear-gradient(135deg,#5b8cb5,#2f5d8a)', vetiver: 'linear-gradient(135deg,#8db85a,#4f7a31)', frame: 'linear-gradient(135deg,#8a5a34,#4a2f1a)',
};

/* ---------- Verbindung zwischen den Bildschirmen ---------- */

const sync = (() => {
  const viaServer = location.protocol.startsWith('http');
  const channel = !viaServer && 'BroadcastChannel' in window ? new BroadcastChannel('hausbau-zwei-v2') : null;
  const handlers = { state: () => {}, status: () => {} };
  const LS_KEY = 'hausbau-zwei-v2-msg';
  let counter = 0;
  const receive = data => {
    if (!data) return;
    if (data.ask) { if (ROLE === 'unten') send(state); return; }
    if (typeof data.rev === 'number') handlers.state(data);
  };
  const lsPost = msg => { try { localStorage.setItem(LS_KEY, JSON.stringify({ n: `${Date.now()}-${counter++}-${Math.random()}`, msg })); } catch (e) { /* ohne localStorage */ } };
  const post = msg => { if (channel) channel.postMessage(msg); lsPost(msg); };
  function send(next) {
    if (!viaServer) { post(next); return; }
    fetch('/api/duo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next), keepalive: true })
      .catch(() => handlers.status(false));
  }
  function connect() {
    if (!viaServer) {
      if (channel) channel.onmessage = e => receive(e.data);
      window.addEventListener('storage', e => {
        if (e.key !== LS_KEY || !e.newValue) return;
        try { receive(JSON.parse(e.newValue).msg); } catch (err) { /* kaputte Nachricht */ }
      });
      post({ ask: true });
      handlers.status(true);
      return;
    }
    const source = new EventSource('/api/duo/events');
    source.onopen = () => handlers.status(true);
    source.onerror = () => handlers.status(false);
    source.onmessage = e => { try { receive(JSON.parse(e.data)); } catch (err) { /* kaputte Nachricht */ } };
  }
  return { send, connect, on(type, fn) { handlers[type] = fn; } };
})();

const statusDot = el('div', 'status');
statusDot.title = 'Verbindung';
function setStatus(ok) { statusDot.classList.toggle('is-ok', ok); statusDot.title = ok ? 'Verbunden' : 'Keine Verbindung zum anderen Bildschirm'; }

// Testdaten (User-Testing): Nur „unten“ speichert, jeder Durchlauf hat eine eigene ID.
const session = { id: '' };
function saveSession(finished) {
  if (!session.id) return;
  const choices = {};
  scenario.steps.forEach((step, i) => { const o = chosenOption(i); if (o) choices[step.name] = { id: o.id || null, text: o.text }; });
  const body = JSON.stringify({ id: session.id, name: '', scenario: scenario.id, choices, ratings: houseRatings(), page: state.page, finished });
  fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
}

function update(changes) {
  // Der Blick durchs Wasser gilt nur für das Ergebnis: bei jedem Seitenwechsel zurück auf normal (außer es wird mitgegeben)
  if ('page' in changes && !('durch' in changes)) changes = { ...changes, durch: false };
  state = { ...state, ...changes, rev: state.rev + 1 };
  applyGlobals();
  if (session.id) saveSession(state.page === RESULT);
  sync.send(state);
  show();
}

/* ---------- Fortschritt (nur oben) ---------- */

// Seite n von N, immer sichtbar außer auf dem Startbild. Die Seitennummern (SELECT = 0 …) laufen ohne Lücke bis RESULT.
const STEP_ICON = { foundation: 'foundation', wall: 'wall', roof: 'roof', extra: 'star' };
const progress = (() => {
  const box = el('nav', 'progress');
  box.setAttribute('aria-label', 'Fortschritt');
  const pages = [['Szenario', 'pin'], ['Aufgabe', 'task'], ...SCEN.steps.map(x => [x.name, STEP_ICON[x.kind] || 'star']), ['Haus', 'house'], ['Flut', 'drop'], ['Ergebnis', 'trophy']];
  const row = el('div', 'prow');
  const segs = pages.map(([label, ic]) => { const sg = el('div', 'pseg'); sg.title = label; row.append(sg); return sg; });
  box.append(row);
  document.body.append(box);
  return {
    update(page) {
      box.hidden = page === START;
      box.setAttribute('aria-label', `Fortschritt: Schritt ${page + 1} von ${pages.length}`);
      segs.forEach((sg, i) => { sg.classList.toggle('is-done', i < page); sg.classList.toggle('is-now', i === page); });
    },
  };
})();

/* ---------- 3D ---------- */

if (new URLSearchParams(location.search).has('seite')) window.HAUS_NO_ANIM = true;
const stage = Haus3D.create(document.getElementById('stage3d'));
stage.setRecord(SCEN.record);
const SAMPLE = { foundation: 'brick', wall: 'brickwall', roof: 'tinhip', extra: null };

function houseConfig() {
  const cfg = {};
  scenario.steps.forEach((step, i) => { const o = chosenOption(i); cfg[step.kind] = o ? o.id : null; });
  return cfg;
}

let cardImage = null;
const presetImages = {}; // Vorschaubilder der Vorlagen (einmal gerendert, dann gemerkt)
function sceneImage() {
  if (!cardImage) cardImage = stage.snapshot(1600, 900, { cfg: { foundation: 'brick', wall: 'brickwall', roof: 'tinhip', extra: null }, name: 'site', flood: true, az: .55 });
  return cardImage;
}

// Stellt die 3D-Ansicht passend zur Seite ein.
let lastFloodPage = null, lastStartPreset = null;
let firstStage = true;
function applyStage(s) {
  const instant = firstStage; firstStage = false;
  const view = viewName(s);
  const top = ROLE === 'oben';
  // Unten läuft das 3D auf allen Seiten als Hintergrund (Wiese, später Blick senkrecht aufs Gras). Oben ist es nur auf den Szenario-Seiten aus.
  document.body.classList.toggle('no3d', top && (view === 'select' || view === 'pick'));
  stage.setMeadow(view === 'start');
  stage.setShift(0); // das Haus steht immer in der Mitte des Bildschirms
  stage.setDrag(false);
  stage.setAuto(0);
  stage.setClear(false); // nur das Ergebnis schaltet den Blick durchs Wasser wieder ein (unten)
  if (!top && view !== 'start') {
    // Unten nach dem Start: Kamera schwenkt vom Haus senkrecht nach unten aufs 3D-Gras davor, das Haus liegt außerhalb des Bildes.
    stage.setView('house'); stage.setMeadow(false); stage.setPole(false); stage.setAuto(0); stage.setShift(0);
    stage.focus('groundDown', { instant });
    return;
  }
  if (view === 'challenge') {
    stage.setView('land');
    stage.focus(top ? 'land' : 'land2', { instant });
    stage.setAuto(.012);
    return;
  }
  stage.setView('house');
  stage.setPole(view !== 'start');
  if (view === 'start') {
    // Eine gewählte Vorlage steht auf beiden Bildschirmen im Bild; beim Wechsel baut sie sich neu auf.
    const preset = presetOf(s.preset), key = preset ? preset.id : null;
    stage.setHouse(preset ? presetConfig(preset) : SAMPLE, { animate: !instant && key !== lastStartPreset });
    lastStartPreset = key;
    // Oben dreht sich der Blick langsam um das Haus. Unten dasselbe Haus tief aus dem Rasen davor, der Button steht auf dem Gras.
    stage.focus(top ? 'start' : 'startGround', { instant }); stage.setAuto(top ? .015 : 0); stage.setFlood(false, false);
    return;
  }
  stage.setHouse(houseConfig());
  if (view === 'step') {
    const kind = scenario.steps[stepIndex(s)].kind;
    stage.focus(kind, { keepAz: !instant, instant });
    stage.setFlood(false);
  } else if (view === 'house') {
    stage.focus('overview', { instant }); stage.setAuto(top ? .1 : 0); stage.setFlood(false);
  } else if (view === 'sim') {
    // Sturm, Regen und Flut laufen als Simulation (flut.js, ca. 35 s); die Anzeige oben liest den echten Pegel am Haus.
    stage.focus('result', { instant }); stage.setAuto(.03);
    if (lastFloodPage !== s.run) {
      lastFloodPage = s.run; stage.setFlood(false, false);
      setTimeout(() => { if (state.page === SIM && state.run === s.run) stage.setFlood(true, true, SIM_RISE_S); }, SIM_DELAY_MS);
    }
  } else if (view === 'result') {
    // Das Wasser bleibt stehen. Ein Bauteil unten angetippt: Kamera geht oben darauf zu.
    if (s.detail != null) stage.focus(scenario.steps[s.detail].kind, { keepAz: true });
    else stage.focus('result', { instant });
    stage.setFlood(true, false);
    // Blick durchs Wasser: das Wasser wird klar, die Kamera schaut steiler nach unten (flach spiegelt die Oberfläche zu stark)
    stage.setClear(!!s.durch);
    if (s.durch) stage.cam.tgt.pol = Math.min(stage.cam.tgt.pol, .72);
  }
}

// Querschnitt-Icon einer Auswahl (siehe schnitte.js); fehlt eine Zeichnung, bleibt die Farbfläche.
function fillPic(pic, option, marks = false) {
  if (!option) return;
  if (Schnitt.has(option.id)) { pic.style.background = 'none'; pic.innerHTML = Schnitt.svg(option.id, { marks }); }
}

// Die vier gewählten Bauteile als 2 × 2 Buttons (unten): Antippen ruft onTap(Index) auf.
function partsQuad(onTap) {
  const quad = el('div', 'quad');
  const items = scenario.steps.map((step, i) => {
    const o = chosenOption(i);
    const b = el('button', 'q');
    b.type = 'button';
    const pic = el('span', 'pic');
    pic.style.background = (o && SWATCH[o.id]) || '#ccc';
    fillPic(pic, o);
    const label = el('span', 'lbl');
    label.append(el('small', null, step.name), el('strong', null, o ? o.text : 'Nicht gewählt'));
    b.append(pic, label);
    b.onclick = () => onTap(i);
    quad.append(b);
    return b;
  });
  return { node: quad, items };
}

// Was die Flut mit dem Haus macht (einfach gehalten): Wasserstand im Haus aus der Bodenhöhe, Zustand aus der Stabilität.
function simOutcome() {
  const cm = Math.max(0, Math.round((1 - (stage.state.floorY || 0)) * 100));
  const stability = houseRatings().stability || 0;
  const water = cm === 0 ? { good: true, text: 'Das Haus bleibt trocken. Das Wasser steht unter dem Boden.' }
    : { good: cm <= 15, text: `Das Wasser steht ${cm} cm hoch im Haus.` };
  // Schadensmodell (schaden.js): je Bauteil ein Satz, die schlimmsten zuerst (höchstens zwei)
  const dmg = stage.damageInfo && stage.damageInfo();
  if (dmg && dmg.lines.length) {
    const worst = dmg.lines.slice().sort((a, b) => b.sev - a.sev).slice(0, 2);
    return [water, ...worst.map(l => ({ good: l.good, text: l.text }))];
  }
  return [
    water,
    stability >= 4 ? { good: true, text: 'Die Bauteile halten dem Wasser stand.' }
      : stability === 3 ? { good: false, text: 'Die Bauteile werden angegriffen, halten aber noch.' }
      : { good: false, text: 'Wände und Fundament weichen auf. Es drohen schwere Schäden.' },
  ];
}

// Ring wie in Version 1: Anteil der Haushalte vor Ort (oder Kosten im Vergleich), die diese Option nutzen
const RING_R = 44, RING_LEN = 2 * Math.PI * RING_R;
function usageRing() {
  const box = el('div', 'ring');
  const rb = el('div', 'rb');
  rb.innerHTML = `<svg viewBox="0 0 110 110" aria-hidden="true"><circle class="disc" cx="55" cy="55" r="40"/><circle class="track" cx="55" cy="55" r="${RING_R}"/><circle class="arc" cx="55" cy="55" r="${RING_R}" stroke-dasharray="${RING_LEN}" stroke-dashoffset="${RING_LEN}" transform="rotate(-90 55 55)"/></svg>`;
  const num = el('span', 'num');
  rb.append(num);
  const txt = el('p', 'txt');
  box.append(rb, txt);
  const arc = rb.querySelector('.arc');
  return {
    node: box,
    show(option) {
      const entry = option && option.usage && option.usage.real;
      const value = entry ? entry.value : 0;
      num.replaceChildren();
      if (entry && entry.kind === 'estimate' && !entry.label) num.append(el('small', null, 'ca.'));
      if (!entry) num.append(el('b', null, '–'));
      else if (entry.label) num.append(el('b', 'is-label', entry.label));
      else num.append(el('b', null, `${value.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`));
      arc.style.strokeDashoffset = RING_LEN * (1 - Math.min(100, value) / 100);
      txt.replaceChildren(el('strong', null, !option ? 'Wähle unten ein Bauteil.' : !entry ? 'Keine Daten' : entry.note || entry.line || `der Haushalte in ${scenario.region} bauen so`));
    },
  };
}

/* ---------- Seiten ---------- */

function viewName(s) {
  const p = s.page;
  if (p === START) return 'start';
  if (p === SELECT) return s.picked ? 'select' : 'pick';
  if (p === CHALLENGE) return 'challenge';
  if (p >= FIRST_STEP && p <= LAST_STEP) return 'step';
  if (p === HOUSE) return 'house';
  if (p === SIM) return 'sim';
  return 'result';
}

function dashboard(withUsage = true) {
  const wrap = el('aside', 'dash');
  const score = el('section', 'score');
  const head = el('div', 'score-head');
  head.append(el('span', 'eyebrow', 'Dein Haus'));
  const total = el('div', 'score-total');
  head.append(total);
  score.append(head);
  const bars = {};
  SCORE_KEYS.forEach(key => {
    const row = el('div', 'rate');
    const line = el('div', 'rate-row');
    const label = el('span', null, scaleName(key)), val = el('span', null, '–');
    line.append(label, val);
    const bar = el('div', 'bar');
    for (let i = 0; i < 5; i++) bar.append(el('i'));
    row.title = scaleHelp(key);
    row.append(line, bar);
    bars[key] = { bar, val };
    score.append(row);
  });
  wrap.append(score);

  // Materialverfügbarkeit: bewusst anders gestaltet, damit sie nicht wie ein Teil der Punktzahl wirkt.
  const side = el('section', 'side-info');
  side.append(el('div', 'tag', 'Zusatzinfo · zählt nicht zur Punktzahl'));
  const sideHead = el('h3', null, scaleName('availability'));
  sideHead.title = scaleHelp('availability');
  const pips = el('div', 'pips');
  for (let i = 0; i < 5; i++) pips.append(el('i'));
  const vals = el('div', 'vals');
  const big = el('span', 'big'), note = el('span', 'note');
  vals.append(big, note);
  const fine = el('p', 'fine');
  side.append(sideHead, pips, vals, fine);
  wrap.append(side);

  return {
    node: wrap,
    update(option) {
      const r = houseRatings();
      const has = Object.values(r).some(Boolean);
      total.replaceChildren(String(scoreOf(r)), Object.assign(el('small'), { textContent: ' / 10' }));
      total.style.opacity = has ? 1 : .35;
      SCORE_KEYS.forEach(key => {
        const v = r[key] || 0;
        bars[key].bar.className = `bar${v ? ` is-${v}` : ''}`;
        bars[key].val.textContent = v ? `${v} / 5` : '–';
      });
      const av = r.availability || 0;
      [...pips.children].forEach((p, i) => p.classList.toggle('on', i < av));
      const u = option && option.usage && option.usage.real;
      if (!withUsage || !option) { big.textContent = av ? `${av} / 5` : '–'; note.textContent = 'Wie leicht sind die Materialien vor Ort zu bekommen?'; fine.textContent = ''; return; }
      big.textContent = !u ? 'k. A.' : u.label ? u.label : `${u.kind === 'estimate' ? 'ca. ' : ''}${u.value.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`;
      note.textContent = !u ? 'Keine Daten' : u.note || u.line || `der Haushalte in ${scenario.region} bauen so`;
      fine.textContent = `Verfügbarkeit insgesamt: ${av ? `${av} von 5` : '–'}`;
    },
  };
}

// Die drei Szenarien als Karten, oben und unten gleich gebaut. Die Karte im Fokus wird breiter und zeigt
// einen kurzen Einblick (teaser); darunter läuft ein Balken, wie lange sie noch im Fokus bleibt.
function scenarioCards(onTap) {
  const cards = el('div', 'cards');
  cards.style.setProperty('--cycle', `${CYCLE_MS}ms`);
  const slots = new Map();
  SCENARIOS.forEach(sc => {
    const slot = el('div', 'slot');
    const card = el('button', `scn scn-${sc.id}${sc.locked ? ' is-locked' : ''}`);
    card.type = 'button';
    if (sc.locked) card.append(icon('lock'));
    else card.style.backgroundImage = `url(${sceneImage()})`;
    const cap = el('div', 'cap');
    cap.append(el('strong', null, sc.title), el('span', null, sc.subtitle));
    const t = sc.teaser;
    if (t) {
      const teaser = el('div', 'teaser');
      if (t.big) {
        const fact = el('div', 'bigfact');
        fact.append(el('b', null, t.big), el('span', null, t.label));
        teaser.append(fact);
      }
      teaser.append(el('p', null, t.text));
      cap.append(teaser);
    }
    card.append(cap);
    if (onTap) card.onclick = () => onTap(sc); else card.tabIndex = -1;
    const track = el('div', 'track');
    track.append(el('i'));
    slot.append(card, track);
    slots.set(sc.id, slot);
    cards.append(slot);
  });
  return {
    node: cards,
    // picked: Es wurde eines angetippt, die Übersicht läuft nicht mehr durch.
    set(focus, picked) {
      slots.forEach((n, id) => n.classList.toggle('is-focus', id === focus));
      cards.classList.toggle('is-picked', picked);
      cards.classList.toggle('is-cycling', !picked);
    },
  };
}

function pickHead() {
  const head = el('div', 'head');
  head.append(el('p', 'eyebrow', 'Hausbau-Konfigurator'), el('h1', null, 'Wähle dein Szenario'));
  return head;
}

// Glaskarte im linken Bereich (oben): wächst mit ihrem Inhalt und lässt den Rest des Bildes frei.
function pane(...kids) { const p = el('div', 'pane'); p.append(...kids); return p; }
function factList(sc) {
  const facts = el('dl', 'facts');
  sc.facts.forEach(f => {
    const item = el('div', 'fact');
    item.append(el('dt', null, f.label), el('dd', null, f.value), el('small', null, f.detail));
    facts.append(item);
  });
  return facts;
}

// Kleine Karte mit wechselnden Fakten und einer Grafik (Kreis oder Pegel). Erscheint, bleibt kurz stehen, verschwindet, nächster Fakt.
function factCard(side, tag, list, startDelay, show = 9000, hide = 3200) {
  const card = el('aside', `ff ff-${side}`);
  const gfx = el('div', 'ff-gfx'), body = el('div', 'ff-body');
  body.append(el('p', 'eyebrow', tag));
  const text = el('p', 'ff-text');
  body.append(text);
  card.append(gfx, body);
  let n = Math.floor(Math.random() * list.length), timer = 0, alive = true;
  const graphic = f => {
    if (f.kind === 'gauge') {
      const k = Math.min(1, f.value / f.max);
      return `<svg viewBox="0 0 110 110" width="110" height="110" aria-hidden="true"><rect class="g-tube" x="8" y="8" width="26" height="94" rx="13"/><rect class="g-water" x="11" y="${(11 + 88 * (1 - k)).toFixed(1)}" width="20" height="${(88 * k).toFixed(1)}" rx="10"/><path class="g-tick" d="M40 30h8M40 50h8M40 70h8M40 90h8"/><text class="g-num" x="54" y="62">${f.label}</text></svg>`;
    }
    return `<svg viewBox="0 0 110 110" width="110" height="110" aria-hidden="true"><circle class="disc" cx="55" cy="55" r="40"/><circle class="track" cx="55" cy="55" r="${RING_R}"/><circle class="arc" cx="55" cy="55" r="${RING_R}" stroke-dasharray="${RING_LEN}" stroke-dashoffset="${RING_LEN * (1 - Math.min(100, f.value) / 100)}" transform="rotate(-90 55 55)"/></svg><span class="num"><b>${f.label}</b></span>`;
  };
  const cycle = () => {
    if (!alive) return;
    const f = list[n % list.length]; n++;
    gfx.className = `ff-gfx ff-${f.kind}`;
    gfx.innerHTML = graphic(f);
    text.textContent = f.text;
    card.classList.add('is-in');
    setTimeout(refreshGlass, 850);
    timer = setTimeout(() => { card.classList.remove('is-in'); timer = setTimeout(cycle, hide); }, show);
  };
  timer = setTimeout(cycle, startDelay);
  return { node: card, stop() { alive = false; clearTimeout(timer); } };
}

const TOP = {
  start: {
    key: () => 'start',
    build() {
      const wrap = el('div', 'view start');
      const box = el('div', 'box');
      box.append(el('p', 'eyebrow', 'Hausbau-Konfigurator'));
      const h = el('h1'); h.append('Kannst du das perfekte', el('br'), 'Haus bauen?');
      box.append(h);
      // Gewählte Vorlage: Name und die vier Bauteile (erscheint, sobald unten eine Vorlage angetippt wurde)
      const info = el('div', 'presetinfo');
      box.append(info);
      const left = factCard('left', 'Wusstest du? · Weltweit', WORLD_FACTS, 12500, 8500, 8500);
      const right = SCEN.funfacts ? factCard('right', `Wusstest du? · ${SCEN.subtitle}`, SCEN.funfacts, 3000, 8500, 8500) : null;
      wrap.append(box, left.node);
      if (right) wrap.append(right.node);
      let shownPreset = null;
      return {
        nodes: [wrap],
        update(st) {
          const p = presetOf(st.preset);
          info.classList.toggle('is-on', !!p);
          if (!p || shownPreset === p.id) return;
          shownPreset = p.id;
          const list = el('dl', 'plist');
          SCEN.steps.forEach(step => {
            const o = step.options.find(x => x.id === p.pick[step.kind]);
            const row = el('div');
            row.append(el('dt', null, step.name), el('dd', null, o ? o.text : '–'));
            list.append(row);
          });
          info.replaceChildren(el('p', 'eyebrow', 'Vorlage'), el('h2', null, p.name), list);
        },
      };
    },
  },

  // Übersicht: läuft von selbst durch, solange unten noch nichts angetippt wurde
  pick: {
    key: () => 'pick',
    build() {
      const wrap = el('div', 'view pick');
      const deck = scenarioCards(null);
      const bar = el('div', 'nav');
      bar.append(el('span', 'pointhint', 'Tippe unten auf ein Szenario, um mehr zu erfahren.'));
      wrap.append(pickHead(), deck.node, bar);
      return { nodes: [wrap], update(st) { deck.set(st.focus, false); } };
    },
  },

  select: {
    key: s => `select:${s.focus}`,
    build(s) {
      const chosen = SCENARIOS.find(x => x.id === s.focus) || SCEN;
      const wrap = el('div', 'view');
      const hero = el('div', `hero${chosen.locked ? ' is-locked' : ''}`);
      if (chosen.locked) hero.append(icon('lock'));
      else hero.style.backgroundImage = `url(${sceneImage()})`;
      const rail = el('aside', 'rail');
      if (chosen.locked) {
        rail.append(pane(el('p', 'eyebrow', `${chosen.title} · ${chosen.subtitle}`), el('h1', null, 'Bald verfügbar'),
          el('p', 'lead', 'An diesem Szenario wird noch gearbeitet. Wähle unten „Überschwemmung“, um zu starten.')));
      } else {
        rail.append(pane(el('p', 'eyebrow', `${chosen.title} · ${chosen.subtitle}`), el('h1', null, chosen.title), el('p', 'lead', chosen.challenge.context)), el('div', 'grow'), pane(factList(chosen)));
      }
      wrap.append(hero, rail);
      return { nodes: [wrap] };
    },
  },

  challenge: {
    key: () => 'challenge',
    build() {
      const wrap = el('div', 'view');
      const rail = el('aside', 'rail');
      const task = el('div', 'detail');
      task.append(el('h2', null, 'Deine Aufgabe'), el('p', null, SCEN.challenge.task));
      rail.append(pane(el('p', 'eyebrow', `${SCEN.title} · ${SCEN.subtitle}`), el('h1', null, 'Die Challenge'), el('p', 'lead', SCEN.challenge.context), task),
        el('div', 'grow'), pane(factList(SCEN)));
      wrap.append(rail);
      return { nodes: [wrap] };
    },
  },

  step: {
    key: s => `step:${s.page}`,
    build(s) {
      const i = stepIndex(s), step = scenario.steps[i];
      const wrap = el('div', 'view');
      const rail = el('aside', 'rail');
      const detail = el('div', 'detail');
      const ring = usageRing();
      rail.append(pane(el('p', 'eyebrow', `${step.name} wählen`), el('h1', null, step.question), detail), el('div', 'grow'), pane(ring.node));
      // Querschnitt der gewählten Auswahl (oben rechts), mit Nummern und Legende
      const xs = el('aside', 'xsec');
      const xsHead = el('p', 'eyebrow'), xsStage = el('div', 'xs-stage'), xsPic = el('div', 'xs-pic');
      xsStage.append(xsPic);
      xs.append(xsHead, xsStage);
      wrap.append(rail, xs);
      return {
        nodes: [wrap],
        update() {
          const option = chosenOption(i);
          ring.show(option);
          detail.className = `detail${option ? '' : ' is-empty'}`;
          xs.classList.toggle('is-on', !!(option && Schnitt.has(option.id)));
          if (option && Schnitt.has(option.id)) {
            xsHead.textContent = `Querschnitt · ${option.text}`;
            xsPic.innerHTML = Schnitt.svg(option.id, { marks: true });
            xsStage.querySelectorAll('.xs-tag').forEach(n => n.remove());
            const marks = Schnitt.marks(option.id);
            Schnitt.legend(option.id).forEach((t, k) => {
              const [mx, my] = marks[k] || [120, 80];
              const tag = el('span', 'xs-tag', t);
              tag.style.top = `${my / 160 * 100}%`;
              if (mx < 130) tag.style.left = `calc(${mx / 240 * 100}% + 1.3rem)`; else tag.style.right = `calc(${(240 - mx) / 240 * 100}% + 1.3rem)`;
              xsStage.append(tag);
            });
          }
          if (!option) { detail.replaceChildren(icon('tap'), el('p', null, 'Wähle unten ein Bauteil. Es erscheint sofort im Haus.')); return; }
          const parts = [el('h2', null, option.text), el('p', null, option.info)];
          if (option.hint) {
            const good = el('div', 'good');
            good.append(el('b', null, 'Gut zu wissen'), el('p', null, option.hint));
            parts.push(good);
          }
          detail.replaceChildren(...parts);
        },
      };
    },
  },

  house: {
    key: () => 'house',
    build() {
      const wrap = el('div', 'view');
      const rail = el('aside', 'rail');
      const parts = el('div', 'parts');
      SCEN.steps.forEach((step, i) => {
        const o = chosenOption(i);
        const card = el('div', 'part');
        card.append(el('small', null, step.name), el('strong', null, o ? o.text : 'Nicht gewählt'));
        parts.append(card);
      });
      rail.append(pane(el('p', 'eyebrow', `${SCEN.title} · ${SCEN.subtitle}`), el('h1', null, 'Dein fertiges Haus'), parts,
        el('p', 'pointhint', 'Mit „Flut starten“ unten kommt das Wasser: Du siehst, wie das Haus es übersteht.')));
      wrap.append(rail);
      return { nodes: [wrap] };
    },
  },

  // Simulation: Das Wasser steigt auf 1 m, danach erscheint, was es mit dem Haus macht. Das Ergebnis folgt auf der nächsten Seite.
  sim: {
    key: s => `sim:${s.run}`,
    build() {
      const wrap = el('div', 'view');
      const rail = el('aside', 'rail');
      const level = el('div', 'simlevel');
      const big = el('div', 'simbig'), val = el('b', null, '0');
      big.append(val, el('span', null, ' cm Wasserstand'));
      const bar = el('div', 'simbar'), fill = el('i');
      bar.append(fill);
      const phase = el('p', 'pointhint', 'Der Sturm zieht auf');
      level.append(big, bar, phase);
      const lines = el('div', 'simlines');
      const outcome = simOutcome().map(o => {
        const p = el('p', o.good ? 'is-good' : 'is-bad');
        p.append(icon(o.good ? 'check' : 'x'), document.createTextNode(o.text));
        lines.append(p);
        return p;
      });
      rail.append(pane(el('p', 'eyebrow', `${SCEN.title} · ${SCEN.subtitle}`), el('h1', null, 'Die Flut kommt'), level, lines));
      wrap.append(rail);
      // Zähler und Phase lesen den echten Wasserstand vor der Haustür aus der Simulation (flut.js)
      let raf = 0, shown = false; const timers = [];
      const tick = () => {
        const f = stage.floodInfo(), k = Math.min(1, Math.max(0, f.level));
        val.textContent = String(Math.round(k * 100));
        fill.style.transform = `scaleX(${k})`;
        if (f.phaseText && phase.textContent !== f.phaseText) phase.textContent = f.phaseText;
        if (f.done && !shown) { shown = true; outcome.forEach((p, i) => timers.push(setTimeout(() => p.classList.add('is-in'), 500 + i * 1400))); }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return { nodes: [wrap], dispose() { cancelAnimationFrame(raf); timers.forEach(clearTimeout); } };
    },
  },

  result: {
    key: s => `result:${s.run}`,
    build() {
      const wrap = el('div', 'view');
      const rail = el('aside', 'rail');
      const ratings = houseRatings(), points = scoreOf(ratings), verdict = verdictOf(points);
      const score = el('div', 'result-score');
      score.append(el('b', null, String(points)), el('span', null, 'von 10 Punkten'));
      const card = el('div', 'detail');
      rail.append(pane(el('p', 'eyebrow', 'Dein Ergebnis'), el('h1', null, verdict.word), score, el('p', 'lead', verdict.lead)), el('div', 'grow'), pane(card));
      const dash = dashboard(false);
      dash.update(null);
      // Hinweis unten in der Mitte, solange der Blick durchs Wasser an ist
      const note = el('p', 'clearnote');
      note.append(icon('eye'), el('span', null, 'Blick durchs Wasser'), el('small', null, 'So sieht das Haus unter der Wasserlinie aus'));
      wrap.append(rail, dash.node, note);
      return {
        nodes: [wrap],
        update(st) {
          note.classList.toggle('is-on', !!st.durch);
          const i = st.detail;
          const option = i == null ? null : chosenOption(i);
          if (!option) { card.className = 'detail is-empty'; card.replaceChildren(icon('tap'), el('p', null, 'Wähle unten ein Bauteil, um zu sehen, wie es abgeschnitten hat.')); return; }
          const v = partVerdict(option);
          card.className = 'detail';
          const good = el('div', 'good'); good.append(el('b', null, 'Das spricht dafür'), el('p', null, option.good));
          const bad = el('div', 'good'); bad.append(el('b', null, 'Das spricht dagegen'), el('p', null, option.bad));
          const parts = [el('p', 'eyebrow', scenario.steps[i].name), el('h2', null, option.text), Object.assign(el('span', `verdict ${v.kind}`), { textContent: v.label }), good, bad];
          if (option.tip) parts.push(el('p', 'tip', option.tip));
          card.replaceChildren(...parts);
        },
      };
    },
  },
};

/* ---------- Unterer Bildschirm: Bedienung ---------- */

// Unten gibt es nur große Schalter: eine Fläche mit Auswahl (oder ein riesiger Hauptschalter) und darunter eine Leiste mit Zurück/Weiter.
const bbtn = (label, onTap, cls = '', iconName = null, after = false) => button(label, onTap, `bbtn ${cls}`, iconName, after);
// Unten: oben in der Mitte der Titel der Seite, darunter die Bedienflächen, ganz unten die Leiste (Zurück als Symbol links, Weiter rechts).
function ctl(title, main, ...bar) {
  const wrap = el('div', 'view ctl');
  const hd = el('header', 'ctl-head');
  hd.append(el('h1', null, title));
  const row = el('div', 'ctl-bar');
  row.append(...bar);
  wrap.append(hd, main, row);
  return wrap;
}
// Zurück ist nur ein Pfeil, links in der Leiste.
function backBtn(onTap, title = 'Zurück', iconName = 'back') {
  const b = button('', onTap, 'bbtn round ghost', iconName);
  b.title = title; b.setAttribute('aria-label', title);
  return b;
}
function giant(label, onTap, iconName) {
  const b = el('button', 'giant');
  b.type = 'button';
  const chip = el('span', 'chip-go'); chip.append(icon(iconName));
  b.append(el('span', null, label), chip);
  b.onclick = onTap;
  return b;
}

const BOTTOM = {
  // Start: oben fertige Häuser (Vorlagen) zum Antippen, darunter der große Start-Schalter. Ohne Vorlage baut man selbst.
  start: {
    key: () => 'start',
    build() {
      const wrap = el('div', 'view start');
      const col = el('div', 'start-col');
      const PRESET_MS = 45000; let rotor = null;
      const go = giant('Jetzt starten', () => {
        session.id = (crypto.randomUUID && crypto.randomUUID()) || `s${Date.now()}${Math.random().toString(16).slice(2)}`;
        update({ page: SELECT, focus: SCEN.id, picked: null, answers: [], preset: null, detail: null });
      }, 'next');
      col.append(go);
      wrap.append(col);
      return {
        nodes: [wrap],
        update(st) {
          go.firstChild.textContent = 'Jetzt starten';
          // Ohne Eingabe wechselt das Haus oben von selbst alle PRESET_MS; beide Bildschirme bekommen den neuen Stand.
          clearTimeout(rotor);
          rotor = setTimeout(() => {
            const i = PRESETS.findIndex(p => p.id === st.preset);
            update({ preset: PRESETS[(i + 1) % PRESETS.length].id });
          }, st.preset ? PRESET_MS : 600);
        },
        dispose() { clearTimeout(rotor); },
      };
    },
  },

  // Übersicht und Auswahl in einer Ansicht, damit die Karten beim Antippen nicht neu aufgebaut werden:
  // Ohne Auswahl wechselt der Fokus alle CYCLE_MS von selbst (siehe manageCycle), danach zeigt oben die Szenario-Seite.
  cards: {
    key: () => 'cards',
    build() {
      const deck = scenarioCards(sc => update({ focus: sc.id, picked: sc.id }));
      const back = backBtn(() => update(state.picked ? { picked: null } : { page: START }));
      const go = bbtn('Szenario wählen', () => update({ page: CHALLENGE }), 'primary', 'next', true);
      const wrap = ctl('Wähle dein Szenario', deck.node, back, go);
      return {
        nodes: [wrap],
        update(st) {
          const sc = SCENARIOS.find(x => x.id === st.focus);
          deck.set(st.focus, !!st.picked);
          go.disabled = !st.picked || !sc || sc.locked;
        },
      };
    },
  },

  // Die Aufgabe steht oben: unten nur der Schalter.
  challenge: {
    key: () => 'challenge',
    build() {
      const wrap = ctl('Die Challenge', giant(`Auf nach ${SCEN.subtitle}`, () => update({ page: FIRST_STEP, answers: [], preset: null, detail: null }), 'next'),
        backBtn(() => update({ page: SELECT })));
      return { nodes: [wrap] };
    },
  },

  // Vier große Buttons (2 × 2) mit Querschnitt-Icon und Name, ohne Beschreibung: Die steht oben.
  step: {
    key: s => `step:${s.page}`,
    build(s) {
      const i = stepIndex(s), step = scenario.steps[i];
      const quad = el('div', 'quad');
      const items = step.options.map((o, j) => {
        const b = el('button', 'q');
        b.type = 'button';
        const pic = el('span', 'pic');
        pic.style.background = SWATCH[o.id] || '#ccc';
        fillPic(pic, o);
        const tick = el('span', 'tick'); tick.append(icon('check'));
        b.append(pic, el('strong', null, o.text), tick);
        b.onclick = () => {
          const next = state.answers.slice(); next[i] = j;
          if (window.Flug) Flug.launch(b, o.id);
          update({ answers: next });
        };
        quad.append(b);
        return b;
      });
      const isLast = s.page === LAST_STEP;
      const back = backBtn(() => update({ page: s.page === FIRST_STEP ? CHALLENGE : s.page - 1 }));
      const next = bbtn(isLast ? 'Zum fertigen Haus' : 'Weiter', () => update({ page: s.page + 1 }), 'primary', 'next', true);
      const wrap = ctl(step.question, quad, back, next);
      return {
        nodes: [wrap],
        update(st) {
          const chosen = st.answers[i];
          items.forEach((b, j) => b.classList.toggle('is-on', chosen === j));
          next.disabled = chosen == null;
        },
      };
    },
  },

  // Zusammenfassung: die vier Bauteile als Buttons (Antippen = dieses Bauteil ändern), dazu „Flut starten“.
  house: {
    key: () => 'house',
    build() {
      const quad = partsQuad(i => update({ page: FIRST_STEP + i }));
      const wrap = ctl('Dein fertiges Haus', quad.node, backBtn(() => update({ page: LAST_STEP })),
        bbtn('Flut starten', () => update({ page: SIM, run: state.run + 1, detail: null }), 'primary', 'next', true));
      return { nodes: [wrap] };
    },
  },

  sim: {
    key: s => `sim:${s.run}`,
    build() {
      const wrap = ctl('Die Flut kommt', giant('Ergebnis ansehen', () => update({ page: RESULT, detail: null }), 'next'),
        backBtn(() => update({ page: HOUSE }), 'Zurück zum Haus'),
        bbtn('Nochmal ansehen', () => update({ run: state.run + 1 }), 'ghost', 'restart'));
      return { nodes: [wrap] };
    },
  },

  // Ergebnis: Oben steht alles. Unten wählt man nur, worauf oben der Fokus liegt, oder startet neu.
  result: {
    key: s => `result:${s.run}`,
    build() {
      const quad = partsQuad(i => update({ detail: state.detail === i ? null : i }));
      // Durchs Wasser schauen: Schalter, der oben das Wasser klar macht, damit man die Schäden unter der Wasserlinie sieht
      const through = bbtn('Durchs Wasser schauen', () => update({ durch: !state.durch }), 'ghost', 'eye');
      const wrap = ctl('Tippe ein Bauteil an, um mehr zu sehen', quad.node,
        backBtn(() => update({ page: START, picked: null, answers: [], preset: null, detail: null }), 'Zum Start'),
        bbtn('Nochmal bauen', () => update({ page: FIRST_STEP, answers: [], preset: null, detail: null }), 'ghost', 'restart'),
        bbtn('Anderes Szenario', () => update({ page: SELECT, picked: null, answers: [], preset: null, detail: null }), 'ghost', 'open'),
        through);
      return {
        nodes: [wrap],
        update(st) {
          quad.items.forEach((c, i) => c.classList.toggle('is-on', st.detail === i));
          through.classList.toggle('primary', !!st.durch); through.classList.toggle('ghost', !st.durch);
        },
      };
    },
  },
};

// Übersicht und Auswahl teilen sich unten eine Ansicht (siehe BOTTOM.cards).
BOTTOM.pick = BOTTOM.select = BOTTOM.cards;

/* ---------- Entwicklermenü (Taste E) ----------
   Stellt ein, wie die Hintergrund-Infos erscheinen (Lichtschein oder Glas-Pop-up), wie der Randeffekt aussieht (Farbe, Stärke)
   welche Bau-Animation läuft (Wolke oder Aufbau, über data-bau am <html>) und wie die Querschnitte aussehen (data-schnitt).
   Die Werte werden im Browser gespeichert und über data-pop und CSS-Variablen am <html> wirksam. */
const dev = (() => {
  const KEY = 'hausbau.dev';
  const cfg = { pop: 'licht', rim: '#ffffff', k: 1, focus: false, fk: 1, bau: 'wolke', sx: 'zeichnung' };
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* ohne Speicher: Standardwerte */ }
  const root = document.documentElement;
  const rgb = hex => { const m = /^#?([0-9a-f]{6})$/i.exec(hex); const n = parseInt(m ? m[1] : 'ffffff', 16); return `${n >> 16} ${(n >> 8) & 255} ${n & 255}`; };
  let box = null;

  function sync() {
    if (!box) return;
    box.querySelectorAll('[data-pop]').forEach(b => b.classList.toggle('is-on', b.dataset.pop === cfg.pop));
    box.querySelectorAll('[data-bau]').forEach(b => b.classList.toggle('is-on', b.dataset.bau === cfg.bau));
    box.querySelectorAll('[data-sx]').forEach(b => b.classList.toggle('is-on', b.dataset.sx === cfg.sx));
    box.querySelectorAll('[data-rim]').forEach(b => b.classList.toggle('is-on', cfg.k > 0 && b.dataset.rim.toLowerCase() === cfg.rim.toLowerCase()));
    box.querySelector('[data-rim="aus"]').classList.toggle('is-on', cfg.k === 0);
    box.querySelector('input[type=color]').value = cfg.rim;
    box.querySelector('input[type=range]:not([data-fk])').value = Math.round(cfg.k * 100);
    box.querySelector('.dv-pct').textContent = `${Math.round(cfg.k * 100)} %`;
    box.querySelectorAll('[data-focus]').forEach(b => b.classList.toggle('is-on', (b.dataset.focus === 'an') === cfg.focus));
    box.querySelector('input[data-fk]').value = Math.round(cfg.fk * 100);
    box.querySelector('.dv-fpct').textContent = `${Math.round(cfg.fk * 100)} %`;
  }
  function apply() {
    root.dataset.pop = cfg.pop;
    root.dataset.bau = cfg.bau;   // Bau-Animation in haus3d.js: 'wolke' oder 'aufbau'
    root.dataset.schnitt = cfg.sx === '3d' ? '3d' : 'zeichnung';   // Querschnitt-Bilder: Zeichnung (schnitte.js) oder 3D-Foto (schnitt3d.js)
    root.style.setProperty('--rim-rgb', rgb(cfg.rim));
    root.style.setProperty('--rim-k', cfg.k);
    root.dataset.focus = cfg.focus ? 'an' : 'aus';
    root.style.setProperty('--focus-k', cfg.fk);
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* egal */ }
    sync();
    setTimeout(refreshGlass, 60);
  }
  function build() {
    box = document.createElement('aside');
    box.id = 'devmenu'; box.hidden = true;
    box.innerHTML = `<header><b>Entwicklermenü</b><span>E oder Esc zum Schließen</span></header>
      <section><h4>Einblendungen</h4><div class="dv-seg"><button type="button" data-pop="licht">Lichtschein</button><button type="button" data-pop="glas">Glas-Pop-up</button></div></section>
      <section><h4>Bau-Animation</h4><div class="dv-seg"><button type="button" data-bau="wolke">Wolke</button><button type="button" data-bau="aufbau">Aufbau</button></div></section>
      <section><h4>Querschnitt-Bilder</h4><div class="dv-seg"><button type="button" data-sx="zeichnung">Zeichnung</button><button type="button" data-sx="3d">3D-Schnitt</button></div></section>
      <section><h4>Randeffekt</h4>
        <div class="dv-seg"><button type="button" data-rim="aus">Aus</button><button type="button" data-rim="#ffffff">Weiß</button><button type="button" data-rim="#000000">Schwarz</button>
        <label class="dv-col" title="Eigene Farbe"><input type="color" value="#ffffff"><span>Farbe</span></label></div>
        <div class="dv-row"><span>Stärke</span><input type="range" min="0" max="200" step="5"><b class="dv-pct"></b></div>
      </section>
      <section><h4>Fokus aufs Haus</h4>
        <div class="dv-seg"><button type="button" data-focus="aus">Aus</button><button type="button" data-focus="an">An</button></div>
        <div class="dv-row"><span>Stärke</span><input type="range" data-fk min="20" max="150" step="5"><b class="dv-fpct"></b></div>
      </section>
      <footer><button type="button" data-reset>Zurücksetzen</button></footer>`;
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.pop) cfg.pop = b.dataset.pop;
      else if (b.dataset.bau) cfg.bau = b.dataset.bau;
      else if (b.dataset.sx) { cfg.sx = b.dataset.sx; apply(); view = null; show(); return; }   // Seite mit den neuen Bildern neu aufbauen
      else if (b.dataset.rim === 'aus') cfg.k = 0;
      else if (b.dataset.rim) { cfg.rim = b.dataset.rim; if (cfg.k === 0) cfg.k = 1; }
      else if (b.dataset.focus) cfg.focus = b.dataset.focus === 'an';
      else if ('reset' in b.dataset) { cfg.pop = 'licht'; cfg.rim = '#ffffff'; cfg.k = 1; cfg.focus = false; cfg.fk = 1; cfg.bau = 'wolke'; cfg.sx = 'zeichnung'; }
      apply();
    });
    box.querySelector('input[type=color]').addEventListener('input', e => { cfg.rim = e.target.value; if (cfg.k === 0) cfg.k = 1; apply(); });
    box.querySelector('input[type=range]:not([data-fk])').addEventListener('input', e => { cfg.k = e.target.value / 100; apply(); });
    box.querySelector('input[data-fk]').addEventListener('input', e => { cfg.fk = e.target.value / 100; cfg.focus = true; apply(); });
    document.body.append(box);
    sync();
  }
  function toggle(open) {
    if (!box) build();
    box.hidden = open === undefined ? !box.hidden : !open;
  }
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'e' || e.key === 'E') { e.preventDefault(); toggle(); }
    else if (e.key === 'Escape' && box && !box.hidden) toggle(false);
  });
  apply();
  return { cfg, toggle };
})();

/* ---------- Seitenwechsel ---------- */

// Solange unten nichts angetippt ist, rückt der Fokus alle CYCLE_MS zum nächsten Szenario. Nur „unten“ zählt die Zeit
// und schickt den neuen Fokus weiter, damit beide Bildschirme gleichzeitig wechseln.
let cycleTimer = null, cycleFocus = null;
function manageCycle() {
  const active = ROLE === 'unten' && state.page === SELECT && !state.picked;
  if (!active) { clearTimeout(cycleTimer); cycleTimer = null; cycleFocus = null; return; }
  if (cycleTimer && cycleFocus === state.focus) return;
  clearTimeout(cycleTimer);
  cycleFocus = state.focus;
  cycleTimer = setTimeout(() => {
    cycleTimer = null;
    const i = SCENARIOS.findIndex(x => x.id === state.focus);
    update({ focus: SCENARIOS[(i + 1) % SCENARIOS.length].id });
  }, CYCLE_MS);
}

let view = null, swapToken = 0;

// Der Weichzeichner (backdrop-filter) bleibt nach dem Einblenden einer Seite manchmal aus, bis sich am Element etwas ändert.
// Ein kurzes Aus- und Anschalten von will-change nach der Einblendung behebt das.
function refreshGlass() {
  document.querySelectorAll('.q, .bbtn, .giant, .ctl-head h1, .ff, .rail > .grow + .pane').forEach(n => {
    n.style.willChange = 'auto'; void n.offsetWidth; n.style.willChange = 'backdrop-filter';
  });
}

function show() {
  applyGlobals();
  applyStage(state);
  manageCycle();
  progress.update(state.page);
  const next = (ROLE === 'oben' ? TOP : BOTTOM)[viewName(state)];
  const key = next.key(state);
  if (view && view.key === key) { view.update && view.update(state); return; }
  const token = ++swapToken;
  const old = view;
  if (old) { old.nodes.forEach(n => n.classList && n.classList.add('is-leaving')); if (old.dispose) old.dispose(); }
  setTimeout(() => {
    if (token !== swapToken) return;
    applyGlobals();
    const built = next.build(state);
    view = { key, ...built };
    ui.replaceChildren(...built.nodes);
    if (built.update) built.update(state);
    setTimeout(refreshGlass, 700); setTimeout(refreshGlass, 1500);
  }, old ? 190 : 0);
}

/* ---------- Start ---------- */

document.body.append(statusDot);
sync.on('status', setStatus);
sync.on('state', next => {
  // Oben gilt immer der neueste Stand. Unten übernimmt nur Neueres (z. B. nach dem Neuladen).
  if (ROLE === 'unten' && next.rev <= state.rev) return;
  if (ROLE === 'oben' && next.rev === state.rev && view) return;
  state = { ...state, ...next };
  show();
});
if (ROLE === 'unten') document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
// Zum Ausprobieren einzelner Seiten: ?seite=3&antw=0,1&fokus=flood (Seite 0: &gewaehlt=flood zeigt die Szenario-Seite)
{
  const q = new URLSearchParams(location.search);
  if (q.has('seite')) {
    window.HAUS_NO_ANIM = true;
    state = { ...state, page: Number(q.get('seite')), answers: (q.get('antw') || '').split(',').filter(x => x !== '').map(Number), focus: q.get('fokus') || state.focus, picked: q.get('gewaehlt') || null, detail: q.has('detail') ? Number(q.get('detail')) : null, run: 1, preset: q.get('preset') || null, durch: q.get('durch') === '1' };
    applyGlobals();
  }
}
// Entwicklung: Beim Neuladen (auch durch den Live-Reload unten) bleibt die aktuelle Seite erhalten.
try {
  const keep = sessionStorage.getItem('hausbau-live-state');
  if (keep && !new URLSearchParams(location.search).has('seite')) {
    sessionStorage.removeItem('hausbau-live-state');
    state = { ...state, ...JSON.parse(keep) };
    applyGlobals();
  }
} catch (e) { /* ohne sessionStorage */ }
show();
sync.connect();

/* ---------- Live-Reload (Entwicklung) ----------
   Prüft jede Sekunde, ob sich eine eingebundene Datei (Skripte, Stylesheets, die Seite selbst) geändert hat, und lädt dann neu.
   Aus mit ?live=0. Im Museum ändern sich die Dateien nicht, dort passiert dadurch nichts. */
if (new URLSearchParams(location.search).get('live') !== '0') {
  const urls = [location.pathname + location.search, ...[...document.querySelectorAll('script[src], link[rel="stylesheet"]')]
    .map(n => n.getAttribute('src') || n.getAttribute('href')).filter(u => u && !/^https?:/.test(u)).map(u => new URL(u, location.href).pathname)];
  const seen = new Map();
  const check = async () => {
    try {
      for (const u of urls) {
        const text = await (await fetch(u, { cache: 'no-store' })).text();
        if (seen.has(u) && seen.get(u) !== text) {
          try { sessionStorage.setItem('hausbau-live-state', JSON.stringify(state)); } catch (e) { /* egal */ }
          location.reload();
          return;
        }
        seen.set(u, text);
      }
    } catch (e) { /* Server gerade weg */ }
    setTimeout(check, 1000);
  };
  setTimeout(check, 1500);
}
