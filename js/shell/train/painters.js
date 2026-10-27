// Painted scenery strips. Each strip is a long horizontal band seen through the windows,
// painted here in metres (x across one period, y up from the ground) and tiled forever.
import { canvas2d, rng, noise1 } from './gl.js';

const TAU = Math.PI * 2;

function setup(spec) {
  const [Wp, Hp] = spec.tex;
  const P = spec.W, H = spec.H;
  const a = canvas2d(Wp, Hp);
  const e = spec.emis ? canvas2d(Wp, Hp) : null;
  const sx = Wp / P, sy = Hp / H;
  const meter = (g) => g.setTransform(sx, 0, 0, -sy, 0, Hp);
  meter(a.g);
  if (e) meter(e.g);
  const r = rng(spec.seed || 1);
  const n = noise1((spec.seed || 1) * 7 + 3);
  // text helper: square glyphs in world metres despite the anisotropic texture
  const text = (g, str, xm, ym, sizeM, font, fill, { align = 'center', blur = 0, glow = null, base = 'middle', stroke = null } = {}) => {
    g.save();
    g.setTransform(sx / sy, 0, 0, 1, xm * sx, Hp - ym * sy);
    g.font = font.replace('%', String(Math.max(1, sizeM * sy)) + 'px');
    g.textAlign = align;
    g.textBaseline = base;
    if (glow) { g.shadowColor = glow; g.shadowBlur = blur; }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = Math.max(1, sizeM * sy * 0.08); g.strokeText(str, 0, 0); }
    g.fillStyle = fill;
    g.fillText(str, 0, 0);
    g.restore();
  };
  // draw fn three times for seamless wrap
  const wrap = (g, fn) => { for (const o of [-P, 0, P]) { g.save(); g.translate(o, 0); fn(); g.restore(); } };
  return { a, e, P, H, sx, sy, r, n, text, wrap, Wp, Hp };
}

// periodic profile from fbm
function profile(n, P, x, cells, oct = 5) { return n.fbm((x / P) * cells, oct, cells); }

function fillProfile(g, P, fn, step, grad) {
  g.beginPath();
  g.moveTo(-1, -1);
  for (let x = -1; x <= P + 1; x += step) g.lineTo(x, fn(x));
  g.lineTo(P + 1, -1);
  g.closePath();
  g.fillStyle = grad;
  g.fill();
}

function vgrad(g, y0, y1, stops) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([t, c]) => gr.addColorStop(t, c));
  return gr;
}

// ── 夏ヶ原 ──────────────────────────────────────────────────────────────────
function ridges(spec) {
  const S = setup(spec);
  const { a, P, H, n } = S;
  const g = a.g;
  const cols = spec.cols;
  const layers = [
    { base: 120, amp: 170, cells: 9, col: cols[0], seed: 0 },
    { base: 70, amp: 120, cells: 14, col: cols[1], seed: 1 },
    { base: 30, amp: 80, cells: 23, col: cols[2], seed: 2 },
  ];
  layers.forEach((Lr, i) => {
    const fn = (x) => Lr.base + Lr.amp * Math.pow(profile(n, P, x + i * 997, Lr.cells), 1.3 + i * 0.1);
    const gr = vgrad(g, H, 0, [[0, Lr.col], [0.7, Lr.col], [1, mixHex(Lr.col, '#dfe2d8', 0.35)]]);
    fillProfile(g, P, fn, P / 1024, gr);
    // sunlit flanks
    g.save();
    g.globalAlpha = 0.18;
    g.strokeStyle = mixHex(Lr.col, '#ffffff', 0.4);
    g.lineWidth = 2 / S.sy;
    g.beginPath();
    for (let x = 0; x <= P; x += P / 512) {
      const y = fn(x), y2 = fn(x + P / 512);
      if (y2 > y) { g.moveTo(x, y - 2); g.lineTo(x + P / 512, y2 - 2); }
    }
    g.stroke();
    g.restore();
  });
  return S;
}

function forest(spec) {
  const S = setup(spec);
  const { a, P, H, n, r, wrap } = S;
  const g = a.g;
  const fn = (x) => 18 + 30 * profile(n, P, x, 11, 4);
  fillProfile(g, P, fn, P / 1024, vgrad(g, H, 0, [[0, '#4d6b43'], [0.5, '#3f5c39'], [1, '#56704a']]));
  // canopy bumps along the ridge, lighter on the sunny side
  for (let i = 0; i < 2600; i++) {
    const x = r() * P;
    const top = fn(x);
    const y = top - r() * 9;
    const rad = 1.5 + r() * 3.2;
    const shade = r();
    g.fillStyle = shade < 0.5 ? '#3c5a36' : shade < 0.8 ? '#4f6e44' : '#668553';
    g.globalAlpha = 0.85;
    g.beginPath(); g.ellipse(x, y, rad, rad * 0.8, 0, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
  // farmhouses tucked at the foot of the hills
  wrap(g, () => {
    const rr = rng(spec.seed + 5);
    for (let i = 0; i < 26; i++) {
      const x = rr() * P, w = 7 + rr() * 9, h = 4 + rr() * 2.5;
      g.fillStyle = rr() < 0.6 ? '#d9d6cc' : '#8a6e52';
      g.fillRect(x, 0, w, h);
      g.fillStyle = rr() < 0.7 ? '#3f4652' : '#6b4a3a';
      g.beginPath(); g.moveTo(x - 1.5, h); g.lineTo(x + w * 0.5, h + 3.2); g.lineTo(x + w + 1.5, h); g.closePath(); g.fill();
    }
  });
  return S;
}

function village(spec) {
  const S = setup(spec);
  const { a, P, H, r, wrap } = S;
  const g = a.g;
  const items = [];
  const rr = rng(spec.seed);
  let x = 0;
  while (x < P) {
    const t = rr();
    if (t < 0.38) { items.push({ k: 'trees', x, w: 14 + rr() * 26 }); x += 18 + rr() * 30; }
    else if (t < 0.6) { items.push({ k: 'house', x, w: 9 + rr() * 6, h: 4.5 + rr() * 2.2, two: rr() < 0.35, tone: rr() }); x += 14 + rr() * 16; }
    else if (t < 0.7) { items.push({ k: 'shed', x, w: 5 + rr() * 4 }); x += 8 + rr() * 10; }
    else if (t < 0.8) { items.push({ k: 'bamboo', x, w: 10 + rr() * 10 }); x += 14 + rr() * 12; }
    else if (t < 0.84) { items.push({ k: 'torii', x }); x += 10; }
    else { x += 20 + rr() * 40; }
  }
  wrap(g, () => {
    for (const it of items) {
      if (it.k === 'trees') {
        const cnt = Math.round(it.w / 4);
        for (let i = 0; i < cnt; i++) {
          const cx = it.x + (i / cnt) * it.w + r() * 3;
          const top = 7 + r() * 6;
          g.fillStyle = '#3b2e24';
          g.fillRect(cx - 0.25, 0, 0.5, top * 0.5);
          for (let k = 0; k < 7; k++) {
            const ex = cx + (r() - 0.5) * 5, ey = top * (0.55 + r() * 0.45), rad = 1.6 + r() * 2.2;
            g.fillStyle = ['#2f4a2b', '#3d5c35', '#4f7041', '#62844e'][Math.floor(r() * 4)];
            g.beginPath(); g.ellipse(ex, ey, rad, rad * 0.85, 0, 0, TAU); g.fill();
          }
        }
      } else if (it.k === 'house') {
        const { x: hx, w, h } = it;
        g.fillStyle = it.tone < 0.5 ? '#e4e0d4' : '#9c7b5a';
        g.fillRect(hx, 0, w, h);
        // timber lines and windows with paper screens
        g.fillStyle = '#5b4434';
        g.fillRect(hx, h * 0.45, w, 0.15);
        for (let k = 0; k < Math.floor(w / 2.6); k++) {
          g.fillStyle = r() < 0.3 ? '#efe2b0' : '#4b4a48';
          g.fillRect(hx + 0.8 + k * 2.6, h * 0.55, 1.4, h * 0.3);
        }
        // kawara roof with a ridge
        g.fillStyle = '#3c4350';
        g.beginPath();
        g.moveTo(hx - 1.2, h); g.quadraticCurveTo(hx + w * 0.2, h + 0.9, hx + w * 0.5, h + 3.4);
        g.quadraticCurveTo(hx + w * 0.8, h + 0.9, hx + w + 1.2, h); g.closePath(); g.fill();
        g.fillStyle = '#596170';
        g.fillRect(hx + w * 0.3, h + 2.9, w * 0.4, 0.5);
        if (it.two) {
          g.fillStyle = '#3c4350';
          g.fillRect(hx - 0.6, h * 0.5, w + 1.2, 0.5);
        }
      } else if (it.k === 'shed') {
        g.fillStyle = '#8a5a3c';
        g.fillRect(it.x, 0, it.w, 3.2);
        g.fillStyle = '#a05a3a';
        g.beginPath(); g.moveTo(it.x - 0.4, 3.2); g.lineTo(it.x + it.w + 0.4, 3.8); g.lineTo(it.x + it.w + 0.4, 3.4); g.lineTo(it.x - 0.4, 2.9); g.fill();
        for (let k = 0; k < it.w; k += 0.6) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(it.x + k, 0, 0.12, 3.2); }
      } else if (it.k === 'bamboo') {
        for (let i = 0; i < it.w * 1.6; i++) {
          const bx = it.x + r() * it.w, bh = 9 + r() * 5;
          g.strokeStyle = r() < 0.5 ? '#6f8a4a' : '#88a35a';
          g.lineWidth = 0.18;
          g.beginPath(); g.moveTo(bx, 0); g.quadraticCurveTo(bx + 0.6, bh * 0.6, bx + 1.5 * (r() - 0.3), bh); g.stroke();
        }
        for (let i = 0; i < it.w * 6; i++) {
          g.fillStyle = r() < 0.5 ? 'rgba(90,120,60,0.7)' : 'rgba(120,150,80,0.6)';
          g.beginPath(); g.ellipse(it.x + r() * it.w, 6 + r() * 8, 1.2, 0.35, (r() - 0.5), 0, TAU); g.fill();
        }
      } else if (it.k === 'torii') {
        g.fillStyle = '#b8402e';
        g.fillRect(it.x, 0, 0.35, 4.2); g.fillRect(it.x + 3, 0, 0.35, 4.2);
        g.fillRect(it.x - 0.6, 3.6, 4.6, 0.35);
        g.fillStyle = '#2a2220';
        g.fillRect(it.x - 0.9, 4.2, 5.2, 0.4);
      }
    }
  });
  return S;
}

// ── 銀座 ────────────────────────────────────────────────────────────────────
const NEON = ['#ff4f9a', '#5fe0ff', '#ffb347', '#7dff9a', '#fff1d6', '#ff6a3d', '#c78bff'];
const SIGNS = ['喫茶', 'レコード', '純喫茶', 'ステレオ', 'カメラ', '洋菓子', '映画', '寿司', 'ビヤホール', '時計', '宝石', 'ディスコ', '画廊', '洋品', '珈琲', '書店', 'ホテル', '酒場', '劇場', '電器'];
const NAMES = ['ルナ', '夜霧', '銀河堂', '星屑', '白鳥', '月光', '摩天楼', 'ミモザ', '蜃気楼', '花束'];

function skyline(spec) {
  const S = setup(spec);
  const { a, e, P, H, r } = S;
  const g = a.g, ge = e.g;
  let x = 0;
  while (x < P) {
    const w = 12 + r() * 46, h = 18 + Math.pow(r(), 1.6) * 110;
    g.fillStyle = ['#15132a', '#1b1830', '#120f22', '#201a34'][Math.floor(r() * 4)];
    g.fillRect(x, 0, w, h);
    // lit windows
    for (let wy = 3; wy < h - 2; wy += 3.2) for (let wx = x + 1.5; wx < x + w - 1.5; wx += 2.6) {
      if (r() < 0.32) {
        ge.fillStyle = r() < 0.7 ? 'rgba(255,214,150,0.9)' : 'rgba(190,220,255,0.85)';
        ge.fillRect(wx, wy, 1.4, 1.5);
      }
    }
    if (r() < 0.4) { ge.fillStyle = 'rgba(255,40,40,1)'; ge.fillRect(x + w * 0.5 - 0.8, h, 1.6, 1.6); }
    x += w + r() * 6;
  }
  // a slender broadcast tower, red lamps
  const tx = P * 0.37;
  g.fillStyle = '#1a1626';
  g.beginPath(); g.moveTo(tx - 12, 0); g.lineTo(tx - 1.5, 130); g.lineTo(tx + 1.5, 130); g.lineTo(tx + 12, 0); g.closePath(); g.fill();
  ge.fillStyle = 'rgba(255,120,60,0.55)';
  ge.beginPath(); ge.moveTo(tx - 11, 0); ge.lineTo(tx - 1.2, 128); ge.lineTo(tx - 0.6, 128); ge.lineTo(tx - 9, 0); ge.closePath(); ge.fill();
  for (const yy of [40, 75, 105, 130]) { ge.fillStyle = 'rgba(255,40,40,1)'; ge.fillRect(tx - 1.5, yy, 3, 2); }
  return S;
}

function neon(spec) {
  const S = setup(spec);
  const { a, e, P, H, r, text } = S;
  const g = a.g, ge = e.g;
  let x = 0, k = 0;
  while (x < P - 6) {
    const w = 8 + r() * 14;
    const h = 16 + r() * 38;
    g.fillStyle = ['#1e1828', '#2a2030', '#181b2a', '#241a22'][Math.floor(r() * 4)];
    g.fillRect(x, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.04)';
    g.fillRect(x, h - 0.6, w, 0.6);
    for (let wy = 4; wy < h - 2; wy += 3.4) for (let wx = x + 1; wx < x + w - 1.2; wx += 2.2) {
      if (r() < 0.45) {
        ge.fillStyle = r() < 0.6 ? 'rgba(255,220,160,0.8)' : 'rgba(170,255,210,0.55)';
        ge.fillRect(wx, wy, 1.3, 1.6);
      } else {
        g.fillStyle = '#0f0d16';
        g.fillRect(wx, wy, 1.3, 1.6);
      }
    }
    // vertical sign on the corner
    if (r() < 0.75) {
      const label = SIGNS[Math.floor(r() * SIGNS.length)] + (r() < 0.35 ? NAMES[Math.floor(r() * NAMES.length)] : '');
      const chars = [...label].slice(0, 5);
      const col = NEON[(k++ + Math.floor(r() * 3)) % NEON.length];
      const sw = 1.8, sh = chars.length * 2.0 + 1.2;
      const sxm = x + (r() < 0.5 ? -0.4 : w - 1.4), sym = Math.min(h - 2, 8 + r() * 14);
      g.fillStyle = '#0c0b10';
      g.fillRect(sxm, sym - sh, sw, sh);
      ge.strokeStyle = col; ge.lineWidth = 0.12; ge.globalAlpha = 0.9;
      ge.strokeRect(sxm + 0.15, sym - sh + 0.15, sw - 0.3, sh - 0.3);
      ge.globalAlpha = 1;
      const font = ['900 % "Zen Kaku Gothic New"', '800 % "M PLUS Rounded 1c"', '800 % "Shippori Mincho B1"', '400 % "Mochiy Pop One"'][Math.floor(r() * 4)];
      chars.forEach((ch, i) => text(ge, ch, sxm + sw / 2, sym - 1.25 - i * 2.0, 1.55, font, col, { glow: col, blur: 14 }));
    }
    // rooftop billboard
    if (r() < 0.45) {
      const bw = Math.min(w - 1, 9 + r() * 6), bh = 3.2;
      const bx = x + (w - bw) / 2, by = h + 0.8;
      g.fillStyle = '#121018'; g.fillRect(bx + 0.5, h, 0.3, 0.8); g.fillRect(bx + bw - 0.8, h, 0.3, 0.8);
      g.fillStyle = '#16131c'; g.fillRect(bx, by, bw, bh);
      const col = NEON[Math.floor(r() * NEON.length)];
      const word = r() < 0.15 ? 'HIKARI' : r() < 0.3 ? 'ブラウン管' : SIGNS[Math.floor(r() * SIGNS.length)];
      const font = word === 'HIKARI' ? '700 % "Anton"' : '900 % "Zen Kaku Gothic New"';
      text(ge, word, bx + bw / 2, by + bh / 2, 2.2, font, col, { glow: col, blur: 18 });
    }
    // horizontal awning band of light at street level
    if (r() < 0.6) { ge.fillStyle = NEON[Math.floor(r() * NEON.length)]; ge.globalAlpha = 0.55; ge.fillRect(x + 0.5, 3.2, w - 1, 0.35); ge.globalAlpha = 1; }
    x += w + 0.3 + r() * 2;
  }
  return S;
}

function fronts(spec) {
  // low buildings that crowd the viaduct: shopfronts below, a lit floor or two at your height,
  // and their signs reaching up past the windows
  const S = setup(spec);
  const { a, e, P, r, text } = S;
  const g = a.g, ge = e.g;
  let x = 0;
  while (x < P - 4) {
    const w = 6 + r() * 9;
    const hb = 6.5 + r() * 4.5;
    g.fillStyle = ['#2b2732', '#34303a', '#262a33', '#3a3036'][Math.floor(r() * 4)];
    g.fillRect(x, 0, w, hb);
    for (let fy = 2.2; fy < hb - 1.2; fy += 3.3) {
      for (let wx = x + 0.6; wx < x + w - 1.4; wx += 1.7) {
        if (r() < 0.45) {
          ge.fillStyle = r() < 0.55 ? 'rgba(255,205,140,0.55)' : 'rgba(200,255,220,0.42)';
          ge.fillRect(wx, fy, 1.1, 1.5);
          if (r() < 0.3) { ge.fillStyle = 'rgba(10,6,8,0.8)'; ge.fillRect(wx + 0.2 + r() * 0.4, fy, 0.35, 0.8); }
        } else { g.fillStyle = '#16141a'; g.fillRect(wx, fy, 1.1, 1.5); }
      }
    }
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x, hb - 0.2, w, 0.2);
    if (r() < 0.6) {
      const col = NEON[Math.floor(r() * NEON.length)];
      const label = SIGNS[Math.floor(r() * SIGNS.length)];
      const n = [...label].length;
      const sy0 = hb - 1 + r() * 1.5;
      g.fillStyle = '#0d0c12'; g.fillRect(x + w - 1.2, sy0, 1.0, n * 0.95 + 0.5);
      [...label].forEach((ch, i) => text(ge, ch, x + w - 0.7, sy0 + n * 0.95 - 0.2 - i * 0.95, 0.78, '900 % "Zen Kaku Gothic New"', col, { glow: col, blur: 10 }));
    }
    x += w + r() * 1.2;
  }
  return S;
}

// ── 水色ヶ丘 ────────────────────────────────────────────────────────────────
function sinProfile(P, terms) { return (x) => terms.reduce((s, [amp, k, ph]) => s + amp * Math.sin((x / P) * TAU * k + ph), 0); }

function aerofar(spec) {
  const S = setup(spec);
  const { a, P, H } = S;
  const g = a.g;
  const f1 = sinProfile(P, [[18, 3, 0.4], [10, 7, 1.3], [5, 13, 2.2]]);
  fillProfile(g, P, (x) => 55 + f1(x), P / 1024, vgrad(g, H, 0, [[0, '#8fd0c8'], [0.6, '#a9dcd2'], [1, '#cdeee9']]));
  const f2 = sinProfile(P, [[14, 4, 2.1], [8, 9, 0.2], [4, 17, 1.0]]);
  fillProfile(g, P, (x) => 32 + f2(x), P / 1024, vgrad(g, H, 0, [[0, '#7cc6a8'], [0.5, '#95d4b4'], [1, '#bfe9d6']]));
  return S;
}

function aerohill(spec) {
  const S = setup(spec);
  const { a, P, H, r } = S;
  const g = a.g;
  const f = sinProfile(P, [[17, 2, 0.6], [9, 5, 2.4], [3.5, 11, 0.9]]);
  const top = (x) => 44 + f(x);
  fillProfile(g, P, top, P / 2048, vgrad(g, H, 0, [[0, '#b9f06c'], [0.25, '#86d84c'], [0.6, '#46ad36'], [1, '#2d8f2f']]));
  // glossy sheen along the crest
  g.save();
  g.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 6; i++) {
    g.globalAlpha = 0.06;
    g.strokeStyle = '#fbffe6';
    g.lineWidth = (10 - i * 1.4);
    g.beginPath();
    for (let x = -2; x <= P + 2; x += P / 1024) { const y = top(x) - 6 - i * 0.6; x < 0 ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.stroke();
  }
  // grass streaks
  g.globalAlpha = 0.12;
  for (let i = 0; i < 3500; i++) {
    const x = r() * P, y = r() * top(x);
    g.strokeStyle = r() < 0.5 ? '#d9ff9a' : '#2a7a2a';
    g.lineWidth = 0.15;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 0.4, y + 1.2); g.stroke();
  }
  g.restore();
  // a lone round tree on a crest
  for (const tx of [P * 0.18, P * 0.71]) {
    const ty = top(tx) - 0.5;
    g.fillStyle = '#5a3d23'; g.fillRect(tx - 0.5, ty, 1.0, 6);
    g.fillStyle = '#2f9a35'; g.beginPath(); g.ellipse(tx, ty + 9, 6.5, 5.5, 0, 0, TAU); g.fill();
    g.fillStyle = '#7fdc4c'; g.beginPath(); g.ellipse(tx - 1.6, ty + 10.5, 3.5, 2.6, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,240,0.6)'; g.beginPath(); g.ellipse(tx - 2.4, ty + 12, 1.4, 0.8, -0.4, 0, TAU); g.fill();
  }
  return S;
}

function aeronear(spec) {
  const S = setup(spec);
  const { a, P, r, wrap } = S;
  const g = a.g;
  const items = [];
  let x = 0;
  const rr = rng(spec.seed);
  while (x < P) { items.push({ x, w: 4 + rr() * 9, tree: rr() < 0.35 }); x += 25 + rr() * 60; }
  wrap(g, () => {
    for (const it of items) {
      if (it.tree) {
        g.fillStyle = '#6b4a2c'; g.fillRect(it.x + it.w / 2 - 0.3, 0, 0.6, 5);
        const cy = 8.2;
        const gr = g.createRadialGradient(it.x + it.w / 2 - 1.5, cy + 2, 0.5, it.x + it.w / 2, cy, 5);
        gr.addColorStop(0, '#d6ff8a'); gr.addColorStop(0.5, '#5ccf3e'); gr.addColorStop(1, '#1f8a2c');
        g.fillStyle = gr; g.beginPath(); g.ellipse(it.x + it.w / 2, cy, 4.5, 4.2, 0, 0, TAU); g.fill();
      } else {
        const gr = g.createRadialGradient(it.x + it.w * 0.35, 2.4, 0.2, it.x + it.w / 2, 1.2, it.w * 0.6);
        gr.addColorStop(0, '#c9ff7a'); gr.addColorStop(0.6, '#4fc23a'); gr.addColorStop(1, '#22862c');
        g.fillStyle = gr; g.beginPath(); g.ellipse(it.x + it.w / 2, 1.0, it.w / 2, 2.4, 0, Math.PI, 0, true); g.fill();
        g.beginPath(); g.ellipse(it.x + it.w / 2, 0.4, it.w / 2, 2.4, 0, 0, Math.PI); g.fill();
      }
    }
  });
  return S;
}

// ── 区域 ────────────────────────────────────────────────────────────────────
function monoliths(spec) {
  const S = setup(spec);
  const { a, P, H, r, n } = S;
  const g = a.g;
  // a low broken skyline of ruins
  fillProfile(g, P, (x) => 10 + 14 * profile(n, P, x, 30, 3), P / 1024, '#7b8172');
  let x = 0;
  while (x < P) {
    const t = r();
    if (t < 0.3) {
      // monolith
      const w = 14 + r() * 26, h = 80 + r() * 85;
      g.fillStyle = '#5f6559'; g.fillRect(x, 0, w, h);
      g.fillStyle = '#6c7265'; g.fillRect(x, 0, w * 0.35, h);
      x += w + 60 + r() * 140;
    } else if (t < 0.5) {
      // cooling tower
      const w = 70, h = 95 + r() * 30;
      g.fillStyle = '#6a7064';
      g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + w * 0.28, h * 0.6, x + w * 0.18, h); g.lineTo(x + w * 0.82, h); g.quadraticCurveTo(x + w * 0.72, h * 0.6, x + w, 0); g.closePath(); g.fill();
      x += w + 80 + r() * 160;
    } else if (t < 0.75) {
      // ruined tower block with holes
      const w = 24 + r() * 20, h = 40 + r() * 50;
      g.fillStyle = '#656b5e';
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.lineTo(x + w * 0.4, h - 6); g.lineTo(x + w * 0.6, h + 4); g.lineTo(x + w, h - 14); g.lineTo(x + w, 0); g.closePath(); g.fill();
      g.fillStyle = '#4d5248';
      for (let wy = 5; wy < h - 15; wy += 6) for (let wx = x + 3; wx < x + w - 3; wx += 5) if (r() < 0.6) g.fillRect(wx, wy, 2.2, 3);
      x += w + 50 + r() * 120;
    } else {
      // lattice mast
      g.strokeStyle = '#5d6357'; g.lineWidth = 1.2;
      const h = 110 + r() * 40;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 5, h); g.lineTo(x + 10, 0); g.stroke();
      for (let yy = 8; yy < h; yy += 12) { g.beginPath(); g.moveTo(x + (yy / h) * 5, yy); g.lineTo(x + 10 - (yy / h) * 5, yy + 12); g.stroke(); }
      x += 80 + r() * 160;
    }
  }
  return S;
}

function birches(spec) {
  const S = setup(spec);
  const { a, P, H, r } = S;
  const g = a.g;
  // back mass of the wood
  const n = noise1(spec.seed + 9);
  fillProfile(g, P, (x) => 14 + 10 * profile(n, P, x, 40, 4), P / 1024, vgrad(g, H, 0, [[0, '#7e8255'], [1, '#5b5f40']]));
  let x = 0;
  while (x < P) {
    if (r() < 0.12) {
      // concrete ruin among the trees
      const w = 14 + r() * 18, h = 8 + r() * 12;
      g.fillStyle = '#8b8d82';
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.lineTo(x + w * 0.3, h + 2); g.lineTo(x + w * 0.5, h - 3); g.lineTo(x + w * 0.75, h + 1); g.lineTo(x + w, h - 5); g.lineTo(x + w, 0); g.closePath(); g.fill();
      g.fillStyle = '#4c4f46';
      for (let wy = 2; wy < h - 3; wy += 3.6) for (let wx = x + 1.5; wx < x + w - 2; wx += 3.2) g.fillRect(wx, wy, 1.6, 2.0);
      g.strokeStyle = '#5a3e2c'; g.lineWidth = 0.15;
      for (let k = 0; k < 6; k++) { const rx = x + r() * w; g.beginPath(); g.moveTo(rx, h - 2); g.lineTo(rx + (r() - 0.5) * 2, h + 2 + r() * 2); g.stroke(); }
      x += w + 4;
      continue;
    }
    // a birch
    const h = 14 + r() * 18, tw = 0.35 + r() * 0.25;
    const lean = (r() - 0.5) * 1.2;
    g.fillStyle = '#e6e3d6';
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + tw, 0); g.lineTo(x + lean + tw * 0.5, h); g.lineTo(x + lean, h); g.closePath(); g.fill();
    g.fillStyle = '#26241f';
    for (let yy = 0.5; yy < h; yy += 0.6 + r() * 1.2) { const t = yy / h; g.fillRect(x + lean * t + (r() * 0.2), yy, tw * (0.4 + r() * 0.5), 0.12 + r() * 0.15); }
    // thin yellowing crown
    for (let k = 0; k < 14; k++) {
      g.fillStyle = ['#a7a55e', '#c2b86c', '#8c8f4f', '#d4c27a'][Math.floor(r() * 4)];
      g.globalAlpha = 0.75;
      g.beginPath(); g.ellipse(x + lean + (r() - 0.5) * 4, h * (0.65 + r() * 0.4), 1.2 + r() * 1.6, 0.8 + r() * 1.0, 0, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    x += 1.2 + r() * 4.5;
  }
  return S;
}

function wild(spec) {
  const S = setup(spec);
  const { a, P, r, text, wrap } = S;
  const g = a.g;
  // tall wet grass along the line
  for (let i = 0; i < 9000; i++) {
    const x = r() * P, h = 0.6 + Math.pow(r(), 1.5) * 1.9;
    g.strokeStyle = ['#7c8350', '#999161', '#5e663e', '#b0a674'][Math.floor(r() * 4)];
    g.lineWidth = 0.05;
    g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + 0.15, h * 0.6, x + (r() - 0.3) * 0.6, h); g.stroke();
  }
  const items = [];
  const rr = rng(spec.seed + 1);
  let x = 4;
  while (x < P) { items.push({ x, t: rr() }); x += 14 + rr() * 30; }
  wrap(g, () => {
    for (const it of items) {
      if (it.t < 0.35) {
        // rusted fence
        g.fillStyle = '#6d4a32';
        for (let k = 0; k < 4; k++) g.fillRect(it.x + k * 2.2, 0, 0.12, 2.0);
        g.strokeStyle = 'rgba(110,80,55,0.7)'; g.lineWidth = 0.03;
        for (let k = 0; k < 6.6; k += 0.25) { g.beginPath(); g.moveTo(it.x + k, 0.1); g.lineTo(it.x + k + 0.6, 1.9); g.stroke(); g.beginPath(); g.moveTo(it.x + k + 0.6, 0.1); g.lineTo(it.x + k, 1.9); g.stroke(); }
      } else if (it.t < 0.55) {
        g.fillStyle = '#8e8f86'; g.fillRect(it.x, 0, 1.6, 1.0); g.fillStyle = '#7a7b72'; g.fillRect(it.x + 1.8, 0, 1.2, 0.7);
      } else if (it.t < 0.65) {
        // a sign nobody reads any more
        g.fillStyle = '#5a4a3a'; g.fillRect(it.x + 0.5, 0, 0.1, 1.6);
        g.fillStyle = '#a89a72'; g.fillRect(it.x, 1.5, 1.2, 0.6);
        text(g, '立入禁止', it.x + 0.6, 1.8, 0.24, '900 % "Zen Kaku Gothic New"', '#8a3a2a');
      } else if (it.t < 0.75) {
        // birch saplings
        for (let k = 0; k < 4; k++) { g.fillStyle = '#ddd9cc'; g.fillRect(it.x + k * 0.8, 0, 0.07, 2.5 + k * 0.4); g.fillStyle = 'rgba(170,165,95,0.8)'; g.beginPath(); g.ellipse(it.x + k * 0.8, 2.6 + k * 0.4, 0.5, 0.35, 0, 0, TAU); g.fill(); }
      }
    }
  });
  return S;
}

// ── 黄昏ヶ浜 ────────────────────────────────────────────────────────────────
function headlands(spec) {
  const S = setup(spec);
  const { a, P, H, n } = S;
  const g = a.g;
  fillProfile(g, P, (x) => Math.max(0, -10 + 90 * Math.pow(profile(n, P, x, 7, 4), 2.2)), P / 1024, vgrad(g, H, 0, [[0, '#6e5a80'], [1, '#a3758c']]));
  return S;
}

function bridge(spec) {
  const S = setup(spec);
  const { a, e, P, H, r } = S;
  const g = a.g, ge = e.g;
  const deck = 19;
  g.fillStyle = '#3e3046';
  g.fillRect(0, deck, P, 2.2);
  g.fillRect(0, deck + 2.2, P, 0.25);
  for (let x = 0; x < P; x += 0.9) g.fillRect(x, deck + 2.2, 0.08, 0.9);
  g.fillRect(0, deck + 3.0, P, 0.12);
  for (let x = 20; x < P; x += 58) {
    g.beginPath(); g.moveTo(x - 2.4, 0); g.lineTo(x - 1.4, deck); g.lineTo(x + 1.4, deck); g.lineTo(x + 2.4, 0); g.closePath(); g.fill();
  }
  // a suspension span with two towers and cables
  const s0 = P * 0.55, s1 = s0 + 520;
  for (const tx of [s0, s1]) { g.fillRect(tx - 1.6, 0, 3.2, deck + 26); g.fillRect(tx - 2.2, deck + 22, 4.4, 1.0); }
  g.strokeStyle = '#3e3046'; g.lineWidth = 0.35;
  g.beginPath();
  for (let x = s0; x <= s1; x += 4) { const t = (x - s0) / (s1 - s0); const y = deck + 26 - Math.sin(t * Math.PI) * 22; x === s0 ? g.moveTo(x, y) : g.lineTo(x, y); }
  g.stroke();
  g.lineWidth = 0.08;
  for (let x = s0 + 10; x < s1; x += 10) { const t = (x - s0) / (s1 - s0); const y = deck + 26 - Math.sin(t * Math.PI) * 22; g.beginPath(); g.moveTo(x, deck + 2.2); g.lineTo(x, y); g.stroke(); }
  // deck lamps, just coming on
  for (let x = 6; x < P; x += 26) { ge.fillStyle = 'rgba(255,214,150,1)'; ge.fillRect(x, deck + 3.2, 0.9, 0.7); }
  return S;
}

function drowned(spec) {
  const S = setup(spec);
  const { a, P, r, wrap } = S;
  const g = a.g;
  const items = [];
  const rr = rng(spec.seed);
  let x = 2;
  while (x < P) { items.push({ x, t: rr(), w: 6 + rr() * 9, h: 0.6 + rr() * 2.4 }); x += 9 + rr() * 26; }
  wrap(g, () => {
    for (const it of items) {
      if (it.t < 0.55) {
        // a roof just above the water: kawara catching the low sun on its top edge
        const { x: hx, w, h } = it;
        g.fillStyle = '#3a2c34';
        g.beginPath(); g.moveTo(hx, 0); g.lineTo(hx + w * 0.12, h); g.quadraticCurveTo(hx + w * 0.5, h + 1.7, hx + w * 0.88, h); g.lineTo(hx + w, 0); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(255,190,120,0.75)'; g.lineWidth = 0.12;
        g.beginPath(); g.moveTo(hx + w * 0.12, h); g.quadraticCurveTo(hx + w * 0.5, h + 1.7, hx + w * 0.88, h); g.stroke();
        g.fillStyle = 'rgba(255,190,130,0.25)';
        g.fillRect(hx + w * 0.1, 0, w * 0.8, 0.06);
      } else if (it.t < 0.68) {
        // a torii, half under
        g.fillStyle = '#7a2e2c';
        g.fillRect(it.x, 0, 0.3, 2.4); g.fillRect(it.x + 2.6, 0, 0.3, 2.4);
        g.fillRect(it.x - 0.5, 1.9, 3.9, 0.3);
        g.fillStyle = '#2a1e22'; g.fillRect(it.x - 0.8, 2.4, 4.5, 0.35);
      } else if (it.t < 0.8) {
        // a road sign, still telling you what to do
        g.fillStyle = '#4a4248'; g.fillRect(it.x, 0, 0.08, 1.9);
        g.fillStyle = '#2f4f8a'; g.beginPath(); g.ellipse(it.x + 0.04, 2.2, 0.32, 0.32, 0, 0, TAU); g.fill();
        g.strokeStyle = '#e9e2d2'; g.lineWidth = 0.05; g.beginPath(); g.ellipse(it.x + 0.04, 2.2, 0.27, 0.27, 0, 0, TAU); g.stroke();
      } else {
        // the top of a bus shelter
        g.fillStyle = '#3e3640'; g.fillRect(it.x, 0, 3.4, 0.5); g.fillRect(it.x + 0.2, 0.5, 0.1, 0.3);
      }
    }
  });
  return S;
}

const PAINTERS = { ridges, forest, village, skyline, neon, fronts, aerofar, aerohill, aeronear, monoliths, birches, wild, headlands, bridge, drowned };

export function paintStrip(spec) {
  const fn = PAINTERS[spec.kind];
  const S = fn(spec);
  return { albedo: S.a.c, emis: S.e ? S.e.c : null };
}

export function mixHex(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

// ── the graffiti that covers 地下 ───────────────────────────────────────────
export function paintGraffiti() {
  const { c, g } = canvas2d(2048, 512);
  const r = rng(404);
  g.clearRect(0, 0, 2048, 512);
  const words = ['地下', 'CHIKA', '光', '夜更かし', 'FLASH', 'NO SLEEP', '無限', 'BLURRY', '1906', '眩しい', 'HIKARI', 'STATIC', '終電', 'XO'];
  const fonts = ['400 %px "Rubik Glitch"', '400 %px "Anton"', '400 %px "Silkscreen"', '400 %px "Mochiy Pop One"', '700 %px "UnifrakturCook"', '900 %px "Zen Kaku Gothic New"'];
  const cols = ['#ff2a2a', '#d8ff3a', '#f4f4f0', '#1a1a1a', '#ff7ad1', '#5ff0ff'];
  for (let o = 0; o < 2; o++) for (let i = 0; i < 22; i++) {
    const x = r() * 2048, y = 120 + r() * 300;
    const size = 50 + r() * 110;
    const w = words[Math.floor(r() * words.length)];
    g.save();
    g.translate(x, y);
    g.rotate((r() - 0.5) * 0.3);
    g.scale(0.55, 1);
    g.font = fonts[Math.floor(r() * fonts.length)].replace('%', String(Math.round(size)));
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const col = cols[Math.floor(r() * cols.length)];
    g.lineJoin = 'round';
    g.strokeStyle = r() < 0.5 ? '#0a0a0a' : '#f4f4f0';
    g.lineWidth = size * 0.12;
    g.globalAlpha = 0.85 + r() * 0.15;
    g.strokeText(w, 0, 0);
    g.fillStyle = col;
    g.fillText(w, 0, 0);
    // drips
    g.fillStyle = col;
    for (let k = 0; k < 5; k++) { const dx = (r() - 0.5) * size * 2; g.fillRect(dx, size * 0.3, 3, 20 + r() * 70); }
    g.restore();
  }
  // tags scrawled thin over everything
  g.strokeStyle = 'rgba(240,240,235,0.6)'; g.lineWidth = 2.2;
  for (let i = 0; i < 40; i++) {
    let x = r() * 2048, y = 150 + r() * 260;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += 6 + r() * 14; y += (r() - 0.5) * 26; g.lineTo(x, y); }
    g.stroke();
  }
  return c;
}
