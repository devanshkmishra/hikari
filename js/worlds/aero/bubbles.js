// Soap bubbles with thin-film iridescence. Pre-rendered sprites (a rotating film layer and a
// fixed specular layer) so dozens can float at 60 fps on a plain 2D canvas.
import { mkCanvas, rrect, clamp } from './util.js';

let SPR = null;
function conicOr(g, a, x, y, stops) {
  let gr;
  if (g.createConicGradient) gr = g.createConicGradient(a, x, y);
  else gr = g.createLinearGradient(x - 60, y - 60, x + 60, y + 60);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}
const FILM = [[0, '#ff6fd0'], [0.14, '#ffd36a'], [0.3, '#a6ff8a'], [0.46, '#5fe6ff'], [0.62, '#7a8cff'], [0.78, '#e07aff'], [0.9, '#ff9ab0'], [1, '#ff6fd0']];

function makeFilm(S, rot) {
  const c = mkCanvas(S, S), g = c.getContext('2d');
  const cx = S / 2, R = S * 0.46;
  const body = g.createRadialGradient(cx, cx, R * 0.15, cx, cx, R);
  body.addColorStop(0, 'rgba(215,238,255,0.035)');
  body.addColorStop(0.72, 'rgba(195,228,255,0.07)');
  body.addColorStop(0.93, 'rgba(205,236,255,0.26)');
  body.addColorStop(1, 'rgba(255,255,255,0.55)');
  g.fillStyle = body;
  g.beginPath(); g.arc(cx, cx, R, 0, Math.PI * 2); g.fill();
  // iridescent rim, masked to the edge
  const t = mkCanvas(S, S), tg = t.getContext('2d');
  tg.fillStyle = conicOr(tg, rot, cx, cx, FILM);
  tg.fillRect(0, 0, S, S);
  tg.globalCompositeOperation = 'destination-in';
  const m = tg.createRadialGradient(cx, cx, 0, cx, cx, R);
  m.addColorStop(0, 'rgba(0,0,0,0)');
  m.addColorStop(0.55, 'rgba(0,0,0,0.04)');
  m.addColorStop(0.8, 'rgba(0,0,0,0.38)');
  m.addColorStop(0.95, 'rgba(0,0,0,0.92)');
  m.addColorStop(1, 'rgba(0,0,0,0.55)');
  tg.fillStyle = m;
  tg.beginPath(); tg.arc(cx, cx, R, 0, Math.PI * 2); tg.fill();
  g.globalAlpha = 0.72;
  g.drawImage(t, 0, 0);
  // swirls inside the film
  g.save();
  g.beginPath(); g.arc(cx, cx, R * 0.98, 0, Math.PI * 2); g.clip();
  g.globalAlpha = 0.16;
  g.lineWidth = R * 0.09;
  g.strokeStyle = conicOr(g, rot + 1.2, cx, cx, FILM);
  g.beginPath(); g.ellipse(cx + R * 0.12, cx + R * 0.18, R * 0.62, R * 0.36, rot, 0.4, 2.9); g.stroke();
  g.globalAlpha = 0.1;
  g.beginPath(); g.ellipse(cx - R * 0.2, cx + R * 0.05, R * 0.5, R * 0.62, -rot, 3.6, 5.6); g.stroke();
  g.restore();
  g.globalAlpha = 1;
  g.strokeStyle = 'rgba(255,255,255,0.4)';
  g.lineWidth = Math.max(1, S / 160);
  g.beginPath(); g.arc(cx, cx, R - 0.6, 0, Math.PI * 2); g.stroke();
  return c;
}

function makeShine(S) {
  const c = mkCanvas(S, S), g = c.getContext('2d');
  const cx = S / 2, R = S * 0.46;
  g.save();
  g.translate(cx - R * 0.4, cx - R * 0.42);
  g.rotate(-0.7);
  const hg = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.34);
  hg.addColorStop(0, 'rgba(255,255,255,0.95)');
  hg.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  hg.addColorStop(1, 'rgba(255,255,255,0)');
  g.scale(1, 0.55);
  g.fillStyle = hg;
  g.beginPath(); g.arc(0, 0, R * 0.34, 0, Math.PI * 2); g.fill();
  g.restore();
  g.fillStyle = 'rgba(255,255,255,0.95)';
  g.beginPath(); g.arc(cx - R * 0.5, cx - R * 0.32, R * 0.055, 0, Math.PI * 2); g.fill();
  // a window reflected in the film
  g.save();
  g.translate(cx + R * 0.28, cx - R * 0.5);
  g.rotate(0.5);
  g.fillStyle = 'rgba(255,255,255,0.22)';
  rrect(g, -R * 0.16, -R * 0.09, R * 0.32, R * 0.2, R * 0.04); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.12)';
  rrect(g, -R * 0.13, R * 0.13, R * 0.26, R * 0.05, R * 0.02); g.fill();
  g.restore();
  // lower crescent
  g.strokeStyle = 'rgba(255,255,255,0.38)';
  g.lineWidth = R * 0.05;
  g.lineCap = 'round';
  g.beginPath(); g.arc(cx, cx, R * 0.86, 0.35, 1.25); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.beginPath(); g.arc(cx + R * 0.52, cx + R * 0.56, R * 0.03, 0, Math.PI * 2); g.fill();
  return c;
}

function soften(src, px) {
  const c = mkCanvas(src.width, src.height), g = c.getContext('2d');
  g.filter = `blur(${px}px)`;
  g.drawImage(src, 0, 0);
  return c;
}

export function sprites() {
  if (SPR) return SPR;
  const S = 192;
  const film = [0, 1.3, 2.6, 4.1].map((r) => makeFilm(S, r));
  const shine = makeShine(S);
  SPR = { S, R: S * 0.46, film, shine, softFilm: soften(film[1], 5), softShine: soften(shine, 5) };
  return SPR;
}

// mode: 'off' | 'rise' (the hill) | 'wall' (behind desktop icons) | 'saver' | 'dusk'
export function createBubbles(canvas, { dpr = 1, reduced = false } = {}) {
  const g = canvas.getContext('2d');
  const spr = sprites();
  let W = 1, H = 1, mode = 'off', list = [], fx = [], clean = true, warm = 0, t = 0;
  const DPR = Math.min(dpr, 2);

  function resize(w, hh) {
    W = Math.max(1, w); H = Math.max(1, hh);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function target() {
    if (mode === 'rise') return clamp(Math.round((W * H) / 70000), 9, 20);
    if (mode === 'dusk') return clamp(Math.round((W * H) / 90000), 7, 16);
    if (mode === 'wall') return clamp(Math.round((W * H) / 260000), 3, 7);
    if (mode === 'saver') return clamp(Math.round((W * H) / 110000), 7, 14);
    return 0;
  }

  function spawn(initial = false) {
    const k = Math.random();
    const b = { ph: Math.random() * 6.28, rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 0.5, film: (Math.random() * 4) | 0, a: 1, life: 0, fade: 0 };
    if (mode === 'saver') {
      const s = Math.min(W, H) / 900;
      b.r = (45 + Math.random() * 90) * clamp(s, 0.55, 1.6);
      let tries = 0;
      do {
        b.x = b.r + Math.random() * (W - 2 * b.r);
        b.y = b.r + Math.random() * (H - 2 * b.r);
      } while (tries++ < 30 && list.some((o) => Math.hypot(o.x - b.x, o.y - b.y) < o.r + b.r + 6));
      const ang = Math.random() * 6.28, sp = 40 + Math.random() * 55;
      b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp;
      b.fade = 0;
    } else {
      const big = mode !== 'wall' && k < 0.16;
      b.big = big;
      b.r = big ? 60 + Math.random() * 70 : mode === 'wall' ? 10 + Math.random() * 26 : 12 + Math.random() * 36;
      b.x = Math.random() * W;
      b.y = initial ? H * (0.2 + Math.random() * 0.9) : H + b.r + Math.random() * 60;
      b.vx = 0;
      b.vy = -(mode === 'wall' ? 8 + Math.random() * 10 : mode === 'dusk' ? 10 + Math.random() * 14 : 16 + Math.random() * 26) * (big ? 0.7 : 1);
      b.sway = 8 + Math.random() * 22;
      b.a = big ? 0.55 : mode === 'wall' ? 0.8 : 0.95;
      b.fade = initial ? 0 : 1;
    }
    list.push(b);
    return b;
  }

  function setMode(m) {
    if (m === mode) return;
    mode = m;
    if (m === 'saver') { list = []; for (let i = 0; i < target(); i++) spawn(true); }
    else if (m === 'off') { list.forEach((b) => { b.dying = true; }); }
    else list.forEach((b) => { if ((b.vx && !b.sway) || (m === 'wall' && b.big)) { b.dying = true; } });
  }

  function pop(b) {
    b.dead = true;
    const n = 9 + ((b.r / 8) | 0);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + Math.random() * 0.4;
      const sp = 70 + Math.random() * 130;
      fx.push({ kind: 'drop', x: b.x + Math.cos(a) * b.r * 0.9, y: b.y + Math.sin(a) * b.r * 0.9, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: 0, max: 0.35 + Math.random() * 0.25, s: 1 + Math.random() * 1.8 });
    }
    fx.push({ kind: 'ring', x: b.x, y: b.y, r: b.r, life: 0, max: 0.22 });
    return b.r;
  }

  function hit(x, y) {
    let best = null;
    for (const b of list) {
      if (b.dead || b.dying) continue;
      const d = Math.hypot(b.x - x, b.y - y);
      if (d < b.r * 1.05 && (!best || b.r < best.r)) best = b;
    }
    return best;
  }

  function step(dt) {
    if (reduced) dt *= 0.45;
    t += dt;
    if (mode === 'off' && !list.length && !fx.length) {
      if (!clean) { g.clearRect(0, 0, W, H); clean = true; }
      return;
    }
    clean = false;
    const want = target();
    const alive = list.filter((b) => !b.dying && !b.dead).length;
    if (mode !== 'off' && mode !== 'saver' && alive < want && Math.random() < dt * 1.6) spawn(false);

    for (const b of list) {
      b.life += dt;
      b.rot += b.spin * dt;
      b.ph += dt * 1.9;
      if (b.dying) b.a -= dt * 1.5;
      if (b.fade < 1) b.fade = Math.min(1, b.fade + dt * 0.9);
      if (mode === 'saver' && !b.sway) {
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
        if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
        if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); }
        if (b.y > H - b.r) { b.y = H - b.r; b.vy = -Math.abs(b.vy); }
      } else {
        b.y += b.vy * dt;
        b.x += Math.sin(b.life * 0.7 + b.ph) * (b.sway || 0) * dt * 0.6;
        if (b.y < -b.r * 1.2) b.dead = true;
      }
    }
    if (mode === 'saver') {
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        for (let j = i + 1; j < list.length; j++) {
          const b = list[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy), min = a.r + b.r;
          if (d > 0 && d < min) {
            const nx = dx / d, ny = dy / d;
            const ma = a.r * a.r, mb = b.r * b.r;
            const ov = min - d;
            a.x -= nx * ov * (mb / (ma + mb)); a.y -= ny * ov * (mb / (ma + mb));
            b.x += nx * ov * (ma / (ma + mb)); b.y += ny * ov * (ma / (ma + mb));
            const va = a.vx * nx + a.vy * ny, vb = b.vx * nx + b.vy * ny;
            if (va - vb > 0) {
              const na = (va * (ma - mb) + 2 * mb * vb) / (ma + mb);
              const nb = (vb * (mb - ma) + 2 * ma * va) / (ma + mb);
              a.vx += (na - va) * nx; a.vy += (na - va) * ny;
              b.vx += (nb - vb) * nx; b.vy += (nb - vb) * ny;
              a.wob = 1; b.wob = 1;
            }
          }
        }
      }
    }
    list = list.filter((b) => !b.dead && b.a > 0);

    g.clearRect(0, 0, W, H);
    list.sort((p, q) => (p.big ? 0 : 1) - (q.big ? 0 : 1));
    for (const b of list) {
      const alpha = b.a * b.fade;
      if (alpha <= 0.01) continue;
      b.wob = (b.wob || 0) * Math.max(0, 1 - dt * 3);
      const wob = 0.022 + b.wob * 0.06;
      const sx = 1 + Math.sin(b.ph) * wob, sy = 1 - Math.sin(b.ph) * wob;
      const D = spr.S * (b.r / spr.R);
      g.save();
      g.translate(b.x, b.y);
      g.globalAlpha = alpha;
      if (warm > 0) {
        const wg = g.createRadialGradient(0, 0, b.r * 0.2, 0, 0, b.r * 1.6);
        wg.addColorStop(0, `rgba(255,190,120,${0.1 * warm})`);
        wg.addColorStop(1, 'rgba(255,190,120,0)');
        g.fillStyle = wg;
        g.fillRect(-b.r * 1.6, -b.r * 1.6, b.r * 3.2, b.r * 3.2);
      }
      g.scale(sx, sy);
      g.save();
      g.rotate(b.rot);
      g.drawImage(b.big ? spr.softFilm : spr.film[b.film], -D / 2, -D / 2, D, D);
      g.restore();
      g.drawImage(b.big ? spr.softShine : spr.shine, -D / 2, -D / 2, D, D);
      g.restore();
    }
    for (const f of fx) {
      f.life += dt;
      const k = f.life / f.max;
      if (f.kind === 'ring') {
        g.globalAlpha = Math.max(0, 0.8 * (1 - k));
        g.strokeStyle = '#e8fbff';
        g.lineWidth = 1.6;
        g.beginPath(); g.arc(f.x, f.y, f.r * (1 + k * 0.35), 0, Math.PI * 2); g.stroke();
      } else {
        f.vy += 420 * dt;
        f.x += f.vx * dt; f.y += f.vy * dt;
        g.globalAlpha = Math.max(0, 0.9 * (1 - k));
        g.fillStyle = '#ffffff';
        g.beginPath(); g.arc(f.x, f.y, f.s, 0, Math.PI * 2); g.fill();
      }
    }
    g.globalAlpha = 1;
    fx = fx.filter((f) => f.life < f.max);
  }

  return {
    resize, step, setMode, hit, pop,
    get mode() { return mode; },
    set warm(v) { warm = v; },
    clear() { list = []; fx = []; g.clearRect(0, 0, W, H); clean = true; },
  };
}
