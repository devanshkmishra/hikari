// Hitsounds and stingers. A soft "normal" tick, whistle, finish (cymbal), clap; slider
// ticks; spinner hum; combo break; and the homage stingers on the results screen.

import { mtof } from '../../lib/audio.js';

const CYMBAL = [205.3, 304.4, 369.6, 522.7, 540, 800].map((f) => f * 1.62);

export class Sfx {
  constructor(audio, out, send) {
    this.audio = audio;
    this.ac = audio.ac;
    this.bus = this.ac.createGain();
    this.bus.gain.value = 0.8;
    this.bus.connect(out);
    this.wet = this.ac.createGain();
    this.wet.gain.value = 0.35;
    this.wet.connect(send);
    this.ui = this.ac.createGain();
    this.ui.gain.value = 0.7;
    this.ui.connect(out);
    this.spin = null;
  }
  setVolume(v) { this.bus.gain.setTargetAtTime(v, this.ac.currentTime, 0.02); }

  _gain(v = 1) { const g = this.ac.createGain(); g.gain.value = v; return g; }
  _osc(type, f, det = 0) { const o = this.ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; return o; }
  _filter(type, f, q = 0.7) { const b = this.ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  _noise(t, len, dest, kind = 'white') {
    const n = this.ac.createBufferSource();
    n.buffer = this.audio.noise(kind);
    n.loop = true;
    n.connect(dest);
    n.start(t, Math.random() * 1.5);
    n.stop(t + len);
    return n;
  }
  _perc(g, t, peak, decay, attack = 0.0015) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
  _pan(p, dest) {
    if (!this.ac.createStereoPanner) return dest;
    const s = this.ac.createStereoPanner();
    s.pan.value = Math.max(-1, Math.min(1, p));
    s.connect(dest);
    return s;
  }

  // hs: { whistle, finish, clap }; the normal always plays (soft sampleset)
  hit(hs = {}, pan = 0, vol = 1) {
    const t = this.ac.currentTime;
    const dest = this._pan(pan * 0.55, this.bus);
    this.normal(t, dest, vol);
    if (hs.whistle) this.whistle(t, dest, vol);
    if (hs.finish) this.finish(t, dest, vol);
    if (hs.clap) this.clap(t, dest, vol);
  }

  normal(t, dest, vol = 1) {
    const g = this._gain(0), o = this._osc('sine', 1150);
    o.frequency.setValueAtTime(1250, t);
    o.frequency.exponentialRampToValueAtTime(640, t + 0.035);
    this._perc(g, t, 0.34 * vol, 0.075);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + 0.1);
    const ng = this._gain(0), bp = this._filter('bandpass', 3400, 0.9);
    this._perc(ng, t, 0.16 * vol, 0.018, 0.0008);
    this._noise(t, 0.04, bp);
    bp.connect(ng).connect(dest);
    const body = this._gain(0), b = this._osc('triangle', 330);
    this._perc(body, t, 0.1 * vol, 0.05);
    b.connect(body).connect(dest);
    b.start(t); b.stop(t + 0.08);
  }
  whistle(t, dest, vol = 1) {
    const g = this._gain(0), o = this._osc('sine', 2080), o2 = this._osc('sine', 4170), g2 = this._gain(0.18);
    o.frequency.setValueAtTime(2020, t);
    o.frequency.linearRampToValueAtTime(2240, t + 0.06);
    o2.frequency.setValueAtTime(4040, t);
    o2.frequency.linearRampToValueAtTime(4480, t + 0.06);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.12 * vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); o2.connect(g2).connect(g); g.connect(dest);
    const w = this._gain(0.5); g.connect(w).connect(this.wet);
    o.start(t); o2.start(t); o.stop(t + 0.22); o2.stop(t + 0.22);
  }
  finish(t, dest, vol = 1) {
    const g = this._gain(0), bp = this._filter('bandpass', 9000, 0.7), hp = this._filter('highpass', 5200);
    for (const f of CYMBAL) { const o = this._osc('square', f); o.connect(bp); o.start(t); o.stop(t + 1.5); }
    this._perc(g, t, 0.07 * vol, 1.3, 0.002);
    bp.connect(hp).connect(g).connect(dest);
    const ng = this._gain(0), nh = this._filter('highpass', 6000);
    this._perc(ng, t, 0.16 * vol, 1.1, 0.002);
    this._noise(t, 1.2, nh);
    nh.connect(ng).connect(dest);
    const w = this._gain(0.6); ng.connect(w).connect(this.wet);
  }
  clap(t, dest, vol = 1) {
    const g = this._gain(0), bp = this._filter('bandpass', 1500, 1.1);
    const p = g.gain;
    p.setValueAtTime(0.0001, t);
    for (let i = 0; i < 3; i++) {
      p.linearRampToValueAtTime(0.36 * vol, t + i * 0.009 + 0.001);
      p.exponentialRampToValueAtTime(0.04, t + i * 0.009 + 0.007);
    }
    p.linearRampToValueAtTime(0.28 * vol, t + 0.03);
    p.exponentialRampToValueAtTime(0.0001, t + 0.17);
    this._noise(t, 0.2, bp);
    bp.connect(g).connect(dest);
  }
  tick(pan = 0) {
    const t = this.ac.currentTime;
    const dest = this._pan(pan * 0.5, this.bus);
    const g = this._gain(0), o = this._osc('sine', 2650);
    this._perc(g, t, 0.075, 0.035);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + 0.05);
  }
  sliderEnd(hs, pan) { this.hit(hs, pan, 0.85); }

  comboBreak() {
    const t = this.ac.currentTime;
    const g = this._gain(0), o = this._osc('square', 520), lp = this._filter('lowpass', 1800, 2);
    o.frequency.setValueAtTime(560, t);
    o.frequency.exponentialRampToValueAtTime(95, t + 0.28);
    lp.frequency.setValueAtTime(2400, t);
    lp.frequency.exponentialRampToValueAtTime(300, t + 0.3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    o.connect(lp).connect(g).connect(this.bus);
    o.start(t); o.stop(t + 0.36);
    const ng = this._gain(0), nb = this._filter('lowpass', 900);
    this._perc(ng, t, 0.3, 0.12);
    this._noise(t, 0.15, nb, 'brown');
    nb.connect(ng).connect(this.bus);
  }

  // continuous spinner hum: rises with progress
  spinStart() {
    if (this.spin) return;
    const t = this.ac.currentTime;
    const o = this._osc('triangle', 220), g = this._gain(0), lp = this._filter('lowpass', 1600);
    o.connect(lp).connect(g).connect(this.bus);
    o.start(t);
    this.spin = { o, g };
  }
  spinSet(progress, speed) {
    if (!this.spin) return;
    const t = this.ac.currentTime;
    this.spin.o.frequency.setTargetAtTime(180 + Math.min(progress, 1.6) * 520, t, 0.05);
    this.spin.g.gain.setTargetAtTime(Math.min(1, speed) * 0.09, t, 0.05);
  }
  spinStop() {
    if (!this.spin) return;
    const { o, g } = this.spin, t = this.ac.currentTime;
    g.gain.setTargetAtTime(0, t, 0.04);
    o.stop(t + 0.3);
    this.spin = null;
  }
  spinBonus() {
    const t = this.ac.currentTime;
    for (const [f, k] of [[1760, 1], [2637, 0.5]]) {
      const g = this._gain(0), o = this._osc('sine', f);
      this._perc(g, t, 0.12 * k, 0.5);
      o.connect(g).connect(this.bus); o.start(t); o.stop(t + 0.55);
    }
  }

  // ---------------------------------------------------------------- UI
  uiTick() {
    const t = this.ac.currentTime;
    const g = this._gain(0), o = this._osc('sine', 1900);
    this._perc(g, t, 0.05, 0.03);
    o.connect(g).connect(this.ui); o.start(t); o.stop(t + 0.05);
  }
  uiConfirm() {
    const t = this.ac.currentTime;
    [74, 81, 86].forEach((m, i) => {
      const g = this._gain(0), o = this._osc('triangle', mtof(m));
      this._perc(g, t + i * 0.045, 0.11, 0.5);
      o.connect(g).connect(this.ui);
      const w = this._gain(0.5); g.connect(w).connect(this.wet);
      o.start(t + i * 0.045); o.stop(t + i * 0.045 + 0.6);
    });
  }
  uiBack() {
    const t = this.ac.currentTime;
    [81, 74].forEach((m, i) => {
      const g = this._gain(0), o = this._osc('triangle', mtof(m));
      this._perc(g, t + i * 0.06, 0.08, 0.3);
      o.connect(g).connect(this.ui); o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.4);
    });
  }
  cookie() {
    const t = this.ac.currentTime;
    const g = this._gain(0), o = this._osc('sine', 110);
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(52, t + 0.25);
    this._perc(g, t, 0.5, 0.5);
    o.connect(g).connect(this.ui); o.start(t); o.stop(t + 0.6);
    this.uiConfirm();
  }
  shutter(on) {
    const t = this.ac.currentTime;
    (on ? [880, 1320] : [1320, 880]).forEach((f, i) => {
      const g = this._gain(0), o = this._osc('sine', f);
      this._perc(g, t + i * 0.09, 0.08, 0.07);
      o.connect(g).connect(this.ui); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.1);
    });
  }

  // ---------------------------------------------------------------- stingers
  // 死: a cut, a drum the size of a temple, struck metal, and a long low breath.
  deathSekiro() {
    const t = this.ac.currentTime + 0.02;
    const sg = this._gain(0), sb = this._filter('bandpass', 6000, 2);
    sb.frequency.setValueAtTime(7000, t);
    sb.frequency.exponentialRampToValueAtTime(1600, t + 0.14);
    this._perc(sg, t, 0.35, 0.16, 0.004);
    this._noise(t, 0.2, sb);
    sb.connect(sg).connect(this.ui);
    const bt = t + 0.08;
    const bg = this._gain(0), bo = this._osc('sine', 80);
    bo.frequency.setValueAtTime(96, bt);
    bo.frequency.exponentialRampToValueAtTime(38, bt + 1.6);
    this._perc(bg, bt, 0.9, 2.6, 0.003);
    bo.connect(bg).connect(this.ui); bo.start(bt); bo.stop(bt + 2.8);
    const tg = this._gain(0), tl = this._filter('lowpass', 420);
    this._perc(tg, bt, 0.6, 0.5, 0.002);
    this._noise(bt, 0.6, tl, 'brown');
    tl.connect(tg).connect(this.ui);
    for (const [f, k] of [[412, 1], [1131, 0.6], [2209, 0.35], [3517, 0.2]]) {
      const g = this._gain(0), o = this._osc('sine', f);
      this._perc(g, bt, 0.07 * k, 3.6, 0.002);
      o.connect(g).connect(this.ui);
      const w = this._gain(1); g.connect(w).connect(this.wet);
      o.start(bt); o.stop(bt + 3.8);
    }
    const dg = this._gain(0), dl = this._filter('lowpass', 260);
    for (const [f, d] of [[55, -8], [55, 9], [82.4, 0]]) { const o = this._osc('sawtooth', f, d); o.connect(dl); o.start(bt); o.stop(bt + 5.5); }
    dg.gain.setValueAtTime(0.0001, bt);
    dg.gain.linearRampToValueAtTime(0.12, bt + 1.2);
    dg.gain.exponentialRampToValueAtTime(0.0001, bt + 5.4);
    dl.connect(dg).connect(this.ui);
  }
  // YOU DIED: a deep, swelling, faintly choral dread.
  deathSouls() {
    const t = this.ac.currentTime + 0.02;
    const rg = this._gain(0), rl = this._filter('lowpass', 140, 1);
    rl.frequency.setValueAtTime(110, t);
    rl.frequency.exponentialRampToValueAtTime(520, t + 0.9);
    rl.frequency.exponentialRampToValueAtTime(90, t + 4);
    rg.gain.setValueAtTime(0.0001, t);
    rg.gain.linearRampToValueAtTime(0.9, t + 0.35);
    rg.gain.exponentialRampToValueAtTime(0.0001, t + 4.2);
    this._noise(t, 4.3, rl, 'brown');
    rl.connect(rg).connect(this.ui);
    const cg = this._gain(0), cl = this._filter('lowpass', 700, 0.8);
    for (const [m, d] of [[33, -9], [33, 9], [40, -5], [44, 6], [45, -4]]) { const o = this._osc('sawtooth', mtof(m), d); o.connect(cl); o.start(t); o.stop(t + 5); }
    cg.gain.setValueAtTime(0.0001, t);
    cg.gain.linearRampToValueAtTime(0.1, t + 1.4);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 4.9);
    cl.connect(cg).connect(this.ui);
    const w = this._gain(0.8); cg.connect(w).connect(this.wet);
  }
  // MISSION PASSED: an original little g-funk sting — whine lead, slide bass, a stab.
  missionPassed() {
    const t = this.ac.currentTime + 0.05, b = 60 / 96;
    const bassLine = [[0, 40, 0.75], [0.75, 43, 0.25], [1, 45, 0.5], [1.75, 47, 0.25], [2, 52, 1.5]];
    for (const [p, m, d] of bassLine) {
      const g = this._gain(0), o = this._osc('sawtooth', mtof(m)), lp = this._filter('lowpass', 500, 4);
      const tt = t + p * b;
      o.frequency.setValueAtTime(mtof(m - 2), tt);
      o.frequency.exponentialRampToValueAtTime(mtof(m), tt + 0.05);
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.linearRampToValueAtTime(0.3, tt + 0.01);
      g.gain.setValueAtTime(0.3, tt + d * b - 0.05);
      g.gain.linearRampToValueAtTime(0.0001, tt + d * b);
      o.connect(lp).connect(g).connect(this.ui); o.start(tt); o.stop(tt + d * b + 0.05);
    }
    for (const [p, notes] of [[0, [64, 68, 71, 74, 78]], [2, [64, 68, 71, 74, 78]]]) {
      const tt = t + p * b;
      const g = this._gain(0), lp = this._filter('lowpass', 2600, 1);
      for (const m of notes) { const o = this._osc('sawtooth', mtof(m), (Math.random() - 0.5) * 16); o.connect(lp); o.start(tt); o.stop(tt + 1.2); }
      this._perc(g, tt, 0.06, p ? 1.1 : 0.35);
      lp.connect(g).connect(this.ui);
      const w = this._gain(0.5); g.connect(w).connect(this.wet);
    }
    const lo = this._osc('sine', mtof(83)), lg = this._gain(0), vib = this._osc('sine', 5.2), vg = this._gain(14);
    vib.connect(vg).connect(lo.frequency);
    const path = [[0.5, 83], [1.0, 86], [1.5, 88], [2.0, 91]];
    lo.frequency.setValueAtTime(mtof(81), t + 0.5 * b);
    for (const [p, m] of path) lo.frequency.setTargetAtTime(mtof(m), t + p * b, 0.06);
    lg.gain.setValueAtTime(0.0001, t + 0.5 * b);
    lg.gain.linearRampToValueAtTime(0.07, t + 0.6 * b);
    lg.gain.setValueAtTime(0.07, t + 3.2 * b);
    lg.gain.exponentialRampToValueAtTime(0.0001, t + 4 * b);
    lo.connect(lg).connect(this.ui);
    const w = this._gain(0.6); lg.connect(w).connect(this.wet);
    lo.start(t); vib.start(t); lo.stop(t + 4.2 * b); vib.stop(t + 4.2 * b);
  }
  // 真っ白に: everything leaves except one high, clean tone and a chord made of light.
  burnOut() {
    const t = this.ac.currentTime + 0.05;
    const g = this._gain(0);
    for (const [m, k] of [[76, 1], [83, 0.7], [88, 0.5], [92, 0.35], [95, 0.25]]) {
      const o = this._osc('sine', mtof(m)), og = this._gain(k);
      o.connect(og).connect(g); o.start(t); o.stop(t + 7);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.06, t + 2.2);
    g.gain.setValueAtTime(0.06, t + 4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 6.8);
    g.connect(this.ui);
    const w = this._gain(1.4); g.connect(w).connect(this.wet);
  }
}
