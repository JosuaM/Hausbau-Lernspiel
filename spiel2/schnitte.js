// Querschnitt-Zeichnungen der Bauteile (je Auswahl eine eigene Zeichnung, nicht das ganze Haus).
// Unten dienen sie als Icon auf den Buttons, oben werden sie mit Nummern und Legende groß gezeigt.
//
//   Schnitt.svg('brickwall')                  → saubere Zeichnung (Icon)
//   Schnitt.svg('brickwall', { marks: true }) → mit Nummern
//   Schnitt.legend('brickwall')               → Texte zu den Nummern
//
// Neue Zeichnung: unter `ICONS` eine Funktion mit der `id` aus daten.js ergänzen (Fläche 240 × 160, Boden meist bei y ≈ 100).
const Schnitt = (() => {
  // Farben wie in der 3D-Szene: erdig, leicht entsättigt, Stimmung kurz vor dem Regen. Konturen warm und weich statt schwarz.
  const INK = 'rgba(48,38,28,.72)';

  // Muster (einmal im Dokument, von allen Zeichnungen genutzt)
  const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <linearGradient id="sx-bg" gradientUnits="userSpaceOnUse" x1="0" y1="-20" x2="0" y2="170"><stop offset="0" stop-color="#7c8988"/><stop offset=".45" stop-color="#aab0a3"/><stop offset="1" stop-color="#c8c0a8"/></linearGradient>
    <linearGradient id="sx-light" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="160"><stop offset="0" stop-color="#fff4e0" stop-opacity=".16"/><stop offset=".5" stop-color="#fff4e0" stop-opacity="0"/><stop offset="1" stop-color="#1c140c" stop-opacity=".22"/></linearGradient>
    <radialGradient id="sx-vig" gradientUnits="userSpaceOnUse" cx="120" cy="74" r="150"><stop offset=".5" stop-color="#140f0a" stop-opacity="0"/><stop offset="1" stop-color="#140f0a" stop-opacity=".38"/></radialGradient>
    <filter id="sx-brush" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".035 .1" numOctaves="3" seed="7"/><feColorMatrix values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1"/></filter>
    <filter id="sx-grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="1" seed="2"/><feColorMatrix values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1"/></filter>
    <pattern id="sx-earth" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#9e7d58"/><circle cx="5" cy="6" r="1.3" fill="#82633f"/><circle cx="17" cy="4" r="1" fill="#b8986e"/><circle cx="11" cy="15" r="1.4" fill="#82633f"/><circle cx="20" cy="19" r="1.1" fill="#b8986e"/><circle cx="3" cy="20" r="1" fill="#8d6e4a"/></pattern>
    <pattern id="sx-soil" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#6c5640"/><circle cx="4" cy="5" r="1.2" fill="#54422f"/><circle cx="15" cy="9" r="1.6" fill="#8a7458"/><circle cx="9" cy="17" r="1.2" fill="#54422f"/><circle cx="19" cy="18" r="1" fill="#8a7458"/></pattern>
    <pattern id="sx-brick" width="30" height="16" patternUnits="userSpaceOnUse"><rect width="30" height="16" fill="#cbbfa6"/><rect x="1.6" y="1.6" width="27" height="6.4" rx="1" fill="#a2573c"/><rect x="-14.2" y="9.6" width="28.4" height="6.4" rx="1" fill="#97503a"/><rect x="15.8" y="9.6" width="28.4" height="6.4" rx="1" fill="#a85e40"/><path d="M2.4 2.4H28M1 10.4H14M16.6 10.4H30" stroke="#d99a72" stroke-opacity=".45" stroke-width=".9"/><path d="M2.4 7.6H28M1 15.4H14M16.6 15.4H30" stroke="#5e2f1f" stroke-opacity=".4" stroke-width=".9"/></pattern>
    <pattern id="sx-plaster" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#d9cdb2"/><circle cx="3" cy="4" r="1" fill="#c3b596"/><circle cx="13" cy="12" r="1.2" fill="#c3b596"/><circle cx="16" cy="3" r=".8" fill="#e7dcc4"/><circle cx="7" cy="16" r=".9" fill="#e7dcc4"/></pattern>
    <pattern id="sx-concrete" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#a7a49b"/><circle cx="4" cy="5" r="1" fill="#8b887f"/><circle cx="13" cy="4" r=".8" fill="#bcb9b0"/><circle cx="9" cy="13" r="1.2" fill="#8b887f"/><circle cx="16" cy="15" r=".8" fill="#bcb9b0"/></pattern>
    <pattern id="sx-chips" width="20" height="14" patternUnits="userSpaceOnUse"><rect width="20" height="14" fill="#a7a49b"/><path d="M2 3l4-1 2 3-4 2z" fill="#a65a3c"/><path d="M12 8l4-1 2 3-4 2z" fill="#b46b4b"/><path d="M9 1l3 0 1 2-3 1z" fill="#934a30"/><circle cx="5" cy="11" r=".9" fill="#8b887f"/></pattern>
    <pattern id="sx-wood" width="40" height="10" patternUnits="userSpaceOnUse"><rect width="40" height="10" fill="#9f784c"/><path d="M0 2.5Q10 1.5 20 2.5T40 2.5M0 6Q10 7 20 6T40 6M0 9Q10 8.4 20 9T40 9" stroke="#755230" stroke-width=".8" fill="none"/><path d="M0 4.2Q10 3.6 20 4.2T40 4.2" stroke="#bd9668" stroke-opacity=".5" stroke-width=".7" fill="none"/></pattern>
    <pattern id="sx-bamboo" width="10" height="26" patternUnits="userSpaceOnUse"><rect width="10" height="26" fill="#ada661"/><rect x="2" width="1.4" height="26" fill="#cbc58e" opacity=".7"/><rect x="7" width="1.6" height="26" fill="#857e3f" opacity=".5"/><path d="M0 24.5H10" stroke="#6a6529" stroke-width="1.6"/></pattern>
    <pattern id="sx-mud" width="26" height="26" patternUnits="userSpaceOnUse"><rect width="26" height="26" fill="#8a6b4d"/><path d="M3 6q5-3 9 0M14 17q5-3 10-1M2 21q4 2 8-1" stroke="#cdb27a" stroke-opacity=".8" stroke-width="1.1" fill="none"/><circle cx="19" cy="6" r="1.4" fill="#6e543c"/><circle cx="8" cy="13" r="1.2" fill="#a68a6c"/></pattern>
    <pattern id="sx-straw" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#c4a862"/><path d="M1 3l12 2M3 9l12-1M0 14l10-2" stroke="#917634" stroke-width="1"/><path d="M2 6l9 1M5 12l10 1" stroke="#dcc88c" stroke-width=".9"/></pattern>
    <pattern id="sx-clay" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#8a6a4d"/><circle cx="4" cy="5" r="1" fill="#6f5339"/><circle cx="14" cy="13" r="1.2" fill="#a38364"/></pattern>
    <pattern id="sx-tin" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#98a2a5"/><path d="M0 0v12M6 0v12" stroke="#c1c8ca" stroke-width="1.6"/><circle cx="9" cy="8" r="1.3" fill="#9a6e4c" opacity=".5"/></pattern>
    <pattern id="sx-water" width="16" height="8" patternUnits="userSpaceOnUse"><rect width="16" height="8" fill="#5f7c78" fill-opacity=".5"/><path d="M0 4q4-3 8 0t8 0" stroke="#e4e8e0" stroke-opacity=".45" stroke-width="1" fill="none"/></pattern>
  </defs></svg>`;

  /* ---------- Zeichen-Helfer ---------- */
  const n1 = v => Math.round(v * 10) / 10;
  const P = (pts, fill, stroke = INK, sw = 1.2, extra = '') => `<polygon points="${pts.map(p => p.map(n1).join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" ${extra}/>`;
  const R = (x, y, w, h, fill, stroke = INK, sw = 1.2, rx = 0, extra = '') => `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${stroke === 'none' ? 0 : sw}" ${extra}/>`;
  const L = (x1, y1, x2, y2, stroke = INK, sw = 1.2, extra = '') => `<line x1="${n1(x1)}" y1="${n1(y1)}" x2="${n1(x2)}" y2="${n1(y2)}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" ${extra}/>`;
  const D = (d, fill = 'none', stroke = INK, sw = 1.2, extra = '') => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
  const C = (cx, cy, r, fill, stroke = 'none', sw = 1) => `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  const T = (x, y, s, size = 8.5, anchor = 'start') => `<text x="${x}" y="${y}" font-size="${size}" fill="#2f2a23" text-anchor="${anchor}" font-family="-apple-system,Helvetica,Arial,sans-serif" font-weight="600" letter-spacing=".04em">${s}</text>`;

  // Wellenlinie entlang einer Strecke (für Wellblech); amp = Höhe, wl = Wellenlänge
  function wave(x1, y1, x2, y2, amp, wl) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), nx = dy / len, ny = -dx / len, n = Math.max(12, Math.round(len / 2));
    let d = '';
    for (let i = 0; i <= n; i++) {
      const t = i / n, off = amp * Math.sin(t * len / wl * 2 * Math.PI);
      d += `${i ? 'L' : 'M'}${n1(x1 + dx * t + nx * off)},${n1(y1 + dy * t + ny * off)}`;
    }
    return d;
  }
  // Strecke seitlich (nach außen) verschoben: Richtung links→rechts bzw. First→Traufe
  const shift = (x1, y1, x2, y2, d) => { const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), nx = dy / len * d, ny = -dx / len * d; return [x1 + nx, y1 + ny, x2 + nx, y2 + ny]; };
  // Ziegel: überlappende, gedrehte Plättchen entlang einer Dachseite
  function tiles(x1, y1, x2, y2, n, len, th, fill, stroke) {
    const ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    let out = '';
    for (let i = 0; i < n; i++) {
      const t = (i + .5) / n, cx = x1 + (x2 - x1) * t, cy = y1 + (y2 - y1) * t;
      out += `<rect x="${-len / 2}" y="${-th / 2}" width="${len}" height="${th}" rx="2.6" fill="${fill}" stroke="${stroke}" stroke-width=".9" transform="translate(${n1(cx)} ${n1(cy)}) rotate(${n1(ang)})"/>`;
    }
    return out;
  }
  // Grasbüschel wie in der Szene: olivgrün bis strohgelb, viele trockene Halme
  const tufts = y => { let o = ''; for (let x = -40, i = 0; x < 290; x += 7.5, i++) { const h = 3 + (i * 37 % 5), c = ['#7c7d42', '#a19a5c', '#6c6e3a', '#b3a56a'][i % 4]; o += D(`M${x},${y} q${-1 - i % 2},${-h * .6} ${-2.2 + i % 3},${-h}M${x + 1.4},${y} q1,${-h * .7} ${2 + i % 2},${-h - 1}`, 'none', c, 1.1); } return o; };
  const ground = (y, grass = true) => R(-300, y, 840, 400 - y, 'url(#sx-soil)', 'none') + (grass ? R(-300, y - 3, 840, 4, '#83824a', 'none') + tufts(y) : '') + L(-300, y, 540, y, INK, 1);
  const mark = (x, y, n) => `<g class="mk"><circle cx="${x}" cy="${y}" r="7.6" fill="#2a2119" stroke="#f4ead8" stroke-width="1.3"/><text x="${x}" y="${y + 3.1}" font-size="9" font-weight="700" fill="#fff" text-anchor="middle" font-family="-apple-system,Helvetica,Arial,sans-serif">${n}</text></g>`;

  /* ---------- Fundamente (senkrechter Schnitt) ---------- */
  const foundation = {
    earth: {
      draw: () => ground(104) +
        P([[34, 104], [206, 104], [170, 48], [70, 48]], 'url(#sx-earth)') +
        [62, 76, 90].map(y => { const k = (104 - y) / 56 * 36, xl = 34 + k, xr = 206 - k; return D(`M${xl},${y} Q${(xl + xr) / 2},${y + 3.5} ${xr},${y}`, 'none', '#6a4f33', 1.1, 'opacity=".6"'); }).join('') +
        R(70, 48, 100, 4.5, '#cdb085', 'none'),
      marks: [[120, 69], [46, 132]],
      legend: ['Erde, Schicht für Schicht festgestampft (45 bis 75 cm hoch)', 'Gewachsener Boden aus sandigem Lehm'],
    },
    concrete: {
      draw: () => ground(108, false) +
        R(-300, 92, 840, 16, 'url(#sx-chips)', INK, 1) +
        R(14, 78, 212, 14, 'url(#sx-concrete)', INK, 1.2) +
        L(14, 78, 226, 78, INK, 1.6) +
        T(18, 70, 'BODENHÖHE'),
      marks: [[60, 85], [60, 100], [60, 134]],
      legend: ['Betonplatte, 10 bis 15 cm dick', 'Ziegelsplitt als Unterlage', 'Verdichteter Boden'],
    },
    brick: {
      draw: () => ground(96) +
        R(68, 44, 104, 52, 'url(#sx-earth)', 'none') +
        R(46, 112, 32, 10, 'url(#sx-concrete)', INK, 1) + R(162, 112, 32, 10, 'url(#sx-concrete)', INK, 1) +
        R(50, 40, 18, 74, 'url(#sx-brick)', INK, 1.2) + R(172, 40, 18, 74, 'url(#sx-brick)', INK, 1.2) +
        R(68, 44, 14, 108, 'url(#sx-concrete)', INK, 1.2) + R(158, 44, 14, 108, 'url(#sx-concrete)', INK, 1.2) +
        L(75, 50, 75, 148, INK, 1, 'stroke-dasharray="3 3"') + L(165, 50, 165, 148, INK, 1, 'stroke-dasharray="3 3"') +
        R(46, 33, 148, 7, 'url(#sx-concrete)', INK, 1.2),
      marks: [[59, 74], [120, 70], [75, 134]],
      legend: ['Ziegelwand, etwa 90 cm hoch', 'Füllung aus Erde von vor Ort', 'Betonpfeiler, tief im Boden verankert'],
    },
    stilts: {
      draw: () => ground(108) +
        [[66, 'a'], [120, 'b'], [174, 'c']].map(([x]) => R(x - 12, 102, 24, 24, 'url(#sx-concrete)', INK, 1.2) + R(x - 4, 60, 8, 44, 'url(#sx-bamboo)', INK, 1.1)).join('') +
        R(34, 44, 172, 16, 'url(#sx-wood)', INK, 1.2) +
        [64, 94, 124, 154, 184].map(x => L(x, 44, x, 60, '#7a5430', .9)).join(''),
      marks: [[120, 52], [66, 82], [66, 116]],
      legend: ['Plattform aus Koroi-Holz', 'Bambusstelzen, etwa 60 cm hoch', 'Betonfuß im Boden'],
    },
  };

  /* ---------- Wände ---------- */
  const wall = {
    mud: {
      draw: () => ground(120) +
        P([[84, 120], [84, 30], [92, 22], [150, 20], [158, 28], [158, 120]], 'url(#sx-mud)', INK, 1.2) +
        [40, 60, 80, 100].map(y => D(`M84,${y} Q121,${y + 4} 158,${y}`, 'none', '#6b523a', 1.1, 'opacity=".7"')).join('') +
        R(84, 102, 74, 18, '#5b4630', 'none', 0, 0, 'opacity=".28"') +
        D('M94 108v8M110 106v10M128 109v7M146 107v9', 'none', '#4b6764', 1.4, 'opacity=".55"'),
      marks: [[121, 50], [121, 80], [121, 112]],
      legend: ['Lehm, mit Stroh vermischt', 'Schicht für Schicht aufgetragen und verdichtet', 'Wandfuß: saugt Wasser auf und weicht auf'],
    },
    tin: {
      draw: () => R(0, 0, 240, 160, 'none', 'none') + T(12, 38, 'AUSSEN') + T(12, 138, 'INNEN') +
        [64, 120, 176].map(x => C(x, 104, 11, 'url(#sx-bamboo)', INK, 1.2) + C(x, 104, 5, '#938c45', INK, .8)).join('') +
        D(wave(10, 80, 230, 80, 6.5, 26), 'none', INK, 6.5) + D(wave(10, 80, 230, 80, 6.5, 26), 'none', '#b3bcbf', 4.4) +
        [64, 120, 176].map(x => C(x, 90, 1.6, INK)).join(''),
      marks: [[92, 62], [120, 122]],
      legend: ['Wellblech, verzinkt', 'Rahmen aus Holz oder Bambus'],
    },
    brickwall: {
      draw: () => T(12, 34, 'AUSSEN') + T(12, 136, 'INNEN') +
        R(14, 42, 212, 11, 'url(#sx-plaster)', INK, 1.1) +
        R(14, 53, 212, 54, 'url(#sx-brick)', INK, 1.2) +
        R(14, 107, 212, 11, 'url(#sx-plaster)', INK, 1.1),
      marks: [[120, 47.5], [120, 80], [120, 112.5]],
      legend: ['Zementputz außen', 'Gebrannte Ziegel mit Zementmörtel', 'Zementputz innen'],
    },
    ferro: {
      draw: () => T(12, 50, 'AUSSEN') + T(12, 120, 'INNEN') +
        R(14, 62, 212, 38, 'url(#sx-concrete)', INK, 1.3) +
        [68, 76, 84, 92].map(y => Array.from({ length: 20 }, (_, i) => C(24 + i * 10.4, y, 1.7, '#3a3530')).join('') + L(14, y, 226, y, '#3a3530', .5, 'opacity=".35"')).join('') +
        [44, 110, 176].map(x => C(x, 80, 3.4, '#7a4a2a', INK, .9)).join('') +
        T(226, 136, 'AUSSCHNITT VERGRÖSSERT', 7.5, 'end'),
      marks: [[200, 66], [130, 76], [44, 91]],
      legend: ['Zement-Sand-Mörtel in mehreren Schichten', 'Engmaschiges Drahtgitter in mehreren Lagen', 'Dünne Wand von nur wenigen Zentimetern'],
    },
  };

  /* ---------- Dächer (Schnitt quer zum Haus) ---------- */
  const eaves = '#efe9dd';
  const roof = {
    tinhip: {
      draw: () => {
        const l = shift(24, 116, 120, 48, 6), r = shift(120, 48, 216, 116, 6);
        return R(20, 118, 24, 40, 'url(#sx-plaster)', INK, 1.1) + R(196, 118, 24, 40, 'url(#sx-plaster)', INK, 1.1) +
          R(18, 112, 204, 7, 'url(#sx-wood)', INK, 1.1) +
          L(120, 50, 120, 112, '#8a5f34', 4.4) + L(120, 66, 80, 98, '#8a5f34', 2.8) + L(120, 66, 160, 98, '#8a5f34', 2.8) +
          L(24, 116, 120, 48, '#8a5f34', 5.4) + L(120, 48, 216, 116, '#8a5f34', 5.4) +
          D(wave(l[0], l[1], l[2], l[3], 3.2, 15), 'none', INK, 5) + D(wave(l[0], l[1], l[2], l[3], 3.2, 15), 'none', '#b6bec0', 3.2) +
          D(wave(r[0], r[1], r[2], r[3], 3.2, 15), 'none', INK, 5) + D(wave(r[0], r[1], r[2], r[3], 3.2, 15), 'none', '#b6bec0', 3.2) +
          D(`M112,${46} Q120,${36} 128,${46}`, '#9aa3a6', INK, 1.3);
      },
      marks: [[168, 66], [70, 90], [120, 104]],
      legend: ['Wellblech, verzinkt', 'Sparren und Latten aus Holz oder Bambus', 'Mittelpfosten trägt den First'],
    },
    concreteflat: {
      draw: () => R(14, 88, 38, 70, 'url(#sx-brick)', INK, 1.2) + R(188, 88, 38, 70, 'url(#sx-brick)', INK, 1.2) +
        R(14, 62, 212, 4, '#3d4248', 'none') +
        R(14, 66, 212, 22, 'url(#sx-concrete)', INK, 1.3) +
        Array.from({ length: 17 }, (_, i) => C(22 + i * 12.5, 79, 2.1, '#3a3530')).join('') + L(14, 79, 226, 79, '#3a3530', .6, 'opacity=".4"') +
        D('M120 30v22M114 44l6 8 6-8', 'none', '#4f4a42', 1.6, 'opacity=".7"') + T(132, 44, 'GEWICHT', 7.5),
      marks: [[120, 72], [96, 85], [33, 120]],
      legend: ['Stahlbetondecke, 10 bis 12 cm dick', 'Bewehrungsstahl im Beton', 'Trägt nur auf stabilem Mauerwerk'],
    },
    tilegable: {
      draw: () => {
        const l = shift(26, 118, 120, 44, 7), r = shift(120, 44, 214, 118, 7);
        return R(22, 120, 22, 40, 'url(#sx-plaster)', INK, 1.1) + R(196, 120, 22, 40, 'url(#sx-plaster)', INK, 1.1) +
          R(20, 114, 200, 7, 'url(#sx-wood)', INK, 1.1) +
          L(120, 46, 120, 114, '#8a5f34', 4.6) + L(120, 70, 78, 104, '#8a5f34', 3) + L(120, 70, 162, 104, '#8a5f34', 3) +
          L(26, 118, 120, 44, '#8a5f34', 5.2) + L(120, 44, 214, 118, '#8a5f34', 5.2) +
          tiles(l[0], l[1], l[2], l[3], 9, 24, 7.5, '#ad5e3f', '#6e3420') + tiles(r[0], r[1], r[2], r[3], 9, 24, 7.5, '#ad5e3f', '#6e3420') +
          D('M110,38 Q120,26 130,38 Z', '#9d4f32', '#6e3420', 1.2);
      },
      marks: [[168, 64], [62, 98], [120, 96]],
      legend: ['Tonziegel, überlappend verlegt', 'Dachlatten tragen jeden Ziegel', 'Holzgerüst: muss das schwere Dach tragen'],
    },
    thatch: {
      draw: () => {
        const l = shift(34, 120, 120, 34, 0), r = shift(120, 34, 206, 120, 0);
        const band = (a, b, sgn) => {
          const [x1, y1, x2, y2] = a, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), nx = dy / len * 22, ny = -dx / len * 22;
          let s = P([[x1, y1], [x2, y2], [x2 + nx, y2 + ny], [x1 + nx, y1 + ny]], 'url(#sx-straw)', INK, 1.2);
          for (let i = 1; i < 13; i++) { const t = i / 13; s += L(x1 + dx * t, y1 + dy * t, x1 + dx * t + nx, y1 + dy * t + ny, '#8d6f2c', .9, 'opacity=".7"'); }
          return s;
        };
        return R(30, 120, 20, 40, 'url(#sx-plaster)', INK, 1.1) + R(190, 120, 20, 40, 'url(#sx-plaster)', INK, 1.1) +
          L(34, 120, 120, 34, '#a29a52', 4.2) + L(120, 34, 206, 120, '#a29a52', 4.2) +
          L(120, 38, 120, 118, '#a29a52', 3.6) + L(52, 102, 188, 102, '#a29a52', 3) + L(78, 76, 162, 76, '#a29a52', 3) +
          band(l) + band(r) +
          `<ellipse cx="120" cy="22" rx="13" ry="9" fill="url(#sx-straw)" stroke="${INK}" stroke-width="1.2"/>`;
      },
      marks: [[172, 66], [120, 96]],
      legend: ['Gebündeltes Stroh oder Gras', 'Gerüst aus Bambus'],
    },
  };

  /* ---------- Besonderheiten ---------- */
  const extra = {
    platform: {
      draw: () => ground(118) +
        P([[14, 118], [226, 118], [174, 44], [66, 44]], 'url(#sx-earth)') +
        [60, 76, 92, 106].map(y => { const k = (118 - y) / 74 * 52, xl = 14 + k, xr = 226 - k; return D(`M${xl},${y} Q${(xl + xr) / 2},${y + 3.5} ${xr},${y}`, 'none', '#6a4f33', 1, 'opacity=".55"'); }).join('') +
        R(66, 44, 108, 6, 'url(#sx-clay)', INK, 1) +
        P([[84, 44], [84, 26], [120, 12], [156, 26], [156, 44]], 'none', '#4f4a42', 1.4, 'stroke-dasharray="4 3"') +
        R(-300, 82, 840, 36, 'url(#sx-water)', 'none') + L(-300, 82, 540, 82, '#4b6764', 1.3, 'stroke-dasharray="5 3"'),
      marks: [[120, 47], [120, 66], [28, 90]],
      legend: ['Lehmabdeckung oben', 'Aufgeschüttete Erde, 1,8 bis 2,1 m hoch', 'Flutstand 1 m: Das Haus bleibt trocken'],
    },
    well: {
      draw: () => ground(114) +
        P([[28, 114], [212, 114], [192, 84], [48, 84]], 'url(#sx-earth)') +
        R(-300, 134, 840, 28, 'url(#sx-water)', 'none') +
        R(36, 72, 168, 13, 'url(#sx-concrete)', INK, 1.3) +
        R(83, 52, 7, 100, '#5f625f', INK, 1) + R(83, 136, 7, 14, 'url(#sx-water)', '#4b6764', 1) +
        R(76, 38, 22, 14, '#4a6470', INK, 1.1, 2) + D('M98 42L118 32', 'none', INK, 3) + D('M76 46L64 50', 'none', INK, 2.6) +
        R(138, 36, 50, 36, 'url(#sx-tin)', INK, 1.2) + L(134, 36, 192, 32, INK, 2.6) + R(156, 46, 14, 26, '#6f7472', INK, 1) +
        R(-300, 90, 840, 24, 'url(#sx-water)', 'none') + L(-300, 90, 540, 90, '#4b6764', 1.3, 'stroke-dasharray="5 3"'),
      marks: [[60, 79], [87, 100], [163, 54]],
      legend: ['Betonplattform liegt über dem Flutstand', 'Handpumpe mit Rohr bis ins Grundwasser', 'Latrine auf der Plattform'],
    },
    vetiver: {
      draw: () => ground(72, false) + D('M-300,72H540', 'none', INK, 1) +
        [50, 76, 102, 128, 154, 180].map((x, k) => {
          let s = '';
          for (let i = 0; i < 7; i++) { const dx = (i - 3) * 3.4; s += D(`M${x + dx * .4},72 Q${x + dx * 1.2},${54 - (i % 3) * 3} ${x + dx * 2.2},${38 + Math.abs(i - 3) * 3}`, 'none', i % 2 ? '#6b743a' : '#8e9150', 1.8); }
          for (let i = 0; i < 6; i++) { const dx = (i - 2.5) * 6, depth = 138 + ((i + k) % 3) * 8; s += D(`M${x},72 C${x + dx * .6},92 ${x + dx * 1.6},112 ${x + dx * (1 + (i % 2) * .5)},${depth}`, 'none', '#ecdcb6', 1.2, 'opacity=".9"'); }
          return s;
        }).join('') +
        L(222, 72, 222, 156, INK, 1.1) + L(217, 72, 227, 72, INK, 1.1) + L(217, 156, 227, 156, INK, 1.1) + T(218, 118, '3 m', 8.5, 'end'),
      marks: [[115, 52], [115, 112]],
      legend: ['Hecke aus Vetivergras', 'Wurzeln reichen bis etwa 3 m tief und halten den Boden fest'],
    },
    frame: {
      draw: () => ground(112) +
        [71, 169].map(x => R(x - 15, 112, 30, 28, 'url(#sx-concrete)', INK, 1.2) + R(x - 5, 26, 10, 114, 'url(#sx-wood)', INK, 1.1) + R(x - 5, 84, 10, 28, '#2c2620', INK, 1)).join('') +
        L(76, 36, 164, 102, '#8a5f34', 5.2) + L(164, 36, 76, 102, '#8a5f34', 5.2) +
        R(60, 20, 120, 11, 'url(#sx-wood)', INK, 1.2) + R(66, 100, 108, 7, 'url(#sx-wood)', INK, 1.1),
      marks: [[120, 68], [71, 98], [71, 130]],
      legend: ['Kreuzverstrebung hält das Gerüst steif', 'Pfosten mit Bitumenanstrich gegen Fäulnis', 'Betonfuß: Der Pfosten hält länger'],
    },
  };

  const ICONS = { ...foundation, ...wall, ...roof, ...extra };

  // Abschluss wie in der 3D-Szene: Pinselstruktur, feines Korn, Licht von oben und ein weicher dunkler Rand.
  const FINISH = '<rect x="-300" y="-240" width="840" height="640" filter="url(#sx-brush)" opacity=".3" style="mix-blend-mode:soft-light"/>' +
    '<rect x="-300" y="-240" width="840" height="640" filter="url(#sx-grain)" opacity=".14" style="mix-blend-mode:overlay"/>' +
    '<rect x="-300" y="-240" width="840" height="640" fill="url(#sx-light)"/><rect x="-300" y="-240" width="840" height="640" fill="url(#sx-vig)"/>';

  // Der Anfang der Zeichnung hat einen eigenen Hintergrund, damit sie als Icon auf jedem Untergrund gleich aussieht.
  // Variante „3D-Schnitt“ (Entwicklermenü, data-schnitt="3d" am <html>): Foto eines angeschnittenen 3D-Bauteils aus schnitt3d.js
  const shot = id => (document.documentElement.dataset.schnitt === '3d' && typeof Schnitt3D !== 'undefined' && Schnitt3D ? Schnitt3D.get(id) : null);
  const FINISH3D = '<rect x="-300" y="-240" width="840" height="640" fill="url(#sx-light)" opacity=".7"/><rect x="-300" y="-240" width="840" height="640" fill="url(#sx-vig)" opacity=".8"/>';
  const label3d = ([t, x, y, anchor]) => `<text x="${x}" y="${y}" font-size="8" fill="#f4efe6" text-anchor="${anchor}" font-family="-apple-system,Helvetica,Arial,sans-serif" font-weight="700" letter-spacing=".06em" style="paint-order:stroke" stroke="rgba(30,24,18,.55)" stroke-width="2.4">${t}</text>`;

  function svg(id, { marks = false } = {}) {
    const icon = ICONS[id];
    if (!icon) return '';
    const s3 = shot(id);
    if (s3) {
      const mk3 = marks ? s3.marks.map(([x, y], i) => mark(x, y, i + 1)).join('') : '';
      return `<svg class="sx sx3d" viewBox="0 0 240 160" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true"><rect x="-300" y="-240" width="840" height="640" fill="url(#sx-bg)"/><image data-sx3d="${id}" href="${s3.url}" x="-90" y="0" width="420" height="160" preserveAspectRatio="none"/>${FINISH3D}${s3.labels.map(label3d).join('')}${mk3}</svg>`;
    }
    const mk = marks ? icon.marks.map(([x, y], i) => mark(x, y, i + 1)).join('') : '';
    return `<svg class="sx" viewBox="0 0 240 160" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true"><rect x="-300" y="-240" width="840" height="640" fill="url(#sx-bg)"/>${icon.draw()}${FINISH}${mk}</svg>`;
  }
  const legend = id => (ICONS[id] ? ICONS[id].legend : []);
  const has = id => !!ICONS[id];
  const marksOf = id => { const s3 = shot(id); return s3 ? s3.marks : (ICONS[id] ? ICONS[id].marks : []); };

  if (document.body) document.body.insertAdjacentHTML('afterbegin', DEFS);
  return { svg, legend, has, marks: marksOf };
})();
