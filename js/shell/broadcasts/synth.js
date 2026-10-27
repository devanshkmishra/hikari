// Little 1980s instrument rack for the broadcasts. Everything is Web Audio, scheduled at `t`.
// A = the shared AudioEngine (for its cached noise), out = destination node.
import { mtof } from '../../lib/audio.js';

const noiseAt = (A, t, dur, kind = 'white') => {
  const s = A.ac.createBufferSource();
  s.buffer = A.noise(kind);
  s.start(t, Math.random() * 1.4, dur + 0.05);
  return s;
};
const filt = (ac, type, f, q = 0.7) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };

// DX-style FM electric piano: ratio-1 modulator for the body, ratio-14 for the tine.
export function epiano(A, out, t, midi, dur = 0.4, v = 0.5) {
  const ac = A.ac, f = mtof(midi);
  const car = ac.createOscillator(); car.frequency.value = f;
  const mod = ac.createOscillator(); mod.frequency.value = f;
  const mg = ac.createGain();
  mg.gain.setValueAtTime(f * (1.1 + 1.5 * v), t);
  mg.gain.setTargetAtTime(f * 0.16, t, 0.22);
  mod.connect(mg).connect(car.frequency);
  const tine = ac.createOscillator(); tine.frequency.value = Math.min(f * 14, 15000);
  const tg = ac.createGain();
  tg.gain.setValueAtTime(f * 0.9 * v, t);
  tg.gain.setTargetAtTime(0, t, 0.016);
  tine.connect(tg).connect(car.frequency);
  const a = ac.createGain();
  a.gain.setValueAtTime(0, t);
  a.gain.linearRampToValueAtTime(0.2 * v, t + 0.004);
  a.gain.setTargetAtTime(0.075 * v, t + 0.004, 0.45);
  a.gain.setTargetAtTime(0, t + dur, 0.07);
  car.connect(a).connect(out);
  const end = t + dur + 0.45;
  for (const o of [car, mod, tine]) { o.start(t); o.stop(end); }
}

// FM bell / celesta / glockenspiel.
export function bell(A, out, t, midi, v = 0.4, decay = 1.2, ratio = 3.5) {
  const ac = A.ac, f = mtof(midi);
  const car = ac.createOscillator(); car.frequency.value = f;
  const mod = ac.createOscillator(); mod.frequency.value = Math.min(f * ratio, 16000);
  const mg = ac.createGain();
  mg.gain.setValueAtTime(f * 2.2 * v, t);
  mg.gain.setTargetAtTime(f * 0.1, t, decay * 0.25);
  mod.connect(mg).connect(car.frequency);
  const a = ac.createGain();
  a.gain.setValueAtTime(0, t);
  a.gain.linearRampToValueAtTime(0.16 * v, t + 0.002);
  a.gain.setTargetAtTime(0, t + 0.002, decay / 3.2);
  car.connect(a).connect(out);
  const end = t + decay * 1.6;
  car.start(t); mod.start(t); car.stop(end); mod.stop(end);
}

// A sweet, slightly vocal lead: pulse + triangle, a little scoop into each note, delayed vibrato.
export function lead(A, out, t, midi, dur, v = 0.5) {
  const ac = A.ac, f = mtof(midi);
  const o1 = ac.createOscillator(); o1.type = 'square';
  const o2 = ac.createOscillator(); o2.type = 'triangle'; o2.detune.value = 5;
  for (const o of [o1, o2]) {
    o.frequency.setValueAtTime(f * 0.982, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.055);
  }
  const lfo = ac.createOscillator(); lfo.frequency.value = 5.6;
  const lg = ac.createGain();
  lg.gain.setValueAtTime(0, t);
  lg.gain.setValueAtTime(0, t + 0.16);
  lg.gain.linearRampToValueAtTime(f * 0.0075, t + 0.42);
  lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
  const m1 = ac.createGain(); m1.gain.value = 0.28;
  const m2 = ac.createGain(); m2.gain.value = 0.72;
  const lp = filt(ac, 'lowpass', 2800, 0.6);
  const a = ac.createGain();
  a.gain.setValueAtTime(0, t);
  a.gain.linearRampToValueAtTime(0.2 * v, t + 0.025);
  a.gain.setTargetAtTime(0.16 * v, t + 0.025, 0.2);
  a.gain.setTargetAtTime(0, t + dur, 0.06);
  o1.connect(m1).connect(lp); o2.connect(m2).connect(lp);
  lp.connect(a).connect(out);
  const end = t + dur + 0.35;
  for (const o of [o1, o2, lfo]) { o.start(t); o.stop(end); }
}

// Synth bass: saw + sine sub through a plucky resonant lowpass.
export function bass(A, out, t, midi, dur, v = 0.6) {
  const ac = A.ac, f = mtof(midi);
  const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
  const s = ac.createOscillator(); s.frequency.value = f;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 5;
  lp.frequency.setValueAtTime(Math.min(f * 12, 5000), t);
  lp.frequency.setTargetAtTime(f * 2.4, t, 0.07);
  const sg = ac.createGain(); sg.gain.value = 0.8;
  const a = ac.createGain();
  a.gain.setValueAtTime(0, t);
  a.gain.linearRampToValueAtTime(0.26 * v, t + 0.004);
  a.gain.setTargetAtTime(0.17 * v, t + 0.004, 0.15);
  a.gain.setTargetAtTime(0, t + dur, 0.025);
  o.connect(lp).connect(a); s.connect(sg).connect(a); a.connect(out);
  const end = t + dur + 0.2;
  o.start(t); s.start(t); o.stop(end); s.stop(end);
}

export function kick(A, out, t, v = 1) {
  const ac = A.ac;
  const o = ac.createOscillator();
  o.frequency.setValueAtTime(165, t);
  o.frequency.exponentialRampToValueAtTime(46, t + 0.11);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.85 * v, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
  o.connect(g).connect(out);
  o.start(t); o.stop(t + 0.4);
  const n = noiseAt(A, t, 0.012);
  const hp = filt(A.ac, 'highpass', 2200);
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.18 * v, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
  n.connect(hp).connect(ng).connect(out);
}

/** Gated-reverb bus for the snare: the most 1980s sound there is. */
export function makeGate(A, out, amount = 0.8) {
  const ac = A.ac;
  const conv = ac.createConvolver();
  conv.buffer = A.impulse(0.7, 0.35);
  const g = ac.createGain(); g.gain.value = 0;
  const inp = ac.createGain();
  const lvl = ac.createGain(); lvl.gain.value = amount;
  inp.connect(conv).connect(g).connect(lvl).connect(out);
  return { in: inp, g };
}

export function snare(A, out, t, v = 1, gate = null) {
  const ac = A.ac;
  const n = noiseAt(A, t, 0.25);
  const bp = filt(ac, 'bandpass', 1900, 0.6);
  const hp = filt(ac, 'highpass', 600);
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.linearRampToValueAtTime(0.42 * v, t + 0.002);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
  n.connect(bp).connect(hp).connect(ng).connect(out);
  const o = ac.createOscillator(); o.type = 'triangle';
  o.frequency.setValueAtTime(200, t);
  o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
  const og = ac.createGain();
  og.gain.setValueAtTime(0.3 * v, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  o.connect(og).connect(out);
  o.start(t); o.stop(t + 0.12);
  if (gate) {
    ng.connect(gate.in);
    gate.g.gain.cancelScheduledValues(t);
    gate.g.gain.setValueAtTime(v, t);
    gate.g.gain.setValueAtTime(v, t + 0.2);
    gate.g.gain.linearRampToValueAtTime(0, t + 0.23);
  }
}

export function hat(A, out, t, v = 0.4, open = false) {
  const ac = A.ac;
  const d = open ? 0.24 : 0.045;
  const n = noiseAt(A, t, d + 0.02);
  const hp = filt(ac, 'highpass', 7200);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.22 * v, t + 0.001);
  g.gain.exponentialRampToValueAtTime(0.001, t + d);
  n.connect(hp).connect(g).connect(out);
}

export function clap(A, out, t, v = 0.6) {
  const ac = A.ac;
  const n = noiseAt(A, t, 0.2);
  const bp = filt(ac, 'bandpass', 1300, 1.2);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  for (let i = 0; i < 3; i++) {
    g.gain.setValueAtTime(0.4 * v, t + i * 0.011);
    g.gain.exponentialRampToValueAtTime(0.03, t + i * 0.011 + 0.009);
  }
  g.gain.setValueAtTime(0.32 * v, t + 0.034);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  n.connect(bp).connect(g).connect(out);
}

export function crash(A, out, t, v = 0.5, len = 1.6) {
  const ac = A.ac;
  const n = noiseAt(A, t, len);
  const hp = filt(ac, 'highpass', 4200);
  const pk = filt(ac, 'peaking', 7800, 1.5); pk.gain.value = 6;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.3 * v, t + 0.003);
  g.gain.setTargetAtTime(0, t + 0.003, len / 4);
  n.connect(hp).connect(pk).connect(g).connect(out);
}

// Detuned-saw brass stab with a filter "blat".
export function brass(A, out, t, midis, dur = 0.3, v = 0.5) {
  const ac = A.ac;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.2;
  lp.frequency.setValueAtTime(500, t);
  lp.frequency.linearRampToValueAtTime(3600, t + 0.05);
  lp.frequency.setTargetAtTime(1500, t + 0.05, 0.15);
  const a = ac.createGain();
  a.gain.setValueAtTime(0, t);
  a.gain.linearRampToValueAtTime(0.16 * v, t + 0.03);
  a.gain.setTargetAtTime(0.12 * v, t + 0.03, 0.1);
  a.gain.setTargetAtTime(0, t + dur, 0.06);
  lp.connect(a).connect(out);
  const end = t + dur + 0.4;
  for (const m of midis) {
    for (const dt of [-8, 8]) {
      const o = ac.createOscillator(); o.type = 'sawtooth';
      o.frequency.value = mtof(m); o.detune.value = dt;
      const og = ac.createGain(); og.gain.value = 1 / midis.length;
      o.connect(og).connect(lp);
      o.start(t); o.stop(end);
    }
  }
}

// Soft analogue pad.
export function pad(A, out, t, midis, dur, v = 0.3, cutoff = 1400, atk = 0.5) {
  const ac = A.ac;
  const lp = filt(ac, 'lowpass', cutoff, 0.5);
  const a = ac.createGain();
  a.gain.setValueAtTime(0, t);
  a.gain.linearRampToValueAtTime(0.1 * v, t + atk);
  a.gain.setTargetAtTime(0, t + dur, atk * 0.8);
  lp.connect(a).connect(out);
  const end = t + dur + atk * 4;
  for (const m of midis) {
    for (const dt of [-7, 6]) {
      const o = ac.createOscillator(); o.type = 'sawtooth';
      o.frequency.value = mtof(m); o.detune.value = dt;
      const og = ac.createGain(); og.gain.value = 1 / midis.length;
      o.connect(og).connect(lp);
      o.start(t); o.stop(end);
    }
  }
}

// Breathy sine flute for the weather.
export function flute(A, out, t, midi, dur, v = 0.4) {
  const ac = A.ac, f = mtof(midi);
  const o = ac.createOscillator(); o.frequency.value = f;
  const lfo = ac.createOscillator(); lfo.frequency.value = 5;
  const lg = ac.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.006, t + 0.4);
  lfo.connect(lg).connect(o.frequency);
  const a = ac.createGain();
  a.gain.setValueAtTime(0, t);
  a.gain.linearRampToValueAtTime(0.12 * v, t + 0.06);
  a.gain.setTargetAtTime(0, t + dur, 0.08);
  o.connect(a).connect(out);
  const n = noiseAt(A, t, dur + 0.3);
  const bp = filt(ac, 'bandpass', f * 2, 3);
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0, t);
  ng.gain.linearRampToValueAtTime(0.05 * v, t + 0.04);
  ng.gain.setTargetAtTime(0.012 * v, t + 0.04, 0.1);
  ng.gain.setTargetAtTime(0, t + dur, 0.06);
  n.connect(bp).connect(ng).connect(out);
  const end = t + dur + 0.5;
  o.start(t); lfo.start(t); o.stop(end); lfo.stop(end);
}

export function taiko(A, out, t, v = 1) {
  const ac = A.ac;
  const o = ac.createOscillator();
  o.frequency.setValueAtTime(110, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.35);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.9 * v, t + 0.005);
  g.gain.setTargetAtTime(0, t + 0.005, 0.32);
  o.connect(g).connect(out);
  o.start(t); o.stop(t + 1.8);
  const n = noiseAt(A, t, 0.4, 'brown');
  const lp = filt(ac, 'lowpass', 500);
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.9 * v, t);
  ng.gain.setTargetAtTime(0, t, 0.08);
  n.connect(lp).connect(ng).connect(out);
}

export function thunder(A, out, t, v = 0.6, len = 2.5) {
  const ac = A.ac;
  const n = noiseAt(A, t, len, 'brown');
  const lp = filt(ac, 'lowpass', 260, 0.8);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.9 * v, t + 0.05);
  g.gain.setTargetAtTime(0.5 * v, t + 0.05, 0.2);
  g.gain.setTargetAtTime(0, t + 0.4, len / 4);
  n.connect(lp).connect(g).connect(out);
}

/** Noise sweep: spray hiss, whoosh, mist. */
export function whoosh(A, out, t, dur = 0.4, v = 0.5, f0 = 800, f1 = 5000, q = 0.8, type = 'bandpass') {
  const ac = A.ac;
  const n = noiseAt(A, t, dur + 0.1);
  const bp = ac.createBiquadFilter(); bp.type = type; bp.Q.value = q;
  bp.frequency.setValueAtTime(f0, t);
  bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.35 * v, t + Math.min(0.04, dur * 0.3));
  g.gain.setTargetAtTime(0, t + dur * 0.7, dur * 0.15);
  n.connect(bp).connect(g).connect(out);
}

/** The degauss "boWANG": a thump and a decaying, wobbling mains hum. */
export function degauss(A, out, t, v = 0.6) {
  const ac = A.ac;
  kick(A, out, t, 0.5 * v);
  const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 100;
  const lp = filt(ac, 'lowpass', 900, 2);
  const wob = ac.createOscillator(); wob.frequency.value = 7;
  const wg = ac.createGain(); wg.gain.value = 0.5;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.25 * v, t + 0.02);
  g.gain.setTargetAtTime(0, t + 0.02, 0.35);
  wob.connect(wg).connect(g.gain);
  o.connect(lp).connect(g).connect(out);
  o.start(t); wob.start(t); o.stop(t + 1.8); wob.stop(t + 1.8);
}

/** Cartoon spring: the sneaker bounce. */
export function boing(A, out, t, v = 0.5, f = 150) {
  const ac = A.ac;
  const o = ac.createOscillator();
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * 2.4, t + 0.07);
  o.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.4);
  const lfo = ac.createOscillator(); lfo.frequency.value = 17;
  const lg = ac.createGain();
  lg.gain.setValueAtTime(f * 0.35, t);
  lg.gain.setTargetAtTime(0, t, 0.15);
  lfo.connect(lg).connect(o.frequency);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.3 * v, t + 0.01);
  g.gain.setTargetAtTime(0, t + 0.01, 0.13);
  o.connect(g).connect(out);
  o.start(t); lfo.start(t); o.stop(t + 0.8); lfo.stop(t + 0.8);
}

/** Short sine blip (light pen, UI). */
export function blip(A, out, t, f = 2000, dur = 0.06, v = 0.3) {
  const ac = A.ac;
  const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = f;
  const lp = filt(ac, 'lowpass', f * 2.5);
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.08 * v, t + 0.003);
  g.gain.setValueAtTime(0.08 * v, t + dur);
  g.gain.linearRampToValueAtTime(0, t + dur + 0.01);
  o.connect(lp).connect(g).connect(out);
  o.start(t); o.stop(t + dur + 0.05);
}

/** A metallic strike (crossing bell, register "ching"). */
export function strike(A, out, t, f = 740, v = 0.4, decay = 0.35) {
  const ac = A.ac;
  const parts = [[1, 1], [2.76, 0.45], [5.4, 0.22], [8.93, 0.1]];
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.14 * v, t + 0.002);
  g.gain.setTargetAtTime(0, t + 0.002, decay / 3);
  g.connect(out);
  for (const [r, a] of parts) {
    if (f * r > 18000) continue;
    const o = ac.createOscillator(); o.frequency.value = f * r;
    const og = ac.createGain(); og.gain.value = a;
    o.connect(og).connect(g);
    o.start(t); o.stop(t + decay * 1.6);
  }
}

/** Simple feedback delay send. Returns its input node. */
export function makeDelay(A, out, time = 0.35, fb = 0.3, wet = 0.25, tone = 3000) {
  const ac = A.ac;
  const inp = ac.createGain();
  const d = ac.createDelay(2); d.delayTime.value = time;
  const f = ac.createGain(); f.gain.value = fb;
  const lp = filt(ac, 'lowpass', tone);
  const w = ac.createGain(); w.gain.value = wet;
  inp.connect(d); d.connect(lp).connect(f).connect(d);
  lp.connect(w).connect(out);
  return inp;
}

// Pre-rendered split-flap clatter (thousands of tiny clicks would be thousands of nodes).
const CLATTER = new WeakMap();
export function clatterBuffer(A) {
  const ac = A.ac;
  if (CLATTER.has(ac)) return CLATTER.get(ac);
  const sr = ac.sampleRate, len = Math.floor(sr * 3);
  const buf = ac.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    const clicks = 3 * 130;
    for (let k = 0; k < clicks; k++) {
      const at = Math.floor(Math.random() * len);
      const amp = 0.25 + Math.random() * 0.5;
      const ring = 1800 + Math.random() * 2500;
      const n = Math.floor(sr * 0.006);
      for (let i = 0; i < n && at + i < len; i++) {
        const e = Math.exp(-i / (sr * 0.0011));
        d[at + i] += amp * e * (Math.sin((2 * Math.PI * ring * i) / sr) * 0.6 + (Math.random() * 2 - 1) * 0.4);
      }
    }
  }
  CLATTER.set(ac, buf);
  return buf;
}
