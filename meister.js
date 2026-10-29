'use strict';

/* ============================================================
   MEISTER MANNY – Begleiter-Charakter (Prototyp)
   Gibt zur jeweils angeklickten Auswahl ein neutrales Wissenshäppchen.
   Erst auf der Ergebnis-Seite bewertet er die Entscheidungen.
   ============================================================ */
const Meister = (() => {
  const NAME = 'Meister Manny';

  /* ---------- Texte ---------- */

  // Ergebnis-Kommentare – erst hier darf bewertet werden
  const RESULT = [
    [0.9, ['Donnerwetter, das sieht nach Profi aus!', 'Da könnte ich glatt meinen Helm vor dir ziehen.']],
    [0.65, ['Solide Arbeit! Schau dir die Kästchen an – da steckt noch ein bisschen Luft drin.']],
    [0.4, ['Das kann aber eine Arbeit werden… Lies dir die Kommentare durch, dann klappt’s beim nächsten Mal.']],
    [0, ['Puh, da wartet noch ordentlich Arbeit auf der Baustelle. Aber so lernt man das!']],
  ];

  // Kommentare zu einzelnen Optionen (Schlüssel = Label der Option)
  const FACT = {
    /* --- Erdbeben: Fundament --- */
    'Durchgehende Betonplatte': 'Frischer Beton trocknet nicht einfach – er härtet chemisch aus. Das klappt sogar unter Wasser.',
    'Betonstreifen unter den Wänden': 'Als Standard für Fundamente gilt Beton erst seit gut 100 Jahren. Davor nahm man meist Naturstein.',
    'Betonstützen tief im Boden': 'Pfähle sind uralt: Am Alpenrand standen schon in der Jungsteinzeit ganze Dörfer auf Pfählen im Wasser.',
    'Haus liegt auf losen Steinen': 'Manche traditionellen japanischen Tempel ruhen auf Fundamentsteinen. Eine jahrhundertealte Technik mit ganz eigener Logik.',
    /* --- Erdbeben: Wände --- */
    'Leichte Holzwände, mit Platten verstärkt': 'Japan baut seit über 1.300 Jahren mit Holz. Die Zimmerleute dort haben einen legendären Ruf.',
    'Stahlgerüst mit Schrägstreben': 'Stahl lässt sich recyceln, ohne Qualität zu verlieren. Er gehört zu den meistrecycelten Werkstoffen überhaupt.',
    'Massive Betonwände': 'Beton ist nach Wasser der meistverwendete Stoff der Welt. Schon verrückt, oder?',
    'Gemauerte Ziegelwände': 'Ziegel wurden schon vor Jahrtausenden in der Sonne getrocknet oder gebrannt.',
    'Leichte Trennwand mit Holzgerüst': 'Gipskarton wurde schon vor über 100 Jahren erfunden. Der Siegeszug kam aber erst später.',
    'Leichte Trennwand mit Metallgerüst': 'In Gips steckt chemisch gebundenes Wasser. Das macht ihn von Natur aus etwas feuerhemmend.',
    'Dünne Holzplatten': 'Spanplatten bestehen aus Holzresten, die früher oft einfach weggeworfen wurden.',
    'Schwere gemauerte Wände': 'Dicke Mauern speichern Wärme und geben sie nachts langsam wieder ab.',
    /* --- Erdbeben: Dach --- */
    'Leichtes Metalldach aus Stahl': 'Metalldächer prasseln bei Regen ganz schön laut. Dämmung darunter macht sie viel leiser.',
    'Leichtes Metalldach aus Aluminium': 'Aluminium war im 19. Jahrhundert so selten und teuer, dass es wie ein Edelmetall galt.',
    'Leichte Platten aus Zement und Fasern': 'Faserzement hieß früher oft „Eternit“ und enthielt lange Asbest. Heute ist er asbestfrei.',
    'Schwere Dachziegel aus Ton': 'Tonziegel gibt es seit der Antike. Schon die Römer deckten ihre Dächer damit.',
    'Klassisches Dach mit zwei Seiten': 'Das Satteldach ist in Mitteleuropa der Klassiker. Kinder zeichnen fast immer genau dieses Dach.',
    'Dach mit vier schrägen Seiten': 'Die dreieckigen Flächen an den Schmalseiten eines Walmdachs heißen „Walme“.',
    'Dach mit nur einer schrägen Seite': 'Pultdächer sind bei Solaranlagen beliebt: Eine Seite lässt sich gut nach Süden ausrichten.',
    'Flaches Dach mit schwerer Kiesschicht': 'Auch „flache“ Dächer haben ein kleines Gefälle, damit Wasser ablaufen kann.',
    /* --- Erdbeben: Besonderes --- */
    'Alu-Fenster mit bruchsicherem Glas': 'Aluminium bildet an der Luft sofort eine hauchdünne Oxidschicht, die es vor weiterem Rost schützt.',
    'Holzfenster mit bruchsicherem Glas': 'Gut gepflegte Holzfenster halten locker mehrere Jahrzehnte.',
    'Kunststoff-Fenster mit normalem Glas': 'Kunststoffrahmen haben mehrere Kammern. Das sind kleine Luftpolster, die dämmen.',
    'Große Glasfront, fest eingemauert': 'Eine Glasscheibe besteht zum großen Teil aus Quarzsand, Soda und Kalk.',
    'Metallwinkel & Zugstangen': 'Im Holzbau sind Winkel und Nagelplatten Alltag. Früher nahm man dafür Zapfen und Holznägel.',
    'Stabile Wände gleichmäßig verteilen': 'In der Statik heißen Wände, die seitliche Kräfte aufnehmen, „Scheiben“.',
    'Schwere Möbel und Geräte sichern': 'In vielen japanischen Haushalten gehören Möbelsicherungen und ein Notfallrucksack zum Alltag.',
    'Offenes Erdgeschoss (Garage)': 'Eine Garage im Erdgeschoss spart Platz: Darüber kann Wohnraum entstehen.',

    /* --- Tropen: Fundament --- */
    'Hohe Betonstützen – Haus schwebt über dem Boden': 'Klassische Queenslander stehen auf Stützen. So kann Luft unter dem Haus durchziehen.',
    'Betonplatte, höher gelegt': 'Wasser kann in Beton wie in einem Schwamm nach oben wandern. Das nennt man kapillares Aufsteigen.',
    'Betonplatte direkt am Boden': 'Cairns zählt mit rund 2 Metern Regen im Jahr zu den nassesten Städten Australiens.',
    'Holzpfosten in der Erde': 'Venedig steht auf Millionen Holzpfählen. Unter Wasser kommt kaum Sauerstoff ran – deshalb halten sie so lange.',
    /* --- Tropen: Wände --- */
    'Betonwände': 'Beton ist von Natur aus nicht brennbar.',
    'Stahlgerüst mit Zementplatten': 'Faserzementplatten gibt es schon seit über 100 Jahren.',
    'Holz mit Schutzbehandlung': 'Termiten gibt es seit weit über 100 Millionen Jahren. Gegen die Dinosaurier haben sie sich schon durchgesetzt.',
    'Holz ohne Schutz': 'Es gibt weit über 2.000 verschiedene Termitenarten.',
    'Platten aus Zement': 'Zement entsteht aus gebranntem Kalkstein und Ton.',
    'Gemauerte, verputzte Wände': 'Wände zu verputzen ist uralt. Schon vor Jahrtausenden strich man Lehm darüber.',
    'Gipsplatten mit Nässeschutz': 'Schon im alten Ägypten wurde Gips als Mörtel genutzt.',
    'Normale Trockenbauplatten': 'Spanplatten sind eine Erfindung des 20. Jahrhunderts: Holzspäne plus Leim, fertig.',
    /* --- Tropen: Dach --- */
    'Helles Metalldach': 'Helle Flächen reflektieren mehr Sonnenlicht. In manchen heißen Städten werden Dächer deshalb weiß gestrichen.',
    'Wellplatten aus Zement und Fasern': 'Die Wellform macht dünne Platten steifer – so wie bei gefalteter Pappe.',
    'Dachziegel': 'Ziegel gibt es in unzähligen Formen: Biberschwanz, Hohlpfanne, Mönch und Nonne …',
    'Dunkle Holzschindeln': 'Schindeln aus Zedernholz sind in Nordamerika sehr verbreitet.',
    'Steiles Dach mit zwei Seiten, weit überstehend': 'Die oberste Kante eines Daches heißt „First“. Daher auch das Wort Firstfeier.',
    'Dach mit vier schrägen Seiten, weit überstehend': 'Queenslander haben unter dem Dachüberstand oft eine rundum laufende Veranda.',
    'Normal geneigtes Dach ohne Überstand': 'Den Dachüberstand an der Längsseite nennt man „Traufe“, den am Giebel „Ortgang“.',
    'Flachdach': 'In trockenen Regionen wie dem Nahen Osten sind Flachdächer seit Jahrtausenden normal.',
    /* --- Tropen: Besonderes --- */
    'Alu-Fenster mit eingebranntem Lack': 'Pulverlack wird elektrisch aufgeladen aufgesprüht und danach eingebrannt.',
    'Kunststoff-Fenster mit Dichtungen': 'PVC gehört zu den meistverwendeten Kunststoffen der Welt.',
    'Holzfenster aus hartem, geschütztem Holz': 'In Australien wachsen Harthölzer wie Eukalyptus. Manche Arten sind von Natur aus recht widerstandsfähig.',
    'Einfache Holzfenster ohne Schutz': 'Als „Weichhölzer“ bezeichnet man meist Nadelhölzer wie Kiefer und Fichte.',
    'Wasser ableiten und Termiten aussperren': 'Eine Termitenkolonie kann aus Millionen Tieren bestehen.',
    'Nur Regenrinnen und Fallrohre': 'Auf 100 m² Dach fallen bei 10 mm Regen rund 1.000 Liter Wasser.',
    'Einmal Termitengift in den Boden': 'Termiten leben oft unterirdisch und bauen Gänge aus Erde. Deshalb sieht man sie lange nicht.',
    'Beete und Rindenmulch direkt am Haus': 'Mulch hält den Boden feucht und kühl. Im Garten ist das ein echter Vorteil.',
  };

  /* ---------- Zustand ---------- */
  let el, bubble, text, hideT, resultT, quakeT;

  const rand = a => a[Math.floor(Math.random() * a.length)];

  /* ---------- Figur (SVG) ---------- */
  const SVG = `
  <svg viewBox="0 0 140 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="70" cy="166" rx="42" ry="5" fill="rgba(0,0,0,.18)"/>
    <!-- Beine & Stiefel -->
    <g class="mm-leg-a"><rect x="46" y="140" width="20" height="22" fill="#2f5fa8"/><rect x="42" y="158" width="28" height="9" rx="4" fill="#5b3a1e"/></g>
    <g class="mm-leg-b"><rect x="74" y="140" width="20" height="22" fill="#2f5fa8"/><rect x="70" y="158" width="28" height="9" rx="4" fill="#5b3a1e"/></g>
    <!-- Oberkörper -->
    <rect x="38" y="98" width="64" height="48" rx="10" fill="#34834f" stroke="#205b36" stroke-width="2"/>
    <path d="M53 99h34l10 44H43z" fill="#76c875" stroke="#205b36" stroke-width="1.5"/>
    <path d="M56 101q14 12 28 0" fill="none" stroke="#d9f0c4" stroke-width="3"/>
    <rect x="42" y="137" width="58" height="8" rx="2" fill="#f5cf36" stroke="#a88212" stroke-width="1.5"/>
    <rect x="64" y="136" width="16" height="11" rx="2" fill="#d2a529" stroke="#79551b" stroke-width="1.5"/>
    <rect x="48" y="133" width="10" height="11" rx="2" fill="#b77a37" stroke="#70451e" stroke-width="1.5"/>
    <rect x="84" y="132" width="10" height="12" rx="2" fill="#b77a37" stroke="#70451e" stroke-width="1.5"/>
    <!-- Ruhender Arm; hebt sich nur kurz beim Sprechen -->
    <g class="mm-wave">
      <path d="M43 105 Q31 108 30 120 L34 133" fill="none" stroke="#34834f" stroke-width="14" stroke-linecap="round"/>
      <path d="M43 105 Q31 108 30 120 L34 133" fill="none" stroke="#205b36" stroke-width="17" stroke-linecap="round" opacity=".35"/>
      <path d="M43 105 Q31 108 30 120 L34 133" fill="none" stroke="#34834f" stroke-width="13" stroke-linecap="round"/>
      <ellipse cx="36" cy="137" rx="9" ry="11" fill="#f5cf36" stroke="#a88212" stroke-width="2"/>
    </g>
    <!-- Arm rechts mit Schraubenschlüssel -->
    <rect x="100" y="100" width="18" height="30" rx="8" fill="#34834f" stroke="#205b36" stroke-width="2"/>
    <circle cx="112" cy="132" r="8" fill="#f5cf36" stroke="#a88212" stroke-width="2"/>
    <rect x="109" y="116" width="6" height="24" rx="3" fill="#8e9aa5" stroke="#4d5861" stroke-width="1.5"/>
    <circle cx="112" cy="114" r="6" fill="none" stroke="#8e9aa5" stroke-width="4"/>
    <!-- Kopf -->
    <path d="M40 51q4-10 12-8l1 30-10 5-4-11zm60 0q-4-10-12-8l-1 30 10 5 4-11" fill="#38251f"/>
    <circle cx="42" cy="74" r="6" fill="#f2c29b" stroke="#a9744c" stroke-width="2"/><circle cx="98" cy="74" r="6" fill="#f2c29b" stroke="#a9744c" stroke-width="2"/>
    <circle cx="70" cy="72" r="29" fill="#f2c29b" stroke="#a9744c" stroke-width="2"/>
    <circle cx="70" cy="76" r="5" fill="#e8a982"/>
    <g class="mm-eyes">
      <ellipse cx="58" cy="68" rx="5" ry="6.5" fill="#fff" stroke="#444" stroke-width="1.2"/><ellipse cx="82" cy="68" rx="5" ry="6.5" fill="#fff" stroke="#444" stroke-width="1.2"/>
      <circle cx="59" cy="69" r="2.6" fill="#2a2a2a"/><circle cx="83" cy="69" r="2.6" fill="#2a2a2a"/>
    </g>
    <path d="M52 58 Q58 54 64 58 M76 58 Q82 54 88 58" fill="none" stroke="#5b3a1e" stroke-width="2.5" stroke-linecap="round"/>
    <path class="mm-mouth" d="M61 86 Q70 83 79 86 Q79 96 70 98 Q61 96 61 86Z" fill="#321615"/>
    <path d="M64 93 Q70 90 76 93 Q72 98 68 96Z" fill="#e97877"/>
    <!-- Rot-weiße Arbeitskappe, wie Mannys Markenzeichen -->
    <path d="M39 56 Q39 27 69 26 Q97 26 101 55 Q75 63 39 56Z" fill="#fffdf5" stroke="#9b332b" stroke-width="2.5"/>
    <path d="M42 52 Q43 31 58 28 L58 57 Q49 57 42 56Z" fill="#d8483d"/>
    <path d="M58 28 Q69 25 80 29 L80 59 Q69 57 58 57Z" fill="#fffdf5" stroke="#d8d2c5" stroke-width="1"/>
    <path d="M78 29 Q95 35 99 55 L80 59Z" fill="#d8483d"/>
    <path d="M39 54 Q70 61 101 52 Q112 52 116 58 Q96 70 47 63 Q35 61 31 58Z" fill="#d8483d" stroke="#8b2925" stroke-width="2"/>
    <path d="M52 38 Q60 32 68 33" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3" stroke-linecap="round"/>
  </svg>`;

  /* ---------- Aufbau ---------- */
  function build() {
    el = document.createElement('div');
    el.className = 'meister';
    el.innerHTML = `<div class="mm-bubble" role="status" aria-live="polite"><span class="mm-name">${NAME}</span><span class="mm-text"></span></div>
      <div class="mm-fig" aria-hidden="true">${SVG}</div>`;
    document.body.appendChild(el);
    bubble = el.querySelector('.mm-bubble');
    text = el.querySelector('.mm-text');
    bubble.addEventListener('click', hide);
  }

  function say(msg, ms) {
    if (!msg) return;
    clearTimeout(hideT);
    clearTimeout(resultT);
    clearTimeout(quakeT);
    text.textContent = msg;
    bubble.classList.remove('show');
    void bubble.offsetWidth;                 // Animation neu starten
    bubble.classList.add('show');
    el.classList.add('talk');
    hideT = setTimeout(hide, ms ?? Math.max(6000, msg.length * 75));
  }

  function hide() {
    clearTimeout(hideT);
    clearTimeout(resultT);
    clearTimeout(quakeT);
    bubble.classList.remove('show');
    el.classList.remove('talk');
  }

  /* ---------- Hooks für app.js ---------- */
  function onPage(page, sc, pct) {
    const selector = page === 7 ? '.stage.ov' : page >= 3 && page <= 6 ? '.stage:not(.ov)' : null;
    const stage = selector ? document.querySelector(selector) : null;
    if (!stage) {
      if (el) {
        hide();
        el.remove();
        el.classList.remove('in-scene', 'ov');
      }
      return;
    }
    if (!el) build();
    stage.appendChild(el);
    el.classList.add('in-scene');
    el.classList.toggle('ov', page === 7);
    hide();
    if (page === 7) {
      const r = RESULT.find(([min]) => pct >= min);
      const msg = rand(r[1]);
      clearTimeout(resultT);
      resultT = setTimeout(() => say(msg), 500);
    }
  }

  function onPick(opt) {
    const f = FACT[opt.label];
    clearTimeout(resultT);
    clearTimeout(quakeT);
    hide();
    if (f) say(f);
  }

  function onQuake() {
    clearTimeout(quakeT);
    say(rand(['Festhalten! Das wackelt gleich.', 'Und los geht’s – alle Mann an Deck!']), 3500);
    quakeT = setTimeout(() => say('Hui, das war ein Wackeln! Schau dir an, wie sich dein Haus gehalten hat.', 5000), 4200);
  }

  return { say, onPage, onPick, onQuake };
})();
