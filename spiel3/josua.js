// Version 3, Variante „Josua“: ein Bildschirm, per Touch bedienbar.
// Ablauf: Start → Szenario → Einleitung (Challenge, Lage, optional Chars, Realitäts-Check) → Hausbau (4 Schritte)
//         → Zusammenfassung → Simulation mit Stopps → Ergebnis (Explosionsansicht, Rundgang Bauteil für Bauteil).
// 3D: haus3d.js (Kopie von spiel2 mit Erweiterungen: Char-Welt, Explosion, weißer Raum, Pause, Antippen).
'use strict';

const SCEN = SCENARIOS.find(s => s.id === 'flood');
const STEPS = SCEN.steps;
const KINDS = STEPS.map(s => s.kind);           // foundation, wall, roof, extra
const SCORE_KEYS = ['stability', 'flood'];
const STOP_SECONDS = 15;                         // so lange steht ein Stopp in der Simulation
const SIM_END_MS = 6000;                         // so lange nach Höchststand und letztem Schaden folgt das Ergebnis
const PRESET_MS = 28000;                         // Wechsel der Hausvorlage auf der Startseite
const SIM_DELAY_MS = 900;

/* ---------- Helfer ---------- */

const $ = (sel, root = document) => root.querySelector(sel);
const sleep = ms => new Promise(r => setTimeout(r, ms));
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
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
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  task: '<rect x="6" y="4.5" width="12" height="16.5" rx="2"/><path d="M9.5 4.5V4a1 1 0 011-1h3a1 1 0 011 1v.5M9 10h6M9 14h6M9 17.5h3.5"/>',
  foundation: '<path d="M12 4l9 4.5-9 4.5-9-4.5z"/><path d="M3 12.5l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5"/>',
  wall: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 9.7h18M3 14.3h18M9 5v4.7M15 9.7v4.6M9 14.3V19"/>',
  roof: '<path d="M2.5 14L12 5l9.5 9"/><path d="M6.5 14L12 9l5.5 5M5 19h14"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8 6.8 19.5l1-5.8-4.2-4.1 5.8-.8z"/>',
  house: '<path d="M3 11l9-7.5 9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>',
  drop: '<path d="M12 3.5s6 6.2 6 10.5a6 6 0 01-12 0c0-4.3 6-10.5 6-10.5z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H4.5v1.5A3.5 3.5 0 008 11M16 6h3.5v1.5A3.5 3.5 0 0116 11M12 13v4M8.5 20.5h7M10 17h4"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  play: '<path d="M8 5.5v13l11-6.5z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
  chart: '<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3"/>',
  book: '<path d="M5 4.5h9a3 3 0 013 3V20H8a3 3 0 01-3-3z"/><path d="M5 17a3 3 0 013-3h9"/>',
};
function icon(name) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.8'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICONS[name] || '';
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
function iconButton(name, title, onTap, cls = 'ghost') {
  const b = button('', onTap, `icon ${cls}`, name);
  b.title = title; b.setAttribute('aria-label', title);
  return b;
}
const SWATCH = {
  earth: 'linear-gradient(135deg,#a98660,#7d5f40)', concrete: 'linear-gradient(135deg,#b4b4af,#8d8d88)', brick: 'linear-gradient(135deg,#c05d3e,#8d3d27)', stilts: 'linear-gradient(135deg,#cdc372,#8e9640)',
  mud: 'linear-gradient(135deg,#9c7c5c,#6f5340)', tin: 'linear-gradient(135deg,#d3dade,#8e979e)', brickwall: 'linear-gradient(135deg,#e2dccc,#c2b8a2)', ferro: 'linear-gradient(135deg,#cfd1cd,#a3a5a1)',
  tinhip: 'linear-gradient(135deg,#d3dade,#8e979e)', concreteflat: 'linear-gradient(135deg,#b4b4af,#8d8d88)', tilegable: 'linear-gradient(135deg,#d46a42,#a14527)', thatch: 'linear-gradient(135deg,#d9b866,#a2823c)',
  platform: 'linear-gradient(135deg,#8fa86a,#6b5237)', well: 'linear-gradient(135deg,#5b8cb5,#2f5d8a)', vetiver: 'linear-gradient(135deg,#8db85a,#4f7a31)', frame: 'linear-gradient(135deg,#8a5a34,#4a2f1a)',
};
function fillPic(pic, option) {
  pic.style.background = (option && SWATCH[option.id]) || '#ccc';
  if (option && Schnitt.has(option.id)) { pic.style.background = 'none'; pic.innerHTML = Schnitt.svg(option.id, { marks: false }); }
}
const fmt = (n, d = 1) => n.toLocaleString('de-DE', { maximumFractionDigits: d });

/* ---------- Spielstand ---------- */

// page: start | szenario | challenge | geo | char | real | b0..b3 | haus | sim | ergebnis | t0..t3
// ground: 'ufer' (Festland) oder 'char' (Flussinsel, schwerer)
let state = { page: 'start', ground: 'ufer', answers: [], run: 0, fromHaus: false };
const chosenOption = i => (state.answers[i] == null ? null : STEPS[i].options[state.answers[i]]);
const optionOfKind = kind => { const i = KINDS.indexOf(kind); return i < 0 ? null : chosenOption(i); };
const houseConfig = () => { const cfg = {}; STEPS.forEach((st, i) => { const o = chosenOption(i); cfg[st.kind] = o ? o.id : null; }); return cfg; };
const complete = () => STEPS.every((_, i) => chosenOption(i));

// Mittelwert aller bewerteten Antworten, Besonderheiten können Werte ändern (wie in Version 2). Auf der Char gibt es einen Malus.
function houseRatings() {
  const chosen = STEPS.map((_, i) => chosenOption(i)).filter(Boolean);
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
  if (state.ground === 'char' && rated.length) result.flood = Math.max(1, result.flood - 1);
  return result;
}
const scoreOf = r => SCORE_KEYS.reduce((t, k) => t + (r[k] || 0), 0);
const scaleName = key => SCALES.find(s => s[0] === key)[1];
const scaleHelp = key => SCALES.find(s => s[0] === key)[2];
function partVerdict(option) {
  const sc = option && option.ratings;
  if (!sc) return { kind: 'mid', label: 'Ohne Wertung' };
  const avg = SCORE_KEYS.reduce((t, k) => t + sc[k], 0) / SCORE_KEYS.length;
  return avg >= 3.5 ? { kind: 'good', label: 'Stark' } : avg <= 2.5 ? { kind: 'bad', label: 'Schwach' } : { kind: 'mid', label: 'Durchschnitt' };
}

/* ---------- 3D-Bühne ---------- */

const stageHost = $('#stages');
const veilEl = $('#veil');
let stage = null, stageCanvas = null, stageGround = null, stageBusy = false;
let whiteNow = false, floodOn = false, lastRun = -1, pageToken = 0, cardImage = null;
const veil = (on, text) => { if (text) $('span', veilEl).textContent = text; veilEl.classList.toggle('is-on', on); };

async function ensureStage(ground) {
  if (stage && stageGround === ground) return;
  if (stageBusy) return;
  stageBusy = true;
  veil(true, ground === 'char' ? 'Die Flussinsel wird aufgebaut …' : 'Lädt …');
  await sleep(320);
  if (stage) { stage.destroy(); stageCanvas.remove(); }
  stageCanvas = el('canvas', 'stage');
  stageHost.append(stageCanvas);
  stage = Haus3D.create(stageCanvas, { char: ground === 'char' });
  stage.setRecord(SCEN.record);
  stageGround = ground; whiteNow = false; floodOn = false; lastRun = -1;
  attachPick(stageCanvas);
  stageBusy = false;
  applyStage();
  await sleep(500);
  veil(false);
}

// Touchpad am Laptop: zwei Finger zusammenziehen zoomt im Rundgang heraus. Chrome, Edge und Firefox melden das als
// Mausrad mit Strg-Taste, Safari als „gesture“-Ereignis. Der Seitenzoom des Browsers bleibt dabei aus.
{
  let sum = 0, last = 0;
  const zoomOut = () => { sum = 0; if (/^t\d$/.test(state.page)) go('ergebnis'); };
  addEventListener('wheel', e => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    if (e.timeStamp - last > 300) sum = 0;
    last = e.timeStamp;
    sum = Math.max(0, sum + e.deltaY);
    if (sum > 25) zoomOut();
  }, { passive: false });
  addEventListener('gesturestart', e => e.preventDefault());
  addEventListener('gesturechange', e => { e.preventDefault(); if (e.scale < .8) zoomOut(); });
}

// Antippen im Bild: Zusammenfassung, Ergebnis und Rundgang. Beim Drücken glänzt das Bauteil kräftig, Zwei-Finger-Zusammenziehen zoomt im Rundgang heraus.
const pickPages = /^(haus|ergebnis|t\d)$/;
function attachPick(c) {
  let down = null; const fingers = new Map(); let pinch0 = 0;
  const kindAt = (x, y) => (pickPages.test(state.page) && (state.page === 'haus' || whiteNow) ? stage.pick(x, y) : null);
  c.addEventListener('pointerdown', e => {
    fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (fingers.size === 2) { const [a, b] = [...fingers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); down = null; return; }
    down = { x: e.clientX, y: e.clientY, t: performance.now(), kind: kindAt(e.clientX, e.clientY) };
    if (down.kind) stage.setPartFx({ hover: down.kind });
  });
  c.addEventListener('pointermove', e => {
    if (fingers.has(e.pointerId)) fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (fingers.size === 2 && pinch0 && /^t\d$/.test(state.page)) {
      const [a, b] = [...fingers.values()];
      if (Math.hypot(a.x - b.x, a.y - b.y) < pinch0 * .65) { pinch0 = 0; stage.setPartFx({ hover: null }); go('ergebnis'); }
    }
  });
  const end = e => {
    fingers.delete(e.pointerId); if (fingers.size < 2) pinch0 = 0;
    if (stage) stage.setPartFx({ hover: null });
    if (!down || e.type === 'pointercancel') { down = null; return; }
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t, kind = down.kind;
    down = null;
    if (moved > 10 || dt > 800 || !kind) return;
    const i = KINDS.indexOf(kind);
    if (state.page === 'haus') go(`b${i}`, { fromHaus: true }); else go(`t${i}`);
  };
  c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
}

const SAMPLE = { foundation: 'brick', wall: 'brickwall', roof: 'tinhip', extra: null };
let startPreset = 0, startTimer = 0;

// Stellt die 3D-Ansicht passend zur Seite ein. Das Haus steht beim Bauen in der Mitte (Liste links, Infotafel rechts),
// bei Lage und Chars rechts von der Mitte (Infotafel links).
function applyStage() {
  if (!stage) return;
  const s = stage, page = state.page, token = pageToken;
  const result = page === 'ergebnis' || /^t\d$/.test(page);
  document.body.dataset.page = /^b\d$/.test(page) ? 'build' : /^t\d$/.test(page) ? 'tour' : page;
  clearInterval(startTimer);
  const pole = state.ground !== 'char';     // der Pegelstab (höchster gemessener Pegel) gehört nur zum Ufer

  // Aus dem weißen Raum zurück in die Landschaft
  if (whiteNow && !result) {
    s.setPartFx({ focus: null, hint: false, hover: null });
    s.setWhiteRoom(false); s.setExplode(false, { instant: true }); whiteNow = false;
    document.body.classList.remove('is-white'); floodOn = false; s.setFlood(false, false);
  }
  s.setMeadow(false); s.setDrag(false); s.setAuto(0); s.setShift(0); s.setClear(false);
  if (floodOn && page !== 'sim' && !result) { s.setFlood(false, false); floodOn = false; }
  stageHost.classList.toggle('is-soft', page === 'szenario' || page === 'real');

  if (page === 'start' || page === 'szenario') {
    s.setView('house'); s.setPole(false);
    const showPreset = () => { const p = PRESETS[startPreset % PRESETS.length]; s.setHouse(Object.fromEntries(STEPS.map(st => [st.kind, p.pick[st.kind] || null])), { animate: true }); };
    if (page === 'start') { startPreset = Math.floor(Math.random() * PRESETS.length); showPreset(); startTimer = setInterval(() => { startPreset++; showPreset(); }, PRESET_MS); }
    else s.setHouse(SAMPLE, { animate: false });
    s.focus('start'); s.setAuto(.015); s.setFlood(false, false); s.setShift(page === 'start' ? .17 : 0);
    return;
  }
  if (page === 'challenge' || page === 'real') {
    s.setView('land'); s.setPole(false); s.setHouse(SAMPLE, { animate: false });
    s.focus('land'); s.setAuto(.012);
    return;
  }
  if (page === 'geo' || page === 'char') {
    s.setView('house'); s.setPole(false); s.setHouse(SAMPLE, { animate: false });
    s.focus('overview'); s.setAuto(.02); s.setShift(.2);
    return;
  }
  s.setView('house');
  if (/^b\d$/.test(page)) {
    const i = Number(page[1]);
    s.setPole(pole); s.setHouse(houseConfig());
    s.focus(KINDS[i], { keepAz: true });
    return;
  }
  if (page === 'haus') {
    s.setPole(pole); s.setHouse(houseConfig()); s.focus('overview'); s.setPartFx({ hint: true });
    return;
  }
  if (page === 'sim') {
    // Die Kamera bleibt während der ganzen Simulation stehen
    s.setPole(pole); s.setHouse(houseConfig()); s.setPaused(false);
    if (lastRun !== state.run) {
      s.focus('overview', { instant: false });
      lastRun = state.run; s.setFlood(false, false); floodOn = false;
      setTimeout(() => { if (state.page === 'sim' && state.run === lastRun && stage === s) { s.setFlood(true, true); floodOn = true; } }, SIM_DELAY_MS);
    }
    return;
  }
  if (result) enterResult(token);
}

// Ergebnis: weißer Raum, erst das ganze Haus, dann auseinandergezogen. Danach fährt die Kamera zu den Bauteilen.
async function enterResult(token) {
  const s = stage, page = state.page;
  if (!whiteNow) {
    // Falls die Flut nicht zu Ende lief, jetzt sofort den Endzustand zeigen
    const f = s.floodInfo();
    if (!floodOn || !f.done) { s.setHouse(houseConfig()); s.setFlood(true, false); floodOn = true; }
    s.setPaused(false);
    veilEl.classList.add('is-white'); veil(true, ''); await sleep(380);
    if (token !== pageToken) return;
    s.setWhiteRoom(true); whiteNow = true; document.body.classList.add('is-white');
    s.setExplode(false, { instant: true }); s.setPole(false); s.setAuto(0); s.setShift(0);
    s.focus('overview', { instant: true });
    await sleep(120); veil(false); veilEl.classList.remove('is-white');
    if (token !== pageToken) return;
    if (page === 'ergebnis') { await sleep(1300); if (token !== pageToken) return; }
  }
  veil(false);
  s.setDrag(false); s.setShift(.13); s.setPole(false);
  s.setExplode(true);
  if (page === 'ergebnis') { s.setPartFx({ focus: null, hint: true }); s.focus('xo'); }
  else { const k = KINDS[Number(page[1])]; s.setPartFx({ focus: k, hint: false }); s.focus(`xo_${k}`); }
}

/* ---------- Seitenwechsel ---------- */

function go(page, patch = {}) {
  const needGround = patch.ground && patch.ground !== stageGround;
  state = { ...state, ...patch, page };
  pageToken++;
  window.scrollTo(0, 0);
  show();
  if (needGround) ensureStage(state.ground);
}

let view = null, swapToken = 0;
const ui = $('#ui');
function pageKey() { return PAGE[pageType(state.page)].key(state); }
const pageType = p => (/^b\d$/.test(p) ? 'build' : /^t\d$/.test(p) ? 'tour' : p);

function show() {
  applyStage();
  progress.update(state.page);
  const next = PAGE[pageType(state.page)];
  const key = next.key(state);
  if (view && view.key === key) { view.update && view.update(state); return; }
  const token = ++swapToken;
  const old = view;
  if (old) { old.nodes.forEach(n => n.classList && n.classList.add('is-leaving')); if (old.dispose) old.dispose(); }
  setTimeout(() => {
    if (token !== swapToken) return;
    const built = next.build(state);
    view = { key, ...built };
    ui.replaceChildren(...built.nodes);
    if (built.update) built.update(state);
  }, old ? 190 : 0);
}

/* ---------- Fortschritt (oben) ---------- */

// Fortschritt: nur Striche, gruppiert in Einleitung, Aufbau, Simulation und Ergebnis
const PROGRESS = [['szenario', 'challenge', 'geo', 'real'], ['b0', 'b1', 'b2', 'b3', 'haus'], ['sim'], ['ergebnis']];
const FLAT = PROGRESS.flat();
const segOf = p => { if (p === 'char') return FLAT.indexOf('geo'); if (/^t\d$/.test(p)) return FLAT.indexOf('ergebnis'); return FLAT.indexOf(p); };
const progress = (() => {
  const box = el('nav', 'progress');
  box.setAttribute('aria-label', 'Fortschritt');
  const items = [];
  PROGRESS.forEach((group, gi) => {
    const g = el('div', 'pgroup');
    group.forEach(page => {
      const b = el('button', 'pseg'); b.type = 'button'; b.setAttribute('aria-label', page);
      b.onclick = () => { if (!b.disabled) navTo(page); };
      g.append(b); items.push({ b, page });
    });
    box.append(g);
  });
  document.body.append(box);
  return {
    update(page) {
      box.hidden = page === 'start';
      const now = segOf(page);
      items.forEach(({ b }, i) => { b.classList.toggle('is-done', i < now); b.classList.toggle('is-now', i === now); b.disabled = !(i < now && i <= FLAT.indexOf('haus')); });
    },
  };
})();
// Zurückspringen über die Fortschrittsleiste: nur auf Seiten vor der Simulation
function navTo(page) { if (page === 'haus' && !complete()) return; go(page, { fromHaus: false }); }

/* ---------- Bausteine ---------- */

function bar(...kids) { const b = el('div', 'bar'); b.append(...kids); return b; }
const backBtn = (onTap, title = 'Zurück') => iconButton('back', title, onTap, 'back round');
function giant(label, onTap, iconName) {
  const b = el('button', 'giant'); b.type = 'button';
  const chip = el('span', 'chip-go'); chip.append(icon(iconName));
  b.append(el('span', null, label), chip);
  b.onclick = onTap;
  return b;
}
function head(eyebrow, title, lead) {
  const h = el('div', 'head');
  if (eyebrow) h.append(el('p', 'eyebrow', eyebrow));
  h.append(el('h1', null, title));
  if (lead) h.append(el('p', 'lead', lead));
  return h;
}
function pane(...kids) { const p = el('div', 'glass pane'); p.append(...kids); return p; }

// Ring wie in Version 2: Anteil der Haushalte, die so bauen
const RING_R = 44, RING_LEN = 2 * Math.PI * RING_R;
function ringSvg(value) {
  return `<svg viewBox="0 0 110 110" aria-hidden="true"><circle class="disc" cx="55" cy="55" r="40"/><circle class="track" cx="55" cy="55" r="${RING_R}"/><circle class="arc" cx="55" cy="55" r="${RING_R}" stroke-dasharray="${RING_LEN}" stroke-dashoffset="${RING_LEN * (1 - Math.min(100, value) / 100)}" transform="rotate(-90 55 55)"/></svg>`;
}

/* ---------- Stopps in der Simulation ---------- */

// Angehalten wird nur, wenn etwas kaputtgeht. Texte zu Wand, Dach und Pfahl kommen aus inhalt.js.
const stopOf = id => V3.STOPS.find(st => st.id === id);
const hasEvent = (d, test) => (d.events || []).some(e => test.test(e.what));
const DAMAGE_STOPS = [
  stopOf('bruch'),
  {
    id: 'blech', icon: 'x',
    when: (f, d) => hasEvent(d, /^wall:tin:flap/),
    make: () => ({ title: 'Ein Wandblech reißt los', text: 'Der Sturm zerrt an den Ecken. Ein Blech löst sich aus den Nägeln und schlägt im Wind, durch die Öffnung dringen Wind und Wasser ein.' }),
  },
  stopOf('dach'),
  stopOf('pfahl'),
  {
    id: 'erdsockel', icon: 'x',
    when: (f, d, cfg) => cfg.foundation === 'earth' && d.tilt > .8,
    make: () => ({ title: 'Der Erdsockel rutscht ab', text: 'Strömung und Wellen haben den Sockel ausgespült. Er gibt an einer Seite nach, und das Haus sackt schief.' }),
  },
];

/* ---------- Seiten ---------- */

const PAGE = {};

// Startseite
PAGE.start = {
  key: () => 'start',
  build() {
    const wrap = el('div', 'view start');
    const box = el('div', 'start-box');
    const h = el('h1'); h.append('Kannst du das perfekte', el('br'), 'Haus bauen?');
    box.append(el('p', 'eyebrow', 'Hausbau-Konfigurator'), h, el('p', 'lead', 'Baue ein Haus, das einer Flut standhält, und sieh, was dabei kaputtgeht.'),
      giant('Jetzt starten', () => go('szenario'), 'next'));
    wrap.append(box);
    return { nodes: [wrap] };
  },
};

// Szenarioauswahl: Bangladesch ist fertig, B und C folgen
PAGE.szenario = {
  key: () => 'szenario',
  build() {
    const wrap = el('div', 'view');
    const cards = el('div', 'cards');
    const mk = (cls, title, sub, big, text, locked, onTap) => {
      const c = el('button', `scn ${cls}${locked ? ' is-locked' : ''}`); c.type = 'button';
      if (locked) c.append(icon('lock'));
      const cap = el('div', 'cap');
      cap.append(el('strong', null, title), el('span', null, sub));
      if (big) { const f = el('div', 'bigfact'); f.append(el('b', null, big), el('span', null, text)); cap.append(f); }
      else cap.append(el('p', 'soon', text));
      c.append(cap);
      c.onclick = onTap;
      return c;
    };
    const ban = mk('is-active', SCEN.title, SCEN.subtitle, '1 m', 'hoch steht das Wasser', false, () => go('challenge'));
    if (!cardImage && stage) { try { cardImage = stage.snapshot(1600, 900, { cfg: SAMPLE, name: 'site', flood: true, az: .55 }); } catch (e) { cardImage = ''; } }
    if (cardImage) ban.style.backgroundImage = `url(${cardImage})`;
    const toast = el('p', 'toast', 'Dieses Szenario folgt bald.');
    const soon = () => { toast.classList.add('is-on'); clearTimeout(soon.t); soon.t = setTimeout(() => toast.classList.remove('is-on'), 2200); };
    cards.append(ban, mk('scn-b', 'Szenario B', 'folgt bald', null, 'Hier entsteht ein weiteres Szenario.', true, soon), mk('scn-c', 'Szenario C', 'folgt bald', null, 'Hier entsteht ein weiteres Szenario.', true, soon));
    wrap.append(head('Hausbau-Konfigurator', 'Wähle dein Szenario'), cards, toast, bar(backBtn(() => go('start')), el('span', 'hint', 'Tippe auf ein Szenario, um zu starten.')));
    return { nodes: [wrap] };
  },
};

// Einleitung 1: Challenge-Übersicht als Dialog in der Mitte, die Landschaft bleibt dahinter sichtbar
PAGE.challenge = {
  key: () => 'challenge',
  build() {
    const C = V3.CHALLENGE;
    const wrap = el('div', 'view center');
    const dlg = el('div', 'glass dialog');
    const items = el('div', 'items');
    C.items.forEach(it => {
      const row = el('div', 'item');
      const ic = el('span', 'ic'); ic.append(icon(it.icon));
      const t = el('div'); t.append(el('h3', null, it.head), el('p', null, it.text));
      row.append(ic, t); items.append(row);
    });
    const nav = el('div', 'dlg-nav');
    nav.append(backBtn(() => go('szenario')), el('span', 'grow'), button('Weiter', () => go('geo'), 'primary', 'next', true));
    dlg.append(el('p', 'eyebrow', C.eyebrow), el('h1', null, C.title), el('p', 'lead', C.lead), items, nav);
    wrap.append(dlg);
    return { nodes: [wrap] };
  },
};

function mapSvg(ground, onUfer, onChar) {
  const svg = `
  <svg viewBox="0 0 560 400" role="img" aria-label="Lageskizze: Festland am Ufer und Chars im Fluss">
    <defs>
      <linearGradient id="gw" x1="0" x2="1"><stop offset="0" stop-color="#7d8a74"/><stop offset=".5" stop-color="#8c8f78"/><stop offset="1" stop-color="#7d8a74"/></linearGradient>
      <pattern id="ripple" width="22" height="14" patternUnits="userSpaceOnUse"><path d="M0 7q5.5-5 11 0t11 0" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.3"/></pattern>
    </defs>
    <rect width="560" height="400" rx="22" fill="#a9a37c"/>
    <path d="M0 0h120c28 40-10 90 22 140s-20 120 6 170 8 70-4 90H0z" fill="#8f9a6b"/>
    <path d="M560 0H440c-30 50 14 100-18 160s26 110-4 170 4 50 10 70h132z" fill="#8f9a6b"/>
    <path d="M120 0h320c-30 50 14 100-18 160s26 110-4 170 4 50 10 70H150c-12-20-30-40-4-90s-6-120-24-170S92 40 120 0z" fill="#5e6f6a"/>
    <path d="M120 0h320c-30 50 14 100-18 160s26 110-4 170 4 50 10 70H150c-12-20-30-40-4-90s-6-120-24-170S92 40 120 0z" fill="url(#ripple)"/>
    <ellipse cx="270" cy="95" rx="56" ry="26" fill="#cdb993"/><ellipse cx="262" cy="92" rx="30" ry="12" fill="#a8b070"/>
    <ellipse cx="338" cy="260" rx="46" ry="22" fill="#cdb993"/><ellipse cx="330" cy="258" rx="20" ry="8" fill="#a8b070"/>
    <ellipse cx="250" cy="335" rx="34" ry="14" fill="#cdb993"/>
    <g fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2.4" stroke-linecap="round"><path d="M300 150v60m0 0l-7-9m7 9l7-9"/></g>
    <text x="318" y="176" fill="rgba(255,255,255,.85)" font-size="15" font-weight="600">Jamuna</text>
    <text x="48" y="46" fill="rgba(30,36,24,.7)" font-size="13" font-weight="700" letter-spacing="1.5">FESTLAND</text>
    <text x="456" y="46" fill="rgba(30,36,24,.7)" font-size="13" font-weight="700" letter-spacing="1.5">OSTUFER</text>
    <g class="spot spot-ufer${ground === 'ufer' ? ' is-on' : ''}" tabindex="0" role="button" aria-label="Festland am Ufer"><circle class="halo" cx="104" cy="210" r="34"/><circle cx="104" cy="210" r="22" fill="#fff"/><g transform="translate(92 198) scale(1)" fill="none" stroke="#1d2a36" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 11l11-9 11 9"/><path d="M4 9.5V22h16V9.5"/></g><text x="60" y="262" fill="#1d2a36" font-size="14" font-weight="700">Sirajganj</text></g>
    <g class="spot spot-char${ground === 'char' ? ' is-on' : ''}" tabindex="0" role="button" aria-label="Char, Flussinsel"><circle class="halo" cx="270" cy="92" r="40"/><circle cx="270" cy="92" r="22" fill="#fff"/><g transform="translate(258 80)" fill="none" stroke="#1d2a36" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 11l11-9 11 9"/><path d="M4 9.5V22h16V9.5"/></g><text x="214" y="146" fill="#fff" font-size="14" font-weight="700">Char</text></g>
    <g transform="translate(512 360)"><circle r="16" fill="rgba(255,255,255,.75)"/><path d="M0-10l5 14-5-3-5 3z" fill="#1d2a36"/><text y="-19" text-anchor="middle" font-size="10" font-weight="700" fill="#1d2a36">N</text></g>
  </svg>`;
  const wrap = el('div', 'map');
  wrap.innerHTML = svg;
  const bind = (sel, fn) => { const n = $(sel, wrap); n.addEventListener('click', fn); n.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fn(); }); };
  bind('.spot-ufer', onUfer); bind('.spot-char', onChar);
  return wrap;
}

// Quellen-Symbol unten rechts: Antippen zeigt die Links
const openPops = [];
document.addEventListener('pointerdown', e => openPops.forEach(p => { if (!p.wrap.contains(e.target)) p.pop.hidden = true; }));
function srcBtn(keys) {
  const wrap = el('div', 'srcwrap'), b = el('button', 'srcbtn'); b.type = 'button'; b.title = 'Quellen'; b.setAttribute('aria-label', 'Quellen'); b.append(icon('book'));
  const pop = el('div', 'srcpop'); pop.hidden = true;
  pop.append(el('b', null, 'Quellen'));
  keys.forEach(k => { const sr = V3.SRC[k]; const a = el('a', null, sr.name); a.href = sr.url; a.target = '_blank'; a.rel = 'noopener'; pop.append(a); });
  b.onclick = () => { pop.hidden = !pop.hidden; };
  wrap.append(pop, b); openPops.push({ wrap, pop });
  return wrap;
}

// Einleitung 2: Lage und Geografie auf einer großen Fläche. Die Infobox „Was sind Chars?“ führt zur Char-Seite.
PAGE.geo = {
  key: () => 'geo',
  build() {
    const G = V3.GEO;
    const wrap = el('div', 'view');
    const sheet = el('div', 'glass sheet');
    const left = el('div', 'sheet-left');
    const facts = el('div', 'facts');
    G.facts.forEach(f => { const it = el('div', 'fact'); it.append(el('b', null, f.big), el('small', null, f.label), el('p', null, f.text)); facts.append(it); });
    const box = el('button', 'charbox'); box.type = 'button';
    const ic = el('span', 'ic'); ic.append(icon('globe'));
    const t = el('div'); t.append(el('strong', null, G.charBox.head), el('span', null, G.charBox.text));
    const go2 = el('span', 'go'); go2.append(icon('next'));
    box.append(ic, t, go2); box.onclick = () => go('char');
    left.append(head(G.eyebrow, G.title, G.lead), facts, box);
    const right = el('div', 'sheet-right');
    const caption = el('div', 'mapcap');
    const setCaption = g => { const sp = G.spots[g]; caption.replaceChildren(el('strong', null, sp.name), el('span', null, sp.text)); };
    setCaption('ufer');
    const map = mapSvg('ufer', () => { setCaption('ufer'); map.querySelectorAll('.spot').forEach(n => n.classList.toggle('is-on', n.classList.contains('spot-ufer'))); }, () => go('char'));
    right.append(el('p', 'eyebrow', 'Lageskizze · Tippe auf einen Ort'), map, caption);
    sheet.append(left, right, srcBtn(G.src));
    wrap.append(sheet, bar(backBtn(() => go('challenge')), el('span', 'grow'), button('Weiter', () => go('real'), 'primary', 'next', true)));
    return { nodes: [wrap] };
  },
};

// Einleitung 3 (Abzweig): Chars. Links die Infotafel, rechts der Blick auf das Grundstück. Beim Wechsel ändert sich nur der Hintergrund.
PAGE.char = {
  key: () => 'char',
  build() {
    const C = V3.CHARS;
    const wrap = el('div', 'view');
    const secs = el('div', 'secs');
    const secItems = C.topics.map((t, n) => {
      const sec = el('div', 'sec' + (n === 0 ? ' is-open' : ''));
      const hd = el('button', 'sec-head'); hd.type = 'button';
      const ic = el('span', 'ic'); ic.append(icon(t.icon)); const chev = el('span', 'chev'); chev.append(icon('chev'));
      hd.append(ic, el('span', 'sec-title', t.head), chev);
      const body = el('div', 'sec-body'); body.append(el('p', null, t.text));
      sec.append(hd, body); secs.append(sec);
      hd.onclick = () => secItems.forEach(x => x.classList.toggle('is-open', x === sec && !sec.classList.contains('is-open')));
      return sec;
    });
    const tafel = pane(head(C.eyebrow, C.title, C.lead), secs, srcBtn(C.src));
    tafel.classList.add('tafel');
    // Grundstück wählen
    const sw = el('div', 'gswitch glass');
    const seg = el('div', 'gseg'), pts = el('ul', 'gpts');
    const btns = ['ufer', 'char'].map(g => {
      const b = el('button', null); b.type = 'button'; b.dataset.g = g;
      b.append(el('strong', null, C.grounds[g].name), el('span', `lvl lvl-${g}`, C.grounds[g].level));
      b.onclick = () => { if (state.ground !== g) { state = { ...state, ground: g }; ensureStage(g); } update(); };
      seg.append(b); return b;
    });
    sw.append(el('p', 'eyebrow', 'Wo willst du bauen?'), seg, pts);
    const update = () => {
      btns.forEach(b => b.classList.toggle('is-on', b.dataset.g === state.ground));
      pts.replaceChildren(...C.grounds[state.ground].points.map(p => el('li', null, p)));
    };
    update();
    wrap.append(tafel, sw, bar(backBtn(() => go('geo')), el('span', 'grow'), button('Weiter', () => go('real'), 'primary', 'next', true)));
    return { nodes: [wrap], update };
  },
};

// Einleitung 4: Realitäts-Check, in drei Schritten aufbereitet (Piktogramm, Balken, Erklärung)
function dotsGrid(value) {
  const g = el('div', 'dots');
  for (let i = 0; i < 100; i++) {
    const d = el('i'); const f = Math.max(0, Math.min(1, value - i));
    if (f >= 1) d.className = 'on'; else if (f > 0) { d.className = 'frac'; d.style.setProperty('--f', String(f)); }
    d.style.animationDelay = `${i * 9}ms`; g.append(d);
  }
  return g;
}
PAGE.real = {
  key: () => 'real',
  build() {
    const R = V3.REALITAET;
    const wrap = el('div', 'view real');
    let tab = state.ground === 'char' ? 'char' : 'land';
    const tabs = el('div', 'tabs'), grid = el('div', 'tiles'), take = el('div', 'glass takeaway');
    function tile(st) {
      const n = el('div', `glass tile tile-${st.kind}`);
      n.append(el('div', 'tilehead'));
      const hd = n.firstChild; hd.append(el('span', 'num', String(st.n)), el('h3', null, st.head));
      if (st.kind === 'dots') {
        const row = el('div', 'dotsrow'); const big = el('div', 'dotsbig'); big.append(el('b', null, st.big), el('span', null, st.label));
        row.append(dotsGrid(st.value), big); n.append(row, el('p', 'note', st.note));
      } else if (st.kind === 'bars') {
        st.rows.forEach(rw => {
          const row = el('div', 'brow'), lab = el('div', 'blab');
          lab.append(el('span', null, rw.label), el('b', null, st.unit ? `${fmt(rw.value, 0)} ${st.unit}` : `${fmt(rw.value, 0)} %`));
          const tr = el('div', 'btrack'), fl = el('i'); fl.style.width = `${Math.min(100, rw.value / (st.max || 100) * 100)}%`; tr.append(fl);
          row.append(lab, tr); n.append(row);
        });
        n.append(el('p', 'note', st.note));
      } else if (st.kind === 'bigs') {
        st.rows.forEach(rw => { const r = el('div', 'bigrow'); r.append(el('b', null, rw.big), el('span', null, rw.text)); n.append(r); });
      } else n.append(el('p', 'body', st.text));
      if (st.src) n.append(srcBtn(st.src));
      return n;
    }
    const draw = () => {
      tabs.querySelectorAll('button').forEach(b => b.classList.toggle('is-on', b.dataset.tab === tab));
      grid.replaceChildren(...R.tabs[tab].steps.map(tile));
      take.replaceChildren(el('b', null, 'Fazit'), el('p', null, R.tabs[tab].takeaway));
    };
    Object.entries(R.tabs).forEach(([k, v]) => { const b = el('button', null, v.name); b.type = 'button'; b.dataset.tab = k; b.onclick = () => { tab = k; draw(); }; tabs.append(b); });
    draw();
    const top = el('div', 'realtop'); top.append(head(R.eyebrow, R.title, R.lead), tabs);
    wrap.append(top, grid, take, bar(backBtn(() => go(state.ground === 'char' ? 'char' : 'geo')), el('span', 'grow'), button('Haus bauen', () => go('b0', { fromHaus: false }), 'primary', 'next', true)));
    return { nodes: [wrap] };
  },
};

// Hausbau: links die Auswahl als Liste (Name und kleine Zeichnung), rechts die Infotafel, in der Mitte das Haus
PAGE.build = {
  key: s => s.page,
  build(s) {
    const i = Number(s.page[1]), step = STEPS[i];
    const wrap = el('div', 'view build');
    const list = el('div', 'optlist');
    const items = step.options.map((o, j) => {
      const b = el('button', 'opt'); b.type = 'button';
      const pic = el('span', 'pic'); fillPic(pic, o);
      const tick = el('span', 'tick'); tick.append(icon('check'));
      b.append(el('strong', null, o.text), pic, tick);
      b.onclick = () => { const next = state.answers.slice(); next[i] = j; state = { ...state, answers: next }; show(); };
      list.append(b);
      return b;
    });
    const left = pane(el('p', 'eyebrow', `Schritt ${i + 1} von ${STEPS.length} · ${step.name}`), el('h1', null, step.question), list);
    left.classList.add('buildlist');
    const info = el('aside', 'glass infotafel');
    const nextBtn = button(s.fromHaus ? 'Zurück zum Haus' : i === STEPS.length - 1 ? 'Zum fertigen Haus' : 'Weiter', () => {
      if (s.fromHaus) go('haus', { fromHaus: false }); else go(i === STEPS.length - 1 ? 'haus' : `b${i + 1}`);
    }, 'primary', 'next', true);
    const back = backBtn(() => { if (s.fromHaus) go('haus', { fromHaus: false }); else go(i === 0 ? 'real' : `b${i - 1}`); });
    wrap.append(left, info, bar(back, el('span', 'grow'), nextBtn));
    return {
      nodes: [wrap],
      update(st) {
        const chosen = st.answers[i], option = chosen == null ? null : step.options[chosen];
        items.forEach((b, j) => b.classList.toggle('is-on', chosen === j));
        nextBtn.disabled = chosen == null;
        if (!option) { info.replaceChildren(el('p', 'eyebrow', 'Infotafel'), el('div', 'emptyinfo')); const e = $('.emptyinfo', info); e.append(icon('tap'), el('p', null, 'Tippe links ein Bauteil an. Es erscheint sofort im Haus, und hier steht alles dazu.')); return; }
        const parts = [el('p', 'eyebrow', step.name), el('h2', null, option.text), el('p', 'infotext', option.info)];
        if (Schnitt.has(option.id)) {
          const xs = el('div', 'xsbox'); const pic = el('div', 'xs-pic'); pic.innerHTML = Schnitt.svg(option.id, { marks: true });
          const leg = el('ol', 'xs-leg'); Schnitt.legend(option.id).forEach(t => leg.append(el('li', null, t)));
          const det = el('details', 'more'); det.append(el('summary', null, 'Was ist was?'), leg);
          xs.append(el('p', 'eyebrow', 'Querschnitt'), pic, det); parts.push(xs);
        }
    
        if (option.hint) { const det = el('details', 'more'); det.append(el('summary', null, 'Gut zu wissen'), el('p', 'infotext', option.hint)); parts.push(det); }
        const entry = option.usage && option.usage.real, value = entry ? entry.value : 0;
        const ring = el('div', 'ring is-on'), rb = el('div', 'rb'); rb.innerHTML = ringSvg(value);
        const n2 = el('span', 'num');
        if (!entry) n2.append(el('b', null, '–')); else if (entry.label) n2.append(el('b', 'is-label', entry.label)); else n2.append(el('b', null, `${fmt(value)} %`));
        rb.append(n2); ring.append(rb, el('p', 'txt', !entry ? 'Keine Daten' : entry.note || entry.line || `der Haushalte in ${SCEN.region} bauen so`));
        parts.push(ring);
        info.replaceChildren(...parts);
        info.scrollTop = 0;
      },
    };
  },
};

// Zusammenfassung: Das Haus im Bild ist antippbar (die Bauteile glänzen nacheinander), Antippen = dieses Bauteil ändern
PAGE.haus = {
  key: () => 'haus',
  build() {
    const wrap = el('div', 'view');
    const note = state.ground === 'char' ? 'Grundstück: Char (Flussinsel), schwerer' : 'Grundstück: Festland am Ufer';
    wrap.append(head(`${SCEN.title} · ${SCEN.subtitle}`, 'Dein fertiges Haus', note),
      bar(backBtn(() => go(`b${STEPS.length - 1}`)), el('span', 'grow'), button('Flut starten', () => go('sim', { run: state.run + 1 }), 'primary big', 'drop', true)));
    return { nodes: [wrap] };
  },
};

// Simulation: Sturm, Regen und Flut laufen live, die Kamera steht still. Bei wichtigen Ereignissen hält sie an (Stopp mit Fortschrittsbalken).
PAGE.sim = {
  key: s => `sim:${s.run}`,
  build() {
    const wrap = el('div', 'view sim');
    const hud = el('div', 'glass hud');
    const big = el('div', 'simbig'), val = el('b', null, '0'); big.append(val, el('span', null, ' cm Wasserstand'));
    const lvlBar = el('div', 'simbar'), fill = el('i'); lvlBar.append(fill);
    const phase = el('p', 'phase', 'Der Sturm zieht auf');
    hud.append(el('p', 'eyebrow', `${SCEN.title} · ${state.ground === 'char' ? 'Char' : SCEN.subtitle}`), el('h2', null, 'Die Flut kommt'), big, lvlBar, phase);
    const card = el('div', 'glass stopcard');
    const stopIc = el('span', 'ic'), stopTitle = el('h2'), stopText = el('p');
    const goOn = button('Weiter', () => endStop(), 'primary', 'next', true);
    card.append(el('p', 'eyebrow', 'Das passiert gerade'), el('div', 'stophead'), stopText, goOn);
    $('.stophead', card).append(stopIc, stopTitle);
    const timer = el('div', 'stoptimer'), tfill = el('i'), tlabel = el('span', null, '');
    timer.append(tlabel, el('div', 'tbar'));
    $('.tbar', timer).append(tfill);
    // Unsichtbare Abkürzung unten rechts (erscheint nur unter der Maus): überspringt die ganze Flut
    const skip = button('Flut überspringen', () => finish(), 'skip', 'next', true);
    wrap.append(hud, card, timer, skip);

    const cfg = houseConfig(), fired = new Set();
    let raf = 0, stop = null, stopTimer = 0, tick = 0, finished = false, calmSince = 0;
    const depthCm = () => Math.max(0, Math.round((1 - (stage.state.floorY || 0)) * 100));
    function startStop(st) {
      fired.add(st.id);
      const d = stage.damageState() || {};
      const t = st.make(cfg, state.ground, d, depthCm());
      stop = st;
      stage.setPaused(true);
      stopIc.replaceChildren(icon(st.icon)); stopTitle.textContent = t.title; stopText.textContent = t.text;
      card.classList.add('is-on'); timer.classList.add('is-on'); wrap.classList.add('is-stop');
      tfill.style.transition = 'none'; tfill.style.transform = 'scaleX(1)'; void tfill.offsetWidth;
      tfill.style.transition = `transform ${STOP_SECONDS}s linear`; tfill.style.transform = 'scaleX(0)';
      const t0 = performance.now();
      clearInterval(tick);
      tick = setInterval(() => { tlabel.textContent = `Weiter in ${Math.max(0, Math.ceil(STOP_SECONDS - (performance.now() - t0) / 1000))} s`; }, 250);
      tlabel.textContent = `Weiter in ${STOP_SECONDS} s`;
      clearTimeout(stopTimer); stopTimer = setTimeout(endStop, STOP_SECONDS * 1000);
    }
    function endStop() {
      if (!stop) return;
      stop = null; calmSince = 0;
      clearTimeout(stopTimer); clearInterval(tick);
      card.classList.remove('is-on'); timer.classList.remove('is-on'); wrap.classList.remove('is-stop');
      stage.setPaused(false);
    }
    function finish() { if (finished) return; finished = true; go('ergebnis'); }
    const loop = () => {
      if (!stage) { raf = requestAnimationFrame(loop); return; }
      const f = stage.floodInfo(), k = Math.min(1, Math.max(0, f.level));
      val.textContent = String(Math.round(k * 100));
      fill.style.transform = `scaleX(${k})`;
      if (f.phaseText && phase.textContent !== f.phaseText) phase.textContent = f.phaseText;
      if (!stop && floodOn) {
        const d = stage.damageState() || {};
        const next = DAMAGE_STOPS.find(st => !fired.has(st.id) && st.when(f, d, cfg, state.ground));
        if (next) startStop(next);
        else if (f.done) { calmSince = calmSince || performance.now(); if (performance.now() - calmSince > SIM_END_MS) finish(); }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return {
      nodes: [wrap],
      dispose() { cancelAnimationFrame(raf); clearTimeout(stopTimer); clearInterval(tick); if (stage) stage.setPaused(false); },
    };
  },
};

// Ergebnis: Gesamtwertung, dazu das auseinandergezogene Haus im weißen Raum. Die Bauteile sind direkt im Bild antippbar.
function scoreRing(points) {
  const r = 52, len = 2 * Math.PI * r, k = Math.max(0, Math.min(1, points / 10));
  const cls = points >= 7 ? 'good' : points >= 5 ? 'mid' : 'bad';
  const box = el('div', `scorering ${cls}`);
  box.innerHTML = `<svg viewBox="0 0 130 130" aria-hidden="true"><circle class="track" cx="65" cy="65" r="${r}"/><circle class="arc" cx="65" cy="65" r="${r}" stroke-dasharray="${len}" stroke-dashoffset="${len}" transform="rotate(-90 65 65)"/></svg>`;
  const n = el('div', 'num'); n.append(el('b', null, String(points)), el('small', null, 'von 10'));
  box.append(n);
  requestAnimationFrame(() => requestAnimationFrame(() => { $('.arc', box).style.strokeDashoffset = String(len * (1 - k)); }));
  return box;
}
function endActions() {
  const row = el('div', 'endrow');
  row.append(
    button('Nochmal bauen', () => go('b0', { fromHaus: false }), 'ghost', 'restart'),
    button(state.ground === 'char' ? 'Aufs Festland wechseln' : 'Auf die Char wechseln', () => go('b0', { ground: state.ground === 'char' ? 'ufer' : 'char', fromHaus: false }), 'ghost', 'globe'),
    button('Anderes Szenario', () => go('szenario', { answers: [], ground: 'ufer' }), 'ghost', 'open'),
  );
  return row;
}
PAGE.ergebnis = {
  key: () => 'ergebnis',
  build() {
    const wrap = el('div', 'view result');
    const ratings = houseRatings(), points = scoreOf(ratings), verdict = V3.VERDICT(points);
    const score = el('div', 'scorebox'), txt = el('div', 'scoretxt');
    txt.append(el('h1', null, verdict.word), el('p', 'lead', verdict.lead));
    score.append(scoreRing(points), txt);
    const bars = el('div', 'ratings');
    SCORE_KEYS.forEach(key => {
      const row = el('div', 'rate'), line = el('div', 'rate-row');
      line.append(el('span', null, scaleName(key)), el('span', null, `${ratings[key]} / 5`));
      const b = el('div', 'rbar'); for (let n = 0; n < 5; n++) b.append(el('i', n < ratings[key] ? `on is-${ratings[key]}` : ''));
      row.title = scaleHelp(key); row.append(line, b); bars.append(row);
    });
    const left = pane(el('p', 'eyebrow', `Dein Ergebnis · ${state.ground === 'char' ? 'Char' : 'Festland'}`), score, bars);
    left.classList.add('result-pane');
    if (state.ground === 'char') left.append(el('p', 'small', 'Auf der Char zählt 1 Punkt weniger Flutschutz: Strömung und Erosion sind dort stärker.'));
    const side = el('div', 'side-info');
    side.append(el('span', 'tag', 'Zusatzinfo · zählt nicht zur Punktzahl'), el('b', null, `${scaleName('availability')}: ${ratings.availability || 0} von 5`));
    left.append(side);
    wrap.append(left, bar(el('span', 'grow'), button('Rundgang starten', () => go('t0'), 'primary', 'play')), endActions());
    return { nodes: [wrap] };
  },
};

// Rundgang: Die Kamera fährt zu einem Bauteil, die anderen sind ausgegraut. Übersicht-Knopf oder zwei Finger zusammenziehen = Übersicht.
PAGE.tour = {
  key: s => s.page,
  build(s) {
    const i = Number(s.page[1]), step = STEPS[i], o = chosenOption(i), v = partVerdict(o);
    const wrap = el('div', 'view tour');
    const dmg = stage && stage.damageInfo(houseConfig());
    const lines = dmg ? dmg.lines.filter(l => l.part === step.kind) : [];
    const W = o && V3.WARUM[o.id];
    const body = el('div', 'detail');
    body.append(el('h3', null, 'Was ist passiert?'));
    if (lines.length) lines.forEach(l => { const p = el('p', `dline ${l.good ? 'is-good' : 'is-bad'}`); p.append(icon(l.good ? 'check' : 'x'), document.createTextNode(l.text)); body.append(p); });
    else if (W) { const p = el('p', 'dline is-good'); p.append(icon('check'), document.createTextNode(W.what)); body.append(p); }
    if (W) { const why = el('div', 'note'); why.append(el('b', null, 'Warum?'), el('p', null, W.why)); body.append(why); }
    if (o && o.good) {
      const more = el('details', 'more'); more.append(el('summary', null, 'Mehr dazu'));
      const g = el('div', 'pc'); const a = el('div'); a.append(el('b', null, 'Das spricht dafür'), el('p', null, o.good)); const b = el('div'); b.append(el('b', null, 'Das spricht dagegen'), el('p', null, o.bad)); g.append(a, b);
      more.append(g); if (o.tip) more.append(el('p', 'tip', o.tip)); body.append(more);
    }
    const left = pane(el('p', 'eyebrow', `${i + 1} von ${STEPS.length} · ${step.name}`), el('h1', null, o ? o.text : step.name), Object.assign(el('span', `verdict ${v.kind}`), { textContent: v.label }), body);
    left.classList.add('tour-pane');
    const last = i === STEPS.length - 1;
    wrap.append(left, bar(backBtn(() => go(i === 0 ? 'ergebnis' : `t${i - 1}`)), el('span', 'grow'),
      button('Übersicht', () => go('ergebnis'), 'ghost', 'grid'),
      button(last ? 'Zur Übersicht' : 'Weiter', () => go(last ? 'ergebnis' : `t${i + 1}`), 'primary', 'next', true)));
    return { nodes: [wrap] };
  },
};

/* ---------- Entwicklermenü (Taste E) ----------
   Stellt die Bau-Animation (data-bau am <html>, siehe haus3d.js), die Querschnitt-Bilder (data-schnitt), den Randeffekt und den
   Fokus aufs Haus ein und führt zurück zur Versionsauswahl. Eigener Speicherplatz: Version 2 hat andere Standardwerte. */
{
  const KEY = 'hausbau.dev.josua';
  const DEFAULTS = { bau: 'aufbau', sx: 'zeichnung', rim: '#ffffff', k: 0, focus: false, fk: 1 };
  const cfg = { ...DEFAULTS };
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* ohne Speicher: Standardwerte */ }
  const root = document.documentElement;
  const rgb = hex => { const m = /^#?([0-9a-f]{6})$/i.exec(hex); const n = parseInt(m ? m[1] : 'ffffff', 16); return `${n >> 16} ${(n >> 8) & 255} ${n & 255}`; };
  let box = null;

  function sync() {
    if (!box) return;
    const on = (sel, test) => box.querySelectorAll(sel).forEach(b => b.classList.toggle('is-on', test(b.dataset)));
    on('[data-bau]', d => d.bau === cfg.bau);
    on('[data-sx]', d => d.sx === cfg.sx);
    on('[data-rim]', d => (d.rim === 'aus' ? cfg.k === 0 : cfg.k > 0 && d.rim === cfg.rim.toLowerCase()));
    on('[data-focus]', d => (d.focus === 'an') === cfg.focus);
    $('input[type=color]', box).value = cfg.rim;
    $('input[data-k]', box).value = Math.round(cfg.k * 100);
    $('.dv-pct', box).textContent = `${Math.round(cfg.k * 100)} %`;
    $('input[data-fk]', box).value = Math.round(cfg.fk * 100);
    $('.dv-fpct', box).textContent = `${Math.round(cfg.fk * 100)} %`;
  }
  function apply() {
    root.dataset.bau = cfg.bau;   // 'aufbau' oder 'wolke'
    root.dataset.schnitt = cfg.sx === '3d' ? '3d' : 'zeichnung';
    root.dataset.focus = cfg.focus ? 'an' : 'aus';
    root.style.setProperty('--rim-rgb', rgb(cfg.rim));
    root.style.setProperty('--rim-k', cfg.k);
    root.style.setProperty('--focus-k', cfg.fk);
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* egal */ }
    sync();
  }
  // Nur die Bauschritte zeigen Querschnitte: nach dem Umschalten mit den neuen Bildern neu aufbauen
  function redrawPictures() { if (pageType(state.page) === 'build') { view = null; show(); } }
  function build() {
    box = el('aside'); box.id = 'devmenu'; box.hidden = true;
    box.innerHTML = `<header><b>Entwicklermenü</b><span>E oder Esc zum Schließen</span></header>
      <section><h4>Bau-Animation</h4><div class="dv-seg"><button type="button" data-bau="aufbau">Aufbau</button><button type="button" data-bau="wolke">Wolke</button></div></section>
      <section><h4>Querschnitt-Bilder</h4><div class="dv-seg"><button type="button" data-sx="zeichnung">Zeichnung</button><button type="button" data-sx="3d">3D-Schnitt</button></div></section>
      <section><h4>Randeffekt</h4>
        <div class="dv-seg"><button type="button" data-rim="aus">Aus</button><button type="button" data-rim="#ffffff">Weiß</button><button type="button" data-rim="#000000">Schwarz</button>
        <label class="dv-col" title="Eigene Farbe"><input type="color" value="#ffffff"><span>Farbe</span></label></div>
        <div class="dv-row"><span>Stärke</span><input type="range" data-k min="0" max="200" step="5"><b class="dv-pct"></b></div>
      </section>
      <section><h4>Fokus aufs Haus</h4>
        <div class="dv-seg"><button type="button" data-focus="aus">Aus</button><button type="button" data-focus="an">An</button></div>
        <div class="dv-row"><span>Stärke</span><input type="range" data-fk min="20" max="150" step="5"><b class="dv-fpct"></b></div>
      </section>
      <footer><a href="../index.html">Zur Versionsauswahl</a><button type="button" data-reset>Zurücksetzen</button></footer>`;
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const sx = cfg.sx;
      if (b.dataset.bau) cfg.bau = b.dataset.bau;
      else if (b.dataset.sx) cfg.sx = b.dataset.sx;
      else if (b.dataset.rim === 'aus') cfg.k = 0;
      else if (b.dataset.rim) { cfg.rim = b.dataset.rim; if (cfg.k === 0) cfg.k = 1; }
      else if (b.dataset.focus) cfg.focus = b.dataset.focus === 'an';
      else if ('reset' in b.dataset) Object.assign(cfg, DEFAULTS);
      apply();
      if (cfg.sx !== sx) redrawPictures();
    });
    $('input[type=color]', box).addEventListener('input', e => { cfg.rim = e.target.value; if (cfg.k === 0) cfg.k = 1; apply(); });
    $('input[data-k]', box).addEventListener('input', e => { cfg.k = e.target.value / 100; apply(); });
    $('input[data-fk]', box).addEventListener('input', e => { cfg.fk = e.target.value / 100; cfg.focus = true; apply(); });
    document.body.append(box);
    sync();
  }
  function toggle(open) {
    if (!box) build();
    box.hidden = open === undefined ? !box.hidden : !open;
  }
  addEventListener('keydown', e => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'e' || e.key === 'E') { e.preventDefault(); toggle(); }
    else if (e.key === 'Escape' && box && !box.hidden) toggle(false);
  });
  apply();
}

/* ---------- Start ---------- */

{
  const q = new URLSearchParams(location.search);
  if (q.has('seite')) {
    state = { ...state, page: q.get('seite'), ground: q.get('grund') === 'char' ? 'char' : 'ufer', answers: (q.get('antw') || '').split(',').filter(x => x !== '').map(Number), run: 1 };
  }
  window.HAUS_DEBUG = { get state() { return state; }, go, get stage() { return stage; } };
}
(async () => {
  await ensureStage(state.ground);
  show();
})();
