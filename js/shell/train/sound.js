// The sound of the ひかり線: a diesel under the floor, jointed rail, brakes, doors, chimes,
// and the world outside leaking in through the glass. All synthesized; nothing is sampled.
import { mtof, driveCurve } from '../../lib/audio.js';
import { rng } from './gl.js';

function render(ac, seconds, fn, channels = 1) {
  const sr = ac.sampleRate, len = Math.max(1, Math.floor(sr * seconds));
  const buf = ac.createBuffer(channels, len, sr);
  for (let c = 0; c < channels; c++) fn(buf.getChannelData(c), sr, c);
  return buf;
}

export class TrainAudio {
  constructor(ctx) {
    this.ctx = ctx;
    const A = (this.A = ctx.audio);
    const ac = (this.ac = A.ac);
    this.alive = true;
    this.nodes = [];
    // ── buses ──
    this.bus = ac.createGain(); this.bus.gain.value = 1;
    this.muffle = ac.createBiquadFilter(); this.muffle.type = 'lowpass'; this.muffle.frequency.value = 16000; this.muffle.Q.value = 0.5;
    this.bus.connect(this.muffle).connect(ctx.out);
    this.wet = ac.createGain(); this.wet.gain.value = 0.18;
    this.bus.connect(this.wet).connect(ctx.send);
    this.chimeBus = ac.createGain(); this.chimeBus.gain.value = 0.9;
    this.chimeBus.connect(ctx.out);
    const cs = ac.createGain(); cs.gain.value = 0.55; this.chimeBus.connect(cs).connect(ctx.send);
    // the world outside, heard through glass
    this.outBus = ac.createGain(); this.outBus.gain.value = 1;
    this.glass = ac.createBiquadFilter(); this.glass.type = 'lowpass'; this.glass.frequency.value = 3200; this.glass.Q.value = 0.4;
    this.outBus.connect(this.glass).connect(this.bus);

    // ── diesel engine ──
    this.engF = 30;
    const eng = ac.createGain(); eng.gain.value = 0.0;
    const shaper = ac.createWaveShaper(); shaper.curve = driveCurve(10); shaper.oversample = '2x';
    const elp = ac.createBiquadFilter(); elp.type = 'lowpass'; elp.frequency.value = 220; elp.Q.value = 2.4;
    const floorlp = ac.createBiquadFilter(); floorlp.type = 'lowpass'; floorlp.frequency.value = 900;
    this.o1 = ac.createOscillator(); this.o1.type = 'sawtooth';
    this.o2 = ac.createOscillator(); this.o2.type = 'square';
    this.o3 = ac.createOscillator(); this.o3.type = 'sawtooth';
    const g1 = ac.createGain(); g1.gain.value = 0.5;
    const g2 = ac.createGain(); g2.gain.value = 0.25;
    const g3 = ac.createGain(); g3.gain.value = 0.18;
    this.o1.connect(g1).connect(shaper); this.o2.connect(g2).connect(shaper); this.o3.connect(g3).connect(shaper);
    shaper.connect(elp).connect(floorlp).connect(eng).connect(this.bus);
    // valve clatter, pulsing with the firing
    const clat = A.noiseLoop(ac.createGain(), { kind: 'white', type: 'bandpass', freq: 1300, q: 1.4, gain: 1 });
    clat.gain.disconnect();
    const clatAM = ac.createGain(); clatAM.gain.value = 0;
    this.lfo = ac.createOscillator(); this.lfo.type = 'square';
    const lfoG = ac.createGain(); lfoG.gain.value = 0.5;
    this.lfo.connect(lfoG).connect(clatAM.gain);
    const clatOut = ac.createGain(); clatOut.gain.value = 0.0;
    clat.gain.connect(clatAM).connect(clatOut).connect(floorlp);
    [this.o1, this.o2, this.o3, this.lfo].forEach((o) => o.start());
    this.eng = eng; this.elp = elp; this.clatOut = clatOut; this.clat = clat;

    // ── rolling, hiss, wind ──
    this.roll = A.noiseLoop(this.bus, { kind: 'brown', type: 'lowpass', freq: 240, q: 0.9, gain: 0 });
    const body = ac.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 115; body.gain.value = 7; body.Q.value = 1.6;
    this.roll.filter.disconnect(); this.roll.filter.connect(body).connect(this.roll.gain);
    this.hiss = A.noiseLoop(this.bus, { kind: 'pink', type: 'bandpass', freq: 1400, q: 0.6, gain: 0 });
    this.wind = A.noiseLoop(this.bus, { kind: 'pink', type: 'highpass', freq: 2400, q: 0.5, gain: 0 });
    // flange squeal on curves
    this.sq = ac.createOscillator(); this.sq.type = 'sine'; this.sq.frequency.value = 3150;
    this.sqG = ac.createGain(); this.sqG.gain.value = 0;
    this.sq.connect(this.sqG).connect(this.bus); this.sq.start();
    // brake squeal
    this.br1 = ac.createOscillator(); this.br1.type = 'triangle'; this.br1.frequency.value = 2480;
    this.br2 = ac.createOscillator(); this.br2.type = 'sine'; this.br2.frequency.value = 3720;
    const brBP = ac.createBiquadFilter(); brBP.type = 'bandpass'; brBP.frequency.value = 2900; brBP.Q.value = 2;
    this.brG = ac.createGain(); this.brG.gain.value = 0;
    this.br1.connect(brBP); this.br2.connect(brBP); brBP.connect(this.brG).connect(this.bus);
    this.br1.start(); this.br2.start();
    // fluorescent hum
    this.hum = ac.createOscillator(); this.hum.frequency.value = 100;
    this.humG = ac.createGain(); this.humG.gain.value = 0.0;
    const hum2 = ac.createOscillator(); hum2.frequency.value = 200; const h2g = ac.createGain(); h2g.gain.value = 0.4;
    hum2.connect(h2g).connect(this.humG);
    this.hum.connect(this.humG).connect(this.bus); this.hum.start(); hum2.start();
    this.hum2 = hum2;
    // rain on the roof and glass
    this.rain = A.noiseLoop(this.bus, { kind: 'pink', type: 'highpass', freq: 1800, q: 0.4, gain: 0 });
    // tunnel: a short slap-back that makes the rumble enormous
    this.tun = ac.createDelay(0.1); this.tun.delayTime.value = 0.032;
    this.tunFb = ac.createGain(); this.tunFb.gain.value = 0;
    this.tunOut = ac.createGain(); this.tunOut.gain.value = 0;
    this.roll.gain.connect(this.tun); this.tun.connect(this.tunFb).connect(this.tun);
    this.tun.connect(this.tunOut).connect(this.bus);

    // precomputed one-shots
    this.clacks = [0, 1, 2, 3].map((v) => this.makeClack(v));
    this.amb = { a: null, b: null, mix: 0 };
    this.t = 0;
    this.nextEvent = 0;
  }

  makeClack(v) {
    const r = rng(v * 31 + 7);
    return render(this.ac, 0.42, (d, sr) => {
      let lp = 0, lp2 = 0, ph = 0;
      const f0 = 58 + v * 6;
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const f = f0 + 46 * Math.exp(-t * 32);
        ph += (2 * Math.PI * f) / sr;
        const thump = Math.sin(ph) * Math.exp(-t * 16) * 0.95;
        const n = r() * 2 - 1;
        lp += (n - lp) * 0.06;
        const knock = lp * Math.exp(-t * 40) * 2.2;
        lp2 += (n - lp2) * 0.55;
        const tick = (n - lp2) * Math.exp(-t * 170) * 0.3;
        const ring = (Math.sin(2 * Math.PI * (1130 + v * 40) * t) * 0.5 + Math.sin(2 * Math.PI * 1710 * t) * 0.3 + Math.sin(2 * Math.PI * 2630 * t) * 0.2) * Math.exp(-t * 26) * 0.07;
        d[i] = (thump + knock + tick + ring) * 0.8;
      }
    });
  }

  now() { return this.ac.currentTime; }

  // one wheel crossing one rail joint
  clack(delay, amp, pan = 0) {
    if (!this.alive || amp <= 0.002) return;
    const ac = this.ac;
    const t = ac.currentTime + Math.max(0, delay);
    const src = ac.createBufferSource();
    src.buffer = this.clacks[Math.floor(Math.random() * this.clacks.length)];
    src.playbackRate.value = 0.92 + Math.random() * 0.16;
    const g = ac.createGain(); g.gain.value = amp;
    const p = ac.createStereoPanner(); p.pan.value = pan;
    src.connect(g).connect(p).connect(this.bus);
    src.start(t);
    src.onended = () => { try { p.disconnect(); } catch (e) {} };
  }

  // continuous state: called every frame
  update(dt, st) {
    if (!this.alive) return;
    const ac = this.ac, t = ac.currentTime;
    const v = Math.max(0, st.speed);
    const k = Math.min(1, v / 16);
    const throttle = st.throttle;
    // engine: idle lope when standing, a growl under notch, quiet when coasting
    const targetF = 27 + throttle * 22 + k * 8;
    this.engF += (targetF - this.engF) * Math.min(1, dt * 1.6);
    const f = this.engF;
    this.o1.frequency.setTargetAtTime(f, t, 0.05);
    this.o2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
    this.o3.frequency.setTargetAtTime(f * 2.013, t, 0.05);
    this.lfo.frequency.setTargetAtTime(f * 1.5, t, 0.05);
    this.elp.frequency.setTargetAtTime(150 + throttle * 650 + k * 120, t, 0.08);
    this.eng.gain.setTargetAtTime(st.engineOn ? 0.1 + throttle * 0.13 : 0, t, 0.25);
    this.clatOut.gain.setTargetAtTime(st.engineOn ? 0.012 + throttle * 0.03 : 0, t, 0.2);
    // rolling
    const tunnel = st.tunnel;
    this.roll.gain.gain.setTargetAtTime(0.38 * Math.pow(k, 1.1) * (1 + tunnel * 0.7), t, 0.1);
    this.hiss.gain.gain.setTargetAtTime(0.05 * Math.pow(k, 1.6) * (1 + tunnel * 1.4), t, 0.1);
    this.wind.gain.gain.setTargetAtTime(0.02 * k * k * (1 - tunnel * 0.5) * (st.windowOpen ? 3 : 1), t, 0.2);
    this.sqG.gain.setTargetAtTime(Math.min(0.012, Math.abs(st.curv) * v * 0.012) * (v > 6 ? 1 : 0), t, 0.3);
    this.sq.frequency.setTargetAtTime(3150 + Math.sin(t * 0.7) * 60, t, 0.2);
    // brakes sing in the last few metres
    const squeal = st.braking * Math.max(0, 1 - Math.abs(v - 3.2) / 4.2) * (v > 0.25 ? 1 : 0);
    this.brG.gain.setTargetAtTime(squeal * 0.022, t, 0.08);
    this.br1.frequency.setTargetAtTime(2480 + Math.sin(t * 9.1) * 35 + v * 20, t, 0.02);
    this.br2.frequency.setTargetAtTime(3720 + Math.sin(t * 6.3) * 50, t, 0.02);
    this.humG.gain.setTargetAtTime(0.0035 * st.fluor * (st.flicker ? 2.5 : 1), t, 0.05);
    this.rain.gain.gain.setTargetAtTime(0.05 * st.rain, t, 0.5);
    this.tunFb.gain.setTargetAtTime(tunnel * 0.55, t, 0.2);
    this.tunOut.gain.setTargetAtTime(tunnel * 0.6, t, 0.2);
    this.glass.frequency.setTargetAtTime(st.windowOpen ? 9000 : 3200, t, 0.3);
    this.outBus.gain.setTargetAtTime(1 - tunnel * 0.9, t, 0.3);
    this.updateAmbience(dt, st);
  }

  // ears pop: a pressure thump and a moment of cotton wool
  tunnelEnter() {
    const ac = this.ac, t = ac.currentTime;
    const o = ac.createOscillator(); o.frequency.setValueAtTime(42, t); o.frequency.exponentialRampToValueAtTime(22, t + 0.5);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.32, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(g).connect(this.bus); o.start(t); o.stop(t + 0.8);
    const f = this.muffle.frequency;
    f.cancelScheduledValues(t);
    f.setValueAtTime(f.value, t);
    f.exponentialRampToValueAtTime(700, t + 0.08);
    f.exponentialRampToValueAtTime(5000, t + 1.0);
    f.exponentialRampToValueAtTime(16000, t + 2.2);
    this.whoosh(0.5);
  }
  tunnelExit() { this.whoosh(0.35); }

  whoosh(amp) {
    const ac = this.ac, t = ac.currentTime;
    const src = ac.createBufferSource(); src.buffer = this.A.noise('pink'); src.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(2400, t + 0.35); bp.frequency.exponentialRampToValueAtTime(400, t + 1.1);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(amp * 0.5, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    src.connect(bp).connect(g).connect(this.bus);
    src.start(t, Math.random()); src.stop(t + 1.3);
  }

  // ── chimes ──
  bell(t, midi, dur, amp, { ratio = 3.5, index = 2.2, dest = this.chimeBus, detune = 0 } = {}) {
    const ac = this.ac;
    const f = mtof(midi) * Math.pow(2, detune / 1200);
    const car = ac.createOscillator(); car.frequency.value = f;
    const mod = ac.createOscillator(); mod.frequency.value = f * ratio;
    const mg = ac.createGain(); mg.gain.setValueAtTime(f * index, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + dur * 0.6);
    mod.connect(mg).connect(car.frequency);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(amp, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const warm = ac.createOscillator(); warm.frequency.value = f / 2; warm.type = 'sine';
    const wg = ac.createGain(); wg.gain.setValueAtTime(0.0001, t); wg.gain.linearRampToValueAtTime(amp * 0.35, t + 0.01); wg.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.8);
    car.connect(g).connect(dest); warm.connect(wg).connect(dest);
    [car, mod, warm].forEach((o) => { o.start(t); o.stop(t + dur + 0.05); });
  }

  // the Hikari Line's own little melody, played before each arrival
  approachChime() {
    const t0 = this.now() + 0.05;
    const notes = [[76, 0.2], [80, 0.2], [83, 0.2], [88, 0.4], [87, 0.2], [83, 0.2], [85, 0.4], [83, 0.2], [80, 0.2], [78, 0.2], [80, 1.1]];
    let t = t0;
    for (const [m, d] of notes) { this.bell(t, m, Math.max(0.6, d * 3), 0.07, { ratio: 2.0, index: 1.4 }); t += d * 0.95; }
    return t - t0;
  }
  announceChime() {
    const t = this.now() + 0.02;
    this.bell(t, 79, 1.2, 0.06, { ratio: 2, index: 1 });
    this.bell(t + 0.28, 84, 1.8, 0.06, { ratio: 2, index: 1 });
  }
  // ピンポーン — and the request is in
  buttonChime() {
    const t = this.now() + 0.01;
    const sp = this.ac.createBiquadFilter(); sp.type = 'bandpass'; sp.frequency.value = 1400; sp.Q.value = 0.5;
    const g = this.ac.createGain(); g.gain.value = 1;
    sp.connect(g).connect(this.chimeBus);
    this.bell(t, 84, 0.45, 0.12, { ratio: 1.0, index: 0.6, dest: sp });
    this.bell(t + 0.2, 80, 1.9, 0.12, { ratio: 1.0, index: 0.6, dest: sp });
  }
  doorChime() {
    const t = this.now() + 0.02;
    for (let i = 0; i < 3; i++) { this.bell(t + i * 0.62, 88, 0.5, 0.06, { ratio: 1, index: 0.5 }); this.bell(t + i * 0.62 + 0.24, 84, 0.6, 0.06, { ratio: 1, index: 0.5 }); }
  }
  beep(freq = 2000, dur = 0.06, amp = 0.03) {
    const ac = this.ac, t = ac.currentTime;
    const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = freq;
    const g = ac.createGain(); g.gain.setValueAtTime(amp, t); g.gain.setValueAtTime(0.0001, t + dur);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000;
    o.connect(lp).connect(g).connect(this.bus); o.start(t); o.stop(t + dur + 0.02);
  }

  // pneumatic door: hiss, slide, thump
  door(open) {
    const ac = this.ac, t = ac.currentTime;
    const src = ac.createBufferSource(); src.buffer = this.A.noise('white'); src.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(open ? 3800 : 2600, t); bp.frequency.exponentialRampToValueAtTime(open ? 1200 : 900, t + 0.7);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.11, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
    src.connect(bp).connect(g).connect(this.bus); src.start(t, Math.random()); src.stop(t + 0.9);
    // rumble of the leaves on their rollers
    const rl = ac.createBufferSource(); rl.buffer = this.A.noise('brown'); rl.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300;
    const rg = ac.createGain(); rg.gain.setValueAtTime(0.0001, t + 0.1); rg.gain.linearRampToValueAtTime(0.25, t + 0.25); rg.gain.linearRampToValueAtTime(0.0001, t + 1.0);
    rl.connect(lp).connect(rg).connect(this.bus); rl.start(t, Math.random()); rl.stop(t + 1.1);
    const tt = t + 1.0;
    const o = ac.createOscillator(); o.frequency.setValueAtTime(open ? 90 : 70, tt); o.frequency.exponentialRampToValueAtTime(40, tt + 0.2);
    const og = ac.createGain(); og.gain.setValueAtTime(0.0001, tt); og.gain.linearRampToValueAtTime(open ? 0.12 : 0.3, tt + 0.005); og.gain.exponentialRampToValueAtTime(0.0001, tt + 0.25);
    o.connect(og).connect(this.bus); o.start(tt); o.stop(tt + 0.3);
  }

  // air brake: application and release
  air(release = false, amp = 0.08) {
    const ac = this.ac, t = ac.currentTime;
    const src = ac.createBufferSource(); src.buffer = this.A.noise('white'); src.loop = true;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = release ? 1800 : 2600;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(amp, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (release ? 1.6 : 0.5));
    src.connect(hp).connect(g).connect(this.bus); src.start(t, Math.random()); src.stop(t + 1.7);
  }
  // the car settling on its springs when it stops
  settle() {
    const ac = this.ac, t = ac.currentTime;
    const o = ac.createOscillator(); o.frequency.setValueAtTime(55, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.4);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.2, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(this.bus); o.start(t); o.stop(t + 0.6);
  }

  // a can rolling on the floor; tink when it hits something
  can(roll, hit) {
    const ac = this.ac, t = ac.currentTime;
    if (!this.canN) {
      this.canN = this.A.noiseLoop(this.bus, { kind: 'pink', type: 'bandpass', freq: 700, q: 2.5, gain: 0 });
    }
    this.canN.gain.gain.setTargetAtTime(Math.min(0.05, Math.abs(roll) * 0.08), t, 0.05);
    if (hit > 0.05) {
      this.bell(t, 98 + Math.random() * 3, 0.35, Math.min(0.05, hit * 0.06), { ratio: 2.76, index: 3, dest: this.bus });
      this.bell(t, 91, 0.2, Math.min(0.03, hit * 0.03), { ratio: 1.41, index: 2, dest: this.bus });
    }
  }

  // a ticket printing: a little motor, a cut
  ticket() {
    const ac = this.ac, t = ac.currentTime;
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 130;
    const am = ac.createOscillator(); am.frequency.value = 38; const amg = ac.createGain(); amg.gain.value = 0.5;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.02); g.gain.setValueAtTime(0.05, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500;
    am.connect(amg).connect(g.gain);
    o.connect(lp).connect(g).connect(this.bus);
    o.start(t); am.start(t); o.stop(t + 0.62); am.stop(t + 0.62);
    this.bell(t + 0.6, 96, 0.08, 0.03, { ratio: 3.1, index: 4, dest: this.bus });
  }

  // 踏切: a crossing bell that swells, slides down in pitch and is gone
  crossing(st) {
    // st: { pos: () => relative x (m), speed: () => m/s }
    const ac = this.ac;
    const start = ac.currentTime + 0.02;
    let t = start;
    const strikes = [];
    for (let i = 0; i < 22; i++) strikes.push(t + i * 0.36);
    const g = ac.createGain(); g.gain.value = 1;
    const p = ac.createStereoPanner(); p.pan.value = -0.5;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5000;
    g.connect(lp).connect(p).connect(this.outBus);
    this.crossingNodes = { g, p, lp, strikes, i: 0, st };
  }
  updateCrossing() {
    const c = this.crossingNodes;
    if (!c) return;
    const ac = this.ac;
    while (c.i < c.strikes.length && c.strikes[c.i] < ac.currentTime + 0.1) {
      const x = c.st.pos(), v = c.st.speed();
      const dist = Math.hypot(x, 6);
      const vr = (-v * x) / dist;            // positive = receding
      const dop = 343 / (343 + vr);
      const amp = 0.09 / (1 + dist / 9);
      const midi = 81 + (c.i % 2 ? -1.1 : 0);
      const tt = Math.max(c.strikes[c.i], ac.currentTime);
      this.bell(tt, midi + 12 * Math.log2(dop), 0.42, amp, { ratio: 2.76, index: 1.6, dest: c.g });
      c.p.pan.setTargetAtTime(Math.max(-0.9, Math.min(0.9, -x / 25)), tt, 0.1);
      c.lp.frequency.setTargetAtTime(2500 + 6000 / (1 + dist / 15), tt, 0.1);
      c.i++;
    }
    if (c.i >= c.strikes.length) this.crossingNodes = null;
  }

  // ── what you hear outside, per world ──
  setAmbience(id) {
    if (this.ambId === id) return;
    this.ambId = id;
    const ac = this.ac, t = ac.currentTime;
    if (this.ambNode) { const old = this.ambNode; old.out.gain.setTargetAtTime(0, t, 0.8); setTimeout(() => old.stop(), 4000); }
    this.ambNode = this.makeAmb(id);
    if (this.ambNode) { this.ambNode.out.gain.setValueAtTime(0, t); this.ambNode.out.gain.setTargetAtTime(this.ambNode.level || 1, t + 0.2, 1.2); }
  }

  makeAmb(id) {
    const ac = this.ac, A = this.A;
    const out = ac.createGain(); out.connect(this.outBus);
    const stops = [];
    const loop = (o) => { stops.push(() => o.stop()); return o; };
    const node = { out, stop: () => { stops.forEach((f) => f()); try { out.disconnect(); } catch (e) {} }, tick: null, level: 1 };
    if (id === 'summer') {
      // a bed of cicadas: shimmering noise, chopped
      const bed = loop(A.noiseLoop(ac.createGain(), { kind: 'white', type: 'bandpass', freq: 4800, q: 3, gain: 1 }));
      bed.gain.disconnect();
      const am = ac.createGain(); am.gain.value = 0.0;
      const lfo = ac.createOscillator(); lfo.frequency.value = 76; const lg = ac.createGain(); lg.gain.value = 0.5;
      lfo.connect(lg).connect(am.gain); lfo.start(); stops.push(() => lfo.stop());
      const slow = ac.createGain(); slow.gain.value = 0.02;
      bed.gain.connect(am).connect(slow).connect(out);
      node.tick = (t) => { slow.gain.setTargetAtTime(0.014 + 0.012 * (0.5 + 0.5 * Math.sin(t * 0.13)), ac.currentTime, 1); };
      node.every = [9, 18, () => this.higurashi(out)];
    } else if (id === 'city') {
      const hum = loop(A.noiseLoop(out, { kind: 'brown', type: 'lowpass', freq: 320, q: 0.6, gain: 0.08 }));
      node.every = [6, 14, () => this.horn(out)];
    } else if (id === 'aero') {
      const pad = ac.createGain(); pad.gain.value = 0.012; pad.connect(out);
      [60, 64, 67, 71, 74].forEach((m, i) => {
        const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(m);
        const g = ac.createGain(); g.gain.value = 0.5;
        const l = ac.createOscillator(); l.frequency.value = 0.07 + i * 0.03; const lg = ac.createGain(); lg.gain.value = 0.4;
        l.connect(lg).connect(g.gain);
        o.connect(g).connect(pad); o.start(); l.start(); stops.push(() => { o.stop(); l.stop(); });
      });
      loop(A.noiseLoop(out, { kind: 'pink', type: 'bandpass', freq: 900, q: 0.4, gain: 0.012 }));
      node.every = [1.5, 4, () => this.bloop(out)];
    } else if (id === 'circles') {
      node.level = 1;
      node.beat = 60 / 180;
      node.lastBeat = 0;
    } else if (id === 'rage') {
      loop(A.noiseLoop(out, { kind: 'brown', type: 'lowpass', freq: 180, q: 1.2, gain: 0.12 }));
    } else if (id === 'zone') {
      const w = loop(A.noiseLoop(out, { kind: 'pink', type: 'bandpass', freq: 420, q: 0.7, gain: 0.04 }));
      node.tick = (t) => { w.gain.gain.setTargetAtTime(0.025 + 0.025 * Math.max(0, Math.sin(t * 0.21) + Math.sin(t * 0.077)), ac.currentTime, 1.5); };
      const dr = ac.createOscillator(); dr.frequency.value = 55; const dg = ac.createGain(); dg.gain.value = 0.006;
      dr.connect(dg).connect(out); dr.start(); stops.push(() => dr.stop());
      node.every = [7, 16, () => this.creak(out)];
    } else if (id === 'coast') {
      const waves = loop(A.noiseLoop(out, { kind: 'pink', type: 'lowpass', freq: 700, q: 0.5, gain: 0.0 }));
      node.tick = (t) => { const s = 0.5 + 0.5 * Math.sin(t * 0.8) * Math.sin(t * 0.23 + 1); waves.gain.gain.setTargetAtTime(0.02 + 0.06 * s * s, ac.currentTime, 0.6); };
      node.every = [8, 20, () => this.gull(out)];
    } else if (id === 'ginga') {
      const pad = ac.createGain(); pad.gain.value = 0.0; pad.connect(this.chimeBus);
      pad.gain.setTargetAtTime(0.03, ac.currentTime, 4);
      [52, 59, 64, 68, 71, 76].forEach((m, i) => {
        const o = ac.createOscillator(); o.type = i % 2 ? 'sine' : 'triangle'; o.frequency.value = mtof(m);
        o.detune.value = (i - 2.5) * 4;
        const g = ac.createGain(); g.gain.value = 0.18;
        const l = ac.createOscillator(); l.frequency.value = 0.05 + i * 0.021; const lg = ac.createGain(); lg.gain.value = 0.12;
        l.connect(lg).connect(g.gain);
        o.connect(g).connect(pad); o.start(); l.start(); stops.push(() => { o.stop(); l.stop(); });
      });
      stops.push(() => { try { pad.disconnect(); } catch (e) {} });
      node.every = [2.2, 3.6, () => this.musicBox()];
    } else if (id === 'tunnel') {
      return null;
    }
    return node;
  }

  updateAmbience(dt, st) {
    const n = this.ambNode;
    const t = this.ac.currentTime;
    if (!n) return;
    if (n.tick) n.tick(t);
    if (n.every) {
      if (!n.next) n.next = t + n.every[0] * 0.5;
      if (t >= n.next) { n.every[2](); n.next = t + n.every[0] + Math.random() * (n.every[1] - n.every[0]); }
    }
  }

  higurashi(dest) {
    // kana-kana-kana: a falling, slowing chirr in the evening
    const ac = this.ac;
    let t = ac.currentTime + 0.05;
    const n = 10 + Math.floor(Math.random() * 6);
    const base = 4300 + Math.random() * 300;
    const pan = ac.createStereoPanner(); pan.pan.value = (Math.random() - 0.5) * 1.4;
    pan.connect(dest);
    for (let i = 0; i < n; i++) {
      const f = base * (1 - i * 0.012);
      const o = ac.createOscillator(); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.8, t + 0.07);
      const am = ac.createOscillator(); am.frequency.value = 180; const amg = ac.createGain(); amg.gain.value = 0.5;
      const g = ac.createGain(); const peak = 0.02 * (1 - i / n) + 0.004;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      am.connect(amg).connect(g.gain);
      o.connect(g).connect(pan);
      o.start(t); am.start(t); o.stop(t + 0.12); am.stop(t + 0.12);
      t += 0.1 + i * 0.008;
    }
  }
  horn(dest) {
    const ac = this.ac, t = ac.currentTime;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.012, t + 0.05); g.gain.setValueAtTime(0.012, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
    for (const f of [392, 494]) { const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = f * (0.97 + Math.random() * 0.06); o.connect(lp); o.start(t); o.stop(t + 0.62); }
    lp.connect(g).connect(dest);
  }
  bloop(dest) {
    const ac = this.ac, t = ac.currentTime;
    const o = ac.createOscillator(); const f = 500 + Math.random() * 600;
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 2.2, t + 0.12);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.012, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(dest); o.start(t); o.stop(t + 0.2);
  }
  creak(dest) {
    const ac = this.ac, t = ac.currentTime;
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(140 + Math.random() * 80, t); o.frequency.linearRampToValueAtTime(110, t + 1.4);
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 9;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.012, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(bp).connect(g).connect(dest); o.start(t); o.stop(t + 1.7);
  }
  gull(dest) {
    const ac = this.ac;
    let t = ac.currentTime;
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      const o = ac.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(1500, t); o.frequency.linearRampToValueAtTime(2300, t + 0.08); o.frequency.exponentialRampToValueAtTime(1100, t + 0.3);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.008, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      o.connect(g).connect(dest); o.start(t); o.stop(t + 0.34);
      t += 0.36 + Math.random() * 0.2;
    }
  }
  musicBox() {
    // the approach melody again, slowly, very high, as if from the stars
    const seq = [88, 92, 95, 100, 99, 95, 97, 95];
    if (this.mbI == null) this.mbI = 0;
    const m = seq[this.mbI++ % seq.length];
    this.bell(this.now() + 0.02, m, 2.6, 0.03, { ratio: 3.0, index: 1.2 });
  }
  // 円町: the beat outside, a kick and a clap whenever a circle is hit
  kick(when = 0) {
    const ac = this.ac, t = ac.currentTime + when;
    const o = ac.createOscillator(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g).connect(this.outBus); o.start(t); o.stop(t + 0.3);
  }
  hit(when = 0) {
    const ac = this.ac, t = ac.currentTime + when;
    const src = ac.createBufferSource(); src.buffer = this.A.noise('white');
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 1.5;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    src.connect(bp).connect(g).connect(this.outBus); src.start(t, Math.random()); src.stop(t + 0.1);
  }
  // 地下: a sub that hits with the flash
  sub(when = 0, amp = 0.2) {
    const ac = this.ac, t = ac.currentTime + when;
    const o = ac.createOscillator(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.5);
    const sh = ac.createWaveShaper(); sh.curve = driveCurve(30);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(amp, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
    o.connect(sh).connect(lp).connect(g).connect(this.outBus); o.start(t); o.stop(t + 0.85);
  }

  fade(to, sec = 1) {
    const t = this.ac.currentTime;
    this.bus.gain.setTargetAtTime(to, t, sec / 3);
  }

  destroy() {
    this.alive = false;
    const t = this.ac.currentTime;
    try {
      [this.o1, this.o2, this.o3, this.lfo, this.sq, this.br1, this.br2, this.hum, this.hum2].forEach((o) => { try { o.stop(t + 0.05); } catch (e) {} });
      [this.roll, this.hiss, this.wind, this.rain, this.clat, this.canN].forEach((n) => n && n.stop(0.05));
      if (this.ambNode) this.ambNode.stop();
    } catch (e) {}
  }
}
