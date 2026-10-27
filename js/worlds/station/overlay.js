// 夏ヶ原 — the living layer, drawn every frame on a 2D canvas over the painting:
// the one-car train, swallows, dragonflies, crows, bats and moths, the furin, the clock's hands,
// the crossing's lamps and gates, the vending machine's lucky-number roulette.

import { G, project, trackXAt, rng, clamp, lerp, smooth } from './geom.js';

const TAU = Math.PI * 2;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h));
  return c;
}
function mtext(c, s, x, y, size, font, align = 'center', weight = '400') {
  const t = c.getTransform();
  const sc = Math.hypot(t.a, t.b);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.font = `${weight} ${size * sc}px ${font}`; c.textAlign = align; c.textBaseline = 'alphabetic';
  c.fillText(s, t.a * x + t.c * y + t.e, t.b * x + t.d * y + t.f);
  c.restore();
}
function tex(wm, hm, ppm, draw) {
  const c = canvas(wm * ppm, hm * ppm);
  const x = c.getContext('2d');
  x.scale(c.width / wm, c.height / hm);
  x.lineJoin = 'round'; x.lineCap = 'round';
  draw(x, wm, hm);
  return c;
}
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// ── the railcar: a KiHa-like one-car diesel in faded cream and vermilion ──
const CAR = { len: G.carLen, w: 2.9, bodyY0: 0.02, eave: 2.62, roof: 2.97, under: G.railY + 0.18 };
const CREAM = '#ddd0b0', RED = '#b4533f';
const DOOR_U = [[1.15, 2.15], [19.15, 20.15]];

function trainTextures() {
  const H = CAR.eave - CAR.bodyY0;
  const R = rng(1986);
  const yy = (Y) => H - (Y - CAR.bodyY0);
  const sill = 0.98, head = 1.98;
  const wins = [];
  for (let k = 0; k < 10; k++) { const u0 = 2.75 + k * 1.585; wins.push([u0, u0 + 1.05]); }
  const sideDay = tex(CAR.len, H, 80, (c, w, h) => {
    c.fillStyle = RED; c.fillRect(0, 0, w, h);
    c.fillStyle = CREAM; c.fillRect(0, yy(head + 0.36), w, (head + 0.36) - (sill + 0.02));
    // seams
    c.fillStyle = 'rgba(60,40,30,0.35)';
    c.fillRect(0, yy(sill + 0.02), w, 0.012); c.fillRect(0, yy(head + 0.36), w, 0.012);
    // gutter
    c.fillStyle = '#7d7a72'; c.fillRect(0, 0, w, 0.06);
    // windows: aluminium frames, dark glass reflecting the sky
    for (const [a, b] of wins) {
      c.fillStyle = '#b9bbb6'; c.fillRect(a - 0.03, yy(head + 0.03), b - a + 0.06, head - sill + 0.06);
      const g = c.createLinearGradient(0, yy(head), 0, yy(sill + 0.05));
      g.addColorStop(0, '#9aa2a4'); g.addColorStop(0.45, '#596165'); g.addColorStop(1, '#3b4144');
      c.fillStyle = g; c.fillRect(a, yy(head), b - a, head - sill - 0.03);
      c.fillStyle = '#b9bbb6'; c.fillRect(a, yy((head + sill) / 2 + 0.06), b - a, 0.035);
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(a + 0.05, yy(head - 0.02), 0.18, head - sill - 0.1);
    }
    // doors
    for (const [a, b] of DOOR_U) {
      c.fillStyle = 'rgba(40,28,22,0.55)';
      c.fillRect(a - 0.02, yy(2.2), 0.02, 2.2); c.fillRect(b, yy(2.2), 0.02, 2.2);
      c.fillRect((a + b) / 2 - 0.006, yy(2.15), 0.012, 2.1);
      for (const s of [a + 0.12, (a + b) / 2 + 0.08]) {
        const g = c.createLinearGradient(0, yy(2.0), 0, yy(1.25));
        g.addColorStop(0, '#9aa2a4'); g.addColorStop(1, '#40474a');
        c.fillStyle = '#b9bbb6'; c.fillRect(s - 0.02, yy(2.03), 0.34, 0.81);
        c.fillStyle = g; c.fillRect(s, yy(2.0), 0.3, 0.75);
      }
      c.fillStyle = 'rgba(30,24,20,0.6)'; c.fillRect(a, yy(0.12), b - a, 0.1);
    }
    // cab side windows
    for (const [a, b] of [[0.28, 0.92], [20.38, 21.02]]) {
      c.fillStyle = '#b9bbb6'; c.fillRect(a - 0.03, yy(head + 0.03), b - a + 0.06, 0.92);
      c.fillStyle = '#4a5155'; c.fillRect(a, yy(head), b - a, 0.86);
    }
    // the destination plate (サボ), the one-man sign, the number
    c.fillStyle = '#f1efe6'; c.fillRect(2.25, yy(1.86), 0.42, 0.18);
    c.fillStyle = '#1f1f24'; mtext(c, 'ぎんざ 行', 2.46, yy(1.72), 0.07, '"Zen Kaku Gothic New", sans-serif', 'center', '700');
    c.fillStyle = '#e3d248'; c.fillRect(0.3, yy(1.05), 0.6, 0.15);
    c.fillStyle = '#1d3f2a'; mtext(c, 'ワンマン', 0.6, yy(0.94), 0.08, '"Zen Kaku Gothic New", sans-serif', 'center', '700');
    c.fillStyle = 'rgba(240,232,210,0.85)';
    mtext(c, 'キハ 40  1986', 3.4, yy(0.6), 0.1, '"Zen Kaku Gothic New", sans-serif', 'left', '700');
    // weathering: soot along the bottom, rust drips from the sills
    const gg = c.createLinearGradient(0, yy(0.6), 0, h);
    gg.addColorStop(0, 'rgba(40,30,25,0)'); gg.addColorStop(1, 'rgba(40,30,25,0.45)');
    c.fillStyle = gg; c.fillRect(0, yy(0.6), w, 0.6);
    for (let k = 0; k < 40; k++) {
      const x = R() * w, y = yy(sill - 0.02);
      const g = c.createLinearGradient(0, y, 0, y + 0.3 + R() * 0.5);
      g.addColorStop(0, 'rgba(90,50,30,0.35)'); g.addColorStop(1, 'rgba(90,50,30,0)');
      c.fillStyle = g; c.fillRect(x, y, 0.012 + R() * 0.02, 0.8);
    }
    c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(0, yy(head + 0.36), w, 0.15);
  });
  // the lit version: windows warm with fluorescent light, seat backs, straps
  const sideLit = tex(CAR.len, H, 80, (c, w, h) => {
    const lit = (a, b, y0, y1) => {
      const g = c.createLinearGradient(0, yy(y1), 0, yy(y0));
      g.addColorStop(0, '#fffaf0'); g.addColorStop(0.3, '#f6eedb'); g.addColorStop(1, '#e9dcc0');
      c.fillStyle = g; c.fillRect(a, yy(y1), b - a, y1 - y0);
      c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillRect(a, yy(y1), b - a, 0.05);
    };
    for (const [a, b] of wins) {
      lit(a, b, sill + 0.05, head);
      // box-seat backs (moquette blue) and a strap
      c.fillStyle = '#4c6e78'; c.fillRect(a + 0.05, yy(sill + 0.38), 0.32, 0.33); c.fillRect(b - 0.37, yy(sill + 0.38), 0.32, 0.33);
      c.fillStyle = 'rgba(60,60,60,0.55)';
      c.beginPath(); c.arc((a + b) / 2, yy(head - 0.38), 0.05, 0, TAU); c.lineWidth = 0.012; c.strokeStyle = 'rgba(70,70,70,0.6)'; c.stroke();
      c.fillRect((a + b) / 2 - 0.005, yy(head), 0.01, 0.33);
      c.fillStyle = '#b9bbb6'; c.fillRect(a, yy((head + sill) / 2 + 0.06), b - a, 0.035);
    }
    for (const [a, b] of DOOR_U) for (const s of [a + 0.12, (a + b) / 2 + 0.08]) lit(s, s + 0.3, 1.25, 2.0);
  });
  // front face
  const FW = CAR.w, FH = CAR.roof - CAR.under;
  const fy = (Y) => FH - (Y - CAR.under);
  const front = tex(FW, FH, 180, (c, w, h) => {
    const cx = w / 2;
    // roof outline (transparent corners)
    c.beginPath();
    c.moveTo(0, fy(CAR.bodyY0));
    c.lineTo(0, fy(CAR.eave));
    c.quadraticCurveTo(0.05, fy(CAR.roof - 0.05), cx, fy(CAR.roof));
    c.quadraticCurveTo(w - 0.05, fy(CAR.roof - 0.05), w, fy(CAR.eave));
    c.lineTo(w, fy(CAR.bodyY0));
    c.closePath();
    c.save(); c.clip();
    c.fillStyle = RED; c.fillRect(0, 0, w, h);
    c.fillStyle = CREAM; c.fillRect(0, fy(2.34), w, 2.34 - 1.0);
    c.fillStyle = '#8c8a84'; c.fillRect(0, 0, w, fy(2.84));
    const sh = c.createLinearGradient(0, 0, w, 0);
    sh.addColorStop(0, 'rgba(0,0,0,0.18)'); sh.addColorStop(0.2, 'rgba(255,255,255,0.06)'); sh.addColorStop(0.8, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.22)');
    c.fillStyle = sh; c.fillRect(0, 0, w, h);
    // headlights in the forehead + destination blind
    for (const s of [-0.88, 0.88]) {
      c.fillStyle = '#2b2b2c'; c.beginPath(); c.arc(cx + s, fy(2.55), 0.15, 0, TAU); c.fill();
      c.fillStyle = '#d9d8cf'; c.beginPath(); c.arc(cx + s, fy(2.55), 0.11, 0, TAU); c.fill();
    }
    c.fillStyle = '#1e1e22'; c.fillRect(cx - 0.42, fy(2.68), 0.84, 0.22);
    c.fillStyle = '#f2efe4'; c.fillRect(cx - 0.4, fy(2.66), 0.8, 0.18);
    c.fillStyle = '#1f1f24'; mtext(c, 'ぎんざ', cx, fy(2.52), 0.12, '"Zen Kaku Gothic New", sans-serif', 'center', '700');
    // windows: left, through-door, right
    for (const [a, b, y0, y1] of [[0.12, 1.02, 1.3, 2.22], [cx - 0.32, cx + 0.32, 1.32, 2.2], [w - 1.02, w - 0.12, 1.3, 2.22]]) {
      c.fillStyle = '#2c2c2e'; c.fillRect(a - 0.04, fy(y1 + 0.04), b - a + 0.08, y1 - y0 + 0.08);
      const g = c.createLinearGradient(0, fy(y1), 0, fy(y0));
      g.addColorStop(0, '#a4abae'); g.addColorStop(0.5, '#5e6669'); g.addColorStop(1, '#3a4043');
      c.fillStyle = g; c.fillRect(a, fy(y1), b - a, y1 - y0);
      c.fillStyle = 'rgba(255,255,255,0.1)'; c.beginPath(); c.moveTo(a, fy(y1)); c.lineTo(a + 0.3, fy(y1)); c.lineTo(a + 0.08, fy(y0)); c.lineTo(a, fy(y0)); c.fill();
    }
    // wipers
    c.strokeStyle = '#1b1b1d'; c.lineWidth = 0.025;
    for (const s of [0.55, w - 0.55]) { c.beginPath(); c.moveTo(s, fy(1.32)); c.lineTo(s + (s < cx ? 0.32 : -0.32), fy(1.95)); c.stroke(); }
    // through door outline & handle, one-man plate
    c.strokeStyle = 'rgba(40,26,20,0.6)'; c.lineWidth = 0.02;
    c.strokeRect(cx - 0.38, fy(2.27), 0.76, 2.27 - CAR.bodyY0 - 0.04);
    c.fillStyle = '#c7c8c2'; c.fillRect(cx + 0.24, fy(1.1), 0.05, 0.16);
    c.fillStyle = '#e3d248'; c.fillRect(0.2, fy(1.42), 0.42, 0.11);
    c.fillStyle = '#1d3f2a'; mtext(c, 'ワンマン', 0.41, fy(1.335), 0.065, '"Zen Kaku Gothic New", sans-serif', 'center', '700');
    // tail lights (dark), number
    for (const s of [0.32, w - 0.32]) { c.fillStyle = '#3c1d1a'; c.beginPath(); c.arc(s, fy(0.62), 0.09, 0, TAU); c.fill(); }
    c.fillStyle = 'rgba(240,232,210,0.9)'; mtext(c, 'キハ40 1986', cx, fy(0.32), 0.1, '"Zen Kaku Gothic New", sans-serif', 'center', '700');
    // handrails
    c.strokeStyle = '#cfd0ca'; c.lineWidth = 0.025;
    for (const s of [0.08, w - 0.08]) { c.beginPath(); c.moveTo(s, fy(0.4)); c.lineTo(s, fy(1.2)); c.stroke(); }
    // underframe: coupler, skirt, hoses
    c.fillStyle = '#1d1d1f'; c.fillRect(0.1, fy(CAR.bodyY0), w - 0.2, CAR.bodyY0 - CAR.under);
    c.fillStyle = '#2d2d30';
    c.beginPath(); c.moveTo(0.25, fy(CAR.bodyY0 - 0.05)); c.lineTo(w - 0.25, fy(CAR.bodyY0 - 0.05)); c.lineTo(w - 0.5, fy(CAR.under + 0.05)); c.lineTo(0.5, fy(CAR.under + 0.05)); c.fill();
    c.fillStyle = '#3c3c40'; c.fillRect(cx - 0.18, fy(-0.3), 0.36, 0.22);
    c.fillStyle = '#4a4a4f'; c.fillRect(cx - 0.05, fy(-0.22), 0.1, 0.5);
    // grime
    const gg = c.createLinearGradient(0, fy(1.0), 0, fy(CAR.bodyY0));
    gg.addColorStop(0, 'rgba(40,30,25,0)'); gg.addColorStop(1, 'rgba(40,30,25,0.4)');
    c.fillStyle = gg; c.fillRect(0, fy(1.0), w, 1.0);
    c.restore();
  });
  return { sideDay, sideLit, front, H, FH, wins };
}

// draw an image onto a vertical face between two ground points, in strips
function vface(c, img, cam, ax, az, bx, bz, y0, y1, n, sx0 = 0, sx1 = 1) {
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, tm = (t0 + t1) / 2;
    const xa = lerp(ax, bx, t0), za = lerp(az, bz, t0), xb = lerp(ax, bx, t1), zb = lerp(az, bz, t1);
    const xm = lerp(ax, bx, tm), zm = lerp(az, bz, tm);
    if (za < 0.6 || zb < 0.6) continue;
    const pa = project(cam, xa, y0, za), pb = project(cam, xb, y0, zb);
    const top = project(cam, xm, y1, zm)[1], bot = project(cam, xm, y0, zm)[1];
    const sx = img.width * lerp(sx0, sx1, t0), sw = img.width * (sx1 - sx0) / n;
    const x0 = Math.min(pa[0], pb[0]), w = Math.abs(pb[0] - pa[0]);
    if (w < 0.05) continue;
    c.drawImage(img, sx, 0, Math.max(0.5, sw), img.height, x0 - 0.35, top, w + 0.7, bot - top);
  }
}

export function createOverlay(cv) {
  const c = cv.getContext('2d');
  let W = 1, H = 1, dpr = 1;
  let trainTex = null;
  const R = rng(7);

  // creatures
  const swallows = [0, 1, 2].map((i) => ({ p: [lerp(-6, 4, R()), lerp(1.5, 5, R()), lerp(6, 30, R())], v: [0, 0, 6], target: null, mode: 'fly', t: 0, flap: R() * 10, i }));
  const dragonflies = Array.from({ length: 7 }, (_, i) => {
    const nearPlat = i < 3;
    const home = nearPlat ? [lerp(-1.2, 1.4, R()), lerp(0.9, 2.0, R()), lerp(3.4, 9, R())] : [lerp(-13, -6, R()), lerp(-0.6, 1.6, R()), lerp(7, 26, R())];
    return { home, p: home.slice(), v: [0, 0, 0], goal: home.slice(), hold: R() * 2, i };
  });
  const crows = [];
  let nextCrow = 6;
  const bats = [0, 1].map(() => ({ p: [lerp(-3, 2, R()), lerp(4, 7, R()), lerp(12, 30, R())], ph: R() * 10 }));
  const moths = Array.from({ length: 9 }, (_, i) => ({ ph: R() * TAU, r: 0.15 + R() * 0.35, sp: 0.8 + R() * 2.2, k: i % 3 }));
  const furin = { a: 0, v: 0, b: 0, bv: 0 };
  const chicks = { gape: 0 };

  function resize(w, h, d) {
    W = w; H = h; dpr = d;
    const pw = Math.round(w * d), ph = Math.round(h * d);
    if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
  }

  function steer(o, goal, maxV, k, dt) {
    for (let a = 0; a < 3; a++) {
      const want = (goal[a] - o.p[a]);
      o.v[a] += (want * k - o.v[a] * 0.9) * dt;
    }
    const sp = Math.hypot(o.v[0], o.v[1], o.v[2]);
    if (sp > maxV) for (let a = 0; a < 3; a++) o.v[a] *= maxV / sp;
    for (let a = 0; a < 3; a++) o.p[a] += o.v[a] * dt;
  }

  function swallowShape(x, y, s, ang, flap, col) {
    c.save();
    c.translate(x, y); c.rotate(ang);
    c.fillStyle = col;
    const w = s, sw = Math.sin(flap) * 0.55;
    c.beginPath();
    // body
    c.ellipse(0, 0, w * 0.28, w * 0.075, 0, 0, TAU);
    c.fill();
    // wings: swept crescents
    c.beginPath();
    c.moveTo(w * 0.05, 0);
    c.quadraticCurveTo(-w * 0.05, -w * (0.28 + sw * 0.2), -w * 0.32, -w * (0.5 + sw * 0.25));
    c.quadraticCurveTo(-w * 0.02, -w * 0.12, -w * 0.12, 0);
    c.quadraticCurveTo(-w * 0.02, w * 0.12, -w * 0.32, w * (0.5 + sw * 0.25));
    c.quadraticCurveTo(-w * 0.05, w * (0.28 + sw * 0.2), w * 0.05, 0);
    c.fill();
    // forked tail
    c.beginPath();
    c.moveTo(-w * 0.22, -w * 0.03); c.lineTo(-w * 0.55, -w * 0.12); c.lineTo(-w * 0.3, 0); c.lineTo(-w * 0.55, w * 0.12); c.lineTo(-w * 0.22, w * 0.03);
    c.fill();
    c.restore();
  }

  function draw(cam, S) {
    const { t, dt, tod, amb } = S;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    const P = (X, Y, Z) => project(cam, X, Y, Z);
    const dark = (base, k = 1) => [base[0] * amb[0] * k, base[1] * amb[1] * k, base[2] * amb[2] * k];
    const f = cam.f;

    // ── crossing lamps & gates (far, so drawn first) ──
    {
      const Zc = G.crossingZ, w = 2.6, tx = trackXAt(Zc);
      const posts = [[tx - 2.9, Zc - w - 0.4, 1], [tx + 2.9, Zc + w + 0.4, -1]];
      for (const [X, Z, dir] of posts) {
        // gate arm (black and yellow), rotates from upright to across the road
        const ang = lerp(Math.PI / 2 * 0.96, 0.02, S.gate);
        const piv = [X + (dir > 0 ? -0.35 : 0.35), G.railY + 0.85, Z];
        const L = 3.0;
        const tip = [piv[0], piv[1] + Math.sin(ang) * L, piv[2] + dir * Math.cos(ang) * L];
        const a = P(...piv), b = P(...tip);
        const segs = 8;
        c.lineWidth = Math.max(0.8, f * 0.07 / Z);
        for (let k = 0; k < segs; k++) {
          const u0 = k / segs, u1 = (k + 1) / segs;
          c.strokeStyle = rgb(dark(k % 2 ? [30, 30, 32] : [226, 190, 70]));
          c.beginPath(); c.moveTo(lerp(a[0], b[0], u0), lerp(a[1], b[1], u0)); c.lineTo(lerp(a[0], b[0], u1), lerp(a[1], b[1], u1)); c.stroke();
        }
        if (S.ringing) {
          const on = (Math.floor(t / 0.42) % 2);
          const lb = P(X, G.railY + 2.45, Z);
          const lw = f * 0.45 / Z;
          c.globalCompositeOperation = 'lighter';
          for (const s of [-1, 1]) {
            const lit = (s < 0) === !!on;
            if (!lit) continue;
            const r = Math.max(2.5, f * 0.5 / Z) * 2.2;
            const g = c.createRadialGradient(lb[0] + s * lw, lb[1], 0, lb[0] + s * lw, lb[1], r);
            g.addColorStop(0, 'rgba(255,90,60,0.95)'); g.addColorStop(0.2, 'rgba(255,40,30,0.5)'); g.addColorStop(1, 'rgba(255,20,10,0)');
            c.fillStyle = g; c.fillRect(lb[0] + s * lw - r, lb[1] - r, r * 2, r * 2);
          }
          c.globalCompositeOperation = 'source-over';
        }
      }
    }

    // ── crows going home, high and far ──
    if (tod > 0.32 && tod < 0.9) {
      nextCrow -= dt;
      if (nextCrow < 0 && crows.length < 6) {
        const n = 2 + ((R() * 3) | 0);
        const Z = lerp(90, 220, R()), Y = lerp(22, 45, R());
        for (let k = 0; k < n; k++) crows.push({ X: lerp(140, 220, R()) + k * 9, Y: Y + (R() - 0.5) * 6, Z: Z + (R() - 0.5) * 20, ph: R() * 10, sp: lerp(9, 12, R()) });
        nextCrow = lerp(22, 45, R());
        if (S.onCrows) S.onCrows();
      }
    }
    for (let i = crows.length - 1; i >= 0; i--) {
      const o = crows[i];
      o.X -= o.sp * dt; o.ph += dt * 5.2;
      const q = P(o.X, o.Y, o.Z);
      if (q[0] < -60) { crows.splice(i, 1); continue; }
      const s = Math.max(3, f * 0.9 / o.Z);
      const fl = Math.sin(o.ph);
      c.strokeStyle = rgb(dark([24, 24, 28], 0.9));
      c.lineWidth = Math.max(1, s * 0.12);
      c.beginPath();
      c.moveTo(q[0] - s * 0.5, q[1] - fl * s * 0.32); c.quadraticCurveTo(q[0] - s * 0.2, q[1] - fl * s * 0.12, q[0], q[1]);
      c.quadraticCurveTo(q[0] + s * 0.2, q[1] - fl * s * 0.12, q[0] + s * 0.5, q[1] - fl * s * 0.32);
      c.stroke();
      c.fillStyle = rgb(dark([24, 24, 28], 0.9));
      c.beginPath(); c.ellipse(q[0], q[1] + s * 0.03, s * 0.16, s * 0.06, 0, 0, TAU); c.fill();
    }

    // ── the train ──
    const tr = S.train;
    if (tr && tr.visible) drawTrain(cam, tr, S);

    // ── clock hands in the waiting room ──
    {
      const ck = G.clock;
      const q = P(ck.x, ck.y, ck.z - 0.01);
      const r = f * ck.r / ck.z;
      const mins = 16 * 60 + 40 + tod * 155 + 3;
      const hA = ((mins / 60) % 12) / 12 * TAU - Math.PI / 2, mA = ((mins % 60) / 60) * TAU - Math.PI / 2;
      const lampK = S.tube;
      const ink = [40 * (amb[0] * 0.5 + lampK * 0.4), 38 * (amb[1] * 0.5 + lampK * 0.4), 36 * (amb[2] * 0.5 + lampK * 0.4)];
      c.strokeStyle = rgb(ink);
      c.lineWidth = Math.max(0.8, r * 0.09);
      c.beginPath(); c.moveTo(q[0], q[1]); c.lineTo(q[0] + Math.cos(hA) * r * 0.5, q[1] + Math.sin(hA) * r * 0.5); c.stroke();
      c.lineWidth = Math.max(0.6, r * 0.06);
      c.beginPath(); c.moveTo(q[0], q[1]); c.lineTo(q[0] + Math.cos(mA) * r * 0.78, q[1] + Math.sin(mA) * r * 0.78); c.stroke();
      // second hand, red, ticking
      const sA = (Math.floor(t) % 60) / 60 * TAU - Math.PI / 2;
      c.strokeStyle = rgb([170 * (amb[0] * 0.5 + lampK * 0.4), 40, 30]);
      c.lineWidth = Math.max(0.5, r * 0.03);
      c.beginPath(); c.moveTo(q[0], q[1]); c.lineTo(q[0] + Math.cos(sA) * r * 0.82, q[1] + Math.sin(sA) * r * 0.82); c.stroke();
    }

    // ── chicks in the nest ──
    {
      const n = G.nest;
      const base = P(n.x, n.y + 0.035, G.shelter.z0 - 0.07);
      const s = f * 0.02 / G.shelter.z0;
      chicks.gape = Math.max(0, chicks.gape - dt * 0.8);
      for (let k = 0; k < 4; k++) {
        const bob = Math.sin(t * 2.3 + k * 1.7) * s * 0.25 + chicks.gape * s * 0.8;
        const x = base[0] + (k - 1.5) * s * 1.6, y = base[1] - bob;
        c.fillStyle = rgb(dark([70, 60, 56]));
        c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill();
        c.fillStyle = rgb(dark([240, 200, 70]));
        c.beginPath(); c.moveTo(x - s * 0.6, y - s * 0.3); c.lineTo(x, y - s * (0.6 + chicks.gape * 1.6)); c.lineTo(x + s * 0.6, y - s * 0.3); c.fill();
      }
    }

    // ── swallows ──
    if (tod < 0.82) {
      const fade = 1 - smooth(0.66, 0.82, tod);
      for (const o of swallows) {
        o.t -= dt;
        if (!o.target || o.t < 0) {
          if (o.mode === 'fly' && R() < 0.22) { o.mode = 'nest'; o.target = [G.nest.x, G.nest.y - 0.06, G.shelter.z0 - 0.25]; o.t = 6; }
          else { o.mode = 'fly'; o.target = [lerp(-14, 6, R()), lerp(0.4, 6.5, R()), lerp(4, 45, R())]; o.t = lerp(1.2, 3, R()); }
        }
        const d = Math.hypot(o.target[0] - o.p[0], o.target[1] - o.p[1], o.target[2] - o.p[2]);
        if (o.mode === 'nest' && d < 0.35) {
          chicks.gape = 1;
          o.mode = 'fly'; o.target = [lerp(-8, 2, R()), lerp(2, 5, R()), lerp(10, 30, R())]; o.t = 2;
          o.v = [-3, 2.5, 6];
          if (S.onNest) S.onNest();
        }
        steer(o, o.target, o.mode === 'nest' ? 9 : 13, o.mode === 'nest' ? 3.5 : 2.2, dt);
        if (o.p[2] < 2.5) { o.p[2] = 2.5; o.v[2] = Math.abs(o.v[2]); }
        const q = P(o.p[0], o.p[1], o.p[2]);
        const q2 = P(o.p[0] + o.v[0] * 0.05, o.p[1] + o.v[1] * 0.05, o.p[2] + o.v[2] * 0.05);
        const ang = Math.atan2(q2[1] - q[1], q2[0] - q[0]);
        o.flap += dt * (Math.sin(t * 0.7 + o.i) > 0.2 ? 26 : 2);
        const s = Math.max(4, f * 0.32 / o.p[2]);
        swallowShape(q[0], q[1], s, ang, o.flap, rgb(dark([26, 30, 44]), fade));
      }
    }

    // ── dragonflies (精霊とんぼ) ──
    if (tod < 0.9) {
      const fade = 1 - smooth(0.78, 0.9, tod);
      for (const o of dragonflies) {
        o.hold -= dt;
        if (o.hold < 0) {
          o.goal = [o.home[0] + (R() - 0.5) * 2.4, o.home[1] + (R() - 0.5) * 0.8, o.home[2] + (R() - 0.5) * 3];
          o.hold = R() < 0.3 ? lerp(0.15, 0.4, R()) : lerp(1, 3.5, R());
        }
        steer(o, o.goal, 7, 9, dt);
        const jit = [Math.sin(t * 13 + o.i) * 0.01, Math.sin(t * 11 + o.i * 2) * 0.012, 0];
        const q = P(o.p[0] + jit[0], o.p[1] + jit[1], o.p[2]);
        const s = Math.max(2.2, f * 0.05 / o.p[2]);
        const heading = Math.atan2(o.v[1] * -1, o.v[0] + 0.001);
        c.save(); c.translate(q[0], q[1]); c.rotate(Math.abs(o.v[0]) + Math.abs(o.v[1]) > 0.3 ? heading * 0.3 : 0);
        c.strokeStyle = rgb(dark([198, 150, 62]), fade);
        c.lineWidth = Math.max(0.8, s * 0.12);
        c.beginPath(); c.moveTo(-s * 0.55, 0); c.lineTo(s * 0.45, 0); c.stroke();
        const wa = 0.18 + 0.12 * Math.sin(t * 60 + o.i);
        c.fillStyle = `rgba(${235 * amb[0] | 0},${235 * amb[1] | 0},${225 * amb[2] | 0},${wa * fade})`;
        for (const sx of [-1, 1]) {
          c.beginPath(); c.ellipse(s * 0.15, sx * s * 0.28, s * 0.12, s * 0.32, sx * 0.25, 0, TAU); c.fill();
          c.beginPath(); c.ellipse(-s * 0.05, sx * s * 0.26, s * 0.11, s * 0.3, -sx * 0.25, 0, TAU); c.fill();
        }
        c.restore();
      }
    }

    // ── furin under the eave ──
    {
      const fr = G.furin;
      const force = (S.wind * 1.4 + 0.15) * (Math.sin(t * 1.3) * 0.6 + Math.sin(t * 3.1 + 1) * 0.4) + (S.gustKick || 0);
      furin.v += (-furin.a * 9 - furin.v * 1.4 + force * 3) * dt;
      furin.a += furin.v * dt;
      furin.bv += (-(furin.b - furin.a * 1.4) * 14 - furin.bv * 2.2) * dt;
      furin.b += furin.bv * dt;
      const rel = Math.abs(furin.bv - furin.v);
      if (rel > 1.6 && S.onFurin) S.onFurin(clamp(rel / 4));
      const top = P(fr.x, fr.y, fr.z);
      const sc = f / fr.z;
      const L1 = 0.09 * sc;
      const bx = top[0] + Math.sin(furin.a) * L1, by = top[1] + Math.cos(furin.a) * L1;
      const lit = [amb[0] + S.tube * 0.6, amb[1] + S.tube * 0.62, amb[2] + S.tube * 0.6];
      c.strokeStyle = `rgba(${200 * lit[0] | 0},${200 * lit[1] | 0},${190 * lit[2] | 0},0.7)`;
      c.lineWidth = 0.7;
      c.beginPath(); c.moveTo(top[0], top[1]); c.lineTo(bx, by); c.stroke();
      // glass bell
      const r = 0.042 * sc;
      c.save(); c.translate(bx, by); c.rotate(-furin.a * 0.6);
      const g = c.createRadialGradient(-r * 0.3, r * 0.3, r * 0.1, 0, r * 0.5, r * 1.2);
      g.addColorStop(0, `rgba(${255 * lit[0] | 0},${255 * lit[1] | 0},${250 * lit[2] | 0},0.85)`);
      g.addColorStop(1, `rgba(${170 * lit[0] | 0},${195 * lit[1] | 0},${205 * lit[2] | 0},0.45)`);
      c.fillStyle = g;
      c.beginPath(); c.moveTo(-r, r * 1.1); c.quadraticCurveTo(-r, -r * 0.2, 0, -r * 0.15); c.quadraticCurveTo(r, -r * 0.2, r, r * 1.1); c.closePath(); c.fill();
      // goldfish painted inside
      c.fillStyle = `rgba(${210 * lit[0] | 0},${60 * lit[1] | 0},${50 * lit[2] | 0},0.85)`;
      c.beginPath(); c.ellipse(-r * 0.25, r * 0.55, r * 0.22, r * 0.12, 0.3, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(r * 0.35, r * 0.4, r * 0.16, r * 0.09, -0.4, 0, TAU); c.fill();
      c.restore();
      // clapper string and the paper strip
      const L2 = 0.22 * sc;
      const sx = bx + Math.sin(furin.b) * L2, sy = by + Math.cos(furin.b) * L2;
      c.strokeStyle = `rgba(${210 * lit[0] | 0},${200 * lit[1] | 0},${180 * lit[2] | 0},0.7)`;
      c.beginPath(); c.moveTo(bx, by + r); c.lineTo(sx, sy); c.stroke();
      c.save(); c.translate(sx, sy); c.rotate(-furin.b);
      c.fillStyle = `rgba(${178 * lit[0] | 0},${206 * lit[1] | 0},${224 * lit[2] | 0},0.95)`;
      const tw = 0.045 * sc, th = 0.2 * sc;
      c.beginPath(); c.moveTo(-tw / 2, 0); c.lineTo(tw / 2, 0); c.lineTo(tw / 2 + Math.sin(t * 3) * tw * 0.2, th); c.lineTo(-tw / 2 + Math.sin(t * 3) * tw * 0.2, th); c.fill();
      c.restore();
    }

    // ── moths around the lights, bats at dusk ──
    if (tod > 0.6) {
      const k = smooth(0.6, 0.8, tod);
      c.globalCompositeOperation = 'lighter';
      const centers = [
        [G.vend.x0 + 0.45, 1.4, G.vend.z0 - 0.25],
        [(G.board.x0 + G.board.x1) / 2, 2.0, G.board.z - 0.3],
        [-0.55, 3.15, 28],
      ];
      for (const m of moths) {
        const ce = centers[m.k];
        const a = t * m.sp + m.ph;
        const X = ce[0] + Math.cos(a) * m.r + Math.sin(a * 2.7) * 0.05;
        const Y = ce[1] + Math.sin(a * 1.3) * m.r * 0.6;
        const Z = ce[2] + Math.sin(a * 0.9) * m.r * 0.5;
        const q = P(X, Y, Z);
        const s = Math.max(0.8, f * 0.012 / Z);
        c.fillStyle = `rgba(255,248,225,${0.55 * k})`;
        c.beginPath(); c.arc(q[0], q[1], s, 0, TAU); c.fill();
      }
      c.globalCompositeOperation = 'source-over';
    }
    if (tod > 0.78) {
      const k = smooth(0.78, 0.92, tod);
      for (const b of bats) {
        b.ph += dt;
        const X = b.p[0] + Math.sin(b.ph * 1.7) * 3 + Math.sin(b.ph * 4.1) * 0.6;
        const Y = b.p[1] + Math.sin(b.ph * 2.3) * 1.2 + Math.sin(b.ph * 7.0) * 0.3;
        const Z = b.p[2] + Math.sin(b.ph * 0.9) * 5;
        const q = P(X, Y, Z);
        const s = Math.max(2.5, f * 0.22 / Z);
        const fl = Math.sin(b.ph * 38);
        c.fillStyle = `rgba(14,14,20,${0.9 * k})`;
        c.beginPath();
        c.moveTo(q[0] - s * 0.5, q[1] - fl * s * 0.25); c.lineTo(q[0] - s * 0.1, q[1]); c.lineTo(q[0], q[1] + s * 0.1);
        c.lineTo(q[0] + s * 0.1, q[1]); c.lineTo(q[0] + s * 0.5, q[1] - fl * s * 0.25); c.lineTo(q[0], q[1] - s * 0.08);
        c.fill();
      }
    }

    // ── the vending machine's roulette ──
    if (S.roulette) {
      const v = G.vend;
      const digits = S.roulette;
      const x0 = v.x0 + 0.62, x1 = v.x0 + 0.79, y0 = 0.83, y1 = 0.9;
      const a = P(x0, y1, v.z0 - 0.005), b = P(x1, y0, v.z0 - 0.005);
      const dw = (b[0] - a[0]) / 4, dh = b[1] - a[1];
      c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 4; k++) seg7(c, digits[k], a[0] + dw * k + dw * 0.15, a[1] + dh * 0.12, dw * 0.7, dh * 0.76);
      c.globalCompositeOperation = 'source-over';
    }

    // ── a soft glint on the notebook when it is calling ──
    if (S.glint > 0) {
      const nb = G.notebook;
      const q = P((nb.x0 + nb.x1) / 2, (nb.y0 + nb.y1) / 2, nb.z);
      const r = f * 0.32 / nb.z;
      const pulse = 0.55 + 0.45 * Math.sin(t * 2.2);
      c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(q[0], q[1], 0, q[0], q[1], r);
      g.addColorStop(0, `rgba(255,244,214,${0.38 * S.glint * pulse})`);
      g.addColorStop(0.4, `rgba(255,232,190,${0.12 * S.glint * pulse})`);
      g.addColorStop(1, 'rgba(255,230,180,0)');
      c.fillStyle = g; c.fillRect(q[0] - r, q[1] - r, r * 2, r * 2);
      c.globalCompositeOperation = 'source-over';
    }
    // hover ring for hotspots
    if (S.hover) {
      const { x, y, r } = S.hover;
      c.strokeStyle = `rgba(255,246,226,${0.28 + 0.12 * Math.sin(t * 4)})`;
      c.lineWidth = 1;
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
    }
  }

  function seg7(c, ch, x, y, w, h) {
    const on = {
      0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', ' ': '',
    }[ch] || '';
    const t = Math.max(0.6, w * 0.16);
    const S2 = {
      a: [x + t, y, w - 2 * t, t], d: [x + t, y + h - t, w - 2 * t, t], g: [x + t, y + h / 2 - t / 2, w - 2 * t, t],
      f: [x, y + t, t, h / 2 - t], b: [x + w - t, y + t, t, h / 2 - t], e: [x, y + h / 2, t, h / 2 - t], c: [x + w - t, y + h / 2, t, h / 2 - t],
    };
    for (const k of 'abcdefg') {
      const r = S2[k];
      c.fillStyle = on.includes(k) ? 'rgba(255,70,45,0.95)' : 'rgba(90,20,15,0.25)';
      c.fillRect(r[0], r[1], r[2], r[3]);
    }
    if (on) {
      const g = c.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, h * 1.4);
      g.addColorStop(0, 'rgba(255,60,40,0.22)'); g.addColorStop(1, 'rgba(255,60,40,0)');
      c.fillStyle = g; c.fillRect(x - h, y - h * 0.6, w + 2 * h, h * 2.2);
    }
  }

  // ── train rendering ──
  function drawTrain(cam, tr, S) {
    if (!trainTex) trainTex = trainTextures();
    const T = trainTex;
    const { amb } = S;
    const f = cam.f;
    const zf = tr.z;
    const xf = trackXAt(zf);
    // rear on the curve
    let zr = zf + CAR.len;
    for (let k = 0; k < 3; k++) { const dx = trackXAt(zr) - xf; zr = zf + Math.sqrt(Math.max(1, CAR.len * CAR.len - dx * dx)); }
    const xr = trackXAt(zr);
    let ux = xr - xf, uz = zr - zf; const ul = Math.hypot(ux, uz); ux /= ul; uz /= ul;
    const nx = uz, nz = -ux;           // toward the platform
    const hw = CAR.w / 2;
    const FL = [xf - nx * hw, zf - nz * hw], FR = [xf + nx * hw, zf + nz * hw];
    const RR = [xr + nx * hw, zr + nz * hw];
    if (zf < 0.8) return;
    c.save();
    // the platform hides the bogies
    c.beginPath();
    c.rect(-10, -10, cam.W + 20, cam.H + 20);
    const pq = [project(cam, G.platEdge, 0, 0.6), project(cam, G.platEdge, 0, G.platEnd), project(cam, G.platBack, 0, G.platEnd), project(cam, G.platBack, 0, 0.6)];
    c.moveTo(pq[0][0], pq[0][1]); for (let i = 1; i < 4; i++) c.lineTo(pq[i][0], pq[i][1]); c.closePath();
    const sl = [project(cam, G.platEdge, 0, G.platEnd), project(cam, G.platEdge, -0.9, G.platEnd + 3.5), project(cam, G.platBack, -0.9, G.platEnd + 3.5), project(cam, G.platBack, 0, G.platEnd)];
    c.moveTo(sl[0][0], sl[0][1]); for (let i = 1; i < 4; i++) c.lineTo(sl[i][0], sl[i][1]); c.closePath();
    c.clip('evenodd');

    const n = Math.max(6, Math.min(70, Math.round(f * CAR.len / zf / 14)));
    // underframe (dark) along the side
    const under = [project(cam, FR[0], CAR.bodyY0, FR[1]), project(cam, RR[0], CAR.bodyY0, RR[1]), project(cam, RR[0] - nx * 0.4, CAR.under, RR[1] - nz * 0.4), project(cam, FR[0] - nx * 0.4, CAR.under, FR[1] - nz * 0.4)];
    c.fillStyle = rgb([24 * amb[0], 24 * amb[1], 26 * amb[2]]);
    c.beginPath(); under.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath(); c.fill();
    // side face
    vface(c, T.sideDay, cam, FR[0], FR[1], RR[0], RR[1], CAR.bodyY0, CAR.eave, n);
    // front face
    const fN = Math.max(3, Math.min(24, Math.round(f * CAR.w / zf / 18)));
    vface(c, T.front, cam, FL[0], FL[1], FR[0], FR[1], CAR.under, CAR.roof, fN);
    // light: multiply by the ambient, only over the train
    const sideQ = [project(cam, FR[0], CAR.under, FR[1]), project(cam, RR[0], CAR.under, RR[1]), project(cam, RR[0], CAR.eave, RR[1]), project(cam, FR[0], CAR.eave, FR[1])];
    const frontQ = [project(cam, FL[0], CAR.under, FL[1]), project(cam, FR[0], CAR.under, FR[1]), project(cam, FR[0], CAR.roof, FR[1]), project(cam, FL[0], CAR.roof, FL[1])];
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = `rgb(${Math.round(255 * Math.min(1, amb[0] * 1.02))},${Math.round(255 * Math.min(1, amb[1] * 1.02))},${Math.round(255 * Math.min(1, amb[2] * 1.02))})`;
    for (const q of [sideQ, frontQ]) { c.beginPath(); q.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fill(); }
    c.globalCompositeOperation = 'source-over';
    // interior light through the windows
    if (tr.interior > 0.01) {
      c.globalAlpha = tr.interior;
      vface(c, T.sideLit, cam, FR[0], FR[1], RR[0], RR[1], CAR.bodyY0, CAR.eave, n);
      c.globalAlpha = 1;
    }
    // open doors: the folding leaves fold away and the light comes out
    if (tr.doors > 0.001) {
      for (const [u0, u1] of DOOR_U) {
        const um = (u0 + u1) / 2, half = (u1 - u0) / 2 * tr.doors;
        const a = [lerp(FR[0], RR[0], (um - half) / CAR.len), lerp(FR[1], RR[1], (um - half) / CAR.len)];
        const b = [lerp(FR[0], RR[0], (um + half) / CAR.len), lerp(FR[1], RR[1], (um + half) / CAR.len)];
        const q = [project(cam, a[0], 0.15, a[1]), project(cam, b[0], 0.15, b[1]), project(cam, b[0], 2.12, b[1]), project(cam, a[0], 2.12, a[1])];
        const g = c.createLinearGradient(0, q[2][1], 0, q[0][1]);
        g.addColorStop(0, '#fff6e2'); g.addColorStop(0.6, '#f0e2c2'); g.addColorStop(1, '#bfae8e');
        c.fillStyle = g;
        c.beginPath(); q.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fill();
      }
    }
    c.restore();

    // spill of light on the platform from the open doors and the windows
    c.globalCompositeOperation = 'lighter';
    if (tr.doors > 0.01) {
      for (const [u0, u1] of DOOR_U) {
        const um = (u0 + u1) / 2;
        const zd = lerp(FR[1], RR[1], um / CAR.len);
        const a = project(cam, G.platEdge, 0, zd - 0.5), b = project(cam, G.platEdge, 0, zd + 0.5);
        const cxp = project(cam, -0.4, 0, zd);
        const r = f * 2.0 / zd;
        const g = c.createRadialGradient(cxp[0], cxp[1], 0, cxp[0], cxp[1], r);
        g.addColorStop(0, `rgba(255,236,196,${0.32 * tr.doors})`); g.addColorStop(1, 'rgba(255,236,196,0)');
        c.save(); c.translate(cxp[0], cxp[1]); c.scale(1, 0.32); c.translate(-cxp[0], -cxp[1]);
        c.fillStyle = g; c.fillRect(cxp[0] - r, cxp[1] - r, r * 2, r * 2);
        c.restore();
        void a; void b;
      }
    }
    if (tr.interior > 0.01 && zf < 60) {
      // a faint warm line along the platform edge
      const a = project(cam, G.platEdge + 0.05, 0.01, Math.max(zf, 2)), b = project(cam, G.platEdge + 0.05, 0.01, Math.min(zr, G.platEnd));
      const g = c.createLinearGradient(a[0], a[1], b[0], b[1]);
      g.addColorStop(0, `rgba(255,230,190,${0.22 * tr.interior})`); g.addColorStop(1, `rgba(255,230,190,${0.06 * tr.interior})`);
      c.strokeStyle = g; c.lineWidth = Math.max(1, f * 0.06 / Math.max(zf, 4));
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    }
    // headlights, their glare, and the rails catching them
    if (tr.head > 0.01) {
      const hl = tr.head;
      // rails glinting ahead of the train
      for (const s of [-G.gauge / 2, G.gauge / 2]) {
        c.beginPath();
        let started = false;
        for (let z = Math.max(1.5, zf - 70); z < zf; z += Math.max(0.5, (zf - z) * 0.08 + 0.3)) {
          const q = project(cam, trackXAt(z) + s, G.railY + 0.005, z);
          if (!started) { c.moveTo(q[0], q[1]); started = true; } else c.lineTo(q[0], q[1]);
        }
        const q2 = project(cam, xf + s, G.railY, zf);
        c.lineTo(q2[0], q2[1]);
        const a = project(cam, xf + s, G.railY, Math.max(1.5, zf - 70));
        const g = c.createLinearGradient(a[0], a[1], q2[0], q2[1]);
        g.addColorStop(0, 'rgba(255,240,210,0)'); g.addColorStop(1, `rgba(255,240,210,${0.55 * hl})`);
        c.strokeStyle = g; c.lineWidth = Math.max(0.8, f * 0.03 / Math.max(zf - 20, 6));
        c.stroke();
      }
      for (const s of [-0.88, 0.88]) {
        const X = xf + nx * s, Z = zf + nz * s;
        const q = project(cam, X, 2.55, Z - 0.05);
        const r = Math.max(5, f * 0.22 / zf) * (2.2 + 1.5 * hl);
        const g = c.createRadialGradient(q[0], q[1], 0, q[0], q[1], r);
        g.addColorStop(0, `rgba(255,252,240,${hl})`);
        g.addColorStop(0.12, `rgba(255,240,200,${0.7 * hl})`);
        g.addColorStop(0.4, `rgba(255,220,160,${0.18 * hl})`);
        g.addColorStop(1, 'rgba(255,210,150,0)');
        c.fillStyle = g; c.fillRect(q[0] - r, q[1] - r, r * 2, r * 2);
        // a thin horizontal streak, like old anime lens glare
        const sl2 = r * 3.2;
        const g2 = c.createLinearGradient(q[0] - sl2, 0, q[0] + sl2, 0);
        g2.addColorStop(0, 'rgba(255,230,190,0)'); g2.addColorStop(0.5, `rgba(255,236,200,${0.28 * hl})`); g2.addColorStop(1, 'rgba(255,230,190,0)');
        c.fillStyle = g2; c.fillRect(q[0] - sl2, q[1] - Math.max(0.6, r * 0.03), sl2 * 2, Math.max(1.2, r * 0.06));
      }
    }
    c.globalCompositeOperation = 'source-over';
  }

  return {
    resize,
    draw,
    kickFurin(k = 1) { furin.v += k * 2.5; },
  };
}
