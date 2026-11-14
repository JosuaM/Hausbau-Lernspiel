// Zwei Bildschirme: oben (Laptop) zeigt nur an, unten (iPad) wird per Touch gesteuert.
// Grafiken, Szenario-Daten und Hilfsfunktionen kommen aus app.js (dort startet wegen ZWEI_BILDSCHIRME nichts von selbst).
// Beide Bildschirme teilen sich einen Spielstand: Das iPad ändert ihn und schickt ihn an server.js (/api/duo),
// der Server reicht ihn an alle Bildschirme weiter. Ohne Server (Datei direkt geöffnet) klappt es in zwei Tabs
// desselben Browsers (?rolle=oben und ?rolle=unten).

const ROLE = (() => {
  const asked = new URLSearchParams(location.search).get('rolle');
  if (asked === 'oben' || asked === 'unten') return asked;
  if (/\/oben\/?$/.test(location.pathname)) return 'oben';
  if (/\/unten\/?$/.test(location.pathname)) return 'unten';
  return null;
})();

const OPEN_SCENARIO = SCENARIOS.find(s => !s.locked);
const START = -1, SELECT = 0, FIRST_STEP = 2;
const LAST_STEP = FIRST_STEP + OPEN_SCENARIO.steps.length - 1;
// Simulation: kurze Pause, dann steigt das Wasser erst unten auf dem iPad bis zum oberen Rand,
// danach oben von unten bis zur 1-m-Linie am Haus.
const SIM_DELAY_MS = 700, SIM_UP_MS = 3200, SIM_TOP_MS = 4500;
// 1 m in der Hausgrafik (siehe FD_DEFS: 1 m = 56 Einheiten); oben ist das Haus größer als in app.js (1,5).
const METER = 56, SITE_SCALE = 1.9;

// Sätze der geführten Ergebnis-Seite: Getippt wird unten auf dem iPad.
window.GUIDED_TEXT = {
  good: { start: 'Okay, dann schauen wir uns mal an, was gut gelaufen ist. Tippe unten auf die grünen Punkte!' },
  bad: { start: 'Das tut jetzt kurz weh. Tippe unten auf die roten Punkte!' },
  review: { text: 'Willst du dir die einzelnen Punkte nochmal anschauen? Tippe unten, was dich interessiert.' },
};

const screen = document.getElementById('screen');
document.documentElement.dataset.role = ROLE || 'wahl';

// Spielstand, den beide Bildschirme kennen. rev zählt jede Änderung hoch.
let state = { rev: 0, page: START, focus: OPEN_SCENARIO.id, answers: [], hint: null, run: 0 };

// Überträgt den Spielstand auf die Variablen aus app.js, damit deren Funktionen (Haus, Wertung, Ergebnis) passen.
function applyGlobals() {
  scenario = SCENARIOS.find(s => s.id === state.focus && !s.locked) || OPEN_SCENARIO;
  answers = state.answers.slice();
  page = state.page;
}

/* ---------- Verbindung zwischen den Bildschirmen ---------- */

const sync = (() => {
  const viaServer = location.protocol.startsWith('http');
  const channel = !viaServer && 'BroadcastChannel' in window ? new BroadcastChannel('hausbau-zwei') : null;
  const handlers = { state: () => {}, status: () => {} };
  const receive = data => {
    if (!data) return;
    if (data.ask) { if (ROLE === 'unten') send(state); return; }
    if (typeof data.rev === 'number') handlers.state(data);
  };
  // Ohne Server (Datei direkt geöffnet) gibt es zwei Wege: BroadcastChannel und, falls der Browser den für
  // file:// nicht zulässt, localStorage (löst in den anderen Fenstern ein „storage“-Ereignis aus).
  const LS_KEY = 'hausbau-zwei-msg';
  let lsCounter = 0;
  function lsPost(msg) {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ n: Date.now() + '-' + (lsCounter++) + '-' + Math.random(), msg })); } catch (e) { /* kein localStorage */ }
  }
  function post(msg) {
    if (channel) channel.postMessage(msg);
    lsPost(msg);
  }
  function send(next) {
    if (!viaServer) post(next);
    else {
      fetch('/api/duo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next), keepalive: true })
        .catch(() => handlers.status(false));
    }
  }
  function connect() {
    if (!viaServer) {
      if (channel) channel.onmessage = e => receive(e.data);
      window.addEventListener('storage', e => {
        if (e.key !== LS_KEY || !e.newValue) return;
        try { receive(JSON.parse(e.newValue).msg); } catch (err) { /* kaputte Nachricht überspringen */ }
      });
      post({ ask: true });
      handlers.status(true);
      return;
    }
    // EventSource verbindet sich nach einem Abbruch von selbst neu.
    const source = new EventSource('/api/duo/events');
    source.onopen = () => handlers.status(true);
    source.onerror = () => handlers.status(false);
    source.onmessage = e => { try { receive(JSON.parse(e.data)); } catch (err) { /* kaputte Nachricht überspringen */ } };
  }
  return { send, connect, on(type, fn) { handlers[type] = fn; } };
})();

// Kleiner Punkt in der Ecke: grün = verbunden, rot = keine Verbindung.
const statusDot = el('div', 'duo-status');
statusDot.title = 'Verbindung';
function setStatus(ok) {
  statusDot.classList.toggle('is-ok', ok);
  statusDot.title = ok ? 'Verbunden' : 'Keine Verbindung zum anderen Bildschirm';
}

// Nur das iPad ändert den Spielstand.
function update(changes) {
  state = { ...state, ...changes, rev: state.rev + 1 };
  applyGlobals();
  if (session.id) saveSession(state.page === RESULT);
  sync.send(state);
  show();
}

/* ---------- Seitenwechsel ---------- */

// Eine Ansicht hat einen Schlüssel. Bleibt er gleich, wird sie nur aktualisiert (z. B. neue Auswahl),
// sonst blendet die alte aus und die neue ein.
let view = null, swapToken = 0;

function show() {
  applyGlobals();
  const next = (ROLE === 'oben' ? TOP : BOTTOM)[viewName(state.page)];
  const key = next.key(state);
  if (view && view.key === key) { view.update && view.update(state); return; }
  const token = ++swapToken;
  const old = view;
  const leave = old ? (old.leave ? old.leave(state) : fadeOut(old.nodes, 260)) : 0;
  setTimeout(() => {
    if (token !== swapToken) return;
    applyGlobals();
    drawPointers = () => {};
    const built = next.build(state);
    view = { key, nodes: built.nodes, ...built };
    screen.replaceChildren(...built.nodes);
    built.nodes.forEach(n => n.animate && n.animate({ opacity: [0, 1] }, { duration: 450, easing: 'ease' }));
    if (built.update) built.update(state);
    if (built.after) built.after();
    window.scrollTo(0, 0);
  }, leave);
}

function viewName(p) {
  if (p === START) return 'start';
  if (p === SELECT || p === 1) return 'select';
  if (p >= FIRST_STEP && p <= LAST_STEP) return 'step';
  if (p === HOUSE) return 'house';
  if (p === SIMULATION) return 'sim';
  return 'result';
}

function fadeOut(nodes, ms) {
  if (reducedMotion()) return 0;
  nodes.forEach(n => n.animate && n.animate({ opacity: [1, 0] }, { duration: ms, easing: 'ease-in', fill: 'forwards' }));
  return ms;
}

function stepIndex(s) { return s.page - FIRST_STEP; }

// Schritt-Grafik mit dem Haus: Auswahl der vorherigen Schritte plus (optional) eine bestimmte Option dieses Schritts.
function houseArt(i, j) {
  const holder = el('div', 'duo-art');
  holder.innerHTML = themed(scenario.steps[i] ? scenario.steps[i].art : FOUNDATION_ART);
  const svg = holder.firstElementChild;
  const keep = answers;
  if (j != null) { answers = keep.slice(); answers[i] = j; }
  updateHouse(svg);
  answers = keep;
  return { holder, svg };
}

// Ausschnitt der kleinen Bilder auf dem iPad: Jedes zeigt das Bauteil, um das es gerade geht.
const CROPS = {
  foundation: '110 300 340 260',
  wall: '120 250 320 290',
  roof: '100 160 360 330',
  extra: '-20 100 600 450',
};

function miniArt(i, j, kind) {
  const { holder, svg } = houseArt(i, j);
  holder.className = 'duo-mini';
  // Steht das Haus auf der Erdplattform, wandert der Ausschnitt mit nach oben.
  const [x, y, w, h] = (CROPS[kind] || CROPS.extra).split(' ').map(Number);
  const raise = kind === 'extra' ? 0 : parseFloat(svg.style.getPropertyValue('--raise')) || 0;
  svg.setAttribute('viewBox', `${x} ${y - raise} ${w} ${h}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  return holder;
}

// Bauteil allein, ohne Hintergrund: so wie es oben ins Haus kommt. Die Besonderheit zeigt das ganze Haus,
// weil sie nur zusammen mit dem Haus Sinn ergibt (Plattform, Tragwerk, Brunnen daneben).
const PIECE_CROPS = {
  foundation: '98 405 364 140',
  wall: '130 352 300 142',
  roof: '100 250 360 142',
  extra: '-10 110 600 445',
};

function pieceArt(i, j, kind) {
  const { holder, svg } = houseArt(i, j);
  holder.className = 'duo-piece';
  holder.dataset.kind = kind;
  if (kind !== 'extra') {
    const option = scenario.steps[i].options[j];
    ['foundation', 'wall', 'roof', 'extra'].forEach(key => { svg.dataset[key] = key === kind ? option.id : ''; });
    svg.style.setProperty('--lift', '0px');
    svg.style.setProperty('--raise', '0px');
  }
  if (kind === 'foundation' || kind === 'extra') {
    // Boden als dünne Linie, damit man sieht, was über und was unter der Erde liegt.
    const [cx, , cw] = PIECE_CROPS[kind].split(' ').map(Number);
    svg.querySelector('defs').insertAdjacentHTML('afterend', `<g class="duo-ground">
      <linearGradient id="duo-soil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a0693c" stop-opacity=".5"/><stop offset="1" stop-color="#a0693c" stop-opacity="0"/></linearGradient>
      <rect x="${cx + 4}" y="480" width="${cw - 8}" height="70" fill="url(#duo-soil)"/>
      <rect x="${cx + 4}" y="476" width="${cw - 8}" height="7" rx="3.5" fill="#3fd07f"/></g>`);
  }
  svg.setAttribute('viewBox', PIECE_CROPS[kind]);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  return holder;
}

// Zwei Pfeile über jedem Bauteil, die abwechselnd aufleuchten: nach oben schieben.
const ARROWS_SVG = `<svg viewBox="0 0 40 46" aria-hidden="true">
  <path class="duo-chev duo-chev-a" d="M8 20L20 8L32 20"/><path class="duo-chev duo-chev-b" d="M8 38L20 26L32 38"/></svg>`;

// Bauteil mit Finger oder Pencil nach oben aus dem iPad-Bildschirm ziehen. Losgelassen im oberen Bereich
// (oder ganz aus dem Fenster heraus) zählt es als eingebaut, sonst springt es zurück.
function dragUp(grab, wrap, onDrop) {
  let drag = null;
  const pose = (dx, dy) => `translate(${dx}px, ${dy}px) scale(1.12)`;
  grab.addEventListener('pointerdown', e => {
    if (drag) return;
    e.preventDefault();
    try { grab.setPointerCapture(e.pointerId); } catch (err) { /* ohne Capture geht es auch */ }
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0, ready: false };
    grab.classList.add('is-dragging');
    wrap.classList.add('is-dragging');
  });
  grab.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dx = e.clientX - drag.x;
    drag.dy = Math.min(30, e.clientY - drag.y);
    grab.style.transform = pose(drag.dx, drag.dy);
    drag.ready = e.clientY < innerHeight * 0.2 || drag.dy < -innerHeight * 0.42;
    wrap.classList.toggle('is-ready', drag.ready);
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const { dx, dy, ready } = drag;
    drag = null;
    grab.classList.remove('is-dragging');
    wrap.classList.remove('is-dragging', 'is-ready');
    if (ready && e.type === 'pointerup') {
      const fly = grab.animate([
        { transform: pose(dx, dy), opacity: 1 },
        { transform: `translate(${dx}px, ${-innerHeight}px) scale(.8)`, opacity: 0 },
      ], { duration: reducedMotion() ? 1 : 320, easing: 'ease-in', fill: 'forwards' });
      fly.onfinish = () => {
        fly.cancel();
        grab.style.transform = '';
        grab.animate({ opacity: [0, 1] }, { duration: 450, delay: 250, fill: 'backwards' });
        onDrop();
      };
      return;
    }
    grab.style.transform = '';
    if (Math.abs(dx) + Math.abs(dy) < 8) {
      // Nur angetippt: kleiner Hüpfer nach oben als Hinweis aufs Ziehen.
      grab.animate([{ transform: 'none' }, { transform: 'translateY(-22px)' }, { transform: 'none' }],
        { duration: 480, easing: 'cubic-bezier(.3, 1.4, .5, 1)' });
    } else {
      grab.animate([{ transform: pose(dx, dy) }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.3, 1.4, .5, 1)' });
    }
  };
  grab.addEventListener('pointerup', end);
  grab.addEventListener('pointercancel', end);
}

// Oben: Ausschnitt so wählen, dass das Haus groß ist und trotzdem samt Sockel und Plattform ins Bild passt.
function houseView() {
  const foundation = optionOfKind('foundation'), extra = optionOfKind('extra');
  const up = (foundation ? foundation.lift : 0) + (extra && extra.raise ? extra.raise : 0);
  const bottom = 545, top = Math.min(296 - up - 70, bottom - 430);
  const h = bottom - top, w = h * 1.3;
  return [280 - w / 2, top, w, h];
}

// Fährt den Ausschnitt weich nach (z. B. wenn die Erdplattform das Haus anhebt).
function camera(svg) {
  let now = null, frame = 0;
  const set = box => { now = box; svg.setAttribute('viewBox', box.map(v => v.toFixed(1)).join(' ')); };
  return {
    to(target, animate) {
      cancelAnimationFrame(frame);
      if (!now || !animate || reducedMotion()) { set(target); return; }
      const from = now, start = performance.now(), ms = 900;
      const tick = t => {
        const k = Math.min(1, (t - start) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        set(from.map((v, n) => v + (target[n] - v) * e));
        if (k < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    },
  };
}

// Oben: Das gerade eingebaute Teil kommt von unten herein, als käme es vom iPad hoch.
const PART_SELECTORS = {
  foundation: id => `.fd-${id}`,
  wall: id => `.fd-wall-${id === 'brickwall' ? 'brick' : id}`,
  roof: id => `.fd-roof-${id}`,
  extra: id => `.fd-${id}`,
};
function flyIn(svg, step, option) {
  if (reducedMotion() || !option || !option.id) return;
  const part = svg.querySelector(PART_SELECTORS[step.kind](option.id));
  if (!part) return;
  part.animate([
    { transform: 'translateY(700px)', opacity: 1 },
    { transform: 'translateY(-14px)', opacity: 1, offset: .78 },
    { transform: 'none', opacity: 1 },
  ], { duration: 1000, easing: 'cubic-bezier(.25, .8, .35, 1)' });
}

// Wie hoch steht der Boden des Hauses (in Metern) und wie viel Wasser kommt bei 1 m Flut hinein?
function floodInside() {
  const foundation = optionOfKind('foundation');
  const extra = optionOfKind('extra');
  const floor = ((foundation ? foundation.lift : 0) + (extra && extra.raise ? extra.raise : 0)) / METER;
  return { floor, water: Math.max(0, Math.round((1 - floor) * 100)) };
}

/* ---------- Oberer Bildschirm (Laptop): zeigt nur an ---------- */

const TOP = {
  start: {
    key: () => 'start',
    build() {
      const art = el('div', 'start-art');
      art.innerHTML = themed(BUILD_ART);
      const wrap = el('div', 'page start duo-start');
      const main = el('div', 'start-main');
      const title = el('h1');
      title.append('Kannst du das perfekte', el('br'), 'Haus bauen?');
      main.append(title, el('p', 'duo-start-hint', 'Tippe unten auf „Los geht’s“'));
      wrap.append(main);
      const connect = el('div', 'duo-connect');
      fillConnectInfo(connect);
      return { nodes: [art, wrap, connect] };
    },
  },

  // Szenario-Auswahl: Oben stehen die Infos zum Szenario, das unten markiert ist.
  select: {
    key: s => `select:${s.focus}`,
    build(s) {
      const chosen = SCENARIOS.find(x => x.id === s.focus) || OPEN_SCENARIO;
      const wrap = el('div', 'page split brief duo-brief');
      const text = el('div', 'split-main');
      const art = el('div', 'split-art');
      if (chosen.locked) {
        wrap.classList.add('is-locked');
        text.append(
          el('p', 'eyebrow', `${chosen.title} · ${chosen.subtitle}`),
          el('h1', null, 'Bald verfügbar'),
          el('p', 'challenge-task', 'An diesem Szenario bauen wir noch.'),
          el('p', 'challenge-context', 'Wähle unten „Überschwemmung“, um mit deinem Haus in Bangladesch loszulegen.'),
        );
        art.innerHTML = themed(chosen.art);
      } else {
        text.append(
          el('p', 'eyebrow', `${chosen.title} · ${chosen.subtitle}`),
          el('h1', null, 'Challenge'),
          el('p', 'challenge-context', chosen.challenge.context),
          el('p', 'challenge-task', chosen.challenge.task),
        );
        const facts = el('dl', 'facts');
        chosen.facts.forEach(f => {
          const fact = el('div', 'fact');
          const value = el('dd');
          value.append(el('span', 'fact-value', f.value), el('span', 'fact-detail', f.detail));
          fact.append(el('dt', null, f.label), value);
          facts.append(fact);
        });
        text.append(facts);
        art.innerHTML = themed(chosen.briefArt);
      }
      wrap.append(text, art);
      return {
        nodes: [wrap],
        // Auf „Loslegen“ steigt der Fluss wie in der Ein-Bildschirm-Fassung, dann geht es zum ersten Bauschritt.
        leave(next) {
          const river = art.querySelector('.rv-river');
          if (chosen.locked || next.page !== FIRST_STEP || !river || reducedMotion()) return fadeOut([wrap], 260);
          const svg = art.firstElementChild;
          svg.style.setProperty('--flood-from', getComputedStyle(river).strokeWidth);
          svg.classList.add('flooding');
          setTimeout(() => fadeOut([wrap], FLOOD_FADE_MS), FLOOD_FADE_DELAY_MS);
          return FLOOD_FADE_DELAY_MS + FLOOD_FADE_MS;
        },
      };
    },
  },

  // Bauschritte: Das Haus füllt den ganzen Bildschirm, der Ausschnitt zoomt nah heran.
  // Was auf dem iPad hochgezogen wird, kommt hier von unten ins Haus.
  step: {
    key: () => 'step',
    build(s) {
      const { holder, svg } = houseArt(stepIndex(s));
      holder.classList.add('duo-stage');
      svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
      const cam = camera(svg);

      const chip = el('div', 'duo-chip');
      const chipStep = el('small');
      const chipTitle = el('strong');
      chip.append(chipStep, chipTitle, el('span', 'duo-chip-hint', '↑ Zieh unten ein Bauteil hoch ins Haus'));

      const gauge = usageGauge();
      const gaugeBox = el('div', 'duo-gauge');
      gaugeBox.append(gauge.box);

      const guide = el('div', 'duo-guide');
      const bubble = el('p', 'duo-bubble');
      bubble.hidden = true;
      const figure = mascotFigure();
      guide.append(bubble, figure);
      let lastHint = null, lastStep = null, lastAnswers = null;

      return {
        nodes: [holder, chip, gaugeBox, guide],
        update(st) {
          const i = stepIndex(st), step = scenario.steps[i];
          const sameStep = lastStep === i;
          updateHouse(svg);
          cam.to(houseView(), lastAnswers !== null);
          if (sameStep && lastAnswers && st.answers[i] != null && st.answers[i] !== lastAnswers[i]) {
            flyIn(svg, step, step.options[st.answers[i]]);
          }
          lastAnswers = st.answers.slice();
          chipStep.textContent = `Schritt ${i + 1} von ${scenario.steps.length} · ${step.name}`;
          chipTitle.textContent = step.question;
          const option = chosenOption(i);
          gauge.show(option, scenario.region);
          gaugeBox.classList.toggle('is-empty', !option);
          if (!sameStep) { lastStep = i; bubble.hidden = true; lastHint = null; }
          const hint = st.hint && st.hint.page === st.page ? st.hint : null;
          if (hint && hint.n !== lastHint) {
            lastHint = hint.n;
            bubble.hidden = false;
            delete bubble.dataset.text;
            typeText(bubble, hint.text, 700);
            setTimeout(() => mascotSalto(figure), 600);
          }
        },
      };
    },
  },

  house: {
    key: () => 'house',
    build() {
      const backdrop = [];
      siteScene(backdrop, 'duo-site');
      const title = el('div', 'duo-headline');
      title.append(el('p', 'eyebrow', `${scenario.title} · ${scenario.subtitle}`), el('h1', null, 'Dein fertiges Haus'));
      return { nodes: [...backdrop, title] };
    },
  },

  // Simulation: Erst steigt unten auf dem iPad das Wasser, dann kommt es hier von unten herein
  // und bleibt an der 1-m-Linie stehen.
  sim: {
    key: s => `sim:${s.run}`,
    build() {
      const backdrop = [];
      const { svg } = siteScene(backdrop, 'duo-site');
      const top = 810 - METER * SITE_SCALE;
      const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const waves = Array.from({ length: 75 }, () => 'q50 -9 100 0').join('');
      layer.innerHTML = `<g class="sim-water" style="transform: translateY(${900 - top + 60}px)">
          <rect x="-3000" y="${top}" width="7500" height="1400" fill="#2fb6ea" opacity=".55"/>
          <path class="sim-wave" fill="#e6f9ff" opacity=".75" d="M-3000 ${top}${waves}v7H-3000Z"/>
        </g>
        <g class="sim-mark">
          <path stroke="#12234f" stroke-width="2.5" fill="none" stroke-dasharray="10 8" d="M-3000 ${top}H4500"/>
          <text x="1130" y="${top - 12}" fill="#12234f" font-size="30" font-weight="800">1 m Flut</text>
        </g>`;
      svg.append(layer);
      const water = layer.querySelector('.sim-water');
      const head = el('div', 'duo-headline');
      const line = el('h1', null, 'Die Regenzeit beginnt …');
      head.append(el('p', 'eyebrow', 'Simulation · Sirajganj'), line);
      const inside = floodInside().water;
      const timers = [];
      const done = () => {
        line.textContent = inside ? `Bei 1 m Flut stehen ${inside} cm Wasser in deinem Haus` : 'Bei 1 m Flut bleibt dein Haus trocken!';
        head.classList.add(inside ? 'is-wet' : 'is-dry');
        head.animate([{ transform: 'translateX(-50%) scale(.92)' }, { transform: 'translateX(-50%) scale(1.04)' }, { transform: 'translateX(-50%)' }],
          { duration: 500, easing: 'ease-out' });
      };
      return {
        nodes: [...backdrop, head],
        after() {
          if (reducedMotion()) { water.style.transform = 'none'; done(); return; }
          const arrive = SIM_DELAY_MS + SIM_UP_MS;
          timers.push(setTimeout(() => { line.textContent = 'Das Wasser steigt …'; }, SIM_DELAY_MS));
          timers.push(setTimeout(() => {
            water.style.transition = `transform ${SIM_TOP_MS}ms cubic-bezier(.35, 0, .4, 1)`;
            water.style.transform = 'none';
          }, arrive));
          timers.push(setTimeout(done, arrive + SIM_TOP_MS));
        },
        leave() { timers.forEach(clearTimeout); return fadeOut([...backdrop, head], 260); },
      };
    },
  },

  // Ergebnis wie in der Ein-Bildschirm-Fassung: Punkte zählen hoch, dann grüne und rote Kreise am Haus und das Fazit.
  // Geöffnet werden die Kreise vom iPad aus (state.outcome).
  result: {
    key: s => `result:${s.run}`,
    build() {
      const wrap = el('div', 'page');
      const backdrop = [];
      guided = null;
      const keepId = session.id;
      session.id = '';   // Gespeichert wird nur vom iPad aus.
      renderGuidedOutcome(wrap, backdrop);
      session.id = keepId;
      wrap.classList.add('duo-guided');
      const api = wrap.guidedApi;
      let applied = null, wait = 0;
      const apply = st => {
        clearTimeout(wait);
        const o = st.outcome;
        if (!o || o.phase === 'intro' || !wrap.isConnected) return;
        // Solange oben noch die Punkte hochzählen, kurz warten.
        if (api.phase() === 'intro') { wait = setTimeout(() => apply(state), 300); return; }
        const want = `${o.phase}|${o.view || ''}`;
        if (applied !== want) { applied = want; api.enterPhase(o.phase, o.view || null); }
        if (o.open) {
          const cut = o.open.indexOf(':');
          api.open(o.open.slice(0, cut), o.open.slice(cut + 1));
        } else api.close();
      };
      return { nodes: [...backdrop, wrap], update: apply, after: () => requestAnimationFrame(() => drawPointers()) };
    },
  },
};

// Startseite oben: Adresse fürs iPad anzeigen, damit man sie nicht suchen muss.
function fillConnectInfo(box) {
  const text = el('span', null, 'iPad: …/unten öffnen');
  box.append(text);
  if (!location.protocol.startsWith('http')) { text.textContent = 'Ohne Server: zweiten Tab mit ?rolle=unten öffnen'; return; }
  fetch('/api/duo/info').then(r => r.json()).then(info => {
    const port = info.port || location.port || 3000;
    const ip = (info.addresses || [])[0];
    text.textContent = ip ? `iPad im selben WLAN: http://${ip}:${port}/unten` : `iPad: http://<IP dieses Laptops>:${port}/unten`;
  }).catch(() => {});
}

/* ---------- Unterer Bildschirm (iPad): Touch-Steuerung ---------- */

function bigButton(label, onTap, cls = '') {
  const b = el('button', `btn duo-btn ${cls}`, label);
  b.type = 'button';
  b.onclick = onTap;
  return b;
}

function bottomBar(left, middle, right) {
  const bar = el('div', 'duo-bar');
  const mid = el('div', 'duo-bar-mid');
  if (middle) mid.append(...[].concat(middle));
  bar.append(left || el('span'), mid, right || el('span'));
  return bar;
}

function backButton(toPage, extra = {}) {
  return bigButton('← Zurück', () => update({ page: toPage, ...extra }), 'ghost');
}

const BOTTOM = {
  start: {
    key: () => 'start',
    build() {
      const wrap = el('div', 'duo-pad duo-pad-start');
      const go = bigButton('Los geht’s', () => {
        // Jeder Start ist ein neuer Durchlauf mit eigener ID (Testdaten, siehe server.js).
        session.name = '';
        session.id = (crypto.randomUUID && crypto.randomUUID()) || `s${Date.now()}${Math.random().toString(16).slice(2)}`;
        update({ page: SELECT, focus: OPEN_SCENARIO.id, answers: [], hint: null });
      }, 'btn-big duo-go');
      wrap.append(go);
      return { nodes: [wrap] };
    },
  },

  // Drei Szenarien. Tippen markiert eines und zeigt oben die Infos; „Loslegen“ gibt es nur bei der Überschwemmung.
  select: {
    key: () => 'select',
    build() {
      const wrap = el('div', 'duo-pad');
      const row = el('div', 'duo-scenarios');
      const cards = new Map();
      SCENARIOS.forEach(s => {
        const card = el('div', `scenario duo-scn${s.locked ? ' is-locked' : ''}`);
        card.setAttribute('role', 'button');
        card.tabIndex = 0;
        card.innerHTML = themed(s.art);
        const label = el('span', 'scenario-label');
        label.append(el('span', 'scenario-title', s.title), el('span', 'scenario-sub', s.subtitle));
        const foot = el('div', 'duo-scn-foot');
        let action;
        if (s.locked) {
          action = el('button', 'btn ghost duo-scn-btn', 'Mehr Infos');
          action.setAttribute('aria-disabled', 'true');
        } else {
          action = el('button', 'btn duo-scn-btn', 'Loslegen →');
          action.onclick = e => {
            e.stopPropagation();
            const fresh = state.focus !== s.id ? [] : state.answers;
            update({ focus: s.id, page: FIRST_STEP, answers: fresh, hint: null });
          };
        }
        action.type = 'button';
        foot.append(action);
        card.append(label, foot);
        card.onclick = () => { if (state.focus !== s.id) update({ focus: s.id }); };
        cards.set(s.id, card);
        row.append(card);
      });
      const bar = bottomBar(backButton(START), el('p', 'duo-note', 'Tippe auf ein Szenario – oben siehst du die Infos dazu.'));
      wrap.append(el('h1', 'duo-title', 'Wähle dein Szenario'), row, bar);
      return {
        nodes: [wrap],
        update(st) { cards.forEach((card, id) => card.classList.toggle('is-focus', id === st.focus)); },
      };
    },
  },

  // Bauschritt: Die vier Bauteile als Bild nebeneinander, darunter Name und kurze Beschreibung.
  // Eingebaut wird, indem man ein Bauteil nach oben aus dem iPad zieht.
  step: {
    key: s => `step:${s.page}`,
    build(s) {
      const i = stepIndex(s), step = scenario.steps[i];
      const wrap = el('div', 'duo-pad duo-build');
      const zone = el('div', 'duo-dropzone', '↑  Hier hoch ins Haus ziehen  ↑');
      const row = el('div', 'duo-pieces');
      const items = step.options.map((o, j) => {
        const item = el('div', 'duo-item');
        const arrows = el('div', 'duo-arrows');
        arrows.innerHTML = ARROWS_SVG;
        const grab = el('div', 'duo-grab');
        grab.setAttribute('role', 'button');
        grab.setAttribute('aria-label', `${o.text} nach oben ziehen`);
        grab.append(pieceArt(i, j, step.kind));
        item.append(arrows, grab, el('span', 'duo-badge', '✓ Eingebaut'),
          el('span', 'duo-option-title', o.text), el('span', 'duo-option-info', o.info));
        dragUp(grab, wrap, () => {
          const next = state.answers.slice();
          next[i] = j;
          update({ answers: next, hint: { page: state.page, text: o.hint || o.info, n: state.rev + 1 } });
        });
        row.append(item);
        return item;
      });
      const isLast = s.page === LAST_STEP;
      const next = bigButton(isLast ? 'Zum fertigen Haus →' : 'Weiter →', () => update({ page: state.page + 1, hint: null }));
      const back = backButton(s.page === FIRST_STEP ? SELECT : s.page - 1, { hint: null });
      wrap.append(zone, row, bottomBar(back, dotsRow(i), next));
      return {
        nodes: [wrap],
        update(st) {
          const chosen = st.answers[i];
          items.forEach((item, j) => item.classList.toggle('is-placed', chosen === j));
          next.disabled = chosen == null;
          next.classList.toggle('is-glow', chosen != null);
        },
      };
    },
  },

  // Übersicht der Auswahl, dann geht es in die Simulation.
  house: {
    key: () => 'house',
    build() {
      const wrap = el('div', 'duo-pad');
      wrap.append(el('h1', 'duo-title', 'Das hast du gewählt'));
      const list = el('div', 'duo-parts');
      scenario.steps.forEach((step, i) => {
        const option = chosenOption(i);
        const card = el('button', 'duo-part');
        card.type = 'button';
        card.append(miniArt(i, null, step.kind), el('span', 'part-label', step.name),
          el('span', 'duo-option-title', option ? option.text : 'Noch nicht gewählt'),
          el('span', 'duo-part-change', 'Ändern'));
        card.onclick = () => update({ page: FIRST_STEP + i, hint: null });
        list.append(card);
      });
      const test = bigButton('Teste dein Haus jetzt →', () => update({ page: SIMULATION, run: state.run + 1 }), 'duo-cta');
      wrap.append(list, bottomBar(backButton(LAST_STEP), el('p', 'duo-note', 'Tippe auf ein Bauteil, um es zu ändern.'), test));
      return { nodes: [wrap] };
    },
  },

  // Simulation: Das Wasser steigt hier von unten bis an den oberen Rand und läuft oben weiter.
  // Erst wenn es oben an der 1-m-Linie steht, leuchtet der Button auf.
  sim: {
    key: s => `sim:${s.run}`,
    build() {
      const wrap = el('div', 'duo-flood');
      const water = el('div', 'duo-flood-water');
      water.innerHTML = `<svg class="duo-flood-wave" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 20${Array.from({ length: 12 }, () => 'q50 -16 100 0').join('')}V40H0Z"/></svg>`;
      const result = bigButton('Wie hat sich dein Haus geschlagen? →',
        () => update({ page: RESULT, outcome: { phase: 'intro', view: null, open: null } }), 'duo-cta duo-flood-btn');
      result.hidden = true;
      wrap.append(water, result);
      const timers = [];
      const ready = () => { result.hidden = false; result.classList.add('is-glow'); };
      return {
        nodes: [wrap],
        after() {
          if (reducedMotion()) { water.classList.add('is-up'); ready(); return; }
          water.style.transitionDuration = `${SIM_UP_MS}ms`;
          timers.push(setTimeout(() => water.classList.add('is-up'), SIM_DELAY_MS));
          timers.push(setTimeout(ready, SIM_DELAY_MS + SIM_UP_MS + SIM_TOP_MS));
        },
        leave() { timers.forEach(clearTimeout); return fadeOut([wrap], 260); },
      };
    },
  },

  // Ergebnis: Oben zählen die Punkte hoch und es gibt Kreise am Haus. Hier tippt man die Punkte an,
  // oben öffnet sich dann die Erklärung dazu.
  result: {
    key: s => `result:${s.run}`,
    build() {
      const wrap = el('div', 'duo-pad duo-pad-result');
      const ratings = houseRatings();
      const points = SCALES.reduce((sum, [key]) => sum + ratings[key], 0);
      const verdict = scoreVerdict(points);
      const head = el('div', 'duo-result-head');
      head.append(el('p', 'eyebrow', 'Dein Ergebnis'), el('h1', 'duo-title', verdict.word),
        el('p', 'duo-score', `${points} von ${SCALES.length * 5} Punkten`));
      const body = el('div', 'duo-result-body');
      const actions = el('div', 'duo-actions');
      actions.append(
        bigButton('Nochmal bauen', () => update({ page: FIRST_STEP, answers: [], hint: null, outcome: null })),
        bigButton('Neues Szenario', () => update({ page: SELECT, answers: [], hint: null, outcome: null }), 'ghost'),
        bigButton('Zum Start', () => update({ page: START, answers: [], hint: null, outcome: null }), 'ghost'),
      );
      wrap.append(head, body, actions);
      const seen = new Set();
      const setOutcome = changes => update({ outcome: { phase: 'intro', view: null, open: null, ...state.outcome, ...changes } });
      // So lange dauert oben das Hochzählen der Punkte (siehe scoreIntro in app.js).
      const introMs = !points || reducedMotion() ? 300 : COUNT_MS + 120 + COUNT_HOLD_MS + COUNT_FLY_MS + 500;
      let introTimer = 0;

      const spotList = kind => {
        const list = el('div', 'duo-spots');
        const items = spotsFor(kind);
        if (!items.length) {
          list.append(el('p', 'duo-note', kind === 'good' ? 'Diesmal war kein Bauteil richtig stark.' : 'Hier gibt es nichts zu meckern!'));
          return list;
        }
        items.forEach(item => {
          const key = `${kind}:${item.step.name}`;
          const open = state.outcome && state.outcome.open === key;
          const b = el('button', `duo-spot duo-spot-${kind}${open ? ' is-open' : ''}${seen.has(key) ? ' is-seen' : ''}`);
          b.type = 'button';
          b.append(el('span', 'duo-spot-mark', seen.has(key) ? '✓' : SPOT_KINDS[kind].mark),
            el('span', 'duo-spot-part', item.step.name), el('span', 'duo-spot-name', item.option.text));
          b.onclick = () => { seen.add(key); setOutcome({ open: open ? null : key }); };
          list.append(b);
        });
        return list;
      };

      const draw = st => {
        const o = st.outcome || { phase: 'intro' };
        actions.hidden = !(o.phase === 'fazit' || o.phase === 'review');
        body.replaceChildren();
        if (o.phase === 'intro') {
          body.append(el('p', 'duo-note duo-wait', 'Schau nach oben: Gleich siehst du, wie viele Punkte dein Haus holt …'));
          return;
        }
        if (o.phase === 'good' || o.phase === 'bad') {
          body.append(el('p', `duo-kicker duo-kicker-${o.phase}`, SPOT_KINDS[o.phase].label), spotList(o.phase));
          const next = o.phase === 'good'
            ? bigButton('Was lief nicht so gut? →', () => setOutcome({ phase: 'bad', open: null }))
            : bigButton('Zum Fazit →', () => setOutcome({ phase: 'fazit', open: null }));
          body.append(next);
          return;
        }
        if (o.phase === 'fazit') {
          body.append(el('p', 'duo-note', 'Oben siehst du dein Fazit.'),
            bigButton('Punkte nochmal ansehen', () => setOutcome({ phase: 'review', view: 'good', open: null }), 'ghost'));
          return;
        }
        const tabs = el('div', 'duo-tabs');
        [['good', 'Gutes'], ['bad', 'Schlechtes'], ['fazit', 'Fazit']].forEach(([key, label]) => {
          const b = bigButton(label, () => setOutcome(key === 'fazit' ? { phase: 'fazit', open: null } : { phase: 'review', view: key, open: null }),
            `duo-tab duo-tab-${key}${o.view === key ? ' is-on' : ''}`);
          tabs.append(b);
        });
        body.append(tabs);
        if (o.view) body.append(spotList(o.view));
      };
      return {
        nodes: [wrap],
        update: draw,
        after() {
          if (!state.outcome || state.outcome.phase === 'intro') {
            introTimer = setTimeout(() => setOutcome({ phase: 'good', open: null }), introMs);
          }
        },
        leave() { clearTimeout(introTimer); return fadeOut([wrap], 260); },
      };
    },
  },
};

function dotsRow(current) {
  const row = el('div', 'duo-dots');
  scenario.steps.forEach((step, k) => {
    const dot = el('span', `duo-dot${k < current ? ' done' : ''}${k === current ? ' current' : ''}`);
    dot.title = step.name;
    row.append(dot);
  });
  return row;
}

/* ---------- Start ---------- */

if (!ROLE) {
  // Ohne Rolle gibt es hier nichts zu sehen: zurück zur Startseite.
  location.replace('../index.html');
} else {
  document.body.append(statusDot);
  sync.on('status', setStatus);
  sync.on('state', next => {
    // Oben gilt immer der neueste Stand. Das iPad übernimmt nur Neueres (z. B. nach dem Neuladen).
    if (ROLE === 'unten' && next.rev <= state.rev) return;
    if (ROLE === 'oben' && next.rev === state.rev && view) return;
    state = { ...state, ...next };
    show();
  });
  // Doppeltippen zoomt auf dem iPad sonst ins Bild.
  if (ROLE === 'unten') document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
  show();
  sync.connect();
}
