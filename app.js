// Prototyp: Szenario-Auswahl -> Intro -> 4 Fragen -> Auswertung
// score: 2 = richtig, 1 = okay, 0 = falsch
const SCENARIOS = [
  {
    id: 'flood',
    title: 'Überschwemmung am Fluss',
    intro: 'Beispieltext: Das Haus steht in der Nähe eines Flusses, der regelmäßig über die Ufer tritt.',
    steps: ['Fundament', 'Wand', 'Dach', 'Besonderheiten'].map((name, i) => ({
      question: `Beispielfrage ${i + 1}`,
      options: [0, 1, 2, 3].map(j => ({
        text: `Antwort ${j + 1}`,
        info: `Beispielinfo zu Antwort ${j + 1} (Frage ${i + 1}).`,
        score: [2, 1, 0, 0][j],
      })),
    })),
  },
];

const stage = document.getElementById('stage');
const progress = document.getElementById('progress');
const modal = document.getElementById('modal');
const LABELS = { 2: 'Richtig', 1: 'Okay', 0: 'Falsch' };
const CLASSES = { 2: 'good', 1: 'ok', 0: 'bad' };

// page index: 0 = Auswahl, 1 = Intro, 2..5 = Fragen, 6 = Ergebnis
let page = 0, scenario = null, answers = [];
const LAST = 6;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function renderProgress() {
  progress.replaceChildren();
  for (let i = 0; i <= LAST; i++) {
    if (i > 0) progress.append(el('div', 'bar' + (i <= page ? ' done' : '')));
    progress.append(el('div', 'dot' + (i < page ? ' done' : i === page ? ' current' : '')));
  }
}

function nav(onBack, onNext, nextLabel = 'Weiter', nextDisabled = false) {
  const n = el('div', 'nav');
  const back = el('button', 'btn ghost', 'Zurück');
  back.onclick = onBack;
  const next = el('button', 'btn', nextLabel);
  next.disabled = nextDisabled;
  next.onclick = onNext;
  n.append(back, next);
  return n;
}

function go(p) { page = p; render(); }

function render() {
  renderProgress();
  const wrap = el('div', 'page');
  if (page === 0) {
    wrap.append(el('h1', null, 'Szenario wählen'));
    const cards = el('div', 'cards');
    SCENARIOS.forEach(s => {
      const b = el('button', 'card', s.title);
      b.onclick = () => { scenario = s; answers = []; go(1); };
      cards.append(b);
    });
    wrap.append(cards);
  } else if (page === 1) {
    wrap.append(el('h1', null, scenario.title), el('p', 'text', scenario.intro),
      nav(() => go(0), () => go(2)));
  } else if (page <= 5) {
    const i = page - 2, step = scenario.steps[i];
    wrap.append(el('h2', null, step.question));
    const list = el('div', 'cards');
    const next = nav(() => go(page - 1), () => go(page + 1), 'Weiter', answers[i] == null);
    step.options.forEach((o, j) => {
      const row = el('div', 'option-row');
      const b = el('button', 'option' + (answers[i] === j ? ' selected' : ''), o.text);
      b.onclick = () => {
        answers[i] = j;
        list.querySelectorAll('.option').forEach((x, k) => x.classList.toggle('selected', k === j));
        next.lastChild.disabled = false;
      };
      const info = el('button', 'info', 'i');
      info.setAttribute('aria-label', 'Information');
      info.onclick = () => openModal(o.info);
      row.append(b, info);
      list.append(row);
    });
    wrap.append(list, next);
  } else {
    const total = scenario.steps.length * 2;
    const got = scenario.steps.reduce((s, st, i) => s + st.options[answers[i]].score, 0);
    wrap.append(el('div', 'score', `Score: ${got} / ${total}`));
    scenario.steps.forEach((st, i) => {
      const q = el('div', 'result-q');
      q.append(el('h3', null, st.question));
      st.options.forEach((o, j) => {
        const a = el('div', `result-a ${CLASSES[o.score]}${answers[i] === j ? ' chosen' : ''}`);
        a.append(el('span', null, o.text + (answers[i] === j ? ' (deine Wahl)' : '')),
          el('span', 'tag', LABELS[o.score]));
        q.append(a);
      });
      wrap.append(q);
    });
    const again = el('button', 'btn', 'Neu starten');
    again.onclick = () => go(0);
    wrap.append(again);
  }
  stage.replaceChildren(wrap);
  window.scrollTo(0, 0);
}

function openModal(text) {
  document.getElementById('modal-text').textContent = text;
  modal.hidden = false;
}
document.getElementById('modal-close').onclick = () => { modal.hidden = true; };
modal.onclick = e => { if (e.target === modal) modal.hidden = true; };

const themeBtn = document.getElementById('theme');
themeBtn.onclick = () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  themeBtn.textContent = dark ? 'Light' : 'Dark';
};

render();
