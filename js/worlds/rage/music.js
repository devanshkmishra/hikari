// 地下 — an original rage beat, synthesized live. G# minor, 152 BPM.
//
// Arrangement (22 bars, loops forever; position is a pure function of time):
//   A      8 bars  — supersaw hook, syncopated chord stabs, distorted 808, clap on 3
//   BUILD  4 bars  — four-on-the-floor, snare roll, riser, chops; the last beat is empty
//   B      8 bars  — THE BEAT SWITCH: phrygian, square screech lead, triplet hats, sliding 808
//   BREAK  2 bars  — breathe; lead alone in the hall, then a fill back into A
//
// Signal: instruments → bus → charge HPF → muffle LPF → glue saturation → hide → gate →
//         limiter → trim → ctx.out   (plus a high-passed send into the shared hall)

import { buildKit, buildCheer } from './kit.js';
import { mtof } from '../../lib/audio.js';

// Normalized saturation: tanh(k·x)/tanh(k). Unity-ish peak, so drive changes tone, not level.
const satCurve = (k) => { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); } return c; };

export const BPM = 152;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
export const STEP = BAR / 16;
export const CYCLE = 22;
export const SWITCH_BAR = 12; // bar index (within the cycle) where B starts

export function section(k) {
  const i = ((k % CYCLE) + CYCLE) % CYCLE;
  if (i < 8) return { name: 'A', i, len: 8 };
  if (i < 12) return { name: 'BUILD', i: i - 8, len: 4 };
  if (i < 20) return { name: 'B', i: i - 12, len: 8 };
  return { name: 'BREAK', i: i - 20, len: 2 };
}

// G# minor: G#m – E – B – F#   (808 roots kept between 41 and 62 Hz)
const A_ROOTS = [32, 28, 35, 30];
const A_VOX = [[56, 59, 63], [56, 59, 64], [54, 59, 63], [54, 58, 61]];
// The switch: G#m – A (phrygian ♭II) – G#m – F#
const B_ROOTS = [32, 33, 32, 30];
const B_VOX = [[56, 59, 63], [57, 61, 64], [56, 59, 63], [54, 58, 61]];

// [step, midi, lengthInSteps, opts]
const LEAD_A = [
  [[0, 75, 2], [2, 71, 1], [3, 75, 2], [5, 80, 2], [7, 78, 1], [8, 75, 3], [11, 71, 3], [14, 73, 2]],
  [[0, 76, 2], [2, 71, 1], [3, 76, 2], [5, 80, 2], [7, 78, 1], [8, 76, 3], [11, 75, 3], [14, 71, 2]],
  [[0, 75, 2], [2, 71, 1], [3, 75, 2], [5, 78, 2], [7, 80, 1], [8, 82, 3], [11, 83, 3], [14, 82, 2]],
  [[0, 82, 2], [2, 78, 1], [3, 82, 2], [5, 85, 3], [8, 83, 2], [10, 82, 2], [12, 78, 4, { dive: -7 }]],
];
const LEAD_B = [
  [[0, 68, 6, { slide: 63 }], [6, 69, 2], [8, 68, 4], [12, 63, 4, { dive: -12 }]],
  [[0, 76, 3], [3, 73, 3], [6, 69, 2], [8, 71, 4, { vib: 28 }], [12, 69, 2], [14, 68, 2]],
  [[0, 75, 6, { slide: 68, vib: 22 }], [6, 71, 2], [8, 69, 2], [10, 68, 6, { vib: 34 }]],
  [[0, 70, 3], [3, 73, 3], [6, 78, 6, { vib: 38 }], [12, 76, 4, { dive: -5 }]],
];

// Hat helpers → arrays of [step, velocity, rate]
const eighths = () => [0, 2, 4, 6, 8, 10, 12, 14].map((s) => [s, s % 4 === 0 ? 0.85 : 0.6, 1]);
const sixteenths = (a = 0, b = 16) => { const o = []; for (let s = a; s < b; s++) o.push([s, s % 2 ? 0.45 : 0.75, 1]); return o; };
const roll = (a, b, perStep, v0 = 0.4, v1 = 0.85, r0 = 1, r1 = 1.28) => {
  const o = [], n = Math.round((b - a) * perStep);
  for (let j = 0; j < n; j++) { const u = j / Math.max(1, n - 1); o.push([a + j / perStep, v0 + (v1 - v0) * u, r0 + (r1 - r0) * u]); }
  return o;
};
const without = (arr, a, b) => arr.filter(([s]) => s < a || s >= b);
const HAT_A = [
  () => [...without(eighths(), 4, 6), ...roll(4, 6, 1.5, 0.5, 0.7, 1, 1.08)],
  () => [...without(eighths(), 12, 16), ...sixteenths(12, 16)],
  () => [...without(without(eighths(), 6, 8), 14, 16), ...roll(6, 8, 3, 0.35, 0.75), ...roll(14, 16, 2, 0.4, 0.9)],
  () => [...sixteenths(0, 14), ...roll(14, 16, 3, 0.35, 0.95, 1, 1.35)],
];
const tripletBar = () => { const o = []; for (let j = 0; j < 12; j++) o.push([j * (16 / 12), j % 3 === 0 ? 0.85 : 0.5, 1]); return o; };

export class Music {
  constructor(audio, out, send) {
    this.audio = audio;
    const ac = (this.ac = audio.ac);
    this.kit = buildKit(ac);
    this.cheerBuf = null;
    this.queue = [];
    this.cues = [];
    this.t0 = null;
    this.nextBar = 0;
    this.hidden = false;
    this.nodes = [];
    this.sources = [];
    this.place = 0;
    this.lastP = {};

    const G = (v = 1) => { const g = ac.createGain(); g.gain.value = v; return g; };
    const F = (type, f, q = 0.7) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
    const WS = (curve) => { const w = ac.createWaveShaper(); w.curve = curve; w.oversample = '2x'; return w; };
    const tanhCurve = (() => { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; c[i] = Math.tanh(x * 1.6) / Math.tanh(1.6); } return c; })();

    // ── master chain ─────────────────────────────────────────────
    this.bus = G(1);
    this.hpf = F('highpass', 25, 0.8);
    this.lpf = F('lowpass', 160, 0.9);
    this.satPre = G(0.5);
    this.sat = WS(tanhCurve);
    this.satPost = G(1);
    this.hide = G(1);
    this.gate = G(1);
    this.lim = ac.createDynamicsCompressor();
    this.lim.threshold.value = -5; this.lim.knee.value = 2; this.lim.ratio.value = 16;
    this.lim.attack.value = 0.002; this.lim.release.value = 0.12;
    this.trim = G(0.5);
    this.place_g = G(0.5);
    this.bus.connect(this.hpf).connect(this.lpf).connect(this.satPre).connect(this.sat).connect(this.satPost)
      .connect(this.place_g).connect(this.hide).connect(this.gate).connect(this.lim).connect(this.trim).connect(out);
    this.sendHP = F('highpass', 380, 0.7);
    this.sendTap = G(0.4);
    this.gate.connect(this.sendHP).connect(this.sendTap).connect(send);

    // Sidechain-able buses
    this.drums = G(1); this.drums.connect(this.bus);
    this.synthSC = G(1); this.synthSC.connect(this.bus);
    this.bassSC = G(1); this.bassSC.connect(this.bus);
    this.wet = G(0.07); // section-dependent extra hall send on synths
    this.synthSC.connect(this.wet).connect(this.sendHP);

    // Basement slap room
    this.roomIn = G(1);
    const conv = ac.createConvolver(); conv.buffer = audio.impulse(0.65, 3.2);
    this.roomOut = G(0.22);
    this.roomIn.connect(conv).connect(this.roomOut).connect(this.bus);

    // SFX go straight out (camera, tape) — not muffled, not gated.
    this.sfx = G(0.8); this.sfx.connect(out);
    this.sfxSend = G(0.25); this.sfx.connect(this.sfxSend).connect(send);
    this.amb = G(1); this.amb.connect(out);

    // ── 808 ──────────────────────────────────────────────────────
    this.bassIn = G(1);
    const subLP = F('lowpass', 115, 0.7), subG = G(0.4);
    this.bassDrive = G(1.6);
    const bShape = WS(satCurve(4.5)), bHP = F('highpass', 80, 0.7), bLP = F('lowpass', 1400, 0.8), bG = G(0.1);
    this.bassIn.connect(subLP).connect(subG).connect(this.bassSC);
    this.bassIn.connect(this.bassDrive).connect(bShape).connect(bHP).connect(bLP).connect(bG).connect(this.bassSC);
    this.lastBass = null;

    // ── leads ────────────────────────────────────────────────────
    this.vibLFO = ac.createOscillator(); this.vibLFO.frequency.value = 5.9; this.vibLFO.start();
    this.vibA = G(0); this.vibB = G(0);
    this.vibLFO.connect(this.vibA); this.vibLFO.connect(this.vibB);

    this.leadIn = G(1);
    this.leadLP = F('lowpass', 5200, 0.6);
    const lShape = WS(satCurve(3.2)), lHP = F('highpass', 230, 0.7);
    this.leadOut = G(0.29);
    this.leadIn.connect(lShape).connect(lHP).connect(this.leadLP).connect(this.leadOut).connect(this.synthSC);
    this.lead = this.voice(this.leadIn, { n: 5, detune: 24, spread: 0.95, vib: this.vibA });
    this.leadLo = this.voice(this.leadIn, { n: 3, detune: 14, spread: 0.6, vib: this.vibA, level: 0.55 });

    this.leadBIn = G(1.4);
    const bsh = WS(satCurve(6)), bPeak = ac.createBiquadFilter();
    bPeak.type = 'peaking'; bPeak.frequency.value = 1850; bPeak.Q.value = 1.3; bPeak.gain.value = 7;
    const bhp = F('highpass', 260, 0.7), blp = F('lowpass', 6200, 0.6);
    this.leadBOut = G(0.2);
    this.leadBIn.connect(bsh).connect(bPeak).connect(bhp).connect(blp).connect(this.leadBOut).connect(this.synthSC);
    this.leadB = this.voice(this.leadBIn, { n: 4, detune: 30, spread: 0.85, types: ['square', 'sawtooth'], vib: this.vibB });

    // ── chords / pad ─────────────────────────────────────────────
    this.chordIn = G(1);
    this.chordPre = G(1.4);
    const cShape = WS(satCurve(2.2)), cHP = F('highpass', 190, 0.7);
    this.chordLP = F('lowpass', 3000, 0.7);
    this.chordOut = G(0.13);
    this.chordIn.connect(this.chordPre).connect(cShape).connect(cHP).connect(this.chordLP).connect(this.chordOut).connect(this.synthSC);
    this.chords = [0, 1, 2].map(() => this.voice(this.chordIn, { n: 3, detune: 16, spread: 0.7, level: 0.6 }));

    // ── chops ────────────────────────────────────────────────────
    this.chopBus = G(0.5);
    const chopHP = F('highpass', 280, 0.7);
    this.chopBus.connect(chopHP).connect(this.synthSC);
    chopHP.connect(this.roomIn);

    // ── charge riser (the one you play) & crowd bed ──────────────
    {
      const src = ac.createBufferSource(); src.buffer = audio.noise('white'); src.loop = true;
      this.chargeBP = F('bandpass', 500, 2.2);
      this.chargeG = G(0);
      src.connect(this.chargeBP).connect(this.chargeG).connect(this.bus);
      src.start(); this.sources.push(src);
      this.chargeOsc = ac.createOscillator(); this.chargeOsc.type = 'sawtooth'; this.chargeOsc.frequency.value = 110;
      this.chargeOscG = G(0);
      const clp = F('lowpass', 2400, 0.7);
      this.chargeOsc.connect(clp).connect(this.chargeOscG).connect(this.bus);
      this.chargeOsc.start(); this.sources.push(this.chargeOsc);
    }
    {
      const src = ac.createBufferSource(); src.buffer = audio.noise('pink'); src.loop = true;
      const bp = F('bandpass', 950, 0.55);
      this.crowdBed = G(0.05);
      src.connect(bp).connect(this.crowdBed).connect(this.bus);
      src.start(); this.sources.push(src);
    }
    // 100 Hz fluorescent hum (Tokyo runs at 50 Hz)
    {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 100;
      const lp = F('lowpass', 340, 0.7);
      this.humG = G(0);
      o.connect(lp).connect(this.humG).connect(this.amb);
      o.start(); this.sources.push(o);
    }
  }

  voice(dest, { n = 5, detune = 20, spread = 0.9, types = ['sawtooth'], vib = null, level = 1 }) {
    const ac = this.ac;
    const f = ac.createConstantSource(); f.offset.value = 220; f.start();
    const vca = ac.createGain(); vca.gain.value = 0;
    const lv = ac.createGain(); lv.gain.value = level;
    const now = ac.currentTime;
    for (let i = 0; i < n; i++) {
      const o = ac.createOscillator();
      o.type = types[i % types.length];
      o.frequency.value = 0;
      f.connect(o.frequency);
      const pos = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
      o.detune.value = pos * detune + (Math.random() - 0.5) * 5;
      if (vib) vib.connect(o.detune);
      const p = ac.createStereoPanner(); p.pan.value = pos * spread;
      const g = ac.createGain(); g.gain.value = 1 / Math.sqrt(n);
      o.connect(g).connect(p).connect(vca);
      o.start(now + Math.random() * 0.02);
      this.sources.push(o);
    }
    this.sources.push(f);
    vca.connect(lv).connect(dest);
    return { f: f.offset, vca: vca.gain, lastEnd: 0 };
  }

  // ── clock ──────────────────────────────────────────────────────
  latency() {
    const ac = this.ac;
    const l = (ac.outputLatency || 0) + (ac.baseLatency || 0);
    return Math.max(0, Math.min(0.35, l));
  }
  heard() { return this.ac.currentTime - this.latency(); }
  // Song position for a given (heard) time.
  pos(t = this.heard()) {
    if (this.t0 == null) return null;
    const st = t - this.t0;
    const bar = Math.floor(st / BAR);
    const beats = st / BEAT;
    return { st, bar, beats, beatPhase: beats - Math.floor(beats), barPhase: st / BAR - bar, sec: section(bar), beatInBar: Math.floor(beats) - bar * 4 };
  }
  // Downbeat time of the beat switch nearest to t.
  switchNear(t = this.heard()) {
    if (this.t0 == null) return null;
    const bar = Math.floor((t - this.t0) / BAR);
    const base = Math.floor(bar / CYCLE) * CYCLE + SWITCH_BAR;
    let best = null;
    for (const k of [base - CYCLE, base, base + CYCLE]) {
      const tt = this.t0 + k * BAR;
      if (best == null || Math.abs(tt - t) < Math.abs(best - t)) best = tt;
    }
    return best;
  }

  // ── scheduler (called every ~25 ms) ────────────────────────────
  tick() {
    const ac = this.ac;
    if (ac.state !== 'running') return;
    const now = ac.currentTime;
    if (document.hidden) {
      if (!this.hidden) { this.hidden = true; this.hide.gain.setTargetAtTime(0, now, 0.08); }
      return;
    }
    if (this.hidden) {
      this.hidden = false;
      this.hide.gain.setTargetAtTime(1, now, 0.15);
      this.queue.length = 0;
      if (this.t0 != null) this.nextBar = Math.max(this.nextBar, Math.floor((now - this.t0) / BAR) + 1);
    }
    if (this.t0 == null) { this.t0 = now + 0.12; this.nextBar = 0; }
    if (!this.cheerBuf && now - this.t0 > 0.6) { try { this.cheerBuf = buildCheer(ac); } catch (e) { this.cheerBuf = null; } }
    while (this.t0 + this.nextBar * BAR < now + BAR + 0.25) { this.genBar(this.nextBar); this.nextBar++; }
    const horizon = now + 0.15;
    while (this.queue.length && this.queue[0].t < horizon) {
      const e = this.queue.shift();
      if (e.t < now - 0.03) continue;
      try { this.play(e); } catch (err) { /* a dropped note is better than a dead loop */ }
    }
    if (this.cues.length > 200) this.cues.splice(0, this.cues.length - 200);
  }

  genBar(k) {
    const t = this.t0 + k * BAR;
    const S = section(k);
    const ev = [];
    const at = (s) => t + s * STEP;
    const P = (o) => ev.push(o);
    P({ t, type: 'bar', k, sec: S.name, i: S.i });
    const i = S.i;

    if (S.name === 'A') {
      const c = i % 4, root = A_ROOTS[c];
      if (i === 0) { P({ t, type: 'crash', v: 0.45 }); P({ t, type: 'mode', m: 'A' }); }
      let kp = i % 2 === 0 ? [0, 7, 10] : [0, 3, 10, 13];
      if (i === 7) kp = [0, 3, 10, 12, 14];
      kp.forEach((s) => P({ t: at(s), type: 'kick', v: s === 0 ? 1 : 0.86 }));
      kp.forEach((s, j) => {
        const e = j + 1 < kp.length ? kp[j + 1] : 16;
        let m = root, glide = null;
        if (i % 4 === 1 && j === 2) m = root + 12;
        if (c === 3 && j === kp.length - 1) glide = root + 12;
        P({ t: at(s), type: 'bass', m, len: (e - s) * STEP, glide, v: 0.95 });
      });
      P({ t: at(8), type: 'clap', v: 1 });
      if (i === 3 || i === 7) P({ t: at(15), type: 'clap', v: 0.42 });
      HAT_A[i % 4]().forEach(([s, v, r]) => P({ t: at(s), type: 'hat', v: v * 0.9, rate: r, pan: (s % 2 ? 0.22 : -0.12) }));
      if (i % 2 === 1) P({ t: at(14), type: 'hat', open: true, v: 0.32, rate: 1, pan: 0.3 });
      LEAD_A[c].forEach(([s, m, l, o]) => P({ t: at(s), type: 'lead', m, len: l * STEP, dbl: i >= 4, v: 1, ...(o || {}) }));
      [0, 3, 6, 9, 12].forEach((s) => P({ t: at(s), type: 'chord', notes: A_VOX[c], len: STEP * 1.6, v: s === 0 ? 1 : 0.78 }));
      if (i === 3) { P({ t: at(10), type: 'chop', vw: 'a', m: 70, len: STEP }); P({ t: at(11), type: 'chop', vw: 'o', m: 68, len: STEP * 1.5 }); }
      if (i === 7) [['e', 75], ['e', 75], ['a', 78], ['i', 80]].forEach(([vw, m], j) => P({ t: at(12 + j), type: 'chop', vw, m, len: STEP * 0.9 }));
    } else if (S.name === 'BUILD') {
      if (i === 0) {
        P({ t, type: 'riser', dur: BAR * 3 + BEAT * 3 });
        P({ t, type: 'crash', v: 0.3 });
        P({ t, type: 'sweep', from: 900, to: 7200, dur: BAR * 3 + BEAT * 3 });
        P({ t, type: 'mode', m: 'BUILD' });
      }
      const kicks = i < 3 ? [0, 4, 8, 12] : [0, 4, 8];
      kicks.forEach((s) => P({ t: at(s), type: 'kick', v: 0.78 + 0.06 * i }));
      if (i === 0) P({ t, type: 'bass', m: 32, len: BAR * 0.95, v: 0.8 });
      if (i < 2) P({ t: at(8), type: 'clap', v: 0.85 });
      if (i === 1) for (let s = 8; s < 16; s += 2) P({ t: at(s), type: 'snare', v: 0.25 + (s - 8) * 0.03, rate: 1 });
      if (i === 2) for (let s = 0; s < 16; s++) P({ t: at(s), type: 'snare', v: 0.35 + s * 0.022, rate: 1 + s * 0.006 });
      if (i === 3) for (let s = 0; s < 12; s += 0.5) P({ t: at(s), type: 'snare', v: 0.6 + s * 0.03, rate: 1.1 + s * 0.025 });
      const hats = i < 2 ? sixteenths() : i === 2 ? roll(0, 16, 1.5, 0.45, 0.8, 1, 1.12) : roll(0, 12, 2, 0.5, 0.95, 1.05, 1.4);
      hats.forEach(([s, v, r]) => P({ t: at(s), type: 'hat', v: v * 0.8, rate: r, pan: (Math.round(s * 2) % 2 ? 0.25 : -0.2) }));
      LEAD_A[i].forEach(([s, m, l, o]) => {
        if (i === 3 && s >= 12) return;
        const len = i === 3 ? Math.min(l, 12 - s) : l;
        P({ t: at(s), type: 'lead', m, len: len * STEP, dbl: i >= 2, v: 0.9, ...(o && i < 3 ? o : {}) });
      });
      if (i === 2) [8, 10, 12, 14].forEach((s, j) => P({ t: at(s), type: 'chop', vw: 'a', m: 68 + j * 2, len: STEP }));
      if (i === 3) {
        for (let s = 0; s < 8; s++) P({ t: at(s), type: 'chop', vw: s % 2 ? 'e' : 'a', m: 70 + s, len: STEP * 0.7 });
        P({ t: at(12), type: 'hey', v: 0.85 });
        P({ t: t + BAR, type: 'reverse', v: 0.65, end: true });
        for (let b = 0; b < 4; b++) P({ t: at(b * 4), type: 'count', n: 4 - b });
        P({ t: at(12), type: 'cut' });
      }
    } else if (S.name === 'B') {
      const c = i % 4, root = B_ROOTS[c];
      if (i === 0) {
        P({ t, type: 'crash', v: 0.9 }); P({ t, type: 'boom', v: 0.9 }); P({ t, type: 'hey', v: 0.7 });
        P({ t, type: 'cheer', v: 0.55 }); P({ t, type: 'switch' }); P({ t, type: 'mode', m: 'B' });
      }
      if (i === 4) P({ t, type: 'crash', v: 0.55 });
      const even = i % 2 === 0;
      const kp = even ? [0, 6, 10] : [0, 3, 7, 10, 14];
      kp.forEach((s) => P({ t: at(s), type: 'kick', v: s === 0 ? 1 : 0.88 }));
      if (even) {
        P({ t: at(0), type: 'bass', m: root, len: 6 * STEP, glide: root + 12, v: 1 });
        P({ t: at(6), type: 'bass', m: root + 12, len: 4 * STEP, glide: root, v: 0.95 });
        P({ t: at(10), type: 'bass', m: root, len: 6 * STEP, v: 1 });
      } else {
        P({ t: at(0), type: 'bass', m: root, len: 3 * STEP, v: 1 });
        P({ t: at(3), type: 'bass', m: root, len: 4 * STEP, v: 0.9 });
        P({ t: at(7), type: 'bass', m: root + 7, len: 3 * STEP, v: 0.9 });
        P({ t: at(10), type: 'bass', m: root + 12, len: 4 * STEP, glide: root, v: 0.95 });
        P({ t: at(14), type: 'bass', m: root, len: 2 * STEP, v: 0.9 });
      }
      P({ t: at(8), type: 'clap', v: 1 });
      if (c === 3) { P({ t: at(12), type: 'clap', v: 0.7 }); P({ t: at(13), type: 'clap', v: 0.55 }); }
      const hats = even ? tripletBar() : [...tripletBar().filter(([s]) => s < 12), ...roll(12, 16, 3, 0.4, 0.95, 1, 1.35)];
      hats.forEach(([s, v, r]) => P({ t: at(s), type: 'hat', v: v * 0.85, rate: r * 1.04, pan: (Math.round(s * 3) % 2 ? 0.28 : -0.22) }));
      if (!even) P({ t: at(6), type: 'hat', open: true, v: 0.28, rate: 0.95, pan: -0.3 });
      LEAD_B[c].forEach(([s, m, l, o]) => P({ t: at(s), type: 'leadB', m, len: l * STEP, v: 1, ...(o || {}) }));
      P({ t, type: 'pad', notes: B_VOX[c], len: BAR - 0.03, v: 0.6 });
      if (even) {
        const ch = B_VOX[c].map((n) => n + 12);
        [[2, 'a', ch[0]], [3, 'a', ch[0]], [6, 'o', ch[1]], [7, 'e', ch[2]], [10, 'a', ch[0]], [11, 'i', ch[2] + 2]]
          .forEach(([s, vw, m]) => P({ t: at(s), type: 'chop', vw, m, len: STEP * 0.85 }));
      }
    } else {
      // BREAK
      if (i === 0) {
        P({ t, type: 'mode', m: 'BREAK' });
        P({ t, type: 'bass', m: 32, len: BAR * 1.9, glide: 30, v: 0.7 });
        P({ t, type: 'pad', notes: A_VOX[0], len: BAR - 0.03, v: 0.5 });
      } else {
        P({ t, type: 'pad', notes: A_VOX[3], len: BAR * 0.75, v: 0.5 });
        for (let s = 12; s < 16; s++) P({ t: at(s), type: 'snare', v: 0.35 + (s - 12) * 0.12, rate: 1.05 });
        P({ t: t + BAR, type: 'reverse', v: 0.55, end: true });
        P({ t: at(14), type: 'chop', vw: 'a', m: 75, len: STEP }); P({ t: at(15), type: 'chop', vw: 'i', m: 80, len: STEP });
      }
      [4, 12].forEach((s) => P({ t: at(s), type: 'hat', open: true, v: 0.22, rate: 1, pan: s === 4 ? -0.3 : 0.3 }));
      LEAD_A[i === 0 ? 0 : 3].forEach(([s, m, l]) => { if (i === 1 && s >= 12) return; P({ t: at(s), type: 'lead', m, len: l * STEP, v: 0.7 }); });
    }
    for (const e of ev) {
      if (e.end) { e.tEnd = e.t; e.t = Math.max(t, e.t - this.kit.reverse.duration); }
      this.queue.push(e);
    }
    this.queue.sort((a, b) => a.t - b.t);
  }

  // ── players ────────────────────────────────────────────────────
  buf(b, t, dest, { v = 1, rate = 1, pan = 0, offset = 0, dur } = {}) {
    const ac = this.ac;
    const s = ac.createBufferSource();
    s.buffer = b; s.playbackRate.value = rate;
    const g = ac.createGain(); g.gain.value = v;
    if (pan) { const p = ac.createStereoPanner(); p.pan.value = pan; s.connect(g).connect(p).connect(dest); }
    else s.connect(g).connect(dest);
    s.start(t, offset, dur);
    return { s, g };
  }

  duck(t, depth = 0.32) {
    const sc = this.synthSC.gain, bs = this.bassSC.gain;
    sc.setTargetAtTime(depth, t, 0.004); sc.setTargetAtTime(1, t + 0.035, 0.085);
    bs.setTargetAtTime(0.45, t, 0.002); bs.setTargetAtTime(1, t + 0.025, 0.03);
  }

  play(e) {
    const ac = this.ac, K = this.kit, t = e.t;
    const cue = (o) => this.cues.push({ t, ...o });
    switch (e.type) {
      case 'bar': cue({ type: 'bar', k: e.k, sec: e.sec, i: e.i }); break;
      case 'mode': this.mode(e.m, t); break;
      case 'kick':
        this.buf(K.kick, t, this.drums, { v: 0.95 * e.v });
        this.duck(t);
        cue({ type: 'kick', v: e.v });
        break;
      case 'clap':
        this.buf(K.clap, t, this.drums, { v: 0.5 * e.v });
        this.buf(K.clap, t, this.roomIn, { v: 0.22 * e.v });
        cue({ type: 'clap', v: e.v });
        break;
      case 'snare':
        this.buf(K.snare, t, this.drums, { v: 0.36 * e.v, rate: e.rate || 1 });
        if (e.v > 0.6) cue({ type: 'snare', v: e.v });
        break;
      case 'hat':
        this.buf(e.open ? K.hatOpen : K.hat, t, this.drums, { v: (e.open ? 0.2 : 0.17) * e.v, rate: e.rate || 1, pan: e.pan || 0 });
        break;
      case 'crash':
        this.buf(K.crash, t, this.drums, { v: 0.26 * e.v });
        cue({ type: 'crash', v: e.v });
        break;
      case 'boom':
        this.buf(K.boom, t, this.bassSC, { v: 0.7 * e.v });
        break;
      case 'reverse': {
        const d = K.reverse.duration, start = e.tEnd - d;
        const off = Math.max(0, t - start);
        this.buf(K.reverse, t, this.drums, { v: 0.3 * e.v, offset: off });
        break;
      }
      case 'hey':
        this.buf(K.hey, t, this.synthSC, { v: 0.55 * e.v });
        this.buf(K.hey, t, this.roomIn, { v: 0.3 * e.v });
        cue({ type: 'hey' });
        break;
      case 'cheer':
        if (this.cheerBuf) this.buf(this.cheerBuf, t, this.bus, { v: 0.32 * e.v });
        break;
      case 'count': cue({ type: 'count', n: e.n }); break;
      case 'cut': cue({ type: 'cut' }); break;
      case 'switch': cue({ type: 'switch' }); break;
      case 'bass': this.bass(e); break;
      case 'lead': this.leadNote(this.lead, e, this.vibA, e.dbl ? this.leadLo : null); cue({ type: 'note', m: e.m, len: e.len }); break;
      case 'leadB': this.leadNote(this.leadB, e, this.vibB, null); cue({ type: 'note', m: e.m + 12, len: e.len, b: true }); break;
      case 'chord':
        this.chords.forEach((vc, j) => {
          vc.f.setValueAtTime(mtof(e.notes[j]), t);
          vc.vca.setTargetAtTime(0.9 * e.v, t, 0.002);
          vc.vca.setTargetAtTime(0, t + e.len * 0.45, e.len * 0.22);
        });
        break;
      case 'pad':
        this.chords.forEach((vc, j) => {
          vc.f.setValueAtTime(mtof(e.notes[j]), t);
          vc.vca.setTargetAtTime(0.8 * e.v, t, 0.03);
          vc.vca.setTargetAtTime(0, t + e.len - 0.06, 0.04);
        });
        break;
      case 'chop': {
        const b = K.chop[e.vw] || K.chop.a;
        const rate = Math.pow(2, (e.m - K.chopBase) / 12);
        const { g } = this.buf(b, t, this.chopBus, { v: 0.9, rate, pan: (Math.random() - 0.5) * 0.5 });
        g.gain.setValueAtTime(0.9, t + e.len * 0.8);
        g.gain.linearRampToValueAtTime(0, t + e.len);
        cue({ type: 'chop', vw: e.vw });
        break;
      }
      case 'riser': this.riser(t, e.dur); break;
      case 'sweep':
        this.leadLP.frequency.setValueAtTime(e.from, t);
        this.leadLP.frequency.exponentialRampToValueAtTime(e.to, t + e.dur);
        break;
    }
  }

  mode(m, t) {
    const lp = this.leadLP.frequency, cp = this.chordPre.gain, clp = this.chordLP.frequency, w = this.wet.gain;
    if (m === 'A') { lp.setTargetAtTime(5200, t, 0.05); cp.setTargetAtTime(1.4, t, 0.02); clp.setTargetAtTime(3000, t, 0.05); w.setTargetAtTime(0.07, t, 0.2); }
    if (m === 'B') { cp.setTargetAtTime(4.2, t, 0.01); clp.setTargetAtTime(2100, t, 0.02); w.setTargetAtTime(0.05, t, 0.1); }
    if (m === 'BREAK') { lp.setTargetAtTime(1700, t, 0.2); cp.setTargetAtTime(0.9, t, 0.1); clp.setTargetAtTime(1400, t, 0.2); w.setTargetAtTime(0.42, t, 0.3); }
  }

  bass(e) {
    const ac = this.ac, t = e.t;
    if (this.lastBass && this.lastBass.end > t - 0.001) this.lastBass.g.gain.setTargetAtTime(0, t - 0.004, 0.003);
    const o = ac.createOscillator(); o.type = 'sine';
    const f = mtof(e.m);
    o.frequency.setValueAtTime(f * 1.35, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
    if (e.glide != null) {
      o.frequency.setValueAtTime(f, t + e.len * 0.5);
      o.frequency.exponentialRampToValueAtTime(mtof(e.glide), t + e.len * 0.88);
    }
    const g = ac.createGain();
    const end = t + e.len;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(e.v, t + 0.004);
    g.gain.setTargetAtTime(e.v * 0.72, t + 0.06, 0.45);
    g.gain.setTargetAtTime(0, end - 0.012, 0.018);
    o.connect(g).connect(this.bassIn);
    o.start(t); o.stop(end + 0.2);
    this.lastBass = { g, end };
    this.cues.push({ t, type: 'bass', m: e.m });
  }

  leadNote(vc, e, vib, dbl) {
    const t = e.t, f = mtof(e.m), end = t + e.len;
    const legato = Math.abs(vc.lastEnd - t) < 0.002;
    const voices = dbl ? [[vc, 1], [dbl, 0.5]] : [[vc, 1]];
    for (const [v, k] of voices) {
      const ff = k === 1 ? f : f / 2;
      if (e.slide != null) { v.f.setValueAtTime(mtof(e.slide) * (k === 1 ? 1 : 0.5), t); v.f.setTargetAtTime(ff, t + 0.01, 0.045); }
      else if (legato) v.f.setTargetAtTime(ff, t, 0.014);
      else v.f.setValueAtTime(ff, t);
      if (e.dive) { v.f.setValueAtTime(ff, t + e.len * 0.45); v.f.exponentialRampToValueAtTime(ff * Math.pow(2, e.dive / 12), end); }
      v.vca.setTargetAtTime(e.v * k, t, 0.003);
      v.vca.setTargetAtTime(0.72 * e.v * k, t + 0.035, 0.12);
      v.vca.setTargetAtTime(0, end - 0.016, 0.02);
      v.lastEnd = end;
    }
    vib.gain.setValueAtTime(0, t);
    if (e.vib) vib.gain.linearRampToValueAtTime(e.vib, t + e.len * 0.6);
  }

  riser(t, dur) {
    const ac = this.ac;
    const src = ac.createBufferSource(); src.buffer = this.audio.noise('white'); src.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.4;
    bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(9000, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + dur);
    g.gain.setValueAtTime(0.2, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.02);
    src.connect(bp).connect(g).connect(this.bus);
    const o = ac.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(1500, t + dur);
    const og = ac.createGain();
    og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.035, t + dur);
    og.gain.setValueAtTime(0.035, t + dur); og.gain.linearRampToValueAtTime(0, t + dur + 0.02);
    const olp = ac.createBiquadFilter(); olp.type = 'lowpass'; olp.frequency.value = 3000;
    o.connect(olp).connect(og).connect(this.synthSC);
    src.start(t); src.stop(t + dur + 0.05);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // ── live controls ──────────────────────────────────────────────
  setP(key, param, v, tc, eps) {
    if (this.lastP[key] != null && Math.abs(this.lastP[key] - v) < eps) return;
    this.lastP[key] = v;
    param.setTargetAtTime(v, this.ac.currentTime, tc);
  }

  // p: 0 = far end of the platform, ~0.95 = at the curtain, 1 = inside.
  setPlace(p, snap = false) {
    this.place = p;
    const inside = p >= 0.999;
    const f = inside ? 20000 : 150 * Math.pow(16, Math.min(1, p / 0.97));
    const tc = snap ? 0.03 : 0.12;
    this.setP('lpf', this.lpf.frequency, f, tc, f * 0.01);
    this.setP('place', this.place_g.gain, inside ? 1 : 0.5 + 0.38 * p, tc, 0.005);
    this.setP('send', this.sendTap.gain, inside ? 0.12 : 0.55 - 0.25 * p, tc, 0.005);
    this.setP('hum', this.humG.gain, inside ? 0 : p < 0.35 ? 0.012 : 0.004 * (1 - p), 0.2, 0.0005);
    this.setP('crowd', this.crowdBed.gain, inside ? 0.035 : 0.02, 0.2, 0.002);
  }

  setCharge(c) {
    const cc = c * c;
    this.setP('hpf', this.hpf.frequency, 25 + cc * 950, 0.05, 4);
    this.setP('satPre', this.satPre.gain, 0.5 + c * 1.4, 0.05, 0.02);
    this.setP('satPost', this.satPost.gain, 1 / (1 + c * 0.9), 0.05, 0.01);
    this.setP('cg', this.chargeG.gain, c > 0.02 ? 0.03 + c * 0.11 : 0, 0.04, 0.003);
    this.setP('cbp', this.chargeBP.frequency, 400 + cc * 7000, 0.05, 20);
    this.setP('cog', this.chargeOscG.gain, c > 0.02 ? c * 0.025 : 0, 0.04, 0.001);
    this.setP('cof', this.chargeOsc.frequency, 110 * Math.pow(2, c * 3), 0.05, 1);
  }

  // Let go: the floor comes back. power 0..1
  release(power) {
    const ac = this.ac, t = ac.currentTime + 0.005, K = this.kit;
    this.lastP.hpf = null;
    this.hpf.frequency.cancelScheduledValues(t);
    this.hpf.frequency.setValueAtTime(this.hpf.frequency.value, t);
    this.hpf.frequency.setTargetAtTime(25, t, 0.012);
    this.setCharge(0);
    if (power < 0.25) return;
    this.buf(K.kick, t, this.drums, { v: 0.9 });
    this.buf(K.boom, t, this.bassSC, { v: 0.6 * power });
    this.buf(K.crash, t, this.drums, { v: 0.22 * power });
    if (power > 0.6 && this.cheerBuf) this.buf(this.cheerBuf, t, this.bus, { v: 0.2 * power });
    this.duck(t, 0.2);
  }

  // The earned moment: cut everything for one beat, then slam back.
  perfect(back) {
    const ac = this.ac, now = ac.currentTime, K = this.kit;
    const g = this.gate.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + 0.012);
    g.setValueAtTime(0, back - 0.004);
    g.linearRampToValueAtTime(1, back);
    // ears ringing in the gap
    const o = ac.createOscillator(); o.frequency.value = 3150;
    const og = ac.createGain();
    og.gain.setValueAtTime(0, now); og.gain.linearRampToValueAtTime(0.006, now + 0.06);
    og.gain.linearRampToValueAtTime(0, back);
    o.connect(og).connect(this.sfx); o.start(now); o.stop(back + 0.05);
    this.buf(K.kick, back, this.drums, { v: 1 });
    this.buf(K.boom, back, this.bassSC, { v: 1 });
    this.buf(K.crash, back, this.drums, { v: 0.32 });
    this.buf(K.hey, back, this.synthSC, { v: 0.5 });
    if (this.cheerBuf) { this.buf(this.cheerBuf, back, this.bus, { v: 0.5 }); this.buf(this.cheerBuf, back + 1.2, this.bus, { v: 0.35, rate: 1.05 }); }
    this.duck(back, 0.15);
  }

  // ── sfx ────────────────────────────────────────────────────────
  shutter() {
    const ac = this.ac, t = ac.currentTime + 0.002;
    this.buf(this.kit.shutter, t, this.sfx, { v: 0.6 });
    const o = ac.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(1600, t + 0.09); o.frequency.exponentialRampToValueAtTime(7400, t + 0.6);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t + 0.09); g.gain.linearRampToValueAtTime(0.007, t + 0.15); g.gain.linearRampToValueAtTime(0, t + 0.62);
    o.connect(g).connect(this.sfx); o.start(t + 0.09); o.stop(t + 0.65);
  }
  slap(v = 1) { this.buf(this.kit.slap, this.ac.currentTime + 0.002, this.sfx, { v: 0.45 * v, rate: 0.9 + Math.random() * 0.25 }); }
  drip() { const t = this.ac.currentTime + 0.01; this.buf(this.kit.drip, t, this.amb, { v: 0.05, rate: 0.8 + Math.random() * 0.5, pan: Math.random() - 0.5 }); this.buf(this.kit.drip, t, this.sfxSend, { v: 0.12 }); }
  bump() { this.buf(this.kit.slap, this.ac.currentTime + 0.002, this.sfx, { v: 0.25, rate: 0.55 }); }
  curtain() {
    const ac = this.ac, t = ac.currentTime;
    const src = ac.createBufferSource(); src.buffer = this.audio.noise('pink');
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.8;
    const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    src.connect(bp).connect(g).connect(this.sfx); src.start(t); src.stop(t + 0.55);
  }

  destroy() {
    for (const s of this.sources) { try { s.stop(); } catch (e) {} }
    this.queue.length = 0;
    try { this.trim.disconnect(); this.sfx.disconnect(); this.amb.disconnect(); this.sendTap.disconnect(); this.sfxSend.disconnect(); } catch (e) {}
  }
}
