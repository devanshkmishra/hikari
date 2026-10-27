// Big floats, the Hikari Line train, the crossing signal, things that fly, and particles.

import { INK, C, F, rr, ell, circ, poly, paint, stroke, fill, shine, text, vtext, face, rng } from './kit.js';
import { antenna, screenStation, chochin } from './walkers.js';

// ------------------------------------------------------------------ 踏切 crossing signal
function stripes(g, x, y, w, h, a = '#ffd23a', b = '#1d1a20', step = 6) {
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.fillStyle = a;
  g.fillRect(x, y, w, h);
  g.fillStyle = b;
  for (let k = -h; k < w + h; k += step * 2) {
    g.beginPath();
    g.moveTo(x + k, y + h);
    g.lineTo(x + k + step, y + h);
    g.lineTo(x + k + step + h, y);
    g.lineTo(x + k + h, y);
    g.closePath();
    g.fill();
  }
  g.restore();
}
function fumikiri(g, f) {
  // pole
  rr(g, 36, 30, 8, 166, 3);
  paint(g, '#e9ebf0', [36, 30, 8, 166], { gloss: 0.4, shade: 0.35, lw: 2 });
  stripes(g, 36.6, 150, 6.8, 44, '#ffd23a', '#1d1a20', 4.4);
  rr(g, 36, 30, 8, 166, 3);
  stroke(g, INK, 2);
  rr(g, 28, 192, 24, 8, 2);
  paint(g, '#9a98a2', [28, 192, 24, 8], { lw: 1.8 });
  // crossbuck (X), yellow and black
  for (const a of [0.62, -0.62]) {
    g.save();
    g.translate(40, 20);
    g.rotate(a);
    rr(g, -34, -5.5, 68, 11, 1.5);
    paint(g, '#ffd23a', [-34, -5.5, 68, 11], { lw: 0, gloss: 0.2, shade: 0.2 });
    stripes(g, -33, -4.5, 66, 9, '#ffd23a', '#1d1a20', 5);
    rr(g, -34, -5.5, 68, 11, 1.5);
    stroke(g, INK, 2);
    g.restore();
  }
  circ(g, 40, 20, 3.2);
  paint(g, '#55535e', [36.8, 16.8, 6.4, 6.4], { lw: 1.2 });
  // speaker on top
  rr(g, 35, -2, 10, 9, 3);
  paint(g, '#55535e', [35, -2, 10, 9], { lw: 1.6, gloss: 0.4 });
  // lamp bar
  rr(g, 6, 48, 68, 6, 2);
  paint(g, '#2b2733', [6, 48, 68, 6], { lw: 1.6, gloss: 0.3 });
  for (const [x, on] of [[14, f === 0], [66, f === 1]]) {
    circ(g, x, 58, 11);
    paint(g, '#1d1a20', [x - 11, 47, 22, 22], { lw: 2, gloss: 0.25 });
    circ(g, x, 58, 7.5);
    if (on) {
      const lg = g.createRadialGradient(x - 2, 56, 0.5, x, 58, 7.5);
      lg.addColorStop(0, '#fff2e0');
      lg.addColorStop(0.35, '#ff5a4a');
      lg.addColorStop(1, '#c2121e');
      g.fillStyle = lg;
      g.fill();
    } else {
      fill(g, '#4a1218');
    }
    g.beginPath();
    g.arc(x, 58, 11.5, Math.PI * 1.05, Math.PI * 1.95);
    stroke(g, '#1d1a20', 4);
  }
  // direction arrow
  rr(g, 22, 72, 36, 12, 2);
  paint(g, '#1d1a20', [22, 72, 36, 12], { lw: 1.6 });
  g.fillStyle = f === 0 ? '#ffb43a' : '#5a3a20';
  poly(g, [26, 78, 32, 74, 32, 82]);
  g.fill();
  g.fillStyle = f === 1 ? '#ffb43a' : '#5a3a20';
  poly(g, [54, 78, 48, 74, 48, 82]);
  g.fill();
  // とまれみよ plate
  rr(g, 22, 90, 36, 14, 1.5);
  paint(g, '#fbfbf6', [22, 90, 36, 14], { lw: 1.8, gloss: 0.2 });
  text(g, 'とまれみよ', 40, 97.4, 6.2, { font: F.goth, weight: 700, color: '#c4202f', maxW: 32 });
}

// ------------------------------------------------------------------ the Hikari Line, one car
function train(g) {
  // roof gear
  rr(g, 52, 6, 72, 10, 3);
  paint(g, '#8c92a6', [52, 6, 72, 10], { lw: 2, gloss: 0.4 });
  rr(g, 74, 0, 28, 8, 3);
  paint(g, '#a8aec0', [74, 0, 28, 8], { lw: 1.8, gloss: 0.4 });
  // body
  g.beginPath();
  g.moveTo(14, 30);
  g.quadraticCurveTo(16, 14, 40, 13);
  g.lineTo(136, 13);
  g.quadraticCurveTo(160, 14, 162, 30);
  g.lineTo(166, 160);
  g.quadraticCurveTo(166, 168, 158, 168);
  g.lineTo(18, 168);
  g.quadraticCurveTo(10, 168, 10, 160);
  g.closePath();
  paint(g, '#f4ecd8', [10, 13, 156, 155], { gloss: 0.3, shade: 0.35 });
  g.save();
  g.beginPath();
  g.moveTo(14, 30);
  g.quadraticCurveTo(16, 14, 40, 13);
  g.lineTo(136, 13);
  g.quadraticCurveTo(160, 14, 162, 30);
  g.lineTo(166, 160);
  g.quadraticCurveTo(166, 168, 158, 168);
  g.lineTo(18, 168);
  g.quadraticCurveTo(10, 168, 10, 160);
  g.closePath();
  g.clip();
  g.fillStyle = '#2c5ea8';
  g.fillRect(0, 112, 180, 20);
  g.fillStyle = '#ff9a3c';
  g.fillRect(0, 134, 180, 4);
  g.restore();
  // windows
  for (const x of [22, 92]) {
    rr(g, x, 40, 62, 56, 6);
    const wg = g.createLinearGradient(0, 40, 0, 96);
    wg.addColorStop(0, '#1b2246');
    wg.addColorStop(0.6, '#3a3560');
    wg.addColorStop(1, '#ffcf8a');
    g.fillStyle = wg;
    g.fill();
    stroke(g, INK, 2.4);
    g.save();
    rr(g, x, 40, 62, 56, 6);
    g.clip();
    g.fillStyle = 'rgba(255,214,150,0.55)';
    for (let i = 0; i < 3; i++) g.fillRect(x + 6 + i * 20, 84, 12, 3);
    g.fillStyle = 'rgba(255,240,210,0.7)';
    g.fillRect(x, 46, 62, 1.6);
    g.fillStyle = 'rgba(255,255,255,0.14)';
    g.beginPath();
    g.moveTo(x + 10, 40);
    g.lineTo(x + 28, 40);
    g.lineTo(x + 6, 96);
    g.lineTo(x - 12, 96);
    g.closePath();
    g.fill();
    g.restore();
    g.beginPath();
    g.moveTo(x + 31, 94);
    g.lineTo(x + 50, 58);
    stroke(g, '#2a2a33', 2);
  }
  // destination sign
  rr(g, 56, 20, 64, 15, 2);
  paint(g, '#121118', [56, 20, 64, 15], { lw: 2, gloss: 0.15 });
  text(g, '銀河', 74, 27.8, 9.4, { font: F.goth, weight: 700, color: '#ffb43a', glow: 3, glowColor: '#ff7a10' });
  text(g, '普通', 104, 27.8, 7, { font: F.goth, weight: 700, color: '#8fffa0', glow: 2 });
  // headlights + number
  for (const x of [32, 144]) {
    circ(g, x, 122, 9);
    paint(g, '#2b2733', [x - 9, 113, 18, 18], { lw: 2 });
    circ(g, x, 122, 6.5);
    const hg = g.createRadialGradient(x - 1.5, 120, 0.5, x, 122, 6.5);
    hg.addColorStop(0, '#ffffff');
    hg.addColorStop(0.5, '#fff1c4');
    hg.addColorStop(1, '#ffc65a');
    g.fillStyle = hg;
    g.fill();
  }
  rr(g, 70, 104, 36, 10, 1.6);
  paint(g, '#fbfbf6', [70, 104, 36, 10], { lw: 1.4 });
  text(g, 'ひ 1', 88, 109.4, 6.4, { font: F.goth, weight: 700, color: '#2c5ea8' });
  // skirt + coupler
  g.beginPath();
  g.moveTo(14, 160);
  g.lineTo(162, 160);
  g.lineTo(150, 182);
  g.lineTo(26, 182);
  g.closePath();
  paint(g, '#3a3a46', [14, 160, 148, 22], { gloss: 0.2, shade: 0.3 });
  g.strokeStyle = 'rgba(255,255,255,0.12)';
  g.lineWidth = 1;
  for (let x = 30; x < 150; x += 8) {
    g.beginPath();
    g.moveTo(x, 164);
    g.lineTo(x, 179);
    g.stroke();
  }
  rr(g, 78, 164, 20, 12, 2);
  paint(g, '#55535e', [78, 164, 20, 12], { lw: 1.8, gloss: 0.4 });
  // wipers resting
  shine(g, 40, 22, 14, 2.6, 0.35, -0.08);
}

// ------------------------------------------------------------------ osu! hit circles
function hitCircle(g, cx, cy, r, col, num) {
  circ(g, cx, cy, r + 5);
  fill(g, 'rgba(34,24,58,0.32)');
  circ(g, cx, cy, r - 3);
  const gr = g.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
  gr.addColorStop(0, col[0]);
  gr.addColorStop(1, col[1]);
  g.fillStyle = gr;
  g.fill();
  circ(g, cx, cy, r - 1);
  stroke(g, '#ffffff', r * 0.13);
  circ(g, cx, cy, r + 2.6);
  stroke(g, INK, Math.max(1.4, r * 0.035));
  circ(g, cx, cy, r - r * 0.075);
  stroke(g, 'rgba(34,24,58,0.35)', Math.max(0.8, r * 0.02));
  text(g, String(num), cx, cy + r * 0.06, r * 0.95, { font: F.pop, weight: 400, color: '#fff', stroke: INK, sw: r * 0.08 });
  g.save();
  circ(g, cx, cy, r - 4);
  g.clip();
  ell(g, cx - r * 0.25, cy - r * 0.55, r * 0.6, r * 0.25, -0.35);
  fill(g, 'rgba(255,255,255,0.22)');
  g.restore();
}
const COMBO = [['#ffa6d0', '#ff4d9a'], ['#bfe8ff', '#3fa8f0'], ['#d6ffa8', '#6cc93a'], ['#fff0a0', '#f0b020']];

// ------------------------------------------------------------------ bonfire mikoshi
function mikoshi(g) {
  // corner posts
  for (const x of [58, 254]) {
    rr(g, x, 50, 8, 108, 2);
    paint(g, C.vermil, [x, 50, 8, 108], { lw: 2, gloss: 0.3 });
    rr(g, x - 2, 46, 12, 6, 2);
    paint(g, C.gold, [x - 2, 46, 12, 6], { lw: 1.6, gloss: 0.5 });
  }
  // shimenawa and shide
  g.beginPath();
  g.moveTo(62, 58);
  g.quadraticCurveTo(160, 82, 258, 58);
  stroke(g, INK, 11);
  g.beginPath();
  g.moveTo(62, 58);
  g.quadraticCurveTo(160, 82, 258, 58);
  stroke(g, '#d9c28a', 8);
  g.strokeStyle = 'rgba(120,90,40,0.6)';
  g.lineWidth = 1.2;
  for (let i = 1; i < 26; i++) {
    const t = i / 26;
    const x = (1 - t) * (1 - t) * 62 + 2 * (1 - t) * t * 160 + t * t * 258;
    const y = (1 - t) * (1 - t) * 58 + 2 * (1 - t) * t * 82 + t * t * 58;
    g.beginPath();
    g.moveTo(x - 2.5, y - 3.5);
    g.lineTo(x + 2.5, y + 3.5);
    g.stroke();
  }
  for (const t of [0.22, 0.5, 0.78]) {
    const x = (1 - t) * (1 - t) * 62 + 2 * (1 - t) * t * 160 + t * t * 258;
    const y = (1 - t) * (1 - t) * 58 + 2 * (1 - t) * t * 82 + t * t * 58 + 4;
    poly(g, [x - 3, y, x + 3, y, x + 3, y + 7, x + 6, y + 7, x + 6, y + 14, x + 3, y + 14, x + 3, y + 21, x + 6, y + 21, x + 6, y + 28,
      x, y + 28, x, y + 21, x - 3, y + 21, x - 3, y + 14, x, y + 14, x, y + 7, x - 3, y + 7]);
    paint(g, '#fbfbf6', [x - 4, y, 10, 28], { lw: 1.2, gloss: 0.1, shade: 0.15 });
  }
  // balustrade
  rr(g, 50, 132, 220, 5, 2);
  paint(g, C.gold, [50, 132, 220, 5], { lw: 1.8, gloss: 0.5 });
  for (let x = 56; x <= 262; x += 23) {
    rr(g, x, 136, 5, 20, 1);
    paint(g, C.vermil, [x, 136, 5, 20], { lw: 1.4 });
  }
  // ash mound + embers + bones
  g.beginPath();
  g.moveTo(96, 156);
  g.quadraticCurveTo(160, 112, 224, 156);
  g.closePath();
  paint(g, '#55505c', [96, 120, 128, 36], { gloss: 0.15, shade: 0.4 });
  g.fillStyle = '#e8e2d4';
  for (const [x1, y1, x2, y2] of [[120, 150, 150, 140], [170, 142, 204, 152], [140, 152, 176, 148]]) {
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    stroke(g, INK, 4.6);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    stroke(g, '#ece6d8', 2.8);
  }
  const r = rng(4);
  for (let i = 0; i < 26; i++) {
    const x = 110 + r() * 100;
    const y = 146 + r() * 8 - Math.abs(x - 160) * -0.02;
    circ(g, x, y, 0.8 + r() * 1.4);
    fill(g, r() > 0.5 ? '#ff8a2a' : '#ffcf5a');
  }
  // coiled sword
  const bx = 160;
  g.beginPath();
  g.moveTo(bx - 4.5, 140);
  for (let y = 140; y >= 62; y -= 6) g.lineTo(bx - 4.5 - ((y / 6) % 2 ? 1.8 : 0), y);
  g.lineTo(bx, 56);
  for (let y = 62; y <= 140; y += 6) g.lineTo(bx + 4.5 + ((y / 6) % 2 ? 0 : 1.8), y);
  g.closePath();
  paint(g, '#5b5a66', [bx - 7, 56, 14, 84], { gloss: 0.4, shade: 0.4, lw: 2 });
  g.save();
  g.beginPath();
  g.rect(bx - 8, 56, 16, 86);
  g.clip();
  for (let y = 64; y < 140; y += 6) {
    g.beginPath();
    g.moveTo(bx - 6, y + 4);
    g.lineTo(bx + 6, y - 2);
    stroke(g, 'rgba(255,255,255,0.35)', 1.2);
  }
  const hot = g.createLinearGradient(0, 100, 0, 142);
  hot.addColorStop(0, 'rgba(255,120,30,0)');
  hot.addColorStop(1, 'rgba(255,150,40,0.85)');
  g.fillStyle = hot;
  g.fillRect(bx - 8, 100, 16, 42);
  g.restore();
  rr(g, bx - 13, 52, 26, 5, 2);
  paint(g, '#3a3640', [bx - 13, 52, 26, 5], { lw: 1.6, gloss: 0.4 });
  rr(g, bx - 3, 34, 6, 19, 2);
  paint(g, '#4a3428', [bx - 3, 34, 6, 19], { lw: 1.4 });
  g.strokeStyle = 'rgba(0,0,0,0.4)';
  g.lineWidth = 0.8;
  for (let y = 36; y < 52; y += 3) {
    g.beginPath();
    g.moveTo(bx - 3, y);
    g.lineTo(bx + 3, y + 2);
    g.stroke();
  }
  circ(g, bx, 32, 3.6);
  paint(g, '#3a3640', [bx - 3.6, 28.4, 7.2, 7.2], { lw: 1.4, gloss: 0.5 });
  // platform + base + poles
  rr(g, 44, 154, 232, 10, 3);
  paint(g, '#1d1a22', [44, 154, 232, 10], { lw: 2, gloss: 0.35 });
  rr(g, 52, 162, 216, 28, 3);
  paint(g, C.vermil, [52, 162, 216, 28], { gloss: 0.3, shade: 0.35 });
  g.fillStyle = C.gold;
  g.fillRect(53, 166, 214, 2);
  g.fillRect(53, 185, 214, 2);
  for (let x = 72; x < 260; x += 28) {
    poly(g, [x, 171, x + 5, 176, x, 181, x - 5, 176]);
    paint(g, C.gold, [x - 5, 171, 10, 10], { lw: 1, gloss: 0.5 });
  }
  rr(g, 0, 190, 320, 9, 4.5);
  paint(g, '#1d1a22', [0, 190, 320, 9], { lw: 2, gloss: 0.4 });
  for (const x of [0, 308]) {
    rr(g, x, 188, 12, 13, 3);
    paint(g, C.gold, [x, 188, 12, 13], { lw: 1.6, gloss: 0.5 });
  }
}

function flame(g, f) {
  const r = rng(13 + f * 31);
  const layers = [
    ['rgba(255,90,20,0.75)', 1.0],
    ['rgba(255,160,40,0.85)', 0.72],
    ['rgba(255,236,150,0.95)', 0.42],
  ];
  for (const [col, s] of layers) {
    g.beginPath();
    const n = 7;
    const bw = 44 * s;
    g.moveTo(48 - bw, 118);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = 48 - bw + t * bw * 2;
      const tipH = (0.35 + 0.65 * Math.sin(t * Math.PI)) * 112 * s * (0.75 + r() * 0.35);
      const xm = x + (r() - 0.5) * 8 * s;
      g.quadraticCurveTo(xm - 6 * s, 118 - tipH * 0.55, xm, 118 - tipH);
      g.quadraticCurveTo(xm + 6 * s, 118 - tipH * 0.5, x + (bw * 2) / n * 0.5, 118 - tipH * 0.2);
    }
    g.lineTo(48 + bw, 118);
    g.closePath();
    g.fillStyle = col;
    g.fill();
  }
}

// ------------------------------------------------------------------ HIKARI CT-1486, the float
function crtFloat(g, f) {
  antenna(g, 150, 44, 92, 42, 2.2);
  rr(g, 8, 40, 284, 202, 18);
  paint(g, '#8a5530', [8, 40, 284, 202], { gloss: 0.32, shade: 0.4 });
  g.save();
  rr(g, 8, 40, 284, 202, 18);
  g.clip();
  const r = rng(21);
  g.strokeStyle = 'rgba(50,22,8,0.2)';
  g.lineWidth = 1.2;
  for (let y = 46; y < 240; y += 4.2) {
    g.beginPath();
    g.moveTo(8, y);
    for (let k = 1; k <= 10; k++) g.lineTo(8 + k * 28.4, y + (r() - 0.5) * 2.4);
    g.stroke();
  }
  g.restore();
  rr(g, 22, 54, 200, 168, 16);
  paint(g, '#26232e', [22, 54, 200, 168], { gloss: 0.15, shade: 0.2, lw: 2.4 });
  const sx = 32, sy = 64, sw = 180, sh = 140;
  g.save();
  rr(g, sx, sy, sw, sh, 22);
  g.clip();
  screenStation(g, sx, sy, sw, sh, f);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let yy = sy; yy < sy + sh; yy += 2.4) g.fillRect(sx, yy, sw, 0.9);
  const gr = g.createRadialGradient(sx + sw * 0.3, sy + sh * 0.2, 2, sx + sw * 0.45, sy + sh * 0.45, sw * 0.8);
  gr.addColorStop(0, 'rgba(255,255,255,0.3)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.03)');
  gr.addColorStop(1, 'rgba(0,0,20,0.35)');
  g.fillStyle = gr;
  g.fillRect(sx, sy, sw, sh);
  g.restore();
  rr(g, sx, sy, sw, sh, 22);
  stroke(g, INK, 2);
  text(g, 'HIKARI', 40, 214, 9, { font: F.y2k, weight: 700, color: '#dfe3ee', align: 'left', italic: true });
  text(g, 'CT-1486', 204, 214, 6, { font: F.y2k, weight: 700, color: '#b9bccb', align: 'right' });
  rr(g, 230, 54, 54, 168, 6);
  paint(g, '#2e2a36', [230, 54, 54, 168], { lw: 2, gloss: 0.2 });
  circ(g, 257, 84, 18);
  paint(g, '#c9cfdc', [239, 66, 36, 36], { lw: 2, gloss: 0.5 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    text(g, String(i + 1), 257 + Math.cos(a) * 13, 84 + Math.sin(a) * 13, 3.6, { font: F.y2k, weight: 700, color: INK });
  }
  circ(g, 257, 84, 6);
  paint(g, '#55535e', [251, 78, 12, 12], { lw: 1.4, gloss: 0.5 });
  circ(g, 257, 124, 10);
  paint(g, '#c9cfdc', [247, 114, 20, 20], { lw: 1.8, gloss: 0.5 });
  g.fillStyle = 'rgba(0,0,0,0.5)';
  for (let i = 0; i < 9; i++) {
    rr(g, 238, 146 + i * 7, 38, 3, 1.5);
    g.fill();
  }
  circ(g, 274, 214, 2.2);
  fill(g, '#ff3a3a');
  for (const x of [30, 238]) {
    rr(g, x, 240, 34, 10, 3);
    paint(g, '#2b2838', [x, 240, 34, 10], { lw: 1.8 });
  }
}

// ------------------------------------------------------------------ Shōwa idol stage float
function wreath(g, x, y, s, col) {
  rr(g, x - 1.5, y, 3, 70 * s, 1);
  fill(g, '#6b4a2a');
  g.beginPath();
  g.moveTo(x, y + 60 * s);
  g.lineTo(x - 14 * s, y + 92 * s);
  g.moveTo(x, y + 60 * s);
  g.lineTo(x + 14 * s, y + 92 * s);
  stroke(g, '#6b4a2a', 2);
  const r = rng(Math.floor(x));
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    circ(g, x + Math.cos(a) * 18 * s, y + Math.sin(a) * 18 * s, 5.6 * s);
    paint(g, [col, '#fff4f8', '#ffd36a', col][i % 4], [x - 24 * s, y - 24 * s, 48 * s, 48 * s], { lw: 1, gloss: 0.3, shade: 0.2 });
  }
  circ(g, x, y, 11 * s);
  paint(g, '#fffaf2', [x - 11 * s, y - 11 * s, 22 * s, 22 * s], { lw: 1.4 });
  text(g, '祝', x, y + 0.5, 13 * s, { font: F.serif, weight: 900, color: '#c4202f' });
  rr(g, x - 4 * s, y + 13 * s, 8 * s, 30 * s, 1);
  fill(g, '#fffaf2');
  void r;
}
function stageFloat(g) {
  // arch backdrop
  g.beginPath();
  g.moveTo(40, 192);
  g.lineTo(40, 70);
  g.quadraticCurveTo(40, 30, 168, 28);
  g.quadraticCurveTo(296, 30, 296, 70);
  g.lineTo(296, 192);
  g.closePath();
  paint(g, '#1c1640', [40, 28, 256, 164], { gloss: 0.12, shade: 0.25, lw: 2.6 });
  const r = rng(8);
  for (let i = 0; i < 40; i++) {
    const x = 50 + r() * 236, y = 40 + r() * 140;
    circ(g, x, y, 0.5 + r());
    fill(g, `rgba(255,255,255,${0.3 + r() * 0.5})`);
  }
  // neon marquee on top of the arch
  rr(g, 84, 0, 168, 30, 6);
  paint(g, '#241a4a', [84, 0, 168, 30], { lw: 2.4, gloss: 0.15, shade: 0.2 });
  for (let x = 92; x < 248; x += 8) {
    circ(g, x, 3.6, 1.3);
    fill(g, '#ffe9a8');
    circ(g, x, 26.4, 1.3);
    fill(g, '#ffe9a8');
  }
  text(g, '星空歌謡ショー', 168, 15.5, 16, { font: F.pop, weight: 400, color: '#ffd6ea', glow: 6, glowColor: '#ff4fa0', maxW: 150 });
  // neon heart
  g.beginPath();
  const hx = 168, hy = 108;
  g.moveTo(hx, hy + 42);
  g.bezierCurveTo(hx - 70, hy + 2, hx - 40, hy - 46, hx, hy - 16);
  g.bezierCurveTo(hx + 40, hy - 46, hx + 70, hy + 2, hx, hy + 42);
  g.save();
  g.shadowColor = '#ff4fa0';
  g.shadowBlur = 8 * (g.getTransform().a || 1);
  stroke(g, '#ff8fc0', 4);
  g.restore();
  g.beginPath();
  g.moveTo(hx, hy + 42);
  g.bezierCurveTo(hx - 70, hy + 2, hx - 40, hy - 46, hx, hy - 16);
  g.bezierCurveTo(hx + 40, hy - 46, hx + 70, hy + 2, hx, hy + 42);
  stroke(g, '#fff0f6', 1.4);
  // spotlight cone on the mic
  const sg = g.createLinearGradient(0, 70, 0, 192);
  sg.addColorStop(0, 'rgba(255,250,230,0.05)');
  sg.addColorStop(1, 'rgba(255,250,230,0.32)');
  g.fillStyle = sg;
  g.beginPath();
  g.moveTo(160, 70);
  g.lineTo(176, 70);
  g.lineTo(206, 192);
  g.lineTo(130, 192);
  g.closePath();
  g.fill();
  // mirror ball
  g.beginPath();
  g.moveTo(168, 28);
  g.lineTo(168, 38);
  stroke(g, '#cfd3de', 1.2);
  circ(g, 168, 48, 11);
  paint(g, '#cfd6e6', [157, 37, 22, 22], { lw: 1.8, gloss: 0.6 });
  g.save();
  circ(g, 168, 48, 11);
  g.clip();
  g.strokeStyle = 'rgba(80,80,110,0.5)';
  g.lineWidth = 0.6;
  for (let y = 38; y < 60; y += 3.2) {
    g.beginPath();
    g.moveTo(156, y);
    g.lineTo(180, y);
    g.stroke();
  }
  for (let x = 156; x < 182; x += 3.2) {
    g.beginPath();
    g.moveTo(x, 37);
    g.lineTo(x, 59);
    g.stroke();
  }
  g.restore();
  // stand mic with ribbons
  g.beginPath();
  g.moveTo(168, 186);
  g.lineTo(168, 118);
  stroke(g, INK, 4);
  g.beginPath();
  g.moveTo(168, 186);
  g.lineTo(168, 118);
  stroke(g, '#e9edf5', 2);
  g.beginPath();
  g.moveTo(154, 192);
  g.lineTo(168, 182);
  g.lineTo(182, 192);
  stroke(g, INK, 3);
  rr(g, 164, 100, 8, 20, 3);
  paint(g, '#ff9cc8', [164, 100, 8, 20], { lw: 1.6 });
  circ(g, 168, 98, 6.5);
  paint(g, '#d9dde8', [161.5, 91.5, 13, 13], { lw: 1.6, gloss: 0.5 });
  for (const [c, s] of [['#ff8fc0', -1], ['#8fd8ff', 1]]) {
    g.beginPath();
    g.moveTo(168, 122);
    g.bezierCurveTo(168 + s * 12, 130, 168 + s * 4, 146, 168 + s * 14, 160);
    stroke(g, c, 2.4);
  }
  wreath(g, 66, 112, 1, '#ff8fbf');
  wreath(g, 270, 112, 1, '#8fd0ff');
  // stage floor
  rr(g, 22, 186, 292, 12, 3);
  paint(g, '#141218', [22, 186, 292, 12], { lw: 2, gloss: 0.5 });
  // skirt with scallops
  rr(g, 18, 196, 300, 50, 4);
  paint(g, '#fff3f8', [18, 196, 300, 50], { gloss: 0.2, shade: 0.3 });
  g.save();
  rr(g, 18, 196, 300, 50, 4);
  g.clip();
  for (let x = 18; x < 320; x += 30) {
    g.fillStyle = '#ff8fbf';
    g.fillRect(x, 196, 15, 50);
  }
  for (let x = 18; x < 320; x += 20) {
    g.beginPath();
    g.arc(x + 10, 196, 10, 0, Math.PI);
    fill(g, '#ff5a9a');
  }
  g.restore();
  rr(g, 18, 196, 300, 50, 4);
  stroke(g, INK, 2.4);
  for (let x = 28; x < 318; x += 20) {
    circ(g, x, 206, 2.2);
    paint(g, '#fff6c0', [x - 2.2, 203.8, 4.4, 4.4], { lw: 0.8, gloss: 0.4 });
  }
}

// ------------------------------------------------------------------ the big banner
function bannerFloat(g, f) {
  for (const x of [14, 344]) {
    rr(g, x - 3, 0, 6, 112, 2);
    paint(g, '#7aa04a', [x - 3, 0, 6, 112], { lw: 1.6, gloss: 0.4 });
    for (let y = 18; y < 110; y += 22) {
      g.fillStyle = 'rgba(34,24,58,0.45)';
      g.fillRect(x - 3, y, 6, 1.4);
    }
    circ(g, x, 0, 4.4);
    paint(g, C.gold, [x - 4.4, -4.4, 8.8, 8.8], { lw: 1.4, gloss: 0.6 });
  }
  const wv = f ? 2 : -2;
  g.beginPath();
  g.moveTo(16, 10);
  g.quadraticCurveTo(180, 16 + wv, 342, 10);
  g.lineTo(342, 72);
  g.quadraticCurveTo(180, 80 - wv, 16, 72);
  g.closePath();
  paint(g, '#fffaf0', [16, 10, 326, 70], { gloss: 0.2, shade: 0.26 });
  g.save();
  g.beginPath();
  g.moveTo(16, 10);
  g.quadraticCurveTo(180, 16 + wv, 342, 10);
  g.lineTo(342, 72);
  g.quadraticCurveTo(180, 80 - wv, 16, 72);
  g.closePath();
  g.clip();
  g.fillStyle = '#d8402c';
  g.fillRect(0, 8, 360, 7);
  g.fillRect(0, 69, 360, 12);
  g.restore();
  text(g, 'ひかり線', 64, 44 + wv * 0.3, 15, { font: F.mincho, weight: 800, color: '#283070' });
  text(g, '銀河大行進', 214, 44 + wv * 0.3, 32, { font: F.mincho, weight: 800, color: INK });
  for (const x of [16, 342]) {
    for (const dy of [72, 10]) {
      g.beginPath();
      g.moveTo(x, dy);
      g.lineTo(x, dy + 14);
      stroke(g, '#d8402c', 2);
      circ(g, x, dy + 16, 2.6);
      paint(g, C.gold, [x - 2.6, dy + 13.4, 5.2, 5.2], { lw: 1 });
    }
  }
  chochin(g, -6, 94, 40, 52, '#e2394a', { faceOn: true });
  chochin(g, 324, 94, 40, 52, '#e2394a', { faceOn: true });
}

// ------------------------------------------------------------------ the aqua bubble
function bubble(g, s, scene) {
  const c = s / 2;
  const R = s / 2 - 3;
  if (scene) {
    g.save();
    circ(g, c, c, R);
    g.clip();
    const sk = g.createLinearGradient(0, 0, 0, s);
    sk.addColorStop(0, '#2a8ff0');
    sk.addColorStop(0.55, '#9fe4ff');
    sk.addColorStop(1, '#eafcff');
    g.fillStyle = sk;
    g.fillRect(0, 0, s, s);
    for (const [x, y, w] of [[0.25, 0.3, 0.2], [0.62, 0.22, 0.26], [0.8, 0.42, 0.14]]) {
      for (let k = 0; k < 4; k++) {
        ell(g, s * (x + (k - 1.5) * w * 0.28), s * (y + (k % 2 ? -0.02 : 0.01)), s * w * 0.28, s * w * 0.18);
        fill(g, 'rgba(255,255,255,0.85)');
      }
    }
    const hill = g.createLinearGradient(0, s * 0.55, 0, s);
    hill.addColorStop(0, '#8be05a');
    hill.addColorStop(1, '#2c9a3a');
    g.fillStyle = hill;
    g.beginPath();
    g.moveTo(0, s * 0.7);
    g.quadraticCurveTo(s * 0.35, s * 0.5, s * 0.7, s * 0.62);
    g.quadraticCurveTo(s * 0.9, s * 0.68, s, s * 0.64);
    g.lineTo(s, s);
    g.lineTo(0, s);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.beginPath();
    g.moveTo(0, s * 0.72);
    g.quadraticCurveTo(s * 0.35, s * 0.52, s * 0.7, s * 0.64);
    g.lineTo(s * 0.7, s * 0.67);
    g.quadraticCurveTo(s * 0.35, s * 0.56, 0, s * 0.76);
    g.closePath();
    g.fill();
    const sun = g.createRadialGradient(s * 0.75, s * 0.2, 0, s * 0.75, s * 0.2, s * 0.3);
    sun.addColorStop(0, 'rgba(255,255,240,0.9)');
    sun.addColorStop(1, 'rgba(255,255,240,0)');
    g.fillStyle = sun;
    g.fillRect(0, 0, s, s);
    g.restore();
  }
  circ(g, c, c, R);
  const rim = g.createRadialGradient(c, c, R * (scene ? 0.7 : 0.45), c, c, R);
  rim.addColorStop(0, scene ? 'rgba(160,240,255,0)' : 'rgba(160,240,255,0.06)');
  rim.addColorStop(0.8, 'rgba(120,220,255,0.28)');
  rim.addColorStop(1, 'rgba(210,250,255,0.75)');
  g.fillStyle = rim;
  g.fill();
  if (g.createConicGradient) {
    g.save();
    circ(g, c, c, R);
    g.clip();
    const ir = g.createConicGradient(0.6, c, c);
    ir.addColorStop(0, 'rgba(255,120,220,0.22)');
    ir.addColorStop(0.25, 'rgba(255,240,120,0.18)');
    ir.addColorStop(0.5, 'rgba(120,255,220,0.22)');
    ir.addColorStop(0.75, 'rgba(120,160,255,0.22)');
    ir.addColorStop(1, 'rgba(255,120,220,0.22)');
    g.lineWidth = R * 0.12;
    g.strokeStyle = ir;
    circ(g, c, c, R * 0.95);
    g.stroke();
    g.restore();
  }
  circ(g, c, c, R);
  stroke(g, 'rgba(230,252,255,0.9)', Math.max(1, s * 0.012));
  g.save();
  circ(g, c, c, R);
  g.clip();
  g.beginPath();
  g.ellipse(c - R * 0.32, c - R * 0.42, R * 0.48, R * 0.22, -0.6, 0, Math.PI * 2);
  const hl = g.createLinearGradient(c - R * 0.7, c - R * 0.7, c, c - R * 0.2);
  hl.addColorStop(0, 'rgba(255,255,255,0.92)');
  hl.addColorStop(1, 'rgba(255,255,255,0.08)');
  g.fillStyle = hl;
  g.fill();
  ell(g, c + R * 0.5, c + R * 0.5, R * 0.12, R * 0.06, -0.6);
  fill(g, 'rgba(255,255,255,0.7)');
  g.restore();
}

// ------------------------------------------------------------------ sky things
function shipImp(g, s = 1, col = '#f2efe6') {
  g.save();
  g.scale(s, s);
  g.beginPath();
  g.moveTo(88, 11);
  g.quadraticCurveTo(70, 3, 26, 6);
  g.lineTo(6, 4);
  g.lineTo(10, 11);
  g.lineTo(6, 18);
  g.lineTo(26, 16);
  g.quadraticCurveTo(70, 19, 88, 11);
  g.closePath();
  paint(g, col, [6, 3, 82, 16], { lw: 1.6, gloss: 0.5, shade: 0.4 });
  g.fillStyle = 'rgba(200,170,90,0.7)';
  g.fillRect(40, 10, 30, 1.2);
  g.restore();
}
function shipFlag(g) {
  g.beginPath();
  g.moveTo(148, 22);
  g.bezierCurveTo(120, 4, 70, 2, 30, 12);
  g.quadraticCurveTo(14, 2, 4, 4);
  g.quadraticCurveTo(16, 14, 10, 22);
  g.quadraticCurveTo(16, 30, 4, 40);
  g.quadraticCurveTo(14, 42, 30, 32);
  g.bezierCurveTo(70, 42, 120, 40, 148, 22);
  g.closePath();
  paint(g, '#fbfbf8', [4, 2, 144, 40], { lw: 1.8, gloss: 0.55, shade: 0.35 });
  g.beginPath();
  g.moveTo(40, 22);
  g.quadraticCurveTo(90, 18, 140, 22);
  stroke(g, 'rgba(160,170,200,0.6)', 1);
}
function shipAll(g) {
  rr(g, 4, 6, 60, 12, 3);
  paint(g, '#8e9a86', [4, 6, 60, 12], { lw: 1.6, gloss: 0.4, shade: 0.4 });
  rr(g, 0, 4, 14, 16, 2);
  paint(g, '#6e7a68', [0, 4, 14, 16], { lw: 1.4 });
  poly(g, [64, 7, 76, 12, 64, 17]);
  paint(g, '#a6b29c', [64, 7, 12, 10], { lw: 1.4 });
}
function cicada(g, f) {
  if (f) {
    ell(g, 16, 6, 18, 4.6, -0.25);
    fill(g, 'rgba(220,240,255,0.45)');
  } else {
    g.beginPath();
    g.ellipse(14, 12, 18, 5.6, 0.1, 0, Math.PI * 2);
    paint(g, 'rgba(225,245,255,0.55)', [-4, 6, 36, 12], { lw: 1, ink: 'rgba(34,24,58,0.6)', gloss: 0.3 });
    g.strokeStyle = 'rgba(60,50,40,0.5)';
    g.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(28, 12);
      g.lineTo(2 + i * 5, 8 + i * 2.2);
      g.stroke();
    }
  }
  ell(g, 26, 14, 12, 6);
  paint(g, '#5d5130', [14, 8, 24, 12], { lw: 1.6, gloss: 0.35 });
  ell(g, 37, 13, 5, 5);
  paint(g, '#4a5a2a', [32, 8, 10, 10], { lw: 1.4, gloss: 0.4 });
  circ(g, 39.5, 10.5, 1.8);
  fill(g, '#2a1f18');
}
function crow(g, f) {
  g.beginPath();
  if (f) {
    g.moveTo(30, 18);
    g.quadraticCurveTo(14, 4, 2, 2);
    g.quadraticCurveTo(14, 14, 24, 20);
  } else {
    g.moveTo(30, 18);
    g.quadraticCurveTo(14, 26, 4, 34);
    g.quadraticCurveTo(18, 30, 26, 22);
  }
  g.closePath();
  fill(g, '#14121a');
  ell(g, 32, 20, 16, 6);
  fill(g, '#16141c');
  circ(g, 48, 17, 5);
  fill(g, '#16141c');
  poly(g, [52, 15, 62, 18, 52, 20]);
  fill(g, '#2a2830');
  poly(g, [16, 18, 4, 14, 6, 22]);
  fill(g, '#16141c');
  circ(g, 49.5, 15.5, 1);
  fill(g, '#9aa2c0');
}
function feather(g) {
  g.beginPath();
  g.moveTo(8, 42);
  g.quadraticCurveTo(7, 20, 8, 2);
  stroke(g, 'rgba(255,255,255,0.9)', 1);
  g.beginPath();
  g.moveTo(8, 4);
  g.bezierCurveTo(18, 12, 16, 30, 8, 36);
  g.bezierCurveTo(0, 30, -1, 12, 8, 4);
  g.fillStyle = 'rgba(255,255,255,0.88)';
  g.fill();
  g.strokeStyle = 'rgba(200,210,240,0.6)';
  g.lineWidth = 0.4;
  for (let y = 8; y < 34; y += 3) {
    g.beginPath();
    g.moveTo(8, y);
    g.lineTo(13, y - 2);
    g.moveTo(8, y);
    g.lineTo(3, y - 2);
    g.stroke();
  }
}
function lunarTear(g) {
  for (let i = 0; i < 5; i++) {
    g.save();
    g.translate(17, 17);
    g.rotate((i / 5) * Math.PI * 2);
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(-7, -6, -5, -14, 0, -15);
    g.bezierCurveTo(5, -14, 7, -6, 0, 0);
    const pg = g.createLinearGradient(0, 0, 0, -15);
    pg.addColorStop(0, '#9fdcff');
    pg.addColorStop(1, '#f2fbff');
    g.fillStyle = pg;
    g.fill();
    stroke(g, 'rgba(60,110,170,0.6)', 0.8);
    g.restore();
  }
  circ(g, 17, 17, 3);
  fill(g, '#fff6c0');
}

function lantern(g, red) {
  g.beginPath();
  g.moveTo(18, 0);
  g.lineTo(18, 4);
  stroke(g, INK, 1.4);
  chochin(g, 0, 4, 36, 46, red ? '#e2394a' : '#fbf6ec', { faceOn: false, kanji: '祭', kc: red ? '#1a1014' : '#d8402c' });
}

function three00(g) {
  text(g, '300', 35, 17, 22, { font: F.pop, weight: 400, color: '#bfe8ff', stroke: '#2a6fd0', sw: 3, glow: 4, glowColor: '#6fc8ff' });
}

// ------------------------------------------------------------------ registry
const BIG_LEGS = (n, len, shoe = '#2b2238') => ({ xs: Array.from({ length: n }, (_, i) => -0.38 + (0.76 * i) / (n - 1)), len, shoe, lw: 5 });

export const FLOATS = {
  fumikiri: { w: 80, h: 200, frames: 2, anim: { by: 'beat', rate: 1.5 }, legs: { xs: [-0.13, 0.13], len: 24, shoe: '#2b2238' }, lamps: [[0.175, 0.29], [0.825, 0.29]], draw: (g, f) => fumikiri(g, f) },
  train: { w: 176, h: 184, motion: 'rail', big: true, lights: [[0.18, 0.66], [0.82, 0.66]], draw: (g) => train(g) },
  hit_big: { w: 164, h: 164, motion: 'float', lift: 0.55, big: true, approach: true, draw: (g) => hitCircle(g, 82, 82, 64, COMBO[0], 1) },
  hit_1: { w: 64, h: 64, motion: 'hop', hop: 0.25, approach: true, draw: (g) => hitCircle(g, 32, 32, 24, COMBO[0], 1) },
  hit_2: { w: 64, h: 64, motion: 'hop', hop: 0.25, approach: true, draw: (g) => hitCircle(g, 32, 32, 24, COMBO[1], 2) },
  hit_3: { w: 64, h: 64, motion: 'hop', hop: 0.25, approach: true, draw: (g) => hitCircle(g, 32, 32, 24, COMBO[2], 3) },
  hit_4: { w: 64, h: 64, motion: 'hop', hop: 0.25, approach: true, draw: (g) => hitCircle(g, 32, 32, 24, COMBO[3], 4) },
  mikoshi: { w: 320, h: 202, big: true, legs: BIG_LEGS(8, 40, 'tabi'), flame: [0.5, 0.74], draw: (g) => mikoshi(g) },
  flame: { w: 96, h: 120, frames: 4, part: true, draw: (g, f) => flame(g, f) },
  crt_float: { w: 300, h: 252, frames: 2, anim: { by: 'time', rate: 2.5 }, big: true, legs: BIG_LEGS(10, 42), draw: (g, f) => crtFloat(g, f) },
  stage: { w: 336, h: 248, big: true, legs: BIG_LEGS(10, 40), sparkle: [0.5, 0.19], draw: (g) => stageFloat(g) },
  banner: { w: 360, h: 146, frames: 2, anim: { by: 'beat', rate: 0.5 }, big: true, legs: { xs: [-0.53, -0.47, 0.47, 0.53], len: 24, shoe: 'geta' }, draw: (g, f) => bannerFloat(g, f) },
  bubble: { w: 230, h: 230, motion: 'float', lift: 1.1, big: true, draw: (g) => bubble(g, 230, true) },
  bub: { w: 40, h: 40, part: true, draw: (g) => bubble(g, 40, false) },
  ship_imp: { w: 90, h: 22, part: true, draw: (g) => shipImp(g) },
  ship_flag: { w: 150, h: 44, part: true, draw: (g) => shipFlag(g) },
  ship_all: { w: 78, h: 24, part: true, draw: (g) => shipAll(g) },
  cicada: { w: 44, h: 22, frames: 2, part: true, draw: (g, f) => cicada(g, f) },
  crow: { w: 64, h: 36, frames: 2, part: true, draw: (g, f) => crow(g, f) },
  feather: { w: 16, h: 44, part: true, draw: (g) => feather(g) },
  lunar: { w: 34, h: 34, part: true, draw: (g) => lunarTear(g) },
  lantern_r: { w: 36, h: 50, part: true, draw: (g) => lantern(g, true) },
  lantern_w: { w: 36, h: 50, part: true, draw: (g) => lantern(g, false) },
  s300: { w: 70, h: 34, part: true, draw: (g) => three00(g) },
};
