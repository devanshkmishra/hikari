// 夏ヶ原 — sound. Nothing is recorded; every voice here is built from oscillators and noise.
// Beds (wind, distant cicada wash, the vending machine) run continuously; calls (higurashi,
// minmin, crows, crickets, a far-off motorbike, the evening chime) are scheduled; the train
// and the small things you touch are one-shots.

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const rnd = (a, b) => a + Math.random() * (b - a);

export function createSound(ctx) {
  const A = ctx.audio;
  const ac = A.ac;
  const out = ac.createGain(); out.gain.value = 1; out.connect(ctx.out);
  const wet = ac.createGain(); wet.gain.value = 1; wet.connect(ctx.send);
  const bed = ac.createGain(); bed.gain.value = 1; bed.connect(out);
  const bedWet = ac.createGain(); bedWet.gain.value = 1; bedWet.connect(wet);
  const live = new Set();         // continuous sources to stop on destroy
  let dead = false;

  // a little per-sound chain: gain → lowpass → pan → (dry, wet)
  function chain({ pan = 0, lp = 18000, hp = 0, wetAmt = 0.2, gain = 1, dest = 'bed' } = {}) {
    const g = ac.createGain(); g.gain.value = gain;
    let node = g;
    if (hp) { const h = ac.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp; node.connect(h); node = h; }
    const l = ac.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = lp; l.Q.value = 0.5;
    node.connect(l);
    const p = ac.createStereoPanner(); p.pan.value = clamp(pan, -1, 1);
    l.connect(p);
    const dry = ac.createGain(); dry.gain.value = 1;
    const w = ac.createGain(); w.gain.value = wetAmt;
    p.connect(dry); p.connect(w);
    dry.connect(dest === 'bed' ? bed : out);
    w.connect(dest === 'bed' ? bedWet : wet);
    const nodes = [g, l, p, dry, w];
    return {
      in: g, lp: l, pan: p, wet: w, dry,
      free(afterSec) {
        setTimeout(() => { nodes.forEach((n) => { try { n.disconnect(); } catch (e) {} }); }, Math.max(0, afterSec * 1000 + 200));
      },
    };
  }
  function noiseSrc(kind = 'white') {
    const s = ac.createBufferSource();
    s.buffer = A.noise(kind);
    s.loop = true;
    s.loopStart = Math.random() * 1.5;
    return s;
  }
  const env = (param, t, a, peak, hold, rel) => {
    param.setValueAtTime(0.0001, t);
    param.linearRampToValueAtTime(peak, t + a);
    param.setValueAtTime(peak, t + a + hold);
    param.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  };

  // ── beds ─────────────────────────────────────────────────
  // wind across the rice: a low body and a high leafy rustle
  const windLo = noiseSrc('pink');
  const windLoF = ac.createBiquadFilter(); windLoF.type = 'bandpass'; windLoF.frequency.value = 520; windLoF.Q.value = 0.55;
  const windLoG = ac.createGain(); windLoG.gain.value = 0.0;
  const windLoP = ac.createStereoPanner(); windLoP.pan.value = -0.25;
  windLo.connect(windLoF).connect(windLoG).connect(windLoP).connect(bed);
  windLo.start(); live.add(windLo);

  const rustle = noiseSrc('white');
  const rustleHP = ac.createBiquadFilter(); rustleHP.type = 'highpass'; rustleHP.frequency.value = 2200;
  const rustleBP = ac.createBiquadFilter(); rustleBP.type = 'bandpass'; rustleBP.frequency.value = 5200; rustleBP.Q.value = 0.6;
  const rustleG = ac.createGain(); rustleG.gain.value = 0;
  const rustleFl = ac.createGain(); rustleFl.gain.value = 0.7;
  const flutter = ac.createOscillator(); flutter.frequency.value = 6.3;
  const flutterD = ac.createGain(); flutterD.gain.value = 0.3;
  flutter.connect(flutterD).connect(rustleFl.gain);
  const rustleP = ac.createStereoPanner(); rustleP.pan.value = -0.45;
  rustle.connect(rustleHP).connect(rustleBP).connect(rustleFl).connect(rustleG).connect(rustleP).connect(bed);
  rustleG.connect(bedWet);
  rustle.start(); flutter.start(); live.add(rustle); live.add(flutter);

  // distant daytime cicadas (aburazemi): a sizzling wash, two bands, slowly breathing
  const wash = [];
  for (const [fc, pan, rate] of [[4700, 0.35, 41], [5600, -0.4, 47]]) {
    const n = noiseSrc('white');
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fc; bp.Q.value = 1.3;
    const am = ac.createGain(); am.gain.value = 0.55;
    const lfo = ac.createOscillator(); lfo.type = 'square'; lfo.frequency.value = rate;
    const lfoD = ac.createGain(); lfoD.gain.value = 0.42;
    lfo.connect(lfoD).connect(am.gain);
    const g = ac.createGain(); g.gain.value = 0;
    const p = ac.createStereoPanner(); p.pan.value = pan;
    n.connect(bp).connect(am).connect(g).connect(p).connect(bed);
    g.connect(bedWet);
    n.start(); lfo.start(); live.add(n); live.add(lfo);
    wash.push({ g, level: 0.6 });
  }

  // the vending machine: mains hum (50 Hz east), a fan, and a compressor that cycles
  const vend = ac.createGain(); vend.gain.value = 0.0;
  const vendP = ac.createStereoPanner(); vendP.pan.value = 0.5;
  const vendLP = ac.createBiquadFilter(); vendLP.type = 'lowpass'; vendLP.frequency.value = 2400;
  vend.connect(vendLP).connect(vendP).connect(out);
  for (const [fq, a] of [[100, 0.5], [200, 0.22], [300, 0.12], [400, 0.05]]) {
    const o = ac.createOscillator(); o.frequency.value = fq * (1 + (Math.random() - 0.5) * 0.002);
    const g = ac.createGain(); g.gain.value = a;
    o.connect(g).connect(vend); o.start(); live.add(o);
  }
  const fan = noiseSrc('pink');
  const fanBP = ac.createBiquadFilter(); fanBP.type = 'bandpass'; fanBP.frequency.value = 700; fanBP.Q.value = 0.8;
  const fanG = ac.createGain(); fanG.gain.value = 0.35;
  fan.connect(fanBP).connect(fanG).connect(vend); fan.start(); live.add(fan);
  const comp = ac.createOscillator(); comp.type = 'sawtooth'; comp.frequency.value = 49;
  const compLP = ac.createBiquadFilter(); compLP.type = 'lowpass'; compLP.frequency.value = 180;
  const compG = ac.createGain(); compG.gain.value = 0;
  comp.connect(compLP).connect(compG).connect(vend); comp.start(); live.add(comp);
  let compOn = false, compNext = ac.currentTime + rnd(6, 14);

  // fluorescent tubes: buzz once lit
  const tube = ac.createGain(); tube.gain.value = 0;
  const tubeP = ac.createStereoPanner(); tubeP.pan.value = 0.25;
  tube.connect(tubeP).connect(out);
  for (const [fq, a] of [[100, 0.6], [200, 0.3], [300, 0.25], [500, 0.08]]) {
    const o = ac.createOscillator(); o.type = fq === 100 ? 'triangle' : 'sine'; o.frequency.value = fq;
    const g = ac.createGain(); g.gain.value = a;
    o.connect(g).connect(tube); o.start(); live.add(o);
  }

  // ── calls ────────────────────────────────────────────────
  // ひぐらし: a falling series of bright, metallic notes — kana-kana-kana…
  function higurashi(when, { f0 = rnd(4100, 4700), pan = rnd(-0.8, 0.8), dist = rnd(0.3, 1), level = 1 } = {}) {
    const c = chain({ pan, lp: 5200 + 4000 * (1 - dist), wetAmt: 0.25 + dist * 0.6, gain: 0.05 * level * (1.15 - dist * 0.75) });
    const o = ac.createOscillator(); o.type = 'sine';
    const o2 = ac.createOscillator(); o2.type = 'sine';
    const o2g = ac.createGain(); o2g.gain.value = 0.16;
    const am = ac.createOscillator(); am.type = 'triangle'; am.frequency.value = rnd(210, 290);
    const amD = ac.createGain(); amD.gain.value = 0.42;
    const rm = ac.createGain(); rm.gain.value = 0.58;
    am.connect(amD).connect(rm.gain);
    const vca = ac.createGain(); vca.gain.value = 0;
    o.connect(rm); o2.connect(o2g).connect(rm);
    rm.connect(vca).connect(c.in);
    const N = Math.round(rnd(22, 36));
    let t = when + 0.02, period = rnd(0.08, 0.095);
    // an opening trill, then the falling call
    vca.gain.setValueAtTime(0, when);
    for (let i = 0; i < N; i++) {
      const x = i / N;
      const fN = f0 * (1 - 0.14 * x);
      const ampP = (x < 0.07 ? x / 0.07 : Math.pow(1 - (x - 0.07) / 0.93, 1.25) * 0.88 + 0.12);
      o.frequency.setValueAtTime(fN * 1.045, t);
      o.frequency.exponentialRampToValueAtTime(fN * 0.95, t + period * 0.8);
      o2.frequency.setValueAtTime(fN * 2.09, t);
      o2.frequency.exponentialRampToValueAtTime(fN * 1.9, t + period * 0.8);
      vca.gain.setValueAtTime(0.0001, t);
      vca.gain.linearRampToValueAtTime(ampP, t + 0.006);
      vca.gain.setTargetAtTime(ampP * 0.45, t + 0.012, period * 0.2);
      vca.gain.setTargetAtTime(0.0001, t + period * 0.6, period * 0.07);
      t += period;
      period *= 1.016;
    }
    const end = t + 0.3;
    for (const s of [o, o2, am]) { s.start(when); s.stop(end); }
    c.free(end - ac.currentTime + 0.5);
    return end;
  }
  // ミンミンゼミ: mii-n min min min… miiii
  function minmin(when, { fc = rnd(2900, 3500), pan = rnd(-0.9, 0.9), dist = rnd(0.55, 1) } = {}) {
    const c = chain({ pan, lp: 4200 + 3000 * (1 - dist), wetAmt: 0.3 + dist * 0.5, gain: 0.03 * (1.1 - dist * 0.7) });
    const o = ac.createOscillator(); o.type = 'sawtooth';
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3; bp.frequency.value = fc;
    const am = ac.createOscillator(); am.type = 'square'; am.frequency.value = rnd(105, 130);
    const amD = ac.createGain(); amD.gain.value = 0.5;
    const rm = ac.createGain(); rm.gain.value = 0.5;
    am.connect(amD).connect(rm.gain);
    const vca = ac.createGain(); vca.gain.value = 0;
    o.connect(bp).connect(rm).connect(vca).connect(c.in);
    const N = Math.round(rnd(6, 10));
    let t = when + 0.05;
    vca.gain.setValueAtTime(0, when);
    for (let i = 0; i < N; i++) {
      const long = i === 0 || i === N - 1;
      const d = long ? rnd(0.7, 1.1) : rnd(0.32, 0.4);
      const f = fc / 3;
      o.frequency.setValueAtTime(f * 0.86, t);
      o.frequency.linearRampToValueAtTime(f, t + d * 0.35);
      o.frequency.linearRampToValueAtTime(f * 0.82, t + d * 0.95);
      bp.frequency.setValueAtTime(fc * 0.9, t);
      bp.frequency.linearRampToValueAtTime(fc, t + d * 0.35);
      bp.frequency.linearRampToValueAtTime(fc * 0.8, t + d);
      const a = long && i === N - 1 ? 0.8 : 1;
      vca.gain.setValueAtTime(0.0001, t);
      vca.gain.linearRampToValueAtTime(a, t + d * 0.25);
      vca.gain.linearRampToValueAtTime(a * 0.7, t + d * 0.7);
      vca.gain.linearRampToValueAtTime(0.0001, t + d * 0.98);
      t += d;
    }
    for (const s of [o, am]) { s.start(when); s.stop(t + 0.1); }
    c.free(t - ac.currentTime + 0.5);
  }
  // evening crickets (鈴虫): riiin, riiin
  function suzumushi(when, { pan = rnd(-0.8, 0.8) } = {}) {
    const c = chain({ pan, lp: 9000, wetAmt: 0.5, gain: 0.012 });
    const o = ac.createOscillator(); o.frequency.value = rnd(4200, 4600);
    const am = ac.createOscillator(); am.type = 'square'; am.frequency.value = rnd(30, 38);
    const amD = ac.createGain(); amD.gain.value = 0.5;
    const rm = ac.createGain(); rm.gain.value = 0.5;
    am.connect(amD).connect(rm.gain);
    const vca = ac.createGain(); vca.gain.value = 0;
    o.connect(rm).connect(vca).connect(c.in);
    let t = when;
    const n = Math.round(rnd(3, 6));
    for (let i = 0; i < n; i++) {
      vca.gain.setValueAtTime(0.0001, t);
      vca.gain.linearRampToValueAtTime(1, t + 0.03);
      vca.gain.setValueAtTime(1, t + 0.32);
      vca.gain.linearRampToValueAtTime(0.0001, t + 0.4);
      t += rnd(0.62, 0.8);
    }
    o.start(when); am.start(when); o.stop(t); am.stop(t);
    c.free(t - ac.currentTime + 0.5);
  }
  // crows going home: kaa… kaa
  function crows(when = ac.currentTime + 0.05, { pan = rnd(-0.6, 0.6), n = Math.round(rnd(2, 4)), dist = rnd(0.4, 0.9) } = {}) {
    const c = chain({ pan, lp: 2600 + 1500 * (1 - dist), wetAmt: 0.55, gain: 0.07 * (1.1 - dist * 0.6) });
    let t = when;
    const f0 = rnd(430, 520);
    for (let i = 0; i < n; i++) {
      const o = ac.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0 * 1.12, t);
      o.frequency.linearRampToValueAtTime(f0, t + 0.08);
      o.frequency.linearRampToValueAtTime(f0 * 0.82, t + 0.36);
      const f1 = ac.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 1250; f1.Q.value = 3.5;
      const f2 = ac.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 2300; f2.Q.value = 4;
      const nz = noiseSrc('white');
      const nzF = ac.createBiquadFilter(); nzF.type = 'bandpass'; nzF.frequency.value = 1600; nzF.Q.value = 1;
      const nzG = ac.createGain(); nzG.gain.value = 0.35;
      const rough = ac.createOscillator(); rough.frequency.value = 72;
      const rD = ac.createGain(); rD.gain.value = 0.4;
      const vca = ac.createGain(); vca.gain.value = 0;
      rough.connect(rD).connect(vca.gain);
      o.connect(f1).connect(vca); o.connect(f2).connect(vca);
      nz.connect(nzF).connect(nzG).connect(vca);
      vca.connect(c.in);
      vca.gain.setValueAtTime(0, t);
      vca.gain.linearRampToValueAtTime(0.9, t + 0.03);
      vca.gain.setValueAtTime(0.8, t + 0.24);
      vca.gain.linearRampToValueAtTime(0, t + 0.38);
      for (const s of [o, nz, rough]) { s.start(t); s.stop(t + 0.42); }
      t += rnd(0.5, 0.7);
    }
    c.free(t - ac.currentTime + 1);
  }
  // a Super Cub going past on a road somewhere you can't see
  function motorbike(when = ac.currentTime + 0.1) {
    const dur = rnd(8, 11);
    const pan0 = rnd(0.5, 0.9) * (Math.random() < 0.5 ? -1 : 1);
    const c = chain({ pan: pan0, lp: 900, wetAmt: 0.5, gain: 0 });
    c.pan.pan.linearRampToValueAtTime(-pan0 * 0.6, when + dur);
    const o = ac.createOscillator(); o.type = 'sawtooth';
    const f = rnd(31, 37);
    o.frequency.setValueAtTime(f * 0.92, when);
    o.frequency.linearRampToValueAtTime(f * 1.05, when + dur * 0.45);
    o.frequency.linearRampToValueAtTime(f * 0.94, when + dur);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 2;
    const pulse = ac.createGain(); pulse.gain.value = 0.6;
    o.connect(lp).connect(pulse).connect(c.in);
    c.in.gain.setValueAtTime(0.0001, when);
    c.in.gain.linearRampToValueAtTime(0.035, when + dur * 0.45);
    c.in.gain.linearRampToValueAtTime(0.0001, when + dur);
    o.start(when); o.stop(when + dur + 0.1);
    c.free(when + dur - ac.currentTime + 0.5);
  }
  // distant crossing bell on some other line, beyond the hills
  function farCrossing(when = ac.currentTime + 0.1, dur = rnd(10, 14)) {
    const c = chain({ pan: rnd(-0.7, 0.7), lp: 1500, wetAmt: 0.9, gain: 0.0 });
    c.in.gain.setValueAtTime(0.0001, when);
    c.in.gain.linearRampToValueAtTime(0.03, when + 1.5);
    c.in.gain.setValueAtTime(0.03, when + dur - 2);
    c.in.gain.linearRampToValueAtTime(0.0001, when + dur);
    for (let t = when, k = 0; t < when + dur; t += 0.33, k++) strike(c.in, t, k % 2 ? 712 : 748, 0.7);
    c.free(when + dur - ac.currentTime + 1);
  }
  // one strike of a crossing bell (electronic, bell-like partials)
  function strike(dest, t, f, amp) {
    const parts = [[1, 1, 0.42], [2.76, 0.45, 0.22], [5.4, 0.22, 0.12], [8.93, 0.1, 0.06]];
    for (const [r, a, d] of parts) {
      const o = ac.createOscillator(); o.type = r === 1 ? 'triangle' : 'sine';
      o.frequency.value = f * r;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(a * amp, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(dest);
      o.start(t); o.stop(t + d + 0.02);
    }
  }

  // the evening chime from the town's loudspeakers, echoing off the hills (original tune)
  function townChime(when = ac.currentTime + 0.2) {
    const beat = 0.62;
    const tune = [[69, 1], [69, 1], [72, 2], [74, 1], [72, 1], [69, 2], [67, 1], [69, 1], [72, 1], [69, 1], [67, 4],
      [69, 1], [72, 1], [74, 2], [72, 1], [69, 1], [67, 2], [65, 1], [67, 1], [69, 1], [67, 1], [65, 5]];
    // the horn loudspeaker
    const spk = ac.createGain(); spk.gain.value = 1;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 380;
    const pk = ac.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 1700; pk.gain.value = 7; pk.Q.value = 1.2;
    const sh = ac.createWaveShaper();
    const curve = new Float32Array(512);
    for (let i = 0; i < 512; i++) { const x = i / 256 - 1; curve[i] = Math.tanh(x * 2.2) / Math.tanh(2.2); }
    sh.curve = curve;
    const far = ac.createBiquadFilter(); far.type = 'lowpass'; far.frequency.value = 2100;
    spk.connect(hp).connect(pk).connect(sh).connect(far);
    let total = 0;
    tune.forEach(([n]) => n);
    let t = when;
    for (const [n, b] of tune) {
      const f = mtof(n);
      const d = b * beat;
      for (const [r, a] of [[1, 1], [2, 0.32], [3, 0.12], [4, 0.06]]) {
        const o = ac.createOscillator(); o.frequency.value = f * r;
        const vib = ac.createOscillator(); vib.frequency.value = 5.2;
        const vd = ac.createGain(); vd.gain.value = f * r * 0.004;
        vib.connect(vd).connect(o.frequency);
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.16 * a, t + 0.025);
        g.gain.exponentialRampToValueAtTime(0.09 * a, t + 0.3);
        g.gain.setValueAtTime(0.09 * a, t + d * 0.85);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.25);
        o.connect(g).connect(spk);
        o.start(t); o.stop(t + d + 0.3); vib.start(t); vib.stop(t + d + 0.3);
      }
      t += d;
    }
    total = t - when;
    // three loudspeakers across the valley, arriving at different times
    const taps = [[0, 1, -0.25], [0.41, 0.55, 0.45], [1.02, 0.32, -0.6]];
    const nodes = [spk, hp, pk, sh, far];
    for (const [dl, g, pan] of taps) {
      const d = ac.createDelay(2); d.delayTime.value = dl;
      const gg = ac.createGain(); gg.gain.value = g * 0.11;
      const p = ac.createStereoPanner(); p.pan.value = pan;
      const w = ac.createGain(); w.gain.value = 0.9;
      far.connect(d).connect(gg).connect(p);
      p.connect(bed); p.connect(w).connect(bedWet);
      nodes.push(d, gg, p, w);
    }
    setTimeout(() => nodes.forEach((n) => { try { n.disconnect(); } catch (e) {} }), (total + 4) * 1000);
    return total;
  }

  // a quiet piano: a few notes, a lot of air (original)
  function pianoNote(t, midi, vel = 0.5, dest) {
    const f = mtof(midi);
    const B = 0.00032;
    const amps = [1, 0.62, 0.38, 0.24, 0.15, 0.09, 0.06];
    for (let k = 1; k <= amps.length; k++) {
      const fk = f * k * Math.sqrt(1 + B * k * k);
      if (fk > 9000) break;
      const o = ac.createOscillator(); o.frequency.value = fk * (1 + (Math.random() - 0.5) * 0.0008);
      const g = ac.createGain();
      const tau = (f < 220 ? 2.4 : 1.6) / (1 + 0.55 * (k - 1));
      const a = vel * amps[k - 1] * 0.06;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(a, t + 0.004);
      g.gain.setTargetAtTime(a * 0.55, t + 0.004, 0.08);
      g.gain.setTargetAtTime(0.0001, t + 0.12, tau);
      o.connect(g).connect(dest);
      o.start(t); o.stop(t + tau * 6 + 0.5);
    }
    // hammer
    const nz = noiseSrc('white');
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 1.2;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.012 * vel, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    nz.connect(bp).connect(g).connect(dest);
    nz.start(t); nz.stop(t + 0.05);
  }
  let pianoBusy = 0;
  function piano() {
    const now = ac.currentTime;
    if (now < pianoBusy) return;
    const c = chain({ pan: 0.05, lp: 3800, wetAmt: 1.1, gain: 1, dest: 'out' });
    const notes = [[0, 69, 0.42, 50], [2.6, 66, 0.34], [4.4, 64, 0.3], [6.4, 69, 0.38, 47], [9.2, 73, 0.32], [10.8, 71, 0.28], [13.6, 66, 0.34, 43], [16.4, 64, 0.26], [18.4, 62, 0.36, 50]];
    for (const [dt, n, v, b] of notes) {
      pianoNote(now + 0.3 + dt, n, v, c.in);
      if (b) pianoNote(now + 0.3 + dt + 0.02, b, v * 0.7, c.in);
    }
    pianoBusy = now + 30;
    c.free(32);
  }

  // ── small things you touch ───────────────────────────────
  function click(t, f, amp, dur, dest, type = 'square') {
    const o = ac.createOscillator(); o.type = type; o.frequency.value = f;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function burst(t, dest, { kind = 'white', type = 'bandpass', f = 2000, q = 1, amp = 0.1, a = 0.003, dur = 0.1, f2 = null } = {}) {
    const s = noiseSrc(kind);
    const bp = ac.createBiquadFilter(); bp.type = type; bp.frequency.setValueAtTime(f, t); bp.Q.value = q;
    if (f2) bp.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(amp, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp).connect(g).connect(dest);
    s.start(t); s.stop(t + dur + 0.05);
  }
  function metal(t, dest, freqs, amp, decay) {
    for (const [f, a] of freqs) {
      const o = ac.createOscillator(); o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.01);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(amp * a, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay * (0.6 + Math.random() * 0.6));
      o.connect(g).connect(dest);
      o.start(t); o.stop(t + decay * 1.3);
    }
  }
  const ui = {
    pageTurn() {
      const t = ac.currentTime + 0.01;
      const c = chain({ pan: rnd(-0.1, 0.25), lp: 9000, wetAmt: 0.08, gain: 1, dest: 'out' });
      burst(t, c.in, { f: 1400, f2: 4200, q: 0.7, amp: 0.05, a: 0.06, dur: 0.38 });
      for (let k = 0; k < 4; k++) burst(t + 0.05 + Math.random() * 0.25, c.in, { f: rnd(2500, 5500), q: 2, amp: 0.025, dur: 0.03 });
      burst(t + 0.34, c.in, { kind: 'pink', type: 'lowpass', f: 380, q: 0.7, amp: 0.06, a: 0.01, dur: 0.16 });
      c.free(0.8);
    },
    bookOpen() {
      const t = ac.currentTime + 0.01;
      const c = chain({ pan: 0.05, lp: 7000, wetAmt: 0.1, gain: 1, dest: 'out' });
      burst(t, c.in, { kind: 'pink', type: 'lowpass', f: 300, amp: 0.12, a: 0.004, dur: 0.18 });
      burst(t + 0.02, c.in, { f: 2200, q: 0.8, amp: 0.03, a: 0.02, dur: 0.3 });
      c.free(0.6);
    },
    bookClose() {
      const t = ac.currentTime + 0.01;
      const c = chain({ pan: 0.05, lp: 5000, wetAmt: 0.15, gain: 1, dest: 'out' });
      burst(t, c.in, { f: 1800, f2: 600, q: 0.8, amp: 0.04, a: 0.08, dur: 0.22 });
      burst(t + 0.2, c.in, { kind: 'pink', type: 'lowpass', f: 240, amp: 0.2, a: 0.003, dur: 0.2 });
      click(t + 0.2, 95, 0.08, 0.14, c.in, 'sine');
      c.free(0.8);
    },
    pen() {
      const t = ac.currentTime + 0.005;
      const c = chain({ pan: rnd(0.0, 0.3), lp: 9000, wetAmt: 0.02, gain: 1, dest: 'out' });
      burst(t, c.in, { f: rnd(3200, 5600), q: 2.2, amp: rnd(0.008, 0.016), a: 0.006, dur: rnd(0.03, 0.07) });
      c.free(0.3);
    },
    coin() {
      const t = ac.currentTime + 0.02;
      const c = chain({ pan: 0.5, lp: 12000, wetAmt: 0.12, gain: 1, dest: 'out' });
      const ring = [[2850, 1], [4120, 0.6], [6300, 0.35], [7710, 0.2]];
      metal(t, c.in, ring, 0.035, 0.18);
      metal(t + 0.42, c.in, ring.map(([f, a]) => [f * 1.38, a]), 0.03, 0.15);
      metal(t + 0.75, c.in, ring.map(([f, a]) => [f * 1.38, a]), 0.03, 0.15);
      for (let k = 0; k < 7; k++) burst(t + 0.2 + k * 0.05, c.in, { f: 3000 + k * 120, q: 4, amp: 0.012, dur: 0.02 });
      for (let k = 0; k < 5; k++) burst(t + 0.95 + k * 0.045, c.in, { f: 3400, q: 4, amp: 0.01, dur: 0.02 });
      c.free(1.6);
    },
    button() {
      const t = ac.currentTime + 0.01;
      const c = chain({ pan: 0.5, lp: 8000, wetAmt: 0.06, gain: 1, dest: 'out' });
      burst(t, c.in, { f: 1800, q: 1, amp: 0.04, dur: 0.02 });
      click(t + 0.02, 1320, 0.018, 0.09, c.in, 'square');
      c.free(0.4);
    },
    canDrop(delay = 0.55) {
      const t = ac.currentTime + delay;
      const c = chain({ pan: 0.5, lp: 6000, wetAmt: 0.18, gain: 1, dest: 'out' });
      // rolling inside, then ガコン
      for (let k = 0; k < 4; k++) burst(t - 0.35 + k * 0.08, c.in, { kind: 'pink', type: 'bandpass', f: 600, q: 2, amp: 0.025, dur: 0.06 });
      click(t, 68, 0.22, 0.18, c.in, 'sine');
      burst(t, c.in, { kind: 'pink', type: 'lowpass', f: 500, amp: 0.25, a: 0.002, dur: 0.16 });
      metal(t + 0.005, c.in, [[410, 1], [690, 0.7], [1130, 0.5], [1770, 0.3]], 0.05, 0.32);
      metal(t + 0.16, c.in, [[460, 1], [820, 0.6], [1350, 0.3]], 0.02, 0.2);
      c.free(1.4);
    },
    roulette(win) {
      const t = ac.currentTime + 0.1;
      const c = chain({ pan: 0.5, lp: 7000, wetAmt: 0.08, gain: 1, dest: 'out' });
      let tt = t, step = 0.07;
      for (let k = 0; k < 24; k++) { click(tt, 2200, 0.012, 0.025, c.in); tt += step; step *= 1.03; }
      if (win) {
        const mel = [[88, 0.12], [91, 0.12], [96, 0.12], [100, 0.12], [96, 0.12], [100, 0.4]];
        let t2 = tt + 0.15;
        for (const [n, d] of mel) { click(t2, mtof(n - 24), 0.02, d, c.in, 'square'); t2 += d; }
        c.free(t2 - ac.currentTime + 0.5);
        return tt - ac.currentTime;
      }
      click(tt + 0.1, 980, 0.016, 0.12, c.in); click(tt + 0.26, 740, 0.016, 0.2, c.in);
      c.free(tt - ac.currentTime + 0.8);
      return tt - ac.currentTime;
    },
    step(hollow = false) {
      const t = ac.currentTime + 0.01;
      const c = chain({ pan: 0, lp: 3000, wetAmt: 0.1, gain: 1, dest: 'out' });
      burst(t, c.in, { kind: 'pink', type: 'lowpass', f: hollow ? 260 : 700, amp: hollow ? 0.12 : 0.06, a: 0.003, dur: hollow ? 0.14 : 0.08 });
      burst(t + 0.01, c.in, { f: 2400, q: 1, amp: 0.012, dur: 0.05 });
      c.free(0.4);
    },
    hover() {
      const t = ac.currentTime + 0.005;
      const c = chain({ pan: 0, lp: 9000, wetAmt: 0.3, gain: 1, dest: 'out' });
      click(t, 2637, 0.004, 0.25, c.in, 'sine');
      c.free(0.5);
    },
  };

  // 風鈴: thin glass, a short clapper strike, long shimmering decay
  let furinLast = 0;
  function furin(strength = 0.6) {
    const now = ac.currentTime;
    if (now - furinLast < 0.18) return;
    furinLast = now;
    const c = chain({ pan: 0.2, lp: 14000, wetAmt: 0.5, gain: 0.05 * clamp(strength, 0.2, 1), dest: 'out' });
    const base = 2730;
    const parts = [[1, 1, 1.6], [1.53, 0.55, 1.1], [2.37, 0.4, 0.7], [3.11, 0.22, 0.5], [4.6, 0.12, 0.35]];
    for (const [r, a, d] of parts) {
      const o = ac.createOscillator(); o.frequency.value = base * r * (1 + (Math.random() - 0.5) * 0.004);
      const o2 = ac.createOscillator(); o2.frequency.value = base * r * 1.0035;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(a, now + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, now + d * rnd(0.8, 1.2));
      o.connect(g); o2.connect(g); g.connect(c.in);
      o.start(now); o2.start(now); o.stop(now + d * 1.3); o2.stop(now + d * 1.3);
    }
    c.free(2.4);
  }

  // fluorescent starter flicker: tink… tink
  function flicker(n = 2, pan = 0.25) {
    const t = ac.currentTime + 0.02;
    const c = chain({ pan, lp: 9000, wetAmt: 0.15, gain: 1, dest: 'out' });
    for (let k = 0; k < n; k++) {
      metal(t + k * rnd(0.25, 0.45), c.in, [[3100, 1], [5200, 0.5]], 0.012, 0.06);
      burst(t + k * 0.35 + 0.05, c.in, { f: 120, q: 4, amp: 0.02, dur: 0.12 });
    }
    c.free(2);
  }

  // ── the train ────────────────────────────────────────────
  const train = (() => {
    let on = false;
    const nodes = [];
    const sources = [];
    let eng, engLP, engPan, engG, rumG, rumLP, singG, brakeG, brakeO, brakeLFO, frictG, chug;
    let crossing = null;
    let lastClack = 0;
    function start() {
      if (on) return; on = true;
      const now = ac.currentTime;
      // engine: firing pulses + body
      engG = ac.createGain(); engG.gain.value = 0.0001;
      engLP = ac.createBiquadFilter(); engLP.type = 'lowpass'; engLP.frequency.value = 300; engLP.Q.value = 0.8;
      engPan = ac.createStereoPanner(); engPan.pan.value = -0.2;
      const engW = ac.createGain(); engW.gain.value = 0.35;
      engG.connect(engLP).connect(engPan);
      engPan.connect(out); engPan.connect(engW).connect(wet);
      eng = ac.createOscillator(); eng.type = 'sawtooth'; eng.frequency.value = 32;
      const engF = ac.createBiquadFilter(); engF.type = 'lowpass'; engF.frequency.value = 160;
      const engB = ac.createGain(); engB.gain.value = 0.7;
      eng.connect(engF).connect(engB).connect(engG);
      chug = ac.createOscillator(); chug.type = 'square'; chug.frequency.value = 32;
      const chugD = ac.createGain(); chugD.gain.value = 0.5;
      const nz = noiseSrc('brown');
      const nzF = ac.createBiquadFilter(); nzF.type = 'bandpass'; nzF.frequency.value = 140; nzF.Q.value = 0.9;
      const nzG = ac.createGain(); nzG.gain.value = 0.5;
      chug.connect(chugD).connect(nzG.gain);
      nz.connect(nzF).connect(nzG).connect(engG);
      const rat = noiseSrc('white');
      const ratF = ac.createBiquadFilter(); ratF.type = 'bandpass'; ratF.frequency.value = 950; ratF.Q.value = 2.5;
      const ratG = ac.createGain(); ratG.gain.value = 0.06;
      chug.connect(chugD);
      rat.connect(ratF).connect(ratG).connect(engG);
      // wheels on rail: rumble
      rumG = ac.createGain(); rumG.gain.value = 0.0001;
      rumLP = ac.createBiquadFilter(); rumLP.type = 'lowpass'; rumLP.frequency.value = 260;
      const rum = noiseSrc('brown');
      const rumP = ac.createStereoPanner(); rumP.pan.value = -0.3;
      rum.connect(rumLP).connect(rumG).connect(rumP).connect(out);
      // rails singing: narrow resonances
      singG = ac.createGain(); singG.gain.value = 0.0001;
      const singP = ac.createStereoPanner(); singP.pan.value = -0.35;
      const singW = ac.createGain(); singW.gain.value = 0.4;
      singG.connect(singP); singP.connect(out); singP.connect(singW).connect(wet);
      const sn = noiseSrc('white');
      for (const [fq, a] of [[1870, 1], [2790, 0.8], [3960, 0.6], [5480, 0.35], [7020, 0.2]]) {
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = 28;
        const g = ac.createGain(); g.gain.value = a * 3.2;
        sn.connect(bp).connect(g).connect(singG);
        nodes.push(bp, g);
      }
      // brakes: the squeal and the shoe friction
      brakeG = ac.createGain(); brakeG.gain.value = 0.0001;
      brakeO = ac.createOscillator(); brakeO.frequency.value = 3150;
      brakeLFO = ac.createOscillator(); brakeLFO.frequency.value = 7.3;
      const bl = ac.createGain(); bl.gain.value = 38;
      brakeLFO.connect(bl).connect(brakeO.frequency);
      const bAM = ac.createOscillator(); bAM.frequency.value = 13; bAM.type = 'triangle';
      const bAMd = ac.createGain(); bAMd.gain.value = 0.45;
      const bVCA = ac.createGain(); bVCA.gain.value = 0.55;
      bAM.connect(bAMd).connect(bVCA.gain);
      const bP = ac.createStereoPanner(); bP.pan.value = -0.35;
      const bW = ac.createGain(); bW.gain.value = 0.5;
      brakeO.connect(bVCA).connect(brakeG).connect(bP); bP.connect(out); bP.connect(bW).connect(wet);
      frictG = ac.createGain(); frictG.gain.value = 0.0001;
      const fr = noiseSrc('pink');
      const frF = ac.createBiquadFilter(); frF.type = 'bandpass'; frF.frequency.value = 1500; frF.Q.value = 0.9;
      fr.connect(frF).connect(frictG).connect(bP);
      for (const s of [eng, chug, nz, rat, rum, sn, brakeO, brakeLFO, bAM, fr]) { s.start(now); sources.push(s); }
      nodes.push(engG, engLP, engPan, engW, engF, engB, chugD, nzF, nzG, ratF, ratG, rumG, rumLP, rumP, singG, singP, singW, brakeG, bl, bAMd, bVCA, bP, bW, frictG, frF);
    }
    function update(s) {
      if (!on) return;
      const t = ac.currentTime;
      const dist = Math.max(4, s.dist);
      const near = 1 / (1 + dist / 14);
      engG.gain.setTargetAtTime(0.0001 + 0.22 * near * (0.6 + 0.4 * s.throttle), t, 0.12);
      engLP.frequency.setTargetAtTime(220 + 2400 * Math.exp(-dist / 70), t, 0.15);
      engPan.pan.setTargetAtTime(clamp(s.pan, -0.9, 0.9), t, 0.2);
      const fire = 30 + 16 * s.throttle + 3 * Math.sin(t * 0.7);
      eng.frequency.setTargetAtTime(fire, t, 0.4);
      chug.frequency.setTargetAtTime(fire, t, 0.4);
      rumG.gain.setTargetAtTime(0.0001 + 0.12 * near * clamp(s.v / 15), t, 0.15);
      rumLP.frequency.setTargetAtTime(150 + 500 * Math.exp(-dist / 60), t, 0.2);
      const sing = smooth(520, 160, dist) * (1 - smooth(70, 25, dist)) * clamp(s.v / 12);
      singG.gain.setTargetAtTime(0.0001 + 0.0042 * sing, t, 0.3);
      const squeal = s.braking ? smooth(7, 2.5, s.v) * (s.v > 0.05 ? 1 : 0) : 0;
      brakeG.gain.setTargetAtTime(0.0001 + 0.014 * squeal * (0.6 + 0.4 * Math.sin(t * 2.1) ** 2), t, 0.08);
      brakeO.frequency.setTargetAtTime(3050 + 260 * (1 - s.v / 7) + rnd(-30, 30), t, 0.1);
      frictG.gain.setTargetAtTime(0.0001 + (s.braking ? 0.03 * clamp(s.v / 10) * near : 0), t, 0.15);
    }
    function clack(dist, pan, v) {
      const t = ac.currentTime + 0.01;
      if (t - lastClack < 0.035) return;
      lastClack = t;
      const amp = clamp(0.16 / (1 + dist / 10)) * clamp(v / 12, 0.25, 1);
      const c = chain({ pan, lp: 600 + 6000 * Math.exp(-dist / 50), wetAmt: 0.3, gain: 1, dest: 'out' });
      burst(t, c.in, { kind: 'pink', type: 'bandpass', f: 210, q: 1.2, amp, a: 0.002, dur: 0.09 });
      burst(t, c.in, { f: 1700, q: 2, amp: amp * 0.35, a: 0.001, dur: 0.03 });
      c.free(0.4);
    }
    function horn(dist, long = true) {
      const t = ac.currentTime + 0.02;
      const dur = long ? 1.35 : 0.5;
      const c = chain({ pan: -0.15, lp: 900 + 3000 * Math.exp(-dist / 150), wetAmt: 0.7, gain: 0.12 / (1 + dist / 120), dest: 'out' });
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 0.6;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(1, t + 0.07);
      g.gain.setValueAtTime(0.9, t + dur);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.35);
      bp.connect(g).connect(c.in);
      for (const [fq, type, a] of [[349, 'sawtooth', 0.5], [351.5, 'square', 0.25], [698, 'sawtooth', 0.12]]) {
        const o = ac.createOscillator(); o.type = type;
        o.frequency.setValueAtTime(fq * 0.9, t);
        o.frequency.exponentialRampToValueAtTime(fq, t + 0.09);
        const og = ac.createGain(); og.gain.value = a;
        o.connect(og).connect(bp);
        o.start(t); o.stop(t + dur + 0.4);
      }
      c.free(dur + 1);
    }
    function air() {
      const t = ac.currentTime + 0.02;
      const c = chain({ pan: -0.35, lp: 9000, wetAmt: 0.35, gain: 1, dest: 'out' });
      burst(t, c.in, { type: 'highpass', f: 1800, q: 0.5, amp: 0.05, a: 0.02, dur: 1.6 });
      c.free(2);
    }
    function doors() {
      const t = ac.currentTime + 0.02;
      const c = chain({ pan: -0.4, lp: 8000, wetAmt: 0.3, gain: 1, dest: 'out' });
      burst(t, c.in, { type: 'highpass', f: 2500, q: 0.5, amp: 0.04, a: 0.01, dur: 0.35 });
      burst(t + 0.25, c.in, { kind: 'pink', type: 'lowpass', f: 420, amp: 0.06, a: 0.05, dur: 0.6 });
      click(t + 0.85, 115, 0.09, 0.15, c.in, 'sine');
      metal(t + 0.86, c.in, [[620, 1], [1040, 0.5]], 0.012, 0.2);
      c.free(1.6);
    }
    // the crossing in the frame, ringing: two units, slightly different pitch, alternating
    function crossingOn() {
      if (crossing) return;
      const c = chain({ pan: -0.12, lp: 3400, wetAmt: 0.45, gain: 0.055, dest: 'out' });
      let next = ac.currentTime + 0.05, k = 0;
      const id = setInterval(() => {
        if (dead) return;
        while (next < ac.currentTime + 0.3) { strike(c.in, next, k % 2 ? 712 : 752, 1); next += 0.315; k++; }
      }, 90);
      crossing = { c, id };
    }
    function crossingOff() {
      if (!crossing) return;
      const { c, id } = crossing; crossing = null;
      const t = ac.currentTime;
      c.in.gain.setTargetAtTime(0.0001, t + 0.2, 0.15);
      setTimeout(() => clearInterval(id), 700);
      c.free(1.5);
    }
    function stop() {
      crossingOff();
      if (!on) return; on = false;
      const t = ac.currentTime;
      try { engG.gain.setTargetAtTime(0.0001, t, 0.3); rumG.gain.setTargetAtTime(0.0001, t, 0.3); singG.gain.setTargetAtTime(0.0001, t, 0.2); brakeG.gain.setTargetAtTime(0.0001, t, 0.1); } catch (e) {}
      setTimeout(() => {
        sources.forEach((s) => { try { s.stop(); } catch (e) {} });
        nodes.forEach((n) => { try { n.disconnect(); } catch (e) {} });
        sources.length = 0; nodes.length = 0;
      }, 1500);
    }
    return { start, update, clack, horn, air, doors, crossingOn, crossingOff, stop };
  })();

  // ── scheduling ───────────────────────────────────────────
  const S = { tod: 0, wind: 0.4, duck: 0, lamp: 0, hidden: false };
  let nextHigu = ac.currentTime + rnd(4, 9);
  let nextMin = ac.currentTime + rnd(2, 6);
  let nextSuzu = ac.currentTime + 2;
  let nextCrow = ac.currentTime + rnd(30, 60);
  let nextBike = ac.currentTime + rnd(50, 90);
  let nextFar = ac.currentTime + rnd(70, 130);
  let firstHigu = null;

  function tick() {
    if (dead) return;
    const now = ac.currentTime;
    const { tod, wind, duck, hidden } = S;
    // beds
    const k = 1 - duck * 0.5;
    bed.gain.setTargetAtTime(k, now, 0.6);
    windLoG.gain.setTargetAtTime(0.02 + 0.075 * wind, now, 0.35);
    rustleG.gain.setTargetAtTime(0.003 + 0.03 * Math.pow(wind, 1.6), now, 0.25);
    rustleBP.frequency.setTargetAtTime(4200 + 2200 * wind, now, 0.4);
    const day = 1 - smooth(0.22, 0.62, tod);
    for (const w of wash) {
      w.level = clamp(w.level + (Math.random() - 0.5) * 0.12, 0.35, 1);
      w.g.gain.setTargetAtTime(0.017 * day * w.level, now, 1.2);
    }
    vend.gain.setTargetAtTime(0.012, now, 1);
    if (now > compNext) {
      compOn = !compOn;
      compNext = now + (compOn ? rnd(25, 40) : rnd(30, 60));
      compG.gain.setTargetAtTime(compOn ? 0.5 : 0.0001, now, compOn ? 0.4 : 0.15);
      if (!compOn) click(now + 0.05, 62, 0.012, 0.25, vend, 'sine');
    }
    tube.gain.setTargetAtTime(0.0035 * S.lamp, now, 0.2);
    if (hidden) return;
    // calls
    const higuP = smooth(0.12, 0.55, tod) * (1 - smooth(0.9, 1.0, tod) * 0.6);
    if (now > nextHigu) {
      if (Math.random() < 0.15 + higuP * 0.85) {
        const end = higurashi(now + 0.05, { level: 0.6 + higuP * 0.5 });
        if (firstHigu === null && higuP > 0.3) firstHigu = now;
        // others answer
        if (Math.random() < 0.3 + higuP * 0.5) higurashi(now + rnd(1.2, 3.5), { level: 0.5 + higuP * 0.4 });
        if (Math.random() < higuP * 0.35) higurashi(now + rnd(3.5, 6), { dist: rnd(0.7, 1) });
        nextHigu = end + rnd(2.5, 9) / (0.4 + higuP);
      } else nextHigu = now + rnd(5, 12);
    }
    if (now > nextMin && tod < 0.55) {
      minmin(now + 0.05, {});
      nextMin = now + rnd(7, 16) * (1 + tod * 3);
    }
    if (tod > 0.74 && now > nextSuzu) {
      suzumushi(now + 0.05);
      if (Math.random() < 0.5) suzumushi(now + rnd(0.2, 0.9));
      nextSuzu = now + rnd(1.5, 4) / smooth(0.72, 1, tod + 0.05);
    }
    if (tod > 0.32 && tod < 0.88 && now > nextCrow) {
      crows();
      nextCrow = now + rnd(35, 75);
    }
    if (tod < 0.8 && now > nextBike) { motorbike(); nextBike = now + rnd(90, 160); }
    if (now > nextFar) { farCrossing(); nextFar = now + rnd(160, 260); }
  }

  return {
    set(o) { Object.assign(S, o); },
    tick,
    higurashi, crows, townChime, piano, furin, flicker, ui, train,
    get firstHigurashi() { return firstHigu; },
    destroy() {
      dead = true;
      live.forEach((s) => { try { s.stop(); } catch (e) {} });
      train.stop();
      setTimeout(() => { try { out.disconnect(); wet.disconnect(); } catch (e) {} }, 800);
    },
  };
}
