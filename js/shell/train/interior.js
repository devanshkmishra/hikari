// The railcar itself: a 1980s one-man diesel commuter car (long seats, three doors a side,
// bare fluorescent tubes, ceiling fans, mesh luggage racks). Geometry and procedural textures.
import { Builder, MAT, lin, canvas2d, rng, texArray } from './gl.js';

export const L = {
  XF: 5.0, XR: -7.6,            // front / rear partitions
  W: 1.38, GLZ: 1.425, OUT: 1.47,
  SILL: 0.92, TOP: 1.70, MID: 1.34, WALLTOP: 2.12, CEIL: 2.42,
  DOORH: 1.86,
  doors: [[3.75, 4.6], [-0.45, 0.45], [-6.65, -5.8]],
  seats: [[0.5, 3.7], [-5.75, -0.5]],
  windows: [[0.95, 1.95], [2.25, 3.25], [-2.2, -0.95], [-3.75, -2.5], [-5.3, -4.05]],
  blinds: { '-1': [0.35, 0.0, 0.2, 0.0, 0.6], '1': [0.0, 0.3, 0.0, 0.52, 0.16] },
  eye: [-1.25, 1.18, -0.95],
  pole: [-1.5, -0.12],
  tubes: [-7.1, 4.5],
  fans: [2.55, -2.95, -5.35],
  ads: [3.35, 1.55, -1.05, -2.15, -4.15, -6.15],
  WX0: -7.8, WX1: 5.2,
  routeMap: { x: -1.575, y: 2.0, w: 1.22, h: 0.3 },
  led: { x: 0.0, y: 1.98, w: 0.86, h: 0.13 },
  fare: { y0: 1.86, y1: 2.2, z0: -1.3, z1: 1.3 },
  ticket: { x: -0.7, y: 1.1 },
  book: { x: -2.1, z: 1.04 },
  canZ: 1.0,
};

// ── procedural textures (512², linear-ish sRGB, tiled) ──────────────────────
const S = 512;
function vnoise2(seed, period) {
  const r = rng(seed);
  const P = period;
  const tab = new Float32Array(P * P);
  for (let i = 0; i < tab.length; i++) tab[i] = r();
  const at = (x, y) => tab[(((y % P) + P) % P) * P + (((x % P) + P) % P)];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
function fillPixels(g, fn) {
  const img = g.createImageData(S, S);
  const d = img.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    const [r, gg, b, a = 255] = fn(x, y);
    d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = a;
  }
  g.putImageData(img, 0, 0);
}
const clamp255 = (v) => Math.max(0, Math.min(255, v));

function texMoquette() {
  const { c, g } = canvas2d(S, S);
  const r = rng(11), n1 = vnoise2(3, 16), n2 = vnoise2(5, 64);
  fillPixels(g, (x, y) => {
    const tw = ((x + y) >> 1) % 3 === 0 ? 0.06 : 0;
    const v = 0.78 + r() * 0.26 + tw + (n1(x / 32, y / 32) - 0.5) * 0.16 + (n2(x / 8, y / 8) - 0.5) * 0.08;
    return [clamp255(255 * v), clamp255(255 * v), clamp255(255 * v)];
  });
  return c;
}
function texFloor() {
  const { c, g } = canvas2d(S, S);
  const r = rng(21), n1 = vnoise2(7, 8), n2 = vnoise2(9, 32);
  fillPixels(g, (x, y) => {
    let v = 0.86 + (n1(x / 64, y / 64) - 0.5) * 0.12 + (n2(x / 16, y / 16) - 0.5) * 0.05;
    const s = r();
    if (s > 0.992) v += 0.25; else if (s < 0.01) v -= 0.22;
    return [clamp255(146 * v), clamp255(148 * v), clamp255(138 * v)];
  });
  // scuffs
  const rr = rng(23);
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(40,38,34,${0.05 + rr() * 0.1})`;
    g.lineWidth = 1 + rr() * 3;
    g.beginPath();
    const x = rr() * S, y = rr() * S, a = (rr() - 0.5) * 0.6;
    g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 60 * rr(), y + Math.sin(a) * 20 * rr());
    g.stroke();
  }
  return c;
}
function texWall() {
  const { c, g } = canvas2d(S, S);
  const r = rng(31), n1 = vnoise2(13, 8);
  fillPixels(g, (x, y) => {
    const fleck = ((x * 7 + y * 13) % 17 === 0) ? 0.03 : 0;
    const v = 0.93 + (r() - 0.5) * 0.05 + (n1(x / 64, y / 64) - 0.5) * 0.05 + fleck;
    return [clamp255(232 * v), clamp255(222 * v), clamp255(200 * v)];
  });
  return c;
}
function texCeiling() {
  const { c, g } = canvas2d(S, S);
  g.fillStyle = '#efece3'; g.fillRect(0, 0, S, S);
  const r = rng(41);
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(120,115,100,${r() * 0.05})`; g.fillRect(r() * S, r() * S, 2, 2); }
  g.fillStyle = 'rgba(90,85,75,0.35)';
  for (let y = 8; y < S; y += 16) for (let x = 8; x < S; x += 16) { g.beginPath(); g.arc(x + ((y >> 4) & 1) * 8, y, 1.6, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(60,58,52,0.45)'; g.fillRect(0, 0, S, 3);
  return c;
}
function texGrille() {
  const { c, g } = canvas2d(S, S);
  g.fillStyle = '#4a4b47'; g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 32) {
    g.fillStyle = '#121211'; g.fillRect(0, y + 8, S, 12);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, y + 20, S, 2);
  }
  return c;
}
function texChecker() {
  const { c, g } = canvas2d(S, S);
  g.fillStyle = '#9fa09b'; g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 32) for (let x = 0; x < S; x += 32) {
    const o = ((y >> 5) & 1) * 16;
    g.save(); g.translate(x + o + 8, y + 8); g.rotate(((x + y) >> 5) & 1 ? 0.7 : -0.7);
    g.fillStyle = '#c8c9c3'; g.fillRect(-9, -2, 18, 4);
    g.fillStyle = '#6d6e6a'; g.fillRect(-9, 2, 18, 1.5);
    g.restore();
  }
  return c;
}
function texPaint() {
  const { c, g } = canvas2d(S, S);
  const r = rng(51), n1 = vnoise2(17, 16);
  fillPixels(g, (x, y) => {
    const v = 0.95 + (r() - 0.5) * 0.03 + (n1(x / 32, y / 32) - 0.5) * 0.04;
    return [clamp255(255 * v), clamp255(255 * v), clamp255(255 * v)];
  });
  return c;
}
function texRubber() {
  const { c, g } = canvas2d(S, S);
  g.fillStyle = '#1b1b1c'; g.fillRect(0, 0, S, S);
  for (let x = 0; x < S; x += 8) { g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x, 0, 2, S); }
  return c;
}
function texNet() {
  const { c, g } = canvas2d(S, S);
  g.clearRect(0, 0, S, S);
  g.strokeStyle = '#c9c6bd'; g.lineWidth = 5;
  const step = 64;
  for (let k = -S; k < S * 2; k += step) {
    g.beginPath(); g.moveTo(k, 0); g.lineTo(k + S, S); g.stroke();
    g.beginPath(); g.moveTo(k, S); g.lineTo(k + S, 0); g.stroke();
  }
  return c;
}
function texBlind() {
  const { c, g } = canvas2d(S, S);
  const r = rng(61);
  fillPixels(g, (x, y) => {
    const weave = (x % 4 < 2 ? 0.03 : -0.03) + (y % 6 < 3 ? 0.02 : -0.02);
    const v = 0.9 + weave + (r() - 0.5) * 0.06;
    return [clamp255(214 * v), clamp255(214 * v), clamp255(188 * v)];
  });
  return c;
}

export function makeTextures(gl) {
  return texArray(gl, [texMoquette(), texFloor(), texWall(), texCeiling(), texGrille(), texChecker(), texPaint(), texRubber(), texNet(), texBlind()], S);
}
export const T = { MOQ: 0, FLOOR: 1, WALL: 2, CEIL: 3, GRILLE: 4, CHECK: 5, PAINT: 6, RUBBER: 7, NET: 8, BLIND: 9 };

// ── colours (linear) ────────────────────────────────────────────────────────
const C = {
  wall: lin('#f2ead6'), ceil: lin('#f6f3ea'), floor: lin('#a7aa9e'),
  moq: lin('#3f8a63'), moqDark: lin('#2b6447'), base: lin('#8f8c80'),
  chrome: lin('#d8dadc'), alu: lin('#b9bcbd'), dark: lin('#1d1e20'), black: lin('#0b0b0c'),
  door: lin('#e4dccb'), paint: lin('#e8e0cc'), rubber: lin('#2a2a2a'), blind: lin('#d5d8c0'),
  fixture: lin('#f1efe7'), tube: lin('#ffffff'), cream: lin('#efe6cf'),
  yellow: lin('#f2c230'), purple: lin('#6a3fa0'), grey: lin('#7c7f80'), navy: lin('#22283a'),
};
const M = (layer, kind, ao = 1, em = 0) => [layer, kind, ao, em];
const TWO = 32;

// rectangles of solid wall in [x0,x1] minus holes
function solid(x0, x1, holes) {
  const hs = holes.filter((h) => h[1] > x0 && h[0] < x1).sort((a, b) => a[0] - b[0]);
  const out = [];
  let x = x0;
  for (const h of hs) { if (h[0] > x) out.push([x, h[0]]); x = Math.max(x, h[1]); }
  if (x < x1) out.push([x, x1]);
  return out;
}

// a vertical wall quad at z, spanning x0..x1, y0..y1, facing toward -s (into the car)
function wallQuad(b, s, z, x0, x1, y0, y1, col, mat, us = 1) {
  const n = [0, 0, -s];
  const uv = [[x0 / us, -y0 / us], [x1 / us, -y0 / us], [x1 / us, -y1 / us], [x0 / us, -y1 / us]];
  b.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], n, uv, col, mat);
}

export function buildStatic() {
  const b = new Builder();
  const g = new Builder(); // glass
  const { XF, XR, W, SILL, TOP, MID, WALLTOP, CEIL, DOORH } = L;
  const doorsAll = L.doors;

  for (const s of [-1, 1]) {
    const z = s * W;
    const winHoles = L.windows;
    // lower band
    for (const [a, c] of solid(XR, XF, doorsAll)) wallQuad(b, s, z, a, c, 0, SILL, C.wall, M(T.WALL, MAT.PAINT, 1));
    // window band
    for (const [a, c] of solid(XR, XF, [...doorsAll, ...winHoles])) wallQuad(b, s, z, a, c, SILL, TOP, C.wall, M(T.WALL, MAT.PAINT, 1));
    // above windows to door head
    for (const [a, c] of solid(XR, XF, doorsAll)) wallQuad(b, s, z, a, c, TOP, DOORH, C.wall, M(T.WALL, MAT.PAINT, 1));
    wallQuad(b, s, z, XR, XF, DOORH, WALLTOP, C.wall, M(T.WALL, MAT.PAINT, 1));
    // skirting
    for (const [a, c] of solid(XR, XF, doorsAll)) b.box(a, 0, s > 0 ? W - 0.012 : -W, c, 0.07, s > 0 ? W : -W + 0.012, C.dark, M(-1, MAT.PAINT, 0.6), { faces: s > 0 ? 'zY' : 'ZY' });

    // windows: reveal, aluminium frame, mid rail, latches, glass, sun-blind
    L.windows.forEach(([x0, x1], wi) => {
      const zi = s * W, zo = s * L.OUT;
      const rev = M(T.WALL, MAT.PAINT, 0.85);
      // reveal: sill, head, jambs
      b.quad([x0, SILL, zi], [x1, SILL, zi], [x1, SILL, zo], [x0, SILL, zo], [0, 1, 0], null, C.wall, rev);
      b.quad([x0, TOP, zo], [x1, TOP, zo], [x1, TOP, zi], [x0, TOP, zi], [0, -1, 0], null, C.wall, rev);
      b.quad([x0, SILL, zo], [x0, SILL, zi], [x0, TOP, zi], [x0, TOP, zo], [1, 0, 0], null, C.wall, rev);
      b.quad([x1, SILL, zi], [x1, SILL, zo], [x1, TOP, zo], [x1, TOP, zi], [-1, 0, 0], null, C.wall, rev);
      // frame
      const zf0 = s * 1.395, zf1 = s * 1.445;
      const lo = Math.min(zf0, zf1), hi = Math.max(zf0, zf1);
      const fr = M(-1, MAT.CHROME, 0.9);
      b.box(x0, SILL, lo, x1, SILL + 0.03, hi, C.alu, fr, { faces: 'yYzZ' });
      b.box(x0, TOP - 0.03, lo, x1, TOP, hi, C.alu, fr, { faces: 'yYzZ' });
      b.box(x0, SILL, lo, x0 + 0.03, TOP, hi, C.alu, fr, { faces: 'xXzZ' });
      b.box(x1 - 0.03, SILL, lo, x1, TOP, hi, C.alu, fr, { faces: 'xXzZ' });
      b.box(x0, MID - 0.022, s > 0 ? 1.39 : -1.45, x1, MID + 0.022, s > 0 ? 1.45 : -1.39, C.alu, fr, { faces: 'yYzZ' });
      // latches on the lower sash
      for (const lx of [x0 + 0.16, x1 - 0.2]) b.box(lx, MID - 0.05, s > 0 ? 1.37 : -1.405, lx + 0.04, MID - 0.02, s > 0 ? 1.405 : -1.37, C.chrome, fr);
      // glass panes: lower sash slightly inboard of the upper one
      const pane = (y0, y1, zz, dirt, seed) => {
        const n = [0, 0, -s];
        const col = [dirt, y0, seed, 1];
        g.quad([x0 + 0.03, y0, zz], [x1 - 0.03, y0, zz], [x1 - 0.03, y1, zz], [x0 + 0.03, y1, zz], n,
          [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], col, [-1, 0, 1, 0]);
      };
      pane(SILL + 0.03, MID - 0.022, s * 1.42, 0.8, wi * 2 + (s > 0 ? 0.5 : 0));
      pane(MID + 0.022, TOP - 0.03, s * 1.432, 0.4, wi * 2 + 1 + (s > 0 ? 0.5 : 0));
      // sun-blind roll and fabric
      const bf = L.blinds[String(s)][wi];
      const zb = s * 1.402;
      b.box(x0 + 0.02, TOP - 0.065, Math.min(s * 1.385, s * 1.42), x1 - 0.02, TOP - 0.025, Math.max(s * 1.385, s * 1.42), C.alu, M(-1, MAT.CHROME, 0.8));
      if (bf > 0) {
        const yb = TOP - 0.065 - bf * (TOP - SILL - 0.1);
        b.quad([x0 + 0.035, yb, zb], [x1 - 0.035, yb, zb], [x1 - 0.035, TOP - 0.065, zb], [x0 + 0.035, TOP - 0.065, zb], [0, 0, -s],
          [[x0 * 2, yb * 2], [x1 * 2, yb * 2], [x1 * 2, (TOP - 0.065) * 2], [x0 * 2, (TOP - 0.065) * 2]], C.blind, M(T.BLIND, MAT.DIFFUSE + 6 + TWO, 1));
        b.box(x0 + 0.03, yb - 0.018, Math.min(zb, zb - s * 0.015), x1 - 0.03, yb, Math.max(zb, zb - s * 0.015), C.alu, M(-1, MAT.CHROME, 0.9));
        const tx = (x0 + x1) / 2;
        b.box(tx - 0.03, yb - 0.05, Math.min(zb - s * 0.004, zb - s * 0.014), tx + 0.03, yb - 0.018, Math.max(zb - s * 0.004, zb - s * 0.014), C.dark, M(-1, MAT.PAINT, 1));
      }
    });

    // doors: reveals + leaves (the far centre door is dynamic)
    doorsAll.forEach(([x0, x1], di) => {
      const zi = s * W, zo = s * L.OUT;
      const rev = M(-1, MAT.CHROME, 0.8);
      b.quad([x0, DOORH, zo], [x1, DOORH, zo], [x1, DOORH, zi], [x0, DOORH, zi], [0, -1, 0], null, C.alu, rev);
      b.quad([x0, 0, zo], [x0, 0, zi], [x0, DOORH, zi], [x0, DOORH, zo], [1, 0, 0], null, C.alu, rev);
      b.quad([x1, 0, zi], [x1, 0, zo], [x1, DOORH, zo], [x1, DOORH, zi], [-1, 0, 0], null, C.alu, rev);
      // threshold plate
      b.box(x0, 0, Math.min(s * 1.12, s * L.OUT), x1, 0.006, Math.max(s * 1.12, s * L.OUT), C.alu, M(T.CHECK, MAT.CHROME, 0.9), { faces: 'Y', us: 0.5 });
      // a yellow line warning you of the gap
      b.box(x0, 0.006, Math.min(s * 1.14, s * 1.2), x1, 0.008, Math.max(s * 1.14, s * 1.2), lin('#d9b52a'), M(-1, MAT.PAINT, 0.9), { faces: 'Y' });
      if (s > 0 && di === 1) return;
      const leaves = doorLeaves(x0, x1, s);
      for (const lf of leaves) { b.v.push(...lf.b.v); g.v.push(...lf.g.v); }
    });

    // long seats
    for (const [x0, x1] of L.seats) seat(b, s, x0, x1);

    // luggage racks + strap rails over the seats
    for (const [x0, x1] of L.seats) rack(b, s, x0 + 0.05, x1 - 0.05);
  }

  // floor
  b.quad([XR, 0, -W], [XF, 0, -W], [XF, 0, W], [XR, 0, W], [0, 1, 0],
    [[XR / 2, -W / 2], [XF / 2, -W / 2], [XF / 2, W / 2], [XR / 2, W / 2]], C.floor, M(T.FLOOR, MAT.GLOSS, 1));

  // ceiling: cove + crown
  const prof = [[W, WALLTOP], [1.06, 2.3], [0.64, 2.39], [0, CEIL]];
  for (const s of [-1, 1]) for (let i = 0; i < prof.length - 1; i++) {
    const [za, ya] = prof[i], [zb, yb] = prof[i + 1];
    const dz = zb - za, dy = yb - ya;
    const len = Math.hypot(dz, dy);
    const n = [0, -Math.abs(dz) / len, s * Math.abs(dy) / len * -1];
    // normal points down and inward
    n[2] = -s * Math.abs(dy) / len;
    b.quad([XR, ya, s * za], [XF, ya, s * za], [XF, yb, s * zb], [XR, yb, s * zb], n,
      [[XR, s * za], [XF, s * za], [XF, s * zb], [XR, s * zb]], C.ceil, M(T.CEIL, MAT.DIFFUSE, i === 0 ? 0.85 : 1));
  }
  // fluorescent fixtures and tubes
  const [t0, t1] = L.tubes;
  for (const s of [-1, 1]) {
    const z = s * 0.55;
    b.box(t0, 2.33, z - 0.04, t1, 2.375, z + 0.04, C.fixture, M(-1, MAT.PAINT, 0.95), { faces: 'yzZxX' });
    for (let x = t0 + 0.05; x < t1 - 0.6; x += 1.26) {
      b.cyl('x', x + 0.04, x + 1.2, 2.312, z, 0.0135, C.tube, M(-1, MAT.TUBE, 1), { seg: 10 });
      b.box(x, 2.298, z - 0.016, x + 0.04, 2.33, z + 0.016, C.cream, M(-1, MAT.PAINT, 0.9));
      b.box(x + 1.2, 2.298, z - 0.016, x + 1.24, 2.33, z + 0.016, C.cream, M(-1, MAT.PAINT, 0.9));
    }
  }
  // ad rail down the centre with drop rods
  b.cyl('x', XR + 0.4, XF - 0.4, 2.23, 0, 0.007, C.chrome, M(-1, MAT.CHROME, 1), { seg: 8 });
  for (let x = XR + 0.6; x < XF - 0.4; x += 1.8) b.cyl('y', 2.23, CEIL, x, 0, 0.005, C.chrome, M(-1, MAT.CHROME, 1), { seg: 6 });
  // fan housings (the blades and guards spin separately)
  for (const fx of L.fans) {
    b.cyl('y', 2.33, CEIL + 0.01, fx, 0, 0.2, C.cream, M(-1, MAT.PAINT, 0.95), { seg: 24, caps: true });
    b.cyl('y', 2.2, 2.33, fx, 0, 0.05, C.cream, M(-1, MAT.PAINT, 0.9), { seg: 14 });
  }
  // ceiling vents
  for (let x = XR + 1.4; x < XF - 1; x += 2.5) b.box(x, CEIL - 0.012, -0.12, x + 0.7, CEIL - 0.002, 0.12, C.grey, M(T.GRILLE, MAT.DIFFUSE, 0.9), { faces: 'y', us: 0.25 });

  partitionFront(b, g);
  partitionRear(b, g);
  cab(b, g);
  fixtures(b);
  return { b, g };
}

function doorLeaves(x0, x1, s, { glassOnly = false } = {}) {
  const mid = (x0 + x1) / 2;
  const out = [];
  for (const [a, c] of [[x0, mid], [mid, x1]]) {
    const b = new Builder(), g = new Builder();
    const zi = s * 1.398, zo = s * 1.44;
    const lo = Math.min(zi, zo), hi = Math.max(zi, zo);
    const gx0 = a + 0.07, gx1 = c - 0.07, gy0 = 1.0, gy1 = 1.72;
    const mt = M(T.PAINT, MAT.PAINT, 1);
    const face = s > 0 ? 'zxXyY' : 'ZxXyY';
    b.box(a, 0.01, lo, c, gy0, hi, C.door, mt, { faces: face, us: 0.5 });
    b.box(a, gy1, lo, c, L.DOORH, hi, C.door, mt, { faces: face, us: 0.5 });
    b.box(a, gy0, lo, gx0, gy1, hi, C.door, mt, { faces: face, us: 0.5 });
    b.box(gx1, gy0, lo, c, gy1, hi, C.door, mt, { faces: face, us: 0.5 });
    // rubber nosing where the leaves meet
    const meet = a === x0 ? c : a;
    b.box(meet - 0.012, 0.01, lo - 0.004, meet + 0.012, L.DOORH, hi, C.rubber, M(T.RUBBER, MAT.DIFFUSE, 1), { us: 0.2 });
    // glass frame
    b.box(gx0, gy0, s > 0 ? lo - 0.004 : hi - 0.006, gx1, gy0 + 0.02, s > 0 ? lo + 0.006 : hi + 0.004, C.rubber, M(-1, MAT.DIFFUSE, 1));
    g.quad([gx0, gy0, s * 1.42], [gx1, gy0, s * 1.42], [gx1, gy1, s * 1.42], [gx0, gy1, s * 1.42], [0, 0, -s],
      [[gx0, gy0], [gx1, gy0], [gx1, gy1], [gx0, gy1]], [0.9, gy0, a * 3.1 + s, 1], [-1, 0, 1, 0]);
    out.push({ b, g, x0: a, x1: c, dir: a === x0 ? -1 : 1 });
  }
  return out;
}
export function buildDoorLeaves(x0, x1, s) { return doorLeaves(x0, x1, s); }

function seat(b, s, x0, x1) {
  const z = (v) => s * v;
  const lo = (a, c) => Math.min(z(a), z(c)), hi = (a, c) => Math.max(z(a), z(c));
  const moq = M(T.MOQ, MAT.FABRIC, 1);
  // cushion top (gently raked) and rounded nose
  const nz = [0, 0, -s];
  b.quad([x0, 0.445, z(0.87)], [x1, 0.445, z(0.87)], [x1, 0.43, z(1.3)], [x0, 0.43, z(1.3)], [0, 1, 0.02 * -s],
    [[x0 * 3, 0], [x1 * 3, 0], [x1 * 3, 1.3], [x0 * 3, 1.3]], C.moq, moq);
  const nose = [[0.87, 0.445, 0.4, 1], [0.845, 0.43, -0.4, 0.9], [0.835, 0.395, -0.95, 0.75], [0.855, 0.36, -0.6, 0.6]];
  for (let i = 0; i < nose.length - 1; i++) {
    const [za, ya, , aoA] = nose[i], [zb, yb, , aoB] = nose[i + 1];
    const ny = (nose[i][2] + nose[i + 1][2]) * 0.5;
    const n = [0, ny > 0 ? 0.7 : 0.3, -s];
    b.quad([x0, yb, z(zb)], [x1, yb, z(zb)], [x1, ya, z(za)], [x0, ya, z(za)], n,
      [[x0 * 3, yb], [x1 * 3, yb], [x1 * 3, ya], [x0 * 3, ya]], C.moq, moq, [aoB, aoB, aoA, aoA]);
  }
  // cushion ends
  for (const xe of [x0, x1]) {
    const n = [xe === x0 ? -1 : 1, 0, 0];
    b.quad([xe, 0.36, z(0.855)], [xe, 0.36, z(1.3)], [xe, 0.445, z(1.3)], [xe, 0.445, z(0.87)], n, null, C.moqDark, moq);
  }
  // base with the heater grille
  b.box(x0 + 0.02, 0.07, lo(0.9, 1.33), x1 - 0.02, 0.36, hi(0.9, 1.33), C.base, M(T.GRILLE, MAT.DIFFUSE, 0.75, 0), { faces: s > 0 ? 'zxX' : 'ZxX', us: 0.25 });
  b.box(x0 + 0.04, 0.0, lo(0.97, 1.33), x1 - 0.04, 0.07, hi(0.97, 1.33), C.black, M(-1, MAT.DIFFUSE, 0.4), { faces: s > 0 ? 'z' : 'Z' });
  // backrest, leaning against the wall
  const bz0 = 1.27, bz1 = 1.355, by0 = 0.46, by1 = 0.9;
  const bn = [0, 0.19, -s];
  b.quad([x0, by0, z(bz0)], [x1, by0, z(bz0)], [x1, by1, z(bz1)], [x0, by1, z(bz1)], bn,
    [[x0 * 3, by0 * 3], [x1 * 3, by0 * 3], [x1 * 3, by1 * 3], [x0 * 3, by1 * 3]], C.moq, moq, [0.7, 0.7, 1, 1]);
  b.quad([x0, by1, z(bz1)], [x1, by1, z(bz1)], [x1, by1 + 0.03, z(1.375)], [x0, by1 + 0.03, z(1.375)], [0, 0.8, -s * 0.6], null, C.moqDark, moq);
  // the crease between back and seat
  b.box(x0, 0.43, lo(1.27, 1.31), x1, 0.47, hi(1.27, 1.31), C.moqDark, M(T.MOQ, MAT.FABRIC, 0.45));
  // seat-end armrests: a bent chrome pipe, and a tall grab pole at the door end
  for (const xe of [x0 - 0.025, x1 + 0.025]) {
    b.cyl('y', 0.36, 0.98, xe, z(0.86), 0.016, C.chrome, M(-1, MAT.CHROME, 1), { seg: 10 });
    b.cyl('z', z(0.86), z(1.37), xe, 0.98, 0.016, C.chrome, M(-1, MAT.CHROME, 1), { seg: 10 });
    b.sphere([xe, 0.98, z(0.86)], 0.018, C.chrome, M(-1, MAT.CHROME, 1), { seg: 8, ring: 5 });
    // pressed panel inside the armrest frame
    b.box(xe - 0.006, 0.46, lo(0.9, 1.36), xe + 0.006, 0.94, hi(0.9, 1.36), C.paint, M(T.PAINT, MAT.PAINT, 0.85));
  }
  // grab poles at the ends that face a door
  for (const xe of [x0 - 0.06, x1 + 0.06]) {
    const nearDoor = L.doors.some(([a, c]) => Math.abs(xe - a) < 0.3 || Math.abs(xe - c) < 0.3);
    if (!nearDoor) continue;
    b.cyl('y', 0.0, 2.1, xe, z(0.86), 0.017, C.chrome, M(-1, MAT.CHROME, 1), { seg: 10 });
    b.cyl('y', 0.0, 0.03, xe, z(0.86), 0.03, C.chrome, M(-1, MAT.CHROME, 0.8), { seg: 10 });
  }
}

function rack(b, s, x0, x1) {
  const z = (v) => s * v;
  const ch = M(-1, MAT.CHROME, 1);
  b.cyl('x', x0, x1, 1.82, z(1.08), 0.012, C.chrome, ch, { seg: 8 });
  b.cyl('x', x0, x1, 1.845, z(1.36), 0.01, C.chrome, ch, { seg: 8 });
  // the net
  b.quad([x0, 1.825, z(1.09)], [x1, 1.825, z(1.09)], [x1, 1.84, z(1.36)], [x0, 1.84, z(1.36)], [0, 1, 0],
    [[x0 * 4, 0], [x1 * 4, 0], [x1 * 4, 1.1], [x0 * 4, 1.1]], C.alu, M(T.NET, 8 + TWO, 1));
  // strap rail
  b.cyl('x', x0, x1, 1.95, z(0.78), 0.0135, C.chrome, ch, { seg: 10 });
  // brackets
  const n = Math.max(2, Math.round((x1 - x0) / 1.4) + 1);
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * i) / (n - 1);
    b.cyl('z', z(0.78), z(1.38), x, 1.985, 0.009, C.chrome, ch, { seg: 6 });
    b.cyl('y', 1.95, 1.985, x, z(0.78), 0.008, C.chrome, ch, { seg: 6 });
    // a cast bracket from the wall down to the rack
    b.box(x - 0.012, 1.8, Math.min(z(1.06), z(1.38)), x + 0.012, 1.86, Math.max(z(1.06), z(1.38)), C.alu, M(-1, MAT.CHROME, 0.9));
  }
}

function partitionFront(b, g) {
  const { XF, W, DOORH } = L;
  const x = XF;
  const n = [-1, 0, 0];
  // openings in (z, y)
  const cabDoor = [-1.08, -0.5];
  const win = [-0.12, 1.18, 1.02, 1.74];
  const dwin = [-0.98, -0.6, 1.08, 1.62];
  const pq = (z0, z1, y0, y1, col = C.wall, mat = M(T.WALL, MAT.PAINT, 1)) =>
    b.quad([x, y0, z1], [x, y0, z0], [x, y1, z0], [x, y1, z1], n, [[-z1, -y0], [-z0, -y0], [-z0, -y1], [-z1, -y1]], col, mat);
  // wall left of the cab door, right of the window, below and above the window
  pq(-W, cabDoor[0], 0, L.fare.y0);
  pq(cabDoor[1], win[0], 0, L.fare.y0);
  pq(win[1], W, 0, L.fare.y0);
  pq(win[0], win[1], 0, win[2]);
  pq(win[0], win[1], win[3], L.fare.y0);
  pq(cabDoor[0], cabDoor[1], DOORH, L.fare.y0);
  pq(-W, W, L.fare.y1, L.WALLTOP + 0.3);
  // cab door with its small window
  const xd = x + 0.015;
  const dq = (z0, z1, y0, y1) => b.quad([xd, y0, z1], [xd, y0, z0], [xd, y1, z0], [xd, y1, z1], n, [[-z1 * 2, -y0 * 2], [-z0 * 2, -y0 * 2], [-z0 * 2, -y1 * 2], [-z1 * 2, -y1 * 2]], C.door, M(T.PAINT, MAT.PAINT, 0.95));
  dq(cabDoor[0], cabDoor[1], 0, dwin[2]);
  dq(cabDoor[0], cabDoor[1], dwin[3], DOORH);
  dq(cabDoor[0], dwin[0], dwin[2], dwin[3]);
  dq(dwin[1], cabDoor[1], dwin[2], dwin[3]);
  b.box(x - 0.03, 0.98, -0.62, x, 1.02, -0.56, C.chrome, M(-1, MAT.CHROME, 1));
  // frames
  const fr = M(-1, MAT.CHROME, 0.9);
  b.box(x - 0.02, win[2], win[0], x + 0.04, win[2] + 0.03, win[1], C.alu, fr);
  b.box(x - 0.02, win[3] - 0.03, win[0], x + 0.04, win[3], win[1], C.alu, fr);
  b.box(x - 0.02, win[2], win[0], x + 0.04, win[3], win[0] + 0.03, C.alu, fr);
  b.box(x - 0.02, win[2], win[1] - 0.03, x + 0.04, win[3], win[1], C.alu, fr);
  b.box(x - 0.012, win[2] - 0.08, win[0], x, win[2], win[1], C.alu, M(-1, MAT.CHROME, 0.9));
  // door frame
  b.box(x - 0.02, 0, cabDoor[0] - 0.03, x + 0.02, DOORH + 0.03, cabDoor[0], C.alu, fr);
  b.box(x - 0.02, 0, cabDoor[1], x + 0.02, DOORH + 0.03, cabDoor[1] + 0.03, C.alu, fr);
  b.box(x - 0.02, DOORH, cabDoor[0], x + 0.02, DOORH + 0.03, cabDoor[1], C.alu, fr);
  // glass
  const gq = (z0, z1, y0, y1, xx, seed) => g.quad([xx, y0, z1], [xx, y0, z0], [xx, y1, z0], [xx, y1, z1], n, [[-z1, y0], [-z0, y0], [-z0, y1], [-z1, y1]], [0.5, y0, seed, 1], [-1, 0, 1, 0]);
  gq(win[0] + 0.03, win[1] - 0.03, win[2] + 0.03, win[3] - 0.03, x + 0.01, 41);
  gq(dwin[0], dwin[1], dwin[2], dwin[3], xd + 0.005, 43);
  // fare board housing (face is a separate decal)
  b.box(x - 0.1, L.fare.y0, L.fare.z0 - 0.04, x, L.fare.y1, L.fare.z1 + 0.04, C.black, M(-1, MAT.PAINT, 0.9));
  // fare box by the driver: the 運賃箱
  const fb = M(-1, MAT.PAINT, 0.95);
  b.box(4.66, 0, -1.27, 4.97, 0.82, -0.9, lin('#4c5560'), fb);
  b.box(4.64, 0.82, -1.29, 4.99, 1.05, -0.88, lin('#5a6470'), fb);
  b.box(4.66, 1.05, -1.25, 4.95, 1.1, -0.92, lin('#9aa3ab'), M(-1, MAT.CHROME, 0.9));
  b.box(4.62, 0.86, -1.2, 4.64, 0.98, -0.97, lin('#101418'), M(-1, MAT.PAINT, 1, 0));
}

function partitionRear(b, g) {
  const { XR, W, DOORH } = L;
  const x = XR;
  const n = [1, 0, 0];
  const pq = (z0, z1, y0, y1, col = C.wall, mat = M(T.WALL, MAT.PAINT, 1)) =>
    b.quad([x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0], n, [[z0, -y0], [z1, -y0], [z1, -y1], [z0, -y1]], col, mat);
  pq(-W, W, 0, 1.0);
  pq(-W, W, 1.75, L.WALLTOP + 0.3);
  pq(-W, -0.95, 1.0, 1.75);
  pq(-0.4, 0.15, 1.0, 1.75);
  pq(1.05, W, 1.0, 1.75);
  // drawn curtains in the rear cab windows
  for (const [z0, z1] of [[-0.95, -0.4], [0.15, 1.05]]) {
    const xc = x - 0.03;
    const cols = 14;
    for (let i = 0; i < cols; i++) {
      const za = z0 + ((z1 - z0) * i) / cols, zb = z0 + ((z1 - z0) * (i + 1)) / cols;
      const fold = i % 2 ? 0.012 : -0.012;
      b.quad([xc + fold, 1.0, za], [xc - fold, 1.0, zb], [xc - fold, 1.75, zb], [xc + fold, 1.75, za], [1, 0, (i % 2 ? 0.3 : -0.3)],
        [[za * 2, 0], [zb * 2, 0], [zb * 2, 1.5], [za * 2, 1.5]], lin('#c9b994'), M(T.BLIND, MAT.DIFFUSE, 0.9));
    }
  }
  b.box(x, 1.75, -W, x + 0.04, 1.79, W, C.alu, M(-1, MAT.CHROME, 0.9));
  b.box(x, 0.98, -W, x + 0.03, 1.0, W, C.alu, M(-1, MAT.CHROME, 0.9));
  b.box(x, 0, -0.9, x + 0.02, DOORH, -0.86, C.alu, M(-1, MAT.CHROME, 0.9));
}

function cab(b, g) {
  const { XF, W } = L;
  const x0 = XF, x1 = XF + 1.3;
  const dark = lin('#5f6468');
  const m = M(T.PAINT, MAT.PAINT, 0.7);
  b.box(x0, 0.0, -W, x1, 0.14, W, lin('#3a3c3d'), M(-1, MAT.DIFFUSE, 0.6), { faces: 'Y' });
  b.quad([x0, 2.25, -W], [x1, 2.25, -W], [x1, 2.25, W], [x0, 2.25, W], [0, -1, 0], null, lin('#d8d2c2'), m);
  for (const s of [-1, 1]) {
    b.quad([x0, 0, s * W], [x1, 0, s * W], [x1, 2.25, s * W], [x0, 2.25, s * W], [0, 0, -s], null, lin('#cfc7b4'), m);
  }
  // front wall with two windscreens
  const xf = x1;
  const n = [-1, 0, 0];
  const fq = (z0, z1, y0, y1) => b.quad([xf, y0, z1], [xf, y0, z0], [xf, y1, z0], [xf, y1, z1], n, null, lin('#cfc7b4'), m);
  fq(-W, W, 0, 1.08);
  fq(-W, W, 1.92, 2.25);
  fq(-W, -1.2, 1.08, 1.92);
  fq(-0.07, 0.07, 1.08, 1.92);
  fq(1.2, W, 1.08, 1.92);
  g.quad([xf - 0.01, 1.08, -0.07], [xf - 0.01, 1.08, -1.2], [xf - 0.01, 1.92, -1.2], [xf - 0.01, 1.92, -0.07], n, [[0, 1.08], [1.1, 1.08], [1.1, 1.92], [0, 1.92]], [0.3, 1.08, 77, 1], [-1, 0, 1, 0]);
  g.quad([xf - 0.01, 1.08, 1.2], [xf - 0.01, 1.08, 0.07], [xf - 0.01, 1.92, 0.07], [xf - 0.01, 1.92, 1.2], n, [[0, 1.08], [1.1, 1.08], [1.1, 1.92], [0, 1.92]], [0.3, 1.08, 79, 1], [-1, 0, 1, 0]);
  // dashboard
  b.box(x1 - 0.45, 0.14, -W, x1, 1.0, W, dark, M(-1, MAT.PAINT, 0.7));
  b.box(x1 - 0.5, 0.95, -1.25, x1 - 0.05, 1.05, -0.1, lin('#2b2e31'), M(-1, MAT.PAINT, 0.8));
  // master controller and brake handle
  b.cyl('y', 1.05, 1.2, x1 - 0.32, -1.0, 0.02, C.black, M(-1, MAT.PAINT, 1));
  b.sphere([x1 - 0.32, 1.22, -1.0], 0.035, C.black, M(-1, MAT.PAINT, 1));
  // driver's seat and the driver, cap on, gloved hand on the controller
  b.box(x1 - 1.0, 0.14, -1.0, x1 - 0.6, 0.55, -0.45, lin('#3b4b5e'), M(-1, MAT.FABRIC, 0.8));
  b.box(x1 - 1.05, 0.55, -1.0, x1 - 0.95, 1.15, -0.45, lin('#3b4b5e'), M(-1, MAT.FABRIC, 0.8));
  const navy = lin('#1d2433'), skin = lin('#b98f74');
  b.box(x1 - 0.95, 0.6, -0.95, x1 - 0.7, 1.22, -0.5, navy, M(-1, 9, 0.9));
  b.sphere([x1 - 0.82, 1.36, -0.72], 0.1, skin, M(-1, 9, 0.9), { seg: 12, ring: 8 });
  b.cyl('y', 1.42, 1.5, x1 - 0.82, -0.72, 0.11, navy, M(-1, 9, 1), { seg: 14, caps: true });
  b.box(x1 - 0.74, 1.42, -0.83, x1 - 0.62, 1.435, -0.61, C.black, M(-1, MAT.PAINT, 1));
  b.box(x1 - 0.78, 1.47, -0.75, x1 - 0.72, 1.49, -0.69, lin('#c8a24a'), M(-1, MAT.CHROME, 1));
  b.box(x1 - 0.7, 1.0, -1.05, x1 - 0.36, 1.08, -0.95, navy, M(-1, 9, 0.9));
  b.sphere([x1 - 0.34, 1.12, -1.0], 0.04, lin('#f2f2ee'), M(-1, 9, 1));
}

function fixtures(b) {
  // the stop-request pole in the aisle
  const [px, pz] = L.pole;
  b.cyl('y', 0.0, L.CEIL, px, pz, 0.018, C.chrome, M(-1, MAT.CHROME, 1), { seg: 14 });
  b.cyl('y', 0.0, 0.025, px, pz, 0.04, C.chrome, M(-1, MAT.CHROME, 0.7), { seg: 14 });
  b.cyl('y', L.CEIL - 0.04, L.CEIL, px, pz, 0.035, C.chrome, M(-1, MAT.CHROME, 0.9), { seg: 14 });
  // 整理券 dispenser beside the far centre door
  const { x, y } = L.ticket;
  b.box(x - 0.15, y - 0.13, 1.25, x + 0.15, y + 0.13, L.W, lin('#8d9396'), M(-1, MAT.PAINT, 0.9));
  b.box(x - 0.15, y + 0.13, 1.23, x + 0.15, y + 0.15, L.W, lin('#5d6164'), M(-1, MAT.PAINT, 0.9));
}

// ── moving parts ────────────────────────────────────────────────────────────
export function buildStrap() {
  const b = new Builder();
  const band = lin('#2c2622'), ring = lin('#f4f1e6');
  const m = M(-1, MAT.PAINT, 1);
  // band: a folded strip from the rail down to the ring
  const w = 0.014, len = 0.2;
  b.box(-w, -len, -0.004, w, 0.012, 0.004, band, m);
  // clamp around the rail
  b.cyl('x', -0.02, 0.02, 0.0, 0.0, 0.019, band, m, { seg: 10 });
  // white ring
  b.torus([0, -len - 0.07, 0], [1, 0, 0], [0, 1, 0], 0.07, 0.011, ring, M(-1, MAT.PAINT, 1), { seg: 20, side: 7 });
  return b;
}

export function buildFan() {
  const b = new Builder();
  const cream = lin('#efe8d6'), grey = lin('#c9c6bd');
  // guard rings and spokes
  b.torus([0, -0.2, 0], [1, 0, 0], [0, 0, 1], 0.33, 0.005, grey, M(-1, MAT.CHROME, 0.9), { seg: 32, side: 5 });
  b.torus([0, -0.13, 0], [1, 0, 0], [0, 0, 1], 0.24, 0.004, grey, M(-1, MAT.CHROME, 0.9), { seg: 28, side: 5 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const p0 = [c * 0.06, -0.2, s * 0.06], p1 = [c * 0.33, -0.2, s * 0.33];
    b.box(Math.min(p0[0], p1[0]) - 0.002, -0.203, Math.min(p0[2], p1[2]) - 0.002, Math.max(p0[0], p1[0]) + 0.002, -0.197, Math.max(p0[2], p1[2]) + 0.002, grey, M(-1, MAT.CHROME, 0.9));
  }
  b.cyl('y', -0.215, -0.19, 0, 0, 0.07, cream, M(-1, MAT.PAINT, 1), { seg: 18, caps: true });
  // blades
  const bl = new Builder();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const pts = [[0.05, -0.02], [0.3, -0.07], [0.31, 0.07], [0.05, 0.03]].map(([r, t]) => [ca * r - sa * t, -0.165 + t * 0.15, sa * r + ca * t]);
    bl.quad(pts[0], pts[1], pts[2], pts[3], [0, -1, 0], null, lin('#e8e2d0'), M(-1, MAT.PAINT + TWO, 1));
  }
  bl.cyl('y', -0.18, -0.15, 0, 0, 0.05, cream, M(-1, MAT.PAINT, 1), { seg: 14, caps: true });
  return { guard: b, blades: bl };
}

export function buildButton() {
  // a chunky bus-style request button: yellow housing, purple dome, lamp window above
  const b = new Builder();
  const y = lin('#f0c22e'), p = lin('#6b3fa3');
  b.box(-0.055, -0.07, -0.022, 0.055, 0.07, 0.0, y, M(-1, MAT.PAINT, 1));
  b.box(-0.05, -0.065, 0.0, 0.05, 0.065, 0.012, y, M(-1, MAT.PAINT, 1));
  // clamp onto the pole
  b.box(-0.03, -0.025, -0.045, 0.03, 0.025, -0.022, lin('#c9c6bd'), M(-1, MAT.CHROME, 1));
  // dome
  const dome = new Builder();
  dome.sphere([0, 0, 0.0], 0.034, p, M(-1, MAT.PAINT, 1), { seg: 18, ring: 10, sy: 1 });
  dome.cyl('z', -0.004, 0.006, 0, 0, 0.04, lin('#d5a520'), M(-1, MAT.PAINT, 1), { seg: 18 });
  return { housing: b, dome };
}

export function buildCan() {
  const b = new Builder();
  const r = 0.033, h = 0.122;
  b.cyl('x', -h / 2, h / 2, 0, 0, r, [1, 1, 1], M(-1, MAT.CHROME, 1), { seg: 20, uvScale: 1 / h });
  // ends
  b.cyl('x', -h / 2 - 0.001, -h / 2, 0, 0, r * 0.98, lin('#c0c2c4'), M(-1, MAT.CHROME, 1), { seg: 20, caps: true });
  b.cyl('x', h / 2, h / 2 + 0.001, 0, 0, r * 0.98, lin('#c0c2c4'), M(-1, MAT.CHROME, 1), { seg: 20, caps: true });
  return b;
}

export function buildUmbrella() {
  // a forgotten clear vinyl umbrella, hooked over the armrest pipe
  const b = new Builder();
  const vinyl = lin('#e9efee'), white = lin('#f6f6f2');
  const top = 0.86, tip = 0.02;
  // furled canopy: an eight-sided spindle
  const seg = 8;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
    const R = (y) => (y < 0.25 ? 0.006 + (y - tip) * 0.16 : 0.045 - (y - 0.25) * 0.045);
    const ys = [tip, 0.25, 0.7];
    for (let k = 0; k < ys.length - 1; k++) {
      const ya = ys[k], yb = ys[k + 1];
      const ra = Math.max(0.006, R(ya)) * (i % 2 ? 1 : 0.82), rb = Math.max(0.006, R(yb)) * (i % 2 ? 1 : 0.82);
      const p = (a, rr, yy) => [Math.cos(a) * rr, yy, Math.sin(a) * rr];
      const nn = [Math.cos((a0 + a1) / 2), 0.1, Math.sin((a0 + a1) / 2)];
      b.quad(p(a0, ra, ya), p(a1, ra, ya), p(a1, rb, yb), p(a0, rb, yb), nn, null, [...vinyl, 0.62], M(-1, MAT.GLOSS + TWO, 1));
    }
  }
  b.cyl('y', 0.0, tip, 0, 0, 0.005, white, M(-1, MAT.PAINT, 1));
  b.cyl('y', 0.7, top, 0, 0, 0.007, lin('#9da2a4'), M(-1, MAT.CHROME, 1));
  // J handle
  const hb = 0.045;
  for (let i = 0; i < 10; i++) {
    const a0 = (i / 10) * Math.PI, a1 = ((i + 1) / 10) * Math.PI;
    const p0 = [0, top + Math.sin(a0) * hb, -hb + Math.cos(a0) * hb], p1 = [0, top + Math.sin(a1) * hb, -hb + Math.cos(a1) * hb];
    b.box(-0.009, Math.min(p0[1], p1[1]) - 0.008, Math.min(p0[2], p1[2]) - 0.008, 0.009, Math.max(p0[1], p1[1]) + 0.008, Math.max(p0[2], p1[2]) + 0.008, white, M(-1, MAT.PAINT, 1));
  }
  return b;
}

export function buildBook() {
  const b = new Builder();
  const w = 0.106, d = 0.15, t = 0.016;
  const kraft = lin('#d9c7a2');
  b.box(-w / 2, 0, -d / 2, w / 2, t, d / 2, kraft, M(-1, MAT.PAINT, 0.95), { faces: 'xXzZy' });
  // pages edge
  b.box(-w / 2 + 0.003, 0.002, -d / 2 + 0.003, w / 2 - 0.001, t - 0.002, d / 2 - 0.003, lin('#efe7d4'), M(-1, MAT.DIFFUSE, 0.9), { faces: 'X' });
  // ribbon bookmark lying out of the top
  b.quad([0.01, t + 0.0005, d / 2 - 0.01], [0.016, t + 0.0005, d / 2 - 0.01], [0.03, 0.0005, d / 2 + 0.07], [0.024, 0.0005, d / 2 + 0.07], [0, 1, 0], null, lin('#9e2a2b'), M(-1, MAT.FABRIC + TWO, 1));
  return b;
}

// the person in the reflection: you, on the seat opposite your own reflection, headphones on
export function buildYou() {
  const b = new Builder();
  const [ex, , ez] = L.eye;
  const hair = lin('#141211'), skin = lin('#bf9a80'), knit = lin('#5c5650'), denim = lin('#38475b'), hp = lin('#2a2b2e');
  const m = (k = 9) => M(-1, k, 1);
  // torso
  b.box(ex - 0.2, 0.5, ez - 0.36, ex + 0.2, 0.98, ez - 0.12, knit, m());
  b.sphere([ex - 0.19, 0.95, ez - 0.24], 0.075, knit, m());
  b.sphere([ex + 0.19, 0.95, ez - 0.24], 0.075, knit, m());
  // arms resting on the thighs
  b.box(ex - 0.27, 0.6, ez - 0.3, ex - 0.18, 0.95, ez - 0.14, knit, m());
  b.box(ex + 0.18, 0.6, ez - 0.3, ex + 0.27, 0.95, ez - 0.14, knit, m());
  b.box(ex - 0.26, 0.56, ez - 0.18, ex - 0.12, 0.64, ez + 0.12, knit, m());
  b.box(ex + 0.12, 0.56, ez - 0.18, ex + 0.26, 0.64, ez + 0.12, knit, m());
  // legs
  b.box(ex - 0.18, 0.44, ez - 0.25, ex + 0.18, 0.58, ez + 0.28, denim, m());
  b.box(ex - 0.17, 0.05, ez + 0.18, ex - 0.03, 0.46, ez + 0.32, denim, m());
  b.box(ex + 0.03, 0.05, ez + 0.18, ex + 0.17, 0.46, ez + 0.32, denim, m());
  b.box(ex - 0.18, 0.0, ez + 0.16, ex - 0.02, 0.06, ez + 0.42, lin('#1c1c1e'), m());
  b.box(ex + 0.02, 0.0, ez + 0.16, ex + 0.18, 0.06, ez + 0.42, lin('#1c1c1e'), m());
  // neck and head, turned slightly toward the front of the car
  b.cyl('y', 0.96, 1.08, ex, ez - 0.17, 0.05, skin, m());
  b.sphere([ex, 1.17, ez - 0.12], 0.1, skin, m(), { seg: 16, ring: 10, sy: 1.15 });
  b.sphere([ex - 0.005, 1.2, ez - 0.15], 0.108, hair, m(), { seg: 16, ring: 10, sy: 1.1 });
  // over-ear headphones
  for (const sx of [-1, 1]) b.cyl('x', ex + sx * 0.1, ex + sx * 0.135, 1.16, ez - 0.13, 0.05, hp, m(MAT.PAINT), { seg: 16, caps: true });
  b.torus([ex, 1.18, ez - 0.13], [1, 0, 0], [0, 1, 0], 0.125, 0.012, hp, m(MAT.PAINT), { seg: 20, side: 6 });
  return b;
}

// window mask texture for sun / lamp light (R open, G sill, B top, A blind)
export function windowMaskData(farDoorOpen = 0) {
  const N = 1024;
  const d = new Uint8Array(N * 2 * 4);
  for (let row = 0; row < 2; row++) {
    const s = row === 0 ? -1 : 1;
    const ranges = [];
    L.windows.forEach(([a, c], wi) => ranges.push({ a: a + 0.03, c: c - 0.03, sill: L.SILL + 0.03, top: L.TOP - 0.06, blind: L.blinds[String(s)][wi] }));
    L.doors.forEach(([a, c], di) => {
      const mid = (a + c) / 2;
      if (s > 0 && di === 1 && farDoorOpen > 0) {
        const o = farDoorOpen * (c - a) / 2;
        ranges.push({ a: mid - o, c: mid + o, sill: 0.0, top: L.DOORH, blind: 0 });
        if (o < (c - a) / 2 - 0.08) {
          ranges.push({ a: a + 0.07 - o * 0, c: mid - o - 0.07, sill: 1.0, top: 1.72, blind: 0 });
          ranges.push({ a: mid + o + 0.07, c: c - 0.07, sill: 1.0, top: 1.72, blind: 0 });
        }
      } else {
        ranges.push({ a: a + 0.07, c: mid - 0.07, sill: 1.0, top: 1.72, blind: 0 });
        ranges.push({ a: mid + 0.07, c: c - 0.07, sill: 1.0, top: 1.72, blind: 0 });
      }
    });
    for (let i = 0; i < N; i++) {
      const x = L.WX0 + ((i + 0.5) / N) * (L.WX1 - L.WX0);
      let best = null, bestD = 1e9, open = 0;
      for (const r of ranges) {
        if (x >= r.a && x <= r.c) { best = r; open = 1; break; }
        const dd = Math.min(Math.abs(x - r.a), Math.abs(x - r.c));
        if (dd < bestD) { bestD = dd; best = r; }
      }
      const o = (row * N + i) * 4;
      d[o] = open ? 255 : 0;
      d[o + 1] = Math.round((best.sill / 2.5) * 255);
      d[o + 2] = Math.round((best.top / 2.5) * 255);
      d[o + 3] = Math.round(best.blind * 255);
    }
  }
  return d;
}
