// Unten (iPad): Beim Antippen einer Auswahl fliegen die Materialien dieser Auswahl aus dem Button nach oben aus dem Bild.
// Oben (Fernseher) kommen sie am unteren Rand wieder herein und bauen das Bauteil (siehe Bau-Animation in haus3d.js).
// Welche Materialien fliegen, steht in Haus3D.PARTS (eine Liste für oben und unten).
//
//   Flug.launch(buttonElement, 'brick');
//
const Flug = (() => {
  // Aussehen der Teile als kleine Zeichnungen (CSS), Größen in rem wie die übrige Oberfläche
  const LOOK = {
    brick:   { w: 2.4, h: 1.0, r: '.18rem', bg: 'linear-gradient(160deg,#d27650,#a24a2e)', sh: 'inset 0 -.15rem 0 rgba(70,25,10,.35), inset 0 .1rem 0 rgba(255,220,200,.35)' },
    clod:    { w: 1.6, h: 1.3, r: '48% 52% 44% 56% / 55% 45% 55% 45%', bg: 'radial-gradient(circle at 35% 30%,#c09a70,#8a6644 70%)' },
    mudclod: { w: 1.6, h: 1.3, r: '52% 48% 56% 44% / 45% 55% 45% 55%', bg: 'radial-gradient(circle at 35% 30%,#b39272,#7f6248 70%)' },
    sod:     { w: 1.9, h: .8, r: '.25rem', bg: 'linear-gradient(#7fae4a 0 40%,#8a6644 40%)' },
    sack:    { w: 2.6, h: 1.6, r: '.6rem', bg: 'radial-gradient(circle at 40% 35%,#f1e7d0,#cdbf9e)', sh: 'inset 0 -.2rem 0 rgba(120,100,60,.25)' },
    cement:  { w: 1.1, h: 1.3, r: '50% 50% 50% 50% / 60% 60% 40% 40%', bg: 'radial-gradient(circle at 35% 30%,#c4c6c2,#8e908c 70%)' },
    block:   { w: 2.0, h: 1.2, r: '.15rem', bg: 'linear-gradient(160deg,#cfceca,#9e9d98)', sh: 'inset 0 -.15rem 0 rgba(60,60,60,.25)' },
    rebar:   { w: 3.2, h: .28, r: '.2rem', bg: 'repeating-linear-gradient(90deg,#8a5a40 0 .3rem,#6d4430 .3rem .45rem)' },
    plaster: { w: 1.2, h: 1.1, r: '50%', bg: 'radial-gradient(circle at 35% 30%,#fbf6ea,#d8cfbc 70%)' },
    bamboo:  { w: 3.4, h: .45, r: '.25rem', bg: 'repeating-linear-gradient(90deg,#cfc77c 0 1rem,#8e8a3e 1rem 1.12rem)' },
    plank:   { w: 3.4, h: .6, r: '.12rem', bg: 'linear-gradient(#d9a877,#a8774a)', sh: 'inset 0 -.1rem 0 rgba(80,45,20,.3)' },
    sheet:   { w: 3.0, h: 1.6, r: '.12rem', bg: 'repeating-linear-gradient(90deg,#c9d0d4 0 .25rem,#8f989e .25rem .5rem)' },
    straw:   { w: 1.0, h: 2.4, r: '.4rem', bg: 'repeating-linear-gradient(90deg,#e0c478 0 .12rem,#b8964c .12rem .22rem)' },
    tile:    { w: 1.8, h: 1.2, r: '50% 50% .2rem .2rem / 80% 80% .2rem .2rem', bg: 'linear-gradient(90deg,#9a4528,#d06a40 50%,#9a4528)' },
    tuft:    { w: 1.4, h: 2.0, r: '0', bg: 'linear-gradient(#9ccb5c,#4f7d2e)', clip: 'polygon(50% 0,62% 55%,95% 20%,72% 100%,28% 100%,5% 20%,38% 55%)' },
    pipe:    { w: 2.6, h: .6, r: '.3rem', bg: 'linear-gradient(#6a9cc8,#2f5d8a)' },
  };

  let layer = null;
  function getLayer() {
    if (layer && layer.isConnected) return layer;
    layer = document.createElement('div');
    layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:50;overflow:hidden';
    document.body.append(layer);
    return layer;
  }

  function piece(kind) {
    const L = LOOK[kind] || LOOK.block, e = document.createElement('div');
    e.style.cssText = `position:absolute;left:0;top:0;width:${L.w}rem;height:${L.h}rem;margin:${-L.h / 2}rem 0 0 ${-L.w / 2}rem;border-radius:${L.r};background:${L.bg};box-shadow:${L.sh ? L.sh + ',' : ''}0 .4rem .8rem rgba(30,35,40,.25);${L.clip ? `clip-path:${L.clip};` : ''}will-change:transform,opacity`;
    return e;
  }

  function launch(btn, id) {
    if (!btn || !btn.getBoundingClientRect || !window.Element.prototype.animate) return;
    const kinds = (window.Haus3D && Haus3D.PARTS && Haus3D.PARTS[id]) || ['block'];
    const box = btn.getBoundingClientRect(), root = getLayer();
    const cx = box.left + box.width / 2, cy = box.top + box.height * .45;
    const n = 16;
    for (let i = 0; i < n; i++) {
      const e = piece(kinds[i % kinds.length]);
      root.append(e);
      const x0 = cx + (Math.random() - .5) * box.width * .5, y0 = cy + (Math.random() - .5) * box.height * .3;
      const x1 = x0 + (Math.random() - .5) * box.width * .9, y1 = -80 - Math.random() * 120;   // oben aus dem Bild
      const xm = (x0 + x1) / 2 + (Math.random() - .5) * 120, ym = y0 - (y0 - y1) * .35;
      const r0 = (Math.random() - .5) * 60, r1 = r0 + (Math.random() - .5) * 540, s = .8 + Math.random() * .5;
      const delay = i * 38 + Math.random() * 60, dur = 800 + Math.random() * 300;
      const a = e.animate([
        { transform: `translate(${x0}px,${y0}px) rotate(${r0}deg) scale(.2)`, opacity: 0 },
        { transform: `translate(${x0}px,${y0 - 20}px) rotate(${r0}deg) scale(${s})`, opacity: 1, offset: .12 },
        { transform: `translate(${xm}px,${ym}px) rotate(${(r0 + r1) / 2}deg) scale(${s})`, opacity: 1, offset: .45 },
        { transform: `translate(${x1}px,${y1}px) rotate(${r1}deg) scale(${s * .9})`, opacity: 1 },
      ], { duration: dur, delay, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'both' });
      a.onfinish = () => e.remove();
    }
    // kleiner Staubring am Button
    const ring = document.createElement('div');
    ring.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;width:1rem;height:1rem;margin:-.5rem 0 0 -.5rem;border-radius:50%;border:.25rem solid rgba(255,255,255,.85)`;
    root.append(ring);
    ring.animate([{ transform: 'scale(1)', opacity: .9 }, { transform: 'scale(14)', opacity: 0 }], { duration: 650, easing: 'ease-out' }).onfinish = () => ring.remove();
  }

  return { launch };
})();
