// Hauskonfigurator Bangladesch: Ablauf nach FLOW.md. Inhalte kommen aus ../spiel2/daten.js.
const app = document.getElementById('app');
const SC = SCENARIOS.find(s => s.id === 'flood');
const WAVE_CM = 100; // Flut: 1 m über dem Boden

// Wiederverwendbarkeit (Skala 1-5) mit Begründung, aus FLOW.md. Gilt für die Char-Runde.
const REUSE = {
  earth: [1, 'Erde bleibt liegen und wird am neuen Ort neu aufgeschüttet.'],
  concrete: [1, 'Beton lässt sich nicht mitnehmen.'],
  brick: [1, 'Gemauert und gegossen, bleibt zurück.'],
  stilts: [5, 'Bambus-Stelzen lassen sich ohne Spezialwerkzeug zerlegen.'],
  mud: [1, 'Lehm zerfällt beim Abbau.'],
  tin: [5, 'Bleche werden abgeschraubt und aufs Boot geladen.'],
  brickwall: [1, 'Gemauert, bleibt zurück.'],
  ferro: [1, 'Fest verbundene Schale, nicht zerlegbar.'],
  tinhip: [5, 'Das Dach wird als Ganzes getragen und verladen.'],
  concreteflat: [1, 'Monolithisch und sehr schwer.'],
  tilegable: [2, 'Ziegel lassen sich abnehmen, brechen aber oft.'],
  thatch: [2, 'Gras ist nach dem Abbau meist hinüber, neu decken ist billig.'],
  platform: [1, 'Aufgeschüttet, bleibt liegen.'],
  well: [1, 'Fest gebaut.'],
  vetiver: [1, 'Pflanzen bleiben am Ort.'],
  frame: [3, 'Mit Bambus und Schrauben zerlegbar, mit Beton weniger.'],
};

const state = { screen: 'start', round: 'ufer', step: 0, picks: { ufer: [], char: [] }, scores: {} };

const el = (html) => { app.innerHTML = html; window.scrollTo(0, 0); };
const go = (screen, extra = {}) => { Object.assign(state, extra, { screen }); render(); };
const opts = (i) => SC.steps[i].options;
const chosen = (round = state.round) => state.picks[round].map((p, i) => opts(i)[p]);

// Wertung: Mittel der Bewertungen, Besonderheiten setzen oder erhöhen Werte (wie in spiel2).
function ratings(round) {
  const list = chosen(round);
  const rated = list.map(o => o.ratings).filter(Boolean);
  const out = {};
  ['availability', 'stability', 'flood'].forEach(k => {
    out[k] = Math.round(rated.reduce((t, r) => t + r[k], 0) / rated.length);
    list.forEach(o => {
      if (o.sets && o.sets[k]) out[k] = o.sets[k];
      const applies = !o.boostWith || list[0].id === o.boostWith;
      if (o.boost && o.boost[k] && applies) out[k] = Math.min(5, out[k] + o.boost[k]);
    });
  });
  out.reuse = Math.round(list.reduce((t, o) => t + REUSE[o.id][0], 0) / list.length);
  return out;
}
const score = (round) => { const r = ratings(round); return round === 'ufer' ? r.stability + r.flood : r.flood + r.reuse; };
const floorCm = (round) => chosen(round).reduce((t, o) => t + (o.lift || 0) + (o.raise || 0), 0);
const wetCm = (round) => Math.max(0, WAVE_CM - floorCm(round));

const next = (label, to, cls = '') => `<button class="btn primary ${cls}" data-go="${to}">${label}</button>`;

const screens = {
  start() {
    el(`<h1>Kann dein Haus überleben?</h1><p class="muted">Baue ein Haus und teste es gegen die Flut.</p>${next("Let's go", 'szenario')}`);
  },

  szenario() {
    el(`<h1>Wo willst du dein Haus bauen?</h1>
      <button class="btn" data-go="intro"><strong>Überschwemmung</strong><span>Bangladesch</span></button>
      <button class="btn" disabled><strong>Waldbrand</strong><span>Alpen, folgt bald</span></button>`);
  },

  intro() {
    el(`<div class="step">Einführung</div><h1>Bangladesch</h1>
      <p>Bevor wir los bauen, schauen wir uns erstmal an, wie es in Bangladesch aussieht.</p>
      <p><b>1. Geografie:</b> Bangladesch ist ein Land, das teilweise durch große Flüsse entstanden ist, deshalb ist die Überflutungsgefahr hoch. Es gibt Menschen, die auf dem Festland leben, nahe an Flüssen, oder sogar auf Flussinseln, die durch das Ansammeln von Sand und Erde entstanden sind.</p>
      <p><b>2. Gesellschaft:</b> Auch hier entscheidet dein Wohlstand darüber, wo du lebst und aus welchen Materialien du dein Haus zusammenbauen kannst.</p>
      <p><b>3. Szenario:</b> Schauen wir uns als Nächstes deine Aufgabe an.</p>
      ${next('Weiter', 'aufgabe')}`);
  },

  aufgabe() {
    const c = state.round === 'char';
    el(`<div class="step">Aufgabe</div><h1>${c ? 'Auf der Char' : 'Am Ufer'}</h1>` + (c
      ? `<p>Am Ufer ging es um Stabilität. Auf einer Char zählt etwas anderes: Der Fluss trägt die Insel nach wenigen Jahren ab.</p>
         <p><b>Aufgabe:</b> Baue dein Haus so, dass du es abbauen und woanders wieder aufbauen kannst.</p>
         <p>Neben dem Flutschutz zählt diesmal auch die Wiederverwendbarkeit.</p>`
      : `<p>Du lebst in Sirajganj am Ufer des Jamuna. Jedes Jahr in der Regenzeit steigt der Fluss, schwere Überschwemmungen sind keine Seltenheit.</p>
         <p><b>Aufgabe:</b> Baue ein Haus für deine Familie, das der nächsten Flut standhält, mit den Materialien, die dir in Bangladesch zur Verfügung stehen.</p>
         <p>Bewertet wird, wie stabil dein Haus ist und wie gut es vor der Flut schützt.</p>
         <div class="facts"><div><span>Ort</span><b>Festland am Jamuna-Ufer</b></div><div><span>Haus</span><b>25 m², eingeschossig, 4–5 Personen</b></div><div><span>Flut</span><b>1 m über dem Boden</b></div></div>`)
      + next('Bauen', 'bau', '') , );
    app.querySelector('[data-go]').dataset.extra = JSON.stringify({ step: 0 });
    state.picks[state.round] = [];
  },

  bau() {
    const s = SC.steps[state.step];
    el(`<div class="step">${state.round === 'char' ? 'Char · ' : ''}Schritt ${state.step + 1} von 4 · ${s.name}</div>
      <h1>${s.question}</h1>
      ${s.options.map((o, i) => `<button class="btn" data-pick="${i}"><strong>${o.text}</strong><span>${o.hint}</span></button>`).join('')}`);
  },

  zusammenfassung() {
    const k = ratings(state.round);
    el(`<div class="step">Zusammenfassung</div><h1>Dein Haus</h1>
      <div class="facts">${chosen().map((o, i) => `<div><span>${SC.steps[i].name}</span><b>${o.text}</b></div>`).join('')}</div>
      ${next('Flut starten', 'sim')}`);
  },

  sim() {
    const r = state.round, char = r === 'char';
    const floor = floorCm(r), wet = wetCm(r);
    const neg = [];
    if (wet > 0) neg.push(`−${Math.ceil(wet / 10)} Wasser im Haus (${wet} cm)`);
    chosen(r).forEach(o => { const q = char ? REUSE[o.id][0] : (o.ratings || o.scores || {}).stability; if (q && q <= 2) neg.push(`−1 ${o.text}`); });
    // Zeichnung: Boden bei y=210, 1 m = 100 px
    const H = 100 / 100; // px pro cm
    el(`<div class="step">Simulation</div><h1>${char ? 'Die Flut trifft die Char' : 'Die Flut kommt'}</h1>
      <svg class="sim" viewBox="0 0 400 260" id="svg">
        <rect id="ground" x="${char ? 90 : 0}" y="210" width="${char ? 220 : 400}" height="50" fill="#8a7b66"/>
        <rect x="150" y="${210 - floor * H - 70}" width="100" height="70" fill="none" stroke="currentColor" stroke-width="2"/>
        <polygon points="140,${210 - floor * H - 70} 200,${210 - floor * H - 105} 260,${210 - floor * H - 70}" fill="none" stroke="currentColor" stroke-width="2"/>
        <rect id="water" x="0" y="260" width="400" height="0" fill="var(--water)" opacity=".75"/>
      </svg>
      <div id="neg" class="small"></div>
      <div id="next" hidden>${next('Ergebnis ansehen', 'ergebnis')}</div>`);
    animateFlood(wet, neg, char);
  },

  ergebnis() {
    const r = state.round, k = ratings(r), char = r === 'char';
    state.scores[r] = score(r);
    const bars = (char ? [['flood', 'Flutschutz'], ['reuse', 'Wiederverwendbarkeit'], ['availability', 'Verfügbarkeit']]
                       : [['stability', 'Stabilität'], ['flood', 'Flutschutz'], ['availability', 'Verfügbarkeit']])
      .map(([key, n]) => `<div class="bar"><span>${n}</span><i><u style="width:${k[key] * 20}%"></u></i><b>${k[key]}</b></div>`).join('');
    const pts = chosen(r).map((o, i) => {
      const q = o.ratings || o.scores || {};
      const good = char ? REUSE[o.id][0] >= 4 : (q.stability >= 4 || q.flood >= 4);
      const bad = char ? REUSE[o.id][0] <= 2 : (q.stability <= 2 || q.flood <= 2 || o.bad && !good);
      return `<div class="pt"><div class="name">${SC.steps[i].name}: ${o.text}</div>
        ${good ? `<span class="dot g"></span><span>${char ? REUSE[o.id][1] : o.good}</span>` : ''}
        ${bad ? `<span class="dot r"></span><span>${char ? REUSE[o.id][1] : o.bad}</span>` : ''}
        ${char ? '' : `<em>${o.tip}</em>`}</div>`;
    }).join('');
    el(`<div class="step">Ergebnis${char ? ' · Char' : ''}</div><div class="score">${state.scores[r]} / 10</div>
      <p class="muted">${char ? 'Flutschutz plus Wiederverwendbarkeit' : 'Stabilität plus Flutschutz'}</p>${bars}<h2 style="margin-top:20px">Rote und grüne Punkte</h2>${pts}
      ${next('Weiter', char ? 'vergleich' : 'extra')}`);
  },

  extra() {
    el(`<div class="step">Extra-Szenario</div><h1>Dein Haus am Ufer</h1>
      <div class="facts">${chosen('ufer').map((o, i) => `<div><span>${SC.steps[i].name}</span><b>${o.text}</b></div>`).join('')}<div><span>Score</span><b>${state.scores.ufer} / 10</b></div></div>
      <p>Etwa 6 % der Menschen in Bangladesch leben auf Chars, Flussinseln aus Sand und Schlamm. Dort gelten andere Regeln.</p>
      <p>Wie wäre es mit einer Extra-Runde auf der Char? Oder doch lieber ein neues Szenario?</p>
      <div class="row"><button class="btn" data-go="szenario" data-reset="1">Neues Szenario</button><button class="btn" data-go="aufgabe" data-round="char">Extra-Runde Char</button></div>`);
  },

  vergleich() {
    el(`<div class="step">Vergleich</div><h1>Ufer gegen Char</h1>
      <div class="compare"><div><div class="muted small">Ufer</div><div class="score">${state.scores.ufer}</div></div><div><div class="muted small">Char</div><div class="score">${state.scores.char}</div></div></div>
      <p>Ein Haus, das am Ufer stark ist, passt nicht automatisch auf eine Char.</p>
      <p>Chars halten oft nur wenige Jahre, dann trägt der Fluss sie ab. Deshalb bauen Familien dort leicht und nehmen ihr Haus mit.</p>
      <p class="muted">Etwa 10 Millionen Menschen (6 %) in Bangladesch leben auf Chars, oft in Armut. Der Anteil ist eine eigene Rechnung bei rund 178 Millionen Einwohnern.</p>
      <button class="btn primary" data-go="szenario" data-reset="1">Neues Szenario</button>`);
  },
};

// Wasser steigt, danach erscheinen die negativen Punkte. Bei der Char schrumpft zusätzlich die Insel.
function animateFlood(wet, neg, char) {
  const water = document.getElementById('water'), ground = document.getElementById('ground');
  const level = 100; // Wasserstand 1 m = 100 px über Boden (y 210)
  let t0 = null;
  const dur = 2200;
  const frame = (t) => {
    t0 = t0 || t;
    const p = Math.min(1, (t - t0) / dur);
    const h = level * p + 50 * p; // Wasser reicht auch unter den Boden
    water.setAttribute('y', 260 - h - 0); water.setAttribute('height', h);
    if (char) { ground.setAttribute('x', 90 + 70 * p); ground.setAttribute('width', 220 - 140 * p); }
    if (p < 1) requestAnimationFrame(frame);
    else {
      document.getElementById('neg').innerHTML = neg.length ? neg.map(n => `<div class="neg">${n}</div>`).join('') : '<div>Das Haus bleibt trocken.</div>';
      if (char) document.getElementById('neg').insertAdjacentHTML('afterbegin', '<div class="muted">Der Fluss trägt Sand ab.</div>');
      document.getElementById('next').hidden = false;
    }
  };
  requestAnimationFrame(frame);
}

app.addEventListener('click', (e) => {
  const pick = e.target.closest('[data-pick]');
  if (pick) {
    state.picks[state.round][state.step] = +pick.dataset.pick;
    return state.step < 3 ? go('bau', { step: state.step + 1 }) : go('zusammenfassung');
  }
  const b = e.target.closest('[data-go]');
  if (!b) return;
  if (b.dataset.reset) { state.picks = { ufer: [], char: [] }; state.scores = {}; state.round = 'ufer'; }
  if (b.dataset.round) state.round = b.dataset.round;
  const extra = b.dataset.extra ? JSON.parse(b.dataset.extra) : {};
  go(b.dataset.go, extra);
});

function render() { screens[state.screen](); }
render();
