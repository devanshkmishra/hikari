// The dream parade march — an original, synthesized, slightly unhinged march.
// Everything here is Web Audio: no samples. Key of B♭ for the first half, up a whole
// step to C for the last chorus, then a joyous accelerando, a held chord that melts,
// and one bell left ringing.

import { mtof, driveCurve } from '../../lib/audio.js';

// ---------------------------------------------------------------------------------------
// Tempo map. Every bar is 4 beats. bpm [from, to] ramps across the section.
const SECTIONS = [
  { id: 'intro', bars: 4, bpm: [114, 116] },
  { id: 'A', bars: 8, bpm: [118, 118] },
  { id: 'A2', bars: 8, bpm: [121, 121] },
  { id: 'B', bars: 4, bpm: [122, 122] },
  { id: 'A3', bars: 8, bpm: [124, 130] },
  { id: 'tag', bars: 3, bpm: [132, 180] },
];

export const HOLD_BEAT = 4 * (4 + 8 + 8 + 4 + 8) + 10; // tag, bar 3, beat 3
export const HOLD_LEN = 2.6;   // seconds the final chord is held before it melts
export const BELL_AT = 2.75;   // seconds after the hold begins
export const TAIL = 4.3;       // seconds after the bell until the parade is "done"

export function makeTempo() {
  const beats = [];
  const sec = {};
  let t = 0;
  let b = 0;
  for (const s of SECTIONS) {
    const n = s.bars * 4;
    sec[s.id] = { beat: b, t, bars: s.bars };
    for (let i = 0; i < n; i++) {
      const u = n > 1 ? i / (n - 1) : 0;
      const k = s.id === 'tag' ? Math.pow(u, 1.35) : u;
      const bpm = s.bpm[0] + (s.bpm[1] - s.bpm[0]) * k;
      beats.push(t);
      t += 60 / bpm;
      b++;
    }
  }
  beats.push(t);
  const last = beats[beats.length - 1] - beats[beats.length - 2];

  const timeAt = (bf) => {
    if (bf <= 0) return bf * (beats[1] - beats[0]);
    const i = Math.floor(bf);
    if (i >= beats.length - 1) return beats[beats.length - 1] + (bf - (beats.length - 1)) * last;
    return beats[i] + (bf - i) * (beats[i + 1] - beats[i]);
  };
  const beatAt = (tt) => {
    if (tt <= 0) return tt / (beats[1] - beats[0]);
    if (tt >= beats[beats.length - 1]) return beats.length - 1 + (tt - beats[beats.length - 1]) / last;
    let lo = 0, hi = beats.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (beats[m] <= tt) lo = m; else hi = m;
    }
    return lo + (tt - beats[lo]) / (beats[lo + 1] - beats[lo]);
  };
  const bpmAt = (tt) => {
    const i = Math.max(0, Math.min(beats.length - 2, Math.floor(beatAt(tt))));
    return 60 / (beats[i + 1] - beats[i]);
  };
  const hold = timeAt(HOLD_BEAT);
  return {
    beats, sec, timeAt, beatAt, bpmAt,
    hold,
    bell: hold + BELL_AT,
    end: hold + BELL_AT + TAIL,
  };
}

// ---------------------------------------------------------------------------------------
// The band. Every voice is created per note; long-lived nodes are only the group buses.

export class Band {
  constructor(engine, out, send) {
    const ac = (this.ac = engine.ac);
    this.white = engine.noise('white');
    this.nodes = [];

    this.master = ac.createGain();
    this.master.gain.value = 0.78;
    this.master.connect(out);

    this.wet = ac.createGain();
    this.wet.gain.value = 1;
    this.wet.connect(send);

    // "distance" filter on the marching band (the parade approaching; the trap break).
    this.dist = ac.createBiquadFilter();
    this.dist.type = 'lowpass';
    this.dist.frequency.value = 18000;
    this.dist.Q.value = 0.5;
    this.near = ac.createGain();
    this.near.gain.value = 1;
    this.dist.connect(this.near);
    this.near.connect(this.master);

    this.clean = ac.createGain();
    this.clean.connect(this.master);

    this.grp = {};
    const G = (name, pan, wet, clean = false, vol = 1) => {
      const g = ac.createGain();
      g.gain.value = vol;
      const p = ac.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      p.connect(clean ? this.clean : this.dist);
      if (wet) {
        const s = ac.createGain();
        s.gain.value = wet;
        p.connect(s);
        s.connect(this.wet);
      }
      this.grp[name] = g;
    };
    G('lead', -0.12, 0.26);
    G('bone', 0.14, 0.2);
    G('stab', 0.24, 0.18);
    G('tuba', 0, 0.06);
    G('glock', 0.34, 0.45);
    G('picc', -0.4, 0.38);
    G('snare', -0.1, 0.12);
    G('bd', 0, 0.08);
    G('cym', 0.2, 0.2);
    G('taiko', -0.16, 0.28);
    G('kane', 0.36, 0.25);
    G('fue', -0.26, 0.42);
    G('fx', 0.05, 0.3);
    G('xing', 0.5, 0.3);
    G('bug', -0.45, 0.15);
    G('trap', 0, 0.06, true);
    G('hat', 0.18, 0.05, true);
    G('bell', 0, 0.85, true);
    G('glockc', 0.2, 0.7, true);
    G('hold', 0, 0.35, true);
  }

  // ---- small helpers ----
  _osc(type, f, T) {
    const o = this.ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, T);
    return o;
  }
  _gain(v = 0) {
    const g = this.ac.createGain();
    g.gain.value = v;
    return g;
  }
  _filt(type, f, q = 0.7) {
    const b = this.ac.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    return b;
  }
  _noise(T, dur) {
    const n = this.ac.createBufferSource();
    n.buffer = this.white;
    n.start(T, Math.random() * 1.6);
    n.stop(T + dur);
    return n;
  }
  _perc(g, T, peak, tau, a = 0.0015) {
    g.gain.setValueAtTime(0, T);
    g.gain.linearRampToValueAtTime(peak, T + a);
    g.gain.setTargetAtTime(0, T + a, tau);
  }

  // ---- automation on the bus ----
  distTo(T, f, sec, curve = 'exp') {
    const p = this.dist.frequency;
    p.cancelScheduledValues(T);
    p.setValueAtTime(p.value, T);
    if (curve === 'exp') p.exponentialRampToValueAtTime(f, T + sec);
    else p.linearRampToValueAtTime(f, T + sec);
  }
  distSet(T, f) {
    this.dist.frequency.setValueAtTime(f, T);
  }
  nearTo(T, from, to, sec) {
    const p = this.near.gain;
    p.cancelScheduledValues(T);
    p.setValueAtTime(from, T);
    p.linearRampToValueAtTime(to, T + sec);
  }

  // ---- brass (trumpets / trombones / chord stabs) ----
  brass(T, midis, D, o = {}) {
    const { vel = 1, grp = 'stab', bright = 1, vib = 0, scoop = 1, glideTo = null, a = 0.014, rel = 0.07, pk = 0.05 } = o;
    const out = this._gain(0);
    const lp = this._filt('lowpass', 400, 1.15);
    lp.connect(out);
    out.connect(this.grp[grp]);
    const lo = mtof(Math.min(...midis));
    const open = Math.min(10500, lo * (2.6 + 6.5 * bright * vel));
    lp.frequency.setValueAtTime(Math.max(180, lo * 1.1), T);
    lp.frequency.exponentialRampToValueAtTime(open, T + 0.035);
    lp.frequency.setTargetAtTime(Math.max(320, open * 0.5), T + 0.05, 0.2);
    const peak = pk * vel;
    out.gain.setValueAtTime(0, T);
    out.gain.linearRampToValueAtTime(peak, T + a);
    out.gain.setTargetAtTime(peak * 0.74, T + a, 0.12);
    out.gain.setTargetAtTime(0, T + D, rel / 3);
    const end = T + D + rel * 3 + 0.03;
    let lfoG = null;
    if (vib > 0 && D > 0.3) {
      const lfo = this._osc('sine', 5.6, T);
      lfoG = this._gain(0);
      lfoG.gain.setValueAtTime(0, T);
      lfoG.gain.linearRampToValueAtTime(vib, T + Math.min(0.35, D * 0.6));
      lfo.connect(lfoG);
      lfo.start(T);
      lfo.stop(end);
    }
    for (const m of midis) {
      for (const det of [-7, 6]) {
        const osc = this._osc('sawtooth', mtof(m), T);
        if (glideTo != null) {
          osc.frequency.setValueAtTime(mtof(m), T + 0.02);
          osc.frequency.exponentialRampToValueAtTime(mtof(glideTo + (m - midis[0])), T + D);
        }
        osc.detune.setValueAtTime(det - 38 * scoop, T);
        osc.detune.linearRampToValueAtTime(det, T + 0.05);
        if (lfoG) lfoG.connect(osc.detune);
        osc.connect(lp);
        osc.start(T);
        osc.stop(end);
      }
    }
  }

  // the final held chord: swells, then melts (filter closes, pitch sags) while it fades
  hold(T, midis, holdS, fadeS, pk = 0.2) {
    const out = this._gain(0);
    const lp = this._filt('lowpass', 500, 0.9);
    lp.connect(out);
    out.connect(this.grp.hold);
    // also feed the band's wet bus more heavily for the dissolve
    const w = this._gain(0.55);
    out.connect(w);
    w.connect(this.wet);
    lp.frequency.setValueAtTime(500, T);
    lp.frequency.exponentialRampToValueAtTime(5200, T + 0.05);
    lp.frequency.setTargetAtTime(3400, T + 0.1, 0.4);
    lp.frequency.setValueAtTime(3600, T + holdS);
    lp.frequency.exponentialRampToValueAtTime(160, T + holdS + fadeS);
    out.gain.setValueAtTime(0, T);
    out.gain.linearRampToValueAtTime(pk * 0.8, T + 0.02);
    out.gain.setTargetAtTime(pk * 0.62, T + 0.03, 0.2);
    out.gain.linearRampToValueAtTime(pk, T + holdS);
    out.gain.setTargetAtTime(0, T + holdS, fadeS / 3.2);
    const end = T + holdS + fadeS * 1.6;
    const lfo = this._osc('sine', 4.6, T);
    const lg = this._gain(0);
    lg.gain.setValueAtTime(0, T);
    lg.gain.linearRampToValueAtTime(9, T + holdS);
    lg.gain.linearRampToValueAtTime(22, T + holdS + fadeS);
    lfo.connect(lg);
    lfo.start(T);
    lfo.stop(end);
    midis.forEach((m, i) => {
      for (const det of [-8, 7]) {
        const osc = this._osc(m < 50 ? 'square' : 'sawtooth', mtof(m), T);
        osc.detune.setValueAtTime(det - 30, T);
        osc.detune.linearRampToValueAtTime(det, T + 0.06);
        osc.detune.setValueAtTime(det, T + holdS);
        // the melt: every voice sags a little, by a different amount
        osc.detune.linearRampToValueAtTime(det - 18 - (i % 3) * 14, T + holdS + fadeS);
        lg.connect(osc.detune);
        osc.connect(lp);
        osc.start(T);
        osc.stop(end);
      }
    });
  }

  tuba(T, m, D, vel = 1) {
    const f = mtof(m);
    const out = this._gain(0);
    const lp = this._filt('lowpass', 220, 2.2);
    lp.connect(out);
    out.connect(this.grp.tuba);
    lp.frequency.setValueAtTime(200, T);
    lp.frequency.exponentialRampToValueAtTime(380 + 620 * vel, T + 0.03);
    lp.frequency.setTargetAtTime(420, T + 0.04, 0.12);
    out.gain.setValueAtTime(0, T);
    out.gain.linearRampToValueAtTime(0.24 * vel, T + 0.018);
    out.gain.setTargetAtTime(0.19 * vel, T + 0.02, 0.1);
    out.gain.setTargetAtTime(0, T + D, 0.025);
    const end = T + D + 0.15;
    for (const [type, det, lvl] of [['sawtooth', -4, 1], ['square', 5, 0.5]]) {
      const o = this._osc(type, f, T);
      o.detune.setValueAtTime(det - 55, T);
      o.detune.linearRampToValueAtTime(det, T + 0.045);
      const g = this._gain(lvl);
      o.connect(g).connect(lp);
      o.start(T);
      o.stop(end);
    }
  }

  glock(T, m, vel = 1, len = 1.3, grp = 'glock') {
    const f = mtof(m);
    const P = [[1, 1, len], [2.76, 0.3, len * 0.33], [5.4, 0.12, len * 0.13], [8.93, 0.05, len * 0.06]];
    for (const [r, a, d] of P) {
      if (f * r > 15500) continue;
      const o = this._osc('sine', f * r, T);
      const g = this._gain(0);
      this._perc(g, T, a * vel * 0.1, d / 4.2, 0.0012);
      o.connect(g).connect(this.grp[grp]);
      o.start(T);
      o.stop(T + d + 0.05);
    }
  }

  picc(T, m, D, vel = 1, fue = false) {
    const f = mtof(m);
    const out = this._gain(0);
    out.connect(this.grp[fue ? 'fue' : 'picc']);
    const pk = (fue ? 0.075 : 0.05) * vel;
    out.gain.setValueAtTime(0, T);
    out.gain.linearRampToValueAtTime(pk, T + (fue ? 0.04 : 0.022));
    out.gain.setTargetAtTime(pk * 0.85, T + 0.05, 0.1);
    out.gain.setTargetAtTime(0, T + D, 0.03);
    const end = T + D + 0.15;
    const o = this._osc(fue ? 'sine' : 'triangle', f, T);
    if (fue) {
      // the shinobue's breathy scoop up into the note
      o.detune.setValueAtTime(-110, T);
      o.detune.exponentialRampToValueAtTime(-1, T + 0.09);
    }
    const o2 = this._osc('sine', f * 2, T);
    const g2 = this._gain(fue ? 0.08 : 0.14);
    if (D > 0.25) {
      const lfo = this._osc('sine', fue ? 5.2 : 6.3, T);
      const lg = this._gain(0);
      lg.gain.setValueAtTime(0, T + 0.12);
      lg.gain.linearRampToValueAtTime(fue ? 24 : 13, T + Math.min(0.4, D));
      lfo.connect(lg);
      lg.connect(o.detune);
      lfo.start(T);
      lfo.stop(end);
    }
    o.connect(out);
    o2.connect(g2).connect(out);
    o.start(T); o.stop(end);
    o2.start(T); o2.stop(end);
    // breath
    const n = this._noise(T, D + 0.15);
    const bp = this._filt('bandpass', Math.min(9000, f * (fue ? 1.5 : 1)), fue ? 3 : 5);
    const ng = this._gain(0);
    ng.gain.setValueAtTime(0, T);
    ng.gain.linearRampToValueAtTime((fue ? 0.05 : 0.018) * vel, T + 0.02);
    ng.gain.setTargetAtTime((fue ? 0.018 : 0.006) * vel, T + 0.03, 0.06);
    ng.gain.setTargetAtTime(0, T + D, 0.03);
    n.connect(bp).connect(ng).connect(out);
  }

  snare(T, vel = 1) {
    const n = this._noise(T, 0.32);
    const hp = this._filt('highpass', 700);
    const bp = this._filt('bandpass', 2600, 0.55);
    const g = this._gain(0);
    this._perc(g, T, 0.4 * vel, 0.032 + 0.03 * vel, 0.001);
    n.connect(hp).connect(bp).connect(g).connect(this.grp.snare);
    const o = this._osc('triangle', 205, T);
    o.frequency.exponentialRampToValueAtTime(150, T + 0.05);
    const og = this._gain(0);
    this._perc(og, T, 0.3 * vel, 0.022, 0.001);
    o.connect(og).connect(this.grp.snare);
    o.start(T);
    o.stop(T + 0.18);
  }

  roll(T, D, v0, v1, rate = 26) {
    const n = Math.max(1, Math.floor(D * rate));
    for (let i = 0; i < n; i++) {
      const u = i / n;
      this.snare(T + (i / rate) + (Math.random() - 0.5) * 0.004, (v0 + (v1 - v0) * u) * (i % 2 ? 0.82 : 1));
    }
  }

  bd(T, vel = 1) {
    const o = this._osc('sine', 112, T);
    o.frequency.exponentialRampToValueAtTime(46, T + 0.12);
    const g = this._gain(0);
    this._perc(g, T, 0.8 * vel, 0.15, 0.003);
    o.connect(g).connect(this.grp.bd);
    o.start(T);
    o.stop(T + 0.9);
    const n = this._noise(T, 0.08);
    const lp = this._filt('lowpass', 600);
    const ng = this._gain(0);
    this._perc(ng, T, 0.22 * vel, 0.018);
    n.connect(lp).connect(ng).connect(this.grp.bd);
  }

  crash(T, vel = 1, len = 2.4) {
    const n = this._noise(T, len);
    const hp = this._filt('highpass', 5200);
    const g = this._gain(0);
    this._perc(g, T, 0.15 * vel, len / 4.6, 0.002);
    n.connect(hp).connect(g).connect(this.grp.cym);
    const mg = this._gain(0);
    this._perc(mg, T, 0.05 * vel, len / 6, 0.002);
    const mhp = this._filt('highpass', 6500);
    mhp.connect(mg).connect(this.grp.cym);
    for (const f of [205.3, 304.4, 369.6, 522.7, 540, 800]) {
      const o = this._osc('square', f * 2.15, T);
      o.connect(mhp);
      o.start(T);
      o.stop(T + len);
    }
  }

  clash(T, vel = 1) {
    // marching clash cymbals: shorter, brighter
    const n = this._noise(T, 0.9);
    const hp = this._filt('highpass', 6800);
    const g = this._gain(0);
    this._perc(g, T, 0.1 * vel, 0.16, 0.001);
    n.connect(hp).connect(g).connect(this.grp.cym);
  }

  swell(T, D, vel = 1) {
    const n = this._noise(T, D + 1.2);
    const hp = this._filt('highpass', 4200);
    const g = this._gain(0);
    g.gain.setValueAtTime(0.0001, T);
    g.gain.exponentialRampToValueAtTime(0.12 * vel, T + D);
    g.gain.setTargetAtTime(0, T + D, 0.25);
    n.connect(hp).connect(g).connect(this.grp.cym);
  }

  timp(T, m, vel = 1) {
    const f = mtof(m);
    const o = this._osc('sine', f * 1.04, T);
    o.frequency.exponentialRampToValueAtTime(f, T + 0.08);
    const o2 = this._osc('sine', f * 1.5, T);
    const g = this._gain(0);
    this._perc(g, T, 0.42 * vel, 0.3, 0.003);
    const g2 = this._gain(0.25);
    o.connect(g).connect(this.grp.bd);
    o2.connect(g2).connect(g);
    o.start(T); o.stop(T + 1.4);
    o2.start(T); o2.stop(T + 1.4);
  }

  taiko(T, vel = 1, big = true) {
    const o = this._osc('sine', big ? 92 : 148, T);
    o.frequency.exponentialRampToValueAtTime(big ? 50 : 94, T + (big ? 0.22 : 0.1));
    const g = this._gain(0);
    this._perc(g, T, (big ? 0.48 : 0.3) * vel, big ? 0.2 : 0.09, 0.002);
    o.connect(g).connect(this.grp.taiko);
    o.start(T);
    o.stop(T + 1.2);
    const n = this._noise(T, 0.12);
    const lp = this._filt('lowpass', 800);
    const ng = this._gain(0);
    this._perc(ng, T, 0.2 * vel, 0.02);
    n.connect(lp).connect(ng).connect(this.grp.taiko);
  }

  ka(T, vel = 1) {
    const o = this._osc('square', 1500, T);
    o.frequency.exponentialRampToValueAtTime(1050, T + 0.02);
    const bp = this._filt('bandpass', 1900, 4);
    const g = this._gain(0);
    this._perc(g, T, 0.12 * vel, 0.012);
    o.connect(bp).connect(g).connect(this.grp.taiko);
    o.start(T);
    o.stop(T + 0.08);
  }

  kane(T, vel = 1, open = true) {
    const out = this._gain(0);
    this._perc(out, T, 0.05 * vel, open ? 0.08 : 0.022, 0.001);
    out.connect(this.grp.kane);
    [[2380, 1], [3410, 0.6], [4960, 0.4], [6620, 0.25]].forEach(([f, a]) => {
      const o = this._osc('sine', f, T);
      const g = this._gain(a);
      o.connect(g).connect(out);
      o.start(T);
      o.stop(T + 0.5);
    });
  }

  xing(T, hi) {
    // 踏切 — the crossing bell's two alternating strokes
    const f = hi ? 900 : 760;
    const out = this._gain(0);
    this._perc(out, T, 0.05, 0.13, 0.001);
    out.connect(this.grp.xing);
    [[1, 1], [2.43, 0.45], [3.9, 0.22]].forEach(([r, a]) => {
      const o = this._osc('sine', f * r, T);
      const g = this._gain(a);
      o.connect(g).connect(out);
      o.start(T);
      o.stop(T + 0.7);
    });
  }

  cicada(T, D, vel = 1) {
    const n = this._noise(T, D + 0.6);
    const bp = this._filt('bandpass', 4600, 7);
    const bp2 = this._filt('bandpass', 6100, 9);
    const am = this._gain(0);
    const lfo = this._osc('square', 46, T);
    const lg = this._gain(0.5);
    lfo.connect(lg).connect(am.gain);
    am.gain.value = 0.5;
    const g = this._gain(0);
    g.gain.setValueAtTime(0.0001, T);
    g.gain.exponentialRampToValueAtTime(0.11 * vel, T + D * 0.4);
    g.gain.setValueAtTime(0.11 * vel, T + D * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, T + D + 0.5);
    n.connect(bp).connect(am);
    n.connect(bp2).connect(am);
    am.connect(g).connect(this.grp.bug);
    lfo.start(T);
    lfo.stop(T + D + 0.6);
  }

  sub(T, m, D, glideTo = null, vel = 1) {
    const f = mtof(m);
    const o = this._osc('sine', f * 2.2, T);
    o.frequency.exponentialRampToValueAtTime(f, T + 0.035);
    if (glideTo != null) {
      o.frequency.setValueAtTime(f, T + D * 0.5);
      o.frequency.exponentialRampToValueAtTime(mtof(glideTo), T + D * 0.92);
    }
    const ws = this.ac.createWaveShaper();
    ws.curve = this._drive || (this._drive = driveCurve(7));
    const pre = this._gain(0.9);
    const g = this._gain(0);
    g.gain.setValueAtTime(0, T);
    g.gain.linearRampToValueAtTime(0.5 * vel, T + 0.004);
    g.gain.setTargetAtTime(0.32 * vel, T + 0.01, 0.25);
    g.gain.setTargetAtTime(0, T + D, 0.05);
    o.connect(pre).connect(ws).connect(g).connect(this.grp.trap);
    o.start(T);
    o.stop(T + D + 0.4);
  }

  hat(T, vel = 1, open = false) {
    const n = this._noise(T, open ? 0.5 : 0.12);
    const hp = this._filt('highpass', 7600);
    const g = this._gain(0);
    this._perc(g, T, 0.12 * vel, open ? 0.07 : 0.013, 0.0008);
    n.connect(hp).connect(g).connect(this.grp.hat);
  }

  clap(T, vel = 1) {
    const n = this._noise(T, 0.4);
    const bp = this._filt('bandpass', 1150, 1.1);
    const g = this._gain(0);
    const p = g.gain;
    p.setValueAtTime(0, T);
    for (let i = 0; i < 3; i++) {
      const t = T + i * 0.011;
      p.setValueAtTime(0.4 * vel, t);
      p.setTargetAtTime(0.04, t + 0.001, 0.004);
    }
    p.setValueAtTime(0.32 * vel, T + 0.033);
    p.setTargetAtTime(0, T + 0.034, 0.06);
    n.connect(bp).connect(g).connect(this.grp.trap);
  }

  slide(T, D, f0, f1, vel = 1) {
    const o = this._osc('sine', f0, T);
    o.frequency.exponentialRampToValueAtTime(f1, T + D);
    const lfo = this._osc('sine', 8.5, T);
    const lg = this._gain(28);
    lfo.connect(lg).connect(o.detune);
    const g = this._gain(0);
    g.gain.setValueAtTime(0, T);
    g.gain.linearRampToValueAtTime(0.055 * vel, T + 0.05);
    g.gain.setTargetAtTime(0, T + D, 0.03);
    o.connect(g).connect(this.grp.fx);
    o.start(T); o.stop(T + D + 0.2);
    lfo.start(T); lfo.stop(T + D + 0.2);
  }

  whistle(T, D, vel = 1) {
    const g = this._gain(0);
    g.gain.setValueAtTime(0, T);
    g.gain.linearRampToValueAtTime(0.035 * vel, T + 0.012);
    g.gain.setTargetAtTime(0, T + D, 0.02);
    const am = this._gain(0.55);
    const lfo = this._osc('square', 31, T);
    const lg = this._gain(0.45);
    lfo.connect(lg).connect(am.gain);
    am.connect(g).connect(this.grp.fx);
    for (const f of [2960, 3140]) {
      const o = this._osc('sine', f, T);
      o.connect(am);
      o.start(T); o.stop(T + D + 0.12);
    }
    lfo.start(T); lfo.stop(T + D + 0.12);
  }

  honk(T, vel = 1) {
    const o = this._osc('sawtooth', 430, T);
    o.frequency.exponentialRampToValueAtTime(380, T + 0.15);
    const bp = this._filt('bandpass', 1050, 2.2);
    const g = this._gain(0);
    g.gain.setValueAtTime(0, T);
    g.gain.linearRampToValueAtTime(0.11 * vel, T + 0.012);
    g.gain.setTargetAtTime(0, T + 0.12, 0.025);
    o.connect(bp).connect(g).connect(this.grp.fx);
    o.start(T); o.stop(T + 0.3);
  }

  // one bell, left ringing
  bell(T, m, len = 8, vel = 1) {
    const f = mtof(m);
    const P = [[0.5, 0.42, 1], [1, 0.42, 0.72], [1.19, 0.26, 0.55], [1.5, 0.16, 0.45], [2, 0.24, 0.4],
      [2.51, 0.11, 0.3], [2.66, 0.09, 0.26], [3.01, 0.07, 0.2], [4.17, 0.045, 0.12], [5.43, 0.025, 0.08]];
    P.forEach(([r, a, d], i) => {
      const pair = i < 2 ? [-0.45, 0.45] : [0];
      for (const off of pair) {
        const o = this._osc('sine', f * r + off, T);
        const g = this._gain(0);
        this._perc(g, T, (a * 0.15 * vel) / pair.length, (len * d) / 4.2, 0.002);
        o.connect(g).connect(this.grp.bell);
        o.start(T);
        o.stop(T + len * d + 0.1);
      }
    });
    const n = this._noise(T, 0.1);
    const hp = this._filt('highpass', 2600);
    const ng = this._gain(0);
    this._perc(ng, T, 0.05 * vel, 0.012);
    n.connect(hp).connect(ng).connect(this.grp.bell);
  }

  stop() {
    const T = this.ac.currentTime;
    try {
      this.master.gain.cancelScheduledValues(T);
      this.master.gain.setTargetAtTime(0, T, 0.05);
    } catch (e) { /* closed */ }
  }

  disconnect() {
    try { this.master.disconnect(); } catch (e) { /* fine */ }
    try { this.wet.disconnect(); } catch (e) { /* fine */ }
  }
}

// ---------------------------------------------------------------------------------------
// The score. Melody and harmony are written in B♭ and transposed for the last chorus.

// [beat-in-bar, midi, beats]
const MEL = [
  [[0, 74, 1.5], [1.5, 72, 0.5], [2, 70, 0.5], [2.5, 74, 0.5], [3, 77, 1]],
  [[0, 79, 1.5], [1.5, 77, 0.5], [2, 75, 0.5], [2.5, 74, 0.5], [3, 72, 1]],
  [[0, 69, 0.5], [0.5, 72, 0.5], [1, 77, 0.5], [1.5, 81, 0.5], [2, 79, 1], [3, 77, 1]],
  [[0, 74, 1], [1, 75, 0.5], [1.5, 76, 0.5], [2, 77, 2]],
  [[0, 79, 1.5], [1.5, 82, 0.5], [2, 79, 0.5], [2.5, 75, 0.5], [3, 79, 1]],
  [[0, 77, 1.5], [1.5, 74, 0.5], [2, 70, 0.5], [2.5, 74, 0.5], [3, 77, 1]],
  [[0, 76, 0.5], [0.5, 77, 0.5], [1, 79, 0.5], [1.5, 81, 0.5], [2, 82, 0.5], [2.5, 84, 0.5], [3, 81, 1]],
  [[0, 82, 1], [1, 77, 0.5], [1.5, 74, 0.5], [2, 70, 1]],
];

// descant for piccolo; 't' = trilled
const DESC = [
  [[0, 86, 2], [2, 89, 2]],
  [[0, 87, 2], [2, 91, 1], [3, 87, 1]],
  [[0, 89, 1], [1, 88, 0.5], [1.5, 89, 0.5], [2, 93, 2, 't']],
  [[0, 94, 1], [1, 93, 0.5], [1.5, 91, 0.5], [2, 89, 2, 't']],
  [[0, 91, 2], [2, 94, 2]],
  [[0, 93, 2, 't'], [2, 91, 2]],
  [[0, 88, 1], [1, 89, 1], [2, 91, 1], [3, 93, 1]],
  [[0, 94, 1.5], [1.5, 89, 0.5], [2, 86, 2, 't']],
];

const CH = {
  Bb: { st: [58, 62, 65], r: 46, f: 41 },
  Bb7: { st: [56, 58, 62, 65], r: 46, f: 41 },
  Eb: { st: [58, 63, 67], r: 39, f: 46 },
  Cm7: { st: [58, 60, 63, 67], r: 36, f: 43 },
  F7: { st: [57, 60, 63, 65], r: 41, f: 36 },
  Ebmaj7: { st: [58, 62, 63, 67], r: 39, f: 46 },
  Dm7: { st: [57, 60, 62, 65], r: 38, f: 45 },
  Gm7: { st: [58, 62, 65, 67], r: 43, f: 38 },
  C7: { st: [58, 60, 64, 67], r: 36, f: 43 },
};
const PROG = [['Bb', 'Bb'], ['Eb', 'Cm7'], ['F7', 'F7'], ['Bb', 'Bb7'], ['Ebmaj7', 'Ebmaj7'], ['Dm7', 'Gm7'], ['C7', 'F7'], ['Bb', 'Bb']];

// snare street-beat patterns, 16 sixteenths per bar
const SN_A = [1, 0, 0, 0.35, 0.75, 0, 0.45, 0, 0.95, 0, 0.3, 0.4, 0.75, 0.3, 0.5, 0.3];
const SN_B = [1, 0.3, 0.35, 0.45, 0.8, 0.3, 0.55, 0.3, 0.95, 0.3, 0.4, 0.5, 0.8, 0.45, 0.65, 0.5];

export function buildScore(tempo) {
  const ev = [];
  const S = tempo.sec;
  const at = (b, fn) => ev.push({ t: tempo.timeAt(b), b, fn });
  const D = (b, d) => tempo.timeAt(b + d) - tempo.timeAt(b);

  const bars = (b0, n, fn) => { for (let i = 0; i < n; i++) fn(b0 + i * 4, i); };

  const snarePat = (b0, pat, vel, skipFrom = 99) => {
    pat.forEach((v, i) => {
      if (!v || i / 4 >= skipFrom) return;
      at(b0 + i / 4, (bd, T) => bd.snare(T, v * vel));
    });
  };
  const rollAt = (b, beats, v0, v1) => at(b, (bd, T) => bd.roll(T, D(b, beats), v0, v1, 28));

  const melody = (b0, tr, fn, from = 0, to = 8) => {
    for (let i = from; i < to; i++) {
      for (const [o, m, d] of MEL[i]) fn(b0 + i * 4 + o, m + tr, d, i);
    }
  };
  const descant = (b0, tr, vel) => {
    for (let i = 0; i < 8; i++) {
      for (const [o, m, d, tt] of DESC[i]) {
        const b = b0 + i * 4 + o;
        if (tt) {
          const n = Math.round(d * 8);
          for (let k = 0; k < n; k++) {
            const bb = b + k / 8;
            const mm = m + tr + (k % 2 ? (m % 12 === 9 || m % 12 === 2 ? 1 : 2) : 0);
            at(bb, (band, T) => band.picc(T, mm, D(bb, 1 / 8) * 0.9, vel * (k % 2 ? 0.8 : 1)));
          }
        } else {
          at(b, (band, T) => band.picc(T, m + tr, D(b, d) * 0.92, vel));
        }
      }
    }
  };
  const harmony = (b0, tr, { stabVel = 0.7, offbeats = false, offFrom = 4, tubaVel = 0.9 } = {}) => {
    for (let i = 0; i < 8; i++) {
      const bb = b0 + i * 4;
      const [h1, h2] = PROG[i].map((k) => CH[k]);
      // oom
      at(bb, (band, T) => band.tuba(T, h1.r + tr, D(bb, 0.62), tubaVel));
      const r2 = h1 === h2 ? h1.f : h2.r;
      at(bb + 2, (band, T) => band.tuba(T, r2 + tr, D(bb + 2, 0.62), tubaVel * 0.92));
      if (i === 3 || i === 7) at(bb + 3.5, (band, T) => band.tuba(T, (i === 7 ? 45 : 38) + tr, D(bb + 3.5, 0.4), tubaVel * 0.7));
      // pah
      const st1 = h1.st.map((m) => m + tr);
      const st2 = h2.st.map((m) => m + tr);
      at(bb + 1, (band, T) => band.brass(T, st1, D(bb + 1, 0.26), { vel: stabVel, pk: 0.032, bright: 0.7 }));
      at(bb + 3, (band, T) => band.brass(T, st2, D(bb + 3, 0.26), { vel: stabVel, pk: 0.032, bright: 0.7 }));
      if (offbeats && i >= offFrom) {
        for (const o of [0.5, 1.5, 2.5, 3.5]) {
          const s = o < 2 ? st1 : st2;
          at(bb + o, (band, T) => band.brass(T, s, D(bb + o, 0.2), { vel: stabVel * 0.62, pk: 0.032, bright: 0.6 }));
        }
      }
    }
  };
  const trumpets = (b0, tr, vel, from = 0, to = 8, grp = 'lead', oct = 0) => {
    melody(b0, tr + oct, (b, m, d) => {
      at(b, (band, T) => band.brass(T, [m], D(b, d) * 0.9, { vel, grp, pk: grp === 'lead' ? 0.075 : 0.06, bright: 1, vib: d >= 1 ? 14 : 0, scoop: 0.8 }));
    }, from, to);
  };
  const glocks = (b0, tr, vel, from = 0, to = 8) => {
    melody(b0, tr + 12, (b, m) => at(b, (band, T) => band.glock(T, m, vel)), from, to);
  };
  const drumsMarch = (b0, n, { pat = SN_A, vel = 0.8, bd = 0.8, every = false, clash = 0, crashBars = [0, 4], fills = true } = {}) => {
    bars(b0, n, (bb, i) => {
      const fill = fills && (i % 4 === 3);
      snarePat(bb, pat, vel, fill ? (i % 8 === 7 ? 2 : 3) : 99);
      if (fill) {
        if (i % 8 === 7) rollAt(bb + 2, 2, 0.35, 1.0);
        else for (let k = 0; k < 4; k++) at(bb + 3 + k / 4, (band, T) => band.snare(T, 0.55 + k * 0.13));
      }
      for (let k = 0; k < 4; k++) {
        if (every || k % 2 === 0) at(bb + k, (band, T) => band.bd(T, bd * (k % 2 ? 0.7 : 1)));
        if (clash === 2 || (clash === 1 && k % 2 === 1)) at(bb + k, (band, T) => band.clash(T, k % 2 ? 0.8 : 0.6));
      }
      if (crashBars.includes(i)) at(bb, (band, T) => band.crash(T, 0.9, 2.6));
    });
  };

  // ---------------- intro: the parade, far away, approaching ----------------
  {
    const b0 = S.intro.beat;
    at(b0, (band, T) => {
      band.distSet(T, 420);
      band.distTo(T + 0.01, 9000, tempo.timeAt(S.A.beat) - tempo.timeAt(b0), 'exp');
      band.nearTo(T, 0.32, 1, tempo.timeAt(S.A.beat) - tempo.timeAt(b0));
    });
    // the drum major's whistle: one long, three short
    at(b0, (band, T) => band.whistle(T, D(b0, 1.1), 0.9));
    [1.5, 2, 2.5].forEach((o) => at(b0 + o, (band, T) => band.whistle(T, D(b0 + o, 0.22), 0.8)));
    for (let k = 0; k < 4; k++) at(b0 + k, (band, T) => band.bd(T, 0.8));
    at(b0 + 3, (band, T) => band.snare(T, 0.6));
    at(b0 + 3.5, (band, T) => band.snare(T, 0.6));
    bars(b0 + 4, 2, (bb, i) => {
      snarePat(bb, SN_A, 0.72);
      at(bb, (band, T) => band.bd(T, 0.85));
      at(bb + 2, (band, T) => band.bd(T, 0.75));
      at(bb + 1, (band, T) => band.clash(T, 0.5));
      at(bb + 3, (band, T) => band.clash(T, 0.5));
      if (i === 1) {
        at(bb, (band, T) => band.tuba(T, 46, D(bb, 0.6), 0.75));
        at(bb + 2, (band, T) => band.tuba(T, 41, D(bb + 2, 0.6), 0.7));
      }
    });
    const b3 = b0 + 12;
    at(b3, (band, T) => band.tuba(T, 46, D(b3, 0.6), 0.8));
    at(b3 + 2, (band, T) => band.tuba(T, 41, D(b3 + 2, 0.6), 0.8));
    at(b3, (band, T) => band.bd(T, 0.9));
    at(b3 + 2, (band, T) => band.bd(T, 0.9));
    rollAt(b3, 3.5, 0.25, 1.0);
    // pickup: ba-DUM
    at(b3 + 3.5, (band, T) => band.brass(T, [53, 58, 62], D(b3 + 3.5, 0.4), { vel: 0.8, pk: 0.034 }));
    at(b3 + 3.5, (band, T) => band.tuba(T, 41, D(b3 + 3.5, 0.4), 0.85));
  }

  // ---------------- A: glockenspiel melody, the band joining in ----------------
  {
    const b0 = S.A.beat;
    harmony(b0, 0, { stabVel: 0.62, tubaVel: 0.85 });
    glocks(b0, 0, 1.0);
    trumpets(b0, 0, 0.55, 4, 8);
    drumsMarch(b0, 8, { pat: SN_A, vel: 0.7, bd: 0.8, clash: 1 });
    at(b0 + 31.5, (band, T) => band.brass(T, [53, 58, 62], D(b0 + 31.5, 0.4), { vel: 0.85, pk: 0.034 }));
  }

  // ---------------- A2: the full band; trombones being silly ----------------
  {
    const b0 = S.A2.beat;
    harmony(b0, 0, { stabVel: 0.78, tubaVel: 0.95 });
    trumpets(b0, 0, 0.9);
    glocks(b0, 0, 0.75);
    descant(b0, 0, 0.75);
    drumsMarch(b0, 8, { pat: SN_B, vel: 0.75, bd: 0.85, clash: 1 });
    // trombone smears
    at(b0 + 14.5, (band, T) => band.brass(T, [46, 53], D(b0 + 14.5, 1.3), { grp: 'bone', vel: 0.75, pk: 0.05, glideTo: 53, bright: 0.6 }));
    at(b0 + 30, (band, T) => band.brass(T, [58], D(b0 + 30, 0.9), { grp: 'bone', vel: 0.8, pk: 0.06, glideTo: 46, bright: 0.7 }));
    // honk honk
    at(b0 + 31, (band, T) => band.honk(T, 1));
    at(b0 + 31.5, (band, T) => band.honk(T, 1));
  }

  // ---------------- B: matsuri bayashi, then the floor drops out ----------------
  {
    const b0 = S.B.beat;
    // B1–B2: taiko, atarigane, shinobue; the tuba keeps marching underneath
    for (let bar = 0; bar < 2; bar++) {
      const bb = b0 + bar * 4;
      [[0, 1, 1], [0.75, 0.55, 0], [1, 0.9, 1], [2, 1, 1], [3, 0.6, 0], [3.25, 0.6, 0], [3.5, 0.95, 1]].forEach(([o, v, big]) => {
        at(bb + o, (band, T) => band.taiko(T, v, !!big));
      });
      at(bb + 2.5, (band, T) => band.ka(T, 1));
      for (let k = 0; k < 8; k++) {
        at(bb + k / 2, (band, T) => band.kane(T, k % 2 ? 0.6 : 0.95, !(k % 2)));
        if (k % 2) at(bb + k / 2 + 0.25, (band, T) => band.kane(T, 0.4, false));
      }
      at(bb, (band, T) => band.tuba(T, 46, D(bb, 0.6), 0.7));
      at(bb + 2, (band, T) => band.tuba(T, 41, D(bb + 2, 0.6), 0.65));
    }
    const FUE = [[0, 87, 1.5], [1.5, 84, 0.5], [2, 82, 0.5], [2.5, 87, 0.5], [3, 89, 1],
      [4, 91, 0.5], [4.5, 89, 0.5], [5, 87, 0.5], [5.5, 84, 0.5], [6, 87, 1], [7, 89, 1]];
    FUE.forEach(([o, m, d]) => at(b0 + o, (band, T) => band.picc(T, m, D(b0 + o, d) * 0.95, 1, true)));
    at(b0, (band, T) => band.cicada(T, D(b0, 8), 1));
    for (let k = 0; k < 8; k++) at(b0 + 4 + k / 2, (band, T) => band.xing(T, k % 2 === 0));

    // B3–B4: a basement opens under the parade
    const t0 = b0 + 8;
    at(t0, (band, T) => band.distTo(T, 650, 0.08));
    at(t0 + 5.5, (band, T) => band.distTo(T, 15000, D(t0 + 5.5, 2.5)));
    [[0, 34, 1.5, null], [1.75, 34, 0.5, null], [2.5, 34, 0.75, null], [3.5, 29, 0.5, 34],
      [4, 34, 1.5, 37], [5.75, 32, 0.5, null], [6, 34, 2, 46]].forEach(([o, m, d, gl]) => {
      at(t0 + o, (band, T) => band.sub(T, m, D(t0 + o, d), gl, 1));
    });
    for (let k = 0; k < 16; k++) {
      const o = k / 4;
      if ((o >= 1.5 && o < 2) || (o >= 3.5 && o < 4)) continue;
      at(t0 + o, (band, T) => band.hat(T, k % 4 === 0 ? 1 : 0.6));
    }
    for (let k = 0; k < 3; k++) at(t0 + 1.5 + k / 6, (band, T) => band.hat(T, 0.8));
    for (let k = 0; k < 4; k++) at(t0 + 3.5 + k / 8, (band, T) => band.hat(T, 0.5 + k * 0.12));
    for (let k = 0; k < 6; k++) at(t0 + 4 + k / 4, (band, T) => band.hat(T, k % 4 === 0 ? 1 : 0.6));
    for (let k = 0; k < 6; k++) at(t0 + 5.5 + k / 12, (band, T) => band.hat(T, 0.5 + k * 0.08));
    at(t0 + 7.5, (band, T) => band.hat(T, 0.9, true));
    at(t0 + 2, (band, T) => band.clap(T, 1));
    at(t0 + 6, (band, T) => band.clap(T, 1));
    // the brass, heard through a wall
    for (let k = 0; k < 4; k++) at(t0 + k / 8, (band, T) => band.brass(T, [58, 62, 65], D(t0, 0.1), { vel: 0.95, pk: 0.04 }));
    at(t0 + 3.5, (band, T) => band.brass(T, [56, 60, 63], D(t0 + 3.5, 0.3), { vel: 0.9, pk: 0.04 }));
    // the hook, slowed down, on the glockenspiel, drenched
    [[0, 86], [3, 84], [4, 82], [5, 86], [6, 89]].forEach(([o, m]) => {
      at(t0 + o, (band, T) => band.glock(T, m, 0.75, 1.9, 'glockc'));
    });
    // back to the street: roll, slide whistle up, chromatic run, crash into C major
    rollAt(t0 + 6, 2, 0.3, 1.05);
    at(t0 + 5.5, (band, T) => band.slide(T, D(t0 + 5.5, 2.3), 480, 2100, 1));
    [68, 69, 70, 71].forEach((m, k) => at(t0 + 7 + k / 4, (band, T) => band.brass(T, [m, m - 4], D(t0 + 7, 0.22), { grp: 'lead', vel: 0.8 + k * 0.06, pk: 0.05 })));
  }

  // ---------------- A3: up a whole step, everything ----------------
  {
    const b0 = S.A3.beat;
    const tr = 2;
    harmony(b0, tr, { stabVel: 0.88, offbeats: true, offFrom: 4, tubaVel: 1 });
    trumpets(b0, tr, 1.0);
    trumpets(b0, tr, 0.6, 0, 8, 'bone', -12);
    glocks(b0, tr, 0.85);
    descant(b0, tr, 0.85);
    drumsMarch(b0, 4, { pat: SN_B, vel: 0.85, bd: 0.85, every: true, clash: 1, crashBars: [0] });
    drumsMarch(b0 + 16, 4, { pat: SN_B, vel: 0.9, bd: 0.9, every: true, clash: 2, crashBars: [0] });
    at(b0 + 14, (band, T) => band.slide(T, D(b0 + 14, 1.5), 1900, 520, 0.8));
    at(b0 + 31.5, (band, T) => band.brass(T, [55, 60, 64], D(b0 + 31.5, 0.4), { vel: 0.95, pk: 0.036 }));
  }

  // ---------------- tag: accelerando, and the held chord ----------------
  {
    const b0 = S.tag.beat;
    const tr = 2;
    const run = MEL[6];
    const hook = MEL[0];
    run.forEach(([o, m, d]) => {
      const b = b0 + o;
      at(b, (band, T) => band.brass(T, [m + tr], D(b, d) * 0.9, { grp: 'lead', vel: 1, pk: 0.075 }));
      at(b, (band, T) => band.brass(T, [m + tr - 12], D(b, d) * 0.9, { grp: 'bone', vel: 0.65, pk: 0.06 }));
      at(b, (band, T) => band.glock(T, m + tr + 12, 0.85));
    });
    hook.forEach(([o, m, d]) => {
      const b = b0 + 4 + o;
      at(b, (band, T) => band.brass(T, [m + tr], D(b, d) * 0.9, { grp: 'lead', vel: 1, pk: 0.078, vib: d >= 1 ? 14 : 0 }));
      at(b, (band, T) => band.brass(T, [m + tr - 12], D(b, d) * 0.9, { grp: 'bone', vel: 0.65, pk: 0.06 }));
      at(b, (band, T) => band.glock(T, m + tr + 12, 0.85));
    });
    // harmony: D7 → G7 | C
    const D7 = [60, 62, 66, 69], G7 = [59, 62, 65, 67], C = [60, 64, 67];
    for (let k = 0; k < 8; k++) {
      const b = b0 + k / 2;
      at(b, (band, T) => band.brass(T, k < 4 ? D7 : G7, D(b, 0.2), { vel: k % 2 ? 0.6 : 0.85, pk: 0.032 }));
    }
    for (let k = 0; k < 8; k++) {
      const b = b0 + 4 + k / 2;
      at(b, (band, T) => band.brass(T, C, D(b, 0.2), { vel: k % 2 ? 0.6 : 0.85, pk: 0.032 }));
    }
    [[0, 38], [2, 43], [4, 36], [6, 43]].forEach(([o, m]) => at(b0 + o, (band, T) => band.tuba(T, m, D(b0 + o, 0.6), 1)));
    [[1, 45], [3, 41], [5, 40], [7, 38]].forEach(([o, m]) => at(b0 + o, (band, T) => band.tuba(T, m, D(b0 + o, 0.5), 0.8)));
    for (let k = 0; k < 8; k++) {
      at(b0 + k, (band, T) => band.bd(T, 0.9));
      at(b0 + k, (band, T) => band.clash(T, 0.8));
    }
    for (let k = 0; k < 32; k++) at(b0 + k / 4, (band, T) => band.snare(T, k % 4 === 0 ? 0.95 : 0.55));
    at(b0, (band, T) => band.crash(T, 0.9, 2));
    // da — da —
    const e = b0 + 8;
    [[0, 0.5], [1, 0.5]].forEach(([o, d]) => {
      at(e + o, (band, T) => {
        band.brass(T, [72, 76, 79], D(e + o, d) * 0.8, { grp: 'lead', vel: 1, pk: 0.055 });
        band.brass(T, [48, 55, 60, 64], D(e + o, d) * 0.8, { grp: 'bone', vel: 0.9, pk: 0.04 });
        band.tuba(T, 36, D(e + o, d) * 0.8, 1);
        band.bd(T, 1);
        band.clash(T, 1);
        band.snare(T, 1);
      });
    });
    // DAAAAA —
    at(HOLD_BEAT, (band, T) => {
      band.hold(T, [36, 48, 55, 60, 64, 67, 72, 74, 76, 79], HOLD_LEN, 2.5, 0.075);
      band.crash(T, 0.8, 3.6);
      band.bd(T, 0.6);
      band.timp(T, 36, 0.5);
      band.roll(T + 0.08, HOLD_LEN - 0.15, 0.2, 0.62, 30);
      band.swell(T + 0.4, HOLD_LEN - 0.4, 0.6);
      for (let k = 0; k < Math.floor(HOLD_LEN * 11); k++) {
        const tt = T + k / 11;
        band.timp(tt, k % 2 ? 43 : 36, 0.12 + 0.2 * (k / (HOLD_LEN * 11)));
        band.glock(tt, [84, 88, 91, 96][k % 4], 0.42 * (1 - (k / (HOLD_LEN * 11)) * 0.6), 0.8);
      }
      band.bell(T + BELL_AT, 84, 9, 1.7);
    });
  }

  ev.sort((a, b) => a.t - b.t);
  return ev;
}

// A small look-ahead sequencer driven by the song clock.
export class Sequencer {
  constructor(band, events) {
    this.band = band;
    this.ev = events;
    this.i = 0;
  }
  // songT: current song time (s); audioT0: audio time at songT = 0
  pump(songT, audioT0, ahead = 0.22) {
    const ac = this.band.ac;
    const now = ac.currentTime;
    while (this.i < this.ev.length && this.ev[this.i].t < songT + ahead) {
      const e = this.ev[this.i++];
      const T = audioT0 + e.t;
      if (T < now - 0.05) continue; // too late, skip rather than pile up
      try { e.fn(this.band, Math.max(T, now + 0.005)); } catch (err) { /* keep marching */ }
    }
  }
  seek(songT) {
    this.i = 0;
    while (this.i < this.ev.length && this.ev[this.i].t < songT) this.i++;
  }
}
