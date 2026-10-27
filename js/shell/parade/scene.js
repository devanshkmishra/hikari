// Camera, the parade route (the Hikari Line rails, curving through the stars),
// and the pre-rendered sky and route layers.

import { canvas, rng, hexA } from './kit.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function makeCamera(w, h) {
  const aspect = w / h;
  const portrait = aspect < 0.85;
  const horizon = h * (portrait ? 0.3 : 0.33);
  const f = Math.min(h * 1.15, w * (portrait ? 2.0 : 1.4));
  const zFront = 5.6;
  const frontY = h * (portrait ? 0.7 : 0.735);
  const camH = ((frontY - horizon) * zFront) / f;
  const xs = clamp(aspect / 1.6, 0.42, 1.25);
  const laneScale = clamp(xs * 1.1, 0.72, 1.15);
  const floatScale = clamp(aspect / 1.35, 0.6, 1);
  return { w, h, cx: w / 2, horizon, f, camH, xs, laneScale, floatScale, aspect, portrait };
}

export function project(cam, x, yUp, z) {
  const k = cam.f / z;
  return { sx: cam.cx + x * k, sy: cam.horizon + (cam.camH - yUp) * k, k };
}

// ---------------------------------------------------------------------------- route
// Control points (x, z, yUp). The first four lift the rails up into the sky (beyond the
// parade's far end); the parade itself walks from index 4 onward.
const CTRL = [
  [-160, 600, 150], [-90, 420, 80], [-40, 280, 34], [-14, 170, 10],
  [-1.0, 95, 0], [2.5, 55, 0], [6.5, 30, 0], [7.6, 17, 0], [5.6, 10.5, 0], [2.4, 7.0, 0],
  [-0.6, 5.7, 0], [-3.6, 5.5, 0], [-7.5, 5.7, 0], [-12, 6.2, 0], [-18, 7.0, 0],
];
const PARADE_FROM = 4;
const PARADE_TO = CTRL.length - 2; // exits off-screen left

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function sampleSpline(pts, from, to, per = 60) {
  const out = [];
  for (let i = from; i < to; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < per; s++) {
      const t = s / per;
      out.push([catmull(p0[0], p1[0], p2[0], p3[0], t), catmull(p0[1], p1[1], p2[1], p3[1], t), catmull(p0[2], p1[2], p2[2], p3[2], t)]);
    }
  }
  const last = pts[to];
  out.push([last[0], last[1], last[2]]);
  return out;
}

export function makeRoute(cam) {
  const pts = CTRL.map(([x, z, y]) => [x * cam.xs, z, y]);
  const dense = sampleSpline(pts, PARADE_FROM, PARADE_TO, 80);
  // time-weighted parameter: things far away cover ground faster (it reads as steady motion)
  const tau = [0];
  const len = [0];
  for (let i = 1; i < dense.length; i++) {
    const a = dense[i - 1], b = dense[i];
    const ds = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const zm = (a[1] + b[1]) / 2;
    const v = Math.pow(zm / 5.6, 0.72);
    tau.push(tau[i - 1] + ds / v);
    len.push(len[i - 1] + ds);
  }
  const total = tau[tau.length - 1];
  const N = 1024;
  const X = new Float32Array(N + 1), Z = new Float32Array(N + 1), TX = new Float32Array(N + 1), TZ = new Float32Array(N + 1), L = new Float32Array(N + 1);
  let j = 0;
  for (let i = 0; i <= N; i++) {
    const target = (i / N) * total;
    while (j < tau.length - 2 && tau[j + 1] < target) j++;
    const u = (target - tau[j]) / Math.max(1e-6, tau[j + 1] - tau[j]);
    const a = dense[j], b = dense[j + 1];
    X[i] = a[0] + (b[0] - a[0]) * u;
    Z[i] = a[1] + (b[1] - a[1]) * u;
    L[i] = len[j] + (len[j + 1] - len[j]) * u;
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const m = Math.hypot(dx, dz) || 1;
    TX[i] = dx / m;
    TZ[i] = dz / m;
  }
  const at = (p, out = {}) => {
    const q = clamp(p, 0, 1) * N;
    const i = Math.min(N - 1, Math.floor(q));
    const u = q - i;
    out.x = X[i] + (X[i + 1] - X[i]) * u;
    out.z = Z[i] + (Z[i + 1] - Z[i]) * u;
    out.tx = TX[i] + (TX[i + 1] - TX[i]) * u;
    out.tz = TZ[i] + (TZ[i + 1] - TZ[i]) * u;
    out.len = L[i] + (L[i + 1] - L[i]) * u;
    return out;
  };
  // p at a given world arc length
  const pAtLen = (s) => {
    let lo = 0, hi = N;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (L[m] <= s) lo = m; else hi = m;
    }
    return (lo + (s - L[lo]) / Math.max(1e-6, L[hi] - L[lo])) / N;
  };
  // metres per unit p around a given p (for spacing)
  const mpp = (p) => {
    const a = at(p - 0.01), b = at(p + 0.01);
    return (b.len - a.len) / 0.02;
  };
  const railPts = sampleSpline(pts, 0, pts.length - 1, 70);
  return { at, pAtLen, mpp, totalLen: L[N], railPts };
}

// ---------------------------------------------------------------------------- sky
export function renderSky(cam, margin, dpr) {
  const W = cam.w, H = cam.h + margin;
  const c = canvas(W * dpr, H * dpr);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const hz = margin + cam.horizon;
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#02030b');
  bg.addColorStop(clamp(margin / H, 0, 1), '#070a20');
  bg.addColorStop(clamp((margin + cam.h * 0.18) / H, 0, 1), '#0f1238');
  bg.addColorStop(clamp(hz / H, 0, 1), '#2a1c58');
  bg.addColorStop(clamp((hz + cam.h * 0.18) / H, 0, 1), '#1d1648');
  bg.addColorStop(1, '#0a0a1d');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  const r = rng(1986);
  const D = Math.max(W, cam.h);

  // milky way: a band rising to the upper right
  const ax = -0.1 * W, ay = hz + cam.h * 0.45, bx = 1.1 * W, by = margin - cam.h * 0.05;
  const bandAt = (t) => [ax + (bx - ax) * t, ay + (by - ay) * t];
  const nx = -(by - ay), ny = bx - ax;
  const nm = Math.hypot(nx, ny);
  const NX = nx / nm, NY = ny / nm;
  const bandW = D * 0.13;
  const neb = ['#8f74ff', '#5f8cff', '#ff6fb0', '#7fd0ff', '#b48cff'];
  for (let i = 0; i < 46; i++) {
    const t = r();
    const [px, py] = bandAt(t);
    const off = (r() - 0.5) * bandW * 1.2;
    const x = px + NX * off, y = py + NY * off;
    const rad = D * (0.05 + r() * 0.12);
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const col = neb[Math.floor(r() * neb.length)];
    gr.addColorStop(0, hexA(col, 0.05 + r() * 0.05));
    gr.addColorStop(1, hexA(col, 0));
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 14; i++) {
    const [px, py] = bandAt(0.1 + r() * 0.8);
    const off = (r() - 0.5) * bandW * 0.3;
    const x = px + NX * off, y = py + NY * off;
    const rad = D * (0.02 + r() * 0.05);
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(4,4,16,0.28)');
    gr.addColorStop(1, 'rgba(4,4,16,0)');
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const gauss = () => (r() + r() + r() + r() - 2) / 2;
  const dots = Math.floor((W * H) / 520);
  for (let i = 0; i < dots; i++) {
    const [px, py] = bandAt(r());
    const off = gauss() * bandW;
    const x = px + NX * off, y = py + NY * off;
    const a = 0.15 + r() * 0.5;
    g.fillStyle = `rgba(${220 + r() * 35},${215 + r() * 40},255,${a})`;
    const s = 0.4 + r() * 0.7;
    g.fillRect(x, y, s, s);
  }

  // horizon glow (the parade's own light, reflected in the haze)
  g.save();
  g.translate(W * 0.58, hz);
  g.scale(1, 0.32);
  const hg = g.createRadialGradient(0, 0, 0, 0, 0, W * 0.75);
  hg.addColorStop(0, 'rgba(255,130,170,0.2)');
  hg.addColorStop(0.4, 'rgba(190,110,220,0.08)');
  hg.addColorStop(1, 'rgba(120,90,220,0)');
  g.fillStyle = hg;
  g.fillRect(-W, -W, W * 2, W * 2);
  g.restore();

  // field stars
  const n = Math.floor((W * H) / 900);
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H;
    const below = y > hz ? 0.55 : 1;
    const b = Math.pow(r(), 2.4);
    const a = (0.2 + b * 0.8) * below;
    const tint = r();
    g.fillStyle = tint < 0.15 ? `rgba(255,220,190,${a})` : tint < 0.35 ? `rgba(190,210,255,${a})` : `rgba(245,245,255,${a})`;
    const s = 0.45 + b * 1.1;
    g.beginPath();
    g.arc(x, y, s * 0.6, 0, Math.PI * 2);
    g.fill();
  }
  // bright stars with spikes
  const bright = [];
  for (let i = 0; i < 46; i++) {
    const x = r() * W, y = r() * (hz + cam.h * 0.05);
    const s = 1.2 + r() * 2.2;
    bright.push([x, y, s]);
    const gr = g.createRadialGradient(x, y, 0, x, y, s * 5);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)');
    gr.addColorStop(0.2, 'rgba(200,210,255,0.35)');
    gr.addColorStop(1, 'rgba(200,210,255,0)');
    g.fillStyle = gr;
    g.fillRect(x - s * 5, y - s * 5, s * 10, s * 10);
    g.strokeStyle = 'rgba(220,225,255,0.35)';
    g.lineWidth = 0.6;
    g.beginPath();
    g.moveTo(x - s * 6, y);
    g.lineTo(x + s * 6, y);
    g.moveTo(x, y - s * 6);
    g.lineTo(x, y + s * 6);
    g.stroke();
  }
  // a thin moon
  {
    const mx = W * 0.84, my = margin + cam.h * 0.13, mr = Math.max(9, cam.h * 0.026);
    const mg = g.createRadialGradient(mx, my, mr, mx, my, mr * 6);
    mg.addColorStop(0, 'rgba(255,240,210,0.16)');
    mg.addColorStop(1, 'rgba(255,240,210,0)');
    g.fillStyle = mg;
    g.fillRect(mx - mr * 6, my - mr * 6, mr * 12, mr * 12);
    g.save();
    g.beginPath();
    g.arc(mx, my, mr, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = '#fff3d8';
    g.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
    g.fillStyle = '#0d1036';
    g.beginPath();
    g.arc(mx - mr * 0.42, my - mr * 0.16, mr * 0.95, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  // sea of clouds far below the rails
  for (let i = 0; i < 34; i++) {
    const x = r() * W * 1.2 - W * 0.1;
    const y = margin + cam.h * (0.83 + r() * 0.22);
    const rw = D * (0.12 + r() * 0.2), rh = rw * (0.22 + r() * 0.12);
    g.save();
    g.translate(x, y);
    g.scale(1, rh / rw);
    const cg = g.createRadialGradient(0, -rw * 0.2, 0, 0, 0, rw);
    cg.addColorStop(0, 'rgba(176,156,240,0.12)');
    cg.addColorStop(0.5, 'rgba(120,100,200,0.06)');
    cg.addColorStop(1, 'rgba(90,70,170,0)');
    g.fillStyle = cg;
    g.fillRect(-rw, -rw, rw * 2, rw * 2);
    g.restore();
  }
  return { canvas: c, bright };
}

// ---------------------------------------------------------------------------- route layer
export function renderRouteLayer(cam, route, lanterns, dpr) {
  const W = cam.w, H = cam.h;
  const c = canvas(W * dpr, H * dpr);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const pts = route.railPts;
  const P = pts.map(([x, z, y]) => ({ x, z, y }));
  // tangents + perpendiculars (xz)
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    const dx = b.x - a.x, dz = b.z - a.z;
    const m = Math.hypot(dx, dz) || 1;
    P[i].nx = -dz / m;
    P[i].nz = dx / m;
  }
  const proj = (x, y, z) => project(cam, x, y, z);
  const fadeZ = (z, y) => clamp(1 - (z - 40) / 260, 0, 1) * clamp(1 - y / 140, 0, 1);

  // the glowing ribbon (lantern light on the road)
  const passes = [[3.4, 0.03], [2.5, 0.045], [1.5, 0.055]];
  for (const [hw, a] of passes) {
    const w2 = hw * cam.laneScale;
    for (let i = 0; i < P.length - 1; i++) {
      const p = P[i], q = P[i + 1];
      if (p.z < 1 || q.z < 1) continue;
      const A = proj(p.x + p.nx * w2, p.y, p.z + p.nz * w2);
      const B = proj(p.x - p.nx * w2, p.y, p.z - p.nz * w2);
      const Cc = proj(q.x - q.nx * w2, q.y, q.z - q.nz * w2);
      const Dd = proj(q.x + q.nx * w2, q.y, q.z + q.nz * w2);
      const al = a * fadeZ(p.z, p.y);
      if (al <= 0.002) continue;
      g.fillStyle = `rgba(255,186,150,${al})`;
      g.beginPath();
      g.moveTo(A.sx, A.sy);
      g.lineTo(B.sx, B.sy);
      g.lineTo(Cc.sx, Cc.sy);
      g.lineTo(Dd.sx, Dd.sy);
      g.closePath();
      g.fill();
    }
  }
  // sleepers
  let acc = 0;
  const gauge = 0.535;
  for (let i = 1; i < P.length; i++) {
    const p = P[i - 1], q = P[i];
    acc += Math.hypot(q.x - p.x, q.z - p.z, q.y - p.y);
    if (acc < 0.62) continue;
    acc = 0;
    if (q.z < 1) continue;
    const half = 1.0;
    const tx = q.nz, tz = -q.nx;
    const dep = 0.11;
    const corners = [
      proj(q.x + q.nx * half + tx * dep, q.y, q.z + q.nz * half + tz * dep),
      proj(q.x - q.nx * half + tx * dep, q.y, q.z - q.nz * half + tz * dep),
      proj(q.x - q.nx * half - tx * dep, q.y, q.z - q.nz * half - tz * dep),
      proj(q.x + q.nx * half - tx * dep, q.y, q.z + q.nz * half - tz * dep),
    ];
    const span = Math.hypot(corners[0].sx - corners[1].sx, corners[0].sy - corners[1].sy);
    if (span < 2) continue;
    const al = fadeZ(q.z, q.y);
    g.fillStyle = `rgba(52,34,70,${0.75 * al})`;
    g.beginPath();
    corners.forEach((cc, k) => (k ? g.lineTo(cc.sx, cc.sy) : g.moveTo(cc.sx, cc.sy)));
    g.closePath();
    g.fill();
    g.strokeStyle = `rgba(255,200,150,${0.22 * al})`;
    g.lineWidth = Math.max(0.4, 0.015 * corners[0].k);
    g.beginPath();
    g.moveTo(corners[0].sx, corners[0].sy);
    g.lineTo(corners[1].sx, corners[1].sy);
    g.stroke();
  }
  // rails
  g.lineCap = 'round';
  for (const side of [1, -1]) {
    for (const [mul, col] of [[3.4, 'rgba(170,160,255,0.11)'], [1, 'rgba(236,232,255,0.85)']]) {
      for (let i = 0; i < P.length - 1; i++) {
        const p = P[i], q = P[i + 1];
        if (p.z < 1) continue;
        const A = proj(p.x + p.nx * gauge * side, p.y, p.z + p.nz * gauge * side);
        const B = proj(q.x + q.nx * gauge * side, q.y, q.z + q.nz * gauge * side);
        const al = fadeZ(p.z, p.y);
        if (al <= 0.01) continue;
        g.globalAlpha = al;
        g.strokeStyle = col;
        g.lineWidth = Math.max(0.5, 0.024 * A.k * mul);
        g.beginPath();
        g.moveTo(A.sx, A.sy);
        g.lineTo(B.sx, B.sy);
        g.stroke();
      }
    }
  }
  g.globalAlpha = 1;
  // lantern strings
  for (const side of lanterns.sides) {
    for (let i = 0; i < side.length - 1; i++) {
      const a = side[i], b = side[i + 1];
      if (a.gap || b.gap) continue;
      const A = proj(a.x, a.y + 0.12, a.z), B = proj(b.x, b.y + 0.12, b.z);
      const M = proj((a.x + b.x) / 2, (a.y + b.y) / 2 - 0.25, (a.z + b.z) / 2);
      g.strokeStyle = 'rgba(24,16,34,0.7)';
      g.lineWidth = Math.max(0.5, 0.012 * M.k);
      g.beginPath();
      g.moveTo(A.sx, A.sy);
      g.quadraticCurveTo(2 * M.sx - (A.sx + B.sx) / 2, 2 * M.sy - (A.sy + B.sy) / 2, B.sx, B.sy);
      g.stroke();
    }
  }
  return c;
}

// lantern anchors along both sides of the route
export function makeLanterns(cam, route) {
  const sides = [];
  const step = 3.4;
  const off = 2.75 * cam.laneScale;
  const height = 2.55;
  for (const s of [1, -1]) {
    const list = [];
    let k = 0;
    for (let d = 1.2; d < route.totalLen - 2; d += step, k++) {
      const p = route.pAtLen(d);
      const R = route.at(p);
      const nx = -R.tz, nz = R.tx;
      const x = R.x + nx * off * s, z = R.z + nz * off * s;
      const gap = z < 4.4 || z > 80;
      list.push({ x, y: height, z, p, red: k % 3 !== 1, gap, side: s, ph: Math.random() * 6.28 });
    }
    sides.push(list);
  }
  const all = sides.flat().filter((l) => !l.gap);
  return { sides, all };
}
