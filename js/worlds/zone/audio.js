// The sound of the Zone. Everything is synthesized: wind, rain, water, a far dog, metal
// that groans somewhere, an electronic drone in the spirit of a late-70s synthesizer score
// (original), a plucked long-necked lute that never quite resolves — until you sit down.

import { mtof } from '../../lib/audio.js';

const D_PHRYG = [146.83, 155.56, 185.0, 196.0, 220.0, 233.08, 261.63, 293.66];
const D_MAJ = [146.83, 164.81, 185.0, 220.0, 246.94, 293.66, 329.63, 369.99];

export class ZoneAudio {
  constructor(ctx) {
    this.ctx = ctx;
    this.A = ctx.audio;
    const ac = (this.ac = ctx.audio.ac);
    this.loops = [];
    this.dead = false;

    this.out = ac.createGain();
    this.out.gain.value = 1;
    this.out.connect(ctx.out);
    this.wet = ac.createGain();
    this.wet.gain.value = 1;
    this.wet.connect(ctx.send);

    // ambience → lowpass (for the pull) → out, with a little reverb
    this.ambF = ac.createBiquadFilter();
    this.ambF.type = 'lowpass';
    this.ambF.frequency.value = 18000;
    this.amb = ac.createGain();
    this.amb.gain.value = 1;
    this.amb.connect(this.ambF);
    this.ambF.connect(this.out);
    const ambWet = ac.createGain();
    ambWet.gain.value = 0.18;
    this.ambF.connect(ambWet).connect(this.wet);

    this.droneBus = ac.createGain();
    this.droneBus.gain.value = 0;
    this.droneBus.connect(this.out);
    const dWet = ac.createGain();
    dWet.gain.value = 0.55;
    this.droneBus.connect(dWet).connect(this.wet);

    this.sfx = ac.createGain();
    this.sfx.gain.value = 1;
    this.sfx.connect(this.out);
    this.sfxWet = ac.createGain();
    this.sfxWet.gain.value = 1;
    this.sfxWet.connect(this.wet);

    this._buildAmbience();
    this._buildDrone();
    this._buildPlucks();

    ctx.signal.addEventListener('abort', () => this.destroy());
  }

  now() { return this.ac.currentTime; }
  t0(d = 0) { return this.ac.currentTime + 0.02 + d; }

  _loop(node) { this.loops.push(node); return node; }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    for (const n of this.loops) { try { n.stop(); } catch (e) {} }
    try { this.out.disconnect(); this.wet.disconnect(); } catch (e) {}
  }

  // ───────────────────────────────────────── primitives
  pan(dest, p) {
    const pn = this.ac.createStereoPanner();
    pn.pan.value = Math.max(-1, Math.min(1, p));
    pn.connect(dest);
    return pn;
  }
  tone(dest, { type = 'sine', f = 440, f2 = null, t = this.t0(), a = 0.005, dur = 0.3, g = 0.2, curve = 'exp', detune = 0 }) {
    const ac = this.ac;
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t + dur);
    o.detune.value = detune;
    const e = ac.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.linearRampToValueAtTime(g, t + a);
    if (curve === 'exp') e.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
    else e.gain.linearRampToValueAtTime(0.0001, t + a + dur);
    o.connect(e).connect(dest);
    o.start(t);
    o.stop(t + a + dur + 0.05);
    return { o, e };
  }
  burst(dest, { kind = 'white', type = 'bandpass', f = 1000, f2 = null, q = 1, t = this.t0(), a = 0.004, dur = 0.2, g = 0.3, rate = 1 }) {
    const ac = this.ac;
    const s = ac.createBufferSource();
    s.buffer = this.A.noise(kind);
    s.playbackRate.value = rate;
    const fl = ac.createBiquadFilter();
    fl.type = type;
    fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + a + dur);
    fl.Q.value = q;
    const e = ac.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.linearRampToValueAtTime(g, t + a);
    e.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
    s.connect(fl).connect(e).connect(dest);
    s.start(t, Math.random() * 1.5);
    s.stop(t + a + dur + 0.05);
    return { s, fl, e };
  }

  // ───────────────────────────────────────── ambience
  _buildAmbience() {
    const ac = this.ac, A = this.A;
    const mk = (kind, type, f, q, gain) => {
      const n = A.noiseLoop(this.amb, { kind, type, freq: f, q, gain: 0 });
      this._loop(n.src);
      n.target = gain;
      return n;
    };
    this.wind = mk('brown', 'bandpass', 380, 0.5, 0);
    this.windHi = mk('pink', 'bandpass', 900, 0.9, 0);
    this.grass = mk('white', 'highpass', 2600, 0.5, 0);
    this.water = mk('brown', 'bandpass', 520, 1.4, 0);
    this.room = mk('brown', 'lowpass', 110, 0.7, 0);

    // rain: a pre-rendered loop with drops baked in
    const sr = ac.sampleRate, len = Math.floor(sr * 3.0);
    const buf = ac.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let b0 = 0, b1 = 0, b2 = 0, lp = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527;
        const pink = (b0 + b1 + b2 + w * 0.1848) * 0.18;
        lp += (pink - lp) * 0.55;
        d[i] = (pink - lp) * 0.9;
      }
      const drops = 900;
      for (let k = 0; k < drops; k++) {
        const at = Math.floor(Math.random() * (len - 600));
        const amp = 0.05 + Math.random() * Math.random() * 0.5;
        const f = 2500 + Math.random() * 5000;
        const dec = 0.0015 + Math.random() * 0.004;
        for (let i = 0; i < 500; i++) {
          d[at + i] += Math.sin((i / sr) * f * Math.PI * 2) * amp * Math.exp(-(i / sr) / dec) * (Math.random() * 0.6 + 0.4);
        }
      }
    }
    const rs = ac.createBufferSource();
    rs.buffer = buf;
    rs.loop = true;
    const rf = ac.createBiquadFilter();
    rf.type = 'lowpass';
    rf.frequency.value = 7500;
    this.rainG = ac.createGain();
    this.rainG.gain.value = 0;
    rs.connect(rf).connect(this.rainG).connect(this.amb);
    rs.start();
    this._loop(rs);

    // gusts: wind and grass breathe together
    this.gust = 0.6;
    this.ctx.interval(() => this._gust(), 1700);
  }

  _gust() {
    if (this.dead) return;
    const t = this.now();
    const g = 0.35 + Math.random() * 0.75;
    this.gust = g;
    const s = this.scene || {};
    const set = (n, v, tc) => n.gain.gain.setTargetAtTime(v, t, tc);
    set(this.wind, (s.wind || 0) * 0.32 * g, 1.2);
    set(this.windHi, (s.wind || 0) * 0.05 * g * g, 1.0);
    set(this.grass, (s.grass || 0) * 0.035 * g * g, 0.7);
    this.wind.filter.frequency.setTargetAtTime(260 + g * 260, t, 1.5);
    this.windHi.filter.frequency.setTargetAtTime(700 + g * 600, t, 1.5);
  }

  setScene(amb, drone, fade = 3) {
    this.scene = amb;
    const t = this.now();
    const set = (n, v) => n.gain.gain.setTargetAtTime(v, t, fade / 3);
    set(this.water, (amb.water || 0) * 0.16);
    set(this.room, (amb.room || 0) * 0.22);
    this.rainG.gain.setTargetAtTime((amb.rain || 0) * 0.5, t, fade / 3);
    this._gust();
    if (drone) this.setDrone(drone, fade);
    this._scheduleEvents();
  }

  _scheduleEvents() {
    if (this._evTimer) return;
    const tick = () => {
      if (this.dead) return;
      const s = this.scene || {};
      if (s.dog && Math.random() < 0.09 * s.dog) this.dog();
      if (s.groan && Math.random() < 0.08 * s.groan) this.groan();
      if (s.drip) for (let i = 0; i < 3; i++) if (Math.random() < 0.28 * s.drip) this.drip(Math.random() * 1.8);
      if (s.water && Math.random() < 0.3 * s.water) this.gurgle();
      if (this.droneOn && Math.random() < 0.07) this.phrase();
      if (this.droneOn && Math.random() < 0.05) this.highTone();
    };
    this._evTimer = this.ctx.interval(tick, 2000);
  }

  dog(p = (Math.random() - 0.5) * 1.6) {
    const ac = this.ac;
    const bus = ac.createGain();
    bus.gain.value = 0.11;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    bus.connect(lp);
    lp.connect(this.pan(this.out, p));
    const wg = ac.createGain();
    wg.gain.value = 2.2;
    lp.connect(wg).connect(this.wet);
    const n = 1 + Math.floor(Math.random() * 3);
    let t = this.t0();
    for (let i = 0; i < n; i++) {
      const f0 = 330 + Math.random() * 90;
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0 * 1.25, t);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.72, t + 0.16);
      const f1 = ac.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 720; f1.Q.value = 3;
      const f2 = ac.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1550; f2.Q.value = 4;
      const e = ac.createGain();
      e.gain.setValueAtTime(0.0001, t);
      e.gain.linearRampToValueAtTime(1, t + 0.012);
      e.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(f1).connect(e);
      o.connect(f2).connect(e);
      e.connect(bus);
      o.start(t); o.stop(t + 0.25);
      this.burst(bus, { kind: 'white', f: 1100, q: 1.2, t, dur: 0.09, g: 0.5 });
      t += 0.28 + Math.random() * 0.3;
    }
  }

  groan() {
    const ac = this.ac;
    const t = this.t0();
    const dur = 3.5 + Math.random() * 4;
    const p = (Math.random() - 0.5) * 1.8;
    const bus = ac.createGain();
    bus.gain.setValueAtTime(0.0001, t);
    bus.gain.linearRampToValueAtTime(0.09, t + dur * 0.4);
    bus.gain.linearRampToValueAtTime(0.0001, t + dur);
    const dest = this.pan(this.out, p);
    bus.connect(dest);
    const w = ac.createGain(); w.gain.value = 1.8;
    bus.connect(w).connect(this.wet);
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    const f = 38 + Math.random() * 30;
    o.frequency.setValueAtTime(f, t);
    o.frequency.linearRampToValueAtTime(f * (0.85 + Math.random() * 0.3), t + dur);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 9;
    bp.frequency.setValueAtTime(180 + Math.random() * 200, t);
    bp.frequency.linearRampToValueAtTime(400 + Math.random() * 500, t + dur * 0.6);
    bp.frequency.linearRampToValueAtTime(150, t + dur);
    o.connect(bp).connect(bus);
    o.start(t); o.stop(t + dur + 0.1);
    // friction: metal on metal
    const s = ac.createBufferSource();
    s.buffer = this.A.noise('pink');
    s.loop = true;
    const nb = ac.createBiquadFilter();
    nb.type = 'bandpass'; nb.Q.value = 14;
    nb.frequency.setValueAtTime(600 + Math.random() * 900, t);
    nb.frequency.linearRampToValueAtTime(400 + Math.random() * 1400, t + dur);
    const ng = ac.createGain(); ng.gain.value = 0.5;
    const trem = ac.createOscillator(); trem.frequency.value = 5 + Math.random() * 9;
    const tg = ac.createGain(); tg.gain.value = 0.4;
    trem.connect(tg).connect(ng.gain);
    s.connect(nb).connect(ng).connect(bus);
    s.start(t); s.stop(t + dur + 0.1);
    trem.start(t); trem.stop(t + dur + 0.1);
  }

  drip(d = 0) {
    const t = this.t0(d);
    const p = (Math.random() - 0.5) * 1.6;
    const f = 900 + Math.random() * 1700;
    const dest = this.pan(this.amb, p);
    this.tone(dest, { f: f * 1.6, f2: f, t, a: 0.001, dur: 0.07 + Math.random() * 0.05, g: 0.05 + Math.random() * 0.05 });
    const w = this.ac.createGain(); w.gain.value = 0.6; dest.connect(w).connect(this.wet);
  }

  gurgle() {
    const t = this.t0(Math.random());
    const dest = this.pan(this.amb, (Math.random() - 0.5) * 0.8);
    for (let i = 0; i < 3; i++) {
      const f = 300 + Math.random() * 500;
      this.tone(dest, { f, f2: f * 1.8, t: t + i * 0.06, a: 0.004, dur: 0.05, g: 0.025 });
    }
  }

  // ───────────────────────────────────────── the drone
  _buildDrone() {
    const ac = this.ac;
    this.droneF = ac.createBiquadFilter();
    this.droneF.type = 'lowpass';
    this.droneF.frequency.value = 380;
    this.droneF.Q.value = 3.5;
    // slow chorus for width
    const chL = ac.createDelay(0.05), chR = ac.createDelay(0.05);
    chL.delayTime.value = 0.012; chR.delayTime.value = 0.017;
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.07;
    const lg = ac.createGain(); lg.gain.value = 0.004;
    lfo.connect(lg); lg.connect(chL.delayTime); lg.connect(chR.delayTime);
    lfo.start(); this._loop(lfo);
    const merger = ac.createChannelMerger(2);
    this.droneF.connect(chL).connect(merger, 0, 0);
    this.droneF.connect(chR).connect(merger, 0, 1);
    merger.connect(this.droneBus);
    this.droneF.connect(this.droneBus);
    // filter breathing
    const flfo = ac.createOscillator(); flfo.frequency.value = 0.031;
    const fg = ac.createGain(); fg.gain.value = 140;
    flfo.connect(fg).connect(this.droneF.frequency);
    flfo.start(); this._loop(flfo);

    this.voices = [];
    const mkv = (f, g, type = 'sawtooth', det = 0) => {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = det;
      const gg = ac.createGain();
      gg.gain.value = g;
      o.connect(gg).connect(this.droneF);
      o.start();
      this._loop(o);
      const v = { o, g: gg, base: g };
      this.voices.push(v);
      return v;
    };
    mkv(73.42, 0.05, 'sawtooth', -4);
    mkv(73.42, 0.05, 'sawtooth', 5);
    mkv(110.0, 0.035, 'sawtooth', 3);
    mkv(146.83, 0.03, 'sawtooth', -6);
    this.dis = mkv(155.56, 0.0, 'sawtooth', 2);
    this.res1 = mkv(220.0, 0.0, 'triangle', 0);
    this.res2 = mkv(329.63, 0.0, 'triangle', 0);
    // sub
    const sub = ac.createOscillator(); sub.frequency.value = 36.71;
    const sg = ac.createGain(); sg.gain.value = 0.11;
    sub.connect(sg).connect(this.droneBus);
    sub.start(); this._loop(sub);
    this.sub = sg;
    // singing metal: noise through a comb
    const ns = ac.createBufferSource(); ns.buffer = this.A.noise('pink'); ns.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.7;
    const dl = ac.createDelay(0.1); dl.delayTime.value = 1 / 110;
    const fb = ac.createGain(); fb.gain.value = 0.86;
    const mg = ac.createGain(); mg.gain.value = 0;
    ns.connect(bp).connect(dl);
    dl.connect(fb).connect(dl);
    dl.connect(mg).connect(this.droneBus);
    ns.start(); this._loop(ns);
    this.metal = mg;
    this.metalDelay = dl;
    this.droneOn = false;
  }

  setDrone({ cut = 380, dis = 0.6, metal = 0.4 }, fade = 4) {
    const t = this.now();
    this.droneOn = true;
    this.droneBus.gain.setTargetAtTime(0.85, t, fade / 3);
    this.droneF.frequency.setTargetAtTime(cut, t, fade / 2);
    this.dis.g.gain.setTargetAtTime(0.03 * dis, t, fade / 2);
    this.metal.gain.setTargetAtTime(0.022 * metal, t, fade / 2);
  }

  droneLevel(v, tc = 1) { this.droneBus.gain.setTargetAtTime(v, this.now(), tc); }

  // the drone resolves (bonfire rest)
  resolve() {
    const t = this.now();
    this.resolved = true;
    this.dis.o.frequency.setTargetAtTime(185.0, t, 2.2);   // E♭ climbs to F♯: D major
    this.dis.g.gain.setTargetAtTime(0.03, t, 2);
    this.res1.g.gain.setTargetAtTime(0.035, t + 1.5, 2.5);
    this.res2.g.gain.setTargetAtTime(0.018, t + 3, 3);
    this.droneF.frequency.setTargetAtTime(820, t, 3);
    this.droneF.Q.setTargetAtTime(1.2, t, 3);
    this.metal.gain.setTargetAtTime(0.0, t, 2);
    this.droneBus.gain.setTargetAtTime(1.0, t, 3);
    this.ctx.timeout(() => this.phrase(true), 4200);
    this.ctx.timeout(() => this.phrase(true), 19000);
  }

  // ───────────────────────────────────────── a plucked lute, Karplus–Strong, rendered offline
  _buildPlucks() {
    const ac = this.ac, sr = ac.sampleRate;
    this.pl = new Map();
    const make = (f) => {
      const dur = 3.2, len = Math.floor(sr * dur), N = Math.max(2, Math.round(sr / f));
      const buf = ac.createBuffer(1, len, sr);
      const d = buf.getChannelData(0);
      let prev = 0;
      for (let i = 0; i < N; i++) { const w = Math.random() * 2 - 1; prev = prev * 0.45 + w * 0.55; d[i] = prev; }
      const k = 0.4985 * (f > 250 ? 0.999 : 1.0);
      for (let i = N; i < len; i++) d[i] = (d[i - N] + d[i - N + 1 < i ? i - N + 1 : i - N]) * k * (i < N + 1 ? 1 : 1);
      // gentle fade at the tail
      for (let i = len - 2000; i < len; i++) d[i] *= (len - i) / 2000;
      return buf;
    };
    for (const f of new Set([...D_PHRYG, ...D_MAJ])) this.pl.set(f, make(f));
    // the instrument's body and a slow echo
    this.lute = ac.createGain();
    this.lute.gain.value = 0.28;
    const body = ac.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 1250; body.Q.value = 2.2; body.gain.value = 7;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 120;
    this.lute.connect(body).connect(hp);
    hp.connect(this.out);
    const dly = ac.createDelay(1.5); dly.delayTime.value = 0.43;
    const fb = ac.createGain(); fb.gain.value = 0.33;
    const dlp = ac.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2200;
    hp.connect(dly); dly.connect(dlp).connect(fb).connect(dly);
    const dpan = ac.createStereoPanner(); dpan.pan.value = 0.5;
    dlp.connect(dpan).connect(this.out);
    const w = ac.createGain(); w.gain.value = 0.9;
    hp.connect(w).connect(this.wet);
  }

  pluck(f, t, g = 1, bend = 0) {
    const buf = this.pl.get(f);
    if (!buf) return;
    const s = this.ac.createBufferSource();
    s.buffer = buf;
    if (bend) {
      s.playbackRate.setValueAtTime(1, t + 0.08);
      s.playbackRate.linearRampToValueAtTime(Math.pow(2, bend / 12), t + 0.5);
    }
    const e = this.ac.createGain();
    e.gain.value = g;
    s.connect(e).connect(this.lute);
    s.start(t);
  }

  phrase(major = false) {
    if (this.dead) return;
    const sc = major || this.resolved ? D_MAJ : D_PHRYG;
    let t = this.t0(0.1);
    let i = Math.floor(Math.random() * 3) + (major ? 2 : 1);
    const n = 3 + Math.floor(Math.random() * 4);
    for (let k = 0; k < n; k++) {
      const bend = !major && Math.random() < 0.25 ? (Math.random() < 0.5 ? 1 : -0.5) : 0;
      this.pluck(sc[i], t, 0.6 + Math.random() * 0.4, bend);
      if (Math.random() < 0.3) this.pluck(sc[Math.min(sc.length - 1, i + 1)], t + 0.09, 0.4);
      t += 0.35 + Math.random() * (major ? 0.5 : 0.9);
      i = Math.max(0, Math.min(sc.length - 1, i + (Math.random() < 0.55 ? -1 : 1) * (Math.random() < 0.7 ? 1 : 2)));
    }
    this.pluck(major ? 146.83 : sc[0], t + 0.4, 0.8);
  }

  highTone() {
    const t = this.t0();
    const dur = 6 + Math.random() * 6;
    const o = this.ac.createOscillator();
    o.frequency.value = Math.random() < 0.5 ? 1174.66 : 880;
    const e = this.ac.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.linearRampToValueAtTime(0.008, t + dur * 0.5);
    e.gain.linearRampToValueAtTime(0.0001, t + dur);
    const vib = this.ac.createOscillator(); vib.frequency.value = 4.5;
    const vg = this.ac.createGain(); vg.gain.value = 3;
    vib.connect(vg).connect(o.frequency);
    o.connect(e).connect(this.droneBus);
    o.start(t); o.stop(t + dur + 0.1);
    vib.start(t); vib.stop(t + dur + 0.1);
  }

  // ───────────────────────────────────────── the nut
  throwNut(p = 0) {
    const t = this.t0();
    const d = this.pan(this.sfx, p);
    this.burst(d, { kind: 'pink', f: 500, f2: 2400, q: 1.2, t, a: 0.06, dur: 0.3, g: 0.16 });
    // gauze flutter
    const ac = this.ac;
    const s = ac.createBufferSource(); s.buffer = this.A.noise('white');
    const hp = ac.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 3200; hp.Q.value = 0.8;
    const e = ac.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.linearRampToValueAtTime(0.035, t + 0.08);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    const am = ac.createOscillator(); am.type = 'square'; am.frequency.value = 17;
    const amg = ac.createGain(); amg.gain.value = 0.02;
    am.connect(amg).connect(e.gain);
    s.connect(hp).connect(e).connect(d);
    s.start(t); s.stop(t + 1); am.start(t); am.stop(t + 1);
  }

  land(surface, dist, p, soft = false) {
    const t = this.t0();
    const att = Math.max(0.12, 1 / (1 + dist * 0.18)) * (soft ? 0.6 : 1);
    const lp = this.ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3000 + 9000 / (1 + dist * 0.3);
    const d = this.pan(lp, p);
    lp.connect(this.sfx);
    const w = this.ac.createGain(); w.gain.value = 0.35 + dist * 0.04; lp.connect(w).connect(this.sfxWet);
    const clink = (tt, g) => {
      const base = 2200 + Math.random() * 500;
      for (const [m, dec] of [[1, 0.22], [1.58, 0.16], [2.31, 0.12], [3.05, 0.08]]) {
        this.tone(d, { f: base * m, t: tt, a: 0.001, dur: dec, g: g * 0.06 / m });
      }
      this.burst(d, { kind: 'white', f: 5000, q: 1, t: tt, a: 0.001, dur: 0.02, g: g * 0.08 });
    };
    if (surface === 'concrete' || surface === 'gravel' || surface === 'wetconcrete') {
      clink(t, att);
      clink(t + 0.16 + Math.random() * 0.05, att * 0.45);
      clink(t + 0.27 + Math.random() * 0.05, att * 0.15);
      if (surface === 'wetconcrete') this.burst(d, { kind: 'white', f: 1800, q: 0.7, t, dur: 0.12, g: att * 0.1 });
    } else if (surface === 'water') {
      this.burst(d, { kind: 'white', f: 1400, f2: 700, q: 0.8, t, a: 0.003, dur: 0.28, g: att * 0.25 });
      for (let i = 0; i < 4; i++) {
        const f = 500 + Math.random() * 700;
        this.tone(d, { f, f2: f * 2.2, t: t + 0.05 + Math.random() * 0.25, a: 0.002, dur: 0.05, g: att * 0.05 });
      }
    } else if (surface === 'sand') {
      this.burst(d, { kind: 'white', type: 'highpass', f: 2200, q: 0.5, t, a: 0.004, dur: 0.16, g: att * 0.12 });
      this.tone(d, { f: 110, f2: 60, t, a: 0.002, dur: 0.08, g: att * 0.18 });
    } else if (surface === 'wood') {
      this.tone(d, { f: 210, f2: 160, t, a: 0.001, dur: 0.1, g: att * 0.25 });
      clink(t + 0.004, att * 0.4);
    } else {
      // grass, mud
      this.burst(d, { kind: 'pink', type: 'lowpass', f: 700, q: 0.6, t, a: 0.003, dur: 0.09, g: att * 0.35 });
      this.tone(d, { f: 95, f2: 55, t, a: 0.002, dur: 0.07, g: att * 0.25 });
      this.burst(d, { kind: 'white', type: 'highpass', f: 3500, q: 0.4, t, a: 0.01, dur: 0.12, g: att * 0.05 });
      if (surface === 'mud') this.burst(d, { kind: 'pink', f: 900, f2: 300, q: 3, t: t + 0.02, dur: 0.12, g: att * 0.12 });
    }
  }

  pickup() {
    const t = this.t0();
    for (const [f, g] of [[2600, 0.03], [4100, 0.015]]) this.tone(this.sfx, { f, t, a: 0.001, dur: 0.15, g });
    this.burst(this.sfx, { kind: 'pink', f: 2500, q: 0.6, t: t + 0.03, dur: 0.18, g: 0.05 });
  }

  step(surface, side = 1) {
    const t = this.t0();
    const d = this.pan(this.sfx, side * 0.12);
    const g = 0.85 + Math.random() * 0.3;
    switch (surface) {
      case 'concrete':
        this.burst(d, { kind: 'pink', f: 1800, q: 1.4, t, a: 0.002, dur: 0.05, g: 0.06 * g });
        this.tone(d, { f: 80, f2: 50, t, a: 0.002, dur: 0.06, g: 0.12 * g });
        break;
      case 'gravel':
        for (let i = 0; i < 5; i++) this.burst(d, { kind: 'white', f: 2500 + Math.random() * 3000, q: 2, t: t + i * 0.012 + Math.random() * 0.02, a: 0.001, dur: 0.025, g: 0.05 * g });
        this.tone(d, { f: 75, f2: 45, t, a: 0.003, dur: 0.07, g: 0.1 * g });
        break;
      case 'water':
        this.burst(d, { kind: 'white', f: 1200, f2: 600, q: 0.7, t, a: 0.01, dur: 0.22, g: 0.1 * g });
        this.burst(d, { kind: 'pink', f: 400, q: 1, t: t + 0.02, a: 0.02, dur: 0.15, g: 0.08 * g });
        break;
      case 'sand':
        this.burst(d, { kind: 'white', type: 'highpass', f: 2600, q: 0.4, t, a: 0.02, dur: 0.16, g: 0.05 * g });
        this.tone(d, { f: 70, f2: 45, t, a: 0.01, dur: 0.08, g: 0.08 * g });
        break;
      case 'wood':
        this.tone(d, { f: 140, f2: 100, t, a: 0.002, dur: 0.08, g: 0.14 * g });
        this.burst(d, { kind: 'pink', f: 900, q: 1.2, t, a: 0.002, dur: 0.05, g: 0.05 * g });
        break;
      case 'wetconcrete':
        this.burst(d, { kind: 'pink', f: 1600, q: 1, t, a: 0.002, dur: 0.06, g: 0.06 * g });
        this.burst(d, { kind: 'white', f: 2400, q: 0.8, t: t + 0.01, a: 0.01, dur: 0.1, g: 0.035 * g });
        this.tone(d, { f: 80, f2: 50, t, a: 0.002, dur: 0.06, g: 0.1 * g });
        break;
      case 'mud':
        this.burst(d, { kind: 'pink', f: 700, f2: 250, q: 2.5, t, a: 0.01, dur: 0.16, g: 0.09 * g });
        this.tone(d, { f: 70, f2: 40, t, a: 0.01, dur: 0.08, g: 0.1 * g });
        break;
      default: // grass
        this.burst(d, { kind: 'white', type: 'highpass', f: 2000, q: 0.5, t, a: 0.02, dur: 0.2, g: 0.045 * g });
        this.tone(d, { f: 75, f2: 45, t, a: 0.004, dur: 0.07, g: 0.09 * g });
    }
  }

  // ───────────────────────────────────────── anomalies
  anomaly(type, p, dist) {
    const t = this.t0();
    const att = 1 / (1 + dist * 0.12);
    const d = this.pan(this.sfx, p);
    const w = this.ac.createGain(); w.gain.value = 0.9; d.connect(w).connect(this.sfxWet);
    if (type === 'haze') {
      this.tone(d, { f: 196, f2: 207, t, a: 0.25, dur: 1.4, g: 0.07 * att, curve: 'lin' });
      this.tone(d, { f: 199.5, f2: 190, t, a: 0.25, dur: 1.4, g: 0.06 * att, curve: 'lin' });
      this.tone(d, { type: 'triangle', f: 3150, f2: 3400, t, a: 0.3, dur: 1.1, g: 0.012 * att, curve: 'lin' });
      this.burst(d, { kind: 'pink', f: 5000, q: 6, t, a: 0.3, dur: 1.0, g: 0.04 * att });
    } else if (type === 'well') {
      this.tone(d, { f: 62, f2: 26, t, a: 0.004, dur: 0.9, g: 0.5 * att });
      this.burst(d, { kind: 'brown', type: 'lowpass', f: 300, q: 0.5, t, a: 0.003, dur: 0.4, g: 0.45 * att });
      this.tone(d, { type: 'triangle', f: 140, f2: 70, t: t - 0.25 > 0 ? t : t, a: 0.2, dur: 0.15, g: 0.05 * att });
    } else if (type === 'whirl') {
      const ac = this.ac;
      const s = ac.createBufferSource(); s.buffer = this.A.noise('pink'); s.loop = true;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 5;
      bp.frequency.setValueAtTime(300, t);
      bp.frequency.exponentialRampToValueAtTime(2600, t + 2.4);
      const e = ac.createGain();
      e.gain.setValueAtTime(0.0001, t);
      e.gain.linearRampToValueAtTime(0.25 * att, t + 0.6);
      e.gain.linearRampToValueAtTime(0.0001, t + 2.8);
      const am = ac.createOscillator(); am.frequency.setValueAtTime(3, t); am.frequency.linearRampToValueAtTime(14, t + 2.4);
      const amg = ac.createGain(); amg.gain.value = 0.12 * att;
      am.connect(amg).connect(e.gain);
      s.connect(bp).connect(e).connect(d);
      s.start(t); s.stop(t + 3); am.start(t); am.stop(t + 3);
      this.tone(d, { f: 110, f2: 440, t, a: 0.4, dur: 2.2, g: 0.05 * att, curve: 'lin' });
    } else if (type === 'back') {
      const ac = this.ac;
      const s = ac.createBufferSource();
      s.buffer = this.A.impulse(1.4, 1.6, true);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.8;
      const e = ac.createGain(); e.gain.value = 0.22 * att;
      s.connect(bp).connect(e).connect(d);
      s.start(t);
      this.tone(d, { f: 330, f2: 165, t, a: 0.6, dur: 0.9, g: 0.04 * att, curve: 'lin' });
      this.tone(d, { f: 165, f2: 330, t: t + 1.5, a: 0.4, dur: 0.9, g: 0.03 * att, curve: 'lin' });
    }
  }

  // a faint hum when you stand close to something you cannot see
  near(v) {
    if (!this.nearO) {
      const ac = this.ac;
      this.nearO = ac.createOscillator();
      this.nearO.frequency.value = 58;
      const o2 = ac.createOscillator(); o2.frequency.value = 61.3;
      this.nearG = ac.createGain(); this.nearG.gain.value = 0;
      this.nearO.connect(this.nearG); o2.connect(this.nearG);
      this.nearG.connect(this.sfx);
      this.nearO.start(); o2.start();
      this._loop(this.nearO); this._loop(o2);
    }
    this.nearG.gain.setTargetAtTime(Math.min(0.06, v * 0.06), this.now(), 0.3);
  }

  // the Zone pulls you back
  pull() {
    const t = this.t0();
    this.ambF.frequency.setTargetAtTime(260, t, 0.6);
    for (const v of this.voices) v.o.detune.setTargetAtTime(-260, t, 1.2);
    this.tone(this.sfx, { f: 70, f2: 900, t, a: 1.8, dur: 0.4, g: 0.12, curve: 'lin' });
    this.tone(this.sfx, { type: 'sawtooth', f: 35, f2: 140, t, a: 1.8, dur: 0.3, g: 0.05, curve: 'lin' });
    const s = this.ac.createBufferSource();
    s.buffer = this.A.impulse(2.2, 1.2, true);
    const e = this.ac.createGain(); e.gain.value = 0.35;
    s.connect(e).connect(this.sfx);
    const w = this.ac.createGain(); w.gain.value = 0.7; e.connect(w).connect(this.wet);
    s.start(t);
  }
  release() {
    const t = this.now();
    this.ambF.frequency.setTargetAtTime(18000, t, 1.2);
    for (const v of this.voices) v.o.detune.setTargetAtTime(v === this.voices[0] ? -4 : 0, t, 1.5);
    this.burst(this.sfx, { kind: 'pink', type: 'lowpass', f: 400, q: 0.5, t: this.t0(), a: 0.4, dur: 2.2, g: 0.08 });
  }

  // ───────────────────────────────────────── interface (NieR-ish blips, Souls-ish chimes)
  ui(kind = 'blip') {
    const t = this.t0();
    if (kind === 'blip') {
      this.tone(this.sfx, { type: 'square', f: 1320, t, a: 0.001, dur: 0.03, g: 0.018 });
      this.tone(this.sfx, { type: 'square', f: 1760, t: t + 0.045, a: 0.001, dur: 0.03, g: 0.014 });
    } else if (kind === 'open') {
      this.tone(this.sfx, { f: 660, f2: 990, t, a: 0.005, dur: 0.12, g: 0.05 });
      this.burst(this.sfx, { kind: 'white', f: 4000, q: 2, t, dur: 0.08, g: 0.03 });
    } else if (kind === 'close') {
      this.tone(this.sfx, { f: 990, f2: 520, t, a: 0.005, dur: 0.12, g: 0.04 });
    } else if (kind === 'tick') {
      this.tone(this.sfx, { type: 'square', f: 2000, t, a: 0.001, dur: 0.015, g: 0.012 });
    }
  }
  message() {
    const t = this.t0();
    this.tone(this.sfx, { f: 587.3, t, a: 0.01, dur: 1.6, g: 0.05 });
    this.tone(this.sfx, { f: 880, t: t + 0.07, a: 0.01, dur: 1.4, g: 0.035 });
    this.tone(this.sfxWet, { f: 1174.7, t: t + 0.12, a: 0.02, dur: 1.4, g: 0.02 });
    this.burst(this.sfxWet, { kind: 'pink', f: 3000, q: 0.8, t, a: 0.15, dur: 0.6, g: 0.025 });
  }
  appraise() {
    const t = this.t0();
    for (const [f, d] of [[587.33, 0], [739.99, 0.09], [880, 0.18]]) {
      this.tone(this.sfx, { type: 'triangle', f, t: t + d, a: 0.01, dur: 1.2, g: 0.045 });
      this.tone(this.sfxWet, { f: f * 2, t: t + d, a: 0.01, dur: 1.4, g: 0.012 });
    }
  }
  archive() {
    const t = this.t0();
    for (const [f, d] of [[1318.5, 0], [1975.5, 0.06], [2637, 0.12]]) this.tone(this.sfx, { f, t: t + d, a: 0.002, dur: 0.35, g: 0.03 });
    this.tone(this.sfx, { type: 'square', f: 330, t, a: 0.002, dur: 0.06, g: 0.02 });
    this.tone(this.sfxWet, { f: 2637, t: t + 0.12, a: 0.005, dur: 1.2, g: 0.012 });
  }
  phantom() {
    const t = this.t0();
    const s = this.ac.createBufferSource();
    s.buffer = this.A.impulse(1.6, 1.3, true);
    const bp = this.ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 2;
    const e = this.ac.createGain(); e.gain.value = 0.25;
    s.connect(bp).connect(e).connect(this.sfx);
    const w = this.ac.createGain(); w.gain.value = 1.2; e.connect(w).connect(this.wet);
    s.start(t);
    // whisper: formant-filtered noise
    for (const [f, d] of [[620, 0.4], [1100, 0.9], [800, 1.6]]) this.burst(this.sfxWet, { kind: 'white', f, q: 7, t: t + d, a: 0.15, dur: 0.5, g: 0.08 });
    this.tone(this.sfxWet, { f: 146.83, t, a: 1.2, dur: 3, g: 0.04, curve: 'lin' });
  }

  // ───────────────────────────────────────── bonfire
  ignite() {
    const t = this.t0();
    this.burst(this.sfx, { kind: 'pink', type: 'lowpass', f: 150, f2: 4200, q: 3, t, a: 0.05, dur: 1.2, g: 0.5 });
    this.burst(this.sfxWet, { kind: 'pink', type: 'lowpass', f: 300, f2: 2500, q: 1, t, a: 0.1, dur: 2.0, g: 0.3 });
    this.tone(this.sfx, { f: 55, f2: 41, t, a: 0.02, dur: 1.8, g: 0.3 });
    this.tone(this.sfxWet, { f: 73.42, t: t + 0.1, a: 0.6, dur: 4.5, g: 0.09, curve: 'lin' });
    this.tone(this.sfxWet, { f: 146.83, t: t + 0.2, a: 0.8, dur: 4, g: 0.04, curve: 'lin' });
    this.fire(true);
  }
  fire(on) {
    const ac = this.ac;
    if (on && !this.fireG) {
      this.fireG = ac.createGain();
      this.fireG.gain.value = 0;
      this.fireG.connect(this.sfx);
      const r = this.A.noiseLoop(this.fireG, { kind: 'brown', type: 'lowpass', freq: 380, q: 0.6, gain: 0.5 });
      this._loop(r.src);
      const h = this.A.noiseLoop(this.fireG, { kind: 'pink', type: 'bandpass', freq: 1800, q: 0.5, gain: 0.05 });
      this._loop(h.src);
      this.fireG.gain.setTargetAtTime(0.25, this.now(), 0.8);
      this._crackle = this.ctx.interval(() => {
        if (this.dead) return;
        const n = Math.random() < 0.5 ? 1 : 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const tt = this.t0(Math.random() * 0.25);
          this.burst(this.fireG, { kind: 'white', f: 2000 + Math.random() * 4000, q: 2, t: tt, a: 0.0005, dur: 0.01 + Math.random() * 0.02, g: 0.3 + Math.random() * 0.6 });
        }
      }, 140);
    }
  }
  fireLevel(v) { if (this.fireG) this.fireG.gain.setTargetAtTime(v, this.now(), 0.8); }
  lit() {
    const t = this.t0(0.2);
    // a low bell under the words
    for (const [f, g] of [[73.42, 0.12], [110, 0.06], [146.83, 0.05], [220, 0.025]]) this.tone(this.sfxWet, { f, t, a: 0.25, dur: 5.5, g });
  }

  // ───────────────────────────────────────── trains
  // You arrive: the car stands, the doors close, it leaves without you, singing up a scale.
  departure() {
    const ac = this.ac;
    const t = this.t0();
    const bus = ac.createGain();
    bus.gain.value = 0.9;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6000;
    bus.connect(lp).connect(this.out);
    const pn = ac.createStereoPanner(); pn.pan.value = 0.1;
    const w = ac.createGain(); w.gain.value = 0.4; lp.connect(w).connect(this.wet);
    bus.disconnect(); bus.connect(pn).connect(lp);
    // idle hum
    const hum = ac.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 120;
    const hl = ac.createBiquadFilter(); hl.type = 'lowpass'; hl.frequency.value = 300;
    const hg = ac.createGain(); hg.gain.value = 0.04;
    hum.connect(hl).connect(hg).connect(bus);
    hum.start(t); hum.stop(t + 30);
    hg.gain.setValueAtTime(0.04, t + 6);
    hg.gain.linearRampToValueAtTime(0.0001, t + 22);
    // door chime and doors
    const chime = (tt) => {
      this.tone(bus, { f: 1046.5, t: tt, a: 0.005, dur: 0.6, g: 0.06 });
      this.tone(bus, { f: 784, t: tt + 0.45, a: 0.005, dur: 0.9, g: 0.06 });
    };
    chime(t + 1.2);
    this.burst(bus, { kind: 'white', type: 'highpass', f: 3000, q: 0.5, t: t + 2.4, a: 0.02, dur: 0.7, g: 0.12 });
    this.tone(bus, { f: 90, f2: 60, t: t + 3.1, a: 0.003, dur: 0.15, g: 0.25 });
    this.burst(bus, { kind: 'pink', type: 'lowpass', f: 500, q: 0.6, t: t + 3.1, a: 0.002, dur: 0.12, g: 0.2 });
    // the inverter sings up a scale as it pulls away
    const go = t + 5.2;
    const steps = [349.2, 392, 440, 466.2, 523.3, 587.3, 659.3, 698.5, 784];
    const inv = ac.createOscillator(); inv.type = 'sawtooth';
    const inv2 = ac.createOscillator(); inv2.type = 'sine';
    const ig = ac.createGain(); ig.gain.value = 0;
    const ibp = ac.createBiquadFilter(); ibp.type = 'bandpass'; ibp.frequency.value = 900; ibp.Q.value = 1.4;
    inv.connect(ibp).connect(ig); inv2.connect(ig); ig.connect(bus);
    inv.frequency.setValueAtTime(steps[0] * 0.5, go);
    inv2.frequency.setValueAtTime(steps[0], go);
    let tt = go;
    steps.forEach((f, i) => {
      const dt = 0.55 + i * 0.12;
      inv.frequency.setTargetAtTime(f * 0.5, tt, 0.05);
      inv2.frequency.setTargetAtTime(f, tt, 0.05);
      inv.frequency.linearRampToValueAtTime(f * 0.5 * 1.02, tt + dt);
      tt += dt;
    });
    ig.gain.setValueAtTime(0.0001, go);
    ig.gain.linearRampToValueAtTime(0.05, go + 0.6);
    ig.gain.setValueAtTime(0.05, tt);
    ig.gain.linearRampToValueAtTime(0.0001, tt + 5);
    inv.start(go); inv2.start(go); inv.stop(tt + 5.2); inv2.stop(tt + 5.2);
    // wheels: ta-tan, ta-tan, accelerating then receding
    let ct = go + 2.5;
    while (ct < go + 26) {
      const tt = ct - go;
      const v = Math.max(1.5, 0.9 * tt);
      const dist = 0.45 * tt * tt;
      const g = 0.3 / (1 + dist * 0.04);
      const inner = Math.min(0.35, 2.1 / v);
      for (const off of [0, inner]) {
        this.tone(bus, { f: 70, f2: 45, t: ct + off, a: 0.002, dur: 0.07, g });
        this.burst(bus, { kind: 'pink', type: 'lowpass', f: 900 / (1 + dist * 0.02), q: 0.6, t: ct + off, a: 0.002, dur: 0.06, g: g * 0.8 });
      }
      ct += 12.5 / v;
    }
    // rumble
    const rs = ac.createBufferSource(); rs.buffer = this.A.noise('brown'); rs.loop = true;
    const rl = ac.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 220;
    const rg = ac.createGain();
    rg.gain.setValueAtTime(0.0001, go);
    rg.gain.linearRampToValueAtTime(0.35, go + 4);
    rg.gain.linearRampToValueAtTime(0.0001, go + 24);
    rs.connect(rl).connect(rg).connect(bus);
    rs.start(go); rs.stop(go + 25);
    lp.frequency.setValueAtTime(6000, go + 6);
    lp.frequency.exponentialRampToValueAtTime(500, go + 24);
    pn.pan.setValueAtTime(0.1, go);
    pn.pan.linearRampToValueAtTime(-0.6, go + 16);
    return go - t;
  }

  // Coda: a train passes, unseen. Glass trembles. Somewhere, a choir.
  coda() {
    const ac = this.ac;
    const t = this.t0(1.5);
    const bus = ac.createGain(); bus.gain.value = 1;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
    bus.connect(lp).connect(this.out);
    const w = ac.createGain(); w.gain.value = 0.5; lp.connect(w).connect(this.wet);
    const len = 30;
    const env = (g, peak) => {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak * 0.3, t + 6);
      g.gain.linearRampToValueAtTime(peak, t + 12);
      g.gain.setValueAtTime(peak, t + 18);
      g.gain.linearRampToValueAtTime(0.0001, t + len);
    };
    const rs = ac.createBufferSource(); rs.buffer = this.A.noise('brown'); rs.loop = true;
    const rg = ac.createGain(); env(rg, 0.7);
    rs.connect(rg).connect(bus);
    rs.start(t); rs.stop(t + len + 0.5);
    lp.frequency.setValueAtTime(250, t);
    lp.frequency.linearRampToValueAtTime(900, t + 14);
    lp.frequency.linearRampToValueAtTime(220, t + len);
    // clacks of a long train
    for (let ct = t + 4; ct < t + len - 3; ct += 1.33) {
      const ph = (ct - t) / len;
      const g = Math.sin(Math.PI * Math.min(1, Math.max(0, ph))) * 0.35;
      for (const off of [0, 0.13, 0.95, 1.08]) {
        if (ct + off > t + len - 3) continue;
        this.tone(bus, { f: 60, f2: 40, t: ct + off, a: 0.002, dur: 0.08, g });
        this.burst(bus, { kind: 'pink', type: 'lowpass', f: 700, q: 0.7, t: ct + off, dur: 0.06, g: g * 0.7 });
      }
    }
    // glass: tiny rattles while it trembles
    for (let k = 0; k < 70; k++) {
      const tt = t + 9 + Math.random() * 13;
      const f = 3800 + Math.random() * 2600;
      this.tone(this.sfx, { f, t: tt, a: 0.0005, dur: 0.03 + Math.random() * 0.05, g: 0.006 + Math.random() * 0.01 });
    }
    // the choir, far away (public-domain melody)
    this.choir(t + 7);
    return t;
  }

  scrape(dur = 0.4) {
    const t = this.t0();
    this.burst(this.sfx, { kind: 'white', f: 3200, q: 4, t, a: 0.02, dur, g: 0.03 });
    this.burst(this.sfx, { kind: 'pink', f: 1100, q: 6, t, a: 0.02, dur, g: 0.025 });
  }

  choir(t0) {
    const ac = this.ac;
    const bus = ac.createGain(); bus.gain.value = 0;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1900;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 160;
    bus.connect(hp).connect(lp);
    lp.connect(this.out);
    const w = ac.createGain(); w.gain.value = 2.2; lp.connect(w).connect(this.wet);
    bus.gain.setValueAtTime(0.0001, t0);
    bus.gain.linearRampToValueAtTime(0.055, t0 + 8);
    // formants "ah"
    const forms = [[730, 9, 1], [1090, 10, 0.5], [2440, 12, 0.25]].map(([f, q, g]) => {
      const b = ac.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q;
      const gg = ac.createGain(); gg.gain.value = g * 6;
      b.connect(gg).connect(bus);
      return b;
    });
    const vibs = [];
    const voice = (det) => {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.detune.value = det;
      const vib = ac.createOscillator(); vib.frequency.value = 4.8 + Math.random();
      const vg = ac.createGain(); vg.gain.value = 9;
      vib.connect(vg).connect(o.detune);
      for (const f of forms) o.connect(f);
      vib.start(t0); o.start(t0);
      vibs.push(vib);
      return o;
    };
    const mel = [voice(-6), voice(7)];
    const low = [voice(-3), voice(4)];
    const bass = ac.createOscillator(); bass.type = 'triangle';
    const bg = ac.createGain(); bg.gain.value = 0.05;
    bass.connect(bg).connect(bus);
    bass.start(t0);
    // degrees: 3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 3. 2 2 | 3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 2. 1 1
    const D = { 1: 62, 2: 64, 3: 66, 4: 67, 5: 69 };
    const seq = [[3, 1], [3, 1], [4, 1], [5, 1], [5, 1], [4, 1], [3, 1], [2, 1], [1, 1], [1, 1], [2, 1], [3, 1], [3, 1.5], [2, 0.5], [2, 2],
      [3, 1], [3, 1], [4, 1], [5, 1], [5, 1], [4, 1], [3, 1], [2, 1], [1, 1], [1, 1], [2, 1], [3, 1], [2, 1.5], [1, 0.5], [1, 2.5]];
    const third = { 1: 66 - 12 + 0, 2: 67 - 12, 3: 69 - 12, 4: 71 - 12, 5: 73 - 12 };
    const bassFor = (deg) => (deg === 2 || deg === 4 || deg === 5 ? 45 : 38);
    const beat = 60 / 64;
    let t = t0;
    for (const [deg, dur] of seq) {
      const f = mtof(D[deg]);
      for (const o of mel) o.frequency.setTargetAtTime(f, t, 0.03);
      for (const o of low) o.frequency.setTargetAtTime(mtof(third[deg] - 3), t, 0.04);
      bass.frequency.setTargetAtTime(mtof(bassFor(deg)), t, 0.08);
      t += dur * beat;
    }
    bus.gain.setValueAtTime(0.055, t - 6);
    bus.gain.linearRampToValueAtTime(0.0001, t + 3);
    for (const o of [...mel, ...low, bass, ...vibs]) o.stop(t + 3.5);
    return t;
  }
}
