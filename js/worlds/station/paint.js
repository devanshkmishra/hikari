// 夏ヶ原 — the painted background. Everything here is drawn once (and again on resize) into
// textures the WebGL compositor lights and moves:
//   far   — the hill ranges (RGBA)
//   scene — everything nearer: fields, line, platform, shelter… (RGBA)
//   aux   — R: depth (510/Z, for parallax)  G: rice-field mask (wind)  B: grass/foliage sway
//   e1    — light masks: R vending machine · G platform lamps + name board · B waiting-room tube
//   e2    — windows of houses: R kitchen lights · G a television · B late lights
// Painted under flat overcast light; the shader turns the day toward dusk.

import { G, project, trackXAt, rng, fbm1, vnoise1, clamp, lerp } from './geom.js';

const TAU = Math.PI * 2;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  return c;
}

// small 2D value-noise texture used as grime / paper
function noiseTex(size, seed, cells, oct = 4, contrast = 1) {
  const c = canvas(size, size);
  const x = c.getContext('2d');
  const img = x.createImageData(size, size);
  const R = rng(seed);
  const grids = [];
  for (let o = 0; o < oct; o++) {
    const n = cells * (1 << o);
    const g = new Float32Array(n * n);
    for (let i = 0; i < g.length; i++) g[i] = R();
    grids.push([n, g]);
  }
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let v = 0, a = 0.5, tot = 0;
      for (let o = 0; o < oct; o++) {
        const [n, g] = grids[o];
        const fx = (i / size) * n, fy = (j / size) * n;
        const ix = Math.floor(fx), iy = Math.floor(fy);
        const tx = fx - ix, ty = fy - iy;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const g00 = g[(iy % n) * n + (ix % n)], g10 = g[(iy % n) * n + ((ix + 1) % n)];
        const g01 = g[((iy + 1) % n) * n + (ix % n)], g11 = g[((iy + 1) % n) * n + ((ix + 1) % n)];
        v += a * ((g00 * (1 - sx) + g10 * sx) * (1 - sy) + (g01 * (1 - sx) + g11 * sx) * sy);
        tot += a; a *= 0.5;
      }
      v = clamp(0.5 + (v / tot - 0.5) * contrast);
      const k = (j * size + i) * 4;
      const b = Math.round(v * 255);
      img.data[k] = b; img.data[k + 1] = b; img.data[k + 2] = b; img.data[k + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  return c;
}

// draw text in a metre-scaled texture without sub-pixel font sizes
function mtext(c, s, x, y, size, font, align = 'center', weight = '400') {
  const t = c.getTransform();
  const sc = Math.hypot(t.a, t.b);
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.font = `${weight} ${size * sc}px ${font}`;
  c.textAlign = align;
  c.textBaseline = 'alphabetic';
  c.fillText(s, t.a * x + t.c * y + t.e, t.b * x + t.d * y + t.f);
  c.restore();
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgbs = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

export async function paintWorld(cam, { scale, margin, tick = () => Promise.resolve() }) {
  const W = cam.W, H = cam.H, m = margin;
  const TW = W + 2 * m, TH = H + 2 * m;
  const f = cam.f, vpX = cam.vpX, vpY = cam.vpY;
  const p = (X, Y, Z) => project(cam, X, Y, Z);
  const P = (arr) => arr.map((q) => p(q[0], q[1], q[2]));

  function layer(s, opaque) {
    const c = canvas(TW * s, TH * s);
    const x = c.getContext('2d');
    if (opaque) { x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height); }
    x.setTransform(s, 0, 0, s, m * s, m * s);
    x.lineJoin = 'round'; x.lineCap = 'round';
    return [c, x];
  }
  const [farC, F] = layer(scale, false);
  const [sceneC, S] = layer(scale, false);
  const hs = Math.max(0.5, scale * 0.5);
  const [auxC, A] = layer(hs, true);
  const [e1C, E1] = layer(hs, true);
  const [e2C, E2] = layer(hs, true);

  const grime = noiseTex(256, 7, 6, 5, 1.6);
  const grain = noiseTex(128, 19, 32, 2, 2.2);
  const grimePat = S.createPattern(grime, 'repeat');
  const grainPat = S.createPattern(grain, 'repeat');

  // ── helpers ───────────────────────────────────────────────
  function path(c, pts) {
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath();
  }
  function fill(c, pts, style) { path(c, pts); c.fillStyle = style; c.fill(); }
  const DIL = 7;
  const dz = (Z) => Math.min(255, Math.round(510 / Math.max(Z, 2)));
  function dFlat(pts, Z, g = 0, b = 0, dil = DIL) {
    const col = `rgb(${dz(Z)},${g},${b})`;
    path(A, pts); A.fillStyle = col; A.fill();
    if (dil) { A.lineWidth = dil * 2; A.strokeStyle = col; A.stroke(); }
  }
  function dGround(pts, Yp, g = 0, b = 0) {
    const k = f * (cam.ey - Yp) / 2;
    const gr = A.createLinearGradient(0, vpY, 0, vpY + k);
    gr.addColorStop(0, `rgb(0,${g},${b})`);
    gr.addColorStop(1, `rgb(255,${g},${b})`);
    path(A, pts); A.fillStyle = gr; A.fill();
  }
  function dWallX(pts, Xw, g = 0, b = 0) {
    const k = f * (Xw - cam.ex) / 2;
    const gr = A.createLinearGradient(vpX, 0, vpX + k, 0);
    gr.addColorStop(0, `rgb(0,${g},${b})`);
    gr.addColorStop(1, `rgb(255,${g},${b})`);
    path(A, pts); A.fillStyle = gr; A.fill();
  }
  function occ(pts) {
    path(E1, pts); E1.fillStyle = '#000'; E1.fill();
    path(E2, pts); E2.fillStyle = '#000'; E2.fill();
  }
  function emit(E, chan, pts, a) {
    const col = chan === 0 ? `rgba(255,0,0,${a})` : chan === 1 ? `rgba(0,255,0,${a})` : `rgba(0,0,255,${a})`;
    E.globalCompositeOperation = 'lighter';
    path(E, pts); E.fillStyle = col; E.fill();
    E.globalCompositeOperation = 'source-over';
  }
  function glow(E, chan, x, y, r, a, sy = 1) {
    const g = E.createRadialGradient(x, y, 0, x, y, r);
    const c = chan === 0 ? '255,0,0' : chan === 1 ? '0,255,0' : '0,0,255';
    g.addColorStop(0, `rgba(${c},${a})`);
    g.addColorStop(0.35, `rgba(${c},${a * 0.45})`);
    g.addColorStop(1, `rgba(${c},0)`);
    E.save();
    E.globalCompositeOperation = 'lighter';
    E.translate(x, y); E.scale(1, sy); E.translate(-x, -y);
    E.fillStyle = g;
    E.fillRect(x - r, y - r, r * 2, r * 2);
    E.restore();
  }
  // paint a texture (drawn in metres) onto a plane of constant Z
  function texZ(img, X0, X1, Y0, Y1, Z, c = S) {
    const a = p(X0, Y1, Z), b = p(X1, Y0, Z);
    c.drawImage(img, a[0], a[1], b[0] - a[0], b[1] - a[1]);
  }
  // paint a texture onto a vertical plane of constant X (receding), in vertical strips
  function texX(img, X, Z0, Z1, Y0a, Y1a, Y0b = Y0a, Y1b = Y1a, n = 24, c = S) {
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, tm = (t0 + t1) / 2;
      const za = lerp(Z0, Z1, t0), zb = lerp(Z0, Z1, t1), zm = lerp(Z0, Z1, tm);
      const xa = p(X, 0, za)[0], xb = p(X, 0, zb)[0];
      const yt = p(X, lerp(Y1a, Y1b, tm), zm)[1], yb = p(X, lerp(Y0a, Y0b, tm), zm)[1];
      const sx = img.width * t0, sw = img.width / n;
      const x0 = Math.min(xa, xb), w = Math.abs(xb - xa) + 0.6;
      c.drawImage(img, sx, 0, sw, img.height, x0 - 0.3, yt, w, yb - yt);
    }
  }
  function tex(wm, hm, ppm, draw) {
    const c = canvas(wm * ppm, hm * ppm);
    const x = c.getContext('2d');
    x.scale(c.width / wm, c.height / hm);
    x.lineJoin = 'round'; x.lineCap = 'round';
    draw(x, wm, hm);
    return c;
  }
  // a batch of short strokes, bucketed by colour (fast)
  function strokes(c, list, width) {
    const buckets = new Map();
    for (const s of list) {
      let b = buckets.get(s.c);
      if (!b) { b = []; buckets.set(s.c, b); }
      b.push(s);
    }
    c.lineWidth = width;
    for (const [col, arr] of buckets) {
      c.strokeStyle = col;
      c.beginPath();
      for (const s of arr) { c.moveTo(s.x0, s.y0); c.lineTo(s.x1, s.y1); }
      c.stroke();
    }
  }
  function dabs(c, list) {
    const buckets = new Map();
    for (const s of list) {
      let b = buckets.get(s.c);
      if (!b) { b = []; buckets.set(s.c, b); }
      b.push(s);
    }
    for (const [col, arr] of buckets) {
      c.fillStyle = col;
      c.beginPath();
      for (const s of arr) { c.moveTo(s.x + s.r, s.y); c.ellipse(s.x, s.y, s.r, s.r * (s.k || 0.8), 0, 0, TAU); }
      c.fill();
    }
  }
  const grimeOver = (c, pts, a, op = 'multiply', ox = 0) => {
    c.save();
    path(c, pts); c.clip();
    c.globalCompositeOperation = op; c.globalAlpha = a;
    const mtx = new DOMMatrix().translate(ox, 0).scale(1.6);
    grimePat.setTransform(mtx);
    c.fillStyle = grimePat;
    c.fillRect(-m, -m, TW, TH);
    c.restore();
  };

  const ground = (Yp, Zmin = 0.3) => [[-m - 10, Math.min(p(0, Yp, 4000)[1], vpY + 0.6)], [W + m + 10, vpY + 0.6], [W + m + 10, H + m], [-m - 10, H + m]];

  // ── FAR: the hills ─────────────────────────────────────────
  // Hills are described by azimuth a = X/Z, so the world stays the same at any aspect.
  const az = (x) => (x - vpX) / f;
  const R0 = rng(4);
  function ridgeY(Z, h) { return vpY - f * (h - (cam.ey - G.fieldY)) / Z; }
  function range({ Z, hfn, base, top, dab, dabSize, seed, cedar = 0, haze = 0.0, edgeDab = true }) {
    const R = rng(seed);
    const step = 3;
    const pts = [];
    for (let x = -m - 4; x <= W + m + 4; x += step) pts.push([x, ridgeY(Z, hfn(az(x)))]);
    const poly = [...pts, [W + m + 4, vpY + 12], [-m - 4, vpY + 12]];
    const minY = Math.min(...pts.map((q) => q[1]));
    const gr = F.createLinearGradient(0, minY, 0, vpY + 10);
    gr.addColorStop(0, rgbs(top));
    gr.addColorStop(1, rgbs(base));
    fill(F, poly, gr);
    if (!dab) return pts;
    // crowns of trees along and inside the silhouette
    const r = Math.max(0.8, f * dabSize / Z);
    const list = [];
    const cols = [];
    for (let k = 0; k < 7; k++) cols.push(rgbs(mix(dab[0], dab[1], k / 6)));
    F.save();
    path(F, poly); F.clip();
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      const depth = vpY + 8 - y;
      const n = Math.max(1, Math.round((depth / r) * step / r * 0.9));
      for (let k = 0; k < n; k++) {
        const yy = y + R() * depth;
        const tt = (yy - y) / Math.max(1, depth);
        const ci = clamp(Math.round((1 - tt) * 4 + R() * 3 - 0.5), 0, 6);
        list.push({ x: x + (R() - 0.5) * step * 2, y: yy, r: r * (0.6 + R() * 0.7), c: cols[ci] });
      }
    }
    dabs(F, list);
    F.restore();
    if (edgeDab) {
      const edge = [];
      for (let i = 0; i < pts.length; i++) {
        const [x, y] = pts[i];
        if (R() < 0.75) edge.push({ x: x + (R() - 0.5) * step, y: y + r * 0.3, r: r * (0.7 + R() * 0.6), c: cols[4 + ((R() * 3) | 0)] });
      }
      dabs(F, edge);
    }
    if (cedar) {
      // plantation patches of cedar: dark, pointed
      F.save(); path(F, poly); F.clip();
      const cr = Math.max(1, f * 5 / Z);
      F.fillStyle = rgbs(shade(dab[0], 0.85));
      F.beginPath();
      for (let k = 0; k < cedar; k++) {
        const cx0 = R() * (W + 2 * m) - m;
        const ix = clamp(Math.round((cx0 + m) / step), 0, pts.length - 1);
        const yr = pts[ix][1];
        const patchW = cr * (6 + R() * 14);
        for (let q = 0; q < patchW / cr * 2.5; q++) {
          const xx = cx0 + (R() - 0.5) * patchW;
          const jx = clamp(Math.round((xx + m) / step), 0, pts.length - 1);
          const yy = pts[jx][1] + cr * (0.3 + R() * 4);
          const hh = cr * (1.6 + R() * 1.2);
          F.moveTo(xx - cr * 0.55, yy + hh * 0.5); F.lineTo(xx, yy - hh * 0.5); F.lineTo(xx + cr * 0.55, yy + hh * 0.5);
        }
      }
      F.fill();
      F.restore();
    }
    if (haze > 0) {
      F.save(); path(F, poly); F.clip();
      const hg = F.createLinearGradient(0, minY, 0, vpY + 6);
      hg.addColorStop(0, 'rgba(222,224,218,0)');
      hg.addColorStop(1, `rgba(222,224,218,${haze})`);
      F.fillStyle = hg; F.fillRect(-m, minY - 5, TW, vpY + 12 - minY);
      F.restore();
    }
    return pts;
  }

  const bump = (a, c, w) => Math.exp(-((a - c) * (a - c)) / (w * w));
  // farthest range: pale, almost sky
  range({ Z: 5200, seed: 3, base: hex('#c4cac8'), top: hex('#b7bfc1'),
    hfn: (a) => 60 + 150 * fbm1(a * 3.1 + 7, 3, 4) + 140 * bump(a, 0.55, 0.35) + 90 * bump(a, -0.9, 0.3) });
  // middle range
  range({ Z: 1900, seed: 5, base: hex('#a7b2ab'), top: hex('#8d9b95'), dab: [hex('#7f8f88'), hex('#a3b0a8')], dabSize: 9, haze: 0.35,
    hfn: (a) => 70 + 170 * fbm1(a * 4.3 + 2, 5, 5) + 120 * bump(a, 0.75, 0.32) + 110 * bump(a, -0.55, 0.28) - 95 * bump(a, 0.05, 0.14) });
  // near hills, forested: big one on the left, lower one on the right behind the houses
  const nearHill = (a) => {
    const left = 40 + 170 * bump(a, -0.62, 0.42) * (0.75 + 0.5 * fbm1(a * 9 + 1, 9, 4)) + 30 * fbm1(a * 23, 2, 3);
    const right = 25 + 95 * bump(a, 0.95, 0.38) * (0.8 + 0.4 * fbm1(a * 11 + 4, 4, 4)) + 18 * fbm1(a * 27, 6, 3);
    const valley = 26 * bump(a, -0.02, 0.2);
    return Math.max(left, right) - valley;
  };
  const nearPts = range({ Z: 620, seed: 8, base: hex('#6b7d6c'), top: hex('#4e6352'), dab: [hex('#3a4d3e'), hex('#7b8f74')], dabSize: 7, cedar: 22, haze: 0.42, hfn: nearHill });

  // transmission tower on the left hill
  {
    const a = -0.5;
    const Zt = 600;
    const xt = vpX + f * a;
    const yb = ridgeY(Zt, nearHill(a)) + 2;
    const ht = f * 46 / Zt, wb = f * 9 / Zt;
    F.strokeStyle = 'rgba(92,98,98,0.85)';
    F.lineWidth = Math.max(0.6, f * 0.25 / Zt);
    F.beginPath();
    F.moveTo(xt - wb / 2, yb); F.lineTo(xt - wb * 0.1, yb - ht); F.lineTo(xt + wb * 0.1, yb - ht); F.lineTo(xt + wb / 2, yb);
    for (let k = 1; k < 7; k++) {
      const t0 = (k - 1) / 7, t1 = k / 7;
      const y0 = yb - ht * t0, y1 = yb - ht * t1;
      const w0 = lerp(wb / 2, wb * 0.1, t0), w1 = lerp(wb / 2, wb * 0.1, t1);
      F.moveTo(xt - w0, y0); F.lineTo(xt + w1, y1); F.moveTo(xt + w0, y0); F.lineTo(xt - w1, y1);
    }
    // crossarms
    for (const [tt, ww] of [[0.72, 0.55], [0.84, 0.48], [0.95, 0.36]]) {
      const y = yb - ht * tt; F.moveTo(xt - wb * ww, y); F.lineTo(xt + wb * ww, y);
    }
    F.stroke();
    // lines away over the hill
    F.strokeStyle = 'rgba(80,86,88,0.5)';
    F.lineWidth = 0.6;
    for (const [tt, ww] of [[0.72, 0.55], [0.84, 0.48]]) {
      const y = yb - ht * tt;
      F.beginPath(); F.moveTo(xt - wb * ww, y); F.quadraticCurveTo(xt - f * 0.12, y + 8, xt - f * 0.26, ridgeY(900, nearHill(a - 0.26)) - f * 30 / 900); F.stroke();
      F.beginPath(); F.moveTo(xt + wb * ww, y); F.quadraticCurveTo(xt + f * 0.08, y + 6, xt + f * 0.17, ridgeY(800, 40) - 4); F.stroke();
    }
  }
  // valley mist
  {
    const g = F.createLinearGradient(0, vpY - f * 0.05, 0, vpY + 10);
    g.addColorStop(0, 'rgba(226,228,222,0)');
    g.addColorStop(0.7, 'rgba(226,228,222,0.35)');
    g.addColorStop(1, 'rgba(226,228,222,0.55)');
    F.save();
    F.globalCompositeOperation = 'source-atop';
    F.fillStyle = g; F.fillRect(-m, vpY - f * 0.05, TW, f * 0.05 + 12);
    F.restore();
  }
  await tick();

  // ── SCENE ─────────────────────────────────────────────────
  // ground base, hazy at the horizon
  {
    const pts = ground(G.fieldY);
    const g = S.createLinearGradient(0, vpY, 0, H + m);
    g.addColorStop(0, '#a8b09c');
    g.addColorStop(0.035, '#97a58a');
    g.addColorStop(0.12, '#7f9466');
    g.addColorStop(0.5, '#6e8651');
    g.addColorStop(1, '#5f7845');
    fill(S, pts, g);
    dGround(pts, G.fieldY, 0, 0);
  }

  // ─ left fields (paddies) ─
  const RF = rng(21);
  const Zedges = [5, 8.4, 12.6, 18, 25, 34, 46, 61, 80, 105, 138, 180, 235, 300, 390, 520, 800];
  const Xedges = [-6.45, -19, -37, -64, -104, -160, -240, -360, -560];
  const ricePal = [hex('#5f7b3f'), hex('#6c8644'), hex('#78904a'), hex('#647f45'), hex('#83964c'), hex('#6f8a4a'), hex('#8a9a52')];
  const hazeC = hex('#a5ae98');
  const fieldPolys = [];
  for (let j = 0; j < Zedges.length - 1; j++) {
    for (let i = 0; i < Xedges.length - 1; i++) {
      const Z0 = Zedges[j] * (j ? 1 + (RF() - 0.5) * 0.06 : 1), Z1 = Zedges[j + 1] * (1 + (RF() - 0.5) * 0.06);
      const X1 = Xedges[i], X0 = Xedges[i + 1];
      const Zm = (Z0 + Z1) / 2;
      const crossing = Z0 < G.crossingZ + 3 && Z1 > G.crossingZ - 3;
      const base = ricePal[(RF() * ricePal.length) | 0];
      const hz = 1 - Math.exp(-Zm / 210);
      const col = mix(base, hazeC, hz * 0.85);
      const q = [p(X0, G.fieldY, Z0), p(X1, G.fieldY, Z0), p(X1, G.fieldY, Z1), p(X0, G.fieldY, Z1)];
      const g = S.createLinearGradient(0, q[2][1], 0, q[0][1]);
      g.addColorStop(0, rgbs(mix(col, hazeC, 0.2)));
      g.addColorStop(1, rgbs(shade(col, 0.96)));
      fill(S, q, g);
      fieldPolys.push({ q, Z0, Z1, X0, X1, col, crossing });
    }
  }
  // rice texture: rows converging to the vanishing point, leaf blades, pale tips
  {
    const list = [];
    const rowList = [];
    for (const fp of fieldPolys) {
      if (fp.Z0 > 75) continue;
      const { Z0, Z1, X0, X1, col } = fp;
      // rows
      const pitch = 0.3;
      if (f * pitch / Z0 > 2.2) {
        for (let X = X0 + 0.15; X < X1; X += pitch) {
          const a = p(X, G.fieldY, Z0), b = p(X, G.fieldY, Z1);
          rowList.push({ x0: a[0], y0: a[1], x1: b[0], y1: b[1], c: rgbs(shade(col, 0.82), 0.5) });
        }
      }
      const [qa, qb, qc, qd] = fp.q;
      const area = Math.abs((qb[0] - qa[0]) * (qd[1] - qa[1])) + Math.abs((qc[0] - qd[0]) * (qd[1] - qa[1]));
      const n = Math.min(9000, area / 9);
      for (let k = 0; k < n; k++) {
        const u = RF();
        const Z = 1 / lerp(1 / Z0, 1 / Z1, u);
        const X = lerp(X0, X1, RF());
        const b = p(X, G.fieldY + 0.62, Z);
        const L = f * (0.16 + RF() * 0.16) / Z;
        const sl = (RF() - 0.5) * 0.9;
        const t = RF();
        const cc = t < 0.18 ? mix(col, hex('#c4cf9c'), 0.45) : t < 0.5 ? shade(col, 0.78) : t < 0.8 ? mix(col, hex('#9db069'), 0.3) : shade(col, 1.08);
        const qd2 = Math.round(cc[0] / 6) * 6;
        list.push({ x0: b[0], y0: b[1], x1: b[0] + L * sl, y1: b[1] - L, c: `rgb(${qd2},${Math.round(cc[1] / 6) * 6},${Math.round(cc[2] / 6) * 6})` });
      }
    }
    strokes(S, rowList, 1);
    strokes(S, list, Math.max(0.9, 1.1));
  }
  // paddy levees (畦) — grassy ridges between plots
  {
    S.lineCap = 'butt';
    for (const fp of fieldPolys) {
      const { Z0, Z1, X0, X1 } = fp;
      const w0 = Math.max(0.6, f * 0.35 / Z0);
      // along Z (lines to the vanishing point)
      const a = p(X1, G.fieldY + 0.05, Z0), b = p(X1, G.fieldY + 0.05, Math.min(Z1, 900));
      S.strokeStyle = rgbs(mix(hex('#a3a777'), hazeC, 1 - Math.exp(-Z0 / 160)), 0.85);
      S.lineWidth = w0;
      S.beginPath(); S.moveTo(a[0], a[1]); S.lineTo(b[0], b[1]); S.stroke();
      // across (horizontal)
      const c0 = p(X0, G.fieldY + 0.05, Z0), c1 = p(X1, G.fieldY + 0.05, Z0);
      S.lineWidth = Math.max(0.5, f * 0.12 / Z0);
      S.strokeStyle = rgbs(mix(hex('#9fa673'), hazeC, 1 - Math.exp(-Z0 / 160)), 0.8);
      S.beginPath(); S.moveTo(c0[0], c0[1]); S.lineTo(c1[0], c1[1]); S.stroke();
      if (Z0 < 40) {
        S.strokeStyle = 'rgba(52,62,38,0.35)';
        S.lineWidth = Math.max(0.5, f * 0.06 / Z0);
        const d0 = p(X0, G.fieldY, Z0 + 0.25), d1 = p(X1, G.fieldY, Z0 + 0.25);
        S.beginPath(); S.moveTo(d0[0], d0[1]); S.lineTo(d1[0], d1[1]); S.stroke();
      }
    }
    S.lineCap = 'round';
  }
  // field mask for wind (aux G)
  for (const fp of fieldPolys) {
    if (fp.crossing) continue;
    dGround(fp.q, G.fieldY, 255, 0);
  }
  await tick();

  // distant groves, farmhouses at the field's far edge (left)
  const RT = rng(33);
  function grove(a0, a1, Z, hgt, opts = {}) {
    const x0 = vpX + f * a0, x1 = vpX + f * a1;
    const yb = p(0, G.fieldY, Z)[1];
    const r = Math.max(0.9, f * (opts.crown || 3.2) / Z);
    const hz = 1 - Math.exp(-Z / 260);
    const dark = mix(hex(opts.dark || '#3d5140'), hazeC, hz * 0.7);
    const light = mix(hex(opts.light || '#728a6a'), hazeC, hz * 0.6);
    const cols = []; for (let k = 0; k < 6; k++) cols.push(rgbs(mix(dark, light, k / 5)));
    const list = [];
    const htPx = f * hgt / Z;
    const pts = [];
    for (let x = x0; x <= x1; x += r * 0.9) {
      const e = Math.sin(((x - x0) / (x1 - x0)) * Math.PI);
      const hh = htPx * (0.45 + 0.55 * Math.pow(e, 0.6)) * (0.75 + 0.5 * vnoise1(x * 0.07 / r, opts.seed || 1));
      pts.push([x, yb - hh]);
      const n = Math.max(2, Math.round(hh / r * 1.4));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        list.push({ x: x + (RT() - 0.5) * r, y: yb - hh * (1 - t) + r * 0.2, r: r * (0.7 + RT() * 0.6), c: cols[clamp(Math.round((1 - t) * 3.2 + RT() * 2.5), 0, 5)] });
      }
    }
    const poly = [...pts, [x1, yb + 1], [x0, yb + 1]];
    fill(S, poly, rgbs(dark));
    dabs(S, list);
    if (opts.cedar) {
      S.fillStyle = rgbs(shade(dark, 0.9));
      S.beginPath();
      for (let k = 0; k < opts.cedar; k++) {
        const xx = lerp(x0, x1, RT());
        const hh = htPx * (1.05 + RT() * 0.35);
        const w = r * 0.9;
        S.moveTo(xx - w, yb - hh * 0.25); S.lineTo(xx, yb - hh); S.lineTo(xx + w, yb - hh * 0.25);
      }
      S.fill();
    }
    dFlat(poly, Z, 0, 255, 3);
    occ(poly);
    return { x0, x1, yb };
  }
  function farmhouse(a, Z, wM, hM, win) {
    const x = vpX + f * a;
    const yb = p(0, G.fieldY, Z)[1];
    const w = f * wM / Z, h = f * hM / Z;
    const hz = 1 - Math.exp(-Z / 260);
    fill(S, [[x - w / 2, yb], [x + w / 2, yb], [x + w / 2, yb - h * 0.55], [x - w / 2, yb - h * 0.55]], rgbs(mix(hex('#b9b2a2'), hazeC, hz * 0.6)));
    fill(S, [[x - w * 0.62, yb - h * 0.5], [x + w * 0.62, yb - h * 0.5], [x + w * 0.38, yb - h], [x - w * 0.38, yb - h]], rgbs(mix(hex('#4a4f57'), hazeC, hz * 0.55)));
    dFlat([[x - w * 0.62, yb], [x + w * 0.62, yb], [x + w * 0.38, yb - h], [x - w * 0.38, yb - h]], Z, 0, 0, 2);
    occ([[x - w * 0.62, yb], [x + w * 0.62, yb], [x + w * 0.38, yb - h], [x - w * 0.38, yb - h]]);
    if (win != null) {
      const ww = Math.max(1.2, w * 0.13), wh = Math.max(1, h * 0.17);
      const wx = x - w * 0.22, wy = yb - h * 0.33;
      fill(S, [[wx, wy], [wx + ww, wy], [wx + ww, wy + wh], [wx, wy + wh]], 'rgba(70,72,70,0.9)');
      emit(E2, win, [[wx, wy], [wx + ww, wy], [wx + ww, wy + wh], [wx, wy + wh]], 1);
      glow(E2, win, wx + ww / 2, wy + wh / 2, ww * 3, 0.35);
    }
  }
  // far groves and farms (left of the line)
  farmhouse(-0.33, 300, 13, 7, 0);
  grove(-0.5, -0.27, 330, 14, { seed: 3, cedar: 10 });
  farmhouse(-0.21, 236, 11, 6.5, 2);
  grove(-0.26, -0.165, 250, 12, { seed: 5, light: '#8b9f63', dark: '#4c6142', crown: 2.4 }); // bamboo-ish, lighter
  grove(-0.17, -0.085, 360, 17, { seed: 9, cedar: 14 }); // the curve disappears behind this
  grove(-0.95, -0.62, 280, 11, { seed: 12 });
  farmhouse(-0.74, 270, 12, 6.8, 1);
  grove(-1.6, -1.0, 210, 10, { seed: 13 });
  grove(0.05, 0.16, 420, 12, { seed: 15 });
  // right-hand far trees beyond the houses
  grove(0.28, 0.62, 260, 13, { seed: 16, cedar: 8 });
  grove(0.85, 1.5, 200, 12, { seed: 17 });
  await tick();

  // ─ the right side: plaza, road, houses ─
  const RY = -0.45;
  {
    // ground on the right (gardens, verges), above the fields' level
    const pts = [p(3.3, RY, 1.0), p(3.3, RY, 2000), p(400, RY, 2000), p(400, RY, 1.0)];
    const g = S.createLinearGradient(0, vpY, 0, H);
    g.addColorStop(0, '#a3ab95'); g.addColorStop(0.08, '#8c9874'); g.addColorStop(1, '#7c8a5c');
    fill(S, pts, g);
    dGround(pts, RY, 0, 0);
    occ(pts);
    // far right fields beyond houses
    const RR = rng(77);
    for (const [X0, X1, Z0, Z1] of [[30, 90, 110, 200], [90, 200, 95, 190], [24, 80, 200, 330], [80, 220, 190, 330], [12, 26, 120, 200]]) {
      const q = [p(X0, RY, Z0), p(X1, RY, Z0), p(X1, RY, Z1), p(X0, RY, Z1)];
      const col = mix(ricePal[(RR() * 7) | 0], hazeC, 0.6);
      fill(S, q, rgbs(col));
      dGround(q, RY, 255, 0);
    }
  }
  // road (parallel to the line, on the right)
  {
    const q = [p(7.6, RY + 0.02, 1), p(10.6, RY + 0.02, 1), p(10.6, RY + 0.02, 2000), p(7.6, RY + 0.02, 2000)];
    const g = S.createLinearGradient(0, vpY, 0, H);
    g.addColorStop(0, '#a3a49e'); g.addColorStop(0.1, '#8d8c87'); g.addColorStop(1, '#7c7a75');
    fill(S, q, g);
    grimeOver(S, q, 0.25);
    // faded edge lines
    S.lineWidth = 1;
    for (const X of [7.75, 10.45]) {
      for (let Z = 2; Z < 300; Z += 4.5) {
        const a = p(X, RY + 0.03, Z), b = p(X, RY + 0.03, Z + 3);
        S.strokeStyle = `rgba(222,220,210,${0.35 + 0.3 * vnoise1(Z * 0.2, 3)})`;
        S.lineWidth = Math.max(0.5, f * 0.12 / Z);
        S.beginPath(); S.moveTo(a[0], a[1]); S.lineTo(b[0], b[1]); S.stroke();
      }
    }
    dGround(q, RY, 0, 0);
  }

  // houses (simple boxes with gable roofs; visible faces only)
  const houses = [
    { X0: 14, X1: 22, Z0: 34, Z1: 41, h: 5.6, roof: '#4b5058', wall: '#d2cbbb', ridge: 'x', win: [[0, 0], [2, 3]] },
    { X0: 27, X1: 34, Z0: 40, Z1: 46, h: 5.4, roof: '#4f6d78', wall: '#c9c3b2', ridge: 'z', win: [[1, 2]] },
    { X0: 15, X1: 24.5, Z0: 56, Z1: 65, h: 4.2, roof: '#454a52', wall: '#8b6d55', ridge: 'x', big: true, win: [[0, 1], [1, 4]] },
    { X0: 14, X1: 18.5, Z0: 76, Z1: 82, h: 5.2, roof: '#555a61', wall: '#e6e2d8', ridge: 'z', kura: true },
    { X0: 22, X1: 30, Z0: 90, Z1: 98, h: 5.3, roof: '#7a5446', wall: '#cfc6b3', ridge: 'x', win: [[2, 0]] },
    { X0: 38, X1: 47, Z0: 66, Z1: 76, h: 5.0, roof: '#4a4f57', wall: '#bdb4a2', ridge: 'x', win: [[0, 1]] },
    { X0: 52, X1: 60, Z0: 104, Z1: 112, h: 5.2, roof: '#5a5f66', wall: '#c4bca9', ridge: 'z', win: [[1, 2]] },
  ];
  const RH = rng(91);
  function tree(X, Z, Y, hgt, crown, kind = 'round', seed = 1) {
    const base = p(X, Y, Z);
    const top = p(X, Y + hgt, Z);
    const r = f * crown / Z;
    const hz = 1 - Math.exp(-Z / 260);
    const dark = mix(hex(kind === 'pine' ? '#2f4436' : '#3c5240'), hazeC, hz * 0.6);
    const light = mix(hex(kind === 'pine' ? '#5f7760' : '#7b9270'), hazeC, hz * 0.5);
    S.strokeStyle = rgbs(mix(hex('#4a3d33'), hazeC, hz * 0.5));
    S.lineWidth = Math.max(0.8, f * 0.25 / Z);
    S.beginPath(); S.moveTo(base[0], base[1]); S.lineTo(top[0], top[1] + r * 0.5); S.stroke();
    const list = [];
    const cols = []; for (let k = 0; k < 6; k++) cols.push(rgbs(mix(dark, light, k / 5)));
    const R = rng(seed);
    const n = Math.round(clamp(r * r / 6, 12, 260));
    for (let k = 0; k < n; k++) {
      const ang = R() * TAU, rr = Math.sqrt(R()) * r;
      const lx = Math.cos(ang) * rr, ly = Math.sin(ang) * rr * (kind === 'pine' ? 0.45 : 0.85);
      const shadeT = clamp(0.55 - ly / r * 0.6 + (R() - 0.5) * 0.5);
      list.push({ x: top[0] + lx, y: top[1] + ly, r: Math.max(0.7, r * (0.16 + R() * 0.16)), c: cols[Math.round(shadeT * 5)] });
    }
    if (kind === 'pine') {
      // layered flat tiers
      for (let t = 0; t < 3; t++) {
        const ty = top[1] + r * (t * 0.55 - 0.3), tw = r * (0.6 + t * 0.25);
        for (let k = 0; k < 18; k++) list.push({ x: top[0] + (R() - 0.5) * tw * 2, y: ty + (R() - 0.5) * r * 0.2, r: r * 0.18, c: cols[1 + ((R() * 3) | 0)] });
      }
    }
    dabs(S, list);
    const box = [[top[0] - r, top[1] - r], [top[0] + r, top[1] - r], [top[0] + r, base[1]], [top[0] - r, base[1]]];
    dFlat(box, Z, 0, 200, 2);
    occ([[top[0] - r * 0.8, top[1] - r * 0.7], [top[0] + r * 0.8, top[1] - r * 0.7], [top[0] + r * 0.8, top[1] + r * 0.7], [top[0] - r * 0.8, top[1] + r * 0.7]]);
  }
  function house(hs) {
    const { X0, X1, Z0, Z1, h, ridge } = hs;
    const Y0 = RY, Y1 = RY + h;
    const wall = hex(hs.wall), roof = hex(hs.roof);
    const hz = 1 - Math.exp(-Z0 / 300);
    const wallF = mix(wall, hazeC, hz * 0.5), wallS = mix(shade(wall, 0.78), hazeC, hz * 0.5);
    const roofC = mix(roof, hazeC, hz * 0.4);
    const pitch = hs.big ? 3.2 : 2.2;
    const over = 0.6;
    // front face (Z0) and left side face (X0) are the visible ones
    const front = P([[X0, Y0, Z0], [X1, Y0, Z0], [X1, Y1, Z0], [X0, Y1, Z0]]);
    const side = P([[X0, Y0, Z0], [X0, Y0, Z1], [X0, Y1, Z1], [X0, Y1, Z0]]);
    fill(S, side, rgbs(wallS));
    fill(S, front, rgbs(wallF));
    if (hs.kura) {
      // storehouse: black skirting, small high window
      const sk = P([[X0, Y0, Z0], [X1, Y0, Z0], [X1, Y0 + 1.4, Z0], [X0, Y0 + 1.4, Z0]]);
      fill(S, sk, rgbs(mix(hex('#2f2f33'), hazeC, hz * 0.4)));
      const sk2 = P([[X0, Y0, Z0], [X0, Y0, Z1], [X0, Y0 + 1.4, Z1], [X0, Y0 + 1.4, Z0]]);
      fill(S, sk2, rgbs(mix(hex('#262629'), hazeC, hz * 0.4)));
    } else {
      // wooden lower band
      const band = P([[X0, Y0, Z0], [X1, Y0, Z0], [X1, Y0 + 0.9, Z0], [X0, Y0 + 0.9, Z0]]);
      fill(S, band, rgbs(mix(hex('#6d5745'), hazeC, hz * 0.45), 0.8));
    }
    // roof
    let roofFaces = [];
    if (ridge === 'x') {
      // ridge parallel to X: we see the front slope from below → its underside eave + gable band
      const Zm = (Z0 + Z1) / 2;
      const r1 = P([[X0 - over, Y1, Z0 - over], [X1 + over, Y1, Z0 - over], [X1 + over, Y1 + pitch, Zm], [X0 - over, Y1 + pitch, Zm]]);
      roofFaces.push([r1, roofC]);
      const gable = P([[X0 - over, Y1, Z0 - over], [X0 - over, Y1 + pitch, Zm], [X0 - over, Y1, Z1 + over]]);
      roofFaces.push([gable, shade(roofC, 0.8)]);
    } else {
      const Xm = (X0 + X1) / 2;
      const r1 = P([[X0 - over, Y1, Z0 - over], [Xm, Y1 + pitch, Z0 - over], [Xm, Y1 + pitch, Z1 + over], [X0 - over, Y1, Z1 + over]]);
      roofFaces.push([r1, shade(roofC, 1.05)]);
      const gableW = P([[X0, Y1, Z0], [X1, Y1, Z0], [Xm, Y1 + pitch * 0.92, Z0]]);
      roofFaces.push([gableW, wallF]);
      const fascia = P([[X0 - over, Y1, Z0 - over], [Xm, Y1 + pitch, Z0 - over], [X1 + over, Y1, Z0 - over], [X1 + over, Y1 - 0.18, Z0 - over], [Xm, Y1 + pitch - 0.18, Z0 - over], [X0 - over, Y1 - 0.18, Z0 - over]]);
      roofFaces.push([fascia, shade(roofC, 0.7)]);
    }
    for (const [pts, c] of roofFaces) fill(S, pts, rgbs(c));
    // tile lines
    if (ridge === 'x' && Z0 < 60) {
      S.strokeStyle = rgbs(shade(roofC, 0.75), 0.6);
      S.lineWidth = 0.6;
      for (let X = X0 - over; X < X1 + over; X += 0.32) {
        const a = p(X, Y1, Z0 - over), b = p(X, Y1 + pitch, (Z0 + Z1) / 2);
        S.beginPath(); S.moveTo(a[0], a[1]); S.lineTo(b[0], b[1]); S.stroke();
      }
      // ridge highlight
      const a = p(X0 - over, Y1 + pitch, (Z0 + Z1) / 2), b = p(X1 + over, Y1 + pitch, (Z0 + Z1) / 2);
      S.strokeStyle = rgbs(mix(roofC, hex('#d7d9d6'), 0.35));
      S.lineWidth = Math.max(1, f * 0.18 / Z0);
      S.beginPath(); S.moveTo(a[0], a[1]); S.lineTo(b[0], b[1]); S.stroke();
    }
    // windows
    const all = [front, side, ...roofFaces.map((r) => r[0])];
    const xs = all.flat().map((q) => q[0]), ys = all.flat().map((q) => q[1]);
    const bb = [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)], [Math.min(...xs), Math.max(...ys)]];
    occ(bb);
    if (!hs.kura) {
      // sliding windows on front, a few on side
      const wins = [];
      const n = Math.max(2, Math.round((X1 - X0) / 2.6));
      for (let k = 0; k < n; k++) {
        const wx0 = lerp(X0, X1, (k + 0.25) / n), wx1 = lerp(X0, X1, (k + 0.75) / n);
        wins.push({ f: true, a: wx0, b: wx1, y0: Y0 + 1.0, y1: Y0 + 2.0 });
        if (h > 5) wins.push({ f: true, a: wx0, b: wx1, y0: Y0 + 3.4, y1: Y0 + 4.3 });
      }
      for (let k = 0; k < 2; k++) {
        const z0 = lerp(Z0, Z1, 0.2 + k * 0.4), z1 = z0 + (Z1 - Z0) * 0.22;
        wins.push({ f: false, a: z0, b: z1, y0: Y0 + 1.1, y1: Y0 + 2.0 });
      }
      for (const w of wins) {
        const q = w.f ? P([[w.a, w.y0, Z0], [w.b, w.y0, Z0], [w.b, w.y1, Z0], [w.a, w.y1, Z0]])
          : P([[X0, w.y0, w.a], [X0, w.y0, w.b], [X0, w.y1, w.b], [X0, w.y1, w.a]]);
        fill(S, q, rgbs(mix(hex('#5d6266'), hazeC, hz * 0.4)));
        if (Z0 < 70) {
          S.strokeStyle = rgbs(mix(hex('#9aa0a1'), hazeC, hz * 0.4), 0.7);
          S.lineWidth = 0.6;
          path(S, q); S.stroke();
          const mid = [(q[0][0] + q[1][0]) / 2, (q[0][1] + q[1][1]) / 2], mid2 = [(q[2][0] + q[3][0]) / 2, (q[2][1] + q[3][1]) / 2];
          S.beginPath(); S.moveTo(mid[0], mid[1]); S.lineTo(mid2[0], mid2[1]); S.stroke();
        }
      }
      // the windows that will light up
      for (const [ch, idx] of hs.win || []) {
        const w = wins[idx % wins.length];
        const q = w.f ? P([[w.a, w.y0, Z0], [w.b, w.y0, Z0], [w.b, w.y1, Z0], [w.a, w.y1, Z0]])
          : P([[X0, w.y0, w.a], [X0, w.y0, w.b], [X0, w.y1, w.b], [X0, w.y1, w.a]]);
        emit(E2, ch, q, 1);
        const cx = (q[0][0] + q[2][0]) / 2, cy = (q[0][1] + q[2][1]) / 2;
        glow(E2, ch, cx, cy, Math.abs(q[1][0] - q[0][0]) * 2.4 + 3, 0.32);
      }
    }
    dFlat(bb, Z0, 0, 0, 3);
    return bb;
  }
  // back to front
  const order = houses.slice().sort((a, b) => b.Z0 - a.Z0);
  for (const hs of order) {
    if (hs.Z0 > 85) house(hs);
  }
  tree(36, 102, RY, 9, 3.6, 'round', 3);
  tree(20, 102, RY, 7, 2.8, 'round', 4);
  tree(35, 60, RY, 8, 3.2, 'round', 5);
  for (const hs of order) if (hs.Z0 <= 85 && hs.Z0 > 50) house(hs);
  tree(26, 70, RY, 6.5, 2.6, 'pine', 6);   // a garden pine
  tree(12.0, 68, RY, 5.2, 2.3, 'round', 7);  // persimmon by the road
  for (const hs of order) if (hs.Z0 <= 50) house(hs);
  tree(23.5, 48, RY, 6, 2.6, 'round', 8);
  // a white kei truck parked by the farmhouse
  {
    const X0 = 11.4, X1 = 12.9, Z0 = 52.5, Z1 = 55.9;
    const cab = P([[X0, RY + 0.35, Z0], [X1, RY + 0.35, Z0], [X1, RY + 1.8, Z0], [X0, RY + 1.8, Z0]]);
    const sideBed = P([[X0, RY + 0.35, Z0 + 1.3], [X0, RY + 0.35, Z1], [X0, RY + 1.05, Z1], [X0, RY + 1.05, Z0 + 1.3]]);
    const sideCab = P([[X0, RY + 0.35, Z0], [X0, RY + 0.35, Z0 + 1.3], [X0, RY + 1.8, Z0 + 1.3], [X0, RY + 1.8, Z0]]);
    fill(S, sideBed, '#bfc0bb');
    fill(S, sideCab, '#cfd0cb');
    fill(S, cab, '#e3e3de');
    const ws = P([[X0 + 0.12, RY + 1.2, Z0], [X1 - 0.12, RY + 1.2, Z0], [X1 - 0.16, RY + 1.7, Z0], [X0 + 0.16, RY + 1.7, Z0]]);
    fill(S, ws, '#6f7a7e');
    for (const z of [Z0 + 0.5, Z1 - 0.5]) {
      const c = p(X0, RY + 0.27, z);
      S.fillStyle = '#26262a'; S.beginPath(); S.ellipse(c[0], c[1], f * 0.1 / z, f * 0.27 / z, 0, 0, TAU); S.fill();
    }
    dFlat(cab.concat(sideBed), Z0, 0, 0, 2);
    occ(cab); occ(sideBed); occ(sideCab);
  }
  // hedge along the road (生垣)
  {
    const q = P([[11.0, RY, 30], [11.0, RY, 72], [11.0, RY + 1.1, 72], [11.0, RY + 1.1, 30]]);
    fill(S, q, '#435842');
    const list = [];
    const R = rng(55);
    for (let k = 0; k < 500; k++) {
      const Z = lerp(30, 72, R()); const Y = RY + R() * 1.1;
      const [x, y] = p(11.0, Y, Z);
      list.push({ x, y, r: Math.max(0.7, f * 0.14 / Z), c: R() < 0.5 ? '#3b5039' : R() < 0.7 ? '#5d7454' : '#6f8762' });
    }
    dabs(S, list);
    dWallX(q, 11.0, 0, 120);
    occ(q);
  }
  await tick();

  // ─ utility poles & wires ─
  const poleList = [];
  function pole(X, Z, top, Ybase, opts = {}) {
    const hz = 1 - Math.exp(-Z / 240);
    const col = mix(hex('#a29f97'), hazeC, hz * 0.7);
    const w0 = 0.3, w1 = 0.2;
    const q = P([[X - w0 / 2, Ybase, Z], [X + w0 / 2, Ybase, Z], [X + w1 / 2, top, Z], [X - w1 / 2, top, Z]]);
    const g = S.createLinearGradient(q[0][0], 0, q[1][0], 0);
    g.addColorStop(0, rgbs(shade(col, 0.82))); g.addColorStop(0.45, rgbs(shade(col, 1.06))); g.addColorStop(1, rgbs(shade(col, 0.72)));
    fill(S, q, g);
    // crossarms
    const arms = [];
    const armC = rgbs(mix(hex('#6d6a64'), hazeC, hz * 0.6));
    for (const [dy, wd] of opts.arms || [[-0.35, 1.8], [-1.6, 1.2]]) {
      const a = P([[X - wd / 2, top + dy, Z], [X + wd / 2, top + dy, Z], [X + wd / 2, top + dy - 0.1, Z], [X - wd / 2, top + dy - 0.1, Z]]);
      fill(S, a, armC);
      arms.push([top + dy, wd]);
      // insulators
      for (const s of [-0.42, 0, 0.42]) {
        const ip = p(X + s * wd, top + dy + 0.08, Z);
        S.fillStyle = rgbs(mix(hex('#d8d6cf'), hazeC, hz * 0.6));
        S.beginPath(); S.arc(ip[0], ip[1], Math.max(0.6, f * 0.06 / Z), 0, TAU); S.fill();
      }
    }
    if (opts.trans) {
      // pole-top transformer
      const tY = top - 2.6;
      const c = p(X + 0.32, tY, Z);
      const rw = f * 0.22 / Z, rh = f * 0.42 / Z;
      const g2 = S.createLinearGradient(c[0] - rw, 0, c[0] + rw, 0);
      g2.addColorStop(0, rgbs(mix(hex('#8b908e'), hazeC, hz * 0.6))); g2.addColorStop(0.5, rgbs(mix(hex('#b8bcba'), hazeC, hz * 0.6))); g2.addColorStop(1, rgbs(mix(hex('#6c7170'), hazeC, hz * 0.6)));
      S.fillStyle = g2;
      S.fillRect(c[0] - rw, c[1] - rh, rw * 2, rh * 2);
    }
    const bb = [[q[0][0] - 2, q[0][1]], [q[1][0] + 2, q[1][1]], [q[2][0] + 2, q[2][1] - 4], [q[3][0] - 2, q[3][1] - 4]];
    dFlat(bb, Z, 0, 0, 3);
    occ(q);
    const o = { X, Z, top, arms };
    poleList.push(o);
    return o;
  }
  function wire(a, b, sag = 0.018, width = 1, alpha = 0.85, col = '30,31,35') {
    const span = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const n = 32;
    S.strokeStyle = `rgba(${col},${alpha})`;
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const X = lerp(a[0], b[0], t), Z = lerp(a[2], b[2], t);
      const Y = lerp(a[1], b[1], t) - span * sag * 4 * t * (1 - t);
      const q = p(X, Y, Z);
      if (prev) {
        S.lineWidth = Math.max(0.55, Math.min(2.2, f * 0.016 / Z * width));
        S.beginPath(); S.moveTo(prev[0], prev[1]); S.lineTo(q[0], q[1]); S.stroke();
        A.strokeStyle = `rgb(${dz(Z)},0,0)`; A.lineWidth = 3;
        A.beginPath(); A.moveTo(prev[0], prev[1]); A.lineTo(q[0], q[1]); A.stroke();
      }
      prev = q;
    }
  }
  // poles along the far crossing road (left), tiny
  {
    const Zr = G.crossingZ - 3.6;
    let last = null;
    for (const X of [-14, -45, -76, -108, -140, -175]) {
      const o = pole(X, Zr, G.fieldY + 8.5, G.fieldY, { arms: [[-0.4, 1.4]] });
      if (last) for (const s of [-0.42, 0, 0.42]) wire([last.X + s * 1.4, last.top - 0.3, Zr], [o.X + s * 1.4, o.top - 0.3, Zr], 0.02, 1, 0.55);
      last = o;
    }
  }
  // road poles (right)
  const roadPoles = [];
  for (const Z of [41, 76, 111, 146, 181, 216, 251]) roadPoles.push(pole(11.3, Z, RY + 9.4, RY, { trans: Z === 76 }));
  for (let i = 1; i < roadPoles.length; i++) {
    const a = roadPoles[i - 1], b = roadPoles[i];
    for (const [dy, wd] of a.arms) for (const s of [-0.42, 0, 0.42]) wire([a.X + s * wd, a.top + dy + 0.1, a.Z], [b.X + s * wd, b.top + dy + 0.1, b.Z], 0.016, 1, 0.7);
    wire([a.X - 0.2, a.top - 3.4, a.Z], [b.X - 0.2, b.top - 3.4, b.Z], 0.022, 2.4, 0.75);
  }
  // service drops to houses
  wire([11.3, RY + 6.4, 41], [14, RY + 4.6, 36], 0.03, 0.8, 0.6);
  wire([11.3, RY + 6.4, 41], [15, RY + 3.8, 57], 0.03, 0.8, 0.6);
  wire([11.3, RY + 6.4, 76], [14, RY + 4.4, 78], 0.03, 0.8, 0.6);
  // fields poles (left) that the near wires cross to
  const fp1 = pole(-16, 50, G.fieldY + 10, G.fieldY, { arms: [[-0.35, 1.6]] });
  const fp2 = pole(-44, 92, G.fieldY + 10, G.fieldY, { arms: [[-0.35, 1.6]] });
  const fp3 = pole(-80, 132, G.fieldY + 10, G.fieldY, { arms: [[-0.35, 1.6]] });
  for (const [a, b] of [[fp1, fp2], [fp2, fp3]]) for (const s of [-0.42, 0.42]) wire([a.X + s * 1.6, a.top - 0.25, a.Z], [b.X + s * 1.6, b.top - 0.25, b.Z], 0.018, 1, 0.7);
  await tick();

  // ─ the line ─
  const zs = [];
  for (let z = 0.6; z < 1.5; z += 0.15) zs.push(z);
  for (let z = 1.5; z < 10; z += 0.5) zs.push(z);
  for (let z = 10; z < 60; z += 2) zs.push(z);
  for (let z = 60; z < 346; z += 5) zs.push(z);
  const tx = trackXAt;
  function ribbonH(off0, off1, Y, z0 = 0.6, z1 = 430) {
    const L = [], Rr = [];
    for (const z of zs) { if (z < z0 || z > z1) continue; L.push(p(tx(z) + off0, Y, z)); Rr.push(p(tx(z) + off1, Y, z)); }
    return L.concat(Rr.reverse());
  }
  // ballast shoulder (sloping) + verge + ditch
  {
    const verge = ribbonH(-2.9, -2.0, G.fieldY + 0.1);
    fill(S, verge, '#76855a');
    const slope = [];
    const L = [], Rr = [];
    for (const z of zs) { L.push(p(tx(z) - 2.25, G.fieldY + 0.15, z)); Rr.push(p(tx(z) - 1.5, G.ballastY, z)); }
    const sl = L.concat(Rr.reverse());
    const g = S.createLinearGradient(0, vpY, 0, H);
    g.addColorStop(0, '#9a978e'); g.addColorStop(0.2, '#837f75'); g.addColorStop(1, '#6f6a61');
    fill(S, sl, g);
    dGround(sl, (G.fieldY + G.ballastY) / 2, 0, 0);
    // weeds on the shoulder
    const R = rng(61);
    const list = [];
    for (let k = 0; k < 2600; k++) {
      const z = 1 / lerp(1 / 2.5, 1 / 200, R());
      const off = lerp(-2.95, -1.7, R());
      const Y = off < -2.25 ? G.fieldY + 0.12 : lerp(G.fieldY + 0.15, G.ballastY, (off + 2.25) / 0.75);
      const b = p(tx(z) + off, Y, z);
      const L2 = f * (0.08 + R() * 0.22) / z;
      const c = R() < 0.4 ? '#5d7340' : R() < 0.7 ? '#86975a' : '#a4ab73';
      list.push({ x0: b[0], y0: b[1], x1: b[0] + (R() - 0.5) * L2 * 0.6, y1: b[1] - L2, c });
    }
    strokes(S, list, 1);
  }
  // ballast bed
  const bed = ribbonH(-1.5, 1.7, G.ballastY);
  {
    const g = S.createLinearGradient(0, vpY, 0, H);
    g.addColorStop(0, '#a19d93'); g.addColorStop(0.15, '#8f8a80'); g.addColorStop(1, '#7d776d');
    fill(S, bed, g);
    grimeOver(S, bed, 0.35);
    dGround(bed, G.ballastY, 0, 0);
    occ(bed);
    // gravel
    const R = rng(71);
    const list = [];
    const cols = ['#6b665d', '#9a958b', '#5a554e', '#aaa59a', '#7c766b', '#857565'];
    for (let k = 0; k < 9000; k++) {
      const z = 1 / lerp(1 / 1.2, 1 / 60, Math.pow(R(), 0.8));
      const off = lerp(-1.5, 1.7, R());
      const [x, y] = p(tx(z) + off, G.ballastY, z);
      const r = Math.max(0.45, f * 0.028 / z * (0.6 + R()));
      list.push({ x, y, r, k: 0.6, c: cols[(R() * cols.length) | 0] });
    }
    dabs(S, list);
  }
  // sleepers
  {
    const R = rng(81);
    for (let z = 0.9; z < 140; z += 0.62) {
      const z0 = z, z1 = z + 0.2;
      if (f * 0.2 / z0 < 0.5) break;
      const t = tx(z);
      const q = [p(t - 1.05, G.ballastY + 0.06, z0), p(t + 1.05, G.ballastY + 0.06, z0), p(t + 1.05, G.ballastY + 0.06, z1), p(t - 1.05, G.ballastY + 0.06, z1)];
      const concrete = R() < 0.15;
      const base = concrete ? hex('#a7a49b') : mix(hex('#4f4237'), hex('#6a5949'), R());
      const hz = 1 - Math.exp(-z / 120);
      fill(S, q, rgbs(mix(base, hex('#8f8a80'), hz * 0.6)));
      // the near face of the sleeper
      if (z < 25) {
        const fq = [p(t - 1.05, G.ballastY - 0.02, z0), p(t + 1.05, G.ballastY - 0.02, z0), p(t + 1.05, G.ballastY + 0.06, z0), p(t - 1.05, G.ballastY + 0.06, z0)];
        fill(S, fq, rgbs(shade(base, 0.65)));
      }
    }
  }
  // rails
  {
    const hw = 0.032;
    for (const s of [-G.gauge / 2, G.gauge / 2]) {
      // web/side (we see the +X side), rusted
      const L = [], Rr = [];
      for (const z of zs) { L.push(p(tx(z) + s + hw, G.railY, z)); Rr.push(p(tx(z) + s + hw, G.railY - 0.15, z)); }
      fill(S, L.concat(Rr.reverse()), '#5b4436');
      // foot shadow on the sleepers
      const L2 = [], R2 = [];
      for (const z of zs) { L2.push(p(tx(z) + s + hw, G.ballastY + 0.07, z)); R2.push(p(tx(z) + s + 0.12, G.ballastY + 0.07, z)); }
      fill(S, L2.concat(R2.reverse()), 'rgba(40,34,30,0.45)');
      // head, polished by wheels: reflects the white sky
      const top = ribbonH(s - hw, s + hw, G.railY);
      fill(S, top, '#d3d4cf');
      S.strokeStyle = 'rgba(235,236,232,0.9)';
      S.lineWidth = 0.6;
      S.beginPath();
      zs.forEach((z, i) => { const q = p(tx(z) + s, G.railY + 0.002, z); if (i) S.lineTo(q[0], q[1]); else S.moveTo(q[0], q[1]); });
      S.stroke();
    }
    // joints every 25 m
    S.strokeStyle = 'rgba(30,26,24,0.6)';
    for (let z = 12.5; z < 140; z += 25) {
      for (const s of [-G.gauge / 2, G.gauge / 2]) {
        const a = p(tx(z) + s - 0.05, G.railY + 0.005, z), b = p(tx(z) + s + 0.05, G.railY + 0.005, z);
        S.lineWidth = Math.max(0.5, f * 0.02 / z);
        S.beginPath(); S.moveTo(a[0], a[1]); S.lineTo(b[0], b[1]); S.stroke();
      }
    }
  }
  // the crossing road across the line (far)
  {
    const Zc = G.crossingZ, w = 2.6;
    const q = [p(-260, G.fieldY + 0.25, Zc - w), p(10.6, RY + 0.02, Zc - w), p(10.6, RY + 0.02, Zc + w), p(-260, G.fieldY + 0.25, Zc + w)];
    fill(S, q, '#8f8e88');
    // crossing boards between and beside the rails
    const t = tx(Zc);
    const cb = [p(t - 1.3, G.railY + 0.01, Zc - w), p(t + 1.3, G.railY + 0.01, Zc - w), p(t + 1.3, G.railY + 0.01, Zc + w), p(t - 1.3, G.railY + 0.01, Zc + w)];
    fill(S, cb, '#7a756c');
    // yellow-black edges
    for (const zz of [Zc - w, Zc + w]) {
      const a = p(t - 2.4, G.railY + 0.02, zz), b = p(t + 2.4, G.railY + 0.02, zz);
      S.strokeStyle = 'rgba(214,180,60,0.8)'; S.lineWidth = 0.8;
      S.beginPath(); S.moveTo(a[0], a[1]); S.lineTo(b[0], b[1]); S.stroke();
    }
    dGround(q, G.railY, 0, 0);
    // crossing posts: striped poles, crossbuck, lamp housings
    for (const [X, Z] of [[t - 2.9, Zc - w - 0.4], [t + 2.9, Zc + w + 0.4]]) {
      const base = p(X, G.railY, Z), top = p(X, G.railY + 3.3, Z);
      const lw = Math.max(1, f * 0.12 / Z);
      // lower half striped
      const segs = 6;
      for (let k = 0; k < segs; k++) {
        const ya = lerp(base[1], top[1], k / segs * 0.45), yb = lerp(base[1], top[1], (k + 1) / segs * 0.45);
        S.strokeStyle = k % 2 ? '#1f1f22' : '#d9b43c';
        S.lineWidth = lw; S.beginPath(); S.moveTo(base[0], ya); S.lineTo(base[0], yb); S.stroke();
      }
      S.strokeStyle = '#d6d4cc'; S.lineWidth = lw;
      S.beginPath(); S.moveTo(base[0], lerp(base[1], top[1], 0.45)); S.lineTo(top[0], top[1]); S.stroke();
      // crossbuck
      const cb2 = p(X, G.railY + 3.05, Z);
      const s2 = f * 0.5 / Z;
      S.lineWidth = Math.max(1, f * 0.16 / Z);
      S.strokeStyle = '#d9b43c';
      S.beginPath(); S.moveTo(cb2[0] - s2, cb2[1] - s2 * 0.5); S.lineTo(cb2[0] + s2, cb2[1] + s2 * 0.5);
      S.moveTo(cb2[0] - s2, cb2[1] + s2 * 0.5); S.lineTo(cb2[0] + s2, cb2[1] - s2 * 0.5); S.stroke();
      // lamp bar & dark lamps
      const lb = p(X, G.railY + 2.45, Z);
      const lw2 = f * 0.45 / Z;
      S.strokeStyle = '#2a2a2d'; S.lineWidth = Math.max(0.7, f * 0.06 / Z);
      S.beginPath(); S.moveTo(lb[0] - lw2, lb[1]); S.lineTo(lb[0] + lw2, lb[1]); S.stroke();
      S.fillStyle = '#3a2525';
      for (const sx of [-1, 1]) { S.beginPath(); S.arc(lb[0] + sx * lw2, lb[1], Math.max(0.8, f * 0.14 / Z), 0, TAU); S.fill(); }
      // gate machine box
      const gb = p(X + (X < t ? -0.35 : 0.35), G.railY + 0.55, Z);
      S.fillStyle = '#c9c7bf';
      S.fillRect(gb[0] - f * 0.18 / Z, gb[1] - f * 0.4 / Z, f * 0.36 / Z, f * 0.9 / Z);
    }
  }
  await tick();

  // ─ the right bank, plaza and the bicycles ─
  {
    const plaza = [p(3.3, -0.35, 0.3), p(7.6, -0.35, 0.3), p(7.6, -0.35, 60), p(3.3, -0.35, 60)];
    const g = S.createLinearGradient(0, vpY, 0, H);
    g.addColorStop(0, '#a09c92'); g.addColorStop(0.2, '#938e83'); g.addColorStop(1, '#8a8478');
    fill(S, plaza, g);
    grimeOver(S, plaza, 0.4);
    dGround(plaza, -0.35, 0, 0);
    occ(plaza);
    // summer grass along the plaza's edge and fence foot
    const R = rng(43);
    const list = [];
    for (let k = 0; k < 2400; k++) {
      const z = 1 / lerp(1 / 1.0, 1 / 60, R());
      const X = R() < 0.7 ? lerp(3.3, 3.9, R()) : lerp(6.6, 7.6, R());
      const [x, y] = p(X, -0.35, z);
      const L = f * (0.25 + R() * 0.55) / z;
      const c = R() < 0.35 ? '#4d6538' : R() < 0.7 ? '#71884b' : R() < 0.9 ? '#93a462' : '#b7b783';
      list.push({ x0: x, y0: y, x1: x + (R() - 0.5) * L * 0.7, y1: y - L, c });
    }
    strokes(S, list, 1.1);
    // a few fleabane flowers (white) and evening primrose (yellow)
    const fl = [];
    for (let k = 0; k < 90; k++) {
      const z = 1 / lerp(1 / 2.5, 1 / 30, R());
      const X = lerp(3.3, 3.8, R());
      const [x, y] = p(X, -0.35 + 0.35 + R() * 0.35, z);
      fl.push({ x, y, r: Math.max(0.7, f * 0.018 / z), c: R() < 0.7 ? '#efeee6' : '#e7d36a' });
    }
    dabs(S, fl);
    // bank strip sway mask
    const sway = [p(3.3, -0.35, 0.4), p(3.95, -0.35, 0.4), p(3.95, -0.35, 60), p(3.3, -0.35, 60)];
    dGround(sway, -0.2, 0, 200);
  }
  // bike shelter + three bicycles
  {
    const b = G.bikes;
    const X0 = 4.0, X1 = 6.6, Z0 = 4.9, Z1 = 7.9, Yb = -0.35, Yr = 1.75;
    // posts
    S.fillStyle = '#7d817f';
    for (const [X, Z] of [[X0 + 0.05, Z0], [X1 - 0.05, Z0], [X0 + 0.05, Z1], [X1 - 0.05, Z1]]) {
      const a = p(X, Yb, Z), c = p(X, Yr, Z);
      S.fillRect(a[0] - f * 0.025 / Z, c[1], f * 0.05 / Z, a[1] - c[1]);
    }
    // bicycles in profile (wheels in the X-Y plane)
    const bikeCols = ['#9b3b36', '#c8c9c4', '#2f4f6a'];
    [5.35, 6.05, 6.75].forEach((Z, i) => {
      const k = f / Z;
      const rW = 0.33;
      const fx = X1 - 0.55, rx = X0 + 0.55 + 0.2;  // front wheel toward the road
      const wf = p(fx, Yb + rW, Z), wr = p(rx, Yb + rW, Z);
      S.lineWidth = Math.max(1, k * 0.035);
      S.strokeStyle = '#1e1e21';
      for (const w of [wf, wr]) { S.beginPath(); S.arc(w[0], w[1], rW * k, 0, TAU); S.stroke(); }
      S.lineWidth = Math.max(0.5, k * 0.008);
      S.strokeStyle = 'rgba(160,160,160,0.6)';
      for (const w of [wf, wr]) for (let s = 0; s < 8; s++) { const an = s / 8 * Math.PI; S.beginPath(); S.moveTo(w[0] + Math.cos(an) * rW * k, w[1] + Math.sin(an) * rW * k); S.lineTo(w[0] - Math.cos(an) * rW * k, w[1] - Math.sin(an) * rW * k); S.stroke(); }
      // step-through frame (mamachari)
      const bb = p((fx + rx) / 2 - 0.05, Yb + 0.3, Z), seat = p(rx + 0.25, Yb + 0.95, Z), head = p(fx - 0.12, Yb + 0.9, Z), bar = p(fx - 0.2, Yb + 1.08, Z);
      S.lineWidth = Math.max(1.2, k * 0.04);
      S.strokeStyle = bikeCols[i];
      S.beginPath();
      S.moveTo(wr[0], wr[1]); S.lineTo(bb[0], bb[1]); S.lineTo(seat[0], seat[1]);
      S.moveTo(bb[0], bb[1]); S.quadraticCurveTo(lerp(bb[0], head[0], 0.5), bb[1] + k * 0.05, head[0], head[1]);
      S.lineTo(wf[0], wf[1]);
      S.moveTo(wr[0], wr[1]); S.lineTo(seat[0], seat[1] + k * 0.08);
      S.stroke();
      // saddle, bar, basket, carrier
      S.fillStyle = '#26262a';
      S.fillRect(seat[0] - k * 0.12, seat[1] - k * 0.04, k * 0.24, k * 0.05);
      S.strokeStyle = '#2a2a2d'; S.lineWidth = Math.max(1, k * 0.025);
      S.beginPath(); S.moveTo(head[0], head[1]); S.lineTo(bar[0], bar[1]); S.lineTo(bar[0] - k * 0.18, bar[1] + k * 0.02); S.stroke();
      S.strokeStyle = 'rgba(70,70,74,0.9)'; S.lineWidth = Math.max(0.6, k * 0.012);
      const bk = p(fx + 0.12, Yb + 0.95, Z);
      S.strokeRect(bk[0] - k * 0.17, bk[1] - k * 0.12, k * 0.34, k * 0.24);
      for (let s = 1; s < 5; s++) { S.beginPath(); S.moveTo(bk[0] - k * 0.17 + s * k * 0.068, bk[1] - k * 0.12); S.lineTo(bk[0] - k * 0.17 + s * k * 0.068, bk[1] + k * 0.12); S.stroke(); }
      const cr = p(rx - 0.05, Yb + 0.82, Z);
      S.strokeStyle = '#3a3a3e'; S.lineWidth = Math.max(0.8, k * 0.02);
      S.beginPath(); S.moveTo(cr[0] - k * 0.2, cr[1]); S.lineTo(cr[0] + k * 0.25, cr[1]); S.stroke();
    });
    // corrugated roof seen from below
    const roof = P([[X0 - 0.2, Yr, Z0 - 0.2], [X1 + 0.2, Yr, Z0 - 0.2], [X1 + 0.2, Yr + 0.12, Z1 + 0.2], [X0 - 0.2, Yr + 0.12, Z1 + 0.2]]);
    fill(S, roof, '#6b7377');
    const edge = P([[X0 - 0.2, Yr, Z0 - 0.2], [X1 + 0.2, Yr, Z0 - 0.2], [X1 + 0.2, Yr + 0.08, Z0 - 0.2], [X0 - 0.2, Yr + 0.08, Z0 - 0.2]]);
    fill(S, edge, '#8e979a');
    const bbx = P([[X0 - 0.2, Yb, Z0], [X1 + 0.2, Yb, Z0], [X1 + 0.2, Yr + 0.12, Z0], [X0 - 0.2, Yr + 0.12, Z0]]);
    dFlat(bbx, (Z0 + Z1) / 2, 0, 0, 4);
    occ(bbx);
  }
  await tick();

  // ─ the platform ─
  const plat = [p(G.platEdge, 0, 0.3), p(G.platBack, 0, 0.3), p(G.platBack, 0, G.platEnd), p(G.platEdge, 0, G.platEnd)];
  {
    const g = S.createLinearGradient(0, vpY, 0, H + m);
    g.addColorStop(0, '#b3b0a7'); g.addColorStop(0.08, '#aaa79e'); g.addColorStop(0.5, '#a19d94'); g.addColorStop(1, '#97938a');
    fill(S, plat, g);
    grimeOver(S, plat, 0.42);
    // a worn path: lighter strip down the middle
    const worn = [p(-0.6, 0, 0.3), p(1.0, 0, 0.3), p(0.9, 0, G.platEnd), p(-0.4, 0, G.platEnd)];
    S.save(); path(S, worn); S.clip();
    const wg = S.createLinearGradient(p(-0.6, 0, 3)[0], 0, p(1.0, 0, 3)[0], 0);
    wg.addColorStop(0, 'rgba(210,206,196,0)'); wg.addColorStop(0.5, 'rgba(210,206,196,0.22)'); wg.addColorStop(1, 'rgba(210,206,196,0)');
    S.fillStyle = wg; S.fillRect(-m, vpY, TW, H);
    S.restore();
    // damp darkening near the edge
    const damp = [p(G.platEdge, 0, 0.3), p(-1.0, 0, 0.3), p(-1.0, 0, G.platEnd), p(G.platEdge, 0, G.platEnd)];
    fill(S, damp, 'rgba(70,66,58,0.12)');
    // expansion joints & repaired patches
    S.strokeStyle = 'rgba(66,62,55,0.45)';
    for (let z = 2; z < G.platEnd; z += 4) {
      const a = p(G.platEdge, 0, z), b = p(G.platBack, 0, z);
      S.lineWidth = Math.max(0.5, f * 0.012 / z);
      S.beginPath(); S.moveTo(a[0], a[1]); S.lineTo(b[0], b[1]); S.stroke();
    }
    const R = rng(101);
    for (let k = 0; k < 9; k++) {
      const z = lerp(3, 40, R()), X = lerp(-0.6, 2.6, R()), w = 0.5 + R() * 1.2, d = 0.4 + R() * 1.0;
      fill(S, [p(X, 0, z), p(X + w, 0, z), p(X + w, 0, z + d), p(X, 0, z + d)], `rgba(${R() < 0.5 ? '190,186,176' : '120,116,108'},${0.12 + R() * 0.12})`);
    }
    // cracks
    S.strokeStyle = 'rgba(55,50,45,0.5)';
    for (let k = 0; k < 14; k++) {
      let X = lerp(-1.4, 3.0, R()), z = lerp(2.2, 30, Math.pow(R(), 1.5));
      S.lineWidth = Math.max(0.5, f * 0.008 / z);
      S.beginPath();
      let q = p(X, 0, z); S.moveTo(q[0], q[1]);
      const n = 4 + ((R() * 6) | 0);
      for (let i = 0; i < n; i++) { X += (R() - 0.5) * 0.35; z += (R() - 0.3) * 0.5; q = p(X, 0, Math.max(1.5, z)); S.lineTo(q[0], q[1]); }
      S.stroke();
    }
    // broom marks — faint arcs in the dust near the shelter
    S.strokeStyle = 'rgba(214,210,200,0.16)';
    for (let k = 0; k < 40; k++) {
      const cxw = lerp(-0.2, 1.8, R()), czw = lerp(4.5, 7.2, R());
      const r = 0.25 + R() * 0.4;
      S.lineWidth = 0.8;
      S.beginPath();
      for (let s = 0; s <= 8; s++) {
        const an = lerp(-0.9, 0.9, s / 8) + Math.PI * 0.5;
        const q = p(cxw + Math.cos(an) * r, 0, czw + Math.sin(an) * r * 0.5);
        if (s) S.lineTo(q[0], q[1]); else S.moveTo(q[0], q[1]);
      }
      S.stroke();
    }
    dGround(plat, 0, 0, 0);
    occ(plat);
  }
  // edge coping, white line, tactile strip
  {
    const zMax = G.platEnd;
    const cop = [p(G.platEdge, 0.005, 0.3), p(G.platEdge + 0.32, 0.005, 0.3), p(G.platEdge + 0.32, 0.005, zMax), p(G.platEdge, 0.005, zMax)];
    fill(S, cop, '#bdb9ae');
    // the lip, seen as a thin dark line
    const lip = [p(G.platEdge, 0.005, 0.3), p(G.platEdge + 0.03, 0.005, 0.3), p(G.platEdge + 0.03, 0.005, zMax), p(G.platEdge, 0.005, zMax)];
    fill(S, lip, '#5f5b54');
    // white line, worn in places
    const R = rng(111);
    for (let z = 0.3; z < zMax; z += 0.7) {
      const z1 = z + 0.7;
      const a = 0.35 + 0.55 * vnoise1(z * 0.35, 4);
      fill(S, [p(G.whiteLine[0], 0.006, z), p(G.whiteLine[1], 0.006, z), p(G.whiteLine[1], 0.006, z1), p(G.whiteLine[0], 0.006, z1)], `rgba(232,229,220,${a})`);
    }
    // tactile paving
    const [t0, t1] = G.tactile;
    const ty = [p(t0, 0.006, 0.3), p(t1, 0.006, 0.3), p(t1, 0.006, zMax), p(t0, 0.006, zMax)];
    const g = S.createLinearGradient(0, vpY, 0, H);
    g.addColorStop(0, '#c9b878'); g.addColorStop(0.15, '#cdb35a'); g.addColorStop(1, '#c6a94a');
    fill(S, ty, g);
    grimeOver(S, ty, 0.35);
    // tile seams + dots
    for (let z = 0.3; z < 34; z += 0.3) {
      const a = p(t0, 0.007, z), b = p(t1, 0.007, z);
      S.strokeStyle = 'rgba(120,98,40,0.45)';
      S.lineWidth = Math.max(0.4, f * 0.006 / z);
      S.beginPath(); S.moveTo(a[0], a[1]); S.lineTo(b[0], b[1]); S.stroke();
      if (z < 14) {
        const dots = [];
        for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
          const X = lerp(t0, t1, (i + 0.5) / 5), Z = z + 0.3 * (j + 0.5) / 5;
          const [x, y] = p(X, 0.008, Z);
          const r = f * 0.012 / Z;
          if (r < 0.35) continue;
          dots.push({ x, y, r, k: 0.45, c: 'rgba(231,206,112,0.9)' });
          dots.push({ x, y: y + r * 0.35, r: r * 0.95, k: 0.4, c: 'rgba(128,104,44,0.35)' });
        }
        dabs(S, dots);
      }
    }
    // weeds in the gap between coping and the platform, and along the fence foot
    const list = [];
    for (let k = 0; k < 900; k++) {
      const z = 1 / lerp(1 / 1.0, 1 / 45, R());
      const X = R() < 0.55 ? G.platEdge + 0.33 + R() * 0.03 : G.platBack - 0.06 - R() * 0.1;
      const [x, y] = p(X, 0, z);
      const L = f * (0.04 + R() * 0.14) / z;
      list.push({ x0: x, y0: y, x1: x + (R() - 0.5) * L, y1: y - L, c: R() < 0.5 ? '#61773f' : '#8a9a55' });
    }
    strokes(S, list, 1);
  }
  // boarding-position marks and a little sign for the one-man car
  {
    const zr = G.stopZ + 17.6;
    const q = [p(-1.42, 0.007, zr - 0.5), p(-1.05, 0.007, zr - 0.5), p(-1.05, 0.007, zr + 0.5), p(-1.42, 0.007, zr + 0.5)];
    fill(S, q, 'rgba(230,228,220,0.55)');
  }
  // platform end: slope and a little railing
  {
    const z0 = G.platEnd;
    const sl = [p(G.platEdge, 0, z0), p(G.platBack, 0, z0), p(G.platBack, -0.9, z0 + 3.5), p(G.platEdge, -0.9, z0 + 3.5)];
    fill(S, sl, '#a29e95');
    S.strokeStyle = '#d4d2c9'; S.lineWidth = 1;
    const a = p(-1.0, 1.0, z0), b = p(2.8, 1.0, z0);
    S.beginPath(); S.moveTo(a[0], a[1]); S.lineTo(b[0], b[1]); S.stroke();
    for (const X of [-1.0, 0.9, 2.8]) { const c = p(X, 0, z0), d = p(X, 1.0, z0); S.beginPath(); S.moveTo(c[0], c[1]); S.lineTo(d[0], d[1]); S.stroke(); }
  }
  // the near telegraph pole beyond the fence, and the wires that cut the sky
  {
    const pl = G.pole;
    const o = pole(pl.x, pl.z, pl.top, -0.35, { arms: [[-0.35, 1.9], [-1.5, 1.3]], trans: true });
    // step bolts
    S.fillStyle = '#5a5853';
    for (let Y = 2.4; Y < 8; Y += 0.45) {
      const s = (Math.round(Y / 0.45) % 2 ? 1 : -1);
      const q = p(pl.x + s * 0.17, Y, pl.z);
      S.fillRect(q[0] - (s < 0 ? f * 0.12 / pl.z : 0), q[1], f * 0.12 / pl.z, Math.max(1, f * 0.02 / pl.z));
    }
    // a little plate with the pole's name
    const pq = P([[pl.x - 0.1, 1.9, pl.z - 0.16], [pl.x + 0.1, 1.9, pl.z - 0.16], [pl.x + 0.1, 2.2, pl.z - 0.16], [pl.x - 0.1, 2.2, pl.z - 0.16]]);
    fill(S, pq, '#e7e6df');
    // wires: along the road
    const r0 = roadPoles[0];
    for (const [dy, wd] of o.arms) for (const s of [-0.42, 0, 0.42]) wire([o.X + s * wd, o.top + dy + 0.1, o.Z], [r0.X + s * 1.8, r0.top + dy + 0.1, r0.Z], 0.012, 1.15, 0.85);
    wire([o.X - 0.2, o.top - 3.4, o.Z], [r0.X - 0.2, r0.top - 3.4, r0.Z], 0.02, 2.6, 0.85);
    // and across the line, over the fields
    for (const s of [-0.42, 0.42]) wire([o.X + s * 1.9, o.top - 0.25, o.Z], [fp1.X + s * 1.6, fp1.top - 0.25, fp1.Z], 0.016, 1.2, 0.85);
    // toward us (out of frame, the station's own feed)
    wire([o.X, o.top - 1.4, o.Z], [2.4, 4.2, 0.6], 0.03, 1.1, 0.75);
  }
  await tick();

  // fence along the back of the platform
  {
    const X = G.platBack - 0.04;
    const R = rng(121);
    for (let z = 0.6; z < G.platEnd; z += 2) {
      const a = p(X, 0, z), b = p(X, 1.12, z);
      const w = Math.max(1, f * 0.07 / z);
      const g = S.createLinearGradient(a[0] - w, 0, a[0] + w, 0);
      g.addColorStop(0, '#b8b5ab'); g.addColorStop(0.5, '#dedbd2'); g.addColorStop(1, '#a9a69c');
      S.fillStyle = g;
      S.fillRect(a[0] - w / 2, b[1], w, a[1] - b[1]);
      dFlat([[a[0] - w, b[1]], [a[0] + w, b[1]], [a[0] + w, a[1]], [a[0] - w, a[1]]], z, 0, 0, 2);
    }
    for (const Y of [0.55, 1.08]) {
      const pts = [];
      const pts2 = [];
      for (let z = 0.6; z <= G.platEnd; z += 1) { pts.push(p(X, Y, z)); pts2.push(p(X, Y - 0.07, z)); }
      const poly = pts.concat(pts2.reverse());
      fill(S, poly, '#d6d3ca');
      dWallX(poly, X, 0, 0);
      // peeling paint
      S.save(); path(S, poly); S.clip();
      for (let k = 0; k < 60; k++) {
        const z = lerp(0.6, 30, Math.pow(R(), 2));
        const [x, y] = p(X, Y - 0.03, z);
        S.fillStyle = 'rgba(110,92,74,0.5)';
        S.fillRect(x, y - 1, f * 0.05 / z, f * 0.04 / z);
      }
      S.restore();
    }
  }
  await tick();

  // platform lamps (old fluorescent fittings on curved arms)
  function lamp(z) {
    const X = 0.45;
    const base = p(X, 0, z), top = p(X, 3.3, z);
    const w = Math.max(1, f * 0.09 / z);
    const g = S.createLinearGradient(base[0] - w, 0, base[0] + w, 0);
    g.addColorStop(0, '#5f6d64'); g.addColorStop(0.5, '#86948a'); g.addColorStop(1, '#55625a');
    S.fillStyle = g; S.fillRect(base[0] - w / 2, top[1], w, base[1] - top[1]);
    // arm
    const end = p(X - 1.0, 3.45, z);
    S.strokeStyle = '#66746b'; S.lineWidth = Math.max(1, f * 0.05 / z);
    S.beginPath(); S.moveTo(top[0], top[1]); S.quadraticCurveTo(top[0], end[1] - f * 0.15 / z, end[0], end[1]); S.stroke();
    // fixture + shade
    const fx = P([[X - 1.45, 3.32, z - 0.08], [X - 0.55, 3.32, z - 0.08], [X - 0.55, 3.42, z - 0.08], [X - 1.45, 3.42, z - 0.08]]);
    fill(S, fx, '#d9dcd6');
    const tube = P([[X - 1.38, 3.28, z - 0.08], [X - 0.62, 3.28, z - 0.08], [X - 0.62, 3.32, z - 0.08], [X - 1.38, 3.32, z - 0.08]]);
    fill(S, tube, '#eef1ea');
    const bb = [[Math.min(fx[0][0], base[0]) - 3, top[1] - 6], [Math.max(fx[1][0], base[0]) + 3, top[1] - 6], [base[0] + 4, base[1]], [base[0] - 4, base[1]]];
    dFlat(bb, z, 0, 0, 3);
    occ([[base[0] - w, top[1]], [base[0] + w, top[1]], [base[0] + w, base[1]], [base[0] - w, base[1]]]);
    // light: the tube, a halo, and a pool on the platform
    emit(E1, 1, tube, 1);
    const tc = p(X - 1.0, 3.3, z);
    glow(E1, 1, tc[0], tc[1], f * 1.6 / z, 0.55);
    const pool = p(X - 1.0, 0, z);
    glow(E1, 1, pool[0], pool[1], f * 2.6 / z, 0.5, 0.32);
    return tc;
  }
  lamp(44);
  lamp(28);

  // the station name board (lit box, old JNR style with the line colour band)
  {
    const b = G.board;
    const bw = b.x1 - b.x0, bh = b.y1 - b.y0;
    const img = tex(bw, bh, 420, (c, w, h) => {
      c.fillStyle = '#f2f0e8'; c.fillRect(0, 0, w, h);
      // faded edges
      const vg = c.createLinearGradient(0, 0, 0, h);
      vg.addColorStop(0, 'rgba(160,140,100,0.12)'); vg.addColorStop(0.5, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(120,100,70,0.18)');
      c.fillStyle = vg; c.fillRect(0, 0, w, h);
      c.fillStyle = '#1d1d22';
      mtext(c, '夏ヶ原', w / 2, h * 0.2, h * 0.14, '"Noto Serif JP", serif', 'center', '600');
      mtext(c, 'なつがはら', w / 2, h * 0.55, h * 0.33, '"Zen Kaku Gothic New", "Hiragino Sans", sans-serif', 'center', '700');
      c.fillStyle = '#4a4a50';
      mtext(c, 'Natsugahara', w / 2, h * 0.68, h * 0.1, '"Zen Kaku Gothic New", sans-serif', 'center', '500');
      // line band
      c.fillStyle = '#d99a3c'; c.fillRect(0, h * 0.75, w, h * 0.25);
      c.fillStyle = '#fffaf0';
      mtext(c, 'ぎんざ →', w * 0.95, h * 0.9, h * 0.12, '"Zen Kaku Gothic New", sans-serif', 'right', '700');
      mtext(c, 'Ginza', w * 0.95, h * 0.97, h * 0.065, '"Zen Kaku Gothic New", sans-serif', 'right', '500');
      // the previous station, eaten by rust
      c.globalAlpha = 0.35; mtext(c, '←', w * 0.05, h * 0.9, h * 0.12, '"Zen Kaku Gothic New", sans-serif', 'left', '700'); c.globalAlpha = 1;
      const R = rng(5);
      for (let k = 0; k < 26; k++) {
        const x = w * (0.02 + R() * 0.32), y = h * (0.76 + R() * 0.22);
        c.fillStyle = `rgba(${120 + R() * 40},${60 + R() * 20},${30 + R() * 10},${0.4 + R() * 0.4})`;
        c.beginPath(); c.ellipse(x, y, w * (0.01 + R() * 0.04), h * (0.01 + R() * 0.035), R() * 3, 0, TAU); c.fill();
      }
      // rust streaks from the bolts
      for (const bx of [0.05, 0.95]) for (const by of [0.06, 0.7]) {
        c.fillStyle = 'rgba(70,60,50,0.8)';
        c.beginPath(); c.arc(w * bx, h * by, h * 0.018, 0, TAU); c.fill();
        const g = c.createLinearGradient(0, h * by, 0, h * (by + 0.28));
        g.addColorStop(0, 'rgba(140,80,40,0.45)'); g.addColorStop(1, 'rgba(140,80,40,0)');
        c.fillStyle = g; c.fillRect(w * bx - h * 0.012, h * by, h * 0.024 + R() * h * 0.01, h * 0.28);
      }
    });
    // legs
    for (const X of [b.x0 + 0.15, b.x1 - 0.15]) {
      const a = p(X, 0, b.z), c2 = p(X, b.y1, b.z);
      S.fillStyle = '#5e6762';
      const w = Math.max(1, f * 0.06 / b.z);
      S.fillRect(a[0] - w / 2, c2[1], w, a[1] - c2[1]);
    }
    // frame + face
    const fr = P([[b.x0 - 0.04, b.y0 - 0.04, b.z], [b.x1 + 0.04, b.y0 - 0.04, b.z], [b.x1 + 0.04, b.y1 + 0.06, b.z], [b.x0 - 0.04, b.y1 + 0.06, b.z]]);
    fill(S, fr, '#4f5753');
    texZ(img, b.x0, b.x1, b.y0, b.y1, b.z);
    const face = P([[b.x0, b.y0, b.z], [b.x1, b.y0, b.z], [b.x1, b.y1, b.z], [b.x0, b.y1, b.z]]);
    const full = [[fr[0][0] - 2, p(0, 0, b.z)[1]], [fr[1][0] + 2, p(0, 0, b.z)[1]], [fr[2][0] + 2, fr[2][1]], [fr[3][0] - 2, fr[3][1]]];
    dFlat(full, b.z, 0, 0, 4);
    occ(fr);
    emit(E1, 1, face, 0.85);
    const c = p((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, b.z);
    glow(E1, 1, c[0], c[1], f * 1.3 / b.z, 0.35, 0.6);
  }
  await tick();

  // ─ the waiting room (待合室) ─
  const sh = G.shelter;
  {
    const { x0, x1, z0, z1, hF, hB } = sh;
    const yAtZ = (z) => lerp(hF, hB, (z - z0) / (z1 - z0));
    const wood = hex('#5e4a3a');
    const R = rng(131);
    // planks texture
    const planks = (w, h, base, ppm = 160, dark = 0.8) => tex(w, h, ppm, (c, ww, hh) => {
      c.fillStyle = rgbs(base); c.fillRect(0, 0, ww, hh);
      const pw = 0.18;
      for (let x = 0; x < ww; x += pw) {
        const k = 0.86 + R() * 0.24;
        c.fillStyle = rgbs(shade(base, k)); c.fillRect(x, 0, pw, hh);
        c.fillStyle = `rgba(20,14,10,${0.5 * dark})`; c.fillRect(x, 0, 0.012, hh);
        // grain
        c.strokeStyle = `rgba(30,20,14,${0.12 + R() * 0.1})`; c.lineWidth = 0.004;
        for (let g = 0; g < 4; g++) { const gx = x + pw * R(); c.beginPath(); c.moveTo(gx, 0); c.bezierCurveTo(gx + 0.02, hh * 0.3, gx - 0.02, hh * 0.6, gx + 0.01, hh); c.stroke(); }
      }
      // weathering: lighter top, darker bottom (splash)
      const g = c.createLinearGradient(0, 0, 0, hh);
      g.addColorStop(0, 'rgba(255,250,240,0.05)'); g.addColorStop(0.75, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,16,12,0.35)');
      c.fillStyle = g; c.fillRect(0, 0, ww, hh);
    });
    // interior: back wall (constant Z) with things pinned to it
    const back = tex(x1 - x0, hB, 200, (c, w, h) => {
      const base = shade(wood, 0.72);
      c.fillStyle = rgbs(base); c.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 0.18) {
        c.fillStyle = rgbs(shade(base, 0.85 + R() * 0.25)); c.fillRect(x, 0, 0.18, h);
        c.fillStyle = 'rgba(15,10,8,0.5)'; c.fillRect(x, 0, 0.01, h);
      }
      const yy = (Y) => h - Y;  // Y up → canvas down
      // calendar (August), slightly crooked
      c.save(); c.translate(1.08 - x0 + 0.17, yy(1.5)); c.rotate(-0.03);
      c.fillStyle = '#ece8dc'; c.fillRect(-0.17, -0.25, 0.34, 0.5);
      c.fillStyle = '#7f9aa6'; c.fillRect(-0.15, -0.23, 0.30, 0.17);
      c.fillStyle = '#c9d2c4'; c.fillRect(-0.15, -0.12, 0.30, 0.06);
      c.fillStyle = '#5a6e7a'; c.beginPath(); c.moveTo(-0.15, -0.06); c.lineTo(-0.05, -0.15); c.lineTo(0.04, -0.09); c.lineTo(0.15, -0.16); c.lineTo(0.15, -0.06); c.fill();
      c.fillStyle = '#b8402f'; mtext(c, '8', 0, 0.03, 0.06, '"Zen Kaku Gothic New", sans-serif', 'center', '700');
      c.fillStyle = 'rgba(40,40,40,0.55)';
      for (let r = 0; r < 5; r++) for (let q = 0; q < 7; q++) c.fillRect(-0.14 + q * 0.04, 0.06 + r * 0.035, 0.02, 0.012);
      c.restore();
      // timetable board
      const t = G.timetable;
      c.fillStyle = '#e9e7df'; c.fillRect(t.x0 - x0, yy(t.y1), t.x1 - t.x0, t.y1 - t.y0);
      c.strokeStyle = '#3d4a5a'; c.lineWidth = 0.012; c.strokeRect(t.x0 - x0, yy(t.y1), t.x1 - t.x0, t.y1 - t.y0);
      c.fillStyle = '#2b3846'; c.fillRect(t.x0 - x0, yy(t.y1), t.x1 - t.x0, 0.07);
      c.fillStyle = 'rgba(30,30,34,0.75)';
      for (let r = 0; r < 7; r++) { c.fillRect(t.x0 - x0 + 0.04, yy(t.y1) + 0.1 + r * 0.055, 0.12, 0.02); c.fillRect(t.x0 - x0 + 0.27, yy(t.y1) + 0.1 + r * 0.055, 0.12, 0.02); }
      c.fillStyle = '#d6c56a'; c.fillRect(t.x0 - x0 + 0.27, yy(t.y1) + 0.1 + 5 * 0.055 - 0.008, 0.14, 0.04);
      // clock face (hands drawn live)
      const ck = G.clock;
      c.fillStyle = '#1e1e20'; c.beginPath(); c.arc(ck.x - x0, yy(ck.y), ck.r + 0.015, 0, TAU); c.fill();
      c.fillStyle = '#efede5'; c.beginPath(); c.arc(ck.x - x0, yy(ck.y), ck.r, 0, TAU); c.fill();
      c.fillStyle = '#333'; for (let k = 0; k < 12; k++) { const an = k / 12 * TAU; c.fillRect(ck.x - x0 + Math.cos(an) * ck.r * 0.82 - 0.005, yy(ck.y) + Math.sin(an) * ck.r * 0.82 - 0.005, 0.01, 0.01); }
      // the handwritten notice above the notebook
      c.save(); c.translate(1.75 - x0, yy(1.02)); c.rotate(0.02);
      c.fillStyle = '#f3f0e6'; c.fillRect(-0.2, -0.08, 0.4, 0.16);
      c.fillStyle = 'rgba(220,210,170,0.7)'; c.fillRect(-0.21, -0.09, 0.06, 0.03); c.fillRect(0.15, -0.09, 0.06, 0.03);
      c.fillStyle = '#2a2a33';
      mtext(c, '駅ノート', 0, -0.01, 0.045, '"Zen Kaku Gothic New", sans-serif', 'center', '700');
      mtext(c, 'ご自由にどうぞ', 0, 0.045, 0.028, '"Zen Kaku Gothic New", sans-serif', 'center', '400');
      c.restore();
      // the nail and string for the pen
      c.fillStyle = '#9b9b96'; c.beginPath(); c.arc(1.95 - x0, yy(0.9), 0.01, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(230,230,220,0.8)'; c.lineWidth = 0.006;
      c.beginPath(); c.moveTo(1.95 - x0, yy(0.9)); c.quadraticCurveTo(1.98 - x0, yy(0.66), 1.86 - x0, yy(0.62)); c.stroke();
      // bench backrest shadow line
      const sg = c.createLinearGradient(0, yy(0.62), 0, yy(0.42));
      sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,0.35)');
      c.fillStyle = sg; c.fillRect(0, yy(0.62), w, 0.2);
    });
    // ceiling / floor / walls interior
    const floor = P([[x0, 0.002, z0], [x1, 0.002, z0], [x1, 0.002, z1], [x0, 0.002, z1]]);
    fill(S, floor, '#7d776d');
    texZ(back, x0, x1, 0, hB, z1);
    // right inner wall
    const rw = planks(z1 - z0, hF, shade(wood, 0.62), 160, 1);
    texX(rw, x1 - 0.02, z0, z1, 0, hF, 0, hB, 20);
    // poster on the right inner wall (summer festival)
    {
      const pz0 = z0 + 1.15, pz1 = z0 + 1.85;
      const post = tex(0.7, 0.95, 220, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#2b3a6b'); g.addColorStop(0.55, '#b4506a'); g.addColorStop(1, '#e8b25a');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
        c.fillStyle = 'rgba(255,240,200,0.9)';
        for (let k = 0; k < 18; k++) { c.beginPath(); c.arc(w * (0.2 + R() * 0.6), h * (0.12 + R() * 0.3), 0.004 + R() * 0.01, 0, TAU); c.fill(); }
        c.fillStyle = '#fff6e4';
        mtext(c, '盆踊り', w / 2, h * 0.68, 0.12, '"Noto Serif JP", serif', 'center', '700');
        mtext(c, '八月十五日　夏ヶ原公民館', w / 2, h * 0.8, 0.045, '"Zen Kaku Gothic New", sans-serif', 'center', '400');
        c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(0, 0, w, h);
      });
      texX(post, x1 - 0.03, pz0, pz1, 1.05, 1.95, 1.05, 1.95, 10);
    }
    // ceiling (slopes down to the back), seen through the opening
    const ceil = P([[x0, hF - 0.08, z0], [x1, hF - 0.08, z0], [x1, hB - 0.08, z1], [x0, hB - 0.08, z1]]);
    fill(S, ceil, '#3e342c');
    // bench along the back wall
    const seatZ0 = z1 - 0.45, seatY = 0.42;
    const seatTop = P([[0.9, seatY, seatZ0], [3.0, seatY, seatZ0], [3.0, seatY, z1], [0.9, seatY, z1]]);
    fill(S, seatTop, '#8a725a');
    const seatFront = P([[0.9, seatY - 0.06, seatZ0], [3.0, seatY - 0.06, seatZ0], [3.0, seatY, seatZ0], [0.9, seatY, seatZ0]]);
    fill(S, seatFront, '#5f4c3b');
    S.strokeStyle = 'rgba(40,30,22,0.6)'; S.lineWidth = 0.7;
    for (let k = 1; k < 4; k++) {
      const zz = lerp(seatZ0, z1, k / 4);
      const a = p(0.9, seatY + 0.001, zz), b = p(3.0, seatY + 0.001, zz);
      S.beginPath(); S.moveTo(a[0], a[1]); S.lineTo(b[0], b[1]); S.stroke();
    }
    for (const X of [1.0, 1.95, 2.9]) {
      const a = p(X, 0, seatZ0 + 0.05), b = p(X, seatY - 0.06, seatZ0 + 0.05);
      S.fillStyle = '#3d3128'; S.fillRect(a[0] - f * 0.025 / seatZ0, b[1], f * 0.05 / seatZ0, a[1] - b[1]);
    }
    // cushions (sun-faded, two)
    const cushion = (cx, col, pat) => {
      const top = P([[cx - 0.22, seatY + 0.05, seatZ0 + 0.02], [cx + 0.22, seatY + 0.05, seatZ0 + 0.02], [cx + 0.22, seatY + 0.05, seatZ0 + 0.42], [cx - 0.22, seatY + 0.05, seatZ0 + 0.42]]);
      const fr2 = P([[cx - 0.22, seatY, seatZ0 + 0.02], [cx + 0.22, seatY, seatZ0 + 0.02], [cx + 0.22, seatY + 0.05, seatZ0 + 0.02], [cx - 0.22, seatY + 0.05, seatZ0 + 0.02]]);
      fill(S, fr2, rgbs(shade(hex(col), 0.7)));
      fill(S, top, col);
      if (pat) {
        S.fillStyle = pat;
        for (let k = 0; k < 6; k++) { const q = p(cx - 0.15 + R() * 0.3, seatY + 0.051, seatZ0 + 0.08 + R() * 0.3); S.beginPath(); S.arc(q[0], q[1], 1.2, 0, TAU); S.fill(); }
      }
    };
    cushion(1.18, '#5b6684', 'rgba(220,220,230,0.5)');
    cushion(2.55, '#a8766b', 'rgba(240,220,180,0.55)');
    // the notebook, leaning against the wall
    {
      const nb = G.notebook;
      const cover = tex(nb.x1 - nb.x0, nb.y1 - nb.y0, 600, (c, w, h) => {
        c.fillStyle = '#7f98a6'; c.fillRect(0, 0, w, h);
        const g = c.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.18)');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
        c.fillStyle = '#efeadc'; c.fillRect(w * 0.15, h * 0.12, w * 0.7, h * 0.26);
        c.fillStyle = '#222';
        mtext(c, '駅ノート', w / 2, h * 0.3, h * 0.11, '"Zen Kaku Gothic New", sans-serif', 'center', '700');
        c.fillStyle = '#5e6f78'; c.fillRect(0, 0, w * 0.06, h);
        c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(w * 0.94, 0, w * 0.06, h);
      });
      texZ(cover, nb.x0, nb.x1, nb.y0, nb.y1, nb.z);
      // pen hanging by its string
      const pz = nb.z + 0.05;
      const pen = P([[1.86, 0.62, pz], [1.875, 0.62, pz], [1.875, 0.5, pz], [1.86, 0.5, pz]]);
      fill(S, pen, '#2b3d7a');
    }
    // dark interior shading (the room is lit only by the sky through the front)
    {
      const inside = [p(x0 + 0.32, 0, z0), p(x1 - 0.32, 0, z0), p(x1 - 0.32, hF - 0.45, z0), p(x0 + 0.32, hF - 0.45, z0)];
      S.save(); path(S, inside); S.clip();
      const g = S.createLinearGradient(0, inside[2][1], 0, inside[0][1]);
      g.addColorStop(0, 'rgba(20,16,12,0.5)'); g.addColorStop(0.5, 'rgba(20,16,12,0.22)'); g.addColorStop(1, 'rgba(20,16,12,0.12)');
      S.fillStyle = g; S.fillRect(-m, -m, TW, TH);
      S.restore();
    }
    // interior depth + light from the tube
    const inner = [p(x0, 0, z1), p(x1, 0, z1), p(x1, hB, z1), p(x0, hB, z1)];
    dFlat([p(x0, 0, z0), p(x1, 0, z0), p(x1, hF, z0), p(x0, hF, z0)], 9.2, 0, 0, 0);
    occ([p(x0, -0.1, z0), p(x1, -0.1, z0), p(x1, hF, z0), p(x0, hF, z0)]);
    {
      // the tube hangs just inside the header; its light falls off toward the floor and the back
      const op = [p(x0, 0, z0), p(x1, 0, z0), p(x1, hF, z0), p(x0, hF, z0)];
      const tc = p((x0 + x1) / 2, hF - 0.12, z0 + 0.6);
      E1.save(); path(E1, op); E1.clip();
      glow(E1, 2, tc[0], tc[1], f * 2.6 / z0, 0.95, 1.0);
      E1.restore();
    }
    // left exterior wall (we see its outside, receding)
    const lw = planks(z1 - z0, hF, shade(wood, 0.92), 160);
    texX(lw, x0, z0, z1, 0, hF, 0, hB, 18);
    // a small window in it
    {
      const wq = P([[x0, 1.05, z0 + 1.0], [x0, 1.05, z0 + 2.1], [x0, 1.75, z0 + 2.1], [x0, 1.75, z0 + 1.0]]);
      const g = S.createLinearGradient(0, wq[3][1], 0, wq[0][1]);
      g.addColorStop(0, '#c9cfcf'); g.addColorStop(0.6, '#8e9696'); g.addColorStop(1, '#5b5f5e');
      fill(S, wq, g);
      S.strokeStyle = '#3a2d23'; S.lineWidth = 1.2; path(S, wq); S.stroke();
      const m1 = p(x0, 1.05, z0 + 1.55), m2 = p(x0, 1.75, z0 + 1.55);
      S.beginPath(); S.moveTo(m1[0], m1[1]); S.lineTo(m2[0], m2[1]); S.stroke();
    }
    const lwPoly = P([[x0, 0, z0], [x0, 0, z1], [x0, hB, z1], [x0, hF, z0]]);
    dWallX(lwPoly, x0, 0, 0);
    occ(lwPoly);
    // front: posts and the header beam (face Z = z0)
    const frontTex = planks(x1 - x0, hF, shade(wood, 1.05), 200);
    const fw = 0.32, beamY = 2.1;
    const leftPost = [x0, x0 + fw], rightPost = [x1 - fw, x1];
    S.save();
    const fp = (a, b, y0, y1) => P([[a, y0, z0], [b, y0, z0], [b, y1, z0], [a, y1, z0]]);
    path(S, fp(leftPost[0], leftPost[1], 0, hF)); S.clip();
    texZ(frontTex, x0, x1, 0, hF, z0); S.restore();
    S.save(); path(S, fp(rightPost[0], rightPost[1], 0, hF)); S.clip(); texZ(frontTex, x0, x1, 0, hF, z0); S.restore();
    S.save(); path(S, fp(x0, x1, beamY, hF)); S.clip(); texZ(frontTex, x0, x1, 0, hF, z0); S.restore();
    // inner edges of the posts (thickness)
    fill(S, P([[leftPost[1], 0, z0], [leftPost[1], 0, z0 + 0.1], [leftPost[1], beamY, z0 + 0.1], [leftPost[1], beamY, z0]]), '#3c3026');
    fill(S, fp(x0, x1, beamY - 0.04, beamY), 'rgba(30,22,16,0.7)');
    // the swallows' nest on the beam, under the eave
    {
      const n = G.nest;
      const c = p(n.x, n.y, z0 - 0.06);
      const r = f * 0.09 / z0;
      S.fillStyle = '#7b6650';
      S.beginPath(); S.ellipse(c[0], c[1], r * 1.2, r * 0.8, 0, 0, Math.PI); S.fill();
      S.fillStyle = 'rgba(60,46,34,0.7)';
      for (let k = 0; k < 14; k++) { S.beginPath(); S.arc(c[0] + (R() - 0.5) * r * 2, c[1] + R() * r * 0.6, r * 0.12, 0, TAU); S.fill(); }
      S.fillStyle = '#8f7a63'; S.fillRect(c[0] - r * 1.2, c[1] - r * 0.08, r * 2.4, r * 0.16);
      // the little cardboard notice on the post below
      const sq = P([[x0 + 0.02, 1.45, z0 - 0.01], [x0 + 0.3, 1.45, z0 - 0.01], [x0 + 0.3, 1.72, z0 - 0.01], [x0 + 0.02, 1.72, z0 - 0.01]]);
      fill(S, sq, '#d9c8a4');
      S.fillStyle = 'rgba(40,40,40,0.75)';
      const sc = p(x0 + 0.16, 1.62, z0);
      for (let k = 0; k < 4; k++) S.fillRect(sc[0] - f * 0.1 / z0, sc[1] + k * f * 0.045 / z0, f * (0.2 - k * 0.03) / z0, Math.max(0.6, f * 0.012 / z0));
    }
    // eave: soffit (we see it from below) and the fascia
    const ez = z0 - sh.eave;
    const soffit = P([[x0 - 0.18, hF, ez], [x1 + 0.18, hF, ez], [x1 + 0.18, hF - 0.02, z0], [x0 - 0.18, hF - 0.02, z0]]);
    fill(S, soffit, '#3a2f27');
    const sideSoffit = P([[x0 - 0.18, hF, ez], [x0 - 0.18, hF - 0.02, z0], [x0 - 0.18, hB + 0.03, z1 + 0.15], [x0 - 0.18, hB + 0.05, z1 + 0.15]]);
    fill(S, sideSoffit, '#41362d');
    const fascia = P([[x0 - 0.18, hF, ez], [x1 + 0.18, hF, ez], [x1 + 0.18, hF + 0.14, ez], [x0 - 0.18, hF + 0.14, ez]]);
    fill(S, fascia, '#7f9a90');
    grimeOver(S, fascia, 0.5);
    // corrugated edge of the tin roof
    {
      const a = p(x0 - 0.18, hF + 0.14, ez), b = p(x1 + 0.18, hF + 0.14, ez);
      const n = Math.round((x1 - x0 + 0.36) / 0.076);
      const step = (b[0] - a[0]) / n;
      S.fillStyle = '#8a5a44';
      S.beginPath(); S.moveTo(a[0], a[1]);
      for (let k = 0; k < n; k++) S.quadraticCurveTo(a[0] + step * (k + 0.5), a[1] - step * 0.45, a[0] + step * (k + 1), a[1]);
      S.lineTo(b[0], a[1] + 1); S.lineTo(a[0], a[1] + 1); S.fill();
      // rust drips on the fascia
      for (let k = 0; k < 12; k++) {
        const x = lerp(a[0], b[0], R());
        const g = S.createLinearGradient(0, a[1], 0, a[1] + f * 0.14 / ez);
        g.addColorStop(0, 'rgba(130,70,40,0.55)'); g.addColorStop(1, 'rgba(130,70,40,0)');
        S.fillStyle = g; S.fillRect(x, a[1], 1 + R() * 2, f * 0.14 / ez);
      }
    }
    const shelterBB = [p(x0 - 0.2, 0, z0), p(x1 + 0.2, 0, z0), p(x1 + 0.2, hF + 0.16, ez), p(x0 - 0.2, hF + 0.16, ez)];
    const frontPoly = [p(x0, 0, z0), p(x0, hF, z0), p(x0 - 0.18, hF + 0.14, ez), p(x1 + 0.18, hF + 0.14, ez), p(x1, hF, z0), p(x1, 0, z0), p(rightPost[0], 0, z0), p(rightPost[0], beamY, z0), p(leftPost[1], beamY, z0), p(leftPost[1], 0, z0)];
    dFlat(frontPoly, z0, 0, 0, 5);
    occ(frontPoly);
    emit(E1, 2, soffit, 0.25);
    // spill of the tube onto the platform in front of the opening
    {
      const c = p((leftPost[1] + rightPost[0]) / 2, 0, z0 - 0.9);
      glow(E1, 2, c[0], c[1], f * 2.0 / z0, 0.55, 0.35);
    }
    // newspaper under the nest, held down by a stone
    {
      const nz0 = z0 - 0.8;
      const nq = P([[0.66, 0.004, nz0], [1.28, 0.004, nz0 - 0.04], [1.3, 0.004, nz0 + 0.7], [0.7, 0.004, nz0 + 0.75]]);
      fill(S, nq, '#cfccc2');
      S.save(); path(S, nq); S.clip();
      S.fillStyle = 'rgba(60,60,60,0.25)';
      for (let k = 0; k < 18; k++) { const q = p(0.72 + R() * 0.5, 0.005, nz0 + 0.05 + k * 0.035); S.fillRect(q[0], q[1], f * (0.2 + R() * 0.25) / (nz0 + 0.3), 0.7); }
      S.fillStyle = 'rgba(250,250,246,0.85)';
      for (let k = 0; k < 9; k++) { const q = p(0.8 + R() * 0.35, 0.006, nz0 + 0.15 + R() * 0.45); S.beginPath(); S.arc(q[0], q[1], 1 + R() * 1.4, 0, TAU); S.fill(); }
      S.restore();
      const sz = nz0 + 0.05, st = p(1.24, 0.03, sz);
      S.fillStyle = '#6f6c66'; S.beginPath(); S.ellipse(st[0], st[1], f * 0.06 / sz, f * 0.035 / sz, 0, 0, TAU); S.fill();
      S.fillStyle = 'rgba(255,255,255,0.18)'; S.beginPath(); S.ellipse(st[0] - 1, st[1] - 1, f * 0.03 / sz, f * 0.015 / sz, 0, 0, TAU); S.fill();
    }
    // a potted plant someone waters, and a bamboo broom against the post
    {
      const pz = z0 - 0.28, px = 2.92;
      const pot = P([[px - 0.14, 0, pz], [px + 0.14, 0, pz], [px + 0.17, 0.26, pz], [px - 0.17, 0.26, pz]]);
      fill(S, pot, '#9a5a3c');
      fill(S, P([[px - 0.18, 0.24, pz], [px + 0.18, 0.24, pz], [px + 0.18, 0.29, pz], [px - 0.18, 0.29, pz]]), '#a8664a');
      const list = [];
      for (let k = 0; k < 70; k++) {
        const q = p(px + (R() - 0.5) * 0.36, 0.3 + R() * 0.32, pz);
        list.push({ x: q[0], y: q[1], r: f * 0.035 / pz, c: R() < 0.5 ? '#3f5a35' : '#5d7a4a' });
      }
      for (let k = 0; k < 9; k++) {
        const q = p(px + (R() - 0.5) * 0.3, 0.45 + R() * 0.2, pz - 0.02);
        list.push({ x: q[0], y: q[1], r: f * 0.03 / pz, c: '#e19a3a' });
      }
      dabs(S, list);
      const bx = 3.06;
      const b0 = p(bx - 0.08, 0.02, z0 - 0.1), b1 = p(bx, 1.4, z0 - 0.02);
      const bz = z0 - 0.1;
      S.strokeStyle = '#a88f5c'; S.lineWidth = Math.max(1, f * 0.03 / bz);
      S.beginPath(); S.moveTo(b0[0], b0[1] - f * 0.4 / bz); S.lineTo(b1[0], b1[1]); S.stroke();
      S.strokeStyle = 'rgba(120,96,58,0.85)'; S.lineWidth = 0.8;
      for (let k = 0; k < 16; k++) { S.beginPath(); S.moveTo(b0[0] + (k - 8) * 0.25, b0[1] - f * 0.42 / bz); S.lineTo(b0[0] + (k - 8) * f * 0.012 / bz * 2, b0[1]); S.stroke(); }
      const bb = [[Math.min(pot[0][0], b0[0]) - 3, b1[1]], [b0[0] + 6, b1[1]], [b0[0] + 6, pot[1][1]], [pot[0][0] - 3, pot[0][1]]];
      dFlat(bb, z0 - 0.2, 0, 0, 3);
    }
    // ambient occlusion at the shelter's foot
    const ao = [p(x0 - 0.2, 0.002, z0 - 0.35), p(x1 + 0.2, 0.002, z0 - 0.35), p(x1, 0.002, z0), p(x0, 0.002, z0)];
    const g = S.createLinearGradient(0, ao[0][1], 0, ao[3][1]);
    g.addColorStop(0, 'rgba(30,26,22,0)'); g.addColorStop(1, 'rgba(30,26,22,0.3)');
    fill(S, ao, g);
  }
  await tick();

  // ─ the vending machine ─
  {
    const v = G.vend;
    const vw = v.x1 - v.x0, vh = v.h;
    const R = rng(151);
    const front = tex(vw, vh, 420, (c, w, h) => {
      const yy = (Y) => h - Y;
      // body
      c.fillStyle = '#e1e4e1'; c.fillRect(0, 0, w, h);
      const g = c.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.08)'); g.addColorStop(0.5, 'rgba(255,255,255,0.06)'); g.addColorStop(1, 'rgba(0,0,0,0.12)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      // header band
      c.fillStyle = '#2f6aa3'; c.fillRect(0.03, yy(1.81), w - 0.06, 0.14);
      c.fillStyle = '#f4f7fa';
      mtext(c, 'つめたい　のみもの', w / 2, yy(1.715), 0.07, '"Zen Kaku Gothic New", sans-serif', 'center', '700');
      // display window (lit)
      const dx0 = 0.07, dx1 = w - 0.07, dy0 = 1.0, dy1 = 1.64;
      const dg = c.createLinearGradient(0, yy(dy1), 0, yy(dy0));
      dg.addColorStop(0, '#f2f8fb'); dg.addColorStop(1, '#d9e6ee');
      c.fillStyle = dg; c.fillRect(dx0, yy(dy1), dx1 - dx0, dy1 - dy0);
      const drinks = [
        ['#3f7d4a', 'b'], ['#2b2b2e', 'c'], ['#e08a2e', 'c'], ['#4fa3d8', 'b'], ['#a0723f', 'b'], ['#f0efe8', 'c'],
        ['#c23b32', 'c'], ['#6aa83c', 'b'], ['#1f3f78', 'c'], ['#d9c84a', 'c'], ['#86512f', 'c'], ['#9fd3e6', 'b'],
        ['#37563d', 'b'], ['#e5e3dc', 'b'], ['#b33d5c', 'c'], ['#2c5f8a', 'c'], ['#f1b64a', 'b'], ['#4b4b4f', 'c'],
      ];
      const cols = 6, rows = 3;
      const cw = (dx1 - dx0) / cols, rh = (dy1 - dy0) / rows;
      for (let r = 0; r < rows; r++) {
        for (let k = 0; k < cols; k++) {
          const [col, kind] = drinks[r * cols + k];
          const cx = dx0 + cw * (k + 0.5), base = dy1 - rh * r - rh * 0.3;
          const bw = kind === 'b' ? cw * 0.42 : cw * 0.5, bh = kind === 'b' ? rh * 0.62 : rh * 0.48;
          c.fillStyle = col;
          c.beginPath();
          if (kind === 'b') {
            c.moveTo(cx - bw / 2, yy(base - bh)); c.lineTo(cx - bw / 2, yy(base - bh * 0.35)); c.quadraticCurveTo(cx - bw / 2, yy(base - bh * 0.15), cx - bw * 0.18, yy(base - bh * 0.08));
            c.lineTo(cx + bw * 0.18, yy(base - bh * 0.08)); c.quadraticCurveTo(cx + bw / 2, yy(base - bh * 0.15), cx + bw / 2, yy(base - bh * 0.35)); c.lineTo(cx + bw / 2, yy(base - bh));
            c.closePath(); c.fill();
            c.fillStyle = '#f5f5f0'; c.fillRect(cx - bw * 0.16, yy(base - bh * 0.02), bw * 0.32, bh * 0.08);
            c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(cx - bw / 2, yy(base - bh * 0.55), bw, bh * 0.2);
          } else {
            c.fillRect(cx - bw / 2, yy(base), bw, bh);
            c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(cx - bw / 2, yy(base - bh * 0.3), bw, bh * 0.16);
            c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(cx + bw * 0.25, yy(base), bw * 0.25, bh);
          }
          c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(cx - bw / 2 + bw * 0.08, yy(base), bw * 0.1, bh * 0.9);
          // price + つめたい strip + button
          c.fillStyle = '#3e8fd0'; c.fillRect(dx0 + cw * k + 0.006, yy(base - rh * 0.17), cw - 0.012, rh * 0.09);
          c.fillStyle = '#fff';
          mtext(c, '120', cx, yy(base - rh * 0.245), 0.024, '"Zen Kaku Gothic New", sans-serif', 'center', '700');
          c.fillStyle = '#e9edef'; c.fillRect(cx - cw * 0.28, yy(base - rh * 0.29), cw * 0.56, rh * 0.06);
        }
      }
      // glass reflection
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.beginPath(); c.moveTo(dx0, yy(dy1)); c.lineTo(dx0 + 0.18, yy(dy1)); c.lineTo(dx0 + 0.02, yy(dy0)); c.lineTo(dx0, yy(dy0)); c.fill();
      c.strokeStyle = '#9aa3a8'; c.lineWidth = 0.012; c.strokeRect(dx0, yy(dy1), dx1 - dx0, dy1 - dy0);
      // lower panel: illustration of a cool drink, coin slot, roulette, return
      c.fillStyle = '#2f6aa3'; c.fillRect(0.07, yy(0.98), 0.52, 0.4);
      const lg = c.createLinearGradient(0, yy(0.98), 0, yy(0.58));
      lg.addColorStop(0, '#6fb7e6'); lg.addColorStop(1, '#2f6aa3');
      c.fillStyle = lg; c.fillRect(0.07, yy(0.98), 0.52, 0.4);
      c.fillStyle = 'rgba(255,255,255,0.85)';
      mtext(c, '冷えてます', 0.11, yy(0.72), 0.06, '"Noto Serif JP", serif', 'left', '700');
      c.fillStyle = 'rgba(255,255,255,0.5)';
      for (let k = 0; k < 7; k++) { c.beginPath(); c.arc(0.38 + R() * 0.16, yy(0.88 - R() * 0.25), 0.006 + R() * 0.012, 0, TAU); c.fill(); }
      // coin slot & buttons
      c.fillStyle = '#b9bec0'; c.fillRect(w - 0.25, yy(0.98), 0.18, 0.4);
      c.fillStyle = '#2b2b2e'; c.fillRect(w - 0.17, yy(0.93), 0.012, 0.06);
      c.fillStyle = '#d23a2f'; c.beginPath(); c.arc(w - 0.12, yy(0.8), 0.018, 0, TAU); c.fill();
      c.fillStyle = '#2b2b2e'; c.fillRect(w - 0.22, yy(0.7), 0.12, 0.025);
      // the lucky-number roulette (digits drawn live)
      c.fillStyle = '#1a0f0f'; c.fillRect(0.62, yy(0.9), 0.17, 0.07);
      c.fillStyle = 'rgba(160,40,30,0.35)';
      mtext(c, '8888', 0.705, yy(0.845), 0.05, '"IBM Plex Mono", monospace', 'center', '700');
      c.fillStyle = '#2c2c30';
      mtext(c, '当たりが出たら もう1本', 0.705, yy(0.79), 0.02, '"Zen Kaku Gothic New", sans-serif', 'center', '700');
      // dispenser
      c.fillStyle = '#2a2c2e'; c.fillRect(0.12, yy(0.42), w - 0.24, 0.28);
      c.fillStyle = '#3d4144'; c.fillRect(0.14, yy(0.4), w - 0.28, 0.12);
      c.fillStyle = '#e9ecee'; mtext(c, 'とりだしぐち', w / 2, yy(0.2), 0.025, '"Zen Kaku Gothic New", sans-serif', 'center', '700');
      c.fillStyle = '#4b4f52'; c.fillRect(0, yy(0.08), w, 0.08);
      // grime + sticker
      c.fillStyle = 'rgba(120,110,90,0.12)'; c.fillRect(0, yy(0.3), w, 0.3);
    });
    texZ(front, v.x0, v.x1, 0, vh, v.z0);
    // side panel (receding), white with a sticker
    const side = tex(v.z1 - v.z0, vh, 200, (c, w, h) => {
      c.fillStyle = '#c9ccc9'; c.fillRect(0, 0, w, h);
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(60,55,45,0.25)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = '#2f6aa3'; c.fillRect(0, 0, w, 0.12);
      c.fillStyle = '#efe9d6'; c.fillRect(0.15, 0.7, 0.32, 0.18);
      c.fillStyle = 'rgba(40,40,40,0.6)'; for (let k = 0; k < 4; k++) c.fillRect(0.18, 0.74 + k * 0.035, 0.25 - k * 0.04, 0.012);
    });
    texX(side, v.x0, v.z0, v.z1, 0, vh, 0, vh, 8);
    const sidePoly = P([[v.x0, 0, v.z0], [v.x0, 0, v.z1], [v.x0, vh, v.z1], [v.x0, vh, v.z0]]);
    const frontPoly = P([[v.x0, 0, v.z0], [v.x1, 0, v.z0], [v.x1, vh, v.z0], [v.x0, vh, v.z0]]);
    dFlat(frontPoly, v.z0, 0, 0, 6);
    dFlat(sidePoly, (v.z0 + v.z1) / 2, 0, 0, 4);
    occ(frontPoly); occ(sidePoly);
    // can bin beside it
    {
      const bz = v.z0 + 0.05, bx0 = v.x0 - 0.42, bx1 = v.x0 - 0.06, bh2 = 0.82;
      const fq = P([[bx0, 0, bz], [bx1, 0, bz], [bx1, bh2, bz], [bx0, bh2, bz]]);
      fill(S, fq, '#3e78ad');
      const sq = P([[bx0, 0, bz], [bx0, 0, bz + 0.36], [bx0, bh2, bz + 0.36], [bx0, bh2, bz]]);
      fill(S, sq, '#2f5e8a');
      const hc = p((bx0 + bx1) / 2, bh2 - 0.18, bz);
      S.fillStyle = '#16212b'; S.beginPath(); S.arc(hc[0], hc[1], f * 0.06 / bz, 0, TAU); S.fill();
      S.fillStyle = '#f2f4f6'; S.font = `700 ${f * 0.05 / bz}px "Zen Kaku Gothic New", sans-serif`; S.textAlign = 'center';
      const tc = p((bx0 + bx1) / 2, bh2 - 0.42, bz); S.fillText('あきかん', tc[0], tc[1]);
      const tb = [[fq[0][0] - 2, fq[0][1]], [fq[1][0] + 2, fq[1][1]], [fq[2][0] + 2, fq[2][1] - 2], [fq[3][0] - 2, fq[3][1] - 2]];
      dFlat(tb, bz, 0, 0, 3); occ(fq);
    }
    // shadow / AO under it
    const ao = [p(v.x0 - 0.45, 0.002, v.z0 - 0.3), p(v.x1 + 0.05, 0.002, v.z0 - 0.3), p(v.x1, 0.002, v.z0), p(v.x0 - 0.45, 0.002, v.z0)];
    const ag = S.createLinearGradient(0, ao[0][1], 0, ao[3][1]);
    ag.addColorStop(0, 'rgba(30,28,24,0)'); ag.addColorStop(1, 'rgba(30,28,24,0.35)');
    fill(S, ao, ag);
    // its light: the display, a halo, and the pool on the concrete
    const disp = P([[v.x0 + 0.07, 1.0, v.z0], [v.x1 - 0.07, 1.0, v.z0], [v.x1 - 0.07, 1.64, v.z0], [v.x0 + 0.07, 1.64, v.z0]]);
    emit(E1, 0, disp, 1);
    emit(E1, 0, frontPoly, 0.28);
    emit(E1, 0, P([[v.x0 + 0.03, 1.67, v.z0], [v.x1 - 0.03, 1.67, v.z0], [v.x1 - 0.03, 1.81, v.z0], [v.x0 + 0.03, 1.81, v.z0]]), 0.8);
    const dc = p((v.x0 + v.x1) / 2, 1.3, v.z0);
    glow(E1, 0, dc[0], dc[1], f * 0.9 / v.z0, 0.4);
    const pool = p((v.x0 + v.x1) / 2 - 0.2, 0, v.z0 - 0.9);
    glow(E1, 0, pool[0], pool[1], f * 1.6 / v.z0, 0.7, 0.4);
  }
  await tick();

  // ─ the final painterly pass: paper grain + a whisper of warm/cool variation ─
  {
    S.save();
    S.globalCompositeOperation = 'source-atop';
    grainPat.setTransform(new DOMMatrix().scale(0.5));
    S.globalAlpha = 0.07;
    S.fillStyle = grainPat; S.fillRect(-m, -m, TW, TH);
    S.restore();
  }

  return { far: farC, scene: sceneC, aux: auxC, e1: e1C, e2: e2C, nearPts };
}
