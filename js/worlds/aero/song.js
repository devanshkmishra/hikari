// 「水色ヶ丘 (Aqua Mix)」 — an original 2004-ish trance-pop track, synthesized live.
// 132 BPM, D major, the 王道進行 (IV–V–iii–vi) under a glossy pluck hook.
import { mtof } from '../../lib/audio.js';

const BPM = 132;
const S16 = 60 / BPM / 4;

const CH = {
  G: { pad: [55, 59, 62, 66], bass: 43 },
  A: { pad: [57, 61, 64, 69], bass: 45 },
  As: { pad: [57, 62, 64, 69], bass: 45 },
  Fm: { pad: [54, 57, 61, 64], bass: 42 },
  Bm: { pad: [57, 62, 66, 71], bass: 47 },
  Em: { pad: [55, 59, 62, 66], bass: 40 },
  D: { pad: [57, 62, 66, 69], bass: 38 },
  D9: { pad: [57, 62, 64, 66], bass: 38 },
};
const SECTIONS = [
  ['intro', ['G', 'A', 'Fm', 'Bm']],
  ['a', ['G', 'A', 'Fm', 'Bm', 'Em', 'A', 'D9', 'D']],
  ['b', ['Em', 'Fm', 'G', 'As']],
  ['chorus', ['G', 'A', 'Fm', 'Bm', 'Em', 'A', 'D9', 'D']],
  ['break', ['G', 'A', 'Bm', 'As']],
  ['chorus', ['G', 'A', 'Fm', 'Bm', 'Em', 'A', 'D9', 'D']],
];
const BARS = [];
SECTIONS.forEach(([sec, chords]) => chords.forEach((c, i) => BARS.push({ sec, i, n: chords.length, ch: CH[c] })));
const TOTAL = BARS.length * 16;
const LOOP = 4 * 16;

// The hook: [step, length, midi] across the 8 chorus bars.
export const HOOK = [
  [0, 2, 81], [2, 2, 83], [4, 2, 81], [6, 4, 78], [10, 2, 74], [12, 2, 76], [14, 2, 78],
  [16, 4, 76], [20, 2, 69], [22, 2, 73], [24, 4, 76], [28, 2, 78], [30, 2, 76],
  [32, 2, 73], [34, 2, 76], [36, 2, 78], [38, 6, 81], [44, 2, 78], [46, 2, 76],
  [48, 6, 78], [54, 2, 74], [56, 4, 71], [60, 2, 73], [62, 2, 74],
  [64, 2, 79], [66, 2, 78], [68, 2, 79], [70, 4, 83], [74, 2, 81], [76, 2, 79], [78, 2, 78],
  [80, 4, 76], [84, 2, 78], [86, 2, 79], [88, 4, 81], [92, 4, 85],
  [96, 6, 86], [102, 2, 85], [104, 4, 81], [108, 4, 78],
  [112, 10, 81], [124, 2, 76], [126, 2, 78],
];
const HOOK_AT = new Map(HOOK.map((n) => [n[0], n]));
const ARP = [0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 1, 3, 4, 2, 3, 1];

export const SONG = {
  title: '水色ヶ丘 (Aqua Mix)',
  artist: 'HIKARI',
  album: 'Mizuirogaoka OST 2004',
  duration: TOTAL * S16,
};

export function createSong(A) {
  const { ctx } = A;
  const au = ctx.audio, ac = au.ac;
  const analyser = ac.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.72;
  const vol = ac.createGain();
  vol.gain.value = 0.8;
  vol.connect(ctx.out);
  vol.connect(analyser);

  let bus = null, pad = null, delayIn = null;
  let playing = false, step = 0, nextT = 0;
  const noiseBuf = au.noise('white');
  const rnd = (a, b) => a + Math.random() * (b - a);

  function buildBus() {
    if (bus) {
      const old = bus, t = ac.currentTime;
      old.gain.cancelScheduledValues(t);
      old.gain.setValueAtTime(old.gain.value, t);
      old.gain.linearRampToValueAtTime(0, t + 0.06);
      setTimeout(() => { try { old.disconnect(); } catch (e) {} }, 400);
    }
    bus = ac.createGain();
    bus.gain.value = 0.52;
    bus.connect(vol);
    const wet = ac.createGain();
    wet.gain.value = 0.28;
    bus.connect(wet);
    wet.connect(ctx.send);
    pad = ac.createGain();
    pad.gain.value = 1;
    pad.connect(bus);
    // dotted-eighth glossy delay for plucks and lead
    delayIn = ac.createGain();
    const d = ac.createDelay(1.5);
    d.delayTime.value = S16 * 3;
    const fb = ac.createGain();
    fb.gain.value = 0.34;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    const dw = ac.createGain();
    dw.gain.value = 0.28;
    delayIn.connect(d);
    d.connect(lp).connect(fb).connect(d);
    lp.connect(dw).connect(bus);
  }

  // ── instruments ──
  function g(dest, t, a, peak, dec, hold = 0) {
    const n = ac.createGain();
    n.gain.setValueAtTime(0.0001, t);
    n.gain.linearRampToValueAtTime(peak, t + a);
    if (hold) n.gain.setValueAtTime(peak, t + a + hold);
    n.gain.setTargetAtTime(0.0001, t + a + hold, dec / 4);
    n.connect(dest);
    return [n, t + a + hold + dec * 1.3];
  }
  function o(type, f, t, end, dest, det = 0) {
    const x = ac.createOscillator();
    x.type = type;
    x.frequency.setValueAtTime(f, t);
    if (det) x.detune.value = det;
    x.connect(dest);
    x.start(t);
    x.stop(end + 0.03);
    return x;
  }
  function nz(t, end, dest, type, f, q = 0.7) {
    const s = ac.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    const b = ac.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    s.connect(b).connect(dest);
    s.start(t, Math.random() * 1.5);
    s.stop(end + 0.03);
    return b;
  }
  function pump(t) {
    pad.gain.cancelScheduledValues(t);
    pad.gain.setValueAtTime(0.32, t);
    pad.gain.linearRampToValueAtTime(1, t + S16 * 3.2);
  }
  function kick(t, v = 1) {
    const [n, end] = g(bus, t, 0.002, 0.95 * v, 0.34);
    const x = o('sine', 150, t, end, n);
    x.frequency.exponentialRampToValueAtTime(46, t + 0.1);
    const [c, ce] = g(bus, t, 0.0005, 0.18 * v, 0.012);
    nz(t, ce, c, 'highpass', 2500);
    pump(t);
  }
  function clap(t, v = 1) {
    const n = ac.createGain();
    n.connect(bus);
    const p = n.gain;
    p.setValueAtTime(0.0001, t);
    [0, 0.011, 0.022].forEach((dt) => { p.setValueAtTime(0.32 * v, t + dt); p.setTargetAtTime(0.02, t + dt + 0.001, 0.004); });
    p.setValueAtTime(0.26 * v, t + 0.032);
    p.setTargetAtTime(0.0001, t + 0.033, 0.05);
    nz(t, t + 0.3, n, 'bandpass', 1350, 0.9);
    const w = ac.createGain();
    w.gain.value = 0.5;
    n.connect(w);
    w.connect(ctx.send);
  }
  function hat(t, open = false, v = 1) {
    const [n, end] = g(bus, t, 0.001, (open ? 0.085 : 0.05) * v, open ? 0.22 : 0.035);
    nz(t, end, n, 'highpass', open ? 7200 : 8200, 0.6);
  }
  function snare(t, v = 1) {
    const [n, end] = g(bus, t, 0.001, 0.2 * v, 0.11);
    nz(t, end, n, 'bandpass', 1900, 0.7);
    const [m, me] = g(bus, t, 0.001, 0.12 * v, 0.06);
    o('triangle', 195, t, me, m);
  }
  function crash(t, v = 1) {
    const [n, end] = g(bus, t, 0.002, 0.12 * v, 1.8);
    nz(t, end, n, 'highpass', 4200, 0.5);
    const w = ac.createGain();
    w.gain.value = 0.6;
    n.connect(w);
    w.connect(ctx.send);
  }
  function riser(t, dur) {
    const n = ac.createGain();
    n.gain.setValueAtTime(0.0001, t);
    n.gain.exponentialRampToValueAtTime(0.09, t + dur);
    n.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05);
    n.connect(bus);
    const b = nz(t, t + dur + 0.06, n, 'bandpass', 300, 2.2);
    b.frequency.exponentialRampToValueAtTime(9000, t + dur);
  }
  function bass(t, m, len, v = 1, sub = false) {
    const f = mtof(m);
    const [n, end] = g(bus, t, 0.004, 0.26 * v, sub ? len : Math.min(len, 0.16), sub ? len * 0.6 : 0);
    if (!sub) {
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 5;
      lp.frequency.setValueAtTime(2200, t);
      lp.frequency.exponentialRampToValueAtTime(260, t + 0.13);
      lp.connect(n);
      o('sawtooth', f, t, end, lp);
      o('square', f / 2, t, end, lp, 4);
    }
    o('sine', f, t, end, n);
  }
  function pluck(t, m, v = 1) {
    const f = mtof(m);
    const [n, end] = g(bus, t, 0.002, 0.075 * v, 0.2);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 3;
    lp.frequency.setValueAtTime(6500, t);
    lp.frequency.exponentialRampToValueAtTime(700, t + 0.16);
    lp.connect(n);
    o('square', f, t, end, lp);
    o('sawtooth', f, t, end, lp, 9);
    n.connect(delayIn);
  }
  function lead(t, m, len, v = 1) {
    const f = mtof(m);
    const dur = len * S16;
    const [n, end] = g(bus, t, 0.008, 0.085 * v, 0.14, Math.max(0.02, dur - 0.05));
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 2;
    lp.frequency.setValueAtTime(5200, t);
    lp.frequency.setTargetAtTime(2600, t + 0.02, 0.08);
    lp.connect(n);
    const a = o('sawtooth', f, t, end, lp, -7);
    const b = o('square', f, t, end, lp, 7);
    if (dur > 0.3) {
      const lfo = ac.createOscillator();
      lfo.frequency.value = 5.6;
      const lg = ac.createGain();
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(9, t + 0.28);
      lfo.connect(lg);
      lg.connect(a.detune);
      lg.connect(b.detune);
      lfo.start(t);
      lfo.stop(end + 0.03);
    }
    n.connect(delayIn);
    // glass bell an octave up
    const [bn, be] = g(bus, t, 0.002, 0.03 * v, 0.6);
    const c = o('sine', f * 2, t, be, bn);
    const md = ac.createOscillator();
    md.frequency.value = f * 4;
    const mg = ac.createGain();
    mg.gain.setValueAtTime(f * 1.4, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.02, t + 0.4);
    md.connect(mg).connect(c.frequency);
    md.start(t);
    md.stop(be + 0.03);
  }
  function padChord(t, notes, bars, cut, v, voices = 5) {
    const dur = bars * 16 * S16;
    const n = ac.createGain();
    n.gain.setValueAtTime(0.0001, t);
    n.gain.linearRampToValueAtTime(0.03 * v, t + 0.06);
    n.gain.setValueAtTime(0.03 * v, t + dur - 0.05);
    n.gain.linearRampToValueAtTime(0.0001, t + dur + 0.12);
    n.connect(pad);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.9;
    if (Array.isArray(cut)) {
      lp.frequency.setValueAtTime(cut[0], t);
      lp.frequency.exponentialRampToValueAtTime(cut[1], t + dur);
    } else lp.frequency.value = cut;
    lp.connect(n);
    notes.forEach((m) => {
      for (let i = 0; i < voices; i++) {
        const det = voices === 1 ? 0 : (i - (voices - 1) / 2) * (26 / (voices - 1));
        o('sawtooth', mtof(m), t, t + dur + 0.15, lp, det + rnd(-2, 2));
      }
    });
  }
  const VOWELS = { a: [800, 1150, 2900], o: [500, 900, 2600], i: [320, 2300, 3000] };
  function vox(t, m, len, v = 1, vw = 'a') {
    const f = mtof(m);
    const dur = len * S16;
    const n = ac.createGain();
    n.gain.setValueAtTime(0.0001, t);
    n.gain.linearRampToValueAtTime(0.11 * v, t + 0.02);
    n.gain.setValueAtTime(0.11 * v, t + Math.max(0.03, dur - 0.04));
    n.gain.linearRampToValueAtTime(0.0001, t + dur + 0.06);
    n.connect(pad);
    const src = ac.createGain();
    o('sawtooth', f, t, t + dur + 0.08, src, -5);
    o('sawtooth', f, t, t + dur + 0.08, src, 6);
    VOWELS[vw].forEach((ff, k) => {
      const b = ac.createBiquadFilter();
      b.type = 'bandpass';
      b.frequency.value = ff;
      b.Q.value = 7 + k * 3;
      const bg = ac.createGain();
      bg.gain.value = [1, 0.55, 0.25][k];
      src.connect(b).connect(bg).connect(n);
    });
  }

  function schedule(s, t) {
    const bi = Math.floor(s / 16);
    const k = s % 16;
    const bar = BARS[bi];
    const { sec, i: inSec, n: secLen, ch } = bar;
    const p = ch.pad;
    const last = inSec === secLen - 1;

    // pads at the bar line
    if (k === 0) {
      if (sec === 'intro') padChord(t, p, 1, [700 + inSec * 520, 1300 + inSec * 650], 1.2, 3);
      if (sec === 'a') padChord(t, p, 1, 1700, 0.75, 3);
      if (sec === 'b') padChord(t, p, 1, [1500 + inSec * 900, 2400 + inSec * 1100], 1.0, 5);
      if (sec === 'chorus') padChord(t, p, 1, 4300, 1.05, 5);
      if (sec === 'break') {
        padChord(t, p, 1, 1300, 0.85, 3);
        vox(t, p[3], 16, 0.55, inSec % 2 ? 'o' : 'a');
        vox(t, p[1] + 12, 16, 0.35, 'a');
      }
    }

    // drums
    const four = k % 4 === 0;
    if (sec === 'intro') {
      if (inSec >= 2 && k % 2 === 0) hat(t, false, 0.5 + (k % 4 ? 0 : 0.3));
      if (last && k === 0) riser(t, S16 * 16);
    } else if (sec === 'a' || sec === 'b' || sec === 'chorus') {
      const roll = sec === 'b' && last;
      if (four && !(roll && k >= 12)) kick(t, sec === 'chorus' ? 1 : 0.9);
      if (k % 4 === 2) hat(t, true, sec === 'chorus' ? 1 : 0.8);
      hat(t, false, k % 2 ? 0.45 : 0.75);
      if ((k === 4 || k === 12) && !(sec === 'a' && inSec === 0)) clap(t, sec === 'chorus' ? 1 : 0.85);
      if (roll) { snare(t, 0.25 + (k / 16) * 0.8); if (k === 0) riser(t, S16 * 16); }
      if (sec === 'chorus' && k === 0 && (inSec === 0 || inSec === 4)) crash(t, inSec ? 0.6 : 1);
    } else if (sec === 'break') {
      if (inSec === 0 && k === 0) crash(t, 0.7);
      if (k % 4 === 2 && inSec > 0) hat(t, false, 0.35);
      if (last) {
        if (k % 2 === 0 || k >= 8) snare(t, 0.2 + (k / 16) * 0.75);
        if (k === 0) riser(t, S16 * 16);
        if (four) kick(t, 0.6 + k / 30);
      }
    }

    // bass
    if (sec === 'a' && k % 4 === 2) bass(t, ch.bass + (k === 14 ? 12 : 0), 2, 0.95);
    if ((sec === 'b' || sec === 'chorus') && (k % 4 === 2 || k % 4 === 3)) bass(t, ch.bass + (k % 4 === 3 && k > 8 ? 12 : 0), 1, sec === 'chorus' ? 1 : 0.9);
    if (sec === 'break' && k === 0) bass(t, ch.bass, 16 * S16 * 0.9, 0.7, true);

    // plucks
    if (sec === 'intro' || sec === 'a' || sec === 'b') {
      const tones = [p[0] + 12, p[1] + 12, p[2] + 12, p[3] + 12, p[0] + 24];
      const v = sec === 'intro' ? 0.7 + inSec * 0.1 : sec === 'b' ? 0.95 : 0.85;
      pluck(t, tones[ARP[k]], v);
    }
    if (sec === 'chorus') {
      const tones = [p[0] + 24, p[1] + 24, p[2] + 24, p[3] + 24, p[0] + 36];
      if (k % 2 === 1) pluck(t, tones[ARP[k]], 0.35);
      const hs = inSec * 16 + k;
      const note = HOOK_AT.get(hs);
      if (note) lead(t, note[2], note[1], 1);
      if (k === 3 || k === 7 || k === 11 || k === 14) vox(t, p[3] + 12, 1, 0.7, k === 14 ? 'o' : 'a');
    }
    if (sec === 'break' && inSec < 3) {
      const hs = inSec * 16 + k;
      const note = HOOK_AT.get(hs);
      if (note && k % 4 === 0) lead(t, note[2], 4, 0.55);
    }
  }

  function tick() {
    if (!playing) return;
    const ahead = ac.currentTime + 0.14;
    let guard = 0;
    while (nextT < ahead && guard++ < 32) {
      try { schedule(step, nextT); } catch (e) { console.error(e); }
      step++;
      if (step >= TOTAL) step = LOOP;
      nextT += S16;
    }
  }
  ctx.interval(tick, 25);

  const api = {
    analyser,
    get playing() { return playing; },
    get position() {
      if (!playing) return step * S16;
      const behind = Math.max(0, (nextT - ac.currentTime) / S16);
      let s = step - behind;
      if (s < 0) s += TOTAL;
      return s * S16;
    },
    duration: TOTAL * S16,
    play() {
      if (playing) return;
      buildBus();
      playing = true;
      nextT = ac.currentTime + 0.06;
      tick();
    },
    pause() {
      if (!playing) return;
      const pos = api.position;
      playing = false;
      step = Math.floor(pos / S16);
      buildBus();
    },
    stop() {
      playing = false;
      step = 0;
      if (bus) buildBus();
    },
    seek(frac) {
      step = Math.max(0, Math.min(TOTAL - 1, Math.floor(frac * TOTAL)));
      if (playing) { buildBus(); nextT = ac.currentTime + 0.05; }
    },
    volume(v) { vol.gain.setTargetAtTime(v, ac.currentTime, 0.03); },
  };
  return api;
}

// The ending: the same hook, slowed, on a music box, in a large room.
export function playMusicBox(A, tempo = 0.62) {
  const { ctx, sfx } = A;
  const t0 = ctx.audio.ac.currentTime + 0.4;
  const s16 = S16 / tempo;
  HOOK.forEach(([s, len, m], i) => {
    const t = t0 + s * s16;
    sfx.bell(mtof(m + 12), t, { g: 0.055, dur: 2.6 + len * 0.1, ratio: 4.0, index: 0.55, wet: 0.75 });
    if (i % 3 === 0) sfx.bell(mtof(m), t, { g: 0.018, dur: 2.2, ratio: 2.0, index: 0.3, wet: 0.8 });
  });
  const chords = ['G', 'A', 'Fm', 'Bm', 'Em', 'A', 'D9', 'D'];
  chords.forEach((c, bi) => {
    const t = t0 + bi * 16 * s16;
    CH[c].pad.forEach((m, k) => sfx.bell(mtof(m), t + k * 0.09, { g: 0.022, dur: 3.2, ratio: 4.0, index: 0.4, wet: 0.85 }));
  });
  return 8 * 16 * s16;
}
