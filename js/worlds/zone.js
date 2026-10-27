// 区域 (くいき) — the Zone. Station H06 of the Hikari Line.
//
// You get off where no one gets off. The colour comes back as you step down into the grass.
// You cannot walk straight here: throw a nut tied with a strip of gauze, watch how it flies,
// and follow only the paths it flew cleanly. Others came before you — their messages glow
// on the ground, their last moments linger as stains. The archives tell, in pieces, what
// this place was. At the end there is a door, and a fire in front of it.

import { Engine, basis } from './zone/engine.js';
import { ZoneAudio } from './zone/audio.js';
import { SCENES, ORDER, layAnomalies, MAX_THROW, rng } from './zone/scenes.js';
import * as TX from './zone/text.js';
import { signCanvas, floorCanvas, scribbleCanvas, fontsReady } from './zone/textures.js';
import { buildUI } from './zone/ui.js';

const TAU = Math.PI * 2;
const G = 9.8;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const wrapA = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
const dampA = (a, b, k, dt) => a + wrapA(b - a) * (1 - Math.exp(-k * dt));
const hyp = Math.hypot;
const fmod = (a, m) => ((a % m) + m) % m;

const AWARD = 'the bonfire at the threshold, kept warm by strangers';
const HARD = new Set(['concrete', 'gravel', 'wood', 'wetconcrete']);

// light on the gauze (it is the brightest thing in the Zone, by design)
const GAUZE = { platform: 0.95, field: 0.9, tunnel: 0.42, corridor: 0.62, dunes: 0.85, monolith: 0.82, coda: 0.5 };
const WALLX = { tunnel: 1.25, corridor: 1.55, dunes: 11.5 };

function sunCorr(x, y, z) {
  const s = (-1.7 - x) / -0.5299;
  if (s < 0) return 0;
  const qy = y + 0.8267 * s, qz = z - 0.106 * s;
  const zc = fmod(qz + 1, 8) - 4;
  return Math.abs(zc) < 0.65 && qy > 2.25 && qy < 3.05 && qz > -2 && qz < 31 ? 1 : 0;
}
function sunHall(x, y, z) {
  const s = (-12 - x) / -0.7826;
  if (s < 0) return 0;
  const qy = y + 0.4565 * s, qz = z - 0.3261 * s;
  const zc = fmod(qz + 2, 8) - 4;
  return Math.abs(zc) < 1.42 && qy > 3.1 && qy < 10.5 && qz > -4 && qz < 40 ? 1 : 0;
}

class Zone {
  constructor(root, ctx) {
    this.root = root;
    this.ctx = ctx;
    root.classList.add('zn');
    this.time = 0;
    this.store = {
      arch: new Set(ctx.store.get('arch', [])),
      appr: new Set(ctx.store.get('appr', [])),
      my: ctx.store.get('my', null),
      bonfire: !!ctx.store.get('bonfire', false),
      en: !!ctx.store.get('en', false),
    };
    this.seen = new Set();
    this.eng = new Engine(root, ctx);
    this.audio = null;
    this.ui = buildUI(root, ctx, this);
    if (!this.eng.ok) { this.fallback(); return; }
    this.audio = new ZoneAudio(ctx);
    this.F = {
      anom: new Float32Array(24), fire: new Float32Array(4), p0: new Float32Array(4), p1: new Float32Array(4),
      rip: new Float32Array(32), rainRings: 0, fireA: 0,
      grass: { wind: 0.5, push: new Float32Array(4), A: [0, 0, 0], B: [0, 0, 0], light: 1 },
      rain: [
        { c: [0, 4.5, 0], s: [16, 9, 16], vel: [0.8, -9.5, 0.35], follow: 1, amt: 0, col: [0.75, 0.76, 0.72], n: 2600 },
        { c: [0, 2.3, 56.5], s: [10.5, 4.6, 10.5], vel: [0.05, -8, 0], follow: 0, amt: 0, col: [0.78, 0.82, 0.8], n: 1600 },
      ],
      post: { sepia: 0, fade: 1, white: 0, pull: 0, pullC: [0.5, 0.5], grain: 0.07, expo: 1, vig: 0.4, bloom: 0.5, sat: 0.7, tint: [1, 1, 1], dist: new Float32Array(24) },
    };
    this.pointer = { x: ctx.w / 2, y: ctx.h / 2, inside: false, touch: false };
    this.look = { yaw: 0, pitch: 0 };
    this.parts = [];
    this.motes = [];
    this.ripN = 0;
    this.pulls = {};
    this.seed = ((Date.now() / 1000) | 0) & 0xffff;
    this.fade = 1;
    this.white = 0;
    this.pullAmt = 0;
    this.hover = null;
    this.trainX = 300;

    this.eng.setTex('scrib', scribbleCanvas());
    fontsReady().then(() => {
      if (ctx.signal.aborted) return;
      this.eng.setTex('sign', signCanvas());
      this.eng.setTex('floor', floorCanvas());
    });
    for (const id of ['platform', 'field', 'monolith']) this.buildGrass(id);

    this.bindInput();
    if (ctx.onLang) ctx.onLang(() => this.ui.relang());
    this.enterPlace('platform', { intro: true });
    ctx.loop((t, dt) => this.frame(dt));
  }

  fallback() {
    this.ui.fallback();
    this.ctx.timeout(() => {
      this.ui.prompt('[篝火|かがりび|bonfire]を[灯す|ともす|light]', 'light the bonfire', () => {
        this.ui.prompt(null);
        this.ui.big(true);
        this.ctx.award(AWARD);
      });
    }, 2500);
  }

  buildGrass(id) {
    const S = SCENES[id];
    if (!S.grass) return;
    const arr = [];
    S.grass((x, y, z, h, s) => arr.push(x, y, z, h, s), rng(4021 + id.length * 131));
    this.eng.setGrass(id, new Float32Array(arr));
  }

  // ─────────────────────────────────────────────────────────── input
  bindInput() {
    const cv = this.eng.canvas;
    const sig = { signal: this.ctx.signal };
    const pos = (e) => {
      const r = this.root.getBoundingClientRect();
      this.pointer.x = e.clientX - r.left;
      this.pointer.y = e.clientY - r.top;
    };
    cv.addEventListener('pointermove', (e) => { pos(e); this.pointer.inside = true; this.pointer.touch = e.pointerType === 'touch'; }, sig);
    cv.addEventListener('pointerleave', () => { this.pointer.inside = false; }, sig);
    cv.addEventListener('pointerdown', (e) => {
      pos(e);
      this.pointer.inside = true;
      this.pointer.touch = e.pointerType === 'touch';
      if (this.ctx.audio.ac.state !== 'running') this.ctx.audio.resume();
      this.onDown();
    }, sig);
    window.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        if (this.ui.isOpen()) return;
        if (this.mode === 'play') {
          const n = [...this.nuts].reverse().find((k) => k.state === 'land');
          if (n) { e.preventDefault(); this.walk(n); }
        } else if (this.ui.promptActive()) {
          e.preventDefault();
          document.querySelector('.zn .zn-prompt.on')?.click();
        }
      }
    }, sig);
  }

  onDown() {
    if (this.ui.isOpen()) return;
    const m = this.mode;
    if (m === 'intro') { if (this.intro.t > 3.5) this.turnAround(); return; }
    if (m === 'turn' || m === 'walk' || m === 'pull' || m === 'trans' || m === 'coda') return;
    this.updateHover(true);
    if (this.hover) { this.activate(this.hover); return; }
    if (m === 'play') this.tryThrow();
  }

  // ─────────────────────────────────────────────────────────── places
  enterPlace(id, opts = {}) {
    const S = SCENES[id];
    this.place = id;
    this.S = S;
    this.placeT = 0;
    this.P = { x: S.start.x, z: S.start.z, gy: S.ground(S.start.x, S.start.z), yaw: S.start.yaw, pitch: S.start.pitch, eye: S.eye, bob: 0, step: 0, roll: 0, walking: 0 };
    this.layout();
    this.nuts = [];
    this.parts.length = 0;
    this.motes.length = 0;
    this.F.rip.fill(0);
    this.msgs = S.messages.map((m) => ({ ...m, d: TX.MESSAGES[m.key], k: 1, seed: Math.random() }));
    this.archs = S.archives.filter((a) => !this.store.arch.has(a.key)).map((a) => ({ ...a, y: a.y ?? S.ground(a.x, a.z), on: !a.after }));
    this.blood = S.blood ? { ...S.blood } : null;
    this.phantom = null;
    this.bird = null;
    this.fireA = 0;
    this.bloom = [];
    this.mine = null;
    this.tunnelL = 34;
    this.tunnelSnap = false;
    this.pan = null;
    this.panDone = false;
    this.roomRain = 0;
    this.sepia = opts.intro ? 1 : id === 'coda' ? 1 : 0;
    this.sepiaT = this.sepia;
    this.sepiaK = 0.4;
    this.audio.setScene(S.amb, S.drone, opts.intro ? 6 : 4);
    if (!opts.intro && id !== 'coda') this.ui.area(id);
    else this.ui.areaVisible(false);
    this.ui.archBtn(this.store.arch.size, id !== 'coda' && !opts.intro);
    this.ui.hint(null);
    if (!opts.keep) this.mode = 'play';
    const nxt = ORDER[ORDER.indexOf(id) + 1];
    if (nxt) this.eng.prepare(nxt);
    if (id === 'monolith') this.eng.prepare('coda');

    if (opts.intro) this.startIntro();
    if (id === 'field' && !this.seen.has('field')) {
      this.seen.add('field');
    }
    if (id === 'monolith' && opts.atBonfire) {
      this.P.z = 38.3;
      this.P.yaw = 0;
      this.ignite(true);
    }
    if (id === 'coda') this.startCoda();
    if (this.pulls[id] >= 2) this.addWatch();
  }

  layout() {
    const id = this.place;
    const n = this.pulls[id] || 0;
    this.anoms = layAnomalies(id, this.seed * 31 + n * 7919 + id.length * 101).map((a) => ({ ...a, reveal: 0, pulse: 0, ph: Math.random() * TAU }));
    // the phantom's anomaly is the one it will show you
  }

  addWatch() {
    if (this.msgs.some((m) => m.key === 'watch')) return;
    const S = this.S;
    this.msgs.push({ key: 'watch', x: S.start.x + 0.5, z: S.start.z + 1.9, yaw: 0, d: TX.MESSAGES.watch, k: 0, seed: Math.random() });
  }

  transition(id, opts = {}) {
    this.mode = 'trans';
    this.trans = { t: 0, id, opts, phase: 'out', white: !!opts.white, outDur: opts.outDur || 1.8 };
    this.ui.hint(null);
    this.ui.prompt(null);
    this.ui.warp(false);
    this.eng.prepare(id);
  }

  goNext() {
    const i = ORDER.indexOf(this.place);
    const next = ORDER[i + 1];
    if (next) this.transition(next, { white: this.place === 'tunnel' });
  }

  // ─────────────────────────────────────────────────────────── intro
  startIntro() {
    this.mode = 'intro';
    this.intro = { t: 0, go: 5.2, started: false };
    this.trainX = -2;
    this.fade = 1;
  }

  updateIntro(dt) {
    const I = this.intro;
    if (!I.started) {
      if (!this.eng.allReady(this.place)) return;
      if (this.ctx.audio.ac.state !== 'running') {
        this.ui.hint('waitaudio', 'クリックで[始める|はじめる|begin]', 'click to begin');
        return;
      }
      this.ui.hint(null);
      I.started = true;
      I.go = this.audio.departure();
    }
    I.t += dt;
    if (I.t > 0.6) this.fade = damp(this.fade, 0, 0.9, dt);
    const tm = Math.max(0, I.t - I.go);
    // follow the leaving train a little, then drift across to the name board
    this.P.yaw = this.S.start.yaw - Math.min(0.12, tm * 0.012) + ease(clamp((tm - 9) / 9, 0, 1)) * 0.78;
    if (I.t > 12.5 && !I.epi) { I.epi = true; this.ui.epigraph(true); }
    if (I.t > 21.5 && I.epi && !I.epiOff) { I.epiOff = true; this.ui.epigraph(false); }
    if (I.t > 23 && !I.prompt) {
      I.prompt = true;
      this.ui.prompt('[振り返る|ふりかえる|turn around]', 'turn around', () => this.turnAround());
    }
  }

  updateTrain(dt) {
    if (this.place !== 'platform' || !this.intro || !this.intro.started) return;
    const tm = Math.max(0, this.intro.t - this.intro.go);
    if (this.mode !== 'intro') this.intro.t += dt;
    this.trainX = -2 + 0.45 * tm * tm;
  }

  turnAround() {
    if (this.mode !== 'intro') return;
    this.ui.prompt(null);
    this.ui.epigraph(false);
    this.ui.hint(null);
    this.fade = Math.min(this.fade, 0.3);
    this.mode = 'turn';
    this.turn = { t: 0, from: this.P.yaw, dur: 6.0 };
    this.audio.ui('blip');
  }

  updateTurn(dt) {
    const T = this.turn;
    T.t += dt;
    this.fade = damp(this.fade, 0, 1.2, dt);
    const k = ease(clamp(T.t / T.dur, 0, 1));
    this.P.yaw = T.from + wrapA(0 - T.from) * k;
    this.P.pitch = lerp(this.S.start.pitch, -0.15, k);
    if (T.t > T.dur) {
      this.mode = 'play';
      this.P.yaw = 0;
      this.ui.area('platform');
      this.ui.archBtn(this.store.arch.size, true);
      this.ctx.timeout(() => this.ui.log('[区域|くいき|the Zone]に[到着|とうちゃく|arrival]した', 'ARRIVED · H06', 'You have arrived in the Zone'), 1200);
      this.ctx.timeout(() => {
        if (this.mode === 'play' && !this.nuts.length && !this.seen.has('threw')) {
          this.ui.hint('throw', '[地面|じめん|ground]をクリックして、ナットを[投げる|なげる|throw]', 'click the ground ahead to throw a nut');
        }
      }, 3200);
      if (this.store.bonfire) this.ctx.timeout(() => { if (this.place === 'platform') this.ui.warp(true, () => this.transition('monolith', { atBonfire: true })); }, 4000);
    }
  }

  // ─────────────────────────────────────────────────────────── the nut
  groundHit(r) {
    const S = this.S;
    let t = 0.3;
    for (let i = 0; i < 400 && t < 70; i++) {
      const x = r.o[0] + r.d[0] * t, y = r.o[1] + r.d[1] * t, z = r.o[2] + r.d[2] * t;
      if (y <= S.ground(x, z) + 0.01) return [x, z];
      t += 0.06 + t * 0.012;
    }
    return null;
  }

  tryThrow() {
    if (this.nuts.some((n) => n.state === 'fly' || n.state === 'hang' || n.state === 'return' || (n.state === 'orbit' && n.orb.t < 2.4))) return;
    const P = this.P;
    const r = this.eng.ray(this.pointer.x, this.pointer.y);
    const hit = this.groundHit(r);
    let tx, tz;
    if (hit) [tx, tz] = hit;
    else {
      const l = hyp(r.d[0], r.d[2]) || 1;
      tx = P.x + (r.d[0] / l) * MAX_THROW;
      tz = P.z + (r.d[2] / l) * MAX_THROW;
    }
    let dx = tx - P.x, dz = tz - P.z, d = hyp(dx, dz);
    if (d < 0.01) { dx = Math.sin(P.yaw); dz = Math.cos(P.yaw); d = 1; }
    const want = clamp(d, 1.1, MAX_THROW);
    tx = P.x + (dx / d) * want;
    tz = P.z + (dz / d) * want;
    [tx, tz] = this.S.clampT(tx, tz);
    if (hyp(tx - P.x, tz - P.z) < 0.6) return;
    this.throwNut(tx, tz);
  }

  throwNut(tx, tz) {
    const P = this.P, S = this.S;
    const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
    const o = [P.x + rx * 0.22 + fx * 0.25, P.gy + P.eye - 0.32, P.z + rz * 0.22 + fz * 0.25];
    const ty = S.ground(tx, tz) + 0.02;
    const dist = hyp(tx - o[0], tz - o[2]);
    const T = 0.62 + dist * 0.06;
    const v = [(tx - o[0]) / T, (ty - o[1]) / T + 0.5 * G * T, (tz - o[2]) / T];
    const n = {
      pos: o.slice(), vel: v, state: 'fly', t: 0, track: [[P.x, P.z], [o[0], o[2]]],
      tainted: false, inA: null, bounced: false, gz: [], gp: [], id: Math.random(),
    };
    for (let i = 0; i < 8; i++) { const p = [o[0] - fx * i * 0.06, o[1], o[2] - fz * i * 0.06]; n.gz.push(p); n.gp.push(p.slice()); }
    this.nuts.push(n);
    while (this.nuts.length > 7) this.nuts.shift();
    this.audio.throwNut(0.15);
    if (!this.seen.has('threw')) { this.seen.add('threw'); this.ui.hint(null); }
  }

  updateNuts(dt) {
    const S = this.S;
    const H = 1 / 120;
    for (const n of this.nuts) {
      n.t += dt;
      if (n.state === 'fly') {
        let acc = dt;
        while (acc > 0 && n.state === 'fly') {
          const h = Math.min(H, acc);
          acc -= h;
          const v = n.vel, p = n.pos;
          v[1] -= G * h;
          if (n.inA && n.inA.type === 'haze') {
            const a = n.inA;
            const dx = p[0] - a.x, dz = p[2] - a.z, d = hyp(dx, dz) || 1e-3;
            const vh = hyp(v[0], v[2]) || 1e-3;
            let px = -v[2] / vh, pz = v[0] / vh;
            if (px * dx + pz * dz < 0) { px = -px; pz = -pz; }
            const k = 15 + 24 * (1 - d / a.r);
            v[0] += px * k * h; v[2] += pz * k * h;
            v[1] += Math.sin(n.t * 37) * 7 * h;
            v[0] *= 1 - 0.7 * h; v[2] *= 1 - 0.7 * h;
          }
          p[0] += v[0] * h; p[1] += v[1] * h; p[2] += v[2] * h;
          const wx = WALLX[this.place];
          if (wx && Math.abs(p[0]) > wx) {
            p[0] = Math.sign(p[0]) * wx;
            v[0] *= -0.3;
            if (!n.wallHit) { n.wallHit = true; this.audio.land('concrete', this.dist(p), this.panOf(p), true); }
          }
          for (const a of this.anoms) {
            const inside = hyp(p[0] - a.x, p[2] - a.z) < a.r;
            if (inside && n.inA !== a && !n.hit?.has(a)) this.enterAnomaly(n, a);
            else if (!inside && n.inA === a) n.inA = null;
            if (n.state !== 'fly') break;
          }
          const last = n.track[n.track.length - 1];
          if (hyp(p[0] - last[0], p[2] - last[1]) > 0.12) n.track.push([p[0], p[2]]);
          const gy = S.ground(p[0], p[2]);
          if (p[1] <= gy + 0.012 && v[1] < 0) this.landNut(n, gy);
        }
      } else if (n.state === 'land') {
        if (this.place === 'corridor' && n.pos[1] > 0.012) n.pos[1] = Math.max(0.012, n.pos[1] - dt * 0.35);
        if (n.autoPick && this.time > n.autoPick) { n.dead = true; this.audio.pickup(); }
      } else if (n.state === 'orbit') {
        const o = n.orb, A = o.A;
        o.t += dt;
        if (o.t < 2.4) {
          o.w = lerp(3, 11, o.t / 2.4);
          o.r = damp(o.r, 0.35, 2, dt);
          o.y = damp(o.y, 2.7, 1.5, dt);
        } else {
          o.w = damp(o.w, 2.0, 1.2, dt);
          o.r = damp(o.r, 0.5, 1, dt);
          o.y = damp(o.y, 1.9 + 0.25 * Math.sin(this.time * 0.9 + A.x), 1, dt);
        }
        o.a += o.w * dt;
        n.pos[0] = A.x + Math.cos(o.a) * o.r;
        n.pos[1] = o.y;
        n.pos[2] = A.z + Math.sin(o.a) * o.r;
      } else if (n.state === 'hang') {
        n.hang.t += dt;
        const j = 0.012;
        n.pos[0] = n.hang.p[0] + (Math.random() - 0.5) * j;
        n.pos[1] = n.hang.p[1] + (Math.random() - 0.5) * j + Math.sin(n.hang.t * 3) * 0.02;
        n.pos[2] = n.hang.p[2] + (Math.random() - 0.5) * j;
        if (n.hang.t > 1.25) {
          const P = this.P;
          n.state = 'return';
          n.ret = { t: 0, from: n.pos.slice(), to: [P.x + Math.sin(P.yaw) * 0.85, S.ground(P.x, P.z) + 0.012, P.z + Math.cos(P.yaw) * 0.85] };
        }
      } else if (n.state === 'return') {
        const R = n.ret;
        R.t += dt;
        const s = ease(clamp(R.t / 1.5, 0, 1));
        const mid = [(R.from[0] + R.to[0]) / 2, Math.max(R.from[1], R.to[1]) + 1.1, (R.from[2] + R.to[2]) / 2];
        for (let i = 0; i < 3; i++) n.pos[i] = (1 - s) * (1 - s) * R.from[i] + 2 * (1 - s) * s * mid[i] + s * s * R.to[i];
        if (s >= 1) {
          n.state = 'land';
          n.autoPick = this.time + 0.9;
          this.audio.land(S.surface(n.pos[0], n.pos[2]), 1, 0, true);
          this.ui.log('ナットが[戻って|もどって|came back]きた', 'THE NUT CAME BACK', 'The nut came back to you');
        }
      }
      this.updateGauze(n, dt);
    }
    this.nuts = this.nuts.filter((n) => !n.dead);
  }

  enterAnomaly(n, a) {
    n.inA = a;
    (n.hit ||= new Set()).add(a);
    n.tainted = true;
    a.pulse = 1;
    a.reveal = Math.max(a.reveal, 0.001);
    a.revealT = 1;
    this.audio.anomaly(a.type, this.panOf([a.x, 1, a.z]), this.dist([a.x, 1, a.z]));
    const nm = TX.ANOMALY_NAMES[a.type];
    this.ui.log(`[異常|いじょう|anomaly]：${nm.jp}`, nm.en.toUpperCase(), `Anomaly: ${nm.en}`);
    if (!this.seen.has('taint')) {
      this.seen.add('taint');
      this.ctx.timeout(() => this.ui.hint('taint', 'ナットの[軌道|きどう|trajectory]が[乱れた|みだれた|was disturbed]。その[跡|あと|trail]はたどるな。', 'its flight was disturbed — do not follow that trail'), 900);
      this.ctx.timeout(() => { if (this.ui.hintKey() === 'taint') this.ui.hint(null); }, 9000);
    }
    const v = n.vel, p = n.pos;
    if (a.type === 'well') {
      n.vel = [v[0] * 0.12, -15, v[2] * 0.12];
    } else if (a.type === 'whirl') {
      n.state = 'orbit';
      n.orb = { A: a, a: Math.atan2(p[2] - a.z, p[0] - a.x), r: hyp(p[0] - a.x, p[2] - a.z), y: p[1], w: 3, t: 0 };
      this.spawnSwirl(a);
    } else if (a.type === 'back') {
      n.state = 'hang';
      n.hang = { t: 0, p: p.slice() };
      this.spawnHanging(a);
    }
  }

  landNut(n, gy) {
    const S = this.S, p = n.pos, v = n.vel;
    const surf = S.surface(p[0], p[2]);
    const d = this.dist(p), pn = this.panOf(p);
    if (HARD.has(surf) && v[1] < -2.5 && !n.bounced) {
      n.bounced = true;
      n.vel = [v[0] * 0.35, -v[1] * 0.22, v[2] * 0.35];
      p[1] = gy + 0.013;
      this.audio.land(surf, d, pn);
      return;
    }
    n.state = 'land';
    p[1] = gy + 0.012;
    n.vel = [0, 0, 0];
    if (!n.bounced) this.audio.land(surf, d, pn);
    n.track.push([p[0], p[2]]);
    n.landT = this.time;
    if (surf === 'water') { this.ripple(p[0], p[2], 1.2); this.splash(p); }
    if (surf === 'sand') this.puff(p, [0.62, 0.55, 0.42]);
    if (n.inA && n.inA.type === 'well') { this.puff(p, this.place === 'dunes' ? [0.6, 0.53, 0.4] : [0.3, 0.29, 0.22], 1.8); }
    if (!this.seen.has('landed')) {
      this.seen.add('landed');
      this.ctx.timeout(() => {
        if (this.mode === 'play' && this.nuts.some((k) => k.state === 'land')) this.ui.hint('follow', 'ナットをクリックして、その[跡|あと|trail]をたどる', 'click the nut to follow its path');
      }, 700);
    }
  }

  updateGauze(n, dt) {
    const S = this.S;
    const g = n.gz, gp = n.gp;
    g[0][0] = n.pos[0]; g[0][1] = n.pos[1]; g[0][2] = n.pos[2];
    const gust = this.audio ? this.audio.gust : 0.6;
    const w = (S.wind || 0) * (0.5 + gust);
    const t = this.time;
    const water = this.place === 'corridor' ? 0.145 : null;
    const dt2 = dt * dt;
    for (let i = 1; i < g.length; i++) {
      const p = g[i], q = gp[i];
      const vx = (p[0] - q[0]) * 0.95, vy = (p[1] - q[1]) * 0.95, vz = (p[2] - q[2]) * 0.95;
      q[0] = p[0]; q[1] = p[1]; q[2] = p[2];
      const fl = Math.sin(t * 9 + i * 1.3 + n.id * 20);
      p[0] += vx + (2.6 * w + fl * 1.5 * w) * dt2;
      p[1] += vy + (-5.5 + Math.max(0, fl) * 2 * w) * dt2;
      p[2] += vz + (1.1 * w + Math.cos(t * 7 + i) * 1.2 * w) * dt2;
      if (n.tainted && n.state === 'land' && !n.autoPick) {
        p[1] += Math.abs(Math.sin(t * 2 + i)) * 0.0006;
        p[0] += (Math.random() - 0.5) * 0.002;
      }
    }
    for (let it = 0; it < 4; it++) {
      for (let i = 1; i < g.length; i++) {
        const a = g[i - 1], b = g[i];
        const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-5;
        const k = (d - 0.062) / d;
        b[0] -= dx * k; b[1] -= dy * k; b[2] -= dz * k;
        const gy = water != null ? water : S.ground(b[0], b[2]) + 0.006;
        if (b[1] < gy) b[1] = gy;
      }
    }
  }

  // ─────────────────────────────────────────────────────────── walking
  walk(n) {
    if (n.state !== 'land' || n.autoPick) return;
    const P = this.P;
    const raw = [[P.x, P.z], ...n.track.slice(1), [n.pos[0], n.pos[2]]];
    const path = [raw[0]];
    for (let i = 1; i < raw.length; i++) {
      const a = path[path.length - 1], b = raw[i];
      const d = hyp(b[0] - a[0], b[1] - a[1]);
      if (d < 0.05) continue;
      const k = Math.ceil(d / 0.2);
      for (let j = 1; j <= k; j++) path.push([lerp(a[0], b[0], j / k), lerp(a[1], b[1], j / k)]);
    }
    const cum = [0];
    for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + hyp(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
    this.W = { path, cum, len: cum[cum.length - 1], s: 0, nut: n };
    this.mode = 'walk';
    this.ui.hint(null);
    this.ui.warp(false);
    if (this.place === 'platform' && this.sepiaT > 0.5) { this.sepiaT = 0; this.sepiaK = 0.28; }
    if (!this.seen.has('walked')) this.seen.add('walked');
  }

  pathAt(s) {
    const W = this.W;
    const { path, cum } = W;
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const a = path[i - 1], b = path[i];
    const t = clamp((s - cum[i - 1]) / Math.max(1e-4, cum[i] - cum[i - 1]), 0, 1);
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  }

  updateWalk(dt) {
    const W = this.W, P = this.P, S = this.S;
    const speed = 1.25;
    W.s = Math.min(W.len, W.s + speed * dt);
    const [x, z] = this.pathAt(W.s);
    const [ax, az] = this.pathAt(Math.min(W.len, W.s + 0.9));
    P.x = x; P.z = z;
    if (hyp(ax - x, az - z) > 0.05) P.yaw = dampA(P.yaw, Math.atan2(ax - x, az - z), 2.2, dt);
    P.walking = 1;
    const prev = P.step;
    P.step += dt * (TAU / 1.1);
    if (Math.floor(prev / Math.PI) !== Math.floor(P.step / Math.PI)) {
      const surf = S.surface(P.x, P.z);
      this.audio.step(surf, Math.floor(P.step / Math.PI) % 2 ? 1 : -1);
      if (surf === 'water') this.ripple(P.x + Math.sin(P.yaw) * 0.3, P.z + Math.cos(P.yaw) * 0.3, 0.6);
    }
    for (const a of this.anoms) {
      if (hyp(P.x - a.x, P.z - a.z) < a.r) { this.pullBack(a); return; }
    }
    if (W.s >= W.len - 1e-3) {
      W.nut.dead = true;
      this.audio.pickup();
      P.walking = 0;
      this.mode = 'play';
      this.afterArrive();
    }
  }

  afterArrive() {
    const P = this.P, S = this.S;
    if (P.z >= S.exitZ) {
      if (this.place === 'monolith') this.arriveBonfire();
      else this.goNext();
      return;
    }
    if (this.place === 'corridor' && !this.panDone && P.z > S.pan.z0) this.startPan();
    if (this.place === 'platform' && !this.seen.has('walkhint2') && this.seen.has('walked')) {
      this.seen.add('walkhint2');
    }
  }

  pullBack(a) {
    this.mode = 'pull';
    const P = this.P;
    this.PB = { t: 0, a, fx: P.x, fz: P.z, reset: false };
    a.reveal = 1;
    a.pulse = 1;
    this.audio.pull();
    this.ui.hint(null);
  }

  updatePull(dt) {
    const B = this.PB, P = this.P, a = B.a;
    B.t += dt;
    if (!B.reset) {
      const k = clamp(B.t / 2.6, 0, 1);
      this.pullAmt = ease(k);
      P.x = lerp(B.fx, a.x, ease(k) * 0.45);
      P.z = lerp(B.fz, a.z, ease(k) * 0.45);
      P.eye = this.S.eye + ease(k) * 0.5;
      P.roll = Math.sin(B.t * 1.7) * 0.07 * k;
      P.pitch = lerp(P.pitch, 0.25, k * 0.02);
      this.white = sstep(1.9, 2.9, B.t);
      if (B.t > 3.1) {
        B.reset = true;
        B.t = 0;
        this.pulls[this.place] = (this.pulls[this.place] || 0) + 1;
        this.layout();
        this.nuts = [];
        this.parts.length = 0;
        const S = this.S;
        P.x = S.start.x; P.z = S.start.z; P.yaw = this.place === 'platform' ? 0 : S.start.yaw;
        P.pitch = this.place === 'platform' ? -0.15 : S.start.pitch;
        P.eye = S.eye; P.roll = 0; P.gy = S.ground(P.x, P.z);
        if (this.place === 'tunnel') { this.tunnelL = 34; this.tunnelSnap = false; }
        this.audio.release();
        this.ui.log('[区域|くいき|the Zone]が[組み替わった|くみかわった|rearranged itself]', 'THE ZONE HAS REARRANGED', 'The Zone has rearranged itself');
        if (this.pulls[this.place] >= 2) this.addWatch();
      }
    } else {
      this.pullAmt = damp(this.pullAmt, 0, 2.5, dt);
      this.white = damp(this.white, 0, 1.4, dt);
      if (B.t > 2.6) {
        this.pullAmt = 0;
        this.mode = 'play';
      }
    }
  }

  // ─────────────────────────────────────────────────────────── corridor: the slow pan over the water
  startPan() {
    this.mode = 'pan';
    const P = this.P;
    this.pan = { t: 0, z: P.z, x0: P.x, z0: P.z, phase: 'down', k: 0 };
    for (const a of this.archs) if (a.after === 'pan') a.on = true;
    this.audio.droneLevel(0.55, 3);
    this.ctx.timeout(() => this.audio.phrase(), 5000);
  }

  updatePan(dt) {
    const N = this.pan, P = this.P, S = this.S;
    N.t += dt;
    if (N.phase === 'down') {
      N.k = Math.min(1, N.k + dt / 3.5);
      const k = ease(N.k);
      P.eye = lerp(S.eye, 0.92, k);
      P.pitch = lerp(-0.08, -1.36, k);
      P.x = lerp(N.x0, 0.05, k);
      P.z = lerp(N.z0, S.pan.from, k);
      P.yaw = dampA(P.yaw, 0, 2, dt);
      if (N.k >= 1) { N.phase = 'glide'; }
    } else if (N.phase === 'glide') {
      if (this.ui.isOpen()) return;
      const near = Math.min(Math.abs(P.z - 0.1 - 12.9), Math.abs(P.z - 0.1 - 14.5));
      const sp = 0.07 + 0.17 * sstep(0.15, 0.55, near);
      P.z += sp * dt;
      P.x = 0.05 + Math.sin(N.t * 0.21) * 0.1;
      if (Math.random() < dt * 0.9) this.ripple(P.x + (Math.random() - 0.5) * 1.2, P.z + Math.random() * 0.8, 0.5);
      if (P.z >= S.pan.to) { N.phase = 'up'; N.k = 0; N.z1 = P.z; N.x1 = P.x; }
    } else {
      N.k = Math.min(1, N.k + dt / 3.2);
      const k = ease(N.k);
      P.eye = lerp(0.92, S.eye, k);
      P.pitch = lerp(-1.36, -0.06, k);
      P.z = lerp(N.z1, 16.4, k);
      P.x = lerp(N.x1, 0, k);
      if (N.k >= 1) {
        this.mode = 'play';
        this.panDone = true;
        this.audio.droneLevel(0.85, 3);
      }
    }
  }

  // ─────────────────────────────────────────────────────────── the bonfire
  arriveBonfire() {
    this.mode = 'bonfire';
    this.ui.prompt('[篝火|かがりび|bonfire]を[灯す|ともす|light]', 'light the bonfire', () => this.ignite());
  }

  ignite(already = false) {
    if (this.mode === 'lit' || this.mode === 'rest') return;
    this.mode = 'lit';
    this.lit = { t: already ? 5 : 0, already };
    this.ui.prompt(null);
    this.audio.fire(true);
    if (!already) this.audio.ignite();
    else this.fireA = 1;
    this.store.bonfire = true;
    this.ctx.store.set('bonfire', true);
  }

  updateLit(dt) {
    const L = this.lit;
    L.t += dt;
    this.fireA = damp(this.fireA, 1, 2.2, dt);
    this.P.yaw = dampA(this.P.yaw, Math.atan2(0 - this.P.x, 41.4 - this.P.z), 1.5, dt);
    this.P.pitch = damp(this.P.pitch, -0.2, 0.8, dt);
    if (!L.already) {
      if (L.t > 0.7 && !L.big) { L.big = true; this.ui.big(true); this.audio.lit(); }
      if (L.t > 4.6 && !L.bigOff) { L.bigOff = true; this.ui.big(false); this.ui.log('[篝火|かがりび|bonfire]を[灯した|ともした|lit]', 'BONFIRE LIT', 'Bonfire lit'); }
    }
    if (L.t > 5.6 && !L.prompt) {
      L.prompt = true;
      this.ui.prompt('[休む|やすむ|rest]', 'rest', () => this.rest());
    }
  }

  rest() {
    if (this.mode !== 'lit') return;
    this.ui.prompt(null);
    this.mode = 'rest';
    this.R = { t: 0, bloom: 0, menu: false, awarded: false, eye0: this.P.eye, p0: this.P.pitch };
    this.audio.resolve();
    this.audio.fireLevel(0.32);
    // the messages of strangers, arranged around the fire
    const n = TX.BLOOM.length;
    const order = TX.BLOOM.map((d, i) => i).sort(() => Math.random() - 0.5);
    this.bloom = TX.BLOOM.map((d, i) => {
      const k = order[i];
      const a = Math.PI * 0.93 + (k / (n - 1)) * Math.PI * 1.14 + (Math.random() - 0.5) * 0.08;
      const r = 1.25 + (k % 3) * 0.55 + Math.random() * 0.2;
      return { d, x: Math.cos(a) * r * 1.25, z: 41.4 + Math.sin(a) * r * 0.85, yaw: (Math.random() - 0.5) * 0.5 - Math.cos(a) * 0.4, k: 0, seed: Math.random(), at: 1.2 + i * 0.42 };
    }).filter((b) => b.z > 38.6 || Math.abs(b.x) > 1.2);
    if (this.store.my) this.placeMine(this.store.my);
  }

  myCount() {
    const my = this.store.my;
    if (!my) return 0;
    const hrs = Math.max(0, (Date.now() - my.at) / 3.6e6);
    return Math.min(4999, Math.floor(Math.pow(hrs, 0.62) * 3));
  }

  placeMine(my) {
    const tpl = TX.TEMPLATES[my.lang][my.t], word = TX.WORDS[my.lang][my.w];
    const text = tpl.replace('{}', word);
    const enText = TX.TEMPLATES.en[my.t].replace('{}', TX.WORDS.en[my.w]);
    this.mine = { x: -1.25, z: 40.15, yaw: 0.35, k: 0, seed: 0.77, d: my.lang === 'jp' ? { jp: text, t: enText } : { en: text }, own: true };
  }

  updateRest(dt) {
    const R = this.R, P = this.P;
    R.t += dt;
    const k = ease(clamp(R.t / 3.2, 0, 1));
    P.eye = lerp(R.eye0, 0.98, k);
    P.pitch = lerp(R.p0, -0.03, k);
    P.yaw = dampA(P.yaw, Math.atan2(0 - P.x, 41.4 - P.z), 1.2, dt);
    for (const b of this.bloom) if (R.t > b.at) {
      if (b.k === 0) this.audio.ui('tick');
      b.k = Math.min(1, b.k + dt * 0.7);
    }
    if (this.mine) this.mine.k = Math.min(1, this.mine.k + dt * 0.5);
    if (R.t > 3 && !R.myToast && this.store.my && this.myCount() > 0) {
      R.myToast = true;
      this.ui.log('あなたの[伝言|でんごん|message]が[評価|ひょうか|appraisal]された', 'YOUR MESSAGE WAS APPRAISED', 'Your message was appraised by a stranger');
      this.audio.appraise();
    }
    if (R.t > 6.5 && !R.awarded) { R.awarded = true; this.ctx.award(AWARD); }
    if (R.t > 13.5 && !R.line) {
      R.line = true;
      this.ui.line('[願い|ねがい|wish]は、まだ[言わなくて|いわなくて|(you) need not say]いい。', 'You do not have to say your wish yet.');
    }
    if (R.t > 24 && !R.lineOff) { R.lineOff = true; this.ui.line(null); }
    this.roomRain = R.t < 10 ? damp(this.roomRain, 0, 1, dt) : R.t < 32 ? damp(this.roomRain, 1, 0.35, dt) : damp(this.roomRain, 0, 0.3, dt);
    if (R.t > 13 && !this.ui.isOpen() && !R.menu) {
      R.menu = true;
      this.ui.menu([
        { jp: '[伝言|でんごん|message]を[書く|かく|write]', en: 'write a message', fn: () => { R.menu = false; this.ui.menu(null); this.compose(); } },
        { jp: '[記録|きろく|records]を[読む|よむ|read]', en: 'archives', fn: () => { R.menu = false; this.ui.menu(null); this.ui.archives(); } },
        { jp: '[立ち去る|たちさる|leave]', en: 'leave', fn: () => { this.ui.menu(null); this.toCoda(); } },
      ]);
    }
    if (R.menu && this.ui.isOpen()) { /* panels hide the menu; it comes back after */ }
  }

  compose() {
    this.ui.composer((m) => {
      const my = { ...m, at: Date.now() };
      this.store.my = my;
      this.ctx.store.set('my', my);
      this.placeMine(my);
      this.audio.message();
      this.ui.log('[伝言|でんごん|message]を[残した|のこした|left]', 'MESSAGE LEFT', 'You left a message');
    });
  }

  toCoda() {
    this.audio.droneLevel(0, 2.5);
    this.audio.fireLevel(0);
    this.transition('coda', { outDur: 3.5 });
  }

  // ─────────────────────────────────────────────────────────── coda
  startCoda() {
    this.mode = 'coda';
    this.C = { t: 0, x: 0.12, jerk: [], tremble: 0, line: false, prompt: false };
    const steps = [[11.6, 0.08], [13.3, 0.07], [14.7, 0.13], [16.2, 0.09], [17.4, 0.11], [18.9, 0.1], [20.3, 0.08], [21.9, 0.065]];
    let x = 0.12;
    for (const [t, d] of steps) { x += d; this.C.jerk.push({ t, x }); }
    this.C.from = 0.12;
    this.ctx.exitVisible(false);
    this.audio.droneLevel(0.25, 6);
    this.audio.coda();
    this.ui.areaVisible(false);
    this.ui.archBtn(this.store.arch.size, false);
  }

  updateCoda(dt) {
    const C = this.C;
    C.t += dt;
    const t = C.t;
    C.tremble = sstep(8.5, 13, t) * (1 - sstep(23, 29, t));
    let x = C.from;
    for (const j of C.jerk) {
      if (t >= j.t) {
        const k = clamp((t - j.t) / 0.4, 0, 1);
        const prev = x;
        x = lerp(prev, j.x, ease(k));
        if (!j.done) { j.done = true; this.audio.scrape(0.35); }
      }
    }
    C.x = Math.min(0.836, x);
    this.sepiaT = t > 12 ? lerp(1, 0.42, sstep(12, 34, t)) : 1;
    this.sepiaK = 0.6;
    if (t > 33 && !C.line) {
      C.line = true;
      this.ui.line('[誰|だれ|anyone]も[見て|みて|watching]いなくても、グラスは[動く|うごく|moves]。', 'Even when no one is watching, the glass moves.');
    }
    if (t > 41 && !C.prompt) {
      C.prompt = true;
      this.ctx.exitVisible(true);
      this.ui.prompt('[列車|れっしゃ|train]が[来た|きた|has come]', 'the train is here', () => {
        this.ui.prompt(null);
        this.ui.line(null);
        this.leaving = true;
        this.ctx.timeout(() => this.ctx.leave(), 1600);
      });
    }
    if (this.leaving) this.fade = damp(this.fade, 1, 2, dt);
    else if (t > 0.4) this.fade = damp(this.fade, 0, 0.45, dt);
  }

  // ─────────────────────────────────────────────────────────── interactables
  activate(h) {
    const a = this.audio;
    switch (h.type) {
      case 'nut': this.walk(h.ref); break;
      case 'msg': {
        const m = h.ref;
        const appraised = this.store.appr.has(m.key);
        a.message();
        this.ui.message(m.d, {
          count: m.d.n + (appraised ? 1 : 0), appraised,
          onAppraise: () => {
            this.store.appr.add(m.key);
            this.ctx.store.set('appr', [...this.store.appr]);
            a.appraise();
          },
        });
        break;
      }
      case 'bloom': {
        const b = h.ref;
        a.message();
        const key = 'bloom:' + TX.BLOOM.indexOf(b.d);
        const appraised = this.store.appr.has(key);
        this.ui.message(b.d, {
          count: b.d.n + (appraised ? 1 : 0), appraised,
          onAppraise: () => { this.store.appr.add(key); this.ctx.store.set('appr', [...this.store.appr]); a.appraise(); },
        });
        break;
      }
      case 'mine': {
        a.message();
        this.ui.message(this.mine.d, { count: this.myCount(), own: true, appraised: true, onAppraise: () => {} });
        break;
      }
      case 'arch': {
        const ar = h.ref;
        this.store.arch.add(ar.key);
        this.ctx.store.set('arch', [...this.store.arch]);
        this.archs = this.archs.filter((x) => x !== ar);
        a.archive();
        this.ui.archBtn(this.store.arch.size, true);
        this.ui.log(`アーカイブ[入手|にゅうしゅ|obtained]：${TX.ARCHIVES[ar.key].plain}`, 'ARCHIVE ACQUIRED', `Archive acquired: ${TX.ARCHIVES[ar.key].entitle}`);
        this.ctx.timeout(() => { if (!this.ui.isOpen()) this.ui.archives(ar.key); }, 450);
        break;
      }
      case 'blood': this.startPhantom(); break;
      case 'slab': a.message(); this.ui.slab(); break;
      case 'fire':
        if (this.mode === 'bonfire') this.ignite();
        else if (this.mode === 'lit' && this.lit.prompt) this.rest();
        break;
    }
  }

  updateHover(force = false) {
    const ui = this.ui, E = this.eng, P = this.P, m = this.mode;
    this.hover = null;
    if (!this.pointer.inside || ui.isOpen() || !E.cam) { ui.tag(false); this.setCursor(false); return; }
    const px = this.pointer.x, py = this.pointer.y;
    let best = null, bs = 1;
    const cand = (type, ref, wp, rpx, reach, label, en) => {
      if (reach != null && hyp(wp[0] - P.x, wp[2] - P.z) > reach) return;
      const s = E.project(wp);
      if (!s) return;
      const d = hyp(s.x - px, s.y - py) / rpx;
      if (d < bs) { bs = d; best = { type, ref, sx: s.x, sy: s.y, label, en }; }
    };
    const S = this.S;
    const sc = (wp) => { const s = E.project(wp); return s ? clamp(3.2 / s.z, 0.55, 1.8) : 1; };
    if (m === 'play') {
      for (const n of this.nuts) if (n.state === 'land' && !n.autoPick) cand('nut', n, [n.pos[0], n.pos[1] + 0.05, n.pos[2]], 36, null, 'たどる', 'follow the nut');
      for (const g of this.msgs) { const w = [g.x, S.ground(g.x, g.z), g.z]; cand('msg', g, w, 70 * sc(w), 5.5, '[読む|よむ|read]', 'read message'); }
      for (const ar of this.archs) if (ar.on) cand('arch', ar, [ar.x, ar.y + 0.1, ar.z], 46, 6.2, '[拾う|ひろう|pick up]', 'pick up');
      if (this.blood && !this.phantom) { const w = [this.blood.x, 0.02, this.blood.z]; cand('blood', this.blood, w, 60 * sc(w), 5.5, '[触れる|ふれる|touch]', 'touch the bloodstain'); }
      if (S.slab) cand('slab', S.slab, [S.slab.x, 1.5, S.slab.z], 95, 7.5, '[調べる|しらべる|examine]', 'examine');
    } else if (m === 'pan') {
      for (const ar of this.archs) if (ar.on) cand('arch', ar, [ar.x, ar.y + 0.02, ar.z], 70, 5, '[拾う|ひろう|pick up]', 'pick up');
    } else if (m === 'bonfire' || m === 'lit') {
      const can = m === 'bonfire' || (this.lit && this.lit.prompt);
      if (can) cand('fire', null, [0, 0.45, 41.4], 110, null, m === 'bonfire' ? '[灯す|ともす|light]' : '[休む|やすむ|rest]', m === 'bonfire' ? 'light the bonfire' : 'rest');
    } else if (m === 'rest') {
      for (const b of this.bloom) if (b.k > 0.5) { const w = [b.x, 0, b.z]; cand('bloom', b, w, 60 * sc(w), null, '[読む|よむ|read]', 'read message'); }
      if (this.mine) { const w = [this.mine.x, 0, this.mine.z]; cand('mine', this.mine, w, 60 * sc(w), null, '[読む|よむ|read]', 'your message'); }
    }
    this.hover = best;
    if (best && !this.pointer.touch) ui.tag(true, best.sx, best.sy - 16, ctxPlain(best.label), best.en);
    else ui.tag(false);
    this.setCursor(!!best);
  }

  setCursor(h) {
    const c = this.eng.canvas;
    const wait = ['intro', 'turn', 'walk', 'pull', 'trans', 'coda'].includes(this.mode) || (this.mode === 'rest' && !h);
    c.classList.toggle('zn-hov', h);
    c.classList.toggle('zn-wait', !h && wait);
  }

  // ─────────────────────────────────────────────────────────── the phantom (someone's last moment)
  startPhantom() {
    const B = this.blood;
    this.phantom = { t: 0, x: B.x, z: B.z, yaw: Math.atan2(B.toX - B.x, B.toZ - B.z), ph: 0, nut: null, seed: Math.random() * 100 };
    this.audio.phantom();
    this.ui.log('[誰か|だれか|someone]の、[最後|さいご|last]の[瞬間|しゅんかん|moment]', 'A BLOODSTAIN', 'Someone’s last moment');
  }

  updatePhantom(dt) {
    const F = this.phantom;
    if (!F) return;
    const B = this.blood;
    F.t += dt;
    const t = F.t;
    // ghost nut: thrown at 1.25s, veers in the haze, lands off to the side
    if (t > 1.25 && !F.nut) {
      F.nut = { t: 0, p0: [F.x + 0.25, 1.35, F.z + 0.3], p1: [B.toX - 0.1, 2.2, B.toZ - 0.4], p2: [B.toX + 1.5, 0.02, B.toZ + 1.5], g: [] };
    }
    if (F.nut) {
      const N = F.nut;
      N.t += dt;
      const s = clamp(N.t / 1.25, 0, 1);
      const q = (i) => (1 - s) * (1 - s) * N.p0[i] + 2 * (1 - s) * s * N.p1[i] + s * s * N.p2[i];
      N.pos = [q(0), s < 1 ? q(1) + Math.sin(s * Math.PI) * 0.6 : 0.03, q(2)];
      N.g.unshift(N.pos.slice());
      if (N.g.length > 9) N.g.pop();
      if (s > 0.5 && !N.veer) {
        N.veer = true;
        const a = this.anoms.find((x) => hyp(x.x - B.toX, x.z - B.toZ) < 0.6);
        if (a) { a.pulse = 1; a.reveal = Math.max(a.reveal, 0.6); this.audio.anomaly('haze', this.panOf([a.x, 1, a.z]), this.dist([a.x, 1, a.z])); }
      }
    }
    // walk toward the ghost nut (into the anomaly)
    const dz = B.toZ - B.z, dx = B.toX - B.x, L = hyp(dx, dz);
    if (t > 2.7 && t < 5.1) {
      const k = clamp((t - 2.7) / 2.4, 0, 1);
      F.x = B.x + (dx / L) * k * (L - 0.6);
      F.z = B.z + (dz / L) * k * (L - 0.6);
      F.ph += dt * (TAU / 1.1);
    }
    if (t > 5.1 && !F.lifted) {
      F.lifted = true;
      const a = this.anoms.find((x) => hyp(x.x - B.toX, x.z - B.toZ) < 0.6);
      if (a) { a.pulse = 1; a.reveal = 1; }
      this.audio.anomaly('haze', this.panOf([F.x, 1, F.z]), this.dist([F.x, 1, F.z]));
    }
    if (t > 8.6) this.phantom = null;
  }

  phantomPoints(buf) {
    const F = this.phantom;
    if (!F) return;
    const t = F.t;
    const alpha = sstep(0, 0.8, t) * (1 - sstep(6.4, 8.4, t));
    const lift = sstep(5.1, 7.6, t);
    const dis = sstep(5.6, 8.4, t);
    const walking = t > 2.7 && t < 5.1 ? 1 : 0;
    const yaw = F.yaw + lift * lift * 4.5;
    const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const sw = Math.sin(F.ph) * 0.42 * walking;
    const bob = walking ? Math.abs(Math.sin(F.ph)) * 0.04 : 0;
    const base = [F.x, 0.95 + bob + lift * 1.3, F.z];
    const L = (x, y, z) => [base[0] + rx * x + fx * z, base[1] + y, base[2] + rz * x + fz * z];
    // throw: right arm winds back then whips forward
    const th = t > 0.8 && t < 1.7 ? (t - 0.8) / 0.9 : t >= 1.7 ? 1 : 0;
    const armR = th > 0 ? (th < 0.45 ? lerp(0.2, -2.3, th / 0.45) : lerp(-2.3, 1.4, Math.min(1, (th - 0.45) / 0.25))) : -sw * 0.8;
    const ext = (a, b, ang, len, bend = 0) => [a[0] + rx * 0 + fx * Math.sin(ang) * len, a[1] - Math.cos(ang) * len, a[2] + fz * Math.sin(ang) * len + rz * 0];
    const hipL = L(-0.1, 0, 0), hipR = L(0.1, 0, 0), chest = L(0, 0.45, 0.02), neck = L(0, 0.6, 0.03), head = L(0, 0.74, 0.04);
    const shL = L(-0.19, 0.43, 0), shR = L(0.19, 0.43, 0);
    const lift2 = lift * 0.9;
    const kneeL = ext(hipL, 0, sw + lift2 * 0.3, 0.45), kneeR = ext(hipR, 0, -sw + lift2 * 0.5, 0.45);
    const footL = ext(kneeL, 0, sw - Math.max(0, Math.sin(F.ph)) * 0.6 * walking + lift2 * 0.2, 0.45);
    const footR = ext(kneeR, 0, -sw - Math.max(0, -Math.sin(F.ph)) * 0.6 * walking + lift2 * 0.6, 0.45);
    const elL = ext(shL, 0, -sw * 0.8 - lift2 * 1.2, 0.28), haL = ext(elL, 0, -sw * 0.6 - lift2 * 1.6 + 0.2, 0.27);
    const elR = ext(shR, 0, armR - lift2 * 1.0, 0.28), haR = ext(elR, 0, armR + 0.25 - lift2 * 1.4, 0.27);
    const bones = [[hipL, kneeL], [kneeL, footL], [hipR, kneeR], [kneeR, footR], [L(0, 0, 0), chest], [chest, neck], [shL, elL], [elL, haL], [shR, elR], [elR, haR], [shL, shR], [hipL, hipR]];
    const seed = F.seed;
    let k = 0;
    const push = (p, size, a) => {
      k++;
      const h1 = Math.sin(k * 12.9898 + seed) * 43758.5453, r1 = h1 - Math.floor(h1);
      const h2 = Math.sin(k * 78.233 + seed) * 12345.678, r2 = h2 - Math.floor(h2);
      const up = dis * (0.4 + r1 * 2.2);
      const sx = Math.sin(t * 3 + k) * dis * 0.6 * r2, sz = Math.cos(t * 2.6 + k) * dis * 0.6 * r1;
      const j = 0.012;
      buf.push(p[0] + sx + (Math.random() - 0.5) * j, p[1] + up + (Math.random() - 0.5) * j, p[2] + sz + (Math.random() - 0.5) * j, size,
        0.95, 0.12, 0.07, a * alpha * (1 - dis * r1 * 0.8), 0);
    };
    for (const [a, b] of bones) {
      for (let i = 0; i <= 9; i++) {
        const s = i / 9;
        const p = [lerp(a[0], b[0], s), lerp(a[1], b[1], s), lerp(a[2], b[2], s)];
        push(p, 0.045, 0.32);
        if (i % 2 === 0) push(p, 0.17, 0.07);
      }
    }
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; push([head[0] + Math.cos(a) * 0.1 * rx, head[1] + Math.sin(a) * 0.12, head[2] + Math.cos(a) * 0.1 * rz], 0.045, 0.4); }
    push(head, 0.3, 0.12);
    for (const p of [chest, L(0, 0.22, 0.01), L(0, 0.05, 0)]) push(p, 0.5, 0.1);
    // the ghost nut and its strip
    const N = F.nut;
    if (N && N.pos) for (let i = 0; i < N.g.length; i++) push(N.g[i], i === 0 ? 0.05 : 0.035, 0.7 * (1 - i / N.g.length));
  }

  // ─────────────────────────────────────────────────────────── particles
  puff(p, col, scale = 1) {
    for (let i = 0; i < 26 * scale; i++) {
      const a = Math.random() * TAU, s = (0.4 + Math.random() * 1.2) * scale;
      this.parts.push({ p: [p[0], p[1] + 0.05, p[2]], v: [Math.cos(a) * s, 0.3 + Math.random() * 0.9 * scale, Math.sin(a) * s], life: 0, max: 0.9 + Math.random() * 1.2, size: 0.05 + Math.random() * 0.08, col, a: 0.45, drag: 2.6, g: -0.4, add: false, kind: 0 });
    }
  }
  splash(p) {
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * TAU, s = 0.4 + Math.random() * 0.8;
      this.parts.push({ p: [p[0], 0.15, p[2]], v: [Math.cos(a) * s, 1.4 + Math.random() * 1.6, Math.sin(a) * s], life: 0, max: 0.7, size: 0.018, col: [0.85, 0.9, 0.86], a: 0.6, drag: 0.6, g: -9, add: false, kind: 0 });
    }
  }
  spawnSwirl(a) {
    const col = this.place === 'dunes' ? [0.68, 0.6, 0.46] : [0.45, 0.43, 0.3];
    for (let i = 0; i < 90; i++) {
      this.parts.push({ swirl: a, ang: Math.random() * TAU, rad: a.r * (0.3 + Math.random() * 0.8), h: Math.random() * 0.4, life: 0, max: 2 + Math.random() * 2.2, size: 0.03 + Math.random() * 0.05, col, a: 0.5, add: false, kind: 0, p: [0, 0, 0] });
    }
  }
  spawnHanging(a) {
    for (let i = 0; i < 40; i++) {
      const ang = Math.random() * TAU, r = Math.sqrt(Math.random()) * a.r;
      this.parts.push({ hang: true, p: [a.x + Math.cos(ang) * r, 0.2 + Math.random() * 2.2, a.z + Math.sin(ang) * r], v: [0, 0, 0], life: 0, max: 6 + Math.random() * 4, size: 0.02 + Math.random() * 0.02, col: [0.9, 0.9, 0.85], a: 0.5, add: false, kind: 0, drag: 0, g: 0 });
    }
  }

  updateParticles(dt) {
    const out = [];
    for (const q of this.parts) {
      q.life += dt;
      if (q.life > q.max) continue;
      if (q.swirl) {
        const a = q.swirl;
        q.ang += dt * (3 + 6 / (0.3 + q.rad));
        q.rad = Math.max(0.1, q.rad - dt * 0.15);
        q.h += dt * (0.6 + q.rad * 0.4);
        q.p[0] = a.x + Math.cos(q.ang) * q.rad;
        q.p[1] = this.S.ground(a.x, a.z) + q.h;
        q.p[2] = a.z + Math.sin(q.ang) * q.rad;
      } else if (q.hang) {
        q.p[1] += Math.sin(this.time * 0.7 + q.p[0] * 9) * 0.0008;
      } else {
        const k = Math.exp(-q.drag * dt);
        q.v[0] *= k; q.v[1] = q.v[1] * k + q.g * dt; q.v[2] *= k;
        q.p[0] += q.v[0] * dt; q.p[1] += q.v[1] * dt; q.p[2] += q.v[2] * dt;
      }
      out.push(q);
    }
    this.parts = out;
    // ambient: embers, leaves, motes
    const S = this.S, P = this.P;
    if (this.fireA > 0.05 && Math.random() < dt * 30 * this.fireA) {
      const a = Math.random() * TAU, r = Math.random() * 0.3;
      this.parts.push({ ember: true, p: [Math.cos(a) * r, 0.25, 41.4 + Math.sin(a) * r], v: [(Math.random() - 0.5) * 0.3, 0.7 + Math.random() * 1.1, (Math.random() - 0.5) * 0.3], life: 0, max: 1.4 + Math.random() * 2.6, size: 0.022 + Math.random() * 0.02, col: [1, 0.5 + Math.random() * 0.25, 0.15], a: 1, drag: 0.4, g: 0.15, add: true, kind: 2 });
    }
    for (const q of this.parts) if (q.ember) { q.v[0] += Math.sin(this.time * 3 + q.p[1] * 4) * dt * 0.6; }
    if (this.place === 'field' && Math.random() < dt * 1.4) {
      this.parts.push({ leaf: true, p: [P.x + (Math.random() - 0.5) * 14, 5 + Math.random() * 4, P.z + 1 + Math.random() * 14], v: [0.4, -0.55, 0.15], life: 0, max: 12, size: 0.045, col: [0.62, 0.52, 0.2], a: 0.85, drag: 0, g: 0, add: false, kind: 0 });
    }
    for (const q of this.parts) if (q.leaf) { q.v[0] = 0.45 + Math.sin(this.time * 2.1 + q.max * 7) * 0.5; q.v[2] = Math.cos(this.time * 1.7 + q.max * 3) * 0.4; if (q.p[1] < 0.05) { q.v[1] = 0; q.v[0] = 0; q.v[2] = 0; } }
    const interior = this.place === 'corridor' || this.place === 'dunes' || this.place === 'tunnel' || this.place === 'coda';
    if (interior) {
      const N = this.place === 'dunes' ? 320 : 220;
      while (this.motes.length < N) this.motes.push({ p: [P.x + (Math.random() - 0.5) * 8, Math.random() * 4, P.z + Math.random() * 12 - 2], ph: Math.random() * TAU, s: 0.006 + Math.random() * 0.01 });
      for (const m of this.motes) {
        m.p[0] += Math.sin(this.time * 0.3 + m.ph) * dt * 0.05;
        m.p[1] += Math.sin(this.time * 0.21 + m.ph * 2) * dt * 0.03 - dt * 0.005;
        m.p[2] += Math.cos(this.time * 0.25 + m.ph) * dt * 0.05;
        if (Math.abs(m.p[0] - P.x) > 4 || m.p[2] < P.z - 2.5 || m.p[2] > P.z + 11 || m.p[1] < 0) {
          m.p = [P.x + (Math.random() - 0.5) * 8, 0.2 + Math.random() * 3.8, P.z + Math.random() * 12 - 2];
        }
      }
    }
  }

  ripple(x, z, amp) {
    const i = (this.ripN++ % 8) * 4;
    this.F.rip[i] = x; this.F.rip[i + 1] = z; this.F.rip[i + 2] = this.time; this.F.rip[i + 3] = amp;
  }

  dist(p) { const c = this.cam ? this.cam.pos : [this.P.x, 1.6, this.P.z]; return hyp(p[0] - c[0], p[1] - c[1], p[2] - c[2]); }
  panOf(p) {
    const b = this.eng.cam;
    if (!b) return 0;
    const v = [p[0] - b.pos[0], p[1] - b.pos[1], p[2] - b.pos[2]];
    const l = hyp(v[0], v[1], v[2]) || 1;
    return clamp((v[0] * b.r[0] + v[1] * b.r[1] + v[2] * b.r[2]) / l, -0.9, 0.9);
  }

  // ─────────────────────────────────────────────────────────── per frame
  frame(dt) {
    if (!this.eng.ok || document.hidden) return;
    dt = Math.min(dt, 0.05);
    this.time += dt;
    this.placeT += dt;
    this.eng.adapt(dt);
    this.update(dt);
    this.draw(dt);
  }

  update(dt) {
    switch (this.mode) {
      case 'intro': this.updateIntro(dt); break;
      case 'turn': this.updateTurn(dt); break;
      case 'walk': this.updateWalk(dt); break;
      case 'pull': this.updatePull(dt); break;
      case 'pan': this.updatePan(dt); break;
      case 'lit': this.updateLit(dt); break;
      case 'rest': this.updateRest(dt); break;
      case 'coda': this.updateCoda(dt); break;
      case 'trans': this.updateTrans(dt); break;
      case 'bonfire':
        this.P.yaw = dampA(this.P.yaw, Math.atan2(-this.P.x, 41.4 - this.P.z), 1.4, dt);
        this.P.pitch = damp(this.P.pitch, -0.3, 1.2, dt);
        break;
      default: break;
    }
    if (this.mode !== 'walk') this.P.walking = damp(this.P.walking, 0, 6, dt);
    if (this.mode !== 'intro' && this.mode !== 'turn' && this.mode !== 'trans' && this.mode !== 'coda' && !this.leaving) this.fade = damp(this.fade, 0, 1.5, dt);
    this.sepia = damp(this.sepia, this.sepiaT, this.sepiaK, dt);
    this.updateTrain(dt);
    this.updateNuts(dt);
    this.updatePhantom(dt);
    this.updateParticles(dt);
    this.updateWorld(dt);
    this.updateCamera(dt);
    this.updateHover();
  }

  updateTrans(dt) {
    const T = this.trans;
    T.t += dt;
    if (T.phase === 'out') {
      const k = clamp(T.t / T.outDur, 0, 1);
      if (T.white) this.white = Math.max(this.white, ease(k));
      else this.fade = Math.max(this.fade, ease(k));
      if (k >= 1 && this.eng.isReady(T.id)) {
        this.ui.closeAll();
        this.ui.line(null);
        this.enterPlace(T.id, { keep: true, atBonfire: T.opts.atBonfire });
        T.phase = 'in';
        T.t = 0;
        if (T.id === 'coda') { this.mode = 'coda'; this.fadeInCoda = true; }
      } else if (k >= 1 && this.eng.sceneFailed(T.id)) {
        // a place that will not draw is skipped, never a dead end
        const i = ORDER.indexOf(T.id);
        T.id = ORDER[i + 1] || 'monolith';
      }
    } else {
      const k = clamp(T.t / 2.6, 0, 1);
      if (T.white) this.white = 1 - ease(k);
      else this.fade = 1 - ease(k);
      if (k >= 1) {
        this.white = 0;
        if (this.mode === 'trans') this.mode = this.lit && this.place === 'monolith' && T.opts.atBonfire ? 'lit' : 'play';
      }
    }
    if (this.mode === 'coda' && this.fadeInCoda) {
      this.fade = damp(this.fade, 0, 0.5, dt);
    }
  }

  updateWorld(dt) {
    const S = this.S, P = this.P;
    for (const a of this.anoms) {
      a.pulse = Math.max(0, a.pulse - dt * 0.55);
      if (a.revealT) a.reveal = Math.min(1, a.reveal + dt * 0.8);
    }
    // near hum: you can feel something you cannot see
    let near = 0;
    for (const a of this.anoms) near = Math.max(near, 1 - clamp((hyp(P.x - a.x, P.z - a.z) - a.r) / 1.6, 0, 1));
    if (this.audio) this.audio.near(this.mode === 'walk' || this.mode === 'play' ? near * 0.6 : 0);
    if (this.place === 'tunnel') {
      if (!this.tunnelSnap) {
        const target = 34 + clamp((P.z - 3) / 12, 0, 1) * 13;
        this.tunnelL = damp(this.tunnelL, target, 0.6, dt);
        if (P.z > 17.5) { this.tunnelSnap = true; this.tunnelL = 31; this.audio.anomaly('well', 0, 25); this.ui.log('[出口|でぐち|exit]が[近づいた|ちかづいた|drew near]', 'THE EXIT IS CLOSER', 'The exit drew near'); }
      }
    }
    if (this.place === 'corridor' && Math.random() < dt * 0.9) this.ripple(P.x + (Math.random() - 0.5) * 2.6, P.z + 1 + Math.random() * 9, 0.45);
    if (this.place === 'dunes' && this.placeT > 6 && !this.bird) this.bird = { t: 0, z: P.z + 13, y: 8.5, gone: false };
    if (this.bird && !this.bird.gone) {
      this.bird.t += dt;
      if (this.bird.t > 4.2) this.bird.gone = true;
    }
  }

  updateCamera(dt) {
    const P = this.P, S = this.S, m = this.mode;
    if (m !== 'pan' && m !== 'pull') P.gy = damp(P.gy, S.ground(P.x, P.z), 10, dt);
    const allow = !this.ctx.reduced && !this.pointer.touch && this.pointer.inside && ['play', 'walk', 'bonfire', 'lit', 'rest'].includes(m);
    const tx = allow ? (this.pointer.x / this.ctx.w - 0.5) * 0.12 : 0;
    const ty = allow ? -(this.pointer.y / this.ctx.h - 0.5) * 0.07 : 0;
    this.look.yaw = damp(this.look.yaw, tx, 1.8, dt);
    this.look.pitch = damp(this.look.pitch, ty, 1.8, dt);
    const red = this.ctx.reduced ? 0.3 : 1;
    const bob = (Math.abs(Math.sin(P.step)) * 0.035 - 0.018) * P.walking * red;
    const breathe = Math.sin(this.time * 1.3) * 0.0035 + Math.sin(this.time * 0.37) * 0.003;
    const roll = P.roll + Math.sin(P.step) * 0.004 * P.walking * red;
    const aspect = this.ctx.w / this.ctx.h;
    let vfov = S.vfov;
    const minH = 46;
    const needV = (2 * Math.atan(Math.tan((minH * Math.PI) / 360) / aspect) * 180) / Math.PI;
    vfov = Math.min(92, Math.max(vfov, needV));
    if (m === 'coda') {
      const C = this.C;
      const sh = C ? C.tremble * 0.0006 : 0;
      this.cam = {
        pos: [S.start.x + Math.sin(this.time * 0.13) * 0.006 + (Math.random() - 0.5) * sh, S.eye + Math.sin(this.time * 0.17) * 0.004, S.start.z],
        yaw: S.start.yaw + Math.sin(this.time * 0.11) * 0.004, pitch: S.start.pitch + Math.sin(this.time * 0.15) * 0.003, roll: 0, vfov,
      };
    } else {
      this.cam = { pos: [P.x, P.gy + P.eye + bob, P.z], yaw: P.yaw + this.look.yaw, pitch: P.pitch + this.look.pitch + breathe, roll, vfov };
    }
    this.eng.camUniforms(this.cam);
  }

  // ─────────────────────────────────────────────────────────── draw
  draw() {
    const E = this.eng, F = this.F, S = this.S, P = this.P;
    E.tris.reset(); E.ptsAdd.reset(); E.ptsAlpha.reset(); E.decals.reset(); E.fires.reset();
    const cam = this.cam;
    const B = basis(cam.yaw, cam.pitch);
    F.scene = this.place;
    F.time = this.time;
    F.cam = cam;
    F.fog = S.fog; F.fogDen = S.fogDen; F.fogK = S.fogK;
    F.tex = this.place === 'platform' ? 'sign' : this.place === 'corridor' ? 'floor' : null;
    // anomalies → ground marks / grass flattening
    for (let i = 0; i < 6; i++) {
      const a = this.anoms[i];
      if (a && a.type === 'well') { F.anom[i * 4] = a.x; F.anom[i * 4 + 1] = a.z; F.anom[i * 4 + 2] = a.r; F.anom[i * 4 + 3] = 0.16 + 0.84 * a.reveal; }
      else { F.anom[i * 4 + 3] = 0; F.anom[i * 4 + 2] = 1; }
    }
    F.p0.fill(0);
    if (this.place === 'platform') { F.p0[0] = this.trainX; F.p0[1] = this.trainX < 260 ? 1 : 0; F.p0[2] = clamp(1.2 - (this.trainX - 60) / 400, 0, 1); }
    if (this.place === 'tunnel') { F.p0[0] = this.tunnelL; F.p0[1] = 1 + Math.sin(this.time * 7) * 0.02 + (Math.random() < 0.01 ? -0.3 : 0); }
    if (this.place === 'coda' && this.C) { F.p0[0] = this.C.x; F.p0[1] = this.C.tremble; F.p0[2] = this.C.tremble; }
    const fl = 0.85 + Math.sin(this.time * 9.1) * 0.06 + Math.sin(this.time * 23.7) * 0.05 + Math.sin(this.time * 4.3) * 0.04;
    F.fire[0] = 0; F.fire[1] = 0.55; F.fire[2] = 41.4; F.fire[3] = this.place === 'monolith' ? this.fireA * fl : 0;
    F.fireA = this.fireA;
    F.rainRings = S.rain || 0;
    // grass
    if (S.grassA) {
      const g = (this.grassU ||= { wind: 0.5, push: new Float32Array(4), A: [0, 0, 0], B: [0, 0, 0], light: 1 });
      g.wind = (S.wind || 0) * (0.55 + (this.audio ? this.audio.gust : 0.6) * 0.6);
      g.push[0] = P.x; g.push[1] = P.z; g.push[2] = 0.35 * Math.max(P.walking, 0.5);
      g.A = S.grassA; g.B = S.grassB; g.light = S.grassLight;
      F.grass = g;
    } else F.grass = null;
    // rain
    const R0 = F.rain[0];
    R0.amt = (S.rain || 0) * 0.38;
    R0.col = S.rainCol || R0.col;
    F.rain[1].amt = this.place === 'monolith' ? this.roomRain * 0.55 : 0;

    // gauze strips and nuts
    const gl = GAUZE[this.place] || 0.8;
    const tri = E.tris;
    const camP = cam.pos;
    const strip = (pts, w0, w1, c, a) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const p = pts[i], q = pts[i + 1];
        const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2];
        const vx = (p[0] + q[0]) / 2 - camP[0], vy = (p[1] + q[1]) / 2 - camP[1], vz = (p[2] + q[2]) / 2 - camP[2];
        let sx = dy * vz - dz * vy, sy = dz * vx - dx * vz, sz = dx * vy - dy * vx;
        const sl = hyp(sx, sy, sz) || 1;
        const wa = lerp(w0, w1, i / (pts.length - 1)) / 2 / sl, wb = lerp(w0, w1, (i + 1) / (pts.length - 1)) / 2 / sl;
        const A1 = [p[0] - sx * wa, p[1] - sy * wa, p[2] - sz * wa], A2 = [p[0] + sx * wa, p[1] + sy * wa, p[2] + sz * wa];
        const B1 = [q[0] - sx * wb, q[1] - sy * wb, q[2] - sz * wb], B2 = [q[0] + sx * wb, q[1] + sy * wb, q[2] + sz * wb];
        const sh = 0.82 + 0.18 * Math.sin(i * 1.7 + this.time * 3);
        for (const v of [A1, A2, B1, A2, B2, B1]) tri.push(v[0], v[1], v[2], c[0] * sh, c[1] * sh, c[2] * sh, a);
      }
    };
    for (const n of this.nuts) {
      const c = [0.94 * gl, 0.93 * gl, 0.89 * gl];
      if (this.place === 'tunnel') { c[0] += 0.12; c[1] += 0.12; c[2] += 0.11; }
      strip(n.gz, 0.05, 0.03, c, 0.96);
      const p = n.pos;
      const s = 0.022;
      const r = B.r, u = B.u;
      const q = (a, b) => [p[0] + r[0] * a * s + u[0] * b * s, p[1] + r[1] * a * s + u[1] * b * s, p[2] + r[2] * a * s + u[2] * b * s];
      const nc = 0.16 * gl + 0.04;
      for (const v of [q(-1, -1), q(1, -1), q(1, 1), q(-1, -1), q(1, 1), q(-1, 1)]) tri.push(v[0], v[1], v[2], nc, nc, nc * 0.95, 1);
    }
    // the bird that does not finish crossing the hall
    if (this.bird && !this.bird.gone) {
      const b = this.bird, x = lerp(-11, 11, b.t / 7.5), y = b.y + Math.sin(b.t * 1.3) * 0.4, z = b.z;
      const flap = Math.sin(b.t * 11) * 0.5;
      const body = [x, y, z];
      const wing = (side) => [x - 0.05, y + Math.sin(flap) * 0.35, z + side * 0.42];
      const tip = (side) => [x + 0.12, y + Math.sin(flap) * 0.38 * 1.2, z + side * 0.7];
      const c = 0.06;
      for (const s of [-1, 1]) {
        const w = wing(s), t = tip(s);
        for (const v of [[x + 0.15, y, z], [x - 0.12, y, z], w, w, t, [x + 0.05, y, z]]) tri.push(v[0], v[1], v[2], c, c, c, 1);
      }
      for (const v of [[x + 0.22, y + 0.02, z], [x - 0.25, y, z - 0.04], [x - 0.25, y, z + 0.04]]) tri.push(v[0], v[1], v[2], c, c, c, 1);
      void body;
    }

    // decals: soapstone messages, bloodstains
    const dec = E.decals;
    const decal = (x, z, w, l, yaw, kind, seed, inten, y) => {
      const gy = (y ?? S.ground(x, z)) + 0.03;
      const rx = Math.cos(yaw), rz = -Math.sin(yaw), fx = Math.sin(yaw), fz = Math.cos(yaw);
      const c = (a, b) => [x + rx * a * w / 2 + fx * b * l / 2, gy, z + rz * a * w / 2 + fz * b * l / 2];
      const v = [[c(-1, -1), 0, 0], [c(1, -1), 1, 0], [c(1, 1), 1, 1], [c(-1, -1), 0, 0], [c(1, 1), 1, 1], [c(-1, 1), 0, 1]];
      for (const [p, u, vv] of v) dec.push(p[0], p[1], p[2], u, vv, kind, seed, inten);
    };
    const hov = this.hover;
    for (const m of this.msgs) decal(m.x, m.z, 1.5, 0.55, m.yaw || 0, 0, m.seed, (hov && hov.ref === m ? 1.5 : 1) * (m.k === 0 ? 0.0 + clamp(this.placeT - 1, 0, 1) : 1));
    for (const b of this.bloom) if (b.k > 0) decal(b.x, b.z, 1.2, 0.45, b.yaw, 0, b.seed, b.k * (hov && hov.ref === b ? 1.5 : 0.9));
    if (this.mine) decal(this.mine.x, this.mine.z, 1.3, 0.48, this.mine.yaw, 0, this.mine.seed, this.mine.k * 1.15);
    if (this.blood) decal(this.blood.x, this.blood.z, 1.0, 1.0, 0.3, 1, 0.37, this.phantom ? 0.5 : (hov && hov.type === 'blood' ? 1.5 : 1));

    // fire
    if (this.place === 'monolith' && this.fireA > 0.01) {
      const r = [B.r[0], 0, B.r[2]];
      const rl = hyp(r[0], r[2]) || 1;
      r[0] /= rl; r[2] /= rl;
      const quads = [[0, 0, 0.95, 1.25, 0.1], [0.12, 0.05, 0.6, 0.85, 0.5], [-0.14, -0.04, 0.65, 0.9, 0.8], [0.03, 0.1, 0.5, 1.05, 0.3], [-0.05, -0.1, 0.8, 0.7, 0.65]];
      for (const [ox, oz, w, h, sd] of quads) {
        const cx = ox, cz = 41.4 + oz, y0 = 0.08;
        const hh = h * (0.6 + 0.4 * this.fireA);
        const c = (a, b) => [cx + r[0] * a * w / 2, y0 + b * hh, cz + r[2] * a * w / 2];
        const v = [[c(-1, 0), 0, 0], [c(1, 0), 1, 0], [c(1, 1), 1, 1], [c(-1, 0), 0, 0], [c(1, 1), 1, 1], [c(-1, 1), 0, 1]];
        for (const [p, u, vv] of v) E.fires.push(p[0], p[1], p[2], u, vv, sd);
      }
    }

    // points
    const add = E.ptsAdd, alp = E.ptsAlpha;
    for (const ar of this.archs) {
      if (!ar.on) continue;
      const pulse = 0.82 + 0.18 * Math.sin(this.time * 2.4 + ar.x * 3);
      const y = ar.y + 0.06 + Math.sin(this.time * 1.3) * 0.015;
      const gd = Math.min(1, this.dist([ar.x, y, ar.z]) / 3.5);
      add.push(ar.x, y, ar.z, 0.34 * pulse * Math.max(0.3, gd), 0.72, 0.86, 1.0, 0.9 * Math.max(0.5, gd), 1);
      add.push(ar.x, y, ar.z, 0.1, 0.9, 0.95, 1.0, 0.9, 0);
    }
    if (this.phantom) this.phantomPoints(add);
    for (const q of this.parts) {
      const life = q.life / q.max;
      const fa = Math.min(1, q.life * 4) * (1 - life * life);
      if (q.ember) add.push(q.p[0], q.p[1], q.p[2], q.size, q.col[0], q.col[1], q.col[2], q.a * fa * (0.6 + 0.4 * Math.sin(this.time * 20 + q.max * 9)), 2);
      else {
        const lf = q.leaf || q.hang ? 1 : 1;
        alp.push(q.p[0], q.p[1], q.p[2], q.size, q.col[0] * q.a * fa * lf, q.col[1] * q.a * fa * lf, q.col[2] * q.a * fa * lf, q.a * fa, 0);
      }
    }
    // whirls always carry a little dust; the observant will see it
    for (const a of this.anoms) {
      if (a.type !== 'whirl') continue;
      const n = 10 + Math.floor(a.reveal * 14);
      for (let i = 0; i < n; i++) {
        const ang = this.time * (1.6 + (i % 3) * 0.4) + i * 2.4 + a.ph;
        const rr = a.r * (0.35 + 0.5 * ((i * 0.37) % 1));
        const y = S.ground(a.x, a.z) + 0.2 + ((i * 0.53 + this.time * 0.25) % 1) * (1.2 + a.reveal * 1.5);
        const al = 0.22 + 0.25 * a.reveal;
        const col = this.place === 'dunes' ? [0.66, 0.58, 0.44] : [0.45, 0.42, 0.28];
        alp.push(a.x + Math.cos(ang) * rr, y, a.z + Math.sin(ang) * rr, 0.03, col[0] * al, col[1] * al, col[2] * al, al, 0);
      }
    }
    if (this.motes.length) {
      const sun = this.place === 'corridor' ? sunCorr : this.place === 'dunes' ? sunHall : null;
      for (const m of this.motes) {
        const lit = sun ? sun(m.p[0], m.p[1], m.p[2]) : 0;
        const a = 0.08 + lit * 0.55;
        const c = this.place === 'tunnel' ? 0.5 : 0.95;
        alp.push(m.p[0], m.p[1], m.p[2], m.s * (1 + lit), c * a, c * a * 0.97, c * a * 0.88, a, 0);
      }
    }

    // post
    const PP = F.post;
    PP.sepia = this.sepia;
    PP.fade = this.fade;
    PP.white = this.white;
    PP.pull = this.pullAmt;
    if (this.mode === 'pull' && this.PB) {
      const s = E.project([this.PB.a.x, P.gy + 1.0, this.PB.a.z]);
      if (s) { PP.pullC[0] = s.x / this.ctx.w; PP.pullC[1] = 1 - s.y / this.ctx.h; }
    }
    PP.grain = S.grain; PP.expo = S.expo; PP.vig = S.vig; PP.bloom = S.bloom; PP.sat = S.sat; PP.tint = S.tint;
    const dk = this.place === 'tunnel' ? 0.35 : 1;
    for (let i = 0; i < 6; i++) {
      const a = this.anoms[i];
      PP.dist[i * 4 + 3] = 0;
      if (!a) continue;
      const base = a.type === 'haze' ? 0.13 + 0.32 * a.reveal : a.type === 'back' ? 0.05 + 0.15 * a.reveal : 0.04 + 0.12 * a.reveal;
      const st = (base + a.pulse * 1.1) * dk;
      const s = E.project([a.x, S.ground(a.x, a.z) + 1.0, a.z]);
      if (!s || s.z > 30) continue;
      PP.dist[i * 4] = s.x / this.ctx.w;
      PP.dist[i * 4 + 1] = 1 - s.y / this.ctx.h;
      PP.dist[i * 4 + 2] = clamp((a.r * 1.25 * E.cam.focal) / (2 * s.z), 0.02, 0.9);
      PP.dist[i * 4 + 3] = st;
    }
    E.render(F);
  }

  resize(w, h) { if (this.eng.ok) this.eng.resize(w, h); }
  destroy() {
    try { this.eng.destroy(); } catch (e) {}
  }
}

// labels in the floating tag are plain text: strip gloss markup
function ctxPlain(s) { return s.replace(/\[([^\[\]|]+)\|[^\[\]|]*\|[^\[\]]*\]/g, '$1'); }

export default {
  id: 'zone',
  mount(root, ctx) {
    const z = new Zone(root, ctx);
    return {
      destroy() { z.destroy(); },
      resize(w, h) { z.resize(w, h); },
    };
  },
};
