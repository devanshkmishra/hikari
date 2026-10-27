// 黄昏ヶ浜 — every sound synthesized: the sea, wind that dies at dusk (夕凪), black-tailed
// gulls, a ferry's horn across the bay, the town's 17:00 chime, crickets, and a small radio
// playing an original slow piece for electric piano and pad.
import { mtof, driveCurve } from '../../lib/audio.js';

const rnd = (a, b) => a + Math.random() * (b - a);

// ── the piece: 64 BPM, D♭ major, 16 bars ──
const BEAT = 60 / 64;
const CHORDS = [
  { b: 42, v: [58, 61, 65, 68] },             // G♭maj9
  { b: 41, v: [56, 60, 63, 67] },             // Fm9
  { b: 39, v: [54, 58, 61, 65] },             // E♭m9
  { b: 44, v: [54, 58, 61, 63], v2: [54, 58, 60, 63] }, // A♭sus → A♭
  { b: 37, v: [56, 60, 63, 65] },             // D♭maj9
  { b: 46, v: [56, 60, 61, 65] },             // B♭m9
  { b: 42, v: [53, 58, 60, 61] },             // G♭maj7(♯11)
  { b: 44, v: [54, 58, 61, 63], v2: [54, 60, 63] },     // A♭sus → A♭
];
// [bar, beat, midi, beats]
const MELODY = [
  [0, 1.5, 77, 1], [0, 2.5, 75, 0.5], [0, 3, 73, 3],
  [1, 2, 68, 1], [1, 3, 70, 1.5],
  [2, 0, 73, 2], [2, 2.5, 75, 0.5], [2, 3, 77, 1],
  [3, 0, 75, 3],
  [4, 1, 80, 1], [4, 2, 77, 0.5], [4, 2.5, 75, 0.5], [4, 3, 73, 1.5],
  [5, 0, 77, 2], [5, 2, 75, 1], [5, 3, 72, 1],
  [6, 0.5, 73, 1], [6, 1.5, 70, 0.5], [6, 2, 68, 2.5],
  [7, 3, 70, 1],
  [8, 0.5, 82, 1], [8, 1.5, 80, 0.5], [8, 2, 77, 2.5],
  [9, 1, 75, 1], [9, 2, 77, 1], [9, 3, 80, 1],
  [10, 0, 78, 2], [10, 2, 77, 1], [10, 3, 73, 1],
  [11, 0, 75, 3.5],
  [12, 1.5, 72, 0.5], [12, 2, 73, 1], [12, 3, 77, 1],
  [13, 0, 80, 2], [13, 2.5, 77, 1.5],
  [14, 0, 75, 1], [14, 1, 73, 1], [14, 2, 70, 2],
  [15, 1, 68, 1], [15, 2, 72, 2],
];

export class CoastSound {
  constructor(ctx) {
    this.ctx = ctx;
    this.A = ctx.audio;
    this.ac = this.A.ac;
    this.alive = true;
    this.srcs = [];
    this.dusk = 0;
    this.set = 0;
    this.simT = 0;
    const ac = this.ac;

    this.amb = ac.createGain();
    this.amb.gain.value = 1;
    this.amb.connect(ctx.out);
    this.wet = ac.createGain();
    this.wet.gain.value = 1;
    this.wet.connect(ctx.send);

    this._bed();
    this._wind();
    this._radioChain();

    ctx.signal.addEventListener('abort', () => this.destroy());
    ctx.timeout(() => this._surf(), 1200);
    ctx.timeout(() => this._lap(), 2600);
    ctx.timeout(() => this._gust(), 1500);
    ctx.timeout(() => this._gulls(), 9000);
    ctx.timeout(() => this._crickets(), 4000);
    ctx.interval(() => this._musicTick(), 90);
  }

  get running() { return this.alive && this.ac.state === 'running'; }

  _loop(kind, sec) {
    const s = this.ac.createBufferSource();
    s.buffer = this.A.noise(kind, sec);
    s.loop = true;
    s.start(0, Math.random() * (sec - 0.1));
    this.srcs.push(s);
    return s;
  }
  _shot(kind, sec, t, dur) {
    const s = this.ac.createBufferSource();
    s.buffer = this.A.noise(kind, sec);
    s.loop = true;
    s.start(t, Math.random() * (sec - 0.1));
    s.stop(t + dur);
    return s;
  }
  _filt(type, f, q = 0.7, g = 0) {
    const b = this.ac.createBiquadFilter();
    b.type = type; b.frequency.value = f; b.Q.value = q;
    if (g) b.gain.value = g;
    return b;
  }
  _gain(v) { const g = this.ac.createGain(); g.gain.value = v; return g; }
  _pan(v) {
    if (this.ac.createStereoPanner) { const p = this.ac.createStereoPanner(); p.pan.value = v; return p; }
    return this._gain(1);
  }
  _osc(type, f) { const o = this.ac.createOscillator(); o.type = type; o.frequency.value = f; return o; }

  // the sea breathing: a low wash that swells and settles
  _bed() {
    const ac = this.ac;
    const s = this._loop('brown', 7.3);
    const lp = this._filt('lowpass', 420, 0.4);
    const g = this._gain(0.13);
    const l1 = this._osc('sine', 0.071), l1g = this._gain(0.045);
    const l2 = this._osc('sine', 0.113), l2g = this._gain(0.03);
    l1.connect(l1g).connect(g.gain);
    l2.connect(l2g).connect(g.gain);
    l1.start(); l2.start();
    this.srcs.push(l1, l2);
    s.connect(lp).connect(g).connect(this.amb);

    const s2 = this._loop('pink', 6.1);
    const bp = this._filt('bandpass', 850, 0.5);
    const l3 = this._osc('sine', 0.087), l3g = this._gain(280);
    l3.connect(l3g).connect(bp.frequency);
    l3.start();
    this.srcs.push(l3);
    const g2 = this._gain(0.03);
    s2.connect(bp).connect(g2);
    g2.connect(this.amb);
    g2.connect(this._gain(0.4)).connect(this.wet);
    void ac;
  }

  // a wave arriving, breaking, and the long hiss of it going back
  _surf() {
    if (!this.alive) return;
    this.ctx.timeout(() => this._surf(), rnd(6500, 11500));
    if (!this.running) return;
    const ac = this.ac;
    const t = ac.currentTime + 0.05;
    const big = rnd(0.6, 1.1);
    const pan = this._pan(rnd(-0.45, 0.35));
    pan.connect(this.amb);
    const sendG = this._gain(0.28);
    pan.connect(sendG).connect(this.wet);

    const n1 = this._shot('pink', 6.1, t, 7.5);
    const bp = this._filt('bandpass', 220, 0.7);
    bp.frequency.setValueAtTime(220, t);
    bp.frequency.exponentialRampToValueAtTime(1250 * big, t + 1.9);
    bp.frequency.exponentialRampToValueAtTime(420, t + 5.2);
    const g1 = this._gain(0);
    g1.gain.setValueAtTime(0, t);
    g1.gain.linearRampToValueAtTime(0.075 * big, t + 1.8);
    g1.gain.setTargetAtTime(0, t + 2.0, 1.1);
    n1.connect(bp).connect(g1).connect(pan);

    const t2 = t + 2.0;
    const n2 = this._shot('white', 5.3, t2, 6.5);
    const hp = this._filt('highpass', 2600, 0.5);
    const pk = this._filt('peaking', 6400, 0.8, 5);
    const fizz = this._gain(0.45);
    const mod = this._shot('brown', 7.3, t2, 6.5);
    const modG = this._gain(0.9);
    mod.connect(modG).connect(fizz.gain);
    const g2 = this._gain(0);
    g2.gain.setValueAtTime(0, t2);
    g2.gain.linearRampToValueAtTime(0.03 * big, t2 + 0.45);
    g2.gain.setTargetAtTime(0, t2 + 0.6, 1.25);
    n2.connect(hp).connect(pk).connect(fizz).connect(g2).connect(pan);
  }

  // small water slapping the foot of the seawall below you
  _lap() {
    if (!this.alive) return;
    this.ctx.timeout(() => this._lap(), rnd(1700, 4600));
    if (!this.running) return;
    const t = this.ac.currentTime + 0.02;
    const n = this._shot('brown', 7.3, t, 0.9);
    const lp = this._filt('lowpass', rnd(380, 650), 0.9);
    const g = this._gain(0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(rnd(0.05, 0.11), t + 0.05);
    g.gain.setTargetAtTime(0, t + 0.08, 0.14);
    const pan = this._pan(rnd(-0.2, 0.3));
    n.connect(lp).connect(g).connect(pan).connect(this.amb);
    if (Math.random() < 0.45) {
      const n2 = this._shot('white', 5.3, t + 0.06, 0.3);
      const bp = this._filt('bandpass', rnd(900, 1600), 3);
      const g2 = this._gain(0);
      g2.gain.setValueAtTime(0, t + 0.06);
      g2.gain.linearRampToValueAtTime(0.012, t + 0.07);
      g2.gain.setTargetAtTime(0, t + 0.08, 0.05);
      n2.connect(bp).connect(g2).connect(pan);
    }
  }

  _wind() {
    const s = this._loop('pink', 6.1);
    this.windBP = this._filt('bandpass', 380, 0.8);
    this.windG = this._gain(0);
    this.windPan = this._pan(0);
    s.connect(this.windBP).connect(this.windG).connect(this.windPan);
    this.windPan.connect(this.amb);
    this.windPan.connect(this._gain(0.3)).connect(this.wet);
    const w = this._loop('white', 5.3);
    const wb = this._filt('bandpass', 1750, 9);
    this.whistleG = this._gain(0);
    w.connect(wb).connect(this.whistleG).connect(this.windPan);
    this.whistleBP = wb;
  }

  _gust() {
    if (!this.alive) return;
    this.ctx.timeout(() => this._gust(), rnd(3000, 7500));
    const t = this.ac.currentTime;
    const calm = 1 - Math.min(1, this.dusk * 1.6);   // 夕凪: the sea breeze dies at dusk
    const lvl = (0.012 + 0.05 * Math.pow(Math.random(), 1.6)) * (0.15 + 0.85 * calm);
    this.windG.gain.setTargetAtTime(lvl, t, rnd(1.2, 2.6));
    this.windBP.frequency.setTargetAtTime(rnd(240, 680), t, 2.2);
    this.whistleG.gain.setTargetAtTime(lvl * 0.09 * Math.random(), t, 1.8);
    this.whistleBP.frequency.setTargetAtTime(rnd(1400, 2300), t, 2.5);
    if (this.windPan.pan) this.windPan.pan.setTargetAtTime(rnd(-0.5, 0.5), t, 3);
  }

  // umineko — black-tailed gulls, the cat-voiced gull of Japanese harbours
  _call(t, f0, amp, pan, dur) {
    const ac = this.ac;
    const o = this._osc('sawtooth', f0);
    const vib = this._osc('sine', rnd(20, 31));
    const vg = this._gain(f0 * 0.022);
    vib.connect(vg).connect(o.frequency);
    o.frequency.setValueAtTime(f0 * 0.78, t);
    o.frequency.linearRampToValueAtTime(f0 * 1.1, t + dur * 0.22);
    o.frequency.linearRampToValueAtTime(f0 * 0.9, t + dur * 0.65);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + dur);
    const sum = this._gain(1);
    [[1350, 4, 1], [2600, 5, 0.55], [4000, 6, 0.22]].forEach(([f, q, a]) => {
      const b = this._filt('bandpass', f * rnd(0.93, 1.07), q);
      const g = this._gain(a);
      o.connect(b).connect(g).connect(sum);
    });
    const env = this._gain(0);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(amp, t + 0.04);
    env.gain.setTargetAtTime(amp * 0.7, t + 0.05, dur * 0.3);
    env.gain.setTargetAtTime(0, t + dur * 0.78, dur * 0.1);
    const lp = this._filt('lowpass', 3400, 0.5);
    const p = this._pan(pan);
    sum.connect(env).connect(lp).connect(p);
    p.connect(this.amb);
    p.connect(this._gain(0.55)).connect(this.wet);
    o.start(t); vib.start(t);
    o.stop(t + dur + 0.4); vib.stop(t + dur + 0.4);
    void ac;
  }

  _gulls() {
    if (!this.alive) return;
    const quiet = Math.min(1, this.dusk * 2.2);
    this.ctx.timeout(() => this._gulls(), rnd(15000, 36000) * (1 + quiet * 2));
    if (!this.running || Math.random() < quiet) return;
    const t0 = this.ac.currentTime + 0.1;
    const birds = Math.random() < 0.4 ? 2 : 1;
    for (let b = 0; b < birds; b++) {
      const f0 = rnd(560, 760);
      const pan = rnd(-0.8, 0.6);
      const n = 2 + Math.floor(Math.random() * 4);
      let t = t0 + b * rnd(0.9, 2.2);
      const amp0 = rnd(0.018, 0.034);
      for (let i = 0; i < n; i++) {
        const dur = rnd(0.32, 0.55);
        this._call(t, f0 * rnd(0.96, 1.04), amp0 * (1 - i * 0.12), pan, dur);
        t += dur + rnd(0.12, 0.35);
      }
    }
  }

  // one long blast from a ferry far across the bay, and its echo off the hills
  horn(pan = 0) {
    if (!this.running) return;
    const ac = this.ac;
    const t = ac.currentTime + 0.1;
    const f = 94;
    const mix = this._gain(1);
    const oscs = [this._osc('sawtooth', f), this._osc('sawtooth', f * 1.004), this._osc('square', f * 2.003)];
    const lv = [0.5, 0.5, 0.16];
    oscs.forEach((o, i) => {
      o.frequency.setValueAtTime(o.frequency.value * 0.965, t);
      o.frequency.linearRampToValueAtTime(o.frequency.value, t + 0.45);
      o.connect(this._gain(lv[i])).connect(mix);
      o.start(t); o.stop(t + 6.5);
    });
    const lp = this._filt('lowpass', 680, 0.9);
    const sh = ac.createWaveShaper();
    sh.curve = driveCurve(4);
    const env = this._gain(0);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.05, t + 0.4);
    env.gain.setValueAtTime(0.05, t + 3.3);
    env.gain.setTargetAtTime(0, t + 3.3, 0.45);
    const far = this._filt('lowpass', 900, 0.5);
    const p = this._pan(pan);
    mix.connect(lp).connect(sh).connect(env).connect(far).connect(p);
    p.connect(this.amb);
    p.connect(this._gain(0.8)).connect(this.wet);
    const dl = ac.createDelay(3);
    dl.delayTime.value = 1.75;
    const eg = this._gain(0.28);
    const elp = this._filt('lowpass', 420, 0.5);
    far.connect(dl).connect(elp).connect(eg);
    eg.connect(this.amb);
    eg.connect(this._gain(0.9)).connect(this.wet);
  }

  // the town's 17:00 chime from loudspeakers across the water (an original phrase)
  chime() {
    if (!this.running) return;
    const ac = this.ac;
    const t0 = ac.currentTime + 0.2;
    const seq = [[77, 1], [80, 1], [82, 1], [80, 1], [77, 1], [75, 1], [73, 2],
                 [75, 1], [77, 1], [80, 1], [77, 1], [75, 1], [73, 1], [70, 1], [73, 3]];
    const bus = this._gain(0.022);
    const pa = this._filt('bandpass', 1300, 0.55);
    const lp = this._filt('lowpass', 2600, 0.5);
    const p = this._pan(-0.55);
    bus.connect(pa).connect(lp).connect(p);
    p.connect(this.amb);
    p.connect(this._gain(1.2)).connect(this.wet);
    [[0.95, 0.32], [2.2, 0.16]].forEach(([d, g]) => {
      const dl = ac.createDelay(3);
      dl.delayTime.value = d;
      lp.connect(dl).connect(this._gain(g)).connect(p);
    });
    const warble = this._osc('sine', 0.45);
    const wg = this._gain(5);
    warble.connect(wg);
    warble.start(t0);
    warble.stop(t0 + 30);
    let t = t0;
    const step = 0.62;
    for (const [m, len] of seq) {
      const f = mtof(m);
      const car = this._osc('sine', f);
      const mod = this._osc('sine', f * 2);
      const mg = this._gain(0);
      mg.gain.setValueAtTime(f * 1.4, t);
      mg.gain.setTargetAtTime(f * 0.15, t, 0.25);
      mod.connect(mg).connect(car.frequency);
      wg.connect(car.detune);
      const e = this._gain(0);
      e.gain.setValueAtTime(0, t);
      e.gain.linearRampToValueAtTime(1, t + 0.012);
      e.gain.setTargetAtTime(0, t + 0.02, 0.5 + len * 0.25);
      car.connect(e).connect(bus);
      car.start(t); mod.start(t);
      car.stop(t + len * step + 2.6); mod.stop(t + len * step + 2.6);
      t += len * step;
    }
  }

  // suzumushi: bell crickets from the grass on the land side, once the sun is gone
  _crickets() {
    if (!this.alive) return;
    this.ctx.timeout(() => this._crickets(), rnd(900, 2600));
    if (!this.running) return;
    const amt = Math.max(0, (this.dusk - 0.08) / 0.6);
    if (Math.random() > Math.min(1, amt)) return;
    const t0 = this.ac.currentTime + 0.05;
    const f = rnd(4100, 4700);
    const o = this._osc('sine', f);
    const am = this._osc('sine', rnd(38, 52));
    const amg = this._gain(0.5);
    const g = this._gain(0.5);
    am.connect(amg).connect(g.gain);
    const env = this._gain(0);
    const lvl = rnd(0.004, 0.009) * Math.min(1, amt);
    const n = 2 + Math.floor(Math.random() * 3);
    let t = t0;
    for (let i = 0; i < n; i++) {
      const d = rnd(0.22, 0.42);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(lvl, t + 0.03);
      env.gain.setValueAtTime(lvl, t + d - 0.05);
      env.gain.linearRampToValueAtTime(0, t + d);
      t += d + rnd(0.1, 0.22);
    }
    const p = this._pan(rnd(0.25, 0.85));
    o.connect(g).connect(env).connect(p);
    p.connect(this.amb);
    p.connect(this._gain(0.5)).connect(this.wet);
    o.start(t0); am.start(t0);
    o.stop(t + 0.1); am.stop(t + 0.1);
  }

  update(simT, set, dusk) {
    this.simT = simT; this.set = set; this.dusk = dusk;
  }

  // ── the radio ──
  _radioChain() {
    const ac = this.ac;
    this.music = this._gain(0);
    this.ep = this._gain(1);
    const trem = this._osc('sine', 4.6);
    const tg = this._gain(0.12);
    trem.connect(tg).connect(this.ep.gain);
    trem.start();
    this.srcs.push(trem);
    this.ep.connect(this.music);
    const hp = this._filt('highpass', 140, 0.7);
    const pk = this._filt('peaking', 1100, 0.8, 2.5);
    const lp = this._filt('lowpass', 5200, 0.6);
    const sh = ac.createWaveShaper();
    sh.curve = driveCurve(2.2);
    this.radioOut = this._gain(0.55);
    const p = this._pan(0.32);
    this.music.connect(hp).connect(pk).connect(lp).connect(sh).connect(this.radioOut).connect(p);
    p.connect(this.amb);
    p.connect(this._gain(0.2)).connect(this.wet);
    const hiss = this._loop('white', 5.3);
    const hb = this._filt('bandpass', 4500, 0.5);
    this.hissG = this._gain(0);
    hiss.connect(hb).connect(this.hissG).connect(p);
    this.radioP = p;
    this.on = false;
    this.nextBar = 0;
    this.barT = 0;
  }

  click() {
    if (!this.running) return;
    const t = this.ac.currentTime + 0.005;
    const n = this._shot('white', 5.3, t, 0.05);
    const bp = this._filt('bandpass', 2600, 1.2);
    const g = this._gain(0);
    g.gain.setValueAtTime(0.06, t);
    g.gain.setTargetAtTime(0, t + 0.002, 0.006);
    n.connect(bp).connect(g).connect(this.radioP);
    const o = this._osc('sine', 130);
    const og = this._gain(0);
    og.gain.setValueAtTime(0.05, t);
    og.gain.setTargetAtTime(0, t, 0.012);
    o.connect(og).connect(this.radioP);
    o.start(t); o.stop(t + 0.1);
  }

  setRadio(on) {
    if (on === this.on) return;
    this.on = on;
    const t = this.ac.currentTime;
    this.click();
    if (on) {
      // tuning in: static sweeping past stations, a heterodyne whistle, then the music
      const n = this._shot('white', 5.3, t + 0.05, 0.9);
      const bp = this._filt('bandpass', 800, 2);
      bp.frequency.setValueAtTime(800, t + 0.05);
      bp.frequency.exponentialRampToValueAtTime(3600, t + 0.45);
      bp.frequency.exponentialRampToValueAtTime(1800, t + 0.85);
      const g = this._gain(0);
      g.gain.setValueAtTime(0, t + 0.05);
      g.gain.linearRampToValueAtTime(0.035, t + 0.12);
      g.gain.setTargetAtTime(0, t + 0.6, 0.1);
      n.connect(bp).connect(g).connect(this.radioP);
      const w = this._osc('sine', 2600);
      w.frequency.setValueAtTime(2600, t + 0.1);
      w.frequency.exponentialRampToValueAtTime(700, t + 0.7);
      const wg = this._gain(0);
      wg.gain.setValueAtTime(0, t + 0.1);
      wg.gain.linearRampToValueAtTime(0.006, t + 0.2);
      wg.gain.setTargetAtTime(0, t + 0.55, 0.06);
      w.connect(wg).connect(this.radioP);
      w.start(t + 0.1); w.stop(t + 1.0);
      this.music.gain.cancelScheduledValues(t);
      this.music.gain.setValueAtTime(this.music.gain.value, t);
      this.music.gain.setTargetAtTime(1, t + 0.7, 0.7);
      this.hissG.gain.setTargetAtTime(0.0035, t + 0.5, 0.3);
      this.nextBar = 0;
      this.barT = t + 0.75;
    } else {
      this.music.gain.cancelScheduledValues(t);
      this.music.gain.setValueAtTime(this.music.gain.value, t);
      this.music.gain.setTargetAtTime(0, t, 0.05);
      this.hissG.gain.setTargetAtTime(0, t, 0.05);
    }
  }

  _musicTick() {
    if (!this.on || !this.running) return;
    const now = this.ac.currentTime;
    if (this.barT < now) { // fell behind (tab hidden, context paused): rejoin at the next bar
      const late = Math.ceil((now - this.barT) / (4 * BEAT));
      this.barT += late * 4 * BEAT;
      this.nextBar += late;
    }
    while (this.barT < now + 0.6) {
      this._bar(this.nextBar, this.barT);
      this.nextBar++;
      this.barT += 4 * BEAT;
    }
  }

  _bar(n, t) {
    const bar = n % 16;
    const pass = Math.floor(n / 16);
    const ch = CHORDS[bar % 8];
    const hum = () => rnd(-0.012, 0.012);
    // rolled chord on the downbeat, a quiet echo of its top on the "and" of three
    ch.v.forEach((m, i) => this._ep(t + i * 0.038 + hum(), m, 0.42 - i * 0.03, 3.6 * BEAT));
    const late = ch.v2 || ch.v;
    if (ch.v2) late.forEach((m, i) => this._ep(t + 2 * BEAT + i * 0.03 + hum(), m, 0.3, 1.9 * BEAT));
    else late.slice(-2).forEach((m, i) => this._ep(t + 2.5 * BEAT + i * 0.05 + hum(), m, 0.2, 1.4 * BEAT));
    this._bass(t, ch.b, 3.4 * BEAT);
    this._pad(t, ch.v, 4 * BEAT);
    for (const [b, beat, m, len] of MELODY) {
      if (b !== bar) continue;
      if (pass % 2 === 1 && Math.random() < 0.25) continue; // breathe on the repeat
      this._ep(t + beat * BEAT + hum(), m + (pass % 3 === 2 ? -12 : 0), 0.62, len * BEAT, true);
    }
  }

  _ep(t, m, vel, dur, lead = false) {
    const ac = this.ac;
    const f = mtof(m);
    const car = this._osc('sine', f);
    const mod = this._osc('sine', f);
    const mg = this._gain(0);
    mg.gain.setValueAtTime(f * 2.4 * vel, t);
    mg.gain.setTargetAtTime(f * 0.3 * vel, t, 0.25);
    mod.connect(mg).connect(car.frequency);
    const tine = this._osc('sine', f * 7.02);
    const tg = this._gain(0);
    tg.gain.setValueAtTime(0.05 * vel, t);
    tg.gain.setTargetAtTime(0, t, 0.035);
    tine.connect(tg);
    const amp = this._gain(0);
    const tau = Math.max(0.6, Math.min(2.4, 2.4 - (m - 50) * 0.05));
    const a = (lead ? 0.15 : 0.11) * vel;
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(a, t + 0.004);
    amp.gain.setTargetAtTime(0, t + 0.006, tau);
    amp.gain.setTargetAtTime(0, t + dur, 0.16);
    car.connect(amp);
    tg.connect(amp);
    amp.connect(this.ep);
    const end = t + dur + 1.0;
    car.start(t); mod.start(t); tine.start(t);
    car.stop(end); mod.stop(end); tine.stop(end);
    void ac;
  }

  _bass(t, m, dur) {
    const o = this._osc('triangle', mtof(m));
    const lp = this._filt('lowpass', 420, 0.5);
    const g = this._gain(0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.11, t + 0.03);
    g.gain.setTargetAtTime(0.06, t + 0.05, 0.8);
    g.gain.setTargetAtTime(0, t + dur, 0.2);
    o.connect(lp).connect(g).connect(this.music);
    o.start(t); o.stop(t + dur + 1.2);
  }

  _pad(t, notes, dur) {
    const lp = this._filt('lowpass', 900, 0.4);
    const g = this._gain(0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.028, t + 1.4);
    g.gain.setValueAtTime(0.028, t + dur - 0.4);
    g.gain.linearRampToValueAtTime(0, t + dur + 1.6);
    lp.connect(g).connect(this.music);
    notes.slice(1).forEach((m) => {
      [-7, 7].forEach((d) => {
        const o = this._osc('sawtooth', mtof(m));
        o.detune.value = d;
        o.connect(lp);
        o.start(t); o.stop(t + dur + 1.8);
      });
    });
  }

  destroy() {
    if (!this.alive) return;
    this.alive = false;
    this.srcs.forEach((s) => { try { s.stop(); } catch (e) { /* already stopped */ } });
    this.srcs = [];
  }
}
