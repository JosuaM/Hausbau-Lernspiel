// Flut-Simulation für Version 2: Sturm, Starkregen und Hochwasser am Jamuna.
//
// Zwei Simulationen arbeiten zusammen:
//   A) Flut (grob, 1,25 m Raster, 180 × 180 m): Flachwasser-Gleichungen mit Reibung über dem echten Gelände.
//      Der Fluss steigt, tritt an den tiefsten Uferstellen über, die Front läuft durch den Ort zum Haus, bis dort 1 m steht.
//   B) Wellen (fein, 0,4 m Raster, 80 × 84 m ums Haus): Wellengleichung mit Geschwindigkeit √(g·Tiefe).
//      Der Sturm schickt Wellenzüge in Gruppen vom Fluss her (Wind und Fetch über der offenen Wasserfläche).
//      Häuser, Mauern, Bäume, Boote und das eigene Haus sind Hindernisse: die Wellen prallen dort ab (Reflexion),
//      laufen um Ecken (Beugung), im Windschatten hinter dem Haus ist es ruhiger. Im flachen Wasser brechen sie,
//      an Wänden schießt Spritzwasser hoch. Was an jeder Hauswand ankommt, wird mitgeschrieben (info().impact).
// Die Zeitachse ist gerafft (rund 35 s statt Stunden), die Physik selbst läuft in echter Geschwindigkeit.
//
// Wird von haus3d.js in create() aufgerufen: window.HausFlut(ctx) → { start, fill, clear, step, info, forward }

window.HausFlut = function HausFlut(ctx) {
  const { THREE, parent, camera, worldHeight, riverZ, RIVER_Y, FLOOD_H, waterMaterial, waterNormal, RAIN, STORM, WET, sstep, lite,
    riverMesh, sheet, house } = ctx;
  const CHAN_HALF = ctx.chanHalf || 9.4;
  if (!ctx.webgl2) return null;   // Shader brauchen texelFetch (WebGL 2); sonst bleibt das einfache Wasser

  const G = 9.81;

  /* ================= A) Flut: grobes Gitter ================= */
  const N = lite ? 112 : 144;
  const CX = 0, CZ = -10, HALF = 90;     // x −90 … 90, z −100 … 80 (Fluss bei z ≈ −27)
  const DX = 2 * HALF / N, NN = N * N;
  const b = new Float32Array(NN), h = new Float32Array(NN), qx = new Float32Array(NN), qz = new Float32Array(NN);
  const scale = new Float32Array(NN), foam = new Float32Array(NN), n2 = new Float32Array(NN), chan = new Uint8Array(NN), pondC = new Uint8Array(NN), prevH = new Float32Array(NN), riseS = new Float32Array(NN);
  const cx = i => CX - HALF + (i + .5) * DX, cz = j => CZ - HALF + (j + .5) * DX;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i, x = cx(i), z = cz(j);
    b[k] = (worldHeight(x, z) * 2 + worldHeight(x + DX * .35, z) + worldHeight(x - DX * .35, z) + worldHeight(x, z + DX * .35) + worldHeight(x, z - DX * .35)) / 6;
    chan[k] = Math.abs(z - riverZ(x)) < CHAN_HALF ? 1 : 0;
    n2[k] = chan[k] ? .02 * .02 : .022 * .022;            // Manning-Rauigkeit
    const [px, pz, pr] = ctx.pond; if (Math.hypot(x - px, z - pz) < pr) pondC[k] = 1;
  }

  // Zeitachse: Der Fluss steigt gleichmäßig, mit kleinen Schüben. Das Drama machen die Wellen, nicht der Pegel.
  const T_END = 32;
  const SURGES = [[6, .22], [9.5, .2], [13, .17], [16.5, .14], [20, .12], [23.5, .09], [27, .06]];
  const pulse = (s, t0) => { const u = s - t0; return u < 0 ? 0 : u < 1.4 ? sstep(0, 1.4, u) : Math.exp(-(u - 1.4) / 3.2); };
  function riverLevel(s) {
    if (s <= 0) return RIVER_Y;
    let L = RIVER_Y + (-.02 - RIVER_Y) * sstep(0, 6, s) + (FLOOD_H + .2) * sstep(6, 25, s);
    SURGES.forEach(([t0, a]) => { L += a * pulse(s, t0); });
    return L;
  }
  const farLevel = (s, d) => Math.min(FLOOD_H, riverLevel(s - Math.max(0, d - 13) / 2.2));
  const PHASES = ['Der Sturm zieht auf', 'Starkregen, der Fluss steigt', 'Der Fluss tritt über die Ufer', 'Das Wasser erreicht das Haus', 'Das Wasser steht 1 m hoch'];

  function simStep(dt, s, rainRate, relax) {
    const Lr = riverLevel(s);
    for (let j = 0; j < N; j++) {
      const row = j * N;
      for (let i = 0; i < N - 1; i++) {
        const k = row + i, H0 = b[k] + h[k], H1 = b[k + 1] + h[k + 1];
        const he = Math.max(H0, H1) - Math.max(b[k], b[k + 1]);
        if (he <= 1e-4) { qx[k] = 0; continue; }
        let q = qx[k] * .999 - dt * G * he * (H1 - H0) / DX;
        q /= 1 + dt * G * (n2[k] + n2[k + 1]) * .5 * Math.abs(q) / (he * he * Math.cbrt(he));
        qx[k] = q;
      }
    }
    for (let j = 0; j < N - 1; j++) {
      const row = j * N;
      for (let i = 0; i < N; i++) {
        const k = row + i, k2 = k + N, H0 = b[k] + h[k], H1 = b[k2] + h[k2];
        const he = Math.max(H0, H1) - Math.max(b[k], b[k2]);
        if (he <= 1e-4) { qz[k] = 0; continue; }
        let q = qz[k] * .999 - dt * G * he * (H1 - H0) / DX;
        q /= 1 + dt * G * (n2[k] + n2[k2]) * .5 * Math.abs(q) / (he * he * Math.cbrt(he));
        qz[k] = q;
      }
    }
    const f = dt / DX;
    for (let k = 0; k < NN; k++) {
      const i = k % N;
      const out = f * (Math.max(0, qx[k]) + (i > 0 ? Math.max(0, -qx[k - 1]) : 0) + Math.max(0, qz[k]) + (k >= N ? Math.max(0, -qz[k - N]) : 0));
      scale[k] = out > h[k] ? h[k] / out : 1;
    }
    for (let k = 0; k < NN; k++) {
      if (qx[k] > 0) qx[k] *= scale[k]; else if (qx[k] < 0 && k + 1 < NN) qx[k] *= scale[k + 1];
      if (qz[k] > 0) qz[k] *= scale[k]; else if (qz[k] < 0 && k + N < NN) qz[k] *= scale[k + N];
    }
    const rainH = rainRate * dt;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      const dh = f * ((i > 0 ? qx[k - 1] : 0) - (i < N - 1 ? qx[k] : 0) + (j > 0 ? qz[k - N] : 0) - (j < N - 1 ? qz[k] : 0));
      h[k] = Math.max(0, h[k] + dh + rainH);
    }
    const kr = Math.min(1, dt * 1.6), ke = Math.min(1, dt * 1.2);
    for (let k = 0; k < NN; k++) {
      if (!chan[k]) continue;
      const L = Lr + (N / 2 - k % N) * DX * .0012;
      if (L > b[k]) h[k] += (L - b[k] - h[k]) * kr;
    }
    for (let e = 0; e < N; e++) {
      [e, (N - 1) * N + e, e * N, e * N + N - 1].forEach(k => {
        if (chan[k]) return;
        const x = cx(k % N), z = cz(Math.floor(k / N)), F = farLevel(s, Math.abs(z - riverZ(x)));
        if (F > b[k]) h[k] += (F - b[k] - h[k]) * ke; else h[k] *= .9;
      });
    }
    if (relax > 0) {
      const target = FLOOD_H + Math.sin(swellT * .8) * .02, kk = Math.min(1, dt * relax);
      for (let k = 0; k < NN; k++) if (h[k] > .02 && b[k] < target) h[k] += (target - b[k] - h[k]) * kk;
    }
  }
  const cellAt = (x, z) => { const i = Math.floor((x - CX + HALF) / DX), j = Math.floor((z - CZ + HALF) / DX); return i < 0 || j < 0 || i >= N || j >= N ? -1 : j * N + i; };

  /* ================= B) Wellen: feines Gitter ums Haus ================= */
  const WDX = lite ? .6 : .4;
  const RX0 = -40, RX1 = 40, RZ0 = -38, RZ1 = 46;
  const NX = Math.round((RX1 - RX0) / WDX), NZ = Math.round((RZ1 - RZ0) / WDX), NW = NX * NZ;
  const eta = new Float32Array(NW), etaP = new Float32Array(NW), dW = new Float32Array(NW), hW = new Float32Array(NW);
  const near = new Float32Array(NW), energy = new Float32Array(NW);
  const vel = new Float32Array(NW);
  const obst = new Uint8Array(NW), wFoam = new Float32Array(NW), cool = new Float32Array(NW), band = new Float32Array(NW);
  const wx = i => RX0 + (i + .5) * WDX, wz = j => RZ0 + (j + .5) * WDX;
  // Abbildung feine Zelle → grobe Zellen (bilinear), einmal vorberechnet
  const mapK = new Int32Array(NW), mapFx = new Float32Array(NW), mapFz = new Float32Array(NW);
  const BAND = Math.round(4 / WDX);   // Randzone (4 m), in der die einlaufenden Wellen eingespeist und auslaufende geschluckt werden
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const k = j * NX + i, gx = (wx(i) - CX + HALF) / DX - .5, gz = (wz(j) - CZ + HALF) / DX - .5;
    const i0 = Math.max(0, Math.min(N - 2, Math.floor(gx))), j0 = Math.max(0, Math.min(N - 2, Math.floor(gz)));
    mapK[k] = j0 * N + i0; mapFx[k] = Math.max(0, Math.min(1, gx - i0)); mapFz[k] = Math.max(0, Math.min(1, gz - j0));
    const e = Math.min(i, j, NX - 1 - i, NZ - 1 - j);
    band[k] = e < BAND ? Math.pow((BAND - e) / BAND, 2) : 0;
  }

  // Einlaufende Sturmwellen: vier Wellenzüge um die Hauptrichtung (vom Fluss her, vom Wind etwas nach Osten gedrückt),
  // in Gruppen (Sets): alle paar Sekunden kommt eine Reihe größerer Wellen. Flachwasser: alle laufen mit C_REF.
  const C_REF = 3.0, DIRM = [.32, .947];
  const COMPS = [[12, 0, .4, 0], [8, .22, .28, 1.3], [5.6, -.3, .2, 2.9], [3.9, .45, .13, 4.4]].map(([L, ang, a, ph]) => {
    const ca = Math.cos(ang), sa = Math.sin(ang), dx = DIRM[0] * ca - DIRM[1] * sa, dz = DIRM[0] * sa + DIRM[1] * ca, k = 2 * Math.PI / L;
    return { kx: dx * k, kz: dz * k, w: k * C_REF, a, ph };
  });
  // Hüllkurven: Wellengruppen (70 m) und alle ~15 s ein Set aus drei, vier besonders großen Wellen (45 m), das durchläuft
  const KG = 2 * Math.PI / 70, KS = 2 * Math.PI / 45;
  function incoming(x, z, t, A) {
    const ph = x * DIRM[0] + z * DIRM[1], sv = Math.max(0, Math.sin(ph * KS - KS * C_REF * t + 1.1));
    const e = (.5 + .5 * Math.sin(ph * KG - KG * C_REF * t)) * .75 + .25 + .75 * sv * sv * sv;
    let s = 0; for (const c of COMPS) s += c.a * Math.sin(x * c.kx + z * c.kz - c.w * t + c.ph);
    return A * e * s;
  }
  const incomingGLSL = `
    float incoming(vec2 p, float A) {
      float ph = dot(p, vec2(${DIRM[0]}, ${DIRM[1]}));
      float sv = max(0.0, sin(ph * ${KS.toFixed(5)} - ${(KS * C_REF).toFixed(5)} * uWaveT + 1.1));
      float e = (0.5 + 0.5 * sin(ph * ${KG.toFixed(5)} - ${(KG * C_REF).toFixed(5)} * uWaveT)) * 0.75 + 0.25 + 0.75 * sv * sv * sv;
      float s = 0.0;
      ${COMPS.map(c => `s += ${c.a.toFixed(3)} * sin(p.x * ${c.kx.toFixed(5)} + p.y * ${c.kz.toFixed(5)} - ${c.w.toFixed(5)} * uWaveT + ${c.ph.toFixed(2)});`).join('\n      ')}
      return A * e * s;
    }`;
  const depthCap = d => .5 * Math.max(0, d);   // Wellen brechen, wenn sie höher werden als die Wassertiefe es zulässt

  // Hindernisse: alles, was im Wasser steht und über die Wasserfläche ragt (Wände, Sockel, Stämme, Boote).
  // Aus den Begrenzungsboxen der Szene, gedreht auf den Boden projiziert. Zäune und Gras sind zu dünn/niedrig.
  const _m = new THREE.Matrix4(), _mi = new THREE.Matrix4(), _v = new THREE.Vector3();
  const isHouseCell = new Uint8Array(NW);
  function buildObstacles() {
    obst.fill(0); isHouseCell.fill(0);
    const roots = ctx.obstacleRoots();
    roots.forEach(r => r.updateMatrixWorld(true));
    const visit = o => {
      if (!o.visible || o.userData.flut) return;
      if (o.isMesh && o.geometry) {
        if (!(o.isInstancedMesh && o.frustumCulled === false)) {   // fliegende Blätter u. ä. auslassen
          const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox();
          if (o.isInstancedMesh) for (let n = 0; n < o.count; n++) { o.getMatrixAt(n, _mi); _m.multiplyMatrices(o.matrixWorld, _mi); addBox(_m, g.boundingBox); }
          else addBox(o.matrixWorld, g.boundingBox);
        }
      }
      o.children.forEach(visit);
    };
    roots.forEach(visit);
    // das eigene Haus immer als Block (Sockel/Wände), damit es sicher getroffen wird
    const [fw, fd] = ctx.foot();
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const x = wx(i), z = wz(j);
      if (Math.abs(x) < fw / 2 && Math.abs(z) < fd / 2) obst[j * NX + i] = 1;
    }
    // „Haus“ = alles, was zusammenhängend von der Hausmitte aus im Wasser steht (Sockel, Plattform, Wände, Pfähle)
    const k0 = wCell(0, 0), stack = [k0]; isHouseCell[k0] = 1;
    while (stack.length) {
      const k = stack.pop(), i = k % NX, j = (k - i) / NX;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([di, dj]) => {
        const ii = i + di, jj = j + dj, kk = jj * NX + ii;
        if (ii >= 0 && jj >= 0 && ii < NX && jj < NZ && obst[kk] && !isHouseCell[kk] && Math.abs(wx(ii)) < 9 && Math.abs(wz(jj)) < 8) { isHouseCell[kk] = 1; stack.push(kk); }
      });
    }
    findWalls();
    // Nähe zum nächsten Hindernis (1 an der Wand, 0 ab 1,6 m): dort kocht das Wasser, wenn Wellen anrollen
    near.fill(0); let front = [];
    for (let k = 0; k < NW; k++) if (obst[k]) { near[k] = 1; front.push(k); }
    const steps = Math.max(2, Math.round(1.6 / WDX));
    for (let st = 1; st <= steps; st++) {
      const nf = [], v = 1 - st / (steps + 1);
      front.forEach(k => { const i = k % NX; [i > 0 ? k - 1 : -1, i < NX - 1 ? k + 1 : -1, k - NX, k + NX].forEach(kk => { if (kk >= 0 && kk < NW && near[kk] === 0) { near[kk] = v; nf.push(kk); } }); });
      front = nf;
    }
  }
  const quad = [[0, 0], [0, 0], [0, 0], [0, 0]];
  function addBox(m, bb) {
    let minY = 1e9, maxY = -1e9;
    for (let c = 0; c < 8; c++) { _v.set(c & 1 ? bb.max.x : bb.min.x, c & 2 ? bb.max.y : bb.min.y, c & 4 ? bb.max.z : bb.min.z).applyMatrix4(m); minY = Math.min(minY, _v.y); maxY = Math.max(maxY, _v.y); }
    if (maxY - minY > 40) return;
    [[bb.min.x, bb.min.z], [bb.max.x, bb.min.z], [bb.max.x, bb.max.z], [bb.min.x, bb.max.z]].forEach(([x, z], n) => { _v.set(x, bb.min.y, z).applyMatrix4(m); quad[n][0] = _v.x; quad[n][1] = _v.z; });
    const area = Math.abs((quad[1][0] - quad[0][0]) * (quad[3][1] - quad[0][1]) - (quad[1][1] - quad[0][1]) * (quad[3][0] - quad[0][0]));
    if (area > 180) return;
    const mx = (quad[0][0] + quad[2][0]) / 2, mz = (quad[0][1] + quad[2][1]) / 2;
    if (mx < RX0 || mx > RX1 || mz < RZ0 || mz > RZ1) return;
    const ground = worldHeight(mx, mz);
    if (minY > FLOOD_H + .45 || maxY < Math.max(ground, RIVER_Y - .3) + .75) return;
    const x0 = Math.min(quad[0][0], quad[1][0], quad[2][0], quad[3][0]), x1 = Math.max(quad[0][0], quad[1][0], quad[2][0], quad[3][0]);
    const z0 = Math.min(quad[0][1], quad[1][1], quad[2][1], quad[3][1]), z1 = Math.max(quad[0][1], quad[1][1], quad[2][1], quad[3][1]);
    const i0 = Math.max(0, Math.floor((x0 - RX0) / WDX)), i1 = Math.min(NX - 1, Math.floor((x1 - RX0) / WDX));
    const j0 = Math.max(0, Math.floor((z0 - RZ0) / WDX)), j1 = Math.min(NZ - 1, Math.floor((z1 - RZ0) / WDX));
    const side = (ax, az, bx, bz, px, pz) => (bx - ax) * (pz - az) - (bz - az) * (px - ax);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const px = wx(i), pz = wz(j);
      const s0 = side(...quad[0], ...quad[1], px, pz), s1 = side(...quad[1], ...quad[2], px, pz), s2 = side(...quad[2], ...quad[3], px, pz), s3 = side(...quad[3], ...quad[0], px, pz);
      if ((s0 >= 0 && s1 >= 0 && s2 >= 0 && s3 >= 0) || (s0 <= 0 && s1 <= 0 && s2 <= 0 && s3 <= 0)) obst[j * NX + i] = 1;
    }
    // dünne Stämme: wenigstens die Zelle in der Mitte
    const ci = Math.floor((mx - RX0) / WDX), cj = Math.floor((mz - RZ0) / WDX);
    if (ci >= 0 && cj >= 0 && ci < NX && cj < NZ) obst[cj * NX + ci] = 1;
  }
  // Wandzellen: Wasserzellen direkt neben einem Hindernis, mit Normale (zeigt vom Hindernis weg) und Hauswand-Seite
  let walls = [], houseWallCount = 0;
  function findWalls() {
    walls = [];
    for (let j = 1; j < NZ - 1; j++) for (let i = 1; i < NX - 1; i++) {
      const k = j * NX + i; if (obst[k]) continue;
      let nx = 0, nz = 0, hs = 0;
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([di, dj]) => { const kk = k + di + dj * NX; if (obst[kk]) { nx -= di; nz -= dj; hs |= isHouseCell[kk]; } });
      if (nx || nz) {
        const l = Math.hypot(nx, nz) || 1, x = wx(i), z = wz(j);
        const sideName = !hs ? null : Math.abs(z) / ctx.foot()[1] > Math.abs(x) / ctx.foot()[0] ? (z < 0 ? 'fluss' : 'tuer') : (x < 0 ? 'west' : 'ost');   // Seite nach Lage zur Hausmitte
        walls.push({ k, nx: nx / l, nz: nz / l, side: sideName });
      }
    }
    walls.sort((a, b2) => (b2.side ? 1 : 0) - (a.side ? 1 : 0));
    houseWallCount = walls.filter(w => w.side).length;
  }

  function waveStep(dt, t, A) {
    // Tiefe aus der Flut-Simulation
    for (let k = 0; k < NW; k++) {
      const c = mapK[k], fx = mapFx[k], fz = mapFz[k];
      const d = (h[c] * (1 - fx) + h[c + 1] * fx) * (1 - fz) + (h[c + N] * (1 - fx) + h[c + N + 1] * fx) * fz;
      dW[k] = d;
      hW[k] = ((b[c] + h[c]) * (1 - fx) + (b[c + 1] + h[c + 1]) * fx) * (1 - fz) + ((b[c + N] + h[c + N]) * (1 - fx) + (b[c + N + 1] + h[c + N + 1]) * fx) * fz;
    }
    const r = dt * dt / (WDX * WDX), damp = 1 - .05 * dt, windFeed = .35 * dt;
    for (let k = 0; k < NW; k++) vel[k] = eta[k] - etaP[k];
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const k = j * NX + i, d = dW[k];
      if (obst[k] || d < .05) { etaP[k] = 0; continue; }
      const c0 = eta[k];
      const l = i > 0 ? (obst[k - 1] ? c0 : eta[k - 1]) : c0, rr = i < NX - 1 ? (obst[k + 1] ? c0 : eta[k + 1]) : c0;
      const dd = j > 0 ? (obst[k - NX] ? c0 : eta[k - NX]) : c0, uu = j < NZ - 1 ? (obst[k + NX] ? c0 : eta[k + NX]) : c0;
      let nv = c0 + vel[k] * damp + G * Math.min(d, 2) * r * (l + rr + dd + uu - 4 * c0);
      // Zähigkeit: glättet nur das Geschwindigkeitsfeld von Zelle zu Zelle. Das schluckt das Gitterrauschen (Zappeln),
      // lange Wellen bleiben fast unberührt.
      if (i > 0 && j > 0 && i < NX - 1 && j < NZ - 1) nv += .05 * ((vel[k - 1] + vel[k + 1] + vel[k - NX] + vel[k + NX]) * .25 - vel[k]);
      if (d < .3) nv *= 1 - (.3 - d) * 3 * dt;             // flaches Wasser bremst (Auflaufen am Ufer)
      const cap = .62 * d;                                    // Brechen: Kamm höher als die Tiefe erlaubt
      if (nv > cap) { wFoam[k] = Math.max(wFoam[k], .7); nv = cap + (nv - cap) * .5; } else if (nv < -.8 * d) nv = -.8 * d;
      // Rand: einlaufende Wellen einspeisen. Innen: der Wind füttert die Wellen über offenem Wasser ständig nach
      // (schwach, damit Reflexionen und der ruhigere Windschatten direkt hinter Hindernissen erhalten bleiben).
      const feed = band[k] > 0 ? band[k] * .35 : windFeed * (1 - near[k]);
      if (feed > 0) nv += (incoming(wx(i), wz(j), t, Math.min(A, depthCap(d))) - nv) * feed;
      etaP[k] = nv;
    }
    // Puffer tauschen (etaP enthält jetzt den neuen Zustand)
    const tmp = new Float32Array(0); void tmp;
    for (let k = 0; k < NW; k++) { const nv = etaP[k]; etaP[k] = eta[k]; eta[k] = nv; }
  }

  /* ================= Darstellung ================= */
  // Daten-Texturen für die Shader: grob (Pegel, Tiefe, Schaum, Strömung) und fein (Welle, Schaum)
  const simData = new Float32Array(NN * 4), waveData = new Float32Array(NW * 4);
  const mkTex = (data, w, hh) => { const t = new THREE.DataTexture(data, w, hh, THREE.RGBAFormat, THREE.FloatType); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; };
  const simTex = mkTex(simData, N, N), waveTex = mkTex(waveData, NX, NZ);

  const RIVER_COL = new THREE.Color(0x27312a), MUD_DEEP = new THREE.Color(0x4f4230), MUD_SHALLOW = new THREE.Color(0x8a7553);
  const U = {
    uSim: { value: simTex }, uSimBox: { value: new THREE.Vector4(CX - HALF, CZ - HALF, DX, N) },
    uWave: { value: waveTex }, uWaveBox: { value: new THREE.Vector4(RX0, RZ0, WDX, NX) }, uWaveNz: { value: NZ },
    uRegion: { value: new THREE.Vector4(RX0, RZ0, RX1, RZ1) },
    uWaveT: { value: 0 }, uWaveA: { value: 0 }, uStormS: { value: 0 }, uChop: { value: 0 },
    uDeep: { value: RIVER_COL.clone() }, uShallow: { value: RIVER_COL.clone() }, uHouse: { value: new THREE.Vector4(0, 0, 3, 2) },
  };
  const wn = waterNormal.clone(); wn.needsUpdate = true; wn.repeat.set(1, 1);

  function makeWaterMat(detail) {
    const m = waterMaterial(RIVER_COL.getHex(), wn, { roughness: .16, normalScale: new THREE.Vector2(.3, .3), transparent: true, depthWrite: true, refl: 0x8a7f68 });
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      prev(sh, r);
      Object.assign(sh.uniforms, U);
      sh.vertexShader = `
        uniform sampler2D uSim; uniform vec4 uSimBox; uniform sampler2D uWave; uniform vec4 uWaveBox; uniform float uWaveNz;
        uniform vec4 uRegion; uniform float uWaveT; uniform float uWaveA; uniform float uChop;
        varying float vDepth; varying float vFoam; varying float vCrest; varying float vSteep; varying vec2 vP; varying vec3 vWp; varying float vNear; varying float vEnergy; varying float vNy;
        vec4 simTexel(ivec2 c) { return texelFetch(uSim, clamp(c, ivec2(0), ivec2(int(uSimBox.w) - 1)), 0); }
        vec4 simAt(vec2 p) {
          vec2 g = (p - uSimBox.xy) / uSimBox.z - 0.5; vec2 i = floor(g); vec2 f = g - i; ivec2 c = ivec2(i);
          return mix(mix(simTexel(c), simTexel(c + ivec2(1, 0)), f.x), mix(simTexel(c + ivec2(0, 1)), simTexel(c + ivec2(1, 1)), f.x), f.y);
        }
        vec4 waveTexel(ivec2 c) { return texelFetch(uWave, clamp(c, ivec2(0), ivec2(int(uWaveBox.w) - 1, int(uWaveNz) - 1)), 0); }
        ${incomingGLSL}
      ` + sh.vertexShader.replace('#include <beginnormal_vertex>', `
        vec2 P = position.xz;
        vec4 s0 = simAt(P);
        float depth = s0.g;
        float sx = simAt(P + vec2(0.8, 0.0)).r - simAt(P - vec2(0.8, 0.0)).r, sz = simAt(P + vec2(0.0, 0.8)).r - simAt(P - vec2(0.0, 0.8)).r;
        vec2 gH = depth > 0.05 ? clamp(vec2(sx, sz) / 1.6, -0.6, 0.6) : vec2(0.0);
        float A = min(uWaveA, 0.5 * max(depth, 0.0));
        float eta; vec2 gW; float wf = 0.0; float nearO = 0.0, enO = 0.0;
        #ifdef DETAIL
          ivec2 wc = ivec2(floor((P - uWaveBox.xy) / uWaveBox.z));
          vec4 w0 = waveTexel(wc);
          eta = w0.r; wf = w0.g; nearO = w0.b; enO = w0.a;
          gW = vec2(waveTexel(wc + ivec2(1, 0)).r - waveTexel(wc - ivec2(1, 0)).r, waveTexel(wc + ivec2(0, 1)).r - waveTexel(wc - ivec2(0, 1)).r) / (2.0 * uWaveBox.z);
          // am Rand des feinen Gebiets keine seitliche Verschiebung (sonst Spalten zum groben Gitter)
          float edgeF = clamp(min(min(P.x - uRegion.x, uRegion.z - P.x), min(P.y - uRegion.y, uRegion.w - P.y)) / 3.0, 0.0, 1.0);
          // kurze, schnelle Windsee obendrauf (vom Wind aufgeworfen, läuft mit dem Wind)
          float cA = uChop * clamp(depth / 0.35, 0.0, 1.0) * edgeF;
          ${[[2.3, .97, .24, 0], [1.7, .85, -.53, 1.9], [2.9, .99, .1, 3.7]].map(([L, dx, dz, p0]) => {
            const k = 2 * Math.PI / L, w = Math.sqrt(9.81 * k);
            return `{ float q = P.x * ${(dx * k).toFixed(4)} + P.y * ${(dz * k).toFixed(4)} - uWaveT * ${w.toFixed(4)} + ${p0.toFixed(1)}; eta += cA * 0.33 * sin(q); gW += cA * 0.33 * cos(q) * vec2(${(dx * k).toFixed(4)}, ${(dz * k).toFixed(4)}); }`;
          }).join('\n          ')}
        #else
          eta = incoming(P, A);
          gW = vec2(incoming(P + vec2(0.4, 0.0), A) - incoming(P - vec2(0.4, 0.0), A), incoming(P + vec2(0.0, 0.4), A) - incoming(P - vec2(0.0, 0.4), A)) / 0.8;
          float edgeF = 0.0;
        #endif
        vec3 objectNormal = normalize(vec3(-(gH.x + gW.x), 1.0, -(gH.y + gW.y)));
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3( tangent.xyz );
        #endif`).replace('#include <begin_vertex>', `
        vec3 transformed = vec3(P.x, s0.r + eta, P.y);
        // spitze Kämme, flache Täler: Punkte rücken zum Kamm hin (wie bei echten Sturmwellen)
        transformed.xz -= gW * 0.85 * edgeF;
        #ifndef DETAIL
          transformed.y -= 0.03;
        #endif
        vNear = nearO; vEnergy = enO; vNy = objectNormal.y; vDepth = depth; vFoam = max(s0.b, wf); vCrest = A > 0.02 ? eta / A : 0.0; vSteep = length(gW); vP = P; vWp = transformed;`);
      sh.fragmentShader = `
        uniform float uWaveT; uniform float uStormS; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec4 uHouse; uniform vec4 uRegion;
        varying float vDepth; varying float vFoam; varying float vCrest; varying float vSteep; varying vec2 vP; varying vec3 vWp; varying float vNear; varying float vEnergy; varying float vNy;
        float fHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float fNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(fHash(i), fHash(i + vec2(1, 0)), f.x), mix(fHash(i + vec2(0, 1)), fHash(i + vec2(1, 1)), f.x), f.y); }
      ` + sh.fragmentShader.replace('void main() {', `void main() {
        #ifndef DETAIL
          if (vP.x > uRegion.x + 1.0 && vP.x < uRegion.z - 1.0 && vP.y > uRegion.y + 1.0 && vP.y < uRegion.w - 1.0) discard;
        #endif`).replace('#include <map_fragment>', `#include <map_fragment>
        // lehmiges Flutwasser: flach heller ockerbraun, tief dunkel; Kämme werden vom Licht durchschienen
        diffuseColor.rgb = mix(uShallow, uDeep, smoothstep(0.1, 1.4, vDepth)) * (1.0 + 0.22 * clamp(vCrest, 0.0, 1.0) * uStormS);`)
        .replace(/#include <output_fragment>(?![\s\S]*#include <output_fragment>)/, `
        vec2 fp = vWp.xz;
        float n1 = fNoise(fp * 1.5 + vec2(uWaveT * 0.6, 0.0)), n2 = fNoise(fp * 4.3 + vec2(3.0, uWaveT * 0.9));
        float fn = n1 * 0.6 + n2 * 0.4;
        // Schaumkronen auf steilen Kämmen, Gischt an Hindernissen und Brechern (aus der Simulation),
        // Schaumstreifen in Windrichtung, Saum an der flachen Wasserkante
        float cap = smoothstep(0.16, 0.34, vSteep) * smoothstep(0.2, 0.8, vCrest) * uStormS;
        // Saum an Hindernissen: je mehr Wellenenergie dort ankommt, desto mehr kocht das Wasser an Wand, Sockel und Stamm
        float ring = pow(vNear, 1.3) * clamp(vEnergy * 3.5, 0.0, 1.0) * (0.35 + 0.65 * uStormS) * step(0.08, vDepth);
        float streak = smoothstep(0.64, 0.82, fNoise(vec2(fp.x * 0.11 - uWaveT * 0.5, fp.y * 1.3))) * uStormS * 0.35;
        float edge = (1.0 - smoothstep(0.03, 0.22, vDepth)) * step(0.0, vDepth) * 0.5;
        float fAmt = clamp(vFoam * 0.9 + cap + ring + streak + edge, 0.0, 1.0);
        float fm = smoothstep(1.0 - fAmt * 0.75, 1.1 - fAmt * 0.5, fn) * fAmt;
        // Wellenrelief: steile Flanken dunkler, Kämme heller (sonst bügelt die graue Himmelsspiegelung alles flach)
        outgoingLight *= mix(0.62, 1.12, pow(clamp(vNy, 0.0, 1.0), 8.0)) * (0.88 + 0.24 * clamp(vCrest * 0.5 + 0.5, 0.0, 1.0));
        outgoingLight = mix(outgoingLight, vec3(0.33, 0.31, 0.27), fm * 0.88);
        diffuseColor.a = opacity * smoothstep(0.0, 0.07, vDepth);
        #include <output_fragment>`);
    };
    if (detail) m.defines = { DETAIL: '' };
    m.customProgramCacheKey = () => 'flut2' + (detail ? 'd' : 'c');
    return m;
  }
  function gridGeo(x0, z0, x1, z1, nx, nz) {
    const g = new THREE.BufferGeometry(), pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), nor = new Float32Array(nx * nz * 3);
    const sx = (x1 - x0) / nx, sz = (z1 - z0) / nz;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i, x = i === 0 ? x0 : i === nx - 1 ? x1 : x0 + (i + .5) * sx, z = j === 0 ? z0 : j === nz - 1 ? z1 : z0 + (j + .5) * sz;
      pos[k * 3] = x; pos[k * 3 + 2] = z; nor[k * 3 + 1] = 1; uv[k * 2] = x / 9; uv[k * 2 + 1] = z / 9;
    }
    const idx = new Uint32Array((nx - 1) * (nz - 1) * 6); let o = 0;
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, c = a + nx; idx.set([a, c, a + 1, a + 1, c, c + 1], o); o += 6; }
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return g;
  }
  const matC = makeWaterMat(false), matD = makeWaterMat(true);
  const surf = new THREE.Mesh(gridGeo(CX - HALF, CZ - HALF, CX + HALF, CZ + HALF, N, N), matC);
  const surfD = new THREE.Mesh(gridGeo(RX0, RZ0, RX1, RZ1, NX, NZ), matD);
  [surf, surfD].forEach((m, n) => { m.renderOrder = 6 + n; m.receiveShadow = true; m.visible = false; m.frustumCulled = false; m.userData.flut = true; parent.add(m); });

  // Fluss und ferne Flutfläche innerhalb des Gitters ausblenden, solange die Simulation läuft
  const CLIP = { value: new THREE.Vector4(0, CX, CZ, HALF) };
  // axis: in welcher lokalen Achse der Fläche „oben“ liegt (Fluss: y, gedrehte Flutfläche: z)
  function clipInside(m, axis) {
    const prev = m.onBeforeCompile, key = m.customProgramCacheKey();
    m.onBeforeCompile = (sh, r) => {
      prev(sh, r);
      sh.uniforms.uClip = CLIP; sh.uniforms.uWaveT = U.uWaveT; sh.uniforms.uWaveA = U.uWaveA;
      sh.vertexShader = 'varying vec3 vClipP;\nuniform vec4 uClip;\nuniform float uWaveT;\nuniform float uWaveA;\n' + incomingGLSL + '\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vClipP = (modelMatrix * vec4(transformed, 1.0)).xyz;
        // außerhalb des Simulationsgebiets: dieselben Sturmwellen (sonst liegt dort eine spiegelglatte Fläche)
        if (uClip.x > 0.5) { float wv = incoming(vClipP.xz, min(uWaveA, 0.45)); transformed.${axis} += wv; vClipP.y += wv; }`);
      sh.fragmentShader = 'uniform vec4 uClip;\nvarying vec3 vClipP;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n  if (uClip.x > 0.5 && abs(vClipP.x - uClip.y) < uClip.w && abs(vClipP.z - uClip.z) < uClip.w) discard;');
    };
    m.customProgramCacheKey = () => key + '|clip2' + axis;
    m.needsUpdate = true;
  }
  if (riverMesh) clipInside(riverMesh.material, 'y');
  clipInside(sheet.material, 'z');
  sheet.geometry.dispose(); sheet.geometry = new THREE.PlaneGeometry(700, 700, 240, 240);   // fein genug für die Wellen
  const riverCol0 = riverMesh ? riverMesh.material.color.clone() : null, MUD_COL = new THREE.Color(0x6a5638);

  /* ---------- Regen: Striche, die mit dem Wind schräg fallen (im Shader bewegt) ---------- */
  const DROPS = lite ? 3500 : 8000;
  const rg = new THREE.BufferGeometry();
  const rSeed = new Float32Array(DROPS * 4 * 3), rCorner = new Float32Array(DROPS * 4 * 2), rIdx = new Uint32Array(DROPS * 6);
  for (let d = 0; d < DROPS; d++) {
    const s = [Math.random(), Math.random(), Math.random()];
    for (let c = 0; c < 4; c++) { rSeed.set(s, (d * 4 + c) * 3); rCorner.set([c & 1 ? 1 : -1, c >> 1], (d * 4 + c) * 2); }
    rIdx.set([d * 4, d * 4 + 1, d * 4 + 2, d * 4 + 1, d * 4 + 3, d * 4 + 2], d * 6);
  }
  rg.setAttribute('position', new THREE.BufferAttribute(rSeed, 3)); rg.setAttribute('aCorner', new THREE.BufferAttribute(rCorner, 2)); rg.setIndex(new THREE.BufferAttribute(rIdx, 1));
  const RU = { uT: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(38, 38, 38) }, uWind: { value: new THREE.Vector2(3, .6) }, uRain: { value: 0 }, uCol: { value: new THREE.Color(.74, .78, .82) } };
  const rainMat = new THREE.ShaderMaterial({
    uniforms: RU, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
    vertexShader: `
      uniform float uT, uRain; uniform vec3 uCenter, uBox; uniform vec2 uWind;
      attribute vec2 aCorner; varying float vA;
      void main() {
        vec3 sd = position;
        vec3 vel = vec3(uWind.x * (0.8 + 0.4 * sd.z), -8.5 * (0.85 + 0.35 * sd.x), uWind.y);
        vec3 org = uCenter - uBox * 0.5;
        vec3 p = mod(sd * uBox + vel * uT - org, uBox) + org;
        vec3 dir = normalize(vel);
        vec3 tip = p - dir * length(vel) * 0.05 * aCorner.y;
        vec3 toCam = normalize(cameraPosition - tip);
        vec3 side = normalize(cross(dir, toCam));
        float dist = distance(cameraPosition, p);
        vec3 wp = tip + side * aCorner.x * (0.004 + dist * 0.00035);
        float on = step(fract(sd.x * 7.31 + sd.z * 3.17 + sd.y * 1.3), uRain);
        vA = on * (1.0 - aCorner.y * 0.7) * smoothstep(8.0, 16.0, dist) * (1.0 - smoothstep(34.0, 44.0, dist));
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`,
    fragmentShader: 'uniform vec3 uCol; varying float vA; void main() { gl_FragColor = vec4(uCol, vA * 0.3); }',
  });
  const rain = new THREE.Mesh(rg, rainMat); rain.frustumCulled = false; rain.renderOrder = 9; rain.visible = false; rain.userData.flut = true; parent.add(rain);

  /* ---------- Spritzwasser und Gischt (Partikel) ---------- */
  const MAXP = lite ? 900 : 2200;
  const pX = new Float32Array(MAXP), pY = new Float32Array(MAXP), pZ = new Float32Array(MAXP), vX = new Float32Array(MAXP), vY = new Float32Array(MAXP), vZ = new Float32Array(MAXP);
  const pAge = new Float32Array(MAXP), pLife = new Float32Array(MAXP), pS0 = new Float32Array(MAXP), pS1 = new Float32Array(MAXP), pA0 = new Float32Array(MAXP), pKind = new Uint8Array(MAXP);
  pLife.fill(0); let pNext = 0;
  const spTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const rg2 = g.createRadialGradient(32, 32, 2, 32, 32, 31); rg2.addColorStop(0, 'rgba(255,255,255,.9)'); rg2.addColorStop(.5, 'rgba(255,255,255,.45)'); rg2.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg2; g.fillRect(0, 0, 64, 64);
    for (let n = 0; n < 26; n++) { const a = Math.random() * 6.28, r = Math.random() * 24; g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(32 + Math.cos(a) * r, 32 + Math.sin(a) * r, 1 + Math.random() * 2.2, 0, 6.28); g.fill(); }
    const t = new THREE.CanvasTexture(c); return t;
  })();
  const pg = new THREE.InstancedBufferGeometry();
  const base = new THREE.PlaneGeometry(1, 1);
  pg.index = base.index; pg.setAttribute('position', base.attributes.position); pg.setAttribute('uv', base.attributes.uv);
  const iP = new THREE.InstancedBufferAttribute(new Float32Array(MAXP * 3), 3), iSA = new THREE.InstancedBufferAttribute(new Float32Array(MAXP * 2), 2);
  iP.setUsage(THREE.DynamicDrawUsage); iSA.setUsage(THREE.DynamicDrawUsage);
  pg.setAttribute('iP', iP); pg.setAttribute('iSA', iSA); pg.instanceCount = MAXP;
  const PU = { uTex: { value: spTex }, uCol: { value: new THREE.Color(.78, .75, .69) } };
  const pMat = new THREE.ShaderMaterial({
    uniforms: PU, transparent: true, depthWrite: false, fog: false,
    vertexShader: `attribute vec3 iP; attribute vec2 iSA; varying float vA; varying vec2 vUv;
      void main() {
        vec3 r = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), u = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vec3 wp = iP + (r * position.x + u * position.y) * iSA.x;
        vA = iSA.y; vUv = uv; gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`,
    fragmentShader: 'uniform sampler2D uTex; uniform vec3 uCol; varying float vA; varying vec2 vUv; void main() { vec4 t = texture2D(uTex, vUv); gl_FragColor = vec4(uCol, t.a * vA); }',
  });
  const spray = new THREE.Mesh(pg, pMat); spray.frustumCulled = false; spray.renderOrder = 8; spray.visible = false; spray.userData.flut = true; parent.add(spray);
  // kind 0 = Tropfen (fliegen hoch, fallen zurück), 1 = Gischtwolke (weht mit dem Wind, wächst)
  function emit(kind, x, y, z, vx, vy, vz, life, s0, s1, a0) {
    const n = pNext; pNext = (pNext + 1) % MAXP;
    pX[n] = x; pY[n] = y; pZ[n] = z; vX[n] = vx; vY[n] = vy; vZ[n] = vz; pAge[n] = 0; pLife[n] = life; pS0[n] = s0; pS1[n] = s1; pA0[n] = a0; pKind[n] = kind;
  }

  /* ---------- Treibgut: Wasserhyazinthen, Äste, Bambus und Stroh ---------- */
  const rr = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  function blobGeo() {
    const arrs = [];
    for (let n = 0; n < 4; n++) {
      const g = new THREE.IcosahedronGeometry(.22 + rr() * .12, 1), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (1 + (rr() - .5) * .3) + (n ? (rr() - .5) * .5 : 0), p.getY(i) * .45 + .04, p.getZ(i) * (1 + (rr() - .5) * .3) + (n ? (rr() - .5) * .5 : 0));
      arrs.push((g.index ? g.toNonIndexed() : g).attributes.position.array);
    }
    const out = new THREE.BufferGeometry(), all = new Float32Array(arrs.reduce((t, a) => t + a.length, 0));
    let off = 0; arrs.forEach(a => { all.set(a, off); off += a.length; });
    out.setAttribute('position', new THREE.BufferAttribute(all, 3)); out.computeVertexNormals(); return out;
  }
  const branchGeo = (() => { const g = new THREE.CylinderGeometry(.035, .05, 1.6, 6); g.rotateZ(Math.PI / 2); return g; })();
  const KINDS = [
    [blobGeo(), new THREE.MeshStandardMaterial({ color: 0x3c5126, roughness: .7, envMapIntensity: .5 }), lite ? 40 : 70],
    [branchGeo, new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: .9, envMapIntensity: .4 }), lite ? 14 : 24],
    [new THREE.BoxGeometry(1.1, .03, .08), new THREE.MeshStandardMaterial({ color: 0xa48e5a, roughness: .9, envMapIntensity: .4 }), lite ? 12 : 22],
  ];
  const debris = [], debrisMeshes = KINDS.map(([g, m, n], kind) => {
    const im = new THREE.InstancedMesh(g, m, n); im.receiveShadow = true; im.frustumCulled = false; im.visible = false; im.userData.flut = true; parent.add(im);
    for (let k = 0; k < n; k++) debris.push({ kind, k, x: 0, z: 0, rot: rr() * 6.28, spin: (rr() - .5) * .6, s: .7 + rr() * .6 });
    return im;
  });
  function spawn(d, anywhere) {
    for (let tries = 0; tries < 40; tries++) {
      const x = anywhere ? -45 + rr() * 80 : -70 + rr() * 85;
      const z = anywhere ? -30 + rr() * 50 : riverZ(x) + (rr() - .5) * 12;
      const k = cellAt(x, z); if (k >= 0 && h[k] > .25) { d.x = x; d.z = z; return; }
    }
    d.x = CX - HALF + 3; d.z = riverZ(d.x);
  }
  const wCell = (x, z) => { const i = Math.floor((x - RX0) / WDX), j = Math.floor((z - RZ0) / WDX); return i < 0 || j < 0 || i >= NX || j >= NZ ? -1 : j * NX + i; };

  /* ================= Zustand ================= */
  const WSTEP = 1 / 60; let waveAcc = 0;
  let sprayBudget = 0;
  let mode = 'idle', sT = 0, storm = 0, waveA = 0, houseMax = 0, doneAt = -1, swellT = 0, lastT = 0, simT = 0;
  const houseK = cellAt(house[0], house[1]);
  const hm = new THREE.Matrix4(), hq = new THREE.Quaternion(), hp = new THREE.Vector3(), hs = new THREE.Vector3(), he = new THREE.Euler();
  // Aufprall am eigenen Haus, je Seite: höchster Wellenkamm (m über dem Pegel), Treffer, Spritzhöhe
  const impact = {};
  const resetImpact = () => ['fluss', 'tuer', 'west', 'ost'].forEach(s => { impact[s] = { crest: 0, hits: 0, splash: 0 }; });
  resetImpact();

  function reset(filled) {
    qx.fill(0); qz.fill(0); foam.fill(0); eta.fill(0); etaP.fill(0); wFoam.fill(0); energy.fill(0); riseS.fill(0); waveAcc = 0; sprayBudget = 0; cool.fill(0); pLife.fill(0);
    for (let k = 0; k < NN; k++) { const lvl = filled ? FLOOD_H : chan[k] ? RIVER_Y : pondC[k] ? -.46 : -99; h[k] = Math.max(0, lvl - b[k]); prevH[k] = h[k]; }
    debris.forEach(d => spawn(d, filled));
    houseMax = filled ? FLOOD_H : 0; doneAt = filled ? 0 : -1; resetImpact();
    try { buildObstacles(); } catch (e) { console.warn('Hindernisse nicht erkannt:', e); }
    U.uHouse.value.set(0, 0, ctx.foot()[0] / 2, ctx.foot()[1] / 2);
  }
  function start() { mode = 'run'; sT = 0; reset(false); show(true); }
  function fill() {
    if (mode === 'hold') return;
    if (mode === 'run' && doneAt >= 0) { mode = 'hold'; return; }
    mode = 'hold'; sT = T_END + 6; storm = 1; reset(true); show(true);
  }
  function clear(animate) {
    if (mode === 'idle') return;
    if (animate) { mode = 'drain'; return; }
    mode = 'idle'; storm = 0; apply(0, 0); show(false);
  }
  function show(on) {
    [surf, surfD, rain, spray, ...debrisMeshes].forEach(m => { m.visible = on; m.userData.keep = true; });   // V3: bleiben in der Char-Welt erhalten
    CLIP.value.x = on ? 1 : 0;
    if (!on) { sheet.visible = false; if (riverMesh) { riverMesh.position.y = 0; riverMesh.material.color.copy(riverCol0); } }
  }
  function apply(S, R) {
    STORM.value = S; RAIN.value = R; RU.uRain.value = R;
    WET.value = Math.min(1, Math.max(WET.value * (R > .05 ? 1 : .995), R * 1.3));
  }

  /* ================= je Bild ================= */
  function step(dt, t, camTarget) {
    lastT = t;
    if (mode === 'idle') return;
    swellT += dt;
    let S, R, rainRate = 0, relax = 0;
    if (mode === 'run') {
      sT += dt;
      S = sstep(0, 10, sT);
      R = sstep(1, 6.5, sT) * (.85 + .15 * Math.sin(sT * .7));
      rainRate = .0016 * R;
      relax = sT > T_END ? .35 : 0;
      if (sT > T_END + 8) mode = 'hold';
    } else if (mode === 'hold') {
      S = 1; R = .88 + .12 * Math.sin(swellT * .7); rainRate = .0005; relax = .5;
    } else {
      storm = Math.max(0, storm - dt * .35); S = storm; R = storm;
      let wet = 0;
      for (let k = 0; k < NN; k++) { const tgt = Math.max(0, (chan[k] ? RIVER_Y : pondC[k] ? -.46 : -99) - b[k]); if (h[k] > tgt) { h[k] = Math.max(tgt, h[k] - dt * .7); wet++; } }
      qx.fill(0); qz.fill(0);
      if (storm <= 0 && wet === 0) { clear(false); return; }
    }
    if (mode !== 'drain') {
      storm = S;
      const sub = Math.max(1, Math.ceil(dt / .03)), sd = dt / sub;
      for (let n = 0; n < sub; n++) simStep(sd, mode === 'hold' ? T_END + 6 : sT - dt + sd * (n + 1), rainRate, relax);
    }
    apply(S, R);

    // Sturmwellen: Höhe wächst mit dem Sturm, Böen machen sie größer (Wellenhöhe Kamm–Tal bis etwa 0,7 m)
    const Gw = ctx.windAt(camTarget.x, camTarget.z, t), gust = Math.max(0, Math.min(1, Gw / (1 + .9 * S) - .75));
    waveA += ((.06 + .44 * S * (.85 + .3 * gust)) - waveA) * Math.min(1, dt * .8);
    U.uChop.value = .025 + .05 * S;
    // feste Zeitschritte (1/60 s): gleiches Verhalten bei 60 Bildern/s am Fernseher wie im langsamen Testfenster
    waveAcc = Math.min(waveAcc + dt, WSTEP * 4);
    let wsub = 0;
    while (waveAcc >= WSTEP) { waveAcc -= WSTEP; simT += WSTEP; waveStep(WSTEP, simT, waveA); wsub++; }

    // Pegel am Haus (vor der Tür)
    const hk = houseK >= 0 && h[houseK] > .04 ? Math.max(0, b[houseK] + h[houseK]) : 0;
    houseMax = Math.max(houseMax, Math.min(FLOOD_H, hk));
    if (houseMax >= FLOOD_H - .02 && doneAt < 0) doneAt = sT;

    // Fluss außerhalb des Gitters und ferne Flutfläche
    const Lr = mode === 'hold' ? FLOOD_H : mode === 'drain' ? RIVER_Y + (FLOOD_H - RIVER_Y) * storm : riverLevel(sT);
    const muddy = mode === 'run' ? sstep(0, 10, sT) : mode === 'hold' ? 1 : storm;
    if (riverMesh) { riverMesh.position.y = Lr - RIVER_Y - .03; riverMesh.material.color.copy(riverCol0).lerp(MUD_COL, muddy * .85); }
    const Fs = mode === 'hold' ? FLOOD_H : mode === 'drain' ? -1 + 2 * storm : farLevel(sT, 45);
    sheet.visible = Fs > -.9; sheet.position.y = Fs - .02;
    U.uDeep.value.copy(RIVER_COL).lerp(MUD_DEEP, muddy); U.uShallow.value.copy(RIVER_COL).multiplyScalar(1.4).lerp(MUD_SHALLOW, muddy);
    U.uWaveT.value = simT; U.uWaveA.value = waveA; U.uStormS.value = S;
    [matC, matD].forEach(m => m.normalScale.setScalar(.3 + .45 * S));
    if (sheet.material.normalScale) sheet.material.normalScale.setScalar(.3 + .5 * S);
    wn.offset.set(t * .007, t * .016);

    // Daten in die Texturen
    const fdec = Math.exp(-dt / 1.4);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i, hh = h[k], o = k * 4;
      const ux = ((i > 0 ? qx[k - 1] : 0) + qx[k]) * .5, uz = ((j > 0 ? qz[k - N] : 0) + qz[k]) * .5;
      const sp = hh > .03 ? Math.hypot(ux, uz) / hh : 0;
      const rise = hh > .03 && prevH[k] > .03 ? Math.max(0, hh - prevH[k]) / Math.max(dt, .001) : 0;
      riseS[k] += (rise - riseS[k]) * Math.min(1, dt * 2); prevH[k] = hh;
      foam[k] = Math.max(foam[k] * fdec, Math.min(1, Math.max(0, sp - 1.1) * .45 + Math.max(0, riseS[k] - .05) * 1.4));
      const wet = hh > .004;
      simData[o] = wet ? b[k] + hh : b[k] - .7; simData[o + 1] = wet ? hh : -.4; simData[o + 2] = foam[k]; simData[o + 3] = sp;
    }
    simTex.needsUpdate = true;
    const wdec = Math.exp(-dt / 1.1);
    for (let j = 1; j < NZ - 1; j++) for (let i = 1; i < NX - 1; i++) {
      const k = j * NX + i;
      const gx = (eta[k + 1] - eta[k - 1]) / (2 * WDX), gz = (eta[k + NX] - eta[k - NX]) / (2 * WDX), st = Math.hypot(gx, gz);
      wFoam[k] = Math.max(wFoam[k] * wdec, st > .26 ? Math.min(.8, (st - .26) * 2) * S : 0);
    }
    const edec = Math.exp(-dt / 2.5);
    for (let k = 0; k < NW; k++) {
      const o = k * 4; energy[k] = Math.max(energy[k] * edec, Math.abs(eta[k]));
      waveData[o] = obst[k] ? 0 : eta[k]; waveData[o + 1] = wFoam[k]; waveData[o + 2] = obst[k] ? 0 : near[k]; waveData[o + 3] = energy[k];
    }
    waveTex.needsUpdate = true;

    // Aufprall an Wänden: steigt das Wasser an einer Wand schnell, schießt Spritzwasser hoch (Höhe aus Wellenhöhe und Tempo)
    sprayBudget = Math.min(sprayBudget + dt * (lite ? 220 : 520), lite ? 60 : 140);   // Tropfen pro Sekunde
    let budget = Math.floor(sprayBudget);
    Object.values(impact).forEach(s => { s.crest *= Math.exp(-dt / 6); s.splash *= Math.exp(-dt / 6); });
    // erst die Wände des eigenen Hauses, dann die übrigen Hindernisse in zufälliger Reihenfolge
    const nh = houseWallCount, order = walls.length > nh ? Math.floor(Math.random() * (walls.length - nh)) : 0;
    for (let n = 0; n < walls.length; n++) {
      const wcl = n < nh ? walls[n] : walls[nh + (n - nh + order) % (walls.length - nh)], k = wcl.k;
      cool[k] -= dt;
      const d = dW[k]; if (d < .12) continue;
      const e = eta[k], ev = (e - etaP[k]) / WSTEP;
      if (wcl.side && e > impact[wcl.side].crest) impact[wcl.side].crest = e;
      if (e > .1 && ev > .45 && cool[k] <= 0) {
        cool[k] = 1.6;
        wFoam[k] = 1;
        const I = Math.min(1.6, e * 2.2 + ev * .25), up = 1.2 + ev * 1.6 + e * 6;
        if (wcl.side) { impact[wcl.side].hits++; impact[wcl.side].splash = Math.max(impact[wcl.side].splash, up * up / (2 * G)); }
        if (budget <= 0 || (!wcl.side && Math.random() > .35)) continue;
        const x = wx(k % NX), z = wz(Math.floor(k / NX)), y = hW[k] + e;
        const cnt = Math.min(budget, Math.round((wcl.side ? 4 : 2) + (wcl.side ? 9 : 4) * I)); budget -= cnt; sprayBudget -= cnt;
        for (let c = 0; c < cnt; c++) {
          const sp = .4 + Math.random() * 1.4;
          emit(0, x + (Math.random() - .5) * WDX, y, z + (Math.random() - .5) * WDX,
            wcl.nx * sp + (Math.random() - .5) * .8 + 1.2 * S, up * (.5 + Math.random() * .6), wcl.nz * sp + (Math.random() - .5) * .8,
            .8 + Math.random() * .7, .25 + Math.random() * .2, .5 + Math.random() * .4, .9);
        }
        // Gischtschleier, der an der Wand hochsteigt und vom Wind weggerissen wird
        const veil = wcl.side && I > .7 && Math.random() < .5 ? 1 : 0;
        for (let c = 0; c < veil; c++) emit(1, x + (Math.random() - .5), y + .2 + c * .4, z + (Math.random() - .5), 1.5 * S + wcl.nx * .6, .5 + up * .15, wcl.nz * .6, 1.2 + Math.random() * .6, .7, 1.6 + I * .8, .18);
      }
    }
    // Gischt, die der Sturm von den Kämmen reißt
    if (S > .5) for (let n = 0, tries = Math.round(dt * 60 * (lite ? 2 : 4)); n < tries; n++) {
      const i = 2 + Math.floor(Math.random() * (NX - 4)), j = 2 + Math.floor(Math.random() * (NZ - 4)), k = j * NX + i;
      if (obst[k] || dW[k] < .3 || wFoam[k] < .6 || Math.random() > .5 * S) continue;
      emit(1, wx(i), hW[k] + eta[k] + .05, wz(j), 4 + 3 * gust * S, .2 + Math.random() * .3, .5, .7 + Math.random() * .5, .25, .9, .12);
    }
    // Partikel bewegen
    for (let n = 0; n < MAXP; n++) {
      const o3 = n * 3, o2 = n * 2;
      if (pAge[n] >= pLife[n]) { iSA.array[o2] = 0; iSA.array[o2 + 1] = 0; continue; }
      pAge[n] += dt;
      const u = pAge[n] / pLife[n];
      if (pKind[n] === 0) { vY[n] -= G * dt; vX[n] *= 1 - .4 * dt; vZ[n] *= 1 - .4 * dt; }
      else { vY[n] -= .4 * dt; vX[n] += (4 * S - vX[n]) * dt * .8; }
      pX[n] += vX[n] * dt; pY[n] += vY[n] * dt; pZ[n] += vZ[n] * dt;
      iP.array[o3] = pX[n]; iP.array[o3 + 1] = pY[n]; iP.array[o3 + 2] = pZ[n];
      iSA.array[o2] = pS0[n] + (pS1[n] - pS0[n]) * u; iSA.array[o2 + 1] = pA0[n] * (1 - u) * Math.min(1, u * 8);
    }
    iP.needsUpdate = iSA.needsUpdate = true;

    // Regen im Blickkegel der Kamera (6 … 43 m vor der Linse); die Tropfen bleiben dabei fest in der Welt
    RU.uT.value = t;
    camera.getWorldDirection(RU.uCenter.value); RU.uCenter.value.multiplyScalar(24).add(camera.position);
    RU.uWind.value.set(1.5 + 4.5 * S * Gw * .7, .6);

    // Treibgut: schwimmt mit Strömung, wird von den Wellen geschoben, prallt an Hindernissen ab, strandet im Trockenen
    debris.forEach(d => {
      const k = cellAt(d.x, d.z);
      if (k < 0 || d.x > 60) { spawn(d, houseMax > .3); return; }
      const hh = h[k], i = k % N, j = (k - i) / N;
      const wk = wCell(d.x, d.z);
      let wave = 0;
      if (hh > .12) {
        const ux = ((i > 0 ? qx[k - 1] : 0) + qx[k]) * .5 / hh, uz = ((j > 0 ? qz[k - N] : 0) + qz[k]) * .5 / hh;
        const lim = v => Math.max(-3, Math.min(3, v));
        const nx = d.x + dt * (lim(ux) + (.25 + .35 * DIRM[0]) * S), nz = d.z + dt * (lim(uz) + .35 * DIRM[1] * S);
        const nk = wCell(nx, nz);
        if (nk >= 0 && obst[nk]) { d.spin = -d.spin; d.x -= dt * DIRM[0]; d.z -= dt * DIRM[1]; } else { d.x = nx; d.z = nz; }
        d.rot += dt * d.spin;
        wave = wk >= 0 ? eta[wk] : incoming(d.x, d.z, simT, Math.min(waveA, depthCap(hh)));
      }
      const y = b[k] + hh + (hh > .12 ? wave : -.05);
      let tilt = .1;
      if (hh > .12 && wk > NX && wk < NW - NX) tilt = Math.atan((eta[wk + 1] - eta[wk - 1]) / (2 * WDX));
      hp.set(d.x, y, d.z); hq.setFromEuler(he.set(tilt * .8, d.rot, -tilt)); hs.setScalar(hh > .02 ? d.s : 0);
      debrisMeshes[d.kind].setMatrixAt(d.k, hm.compose(hp, hq, hs));
    });
    debrisMeshes.forEach(m => { m.instanceMatrix.needsUpdate = true; });
  }

  function info() {
    const phase = mode === 'hold' || doneAt >= 0 ? 4 : houseMax > 0 ? 3 : sT >= 6 ? 2 : sT >= 3 ? 1 : 0;
    const out = {};
    Object.entries(impact).forEach(([k, v]) => { out[k] = { crest: +v.crest.toFixed(2), hits: v.hits, splash: +v.splash.toFixed(2) }; });
    return {
      level: houseMax, done: mode === 'hold' || (mode === 'run' && doneAt >= 0 && sT >= doneAt + 1.5), phase, phaseText: PHASES[phase], time: sT, mode,
      // Für die Schadens-Simulation: Wellen am Haus je Seite (crest = höchster Kamm über dem Pegel in m, mit 6 s Abklingen;
      // hits = Zahl der Wellenschläge; splash = Spritzhöhe in m), dazu die aktuelle Wellenhöhe draußen (Kamm–Tal, m)
      impact: out, waveHeight: +(2 * waveA).toFixed(2), storm: +storm.toFixed(2),
      grid: { obstacles: obst.reduce((t, v) => t + v, 0), walls: walls.length, houseWalls: walls.filter(w => w.side).length, maxWave: +eta.reduce((m, v) => Math.max(m, Math.abs(v)), 0).toFixed(2), spray: pLife.reduce((t, l, n) => t + (pAge[n] < l ? 1 : 0), 0) },
    };
  }
  // Zum Testen: Simulation bis Sekunde s vorspulen (ohne Bilder)
  function forward(s) { if (mode !== 'run') start(); while (sT < s) step(1 / 30, lastT + 1 / 30, { x: 0, z: 0 }); }

  // Für das Schadensmodell (schaden.js): Wasserspiegel und Strömung (m/s) an einer Stelle
  function levelAt(x, z) { if (mode === 'idle') return -99; const k = cellAt(x, z); return k >= 0 && h[k] > .02 ? b[k] + h[k] : -99; }
  function flowAt(x, z) {
    const k = cellAt(x, z); if (mode === 'idle' || k < 0 || h[k] < .05) return [0, 0];
    const i = k % N, j = (k - i) / N, lim = v => Math.max(-2.5, Math.min(2.5, v));
    return [lim(((i > 0 ? qx[k - 1] : 0) + qx[k]) * .5 / h[k]), lim(((j > 0 ? qz[k - N] : 0) + qz[k]) * .5 / h[k])];
  }
  // Blick durchs Wasser (Ergebnis): k = 0 normal, 1 fast durchsichtig. Die Flutfläche außerhalb des Gitters (sheet) regelt haus3d.js mit.
  function setClarity(k) { matC.opacity = matD.opacity = 1 - .76 * k; }
  // Zum Testen: Karte von oben (rot = Hindernis, blau = laut Flut trocken, grau = Wellenhöhe), Norden (Fluss) oben
  function debugMap() {
    const c = document.createElement('canvas'); c.width = NX; c.height = NZ; const g = c.getContext('2d'), img = g.createImageData(NX, NZ);
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const k = j * NX + i, o = (j * NX + i) * 4, v = Math.min(255, Math.abs(eta[k]) * 600);
      if (obst[k]) img.data.set([220, 40, 40, 255], o); else if (dW[k] < .05) img.data.set([40, 60, 200, 255], o); else img.data.set([v, v, v, 255], o);
    }
    g.putImageData(img, 0, 0); return c.toDataURL();
  }
  return { start, fill, clear, step, info, forward, levelAt, flowAt, setClarity, debugMap, active: () => mode !== 'idle' };
};
