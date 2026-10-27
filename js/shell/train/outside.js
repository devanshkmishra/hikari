// Everything beyond the glass: sky, ground, track, painted strips, poles and their wires,
// tunnels, crossings, the platforms of each station, bubbles, circles, stars.
import { Builder, uploadMesh, texFromCanvas, setU, lin, canvas2d, rng, m4, MAT } from './gl.js';
import { THEMES } from './themes.js';
import { paintStrip, paintGraffiti } from './painters.js';

const M = (layer, kind, ao = 1, em = 0) => [layer, kind, ao, em];

function stripMesh(gl) {
  const b = new Builder();
  const N = 96;
  for (let i = 0; i < N; i++) {
    const a = -1 + (2 * i) / N, c = -1 + (2 * (i + 1)) / N;
    b.quad([a, 0, 0], [c, 0, 0], [c, 1, 0], [a, 1, 0], [0, 0, -1], [[0, 1], [1, 1], [1, 0], [0, 0]], [1, 1, 1, 1], [-1, 0, 1, 0]);
  }
  return b.upload(gl);
}

function groundMesh(gl) {
  const b = new Builder();
  const dist = (t) => Math.sign(t) * (Math.pow(Math.abs(t), 2.2) * 4000);
  const NX = 72, NZ = 40;
  const xs = [], zs = [];
  for (let i = 0; i <= NX; i++) xs.push(dist(-1 + (2 * i) / NX));
  for (let j = 0; j <= NZ; j++) zs.push(dist(-1 + (2 * j) / NZ));
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    b.quad([xs[i], 0, zs[j]], [xs[i + 1], 0, zs[j]], [xs[i + 1], 0, zs[j + 1]], [xs[i], 0, zs[j + 1]], [0, 1, 0], null, [1, 1, 1, 1], [-1, 0, 1, 0]);
  }
  return b.upload(gl);
}

function trackMesh(gl) {
  const b = new Builder();
  const prof = [[-3.6, -2.05], [-1.7, -1.28], [1.7, -1.28], [3.6, -2.05]];
  for (let x = -300; x < 2400; x += x < 200 ? 4 : 16) {
    const x1 = x + (x < 200 ? 4 : 16);
    for (let k = 0; k < prof.length - 1; k++) {
      const [za, ya] = prof[k], [zb, yb] = prof[k + 1];
      b.quad([x, ya, za], [x1, ya, za], [x1, yb, zb], [x, yb, zb], [0, 1, 0], null, [1, 1, 1, 1], [-1, 0, 1, 0]);
    }
  }
  return b.upload(gl);
}

// ── poles and wires ─────────────────────────────────────────────────────────
function poleMesh(style) {
  const b = new Builder();
  if (style === 'concrete') {
    const c = lin('#9a9a92');
    b.cyl('y', 0, 8.6, 0, 0, 0.16, c, M(-1, 0, 1), { seg: 10, r1: 0.11 });
    b.box(-0.06, 7.7, -0.9, 0.06, 7.85, 0.9, lin('#6d6a62'), M(-1, 0, 1));
    for (const z of [-0.75, 0, 0.75]) b.cyl('y', 7.85, 8.0, 0, z, 0.035, lin('#e8e4da'), M(-1, 0, 1), { seg: 8 });
    b.cyl('y', 6.1, 6.9, 0.2, 0.0, 0.18, lin('#7c807c'), M(-1, 0, 1), { seg: 10 });
    b.box(-0.04, 2.5, -0.15, 0.04, 2.9, 0.15, lin('#d7d0b8'), M(-1, 0, 1));
  } else if (style === 'wood') {
    const c = lin('#4b3d31');
    b.cyl('y', 0, 7.2, 0, 0, 0.13, c, M(-1, 0, 1), { seg: 8, r1: 0.1 });
    b.box(-0.05, 6.6, -0.7, 0.05, 6.72, 0.7, lin('#3b3028'), M(-1, 0, 1));
    for (const z of [-0.6, 0.6]) b.cyl('y', 6.72, 6.85, 0, z, 0.03, lin('#cfc9bb'), M(-1, 0, 1), { seg: 6 });
  } else if (style === 'lamp') {
    b.cyl('y', 0, 9.5, 0, 0, 0.09, lin('#4a4a52'), M(-1, 0, 1), { seg: 8 });
    b.box(-0.04, 9.4, -1.6, 0.04, 9.5, 0.0, lin('#4a4a52'), M(-1, 0, 1));
    b.box(-0.18, 9.28, -1.8, 0.18, 9.4, -1.3, lin('#ffcf8a'), M(-1, 0, 1, 6.0));
  }
  return b;
}

function wireMesh(period, heights, sag) {
  const b = new Builder();
  const N = 16;
  for (const [y0, z0] of heights) {
    for (let i = 0; i < N; i++) {
      const t0 = i / N, t1 = (i + 1) / N;
      const x0 = t0 * period, x1 = t1 * period;
      const ya = y0 - sag * 4 * t0 * (1 - t0), yb = y0 - sag * 4 * t1 * (1 - t1);
      const w = 0.018;
      b.quad([x0, ya - w, z0], [x1, yb - w, z0], [x1, yb + w, z0], [x0, ya + w, z0], [0, 0, -1], null, lin('#1e1e1e'), M(-1, 0, 1));
    }
  }
  return b;
}

// ── tunnels ─────────────────────────────────────────────────────────────────
const TUBE = (() => {
  const p = [];
  p.push([2.4, -1.35]);
  for (let y = -1.0; y <= 1.6; y += 0.65) p.push([2.4, y]);
  for (let a = 0; a <= 12; a++) { const t = (a / 12) * Math.PI; p.push([Math.cos(t) * 2.4, 1.6 + Math.sin(t) * 2.4]); }
  for (let y = 1.6; y >= -1.0; y -= 0.65) p.push([-2.4, y]);
  p.push([-2.4, -1.35]);
  return p;
})();

function tubeMesh(len = 50) {
  const b = new Builder();
  const seg = 10;
  for (let i = 0; i < seg; i++) {
    const x0 = (i / seg) * len, x1 = ((i + 1) / seg) * len;
    for (let k = 0; k < TUBE.length - 1; k++) {
      const [za, ya] = TUBE[k], [zb, yb] = TUBE[k + 1];
      const nz = -(za + zb) / 2, ny = -((ya + yb) / 2 - 1.2);
      b.quad([x0, ya, za], [x1, ya, za], [x1, yb, zb], [x0, yb, zb], [0, ny, nz], null, [1, 1, 1, 1], [-1, 0, 1, 0]);
    }
  }
  return b;
}

function portalMesh(hill) {
  const b = new Builder();
  const cx = 0, cy = 1.0;
  const conc = lin('#8d8b84'), grass = lin(hill);
  const pts = [...TUBE, TUBE[0]];
  const outer = (z, y) => {
    const dz = z - cx, dy = y - cy;
    const s = Math.min(26 / Math.max(Math.abs(dz), 1e-3), 18 / Math.max(Math.abs(dy), 1e-3));
    return [cx + dz * s, cy + dy * s];
  };
  const mid = (z, y) => { const dz = z - cx, dy = y - cy; const l = Math.hypot(dz, dy); return [cx + dz * (l + 1.4) / l, cy + dy * (l + 1.4) / l]; };
  for (let k = 0; k < pts.length - 1; k++) {
    const [za, ya] = pts[k], [zb, yb] = pts[k + 1];
    const ma = mid(za, ya), mb = mid(zb, yb), oa = outer(za, ya), ob = outer(zb, yb);
    b.quad([0, ya, za], [0, yb, zb], [0, mb[1], mb[0]], [0, ma[1], ma[0]], [-1, 0, 0], null, conc, M(-1, 0, 1));
    b.quad([0, ma[1], ma[0]], [0, mb[1], mb[0]], [0, ob[1], ob[0]], [0, oa[1], oa[0]], [-1, 0, 0], null, grass, M(-1, 0, 1));
  }
  return b;
}

// ── 踏切 ───────────────────────────────────────────────────────────────────
function crossingMesh() {
  const b = new Builder();
  const blk = lin('#161616'), yel = lin('#e8c21e');
  for (let y = -1.2; y < 1.5; y += 0.3) b.cyl('y', y, y + 0.15, 0, 0, 0.06, blk, M(-1, 0, 1), { seg: 8 });
  for (let y = -1.05; y < 1.5; y += 0.3) b.cyl('y', y, y + 0.15, 0, 0, 0.06, yel, M(-1, 0, 1), { seg: 8 });
  // the crossbuck
  for (const a of [0.6, -0.6]) {
    const c = Math.cos(a), s = Math.sin(a);
    const L0 = 0.55, w = 0.07;
    const pts = [[-L0 * c - w * s, -L0 * s + w * c], [L0 * c - w * s, L0 * s + w * c], [L0 * c + w * s, L0 * s - w * c], [-L0 * c + w * s, -L0 * s - w * c]];
    b.quad(...pts.map(([zz, yy]) => [-0.08, 2.0 + yy, zz]), [-1, 0, 0], null, yel, M(-1, 0, 1, 0.2));
    b.quad(...pts.map(([zz, yy]) => [-0.075, 2.0 + yy * 0.86, zz * 0.86]), [-1, 0, 0], null, blk, M(-1, 0, 1));
  }
  b.box(-0.1, 1.45, -0.55, -0.05, 1.6, 0.55, blk, M(-1, 0, 1));
  return b;
}

// ── platforms ───────────────────────────────────────────────────────────────
const PLAT = {
  rural: { slab: '#9c978a', edge: '#e9e5d8', roof: '#5e6a72', post: '#6b5844', fence: '#6f5a46', len: 34, roofLen: 9, lamp: '#fff0d0', light: 0.5, vend: true, flowers: true },
  city: { slab: '#6f6b70', edge: '#e8e2d2', roof: '#3a3940', post: '#58565e', fence: '#3d3c44', len: 60, roofLen: 46, lamp: '#ffe8c8', light: 1.2, vend: true },
  aero: { slab: '#e9f2f6', edge: '#7fd8ff', roof: '#bfe6ff', post: '#ffffff', fence: '#d6eef8', len: 50, roofLen: 30, lamp: '#ffffff', light: 0.6, vend: true },
  void: { slab: '#141016', edge: '#ff66aa', roof: '#000000', post: '#1a141a', fence: '#000000', len: 40, roofLen: 0, lamp: '#ff9cc8', light: 0.9, vend: false },
  under: { slab: '#4a4744', edge: '#d8ff3a', roof: '#262524', post: '#3b3a38', fence: '#2c2b2a', len: 60, roofLen: 60, lamp: '#f2f6ff', light: 1.2, vend: true },
  ruin: { slab: '#7c7d70', edge: '#a9a796', roof: '#4b4d44', post: '#55534a', fence: '#5b4636', len: 30, roofLen: 0, lamp: '#000000', light: 0.0, vend: false, moss: true },
  coast: { slab: '#a8958a', edge: '#f2e6d4', roof: '#5a4a52', post: '#6b5a52', fence: '#6a5248', len: 26, roofLen: 7, lamp: '#ffd8a8', light: 0.5, vend: true },
  light: { slab: '#e8eeff', edge: '#ffffff', roof: '#000000', post: '#d8e0ff', fence: '#000000', len: 40, roofLen: 0, lamp: '#ffffff', light: 1.0, vend: false },
};

function platformMesh(style, groundY) {
  const P = PLAT[style];
  const b = new Builder();
  const half = P.len / 2;
  const top = -0.04;
  const em = style === 'light' || style === 'void' ? 0.6 : 0;
  b.box(-half, groundY, 1.62, half, top, 7.2, lin(P.slab), M(-1, 0, 1, em * 0.6));
  b.box(-half, top, 1.62, half, top + 0.008, 1.78, lin(P.edge), M(-1, 0, 1, style === 'void' ? 3.0 : style === 'light' ? 1.5 : 0));
  if (P.moss) for (let i = 0; i < 40; i++) { const x = -half + Math.random() * P.len; b.box(x, top, 2 + Math.random() * 4, x + 0.6 + Math.random(), top + 0.01, 2.5 + Math.random() * 4.5, lin('#5d6b3c'), M(-1, 0, 1)); }
  // canopy
  if (P.roofLen > 0) {
    const r0 = -P.roofLen / 2, r1 = P.roofLen / 2;
    b.box(r0, 2.75, 2.4, r1, 2.88, 7.0, lin(P.roof), M(-1, 0, 0.9));
    for (let x = r0 + 1; x <= r1 - 1; x += 5) {
      b.cyl('y', top, 2.75, x, 5.0, 0.07, lin(P.post), M(-1, 0, 1), { seg: 8 });
      b.box(x - 0.6, 2.62, 3.4, x + 0.6, 2.7, 3.55, lin(P.lamp), M(-1, 0, 1, 4.0 * P.light));
    }
  }
  // fence at the back
  if (style !== 'void' && style !== 'light') {
    for (let x = -half; x < half; x += 2.5) b.box(x, top, 7.05, x + 0.08, 1.15, 7.13, lin(P.fence), M(-1, 0, 1));
    b.box(-half, 1.0, 7.06, half, 1.08, 7.12, lin(P.fence), M(-1, 0, 1));
    b.box(-half, 0.45, 7.06, half, 0.5, 7.12, lin(P.fence), M(-1, 0, 1));
  }
  // bench
  if (style !== 'light') {
    const bx = 3.6;
    b.box(bx - 0.9, 0.38, 4.5, bx + 0.9, 0.45, 4.9, lin(style === 'rural' || style === 'coast' ? '#8a6a48' : '#5a6f86'), M(-1, 0, 1));
    b.box(bx - 0.9, 0.45, 4.85, bx + 0.9, 0.85, 4.92, lin(style === 'rural' || style === 'coast' ? '#8a6a48' : '#5a6f86'), M(-1, 0, 1));
    for (const dx of [-0.8, 0.8]) b.box(bx + dx - 0.03, top, 4.55, bx + dx + 0.03, 0.4, 4.85, lin('#3a3a3a'), M(-1, 0, 1));
  }
  // vending machine, glowing
  if (P.vend) {
    const vx = 7.2;
    b.box(vx - 0.5, top, 5.6, vx + 0.5, 1.85, 6.4, lin(style === 'aero' ? '#e8f4ff' : '#c8302e'), M(-1, 0, 1));
    b.box(vx - 0.44, 0.9, 5.59, vx + 0.44, 1.75, 5.6, lin('#f6f2e4'), M(-1, 0, 1, 3.2));
    for (let k = 0; k < 3; k++) for (let j = 0; j < 6; j++) {
      const c = ['#2a63c9', '#d8a23a', '#3f9a4a', '#e2e0d8', '#a33a2e', '#6a3f2a'][(j + k * 2) % 6];
      b.box(vx - 0.4 + j * 0.135, 1.0 + k * 0.25, 5.585, vx - 0.31 + j * 0.135, 1.16 + k * 0.25, 5.592, lin(c), M(-1, 0, 1, 1.2));
    }
    b.box(vx - 0.44, 0.15, 5.59, vx + 0.44, 0.5, 5.6, lin('#222222'), M(-1, 0, 1));
  }
  // posts for the station board (the board face is a textured quad)
  const sx = -1.6;
  for (const dx of [-0.98, 0.98]) b.box(sx + dx - 0.035, top, 3.25, sx + dx + 0.035, 1.62, 3.32, lin(style === 'light' ? '#e8eeff' : '#3c3c3c'), M(-1, 0, 1));
  b.box(sx - 1.0, 0.86, 3.3, sx + 1.0, 1.58, 3.36, lin('#2a2a2a'), M(-1, 0, 1));
  // lamp posts along the open part
  if (P.light > 0) for (let x = -half + 3; x < half; x += 12) {
    if (P.roofLen && Math.abs(x) < P.roofLen / 2) continue;
    b.cyl('y', top, 3.0, x, 6.6, 0.05, lin('#4c4c50'), M(-1, 0, 1), { seg: 8 });
    b.box(x - 0.15, 2.9, 6.1, x + 0.15, 3.05, 6.7, lin(P.lamp), M(-1, 0, 1, 5.0 * P.light));
  }
  // flowers along the fence
  if (P.flowers) {
    const rr = rng(7);
    for (let i = 0; i < 160; i++) {
      const x = -half + rr() * P.len, h = 0.3 + rr() * 0.6;
      b.box(x, top, 6.7 + rr() * 0.3, x + 0.02, top + h, 6.72 + rr() * 0.3, lin('#4f7a3a'), M(-1, 0, 1));
      const c = ['#f2a7c2', '#ffffff', '#e86a9a', '#f6d6e2'][Math.floor(rr() * 4)];
      b.box(x - 0.05, top + h, 6.7, x + 0.07, top + h + 0.08, 6.8, lin(c), M(-1, 0, 1, 0.1));
    }
  }
  return b;
}

// 駅名標 face
export function paintStationSign(st, prev, next, lineCol = '#e6a23c') {
  const { c, g } = canvas2d(1024, 352);
  g.fillStyle = '#f7f5ee'; g.fillRect(0, 0, 1024, 352);
  g.strokeStyle = '#1b1b1b'; g.lineWidth = 10; g.strokeRect(5, 5, 1014, 342);
  // station number badge
  g.fillStyle = '#ffffff'; g.strokeStyle = lineCol; g.lineWidth = 8;
  roundRect(g, 40, 34, 92, 104, 14); g.fill(); g.stroke();
  g.fillStyle = lineCol; g.fillRect(44, 38, 84, 34);
  g.fillStyle = '#fff'; g.font = '700 28px "Zen Kaku Gothic New", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('H', 86, 56);
  g.fillStyle = '#1b1b1b'; g.font = '700 40px "Zen Kaku Gothic New", sans-serif';
  g.fillText(st.no.replace('H', '') || '∞', 86, 106);
  // names
  g.fillStyle = '#141414';
  g.font = '500 30px "Zen Kaku Gothic New", sans-serif';
  g.fillText(st.kana, 512, 54);
  g.font = '900 112px "Noto Serif JP", serif';
  g.fillText(st.jp, 512, 140);
  g.font = '500 30px "EB Garamond", serif';
  g.fillText(st.en.replace(' 1985', ''), 512, 212);
  // the line band with neighbours
  g.fillStyle = lineCol; g.fillRect(10, 250, 1004, 70);
  g.fillStyle = '#ffffff';
  g.font = '700 30px "Zen Kaku Gothic New", sans-serif';
  if (prev) { g.textAlign = 'left'; g.fillText('◀ ' + prev.kana, 34, 286); }
  if (next) { g.textAlign = 'right'; g.fillText(next.kana + ' ▶', 990, 286); }
  return c;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

export class Outside {
  constructor(gl, P, { reduced = false } = {}) {
    this.gl = gl; this.P = P; this.reduced = reduced;
    this.strip = stripMesh(gl);
    this.ground = groundMesh(gl);
    this.track = trackMesh(gl);
    this.tube = tubeMesh(50).upload(gl);
    this.cross = crossingMesh().upload(gl);
    this.poles = {};
    this.wires = {};
    this.portals = {};
    this.platforms = {};
    this.themes = {};
    this.graffiti = texFromCanvas(gl, paintGraffiti(), { wrap: 'repeat' });
    const black = canvas2d(2, 2);
    black.g.fillStyle = 'rgba(0,0,0,0)'; black.g.fillRect(0, 0, 2, 2);
    this.black = texFromCanvas(gl, black.c, { mips: false });
    this.signs = {};
    this.pending = new Set();
  }

  // paint a theme's strips, one per animation frame so the ride never stutters
  ensure(id) {
    if (this.themes[id]) return this.themes[id].ready;
    const th = THEMES[id];
    const entry = { strips: [], ready: null };
    this.themes[id] = entry;
    entry.ready = new Promise((resolve) => {
      const specs = th.strips.slice();
      const step = () => {
        if (this.dead) return resolve();
        const spec = specs.shift();
        if (!spec) { entry.done = true; return resolve(); }
        const p = paintStrip(spec);
        const tex = texFromCanvas(this.gl, p.albedo, { wrap: 'repeatx' });
        const em = p.emis ? texFromCanvas(this.gl, p.emis, { wrap: 'repeatx' }) : null;
        entry.strips.push({ spec, tex, em, canvas: p.albedo });
        (window.requestIdleCallback || ((f) => setTimeout(f, 16)))(step, { timeout: 120 });
      };
      step();
    });
    if (th.poles && !this.poles[th.poles.style]) {
      this.poles[th.poles.style] = poleMesh(th.poles.style).upload(this.gl);
    }
    if (th.poles && th.poles.wires && !this.wires[id]) {
      const hs = th.poles.style === 'concrete' ? [[7.95, -0.75], [7.95, 0.0], [7.95, 0.75], [6.6, 0.25]] : [[6.8, -0.6], [6.8, 0.6]];
      this.wires[id] = wireMesh(th.poles.period, hs.slice(0, th.poles.wires + (th.poles.style === 'concrete' ? 1 : 0)), th.poles.style === 'concrete' ? 0.55 : 0.8).upload(this.gl);
    }
    return entry.ready;
  }

  portal(hill) {
    if (!this.portals[hill]) this.portals[hill] = portalMesh(hill).upload(this.gl);
    return this.portals[hill];
  }

  platform(style, groundY) {
    const key = style + groundY;
    if (!this.platforms[key]) this.platforms[key] = platformMesh(style, groundY).upload(this.gl);
    return this.platforms[key];
  }

  sign(st, prev, next) {
    const key = st.id;
    if (!this.signs[key]) {
      const c = paintStationSign(st, prev, next);
      const b = new Builder();
      const o = -1.6;
      b.quad([o - 0.98, 0.88, 3.295], [o + 0.98, 0.88, 3.295], [o + 0.98, 1.56, 3.295], [o - 0.98, 1.56, 3.295], [0, 0, -1],
        [[1, 1], [0, 1], [0, 0], [1, 0]], [1, 1, 1, 1], [-1, 0, 1, 0]);
      this.signs[key] = { mesh: b.upload(this.gl), tex: texFromCanvas(this.gl, c, { wrap: 'clamp' }), canvas: c };
    }
    return this.signs[key];
  }

  refreshSigns() {
    for (const k of Object.keys(this.signs)) { this.gl.deleteTexture(this.signs[k].tex); delete this.signs[k]; }
  }

  destroy() { this.dead = true; }
}

export { PLAT };
