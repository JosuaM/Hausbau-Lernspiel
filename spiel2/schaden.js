// Schäden am eigenen Haus durch Hochwasser, Wellen und Sturm (Version 2).
//
// Wird von haus3d.js in create() angelegt: window.HausSchaden(ctx) → { prepare, begin, reset, step, info, summary }
//
// Grundlage (Werte gerundet, für ein Haus von 6 × 4,2 m mit 2,4 m Wandhöhe und 1 m Flut):
//  - Lehm (ungebrannt, nicht stabilisiert): verliert durchnässt 70 bis 90 % seiner Druckfestigkeit. Steht Wasser einige
//    Stunden an der Wand, weicht der Wandfuß auf, wird ausgewaschen, und die Wand darüber sackt ab und stürzt ein.
//    Kapillar zieht das Wasser 30 bis 60 cm über den Wasserstand. In Bangladesch stürzen Lehmhäuser (kutcha) bei
//    Überschwemmungen am häufigsten ein.
//  - Gestampfter Erdsockel: wird von Strömung und Wellen ausgespült, vor allem an Ecken und an der Wasserlinie (Kerbe),
//    das Material darüber rutscht nach. Vetivergras (Wurzeln bis 3 m) bremst das deutlich.
//  - Wellblech: wasserdicht, behält die Form, wird aber von Treibgut und Wellen eingedellt. Im Sturm reißen Bleche an
//    den Ecken der windabgewandten Seiten (hoher Sog) zuerst los. Lange Nässe: Rost an Unterkante und Nägeln.
//  - Gebrannter Ziegel mit Zementmörtel: behält im Wasser die Form. Lange Flut schwächt die unteren Fugen, der Putz platzt
//    ab, über dem Wasserrand blühen Salze aus. Gibt das Fundament nach (Erdsockel), reißt die Wand von den Fensterecken
//    aus schräg auf, eine Hausecke kann wegbrechen.
//  - Ferrozement: fast wasserdicht und rissfest, nur ein Schlammrand bleibt.
//  - Gras-/Strohdach: im Sturm (Böen 25 bis 35 m/s, Staudruck bis etwa 0,7 kN/m²) reißt der Sog an Traufe, Ortgang und
//    First die Bündel heraus. Nass wiegt Stroh das Drei- bis Vierfache und hängt zwischen den Sparren durch.
//  - Tonziegel (≈ 40 kg/m², also ≈ 0,4 kN/m²): der Sog an den Rändern ist größer als das Gewicht, einzelne Ziegel fliegen.
//    Das Gewicht drückt auf aufgeweichte Wände; gibt eine Wand nach, kippt der Dachabschnitt darüber nach innen.
//  - Beton-Flachdach (≈ 300 kg/m²): auf Mauerwerk sicher, auf Lehm oder Blech drückt es die Wände ein.
//  - Pfahlbau: Treibgut knickt einzelne Bambuspfähle, die Plattform neigt sich.
//
// Die Zeitachse ist gerafft: eine Sekunde Flut am Haus zählt als H_PER_S Stunden (Wasser steht in Sirajganj oft
// tagelang). So passieren die großen Schäden während der Simulation; auf der Ergebnisseite ist alles im Endzustand.

window.HausSchaden = function HausSchaden(ctx) {
  const { THREE, M_, site, houseG, foundG, platformG, getCfg, FLOOD_H, W, D, H, PLATFORM_H, SITE_W, SITE_D, liftOf, worldHeight, sstep, STORM, WET, windAt, levelAt, flowAt, lite } = ctx;
  const V3 = THREE.Vector3, G = 9.81, H_PER_S = 2.4;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const rng = seed => { let s = (seed >>> 0) % 2147483646 + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
  const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const hash2 = (x, y) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };
  const ease = k => k * k * (3 - 2 * k);

  const debrisG = new THREE.Group(); debrisG.name = 'schaden'; debrisG.userData.flut = true; site.add(debrisG);

  /* ================= 1) Nässe, Schlammrand und Alterung auf allen Bauteilen ================= */
  // Jedes Material des Hauses bekommt eine Kopie mit Shader-Zusatz: unter dem höchsten Wasserstand dunkel, schlammig und
  // glänzend, an der Linie ein brauner Rand, darüber kapillar hochgezogene Feuchte. Mit der Zeit (uAge): Rost auf Blech,
  // Salzausblühungen auf Ziegel und Putz, Algen und Fäule auf Holz, Bambus und Stroh, ausgewaschene Rinnen im Lehm.
  const U = { uFloodY: { value: -99 }, uTideY: { value: -99 }, uWetK: { value: 0 }, uAge: { value: 0 }, uSoak: WET || { value: 0 } };
  // [Art, kapillare Steighöhe in m]: 1 Lehm/Erde, 2 mineralisch, 3 Metall, 4 organisch
  const KIND = {
    mud: [1, .5], earth: [1, .4], moundSide: [1, .4], soil: [1, .35],
    plaster: [2, .3], trim: [2, .3], brick: [2, .35], concrete: [2, .16], cement: [2, .14], stone: [2, .2], uneven: [2, .2], ferro: [2, .05],
    terracotta: [2, .2], tile: [2, .2], black: [2, .1], plasterBlob: [2, .3],
    tin: [3, 0], metal: [3, 0], rebar: [3, 0], pump: [3, 0],
    wood: [4, .22], woodDark: [4, .22], door: [4, .25], shutter: [4, .2], bamboo: [4, .12], thatch: [4, .35], weave: [4, .3], blade: [4, .1],
  };
  const NOISE = `
    float dmH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float dmN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(dmH(i), dmH(i + vec2(1, 0)), f.x), mix(dmH(i + vec2(0, 1)), dmH(i + vec2(1, 1)), f.x), f.y); }`;
  const KIND_GLSL = {
    1: `float runnel = smoothstep(0.62, 0.86, dmN(vec2(s * 13.0, vDmW.y * 0.9 + n1 * 2.0)));
        float pit = smoothstep(0.68, 0.95, n3) * sub;
        diffuseColor.rgb *= 1.0 - (runnel * 0.3 * capA + pit * 0.3 + sub * runnel * 0.2) * uWetK;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.5, 0.4, 0.29), sub * uAge * 0.25 * n2 * uWetK);`,
    2: `float bloom = smoothstep(0.55, 0.85, n1 * 0.5 + n2 * 0.5) * smoothstep(0.35, 0.75, n3);
        float salt = bloom * clamp(capA * 1.4, 0.0, 1.0) * smoothstep(tide + 0.02, tide + 0.07, vDmW.y) * uAge;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.8, 0.79, 0.74), salt * 0.45 * uWetK);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.25, 0.28, 0.18), sub * uAge * 0.2 * smoothstep(0.45, 0.8, n2) * uWetK);`,
    3: `float rn = n1 * 0.45 + n2 * 0.3 + n3 * 0.25;
        dmRust = clamp((sub * smoothstep(0.42, 0.78, rn) * (0.5 + 0.5 * smoothstep(tide - 0.5, tide, vDmW.y)) + band * 0.6) * uAge, 0.0, 1.0) * uWetK;
        float streak = smoothstep(0.72, 0.92, dmN(vec2(s * 24.0, vDmW.y * 0.6))) * (1.0 - sub) * smoothstep(tide + 0.5, tide, vDmW.y) * uAge;
        dmRust = max(dmRust, streak * 0.5 * uWetK);
        diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.3, 0.15, 0.07), vec3(0.45, 0.24, 0.1), n3) * 0.85, dmRust * 0.75);`,
    4: `diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.22, 0.12) * (0.8 + 0.4 * n2), sub * uWetK * (0.2 + 0.35 * uAge) * smoothstep(0.3, 0.7, n1));
        diffuseColor.rgb *= 1.0 - sub * 0.15 * uWetK;`,
  };
  function inject(sh, kind, cap) {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vDmW;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      vec4 dmP = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        dmP = instanceMatrix * dmP;
      #endif
      vDmW = (modelMatrix * dmP).xyz;`);
    sh.fragmentShader = `uniform float uFloodY, uTideY, uWetK, uAge, uSoak;\nvarying vec3 vDmW;\n${NOISE}\n` + sh.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
        float dmWet = 0.0, dmNow = 0.0, dmRust = 0.0;
        diffuseColor.rgb *= 1.0 - 0.14 * uSoak;      // Regen: alles nass und etwas dunkler
        if (uWetK > 0.001) {
          float s = vDmW.x * 0.83 + vDmW.z * 1.17;
          float n1 = dmN(vec2(s * 2.1, vDmW.y * 1.4)), n2 = dmN(vec2(s * 8.7, vDmW.y * 6.3)), n3 = dmN(vec2(s * 31.0, vDmW.y * 23.0));
          float tide = uTideY + (n1 - 0.5) * 0.06 + (n2 - 0.5) * 0.02;
          float sub = 1.0 - smoothstep(tide - 0.008, tide + 0.008, vDmW.y);
          dmNow = (1.0 - smoothstep(uFloodY - 0.02, uFloodY + 0.04, vDmW.y)) * uWetK;
          float capT = ${cap.toFixed(3)} * (0.5 + 0.9 * n1);
          float capA = (1.0 - smoothstep(tide, tide + max(capT, 0.001), vDmW.y)) * (1.0 - sub);
          dmWet = max(sub, capA * 0.8) * uWetK;
          vec3 mudC = vec3(0.34, 0.27, 0.19) * (0.8 + 0.4 * n2);
          diffuseColor.rgb *= 1.0 - 0.4 * dmWet;
          diffuseColor.rgb = mix(diffuseColor.rgb, mudC, sub * uWetK * (0.22 + 0.25 * uAge) * (0.6 + 0.6 * n3));
          float band = exp(-pow((vDmW.y - tide) / 0.028, 2.0)) + 0.45 * exp(-pow((vDmW.y - tide + 0.11 + 0.04 * n1) / 0.02, 2.0)) * uAge;
          diffuseColor.rgb = mix(diffuseColor.rgb, mudC * 0.5, clamp(band, 0.0, 1.0) * 0.75 * uWetK);
          // Schlammfilm, der beim Ablaufen in Schlieren nach unten gezogen wurde
          float drip = smoothstep(0.6, 0.9, dmN(vec2(s * 19.0, vDmW.y * 0.7))) * sub * smoothstep(tide - 0.5, tide - 0.02, vDmW.y);
          diffuseColor.rgb = mix(diffuseColor.rgb, mudC * 0.6, drip * 0.4 * uWetK);
          ${KIND_GLSL[kind] || ''}
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.42, uSoak * 0.4);
        roughnessFactor = mix(roughnessFactor, 0.3, clamp(dmNow * 0.85 + dmWet * 0.25, 0.0, 0.9));
        roughnessFactor = mix(roughnessFactor, 0.95, dmRust);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor *= 1.0 - dmRust * 0.85;`);
  }
  const patched = new Map();
  function patchMat(m) {
    if (Array.isArray(m)) return m.map(patchMat);
    if (!m || !m.isMeshStandardMaterial || (m.userData && m.userData.dmg)) return m;
    if (patched.has(m)) return patched.get(m);
    const kc = KIND[m.name] || (m.transparent && m.map ? [2, .3] : null);   // Abziehbilder (Bemalung) wie Putz
    if (!kc) { patched.set(m, m); return m; }
    const c = m.clone(); c.userData = { dmg: true, kind: kc[0] };
    const prev = m.onBeforeCompile, key = m.customProgramCacheKey();
    c.onBeforeCompile = (sh, r) => { prev.call(c, sh, r); inject(sh, kc[0], kc[1]); };
    c.customProgramCacheKey = () => key + `|dmg${kc[0]}_${kc[1]}`;
    patched.set(m, c);
    return c;
  }
  function prepare() {
    [platformG, foundG, houseG, ctx.extraG].forEach(g => g && g.traverse(o => { if (o.isMesh && !o.userData.own) o.material = patchMat(o.material); }));
  }

  /* ================= 2) Bewertung: was hält, was nicht ================= */
  function assess(cfg) {
    const fnd = cfg.foundation, wall = cfg.wall, roof = cfg.roof, extra = cfg.extra;
    const platform = extra === 'platform', baseY = platform ? PLATFORM_H : 0, floorY = baseY + (fnd ? liftOf(fnd) : 0);
    const dIn = Math.max(0, FLOOD_H - floorY), dFnd = Math.max(0, FLOOD_H - baseY), wet = dIn > .03, fWet = dFnd > .05;
    const vet = extra === 'vetiver', frame = extra === 'frame';
    const found = !fnd || !fWet ? 0 : fnd === 'earth' ? (vet ? .34 : .9) : fnd === 'concrete' ? .08 : fnd === 'brick' ? .18 : (frame ? .3 : .56);
    const heavy = roof === 'concreteflat' ? 1 : roof === 'tilegable' ? .45 : 0;
    const weakWall = wall === 'mud' || wall === 'tin';
    const settle = fnd === 'earth' ? found : 0;
    let wallT = 0;
    if (wall === 'mud') wallT = (wet ? .55 + .5 * dIn : .07) + settle * .25 + heavy * .12;
    else if (wall === 'tin') wallT = wet ? .3 + .25 * dIn : .16;
    else if (wall === 'brickwall') wallT = (wet ? .18 + .25 * dIn : .03) + settle * .55;
    else if (wall === 'ferro') wallT = .04 + .06 * dIn + settle * .3;
    if (frame && wall !== 'tin') wallT *= .9;
    if (heavy >= 1 && weakWall) wallT = Math.max(wallT, .92);          // Betondecke auf Lehm/Blech: viel zu schwer
    const roofWind = roof === 'thatch' ? (frame ? .5 : .66) : roof === 'tilegable' ? (frame ? .36 : .46) : roof === 'tinhip' ? (weakWall ? .2 : .12) : 0;
    const roofSag = roof === 'thatch' ? .7 : roof === 'tilegable' && wall === 'mud' ? .35 : 0;
    const tau = { mud: 9, tin: 25, brickwall: 40, ferro: 60 }[wall] || 30;
    return { cfg, platform, baseY, floorY, dIn, dFnd, wet, found, plat: platform ? .5 : 0, wallT, roofWind, roofSag, frame, vet, heavy, weakWall, tau,
      sideF: { fluss: 1, ost: .9, west: .84, tuer: .8 } };
  }
  // Schwellen, ab denen eine Wand an einer Stelle einbricht (Schaden 0..1 je Seite)
  const BREACH = { mud: [.4, .62, .85], brickwall: [.58, .8], tin: [.7], ferro: [] };
  const ALL_AT = { mud: .85, tin: .7 };   // ab hier fällt die ganze Wand

  /* ================= 3) Fester Untergrund für herabfallende Teile ================= */
  const frustumH = (x, z, wt, dt, wb, db, h) => {
    const ax = Math.abs(x), az = Math.abs(z);
    if (ax <= wt / 2 && az <= dt / 2) return h;
    const kx = ax <= wt / 2 ? 0 : (ax - wt / 2) / Math.max(.01, (wb - wt) / 2), kz = az <= dt / 2 ? 0 : (az - dt / 2) / Math.max(.01, (db - dt) / 2);
    const k = Math.max(kx, kz); return k >= 1 ? -1e9 : h * (1 - k);
  };
  const HEAP_N = 96, HEAP_C = .25, HEAP_O = -HEAP_N * HEAP_C / 2, heap = new Float32Array(HEAP_N * HEAP_N);
  const heapIdx = (x, z) => { const i = Math.floor((x - HEAP_O) / HEAP_C), j = Math.floor((z - HEAP_O) / HEAP_C); return i < 0 || j < 0 || i >= HEAP_N || j >= HEAP_N ? -1 : j * HEAP_N + i; };
  function terrainAt(x, z) {
    let g = worldHeight(x, z);
    if (!A) return g;
    const b = A.baseY, f = A.cfg.foundation, lift = A.floorY - b;
    if (A.platform) g = Math.max(g, frustumH(x, z, W + 1.8, D + 1.6, SITE_W - 1.2, SITE_D - 1.0, PLATFORM_H));
    if (f === 'earth') g = Math.max(g, b + frustumH(x, z, W + .6, D + .6, W + 1.5, D + 1.5, lift));
    else if (f === 'concrete') g = Math.max(g, b + frustumH(x, z, W + .9, D + .9, W + .91, D + .91, lift));
    else if (f) g = Math.max(g, b + frustumH(x, z, W + .6, D + .6, W + .61, D + .61, lift));
    return g;
  }
  const groundAt = (x, z) => { const k = heapIdx(x, z); return terrainAt(x, z) + (k >= 0 ? heap[k] : 0); };
  function stampHeap(x, z, r, top) {
    const n = Math.ceil(r / HEAP_C);
    for (let dj = -n; dj <= n; dj++) for (let di = -n; di <= n; di++) {
      const px = x + di * HEAP_C, pz = z + dj * HEAP_C, d = Math.hypot(di, dj) * HEAP_C; if (d > r) continue;
      const k = heapIdx(px, pz); if (k < 0) continue;
      heap[k] = Math.max(heap[k], (top - terrainAt(px, pz)) * .75 * (1 - d / r * .5));
    }
  }

  /* ================= 4) Herabfallende Teile (einfache Starrkörper) ================= */
  const bodies = [], restore = [], schedule = [];
  const _v = new V3(), _w = new V3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), UP = new V3(0, 1, 0);
  function localBox(o) {
    const box = new THREE.Box3(), inv = new THREE.Matrix4().copy(o.matrixWorld).invert(), tmp = new THREE.Box3();
    o.traverse(c => {
      if (!c.isMesh || !c.visible) return;
      if (!c.geometry.boundingBox) c.geometry.computeBoundingBox();
      tmp.copy(c.geometry.boundingBox).applyMatrix4(_m.multiplyMatrices(inv, c.matrixWorld));
      box.union(tmp);
    });
    return box;
  }
  // Ein Teil löst sich: Originale (Fenster, Türen, Balken) merken wir uns für das Zurücksetzen, eigene Teile werden entsorgt.
  function release(o, opt = {}) {
    if (!o || o.userData.released) return null;
    o.userData.released = true;
    o.updateMatrixWorld(true);
    if (!o.userData.own) restore.push({ o, parent: o.parent, p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone(), vis: o.visible });
    const wb = new THREE.Box3().setFromObject(o);
    if (wb.isEmpty()) return null;
    const piv = new THREE.Group(); piv.userData.own = true; wb.getCenter(piv.position);
    debrisG.add(piv); piv.updateMatrixWorld(true); piv.attach(o);
    const lb = localBox(piv), corners = [];
    for (let c = 0; c < 8; c++) corners.push(new V3(c & 1 ? lb.max.x : lb.min.x, c & 2 ? lb.max.y : lb.min.y, c & 4 ? lb.max.z : lb.min.z));
    const size = lb.getSize(new V3());
    const b = { o: piv, v: opt.v || new V3(), w: opt.w || new V3(), corners, r: Math.max(.06, size.length() / 2), size, buoy: opt.buoy ?? .4, windK: opt.windK || 0,
      kind: opt.kind || 'solid', dissolve: !!opt.dissolve, shatter: opt.shatter || null, still: 0, sleep: false, dis: 0, wasDry: true, age: 0 };
    bodies.push(b);
    return b;
  }
  const windVec = (x, z, S) => { const g = windAt(x, z, ctx.time()); return _w.set(1, 0, .18).normalize().multiplyScalar((3 + 9 * S) * (.6 + .5 * g)); };
  function stepBody(b, dt) {
    if (b.sleep) return;
    const o = b.o; b.age += dt;
    const S = STORM.value;
    // Wasser: Auftrieb nach eingetauchtem Anteil, Widerstand, Strömung
    o.updateMatrixWorld();
    let minY = 1e9, maxY = -1e9;
    b.corners.forEach(c => { const y = _v.copy(c).applyMatrix4(o.matrixWorld).y; minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
    const wl = levelAt(o.position.x, o.position.z), sub = clamp((wl - minY) / Math.max(.05, maxY - minY));
    b.v.y -= G * dt;
    if (sub > 0) {
      if (b.wasDry && b.v.y < -1.4) { puff(o.position.x, wl + .05, o.position.z, 'splash', clamp(b.r * 1.4, .5, 2)); b.wasDry = false; }
      b.v.y += G * b.buoy * sub * dt;
      const dr = Math.exp(-dt * (1.2 + 3.5 * sub)); b.v.multiplyScalar(dr); b.w.multiplyScalar(Math.exp(-dt * 2.2 * sub));
      if (b.buoy > 1) { const [fx, fz] = flowAt(o.position.x, o.position.z); b.v.x += (fx + .3 * S - b.v.x) * dt * .7 * sub; b.v.z += (fz - b.v.z) * dt * .7 * sub; }
      if (b.dissolve) {   // Lehm zerfällt im Wasser: wird kleiner und flacher
        b.dis += dt; const k = Math.max(.42, 1 - b.dis * .07); o.scale.set(k, k * .8, k);
      }
    } else if (b.windK > 0) {
      const wv = windVec(o.position.x, o.position.z, S);
      b.v.x += (wv.x - b.v.x) * b.windK * dt; b.v.z += (wv.z - b.v.z) * b.windK * dt;
      b.v.y += b.windK * S * 3.2 * dt * clamp(1.2 - b.age * .25);   // Auftrieb an der Fläche, lässt bald nach
    }
    o.position.addScaledVector(b.v, dt);
    const wl2 = b.w.length();
    if (wl2 > 1e-5) { _q.setFromAxisAngle(_v.copy(b.w).divideScalar(wl2), wl2 * dt); o.quaternion.premultiply(_q); }
    // Boden: Ecken, die eindringen, heben das Teil an und drehen es flach
    o.updateMatrixWorld();
    let pen = 0, contacts = 0;
    for (const c of b.corners) {
      const p = _v.copy(c).applyMatrix4(o.matrixWorld), g = groundAt(p.x, p.z), d = g - p.y;
      if (d > 0) {
        contacts++; pen = Math.max(pen, d);
        const rx = p.x - o.position.x, rz = p.z - o.position.z, ry = p.y - o.position.y;
        // Drehmoment r × (0, f, 0)
        const k = Math.min(d, .05) * 55 / (b.r * b.r + .08);
        b.w.x += (-rz) * k; b.w.z += rx * k; void ry;
      }
    }
    if (contacts) {
      o.position.y += pen;
      if (b.v.y < 0) {
        if (b.shatter && b.v.y < -3.2 && sub < .2) { b.shatter(b); return; }
        if (b.v.y < -2.2 && sub < .2) puff(o.position.x, o.position.y - b.size.y * .3, o.position.z, 'dust', clamp(b.r * 1.2, .4, 1.6));
        b.v.y *= -.12;
      }
      const fr = Math.exp(-dt * 7); b.v.x *= fr; b.v.z *= fr; b.w.multiplyScalar(Math.exp(-dt * 3.5));
      if (b.v.length() < .12 && b.w.length() < .25) b.still += dt; else b.still = 0;
      if (b.still > .5 && (!b.dissolve || b.dis > 5 || sub < .1)) {
        b.sleep = true;
        stampHeap(o.position.x, o.position.z, Math.max(.2, Math.min(b.size.x, b.size.z) * .45), maxY);
      }
    }
    if (o.position.y < -8 || Math.hypot(o.position.x, o.position.z) > 80) { b.sleep = true; o.visible = false; }
  }

  /* ---------- Splitter, Halme und Staubwolken ---------- */
  const MAXS = lite ? 260 : 640;
  const shardMat = new THREE.MeshStandardMaterial({ roughness: .9, envMapIntensity: .5 });
  const shards = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), shardMat, MAXS);
  shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage); shards.frustumCulled = false; shards.castShadow = true; shards.receiveShadow = true;
  shards.userData.own = true; site.add(shards);
  const sh = [], _c = new THREE.Color();
  for (let i = 0; i < MAXS; i++) { sh.push({ on: false, p: new V3(), v: new V3(), r: new THREE.Euler(), w: new V3(), s: new V3(1, 1, 1), windy: 0, rest: false, buoy: 0 }); shards.setColorAt(i, _c.setRGB(1, 1, 1)); }
  let shNext = 0, shDirty = true;
  function shard(p, v, size, color, windy = 0, buoy = .3) {
    const i = shNext; shNext = (shNext + 1) % MAXS; const s = sh[i];
    s.on = true; s.rest = false; s.p.copy(p); s.v.copy(v); s.s.copy(size); s.windy = windy; s.buoy = buoy;
    s.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); s.w.set((Math.random() - .5) * 14, (Math.random() - .5) * 14, (Math.random() - .5) * 14);
    shards.setColorAt(i, _c.set(color).multiplyScalar(.75 + Math.random() * .4)); shards.instanceColor.needsUpdate = true; shDirty = true;
  }
  const _e = new THREE.Euler(), _s = new V3();
  function stepShards(dt) {
    const S = STORM.value;
    for (let i = 0; i < MAXS; i++) {
      const s = sh[i];
      if (!s.on) continue;
      if (!s.rest) {
        const wl = levelAt(s.p.x, s.p.z), inW = s.p.y < wl;
        s.v.y -= G * dt * (inW ? 1 - s.buoy * 1.1 : 1);
        if (inW) { s.v.multiplyScalar(Math.exp(-dt * 4)); s.w.multiplyScalar(Math.exp(-dt * 3)); if (s.buoy > .9) s.p.y = Math.max(s.p.y, wl - .02); }
        else if (s.windy) { const wv = windVec(s.p.x, s.p.z, S); s.v.x += (wv.x - s.v.x) * s.windy * dt; s.v.z += (wv.z - s.v.z) * s.windy * dt; }
        s.p.addScaledVector(s.v, dt);
        s.r.x += s.w.x * dt; s.r.y += s.w.y * dt; s.r.z += s.w.z * dt;
        const g = groundAt(s.p.x, s.p.z) + s.s.y * .5;
        if (s.p.y < g) { s.p.y = g; s.v.y *= -.25; s.v.x *= .5; s.v.z *= .5; s.w.multiplyScalar(.5); if (s.v.length() < .3) { s.rest = true; s.r.x = Math.round(s.r.x / Math.PI) * Math.PI; s.r.z = Math.round(s.r.z / Math.PI) * Math.PI; } }
        if (Math.abs(s.p.x) > 70 || Math.abs(s.p.z) > 70) s.on = false;
        shDirty = true;
      }
    }
    if (!shDirty) return;
    for (let i = 0; i < MAXS; i++) {
      const s = sh[i];
      _m.compose(s.p, _q.setFromEuler(_e.copy(s.r)), s.on ? s.s : _s.set(0, 0, 0));
      shards.setMatrixAt(i, _m);
    }
    shards.instanceMatrix.needsUpdate = true; shDirty = false;
  }
  const puffTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    for (let n = 0; n < 9; n++) { const x = 20 + Math.random() * 24, y = 20 + Math.random() * 24, r = 10 + Math.random() * 14, rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, 'rgba(255,255,255,.55)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); }
    return new THREE.CanvasTexture(c);
  })();
  const puffs = [];
  for (let i = 0; i < (lite ? 24 : 48); i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 }));
    sp.visible = false; sp.renderOrder = 9; sp.userData.own = true; site.add(sp); puffs.push({ sp, t: 1, life: 1, size: 1, rise: 0 });
  }
  let puffNext = 0;
  function puff(x, y, z, kind, size = 1) {
    const p = puffs[puffNext]; puffNext = (puffNext + 1) % puffs.length;
    p.sp.position.set(x + (Math.random() - .5) * .3, y, z + (Math.random() - .5) * .3); p.t = 0; p.size = size; p.sp.visible = true;
    p.life = kind === 'splash' ? .9 : 1.6; p.rise = kind === 'splash' ? 1.2 : .35;
    p.sp.material.color.set(kind === 'splash' ? 0xb8ad98 : kind === 'mud' ? 0x7a644a : 0xa18c6e);
  }
  function stepPuffs(dt) {
    puffs.forEach(p => {
      if (!p.sp.visible) return;
      p.t += dt; const k = p.t / p.life;
      if (k >= 1) { p.sp.visible = false; return; }
      p.sp.position.y += dt * p.rise * (1 - k); p.sp.position.x += dt * STORM.value * 2;
      const s = p.size * (.4 + k * 1.4); p.sp.scale.set(s, s * .8, 1); p.sp.material.opacity = .75 * (1 - k) * Math.min(1, k * 8);
    });
  }

  /* ================= 5) Wände: in Bruchstücke zerlegen, Risse, Einsturz ================= */
  // Polygon an einer konvexen Umrandung abschneiden (Sutherland–Hodgman)
  function clipPoly(poly, edge) {   // edge(p) > 0 = innen; cut(a, b) = Schnittpunkt
    let out = poly;
    for (const [inside, cut] of edge) {
      const inp = out; out = [];
      for (let i = 0; i < inp.length; i++) {
        const a = inp[i], b = inp[(i + 1) % inp.length], ia = inside(a), ib = inside(b);
        if (ia) out.push(a);
        if (ia !== ib) out.push(cut(a, b));
      }
      if (out.length < 3) return [];
    }
    return out;
  }
  const halfPlane = (ax, ay, bx, by) => {   // links von a→b ist innen
    const side = p => (bx - ax) * (p[1] - ay) - (by - ay) * (p[0] - ax) >= -1e-9;
    const cut = (p, q) => { const d1 = (bx - ax) * (p[1] - ay) - (by - ay) * (p[0] - ax), d2 = (bx - ax) * (q[1] - ay) - (by - ay) * (q[0] - ax), t = d1 / (d1 - d2); return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };
    return [side, cut];
  };
  const polyArea = p => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; };
  function breaks(list, cell, r) {
    const xs = [...new Set(list.map(v => +v.toFixed(4)))].sort((a, b) => a - b), out = [xs[0]];
    for (let i = 1; i < xs.length; i++) {
      const a = out[out.length - 1], b = xs[i];
      if (b - a < .07) continue;
      const n = Math.max(1, Math.round((b - a) / cell));
      for (let k = 1; k < n; k++) out.push(a + (b - a) * (k + (r() - .5) * .35) / n);
      out.push(b);
    }
    return out;
  }

  // Einbruchstellen je Wand (in Wandkoordinaten): wo, wie breit, ab welchem Schaden
  function planWall(P, r) {
    const L2 = P.len / 2, top = P.h + (P.gable || 0), regs = [], th = BREACH[P.id] || [];
    const place = (c, w) => clamp(c, -L2 + w / 2, L2 - w / 2);
    if (P.id === 'mud') {
      const w1 = Math.min(P.len * .55, 1.1 + r() * .5), o = P.holes[Math.floor(r() * P.holes.length)];
      const c1 = place(o ? o.x + (r() < .5 ? -1 : 1) * (o.w / 2 + w1 * .3) : (r() - .5) * P.len * .5, w1);
      regs.push({ x0: c1 - w1 / 2, x1: c1 + w1 / 2, y0: 0, y1: top, at: th[0], mode: 'slump', out: r() < .7 ? 1 : -1 });
      const w2 = Math.min(P.len * .5, 1.2 + r() * .6), c2 = place(-Math.sign(c1 || 1) * (L2 * .45 + r() * L2 * .35), w2);
      regs.push({ x0: c2 - w2 / 2, x1: c2 + w2 / 2, y0: 0, y1: top, at: th[1], mode: 'slump', out: r() < .6 ? 1 : -1 });
      regs.push({ x0: -L2 - 1, x1: L2 + 1, y0: 0, y1: top, at: th[2], mode: 'slump', out: r() < .5 ? 1 : -1, all: true });
    } else if (P.id === 'brickwall') {
      // Ausgespült wird zuerst die Hausecke vorn links (Westen/Tür), bei mehr Schaden auch hinten links (Westen/Fluss).
      // Je Wand: an welchem Ende (−1 links, +1 rechts in Wandkoordinaten) liegt diese Ecke?
      const corners = { tuer: [[-1, 0]], west: [[1, 0], [-1, 1]], fluss: [[1, 1]], ost: [] }[P.side] || [];
      corners.forEach(([s, k]) => {
        const w = (k ? .8 : 1.0) + r() * .45;
        regs.push({ x0: s > 0 ? L2 - w : -L2 - .1, x1: s > 0 ? L2 + .1 : -L2 + w, y0: 0, y1: P.h * (.75 + r() * .2) + (k ? 0 : P.gable || 0), at: th[k], mode: 'corner', out: 1 });
      });
    } else if (P.id === 'tin') {
      regs.push({ x0: -L2 - 1, x1: L2 + 1, y0: 0, y1: top, at: th[0], mode: 'crush', out: 1, all: true });
    }
    return regs;
  }

  function crackMaterial(tex, len, top) {
    const m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 1, envMapIntensity: .4, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    m.userData = { uCrack: { value: 0 }, own: true };
    m.onBeforeCompile = shd => {
      shd.uniforms.uCrack = m.userData.uCrack; shd.uniforms.uSize = { value: new THREE.Vector2(len, top) };
      shd.fragmentShader = 'uniform float uCrack; uniform vec2 uSize;\n' + NOISE + '\n' + shd.fragmentShader.replace('#include <map_fragment>', `
        vec4 ck = texture2D(map, vUv);
        if (ck.a < 0.35 || ck.r > uCrack) discard;
        float fresh = 1.0 - smoothstep(0.0, 0.1, uCrack - ck.r);     // eben aufgegangen: heller Bruch
        vec2 pm = vUv * uSize;
        vec3 col;
        if (ck.g > 0.75) {          // abgeplatzter Putz: Ziegel mit Mörtelfugen
          float row = floor(pm.y / 0.075), off = mod(row, 2.0) * 0.12;
          float mort = step(fract(pm.y / 0.075), 0.14) + step(fract((pm.x + off) / 0.24), 0.05);
          col = mix(vec3(0.5, 0.24, 0.15) * (0.8 + 0.4 * dmH(vec2(floor((pm.x + off) / 0.24), row))), vec3(0.62, 0.6, 0.55), clamp(mort, 0.0, 1.0));
          col *= 0.85 + 0.15 * smoothstep(0.0, 0.08, uCrack - ck.r);
        } else if (ck.g > 0.3) {    // abgerutschter, aufgeweichter Lehm
          col = vec3(0.36, 0.27, 0.18) * (0.7 + 0.5 * dmN(pm * 18.0));
        } else {                    // Riss
          col = mix(vec3(0.045, 0.036, 0.03), vec3(0.4, 0.33, 0.26), fresh * 0.5);
        }
        diffuseColor = vec4(col, min(1.0, ck.a * 1.4));`);
    };
    m.customProgramCacheKey = () => 'dmgcrack';
    return m;
  }

  // Zerlegt eine Wand in unregelmäßige Stücke (ohne Lücken, Öffnungen bleiben exakt), zeichnet die Risskarte dazu.
  function fracture(panel, plan) {
    const P = panel.userData.panel, { len, h, t, holes, id } = P, gab = P.gable || 0, top = h + gab, L2 = len / 2;
    const r = rng(hashStr(P.side + id + len.toFixed(2) + gab.toFixed(2)));
    const cell = (id === 'tin' ? .66 : id === 'mud' ? .5 : .43) * (lite ? 1.35 : 1);
    const xs = breaks([-L2, L2, ...holes.flatMap(o => [o.x - o.w / 2, o.x + o.w / 2])], cell, r);
    const ys = breaks([0, h, ...(gab ? [top] : []), ...holes.flatMap(o => [o.y, o.y + o.h])], cell * .9, r);
    const eps = 1e-4;
    const onHX = (x, y) => holes.some(o => (Math.abs(x - (o.x - o.w / 2)) < eps || Math.abs(x - (o.x + o.w / 2)) < eps) && y >= o.y - eps && y <= o.y + o.h + eps);
    const onHY = (x, y) => holes.some(o => (Math.abs(y - o.y) < eps || Math.abs(y - (o.y + o.h)) < eps) && x >= o.x - o.w / 2 - eps && x <= o.x + o.w / 2 + eps);
    const jit = id === 'mud' ? .55 : id === 'tin' ? .1 : .42;
    const grid = xs.map((x, i) => ys.map((y, j) => {
      const fx = i === 0 || i === xs.length - 1 || onHX(x, y) || id === 'tin', fy = j === 0 || j === ys.length - 1 || (!gab && Math.abs(y - h) < eps) || onHY(x, y);
      const dx = fx ? 0 : (r() - .5) * jit * Math.min(xs[i + 1] - x, x - xs[i - 1]), dy = fy ? 0 : (r() - .5) * jit * Math.min(ys[j + 1] - y, y - ys[j - 1]);
      return [x + dx, y + dy];
    }));
    const outline = gab ? [halfPlane(-L2, 0, L2, 0), halfPlane(L2, 0, L2, h), halfPlane(L2, h, 0, top), halfPlane(0, top, -L2, h), halfPlane(-L2, h, -L2, 0)]
      : [halfPlane(-L2, 0, L2, 0), halfPlane(L2, 0, L2, h), halfPlane(L2, h, -L2, h), halfPlane(-L2, h, -L2, 0)];
    const inHole = (x, y) => holes.some(o => x > o.x - o.w / 2 && x < o.x + o.w / 2 && y > o.y && y < o.y + o.h);
    let polys = [];
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
      if (inHole((xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2)) continue;
      let q = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]];
      if (gab && ys[j + 1] > h + eps) q = clipPoly(q, outline);
      if (q.length < 3 || Math.abs(polyArea(q)) < .003) continue;
      if (q.length === 4 && id !== 'mud' && id !== 'tin' && r() < .5) {
        const d = r() < .5; polys.push(d ? [q[0], q[1], q[2]] : [q[0], q[1], q[3]], d ? [q[0], q[2], q[3]] : [q[1], q[2], q[3]]);
      } else polys.push(q);
    }
    polys = polys.filter(q => Math.abs(polyArea(q)) > .003);

    // Stücke den Einbruchstellen zuordnen (Kante ausgefranst)
    const pieces = polys.map(q => {
      const cx = q.reduce((s, p) => s + p[0], 0) / q.length, cy = q.reduce((s, p) => s + p[1], 0) / q.length, jx = (hash2(cx * 7, cy * 3) - .5) * .32;
      let reg = -1;
      plan.forEach((R, k) => { if (reg < 0 && cx + jx >= R.x0 && cx + jx <= R.x1 && cy >= R.y0 && cy <= R.y1) reg = k; });
      return { q, cx, cy, reg };
    });

    // Risskarte: R = ab welchem Schaden sichtbar, G = Art (0 Riss, 128 Lehm, 255 Ziegel unter Putz), A = Deckung
    let crackMat = null;
    if (id !== 'tin') {
      const ppm = lite ? 80 : 110, cw = Math.round(len * ppm), ch = Math.round(top * ppm);
      const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      const g = cv.getContext('2d'), X = x => (x + L2) * ppm, Y = y => (top - y) * ppm;
      const col = (thr, type) => `rgb(${Math.round(clamp(thr, .01, 1) * 255)},${type},0)`;
      const blob = (x, y, rad, thr, type) => {
        g.fillStyle = col(thr, type); g.beginPath();
        const n = 9; for (let k = 0; k <= n; k++) { const a = k / n * Math.PI * 2, rr = rad * (.6 + r() * .55); const px = X(x + Math.cos(a) * rr), py = Y(y + Math.sin(a) * rr * .8); if (k) g.lineTo(px, py); else g.moveTo(px, py); }
        g.fill();
      };
      if (id === 'brickwall') {   // Putz platzt am Wasserrand, am Sockel und an den Fensterecken ab
        for (let k = 0; k < len * 4; k++) blob(-L2 + r() * len, Math.pow(r(), 1.5) * 1.2, .08 + r() * .22, .3 + r() * .55, 255);
        holes.forEach(o => { if (r() < .8) blob(o.x + (r() < .5 ? -1 : 1) * o.w / 2, o.y + (r() < .5 ? 0 : o.h), .12 + r() * .15, .35 + r() * .4, 255); });
      }
      if (id === 'mud') for (let k = 0; k < len * 3; k++) blob(-L2 + r() * len, Math.pow(r(), 2) * .7, .1 + r() * .25, .12 + r() * .5, 128);
      const weak = [];
      holes.forEach(o => { weak.push([o.x - o.w / 2, o.y + o.h], [o.x + o.w / 2, o.y + o.h]); if (o.y > .05) weak.push([o.x - o.w / 2, o.y], [o.x + o.w / 2, o.y]); });
      const jag = (ax, ay, bx, by, thr, width) => {
        const n = Math.max(3, Math.round(Math.hypot(bx - ax, by - ay) / .07)), nx = -(by - ay), ny = bx - ax, nl = Math.hypot(nx, ny) || 1;
        g.strokeStyle = col(thr, 0); g.lineWidth = width; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath(); g.moveTo(X(ax), Y(ay));
        for (let k = 1; k < n; k++) { const f = k / n, o = (r() - .5) * .028; g.lineTo(X(ax + (bx - ax) * f + nx / nl * o), Y(ay + (by - ay) * f + ny / nl * o)); }
        g.lineTo(X(bx), Y(by)); g.stroke();
      };
      // innere Kanten (gemeinsam von zwei Stücken) werden zu Rissen
      const edges = new Map();
      pieces.forEach((pc, pi) => pc.q.forEach((a, k) => {
        const b = pc.q[(k + 1) % pc.q.length], ka = a[0].toFixed(3) + ',' + a[1].toFixed(3), kb = b[0].toFixed(3) + ',' + b[1].toFixed(3), key = ka < kb ? ka + '|' + kb : kb + '|' + ka;
        const e = edges.get(key); if (e) e.p.push(pi); else edges.set(key, { a, b, p: [pi] });
      }));
      const atOf = k => k >= 0 ? plan[k].at : 9;
      edges.forEach(e => {
        if (e.p.length < 2) return;
        const [ra, rb] = e.p.map(pi => pieces[pi].reg), mx = (e.a[0] + e.b[0]) / 2, my = (e.a[1] + e.b[1]) / 2;
        let thr, wdt = 1.6 + r() * 1.2;
        if (ra !== rb) { thr = Math.min(atOf(ra), atOf(rb)) - .2 - r() * .07; wdt += 1.4; }
        else if (ra >= 0) thr = atOf(ra) - .07 - r() * .1;
        else {
          const d = weak.reduce((m, [x, y]) => Math.min(m, Math.hypot(mx - x, my - y)), id === 'mud' ? my * .8 + .2 : 3);
          thr = id === 'mud' ? .2 + d * .45 + r() * .35 : .3 + d * .75 + r() * .45;   // Mauerwerk: wenige Hauptrisse von den Öffnungsecken aus
        }
        if (id === 'ferro') thr += .1;
        if (thr > 1.02) return;
        jag(e.a[0], e.a[1], e.b[0], e.b[1], thr, wdt);
        if (r() < .4) {   // Verästelung
          let x = mx, y = my, ang = Math.atan2(e.b[1] - e.a[1], e.b[0] - e.a[0]) + (r() < .5 ? -1 : 1) * (.6 + r() * .6);
          const pts = [[x, y]]; for (let k = 0; k < 3; k++) { ang += (r() - .5) * .8; x += Math.cos(ang) * .08; y += Math.sin(ang) * .08; pts.push([x, y]); }
          for (let k = 0; k < pts.length - 1; k++) jag(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], thr + .06 + r() * .1, wdt * .55);
        }
      });
      if (id === 'mud') for (let k = 0; k < len * top * 3; k++) {   // Schwindrisse im aufgeweichten Lehm
        let x = -L2 + r() * len, y = Math.pow(r(), 1.6) * top, ang = r() * 6.3; const thr = .25 + r() * .7 + y * .1;
        for (let s = 0; s < 3 + r() * 4; s++) { const nx = x + Math.cos(ang) * .06, ny = y + Math.sin(ang) * .06; jag(x, y, nx, ny, thr, .9 + r() * .6); x = nx; y = ny; ang += (r() - .5) * 1.2; }
      }
      const tex = new THREE.CanvasTexture(cv); tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
      crackMat = crackMaterial(tex, len, top);
    }

    // Stücke bauen: Körper (gleiches Material), Bemalung und Risse als dünne Häute auf der Außenseite
    const fg = new THREE.Group(); fg.userData.own = true;
    fg.position.copy(panel.position); fg.quaternion.copy(panel.quaternion); panel.parent.add(fg);
    const decalMat = P.decal ? P.decal.material : null, below = [halfPlane(L2 + 1, h, -L2 - 1, h)];
    pieces.forEach(pc => {
      const { q, cx, cy } = pc, cg = new THREE.Group(); cg.userData.own = true; cg.position.set(cx, cy, t / 2);
      const shape = new THREE.Shape(q.map(p => new THREE.Vector2(p[0], p[1])));
      const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false }); geo.translate(-cx, -cy, -t / 2);
      const body = new THREE.Mesh(geo, panel.material); body.castShadow = body.receiveShadow = true; body.userData.own = true; cg.add(body);
      const skin = (poly, mat, z, vTop, ro) => {
        const sg = new THREE.ShapeGeometry(new THREE.Shape(poly.map(p => new THREE.Vector2(p[0], p[1])))), pos = sg.attributes.position, uv = sg.attributes.uv;
        for (let k = 0; k < pos.count; k++) uv.setXY(k, (pos.getX(k) + L2) / len, pos.getY(k) / vTop);
        sg.translate(-cx, -cy, t / 2 + z);
        const m = new THREE.Mesh(sg, mat); m.receiveShadow = true; m.renderOrder = ro; m.userData.own = true; cg.add(m); return m;
      };
      if (decalMat) { const dq = clipPoly(q, below); if (dq.length >= 3) skin(dq, decalMat, .006, h, 1); }
      if (crackMat) skin(q, crackMat, .01, top, 2);
      fg.add(cg); pc.g = cg;
    });
    panel.visible = false;
    return { fg, pieces, crackMat };
  }

  /* ================= 6) Dach: Haut in Bündel / Ziegel / Bleche teilen ================= */
  function patchSlab(poly, th, mat, o, e0, e1, n) {
    let P = poly;
    const pn = new V3().subVectors(P[1], P[0]).cross(new V3().subVectors(P[2], P[0]));
    if (pn.dot(n) < 0) P = P.slice().reverse();
    const bot = P.map(p => p.clone().addScaledVector(n, -th)), pos = [], uv = [], idx = [];
    const add = (vs, flip) => {
      const base = pos.length / 3;
      vs.forEach(v => { pos.push(v.x, v.y, v.z); const d = _v.copy(v).sub(o); uv.push(d.dot(e0), d.dot(e1)); });
      for (let i = 1; i < vs.length - 1; i++) flip ? idx.push(base, base + i + 1, base + i) : idx.push(base, base + i, base + i + 1);
    };
    add(P, false); add(bot, true);
    for (let i = 0; i < P.length; i++) { const j = (i + 1) % P.length; add([P[i], bot[i], bot[j], P[j]], false); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    return geo;
  }
  function splitRoof() {
    const skins = []; let flat = null;
    houseG.traverse(o => { if (o.userData.skin && o.visible) skins.push(o); if (o.userData.roofFlat) flat = o; });
    if (flat) return { kind: 'flat', group: flat, items: [] };
    if (!skins.length) return null;
    const kind = skins[0].userData.skin.kind, grp = skins[0].parent, r = rng(hashStr(kind + 'dach'));
    const items = [], pg = new THREE.Group(); pg.userData.own = true; grp.add(pg);
    const decor = grp.children.filter(c => !c.userData.skin && c !== pg).map(o => {
      const bb = new THREE.Box3().setFromObject(o), c = bb.getCenter(new V3()); houseG.worldToLocal(c);
      const lo = houseG.worldToLocal(bb.min.clone()), hi = houseG.worldToLocal(bb.max.clone());
      return { o, side: c.z > .15 ? 'tuer' : c.z < -.15 ? 'fluss' : 'first', x0: Math.min(lo.x, hi.x), x1: Math.max(lo.x, hi.x) };
    });
    let yr = -1e9, X = 0;
    const mats = { thatch: M_.bamboo(), tile: M_.woodDark(), tin: M_.woodDark() };
    const frameMat = patchMat(mats[kind]);
    skins.forEach(sk => {
      const S = sk.userData.skin, pts = S.pts.map(p => new V3(...p)), q = pts.length === 3 ? [pts[0], pts[1], pts[2], pts[2]] : pts;
      pts.forEach(p => { yr = Math.max(yr, p.y); X = Math.max(X, Math.abs(p.x)); });
      const n = new V3().subVectors(q[1], q[0]).cross(new V3().subVectors(q[3], q[0])).normalize(); if (n.y < 0) n.negate();
      const e0 = new V3().subVectors(q[1], q[0]).normalize(), e1 = new V3().crossVectors(n, e0);
      const lu = q[0].distanceTo(q[1]), lv = q[0].distanceTo(q[3]);
      const su = kind === 'thatch' ? .6 : kind === 'tile' ? .52 : .9, sv = kind === 'thatch' ? .55 : kind === 'tile' ? .48 : lv / 2;
      const nu = Math.max(pts.length === 3 ? 2 : 3, Math.round(lu / su * (lite ? .7 : 1))), nv = Math.max(1, Math.round(lv / sv * (lite ? .7 : 1)));
      const bil = (u, v) => new V3().lerpVectors(new V3().lerpVectors(q[0], q[1], u), new V3().lerpVectors(q[3], q[2], u), v);
      const jit = kind === 'thatch' ? .32 : 0;
      const gp = [];
      for (let i = 0; i <= nu; i++) { gp.push([]); for (let j = 0; j <= nv; j++) {
        const inner = i > 0 && i < nu && j > 0 && j < nv;
        gp[i].push(bil(clamp(i / nu + (inner ? (r() - .5) * jit / nu : 0)), clamp(j / nv + (inner ? (r() - .5) * jit / nv : 0))));
      } }
      const mat = sk.material;
      for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
        let poly = [gp[i][j], gp[i + 1][j], gp[i + 1][j + 1], gp[i][j + 1]];
        poly = poly.filter((p, k) => p.distanceTo(poly[(k + 1) % poly.length]) > 1e-3);
        if (poly.length < 3) continue;
        const c = poly.reduce((s, p) => s.add(p), new V3()).divideScalar(poly.length);
        if (new V3().subVectors(poly[1], poly[0]).cross(new V3().subVectors(poly[2], poly[0])).length() < 1e-4) continue;
        const geo = patchSlab(poly, S.th, mat, q[0], e0, e1, n); geo.translate(-c.x, -c.y, -c.z);
        const m = new THREE.Mesh(geo, mat); m.position.copy(c); m.castShadow = m.receiveShadow = true; m.userData.own = true; pg.add(m);
        const a = gp[i][j + 1], b = gp[i + 1][j + 1];
        items.push({ o: m, p0: c.clone(), q0: new THREE.Quaternion(), side: S.side, x: c.x, u: (i + .5) / nu, v: (j + .5) / nv, n,
          fPiv: a.clone().add(b).multiplyScalar(.5), fAxis: new V3().subVectors(b, a).normalize(), patch: true, kind });
      }
      // Tragwerk unter der Haut (Sparren, Latten), sichtbar, sobald Teile fehlen
      const rafter = (a, b, rad, sq) => {
        const A2 = a.clone(), B2 = b.clone(), len = A2.distanceTo(B2); if (len < .05) return;
        const g = sq ? new THREE.BoxGeometry(rad * 2, len, rad * 2) : new THREE.CylinderGeometry(rad, rad, len, 7);
        const m = new THREE.Mesh(g, frameMat); m.castShadow = m.receiveShadow = true; m.userData.own = true;
        m.position.copy(A2).add(B2).multiplyScalar(.5); m.quaternion.setFromUnitVectors(UP, B2.clone().sub(A2).normalize()); pg.add(m);
        items.push({ o: m, p0: m.position.clone(), q0: m.quaternion.clone(), side: S.side, x: m.position.x, u: .5, v: .5, patch: false, kind });
      };
      const off = (p, d) => p.clone().addScaledVector(n, -d);
      const rafterStep = kind === 'tin' ? 1.2 : .6, nr = Math.max(2, Math.round(lu / rafterStep));
      for (let k = 0; k <= nr; k++) { const u = k / nr; rafter(off(bil(u, .02), S.th + .045), off(bil(u, .98), S.th + .045), kind === 'thatch' ? .035 : .04, kind !== 'thatch'); }
      const battenStep = kind === 'tile' ? .32 : kind === 'tin' ? .7 : .45, nb = Math.max(1, Math.round(lv / battenStep));
      // Latten feldweise (zwischen zwei Sparren), damit sie mit einem eingeknickten Abschnitt mitgehen bzw. dort brechen
      for (let k = 1; k < nb; k++) { const v = k / nb; for (let c = 0; c < nr; c++) rafter(off(bil(c / nr + .004, v), S.th + .012), off(bil((c + 1) / nr - .004, v), S.th + .012), kind === 'thatch' ? .02 : .018, kind !== 'thatch'); }
      sk.visible = false;
    });
    // Reihenfolge, in der der Sturm Teile herausreißt: Traufe, Ortgang/Grat und First zuerst, die Windseite (Westen) vor allem
    const order = items.filter(it => it.patch).map(it => ({ it, s: 1.2 * Math.exp(-it.v * 4) + .8 * Math.exp(-(1 - it.v) * 5) + 1.1 * Math.exp(-Math.min(it.u, 1 - it.u) * 7) + .7 * sstep(2, -3.5, it.x) + r() * .7 }))
      .sort((a, b) => b.s - a.s).map(o => o.it);
    return { kind, group: grp, pg, items, decor, order, yr, X, hinges: [], lost: 0 };
  }

  /* ================= 7) Erdhügel: Ausspülung, Rinnen, Kerbe an der Wasserlinie ================= */
  function setupMound(g, amountMax, seed) {
    const M = g.userData.mound, geo = M.side.geometry, cg = M.cap.geometry;
    const r = rng(seed), gullies = [];
    // Rinnen: zur Flussseite (hinten) kräftiger, eine vorn rechts gut sichtbar
    [[.28, 1], [.55, .8], [1.25, 1.2], [1.5, 1.1], [1.78, 1.2], [.9, .7]].forEach(([a, k]) => gullies.push({ th: a * Math.PI + (r() - .5) * .2, w: .1 + r() * .08, a: k * (.7 + r() * .5) }));
    return { g, M, geo, cg, origP: geo.attributes.position.array.slice(), origC: geo.attributes.color.array.slice(), origCap: cg.attributes.position.array.slice(), gullies, amountMax, last: -1, fans: [] };
  }
  function erode(md, amount) {
    if (Math.abs(amount - md.last) < .01) return;
    md.last = amount;
    const { M, geo, cg, origP, origC, origCap, gullies } = md, NA = M.NA, NH = M.NH, P = geo.attributes.position.array, C = geo.attributes.color.array, CP = cg.attributes.position.array;
    const baseW = md.g.parent ? md.g.parent.position.y : 0;
    const tw = clamp((FLOOD_H - (A ? (md.isPlat ? 0 : A.baseY) : 0)) / M.h);
    const Smax = md.amountMax;
    const angD = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
    void baseW;
    for (let k = 0; k <= NH; k++) for (let i = 0; i <= NA; i++) {
      const vi = k * (NA + 1) + i, o = vi * 3, x0 = origP[o], y0 = origP[o + 1], z0 = origP[o + 2], t = k / NH, th = (i % NA) / NA * Math.PI * 2;
      const l = Math.hypot(x0, z0) || 1, nx = x0 / l, nz = z0 / l;
      const gs = gullies.reduce((s, gg) => s + gg.a * Math.exp(-Math.pow(angD(th, gg.th) / gg.w, 2)), 0);
      const sheet = .3 + .15 * Math.sin(th * 7 + 1.3) + .1 * Math.sin(th * 17);
      const notch = Math.exp(-Math.pow((t - tw) / .2, 2)), toe = Math.pow(1 - t, 2) * .5;
      let e = amount * Smax * (sheet * (.5 * notch + .3 + toe) + gs * (.55 + .45 * t) * (t <= tw + .15 ? 1 : .6));
      if (t > .85) e = Math.min(e, md.isPlat ? .7 : .42);   // oben nicht weiter als bis unter die Hauswand
      P[o] = x0 - nx * e; P[o + 2] = z0 - nz * e;
      P[o + 1] = y0 - (t > .55 ? gs * amount * Smax * .4 * (t - .55) / .45 : 0);
      const dark = 1 - .45 * clamp(e / .3);
      C[o] = origC[o] * dark; C[o + 1] = origC[o + 1] * dark; C[o + 2] = origC[o + 2] * dark * .95;
      if (k === NH && i < NA) { CP[(1 + i) * 3] = P[o]; CP[(1 + i) * 3 + 1] = P[o + 1] + .004; CP[(1 + i) * 3 + 2] = P[o + 2]; }
    }
    void origCap;
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
    cg.attributes.position.needsUpdate = true; cg.computeVertexNormals();
    // ausgespültes Material lagert sich als flacher Schlammfächer vor den Rinnen ab
    md.fans.forEach((f, n) => { const s = clamp(amount * 1.4) * f.k; f.m.scale.set(s * f.r, s * .14 + .001, s * f.r * .7); f.m.visible = s > .05; void n; });
  }
  function fansFor(md) {
    const { M, origP, gullies } = md, NA = M.NA;
    gullies.forEach(gg => {
      const i = Math.round(((gg.th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (2 * Math.PI) * NA) % NA, o = i * 3;
      const x = origP[o], z = origP[o + 2], l = Math.hypot(x, z) || 1;
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), patchMat(M_.earth()));
      m.userData.own = true; m.receiveShadow = true; m.visible = false;
      m.position.set(x + x / l * .35, 0, z + z / l * .35); m.rotation.y = -Math.atan2(z, x);
      md.g.add(m); md.fans.push({ m, r: .5 + gg.a * .4 * md.amountMax, k: gg.a });
    });
  }
  function unerode(md) {
    const P = md.geo.attributes.position.array; P.set(md.origP); md.geo.attributes.color.array.set(md.origC);
    md.cg.attributes.position.array.set(md.origCap);
    md.geo.attributes.position.needsUpdate = md.geo.attributes.color.needsUpdate = md.cg.attributes.position.needsUpdate = true;
    md.geo.computeVertexNormals(); md.cg.computeVertexNormals();
    md.fans.forEach(f => { f.m.parent && f.m.parent.remove(f.m); f.m.geometry.dispose(); });
  }

  /* ---------- Neigen (Setzung, geknickter Pfahl) ---------- */
  const tilts = [];
  function tiltSetup(objs, pivot, axis) { objs.forEach(o => { o.updateMatrixWorld(true); tilts.push({ o, base: o.matrixWorld.clone(), p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone(), pivot, axis }); }); }
  function tiltApply(angle) {
    tilts.forEach(tt => {
      const R = new THREE.Matrix4().makeRotationAxis(tt.axis, angle), Tm = new THREE.Matrix4().makeTranslation(tt.pivot.x, tt.pivot.y, tt.pivot.z), Ti = new THREE.Matrix4().makeTranslation(-tt.pivot.x, -tt.pivot.y, -tt.pivot.z);
      const mw = Tm.multiply(R).multiply(Ti).multiply(tt.base), pinv = new THREE.Matrix4().copy(tt.o.parent.matrixWorld).invert();
      mw.premultiply(pinv).decompose(tt.o.position, tt.o.quaternion, tt.o.scale);
    });
  }

  /* ================= 8) Ablauf ================= */
  let A = null, on = false, T = 0, hW = 0, hF = 0, hP = 0, windP = 0, tide = -99, ff = false;
  let walls = [], roof = null, mounds = [], stilt = null, tiltTarget = 0, tiltNow = 0, events = [];
  const wallGone = {};

  function findPanels() { const out = []; houseG.traverse(o => { if (o.userData.panel && !o.userData.own) out.push(o); }); return out; }
  function setupWalls() {
    houseG.updateMatrixWorld(true);
    const panels = findPanels();
    if (!panels.length) return;
    const wallRoot = panels[0].parent;
    // Anbauteile (Fenster, Tür, Läden, Gesims, Sockel, Pfosten) der nächsten Wand zuordnen
    const items = wallRoot.children.filter(c => !c.userData.panel && !c.userData.own).map(c => {
      const bb = new THREE.Box3().setFromObject(c); if (bb.isEmpty()) return null;
      const cen = bb.getCenter(new V3());
      let best = null;
      panels.forEach(p => { const l = p.worldToLocal(cen.clone()), P = p.userData.panel, d = Math.abs(l.z - P.t / 2); if (Math.abs(l.x) < P.len / 2 + .35 && (!best || d < best.d)) best = { p, d, x: l.x, y: l.y }; });
      return best && best.d < .7 ? { o: c, panel: best.p, x: best.x, y: best.y } : null;
    }).filter(Boolean);
    walls = panels.map(panel => {
      const P = panel.userData.panel, r = rng(hashStr(P.side + P.id + 'plan'));
      const plan = planWall(P, r);
      const fr = A.wallT * A.sideF[P.side] > .1 || plan.length ? fracture(panel, plan) : null;
      const n = new V3(0, 0, 1).applyQuaternion(panel.getWorldQuaternion(new THREE.Quaternion())), ax = new V3(1, 0, 0).applyQuaternion(panel.getWorldQuaternion(new THREE.Quaternion()));
      return { panel, P, plan, fr, items: items.filter(it => it.panel === panel), n, ax, dmg: 0, fired: plan.map(() => false), dented: false, flap: null, r };
    });
  }
  // Wand-Koordinate → Hauskoordinate entlang der Wand (x bei Tür/Fluss, z bei Ost/West)
  function alongHouse(wl, lx) {
    const p = wl.panel.localToWorld(new V3(lx, 0, wl.P.t / 2)); houseG.worldToLocal(p);
    return wl.P.side === 'tuer' || wl.P.side === 'fluss' ? p.x : p.z;
  }
  function fireRegion(wl, k) {
    const R = wl.plan[k], P = wl.P, id = P.id;
    wl.fired[k] = true;
    events.push({ t: T, what: `wall:${P.side}:${R.mode}` });
    const out = wl.n.clone().multiplyScalar(R.out), now = T;
    const sel = wl.fr ? wl.fr.pieces.filter(pc => pc.reg === k && !pc.g.userData.released) : [];
    sel.sort((a, b) => a.cy - b.cy);
    sel.forEach(pc => {
      const low = pc.cy < .75, r = wl.r;
      const delay = id === 'tin' ? r() * .25 : low ? r() * .35 : .3 + pc.cy * .14 + r() * .25;
      schedule.push({ t: now + delay, fn: () => {
        const sp = id === 'mud' && low ? .25 + r() * .3 : .35 + r() * .9;
        const v = out.clone().multiplyScalar(sp).add(new V3(0, low ? -.2 : .1, 0));
        const w = wl.ax.clone().multiplyScalar(R.out * (low ? .4 : 1 + r() * 1.8)).add(new V3((r() - .5) * .8, (r() - .5) * .8, (r() - .5) * .8));
        const shat = id === 'brickwall' ? b => { shatterBody(b, 0x9c4f33, 5); } : null;
        const b = release(pc.g, { v, w, buoy: id === 'tin' ? .5 : .38, kind: id, dissolve: id === 'mud', shatter: shat, windK: id === 'tin' ? .25 : 0 });
        if (b && id === 'mud' && Math.random() < .5) puff(b.o.position.x, b.o.position.y, b.o.position.z, 'mud', .8);
      } });
    });
    wl.items.forEach(it => {
      if (it.o.userData.released) return;
      const inside = R.all || (it.x >= R.x0 - .2 && it.x <= R.x1 + .2);
      if (!inside) return;
      schedule.push({ t: now + .2 + wl.r() * .5, fn: () => release(it.o, { v: out.clone().multiplyScalar(.6), w: wl.ax.clone().multiplyScalar(R.out * 1.2), buoy: 1.2 }) });
    });
    // Staub an der Bruchstelle
    for (let i = 0; i < 3; i++) {
      const lx = (Math.max(R.x0, -P.len / 2) + Math.min(R.x1, P.len / 2)) / 2 + (Math.random() - .5);
      const p = wl.panel.localToWorld(new V3(lx, .3 + Math.random() * 1.5, P.t));
      schedule.push({ t: now + .3 + i * .25, fn: () => puff(p.x, p.y, p.z, id === 'mud' ? 'mud' : 'dust', 1.4) });
    }
    if (R.y1 >= P.h - .05 || R.mode === 'corner') {
      const a = alongHouse(wl, Math.max(R.x0, -P.len / 2)), b = alongHouse(wl, Math.min(R.x1, P.len / 2));
      if (R.all) wallGone[P.side] = true;
      schedule.push({ t: now + (id === 'tin' ? .3 : .55), fn: () => roofSupport(P.side, Math.min(a, b), Math.max(a, b), !!R.all) });
    }
  }
  function shatterBody(b, color, n) {
    const p = b.o.position, s = b.size;
    for (let i = 0; i < n; i++) shard(new V3(p.x + (Math.random() - .5) * s.x, p.y, p.z + (Math.random() - .5) * s.z), new V3((Math.random() - .5) * 2.5, 1 + Math.random() * 2, (Math.random() - .5) * 2.5), new V3(.08 + Math.random() * .12, .05 + Math.random() * .05, .06 + Math.random() * .1), color);
    puff(p.x, p.y, p.z, 'dust', 1);
    // Rest bleibt als kleinerer Brocken liegen
    b.o.scale.multiplyScalar(.6); b.shatter = null; b.v.set(0, 0, 0); b.w.multiplyScalar(.3);
  }

  // Wand weg → Dachabschnitt darüber verliert sein Auflager
  function roofSupport(side, a, b, all) {
    if (!roof) return;
    const gone = Object.keys(wallGone).length;
    if (roof.kind === 'flat') { if (A.weakWall || gone) collapseFlat(side); return; }
    if (gone >= 2 && !A.frame) { collapseRoof(side); return; }
    // schmale Einbrüche: die Sparren liegen links und rechts noch auf, das Dach sackt nur etwas ab
    const k = (A.frame ? .12 : 1) * (all ? 1 : clamp((b - a) / 1.8, .3, 1)) * (roof.kind === 'tin' ? .5 : 1);
    if (side === 'tuer' || side === 'fluss') {
      const it0 = roof.items.find(it => it.side === side && it.patch);
      if (!it0) return;
      const sk = roof.items.filter(it => it.side === side), eave = sk.reduce((m, it) => Math.min(m, it.p0.y), 1e9), Z = sk.reduce((m, it) => Math.max(m, Math.abs(it.p0.z)), 0);
      const alpha = Math.atan2(roof.yr - eave, Z), sg = side === 'tuer' ? 1 : -1;
      const w = all ? [-99, 99] : [a, b];
      roof.hinges.push({ axis: new V3(1, 0, 0), piv: new V3(0, roof.yr, 0), ang: sg * Math.max(.2, 1.12 - alpha) * k, t0: T, dur: .8 + Math.random() * .3,
        sel: it => it.side !== side ? 0 : sstep(w[0] - .6, w[0] + .25, it.x + (hash2(it.x, it.v) - .5) * .3) * (1 - sstep(w[1] - .25, w[1] + .6, it.x + (hash2(it.v, it.x) - .5) * .3)) });
    } else {
      const end = side === 'ost' ? 1 : -1, hip = roof.kind === 'tin';
      const x0 = end * (hip ? (W - D) / 2 : roof.X - 1.7);   // Walm: Ende des Firsts; Giebel: First bricht vor der Giebelwand
      roof.hinges.push({ axis: new V3(0, 0, 1), piv: new V3(x0, roof.yr, 0), ang: -end * (hip ? .55 : .42) * k, t0: T, dur: .9,
        sel: it => (it.side === side ? 1 : 0) || sstep(0, .5, end * (it.x - x0)) });
    }
    events.push({ t: T, what: `roof:drop:${side}` });
    // aufgebundene Latten, Traufbalken und Firstbündel über dem Abschnitt reißen los und rutschen ab
    if (!A.frame) roof.decor.forEach(d => {
      if (d.o.userData.released) return;
      const hit = (side === 'tuer' || side === 'fluss') ? d.side === side && d.x1 > a - .3 && d.x0 < b + .3 : (side === 'ost' ? d.x1 > roof.X - 1.9 : d.x0 < -roof.X + 1.9) && (d.side === 'first' || Math.random() < .5);
      if (hit) schedule.push({ t: T + .35 + Math.random() * .5, fn: () => release(d.o, { v: new V3(0, -.3, 0), w: new V3((Math.random() - .5) * 1.2, (Math.random() - .5) * .4, (Math.random() - .5) * 1.2), buoy: 1.3 }) });
    });
    // einige Teile im eingeknickten Bereich brechen ganz heraus und fallen ins Haus
    const hg = roof.hinges[roof.hinges.length - 1];
    schedule.push({ t: T + hg.dur + .1, fn: () => {
      if (A.frame) return;
      roof.items.forEach(it => { if (!it.o.userData.released && it.patch && hg.sel(it) > .85 && Math.random() < .3) dropItem(it, .4); });
    } });
  }
  function dropItem(it, sp = 0) {
    const kind = it.kind;
    const b = release(it.o, { v: new V3((Math.random() - .5) * sp, -.3, (Math.random() - .5) * sp), w: new V3((Math.random() - .5) * 2, (Math.random() - .5) * 2, (Math.random() - .5) * 2),
      buoy: kind === 'thatch' ? 1.6 : kind === 'tin' ? .55 : it.patch ? .45 : 1.3, windK: kind === 'thatch' ? .2 : kind === 'tin' ? .4 : 0,
      shatter: kind === 'tile' && it.patch ? bb => { shatterBody(bb, 0xb5603c, 7); } : null });
    if (b && kind === 'thatch') for (let i = 0; i < 6; i++) shard(b.o.position, new V3((Math.random() - .5) * 2, Math.random() * 1.5, (Math.random() - .5) * 2), new V3(.012, .006, .22 + Math.random() * .15), 0xb59a5c, 1.2, 1.1);
    return b;
  }
  function collapseRoof(side) {
    if (!roof || roof.collapsed) return;
    roof.collapsed = true; events.push({ t: T, what: 'roof:collapse' });
    const from = side === 'tuer' ? [0, 3] : side === 'fluss' ? [0, -3] : side === 'ost' ? [4, 0] : [-4, 0];
    // Das Dach bricht in wenige große Stücke (je Dachseite drei Abschnitte mit Sparren und Latten), die nacheinander abstürzen
    const clusters = new Map(), r = rng(99);
    const cuts = [-1.2 + r() * .6, 1.0 + r() * .6];
    roof.items.forEach(it => {
      if (it.o.userData.released) return;
      if (it.patch && r() < .12) { schedule.push({ t: T + .2 + r() * .4, fn: () => dropItem(it, .8) }); return; }   // einzelne Bündel lösen sich
      const bin = it.x < cuts[0] ? 0 : it.x < cuts[1] ? 1 : 2, key = it.side + bin;
      if (!clusters.has(key)) clusters.set(key, []);
      clusters.get(key).push(it);
    });
    clusters.forEach(list => {
      const c = list.reduce((s, it) => s.add(it.o.getWorldPosition(new V3())), new V3()).divideScalar(list.length);
      const grp = new THREE.Group(); grp.userData.own = true; grp.position.copy(c); debrisG.add(grp); grp.updateMatrixWorld(true);
      list.forEach(it => { it.o.userData.released = true; grp.attach(it.o); });
      const kind = roof.kind, t0 = T + Math.hypot(c.x - from[0], c.z - from[1]) * .07 + r() * .1;
      schedule.push({ t: t0, fn: () => {
        const b = release(grp, { v: new V3((r() - .5) * .4, -.4, (r() - .5) * .4), w: new V3((r() - .5) * 1.4, (r() - .5) * .6, (r() - .5) * 1.4),
          buoy: kind === 'thatch' ? 1.3 : kind === 'tin' ? .5 : .45, shatter: null });
        if (b) b.big = true;
        if (kind === 'thatch') for (let i = 0; i < 14; i++) shard(c, new V3((r() - .5) * 3, r() * 2, (r() - .5) * 3), new V3(.012, .006, .2 + r() * .2), 0xb59a5c, .8, 1.1);
        if (kind === 'tile') for (let i = 0; i < 16; i++) shard(c, new V3((r() - .5) * 3, r() * 1.5, (r() - .5) * 3), new V3(.12 + r() * .1, .03, .1 + r() * .08), 0xb5603c);
      } });
    });
    roof.decor.forEach(d => schedule.push({ t: T + .25 + Math.random() * .3, fn: () => release(d.o, { buoy: 1.2, w: new V3((Math.random() - .5), 0, (Math.random() - .5)) }) }));
  }
  function collapseFlat(side) {
    if (!roof || roof.collapsed) return;
    roof.collapsed = true; events.push({ t: T, what: 'roof:flat' });
    const n = { tuer: [1, 0, 0], fluss: [-1, 0, 0], ost: [0, 0, -1], west: [0, 0, 1] }[side] || [1, 0, 0];
    release(roof.group, { v: new V3(0, -.5, 0), w: new V3(...n).multiplyScalar(.8), buoy: .2, shatter: null });
    // die Wände werden zerdrückt
    walls.forEach(wl => wl.plan.forEach((R, k) => { if (!wl.fired[k] && R.all) schedule.push({ t: T + .15 + Math.random() * .2, fn: () => { if (!wl.fired[k]) fireRegion(wl, k); } }); }));
    walls.forEach(wl => { if (!wl.fr) return; wl.fr.pieces.forEach(pc => { if (!pc.g.userData.released) schedule.push({ t: T + .2 + Math.random() * .3, fn: () => release(pc.g, { v: wl.n.clone().multiplyScalar(.8 + Math.random()), w: wl.ax.clone().multiplyScalar(2), buoy: .4, dissolve: wl.P.id === 'mud' }) }); }); });
    for (let i = 0; i < 6; i++) schedule.push({ t: T + .6 + i * .1, fn: () => puff((Math.random() - .5) * W, A.floorY + .5, (Math.random() - .5) * D, 'dust', 2.2) });
  }

  // Lage eines Dachteils aus Durchhängen, Flattern und eingeknickten Abschnitten
  const _p = new V3(), _qq = new THREE.Quaternion(), _r = new THREE.Quaternion(), _a = new V3();
  function poseRoof(sag) {
    if (!roof || roof.kind === 'flat') return;
    roof.items.forEach(it => {
      if (it.o.userData.released) return;
      _p.copy(it.p0); _qq.copy(it.q0);
      if (sag > 0 && it.patch) _p.y -= sag * Math.sin(Math.PI * it.u) * Math.sin(Math.PI * clamp(it.v * 1.1));
      if (it.flapA) { _r.setFromAxisAngle(it.fAxis, it.flapA); _a.copy(it.fPiv); _p.sub(_a).applyQuaternion(_r).add(_a); _qq.premultiply(_r); }
      for (const hg of roof.hinges) {
        const w = hg.sel(it); if (w <= 0) continue;
        _r.setFromAxisAngle(hg.axis, hg.cur * w); _p.sub(hg.piv).applyQuaternion(_r).add(hg.piv); _qq.premultiply(_r);
      }
      it.o.position.copy(_p); it.o.quaternion.copy(_qq);
    });
  }

  function begin(animate) {
    if (on && !animate) { ff = true; return; }   // nach der Simulation: der Rest läuft schnell zu Ende
    reset();
    const cfg = getCfg();
    if (!cfg.wall && !cfg.foundation && !cfg.roof) return;
    A = assess(cfg); on = true; T = 0; hW = hF = hP = windP = 0; tide = -99; ff = false;
    houseG.updateMatrixWorld(true);
    if (cfg.wall) setupWalls();
    if (cfg.roof) roof = splitRoof();
    if (roof && roof.kind !== 'flat') {   // vor dem Flattern: Flatterwinkel und Bündel festlegen
      const r = rng(7); roof.items.forEach(it => { it.ph = r() * 6; });
    }
    // Erdsockel / Plattform
    [[foundG, A.found * (cfg.foundation === 'earth' ? .55 : 0), 31, false], [platformG, A.plat * 1.15, 47, true]].forEach(([g, amt, seed, isPlat]) => {
      if (amt <= 0) return;
      g.traverse(o => { if (o.userData.mound) { const md = setupMound(o, amt, seed); md.isPlat = isPlat; md.target = isPlat ? 1 : 1; fansFor(md); mounds.push(md); } });
    });
    // Pfahlbau: der vordere linke Pfahl (gut sichtbar) knickt; sonst Setzung des Erdsockels zur ausgespülten Seite
    if (cfg.foundation === 'stilts' && A.found > .42) {
      foundG.traverse(o => { if (o.userData.stilt && o.userData.stilt[0] < -2 && o.userData.stilt[1] > 1) stilt = { o }; });
      const objs = [houseG]; foundG.traverse(o => { if (o.userData.deck) objs.push(o); });
      const corner = new V3(-2.6, A.floorY, 1.8), dir = new V3(-2.6, 0, 1.8).normalize();
      tiltSetup(objs, new V3(2.6 * .5, A.floorY, -1.8 * .5), new V3(dir.z, 0, -dir.x));
      tiltTarget = .055; stilt && (stilt.corner = corner);
    } else if (cfg.foundation === 'earth' && A.found > .6) {
      tiltSetup([houseG], new V3(1.5, A.floorY, -1), new V3(1, 0, .35).normalize());
      tiltTarget = (A.found - .6) * .09;
    }
    if (!animate) settle();
  }
  // Ergebnis ohne vorherige Simulation: alles im Endzustand berechnen (Teile fallen in einigen Sekunden Rechenzeit)
  function settle() {
    hW = hF = hP = 140; windP = 1; tide = FLOOD_H;
    for (let i = 0; i < 360; i++) step(1 / 30, true);
  }

  function step(dt, quiet = false) {
    if (!on) return;
    T += dt;
    // Schedules (Einstürze laufen zeitversetzt ab)
    for (let i = schedule.length - 1; i >= 0; i--) if (schedule[i].t <= T) { const s = schedule[i]; schedule.splice(i, 1); s.fn(); }
    const S = STORM.value;
    const lvl = Math.max(levelAt(0, D / 2 + 1.4), levelAt(0, 0), levelAt(-W / 2 - 1, 0), levelAt(W / 2 + 1, 0));
    if (lvl > -50) tide = Math.max(tide, lvl);
    const k = ff ? 30 : 1;
    if (lvl > A.floorY + .02) hW += dt * H_PER_S * k * clamp((lvl - A.floorY) / .3, .3, 1);
    if (lvl > A.baseY + .02) hF += dt * H_PER_S * k * clamp((lvl - A.baseY) / .3, .3, 1);
    if (lvl > .02) hP += dt * H_PER_S * k;
    windP = Math.min(1, windP + dt * (ff ? .6 : S * S / 16));
    if (ff && hW > 140 && hF > 140 && windP >= 1) ff = false;

    // Wände
    const hits = flutImpact();
    walls.forEach(wl => {
      const P = wl.P;
      let prog = A.dIn > .03 ? 1 - Math.exp(-hW / A.tau) : windP * .9;
      if (A.dIn > .03) prog += Math.min(.2, (hits[P.side] || 0) * .003);
      if (A.found > .2 && (P.id === 'brickwall' || P.id === 'ferro')) prog = Math.max(prog, 1 - Math.exp(-hF / 30));
      wl.dmg = A.wallT * A.sideF[P.side] * clamp(prog);
      if (wl.fr && wl.fr.crackMat) wl.fr.crackMat.userData.uCrack.value = wl.dmg * 1.12;
      wl.plan.forEach((R, kk) => { if (!wl.fired[kk] && R.at != null && wl.dmg >= R.at) fireRegion(wl, kk); });
      if (P.id === 'tin' && wl.fr) tinWall(wl, dt);
    });
    // Fundament
    const fP = 1 - Math.exp(-hF / 14), pP = 1 - Math.exp(-hP / 30);
    mounds.forEach(md => erode(md, md.isPlat ? pP : fP));
    if (tilts.length) {
      const want = stilt ? (A.found * fP > .42 ? tiltTarget : 0) : tiltTarget * fP;
      if (stilt && want > 0 && !stilt.broken) breakStilt();
      const nt = tiltNow + (want - tiltNow) * Math.min(1, dt * (stilt ? 4 : 1.5));
      if (Math.abs(nt - tiltNow) > 1e-5) { tiltNow = nt; tiltApply(tiltNow); }
    }
    // Dach: Sturm reißt Teile heraus, nasses Stroh hängt durch, eingeknickte Abschnitte
    if (roof && roof.kind !== 'flat' && !roof.collapsed) {
      const N = roof.order.length;
      let want = Math.round(N * A.roofWind * windP * .24);
      if (roof.kind === 'tin') want = A.roofWind * windP > .15 ? 1 : 0;
      while (roof.lost < want && roof.lost < N) {
        const it = roof.order[roof.lost++]; if (it.o.userData.released) continue;
        const wv = windVec(it.p0.x, it.p0.z, S);
        const tp = it.kind === 'tile';
        const b = release(it.o, { v: new V3(wv.x * (tp ? .35 : .55), 2 + Math.random() * 2.5, wv.z * .5), w: new V3((Math.random() - .5) * 7, (Math.random() - .5) * 5, (Math.random() - .5) * 7),
          buoy: it.kind === 'thatch' ? 1.6 : it.kind === 'tin' ? .55 : .45, windK: it.kind === 'thatch' ? .9 : it.kind === 'tin' ? 1.3 : .12,
          shatter: tp ? bb => { shatterBody(bb, 0xb5603c, 7); } : null });
        if (b && it.kind === 'thatch') for (let i = 0; i < 10; i++) shard(b.o.position, new V3(wv.x * .4 + (Math.random() - .5) * 2, 1 + Math.random() * 2, (Math.random() - .5) * 2), new V3(.012, .006, .2 + Math.random() * .2), 0xb59a5c, 1.4, 1.1);
        if (!quiet) events.push({ t: T, what: 'roof:lost' });
      }
      // die nächsten Kandidaten flattern schon im Wind
      const gust = clamp(windAt(0, 0, ctx.time()) - .6);
      const amp = roof.kind === 'thatch' ? .22 : roof.kind === 'tile' ? .12 : .9;
      const nf = roof.kind === 'tin' ? (A.roofWind * windP > .05 ? 1 : 0) : Math.round(4 * A.roofWind * windP);
      for (let i = roof.lost; i < Math.min(N, roof.lost + 4); i++) {
        const it = roof.order[i]; it.flapA = i - roof.lost < nf ? amp * S * (.35 + .65 * gust) * (.55 + .45 * Math.sin(T * (roof.kind === 'tin' ? 9 : 13) + it.ph)) : 0;
      }
      roof.hinges.forEach(hg => { const kk = clamp((T - hg.t0) / hg.dur); hg.cur = hg.ang * (kk < 1 ? kk * kk : 1 + .05 * Math.sin((T - hg.t0 - hg.dur) * 14) * Math.exp(-(T - hg.t0 - hg.dur) * 4)); });
      poseRoof(A.roofSag * .2 * windP);
    }
    bodies.forEach(b => stepBody(b, dt));
    stepShards(dt); stepPuffs(dt);
    // Shader-Werte
    U.uFloodY.value = lvl; U.uTideY.value = tide; U.uWetK.value = tide > -50 ? 1 : 0; U.uAge.value = 1 - Math.exp(-Math.max(hW, hF, hP * .7) / 40);
  }
  // Wellenschläge je Hausseite aus flut.js (alle halbe Sekunde abgefragt)
  let hitsCache = {}, hitsT = -1;
  function flutImpact() {
    if (T - hitsT < .5) return hitsCache;
    hitsT = T; hitsCache = {};
    try { const f = ctx.flutInfo ? ctx.flutInfo() : null; if (f && f.impact) Object.entries(f.impact).forEach(([k, v]) => { hitsCache[k] = v.hits; }); } catch (e) { /* ohne Wellen */ }
    return hitsCache;
  }
  // Blechwand: Dellen durch Treibgut und Wellen, an der windzugewandten Ecke der Vorderseite ein Blech, das losreißt
  function tinWall(wl, dt) {
    const P = wl.P, pcs = wl.fr.pieces;
    if (!wl.dented && wl.dmg > .2) {
      wl.dented = true;
      pcs.forEach(pc => { if (pc.cy < 1.1 && wl.r() < (P.side === 'fluss' ? .55 : .3)) { pc.g.position.z -= .03 + wl.r() * .06; pc.g.rotation.x += (wl.r() - .5) * .2; pc.g.rotation.y += (wl.r() - .5) * .14; } });
    }
    if (P.side === 'tuer' && !wl.flap && wl.dmg > .26) {
      const xs = pcs.map(pc => pc.q.reduce((m, p) => Math.min(m, p[0]), 9)), x0 = Math.min(...xs);
      const col = pcs.filter((pc, i) => xs[i] < x0 + .05);
      const x1 = col.reduce((m, pc) => Math.max(m, ...pc.q.map(p => p[0])), x0);
      const piv = new THREE.Group(); piv.userData.own = true; piv.position.set((x0 + x1) / 2, P.h, P.t / 2); wl.fr.fg.add(piv);
      col.forEach(pc => piv.attach(pc.g));
      wl.flap = { piv, ph: 0 };
      events.push({ t: T, what: 'wall:tin:flap' });
    }
    if (wl.flap && !wl.flap.gone) {
      const S = STORM.value, g = clamp(windAt(-3, 2, ctx.time()) - .5);
      wl.flap.ph += dt * (6 + 6 * g);
      const a = (.25 + .7 * g) * S * (.6 + .4 * Math.sin(wl.flap.ph));
      wl.flap.piv.rotation.x = -a;
      if (wl.dmg > .5) { wl.flap.gone = true; release(wl.flap.piv, { v: new V3(4, 2.5, 1), w: new V3(2, 6, 1), windK: 1.3, buoy: .55 }); }
    }
  }
  function breakStilt() {
    stilt.broken = true;
    const o = stilt.o; if (!o) return;
    o.updateMatrixWorld(true);
    const len = o.geometry.parameters.height, rad = o.geometry.parameters.radiusTop, wp = o.getWorldPosition(new V3());
    o.visible = false; restore.push({ o, parent: o.parent, p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone(), vis: true });
    const mat = o.material;
    const stub = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 1.05, len * .45, 10), mat); stub.userData.own = true; stub.castShadow = true;
    stub.position.set(wp.x, wp.y - len / 2 + len * .2, wp.z); stub.rotation.set(.35, 0, -.25); debrisG.add(stub);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len * .55, 10), mat); top.userData.own = true; top.castShadow = true;
    top.position.set(wp.x - .1, wp.y + len * .2, wp.z + .1); debrisG.add(top);
    release(top, { v: new V3(-.6, .2, .5), w: new V3(1.5, 0, -1), buoy: 1.4 });
    for (let i = 0; i < 6; i++) shard(new V3(wp.x, wp.y, wp.z), new V3((Math.random() - .5) * 2, Math.random() * 2, (Math.random() - .5) * 2), new V3(.02, .02, .12 + Math.random() * .1), 0xc9b27a, 0, 1.2);
    events.push({ t: T, what: 'found:stilt' });
  }

  function reset() {
    on = false; ff = false; schedule.length = 0; bodies.length = 0; events = []; hitsT = -1;
    Object.keys(wallGone).forEach(k => delete wallGone[k]);
    if (tilts.length) { tiltApply(0); tilts.length = 0; } tiltNow = 0; tiltTarget = 0;
    // Originale zurück an ihren Platz
    restore.splice(0).reverse().forEach(rs => { rs.o.userData.released = false; rs.parent.add(rs.o); rs.o.position.copy(rs.p); rs.o.quaternion.copy(rs.q); rs.o.scale.copy(rs.s); rs.o.visible = rs.vis; });
    const dispose = g => g.traverse(o => { if (o.userData.own && o.geometry) o.geometry.dispose(); });
    walls.forEach(wl => { if (wl.fr) { wl.fr.fg.parent && wl.fr.fg.parent.remove(wl.fr.fg); dispose(wl.fr.fg); if (wl.fr.crackMat) { wl.fr.crackMat.map.dispose(); wl.fr.crackMat.dispose(); } } wl.panel.visible = true; });
    walls = [];
    if (roof) {
      if (roof.pg) { roof.pg.parent && roof.pg.parent.remove(roof.pg); dispose(roof.pg); }
      roof.group.traverse(o => { if (o.userData.skin) o.visible = true; });
      roof = null;
    }
    mounds.forEach(unerode); mounds = [];
    stilt = null;
    while (debrisG.children.length) { const c = debrisG.children[0]; debrisG.remove(c); dispose(c); }
    heap.fill(0);
    sh.forEach(s => { s.on = false; }); shDirty = true; stepShards(0);
    puffs.forEach(p => { p.sp.visible = false; });
    U.uFloodY.value = -99; U.uTideY.value = -99; U.uWetK.value = 0; U.uAge.value = 0;
    A = null;
  }

  /* ================= 9) Auskunft für Simulation und Ergebnis ================= */
  const NAMES = { mud: 'Lehmwand', tin: 'Wellblech-Wand', brickwall: 'Ziegelwand', ferro: 'Ferrozement-Wand' };
  function summary(cfg) {
    if (!cfg || !(cfg.wall || cfg.foundation || cfg.roof)) return null;
    const a = assess(cfg), lines = [];
    const wallMax = a.wallT, sides = Object.values(a.sideF).map(f => a.wallT * f), th = BREACH[cfg.wall] || [];
    const breaches = sides.reduce((t, d) => t + th.filter(x => d >= x).length, 0), wallsAll = sides.filter(d => d >= (ALL_AT[cfg.wall] || 9)).length;
    const add = (part, sev, text) => lines.push({ part, sev, good: sev < .3, text });
    // Fundament
    const f = cfg.foundation;
    if (a.platform) add('extra', .25, 'Die Erdplattform hält das Haus trocken. An den Flanken reißt das Wasser aber Rinnen heraus.');
    if (f === 'earth') add('foundation', a.found, a.found > .6 ? 'Der Erdsockel wird ausgespült und rutscht an den Rändern ab. Das Haus sackt zur Seite.' : a.found > .2 ? 'Das Vetivergras hält den Erdsockel fest. Nur die Ränder werden abgetragen.' : 'Der Erdsockel bleibt trocken.');
    else if (f === 'concrete') add('foundation', .1, 'Die Betonplatte bleibt heil, aber eine Schlammschicht bleibt im Haus zurück.');
    else if (f === 'brick') add('foundation', .15, 'Der Ziegelsockel hält. Nur der Mörtel in den Fugen wird ausgewaschen.');
    else if (f === 'stilts') add('foundation', a.found, a.found > .42 ? 'Treibgut knickt einen Bambuspfahl, die Plattform neigt sich.' : 'Die Pfähle halten, das Holz der Plattform quillt auf.');
    // Wand
    const w = cfg.wall;
    if (w === 'mud') add('wall', wallMax, wallsAll >= 2 ? 'Die Lehmwände saugen sich voll, weichen am Fuß auf und stürzen ein.' : breaches ? 'Die Lehmwände weichen am Fuß auf und brechen an mehreren Stellen ein.' : 'Die Lehmwände bleiben trocken, der Regen wäscht nur feine Risse aus.');
    else if (w === 'tin') add('wall', wallMax, wallsAll ? 'Die Blechwände knicken unter der schweren Last ein.' : 'Die Blechwände werden eingedellt, ein Blech reißt im Sturm los.');
    else if (w === 'brickwall') add('wall', wallMax, breaches ? 'Der Boden unter der Ziegelwand gibt nach. Sie reißt auf, eine Ecke bricht weg.' : wallMax > .15 ? 'Der Putz platzt ab und die Fugen werden weich, die Ziegelwand hält aber.' : 'Die Ziegelwand bleibt fast unbeschädigt.');
    else if (w === 'ferro') add('wall', .08, 'Die Ferrozement-Wand bleibt dicht. Nur ein Schlammrand bleibt zurück.');
    // Dach
    const r = cfg.roof, roofFalls = (wallsAll >= 2 && !a.frame) || (r === 'concreteflat' && a.weakWall);
    const dropped = !a.frame && breaches > 0 && (w === 'mud' || w === 'brickwall');
    if (r === 'thatch') add('roof', roofFalls ? 1 : .7, roofFalls ? 'Das Grasdach verliert sein Auflager und stürzt ins Haus.' : dropped ? 'Der Sturm reißt Büschel aus dem Grasdach, über der eingebrochenen Wand knickt es ein.' : 'Der Sturm reißt Büschel aus dem Grasdach, nass hängt es durch.');
    else if (r === 'tilegable') add('roof', roofFalls ? 1 : .5, roofFalls ? 'Das schwere Ziegeldach drückt auf die weichen Wände und stürzt ein.' : dropped ? 'Ziegel fliegen weg, und über der eingebrochenen Wand kippt ein Teil des Dachs nach innen.' : 'Der Sturm reißt einzelne Tonziegel vom Dach.');
    else if (r === 'tinhip') add('roof', roofFalls ? .9 : .12, roofFalls ? 'Das Blechdach verliert seine Wände und sackt ein.' : 'Das Wellblechdach hält dem Sturm stand.');
    else if (r === 'concreteflat') add('roof', roofFalls ? 1 : 0, roofFalls ? 'Das schwere Betondach drückt die Wände ein und stürzt ab.' : 'Das Betondach hält, die Familie kann sich darauf retten.');
    return { lines, assess: a };
  }
  function info() {
    if (!on) return { active: false };
    const wallsOut = {}; walls.forEach(wl => { wallsOut[wl.P.side] = { damage: +wl.dmg.toFixed(2), breaches: wl.fired.filter(Boolean).length }; });
    return { active: true, hours: Math.round(Math.max(hW, hF)), walls: wallsOut, roofLost: roof ? roof.lost || 0 : 0, roofCollapsed: !!(roof && roof.collapsed), tilt: +(tiltNow * 180 / Math.PI).toFixed(1), tide: +tide.toFixed(2), events: events.slice(-12) };
  }

  return { prepare, begin, reset, step: dt => step(Math.min(dt, .05)), info, summary, patchMat };
};
