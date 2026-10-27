// Everything the player sees during a play, drawn on one 2D canvas: an original skin
// (dark-centred circles with combo-coloured rims), cached slider bodies, follow points,
// spinner, HUD (HP, score, accuracy, combo, hit-error bar, key overlay), the cursor as a
// small orb of light with its afterglow.

import * as S from './song-data.js';
import { COMBO_COLOURS } from './map.js';

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (t) => 1 - Math.pow(1 - t, 3);
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
function mix(hex, hex2, k) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(hex2.slice(1), 16);
  const ch = (s) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
const DARK = '#0e0c15';
const NUMFONT = '"M PLUS Rounded 1c", "Zen Kaku Gothic New", sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';

export class Renderer {
  constructor(game) {
    this.game = game;
    this.cv = game.canvas;
    this.g = this.cv.getContext('2d');
    this.bodies = new Map();
    this.flashes = [];
    this.sparks = [];
    this.resize();
  }

  resize() {
    const { w, h, dpr } = this.game.ctx;
    this.w = w; this.h = h; this.dpr = dpr;
    const s = Math.min(w / 590, h / 470);
    this.pf = { s, x: (w - 512 * s) / 2, y: (h - 384 * s) / 2 + 10 * s };
    this.R = this.game.r * s;
    this.sprites = COMBO_COLOURS.map((c) => this._circleSprite(c, this.R));
    this.cursorSprite = this._cursorSprite();
    this.bodies.clear();
  }

  flash(col, a) { this.flashes.push({ col, a, at: performance.now() }); }
  destroy() { this.bodies.clear(); }

  _canvas(wpx, hpx) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(wpx * this.dpr)); c.height = Math.max(1, Math.ceil(hpx * this.dpr));
    const g = c.getContext('2d');
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    return [c, g];
  }

  _circleSprite(col, R) {
    const size = R * 2.5;
    const [c, g] = this._canvas(size, size);
    const m = size / 2;
    g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = R * 0.22;
    g.fillStyle = col; g.beginPath(); g.arc(m, m, R * 0.98, 0, TAU); g.fill();
    g.shadowBlur = 0;
    const inner = g.createRadialGradient(m, m - R * 0.35, R * 0.05, m, m, R * 0.82);
    inner.addColorStop(0, '#2c2638'); inner.addColorStop(1, DARK);
    g.fillStyle = inner; g.beginPath(); g.arc(m, m, R * 0.8, 0, TAU); g.fill();
    g.strokeStyle = hexA(col, 0.45); g.lineWidth = R * 0.05;
    g.beginPath(); g.arc(m, m, R * 0.72, 0, TAU); g.stroke();
    g.strokeStyle = '#ffffff'; g.lineWidth = R * 0.075;
    g.beginPath(); g.arc(m, m, R * 0.94, 0, TAU); g.stroke();
    const gloss = g.createLinearGradient(0, m - R, 0, m);
    gloss.addColorStop(0, 'rgba(255,255,255,0.22)'); gloss.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gloss; g.beginPath(); g.arc(m, m, R * 0.98, Math.PI, TAU); g.fill();
    return { c, size };
  }

  _cursorSprite() {
    const k = this.game.settings.cursor || 1;
    const R = Math.max(9, this.R * 0.42) * k;
    const size = R * 4;
    const [c, g] = this._canvas(size, size);
    const m = size / 2;
    const halo = g.createRadialGradient(m, m, 0, m, m, size / 2);
    halo.addColorStop(0, 'rgba(255,255,255,1)');
    halo.addColorStop(0.18, 'rgba(255,236,246,0.95)');
    halo.addColorStop(0.32, 'rgba(255,130,190,0.45)');
    halo.addColorStop(1, 'rgba(255,102,170,0)');
    g.fillStyle = halo; g.beginPath(); g.arc(m, m, size / 2, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = Math.max(1.2, R * 0.12);
    g.beginPath(); g.arc(m, m, R * 0.85, 0, TAU); g.stroke();
    return { c, size, R };
  }

  _body(o) {
    let b = this.bodies.get(o);
    if (b) return b;
    const { s, x: px, y: py } = this.pf;
    const R = this.R;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of o.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const pad = R * 1.1;
    const W = (x1 - x0) * s + pad * 2, H = (y1 - y0) * s + pad * 2;
    const [c, g] = this._canvas(W, H);
    const ox = pad - x0 * s, oy = pad - y0 * s;
    const col = COMBO_COLOURS[o.colour];
    g.lineCap = 'round'; g.lineJoin = 'round';
    const path = () => { g.beginPath(); o.pts.forEach(([x, y], i) => (i ? g.lineTo(x * s + ox, y * s + oy) : g.moveTo(x * s + ox, y * s + oy))); };
    const layers = [[2, '#ffffff'], [1.84, col], [1.7, mix(col, DARK, 0.45)], [1.5, mix(col, DARK, 0.7)], [1.2, mix(col, DARK, 0.82)], [0.8, mix(col, DARK, 0.88)]];
    for (const [k, c2] of layers) { path(); g.strokeStyle = c2; g.lineWidth = R * k * 0.96; g.stroke(); }
    b = { c, x: px + x0 * s - pad, y: py + y0 * s - pad, W, H };
    this.bodies.set(o, b);
    return b;
  }

  P(x, y) { return [this.pf.x + x * this.pf.s, this.pf.y + y * this.pf.s]; }

  draw() {
    const G = this.game, g = this.g, T = G.T, now = performance.now();
    const { w, h } = this;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const beat = T / (S.BEAT * 1000);
    const kiai = S.inKiai(beat) && G.state === 'play';
    const phase = beat - Math.floor(beat);
    const flash = kiai && !G.ctx.reduced ? Math.pow(1 - phase, 3) * (Math.floor(beat) % 2 ? 0.6 : 1) : 0;
    const prog = clamp((T - 0) / (S.LEN_BEATS * S.BEAT * 1000));
    const cx = (G.cursor.x / w - 0.5) * 2, cy = (G.cursor.y / h - 0.5) * 2;
    G.bg.draw(g, w, h, { progress: prog, dim: G.settings.dim, t: now / 1000, px: cx, py: cy, flash, reduced: G.ctx.reduced });

    if (kiai && !G.ctx.reduced) {
      const a = 0.12 * Math.pow(1 - phase, 2);
      const grd = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
      grd.addColorStop(0, 'rgba(255,102,170,0)'); grd.addColorStop(1, `rgba(255,102,170,${a})`);
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      if (Math.floor(beat) !== this.lastKiaiBeat) {
        this.lastKiaiBeat = Math.floor(beat);
        for (let i = 0; i < 3; i++) this.sparks.push({ x: Math.random() < 0.5 ? 0 : w, y: h, vx: (Math.random() * 0.3 + 0.1) * w * (Math.random() < 0.5 ? 1 : -1), vy: -h * (0.5 + Math.random() * 0.5), at: now });
      }
    }
    this._sparks(now);

    const failing = G.state === 'failing' || (G.state === 'over' && G.lastFailed);
    const fall = failing ? (now - G.failAt) / 1000 : 0;
    if (fall) { g.save(); g.translate(0, fall * fall * h * 0.35); }
    this._followPoints(T);
    this._objects(T, now);
    this._booms(now);
    this._pops(now);
    if (fall) g.restore();
    this._hud(T, now);
    this._cursor(now);
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i], e = (now - f.at) / 600;
      if (e >= 1) { this.flashes.splice(i, 1); continue; }
      g.fillStyle = f.col; g.globalAlpha = f.a * (1 - e); g.fillRect(0, 0, w, h); g.globalAlpha = 1;
    }
    if (failing) {
      g.fillStyle = `rgba(90,0,10,${clamp(fall / 2) * 0.6})`;
      g.fillRect(0, 0, w, h);
    }
    if (G.state === 'done' || (G.state === 'over' && !G.lastFailed)) {
      g.fillStyle = `rgba(0,0,0,${clamp((now - G.endAt) / 1200) * 0.5})`;
      g.fillRect(0, 0, w, h);
    }
  }

  _sparks(now) {
    const g = this.g;
    g.globalCompositeOperation = 'lighter';
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i], t = (now - p.at) / 1000;
      if (t > 1.2) { this.sparks.splice(i, 1); continue; }
      const x = p.x + p.vx * t, y = p.y + p.vy * t + 0.5 * this.h * 0.9 * t * t;
      g.fillStyle = `rgba(255,190,225,${(1 - t / 1.2) * 0.7})`;
      g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  }

  // alpha of an object's hit circle at time T (fade-in, Hidden)
  _alpha(o, T) {
    const G = this.game, pre = G.preempt;
    if (G.mods.hd) {
      const fin = clamp((T - (o.t - pre)) / (pre * 0.4));
      const fout = 1 - clamp((T - (o.t - pre * 0.6)) / (pre * 0.3));
      return Math.min(fin, fout);
    }
    return clamp((T - (o.t - pre)) / G.fadeIn);
  }

  _followPoints(T) {
    const G = this.game, g = this.g, s = this.pf.s, objs = G.objs;
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = Math.max(1, G.next - 1); i < objs.length; i++) {
      const b = objs[i];
      if (b.t - T > G.preempt + 150) break;
      const a = objs[i - 1];
      if (b.nc || b.type === 'spinner' || a.type === 'spinner') continue;
      const aEnd = a.type === 'slider' ? a.end : a.t;
      if (T > b.t) continue;
      const ep = a.type === 'slider' ? (a.slides % 2 ? a.pts[a.pts.length - 1] : a.pts[0]) : [a.x, a.y];
      const dx = b.x - ep[0], dy = b.y - ep[1], len = Math.hypot(dx, dy);
      if (len < G.r * 2.6) continue;
      const fadeIn = clamp((T - (b.t - G.preempt - 150)) / 300);
      const gone = clamp((T - aEnd) / Math.max(1, b.t - aEnd));
      const step = 32;
      for (let d = G.r * 1.25; d < len - G.r * 1.25; d += step) {
        if (d / len < gone) continue;
        const [x, y] = this.P(ep[0] + (dx * d) / len, ep[1] + (dy * d) / len);
        g.globalAlpha = fadeIn * 0.55;
        g.beginPath(); g.arc(x, y, Math.max(1.2, s * 2.4), 0, TAU); g.fill();
      }
    }
    g.globalAlpha = 1;
  }

  _objects(T, now) {
    const G = this.game, g = this.g, objs = G.objs;
    const vis = [];
    for (let i = Math.max(0, G.next - 4); i < objs.length; i++) {
      const o = objs[i];
      if (o.t - T > G.preempt) break;
      const endT = o.type === 'circle' ? (o.j != null ? o.t - 1e9 : o.t + G.win.w50) : o.end;
      if (o.type === 'circle' && o.j != null && o.j !== 0) continue;
      if (o.type === 'circle' && o.j === 0 && now - (o.missAt || (o.missAt = now)) > 160) continue;
      if (o.type !== 'circle' && o.done && T > endT + 220) continue;
      vis.push(o);
    }
    for (let i = vis.length - 1; i >= 0; i--) {
      const o = vis[i];
      if (o.type === 'circle') this._circle(o, T, o.j === 0 ? 1 - (now - o.missAt) / 160 : 1);
      else if (o.type === 'slider') this._slider(o, T, now);
      else this._spinner(o, T, now);
    }
  }

  _circle(o, T, k = 1) {
    const G = this.game, g = this.g;
    const a = this._alpha(o, T) * k;
    if (a <= 0) return;
    const [x, y] = this.P(o.x, o.y);
    const sp = this.sprites[o.colour];
    g.globalAlpha = a;
    g.drawImage(sp.c, x - sp.size / 2, y - sp.size / 2, sp.size, sp.size);
    g.fillStyle = '#ffffff';
    g.font = `800 ${Math.round(this.R * 0.78)}px ${NUMFONT}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(o.num), x, y + this.R * 0.04);
    const showApproach = !G.mods.hd || o === G.objs[0];
    if (showApproach && T < o.t) {
      const p = clamp((o.t - T) / G.preempt);
      const rr = this.R * (1 + 3 * p) * 0.96;
      g.globalAlpha = clamp(a * 1.2) * 0.95;
      g.strokeStyle = COMBO_COLOURS[o.colour];
      g.lineWidth = Math.max(1.5, this.R * 0.075);
      g.beginPath(); g.arc(x, y, rr, 0, TAU); g.stroke();
    }
    g.globalAlpha = 1;
  }

  _slider(o, T, now) {
    const G = this.game, g = this.g;
    const pre = G.preempt;
    let a = clamp((T - (o.t - pre)) / G.fadeIn);
    if (G.mods.hd) a = Math.min(clamp((T - (o.t - pre)) / (pre * 0.4)), 1 - clamp((T - (o.t - pre * 0.6)) / (o.end - (o.t - pre * 0.6))));
    if (T > o.end) a *= 1 - clamp((T - o.end) / 200);
    if (a > 0) {
      const b = this._body(o);
      g.globalAlpha = a * 0.88;
      g.drawImage(b.c, b.x, b.y, b.W, b.H);
      // ticks still ahead of the ball on this slide
      const slideNow = Math.floor(clamp((T - o.t) / (o.end - o.t), 0, 0.9999) * o.slides);
      g.fillStyle = '#ffffff';
      for (let k = o.tickIdx; k < o.ticks.length; k++) {
        const tk = o.ticks[k];
        if (tk.kind !== 'tick') continue;
        const tslide = Math.floor((tk.t - o.t) / o.slideMs);
        if (tslide !== Math.max(0, slideNow)) continue;
        const [x, y] = this.P(...G.pointAt(o, tk.d));
        g.globalAlpha = a;
        g.beginPath(); g.arc(x, y, Math.max(2, this.R * 0.11), 0, TAU); g.fill();
      }
      // reverse arrows
      const remaining = o.slides - 1 - Math.max(0, slideNow);
      if (remaining > 0) {
        const atEnd = Math.max(0, slideNow) % 2 === 0;
        const n = o.pts.length;
        const [p0, p1] = atEnd ? [o.pts[n - 1], o.pts[n - 4] || o.pts[0]] : [o.pts[0], o.pts[3] || o.pts[n - 1]];
        const [x, y] = this.P(p0[0], p0[1]);
        const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
        const beatPh = ((T / (S.BEAT * 1000)) % 1 + 1) % 1;
        const sc = 1 + 0.18 * (1 - beatPh);
        g.save(); g.translate(x, y); g.rotate(ang); g.scale(sc, sc);
        g.globalAlpha = a;
        g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(2, this.R * 0.13); g.lineCap = 'round'; g.lineJoin = 'round';
        const u = this.R * 0.34;
        g.beginPath(); g.moveTo(-u * 0.4, -u); g.lineTo(u * 0.6, 0); g.lineTo(-u * 0.4, u); g.stroke();
        g.beginPath(); g.moveTo(-u * 1.1, 0); g.lineTo(u * 0.5, 0); g.stroke();
        g.restore();
      }
      // tail ring
      const tail = o.slides % 2 ? o.pts[o.pts.length - 1] : o.pts[0];
      if (T < o.end && o.slides === 1) {
        const [x, y] = this.P(tail[0], tail[1]);
        g.globalAlpha = a * 0.7;
        g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = Math.max(1, this.R * 0.05);
        g.beginPath(); g.arc(x, y, this.R * 0.62, 0, TAU); g.stroke();
      }
      g.globalAlpha = 1;
    }
    // head (until hit or missed)
    if (o.headJ == null) this._circle(o, T);
    else if (o.headJ === 0 && T < o.t + 160) this._circle(o, T, 1 - (T - o.t) / 160);
    // ball and follow circle
    if (T >= o.t && T <= o.end + 120) {
      const [bx, by] = o.ball || [o.x, o.y];
      const [x, y] = this.P(bx, by);
      const col = COMBO_COLOURS[o.colour];
      const fade = T > o.end ? 1 - (T - o.end) / 120 : 1;
      g.globalAlpha = fade;
      g.fillStyle = col;
      g.beginPath(); g.arc(x, y, this.R * 0.84, 0, TAU); g.fill();
      g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(2, this.R * 0.1);
      g.beginPath(); g.arc(x, y, this.R * 0.84, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.beginPath(); g.arc(x, y, this.R * 0.28, 0, TAU); g.fill();
      if (o.tracking) {
        const grow = ease(clamp((now - (o.trackAt || now)) / 140));
        g.globalAlpha = fade * 0.9;
        g.strokeStyle = hexA(col, 0.9); g.lineWidth = Math.max(2, this.R * 0.12);
        g.beginPath(); g.arc(x, y, this.R * (1.4 + 1.0 * grow), 0, TAU); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = Math.max(1, this.R * 0.05);
        g.beginPath(); g.arc(x, y, this.R * (1.25 + 0.95 * grow), 0, TAU); g.stroke();
      }
      g.globalAlpha = 1;
    }
  }

  _spinner(o, T, now) {
    const G = this.game, g = this.g;
    const a = clamp((T - (o.t - 400)) / 400) * (o.done ? 1 - clamp((T - o.end) / 220) : 1);
    if (a <= 0) return;
    const [x, y] = this.P(256, 192);
    const R = 170 * this.pf.s;
    const need = o.need || 1;
    const p = clamp(o.spins / need);
    g.globalAlpha = a;
    const disc = g.createRadialGradient(x, y, R * 0.1, x, y, R * 1.05);
    disc.addColorStop(0, 'rgba(20,16,30,0.75)'); disc.addColorStop(1, 'rgba(20,16,30,0.15)');
    g.fillStyle = disc; g.beginPath(); g.arc(x, y, R * 1.05, 0, TAU); g.fill();
    g.save(); g.translate(x, y); g.rotate(o.rot);
    for (let i = 0; i < 36; i++) {
      const lit = i / 36 < p;
      g.strokeStyle = lit ? 'rgba(255,140,200,0.95)' : 'rgba(255,255,255,0.25)';
      g.lineWidth = Math.max(2, R * 0.02);
      const ang = (i / 36) * TAU;
      g.beginPath(); g.moveTo(Math.cos(ang) * R * 0.78, Math.sin(ang) * R * 0.78); g.lineTo(Math.cos(ang) * R * 0.9, Math.sin(ang) * R * 0.9); g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -R * 0.25); g.lineTo(0, -R * 0.62); g.stroke();
    g.restore();
    const left = clamp((o.end - T) / (o.end - o.t));
    if (T >= o.t && T <= o.end) {
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = Math.max(1.5, R * 0.012);
      g.beginPath(); g.arc(x, y, Math.max(2, R * left), 0, TAU); g.stroke();
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (T < o.t + 700) {
      g.globalAlpha = a * (T < o.t ? 1 : 1 - (T - o.t) / 700);
      g.fillStyle = '#fff'; g.font = `800 ${Math.round(R * 0.2)}px ${NUMFONT}`;
      const en = G.ctx.isEn && G.ctx.isEn();
      g.fillText(en ? 'SPIN!' : 'まわして！', x, y - R * 0.05);
      g.font = `500 ${Math.round(R * 0.08)}px ${MONO}`;
      g.fillStyle = 'rgba(255,255,255,0.7)';
      g.fillText(en ? 'hold a key and circle the cursor' : 'SPIN — hold a key', x, y + R * 0.14);
    }
    if (o.spins >= need) {
      g.globalAlpha = a * (0.75 + 0.25 * Math.sin(now / 90));
      g.fillStyle = '#ffd0e6'; g.font = `800 ${Math.round(R * 0.17)}px ${NUMFONT}`;
      g.fillText(o.bonus ? `+${o.bonus * 1000}` : 'CLEAR', x, y);
    }
    g.globalAlpha = a;
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.font = `500 ${Math.round(Math.max(12, R * 0.075))}px ${MONO}`;
    g.fillText(`${Math.round(o.rpm || 0)} rpm`, x, y + R * 1.13);
    g.globalAlpha = 1;
  }

  _booms(now) {
    const g = this.g, G = this.game;
    for (let i = G.booms.length - 1; i >= 0; i--) {
      const b = G.booms[i], t = (now - b.at) / 240;
      if (t >= 1) { G.booms.splice(i, 1); continue; }
      const [x, y] = this.P(b.x, b.y);
      const sp = this.sprites[b.colour];
      const sc = 1 + 0.45 * ease(t);
      g.globalAlpha = 1 - t;
      g.drawImage(sp.c, x - (sp.size * sc) / 2, y - (sp.size * sc) / 2, sp.size * sc, sp.size * sc);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = (1 - t) * 0.5;
      g.strokeStyle = COMBO_COLOURS[b.colour];
      g.lineWidth = this.R * 0.18 * (1 - t);
      g.beginPath(); g.arc(x, y, this.R * (1 + t * 0.9), 0, TAU); g.stroke();
      g.globalCompositeOperation = 'source-over';
    }
    g.globalAlpha = 1;
  }

  _pops(now) {
    const g = this.g, G = this.game;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = G.pops.length - 1; i >= 0; i--) {
      const p = G.pops[i], t = (now - p.at) / 650;
      if (t >= 1) { G.pops.splice(i, 1); continue; }
      if (p.kind === 300) continue;
      const [x, y] = this.P(p.x, p.y);
      g.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      if (p.kind === 0) {
        const u = this.R * 0.42, yy = y + t * t * this.R * 0.8;
        g.save(); g.translate(x, yy); g.rotate(0.15 + t * 0.2);
        g.strokeStyle = '#ff3b5c'; g.lineWidth = Math.max(3, this.R * 0.16); g.lineCap = 'round';
        g.beginPath(); g.moveTo(-u, -u); g.lineTo(u, u); g.moveTo(u, -u); g.lineTo(-u, u); g.stroke();
        g.restore();
      } else {
        const label = p.kind === 'bonus' ? '+1000' : String(p.kind);
        const col = p.kind === 100 ? '#7dff9a' : p.kind === 50 ? '#ffb347' : '#ffd0e6';
        const sc = t < 0.12 ? 0.7 + (t / 0.12) * 0.45 : 1.15 - Math.min(0.15, (t - 0.12));
        g.font = `800 ${Math.round(this.R * 0.62 * sc)}px ${NUMFONT}`;
        g.lineWidth = 4; g.strokeStyle = 'rgba(10,8,16,0.8)';
        g.strokeText(label, x, y - this.R * 0.1);
        g.fillStyle = col; g.fillText(label, x, y - this.R * 0.1);
      }
    }
    g.globalAlpha = 1;
  }

  _hud(T, now) {
    const G = this.game, g = this.g, { w, h } = this;
    const u = clamp(Math.min(w, h * 1.4) / 1100, 0.62, 1.35);
    // HP
    const hx = 18 * u, hy = 16 * u, hw = Math.min(460 * u, w * 0.42), hh = 8 * u;
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(hx, hy, hw, hh);
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1; g.strokeRect(hx - 0.5, hy - 0.5, hw + 1, hh + 1);
    const hp = clamp(G.hpShown);
    const low = hp < 0.22;
    const grd = g.createLinearGradient(hx, 0, hx + hw, 0);
    if (low) { grd.addColorStop(0, '#ff2a4a'); grd.addColorStop(1, '#ff8a9a'); }
    else { grd.addColorStop(0, '#ff4f9a'); grd.addColorStop(1, '#ffe2f0'); }
    g.globalAlpha = low ? 0.65 + 0.35 * Math.sin(now / 80) : 1;
    g.fillStyle = grd; g.fillRect(hx, hy, hw * hp, hh);
    g.globalAlpha = 1;
    const kx = hx + hw * hp;
    const knob = g.createRadialGradient(kx, hy + hh / 2, 0, kx, hy + hh / 2, hh * 2.2);
    knob.addColorStop(0, 'rgba(255,255,255,0.95)'); knob.addColorStop(1, 'rgba(255,120,190,0)');
    g.fillStyle = knob; g.beginPath(); g.arc(kx, hy + hh / 2, hh * 2.2, 0, TAU); g.fill();
    if (G.mods.ez) {
      for (let i = 0; i < 2; i++) {
        g.fillStyle = i < G.lives ? '#ffd0e6' : 'rgba(255,255,255,0.15)';
        g.beginPath(); g.arc(hx + hw + 16 * u + i * 14 * u, hy + hh / 2, 4 * u, 0, TAU); g.fill();
      }
    }
    if (G.mods.nf && G.nfSaved) {
      g.font = `500 ${Math.round(11 * u)}px ${MONO}`; g.fillStyle = 'rgba(255,255,255,0.55)'; g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillText('NF — still here', hx, hy + hh + 6 * u);
    }

    // score, accuracy, progress
    G.shownScore += (G.score - G.shownScore) * 0.25;
    g.textAlign = 'right'; g.textBaseline = 'top';
    g.font = `500 ${Math.round(34 * u)}px ${MONO}`;
    g.fillStyle = '#fff';
    const top = 50 * u;
    g.fillText(String(Math.round(G.shownScore)).padStart(8, '0'), w - 18 * u, top);
    g.font = `500 ${Math.round(19 * u)}px ${MONO}`;
    const acc = (G.accuracy() * 100).toFixed(2) + '%';
    g.fillText(acc, w - 18 * u, top + 40 * u);
    const accW = g.measureText(acc).width;
    const pr = 8 * u, pcx = w - 18 * u - accW - 16 * u, pcy = top + 50 * u;
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.2;
    g.beginPath(); g.arc(pcx, pcy, pr, 0, TAU); g.stroke();
    const pre = T < G.first;
    const frac = pre ? clamp(T / G.first) : clamp((T - G.first) / (G.lastEnd - G.first));
    g.fillStyle = pre ? 'rgba(143,216,111,0.8)' : 'rgba(255,255,255,0.75)';
    g.beginPath(); g.moveTo(pcx, pcy); g.arc(pcx, pcy, pr, -Math.PI / 2, -Math.PI / 2 + TAU * frac); g.fill();
    const tags = [G.mods.ez && 'EZ', G.mods.nf && 'NF', G.mods.hd && 'HD', G.mods.dt && 'DT'].filter(Boolean);
    g.font = `500 ${Math.round(12 * u)}px ${MONO}`;
    g.fillStyle = 'rgba(255,208,230,0.85)';
    g.fillText(tags.join(' '), w - 18 * u, top + 68 * u);

    // combo
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    const pop = clamp((now - G.comboPop) / 220);
    const cs = Math.round(52 * u);
    if (G.combo > 0 && pop < 1) {
      g.globalAlpha = (1 - pop) * 0.4;
      g.font = `800 ${Math.round(cs * (1 + 0.5 * pop))}px ${NUMFONT}`;
      g.fillStyle = '#ffffff';
      g.fillText(`${G.combo}x`, 16 * u, h - 16 * u);
      g.globalAlpha = 1;
    }
    g.font = `800 ${Math.round(cs * (1 + 0.12 * (1 - pop)))}px ${NUMFONT}`;
    g.fillStyle = '#fff';
    g.fillText(`${G.combo}x`, 16 * u, h - 16 * u);

    // hit error bar
    const W50 = G.win.w50, W100 = G.win.w100, W300 = G.win.w300;
    const ppm = Math.min(1.6 * u, (w * 0.28) / (W50 * 2));
    const bx = w / 2, by = h - 20 * u;
    const bar = (ms, col, th) => { g.fillStyle = col; g.fillRect(bx - ms * ppm, by - th / 2, ms * 2 * ppm, th); };
    bar(W50, 'rgba(255,179,71,0.55)', 4 * u);
    bar(W100, 'rgba(125,255,154,0.6)', 4 * u);
    bar(W300, 'rgba(111,205,255,0.75)', 4 * u);
    g.fillStyle = '#fff'; g.fillRect(bx - 1, by - 10 * u, 2, 20 * u);
    for (const m of G.marks) {
      const age = (now - m.at) / 6000;
      if (age > 1) continue;
      g.globalAlpha = (1 - age) * 0.9;
      g.fillStyle = m.kind === 300 ? '#6fcdff' : m.kind === 100 ? '#7dff9a' : '#ffb347';
      g.fillRect(bx + m.err * ppm - 1, by - 8 * u, 2, 16 * u);
    }
    g.globalAlpha = 1;
    const recent = G.errors.slice(-20);
    if (recent.length) {
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const ax = bx + avg * ppm;
      g.fillStyle = '#fff';
      g.beginPath(); g.moveTo(ax, by - 12 * u); g.lineTo(ax - 5 * u, by - 19 * u); g.lineTo(ax + 5 * u, by - 19 * u); g.fill();
    }
    if (G.errors.length > 1) {
      const n = G.errors.length, mean = G.errors.reduce((a, b) => a + b, 0) / n;
      const sd = Math.sqrt(G.errors.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (n - 1));
      g.font = `500 ${Math.round(12 * u)}px ${MONO}`; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(255,255,255,0.65)';
      g.fillText(`UR ${((sd * 10) / G.rate).toFixed(2)}`, bx + W50 * ppm + 12 * u, by);
    }

    // key overlay
    const ks = 40 * u, kx2 = w - ks - 12 * u, ky0 = h / 2 - ks * 2.2;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    ['K1', 'K2', 'M1', 'M2'].forEach((k, i) => {
      const y = ky0 + i * (ks + 6 * u), on = G.keys[k];
      g.fillStyle = on ? 'rgba(255,102,170,0.85)' : 'rgba(14,12,21,0.55)';
      g.fillRect(kx2, y, ks, ks);
      g.strokeStyle = on ? '#fff' : 'rgba(255,255,255,0.3)'; g.lineWidth = 1;
      g.strokeRect(kx2 + 0.5, y + 0.5, ks - 1, ks - 1);
      g.fillStyle = '#fff';
      g.font = `500 ${Math.round(G.counts[k] ? 12 * u : 13 * u)}px ${MONO}`;
      g.fillText(G.counts[k] ? String(G.counts[k]) : k, kx2 + ks / 2, y + ks / 2);
    });

    // skip
    this.skipRect = null;
    if (G.state === 'play' && T < G.first - 2200) {
      const sw = 168 * u, sh = 44 * u, sx = w - sw - 18 * u, sy = h - sh - 64 * u;
      this.skipRect = [sx, sy, sw, sh];
      g.fillStyle = 'rgba(14,12,21,0.7)'; g.fillRect(sx, sy, sw, sh);
      g.strokeStyle = 'rgba(255,102,170,0.9)'; g.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);
      g.fillStyle = '#fff'; g.font = `700 ${Math.round(16 * u)}px ${NUMFONT}`;
      g.fillText(G.ctx.isEn && G.ctx.isEn() ? 'Skip ▸▸  Space' : 'スキップ ▸▸  Space', sx + sw / 2, sy + sh / 2);
    }

    // input device overlay (options)
    const dev = G.settings.device;
    if (dev === 'tablet' || dev === 'mouse') this._device(dev, u, now);
  }

  _device(dev, u, now) {
    const G = this.game, g = this.g, { w, h } = this;
    const fx = clamp(G.cursor.x / w), fy = clamp(G.cursor.y / h);
    const ox = 18 * u, oy = h - 190 * u;
    g.save();
    g.globalAlpha = 0.85;
    if (dev === 'tablet') {
      const tw = 152 * u * 0.9, th = 102 * u * 0.9;
      g.fillStyle = 'rgba(18,16,26,0.85)';
      g.fillRect(ox, oy, tw + 26 * u, th);
      g.fillStyle = 'rgba(255,255,255,0.08)';
      for (let i = 0; i < 4; i++) g.fillRect(ox + 6 * u, oy + 10 * u + i * 20 * u, 10 * u, 12 * u);
      const ax = ox + 26 * u, aw = tw, ah = th;
      g.strokeStyle = 'rgba(255,255,255,0.18)'; g.strokeRect(ax + 0.5, oy + 0.5, aw - 1, ah - 1);
      const zw = aw * (75 / 152), zh = zw * (h / w);
      const zx = ax + (aw - zw) / 2, zy = oy + (ah - zh) / 2;
      const hot = now - (G.marks.length ? G.marks[G.marks.length - 1].at : 0) < 120 && G.marks.length && G.marks[G.marks.length - 1].kind === 300;
      g.strokeStyle = hot ? '#ff66aa' : 'rgba(255,208,230,0.85)'; g.lineWidth = hot ? 2 : 1;
      g.strokeRect(zx, zy, zw, zh);
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(zx + fx * zw, zy + fy * zh, 2.6 * u, 0, TAU); g.fill();
      g.font = `500 ${Math.round(10 * u)}px ${MONO}`; g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillStyle = 'rgba(255,255,255,0.65)';
      g.fillText(`G640 · ${(75).toFixed(1)} × ${(75 * h / w).toFixed(1)} mm`, ox, oy + th + 5 * u);
    } else {
      const pw = 150 * u, ph = 96 * u;
      g.fillStyle = 'rgba(18,16,26,0.85)'; g.fillRect(ox, oy, pw, ph);
      g.strokeStyle = 'rgba(255,255,255,0.15)'; g.strokeRect(ox + 0.5, oy + 0.5, pw - 1, ph - 1);
      const mx = ox + 14 * u + fx * (pw - 28 * u), my = oy + 14 * u + fy * (ph - 28 * u);
      g.fillStyle = '#e8e4ee';
      g.beginPath(); g.ellipse(mx, my, 7 * u, 10 * u, 0, 0, TAU); g.fill();
      g.strokeStyle = '#555'; g.beginPath(); g.moveTo(mx, my - 10 * u); g.lineTo(mx, my - 3 * u); g.stroke();
      if (G.keys.M1 || G.keys.K1) { g.fillStyle = '#ff66aa'; g.beginPath(); g.ellipse(mx - 3.4 * u, my - 6 * u, 3 * u, 4 * u, 0, 0, TAU); g.fill(); }
      if (G.keys.M2 || G.keys.K2) { g.fillStyle = '#ff66aa'; g.beginPath(); g.ellipse(mx + 3.4 * u, my - 6 * u, 3 * u, 4 * u, 0, 0, TAU); g.fill(); }
      g.font = `500 ${Math.round(10 * u)}px ${MONO}`; g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillStyle = 'rgba(255,255,255,0.65)';
      g.fillText('mouse · old peak', ox, oy + ph + 5 * u);
    }
    g.restore();
  }

  _cursor(now) {
    const G = this.game, g = this.g;
    if (G.hideCursor) return;
    const sp = this.cursorSprite;
    const life = G.settings.device === 'mouse' ? 190 : 120;
    g.globalCompositeOperation = 'lighter';
    for (const p of G.trail) {
      const age = (now - p.at) / life;
      if (age >= 1) continue;
      const sz = sp.size * 0.55 * (1 - age * 0.5);
      g.globalAlpha = (1 - age) * 0.35;
      g.drawImage(sp.c, p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
    g.globalCompositeOperation = 'source-over';
    while (G.trail.length && now - G.trail[0].at > life) G.trail.shift();
    const press = G._held() ? 1.12 : 1;
    g.globalAlpha = 1;
    g.drawImage(sp.c, G.cursor.x - (sp.size * press) / 2, G.cursor.y - (sp.size * press) / 2, sp.size * press, sp.size * press);
  }
}
