// Every icon in HIKARI Aqua 2004 is painted here, in code, on a 48-unit grid.
// No icon sets: each one is drawn for exactly the thing it stands for.
import { mkCanvas, rrect } from './util.js';

const cache = new Map();

export function iconURL(name, size = 48) {
  const key = name + '@' + size;
  let url = cache.get(key);
  if (url) return url;
  const px = Math.round(size * 2);
  const c = mkCanvas(px, px);
  const g = c.getContext('2d');
  g.scale(px / 48, px / 48);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  (P[name] || P.file)(g, size);
  url = c.toDataURL();
  cache.set(key, url);
  return url;
}

export function iconImg(name, size = 48, cls = '') {
  return `<img class="${cls}" src="${iconURL(name, size)}" width="${size}" height="${size}" alt="" draggable="false">`;
}

// ── tiny painting kit ──────────────────────────────────────────────
function lg(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}
function rg(g, x0, y0, r0, x1, y1, r1, stops) {
  const gr = g.createRadialGradient(x0, y0, r0, x1, y1, r1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}
function conic(g, a, x, y, stops) {
  if (g.createConicGradient) {
    const gr = g.createConicGradient(a, x, y);
    stops.forEach(([o, c]) => gr.addColorStop(o, c));
    return gr;
  }
  return lg(g, x - 20, y - 20, x + 20, y + 20, stops);
}
function ell(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); }
function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); }
function shadow(g, y = 44.5, rx = 18, a = 0.2) {
  g.fillStyle = rg(g, 24, y, 0, 24, y, rx, [[0, `rgba(0,20,60,${a})`], [1, 'rgba(0,20,60,0)']]);
  g.save(); g.scale(1, 0.18); circ(g, 24, y / 0.18, rx); g.fill(); g.restore();
}
function gloss(g, x, y, w, hh, a = 0.55) {
  g.fillStyle = lg(g, 0, y, 0, y + hh, [[0, `rgba(255,255,255,${a})`], [1, 'rgba(255,255,255,0)']]);
  rrect(g, x, y, w, hh, Math.min(6, hh / 2)); g.fill();
}

// ── shared parts ───────────────────────────────────────────────────
function folderBack(g) {
  shadow(g);
  g.beginPath();
  g.moveTo(3, 11); g.quadraticCurveTo(3, 8, 6, 8); g.lineTo(17, 8); g.lineTo(20, 11);
  g.lineTo(42, 11); g.quadraticCurveTo(45, 11, 45, 14); g.lineTo(45, 40); g.quadraticCurveTo(45, 42, 43, 42);
  g.lineTo(5, 42); g.quadraticCurveTo(3, 42, 3, 40); g.closePath();
  g.fillStyle = lg(g, 0, 8, 0, 42, [[0, '#f6cf68'], [1, '#d39722']]);
  g.fill();
  g.strokeStyle = '#a8740f'; g.lineWidth = 0.9; g.stroke();
}
function folderFront(g) {
  g.beginPath();
  g.moveTo(4, 17); g.lineTo(44, 17); g.quadraticCurveTo(46, 17, 45.7, 19);
  g.lineTo(44.2, 41); g.quadraticCurveTo(44, 43, 42, 43); g.lineTo(6, 43);
  g.quadraticCurveTo(4, 43, 3.8, 41); g.lineTo(2.3, 19); g.quadraticCurveTo(2, 17, 4, 17); g.closePath();
  g.fillStyle = lg(g, 0, 17, 0, 43, [[0, '#ffedb0'], [0.45, '#fcd472'], [1, '#eab43c']]);
  g.fill();
  g.strokeStyle = '#bd8618'; g.lineWidth = 0.9; g.stroke();
  g.save(); g.clip();
  g.fillStyle = lg(g, 0, 17, 0, 27, [[0, 'rgba(255,255,255,.7)'], [1, 'rgba(255,255,255,0)']]);
  g.fillRect(0, 17, 48, 10);
  g.restore();
}
function page(g, x = 10, y = 4, w = 28, hh = 40, ear = 9) {
  shadow(g, 45, 15, 0.18);
  g.beginPath();
  g.moveTo(x, y); g.lineTo(x + w - ear, y); g.lineTo(x + w, y + ear); g.lineTo(x + w, y + hh); g.lineTo(x, y + hh); g.closePath();
  g.fillStyle = lg(g, x, y, x + w, y + hh, [[0, '#ffffff'], [1, '#e7edf6']]);
  g.fill();
  g.strokeStyle = '#7d8ea8'; g.lineWidth = 1; g.stroke();
  g.beginPath(); g.moveTo(x + w - ear, y); g.lineTo(x + w - ear, y + ear); g.lineTo(x + w, y + ear); g.closePath();
  g.fillStyle = lg(g, x + w - ear, y, x + w, y + ear, [[0, '#f6f8fb'], [1, '#c9d4e3']]);
  g.fill(); g.stroke();
}
function lines(g, x, y, w, n, step = 4.4, col = '#8fa6c8') {
  g.strokeStyle = col; g.lineWidth = 1.1;
  for (let i = 0; i < n; i++) {
    const ww = w * (i % 3 === 2 ? 0.62 : i % 4 === 1 ? 0.85 : 1);
    g.beginPath(); g.moveTo(x, y + i * step); g.lineTo(x + ww, y + i * step); g.stroke();
  }
}
function disc(g, cx, cy, r, rot = 0.6) {
  circ(g, cx, cy, r);
  g.fillStyle = rg(g, cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r, [[0, '#ffffff'], [1, '#c3ccd8']]);
  g.fill();
  g.save(); circ(g, cx, cy, r); g.clip();
  g.globalAlpha = 0.55;
  g.fillStyle = conic(g, rot, cx, cy, [[0, '#ffb3e6'], [0.17, '#fff2a8'], [0.34, '#a8ffd8'], [0.5, '#9fd8ff'], [0.67, '#d6b3ff'], [0.84, '#ffc2b3'], [1, '#ffb3e6']]);
  g.fillRect(cx - r, cy - r, r * 2, r * 2);
  g.globalAlpha = 0.65;
  g.fillStyle = 'rgba(255,255,255,.9)';
  g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, -2.3, -1.9); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, 0.85, 1.15); g.closePath(); g.fill();
  g.restore();
  g.globalAlpha = 1;
  circ(g, cx, cy, r * 0.34); g.fillStyle = 'rgba(225,232,242,.95)'; g.fill();
  g.strokeStyle = 'rgba(120,135,160,.6)'; g.lineWidth = 0.7; g.stroke();
  g.save(); g.globalCompositeOperation = 'destination-out'; circ(g, cx, cy, r * 0.13); g.fill(); g.restore();
  circ(g, cx, cy, r * 0.13); g.strokeStyle = 'rgba(90,100,120,.7)'; g.stroke();
  circ(g, cx, cy, r); g.strokeStyle = 'rgba(90,104,130,.75)'; g.lineWidth = 0.9; g.stroke();
}
function sphere(g, cx, cy, r, c0, c1, c2) {
  circ(g, cx, cy, r);
  g.fillStyle = rg(g, cx - r * 0.35, cy - r * 0.45, r * 0.1, cx, cy, r, [[0, c0], [0.55, c1], [1, c2]]);
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 0.8; g.stroke();
  g.fillStyle = lg(g, 0, cy - r, 0, cy, [[0, 'rgba(255,255,255,.8)'], [1, 'rgba(255,255,255,0)']]);
  ell(g, cx, cy - r * 0.48, r * 0.68, r * 0.42); g.fill();
}
function glassSquare(g, x, y, s, c0, c1, c2) {
  rrect(g, x, y, s, s, s * 0.22);
  g.fillStyle = lg(g, 0, y, 0, y + s, [[0, c0], [0.5, c1], [1, c2]]);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.4; g.stroke();
  g.save(); rrect(g, x, y, s, s, s * 0.22); g.clip();
  g.fillStyle = lg(g, 0, y, 0, y + s * 0.5, [[0, 'rgba(255,255,255,.65)'], [1, 'rgba(255,255,255,.08)']]);
  ell(g, x + s / 2, y + s * 0.1, s * 0.7, s * 0.42); g.fill();
  g.restore();
}
function hillScene(g, x, y, w, hh, dusk = false) {
  g.save(); g.beginPath(); g.rect(x, y, w, hh); g.clip();
  g.fillStyle = dusk ? lg(g, 0, y, 0, y + hh, [[0, '#3a3a8a'], [0.6, '#e08a8a'], [1, '#ffc27a']]) : lg(g, 0, y, 0, y + hh, [[0, '#1f6fe0'], [1, '#bfe6ff']]);
  g.fillRect(x, y, w, hh);
  g.fillStyle = 'rgba(255,255,255,.9)';
  ell(g, x + w * 0.3, y + hh * 0.28, w * 0.12, hh * 0.08); g.fill();
  ell(g, x + w * 0.38, y + hh * 0.24, w * 0.09, hh * 0.09); g.fill();
  g.beginPath();
  g.moveTo(x, y + hh * 0.62);
  g.quadraticCurveTo(x + w * 0.35, y + hh * 0.38, x + w, y + hh * 0.72);
  g.lineTo(x + w, y + hh); g.lineTo(x, y + hh); g.closePath();
  g.fillStyle = dusk ? lg(g, 0, y + hh * 0.4, 0, y + hh, [[0, '#7a8a3a'], [1, '#2f4a1a']]) : lg(g, 0, y + hh * 0.4, 0, y + hh, [[0, '#8be04a'], [1, '#2f9a1f']]);
  g.fill();
  g.restore();
}
function crtBox(g, x, y, w, hh, screenFn) {
  rrect(g, x, y, w, hh, w * 0.14);
  g.fillStyle = lg(g, 0, y, 0, y + hh, [[0, '#fbfbfd'], [0.5, '#dfe3ea'], [1, '#a7afbb']]);
  g.fill();
  g.strokeStyle = '#6f7887'; g.lineWidth = 0.9; g.stroke();
  const sx = x + w * 0.1, sy = y + hh * 0.12, sw = w * 0.62, sh = hh * 0.72;
  rrect(g, sx, sy, sw, sh, sw * 0.16);
  g.fillStyle = '#10213a'; g.fill();
  g.save(); rrect(g, sx + 0.8, sy + 0.8, sw - 1.6, sh - 1.6, sw * 0.14); g.clip();
  screenFn(sx, sy, sw, sh);
  g.fillStyle = 'rgba(0,0,0,.18)';
  for (let yy = sy; yy < sy + sh; yy += 1.6) g.fillRect(sx, yy, sw, 0.55);
  g.fillStyle = rg(g, sx + sw * 0.3, sy + sh * 0.25, 0, sx + sw * 0.3, sy + sh * 0.25, sw * 0.6, [[0, 'rgba(255,255,255,.4)'], [1, 'rgba(255,255,255,0)']]);
  g.fillRect(sx, sy, sw, sh);
  g.restore();
  // knobs and grille
  const kx = x + w * 0.83;
  circ(g, kx, y + hh * 0.3, w * 0.055); g.fillStyle = '#5b6372'; g.fill();
  circ(g, kx, y + hh * 0.52, w * 0.045); g.fillStyle = '#7a8291'; g.fill();
  g.fillStyle = '#7d8593';
  for (let i = 0; i < 3; i++) g.fillRect(kx - w * 0.06, y + hh * (0.68 + i * 0.07), w * 0.12, 0.8);
}
function pixelBeetle(g, x, y, s) {
  const map = [
    '..a...a..',
    '...a.a...',
    '..hhhhh..',
    '.lgGgGgl.',
    'l.gGsGg.l',
    '.lgGsGgl.',
    'l.gGsGg.l',
    '.lgggggl.',
    '...ggg...',
  ];
  const pal = { a: '#22313a', h: '#1b3b3a', l: '#22313a', g: '#1c8f6f', G: '#4fd7a8', s: '#0f5a49' };
  map.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '.') return;
    g.fillStyle = pal[ch];
    g.fillRect(x + i * s, y + j * s, s + 0.05, s + 0.05);
  }));
  g.fillStyle = 'rgba(255,230,140,.85)';
  g.fillRect(x + 3 * s, y + 3 * s, s * 0.9, s * 0.9);
}

// ── the painters ───────────────────────────────────────────────────
const P = {
  music(g) {
    folderBack(g);
    disc(g, 30, 15, 12, 0.3);
    folderFront(g);
    // a glossy blue eighth note on the front
    g.save(); g.translate(17, 33);
    g.fillStyle = lg(g, 0, -14, 0, 8, [[0, '#7ab8ff'], [1, '#0b4fc9']]);
    g.beginPath(); g.ellipse(0, 4, 4.6, 3.3, -0.4, 0, Math.PI * 2); g.fill();
    g.fillRect(3.2, -12, 2, 16);
    g.beginPath(); g.moveTo(5.2, -12); g.bezierCurveTo(12, -9, 10, -4, 9, -1); g.bezierCurveTo(9, -5, 7, -7, 5.2, -7.6); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)';
    g.beginPath(); g.ellipse(-1.3, 2.8, 1.8, 0.9, -0.4, 0, Math.PI * 2); g.fill();
    g.restore();
  },
  pics(g) {
    folderBack(g);
    g.save(); g.translate(27, 15); g.rotate(0.12);
    g.fillStyle = '#fff'; g.fillRect(-12, -9, 24, 18);
    g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 0.6; g.strokeRect(-12, -9, 24, 18);
    hillScene(g, -10.5, -7.5, 21, 15);
    g.restore();
    folderFront(g);
    g.fillStyle = '#ff8a1a';
    g.font = 'bold 6px Tahoma, sans-serif';
    g.fillText("'04", 31, 39);
  },
  docs(g) {
    folderBack(g);
    g.save(); g.translate(14, 3); g.scale(0.62, 0.62); page(g, 4, 2, 30, 34); lines(g, 9, 16, 18, 4); g.restore();
    folderFront(g);
  },
  crtfolder(g) {
    folderBack(g);
    folderFront(g);
    crtBox(g, 13, 22, 22, 17, (sx, sy, sw, sh) => {
      g.fillStyle = lg(g, 0, sy, 0, sy + sh, [[0, '#2a8cff'], [1, '#0a3a9a']]); g.fillRect(sx, sy, sw, sh);
      g.fillStyle = '#ff7ac0'; circ(g, sx + sw * 0.5, sy + sh * 0.5, sh * 0.22); g.fill();
      g.strokeStyle = 'rgba(255,170,220,.9)'; g.lineWidth = 0.7; circ(g, sx + sw * 0.5, sy + sh * 0.5, sh * 0.36); g.stroke();
    });
  },
  txt(g) {
    page(g);
    lines(g, 14, 17, 18, 6);
    // a hand-ticked box
    g.strokeStyle = '#3c5a85'; g.lineWidth = 1.2; g.strokeRect(14, 10.5, 4.5, 4.5);
    g.strokeStyle = '#1aa33a'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(14.5, 12.5); g.lineTo(16.4, 15); g.lineTo(21, 8.5); g.stroke();
  },
  notepad(g) {
    shadow(g, 45, 15, 0.18);
    rrect(g, 9, 7, 30, 37, 2);
    g.fillStyle = lg(g, 0, 7, 0, 44, [[0, '#fdfdf6'], [1, '#e9ecd6']]);
    g.fill(); g.strokeStyle = '#7f8b70'; g.lineWidth = 1; g.stroke();
    g.fillStyle = lg(g, 0, 4, 0, 11, [[0, '#62a8ff'], [1, '#1a5cd8']]);
    rrect(g, 8, 4, 32, 7, 2); g.fill();
    g.strokeStyle = '#b8c0c9'; g.lineWidth = 1.4;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(12.5 + i * 4.6, 4.5, 1.6, Math.PI, 0); g.stroke(); }
    lines(g, 13, 17, 22, 6, 4.3, '#9db6d6');
    g.strokeStyle = '#e07a7a'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(12, 12); g.lineTo(12, 43); g.stroke();
  },
  beetlecd(g) {
    shadow(g, 45, 18, 0.2);
    disc(g, 24, 23, 20, 1.2);
    g.save(); g.translate(24, 23); g.rotate(-0.35);
    pixelBeetle(g, -7.2, -7.6, 1.6);
    g.restore();
  },
  beetle(g) { pixelBeetle(g, 6, 6, 4); },
  globe(g) {
    shadow(g, 45.5, 17, 0.2);
    // back half of the orbit
    g.save(); g.translate(24, 24); g.rotate(-0.42);
    g.strokeStyle = 'rgba(120,200,255,.55)'; g.lineWidth = 2.4;
    g.beginPath(); g.ellipse(0, 0, 22, 7, 0, Math.PI, Math.PI * 2); g.stroke();
    g.restore();
    sphere(g, 24, 24, 17, '#e6f8ff', '#3aa6f2', '#0a4aa8');
    g.save(); circ(g, 24, 24, 16.6); g.clip();
    g.fillStyle = lg(g, 0, 8, 0, 40, [[0, '#9be86a'], [1, '#2c9a3a']]);
    g.beginPath(); g.moveTo(12, 15); g.bezierCurveTo(18, 10, 24, 14, 22, 19); g.bezierCurveTo(20, 23, 25, 25, 23, 30); g.bezierCurveTo(19, 34, 13, 30, 13, 25); g.bezierCurveTo(9, 22, 9, 18, 12, 15); g.fill();
    g.beginPath(); g.moveTo(29, 22); g.bezierCurveTo(34, 19, 40, 22, 39, 28); g.bezierCurveTo(37, 34, 31, 37, 29, 33); g.bezierCurveTo(27, 29, 26, 25, 29, 22); g.fill();
    g.fillStyle = lg(g, 0, 7, 0, 22, [[0, 'rgba(255,255,255,.75)'], [1, 'rgba(255,255,255,0)']]);
    ell(g, 22, 13, 12, 7); g.fill();
    g.restore();
    // front half of the orbit + a spark
    g.save(); g.translate(24, 24); g.rotate(-0.42);
    g.strokeStyle = lg(g, -22, 0, 22, 0, [[0, '#bff0ff'], [0.5, '#ffffff'], [1, '#6fc8ff']]); g.lineWidth = 2.6;
    g.beginPath(); g.ellipse(0, 0, 22, 7, 0, 0, Math.PI); g.stroke();
    g.restore();
    g.fillStyle = '#fff';
    g.save(); g.translate(39, 11);
    g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, r = i % 2 ? 1.2 : 4.2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
    g.restore();
  },
  msn(g) {
    shadow(g, 45.5, 16, 0.2);
    g.strokeStyle = '#6f7887'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(20, 12); g.lineTo(13, 4); g.moveTo(28, 12); g.lineTo(36, 3); g.stroke();
    circ(g, 13, 4, 1.8); g.fillStyle = '#ff7a9a'; g.fill();
    circ(g, 36, 3, 1.8); g.fillStyle = '#7ad8ff'; g.fill();
    rrect(g, 6, 11, 36, 29, 7);
    g.fillStyle = lg(g, 0, 11, 0, 40, [[0, '#ffffff'], [0.5, '#e3e8ef'], [1, '#aeb7c4']]);
    g.fill(); g.strokeStyle = '#7b8596'; g.lineWidth = 1; g.stroke();
    rrect(g, 10, 15, 28, 20, 5);
    g.fillStyle = rg(g, 20, 21, 1, 24, 25, 18, [[0, '#b8f6ff'], [0.45, '#38b4f0'], [1, '#0b4c9e']]);
    g.fill();
    g.fillStyle = '#fff';
    rrect(g, 17, 21, 3, 4.5, 1.4); g.fill();
    rrect(g, 28, 21, 3, 4.5, 1.4); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 1.6;
    g.beginPath(); g.arc(24, 26.5, 4, 0.25, Math.PI - 0.25); g.stroke();
    g.fillStyle = 'rgba(255,140,170,.55)'; ell(g, 15.5, 28.5, 2, 1.2); g.fill(); ell(g, 32.5, 28.5, 2, 1.2); g.fill();
    g.fillStyle = lg(g, 0, 15, 0, 24, [[0, 'rgba(255,255,255,.5)'], [1, 'rgba(255,255,255,0)']]);
    rrect(g, 11, 15.5, 26, 7, 4); g.fill();
    g.fillStyle = '#8a93a2'; g.fillRect(11, 40, 5, 3); g.fillRect(32, 40, 5, 3);
  },
  bin(g) { drawBin(g, false); },
  binfull(g) { drawBin(g, true); },
  display(g) {
    shadow(g, 45, 17, 0.2);
    rrect(g, 4, 5, 40, 31, 4);
    g.fillStyle = lg(g, 0, 5, 0, 36, [[0, '#fbfaf5'], [1, '#c9c4b4']]); g.fill();
    g.strokeStyle = '#8b8574'; g.lineWidth = 1; g.stroke();
    rrect(g, 8, 8.5, 32, 23, 2); g.fillStyle = '#0b1a33'; g.fill();
    hillScene(g, 9, 9.5, 30, 21);
    g.beginPath(); g.moveTo(18, 36); g.lineTo(30, 36); g.lineTo(34, 43); g.lineTo(14, 43); g.closePath();
    g.fillStyle = lg(g, 0, 36, 0, 43, [[0, '#d9d4c4'], [1, '#a9a393']]); g.fill(); g.stroke();
  },
  computer(g) {
    P.display(g);
    rrect(g, 30, 30, 15, 13, 2);
    g.fillStyle = lg(g, 30, 0, 45, 0, [[0, '#f3f1ea'], [1, '#bdb7a6']]); g.fill();
    g.strokeStyle = '#8b8574'; g.stroke();
    g.fillStyle = '#5ad65a'; g.fillRect(41, 39.5, 2, 1.5);
  },
  hdd(g) {
    shadow(g, 42, 19, 0.2);
    rrect(g, 4, 16, 40, 22, 4);
    g.fillStyle = lg(g, 0, 16, 0, 38, [[0, '#f4f6f9'], [0.5, '#c8ced8'], [1, '#8d96a5']]); g.fill();
    g.strokeStyle = '#6a7381'; g.lineWidth = 1; g.stroke();
    gloss(g, 6, 17, 36, 7, 0.7);
    g.fillStyle = '#39d24a'; g.fillRect(36, 30, 4, 2.4);
    g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 5; i++) g.fillRect(8 + i * 3, 30, 1.6, 4);
  },
  cddrive(g) {
    P.hdd(g);
    g.fillStyle = 'rgba(30,40,60,.55)'; g.fillRect(8, 24, 24, 2);
    disc(g, 18, 11, 9.5, 2.0);
  },
  crtdevice(g) {
    shadow(g, 45, 19, 0.22);
    crtBox(g, 3, 8, 42, 34, (sx, sy, sw, sh) => {
      g.fillStyle = lg(g, 0, sy, 0, sy + sh, [[0, '#1f6fe0'], [1, '#bfe6ff']]); g.fillRect(sx, sy, sw, sh);
      hillScene(g, sx, sy, sw, sh);
    });
    g.strokeStyle = '#6f7887'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(20, 8); g.lineTo(14, 1); g.moveTo(26, 8); g.lineTo(33, 1); g.stroke();
  },
  file(g) { page(g); lines(g, 14, 15, 18, 6); },
  html(g) { badgeFile(g, 'HTML', '#e8742a'); },
  png(g) { badgeFile(g, 'PNG', '#8a4fd8'); },
  jpg(g) { badgeFile(g, 'JPG', '#d8418a', true); },
  wav(g) { badgeFile(g, 'WAV', '#2a9a4a'); },
  psd(g) { badgeFile(g, 'PSD', '#2a62c8'); },
  css(g) { badgeFile(g, 'CSS', '#1a9aa8'); },
  aco(g) { badgeFile(g, 'ACO', '#e0457a'); },
  csv(g) { badgeFile(g, 'CSV', '#3f9a2a'); },
  spoiler(g) { badgeFile(g, '!!', '#d02a1a'); },
  exe(g) {
    shadow(g, 45, 17, 0.2);
    rrect(g, 5, 9, 38, 30, 3);
    g.fillStyle = '#ece9d8'; g.fill(); g.strokeStyle = '#2a4a8a'; g.lineWidth = 1; g.stroke();
    rrect(g, 5, 9, 38, 7, 3); g.fillStyle = lg(g, 0, 9, 0, 16, [[0, '#5fa8ff'], [1, '#0b55df']]); g.fill();
    g.fillStyle = '#e0583a'; g.fillRect(37, 11, 4, 3.4);
    g.fillStyle = '#2a7ae0'; g.fillRect(9, 20, 30, 3);
    g.fillStyle = '#9ab'; g.fillRect(9, 26, 22, 2); g.fillRect(9, 30, 26, 2);
  },
  camera(g) {
    shadow(g, 44, 19, 0.22);
    rrect(g, 4, 13, 40, 26, 6);
    g.fillStyle = lg(g, 0, 13, 0, 39, [[0, '#fbfcfe'], [0.45, '#cfd5de'], [0.5, '#bcc4cf'], [1, '#8e97a5']]); g.fill();
    g.strokeStyle = '#6a7382'; g.lineWidth = 1; g.stroke();
    circ(g, 27, 27, 9.5); g.fillStyle = lg(g, 0, 17, 0, 37, [[0, '#e8ecf2'], [1, '#7d8695']]); g.fill(); g.stroke();
    circ(g, 27, 27, 6.4); g.fillStyle = rg(g, 25, 25, 0.5, 27, 27, 6.4, [[0, '#9fd8ff'], [0.4, '#2a5aa8'], [1, '#0a1530']]); g.fill();
    circ(g, 25, 25, 1.6); g.fillStyle = 'rgba(255,255,255,.85)'; g.fill();
    g.fillStyle = '#fffbe6'; rrect(g, 8, 16, 8, 5, 1.5); g.fill(); g.strokeStyle = '#999'; g.lineWidth = 0.6; g.stroke();
    circ(g, 39, 17, 1.6); g.fillStyle = '#ff3a2a'; g.fill();
    gloss(g, 6, 14, 36, 8, 0.55);
  },
  bubble(g) {
    circ(g, 24, 24, 19);
    g.fillStyle = rg(g, 24, 24, 4, 24, 24, 19, [[0, 'rgba(220,240,255,.15)'], [0.8, 'rgba(160,220,255,.35)'], [1, 'rgba(255,255,255,.85)']]);
    g.fill();
    g.save(); circ(g, 24, 24, 19); g.clip();
    g.globalAlpha = 0.6;
    g.lineWidth = 4;
    g.strokeStyle = conic(g, 0.5, 24, 24, [[0, '#ff7ad8'], [0.25, '#ffe27a'], [0.5, '#7affc4'], [0.75, '#7ac8ff'], [1, '#ff7ad8']]);
    circ(g, 24, 24, 17); g.stroke();
    g.restore(); g.globalAlpha = 1;
    g.fillStyle = 'rgba(255,255,255,.9)';
    ell(g, 17, 15, 6, 3.5); g.fill();
    circ(g, 31, 33, 1.6); g.fill();
  },
  train(g) {
    shadow(g, 45, 17, 0.22);
    rrect(g, 9, 6, 30, 35, 8);
    g.fillStyle = lg(g, 0, 6, 0, 41, [[0, '#fffaf0'], [1, '#dcd3bf']]); g.fill();
    g.strokeStyle = '#7d7462'; g.lineWidth = 1; g.stroke();
    rrect(g, 12, 10, 24, 13, 3); g.fillStyle = lg(g, 0, 10, 0, 23, [[0, '#2a4a7a'], [1, '#0f1d33']]); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(14, 21); g.lineTo(21, 11); g.lineTo(25, 11); g.lineTo(18, 21); g.fill();
    g.fillStyle = '#e6a23c'; g.fillRect(9.5, 26, 29, 4);
    circ(g, 15, 34, 2.2); g.fillStyle = '#fff6c8'; g.fill();
    circ(g, 33, 34, 2.2); g.fill();
    g.fillStyle = '#4a4438'; g.fillRect(13, 41, 4, 3); g.fillRect(31, 41, 4, 3);
  },
  help(g) {
    sphere(g, 24, 24, 19, '#d8f0ff', '#3b8eea', '#0b3f9a');
    g.fillStyle = '#fff'; g.font = 'bold 26px Tahoma, Verdana, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('?', 24, 26);
  },
  search(g) {
    page(g, 6, 4, 26, 34, 8); lines(g, 10, 15, 16, 4);
    g.strokeStyle = '#3a4a5a'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(34, 34); g.lineTo(43, 43); g.stroke();
    circ(g, 28, 28, 9);
    g.fillStyle = rg(g, 25, 25, 1, 28, 28, 9, [[0, 'rgba(255,255,255,.9)'], [1, 'rgba(160,210,255,.6)']]); g.fill();
    g.strokeStyle = '#5b6b7b'; g.lineWidth = 2.4; g.stroke();
  },
  run(g) {
    shadow(g, 45, 17, 0.2);
    rrect(g, 4, 12, 34, 28, 3); g.fillStyle = '#ece9d8'; g.fill(); g.strokeStyle = '#2a4a8a'; g.lineWidth = 1; g.stroke();
    rrect(g, 4, 12, 34, 6, 3); g.fillStyle = '#1a62e0'; g.fill();
    g.fillStyle = '#fff'; g.fillRect(8, 23, 26, 5); g.strokeStyle = '#7f9db9'; g.strokeRect(8, 23, 26, 5);
    g.fillStyle = lg(g, 0, 4, 0, 26, [[0, '#7aea5a'], [1, '#1f9a2a']]);
    g.beginPath(); g.moveTo(30, 4); g.lineTo(44, 12); g.lineTo(30, 20); g.lineTo(30, 15); g.lineTo(22, 15); g.lineTo(22, 9); g.lineTo(30, 9); g.closePath(); g.fill();
    g.strokeStyle = '#176a1f'; g.lineWidth = 0.8; g.stroke();
  },
  allprog(g) {
    circ(g, 24, 24, 15);
    g.fillStyle = rg(g, 20, 18, 1, 24, 24, 15, [[0, '#b9ff9a'], [0.6, '#3cbf3a'], [1, '#1d7f1d']]); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(19, 15); g.lineTo(31, 24); g.lineTo(19, 33); g.closePath(); g.fill();
  },
  drop(g) {
    g.beginPath();
    g.moveTo(24, 3);
    g.bezierCurveTo(30, 14, 40, 22, 40, 31);
    g.bezierCurveTo(40, 40, 32.8, 46, 24, 46);
    g.bezierCurveTo(15.2, 46, 8, 40, 8, 31);
    g.bezierCurveTo(8, 22, 18, 14, 24, 3);
    g.closePath();
    g.fillStyle = rg(g, 19, 26, 1, 24, 32, 20, [[0, '#eaffff'], [0.35, '#6fe0ff'], [0.75, '#139ad8'], [1, '#0a5aa8']]);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.6; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.beginPath(); g.ellipse(17.5, 30, 3.2, 7, 0.35, 0, Math.PI * 2); g.fill();
    circ(g, 30, 39, 1.8); g.fill();
  },
  power(g) { glassSquare(g, 3, 3, 42, '#ff9b86', '#e2401f', '#b9260f'); powerGlyph(g); },
  standby(g) {
    glassSquare(g, 3, 3, 42, '#ffe28a', '#f2b41a', '#c98a0a');
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(24, 25, 11, 0, Math.PI * 2); g.arc(29, 20, 9.5, 0, Math.PI * 2, true); g.fill('evenodd');
  },
  restart(g) {
    glassSquare(g, 3, 3, 42, '#a6f08a', '#3cb43a', '#22861f');
    g.strokeStyle = '#fff'; g.lineWidth = 4.2;
    g.beginPath(); g.arc(24, 25, 10, -2.4, 2.1); g.stroke();
    g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(10, 11); g.lineTo(21, 13); g.lineTo(13, 21); g.closePath(); g.fill();
  },
  logoff(g) {
    glassSquare(g, 3, 3, 42, '#ffd38a', '#f08a1a', '#c9640a');
    g.strokeStyle = '#fff'; g.lineWidth = 3.6;
    g.beginPath(); g.moveTo(22, 13); g.lineTo(14, 13); g.lineTo(14, 35); g.lineTo(22, 35); g.stroke();
    g.beginPath(); g.moveTo(19, 24); g.lineTo(35, 24); g.stroke();
    g.beginPath(); g.moveTo(30, 18); g.lineTo(36, 24); g.lineTo(30, 30); g.stroke();
  },
  info(g) {
    sphere(g, 24, 24, 19, '#e2f4ff', '#3b8eea', '#0b3f9a');
    g.fillStyle = '#fff';
    circ(g, 24, 14.5, 2.8); g.fill();
    rrect(g, 21.6, 19.5, 4.8, 16, 1.5); g.fill();
  },
  question(g) { P.help(g); },
  warn(g) {
    g.beginPath(); g.moveTo(24, 4); g.lineTo(45, 41); g.lineTo(3, 41); g.closePath();
    g.lineJoin = 'round';
    g.fillStyle = lg(g, 0, 4, 0, 41, [[0, '#fff3a0'], [0.6, '#f5c71a'], [1, '#d99a0a']]); g.fill();
    g.strokeStyle = '#a8740a'; g.lineWidth = 1.6; g.stroke();
    g.fillStyle = '#1a1a1a'; rrect(g, 21.8, 14, 4.4, 15, 1.6); g.fill(); circ(g, 24, 34.5, 2.6); g.fill();
  },
  error(g) {
    sphere(g, 24, 24, 19, '#ffc2b8', '#e8402a', '#9a160a');
    g.strokeStyle = '#fff'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(16.5, 16.5); g.lineTo(31.5, 31.5); g.moveTo(31.5, 16.5); g.lineTo(16.5, 31.5); g.stroke();
  },
  vol(g) {
    g.fillStyle = lg(g, 0, 14, 0, 34, [[0, '#ffffff'], [1, '#b9c6d8']]);
    g.strokeStyle = '#2a3a5a'; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(8, 18); g.lineTo(16, 18); g.lineTo(26, 9); g.lineTo(26, 39); g.lineTo(16, 30); g.lineTo(8, 30); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = 3;
    g.beginPath(); g.arc(28, 24, 7, -0.9, 0.9); g.stroke();
    g.beginPath(); g.arc(28, 24, 13, -0.9, 0.9); g.stroke();
  },
  net(g) {
    const mon = (x, y) => {
      rrect(g, x, y, 22, 17, 2); g.fillStyle = '#e9edf3'; g.fill(); g.strokeStyle = '#1f2f4f'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#3aa0ff'; g.fillRect(x + 3, y + 3, 16, 10);
    };
    mon(3, 4); mon(23, 22);
    g.strokeStyle = '#fff'; g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(14, 21); g.lineTo(14, 31); g.lineTo(23, 31); g.stroke();
  },
  crt16(g) {
    crtBox(g, 2, 8, 44, 34, (sx, sy, sw, sh) => { hillScene(g, sx, sy, sw, sh); });
  },
  userpic(g) {
    rrect(g, 0, 0, 48, 48, 5);
    g.fillStyle = lg(g, 0, 0, 0, 48, [[0, '#7fd0ff'], [0.6, '#d9f4ff'], [1, '#a8e07a']]); g.fill();
    g.save(); rrect(g, 0, 0, 48, 48, 5); g.clip();
    g.fillStyle = 'rgba(255,255,255,.75)';
    ell(g, 10, 9, 8, 3); g.fill(); ell(g, 15, 7, 5, 3.5); g.fill();
    g.beginPath(); g.moveTo(0, 40); g.quadraticCurveTo(24, 30, 48, 42); g.lineTo(48, 48); g.lineTo(0, 48); g.fill();
    g.fillStyle = lg(g, 0, 34, 0, 48, [[0, '#7fd84a'], [1, '#3a9a22']]);
    g.beginPath(); g.moveTo(0, 41); g.quadraticCurveTo(24, 32, 48, 43); g.lineTo(48, 48); g.lineTo(0, 48); g.fill();
    g.restore();
    crtBox(g, 9, 13, 30, 24, (sx, sy, sw, sh) => { hillScene(g, sx, sy, sw, sh); });
    g.strokeStyle = '#6f7887'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(21, 13); g.lineTo(16, 6); g.moveTo(26, 13); g.lineTo(31, 5); g.stroke();
    // one bubble drifting past
    circ(g, 40, 12, 4.2);
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fill();
    g.strokeStyle = 'rgba(255,160,230,.9)'; g.lineWidth = 0.8; g.stroke();
    g.fillStyle = '#fff'; circ(g, 38.6, 10.6, 1.1); g.fill();
  },
};

function powerGlyph(g) {
  g.strokeStyle = '#fff'; g.lineWidth = 4.2;
  g.beginPath(); g.arc(24, 26, 10.5, -1.05, Math.PI + 1.05); g.stroke();
  g.beginPath(); g.moveTo(24, 11); g.lineTo(24, 25); g.stroke();
}

function badgeFile(g, label, color, photo = false) {
  page(g);
  if (photo) hillScene(g, 14, 12, 20, 13);
  else lines(g, 14, 13, 18, 3);
  rrect(g, 3, 26, 28, 14, 3);
  g.fillStyle = lg(g, 0, 26, 0, 40, [[0, color], [1, color]]);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.35)'; rrect(g, 4, 27, 26, 5, 2); g.fill();
  g.fillStyle = '#fff'; g.font = 'bold 9.5px Tahoma, Verdana, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(label, 17, 33.5);
}

function drawBin(g, full) {
  shadow(g, 45, 15, 0.22);
  if (full) {
    g.fillStyle = '#fffdf2'; g.strokeStyle = '#a99f86'; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(14, 13); g.lineTo(17, 3); g.lineTo(24, 6); g.lineTo(28, 2); g.lineTo(33, 8); g.lineTo(35, 13); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffe9a6';
    g.beginPath(); g.moveTo(25, 13); g.lineTo(29, 5); g.lineTo(36, 7); g.lineTo(37, 13); g.closePath(); g.fill(); g.stroke();
  }
  g.beginPath(); g.moveTo(10, 13); g.lineTo(38, 13); g.lineTo(34, 44); g.lineTo(14, 44); g.closePath();
  g.fillStyle = lg(g, 10, 0, 38, 0, [[0, 'rgba(170,200,235,.92)'], [0.35, 'rgba(236,246,255,.95)'], [1, 'rgba(140,175,220,.92)']]);
  g.fill();
  g.strokeStyle = '#4f6f99'; g.lineWidth = 1; g.stroke();
  if (full) {
    g.fillStyle = 'rgba(255,250,230,.75)';
    g.beginPath(); g.moveTo(13, 22); g.lineTo(35, 20); g.lineTo(33, 42); g.lineTo(15, 42); g.closePath(); g.fill();
  }
  g.strokeStyle = 'rgba(70,100,150,.55)'; g.lineWidth = 0.9;
  for (let i = 1; i < 7; i++) {
    const t = i / 7;
    g.beginPath(); g.moveTo(10 + 28 * t, 14); g.lineTo(14 + 20 * t, 43.5); g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,.7)';
  g.beginPath(); g.moveTo(13, 15); g.lineTo(16, 15); g.lineTo(18, 42); g.lineTo(16, 42); g.closePath(); g.fill();
  ell(g, 24, 13, 14.5, 3.6);
  g.fillStyle = full ? 'rgba(220,232,248,.6)' : '#d8e6f7'; g.fill();
  g.strokeStyle = '#4f6f99'; g.lineWidth = 1.4; g.stroke();
}

export { pixelBeetle };
