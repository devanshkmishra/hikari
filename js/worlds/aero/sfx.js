// Every sound in HIKARI Aqua 2004, synthesized. The startup chime, the clicks,
// the ding, the error chord, the CD-ROM motor, the wind on the hill.
import { mtof } from '../../lib/audio.js';

export function createSfx(ctx) {
  const au = ctx.audio, ac = au.ac;
  const dry = ac.createGain();
  dry.gain.value = 0.9;
  dry.connect(ctx.out);
  const wetIn = ac.createGain();
  wetIn.connect(ctx.send);
  const now = () => ac.currentTime + 0.006;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function voice(dest = dry, wet = 0) {
    const g = ac.createGain();
    g.gain.value = 0;
    g.connect(dest);
    if (wet) {
      const w = ac.createGain();
      w.gain.value = wet;
      g.connect(w);
      w.connect(wetIn);
    }
    return g;
  }
  // attack → peak, optional hold, exponential-ish fall. Returns a safe stop time.
  function env(gn, t, a, peak, dec, hold = 0) {
    const p = gn.gain;
    p.setValueAtTime(0.0001, t);
    p.linearRampToValueAtTime(peak, t + a);
    if (hold) p.setValueAtTime(peak, t + a + hold);
    p.setTargetAtTime(0.0001, t + a + hold, Math.max(0.005, dec / 4));
    return t + a + hold + dec * 1.3;
  }
  function osc(type, f, t, end, dest, detune = 0) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (detune) o.detune.value = detune;
    o.connect(dest);
    o.start(t);
    o.stop(end + 0.05);
    return o;
  }
  function noiseSrc(t, end, kind = 'white') {
    const s = ac.createBufferSource();
    s.buffer = au.noise(kind);
    s.loop = true;
    s.start(t, Math.random() * 1.5);
    s.stop(end + 0.05);
    return s;
  }
  function filt(type, f, q = 0.7) {
    const b = ac.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    return b;
  }
  function bell(f, t, { g = 0.12, dur = 1.4, ratio = 3.01, index = 1.6, wet = 0.3, dest = dry, type = 'sine' } = {}) {
    const v = voice(dest, wet);
    const end = env(v, t, 0.003, g, dur);
    const c = osc(type, f, t, end, v);
    const m = ac.createOscillator();
    m.frequency.value = f * ratio;
    const mg = ac.createGain();
    mg.gain.setValueAtTime(f * index, t);
    mg.gain.exponentialRampToValueAtTime(Math.max(0.5, f * index * 0.02), t + dur * 0.7);
    m.connect(mg);
    mg.connect(c.frequency);
    m.start(t);
    m.stop(end + 0.05);
    return end;
  }
  function softTone(f, t, { g = 0.05, a = 0.05, dur = 2, type = 'sine', wet = 0.4, dest = dry } = {}) {
    const v = voice(dest, wet);
    const end = env(v, t, a, g, dur);
    osc(type, f, t, end, v);
    return end;
  }
  function saws(f, t, end, dest, n = 5, spread = 14) {
    for (let i = 0; i < n; i++) {
      const d = n === 1 ? 0 : (i - (n - 1) / 2) * ((spread * 2) / (n - 1));
      osc('sawtooth', f, t, end, dest, d + rnd(-2, 2));
    }
  }

  const S = {
    ac, dry, wetIn, now, bell, softTone, voice, env, osc, noiseSrc, filt, saws,

    click() {
      const t = now();
      const v = voice();
      const end = env(v, t, 0.0008, 0.09, 0.025);
      noiseSrc(t, end).connect(filt('bandpass', 3400, 1.4)).connect(v);
      const v2 = voice();
      const e2 = env(v2, t, 0.001, 0.035, 0.035);
      osc('sine', 1900, t, e2, v2);
    },
    menu() {
      const t = now();
      const v = voice();
      const end = env(v, t, 0.0008, 0.05, 0.02);
      noiseSrc(t, end).connect(filt('highpass', 2600, 0.8)).connect(v);
    },
    ding() {
      const t = now();
      bell(mtof(88), t, { g: 0.12, dur: 1.3, ratio: 2.0, index: 0.5, wet: 0.35 });
      bell(mtof(95), t + 0.004, { g: 0.035, dur: 0.9, ratio: 2.0, index: 0.3, wet: 0.35 });
    },
    balloon() {
      const t = now();
      const v = voice(dry, 0.2);
      const end = env(v, t, 0.004, 0.07, 0.22);
      const o = osc('sine', 820, t, end, v);
      o.frequency.exponentialRampToValueAtTime(1320, t + 0.06);
      bell(mtof(96), t + 0.07, { g: 0.035, dur: 0.8, ratio: 2.0, index: 0.3, wet: 0.4 });
    },
    error() {
      const t = now();
      [[78, 81], [74, 77]].forEach((ch, k) => {
        ch.forEach((m) => {
          bell(mtof(m), t + k * 0.13, { g: 0.065, dur: k ? 0.8 : 0.3, ratio: 1.0, index: 0.25, type: 'triangle', wet: 0.25 });
        });
      });
      const v = voice();
      const end = env(v, t, 0.002, 0.08, 0.12);
      osc('sine', 110, t, end, v);
    },
    question() {
      const t = now();
      bell(mtof(84), t, { g: 0.1, dur: 1.1, ratio: 2.0, index: 0.4, wet: 0.35 });
      bell(mtof(79), t + 0.1, { g: 0.07, dur: 1.0, ratio: 2.0, index: 0.4, wet: 0.35 });
    },
    whoosh(up = true) {
      const t = now();
      const v = voice(dry, 0.15);
      const end = env(v, t, 0.04, 0.04, 0.16);
      const bp = filt('bandpass', up ? 500 : 2400, 1.1);
      bp.frequency.exponentialRampToValueAtTime(up ? 2600 : 420, t + 0.2);
      noiseSrc(t, end, 'pink').connect(bp).connect(v);
    },
    pop(r = 30) {
      const t = now();
      const f = Math.max(380, 1900 - r * 11) * rnd(0.92, 1.08);
      const v = voice(dry, 0.22);
      const end = env(v, t, 0.001, 0.11, 0.07);
      const o = osc('sine', f * 1.5, t, end, v);
      o.frequency.exponentialRampToValueAtTime(f * 0.75, t + 0.06);
      const v2 = voice();
      const e2 = env(v2, t, 0.0005, 0.05, 0.012);
      noiseSrc(t, e2).connect(filt('highpass', 4200, 0.7)).connect(v2);
    },
    msg() {
      const t = now();
      bell(mtof(79), t, { g: 0.09, dur: 0.9, ratio: 2.0, index: 0.5, wet: 0.3 });
      bell(mtof(84), t + 0.12, { g: 0.09, dur: 1.3, ratio: 2.0, index: 0.5, wet: 0.3 });
    },
    signin() {
      const t = now();
      [72, 76, 79, 84].forEach((m, i) => bell(mtof(m), t + i * 0.07, { g: 0.06, dur: 1.0, ratio: 2.0, index: 0.4, wet: 0.4 }));
    },
    nudge() {
      const t = now();
      const v = voice();
      v.gain.setValueAtTime(0.0001, t);
      v.gain.linearRampToValueAtTime(0.09, t + 0.02);
      v.gain.setValueAtTime(0.09, t + 0.42);
      v.gain.linearRampToValueAtTime(0.0001, t + 0.55);
      const am = ac.createGain();
      am.gain.value = 0.5;
      const lfo = ac.createOscillator();
      lfo.frequency.value = 22;
      const lg = ac.createGain();
      lg.gain.value = 0.5;
      lfo.connect(lg).connect(am.gain);
      lfo.start(t); lfo.stop(t + 0.6);
      const lp = filt('lowpass', 900, 1);
      lp.connect(am).connect(v);
      osc('square', 62, t, t + 0.56, lp);
      osc('square', 93, t, t + 0.56, lp);
    },
    crumple() {
      const t = now();
      for (let i = 0; i < 16; i++) {
        const tt = t + Math.pow(Math.random(), 0.8) * 0.6;
        const v = voice();
        const end = env(v, tt, 0.001, rnd(0.03, 0.09), rnd(0.015, 0.05));
        noiseSrc(tt, end).connect(filt('bandpass', rnd(1400, 5200), rnd(0.8, 2))).connect(v);
      }
    },
    chirp() {
      const t = now();
      [4200, 5100, 4700].forEach((f, i) => {
        const v = voice(dry, 0.1);
        const end = env(v, t + i * 0.045, 0.002, 0.025, 0.03);
        const o = osc('sine', f, t + i * 0.045, end, v);
        o.frequency.exponentialRampToValueAtTime(f * 1.25, t + i * 0.045 + 0.03);
      });
    },
    type() {
      const t = now();
      const v = voice();
      const end = env(v, t, 0.0005, 0.03, 0.012);
      noiseSrc(t, end).connect(filt('bandpass', rnd(2000, 3200), 2)).connect(v);
    },

    // CD-ROM: spin-up whine, air rush, head seeks. Returns stop() for the spin-down.
    cd() {
      const t = now();
      const out = voice(dry, 0.05);
      out.gain.setValueAtTime(0.0001, t);
      out.gain.linearRampToValueAtTime(1, t + 0.3);
      const motor = ac.createOscillator();
      motor.type = 'triangle';
      motor.frequency.setValueAtTime(140, t);
      motor.frequency.exponentialRampToValueAtTime(1150, t + 1.7);
      const mg = ac.createGain();
      mg.gain.value = 0.012;
      const mlp = filt('lowpass', 2400, 0.7);
      motor.connect(mlp).connect(mg).connect(out);
      motor.start(t);
      const air = ac.createBufferSource();
      air.buffer = au.noise('pink');
      air.loop = true;
      const alp = filt('bandpass', 700, 0.6);
      alp.frequency.exponentialRampToValueAtTime(1500, t + 1.7);
      const ag = ac.createGain();
      ag.gain.value = 0.05;
      air.connect(alp).connect(ag).connect(out);
      air.start(t);
      let alive = true;
      const seek = () => {
        if (!alive) return;
        const tt = now();
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const v = voice(out);
          const end = env(v, tt + i * 0.035, 0.0005, 0.07, 0.01);
          noiseSrc(tt + i * 0.035, end).connect(filt('bandpass', 1800 + Math.random() * 1200, 3)).connect(v);
        }
        ctx.timeout(seek, 140 + Math.random() * 420);
      };
      ctx.timeout(seek, 900);
      return {
        stop() {
          if (!alive) return;
          alive = false;
          const t2 = now();
          motor.frequency.cancelScheduledValues(t2);
          motor.frequency.setValueAtTime(motor.frequency.value, t2);
          motor.frequency.exponentialRampToValueAtTime(90, t2 + 1.6);
          out.gain.cancelScheduledValues(t2);
          out.gain.setValueAtTime(1, t2);
          out.gain.linearRampToValueAtTime(0.0001, t2 + 1.8);
          motor.stop(t2 + 1.9);
          air.stop(t2 + 1.9);
        },
      };
    },

    // A CRT being switched off: the thump, the tick of discharge, the whine fading.
    crtOff() {
      const t = now();
      const v = voice(dry, 0.3);
      const end = env(v, t, 0.003, 0.22, 0.45);
      const o = osc('sine', 75, t, end, v);
      o.frequency.exponentialRampToValueAtTime(32, t + 0.3);
      for (let i = 0; i < 7; i++) {
        const tt = t + 0.05 + Math.random() * 0.9;
        const c = voice();
        const e = env(c, tt, 0.0005, rnd(0.02, 0.06), 0.006);
        noiseSrc(tt, e).connect(filt('highpass', 3000, 0.7)).connect(c);
      }
      const w = voice();
      w.gain.setValueAtTime(0.004, t);
      w.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      osc('sine', 15734, t, t + 2.7, w);
    },
    degauss() {
      const t = now();
      const v = voice(dry, 0.25);
      v.gain.setValueAtTime(0.0001, t);
      v.gain.linearRampToValueAtTime(0.16, t + 0.03);
      v.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
      const am = ac.createGain();
      am.gain.value = 0.6;
      const lfo = ac.createOscillator();
      lfo.frequency.value = 7;
      const lg = ac.createGain();
      lg.gain.value = 0.4;
      lfo.connect(lg).connect(am.gain);
      lfo.start(t); lfo.stop(t + 1.4);
      am.connect(v);
      osc('sine', 60, t, t + 1.35, am);
      osc('triangle', 120, t, t + 1.35, am);
      const c = voice();
      const e = env(c, t, 0.001, 0.12, 0.05);
      noiseSrc(t, e, 'brown').connect(filt('lowpass', 400, 0.7)).connect(c);
    },

    // The startup chime. Original: a bright swell that opens into D–A–F♯–E (an add9 that never quite resolves).
    chime() {
      const t = now() + 0.05;
      {
        const v = voice(dry, 0.45);
        v.gain.setValueAtTime(0.0001, t);
        v.gain.exponentialRampToValueAtTime(0.08, t + 0.85);
        v.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
        const bp = filt('bandpass', 300, 0.9);
        bp.frequency.setValueAtTime(300, t);
        bp.frequency.exponentialRampToValueAtTime(7500, t + 0.95);
        noiseSrc(t, t + 1.8, 'pink').connect(bp).connect(v);
      }
      {
        const v = voice(dry, 0.15);
        v.gain.setValueAtTime(0.0001, t);
        v.gain.linearRampToValueAtTime(0.11, t + 0.9);
        v.gain.setTargetAtTime(0.0001, t + 1.5, 0.9);
        osc('sine', mtof(38), t, t + 5.5, v);
      }
      {
        const lp = filt('lowpass', 500, 0.9);
        lp.frequency.setValueAtTime(500, t);
        lp.frequency.exponentialRampToValueAtTime(5200, t + 1.1);
        lp.frequency.setTargetAtTime(1600, t + 1.6, 1.2);
        const v = voice(dry, 0.6);
        v.gain.setValueAtTime(0.0001, t);
        v.gain.linearRampToValueAtTime(0.042, t + 1.0);
        v.gain.setTargetAtTime(0.0001, t + 1.55, 1.1);
        lp.connect(v);
        [50, 57, 66, 76].forEach((m) => saws(mtof(m), t, t + 6.2, lp, 5, 16));
      }
      [[74, 0.3], [81, 0.52], [78, 0.74], [88, 0.98]].forEach(([m, dt], i) => {
        bell(mtof(m), t + dt, { g: 0.1 + i * 0.01, dur: 3.4, ratio: 2.0, index: 0.9, wet: 0.5 });
        softTone(mtof(m), t + dt, { g: 0.03, a: 0.08, dur: 2.8, type: 'triangle', wet: 0.5 });
      });
      const sp = [86, 88, 90, 93, 95, 98, 100];
      for (let i = 0; i < 12; i++) {
        bell(mtof(sp[Math.floor(Math.random() * sp.length)]), t + 1.05 + i * 0.11 + Math.random() * 0.05, { g: 0.012 + Math.random() * 0.018, dur: 0.7, ratio: 3.5, index: 0.4, wet: 0.75 });
      }
    },
    // Shutdown: the same chord, falling, and letting go.
    farewell() {
      const t = now() + 0.04;
      [[81, 0], [78, 0.3], [74, 0.6], [69, 0.95]].forEach(([m, dt], i) => {
        bell(mtof(m), t + dt, { g: 0.09 - i * 0.008, dur: 3.2, ratio: 2.0, index: 0.7, wet: 0.6 });
        softTone(mtof(m), t + dt, { g: 0.025, a: 0.1, dur: 2.6, type: 'triangle', wet: 0.6 });
      });
      const lp = filt('lowpass', 1800, 0.7);
      lp.frequency.setTargetAtTime(500, t + 0.5, 1.2);
      const v = voice(dry, 0.6);
      v.gain.setValueAtTime(0.0001, t);
      v.gain.linearRampToValueAtTime(0.03, t + 0.6);
      v.gain.setTargetAtTime(0.0001, t + 1.2, 1.0);
      lp.connect(v);
      [50, 57, 62, 66].forEach((m) => saws(mtof(m), t, t + 5.5, lp, 3, 10));
    },

    // The hill: wind through grass, a high lark now and then, glass in the air.
    ambience() {
      const out = ac.createGain();
      out.gain.value = 0;
      out.connect(dry);
      const send = ac.createGain();
      send.gain.value = 0.35;
      out.connect(send);
      send.connect(wetIn);
      const wind = au.noiseLoop(out, { kind: 'pink', type: 'bandpass', freq: 520, q: 0.5, gain: 0.07 });
      const air = au.noiseLoop(out, { kind: 'white', type: 'highpass', freq: 5200, q: 0.5, gain: 0.006 });
      const padBus = ac.createGain();
      padBus.gain.value = 0;
      const plp = filt('lowpass', 1100, 0.5);
      padBus.connect(plp).connect(out);
      const padOsc = [50, 57, 64, 66, 73].map((m, i) => {
        const o = ac.createOscillator();
        o.type = i < 2 ? 'sine' : 'triangle';
        o.frequency.value = mtof(m);
        o.detune.value = rnd(-4, 4);
        const g = ac.createGain();
        g.gain.value = i < 2 ? 0.05 : 0.018;
        const lfo = ac.createOscillator();
        lfo.frequency.value = 0.05 + i * 0.023;
        const lg = ac.createGain();
        lg.gain.value = g.gain.value * 0.6;
        lfo.connect(lg).connect(g.gain);
        o.connect(g).connect(padBus);
        o.start(); lfo.start();
        return [o, lfo];
      });
      let larks = true, glass = true, alive = true;
      const gust = () => {
        if (!alive) return;
        const t = now();
        wind.gain.gain.setTargetAtTime(rnd(0.035, 0.11), t, rnd(0.8, 2.2));
        wind.filter.frequency.setTargetAtTime(rnd(380, 820), t, 1.5);
        ctx.timeout(gust, rnd(2200, 5200));
      };
      const lark = () => {
        if (!alive) return;
        if (larks) {
          const t = now();
          const n = 5 + Math.floor(Math.random() * 9);
          for (let i = 0; i < n; i++) {
            const tt = t + i * rnd(0.06, 0.11);
            const f = rnd(3100, 5400);
            const v = voice(out, 0.3);
            const end = env(v, tt, 0.003, rnd(0.004, 0.011), 0.05);
            const o = osc('sine', f, tt, end, v);
            o.frequency.exponentialRampToValueAtTime(f * rnd(0.75, 1.3), tt + 0.045);
          }
        }
        ctx.timeout(lark, rnd(5000, 13000));
      };
      const chimeTone = () => {
        if (!alive) return;
        if (glass) {
          const sp = [86, 88, 90, 93, 95];
          bell(mtof(sp[Math.floor(Math.random() * sp.length)]), now(), { g: rnd(0.008, 0.016), dur: 2.4, ratio: 2.0, index: 0.3, wet: 0.9, dest: out });
        }
        ctx.timeout(chimeTone, rnd(4000, 9000));
      };
      ctx.timeout(gust, 400);
      ctx.timeout(lark, 3000);
      ctx.timeout(chimeTone, 2200);
      return {
        level(v, sec = 1.5) { const t = now(); out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(v, t, sec / 3); },
        pad(v, sec = 3) { const t = now(); padBus.gain.cancelScheduledValues(t); padBus.gain.setTargetAtTime(v, t, sec / 3); },
        set(opts) { if ('larks' in opts) larks = opts.larks; if ('glass' in opts) glass = opts.glass; },
        stop() {
          alive = false;
          const t = now();
          out.gain.setTargetAtTime(0.0001, t, 0.3);
          wind.stop(1.5); air.stop(1.5);
          padOsc.forEach(([o, l]) => { try { o.stop(t + 1.5); l.stop(t + 1.5); } catch (e) {} });
        },
      };
    },
  };
  return S;
}
