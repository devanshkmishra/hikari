// The band for 「夏の残響」: every instrument is a few oscillators and some noise.
// SongPlayer schedules the song against AudioContext time with a lookahead clock, so
// the music and the game share one sample-accurate timeline (beat → ac time is linear).

import { mtof } from '../../lib/audio.js';
import * as S from './song-data.js';

function buildEvents() {
  const ev = [];
  const pumpSecs = new Set(['pre', 'chorus', 'final', 'build']);
  for (const d of S.DRUMS) ev.push({ b: d.b, type: d.k, v: d.v, pump: d.k === 'kick' && pumpSecs.has(S.sectionAt(d.b).id) });
  ev.push({ b: 80, type: 'boom', v: 1 }, { b: 160, type: 'boom', v: 1.2 }, { b: 208, type: 'boom', v: 0.9 });
  for (const n of S.BASS) ev.push({ b: n.b, type: 'bass', d: n.d, m: n.m, v: n.v });
  for (const n of S.MELODY) ev.push({ b: n.b, type: n.inst, d: n.d, m: n.m });
  for (const s of S.STABS) ev.push({ b: s.b, type: 'stab', d: s.d, notes: s.notes });
  for (const p of S.PADS) ev.push({ b: p.b, type: 'pad', d: p.d, notes: p.notes, v: p.v });
  for (const a of S.ARPS) ev.push({ b: a.b, type: a.inst, d: 1, m: a.m, v: a.v, notes: a.notes });
  for (const r of S.RISERS) ev.push({ b: r.b, type: 'riser', d: r.d });
  ev.sort((a, b) => a.b - b.b);
  return ev;
}
const EVENTS = buildEvents();

export class SongPlayer {
  constructor(audio, out, send) {
    this.audio = audio;
    this.ac = audio.ac;
    this.out = out;
    this.send = send;
    this.timer = null;
    this.g = null;
    this.originAc = 0;
    this.rate = 1;
    this.playing = false;
  }

  // Start so that beat `fromBeat` sounds at ac time `at`.
  play({ fromBeat = 0, at = this.ac.currentTime + 0.1, rate = 1, loop = null, volume = 1 } = {}) {
    this.stop(0.03);
    const ac = this.ac;
    this.rate = rate;
    this.loop = loop;
    this.originAc = at - (fromBeat * S.BEAT) / rate;
    this.idx = EVENTS.findIndex((e) => e.b >= fromBeat - 1e-6);
    if (this.idx < 0) this.idx = EVENTS.length;

    // per-playback graph: voices → (pump) → bus → tape → lowpass → out (+ send)
    const g = {};
    g.bus = ac.createGain(); g.bus.gain.value = 0.5 * volume;
    g.tape = ac.createDelay(2); g.tape.delayTime.value = 0;
    g.lp = ac.createBiquadFilter(); g.lp.type = 'lowpass'; g.lp.frequency.value = 20000; g.lp.Q.value = 0.5;
    g.bus.connect(g.tape).connect(g.lp).connect(this.out);
    g.wet = ac.createGain(); g.wet.gain.value = 0.5 * volume;
    g.wet.connect(this.send);
    g.pump = ac.createGain(); g.pump.connect(g.bus);
    g.drums = ac.createGain(); g.drums.gain.value = 0.9; g.drums.connect(g.bus);
    g.lead = ac.createGain(); g.lead.gain.value = 0.42; g.lead.connect(g.bus);
    const leadWet = ac.createGain(); leadWet.gain.value = 0.22; g.lead.connect(leadWet).connect(g.wet);
    this.g = g;
    this.playing = true;
    this._tick();
    this.timer = setInterval(() => this._tick(), 25);
  }

  stop(fade = 0.08) {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    const g = this.g;
    this.playing = false;
    if (!g) return;
    this.g = null;
    const t = this.ac.currentTime;
    for (const node of [g.bus, g.wet]) {
      node.gain.cancelScheduledValues(t);
      node.gain.setValueAtTime(node.gain.value, t);
      node.gain.linearRampToValueAtTime(0, t + fade);
    }
    setTimeout(() => { try { g.lp.disconnect(); g.wet.disconnect(); } catch (e) {} }, fade * 1000 + 120);
  }

  // The fail: the tape slows to a stop and the room closes in.
  tapeStop(sec = 2.2) {
    const g = this.g;
    if (!g) return;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    const t = this.ac.currentTime;
    const n = 64, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * sec; curve[i] = 0.2 * x * x; }
    g.tape.delayTime.setValueCurveAtTime(curve, t, sec);
    g.lp.frequency.setValueAtTime(20000, t);
    g.lp.frequency.exponentialRampToValueAtTime(260, t + sec);
    g.bus.gain.setValueAtTime(g.bus.gain.value, t);
    g.bus.gain.linearRampToValueAtTime(0, t + sec);
    g.wet.gain.setValueAtTime(g.wet.gain.value, t);
    g.wet.gain.linearRampToValueAtTime(0, t + sec);
    const old = g;
    this.g = null;
    this.playing = false;
    setTimeout(() => { try { old.lp.disconnect(); old.wet.disconnect(); } catch (e) {} }, sec * 1000 + 300);
  }

  setFilter(freq, sec = 0.4) {
    if (!this.g) return;
    const p = this.g.lp.frequency, t = this.ac.currentTime;
    p.cancelScheduledValues(t);
    p.setTargetAtTime(freq, t, sec / 3);
  }

  beatAt(acTime) { return ((acTime - this.originAc) * this.rate) / S.BEAT; }
  acAt(beat) { return this.originAc + (beat * S.BEAT) / this.rate; }

  _tick() {
    const g = this.g;
    if (!g) return;
    const now = this.ac.currentTime;
    const horizon = now + 0.16;
    let guard = 0;
    while (guard++ < 2000) {
      if (this.idx >= EVENTS.length || (this.loop && EVENTS[this.idx].b >= this.loop[1])) {
        if (!this.loop) break;
        this.originAc += ((this.loop[1] - this.loop[0]) * S.BEAT) / this.rate;
        this.idx = EVENTS.findIndex((e) => e.b >= this.loop[0] - 1e-6);
        continue;
      }
      const e = EVENTS[this.idx];
      const t = this.acAt(e.b);
      if (t > horizon) break;
      this.idx++;
      if (t < now - 0.01) continue;
      try { this._voice(e, t); } catch (err) { /* a dropped voice must never stop the song */ }
    }
  }

  _voice(e, t) {
    const sp = S.BEAT / this.rate; // seconds per beat right now
    const dur = (e.d || 0) * sp;
    switch (e.type) {
      case 'kick': this.kick(t, e.v); if (e.pump) this.pumpAt(t, sp); break;
      case 'snare': this.snare(t, e.v); break;
      case 'clap': this.clap(t, e.v); break;
      case 'hat': this.hat(t, e.v, 0.03); break;
      case 'ohat': this.hat(t, e.v, 0.2); break;
      case 'ride': this.ride(t, e.v); break;
      case 'crash': this.crash(t, e.v); break;
      case 'rev': this.rev(t, e.v, sp); break;
      case 'boom': this.boom(t, e.v); break;
      case 'bass': this.bass(t, dur, e.m, e.v); break;
      case 'lead': this.lead(t, dur, e.m); break;
      case 'soft': this.soft(t, dur, e.m); break;
      case 'bell': this.bell(t, e.m, e.v ?? 0.55); break;
      case 'ep': this.ep(t, e.m, e.v); break;
      case 'epchord': for (const m of e.notes) this.ep(t, m, e.v * 0.6); break;
      case 'stab': this.stab(t, dur, e.notes); break;
      case 'pad': this.pad(t, dur, e.notes, e.v); break;
      case 'riser': this.riser(t, dur); break;
    }
  }

  // ---------------------------------------------------------------- helpers
  _noise(t, len, dest, offset = Math.random() * 1.5) {
    const n = this.ac.createBufferSource();
    n.buffer = this.audio.noise('white');
    n.connect(dest);
    if (len > 0.4) { n.loop = true; n.start(t, offset); n.stop(t + len); } else n.start(t, offset, len);
    return n;
  }
  _filter(type, f, q = 0.7) {
    const b = this.ac.createBiquadFilter();
    b.type = type; b.frequency.value = f; b.Q.value = q;
    return b;
  }
  _gain(v = 1) { const g = this.ac.createGain(); g.gain.value = v; return g; }
  _osc(type, f, detune = 0) {
    const o = this.ac.createOscillator();
    o.type = type; o.frequency.value = f; o.detune.value = detune;
    return o;
  }
  _perc(g, t, peak, decay, attack = 0.002) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  pumpAt(t, sp) {
    const p = this.g.pump.gain;
    p.setValueAtTime(0.3, t);
    p.linearRampToValueAtTime(1, t + Math.min(0.2, sp * 0.55));
  }

  // ---------------------------------------------------------------- drums
  kick(t, v = 1) {
    const g = this._gain(0), o = this._osc('sine', 160);
    o.frequency.setValueAtTime(170, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.085);
    this._perc(g, t, 0.95 * v, 0.36);
    o.connect(g).connect(this.g.drums);
    o.start(t); o.stop(t + 0.42);
    const cg = this._gain(0), hp = this._filter('highpass', 2600);
    this._perc(cg, t, 0.22 * v, 0.014, 0.001);
    this._noise(t, 0.03, hp);
    hp.connect(cg).connect(this.g.drums);
  }
  snare(t, v = 1) {
    const g = this._gain(0), bp = this._filter('bandpass', 2100, 0.6), hp = this._filter('highpass', 900);
    this._perc(g, t, 0.42 * v, 0.17);
    this._noise(t, 0.25, bp);
    bp.connect(hp).connect(g).connect(this.g.drums);
    const w = this._gain(0.25); g.connect(w).connect(this.g.wet);
    const bg = this._gain(0), o = this._osc('triangle', 196);
    o.frequency.setValueAtTime(205, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.06);
    this._perc(bg, t, 0.35 * v, 0.08);
    o.connect(bg).connect(this.g.drums); o.start(t); o.stop(t + 0.12);
  }
  clap(t, v = 1) {
    const g = this._gain(0), bp = this._filter('bandpass', 1250, 1.4);
    const p = g.gain;
    p.setValueAtTime(0.0001, t);
    for (let i = 0; i < 3; i++) {
      p.linearRampToValueAtTime(0.5 * v, t + i * 0.011 + 0.001);
      p.exponentialRampToValueAtTime(0.06, t + i * 0.011 + 0.009);
    }
    p.linearRampToValueAtTime(0.42 * v, t + 0.035);
    p.exponentialRampToValueAtTime(0.0001, t + 0.22);
    this._noise(t, 0.26, bp);
    bp.connect(g).connect(this.g.drums);
    const w = this._gain(0.4); g.connect(w).connect(this.g.wet);
  }
  hat(t, v, decay) {
    const g = this._gain(0), hp = this._filter('highpass', 7800);
    this._perc(g, t, 0.16 * v, decay);
    this._noise(t, decay + 0.05, hp);
    hp.connect(g).connect(this.g.drums);
  }
  ride(t, v) {
    const g = this._gain(0), bp = this._filter('bandpass', 9200, 1.8);
    this._perc(g, t, 0.13 * v, 0.28);
    this._noise(t, 0.32, bp);
    bp.connect(g).connect(this.g.drums);
    const pg = this._gain(0), o = this._osc('sine', 5170);
    this._perc(pg, t, 0.02 * v, 0.2);
    o.connect(pg).connect(this.g.drums); o.start(t); o.stop(t + 0.25);
  }
  crash(t, v = 1) {
    const g = this._gain(0), hp = this._filter('highpass', 4200), bp = this._filter('peaking', 7000, 0.8);
    bp.gain.value = 5;
    this._perc(g, t, 0.3 * v, 2.2, 0.003);
    this._noise(t, 2.0, hp);
    this._noise(t + 0.6, 1.8, hp, 0.2);
    hp.connect(bp).connect(g).connect(this.g.drums);
    const w = this._gain(0.5); g.connect(w).connect(this.g.wet);
  }
  rev(t, v, sp) {
    const len = sp;
    const g = this._gain(0), hp = this._filter('highpass', 3000);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32 * v, t + len - 0.005);
    g.gain.linearRampToValueAtTime(0, t + len);
    this._noise(t, len + 0.01, hp);
    hp.connect(g).connect(this.g.bus);
    const w = this._gain(0.6); g.connect(w).connect(this.g.wet);
  }
  boom(t, v) {
    const g = this._gain(0), o = this._osc('sine', 70);
    o.frequency.setValueAtTime(72, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 1.2);
    this._perc(g, t, 0.55 * v, 1.4, 0.004);
    o.connect(g).connect(this.g.bus); o.start(t); o.stop(t + 1.5);
  }

  // ---------------------------------------------------------------- tonal
  bass(t, dur, m, v = 1) {
    const f = mtof(m);
    const g = this._gain(0), lp = this._filter('lowpass', 1200, 3);
    lp.frequency.setValueAtTime(1600, t);
    lp.frequency.exponentialRampToValueAtTime(260, t + Math.max(0.06, dur * 0.8));
    const o1 = this._osc('sawtooth', f), o2 = this._osc('sine', f / 2), o3 = this._osc('square', f, 6);
    const sg = this._gain(0.9), qg = this._gain(0.25);
    o1.connect(lp); o3.connect(qg).connect(lp); lp.connect(g); o2.connect(sg).connect(g);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.32 * v, t + 0.004);
    g.gain.setValueAtTime(0.32 * v, t + Math.max(0.01, dur - 0.025));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    g.connect(this.g.pump);
    for (const o of [o1, o2, o3]) { o.start(t); o.stop(t + dur + 0.02); }
  }

  lead(t, dur, m) {
    const f = mtof(m);
    const g = this._gain(0), lp = this._filter('lowpass', 6000, 1.6);
    lp.frequency.setValueAtTime(7600, t);
    lp.frequency.exponentialRampToValueAtTime(2600, t + 0.22);
    const oscs = [this._osc('sawtooth', f, -8), this._osc('sawtooth', f, 8), this._osc('square', f)];
    const sq = this._gain(0.32);
    oscs[0].connect(lp); oscs[1].connect(lp); oscs[2].connect(sq).connect(lp);
    lp.connect(g).connect(this.g.lead);
    const rel = 0.07;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.006);
    g.gain.setTargetAtTime(0.36, t + 0.006, 0.08);
    g.gain.setValueAtTime(0.36, t + Math.max(0.02, dur - 0.02));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
    if (dur > 0.32) {
      const lfo = this._osc('sine', 5.6), lg = this._gain(0);
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(f * 0.007, t + 0.32);
      lfo.connect(lg);
      for (const o of oscs) lg.connect(o.frequency);
      lfo.start(t); lfo.stop(t + dur + rel);
    }
    // a sparkle one octave up keeps the hook bright
    const bg = this._gain(0), bo = this._osc('triangle', f * 2);
    this._perc(bg, t, 0.07, Math.min(0.5, dur + 0.1));
    bo.connect(bg).connect(this.g.lead);
    bo.start(t); bo.stop(t + dur + 0.6);
    for (const o of oscs) { o.start(t); o.stop(t + dur + rel + 0.02); }
  }

  soft(t, dur, m) {
    const f = mtof(m);
    const g = this._gain(0), lp = this._filter('lowpass', 2200, 0.5);
    const o1 = this._osc('triangle', f), o2 = this._osc('sine', f * 2), o2g = this._gain(0.12);
    o1.connect(lp); o2.connect(o2g).connect(lp); lp.connect(g);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.42, t + 0.09);
    g.gain.setTargetAtTime(0.3, t + 0.09, 0.3);
    g.gain.setValueAtTime(0.3, t + Math.max(0.1, dur - 0.05));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.5);
    const lfo = this._osc('sine', 4.8), lg = this._gain(f * 0.006);
    lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    g.connect(this.g.bus);
    const w = this._gain(0.7); g.connect(w).connect(this.g.wet);
    for (const o of [o1, o2, lfo]) { o.start(t); o.stop(t + dur + 0.6); }
  }

  bell(t, m, v = 0.55) {
    const f = mtof(m);
    const c = this._osc('sine', f), mod = this._osc('sine', f * 3.5), mg = this._gain(0);
    mg.gain.setValueAtTime(f * 2.4, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.9);
    mod.connect(mg).connect(c.frequency);
    const g = this._gain(0);
    this._perc(g, t, 0.2 * v, 1.7, 0.002);
    c.connect(g).connect(this.g.bus);
    const w = this._gain(0.9); g.connect(w).connect(this.g.wet);
    c.start(t); mod.start(t); c.stop(t + 1.8); mod.stop(t + 1.8);
  }

  ep(t, m, v = 0.5) {
    const f = mtof(m);
    const c = this._osc('sine', f), mod = this._osc('sine', f), mg = this._gain(0);
    mg.gain.setValueAtTime(f * 1.6, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.12, t + 0.35);
    mod.connect(mg).connect(c.frequency);
    const tine = this._osc('sine', f * 4.02), tg = this._gain(0);
    this._perc(tg, t, 0.05 * v, 0.12);
    const g = this._gain(0);
    this._perc(g, t, 0.26 * v, 1.3, 0.003);
    c.connect(g); tine.connect(tg).connect(g);
    g.connect(this.g.pump);
    const w = this._gain(0.5); g.connect(w).connect(this.g.wet);
    for (const o of [c, mod, tine]) { o.start(t); o.stop(t + 1.4); }
  }

  stab(t, dur, notes) {
    const g = this._gain(0), lp = this._filter('lowpass', 4000, 1.2);
    lp.frequency.setValueAtTime(5200, t);
    lp.frequency.exponentialRampToValueAtTime(1500, t + dur + 0.05);
    for (const m of notes) {
      const f = mtof(m + 12);
      for (const d of [-13, 13]) { const o = this._osc('sawtooth', f, d); o.connect(lp); o.start(t); o.stop(t + dur + 0.1); }
    }
    const sub = this._osc('sawtooth', mtof(notes[0])); sub.connect(lp); sub.start(t); sub.stop(t + dur + 0.1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.11, t + 0.006);
    g.gain.setTargetAtTime(0.075, t + 0.01, 0.06);
    g.gain.setValueAtTime(0.075, t + Math.max(0.02, dur - 0.02));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    lp.connect(g).connect(this.g.pump);
    const w = this._gain(0.35); g.connect(w).connect(this.g.wet);
  }

  pad(t, dur, notes, v = 0.6) {
    const g = this._gain(0), lp = this._filter('lowpass', 1100, 0.4);
    for (const m of notes) {
      const f = mtof(m);
      for (const d of [-11, 11]) { const o = this._osc('sawtooth', f, d); o.connect(lp); o.start(t); o.stop(t + dur + 0.9); }
    }
    const peak = 0.045 * v;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + Math.min(0.45, dur * 0.4));
    g.gain.setValueAtTime(peak, t + dur);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.8);
    lp.connect(g).connect(this.g.pump);
    const w = this._gain(0.9); g.connect(w).connect(this.g.wet);
  }

  riser(t, dur) {
    const g = this._gain(0), bp = this._filter('bandpass', 400, 3.5);
    bp.frequency.setValueAtTime(320, t);
    bp.frequency.exponentialRampToValueAtTime(9000, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + dur - 0.01);
    g.gain.linearRampToValueAtTime(0, t + dur);
    const n = this.ac.createBufferSource();
    n.buffer = this.audio.noise('white'); n.loop = true;
    n.connect(bp).connect(g).connect(this.g.bus);
    const w = this._gain(0.5); g.connect(w).connect(this.g.wet);
    n.start(t); n.stop(t + dur + 0.01);
  }
}
