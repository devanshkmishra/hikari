// 地下 — the drum kit and one-shots, synthesized sample-by-sample at mount.
// Nothing here is a recording: kicks are swept sines, claps are noise bursts,
// hats are six detuned squares (the 808 trick), vocal chops are formant filters.

import { rng } from './util.js';

const TAU = Math.PI * 2;

// RBJ biquad coefficients.
function coefs(type, f, q, sr) {
  const w0 = (TAU * Math.min(f, sr * 0.45)) / sr;
  const cs = Math.cos(w0), sn = Math.sin(w0);
  const al = sn / (2 * q);
  let b0, b1, b2;
  const a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al;
  if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = (1 - cs) / 2; }
  else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = (1 + cs) / 2; }
  else { b0 = al; b1 = 0; b2 = -al; } // band-pass, 0 dB peak
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}

class BQ {
  constructor(type, f, q, sr) { this.c = coefs(type, f, q, sr); this.x1 = this.x2 = this.y1 = this.y2 = 0; this.type = type; this.sr = sr; this.q = q; }
  set(f) { this.c = coefs(this.type, f, this.q, this.sr); }
  run(x) {
    const c = this.c;
    const y = c[0] * x + c[1] * this.x1 + c[2] * this.x2 - c[3] * this.y1 - c[4] * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

function normalize(buf, peak = 0.9) {
  let m = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]));
  }
  if (m > 0) {
    const k = peak / m;
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] *= k;
    }
  }
  return buf;
}

function fadeEdges(buf, inMs = 0.5, outMs = 8) {
  const sr = buf.sampleRate;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    const ni = Math.floor((inMs / 1000) * sr), no = Math.floor((outMs / 1000) * sr);
    for (let i = 0; i < ni && i < d.length; i++) d[i] *= i / ni;
    for (let i = 0; i < no && i < d.length; i++) d[d.length - 1 - i] *= i / no;
  }
  return buf;
}

// Vowel formants (Hz, relative gain, bandwidth Hz).
export const VOWELS = {
  a: [[800, 1, 80], [1150, 0.5, 90], [2900, 0.25, 120], [3900, 0.1, 130]],
  e: [[400, 1, 60], [1700, 0.4, 80], [2600, 0.3, 120], [3300, 0.1, 140]],
  i: [[290, 1, 50], [2250, 0.35, 90], [3000, 0.3, 120], [3500, 0.12, 150]],
  o: [[450, 1, 70], [800, 0.5, 80], [2830, 0.12, 100], [3500, 0.06, 130]],
  u: [[325, 1, 50], [700, 0.25, 60], [2530, 0.08, 170], [3500, 0.04, 180]],
};

export function buildKit(ac) {
  const sr = ac.sampleRate;
  const R = rng(9060);
  const nz = () => R() * 2 - 1;
  const mk = (sec, ch = 1) => ac.createBuffer(ch, Math.max(1, Math.ceil(sec * sr)), sr);
  const kit = {};

  // KICK — short, punchy, tuned near G#1 so it sits with the 808 instead of fighting it.
  {
    const b = mk(0.36), d = b.getChannelData(0);
    const hp = new BQ('hp', 2500, 0.7, sr);
    let ph = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      const f = 52 + 230 * Math.exp(-t * 42) + 38 * Math.exp(-t * 9);
      ph += (TAU * f) / sr;
      const a = Math.min(1, t / 0.0012) * (t < 0.035 ? 1 : Math.exp(-(t - 0.035) * 13));
      let s = Math.sin(ph) * a;
      s += hp.run(nz()) * Math.exp(-t * 420) * 0.5; // beater click
      s += Math.sin(TAU * 3600 * t) * Math.exp(-t * 500) * 0.18;
      d[i] = Math.tanh(s * 2.4);
    }
    kit.kick = normalize(fadeEdges(b), 0.95);
  }

  // CLAP — four snappy bursts and a short room tail, stereo-decorrelated.
  {
    const b = mk(0.42, 2);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      const bp = new BQ('bp', 1250, 0.85, sr), hp = new BQ('hp', 2200, 0.7, sr);
      const off = c * 0.0013;
      const bursts = [0, 0.0095 + off, 0.0195, 0.031 + off];
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        let e = 0;
        for (const tb of bursts) if (t >= tb) e = Math.max(e, Math.exp(-(t - tb) * 210));
        const tail = t >= 0.031 ? Math.exp(-(t - 0.031) * 17) * 0.7 : 0;
        const x = nz() * Math.max(e, tail);
        let y = bp.run(x) * 2.2 + hp.run(x) * 0.35;
        y += Math.sin(TAU * 205 * t) * Math.exp(-t * 48) * 0.3;
        d[i] = Math.tanh(y * 1.5);
      }
    }
    kit.clap = normalize(fadeEdges(b), 0.9);
  }

  // SNARE — for rolls.
  {
    const b = mk(0.26, 2);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      const hp = new BQ('hp', 1700, 0.7, sr);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const tone = (Math.sin(TAU * 188 * t) * 0.6 + Math.sin(TAU * 332 * t) * 0.3) * Math.exp(-t * 30);
        const n = hp.run(nz()) * Math.exp(-t * 21) * 0.9;
        d[i] = Math.tanh((tone + n) * 1.6);
      }
    }
    kit.snare = normalize(fadeEdges(b), 0.85);
  }

  // HATS — six square waves (808 ratios) through a 10 kHz band, plus air.
  const metal = (sec, decay, ch, bright = 1) => {
    const b = mk(sec, ch);
    const fr = [205.3, 304.4, 369.6, 522.7, 540, 800].map((f) => f * 1.55 * bright);
    for (let c = 0; c < ch; c++) {
      const d = b.getChannelData(c);
      const bp = new BQ('bp', 10500, 1.1, sr), hp = new BQ('hp', 7200, 0.7, sr), hp2 = new BQ('hp', 9000, 0.7, sr);
      const phs = fr.map(() => R());
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        let m = 0;
        for (let k = 0; k < 6; k++) m += Math.sin(TAU * (fr[k] * t + phs[k])) > 0 ? 1 : -1;
        m /= 6;
        let y = hp.run(bp.run(m)) * 2.4 + hp2.run(nz()) * 0.45;
        const a = Math.min(1, t / 0.0008) * Math.exp(-t * decay);
        d[i] = y * a;
      }
    }
    return normalize(fadeEdges(b), 0.8);
  };
  kit.hat = metal(0.09, 62, 2);
  kit.hatOpen = metal(0.5, 8.5, 2);

  // CRASH — wide, long, for section hits.
  {
    const b = mk(2.6, 2);
    const fr = [205.3, 304.4, 369.6, 522.7, 540, 800].map((f) => f * 3.1);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      const bp = new BQ('bp', 6200, 0.55, sr), hp = new BQ('hp', 3800, 0.7, sr);
      const phs = fr.map(() => R());
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        let m = 0;
        for (let k = 0; k < 6; k++) m += Math.sin(TAU * (fr[k] * t * (1 + 0.002 * c) + phs[k])) > 0 ? 1 : -1;
        const x = (m / 6) * 0.6 + nz() * 0.8;
        const a = Math.min(1, t / 0.002) * Math.exp(-t * 1.7);
        d[i] = hp.run(bp.run(x)) * a * 2;
      }
    }
    kit.crash = normalize(fadeEdges(b, 0.3, 120), 0.8);
    // Reversed: the suck-in before a drop.
    const rb = mk(1.7, 2);
    for (let c = 0; c < 2; c++) {
      const s = kit.crash.getChannelData(c), d = rb.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] = s[d.length - 1 - i] * Math.pow(i / d.length, 1.4);
    }
    kit.reverse = normalize(fadeEdges(rb, 30, 4), 0.8);
  }

  // BOOM — sub drop for the big moments.
  {
    const b = mk(2.0), d = b.getChannelData(0);
    let ph = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      const f = 31 + 52 * Math.exp(-t * 2.6);
      ph += (TAU * f) / sr;
      const a = Math.min(1, t / 0.003) * Math.exp(-t * 1.5);
      d[i] = Math.tanh(Math.sin(ph) * a * 1.9) + nz() * Math.exp(-t * 60) * 0.15;
    }
    kit.boom = normalize(fadeEdges(b, 0.5, 200), 0.95);
  }

  // Formant voice renderer: a buzzy glottal saw + breath through vowel bands.
  const voice = (sec, { f0 = 233, f1 = null, vowel = 'a', vowel2 = null, breath = 0.12, att = 0.006, rel = 0.08, vib = 0.005, ch = 1, pan = 0 }) => {
    const b = mk(sec, ch);
    const V1 = VOWELS[vowel], V2 = VOWELS[vowel2 || vowel];
    const tmp = new Float32Array(b.length);
    const bands = V1.map(([f, , bw]) => new BQ('bp', f, f / bw, sr));
    let ph = 0;
    for (let i = 0; i < tmp.length; i++) {
      const t = i / sr, u = t / sec;
      if ((i & 63) === 0) {
        for (let k = 0; k < bands.length; k++) {
          const f = V1[k][0] + (V2[k][0] - V1[k][0]) * Math.min(1, u * 1.8);
          bands[k].q = f / V1[k][2];
          bands[k].set(f);
        }
      }
      const f = (f1 ? f0 + (f1 - f0) * u : f0) * (1 + Math.sin(TAU * 5.6 * t) * vib + (R() - 0.5) * 0.004);
      ph += f / sr;
      ph -= Math.floor(ph);
      const src = (ph * 2 - 1) * 0.9 + nz() * breath;
      let y = 0;
      for (let k = 0; k < bands.length; k++) y += bands[k].run(src) * (V1[k][1] + (V2[k][1] - V1[k][1]) * Math.min(1, u * 1.8));
      const env = Math.min(1, t / att) * Math.min(1, (sec - t) / rel);
      tmp[i] = y * env;
    }
    for (let c = 0; c < ch; c++) {
      const d = b.getChannelData(c);
      const g = ch === 2 ? (c === 0 ? 1 - Math.max(0, pan) : 1 + Math.min(0, pan)) : 1;
      for (let i = 0; i < d.length; i++) d[i] = tmp[i] * g;
    }
    return b;
  };

  // Chops: sustained vowels at A#3, pitched by playbackRate (the formants ride with it,
  // like a sped-up sample — the chipmunked-chop sound).
  kit.chop = {};
  for (const v of Object.keys(VOWELS)) kit.chop[v] = normalize(fadeEdges(voice(0.42, { vowel: v, f0: 233 })), 0.85);
  kit.chopBase = 58; // MIDI of A#3

  // HEY — a little crowd shout: six voices, e → i glide, falling pitch, spread wide.
  {
    const b = mk(0.5, 2);
    const L = b.getChannelData(0), Rr = b.getChannelData(1);
    for (let v = 0; v < 6; v++) {
      const f0 = 150 + R() * 140;
      const vb = voice(0.38, { f0, f1: f0 * 0.82, vowel: 'e', vowel2: 'i', breath: 0.35, att: 0.012, rel: 0.12 });
      const s = vb.getChannelData(0);
      const off = Math.floor(R() * 0.03 * sr);
      const p = (v / 5) * 2 - 1;
      for (let i = 0; i < s.length && i + off < L.length; i++) {
        L[i + off] += s[i] * (1 - p * 0.6);
        Rr[i + off] += s[i] * (1 + p * 0.6);
      }
    }
    kit.hey = normalize(fadeEdges(b), 0.8);
  }

  // SHUTTER — two-stage "ka-chik" of a cheap compact.
  {
    const b = mk(0.14), d = b.getChannelData(0);
    const bp = new BQ('bp', 2600, 1.2, sr);
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      let e = Math.exp(-t * 320) + (t > 0.052 ? Math.exp(-(t - 0.052) * 260) * 0.8 : 0);
      const thunk = Math.sin(TAU * 140 * t) * Math.exp(-t * 70) * 0.35;
      d[i] = Math.tanh(bp.run(nz()) * e * 3 + thunk);
    }
    kit.shutter = normalize(fadeEdges(b), 0.7);
  }

  // SLAP — tape and paper hitting a wall.
  {
    const b = mk(0.12), d = b.getChannelData(0);
    const lp = new BQ('lp', 1700, 0.8, sr);
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      d[i] = lp.run(nz()) * Math.exp(-t * 55) * 1.5 + Math.sin(TAU * 95 * t) * Math.exp(-t * 45) * 0.5;
    }
    kit.slap = normalize(fadeEdges(b), 0.7);
  }

  // DRIP — a plip in the tunnel.
  {
    const b = mk(0.09), d = b.getChannelData(0);
    let ph = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      ph += (TAU * (1300 + 1500 * (t / 0.09))) / sr;
      d[i] = Math.sin(ph) * Math.min(1, t / 0.002) * Math.exp(-t * 55);
    }
    kit.drip = normalize(fadeEdges(b), 0.5);
  }

  return kit;
}

// Crowd cheer is heavier to render, so it is built separately (a beat later).
export function buildCheer(ac) {
  const sr = ac.sampleRate;
  const R = rng(4242);
  const sec = 3.2;
  const b = ac.createBuffer(2, Math.ceil(sec * sr), sr);
  const L = b.getChannelData(0), Rr = b.getChannelData(1);
  const vs = ['o', 'a', 'u', 'o', 'a', 'e', 'o', 'a'];
  for (let v = 0; v < vs.length; v++) {
    const V = VOWELS[vs[v]];
    const bands = V.map(([f, , bw]) => new BQ('bp', f * (0.9 + R() * 0.25), f / bw, sr));
    const f0 = 190 + R() * 260, rise = 0.15 + R() * 0.25;
    const start = R() * 0.25, end = sec - R() * 0.6;
    const p = R() * 2 - 1;
    let ph = 0;
    for (let i = Math.floor(start * sr); i < Math.floor(end * sr); i++) {
      const t = i / sr - start, life = end - start;
      const f = f0 * (1 + rise * Math.sin(Math.min(1, t / life) * Math.PI)) * (1 + Math.sin(TAU * 5 * t) * 0.01);
      ph += f / sr; ph -= Math.floor(ph);
      const src = (ph * 2 - 1) * 0.5 + (R() * 2 - 1) * 0.7;
      let y = 0;
      for (let k = 0; k < bands.length; k++) y += bands[k].run(src) * V[k][1];
      const env = Math.min(1, t / 0.25) * Math.min(1, (life - t) / 0.9);
      L[i] += y * env * (1 - p * 0.7);
      Rr[i] += y * env * (1 + p * 0.7);
    }
  }
  return normalize(fadeEdges(b, 5, 300), 0.75);
}
