// Querschnitte als „Foto“ aus der 3D-Welt (zweite Variante zu den Zeichnungen in schnitte.js, umschaltbar im Entwicklermenü).
// Für jede Auswahl wird ein kleines Schnittstück des Bauteils aus denselben Materialien wie das Haus gebaut (Haus3D.kit):
// vorn und oben angeschnitten, damit man die Schichten und das Gerüst darin sieht. Die Kamera schaut schräg von der Seite.
// Jedes Bild wird einmal gerendert und gemerkt.
//
//   Schnitt3D.get('brickwall') → { url, marks: [[x, y], …], labels: [[text, x, y, anchor], …] }  (Koordinaten im viewBox 240 × 160)
//
// Neues Bauteil: unter `SCENES` eine Funktion mit der `id` aus daten.js ergänzen. Sie baut in Metern (Boden bei y = 0,
// Schnittfläche bei z = 0, das Stück reicht nach hinten bis z = -DEP) und gibt die Punkte für die Nummern zurück
// (gleiche Reihenfolge wie die Legende in schnitte.js).
const Schnitt3D = (() => {
  if (!window.THREE || typeof Haus3D === 'undefined' || !Haus3D.kit) return null;
  const K = Haus3D.kit, V = (x, y, z) => new THREE.Vector3(x, y, z);
  // Bildausschnitt im viewBox: breiter als 240, damit auch die breiten Buttons unten ganz gefüllt sind
  const IMG = { x: -90, w: 420, h: 160 }, PX = 4, CENTER_ASPECT = 240 / 160;
  const DEP = 1.2;
  const cache = {};
  let R = null, M_ = null, scene = null, cam = null, sun = null, root = null;

  function init() {
    const canvas = document.createElement('canvas');
    R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    R.setPixelRatio(1); R.setSize(IMG.w * PX, IMG.h * PX, false);
    R.outputEncoding = THREE.sRGBEncoding; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.0;
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    R.setClearColor(0x000000, 0);
    M_ = K.Materials();
    scene = new THREE.Scene();
    // Bedeckter Himmel wie in der Szene, etwas heller, damit die Materialien gut zu lesen sind
    const pm = new THREE.PMREMGenerator(R), env = new THREE.Scene();
    const sky = document.createElement('canvas'); sky.width = 8; sky.height = 256;
    const sg = sky.getContext('2d'), gr = sg.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#8d98a3'); gr.addColorStop(.42, '#b9bfc0'); gr.addColorStop(.52, '#a9aaa0'); gr.addColorStop(1, '#5e5a48');
    sg.fillStyle = gr; sg.fillRect(0, 0, 8, 256);
    const st = new THREE.CanvasTexture(sky); st.encoding = THREE.sRGBEncoding;
    env.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ map: st, side: THREE.BackSide })));
    scene.environment = pm.fromScene(env, .04).texture;
    scene.add(new THREE.HemisphereLight(0xaab5c0, 0x5a533f, .95));
    sun = new THREE.DirectionalLight(0xf0ebe0, 1.7);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .02;
    scene.add(sun, sun.target);
    cam = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 120);
  }

  /* ---------- Bau-Helfer ---------- */
  // Quader über Grenzen: x0..x1, y0..y1, z0..z1
  const BX = (x0, x1, y0, y1, z0, z1, mat) => K.mesh(K.boxGeo(x1 - x0, y1 - y0, z1 - z0), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  // Prisma: Umriss in der Schnittebene (x, y), nach hinten von z0 bis z1 gezogen
  function prism(pts, z0, z1, mat) {
    const s = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
    const g = new THREE.ExtrudeGeometry(s, { depth: z1 - z0, bevelEnabled: false, curveSegments: 1 });
    g.translate(0, 0, z0);
    return K.mesh(g, mat);
  }
  const cyl = (a, b, r, mat) => K.beam(a, b, r, mat);
  const sq = (a, b, r, mat) => K.beam(a, b, r, mat, true);
  // Abgewandeltes Material: Tönung (wird mit der Farbe multipliziert) und/oder dichtere Textur
  const tcache = {};
  function tint(key, base, hex, rep) {
    if (tcache[key]) return tcache[key];
    const m = base.clone();
    if (hex != null) m.color = m.color.clone().multiply(new THREE.Color(hex));
    if (rep) ['map', 'normalMap'].forEach(k => { if (m[k]) { const t = m[k].clone(); t.repeat.multiplyScalar(rep); t.needsUpdate = true; m[k] = t; } });
    return (tcache[key] = m);
  }
  // Wellblech mit echter Wellenform: o = Startecke, s = Richtung der Rillen (Länge len), a = quer dazu (Breite wid), n = Normale
  function corrugated(o, s, n, a, len, wid, amp, wl, th, mat) {
    const sign = a.dot(new THREE.Vector3().crossVectors(n, s)) < 0 ? -1 : 1;
    const N = Math.ceil(wid / wl * 14), top = [], bot = [];
    for (let i = 0; i <= N; i++) { const x = i / N * wid, y = amp * Math.sin(x / wl * Math.PI * 2); top.push(new THREE.Vector2(sign * x, y)); bot.push(new THREE.Vector2(sign * x, y - th)); }
    const shape = new THREE.Shape([...top, ...bot.reverse()]);
    const g = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false, curveSegments: 1 });
    g.applyMatrix4(new THREE.Matrix4().makeBasis(a.clone().multiplyScalar(sign), n, s));
    g.translate(o.x, o.y, o.z);
    g.computeVertexNormals();
    return K.mesh(g, mat);
  }
  // Erdreich bis weit zur Seite: Schnittfläche knapp hinter z = 0, damit Teile im Boden vorn sichtbar bleiben
  function ground(g, { depth = .9, grass = true, x0 = -10, x1 = 10, back = DEP + .5 } = {}) {
    const s = BX(x0, x1, -depth, grass ? -.035 : 0, -back, -.012, tint('soilCut', M_.soil(), 0xa8968a)); s.userData.wide = true; g.add(s);
    // Oberfläche wie der festgetretene Hof direkt am Haus in der Szene
    if (grass) { const gr = BX(x0, x1, -.035, 0, -back, -.012, tint('yard', M_.soil(), 0xe8dccb)); gr.userData.wide = true; g.add(gr); }
  }
  // Schichtlinien auf der Schnittfläche (gestampfte Erde, Lehm)
  const layerLine = (g, x0, x1, y, mat) => g.add(BX(x0, x1, y - .008, y + .008, -.002, .004, mat));

  // Dach-Gerüst (Querschnitt quer zum Haus): Sparrenpaare bei zs, Mittelpfosten, Streben, Zugbalken
  function trussPairs(g, { half, ov, pitch, yWall, mat, round = false, zs = [-.22, -DEP + .22], r = .045 }) {
    const p = Math.tan(pitch), X = half + ov, ridge = yWall + half * p, yEave = yWall - ov * p;
    const B = round ? cyl : sq;
    zs.forEach(z => {
      g.add(B([-X, yEave, z], [0, ridge, z], r, mat)); g.add(B([X, yEave, z], [0, ridge, z], r, mat));
      g.add(B([-half - .1, yWall - r, z], [half + .1, yWall - r, z], r, mat));
      g.add(B([0, yWall - r, z], [0, ridge - r, z], r * 1.1, mat));
      const k = .5, xs = half * k, ys = ridge - xs * p - r * 1.4;
      g.add(B([0, yWall + (ridge - yWall) * .25, z], [-xs, ys, z], r * .8, mat));
      g.add(B([0, yWall + (ridge - yWall) * .25, z], [xs, ys, z], r * .8, mat));
    });
    return { X, ridge, yEave, p };
  }
  // Wandstümpfe unter dem Dach
  const wallStubs = (g, half, yWall, t, mat) => { g.add(BX(-half - t / 2, -half + t / 2, 0, yWall, -DEP, 0, mat)); g.add(BX(half - t / 2, half + t / 2, 0, yWall, -DEP, 0, mat)); };

  const WALL_CAM = { az: -.32, pol: .92 };   // Wände: steiler von oben auf den waagerechten Schnitt

  /* ---------- Schnittstücke ---------- */
  const SCENES = {
    /* Fundamente */
    earth(g) {
      ground(g);
      const h = .62, wb = 1.9, wt = 1.35, dep = DEP + .6;
      g.add(prism([[-wb, 0], [wb, 0], [wt, h], [-wt, h]], -dep, 0, M_.earth()));
      const line = tint('earthLine', M_.earth(), 0x8a7258);
      [.16, .31, .46].forEach(y => { const w = wb - (wb - wt) * y / h; layerLine(g, -w + .02, w - .02, y, line); });
      g.add(BX(-wt, wt, h, h + .04, -dep, 0, tint('earthTop', M_.mud(), 0xe6d6bf)));
      return { marks: [[0, .36, 0], [-2.5, -.45, 0]], extra: [[-2.9, -.7, 0], [2.9, -.7, 0]] };
    },
    concrete(g) {
      ground(g);
      g.add(BX(-2.1, 2.1, -.13, 0, -DEP, 0, tint('chips', M_.stone(), 0xd8977a, 2.4)));
      g.add(BX(-2.0, 2.0, 0, .15, -DEP, 0, M_.concrete()));
      return { marks: [[-1.2, .075, 0], [-.2, -.065, 0], [.8, -.5, 0]], labels: [['BODENHÖHE', 2.0, .42, 0, 'end']], extra: [[-2.6, -.75, 0], [2.6, -.75, 0], [0, .5, 0]] };
    },
    brick(g) {
      ground(g, { depth: 1.45 });
      const top = .86;
      [-1, 1].forEach(s => {
        g.add(BX(s > 0 ? 1.35 : -1.6, s > 0 ? 1.6 : -1.35, -.34, top, -DEP, 0, M_.brick()));
        g.add(BX(s > 0 ? 1.2 : -1.78, s > 0 ? 1.78 : -1.2, -.5, -.34, -DEP, 0, M_.concrete()));
        g.add(BX(s > 0 ? 1.1 : -1.35, s > 0 ? 1.35 : -1.1, -1.25, top, -.3, 0, M_.concrete()));
        g.add(cyl([s * 1.225, -1.2, .006], [s * 1.225, top - .05, .006], .014, M_.rebar()));
      });
      g.add(BX(-1.35, 1.35, 0, top, -DEP, -.01, M_.earth()));
      g.add(BX(-1.66, 1.66, top, top + .09, -DEP, .005, M_.concrete()));
      return { marks: [[-1.48, .5, 0], [0, .45, 0], [-1.225, -.75, 0]], extra: [[-2.3, -1.3, 0], [2.3, -1.3, 0]] };
    },
    stilts(g) {
      ground(g);
      const xs = [-1.3, 0, 1.3], zs = [-.28, -DEP + .2], deckY = .52;
      zs.forEach(z => {
        xs.forEach(x => {
          g.add(BX(x - .16, x + .16, -.12, .14, z - .16, z + .16, M_.concrete()));
          const geo = new THREE.CylinderGeometry(.085, .085, deckY - .14, 14), uv = geo.attributes.uv;
          for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * (deckY - .14) / .55);
          g.add(K.mesh(geo, M_.bamboo(), x, .14 + (deckY - .14) / 2, z));
        });
        g.add(cyl([-1.75, deckY - .06, z], [1.75, deckY - .06, z], .065, M_.bamboo()));
      });
      g.add(BX(-1.85, 1.85, deckY, deckY + .13, -DEP - .05, .05, M_.wood()));
      return { marks: [[0, deckY + .065, .05], [-1.3, .33, -.28], [0, .0, -.12]], extra: [[-2.4, -.6, 0], [2.4, -.6, 0]] };
    },

    /* Wände: waagerecht oben angeschnitten (wie ein Grundriss), außen vorn, innen hinten. Kamera steiler von oben. */
    mud(g) {
      ground(g, { back: .85 });
      const t = .42, h = .62, L = .58;
      g.add(BX(-L, L, .16, h, -t, 0, M_.mud()));
      g.add(BX(-L, L, 0, .16, -t, 0, tint('mudWet', M_.mud(), 0x8c7a68)));
      const line = tint('mudLine', M_.mud(), 0x9a8064);
      [.3, .45].forEach(y => layerLine(g, -L + .01, L - .01, y, line));
      return { cam: WALL_CAM, marks: [[-.25, h, -t / 2], [.25, .38, 0], [-.3, .08, 0]], labels: [['AUSSEN', .9, .1, .2, 'middle'], ['INNEN', .9, h, -t - .35, 'middle']], extra: [[-.85, -.1, .3], [.85, -.1, .3], [-.85, h, -t - .4], [.85, h, -t - .4]] };
    },
    tin(g) {
      ground(g, { back: .85 });
      const h = .62, L = .58;
      // Rillen senkrecht: oben im Schnitt sieht man die Welle
      g.add(corrugated(V(-L, 0, 0), V(0, 1, 0), V(0, 0, 1), V(1, 0, 0), h, 2 * L, .03, .17, .01, M_.tin()));
      [-.32, .32].forEach(x => {
        const geo = new THREE.CylinderGeometry(.06, .06, h - .02, 14), uv = geo.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * h / .55);
        g.add(K.mesh(geo, M_.bamboo(), x, (h - .02) / 2, -.1));
      });
      [.18, .46].forEach(y => g.add(sq([-L, y, -.068], [L, y, -.068], .032, M_.woodDark())));
      return { cam: WALL_CAM, marks: [[-.1, h, .02], [.32, .4, -.1]], labels: [['AUSSEN', .9, .1, .2, 'middle'], ['INNEN', .9, h, -.55, 'middle']], extra: [[-.85, -.1, .3], [.85, -.1, .3], [-.85, h, -.6], [.85, h, -.6]] };
    },
    brickwall(g) {
      ground(g, { back: .85 });
      const h = .62, L = .58, p = .035, b = .25;
      g.add(BX(-L, L, 0, h, -p, 0, M_.plaster()));
      g.add(BX(-L, L, 0, h, -p - b, -p, M_.brick()));
      g.add(BX(-L, L, 0, h, -2 * p - b, -p - b, M_.plaster()));
      return { cam: WALL_CAM, marks: [[-.36, h, -p / 2], [0, h, -p - b / 2], [.36, h, -1.5 * p - b]], labels: [['AUSSEN', .9, .1, .2, 'middle'], ['INNEN', .9, h, -.65, 'middle']], extra: [[-.85, -.1, .3], [.85, -.1, .3], [-.85, h, -.7], [.85, h, -.7]] };
    },
    ferro(g) {
      ground(g, { back: .85 });
      const h = .46, L = .34, cut = .3, wire = tint('wire', M_.metal(), 0x8a8a8a);
      // innere Mörtelschicht ganz, äußere nur bis zur Ausschnittkante: darüber liegt das Drahtgitter frei
      g.add(BX(-L, L, 0, h, -.075, -.032, M_.ferro()));
      g.add(BX(-L, L, 0, cut, -.022, 0, M_.ferro()));
      for (let x = -L + .02; x < L; x += .04) g.add(cyl([x, 0, -.027], [x, h - .004, -.027], .0035, wire));
      for (let y = .02; y < h; y += .04) g.add(cyl([-L, y, -.027], [L, y, -.027], .0035, wire));
      return { cam: WALL_CAM, marks: [[-.18, cut * .5, 0], [.05, (cut + h) / 2, -.027], [.2, h, -.054]], labels: [['AUSSEN', .55, .06, .14, 'middle'], ['INNEN', .55, h, -.4, 'middle'], ['AUSSCHNITT VERGRÖSSERT', .62, -.12, .2, 'end']], extra: [[-.6, -.08, .2], [.6, -.08, .2], [-.6, h, -.45], [.6, h, -.45]] };
    },

    /* Dächer: Scheibe quer durchs Haus */
    tinhip(g) {
      const half = 2.1, yW = .7;
      wallStubs(g, half, yW, .2, M_.plaster());
      const T = trussPairs(g, { half, ov: .5, pitch: 24 * Math.PI / 180, yWall: yW, mat: M_.woodDark() });
      const a = Math.atan(T.p), ca = Math.cos(a), sa = Math.sin(a);
      // Latten längs auf den Sparren, darauf das Wellblech
      [.35, 1.05, 1.75, 2.45].forEach(x => [-1, 1].forEach(s => { const y = T.ridge - x * T.p + .07; g.add(sq([s * x, y, .05], [s * x, y, -DEP - .05], .03, M_.wood())); }));
      const off = .13, len = (T.X + .02) / ca;
      g.add(corrugated(V(-.02, T.ridge + off / ca, .06), V(-ca, -sa, 0), V(-sa, ca, 0), V(0, 0, -1), len, DEP + .12, .025, .16, .008, M_.tin()));
      g.add(corrugated(V(.02, T.ridge + off / ca, .06), V(ca, -sa, 0), V(sa, ca, 0), V(0, 0, -1), len, DEP + .12, .025, .16, .008, M_.tin()));
      g.add(cyl([0, T.ridge + off / ca + .02, .07], [0, T.ridge + off / ca + .02, -DEP - .07], .06, M_.metal()));
      return { marks: [[1.3, T.ridge - 1.3 * T.p + .17, 0], [-1.55, T.ridge - 1.55 * T.p - .05, -.22], [0, yW + .35, -.22]] };
    },
    concreteflat(g) {
      const half = 2.1, yW = .75, t = .34, front = -.35;
      wallStubs(g, half, yW, t, M_.brick());
      g.add(BX(-half - t / 2 - .1, half + t / 2 + .1, yW, yW + .16, -DEP, front, M_.concrete()));
      g.add(BX(-half - t / 2 - .1, half + t / 2 + .1, yW, yW + .065, front, 0, M_.concrete()));
      g.add(BX(-half - t / 2 - .1, half + t / 2 + .1, yW + .16, yW + .175, -DEP, front, M_.black()));
      for (let x = -half - .05; x <= half + .06; x += .24) g.add(cyl([x, yW + .08, front - .02], [x, yW + .08, .01], .011, M_.rebar()));
      [-.1, -.24].forEach(z => g.add(cyl([-half - .15, yW + .095, z], [half + .15, yW + .095, z], .009, M_.rebar())));
      return { marks: [[1.1, yW + .1, front], [-.6, yW + .085, -.16], [-half, yW * .5, 0]], labels: [['GEWICHT', -.6, yW + .5, 0, 'middle']] };
    },
    tilegable(g) {
      const half = 2.1, yW = .7;
      wallStubs(g, half, yW, .2, M_.plaster());
      const T = trussPairs(g, { half, ov: .5, pitch: 30 * Math.PI / 180, yWall: yW, mat: M_.woodDark() });
      const a = Math.atan(T.p), ca = Math.cos(a), sa = Math.sin(a), L = T.X / ca;
      [-1, 1].forEach(s => {
        // Dachlatten quer (längs zum First), darauf überlappende Tonziegel-Reihen
        for (let d = .18; d < L; d += .32) { const x = s * d * ca, y = T.ridge - d * sa + .075; g.add(sq([x, y, .04], [x, y, -DEP - .04], .025, M_.wood())); }
        for (let d = .05; d < L + .05; d += .3) {
          const row = BX(-.19, .19, -.018, .018, -DEP - .05, .05, M_.tile());
          row.position.set(s * (d + .15) * ca, T.ridge - (d + .15) * sa + .13, -DEP / 2);
          row.rotation.z = -s * (a + .1);
          g.add(row);
        }
      });
      g.add(cyl([0, T.ridge + .17, .08], [0, T.ridge + .17, -DEP - .08], .09, M_.terracotta()));
      return { marks: [[1.3, T.ridge - 1.3 * T.p + .2, .05], [-1.85, T.ridge - 1.85 * T.p + .07, .04], [-.75, T.ridge - .75 * T.p - .05, -.22]] };
    },
    thatch(g) {
      const half = 2.1, yW = .7;
      wallStubs(g, half, yW, .2, M_.mud());
      const T = trussPairs(g, { half, ov: .6, pitch: 40 * Math.PI / 180, yWall: yW, mat: M_.bamboo(), round: true, r: .05 });
      const a = Math.atan(T.p), ca = Math.cos(a), sa = Math.sin(a), th = .3, nb = .05;
      [-1, 1].forEach(s => {
        const n = [s * sa, ca], P = (x, y, k) => [x + n[0] * k, y + n[1] * k];
        const r0 = P(0, T.ridge, nb), r1 = P(0, T.ridge, nb + th), e0 = P(s * T.X, T.yEave, nb), e1 = P(s * T.X, T.yEave, nb + th);
        g.add(prism([r0, e0, e1, r1], -DEP - .08, .08, M_.thatch()));
      });
      const ridge = new THREE.CylinderGeometry(.22, .22, DEP + .3, 16); ridge.rotateX(Math.PI / 2);
      g.add(K.mesh(ridge, M_.thatch(), 0, T.ridge + .3, -DEP / 2));
      return { marks: [[1.25, T.ridge - 1.25 * T.p + .25, .08], [0, yW + .5, -.22]] };
    },

    /* Besonderheiten */
    platform(g) {
      ground(g, { back: 5 });
      const h = 2.0, wb = 3.4, wt = 1.9, dep = 3.4;
      g.add(prism([[-wb, 0], [wb, 0], [wt, h], [-wt, h]], -dep, 0, M_.earth()));
      const line = tint('earthLine', M_.earth(), 0x8a7258);
      [.45, .85, 1.25, 1.6].forEach(y => { const w = wb - (wb - wt) * y / h; layerLine(g, -w + .03, w - .03, y, line); });
      g.add(BX(-wt, wt, h, h + .09, -dep, 0, tint('earthTop', M_.mud(), 0xe6d6bf)));
      // kleines Haus hinten auf dem Hügel (nicht angeschnitten)
      g.add(BX(-1.2, 1.2, h + .09, h + 1.15, -2.9, -1.3, M_.plaster()));
      g.add(K.slab([[-1.45, h + 1.05, -1.1], [1.45, h + 1.05, -1.1], [1.45, h + 1.6, -2.1], [-1.45, h + 1.6, -2.1]], .04, M_.tin()));
      g.add(K.slab([[1.45, h + 1.05, -3.1], [-1.45, h + 1.05, -3.1], [-1.45, h + 1.6, -2.1], [1.45, h + 1.6, -2.1]], .04, M_.tin()));
      const w = BX(-10, 10, 0, 1.0, -5, .03, M_.water()); w.userData.wide = true; w.renderOrder = 5; g.add(w);
      return { marks: [[0, h + .045, 0], [0, 1.3, 0], [-3.9, .5, 0]], extra: [[-4.6, -.6, 0], [4.6, -.6, 0]] };
    },
    well(g) {
      ground(g, { depth: 1.5 });
      const gw = BX(-10, 10, -1.45, -1.05, -DEP - 2, -.006, tint('gw', M_.water(), 0xbfd0d8)); gw.userData.wide = true; g.add(gw);
      g.add(prism([[-1.75, 0], [1.75, 0], [1.45, .45], [-1.45, .45]], -DEP - .3, 0, M_.earth()));
      g.add(BX(-1.6, 1.6, .45, .6, -DEP - .3, 0, M_.concrete()));
      // Handpumpe: Rohr bis ins Grundwasser, Pumpenkörper, Schwengel
      g.add(cyl([-.6, -1.3, 0], [-.6, 1.0, 0], .04, M_.metal()));
      g.add(BX(-.7, -.5, .95, 1.22, -.08, .08, M_.pump()));
      g.add(cyl([-.5, 1.1, 0], [-.3, 1.05, 0], .025, M_.pump()));
      g.add(cyl([-.66, 1.2, 0], [-1.05, 1.42, 0], .022, M_.metal()));
      // Latrine aus Wellblech auf der Plattform
      g.add(BX(.45, 1.35, .6, 1.5, -1.1, -.25, M_.tin()));
      g.add(BX(.75, 1.05, .6, 1.25, -.25, -.23, M_.woodDark()));
      g.add(K.slab([[.35, 1.62, -.15], [1.45, 1.55, -.15], [1.45, 1.55, -1.2], [.35, 1.62, -1.2]], .03, M_.tin()));
      const w = BX(-10, 10, 0, .38, -DEP - 2, .03, M_.water()); w.userData.wide = true; w.renderOrder = 5; g.add(w);
      return { marks: [[-1.25, .525, 0], [-.6, -.5, 0], [.9, 1.2, -.24]], extra: [[-2.4, -1.5, 0], [2.4, -1.5, 0]] };
    },
    vetiver(g) {
      ground(g, { depth: 3.25 });
      const blade = tint('vetBlade', M_.blade(), 0xb4b088), root = tint('vetRoot', M_.sack(), 0xf4ead4);
      let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      [-1.5, -.9, -.3, .3, .9, 1.5].forEach(x => {
        for (let i = 0; i < 22; i++) {
          const ang = (rnd() - .5) * .9, hh = .75 + rnd() * .5, zb = -.25 + (rnd() - .5) * .25;
          const b = BX(-.011, .011, 0, hh, -.003, .003, blade);
          b.geometry.translate(0, hh / 2, 0); b.position.set(x + (rnd() - .5) * .14, 0, zb); b.rotation.set((rnd() - .5) * .4, rnd() * 3, ang); g.add(b);
        }
        for (let i = 0; i < 6; i++) {
          const dx = (i - 2.5) * .12, depth = 2.4 + rnd() * .55;
          let p = [x + dx * .2, -.02, .008];
          for (let k = 1; k <= 4; k++) { const q = [x + dx * (1 + k * .35) + (rnd() - .5) * .08, -depth * k / 4, .008]; g.add(cyl(p, q, .012 - k * .0018, root)); p = q; }
        }
      });
      const ink = tint('ink', M_.black(), 0x5a5048);
      g.add(cyl([2.15, 0, .02], [2.15, -3.0, .02], .01, ink)); g.add(cyl([2.05, 0, .02], [2.25, 0, .02], .01, ink)); g.add(cyl([2.05, -3.0, .02], [2.25, -3.0, .02], .01, ink));
      return { marks: [[0, .65, -.25], [0, -1.45, 0]], labels: [['3 m', 2.08, -1.45, 0, 'end']], extra: [[-2.3, -3.15, 0], [2.4, -3.15, 0], [0, 1.25, 0]] };
    },
    frame(g) {
      ground(g, { depth: .7 });
      const top = 2.2, x = 1.1, wood = M_.wood();
      [-x, x].forEach(px => {
        g.add(BX(px - .22, px + .22, -.45, .08, -.22, .22, M_.concrete()));
        g.add(BX(px - .07, px + .07, -.35, top, -.07, .07, wood));
        g.add(BX(px - .078, px + .078, -.3, .48, -.078, .078, M_.black()));
      });
      g.add(BX(-x - .3, x + .3, top, top + .14, -.08, .08, wood));
      g.add(BX(-x, x, .52, .62, -.06, .06, wood));
      g.add(sq([-x + .06, .64, .1], [x - .06, top - .03, .1], .045, wood));
      g.add(sq([x - .06, .64, -.1], [-x + .06, top - .03, -.1], .045, wood));
      return { marks: [[.2, 1.55, .12], [x, .2, .08], [-x, -.2, .22]], extra: [[-2.0, -.6, 0], [2.0, -.6, 0]] };
    },
  };

  /* ---------- Aufnahme ---------- */
  const AZ = -.44, POL = 1.2;   // schräg von vorn links, leicht erhöht
  function shoot(id) {
    if (!R) init();
    if (root) { scene.remove(root); root.traverse(o => o.geometry && o.geometry.dispose()); }
    root = new THREE.Group(); scene.add(root);
    const spec = SCENES[id](root) || {};
    root.updateMatrixWorld(true);
    const az = spec.cam ? spec.cam.az : AZ, pol = spec.cam ? spec.cam.pol : POL;
    const dir = V(Math.sin(az) * Math.sin(pol), Math.cos(pol), Math.cos(az) * Math.sin(pol));
    const up = V(0, 1, 0), right = new THREE.Vector3().crossVectors(up, dir).normalize(), camUp = new THREE.Vector3().crossVectors(dir, right);
    // Ausschnitt: alles außer dem breiten Boden/Wasser, plus Zusatzpunkte, in der Bildebene eingepasst
    const pts = [];
    root.traverse(o => {
      if (!o.isMesh || o.userData.wide) return;
      const bb = new THREE.Box3().setFromObject(o);
      for (let i = 0; i < 8; i++) pts.push(V(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z));
    });
    (spec.extra || []).forEach(p => pts.push(V(...p)));
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    pts.forEach(p => { const a = p.dot(right), b = p.dot(camUp); x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); });
    const halfH = Math.max((y1 - y0) / 2, (x1 - x0) / 2 / CENTER_ASPECT) * 1.1, aspect = IMG.w / IMG.h;
    const center = right.clone().multiplyScalar((x0 + x1) / 2).add(camUp.clone().multiplyScalar((y0 + y1) / 2));
    Object.assign(cam, { left: -halfH * aspect, right: halfH * aspect, top: halfH, bottom: -halfH });
    cam.position.copy(center).addScaledVector(dir, 40); cam.up.copy(up); cam.lookAt(center); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    // Licht von vorn links oben, Schatten auf den Ausschnitt begrenzt
    sun.position.copy(center).add(V(-5, 8, 7)); sun.target.position.copy(center);
    const sc = sun.shadow.camera, r = halfH * aspect * 1.2; Object.assign(sc, { left: -r, right: r, top: r, bottom: -r, near: .5, far: 40 }); sc.updateProjectionMatrix();
    R.shadowMap.needsUpdate = true;
    R.render(scene, cam);
    const url = R.domElement.toDataURL('image/png');
    const toBox = p => { const v = V(...p).project(cam); return [Math.round((IMG.x + (v.x + 1) / 2 * IMG.w) * 10) / 10, Math.round((1 - v.y) / 2 * IMG.h * 10) / 10]; };
    // Fehlen noch Bilder der Kit-Texturen (sie laden kurz nach dem Start), wird später neu aufgenommen
    let pending = false;
    root.traverse(o => { if (!o.isMesh) return; [].concat(o.material).forEach(m => ['map', 'normalMap'].forEach(k => { const im = m[k] && m[k].image; if (im && im.complete === false) pending = true; })); });
    return {
      url, pending,
      marks: (spec.marks || []).map(toBox),
      labels: (spec.labels || []).map(([t, x, y, z, anchor]) => [t, ...toBox([x, y, z]), anchor]),
    };
  }

  function get(id) {
    if (!SCENES[id]) return null;
    if (cache[id]) return cache[id];
    let res;
    try { res = shoot(id); } catch (e) { console.warn('Schnitt3D', id, e); return null; }
    cache[id] = res;
    if (res.pending) {
      // Neu aufnehmen, sobald die Texturen da sind, und die Bilder auf der Seite austauschen
      let tries = 0;
      const again = () => {
        const next = shoot(id); cache[id] = next;
        document.querySelectorAll(`image[data-sx3d="${id}"]`).forEach(n => n.setAttribute('href', next.url));
        if (next.pending && ++tries < 12) setTimeout(again, 250);
      };
      setTimeout(again, 200);
    }
    return cache[id];
  }

  return { get, has: id => !!SCENES[id] };
})();
