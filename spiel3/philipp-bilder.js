// Bilder und Texte der Einführung, übernommen aus dem Prototyp „Jeremy“ (prototyp-userflow-jeremy/app.js).
'use strict';

/* ---------- Weltkarte zum Einzoomen (nur grob, von Hand gezeichnet; keine Messdaten) ---------- */
const WORLD_LANDS = [
  [[-168,65.5],[-156,71],[-141,69.5],[-128,70],[-115,68],[-95,72],[-85,69],[-82,63],[-93,58.5],[-88,56],[-79,52],[-78,62],[-69,59],[-62,57],[-56,52],[-66,45],[-70,42],[-75,38],[-76,35],[-81,31],[-80,26],[-82,26],[-84,30],[-90,29],[-97,27],[-97,22],[-92,18.5],[-87,21],[-88,16],[-83,15],[-83,10],[-78,8],[-80,7.5],[-86,11],[-87,13],[-92,14.5],[-97,16],[-105,20],[-110,24],[-112,29],[-115,31],[-117,32.5],[-121,35],[-124,40],[-124,47],[-128,51],[-133,55],[-140,59.5],[-148,60],[-153,58],[-158,56.5],[-163,55],[-158,58.5],[-162,60],[-165,62]],
  [[-73,78],[-60,82],[-30,83],[-18,80],[-20,72],[-30,68],[-43,60],[-50,63],[-55,68],[-60,76]],
  [[-80,8],[-72,12],[-62,10.5],[-52,5],[-50,0],[-44,-2.5],[-35,-5.5],[-39,-14],[-41,-22],[-48,-26],[-54,-34.5],[-58,-38],[-65,-41],[-66,-47],[-69,-52],[-68,-55],[-73,-52],[-75,-46],[-73,-38],[-71,-30],[-70,-18],[-76,-14],[-81,-6],[-80,-2],[-78,2],[-77,7]],
  [[-17,21],[-13,28],[-9.5,32],[-6,35.8],[10,37.2],[11,33],[20,31.5],[32,31],[34,28],[37,22],[43,12],[51,12],[51,10],[42,-1],[40,-10],[40.5,-15],[35,-24],[32.5,-28.5],[27,-34],[20,-35],[18,-31],[14,-22],[12,-17],[13.5,-11],[9,-1],[9.5,4],[5,5.5],[-4,5],[-8,4.5],[-13,8],[-17,14.5]],
  [[-9,37],[-5.5,36],[0,38.5],[3,42],[8,44],[12,42],[16,38],[18,40],[13,45],[19,42],[23,37],[26,40],[29,41],[27,37],[30,36.5],[36,36.5],[35,33],[34,31],[35,28],[38,24],[43,13],[52,16],[59,22],[56,26.2],[50,26],[48,29.5],[50,30],[56,27],[62,25.2],[67,24.5],[72.5,21],[73,16],[77,8],[80,10],[80,15.5],[86,20],[88,22],[92,21],[94,16],[98,16],[98,8],[100,13],[103,10],[105,9],[107,11],[109,13],[109,21.5],[106,20],[108,22],[111,21.5],[117,23.5],[122,30],[121.5,37],[118,38.5],[122,40.5],[126,38],[126,35],[129,35.5],[129,41],[133,43],[140,48],[141,53],[137,54],[141,59],[150,59],[156,57],[156,52],[160,53],[162,58],[170,60],[180,65],[180,69],[170,70],[160,70],[150,71],[140,72],[130,71],[113,74],[105,77.5],[95,76],[88,75],[80,73],[73,69],[68,69],[66,72],[60,69],[55,68],[45,68],[41,66],[34,66],[41,64],[37,64],[33,69],[25,71],[15,69],[12,66],[5,62],[5,59],[8,58],[11,59],[12,56],[14,55.5],[17,57],[19,60],[17,62],[22,65.5],[25,65],[21,61],[23,60],[29,60.5],[24,59.3],[21,57],[19,54.5],[14,54],[9,54.5],[4,52],[2,51],[-1.5,49.5],[-4.5,48.5],[-1.5,46],[-1.5,43.5],[-9,43]],
  [[-5,50],[1.5,51],[0,53],[-2,56],[-3,58.5],[-6,58],[-5,55],[-3,54],[-5,52]],
  [[130,31],[135,34],[140,36],[142,40],[141,45],[145,44],[142,42],[139,38],[136,36],[131,34]],
  [[95,5.5],[98,4],[104,-2],[106,-6],[102,-4],[97,1]],
  [[109,1],[117,7],[119,1],[116,-4],[111,-3]],
  [[105,-6],[114,-7.5],[114,-8.5],[106,-7]],
  [[131,-1],[141,-2.5],[150,-10],[142,-9],[138,-8],[132,-4]],
  [[114,-22],[122,-18],[129,-15],[136,-12],[137,-16],[141,-12],[143,-14],[146,-19],[153,-25],[153,-30],[150,-37],[146,-39],[141,-38],[137,-35],[132,-32],[124,-34],[115,-34],[114,-26]],
  [[44,-25],[47,-25],[50,-15],[49,-12],[44,-17]],
  [[80,6],[82,7.5],[80,9.5],[79.8,8]],
];
// Gleiche Breite und Höhe in Grad, Ausschnitt: von Südamerika bis zum Pazifik
const WORLD_VIEW = [0, 8, 360, 164];       // ganze Welt (Länge 0..360, Breite 82..-82)
const WORLD_BD = [90.2, 23.8];
const WORLD_HOLD_MS = 1300, WORLD_ZOOM_MS = 6500, WORLD_FADE_MS = 900;   // Weltkarte stehen lassen, Zoom, Überblenden
function worldSvg() {
  const pt = ([lo, la]) => `${(lo + 180).toFixed(1)} ${(90 - la).toFixed(1)}`;
  const [bx, by] = [WORLD_BD[0] + 180, 90 - WORLD_BD[1]];
  const land = WORLD_LANDS.map(p => `M${p.map(pt).join('L')}Z`).join('');
  const grid = [...Array(13)].map((_, k) => `M${(k * 30).toFixed(0)} 0V180`).join('') + [...Array(7)].map((_, k) => `M0 ${(k * 30).toFixed(0)}H360`).join('');
  return `<svg class="fl-worldsvg" viewBox="${WORLD_VIEW.join(' ')}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Weltkarte, Bangladesch ist markiert">
    <rect x="-100" y="-100" width="700" height="500" fill="#0d2a3d"/>
    <g class="fl-world-cam">
      <path d="${grid}" fill="none" stroke="#2a5470" stroke-width=".25" vector-effect="non-scaling-stroke" opacity=".5"/>
      <path class="fl-world-land" d="${land}"/>
      <circle class="fl-world-ping" cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="1.5"/>
      <circle class="fl-world-dot" cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r=".9"/>
    </g>
  </svg>`;
}

// Weltkarte: ganz außen starten und gleichmäßig (im Logarithmus des Maßstabs) auf das Land zoomen, bis es so groß ist wie die Landeskarte.
// Die Bildschirmposition des Punkts wandert dabei sanft an die Stelle, an der Bangladesch in der Landeskarte steht.
let worldAnim = 0;
function playWorldZoom(world, cam, mapBox, instant) {
  const token = ++worldAnim;
  const [bx, by] = [WORLD_BD[0] + 180, 90 - WORLD_BD[1]];
  const dot = cam.querySelectorAll('.fl-world-ping, .fl-world-dot');
  const Q = 100 / 92;   // die Landeskarte ist in der Höhe etwas gestreckt (Länge 92, Breite 100 Einheiten pro Grad)
  const set = (s, cx, cy, dotOpacity) => { cam.setAttribute('transform', `translate(${cx} ${cy}) scale(${s} ${s * Q}) translate(${-bx} ${-by})`); dot.forEach(d => { d.style.opacity = dotOpacity; }); };
  const resetMap = () => { mapBox.style.transform = ''; mapBox.style.opacity = ''; mapBox.style.transformOrigin = ''; world.style.opacity = ''; };
  world.classList.remove('is-gone');
  set(1, bx, by, 1);
  if (instant || matchMedia('(prefers-reduced-motion: reduce)').matches) { resetMap(); world.classList.add('is-gone'); return; }
  const R = world.getBoundingClientRect(), B = mapBox.getBoundingClientRect();
  const [vx, vy, vw, vh] = WORLD_VIEW;
  const k = Math.max(R.width / vw, R.height / vh);                       // Pixel pro Grad (slice)
  const toU = (px, py) => [vx + (px - R.left - (R.width - vw * k) / 2) / k, vy + (py - R.top - (R.height - vh * k) / 2) / k];
  const k2 = Math.max(B.width / 540, B.height / 730);                    // Pixel pro Einheit der Landeskarte
  const S = (k2 * 92) / k;                                               // 92 Einheiten pro Grad Länge
  const [tx, ty] = toU(B.left + B.width / 2 + (MAPX(WORLD_BD[0]) - 260) * k2, B.top + B.height / 2 + (MAPY(WORLD_BD[1]) - 325) * k2);
  const fx = B.left + B.width / 2 + (MAPX(WORLD_BD[0]) - 260) * k2, fy = B.top + B.height / 2 + (MAPY(WORLD_BD[1]) - 325) * k2;
  mapBox.style.transformOrigin = `${fx - B.left}px ${fy - B.top}px`;
  mapBox.style.opacity = 0; mapBox.style.transform = `scale(${1 / S})`;
  const smooth = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  const ease = t => (1 - Math.cos(Math.PI * t)) / 2;
  const start = performance.now() + WORLD_HOLD_MS;
  const frame = now => {
    if (token !== worldAnim || !world.isConnected) return;
    const t = Math.min(1, Math.max(0, (now - start) / WORLD_ZOOM_MS)), e = ease(t);
    const s = Math.exp(Math.log(S) * e);
    const u = (1 - 1 / s) / (1 - 1 / S);
    const cx = bx + (tx - bx) * u, cy = by + (ty - by) * u;
    set(s, cx, cy, Math.max(0, 1 - e * 3));
    // Die Landeskarte zoomt im selben Maßstab mit und blendet über, sobald sie feiner zeichnet als die grobe Weltkarte
    const m = s / S, px = R.left + (R.width - vw * k) / 2 + (cx - vx) * k, py = R.top + (R.height - vh * k) / 2 + (cy - vy) * k;
    mapBox.style.transform = `translate(${(px - fx).toFixed(1)}px, ${(py - fy).toFixed(1)}px) scale(${m})`;
    mapBox.style.opacity = smooth((e - .12) / .45);
    world.style.opacity = 1 - smooth((e - .35) / .45);
    if (t < 1) requestAnimationFrame(frame);
    else { resetMap(); world.classList.add('is-gone'); }
  };
  requestAnimationFrame(frame);
}

/* ---------- Karte von Bangladesch ---------- */
// Vereinfachter Umriss (35 Punkte, die Mündung der Meghna von Hand geglättet), Quelle: github.com/johan/world.geo.json (BGD.geo.json). Lizenz vor einer Veröffentlichung prüfen.
const BD_OUTLINE = [[92.672721, 22.041239], [92.652257, 21.324048], [92.303234, 21.475485], [92.368554, 20.670883], [92.082886, 21.192195], [92.025215, 21.70157], [91.834891, 22.182936], [91.3, 22.45], [90.9, 22.3], [90.6, 22.0], [90.272971, 21.836368], [89.847467, 22.039146], [89.70205, 21.857116], [89.418863, 21.966179], [89.031961, 22.055708], [88.876312, 22.879146], [88.52977, 23.631142], [88.69994, 24.233715], [88.084422, 24.501657], [88.306373, 24.866079], [88.931554, 25.238692], [88.209789, 25.768066], [88.563049, 26.446526], [89.355094, 26.014407], [89.832481, 25.965082], [89.920693, 25.26975], [90.872211, 25.132601], [91.799596, 25.147432], [92.376202, 24.976693], [91.915093, 24.130414], [91.46773, 24.072639], [91.158963, 23.503527], [91.706475, 22.985264], [91.869928, 23.624346], [92.146035, 23.627499]];
// Flüsse von Hand nach Lage der großen Ströme gezeichnet (schematisch, keine Messdaten).
const BD_RIVERS = [
  { id: 'jamuna', cls: 'main', pts: [[89.95, 26.9], [89.85, 26.4], [89.75, 25.95], [89.7, 25.6], [89.65, 25.3], [89.7, 24.9], [89.75, 24.45], [89.76, 24.1], [89.75, 23.75]] },
  { id: 'padma', cls: 'main', pts: [[87.7, 24.7], [88.1, 24.5], [88.45, 24.35], [88.8, 24.2], [89.0, 24.0], [89.4, 23.85], [89.75, 23.75], [90.2, 23.5], [90.55, 23.3], [90.7, 23.1], [90.85, 22.7], [90.95, 22.2]] },
  { id: 'meghna', cls: 'main', pts: [[92.9, 25.2], [92.5, 25.0], [92.2, 24.9], [91.8, 24.8], [91.3, 24.6], [91.0, 24.35], [90.9, 24.05], [90.8, 23.6], [90.7, 23.15]] },
  { id: 'teesta', cls: 'side', pts: [[88.7, 26.3], [89.1, 26.1], [89.45, 25.8], [89.65, 25.4]] },
  { id: 'altbr', cls: 'side', pts: [[89.95, 25.45], [90.3, 24.9], [90.6, 24.3], [90.9, 24.05]] },
  { id: 'surma', cls: 'side', pts: [[91.9, 25.1], [91.6, 24.7], [91.3, 24.6]] },
  { id: 'gorai', cls: 'side', pts: [[89.4, 23.85], [89.3, 23.4], [89.5, 22.9], [89.7, 22.3], [89.8, 21.95]] },
  { id: 'karno', cls: 'side', pts: [[92.2, 22.8], [91.95, 22.4], [91.8, 22.25]] },
];
const BD_HILLS = [
  { name: 'Chittagong Hill Tracts', pts: [[92.1, 22.0], [91.86, 22.4], [91.87, 23.62], [92.14, 23.62], [92.64, 22.1]], label: [92.12, 23.3] },
  { name: 'Hügel im Nordosten', pts: [[91.2, 25.13], [91.8, 25.15], [92.37, 24.98], [92.05, 24.4], [91.7, 24.3]], label: [91.5, 25.3] },
];
const MAPX = lon => (lon - 87.7) * 92, MAPY = lat => (26.9 - lat) * 100;
const mapPt = ([lo, la]) => `${MAPX(lo).toFixed(1)} ${MAPY(la).toFixed(1)}`;
const mapPoly = a => `M${a.map(mapPt).join('L')}Z`;
// Geschlossene, weich abgerundete Fläche (Kurven über die Mittelpunkte der Kanten)
function mapBlob(a) {
  const p = a.map(([lo, la]) => [MAPX(lo), MAPY(la)]), n = p.length, f = v => v.toFixed(1);
  const mid = (u, v) => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2];
  let d = `M${mid(p[n - 1], p[0]).map(f).join(' ')}`;
  for (let k = 0; k < n; k++) d += `Q${f(p[k][0])} ${f(p[k][1])} ${mid(p[k], p[(k + 1) % n]).map(f).join(' ')}`;
  return d + 'Z';
}
// Weiche Linie durch die Punkte (quadratische Kurven über die Mittelpunkte)
function mapCurve(a) {
  const p = a.map(([lo, la]) => [MAPX(lo), MAPY(la)]);
  let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let k = 1; k < p.length - 1; k++) d += `Q${p[k][0].toFixed(1)} ${p[k][1].toFixed(1)} ${((p[k][0] + p[k + 1][0]) / 2).toFixed(1)} ${((p[k][1] + p[k + 1][1]) / 2).toFixed(1)}`;
  return d + `L${p[p.length - 1][0].toFixed(1)} ${p[p.length - 1][1].toFixed(1)}`;
}
const SIRAJ = [89.72, 24.45];

function mapArt() {
  const coast = BD_OUTLINE.slice(3, BD_OUTLINE.findIndex(p => p[0] === 89.031961) + 1);   // Teknaf bis Westküste
  const sea = `M${coast.map(mapPt).join('L')}L${MAPX(88.7)} ${MAPY(21.65)}L${MAPX(87.8)} ${MAPY(21.45)}L-1500 ${MAPY(21.3)}L-1500 2800L${MAPX(93) + 1500} 2800L${MAPX(93) + 1500} ${MAPY(19)}L${MAPX(93)} ${MAPY(19)}L${MAPX(92.7)} ${MAPY(20)}Z`;
  const L = (t, lon, lat, cls = '') => `<text class="fl-map-label ${cls}" x="${MAPX(lon).toFixed(1)}" y="${MAPY(lat).toFixed(1)}">${t}</text>`;
  const svg = `<svg class="fl-map" viewBox="-10 -40 540 730" role="img" aria-label="Karte von Bangladesch mit den großen Flüssen">
    <rect x="-1500" y="-1500" width="4000" height="4000" fill="#151f26"/>
    <path class="fl-myanmar" d="${mapPoly([[92.673, 22.041], [92.652, 21.324], [92.303, 21.475], [92.369, 20.671], [92.7, 20.0], [96, 19.0], [96, 23.9], [93.3, 23.1]])}"/><path class="fl-border" d="${mapCurve([[92.673, 22.041], [92.95, 22.5], [93.3, 23.1], [96, 24.2]])}"/><path d="${sea}" fill="#0d2a3d"/><path d="${sea}" fill="url(#fl-wave)" opacity=".7"/><path d="${sea}" fill="none" stroke="#2f6f8c" stroke-width="2" opacity=".6"/>
    <defs><pattern id="fl-wave" width="44" height="16" patternUnits="userSpaceOnUse"><path d="M0 8Q11 0 22 8T44 8" fill="none" stroke="#2c6482" stroke-width="1.3"/></pattern><clipPath id="fl-clip"><path d="${mapBlob(BD_OUTLINE)}"/></clipPath></defs>
    <g class="cam">
      <path class="fl-land" d="${mapBlob(BD_OUTLINE)}"/>
      <g class="fl-plain-tint"><path d="${mapBlob(BD_OUTLINE)}"/></g>
      <g class="fl-hills" clip-path="url(#fl-clip)">${BD_HILLS.map(h => `<path d="${mapPoly(h.pts)}"/>`).join('')}</g>
      <g class="fl-rivers" fill="none" stroke-linecap="round" stroke-linejoin="round">${BD_RIVERS.map(r => `<path class="fl-river ${r.cls}" pathLength="1" d="${mapCurve(r.pts)}"/>`).join('')}${BD_RIVERS.map(r => `<path class="fl-river-flow ${r.cls}" d="${mapCurve(r.pts)}"/>`).join('')}</g>
      <path class="fl-land-line" d="${mapBlob(BD_OUTLINE)}"/>
      ${L('Indien', 89.2, 26.85, 'big')}${L('Myanmar', 92.85, 21.55, 'big')}
      <text class="fl-map-label sea-big" x="${MAPX(90.15).toFixed(1)}" y="${MAPY(21.05).toFixed(1)}" text-anchor="middle">Golf von Bengalen</text>
      ${L('Bangladesch', 90.55, 24.85, 'country')}
      <g class="fl-sundarbans" clip-path="url(#fl-clip)"><path d="${mapBlob([[89.0, 22.05], [89.45, 21.95], [89.85, 22.04], [89.78, 22.45], [89.3, 22.78], [89.0, 22.5]])}"/><text class="fl-map-label hill" x="${MAPX(89.12).toFixed(1)}" y="${MAPY(22.2).toFixed(1)}">Sundarbans</text></g>
      <g class="fl-cities">${[['Dhaka', 90.41, 23.81], ['Chattogram', 91.83, 22.34], ['Khulna', 89.55, 22.82], ['Rajshahi', 88.6, 24.37]].map(([n, lo, la]) => `<circle cx="${MAPX(lo).toFixed(1)}" cy="${MAPY(la).toFixed(1)}" r="3"/><text class="fl-map-label city" x="${(MAPX(lo) + 6).toFixed(1)}" y="${(MAPY(la) + 4).toFixed(1)}">${n}</text>`).join('')}</g>
      <g class="fl-river-labels">${L('Jamuna', 89.8, 25.45)}${L('Padma', 89.1, 23.62)}${L('Meghna', 91.0, 23.7)}${L('Teesta', 88.7, 26.35)}</g>
      <g class="fl-hill-labels">${BD_HILLS.map(h => `<text class="fl-map-label hill" x="${MAPX(h.label[0]).toFixed(1)}" y="${MAPY(h.label[1]).toFixed(1)}">${h.name === 'Chittagong Hill Tracts' ? 'Hügelland' : 'Hügelland'}</text>`).join('')}</g>
      <g class="fl-siraj"><circle class="ring" cx="${MAPX(SIRAJ[0]).toFixed(1)}" cy="${MAPY(SIRAJ[1]).toFixed(1)}" r="5"/><circle cx="${MAPX(SIRAJ[0]).toFixed(1)}" cy="${MAPY(SIRAJ[1]).toFixed(1)}" r="3.2"/><text x="${(MAPX(SIRAJ[0]) + 7).toFixed(1)}" y="${(MAPY(SIRAJ[1]) + 4).toFixed(1)}">Sirajganj</text></g>
    </g>
  </svg>`;
  const box = el('div', 'fl-map-wrap');
  box.innerHTML = svg;
  const detail = el('div', 'fl-detail');
  detail.innerHTML = geoArt();
  box.append(detail);
  const world = el('div', 'fl-world');
  world.innerHTML = worldSvg();
  const worldCam = world.querySelector('.fl-world-cam');
  const cam = box.querySelector('.cam');
  const ORDER = ['outline', 'rivers', 'plain', 'flood', 'zoom', 'detail'];
  const s = 3.6, px = MAPX(SIRAJ[0]), py = MAPY(SIRAJ[1]);
  return {
    el: box,
    overlay: world,   // liegt vollflächig über der Szene (wird von der Seite eingehängt)
    introMs: WORLD_HOLD_MS + WORLD_ZOOM_MS + WORLD_FADE_MS * .6,
    show(view, _i, instant) {
      // Erster Absatz: Weltkarte, dann Zoom auf Bangladesch, dann blendet die Weltkarte aus und die Landeskarte steht da
      if (_i === 0) playWorldZoom(world, worldCam, box, instant);
      const at = ORDER.indexOf(view);
      ORDER.forEach((name, k) => box.classList.toggle(`has-${name}`, k <= at));
      ORDER.forEach((name, k) => box.classList.toggle(`is-${name}`, k === at));   // is-… = gerade im Fokus (wird hervorgehoben)
      box.classList.toggle('is-instant', !!instant);
      cam.style.transform = at >= ORDER.indexOf('zoom') ? `translate(${(245 - s * px).toFixed(1)}px, ${(340 - s * py).toFixed(1)}px) scale(${s})` : 'none';
    },
  };
}

/* ---------- Bilder für Gesellschaft und Extra-Szenario ---------- */
/* ---------- Bilder für Einführung, Extra-Szenario und Fazit ----------
   Im Stil des Aufgabenbildes (RIVER_ART): Blick von oben, grünes Land, Fluss von oben nach unten, kleine Häuser mit Dach.
   Alle Bilder sind 560 × 680 und füllen die Fläche rechts ganz aus (slice). */
const SV_DEFS = `<defs>
  <path id="sv-leaf" d="M0 0Q16-13 38 1Q16-4 0 0Z"/>
  <g id="sv-palm"><path fill="none" stroke="#6d5236" stroke-width="4.5" stroke-linecap="round" d="M0 0Q-3-30 6-58"/>
    <g fill="#3f7a46" transform="translate(6 -58)"><use href="#sv-leaf" transform="rotate(-165)"/><use href="#sv-leaf" transform="rotate(-120) scale(.9)"/><use href="#sv-leaf" transform="rotate(-65) scale(.9)"/><use href="#sv-leaf" transform="rotate(-20)"/><use href="#sv-leaf" transform="rotate(25) scale(.85)"/><use href="#sv-leaf" transform="rotate(155) scale(.85)"/></g></g>
  <path id="sv-tuft" fill="#5f9150" d="M-9 0Q-13-14-20-23Q-7-12-4 0ZM-2 0Q-6-18 0-31Q6-18 3 0ZM4 0Q7-12 18-25Q11-8 9 0Z"/>
  <g id="sv-bush"><circle cx="-10" r="11"/><circle cx="8" r="13"/><circle cx="0" cy="-9" r="11"/></g>
  <g id="sv-hut"><ellipse cy="1" rx="34" ry="7" fill="#4f7a40" opacity=".55"/><rect x="-22" y="-26" width="44" height="26" fill="#e3c799"/><path stroke="#cdae7c" stroke-width="1.5" d="M-22-18H22M-22-9H22"/><rect x="-6" y="-17" width="12" height="17" fill="#4b3526"/><path d="M-30-24L-16-46H16L30-24Z"/></g>
  <g id="sv-mud"><ellipse cy="1" rx="34" ry="7" fill="#4f7a40" opacity=".55"/><rect x="-22" y="-26" width="44" height="26" fill="#a98763"/><rect x="-6" y="-17" width="12" height="17" fill="#4b3526"/><path d="M-30-24L0-52L30-24Z" fill="#d1b45f"/><path d="M-30-24L0-52" stroke="#a58a3d" stroke-width="1.5"/></g>
  <g id="sv-tin"><ellipse cy="1" rx="34" ry="7" fill="#4f7a40" opacity=".55"/><rect x="-22" y="-26" width="44" height="26" fill="#aab2b5"/><path stroke="#cfd5d7" stroke-width="1.6" d="M-16-26V0M-8-26V0M0-26V0M8-26V0M16-26V0"/><rect x="-6" y="-17" width="12" height="17" fill="#3b2e22"/><path d="M-30-24L-16-46H16L30-24Z" fill="#8c9ba2"/></g>
  <g id="sv-brick"><ellipse cy="1" rx="34" ry="7" fill="#4f7a40" opacity=".55"/><rect x="-22" y="-26" width="44" height="26" fill="#c06b4e"/><path stroke="#e3c7a8" stroke-width="1.3" d="M-22-18H22M-22-9H22M-8-26V-18M8-18V-9M-8-9V0"/><rect x="-6" y="-17" width="12" height="17" fill="#3b2e22"/><rect x="-27" y="-35" width="54" height="9" fill="#a7a49b"/></g>
  <g id="sv-stilt"><ellipse cy="1" rx="30" ry="6" fill="#3f6a3a" opacity=".5"/><path stroke="#ada661" stroke-width="3.5" stroke-linecap="round" d="M-18 0V-14M-6 0V-14M6 0V-14M18 0V-14"/><rect x="-24" y="-18" width="48" height="5" fill="#9f784c"/><rect x="-20" y="-38" width="40" height="20" fill="#d3c78c"/><rect x="-5" y="-31" width="10" height="13" fill="#4b3526"/><path d="M-27-36L-14-54H14L27-36Z" fill="#b99a56"/></g>
  <g id="sv-bamboo"><path d="M0 0V-50M9 0V-62M18 0V-44" stroke="#b8b068" stroke-width="4" stroke-linecap="round"/><path d="M0-50Q-12-60-22-56M9-62Q22-72 32-66M18-44Q30-52 38-46" stroke="#6f9a52" stroke-width="3" fill="none" stroke-linecap="round"/></g>
  <g id="sv-boat"><path fill="#4b3526" d="M-20 0Q0-10 20 0Q0 10-20 0Z"/><rect x="-8" y="-4" width="14" height="8" rx="3" fill="#d9b67c"/></g>
</defs>`;
const svUse = (id, x, y, fill = '', s = 1) => `<use href="#${id}" transform="translate(${x} ${y})${s !== 1 ? ` scale(${s})` : ''}"${fill ? ` fill="${fill}"` : ''}/>`;
const svLabel = (t, x, y, anchor = 'start', size = 19) => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Inter, system-ui, sans-serif" font-size="${size}" font-weight="700" fill="#fff" stroke="#2f4a3a" stroke-width="4.5" paint-order="stroke" stroke-linejoin="round">${t}</text>`;
const svRiver = (d, w, sandExtra = 10) => `<path fill="none" stroke="#dcc892" stroke-width="${w + sandExtra * 2}" stroke-linecap="round" d="${d}"/><path fill="none" stroke="#7fc3da" stroke-width="${w + sandExtra}" stroke-linecap="round" d="${d}"/><path fill="none" stroke="#3f8fb2" stroke-width="${w - 18}" stroke-linecap="round" d="${d}"/>
  <g fill="none" stroke="#a9dcea" stroke-linecap="round" opacity=".75"><path class="rv-flow" stroke-width="3" stroke-dasharray="16 44" d="${d}"/><path class="rv-flow" stroke-width="2" stroke-dasharray="10 50" transform="translate(${w / 5} 4)" d="${d}"/><path class="rv-flow" stroke-width="2" stroke-dasharray="12 48" transform="translate(${-w / 5} -3)" d="${d}"/></g>`;
// Land: großzügig über den Bildrand hinaus gezeichnet, damit die Bilder die ganze Fläche füllen, auch wenn sie herausgezoomt sind.
const SV_LAND = `<rect x="-700" y="-500" width="2000" height="1900" fill="#8fb56b"/><path fill="#a4c67c" d="M300-10H570V130L450 150L340 90Z"/><path fill="#7ea65d" d="M-10 200L90 180L180 260L150 360L-10 390Z"/><path fill="#b3cf88" d="M340 440L570 420V600L430 640L370 560Z"/><path fill="#9dbf74" d="M-10 560L90 540L180 690H-10Z"/><path fill="#a4c67c" d="M560 -40L760 -60V200L620 220Z"/><path fill="#7ea65d" d="M-300 380L-80 360L-20 520L-300 560Z"/>`;
// Ausschnitt: etwas herausgezoomt (viewBox größer als das Motiv), der Inhalt liegt in der rechten Hälfte, weil links der Text steht.
const svScene = (inner, label) => `<svg class="fl-art" viewBox="-70 -50 700 780" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}">${SV_DEFS}${inner}</svg>`;
// Flüsse laufen über den oberen und unteren Rand hinaus
const svLong = d => d.replace(/^M(\S+) -60/, 'M$1 -400L$1 -60').replace(/(\S+) 740$/, '$1 740L$1 1100');

// Sirajganj am Jamuna: breiter Fluss von oben nach unten, in der Mitte eine runde Char, das Haus steht am rechten Ufer
function geoArt(arrow = false) {
  const d = svLong('M300 -60C275 120 355 210 330 340S285 540 320 740');
  return svScene(`${SV_LAND}${svRiver(d, 190, 10)}
    <g class="sv-island"><ellipse cx="332" cy="348" rx="50" ry="60" fill="#e4cf98" stroke="#c9b178" stroke-width="3.5"/>
    <use href="#sv-tuft" x="320" y="338"/><use href="#sv-tuft" x="346" y="372"/><use href="#sv-tuft" x="332" y="318"/></g>
    <use href="#sv-boat" transform="translate(252 150) rotate(95)"/><use href="#sv-boat" transform="translate(402 560) rotate(80)"/>
    ${svUse('sv-tuft', 60, 120)}${svUse('sv-tuft', 120, 560)}${svUse('sv-bush', 110, 300, '#5f9150')}${svUse('sv-bush', 90, 640, '#6b9b58')}
    <g transform="translate(150 200)"><use href="#sv-palm"/></g><g transform="translate(120 450)"><use href="#sv-palm"/></g>
    ${svUse('sv-hut', 150, 330, '#c1553a', 1.3)}${svUse('sv-hut', 90, 400, '#8c9ba2', .9)}${svUse('sv-hut', 130, 590, '#b8693f', 1.1)}${svUse('sv-bush', 60, 470, '#6b9b58')}
    ${svUse('sv-hut', 535, 410, '#c1553a', 1.25)}<g transform="translate(590 230)"><use href="#sv-palm"/></g>${svUse('sv-bush', 450, 470, '#6b9b58')}
    ${svUse('sv-hut', 540, 140, '#8c9ba2')}${svUse('sv-hut', 530, 540, '#c1553a')}${svUse('sv-bush', 470, 630, '#6b9b58')}
    ${svLabel('Jamuna', 420, 100)}${arrow ? '' : svLabel('Char', 420, 350)}
    ${arrow ? `<path d="M520 262C470 262 430 300 392 336" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M381 346L408 336L394 318Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>${svLabel('Char', 540, 250, 'end', 24)}` : ''}`, 'Der Jamuna bei Sirajganj mit einer runden Flussinsel in der Mitte');
}

// Drei Hausarten, von einfach zu massiv
function wealthArt() {
  const row = (y, id, title, sub) => `<g transform="translate(250 ${y})">${svUse(id, 0, 0, '', 1.6)}</g>${svLabel(title, 330, y - 12)}${svLabel(sub, 330, y + 13, 'start', 14)}`;
  return svScene(`${SV_LAND}
    ${svUse('sv-tuft', 140, 70)}${svUse('sv-tuft', 560, 650)}${svUse('sv-bush', 560, 40, '#6b9b58')}${svUse('sv-bush', 140, 640, '#5f9150')}
    ${row(190, 'sv-mud', 'Lehm und Gras', 'wer wenig hat')}${row(380, 'sv-tin', 'Wellblech', 'günstig und leicht')}${row(570, 'sv-brick', 'Ziegel und Beton', 'wer es sich leisten kann')}`, 'Drei Hausarten: Lehm und Gras, Wellblech, Ziegel und Beton');
}

// Festland nahe am Ufer: Fluss links, Dorf auf dem Land rechts
function bankScene() {
  const d = svLong('M160 -60C140 140 210 270 180 410S155 600 190 740');
  return svScene(`${SV_LAND}${svRiver(d, 96, 12)}
    <use href="#sv-boat" transform="translate(172 200) rotate(96)"/>
    ${svUse('sv-tuft', 290, 70)}${svUse('sv-hut', 380, 130, '#c1553a')}<g transform="translate(500 150)"><use href="#sv-palm"/></g>${svUse('sv-hut', 490, 230, '#8c9ba2')}
    ${svUse('sv-bush', 310, 260, '#6b9b58')}${svUse('sv-hut', 390, 340, '#b8693f')}${svUse('sv-hut', 500, 430, '#c1553a')}<g transform="translate(310 470)"><use href="#sv-palm"/></g>
    ${svUse('sv-hut', 380, 540, '#8c9ba2')}${svUse('sv-bush', 530, 600, '#5f9150')}${svUse('sv-tuft', 450, 640)}`, 'Dorf auf dem Festland am Flussufer');
}

// Flussinsel (Char): Wasser rundherum
function charScene(withHouse = true, erode = false) {
  const d = svLong('M340 -60C305 130 380 250 345 380S310 570 340 740');
  const svg = svScene(`${SV_LAND}${svRiver(d, 330, 12)}
    <g class="sv-island"><ellipse cx="348" cy="372" rx="108" ry="116" fill="#e4cf98" stroke="#c9b178" stroke-width="3.5"/>
    ${svUse('sv-tuft', 300, 310)}${svUse('sv-tuft', 410, 440)}${svUse('sv-tuft', 380, 296)}</g>
    ${withHouse ? `<g class="sv-islhouses">${svUse('sv-tin', 330, 372, '', 1.3)}${svUse('sv-tin', 398, 432, '', 1.05)}<g transform="translate(290 438)"><use href="#sv-palm"/></g></g>` : ''}
    <use href="#sv-boat" transform="translate(190 520) rotate(80)"/><use href="#sv-boat" transform="translate(520 620) rotate(100)"/>`, 'Flussinsel (Char) mit Wasser rundherum');
  return erode ? svg.replace('class="fl-art"', 'class="fl-art is-eroding"') : svg;
}

// Hügelland: Hügel, Bambus, Häuser auf Stelzen
function hillScene() {
  return svScene(`<rect x="-700" y="-500" width="2000" height="1900" fill="#86a874"/>
    <path fill="#7ea65d" d="M-400 120Q130 20 280 110T900 90V330H-400Z"/>
    <path fill="#6f9a52" d="M-400 260Q150 160 300 260T900 230V500H-400Z"/>
    <path fill="#5f8c47" d="M-400 420Q170 320 320 420T900 400V900H-400Z"/>
    <path d="M-400 120Q130 20 280 110T900 90M-400 260Q150 160 300 260T900 230M-400 420Q170 320 320 420T900 400" fill="none" stroke="#a9c78a" stroke-width="3" opacity=".7"/>
    ${svUse('sv-bamboo', 170, 200)}${svUse('sv-bamboo', 210, 215)}${svUse('sv-bamboo', 540, 330)}${svUse('sv-bamboo', 575, 345)}${svUse('sv-bamboo', 160, 560)}${svUse('sv-bamboo', 200, 575)}
    ${svUse('sv-stilt', 360, 205, '', 1.4)}${svUse('sv-stilt', 270, 400, '', 1.2)}${svUse('sv-stilt', 450, 520, '', 1.4)}
    ${svUse('sv-tuft', 320, 300)}${svUse('sv-tuft', 500, 460)}${svUse('sv-tuft', 240, 620)}`, 'Hügelland mit Häusern auf Stelzen');
}

// Regen über den Bildern: wenige, feine, schräge Tropfen, die langsam fallen (wie in der großen Szene).
function rainLayer() {
  const d = el('div', 'fl-rain');
  d.innerHTML = `<svg width="100%" height="100%" aria-hidden="true"><defs><pattern id="fl-drops" width="180" height="180" patternUnits="userSpaceOnUse"><path d="M26 14l-4 16M120 60l-4 16M62 118l-4 16M150 140l-4 16M92 8l-3 12" stroke="#dbe9f2" stroke-width="1.6" stroke-linecap="round" fill="none"/></pattern></defs><rect class="fl-rain-move" x="-300" y="-300" width="3200" height="2200" fill="url(#fl-drops)"/></svg>`;
  return d;
}

// Bildwechsel: jede Ansicht ist eine Ebene, die ein- und ausblendet
function sceneArt(layers, zoomKeys = [], rainy = false) {
  const box = el('div', `fl-scenes${rainy ? ' is-rainy' : ''}`);
  const nodes = {};
  Object.entries(layers).forEach(([key, html]) => { const d = el('div', `fl-scene${zoomKeys.includes(key) ? ' zoom-in' : ''}`); d.innerHTML = html; nodes[key] = d; box.append(d); });
  if (rainy) box.append(rainLayer());
  return {
    el: box, nodes,
    show(view) { Object.entries(nodes).forEach(([key, d]) => d.classList.toggle('is-on', key === view)); },
  };
}

const GEO_BEATS = [
  { view: 'outline', text: 'Bangladesch liegt in Südasien, am Golf von Bengalen. Es grenzt an Indien und an Myanmar. Auf knapp 150.000 km² leben mehr als 170 Millionen Menschen.' },
  { view: 'rivers', text: 'Das Land liegt im Delta von drei riesigen Strömen:\nDem Padma, dem Jamuna und der Meghna. Dazu kommen hunderte kleinere Flüsse und Nebenarme, die sich ständig verzweigen.' },
  { view: 'plain', text: 'Die Flüsse haben das Land über Jahrtausende selbst aufgeschüttet. Rund 80 % von Bangladesch sind flaches Schwemmland. Nur im Südosten und im Nordosten gibt es Hügel.' },
  { view: 'flood', text: 'Setzt der Monsun ein und kommt Schmelzwasser aus dem Himalaya dazu, treten die Flüsse über die Ufer. Deshalb ist die Überflutungsgefahr hier so hoch, und das macht das Bauen schwierig:\nEin Haus muss Wasser, Strömungen und aufgeweichtem Boden standhalten, und das mit den Mitteln, die man vor Ort hat.' },
  { view: 'zoom', text: 'Für die kommende Aufgabe befinden wir uns in Sirajganj, mitten im Land am Jamuna, einem der größten Flüsse der Welt.' },
  { view: 'detail', text: 'Der Jamuna verlegt ständig seinen Lauf. Aus Sand und Schlamm entstehen mitten im Fluss Flussinseln, die Chars. Menschen leben auf dem Festland am Ufer und auf diesen Inseln.' },
];
const SOC_BEATS = [
  { view: 'wealth', text: 'Wie in vielen anderen Ländern entscheidet auch in Bangladesch der Wohlstand darüber, wo du lebst und aus welchen Materialien du dein Haus zusammenbauen kannst.' },
  { view: 'bank', text: 'Die meisten Menschen leben auf dem flachen Festland, in dicht besiedelten Dörfern nahe an den Flüssen. Wer es sich leisten kann, baut mit Ziegeln und Beton oder mit Wellblech und schüttet den Boden etwas auf.' },
  { view: 'char', text: 'Auf den Chars wohnen oft die, die sich kein anderes Land leisten können, meist ohne gesicherte Landrechte und ohne Schutz durch Deiche. Dort baut man mit dem, was leicht und günstig ist. Etwa 10 Millionen Menschen leben auf Chars.' },
  { view: 'hills', text: 'Nur wenige Menschen leben in den Hügeln im Südosten und Nordosten. Dort baut man häufig leicht aus Bambus und auf Stelzen.' },
  { view: 'bank', text: 'Genug Hintergrund:\nSchauen wir uns jetzt dein Szenario an, deine Challenge.' },
];

