// The session band of 1985, synthesized. Every instrument here is a few oscillators and
// envelopes: an FM electric piano (DX7-ish tine + body), finger/slap bass, a LinnDrum-ish kit
// with a gated-reverb snare, Karplus–Strong guitar and harp, string ensemble, FM brass, reed
// and flute leads, an upright-ish piano, glockenspiel, timpani and a musette accordion.

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function makeChorus(ac, input, output, { rate = 0.6, depth = 0.0025, base = 0.014, wet = 0.6, dry = 0.8 } = {}) {
  const d = ac.createGain(); d.gain.value = dry; input.connect(d).connect(output);
  const mk = (pan, phase, r) => {
    const dl = ac.createDelay(0.1); dl.delayTime.value = base + phase * 0.003;
    const lfo = ac.createOscillator(); lfo.frequency.value = r;
    const lg = ac.createGain(); lg.gain.value = depth;
    lfo.connect(lg).connect(dl.delayTime); lfo.start();
    const p = ac.createStereoPanner(); p.pan.value = pan;
    const g = ac.createGain(); g.gain.value = wet;
    input.connect(dl).connect(g).connect(p).connect(output);
    return lfo;
  };
  return [mk(-0.75, 0, rate), mk(0.75, 1, rate * 1.13)];
}

function gatedIR(ac, len = 0.2) {
  const sr = ac.sampleRate, n = Math.floor(sr * (len + 0.03));
  const b = ac.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let e = t < 0.004 ? t / 0.004 : 1 - 0.35 * (t / len);
      if (t > len) e *= Math.max(0, 1 - (t - len) / 0.012);
      d[i] = (Math.random() * 2 - 1) * e * 0.5;
    }
  }
  return b;
}

function plateIR(ac, sec = 2.2) {
  const sr = ac.sampleRate, n = Math.floor(sr * sec);
  const b = ac.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const w = Math.random() * 2 - 1;
      // darken as it decays: a one-pole lowpass whose coefficient falls over time
      const k = 0.9 - 0.75 * t;
      lp += k * (w - lp);
      const pre = i < sr * 0.012 ? 0 : 1;
      d[i] = lp * Math.pow(1 - t, 2.4) * pre * 0.6;
    }
  }
  return b;
}

// Karplus–Strong pluck, rendered to a buffer once per pitch/timbre and cached.
function ksBuffer(ac, f, sec, bright, damp) {
  const sr = ac.sampleRate;
  const N = Math.max(2, Math.floor(sr / f - 0.5));
  const len = Math.floor(sr * sec);
  const buf = ac.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const ring = new Float32Array(N);
  let prev = 0, mean = 0;
  for (let i = 0; i < N; i++) { prev += bright * ((Math.random() * 2 - 1) - prev); ring[i] = prev; mean += prev; }
  mean /= N;
  for (let i = 0; i < N; i++) ring[i] -= mean;
  let idx = 0, peak = 0;
  for (let i = 0; i < len; i++) {
    const cur = ring[idx], nxt = ring[idx + 1 === N ? 0 : idx + 1];
    ring[idx] = damp * 0.5 * (cur + nxt);
    d[i] = cur;
    const a = Math.abs(cur); if (a > peak) peak = a;
    idx = idx + 1 === N ? 0 : idx + 1;
  }
  const g = peak > 0 ? 0.9 / peak : 1;
  // short fade-out so the loop never clicks
  const fade = Math.floor(sr * 0.05);
  for (let i = 0; i < len; i++) d[i] *= g * (i > len - fade ? (len - i) / fade : 1);
  return { buf, rate: f / (sr / (N + 0.5)) };
}

function wave(ac, harm) {
  const real = new Float32Array(harm.length + 1), imag = new Float32Array(harm.length + 1);
  harm.forEach((a, i) => { imag[i + 1] = a; });
  return ac.createPeriodicWave(real, imag);
}

export class Band {
  constructor(audio, dest) {
    this.audio = audio;
    const ac = this.ac = audio.ac;
    this.alive = true;
    this.nodes = [];
    const G = (v = 1, to) => { const g = ac.createGain(); g.gain.value = v; if (to) g.connect(to); return g; };

    // master of the band → light glue compression → dest
    this.mix = G(1);
    this.glue = ac.createDynamicsCompressor();
    this.glue.threshold.value = -14; this.glue.ratio.value = 2.5; this.glue.knee.value = 10;
    this.glue.attack.value = 0.01; this.glue.release.value = 0.18;
    this.mix.connect(this.glue).connect(dest);

    // production plate reverb
    this.plateIn = G(1);
    const plate = ac.createConvolver(); plate.buffer = plateIR(ac, 2.3);
    const plHP = ac.createBiquadFilter(); plHP.type = 'highpass'; plHP.frequency.value = 220;
    const plLP = ac.createBiquadFilter(); plLP.type = 'lowpass'; plLP.frequency.value = 6500;
    this.plateIn.connect(plHP).connect(plate).connect(plLP).connect(G(0.55, this.mix));

    // 1985: the gated snare
    this.gateIn = G(1);
    const gate = ac.createConvolver(); gate.buffer = gatedIR(ac, 0.19);
    const gHP = ac.createBiquadFilter(); gHP.type = 'highpass'; gHP.frequency.value = 400;
    this.gateIn.connect(gate).connect(gHP).connect(G(0.7, this.mix));

    // buses
    this.drums = G(0.9, this.mix);
    this.hatBus = G(1);
    const hHP = ac.createBiquadFilter(); hHP.type = 'highpass'; hHP.frequency.value = 7200;
    const hPk = ac.createBiquadFilter(); hPk.type = 'peaking'; hPk.frequency.value = 10500; hPk.gain.value = 5;
    const hPan = ac.createStereoPanner(); hPan.pan.value = 0.28;
    this.hatBus.connect(hHP).connect(hPk).connect(hPan).connect(this.drums);

    this.bass = G(0.95, this.mix);

    this.epIn = G(1);
    const epOut = G(0.85, this.mix);
    this.nodes.push(...makeChorus(ac, this.epIn, epOut, { rate: 0.55, depth: 0.0022, wet: 0.55, dry: 0.75 }));
    this.epIn.connect(G(0.25, this.plateIn));

    this.gtrIn = G(1);
    const gHP2 = ac.createBiquadFilter(); gHP2.type = 'highpass'; gHP2.frequency.value = 260;
    const gtrMid = G(1);
    this.gtrIn.connect(gHP2).connect(gtrMid);
    const gtrOut = G(0.6, this.mix);
    this.nodes.push(...makeChorus(ac, gtrMid, gtrOut, { rate: 0.8, depth: 0.003, wet: 0.7, dry: 0.5 }));
    gtrMid.connect(G(0.15, this.plateIn));

    this.padIn = G(1);
    const padLP = ac.createBiquadFilter(); padLP.type = 'lowpass'; padLP.frequency.value = 3200; padLP.Q.value = 0.3;
    const padMid = G(1);
    this.padIn.connect(padLP).connect(padMid);
    const padOut = G(0.55, this.mix);
    this.nodes.push(...makeChorus(ac, padMid, padOut, { rate: 0.35, depth: 0.004, wet: 0.8, dry: 0.4 }));
    padMid.connect(G(0.6, this.plateIn));

    this.leadIn = G(1);
    const form = ac.createBiquadFilter(); form.type = 'peaking'; form.frequency.value = 1500; form.Q.value = 0.9; form.gain.value = 3;
    const leadOut = G(0.75, this.mix);
    this.leadIn.connect(form).connect(leadOut);
    form.connect(G(0.45, this.plateIn));
    // slapback for the lead, very 80s
    const slap = ac.createDelay(1); slap.delayTime.value = 0.11;
    form.connect(slap).connect(G(0.16, leadOut));

    this.brassIn = G(1);
    this.brassIn.connect(G(0.7, this.mix));
    this.brassIn.connect(G(0.35, this.plateIn));

    this.keysIn = G(1); // piano, bells, harp, accordion
    this.keysIn.connect(G(0.8, this.mix));
    this.keysIn.connect(G(0.42, this.plateIn));

    this.noiseBuf = audio.noise('white');
    this.ks = new Map();
    this.waves = {
      oboe: wave(ac, [0.35, 0.9, 1.0, 0.75, 0.55, 0.4, 0.28, 0.18, 0.12, 0.08, 0.05]),
      reed: wave(ac, [1, 0.6, 0.55, 0.35, 0.3, 0.22, 0.2, 0.14, 0.12, 0.1, 0.08, 0.06]),
      pulse: wave(ac, Array.from({ length: 24 }, (_, i) => Math.sin(Math.PI * (i + 1) * 0.28) / (i + 1))),
      piano: wave(ac, [1, 0.42, 0.28, 0.16, 0.12, 0.07, 0.05, 0.03]),
      clav: wave(ac, [0.6, 1, 0.5, 0.55, 0.2, 0.3, 0.1, 0.12]),
    };
  }

  dispose() {
    this.alive = false;
    for (const n of this.nodes) { try { n.stop(); } catch (e) {} }
    try { this.mix.disconnect(); } catch (e) {}
  }

  // ---------- primitives ----------
  osc(type, f, t, stop) {
    const o = this.ac.createOscillator();
    if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type);
    o.frequency.value = Math.min(f, this.ac.sampleRate * 0.45); o.start(t); o.stop(stop);
    return o;
  }
  gain(v = 0) { const g = this.ac.createGain(); g.gain.value = v; return g; }
  noise(t, dur) {
    const s = this.ac.createBufferSource(); s.buffer = this.noiseBuf;
    s.start(t, Math.random() * 1.5); s.stop(t + dur);
    return s;
  }
  filt(type, f, q = 0.7) { const b = this.ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  pan(v) { const p = this.ac.createStereoPanner(); p.pan.value = v; return p; }

  // ---------- keys ----------
  // DX7-style electric piano: a body pair (1:1) and a fast-decaying 14:1 "tine" bark.
  ep(t, m, vel = 0.7, dur = 0.5) {
    const ac = this.ac, f = mtof(m);
    const end = t + dur + 1.2;
    const c = this.osc('sine', f, t, end);
    const m1 = this.osc('sine', f, t, end); const m1g = this.gain();
    const I = (0.9 + vel * 1.5) * f;
    m1g.gain.setValueAtTime(I, t); m1g.gain.setTargetAtTime(I * 0.22, t, 0.32);
    m1.connect(m1g).connect(c.frequency);
    const m2 = this.osc('sine', f * 14, t, t + 0.25); const m2g = this.gain();
    m2g.gain.setValueAtTime(f * (1.2 + vel * 2.2), t); m2g.gain.setTargetAtTime(0, t, 0.012);
    m2.connect(m2g).connect(c.frequency);
    const a = this.gain();
    const peak = 0.075 * (0.35 + vel);
    const tau = 1.25 * Math.pow(2, -(m - 60) / 22);
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(peak, t + 0.003);
    a.gain.setTargetAtTime(0, t + 0.003, tau);
    a.gain.setTargetAtTime(0, t + dur, 0.07);
    c.connect(a).connect(this.epIn);
  }

  piano(t, m, vel = 0.7, dur = 0.8) {
    const f = mtof(m), end = t + dur + 2.5;
    const peak = 0.06 * (0.35 + vel);
    const lp = this.filt('lowpass', 1200 + vel * 4200, 0.5);
    lp.frequency.setTargetAtTime(700 + vel * 900, t, 0.5);
    const o1 = this.osc(this.waves.piano, f, t, end);
    const o2 = this.osc('sine', f * 2.0016, t, end);
    const o3 = this.osc('sine', f * 0.999, t, end);
    const a1 = this.gain(), a2 = this.gain(), a3 = this.gain();
    const tau = 1.8 * Math.pow(2, -(m - 60) / 18);
    [[a1, peak, tau * 0.55], [a2, peak * 0.25, tau * 0.45], [a3, peak * 0.5, tau * 1.3]].forEach(([g, p, tt]) => {
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(p, t + 0.004);
      g.gain.setTargetAtTime(0, t + 0.004, tt); g.gain.setTargetAtTime(0, t + dur, 0.12);
    });
    o1.connect(a1).connect(lp); o2.connect(a2).connect(lp); o3.connect(a3).connect(lp);
    lp.connect(this.keysIn);
    // hammer
    const n = this.noise(t, 0.03); const ng = this.gain(); const nf = this.filt('bandpass', f * 4, 1.2);
    ng.gain.setValueAtTime(peak * 0.25 * vel, t); ng.gain.setTargetAtTime(0, t, 0.006);
    n.connect(nf).connect(ng).connect(this.keysIn);
  }

  bell(t, m, vel = 0.6) {
    const f = mtof(m);
    [[1, 1, 1.1], [2.76, 0.42, 0.4], [5.4, 0.22, 0.16], [8.93, 0.1, 0.07]].forEach(([r, amp, tau]) => {
      const o = this.osc('sine', f * r, t, t + tau * 6 + 0.05);
      const g = this.gain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05 * vel * amp, t + 0.0015);
      g.gain.setTargetAtTime(0, t + 0.0015, tau);
      o.connect(g).connect(this.keysIn);
    });
  }

  pluckBuf(m, kind) {
    const key = kind + m;
    let e = this.ks.get(key);
    if (!e) {
      const f = mtof(m);
      e = kind === 'harp' ? ksBuffer(this.ac, f, 2.6, 0.55, 0.9985)
        : kind === 'pizz' ? ksBuffer(this.ac, f, 0.7, 0.4, 0.992)
        : ksBuffer(this.ac, f, 1.1, 0.75, 0.996);
      this.ks.set(key, e);
    }
    return e;
  }
  prepare(notes) { for (const [m, k] of notes) this.pluckBuf(m, k); }

  guitar(t, m, vel = 0.6, dur = 0.2, muted = false) {
    const e = this.pluckBuf(m, 'gtr');
    const s = this.ac.createBufferSource(); s.buffer = e.buf; s.playbackRate.value = e.rate;
    const g = this.gain();
    const pk = 0.11 * vel;
    g.gain.setValueAtTime(pk, t);
    if (muted) g.gain.setTargetAtTime(0, t, 0.018);
    else g.gain.setTargetAtTime(0, t + dur, 0.05);
    s.connect(g).connect(this.gtrIn);
    s.start(t); s.stop(t + (muted ? 0.15 : dur + 0.4));
  }

  harp(t, m, vel = 0.6, kind = 'harp') {
    const e = this.pluckBuf(m, kind);
    const s = this.ac.createBufferSource(); s.buffer = e.buf; s.playbackRate.value = e.rate;
    const g = this.gain(kind === 'pizz' ? 0.13 * vel : 0.09 * vel);
    s.connect(g).connect(this.keysIn);
    s.start(t);
  }

  accordion(t, m, vel = 0.6, dur = 0.4) {
    const f = mtof(m), end = t + dur + 0.3;
    const lp = this.filt('lowpass', 3200, 0.4);
    const a = this.gain();
    const pk = 0.03 * vel;
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(pk, t + 0.035);
    a.gain.setTargetAtTime(pk * 0.8, t + 0.04, 0.2);
    a.gain.setTargetAtTime(0, t + dur, 0.06);
    [-11, 0, 12].forEach((cents) => {
      const o = this.osc(this.waves.reed, f, t, end); o.detune.value = cents;
      o.connect(lp);
    });
    lp.connect(a).connect(this.keysIn);
  }

  // ---------- bass ----------
  bassNote(t, m, vel = 0.7, dur = 0.4, kind = 'finger') {
    const f = mtof(m), end = t + dur + 0.3;
    const o1 = this.osc('triangle', f, t, end);
    const o2 = this.osc('sawtooth', f, t, end);
    const o2g = this.gain(kind === 'pop' ? 0.6 : kind === 'synth' ? 0.7 : 0.28);
    const lp = this.filt('lowpass', 300, kind === 'synth' ? 4 : 1.2);
    const open = kind === 'slap' ? 2600 : kind === 'pop' ? 3600 : kind === 'synth' ? 2200 : 500 + vel * 900;
    lp.frequency.setValueAtTime(open, t);
    lp.frequency.setTargetAtTime(kind === 'synth' ? 380 : 260, t, kind === 'finger' ? 0.12 : 0.06);
    const a = this.gain();
    const pk = (kind === 'pop' ? 0.2 : 0.26) * (0.4 + vel);
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(pk, t + 0.004);
    a.gain.setTargetAtTime(pk * 0.65, t + 0.004, kind === 'synth' ? 0.12 : 0.35);
    a.gain.setTargetAtTime(0, t + dur, 0.035);
    o1.connect(lp); o2.connect(o2g).connect(lp); lp.connect(a).connect(this.bass);
    if (kind === 'slap' || kind === 'pop') {
      const n = this.noise(t, 0.02); const nf = this.filt('highpass', 1400); const ng = this.gain();
      ng.gain.setValueAtTime(0.09 * vel, t); ng.gain.setTargetAtTime(0, t, 0.004);
      n.connect(nf).connect(ng).connect(this.bass);
    }
  }

  // ---------- drums ----------
  kick(t, vel = 0.9) {
    const o = this.osc('sine', 150, t, t + 0.5);
    o.frequency.setValueAtTime(155, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.075);
    const a = this.gain();
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(0.75 * vel, t + 0.002);
    a.gain.setTargetAtTime(0, t + 0.01, 0.1);
    o.connect(a).connect(this.drums);
    const n = this.noise(t, 0.012); const nf = this.filt('highpass', 2500); const ng = this.gain(0.12 * vel);
    ng.gain.setTargetAtTime(0, t, 0.003);
    n.connect(nf).connect(ng).connect(this.drums);
  }

  snare(t, vel = 0.8, gated = 0.9) {
    const n = this.noise(t, 0.3);
    const bp = this.filt('bandpass', 1900, 0.75); const ng = this.gain();
    ng.gain.setValueAtTime(0.32 * vel, t); ng.gain.setTargetAtTime(0, t, 0.055);
    n.connect(bp).connect(ng);
    const tone = this.osc('triangle', 188, t, t + 0.2); const tg = this.gain();
    tone.frequency.setValueAtTime(205, t); tone.frequency.exponentialRampToValueAtTime(175, t + 0.05);
    tg.gain.setValueAtTime(0.3 * vel, t); tg.gain.setTargetAtTime(0, t, 0.035);
    tone.connect(tg);
    const p = this.pan(-0.05);
    ng.connect(p); tg.connect(p); p.connect(this.drums);
    if (gated > 0) { const sg = this.gain(gated * 0.55); ng.connect(sg); tg.connect(sg); sg.connect(this.gateIn); }
  }

  rim(t, vel = 0.6) {
    const o = this.osc('triangle', 1650, t, t + 0.05); const g = this.gain();
    g.gain.setValueAtTime(0.14 * vel, t); g.gain.setTargetAtTime(0, t, 0.008);
    const n = this.noise(t, 0.03); const nf = this.filt('bandpass', 3200, 2); const ng = this.gain(0.1 * vel);
    ng.gain.setTargetAtTime(0, t, 0.008);
    o.connect(g).connect(this.drums); n.connect(nf).connect(ng).connect(this.drums);
    const s = this.gain(0.3); g.connect(s).connect(this.plateIn);
  }

  clap(t, vel = 0.7) {
    const n = this.noise(t, 0.35);
    const bp = this.filt('bandpass', 1150, 1.1); const g = this.gain();
    const p = 0.3 * vel;
    g.gain.setValueAtTime(0, t);
    [0, 0.011, 0.023].forEach((d) => { g.gain.setValueAtTime(p, t + d); g.gain.setTargetAtTime(0.02, t + d + 0.001, 0.003); });
    g.gain.setValueAtTime(p * 0.8, t + 0.034); g.gain.setTargetAtTime(0, t + 0.035, 0.07);
    n.connect(bp).connect(g).connect(this.drums);
    const sg = this.gain(0.4); g.connect(sg).connect(this.gateIn);
  }

  hat(t, vel = 0.5, open = false) {
    const n = this.noise(t, open ? 0.5 : 0.1); const g = this.gain();
    g.gain.setValueAtTime(0.16 * vel, t); g.gain.setTargetAtTime(0, t, open ? 0.11 : 0.016);
    n.connect(g).connect(this.hatBus);
  }

  shaker(t, vel = 0.4) {
    const n = this.noise(t, 0.12); const bp = this.filt('bandpass', 5800, 1.4); const g = this.gain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.11 * vel, t + 0.012); g.gain.setTargetAtTime(0, t + 0.013, 0.025);
    const p = this.pan(-0.35);
    n.connect(bp).connect(g).connect(p).connect(this.drums);
  }

  tamb(t, vel = 0.5) {
    const n = this.noise(t, 0.3); const bp = this.filt('bandpass', 8200, 2.5); const g = this.gain();
    g.gain.setValueAtTime(0.16 * vel, t); g.gain.setTargetAtTime(0, t, 0.06);
    const p = this.pan(0.45);
    n.connect(bp).connect(g).connect(p).connect(this.drums);
  }

  tom(t, m, vel = 0.7) {
    const f = mtof(m);
    const o = this.osc('sine', f, t, t + 0.7);
    o.frequency.setValueAtTime(f * 1.5, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    const g = this.gain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.42 * vel, t + 0.003); g.gain.setTargetAtTime(0, t + 0.004, 0.16);
    const p = this.pan((m - 45) / 30);
    o.connect(g).connect(p).connect(this.drums);
    const s = this.gain(0.4); g.connect(s).connect(this.gateIn);
  }

  crash(t, vel = 0.6) {
    const n = this.noise(t, 2.2); const hp = this.filt('highpass', 4200, 0.5); const pk = this.filt('peaking', 7500, 1); pk.gain.value = 6;
    const g = this.gain();
    g.gain.setValueAtTime(0.17 * vel, t); g.gain.setTargetAtTime(0, t, 0.65);
    const p = this.pan(-0.4);
    n.connect(hp).connect(pk).connect(g).connect(p).connect(this.drums);
    const s = this.gain(0.2); g.connect(s).connect(this.plateIn);
  }

  timpani(t, m, vel = 0.7) {
    const f = mtof(m);
    const o = this.osc('sine', f, t, t + 3); o.frequency.setValueAtTime(f * 1.03, t); o.frequency.setTargetAtTime(f, t, 0.08);
    const o2 = this.osc('sine', f * 1.505, t, t + 2);
    const g = this.gain(), g2 = this.gain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3 * vel, t + 0.006); g.gain.setTargetAtTime(0, t + 0.01, 0.75);
    g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(0.08 * vel, t + 0.006); g2.gain.setTargetAtTime(0, t + 0.01, 0.35);
    o.connect(g).connect(this.keysIn); o2.connect(g2).connect(this.keysIn);
    const n = this.noise(t, 0.08); const nf = this.filt('lowpass', 500); const ng = this.gain(0.2 * vel); ng.gain.setTargetAtTime(0, t, 0.02);
    n.connect(nf).connect(ng).connect(this.keysIn);
  }

  // ---------- sustained ----------
  pad(t, notes, dur, vel = 0.5, attack = 0.45) {
    const end = t + dur + 1.6;
    // one vibrato LFO per chord, so everything here can be collected when it ends
    const lfo = this.osc('sine', 4.9 + Math.random() * 0.4, t, end);
    const vg = this.gain(6); lfo.connect(vg);
    notes.forEach((m, i) => {
      const f = mtof(m);
      const a = this.gain();
      const pk = 0.016 * (0.4 + vel);
      a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(pk, t + attack);
      a.gain.setValueAtTime(pk, t + Math.max(attack, dur)); a.gain.setTargetAtTime(0, t + Math.max(attack, dur), 0.45);
      [-8, 7].forEach((det) => {
        const o = this.osc('sawtooth', f, t, end); o.detune.value = det + (i % 2 ? 2 : -2);
        vg.connect(o.detune);
        o.connect(a);
      });
      a.connect(this.padIn);
    });
  }

  brass(t, m, vel = 0.7, dur = 0.2) {
    const f = mtof(m), end = t + dur + 0.4;
    const c = this.osc('sine', f, t, end);
    const c2 = this.osc('sine', f * 1.004, t, end);
    const mo = this.osc('sine', f, t, end); const mg = this.gain();
    mg.gain.setValueAtTime(0, t); mg.gain.linearRampToValueAtTime(f * (2.6 + vel * 1.6), t + 0.035);
    mg.gain.setTargetAtTime(f * 1.7, t + 0.04, 0.12); mg.gain.setTargetAtTime(0, t + dur, 0.06);
    mo.connect(mg); mg.connect(c.frequency); mg.connect(c2.frequency);
    c.detune.setValueAtTime(-35, t); c.detune.linearRampToValueAtTime(0, t + 0.04);
    const a = this.gain();
    const pk = 0.05 * (0.4 + vel);
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(pk, t + 0.025);
    a.gain.setTargetAtTime(pk * 0.75, t + 0.03, 0.15); a.gain.setTargetAtTime(0, t + dur, 0.07);
    c.connect(a); c2.connect(a); a.connect(this.brassIn);
  }

  synthBrass(t, notes, vel = 0.7, dur = 0.25) {
    const end = t + dur + 0.5;
    const lp = this.filt('lowpass', 600, 1.4);
    lp.frequency.setValueAtTime(700, t); lp.frequency.linearRampToValueAtTime(3400 + vel * 1500, t + 0.05);
    lp.frequency.setTargetAtTime(1500, t + 0.06, 0.18);
    const a = this.gain();
    const pk = 0.022 * (0.5 + vel);
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(pk, t + 0.015);
    a.gain.setTargetAtTime(pk * 0.7, t + 0.02, 0.15); a.gain.setTargetAtTime(0, t + dur, 0.08);
    for (const m of notes) for (const det of [-9, 9]) {
      const o = this.osc('sawtooth', mtof(m), t, end); o.detune.value = det; o.connect(lp);
    }
    lp.connect(a).connect(this.brassIn);
  }

  arp(t, m, vel = 0.5) {
    const o = this.osc('sawtooth', mtof(m), t, t + 0.4);
    const o2 = this.osc(this.waves.pulse, mtof(m) * 1.002, t, t + 0.4);
    const lp = this.filt('lowpass', 3200, 3); lp.frequency.setTargetAtTime(500, t, 0.06);
    const a = this.gain(); a.gain.setValueAtTime(0.03 * vel, t); a.gain.setTargetAtTime(0, t, 0.1);
    o.connect(lp); o2.connect(lp); lp.connect(a).connect(this.keysIn);
  }

  // lead voices: 'sax' | 'flute' | 'oboe' | 'synth' | 'strings' | 'brass'
  lead(t, m, vel = 0.7, dur = 0.4, kind = 'sax') {
    if (kind === 'brass') return this.brass(t, m, vel, dur);
    const ac = this.ac, f = mtof(m), end = t + dur + 0.6;
    const a = this.gain();
    let pk = 0.07 * (0.45 + vel), att = 0.04, rel = 0.07;
    const voice = [];
    if (kind === 'sax') {
      const c = this.osc('sine', f, t, end);
      const mo = this.osc('sine', f, t, end); const mg = this.gain();
      mg.gain.setValueAtTime(f * 0.6, t); mg.gain.linearRampToValueAtTime(f * (1.9 + vel * 0.9), t + 0.06);
      mg.gain.setTargetAtTime(f * (1.5 + vel * 0.5), t + 0.07, 0.25);
      mo.connect(mg).connect(c.frequency);
      const mo2 = this.osc('sine', f * 3, t, end); const mg2 = this.gain(f * 0.35);
      mo2.connect(mg2).connect(c.frequency);
      const lp = this.filt('lowpass', 2600 + vel * 1600, 0.8);
      c.connect(lp); voice.push(c); lp.connect(a);
      const n = this.noise(t, dur + 0.3); const nf = this.filt('bandpass', f * 2.5, 2.2); const ng = this.gain();
      ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(pk * 0.35, t + 0.03); ng.gain.setTargetAtTime(pk * 0.08, t + 0.04, 0.08);
      ng.gain.setTargetAtTime(0, t + dur, 0.05);
      n.connect(nf).connect(ng).connect(this.leadIn);
      c.detune.setValueAtTime(-55, t); c.detune.linearRampToValueAtTime(0, t + 0.07);
      att = 0.035; pk *= 0.9;
    } else if (kind === 'flute') {
      const c = this.osc('sine', f, t, end), c2 = this.osc('sine', f * 2, t, end); const g2 = this.gain(0.12);
      c2.connect(g2).connect(a); c.connect(a); voice.push(c, c2);
      const n = this.noise(t, dur + 0.3); const nf = this.filt('bandpass', f * 2, 1.5); const ng = this.gain();
      ng.gain.setValueAtTime(pk * 0.5, t); ng.gain.setTargetAtTime(pk * 0.1, t, 0.05); ng.gain.setTargetAtTime(0, t + dur, 0.06);
      n.connect(nf).connect(ng).connect(this.leadIn);
      att = 0.06; pk *= 0.8;
    } else if (kind === 'oboe') {
      const c = this.osc(this.waves.oboe, f, t, end);
      const bp = this.filt('peaking', 1150, 1.2); bp.gain.value = 6;
      const lp = this.filt('lowpass', 4200, 0.6);
      c.connect(bp).connect(lp).connect(a); voice.push(c);
      att = 0.045; pk *= 0.55;
    } else if (kind === 'synth') {
      const c = this.osc(this.waves.pulse, f, t, end), c2 = this.osc('sine', f * 2, t, end);
      const lp = this.filt('lowpass', 3400, 1.5); const g2 = this.gain(0.25);
      c.connect(lp).connect(a); c2.connect(g2).connect(a); voice.push(c, c2);
      att = 0.012; pk *= 0.55;
    } else { // strings
      for (const det of [-9, 0, 9]) { const c = this.osc('sawtooth', f, t, end); c.detune.value = det; voice.push(c); }
      const lp = this.filt('lowpass', 2800, 0.5);
      voice.forEach((c) => c.connect(lp)); lp.connect(a);
      att = Math.min(0.18, dur * 0.4); rel = 0.25; pk *= 0.36;
    }
    // delayed vibrato
    if (dur > 0.28) {
      const v = this.osc('sine', kind === 'oboe' ? 5.6 : 5.2, t, end);
      const vg = this.gain(0);
      vg.gain.setValueAtTime(0, t + 0.2); vg.gain.linearRampToValueAtTime(kind === 'synth' ? 14 : 11, t + 0.2 + Math.min(0.5, dur * 0.6));
      v.connect(vg); voice.forEach((c) => vg.connect(c.detune));
    }
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(pk, t + att);
    a.gain.setTargetAtTime(pk * 0.82, t + att, 0.3);
    a.gain.setTargetAtTime(0, t + dur, rel);
    a.connect(this.leadIn);
  }
}

export { mtof };
