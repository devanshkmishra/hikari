// Parade walkers: everything that marches on little legs (or rolls, or hops).
// Units are centimetres. Each spec also carries how it moves; parade.js reads that.

import { INK, C, F, rr, ell, circ, poly, paint, stroke, fill, shine, text, vtext, face, rng } from './kit.js';

// ------------------------------------------------------------------ shared bits
function knob(g, x, y, r) {
  circ(g, x, y, r);
  paint(g, '#3a3644', [x - r, y - r, 2 * r, 2 * r], { lw: 1.6, gloss: 0.45 });
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + r * 0.55, y - r * 0.62);
  stroke(g, '#ece8f4', 1);
}

export function antenna(g, cx, y0, spread = 26, hgt = 24, s = 1) {
  const tips = [[cx - spread, y0 - hgt], [cx + spread, y0 - hgt + 3 * s]];
  for (const [tx, ty] of tips) {
    g.beginPath();
    g.moveTo(cx, y0 + 2 * s);
    g.lineTo(tx, ty);
    stroke(g, INK, 2.6 * s);
    g.beginPath();
    g.moveTo(cx, y0 + 2 * s);
    g.lineTo(tx, ty);
    stroke(g, '#e6e9f2', 1.1 * s);
    circ(g, tx, ty, 2.8 * s);
    paint(g, C.chrome, [tx - 3 * s, ty - 3 * s, 6 * s, 6 * s], { lw: 1.6 * s, gloss: 0.6 });
  }
  ell(g, cx, y0 + 1 * s, 9 * s, 5 * s);
  paint(g, '#3a3644', [cx - 9 * s, y0 - 4 * s, 18 * s, 10 * s], { lw: 2 * s, gloss: 0.35 });
}

function woodGrain(g, x, y, w, h, seed, a = 0.16) {
  const r = rng(seed);
  g.save();
  g.strokeStyle = `rgba(60,28,10,${a})`;
  g.lineWidth = Math.max(0.6, h * 0.012);
  for (let i = 0; i < Math.floor(h / 3.2); i++) {
    const yy = y + 2 + i * 3.2 + r() * 1.5;
    g.beginPath();
    g.moveTo(x, yy);
    for (let k = 1; k <= 6; k++) g.lineTo(x + (k / 6) * w, yy + (r() - 0.5) * 1.6);
    g.stroke();
  }
  g.restore();
}

export function screenFace(g, x, y, w, h, f, bg = ['#b9f7ff', '#3aa6d8']) {
  const gr = g.createRadialGradient(x + w / 2, y + h / 2, 2, x + w / 2, y + h / 2, w * 0.72);
  gr.addColorStop(0, bg[0]);
  gr.addColorStop(1, bg[1]);
  g.fillStyle = gr;
  g.fillRect(x, y, w, h);
  face(g, x + w / 2, y + h * 0.42, w * 0.62, { mouth: f % 2 ? 'open' : 'smile' });
}

export function screenBars(g, x, y, w, h) {
  const cols = ['#ececec', '#ece63c', '#3cd8e2', '#3ce24c', '#e23cd8', '#e23c3c', '#3c4ce2'];
  const bw = w / 7;
  cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(x + i * bw, y, bw + 0.3, h * 0.68); });
  const c2 = ['#3c4ce2', '#151515', '#e23cd8', '#151515', '#3cd8e2', '#151515', '#ececec'];
  c2.forEach((c, i) => { g.fillStyle = c; g.fillRect(x + i * bw, y + h * 0.68, bw + 0.3, h * 0.08); });
  [['#0e2a4a', 0, 0.18], ['#fafafa', 0.18, 0.18], ['#2a0e4a', 0.36, 0.18], ['#121212', 0.54, 0.46]].forEach(([c, a, b]) => {
    g.fillStyle = c;
    g.fillRect(x + w * a, y + h * 0.76, w * b + 0.3, h * 0.24);
  });
}

export function screenSnow(g, x, y, w, h, seed) {
  const r = rng(seed);
  const s = 1.4;
  for (let yy = y; yy < y + h; yy += s) {
    for (let xx = x; xx < x + w; xx += s) {
      const v = Math.floor(40 + r() * 215);
      g.fillStyle = `rgb(${v},${v},${Math.min(255, v + 10)})`;
      g.fillRect(xx, yy, s, s);
    }
  }
}

// the empty rural station, on a live camera, at night (Act I's channel)
export function screenStation(g, x, y, w, h, f, osd = true) {
  const sk = g.createLinearGradient(0, y, 0, y + h);
  sk.addColorStop(0, '#0b1636');
  sk.addColorStop(0.5, '#23305e');
  sk.addColorStop(0.68, '#45406e');
  sk.addColorStop(1, '#191a2a');
  g.fillStyle = sk;
  g.fillRect(x, y, w, h);
  const r = rng(11);
  g.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 26; i++) g.fillRect(x + r() * w, y + r() * h * 0.45, w * 0.008, w * 0.008);
  g.fillStyle = '#121833';
  g.beginPath();
  g.moveTo(x, y + h * 0.62);
  for (let i = 0; i <= 10; i++) g.lineTo(x + (i / 10) * w, y + h * (0.55 + 0.05 * Math.sin(i * 1.9) + 0.03 * Math.sin(i * 4.1)));
  g.lineTo(x + w, y + h);
  g.lineTo(x, y + h);
  g.fill();
  // utility pole + wires
  g.strokeStyle = 'rgba(8,8,18,0.9)';
  g.lineWidth = w * 0.014;
  g.beginPath();
  g.moveTo(x + w * 0.84, y + h * 0.16);
  g.lineTo(x + w * 0.84, y + h * 0.74);
  g.moveTo(x + w * 0.79, y + h * 0.22);
  g.lineTo(x + w * 0.89, y + h * 0.22);
  g.stroke();
  g.lineWidth = w * 0.005;
  g.beginPath();
  g.moveTo(x, y + h * 0.3);
  g.quadraticCurveTo(x + w * 0.4, y + h * 0.37, x + w * 0.8, y + h * 0.22);
  g.moveTo(x, y + h * 0.35);
  g.quadraticCurveTo(x + w * 0.42, y + h * 0.42, x + w * 0.88, y + h * 0.22);
  g.stroke();
  // platform
  g.fillStyle = '#4b4a5c';
  g.beginPath();
  g.moveTo(x, y + h * 0.76);
  g.lineTo(x + w, y + h * 0.7);
  g.lineTo(x + w, y + h * 0.79);
  g.lineTo(x, y + h * 0.87);
  g.fill();
  g.fillStyle = 'rgba(230,210,120,0.8)';
  g.beginPath();
  g.moveTo(x, y + h * 0.775);
  g.lineTo(x + w, y + h * 0.715);
  g.lineTo(x + w, y + h * 0.725);
  g.lineTo(x, y + h * 0.787);
  g.fill();
  // rails
  g.strokeStyle = 'rgba(160,160,190,0.5)';
  g.lineWidth = w * 0.005;
  g.beginPath();
  g.moveTo(x, y + h * 0.93);
  g.lineTo(x + w, y + h * 0.85);
  g.moveTo(x, y + h * 0.98);
  g.lineTo(x + w, y + h * 0.9);
  g.stroke();
  // lamp
  const lx = x + w * 0.3;
  const ly = y + h * 0.34;
  g.fillStyle = '#16161f';
  g.fillRect(lx - w * 0.008, ly, w * 0.016, h * 0.42);
  g.fillRect(lx - w * 0.04, ly - h * 0.01, w * 0.08, h * 0.02);
  const a = f % 2 ? 0.72 : 1;
  const lg = g.createRadialGradient(lx, ly + h * 0.02, 0, lx, ly + h * 0.02, w * 0.34);
  lg.addColorStop(0, `rgba(255,240,200,${0.95 * a})`);
  lg.addColorStop(0.25, `rgba(255,214,150,${0.32 * a})`);
  lg.addColorStop(1, 'rgba(255,200,150,0)');
  g.fillStyle = lg;
  g.fillRect(x, y, w, h);
  // bench
  g.fillStyle = '#1c1c28';
  g.fillRect(x + w * 0.44, y + h * 0.68, w * 0.18, h * 0.025);
  g.fillRect(x + w * 0.45, y + h * 0.7, w * 0.012, h * 0.05);
  g.fillRect(x + w * 0.6, y + h * 0.7, w * 0.012, h * 0.05);
  // station name board
  g.fillStyle = '#e9e7dc';
  g.fillRect(x + w * 0.62, y + h * 0.5, w * 0.2, h * 0.08);
  g.fillStyle = '#2a6a3a';
  g.fillRect(x + w * 0.62, y + h * 0.565, w * 0.2, h * 0.015);
  g.fillStyle = '#16161f';
  g.fillRect(x + w * 0.635, y + h * 0.58, w * 0.01, h * 0.1);
  g.fillRect(x + w * 0.795, y + h * 0.58, w * 0.01, h * 0.1);
  if (osd) text(g, 'CH 3', x + w * 0.07, y + h * 0.12, h * 0.11, { font: F.dot, weight: 400, color: '#7dff8a', align: 'left', glow: 2 });
}

function crtGlass(g, x, y, w, h) {
  g.fillStyle = 'rgba(0,0,0,0.13)';
  for (let yy = y; yy < y + h; yy += 1.6) g.fillRect(x, yy, w, 0.6);
  const gr = g.createRadialGradient(x + w * 0.3, y + h * 0.22, 1, x + w * 0.45, y + h * 0.45, w * 0.8);
  gr.addColorStop(0, 'rgba(255,255,255,0.36)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.04)');
  gr.addColorStop(1, 'rgba(0,0,20,0.32)');
  g.fillStyle = gr;
  g.fillRect(x, y, w, h);
}

// ------------------------------------------------------------------ CRT TVs
function tv(g, f, o) {
  const { y0 = 26, cab = C.silver, scr = 'face', wood = false, seed = 3, ant = true } = o;
  if (ant) antenna(g, 42, y0);
  rr(g, 2, y0, 80, 64, 10);
  paint(g, cab, [2, y0, 80, 64], { gloss: 0.38, shade: 0.34 });
  if (wood) {
    g.save();
    rr(g, 2, y0, 80, 64, 10);
    g.clip();
    woodGrain(g, 2, y0, 80, 64, seed);
    g.restore();
  }
  rr(g, 8, y0 + 7, 53, 49, 8);
  paint(g, '#2b2838', [8, y0 + 7, 53, 49], { gloss: 0.12, shade: 0.2, lw: 2 });
  const sx = 11.5, sy = y0 + 10.5, sw = 46, sh = 42;
  g.save();
  rr(g, sx, sy, sw, sh, 10);
  g.clip();
  if (scr === 'face') screenFace(g, sx, sy, sw, sh, f);
  else if (scr === 'pink') screenFace(g, sx, sy, sw, sh, f, ['#ffd6ea', '#ff6fa8']);
  else if (scr === 'bars') screenBars(g, sx, sy, sw, sh);
  else if (scr === 'snow') screenSnow(g, sx, sy, sw, sh, seed + f * 17);
  else if (scr === 'station') screenStation(g, sx, sy, sw, sh, f);
  crtGlass(g, sx, sy, sw, sh);
  g.restore();
  rr(g, sx, sy, sw, sh, 10);
  stroke(g, INK, 1.4);
  knob(g, 71.5, y0 + 15, 5.2);
  knob(g, 71.5, y0 + 29, 4.2);
  g.fillStyle = 'rgba(34,24,58,0.5)';
  for (let i = 0; i < 5; i++) {
    rr(g, 65, y0 + 39 + i * 3.4, 13, 1.5, 0.7);
    g.fill();
  }
  for (const fx of [12, 59]) {
    rr(g, fx, y0 + 62, 13, 5, 2);
    paint(g, '#2b2838', [fx, y0 + 62, 13, 5], { lw: 1.4, gloss: 0.2 });
  }
}

function shako(g) {
  rr(g, 27, 16, 30, 32, 4);
  paint(g, C.red, [27, 16, 30, 32], { gloss: 0.3 });
  g.fillStyle = C.gold;
  g.fillRect(27, 40, 30, 4);
  g.fillRect(27, 18.5, 30, 2);
  g.beginPath();
  g.moveTo(42, 23);
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? 2.6 : 6;
    g.lineTo(42 + Math.cos(a) * rad, 30 + Math.sin(a) * rad);
  }
  g.closePath();
  paint(g, C.gold, [36, 24, 12, 12], { lw: 1.2, gloss: 0.4 });
  ell(g, 42, 48, 18, 3.8);
  paint(g, '#1d1a24', [24, 44, 36, 8], { lw: 1.6, gloss: 0.5 });
  ell(g, 42, 9, 7, 10.5);
  paint(g, '#fbf8ff', [35, -1, 14, 21], { lw: 1.8, gloss: 0.2, shade: 0.25 });
  g.beginPath();
  g.moveTo(42, 2);
  g.quadraticCurveTo(40, 9, 42, 17);
  stroke(g, 'rgba(34,24,58,0.25)', 0.9);
}

function snareDrum(g, cx, dy, w = 56) {
  const x = cx - w / 2;
  g.beginPath();
  g.moveTo(x, dy);
  g.lineTo(x, dy + 18);
  g.ellipse(cx, dy + 18, w / 2, 5, 0, Math.PI, 0, true);
  g.lineTo(x + w, dy);
  g.closePath();
  paint(g, '#f6f2ea', [x, dy, w, 23], { gloss: 0.3, shade: 0.28 });
  g.beginPath();
  for (let i = 0; i <= 8; i++) {
    const xx = x + 2 + (i / 8) * (w - 4);
    const yy = i % 2 ? dy + 16 : dy + 4;
    if (i) g.lineTo(xx, yy); else g.moveTo(xx, yy);
  }
  stroke(g, '#9aa2b8', 1);
  for (const yy of [dy + 1.5, dy + 17]) {
    g.beginPath();
    g.ellipse(cx, yy, w / 2 + 1, 4.6, 0, 0, Math.PI);
    stroke(g, C.red, 3.2);
  }
  ell(g, cx, dy, w / 2, 5);
  paint(g, '#fffdf6', [x, dy - 5, w, 10], { lw: 2, gloss: 0.25, shade: 0.1 });
  ell(g, cx, dy, w / 2, 5);
  stroke(g, C.red, 2.4);
}

function trumpet(g, f) {
  // a cornet held up to the screen's mouth, bell flaring to the right
  const y = 66;
  rr(g, 30, y - 2.4, 40, 4.8, 2.4);
  paint(g, '#f2c64a', [30, y - 2.4, 40, 4.8], { lw: 1.6, gloss: 0.6 });
  rr(g, 40, y - 9, 18, 9, 3);
  paint(g, '#e8b83a', [40, y - 9, 18, 9], { lw: 1.6, gloss: 0.5 });
  for (const x of [44, 49, 54]) {
    rr(g, x - 1.2, y - 15, 2.4, 7, 1);
    paint(g, '#fff0b0', [x - 1.2, y - 15, 2.4, 7], { lw: 1, gloss: 0.5 });
  }
  g.beginPath();
  g.moveTo(68, y - 2.6);
  g.quadraticCurveTo(78, y - 4, 84, y - 13 - f * 2);
  g.lineTo(84, y + 13 + f * 2);
  g.quadraticCurveTo(78, y + 4, 68, y + 2.6);
  g.closePath();
  paint(g, '#f6cc52', [68, y - 15, 16, 30], { lw: 1.8, gloss: 0.55, shade: 0.3 });
  ell(g, 84, y, 2.6, 13 + f * 2);
  paint(g, '#b8862a', [81, y - 15, 6, 30], { lw: 1.6, gloss: 0.2 });
  rr(g, 27, y - 3, 5, 6, 2);
  paint(g, '#d9a23a', [27, y - 3, 5, 6], { lw: 1.2 });
}

const TV_ARMS = { kind: 'swing', sh: [[-0.47, 0.62], [0.47, 0.62]], len: 26 };
const TV_LEGS = { xs: [-0.24, 0.24], len: 30, shoe: '#2b2238' };

// ------------------------------------------------------------------ records + 帯
function recordDisc(g, f, label, seed) {
  const cx = 36, cy = 36;
  circ(g, cx, cy, 34);
  paint(g, '#17141d', [2, 2, 68, 68], { gloss: 0.12, shade: 0.2, lw: 2.4 });
  const r = rng(seed);
  for (let rad = 13.5; rad < 33; rad += 1.1) {
    circ(g, cx, cy, rad);
    g.lineWidth = 0.45;
    g.strokeStyle = `rgba(200,190,255,${0.05 + r() * 0.08})`;
    g.stroke();
  }
  for (const rad of [19, 24.5, 29]) {
    circ(g, cx, cy, rad);
    stroke(g, 'rgba(0,0,0,0.6)', 0.9);
  }
  circ(g, cx, cy, 12);
  paint(g, label, [24, 24, 24, 24], { lw: 1.2, gloss: 0.2, shade: 0.2 });
  g.fillStyle = 'rgba(34,24,58,0.75)';
  g.fillRect(cx - 7, cy - 6.5, 14, 1.5);
  g.fillRect(cx - 5, cy - 3.6, 10, 1);
  g.fillRect(cx - 6, cy + 4, 12, 1);
  g.beginPath();
  g.arc(cx, cy, 9.6, 0.3, 1.7);
  stroke(g, 'rgba(255,255,255,0.75)', 1.8);
  circ(g, cx, cy, 1.6);
  fill(g, '#0b0a10');
}

function recordObi(g, f, o) {
  const cx = 50, cy = 36;
  if (g.createConicGradient) {
    g.save();
    circ(g, cx, cy, 33);
    g.clip();
    const cg = g.createConicGradient(-Math.PI / 4, cx, cy);
    cg.addColorStop(0, 'rgba(255,255,255,0)');
    cg.addColorStop(0.06, 'rgba(220,210,255,0.24)');
    cg.addColorStop(0.12, 'rgba(255,255,255,0)');
    cg.addColorStop(0.5, 'rgba(255,255,255,0)');
    cg.addColorStop(0.56, 'rgba(220,210,255,0.16)');
    cg.addColorStop(0.62, 'rgba(255,255,255,0)');
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = cg;
    g.fillRect(cx - 34, cy - 34, 68, 68);
    g.restore();
  }
  const wv = f ? 1 : -1;
  g.beginPath();
  g.moveTo(3, 27 + wv * 2.2);
  g.quadraticCurveTo(50, 25, 97, 27 - wv * 2.2);
  g.lineTo(97, 45 - wv * 2.2);
  g.quadraticCurveTo(50, 43, 3, 45 + wv * 2.2);
  g.closePath();
  paint(g, C.paper, [3, 24, 94, 23], { lw: 1.8, gloss: 0.25, shade: 0.16 });
  g.beginPath();
  g.moveTo(5, 29.6 + wv * 2);
  g.quadraticCurveTo(50, 27.6, 95, 29.6 - wv * 2);
  stroke(g, o.band, 1.8);
  g.beginPath();
  g.moveTo(5, 42.4 + wv * 2);
  g.quadraticCurveTo(50, 40.4, 95, 42.4 - wv * 2);
  stroke(g, o.band, 0.8);
  text(g, o.txt, 50, 36.6, 8.6, { font: F.goth, weight: 700, color: INK, maxW: 66 });
}

// ------------------------------------------------------------------ sneakers
const KICKS = {
  takumi: { sole: '#2d2a30', mid: '#f4f2ec', mesh: '#ecebe4', sued: '#2f8a52', panel: '#1f1d24', lace: '#f8f8f4' },
  cherry: { sole: '#3a2d33', mid: '#f1eee8', mesh: '#cfd4de', sued: '#b0182f', panel: '#eceff6', lace: '#fafafa' },
  black: { sole: '#1e1c22', mid: '#a4a4b0', mesh: '#4a4954', sued: '#2a2930', panel: '#9198aa', lace: '#2a2930' },
};

function upperPath(g) {
  g.beginPath();
  g.moveTo(3, 16.5);
  g.quadraticCurveTo(1.5, 8, 6, 4.5);
  g.quadraticCurveTo(11, 6.5, 15, 7.5);
  g.lineTo(22, 2.5);
  g.quadraticCurveTo(26, 1.5, 28, 3.5);
  g.lineTo(50, 11);
  g.quadraticCurveTo(63, 13, 65.5, 19.5);
  g.lineTo(40, 18.5);
  g.closePath();
}

function sneaker(g, col) {
  g.beginPath();
  g.moveTo(4, 24);
  g.lineTo(58, 24.5);
  g.quadraticCurveTo(65, 24, 66, 20);
  g.lineTo(64.5, 27);
  g.quadraticCurveTo(40, 29.5, 6, 28.6);
  g.quadraticCurveTo(2, 27, 4, 24);
  paint(g, col.sole, [2, 20, 64, 9], { lw: 2, gloss: 0.15, shade: 0.2 });
  g.beginPath();
  g.moveTo(3, 16);
  g.lineTo(40, 18.5);
  g.quadraticCurveTo(58, 19.5, 65.5, 19.5);
  g.quadraticCurveTo(65, 23, 60, 24.8);
  g.lineTo(5, 24.8);
  g.quadraticCurveTo(1.5, 21, 3, 16);
  paint(g, col.mid, [1.5, 16, 64, 9], { lw: 2, gloss: 0.3, shade: 0.25 });
  upperPath(g);
  paint(g, col.mesh, [1.5, 1.5, 64, 18], { lw: 0, gloss: 0.3, shade: 0.28 });
  g.save();
  upperPath(g);
  g.clip();
  g.fillStyle = 'rgba(34,24,58,0.08)';
  for (let yy = 3; yy < 19; yy += 2.2) for (let xx = 2 + (yy % 4); xx < 66; xx += 2.6) g.fillRect(xx, yy, 0.9, 0.9);
  g.fillStyle = col.sued;
  g.beginPath();
  g.moveTo(0, 19);
  g.lineTo(0, 2);
  g.quadraticCurveTo(8, 5, 14, 8);
  g.quadraticCurveTo(16.5, 13, 13, 19.5);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(47, 20);
  g.quadraticCurveTo(49, 13, 55, 12);
  g.quadraticCurveTo(64, 13, 68, 20);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(15, 7.5);
  g.lineTo(22, 2.5);
  g.lineTo(28, 3.5);
  g.lineTo(50, 11);
  g.lineTo(47.5, 14.5);
  g.lineTo(27, 7.4);
  g.lineTo(18, 11.4);
  g.closePath();
  g.fill();
  g.fillStyle = col.panel;
  g.beginPath();
  g.moveTo(19, 19);
  g.quadraticCurveTo(24.5, 12, 31, 8.6);
  g.lineTo(36.5, 10.4);
  g.quadraticCurveTo(31, 14, 28, 19.2);
  g.closePath();
  g.fill();
  const sh = g.createLinearGradient(0, 2, 0, 20);
  sh.addColorStop(0, 'rgba(255,255,255,0.22)');
  sh.addColorStop(0.5, 'rgba(255,255,255,0)');
  sh.addColorStop(1, 'rgba(34,12,70,0.22)');
  g.fillStyle = sh;
  g.fillRect(0, 0, 68, 21);
  g.restore();
  upperPath(g);
  stroke(g, INK, 2);
  g.fillStyle = col.lace;
  for (let i = 0; i < 5; i++) {
    const lx = 25 + i * 4.8, ly = 4.6 + i * 1.6;
    g.save();
    g.translate(lx, ly);
    g.rotate(0.32);
    rr(g, -2.2, -0.85, 4.4, 1.7, 0.85);
    g.fill();
    g.restore();
  }
  rr(g, 3.4, 2.4, 4, 5.4, 1.5);
  paint(g, col.panel, [3.4, 2.4, 4, 5.4], { lw: 1.2, gloss: 0.2 });
  g.beginPath();
  g.moveTo(6, 21.6);
  g.quadraticCurveTo(30, 23.2, 60, 22);
  stroke(g, 'rgba(34,24,58,0.28)', 0.8);
}

// ------------------------------------------------------------------ iMac G3 + puck
function imacShell(g) {
  g.beginPath();
  g.moveTo(10, 2);
  g.lineTo(66, 2);
  g.quadraticCurveTo(74, 2, 74, 12);
  g.lineTo(74, 60);
  g.quadraticCurveTo(76, 73, 64, 74);
  g.lineTo(12, 74);
  g.quadraticCurveTo(0, 73, 2, 60);
  g.lineTo(2, 12);
  g.quadraticCurveTo(2, 2, 10, 2);
  g.closePath();
}
function imac(g) {
  imacShell(g);
  paint(g, 'rgba(30,176,198,0.86)', [0, 2, 76, 72], { gloss: 0.45, shade: 0.3 });
  g.save();
  imacShell(g);
  g.clip();
  g.strokeStyle = 'rgba(255,255,255,0.2)';
  g.lineWidth = 1.2;
  for (let x = 5; x < 74; x += 3.6) {
    g.beginPath();
    g.moveTo(x, 59);
    g.lineTo(x + 0.6, 75);
    g.stroke();
  }
  g.restore();
  rr(g, 8, 6, 60, 52, 8);
  paint(g, '#eef6f8', [8, 6, 60, 52], { lw: 1.8, gloss: 0.3, shade: 0.18 });
  const sx = 14, sy = 10, sw = 48, sh = 36;
  g.save();
  rr(g, sx, sy, sw, sh, 3);
  g.clip();
  const d = g.createLinearGradient(0, sy, 0, sy + sh);
  d.addColorStop(0, '#2c78d0');
  d.addColorStop(1, '#7fd0ff');
  g.fillStyle = d;
  g.fillRect(sx, sy, sw, sh);
  g.fillStyle = 'rgba(244,244,250,0.95)';
  g.fillRect(sx, sy, sw, 2.8);
  rr(g, sx + 15, sy + 8, 27, 19, 1.5);
  fill(g, '#fafcff');
  g.fillStyle = '#a6bde6';
  g.fillRect(sx + 15, sy + 8, 27, 3.2);
  g.fillStyle = 'rgba(40,60,120,0.35)';
  for (let i = 0; i < 4; i++) g.fillRect(sx + 18, sy + 14 + i * 3, 16 - i * 3, 1);
  for (const [ix, iy, c] of [[sx + 3, sy + 6, '#ffd36a'], [sx + 3, sy + 15, '#e6eefc'], [sx + 3, sy + 24, '#9ee2a0']]) {
    rr(g, ix, iy, 6, 5, 1);
    fill(g, c);
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.fillRect(ix - 0.5, iy + 6, 7, 1);
  }
  g.fillStyle = 'rgba(255,255,255,0.17)';
  g.beginPath();
  g.moveTo(sx + sw * 0.55, sy);
  g.lineTo(sx + sw, sy);
  g.lineTo(sx + sw, sy + sh * 0.25);
  g.lineTo(sx + sw * 0.25, sy + sh);
  g.lineTo(sx, sy + sh);
  g.closePath();
  g.fill();
  g.restore();
  rr(g, sx, sy, sw, sh, 3);
  stroke(g, INK, 1.4);
  g.beginPath();
  g.moveTo(30, 51);
  g.lineTo(46, 51);
  stroke(g, 'rgba(34,24,58,0.6)', 1.4);
  for (const cx of [18, 58]) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      circ(g, cx + Math.cos(a) * 2.8, 51 + Math.sin(a) * 2.8, 0.55);
      fill(g, 'rgba(34,24,58,0.45)');
    }
  }
  circ(g, 38, 55.6, 0.9);
  fill(g, '#5df0a0');
}

// ------------------------------------------------------------------ keitai (flip phone)
function flipPhone(g, f) {
  // strap + charm
  g.beginPath();
  g.moveTo(5, 5);
  g.quadraticCurveTo(-6, 14, -3, 26);
  stroke(g, '#ff8fbf', 1.2);
  for (let i = 0; i < 3; i++) {
    circ(g, -3, 27 + i * 4.2, 2.2);
    paint(g, ['#ffb6d2', '#fff6e8', '#9fe08a'][i], [-5.2, 25 + i * 4.2, 4.4, 4.4], { lw: 1, gloss: 0.4 });
  }
  g.beginPath();
  g.moveTo(-3, 24);
  g.lineTo(-3, 38);
  stroke(g, C.woodD, 0.9);
  rr(g, 26, -4, 4.5, 8, 2);
  paint(g, '#4a4c58', [26, -4, 4.5, 8], { lw: 1.4 });
  rr(g, 3, 2, 30, 32, 6);
  paint(g, '#d3d9e6', [3, 2, 30, 32], { gloss: 0.5, shade: 0.35 });
  rr(g, 14, 4.2, 8, 1.6, 0.8);
  fill(g, '#5a5e6c');
  rr(g, 6.5, 7.5, 23, 22, 2.4);
  fill(g, '#2e3240');
  g.save();
  rr(g, 8, 9, 20, 19, 1.5);
  g.clip();
  const lcd = g.createLinearGradient(0, 9, 0, 28);
  lcd.addColorStop(0, '#d6f2ff');
  lcd.addColorStop(1, '#7cc8f0');
  g.fillStyle = lcd;
  g.fillRect(8, 9, 20, 19);
  g.fillStyle = 'rgba(30,60,110,0.6)';
  g.fillRect(8, 9, 20, 2.4);
  text(g, f ? '(≧▽≦)' : '(^▽^)', 18, 19.5, 4.4, { font: F.dot, weight: 400, color: '#1d2c55', maxW: 18 });
  text(g, '23:59', 18, 25.4, 2.4, { font: F.dot, weight: 400, color: '#1d2c55' });
  g.fillStyle = 'rgba(255,255,255,0.3)';
  g.fillRect(8, 9, 20, 6);
  g.restore();
  rr(g, 2, 33, 32, 5.6, 2.8);
  paint(g, '#aeb5c4', [2, 33, 32, 5.6], { lw: 1.6, gloss: 0.5 });
  rr(g, 3, 37.5, 30, 34, 5);
  paint(g, '#d3d9e6', [3, 37.5, 30, 34], { gloss: 0.45, shade: 0.35 });
  circ(g, 18, 44.5, 4.6);
  paint(g, '#eef1f7', [13.4, 40, 9.2, 9.2], { lw: 1.2 });
  circ(g, 18, 44.5, 1.8);
  fill(g, '#9aa2b4');
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      rr(g, 7.5 + c * 7.6, 51.5 + r * 4.7, 5.6, 3.4, 1.4);
      paint(g, '#f6f7fb', [7.5 + c * 7.6, 51.5 + r * 4.7, 5.6, 3.4], { lw: 0.7, gloss: 0.2 });
    }
  }
}

// ------------------------------------------------------------------ cassette
function cassette(g, f, o) {
  const { shell, label, band, txt } = o;
  rr(g, 2, 2, 76, 48, 4);
  paint(g, shell, [2, 2, 76, 48], { gloss: 0.4, shade: 0.32 });
  for (const [x, y] of [[6, 6], [74, 6], [6, 46], [74, 46], [40, 46]]) {
    circ(g, x, y, 1.4);
    fill(g, 'rgba(34,24,58,0.55)');
  }
  rr(g, 8, 7, 64, 28, 2.5);
  paint(g, label, [8, 7, 64, 28], { lw: 1.4, gloss: 0.2, shade: 0.12 });
  g.fillStyle = band;
  g.fillRect(8.7, 13, 62.6, 3);
  g.fillRect(8.7, 30, 62.6, 1.2);
  text(g, txt, 40, 10.4, 4.6, { font: F.round, weight: 800, color: INK, maxW: 56 });
  rr(g, 21, 17.5, 38, 13, 6.5);
  paint(g, '#2a2530', [21, 17.5, 38, 13], { lw: 1.4, gloss: 0.15, shade: 0.1 });
  g.fillStyle = '#6b3d26';
  g.fillRect(31, 26.5, 18, 2.2);
  for (const ex of [31, 49]) {
    if (f === 1) {
      g.beginPath();
      g.arc(ex, 25.4, 3.6, Math.PI * 1.1, Math.PI * 1.9);
      stroke(g, '#fff', 1.8);
    } else {
      circ(g, ex, 24, 5);
      paint(g, '#fbf8f2', [ex - 5, 19, 10, 10], { lw: 1.2, gloss: 0.2 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.fillStyle = 'rgba(34,24,58,0.35)';
        g.fillRect(ex + Math.cos(a) * 3.1 - 0.5, 24 + Math.sin(a) * 3.1 - 0.5, 1, 1);
      }
      circ(g, ex + 0.6, 24.3, 1.9);
      fill(g, INK);
      circ(g, ex + 0.1, 23.6, 0.6);
      fill(g, '#fff');
    }
  }
  g.beginPath();
  g.moveTo(17, 50);
  g.lineTo(21, 39);
  g.lineTo(59, 39);
  g.lineTo(63, 50);
  paint(g, 'rgba(0,0,0,0.12)', [17, 39, 46, 11], { lw: 1.4, gloss: 0, shade: 0 });
  for (const x of [27, 36, 44, 53]) {
    circ(g, x, 45, 1.6);
    fill(g, 'rgba(34,24,58,0.55)');
  }
  ell(g, 40, 32, 3, 1.4);
  fill(g, 'rgba(255,90,140,0.0)');
}

// ------------------------------------------------------------------ stalker nut + gauze
function nut(g, f) {
  const r = rng(5 + f * 9);
  const amp = f ? 3 : -3;
  g.beginPath();
  const top = [], bot = [];
  for (let i = 0; i <= 8; i++) {
    const x = 15 + i * 3.6;
    const yy = 15 + Math.sin(i * 0.9 + f * 1.6) * amp * (i / 8);
    top.push([x, yy - 3.2 + (r() - 0.5) * 0.8]);
    bot.push([x, yy + 3.2 + (r() - 0.5) * 0.8]);
  }
  g.moveTo(top[0][0], top[0][1]);
  for (const p of top) g.lineTo(p[0], p[1]);
  for (let i = bot.length - 1; i >= 0; i--) g.lineTo(bot[i][0], bot[i][1]);
  g.closePath();
  paint(g, 'rgba(250,247,238,0.95)', [15, 9, 30, 12], { lw: 1, gloss: 0.2, shade: 0.12, ink: 'rgba(34,24,58,0.55)' });
  g.strokeStyle = 'rgba(160,150,140,0.35)';
  g.lineWidth = 0.4;
  for (let i = 1; i < 8; i++) {
    g.beginPath();
    g.moveTo(top[i][0], top[i][1]);
    g.lineTo(bot[i][0], bot[i][1]);
    g.stroke();
  }
  const cx = 12, cy = 16, R = 10;
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
  }
  g.closePath();
  paint(g, '#a3a9b8', [2, 6, 20, 20], { gloss: 0.5, shade: 0.4, lw: 2 });
  circ(g, cx, cy, 4.6);
  paint(g, '#2e2d36', [7, 11, 9, 9], { lw: 1.4, gloss: 0, shade: 0 });
  g.beginPath();
  g.arc(cx, cy, 3.4, 0.4, 2.2);
  stroke(g, 'rgba(255,255,255,0.35)', 0.6);
  ell(g, 16, 14, 3.6, 4.6, 0.3);
  paint(g, '#fbf8f0', [12, 9, 8, 10], { lw: 1, gloss: 0.2, ink: 'rgba(34,24,58,0.6)' });
}

// ------------------------------------------------------------------ soapstone message
function soapstone(g, f, o) {
  text(g, o.txt, o.w / 2, 22, 24, { font: F.gara, weight: 600, italic: true, color: '#ffc06a', glow: 7, glowColor: '#ff8a1a' });
  text(g, o.txt, o.w / 2, 22, 24, { font: F.gara, weight: 600, italic: true, color: '#fff0c8', alpha: 0.55 });
  g.beginPath();
  g.moveTo(o.w * 0.18, 34);
  g.quadraticCurveTo(o.w * 0.5, 30, o.w * 0.84, 35);
  stroke(g, 'rgba(255,170,80,0.7)', 1.4);
}

// ------------------------------------------------------------------ strawberry milk
function strawberry(g, x, y, s) {
  g.beginPath();
  g.moveTo(x, y + s * 1.1);
  g.bezierCurveTo(x - s * 1.3, y + s * 0.2, x - s * 0.9, y - s * 0.75, x, y - s * 0.45);
  g.bezierCurveTo(x + s * 0.9, y - s * 0.75, x + s * 1.3, y + s * 0.2, x, y + s * 1.1);
  paint(g, '#ff3d5c', [x - s, y - s * 0.7, 2 * s, 1.8 * s], { lw: 1.1, gloss: 0.35 });
  g.fillStyle = '#ffe680';
  for (const [dx, dy] of [[-0.4, 0], [0.4, 0], [0, 0.35], [-0.2, 0.7], [0.25, 0.65], [0, -0.15]]) {
    ell(g, x + dx * s, y + dy * s, s * 0.07, s * 0.11);
    g.fill();
  }
  g.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + (i / 4) * Math.PI;
    g.lineTo(x + Math.cos(a) * s * 0.7, y - s * 0.5 + Math.sin(a) * s * 0.35);
    g.lineTo(x + Math.cos(a + 0.35) * s * 0.2, y - s * 0.45);
  }
  g.closePath();
  paint(g, '#5fbf55', [x - s * 0.7, y - s * 0.9, s * 1.4, s * 0.5], { lw: 0.8, gloss: 0.2 });
}
function milk(g, f) {
  g.beginPath();
  g.moveTo(34, 18);
  g.lineTo(37, 4);
  g.lineTo(44, -1);
  stroke(g, INK, 4.4);
  g.beginPath();
  g.moveTo(34, 18);
  g.lineTo(37, 4);
  g.lineTo(44, -1);
  stroke(g, '#fff', 2.6);
  g.setLineDash([2.2, 2.2]);
  g.beginPath();
  g.moveTo(34, 18);
  g.lineTo(37, 4);
  g.lineTo(44, -1);
  stroke(g, '#ff7aa8', 2.6);
  g.setLineDash([]);
  rr(g, 20, 6, 8, 7, 1);
  paint(g, '#fff5f8', [20, 6, 8, 7], { lw: 1.6 });
  poly(g, [4, 26, 24, 11, 44, 26]);
  paint(g, '#ff8db6', [4, 11, 40, 15], { lw: 2 });
  g.beginPath();
  g.moveTo(24, 11);
  g.lineTo(24, 26);
  stroke(g, 'rgba(34,24,58,0.3)', 1);
  rr(g, 4, 26, 40, 70, 3);
  paint(g, '#fffafb', [4, 26, 40, 70], { gloss: 0.25, shade: 0.3 });
  g.save();
  rr(g, 4, 26, 40, 70, 3);
  g.clip();
  g.fillStyle = '#ff8db6';
  g.fillRect(4, 80, 40, 16);
  g.fillStyle = '#ffd0e0';
  for (let i = 0; i < 6; i++) {
    circ(g, 8 + i * 7, 80, 3.2);
    g.fill();
  }
  g.restore();
  rr(g, 4, 26, 40, 70, 3);
  stroke(g, INK, 2.4);
  text(g, 'いちご', 24, 34.5, 9.6, { font: F.round, weight: 800, color: '#ff3f7f', stroke: '#fff', sw: 2.2 });
  text(g, '牛乳', 24, 45, 7.4, { font: F.round, weight: 800, color: INK });
  face(g, 24, 60, 18, { mouth: f ? 'open' : 'smile' });
  strawberry(g, 15, 87.5, 4.2);
  strawberry(g, 33, 87.5, 4.2);
}

// ------------------------------------------------------------------ dango
function dango(g, f, col) {
  ell(g, 21, 21, 19, 16);
  paint(g, col, [2, 5, 38, 32], { gloss: 0.42, shade: 0.28, lw: 2.2 });
  shine(g, 13, 12, 5, 2.6, 0.55, -0.5);
  circ(g, 15, 20, 1.9);
  fill(g, INK);
  circ(g, 27, 20, 1.9);
  fill(g, INK);
  if (f === 1) {
    g.beginPath();
    g.arc(21, 23.5, 2.2, 0.2, Math.PI - 0.2);
    stroke(g, INK, 1.1);
  }
}

// ------------------------------------------------------------------ idol mic with ribbons
function idolMic(g, f) {
  const fl = f ? 1 : -1;
  for (const [col, side] of [['#ff8fc0', -1], ['#8fd8ff', 1]]) {
    g.beginPath();
    g.moveTo(25, 46);
    g.bezierCurveTo(25 + side * 14, 56 + fl * side * 3, 25 + side * 8, 74, 25 + side * (15 + fl * 3), 92);
    stroke(g, INK, 5.4);
    g.beginPath();
    g.moveTo(25, 46);
    g.bezierCurveTo(25 + side * 14, 56 + fl * side * 3, 25 + side * 8, 74, 25 + side * (15 + fl * 3), 92);
    stroke(g, col, 3.4);
  }
  g.beginPath();
  g.moveTo(17, 36);
  g.lineTo(33, 36);
  g.lineTo(29.5, 104);
  g.quadraticCurveTo(25, 108, 20.5, 104);
  g.closePath();
  paint(g, '#ff9cc8', [17, 36, 16, 72], { gloss: 0.45, shade: 0.35 });
  rr(g, 15.5, 31, 19, 6.5, 2);
  paint(g, C.gold, [15.5, 31, 19, 6.5], { lw: 1.8, gloss: 0.5 });
  circ(g, 25, 18, 14.5);
  paint(g, '#d9dde8', [10.5, 3.5, 29, 29], { gloss: 0.4, shade: 0.4 });
  g.save();
  circ(g, 25, 18, 14.5);
  g.clip();
  g.strokeStyle = 'rgba(60,60,90,0.38)';
  g.lineWidth = 0.6;
  for (let i = -16; i < 18; i += 2.6) {
    g.beginPath();
    g.moveTo(25 + i, 2);
    g.lineTo(25 + i + 14, 34);
    g.moveTo(25 + i, 34);
    g.lineTo(25 + i + 14, 2);
    g.stroke();
  }
  g.restore();
  circ(g, 25, 18, 14.5);
  stroke(g, INK, 2.2);
  shine(g, 19, 11, 4.6, 2.4, 0.7, -0.6);
  for (const side of [-1, 1]) {
    g.beginPath();
    g.ellipse(25 + side * 8, 44, 8.5, 5.2, side * 0.35, 0, Math.PI * 2);
    paint(g, side < 0 ? '#ff8fc0' : '#8fd8ff', [16 + side * 8, 39, 17, 10], { lw: 1.8, gloss: 0.4 });
  }
  circ(g, 25, 44, 3.3);
  paint(g, '#ffd36a', [21.7, 40.7, 6.6, 6.6], { lw: 1.4 });
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? 1.6 : 3.8;
    g.lineTo(25 + Math.cos(a) * rad, 70 + Math.sin(a) * rad);
  }
  g.closePath();
  paint(g, '#fff6b8', [21, 66, 8, 8], { lw: 1, gloss: 0.3 });
}

// ------------------------------------------------------------------ boxing (Ashita no Joe)
function glove(g, x, y, s, flip) {
  g.save();
  g.translate(x, y);
  g.scale(flip ? -s : s, s);
  g.beginPath();
  g.moveTo(-10, 8);
  g.bezierCurveTo(-16, -6, -8, -17, 4, -15);
  g.bezierCurveTo(16, -13, 17, 4, 9, 10);
  g.lineTo(8, 15);
  g.lineTo(-8, 15);
  g.closePath();
  paint(g, '#d8283a', [-16, -16, 33, 31], { gloss: 0.45, shade: 0.35 });
  g.beginPath();
  g.moveTo(-10, 1);
  g.bezierCurveTo(-15, -6, -8, -10, -4, -4);
  stroke(g, 'rgba(34,24,58,0.6)', 1.4);
  rr(g, -9, 13, 18, 9, 2);
  paint(g, '#f4f0ea', [-9, 13, 18, 9], { lw: 1.8, gloss: 0.2 });
  g.beginPath();
  g.moveTo(-5, 15);
  g.lineTo(5, 20);
  g.moveTo(5, 15);
  g.lineTo(-5, 20);
  stroke(g, '#c9c2b8', 0.9);
  shine(g, -3, -10, 4.4, 2.2, 0.55, -0.4);
  g.restore();
}
function boxer(g, f) {
  g.beginPath();
  g.moveTo(22, 64);
  g.lineTo(78, 64);
  g.lineTo(82, 96);
  g.lineTo(54, 98);
  g.lineTo(50, 86);
  g.lineTo(46, 98);
  g.lineTo(18, 96);
  g.closePath();
  paint(g, '#2a3a8e', [18, 64, 64, 34], { gloss: 0.3, shade: 0.35 });
  rr(g, 20, 61, 60, 8, 3);
  paint(g, '#f5f2ea', [20, 61, 60, 8], { lw: 2, gloss: 0.3 });
  g.fillStyle = '#f5f2ea';
  g.fillRect(23, 72, 3, 22);
  g.fillRect(74, 72, 3, 22);
  const l = f === 0;
  glove(g, l ? 26 : 22, l ? 34 : 26, l ? 1.22 : 1.0, false);
  glove(g, l ? 78 : 74, l ? 26 : 34, l ? 1.0 : 1.22, true);
}

// ------------------------------------------------------------------ Yomitan popup card
function yomitan(g, f, o) {
  rr(g, 2, 3, 130, 88, 7);
  fill(g, 'rgba(0,0,0,0.35)');
  rr(g, 0, 0, 130, 88, 7);
  paint(g, '#1e1f28', [0, 0, 130, 88], { lw: 2.2, gloss: 0.08, shade: 0.15 });
  rr(g, 0, 0, 130, 88, 7);
  stroke(g, 'rgba(160,170,220,0.35)', 0.8);
  text(g, o.read, 8, 9, 6.4, { font: F.goth, weight: 400, color: '#b9bfd9', align: 'left' });
  text(g, o.word, 8, 25, 21, { font: F.serif, weight: 600, color: '#f4f4fa', align: 'left' });
  const pills = [[o.pos, '#59607a'], ['★', '#c79a2a'], ['JMdict', '#2f6fb4']];
  let px = 12 + o.word.length * 21;
  pills.forEach(([s, c]) => {
    const w = s.length * 4.1 + 6;
    rr(g, px, 20.5, w, 8.4, 2.2);
    fill(g, c);
    text(g, s, px + w / 2, 24.9, 5.4, { font: F.goth, weight: 700, color: '#fff' });
    px += w + 3;
  });
  g.fillStyle = 'rgba(160,170,220,0.22)';
  g.fillRect(8, 38, 114, 0.8);
  o.gloss.forEach((s, i) => {
    text(g, `${i + 1}.`, 9, 48 + i * 11, 7, { font: F.y2k, weight: 700, color: '#8ea3ff', align: 'left' });
    text(g, s, 19, 48 + i * 11, 7.2, { font: F.y2k, weight: 400, color: '#e6e8f4', align: 'left' });
  });
  rr(g, 96, 75, 28, 8, 2);
  fill(g, '#3b3f52');
  text(g, o.freq, 110, 79.2, 5, { font: F.mono, weight: 500, color: '#c9cee6' });
}

// ------------------------------------------------------------------ nixie divergence meter
const WORLDLINES = ['1.048596', '0.571024', '1.130205'];
function nixie(g, f) {
  rr(g, 0, 48, 134, 20, 4);
  paint(g, '#5b3a24', [0, 48, 134, 20], { gloss: 0.3, shade: 0.35 });
  woodGrain(g, 2, 50, 130, 16, 4, 0.22);
  rr(g, 4, 46, 126, 5, 2);
  paint(g, '#23212a', [4, 46, 126, 5], { lw: 1.4, gloss: 0.4 });
  const s = WORLDLINES[f % 3];
  for (let i = 0; i < 8; i++) {
    const x = 6 + i * 15.4;
    rr(g, x, 4, 13, 44, 6.5);
    g.fillStyle = 'rgba(40,24,20,0.85)';
    g.fill();
    g.save();
    rr(g, x, 4, 13, 44, 6.5);
    g.clip();
    g.strokeStyle = 'rgba(120,90,70,0.45)';
    g.lineWidth = 0.4;
    for (let yy = 10; yy < 46; yy += 2.2) {
      g.beginPath();
      g.moveTo(x, yy);
      g.lineTo(x + 13, yy);
      g.stroke();
    }
    const ch = s[i];
    if (ch === '.') {
      circ(g, x + 6.5, 40, 1.8);
      g.fillStyle = '#ffb04a';
      g.shadowColor = '#ff6a10';
      g.shadowBlur = 6;
      g.fill();
      g.shadowBlur = 0;
    } else {
      text(g, ch, x + 6.5, 27, 26, { font: F.goth, weight: 400, color: '#ffc066', glow: 5, glowColor: '#ff6a10' });
      text(g, ch, x + 6.5, 27, 26, { font: F.goth, weight: 400, color: '#fff2d0', alpha: 0.45 });
    }
    const gl = g.createLinearGradient(x, 0, x + 13, 0);
    gl.addColorStop(0, 'rgba(255,255,255,0.28)');
    gl.addColorStop(0.3, 'rgba(255,255,255,0.03)');
    gl.addColorStop(1, 'rgba(255,255,255,0.12)');
    g.fillStyle = gl;
    g.fillRect(x, 4, 13, 44);
    g.restore();
    rr(g, x, 4, 13, 44, 6.5);
    stroke(g, INK, 1.6);
    rr(g, x + 3.5, 1, 6, 4, 1.5);
    paint(g, '#2a2830', [x + 3.5, 1, 6, 4], { lw: 1 });
  }
}

// ------------------------------------------------------------------ split-flap board
function flapCell(g, x, y, w, h, ch, size, mid = false) {
  rr(g, x, y, w, h, 1.6);
  fill(g, '#26252c');
  if (!mid) {
    text(g, ch, x + w / 2, y + h / 2 + 0.6, size, { font: F.goth, weight: 700, color: '#f2f0e8' });
  } else {
    g.fillStyle = '#3a3942';
    g.fillRect(x + 0.6, y + h / 2 - 1.2, w - 1.2, 2.4);
    g.save();
    g.beginPath();
    g.rect(x, y + h / 2, w, h / 2);
    g.clip();
    text(g, ch, x + w / 2, y + h / 2 + 0.6, size, { font: F.goth, weight: 700, color: '#f2f0e8' });
    g.restore();
  }
  g.fillStyle = 'rgba(0,0,0,0.75)';
  g.fillRect(x, y + h / 2 - 0.35, w, 0.7);
  g.fillStyle = 'rgba(255,255,255,0.06)';
  g.fillRect(x, y, w, h / 2);
}
function flapBoard(g, f) {
  rr(g, 0, 0, 162, 76, 5);
  paint(g, '#141318', [0, 0, 162, 76], { gloss: 0.18, shade: 0.2, lw: 2.4 });
  g.fillStyle = '#2c5ea8';
  g.fillRect(2, 2, 158, 9);
  text(g, 'ひかり線', 9, 6.6, 5.6, { font: F.goth, weight: 700, color: '#fff', align: 'left' });
  text(g, 'HIKARI LINE · DEPARTURES', 154, 6.8, 3.8, { font: F.y2k, weight: 700, color: 'rgba(255,255,255,0.8)', align: 'right' });
  text(g, '行先', 14, 25, 6.4, { font: F.goth, weight: 700, color: '#ffcf5a' });
  ['銀', '河'].forEach((c, i) => flapCell(g, 26 + i * 15, 16, 13.6, 18, c, 12));
  rr(g, 60, 19.5, 20, 11, 2);
  fill(g, '#2f9a5a');
  text(g, '普通', 70, 25.3, 7, { font: F.goth, weight: 700, color: '#fff' });
  text(g, '発車', 92, 25, 6.4, { font: F.goth, weight: 700, color: '#ffcf5a' });
  const times = ['23:59', '23:59', '00:00'];
  const t = times[f % 3];
  const xs = [103, 112.6, 0, 127.2, 136.8];
  [...t].forEach((c, i) => {
    if (c === ':') {
      text(g, ':', 123.4, 24.4, 11, { font: F.goth, weight: 700, color: '#f2f0e8' });
      return;
    }
    flapCell(g, xs[i], 16, 8.6, 18, c, 11, f === 1 && i >= 3);
  });
  text(g, 'のりば', 14, 50, 5.6, { font: F.goth, weight: 700, color: '#ffcf5a' });
  flapCell(g, 26, 41, 13.6, 18, '∞', 12);
  text(g, 'この先、星のあいだを通ります', 92, 50, 6.2, { font: F.goth, weight: 700, color: '#f2f0e8', maxW: 100 });
  g.fillStyle = 'rgba(255,255,255,0.05)';
  g.fillRect(4, 64, 154, 8);
  for (let i = 0; i < 14; i++) {
    circ(g, 10 + i * 10.8, 68, 1.1);
    fill(g, i % 3 === 0 ? '#ffcf5a' : '#4a4954');
  }
}

// ------------------------------------------------------------------ beetle
function beetle(g) {
  g.beginPath();
  g.moveTo(66, 30);
  g.quadraticCurveTo(70, 14, 80, 4);
  g.quadraticCurveTo(84, 2, 85, 6);
  g.quadraticCurveTo(78, 14, 74, 30);
  g.closePath();
  paint(g, '#3a2440', [66, 2, 20, 28], { gloss: 0.45, shade: 0.3, lw: 2 });
  g.beginPath();
  g.ellipse(36, 33, 32, 21, -0.06, 0, Math.PI * 2);
  paint(g, '#1e8f9a', [4, 12, 64, 42], { gloss: 0.4, shade: 0.4 });
  g.save();
  g.beginPath();
  g.ellipse(36, 33, 32, 21, -0.06, 0, Math.PI * 2);
  g.clip();
  const ir = g.createLinearGradient(4, 12, 68, 54);
  ir.addColorStop(0, 'rgba(120,255,200,0.35)');
  ir.addColorStop(0.5, 'rgba(90,120,255,0.25)');
  ir.addColorStop(1, 'rgba(200,80,255,0.35)');
  g.fillStyle = ir;
  g.fillRect(0, 10, 70, 46);
  g.restore();
  g.beginPath();
  g.moveTo(12, 20);
  g.quadraticCurveTo(38, 24, 62, 20);
  stroke(g, 'rgba(34,24,58,0.55)', 1.4);
  shine(g, 26, 20, 12, 3.4, 0.5, -0.12);
  ell(g, 66, 33, 14, 13);
  paint(g, '#2b1f3c', [52, 20, 28, 26], { gloss: 0.5, shade: 0.3 });
  circ(g, 71, 30, 6.2);
  paint(g, '#fff', [64.8, 23.8, 12.4, 12.4], { lw: 1.6, gloss: 0, shade: 0.15 });
  circ(g, 73, 30.5, 3.3);
  fill(g, INK);
  circ(g, 72, 29, 1.2);
  fill(g, '#fff');
  g.beginPath();
  g.arc(72, 38.5, 3.2, 0.2, Math.PI - 0.6);
  stroke(g, '#ffb6d2', 1.3);
  g.beginPath();
  g.moveTo(74, 22);
  g.quadraticCurveTo(80, 14, 88, 15);
  stroke(g, INK, 1.4);
}

// ------------------------------------------------------------------ ramen
function raimon(g, x, y, w, h) {
  g.save();
  g.strokeStyle = C.red;
  g.lineWidth = 0.9;
  const s = h * 0.75;
  for (let xx = x; xx < x + w; xx += s * 1.25) {
    const yy = y + (h - s) / 2;
    g.beginPath();
    g.moveTo(xx, yy + s);
    g.lineTo(xx, yy);
    g.lineTo(xx + s, yy);
    g.lineTo(xx + s, yy + s * 0.75);
    g.lineTo(xx + s * 0.3, yy + s * 0.75);
    g.lineTo(xx + s * 0.3, yy + s * 0.3);
    g.lineTo(xx + s * 0.65, yy + s * 0.3);
    g.stroke();
  }
  g.restore();
}
function ramen(g, f) {
  const st = f ? 1 : -1;
  for (const [x, ph] of [[30, 0], [46, 1], [62, 2]]) {
    g.beginPath();
    g.moveTo(x, 26);
    g.bezierCurveTo(x + 6 * st * (ph % 2 ? -1 : 1), 18, x - 6 * st * (ph % 2 ? -1 : 1), 10, x + 2 * st, 2);
    stroke(g, 'rgba(255,255,255,0.65)', 2.6);
  }
  g.beginPath();
  g.moveTo(58, 38);
  g.lineTo(82, 8);
  g.moveTo(63, 39);
  g.lineTo(88, 11);
  stroke(g, INK, 3.6);
  g.beginPath();
  g.moveTo(58, 38);
  g.lineTo(82, 8);
  g.moveTo(63, 39);
  g.lineTo(88, 11);
  stroke(g, '#d6a066', 2);
  rr(g, 52, 18, 13, 20, 1);
  paint(g, '#1f3326', [52, 18, 13, 20], { lw: 1.6, gloss: 0.2 });
  ell(g, 46, 38, 42, 10);
  paint(g, '#e9b45a', [4, 28, 84, 20], { lw: 2, gloss: 0.3, shade: 0.2 });
  g.save();
  ell(g, 46, 38, 42, 10);
  g.clip();
  g.strokeStyle = '#f7d77a';
  g.lineWidth = 1.4;
  for (let i = 0; i < 7; i++) {
    g.beginPath();
    g.moveTo(10, 36 + i * 1.6);
    for (let k = 0; k < 12; k++) g.lineTo(10 + k * 6, 36 + i * 1.6 + (k % 2 ? 1.2 : -1.2));
    g.stroke();
  }
  g.restore();
  ell(g, 24, 35, 8, 4.2);
  paint(g, '#c9826a', [16, 31, 16, 8.4], { lw: 1.4, gloss: 0.3 });
  ell(g, 24, 35, 4.5, 2.2);
  stroke(g, 'rgba(255,220,200,0.6)', 0.8);
  ell(g, 40, 34.5, 6.2, 3.4);
  paint(g, '#fbf8f2', [33.8, 31, 12.4, 6.8], { lw: 1.2 });
  g.beginPath();
  g.ellipse(40, 34.5, 3.6, 1.8, 0, 0, Math.PI * 1.6);
  stroke(g, '#ff7aa8', 1);
  ell(g, 70, 36, 6.5, 4);
  paint(g, '#fbf8f2', [63.5, 32, 13, 8], { lw: 1.2 });
  ell(g, 70, 36, 3.4, 2.2);
  fill(g, '#ffa52a');
  g.fillStyle = '#5fbf55';
  for (const [x, y] of [[32, 40], [50, 39], [56, 42], [28, 42], [62, 41], [46, 42]]) {
    circ(g, x, y, 1.3);
    g.fill();
  }
  g.beginPath();
  g.moveTo(4, 38);
  g.quadraticCurveTo(6, 74, 30, 78);
  g.lineTo(62, 78);
  g.quadraticCurveTo(86, 74, 88, 38);
  g.quadraticCurveTo(46, 54, 4, 38);
  g.closePath();
  paint(g, '#d8432f', [4, 38, 84, 40], { gloss: 0.3, shade: 0.35 });
  g.save();
  g.beginPath();
  g.moveTo(4, 38);
  g.quadraticCurveTo(6, 74, 30, 78);
  g.lineTo(62, 78);
  g.quadraticCurveTo(86, 74, 88, 38);
  g.quadraticCurveTo(46, 54, 4, 38);
  g.clip();
  g.beginPath();
  g.moveTo(0, 40);
  g.quadraticCurveTo(46, 56, 92, 40);
  g.lineTo(92, 48);
  g.quadraticCurveTo(46, 64, 0, 48);
  g.closePath();
  fill(g, '#fbf6ec');
  g.save();
  g.translate(0, 0);
  for (let i = 0; i < 9; i++) {
    const x = 8 + i * 9;
    const yy = 41 + Math.sin((x / 92) * Math.PI) * 8.5;
    raimon(g, x, yy, 7, 6);
  }
  g.restore();
  g.restore();
  g.beginPath();
  g.moveTo(4, 38);
  g.quadraticCurveTo(6, 74, 30, 78);
  g.lineTo(62, 78);
  g.quadraticCurveTo(86, 74, 88, 38);
  stroke(g, INK, 2.4);
  rr(g, 30, 77, 32, 7, 2);
  paint(g, '#b8351f', [30, 77, 32, 7], { lw: 2 });
}

// ------------------------------------------------------------------ headphones (closed-back, velour)
function cup(g, x, y) {
  ell(g, x, y, 13, 17);
  paint(g, '#3b3e48', [x - 13, y - 17, 26, 34], { gloss: 0.4, shade: 0.38 });
  ell(g, x, y, 9.5, 13);
  stroke(g, '#9aa2b4', 1.4);
  ell(g, x, y, 6.5, 9);
  fill(g, 'rgba(255,255,255,0.06)');
  shine(g, x - 5, y - 9, 3.6, 2, 0.4, -0.6);
}
function headphones(g, f) {
  const dl = f ? -7 : 0, dr = f ? 0 : -7;
  const L = [16, 68 + dl], R = [78, 68 + dr];
  g.beginPath();
  g.moveTo(L[0], L[1] - 4);
  g.quadraticCurveTo(L[0] - 18, 54, -2, 74 + dl);
  g.bezierCurveTo(4, 80, -8, 84, 0, 90);
  stroke(g, '#2a2b33', 1.8);
  for (const [x, y] of [L, R]) {
    rr(g, x - 2.5, y - 34, 5, 20, 2);
    paint(g, C.chrome, [x - 2.5, y - 34, 5, 20], { lw: 1.4, gloss: 0.6 });
  }
  g.beginPath();
  g.moveTo(L[0], L[1] - 32);
  g.bezierCurveTo(L[0] - 2, -4, R[0] + 2, -4, R[0], R[1] - 32);
  stroke(g, INK, 9);
  g.beginPath();
  g.moveTo(L[0], L[1] - 32);
  g.bezierCurveTo(L[0] - 2, -4, R[0] + 2, -4, R[0], R[1] - 32);
  stroke(g, '#2b2c34', 6.4);
  g.beginPath();
  g.moveTo(L[0] + 8, 14 + (dl + dr) * 0.3);
  g.bezierCurveTo(30, 3, 64, 3, R[0] - 8, 14 + (dl + dr) * 0.3);
  stroke(g, INK, 7);
  g.beginPath();
  g.moveTo(L[0] + 8, 14 + (dl + dr) * 0.3);
  g.bezierCurveTo(30, 3, 64, 3, R[0] - 8, 14 + (dl + dr) * 0.3);
  stroke(g, '#4a4c58', 4.6);
  g.setLineDash([1.2, 1.6]);
  g.beginPath();
  g.moveTo(L[0] + 10, 13 + (dl + dr) * 0.3);
  g.bezierCurveTo(30, 4.4, 64, 4.4, R[0] - 10, 13 + (dl + dr) * 0.3);
  stroke(g, 'rgba(220,220,235,0.5)', 0.6);
  g.setLineDash([]);
  for (const [x, y] of [L, R]) {
    rr(g, x - 4, y - 18, 8, 6, 2);
    paint(g, '#55586a', [x - 4, y - 18, 8, 6], { lw: 1.4 });
  }
  cup(g, L[0], L[1]);
  cup(g, R[0], R[1]);
}

// ------------------------------------------------------------------ pen tablet + stylus
function tablet(g) {
  rr(g, 0, 4, 118, 62, 6);
  paint(g, '#24232b', [0, 4, 118, 62], { gloss: 0.25, shade: 0.3 });
  rr(g, 22, 12, 88, 46, 2);
  fill(g, '#2e2d36');
  g.strokeStyle = 'rgba(210,215,235,0.55)';
  g.lineWidth = 1;
  for (const [x, y, dx, dy] of [[22, 12, 1, 1], [110, 12, -1, 1], [22, 58, 1, -1], [110, 58, -1, -1]]) {
    g.beginPath();
    g.moveTo(x + dx * 6, y);
    g.lineTo(x, y);
    g.lineTo(x, y + dy * 6);
    g.stroke();
  }
  rr(g, 52, 28, 28, 14, 1);
  stroke(g, 'rgba(255,102,170,0.45)', 0.8);
  for (let i = 0; i < 4; i++) {
    rr(g, 7, 13 + i * 11, 9, 8, 1.6);
    paint(g, '#3a3944', [7, 13 + i * 11, 9, 8], { lw: 1, gloss: 0.3 });
  }
  circ(g, 113, 9, 1.3);
  fill(g, '#56f0ff');
}
function stylus(g) {
  g.beginPath();
  g.moveTo(8, 88);
  g.lineTo(4.5, 76);
  g.lineTo(11.5, 76);
  g.closePath();
  paint(g, '#c8ccd8', [4.5, 76, 7, 12], { lw: 1.4 });
  rr(g, 3, 6, 10, 72, 5);
  paint(g, '#26252e', [3, 6, 10, 72], { gloss: 0.35, shade: 0.3 });
  rr(g, 3.4, 48, 9.2, 24, 3);
  fill(g, '#4a4955');
  g.fillStyle = 'rgba(0,0,0,0.25)';
  for (let y = 50; y < 70; y += 2) g.fillRect(3.6, y, 8.8, 0.7);
  rr(g, 12, 40, 2.6, 8, 1.2);
  paint(g, '#5a5966', [12, 40, 2.6, 8], { lw: 0.8 });
  rr(g, 3, 2, 10, 8, 4);
  paint(g, '#3a3946', [3, 2, 10, 8], { lw: 1.4, gloss: 0.4 });
  shine(g, 6, 30, 1.2, 14, 0.25, 0);
}

// ------------------------------------------------------------------ vending machine
function vending(g) {
  rr(g, 2, 2, 94, 174, 6);
  paint(g, '#f4f6fa', [2, 2, 94, 174], { gloss: 0.3, shade: 0.3 });
  rr(g, 2, 2, 94, 12, 6);
  fill(g, '#1f6fd1');
  text(g, 'のみもの', 49, 8.4, 6.4, { font: F.round, weight: 800, color: '#fff' });
  rr(g, 8, 18, 82, 92, 3);
  paint(g, '#eef4ff', [8, 18, 82, 92], { lw: 2, gloss: 0.15, shade: 0.12 });
  const cans = [
    ['#e33b3b', '#2a63c8', '#3c9a52', '#f2c230', '#f0f0f0'],
    ['#7a4a2a', '#1aa0c8', '#ff8a3a', '#e33b3b', '#2b2b33'],
    ['#c58a3a', '#7a4a2a', '#3c9a52', '#e8e2d0', '#a43a7a'],
  ];
  cans.forEach((row, r) => {
    const y = 22 + r * 29;
    row.forEach((c, i) => {
      const x = 13 + i * 15.4;
      rr(g, x, y, 10.5, 17, 2.4);
      paint(g, c, [x, y, 10.5, 17], { lw: 1.1, gloss: 0.5, shade: 0.3 });
      g.fillStyle = 'rgba(255,255,255,0.7)';
      g.fillRect(x + 1.5, y + 6, 7.5, 3);
      rr(g, x + 1, y + 19, 8.5, 3.2, 1);
      fill(g, '#222');
      text(g, ['120', '130', '150'][(i + r) % 3], x + 5.25, y + 20.7, 2.4, { font: F.mono, weight: 500, color: '#ffd23a' });
    });
    const hot = r === 2;
    rr(g, 10, y + 23.6, 78, 3.8, 1);
    fill(g, hot ? '#e23a3a' : '#2a63c8');
    text(g, hot ? 'あったか〜い' : 'つめた〜い', 49, y + 25.6, 2.9, { font: F.goth, weight: 700, color: '#fff' });
  });
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath();
  g.moveTo(8, 18);
  g.lineTo(40, 18);
  g.lineTo(8, 70);
  g.closePath();
  g.fill();
  rr(g, 64, 116, 24, 30, 2);
  paint(g, '#d9dee8', [64, 116, 24, 30], { lw: 1.6 });
  rr(g, 74, 120, 4, 10, 1.6);
  fill(g, '#2b2733');
  rr(g, 68, 134, 16, 5, 1);
  fill(g, '#203040');
  text(g, '---', 76, 136.6, 3.4, { font: F.mono, weight: 500, color: '#6dff8a' });
  rr(g, 12, 118, 46, 24, 2);
  paint(g, '#e6ebf2', [12, 118, 46, 24], { lw: 1.4, gloss: 0.1 });
  text(g, 'つめたいのも、あったかいのも。', 35, 130, 3.2, { font: F.goth, weight: 700, color: '#2a63c8', maxW: 42 });
  rr(g, 14, 150, 70, 18, 3);
  paint(g, '#2b2733', [14, 150, 70, 18], { lw: 1.8, gloss: 0.1 });
  g.fillStyle = 'rgba(255,255,255,0.12)';
  g.fillRect(16, 152, 66, 3);
}

// ------------------------------------------------------------------ maneki-neko
function neko(g, f) {
  const ang = [-0.25, 0.15, 0.5][f % 3];
  ell(g, 38, 74, 30, 25);
  paint(g, '#fbf8f2', [8, 49, 60, 50], { gloss: 0.3, shade: 0.3 });
  ell(g, 38, 79, 18, 15);
  fill(g, 'rgba(255,255,255,0.6)');
  // koban
  g.save();
  g.translate(50, 78);
  g.rotate(0.15);
  ell(g, 0, 0, 9, 13);
  paint(g, C.gold, [-9, -13, 18, 26], { lw: 1.8, gloss: 0.5 });
  vtext(g, '千万両', 0, -10, 6, { font: F.serif, weight: 900, color: '#7a5210' });
  g.restore();
  ell(g, 42, 82, 6, 5);
  paint(g, '#fbf8f2', [36, 77, 12, 10], { lw: 1.6 });
  // raised paw (beckoning)
  g.save();
  g.translate(16, 58);
  g.rotate(ang);
  rr(g, -6, -26, 12, 28, 6);
  paint(g, '#fbf8f2', [-6, -26, 12, 28], { lw: 2 });
  ell(g, 0, -24, 3, 2.4);
  fill(g, '#ffb6c8');
  g.restore();
  for (const s of [-1, 1]) {
    poly(g, [38 + s * 8, 16, 38 + s * 22, 2, 38 + s * 24, 24]);
    paint(g, '#fbf8f2', [38 + s * 8, 2, 16, 22], { lw: 2 });
    poly(g, [38 + s * 12, 15, 38 + s * 21, 7, 38 + s * 21, 19], true);
    fill(g, '#ffb0c4');
  }
  ell(g, 38, 32, 26, 21);
  paint(g, '#fbf8f2', [12, 11, 52, 42], { gloss: 0.3, shade: 0.25 });
  g.save();
  ell(g, 38, 32, 26, 21);
  g.clip();
  ell(g, 54, 18, 10, 8, 0.4);
  fill(g, '#f0a040');
  ell(g, 22, 16, 7, 5, -0.3);
  fill(g, '#3a3036');
  g.restore();
  ell(g, 38, 32, 26, 21);
  stroke(g, INK, 2.4);
  face(g, 38, 31, 26, { eyes: 'happy', mouth: 'w' });
  g.strokeStyle = 'rgba(34,24,58,0.55)';
  g.lineWidth = 0.8;
  for (const s of [-1, 1]) {
    for (const dy of [-1.5, 1.5]) {
      g.beginPath();
      g.moveTo(38 + s * 12, 37 + dy);
      g.lineTo(38 + s * 23, 36 + dy * 2.4);
      g.stroke();
    }
  }
  g.beginPath();
  g.moveTo(16, 49);
  g.quadraticCurveTo(38, 58, 60, 49);
  stroke(g, INK, 6);
  g.beginPath();
  g.moveTo(16, 49);
  g.quadraticCurveTo(38, 58, 60, 49);
  stroke(g, '#d8283a', 4);
  circ(g, 38, 58, 5);
  paint(g, C.gold, [33, 53, 10, 10], { lw: 1.6, gloss: 0.6 });
  g.beginPath();
  g.moveTo(34, 59);
  g.lineTo(42, 59);
  stroke(g, '#7a5210', 0.9);
}

// ------------------------------------------------------------------ Y2K digital camera
function camera(g) {
  rr(g, 2, 8, 78, 46, 8);
  paint(g, '#d6dbe6', [2, 8, 78, 46], { gloss: 0.55, shade: 0.4 });
  g.strokeStyle = 'rgba(255,255,255,0.25)';
  g.lineWidth = 0.4;
  for (let y = 11; y < 52; y += 1.4) {
    g.beginPath();
    g.moveTo(5, y);
    g.lineTo(77, y);
    g.stroke();
  }
  rr(g, 14, 2, 14, 8, 2);
  paint(g, '#b9c0ce', [14, 2, 14, 8], { lw: 1.6, gloss: 0.5 });
  rr(g, 8, 13, 18, 10, 2);
  paint(g, '#f6f7fb', [8, 13, 18, 10], { lw: 1.4, gloss: 0.6, shade: 0.1 });
  g.strokeStyle = 'rgba(150,160,190,0.6)';
  g.lineWidth = 0.5;
  for (let x = 10; x < 25; x += 1.8) {
    g.beginPath();
    g.moveTo(x, 14);
    g.lineTo(x, 22);
    g.stroke();
  }
  circ(g, 54, 32, 19);
  paint(g, '#c4cad8', [35, 13, 38, 38], { gloss: 0.5, shade: 0.45 });
  circ(g, 54, 32, 14.5);
  paint(g, '#3a3c48', [39.5, 17.5, 29, 29], { lw: 1.8, gloss: 0.3 });
  circ(g, 54, 32, 10);
  const lg = g.createRadialGradient(50, 28, 1, 54, 32, 10);
  lg.addColorStop(0, '#7f8cff');
  lg.addColorStop(0.4, '#262a5a');
  lg.addColorStop(1, '#0c0d18');
  g.fillStyle = lg;
  g.fill();
  shine(g, 50, 27, 3.6, 2, 0.75, -0.6);
  circ(g, 59, 37, 1.4);
  fill(g, 'rgba(255,120,200,0.6)');
  circ(g, 12, 46, 1.6);
  fill(g, '#ff4040');
  rr(g, 8, 28, 20, 3, 1.5);
  fill(g, 'rgba(34,24,58,0.25)');
}

// ------------------------------------------------------------------ subwoofer
function speaker(g, f) {
  rr(g, 2, 2, 76, 96, 5);
  paint(g, '#1c1b22', [2, 2, 76, 96], { gloss: 0.2, shade: 0.3 });
  for (const [x, y] of [[8, 8], [72, 8], [8, 92], [72, 92]]) {
    circ(g, x, y, 1.4);
    fill(g, '#55535e');
  }
  circ(g, 40, 22, 10);
  paint(g, '#3a3944', [30, 12, 20, 20], { lw: 1.6, gloss: 0.4 });
  circ(g, 40, 22, 4.5);
  paint(g, '#cfd3de', [35.5, 17.5, 9, 9], { lw: 1, gloss: 0.6 });
  const push = f ? 1.08 : 1;
  circ(g, 40, 62, 30);
  paint(g, '#2c2b34', [10, 32, 60, 60], { lw: 2, gloss: 0.3 });
  circ(g, 40, 62, 26 * push);
  const cg = g.createRadialGradient(40, 62, 3, 40, 62, 26 * push);
  cg.addColorStop(0, f ? '#8a8a98' : '#6a6a78');
  cg.addColorStop(0.7, f ? '#4c4c58' : '#3c3c46');
  cg.addColorStop(1, '#22222a');
  g.fillStyle = cg;
  g.fill();
  stroke(g, '#55535e', 1.4);
  circ(g, 40, 62, 8 * push);
  paint(g, '#1c1b22', [32, 54, 16, 16], { lw: 1.2, gloss: 0.6 });
  if (f) {
    circ(g, 40, 62, 32);
    stroke(g, 'rgba(255,255,255,0.25)', 1);
  }
  g.save();
  g.translate(62, 14);
  g.rotate(0.25);
  rr(g, -8, -4, 16, 8, 2);
  fill(g, '#d8ff3a');
  text(g, '808', 0, 0.3, 5, { font: F.y2k, weight: 700, color: '#111' });
  g.restore();
}

// ------------------------------------------------------------------ shogi
function shogiPiece(g, w, h, label, red = false) {
  poly(g, [w / 2, 1, w - 6, h * 0.2, w - 2, h - 1, 2, h - 1, 6, h * 0.2]);
  paint(g, '#eac27e', [2, 1, w - 4, h - 2], { gloss: 0.35, shade: 0.35 });
  g.save();
  poly(g, [w / 2, 1, w - 6, h * 0.2, w - 2, h - 1, 2, h - 1, 6, h * 0.2]);
  g.clip();
  woodGrain(g, 0, 0, w, h, label.length * 7 + w, 0.12);
  g.restore();
  const chars = [...label];
  const size = chars.length > 1 ? w * 0.36 : w * 0.52;
  chars.forEach((ch, i) => {
    text(g, ch, w / 2, h * (chars.length > 1 ? 0.42 + i * 0.3 : 0.58), size, { font: F.serif, weight: 900, color: red ? '#c4202f' : '#1a1418' });
  });
}

// ------------------------------------------------------------------ tetrominoes
const TETRO = {
  T: { c: '#b04fd6', cells: [[0, 0], [1, 0], [2, 0], [1, 1]] },
  S: { c: '#5fd13f', cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { c: '#ef3e4e', cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  L: { c: '#ff9a2a', cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  I: { c: '#3fd8e8', cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
};
function tetro(g, f, k) {
  const t = TETRO[k];
  const s = 20;
  for (const [cx, cy] of t.cells) {
    const x = cx * s + 1, y = cy * s + 1;
    rr(g, x, y, s - 2, s - 2, 2.5);
    paint(g, t.c, [x, y, s - 2, s - 2], { lw: 2, gloss: 0.5, shade: 0.35 });
    rr(g, x + 3.5, y + 3.5, s - 9, s - 9, 1.6);
    stroke(g, 'rgba(255,255,255,0.35)', 1);
  }
}

// ------------------------------------------------------------------ Monogatari-style title cards
const CARDS = [
  { bg: '#d2202f', fg: '#140c10', s: 'お祭り騒ぎ' },
  { bg: '#111014', fg: '#f4f0e8', s: '夢の行列' },
  { bg: '#f4f0e8', fg: '#d2202f', s: '光' },
];
function monoCard(g, f) {
  const c = CARDS[f % 3];
  rr(g, 0, 0, 108, 78, 1.5);
  paint(g, c.bg, [0, 0, 108, 78], { lw: 2.2, gloss: 0.08, shade: 0.12 });
  if (c.s.length === 1) text(g, c.s, 54, 40, 46, { font: F.mincho, weight: 800, color: c.fg });
  else text(g, c.s, 54, 40, 21, { font: F.mincho, weight: 800, color: c.fg, maxW: 96 });
}

// ------------------------------------------------------------------ chōchin walker + nobori
export function chochin(g, x, y, w, h, col = '#e2394a', o = {}) {
  const { faceOn = true, kanji = null, kc = INK } = o;
  rr(g, x + w * 0.22, y, w * 0.56, h * 0.1, 2);
  paint(g, '#2b2228', [x + w * 0.22, y, w * 0.56, h * 0.1], { lw: 1.6, gloss: 0.3 });
  rr(g, x + w * 0.22, y + h * 0.9, w * 0.56, h * 0.1, 2);
  paint(g, '#2b2228', [x + w * 0.22, y + h * 0.9, w * 0.56, h * 0.1], { lw: 1.6, gloss: 0.3 });
  ell(g, x + w / 2, y + h / 2, w / 2, h * 0.43);
  paint(g, col, [x, y + h * 0.07, w, h * 0.86], { gloss: 0.35, shade: 0.35 });
  g.save();
  ell(g, x + w / 2, y + h / 2, w / 2, h * 0.43);
  g.clip();
  g.strokeStyle = 'rgba(34,24,58,0.22)';
  g.lineWidth = Math.max(0.5, w * 0.018);
  for (let i = 1; i < 9; i++) {
    const yy = y + h * 0.07 + (i / 9) * h * 0.86;
    g.beginPath();
    g.ellipse(x + w / 2, yy, w / 2, h * 0.05, 0, 0, Math.PI);
    g.stroke();
  }
  const gl = g.createRadialGradient(x + w / 2, y + h * 0.55, 1, x + w / 2, y + h * 0.55, w * 0.55);
  gl.addColorStop(0, 'rgba(255,240,180,0.45)');
  gl.addColorStop(1, 'rgba(255,240,180,0)');
  g.fillStyle = gl;
  g.fillRect(x, y, w, h);
  g.restore();
  ell(g, x + w / 2, y + h / 2, w / 2, h * 0.43);
  stroke(g, INK, Math.max(1.2, w * 0.045));
  if (kanji) text(g, kanji, x + w / 2, y + h * 0.53, w * 0.5, { font: F.serif, weight: 900, color: kc });
  if (faceOn) face(g, x + w / 2, y + h * 0.48, w * 0.5, { mouth: 'open' });
}

const NOBORI = {
  祭: { bg: '#283070', fg: '#fff8ec', edge: '#e2394a' },
  光: { bg: '#fff3dc', fg: '#d8402c', edge: '#283070' },
  夏: { bg: '#f7f7fb', fg: '#2b2f86', edge: '#3fc3f0' },
  夢: { bg: '#ff8fbf', fg: '#fffaf4', edge: '#ffc94a' },
};
function nobori(g, f, k) {
  const c = NOBORI[k];
  const wv = f ? 1 : -1;
  rr(g, 3, 0, 4, 196, 2);
  paint(g, '#5a3a24', [3, 0, 4, 196], { lw: 1.4, gloss: 0.3 });
  circ(g, 5, 0, 3.4);
  paint(g, C.gold, [1.6, -3.4, 6.8, 6.8], { lw: 1.2, gloss: 0.6 });
  rr(g, 5, 6, 38, 3.2, 1.5);
  paint(g, '#5a3a24', [5, 6, 38, 3.2], { lw: 1 });
  g.beginPath();
  g.moveTo(8, 9);
  g.lineTo(42, 9);
  g.bezierCurveTo(44 + wv * 3, 50, 40 - wv * 3, 100, 43 + wv * 2, 150);
  g.lineTo(8, 150);
  g.closePath();
  paint(g, c.bg, [8, 9, 36, 141], { lw: 2, gloss: 0.25, shade: 0.28 });
  g.save();
  g.beginPath();
  g.moveTo(8, 9);
  g.lineTo(42, 9);
  g.bezierCurveTo(44 + wv * 3, 50, 40 - wv * 3, 100, 43 + wv * 2, 150);
  g.lineTo(8, 150);
  g.closePath();
  g.clip();
  g.fillStyle = c.edge;
  g.fillRect(8, 9, 36, 7);
  g.fillRect(8, 143, 38, 7);
  for (let i = 0; i < 8; i++) {
    circ(g, 9.5, 20 + i * 16, 1.4);
    fill(g, c.edge);
  }
  g.restore();
  text(g, k, 26, 76, 30, { font: F.serif, weight: 900, color: c.fg });
}

// ------------------------------------------------------------------ registry
const W = (o) => o;

export const WALKERS = {
  tv_face: W({ w: 84, h: 93, frames: 2, anim: { by: 'beat', rate: 1 }, legs: TV_LEGS, arms: TV_ARMS, draw: (g, f) => tv(g, f, { scr: 'face', cab: C.silver }) }),
  tv_pink: W({ w: 84, h: 93, frames: 2, anim: { by: 'beat', rate: 1 }, legs: TV_LEGS, arms: TV_ARMS, draw: (g, f) => tv(g, f, { scr: 'pink', cab: '#f2ece0' }) }),
  tv_bars: W({ w: 84, h: 93, frames: 1, legs: TV_LEGS, arms: TV_ARMS, draw: (g, f) => tv(g, f, { scr: 'bars', cab: C.wood, wood: true, seed: 5 }) }),
  tv_snow: W({ w: 84, h: 93, frames: 3, anim: { by: 'time', rate: 14 }, legs: TV_LEGS, arms: TV_ARMS, draw: (g, f) => tv(g, f, { scr: 'snow', cab: '#e9e1cf', seed: 9 }) }),
  tv_station: W({ w: 84, h: 93, frames: 2, anim: { by: 'time', rate: 3 }, legs: TV_LEGS, arms: TV_ARMS, draw: (g, f) => tv(g, f, { scr: 'station', cab: C.woodD, wood: true, seed: 2 }) }),
  tv_major: W({ w: 84, h: 113, frames: 2, anim: { by: 'beat', rate: 1 }, legs: TV_LEGS, arms: { kind: 'baton', sh: [[-0.47, 0.7], [0.47, 0.7]], len: 26 },
    draw: (g, f) => { tv(g, f, { y0: 46, scr: 'face', cab: '#f4f1ea', ant: false }); shako(g); } }),
  tv_horn: W({ w: 92, h: 93, frames: 2, anim: { by: 'beat', rate: 2 }, legs: TV_LEGS,
    arms: { kind: 'hold', sh: [[-0.44, 0.62], [0.44, 0.62]], len: 26, grip: [0.08, 0.66] },
    draw: (g, f) => { tv(g, 1, { scr: 'face', cab: '#e9e1cf' }); trumpet(g, f); } }),
  tv_drum: W({ w: 84, h: 104, frames: 2, anim: { by: 'beat', rate: 1 }, legs: TV_LEGS,
    arms: { kind: 'drum', sh: [[-0.47, 0.5], [0.47, 0.5]], len: 26, target: [0, 0.77] },
    draw: (g, f) => { tv(g, f, { scr: 'face', cab: '#3a3f6a' }); snareDrum(g, 42, 80); } }),

  record_a: W({ w: 72, h: 72, motion: 'roll', overlay: 'obi_a', draw: (g) => recordDisc(g, 0, C.pink, 1) }),
  record_b: W({ w: 72, h: 72, motion: 'roll', overlay: 'obi_b', draw: (g) => recordDisc(g, 0, '#fff0c8', 2) }),
  record_c: W({ w: 72, h: 72, motion: 'roll', overlay: 'obi_c', draw: (g) => recordDisc(g, 0, '#8fd0ff', 3) }),
  obi_a: W({ w: 100, h: 72, frames: 2, part: true, draw: (g, f) => recordObi(g, f, { txt: '帯付 美品', band: C.red }) }),
  obi_b: W({ w: 100, h: 72, frames: 2, part: true, draw: (g, f) => recordObi(g, f, { txt: '名盤復刻', band: C.indigo }) }),
  obi_c: W({ w: 100, h: 72, frames: 2, part: true, draw: (g, f) => recordObi(g, f, { txt: 'シティポップ', band: C.pink }) }),

  kicks_takumi: W({ w: 68, h: 30, motion: 'shoes', flip: true, draw: (g) => sneaker(g, KICKS.takumi) }),
  kicks_cherry: W({ w: 68, h: 30, motion: 'shoes', flip: true, draw: (g) => sneaker(g, KICKS.cherry) }),
  kicks_black: W({ w: 68, h: 30, motion: 'shoes', flip: true, draw: (g) => sneaker(g, KICKS.black) }),

  imac: W({ w: 76, h: 76, legs: { xs: [-0.22, 0.22], len: 24, shoe: '#e9f6f8' }, arms: { kind: 'swing', sh: [[-0.49, 0.5], [0.49, 0.5]], len: 22 }, pet: 'puck', draw: (g) => imac(g) }),
  puck: W({ w: 26, h: 24, motion: 'hop', hop: 0.12, draw: (g) => { circ(g, 13, 13, 10.5); paint(g, 'rgba(30,176,198,0.9)', [2, 2, 22, 22], { gloss: 0.5 }); face(g, 13, 12, 10); } }),
  flip: W({ w: 36, h: 74, pad: 12, frames: 2, anim: { by: 'beat', rate: 0.5 }, motion: 'hop', hop: 0.22, legs: { xs: [-0.2, 0.2], len: 16, shoe: '#2b2238' }, draw: (g, f) => flipPhone(g, f) }),
  cassette_a: W({ w: 80, h: 52, frames: 2, anim: { by: 'blink' }, legs: { xs: [-0.24, 0.24], len: 24, shoe: '#2b2238' }, arms: { kind: 'swing', sh: [[-0.49, 0.5], [0.49, 0.5]], len: 20 },
    draw: (g, f) => cassette(g, f, { shell: 'rgba(255,206,84,0.94)', label: '#fffaf0', band: '#ff6fa8', txt: '夏のミックス' }) }),
  cassette_b: W({ w: 80, h: 52, frames: 2, anim: { by: 'blink' }, legs: { xs: [-0.24, 0.24], len: 24, shoe: '#2b2238' }, arms: { kind: 'swing', sh: [[-0.49, 0.5], [0.49, 0.5]], len: 20 },
    draw: (g, f) => cassette(g, f, { shell: '#e2394a', label: '#fffaf0', band: '#283070', txt: "シティポップ '85" }) }),
  cassette_c: W({ w: 80, h: 52, frames: 2, anim: { by: 'blink' }, legs: { xs: [-0.24, 0.24], len: 24, shoe: '#2b2238' }, arms: { kind: 'swing', sh: [[-0.49, 0.5], [0.49, 0.5]], len: 20 },
    draw: (g, f) => cassette(g, f, { shell: 'rgba(160,220,255,0.92)', label: '#fffaf0', band: '#3f9a5a', txt: 'よる 22時' }) }),
  nut: W({ w: 46, h: 34, frames: 2, anim: { by: 'beat', rate: 2 }, motion: 'hop', hop: 0.5, flip: true, draw: (g, f) => nut(g, f) }),
  soap_a: W({ w: 180, h: 44, motion: 'glide', glow: 'orange', add: true, draw: (g) => soapstone(g, 0, { w: 180, txt: 'joy ahead' }) }),
  soap_b: W({ w: 180, h: 44, motion: 'glide', glow: 'orange', add: true, draw: (g) => soapstone(g, 0, { w: 180, txt: 'try marching' }) }),
  milk: W({ w: 48, h: 96, frames: 2, anim: { by: 'beat', rate: 0.5 }, legs: { xs: [-0.22, 0.22], len: 22, shoe: '#ff6fa8' }, arms: { kind: 'swing', sh: [[-0.46, 0.55], [0.46, 0.55]], len: 20 }, draw: (g, f) => milk(g, f) }),
  dango_pink: W({ w: 42, h: 38, frames: 2, anim: { by: 'beat', rate: 0.5 }, motion: 'hop', hop: 0.3, draw: (g, f) => dango(g, f, '#ffb6cf') }),
  dango_white: W({ w: 42, h: 38, frames: 2, anim: { by: 'beat', rate: 0.5 }, motion: 'hop', hop: 0.3, draw: (g, f) => dango(g, f, '#fbf6ee') }),
  dango_green: W({ w: 42, h: 38, frames: 2, anim: { by: 'beat', rate: 0.5 }, motion: 'hop', hop: 0.3, draw: (g, f) => dango(g, f, '#a8dc8c') }),
  dango_yellow: W({ w: 42, h: 38, frames: 2, anim: { by: 'beat', rate: 0.5 }, motion: 'hop', hop: 0.3, draw: (g, f) => dango(g, f, '#ffe08a') }),
  dango_sky: W({ w: 42, h: 38, frames: 2, anim: { by: 'beat', rate: 0.5 }, motion: 'hop', hop: 0.3, draw: (g, f) => dango(g, f, '#a8dcff') }),
  mic: W({ w: 50, h: 108, frames: 2, anim: { by: 'beat', rate: 1 }, legs: { xs: [-0.16, 0.16], len: 26, shoe: '#ff6fa8' }, arms: { kind: 'wave', sh: [[-0.3, 0.42], [0.3, 0.42]], len: 22 }, draw: (g, f) => idolMic(g, f) }),
  boxer: W({ w: 100, h: 100, frames: 2, anim: { by: 'beat', rate: 1 }, legs: { xs: [-0.2, 0.2], len: 30, shoe: '#d8283a', y: 0.96 }, draw: (g, f) => boxer(g, f) }),
  yomi_yume: W({ w: 130, h: 88, legs: { xs: [-0.22, 0.22], len: 26, shoe: '#2b2238' }, arms: { kind: 'swing', sh: [[-0.49, 0.45], [0.49, 0.45]], len: 22 },
    draw: (g) => yomitan(g, 0, { word: '夢', read: 'ゆめ', pos: '名詞', gloss: ['dream', 'hope; aspiration; ambition'], freq: '#412' }) }),
  yomi_hikari: W({ w: 130, h: 88, legs: { xs: [-0.22, 0.22], len: 26, shoe: '#2b2238' }, arms: { kind: 'swing', sh: [[-0.49, 0.45], [0.49, 0.45]], len: 22 },
    draw: (g) => yomitan(g, 0, { word: '光', read: 'ひかり', pos: '名詞', gloss: ['light; illumination', 'hope; a bright prospect'], freq: '#355' }) }),
  yomi_matsuri: W({ w: 130, h: 88, legs: { xs: [-0.22, 0.22], len: 26, shoe: '#2b2238' }, arms: { kind: 'swing', sh: [[-0.49, 0.45], [0.49, 0.45]], len: 22 },
    draw: (g) => yomitan(g, 0, { word: '祭り', read: 'まつり', pos: '名詞', gloss: ['festival; feast', 'parade; procession'], freq: '#1960' }) }),
  nixie: W({ w: 134, h: 68, frames: 3, anim: { by: 'beat', rate: 0.25 }, legs: { xs: [-0.3, -0.1, 0.1, 0.3], len: 26, shoe: '#2b2238' }, glow: 'orange', glowAt: [0.5, 0.38], draw: (g, f) => nixie(g, f) }),
  flap: W({ w: 162, h: 76, frames: 3, anim: { by: 'beat', rate: 0.5 }, legs: { xs: [-0.3, -0.1, 0.1, 0.3], len: 28, shoe: '#2b2238' }, draw: (g, f) => flapBoard(g, f) }),
  beetle: W({ w: 92, h: 56, flip: true, legs: { xs: [-0.3, -0.08, 0.14, -0.2, 0.02, 0.24], len: 16, shoe: null, lw: 2.6, color: '#2b1f3c' }, draw: (g) => beetle(g) }),
  ramen: W({ w: 92, h: 86, frames: 2, anim: { by: 'time', rate: 4 }, legs: { xs: [-0.16, 0.16], len: 22, shoe: '#2b2238' }, arms: { kind: 'swing', sh: [[-0.46, 0.55], [0.46, 0.55]], len: 18 }, draw: (g, f) => ramen(g, f) }),
  phones: W({ w: 94, h: 90, pad: 12, frames: 2, anim: { by: 'beat', rate: 1 }, motion: 'hop', hop: 0.1, draw: (g, f) => headphones(g, f) }),
  tablet: W({ w: 118, h: 68, legs: { xs: [-0.34, -0.12, 0.12, 0.34], len: 24, shoe: '#2b2238' }, rider: 'stylus', draw: (g) => tablet(g) }),
  stylus: W({ w: 16, h: 88, part: true, draw: (g) => stylus(g) }),
  vending: W({ w: 98, h: 178, legs: { xs: [-0.3, 0.3], len: 16, shoe: '#2b2238', lw: 6 }, glow: 'white', glowAt: [0.5, 0.36], draw: (g) => vending(g) }),
  neko: W({ w: 78, h: 100, frames: 3, anim: { by: 'beat', rate: 1.5, pingpong: true }, motion: 'hop', hop: 0.14, draw: (g, f) => neko(g, f) }),
  camera: W({ w: 82, h: 56, legs: { xs: [-0.22, 0.22], len: 24, shoe: '#2b2238' }, arms: { kind: 'swing', sh: [[-0.49, 0.6], [0.49, 0.6]], len: 20 }, flash: [0.17, 0.32], draw: (g) => camera(g) }),
  speaker: W({ w: 80, h: 100, frames: 2, anim: { by: 'beat', rate: 1, pulse: true }, legs: { xs: [-0.22, 0.22], len: 22, shoe: '#d8ff3a' }, draw: (g, f) => speaker(g, f) }),
  shogi_fu: W({ w: 48, h: 56, legs: { xs: [-0.18, 0.18], len: 18, shoe: '#2b2238' }, draw: (g) => shogiPiece(g, 48, 56, '歩') }),
  shogi_to: W({ w: 48, h: 56, legs: { xs: [-0.18, 0.18], len: 18, shoe: '#2b2238' }, draw: (g) => shogiPiece(g, 48, 56, 'と', true) }),
  shogi_kyo: W({ w: 48, h: 56, legs: { xs: [-0.18, 0.18], len: 18, shoe: '#2b2238' }, draw: (g) => shogiPiece(g, 48, 56, '香') }),
  shogi_ou: W({ w: 58, h: 68, legs: { xs: [-0.18, 0.18], len: 22, shoe: '#2b2238' }, draw: (g) => shogiPiece(g, 58, 68, '王将') }),
  tetro_T: W({ w: 60, h: 40, motion: 'tumble', draw: (g, f) => tetro(g, f, 'T') }),
  tetro_S: W({ w: 60, h: 40, motion: 'tumble', draw: (g, f) => tetro(g, f, 'S') }),
  tetro_Z: W({ w: 60, h: 40, motion: 'tumble', draw: (g, f) => tetro(g, f, 'Z') }),
  tetro_L: W({ w: 60, h: 40, motion: 'tumble', draw: (g, f) => tetro(g, f, 'L') }),
  tetro_I: W({ w: 80, h: 20, motion: 'tumble', draw: (g, f) => tetro(g, f, 'I') }),
  mono: W({ w: 108, h: 78, frames: 3, anim: { by: 'beat', rate: 2 }, legs: { xs: [-0.22, 0.22], len: 26, shoe: '#140c10' }, draw: (g, f) => monoCard(g, f) }),
  bearer: W({ w: 50, h: 66, legs: { xs: [-0.2, 0.2], len: 24, shoe: 'geta' }, arms: { kind: 'hold', sh: [[-0.48, 0.55], [0.48, 0.55]], len: 18, grip: [0.62, 0.42] }, carry: 'nobori',
    draw: (g) => chochin(g, 0, 0, 50, 66) }),
  nobori_祭: W({ w: 48, h: 196, frames: 2, part: true, draw: (g, f) => nobori(g, f, '祭') }),
  nobori_光: W({ w: 48, h: 196, frames: 2, part: true, draw: (g, f) => nobori(g, f, '光') }),
  nobori_夏: W({ w: 48, h: 196, frames: 2, part: true, draw: (g, f) => nobori(g, f, '夏') }),
  nobori_夢: W({ w: 48, h: 196, frames: 2, part: true, draw: (g, f) => nobori(g, f, '夢') }),
};
