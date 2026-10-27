// Gameplay: clock, input, judgement, score, HP. Rendering lives in render.js.
//
// Timing: the game clock is the song position *as heard*, derived from the AudioContext
// (getOutputTimestamp when available, else currentTime minus output latency), smoothed
// against performance.now(). Input events are judged at their own event.timeStamp mapped
// through the same clock, so judgement never depends on the frame rate.

import * as S from './song-data.js';
import { radiusOf, preemptOf, fadeInOf, windowsOf } from './map.js';
import { Renderer } from './render.js';

const KEYS = { KeyZ: 'K1', KeyX: 'K2' };
const MISS_EARLY = 400;

export function effectiveDiff(diff, mods) {
  const k = mods.ez ? 0.5 : 1;
  const d = { cs: diff.cs * k, ar: diff.ar * k, od: diff.od * k, hp: diff.hp * k };
  const rate = mods.dt ? 1.5 : 1;
  const realPre = preemptOf(d.ar) / rate;
  const arReal = realPre > 1200 ? 5 - ((realPre - 1200) / 600) * 5 : 5 + ((1200 - realPre) / 750) * 5;
  const odReal = (80 - (80 - 6 * d.od) / rate) / 6;
  return { ...d, rate, arReal, odReal };
}

export const scoreMultiplier = (m) => (m.nf ? 0.5 : 1) * (m.ez ? 0.5 : 1) * (m.hd ? 1.06 : 1) * (m.dt ? 1.12 : 1);

export function gradeOf(r) {
  const total = r.n300 + r.n100 + r.n50 + r.nMiss;
  if (!total) return 'D';
  const p300 = r.n300 / total, p50 = r.n50 / total;
  let g;
  if (r.n300 === total) g = 'SS';
  else if (p300 > 0.9 && p50 < 0.01 && r.nMiss === 0) g = 'S';
  else if ((p300 > 0.8 && r.nMiss === 0) || p300 > 0.9) g = 'A';
  else if ((p300 > 0.7 && r.nMiss === 0) || p300 > 0.8) g = 'B';
  else if (p300 > 0.6) g = 'C';
  else g = 'D';
  return g;
}

export class Game {
  constructor(o) {
    Object.assign(this, o); // ctx, layer, audio, song, sfx, map, mods, settings, bg, onEnd
    this.ac = this.audio.ac;
    const eff = effectiveDiff(this.map.diff, this.mods);
    this.eff = eff;
    this.rate = eff.rate;
    this.r = radiusOf(eff.cs);
    this.preempt = preemptOf(eff.ar);
    this.fadeIn = fadeInOf(eff.ar);
    this.win = windowsOf(eff.od);
    const base = this.map.diff;
    const dp = base.hp + base.cs + base.od;
    this.diffMult = dp <= 5 ? 2 : dp <= 12 ? 3 : dp <= 17 ? 4 : dp <= 24 ? 5 : 6;
    this.modMult = scoreMultiplier(this.mods);
    this.objs = this.map.objects.map((m) => ({ ...m, j: null, headJ: null, tickIdx: 0, parts: 0, partsHit: 0, tracking: false, rot: 0, spins: 0 }));
    this.first = this.map.first;
    this.lastEnd = this.map.last;
    this.reset();
    this.renderer = new Renderer(this);
    this._bind();
  }

  reset() {
    Object.assign(this, {
      T: -99999, frozenT: null, next: 0,
      score: 0, shownScore: 0, combo: 0, maxCombo: 0,
      n300: 0, n100: 0, n50: 0, nMiss: 0, sliderBreaks: 0,
      hp: 1, hpShown: 1, lives: this.mods.ez ? 2 : 0, nfSaved: false, hpLog: [],
      errors: [], marks: [], pops: [], booms: [],
      keys: { K1: false, K2: false, M1: false, M2: false, T: false },
      counts: { K1: 0, K2: 0, M1: 0, M2: 0 },
      state: 'ready', failAt: 0, endAt: 0, spin: null, comboPop: 0, kiaiBeat: -1, lastFailed: false,
      clkOff: null,
    });
    for (const o of this.objs) Object.assign(o, { j: null, headJ: null, tickIdx: 0, parts: 0, partsHit: 0, tracking: false, rot: 0, spins: 0, hitAt: 0, done: false, lastAng: null, rpm: 0, bonus: 0 });
  }

  // ---------------------------------------------------------------- clock
  _rawHeard(pnow) {
    const ac = this.ac;
    if (ac.getOutputTimestamp) {
      const ts = ac.getOutputTimestamp();
      if (ts && ts.contextTime > 0 && ts.performanceTime > 0) return ts.contextTime + (pnow - ts.performanceTime) / 1000;
    }
    return ac.currentTime - (ac.outputLatency || 0) - (ac.baseLatency || 0);
  }
  _syncClock() {
    const pnow = performance.now();
    const off = this._rawHeard(pnow) - pnow / 1000;
    if (this.clkOff == null || Math.abs(off - this.clkOff) > 0.035) this.clkOff = off;
    else this.clkOff += (off - this.clkOff) * 0.06;
  }
  songMsAt(perfMs) {
    if (this.clkOff == null) this._syncClock();
    const heard = perfMs / 1000 + this.clkOff;
    const t = (heard - this.song.originAc) * this.rate * 1000 - (this.settings.offset || 0);
    return this.frozenT != null ? Math.max(t, this.frozenT) : t;
  }

  // ---------------------------------------------------------------- flow
  start(fromMs = 0, lead = 0.35) {
    const at = this.ac.currentTime + lead;
    this.song.play({ fromBeat: fromMs / (S.BEAT * 1000), at, rate: this.rate, volume: this.settings.music });
    this.clkOff = null;
    this.state = 'play';
  }
  skip() {
    const target = this.first - 1600;
    if (this.state !== 'play' || this.T > target - 600) return;
    this.frozenT = null;
    this.start(target, 0.08);
  }
  pause() {
    if (this.state !== 'play') return;
    this.pausedAt = this.T;
    this.song.stop(0.05);
    this.sfx.spinStop();
    this.state = 'paused';
    for (const k in this.keys) this.keys[k] = false;
    this.onPause && this.onPause(true);
  }
  resume() {
    if (this.state !== 'paused') return;
    this.frozenT = this.pausedAt;
    this.start(Math.max(0, this.pausedAt), 0.75);
    this.onPause && this.onPause(false);
  }
  retry() {
    this.song.stop(0.04);
    this.sfx.spinStop();
    this.reset();
    this.start(0, 0.4);
  }

  _fail() {
    this.state = 'failing';
    this.lastFailed = true;
    this.failAt = performance.now();
    this.song.tapeStop(2.2);
    this.sfx.spinStop();
  }
  _finish() {
    this.state = 'done';
    this.endAt = performance.now();
    this.sfx.spinStop();
  }
  result(failed) {
    const acc = this.accuracy();
    const n = this.errors.length;
    const mean = n ? this.errors.reduce((a, b) => a + b, 0) / n : 0;
    const sd = n > 1 ? Math.sqrt(this.errors.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (n - 1)) : 0;
    const r = {
      failed, score: Math.round(this.score), acc, maxCombo: this.maxCombo, fullCombo: !failed && this.nMiss === 0 && this.sliderBreaks === 0, perfect: !failed && this.maxCombo >= this.map.maxCombo,
      n300: this.n300, n100: this.n100, n50: this.n50, nMiss: this.nMiss, ur: (sd * 10) / this.rate, mean: mean / this.rate,
      hpLog: this.hpLog.slice(), mods: { ...this.mods }, diff: this.map.diff, mapMax: this.map.maxCombo, nfSaved: this.nfSaved,
      progress: Math.max(0, Math.min(1, (this.T - this.first) / (this.lastEnd - this.first))),
    };
    r.grade = failed ? 'F' : gradeOf(r);
    if (!failed && this.mods.hd && (r.grade === 'SS' || r.grade === 'S')) r.silver = true;
    return r;
  }
  accuracy() {
    const total = this.n300 + this.n100 + this.n50 + this.nMiss;
    return total ? (300 * this.n300 + 100 * this.n100 + 50 * this.n50) / (300 * total) : 1;
  }

  // ---------------------------------------------------------------- scoring
  _addCombo() {
    this.combo++;
    this.comboPop = performance.now();
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
  }
  _break() {
    if (this.combo >= 10) this.sfx.comboBreak();
    this.combo = 0;
  }
  _hp(d) {
    this.hp = Math.min(1, this.hp + d);
    if (this.hp <= 0) {
      if (this.mods.nf) { this.hp = 0; this.nfSaved = true; }
      else if (this.lives > 0) { this.lives--; this.hp = 1; this.renderer.flash('#ffffff', 0.5); this.ctx.toast(this.ctx.isEn && this.ctx.isEn() ? 'EZ — one more life.' : 'EZ — もう一度。'); }
      else if (this.state === 'play') this._fail();
    }
  }
  _judge(o, kind, x, y, noCombo = false) {
    const H = this.eff.hp;
    const gain300 = 0.07 - H * 0.005;
    const value = { 300: 300, 100: 100, 50: 50, 0: 0 }[kind];
    if (kind === 0) {
      this.nMiss++;
      this._break();
      this._hp(-(0.05 + H * 0.018));
    } else {
      if (kind === 300) this.n300++; else if (kind === 100) this.n100++; else this.n50++;
      if (!noCombo) this._addCombo();
      this.score += value + value * ((Math.max(this.combo - 1, 0) * this.diffMult * this.modMult) / 25);
      this._hp(kind === 300 ? gain300 : kind === 100 ? gain300 * 0.4 : gain300 * 0.1);
    }
    o.j = kind;
    this.pops.push({ x, y, kind, at: performance.now() });
    if (this.pops.length > 24) this.pops.shift();
  }
  _part(hit, raw, breaks = true) {
    const H = this.eff.hp;
    if (hit) { this.score += raw; this._addCombo(); this._hp(0.012); }
    else {
      if (breaks) { this.sliderBreaks++; this._break(); }
      this._hp(-(0.02 + H * 0.005));
    }
  }

  // ---------------------------------------------------------------- input
  _bind() {
    const sig = this.ctx.signal;
    const el = this.layer;
    this.cursor = { x: this.ctx.w / 2, y: this.ctx.h * 0.6 };
    this.trail = [];
    const move = (e) => {
      const list = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
      const now = performance.now();
      if (list && list.length) for (const c of list) this.trail.push({ x: c.clientX, y: c.clientY, at: now });
      else this.trail.push({ x: e.clientX, y: e.clientY, at: now });
      if (this.trail.length > 80) this.trail.splice(0, this.trail.length - 80);
      this.cursor.x = e.clientX; this.cursor.y = e.clientY;
      this._spinTrack(e.clientX, e.clientY);
    };
    el.addEventListener('pointermove', move, { signal: sig });
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest && e.target.closest('button, .cm-ui')) return;
      move(e);
      const sr = this.renderer.skipRect;
      if (sr && e.clientX >= sr[0] && e.clientX <= sr[0] + sr[2] && e.clientY >= sr[1] && e.clientY <= sr[1] + sr[3]) { this.skip(); return; }
      const k = e.pointerType === 'touch' ? 'T' : e.button === 2 ? 'M2' : e.button === 0 ? 'M1' : null;
      if (!k) return;
      e.preventDefault();
      this._press(k, e.timeStamp);
    }, { signal: sig });
    window.addEventListener('pointerup', (e) => {
      const k = e.pointerType === 'touch' ? 'T' : e.button === 2 ? 'M2' : e.button === 0 ? 'M1' : null;
      if (k) this.keys[k] = false;
    }, { signal: sig });
    el.addEventListener('contextmenu', (e) => e.preventDefault(), { signal: sig });
    window.addEventListener('keydown', (e) => {
      if (KEYS[e.code]) {
        e.preventDefault();
        if (!e.repeat) this._press(KEYS[e.code], e.timeStamp);
        return;
      }
      if (e.repeat) return;
      if (e.code === 'Space') { e.preventDefault(); if (this.state === 'play' && this.T < this.first - 2200) this.skip(); else if (this.state === 'play') this.pause(); else if (this.state === 'paused') this.resume(); }
      else if (e.code === 'KeyP') { if (this.state === 'play') this.pause(); else if (this.state === 'paused') this.resume(); }
      else if (e.code === 'Backquote') this.retry();
    }, { signal: sig });
    window.addEventListener('keyup', (e) => { if (KEYS[e.code]) this.keys[KEYS[e.code]] = false; }, { signal: sig });
    window.addEventListener('blur', () => { for (const k in this.keys) this.keys[k] = false; }, { signal: sig });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); }, { signal: sig });
  }

  toOsu(px, py) {
    const pf = this.renderer.pf;
    return [(px - pf.x) / pf.s, (py - pf.y) / pf.s];
  }

  _press(k, stamp) {
    if (this.state !== 'play') return;
    this.keys[k] = true;
    if (this.counts[k] != null) this.counts[k]++;
    const T = this.songMsAt(stamp);
    const [cx, cy] = this.toOsu(this.cursor.x, this.cursor.y);
    // earliest hittable object under the cursor
    let target = -1;
    for (let i = this.next; i < this.objs.length; i++) {
      const o = this.objs[i];
      if (o.t - T > MISS_EARLY) break;
      if (o.type === 'spinner') continue;
      const open = o.type === 'circle' ? o.j == null : o.headJ == null;
      if (!open) continue;
      if (T - o.t > this.win.w50) continue;
      if (Math.hypot(cx - o.x, cy - o.y) <= this.r) { target = i; break; }
    }
    if (target < 0) return;
    const o = this.objs[target];
    // hitting a later note releases anything still waiting before it
    for (let i = this.next; i < target; i++) {
      const p = this.objs[i];
      if (p.type === 'circle' && p.j == null && p.t < o.t) this._judge(p, 0, p.x, p.y);
      if (p.type === 'slider' && p.headJ == null && p.t < o.t) { p.headJ = 0; p.parts++; this._part(false, 0); }
    }
    const err = T - o.t;
    const a = Math.abs(err);
    const kind = a <= this.win.w300 ? 300 : a <= this.win.w100 ? 100 : a <= this.win.w50 ? 50 : 0;
    if (kind) {
      this.errors.push(err);
      this.marks.push({ err, at: performance.now(), kind });
      if (this.marks.length > 40) this.marks.shift();
      this.sfx.hit(o.hs, (o.x / 512 - 0.5) * 2);
    }
    if (o.type === 'circle') {
      this._judge(o, kind, o.x, o.y);
      o.hitAt = performance.now();
      if (kind) this.booms.push({ x: o.x, y: o.y, colour: o.colour, at: performance.now(), num: o.num });
    } else {
      o.headJ = kind;
      o.parts++;
      if (kind) { o.partsHit++; this._part(true, 30); o.hitAt = performance.now(); this.booms.push({ x: o.x, y: o.y, colour: o.colour, at: performance.now(), num: o.num }); }
      else this._part(false, 0);
    }
  }

  _held() { const k = this.keys; return k.K1 || k.K2 || k.M1 || k.M2 || k.T; }

  _spinTrack(px, py) {
    const sp = this.spin;
    if (!sp || this.state !== 'play') return;
    const o = sp.o;
    if (this.T < o.t || this.T > o.end) return;
    const pf = this.renderer.pf;
    const cx = pf.x + 256 * pf.s, cy = pf.y + 192 * pf.s;
    const ang = Math.atan2(py - cy, px - cx);
    if (!this._held()) { o.lastAng = ang; return; }
    if (o.lastAng != null) {
      let d = ang - o.lastAng;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      const now = performance.now();
      const dt = Math.max(1, now - (o.lastMove || now - 16));
      const maxStep = ((477 / 60) * Math.PI * 2 * dt) / 1000; // the 477 rpm cap
      d = Math.max(-maxStep, Math.min(maxStep, d));
      o.rot += d;
      o.lastMove = now;
      o.speed = Math.abs(d) / dt;
    }
    o.lastAng = ang;
  }

  // ---------------------------------------------------------------- update
  update() {
    if (this.state === 'play') {
      this._syncClock();
      const prevT = this.T;
      this.T = this.songMsAt(performance.now());
      if (this.frozenT != null && this.T > this.frozenT + 1) this.frozenT = null;
      const dtSong = Math.max(0, Math.min(100, this.T - prevT));
      this._step(dtSong);
    } else if (this.state === 'failing') {
      if (performance.now() - this.failAt > 2300) { this.state = 'over'; this.onEnd(this.result(true)); }
    } else if (this.state === 'done') {
      if (performance.now() - this.endAt > 1200) { this.state = 'over'; this.onEnd(this.result(false)); }
    }
    this.renderer.draw();
  }

  _step(dt) {
    const T = this.T;
    // passive drain while the map is live
    if (T > this.first && T < this.lastEnd && !(this.spin && T >= this.spin.o.t && T <= this.spin.o.end)) {
      this._hp(-(0.003 + 0.0045 * this.eff.hp) * (dt / 1000));
    }
    if (Math.floor(T / 500) !== Math.floor((T - dt) / 500)) { this.hpLog.push(this.hp); }
    this.hpShown += (this.hp - this.hpShown) * 0.2;

    const pf = this.renderer.pf;
    const [cx, cy] = this.toOsu(this.cursor.x, this.cursor.y);
    for (let i = this.next; i < this.objs.length; i++) {
      const o = this.objs[i];
      if (o.t - T > this.preempt) break;
      if (o.done) continue;
      if (o.type === 'circle') {
        if (o.j == null && T - o.t > this.win.w50) this._judge(o, 0, o.x, o.y);
        if (o.j != null) o.done = true;
      } else if (o.type === 'slider') this._slider(o, T, cx, cy);
      else this._spinner(o, T, pf);
    }
    while (this.next < this.objs.length && this.objs[this.next].done) this.next++;
    if (this.next >= this.objs.length && T > this.lastEnd + 300 && this.state === 'play') this._finish();
  }

  _ballAt(o, T) {
    const p = Math.max(0, Math.min(1, (T - o.t) / (o.end - o.t)));
    const f = p * o.slides;
    const slide = Math.min(o.slides - 1, Math.floor(f));
    let local = f - slide;
    if (slide % 2) local = 1 - local;
    return this.pointAt(o, local * o.L);
  }
  pointAt(o, d) {
    const cum = o.cum, pts = o.pts;
    let lo = 0, hi = cum.length - 1;
    if (d <= 0) return pts[0];
    if (d >= cum[hi]) return pts[hi];
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < d) lo = m; else hi = m; }
    const k = (d - cum[lo]) / (cum[hi] - cum[lo] || 1);
    return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * k, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * k];
  }

  _slider(o, T, cx, cy) {
    if (o.headJ == null && T - o.t > this.win.w50) { o.headJ = 0; o.parts++; this._part(false, 0); }
    if (T >= o.t) {
      const [bx, by] = this._ballAt(o, Math.min(T, o.end));
      const reach = o.tracking ? this.r * 2.4 : this.r;
      const was = o.tracking;
      o.tracking = this._held() && Math.hypot(cx - bx, cy - by) <= reach;
      if (o.tracking && !was) o.trackAt = performance.now();
      o.ball = [bx, by];
      while (o.tickIdx < o.ticks.length && o.ticks[o.tickIdx].t <= T) {
        const tk = o.ticks[o.tickIdx++];
        o.parts++;
        if (o.tracking) {
          o.partsHit++;
          this._part(true, tk.kind === 'repeat' ? 30 : 10);
          if (tk.kind === 'repeat') this.sfx.hit({ clap: false }, (bx / 512 - 0.5) * 2, 0.7); else this.sfx.tick((bx / 512 - 0.5) * 2);
        } else this._part(false, 0);
      }
      const tailCheck = o.end - Math.min(36, (o.end - o.t) / 2);
      if (T >= tailCheck && !o.tailDone) {
        o.tailDone = true;
        o.parts++;
        if (o.tracking) {
          o.partsHit++;
          this._part(true, 30);
          this.sfx.sliderEnd(o.tailHs, (bx / 512 - 0.5) * 2);
        } else this._part(false, 0, false);
      }
      if (T >= o.end && o.tailDone) {
        const f = o.parts ? o.partsHit / o.parts : 0;
        const kind = f >= 1 ? 300 : f >= 0.5 ? 100 : f > 0 ? 50 : 0;
        const end = o.slides % 2 ? o.pts[o.pts.length - 1] : o.pts[0];
        // the slider's own judgement carries the combo bonus but not another combo step
        this._judge(o, kind, end[0], end[1], true);
        o.done = true;
        o.tracking = false;
      }
    }
  }

  _spinner(o, T, pf) {
    if (T < o.t) return;
    if (!this.spin || this.spin.o !== o) {
      this.spin = { o };
      o.lastAng = null;
      this.sfx.spinStart();
      this._spinTrack(this.cursor.x, this.cursor.y);
    }
    const durS = (o.end - o.t) / 1000 / this.rate;
    const od = this.eff.od;
    const sps = od < 5 ? 3 + (od / 5) * 2 : 5 + ((od - 5) / 5) * 2.5;
    o.need = Math.max(1, Math.round(durS * sps * 0.55));
    const spins = Math.floor(Math.abs(o.rot) / (Math.PI * 2));
    while (o.spins < spins) {
      o.spins++;
      if (o.spins > o.need) { this.score += 1000; o.bonus++; this.sfx.spinBonus(); this.pops.push({ x: 256, y: 300, kind: 'bonus', at: performance.now() }); }
      else this.score += 100;
      this._hp(0.012);
    }
    const now = performance.now();
    const idle = now - (o.lastMove || 0) > 80;
    o.rpm += (((idle ? 0 : o.speed || 0) * 60000) / (Math.PI * 2) - o.rpm) * 0.12;
    this.sfx.spinSet(o.spins / o.need, Math.min(1, o.rpm / 300));
    if (T >= o.end) {
      const p = o.spins / o.need;
      const kind = p >= 1 ? 300 : p >= 0.9 ? 100 : p >= 0.25 ? 50 : 0;
      this._judge(o, kind, 256, 192);
      if (kind) this.sfx.hit({ finish: true }, 0);
      this.sfx.spinStop();
      o.done = true;
      this.spin = null;
    }
  }

  resize() { this.renderer.resize(); }
  destroy() { this.song.stop(0.05); this.sfx.spinStop(); this.renderer.destroy(); }
}
