// 3D-Haus für Version 2 (three.js). Putz, Ziegel, Dachziegel, Holz und Rinde kommen aus den Quaternius-Kits (vendor/texturen.js),
// alles andere wird hier im selben gemalten Stil auf Canvas gezeichnet.
// Maße in Metern. Das Haus ist 6 × 4,2 m groß (25 m²), die Tür liegt vorn (+z).
//
//   const stage = Haus3D.create(canvas);
//   stage.setHouse({ foundation: 'brick', wall: 'brickwall', roof: 'tinhip', extra: null });
//   stage.focus('roof');
//
const Haus3D = (() => {
  const M = 56;                       // Einheiten der Hausgrafik pro Meter (lift/raise aus daten.js)
  const W = 6, D = 4.2, H = 2.4;      // Breite, Tiefe, Wandhöhe
  const SITE_W = 10.8, SITE_D = 9.0;  // Grundstück (Erdblock unter dem Haus)
  const PLATFORM_H = 2.0;
  // Ordner dieser Datei (zum Nachladen der Modelle aus vendor/)
  const BASE = new URL('../spiel2/', document.currentScript.src).href;   // V3 nutzt die Bibliotheken und Modelle von spiel2

  // Lädt den glTF-Lader und die eingebetteten Modelle (vendor/natur.js) per <script>, das klappt auch ohne Server.
  let naturPromise = null;
  function loadNatur() {
    if (naturPromise) return naturPromise;
    const script = src => new Promise((ok, fail) => { const el = document.createElement('script'); el.src = BASE + src; el.onload = ok; el.onerror = fail; document.head.appendChild(el); });
    naturPromise = (THREE.GLTFLoader ? Promise.resolve() : script('vendor/three-gltf.js'))
      .then(() => (window.HAUS_NATUR_GLB ? null : script('vendor/natur.js')))
      .then(() => new Promise((ok, fail) => {
        const bin = atob(window.HAUS_NATUR_GLB), buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        new THREE.GLTFLoader().parse(buf.buffer, '', ok, fail);
      }));
    return naturPromise;
  }
  const FLOOD_H = 1.0;
  let CHAR = false;   // V3: Char-Welt (Sandinsel mitten im Fluss) statt Uferdorf; wird in create(canvas, { char }) gesetzt

  /* ---------- kleine Helfer ---------- */

  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  function makeTex(draw, { w = 512, h = 512, srgb = true, seed = 1 } = {}) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    draw(g, w, h, rng(seed));
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.encoding = THREE.sRGBEncoding;
    return t;
  }

  // Punkt/Ellipse, die über den Rand hinaus auf der anderen Seite weitergemalt wird (damit die Kachel nahtlos bleibt).
  function wrapped(g, w, h, x, y, rx, ry, fn) {
    const xs = [0], ys = [0];
    if (x - rx < 0) xs.push(w); if (x + rx > w) xs.push(-w);
    if (y - ry < 0) ys.push(h); if (y + ry > h) ys.push(-h);
    xs.forEach(dx => ys.forEach(dy => fn(x + dx, y + dy)));
  }

  function speckle(g, w, h, r, count, minR, maxR, colors, alpha = 1) {
    for (let i = 0; i < count; i++) {
      const x = r() * w, y = r() * h, rad = minR + r() * (maxR - minR);
      g.fillStyle = colors[Math.floor(r() * colors.length)];
      g.globalAlpha = alpha * (.4 + r() * .6);
      wrapped(g, w, h, x, y, rad, rad, (px, py) => { g.beginPath(); g.arc(px, py, rad, 0, 7); g.fill(); });
    }
    g.globalAlpha = 1;
  }

  // Farbe mit anderer Deckkraft (Hex oder rgba)
  function withAlpha(c, a) {
    if (c[0] === '#') { const n = parseInt(c.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
    const m = c.match(/rgba?\(([^)]+)\)/).slice(1)[0].split(',').map(Number);
    return `rgba(${m[0]},${m[1]},${m[2]},${a * (m[3] == null ? 1 : m[3])})`;
  }

  function blotches(g, w, h, r, count, colors, minR, maxR, alpha) {
    for (let i = 0; i < count; i++) {
      const x = r() * w, y = r() * h, rad = minR + r() * (maxR - minR), col = colors[Math.floor(r() * colors.length)];
      wrapped(g, w, h, x, y, rad, rad, (px, py) => {
        const grad = g.createRadialGradient(px, py, 0, px, py, rad);
        grad.addColorStop(0, withAlpha(col, alpha)); grad.addColorStop(.45, withAlpha(col, alpha * .55)); grad.addColorStop(.75, withAlpha(col, alpha * .15)); grad.addColorStop(1, withAlpha(col, 0));
        g.fillStyle = grad; g.fillRect(px - rad, py - rad, rad * 2, rad * 2);
      });
    }
  }

  const hsl = (h, s, l) => `hsl(${h} ${s}% ${l}%)`;

  /* ---------- Materialien ---------- */
  // Jede Textur hat eine Farb- und (wo es Relief gibt) eine Höhenzeichnung. Aus der Höhe wird eine Normal-Map,
  // damit Ziegel, Bretter, Fugen und Halme im Licht plastisch wirken (wie bei einem sauberen Architektur-Rendering).

  // Höhen-Canvas (grau) -> Normal-Map. strength: wie stark das Relief wirkt.
  function normalFromHeight(hc, strength = 2) {
    const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const og = out.getContext('2d'), img = og.createImageData(w, h), d = img.data;
    const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength;
      const nx = -dx, ny = dy, len = Math.hypot(nx, ny, 1), i = (y * w + x) * 4;
      d[i] = (nx / len * .5 + .5) * 255; d[i + 1] = (ny / len * .5 + .5) * 255; d[i + 2] = (1 / len * .5 + .5) * 255; d[i + 3] = 255;
    }
    og.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(out);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    return t;
  }

  // Gegen Flimmern feiner Rillen (Wellblech): Werden die Wellen auf dem Bildschirm kleiner als ein paar Pixel,
  // wird die Normal-Map ausgeblendet und die Oberfläche matter, statt dass die Glanzlichter bei jeder Bewegung springen.
  function antiShimmer(mat, wavesPerUnit) {
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => {
      if (prev) prev(sh, r);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          float shimmerFade = 1.0 - smoothstep(0.12, 0.42, length(fwidth(vUv)) * ${wavesPerUnit.toFixed(1)});
          roughnessFactor = mix(max(roughnessFactor, 0.72), roughnessFactor, shimmerFade);`)
        .replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * shimmerFade;');
    };
    mat.customProgramCacheKey = () => 'shimmer' + wavesPerUnit + (mat.vertexColors ? 'v' : '');
    return mat;
  }

  // Zeichnet Farbe (g) und Höhe (hg) zugleich. Ergebnis: { map, normal }.
  function makeSet(draw, { w = 512, h = 512, seed = 1, strength = 2, base = 128 } = {}) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const hc = document.createElement('canvas'); hc.width = w; hc.height = h;
    const g = c.getContext('2d'), hg = hc.getContext('2d');
    hg.fillStyle = `rgb(${base},${base},${base})`; hg.fillRect(0, 0, w, h);
    draw(g, hg, w, h, rng(seed));
    const map = new THREE.CanvasTexture(c);
    map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 8; map.encoding = THREE.sRGBEncoding;
    return { map, normal: normalFromHeight(hc, strength) };
  }
  const grey = v => { v = Math.max(0, Math.min(255, Math.round(v))); return `rgb(${v},${v},${v})`; };

  // Rechteck mit weicher Kante in der Höhenkarte (Fase): außen dunkel, innen hell.
  function bevelRect(hg, x, y, w, h, lo, hi, steps = 4, step = 1.5) {
    for (let k = 0; k < steps; k++) {
      hg.fillStyle = grey(lo + (hi - lo) * (k + 1) / steps);
      hg.fillRect(x + k * step, y + k * step, w - 2 * k * step, h - 2 * k * step);
    }
  }

  // feines Rauschen in der Höhenkarte
  function heightNoise(hg, w, h, r, count, amp, maxR = 2) {
    for (let i = 0; i < count; i++) {
      const v = 128 + (r() - .5) * 2 * amp;
      hg.fillStyle = grey(v); hg.globalAlpha = .5;
      const x = r() * w, y = r() * h, rad = .5 + r() * maxR;
      hg.beginPath(); hg.arc(x, y, rad, 0, 7); hg.fill();
    }
    hg.globalAlpha = 1;
  }

  // Kachelbares Wertrauschen in mehreren Oktaven (0..1). Wirkt natürlich, ohne die runden Flecken von Kreis-Verläufen.
  function noiseField(w, h, r, cx = 8, cy = cx, oct = 5, persist = .5) {
    const out = new Float32Array(w * h); let amp = 1, tot = 0;
    for (let o = 0; o < oct; o++) {
      const ncx = cx << o, ncy = cy << o, lat = new Float32Array(ncx * ncy);
      for (let i = 0; i < lat.length; i++) lat[i] = r();
      for (let y = 0; y < h; y++) {
        const fy = y / h * ncy, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty), y1 = (y0 + 1) % ncy;
        for (let x = 0; x < w; x++) {
          const fx = x / w * ncx, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx), x1 = (x0 + 1) % ncx;
          const a = lat[y0 * ncx + x0], b = lat[y0 * ncx + x1], c = lat[y1 * ncx + x0], d = lat[y1 * ncx + x1];
          out[y * w + x] += amp * ((a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy);
        }
      }
      tot += amp; amp *= persist;
    }
    for (let i = 0; i < out.length; i++) out[i] /= tot;
    return out;
  }
  const sstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  // Farbe dort einmischen, wo das Rauschen zwischen lo und hi liegt (weich)
  function mixField(g, w, h, field, rgb, strength, lo, hi) {
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < w * h; i++) {
      const k = sstep(lo, hi, field[i]) * strength;
      if (k <= 0) continue;
      d[i * 4] += (rgb[0] - d[i * 4]) * k; d[i * 4 + 1] += (rgb[1] - d[i * 4 + 1]) * k; d[i * 4 + 2] += (rgb[2] - d[i * 4 + 2]) * k;
    }
    g.putImageData(img, 0, 0);
  }
  // Rauschen in die Höhenkarte addieren (amp in Grauwerten)
  function addHeightField(hg, w, h, field, amp) {
    const img = hg.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < w * h; i++) { const v = d[i * 4] + (field[i] - .5) * 2 * amp; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; }
    hg.putImageData(img, 0, 0);
  }

  /* ---------- Texturen aus den Quaternius-Kits (vendor/texturen.js) ---------- */
  // Putz, Ziegel, Mönch-Nonne-Ziegel, Holz und Rinde kommen direkt aus dem Medieval Village / Stylized Nature MegaKit.
  // Das Pinsel-Rauschen des Kits (brushRaw) nutzen die selbst gemalten Texturen, damit sie im selben gemalten Stil
  // aussehen: flächige Farbfelder mit weichen Pinselkanten statt fotografischem Rauschen.
  const KIT = (() => {
    const src = window.HAUS_TEXTUREN;
    if (!src) return null;
    const imgs = {};
    const image = url => {
      if (imgs[url]) return imgs[url];
      const e = { img: new Image(), ok: false, wait: [] };
      e.img.onload = () => { e.ok = true; e.wait.forEach(t => { t.needsUpdate = true; }); e.wait = []; };
      e.img.src = url;
      return (imgs[url] = e);
    };
    const tex = (url, srgb, rx, ry, rot) => {
      const e = image(url), t = new THREE.Texture(e.img);
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.repeat.set(rx, ry);
      if (rot) { t.rotation = rot; t.center.set(.5, .5); }
      if (srgb) t.encoding = THREE.sRGBEncoding;
      if (e.ok) t.needsUpdate = true; else e.wait.push(t);
      return t;
    };
    let brush = null;
    if (src.brushRaw) { const b = atob(src.brushRaw); brush = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) brush[i] = b.charCodeAt(i); }
    return {
      brush,
      has: key => !!src[key],
      // { map, normal } mit eigener Wiederholung (eine Kachel = 1/rx Meter) und optional gedreht
      set: (key, rx = 1, ry = rx, rot = 0) => ({ map: tex(src[key].map, true, rx, ry, rot), normal: src[key].normal ? tex(src[key].normal, false, rx, ry, rot) : null }),
    };
  })();

  // Pinsel-Rauschen des Kits als Feld 0..1 (kachelnd, bilinear abgetastet). scale: wie oft es in die Kachel passt.
  function brushField(w, h, r, scale = 1, ox = r(), oy = r()) {
    if (!KIT || !KIT.brush) return noiseField(w, h, r, 4, 4, 4, .55);
    const S = 512, B = KIT.brush, out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const fy = ((y / h * scale + oy) % 1) * S, y0 = Math.floor(fy), ty = fy - y0, ya = (y0 % S) * S, yb = ((y0 + 1) % S) * S;
      for (let x = 0; x < w; x++) {
        const fx = ((x / w * scale + ox) % 1) * S, x0 = Math.floor(fx), tx = fx - x0, xa = x0 % S, xb = (x0 + 1) % S;
        out[y * w + x] = ((B[ya + xa] * (1 - tx) + B[ya + xb] * tx) * (1 - ty) + (B[yb + xa] * (1 - tx) + B[yb + xb] * tx) * ty) / 255;
      }
    }
    return out;
  }
  // Fläche nach einem Feld einfärben: stops = [[wert, [r,g,b]], ...] (aufsteigend), dazwischen weich gemischt
  function paintField(g, w, h, field, stops) {
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < w * h; i++) {
      const v = field[i]; let k = 0;
      while (k < stops.length - 2 && v > stops[k + 1][0]) k++;
      const [a, ca] = stops[k], [b, cb] = stops[k + 1], t = sstep(a, b, v);
      d[i * 4] = ca[0] + (cb[0] - ca[0]) * t; d[i * 4 + 1] = ca[1] + (cb[1] - ca[1]) * t; d[i * 4 + 2] = ca[2] + (cb[2] - ca[2]) * t; d[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  // Stein im Kit-Stil: flache Farbe, heller Kantenstrich oben, dunkle Kante unten (wie T_Brick / T_UnevenBrick)
  function paintedStone(g, hg, x, y, rx, ry, rot, base, r) {
    const pts = []; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + r() * .4, rr = .78 + r() * .3; pts.push([Math.cos(a) * rx * rr, Math.sin(a) * ry * rr]); }
    const path = (c, ox = 0, oy = 0, s = 1) => { c.save(); c.translate(x + ox, y + oy); c.rotate(rot); c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px * s, py * s) : c.moveTo(px * s, py * s))); c.closePath(); c.restore(); };
    g.fillStyle = `rgba(40,30,20,.35)`; path(g, 1, 2.2); g.fill();
    g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`; path(g); g.fill();
    g.fillStyle = `rgba(${base[0] - 40},${base[1] - 40},${base[2] - 40},.35)`; path(g, rx * .1, ry * .25, .8); g.fill();
    g.fillStyle = `rgba(255,250,235,.28)`; path(g, -rx * .12, -ry * .2, .62); g.fill();
    g.strokeStyle = 'rgba(255,248,230,.55)'; g.lineWidth = 1.2; g.lineCap = 'round';
    g.save(); g.translate(x, y); g.rotate(rot); g.beginPath(); g.moveTo(pts[4][0] * .9, pts[4][1] * .9); g.lineTo(pts[5][0] * .9, pts[5][1] * .9); g.lineTo(pts[6][0] * .9, pts[6][1] * .9); g.stroke(); g.restore();
    if (hg) { hg.fillStyle = grey(215); path(hg); hg.fill(); hg.fillStyle = grey(245); path(hg, 0, 0, .7); hg.fill(); }
  }

  const TEX = {
    // Bretter (waagerecht), helles warmes Holz mit feiner Maserung
    wood: () => makeSet((g, hg, w, h, r) => {
      const boards = 8, bh = h / boards;
      for (let i = 0; i < boards; i++) {
        const y0 = i * bh, hue = 28 + r() * 6, light = 52 + r() * 9;
        g.fillStyle = hsl(hue, 42 + r() * 8, light); g.fillRect(0, y0, w, bh);
        for (let k = 0; k < 34; k++) {
          const y = y0 + 3 + r() * (bh - 6), x0 = r() * w, len = 90 + r() * 320;
          g.strokeStyle = r() < .55 ? `hsla(${hue},45%,${light - 14}%,.22)` : `hsla(${hue},50%,${light + 10}%,.18)`;
          g.lineWidth = .5 + r() * 1.1;
          g.beginPath(); g.moveTo(x0, y); g.bezierCurveTo(x0 + len * .3, y + (r() - .5) * 3, x0 + len * .6, y + (r() - .5) * 3, x0 + len, y); g.stroke();
        }
        if (r() < .3) { const kx = r() * w, ky = y0 + bh * (.3 + r() * .4); g.fillStyle = `hsla(${hue},45%,${light - 22}%,.35)`; g.beginPath(); g.ellipse(kx, ky, 6, 3, 0, 0, 7); g.fill(); }
        g.fillStyle = 'rgba(70,40,18,.32)'; g.fillRect(0, y0, w, 1.5);
        const sx = r() * w; g.fillStyle = 'rgba(70,40,18,.3)'; g.fillRect(sx, y0, 1.5, bh);
        bevelRect(hg, -4, y0 + 1, w + 8, bh - 2, 70, 160, 3, 1.2);
        hg.fillStyle = grey(40); hg.fillRect(sx - .5, y0, 2.5, bh);
      }
    }, { seed: 3, strength: 2.2 }),

    // Ziegel im Läuferverband, Fugen zurückgesetzt, jeder Stein leicht anders
    brick: () => makeSet((g, hg, w, h, r) => {
      g.fillStyle = '#cfc6b8'; g.fillRect(0, 0, w, h);
      hg.fillStyle = grey(40); hg.fillRect(0, 0, w, h);
      const rows = 10, cols = 4, bh = h / rows, bw = w / cols, gap = 4;
      for (let j = 0; j < rows; j++) for (let i = -1; i <= cols; i++) {
        const x = i * bw + (j % 2 ? bw / 2 : 0), y = j * bh;
        const L = 42 + r() * 10;
        g.fillStyle = hsl(12 + r() * 9, 42 + r() * 10, L); g.fillRect(x + gap / 2, y + gap / 2, bw - gap, bh - gap);
        const sh = g.createLinearGradient(0, y, 0, y + bh); sh.addColorStop(0, 'rgba(255,240,225,.12)'); sh.addColorStop(1, 'rgba(60,25,10,.10)');
        g.fillStyle = sh; g.fillRect(x + gap / 2, y + gap / 2, bw - gap, bh - gap);
        for (let k = 0; k < 18; k++) { g.fillStyle = r() < .5 ? 'rgba(80,35,20,.18)' : 'rgba(255,230,210,.14)'; g.fillRect(x + gap / 2 + r() * (bw - gap), y + gap / 2 + r() * (bh - gap), 1 + r() * 2, 1 + r() * 2); }
        bevelRect(hg, x + gap / 2, y + gap / 2, bw - gap, bh - gap, 110, 200, 4, 1.3);
      }
      heightNoise(hg, w, h, r, 900, 18, 1.5);
    }, { seed: 5, strength: 2.6 }),

    // Tonziegel: Reihen aus runden Mönch-/Nonne-Ziegeln, jede Reihe überlappt die nächste
    tile: () => makeSet((g, hg, w, h, r) => {
      g.fillStyle = '#7a3a22'; g.fillRect(0, 0, w, h);
      const rows = 5, cols = 4, th = h / rows, tw = w / cols;
      for (let j = rows; j >= -1; j--) for (let i = -1; i <= cols; i++) {
        const x = i * tw + (j % 2 ? tw / 2 : 0), y = j * th;
        const L = 38 + r() * 9, base = hsl(13 + r() * 7, 56 + r() * 10, L);
        // Wölbung quer: Mitte hell, Ränder dunkler
        const gx = g.createLinearGradient(x, 0, x + tw, 0);
        gx.addColorStop(0, hsl(14, 50, L - 16)); gx.addColorStop(.45, base); gx.addColorStop(.6, hsl(16, 55, L + 6)); gx.addColorStop(1, hsl(14, 50, L - 18));
        g.fillStyle = gx;
        g.beginPath(); g.moveTo(x + 1, y); g.lineTo(x + tw - 1, y); g.lineTo(x + tw - 1, y + th * 1.05); g.quadraticCurveTo(x + tw / 2, y + th * 1.18, x + 1, y + th * 1.05); g.closePath(); g.fill();
        // Schatten der darüberliegenden Reihe
        const gy = g.createLinearGradient(0, y, 0, y + th * .35); gy.addColorStop(0, 'rgba(40,14,6,.45)'); gy.addColorStop(1, 'rgba(40,14,6,0)');
        g.fillStyle = gy; g.fillRect(x + 1, y, tw - 2, th * .35);
        if (r() < .25) { g.fillStyle = 'rgba(70,80,50,.16)'; g.beginPath(); g.ellipse(x + tw * r(), y + th * (.4 + r() * .5), 6 + r() * 8, 3 + r() * 4, 0, 0, 7); g.fill(); }
        const hx = hg.createLinearGradient(x, 0, x + tw, 0);
        hx.addColorStop(0, grey(50)); hx.addColorStop(.5, grey(220)); hx.addColorStop(1, grey(50));
        hg.fillStyle = hx; hg.fillRect(x + 1, y, tw - 2, th * 1.1);
        const hy = hg.createLinearGradient(0, y, 0, y + th); hy.addColorStop(0, 'rgba(0,0,0,.55)'); hy.addColorStop(.3, 'rgba(0,0,0,0)');
        hg.fillStyle = hy; hg.fillRect(x + 1, y, tw - 2, th);
      }
    }, { seed: 7, strength: 2.4 }),

    // Reet/Stroh: feine Halme in Lagen
    // Reet/Stroh im Kit-Stil: Lagen aus gemalten Halmbündeln, jede Lage mit hellen Spitzen und dunkler Schattenkante
    thatch: () => makeSet((g, hg, w, h, r) => {
      const f = brushField(w, h, r, 1);
      paintField(g, w, h, f, [[.1, [150, 112, 56]], [.5, [186, 146, 76]], [.9, [214, 178, 100]]]);
      const rows = 6, bh = h / rows;
      for (let b = 0; b < rows; b++) {
        const y0 = b * bh;
        // Bündel: breite, weiche Pinselstriche schräg nach unten
        for (let i = 0; i < 260; i++) {
          const x = r() * w, y = y0 + r() * bh * .5, len = bh * (.6 + r() * .5), lean = (r() - .5) * 10, L = r();
          g.strokeStyle = L < .4 ? 'rgba(128,90,40,.45)' : L < .8 ? 'rgba(206,166,88,.55)' : 'rgba(240,210,140,.6)';
          g.lineWidth = 1.5 + r() * 2.5; g.lineCap = 'round';
          hg.strokeStyle = grey(120 + L * 120); hg.lineWidth = g.lineWidth;
          wrapped(g, w, h, x, y, 12, len, (px, py) => {
            g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + lean * .3, py + len * .5, px + lean, py + len); g.stroke();
            hg.beginPath(); hg.moveTo(px, py); hg.lineTo(px + lean, py + len); hg.stroke();
          });
        }
        // untere Kante der Lage: helle Halmspitzen, darunter klarer Schatten
        const ye = y0 + bh;
        const sh = g.createLinearGradient(0, ye - 4, 0, ye + 14); sh.addColorStop(0, 'rgba(70,44,16,.55)'); sh.addColorStop(1, 'rgba(70,44,16,0)');
        g.fillStyle = sh; g.fillRect(0, ye - 4, w, 18);
        for (let x = 0; x < w; x += 3 + r() * 4) { g.strokeStyle = 'rgba(246,222,156,.7)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, ye - 10 - r() * 8); g.lineTo(x + (r() - .5) * 3, ye - 2); g.stroke(); }
        const hr = hg.createLinearGradient(0, ye - 26, 0, ye + 4); hr.addColorStop(0, 'rgba(255,255,255,0)'); hr.addColorStop(.85, 'rgba(0,0,0,.7)'); hr.addColorStop(1, 'rgba(0,0,0,0)');
        hg.fillStyle = hr; hg.fillRect(0, ye - 26, w, 30);
      }
    }, { seed: 9, strength: 2.2 }),

    // Lehm: weich, etwas wolkig, mit Strohhäckseln
    mud: () => makeSet((g, hg, w, h, r) => {
      g.fillStyle = '#9b7b5c'; g.fillRect(0, 0, w, h);
      blotches(g, w, h, r, 60, ['#a6876a', '#8c6d50', '#ae9070'], 50, 130, .3);
      speckle(g, w, h, r, 700, .5, 1.4, ['#7a5e46', '#c4ae88'], .4);
      for (let i = 0; i < 140; i++) {
        const x = r() * w, y = r() * h, len = 6 + r() * 12;
        g.strokeStyle = 'rgba(214,190,130,.6)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * len, y + (r() - .5) * len * .3); g.stroke();
      }
      blotches(hg, w, h, r, 70, ['#ffffff', '#000000'], 30, 90, .18);
      heightNoise(hg, w, h, r, 1200, 30, 2);
    }, { seed: 11, strength: 1.4 }),

    // festgestampfte Erde im Kit-Stil: gemalte Farbfelder, ein paar flache Steinchen mit hellem Kantenstrich
    earth: () => makeSet((g, hg, w, h, r) => {
      const f = brushField(w, h, r, 1), f2 = brushField(w, h, r, 2);
      for (let i = 0; i < f.length; i++) f[i] = f[i] * .7 + f2[i] * .3;
      paintField(g, w, h, f, [[.15, [126, 88, 56]], [.45, [158, 114, 74]], [.75, [182, 138, 92]], [.95, [198, 160, 112]]]);
      addHeightField(hg, w, h, f, 40);
      for (let i = 0; i < 26; i++) {
        const rx = 5 + Math.pow(r(), 2) * 16, c = 150 + r() * 40;
        paintedStone(g, hg, r() * w, r() * h, rx, rx * (.55 + r() * .3), r() * 3, [c, c * .93, c * .84], r);
      }
      for (let i = 0; i < 40; i++) { const x = r() * w, y = r() * h, len = 8 + r() * 18; g.strokeStyle = 'rgba(96,64,40,.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * len, y + (r() - .5) * len); g.stroke(); }
    }, { seed: 12, strength: 1.6 }),

    // Putz: hell, warm, ganz feine Körnung, kaum Flecken
    plaster: () => makeSet((g, hg, w, h, r) => {
      g.fillStyle = '#cdc2ad'; g.fillRect(0, 0, w, h);
      blotches(g, w, h, r, 34, ['#d6cdbb', '#bfb49e'], 70, 170, .4);
      for (let i = 0; i < 12; i++) {
        const x = r() * w, len = 60 + r() * 160, y = r() * h;
        const gr = g.createLinearGradient(0, y, 0, y + len); gr.addColorStop(0, 'rgba(110,100,80,0)'); gr.addColorStop(.3, 'rgba(110,100,80,.06)'); gr.addColorStop(1, 'rgba(110,100,80,0)');
        g.fillStyle = gr; g.fillRect(x, y, 3 + r() * 5, len);
      }
      speckle(g, w, h, r, 1400, .4, 1, ['rgba(120,110,95,.18)', 'rgba(255,255,255,.25)'], .6);
      heightNoise(hg, w, h, r, 4000, 40, 1.3);
    }, { seed: 13, strength: .9 }),

    // Ferrozement: glatt gespachtelt, Kellenzüge
    ferro: () => makeSet((g, hg, w, h, r) => {
      g.fillStyle = '#c9cac5'; g.fillRect(0, 0, w, h);
      blotches(g, w, h, r, 36, ['#d3d4cf', '#b9bab5'], 50, 140, .4);
      for (let i = 0; i < 36; i++) {
        const x = r() * w, y = r() * h, rad = 30 + r() * 60, a = r() * 6;
        g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2 + r() * 4; g.beginPath(); g.arc(x, y, rad, a, a + 1.2); g.stroke();
        hg.strokeStyle = 'rgba(255,255,255,.35)'; hg.lineWidth = g.lineWidth; hg.beginPath(); hg.arc(x, y, rad, a, a + 1.2); hg.stroke();
      }
      speckle(g, w, h, r, 1000, .4, 1, ['rgba(80,82,80,.35)', 'rgba(255,255,255,.35)'], .5);
      heightNoise(hg, w, h, r, 1500, 20, 1.2);
    }, { seed: 14, strength: 1 }),

    // Beton: hellgrau, ruhig, leichte Schalungsstöße und Poren
    concrete: () => makeSet((g, hg, w, h, r) => {
      g.fillStyle = '#b4b2ac'; g.fillRect(0, 0, w, h);
      blotches(g, w, h, r, 34, ['#bcbab4', '#a8a6a0', '#b8b4ab'], 80, 200, .28);
      speckle(g, w, h, r, 1600, .4, 1.2, ['rgba(90,90,86,.35)', 'rgba(255,255,255,.4)'], .55);
      g.fillStyle = 'rgba(90,90,86,.12)'; g.fillRect(0, h / 2, w, 1.5);
      hg.fillStyle = grey(95); hg.fillRect(0, h / 2 - .5, w, 2);
      for (let i = 0; i < 260; i++) { hg.fillStyle = grey(40 + r() * 50); hg.beginPath(); hg.arc(r() * w, r() * h, .6 + r() * 1.4, 0, 7); hg.fill(); }
    }, { seed: 15, strength: 1.2 }),

    // verwitterter Putz für die Stadthäuser (eine Kachel = 3 m, also etwa ein Stockwerk): Regenspuren von oben,
    // dunkler Schimmel- und Spritzwasserrand unten, abgeplatzte Stellen mit grauem Zement, Flecken
    grime: () => makeSet((g, hg, w, h, r) => {
      g.fillStyle = '#e6e0d2'; g.fillRect(0, 0, w, h);
      const big = noiseField(w, h, r, 3, 3, 5, .55), fine = noiseField(w, h, r, 24, 24, 3, .5);
      mixField(g, w, h, big, [205, 198, 182], .6, .5, .8);
      mixField(g, w, h, fine, [190, 182, 166], .4, .6, .85);
      // Regenspuren
      for (let i = 0; i < 90; i++) {
        const x = r() * w, y0 = r() * h * .5, len = 60 + r() * 360, wd = 2 + r() * 10;
        const gr = g.createLinearGradient(0, y0, 0, y0 + len); gr.addColorStop(0, 'rgba(70,64,52,.22)'); gr.addColorStop(1, 'rgba(70,64,52,0)');
        g.fillStyle = gr; g.fillRect(x, y0, wd, len);
      }
      // unten: Spritzwasser, Schimmel, aufsteigende Feuchte (die Kachel wiederholt sich je Stockwerk)
      const bot = g.createLinearGradient(0, h * .72, 0, h); bot.addColorStop(0, 'rgba(80,84,62,0)'); bot.addColorStop(.6, 'rgba(80,84,62,.22)'); bot.addColorStop(1, 'rgba(60,62,46,.45)');
      g.fillStyle = bot; g.fillRect(0, h * .72, w, h * .28);
      const img = g.getImageData(0, 0, w, h), d = img.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x, k = sstep(.62, 1, y / h) * sstep(.45, .7, big[i]) * .55;
        d[i * 4] -= 60 * k; d[i * 4 + 1] -= 50 * k; d[i * 4 + 2] -= 62 * k;
      }
      g.putImageData(img, 0, 0);
      // abgeplatzter Putz: grauer Zement, manchmal Ziegel darunter
      for (let i = 0; i < 7; i++) {
        const x = r() * w, y = r() * h, rx = 5 + r() * 18, ry = rx * (.4 + r() * .5), brick = r() < .35;
        g.fillStyle = brick ? '#9a5a40' : '#a7a49b'; g.beginPath();
        for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, rr = .7 + r() * .5; g.lineTo(x + Math.cos(a) * rx * rr, y + Math.sin(a) * ry * rr); }
        g.closePath(); g.fill(); g.strokeStyle = 'rgba(60,55,45,.4)'; g.lineWidth = 1; g.stroke();
        hg.fillStyle = grey(60); hg.beginPath(); hg.ellipse(x, y, rx, ry, 0, 0, 7); hg.fill();
      }
      speckle(g, w, h, r, 2400, .4, 1.2, ['rgba(90,84,72,.3)', 'rgba(255,255,255,.3)'], .6);
      addHeightField(hg, w, h, fine, 30);
    }, { w: 512, h: 512, seed: 71, strength: 1.2 }),

    // Wellblech im Kit-Stil: ruhige Grundfläche, Wellen hell/dunkel, Rostspuren, heller Kantenstrich an der Überlappung
    tinMap: () => makeTex((g, w, h, r) => {
      // (kein Pinselrauschen: die Kachel ist nur 1 m groß, das Muster würde sich sichtbar wiederholen)
      const waves = 12;
      g.fillStyle = '#b0bcc2'; g.fillRect(0, 0, w, h);
      blotches(g, w, h, r, 14, ['rgba(255,255,255,.18)', 'rgba(110,120,128,.14)'], 80, 200, .25);
      const grad = g.createLinearGradient(0, 0, w, 0);
      for (let i = 0; i <= waves * 2; i++) grad.addColorStop(i / (waves * 2), i % 2 ? 'rgba(40,50,60,.16)' : 'rgba(255,255,255,.16)');
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i++) {
        const x = r() * w, y = r() * h, len = 40 + r() * 160;
        const g2 = g.createLinearGradient(0, y, 0, y + len);
        g2.addColorStop(0, 'rgba(150,84,44,0)'); g2.addColorStop(.3, 'rgba(150,84,44,.22)'); g2.addColorStop(1, 'rgba(150,84,44,0)');
        g.fillStyle = g2; g.fillRect(x, y, 2 + r() * 4, len);
      }
      // Überlappung der Blechtafeln mit hellem Kantenstrich
      g.fillStyle = 'rgba(60,65,70,.3)'; g.fillRect(0, h * .5, w, 3);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, h * .5 - 2, w, 1.5);
    }, { seed: 16 }),

    tinNormal: () => makeTex((g, w, h) => {
      const img = g.createImageData(w, h), waves = 12;
      for (let x = 0; x < w; x++) {
        const slope = Math.cos((x / w) * Math.PI * 2 * waves) * 1.1;
        const len = Math.hypot(slope, 1), nx = -slope / len, nz = 1 / len;
        for (let y = 0; y < h; y++) {
          const i = (y * w + x) * 4;
          img.data[i] = (nx * .5 + .5) * 255; img.data[i + 1] = 128; img.data[i + 2] = (nz * .5 + .5) * 255; img.data[i + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
    }, { srgb: false }),

    // Rasen: feine Halme, ruhige Farbe
    // Rasen im Kit-Stil: ruhiges, gemaltes Grün mit kleinen Halmbüscheln (dunkler Fuß, helle Spitze)
    grass: () => makeSet((g, hg, w, h, r) => {
      const f = brushField(w, h, r, 1), f2 = brushField(w, h, r, 3);
      for (let i = 0; i < f.length; i++) f[i] = f[i] * .45 + f2[i] * .55;
      paintField(g, w, h, f, [[.2, [92, 140, 54]], [.55, [110, 158, 62]], [.85, [132, 176, 72]]]);
      addHeightField(hg, w, h, f, 20);
      for (let i = 0; i < 420; i++) {
        const cx = r() * w, cy = r() * h, n = 3 + Math.floor(r() * 5);
        for (let k = 0; k < n; k++) {
          const x = cx + (r() - .5) * 9, y = cy + (r() - .5) * 4, len = 5 + r() * 7, dx = (r() - .5) * 5;
          const gr = g.createLinearGradient(0, y, 0, y - len); gr.addColorStop(0, 'rgba(62,102,40,.75)'); gr.addColorStop(1, 'rgba(176,212,102,.8)');
          g.strokeStyle = gr; g.lineWidth = 1.4 + r(); g.lineCap = 'round';
          hg.strokeStyle = grey(150 + r() * 90); hg.lineWidth = g.lineWidth;
          wrapped(g, w, h, x, y, 4, len, (px, py) => {
            g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + dx * .2, py - len * .6, px + dx, py - len); g.stroke();
            hg.beginPath(); hg.moveTo(px, py); hg.lineTo(px + dx, py - len); hg.stroke();
          });
        }
      }
    }, { seed: 17, strength: 1.2 }),

    soil: () => makeSet((g, hg, w, h, r) => {
      const layers = [['#5c4532', .1], ['#86654a', .27], ['#a48462', .26], ['#bba585', .2], ['#9a9286', .17]];
      let y = 0;
      layers.forEach(([c, f]) => { g.fillStyle = c; g.fillRect(0, y, w, h * f + 1); y += h * f; });
      blotches(g, w, h, r, 40, ['rgba(255,235,200,.18)', 'rgba(30,20,10,.18)'], 20, 70, .5);
      speckle(g, w, h, r, 800, .8, 2.6, ['#6a5440', '#cbb690', '#857c74', '#4b3a2c'], .7);
      heightNoise(hg, w, h, r, 2000, 50, 2.5);
    }, { seed: 18, strength: 1.4 }),

    bamboo: () => makeSet((g, hg, w, h, r) => {
      const grad = g.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#9aa44e'); grad.addColorStop(.45, '#cfc77c'); grad.addColorStop(1, '#9a9448');
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 4; i++) {
        const y = (i + .5) * h / 4;
        g.fillStyle = 'rgba(90,80,30,.45)'; g.fillRect(0, y - 3, w, 5);
        g.fillStyle = 'rgba(255,248,190,.3)'; g.fillRect(0, y + 2, w, 3);
        hg.fillStyle = grey(210); hg.fillRect(0, y - 4, w, 8);
      }
      for (let i = 0; i < 60; i++) { g.strokeStyle = 'rgba(110,100,40,.18)'; g.lineWidth = 1; const x = r() * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    }, { w: 128, h: 512, seed: 19, strength: 2 }),

    // Erdsockel/Erdhügel (Seite, v = 0 unten, v = 1 oben): gestampfte Lagen, eingebettete Steine, Wurzeln,
    // oben eine Grasnarbe, deren Halme über die Kante hängen, unten feucht und dunkler
    moundSide: () => makeSet((g, hg, w, h, r) => {
      const f = brushField(w, h, r, 1), f2 = brushField(w, h, r, 2.5);
      for (let i = 0; i < f.length; i++) f[i] = f[i] * .6 + f2[i] * .4;
      paintField(g, w, h, f, [[.15, [124, 88, 56]], [.45, [150, 110, 72]], [.75, [172, 130, 88]], [.95, [190, 150, 104]]]);
      addHeightField(hg, w, h, f, 36);
      const wave = (y, k, a) => x => y + Math.sin(x / w * Math.PI * 2 * k + y) * a;
      for (let k = 0; k < 5; k++) {
        const y0 = h * (.3 + k * .12) + (r() - .5) * 10, ph2 = r() * 6, fy = x => wave(y0, 1 + k % 2, 2 + r() * 2)(x) + Math.sin(x / w * Math.PI * 10 + ph2) * 1.5;
        g.strokeStyle = 'rgba(92,62,38,.2)'; g.lineWidth = 7 + r() * 6; g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, fy(x)); g.stroke();
        g.strokeStyle = 'rgba(236,206,164,.12)'; g.lineWidth = 3; g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, fy(x) - 4); g.stroke();
        hg.strokeStyle = grey(70); hg.lineWidth = 4; hg.beginPath(); for (let x = 0; x <= w; x += 8) hg.lineTo(x, fy(x)); hg.stroke();
      }
      for (let i = 0; i < 46; i++) { const y = h * (.22 + Math.pow(r(), .6) * .76), rx = 6 + Math.pow(r(), 2) * 20, c = 118 + r() * 50; paintedStone(g, hg, r() * w, y, rx, rx * (.55 + r() * .3), r() * 3, [c, c * .94, c * .86], r); }
      for (let i = 0; i < 20; i++) { let x = r() * w, y = h * .15; g.strokeStyle = 'rgba(74,50,30,.72)'; g.lineWidth = 1 + r() * 1.8; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - .5) * 14; y += 6 + r() * 16; g.lineTo(x, y); } g.stroke(); }
      const ft = g.createLinearGradient(0, h * .78, 0, h); ft.addColorStop(0, 'rgba(58,42,28,0)'); ft.addColorStop(1, 'rgba(58,42,28,.5)'); g.fillStyle = ft; g.fillRect(0, h * .78, w, h * .22);
      // Grasnarbe: Schatten darunter, dann die Narbe mit ausgefranster Kante
      const edge = []; for (let x = 0; x <= w; x += 4) edge.push(h * (.12 + .025 * Math.sin(x / w * Math.PI * 6) + .015 * Math.sin(x / w * Math.PI * 14 + 1)) + r() * 4);
      const turf = (c, dy) => { c.beginPath(); c.moveTo(0, 0); edge.forEach((y, i) => c.lineTo(i * 4, y + dy)); c.lineTo(w, 0); c.closePath(); c.fill(); };
      g.fillStyle = 'rgba(52,36,22,.5)'; turf(g, 9);
      g.fillStyle = 'rgb(92,124,50)'; turf(g, 0); hg.fillStyle = grey(205); turf(hg, 0);
      for (let i = 0; i < 1100; i++) {
        const x = r() * w, e = edge[Math.min(edge.length - 1, Math.round(x / 4))], y = r() * e, len = 6 + r() * 13, down = y > e * .65 && r() < .7, dx = (r() - .5) * 6;
        const gr = g.createLinearGradient(0, y, 0, down ? y + len : y - len); gr.addColorStop(0, 'rgba(60,92,36,.85)'); gr.addColorStop(1, 'rgba(178,204,104,.9)');
        g.strokeStyle = gr; g.lineWidth = 1.4 + r() * 1.2; g.lineCap = 'round';
        wrapped(g, w, h, x, y, 6, len, px => { g.beginPath(); g.moveTo(px, y); g.quadraticCurveTo(px + dx * .3, y + (down ? len * .6 : -len * .6), px + dx, down ? y + len : y - len); g.stroke(); });
      }
      for (let i = 0; i < 70; i++) { const x = r() * w, y = h * (.9 + r() * .1), n = 3 + Math.floor(r() * 4); for (let k = 0; k < n; k++) { const len = 4 + r() * 8, dx = (r() - .5) * 6; g.strokeStyle = r() < .5 ? 'rgba(92,120,54,.8)' : 'rgba(140,164,80,.8)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x + k * 2, y); g.lineTo(x + k * 2 + dx, y - len); g.stroke(); } }
    }, { seed: 81, strength: 1.8 }),

    // Geflochtene Bambusmatte (Bootsdach, Zäune): Streifen über und unter, jeder Streifen gewölbt
    weave: () => makeSet((g, hg, w, h, r) => {
      const n = 8, s = w / n;
      g.fillStyle = '#6d5230'; g.fillRect(0, 0, w, h); hg.fillStyle = grey(40); hg.fillRect(0, 0, w, h);
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const horiz = (i + j) % 2 === 0, x = i * s, y = j * s, L = 50 + r() * 10;
        const gr = horiz ? g.createLinearGradient(0, y, 0, y + s) : g.createLinearGradient(x, 0, x + s, 0);
        gr.addColorStop(0, hsl(36, 38, L - 16)); gr.addColorStop(.5, hsl(40, 46, L + 6)); gr.addColorStop(1, hsl(34, 38, L - 18));
        g.fillStyle = gr; g.fillRect(x + 1, y + 1, s - 2, s - 2);
        g.strokeStyle = 'rgba(80,56,26,.28)'; g.lineWidth = 1;
        for (let k = 0; k < 4; k++) { const o = 4 + r() * (s - 8); g.beginPath(); if (horiz) { g.moveTo(x, y + o); g.lineTo(x + s, y + o); } else { g.moveTo(x + o, y); g.lineTo(x + o, y + s); } g.stroke(); }
        const hgr = horiz ? hg.createLinearGradient(0, y, 0, y + s) : hg.createLinearGradient(x, 0, x + s, 0);
        hgr.addColorStop(0, grey(90)); hgr.addColorStop(.5, grey(230)); hgr.addColorStop(1, grey(90)); hg.fillStyle = hgr; hg.fillRect(x + 1, y + 1, s - 2, s - 2);
      }
    }, { w: 256, h: 256, seed: 83, strength: 2 }),

    // Tür: senkrechte Bretter mit Querriegeln
    door: () => makeSet((g, hg, w, h, r) => {
      g.fillStyle = '#7a5434'; g.fillRect(0, 0, w, h);
      const planks = 5, pw = w / planks;
      for (let i = 0; i < planks; i++) {
        g.fillStyle = hsl(26 + r() * 5, 42 + r() * 8, 34 + r() * 7); g.fillRect(i * pw, 0, pw, h);
        for (let k = 0; k < 14; k++) { g.strokeStyle = 'rgba(40,20,8,.16)'; g.lineWidth = 1; const x = i * pw + r() * pw; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - .5) * 5, h); g.stroke(); }
        g.fillStyle = 'rgba(30,15,5,.4)'; g.fillRect(i * pw, 0, 2, h);
        bevelRect(hg, i * pw + 1, -4, pw - 2, h + 8, 60, 170, 3, 1.2);
      }
      [.12, .5, .86].forEach(f => {
        g.fillStyle = hsl(26, 40, 30); g.fillRect(0, h * f - 14, w, 28);
        g.fillStyle = 'rgba(255,230,200,.12)'; g.fillRect(0, h * f - 14, w, 3);
        bevelRect(hg, -2, h * f - 14, w + 4, 28, 150, 230, 3, 1.5);
      });
    }, { w: 256, h: 512, seed: 20, strength: 2 }),
  };

  function Materials() {
    const cache = {};
    // Textur-Satz einmal erzeugen und für alle Varianten mitbenutzen
    const sets = {};
    const set = key => (sets[key] = sets[key] || TEX[key]());
    const std = (key, tex, o = {}) => {
      if (cache[key]) return cache[key];
      const s = tex ? set(tex) : null;
      const { normal = 1, ...rest } = o;
      const m = new THREE.MeshStandardMaterial({ roughness: .85, metalness: 0, envMapIntensity: .7, ...rest });
      if (s) {
        m.map = s.map || s;
        if (s.normal) { m.normalMap = s.normal; m.normalScale = new THREE.Vector2(normal, normal); }
      }
      m.name = key;
      return (cache[key] = m);
    };
    const plain = (key, o) => (cache[key] = cache[key] || Object.assign(new THREE.MeshStandardMaterial({ roughness: .8, envMapIntensity: .7, ...o }), { name: key }));
    // Material aus einer Kit-Textur (Quaternius); fehlt vendor/texturen.js, bleibt die selbst gemalte Variante.
    // rep: [rx, ry] Kacheln pro Meter, rot: Drehung der Textur, color: Tönung (wird mit der Textur multipliziert)
    const kit = (key, kitKey, fallback, { rep = [1, 1], rot = 0, normal = 1, ...o } = {}) => {
      if (!KIT || !KIT.has(kitKey)) return fallback();
      if (cache[key]) return cache[key];
      const s = KIT.set(kitKey, rep[0], rep[1], rot);
      const m = new THREE.MeshStandardMaterial({ roughness: .85, metalness: 0, envMapIntensity: .6, map: s.map, ...o });
      if (s.normal) { m.normalMap = s.normal; m.normalScale = new THREE.Vector2(normal, normal); }
      m.name = key;
      return (cache[key] = m);
    };
    const m = {
      wood: () => kit('wood', 'wood', () => std('wood', 'wood', { roughness: .72, normal: .8 }), { rep: [1, 5], roughness: .75, normal: .9 }),
      woodDark: () => kit('woodDark', 'woodDark', () => plain('woodDark', { color: 0x7a593d, roughness: .72 }), { rep: [1.2, 2.4], roughness: .78, normal: .8, color: 0xf2e8de }),
      brick: () => kit('brick', 'brick', () => std('brick', 'brick', { roughness: .9, normal: 1 }), { rep: [1, 1], roughness: .9, normal: 1.1 }),
      tile: () => kit('tile', 'tiles', () => std('tile', 'tile', { roughness: .62, normal: 1.1 }), { rep: [.8, .8], roughness: .7, normal: 1.2 }),
      thatch: () => std('thatch', 'thatch', { roughness: 1, normal: 1 }),
      mud: () => kit('mud', 'plaster', () => std('mud', 'mud', { roughness: 1, normal: .8 }), { rep: [.6, .6], roughness: 1, normal: 1.3, color: 0xd29d68 }),
      earth: () => std('earth', 'earth', { roughness: 1, normal: .9 }),
      plaster: () => kit('plaster', 'plaster', () => std('plaster', 'plaster', { roughness: .95, normal: 1 }), { rep: [.5, .5], roughness: .95, normal: 1.1, color: 0xfff8ee }),
      ferro: () => kit('ferro', 'plaster', () => std('ferro', 'ferro', { roughness: .78, normal: .6 }), { rep: [.7, .7], roughness: .8, normal: .7, color: 0xd6dadb }),
      concrete: () => kit('concrete', 'plaster', () => std('concrete', 'concrete', { roughness: .9, normal: .6 }), { rep: [.8, .8], roughness: .9, normal: .8, color: 0xc4c6c4 }),
      stone: () => kit('stone', 'stone', () => m.concrete(), { rep: [1, 1], roughness: .9, normal: 1.1 }),
      uneven: () => kit('uneven', 'uneven', () => m.concrete(), { rep: [.7, .7], roughness: .95, normal: 1.2 }),
      bark: () => kit('bark', 'bark', () => m.woodDark(), { rep: [1, 1], roughness: .95, normal: 1 }),
      grass: () => std('grass', 'grass', { roughness: 1, normal: .7 }),
      soil: () => std('soil', 'soil', { roughness: 1, normal: .8 }),
      bamboo: () => std('bamboo', 'bamboo', { roughness: .55, normal: .8 }),
      door: () => kit('door', 'woodDark', () => std('door', 'door', { roughness: .78, normal: .9 }), { rep: [1.4, 1.4], rot: Math.PI / 2, roughness: .78, normal: 1, color: 0xf6ece2 }),
      // Zierleisten (Gesims, Lisenen, Fensterfaschen): derselbe Putz, etwas dunkler und wärmer gestrichen
      trim: () => kit('trim', 'plaster', () => plain('trim', { color: 0xd8ccb4 }), { rep: [.5, .5], roughness: .9, normal: .9, color: 0xe2d5bc }),
      shutter: () => kit('shutter', 'woodDark', () => plain('shutter', { color: 0x3f7d5a }), { rep: [1.4, 1.4], rot: Math.PI / 2, roughness: .72, normal: .9, color: 0x9cc4a6 }),
      bulb: () => plain('bulb', { color: 0xfff1d0, emissive: 0xffc070, emissiveIntensity: 1.8, roughness: .3 }),
      moundSide: () => std('moundSide', 'moundSide', { roughness: 1, normal: 1, vertexColors: true }),
      weave: () => std('weave', 'weave', { roughness: .95, normal: 1, side: THREE.DoubleSide }),
      tin: () => {
        if (cache.tin) return cache.tin;
        return (cache.tin = antiShimmer(new THREE.MeshStandardMaterial({ name: 'tin', map: TEX.tinMap(), normalMap: TEX.tinNormal(), normalScale: new THREE.Vector2(.8, .8), roughness: .5, metalness: .4, envMapIntensity: 1.0, side: THREE.DoubleSide }), 12));
      },
      glass: () => plain('glass', { color: 0x5d7183, roughness: .1, metalness: .15, envMapIntensity: 1.6 }),
      pump: () => plain('pump', { color: 0x3a6d9a, roughness: .45, metalness: .4 }),
      metal: () => plain('metal', { color: 0x7d868d, roughness: .4, metalness: .7 }),
      black: () => plain('black', { color: 0x5e5751, roughness: .9 }),
      stake: () => plain('stake', { color: 0xe0782c, roughness: .6 }),
      string: () => plain('string', { color: 0xf2efe6, roughness: .9 }),
      blade: () => plain('blade', { color: 0x6f9a3c, roughness: .8, side: THREE.DoubleSide }),
      water: () => plain('water', { color: 0x4d8ea6, roughness: .12, metalness: .05, transparent: true, opacity: .62, depthWrite: false, envMapIntensity: 1.3 }),
      pole: () => plain('pole', { color: 0xf4f2ec, roughness: .5 }),
      poleRed: () => plain('poleRed', { color: 0xc8402f, roughness: .5 }),
      terracotta: () => plain('terracotta', { color: 0xb5603c, roughness: .85 }),
      sack: () => plain('sack', { color: 0xddd0b2, roughness: .95 }),
      cement: () => plain('cement', { color: 0x9c9e9a, roughness: .55 }),
      rebar: () => plain('rebar', { color: 0x7e5038, roughness: .55, metalness: .45 }),
      plasterBlob: () => plain('plasterBlob', { color: 0xe6dfcf, roughness: .7 }),
    };
    return m;
  }

  /* ---------- Geometrie ---------- */

  // UV in Metern (eine Textur-Kachel = 1 m), damit Material überall gleich groß aussieht.
  function boxGeo(w, h, d) {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]);
    }
    return g;
  }

  function mesh(geo, mat, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  const box = (w, h, d, mat, x = 0, y = 0, z = 0) => mesh(boxGeo(w, h, d), mat, x, y + h / 2, z);   // y = Unterkante

  // Stab zwischen zwei Punkten (Balken, Grat, Verstrebung).
  function beam(a, b, r, mat, square = false) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
    const geo = square ? new THREE.BoxGeometry(r * 2, len, r * 2) : new THREE.CylinderGeometry(r, r, len, 10);
    const m = mesh(geo, mat);
    m.position.copy(A).add(B).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    return m;
  }

  // Abgestumpfte Pyramide (Erdsockel, Plattform): unten w×d, oben w2×d2, Höhe h.
  function frustum(wb, db, wt, dt, h, matSide, matTop) {
    const b = [[-wb / 2, 0, -db / 2], [wb / 2, 0, -db / 2], [wb / 2, 0, db / 2], [-wb / 2, 0, db / 2]];
    const t = [[-wt / 2, h, -dt / 2], [wt / 2, h, -dt / 2], [wt / 2, h, dt / 2], [-wt / 2, h, dt / 2]];
    const pos = [], uv = [], idx = [];
    const quad = (p0, p1, p2, p3) => {
      const n = pos.length / 3;
      [p0, p1, p2, p3].forEach(p => pos.push(...p));
      const e1 = new THREE.Vector3(...p1).sub(new THREE.Vector3(...p0)), e2 = new THREE.Vector3(...p3).sub(new THREE.Vector3(...p0));
      uv.push(0, 0, e1.length(), 0, e1.length(), e2.length(), 0, e2.length());
      idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    };
    quad(b[3], b[2], t[2], t[3]);   // vorn
    quad(b[1], b[0], t[0], t[1]);   // hinten
    quad(b[2], b[1], t[1], t[2]);   // rechts
    quad(b[0], b[3], t[3], t[0]);   // links
    const sideGeo = new THREE.BufferGeometry();
    sideGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    sideGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    sideGeo.setIndex(idx); sideGeo.computeVertexNormals();
    const group = new THREE.Group();
    group.add(mesh(sideGeo, matSide));
    group.add(mesh(boxGeo(wt, .02, dt), matTop || matSide, 0, h - .01, 0));
    return group;
  }

  // Ebenes Vieleck (konvex) mit Dicke, UV in Metern. Normale zeigt nach oben/außen.
  function slab(points, thickness, mat) {
    const P = points.map(p => new THREE.Vector3(...p));
    let n = new THREE.Vector3().subVectors(P[1], P[0]).cross(new THREE.Vector3().subVectors(P[2], P[0])).normalize();
    if (n.y < 0 || (Math.abs(n.y) < 1e-4 && n.z < 0)) { P.reverse(); n.negate(); }
    const e0 = new THREE.Vector3().subVectors(P[1], P[0]).normalize();
    const e1 = new THREE.Vector3().crossVectors(n, e0);
    const top = P, bottom = P.map(p => p.clone().addScaledVector(n, -thickness));
    const pos = [], uv = [], idx = [];
    const add = (verts, flip) => {
      const base = pos.length / 3;
      verts.forEach(v => { pos.push(v.x, v.y, v.z); const o = v.clone().sub(P[0]); uv.push(o.dot(e0), o.dot(e1)); });
      for (let i = 1; i < verts.length - 1; i++) flip ? idx.push(base, base + i + 1, base + i) : idx.push(base, base + i, base + i + 1);
    };
    add(top, false); add(bottom, true);
    for (let i = 0; i < P.length; i++) {
      const j = (i + 1) % P.length;
      add([top[i], bottom[i], bottom[j], top[j]], false);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    return mesh(geo, mat);
  }

  // Wand: Rechteck mit Öffnungen (und optional Giebeldreieck), Tiefe t. Lokal: x ∈ [-len/2, len/2], y ∈ [0, h], z ∈ [0, t].
  function wallPanel(len, h, t, holes, gable, mat) {
    const s = new THREE.Shape();
    s.moveTo(-len / 2, 0); s.lineTo(len / 2, 0);
    if (gable) { s.lineTo(len / 2, h); s.lineTo(0, h + gable); s.lineTo(-len / 2, h); }
    else { s.lineTo(len / 2, h); s.lineTo(-len / 2, h); }
    s.lineTo(-len / 2, 0);
    holes.forEach(o => {
      const p = new THREE.Path();
      p.moveTo(o.x - o.w / 2, o.y); p.lineTo(o.x - o.w / 2, o.y + o.h); p.lineTo(o.x + o.w / 2, o.y + o.h); p.lineTo(o.x + o.w / 2, o.y); p.lineTo(o.x - o.w / 2, o.y);
      s.holes.push(p);
    });
    return mesh(new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false }), mat);
  }

  const WALLS = {
    mud:       { t: .32, mat: 'mud',     post: false },
    tin:       { t: .07, mat: 'tin',     post: true },
    brickwall: { t: .24, mat: 'plaster', post: false },
    ferro:     { t: .1,  mat: 'ferro',   post: false },
  };

  /* ---------- Details: Verwitterung, Wandmalerei, Übergänge zum Boden ---------- */

  // Canvas-Textur ohne Wiederholung (für Abziehbilder auf Wänden und Boden)
  function decalTex(w, h, draw, seed = 1) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h, rng(seed));
    const t = new THREE.CanvasTexture(c); t.anisotropy = 8; t.encoding = THREE.sRGBEncoding;
    return t;
  }
  const decalMat = (map, o = {}) => new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: .95, envMapIntensity: .6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, ...o });

  // Bemalung und Verwitterung je Wandart: Sockelanstrich, Fries unter der Traufe (oder weiße Alpona-Malerei auf Lehm),
  // Feuchte am Fuß, Regenspuren unter den Fenstern und von der Traufe, Haarrisse. Öffnungen bleiben frei.
  const WALL_DECO = {
    brickwall: { dado: 'rgba(74,124,114,.93)', dadoTop: .86, dadoBot: .26, band: 'rgba(168,84,52,.92)', motif: 'rgba(246,236,212,.95)', grime: '70,58,44' },
    mud:       { dado: 'rgba(92,62,40,.5)', dadoTop: .48, dadoBot: 0, motif: 'rgba(250,246,234,.92)', grime: '62,46,32', alpona: true },
    ferro:     { band: 'rgba(78,104,124,.88)', motif: 'rgba(236,236,230,.9)', grime: '70,66,60', rust: true },
    tin:       { grime: '84,70,56', rust: true },
  };
  const DECAL_CACHE = {};
  function wallDecalMat(id, key, len, h, holes) {
    const ck = `${id}|${key}|${len.toFixed(2)}`;
    if (DECAL_CACHE[ck]) return DECAL_CACHE[ck];
    const P = WALL_DECO[id], ppm = 150;
    const map = decalTex(Math.round(len * ppm), Math.round(h * ppm), (g, cw, ch, r) => {
      const X = x => (x + len / 2) * ppm, Y = y => (h - y) * ppm, S = v => v * ppm;
      if (P.dado) {
        g.fillStyle = P.dado; g.beginPath(); g.moveTo(0, Y(P.dadoBot));
        for (let x = 0; x <= cw; x += 6) g.lineTo(x, Y(P.dadoTop) + (P.alpona ? Math.sin(x * .05) * 4 + (r() - .5) * 3 : 0));
        g.lineTo(cw, Y(P.dadoBot)); g.closePath(); g.fill();
        if (!P.alpona) { g.fillStyle = 'rgba(40,30,20,.4)'; g.fillRect(0, Y(P.dadoTop), cw, 2); g.fillStyle = 'rgba(255,250,235,.4)'; g.fillRect(0, Y(P.dadoTop) - 4, cw, 2); }
        g.globalCompositeOperation = 'destination-out';      // abgeplatzte Farbe
        for (let i = 0; i < len * 16; i++) { g.fillStyle = `rgba(0,0,0,${.3 + r() * .6})`; g.beginPath(); g.ellipse(r() * cw, Y(P.dadoBot) - r() * S(P.dadoTop - P.dadoBot), 1 + r() * 5, 1 + r() * 3, r() * 3, 0, 7); g.fill(); }
        g.globalCompositeOperation = 'source-over';
      }
      if (P.band) {   // Fries unter dem Gesims: Band mit vierblättrigen Blüten und Rauten
        const y0 = Y(h - .27), y1 = Y(h - .52), bh = y1 - y0, cy = (y0 + y1) / 2, step = S(.32);
        g.fillStyle = P.band; g.fillRect(0, y0, cw, bh);
        g.fillStyle = P.motif; g.fillRect(0, y0 + 3, cw, 2.5); g.fillRect(0, y1 - 5.5, cw, 2.5);
        for (let x = step / 2; x < cw; x += step) {
          g.fillStyle = P.motif;
          for (let k = 0; k < 4; k++) { g.save(); g.translate(x, cy); g.rotate(k * Math.PI / 2 + Math.PI / 4); g.beginPath(); g.ellipse(0, -bh * .17, bh * .075, bh * .17, 0, 0, 7); g.fill(); g.restore(); }
          g.fillStyle = P.band; g.beginPath(); g.arc(x, cy, bh * .06, 0, 7); g.fill();
          g.fillStyle = P.motif; g.save(); g.translate(x + step / 2, cy); g.rotate(Math.PI / 4); g.fillRect(-bh * .07, -bh * .07, bh * .14, bh * .14); g.restore();
        }
      }
      if (P.alpona) {   // weiße Reispaste-Malerei: Ranke mit Lotusblüten und Punkten, oben eine Bogenkante
        g.strokeStyle = P.motif; g.fillStyle = P.motif; g.lineWidth = 2.6; g.lineCap = 'round';
        const yv = Y(.7); g.beginPath(); for (let x = 0; x <= cw; x += 4) { const y = yv + Math.sin(x / S(.25) * Math.PI) * S(.05); if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
        for (let x = S(.25); x < cw; x += S(.5)) {
          for (let k = -2; k <= 2; k++) { g.save(); g.translate(x, yv - S(.03)); g.rotate(k * .42); g.beginPath(); g.ellipse(0, -S(.06), S(.022), S(.06), 0, 0, 7); g.fill(); g.restore(); }
          g.beginPath(); g.arc(x, yv + S(.02), S(.018), 0, 7); g.fill();
        }
        for (let x = S(.5); x < cw; x += S(.5)) for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x, yv + S(.1) + k * S(.04), S(.01), 0, 7); g.fill(); }
        const yt = Y(h - .16); g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(0, yt); g.lineTo(cw, yt); g.stroke();
        for (let x = 0; x < cw; x += S(.16)) { g.beginPath(); g.arc(x + S(.08), yt, S(.08), 0, Math.PI); g.stroke(); g.beginPath(); g.arc(x + S(.08), yt + S(.12), S(.012), 0, 7); g.fill(); }
      }
      // Feuchte und Spritzwasser am Fuß
      const fr = g.createLinearGradient(0, Y(.75), 0, ch); fr.addColorStop(0, `rgba(${P.grime},0)`); fr.addColorStop(.6, `rgba(${P.grime},.2)`); fr.addColorStop(1, `rgba(${P.grime},.48)`);
      g.fillStyle = fr; g.fillRect(0, Y(.75), cw, ch - Y(.75));
      for (let i = 0; i < len * 7; i++) { const x = r() * cw, rad = S(.12 + r() * .3), y = ch - r() * S(.25), rg = g.createRadialGradient(x, y, 0, x, y, rad); rg.addColorStop(0, `rgba(${P.grime},.26)`); rg.addColorStop(1, `rgba(${P.grime},0)`); g.fillStyle = rg; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
      for (let i = 0; i < len * 60; i++) { g.fillStyle = `rgba(${P.grime},${.15 + r() * .35})`; g.beginPath(); g.arc(r() * cw, ch - Math.pow(r(), 2) * S(.35), .6 + r() * 1.6, 0, 7); g.fill(); }
      // Regenspuren unter den Fenstern und von der Traufe
      const streak = (x, y0, l, wd, col, a) => { const gr = g.createLinearGradient(0, y0, 0, y0 + l); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(x - wd / 2, y0, wd, l); };
      const rust = '128,70,36';
      holes.forEach(o => { if (o.y < .3) return; for (let i = 0; i < 7; i++) streak(X(o.x - o.w / 2 + r() * o.w), Y(o.y) + 4, S(.3 + r() * .7), 1.5 + r() * 5, P.rust && r() < .5 ? rust : P.grime, .1 + r() * .14); });
      for (let i = 0; i < len * 3; i++) streak(r() * cw, Y(h - .02), S(.2 + r() * .8), 2 + r() * 8, P.rust && r() < .4 ? rust : P.grime, .06 + r() * .1);
      // Haarrisse an den Fensterecken, auf Lehm auch in der Fläche, dazu nachgeschmierte Flecken
      const crack = (x, y, ang, n) => { g.strokeStyle = 'rgba(52,40,30,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < n; k++) { ang += (r() - .5) * .9; x += Math.cos(ang) * S(.05); y += Math.sin(ang) * S(.05); g.lineTo(x, y); } g.stroke(); };
      if (id !== 'tin') {
        holes.forEach(o => { if (r() < .7) crack(X(o.x + o.w / 2), Y(o.y + o.h), -.8, 4 + r() * 5); if (o.y > .3 && r() < .6) crack(X(o.x - o.w / 2), Y(o.y), 2.3, 3 + r() * 5); });
        for (let i = 0; i < (id === 'mud' ? len * 2 : len * .4); i++) crack(r() * cw, r() * ch, r() * 6, 4 + r() * 8);
      }
      if (id === 'mud') for (let i = 0; i < len * 2; i++) { const x = r() * cw, y = r() * ch, rad = S(.1 + r() * .25), rg = g.createRadialGradient(x, y, 0, x, y, rad), c = r() < .5 ? '255,236,200' : '80,56,36'; rg.addColorStop(0, `rgba(${c},.18)`); rg.addColorStop(1, `rgba(${c},0)`); g.fillStyle = rg; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
      holes.forEach(o => g.clearRect(X(o.x - o.w / 2) - 1, Y(o.y + o.h) - 1, S(o.w) + 2, S(o.h) + 2));
    }, Math.round(len * 100 + h * 10) + id.length * 7 + key.length * 3);
    return (DECAL_CACHE[ck] = decalMat(map));
  }

  // Bodenschatten + festgetretener Erdring + Tropfkante rund um ein Haus. 9-Slice-Textur: u, v ∈ [.25, .75] ist die
  // Grundfläche, außen der Rand (gleich breit, egal wie groß das Haus ist).
  let groundRectTexC = null;
  function groundRectTex() {
    if (groundRectTexC) return groundRectTexC;
    const S = 512, r = rng(88), f = noiseField(S, S, r, 8, 8, 4, .55);
    groundRectTexC = decalTex(S, S, g => {
      const img = g.createImageData(S, S), d = img.data;
      for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
        const u = px / S, v = py / S, i = py * S + px;
        const dx = u < .25 ? (.25 - u) / .25 : u > .75 ? (u - .75) / .25 : 0, dy = v < .25 ? (.25 - v) / .25 : v > .75 ? (v - .75) / .25 : 0;
        const dd = Math.hypot(dx, dy), inside = !dx && !dy;
        const ao = inside ? .75 : .62 * Math.pow(Math.max(0, 1 - dd / .5), 2.2);
        const soil = 1 - sstep(.4, .95, dd + (f[i] - .5) * .5);
        const drip = Math.exp(-Math.pow((dd - .42 - (f[i] - .5) * .12) / .11, 2)) * sstep(.35, .7, f[i]) * .55;
        const k = Math.min(1, ao * 1.25 + drip * .4);
        d[i * 4] = 136 * (1 - k * .78); d[i * 4 + 1] = 110 * (1 - k * .78); d[i * 4 + 2] = 80 * (1 - k * .8);
        d[i * 4 + 3] = 255 * Math.min(1, soil * .72 + ao + drip * .25);
      }
      g.putImageData(img, 0, 0);
    }, 88);
    groundRectTexC.wrapS = groundRectTexC.wrapT = THREE.ClampToEdgeWrapping;
    return groundRectTexC;
  }
  // Fläche für groundRectTex: Haus w × d, Rand m; xf(x, z) -> [x, y, z] zum Auflegen aufs Gelände
  function footprintGeo(w, d, m, xf = null) {
    const xs = [-w / 2 - m, -w / 2 - m / 2, -w / 2, w / 2, w / 2 + m / 2, w / 2 + m], zs = [-d / 2 - m, -d / 2 - m / 2, -d / 2, d / 2, d / 2 + m / 2, d / 2 + m], us = [0, .125, .25, .75, .875, 1];
    const pos = [], nor = [], uv = [], idx = [];
    zs.forEach((z, j) => xs.forEach((x, i) => { const p = xf ? xf(x, z) : [x, 0, z]; pos.push(p[0], p[1], p[2]); nor.push(0, 1, 0); uv.push(us[i], 1 - us[j]); }));
    for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) { const a = j * 6 + i, b = a + 1, c = a + 6, e = c + 1; idx.push(a, c, b, b, c, e); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    return geo;
  }

  // Gestampfter Erdhügel (Erdsockel, Plattform): abgerundeter Grundriss, Flanke mit Fuß und Schulter, Buckel und
  // Erosionsrinnen, oben eine ebene, festgetretene Fläche. Flanke mit Grasnarbe oben (Textur moundSide).
  function mound(wb, db, wt, dt, h, M_, seed = 5) {
    const r = rng(seed), NA = 112, NH = 9, ph = [r() * 6, r() * 6, r() * 6, r() * 6];
    const sq = th => { const c = Math.cos(th), s = Math.sin(th); return [Math.sign(c) * Math.pow(Math.abs(c), .5), Math.sign(s) * Math.pow(Math.abs(s), .5)]; };
    const perimU = Math.max(4, Math.round((wb + db) * 1.9 / Math.max(.8, h))), pos = [], uv = [], col = [], idx = [], top = [];
    for (let k = 0; k <= NH; k++) {
      const t = k / NH, e = .5 * t + .5 * t * t * (3 - 2 * t), a = wb / 2 + (wt / 2 - wb / 2) * e, b = db / 2 + (dt / 2 - db / 2) * e, mid = Math.sin(Math.PI * t);
      for (let i = 0; i <= NA; i++) {
        const th = i / NA * Math.PI * 2, [sx, sz] = sq(th);
        const lump = (Math.sin(th * 5 + ph[0]) * .5 + Math.sin(th * 11 + ph[1]) * .3 + Math.sin(th * 23 + ph[2] + t * 3) * .2) * .08 * mid - .06 * Math.pow(Math.max(0, Math.sin(th * 13 + ph[3])), 8) * mid;
        const x = (a + lump) * sx, z = (b + lump) * sz, y = h * t + (k > 0 && k < NH ? Math.sin(th * 7 + ph[1]) * .02 * mid : 0);
        pos.push(x, y, z); uv.push(i / NA * perimU, t);
        const ao = .74 + .26 * sstep(0, .4, t); col.push(ao, ao, ao);
        if (k === NH && i < NA) top.push([x, y, z]);
      }
    }
    for (let k = 0; k < NH; k++) for (let i = 0; i < NA; i++) { const a = k * (NA + 1) + i, b = a + 1, c = a + NA + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const side = new THREE.BufferGeometry();
    side.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); side.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); side.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    side.setIndex(idx); side.computeVertexNormals();
    const tp = [0, h, 0], tuv = [0, 0], tidx = [];
    top.forEach(([x, y, z]) => { tp.push(x, y + .004, z); tuv.push(x, z); });
    for (let i = 0; i < top.length; i++) tidx.push(0, 1 + (i + 1) % top.length, 1 + i);
    const cap = new THREE.BufferGeometry();
    cap.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3)); cap.setAttribute('uv', new THREE.Float32BufferAttribute(tuv, 2));
    cap.setIndex(tidx); cap.computeVertexNormals();
    const g = new THREE.Group(), sideM = mesh(side, M_.moundSide()), capM = mesh(cap, M_.earth());
    g.add(sideM, capM);
    g.userData.mound = { side: sideM, cap: capM, NA, NH, h };   // für die Erosion (schaden.js)
    return g;
  }

  /* ---------- Bauteile ---------- */

  function buildFoundation(id, M_) {
    const g = new THREE.Group();
    const fw = W + .6, fd = D + .6;
    if (id === 'earth') {
      const lift = 34 / M;
      g.add(mound(fw + .9, fd + .9, fw, fd, lift, M_, 7));
      // Erdstufen vorn bei der Tür, die Kanten mit Bambus gefasst
      g.add(box(1.6, lift * .5, .7, M_.earth(), -1, 0, fd / 2 + .55 + .1));
      g.add(box(1.6, lift * .22, .5, M_.earth(), -1, 0, fd / 2 + 1.0));
      g.add(beam([-1.8, lift * .5, fd / 2 + 1.0], [-.2, lift * .5, fd / 2 + 1.0], .035, M_.bamboo()));
      g.add(beam([-1.8, lift * .22, fd / 2 + 1.25], [-.2, lift * .22, fd / 2 + 1.25], .035, M_.bamboo()));
      return { group: g, lift };
    }
    if (id === 'concrete') {
      const lift = 8 / M;
      g.add(box(W + .9, lift, D + .9, M_.concrete()));
      return { group: g, lift };
    }
    if (id === 'brick') {
      const lift = 50 / M;
      g.add(box(fw, lift, fd, M_.brick()));
      g.add(box(fw + .08, .1, fd + .08, M_.concrete(), 0, lift - .08, 0));
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => g.add(box(.42, lift + .05, .42, M_.concrete(), sx * (fw / 2 - .08), 0, sz * (fd / 2 - .08))));
      [0, 1, 2].forEach(i => g.add(box(1.4, lift / 3 * (3 - i) * .72, .34, M_.brick(), -1, 0, fd / 2 + .17 + i * .34)));
      return { group: g, lift };
    }
    // Pfahlbau
    const lift = 34 / M, deck = .14;
    const cols = [-2.6, -.87, .87, 2.6], rows = [-1.8, 0, 1.8];
    cols.forEach(x => rows.forEach(z => {
      const geo = new THREE.CylinderGeometry(.085, .085, lift - deck - .16, 12);
      const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * (lift - deck) / .55);
      const st = mesh(geo, M_.bamboo(), x, .16 + (lift - deck - .16) / 2, z); st.userData.stilt = [x, z]; g.add(st);
      g.add(box(.3, .16, .3, M_.concrete(), x, 0, z));
    }));
    rows.forEach(z => g.add(beam([-W / 2 - .2, lift - deck - .05, z], [W / 2 + .2, lift - deck - .05, z], .07, M_.bamboo())));
    cols.forEach(x => g.add(beam([x, lift - deck - .05, -D / 2 - .2], [x, lift - deck - .05, D / 2 + .2], .06, M_.bamboo())));
    [[-2.6, -1.8, -.87, 0], [.87, 0, 2.6, 1.8]].forEach(([x1, z1, x2, z2]) =>
      g.add(beam([x1, .3, z1], [x2, lift - deck - .1, z2], .035, M_.bamboo())));
    const deckM = box(fw, deck, fd, M_.wood(), 0, lift - deck, 0); deckM.userData.deck = true; g.add(deckM);
    for (let i = 0; i < 2; i++) g.add(box(1.4, .06, .3, M_.wood(), -1, lift * (.35 + i * .35), fd / 2 + .15 + (1 - i) * .3));
    return { group: g, lift };
  }

  // Bodenhöhe des Hauses über dem Boden (ohne Erdplattform), ohne Fundament = 0.
  function liftOf(id) { return id === 'concrete' ? 8 / M : id === 'brick' ? 50 / M : id ? 34 / M : 0; }

  function window_(g, M_, side, o, t) {
    // Rahmen, Scheibe mit Sprossen und Fensterbank an der Außenseite. side: Lage lokal (z = Außenfläche).
    const { x, y, w, h } = o;
    const fr = .07;
    g.add(box(w + .14, fr + .02, t + .1, M_.woodDark(), x, y + h - .02, 0));
    g.add(box(w + .24, fr + .02, t + .22, M_.woodDark(), x, y - fr, 0));
    g.add(box(fr, h, t + .1, M_.woodDark(), x - w / 2 - fr / 2 + .035, y, 0));
    g.add(box(fr, h, t + .1, M_.woodDark(), x + w / 2 + fr / 2 - .035, y, 0));
    g.add(box(w, h, .03, M_.glass(), x, y, -t / 2 + .06));
    g.add(box(.03, h, .05, M_.woodDark(), x, y, -t / 2 + .09));
    g.add(box(w, .03, .05, M_.woodDark(), x, y + h / 2, -t / 2 + .09));
    const out = t / 2;
    if (side === 'brickwall' || side === 'ferro') {
      // Putzfaschen um das Fenster, Sonnendach (Chajja) darüber, Gitterstäbe davor
      const sm = M_.trim();
      g.add(box(.11, h + .19, t + .07, sm, x - w / 2 - .09, y - .07, 0));
      g.add(box(.11, h + .19, t + .07, sm, x + w / 2 + .09, y - .07, 0));
      g.add(box(w + .4, .1, t + .07, sm, x, y + h + .06, 0));
      g.add(box(w + .6, .05, .42, sm, x, y + h + .17, out + .16));
      g.add(box(w + .62, .03, .02, M_.black(), x, y + h + .155, out + .37));
      for (let i = 1; i < 6; i++) g.add(box(.018, h - .02, .018, M_.metal(), x - w / 2 + w * i / 6, y + .01, out - .03));
      g.add(box(w - .02, .02, .02, M_.metal(), x, y + h * .5, out - .03));
    } else if (side) {
      // Holzläden, halb aufgeklappt, mit Querleisten; darüber ein Holzsturz
      const sh = M_.shutter();
      [-1, 1].forEach(s => {
        const piv = new THREE.Group(); piv.position.set(x + s * (w / 2 + .045), y, out + .03);
        piv.add(box(w / 2 - .01, h, .035, sh, s * w / 4, 0, 0));
        [.16, .84].forEach(f => piv.add(box(w / 2 - .07, .05, .02, sh, s * w / 4, h * f - .025, .025)));
        piv.add(box(.05, .03, .03, M_.black(), s * .02, h * .2, .01)); piv.add(box(.05, .03, .03, M_.black(), s * .02, h * .8, .01));
        piv.rotation.y = -s * .28; g.add(piv);
      });
      g.add(box(w + .36, .1, t + .08, M_.woodDark(), x, y + h + .07, 0));
    }
  }

  function buildWalls(id, gableRise, M_) {
    const cfg = WALLS[id], t = cfg.t, mat = M_[cfg.mat]();
    const g = new THREE.Group();
    const door = { x: -1.1, y: 0, w: .98, h: 1.95 }, win1 = { x: 1.45, y: .95, w: 1.2, h: 1.0 };
    const front = wallPanel(W, H, t, [door, win1], 0, mat); front.position.z = D / 2 - t; g.add(front);
    const back = wallPanel(W, H, t, [{ x: 0, y: .95, w: 1.2, h: 1.0 }], 0, mat); back.rotation.y = Math.PI; back.position.z = -D / 2 + t; g.add(back);
    const sideHole = { x: 0, y: .95, w: 1.0, h: 1.0 };
    const right = wallPanel(D - 2 * t, H, t, [sideHole], gableRise, mat); right.rotation.y = Math.PI / 2; right.position.x = W / 2 - t; g.add(right);
    const left = wallPanel(D - 2 * t, H, t, [sideHole], gableRise, mat); left.rotation.y = -Math.PI / 2; left.position.x = -W / 2 + t; g.add(left);
    // Tür und Fenster
    const doorLeaf = box(door.w - .04, door.h - .03, .05, M_.door(), door.x, 0, D / 2 - t * .5);
    g.add(doorLeaf);
    g.add(box(door.w + .18, .1, t + .12, M_.woodDark(), door.x, door.h - .02, D / 2 - t / 2));
    g.add(box(.09, door.h, t + .12, M_.woodDark(), door.x - door.w / 2 - .035, 0, D / 2 - t / 2));
    g.add(box(.09, door.h, t + .12, M_.woodDark(), door.x + door.w / 2 + .035, 0, D / 2 - t / 2));
    g.add(box(.05, .2, .06, M_.metal(), door.x + .32, 1.0, D / 2 - t * .5 + .04));
    // Doppelflügel: Fuge in der Mitte, zwei eiserne Ringgriffe, Schwelle aus Beton
    const dz = D / 2 - t * .5 + .03;
    g.add(box(.014, door.h - .06, .01, M_.black(), door.x, .01, dz));
    [-1, 1].forEach(s => { const ring = mesh(new THREE.TorusGeometry(.035, .007, 6, 14), M_.metal(), door.x + s * .07, 1.02, dz + .01); g.add(ring); });
    g.add(box(door.w + .32, .05, t + .24, M_.concrete(), door.x, -.03, D / 2 - t / 2 + .06));
    // Bemalung und Verwitterung als Abziehbild auf jeder Außenfläche
    const deco = (panel, key, len, holes) => { const dm = new THREE.Mesh(new THREE.PlaneGeometry(len, H), wallDecalMat(id, key, len, H, holes)); dm.position.set(0, H / 2, t + .006); dm.receiveShadow = true; dm.renderOrder = 1; panel.add(dm); };
    deco(front, 'front', W, [door, win1]); deco(back, 'back', W, [{ x: 0, y: .95, w: 1.2, h: 1.0 }]);
    deco(right, 'right', D - 2 * t, [sideHole]); deco(left, 'left', D - 2 * t, [sideHole]);
    // Für das Schadensmodell (schaden.js): Seite (wie in flut.js), Maße, Öffnungen und Bemalung jeder Wand
    [[front, 'tuer', W, [door, win1], 0], [back, 'fluss', W, [{ x: 0, y: .95, w: 1.2, h: 1.0 }], 0], [right, 'ost', D - 2 * t, [sideHole], gableRise], [left, 'west', D - 2 * t, [sideHole], gableRise]]
      .forEach(([p, side, len, holes, gable]) => { p.userData.panel = { id, side, len, h: H, t, holes, gable: gable || 0, decal: p.children[0] }; });
    // Gesims, Zierband und Eck-Lisenen (verputzte Wände), Holz-Ringbalken (Lehm)
    const ring = (mat, hh, y, out) => {
      g.add(box(W + 2 * out, hh, out + .02, mat, 0, y, D / 2 + out / 2 - .01));
      g.add(box(W + 2 * out, hh, out + .02, mat, 0, y, -D / 2 - out / 2 + .01));
      g.add(box(out + .02, hh, D, mat, W / 2 + out / 2 - .01, y, 0));
      g.add(box(out + .02, hh, D, mat, -W / 2 - out / 2 + .01, y, 0));
    };
    if (id === 'brickwall' || id === 'ferro') {
      ring(M_.trim(), .16, H - .16, .06); ring(M_.trim(), .05, H - .23, .035);
      if (id === 'brickwall') [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => g.add(box(.32, H - .5, .32, M_.trim(), sx * (W / 2 - .14), .27, sz * (D / 2 - .14))));
    } else if (id === 'mud') ring(M_.woodDark(), .1, H - .1, .04);
    // Glühbirne neben der Tür, Kabel zur Traufe
    if (id !== 'tin') {
      const bx = door.x + door.w / 2 + .34, zf = D / 2;
      g.add(box(.05, .05, .14, M_.black(), bx, 2.0, zf + .07));
      g.add(mesh(new THREE.SphereGeometry(.045, 12, 8), M_.bulb(), bx, 1.97, zf + .14));
      g.add(beam([bx, 2.05, zf + .012], [bx + .7, H - .02, zf + .012], .006, M_.black()));
    }
    const place = (o, px, pz, ry) => { const w = new THREE.Group(); window_(w, M_, id, { ...o, x: 0 }, t); w.position.set(px, 0, pz); w.rotation.y = ry; g.add(w); };
    place(win1, win1.x, D / 2 - t / 2, 0);
    place({ x: 0, y: .95, w: 1.2, h: 1.0 }, 0, -D / 2 + t / 2, Math.PI);
    place(sideHole, W / 2 - t / 2, 0, Math.PI / 2);
    place(sideHole, -W / 2 + t / 2, 0, -Math.PI / 2);
    if (cfg.post) {
      // Holzrahmen des Blechhauses: Eckpfosten, Fußbalken und Riegel außen
      const ps = [[-W / 2, D / 2], [W / 2, D / 2], [W / 2, -D / 2], [-W / 2, -D / 2]];
      ps.forEach(([x, z]) => g.add(box(.14, H + .06, .14, M_.woodDark(), x, 0, z)));
      [[-W / 2, D / 2, W / 2, D / 2], [-W / 2, -D / 2, W / 2, -D / 2]].forEach(([x1, z1, x2, z2]) => {
        g.add(beam([x1, .05, z1], [x2, .05, z2], .06, M_.woodDark(), true));
        g.add(beam([x1, H, z1], [x2, H, z2], .06, M_.woodDark(), true));
        g.add(beam([x1, H / 2 + .1, z1], [x2, H / 2 + .1, z2], .04, M_.woodDark(), true));
      });
    }
    // Sockel rundum, an der Tür ausgespart (sonst läge ein Streifen quer im Türloch)
    const plinth = (hh, out, mat) => {
      const dz = D / 2 + out, dx = W / 2 + out, th = t + out + .01;
      const dl = door.x - door.w / 2 - .09, dr = door.x + door.w / 2 + .09;
      g.add(box(dl + dx, hh, th, mat, (-dx + dl) / 2, 0, dz - th / 2));
      g.add(box(dx - dr, hh, th, mat, (dr + dx) / 2, 0, dz - th / 2));
      g.add(box(dx * 2, hh, th, mat, 0, 0, -dz + th / 2));
      g.add(box(th, hh, D - 2 * t, mat, dx - th / 2, 0, 0));
      g.add(box(th, hh, D - 2 * t, mat, -dx + th / 2, 0, 0));
    };
    if (id === 'mud') plinth(.2, .025, M_.black());       // wasserabweisender Sockelanstrich
    if (id === 'brickwall') plinth(.28, .05, M_.concrete());
    return g;
  }

  function buildRoof(id, M_) {
    const g = new THREE.Group();
    const o = .5;
    if (id === 'concreteflat') {
      g.add(box(W + .5, .16, D + .5, M_.concrete(), 0, H, 0));
      const pw = .14, ph = .22;
      g.add(box(W + .5, ph, pw, M_.concrete(), 0, H + .16, D / 2 + .25 - pw / 2));
      g.add(box(W + .5, ph, pw, M_.concrete(), 0, H + .16, -D / 2 - .25 + pw / 2));
      g.add(box(pw, ph, D + .5 - 2 * pw, M_.concrete(), W / 2 + .25 - pw / 2, H + .16, 0));
      g.add(box(pw, ph, D + .5 - 2 * pw, M_.concrete(), -W / 2 - .25 + pw / 2, H + .16, 0));
      g.add(box(.5, .08, .14, M_.concrete(), 1.8, H - .02, D / 2 + .35)); // Wasserspeier
      g.userData.roofFlat = true;
      return { group: g, rise: 0 };
    }
    if (id === 'tinhip') {
      const p = Math.tan(24 * Math.PI / 180), X = W / 2 + o, Z = D / 2 + o, rise = (D / 2) * p, drop = o * p, rl = (W - D) / 2;
      const y0 = H - drop, yr = H + rise;
      const e = [[-X, y0, Z], [X, y0, Z], [X, y0, -Z], [-X, y0, -Z]], r1 = [-rl, yr, 0], r2 = [rl, yr, 0];
      const m = M_.tin(), skin = (pts, side) => { const s = slab(pts, .045, m); s.userData.skin = { pts, th: .045, side, kind: 'tin' }; g.add(s); };
      skin([e[0], e[1], r2, r1], 'tuer'); skin([e[2], e[3], r1, r2], 'fluss'); skin([e[1], e[2], r2], 'ost'); skin([e[3], e[0], r1], 'west');
      const rm = M_.metal();
      g.add(beam(r1, r2, .07, rm));
      g.add(beam(r1, e[0], .045, rm)); g.add(beam(r2, e[1], .045, rm)); g.add(beam(r2, e[2], .045, rm)); g.add(beam(r1, e[3], .045, rm));
      // Sparrenköpfe aus Holz unter dem Dachrand
      for (let x = -X + .4; x < X - .2; x += .8) {
        g.add(box(.08, .1, .5, M_.woodDark(), x, y0 - .12, Z - .15));
        g.add(box(.08, .1, .5, M_.woodDark(), x, y0 - .12, -Z + .15 - .5 + .5));
      }
      // Stirnbretter an der Traufe und, wie in Bangladesch üblich, ein paar Ziegel als Sturmsicherung auf dem Blech
      [[e[0], e[1]], [e[1], e[2]], [e[2], e[3]], [e[3], e[0]]].forEach(([a, b]) => g.add(beam([a[0], a[1] - .06, a[2]], [b[0], b[1] - .06, b[2]], .04, M_.woodDark(), true)));
      const ang = Math.atan(p), lerp3 = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
      [[.18, .3, 1], [.24, .62, 1], [.66, .4, 1], [.8, .7, 1], [.3, .45, -1], [.72, .55, -1]].forEach(([s, k, sd]) => {
        const P = sd > 0 ? lerp3(lerp3(e[0], e[1], s), lerp3(r1, r2, s), k) : lerp3(lerp3(e[3], e[2], s), lerp3(r1, r2, s), k);
        const bk = mesh(boxGeo(.24, .07, .115), M_.terracotta(), P[0], P[1] + Math.cos(ang) * .035, P[2] + sd * Math.sin(ang) * .035);
        bk.rotation.set(sd * ang, (s - .5) * .6, 0); g.add(bk);
      });
      return { group: g, rise: 0 };
    }
    // Satteldächer (Ziegel, Gras)
    const thatch = id === 'thatch';
    const pitch = (thatch ? 40 : 30) * Math.PI / 180, p = Math.tan(pitch), ov = thatch ? .6 : .5;
    const X = W / 2 + ov, Z = D / 2 + ov, rise = (D / 2) * p, drop = ov * p, y0 = H - drop, yr = H + rise;
    const th = thatch ? .3 : .1, mat = thatch ? M_.thatch() : M_.tile();
    const e = [[-X, y0, Z], [X, y0, Z], [X, y0, -Z], [-X, y0, -Z]];
    [[[e[0], e[1], [X, yr, 0], [-X, yr, 0]], 'tuer'], [[e[2], e[3], [-X, yr, 0], [X, yr, 0]], 'fluss']].forEach(([pts, side]) => {
      const s = slab(pts, th, mat); s.userData.skin = { pts, th, side, kind: thatch ? 'thatch' : 'tile' }; g.add(s);
    });
    g.add(beam([-X, yr + .02, 0], [X, yr + .02, 0], thatch ? .17 : .1, thatch ? M_.thatch() : M_.tile()));
    if (thatch) { // Bambusgerüst am Rand
      g.add(beam([-X, y0 - th, Z], [X, y0 - th, Z], .04, M_.bamboo()));
      g.add(beam([-X, y0 - th, -Z], [X, y0 - th, -Z], .04, M_.bamboo()));
      // aufgebundene Bambuslatten quer über das Stroh, der First mit Bündeln abgebunden
      [.28, .6].forEach(k => [1, -1].forEach(sd => { const y = y0 + (yr - y0) * k + .03, z = sd * Z * (1 - k); g.add(beam([-X + .1, y, z], [X - .1, y, z], .03, M_.bamboo())); }));
      for (let x = -X + .4; x < X; x += .9) { const tr = mesh(new THREE.TorusGeometry(.19, .028, 6, 14), M_.bamboo(), x, yr + .02, 0); tr.rotation.y = Math.PI / 2; g.add(tr); }
    } else {
      g.add(beam([-X, y0 - .02, Z], [X, y0 - .02, Z], .05, M_.woodDark(), true));
      g.add(beam([-X, y0 - .02, -Z], [X, y0 - .02, -Z], .05, M_.woodDark(), true));
      // Windbretter an den Giebeln und Firstknäufe aus Ton
      [-1, 1].forEach(sx => [1, -1].forEach(sz => g.add(beam([sx * (X + .02), y0 - .04, sz * Z], [sx * (X + .02), yr + .02, 0], .045, M_.woodDark(), true))));
      [-1, 1].forEach(sx => g.add(mesh(new THREE.SphereGeometry(.11, 12, 8), M_.terracotta(), sx * (X + .02), yr + .12, 0)));
    }
    return { group: g, rise };
  }

  function gableRiseOf(id) {
    if (id === 'tilegable') return (D / 2) * Math.tan(30 * Math.PI / 180) - .02;
    if (id === 'thatch') return (D / 2) * Math.tan(40 * Math.PI / 180) - .02;
    return 0;
  }

  function buildExtra(id, M_, ctx) {
    const g = new THREE.Group();
    if (id === 'platform') return g; // Plattform wird im Boden aufgebaut
    if (id === 'well') {
      const y0 = ctx.baseY;
      const px = SITE_W / 2 - 1.0, pz = 1.7;
      g.add(box(1.3, 1.2, 1.3, M_.concrete(), px, y0, pz));
      g.add(box(1.4, .1, 1.4, M_.concrete(), px, y0 + 1.2, pz));
      g.add(mesh(new THREE.CylinderGeometry(.11, .13, .9, 16), M_.pump(), px, y0 + 1.3 + .45, pz));
      g.add(mesh(new THREE.SphereGeometry(.15, 16, 12), M_.pump(), px, y0 + 2.25, pz));
      g.add(beam([px, y0 + 2.1, pz], [px - .55, y0 + 2.45, pz], .035, M_.metal()));
      g.add(beam([px + .1, y0 + 1.95, pz], [px + .5, y0 + 1.8, pz], .04, M_.pump()));
      // Latrine
      const lx = px, lz = -1.5;
      g.add(box(1.1, 1.2, 1.1, M_.concrete(), lx, y0, lz));
      g.add(box(.9, 1.7, .9, M_.tin(), lx, y0 + 1.2, lz));
      g.add(box(1.0, .06, 1.0, M_.tin(), lx, y0 + 2.9, lz));
      g.add(box(.5, 1.3, .04, M_.door(), lx - .46, y0 + 1.2, lz)).rotation.y = Math.PI / 2;
      return g;
    }
    if (id === 'vetiver') {
      // Vetiver wie gepflanzt: Hecken entlang der Kante (unregelmäßig, mit Lücken und versetzten Horsten), an den Ecken
      // dichter, dazu verstreute Horste und niedrige Büschel nach außen hin. Auf der Plattform wachsen sie auf der Böschung.
      if (!vetiverKit) {
        const mat = addWind(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .85, envMapIntensity: .45 }), .26, 1.1, .02, true);
        vetiverKit = { geos: [vetiverClumpGeo(51, 96), vetiverClumpGeo(52, 80, 1.1), vetiverClumpGeo(53, 54, .8)], mat };
      }
      const r = rng(42), hw = ctx.edgeW / 2, hd = ctx.edgeD / 2, onMound = ctx.baseY > .5;
      // Höhe des Bodens: flach, oder auf der Plattform-Böschung von oben (Hausrand) nach unten (Grundstücksrand)
      const tw = (W + 1.8) / 2, td = (D + 1.6) / 2, bw = (SITE_W - 1.2) / 2, bd = (SITE_D - 1.0) / 2;
      const groundY = (x, z) => {
        if (!onMound) return 0;
        const k = Math.max((Math.abs(x) - tw) / (bw - tw), (Math.abs(z) - td) / (bd - td));
        return ctx.baseY * (1 - Math.max(0, Math.min(1, k))) - (k > 0 && k < 1 ? .04 : 0);
      };
      const door = (x, z) => z > 0 && Math.abs(x + 1.1) < 1.0;
      const spots = [];
      const add = (x, z, sc, v) => { if (!door(x, z) && Math.abs(x) < (onMound ? bw : hw + 3) && Math.abs(z) < (onMound ? bd : hd + 3)) spots.push([x, z, sc, v]); };
      // Hecke: Horste ca. alle 35–60 cm, leicht versetzt, ab und zu eine Lücke oder ein kleiner Horst
      const rows = onMound ? [[tw + .35, td + .35], [(tw + bw) / 2, (td + bd) / 2]] : [[hw, hd], [hw + .55, hd + .55]];
      rows.forEach(([rw, rd], ri) => {
        const per = 4 * (rw + rd);
        for (let s = r() * .3; s < per; s += .28 + r() * .24 + ri * .14) {
          if (r() < .1) { s += .4; continue; }
          let x, z, u = s;
          if (u < 2 * rw) { x = -rw + u; z = rd; } else if ((u -= 2 * rw) < 2 * rd) { x = rw; z = rd - u; } else if ((u -= 2 * rd) < 2 * rw) { x = rw - u; z = -rd; } else { u -= 2 * rw; x = -rw; z = -rd + u; }
          x += (r() - .5) * .3; z += (r() - .5) * .3;
          add(x, z, (ri ? .75 : .9) + r() * .35, r() < .2 ? 2 : r() < .5 ? 1 : 0);
        }
      });
      // an den Ecken etwas dichter
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => { for (let k = 0; k < 4; k++) add(sx * (rows[0][0] + r() * .6), sz * (rows[0][1] + r() * .6), .8 + r() * .4, Math.floor(r() * 2)); });
      // verstreut: einzelne Horste und niedrige Büschel nach außen hin (wie ausgesät / angewachsen)
      for (let i = 0; i < 70; i++) {
        const a = r() * 6.28, rr = 1 + (onMound ? .2 + r() * .45 : .35 + Math.pow(r(), 1.4) * 1.9);
        const x = Math.cos(a) * rows[0][0] * rr, z = Math.sin(a) * rows[0][1] * rr;
        if (!onMound && Math.max(Math.abs(x) / hw, Math.abs(z) / hd) < 1.06) continue;
        add(x, z, .45 + r() * .5, r() < .6 ? 2 : 1);
      }
      const by = [[], [], []]; spots.forEach(s => by[s[3]].push(s));
      const dummy = new THREE.Object3D(), col = new THREE.Color();
      by.forEach((list, k) => {
        if (!list.length) return;
        const im = new THREE.InstancedMesh(vetiverKit.geos[k], vetiverKit.mat, list.length);
        im.userData.sharedGeo = true; im.castShadow = true; im.receiveShadow = true;
        list.forEach(([x, z, sc], i) => {
          dummy.position.set(x, groundY(x, z) - .02, z);
          dummy.rotation.set((r() - .5) * .1, r() * 6.28, (r() - .5) * .1);
          dummy.scale.set(sc * (.9 + r() * .25), sc * (.85 + r() * .3), sc * (.9 + r() * .25));
          dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
          const v = .8 + r() * .25; col.setRGB(v, v * (.97 + r() * .05), v * (.9 + r() * .08)); im.setColorAt(i, col);
        });
        g.add(im);
      });
      return g;
    }
    if (id === 'frame') {
      // Außenliegendes Tragwerk: Pfosten mit Betonfuß, Riegel und Kreuzverstrebungen
      const y0 = ctx.baseY, xs = [-W / 2, -W / 6, W / 6, W / 2], zf = D / 2 + .09, zb = -D / 2 - .09;
      xs.forEach(x => [zf, zb].forEach(z => {
        g.add(box(.2, .12, .2, M_.concrete(), x, y0 - .02, z));
        g.add(box(.14, H - .2, .14, M_.woodDark(), x, y0 + .1, z));
        g.add(box(.17, .4, .17, M_.black(), x, y0 + .1, z));
      }));
      [zf, zb].forEach(z => {
        g.add(beam([-W / 2, y0 + H - .16, z], [W / 2, y0 + H - .16, z], .065, M_.woodDark(), true));
        g.add(beam([-W / 2, y0 + .5, z], [W / 2, y0 + .5, z], .05, M_.woodDark(), true));
        for (let i = 0; i < 3; i++) {
          g.add(beam([xs[i], y0 + .52, z], [xs[i + 1], y0 + H - .2, z], .035, M_.woodDark(), true));
          g.add(beam([xs[i + 1], y0 + .52, z], [xs[i], y0 + H - .2, z], .035, M_.woodDark(), true));
        }
      });
      [W / 2, -W / 2].forEach(x => {
        const xo = x + Math.sign(x) * .09;
        g.add(beam([xo, y0 + .5, -D / 2], [xo, y0 + .5, D / 2], .05, M_.woodDark(), true));
        g.add(beam([xo, y0 + H - .16, -D / 2], [xo, y0 + H - .16, D / 2], .065, M_.woodDark(), true));
        g.add(beam([xo, y0 + .52, -D / 2], [xo, y0 + H - .2, D / 2], .035, M_.woodDark(), true));
        g.add(beam([xo, y0 + .52, D / 2], [xo, y0 + H - .2, -D / 2], .035, M_.woodDark(), true));
      });
      return g;
    }
    return g;
  }

  // Schild für die Pegelmarke: Titel, großer Wert, Zusatz
  function label(title, value, sub) {
    const c = document.createElement('canvas'); c.width = 520; c.height = 170;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(150,44,36,.94)'; g.beginPath(); g.roundRect ? g.roundRect(6, 6, 508, 158, 22) : g.rect(6, 6, 508, 158); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.font = '700 82px Inter, system-ui, sans-serif'; g.fillText(value, 30, 86);
    g.font = '600 31px Inter, system-ui, sans-serif'; g.fillText(title.replace('Höchster gemessener Pegel', 'Höchster Pegel'), 232, 66);
    g.globalAlpha = .85; g.font = '500 26px Inter, system-ui, sans-serif'; g.fillText(sub, 232, 106);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true }));
    s.scale.set(1.35, .44, 1); s.renderOrder = 10;
    return s;
  }

  /* ---------- Landschaft (Luftbild von Sirajganj) ---------- */

  /* ---------- Dorf-Landschaft rund um das Grundstück (Ufer der Jamuna) ---------- */
  // Das Haus steht bei 0/0, die Tür zeigt nach +z (zur Kamera). Hinter dem Haus (−z) fließt der Fluss,
  // vorn und rechts liegen Reisfelder, links das Dorf mit Teich. Vorn bleibt alles flach, damit nichts vor dem Haus steht.

  // Geometrien zu einer zusammenfassen (position, normal, uv, optional color)
  function mergeGeos(list) {
    const parts = list.map(g => (g.index ? g.toNonIndexed() : g));
    let n = 0; parts.forEach(g => { n += g.attributes.position.count; });
    const hasCol = parts.some(g => g.attributes.color);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = hasCol ? new Float32Array(n * 3) : null;
    let o = 0;
    parts.forEach(g => {
      if (!g.attributes.normal) g.computeVertexNormals();
      const c = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      if (col) { if (g.attributes.color) col.set(g.attributes.color.array, o * 3); else col.fill(1, o * 3, (o + c) * 3); }
      o += c;
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return out;
  }
  // Räumliche Aufteilung großer InstancedMesh (Gras, Bäume, Büsche …) in Zellen. three.js r149 prüft bei Instanzen nur die
  // Kugel der Einzel-Geometrie am Ursprung, also wird sonst immer ALLES gezeichnet (auch im Schattendurchgang). Jede Zelle
  // bekommt hier eine eigene, passende Hüllkugel und wird dadurch nur gezeichnet, wenn sie im Bild (oder im Schattenbereich) liegt.
  // (Die mitgelieferte three.js-Version setzt frustumCulled bei jedem InstancedMesh selbst auf false.)
  // Geometrie-Puffer bleiben geteilt (gleiche Attribute), es entsteht also kein zusätzlicher Speicher für die Eckpunkte.
  // Ausgestanzte Flächen (Blätter, Gras, Wedel mit alphaTest) bekommen weiche Kanten über die Mehrfachabtastung
  // (alpha to coverage). Ohne das ist der Rand jedes Blatts eine harte Pixeltreppe, die die Kantenglättung nicht erfasst.
  function smoothCutouts(root) {
    root.traverse(o => { if (!o.material) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.alphaTest > 0 && !m.alphaToCoverage) { m.alphaToCoverage = true; m.needsUpdate = true; } }); });
  }
  // LOD_CHUNKS: alle Zellen mit ihrer Objektgröße (lodSize, m). Im weiten Blick (Challenge) werden kleine Dinge wie Grasbüschel
  // und Kiesel aus großer Entfernung ausgeblendet: Sie wären dort nur ein bis zwei Pixel groß und flimmern als Pixelrauschen.
  const LOD_CHUNKS = [];
  function chunkInstanced(root, cell = 22, minCount = 24, margin = 2.5) {
    const list = [];
    root.traverse(o => { if (o.isInstancedMesh && !o.userData.chunked && !o.userData.noChunk && o.count >= minCount && !(o.material && o.material.isShaderMaterial)) list.push(o); });
    list.forEach(im => {
      const geo = im.geometry; geo.computeBoundingSphere();
      const gr = geo.boundingSphere.radius + geo.boundingSphere.center.length(), e = im.instanceMatrix.array, col = im.instanceColor ? im.instanceColor.array : null;
      const cells = new Map();
      for (let i = 0; i < im.count; i++) {
        const key = Math.floor(e[i * 16 + 12] / cell) + ',' + Math.floor(e[i * 16 + 14] / cell);
        let a = cells.get(key); if (!a) cells.set(key, a = []); a.push(i);
      }
      const parent = im.parent; if (!parent) return;
      cells.forEach(ids => {
        const n = ids.length, g2 = new THREE.BufferGeometry();
        g2.index = geo.index; g2.attributes = geo.attributes; g2.groups = geo.groups; g2.morphAttributes = geo.morphAttributes;
        let cx = 0, cy = 0, cz = 0;
        ids.forEach(i => { cx += e[i * 16 + 12]; cy += e[i * 16 + 13]; cz += e[i * 16 + 14]; });
        cx /= n; cy /= n; cz /= n;
        let rad = 0, size = 0;
        ids.forEach(i => {
          const o = i * 16, sc = Math.max(Math.hypot(e[o], e[o + 1], e[o + 2]), Math.hypot(e[o + 4], e[o + 5], e[o + 6]), Math.hypot(e[o + 8], e[o + 9], e[o + 10]));
          rad = Math.max(rad, Math.hypot(e[o + 12] - cx, e[o + 13] - cy, e[o + 14] - cz) + gr * sc);
          size += geo.boundingSphere.radius * sc / n;
        });
        g2.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, cy, cz), rad + margin);
        const m = new THREE.InstancedMesh(g2, im.material, n);
        ids.forEach((src, k) => {
          m.instanceMatrix.array.set(e.subarray(src * 16, src * 16 + 16), k * 16);
          if (col) { if (!m.instanceColor) m.setColorAt(k, new THREE.Color()); m.instanceColor.array.set(col.subarray(src * 3, src * 3 + 3), k * 3); }
        });
        m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
        m.frustumCulled = true; m.castShadow = im.castShadow; m.receiveShadow = im.receiveShadow; m.renderOrder = im.renderOrder; m.name = im.name; m.userData.chunked = true;
        m.userData.lodSize = size;
        parent.add(m); LOD_CHUNKS.push(m);
      });
      parent.remove(im); im.dispose();
    });
    smoothCutouts(root);
  }
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
  function place(geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
    _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e);
    geo.applyMatrix4(_m4.compose(_v.set(x, y, z), _q, _s.set(sx, sy, sz)));
    return geo;
  }
  // Farbe pro Ecke; dunkler nach unten (wirkt wie weiche Verschattung im Inneren von Kronen und Büschen)
  function tint(geo, hex, ao = .45, jitter = 0, r = Math.random) {
    const c = new THREE.Color(hex), p = geo.attributes.position, n = geo.attributes.normal, arr = new Float32Array(p.count * 3);
    geo.computeBoundingBox(); const bb = geo.boundingBox, hgt = Math.max(.001, bb.max.y - bb.min.y);
    const j = 1 + (r() - .5) * jitter;
    for (let i = 0; i < p.count; i++) {
      const up = n ? (n.getY(i) * .5 + .5) : 1, hy = (p.getY(i) - bb.min.y) / hgt;
      const k = (1 - ao) + ao * (up * .55 + hy * .45);
      arr[i * 3] = c.r * k * j; arr[i * 3 + 1] = c.g * k * j; arr[i * 3 + 2] = c.b * k * j;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return geo;
  }
  // Kugel mit welliger Oberfläche (Baumkronen, Büsche, Erdklumpen)
  function lumpy(radius, detail, amp, seed) {
    const g = new THREE.IcosahedronGeometry(radius, detail), p = g.attributes.position, r = rng(seed);
    const f1 = 1.5 + r() * 2, f2 = 3 + r() * 3, ph = r() * 6;
    for (let i = 0; i < p.count; i++) {
      _v.fromBufferAttribute(p, i); const l = _v.length();
      const d = 1 + amp * (Math.sin(_v.x * f1 / radius + ph) * Math.cos(_v.z * f1 / radius) * .6 + Math.sin(_v.y * f2 / radius + _v.x * 2) * .4);
      _v.multiplyScalar(d); p.setXYZ(i, _v.x, _v.y, _v.z);
    }
    // weiche Normalen: Richtung von der Mitte (sonst wirkt die Kugel kantig)
    const nArr = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { _v.fromBufferAttribute(p, i).normalize(); nArr[i * 3] = _v.x; nArr[i * 3 + 1] = _v.y; nArr[i * 3 + 2] = _v.z; }
    g.setAttribute('normal', new THREE.BufferAttribute(nArr, 3));
    return g;
  }

  const WORLD = {
    riverZ: x => -27 + 2.5 * Math.sin(x * .028 + .6),
    roadZ: x => 15 + 1.4 * Math.sin(x * .045),
    pond: [-15.5, 6.5, 4.6],
    // Reisfelder [x0, x1, z0, z1, Art] (0 = jung mit Wasser, 1 = grün, 2 = reif)
    paddies: (() => {
      const out = [], r = rng(77);
      const grid = (xs, zs) => { for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) out.push([xs[i] + .35, xs[i + 1] - .35, zs[j] + .35, zs[j + 1] - .35, Math.floor(r() * 3)]); };
      grid([9.5, 18, 27, 36.5, 46, 56, 66], [-.5, 5.5, 11.5]);
      grid([22, 31, 40, 50, 60, 70], [-12, -6, -.5]);
      grid([-7, 4, 14, 25, 36, 47, 58, 70], [19.5, 27, 35, 44, 54]);
      grid([-46, -36, -27], [20.5, 29, 38, 48]);
      // rund ums Haus ist jetzt Stadt; Felder liegen erst weiter draußen
      return out.filter(([x0, x1, z0, z1]) => Math.hypot(Math.max(0, Math.abs((x0 + x1) / 2) - (x1 - x0) / 2), Math.max(0, Math.abs((z0 + z1) / 2) - (z1 - z0) / 2)) > 52);
    })(),
  };

  const BANK_TOP = 13.2;   // Abstand von der Flussmitte, an dem oben die Uferkante liegt
  const RIVER_Y = -2.1;    // Wasserspiegel im Fluss (gut 2 m unter der Uferkante)

  // Hier schaut unten (iPad) die Kamera auf den Rasen; die Startansicht unten steht davor und schaut über die Wiese.
  const GROUND_SPOT = [80.4, 22.9];

  // Char: eine Sandinsel in einem sehr breiten Fluss, dazu ein paar flache Sandbänke und weit weg das andere Ufer.
  function charHeight(x, z) {
    const BED = -3.6, st = t => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
    const n = Math.sin(x * .11 + 1.3) * Math.cos(z * .09 - .4) * .06 + Math.sin(x * .031 - z * .027) * .07;
    const hill = (cx, cz, rx, rz, r0, r1, top) => { const d = Math.hypot((x - cx) / rx, (z - cz) / rz); return BED + (top - BED) * (1 - st((d - r0) / (r1 - r0))); };
    // Hausinsel: flach um das Haus, danach flacher Strand
    const dx = Math.max(0, Math.abs(x) - 8), dz = Math.max(0, Math.abs(z) - 7);
    let y = Math.max(hill(0, 0, 1.35, 1, 11, 19.5, 0) + n * Math.min(1, Math.hypot(dx, dz) / 5), BED);
    // Sandbänke (knapp über dem Normalwasser, bei der Flut ganz überspült)
    [[46, -36, 1.4, 1, 5, 11, .12], [-54, 30, 1.6, 1, 6, 13, .18], [40, 52, 1.2, 1, 4, 9, .08], [-34, -52, 1.5, 1, 5, 10, .1], [82, 6, 1.3, 1, 7, 15, .2]].forEach(([cx, cz, rx, rz, r0, r1, top]) => { y = Math.max(y, hill(cx, cz, rx, rz, r0, r1, top) + n * .5); });
    if (y < -2.8) y += Math.sin(x * .17 + z * .13) * .12;
    // anderes Ufer weit draußen
    const R = Math.hypot(x, z); if (R > 108) y = Math.max(y, BED + st((R - 108) / 26) * 4.5);
    return y;
  }
  function worldHeight(x, z) {
    if (CHAR) return charHeight(x, z);
    const n = Math.sin(x * .11 + 1.3) * Math.cos(z * .09 - .4) * .12 + Math.sin(x * .031 - z * .027) * .16 + Math.sin((x + z) * .19) * .04;
    // Hausplatz flach
    const dx = Math.max(0, Math.abs(x) - 9), dz = Math.max(0, Math.abs(z) - 8);
    const near = Math.min(1, Math.hypot(dx, dz) / 6);
    let y = n * near;
    // Fluss
    const side = z > WORLD.riverZ(x) ? 1 : -1, d = Math.abs(z - WORLD.riverZ(x));
    // Ufer in zwei Stufen wie an Kanälen in Bangladesch: steile Böschung, schmale Berme, zweite Böschung, oben die Häuserzeile.
    // Die Kanten laufen unregelmäßig (nur Richtung Fluss verschoben), dazu Erosionsrinnen und kleine Buckel.
    if (d < BANK_TOP) {
      const s = t => t * t * (3 - 2 * t);
      const jag = (.55 * Math.sin(x * .21 + side * 1.7) + .35 * Math.sin(x * .57 + 2 + side) + .18 * Math.sin(x * 1.43 + side * 3) + 1.08) / 2.16;
      const dd = Math.min(BANK_TOP, d + jag * 1.1 * sstep(BANK_TOP, BANK_TOP - 1.5, d) + jag * .4);
      let bank = dd < 5.5 ? -3.6
        : dd < 9.6 ? -3.6 + s((dd - 5.5) / 4.1) * 2.35
        : dd < 10.9 ? -1.25 + (dd - 9.6) * .08
        : -1.15 + s((dd - 10.9) / (BANK_TOP - 10.9)) * (1.15 + y);
      const slope = (dd > 6.5 && dd < 9.4 ? 1 : 0) + (dd > 11.1 && dd < BANK_TOP - .2 ? .8 : 0);
      if (slope) {
        const gully = Math.pow(Math.max(0, Math.sin(x * .83 + Math.sin(x * .27) * 2.3 + side * 2)), 10);
        bank -= gully * .38 * slope;
        bank += Math.sin(x * 2.1 + z * 1.7) * Math.sin(x * 1.3 - z * 2.4) * .07 * slope;
      }
      y = Math.min(y, bank);
    }
    // Teich
    const [px, pz, pr] = WORLD.pond, pd = Math.hypot(x - px, z - pz);
    if (pd < pr + 1.6) y = Math.min(y, pd < pr ? -1.1 : -1.1 + (pd - pr) / 1.6 * 1.1);
    // Reisfelder liegen etwas tiefer
    for (const [x0, x1, z0, z1] of WORLD.paddies) if (x > x0 - .2 && x < x1 + .2 && z > z0 - .2 && z < z1 + .2) { y = Math.min(y, -.32); break; }
    // weit draußen leicht ansteigend, damit der Horizont weich wird
    const R = Math.hypot(x, z); if (R > 120) y += (R - 120) * .02;
    return y;
  }

  // Pseudozufall pro Ort (0..1), gleich bei jedem Aufbau
  const hash2 = (x, z) => { const v = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return v - Math.floor(v); };
  // Lehmhof (Uthan) ums Haus: unregelmäßiger Umriss. 1 = Hof, 0 = Gras (gleiche Form für Textur und Grasbüschel).
  function yardMask(x, z) {
    const dx = (x + .3) / 7.6, dz = (z - .6) / 5.9, a = Math.atan2(dz, dx);
    const rad = 1 + .1 * Math.sin(3 * a + 1.3) + .06 * Math.sin(7 * a + .4) + .035 * Math.sin(13 * a + 2.1);
    return 1 - sstep(.8, 1.02, Math.hypot(dx, dz) / rad);
  }

  const WTEX = {
    // neutrale Graskörnung; die Farbe kommt aus den Eckfarben des Geländes
    detail: () => KIT && KIT.brush ? makeSet((g, hg, w, h, r) => {
      // Kit-Stil (wie der Boden im Stylized Nature MegaKit): ruhige, gemalte Farbfelder, wenige kräftige Halmstriche.
      // Neutral-hell, die eigentliche Farbe kommt aus den Eckfarben des Geländes.
      const f = brushField(w, h, r, 1), f2 = brushField(w, h, r, 3);
      for (let i = 0; i < f.length; i++) f[i] = f[i] * .65 + f2[i] * .35;
      paintField(g, w, h, f, [[.12, [150, 162, 128]], [.45, [184, 194, 150]], [.72, [210, 214, 166]], [.95, [226, 222, 172]]]);
      addHeightField(hg, w, h, f, 26);
      // Halmbüschel: kurze, kräftige, leicht gebogene Striche in Gruppen (dunkler Fuß, helle Spitze)
      for (let i = 0; i < 520; i++) {
        const cx = r() * w, cy = r() * h, n = 4 + Math.floor(r() * 6), v = r();
        for (let k = 0; k < n; k++) {
          const x = cx + (r() - .5) * 14, y = cy + (r() - .5) * 6, len = 8 + r() * 12, dx = (r() - .5) * 8;
          const gr = g.createLinearGradient(0, y, 0, y - len);
          gr.addColorStop(0, v < .5 ? 'rgba(110,128,84,.7)' : 'rgba(124,140,92,.6)'); gr.addColorStop(1, v < .5 ? 'rgba(220,228,170,.75)' : 'rgba(236,236,182,.7)');
          g.strokeStyle = gr; g.lineWidth = 2 + r() * 1.6; g.lineCap = 'round';
          hg.strokeStyle = grey(150 + r() * 90); hg.lineWidth = g.lineWidth;
          wrapped(g, w, h, x, y, 6, len, (px, py) => { g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + dx * .2, py - len * .6, px + dx, py - len); g.stroke(); hg.beginPath(); hg.moveTo(px, py); hg.lineTo(px + dx, py - len); hg.stroke(); });
        }
      }
      // ein paar Kleeblätter und Steinchen
      for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h; g.fillStyle = 'rgba(120,150,86,.6)'; [0, 2.1, 4.2].forEach(a => { g.beginPath(); g.ellipse(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 3.2, 2.4, a, 0, 7); g.fill(); }); }
      for (let i = 0; i < 18; i++) { const rx = 2.5 + r() * 4, c = 176 + r() * 30; paintedStone(g, hg, r() * w, r() * h, rx, rx * .7, r() * 3, [c, c * .97, c * .9], r); }
    }, { w: 1024, h: 1024, seed: 31, strength: 1.4 }) : makeSet((g, hg, w, h, r) => {
      g.fillStyle = '#a9b19a'; g.fillRect(0, 0, w, h);
      // großflächig unregelmäßig: sattere und trockenere Stellen, kleine Erdflecken (statt runder Flecken)
      const big = noiseField(w, h, r, 3, 3, 5, .55), small = noiseField(w, h, r, 16, 16, 3, .5);
      mixField(g, w, h, big, [150, 170, 120], .55, .55, .8);
      mixField(g, w, h, big, [196, 198, 158], .5, .4, .2);
      mixField(g, w, h, small, [150, 132, 104], .55, .74, .86);
      // dichte, kurze Halme in Lagen: dunkel unten, hell oben
      for (let pass = 0; pass < 3; pass++) {
        const n = [16000, 13000, 8000][pass], vmin = [85, 135, 180][pass], vr = [50, 60, 60][pass];
        for (let i = 0; i < n; i++) {
          const x = r() * w, y = r() * h, len = 6 + r() * 12, dx = (r() - .5) * 7, v = vmin + r() * vr, dryB = r() < .12;
          g.strokeStyle = dryB ? `rgb(${v + 22},${v + 16},${v - 30})` : `rgb(${v - 6},${v + 10},${v - 30})`; g.lineWidth = .9 + r() * .9; g.lineCap = 'round';
          hg.strokeStyle = grey(60 + pass * 60 + r() * 50); hg.lineWidth = g.lineWidth;
          wrapped(g, w, h, x, y, 4, len, (px, py) => { g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + dx * .3, py - len * .6, px + dx, py - len); g.stroke(); hg.beginPath(); hg.moveTo(px, py); hg.lineTo(px + dx, py - len); hg.stroke(); });
        }
      }
      // Kleeblätter und abgefallene Blätter
      for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h; g.fillStyle = r() < .6 ? 'rgba(90,120,60,.55)' : 'rgba(150,120,70,.5)'; wrapped(g, w, h, x, y, 4, 4, (px, py) => { g.beginPath(); g.ellipse(px, py, 2.5 + r() * 2, 1.5 + r(), r() * 3, 0, 7); g.fill(); }); }
      speckle(g, w, h, r, 500, .8, 2, ['rgba(120,100,60,.35)', 'rgba(230,235,190,.35)'], .6);
      addHeightField(hg, w, h, small, 30);
    }, { w: 1024, h: 1024, seed: 31, strength: 1.6 }),

    // Lehmhof (Uthan): festgetretener, warmer Lehm mit Relief (Normalmap). Hellere Staubflächen, dunklere feuchte Stellen,
    // glatt getretene Pfade, Trockenrisse in Schollen, eingetretene Kiesel und Ziegelbrocken, Laub und Halme.
    // Der Rand franst aus, Gras wächst darüber. Nicht kachelnd, ca. 108 px pro Meter. Ergebnis: { map, normal }.
    yard: () => {
      const w = 2048, h = 1664, N = w * h, r = rng(32);
      const mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
      const c = mk(), hc = mk(), g = c.getContext('2d'), hg = hc.getContext('2d');
      const toPx = (x, z) => [(x + .3) / 19 * w + w / 2, (z - .4) / 15.5 * h + h / 2];
      const big = noiseField(w, h, r, 3, 3, 4, .55), mid = noiseField(w, h, r, 9, 7, 3, .5), crk = noiseField(w, h, r, 4, 3, 3, .5), fine = noiseField(w, h, r, 48, 40, 2, .5);
      const bf = brushField(w, h, r, 2.4), bf2 = brushField(w, h, r, 6.5);
      // Trampelpfade als weiche Maske (viele breite, blasse Striche übereinander)
      const pc = mk(), pg = pc.getContext('2d'); pg.fillStyle = '#000'; pg.fillRect(0, 0, w, h);
      const paths = [[[-1.1, 2.2], [-1.4, 5], [-1.6, 7.9]], [[-1.1, 2.2], [-4.5, 0], [-6.8, -2.8]], [[2.5, 2.2], [5.5, 2.8], [7.4, 3]], [[-4.6, -1.2], [-2, -4], [1.5, -4.6]]];
      paths.forEach(pts => {
        const P = pts.map(([x, z]) => toPx(x, z));
        for (let k = 0; k < 9; k++) { pg.strokeStyle = 'rgba(255,255,255,.16)'; pg.lineWidth = 150 - k * 15; pg.lineCap = 'round'; pg.beginPath(); pg.moveTo(...P[0]); pg.quadraticCurveTo(...P[1], ...P[2]); pg.stroke(); }
      });
      const pd = pg.getImageData(0, 0, w, h).data, path = new Float32Array(N);
      for (let i = 0; i < N; i++) path[i] = Math.min(1, pd[i * 4] / 255 * 1.3);
      // Trockenrisse: Kanten von Voronoi-Zellen (Schollen ca. 45 cm), nur in Flecken, nicht auf den Pfaden
      const CS = 66, gx = Math.ceil(w / CS) + 2, gy = Math.ceil(h / CS) + 2, fp = new Float32Array(gx * gy * 2), brk = noiseField(w, h, r, 24, 20, 2, .5);
      for (let i = 0; i < gx * gy; i++) { fp[i * 2] = r(); fp[i * 2 + 1] = r(); }
      const img = g.createImageData(w, h), d = img.data, himg = hg.createImageData(w, h), hd = himg.data;
      const stops = [[.15, [114, 78, 50]], [.4, [140, 100, 66]], [.65, [164, 124, 84]], [.9, [186, 150, 106]]];
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
        const i = py * w + px, pth = path[i];
        let v = bf[i] * .55 + bf2[i] * .2 + big[i] * .25, k = 0;
        while (k < stops.length - 2 && v > stops[k + 1][0]) k++;
        const [a0, ca] = stops[k], [b0, cb] = stops[k + 1], t = sstep(a0, b0, v);
        let R = ca[0] + (cb[0] - ca[0]) * t, G = ca[1] + (cb[1] - ca[1]) * t, B = ca[2] + (cb[2] - ca[2]) * t;
        const mix = (rgb, q) => { R += (rgb[0] - R) * q; G += (rgb[1] - G) * q; B += (rgb[2] - B) * q; };
        mix([180, 154, 114], sstep(.56, .76, mid[i]) * .4 * (1 - pth * .6));   // trockener Staub
        mix([106, 78, 55], sstep(.44, .27, big[i]) * .55);                       // feucht, dunkler
        mix([138, 101, 70], pth * .5);                                           // glatt getreten
        let hgt = 128 + (bf[i] - .5) * 46 * (1 - pth * .7) + (fine[i] - .5) * 30 * (1 - pth * .8) + (bf2[i] - .5) * 16;
        const grain = 1 + (fine[i] - .5) * .2 * (1 - pth * .6);
        // Risse
        const cm = sstep(.5, .64, crk[i]) * (1 - pth) * (1 - sstep(.6, .8, mid[i]) * .5) * sstep(.36, .5, brk[i]);   // Risse brechen ab
        if (cm > .01) {
          const wx = px + (mid[i] - .5) * 90 + (fine[i] - .5) * 10, wy = py + (bf2[i] - .5) * 90, fx = wx / CS, fy = wy / CS, cx = Math.floor(fx), cy = Math.floor(fy); let f1 = 1e9, f2 = 1e9;
          for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
            const X = cx + ox, Y = cy + oy; if (X < 0 || Y < 0 || X >= gx || Y >= gy) continue;
            const j = (Y * gx + X) * 2, dx = (X + fp[j]) * CS - wx, dy = (Y + fp[j + 1]) * CS - wy, dd = dx * dx + dy * dy;
            if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) f2 = dd;
          }
          const e = (Math.sqrt(f2) - Math.sqrt(f1)) * .5 + (fine[i] - .5) * 1.6;   // Abstand zur Zellkante (px)
          const crack = (1 - sstep(.3, 1.8, e)) * cm, lip = sstep(1.5, 2.5, e) * (1 - sstep(2.5, 6, e)) * cm;
          R *= 1 - crack * .55; G *= 1 - crack * .58; B *= 1 - crack * .6;
          R *= 1 + lip * .07; G *= 1 + lip * .07; B *= 1 + lip * .06;
          hgt += lip * 18 - crack * 70;
        }
        d[i * 4] = R * grain; d[i * 4 + 1] = G * grain; d[i * 4 + 2] = B * grain; d[i * 4 + 3] = 255;
        hd[i * 4] = hd[i * 4 + 1] = hd[i * 4 + 2] = hgt; hd[i * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0); hg.putImageData(himg, 0, 0);
      // Besenstriche (gefegter Hof) in Bögen
      for (let i = 0; i < 140; i++) {
        const x = r() * w, y = r() * h, a = r() * Math.PI, len = 70 + r() * 120, n = 6 + Math.floor(r() * 8);
        for (let k = 0; k < n; k++) {
          const ox = Math.cos(a + 1.57) * k * 3, oy = Math.sin(a + 1.57) * k * 3;
          g.strokeStyle = r() < .5 ? 'rgba(92,66,44,.09)' : 'rgba(230,212,178,.1)'; g.lineWidth = 1.3;
          g.beginPath(); g.moveTo(x + ox, y + oy); g.quadraticCurveTo(x + ox + Math.cos(a) * len * .5 + 10, y + oy + Math.sin(a) * len * .5 - 10, x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len); g.stroke();
        }
      }
      // Fußabdrücke (nackte Füße, Sandalen) gehäuft auf den Pfaden
      for (let i = 0; i < 420; i++) {
        const x = r() * w, y = r() * h, pi = Math.floor(y) * w + Math.floor(x); if (path[pi] < .25 && r() < .8) continue;
        g.save(); g.translate(x, y); g.rotate(r() * 6.28); g.fillStyle = 'rgba(88,62,42,.16)';
        g.beginPath(); g.ellipse(0, 0, 11, 4.6, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(14, 1, 4, 3.5, 0, 0, 7); g.fill(); g.restore();
      }
      // eingetretene Kiesel (an den Rändern und neben den Pfaden mehr), dazu Ziegelbrocken
      for (let i = 0; i < 520; i++) {
        const x = r() * w, y = r() * h, pi = Math.floor(y) * w + Math.floor(x);
        if (path[pi] > .5 && r() < .85) continue;
        const rx = 2.5 + Math.pow(r(), 2.4) * 11, c0 = 120 + r() * 70, tint = r();
        paintedStone(g, hg, x, y, rx, rx * (.55 + r() * .35), r() * 3, tint < .6 ? [c0, c0 * .93, c0 * .84] : [c0 * 1.02, c0, c0 * .96], r);
      }
      for (let i = 0; i < 46; i++) {
        const x = r() * w, y = r() * h, bw = 9 + r() * 14, bh = 5 + r() * 6, L = 32 + r() * 12;
        g.save(); g.translate(x, y); g.rotate(r() * 3.14);
        g.fillStyle = 'rgba(40,24,16,.35)'; g.fillRect(-bw / 2 + 1.5, -bh / 2 + 2, bw, bh);
        g.fillStyle = hsl(10 + r() * 10, 42, L); g.beginPath(); g.moveTo(-bw / 2, -bh / 2 + r() * 2); g.lineTo(bw / 2 - r() * 3, -bh / 2); g.lineTo(bw / 2, bh / 2 - r() * 2); g.lineTo(-bw / 2 + r() * 3, bh / 2); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,225,190,.3)'; g.fillRect(-bw / 2 + 1, -bh / 2 + .5, bw - 3, 1.4); g.restore();
        hg.save(); hg.translate(x, y); hg.fillStyle = grey(200); hg.fillRect(-bw / 2, -bh / 2, bw, bh); hg.restore();
      }
      // trockenes Laub (Mango, Jackfrucht) mit Mittelrippe und Schatten, Halme und Zweiglein
      const leafCols = [[176, 134, 62], [150, 104, 52], [122, 116, 58], [190, 160, 92], [118, 80, 46]];
      for (let i = 0; i < 380; i++) {
        const x = r() * w, y = r() * h, L = 7 + r() * 9, W2 = L * (.32 + r() * .14), a = r() * 6.28, cc = leafCols[Math.floor(r() * leafCols.length)], s = .85 + r() * .3;
        g.save(); g.translate(x, y); g.rotate(a);
        const leaf = (ox, oy) => { g.beginPath(); g.moveTo(-L + ox, oy); g.quadraticCurveTo(ox, -W2 * 1.4 + oy, L + ox, oy); g.quadraticCurveTo(ox, W2 * 1.4 + oy, -L + ox, oy); g.fill(); };
        g.fillStyle = 'rgba(50,34,20,.3)'; leaf(1.2, 1.8);
        g.fillStyle = `rgb(${cc[0] * s | 0},${cc[1] * s | 0},${cc[2] * s | 0})`; leaf(0, 0);
        g.strokeStyle = 'rgba(80,56,30,.5)'; g.lineWidth = .8; g.beginPath(); g.moveTo(-L, 0); g.lineTo(L, 0); g.stroke();
        g.restore();
      }
      for (let i = 0; i < 260; i++) {
        const x = r() * w, y = r() * h, len = 8 + r() * 22, a = r() * 6.28;
        g.strokeStyle = r() < .6 ? `rgba(${196 + r() * 30 | 0},${170 + r() * 26 | 0},${110 + r() * 30 | 0},.75)` : 'rgba(96,70,44,.7)'; g.lineWidth = .9 + r() * 1.2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * len * .5 + (r() - .5) * 4, y + Math.sin(a) * len * .5 + (r() - .5) * 4, x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
      }
      // Rand: Maske aus dem Hofumriss, ausgefranst; zum Rand hin grünlich-erdig (Gras wächst hinein)
      const fin = g.getImageData(0, 0, w, h), fd = fin.data, mask = new Float32Array(N);
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
        const x = -.3 + (px / w - .5) * 19, z = .4 + (py / h - .5) * 15.5, i = py * w + px;
        const m = yardMask(x, z) + (fine[i] - .5) * .35 + (mid[i] - .5) * .3 + (big[i] - .5) * .15;
        mask[i] = m;
        const edge = 1 - sstep(.36, .8, m);
        if (edge > 0) { const q = edge * .55; fd[i * 4] += (104 - fd[i * 4]) * q; fd[i * 4 + 1] += (98 - fd[i * 4 + 1]) * q; fd[i * 4 + 2] += (60 - fd[i * 4 + 2]) * q; }
        fd[i * 4 + 3] = 255 * sstep(.3, .5, m);
      }
      g.putImageData(fin, 0, 0);
      // Gras wächst über den Rand und in Büscheln in den Hof hinein
      const bladeCols = ['green', 'straw', 'dead', 'greenTip', 'strawTip', 'deadTip'].map(k => { const n = parseInt(VEG[k].slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; });
      for (let i = 0; i < 9000; i++) {
        const cx = r() * w, cy = r() * h, m = mask[Math.floor(cy) * w + Math.floor(cx)];
        if (m < .26 || m > (r() < .04 ? 1.2 : .62)) continue;
        const n = 3 + Math.floor(r() * 5), cc = bladeCols[Math.floor(r() * bladeCols.length)];
        for (let k = 0; k < n; k++) {
          const x = cx + (r() - .5) * 10, y = cy + (r() - .5) * 5, len = 9 + r() * 16, dx = (r() - .5) * 14, s = .7 + r() * .45;
          const gr = g.createLinearGradient(0, y, 0, y - len);
          gr.addColorStop(0, `rgba(${cc[0] * s * .55 | 0},${cc[1] * s * .55 | 0},${cc[2] * s * .5 | 0},.95)`); gr.addColorStop(1, `rgba(${cc[0] * s | 0},${cc[1] * s | 0},${cc[2] * s | 0},.95)`);
          g.strokeStyle = gr; g.lineWidth = 1.4 + r() * 1.4; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + dx * .25, y - len * .6, x + dx, y - len); g.stroke();
          hg.strokeStyle = grey(170 + r() * 60); hg.lineWidth = g.lineWidth; hg.beginPath(); hg.moveTo(x, y); hg.lineTo(x + dx, y - len); hg.stroke();
        }
      }
      const map = new THREE.CanvasTexture(c); map.anisotropy = 8; map.encoding = THREE.sRGBEncoding;
      const normal = normalFromHeight(hc, 2.4);
      map.wrapS = map.wrapT = normal.wrapS = normal.wrapT = THREE.ClampToEdgeWrapping;
      return { map, normal };
    },

    // Dorfstraße aus flach verlegten Ziegeln (typisch in Bangladesch), abgefahren, mit Lücken und Erdbankett (u quer, v längs)
    road: () => makeTex((g, w, h, r) => {
      g.fillStyle = '#8f7a60'; g.fillRect(0, 0, w, h);
      const field = noiseField(w, h, r, 4, 8, 4, .55), fine = noiseField(w, h, r, 24, 48, 3, .5);
      const x0 = w * .14, x1 = w * .86, bw = (x1 - x0) / 13, bh = h / 34;
      for (let j = 0; j < 34; j++) for (let i = -1; i < 14; i++) {
        const bx = x0 + i * bw + (j % 2 ? bw / 2 : 0), by = j * bh;
        if (bx + bw < x0 - 2 || bx > x1 + 2) continue;
        const ci = Math.min(w * h - 1, Math.floor(by + bh / 2) * w + Math.floor(Math.max(0, Math.min(w - 1, bx + bw / 2))));
        const worn = field[ci], missing = fine[ci] > .74 || (r() < .03);
        const edge = Math.min(bx + bw / 2 - x0, x1 - bx - bw / 2) / bw;
        if (missing || (edge < 1.2 && r() < .45 - edge * .3)) continue;
        const L = 34 + r() * 12 + worn * 10, sat = 30 + r() * 14 - worn * 16;
        g.fillStyle = hsl(10 + r() * 12, sat + 14, L + 4); g.fillRect(bx + 1.3, by + 1.2, bw - 2.6, bh - 2.4);
        g.fillStyle = 'rgba(255,232,200,.4)'; g.fillRect(bx + 1.3, by + 1.2, bw - 2.6, 1.3); g.fillRect(bx + 1.3, by + 1.2, 1.3, bh - 2.4);   // heller Kantenstrich wie im Kit
        g.fillStyle = `rgba(60,40,28,${.15 + r() * .2})`; g.fillRect(bx + 1.3, by + bh - 3, bw - 2.6, 1.8);
        if (r() < .3) { g.fillStyle = 'rgba(200,190,170,.25)'; g.fillRect(bx + 2 + r() * (bw - 8), by + 2, 3 + r() * 5, bh - 5); }
      }
      // Staub und Schlamm in den Fugen, Fahrspuren
      mixField(g, w, h, field, [150, 128, 98], .55, .5, .8);
      [.32, .68].forEach(f => { const gr = g.createLinearGradient(w * (f - .07), 0, w * (f + .07), 0); gr.addColorStop(0, 'rgba(120,100,76,0)'); gr.addColorStop(.5, 'rgba(120,100,76,.28)'); gr.addColorStop(1, 'rgba(120,100,76,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
      speckle(g, w, h, r, 1600, .5, 1.6, ['#6c5a46', '#cdbca0', '#7b746a'], .55);
      // Bankett: Gras wächst über den Rand, Rand ausgefranst
      for (let i = 0; i < 1400; i++) { const side = r() < .5, x = side ? r() * w * .2 : w - r() * w * .2, y = r() * h, len = 5 + r() * 9; g.strokeStyle = hsl(80 + r() * 25, 35, 28 + r() * 18); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 4, y - len); g.stroke(); }
      const img = g.getImageData(0, 0, w, h), d = img.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const u = x / w, e = Math.min(u, 1 - u), i = y * w + x; d[i * 4 + 3] = 255 * sstep(.02, .12, e + (fine[i] - .5) * .1); }
      g.putImageData(img, 0, 0);
    }, { w: 512, h: 1024, seed: 33 }),

    // Trampelpfad aus festgetretener Erde
    dirtPath: () => makeTex((g, w, h, r) => {
      // glatt getretener Lehm wie auf dem Hof (gleiche Farben), Mitte etwas dunkler und glatter, Rand ausgefranst mit Gras
      const big = noiseField(w, h, r, 2, 4, 4, .55), fine = noiseField(w, h, r, 24, 48, 2, .5), bf = noiseField(w, h, r, 6, 12, 4, .5);
      const img = g.createImageData(w, h), d = img.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x, u = x / w, mid = 1 - Math.abs(u - .5) * 2, v = bf[i] * .6 + big[i] * .4;
        const k = sstep(.2, .8, v), gr = 1 + (fine[i] - .5) * .16;
        let R = 128 + k * 44, G = 94 + k * 36, B = 64 + k * 28;
        const c = mid * .35; R += (132 - R) * c; G += (97 - G) * c; B += (68 - B) * c;
        d[i * 4] = R * gr; d[i * 4 + 1] = G * gr; d[i * 4 + 2] = B * gr;
        d[i * 4 + 3] = 255 * sstep(.04, .34, Math.min(u, 1 - u) + (fine[i] - .5) * .2 + (big[i] - .5) * .12);
      }
      g.putImageData(img, 0, 0);
      for (let i = 0; i < 90; i++) { const x = w * (.3 + r() * .4), y = r() * h; g.save(); g.translate(x, y); g.rotate(-1.57 + (r() - .5) * .5); g.fillStyle = 'rgba(80,56,38,.18)'; g.beginPath(); g.ellipse(0, 0, 6, 2.6, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(8, 1, 2.2, 2, 0, 0, 7); g.fill(); g.restore(); }
      for (let i = 0; i < 70; i++) { const rx = 1.5 + Math.pow(r(), 2) * 5, c0 = 130 + r() * 60; paintedStone(g, null, r() * w, r() * h, rx, rx * .7, r() * 3, [c0, c0 * .93, c0 * .84], r); }
      for (let i = 0; i < 700; i++) {
        const side = r() < .5, x = side ? r() * w * .26 : w - r() * w * .26, y = r() * h, len = 5 + r() * 10, s = .7 + r() * .4, dry = r() < .5;
        g.strokeStyle = dry ? `rgb(${133 * s | 0},${120 * s | 0},${70 * s | 0})` : `rgb(${86 * s | 0},${99 * s | 0},${46 * s | 0})`; g.lineWidth = 1 + r() * .8; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (r() - .5) * 3, y - len * .6, x + (r() - .5) * 6, y - len); g.stroke();
      }
    }, { w: 256, h: 512, seed: 39 }),

    // Reisfeld: Wasser/Schlamm mit Reihen von Reispflanzen
    paddy: kind => makeTex((g, w, h, r) => {
      g.fillStyle = kind === 0 ? '#5d6d4c' : '#5a723c'; g.fillRect(0, 0, w, h);
      blotches(g, w, h, r, 30, kind === 0 ? ['rgba(140,160,160,.35)', 'rgba(80,75,50,.45)'] : ['rgba(120,150,70,.6)', 'rgba(60,80,40,.5)'], 30, 90, .4);
      const rows = 12, step = w / 14;
      for (let j = 0; j < rows; j++) for (let x = step / 2; x < w; x += step) {
        const y = (j + .5) * h / rows, n = kind === 0 ? 5 : 9;
        for (let k = 0; k < n; k++) {
          const c = kind === 2 ? hsl(58 + r() * 14, 50, 46 + r() * 14) : hsl(88 + r() * 18, 48, 34 + r() * 16);
          g.strokeStyle = c; g.lineWidth = 1.4;
          const a = (r() - .5) * 1.6, len = (kind === 0 ? 7 : 13) + r() * 6;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(a) * len, y - Math.cos(a) * len * .6); g.stroke();
        }
      }
    }, { w: 512, h: 512, seed: 34 + kind }),

    // Blätter einer Laubkrone (kachelnd)
    leaves: () => makeSet((g, hg, w, h, r) => {
      g.fillStyle = '#3c6a2c'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1500; i++) {
        const x = r() * w, y = r() * h, rl = 6 + r() * 9, rot = r() * Math.PI, L = 28 + r() * 26;
        g.fillStyle = hsl(92 + r() * 22, 38 + r() * 18, L);
        hg.fillStyle = grey(90 + r() * 160);
        wrapped(g, w, h, x, y, rl, rl, (px, py) => {
          g.beginPath(); g.ellipse(px, py, rl, rl * .45, rot, 0, 7); g.fill();
          hg.beginPath(); hg.ellipse(px, py, rl, rl * .45, rot, 0, 7); hg.fill();
        });
      }
    }, { seed: 35, strength: 2.2 }),

    // Palmwedel (Alpha), Basis unten: Mittelrippe, daran viele schmale Fiederblättchen, die schräg zur Spitze zeigen und
    // leicht durchhängen. Gedämpftes Oliv (Trockenzeit), jedes Blättchen mit hellem Mittelstrich; manche Spitzen sind
    // braun vertrocknet, ab und zu fehlt ein Blättchen oder eine ganze Gruppe ist abgerissen.
    frond: () => makeTex((g, w, h, r) => {
      g.clearRect(0, 0, w, h);
      const cx = w / 2;
      let gap = 0;
      for (let t = .03; t < .985; t += .0085) {
        const y = h * (1 - t), env = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08 + .02)), .7) * (1 - t * .25), L = w * .49 * env;
        if (gap > 0) { gap--; continue; }
        if (r() < .012) { gap = 2 + Math.floor(r() * 4); continue; }   // abgerissene Gruppe
        [-1, 1].forEach(sgn => {
          if (r() < .07) return;
          const ang = .62 + (r() - .5) * .16 + t * .2, len = L * (.85 + r() * .2), lw = 4.5 + 3 * (1 - t);
          const tipX = cx + sgn * Math.cos(ang) * len, tipY = y - Math.sin(ang) * len + len * .12, mx = cx + sgn * Math.cos(ang) * len * .5, my = y - Math.sin(ang) * len * .5 - lw * .4;
          const hue = 76 - t * 8 + (r() - .5) * 8, sat = 30 + r() * 12, lt = 36 + t * 8 + (r() - .5) * 7;
          const brownTip = r() < .28, gr = g.createLinearGradient(cx, y, tipX, tipY);
          gr.addColorStop(0, hsl(hue, sat, lt - 4)); gr.addColorStop(.7, hsl(hue - 6, sat + 6, lt + 8));
          gr.addColorStop(1, brownTip ? hsl(36, 38, 42) : hsl(hue - 14, sat + 10, lt + 16));
          if (brownTip) gr.addColorStop(.82, hsl(48, 34, 46));
          g.fillStyle = gr;
          g.beginPath(); g.moveTo(cx, y + lw * .5); g.quadraticCurveTo(mx, my + lw, tipX, tipY); g.quadraticCurveTo(mx, my - lw * .6, cx, y - lw * .5); g.closePath(); g.fill();
          g.strokeStyle = hsl(hue - 10, 30, lt + 22); g.globalAlpha = .45; g.lineWidth = 1;
          g.beginPath(); g.moveTo(cx, y); g.quadraticCurveTo(mx, my + lw * .2, tipX, tipY); g.stroke(); g.globalAlpha = 1;
        });
      }
      const rib = g.createLinearGradient(cx - 6, 0, cx + 6, 0); rib.addColorStop(0, '#6b6a3a'); rib.addColorStop(.5, '#bdb27a'); rib.addColorStop(1, '#6b6a3a');
      g.fillStyle = rib; g.beginPath(); g.moveTo(cx - 6, h); g.lineTo(cx - 1.2, 4); g.lineTo(cx + 1.2, 4); g.lineTo(cx + 6, h); g.fill();
    }, { w: 256, h: 1024, seed: 36 }),

    // Bananenblatt (Alpha), Basis unten: länglich, helle Mittelrippe, feine parallele Adern schräg nach außen, vom Wind
    // eingerissen (Schlitze bis fast zur Rippe), Ränder braun vertrocknet.
    banana: () => makeTex((g, w, h, r) => {
      g.clearRect(0, 0, w, h);
      const cx = w / 2;
      const shape = () => { g.beginPath(); g.moveTo(cx, h); g.bezierCurveTo(cx - w * .62, h * .86, cx - w * .56, h * .1, cx, 6); g.bezierCurveTo(cx + w * .56, h * .1, cx + w * .62, h * .86, cx, h); g.closePath(); };
      shape();
      const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#5f6a36'); gr.addColorStop(.42, '#7f8c4a'); gr.addColorStop(.5, '#8e9a58'); gr.addColorStop(.58, '#7f8c4a'); gr.addColorStop(1, '#5f6a36');
      g.fillStyle = gr; g.fill();
      g.save(); shape(); g.clip();
      for (let y = h; y > 0; y -= 4) { g.strokeStyle = `rgba(40,50,20,${.12 + r() * .08})`; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, y); g.lineTo(0, y - 46); g.moveTo(cx, y); g.lineTo(w, y - 46); g.stroke(); }
      blotches(g, w, h, r, 14, ['rgba(140,120,60,.25)', 'rgba(70,80,30,.2)'], 6, 20, 1);
      g.lineWidth = 9; g.strokeStyle = 'rgba(128,96,54,.85)'; shape(); g.stroke();       // braun vertrockneter Rand
      g.restore();
      g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 16; i++) { const y = h * (.12 + r() * .78), sgn = r() < .5 ? -1 : 1, depth = .5 + r() * .45; g.lineWidth = 1.5 + r() * 2; g.beginPath(); g.moveTo(cx + sgn * w * .52, y - 48 * depth); g.lineTo(cx + sgn * w * .5 * (1 - depth) + sgn * 4, y - 46 * (1 - depth) * .2); g.stroke(); }
      g.globalCompositeOperation = 'source-over';
      g.strokeStyle = '#c4c08a'; g.lineWidth = 5; g.beginPath(); g.moveTo(cx, h); g.lineTo(cx, 8); g.stroke();
      g.strokeStyle = 'rgba(80,80,40,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx + 3, h); g.lineTo(cx + 1, 8); g.stroke();
    }, { w: 128, h: 512, seed: 37 }),

    // Palmstamm: Ringe
    // Palmstamm im Kit-Stil: gemalte Ringe mit dunkler Fuge und hellem Kantenstrich, warmes Graubraun
    trunk: () => makeSet((g, hg, w, h, r) => {
      paintField(g, w, h, brushField(w, h, r, 1), [[.2, [118, 100, 80]], [.6, [140, 120, 96]], [.9, [160, 140, 112]]]);
      const n = 8;
      for (let i = 0; i < n; i++) {
        const y = i * h / n, bh = h / n, off = (r() - .5) * 6;
        const gr = g.createLinearGradient(0, y, 0, y + bh); gr.addColorStop(0, 'rgba(255,240,215,.22)'); gr.addColorStop(.6, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(60,44,30,.35)');
        g.fillStyle = gr; g.fillRect(0, y, w, bh);
        g.strokeStyle = 'rgba(58,42,28,.75)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(0, y + bh - 1 + off * .2); for (let x = 0; x <= w; x += 8) g.lineTo(x, y + bh - 1 + Math.sin(x * .2 + i) * 1.5 + off * .2); g.stroke();
        g.strokeStyle = 'rgba(232,214,182,.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, y + 2); g.lineTo(w, y + 2); g.stroke();
        const hr = hg.createLinearGradient(0, y, 0, y + bh); hr.addColorStop(0, grey(220)); hr.addColorStop(.75, grey(150)); hr.addColorStop(1, grey(30));
        hg.fillStyle = hr; hg.fillRect(0, y, w, bh);
      }
    }, { w: 64, h: 256, seed: 38, strength: 2.2 }),

    bark: () => makeSet((g, hg, w, h, r) => {
      g.fillStyle = '#6e5a46'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        const x = r() * w, c = r() < .5 ? 'rgba(50,38,28,.45)' : 'rgba(150,130,108,.3)';
        g.strokeStyle = c; g.lineWidth = 1 + r() * 3; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - .5) * 10, h * .3, x + (r() - .5) * 10, h * .7, x, h); g.stroke();
        hg.strokeStyle = grey(r() < .5 ? 50 : 200); hg.lineWidth = g.lineWidth; hg.beginPath(); hg.moveTo(x, 0); hg.lineTo(x, h); hg.stroke();
      }
    }, { w: 128, h: 256, seed: 39, strength: 2 }),

    // Wellen (Normal-Map, kachelnd): Rauschen statt weniger Sinuswellen, in Fließrichtung leicht gestreckt
    waterN: () => {
      const S = 512, r = rng(40), f = noiseField(S, S, r, 5, 8, 5, .58), c = document.createElement('canvas'); c.width = c.height = S;
      const g = c.getContext('2d'), img = g.createImageData(S, S);
      for (let i = 0; i < S * S; i++) { const v = f[i] * 255; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
      g.putImageData(img, 0, 0);
      return normalFromHeight(c, 26);
    },

    // Uferböschung: lehmige Erde in mehreren Tönen, Erosionsrinnen (v = hangabwärts), Trockenrisse, Wurzeln, eingebettete
    // Steine, Grasbüschel und ein paar Plastikreste. Alpha-Kanal: Rauschen für den ausgefransten Rand oben.
    bank: () => makeSet((g, hg, w, h, r) => {
      // Uferböschung im Kit-Stil: ruhige, gemalte Erdfelder (hell, damit die Eckfarben den Ton bestimmen), sanfte Lagen
      // entlang des Flusses, wenige weiche Rinnen hangabwärts, gemalte Steine mit hellem Kantenstrich, Wurzeln, Grasbüschel.
      // u = entlang des Flusses, v = quer (hangauf/-ab). Alpha: Rauschen für den ausgefransten oberen Rand.
      const f = brushField(w, h, r, 1), f2 = brushField(w, h, r, 3), mid = noiseField(w, h, r, 10, 6, 4, .55), fine = noiseField(w, h, r, 40, 40, 2, .5);
      for (let i = 0; i < f.length; i++) f[i] = f[i] * .6 + f2[i] * .4;
      paintField(g, w, h, f, [[.12, [176, 156, 128]], [.42, [198, 178, 148]], [.72, [216, 198, 168]], [.95, [232, 216, 188]]]);
      mixField(g, w, h, mid, [168, 150, 124], .35, .6, .82);
      addHeightField(hg, w, h, f, 40); addHeightField(hg, w, h, fine, 14);
      // Lagen (parallel zum Fluss): dunkle Fuge, heller Kantenstrich darüber
      for (let k = 0; k < 9; k++) {
        const y0 = (k + .3 + r() * .4) / 9 * h, a = 3 + r() * 5, ph = r() * 6, fy = x => y0 + Math.sin(x / w * Math.PI * 2 * (2 + k % 3) + ph) * a;
        g.lineCap = 'round';
        g.strokeStyle = 'rgba(110,88,62,.3)'; g.lineWidth = 3 + r() * 5; g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, fy(x)); g.stroke();
        g.strokeStyle = 'rgba(246,234,210,.28)'; g.lineWidth = 1.6; g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, fy(x) - 5); g.stroke();
        hg.strokeStyle = grey(60); hg.lineWidth = 5; hg.beginPath(); for (let x = 0; x <= w; x += 8) hg.lineTo(x, fy(x)); hg.stroke();
      }
      // weiche Rinnen hangabwärts
      for (let i = 0; i < 26; i++) {
        let x = r() * w; const wid = 3 + r() * 6, y0 = r() * h, len = 80 + r() * 260;
        g.beginPath(); hg.beginPath(); g.moveTo(x, y0); hg.moveTo(x, y0);
        for (let y = y0; y < y0 + len; y += 10) { x += (r() - .5) * 5; g.lineTo(x, y); hg.lineTo(x, y); }
        g.strokeStyle = 'rgba(246,232,206,.16)'; g.lineWidth = wid + 4; g.stroke();
        g.strokeStyle = 'rgba(104,84,60,.2)'; g.lineWidth = wid; g.stroke();
        hg.strokeStyle = grey(70); hg.lineWidth = wid; hg.stroke();
      }
      // Wurzeln
      for (let i = 0; i < 16; i++) { let x = r() * w, y = r() * h; g.strokeStyle = 'rgba(84,60,38,.6)'; g.lineWidth = 1.5 + r() * 2; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - .5) * 46; y += r() * 26; g.lineTo(x, y); } g.stroke(); }
      // gemalte Steine (Kit-Stil), dazu Kiesel
      for (let i = 0; i < 150; i++) {
        const rx = 3 + Math.pow(r(), 2.4) * 24, c = 150 + r() * 60, warm = r() < .5;
        paintedStone(g, hg, r() * w, r() * h, rx, rx * (.5 + r() * .35), r() * 3, warm ? [c, c * .93, c * .84] : [c * .95, c * .96, c * .94], r);
      }
      for (let i = 0; i < 700; i++) { const c = 130 + r() * 90; g.fillStyle = `rgba(${c},${c * .95},${c * .88},.7)`; g.beginPath(); g.arc(r() * w, r() * h, .8 + r() * 1.8, 0, 7); g.fill(); }
      // Grasbüschel in Gruppen (dunkler Fuß, helle Spitze)
      for (let i = 0; i < 320; i++) {
        const cx = r() * w, cy = r() * h; if (mid[Math.floor(cy) * w + Math.floor(cx)] < .5) continue;
        const n = 4 + Math.floor(r() * 6);
        for (let k = 0; k < n; k++) {
          const x = cx + (r() - .5) * 14, y = cy + (r() - .5) * 5, len = 7 + r() * 12, dx = (r() - .5) * 8;
          const gr = g.createLinearGradient(0, y, 0, y - len); gr.addColorStop(0, 'rgba(72,96,44,.8)'); gr.addColorStop(1, 'rgba(176,196,104,.85)');
          g.strokeStyle = gr; g.lineWidth = 1.6 + r() * 1.2; g.lineCap = 'round';
          wrapped(g, w, h, x, y, 6, len, (px, py) => { g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + dx * .2, py - len * .6, px + dx, py - len); g.stroke(); });
        }
      }
      // ein paar Plastikreste
      for (let i = 0; i < 12; i++) { g.fillStyle = ['#d8d8d0', '#3a6fb5', '#c84a3a', '#e0c040'][Math.floor(r() * 4)]; g.globalAlpha = .65; g.save(); g.translate(r() * w, r() * h); g.rotate(r() * 6); g.fillRect(-3, -1.5, 5 + r() * 6, 2 + r() * 3); g.restore(); }
      g.globalAlpha = 1;
      const img = g.getImageData(0, 0, w, h), d = img.data;
      for (let i = 0; i < w * h; i++) d[i * 4 + 3] = 140 + (mid[i] * .7 + fine[i] * .3) * 115;
      g.putImageData(img, 0, 0);
    }, { w: 1024, h: 1024, seed: 61, strength: 2.0 }),

    // Baumreihe am Horizont (Alpha): Kronen, Palmen und ein paar Hausdächer, unten dunstig
    treeline: () => makeTex((g, w, h, r) => {
      g.clearRect(0, 0, w, h);
      const layer = (base, light, top, n, palms) => {
        for (let i = 0; i < n; i++) {
          const x = r() * w, rad = 10 + r() * 22, y = h - top - r() * 20;
          wrapped(g, w, h, x, y, rad, rad, (px) => {
            g.fillStyle = hsl(base[0] + (r() - .5) * 10, base[1], base[2] + (r() - .5) * 6);
            g.beginPath(); g.arc(px, y, rad, 0, 7); g.arc(px - rad * .7, y + rad * .4, rad * .7, 0, 7); g.arc(px + rad * .7, y + rad * .35, rad * .75, 0, 7); g.fill();
            g.fillStyle = hsl(light[0], light[1], light[2]); g.globalAlpha = .35; g.beginPath(); g.arc(px - rad * .25, y - rad * .3, rad * .55, 0, 7); g.fill(); g.globalAlpha = 1;
            g.fillStyle = hsl(base[0], base[1], base[2] - 4); g.fillRect(px - rad * 1.4, y + rad * .3, rad * 2.8, h);
          });
        }
        for (let i = 0; i < palms; i++) {
          const x = r() * w, ph = top + 30 + r() * 40, y = h - ph;
          g.strokeStyle = hsl(base[0], base[1] - 5, base[2] - 2); g.lineWidth = 2;
          g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + 4, y + ph * .5, x + 2, y); g.stroke();
          for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x + 2, y); g.quadraticCurveTo(x + 2 + Math.cos(a) * 9, y - 6, x + 2 + Math.cos(a) * 16, y + 4 + Math.abs(Math.sin(a)) * 6); g.stroke(); }
        }
      };
      layer([140, 12, 70], [120, 15, 80], 70, 260, 30);    // ganz hinten, blass
      // ein paar Dächer zwischen den Bäumen
      for (let i = 0; i < 40; i++) { const x = r() * w, bw = 12 + r() * 20, bh = 8 + r() * 10; g.fillStyle = r() < .5 ? '#c9ccc8' : '#d9cfc0'; g.fillRect(x, h - 40 - bh, bw, bh + 40); }
      layer([118, 16, 56], [100, 22, 70], 40, 300, 40);    // davor, etwas kräftiger
      const fog = g.createLinearGradient(0, h * .45, 0, h); fog.addColorStop(0, 'rgba(214,226,224,0)'); fog.addColorStop(1, 'rgba(214,226,224,.75)');
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = fog; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over';
    }, { w: 2048, h: 256, seed: 62 }),
  };

  // Gebogenes Blatt als Band: Mittelrippe entlang einer Kurve, quer drei Ecken (Rand, Rippe, Rand). Die Ränder hängen
  // etwas tiefer (gefaltet wie echte Palm- und Bananenblätter), zur Spitze verdreht sich das Blatt leicht.
  // P(t) -> [x, y, z] Mittellinie, side: Querrichtung (horizontal), wAt(t) Breite, fold: wie tief die Ränder hängen,
  // roll: Verdrehung an der Spitze, col(t) -> Farbe (Vertex-Farbe, wird mit der Textur multipliziert).
  function leafBand(P, side, wAt, fold, roll, col, segs = 12) {
    const pos = [], uv = [], cl = [], idx = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, c = P(t), w = wAt(t), ro = roll * t * t, cs = Math.cos(ro), sn = Math.sin(ro), cc = col(t);
      [-1, 0, 1].forEach(k => {
        const ex = side[0] * k * w * cs, ez = side[1] * k * w * cs, ey = k * w * sn - Math.abs(k) * w * fold;
        pos.push(c[0] + ex, c[1] + ey, c[2] + ez); uv.push((k + 1) / 2, t);
        const sh = k === 0 ? 1.06 : .9; cl.push(cc.r * sh, cc.g * sh, cc.b * sh);
      });
      if (i) for (let k = 0; k < 2; k++) { const a0 = (i - 1) * 3 + k, b0 = i * 3 + k; idx.push(a0, a0 + 1, b0, a0 + 1, b0 + 1, b0); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3)); g.setIndex(idx); g.computeVertexNormals();
    // Normalen eher nach oben: Wedel sind im trüben Licht sonst von unten schwarz
    const N = g.attributes.normal; for (let i = 0; i < N.count; i++) { _v.set(N.getX(i), Math.abs(N.getY(i)) + .6, N.getZ(i)).normalize(); N.setXYZ(i, _v.x, _v.y, _v.z); }
    return g.toNonIndexed();
  }

  // Kokospalme: schlanker, leicht S-förmig gebogener Stamm mit verdicktem Fuß, oben die Blattscheiden und eine Traube
  // Kokosnüsse. Krone in Etagen: junge Wedel steil nach oben, mittlere weit ausladend, alte hängen gelblich durch, ein
  // bis zwei tote, braune Wedel hängen am Stamm herunter (Trockenzeit). Gibt [Stamm, Wedel] zurück.
  function palmGeos(hgt, lean, fronds, seed) {
    const r = rng(seed), wob = r() * 6, side2 = (r() - .5) * .5;
    const axis = k => [lean * k * k + Math.sin(k * 2.6 + wob) * .12 * k, hgt * k, side2 * k * k];
    const trunk = new THREE.CylinderGeometry(.11, .15, hgt, 10, 20, true);
    const p = trunk.attributes.position, uv = trunk.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) + hgt / 2, k = y / hgt, flare = 1 + 1.1 * Math.pow(1 - k, 9) + .08 * Math.sin(k * 30);
      const ax = axis(k);
      p.setXYZ(i, p.getX(i) * flare + ax[0], y, p.getZ(i) * flare + ax[2]);
      uv.setY(i, uv.getY(i) * hgt / 1.0);
    }
    trunk.computeVertexNormals();
    const top = axis(1), parts = [trunk];
    // Blattscheiden (dunkler Kragen) und Kokosnüsse
    parts.push(place(new THREE.CylinderGeometry(.24, .13, .55, 10, 1), top[0], top[1] - .15, top[2]));
    for (let i = 0; i < 8; i++) {
      const a = i * 2.4 + r(), d = .2 + r() * .08;
      parts.push(place(new THREE.SphereGeometry(.12, 9, 7), top[0] + Math.cos(a) * d, top[1] - .32 - r() * .18, top[2] + Math.sin(a) * d, 0, 0, 0, 1, 1.15, 1));
    }
    const leaves = [], green = new THREE.Color('#c4c890'), old = new THREE.Color('#d2c280'), dead = new THREE.Color('#a8845a');
    const tiers = [];
    for (let f = 0; f < fronds; f++) tiers.push(f < 3 ? 'young' : f < fronds - 6 ? 'mid' : f < fronds - 2 ? 'old' : 'dead');
    tiers.forEach((tier, f) => {
      const a = f * 2.399 + r() * .4;                                     // goldener Winkel: gleichmäßig rundum
      const T = { young: [2.2, 1.35, .5, .75], mid: [3.4, .55, .8, 1], old: [3.2, .1, .95, .85], dead: [2.4, -1.3, .05, .7] }[tier];
      const len = T[0] * (.9 + r() * .2), rise = T[1] + (r() - .5) * .2, droop = T[2], bright = T[3];
      const dx = Math.cos(a), dz = Math.sin(a), side = [-dz, dx];
      const P = t => { const hz = len * t * (tier === 'dead' ? .35 : .9); return [top[0] + dx * hz, top[1] + len * (rise * t - droop * t * t) * .9, top[2] + dz * hz]; };
      const base = tier === 'dead' ? dead : tier === 'old' ? old : green;
      const col = t => base.clone().multiplyScalar(bright * (.7 + .4 * Math.min(1, t * 4)));   // innen im Kronenschatten
      const wAt = t => .62 * (tier === 'dead' ? .55 : 1) * (1 - t * .35) * Math.min(1, .25 + t * 5);
      leaves.push(leafBand(P, side, wAt, tier === 'dead' ? .9 : .42, (r() - .5) * 1.2, col, 14));
    });
    return [mergeGeos(parts), mergeGeos(leaves)];
  }

  // Laubbaum (Mango): Stamm mit Ästen + wolkige Krone aus mehreren Blättermassen
  function broadleafGeos(seed, size = 1) {
    const r = rng(seed), wood = [];
    const th = 2.2 * size;
    wood.push(place(new THREE.CylinderGeometry(.16 * size, .27 * size, th + .4 * size, 9), 0, (th + .4 * size) / 2, 0));
    for (let i = 0; i < 4; i++) {
      const a = i * 1.6 + r(), len = 1.6 * size;
      wood.push(place(new THREE.CylinderGeometry(.05 * size, .12 * size, len, 7), Math.cos(a) * .4 * size, th + .45 * size, Math.sin(a) * .4 * size, 0, -a, .75));
    }
    const blobs = [];
    const n = 6 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = (i === 0 ? 0 : .9 + r() * .9) * size, rad = (1.15 + r() * .6) * size;
      blobs.push([Math.cos(a) * d, th + 1.3 * size + r() * 1.1 * size + (i === 0 ? .6 * size : 0), Math.sin(a) * d, rad]);
    }
    const [cards, core] = cardCrown(blobs, 22, 1.25 * size, seed);
    return [tint(mergeGeos(wood), 0xffffff, .25), cards, core];
  }

  // Busch aus Blattkarten
  function bushGeos(seed) {
    const r = rng(seed), blobs = [[0, .6, 0, .62]];
    for (let i = 0; i < 5; i++) { const a = i * 1.26 + r() * .5, d = .45 + r() * .2; blobs.push([Math.cos(a) * d, .38 + r() * .25, Math.sin(a) * d, .38 + r() * .14]); }
    blobs.push([(r() - .5) * .3, .95, (r() - .5) * .3, .4]);
    return cardCrown(blobs, 40, .5, seed);
  }

  // Bananenstaude: eine Mutterpflanze und zwei, drei Schösslinge. Große, gefaltete Blätter, die erst steil steigen und
  // dann überhängen; unten hängen vertrocknete, braune Blätter am Scheinstamm (so sehen sie im Winter überall aus).
  function bananaGeos(seed) {
    const r = rng(seed), stems = [], leaves = [];
    const green = new THREE.Color('#c2c88e'), dry = new THREE.Color('#b08c5e');
    const plants = [[0, 0, 2.5], [(r() - .5) * .9, (r() - .5) * .9, 1.6], [(r() - .5) * 1.1, (r() - .5) * 1.1, 1.0]];
    if (r() < .6) plants.push([(r() - .5) * 1.2, (r() - .5) * 1.2, .7]);
    plants.forEach(([sx, sz, h], pi) => {
      const st = new THREE.CylinderGeometry(.06 + h * .025, .1 + h * .04, h, 10, 4), sp = st.attributes.position;
      for (let i = 0; i < sp.count; i++) sp.setX(i, sp.getX(i) + Math.pow((sp.getY(i) + h / 2) / h, 2) * .06);
      stems.push(tint(place(st, sx, h / 2, sz), pi ? 0x8c9a5a : 0x7d8350, .35));
      const n = pi === 0 ? 7 : 4 + Math.floor(r() * 2), size = .55 + h * .2;
      for (let l = 0; l < n; l++) {
        const a = l * 2.2 + r() * .5 + pi, young = l >= n - 2, len = (1.4 + r() * .5) * size * (young ? .85 : 1);
        const rise = young ? 1.7 : 1.0 + r() * .35, droop = young ? .7 : 1.15 + r() * .35;
        const dx = Math.cos(a), dz = Math.sin(a), side = [-dz, dx], tx = sx + .04, ty = h - .1;
        const P = t => [tx + dx * len * t * (young ? .45 : .8), ty + len * (rise * t - droop * t * t) * .8, sz + dz * len * t * (young ? .45 : .8)];
        const tone = green.clone().multiplyScalar(.82 + r() * .25);
        leaves.push(leafBand(P, side, t => .3 * size * (young ? .7 : 1), young ? -.25 : .18, (r() - .5) * .9, t => tone.clone().multiplyScalar(.75 + .25 * Math.min(1, t * 3)), 10));
      }
      // vertrocknete Blätter hängen am Stamm herab
      const nd = pi === 0 ? 3 : 1;
      for (let l = 0; l < nd; l++) {
        const a = r() * 6.28, dx = Math.cos(a), dz = Math.sin(a), len = (.9 + r() * .5) * (.6 + h * .25), ty = h * (.75 + r() * .15);
        const P = t => [sx + dx * (.12 + .25 * Math.sin(t * 1.6)), ty + .15 * t - len * t * t, sz + dz * (.12 + .25 * Math.sin(t * 1.6))];
        const tone = dry.clone().multiplyScalar(.85 + r() * .3);
        leaves.push(leafBand(P, [-dz, dx], t => .12 * (1 - t * .4), .6, (r() - .5) * 2, () => tone, 6));
      }
    });
    return [mergeGeos(stems), mergeGeos(leaves)];
  }

  // Bambusgruppe: hohe dünne Halme, oben feine Blätter
  function bambooGeos(seed) {
    const r = rng(seed), culms = [], tops = [];
    for (let i = 0; i < 14; i++) {
      const a = r() * 6.28, d = r() * .8, h = 5 + r() * 3, lx = Math.cos(a) * (1 + r()) * .35, lz = Math.sin(a) * (1 + r()) * .35;
      const c = new THREE.CylinderGeometry(.035, .05, h, 6, 1); const uv = c.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setY(k, uv.getY(k) * h / 1.1);
      culms.push(place(c, Math.cos(a) * d + lx * h / 2, h / 2, Math.sin(a) * d + lz * h / 2, lz * .9, 0, -lx * .9));
      tops.push(place(lumpy(.7 + r() * .4, 1, .25, seed + i), Math.cos(a) * d + lx * h, h - .4, Math.sin(a) * d + lz * h, 0, 0, 0, 1, .6, 1));
    }
    return [mergeGeos(culms), tint(mergeGeos(tops), 0xffffff, .5)];
  }

  // Kuh (weiche Formen, Eckfarben)
  function cowGeo(color) {
    const parts = [];
    const body = new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(.36, .9, 6, 12) : new THREE.SphereGeometry(.5, 12, 10);
    parts.push(tint(place(body, 0, .95, 0, 0, 0, Math.PI / 2), color, .3));
    parts.push(tint(place(new THREE.SphereGeometry(.27, 12, 10), .95, 1.15, 0, 0, 0, 0, 1.15, .9, .85), color, .3));
    parts.push(tint(place(new THREE.SphereGeometry(.14, 10, 8), 1.2, 1.05, 0, 0, 0, 0, 1, .8, 1), 0x8a7462, .2));
    parts.push(tint(place(new THREE.SphereGeometry(.2, 10, 8), .25, 1.3, 0, 0, 0, 0, 1.4, .8, 1), color, .3)); // Buckel
    [[.5, .22], [.5, -.22], [-.5, .22], [-.5, -.22]].forEach(([x, z]) => parts.push(tint(place(new THREE.CylinderGeometry(.06, .05, .72, 7), x, .36, z), color, .4)));
    [[.22], [-.22]].forEach(([z]) => parts.push(tint(place(new THREE.ConeGeometry(.035, .22, 6), .92, 1.42, z, 0, 0, z > 0 ? .5 : -.5), 0xe8e0cc, 0)));
    parts.push(tint(place(new THREE.CylinderGeometry(.02, .015, .7, 5), -.78, .8, 0, 0, 0, .25), color, .3));
    return mergeGeos(parts);
  }

  // Boot (Nouka): offener Holzrumpf mit U-Querschnitt, die Enden steigen hoch auf; bunt gestrichene Bordwand,
  // Ruderbänke, Bodenbretter, geflochtenes Mattendach (Chhoi), Stakstange und Steuerruder. Achse entlang x.
  function makeBoat(M_, len, wid, roof, paint, seed = 1) {
    const r = rng(seed), grp = new THREE.Group();
    const hwAt = u => wid / 2 * Math.pow(Math.max(0, 1 - u * u), .5) + .015;
    const depAt = u => .44 * (1 - Math.pow(Math.abs(u), 2.6)) + .05;
    const shAt = u => .14 + .8 * Math.pow(Math.abs(u), 4.5);
    const NU = 32, NV = 12, pos = [], uv = [], col = [], idx = [];
    for (let i = 0; i <= NU; i++) {
      const u = i / NU * 2 - 1, hw = hwAt(u), dep = depAt(u), sh = shAt(u);
      for (let j = 0; j <= NV; j++) {
        const th = j / NV * Math.PI, y = sh - Math.sin(th) * dep;
        pos.push(u * len / 2, y, -Math.cos(th) * hw); uv.push(u * len / 2, j / NV * 1.6);
        const tar = sstep(.05, -.12, y) * .55, k = 1 - tar; col.push(k, k * .97, k * .94);   // unten geteert
      }
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const hg = new THREE.BufferGeometry();
    hg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); hg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); hg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    hg.setIndex(idx); hg.computeVertexNormals();
    const hullMat = M_.woodDark().clone(); hullMat.side = THREE.DoubleSide; hullMat.vertexColors = true;
    grp.add(mesh(hg, hullMat));
    // bemalte Bordwand und Bug-/Heckspitzen
    const paintMat = new THREE.MeshStandardMaterial({ color: paint, roughness: .55, envMapIntensity: .7 });
    [-1, 1].forEach(s => {
      const pts = []; for (let u = -1; u <= 1.001; u += .08) pts.push(new THREE.Vector3(u * len / 2, shAt(u) + .015, s * hwAt(u)));
      grp.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .035, 5), paintMat));
      const pts2 = []; for (let u = -.9; u <= .901; u += .1) pts2.push(new THREE.Vector3(u * len / 2, shAt(u) - .09, s * (hwAt(u) + .005)));
      grp.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts2), 30, .018, 4), M_.string()));
      grp.add(mesh(new THREE.ConeGeometry(.05, .3, 6), paintMat, s * len / 2 * .99, shAt(1) + .12, 0));
    });
    // Ruderbänke und Bodenbretter
    [-.55, -.15, .32].forEach(u => grp.add(mesh(boxGeo(.18, .04, hwAt(u) * 2), M_.wood(), u * len / 2, shAt(u) - .08, 0)));
    grp.add(mesh(boxGeo(len * .56, .025, wid * .5), M_.wood(), 0, shAt(0) - depAt(0) + .12, 0));
    if (roof) {
      // Mattendach auf Bambusbögen
      const rr = hwAt(0) * .98, cl = len * .36, cx = -len * .04;
      const cg = new THREE.CylinderGeometry(rr, rr, cl, 18, 1, true, 0, Math.PI); cg.rotateZ(Math.PI / 2); { const cu = cg.attributes.uv; for (let i = 0; i < cu.count; i++) cu.setXY(i, cu.getX(i) * 3, cu.getY(i) * cl * 2.5); }
      grp.add(mesh(cg, M_.weave(), cx, shAt(0) + .02, 0));
      [-.5, -.17, .17, .5].forEach(k => { const hoop = mesh(new THREE.TorusGeometry(rr + .015, .018, 5, 14, Math.PI), M_.bamboo(), cx + k * cl, shAt(0) + .02, 0); hoop.rotation.y = Math.PI / 2; grp.add(hoop); });
    } else {
      // Ladung: zwei Jutesäcke und ein Netzhaufen
      [[-.1, .08], [.12, -.06]].forEach(([u, z], k) => { const sk = mesh(lumpy(.22, 1, .15, seed + k), M_.sack(), u * len / 2, shAt(0) - depAt(0) + .32, z * wid); sk.scale.set(1.3, .7, .9); grp.add(sk); });
      const net = mesh(lumpy(.3, 1, .3, seed + 7), new THREE.MeshStandardMaterial({ color: 0x5b5a4a, roughness: 1 }), -len * .3, shAt(-.6) - depAt(-.6) + .3, 0); net.scale.set(1.2, .5, .9); grp.add(net);
    }
    // Stakstange quer im Boot und Steuerruder am Heck
    grp.add(beam([-len * .42, shAt(-.84) + .03, -.12], [len * .5, shAt(.95) + .12, .14], .022, M_.bamboo()));
    grp.add(beam([len * .4, shAt(.8) + .06, .05], [len * .62, -.3, .2], .028, M_.woodDark()));
    const blade = mesh(boxGeo(.04, .45, .22), M_.woodDark(), len * .64, -.42, .21); blade.rotation.z = .55; grp.add(blade);
    void r;
    return grp;
  }

  function ribbon(points, width, yOff, vScale) {
    const pos = [], uv = [], idx = [];
    let along = 0;
    points.forEach((p, i) => {
      const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
      const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      if (i) along += Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]);
      [-1, 1].forEach(s => { const x = p[0] + nx * width / 2 * s, z = p[1] + nz * width / 2 * s; pos.push(x, worldHeight(x, z) + yOff, z); uv.push(s < 0 ? 0 : 1, along / vScale); });
      if (i) { const n = i * 2; idx.push(n - 2, n - 1, n, n - 1, n + 1, n); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }

  /* ---------- Wind und Blattwerk ---------- */
  // Ein einziges Windfeld für die ganze Landschaft: Böen ziehen als Wellen in Windrichtung (+x) über das Land.
  // Pflanzen (im Shader) und fliegende Blätter / Nebel (in JS) lesen dieselbe Funktion, darum bewegt sich alles gemeinsam:
  // kommt eine Böe, neigen sich erst die Palmen links, dann die Bäume weiter rechts, und die Blätter werden schneller.
  const WIND = { value: 0 };     // Phase für Wasser-Normalen (t * 1.35)
  const WIND_T = { value: 0 };   // echte Zeit in s, für das Böenfeld
  const WIND_V = 9;              // Zuggeschwindigkeit einer Böe in m/s
  // Kurz vor dem Sturm: kräftiger, kalter Grundwind, alle 20–40 s eine Böe, die als Welle übers Land zieht.
  // Spanne etwa 0.75 … 1.75 (nie windstill – man soll merken, dass gleich etwas passiert).
  const windGust = s => { const g1 = .5 + .5 * Math.sin(s * .11), g2 = Math.max(0, Math.sin(s * .21 + .8) * Math.sin(s * .067)); return .75 + .25 * g1 + .75 * g2 * g2 + .06 * Math.sin(s * .9); };
    // STORM.value (0..1) kommt aus der Flut-Simulation (flut.js): im Sturm bläst alles fast doppelt so stark
  const STORM = { value: 0 };
  const windAt = (x, z, t) => windGust(t - x / WIND_V + Math.sin(z * .045) * 2) * (1 + STORM.value * 1.4);
  // Im Shader zusätzlich kleine Böenwellen (ca. 15 m), die schnell übers Gras laufen – wie Wind, der durch ein Feld streicht.
  const WIND_GLSL = `
    uniform float uWindT;
    uniform float uStorm;
    float windGust(float s) { float g1 = 0.5 + 0.5 * sin(s * 0.11); float g2 = max(0.0, sin(s * 0.21 + 0.8) * sin(s * 0.067)); return 0.75 + 0.25 * g1 + 0.75 * g2 * g2 + 0.06 * sin(s * 0.9); }
    float windRipple(vec2 p, float t) { float w = sin(p.x * 0.42 + p.y * 0.13 - t * 3.4 + sin(p.y * 0.21 + t * 0.3) * 1.5); return max(0.0, w) * max(0.0, w); }
    float windAt(vec2 p, float t) { float G = windGust(t - p.x / ${WIND_V.toFixed(1)} + sin(p.y * 0.045) * 2.0); return G + windRipple(p, t) * 0.35 * G; }
  `;
  // amp: Auslenkung (m) an der Spitze, hRef: Höhe, ab der voll ausgelenkt wird, flutter: Blattzittern,
  // tip: zusätzliches Schlagen der Wedel nach außen hin (Palmen, Bananen), pro m Abstand zur Stammachse
  // noFlip: Rückseiten nicht abdunkeln (Blattkarten und Halme haben eigene, nach außen/oben zeigende Normalen)
  // Die Auslenkung wird in Weltkoordinaten addiert, damit alle Pflanzen in dieselbe Richtung neigen (egal wie gedreht).
  function addWind(mat, amp, hRef, flutter = 0, noFlip = false, tip = 0) {
    mat.onBeforeCompile = sh => {
      sh.uniforms.uWindT = WIND_T; sh.uniforms.uStorm = STORM;
      if (noFlip) sh.fragmentShader = sh.fragmentShader.replace('float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;', 'float faceDirection = 1.0;');
      sh.vertexShader = WIND_GLSL + sh.vertexShader.replace('#include <project_vertex>', `
        mat4 wM = modelMatrix;
        #ifdef USE_INSTANCING
          wM = modelMatrix * instanceMatrix;
        #endif
        vec3 wBase = (wM * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float wSc = length(wM[1].xyz);
        float T = uWindT;
        // Sturm (aus flut.js): hohe Pflanzen (Palmen, Bäume) legt er stärker um als Gras und Büsche
        float G = windAt(wBase.xz, T) * (1.0 + uStorm * ${(0.9 + 1.3 * Math.min(1, hRef / 6)).toFixed(2)});
        float ph = wBase.x * 0.13 + wBase.z * 0.29;
        float wk = clamp(position.y / ${hRef.toFixed(3)}, 0.0, 1.0); wk *= wk;
        // Neigung mit dem Wind + Nachschwingen. Feste Frequenzen (hohe Pflanzen schwingen langsamer), nur die Stärke folgt
        // dem Wind – so gibt es kein Zappeln, wenn eine Böe kommt oder geht.
        float f = ${Math.min(2, Math.max(.45, 1.7 / Math.sqrt(hRef))).toFixed(3)};
        float sw = (sin(T * f + ph) * 0.7 + sin(T * f * 1.63 + ph * 1.7) * 0.3) * (0.35 + 0.4 * G);
        vec3 wOff = vec3((0.6 * G + sw) * ${amp.toFixed(3)} * wk,
                         0.0,
                         sin(T * f * 0.77 + ph * 1.3) * 0.25 * (0.4 + 0.3 * G) * ${amp.toFixed(3)} * wk);
        ${flutter ? `wOff.y += sin(T * 3.0 + position.x * 6.0 + position.z * 5.0 + ph) * ${flutter.toFixed(3)} * wk * (0.5 + 0.5 * G);
        wOff.x += cos(T * 3.7 + position.y * 4.0 + position.z * 3.0) * ${(flutter * .5).toFixed(3)} * wk * (0.5 + 0.5 * G);` : ''}
        ${tip ? `// Wedel: biegen sich nach außen hin mit dem Wind und schwingen seitlich nach, heben sich kaum
        float rr = length(position.xz); float ang = atan(position.z, position.x);
        float fs = sin(T * f * 1.4 + ang * 2.0 + ph);
        wOff.x += ${tip.toFixed(3)} * rr * (0.45 * G + 0.2 * fs * (0.5 + 0.5 * G));
        wOff.z += ${tip.toFixed(3)} * rr * 0.15 * cos(T * f * 1.1 + ang * 3.0 + ph) * (0.5 + 0.5 * G);
        wOff.y += ${tip.toFixed(3)} * rr * 0.08 * fs;` : ''}
        // im Sturm zusätzlich schnelles Zerren und Schütteln (Böen reißen an Kronen und Wedeln)
        wOff.x += sin(T * f * 2.9 + ph * 2.3) * 0.22 * uStorm * G * ${amp.toFixed(3)} * wk;
        wOff.z += cos(T * f * 2.3 + ph * 1.7) * 0.14 * uStorm * G * ${amp.toFixed(3)} * wk;
        // biegen statt strecken: was zur Seite geht, sinkt etwas ab (Halme und Stämme behalten ungefähr ihre Länge)
        wOff.y -= min(dot(wOff.xz, wOff.xz) * 0.5 / max(position.y, 0.05), max(position.y, 0.0) * 0.6);
        vec4 mvPosition = wM * vec4(transformed, 1.0);
        mvPosition.xyz += wOff * wSc;
        mvPosition = viewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`);
    };
    mat.customProgramCacheKey = () => `wind5|${amp}|${hRef}|${flutter}|${noFlip}|${tip}`;
    return mat;
  }

  // Blattbüschel mit Alpha (scharf gezeichnete Einzelblätter mit Verlauf und Mittelrippe)
  function leafCardTexture(seed, palette, opaque = false) {
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), r = rng(seed), cx = S / 2, cy = S / 2;
    if (opaque) { const p0 = palette[0]; g.fillStyle = hsl(p0[0], p0[1], p0[2] - 14); g.fillRect(0, 0, S, S); }
    const leaf = (x, y, len, wid, ang, col) => {
      g.save(); g.translate(x, y); g.rotate(ang);
      const gr = g.createLinearGradient(0, -wid, 0, wid);
      gr.addColorStop(0, hsl(col[0] - 4, col[1], col[2] + 10)); gr.addColorStop(.5, hsl(col[0], col[1], col[2])); gr.addColorStop(1, hsl(col[0] + 4, col[1] + 4, col[2] - 12));
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(len * .25, -wid * 1.1, len * .75, -wid * .9, len, 0); g.bezierCurveTo(len * .75, wid * .9, len * .25, wid * 1.1, 0, 0); g.fill();
      g.strokeStyle = 'rgba(20,45,10,.35)'; g.lineWidth = 1; g.stroke();
      g.strokeStyle = hsl(col[0] - 8, col[1] - 12, col[2] + 18); g.globalAlpha = .6; g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(len * .05, 0); g.quadraticCurveTo(len * .5, -wid * .1, len * .9, 0); g.stroke();
      g.globalAlpha = .35; g.lineWidth = .8;
      for (let k = 1; k < 4; k++) { const t = k / 4.2; g.beginPath(); g.moveTo(len * t, 0); g.lineTo(len * (t + .12), -wid * .6); g.moveTo(len * t, 0); g.lineTo(len * (t + .12), wid * .6); g.stroke(); }
      g.globalAlpha = 1; g.restore();
    };
    // von innen nach außen: innen dunkler, außen heller
    const N = opaque ? 260 : 150;
    for (let i = 0; i < N; i++) {
      const k = i / N, rad = S * .44 * Math.sqrt(k) * (.75 + r() * .25), a = r() * Math.PI * 2;
      const x = opaque ? r() * S : cx + Math.cos(a) * rad * .55, y = opaque ? r() * S : cy + Math.sin(a) * rad * .55;
      const len = 34 + r() * 36 + k * 14, wid = len * (.28 + r() * .08);
      const p = palette[Math.floor(r() * palette.length)];
      leaf(x, y, len, wid, a + (r() - .5) * .9, [p[0] + (r() - .5) * 8, p[1] + (r() - .5) * 8, p[2] - 6 + k * 9 + (r() - .5) * 6]);
    }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    if (opaque) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); }
    return t;
  }

  // Krone aus vielen Blattkarten: Karten stehen auf Kugelschalen, ihre Normalen zeigen von der Kronenmitte weg
  // (weiche, runde Schattierung wie bei modernen Spielen), innen eine dunkle Füllung gegen Durchblicke.
  function cardCrown(blobs, perBlob, card, seed) {
    const r = rng(seed), pos = [], nor = [], uv = [], col = [];
    const center = new THREE.Vector3(); blobs.forEach(b => center.add(new THREE.Vector3(b[0], b[1], b[2]))); center.divideScalar(blobs.length);
    let minY = Infinity, maxY = -Infinity; blobs.forEach(b => { minY = Math.min(minY, b[1] - b[3]); maxY = Math.max(maxY, b[1] + b[3]); });
    const up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), tmpN = new THREE.Vector3();
    blobs.forEach(([bx, by, bz, br]) => {
      for (let i = 0; i < perBlob; i++) {
        const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
        const dir = new THREE.Vector3(s * Math.cos(th), u * .85 + .1, s * Math.sin(th)).normalize();
        const p = new THREE.Vector3(bx, by, bz).addScaledVector(dir, br * (.5 + Math.sqrt(r()) * .5));
        const sz = card * (.8 + r() * .45);
        // Karte senkrecht zur Richtung nach außen, etwas verdreht
        q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().lerp(new THREE.Vector3(r() - .5, r() - .2, r() - .5), .45).normalize());
        q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), r() * Math.PI * 2));
        const corners = [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]].map(([a, b]) => new THREE.Vector3(a * sz, b * sz, 0).applyQuaternion(q).add(p));
        [[0, 1, 2], [0, 2, 3]].forEach(tri => tri.forEach(k => {
          const v = corners[k]; pos.push(v.x, v.y, v.z);
          tmpN.copy(v).sub(center).normalize().lerp(up, .25).normalize(); nor.push(tmpN.x, tmpN.y, tmpN.z);
          uv.push(k === 0 || k === 3 ? 0 : 1, k < 2 ? 0 : 1);
          const hy = (v.y - minY) / (maxY - minY), out = Math.min(1, v.clone().sub(center).length() / (br * 1.6 + .01));
          const ao = .68 + .22 * hy + .12 * out; col.push(ao, ao, ao);
        }));
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const core = tint(mergeGeos(blobs.map(([x, y, z, rr], i) => place(lumpy(rr * .62, 2, .14, seed * 7 + i), x, y, z))), 0xffffff, .45);
    return [geo, core];
  }

  // Februar in Bangladesch: Trockenzeit, kühl und staubig. Das Gras ist olivgrün bis strohgelb, viel ist abgestorben
  // (braun, umgeknickt), nur unten am Fuß noch frisch. Eine Palette für Gelände, Büschel, Horste und Kit-Gras.
  const VEG = {
    base: '#28311a', green: '#56632e', greenTip: '#838c4a',
    straw: '#857846', strawTip: '#b3a26e', dead: '#65553a', deadTip: '#8f7d5a',
  };
  // Grasbüschel: Halme aus drei Segmenten, die sich nach außen biegen (spitz zulaufend), unten dunkel, Spitzen heller.
  // Mischung: knapp die Hälfte noch olivgrün, der Rest strohig oder abgestorben; ein paar Halme sind umgeknickt.
  // Normalen nach oben (wirkt wie Teil des Bodens).
  // lowPoly: Halme aus nur zwei Segmenten (für weiter entfernte Büschel)
  function grassTuftGeo(seed, blades = 30, hMin = .13, hVar = .24, spread = .24, dryShare = .48, lowPoly = false) {
    const r = rng(seed), pos = [], nor = [], col = [];
    const C = k => new THREE.Color(VEG[k]);
    const base = C('base'), kinds = [[C('green'), C('greenTip')], [C('straw'), C('strawTip')], [C('dead'), C('deadTip')]];
    const push = (v, c) => { pos.push(v[0], v[1], v[2]); nor.push(0, 1, 0); col.push(c.r, c.g, c.b); };
    for (let b = 0; b < blades; b++) {
      const a = r() * Math.PI * 2, rad = Math.pow(r(), .7) * spread, ox = Math.cos(a) * rad, oz = Math.sin(a) * rad;
      const inner = 1 - rad / spread;                                       // innen höher und aufrechter
      let h = (hMin + Math.pow(r(), .8) * hVar) * (.75 + inner * .45), w = .012 + r() * .01, bend = .2 + r() * .5 + (1 - inner) * .3;
      const la = a + (r() - .5) * 1.2, dx = Math.cos(la), dz = Math.sin(la), px = -Math.sin(la), pz = Math.cos(la);
      const q = r(), kind = q < 1 - dryShare ? 0 : q < 1 - dryShare * .4 ? 1 : 2;
      const broken = kind === 2 && r() < .45;                               // abgeknickter, toter Halm hängt zum Boden
      if (broken) { bend = 1.1 + r() * .4; h *= 1.1; }
      const [cm, ct] = kinds[kind], cM = cm.clone().multiplyScalar(.82 + r() * .3), cT = ct.clone().lerp(cM, r() * .35).multiplyScalar(.9 + r() * .2);
      const cB = base.clone().lerp(cM, kind ? .35 : .1);
      // Mittellinie: Bogen nach außen; geknickte Halme fallen hinten wieder ab
      const P = t => { const o = h * bend * t * t; return [ox + dx * o, h * t * (1 - bend * .45 * t) * (broken ? 1 - .7 * t * t : 1), oz + dz * o]; };
      const ts = lowPoly ? [0, .55, 1] : [0, .38, .72, 1], ws = lowPoly ? [w * 1.1, w * .65, 0] : [w, w * .8, w * .5, 0];
      for (let k = 0; k < ts.length - 1; k++) {
        const p0 = P(ts[k]), p1 = P(ts[k + 1]), w0 = ws[k], w1 = ws[k + 1];
        const c0 = k === 0 ? cB : cM.clone().lerp(cT, ts[k]), c1 = cM.clone().lerp(cT, ts[k + 1]);
        const a0 = [p0[0] - px * w0, p0[1], p0[2] - pz * w0], a1 = [p0[0] + px * w0, p0[1], p0[2] + pz * w0];
        const b0 = [p1[0] - px * w1, p1[1], p1[2] - pz * w1], b1 = [p1[0] + px * w1, p1[1], p1[2] + pz * w1];
        push(a0, c0); push(a1, c0); push(b1, c1);
        if (w1 > 0) { push(a0, c0); push(b1, c1); push(b0, c1); }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return geo;
  }

  // Wildgras-Horst (Ulu-/Kash-Gras am Wegrand): hoher, buschiger Horst aus langen, überhängenden Halmen, viel davon
  // vertrocknet; dazu einige Halme mit hellen Samenrispen, die im Wind nicken. Etwa 0.6–1 m hoch.
  function grassClumpGeo(seed, blades = 46, hgt = .8) {
    const r = rng(seed), pos = [], nor = [], col = [];
    const C = k => new THREE.Color(VEG[k]);
    const base = C('base'), kinds = [[C('green'), C('greenTip')], [C('straw'), C('strawTip')], [C('dead'), C('deadTip')]], plume = new THREE.Color('#cfc3a2');
    const push = (v, c, n = [0, 1, 0]) => { pos.push(v[0], v[1], v[2]); nor.push(n[0], n[1], n[2]); col.push(c.r, c.g, c.b); };
    const strip = (P, wAt, cAt, side, segs) => {
      for (let k = 0; k < segs; k++) {
        const t0 = k / segs, t1 = (k + 1) / segs, p0 = P(t0), p1 = P(t1), w0 = wAt(t0), w1 = wAt(t1);
        const a0 = [p0[0] - side[0] * w0, p0[1], p0[2] - side[1] * w0], a1 = [p0[0] + side[0] * w0, p0[1], p0[2] + side[1] * w0];
        const b0 = [p1[0] - side[0] * w1, p1[1], p1[2] - side[1] * w1], b1 = [p1[0] + side[0] * w1, p1[1], p1[2] + side[1] * w1];
        const c0 = cAt(t0), c1 = cAt(t1);
        push(a0, c0); push(a1, c0); push(b1, c1);
        if (w1 > 0) { push(a0, c0); push(b1, c1); push(b0, c1); }
      }
    };
    for (let b = 0; b < blades; b++) {
      const a = r() * Math.PI * 2, rad = Math.pow(r(), 1.5) * .14, ox = Math.cos(a) * rad, oz = Math.sin(a) * rad;
      const h = hgt * (.55 + r() * .55), w = .014 + r() * .01, bend = .45 + r() * .7;
      const la = a + (r() - .5) * .8, dx = Math.cos(la), dz = Math.sin(la), side = [-Math.sin(la), Math.cos(la)];
      const q = r(), kind = q < .35 ? 0 : q < .72 ? 1 : 2;
      const [cm, ct] = kinds[kind], cM = cm.clone().multiplyScalar(.85 + r() * .25), cT = ct.clone().multiplyScalar(.9 + r() * .15);
      // steigt auf, wölbt sich über und hängt mit der Spitze nach unten (wie langes, trockenes Gras)
      const P = t => { const o = h * bend * .55 * t; return [ox + dx * o, h * (t * 1.15 - bend * .55 * t * t), oz + dz * o]; };
      strip(P, t => w * (1 - t * .85), t => (t < .15 ? base.clone().lerp(cM, t / .15) : cM.clone().lerp(cT, (t - .15) / .85)), side, 5);
    }
    // Samenrispen: dünner Stängel, oben ein heller, federiger Büschel
    const stalks = 7 + Math.floor(r() * 5);
    for (let s = 0; s < stalks; s++) {
      const a = r() * Math.PI * 2, ox = Math.cos(a) * r() * .08, oz = Math.sin(a) * r() * .08, h = hgt * (1.05 + r() * .4), lean = .08 + r() * .18;
      const dx = Math.cos(a), dz = Math.sin(a), side = [-Math.sin(a), Math.cos(a)];
      const P = t => [ox + dx * lean * h * t * t, h * t, oz + dz * lean * h * t * t];
      strip(P, () => .005, t => new THREE.Color(VEG.straw).lerp(new THREE.Color(VEG.strawTip), t), side, 4);
      // Rispe: einige kurze, helle Fäden, die nach außen und unten nicken
      for (let f = 0; f < 7; f++) {
        const fa = a + (f - 3) * .35 + (r() - .5) * .3, fl = .09 + r() * .07, fdx = Math.cos(fa), fdz = Math.sin(fa);
        const t0 = .78 + f * .03, st = P(t0);
        const Q = t => [st[0] + (fdx * .5 + dx * .7) * fl * t, st[1] + fl * (.6 * t - .9 * t * t), st[2] + (fdz * .5 + dz * .7) * fl * t];
        strip(Q, t => .018 * Math.sin(Math.PI * Math.min(1, t * 1.1 + .1)), () => plume.clone().multiplyScalar(.9 + r() * .15), [-Math.sin(fa), Math.cos(fa)], 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return geo;
  }

  // Vetiver-Horst (Chrysopogon zizanioides): dichter, aufrechter Horst aus langen, schmalen, steifen Blättern (1–1.5 m),
  // die oben überhängen. Blaugrün-oliv, im Februar mit vielen strohigen Spitzen und toten Außenblättern; dazu einige
  // hohe Halme mit schmalen, purpurbraunen Rispen. Der Fuß ist breit und dunkel.
  function vetiverClumpGeo(seed, blades = 64, hgt = 1.25) {
    const r = rng(seed), pos = [], nor = [], col = [];
    const H = c => new THREE.Color(c);
    const base = H('#2a3119'), green = H('#5b6a36'), greenTip = H('#8e9356'), blue = H('#4f6343'), straw = H('#8f7f4c'), strawTip = H('#c2b07a'), dead = H('#6c5a3c'), panicle = H('#6e4f45');
    const push = (v, c, n) => { pos.push(v[0], v[1], v[2]); nor.push(n[0], n[1], n[2]); col.push(c.r, c.g, c.b); };
    const strip = (P, wAt, cAt, side, segs) => {
      for (let k = 0; k < segs; k++) {
        const t0 = k / segs, t1 = (k + 1) / segs, p0 = P(t0), p1 = P(t1), w0 = wAt(t0), w1 = wAt(t1);
        // Normale zeigt schräg nach außen/oben, damit der Horst wie ein Volumen schattiert wird
        const n0 = [p0[0] * 2, .9, p0[2] * 2], n1 = [p1[0] * 2, .9, p1[2] * 2];
        const a0 = [p0[0] - side[0] * w0, p0[1], p0[2] - side[1] * w0], a1 = [p0[0] + side[0] * w0, p0[1], p0[2] + side[1] * w0];
        const b0 = [p1[0] - side[0] * w1, p1[1], p1[2] - side[1] * w1], b1 = [p1[0] + side[0] * w1, p1[1], p1[2] + side[1] * w1];
        const c0 = cAt(t0), c1 = cAt(t1);
        push(a0, c0, n0); push(a1, c0, n0); push(b1, c1, n1);
        if (w1 > 0) { push(a0, c0, n0); push(b1, c1, n1); push(b0, c1, n1); }
      }
    };
    for (let b = 0; b < blades; b++) {
      const a = r() * Math.PI * 2, rad = Math.pow(r(), 1.3) * .2, ox = Math.cos(a) * rad, oz = Math.sin(a) * rad;
      const outer = rad / .2;                                                  // außen kürzer, flacher, öfter tot
      const h = hgt * (.65 + r() * .5) * (1.05 - outer * .3), w = .014 + r() * .01;
      const lean = .08 + outer * .35 + r() * .15, droop = .15 + r() * .4 + outer * .3;
      const la = a + (r() - .5) * .7, dx = Math.cos(la), dz = Math.sin(la), side = [-Math.sin(la), Math.cos(la)];
      const q = r(), kind = outer > .7 && q < .45 ? 2 : q < .55 ? 0 : 1;
      const cM = (kind === 0 ? green.clone().lerp(blue, r() * .6) : kind === 1 ? green.clone().lerp(straw, .35 + r() * .3) : dead.clone()).multiplyScalar(.85 + r() * .25);
      const cT = kind === 2 ? H('#9a8662') : r() < .7 ? strawTip.clone().multiplyScalar(.85 + r() * .2) : greenTip.clone();
      const tipStart = kind === 2 ? .1 : .55 + r() * .3;                       // ab hier vergilbt die Spitze
      // steigt steil auf, oberes Drittel biegt sich nach außen und hängt etwas über
      const P = t => { const o = h * (lean * t + droop * Math.pow(t, 3)); return [ox + dx * o, h * (t - droop * .45 * Math.pow(t, 3)), oz + dz * o]; };
      strip(P, t => w * (1 - Math.pow(t, 1.6) * .92),
        t => (t < .12 ? base.clone().lerp(cM, t / .12) : t < tipStart ? cM : cM.clone().lerp(cT, (t - tipStart) / (1 - tipStart))), side, 6);
    }
    // Blütenhalme mit schmaler, aufrechter Rispe
    const stalks = 4 + Math.floor(r() * 4);
    for (let s = 0; s < stalks; s++) {
      const a = r() * Math.PI * 2, ox = Math.cos(a) * r() * .07, oz = Math.sin(a) * r() * .07, h = hgt * (1.25 + r() * .35), lean = .04 + r() * .1;
      const dx = Math.cos(a), dz = Math.sin(a), side = [-Math.sin(a), Math.cos(a)];
      const P = t => [ox + dx * lean * h * t * t, h * t, oz + dz * lean * h * t * t];
      strip(P, () => .005, t => straw.clone().lerp(strawTip, t), side, 5);
      for (let f = 0; f < 9; f++) {
        const fa = a + (r() - .5) * 2.4, fl = .07 + r() * .09, t0 = .72 + f * .03, st = P(t0), fdx = Math.cos(fa), fdz = Math.sin(fa);
        const Q = t => [st[0] + (fdx * .25 + dx * lean) * fl * t, st[1] + fl * t * .9, st[2] + (fdz * .25 + dz * lean) * fl * t];
        strip(Q, t => .012 * Math.sin(Math.PI * Math.min(1, t * 1.1 + .1)), () => panicle.clone().lerp(strawTip, r() * .4), [-Math.sin(fa), Math.cos(fa)], 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeBoundingSphere();
    return geo;
  }
  let vetiverKit = null;   // Geometrien und Material werden einmal gebaut und von allen Vetiver-Hecken geteilt

  // Wasser: drei Wellenschichten in verschiedenen Größen und Richtungen (keine sichtbaren Kacheln), trübes Grün-Braun,
  // Spiegelung über die Umgebung. Vorbereitet für später: RAIN.value (0..1) lässt Regentropfen-Ringe erscheinen.
  const RAIN = { value: 0 };
  // Nässe (0..1) aus der Flut-Simulation: Boden, Hof und Wege werden im Regen dunkler und glänzen
  const WET = { value: 0 };
  function wetify(mat) {
    const prev = mat.onBeforeCompile, key = mat.customProgramCacheKey();
    mat.onBeforeCompile = (sh, r) => {
      prev.call(mat, sh, r);
      sh.uniforms.uWet = WET;
      sh.fragmentShader = 'uniform float uWet;\n' + sh.fragmentShader.replace('#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\n  diffuseColor.rgb *= 1.0 - 0.3 * uWet; roughnessFactor = mix(roughnessFactor, 0.38, uWet * 0.7);');
    };
    mat.customProgramCacheKey = () => key + '|wet';
    return mat;
  }
  function waterMaterial(color, normal, o = {}) {
    const { refl = 0xa3aaab, ...rest } = o;
    const m = new THREE.MeshStandardMaterial({ color, roughness: .1, metalness: 0, normalMap: normal, normalScale: new THREE.Vector2(.36, .36), envMapIntensity: .6, ...rest });
    const uRefl = { value: new THREE.Color(refl) };
    m.onBeforeCompile = sh => {
      sh.uniforms.uWind = WIND; sh.uniforms.uRain = RAIN; sh.uniforms.uRefl = uRefl;
      // Eckfarbe = was sich spiegelt (Mitte Himmel, am Ufer Bäume/Häuser); Körperfarbe bleibt die dunkle Materialfarbe
      sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '').replace('#include <output_fragment>', `
        #ifdef USE_COLOR
          vec3 reflC = vColor.rgb;
        #else
          vec3 reflC = uRefl;
        #endif
        vec3 Vw = normalize(vViewPosition);
        float fres = 0.1 + 0.9 * pow(1.0 - clamp(dot(normal, Vw), 0.0, 1.0), 3.0);
        reflC *= (0.88 + 0.5 * normal.x + 0.25 * normal.y) * 0.55;   // spiegelt den dunklen Gewitterhimmel
        outgoingLight = mix(outgoingLight, reflC, clamp(fres * 1.5, 0.0, 0.9));
        #include <output_fragment>`);
      sh.fragmentShader = 'uniform float uWind;\nuniform float uRain;\nuniform vec3 uRefl;\n' + sh.fragmentShader.replace('vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;',
        `vec3 mapN = (texture2D( normalMap, vUv + vec2(uWind * 0.010, uWind * 0.004) ).xyz * 2.0 - 1.0)
          + (texture2D( normalMap, vUv * 2.37 + vec2(-uWind * 0.006, uWind * 0.011) ).xyz * 2.0 - 1.0) * 0.7
          + (texture2D( normalMap, vUv * 0.31 + vec2(uWind * 0.004, -uWind * 0.002) ).xyz * 2.0 - 1.0) * 0.8;
        if (uRain > 0.001) {
          vec2 rp = vUv * 9.0; vec2 cell = floor(rp); vec2 fr = fract(rp) - 0.5;
          float seed = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
          float t = fract(uWind * 0.9 + seed); vec2 off = vec2(fract(seed * 7.13), fract(seed * 3.71)) - 0.5;
          float d = length(fr - off * 0.6); float ring = sin((d - t * 0.45) * 60.0) * smoothstep(0.45, 0.0, d) * (1.0 - t) * step(d, t * 0.45 + 0.02);
          vec2 dir = (fr - off * 0.6) / max(d, 0.001); mapN.xy += dir * ring * 1.6 * uRain;
        }
        mapN = normalize(mapN);`);
    };
    m.customProgramCacheKey = () => 'water4';
    return m;
  }

  /* ---------- Dorf-Requisiten: Tonkrüge, Wasserfässer, Wäsche ---------- */

  // Ton: oben heller (Rand), unten dunkler (Ruß und Feuchte), feine Drehrillen, aufgemalte Bänder mit Punkten und Zickzack.
  // bands: v-Werte (0 unten, 1 oben) für die Bemalung
  function potTex(seed, bands, base = [190, 104, 64]) {
    return decalTex(256, 256, (g, w, h, r) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, `rgb(${base[0] + 18},${base[1] + 22},${base[2] + 16})`); gr.addColorStop(.45, `rgb(${base[0]},${base[1]},${base[2]})`); gr.addColorStop(1, `rgb(${base[0] - 70},${base[1] - 46},${base[2] - 30})`);
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) { const y = r() * h; g.fillStyle = r() < .5 ? 'rgba(255,226,196,.07)' : 'rgba(80,34,14,.08)'; g.fillRect(0, y, w, 1 + r() * 2); }
      for (let i = 0; i < 26; i++) { const x = r() * w, y = h * (.55 + r() * .45), rad = 8 + r() * 26, rg = g.createRadialGradient(x, y, 0, x, y, rad); rg.addColorStop(0, 'rgba(60,34,20,.25)'); rg.addColorStop(1, 'rgba(60,34,20,0)'); g.fillStyle = rg; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
      bands.forEach(([v, kind], k) => {
        const y = (1 - v) * h;
        g.fillStyle = kind === 'dark' ? 'rgba(40,24,16,.85)' : 'rgba(244,234,214,.9)';
        g.fillRect(0, y - 2, w, 3); g.fillRect(0, y + 9, w, 2);
        for (let x = 4; x < w; x += 12) {
          if (k % 2) { g.beginPath(); g.moveTo(x, y + 2); g.lineTo(x + 6, y + 8); g.lineTo(x + 12, y + 2); g.lineWidth = 1.6; g.strokeStyle = g.fillStyle; g.stroke(); }
          else { g.beginPath(); g.arc(x, y + 5, 2, 0, 7); g.fill(); }
        }
      });
      for (let i = 0; i < 500; i++) { g.fillStyle = r() < .5 ? 'rgba(255,230,200,.18)' : 'rgba(70,30,14,.2)'; g.fillRect(r() * w, r() * h, 1.2, 1.2); }
    }, seed);
  }
  const latheOf = (pts, seg = 32) => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), seg);

  // Kolshi (runder Wasserkrug mit engem Hals), Motka (Vorratsgefäß), Handi (Kochtopf), Strohring, Tondeckel
  function potGroup(M_) {
    const g = new THREE.Group();
    const mat = (seed, bands, base) => new THREE.MeshStandardMaterial({ map: potTex(seed, bands, base), roughness: .86, side: THREE.DoubleSide, envMapIntensity: .55 });
    const kolshi = latheOf([[0, 0], [.08, .005], [.16, .04], [.22, .1], [.255, .18], [.262, .26], [.248, .34], [.205, .41], [.135, .46], [.088, .49], [.076, .53], [.086, .57], [.112, .6], [.118, .615], [.102, .612], [.072, .57]]);
    const motka = latheOf([[0, 0], [.12, .01], [.22, .06], [.3, .16], [.34, .3], [.342, .44], [.31, .56], [.252, .64], [.222, .68], [.232, .71], [.252, .73], [.242, .745], [.212, .73]]);
    const handi = latheOf([[0, 0], [.1, .01], [.17, .05], [.2, .11], [.19, .17], [.152, .21], [.14, .235], [.162, .25], [.152, .262], [.122, .246]]);
    const lid = latheOf([[0, .06], [.08, .055], [.2, .03], [.26, .0], [.27, .012], [.21, .045], [.09, .075], [.0, .08]], 24);
    const mK = mat(301, [[.62, 'light'], [.7, 'dark'], [.78, 'light']]), mM = mat(302, [[.56, 'dark'], [.64, 'light'], [.88, 'dark']], [176, 96, 60]), mH = mat(303, [[.7, 'dark']], [150, 84, 58]);
    const add = (geo, m, x, y, z, s = 1, rx = 0, rz = 0) => { const o = mesh(geo, m, x, y, z); o.scale.setScalar(s); o.rotation.set(rx, 0, rz); g.add(o); return o; };
    const ring = mesh(new THREE.TorusGeometry(.17, .05, 8, 20), M_.thatch(), .1, .04, -.05); ring.rotation.x = Math.PI / 2; g.add(ring);
    add(kolshi, mK, .1, .055, -.05, 1.05);                         // Krug auf dem Strohring
    add(motka, mM, -.42, 0, .55, 1.05);                             // großes Vorratsgefäß mit Deckel, obendrauf ein Kochtopf (umgedreht)
    add(lid, mH, -.42, .76, .55, 1.05);
    add(handi, mH, -.42, 1.11, .55, 1.05, Math.PI);
    add(kolshi, mK, .58, .245, .45, .9, 0, Math.PI / 2 - .12).rotation.y = .6;   // liegender Krug
    add(handi, mH, .55, 0, -.32, .9);
    add(lid, mH, .82, .0, .05, .8, .2);
    return g;
  }

  // Blaues Kunststofffass (200 l) mit Verstärkungsringen, Spundlöchern, Etikett; unten Erdspritzer, oben ausgeblichen
  let drumMats = null;
  function drumGroup(M_, color = '#2f6fb0', extra = 0) {
    drumMats = drumMats || {};
    const mk = col => drumMats[col] || (drumMats[col] = new THREE.MeshStandardMaterial({ roughness: .42, envMapIntensity: .8, map: decalTex(256, 256, (g, w, h, r) => {
      g.fillStyle = col; g.fillRect(0, 0, w, h);
      const top = g.createLinearGradient(0, 0, 0, h * .35); top.addColorStop(0, 'rgba(255,255,255,.2)'); top.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = top; g.fillRect(0, 0, w, h * .35);
      const bot = g.createLinearGradient(0, h * .68, 0, h); bot.addColorStop(0, 'rgba(96,74,48,0)'); bot.addColorStop(1, 'rgba(96,74,48,.6)'); g.fillStyle = bot; g.fillRect(0, h * .68, w, h * .32);
      for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(${r() < .5 ? '255,255,255' : '20,30,50'},${.08 + r() * .12})`; g.lineWidth = .8; const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 18, y + (r() - .5) * 4); g.stroke(); }
      for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(110,84,54,${.12 + r() * .25})`; g.beginPath(); g.arc(r() * w, h * (.78 + r() * .22), 1 + r() * 3.5, 0, 7); g.fill(); }
      g.fillStyle = 'rgba(238,234,222,.9)'; g.fillRect(w * .12, h * .42, w * .13, h * .13);
      g.fillStyle = 'rgba(200,52,40,.8)'; g.fillRect(w * .12, h * .42, w * .13, h * .03);
      g.fillStyle = 'rgba(60,60,60,.6)'; for (let k = 0; k < 3; k++) g.fillRect(w * .135, h * (.48 + k * .025), w * .1, 2);
    }, col.length * 13) }));
    const m = mk(color), g = new THREE.Group();
    g.add(mesh(latheOf([[0, 0], [.25, 0], [.275, .015], [.286, .05], [.282, .24], [.298, .262], [.298, .296], [.282, .32], [.28, .56], [.296, .582], [.296, .616], [.28, .64], [.284, .84], [.277, .872], [.256, .884], [.25, .874], [0, .874]], 36), m));
    [[.13, .05], [-.13, -.04]].forEach(([x, z], k) => g.add(mesh(new THREE.CylinderGeometry(k ? .03 : .045, k ? .03 : .045, .03, 12), m, x, .885, z)));
    if (extra === 1) {   // Becher auf dem Deckel
      g.add(mesh(new THREE.CylinderGeometry(.045, .04, .11, 14), M_.metal(), -.02, .93, .08));
      const hd = mesh(new THREE.TorusGeometry(.03, .007, 5, 10, Math.PI), M_.metal(), .028, .93, .08); hd.rotation.z = -Math.PI / 2; g.add(hd);
    }
    return g;
  }
  // Aluminiumeimer mit Henkel
  function bucketGroup(M_) {
    const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0xb9bfc2, roughness: .32, metalness: .75, envMapIntensity: 1.1, side: THREE.DoubleSide });
    g.add(mesh(latheOf([[0, 0], [.13, 0], [.135, .01], [.17, .3], [.18, .31], [.172, .31], [.162, .29], [.125, .02], [0, .02]], 24), m));
    const h = mesh(new THREE.TorusGeometry(.17, .006, 5, 16, Math.PI), M_.metal(), 0, .31, 0); h.rotation.y = .4; g.add(h);
    return g;
  }

  // Stoffmuster für die Wäsche (Canvas oben = Stoff oben). Lungi kariert, Sari mit Bordüre, Gamchha rot-weiß,
  // Hemd und Kinderkleid als Umriss (Alpha).
  function clothTex(kind, seed) {
    return decalTex(128, 128, (g, w, h, r) => {
      if (kind === 'lungi') {
        g.fillStyle = '#2d4f86'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < w; i += 16) { g.fillStyle = 'rgba(36,118,96,.7)'; g.fillRect(i, 0, 7, h); g.fillRect(0, i, w, 7); g.fillStyle = 'rgba(236,232,216,.55)'; g.fillRect(i + 10, 0, 2, h); g.fillRect(0, i + 10, w, 2); }
      } else if (kind === 'gamchha') {
        g.fillStyle = '#efe9dc'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < w; i += 22) { g.fillStyle = 'rgba(190,44,38,.85)'; g.fillRect(i, 0, 10, h); g.fillRect(0, i, w, 10); g.fillStyle = 'rgba(40,120,70,.7)'; g.fillRect(i + 14, 0, 2, h); g.fillRect(0, i + 14, w, 2); }
      } else if (kind === 'sari') {
        g.fillStyle = '#d6662e'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#2f7d4f'; g.fillRect(0, h * .78, w, h * .22);
        g.fillStyle = '#e4bd52'; g.fillRect(0, h * .78, w, 3); g.fillRect(0, h * .9, w, 2);
        for (let x = 4; x < w; x += 10) { g.beginPath(); g.moveTo(x, h * .82); g.lineTo(x + 5, h * .88); g.lineTo(x + 10, h * .82); g.fill(); }
        for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(240,200,90,.8)'; g.beginPath(); g.arc(r() * w, r() * h * .74, 1.6, 0, 7); g.fill(); }
      } else if (kind === 'shirt') {
        g.fillStyle = '#dfe8ee'; g.beginPath(); [[42, 6], [86, 6], [120, 26], [108, 50], [97, 42], [97, 124], [31, 124], [31, 42], [20, 50], [8, 26]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(90,120,150,.45)'; g.lineWidth = 2; for (let x = 36; x < 96; x += 7) { g.beginPath(); g.moveTo(x, 10); g.lineTo(x, 122); g.stroke(); }
        g.fillStyle = '#c2d0da'; g.beginPath(); g.moveTo(52, 6); g.lineTo(64, 24); g.lineTo(76, 6); g.fill();
        g.fillStyle = '#7d8c96'; for (let y = 30; y < 120; y += 16) { g.beginPath(); g.arc(64, y, 2, 0, 7); g.fill(); }
        g.strokeStyle = 'rgba(120,140,160,.6)'; g.strokeRect(70, 40, 16, 16);
      } else {
        g.fillStyle = '#e7b23c'; g.beginPath(); [[48, 6], [80, 6], [86, 36], [118, 124], [10, 124], [42, 36]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
        g.globalCompositeOperation = 'source-atop';
        for (let i = 0; i < 26; i++) { const x = r() * w, y = 30 + r() * 96; g.fillStyle = r() < .5 ? '#c8423a' : '#f4f0e6'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.26) * 3, y + Math.sin(k * 1.26) * 3, 2.2, 0, 7); g.fill(); } }
        g.fillStyle = '#c8423a'; g.fillRect(0, 112, w, 6);
      }
      g.globalCompositeOperation = 'source-atop';
      for (let i = 0; i < 260; i++) { g.fillStyle = r() < .5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.07)'; g.fillRect(r() * w, r() * h, 2 + r() * 6, 1); }
      const sh = g.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, 'rgba(255,255,255,.08)'); sh.addColorStop(1, 'rgba(40,30,20,.16)'); g.fillStyle = sh; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'source-over';
    }, seed);
  }
  // Stoff weht im Wind: unten stärker als oben (Geometrie hängt von y = 0 nach unten)
  function clothMat(map, alpha) {
    const m = new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: .92, envMapIntensity: .55, alphaTest: alpha ? .5 : 0 });
    m.onBeforeCompile = sh => {
      sh.uniforms.uWindT = WIND_T;
      sh.vertexShader = 'uniform float uWindT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = vec3(position);
        float hang = clamp(-position.y / 1.1, 0.0, 1.0); hang = hang * hang * (3.0 - 2.0 * hang);
        float seedX = modelMatrix[3][0] * 3.1 + modelMatrix[3][2];
        float gust = 0.55 + 0.45 * sin(uWindT * 0.6 + seedX * 0.2);
        transformed.z += (0.12 * gust + sin(uWindT * 2.6 + position.x * 5.0 + seedX) * 0.05) * hang;
        transformed.y += abs(sin(uWindT * 2.6 + position.x * 5.0 + seedX)) * 0.02 * hang;`);
    };
    m.customProgramCacheKey = () => 'cloth' + (alpha ? 'a' : '');
    return m;
  }
  function laundryLine(M_) {
    const g = new THREE.Group(), L = 4.4, topY = 1.95, sag = .17, ropeY = x => topY - sag * (1 - Math.pow(2 * x / L, 2));
    [-1, 1].forEach(s => {
      g.add(mesh(new THREE.CylinderGeometry(.03, .045, 2.06, 7), M_.bamboo(), s * L / 2, 1.03, 0));
      [-1, 1].forEach(k => { const f = mesh(new THREE.CylinderGeometry(.014, .02, .24, 5), M_.bamboo(), s * L / 2 + k * .06, 2.1, 0); f.rotation.z = -k * .5; g.add(f); });
    });
    const rp = []; for (let i = 0; i <= 16; i++) { const x = -L / 2 + L * i / 16; rp.push(new THREE.Vector3(x, ropeY(x), 0)); }
    g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rp), 32, .007, 4), M_.string()));
    const pegM = new THREE.MeshStandardMaterial({ color: 0xd8b070, roughness: .7 });
    let x = -L / 2 + .3;
    [['lungi', .92, 1.05], ['gamchha', .46, .82], ['shirt', .62, .74], ['sari', .8, 1.28], ['frock', .44, .56]].forEach(([kind, w, h], i) => {
      const geo = new THREE.PlaneGeometry(w, h, 8, 10); geo.translate(0, -h / 2, 0);
      const P = geo.attributes.position;
      for (let k = 0; k < P.count; k++) { const px = P.getX(k), py = P.getY(k), hang = -py / h; P.setZ(k, Math.sin(px / w * Math.PI * (2 + i % 2) + i) * .028 * (.35 + hang)); }
      geo.computeVertexNormals();
      const cx = x + w / 2, cl = mesh(geo, clothMat(clothTex(kind, 400 + i), kind === 'shirt' || kind === 'frock'), cx, ropeY(cx) + .004, 0);
      cl.rotation.z = Math.atan(-sag * 8 * cx / (L * L)); g.add(cl);
      [-1, 1].forEach(s => g.add(mesh(boxGeo(.022, .06, .02), pegM, cx + s * (w / 2 - .05), ropeY(cx + s * (w / 2 - .05)) - .01, .012)));
      x += w + .08;
    });
    return g;
  }

  /* ---------- Stadt am Ufer: eng stehende, bunt gestrichene Häuser, Mauern, Strommasten ---------- */
  // Alles wird je Material zu einer Geometrie zusammengefasst (wenige Draw-Calls trotz vieler Häuser).
  const PAINT = ['#ebe7dc', '#e2dac6', '#c4dccf', '#b4cdd8', '#e3cfbd', '#e6d59e', '#cfb48c', '#dcc0c2', '#a3c7b8', '#d6dcdc', '#c4d0a2', '#efece4', '#bcd2de', '#d9a98a', '#9fb8a0'];
  const SHUTTER = ['#3d6f9e', '#3f7d5a', '#7a5434', '#2f5f80', '#5d7f3a', '#8a3b30'];
  function TownKit(M_, r) {
    const L = { wall: [], trim: [], tin: [], brick: [], dark: [], tile: [], thatch: [] };
    const foot = [];   // Grundflächen für Bodenschatten und Erdring
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
    let M = new THREE.Matrix4();
    const at = (x, y, z, ry) => { q.setFromAxisAngle(up, ry); M = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, one); };
    const put = (list, geo, color, ao = .2) => { tint(geo, color, ao); geo.applyMatrix4(M); list.push(geo); return geo; };
    // Kasten mit Unterkante bei y
    const B = (list, w, h, d, x, y, z, color, ao, rx = 0) => { const g = boxGeo(w, h, d); if (rx) g.rotateX(rx); g.translate(x, y + h / 2, z); return put(list, g, color, ao); };
    const shade = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();

    // Fenster in der Fassade (Fassade zeigt nach +z, Fläche bei z = fz)
    function windowAt(x, y, fz, w, h, paint, kind) {
      B(L.trim, w + .16, h + .16, .05, x, y - .08, fz + .01, shade(paint, .82), 0);
      B(L.dark, w, h, .04, x, y, fz + .03, '#2a3036', 0);
      if (kind === 'grill') { const c = SHUTTER[Math.floor(r() * SHUTTER.length)]; for (let i = 1; i < 4; i++) B(L.trim, .025, h, .03, x - w / 2 + w * i / 4, y, fz + .06, c, 0); B(L.trim, w, .025, .03, x, y + h / 2, fz + .06, c, 0); }
      else { const c = SHUTTER[Math.floor(r() * SHUTTER.length)]; const open = r() < .5; [-1, 1].forEach(s => B(L.trim, w / 2, h, .04, x + s * (open ? w * .75 : w / 4), y, fz + (open ? .04 : .06), c, .1)); }
      B(L.trim, w + .36, .06, .34, x, y + h + .1, fz + .17, shade(paint, .9), 0);     // Sonnendach (Chajja)
    }
    // Eine weitere Fassade des Hauses (x, z, Drehung ry + turn) mit Fenstern bestücken: Breite len, Fläche bei fz.
    // So hat jedes Haus auf allen Seiten Fenster, nicht nur vorn.
    function sideWindows(x, z, ry, turn, len, fz, rows, paint, kind, ww = .8, wh = 1.05) {
      at(x, worldHeight(x, z), z, ry + turn);
      const n = Math.max(1, Math.floor((len - .6) / 1.8));
      rows.forEach(y => { for (let i = 0; i < n; i++) if (r() < .85) windowAt(-len / 2 + len * (i + .5) / n, y, fz, ww, wh, paint, kind); });
      return n;
    }

    // mehrgeschossiges Betonhaus mit Flachdach, Brüstung, Wassertank und oft offenen Bewehrungseisen
    function pucca(x, z, ry, w, d, floors) {
      at(x, worldHeight(x, z), z, ry);
      const FH = 3, H = floors * FH, paint = PAINT[Math.floor(r() * PAINT.length)];
      B(L.wall, w, H, d, 0, 0, 0, paint, .18);
      B(L.trim, w + .06, .45, d + .06, 0, 0, 0, '#8f8b82', .1);
      for (let f = 1; f <= floors; f++) B(L.trim, w + .1, .14, d + .1, 0, f * FH - .07, 0, shade(paint, .86), 0);
      // Brüstung
      [[0, d / 2 - .07, w, .14], [0, -d / 2 + .07, w, .14]].forEach(([px, pz, pw, pd]) => B(L.wall, pw, .95, pd, px, H, pz, paint, .15));
      [[w / 2 - .07], [-w / 2 + .07]].forEach(([px]) => B(L.wall, .14, .95, d, px, H, 0, paint, .15));
      const n = Math.max(1, Math.floor(w / 1.7));
      for (let f = 0; f < floors; f++) for (let i = 0; i < n; i++) {
        const wx = -w / 2 + w * (i + .5) / n;
        if (f === 0 && i === Math.floor(n / 2)) continue;
        windowAt(wx, f * FH + .95, d / 2, .9, 1.25, paint, 'grill');
      }
      // Rückseite und beide Seiten: Fenster in jedem Stockwerk, hinten ein Fallrohr und manchmal eine Klimaanlage
      const rows = []; for (let f = 0; f < floors; f++) rows.push(f * FH + .95);
      sideWindows(x, z, ry, Math.PI, w, d / 2, rows, paint, 'grill', .85, 1.15);
      B(L.trim, .1, H, .1, w / 2 - .35, 0, d / 2 + .06, '#7d7f7c', 0);
      if (r() < .5) B(L.trim, .7, .45, .35, (r() - .5) * (w - 1.5), FH + .3, d / 2 + .18, '#d8d8d2', .1);
      [Math.PI / 2, -Math.PI / 2].forEach(t => { if (r() < .85) sideWindows(x, z, ry, t, d, w / 2, rows, paint, 'grill', .75, 1.05); });
      at(x, worldHeight(x, z), z, ry);
      // unten Laden mit Rollgitter und Schild, oder Tür
      const sx = -w / 2 + w * (Math.floor(n / 2) + .5) / n;
      if (r() < .55) {
        B(L.trim, 2.1, 2.3, .05, sx, .45, d / 2 + .02, '#8a949b', .15);
        for (let k = 0; k < 9; k++) B(L.dark, 2.1, .02, .02, sx, .55 + k * .24, d / 2 + .05, '#5c656b', 0);
        B(L.trim, Math.min(w - .2, 3.2), .55, .06, sx, 2.85, d / 2 + .04, ['#c8342b', '#2f7d4f', '#e0b430', '#2d62a8', '#e9e4d8'][Math.floor(r() * 5)], 0);
      } else B(L.trim, 1, 2.1, .06, sx, .45, d / 2 + .02, SHUTTER[Math.floor(r() * SHUTTER.length)], .1);
      // Balkon im Obergeschoss
      if (floors > 1 && r() < .6) {
        const bw = Math.min(w - .4, 2.8), bx = (r() - .5) * (w - bw);
        B(L.trim, bw, .12, .9, bx, FH, d / 2 + .45, shade(paint, .9), 0);
        B(L.wall, bw, .9, .08, bx, FH + .12, d / 2 + .86, paint, .1);
        if (r() < .5) for (let k = 0; k < 4; k++) B(L.trim, .38, .5, .02, bx - bw / 2 + .3 + k * .55, FH + 1.2, d / 2 + .6, ['#c8423a', '#e0b23a', '#3a6fb5', '#f2efe6'][k], 0);   // Wäsche
      }
      // schwarzer Wassertank, offene Bewehrung (Haus wird später aufgestockt)
      const tg = new THREE.CylinderGeometry(.5, .5, .95, 14); tg.translate((r() - .5) * (w - 1.4), H + .5, (r() - .5) * (d - 1.4)); put(L.trim, tg, '#26292b', .2);
      if (r() < .45) [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 1], [0, -1]].forEach(([a, b]) => { if (Math.abs(a) + Math.abs(b) && (a || w > 5)) { for (let k = 0; k < 4; k++) { const rg = new THREE.CylinderGeometry(.012, .012, 1.1, 4); rg.translate(a * (w / 2 - .2) + (k % 2) * .1, H + .55, b * (d / 2 - .2) + (k > 1 ? .1 : 0)); put(L.trim, rg, '#6f4630', 0); } B(L.wall, .3, .3, .3, a * (w / 2 - .15) + .05, H, b * (d / 2 - .15) + .05, '#b9b6ae', .1); } });
      foot.push([x, z, ry, w, d]);
      return { x, z, ry, w, d };
    }

    // einstöckiges Haus mit Wellblech-Satteldach (Wände gestrichen oder aus Blech)
    function tinHouse(x, z, ry, w, d) {
      at(x, worldHeight(x, z), z, ry);
      // Dach: Wellblech (blank, rostig oder farbig gestrichen), Tonziegel oder Stroh; Neigung je nach Deckung
      const rk = r(), roof = rk < .5 ? 'tin' : rk < .72 ? 'tile' : 'thatch';
      const WH = 2.5, p = roof === 'thatch' ? .55 + r() * .12 : roof === 'tile' ? .42 + r() * .1 : .24 + r() * .14, tinWalls = r() < .35, paint = PAINT[Math.floor(r() * PAINT.length)];
      B(L.trim, w + .12, .4, d + .12, 0, 0, 0, '#9d9486', .1);
      if (tinWalls) B(L.tin, w, WH, d, 0, .4, 0, ['#b9c3c7', '#9fb0b8', '#c09a7a', '#8ea6b8'][Math.floor(r() * 4)], .25);
      else B(L.wall, w, WH, d, 0, .4, 0, paint, .2);
      const top = .4 + WH, ridge = top + (d / 2) * Math.tan(p), run = d / 2 + .45, s = run / Math.cos(p);
      // Giebeldreiecke
      [-1, 1].forEach(sd => {
        const gx = sd * w / 2, gg = new THREE.BufferGeometry();
        const v = [gx, top, -d / 2, gx, top, d / 2, gx, ridge, 0];
        gg.setAttribute('position', new THREE.Float32BufferAttribute(sd < 0 ? v : [v[3], v[4], v[5], v[0], v[1], v[2], v[6], v[7], v[8]], 3));
        gg.computeVertexNormals(); put(tinWalls ? L.tin : L.wall, gg, tinWalls ? '#a9b4b8' : paint, 0);
      });
      const rust = ['#d8dcdc', '#c9a58a', '#b9c2c4', '#a8805e', '#cfd4d2', '#b5524a', '#5f8f6a', '#5b7fa6', '#a9584a'][Math.floor(r() * 9)];
      const rl = roof === 'tin' ? L.tin : roof === 'tile' ? L.tile : L.thatch, th = roof === 'thatch' ? .22 : roof === 'tile' ? .09 : .05;
      const rc = roof === 'tin' ? rust : roof === 'tile' ? ['#ffffff', '#f2e2d6', '#e6d2c8'][Math.floor(r() * 3)] : ['#ffffff', '#e8dcc4', '#d9ccb0'][Math.floor(r() * 3)];
      const ov = roof === 'thatch' ? .4 : 0;
      [-1, 1].forEach(sd => { const g = boxGeo(w + .6 + ov, th, s + ov); g.rotateX(sd * p); g.translate(0, ridge - ((run + ov / 2) / 2) * Math.tan(p) + th / 2, sd * (run + ov / 2) / 2); put(rl, g, rc, .1); });
      if (roof === 'tin') B(L.trim, w + .62, .08, .14, 0, ridge, 0, '#8d9599', 0);
      else if (roof === 'tile') { const c = new THREE.CylinderGeometry(.09, .09, w + .64, 8); c.rotateZ(Math.PI / 2); c.translate(0, ridge + .06, 0); put(L.tile, c, rc, 0); }
      else { const c = new THREE.CylinderGeometry(.16, .16, w + 1, 8); c.rotateZ(Math.PI / 2); c.translate(0, ridge + .04, 0); put(L.thatch, c, rc, 0); }
      B(L.trim, .95, 2, .06, (r() - .5) * (w - 2), .4, d / 2 + .02, SHUTTER[Math.floor(r() * SHUTTER.length)], .1);
      const nw = Math.max(1, Math.floor((w - 1.2) / 2));
      for (let i = 0; i < nw; i++) windowAt(-w / 2 + .9 + i * 2, 1.25, d / 2, .75, .85, tinWalls ? '#9aa4a8' : paint, 'shutter');
      // Fenster auch hinten und an den Giebelseiten, hinten manchmal eine zweite Tür
      const wp = tinWalls ? '#9aa4a8' : paint;
      sideWindows(x, z, ry, Math.PI, w, d / 2, [1.25], wp, r() < .5 ? 'shutter' : 'grill', .75, .85);
      if (r() < .4) B(L.trim, .9, 1.95, .06, (r() - .5) * (w - 2.2), .4, d / 2 + .02, SHUTTER[Math.floor(r() * SHUTTER.length)], .1);
      [Math.PI / 2, -Math.PI / 2].forEach(t => { if (r() < .75) sideWindows(x, z, ry, t, d, w / 2, [1.25], wp, 'shutter', .7, .8); });
      at(x, worldHeight(x, z), z, ry);
      // Vordach auf Bambuspfosten
      if (r() < .4) {
        const g = boxGeo(w * .7, .04, 1.6); g.rotateX(.18); g.translate(0, top - .25, d / 2 + .8); put(L.tin, g, rust, .1);
        [-1, 1].forEach(sd => { const c = new THREE.CylinderGeometry(.05, .05, top - .35, 6); c.translate(sd * w * .33, (top - .35) / 2, d / 2 + 1.5); put(L.trim, c, '#b7a85e', .1); });
      }
      foot.push([x, z, ry, w, d]);
      return { x, z, ry, w, d };
    }

    // Grundstücksmauer (verputzt und gestrichen oder rohe Ziegel), mit Abdeckung
    function wallSeg(x0, z0, x1, z1, h) {
      const len = Math.hypot(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      at(cx, Math.min(worldHeight(x0, z0), worldHeight(x1, z1)), cz, -Math.atan2(z1 - z0, x1 - x0));
      const brick = r() < .4, paint = ['#2f6fb0', '#f0ece2', '#cfe3d8', '#e6d3b8', '#d9d4c8'][Math.floor(r() * 5)];
      if (brick) B(L.brick, len, h, .25, 0, 0, 0, '#ffffff', .15); else B(L.wall, len, h, .25, 0, 0, 0, paint, .2);
      B(L.trim, len + .05, .08, .32, 0, h, 0, '#9a968e', 0);
      for (let s = -len / 2; s <= len / 2 + .01; s += 2.5) B(brick ? L.brick : L.wall, .34, h + .12, .34, s, 0, 0, brick ? '#ffffff' : paint, .2);
    }

    // Betonmast mit Querträger, Isolatoren und manchmal Trafo
    function pole(x, z, ry) {
      at(x, worldHeight(x, z), z, ry);
      const g = new THREE.CylinderGeometry(.08, .13, 9, 4); g.rotateY(Math.PI / 4); g.translate(0, 4.5, 0); put(L.trim, g, '#b3b0a8', .15);
      B(L.trim, 1.8, .1, .1, 0, 8.4, 0, '#8d8a84', 0);
      [-.8, 0, .8].forEach(o => B(L.trim, .06, .14, .06, o, 8.5, 0, '#e8e2d2', 0));
      if (r() < .25) { B(L.trim, .5, .7, .45, 0, 6.4, .3, '#7d868b', .1); B(L.trim, .8, .06, .6, 0, 6.3, .25, '#6d7378', 0); }
      return [-.8, 0, .8].map(o => new THREE.Vector3(o, 8.62, 0).applyMatrix4(M));
    }

    function meshes() {
      const out = [];
      // Fassaden: Kit-Putz (gemalt, mit Flecken), getönt durch die Farbe jedes Hauses
      const kitWall = KIT && KIT.has('plaster');
      const gs = kitWall ? KIT.set('plaster', .45, .45) : TEX.grime();
      if (!kitWall) { gs.map.repeat.set(1 / 3, 1 / 3); gs.normal.repeat.set(1 / 3, 1 / 3); }
      const wallMat = new THREE.MeshStandardMaterial({ map: gs.map, normalMap: gs.normal, normalScale: new THREE.Vector2(1, 1), vertexColors: true, roughness: .95, envMapIntensity: .55, color: kitWall ? new THREE.Color(1.22, 1.2, 1.22) : new THREE.Color(1.12, 1.1, 1.06) });
      const tinMat = antiShimmer(M_.tin().clone(), 12); tinMat.vertexColors = true; tinMat.side = THREE.DoubleSide;
      const brickMat = M_.brick().clone(); brickMat.vertexColors = true;
      const tileMat = M_.tile().clone(); tileMat.vertexColors = true;
      const thatchMat = M_.thatch().clone(); thatchMat.vertexColors = true;
      const trimMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .75, envMapIntensity: .6 });
      const darkMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .25, metalness: .2, envMapIntensity: 1.2 });
      // Verwitterung über dem Putz: Regenspuren von oben, Schimmel- und Spritzwasserrand unten, abgeplatzte Stellen
      // (Kachel = 3 m = ein Stockwerk, v = 0 an der Unterkante jeder Wand)
      if (kitWall) {
        const gr = TEX.grime().map; gr.encoding = THREE.LinearEncoding;
        const k = (1 / .45 / 3).toFixed(4);
        wallMat.onBeforeCompile = sh => {
          sh.uniforms.tGrime = { value: gr };
          sh.fragmentShader = 'uniform sampler2D tGrime;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
            vec3 grm = pow(texture2D(tGrime, vUv * ${k}).rgb / vec3(0.902, 0.878, 0.824), vec3(2.2));
            float gl = dot(grm, vec3(0.333)); diffuseColor.rgb *= mix(1.0, min(gl, 1.05), 0.5);`);
        };
        wallMat.customProgramCacheKey = () => 'townGrime';
      }
      [[L.wall, wallMat], [L.tin, tinMat], [L.brick, brickMat], [L.tile, tileMat], [L.thatch, thatchMat], [L.trim, trimMat], [L.dark, darkMat]].forEach(([list, mat]) => {
        if (!list.length) return;
        const m = new THREE.Mesh(mergeGeos(list), mat); m.castShadow = m.receiveShadow = true; out.push(m);
      });
      // Bodenschatten und festgetretene Erde rund um jedes Haus, aufs Gelände gelegt
      if (foot.length) {
        const fg = mergeGeos(foot.map(([x, z, ry, w, d]) => { const c = Math.cos(ry), s = Math.sin(ry); return footprintGeo(w, d, 1.1, (lx, lz) => { const px = x + lx * c + lz * s, pz = z - lx * s + lz * c; return [px, worldHeight(px, pz) + .05, pz]; }); }));
        const fm = new THREE.Mesh(fg, decalMat(groundRectTex(), { roughness: 1, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })); fm.receiveShadow = true; fm.renderOrder = 2; out.push(fm);
      }
      return out;
    }
    return { pucca, tinHouse, wallSeg, pole, meshes };
  }

  // Belegungsraster: wo stehen Häuser, Mauern, Wege? (damit Gras und Bäume dort nicht wachsen)
  function Occupancy(size = 240, cell = .5) {
    const N = Math.round(size / cell), a = new Uint8Array(N * N), h = size / 2;
    const idx = (x, z) => { const i = Math.floor((x + h) / cell), j = Math.floor((z + h) / cell); return i < 0 || j < 0 || i >= N || j >= N ? -1 : j * N + i; };
    return {
      rect(x, z, ry, w, d, pad = 0) {
        const c = Math.cos(ry), s = Math.sin(ry), W2 = w / 2 + pad, D2 = d / 2 + pad, R = Math.hypot(W2, D2);
        for (let px = x - R; px <= x + R; px += cell * .7) for (let pz = z - R; pz <= z + R; pz += cell * .7) {
          const dx = px - x, dz = pz - z, lx = dx * c - dz * s, lz = dx * s + dz * c;
          if (Math.abs(lx) <= W2 && Math.abs(lz) <= D2) { const i = idx(px, pz); if (i >= 0) a[i] = 1; }
        }
      },
      test(x, z) { const i = idx(x, z); return i >= 0 && a[i] === 1; },
      free(x, z, ry, w, d, pad = 0) {
        const c = Math.cos(ry), s = Math.sin(ry);
        for (let u = -w / 2 - pad; u <= w / 2 + pad + .01; u += .5) for (let v = -d / 2 - pad; v <= d / 2 + pad + .01; v += .5) {
          if (this.test(x + u * c + v * s, z - u * s + v * c)) return false;
        }
        return true;
      },
    };
  }

  function buildWorld(M_, lite = false) {
    const g = new THREE.Group();
    const tick = [];
    const col = h => new THREE.Color(h);

    /* Gelände */
    const TS = 360, SEG = 220;
    const geo = new THREE.PlaneGeometry(TS, TS, SEG, SEG); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, colors = new Float32Array(p.count * 3);
    const cGrass = col('#6b763c'), cGrass2 = col('#858449'), cDry = col('#a49159'),   // Februar: olivgrün bis strohgelb
     cSand = col('#cdb993'), cMud = col('#7d6a4e'), cBank = col('#8d8459'), cDirt = col('#8f8462'), tmp = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = worldHeight(x, z);
      p.setY(i, Math.abs(z - WORLD.riverZ(x)) < BANK_TOP - .8 ? y - .45 : y);   // unter der Böschung etwas tiefer, damit nichts durchsticht
      const n = Math.sin(x * .07) * Math.cos(z * .061) * .5 + .5, n2 = Math.sin(x * .23 + z * .17) * .5 + .5;
      tmp.copy(cGrass).lerp(cGrass2, n).lerp(cDry, .15 + n2 * .45);
      const d = Math.abs(z - WORLD.riverZ(x));
      if (d < 15.5) tmp.lerp(cDirt, Math.min(1, (15.5 - d) / 2.3) * .6);
      if (y < -1) tmp.lerp(cMud, Math.min(1, (-1 - y) * 2));
      const pd = Math.hypot(x - WORLD.pond[0], z - WORLD.pond[1]);
      if (pd < WORLD.pond[2] + 1.8) tmp.lerp(cBank, .7);
      if (y < -.25 && y > -.4) tmp.lerp(cMud, .5);
      if (CHAR) {
        // Sand und Schlamm, nur in der Inselmitte etwas Gras
        const gr = Math.max(0, 1 - Math.hypot(x / 1.35, z) / 12);
        tmp.copy(col('#8c7653')).lerp(col('#a89270'), n2 * .6).lerp(col('#6f5b40'), n * .55).lerp(cGrass2, Math.min(1, gr) * n * .14);
        if (y < -.5) tmp.lerp(col('#5a4a35'), Math.min(1, (-.5 - y) * .8));
      }
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const det = WTEX.detail(); det.map.repeat.set(TS / 3.2, TS / 3.2); det.normal.repeat.copy(det.map.repeat);
    const terrainMat = new THREE.MeshStandardMaterial({ map: det.map, normalMap: det.normal, normalScale: new THREE.Vector2(.7, .7), vertexColors: true, roughness: 1, envMapIntensity: .45 });
    terrainMat.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('vec4 sampledDiffuseColor = texture2D( map, vUv );',
        'vec4 sampledDiffuseColor = mix(texture2D( map, vUv ), texture2D( map, vUv * 0.21 + vec2(0.37, 0.11) ), 0.45);');
    };
    terrainMat.customProgramCacheKey = () => 'terrain2';
    wetify(terrainMat);
    const terrain = new THREE.Mesh(geo, terrainMat); terrain.receiveShadow = true; g.add(terrain);
    const farGround = new THREE.Mesh(new THREE.RingGeometry(TS * .48, 900, 64, 1), new THREE.MeshStandardMaterial({ color: 0x8b8c5e, roughness: 1, envMapIntensity: .5 }));
    farGround.rotation.x = -Math.PI / 2; farGround.position.y = .95; g.add(farGround);

    /* Hof, Weg und Dorfstraße */
    const decal = (map, o = {}) => new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, envMapIntensity: .7, ...o });
    const yardSet = WTEX.yard(), yard = new THREE.Mesh(new THREE.PlaneGeometry(19, 15.5), wetify(decal(yardSet.map, { normalMap: yardSet.normal, normalScale: new THREE.Vector2(1.15, 1.15) })));
    yard.rotation.x = -Math.PI / 2; yard.position.set(-.3, .015, .4); yard.receiveShadow = true; yard.renderOrder = 1; if (!CHAR) g.add(yard);
    const roadTex = WTEX.road();
    const roadPts = []; for (let x = -175; x <= 175; x += 3) roadPts.push([x, WORLD.roadZ(x)]);
    const road = new THREE.Mesh(ribbon(roadPts, 4.2, .04, 4.4), wetify(decal(roadTex))); road.receiveShadow = true; road.renderOrder = 2; if (!CHAR) g.add(road);
    const pathPts = []; for (let t = 0; t <= 1.0001; t += .1) pathPts.push([-1.1 + Math.sin(t * 2.4) * .9 - t * .4, 4.6 + t * (WORLD.roadZ(-1.5) - 4.6)]);
    const path = new THREE.Mesh(ribbon(pathPts, 2.2, .05, 3), wetify(decal(WTEX.dirtPath()))); path.receiveShadow = true; path.renderOrder = 3; if (!CHAR) g.add(path);

    /* Fluss, Teich */
    const wn = WTEX.waterN();
    // Wasserfläche folgt dem Flusslauf. Eckfarben: Mitte spiegelt den grauen Himmel (heller), an den Ufern
    // spiegeln Bäume und Häuser (dunkles Grün-Braun) – wirkt wie echte Spiegelung ohne zweiten Render-Durchgang.
    const riverMat = waterMaterial(0x27312a, wn, { vertexColors: true });
    {
      const across = CHAR ? [-200, -120, -60, -20, -4, 4, 20, 60, 120, 200] : [-10, -8.6, -7.6, -6.6, -5.2, -3.4, -1.2, 1.2, 3.4, 5.2, 6.6, 7.6, 8.6, 10], pos = [], uv = [], cl = [], idx = [], c = new THREE.Color();
      const mid = col('#909b95'), edge = col('#2c3a26'), bankC = col('#5f5b46');
      let rows = 0;
      for (let x = -TS / 2; x <= TS / 2 + .01; x += 2) {
        const zc = CHAR ? 0 : WORLD.riverZ(x), houses = Math.sin(x * .13) * .5 + .5, trees = Math.sin(x * .29 + 1.7) * .5 + .5;
        across.forEach(a => {
          const k = CHAR ? 0 : Math.min(1, Math.abs(a) / 7.6);
          c.copy(CHAR ? col('#8e8a74') : mid).lerp(edge, Math.pow(k, 1.15) * (.6 + trees * .4));
          if (k > .7) c.lerp(bankC, (k - .7) * 1.6 * houses);
          pos.push(x, RIVER_Y, zc + a); uv.push(x / 9, (zc + a) / 9); cl.push(c.r, c.g, c.b);
        });
        if (rows) for (let k = 0; k < across.length - 1; k++) { const p0 = (rows - 1) * across.length + k, p1 = p0 + across.length; idx.push(p0, p0 + 1, p1, p0 + 1, p1 + 1, p1); }
        rows++;
      }
      const rg = new THREE.BufferGeometry();
      rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); rg.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
      rg.setIndex(idx); rg.computeVertexNormals();
      const river = new THREE.Mesh(rg, riverMat); river.receiveShadow = true; river.name = 'river'; g.add(river);
    }
    const wn2 = wn.clone(); wn2.needsUpdate = true; wn2.repeat.set(.6, .6);
    const pondMat = waterMaterial(0x26301f, wn2, { normalScale: new THREE.Vector2(.25, .25), refl: 0x6f7a62 });
    const pond = new THREE.Mesh(new THREE.CircleGeometry(WORLD.pond[2] + 1.1, 40), pondMat); pond.rotation.x = -Math.PI / 2; pond.position.set(WORLD.pond[0], -.42, WORLD.pond[1]); pond.receiveShadow = true; if (!CHAR) g.add(pond);
    tick.push((dt, t) => { WIND.value = t * 1.35; WIND_T.value = t; });   // böiger, unruhiger Wind vor dem Regen

    /* Wasserkante: trüber, lehmiger Saum im Wasser, Schaumlinien an der Uferlinie, nass glänzender Streifen darüber */
    {
      // v = 0 im Wasser, v = 1 auf dem Ufer; u entlang der Uferlinie (kachelt)
      const mkShore = foam => decalTex(512, 128, (g, w, h, r) => {
        const img = g.createImageData(w, h), d = img.data, f = noiseField(w, h, r, 16, 4, 4, .55);
        for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
          const v = 1 - py / h, i = py * w + px, n = f[i];
          const turbid = sstep(0, .62, v + (n - .5) * .25) * (1 - sstep(.7, .78, v)), wet = sstep(.72, .8, v) * (1 - sstep(.86, 1, v + (n - .5) * .2));
          let cr = 112, cg = 96, cb = 70, a = turbid * .62;
          if (wet > 0) { cr = 66; cg = 56; cb = 42; a = Math.max(a, wet * .55); }
          d[i * 4] = cr; d[i * 4 + 1] = cg; d[i * 4 + 2] = cb; d[i * 4 + 3] = 255 * a;
        }
        g.putImageData(img, 0, 0);
        if (!foam) return;
        // Schaumlinien: unterbrochen, verschieden dick, parallel zur Uferlinie
        [[.7, 2.6, .85], [.62, 1.6, .55], [.5, 1.1, .35]].forEach(([v, lw, a]) => {
          for (let x = 0; x < w;) {
            const len = 20 + r() * 90, y0 = (1 - v) * h;
            g.strokeStyle = `rgba(232,230,218,${a * (.6 + r() * .4)})`; g.lineWidth = lw * (.6 + r() * .8); g.lineCap = 'round';
            g.beginPath(); for (let k = 0; k <= len; k += 4) { const xx = x + k, y = y0 + Math.sin(xx * .06 + v * 9) * 3 + Math.sin(xx * .17) * 1.2; if (k) g.lineTo(xx % w, y); else g.moveTo(xx % w, y); if (xx % w < 4 && k) { g.stroke(); g.beginPath(); g.moveTo(xx % w, y); } } g.stroke();
            x += len + 8 + r() * 40;
          }
        });
        for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(236,234,224,${.25 + r() * .4})`; g.beginPath(); g.arc(r() * w, h * (.22 + r() * .25), .6 + r() * 1.4, 0, 7); g.fill(); }
      }, 97);
      const shoreTex = mkShore(true), pondTex = mkShore(false); shoreTex.wrapS = pondTex.wrapS = THREE.RepeatWrapping;
      const shoreMat = decalMat(shoreTex, { roughness: .3, envMapIntensity: .9, side: THREE.DoubleSide, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
      const pos = [], uv = [], idx = [], VS = [0, .45, .72, .86, 1];
      const strip = (pts) => {   // pts: Liste von [x, z, nx, nz, dc, yAt(off)] – je Spalte 5 Punkte quer zur Uferlinie
        const base = pos.length / 3;
        pts.forEach(([x, z, nx, nz, u, yAt]) => [-1.7, -.6, 0, .3, .75].forEach((off, k) => { const px = x + nx * off, pz = z + nz * off; pos.push(px, yAt(px, pz, off), pz); uv.push(u, VS[k]); }));
        for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < 4; k++) { const a = base + i * 5 + k, b = a + 5; idx.push(a, b, a + 1, a + 1, b, b + 1); }
      };
      const bankY = (px, pz, off) => off <= 0 ? RIVER_Y + .014 : Math.max(RIVER_Y + .016, worldHeight(px, pz) + .085);
      [1, -1].forEach(s => {
        const pts = [];
        for (let x = -180; x <= 180.01; x += 1) {
          const rz = WORLD.riverZ(x); let dc = 9;
          for (let dd = 5.5; dd < 11; dd += .05) if (worldHeight(x, rz + s * dd) + .07 >= RIVER_Y) { dc = dd; break; }
          pts.push([x, rz + s * dc, 0, s, x / 7, bankY]);
        }
        strip(pts);
      });
      const riverGeo = (() => { const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); sg.setIndex(idx.slice()); sg.computeVertexNormals(); return sg; })();
      pos.length = 0; uv.length = 0; idx.length = 0;
      // Teich: Ring an der Uferlinie (stilles Wasser: nur trüber und nasser Rand, kein Schaum)
      { const [px0, pz0, pr] = WORLD.pond, pts = [];
        for (let i = 0; i <= 72; i++) { const a = i / 72 * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), R = pr + .99; pts.push([px0 + c * R, pz0 + sn * R, c, sn, i / 72 * 5, (x, z, off) => off <= 0 ? -.405 : Math.max(-.4, worldHeight(x, z) + .03)]); }
        strip(pts); }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      sg.setIndex(idx); sg.computeVertexNormals();
      const shore = new THREE.Mesh(riverGeo, shoreMat); shore.receiveShadow = true; shore.renderOrder = 2; shore.userData.flut = true; g.add(shore);
      const pondShore = new THREE.Mesh(sg, decalMat(pondTex, { roughness: .3, envMapIntensity: .9, side: THREE.DoubleSide, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })); pondShore.receiveShadow = true; pondShore.renderOrder = 2; pondShore.userData.flut = true; g.add(pondShore);   // flut = flaches Dekor, kein Wellenhindernis (sonst: quadratische „Insel“ im Teich)
      tick.push((dt, t) => { shoreTex.offset.set(t * .004, Math.sin(t * .8) * .012); });
    }

    /* Uferböschung: raue Erde mit Steinen und Moos, unten feucht und dunkler, oben Übergang ins Gras */
    {
      const ds = [4.5, 5.5, 6.2, 6.8, 7.3, 7.8, 8.3, 8.8, 9.3, 9.8, 10.3, 10.9, 11.3, 11.7, 12.1, 12.5, 12.9, 13.3, 13.7, 14.2];
      const pos = [], uv = [], cl = [], idx = [], c = new THREE.Color(), wet = col('#5a5242'), moss = col('#76844a'), dry = col('#b8a88c'), top = col('#8e9a5a');
      let base = 0;
      [1, -1].forEach(s => {
        const cols = ds.length;
        let rows = 0;
        for (let x = -180; x <= 180.01; x += .6) {
          const rz = WORLD.riverZ(x), edgeJag = .45 * Math.sin(x * .9 + s) + .3 * Math.sin(x * 2.3 + 1) + .2 * Math.sin(x * 5.1);
          ds.forEach(d => {
            const z = rz + s * d, y = worldHeight(x, z);
            pos.push(x, y + .07, z); uv.push(x / 4.5, d / 4.5 * s);
            const n = Math.sin(x * .37 + d) * .5 + .5, n2 = Math.sin(x * .11 - d * .7) * .5 + .5, wl = 7.25 + .25 * Math.sin(x * .7);
            c.copy(dry);
            if (d < wl + .9) c.lerp(wet, Math.min(1, (wl + .9 - d) / .9) * .9);    // nasser Streifen über der Wasserlinie
            if (d > wl && d < 9.8) c.lerp(moss, .45 * n);
            if (d > 10.9 && d < 12.8) c.lerp(moss, .22 * n2);
            if (d > 12.4) c.lerp(top, Math.min(1, (d - 12.4) / 1.3));
            const a = 1 - sstep(12.6 + edgeJag, 14.1 + edgeJag, d);                 // Rand oben ausgefranst, Gras überlappt
            cl.push(c.r, c.g, c.b, a);
          });
          if (rows) for (let k = 0; k < cols - 1; k++) {
            const a = base + (rows - 1) * cols + k, b = a + cols;
            if (s > 0) idx.push(a, a + 1, b, a + 1, b + 1, b); else idx.push(a, b, a + 1, a + 1, b, b + 1);
          }
          rows++;
        }
        base += rows * cols;
      });
      const bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      bg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      bg.setAttribute('color', new THREE.Float32BufferAttribute(cl, 4));
      bg.setIndex(idx); bg.computeVertexNormals();
      const bs = WTEX.bank();
      const bankMat = new THREE.MeshStandardMaterial({ map: bs.map, normalMap: bs.normal, normalScale: new THREE.Vector2(1.3, 1.3), vertexColors: true, alphaTest: .5, roughness: .97, envMapIntensity: .5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const bank = new THREE.Mesh(bg, bankMat); bank.receiveShadow = true; g.add(bank);
    }

    /* Reisfelder mit Dämmen */
    const paddyMats = [0, 1, 2].map(k => new THREE.MeshStandardMaterial({ map: WTEX.paddy(k), roughness: k === 0 ? .45 : .95, envMapIntensity: k === 0 ? .7 : .45, color: k === 2 ? 0xe8dca0 : 0xffffff }));
    const paddyGeos = [[], [], []], dikes = [];
    WORLD.paddies.forEach(([x0, x1, z0, z1, k]) => {
      const w = x1 - x0, d = z1 - z0, pg = new THREE.PlaneGeometry(w, d); pg.rotateX(-Math.PI / 2);
      const uv = pg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 2.4, uv.getY(i) * d / 2.4);
      paddyGeos[k].push(place(pg, (x0 + x1) / 2, -.16, (z0 + z1) / 2));
      [[x0, x1, z0 - .2], [x0, x1, z1 + .2]].forEach(([a, b, z]) => dikes.push(place(boxGeo(b - a + .8, .3, .45), (a + b) / 2, -.12, z)));
      [[x0 - .2], [x1 + .2]].forEach(([x]) => dikes.push(place(boxGeo(.45, .3, d), x, -.12, (z0 + z1) / 2)));
    });
    paddyGeos.forEach((list, k) => { if (list.length) { const m = new THREE.Mesh(mergeGeos(list), paddyMats[k]); m.receiveShadow = true; g.add(m); } });
    const dikeMesh = new THREE.Mesh(mergeGeos(dikes), M_.grass()); dikeMesh.receiveShadow = true; g.add(dikeMesh);
    // Reispflanzen als Büschel auf den nahen Feldern
    {
      const blades = []; for (let i = 0; i < 5; i++) { const b = new THREE.PlaneGeometry(.05, .5, 1, 2); b.translate(0, .25, 0); const bp = b.attributes.position; for (let k = 0; k < bp.count; k++) bp.setZ(k, bp.getY(k) * bp.getY(k) * .5); place(b, 0, 0, 0, 0, i * 1.26, 0); blades.push(b); }
      const tuft = mergeGeos(blades); tuft.computeVertexNormals();
      const near = WORLD.paddies.filter(([x0, x1, z0, z1, k]) => k > 0 && Math.hypot((x0 + x1) / 2, (z0 + z1) / 2) < 42);
      let total = 0; near.forEach(([x0, x1, z0, z1]) => { total += Math.floor((x1 - x0) / .5) * Math.floor((z1 - z0) / .5); });
      const im = new THREE.InstancedMesh(tuft, addWind(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .95, side: THREE.DoubleSide, envMapIntensity: .3 }), .1, .5), total);
      const d = new THREE.Object3D(), c = new THREE.Color(), r = rng(91); let n = 0;
      near.forEach(([x0, x1, z0, z1, k]) => {
        for (let x = x0 + .25; x < x1 - .1; x += .5) for (let z = z0 + .25; z < z1 - .1; z += .5) {
          if (n >= total) break;
          d.position.set(x + (r() - .5) * .08, -.16, z + (r() - .5) * .08); d.rotation.set(0, r() * 6, 0); const s = .7 + r() * .5; d.scale.set(s, s * (k === 2 ? 1.2 : 1), s); d.updateMatrix(); im.setMatrixAt(n, d.matrix);
          if (k === 2) c.setHSL(.14 + r() * .03, .55, .36 + r() * .06); else c.setHSL(.25 + r() * .04, .55, .22 + r() * .08);
          im.setColorAt(n, c); n++;
        }
      });
      im.count = n; g.add(im);
    }

    /* Bäume und Pflanzen (instanziert). Vorn rechts (Kamera-Seite) nichts Hohes. */
    const frondTex = WTEX.frond(), bananaTex = WTEX.banana(), trunkSet = WTEX.trunk(), barkSet = WTEX.bark(), leafSet = WTEX.leaves();
    frondTex.anisotropy = 8;
    const frondMat = addWind(new THREE.MeshStandardMaterial({ map: frondTex, alphaTest: .45, side: THREE.DoubleSide, roughness: .75, vertexColors: true, envMapIntensity: .75 }), .55, 7, .04, true, .07);
    const bananaMat = addWind(new THREE.MeshStandardMaterial({ map: bananaTex, alphaTest: .45, side: THREE.DoubleSide, roughness: .7, vertexColors: true, envMapIntensity: .7 }), .12, 2.4, .05, true, .07);
    const cardTex = leafCardTexture(51, [[98, 46, 36], [106, 42, 40], [88, 50, 42], [114, 38, 32]]);
    const bushTex = leafCardTexture(52, [[94, 50, 40], [102, 46, 44], [84, 52, 46], [76, 48, 42]]);
    const cardMat = addWind(new THREE.MeshStandardMaterial({ map: cardTex, alphaTest: .5, side: THREE.DoubleSide, roughness: .8, vertexColors: true, envMapIntensity: .55 }), .24, 7, .035, true);
    const coreMat = addWind(new THREE.MeshStandardMaterial({ map: leafCardTexture(53, [[98, 46, 34], [106, 42, 38]], true), roughness: .95, vertexColors: true, envMapIntensity: .4 }), .22, 7);
    const bushCardMat = addWind(new THREE.MeshStandardMaterial({ map: bushTex, alphaTest: .5, side: THREE.DoubleSide, roughness: .8, vertexColors: true, envMapIntensity: .55 }), .09, 1.1, .04, true);
    const bushCoreMat = addWind(new THREE.MeshStandardMaterial({ map: leafCardTexture(54, [[94, 50, 38], [102, 46, 42]], true), roughness: .95, vertexColors: true, envMapIntensity: .4 }), .08, 1.1);
    const trunkMat = addWind(new THREE.MeshStandardMaterial({ map: trunkSet.map, normalMap: trunkSet.normal, roughness: .95, envMapIntensity: .6 }), .55, 7);   // Stamm biegt sich mit der Krone
    const kb = KIT && KIT.has('bark') ? KIT.set('bark', 1, 1) : barkSet;
    const barkMat = addWind(new THREE.MeshStandardMaterial({ map: kb.map, normalMap: kb.normal, roughness: .95, vertexColors: true, envMapIntensity: .6 }), .22, 7);
    const leafMat = new THREE.MeshStandardMaterial({ map: leafSet.map, normalMap: leafSet.normal, normalScale: new THREE.Vector2(.8, .8), roughness: .9, vertexColors: true, envMapIntensity: .6 });
    const bambooMat = M_.bamboo();
    leafSet.map.repeat.set(1.5, 1.5); leafSet.normal.repeat.set(1.5, 1.5);

    // Instanzen: [x, z, scale, rotY]
    const instanced = (geoList, mats, spots, shadow = true, target = null) => {
      geoList.forEach((gg, k) => {
        const im = new THREE.InstancedMesh(gg, mats[k], spots.length), d = new THREE.Object3D();
        spots.forEach(([x, z, s, ry], i) => { d.position.set(x, worldHeight(x, z) - .05, z); d.rotation.set(0, ry, 0); d.scale.setScalar(s); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
        im.castShadow = shadow; im.receiveShadow = true; (target || g).add(im);
      });
    };
    const r = rng(123);
    // Sichtachse unten rechts (Startbild unten: nur Wiese und Himmel) und der Kamerabereich vorn bleiben frei.
    const freeView = (x, z) => {
      const tx = x - 74, tz = z - 14, t = tx * .58 + tz * .81, perp = Math.abs(tx * .81 - tz * .58);
      if (t > -4 && t < 85 && perp < 7 + t * .22) return true;     // nur die Mitte vor dem Button bleibt frei
      const a = Math.atan2(x, z), R = Math.hypot(x, z);
      return R < 62 && a > -.35 && a < 1.05;
    };
    /* Stadt: Häuserzeilen oben an beiden Ufern, an der Straße und an einer Gasse rechts vom Grundstück */
    const occ = Occupancy();
    const corridor = (x, z) => { const tx = x - 74, tz = z - 14, t = tx * .58 + tz * .81, perp = Math.abs(tx * .81 - tz * .58); return t > -4 && t < 85 && perp < 7 + t * .22; };
    const frontNear = (x, z) => { const a = Math.atan2(x, z), R = Math.hypot(x, z); return R < 36 && a > -.35 && a < 1.05; };
    const neighbors = [
      [-16.5, -6, .25, 'mud', 'thatch', 'earth'],
      [-28, -1.5, 1.35, 'tin', 'tinhip', 'earth'],
      [-27, 9.6, 2.2, 'brickwall', 'tilegable', 'brick'],
      [-19, 23, Math.PI, 'mud', 'tilegable', 'earth'],
      [-34, 23.5, Math.PI + .2, 'mud', 'tinhip', 'earth'],
      [-39, -5, 1.7, 'ferro', 'concreteflat', 'concrete'],
      [-6, 23, Math.PI - .1, 'mud', 'thatch', 'earth'],
      [-48, 3, 1.4, 'tin', 'thatch', 'earth'],
      [-50, 15, 2.0, 'mud', 'thatch', 'earth'],
      [-45, -11, .9, 'brickwall', 'tinhip', 'brick'],
      [-14, 34, Math.PI + .3, 'brickwall', 'concreteflat', 'brick'],
      [-30, 34, Math.PI - .2, 'brickwall', 'tilegable', 'brick'],
    ];
    const BRIDGE_X = -38;
    {
      occ.rect(-.3, .8, 0, 21, 16.2);                                          // unser Grundstück mit Hof (hinten bis zum Zaun)
      occ.rect(-1.6, 10.5, 0, 3, 11);                                          // Weg zur Straße
      for (let x = -120; x <= 120; x += 1) occ.rect(x, WORLD.roadZ(x), 0, 1.4, 4.6);
      occ.rect(WORLD.pond[0], WORLD.pond[1], 0, WORLD.pond[2] * 2 + 4, WORLD.pond[2] * 2 + 4);
      neighbors.forEach(([x, z, ry]) => occ.rect(x, z, ry, 6.5, 5, .8));
      [1, -1].forEach(s => { const z = WORLD.riverZ(BRIDGE_X) + s * (BANK_TOP + 4); occ.rect(BRIDGE_X, z, 0, 7, 9); });
      [[150, 100], [136, 118], [162, 116], [126, 104], [170, 96]].forEach(([x, z]) => occ.rect(x, z, 0, 7, 7));
    }
    const kit = TownKit(M_, rng(2024));
    const poleLines = [];
    // Häuserzeile entlang einer Linie. side +1: Häuser liegen auf der +z-Seite der Linie (Front nach −z), −1 umgekehrt.
    const row = (x0, x1, lineZ, side, { tall = .5, minFloors = 1, maxFloors = 3, ok = () => true } = {}) => {
      let x = x0;
      while (x < x1) {
        const wallGap = r() < .12;
        const isPucca = r() < tall, w = wallGap ? 2.5 + r() * 3 : isPucca ? 5 + r() * 4 : 4.4 + r() * 2.6;
        const d = isPucca ? 7 + r() * 3 : 4.2 + r() * 1.4;
        const xc = x + w / 2, slope = (lineZ(xc + 1) - lineZ(xc - 1)) / 2, th = -Math.atan(slope);
        const ry = (side > 0 ? Math.PI : 0) + th;
        const back = side * (wallGap ? .3 : d / 2), zc = lineZ(xc) + back;
        if (!ok(xc, zc) || corridor(xc, zc) || frontNear(xc, zc)) { x += 1.5; continue; }
        if (!occ.free(xc, zc, ry, w, wallGap ? .4 : d, .1)) {
          // passt nicht: kleines Blechhaus versuchen, sonst ein Stück weiter
          const sw = 4.4, sd = 4, sx = x + sw / 2, sz = lineZ(sx) + side * sd / 2;
          if (!wallGap && !corridor(sx, sz) && !frontNear(sx, sz) && occ.free(sx, sz, ry, sw, sd, .1)) { kit.tinHouse(sx, sz, ry, sw, sd); occ.rect(sx, sz, ry, sw, sd, .15); x += sw + .2; }
          else x += 1.5;
          continue;
        }
        if (wallGap) kit.wallSeg(x, lineZ(x) + side * .3, x + w, lineZ(x + w) + side * .3, 1.7 + r() * .5);
        else if (isPucca) {
          const mf = Math.hypot(xc, zc) < 26 ? Math.min(maxFloors, 2) : maxFloors, nf = Math.min(mf, minFloors + Math.floor(Math.pow(r(), .8) * (maxFloors - minFloors + 1)));
          kit.pucca(xc, zc, ry, w, d, Math.max(1, nf));     // nah am Grundstück höchstens 2 Stockwerke, sonst verdecken sie das Haus
        }
        else kit.tinHouse(xc, zc, ry, w, d);
        occ.rect(xc, zc, ry, w, wallGap ? .4 : d, .15);
        x += w + (r() < .6 ? .05 : .3 + r() * 1.4);
      }
    };
    const riverLine = off => x => WORLD.riverZ(x) + off;
    const notBridge = x => Math.abs(x - BRIDGE_X) > 4;
    // unser Ufer (direkt hinter dem Haus bleibt eine schmale Lücke mit Palmen, durch die man den Fluss sieht)
    row(-100, 100, riverLine(BANK_TOP + .4), 1, { tall: .45, maxFloors: 3, ok: (x) => notBridge(x) && (x < -4.5 || x > 5.5) });
    // gegenüberliegendes Ufer: zwei Reihen, hinten höher
    row(-115, 115, riverLine(-BANK_TOP - .4), -1, { tall: .65, minFloors: 1, maxFloors: 4, ok: notBridge });
    row(-115, 115, riverLine(-BANK_TOP - 13), -1, { tall: .8, minFloors: 2, maxFloors: 5 });
    row(-115, 115, riverLine(-BANK_TOP - 26), -1, { tall: .7, minFloors: 1, maxFloors: 4 });
    // an der Dorfstraße auf beiden Seiten
    row(-110, 110, x => WORLD.roadZ(x) - 2.7, -1, { tall: .45, maxFloors: 3 });
    row(-110, 110, x => WORLD.roadZ(x) + 2.7, 1, { tall: .5, maxFloors: 3 });
    // Gasse rechts vom Grundstück und eine zweite Reihe hinter der Straße
    row(13, 72, () => -1.4, -1, { tall: .5, maxFloors: 3 });
    row(13, 72, () => 1.4, 1, { tall: .4, maxFloors: 2 });
    row(-110, 110, x => WORLD.roadZ(x) + 16, 1, { tall: .5, maxFloors: 3 });
    // Strommasten an der Straße und an beiden Uferkanten
    const poleRow = (x0, x1, step, lineZ, ry) => {
      const line = [];
      for (let x = x0; x <= x1; x += step) {
        const z = lineZ(x);
        if (corridor(x, z) || frontNear(x, z) || occ.test(x, z)) { if (line.length > 1) poleLines.push(line.splice(0)); else line.length = 0; continue; }
        line.push(kit.pole(x, z, ry));
      }
      if (line.length > 1) poleLines.push(line);
    };
    poleRow(-100, 100, 27, x => WORLD.roadZ(x) - 2.15, 0);
    poleRow(-96, -10, 24, riverLine(BANK_TOP - .25), 0); poleRow(12, 96, 24, riverLine(BANK_TOP - .25), 0);   // nicht direkt hinter dem Haus
    poleRow(-110, 110, 24, riverLine(-BANK_TOP + .25), 0);
    kit.meshes().forEach(m => g.add(m));
    // festgetretene, kahle Erde vor den Häusern, an Mauern und in Flecken (dort wächst kein Gras, Boden wird erdig)
    const worn = (x, z) => {
      let k = Math.max(0, Math.sin(x * .17 + 2) * Math.cos(z * .21 - 1) + Math.sin(x * .41 - z * .33) * .5 - .95);   // nur wenige Flecken
      if (occ.test(x + .9, z) || occ.test(x - .9, z) || occ.test(x, z + .9) || occ.test(x, z - .9)) k += .55;
      else if (occ.test(x + 1.8, z) || occ.test(x - 1.8, z) || occ.test(x, z + 1.8) || occ.test(x, z - 1.8)) k += .15;
      if (Math.abs(x + .3) < 10.6 && z > -7.4 && z < 16.5) k = 0;                       // eigenes Grundstück regelt der Hof
      return Math.min(1, k);
    };
    {
      const p = geo.attributes.position, cAttr = geo.attributes.color, dirt = col('#8a7458'), tmp2 = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i); if (Math.abs(x) > 120 || Math.abs(z) > 120) continue;
        const k = worn(x, z); if (!k) continue;
        tmp2.fromBufferAttribute(cAttr, i).lerp(dirt, k * .85); cAttr.setXYZ(i, tmp2.r, tmp2.g, tmp2.b);
      }
      cAttr.needsUpdate = true;
    }
    // Leitungen mit Durchhang
    {
      const pts = [];
      poleLines.forEach(line => { for (let i = 0; i < line.length - 1; i++) for (let k = 0; k < 3; k++) {
        const a = line[i][k], b = line[i + 1][k], n = 10;
        for (let s = 0; s < n; s++) {
          const t0 = s / n, t1 = (s + 1) / n, sag = t => Math.sin(t * Math.PI) * .55;
          pts.push(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0 - sag(t0), a.z + (b.z - a.z) * t0, a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1 - sag(t1), a.z + (b.z - a.z) * t1);
        }
      } });
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x2a2a2a, transparent: true, opacity: .75 })));
    }
    // Fahrrad-Rikschas an der Straße (bunt bemaltes Verdeck, drei Räder)
    {
      const parts = [], wheelGeo = new THREE.TorusGeometry(.33, .025, 6, 18), rq = rng(515);
      const rick = (x, z, ry) => {
        at3(x, z, ry);
        const hood = ['#c8342b', '#2f7d4f', '#e0a020', '#2d62a8'][Math.floor(rq() * 4)];
        addP(boxGeo(.9, .12, .7), .62, 0, 0, '#2a2a2e');                      // Sitzbank
        addP(boxGeo(.9, .45, .08), .9, 0, -.33, hood);                       // Rückenlehne
        const hg = new THREE.CylinderGeometry(.55, .55, 1.0, 12, 1, true, -Math.PI / 2, Math.PI); hg.rotateZ(Math.PI / 2); hg.rotateY(Math.PI / 2); addP(hg, 1.25, 0, -.05, hood);  // Verdeck
        addP(boxGeo(.08, .06, 1.4), .45, 0, .7, '#3a3a3a');                     // Rahmen nach vorn
        addP(boxGeo(.3, .06, .25), .95, 0, 1.2, '#6b4a2a');                     // Fahrersattel
        [[-.45, .33, .25], [.45, .33, .25], [0, .33, 1.6]].forEach(([wx, wy, wz]) => { const w = wheelGeo.clone(); w.rotateY(Math.PI / 2); addP(w, wy, wx, wz - .25, '#222222'); });
      };
      let M3 = new THREE.Matrix4();
      const at3 = (x, z, ry) => { M3 = new THREE.Matrix4().compose(new THREE.Vector3(x, worldHeight(x, z) + .02, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(1, 1, 1)); };
      const addP = (geo, y, x, z, color) => { geo.translate(x, y, z); tint(geo, color, .15); geo.applyMatrix4(M3); parts.push(geo); };
      [[-26, .4], [24, -.3], [38, .2], [-48, -.5], [56, .6]].forEach(([x, off]) => { const z = WORLD.roadZ(x) + off; if (!frontNear(x, z) && !corridor(x, z)) rick(x, z, Math.PI / 2 + (rq() - .5) * .3 + (rq() < .5 ? Math.PI : 0)); });
      if (parts.length) { const rm = new THREE.Mesh(mergeGeos(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6, metalness: .2, side: THREE.DoubleSide, envMapIntensity: .7 })); rm.castShadow = rm.receiveShadow = true; g.add(rm); }
    }
    // rote Stahlbogenbrücke: Betondeck mit Asphalt und Bordsteinen, zwei Bögen aus Kastenträgern mit Hängern und
    // Querriegeln, Geländer, Laternen, gemauerte Widerlager in den Böschungen und Rampen hinunter zur Straße
    {
      const bz = WORLD.riverZ(BRIDGE_X), half = BANK_TOP + 1.2, deckY = .55, rise = 5.2, len = half * 2;
      const red = new THREE.MeshStandardMaterial({ color: 0xa8382c, roughness: .55, metalness: .35, envMapIntensity: .8 });
      const redDark = new THREE.MeshStandardMaterial({ color: 0x7e2a22, roughness: .6, metalness: .3, envMapIntensity: .7 });
      const asphalt = new THREE.MeshStandardMaterial({ color: 0x55534f, roughness: .92, envMapIntensity: .5 });
      const bg = new THREE.Group(); bg.position.set(BRIDGE_X, 0, bz);
      const top = deckY + .2;
      bg.add(mesh(boxGeo(3.4, .4, len), M_.concrete(), 0, deckY, 0));                    // Deckplatte
      bg.add(mesh(boxGeo(2.7, .03, len - .1), asphalt, 0, top + .015, 0));               // Fahrbahn
      for (let z = -half + 2; z < half - 1; z += 2.4) bg.add(mesh(boxGeo(.1, .005, 1.1), M_.string(), 0, top + .033, z));   // Mittelstreifen gestrichelt
      [-1, 1].forEach(s => bg.add(mesh(boxGeo(.32, .2, len), M_.concrete(), s * 1.54, top + .1, 0)));   // Bordsteine
      [-1, 1].forEach(s => bg.add(mesh(boxGeo(.28, .5, len - 1), M_.concrete(), s * 1.05, deckY - .45, 0)));   // Längsträger unten
      const arch = s => { const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector3(s * 1.5, top + .15 + rise * (1 - Math.pow(2 * t - 1, 2)), -half + 1.2 + t * (len - 2.4))); } return new THREE.CatmullRomCurve3(pts); };
      const archTop = t => top + .15 + rise * (1 - Math.pow(2 * t - 1, 2)), zAt = t => -half + 1.2 + t * (len - 2.4);
      [-1, 1].forEach(s => {
        const a = mesh(new THREE.TubeGeometry(arch(s), 48, .2, 6), red); a.scale.x = 1; bg.add(a);
        const a2 = mesh(new THREE.TubeGeometry(arch(s), 48, .09, 6), redDark); a2.position.y = -.26; bg.add(a2);   // Untergurt
        for (let i = 1; i < 16; i++) { const t = i / 16; bg.add(beam([s * 1.5, top + .3, zAt(t)], [s * 1.5, archTop(t) - .2, zAt(t)], .028, red)); }
        // Geländer: Pfosten, Handlauf, Mittellauf
        for (let z = -half + .3; z <= half - .3; z += 1.2) bg.add(mesh(boxGeo(.06, .95, .06), redDark, s * 1.62, top + .67, z));
        bg.add(beam([s * 1.62, top + 1.12, -half + .3], [s * 1.62, top + 1.12, half - .3], .035, red));
        bg.add(beam([s * 1.62, top + .66, -half + .3], [s * 1.62, top + .66, half - .3], .022, redDark));
        // Betonsockel an den Bogenenden
        [-1, 1].forEach(e => bg.add(mesh(boxGeo(.7, .9, .9), M_.concrete(), s * 1.5, top + .25, e * (half - 1.1))));
      });
      for (let i = 2; i < 15; i += 2) { const t = i / 16, y = archTop(t); bg.add(beam([-1.5, y, zAt(t)], [1.5, y, zAt(t)], .055, red)); if (i < 14) { const t2 = (i + 2) / 16; bg.add(beam([-1.5, y, zAt(t)], [1.5, archTop(t2), zAt(t2)], .025, redDark)); } }
      // Laternen auf dem Geländer
      [[-1, -.45], [1, .45]].forEach(([s, k]) => { const z = half * k; bg.add(beam([s * 1.62, top + .3, z], [s * 1.62, top + 3.4, z], .045, M_.metal())); bg.add(beam([s * 1.62, top + 3.4, z], [s * 1.2, top + 3.55, z], .03, M_.metal())); bg.add(mesh(new THREE.SphereGeometry(.12, 10, 8), M_.bulb(), s * 1.15, top + 3.45, z)); });
      // Widerlager aus Naturstein in den Böschungen, Flügelmauern seitlich
      [-1, 1].forEach(e => {
        bg.add(mesh(boxGeo(4.4, 3.4, 2.4), M_.stone(), 0, deckY - 1.85, e * (half - 1.1)));
        bg.add(mesh(boxGeo(4.8, .25, 2.6), M_.concrete(), 0, deckY - .2, e * (half - 1.1)));
        [-1, 1].forEach(s => { const wm = mesh(boxGeo(.45, 2.6, 3.2), M_.stone(), s * 2.3, deckY - 1.6, e * (half - 2.6)); wm.rotation.y = s * e * .35; bg.add(wm); });
        // Rampe hinunter zum Weg (oben bündig mit der Fahrbahn), Bordsteine daneben
        const z0 = e * half, z1 = e * (half + 4.5), gy = worldHeight(BRIDGE_X, bz + z1) + .02;
        bg.add(slab([[-1.7, top + .03, z0], [1.7, top + .03, z0], [1.7, gy, z1], [-1.7, gy, z1]], 1.1, M_.concrete()));
        bg.add(slab([[-1.35, top + .045, z0], [1.35, top + .045, z0], [1.35, gy + .015, z1], [-1.35, gy + .015, z1]], .02, asphalt));
      });
      g.add(bg);
    }

    const scatter = (n, rMin, rMax, fn) => { const out = []; let guard = 0; while (out.length < n && guard++ < n * 40) { const a = r() * Math.PI * 2, R = rMin + r() * (rMax - rMin), x = Math.sin(a) * R, z = Math.cos(a) * R; if (!freeView(x, z) && fn(x, z)) out.push([x, z, .8 + r() * .45, r() * 6]); } return out; };
    const dry = (x, z) => !occ.test(x, z) && Math.abs(z - WORLD.riverZ(x)) > BANK_TOP + .3 && worldHeight(x, z) > -.2 && Math.hypot(x - WORLD.pond[0], z - WORLD.pond[1]) > WORLD.pond[2] + 2 && Math.abs(z - WORLD.roadZ(x)) > 3.5 && !(Math.abs(x) < 9 && Math.abs(z) < 8.5);
    const palmsA = [[-4, -11.8], [3.5, -11.5], [9.5, -10.4], [15, -12], [-10.5, -12.4], [-17, -11.4], [-23, -12.8], [-31, -10.6], [-36, -12.4], [21, -12.2], [-20, 3], [-31, 5], [-19.5, 11], [-11, 11.5], [-24, -4.5], [-14.5, -15.5], [-42, 4], [-9, -14.6]].map(([x, z]) => [x, z, .85 + r() * .3, r() * 6]).filter(([x, z]) => !occ.test(x, z) && Math.abs(z - WORLD.riverZ(x)) > BANK_TOP + .2);
    const farBank = []; for (let x = -170; x < 170; x += 4.5) { const z = WORLD.riverZ(x) - 18 - r() * 22; if (!freeView(x, z) && !occ.test(x, z)) farBank.push([x + r() * 3, z, .8 + r() * .5, r() * 6]); }
    // viele Bäume direkt an beiden Uferkanten, in den Lücken zwischen den Häusern
    const bankTrees = [], bankPalms = [];
    [1, -1].forEach(s => { for (let x = -150; x < 150; x += 2.2 + r() * 2) { const z = WORLD.riverZ(x) + s * (BANK_TOP + .5 + r() * 2.5); if (freeView(x, z) || occ.test(x, z) || Math.abs(x - BRIDGE_X) < 4) continue; (r() < .45 ? bankPalms : bankTrees).push([x, z, .8 + r() * .5, r() * 6]); } });
    const palmsB = scatter(90, 25, 150, dry).concat(bankPalms, [[-46, -13, 1, 1], [26, -13.8, .9, 2], [33, -12.7, 1, 3], [-3, -16.5, 1.05, 4]].filter(([x, z]) => !occ.test(x, z) && Math.abs(z - WORLD.riverZ(x)) > BANK_TOP + .2));
    // drei Palmenformen: hoch und schräg, sehr hoch und fast gerade, jung und kurz mit großer Krone
    const pA = palmGeos(6.6, .9, 19, 5), pB = palmGeos(8.2, -.45, 20, 6), pC = palmGeos(4.4, .55, 18, 9);
    const allPalms = palmsA.concat(palmsB);
    [pA, pB, pC].forEach((pg, k) => instanced(pg, [trunkMat, frondMat], allPalms.filter((_, i) => i % 3 === k)));
    const mango = [[-25, -8, 1.1, 1], [-9, -18, 1, 2], [16, -17, .9, 3], [-36, 13, 1.2, 4], [-42, -6, 1.1, 5], [-28, 23, 1, 6], [-50, 18, 1.2, 1], [-12, 25.5, .9, 2]].filter(([x, z]) => !occ.test(x, z) && Math.abs(z - WORLD.riverZ(x)) > BANK_TOP + .2);
    const farTrees = scatter(380, 22, 170, dry).concat(farBank, bankTrees);
    // Bis die Baum-Modelle geladen sind (oder falls das Laden scheitert), stehen einfache Bäume und Büsche da.
    const fallback = new THREE.Group(); g.add(fallback);
    const bl1 = broadleafGeos(11, 1.05), bl2 = broadleafGeos(12, .85), bl3 = broadleafGeos(13, 1.2);
    instanced(bl1, [barkMat, cardMat, coreMat], mango.filter((_, i) => i % 2 === 0).concat(farTrees.filter((_, i) => i % 3 === 0)), true, fallback);
    instanced(bl2, [barkMat, cardMat, coreMat], mango.filter((_, i) => i % 2).concat(farTrees.filter((_, i) => i % 3 === 1)), true, fallback);
    instanced(bl3, [barkMat, cardMat, coreMat], farTrees.filter((_, i) => i % 3 === 2), true, fallback);
    instanced(bananaGeos(14), [addWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8 }), .12, 2.4), bananaMat], [[8.6, -7.9, 1, 1], [10.9, -9.6, .9, 3], [-9.5, -9, 1, 2], [-10, 7, .95, 4], [-21, -1, 1, 5], [-28, 15, 1, 2], [12.5, -7.6, .8, 2]].filter(([x, z]) => !occ.test(x, z) && Math.abs(z - WORLD.riverZ(x)) > BANK_TOP + .2));
    instanced(bambooGeos(15), [bambooMat, coreMat], [[-46, 9, 1.1, 3], [-52, -9, 1, 1]]);
    const bushG = bushGeos(61), bushG2 = bushGeos(62);
    const bushes = [[-8.8, -4.5], [-8.6, -1], [8.8, -5], [8.6, -2.2], [-6.5, -7.6], [5, -7.8], [-12, 3.5], [-18.5, 8.5], [-12.5, 9.2], [-20, -6], [-14, -9.5], [12, -9], [-26, 4], [-32, -6], [-22, 14], [6.5, -9.3], [-3, -9.6]].map(([x, z]) => [x, z, .7 + r() * .5, r() * 6]).filter(([x, z]) => !occ.test(x, z) && Math.abs(z - WORLD.riverZ(x)) > BANK_TOP + .2).concat(scatter(110, 14, 90, dry));
    [[bushG, 0], [bushG2, 1]].forEach(([geos, k]) => {
      const list = bushes.filter((_, i) => i % 2 === k), dd = new THREE.Object3D(), bc = new THREE.Color();
      geos.forEach((gg, j) => {
        const bm = new THREE.InstancedMesh(gg, j === 0 ? bushCardMat : bushCoreMat, list.length);
        list.forEach(([x, z, s, ry], i) => { dd.position.set(x, worldHeight(x, z) - .05, z); dd.rotation.set(0, ry, 0); dd.scale.setScalar(s * 1.15); dd.updateMatrix(); bm.setMatrixAt(i, dd.matrix); const v = .8 + ((i * 53) % 10) * .02; bc.setRGB(v * (.92 + ((i * 37) % 10) * .01), v, v * .88); bm.setColorAt(i, bc); });
        bm.castShadow = j === 0; bm.receiveShadow = true; fallback.add(bm);
      });
    });
    // Schilf am Teich
    {
      const reed = new THREE.ConeGeometry(.03, 1.1, 3); reed.translate(0, .55, 0);
      const n = 260, im = new THREE.InstancedMesh(reed, addWind(M_.blade().clone(), .16, 1.1), n), d = new THREE.Object3D(), c = new THREE.Color(), rr = rng(5);
      for (let i = 0; i < n; i++) { const a = rr() * 6.28, R = WORLD.pond[2] + .6 + rr() * 1.2, x = WORLD.pond[0] + Math.cos(a) * R, z = WORLD.pond[1] + Math.sin(a) * R; d.position.set(x, worldHeight(x, z), z); d.rotation.set((rr() - .5) * .4, 0, (rr() - .5) * .4); d.scale.set(1, .6 + rr() * .7, 1); d.updateMatrix(); im.setMatrixAt(i, d.matrix); if (rr() < .55) c.setHSL(.11 + rr() * .03, .32, .42 + rr() * .1); else c.setHSL(.17 + rr() * .04, .28, .3 + rr() * .08); im.setColorAt(i, c); }   // Schilf im Winter: halb strohig
      g.add(im);
    }

    /* 3D-Gras rund ums Grundstück: Büschel, die sich im Wind wiegen (nicht auf Hof, Wegen, Feldern und am Wasser) */
    {
      const free = (x, z) => {
        const ym = yardMask(x, z);                                                                        // Hof: Gras kriecht am Rand hinein
        if (ym > .3 && (ym > .85 || hash2(x, z) > (.85 - ym) * 1.25)) return false;
        if (Math.abs(z - WORLD.roadZ(x)) < 2.3) return false;                                              // Dorfstraße
        if (z > 3.5 && z < WORLD.roadZ(x) && Math.abs(x + 1.5 + (z - 4) * .02) < 1.4) return false;       // Weg zur Tür
        if (Math.abs(z - WORLD.riverZ(x)) < BANK_TOP + .2) return false;                                   // Uferböschung
        if (Math.hypot(x - WORLD.pond[0], z - WORLD.pond[1]) < WORLD.pond[2] + 1.4) return false;         // Teich
        for (const [x0, x1, z0, z1] of WORLD.paddies) if (x > x0 - .7 && x < x1 + .7 && z > z0 - .7 && z < z1 + .7) return false;
        if (worn(x, z) > .4 + ((x * 7.13 + z * 3.7) % 1 + 1) % 1 * .5) return false;                  // kahle, festgetretene Stellen (Rand ausgefranst)
        if (occ.test(x, z) && !(Math.abs(x + .3) < 10.6 && z > -7.4 && z < 16.5)) return false;            // Häuser, Mauern (Grundstück und Weg regeln Hof- und Wegmaske)
        return true;
      };
      // dicht am Haus, nach außen lockerer, dafür größere Büschel (wirkt überall gleich dicht)
      const pts = [], rr = rng(808), R = lite ? 55 : 85, grow = lite ? .1 : .08, STEP = lite ? .26 : .2;
      for (let x = -R; x <= R; x += STEP) for (let z = -R; z <= R; z += STEP) {
        const d = Math.hypot(x, z); if (d > R) continue;
        const sp = d < 24 ? 1 : 1 + (d - 24) * grow;             // Abstand relativ
        if (rr() > 1 / (sp * sp)) continue;
        const px = x + (rr() - .5) * STEP * 1.3 * sp, pz = z + (rr() - .5) * STEP * 1.3 * sp;
        if (!free(px, pz)) continue;
        const dens = .8 + .2 * Math.sin(px * .31 + 1.2) * Math.cos(pz * .27);
        if (rr() > dens + .2) continue;
        pts.push([px, pz, Math.min(2.6, Math.sqrt(sp))]);
      }
      // nah: feine Büschel mit vielen Halmen, weiter weg: weniger Halme, dafür breiter (spart Dreiecke)
      const geos = [grassTuftGeo(1, 24), grassTuftGeo(2, 20, .15, .3, .26, .65), grassTuftGeo(5, 15, .16, .3, .34, .5, true)];
      const gmat = addWind(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .9, envMapIntensity: .4 }), .12, .22, 0, true);
      geos.forEach((gg, k) => {
        const list = pts.filter((p, i) => k === 2 ? p[2] > 1.01 : p[2] <= 1.01 && i % 2 === k), im = new THREE.InstancedMesh(gg, gmat, list.length), d = new THREE.Object3D(), c = new THREE.Color();
        list.forEach(([x, z, big], i) => {
          // kurz gemähte/abgegraste Stellen wechseln mit höherem Gras; Farbe von saftig-dunkel bis leicht trocken
          const patch = Math.sin(x * .19 + 1) * Math.cos(z * .23 - .5) * .5 + .5, sc = (.6 + rr() * .45) * (.7 + patch * .55) * big;
          d.position.set(x, worldHeight(x, z) - .02, z); d.rotation.set(0, rr() * 6.28, 0); d.scale.set(sc, sc * (.75 + rr() * .5), sc); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
          // großflächig mal etwas grüner (feuchte Senken), mal ausgeblichen-strohig
          const v = .74 + rr() * .18, dryK = Math.sin(x * .05 - z * .04) * .5 + Math.sin(x * .13 + z * .09) * .3;
          c.setRGB(v * (1 + dryK * .1), v * (1 + dryK * .03), v * (.97 - dryK * .1)); im.setColorAt(i, c);
        });
        im.receiveShadow = true; g.add(im);
      });
    }

    /* Wildgras-Horste: hohe, buschige Büschel an Zäunen, Wegrändern, Baumfüßen und in Gruppen auf der Wiese */
    {
      const ok = (x, z) => {
        if (yardMask(x, z) > .25) return false;
        if (Math.abs(z - WORLD.roadZ(x)) < 2.6) return false;
        if (z > 3.5 && z < WORLD.roadZ(x) && Math.abs(x + 1.5 + (z - 4) * .02) < 1.7) return false;
        if (Math.abs(z - WORLD.riverZ(x)) < BANK_TOP + .3) return false;
        if (Math.hypot(x - WORLD.pond[0], z - WORLD.pond[1]) < WORLD.pond[2] + 1.2) return false;
        for (const [x0, x1, z0, z1] of WORLD.paddies) if (x > x0 - .5 && x < x1 + .5 && z > z0 - .5 && z < z1 + .5) return false;
        if (occ.test(x, z) || worn(x, z) > .5) return false;
        return !(x > 2 && x < 26 && z > 6 && z < 13.5);              // vorn rechts (Kamera-Seite) frei lassen
      };
      const cr = rng(4711), spots = [];
      const add = (x, z, s) => { if (ok(x, z)) spots.push([x, z, s, cr() * 6.28]); };
      // am Zaun entlang (außen und innen dicht), an den Ecken mehr
      for (let x = -8.4; x <= 8.4; x += .55) { add(x + (cr() - .5) * .3, -7.15 - cr() * .5, .7 + cr() * .45); if (cr() < .5) add(x, -6.45 - cr() * .2, .5 + cr() * .3); }
      for (let z = -6.6; z <= 4.4; z += .6) { add(-8.95 - cr() * .5, z + (cr() - .5) * .3, .7 + cr() * .45); if (z < 2.6) add(8.95 + cr() * .5, z, .7 + cr() * .45); }
      // Gruppen auf der Wiese (Rauschmuster), nach außen hin größer
      const R = lite ? 45 : 70, N = lite ? 900 : 2200;
      for (let i = 0; i < N * 4 && spots.length < N; i++) {
        const a = cr() * 6.28, d = 8 + Math.sqrt(cr()) * R, x = Math.cos(a) * d, z = Math.sin(a) * d;
        const patch = Math.sin(x * .21 + 1.7) * Math.cos(z * .17 - .3) + Math.sin(x * .07 - z * .11) * .6;
        if (patch < .35 + cr() * .5) continue;
        add(x, z, (.65 + cr() * .55) * (1 + Math.max(0, d - 25) * .01));
      }
      // um Baumfüße und Bananen
      [[-25, -8], [-9, -18], [16, -17], [-36, 13], [-42, -6], [-28, 23], [-12, 25.5], [8.6, -7.9], [10.5, -9.4], [12.5, -7.6], [-9.5, -9], [-10, 7], [-21, -1]]
        .forEach(([x, z]) => { for (let k = 0; k < 7; k++) { const a = cr() * 6.28, rr2 = .8 + cr() * 1.6; add(x + Math.cos(a) * rr2, z + Math.sin(a) * rr2, .6 + cr() * .5); } });
      const cg = [grassClumpGeo(21, lite ? 26 : 38), grassClumpGeo(22, lite ? 22 : 32, .65)];
      const cmat = addWind(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .9, envMapIntensity: .45 }), .2, .7, .015, true);
      cg.forEach((gg, k) => {
        const list = spots.filter((_, i) => i % 2 === k), im = new THREE.InstancedMesh(gg, cmat, list.length), d = new THREE.Object3D(), c = new THREE.Color();
        list.forEach(([x, z, sc, ry], i) => {
          d.position.set(x, worldHeight(x, z) - .03, z); d.rotation.set((cr() - .5) * .12, ry, (cr() - .5) * .12); d.scale.set(sc * (.9 + cr() * .3), sc * (.85 + cr() * .35), sc * (.9 + cr() * .3)); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
          const v = .74 + cr() * .2; c.setRGB(v, v * (.97 + cr() * .05), v * (.92 + cr() * .06)); im.setColorAt(i, c);
        });
        im.castShadow = !lite; im.receiveShadow = true; g.add(im);
      });
    }

    /* Nachbarhäuser aus denselben Bauteilen wie unser Haus (Liste steht oben bei der Stadt) */
    // ein kleiner Weiler, den man unten auf dem Startbild in der Ferne sieht
    [[150, 100, 3.9, 'tin', 'tinhip'], [136, 118, 4.3, 'mud', 'thatch'], [162, 116, 3.6, 'brickwall', 'tilegable'], [126, 104, 4.1, 'tin', 'tinhip'], [170, 96, 4.4, 'mud', 'tinhip']]
      .forEach(([x, z, ry, wall, roof]) => neighbors.push([x, z, ry, wall, roof, wall === 'brickwall' ? 'brick' : 'earth']));
    const nbGround = decalMat(groundRectTex(), { roughness: 1, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    neighbors.forEach(([x, z, ry, wall, roof, found]) => {
      const hg = new THREE.Group(); hg.position.set(x, worldHeight(x, z), z); hg.rotation.y = ry; hg.scale.setScalar(.82);
      const f = buildFoundation(found, M_); hg.add(f.group);
      const house = new THREE.Group(); house.position.y = f.lift; house.add(buildWalls(wall, gableRiseOf(roof), M_)); house.add(buildRoof(roof, M_).group); hg.add(house);
      const fpw = found === 'earth' ? 1.5 : .6, fp = new THREE.Mesh(footprintGeo(W + fpw, D + fpw, 1.3), nbGround); fp.position.y = .03; fp.renderOrder = 2; fp.receiveShadow = true; hg.add(fp);
      g.add(hg);
    });

    /* Zaun, Heuhaufen, Holzstapel, Tontöpfe, Boote und Dorf-Deko */
    {
      const poles = [], rails = [];
      const fence = (x0, z0, x1, z1) => {
        const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len / 1.1);
        for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; poles.push(place(new THREE.CylinderGeometry(.035, .04, 1.1, 6), x, worldHeight(x, z) + .5, z)); }
        [.4, .85].forEach(h => { const b = new THREE.CylinderGeometry(.025, .025, len, 5); const uv = b.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setY(k, uv.getY(k) * len); rails.push(place(b, (x0 + x1) / 2, h, (z0 + z1) / 2, 0, -Math.atan2(z1 - z0, x1 - x0), Math.PI / 2)); });
      };
      fence(-8.6, -6.8, 8.6, -6.8); fence(-8.6, -6.8, -8.6, 4.6); fence(8.6, -6.8, 8.6, 2.8);
      const fm = new THREE.Mesh(mergeGeos(poles.concat(rails)), bambooMat); fm.castShadow = fm.receiveShadow = true; g.add(fm);
      const th = M_.thatch();
      const hay = (x, z, s) => {
        const hg = new THREE.Group(); hg.position.set(x, worldHeight(x, z), z); hg.scale.setScalar(s);
        hg.add(mesh(new THREE.CylinderGeometry(.95, 1.05, .7, 16), th, 0, .35, 0));
        const dome = mesh(new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), th, 0, .7, 0); dome.scale.set(1, 1.5, 1); hg.add(dome);
        hg.add(mesh(new THREE.CylinderGeometry(.04, .04, 2.9, 6), M_.woodDark(), 0, 1.45, 0));
        g.add(hg);
      };
      hay(6.8, -8.8, .9); hay(-22, 6, 1); hay(-33, 15, .9);
      const wp = new THREE.Group(); wp.position.set(-6.6, 0, -5.4); wp.rotation.y = .3;
      for (let i = 0; i < 12; i++) { const lg = mesh(new THREE.CylinderGeometry(.08, .08, 1.2, 8), M_.wood(), ((i % 5) - 2) * .17 + (Math.floor(i / 5) % 2) * .08, .09 + Math.floor(i / 5) * .15, 0); lg.rotation.x = Math.PI / 2; wp.add(lg); }
      g.add(wp);
      { const pots = potGroup(M_); pots.position.set(-6.0, worldHeight(-6.0, 2.3), 2.3); pots.rotation.y = .4; g.add(pots); }
      const ripple = decalTex(256, 128, (gg, w, h) => { for (let k = 0; k < 3; k++) { gg.strokeStyle = `rgba(214,216,208,${.2 - k * .05})`; gg.lineWidth = 5 - k; gg.beginPath(); gg.ellipse(w / 2, h / 2, w * (.3 + k * .07), h * (.28 + k * .08), 0, 0, 7); gg.stroke(); } const rg = gg.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); rg.addColorStop(.45, 'rgba(60,54,40,.22)'); rg.addColorStop(.6, 'rgba(60,54,40,0)'); gg.fillStyle = rg; gg.fillRect(0, 0, w, h); }, 5);
      const rippleMat = decalMat(ripple, { roughness: .3, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
      const boats = [[-8, 1, 6.5, 1.4, 0, 0x2f6fb0], [16, -1, 7.2, 1.6, 1, 0xb5402f], [42, 1, 5.5, 1.2, 0, 0x3f8a5a]].map(([x, side, len, wid, roof, paint], i) => {
        const z = WORLD.riverZ(x) + side * 4, bg = makeBoat(M_, len, wid, roof, paint, 30 + i);
        bg.rotation.y = side * .08; bg.position.set(x, RIVER_Y + .05, z); g.add(bg);
        const rp = new THREE.Mesh(new THREE.PlaneGeometry(len * 1.25, wid * 2.4), rippleMat); rp.rotation.x = -Math.PI / 2; rp.rotation.z = side * .08; rp.position.set(x, RIVER_Y + .012, z); rp.renderOrder = 3; g.add(rp);
        return { bg, x, side, ph: x };
      });
      tick.push((dt, t) => boats.forEach(b => { b.bg.position.y = RIVER_Y + .03 + Math.sin(t * 1.3 + b.ph) * .03; b.bg.rotation.z = Math.sin(t * .9 + b.ph) * .025; b.bg.rotation.x = Math.sin(t * 1.1 + b.ph) * .02; }));
    }

    /* Dorf-Deko, wie man sie in Bangladesch sieht */
    {
      const at = (o, x, z, ry = 0) => { o.position.set(x, worldHeight(x, z), z); o.rotation.y = ry; o.traverse(m => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } }); g.add(o); return o; };
      const blue = new THREE.MeshStandardMaterial({ color: 0x2f6fb0, roughness: .45, envMapIntensity: .7 });
      const green = new THREE.MeshStandardMaterial({ color: 0x3f7a4a, roughness: .5, metalness: .3, envMapIntensity: .7 });
      // blaue Wasserfässer aus Kunststoff, ein Eimer daneben
      const barrel = () => drumGroup(M_);
      at(drumGroup(M_, '#2f6fb0', 1), 5.75, 2.95); at(drumGroup(M_, '#2a63a2'), 6.35, 2.25, 1); at(bucketGroup(M_), 6.15, 3.45, .3); at(drumGroup(M_, '#3a7f58'), -13.6, -3.4, .4);
      // Handpumpe (Tube Well) auf kleiner Betonplatte
      const pump = new THREE.Group();
      pump.add(mesh(new THREE.CylinderGeometry(.62, .66, .1, 20), M_.concrete(), 0, .05, 0));
      pump.add(mesh(new THREE.CylinderGeometry(.06, .07, .85, 12), green, 0, .5, 0));
      pump.add(mesh(new THREE.CylinderGeometry(.1, .09, .32, 12), green, 0, 1.02, 0));
      const spout = mesh(new THREE.CylinderGeometry(.035, .035, .32, 8), green, .17, .95, 0); spout.rotation.z = Math.PI / 2.4; pump.add(spout);
      const handle = mesh(new THREE.CylinderGeometry(.022, .022, .7, 8), green, -.3, 1.25, 0); handle.rotation.z = -Math.PI / 2.6; pump.add(handle);
      pump.add(mesh(new THREE.CylinderGeometry(.16, .14, .22, 14), M_.terracotta(), .3, .21, 0));
      at(pump, -6.6, -2.6, .5);
      // Gestell mit trocknender Jute (goldene Fasern)
      const jute = new THREE.Group(), juteMat = new THREE.MeshStandardMaterial({ color: 0xcfb071, roughness: 1, envMapIntensity: .6 });
      [-1.6, 0, 1.6].forEach(x => jute.add(mesh(new THREE.CylinderGeometry(.04, .045, 2.1, 6), M_.bamboo(), x, 1.05, 0)));
      const bar = mesh(new THREE.CylinderGeometry(.035, .035, 3.5, 6), M_.bamboo(), 0, 1.95, 0); bar.rotation.z = Math.PI / 2; jute.add(bar);
      for (let i = 0; i < 14; i++) { const x = -1.5 + i * .23, h = 1.2 + (i % 3) * .12; const f = mesh(new THREE.CylinderGeometry(.07, .02, h, 6), juteMat, x, 1.95 - h / 2, (i % 2 - .5) * .05); jute.add(f); }
      at(jute, 14.5, -4.5, .2);
      // Wäscheleine: Lungi, Gamchha, Hemd, Sari, Kinderkleid
      at(laundryLine(M_), -12.2, -2.8, -.35);
      // Fischernetz am Ufer, auf Bambus aufgespannt
      const netTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.strokeStyle = 'rgba(70,60,45,.9)'; x.lineWidth = 2; for (let i = 0; i <= 128; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 3); return t; })();
      const net = new THREE.Group();
      [-1.5, 1.5].forEach(x => net.add(mesh(new THREE.CylinderGeometry(.04, .045, 2.2, 6), M_.bamboo(), x, 1.1, 0)));
      const netM = mesh(new THREE.PlaneGeometry(3, 1.6, 6, 4), new THREE.MeshStandardMaterial({ map: netTex, transparent: true, alphaTest: .3, side: THREE.DoubleSide, roughness: 1 }), 0, 1.2, 0);
      const np = netM.geometry.attributes.position; for (let i = 0; i < np.count; i++) np.setZ(i, Math.sin((np.getX(i) / 3 + .5) * Math.PI) * .12 * (1 - (np.getY(i) / 1.6 + .5)));
      net.add(netM);
      at(net, 5.5, WORLD.riverZ(5.5) + 12.3, .1);
      at(barrel(), 7.5, WORLD.riverZ(7.5) + 12.8, 0).scale.setScalar(.85);
    }

    /* 3D-Gras auch dort, wo unten (iPad) die Kamera auf den Boden schaut */
    {
      const [gx, gz] = GROUND_SPOT, pts = [], rr = rng(909), R = 13;
      for (let x = -R; x <= R; x += .25) for (let z = -R; z <= R; z += .25) {
        if (x * x + z * z > R * R) continue;
        const px = gx + x + (rr() - .5) * .25, pz = gz + z + (rr() - .5) * .25;
        if (Math.abs(pz - WORLD.roadZ(px)) < 2.3) continue;
        if (rr() > .78) continue;
        pts.push([px, pz]);
      }
      // Wiese vor der unteren Startkamera (74, 14) in Blickrichtung, nach hinten lockerer
      for (let t = 18; t < 70; t += .32 + (t - 18) * .012) {
        const half = 4 + t * .42, step = .3 + (t - 18) * .014;
        for (let sd = -half; sd <= half; sd += step) {
          const jt = (rr() - .5) * step * 1.6, js = (rr() - .5) * step * 1.6, x = 74 + .58 * (t + jt) - .81 * (sd + js), z = 14 + .81 * (t + jt) + .58 * (sd + js);
          if (Math.hypot(x - gx, z - gz) < R || Math.abs(z - WORLD.roadZ(x)) < 2.3) continue;
          if (rr() > .7) continue;
          pts.push([x, z]);
        }
      }
      const geos = [grassTuftGeo(3, 22), grassTuftGeo(4, 20)];
      const gmat = addWind(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .85, envMapIntensity: .4 }), .1, .2, 0, true);
      geos.forEach((gg, k) => {
        const list = pts.filter((_, i) => i % 2 === k), im = new THREE.InstancedMesh(gg, gmat, list.length), d = new THREE.Object3D(), c = new THREE.Color();
        list.forEach(([x, z], i) => { const sc = .85 + rr() * .6; d.position.set(x, worldHeight(x, z) - .02, z); d.rotation.set(0, rr() * 6.28, 0); d.scale.set(sc, sc * (.8 + rr() * .5), sc); d.updateMatrix(); im.setMatrixAt(i, d.matrix); const n = Math.sin(x * .07) * Math.cos(z * .061) * .5 + .5; c.setRGB(.88 + n * .14, .92 + n * .1, .86 + n * .1); im.setColorAt(i, c); });
        im.receiveShadow = true; g.add(im);
      });
    }

    /* Modelle (Quaternius, CC0) einsetzen, sobald sie geladen sind */
    function addModels(gltf) {
      const byName = {};
      gltf.scenes.forEach(sc => sc.traverse(o => { if (o.name && !byName[o.name] && o.parent === sc) byName[o.name] = o; }));
      gltf.scenes.forEach(sc => { if (sc.children[0] && !byName[sc.children[0].name]) byName[sc.children[0].name] = sc.children[0]; });
      const tintLeaf = new THREE.Color(.86, .84, .6);    // Februar: staubiges, oliviges Laub
      const tintGrass = new THREE.Color(1.0, .9, .6);    // Kit-Gras: ausgeblichen, strohig
      const matCache = {};
      // grünes Laub für alle Kronen (das Paket hat für Büsche und knorrige Bäume Herbstlaub)
      let greenLeaves = null;
      gltf.scenes.forEach(sc => sc.traverse(o => { if (o.isMesh && o.material.name === 'Leaves_NormalTree') greenLeaves = o.material.map; }));
      // Laub- und Grastexturen des Kits sind frühlingsgrün; für den Februar etwas entsättigt und ins Olive/Gelbliche
      // geschoben (einmal pro Textur, Alpha bleibt).
      const dried = {};
      const dryMap = (tex, grass) => {
        if (!tex || !tex.image) return tex;
        const key = tex.uuid + (grass ? 'g' : 'l'); if (dried[key]) return dried[key];
        try {
          const im = tex.image, w = im.width, h = im.height, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          const cx = cv.getContext('2d'); cx.drawImage(im, 0, 0); const id = cx.getImageData(0, 0, w, h), d = id.data;
          const des = grass ? .5 : .32, warm = grass ? .12 : .06;
          for (let i = 0; i < d.length; i += 4) {
            const R = d[i], G = d[i + 1], B = d[i + 2], l = .3 * R + .59 * G + .11 * B;
            d[i] = Math.min(255, R + (l - R) * des + l * warm); d[i + 1] = G + (l - G) * des + l * warm * .35; d[i + 2] = B + (l - B) * des - l * warm * .3;
          }
          cx.putImageData(id, 0, 0);
          const t = tex.clone(); t.image = cv; t.needsUpdate = true;
          return (dried[key] = t);
        } catch (e) { return (dried[key] = tex); }
      };
      const styled = (m, wind) => {
        const key = m.uuid + '|' + (wind ? wind.join(',') : '');
        if (matCache[key]) return matCache[key];
        const c = m.clone();
        c.envMapIntensity = .6;
        const leafy = /Leaves|Grass|Flowers/i.test(m.name);
        if (/Leaves_TwistedTree/i.test(m.name) && greenLeaves) c.map = greenLeaves;
        if (leafy) c.map = dryMap(c.map, /Grass/i.test(m.name));
        if (leafy) {
          c.color.multiply(/Grass/i.test(m.name) ? tintGrass : tintLeaf); c.alphaTest = .22; c.transparent = false;
          // etwas Licht scheint durchs Laub, damit die Kronen im trüben Gewitterlicht nicht zu schwarzen Klumpen werden
          c.envMapIntensity = 1.0; c.emissive = new THREE.Color(0x2b2c1c); c.emissiveMap = c.map; c.emissiveIntensity = 1;
        }
        if (wind) addWind(c, wind[0], wind[1], wind[2] || 0, leafy);
        return (matCache[key] = c);
      };
      const parts = name => {
        const root = byName[name]; if (!root) return [];
        root.updateMatrixWorld(true);
        const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), out = [];
        root.traverse(o => { if (o.isMesh) out.push({ geo: o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)), mat: o.material }); });
        return out;
      };
      // spots: [x, z, scale, rotY]; names: Liste, wird reihum verteilt
      const put = (names, spots, { wind = null, shadow = true, y = 0, leafWind = null } = {}) => {
        names.forEach((name, k) => {
          const list = spots.filter((_, i) => i % names.length === k);
          if (!list.length) return;
          parts(name).forEach(({ geo, mat }) => {
            const leafy = /Leaves|Grass|Flowers/i.test(mat.name);
            // Kronen von Bäumen und Büschen: Normalen zeigen vom Kronenmittelpunkt nach außen (runde, weiche
            // Schattierung wie eine Wolke aus Laub, statt dass jede Blattkarte für sich hell oder dunkel wird)
            if (/Leaves/i.test(mat.name) && /Tree|Bush/.test(name)) {
              geo.computeBoundingBox(); const ctr = geo.boundingBox.getCenter(new THREE.Vector3()), sz = geo.boundingBox.getSize(new THREE.Vector3());
              const P = geo.attributes.position, N = geo.attributes.normal, v = new THREE.Vector3(), n = new THREE.Vector3();
              for (let i = 0; i < P.count; i++) {
                v.set((P.getX(i) - ctr.x) / sz.x, (P.getY(i) - ctr.y + sz.y * .15) / sz.y, (P.getZ(i) - ctr.z) / sz.z).normalize();
                n.set(N.getX(i), N.getY(i), N.getZ(i)); if (n.dot(v) < 0) n.negate();
                n.lerp(v, .8).normalize(); N.setXYZ(i, n.x, n.y, n.z);
              }
              N.needsUpdate = true;
            }
            const trunkWind = !leafy && leafWind && /Tree|Bush/.test(name) ? [leafWind[0], leafWind[1], 0] : wind;   // Stamm biegt sich mit der Krone
            const im = new THREE.InstancedMesh(geo, styled(mat, leafy ? (leafWind || wind) : trunkWind), list.length), d = new THREE.Object3D();
            list.forEach(([x, z, s, ry], i) => { d.position.set(x, worldHeight(x, z) + y, z); d.rotation.set(0, ry, 0); d.scale.setScalar(s); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
            im.castShadow = shadow; im.receiveShadow = !(leafy && /Tree|Bush/.test(name)); g.add(im);
          });
        });
      };
      if (!byName.CommonTree_1) return false;
      g.remove(fallback);
      const rr = rng(4242);
      // Bäume: nah größer, fern gemischt
      put(['CommonTree_1', 'CommonTree_2', 'CommonTree_3', 'CommonTree_4', 'CommonTree_5'],
        mango.map(([x, z, s, ry]) => [x, z, s * 1.15, ry]).concat(farTrees.map(([x, z, s, ry]) => [x, z, s * 1.25, ry])), { leafWind: [.22, 8, .035] });
      put(['TwistedTree_1', 'TwistedTree_3'], [[-33, -14, .55, 2.2], [-55, 9, .6, .5], [40, -50, .7, 1.4], [-20, -52, .65, 3.1]], { leafWind: [.26, 15, .035] });
      // Büsche
      put(['Bush_Common', 'Bush_Common_Flowers', 'Bush_Common'], bushes.map(([x, z, s, ry]) => [x, z, s * .95, ry]), { leafWind: [.08, 1.4, .03] });
      // Farne, Pflanzen, Blumen an Zäunen, Häusern und Baumfüßen
      const nearFence = [];
      for (let x = -8; x <= 8; x += 1.3) nearFence.push([x + (rr() - .5) * .6, -7.3 - rr() * .5, .35 + rr() * .25, rr() * 6]);
      for (let z = -6; z <= 4; z += 1.4) { nearFence.push([-9.1 - rr() * .5, z, .35 + rr() * .25, rr() * 6]); if (z < 2.5) nearFence.push([9.1 + rr() * .5, z, .35 + rr() * .25, rr() * 6]); }
      put(['Fern_1', 'Plant_1', 'Plant_1_Big', 'Plant_7', 'Clover_1'], nearFence.map(([x, z, s, ry], i) => [x, z, i % 5 === 2 ? s * .55 : s, ry]), { leafWind: [.07, 1.2, .03] });
      const flowers = [[-8.2, 5.6], [-7.6, 6.4], [7.9, 4.6], [-17.5, -2.4], [-25.5, 2.2], [-24.5, 12.6], [-4.5, 21], [-21, 21.2]].map(([x, z]) => [x, z, .32 + rr() * .1, rr() * 6]);
      put(['Flower_3_Group', 'Flower_4_Group'], flowers, { leafWind: [.04, 2.2, .02] });
      // hohe Grasbüschel an Rändern (Teich, Ufer, Zaun, Bäume)
      const tufts = [];
      for (let i = 0; i < 90; i++) { const a = rr() * 6.28, R = WORLD.pond[2] + 1.6 + rr() * 1.6; tufts.push([WORLD.pond[0] + Math.cos(a) * R, WORLD.pond[1] + Math.sin(a) * R, .22 + rr() * .2, rr() * 6]); }
      for (let x = -60; x < 60; x += 1.6) { const z = WORLD.riverZ(x) + 14 + rr() * 2.5; if (!freeView(x, z)) tufts.push([x + rr(), z, .22 + rr() * .22, rr() * 6]); }
      mango.forEach(([x, z]) => { for (let k = 0; k < 6; k++) { const a = rr() * 6.28, R = 1 + rr() * 1.8; tufts.push([x + Math.cos(a) * R, z + Math.sin(a) * R, .2 + rr() * .2, rr() * 6]); } });
      // unten (iPad): Vordergrund der Startansicht und Rasen beim Blick nach unten
      const camX = 74, camZ = 14, fx = .58, fz = .81;
      for (let i = 0; i < 160; i++) {
        const t = 20 + rr() * 45, side = (rr() < .5 ? -1 : 1) * (rr() * (4 + t * .4));
        const x = camX + fx * t - fz * side, z = camZ + fz * t + fx * side;
        if (Math.abs(z - WORLD.roadZ(x)) < 2.5) continue;
        tufts.push([x, z, .25 + rr() * .25, rr() * 6]);
      }
      for (let i = 0; i < 40; i++) { const a = rr() * 6.28, R = 2 + rr() * 10; tufts.push([GROUND_SPOT[0] + Math.cos(a) * R, GROUND_SPOT[1] + Math.sin(a) * R, .2 + rr() * .15, rr() * 6]); }
      [1, -1].forEach(sd => { for (let x = -110; x < 110; x += .9 + rr() * 1.5) { const z = WORLD.riverZ(x) + sd * (8.6 + rr() * 4.4); if (!freeView(x, z)) tufts.push([x, z, .2 + rr() * .25, rr() * 6]); } });
      put(['Grass_Common_Short', 'Grass_Wispy_Short', 'Grass_Common_Tall'], tufts, { leafWind: [.09, 1.3, .03], shadow: false });
      const meadowFlowers = [];
      for (let i = 0; i < 46; i++) {
        const t = 20 + rr() * 40, side = (rr() < .5 ? -1 : 1) * (2 + rr() * (4 + t * .38));
        const x = camX + fx * t - fz * side, z = camZ + fz * t + fx * side;
        if (Math.abs(z - WORLD.roadZ(x)) < 2.5) continue;
        meadowFlowers.push([x, z, .28 + rr() * .14, rr() * 6]);
      }
      for (let i = 0; i < 14; i++) { const a = rr() * 6.28, R = 3 + rr() * 9; meadowFlowers.push([GROUND_SPOT[0] + Math.cos(a) * R, GROUND_SPOT[1] + Math.sin(a) * R, .22 + rr() * .1, rr() * 6]); }
      put(['Flower_3_Group', 'Flower_4_Group', 'Clover_1', 'Plant_7'], meadowFlowers, { leafWind: [.04, 2.2, .02], shadow: false });
      const hamletTrees = [[142, 108], [156, 124], [130, 114], [168, 106], [176, 120], [120, 96], [148, 92], [182, 100], [124, 126]].map(([x, z]) => [x, z, 1.1 + rr() * .4, rr() * 6]);
      put(['CommonTree_2', 'CommonTree_4', 'CommonTree_1'], hamletTrees, { leafWind: [.22, 8, .035] });
      // Steine am Ufer und am Teich, Kiesel am Weg
      const rocks = [];
      // Steine an beiden Böschungen: unten an der Wasserlinie mehr, auf der Berme vereinzelt
      // an den Böschungen tief eingesunken (am Hang würde sonst eine Seite in der Luft hängen)
      const bankRocks = [];
      [1, -1].forEach(sd => {
        for (let x = -110; x < 110; x += 1.4 + rr() * 2.6) { const z = WORLD.riverZ(x) + sd * (6.9 + rr() * 1.2); bankRocks.push([x, z, .25 + rr() * .4, rr() * 6]); }
        for (let x = -110; x < 110; x += 4 + rr() * 6) { const z = WORLD.riverZ(x) + sd * (9.9 + rr() * .8); bankRocks.push([x, z, .18 + rr() * .25, rr() * 6]); }
      });
      put(['Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3'], bankRocks, { y: -.42 });
      for (let i = 0; i < 6; i++) { const a = i * 1.05 + rr() * .3, R = WORLD.pond[2] + 1.2; rocks.push([WORLD.pond[0] + Math.cos(a) * R, WORLD.pond[1] + Math.sin(a) * R, .18 + rr() * .15, rr() * 6]); }
      put(['Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3'], rocks, { y: -.15 });
      const pebbles = [];
      for (let t = 0; t < 1; t += .045) { const z = 4.8 + t * 9.5, x = -1.1 + Math.sin(t * 2.4) * .9 - t * .4; [-1, 1].forEach(sg => { if (rr() < .3) pebbles.push([x + sg * (1.0 + rr() * .35), z + (rr() - .5) * .4, .45 + rr() * .35, rr() * 6]); }); }
      put(['Pebble_Round_1', 'Pebble_Round_2', 'Pebble_Square_1', 'Pebble_Square_2'], pebbles, { shadow: false });
      // Kisten, Ochsenkarren (ohne Tiere), Ziegelstapel fürs Bauen
      put(['Prop_Crate'], [[6.4, -4.6, .55, .3], [5.8, -5.3, .45, 1.1], [-15.2, -2.4, .5, .6], [-26.5, 4.5, .55, .2]]);
      put(['Prop_Wagon'], [[-12.5, 18.4, .85, 1.45], [-36, 6, .8, 2.6]]);
      put(['Prop_Brick1', 'Prop_Brick2'], [[6.8, -2.9, 1, .2], [7.3, -3.8, 1, 1.4], [-20.5, 26.5, 1, .5]]);
      chunkInstanced(g);
      return true;
    }

    chunkInstanced(g);
    return { group: g, tick: (dt, t) => tick.forEach(f => f(dt, t)), addModels };
  }

  /* ---------- Bau-Animation: welches Material fliegt bei welcher Auswahl ---------- */
  // Wird auch unten (flug.js) benutzt, damit oben und unten dieselben Materialien fliegen.
  const PARTS = {
    earth: ['clod', 'clod', 'clod', 'sod'],
    concrete: ['sack', 'cement', 'cement', 'block', 'rebar'],
    brick: ['brick', 'brick', 'brick', 'cement', 'sack'],
    stilts: ['bamboo', 'bamboo', 'plank', 'block'],
    mud: ['mudclod', 'mudclod', 'mudclod', 'straw'],
    tin: ['sheet', 'sheet', 'plank'],
    brickwall: ['brick', 'brick', 'brick', 'cement', 'plaster'],
    ferro: ['cement', 'cement', 'rebar', 'sack'],
    tinhip: ['sheet', 'sheet', 'sheet', 'plank'],
    concreteflat: ['cement', 'block', 'rebar', 'sack'],
    tilegable: ['tile', 'tile', 'tile', 'plank'],
    thatch: ['straw', 'straw', 'straw', 'bamboo'],
    platform: ['clod', 'clod', 'clod', 'sod'],
    well: ['block', 'pipe', 'sheet', 'cement'],
    vetiver: ['tuft', 'tuft', 'tuft', 'clod'],
    frame: ['plank', 'plank', 'block'],
  };

  function pieceFactory(M_) {
    const geos = {};
    const G = (k, f) => (geos[k] = geos[k] || f());
    const roundBox = (w, h, d, round) => { const g = new THREE.BoxGeometry(w, h, d, 4, 3, 4), p = g.attributes.position; for (let i = 0; i < p.count; i++) { _v.fromBufferAttribute(p, i); const n = _v.clone().divide(new THREE.Vector3(w / 2, h / 2, d / 2)); const k = 1 - round * (n.x * n.x * n.y * n.y + n.z * n.z * n.y * n.y + n.x * n.x * n.z * n.z) * .5; p.setXYZ(i, _v.x * k, _v.y * k, _v.z * k); } g.computeVertexNormals(); return g; };
    const S = 2.1;  // Teile etwas größer als echt, damit man sie im Flug erkennt
    const list = {
      brick: () => [G('brick', () => roundBox(.24 * S, .075 * S, .115 * S, .15)), M_.terracotta()],
      clod: () => [G('clod', () => lumpy(.13 * S, 1, .3, 3)), M_.earth()],
      mudclod: () => [G('clod', () => lumpy(.13 * S, 1, .3, 3)), M_.mud()],
      sod: () => [G('sod', () => boxGeo(.3 * S, .08 * S, .3 * S)), M_.grass()],
      sack: () => [G('sack', () => roundBox(.42 * S, .15 * S, .27 * S, .5)), M_.sack()],
      cement: () => [G('cement', () => lumpy(.09 * S, 1, .2, 4)), M_.cement()],
      block: () => [G('block', () => boxGeo(.3 * S, .15 * S, .2 * S)), M_.concrete()],
      rebar: () => [G('rebar', () => new THREE.CylinderGeometry(.012 * S, .012 * S, .9 * S, 6)), M_.rebar()],
      plaster: () => [G('plaster', () => lumpy(.09 * S, 1, .2, 5)), M_.plasterBlob()],
      bamboo: () => [G('bamboo', () => new THREE.CylinderGeometry(.03 * S, .03 * S, 1.1 * S, 8)), M_.bamboo()],
      plank: () => [G('plank', () => boxGeo(.9 * S, .035 * S, .14 * S)), M_.wood()],
      sheet: () => [G('sheet', () => boxGeo(.85 * S, .02 * S, .5 * S)), M_.tin()],
      straw: () => [G('straw', () => new THREE.CylinderGeometry(.07 * S, .06 * S, .55 * S, 9)), M_.thatch()],
      tile: () => [G('tile', () => new THREE.CylinderGeometry(.09 * S, .09 * S, .26 * S, 10, 1, true, 0, Math.PI)), M_.terracotta()],
      tuft: () => [G('tuft', () => new THREE.ConeGeometry(.08 * S, .35 * S, 5)), M_.blade()],
      pipe: () => [G('pipe', () => new THREE.CylinderGeometry(.04 * S, .04 * S, .6 * S, 10)), M_.pump()],
    };
    return kind => { const [geo, mat] = (list[kind] || list.block)(); const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };
  }

  // Wolke wie im Comic: weiche, aber klar umrissene Bällchen
  function puffTexture() {
    // Quellwolke aus mehreren Bällchen: oben hell, unten leicht schattiert, Rand klar aber weich
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), r = rng(77);
    const balls = [[128, 140, 78]];
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + r() * .4, d = 52 + r() * 18; balls.push([128 + Math.cos(a) * d, 132 + Math.sin(a) * d * .8, 34 + r() * 22]); }
    // Form (Alpha) mit weicher Kante
    balls.forEach(([x, y, rad]) => { const rg = g.createRadialGradient(x, y, rad * .82, x, y, rad); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); });
    // Schattierung je Bällchen (Licht von oben links)
    g.globalCompositeOperation = 'source-atop';
    balls.forEach(([x, y, rad]) => {
      const sh = g.createRadialGradient(x - rad * .35, y - rad * .45, rad * .1, x, y, rad * 1.05);
      sh.addColorStop(0, 'rgba(255,255,255,1)'); sh.addColorStop(.6, 'rgba(244,243,240,1)'); sh.addColorStop(1, 'rgba(205,206,212,1)');
      g.fillStyle = sh; g.beginPath(); g.arc(x, y, rad * .98, 0, 7); g.fill();
    });
    const bottom = g.createLinearGradient(0, 120, 0, 230); bottom.addColorStop(0, 'rgba(150,155,170,0)'); bottom.addColorStop(1, 'rgba(150,155,170,.35)');
    g.fillStyle = bottom; g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = 'source-over';
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  }

  // Pegelbrett: weiß mit roten Dezimeter-Feldern und Zahlen (0 bis top Meter)
  function gaugeTexture(top) {
    const c = document.createElement('canvas'), ppm = 256; c.width = 64; c.height = Math.round(top * ppm);
    const g = c.getContext('2d');
    g.fillStyle = '#f7f5ef'; g.fillRect(0, 0, c.width, c.height);
    for (let dm = 0; dm < top * 10; dm++) {
      const y = c.height - (dm + 1) * ppm / 10;
      if (dm % 2 === 0) { g.fillStyle = '#c8402f'; g.fillRect(0, y, 26, ppm / 10); }
      g.fillStyle = '#3a3a3a'; g.fillRect(0, y + ppm / 10 - 2, dm % 5 === 4 ? 40 : 18, 2);
    }
    g.fillStyle = '#2b2b2b'; g.font = '700 26px Inter, system-ui, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
    for (let m = .5; m < top; m += .5) g.fillText(String(m).replace('.', ','), 62, c.height - m * ppm + 14);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t;
  }

  /* ---------- Bühne ---------- */

  function create(canvas, opts = {}) {
    CHAR = !!opts.char;
    if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.localClippingEnabled = true;   // für die Bau-Variante „Aufbau“ (Bauteil wächst hinter einer Schnittebene hoch)
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;   // weiche Schatten (bedeckter Himmel)
    // Der Schatten wird nicht in jedem Bild neu gezeichnet (das war der größte Einzelposten): meist reicht ~12×/s, während
    // gebaut wird oder etwas einstürzt öfter. Die Schattenkarte bleibt dazwischen in sich stimmig (Matrix und Bild gehören zusammen).
    renderer.shadowMap.autoUpdate = false;
    let shadowAt = -1e9, shadowDirty = true;
        renderer.setClearColor(0x000000, 0);
    const big = renderer.capabilities.maxTextureSize >= 8192 && !/iPad|iPhone|Android/.test(navigator.userAgent) && !(navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));

    const M_ = Materials();
    const camera = new THREE.PerspectiveCamera(22, 1, 1, 1200);

    // weiches, helles Umgebungslicht aus einem gemalten Himmel (sorgt für die ruhigen, kontrastarmen Schatten)
    const pm = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    const skyCanvas = document.createElement('canvas'); skyCanvas.width = 8; skyCanvas.height = 256;
    const sg = skyCanvas.getContext('2d'), grad = sg.createLinearGradient(0, 0, 0, 256);
    // bedeckter Himmel: von oben gleichmäßig grau-hell, Boden olivbraun (gibt die weichen, kontrastarmen Schatten)
    grad.addColorStop(0, '#c3cad2'); grad.addColorStop(.42, '#dfe2e2'); grad.addColorStop(.52, '#c9cbc4'); grad.addColorStop(1, '#7f7a64');
    sg.fillStyle = grad; sg.fillRect(0, 0, 8, 256);
    const skyTex = new THREE.CanvasTexture(skyCanvas); skyTex.encoding = THREE.sRGBEncoding;
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide })));
    const soft = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.45, 1.42, 1.38), side: THREE.DoubleSide }));
    soft.position.set(-18, 26, 18); soft.lookAt(0, 0, 0); envScene.add(soft);
    const envTex = pm.fromScene(envScene, .04).texture;
    // Gewitterstimmung kurz vor dem Regen: Himmel schwer und schiefergrau, Licht flach, kühl und ohne Sonnenkante.
    // (Eigener Umgebungshimmel, damit Glas, Wasser und Blech die dunklen Wolken spiegeln statt eines hellen Tages.)
    grad.addColorStop(0, '#56606b'); grad.addColorStop(.4, '#848d96'); grad.addColorStop(.5, '#989c98'); grad.addColorStop(.56, '#717162'); grad.addColorStop(1, '#4a473a');
    sg.clearRect(0, 0, 8, 256); sg.fillStyle = grad; sg.fillRect(0, 0, 8, 256); skyTex.needsUpdate = true;
    soft.material.color.setRGB(.78, .79, .8);   // nur ein schwacher heller Fleck, wo die Sonne hinter den Wolken steht
    const stormEnv = pm.fromScene(envScene, .04).texture;

    const rig = (scene, power = 1, follow = false, storm = false) => {
      scene.environment = storm ? stormEnv : envTex;
      if (storm) {
        // Sonne kaum durchkommend: nur noch ganz weiche, blasse Schatten, das Licht kommt fast nur vom grauen Himmel
        const sun = new THREE.DirectionalLight(0xdcdcd6, .9 * power);
        sun.position.set(-12, 20, 15);
        sun.castShadow = true;
        sun.shadow.mapSize.set(big ? 2048 : 1024, big ? 2048 : 1024);
        const R = follow ? 40 : 15, sc = sun.shadow.camera; sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 2; sc.far = 90;
        sun.shadow.bias = -.0004; sun.shadow.normalBias = .04;
        scene.add(sun, sun.target);
        const hemi = new THREE.HemisphereLight(0x95a3b0, 0x56503e, 1.0 * power);
        scene.add(hemi);
        sun.userData.hemi = hemi; sun.userData.base = sun.intensity; sun.userData.hemiBase = hemi.intensity;
        return sun;
      }
      // Sonne hinter dünnen Wolken: schwächer und neutral, dafür mehr Himmelslicht
      const sun = new THREE.DirectionalLight(0xf4efe4, 2.0 * power);
      sun.position.set(-12, 20, 15);
      sun.castShadow = true;
      sun.shadow.mapSize.set(big ? 4096 : 2048, big ? 4096 : 2048);
      const R = follow ? 40 : 15, sc = sun.shadow.camera; sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 2; sc.far = 90;
      sun.shadow.bias = -.0004; sun.shadow.normalBias = .04;
      scene.add(sun, sun.target);
      scene.add(new THREE.HemisphereLight(0xd6dde6, 0x7d7458, .85 * power));
      return sun;
    };

    // --- Hausbühne ---
    const houseScene = new THREE.Scene();
    const sun = rig(houseScene, 1, true, true);
    const SUN_OFF = new THREE.Vector3(-12, 20, 15);
    const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: .16 }));
    shadowPlane.rotation.x = -Math.PI / 2; shadowPlane.position.y = -.51; shadowPlane.receiveShadow = true;
    houseScene.add(shadowPlane);

    // --- Landschaft mit Himmel (immer sichtbar außer bei Schnappschüssen für Kartenbilder) ---
    const HORIZON = 0x858e8f;   // schwerer, feuchter Dunst kurz vor dem Regen
    const world = new THREE.Group(); houseScene.add(world);
    const W_ = buildWorld(M_, !big); world.add(W_.group);   // Tablets: weniger Grasbüschel
    // Char: Häuser, Bäume, Felder und Gras des Dorfs ausblenden. Es bleiben Gelände, Wasser, Himmel und alles, was auf der Insel oder den Sandbänken steht.
    const keepOnChar = (x, z) => worldHeight(x, z) > -1.3 && Math.hypot(x, z) < 100 && !(Math.abs(x) < 5.6 && z > -4.4 && z < 4.6);
    function clearVillage() {
      if (!CHAR) return;
      const v = new THREE.Vector3(), m = new THREE.Matrix4(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
      world.traverse(o => {
        if (o.userData.charChecked || o.userData.keep) return;
        if (o.isInstancedMesh) {
          o.userData.charChecked = true;
          const grassy = o.geometry.attributes.position.count < 1000;   // Gras und Kleinzeug: auf der Char Schlamm statt Wiese
          for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); v.setFromMatrixPosition(m).applyMatrix4(o.matrixWorld); if (grassy || !keepOnChar(v.x, v.z)) o.setMatrixAt(i, zero); }
          o.instanceMatrix.needsUpdate = true; o.userData.charClean = true;
        } else if (o.isMesh && o.geometry && o.geometry.attributes.position && !o.name && !o.userData.keep) {
          const n = o.geometry.attributes.position.count;
          if (n === 48841) return;   // das Gelände selbst
          if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
          const bs = o.geometry.boundingSphere;
          if (bs.radius > 600) return;   // Himmel
          if (bs.radius > 400) return;   // Baumreihe am Horizont
          v.copy(bs.center).applyMatrix4(o.matrixWorld);
          if (n > 1000 || bs.radius >= 45 || !keepOnChar(v.x, v.z)) o.visible = false;
        }
      });
    }
    clearVillage();
    loadNatur().then(gltf => { W_.addModels(gltf); clearVillage(); scheduleWarm(); }).catch(err => console.warn('Modelle nicht geladen, einfache Bäume bleiben:', err));
    {
      const c = document.createElement('canvas'); c.width = 4; c.height = 512;
      const g = c.getContext('2d'), grad = g.createLinearGradient(0, 0, 0, 512);
      // tropischer Dunst-Himmel: oben kräftiges Blau, zum Horizont milchig hell (wie auf Fotos aus Bangladesch)
      // Gewitterhimmel: oben fast schwarz-blaugrau, zum Horizont ein fahler, etwas hellerer Streifen
      grad.addColorStop(0, '#2c343d'); grad.addColorStop(.4, '#424c56'); grad.addColorStop(.62, '#5d6870'); grad.addColorStop(.76, '#768086'); grad.addColorStop(.85, '#838c8d'); grad.addColorStop(1, '#838c8d');
      g.fillStyle = grad; g.fillRect(0, 0, 4, 512);
      const skyTex = new THREE.CanvasTexture(c); skyTex.encoding = THREE.sRGBEncoding;
      const sky = new THREE.Mesh(new THREE.SphereGeometry(980, 32, 24), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
      sky.renderOrder = 100; world.add(sky);   // erst nach allem Undurchsichtigen (Tiefentest spart die verdeckten Pixel)
      const r = rng(41);
      // Quellwolken: viele weiche Ballen, oben sonnig hell, unten grau-blau verschattet, flacher Boden
      const cloudTex = seed => {
        const W = 512, Hh = 256, cc = document.createElement('canvas'); cc.width = W; cc.height = Hh;
        const cg = cc.getContext('2d'), cr = rng(seed), balls = [];
        const n = 14 + Math.floor(cr() * 10);
        for (let i = 0; i < n; i++) { const t = cr(), x = 70 + t * (W - 140), hump = Math.sin(t * Math.PI); balls.push([x + (cr() - .5) * 40, 190 - hump * (50 + cr() * 70) - cr() * 20, 26 + hump * 40 + cr() * 22]); }
        balls.forEach(([x, y, rad]) => { const rg = cg.createRadialGradient(x, y, rad * .55, x, y, rad); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); cg.fillStyle = rg; cg.beginPath(); cg.arc(x, y, rad, 0, 7); cg.fill(); });
        cg.globalCompositeOperation = 'source-atop';
        balls.forEach(([x, y, rad]) => { const sh = cg.createRadialGradient(x - rad * .3, y - rad * .5, rad * .1, x, y, rad * 1.1); sh.addColorStop(0, '#8d949c'); sh.addColorStop(.55, '#5c636c'); sh.addColorStop(1, '#30363e'); cg.fillStyle = sh; cg.beginPath(); cg.arc(x, y, rad, 0, 7); cg.fill(); });
        const bot = cg.createLinearGradient(0, 110, 0, 215); bot.addColorStop(0, 'rgba(30,34,40,0)'); bot.addColorStop(1, 'rgba(22,26,31,.85)'); cg.fillStyle = bot; cg.fillRect(0, 0, W, Hh);
        cg.globalCompositeOperation = 'destination-out';
        const cut = cg.createLinearGradient(0, 192, 0, 214); cut.addColorStop(0, 'rgba(0,0,0,0)'); cut.addColorStop(1, 'rgba(0,0,0,1)'); cg.fillStyle = cut; cg.fillRect(0, 192, W, 64);
        const t = new THREE.CanvasTexture(cc); t.encoding = THREE.sRGBEncoding; return t;
      };
      const clouds = [cloudTex(3), cloudTex(4), cloudTex(5), cloudTex(6)];
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2 + r() * .2, dist = 700 + r() * 120, far = r();
        const cl = new THREE.Sprite(new THREE.SpriteMaterial({ map: clouds[i % 4], fog: false, depthWrite: false, transparent: true, opacity: .75 + r() * .25 }));
        cl.position.set(Math.sin(a) * dist, 22 + far * 40, Math.cos(a) * dist); const w = (260 + r() * 260); cl.scale.set(w, w * .22, 1); cl.renderOrder = -9; world.add(cl);
      }
      // geschlossene Wolkendecke (graue Schichtwolken mit helleren Lücken), dreht sich langsam
      {
        const W = 1024, Hh = 512, cc = document.createElement('canvas'); cc.width = W; cc.height = Hh;
        const cg = cc.getContext('2d'), f = noiseField(W, Hh, rng(77), 6, 3, 6, .55), f2 = noiseField(W, Hh, rng(78), 16, 8, 3, .5), img = cg.createImageData(W, Hh);
        for (let i = 0; i < W * Hh; i++) {
          const v = f[i] * .8 + f2[i] * .2, row = Math.floor(i / W) / Hh;
          const shade = 22 + (1 - sstep(.3, .85, v)) * 105 + f2[i] * 34;      // dicke Stellen fast schwarz (Regenwolken), Ränder fahl
          img.data[i * 4] = shade * .95; img.data[i * 4 + 1] = shade; img.data[i * 4 + 2] = shade * 1.1;
          img.data[i * 4 + 3] = 255 * sstep(.1, .42, v) * (1 - sstep(.34, .47, row));   // fast geschlossen, zum Horizont hin weich auslaufen
        }
        cg.putImageData(img, 0, 0);
        const dt = new THREE.CanvasTexture(cc); dt.encoding = THREE.sRGBEncoding; dt.wrapS = THREE.RepeatWrapping; dt.repeat.set(3, 1);
        const deckM = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 16, 0, Math.PI * 2, 0, 1.42), new THREE.MeshBasicMaterial({ map: dt, transparent: true, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
        deckM.renderOrder = -9.5; deckM.name = 'cloudDeck'; world.add(deckM);
      }
      // tief hängende Wolkenfetzen unter der Decke, ziehen schneller (Wind vor dem Regen)
      {
        const W = 1024, Hh = 256, cc = document.createElement('canvas'); cc.width = W; cc.height = Hh;
        const cg = cc.getContext('2d'), f = noiseField(W, Hh, rng(91), 10, 3, 5, .55), img = cg.createImageData(W, Hh);
        for (let i = 0; i < W * Hh; i++) {
          const row = Math.floor(i / W) / Hh, v = f[i], shade = 46 + v * 40;
          img.data[i * 4] = shade * .96; img.data[i * 4 + 1] = shade; img.data[i * 4 + 2] = shade * 1.08;
          img.data[i * 4 + 3] = 210 * sstep(.5, .78, v) * sstep(0, .25, row) * (1 - sstep(.6, 1, row));
        }
        cg.putImageData(img, 0, 0);
        const st = new THREE.CanvasTexture(cc); st.encoding = THREE.sRGBEncoding; st.wrapS = THREE.RepeatWrapping; st.repeat.set(2, 1);
        const scud = new THREE.Mesh(new THREE.CylinderGeometry(640, 640, 150, 64, 1, true), new THREE.MeshBasicMaterial({ map: st, transparent: true, side: THREE.BackSide, fog: false, depthWrite: false }));
        scud.position.y = 95; scud.renderOrder = -8.8; scud.name = 'scud'; world.add(scud);
      }
      // Baumreihe ringsum am Horizont (statt eines harten Strichs zwischen Feld und Himmel)
      const tl = WTEX.treeline(); tl.wrapS = THREE.RepeatWrapping; tl.repeat.set(7, 1);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(470, 470, 34, 96, 1, true), new THREE.MeshBasicMaterial({ map: tl, transparent: true, alphaTest: .05, side: THREE.BackSide, fog: false, color: 0x5d6563 }));
      ring.position.y = 14; ring.renderOrder = -8; world.add(ring);
    }
    const worldFog = new THREE.Fog(HORIZON, 20, 175), STORM_FOG = new THREE.Color(0x646d70);
    const cloudDeck = world.getObjectByName('cloudDeck'), scud = world.getObjectByName('scud');

    // Farbstimmung: Das Bild wird erst in einen Zwischenpuffer gerendert und dann wie ein Film „gegradet“:
    // etwas entsättigt, leicht kühl, oben schwerer, Ränder dunkler.
    const rtOpts = { type: THREE.HalfFloatType, depthBuffer: true };
    if (renderer.capabilities.isWebGL2) rtOpts.samples = 4;
    const gradeRT = new THREE.WebGLRenderTarget(4, 4, rtOpts);
    const dyn = { s: 1, min: 1, ceil: 1, w: 4, h: 4, t: 0, n: 0, good: 0, last: 0, drop: 0 };   // dynamische Auflösung (siehe adaptScale)
    const gradeU = { tDiffuse: { value: gradeRT.texture }, uExposure: { value: .9 }, uStorm: STORM, uRes: { value: new THREE.Vector2(1, 1) }, uHalf: { value: new THREE.Vector2(0, 0) } };
    const gradeMat = new THREE.ShaderMaterial({
      uniforms: gradeU, depthTest: false, depthWrite: false, toneMapped: false,
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform float uExposure; uniform float uStorm; uniform vec2 uRes; uniform vec2 uHalf; varying vec2 vUv;
        vec3 fitRRT(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
        vec3 aces(vec3 c) {
          const mat3 IN = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
          const mat3 OUT = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
          c *= uExposure / 0.6; c = IN * c; c = fitRRT(c); c = OUT * c; return clamp(c, 0.0, 1.0);
        }
        vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(0.41666)) - 0.055, step(0.0031308, c)); }
        void main() {
          // dynamische Auflösung: gerendert wird nur in einem Teilrechteck (uRes = Anteil), hier wird es aufs ganze Bild gezogen
          vec4 src = texture2D(tDiffuse, min(vUv * uRes, uRes - uHalf));
          vec3 c = aces(src.rgb);
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          c = mix(vec3(l), c, 0.9 - 0.08 * uStorm);                          // gemalte Farben, vor dem Regen etwas gedämpft (nicht grau)
          c *= vec3(0.96, 0.99, 1.04) * (1.0 - 0.2 * uStorm) + vec3(-0.01, 0.0, 0.015) * uStorm;                         // kühles Februarlicht vor dem Sturm
          c = mix(c, c * c * (3.0 - 2.0 * c), 0.2);           // etwas mehr Kontrast in der Mitte
          c = mix(vec3(0.04, 0.045, 0.05), vec3(1.0), c) * 0.93;  // Schatten kaum angehoben (feucht), Spitzlichter gedämpft
          c *= mix(1.0, 0.84, smoothstep(0.5, 1.0, vUv.y));     // schwerer Himmel drückt von oben     // schwerer Himmel drückt von oben
          vec2 d = (vUv - 0.5) * vec2(1.15, 1.0);
          c *= 1.0 - smoothstep(0.32, 0.88, length(d)) * 0.32; // dunklere Ränder
          c = toSRGB(c);
          c += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;  // gegen Farbstreifen
          gl_FragColor = vec4(c, src.a);
        }`
    });
    const gradeScene = new THREE.Scene(), gradeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const gradeQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), gradeMat); gradeQuad.frustumCulled = false; gradeScene.add(gradeQuad);
    // Wind vor dem Regen: Bodennebel zieht langsam über Ufer und Felder, Blätter und Fetzen wehen in Böen durchs Bild.
        const mist = [];
    {
      const c = document.createElement('canvas'); c.width = 256; c.height = 128;
      const g = c.getContext('2d'), f = noiseField(256, 128, rng(55), 6, 3, 4, .55), img = g.createImageData(256, 128);
      for (let y = 0; y < 128; y++) for (let x = 0; x < 256; x++) {
        const i = y * 256 + x, dx = (x - 128) / 128, dy = (y - 64) / 64, edge = Math.max(0, 1 - Math.hypot(dx, dy * 1.1));
        img.data[i * 4] = 150; img.data[i * 4 + 1] = 158; img.data[i * 4 + 2] = 164;
        img.data[i * 4 + 3] = 255 * Math.pow(edge, 1.6) * (.45 + .55 * f[i]);
      }
      g.putImageData(img, 0, 0);
      const mt = new THREE.CanvasTexture(c); mt.encoding = THREE.sRGBEncoding;
      const r = rng(19);
      for (let i = 0; i < 36; i++) {
        const a = r() * Math.PI * 2, rad = 14 + r() * 100;
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mt, transparent: true, depthWrite: false, opacity: 0, color: 0xa4abb0 }));
        const w = 22 + r() * 38; sp.scale.set(w, w * (.16 + r() * .08), 1);
        sp.position.set(Math.sin(a) * rad, .6 + r() * 2.2, Math.cos(a) * rad); sp.renderOrder = 3;
        sp.userData = { base: .38 + r() * .3, speed: .25 + r() * .35 };
        mist.push(sp); world.add(sp);
      }
    }
    // Fliegende Blätter mit den gemalten Blättern aus dem Quaternius-Set (Atlas „Leaves“): schmale grüne,
    // gelbgrüne, runde, herzförmige und ein paar orange. Jedes Blatt ist entlang der Ader geknickt und leicht gewölbt.
    // Bis das Set geladen ist, fliegen keine Blätter (keine Ersatz-Vierecke).
    const LEAVES = 340, leafData = [], leafMeshes = [];
    const LX = 32, LZ = 26, LH = 11;   // Blätter-Volumen rund um den Blickpunkt (halbe Breite/Tiefe, Höhe)
    const leafG = new THREE.Group(); leafG.visible = false; world.add(leafG);
    {
      const r = rng(23);
      for (let i = 0; i < LEAVES; i++) {
        // Flughöhe: über die ganze Höhe bis in die Palmkronen verteilt, unten etwas dichter
        const h = .3 + Math.pow(r(), 1.3) * (LH - 1);
        leafData.push({ x: (r() - .5) * 2 * LX, y: h, z: (r() - .5) * 2 * LZ, h, vy: 0, sp: .7 + r() * .9, ph: r() * 9, rx: r() * 6, ry: r() * 6, spin: 2 + r() * 6, s: .8 + r() * .8, m: 0, k: 0 });
      }
    }
    function leafGeo([x0, y0, x1, y1], len) {
      // Pixelbereich im 1024er-Atlas (oben links = 0, glTF-Texturen sind nicht gespiegelt)
      const w = len * (x1 - x0) / (y1 - y0), g = new THREE.PlaneGeometry(w, len, 2, 4), P = g.attributes.position, U = g.attributes.uv;
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i), y = P.getY(i), t = y / len + .5;
        P.setZ(i, -Math.abs(x) * .55 + (t - .5) * (t - .5) * len * .5);   // Knick an der Ader, Spitze biegt sich
        U.setXY(i, (x0 + U.getX(i) * (x1 - x0)) / 1024, (y0 + (1 - U.getY(i)) * (y1 - y0)) / 1024);
      }
      g.computeVertexNormals(); return g;
    }
    function setupLeaves(gltf) {
      let atlas = null;
      gltf.scenes.forEach(sc => sc.traverse(o => { if (o.isMesh && o.material.name === 'Leaves' && o.material.map) atlas = o.material.map; }));
      if (!atlas) return;
      const mat = new THREE.MeshStandardMaterial({ map: atlas, alphaTest: .45, side: THREE.DoubleSide, roughness: .75, envMapIntensity: .5, color: new THREE.Color(.92, .9, .78) });
      // [Atlasbereich, Länge in m, Anteil]
      const kinds = [
        [[50, 44, 190, 444], .17, .34],    // schmal, grün
        [[232, 44, 370, 444], .16, .24],   // schmal, gelbgrün mit brauner Spitze
        [[802, 42, 988, 278], .1, .18],    // rund
        [[790, 322, 990, 580], .11, .16],  // Herzblatt
        [[806, 708, 904, 1000], .1, .08],  // klein, orange-braun (welk)
      ];
      let start = 0;
      kinds.forEach(([reg, len, share], m) => {
        const n = m === kinds.length - 1 ? LEAVES - start : Math.round(LEAVES * share);
        const im = new THREE.InstancedMesh(leafGeo(reg, len), mat, n);
        im.frustumCulled = false; im.renderOrder = 2; leafG.add(im); leafMeshes.push(im);
        for (let k = 0; k < n; k++) { leafData[start + k].m = m; leafData[start + k].k = k; }
        start += n;
      });
      leafG.visible = true;
    }
    loadNatur().then(g => { setupLeaves(g); scheduleWarm(); }).catch(() => {});
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
    function stepStorm(now, t, dt, c) {
      // ziehende Wolken: das ohnehin schwache Licht schwillt langsam an und ab
      const pulse = .8 + .2 * Math.sin(t * .09) * Math.sin(t * .053 + 1.3);
      const S = STORM.value;
      if (sun.userData.base != null) { sun.intensity = sun.userData.base * pulse * (1 - .5 * S); sun.userData.hemi.intensity = sun.userData.hemiBase * (.92 + .08 * pulse) * (1 - .25 * S); }
      // Regenschleier: die Sicht wird kürzer, der Dunst dunkler
      // Der Nebel wandert mit dem Kamera-Abstand mit: auch im weiten Blick (Challenge) bleibt das Dorf klar, nur der Horizont verschwimmt
      const far = Math.max(0, c.dist * Math.max(1, 1.55 / camera.aspect) - 48);
      worldFog.near = 20 + far * .9 + 18 * RAIN.value; worldFog.far = 175 + far * 1.2 - 65 * RAIN.value;   // das Haus bleibt klar, dahinter verschwimmt alles
      worldFog.color.setHex(HORIZON).lerp(STORM_FOG, S * .8);
      // Nebel driftet mit dem Wind und blendet sich vor der Kamera aus (verdeckt nie das Haus)
      mist.forEach(sp => {
        sp.position.x += dt * sp.userData.speed * (.6 + windAt(sp.position.x, sp.position.z, t) * .5);
        if (sp.position.x > 130) sp.position.x -= 260;
        const dc = sp.position.distanceTo(camera.position), dh = Math.hypot(sp.position.x, sp.position.z);
        sp.material.opacity = Math.min(1, sp.userData.base * (1 + STORM.value * .8)) * sstep(14, 34, dc) * sstep(9, 16, dh);
      });
      // Blätter: jedes Blatt spürt die Böe an seinem eigenen Ort (gleiches Windfeld wie die Pflanzen). In Böen jagen sie
      // schnell und steigen auf, dazwischen taumeln sie langsam und sinken Richtung ihrer Flughöhe.
      for (let i = 0; i < (leafMeshes.length ? LEAVES : 0); i++) {
        const L = leafData[i], Gl = windAt(L.x, L.z, t);
        L.x += dt * L.sp * (.6 + Gl * 4.2);
        L.z += dt * (Math.sin(t * .7 + L.ph) * .9 + Math.sin(t * .23 + L.ph * 2.1) * .5) * (.5 + Gl * .5);
        // Auftrieb in Böen, Wirbel, sanftes Zurückkehren auf die eigene Flughöhe, Taumeln beim Sinken
        const ay = (L.h - L.y) * .35 + Math.sin(t * 1.3 + L.ph) * 1.6 * Gl + Math.sin(t * 2.9 + L.ph * 3.7) * .6 + (Gl - .75) * .8;
        L.vy += (ay - L.vy) * Math.min(1, dt * 2);
        L.y += dt * L.vy;
        if (L.y < .05) { L.y = .05; L.vy = Math.abs(L.vy) * .3; }
        if (L.y > LH) { L.y = LH; L.vy = -Math.abs(L.vy) * .3; }
        const rx = L.x - c.tx, rz = L.z - c.tz;
        if (rx > LX) L.x -= 2 * LX; else if (rx < -LX) L.x += 2 * LX;
        if (rz > LZ) L.z -= 2 * LZ; else if (rz < -LZ) L.z += 2 * LZ;
        const k = dt * L.spin * (.3 + Gl * .9); L.rx += k; L.ry += k * .7;
        _p.set(L.x, L.y, L.z); _q.setFromEuler(_e.set(L.rx, L.ry, L.ph)); _s.setScalar(L.s * sstep(5, 9, _p.distanceTo(camera.position)));   // nicht direkt vor der Linse
        leafMeshes[L.m].setMatrixAt(L.k, _m.compose(_p, _q, _s));
      }
      leafMeshes.forEach(im => { im.instanceMatrix.needsUpdate = true; });
    }
    houseScene.fog = worldFog;

    const site = new THREE.Group(); houseScene.add(site);
    const sideSoil = M_.soil(), grassTop = M_.grass();
    const siteBlock = new THREE.Mesh(boxGeo(SITE_W, .5, SITE_D), [sideSoil, sideSoil, grassTop, sideSoil, sideSoil, sideSoil]);
    siteBlock.position.y = -.25; siteBlock.castShadow = siteBlock.receiveShadow = true;
    site.add(siteBlock);

    const stakes = new THREE.Group();
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => {
      stakes.add(mesh(new THREE.CylinderGeometry(.035, .035, .8, 8), M_.stake(), sx * (W / 2 + .3), .4, sz * (D / 2 + .3)));
    });
    const rw = W + .6, rd = D + .6;
    [[0, rd / 2, rw, 0], [0, -rd / 2, rw, 0], [rw / 2, 0, 0, rd], [-rw / 2, 0, 0, rd]].forEach(([x, z, lw, ld]) =>
      stakes.add(box(lw || .025, .025, ld || .025, M_.string(), x, .55, z)));
    site.add(stakes);

    // weicher Kontaktschatten unter dem Haus (wie Umgebungsverdeckung)
    const aoTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const rg = g.createRadialGradient(64, 64, 30, 64, 64, 64); rg.addColorStop(0, 'rgba(0,0,0,.3)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
    // Übergang Haus–Boden: dunkler Kontaktschatten an der Wand, festgetretener Erdring, Tropfkante unter der Traufe
    const CONTACT_FOOT = [W + .7, D + .7];
    const contact = new THREE.Mesh(footprintGeo(CONTACT_FOOT[0], CONTACT_FOOT[1], 1.3), decalMat(groundRectTex(), { roughness: 1, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    contact.position.y = .02; contact.renderOrder = 4; contact.receiveShadow = true; site.add(contact);
    void aoTex;
    // Unkraut und Grasbüschel, die sich an den Sockel drängen (an der Tür frei)
    const weeds = (() => {
      const geo = grassTuftGeo(77, 12, .08, .16, .14), mat = addWind(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .85, envMapIntensity: .4 }), .05, .2, 0, true);
      const pts = [], r = rng(66), hw = CONTACT_FOOT[0] / 2 + .08, hd = CONTACT_FOOT[1] / 2 + .08;
      for (let i = 0; i < 110; i++) {
        const tt = r() * 4, e = Math.floor(tt), f = tt - e; let x, z;
        if (e === 0) { x = -hw + 2 * hw * f; z = hd; } else if (e === 1) { x = hw; z = hd - 2 * hd * f; } else if (e === 2) { x = hw - 2 * hw * f; z = -hd; } else { x = -hw; z = -hd + 2 * hd * f; }
        if (z > 0 && x > -2.3 && x < .2) continue;
        pts.push([x + (r() - .5) * .25, z + (r() - .5) * .25, .45 + r() * .75, r() * 6]);
      }
      const im = new THREE.InstancedMesh(geo, mat, pts.length), d = new THREE.Object3D(), c = new THREE.Color();
      pts.forEach(([x, z, s, ry], i) => { d.position.set(x, 0, z); d.rotation.set(0, ry, 0); d.scale.setScalar(s); d.updateMatrix(); im.setMatrixAt(i, d.matrix); c.setRGB(.8 + r() * .2, .85 + r() * .15, .75 + r() * .1); im.setColorAt(i, c); });
      im.receiveShadow = true; return im;
    })();
    site.add(weeds);
    const footOf = id => id === 'earth' ? [W + 1.5, D + 1.5] : id === 'concrete' ? [W + .9, D + .9] : id ? [W + .6, D + .6] : [W, D];

    const platformG = new THREE.Group(), foundG = new THREE.Group(), houseG = new THREE.Group(), extraG = new THREE.Group();
    site.add(platformG, foundG, houseG, extraG);
    const wallG = new THREE.Group(), roofG = new THREE.Group();
    houseG.add(wallG, roofG);

    // Flut: in der Landschaft eine große Wasserfläche, die über Felder und Hof steigt; im Schnappschuss ein Wasserblock.
    const floodG = new THREE.Group();
    const floodMat = M_.water();
    const water = new THREE.Mesh(new THREE.BoxGeometry(SITE_W + 1.4, 1, SITE_D + 1.4), floodMat);
    water.position.y = .5; floodG.add(water);
    const wn = WTEX.waterN(); wn.repeat.set(78, 78);
    // Flutwasser: lehmig-braun, gleiche Wellen wie der Fluss (auch die Regenringe greifen hier)
    const floodSheetMat = waterMaterial(0x5f553c, wn, { roughness: .12, normalScale: new THREE.Vector2(.3, .3), transparent: true, opacity: .86, depthWrite: false, refl: 0x9a9c94 });
    const floodSheet = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), floodSheetMat);
    floodSheet.rotation.x = -Math.PI / 2; floodSheet.renderOrder = 6; houseScene.add(floodSheet); floodSheet.visible = false;
    floodG.scale.y = .001; floodG.visible = false; floodG.renderOrder = 5;
    houseScene.add(floodG);
    // Echte Flut-Simulation mit Sturm und Regen (flut.js). Fehlt die Datei, steigt das Wasser wie früher gleichmäßig.
    const flut = window.HausFlut ? window.HausFlut({
      THREE, parent: world, camera, worldHeight, riverZ: CHAR ? (() => 0) : WORLD.riverZ, chanHalf: CHAR ? 62 : 9.4, pond: CHAR ? [900, 900, .1] : WORLD.pond, RIVER_Y, FLOOD_H, waterMaterial, waterNormal: wn,
      RAIN, STORM, WET, sstep, windAt, lite: !big, riverMesh: world.getObjectByName('river'), sheet: floodSheet, house: [0, D / 2 + 1.6],
      webgl2: renderer.capabilities.isWebGL2, obstacleRoots: () => [world, site], foot: () => footOf(state.cfg.foundation),
    }) : null;
    // Schäden am eigenen Haus (schaden.js): Risse, Einstürze, Erosion, Wasserrand. Fehlt die Datei, bleibt das Haus heil.
    const schaden = window.HausSchaden ? window.HausSchaden({
      THREE, M_, site, houseG, foundG, platformG, extraG, getCfg: () => state.cfg, FLOOD_H, W, D, H, PLATFORM_H, SITE_W, SITE_D, liftOf, worldHeight, sstep,
      STORM, WET, windAt, lite: !big, time: () => performance.now() / 1000,
      levelAt: (x, z) => flut ? flut.levelAt(x, z) : floodG.visible ? floodLevel(floodG.scale.y) : -99,
      flowAt: (x, z) => { const f = flut ? flut.flowAt(x, z) : [0, 0]; return CHAR ? [f[0] * 1.7, f[1] * 1.7] : f; },   // Char: reißendere Strömung, mehr Erosion
      flutInfo: () => flut ? flut.info() : null,
    }) : null;

    // Pegelstab am Grundstück: zeigt den höchsten je gemessenen Pegel der Region (setRecord), nicht die Flut des Szenarios.
    const pole = new THREE.Group();
    pole.position.set(-SITE_W / 2 + .5, 0, SITE_D / 2 - .3);
    pole.rotation.y = .35;
    houseScene.add(pole);
    function setRecord(rec) {
      clearGroup(pole);
      const top = Math.max(2.6, rec ? Math.ceil((rec.height + .6) * 2) / 2 : 0);
      pole.add(box(.16, .35, .16, M_.concrete(), 0, 0, -.06));
      pole.add(box(.1, top + .15, .08, M_.woodDark(), 0, 0, -.06));
      const board = new THREE.Mesh(new THREE.PlaneGeometry(.26, top), new THREE.MeshStandardMaterial({ map: gaugeTexture(top), roughness: .6, envMapIntensity: .9 }));
      board.position.set(0, top / 2, -.015); board.castShadow = true; pole.add(board);
      pole.add(box(.3, .025, .02, M_.metal(), 0, top, -.015));
      if (!rec) return;
      pole.add(box(.5, .05, .06, M_.poleRed(), .14, rec.height - .025, 0));
      const tag = label(rec.title, rec.value, rec.sub); tag.scale.set(2.5, .82, 1); tag.position.set(-1.55, rec.height + .1, 0); pole.add(tag);
    }
    setRecord(null);

    function clearGroup(g) {
      while (g.children.length) {
        const c = g.children[0]; g.remove(c);
        c.traverse(o => { if (o.geometry && !o.userData.sharedGeo) o.geometry.dispose(); });
      }
    }

    /* ---- Bau-Animation ---- */
    // Material fliegt vom unteren Bildrand (dort ist das iPad) in eine Comic-Wolke über dem Bauteil,
    // von dort auf das Bauteil, das dabei Reihe für Reihe von unten nach oben entsteht.
    const fx = new THREE.Group(); houseScene.add(fx);
    const makePiece = pieceFactory(M_);
    const puffMat = new THREE.SpriteMaterial({ map: puffTexture(), transparent: true, depthWrite: false, fog: false, toneMapped: false });
    const builds = {}, leavers = [], dusts = [];
    const ray = new THREE.Raycaster();

    function spawnPoint(dist) {
      ray.setFromCamera(new THREE.Vector2((Math.random() - .5) * 1.1, -1.12), camera);
      return ray.ray.origin.clone().addScaledVector(ray.ray.direction, dist);
    }

    function dust(pos, size = .5, ms = 450) {
      if (dusts.length > 60) return;
      const s = new THREE.Sprite(puffMat.clone()); s.position.copy(pos); s.scale.setScalar(.01); s.renderOrder = 8; fx.add(s);
      dusts.push({ s, t0: performance.now(), size, ms });
    }

    function cancelBuild(slot) {
      const b = builds[slot]; if (!b) return;
      b.part.visible = true;
      b.pieces.forEach(p => p.mesh && fx.remove(p.mesh));
      if (b.cloud) b.cloud.forEach(c => { fx.remove(c.s); c.s.material.dispose(); });
      if (b.swaps) b.swaps.forEach(([m, orig, cl]) => { m.material = orig; [].concat(cl).forEach(x => x.dispose()); });
      if (b.ghost) { b.ghost.parent && b.ghost.parent.remove(b.ghost); b.ghostMat.dispose(); }
      if (b.ring) { fx.remove(b.ring); b.ring.children.forEach(o => o.geometry.dispose()); }
      if (b.lift) b.lift.forEach(([o, , to]) => { o.position.y = to; });
      delete builds[slot];
    }

    // Bau hinter einer dichten Comic-Wolke: Die Wolke quillt auf und umhüllt das Bauteil ganz, das Material fliegt vom
    // unteren Bildrand hinein, und wenn sich die Wolke auflöst, steht das fertige Bauteil da.
    // slot: 'foundation' | 'wall' | 'roof' | 'extra' | 'platform'; part: neue Gruppe; id: Auswahl (für das Material)
    // Zwei Varianten, umschaltbar im Entwicklermenü (Taste E): 'wolke' (Standard) oder 'aufbau'
    const buildStyle = () => (document.documentElement.dataset.bau === 'aufbau' ? 'aufbau' : 'wolke');
    const COVER = 260, CLEAR = 1400, GONE = 1900;
    function startBuild(slot, part, id, lift) {
      cancelBuild(slot);
      if (buildStyle() === 'aufbau') return startAssemble(slot, part, id, lift);
      part.updateWorldMatrix(true, true);
      const bb = new THREE.Box3().setFromObject(part);
      if (bb.isEmpty()) return;
      part.visible = false;   // erst sichtbar, wenn die Wolke es verdeckt
      const r = rng(Math.floor(Math.random() * 1e6));
      const size = bb.getSize(new THREE.Vector3()), center = bb.getCenter(new THREE.Vector3());
      const maxD = Math.max(size.x, size.y, size.z), S = maxD * .42 + 1.3;
      const kinds = PARTS[id] || ['block'];
      // Bällchen an Ecken, Kanten, Flächen und in der Mitte des Bauteils: so ist es aus jedem Blickwinkel ganz bedeckt.
      const cloud = [], pts = [];
      for (const fx_ of [-.5, 0, .5]) for (const fy of [-.5, 0, .5]) for (const fz of [-.5, 0, .5]) pts.push([fx_, fy, fz]);
      pts.push([0, .8, 0], [.3, .75, -.2], [-.3, .7, .25]);
      pts.forEach(([a, b, c], i) => {
        const s = new THREE.Sprite(puffMat.clone());
        s.material.depthTest = false; s.renderOrder = 30 + i; fx.add(s);
        const home = new THREE.Vector3(center.x + a * (size.x + .5), center.y + b * (size.y + .4) + .15, center.z + c * (size.z + .5));
        const out = home.clone().sub(center); if (out.lengthSq() < 1e-4) out.set(r() - .5, .5, r() - .5); out.normalize();
        const edge = Math.abs(a) + Math.abs(b) + Math.abs(c);
        s.material.rotation = r() * Math.PI * 2;
        cloud.push({ s, home, out, size: S * 1.25 * (1.05 - edge * .1) * (.9 + r() * .25), ph: r() * 6, delay: r() * 70, tone: .95 + r() * .05 });
      });
      const camDist = camera.position.distanceTo(center);
      const pieces = [];
      const n = Math.round(Math.min(46, Math.max(24, maxD * 4)));
      for (let i = 0; i < n; i++) {
        const launch = r() * (CLEAR - 750);
        pieces.push({ kind: kinds[Math.floor(r() * kinds.length)], launch, arrive: launch + 520 + r() * 230,
          spin: new THREE.Vector3((r() - .5) * 12, (r() - .5) * 12, (r() - .5) * 12),
          dest: new THREE.Vector3(center.x + (r() - .5) * size.x * .6, center.y + (r() - .2) * size.y * .5, center.z + (r() - .5) * size.z * .6),
          ctrl: new THREE.Vector3((r() - .5) * S, S * (.5 + r() * .5), (r() - .5) * S * .6),
          camDist: camDist * (.45 + r() * .15) });
      }
      builds[slot] = { slot, part, pieces, cloud, center, size, S, T0: performance.now(), lift, revealed: false };
    }

    // Variante „Aufbau“: Man sieht das Bauteil entstehen. Zuerst erscheint es als heller, durchscheinender Bauplan,
    // dann wächst das echte Bauteil von unten nach oben hinter einer leuchtenden Baukante hoch (Schnittebene).
    // Das Material fliegt vom unteren Bildrand genau an die Stelle, an der gerade gebaut wird; dort staubt es kurz.
    const AS = { START: 230, RISE: 1500, END: 2000 };
    function startAssemble(slot, part, id, lift) {
      part.updateWorldMatrix(true, true);
      const bb = new THREE.Box3().setFromObject(part);
      if (bb.isEmpty()) return;
      const r = rng(Math.floor(Math.random() * 1e6));
      const size = bb.getSize(new THREE.Vector3()), center = bb.getCenter(new THREE.Vector3());
      const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), bb.min.y - .02);        // zeigt nur, was unter der Kante liegt
      const above = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(bb.min.y - .02));     // Bauplan: nur darüber
      // Die Materialien werden erst im ersten Schritt gegen geklonte mit Schnittebene getauscht: setHouse lässt danach
      // noch schaden.prepare() laufen, das die Materialien für die Schadensanzeige ersetzt (und dabei die Ebene kopieren würde).
      part.visible = false;
      const ghostMat = new THREE.MeshBasicMaterial({ color: 0xd6eaff, transparent: true, opacity: 0, depthWrite: false, clippingPlanes: [above], toneMapped: false, fog: false });
      const ghost = part.clone(true);
      ghost.traverse(o => { if (o.isMesh) { o.material = ghostMat; o.castShadow = o.receiveShadow = false; o.renderOrder = 5; } });
      part.parent.add(ghost);
      // leuchtende Baukante: Rahmen aus vier dünnen Leisten um das Bauteil
      const ring = new THREE.Group(), ringMat = new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0, toneMapped: false, fog: false, depthWrite: false });
      const ex = size.x / 2 + .12, ez = size.z / 2 + .12, th = .045;
      [[ex * 2 + th, th, 0, ez], [ex * 2 + th, th, 0, -ez], [th, ez * 2 + th, ex, 0], [th, ez * 2 + th, -ex, 0]].forEach(([w, d, x, z]) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, th * .7, d), ringMat); m.position.set(x, 0, z); m.renderOrder = 40; ring.add(m);
      });
      ring.position.set(center.x, bb.min.y, center.z); fx.add(ring);
      const kinds = PARTS[id] || ['block'], camDist = camera.position.distanceTo(center);
      const maxD = Math.max(size.x, size.y, size.z), n = Math.round(Math.min(40, Math.max(18, maxD * 3.5))), pieces = [];
      for (let i = 0; i < n; i++) {
        const arrive = AS.START + 120 + (i / n) * (AS.RISE - 150) + r() * 60, fly = 420 + r() * 200;
        // Ziel: ein Punkt auf dem Umfang des Bauteils
        const sideK = r(), along = r() - .5;
        const dx = sideK < .5 ? along * size.x : (sideK < .75 ? 1 : -1) * size.x / 2, dz = sideK < .5 ? (sideK < .25 ? 1 : -1) * size.z / 2 : along * size.z;
        pieces.push({ kind: kinds[Math.floor(r() * kinds.length)], launch: arrive - fly, arrive, dx: dx * .9, dz: dz * .9,
          spin: new THREE.Vector3((r() - .5) * 10, (r() - .5) * 10, (r() - .5) * 10), arc: .8 + r() * 1.2, camDist: camDist * (.55 + r() * .15) });
      }
      builds[slot] = { slot, style: 'aufbau', part, pieces, center, size, y0: bb.min.y, y1: bb.max.y, ty0: part.matrixWorld.elements[13],
        plane, above, swaps: null, ghost, ghostMat, ring, ringMat, T0: performance.now(), lift, puffAt: 0 };
    }
    const cutAt = (b, t) => { const k = Math.max(0, Math.min(1, (t - AS.START) / AS.RISE)); return b.y0 - .02 + (b.y1 - b.y0 + .06) * (k * k * (3 - 2 * k) * .35 + k * .65); };
    function stepAssemble(b, t, now) {
      if (!b.swaps) {
        const clip = m => { const c = m.clone(); c.clippingPlanes = [b.plane]; c.clipShadows = true; c.onBeforeCompile = m.onBeforeCompile; c.customProgramCacheKey = m.customProgramCacheKey; return c; };
        b.swaps = [];
        b.part.traverse(o => { if (o.isMesh && o.material) { const orig = o.material, cl = Array.isArray(orig) ? orig.map(clip) : clip(orig); o.material = cl; b.swaps.push([o, orig, cl]); } });
        b.part.visible = true;
      }
      const dy = b.part.matrixWorld.elements[13] - b.ty0, cut = cutAt(b, t) + dy;
      b.plane.constant = cut; b.above.constant = -cut;
      b.ghost.position.copy(b.part.position);
      const fadeIn = Math.min(1, t / 200), fadeOut = 1 - Math.max(0, Math.min(1, (t - AS.START - AS.RISE) / 250));
      b.ghostMat.opacity = .18 * fadeIn * fadeOut;
      const rising = t > AS.START && t < AS.START + AS.RISE + 80;
      b.ringMat.opacity = Math.min(1, (t - AS.START + 80) / 150) * fadeOut * (.8 + Math.sin(t / 60) * .2);
      b.ring.position.y = cut + .01; b.ring.visible = b.ringMat.opacity > .01;
      if (b.lift) { const k = ease(Math.max(0, Math.min(1, (t - AS.START) / AS.RISE))); b.lift.forEach(([o, from, to]) => { o.position.y = from + (to - from) * k; }); }
      // Staub an der Baukante
      if (rising && now - b.puffAt > 140) {
        b.puffAt = now;
        const a = Math.random(), sx = b.size.x / 2 + .1, sz = b.size.z / 2 + .1, side = Math.floor(Math.random() * 4);
        const px = side < 2 ? (a - .5) * 2 * sx : (side === 2 ? sx : -sx), pz = side < 2 ? (side ? sz : -sz) : (a - .5) * 2 * sz;
        dust(new THREE.Vector3(b.center.x + px, cut, b.center.z + pz), .55 + Math.random() * .35, 420);
      }
      b.pieces.forEach(p => {
        if (t < p.launch) return;
        if (!p.mesh) { p.mesh = makePiece(p.kind); p.mesh.renderOrder = 60; fx.add(p.mesh); p.from = spawnPoint(p.camDist); }
        const u = Math.min(1, (t - p.launch) / (p.arrive - p.launch));
        const destY = cutAt(b, p.arrive) + dy;
        _b.set(b.center.x + p.dx, destY, b.center.z + p.dz);
        _c.copy(_b).lerp(p.from, .3); _c.y = destY + p.arc;   // Bogen nah am Haus, nicht vor der Kamera
        const s = 1 - Math.pow(1 - u, 1.6), s1 = 1 - s;
        p.mesh.position.set(0, 0, 0).addScaledVector(p.from, s1 * s1).addScaledVector(_c, 2 * s1 * s).addScaledVector(_b, s * s);
        p.mesh.rotation.set(p.spin.x * u, p.spin.y * u, p.spin.z * u);
        // landet, wird kurz platt gedrückt und geht im Bauteil auf
        const after = t - p.arrive, sc = after < 0 ? Math.min(1, (t - p.launch) / 90) : Math.max(0, 1 - after / 160);
        p.mesh.scale.set(Math.max(.001, sc * (1 + Math.max(0, after) / 300)), Math.max(.001, sc * (after > 0 ? .6 : 1)), Math.max(.001, sc));
        p.mesh.visible = sc > .002;
        if (after >= 0 && !p.landed) { p.landed = true; if (Math.random() < .5) dust(_b.clone(), .35, 300); }
      });
      if (t > AS.END) cancelBuild(b.slot);
    }

    const ease = k => k * k * (3 - 2 * k);
    const easeOutBack = k => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
    const _b = new THREE.Vector3(), _c = new THREE.Vector3();
    function stepBuilds(now) {
      Object.values(builds).forEach(b => {
        const t = now - b.T0;
        if (b.style === 'aufbau') return stepAssemble(b, t, now);
        // Wolke: quillt schnell auf, brodelt, löst sich nach außen auf
        b.cloud.forEach(c => {
          const kIn = Math.max(0, Math.min(1, (t - c.delay * .5) / (COVER - 60))), kOut = Math.max(0, Math.min(1, (t - CLEAR - c.delay) / (GONE - CLEAR - 120)));
          const grow = kIn < 1 ? easeOutBack(kIn) : 1;
          const boil = 1 + Math.sin(t / 210 + c.ph) * .07 + Math.sin(t / 130 + c.ph * 2) * .03;
          c.s.position.copy(c.home).addScaledVector(c.out, ease(kOut) * b.S * .9 + Math.sin(t / 300 + c.ph) * .08);
          const sz = Math.max(.01, c.size * grow * boil * (1 + kOut * .5));
          c.s.scale.set(sz, sz * .92, 1);
          c.s.material.opacity = 1 - ease(kOut);
          c.s.material.color.setScalar(c.tone);
        });
        if (!b.revealed && t >= COVER) { b.revealed = true; b.part.visible = true; }
        if (b.lift) { const k = ease(Math.max(0, Math.min(1, (t - COVER) / (CLEAR - COVER - 200)))); b.lift.forEach(([o, from, to]) => { o.position.y = from + (to - from) * k; }); }
        // Material fliegt in die Wolke und verschwindet darin
        b.pieces.forEach(p => {
          if (t < p.launch) return;
          if (!p.mesh) { p.mesh = makePiece(p.kind); p.mesh.renderOrder = 60; fx.add(p.mesh); p.from = spawnPoint(p.camDist); }
          const u = Math.min(1, (t - p.launch) / (p.arrive - p.launch));
          const ctrl = _c.copy(b.center).add(p.ctrl), dest = _b.copy(p.dest);
          const s = 1 - Math.pow(1 - u, 2), s1 = 1 - s;
          p.mesh.position.set(0, 0, 0).addScaledVector(p.from, s1 * s1).addScaledVector(ctrl, 2 * s1 * s).addScaledVector(dest, s * s);
          const tumble = 1 - u * .6;
          p.mesh.rotation.set(p.spin.x * u * tumble, p.spin.y * u * tumble, p.spin.z * u * tumble);
          const sc = Math.min(1, (t - p.launch) / 100) * (u < 1 ? 1 : 0);
          p.mesh.scale.setScalar(Math.max(.001, sc)); p.mesh.visible = sc > .002;
        });
        if (t > GONE + 100) cancelBuild(b.slot);
      });
      for (let i = leavers.length - 1; i >= 0; i--) {
        const l = leavers[i], age = now - l.t0;
        if (l.hide) { if (age >= COVER) { l.g.parent && l.g.parent.remove(l.g); l.g.traverse(o => { if (o.geometry && !o.userData.sharedGeo) o.geometry.dispose(); }); leavers.splice(i, 1); } continue; }
        const k = Math.min(1, age / (l.ms || 520));
        l.g.scale.y = Math.max(.001, 1 - ease(k)); l.g.position.y = l.y0 - k * .2;
        if (k >= 1) { l.g.parent && l.g.parent.remove(l.g); l.g.traverse(o => { if (o.geometry && !o.userData.sharedGeo) o.geometry.dispose(); }); leavers.splice(i, 1); }
      }
      for (let i = dusts.length - 1; i >= 0; i--) {
        const d = dusts[i], k = Math.min(1, (now - d.t0) / d.ms);
        d.s.scale.setScalar(d.size * (.4 + k)); d.s.material.opacity = .9 * (1 - k); d.s.position.y += .004;
        if (k >= 1) { fx.remove(d.s); d.s.material.dispose(); dusts.splice(i, 1); }
      }
    }

    // Altes Bauteil: Kommt ein neues, verschwindet es, sobald die Wolke es verdeckt; sonst sackt es mit Staub zusammen.
    function leave(grp, covered) {
      if (!grp.children.length) return;
      const quick = buildStyle() === 'aufbau';
      if (quick) covered = false;
      const g = new THREE.Group(); g.position.copy(grp.position); g.rotation.copy(grp.rotation);
      while (grp.children.length) g.add(grp.children[0]);
      grp.parent.add(g);
      leavers.push({ g, t0: performance.now(), y0: g.position.y, hide: !!covered, ms: quick ? 300 : 520 });
      if (covered) return;
      const bb = new THREE.Box3().setFromObject(g);
      if (!bb.isEmpty()) { const c = bb.getCenter(new THREE.Vector3()); for (let i = 0; i < 4; i++) dust(new THREE.Vector3(c.x + (Math.random() - .5) * 3, bb.min.y + .4, c.z + (Math.random() - .5) * 2), 1.4, 650); }
    }

    function finishAll() {
      Object.keys(builds).forEach(cancelBuild);
      leavers.splice(0).forEach(l => { l.g.parent && l.g.parent.remove(l.g); });
      dusts.splice(0).forEach(d => fx.remove(d.s));
      foundG.position.y = state.baseY || 0; houseG.position.y = state.floorY || 0;
    }

    const state = { cfg: { foundation: null, wall: null, roof: null, extra: null }, built: {}, platformH: 0, floorY: 0, top: 0, baseY: 0 };

    function setHouse(cfg, { animate = true } = {}) {
      if (typeof fxMats !== 'undefined') { fxMats.forEach((rec, o) => { o.material = rec.orig; }); fxMats.clear(); fxState.focus = fxState.hover = null; fxState.hint = false; }
      const old = state.cfg, fresh = !state.init;
      const next = { foundation: cfg.foundation || null, wall: cfg.wall || null, roof: cfg.roof || null, extra: cfg.extra || null };
      // Anderes Haus: Schäden zurücksetzen, bevor Bauteile ersetzt werden
      if (schaden && (fresh || ['foundation', 'wall', 'roof', 'extra'].some(k => old[k] !== next[k]))) schaden.reset();
      state.cfg = next; state.init = true; shadowDirty = true;
      const anim = animate && !fresh && !window.HAUS_NO_ANIM;
      const platform = next.extra === 'platform', wasPlatform = old.extra === 'platform';
      const baseY = platform ? PLATFORM_H : 0;
      const prevBase = foundG.position.y, prevFloor = houseG.position.y;
      state.baseY = baseY;
      state.floorY = baseY + liftOf(next.foundation);
      const liftList = [[foundG, prevBase, baseY], [houseG, prevFloor, state.floorY]];
      let lifted = false;

      if (platform !== wasPlatform || fresh) {
        if (anim) { cancelBuild('platform'); leave(platformG, platform); } else clearGroup(platformG);
        if (platform) {
          platformG.add(mound(SITE_W - 1.2, SITE_D - 1.0, W + 1.8, D + 1.6, PLATFORM_H, M_, 11));
          // Erdtreppe zur Tür, jede Stufe mit einem Bambusstamm gefasst, seitlich Grasbüschel
          for (let i = 0; i < 5; i++) {
            const top = PLATFORM_H * (5 - i) / 5 - .03, z = (D + 1.6) / 2 + .1 + i * .3;
            platformG.add(box(1.4, top, .34, M_.earth(), -1.1, 0, z));
            platformG.add(beam([-1.82, top + .02, z + .16], [-.38, top + .02, z + .16], .045, M_.bamboo()));
          }
          if (anim) { startBuild('platform', platformG, 'platform', liftList); lifted = true; }
        } else if (anim && wasPlatform) { lifted = true; liftList.forEach(([o, from, to]) => { o.userData.lerpTo = to; }); }
      }
      stakes.visible = !next.foundation && !platform;

      if (old.foundation !== next.foundation || fresh) {
        if (anim) { cancelBuild('foundation'); leave(foundG, !!next.foundation); } else clearGroup(foundG);
        if (next.foundation) {
          foundG.add(buildFoundation(next.foundation, M_).group);
          if (anim) { foundG.position.y = baseY; startBuild('foundation', foundG, next.foundation, lifted ? null : [[houseG, prevFloor, state.floorY]]); lifted = true; }
        } else if (anim) { houseG.userData.lerpTo = state.floorY; lifted = true; }
      }
      if (!lifted || !anim) { foundG.position.y = baseY; houseG.position.y = state.floorY; foundG.userData.lerpTo = houseG.userData.lerpTo = null; }

      const gableRise = gableRiseOf(next.roof), wallKey = `${next.wall}|${gableRise > 0}`;
      if (state.wallKey !== wallKey) {
        const changed = old.wall !== next.wall;
        if (anim && changed) { cancelBuild('wall'); leave(wallG, !!next.wall); } else { cancelBuild('wall'); clearGroup(wallG); }
        if (next.wall) { wallG.add(buildWalls(next.wall, gableRise, M_)); if (anim && changed) startBuild('wall', wallG, next.wall); }
        state.wallKey = wallKey;
      }
      if (old.roof !== next.roof || fresh) {
        if (anim) { cancelBuild('roof'); leave(roofG, !!next.roof); } else clearGroup(roofG);
        if (next.roof) { roofG.add(buildRoof(next.roof, M_).group); if (anim) startBuild('roof', roofG, next.roof); }
      }
      const extraKey = `${next.extra}|${baseY}|${state.floorY}`;
      if (state.extraKey !== extraKey) {
        const changed = old.extra !== next.extra;
        if (anim && changed && next.extra !== 'platform') { cancelBuild('extra'); leave(extraG, !!next.extra); } else { cancelBuild('extra'); clearGroup(extraG); }
        if (next.extra) {
          extraG.add(buildExtra(next.extra, M_, { baseY: next.extra === 'frame' ? state.floorY : baseY, edgeW: W + 1.5, edgeD: D + 1.5 }));
          if (anim && changed && next.extra !== 'platform') startBuild('extra', extraG, next.extra);
        }
        state.extraKey = extraKey;
      }
      // Kontaktschatten und Unkraut folgen der Grundfläche des Fundaments (und der Höhe der Plattform)
      const [fwN, fdN] = footOf(next.foundation), show = !!(next.foundation || next.wall);
      [contact, weeds].forEach(o => { o.scale.set(fwN / CONTACT_FOOT[0], 1, fdN / CONTACT_FOOT[1]); o.position.y = baseY + (o === contact ? .02 : 0); });
      contact.visible = worldOn && show; weeds.visible = show;
      if (schaden) schaden.prepare();
    }

    /* ---- Kamera ---- */
    const cam = {
      cur: { az: .3, pol: 1.12, dist: 50, tx: 0, ty: 1.2, tz: 0, fov: 22 },
      tgt: { az: .3, pol: 1.12, dist: 50, tx: 0, ty: 1.2, tz: 0, fov: 22 },
      auto: 0, shift: 0, view: 'house', drag: false, preset: 'overview', osc: 0, baseAz: .3,
    };

    // Blick leicht schräg von vorn (az klein = fast frontal), etwas erhöht, mit viel Landschaft rundum.
    function presets() {
      const f = state.floorY, b = state.baseY || 0;
      const roofH = { tinhip: 1.2, tilegable: 1.5, thatch: 2.2, concreteflat: .4 }[state.cfg.roof] || 0;
      const grow = Math.max(0, f + roofH - 1.2) * 1.2;
      return {
        overview: { az: .3, pol: 1.06, dist: 42 + grow, tx: 0, ty: (f + roofH) * .35 + .9, tz: 0 },
        start: { az: .36, pol: 1.3, dist: 34, tx: 0, ty: 3.4, tz: .3 },
        // unten (iPad) beim Start: dasselbe Haus wie oben aus derselben Richtung, aber tief aus dem Rasen davor (Kamera ca. 1,2 m hoch),
        // weites Objektiv, damit unten im Bild viel Gras liegt
        startGround: { az: .36, pol: 1.38, dist: 7, tx: 1.5, ty: -.3, tz: 3.8, fov: 62 },
        // unten auf allen weiteren Seiten: die Kamera schwenkt von dort senkrecht nach unten auf den Rasen vor dem Haus
        groundDown: { az: .36, pol: .06, dist: 6.5, tx: 5.6, ty: 0, tz: 9.2, fov: 44 },
        site: { az: .3, pol: 1.08, dist: 38, tx: 0, ty: .8 + b * .4, tz: 0 },
        foundation: { az: .3, pol: 1.08, dist: 38 + grow * .5, tx: 0, ty: b + .9, tz: 0 },
        wall: { az: .28, pol: 1.07, dist: 39 + grow * .5, tx: 0, ty: f + 1.3, tz: 0 },
        roof: { az: .32, pol: 1.04, dist: 40 + grow * .6, tx: 0, ty: f + H * .6 + .3, tz: 0 },
        extra: { az: .3, pol: 1.06, dist: 43 + grow, tx: 0, ty: f * .5 + 1.3, tz: 0 },
        result: { az: .26, pol: 1.06, dist: 43 + grow, tx: 0, ty: f * .5 + 1.5, tz: 0 },
        // Challenge: dieselbe Dorf-Landschaft wie beim Bauen, nur weit herausgezoomt (Fluss, Dorf, Felder rundum)
        // V3: Explosionsansicht im weißen Raum (Bauteile nach oben auseinandergezogen) und Nahaufnahmen je Bauteil
        ...explodedPresets(f, b, roofH),
        land: { az: .34, pol: .95, dist: 175, tx: 0, ty: 0, tz: -3 },
        land2: { az: .6, pol: 1.0, dist: 140, tx: 0, ty: 0, tz: -3 },
      };
    }

    // Abstände der Explosionsansicht; mit Tragwerk bekommt es eine eigene Etage zwischen Wänden und Dach
    const EXPD = () => state.cfg.extra === 'frame' ? { wall: 1.7, frame: 4.6, roof: 7.6, down: -2.2 } : { wall: 1.9, frame: 0, roof: 4.2, down: -2.2 };
    function explodedPresets(f, b, roofH) {
      const EXP = EXPD(), platform = state.cfg.extra === 'platform', frame = state.cfg.extra === 'frame';
      const bottom = platform ? EXP.down : state.cfg.extra ? EXP.down - .3 : 0, top = f + H + roofH + EXP.roof;
      const span = top - bottom, mid = (top + bottom) / 2;
      const xtraY = frame ? f + 1.2 + EXP.frame : (platform ? PLATFORM_H / 2 + EXP.down : .3 + EXP.down);
      return {
        xo: { az: .5, pol: 1.18, dist: Math.max(34, span * 3.9), tx: 0, ty: mid - 1.3, tz: 0 },
        xo_foundation: { az: .42, pol: 1.1, dist: 33, tx: 0, ty: b + .5 - .6, tz: 0 },
        xo_wall: { az: .36, pol: 1.12, dist: 34, tx: 0, ty: f + 1.2 + EXP.wall - .6, tz: 0 },
        xo_roof: { az: .4, pol: 1.0, dist: 36, tx: 0, ty: f + H + roofH * .5 + EXP.roof - .8, tz: 0 },
        xo_extra: { az: .45, pol: 1.1, dist: 33, tx: 0, ty: xtraY - .6, tz: 0 },
      };
    }
    // Faktor für den Kamera-Abstand der Bau-Ansichten (1 = nah am Haus, die Stadt rundum füllt das Bild, kaum Horizont).
    const FREE = new Set(['land', 'land2', 'start', 'startGround', 'groundDown']);
    let zoom = 1.0;
    function focus(name, { instant = false, keepAz = false } = {}) {
      const p = presets()[name] || presets().overview;
      Object.assign(cam.tgt, { fov: 22, ...p });
      if (!FREE.has(name)) cam.tgt.dist *= zoom;
      if (keepAz) cam.tgt.az = cam.cur.az;
      cam.preset = name; cam.baseAz = p.az; cam.osc = 0;
      if (instant) Object.assign(cam.cur, cam.tgt);
    }

    // 'land' = weiter Blick über dieselbe Szene (ohne Pegelstab); 'house' = Bauansicht
    function setView(v) { cam.view = v; if (v === 'land') pole.visible = false; }
    function setShift(f) { cam.shift = f; }
    function setAuto(speed) { cam.auto = speed; }
    // secs: Dauer des Anstiegs in Sekunden (gleichmäßig); ohne Angabe läuft das Wasser weich aus
    function setFlood(on, animate = true, secs = 0) {
      if (flut) {
        if (on) { if (animate) flut.start(); else flut.fill(); } else flut.clear(animate);
        floodG.visible = false; floodG.scale.y = on ? 1 : .001; floodG.userData.target = null;
      } else {
        floodG.visible = true; floodG.userData.target = on ? 1 : 0; floodG.userData.rate = secs > 0 ? 1 / secs : 0;
        if (!animate) { floodG.scale.y = on ? 1 : .001; floodG.visible = on; }
      }
      // Schäden: mit der Flut beginnen (animiert) bzw. sofort im Endzustand zeigen (Ergebnis); ohne Flut ist das Haus heil
      if (schaden) { if (on) schaden.begin(animate); else schaden.reset(); }
    }
    function setPole(on) { pole.visible = on; }
    // Blick durchs Wasser: das Wasser wird weich durchsichtig (clearT = Ziel, clearK = aktueller Wert, siehe frame)
    let clearT = 0, clearK = 0;
    function setClear(on) { clearT = on ? 1 : 0; }
    // Regen auf dem Wasser (0..1): Tropfenringe im Fluss, Teich und Flutwasser. Für die spätere Regen-Simulation.
    function setRain(k) { RAIN.value = Math.max(0, Math.min(1, k)); }
    // Startbild: Landschaft ist immer da; auf dem Startbild schwenkt die Kamera nur über die freie Vorderseite.
    let worldOn = true;
    function setWorld(on) {
      worldOn = on; world.visible = on; siteBlock.visible = !on; shadowPlane.visible = !on; houseScene.fog = on ? worldFog : null;
      // Freigestellte Kartenbilder (ohne Landschaft) bekommen weiter das helle Tageslicht, nur die Szene selbst ist gewittrig
      const hemi = sun.userData.hemi;
      houseScene.environment = on ? stormEnv : envTex;
      sun.color.set(on ? 0xc3ccd6 : 0xf4efe4); sun.intensity = on ? sun.userData.base : 2.0;
      hemi.color.set(on ? 0x8d99a6 : 0xd6dde6); hemi.groundColor.set(on ? 0x4b4a3c : 0x7d7458); hemi.intensity = on ? sun.userData.hemiBase : .85;
      contact.visible = on && !!(state.cfg.foundation || state.cfg.wall);
    }
    function setMeadow(on) { cam.startMode = on; }
    setWorld(true);

    // Mit Maus/Finger drehen
    let drag = null;
    canvas.addEventListener('pointerdown', e => {
      if (!cam.drag) return;
      drag = { x: e.clientX, y: e.clientY, az: cam.tgt.az, pol: cam.tgt.pol };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* geht auch ohne */ }
    });
    canvas.addEventListener('pointermove', e => {
      if (!drag) return;
      cam.tgt.az = drag.az - (e.clientX - drag.x) * .006;
      cam.tgt.pol = Math.min(1.4, Math.max(.35, drag.pol - (e.clientY - drag.y) * .004));
    });
    const endDrag = () => { drag = null; };
    canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
    function setDrag(on) { cam.drag = on; canvas.style.touchAction = on ? 'none' : ''; }

    function resize() {
      const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
      renderer.setSize(w, h, false);
      const pr = renderer.getPixelRatio(), rw = Math.round(w * pr), rh = Math.round(h * pr);
      // Kantenglättung nach Pixelzahl: bei 4K (> 5 Mio. Pixel) genügen 2 Proben, 4 Proben kosten dort ein Viertel der Bildrate
      if (renderer.capabilities.isWebGL2) { const want = rw * rh > 5e6 ? 2 : 4; if (gradeRT.samples !== want) { gradeRT.samples = want; gradeRT.dispose(); } }
      gradeRT.setSize(rw, rh); dyn.w = rw; dyn.h = rh;
      camera.aspect = w / h;
      applyShift(w, h);
    }
    function applyShift(w, h) {
      if (Math.abs(cam.shift) > .001) camera.setViewOffset(w, h, -w * cam.shift, 0, w, h); else camera.clearViewOffset();
      camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(canvas);

    function floodLevel(k) { return -.95 + (FLOOD_H + .95) * k; }

    // Dynamische Auflösung: Der Zwischenpuffer behält seine volle Größe (nie neu angelegt, kein Ruckeln), gerendert wird aber nur in
    // einem Teilrechteck. Wird es langsamer als ~50 Bilder/s, schrumpft es sofort in kleinen Schritten, wird es wieder flott, wächst es
    // langsam zurück. Kommt eine Animation (Bauen, Flut), geht die Schärfe kurz runter statt dass das Bild ruckelt; im Stillstand ist es scharf.
    function adaptScale(now) {
      const dtRaw = now - dyn.last; dyn.last = now;
      // Untergrenze: nie unter ~1,6 Mio. Pixel (ca. 1080p) und nie unter 45 %
      dyn.min = Math.min(1, Math.max(.45, Math.sqrt(1.6e6 / Math.max(1, dyn.w * dyn.h))));
      if (window.HAUS_SCALE) { dyn.s = window.HAUS_SCALE; return; }   // zum Messen: feste Auflösung
      if (document.hidden || dtRaw <= 0 || dtRaw > 120) { dyn.t = dyn.n = 0; return; }
      dyn.t += dtRaw; dyn.n++;
      if (dyn.n < 6) return;
      const avg = dyn.t / dyn.n; dyn.t = dyn.n = 0;
      if (avg > 19.5) {
        dyn.good = 0; dyn.calm = 0;
        if (now - dyn.drop < 2500 && dyn.s < dyn.ceil) dyn.ceil = Math.max(dyn.min, dyn.s);   // gerade erst hochgeregelt und schon wieder zu langsam: dort bleiben
        dyn.s = Math.max(dyn.min, dyn.s * Math.max(.82, Math.sqrt(17 / avg))); dyn.drop = now;
      } else if (avg < 18.2) {
        if (dyn.s < dyn.ceil - .001 && ++dyn.good >= 6) { dyn.s = Math.min(dyn.ceil, dyn.s + .03); dyn.good = 0; }
        if (now - dyn.drop > 20000 && dyn.ceil < 1) { dyn.ceil = Math.min(1, dyn.ceil + .1); dyn.drop = now; }   // später wieder ausprobieren
      } else dyn.good = 0;
    }
    let last = performance.now(), shiftNow = 0, landK = 0, lodAt = 0, lodTiny = null;
    const _lodV = new THREE.Vector3();
    let paused = false, whiteRoom = false, dead = false;
    function frame(now) {
      if (dead) return;
      adaptScale(now);
      const dt = Math.max(0, Math.min(.05, (now - last) / 1000)); last = now;
      const k = 1 - Math.exp(-dt * 3.4);
      if (cam.auto && !drag) {
        // Beim Haus pendelt der Blick über Vorder- und Seitenansichten (hinten verdecken Ufer-Palmen und Häuser das Haus),
        // nur über der Landkarte dreht er sich ganz herum.
        const amp = cam.preset === 'start' ? .5 : cam.view === 'land' ? .7 : 1.1; cam.osc += dt * cam.auto / amp; cam.tgt.az = cam.baseAz + amp * Math.sin(cam.osc);
      }
      ['az', 'pol', 'dist', 'tx', 'ty', 'tz', 'fov'].forEach(key => { cam.cur[key] += (cam.tgt[key] - cam.cur[key]) * k; });
      const c = cam.cur;
      const fit = Math.max(1, 1.55 / camera.aspect), dd = c.dist * fit;
      // Im weiten Blick steht das Grundstück rechts der Mitte (links liegt der Aufgabentext): Blickpunkt zur Seite versetzt
      landK += ((cam.view === 'land' ? 1 : 0) - landK) * k;
      const side = landK * dd * .075, lx = c.tx - side * Math.cos(c.az), lz = c.tz + side * Math.sin(c.az);
      camera.position.set(lx + dd * Math.sin(c.pol) * Math.sin(c.az), c.ty + dd * Math.cos(c.pol), lz + dd * Math.sin(c.pol) * Math.cos(c.az));
      camera.lookAt(lx, c.ty, lz);
      if (camera.fov !== c.fov) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
      if (Math.abs(shiftNow - cam.shift) > .0005) { shiftNow += (cam.shift - shiftNow) * k; cam.shiftApplied = shiftNow; applyShift(canvas.clientWidth || 1, canvas.clientHeight || 1); }
      // Sonne folgt dem Blickpunkt, damit die Schatten im Bild scharf bleiben
      sun.target.position.set(c.tx, 0, c.tz); sun.position.copy(sun.target.position).add(SUN_OFF);
      [foundG, houseG].forEach(o => { if (o.userData.lerpTo != null) { o.position.y += (o.userData.lerpTo - o.position.y) * (1 - Math.exp(-dt * 4)); if (Math.abs(o.userData.lerpTo - o.position.y) < .002) { o.position.y = o.userData.lerpTo; o.userData.lerpTo = null; } } });
      stepBuilds(now);
      applyExplode(dt); fxTick(now);
      // Detailstufe: nur im weiten Blick blenden kleine Dinge in großer Entfernung aus (beim Bauen bleibt alles wie gehabt)
      if (now - lodAt > 150) {
        lodAt = now;
        const cp = camera.position, far = landK > .02;
        // Winzige Einzelteile (Wäscheleinen, Kleinkram, Stäbe unter ~35 cm) einmal einsammeln, sobald der weite Blick beginnt
        if (far && !lodTiny) {
          lodTiny = [];
          world.traverse(o => { if (o.isMesh && !o.isInstancedMesh && o.visible && o.geometry) { const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); const sc = o.getWorldScale(_lodV).x; if (g.boundingSphere.radius * sc < .35) lodTiny.push(o); } });
        }
        if (lodTiny) {
          lodTiny.forEach(o => { o.visible = !far || cp.distanceTo(o.getWorldPosition(_lodV)) < 70; });
          if (!far) lodTiny = null;
        }
        for (let i = 0; i < LOD_CHUNKS.length; i++) {
          const m = LOD_CHUNKS[i], sz = m.userData.lodSize;
          if (sz > 1.2) continue;
          const bs = m.geometry.boundingSphere;
          m.visible = !far || cp.distanceTo(bs.center) - bs.radius < 30 + sz * 70;
        }
      }
      {
        const lively = Object.keys(builds).length || leavers.length || dusts.length || foundG.userData.lerpTo != null || houseG.userData.lerpTo != null;
        if (shadowDirty || now - shadowAt > (lively ? 28 : cam.view === 'land' ? 400 : 80)) { renderer.shadowMap.needsUpdate = true; shadowAt = now; shadowDirty = false; }
      }
      if (worldOn) W_.tick(dt, now / 1000);
      if (worldOn && cloudDeck) cloudDeck.rotation.y += dt * .011;
      if (worldOn && scud) { scud.rotation.y += dt * .03; scud.material.map.offset.y = Math.sin(now * .00005) * .03; }
      if (worldOn) stepStorm(now, now / 1000, dt, c);
      if (flut) { if (worldOn && !paused) flut.step(dt, now / 1000, { x: c.tx, z: c.tz }); water.visible = !worldOn && floodG.visible; }
      if (schaden && (worldOn || whiteRoom) && !paused) schaden.step(dt);
      else if (floodG.userData.target != null) {
        const tgt = floodG.userData.target, cur = floodG.scale.y, rate = floodG.userData.rate, goal = Math.max(.001, tgt);
        const next = rate ? cur + Math.sign(goal - cur) * Math.min(Math.abs(goal - cur), rate * dt) : cur + (goal - cur) * (1 - Math.exp(-dt * 1.6));
        floodG.scale.y = next;
        if (tgt === 0 && next < .01) { floodG.visible = false; floodG.userData.target = null; }
      }
      // in der Landschaft steigt eine große Wasserfläche statt des Blocks
      if (!flut) {
        water.visible = !worldOn;
        floodSheet.visible = worldOn && floodG.visible && floodG.scale.y > .002;
        floodSheet.position.y = floodLevel(floodG.scale.y);
      }
      wn.offset.set(now * .000004, now * .000008);
      if (clearK !== clearT) {
        clearK += (clearT - clearK) * (1 - Math.exp(-dt * 3.2)); if (Math.abs(clearT - clearK) < .004) clearK = clearT;
        const a = 1 - .76 * clearK;
        floodMat.opacity = .62 * a; floodSheetMat.opacity = .86 * a; if (flut) flut.setClarity(clearK);
      }
      renderer.toneMappingExposure = .9;
      if (worldOn) {
        // Gewitterstimmung: über den Zwischenpuffer mit Farbgrading
        gradeU.uExposure.value = 1.0;
        const vw = Math.max(1, Math.round(dyn.w * dyn.s)), vh = Math.max(1, Math.round(dyn.h * dyn.s));
        gradeRT.viewport.set(0, 0, vw, vh);
        gradeU.uRes.value.set(vw / dyn.w, vh / dyn.h); gradeU.uHalf.value.set(.5 / dyn.w, .5 / dyn.h);
        renderer.setRenderTarget(gradeRT); renderer.render(houseScene, camera);
        renderer.setRenderTarget(null); renderer.render(gradeScene, gradeCam);
      } else renderer.render(houseScene, camera);
      requestAnimationFrame(frame);
    }
    resize();
    // Vorwärmen: einmal alles zeichnen (auch das, was gerade außerhalb des Bildes liegt), damit Shader, Puffer und Texturen
    // schon auf der Grafikkarte liegen. Sonst ruckelt es, wenn die Kamera später zum ersten Mal dorthin schwenkt.
    let warmTimer = 0;
    function warmUp() {
      warmTimer = 0;
      if (!worldOn) return;
      const cs = []; houseScene.traverse(o => { if (o.isInstancedMesh && o.userData.chunked && o.frustumCulled) { cs.push(o); o.frustumCulled = false; } });
      try {
        renderer.shadowMap.needsUpdate = true;
        gradeRT.viewport.set(0, 0, dyn.w, dyn.h);
        renderer.setRenderTarget(gradeRT); renderer.render(houseScene, camera); renderer.setRenderTarget(null);
      } finally { cs.forEach(o => { o.frustumCulled = true; }); shadowDirty = true; }
    }
    function scheduleWarm() { if (!warmTimer) warmTimer = setTimeout(warmUp, 60); }
    scheduleWarm();
    requestAnimationFrame(frame);

    // Einzelbild (für die Szenario-Karten): Aufnahme mit eigenem Haus und Flut, freigestellt ohne Landschaft
    function snapshot(w, h, { view = 'house', cfg, name = 'overview', az, flood = false } = {}) {
      const keep = { cfg: { ...state.cfg }, cur: { ...cam.cur }, tgt: { ...cam.tgt }, view: cam.view, shift: cam.shift, preset: cam.preset, baseAz: cam.baseAz, flood: floodG.visible, fs: floodG.scale.y, world: worldOn };
      finishAll();
      setWorld(false);
      const keepPole = pole.visible; pole.visible = false; // Kartenbilder ohne Pegelstab
      const keepZoom = zoom; zoom = 1;
      if (cfg) setHouse(cfg, { animate: false });
      finishAll();
      cam.view = view; cam.shift = 0;
      if (name === 'site') Object.assign(cam.cur, cam.tgt, { az: .5, pol: 1.05, dist: 29, tx: 0, ty: .4, tz: .4, fov: 22 });
      else focus(name, { instant: true });
      if (az != null) cam.cur.az = cam.tgt.az = az;
      floodG.visible = !!flood; floodG.scale.y = flood ? 1 : .001; water.visible = true; floodSheet.visible = false;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.clearViewOffset(); camera.updateProjectionMatrix();
      const c = cam.cur;
      camera.position.set(c.tx + c.dist * Math.sin(c.pol) * Math.sin(c.az), c.ty + c.dist * Math.cos(c.pol), c.tz + c.dist * Math.sin(c.pol) * Math.cos(c.az));
      camera.lookAt(c.tx, c.ty, c.tz);
      sun.target.position.set(0, 0, 0); sun.position.copy(SUN_OFF);
      renderer.shadowMap.needsUpdate = true;
      renderer.render(houseScene, camera);
      shadowDirty = true;
      const out = document.createElement('canvas'); out.width = w; out.height = h;
      const og = out.getContext('2d'), bgGrad = og.createRadialGradient(w * .6, h * .4, 0, w * .6, h * .4, Math.max(w, h) * .8);
      bgGrad.addColorStop(0, '#fbfaf8'); bgGrad.addColorStop(1, '#e3dfd9');
      og.fillStyle = bgGrad; og.fillRect(0, 0, w, h); og.drawImage(renderer.domElement, 0, 0, w, h);
      const url = out.toDataURL('image/jpeg', .9);
      setHouse(keep.cfg, { animate: false });
      finishAll();
      Object.assign(cam.cur, keep.cur); Object.assign(cam.tgt, keep.tgt); cam.view = keep.view; cam.shift = keep.shift; cam.preset = keep.preset; cam.baseAz = keep.baseAz;
      floodG.visible = keep.flood; floodG.scale.y = keep.fs;
      setWorld(keep.world); zoom = keepZoom; pole.visible = keepPole;
      resize();
      return url;
    }

    /* ---- V3: Explosionsansicht, weißer Raum, Pause, Antippen, Aufräumen ---- */
    let exK = 0, exT = 0;
    function setExplode(on, { instant = false } = {}) { exT = on ? 1 : 0; if (instant) { exK = exT; applyExplode(0, true); } }
    function applyExplode(dt, force) {
      if (exK === exT && !force) return;
      if (!force) { exK += (exT - exK) * (1 - Math.exp(-dt * 2.4)); if (Math.abs(exT - exK) < .002) exK = exT; }
      const EXP = EXPD();
      wallG.position.y = exK * EXP.wall; roofG.position.y = exK * EXP.roof;
      extraG.position.y = exK * (state.cfg.extra === 'frame' ? EXP.frame : EXP.down); platformG.position.y = exK * EXP.down;
      shadowPlane.position.y = -.51 + (whiteRoom ? exK * EXP.down * 1.35 : 0);
      shadowDirty = true;
    }
    // Weißer Raum: keine Landschaft, kein Boden, nur das Haus (die Schäden bleiben sichtbar und laufen weiter)
    function setWhiteRoom(on) {
      whiteRoom = on;
      setWorld(!on);
      if (on) {
        siteBlock.visible = false; weeds.visible = false; contact.visible = false; stakes.visible = false; pole.visible = false;
        // Ergebnis: Schäden noch kurz in den Ruhezustand laufen lassen, dann alles einfrieren (kein Wasser, kein Staub, nichts bewegt sich mehr)
        if (schaden) for (let i = 0; i < 260; i++) schaden.step(.05);
        site.traverse(o => { if (o.isSprite) o.visible = false; });
        paused = true; shadowDirty = true;
      }
      else { paused = false; const show = !!(state.cfg.foundation || state.cfg.wall); weeds.visible = show; contact.visible = show; stakes.visible = !state.cfg.foundation && state.cfg.extra !== 'platform'; shadowPlane.position.y = -.51; }
      applyExplode(0, true);
    }

    // Hervorheben und Ausgrauen einzelner Bauteile (Ergebnis und Zusammenfassung). Jedes Bauteil bekommt dafür eigene Material-Kopien.
    const fxState = { focus: null, hover: null, hint: false }, fxMats = new Map(), FX_ORDER = ['foundation', 'wall', 'roof', 'extra'];
    const partGroupsOf = () => ({ foundation: [foundG], wall: [wallG], roof: [roofG], extra: [extraG, platformG] });
    function fxApply() {
      const groups = partGroupsOf();
      Object.entries(groups).forEach(([kind, list]) => {
        const mode = fxState.hover === kind ? 'hover' : (fxState.focus && fxState.focus !== kind ? 'dim' : (fxState.hint ? 'hint' : 'normal'));
        list.forEach(g => g.traverse(o => {
          if (!o.isMesh || Array.isArray(o.material)) return;
          let rec = fxMats.get(o);
          if (mode === 'normal') { if (rec) { o.material = rec.orig; fxMats.delete(o); } return; }
          if (!rec) {
            const orig = o.material, c = orig.clone();
            c.onBeforeCompile = orig.onBeforeCompile; c.customProgramCacheKey = orig.customProgramCacheKey; c.userData = { ...orig.userData };
            rec = { orig, c, t: orig.transparent, o: orig.opacity, dw: orig.depthWrite }; fxMats.set(o, rec); o.material = c;
          }
          const c = rec.c;
          if (mode === 'dim') { c.transparent = true; c.opacity = .16; c.depthWrite = false; if (c.emissive) c.emissive.setRGB(0, 0, 0); }
          else { c.transparent = rec.t; c.opacity = rec.o; c.depthWrite = rec.dw; if (c.emissive) c.emissive.setRGB(1, .93, .8); }
          c.needsUpdate = true;
          rec.mode = mode; rec.idx = FX_ORDER.indexOf(kind);
        }));
      });
    }
    // Glitzern des Bauteils unter dem Finger (wird in frame() aufgerufen)
    function fxTick(now) {
      if (!fxMats.size) return;
      // Antippbar: ein Glanz wandert nacheinander über die Bauteile (Touch kennt kein Darüberfahren). Gedrückt: kräftiger Glanz.
      fxMats.forEach(rec => {
        if (!rec.c.emissive) return;
        if (rec.mode === 'hover') rec.c.emissiveIntensity = .34 + .08 * Math.sin(now * .02);
        else if (rec.mode === 'hint') rec.c.emissiveIntensity = .02 + .5 * Math.max(0, Math.sin(now * .0035 - rec.idx * 1.25)) ** 2;
      });
    }
    function setPartFx(o) { ['focus', 'hover', 'hint'].forEach(k => { if (o[k] !== undefined) fxState[k] = o[k]; }); fxApply(); }
    function setPaused(on) { paused = !!on; }
    // Freie Kamerfahrt: beliebige Werte (az, pol, dist, tx, ty, tz, fov) als Ziel
    function cameraTo(o, { instant = false } = {}) { Object.assign(cam.tgt, o); if (instant) Object.assign(cam.cur, cam.tgt); }
    // Welches Bauteil liegt unter dem Finger? Gibt 'foundation' | 'wall' | 'roof' | 'extra' zurück (oder null).
    const pickRay = new THREE.Raycaster(), ndc = new THREE.Vector2();
    function pick(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      camera.updateMatrixWorld(); pickRay.setFromCamera(ndc, camera);
      const groups = [['roof', roofG], ['wall', wallG], ['foundation', foundG], ['extra', extraG], ['extra', platformG]];
      let best = null;
      groups.forEach(([kind, g]) => {
        if (!g.visible) return;
        const hit = pickRay.intersectObject(g, true).find(h => h.object.visible && !h.object.isSprite);
        if (hit && (!best || hit.distance < best.d)) best = { kind, d: hit.distance };
      });
      return best ? best.kind : null;
    }
    function destroy() { dead = true; try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) { /* egal */ } }
    // Char: Schilf und Gras auf Insel und Sandbänken
    if (CHAR) {
      const geo = grassTuftGeo(91, 16, .35, .55, .2), mat = addWind(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .85, envMapIntensity: .4 }), .07, .4, 0, true);
      const rr = rng(404), pts = [];
      for (let i = 0; i < 1400 && pts.length < 420; i++) {
        const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * 105, x = Math.cos(a) * d, z = Math.sin(a) * d, y = worldHeight(x, z);
        if (y < -1.5 || y > .45 || (Math.abs(x) < 4.8 && Math.abs(z) < 3.8)) continue;
        pts.push([x, y, z, .9 + rr() * 1.3, rr() * 6]);
      }
      const im = new THREE.InstancedMesh(geo, mat, pts.length), d3 = new THREE.Object3D(), c3 = new THREE.Color();
      pts.forEach(([x, y, z, sc, ry], i) => { d3.position.set(x, y - .04, z); d3.rotation.set(0, ry, 0); d3.scale.setScalar(sc); d3.updateMatrix(); im.setMatrixAt(i, d3.matrix); c3.setRGB(.85 + rr() * .15, .8 + rr() * .2, .65 + rr() * .1); im.setColorAt(i, c3); });
      im.receiveShadow = true; world.add(im);
    }

    setHouse({}, { animate: false });
    focus('overview', { instant: true });

    // floodInfo(): Pegel am Haus (m), ob das Wasser oben angekommen ist, und die aktuelle Phase des Sturms
    const floodInfo = () => flut ? flut.info() : { level: floodG.scale.y * FLOOD_H, done: floodG.scale.y > .995, phase: 0, phaseText: '' };
    // damageInfo(): was die Flut mit diesem Haus macht (Texte und Werte je Bauteil, für Simulation und Ergebnis)
    const damageInfo = cfg => schaden ? schaden.summary(cfg || state.cfg) : null;
    const damageState = () => schaden ? schaden.info() : null;
    return { setPartFx, setExplode, setWhiteRoom, setPaused, cameraTo, pick, destroy, parts: { platformG, foundG, wallG, roofG, extraG }, isChar: CHAR, floodInfo, damageInfo, damageState, flut, _schaden: schaden, setHouse, focus, setView, setShift, setAuto, setFlood, setClear, setPole, setRain, setRecord, setMeadow, setDrag, snapshot, resize, state, renderer, cam, camera, fx, scene: houseScene, dyn };
  }

  // kit: Materialien und Bau-Helfer für die 3D-Querschnitte (schnitt3d.js), damit sie dieselben Texturen zeigen wie das Haus
  return { create, liftOf, M, H, W, D, PARTS, kit: { Materials, boxGeo, mesh, beam, slab } };
})();
